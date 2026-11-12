import { createClient } from '@supabase/supabase-js';

// Verbindung zur Datenbank (Supabase, Region Zürich).
// Adresse und Schlüssel sind öffentlich: Der Schlüssel erlaubt nur, was die
// Zugriffsregeln der Datenbank der angemeldeten Person erlauben.
// Für Tests lassen sich beide über VITE_SUPABASE_URL und VITE_SUPABASE_KEY ersetzen.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://rasqdwuzkvbprcgtverg.supabase.co';
const key = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_uf3x3J1xhPnD-hc8YrigdQ_PGWerpsV';

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Der Link aus der E-Mail funktioniert so auch auf einem anderen Gerät als dem, auf dem er angefordert wurde
    flowType: 'implicit',
  },
});
