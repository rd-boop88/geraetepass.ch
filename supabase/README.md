# Datenbank der fertigen App

Dieser Ordner enthält die Datenbank für die fertige App (Supabase, Region Zürich).
Die Demo unter `src/` braucht ihn nicht und bleibt unverändert.

## Aufbau

Eine Datenbank für alle Kunden. Jede Tabelle trägt eine `tenant_id` (die Einrichtung),
und die Datenbank selbst sorgt dafür, dass niemand Zeilen einer anderen Einrichtung
sieht oder verändert (Row Level Security).

| Tabelle | Inhalt |
| --- | --- |
| `tenants` | Einrichtungen (Kunden) mit Paket |
| `departments` | Abteilungen und Stationen |
| `profiles` | Personen mit Rolle und Abteilung, verknüpft mit ihrem Login |
| `devices` | Gerätetypen mit Schulungsintervall |
| `department_devices` | welche Geräte in welcher Abteilung stehen |
| `assignments` | wer an welchem Gerät geschult sein muss |
| `certificates` | Schulungsnachweise, nach dem Speichern unveränderlich |
| `audit_logs` | Änderungsprotokoll, von der Datenbank selbst geschrieben |
| `reminder_settings` | Erinnerungen pro Abteilung |

## Rollen

| Rolle | Darf |
| --- | --- |
| `employee` | das eigene Profil, die eigenen Zuteilungen und Nachweise lesen |
| `line` | die eigene Abteilung lesen, Personen und Geräte erfassen, zuteilen, Schulungen erfassen |
| `qm` | alles der eigenen Einrichtung lesen, nichts ändern |
| `admin` | Abteilungen und Personen der eigenen Einrichtung pflegen, Rollen vergeben |

Niemand kann Nachweise ändern oder löschen, auch der Administrator nicht.

## Prüfen

`tests/run.sh` spielt alles in eine leere PostgreSQL-Datenbank ein und prüft die
Zugriffsregeln mit zwei Test-Einrichtungen (135 Prüfungen). Nie gegen die echte
Datenbank laufen lassen, die Prüfungen legen Testdaten an.

```
createdb gp_test
supabase/tests/run.sh "postgresql://postgres@localhost:5432/gp_test"
```

Jede Änderung an den Zugriffsregeln braucht eine neue Datei unter `migrations/`
und einen grünen Lauf dieser Prüfungen.
