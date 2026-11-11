import React, { useState, useEffect, useRef } from 'react';

/* ==========================================================================
   geraetepass.ch – Demo-App (eine Datei, keine Zusatzpakete nötig)

   Aufbau dieser Datei:
     1. Einstellungen (Passwort, Vorwarnzeit, Abteilungen, Logo)
     2. Icons
     3. Demo-Daten (Geräte, Mitarbeitende)
     4. Hilfsfunktionen (Datum, Status, Quote)
     5. Bausteine (Logo, Status, Fortschritt, Unterschriftsfeld)
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

const NON_MEDICAL = 'kein Medizinprodukt';
const DEFAULT_INSTRUCTOR = 'M. Keller (Berufsbildner)';

const DEPARTMENTS = [
  { id: 'A', name: 'Abteilung A – Intensivpflege', short: 'Intensivpflege' },
  { id: 'B', name: 'Abteilung B – Bettenstation', short: 'Bettenstation' },
];

// Logo: ein Ausweis (Pass) mit Prüfhaken. Markenfarbe Dunkelblau #17324D,
// der Haken trägt dasselbe Grün wie der Status "Gültig".
const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
  '<defs><clipPath id="p"><rect x="6" y="5" width="30" height="38" rx="8"/></clipPath></defs>' +
  '<rect x="6" y="5" width="30" height="38" rx="8" fill="#17324D"/>' +
  '<rect x="16" y="10.5" width="10" height="3.5" rx="1.75" fill="#fff" opacity=".9"/>' +
  '<path d="M14.5 28l6.5 6.5L41 14" fill="none" stroke="#fff" stroke-width="10.5" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#p)"/>' +
  '<path d="M14.5 28l6.5 6.5L41 14" fill="none" stroke="#10B981" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
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
const Refresh = (p) => <Icon {...p}><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" /></Icon>;
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
  { id: 'd1', category: 'Langzeitbeatmungsgerät', model: 'VentPro 5000', risk: 'IIb', interval: 12, vendor: 'MedTech Systems AG', depts: ['A'] },
  { id: 'd2', category: 'Langzeitbeatmungsgerät', model: 'VentPro Compact', risk: 'IIb', interval: 12, vendor: 'MedTech Systems AG', depts: ['A'] },
  { id: 'd3', category: 'Infusionspumpe (volumetrisch)', model: 'InfusoMax V2', risk: 'IIb', interval: 24, vendor: 'SwissMed Solutions', depts: ['A', 'B'] },
  { id: 'd4', category: 'Infusionsspritzenpumpe', model: 'SyringeFlow Pro', risk: 'IIb', interval: 24, vendor: 'SwissMed Solutions', depts: ['A'] },
  { id: 'd5', category: 'Defibrillator (mit Monitor)', model: 'CardioShock Pro', risk: 'IIb', interval: 12, vendor: 'LifeCare Corp.', depts: ['A', 'B'] },
  { id: 'd6', category: 'Hämodialysegerät', model: 'RenalClear Ultra', risk: 'IIb', interval: 12, vendor: 'BioFilter GmbH', depts: ['A'] },
  { id: 'd7', category: 'Aktiver Atemgasbefeuchter', model: 'HumidAir Duo', risk: 'IIa', interval: 24, vendor: 'AeroMed AG', depts: ['A'] },
  { id: 'd8', category: 'Blutgasanalyse-System', model: 'HemoScan Flex', risk: 'IIb', interval: 24, vendor: 'LabDiagnostik AG', depts: ['A'] },
  { id: 'd9', category: 'Patientenmonitor', model: 'VitalView 1000', risk: 'IIa', interval: 24, vendor: 'GlobalHealth Tech', depts: ['A', 'B'] },
  { id: 'd10', category: 'Thoraxdrainagegerät', model: 'ThoraxDrain Digital', risk: 'IIa', interval: 24, vendor: 'CarePump AG', depts: ['A'] },
  { id: 'd11', category: 'Wärmetherapiegerät', model: 'ThermoBlanket Plus', risk: 'IIa', interval: 36, vendor: 'TempControl Medical', depts: ['B'] },
  { id: 'd12', category: 'Ohr-Infrarot-Thermometer', model: 'TempScan 600', risk: 'I', interval: 36, vendor: 'BasicMed AG', depts: ['B'] },
  { id: 'd13', category: 'Medikamentenkühlschrank', model: 'CoolStore Med 120', risk: NON_MEDICAL, interval: 0, vendor: 'KlimaTech AG', depts: ['A', 'B'] },
];

// Dieses Gerät kommt beim (simulierten) Inventar-Abgleich neu dazu.
const SYNC_DEVICE = { id: 'd14', category: 'Notfallbeatmungsgerät', model: 'OxyMobile 3000', risk: 'IIb', interval: 12, vendor: 'MedTech Systems AG', isNew: true };

// Ein Schulungsnachweis. Das Datum wird relativ zu heute gesetzt ("vor X Monaten"),
// damit die Demo immer gleich aussieht, egal wann sie geöffnet wird.
const demoCert = (monthsBack, instructor, type, sigName) => ({
  date: addMonths(todayISO(), -monthsBack),
  instructor,
  type,
  sigName,
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
    assigned: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9'],
    certs: {
      d1: [demoCert(9, KELLER, ERST, 'Sarah Meier')],
      d2: [demoCert(9, KELLER, ERST, 'Sarah Meier')],
      d3: [demoCert(38, KELLER, ERST, 'Sarah Meier'), demoCert(14, 'T. Baumann (Hersteller)', WDH, 'Sarah Meier')],
      d4: [demoCert(14, 'T. Baumann (Hersteller)', WDH, 'Sarah Meier')],
      d5: [demoCert(19, 'Dr. L. Weber', WDH, 'Sarah Meier')],
      d7: [demoCert(10, KELLER, ERST, 'Sarah Meier')],
      d8: [demoCert(8, 'Labortechnik-Team', ERST, 'Sarah Meier')],
      d9: [demoCert(10, KELLER, ERST, 'Sarah Meier')],
    },
  },
  {
    id: 's2', name: 'Lucas Brunner', role: 'Dipl. Pflegefachmann HF', persNo: 'MA-5104', dept: 'A',
    assigned: ['d1', 'd3', 'd4', 'd5', 'd7', 'd9'],
    certs: {
      d1: [demoCert(11, KELLER, ERST, 'L. Brunner')],
      d3: [demoCert(10, KELLER, ERST, 'L. Brunner')],
      d4: [demoCert(10, KELLER, ERST, 'L. Brunner')],
      d7: [demoCert(25, KELLER, ERST, 'L. Brunner')],
      d9: [demoCert(9, KELLER, ERST, 'L. Brunner')],
    },
  },
  {
    id: 's3', name: 'Nadine Widmer', role: 'Pool-Mitarbeiterin, temporär', persNo: 'TMP-902', dept: 'A',
    assigned: ['d1', 'd3', 'd4', 'd5', 'd9'],
    certs: {
      d3: [demoCert(8, KELLER, ERST, 'N. Widmer')],
      d4: [demoCert(8, KELLER, ERST, 'N. Widmer')],
      d9: [demoCert(8, KELLER, ERST, 'N. Widmer')],
    },
  },
  {
    id: 's4', name: 'Elena Rossi', role: 'Dipl. Pflegefachfrau HF', persNo: 'MA-3390', dept: 'B',
    assigned: ['d3', 'd5', 'd9', 'd11', 'd12'],
    certs: {
      d3: [demoCert(9, VOGT, WDH, 'E. Rossi')],
      d5: [demoCert(9, VOGT, WDH, 'E. Rossi')],
      d9: [demoCert(10, VOGT, ERST, 'E. Rossi')],
      d11: [demoCert(12, VOGT, ERST, 'E. Rossi')],
      d12: [demoCert(12, VOGT, ERST, 'E. Rossi')],
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
// Reihenfolge nach Dringlichkeit (für Listen)
const URGENCY = { expired: 0, missing: 1, dueSoon: 2, valid: 3 };

const needsTraining = (device) => device.interval > 0;
const deptById = (id) => DEPARTMENTS.find((d) => d.id === id);
const riskText = (risk) => (risk === NON_MEDICAL ? 'Kein Medizinprodukt' : 'Klasse ' + risk);

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
        {large && <div className="mt-1.5 text-sm text-slate-500">Swiss MedTech Documentation</div>}
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
  const parts = ['valid', 'dueSoon', 'expired', 'missing'].filter((key) => sum[key] > 0);
  const notes = [];
  if (sum.dueSoon) notes.push(sum.dueSoon + ' bald fällig');
  if (sum.expired) notes.push(sum.expired + ' abgelaufen');
  if (sum.missing) notes.push(sum.missing + ' fehlend');
  const summary = sum.total === 0
    ? 'Noch keine Geräte zugeteilt'
    : sum.ok + ' von ' + sum.total + ' Schulungen gültig (' + sum.pct + ' %)';
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
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Logo size="lg" />
          <div className="text-sm text-slate-500">
            <div className="flex items-center gap-1.5 font-medium text-emerald-700">
              <Shield /> MepV & Swissmedic konform
            </div>
            <div className="mt-0.5">Mandant: Musterklinik Schweiz AG (Demo)</div>
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
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
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

function EmployeeView({ person, staff, devices, onSelectStaff, onShowCert }) {
  const rows = person.assigned
    .map((id) => devices.find((d) => d.id === id))
    .filter((d) => d && needsTraining(d))
    .map((device) => {
      const records = person.certs[device.id] || [];
      return { device, records, status: getStatus(device, records) };
    })
    .sort((a, b) => URGENCY[a.status.key] - URGENCY[b.status.key]);

  return (
    <div className="space-y-5">
      <div className={ui.panel + ' p-5 sm:p-6'}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">Mein Gerätepass</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">{person.name}</h1>
            <p className="mt-1 text-sm text-slate-600">{person.role}</p>
            <p className="text-sm text-slate-600">Personal-Nr. {person.persNo}, {deptById(person.dept).name}</p>
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="gp-demo-person" className="mb-1 block text-xs font-medium text-slate-500">Demo: Person wechseln</label>
            <select id="gp-demo-person" value={person.id} onChange={(e) => onSelectStaff(e.target.value)} className={ui.input + ' sm:w-56'}>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5 border-t border-slate-200 pt-5">
          <Progress sum={summarize([person], devices)} />
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
                  <div className="text-sm text-slate-500">{device.category}, {device.vendor}</div>
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

// Erklärt die Symbole der Tabelle
function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200 px-6 py-3 text-sm text-slate-600">
      {['valid', 'dueSoon', 'expired', 'missing'].map((key) => {
        const StatusIcon = STATUS[key].icon;
        return (
          <span key={key} className="inline-flex items-center gap-2">
            <span className={markCls(key) + ' h-6 w-6'}><StatusIcon className="h-3 w-3" /></span>
            {STATUS[key].label}
          </span>
        );
      })}
      <span className="inline-flex items-center gap-2"><span className="w-6 text-center text-slate-400">–</span>Nicht zugeteilt</span>
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
function Matrix({ staffList, devices, editMode, readOnly, onToggleAssign, onOpen }) {
  const wide = useIsWide();

  if (devices.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-6">Im Inventar dieser Abteilung stehen noch keine schulungspflichtigen Geräte.</p>;
  }
  if (staffList.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-6">Für diese Abteilung sind noch keine Mitarbeitenden erfasst.</p>;
  }

  /* Breite Bildschirme: Tabelle (Personen in Zeilen, Geräte in Spalten) */
  if (wide) {
    return (
      <div>
        {!editMode && <Legend />}
        <div className="relative overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 align-bottom">
              <th scope="col" className="sticky left-0 z-10 min-w-[200px] bg-slate-50 px-6 py-3 font-semibold text-slate-600">Mitarbeitende</th>
              {devices.map((device) => (
                <th key={device.id} scope="col" title={device.category + ', ' + device.vendor} className="w-24 min-w-[92px] px-1.5 py-3 text-center font-normal">
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
                    <td key={device.id} className="px-1.5 py-3 text-center">
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
                    <li key={device.id} className="flex items-center justify-between gap-3 px-4 py-3">
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
  );
}

/* ---------- 6.6 Stationsleitung: Schulung erfassen ---------- */

function TrainingTab({ devices, staffList, preset, onSave }) {
  const [deviceId, setDeviceId] = useState(preset ? preset.deviceId : (devices[0] ? devices[0].id : ''));
  const [selected, setSelected] = useState(preset ? preset.staffIds : []);
  const [date, setDate] = useState(todayISO());
  const [instructor, setInstructor] = useState(DEFAULT_INSTRUCTOR);
  const [signatures, setSignatures] = useState({});
  const [error, setError] = useState('');

  const selectedStaff = staffList.filter((p) => selected.includes(p.id));

  const togglePerson = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setSignatures((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setError('');
  };

  const setSignature = (id, image) => {
    setSignatures((prev) => ({ ...prev, [id]: image }));
    setError('');
  };

  const submit = (e) => {
    e.preventDefault();
    if (!deviceId) return setError('Bitte ein Gerät auswählen.');
    if (!date || date > todayISO()) return setError('Bitte ein Schulungsdatum angeben, das nicht in der Zukunft liegt.');
    if (!instructor.trim()) return setError('Bitte angeben, wer geschult hat.');
    if (selectedStaff.length === 0) return setError('Bitte mindestens eine geschulte Person auswählen.');
    const unsigned = selectedStaff.filter((p) => !signatures[p.id]);
    if (unsigned.length > 0) return setError('Es fehlt noch die Unterschrift von: ' + unsigned.map((p) => p.name).join(', '));

    const signed = {};
    selectedStaff.forEach((p) => { signed[p.id] = signatures[p.id]; });
    return onSave({ deviceId, date, instructor: instructor.trim(), signatures: signed });
  };

  return (
    <form onSubmit={submit} className={ui.panel + ' max-w-2xl space-y-6 p-5 sm:p-6'}>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Schulung erfassen</h2>
        <p className="text-sm text-slate-500">Für eine Person oder eine ganze Gruppe. Jede geschulte Person unterschreibt selbst.</p>
      </div>

      <div>
        <label htmlFor="gp-train-device" className={ui.label}>Gerät</label>
        <select id="gp-train-device" value={deviceId} onChange={(e) => { setDeviceId(e.target.value); setError(''); }} className={ui.input}>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>{d.model}, {d.category} ({riskText(d.risk)})</option>
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

      <fieldset>
        <legend className={ui.label}>Geschulte Mitarbeitende</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {staffList.map((p) => {
            const checked = selected.includes(p.id);
            return (
              <label key={p.id} className={'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ' + (checked ? 'border-[#17324D] bg-slate-50' : 'border-slate-300 bg-white')}>
                <input type="checkbox" checked={checked} onChange={() => togglePerson(p.id)} className="h-4 w-4 accent-[#17324D]" />
                <span className="font-medium text-slate-900">{p.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <div className={ui.label}>Unterschriften</div>
        {selectedStaff.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            Wählen Sie oben die geschulten Personen aus. Danach erscheint hier pro Person ein Unterschriftsfeld.
          </p>
        ) : (
          <div className="space-y-5">
            {selectedStaff.map((p) => {
              const isRepeat = (p.certs[deviceId] || []).length > 0;
              return (
                <div key={p.id + deviceId}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-900">{p.name}</span>
                    <span className="text-slate-500">{isRepeat ? WDH : ERST}</span>
                  </div>
                  <SignaturePad name={p.name} onChange={(image) => setSignature(p.id, image)} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">{error}</p>}

      <button type="submit" className={ui.btnPrimary + ' w-full'}>Schulung speichern</button>
    </form>
  );
}

/* ---------- 6.7 Stationsleitung: Geräteinventar ---------- */

const INVENTORY_COLS = 'md:grid md:grid-cols-[1.4fr_1.6fr_1fr_1.4fr_1fr] md:gap-4';

function InventoryTab({ devices, onSync }) {
  const [onlyMedical, setOnlyMedical] = useState(true);
  const visible = devices.filter((d) => !onlyMedical || d.risk !== NON_MEDICAL);

  return (
    <div className={ui.panel + ' overflow-hidden'}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Geräteinventar der Station</h2>
          <p className="text-sm text-slate-500">Wird mit dem Inventar der Medizinaltechnik abgeglichen.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-[40px] cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={onlyMedical} onChange={(e) => setOnlyMedical(e.target.checked)} className="h-4 w-4 accent-[#17324D]" />
            Nur Medizinprodukte
          </label>
          <button onClick={onSync} className={ui.btnSecondary}><Refresh /> Inventar synchronisieren</button>
        </div>
      </div>

      <div className={'hidden border-b border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-600 ' + INVENTORY_COLS}>
        <span>Modell</span><span>Gerätetyp</span><span>Risikoklasse</span><span>Hersteller</span><span>Wiederholung</span>
      </div>
      <ul className="divide-y divide-slate-200">
        {visible.map((d) => (
          <li key={d.id} className={'flex flex-wrap gap-x-4 gap-y-0.5 px-4 py-4 text-sm sm:px-6 md:items-center ' + INVENTORY_COLS}>
            <div className="flex w-full flex-wrap items-center gap-2 font-semibold text-slate-900">
              {d.model}
              {d.isNew && <span className="rounded-full bg-[#17324D] px-2 py-0.5 text-xs font-semibold text-white">Neu</span>}
            </div>
            <div className="w-full text-slate-600">{d.category}<span className="md:hidden">, {d.vendor}</span></div>
            <div className="text-slate-500 md:text-slate-600">{riskText(d.risk)}</div>
            <div className="hidden text-slate-600 md:block">{d.vendor}</div>
            <div className="text-slate-500 md:text-slate-600">
              {needsTraining(d) ? 'alle ' + d.interval + ' Monate' : 'keine Schulungspflicht'}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- 6.8 Stationsleitung ---------- */

const LINE_TABS = [
  { id: 'matrix', label: 'Matrix' },
  { id: 'train', label: 'Schulung erfassen' },
  { id: 'inventory', label: 'Inventar' },
];

function LineView({ deptId, staffList, deptDevices, tab, preset, onTab, onDept, onToggleAssign, onShowCert, onStartTraining, onSaveTraining, onSync }) {
  const [editMode, setEditMode] = useState(false);
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
            <p className="text-sm font-medium text-slate-500">Stationsleitung</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">{deptById(deptId).name}</h1>
            <p className="mt-1 text-sm text-slate-600">Geräte zuteilen, Schulungen erfassen und das Inventar der Station führen.</p>
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="gp-dept" className="mb-1 block text-xs font-medium text-slate-500">Abteilung</label>
            <select id="gp-dept" value={deptId} onChange={(e) => onDept(e.target.value)} className={ui.input + ' sm:w-72'}>
              {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
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
                  : 'Status antippen, um den Nachweis zu sehen oder eine fehlende Schulung zu erfassen.'}
              </p>
            </div>
            <button onClick={() => setEditMode(!editMode)} className={editMode ? ui.btnPrimary : ui.btnSecondary}>
              {editMode ? <><Check /> Zuteilung fertig</> : <><Pencil /> Zuteilung bearbeiten</>}
            </button>
          </div>
          <Matrix staffList={staffList} devices={trainDevices} editMode={editMode} onToggleAssign={onToggleAssign} onOpen={openField} />
        </div>
      )}

      {tab === 'train' && (
        <TrainingTab key={preset ? preset.key : 'leer'} devices={trainDevices} staffList={staffList} preset={preset} onSave={onSaveTraining} />
      )}

      {tab === 'inventory' && <InventoryTab devices={deptDevices} onSync={onSync} />}
    </div>
  );
}

/* ---------- 6.9 QM: Klinik-Übersicht (nur lesen) ---------- */

function QmView({ staff, devices, log, onShowCert }) {
  return (
    <div className="space-y-5">
      <div className={ui.panel + ' p-5 sm:p-6'}>
        <p className="text-sm font-medium text-slate-500">Qualitätsmanagement</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">Klinik-Übersicht</h1>
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
              <p className="mb-4 text-sm text-slate-500">{list.length} Mitarbeitende. Status antippen, um den Nachweis zu sehen.</p>
              <Progress sum={summarize(list, deptDevices)} />
            </div>
            <Matrix
              staffList={list}
              devices={deptDevices.filter(needsTraining)}
              readOnly
              onOpen={(person, device) => onShowCert(person.id, device.id)}
            />
          </section>
        );
      })}

      <section className={ui.panel + ' overflow-hidden'}>
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-slate-900">Änderungsprotokoll</h2>
          <p className="text-sm text-slate-500">Zuteilungen, Schulungen und Inventar-Abgleiche dieser Sitzung.</p>
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

/* ---------- 6.10 Schulungsnachweis (Fenster) ---------- */

function CertificateModal({ person, device, onClose, onRetrain }) {
  const records = person.certs[device.id] || [];
  const latest = records[records.length - 1];
  const earlier = records.slice(0, -1).reverse();
  const status = getStatus(device, records);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!latest) return null;

  const Field = ({ label, children }) => (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900 sm:text-right">{children}</dd>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Schulungsnachweis"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <Logo size="sm" />
          <button onClick={onClose} aria-label="Nachweis schliessen" className={FOCUS + 'flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900'}>
            <Close className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
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
          <Field label="Mitarbeitende/r">{person.name} ({person.persNo})</Field>
          <Field label="Datum der Schulung">{formatDate(latest.date)}, {latest.type}</Field>
          <Field label="Gerät">{device.category}, {device.model}</Field>
          <Field label="Risikoklasse nach MepV">{riskText(device.risk)}</Field>
          <Field label="Instruktor/in">{latest.instructor}</Field>
          <Field label="Wiederholung">alle {device.interval} Monate</Field>
        </dl>

        <div className="mt-4">
          <div className="mb-1.5 text-sm text-slate-500">Unterschrift</div>
          <div className="flex min-h-[72px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
            {latest.sigImage ? (
              <img src={latest.sigImage} alt={'Unterschrift von ' + person.name} className="h-16 max-w-full" />
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

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          {onRetrain && (
            <button onClick={onRetrain} className={ui.btnPrimary + ' sm:flex-1'}>Wiederholung erfassen</button>
          )}
          <button onClick={onClose} className={ui.btnSecondary + ' min-h-[44px] sm:flex-1'}>Schliessen</button>
        </div>
      </div>
    </div>
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

  const saveTraining = ({ deviceId, date, instructor, signatures }) => {
    const device = devices.find((d) => d.id === deviceId);
    const trainedIds = Object.keys(signatures);
    const savedAt = new Date().toISOString();

    setStaff((prev) => prev.map((p) => {
      if (!trainedIds.includes(p.id)) return p;
      const earlier = p.certs[deviceId] || [];
      const record = {
        date,
        instructor,
        type: earlier.length > 0 ? WDH : ERST,
        sigName: p.name,
        sigImage: signatures[p.id],
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

  // Simulierter Abgleich mit dem Inventar: fügt der aktuellen Abteilung ein neues Gerät hinzu.
  const syncInventory = () => {
    const existing = devices.find((d) => d.id === SYNC_DEVICE.id);
    if (existing && existing.depts.includes(deptId)) {
      notify('Das Inventar ist bereits aktuell.');
      return;
    }
    setDevices((prev) => (existing
      ? prev.map((d) => (d.id === SYNC_DEVICE.id ? { ...d, depts: [...d.depts, deptId] } : d))
      : [{ ...SYNC_DEVICE, depts: [deptId] }, ...prev]));
    addLog(actor + ': Inventar synchronisiert, ' + SYNC_DEVICE.model + ' neu aufgenommen');
    notify('Inventar synchronisiert: 1 neues Gerät.');
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

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
        {role === 'employee' && (
          <EmployeeView person={currentEmployee} staff={staff} devices={devices} onSelectStaff={setSelectedStaffId} onShowCert={showCert} />
        )}

        {role === 'line' && (
          <LineView
            key={deptId}
            deptId={deptId}
            staffList={deptStaff}
            deptDevices={deptDevices}
            tab={lineTab}
            preset={trainPreset}
            onTab={(next) => { setLineTab(next); if (next !== 'train') setTrainPreset(null); }}
            onDept={changeDept}
            onToggleAssign={toggleAssign}
            onShowCert={showCert}
            onStartTraining={startTraining}
            onSaveTraining={saveTraining}
            onSync={syncInventory}
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