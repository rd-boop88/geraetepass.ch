// Anmeldung mit Einrichtungscode, Personalnummer und PIN (für Stations-Tablets).
//
// Ablauf:
//   1. Die Datenbank prüft die PIN (verify_pin) und zählt Fehlversuche.
//   2. Hat die Person noch kein Login, wird eines angelegt. Es trägt eine
//      Platzhalter-Adresse, an die nie eine E-Mail geht.
//   3. Die Funktion erzeugt einen einmaligen Anmelde-Schlüssel. Der Browser
//      tauscht ihn mit verifyOtp() gegen eine normale Sitzung.
//
// Die Funktion braucht kein Login des Aufrufers (verify_jwt = false), weil
// sie selbst die Anmeldung ist. Sie arbeitet mit dem Service-Zugang, den
// Supabase jeder Edge Function mitgibt.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const PLACEHOLDER_DOMAIN = 'pin.geraetepass.ch';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'Nur POST ist erlaubt.' });

  let input: { code?: unknown; persNo?: unknown; pin?: unknown };
  try {
    input = await req.json();
  } catch {
    return reply(400, { error: 'Ungültige Anfrage.' });
  }
  const code = String(input.code ?? '').trim().toLowerCase();
  const persNo = String(input.persNo ?? '').trim();
  const pin = String(input.pin ?? '').trim();
  if (!code || !persNo || !/^[0-9]{6,8}$/.test(pin) || code.length > 30 || persNo.length > 40) {
    return reply(400, { error: 'Bitte Einrichtungscode, Personalnummer und die 6- bis 8-stellige PIN eingeben.' });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply(500, { error: 'Die Anmeldung ist zurzeit nicht möglich.' });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. PIN prüfen
  const { data: rows, error: checkError } = await admin.rpc('verify_pin', { p_code: code, p_pers_no: persNo, p_pin: pin });
  if (checkError || !rows || !rows[0]) {
    console.error('verify_pin', checkError);
    return reply(500, { error: 'Die Anmeldung ist zurzeit nicht möglich.' });
  }
  const result = rows[0] as { status: string; profile_id: string | null; user_id: string | null };
  if (result.status === 'locked') {
    return reply(429, { error: 'Zu viele Fehlversuche. Die PIN ist für 15 Minuten gesperrt.' });
  }
  if (result.status !== 'ok' || !result.profile_id) {
    return reply(401, { error: 'Einrichtungscode, Personalnummer oder PIN stimmen nicht.' });
  }

  // 2. Login der Person bestimmen oder anlegen
  let email: string | null = null;
  if (result.user_id) {
    const { data: found } = await admin.auth.admin.getUserById(result.user_id);
    email = found?.user?.email ?? null;
  }
  if (!email) {
    email = `pin-${result.profile_id}@${PLACEHOLDER_DOMAIN}`;
    // Existiert das Login schon (z.B. aus einem abgebrochenen Versuch), meldet createUser einen Fehler.
    // Das ist hier kein Problem: generateLink unten findet es.
    await admin.auth.admin.createUser({ email, email_confirm: true });
  }

  // 3. Einmaligen Anmelde-Schlüssel erzeugen (es wird keine E-Mail verschickt)
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkError || !link?.properties?.hashed_token || !link.user) {
    console.error('generateLink', linkError);
    return reply(500, { error: 'Die Anmeldung ist zurzeit nicht möglich.' });
  }

  // Login mit der Person verknüpfen, falls noch nicht geschehen
  if (!result.user_id) {
    const { error: linkProfileError } = await admin
      .from('profiles')
      .update({ user_id: link.user.id })
      .eq('id', result.profile_id)
      .is('user_id', null);
    if (linkProfileError) {
      console.error('link profile', linkProfileError);
      return reply(500, { error: 'Die Anmeldung ist zurzeit nicht möglich.' });
    }
  }

  return reply(200, { token_hash: link.properties.hashed_token });
});
