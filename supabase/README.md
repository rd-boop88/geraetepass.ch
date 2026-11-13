# Datenbank der fertigen App

Dieser Ordner enthält die Datenbank für die fertige App (Supabase, Projekt
`geraetepass`, Region Zürich). Die Oberfläche liegt unter `src/fertig/`.
Die Demo (`src/App.jsx`, erreichbar unter `/demo`) braucht keine Datenbank.

## Aufbau

Eine Datenbank für alle Kunden. Jede Tabelle trägt eine `tenant_id` (die Einrichtung),
und die Datenbank selbst sorgt dafür, dass niemand Zeilen einer anderen Einrichtung
sieht oder verändert (Row Level Security).

| Tabelle | Inhalt |
| --- | --- |
| `tenants` | Einrichtungen (Kunden) mit Paket und Einrichtungscode |
| `departments` | Abteilungen und Stationen |
| `profiles` | Personen mit Rolle und Abteilung, verknüpft mit ihrem Login |
| `devices` | Gerätetypen mit Schulungsintervall |
| `department_devices` | welche Geräte in welcher Abteilung stehen |
| `assignments` | wer an welchem Gerät geschult sein muss |
| `certificates` | Schulungsnachweise, nach dem Speichern unveränderlich |
| `audit_logs` | Änderungsprotokoll, von der Datenbank selbst geschrieben |
| `reminder_settings` | Erinnerungen pro Abteilung |
| `app.profile_pins` | PINs, nur als Hash, vom Browser aus nicht erreichbar |
| `app.station_devices` | eingerichtete Stations-Tablets, Schlüssel nur als Hash |

## Rollen

| Rolle | Darf |
| --- | --- |
| `employee` | das eigene Profil, die eigenen Zuteilungen und Nachweise lesen, die eigene PIN festlegen |
| `line` | die eigene Abteilung lesen, Personen und Geräte erfassen, zuteilen, Schulungen erfassen, Start-PINs für Mitarbeitende erzeugen |
| `qm` | alles der eigenen Einrichtung lesen, nichts ändern |
| `admin` | Abteilungen und Personen der eigenen Einrichtung pflegen, Rollen vergeben, Start-PINs erzeugen |

Niemand kann Nachweise ändern oder löschen, auch der Administrator nicht.

## Anmeldung

Nur mit Einrichtungscode, Personalnummer und PIN, auf Tablet, Handy und Computer.
Es gibt keine Anmeldung per E-Mail und es werden keine E-Mails verschickt.

- **Start-PIN:** Stationsleitung oder Administrator erzeugen sie (`issue_pins()`),
  einzeln oder für alle ohne PIN, und händigen sie aus (Zettel zum Ausdrucken).
  Die PIN ist nur in diesem Moment sichtbar.
- **Eigene PIN:** Beim ersten Anmelden legt die Person ihre eigene PIN fest
  (`change_own_pin()`), vorher geht es nicht weiter.
- **Prüfung:** Die Edge Function `functions/pin-login` prüft die PIN über `verify_pin()`
  (5 Fehlversuche sperren 15 Minuten), legt beim ersten Mal das Login an und gibt einen
  einmaligen Anmelde-Schlüssel zurück. Nach 5 Minuten ohne Eingabe meldet die App ab.
- **Keine fremden Konten:** Ein Trigger auf `auth.users` lässt nur Logins zu, die die
  PIN-Anmeldung selbst anlegt. Registrierungen über die Supabase-Schnittstelle scheitern.
- **Personalnummer merken:** Auf persönlichen Geräten lässt sich die Personalnummer
  speichern, dann braucht es nur noch die PIN.
- **Stations-Tablet:** Die Stationsleitung meldet sich auf dem Tablet an und richtet es
  unter «Team» für ihre Station ein (`register_station()`). Das Tablet erhält einen
  zufälligen Schlüssel und zeigt danach beim Anmelden die Namen der Station mit PIN
  (`station_team()`, ohne Personalnummern). Name antippen, PIN eingeben
  (`verify_pin_station()`). Verlorene Tablets entfernt man unter «Team».
- **PIN vergessen oder gesperrt:** neue Start-PIN erzeugen. **Austritt:** Person
  deaktivieren, die Anmeldung ist sofort gesperrt.

## Neue Einrichtung anlegen

Nur mit Service-Zugang (SQL-Editor in Supabase), nicht aus der App:

```sql
select * from public.create_tenant('Spital Muster AG', 'spital-muster', 'Vorname Name', 'Personalnummer');
```

Das Ergebnis enthält die Start-PIN des ersten Administrators. Er meldet sich mit dem
Einrichtungscode, seiner Personalnummer und dieser PIN an, legt seine eigene PIN fest
und erfasst danach Abteilungen, Stationsleitungen und Rollen.

## Prüfen

`tests/run.sh` spielt alles in eine leere PostgreSQL-Datenbank ein und prüft die
Zugriffsregeln mit zwei Test-Einrichtungen (212 Prüfungen). Nie gegen die echte
Datenbank laufen lassen, die Prüfungen legen Testdaten an.

```
createdb gp_test
supabase/tests/run.sh "postgresql://postgres@localhost:5432/gp_test"
```

Stand 13.11.2026: Alle Migrationen sind im Supabase-Projekt eingespielt. PIN-Anmeldung
(mit Personalnummer und am Stations-Tablet) und die Sperre für fremde Konten wurden
mit Wegwerf-Daten gegen das echte Projekt getestet.

Jede Änderung an den Zugriffsregeln braucht eine neue Datei unter `migrations/`
und einen grünen Lauf dieser Prüfungen.
