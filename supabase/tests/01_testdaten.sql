-- Zwei Einrichtungen mit je eigenen Abteilungen, Personen, Geräten und Nachweisen.
-- Schlüssel wie 'a_emp1' werden in feste IDs umgerechnet, damit die Tests lesbar bleiben.

create schema test;
create table test.results (nr serial primary key, ok boolean not null, label text not null, detail text);

create function test.id(p_kind text, p_key text) returns uuid language sql immutable as $$
  select md5(p_kind || ':' || p_key)::uuid
$$;
create function test.t(k text) returns uuid language sql immutable as $$ select test.id('tenant', k) $$;  -- Einrichtung
create function test.d(k text) returns uuid language sql immutable as $$ select test.id('dept', k) $$;    -- Abteilung
create function test.p(k text) returns uuid language sql immutable as $$ select test.id('profile', k) $$; -- Person
create function test.u(k text) returns uuid language sql immutable as $$ select test.id('user', k) $$;    -- Login
create function test.g(k text) returns uuid language sql immutable as $$ select test.id('device', k) $$;  -- Gerät

insert into public.tenants (id, name) values (test.t('a'), 'Klinik Nord'), (test.t('b'), 'Heim Süd');

insert into public.departments (id, tenant_id, name) values
  (test.d('a1'), test.t('a'), 'Intensivpflege'),
  (test.d('a2'), test.t('a'), 'Bettenstation'),
  (test.d('b1'), test.t('b'), 'Wohngruppe 1');

insert into auth.users (id, email, email_confirmed_at)
select test.u(k), k || '@example.test', now()
from unnest(array['a_admin', 'a_qm', 'a_line1', 'a_line2', 'a_emp1', 'a_emp2', 'a_emp3', 'b_admin', 'b_qm', 'b_line', 'b_emp']) k;

-- Logins ohne Profil: eine neu eingeladene Person, eine unbestätigte Adresse, eine doppelt erfasste Adresse
insert into auth.users (id, email, email_confirmed_at) values
  (test.u('neu'), 'Neu.Person@example.test', now()),
  (test.u('unbestaetigt'), 'wartet@example.test', null),
  (test.u('doppelt'), 'doppelt@example.test', now());

insert into public.profiles (id, tenant_id, user_id, name, role, department_id, pers_no, email) values
  (test.p('a_admin'), test.t('a'), test.u('a_admin'), 'Anna Admin', 'admin', null, 'A-001', null),
  (test.p('a_qm'), test.t('a'), test.u('a_qm'), 'Quirin QM', 'qm', null, 'A-002', null),
  (test.p('a_line1'), test.t('a'), test.u('a_line1'), 'Lea Leitung', 'line', test.d('a1'), 'A-010', null),
  (test.p('a_line2'), test.t('a'), test.u('a_line2'), 'Lars Leitung', 'line', test.d('a2'), 'A-020', null),
  (test.p('a_emp1'), test.t('a'), test.u('a_emp1'), 'Eva Eins', 'employee', test.d('a1'), 'A-011', null),
  (test.p('a_emp2'), test.t('a'), test.u('a_emp2'), 'Emil Zwei', 'employee', test.d('a1'), 'A-012', null),
  (test.p('a_emp3'), test.t('a'), test.u('a_emp3'), 'Enzo Drei', 'employee', test.d('a2'), 'A-021', null),
  (test.p('a_neu'), test.t('a'), null, 'Nora Neu', 'employee', test.d('a1'), 'A-013', 'neu.person@example.test'),
  (test.p('a_wartet'), test.t('a'), null, 'Willi Wartet', 'employee', test.d('a1'), 'A-014', 'wartet@example.test'),
  (test.p('a_doppelt'), test.t('a'), null, 'Dora Doppelt', 'employee', test.d('a1'), 'A-015', 'doppelt@example.test'),
  (test.p('b_admin'), test.t('b'), test.u('b_admin'), 'Bruno Admin', 'admin', null, 'B-001', null),
  (test.p('b_qm'), test.t('b'), test.u('b_qm'), 'Berta QM', 'qm', null, 'B-002', null),
  (test.p('b_line'), test.t('b'), test.u('b_line'), 'Beat Leitung', 'line', test.d('b1'), 'B-010', null),
  (test.p('b_emp'), test.t('b'), test.u('b_emp'), 'Bea Eins', 'employee', test.d('b1'), 'B-011', null),
  (test.p('b_doppelt'), test.t('b'), null, 'Dora Doppelt', 'employee', test.d('b1'), 'B-015', 'doppelt@example.test');

insert into public.devices (id, tenant_id, model, category, vendor, risk_class, interval_months) values
  (test.g('a_pumpe'), test.t('a'), 'InfusoMax V2', 'Infusionspumpe', 'SwissMed Solutions', 'IIb', 24),
  (test.g('a_defi'), test.t('a'), 'CardioShock Pro', 'Defibrillator', 'LifeCare Corp.', 'IIb', 12),
  (test.g('a_kuehl'), test.t('a'), 'CoolStore Med 120', 'Kühlschrank für Medikamente', 'KlimaTech AG', null, 0),
  (test.g('b_lift'), test.t('b'), 'LiftAssist 200', 'Patientenlifter', 'CareMove GmbH', 'I', 36);

insert into public.department_devices (tenant_id, department_id, device_id) values
  (test.t('a'), test.d('a1'), test.g('a_pumpe')),
  (test.t('a'), test.d('a1'), test.g('a_defi')),
  (test.t('a'), test.d('a2'), test.g('a_pumpe')),
  (test.t('b'), test.d('b1'), test.g('b_lift'));

insert into public.assignments (tenant_id, profile_id, device_id) values
  (test.t('a'), test.p('a_emp1'), test.g('a_pumpe')),
  (test.t('a'), test.p('a_emp1'), test.g('a_defi')),
  (test.t('a'), test.p('a_emp2'), test.g('a_pumpe')),
  (test.t('a'), test.p('a_emp3'), test.g('a_pumpe')),
  (test.t('b'), test.p('b_emp'), test.g('b_lift'));

insert into public.certificates (tenant_id, profile_id, device_id, trained_at, instructor) values
  (test.t('a'), test.p('a_emp1'), test.g('a_pumpe'), current_date - 400, 'M. Keller'),
  (test.t('a'), test.p('a_emp2'), test.g('a_pumpe'), current_date - 100, 'M. Keller'),
  (test.t('a'), test.p('a_emp3'), test.g('a_pumpe'), current_date - 50, 'S. Vogt'),
  (test.t('b'), test.p('b_emp'), test.g('b_lift'), current_date - 30, 'B. Leitung');

insert into public.reminder_settings (tenant_id, department_id, email) values
  (test.t('a'), test.d('a2'), 'leitung-a2@example.test'),
  (test.t('b'), test.d('b1'), 'leitung-b1@example.test');
