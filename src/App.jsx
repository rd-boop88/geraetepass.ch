import React, { useState } from 'react';

// Eingebaute Icons (Kein Zusatzpaket / kein lucide-react nötig!)
const Icon = ({ children, className = 'w-4 h-4' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

const Shield = (p) => <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Icon>;
const CheckCircle2 = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></Icon>;
const AlertTriangle = (p) => <Icon {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></Icon>;
const XCircle = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></Icon>;
const FileSpreadsheet = (p) => <Icon {...p}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/></Icon>;
const Users = (p) => <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>;
const Building2 = (p) => <Icon {...p}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></Icon>;
const Lock = (p) => <Icon {...p}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>;
const LogOut = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></Icon>;
const Check = (p) => <Icon {...p}><polyline points="20 6 9 17 4 12"/></Icon>;
const Award = (p) => <Icon {...p}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></Icon>;
const ChevronRight = (p) => <Icon {...p}><path d="m9 18 6-6-6-6"/></Icon>;
const UserCheck = (p) => <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></Icon>;
const Settings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>;

const INITIAL_DEVICES = [
  { id: 'd1', category: 'Langzeitbeatmungsgerät', model: 'VentPro 5000', risk: 'IIb', interval: 12, vendor: 'MedTech Systems AG', core: true },
  { id: 'd2', category: 'Langzeitbeatmungsgerät', model: 'VentPro Compact', risk: 'IIb', interval: 12, vendor: 'MedTech Systems AG', core: true, autoFilled: true },
  { id: 'd3', category: 'Infusionspumpe (volumetrisch)', model: 'InfusoMax V2', risk: 'IIb', interval: 24, vendor: 'SwissMed Solutions', core: true },
  { id: 'd4', category: 'Infusionsspritzenpumpe', model: 'SyringeFlow Pro', risk: 'IIb', interval: 24, vendor: 'SwissMed Solutions', core: true },
  { id: 'd5', category: 'Defibrillator (mit Monitor)', model: 'CardioShock Pro', risk: 'IIb', interval: 12, vendor: 'LifeCare Corp.', core: true },
  { id: 'd6', category: 'Hämodialysegerät', model: 'RenalClear Ultra', risk: 'IIb', interval: 12, vendor: 'BioFilter GmbH', core: true },
  { id: 'd7', category: 'Aktiver Atemgasbefeuchter', model: 'HumidAir Duo', risk: 'IIa', interval: 24, vendor: 'AeroMed AG', core: true },
  { id: 'd8', category: 'Blutgasanalyse-System', model: 'HemoScan Flex', risk: 'IIb', interval: 24, vendor: 'LabDiagnostik AG', core: true },
  { id: 'd9', category: 'Patientenmonitor', model: 'VitalView 1000', risk: 'IIa', interval: 24, vendor: 'GlobalHealth Tech', core: true },
  { id: 'd10', category: 'Thoraxdrainagegerät', model: 'ThoraxDrain Digital', risk: 'IIa', interval: 24, vendor: 'CarePump AG', core: false },
  { id: 'd11', category: 'Wärmetherapiegerät', model: 'ThermoBlanket Plus', risk: 'IIa', interval: 36, vendor: 'TempControl Medical', core: false },
  { id: 'd12', category: 'Ohr-Infrarot-Thermometer', model: 'TempScan 600', risk: 'I', interval: 36, vendor: 'BasicMed AG', core: false },
  { id: 'd13', category: 'Medikamentenkühlschrank', model: 'CoolStore Med 120', risk: 'kein Medizinprodukt', interval: 0, vendor: 'KlimaTech AG', core: false }
];

const INITIAL_STAFF = [
  {
    id: 's1', name: 'Sarah Meier', role: 'Dipl. Expertin Intensivpflege NDS', persNo: 'MA-4821', dept: 'Abteilung A - Intensivpflege',
    assigned: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9'],
    certs: {
      d1: { date: '2026-02-15', instructor: 'M. Keller (Berufsbildner)', status: 'valid', type: 'Erstschulung', sig: 'Sarah Meier' },
      d2: { date: '2026-02-15', instructor: 'M. Keller (Berufsbildner)', status: 'valid', type: 'Erstschulung', sig: 'Sarah Meier' },
      d3: { date: '2025-09-10', instructor: 'T. Baumann (Hersteller)', status: 'valid', type: 'Wiederholung', sig: 'Sarah Meier' },
      d4: { date: '2025-09-10', instructor: 'T. Baumann (Hersteller)', status: 'valid', type: 'Wiederholung', sig: 'Sarah Meier' },
      d5: { date: '2025-04-01', instructor: 'Dr. L. Weber', status: 'due', type: 'Wiederholung', sig: 'Sarah Meier' },
      d7: { date: '2026-01-20', instructor: 'M. Keller (Berufsbildner)', status: 'valid', type: 'Erstschulung', sig: 'Sarah Meier' },
      d8: { date: '2026-03-05', instructor: 'Labortechnik-Team', status: 'valid', type: 'Erstschulung', sig: 'Sarah Meier' },
      d9: { date: '2026-01-12', instructor: 'M. Keller (Berufsbildner)', status: 'valid', type: 'Erstschulung', sig: 'Sarah Meier' }
    }
  },
  {
    id: 's2', name: 'Lucas Brunner', role: 'Dipl. Pflegefachmann HF', persNo: 'MA-5104', dept: 'Abteilung A - Intensivpflege',
    assigned: ['d1', 'd3', 'd4', 'd5', 'd7', 'd9'],
    certs: {
      d1: { date: '2026-01-18', instructor: 'M. Keller (Berufsbildner)', status: 'valid', type: 'Erstschulung', sig: 'L. Brunner' },
      d3: { date: '2026-01-18', instructor: 'M. Keller (Berufsbildner)', status: 'valid', type: 'Erstschulung', sig: 'L. Brunner' },
      d4: { date: '2026-01-18', instructor: 'M. Keller (Berufsbildner)', status: 'valid', type: 'Erstschulung', sig: 'L. Brunner' },
      d7: { date: '2025-03-25', instructor: 'M. Keller (Berufsbildner)', status: 'due', type: 'Erstschulung', sig: 'L. Brunner' },
      d9: { date: '2026-02-02', instructor: 'M. Keller (Berufsbildner)', status: 'valid', type: 'Erstschulung', sig: 'L. Brunner' }
    }
  },
  {
    id: 's3', name: 'Nadine Widmer', role: 'Pool-Mitarbeiterin / Temporär', persNo: 'TMP-902', dept: 'Abteilung A - Intensivpflege',
    assigned: ['d1', 'd3', 'd4', 'd5', 'd9'],
    certs: {
      d3: { date: '2026-03-01', instructor: 'M. Keller (Berufsbildner)', status: 'valid', type: 'Erstschulung', sig: 'N. Widmer' },
      d4: { date: '2026-03-01', instructor: 'M. Keller (Berufsbildner)', status: 'valid', type: 'Erstschulung', sig: 'N. Widmer' },
      d9: { date: '2026-03-01', instructor: 'M. Keller (Berufsbildner)', status: 'valid', type: 'Erstschulung', sig: 'N. Widmer' }
    }
  },
  {
    id: 's4', name: 'Elena Rossi', role: 'Dipl. Pflegefachfrau HF', persNo: 'MA-3390', dept: 'Abteilung B - Bettenstation',
    assigned: ['d3', 'd5', 'd9', 'd11', 'd12'],
    certs: {
      d3: { date: '2026-02-11', instructor: 'S. Vogt (Stationsleitung)', status: 'valid', type: 'Wiederholung', sig: 'E. Rossi' },
      d5: { date: '2026-02-11', instructor: 'S. Vogt (Stationsleitung)', status: 'valid', type: 'Wiederholung', sig: 'E. Rossi' },
      d9: { date: '2026-01-15', instructor: 'S. Vogt (Stationsleitung)', status: 'valid', type: 'Erstschulung', sig: 'E. Rossi' },
      d11: { date: '2025-11-20', instructor: 'S. Vogt (Stationsleitung)', status: 'valid', type: 'Erstschulung', sig: 'E. Rossi' },
      d12: { date: '2025-11-20', instructor: 'S. Vogt (Stationsleitung)', status: 'valid', type: 'Erstschulung', sig: 'E. Rossi' }
    }
  }
];

function MedPassLogo({ size }) {
  const isLarge = size === 'lg';
  return (
    <div className="flex items-center gap-3 select-none">
      <div className={(isLarge ? 'w-12 h-12 ' : 'w-9 h-9 ') + 'relative flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-slate-900 text-white shadow-md'}>
        <Check className={isLarge ? 'w-7 h-7' : 'w-5 h-5'} />
      </div>
      <div>
        <div className={(isLarge ? 'text-2xl ' : 'text-lg ') + 'font-extrabold tracking-tight leading-none'}>
          <span className="text-slate-900">geräte</span>
          <span className="text-teal-600">pass</span>
          <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 align-middle">.ch</span>
        </div>
        <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mt-0.5">
          Swiss MedTech Documentation
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('s1');
  const [selectedDept, setSelectedDept] = useState('Abteilung A - Intensivpflege');
  const [lineTab, setLineTab] = useState('matrix');
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [staff, setStaff] = useState(INITIAL_STAFF);
  const [hideNonMed, setHideNonMed] = useState(true);
  const [editAssignmentMode, setEditAssignmentMode] = useState(false);
  const [auditModal, setAuditModal] = useState(null);
  const [toast, setToast] = useState(null);

  const [trainDeviceId, setTrainDeviceId] = useState('d5');
  const [trainStaffIds, setTrainStaffIds] = useState(['s1', 's3']);
  const [trainInstructor, setTrainInstructor] = useState('M. Keller (Berufsbildner / Linie)');
  const [trainType, setTrainType] = useState('Wiederholungsschulung');
  const [sigText, setSigText] = useState('Digital signiert via Touchpad');

  const showNotice = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const visibleDevices = devices.filter(d => !hideNonMed || d.risk !== 'kein Medizinprodukt');
  const deptStaff = staff.filter(s => s.dept === selectedDept);
  const currentEmployee = staff.find(s => s.id === selectedStaffId) || staff[0];

  const calcCompliance = (staffList) => {
    let total = 0;
    let valid = 0;
    staffList.forEach(p => {
      p.assigned.forEach(dId => {
        total += 1;
        if (p.certs[dId] && p.certs[dId].status === 'valid') valid += 1;
      });
    });
    return total === 0 ? 100 : Math.round((valid / total) * 100);
  };

  const toggleAssign = (personId, devId) => {
    setStaff(prev => prev.map(p => {
      if (p.id !== personId) return p;
      const exists = p.assigned.includes(devId);
      const nextAssigned = exists ? p.assigned.filter(x => x !== devId) : [...p.assigned, devId];
      return { ...p, assigned: nextAssigned };
    }));
  };

  const handleCompleteTraining = (e) => {
    e.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    setStaff(prev => prev.map(p => {
      if (!trainStaffIds.includes(p.id)) return p;
      const nextAssigned = p.assigned.includes(trainDeviceId) ? p.assigned : [...p.assigned, trainDeviceId];
      return {
        ...p,
        assigned: nextAssigned,
        certs: {
          ...p.certs,
          [trainDeviceId]: {
            date: today,
            instructor: trainInstructor,
            status: 'valid',
            type: trainType,
            sig: p.name + ' (' + sigText + ')'
          }
        }
      };
    }));
    showNotice('Schulung & elektronische Unterschrift nach MepV gespeichert!');
    setLineTab('matrix');
  };

  const handleImportExcel = () => {
    const exists = devices.some(d => d.id === 'd_new');
    if (exists) {
      showNotice('Inventarliste ist bereits auf dem aktuellsten Stand.');
      return;
    }
    const imported = {
      id: 'd_new',
      category: 'Notfallbeatmungsgerät',
      model: 'OxyMobile 3000 (Import)',
      risk: 'IIb',
      interval: 12,
      vendor: 'MedTech Systems AG',
      core: true
    };
    setDevices(prev => [imported, ...prev]);
    showNotice('Medizinaltechnik-Inventarliste synchronisiert (+1 Gerät importiert).');
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-slate-800">
        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <MedPassLogo size="lg" />
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Shield className="w-3.5 h-3.5" /> MepV & Swissmedic Konform
              </span>
              <div className="text-xs text-slate-400 mt-1">Mandant: Musterklinik Schweiz AG (Demo)</div>
            </div>
          </div>

          <div className="my-6">
            <h1 className="text-xl font-bold text-slate-900">Digitaler Gerätepass – Rollenbasiertes Demo-Login</h1>
            <p className="text-sm text-slate-500 mt-1">
              Wählen Sie eine Rolle für die Vorführung. Im Klinikbetrieb erfolgt die Zuweisung automatisch über das persönliche Mitarbeiter-Login.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="border-2 border-slate-200 hover:border-teal-500 rounded-xl p-5 flex flex-col justify-between transition bg-slate-50/50">
              <div>
                <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-teal-700">1. Mitarbeitende</div>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">Mein Gerätepass</h2>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Sieht aus Datenschutzgründen ausschliesslich das eigene Profil, zugeteilte Stationsgeräte und eigene Zertifikate.
                </p>
                <div className="mt-4">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Person auswählen:</label>
                  <select
                    value={selectedStaffId}
                    onChange={e => setSelectedStaffId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.dept.split(' - ')[1]})</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => setRole('employee')}
                className="mt-5 w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow flex items-center justify-center gap-1.5"
              >
                Als Mitarbeitende starten <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="border-2 border-slate-900 rounded-xl p-5 flex flex-col justify-between bg-white shadow-md relative">
              <span className="absolute -top-2.5 right-4 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Hauptansicht Linie
              </span>
              <div>
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">2. Vorgesetzte / Linie</div>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">Stationsleitung</h2>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Operative Verantwortung in der Linie: Definiert wer welches Gerät benötigt (Soll-Zuteilung), signiert Schulungen & pflegt das Stations-Inventar.
                </p>
              </div>
              <button
                onClick={() => setRole('line')}
                className="mt-5 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow flex items-center justify-center gap-1.5"
              >
                Als Stationsleitung starten <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="border-2 border-slate-200 hover:border-indigo-500 rounded-xl p-5 flex flex-col justify-between transition bg-slate-50/50">
              <div>
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">3. Qualitätsmanagement</div>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">QM Klinik-Übersicht</h2>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Übergeordnete Read-Only-Gesamtübersicht über alle Abteilungen für Swissmedic- & ISO-Audits inkl. 5-Pflichtfelder-Nachweis.
                </p>
              </div>
              <button
                onClick={() => setRole('qm')}
                className="mt-5 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow flex items-center justify-center gap-1.5"
              >
                Als QM-Aufsicht starten <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <MedPassLogo size="sm" />
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 border-l border-slate-200 pl-4">
            <Lock className="w-3.5 h-3.5 text-teal-600" />
            <span>Aktive Rolle:</span>
            <strong className="text-slate-900">
              {role === 'employee' && ('Mitarbeitende (' + currentEmployee.name + ')')}
              {role === 'line' && ('Vorgesetzte / Linie (' + selectedDept + ')')}
              {role === 'qm' && 'Qualitätsmanagement (Gesamtklinik)'}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRole('employee')}
            className={(role === 'employee' ? 'bg-teal-600 text-white ' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 ') + 'text-xs font-semibold px-3 py-1.5 rounded-lg transition'}
          >
            1. Mitarbeitende
          </button>
          <button
            onClick={() => setRole('line')}
            className={(role === 'line' ? 'bg-slate-900 text-white ' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 ') + 'text-xs font-semibold px-3 py-1.5 rounded-lg transition'}
          >
            2. Linie / Vorgesetzte
          </button>
          <button
            onClick={() => setRole('qm')}
            className={(role === 'qm' ? 'bg-indigo-600 text-white ' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 ') + 'text-xs font-semibold px-3 py-1.5 rounded-lg transition'}
          >
            3. QM-Übersicht
          </button>
          <button
            onClick={() => setRole(null)}
            className="ml-2 text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200"
          >
            <LogOut className="w-3.5 h-3.5" /> Login
          </button>
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400" /> {toast}
        </div>
      )}

      <main className="max-w-7xl w-full mx-auto p-6 flex-1">
        {role === 'employee' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase text-teal-700 bg-teal-50 px-2.5 py-1 rounded">
                  Persönlicher Gerätepass (Nur eigene Ansicht)
                </span>
                <h1 className="text-2xl font-bold text-slate-900 mt-2">{currentEmployee.name}</h1>
                <p className="text-xs text-slate-500">
                  {currentEmployee.role} • Personal-Nr. {currentEmployee.persNo} • {currentEmployee.dept}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-slate-500">Mein Erfüllungsgrad</div>
                  <div className="text-2xl font-extrabold text-teal-600">{calcCompliance([currentEmployee])}%</div>
                </div>
                <select
                  value={selectedStaffId}
                  onChange={e => setSelectedStaffId(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                >
                  {staff.map(s => <option key={s.id} value={s.id}>Demo-Wechsel: {s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-sm text-slate-900">
                  Meine zugeteilten Stationsgeräte ({currentEmployee.assigned.length} Geräte durch Stationsleitung definiert)
                </h2>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <th className="py-3 px-4">Anlagenbezeichnung</th>
                    <th className="py-3 px-4">Typ / Modell</th>
                    <th className="py-3 px-4">MepV-Risikoklasse</th>
                    <th className="py-3 px-4">Intervall</th>
                    <th className="py-3 px-4">Schulungs-Status</th>
                    <th className="py-3 px-4 text-right">Nachweis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentEmployee.assigned.map(dId => {
                    const dev = devices.find(d => d.id === dId);
                    if (!dev) return null;
                    const cert = currentEmployee.certs[dId];
                    return (
                      <tr key={dId} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-900">{dev.category}</td>
                        <td className="py-3 px-4">{dev.model} <span className="text-slate-400">({dev.vendor})</span></td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">Klasse {dev.risk}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">alle {dev.interval} Mt.</td>
                        <td className="py-3 px-4">
                          {cert && cert.status === 'valid' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Gültig ({cert.date})
                            </span>
                          )}
                          {cert && cert.status === 'due' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" /> Wiederholung fällig
                            </span>
                          )}
                          {!cert && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-semibold">
                              <XCircle className="w-3.5 h-3.5" /> Schulung ausstehend
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {cert ? (
                            <button
                              onClick={() => setAuditModal({ person: currentEmployee, device: dev, cert })}
                              className="text-teal-600 hover:underline font-semibold inline-flex items-center gap-1"
                            >
                              <Award className="w-3.5 h-3.5" /> Zertifikat
                            </button>
                          ) : (
                            <span className="text-slate-400">–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {role === 'line' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                  Operative Steuerung in der Linie (Stationsleitung)
                </span>
                <h1 className="text-2xl font-bold text-slate-900 mt-2">{selectedDept}</h1>
                <p className="text-xs text-slate-500">
                  Verantwortlich für Geräte-Zuteilung pro Mitarbeiter, Schulungsdurchführung & Abteilungs-Inventarliste.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-semibold"
                >
                  <option value="Abteilung A - Intensivpflege">Abteilung A - Intensivpflege</option>
                  <option value="Abteilung B - Bettenstation">Abteilung B - Bettenstation</option>
                </select>
                <div className="bg-teal-50 border border-teal-200 px-4 py-2 rounded-xl text-right">
                  <div className="text-[11px] text-teal-800 font-semibold">Abteilungs-Quote</div>
                  <div className="text-xl font-extrabold text-teal-700">{calcCompliance(deptStaff)}%</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              <button
                onClick={() => setLineTab('matrix')}
                className={(lineTab === 'matrix' ? 'bg-slate-900 text-white ' : 'bg-white text-slate-700 border border-slate-200 ') + 'px-4 py-2 rounded-lg text-xs font-bold transition'}
              >
                A. Abteilungs-Matrix & Soll-Zuteilung
              </button>
              <button
                onClick={() => setLineTab('train')}
                className={(lineTab === 'train' ? 'bg-slate-900 text-white ' : 'bg-white text-slate-700 border border-slate-200 ') + 'px-4 py-2 rounded-lg text-xs font-bold transition'}
              >
                B. Schulung durchführen & digital signieren
              </button>
              <button
                onClick={() => setLineTab('inventory')}
                className={(lineTab === 'inventory' ? 'bg-slate-900 text-white ' : 'bg-white text-slate-700 border border-slate-200 ') + 'px-4 py-2 rounded-lg text-xs font-bold transition'}
              >
                C. Stations-Inventarliste (Medizinaltechnik)
              </button>
            </div>

            {lineTab === 'matrix' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Schulungs- & Zuteilungs-Matrix ({selectedDept})</h3>
                    <p className="text-xs text-slate-500">
                      Klicken Sie auf ein grünes Feld für den 5-Pflichtfelder-Nachweis oder schalten Sie den Zuteilungs-Modus ein.
                    </p>
                  </div>
                  <button
                    onClick={() => setEditAssignmentMode(!editAssignmentMode)}
                    className={(editAssignmentMode ? 'bg-amber-500 text-white ' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 ') + 'px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition'}
                  >
                    <Settings className="w-4 h-4" />
                    {editAssignmentMode ? 'Soll-Zuteilung abschliessen' : 'Definieren, wer welches Gerät benötigt (Zuteilung)'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="py-3 px-4 min-w-[180px]">Mitarbeitende</th>
                        {visibleDevices.slice(0, 8).map(d => (
                          <th key={d.id} className="py-3 px-3 text-center min-w-[120px]">
                            <div className="font-bold text-slate-900 truncate">{d.model}</div>
                            <div className="text-[10px] text-slate-400 font-normal truncate">{d.category}</div>
                            <span className="inline-block mt-1 px-1.5 py-0.2 bg-slate-200/70 rounded text-[10px] font-bold">
                              Kl. {d.risk}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deptStaff.map(person => (
                        <tr key={person.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {person.name}
                            <div className="text-[10px] text-slate-400 font-normal">{person.role}</div>
                          </td>
                          {visibleDevices.slice(0, 8).map(dev => {
                            const isAssigned = person.assigned.includes(dev.id);
                            const cert = person.certs[dev.id];

                            if (editAssignmentMode) {
                              return (
                                <td key={dev.id} className="py-3 px-3 text-center">
                                  <button
                                    onClick={() => toggleAssign(person.id, dev.id)}
                                    className={(isAssigned ? 'bg-teal-600 text-white ' : 'bg-slate-100 text-slate-400 ') + 'px-2.5 py-1.5 rounded-lg text-xs font-bold w-full transition'}
                                  >
                                    {isAssigned ? '✓ Zugeteilt' : '+ Zuteilen'}
                                  </button>
                                </td>
                              );
                            }

                            if (!isAssigned) {
                              return (
                                <td key={dev.id} className="py-3 px-3 text-center text-slate-300 bg-slate-50/40">
                                  Nicht benötigt
                                </td>
                              );
                            }

                            return (
                              <td key={dev.id} className="py-3 px-3 text-center">
                                {cert && cert.status === 'valid' && (
                                  <button
                                    onClick={() => setAuditModal({ person, device: dev, cert })}
                                    className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold hover:bg-emerald-100 w-full"
                                  >
                                    ✓ Gültig
                                  </button>
                                )}
                                {cert && cert.status === 'due' && (
                                  <button
                                    onClick={() => { setTrainDeviceId(dev.id); setTrainStaffIds([person.id]); setLineTab('train'); }}
                                    className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold hover:bg-amber-100 w-full"
                                  >
                                    ↻ Fällig
                                  </button>
                                )}
                                {!cert && (
                                  <button
                                    onClick={() => { setTrainDeviceId(dev.id); setTrainStaffIds([person.id]); setLineTab('train'); }}
                                    className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100 w-full"
                                  >
                                    ! Fehlt
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {lineTab === 'train' && (
              <form onSubmit={handleCompleteTraining} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5 max-w-2xl">
                <h3 className="text-base font-bold text-slate-900">
                  Gruppen- oder Einzelschulung protokollieren (inkl. 5 Pflichtfelder)
                </h3>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">1. Gerät aus Stations-Inventar:</label>
                    <select
                      value={trainDeviceId}
                      onChange={e => setTrainDeviceId(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
                    >
                      {visibleDevices.map(d => (
                        <option key={d.id} value={d.id}>{d.model} – {d.category} (Kl. {d.risk})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">2. Schulungsart:</label>
                    <select
                      value={trainType}
                      onChange={e => setTrainType(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
                    >
                      <option value="Erstschulung">Erstschulung</option>
                      <option value="Wiederholungsschulung">Wiederholungsschulung (Re-Zertifizierung)</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs">
                  <label className="font-bold text-slate-700 block mb-1">3. Name des Instruktors / Ausbilders:</label>
                  <input
                    type="text"
                    value={trainInstructor}
                    onChange={e => setTrainInstructor(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5"
                  />
                </div>

                <div className="text-xs">
                  <label className="font-bold text-slate-700 block mb-1">4. Geschulte Mitarbeitende auswählen:</label>
                  <div className="grid sm:grid-cols-2 gap-2 mt-1">
                    {deptStaff.map(p => {
                      const checked = trainStaffIds.includes(p.id);
                      return (
                        <label key={p.id} className={(checked ? 'border-teal-600 bg-teal-50/50 ' : 'border-slate-200 ') + 'border rounded-lg p-2.5 flex items-center gap-2 cursor-pointer'}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setTrainStaffIds(prev => checked ? prev.filter(x => x !== p.id) : [...prev, p.id]);
                            }}
                          />
                          <span className="font-semibold">{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="text-xs">
                  <label className="font-bold text-slate-700 block mb-1">5. Elektronische Unterschrift (Bestätigung auf Tablet/Touchscreen):</label>
                  <input
                    type="text"
                    value={sigText}
                    onChange={e => setSigText(e.target.value)}
                    className="w-full border-2 border-dashed border-teal-400 rounded-xl p-4 bg-teal-50/30 font-serif italic text-base text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow"
                >
                  Einweisung rechtsgültig speichern & Gerätepass aktualisieren
                </button>
              </form>
            )}

            {lineTab === 'inventory' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Stations-Inventarliste der Medizinaltechnik (4-Spalten-Struktur)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Wird durch die Medizinaltechnik bereitgestellt und per 1-Klick-Excel-Import synchronisiert.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs flex items-center gap-1.5 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-lg">
                      <input
                        type="checkbox"
                        checked={hideNonMed}
                        onChange={e => setHideNonMed(e.target.checked)}
                      />
                      <span>"kein Medizinprodukt" ausblenden</span>
                    </label>
                    <button
                      onClick={handleImportExcel}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Excel-Inventarliste importieren
                    </button>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <th className="py-3 px-4">1. Anlagenbezeichnung</th>
                      <th className="py-3 px-4">2. Typ / Modell</th>
                      <th className="py-3 px-4">3. MepV-Risikoklasse</th>
                      <th className="py-3 px-4">4. Hersteller</th>
                      <th className="py-3 px-4">Wiederholungs-Intervall</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleDevices.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {d.category}
                          {d.autoFilled && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                              Auto-Fill ↑
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{d.model}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">{d.risk}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{d.vendor}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {d.interval > 0 ? ('alle ' + d.interval + ' Monate') : 'Keine Pflicht'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {role === 'qm' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded">
                  Qualitätsmanagement & Audit-Cockpit (Read-Only Gesamtklinik)
                </span>
                <h1 className="text-2xl font-bold text-slate-900 mt-2">Klinikweite MepV-Compliance</h1>
                <p className="text-xs text-slate-500">
                  Übergeordnete Aufsicht über alle Abteilungen. Die operative Pflege liegt bei den Stationsleitungen.
                </p>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 px-5 py-3 rounded-xl text-right">
                <div className="text-xs text-indigo-800 font-semibold">Gesamt-Klinikquote</div>
                <div className="text-2xl font-extrabold text-indigo-700">{calcCompliance(staff)}%</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {['Abteilung A - Intensivpflege', 'Abteilung B - Bettenstation'].map(deptName => {
                const list = staff.filter(s => s.dept === deptName);
                const quote = calcCompliance(list);
                return (
                  <div key={deptName} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{deptName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{list.length} Mitarbeitende erfasst</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-extrabold text-teal-600">{quote}%</span>
                      <div className="text-[10px] text-slate-400">MepV-konform</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {auditModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <MedPassLogo size="sm" />
              <button
                onClick={() => setAuditModal(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                ✕ Schliessen
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 text-xs border border-slate-200">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Offizieller Schulungsnachweis (5 QM-Pflichtfelder gemäss MepV)
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Mitarbeitende/r:</span>
                <strong className="text-slate-900">{auditModal.person.name} ({auditModal.person.persNo})</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">1. Datum der Schulung:</span>
                <strong className="text-slate-900">{auditModal.cert.date} ({auditModal.cert.type})</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">2. Gerätetyp & Modell:</span>
                <strong className="text-slate-900">{auditModal.device.category} – {auditModal.device.model}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">3. Risikoklassifikation:</span>
                <strong className="text-teal-700">MepV Risikoklasse {auditModal.device.risk}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">4. Name des Instruktors:</span>
                <strong className="text-slate-900">{auditModal.cert.instructor}</strong>
              </div>
              <div className="pt-2">
                <span className="text-slate-500 block mb-1">5. Elektronische Original-Unterschrift:</span>
                <div className="p-3 bg-white border border-slate-300 rounded-lg font-serif italic text-base text-slate-800">
                  {auditModal.cert.sig}
                </div>
              </div>
            </div>

            <button
              onClick={() => setAuditModal(null)}
              className="w-full py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
            >
              Nachweis schliessen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
