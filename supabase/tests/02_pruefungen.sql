-- Prüfungen der Zugriffsregeln. Jede Zeile meldet sich als eine Person an und
-- versucht etwas. Das Ergebnis landet in test.results; am Schluss bricht das
-- Skript ab, wenn eine Prüfung fehlgeschlagen ist.

-- ---------- Werkzeuge ----------

-- Anmelden als Person (Schlüssel aus den Testdaten) oder als nicht angemeldeter Besucher
create function test.login(p_key text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', test.u(p_key), 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end
$$;
create function test.login_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', false);
  execute 'set role anon';
end
$$;

create function test.note(p_ok boolean, p_label text, p_detail text) returns void language sql as $$
  insert into test.results (ok, label, detail) values (p_ok, p_label, p_detail)
$$;

-- Die Abfrage liefert genau diese Anzahl
create function test.count_is(p_sql text, p_expected bigint, p_label text) returns void language plpgsql as $$
declare v bigint;
begin
  execute p_sql into v;
  perform test.note(v = p_expected, p_label, 'erwartet ' || p_expected || ', erhalten ' || coalesce(v::text, 'nichts'));
exception when others then
  perform test.note(false, p_label, 'Fehler: ' || sqlerrm);
end
$$;

-- Die Abfrage liefert nichts: entweder 0 Zeilen oder "keine Berechtigung"
create function test.sees_nothing(p_sql text, p_label text) returns void language plpgsql as $$
declare v bigint;
begin
  execute p_sql into v;
  perform test.note(v = 0, p_label, 'erhalten ' || v);
exception when others then
  perform test.note(true, p_label, 'abgelehnt: ' || sqlerrm);
end
$$;

-- Die Änderung gelingt und betrifft genau so viele Zeilen
create function test.works(p_sql text, p_rows bigint, p_label text) returns void language plpgsql as $$
declare v bigint;
begin
  execute p_sql;
  get diagnostics v = row_count;
  perform test.note(v = p_rows, p_label, 'erwartet ' || p_rows || ' Zeilen, betroffen ' || v);
exception when others then
  perform test.note(false, p_label, 'Fehler: ' || sqlerrm);
end
$$;

-- Die Änderung wird verhindert: Fehler oder 0 betroffene Zeilen
create function test.blocked(p_sql text, p_label text) returns void language plpgsql as $$
declare v bigint;
begin
  execute p_sql;
  get diagnostics v = row_count;
  perform test.note(v = 0, p_label, case when v = 0 then 'keine Zeile betroffen' else 'NICHT verhindert: ' || v || ' Zeilen betroffen' end);
exception when others then
  perform test.note(true, p_label, 'abgelehnt: ' || sqlerrm);
end
$$;

-- Sieht die angemeldete Person irgendwo eine Zeile der Einrichtung p_other?
create function test.no_rows_of(p_other text, p_label text) returns void language plpgsql as $$
declare
  t text;
  v bigint;
  v_total bigint := 0;
  v_where text := '';
begin
  foreach t in array array['departments', 'profiles', 'devices', 'department_devices', 'assignments', 'certificates', 'audit_logs', 'reminder_settings', 'training_status'] loop
    execute format('select count(*) from public.%I where tenant_id = %L', t, test.t(p_other)) into v;
    if v > 0 then v_where := v_where || t || '=' || v || ' '; end if;
    v_total := v_total + v;
  end loop;
  execute format('select count(*) from public.tenants where id = %L', test.t(p_other)) into v;
  if v > 0 then v_where := v_where || 'tenants=' || v; end if;
  v_total := v_total + v;
  perform test.note(v_total = 0, p_label, case when v_total = 0 then 'in 10 Tabellen nichts sichtbar' else 'SICHTBAR: ' || v_where end);
exception when others then
  perform test.note(false, p_label, 'Fehler: ' || sqlerrm);
end
$$;

grant usage on schema test to anon, authenticated;
grant insert, select on test.results to anon, authenticated;
grant usage on sequence test.results_nr_seq to anon, authenticated;
grant execute on all functions in schema test to anon, authenticated;


-- =====================================================================
-- A. NICHT ANGEMELDET: gar nichts
-- =====================================================================
select test.login_anon();
select test.sees_nothing('select count(*) from public.tenants', 'Ohne Anmeldung: keine Einrichtungen sichtbar');
select test.sees_nothing('select count(*) from public.profiles', 'Ohne Anmeldung: keine Personen sichtbar');
select test.sees_nothing('select count(*) from public.devices', 'Ohne Anmeldung: keine Geräte sichtbar');
select test.sees_nothing('select count(*) from public.certificates', 'Ohne Anmeldung: keine Nachweise sichtbar');
select test.sees_nothing('select count(*) from public.audit_logs', 'Ohne Anmeldung: kein Protokoll sichtbar');
select test.sees_nothing('select count(*) from public.training_status', 'Ohne Anmeldung: kein Schulungsstand sichtbar');
select test.blocked(format('insert into public.devices (tenant_id, model) values (%L, %L)', test.t('a'), 'Fremdgerät'), 'Ohne Anmeldung: kein Gerät erfassbar');
select test.blocked('select public.link_profile()', 'Ohne Anmeldung: Login-Verknüpfung nicht aufrufbar');
reset role;


-- =====================================================================
-- B. MANDANTENTRENNUNG: Niemand aus Klinik A sieht etwas von Heim B, und umgekehrt
-- =====================================================================
select test.login('a_emp1');  select test.no_rows_of('b', 'Mitarbeitende von A sieht nichts von B'); reset role;
select test.login('a_line1'); select test.no_rows_of('b', 'Stationsleitung von A sieht nichts von B'); reset role;
select test.login('a_qm');    select test.no_rows_of('b', 'QM von A sieht nichts von B'); reset role;
select test.login('a_admin'); select test.no_rows_of('b', 'Administrator von A sieht nichts von B'); reset role;
select test.login('b_emp');   select test.no_rows_of('a', 'Mitarbeitende von B sieht nichts von A'); reset role;
select test.login('b_line');  select test.no_rows_of('a', 'Stationsleitung von B sieht nichts von A'); reset role;
select test.login('b_qm');    select test.no_rows_of('a', 'QM von B sieht nichts von A'); reset role;
select test.login('b_admin'); select test.no_rows_of('a', 'Administrator von B sieht nichts von A'); reset role;

-- Schreibversuche über die Mandantengrenze
select test.login('a_admin');
select test.blocked(format('insert into public.devices (tenant_id, model) values (%L, %L)', test.t('b'), 'Eingeschleust'), 'Admin A: kein Gerät in B anlegbar');
select test.blocked(format('insert into public.profiles (tenant_id, name, role) values (%L, %L, %L)', test.t('b'), 'Eingeschleust', 'admin'), 'Admin A: keine Person in B anlegbar');
select test.blocked(format('insert into public.departments (tenant_id, name) values (%L, %L)', test.t('b'), 'Eingeschleust'), 'Admin A: keine Abteilung in B anlegbar');
select test.blocked(format('update public.profiles set name = %L where id = %L', 'Gekapert', test.p('b_emp')), 'Admin A: Person von B nicht änderbar');
select test.blocked(format('update public.devices set model = %L where id = %L', 'Gekapert', test.g('b_lift')), 'Admin A: Gerät von B nicht änderbar');
select test.blocked(format('delete from public.assignments where profile_id = %L', test.p('b_emp')), 'Admin A: Zuteilung von B nicht löschbar');
select test.blocked(format('select public.set_profile_role(%L, %L)', test.p('b_emp'), 'admin'), 'Admin A: keine Rolle in B vergebbar');
select test.blocked(format('insert into public.certificates (tenant_id, profile_id, device_id, trained_at, instructor) values (%L, %L, %L, current_date, %L)', test.t('b'), test.p('b_emp'), test.g('b_lift'), 'Fremd'), 'Admin A: kein Nachweis in B erfassbar');
select test.blocked(format('insert into public.certificates (tenant_id, profile_id, device_id, trained_at, instructor) values (%L, %L, %L, current_date, %L)', test.t('a'), test.p('b_emp'), test.g('a_pumpe'), 'Fremd'), 'Admin A: kein Nachweis für Person von B, als A getarnt');
select test.blocked(format('insert into public.certificates (tenant_id, profile_id, device_id, trained_at, instructor) values (%L, %L, %L, current_date, %L)', test.t('a'), test.p('a_emp1'), test.g('b_lift'), 'Fremd'), 'Admin A: kein Nachweis mit Gerät von B');
select test.blocked(format('insert into public.assignments (tenant_id, profile_id, device_id) values (%L, %L, %L)', test.t('a'), test.p('a_emp1'), test.g('b_lift')), 'Admin A: keine Zuteilung mit Gerät von B');
select test.blocked(format('insert into public.assignments (tenant_id, profile_id, device_id) values (%L, %L, %L)', test.t('a'), test.p('b_emp'), test.g('a_pumpe')), 'Admin A: keine Zuteilung für Person von B');
select test.blocked(format('insert into public.department_devices (tenant_id, department_id, device_id) values (%L, %L, %L)', test.t('a'), test.d('a1'), test.g('b_lift')), 'Admin A: Gerät von B nicht in eigene Abteilung stellbar');
select test.blocked(format('insert into public.profiles (tenant_id, name, department_id) values (%L, %L, %L)', test.t('a'), 'Falsch einsortiert', test.d('b1')), 'Admin A: Person nicht in Abteilung von B einteilbar');
select test.blocked(format('update public.reminder_settings set email = %L where department_id = %L', 'boese@example.test', test.d('b1')), 'Admin A: Erinnerungen von B nicht änderbar');
reset role;


-- =====================================================================
-- C. MITARBEITENDE: nur das Eigene, nichts ändern
-- =====================================================================
select test.login('a_emp1');
select test.count_is('select count(*) from public.tenants', 1, 'Mitarbeitende: sieht die eigene Einrichtung');
select test.count_is('select count(*) from public.profiles', 1, 'Mitarbeitende: sieht nur das eigene Profil');
select test.count_is('select count(*) from public.assignments', 2, 'Mitarbeitende: sieht nur die eigenen Zuteilungen');
select test.count_is('select count(*) from public.certificates', 1, 'Mitarbeitende: sieht nur die eigenen Nachweise');
select test.count_is('select count(*) from public.training_status', 2, 'Mitarbeitende: sieht nur den eigenen Schulungsstand');
select test.count_is('select count(*) from public.devices', 3, 'Mitarbeitende: sieht die Geräte der eigenen Einrichtung');
select test.count_is('select count(*) from public.audit_logs', 0, 'Mitarbeitende: sieht kein Protokoll');
select test.count_is('select count(*) from public.reminder_settings', 0, 'Mitarbeitende: sieht keine Erinnerungs-Einstellungen');
select test.blocked(format('insert into public.certificates (tenant_id, profile_id, device_id, trained_at, instructor) values (%L, %L, %L, current_date, %L)', test.t('a'), test.p('a_emp1'), test.g('a_defi'), 'Ich selbst'), 'Mitarbeitende: kann sich keinen Nachweis ausstellen');
select test.blocked(format('insert into public.assignments (tenant_id, profile_id, device_id) values (%L, %L, %L)', test.t('a'), test.p('a_emp1'), test.g('a_kuehl')), 'Mitarbeitende: kann keine Zuteilung setzen');
select test.blocked(format('delete from public.assignments where profile_id = %L', test.p('a_emp1')), 'Mitarbeitende: kann eigene Zuteilung nicht entfernen');
select test.blocked(format('update public.profiles set name = %L where id = %L', 'Neuer Name', test.p('a_emp1')), 'Mitarbeitende: kann das eigene Profil nicht ändern');
select test.blocked(format('update public.profiles set role = %L where id = %L', 'admin', test.p('a_emp1')), 'Mitarbeitende: kann sich nicht zum Administrator machen');
select test.blocked(format('select public.set_profile_role(%L, %L)', test.p('a_emp1'), 'admin'), 'Mitarbeitende: Rollenvergabe abgelehnt');
select test.blocked(format('insert into public.devices (tenant_id, model) values (%L, %L)', test.t('a'), 'Eigenes Gerät'), 'Mitarbeitende: kann kein Gerät erfassen');
reset role;


-- =====================================================================
-- D. STATIONSLEITUNG: die eigene Abteilung pflegen, sonst nichts
-- =====================================================================
select test.login('a_line1');
select test.count_is('select count(*) from public.profiles', 6, 'Leitung: sieht die 6 Personen der eigenen Abteilung');
select test.count_is(format('select count(*) from public.profiles where department_id is distinct from %L', test.d('a1')), 0, 'Leitung: sieht keine Person einer anderen Abteilung');
select test.count_is('select count(*) from public.assignments', 3, 'Leitung: sieht nur Zuteilungen der eigenen Abteilung');
select test.count_is('select count(*) from public.certificates', 2, 'Leitung: sieht nur Nachweise der eigenen Abteilung');
select test.count_is('select count(*) from public.reminder_settings', 0, 'Leitung: sieht keine Erinnerungen anderer Abteilungen');

-- Zuteilen
select test.works(format('insert into public.assignments (tenant_id, profile_id, device_id) values (%L, %L, %L)', test.t('a'), test.p('a_emp2'), test.g('a_defi')), 1, 'Leitung: kann in der eigenen Abteilung zuteilen');
select test.blocked(format('insert into public.assignments (tenant_id, profile_id, device_id) values (%L, %L, %L)', test.t('a'), test.p('a_emp3'), test.g('a_defi')), 'Leitung: kann in fremder Abteilung nicht zuteilen');
select test.blocked(format('delete from public.assignments where profile_id = %L', test.p('a_emp3')), 'Leitung: kann Zuteilung fremder Abteilung nicht entfernen');

-- Schulung erfassen (eine Unterschrift für die ganze Gruppe)
select test.works(format('insert into public.certificates (tenant_id, profile_id, device_id, trained_at, instructor, signature_png) values (%1$L, %2$L, %4$L, current_date, %5$L, %6$L), (%1$L, %3$L, %4$L, current_date, %5$L, %6$L)', test.t('a'), test.p('a_emp1'), test.p('a_emp2'), test.g('a_defi'), 'M. Keller (Berufsbildner)', 'data:image/png;base64,AAAA'), 2, 'Leitung: kann eine Gruppenschulung erfassen');
select test.count_is(format('select count(*) from public.certificates where profile_id = %L and device_id = %L and type = %L and device_model = %L and interval_months = 12 and created_by = %L', test.p('a_emp1'), test.g('a_defi'), 'erstschulung', 'CardioShock Pro', test.p('a_line1')), 1, 'Datenbank ergänzt Art, Gerätestand und Erfasser selbst');
select test.works(format('insert into public.certificates (tenant_id, profile_id, device_id, trained_at, instructor) values (%L, %L, %L, current_date, %L)', test.t('a'), test.p('a_emp1'), test.g('a_pumpe'), 'T. Baumann'), 1, 'Leitung: kann eine Wiederholung erfassen');
select test.count_is(format('select count(*) from public.certificates where profile_id = %L and device_id = %L and type = %L', test.p('a_emp1'), test.g('a_pumpe'), 'wiederholung'), 1, 'Datenbank erkennt die Wiederholung');
select test.blocked(format('insert into public.certificates (tenant_id, profile_id, device_id, trained_at, instructor, type) values (%L, %L, %L, current_date, %L, %L)', test.t('a'), test.p('a_emp2'), test.g('a_defi'), 'X', 'erstschulung'), 'Leitung: kann die Art der Schulung nicht selbst setzen');
select test.blocked(format('insert into public.certificates (tenant_id, profile_id, device_id, trained_at, instructor, created_at) values (%L, %L, %L, current_date, %L, %L)', test.t('a'), test.p('a_emp2'), test.g('a_defi'), 'X', '2020-01-01'), 'Leitung: kann das Erfassungsdatum nicht fälschen');
select test.blocked(format('insert into public.certificates (tenant_id, profile_id, device_id, trained_at, instructor) values (%L, %L, %L, current_date + 3, %L)', test.t('a'), test.p('a_emp2'), test.g('a_defi'), 'X'), 'Leitung: kein Schulungsdatum in der Zukunft');
select test.blocked(format('insert into public.certificates (tenant_id, profile_id, device_id, trained_at, instructor) values (%L, %L, %L, current_date, %L)', test.t('a'), test.p('a_emp3'), test.g('a_pumpe'), 'X'), 'Leitung: kein Nachweis für fremde Abteilung');
select test.blocked(format('update public.certificates set instructor = %L where profile_id = %L', 'Geändert', test.p('a_emp1')), 'Leitung: kann Nachweise nicht ändern');
select test.blocked(format('delete from public.certificates where profile_id = %L', test.p('a_emp1')), 'Leitung: kann Nachweise nicht löschen');

-- Team pflegen
select test.works(format('insert into public.profiles (tenant_id, name, department_id, pers_no) values (%L, %L, %L, %L)', test.t('a'), 'Import Person', test.d('a1'), 'A-099'), 1, 'Leitung: kann Mitarbeitende der eigenen Abteilung erfassen');
select test.blocked(format('insert into public.profiles (tenant_id, name, department_id, role) values (%L, %L, %L, %L)', test.t('a'), 'Heimliche QM', test.d('a1'), 'qm'), 'Leitung: kann keine Person mit höherer Rolle erfassen');
select test.blocked(format('insert into public.profiles (tenant_id, name, department_id) values (%L, %L, %L)', test.t('a'), 'Falsche Abteilung', test.d('a2')), 'Leitung: kann niemanden in fremder Abteilung erfassen');
select test.blocked(format('insert into public.profiles (tenant_id, name, department_id, user_id) values (%L, %L, %L, %L)', test.t('a'), 'Mit Login', test.d('a1'), test.u('neu')), 'Leitung: kann kein Login an eine Person hängen');
select test.works(format('update public.profiles set job_title = %L where id = %L', 'Dipl. Pflegefachfrau HF', test.p('a_emp1')), 1, 'Leitung: kann Mitarbeitende der eigenen Abteilung bearbeiten');
select test.blocked(format('update public.profiles set department_id = %L where id = %L', test.d('a2'), test.p('a_emp1')), 'Leitung: kann niemanden in fremde Abteilung verschieben');
select test.blocked(format('update public.profiles set name = %L where id = %L', 'Gekapert', test.p('a_emp3')), 'Leitung: kann Person fremder Abteilung nicht bearbeiten');
select test.blocked(format('update public.profiles set name = %L where id = %L', 'Gekapert', test.p('a_line1')), 'Leitung: kann das eigene Profil nicht ändern');
select test.blocked(format('update public.profiles set role = %L where id = %L', 'admin', test.p('a_line1')), 'Leitung: kann sich nicht zum Administrator machen');
select test.blocked(format('update public.profiles set user_id = %L where id = %L', test.u('a_line1'), test.p('a_emp1')), 'Leitung: kann kein Login umhängen');
select test.blocked(format('select public.set_profile_role(%L, %L)', test.p('a_emp1'), 'line'), 'Leitung: Rollenvergabe abgelehnt');
select test.blocked(format('delete from public.profiles where id = %L', test.p('a_emp1')), 'Leitung: kann Personen nicht löschen');

-- Inventar und Erinnerungen
select test.works(format('insert into public.devices (tenant_id, model, category, vendor, risk_class, interval_months) values (%1$L, %2$L, %3$L, %4$L, %5$L, 12), (%1$L, %6$L, %7$L, %4$L, %8$L, 24)', test.t('a'), 'OxyMobile 3000', 'Notfallbeatmungsgerät', 'MedTech Systems AG', 'IIb', 'SonoView 9', 'Ultraschallgerät', 'IIa'), 2, 'Leitung: kann eine Geräteliste importieren');
select test.blocked(format('insert into public.devices (tenant_id, model, vendor) values (%L, %L, %L)', test.t('a'), 'oxymobile 3000', 'MedTech Systems AG'), 'Dasselbe Gerät wird nicht doppelt erfasst');
select test.works(format('insert into public.department_devices (tenant_id, department_id, device_id) select tenant_id, %L, id from public.devices where model = %L', test.d('a1'), 'OxyMobile 3000'), 1, 'Leitung: kann ein Gerät der eigenen Abteilung zuordnen');
select test.blocked(format('insert into public.department_devices (tenant_id, department_id, device_id) values (%L, %L, %L)', test.t('a'), test.d('a2'), test.g('a_defi')), 'Leitung: kann fremder Abteilung kein Gerät zuordnen');
select test.blocked(format('delete from public.devices where id = %L', test.g('a_defi')), 'Leitung: kann Geräte nicht löschen');
select test.works(format('insert into public.reminder_settings (tenant_id, department_id, email, lead_days) values (%L, %L, %L, %L)', test.t('a'), test.d('a1'), 'leitung-a1@example.test', '{180,45}'), 1, 'Leitung: kann Erinnerungen der eigenen Abteilung einrichten');
select test.blocked(format('update public.reminder_settings set email = %L where department_id = %L', 'boese@example.test', test.d('a2')), 'Leitung: kann Erinnerungen fremder Abteilung nicht ändern');
select test.blocked(format('insert into public.departments (tenant_id, name) values (%L, %L)', test.t('a'), 'Eigene Abteilung'), 'Leitung: kann keine Abteilung anlegen');

-- Änderungsprotokoll
select test.count_is(format('select count(*) from public.audit_logs where actor_name = %L and action like %L', 'Lea Leitung', 'Schulung erfasst: CardioShock Pro, Eva Eins,%'), 1, 'Protokoll: Schulung mit Namen der Leitung festgehalten');
select test.count_is(format('select count(*) from public.audit_logs where action = %L', 'Zuteilung hinzugefügt: Emil Zwei, CardioShock Pro'), 1, 'Protokoll: Zuteilung festgehalten');
select test.count_is(format('select count(*) from public.audit_logs where action = %L', 'Inventar: 2 Geräte aufgenommen'), 0, 'Leitung: sieht nur Protokolleinträge der eigenen Abteilung');
select test.blocked(format('insert into public.audit_logs (tenant_id, actor_name, action) values (%L, %L, %L)', test.t('a'), 'Niemand', 'Erfunden'), 'Leitung: kann nichts ins Protokoll schreiben');
select test.blocked('update public.audit_logs set action = ''Geschönt''', 'Leitung: kann das Protokoll nicht ändern');
select test.blocked('delete from public.audit_logs', 'Leitung: kann das Protokoll nicht löschen');
reset role;

-- Die andere Stationsleitung derselben Klinik sieht davon nichts
select test.login('a_line2');
select test.count_is('select count(*) from public.profiles', 2, 'Leitung 2: sieht nur die eigene Abteilung');
select test.count_is(format('select count(*) from public.certificates where profile_id <> %L', test.p('a_emp3')), 0, 'Leitung 2: sieht keine Nachweise der anderen Abteilung');
select test.count_is(format('select count(*) from public.audit_logs where department_id = %L', test.d('a1')), 0, 'Leitung 2: sieht kein Protokoll der anderen Abteilung');
reset role;


-- =====================================================================
-- E. QUALITÄTSMANAGEMENT: alles der eigenen Einrichtung lesen, nichts ändern
-- =====================================================================
select test.login('a_qm');
select test.count_is('select count(*) from public.profiles', 11, 'QM: sieht alle Personen der Einrichtung');
select test.count_is('select count(*) from public.certificates', 6, 'QM: sieht alle Nachweise der Einrichtung');
select test.count_is('select count(*) from public.assignments', 5, 'QM: sieht alle Zuteilungen der Einrichtung');
select test.count_is('select count(*) from public.audit_logs where action = ''Inventar: 2 Geräte aufgenommen''', 1, 'QM: sieht das Protokoll der ganzen Einrichtung');
select test.count_is('select count(*) from public.reminder_settings', 2, 'QM: sieht die Erinnerungen aller Abteilungen');
select test.blocked(format('insert into public.certificates (tenant_id, profile_id, device_id, trained_at, instructor) values (%L, %L, %L, current_date, %L)', test.t('a'), test.p('a_emp1'), test.g('a_defi'), 'QM'), 'QM: kann keinen Nachweis erfassen');
select test.blocked(format('insert into public.assignments (tenant_id, profile_id, device_id) values (%L, %L, %L)', test.t('a'), test.p('a_emp3'), test.g('a_defi')), 'QM: kann nicht zuteilen');
select test.blocked('delete from public.assignments', 'QM: kann keine Zuteilung entfernen');
select test.blocked(format('insert into public.devices (tenant_id, model) values (%L, %L)', test.t('a'), 'QM-Gerät'), 'QM: kann kein Gerät erfassen');
select test.blocked('update public.devices set interval_months = 120', 'QM: kann keine Intervalle ändern');
select test.blocked(format('insert into public.profiles (tenant_id, name) values (%L, %L)', test.t('a'), 'QM-Person'), 'QM: kann keine Person erfassen');
select test.blocked('update public.profiles set active = false', 'QM: kann niemanden deaktivieren');
select test.blocked('update public.reminder_settings set email = ''qm@example.test''', 'QM: kann keine Erinnerungen ändern');
select test.blocked('update public.certificates set instructor = ''QM''', 'QM: kann Nachweise nicht ändern');
select test.blocked('delete from public.certificates', 'QM: kann Nachweise nicht löschen');
select test.blocked(format('select public.set_profile_role(%L, %L)', test.p('a_qm'), 'admin'), 'QM: kann sich nicht zum Administrator machen');
reset role;


-- =====================================================================
-- F. ADMINISTRATOR DER EINRICHTUNG
-- =====================================================================
select test.login('a_admin');
select test.works(format('insert into public.departments (tenant_id, name) values (%L, %L)', test.t('a'), 'Notfall'), 1, 'Admin: kann eine Abteilung anlegen');
select test.works(format('insert into public.profiles (tenant_id, name, role, email) values (%L, %L, %L, %L)', test.t('a'), 'Zweite QM', 'qm', 'qm2@example.test'), 1, 'Admin: kann eine Person mit Rolle erfassen');
select test.works(format('select public.set_profile_role(%L, %L)', test.p('a_emp3'), 'line'), 1, 'Admin: kann eine Rolle vergeben');
select test.count_is(format('select count(*) from public.profiles where id = %L and role = %L', test.p('a_emp3'), 'line'), 1, 'Admin: Rolle ist gesetzt');
select test.blocked(format('update public.profiles set role = %L where id = %L', 'admin', test.p('a_emp1')), 'Admin: Rolle nur über die geprüfte Funktion, nicht direkt');
select test.blocked(format('select public.set_profile_role(%L, %L)', test.p('a_admin'), 'employee'), 'Admin: der letzte Administrator kann sich nicht selbst abstufen');
select test.blocked('update public.certificates set instructor = ''Admin''', 'Admin: kann Nachweise nicht ändern');
select test.blocked('delete from public.certificates', 'Admin: kann Nachweise nicht löschen');
select test.blocked('delete from public.audit_logs', 'Admin: kann das Protokoll nicht löschen');
select test.blocked(format('update public.tenants set plan = %L', 'spital'), 'Admin: kann das eigene Paket nicht ändern');
select test.blocked(format('insert into public.tenants (name) values (%L)', 'Eigene Klinik'), 'Admin: kann keine neue Einrichtung anlegen');
reset role;


-- =====================================================================
-- G. LOGIN MIT PERSON VERKNÜPFEN
-- =====================================================================
select test.login('neu');
select test.count_is('select count(*) from public.profiles', 0, 'Neues Login ohne Verknüpfung: sieht nichts');
select test.count_is(format('select count(*) where public.link_profile() = %L', test.p('a_neu')), 1, 'Neues Login: wird über die bestätigte E-Mail-Adresse verknüpft');
select test.count_is('select count(*) from public.profiles', 1, 'Neues Login: sieht danach das eigene Profil');
select test.no_rows_of('b', 'Neues Login: sieht nichts von der anderen Einrichtung');
reset role;

select test.login('unbestaetigt');
select test.count_is('select count(*) where public.link_profile() is null', 1, 'Unbestätigte E-Mail-Adresse: wird nicht verknüpft');
select test.count_is('select count(*) from public.profiles', 0, 'Unbestätigte E-Mail-Adresse: sieht nichts');
reset role;

select test.login('doppelt');
select test.blocked('select public.link_profile()', 'Adresse in zwei Einrichtungen: Verknüpfung wird abgelehnt');
select test.count_is('select count(*) from public.profiles', 0, 'Adresse in zwei Einrichtungen: sieht nichts');
reset role;

-- Austritt: Deaktivierte Personen sehen sofort nichts mehr
update public.profiles set active = false where id = test.p('a_emp2');
select test.login('a_emp2');
select test.count_is('select count(*) from public.profiles', 0, 'Deaktivierte Person: sieht kein Profil mehr');
select test.count_is('select count(*) from public.certificates', 0, 'Deaktivierte Person: sieht keine Nachweise mehr');
select test.count_is('select count(*) from public.devices', 0, 'Deaktivierte Person: sieht keine Geräte mehr');
reset role;


-- =====================================================================
-- H. AUCH MIT VOLLEN RECHTEN
-- =====================================================================
-- Nachweise bleiben unveränderlich
select test.blocked('update public.certificates set instructor = ''System''', 'Selbst mit vollen Rechten: Nachweise nicht änderbar');
-- Eine Einrichtung lässt sich am Vertragsende als Ganzes entfernen, ohne die andere zu berühren
select test.works(format('delete from public.tenants where id = %L', test.t('b')), 1, 'Vertragsende: Einrichtung B lässt sich als Ganzes löschen');
select test.count_is(format('select (select count(*) from public.profiles where tenant_id = %1$L) + (select count(*) from public.certificates where tenant_id = %1$L) + (select count(*) from public.audit_logs where tenant_id = %1$L)', test.t('b')), 0, 'Vertragsende: von B bleibt nichts zurück');
select test.count_is(format('select count(*) from public.certificates where tenant_id = %L', test.t('a')), 6, 'Vertragsende von B: Nachweise von A unberührt');
