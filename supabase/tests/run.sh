#!/usr/bin/env bash
# Spielt Umgebung, Migrationen, Testdaten und Prüfungen in eine LEERE Datenbank ein.
# Aufruf:  supabase/tests/run.sh "postgresql://benutzer@localhost:5432/leere_datenbank"
# Nie gegen die echte Datenbank laufen lassen: Die Prüfungen legen Testdaten an.
set -euo pipefail
DB="${1:?Verbindung zu einer leeren Datenbank angeben}"
HERE="$(cd "$(dirname "$0")" && pwd)"
run() { psql "$DB" -v ON_ERROR_STOP=1 -q -X -f "$1" > /dev/null; }

run "$HERE/00_supabase_umgebung.sql"
for f in "$HERE"/../migrations/*.sql; do run "$f"; done
run "$HERE/01_testdaten.sql"
run "$HERE/02_pruefungen.sql"

psql "$DB" -X -q -t -A -c "select case when ok then 'OK      ' else 'FEHLER  ' end || label || case when ok then '' else '  [' || coalesce(detail, '') || ']' end from test.results order by nr"
psql "$DB" -X -q -t -A -c "select count(*) || ' Prüfungen, ' || count(*) filter (where not ok) || ' fehlgeschlagen' from test.results"
test "$(psql "$DB" -X -q -t -A -c "select count(*) from test.results where not ok")" = "0"
