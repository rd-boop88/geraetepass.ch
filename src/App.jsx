import React, { useState, useEffect, useRef } from 'react';

/* ==========================================================================
   geraetepass.ch – Demo-App (eine Datei, keine Zusatzpakete nötig)

   Aufbau dieser Datei:
     1. Einstellungen (Passwort, Vorwarnzeit, Abteilungen, Logo, Grundstil)
     2. Icons
     3. Demo-Daten (Geräte, Mitarbeitende)
     4. Hilfsfunktionen (Datum, Status, Quote, Listen-Import aus Excel/CSV)
     5. Bausteine (Logo, Status, Fortschritt, Fenster, Unterschriftsfeld)
     6. Ansichten (Passwort, Rollenwahl, Mitarbeitende, Stationsleitung, QM, Nachweis)
     7. App (Zustand und Aktionen)
   ========================================================================== */


/* ==========================================================================
   1. EINSTELLUNGEN
   ========================================================================== */

// Zugangspasswort: "Habsburg" – hier steht nur der SHA-256-Hash, nicht das
// Passwort selbst. Neues Passwort setzen: in der Browser-Konsole ausführen
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('NeuesPasswort'))
//     .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')))
// und den ausgegebenen Wert hier einsetzen.
// Hinweis: Die Prüfung läuft im Browser. Sie hält zufällige Besucher fern,
// ersetzt aber kein echtes Login mit Server.
const PASSWORD_HASH = 'f382edf6457dd6f82f24c9064a69f3422371bd9bffc3e15d87747757b7a89b57';
const SESSION_KEY = 'geraetepass_entsperrt';

// So viele Tage vor Ablauf wird eine Schulung als "bald fällig" markiert.
const WARN_DAYS = 60;

// Wiederholungs-Intervall in Monaten, wenn eine importierte Geräteliste keines angibt.
const DEFAULT_INTERVAL = 12;

// Erinnerungen: wählbare Vorwarnzeiten (Tage vor Ablauf) und Voreinstellung pro Abteilung
const LEAD_OPTIONS = [
  { days: 14, label: '2 Wochen' },
  { days: 30, label: '1 Monat' },
  { days: 60, label: '2 Monate' },
  { days: 90, label: '3 Monate' },
  { days: 180, label: '6 Monate' },
];
const DEFAULT_REMINDER = { email: '', leads: [90, 30], expired: true, missing: true };
const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/i;

// Name der Klinik, erscheint auf der Startseite und auf dem Gerätepass
const CLIENT_NAME = 'Musterklinik Schweiz AG';

const NON_MEDICAL = 'kein Medizinprodukt';
const DEFAULT_INSTRUCTOR = 'M. Keller (Berufsbildner)';

const DEPARTMENTS = [
  { id: 'A', name: 'Abteilung A – Intensivpflege', short: 'Intensivpflege' },
  { id: 'B', name: 'Abteilung B – Bettenstation', short: 'Bettenstation' },
];

// Logo: Die Pulslinie eines Geräts endet im Prüfhaken. Markenfarbe Dunkelblau #17324D,
// der Haken ist grün wie der Status "Gültig".
const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 4 40 40">' +
  '<rect x="4" y="4" width="40" height="40" rx="11" fill="#17324D"/>' +
  '<path d="M9 27h6.5l3.5-9.5 5 16.5 3.5-8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M27.5 26l4 4.5 8.5-12" fill="none" stroke="#34D399" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';
const LOGO_URL = 'data:image/svg+xml,' + encodeURIComponent(LOGO_SVG);

// Wiederkehrende Stile an einem Ort, damit Knöpfe und Felder überall gleich aussehen.
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#17324D] ';
const ui = {
  btnPrimary: FOCUS + 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#17324D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0F2438] disabled:bg-slate-300',
  btnSecondary: FOCUS + 'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50',
  link: FOCUS + 'inline-flex items-center gap-1.5 rounded text-sm font-semibold text-[#17324D] underline decoration-slate-300 underline-offset-4 hover:decoration-[#17324D]',
  input: 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-[#17324D] focus:outline-none focus:ring-2 focus:ring-[#17324D]/20 sm:text-sm',
  label: 'mb-1.5 block text-sm font-medium text-slate-700',
  panel: 'rounded-2xl border border-slate-200 bg-white',
};

// Grundstil der Seite. Er überschreibt die Standard-Stile der Projektvorlage (schmaler,
// zentrierter Inhalt mit dunklem Rand), damit die App das ganze Fenster nutzt.
const BASE_CSS = [
  ':root { font-size: 16px !important; line-height: 1.5 !important; letter-spacing: normal !important; color-scheme: light !important; background: #f1f5f9 !important; }',
  'body { margin: 0 !important; display: block !important; min-width: 0 !important; background: #f1f5f9 !important; }',
  '#root { display: block !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; text-align: left !important; }',
  'h1, h2 { margin: 0; letter-spacing: inherit; }',
  // Druck: Ist ein Schulungsnachweis offen, kommt nur dieser aufs Blatt (A4), ohne Seite dahinter.
  '@media print {',
  '  @page { size: A4; margin: 16mm; }',
  '  .gp-cert-open, .gp-cert-open body, .gp-cert-open #root, .gp-cert-open #root > div { background: #fff !important; min-height: 0 !important; display: block !important; }',
  '  .gp-cert-open header, .gp-cert-open main, .gp-cert-open [role="status"], .gp-cert-open .gp-no-print { display: none !important; }',
  '  .gp-cert-open .gp-overlay { position: static !important; display: block !important; padding: 0 !important; background: none !important; }',
  '  .gp-cert-open .gp-sheet { width: auto !important; max-width: none !important; max-height: none !important; overflow: visible !important; padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
  '  .gp-cert-open .gp-print-only { display: block !important; }',
  '}',
].join('\n');
if (typeof document !== 'undefined') {
  let baseStyle = document.getElementById('gp-base-style');
  if (!baseStyle) {
    baseStyle = document.createElement('style');
    baseStyle.id = 'gp-base-style';
    document.head.appendChild(baseStyle);
  }
  baseStyle.textContent = BASE_CSS;
}


/* ==========================================================================
   2. ICONS (eingebaut, kein Zusatzpaket nötig)
   ========================================================================== */

const Icon = ({ children, className = 'h-4 w-4', dashed }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeDasharray={dashed ? '3 3.5' : undefined}
    aria-hidden="true"
    className={className + ' shrink-0'}
  >
    {children}
  </svg>
);

const Check = (p) => <Icon {...p}><polyline points="20 6 9 17 4 12" /></Icon>;
const Clock = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;
const Alert = (p) => <Icon {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></Icon>;
const EmptySlot = (p) => <Icon {...p} dashed><circle cx="12" cy="12" r="9" /></Icon>;
const Lock = (p) => <Icon {...p}><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Icon>;
const Swap = (p) => <Icon {...p}><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></Icon>;
const Upload = (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><path d="M12 3v12" /></Icon>;
const Download = (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><path d="M12 15V3" /></Icon>;
const Printer = (p) => <Icon {...p}><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></Icon>;
const Bell = (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Icon>;
const Mail = (p) => <Icon {...p}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></Icon>;
const Pencil = (p) => <Icon {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>;
const Close = (p) => <Icon {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>;
const Shield = (p) => <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></Icon>;
const UserIcon = (p) => <Icon {...p}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>;
const Users = (p) => <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>;
const Building = (p) => <Icon {...p}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" /></Icon>;


/* ==========================================================================
   4a. DATUMS-HILFEN (stehen vor den Demo-Daten, weil diese sie brauchen)
   ========================================================================== */

const DAY_MS = 24 * 60 * 60 * 1000;
const pad2 = (n) => String(n).padStart(2, '0');

// Datum als "JJJJ-MM-TT" in lokaler Zeit (nicht UTC, sonst droht um Mitternacht der falsche Tag)
const toISO = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const parseISO = (iso) => {
  const parts = iso.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
};
const todayISO = () => toISO(new Date());

// Anzeige als TT.MM.JJJJ
const formatDate = (iso) => {
  const parts = iso.split('-');
  return parts[2] + '.' + parts[1] + '.' + parts[0];
};

const addMonths = (iso, months) => {
  const d = parseISO(iso);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0); // z.B. 31.01. + 1 Monat = letzter Tag im Februar
  return toISO(d);
};

const daysBetween = (fromISO, untilISO) => Math.round((parseISO(untilISO) - parseISO(fromISO)) / DAY_MS);


/* ==========================================================================
   3. DEMO-DATEN
   ========================================================================== */

// depts = in welchen Abteilungen das Gerät im Inventar steht
// interval = Wiederholungs-Intervall in Monaten (0 = keine Schulungspflicht)
const INITIAL_DEVICES = [
  { id: 'd1', category: 'Beatmungsgerät', model: 'VentPro 5000', risk: 'IIb', interval: 12, vendor: 'MedTech Systems AG', depts: ['A'] },
  { id: 'd2', category: 'Infusionspumpe', model: 'InfusoMax V2', risk: 'IIb', interval: 24, vendor: 'SwissMed Solutions', depts: ['A', 'B'] },
  { id: 'd3', category: 'Spritzenpumpe', model: 'SyringeFlow Pro', risk: 'IIb', interval: 24, vendor: 'SwissMed Solutions', depts: ['A'] },
  { id: 'd4', category: 'Defibrillator', model: 'CardioShock Pro', risk: 'IIb', interval: 12, vendor: 'LifeCare Corp.', depts: ['A', 'B'] },
  { id: 'd5', category: 'Atemgasbefeuchter', model: 'HumidAir Duo', risk: 'IIa', interval: 24, vendor: 'AeroMed AG', depts: ['A'] },
  { id: 'd6', category: 'Überwachungsmonitor', model: 'VitalView 8', risk: 'IIa', interval: 24, vendor: 'GlobalHealth Tech', depts: ['A', 'B'] },
  { id: 'd7', category: 'Wärmedecke', model: 'ThermoBlanket Plus', risk: 'IIa', interval: 36, vendor: 'TempControl Medical', depts: ['B'] },
  { id: 'd8', category: 'Ohrthermometer', model: 'EarCheck 2', risk: 'I', interval: 36, vendor: 'BasicMed AG', depts: ['B'] },
  { id: 'd9', category: 'Kühlschrank für Medikamente', model: 'CoolStore Med 120', risk: NON_MEDICAL, interval: 0, vendor: 'KlimaTech AG', depts: ['A', 'B'] },
];

// Ein Schulungsnachweis. Das Datum wird relativ zu heute gesetzt ("vor X Monaten"),
// damit die Demo immer gleich aussieht, egal wann sie geöffnet wird.
// "M. Keller (Berufsbildner)" unterschreibt als "M. Keller"
const signerName = (instructor) => instructor.replace(/\s*\(.*\)\s*$/, '').trim();

const demoCert = (monthsBack, instructor, type) => ({
  date: addMonths(todayISO(), -monthsBack),
  instructor,
  type,
  sigName: signerName(instructor), // unterschrieben hat, wer geschult hat
  sigImage: null,
  savedAt: null,
});

const KELLER = 'M. Keller (Berufsbildner)';
const VOGT = 'S. Vogt (Stationsleitung)';
const ERST = 'Erstschulung';
const WDH = 'Wiederholungsschulung';

// certs: pro Gerät eine Liste aller Nachweise, der neuste steht zuletzt (Historie bleibt erhalten)
const createDemoStaff = () => [
  {
    id: 's1', name: 'Sarah Meier', role: 'Dipl. Expertin Intensivpflege NDS', persNo: 'MA-4821', dept: 'A',
    assigned: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'],
    certs: {
      d1: [demoCert(9, KELLER, ERST)],
      d2: [demoCert(38, KELLER, ERST), demoCert(14, 'T. Baumann (Hersteller)', WDH)],
      d3: [demoCert(14, 'T. Baumann (Hersteller)', WDH)],
      d4: [demoCert(19, 'Dr. L. Weber', WDH)],
      d6: [demoCert(10, KELLER, ERST)],
    },
  },
  {
    id: 's2', name: 'Lucas Brunner', role: 'Dipl. Pflegefachmann HF', persNo: 'MA-5104', dept: 'A',
    assigned: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'],
    certs: {
      d1: [demoCert(11, KELLER, ERST)],
      d2: [demoCert(10, KELLER, ERST)],
      d3: [demoCert(10, KELLER, ERST)],
      d5: [demoCert(25, KELLER, ERST)],
      d6: [demoCert(9, KELLER, ERST)],
    },
  },
  {
    id: 's3', name: 'Nadine Widmer', role: 'Pool-Mitarbeiterin, temporär', persNo: 'TMP-902', dept: 'A',
    assigned: ['d1', 'd2', 'd3', 'd4', 'd6'],
    certs: {
      d2: [demoCert(8, KELLER, ERST)],
      d3: [demoCert(8, KELLER, ERST)],
      d6: [demoCert(8, KELLER, ERST)],
    },
  },
  {
    id: 's5', name: 'Tim Hofmann', role: 'Dipl. Experte Intensivpflege NDS', persNo: 'MA-4410', dept: 'A',
    assigned: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'],
    certs: {
      d1: [demoCert(5, KELLER, WDH)],
      d2: [demoCert(6, 'T. Baumann (Hersteller)', WDH)],
      d3: [demoCert(6, 'T. Baumann (Hersteller)', WDH)],
      d4: [demoCert(4, 'Dr. L. Weber', WDH)],
      d5: [demoCert(7, KELLER, ERST)],
      d6: [demoCert(5, KELLER, ERST)],
    },
  },
  {
    id: 's4', name: 'Elena Rossi', role: 'Dipl. Pflegefachfrau HF', persNo: 'MA-3390', dept: 'B',
    assigned: ['d2', 'd4', 'd6', 'd7', 'd8'],
    certs: {
      d2: [demoCert(9, VOGT, WDH)],
      d4: [demoCert(9, VOGT, WDH)],
      d6: [demoCert(10, VOGT, ERST)],
      d7: [demoCert(12, VOGT, ERST)],
      d8: [demoCert(12, VOGT, ERST)],
    },
  },
];


/* ==========================================================================
   4b. HILFSFUNKTIONEN (Status, Quote, Passwort, Bildschirmbreite)
   ========================================================================== */

// Farben und Texte pro Status. "Fehlt" ist bewusst gestrichelt: ein leeres Feld im Pass.
const STATUS = {
  valid: { label: 'Gültig', icon: Check, chip: 'border-emerald-200 bg-emerald-50 text-emerald-800', bar: 'bg-emerald-500', stamp: 'border-emerald-600 text-emerald-700' },
  dueSoon: { label: 'Bald fällig', icon: Clock, chip: 'border-amber-300 bg-amber-50 text-amber-900', bar: 'bg-amber-400', stamp: 'border-amber-500 text-amber-700' },
  expired: { label: 'Abgelaufen', icon: Alert, chip: 'border-red-200 bg-red-50 text-red-800', bar: 'bg-red-500', stamp: 'border-red-600 text-red-700' },
  missing: { label: 'Schulung fehlt', short: 'Fehlt', icon: EmptySlot, chip: 'border-dashed border-red-300 bg-white text-red-700', bar: 'bg-slate-300', stamp: '' },
};
const STATUS_KEYS = ['valid', 'dueSoon', 'expired', 'missing'];
// Reihenfolge nach Dringlichkeit (für Listen)
const URGENCY = { expired: 0, missing: 1, dueSoon: 2, valid: 3 };

const needsTraining = (device) => device.interval > 0;
const deptById = (id) => DEPARTMENTS.find((d) => d.id === id);
const riskText = (risk) => {
  if (risk === NON_MEDICAL) return 'Kein Medizinprodukt';
  return risk ? 'Klasse ' + risk : 'Klasse nicht angegeben';
};

// Der Status wird immer aus Schulungsdatum + Intervall berechnet (nie von Hand gesetzt).
function getStatus(device, records) {
  const latest = records && records.length ? records[records.length - 1] : null;
  if (!latest) return { key: 'missing' };
  const validUntil = addMonths(latest.date, device.interval);
  const daysLeft = daysBetween(todayISO(), validUntil);
  if (daysLeft < 0) return { key: 'expired', validUntil, daysLeft };
  if (daysLeft <= WARN_DAYS) return { key: 'dueSoon', validUntil, daysLeft };
  return { key: 'valid', validUntil, daysLeft };
}

// Text zum Status: bis wann gültig bzw. seit wann abgelaufen
function statusHint(status) {
  if (status.key === 'missing') return '';
  if (status.key === 'expired') return 'seit ' + formatDate(status.validUntil);
  return 'bis ' + formatDate(status.validUntil);
}

// Zählt alle Soll-Zuteilungen und wie viele davon aktuell gültig sind.
// "Bald fällig" zählt noch als gültig, "abgelaufen" und "fehlt" nicht.
function summarize(staffList, devices) {
  const counts = { valid: 0, dueSoon: 0, expired: 0, missing: 0 };
  staffList.forEach((person) => {
    person.assigned.forEach((deviceId) => {
      const device = devices.find((d) => d.id === deviceId);
      if (!device || !needsTraining(device)) return;
      counts[getStatus(device, person.certs[deviceId]).key] += 1;
    });
  });
  const total = counts.valid + counts.dueSoon + counts.expired + counts.missing;
  const ok = counts.valid + counts.dueSoon;
  const pct = total === 0 ? 100 : Math.round((ok / total) * 100);
  return { ...counts, total, ok, pct };
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Merkt sich das Entsperren bis zum Schliessen des Browser-Tabs.
const session = {
  isUnlocked: () => { try { return window.sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; } },
  unlock: () => { try { window.sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) { /* ohne Speicher: nur bis zum Neuladen */ } },
  lock: () => { try { window.sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* nichts zu tun */ } },
};

// true auf breiten Bildschirmen (Desktop). Darunter werden Tabellen zu Karten.
function useIsWide() {
  const query = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => (window.matchMedia ? window.matchMedia(query).matches : true));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const update = () => setWide(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener('change', update); else mq.addListener(update);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', update); else mq.removeListener(update); };
  }, []);
  return wide;
}


/* ==========================================================================
   4c. LISTEN IMPORTIEREN (.xlsx und .csv lesen, ohne Zusatzpaket)
   ========================================================================== */

// Text vergleichbar machen: klein, ohne Umlaute, ohne Leer- und Sonderzeichen
const norm = (s) => String(s || '').toLowerCase()
  .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]/g, '');

// Für den Vergleich von Namen und Modellen: nur Gross-/Kleinschreibung und Leerzeichen angleichen.
// Sonderzeichen bleiben, damit z.B. "X200" und "X200+" zwei verschiedene Modelle sind.
const plain = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Teile mit Komma verbinden, leere auslassen
const parts = (...items) => items.filter(Boolean).join(', ');
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

async function inflate(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('BROWSER');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Eine .xlsx-Datei ist ein ZIP-Archiv mit XML-Dateien. Hier wird das Archiv geöffnet.
function openZip(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error('FORMAT');
  const count = view.getUint16(end + 10, true);
  let pos = view.getUint32(end + 16, true);
  const decoder = new TextDecoder('utf-8');
  const files = {};
  for (let n = 0; n < count; n += 1) {
    if (view.getUint32(pos, true) !== 0x02014b50) throw new Error('FORMAT');
    const method = view.getUint16(pos + 10, true);
    const size = view.getUint32(pos + 20, true);
    const nameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const local = view.getUint32(pos + 42, true);
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLength));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    files[name] = { method, data: bytes.subarray(start, start + size) };
    pos += 46 + nameLength + extraLength + commentLength;
  }
  return {
    names: Object.keys(files),
    text: async (name) => {
      const file = files[name];
      if (file.method !== 0 && file.method !== 8) throw new Error('FORMAT');
      return decoder.decode(file.method === 0 ? file.data : await inflate(file.data));
    },
  };
}

// Liest das erste Tabellenblatt einer .xlsx-Datei als Zeilen mit Textzellen.
async function readXlsx(buffer) {
  const zip = openZip(buffer);
  const xml = async (name) => new DOMParser().parseFromString(await zip.text(name), 'application/xml');
  const all = (node, tag) => Array.from(node.getElementsByTagNameNS('*', tag));
  const find = (pattern) => zip.names.find((name) => pattern.test(name));

  // Texte stehen gesammelt in einer eigenen Datei, die Zellen verweisen darauf
  let strings = [];
  const stringsFile = find(/^xl\/sharedStrings\.xml$/i);
  if (stringsFile) {
    strings = all(await xml(stringsFile), 'si').map((si) => all(si, 't')
      .filter((t) => t.parentNode.localName !== 'rPh')
      .map((t) => t.textContent).join(''));
  }

  // Erstes Tabellenblatt gemäss Arbeitsmappe suchen
  let sheetFile = null;
  const bookFile = find(/^xl\/workbook\.xml$/i);
  const relsFile = find(/^xl\/_rels\/workbook\.xml\.rels$/i);
  if (bookFile && relsFile) {
    const first = all(await xml(bookFile), 'sheet')[0];
    const relId = first ? Array.from(first.attributes).filter((a) => a.localName === 'id').map((a) => a.value)[0] : null;
    const rel = all(await xml(relsFile), 'Relationship').find((r) => r.getAttribute('Id') === relId);
    if (rel) {
      const target = rel.getAttribute('Target') || '';
      sheetFile = target.charAt(0) === '/' ? target.slice(1) : 'xl/' + target;
    }
  }
  if (!sheetFile || zip.names.indexOf(sheetFile) < 0) sheetFile = zip.names.filter((n) => /^xl\/worksheets\/[^/]+\.xml$/i.test(n)).sort()[0];
  if (!sheetFile) throw new Error('FORMAT');

  const columnIndex = (ref) => {
    let index = 0;
    const letters = ref.replace(/[^A-Za-z]/g, '').toUpperCase();
    for (let i = 0; i < letters.length; i += 1) index = index * 26 + (letters.charCodeAt(i) - 64);
    return index - 1;
  };

  const rows = [];
  all(await xml(sheetFile), 'row').forEach((row) => {
    const cells = [];
    all(row, 'c').forEach((cell, position) => {
      const ref = cell.getAttribute('r');
      const type = cell.getAttribute('t');
      const valueNode = all(cell, 'v')[0];
      let value = '';
      if (type === 's') value = strings[Number(valueNode ? valueNode.textContent : -1)] || '';
      else if (type === 'inlineStr') value = all(cell, 't').map((t) => t.textContent).join('');
      else if (valueNode) value = valueNode.textContent;
      cells[ref ? columnIndex(ref) : position] = String(value).trim();
    });
    rows.push(Array.from(cells, (value) => value || ''));
  });
  return rows;
}

// Liest eine CSV-Datei. Trennzeichen (Strichpunkt, Komma, Tabulator) wird erkannt.
function readCsv(buffer) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch (e) {
    text = new TextDecoder('windows-1252').decode(buffer); // ältere Excel-Exporte
  }
  text = text.replace(/^\uFEFF/, ''); // unsichtbares Startzeichen entfernen
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = [';', '\t', ','].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell.trim()); cell = ''; }
    else if (ch === '\n') { row.push(cell.trim()); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || row.length > 0) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

// Liest eine hochgeladene Datei und gibt die nicht leeren Zeilen zurück.
async function readTableFile(file) {
  const buffer = await file.arrayBuffer();
  const head = new Uint8Array(buffer.slice(0, 4));
  let rows;
  if (head[0] === 0x50 && head[1] === 0x4b) rows = await readXlsx(buffer); // "PK" = ZIP = .xlsx
  else if (head[0] === 0xd0 && head[1] === 0xcf) throw new Error('XLS'); // altes Excel-Format
  else rows = readCsv(buffer);
  return rows.filter((row) => row.some((value) => value !== ''));
}

function importErrorText(error) {
  const code = error && error.message;
  if (code === 'XLS') return 'Das alte Excel-Format (.xls) wird nicht unterstützt. Bitte die Liste in Excel als .xlsx speichern.';
  if (code === 'BROWSER') return 'Dieser Browser kann .xlsx-Dateien nicht lesen. Bitte die Liste als CSV speichern oder einen aktuellen Browser verwenden.';
  return 'Die Datei konnte nicht gelesen werden. Unterstützt werden Excel-Dateien (.xlsx) und CSV.';
}

// Sucht die Kopfzeile und ordnet die Spalten den Feldern zu. Die Spaltennamen dürfen
// variieren, z.B. "Modell", "Typ / Modell" oder "Typ". Kurze Namen müssen genau passen.
function findColumns(rows, fields, anchors) {
  let fallback = null;
  for (let r = 0; r < Math.min(rows.length, 20); r += 1) {
    const heads = rows[r].map(norm);
    const cols = {};
    const used = {};
    fields.forEach((field) => {
      for (let n = 0; n < field.names.length; n += 1) {
        const name = field.names[n];
        const index = heads.findIndex((head, i) => !used[i] && head && (name.length <= 3 ? head === name : head.indexOf(name) >= 0));
        if (index >= 0) { cols[field.key] = index; used[index] = true; break; }
      }
    });
    const labels = Object.keys(cols).map((key) => cols[key]).sort((a, b) => a - b).map((index) => '«' + rows[r][index] + '»');
    const found = { headerRow: r, cols, labels };
    const hasAnchor = anchors.some((key) => cols[key] !== undefined);
    if (hasAnchor && Object.keys(cols).length >= 2) return found;
    if (hasAnchor && !fallback) fallback = found;
  }
  return fallback;
}

const DEVICE_FIELDS = [
  { key: 'category', names: ['geratetyp', 'gerateart', 'geratekategorie', 'kategorie', 'bezeichnung', 'gerat'] },
  { key: 'vendor', names: ['hersteller', 'lieferant', 'firma', 'marke'] },
  { key: 'risk', names: ['risikoklasse', 'risiko', 'klasse'] },
  { key: 'interval', names: ['intervall', 'wiederholung', 'turnus', 'monate'] },
  { key: 'model', names: ['modell', 'model', 'typ', 'produkt', 'name'] },
];

const STAFF_FIELDS = [
  { key: 'persNo', names: ['personalnummer', 'personalnr', 'persnr', 'mitarbeiternummer', 'mitarbeiternr', 'mitarbeiterid', 'personalid', 'manr', 'kurzel', 'nr', 'id'] },
  { key: 'first', names: ['vorname', 'rufname'] },
  { key: 'last', names: ['nachname', 'familienname'] },
  { key: 'role', names: ['funktion', 'rolle', 'berufsbezeichnung', 'stellenbezeichnung', 'beruf', 'position'] },
  { key: 'name', names: ['name', 'mitarbeitende', 'mitarbeiter', 'person'] },
];

// "IIb", "2b" oder "Klasse IIb" werden einheitlich zu "IIb"
function normalizeRisk(raw) {
  const text = String(raw || '').trim();
  if (!text || text === '-') return '';
  if (/kein/i.test(text)) return NON_MEDICAL;
  const short = text.toUpperCase().replace(/KLASSE|CLASS|KL\./g, '').replace(/\s+/g, '');
  const known = { 1: 'I', '2A': 'IIa', '2B': 'IIb', 3: 'III', I: 'I', IIA: 'IIa', IIB: 'IIb', III: 'III' };
  return known[short] || text;
}

// "12", "12 Monate", "jährlich" oder "alle 2 Jahre" werden zu Monaten
function parseInterval(raw, risk) {
  if (risk === NON_MEDICAL) return 0;
  const text = String(raw || '').trim().toLowerCase();
  if (!text) return DEFAULT_INTERVAL;
  const number = parseInt(text.replace(/[^0-9]/g, ' ').trim(), 10);
  if (/jahr|jähr/.test(text)) return (number > 0 ? number : 1) * 12;
  if (number === 0) return 0;
  return number > 0 ? number : DEFAULT_INTERVAL;
}

function parseDeviceRows(rows) {
  const found = findColumns(rows, DEVICE_FIELDS, ['model', 'category']);
  if (!found) {
    return { error: 'In der Datei wurde keine Spalte mit dem Gerät gefunden. Erwartet wird eine Kopfzeile, zum Beispiel: Gerätetyp, Modell, Risikoklasse, Hersteller, Intervall (Monate).' };
  }
  const value = (row, key) => (found.cols[key] === undefined ? '' : (row[found.cols[key]] || '').trim());
  const items = [];
  let skipped = 0;
  let filled = 0; // Gerätetyp war leer und stammt von der Zeile darüber
  let unnamed = 0; // kein Modell angegeben, der Gerätetyp dient als Name
  let lastCategory = '';
  rows.slice(found.headerRow + 1).forEach((row) => {
    let model = value(row, 'model');
    let category = value(row, 'category');
    if (!model && !category) { skipped += 1; return; }
    // Gruppierte Listen nennen den Gerätetyp nur in der ersten Zeile einer Gruppe.
    if (category) lastCategory = category;
    else if (lastCategory) { category = lastCategory; filled += 1; }
    if (!model) { model = category; category = ''; unnamed += 1; }
    const risk = normalizeRisk(value(row, 'risk'));
    items.push({ model, category, vendor: value(row, 'vendor'), risk, interval: parseInterval(value(row, 'interval'), risk) });
  });
  if (items.length === 0) return { error: 'Unter der Kopfzeile stehen keine Geräte.' };
  return { items, skipped, filled, unnamed, labels: found.labels, hasInterval: found.cols.interval !== undefined };
}

function parseStaffRows(rows) {
  const found = findColumns(rows, STAFF_FIELDS, ['name', 'last', 'first']);
  if (!found) {
    return { error: 'In der Datei wurde keine Spalte mit dem Namen gefunden. Erwartet wird eine Kopfzeile, zum Beispiel: Name, Funktion, Personalnummer.' };
  }
  const value = (row, key) => (found.cols[key] === undefined ? '' : (row[found.cols[key]] || '').trim());
  const items = [];
  let skipped = 0;
  rows.slice(found.headerRow + 1).forEach((row) => {
    const first = value(row, 'first');
    const last = value(row, 'last') || value(row, 'name');
    const hasBoth = found.cols.first !== undefined && (found.cols.last !== undefined || found.cols.name !== undefined);
    let name = hasBoth ? (first + ' ' + last).trim() : (value(row, 'name') || first || last);
    // "Meier, Sarah" wird zu "Sarah Meier"
    const comma = name.split(',');
    if (comma.length === 2) name = (comma[1].trim() + ' ' + comma[0].trim()).trim();
    if (!name) { skipped += 1; return; }
    items.push({ name, role: value(row, 'role'), persNo: value(row, 'persNo') });
  });
  if (items.length === 0) return { error: 'Unter der Kopfzeile stehen keine Mitarbeitenden.' };
  return { items, skipped, labels: found.labels };
}

// Vergleicht die importierten Geräte mit dem Bestand:
// add = neu, link = in der Klinik bekannt, aber noch nicht in dieser Abteilung, same = schon vorhanden
function planDeviceImport(items, devices, deptId) {
  const keyOf = (d) => plain(d.model) + '|' + plain(d.vendor);
  const add = [];
  const link = [];
  let same = 0;
  items.forEach((item) => {
    const existing = devices.find((d) => keyOf(d) === keyOf(item));
    if (existing && existing.depts.indexOf(deptId) >= 0) same += 1;
    else if (existing) { if (link.indexOf(existing.id) < 0) link.push(existing.id); else same += 1; }
    else if (add.some((d) => keyOf(d) === keyOf(item))) same += 1;
    else add.push(item);
  });
  return { add, link, same };
}

function planStaffImport(items, staff) {
  const samePerson = (a, b) => (a.persNo && b.persNo ? norm(a.persNo) === norm(b.persNo) : plain(a.name) === plain(b.name));
  const add = [];
  let same = 0;
  items.forEach((item) => {
    if (staff.some((p) => samePerson(p, item)) || add.some((p) => samePerson(p, item))) same += 1;
    else add.push(item);
  });
  return { add, same };
}

// Lädt eine Vorlage herunter, die sich in Excel öffnen und ausfüllen lässt.
function downloadTemplate(fileName, rows) {
  const escape = (value) => (/[";\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value);
  const text = '\uFEFF' + rows.map((row) => row.map(escape).join(';')).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const DEVICE_TEMPLATE = [
  ['Gerätetyp', 'Modell', 'Risikoklasse', 'Hersteller', 'Intervall (Monate)'],
  ['Infusionspumpe', 'Beispielpumpe 200', 'IIb', 'Beispiel Medical AG', '24'],
  ['Überwachungsmonitor', 'Beispielmonitor X', 'IIa', 'Beispiel Medical AG', '24'],
];
const STAFF_TEMPLATE = [
  ['Name', 'Funktion', 'Personalnummer'],
  ['Anna Beispiel', 'Dipl. Pflegefachfrau HF', 'MA-1001'],
  ['Marco Muster', 'Fachmann Gesundheit EFZ', 'MA-1002'],
];


/* ==========================================================================
   5. BAUSTEINE
   ========================================================================== */

function Logo({ size }) {
  const large = size === 'lg';
  return (
    <div className="flex select-none items-center gap-2.5">
      <img src={LOGO_URL} alt="" className={large ? 'h-12 w-12' : 'h-9 w-9'} />
      <div>
        <div className={(large ? 'text-2xl ' : 'text-lg ') + 'leading-none tracking-tight text-[#17324D]'}>
          <span className="font-medium">geraete</span>
          <span className="font-bold">pass</span>
          <span className="font-medium text-slate-400">.ch</span>
        </div>
        {large && <div className="mt-1.5 text-sm text-slate-500">Schulungsnachweis & Compliance</div>}
      </div>
    </div>
  );
}

const markCls = (key) => 'inline-flex items-center justify-center rounded-full border ' + STATUS[key].chip;
const chipCls = (key) => 'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ' + STATUS[key].chip;

function StatusChip({ status, short }) {
  const meta = STATUS[status.key];
  const StatusIcon = meta.icon;
  return (
    <span className={chipCls(status.key)}>
      <StatusIcon className="h-3.5 w-3.5" />
      {short && meta.short ? meta.short : meta.label}
    </span>
  );
}

// Fortschrittsbalken: zeigt auf einen Blick, wie viele Schulungen gültig, fällig, abgelaufen oder offen sind.
function Progress({ sum, label }) {
  const parts = STATUS_KEYS.filter((key) => sum[key] > 0);
  const notes = [];
  if (sum.dueSoon) notes.push(sum.dueSoon + ' bald fällig');
  if (sum.expired) notes.push(sum.expired + ' abgelaufen');
  if (sum.missing) notes.push(sum.missing + ' fehlend');
  const summary = sum.total === 0
    ? 'Noch keine Geräte zugeteilt'
    : sum.ok + ' von ' + plural(sum.total, 'Schulung', 'Schulungen') + ' gültig (' + sum.pct + ' %)';
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-semibold text-slate-900">{label ? label + ': ' : ''}{summary}</span>
        {notes.length > 0 && <span className="text-sm text-slate-500">{notes.join(', ')}</span>}
      </div>
      <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-200" role="img" aria-label={summary}>
        {parts.map((key) => (
          <div key={key} className={STATUS[key].bar} style={{ width: (sum[key] / sum.total) * 100 + '%' }} />
        ))}
      </div>
    </div>
  );
}

// Umschalter mit zwei bis drei Optionen (Rollen, Reiter)
function Segmented({ label, options, value, onChange }) {
  return (
    <div role="tablist" aria-label={label} className="flex max-w-full overflow-x-auto rounded-xl bg-slate-200/70 p-1">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={FOCUS + 'min-h-[40px] flex-auto whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ' + (active ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// Fenster über der Seite. Auf dem Handy fährt es von unten herein. Schliesst mit Escape oder Klick daneben.
function Modal({ label, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="gp-overlay fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="gp-sheet max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 text-left shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <Logo size="sm" />
          <button onClick={onClose} aria-label="Fenster schliessen" className={FOCUS + 'gp-no-print flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900'}>
            <Close className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Unterschriftsfeld: mit Finger, Stift oder Maus unterschreiben.
// Meldet das Bild (PNG als Data-URL) über onChange, oder null nach dem Löschen.
function SignaturePad({ name, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // Zeichenfläche einmalig an die angezeigte Grösse anpassen (scharf auf hochauflösenden Displays)
  useEffect(() => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    if (rect.width > 0) {
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
    }
  }, []);

  const position = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width > 0 ? canvas.width / rect.width : 1;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale, scale };
  };

  const start = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* nicht überall verfügbar */ }
    const p = position(e);
    ctx.lineWidth = 2.2 * p.scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#17324D';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1); // damit auch ein Punkt sichtbar ist
    ctx.stroke();
    drawing.current = true;
  };

  const move = (e) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const p = position(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setHasInk(true);
    onChange(canvasRef.current.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange(null);
  };

  return (
    <div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          aria-label={'Unterschriftsfeld für ' + name}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
          className="h-36 w-full cursor-crosshair touch-none rounded-xl border-2 border-dashed border-slate-300 bg-slate-50"
        />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-slate-400">
            Hier unterschreiben, mit Finger, Stift oder Maus
          </span>
        )}
      </div>
      {hasInk && (
        <button type="button" onClick={clear} className={ui.link + ' mt-2'}>Unterschrift löschen</button>
      )}
    </div>
  );
}


/* ==========================================================================
   6. ANSICHTEN
   ========================================================================== */

/* ---------- 6.1 Passwort ---------- */

function PasswordGate({ onUnlock }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    let ok = false;
    try {
      ok = (await sha256Hex(value)) === PASSWORD_HASH;
    } catch (err) {
      setError('Die Passwortprüfung ist in diesem Browser nicht möglich. Bitte die Seite über https öffnen.');
      setBusy(false);
      return;
    }
    if (ok) {
      onUnlock();
      return;
    }
    setError('Das Passwort stimmt nicht. Bitte erneut eingeben.');
    setValue('');
    setBusy(false);
  };

  return (
    <div lang="de" className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-800">
      <form onSubmit={submit} className={ui.panel + ' w-full max-w-sm space-y-6 p-6 sm:p-8'}>
        <Logo size="lg" />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Zugang zur Demo</h1>
          <p className="mt-1 text-sm text-slate-500">Diese Seite ist mit einem Passwort geschützt.</p>
        </div>
        <div>
          <label htmlFor="gp-password" className={ui.label}>Passwort</label>
          <input
            id="gp-password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            className={ui.input}
          />
          {error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
        </div>
        <button type="submit" disabled={busy || value === ''} className={ui.btnPrimary + ' w-full'}>
          <Lock /> Entsperren
        </button>
      </form>
    </div>
  );
}

/* ---------- 6.2 Rollenwahl ---------- */

function RoleCard({ icon, title, subtitle, text, button, onStart, tag, children }) {
  return (
    <div className={ui.panel + ' relative flex flex-col p-5'}>
      {tag && <span className="absolute -top-3 right-4 rounded-full bg-[#17324D] px-2.5 py-1 text-xs font-semibold text-white">{tag}</span>}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#17324D]">{icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-tight text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">{text}</p>
      {children}
      <button onClick={onStart} className={ui.btnPrimary + ' mt-5 w-full'}>{button}</button>
    </div>
  );
}

function RoleSelect({ staff, selectedStaffId, onSelectStaff, onStart }) {
  return (
    <div lang="de" className="flex min-h-screen bg-slate-100 px-4 py-8 text-slate-800 sm:px-6 sm:py-12 lg:items-center">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Logo size="lg" />
          <div className="text-sm text-slate-500">
            <div className="flex items-center gap-1.5 font-medium text-emerald-700">
              <Shield /> MepV & Swissmedic konform
            </div>
            <div className="mt-0.5">Mandant: {CLIENT_NAME} (Demo)</div>
          </div>
        </div>

        <div className="mt-10 max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Digitaler Gerätepass</h1>
          <p className="mt-2 text-base text-slate-600">
            Wählen Sie eine Rolle für die Vorführung. Im Klinikbetrieb ergibt sich die Rolle automatisch aus dem persönlichen Login.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <RoleCard
            icon={<UserIcon className="h-5 w-5" />}
            title="Mitarbeitende"
            subtitle="Mein Gerätepass"
            text="Zeigt aus Datenschutzgründen nur das eigene Profil, die zugeteilten Geräte und die eigenen Schulungsnachweise."
            button="Gerätepass öffnen"
            onStart={() => onStart('employee')}
          >
            <div className="mt-4">
              <label htmlFor="gp-person" className={ui.label}>Person</label>
              <select id="gp-person" value={selectedStaffId} onChange={(e) => onSelectStaff(e.target.value)} className={ui.input}>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({deptById(s.dept).short})</option>
                ))}
              </select>
            </div>
          </RoleCard>

          <RoleCard
            icon={<Users className="h-5 w-5" />}
            title="Stationsleitung"
            subtitle="Zuteilen und schulen"
            tag="Hauptansicht"
            text="Legt fest, wer welches Gerät benötigt, erfasst Schulungen mit Unterschrift und führt das Geräteinventar der Station."
            button="Als Stationsleitung öffnen"
            onStart={() => onStart('line')}
          />

          <RoleCard
            icon={<Building className="h-5 w-5" />}
            title="Qualitätsmanagement"
            subtitle="Klinik-Übersicht"
            text="Übersicht über alle Abteilungen für Swissmedic- und ISO-Audits, nur lesend, mit jedem Schulungsnachweis im Detail."
            button="QM-Übersicht öffnen"
            onStart={() => onStart('qm')}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- 6.3 Kopfzeile ---------- */

const ROLE_TABS = [
  { id: 'employee', label: 'Mitarbeitende' },
  { id: 'line', label: 'Stationsleitung' },
  { id: 'qm', label: 'QM' },
];

function Header({ role, onRole, onRoleSelect, onLock }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <Logo size="sm" />
        <div className="order-3 w-full lg:order-2 lg:flex lg:w-auto lg:flex-1 lg:justify-center">
          <Segmented label="Rolle" options={ROLE_TABS} value={role} onChange={onRole} />
        </div>
        <div className="order-2 ml-auto flex items-center gap-2 lg:order-3 lg:ml-0">
          <button onClick={onRoleSelect} aria-label="Rollenwahl" className={ui.btnSecondary}>
            <Swap /> <span className="hidden sm:inline">Rollenwahl</span>
          </button>
          <button onClick={onLock} aria-label="Sperren" className={ui.btnSecondary}>
            <Lock /> <span className="hidden sm:inline">Sperren</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------- 6.4 Mitarbeitende: Mein Gerätepass ---------- */

// Der Gerätepass als Ausweis: Name, Funktion, Abteilung und Stand der Schulungen auf einen Blick.
function PassCard({ person, rows }) {
  const count = { valid: 0, dueSoon: 0, expired: 0, missing: 0 };
  rows.forEach((row) => { count[row.status.key] += 1; });
  const open = count.expired + count.missing; // abgelaufen oder noch nie geschult
  const ok = count.valid + count.dueSoon;

  // Gesamtstand in einem Satz, in der Farbe des dringendsten Status
  let overall = null;
  if (open > 0) overall = { key: 'expired', text: plural(open, 'Schulung', 'Schulungen') + ' offen' };
  else if (count.dueSoon > 0) overall = { key: 'dueSoon', text: plural(count.dueSoon, 'Schulung', 'Schulungen') + ' bald fällig' };
  else if (rows.length > 0) overall = { key: 'valid', text: 'Alle Schulungen gültig' };
  const OverallIcon = overall ? STATUS[overall.key].icon : null;

  // Initialen als Platzhalter für das Foto: erster Buchstabe von Vor- und Nachname
  const words = person.name.split(/\s+/).filter(Boolean);
  const initials = words.filter((word, i) => i === 0 || i === words.length - 1).map((word) => word.charAt(0)).join('').toUpperCase();

  // Ein Punkt pro Gerät, Dringendes zuerst
  const dots = rows.slice(0, 24);
  const dotCls = { valid: 'bg-emerald-400', dueSoon: 'bg-amber-400', expired: 'bg-red-400', missing: 'border border-dashed border-white/70' };

  return (
    <section aria-label="Gerätepass" className="relative flex min-h-[16rem] flex-col justify-between overflow-hidden rounded-2xl bg-[#17324D] p-5 text-white shadow-lg sm:p-6">
      {/* Wasserzeichen: die Linie aus dem Logo */}
      <svg aria-hidden="true" viewBox="4 4 40 40" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute -bottom-12 -right-8 h-60 w-60 opacity-[0.07]">
        <path d="M9 27h6.5l3.5-9.5 5 16.5 3.5-8l4 4.5 8.5-12" />
      </svg>

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <svg aria-hidden="true" viewBox="4 4 40 40" className="h-8 w-8 shrink-0">
            <rect x="4" y="4" width="40" height="40" rx="11" fill="#fff" fillOpacity="0.14" />
            <path d="M9 27h6.5l3.5-9.5 5 16.5 3.5-8" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M27.5 26l4 4.5 8.5-12" fill="none" stroke="#34D399" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="min-w-0 leading-tight">
            <div className="text-sm tracking-tight">
              <span className="font-medium">geraete</span><span className="font-bold">pass</span><span className="font-medium text-white/50">.ch</span>
            </div>
            <div className="truncate text-xs text-white/70">{CLIENT_NAME}</div>
          </div>
        </div>
        <div className="whitespace-nowrap text-sm font-semibold text-white">Gerätepass</div>
      </div>

      <div className="relative mt-6 flex items-center gap-4">
        <div aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-semibold tracking-wide ring-1 ring-white/20">{initials}</div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-white">{person.name}</h1>
          {person.role && <p className="mt-0.5 text-sm text-white/75">{person.role}</p>}
        </div>
      </div>

      <dl className="relative mt-5 grid grid-cols-2 gap-x-6 text-sm">
        <div>
          <dt className="text-xs text-white/60">Personal-Nr.</dt>
          <dd className="font-medium">{person.persNo || 'nicht angegeben'}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/60">Abteilung</dt>
          <dd className="font-medium">{deptById(person.dept).short}</dd>
        </div>
      </dl>

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
        <div>
          {rows.length > 0 && (
            <div aria-hidden="true" className="mb-1.5 flex flex-wrap items-center gap-1.5">
              {dots.map((row) => (
                <span key={row.device.id} title={row.device.model + ': ' + STATUS[row.status.key].label} className={'h-3 w-3 rounded-full ' + dotCls[row.status.key]} />
              ))}
              {rows.length > dots.length && <span className="text-xs text-white/70">+{rows.length - dots.length}</span>}
            </div>
          )}
          <div className="text-sm text-white/80">
            {rows.length === 0 ? 'Noch keine Geräte zugeteilt' : ok + ' von ' + plural(rows.length, 'Schulung', 'Schulungen') + ' gültig'}
          </div>
        </div>
        {overall && (
          <span className={'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold ' + STATUS[overall.key].chip}>
            <OverallIcon className="h-4 w-4" /> {overall.text}
          </span>
        )}
      </div>
    </section>
  );
}

function EmployeeView({ person, staff, devices, onSelectStaff, onShowCert }) {
  const rows = person.assigned
    .map((id) => devices.find((d) => d.id === id))
    .filter((d) => d && needsTraining(d))
    .map((device) => {
      const records = person.certs[device.id] || [];
      return { device, records, status: getStatus(device, records) };
    })
    .sort((a, b) => URGENCY[a.status.key] - URGENCY[b.status.key]);

  // Die gültige Schulung, die als nächste abläuft
  const next = rows.filter((row) => row.status.daysLeft >= 0).sort((a, b) => a.status.daysLeft - b.status.daysLeft)[0];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
        <PassCard person={person} rows={rows} />

        <div className={ui.panel + ' flex flex-col justify-between gap-6 p-5 sm:p-6'}>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Stand meiner Schulungen</h2>
            <div className="mt-3">
              <Progress sum={summarize([person], devices)} />
            </div>
            {next && (
              <p className="mt-4 text-sm text-slate-600">
                Nächste Wiederholung: {next.device.model}, gültig bis {formatDate(next.status.validUntil)}.
              </p>
            )}
          </div>
          <div className="sm:max-w-xs">
            <label htmlFor="gp-demo-person" className="mb-1 block text-xs font-medium text-slate-500">Demo: Person wechseln</label>
            <select id="gp-demo-person" value={person.id} onChange={(e) => onSelectStaff(e.target.value)} className={ui.input}>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className={ui.panel + ' overflow-hidden'}>
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">Meine Geräte</h2>
          <p className="text-sm text-slate-500">Von der Stationsleitung zugeteilt. Dringendes steht zuoberst.</p>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-6">Ihnen sind noch keine Geräte zugeteilt.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {rows.map(({ device, records, status }) => (
              <li key={device.id} className="flex flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:gap-6">
                <div className="min-w-0 md:flex-1">
                  <div className="font-semibold text-slate-900">{device.model}</div>
                  <div className="text-sm text-slate-500">{parts(device.category, device.vendor)}</div>
                </div>
                <div className="text-sm text-slate-500 md:w-48">{riskText(device.risk)}, alle {device.interval} Monate</div>
                <div className="flex items-center justify-between gap-3 md:w-80">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <StatusChip status={status} />
                    <span className="text-sm text-slate-500">{statusHint(status)}</span>
                  </div>
                  {records.length > 0 && (
                    <button
                      onClick={() => onShowCert(person.id, device.id)}
                      aria-label={'Nachweis für ' + device.model + ' ansehen'}
                      className={ui.link}
                    >
                      Nachweis
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- 6.5 Schulungsmatrix (von Stationsleitung und QM genutzt) ---------- */

// Ein Feld der Matrix: Status einer Person für ein Gerät.
// Stationsleitung: immer antippbar. QM (readOnly): nur antippbar, wenn es einen Nachweis gibt.
// compact: nur das Symbol (für die Tabelle auf breiten Bildschirmen, mit Legende darüber).
function MatrixField({ person, device, readOnly, compact, onOpen }) {
  const records = person.certs[device.id] || [];
  const status = getStatus(device, records);
  const meta = STATUS[status.key];
  const StatusIcon = meta.icon;
  const label = person.name + ', ' + device.model + ': ' + meta.label;
  const cls = compact ? markCls(status.key) + ' h-9 w-9' : chipCls(status.key) + ' min-h-[32px]';
  const content = compact
    ? <StatusIcon className="h-4 w-4" />
    : <><StatusIcon className="h-3.5 w-3.5" />{meta.short || meta.label}</>;
  if (readOnly && records.length === 0) {
    return <span role="img" aria-label={label} title={meta.label} className={cls}>{content}</span>;
  }
  return (
    <button
      aria-label={label}
      title={meta.label}
      onClick={() => onOpen(person, device, records.length > 0)}
      className={FOCUS + cls + ' hover:brightness-95'}
    >
      {content}
    </button>
  );
}

// Legende und Filter in einem: erklärt die Symbole und zeigt auf Klick nur Personen mit diesem Status.
function StatusFilter({ counts, filter, shown, total, showUnassigned, onToggle, onClear }) {
  return (
    <div role="group" aria-label="Nach Status filtern" className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm text-slate-600 sm:px-6">
      {STATUS_KEYS.map((key) => {
        const StatusIcon = STATUS[key].icon;
        const active = filter.includes(key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            aria-label={STATUS[key].label + ': ' + counts[key] + (active ? ', Filter aktiv' : '')}
            onClick={() => onToggle(key)}
            className={FOCUS + 'inline-flex min-h-[36px] items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 font-medium transition-colors ' + (active ? 'border-[#17324D] bg-slate-100 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
          >
            <span className={markCls(key) + ' h-6 w-6'}><StatusIcon className="h-3 w-3" /></span>
            {STATUS[key].label}
            <span className={active ? 'text-slate-600' : 'text-slate-400'}>{counts[key]}</span>
          </button>
        );
      })}
      {showUnassigned && (
        <span className="inline-flex items-center gap-2 px-2"><span className="text-slate-400">–</span>Nicht zugeteilt</span>
      )}
      {filter.length > 0 && (
        <span className="inline-flex items-center gap-3 sm:ml-auto">
          <span className="text-slate-500">{shown} von {plural(total, 'Person', 'Personen')}</span>
          <button type="button" onClick={onClear} className={ui.link}>Filter aufheben</button>
        </span>
      )}
    </div>
  );
}

function AssignToggle({ person, device, compact, onToggle }) {
  const assigned = person.assigned.includes(device.id);
  const text = assigned ? (compact ? 'Ja' : 'Zugeteilt') : (compact ? 'Nein' : 'Zuteilen');
  return (
    <button
      aria-pressed={assigned}
      aria-label={person.name + ', ' + device.model + (assigned ? ': Zuteilung entfernen' : ': zuteilen')}
      onClick={() => onToggle(person.id, device.id)}
      className={FOCUS + 'inline-flex min-h-[36px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ' + (assigned ? 'border-[#17324D] bg-[#17324D] text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')}
    >
      {assigned && <Check className="h-3.5 w-3.5" />} {text}
    </button>
  );
}

// editMode: Soll-Zuteilung ändern  |  readOnly: QM-Ansicht ohne Bearbeitung
// filter: gewählte Status (leer = alle Personen)  |  onFilter: neue Auswahl melden
function Matrix({ staffList: allStaff, devices, editMode, readOnly, filter = [], onFilter, onToggleAssign, onOpen }) {
  const wide = useIsWide();

  if (devices.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-6">Im Inventar dieser Abteilung stehen noch keine schulungspflichtigen Geräte.</p>;
  }
  if (allStaff.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-6">Für diese Abteilung sind noch keine Mitarbeitenden erfasst.</p>;
  }

  // Filter: nur Personen mit mindestens einer Schulung im gewählten Status.
  // Beim Bearbeiten der Zuteilung sind immer alle Personen sichtbar.
  const filtering = filter.length > 0 && !editMode;
  const isMatch = (person, device) => filter.includes(getStatus(device, person.certs[device.id]).key);
  const staffList = filtering
    ? allStaff.filter((person) => devices.some((device) => person.assigned.includes(device.id) && isMatch(person, device)))
    : allStaff;
  const dimCls = (person, device) => (filtering && !isMatch(person, device) ? ' opacity-30' : '');

  const filterRow = !editMode && onFilter ? (
    <StatusFilter
      counts={summarize(allStaff, devices)}
      filter={filter}
      shown={staffList.length}
      total={allStaff.length}
      showUnassigned={wide}
      onToggle={(key) => onFilter(filter.includes(key) ? filter.filter((k) => k !== key) : [...filter, key])}
      onClear={() => onFilter([])}
    />
  ) : null;

  if (staffList.length === 0) {
    return (
      <div>
        {filterRow}
        <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-6">In dieser Abteilung hat niemand eine Schulung mit diesem Status.</p>
      </div>
    );
  }

  /* Breite Bildschirme: Tabelle (Personen in Zeilen, Geräte in Spalten) */
  if (wide) {
    return (
      <div>
        {filterRow}
        <div className="relative overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 align-bottom">
              <th scope="col" className="sticky left-0 z-10 w-64 min-w-[200px] bg-slate-50 px-6 py-3 font-semibold text-slate-600">Mitarbeitende</th>
              {devices.map((device) => (
                <th key={device.id} scope="col" title={parts(device.category, device.vendor)} className="min-w-[92px] px-1.5 py-3 text-center font-normal">
                  <div className="font-semibold leading-tight text-slate-900">{device.model}</div>
                  <div className="mt-1 text-xs leading-tight text-slate-500 [-webkit-hyphens:auto] [hyphens:auto]">{device.category}</div>
                  <div className="mt-1 text-xs text-slate-400">{riskText(device.risk)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {staffList.map((person) => (
              <tr key={person.id}>
                <th scope="row" className="sticky left-0 z-10 bg-white px-6 py-3 font-normal">
                  <div className="font-semibold text-slate-900">{person.name}</div>
                  <div className="text-xs text-slate-500">{person.role}</div>
                </th>
                {devices.map((device) => {
                  const assigned = person.assigned.includes(device.id);
                  if (editMode) {
                    return <td key={device.id} className="px-1.5 py-3 text-center"><AssignToggle person={person} device={device} compact onToggle={onToggleAssign} /></td>;
                  }
                  if (!assigned) {
                    return <td key={device.id} aria-label="Nicht zugeteilt" className="px-1.5 py-3 text-center text-slate-300">–</td>;
                  }
                  const status = getStatus(device, person.certs[device.id]);
                  return (
                    <td key={device.id} className={'px-1.5 py-3 text-center' + dimCls(person, device)}>
                      <MatrixField person={person} device={device} readOnly={readOnly} compact onOpen={onOpen} />
                      <div className="mt-1 text-xs text-slate-500">{status.validUntil ? formatDate(status.validUntil) : 'offen'}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    );
  }

  /* Handy und Tablet: eine Karte pro Person, Geräte als Liste */
  return (
    <div>
    {filterRow}
    <div className="grid items-start gap-4 p-4 sm:p-6 md:grid-cols-2">
      {staffList.map((person) => {
        const sum = summarize([person], devices);
        const list = editMode
          ? devices
          : devices
            .filter((d) => person.assigned.includes(d.id))
            .sort((a, b) => URGENCY[getStatus(a, person.certs[a.id]).key] - URGENCY[getStatus(b, person.certs[b.id]).key]);
        return (
          <section key={person.id} className="rounded-xl border border-slate-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <h4 className="font-semibold text-slate-900">{person.name}</h4>
                <p className="text-xs text-slate-500">{person.role}</p>
              </div>
              <span className="whitespace-nowrap text-xs font-medium text-slate-500">{sum.ok} von {sum.total} gültig</span>
            </div>
            {list.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-500">Noch keine Geräte zugeteilt.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {list.map((device) => {
                  const status = getStatus(device, person.certs[device.id]);
                  return (
                    <li key={device.id} className={'flex items-center justify-between gap-3 px-4 py-3' + (editMode ? '' : dimCls(person, device))}>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{device.model}</div>
                        <div className="text-xs text-slate-500">{device.category}</div>
                      </div>
                      {editMode ? (
                        <AssignToggle person={person} device={device} onToggle={onToggleAssign} />
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <MatrixField person={person} device={device} readOnly={readOnly} onOpen={onOpen} />
                          <span className="text-xs text-slate-500">{statusHint(status)}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
    </div>
  );
}

/* ---------- 6.6 Stationsleitung: Schulung erfassen ---------- */

function TrainingTab({ devices, staffList, preset, onSave }) {
  const [deviceId, setDeviceId] = useState(preset ? preset.deviceId : (devices[0] ? devices[0].id : ''));
  const [selected, setSelected] = useState(preset ? preset.staffIds : []);
  const [date, setDate] = useState(todayISO());
  const [instructor, setInstructor] = useState(DEFAULT_INSTRUCTOR);
  const [signature, setSignature] = useState(null); // Unterschrift der Instruktorin oder des Instruktors
  const [error, setError] = useState('');

  const selectedStaff = staffList.filter((p) => selected.includes(p.id));
  const allSelected = staffList.length > 0 && selectedStaff.length === staffList.length;
  const signer = instructor.trim() || 'Instruktor/in';

  const togglePerson = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setError('');
  };

  const toggleAll = () => {
    setSelected(allSelected ? [] : staffList.map((p) => p.id));
    setError('');
  };

  const submit = (e) => {
    e.preventDefault();
    if (!deviceId) return setError('Bitte ein Gerät auswählen.');
    if (!date || date > todayISO()) return setError('Bitte ein Schulungsdatum angeben, das nicht in der Zukunft liegt.');
    if (!instructor.trim()) return setError('Bitte angeben, wer geschult hat.');
    if (selectedStaff.length === 0) return setError('Bitte mindestens eine geschulte Person auswählen.');
    if (!signature) return setError('Es fehlt noch die Unterschrift der Instruktorin oder des Instruktors.');
    return onSave({ deviceId, date, instructor: instructor.trim(), staffIds: selectedStaff.map((p) => p.id), signature });
  };

  return (
    <form onSubmit={submit} className={ui.panel + ' max-w-2xl space-y-6 p-5 sm:p-6'}>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Schulung erfassen</h2>
        <p className="text-sm text-slate-500">Für eine Person oder eine ganze Gruppe. Wer geschult hat, unterschreibt einmal für alle.</p>
      </div>

      <div>
        <label htmlFor="gp-train-device" className={ui.label}>Gerät</label>
        <select id="gp-train-device" value={deviceId} onChange={(e) => { setDeviceId(e.target.value); setError(''); }} className={ui.input}>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>{parts(d.model, d.category)} ({riskText(d.risk)})</option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="gp-train-date" className={ui.label}>Datum der Schulung</label>
          <input id="gp-train-date" type="date" value={date} max={todayISO()} onChange={(e) => { setDate(e.target.value); setError(''); }} className={ui.input} />
        </div>
        <div>
          <label htmlFor="gp-train-instructor" className={ui.label}>Instruktor/in</label>
          <input id="gp-train-instructor" type="text" value={instructor} onChange={(e) => { setInstructor(e.target.value); setError(''); }} className={ui.input} />
        </div>
      </div>

      <div role="group" aria-label="Geschulte Mitarbeitende">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-slate-700">Geschulte Mitarbeitende</span>
          {staffList.length > 1 && (
            <button type="button" onClick={toggleAll} className={ui.link}>{allSelected ? 'Auswahl aufheben' : 'Alle auswählen'}</button>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {staffList.map((p) => {
            const checked = selected.includes(p.id);
            const isRepeat = (p.certs[deviceId] || []).length > 0;
            return (
              <label key={p.id} className={'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ' + (checked ? 'border-[#17324D] bg-slate-50' : 'border-slate-300 bg-white')}>
                <input type="checkbox" checked={checked} onChange={() => togglePerson(p.id)} className="h-4 w-4 accent-[#17324D]" />
                <span className="font-medium text-slate-900">{p.name}</span>
                <span className="ml-auto whitespace-nowrap text-xs text-slate-500">{isRepeat ? 'Wiederholung' : 'Erstschulung'}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <div className={ui.label}>Unterschrift Instruktor/in</div>
        <p className="mb-2 text-sm text-slate-500">
          {selectedStaff.length === 0
            ? 'Eine Unterschrift gilt für alle ausgewählten Personen.'
            : signer + ' bestätigt die Schulung für ' + plural(selectedStaff.length, 'Person', 'Personen') + '.'}
        </p>
        <SignaturePad name={signer} onChange={(image) => { setSignature(image); setError(''); }} />
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">{error}</p>}

      <button type="submit" className={ui.btnPrimary + ' w-full'}>
        {selectedStaff.length > 1 ? 'Schulung für ' + selectedStaff.length + ' Personen speichern' : 'Schulung speichern'}
      </button>
    </form>
  );
}

/* ---------- 6.7 Stationsleitung: Listen importieren ---------- */

// Knopf, der eine Datei auswählen lässt
function FileButton({ label, onFile }) {
  const inputRef = useRef(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm,.csv"
        aria-label={label}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files[0];
          e.target.value = ''; // damit dieselbe Datei erneut gewählt werden kann
          if (file) onFile(file);
        }}
      />
      <button type="button" onClick={() => inputRef.current.click()} className={ui.btnPrimary}>
        <Upload /> {label}
      </button>
    </>
  );
}

// Vorschau vor dem Import: zeigt, was neu dazukommt, und fragt nach Bestätigung
function ImportDialog({ title, fileName, target, facts, preview, onConfirm, onCancel }) {
  const shown = preview.slice(0, 6);
  return (
    <Modal label={title} onClose={onCancel}>
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500">{fileName}, Ziel: {target}</p>

      <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
        {facts.map((fact) => <li key={fact} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" /><span>{fact}</span></li>)}
      </ul>

      {shown.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm">
          {shown.map((item, i) => (
            <li key={i} className="px-4 py-2.5">
              <div className="font-semibold text-slate-900">{item.title}</div>
              {item.text && <div className="text-slate-500">{item.text}</div>}
            </li>
          ))}
          {preview.length > shown.length && (
            <li className="px-4 py-2.5 text-slate-500">und {preview.length - shown.length} weitere</li>
          )}
        </ul>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        {preview.length > 0 && (
          <button onClick={onConfirm} className={ui.btnPrimary + ' sm:flex-1'}>{plural(preview.length, 'Eintrag', 'Einträge')} importieren</button>
        )}
        <button onClick={onCancel} className={ui.btnSecondary + ' min-h-[44px] sm:flex-1'}>{preview.length > 0 ? 'Abbrechen' : 'Schliessen'}</button>
      </div>
    </Modal>
  );
}

// Kopf eines Bereichs mit Import-Knopf, Vorlage und Fehlermeldung
function ImportBar({ label, hint, error, onFile, onTemplate, children }) {
  return (
    <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {children}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" onClick={onTemplate} className={ui.link}><Download /> Vorlage herunterladen</button>
          <FileButton label={label} onFile={onFile} />
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-500">{hint}</p>
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">{error}</p>}
    </div>
  );
}

/* ---------- 6.8 Stationsleitung: Geräteinventar ---------- */

const INVENTORY_COLS = 'md:grid md:grid-cols-[1.4fr_1.6fr_1fr_1.4fr_1fr] md:gap-4';

function InventoryTab({ deptId, devices, allDevices, onImport }) {
  const [onlyMedical, setOnlyMedical] = useState(true);
  const [draft, setDraft] = useState(null); // gelesene Datei, wartet auf Bestätigung
  const [error, setError] = useState('');
  const visible = devices
    .filter((d) => !onlyMedical || d.risk !== NON_MEDICAL)
    .sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));

  const handleFile = async (file) => {
    setError('');
    try {
      const parsed = parseDeviceRows(await readTableFile(file));
      if (parsed.error) { setError(parsed.error); return; }
      setDraft({ ...parsed, fileName: file.name, plan: planDeviceImport(parsed.items, allDevices, deptId) });
    } catch (err) {
      setError(importErrorText(err));
    }
  };

  let dialog = null;
  if (draft) {
    const { plan } = draft;
    const linked = allDevices.filter((d) => plan.link.indexOf(d.id) >= 0);
    const facts = ['Erkannte Spalten: ' + draft.labels.join(', ')];
    if (plan.add.length) facts.push(plural(plan.add.length, 'neues Gerät', 'neue Geräte'));
    if (linked.length) facts.push(plural(linked.length, 'Gerät', 'Geräte') + ' aus dem Klinik-Inventar, neu für diese Abteilung');
    if (plan.same) facts.push(plural(plan.same, 'Gerät', 'Geräte') + ' bereits vorhanden, ' + (plan.same === 1 ? 'bleibt' : 'bleiben') + ' unverändert');
    if (draft.filled) facts.push('Bei ' + plural(draft.filled, 'Gerät', 'Geräten') + ' war der Gerätetyp leer und wurde von der Zeile darüber übernommen');
    if (draft.unnamed) facts.push(plural(draft.unnamed, 'Gerät', 'Geräte') + ' ohne Modell: Der Gerätetyp dient als Name');
    if (draft.skipped) facts.push(plural(draft.skipped, 'Zeile', 'Zeilen') + ' ohne Bezeichnung übersprungen');
    if (!draft.hasInterval && plan.add.length) facts.push('Ohne Intervall-Spalte gilt: Wiederholung alle ' + DEFAULT_INTERVAL + ' Monate');
    dialog = (
      <ImportDialog
        title="Geräteliste importieren"
        fileName={draft.fileName}
        target={deptById(deptId).name}
        facts={facts}
        preview={plan.add.concat(linked).map((d) => ({
          title: d.model,
          text: parts(d.category, d.vendor, riskText(d.risk), needsTraining(d) ? 'alle ' + d.interval + ' Monate' : 'keine Schulungspflicht'),
        }))}
        onConfirm={() => { onImport(plan); setDraft(null); }}
        onCancel={() => setDraft(null)}
      />
    );
  }

  return (
    <div className={ui.panel + ' overflow-hidden'}>
      <ImportBar
        label="Geräteliste importieren"
        hint="Import aus Excel (.xlsx) oder CSV. Die Kopfzeile nennt die Spalten, zum Beispiel Gerätetyp, Modell, Risikoklasse, Hersteller und Intervall in Monaten."
        error={error}
        onFile={handleFile}
        onTemplate={() => downloadTemplate('geraeteliste-vorlage.csv', DEVICE_TEMPLATE)}
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Geräteinventar der Station</h2>
          <label className="mt-1 flex min-h-[32px] cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={onlyMedical} onChange={(e) => setOnlyMedical(e.target.checked)} className="h-4 w-4 accent-[#17324D]" />
            Nur Medizinprodukte
          </label>
        </div>
      </ImportBar>

      <div className={'hidden border-b border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-600 ' + INVENTORY_COLS}>
        <span>Modell</span><span>Gerätetyp</span><span>Risikoklasse</span><span>Hersteller</span><span>Wiederholung</span>
      </div>
      {visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-6">Das Inventar dieser Abteilung ist noch leer. Importieren Sie eine Geräteliste.</p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {visible.map((d) => (
            <li key={d.id} className={'flex flex-wrap gap-x-4 gap-y-0.5 px-4 py-4 text-sm sm:px-6 md:items-center ' + INVENTORY_COLS}>
              <div className="flex w-full flex-wrap items-center gap-2 font-semibold text-slate-900">
                {d.model}
                {d.isNew && <span className="rounded-full bg-[#17324D] px-2 py-0.5 text-xs font-semibold text-white">Neu</span>}
              </div>
              <div className="w-full text-slate-600">
                <span className="md:hidden">{parts(d.category, d.vendor)}</span>
                <span className="hidden md:inline">{d.category || '–'}</span>
              </div>
              <div className="text-slate-500 md:text-slate-600">{riskText(d.risk)}</div>
              <div className="hidden text-slate-600 md:block">{d.vendor || '–'}</div>
              <div className="text-slate-500 md:text-slate-600">
                {needsTraining(d) ? 'alle ' + d.interval + ' Monate' : 'keine Schulungspflicht'}
              </div>
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </div>
  );
}

/* ---------- 6.9 Stationsleitung: Team ---------- */

function TeamTab({ deptId, staffList, allStaff, devices, onImport }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    setError('');
    try {
      const parsed = parseStaffRows(await readTableFile(file));
      if (parsed.error) { setError(parsed.error); return; }
      setDraft({ ...parsed, fileName: file.name, plan: planStaffImport(parsed.items, allStaff) });
    } catch (err) {
      setError(importErrorText(err));
    }
  };

  let dialog = null;
  if (draft) {
    const { plan } = draft;
    const facts = ['Erkannte Spalten: ' + draft.labels.join(', ')];
    if (plan.add.length) facts.push(plural(plan.add.length, 'neue Person', 'neue Personen'));
    if (plan.same) facts.push(plural(plan.same, 'Person', 'Personen') + ' bereits erfasst, ' + (plan.same === 1 ? 'bleibt' : 'bleiben') + ' unverändert');
    if (draft.skipped) facts.push(plural(draft.skipped, 'Zeile', 'Zeilen') + ' ohne Namen übersprungen');
    if (plan.add.length) facts.push('Geräte teilen Sie danach in der Matrix zu');
    dialog = (
      <ImportDialog
        title="Mitarbeiterliste importieren"
        fileName={draft.fileName}
        target={deptById(deptId).name}
        facts={facts}
        preview={plan.add.map((p) => ({ title: p.name, text: parts(p.role, p.persNo && 'Personal-Nr. ' + p.persNo) }))}
        onConfirm={() => { onImport(plan.add); setDraft(null); }}
        onCancel={() => setDraft(null)}
      />
    );
  }

  return (
    <div className={ui.panel + ' overflow-hidden'}>
      <ImportBar
        label="Mitarbeiterliste importieren"
        hint="Import aus Excel (.xlsx) oder CSV. Die Kopfzeile nennt die Spalten, zum Beispiel Name, Funktion und Personalnummer."
        error={error}
        onFile={handleFile}
        onTemplate={() => downloadTemplate('mitarbeiterliste-vorlage.csv', STAFF_TEMPLATE)}
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Team der Station</h2>
          <p className="text-sm text-slate-500">{plural(staffList.length, 'Person', 'Personen')}</p>
        </div>
      </ImportBar>

      {staffList.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-6">Für diese Abteilung sind noch keine Mitarbeitenden erfasst. Importieren Sie eine Mitarbeiterliste.</p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {staffList.map((person) => {
            const sum = summarize([person], devices);
            return (
              <li key={person.id} className="flex flex-col gap-1 px-4 py-4 text-sm sm:px-6 md:flex-row md:items-center md:gap-6">
                <div className="min-w-0 md:flex-1">
                  <div className="font-semibold text-slate-900">{person.name}</div>
                  <div className="text-slate-500">{parts(person.role, person.persNo && 'Personal-Nr. ' + person.persNo) || 'Keine weiteren Angaben'}</div>
                </div>
                <div className="text-slate-600 md:w-64 md:text-right">
                  {sum.total === 0 ? 'Noch keine Geräte zugeteilt' : sum.ok + ' von ' + sum.total + ' Schulungen gültig'}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {dialog}
    </div>
  );
}

/* ---------- 6.10 Stationsleitung: Erinnerungen ---------- */

const leadLabel = (days) => {
  const option = LEAD_OPTIONS.find((o) => o.days === days);
  return option ? option.label : plural(days, 'Tag', 'Tage');
};

// Was würde heute gemeldet? Schulungen, die innerhalb der längsten Vorwarnzeit ablaufen,
// dazu auf Wunsch abgelaufene und fehlende.
function reminderItems(staffList, devices, settings) {
  const maxLead = settings.leads.length ? Math.max.apply(null, settings.leads) : -1;
  const items = [];
  staffList.forEach((person) => {
    person.assigned.forEach((deviceId) => {
      const device = devices.find((d) => d.id === deviceId);
      if (!device || !needsTraining(device)) return;
      const status = getStatus(device, person.certs[deviceId]);
      if (status.key === 'missing') { if (settings.missing) items.push({ kind: 'missing', person, device, status }); }
      else if (status.daysLeft < 0) { if (settings.expired) items.push({ kind: 'expired', person, device, status }); }
      else if (status.daysLeft <= maxLead) items.push({ kind: 'due', person, device, status });
    });
  });
  const order = { due: 0, expired: 1, missing: 2 };
  return items.sort((a, b) => order[a.kind] - order[b.kind] || (a.status.daysLeft || 0) - (b.status.daysLeft || 0));
}

function reminderLine(item) {
  const who = item.person.name + ', ' + item.device.model + ': ';
  if (item.kind === 'missing') return who + 'noch keine Schulung erfasst';
  if (item.kind === 'expired') return who + 'abgelaufen seit ' + formatDate(item.status.validUntil);
  const days = item.status.daysLeft;
  return who + 'gültig bis ' + formatDate(item.status.validUntil) + (days === 0 ? ' (läuft heute ab)' : ' (noch ' + plural(days, 'Tag', 'Tage') + ')');
}

// Link, der die Übersicht als fertige E-Mail im eigenen Mailprogramm öffnet
function reminderMailto(email, dept, items) {
  const groups = [
    { kind: 'due', title: 'Läuft bald ab' },
    { kind: 'expired', title: 'Abgelaufen' },
    { kind: 'missing', title: 'Schulung fehlt' },
  ];
  const lines = ['Guten Tag', '', 'Stand ' + formatDate(todayISO()) + ' stehen in der ' + dept.name + ' folgende Schulungen an:'];
  let room = 30; // Mailprogramme vertragen nur begrenzt lange Links
  groups.forEach((group) => {
    const list = items.filter((item) => item.kind === group.kind);
    if (list.length === 0) return;
    const shown = list.slice(0, Math.max(room, 0));
    lines.push('', group.title + ' (' + list.length + ')');
    shown.forEach((item) => lines.push('- ' + reminderLine(item)));
    if (list.length > shown.length) lines.push('- und ' + (list.length - shown.length) + ' weitere');
    room -= shown.length;
  });
  lines.push('', 'Details im Gerätepass: geraetepass.ch');
  const subject = 'Gerätepass ' + dept.short + ': ' + plural(items.length, 'Schulung', 'Schulungen') + ' zu planen';
  return 'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\r\n'));
}

function ReminderModal({ dept, staffList, devices, settings, onSave, onClose }) {
  const [draft, setDraft] = useState(settings);
  const [customDays, setCustomDays] = useState('');
  const [error, setError] = useState('');

  const change = (patch) => { setDraft((prev) => ({ ...prev, ...patch })); setError(''); };
  const toggleLead = (days) => change({ leads: draft.leads.includes(days) ? draft.leads.filter((d) => d !== days) : [...draft.leads, days] });

  const addCustom = () => {
    const days = parseInt(customDays, 10);
    if (!(days >= 1 && days <= 730)) { setError('Bitte eine Anzahl Tage zwischen 1 und 730 eingeben.'); return; }
    if (!draft.leads.includes(days)) change({ leads: [...draft.leads, days] });
    setCustomDays('');
  };

  const email = draft.email.trim();
  const emailOk = EMAIL_PATTERN.test(email);
  const items = reminderItems(staffList, devices, draft);
  const shown = items.slice(0, 5);
  // Feste Auswahl plus selbst hinzugefügte Werte, nach Dauer sortiert
  const chips = LEAD_OPTIONS.map((o) => o.days)
    .concat(draft.leads.filter((days) => !LEAD_OPTIONS.some((o) => o.days === days)))
    .sort((a, b) => a - b);

  const save = () => {
    if (email && !emailOk) { setError('Bitte eine gültige E-Mail-Adresse eingeben.'); return; }
    onSave({ ...draft, email });
  };

  return (
    <Modal label="Erinnerungen" onClose={onClose}>
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">Erinnerungen</h2>
      <p className="text-sm text-slate-500">{dept.name}. Die Stationsleitung erhält eine E-Mail, bevor Schulungen ablaufen.</p>

      <div className="mt-5">
        <label htmlFor="gp-rem-email" className={ui.label}>E-Mail-Adresse der Stationsleitung</label>
        <input
          id="gp-rem-email"
          type="email"
          autoComplete="email"
          placeholder="name@klinik.ch"
          value={draft.email}
          onChange={(e) => change({ email: e.target.value })}
          className={ui.input}
        />
      </div>

      <div className="mt-5" role="group" aria-label="Vorwarnung vor Ablauf">
        <div className={ui.label}>Vorwarnung vor Ablauf</div>
        <div className="flex flex-wrap gap-2">
          {chips.map((days) => {
            const active = draft.leads.includes(days);
            return (
              <button
                key={days}
                type="button"
                aria-pressed={active}
                onClick={() => toggleLead(days)}
                className={FOCUS + 'inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ' + (active ? 'border-[#17324D] bg-[#17324D] text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')}
              >
                {active && <Check className="h-3.5 w-3.5" />} {leadLabel(days)}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <label htmlFor="gp-rem-custom">Eigener Wert:</label>
          <input
            id="gp-rem-custom"
            type="number"
            min="1"
            max="730"
            inputMode="numeric"
            placeholder="45"
            value={customDays}
            onChange={(e) => { setCustomDays(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            className={ui.input.replace('w-full ', 'w-24 ')}
          />
          <span>Tage vorher</span>
          <button type="button" onClick={addCustom} className={ui.btnSecondary}>Hinzufügen</button>
        </div>
      </div>

      <div className="mt-5" role="group" aria-label="Zusätzlich melden">
        <div className={ui.label}>Zusätzlich melden</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[['expired', 'Abgelaufene Schulungen'], ['missing', 'Fehlende Schulungen']].map(([key, label]) => (
            <label key={key} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900">
              <input type="checkbox" checked={draft[key]} onChange={(e) => change({ [key]: e.target.checked })} className="h-4 w-4 accent-[#17324D]" />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <div className="font-semibold text-slate-900">
          {items.length === 0 ? 'Stand heute gibt es nichts zu melden.' : 'Stand heute in der Meldung: ' + plural(items.length, 'Schulung', 'Schulungen')}
        </div>
        {shown.length > 0 && (
          <ul className="mt-1.5 space-y-1 text-slate-600">
            {shown.map((item) => <li key={item.person.id + item.device.id}>{reminderLine(item)}</li>)}
            {items.length > shown.length && <li>und {items.length - shown.length} weitere</li>}
          </ul>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-500">
        In dieser Demo wird noch keine E-Mail automatisch verschickt. Die aktuelle Übersicht lässt sich aber sofort im eigenen Mailprogramm öffnen.
      </p>

      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">{error}</p>}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
        <button type="button" onClick={save} className={ui.btnPrimary + ' sm:flex-1'}>Speichern</button>
        {emailOk && items.length > 0 ? (
          <a href={reminderMailto(email, dept, items)} className={ui.btnSecondary + ' min-h-[44px] sm:flex-1'}><Mail /> E-Mail jetzt erstellen</a>
        ) : (
          <button type="button" disabled title="Zuerst eine E-Mail-Adresse eingeben" className={ui.btnSecondary + ' min-h-[44px] cursor-not-allowed opacity-50 sm:flex-1'}><Mail /> E-Mail jetzt erstellen</button>
        )}
      </div>
    </Modal>
  );
}

/* ---------- 6.11 Stationsleitung ---------- */

const LINE_TABS = [
  { id: 'matrix', label: 'Matrix' },
  { id: 'train', label: 'Schulung' },
  { id: 'inventory', label: 'Inventar' },
  { id: 'team', label: 'Team' },
];

function LineView({ deptId, staffList, deptDevices, allStaff, allDevices, tab, preset, reminder, onTab, onDept, onToggleAssign, onShowCert, onStartTraining, onSaveTraining, onImportDevices, onImportStaff, onSaveReminder }) {
  const [editMode, setEditMode] = useState(false);
  const [filter, setFilter] = useState([]); // in der Matrix gewählte Status (leer = alle Personen)
  const [showReminder, setShowReminder] = useState(false);
  const trainDevices = deptDevices.filter(needsTraining);

  // Nachweis vorhanden -> Nachweis anzeigen. Noch keiner -> direkt zur Schulung.
  const openField = (person, device, hasRecord) => {
    if (hasRecord) onShowCert(person.id, device.id);
    else onStartTraining(device.id, [person.id]);
  };

  return (
    <div className="space-y-5">
      <div className={ui.panel + ' p-5 sm:p-6'}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-0.5 text-sm font-medium text-slate-500">Stationsleitung</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{deptById(deptId).name}</h1>
            <p className="mt-1 text-sm text-slate-600">Geräte zuteilen, Schulungen erfassen und das Inventar der Station führen.</p>
          </div>
          <div className="w-full sm:w-72">
            <label htmlFor="gp-dept" className="mb-1 block text-xs font-medium text-slate-500">Abteilung</label>
            <select id="gp-dept" value={deptId} onChange={(e) => onDept(e.target.value)} className={ui.input}>
              {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowReminder(true)} className={ui.btnSecondary + ' mt-2 w-full'}>
              <Bell /> {reminder.email ? 'Erinnerungen: eingerichtet' : 'Erinnerungen einrichten'}
            </button>
          </div>
        </div>
        <div className="mt-5 border-t border-slate-200 pt-5">
          <Progress sum={summarize(staffList, deptDevices)} />
        </div>
      </div>

      <div className="sm:inline-block">
        <Segmented label="Bereich" options={LINE_TABS} value={tab} onChange={onTab} />
      </div>

      {tab === 'matrix' && (
        <div className={ui.panel + ' overflow-hidden'}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{editMode ? 'Zuteilung bearbeiten' : 'Schulungsmatrix'}</h2>
              <p className="text-sm text-slate-500">
                {editMode
                  ? 'Legen Sie fest, wer welches Gerät bedienen muss.'
                  : 'Feld antippen für den Nachweis oder eine neue Schulung. Die Status-Knöpfe filtern die Liste.'}
              </p>
            </div>
            <button onClick={() => setEditMode(!editMode)} className={editMode ? ui.btnPrimary : ui.btnSecondary}>
              {editMode ? <><Check /> Zuteilung fertig</> : <><Pencil /> Zuteilung bearbeiten</>}
            </button>
          </div>
          <Matrix
            staffList={staffList}
            devices={trainDevices}
            editMode={editMode}
            filter={filter}
            onFilter={setFilter}
            onToggleAssign={onToggleAssign}
            onOpen={openField}
          />
        </div>
      )}

      {tab === 'train' && (
        <TrainingTab key={preset ? preset.key : 'leer'} devices={trainDevices} staffList={staffList} preset={preset} onSave={onSaveTraining} />
      )}

      {tab === 'inventory' && <InventoryTab deptId={deptId} devices={deptDevices} allDevices={allDevices} onImport={onImportDevices} />}

      {tab === 'team' && <TeamTab deptId={deptId} staffList={staffList} allStaff={allStaff} devices={deptDevices} onImport={onImportStaff} />}

      {showReminder && (
        <ReminderModal
          dept={deptById(deptId)}
          staffList={staffList}
          devices={deptDevices}
          settings={reminder}
          onSave={(settings) => { onSaveReminder(settings); setShowReminder(false); }}
          onClose={() => setShowReminder(false)}
        />
      )}
    </div>
  );
}

/* ---------- 6.12 QM: Klinik-Übersicht (nur lesen) ---------- */

function QmView({ staff, devices, log, onShowCert }) {
  const [filter, setFilter] = useState([]); // gilt für alle Abteilungen gleichzeitig

  return (
    <div className="space-y-5">
      <div className={ui.panel + ' p-5 sm:p-6'}>
        <p className="mb-0.5 text-sm font-medium text-slate-500">Qualitätsmanagement</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Klinik-Übersicht</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Alle Abteilungen im Überblick, nur lesend. Zuteilungen und Schulungen pflegen die Stationsleitungen.
        </p>
        <div className="mt-5 border-t border-slate-200 pt-5">
          <Progress sum={summarize(staff, devices)} label="Gesamte Klinik" />
        </div>
      </div>

      {DEPARTMENTS.map((dept) => {
        const list = staff.filter((s) => s.dept === dept.id);
        const deptDevices = devices.filter((d) => d.depts.includes(dept.id));
        return (
          <section key={dept.id} className={ui.panel + ' overflow-hidden'}>
            <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
              <h2 className="text-lg font-semibold text-slate-900">{dept.name}</h2>
              <p className="mb-4 text-sm text-slate-500">{list.length} Mitarbeitende. Feld antippen für den Nachweis. Die Status-Knöpfe filtern alle Abteilungen.</p>
              <Progress sum={summarize(list, deptDevices)} />
            </div>
            <Matrix
              staffList={list}
              devices={deptDevices.filter(needsTraining)}
              filter={filter}
              onFilter={setFilter}
              readOnly
              onOpen={(person, device) => onShowCert(person.id, device.id)}
            />
          </section>
        );
      })}

      <section className={ui.panel + ' overflow-hidden'}>
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-slate-900">Änderungsprotokoll</h2>
          <p className="text-sm text-slate-500">Zuteilungen, Schulungen und Importe dieser Sitzung.</p>
        </div>
        {log.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-6">In dieser Sitzung wurde noch nichts geändert.</p>
        ) : (
          <ul className="divide-y divide-slate-200 text-sm">
            {log.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4 sm:px-6">
                <span className="whitespace-nowrap text-slate-500">{entry.time}</span>
                <span className="text-slate-800">{entry.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------- 6.13 Schulungsnachweis (Fenster) ---------- */

function CertificateModal({ person, device, onClose, onRetrain }) {
  const records = person.certs[device.id] || [];
  const latest = records[records.length - 1];
  const earlier = records.slice(0, -1).reverse();
  const status = getStatus(device, records);

  // Solange der Nachweis offen ist, gelten die Druckregeln: nur der Nachweis kommt aufs Blatt.
  useEffect(() => {
    document.documentElement.classList.add('gp-cert-open');
    return () => document.documentElement.classList.remove('gp-cert-open');
  }, []);

  if (!latest) return null;

  const Field = ({ label, children }) => (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900 sm:text-right">{children}</dd>
    </div>
  );

  return (
    <Modal label="Schulungsnachweis" onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Schulungsnachweis</h2>
          <p className="text-sm text-slate-500">{device.model}</p>
        </div>
        {/* Stempel wie in einem Pass */}
        <div className={'flex shrink-0 -rotate-3 flex-col items-center rounded-lg border-2 px-3 py-1.5 ' + STATUS[status.key].stamp}>
          <span className="text-sm font-bold uppercase tracking-widest">{STATUS[status.key].label}</span>
          <span className="text-xs font-medium">{statusHint(status)}</span>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
        <Field label="Mitarbeitende/r">{person.name}{person.persNo ? ' (' + person.persNo + ')' : ''}</Field>
        <Field label="Datum der Schulung">{formatDate(latest.date)}, {latest.type}</Field>
        <Field label="Gerät">{parts(device.category, device.model)}</Field>
        <Field label="Risikoklasse nach MepV">{riskText(device.risk)}</Field>
        <Field label="Instruktor/in">{latest.instructor}</Field>
        <Field label="Wiederholung">alle {device.interval} Monate</Field>
      </dl>

      <div className="mt-4">
        <div className="mb-1.5 text-sm text-slate-500">Unterschrift Instruktor/in</div>
        <div className="flex min-h-[72px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
          {latest.sigImage ? (
            <img src={latest.sigImage} alt={'Unterschrift von ' + latest.sigName} className="h-16 max-w-full" />
          ) : (
            <span className="font-serif text-xl italic text-[#17324D]">{latest.sigName}</span>
          )}
        </div>
      </div>

      {earlier.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-1.5 text-sm font-semibold text-slate-900">Frühere Nachweise</h3>
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm">
            {earlier.map((r, i) => (
              <li key={i} className="flex flex-col gap-0.5 px-4 py-2.5 text-slate-600 sm:flex-row sm:justify-between sm:gap-4">
                <span>{formatDate(r.date)}, {r.type}</span>
                <span>{r.instructor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="gp-print-only mt-6 hidden text-xs text-slate-500">Ausdruck vom {formatDate(todayISO())}, geraetepass.ch</p>

      <button type="button" onClick={() => window.print()} className={ui.link + ' gp-no-print mt-5 min-h-[32px]'}>
        <Printer /> Drucken oder als PDF speichern
      </button>

      <div className="gp-no-print mt-4 flex flex-col gap-2 sm:flex-row-reverse">
        {onRetrain && (
          <button onClick={onRetrain} className={ui.btnPrimary + ' sm:flex-1'}>Wiederholung erfassen</button>
        )}
        <button onClick={onClose} className={ui.btnSecondary + ' min-h-[44px] sm:flex-1'}>Schliessen</button>
      </div>
    </Modal>
  );
}


/* ==========================================================================
   7. APP – Zustand und Aktionen
   ========================================================================== */

export default function App() {
  // Zugang und Navigation
  const [unlocked, setUnlocked] = useState(session.isUnlocked);
  const [role, setRole] = useState(null); // null | 'employee' | 'line' | 'qm'
  const [selectedStaffId, setSelectedStaffId] = useState('s1');
  const [deptId, setDeptId] = useState('A');
  const [lineTab, setLineTab] = useState('matrix');
  const [trainPreset, setTrainPreset] = useState(null); // vorbelegtes Schulungsformular
  const [certView, setCertView] = useState(null); // { personId, deviceId }

  // Daten
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [staff, setStaff] = useState(createDemoStaff);
  const [reminders, setReminders] = useState({}); // Erinnerungs-Einstellungen pro Abteilung
  const [log, setLog] = useState([]);
  const [toast, setToast] = useState(null);

  // Titel und Symbol im Browser-Tab
  useEffect(() => {
    document.title = 'geraetepass.ch';
    let icon = document.querySelector('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      document.head.appendChild(icon);
    }
    icon.type = 'image/svg+xml';
    icon.href = LOGO_URL;
  }, []);

  // Hinweis unten nach 4 Sekunden wieder ausblenden
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = (text) => setToast({ text, key: Date.now() });

  const addLog = (text) => {
    const now = new Date();
    const time = formatDate(toISO(now)) + ', ' + pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    setLog((prev) => [{ id: prev.length + 1, time, text }, ...prev]);
  };

  /* ----- Abgeleitete Werte ----- */
  const currentEmployee = staff.find((s) => s.id === selectedStaffId) || staff[0];
  const deptStaff = staff.filter((s) => s.dept === deptId);
  const deptDevices = devices.filter((d) => d.depts.includes(deptId));
  const actor = 'Stationsleitung ' + deptById(deptId).short;

  /* ----- Aktionen ----- */
  const unlock = () => { session.unlock(); setUnlocked(true); };
  const lock = () => { session.lock(); setUnlocked(false); setRole(null); setCertView(null); };

  const changeDept = (id) => {
    setDeptId(id);
    setLineTab('matrix');
    setTrainPreset(null); // Auswahl der alten Abteilung nicht mitnehmen
  };

  const startTraining = (deviceId, staffIds) => {
    setTrainPreset({ deviceId, staffIds, key: Date.now() });
    setLineTab('train');
    setCertView(null);
  };

  const toggleAssign = (personId, deviceId) => {
    const person = staff.find((p) => p.id === personId);
    const device = devices.find((d) => d.id === deviceId);
    const wasAssigned = person.assigned.includes(deviceId);
    setStaff((prev) => prev.map((p) => {
      if (p.id !== personId) return p;
      const assigned = wasAssigned ? p.assigned.filter((x) => x !== deviceId) : [...p.assigned, deviceId];
      return { ...p, assigned };
    }));
    addLog(actor + ': Zuteilung ' + (wasAssigned ? 'entfernt' : 'hinzugefügt') + ', ' + person.name + ', ' + device.model);
  };

  // Eine Schulung für eine oder mehrere Personen. Unterschrieben hat, wer geschult hat.
  const saveTraining = ({ deviceId, date, instructor, staffIds, signature }) => {
    const device = devices.find((d) => d.id === deviceId);
    const trainedIds = staffIds;
    const savedAt = new Date().toISOString();

    setStaff((prev) => prev.map((p) => {
      if (!trainedIds.includes(p.id)) return p;
      const earlier = p.certs[deviceId] || [];
      const record = {
        date,
        instructor,
        type: earlier.length > 0 ? WDH : ERST,
        sigName: signerName(instructor),
        sigImage: signature,
        savedAt,
      };
      // Alte Nachweise bleiben erhalten, sortiert nach Datum (neuster zuletzt)
      const records = [...earlier, record].sort((a, b) => a.date.localeCompare(b.date));
      const assigned = p.assigned.includes(deviceId) ? p.assigned : [...p.assigned, deviceId];
      return { ...p, assigned, certs: { ...p.certs, [deviceId]: records } };
    }));

    const names = staff.filter((p) => trainedIds.includes(p.id)).map((p) => p.name).join(', ');
    addLog(actor + ': Schulung erfasst, ' + device.model + ' am ' + formatDate(date) + ' durch ' + instructor + ' für ' + names);
    notify('Schulung gespeichert.');
    setTrainPreset(null);
    setLineTab('matrix');
  };

  // Importierte Geräte ins Inventar der aktuellen Abteilung aufnehmen
  const importDevices = (plan) => {
    const stamp = Date.now();
    const added = plan.add.map((item, i) => ({ ...item, id: 'd' + stamp + '-' + i, depts: [deptId], isNew: true }));
    setDevices((prev) => prev
      .map((d) => (plan.link.indexOf(d.id) >= 0 ? { ...d, depts: [...d.depts, deptId] } : d))
      .concat(added));
    const total = plan.add.length + plan.link.length;
    addLog(actor + ': Geräteliste importiert, ' + plural(total, 'Gerät', 'Geräte') + ' aufgenommen');
    notify('Geräteliste importiert: ' + plural(total, 'Gerät', 'Geräte') + ' aufgenommen.');
  };

  // Importierte Mitarbeitende der aktuellen Abteilung hinzufügen (noch ohne Geräte)
  const importStaff = (people) => {
    const stamp = Date.now();
    setStaff((prev) => prev.concat(people.map((p, i) => ({
      id: 's' + stamp + '-' + i, name: p.name, role: p.role, persNo: p.persNo, dept: deptId, assigned: [], certs: {},
    }))));
    addLog(actor + ': Mitarbeiterliste importiert, ' + plural(people.length, 'Person', 'Personen') + ' aufgenommen');
    notify('Mitarbeiterliste importiert: ' + plural(people.length, 'Person', 'Personen') + ' aufgenommen.');
  };

  const saveReminder = (settings) => {
    setReminders((prev) => ({ ...prev, [deptId]: settings }));
    const leads = settings.leads.slice().sort((a, b) => b - a).map(leadLabel).join(', ');
    addLog(actor + ': Erinnerungen ' + (settings.email ? 'eingestellt' + (leads ? ', Vorwarnung ' + leads : '') : 'ausgeschaltet'));
    notify(settings.email ? 'Erinnerungen gespeichert.' : 'Erinnerungen ausgeschaltet.');
  };

  const showCert = (personId, deviceId) => setCertView({ personId, deviceId });
  const closeCert = () => setCertView(null);

  /* ----- Anzeige ----- */
  if (!unlocked) return <PasswordGate onUnlock={unlock} />;

  if (!role) {
    return <RoleSelect staff={staff} selectedStaffId={selectedStaffId} onSelectStaff={setSelectedStaffId} onStart={setRole} />;
  }

  const certPerson = certView ? staff.find((p) => p.id === certView.personId) : null;
  const certDevice = certView ? devices.find((d) => d.id === certView.deviceId) : null;

  return (
    <div lang="de" className="flex min-h-screen flex-col bg-slate-100 text-slate-800">
      <Header
        role={role}
        onRole={(next) => { setRole(next); setCertView(null); }}
        onRoleSelect={() => { setRole(null); setCertView(null); }}
        onLock={lock}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {role === 'employee' && (
          <EmployeeView person={currentEmployee} staff={staff} devices={devices} onSelectStaff={setSelectedStaffId} onShowCert={showCert} />
        )}

        {role === 'line' && (
          <LineView
            key={deptId}
            deptId={deptId}
            staffList={deptStaff}
            deptDevices={deptDevices}
            allStaff={staff}
            allDevices={devices}
            tab={lineTab}
            preset={trainPreset}
            reminder={reminders[deptId] || DEFAULT_REMINDER}
            onTab={(next) => { setLineTab(next); if (next !== 'train') setTrainPreset(null); }}
            onDept={changeDept}
            onToggleAssign={toggleAssign}
            onShowCert={showCert}
            onStartTraining={startTraining}
            onSaveTraining={saveTraining}
            onImportDevices={importDevices}
            onImportStaff={importStaff}
            onSaveReminder={saveReminder}
          />
        )}

        {role === 'qm' && <QmView staff={staff} devices={devices} log={log} onShowCert={showCert} />}
      </main>

      {toast && (
        <div role="status" className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg sm:left-auto sm:right-6 sm:bottom-6">
          <Check className="h-4 w-4 text-emerald-400" /> {toast.text}
        </div>
      )}

      {certPerson && certDevice && (
        <CertificateModal
          person={certPerson}
          device={certDevice}
          onClose={closeCert}
          onRetrain={role === 'line' ? () => startTraining(certDevice.id, [certPerson.id]) : null}
        />
      )}
    </div>
  );
}
