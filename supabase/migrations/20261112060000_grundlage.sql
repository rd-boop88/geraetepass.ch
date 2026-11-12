-- =====================================================================
-- geraetepass.ch: Grundlage der Datenbank
--
-- Mandantenfähig: Jede Einrichtung (Spital, Heim) ist ein Mandant in der
-- Tabelle "tenants". Jede weitere Tabelle trägt eine tenant_id, und die
-- Datenbank selbst (Row Level Security) lässt niemanden Zeilen eines
-- anderen Mandanten sehen oder ändern.
--
-- Aufbau:
--   1. Typen und Tabellen
--   2. Hilfsfunktionen (wer ist angemeldet?)
--   3. Regeln beim Speichern (Nachweise, Änderungsprotokoll)
--   4. Zugriffsregeln (Row Level Security)
--   5. Funktionen für die App (Login verknüpfen, Rolle vergeben)
--   6. Rechte
-- =====================================================================

create schema if not exists app;


-- =====================================================================
-- 1. TYPEN UND TABELLEN
-- =====================================================================

-- employee = Mitarbeitende, line = Stationsleitung, qm = Qualitätsmanagement,
-- admin = Administrator der Einrichtung (lädt Personen ein, vergibt Rollen)
create type public.app_role as enum ('employee', 'line', 'qm', 'admin');
create type public.training_type as enum ('erstschulung', 'wiederholung');

-- Mandanten: eine Zeile pro Einrichtung
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  plan text not null default 'pilot' check (plan in ('pilot', 'start', 'professional', 'enterprise', 'spital')),
  created_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  short_name text,
  created_at timestamptz not null default now(),
  unique (tenant_id, id), -- erlaubt Verweise, die den Mandanten mitprüfen
  unique (tenant_id, name)
);

-- Personen mit Gerätepass. user_id verknüpft die Person mit ihrem Login;
-- wer sich noch nie angemeldet hat, hat dort keinen Eintrag.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  job_title text,
  pers_no text,
  email text,
  role public.app_role not null default 'employee',
  department_id uuid,
  active boolean not null default true, -- Austritte werden deaktiviert, nicht gelöscht
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, department_id) references public.departments (tenant_id, id)
);
create unique index profiles_pers_no_key on public.profiles (tenant_id, lower(pers_no)) where pers_no is not null;
create unique index profiles_email_key on public.profiles (tenant_id, lower(email)) where email is not null;
create index profiles_department_idx on public.profiles (tenant_id, department_id);

-- Geräteinventar der Einrichtung. interval_months = 0 heisst: keine Schulungspflicht.
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  model text not null check (length(trim(model)) > 0),
  category text,
  vendor text,
  risk_class text,
  interval_months integer not null default 12 check (interval_months between 0 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);
-- Dasselbe Modell desselben Herstellers gibt es pro Einrichtung nur einmal
create unique index devices_model_vendor_key on public.devices (tenant_id, lower(model), lower(coalesce(vendor, '')));

-- Welche Geräte stehen in welcher Abteilung? Ein Gerät kann in mehreren stehen.
create table public.department_devices (
  tenant_id uuid not null,
  department_id uuid not null,
  device_id uuid not null,
  primary key (department_id, device_id),
  foreign key (tenant_id, department_id) references public.departments (tenant_id, id) on delete cascade,
  foreign key (tenant_id, device_id) references public.devices (tenant_id, id) on delete cascade
);

-- Soll-Zuteilung: Wer muss welches Gerät bedienen können?
-- Die zusammengesetzten Verweise verhindern, dass eine Person der Einrichtung A
-- mit einem Gerät der Einrichtung B verknüpft wird.
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  profile_id uuid not null,
  device_id uuid not null,
  created_at timestamptz not null default now(),
  unique (profile_id, device_id),
  foreign key (tenant_id, profile_id) references public.profiles (tenant_id, id) on delete cascade,
  foreign key (tenant_id, device_id) references public.devices (tenant_id, id) on delete cascade
);
create index assignments_device_idx on public.assignments (tenant_id, device_id);

-- Schulungsnachweise. Sie werden nie geändert und von der App nie gelöscht.
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  profile_id uuid not null,
  device_id uuid not null,
  trained_at date not null,
  instructor text not null check (length(trim(instructor)) > 0),
  type public.training_type not null,
  signature_png text check (signature_png is null or length(signature_png) <= 400000), -- Unterschrift Instruktor/in
  -- Stand des Geräts am Tag der Schulung: bleibt, auch wenn das Gerät später umbenannt wird
  device_model text not null,
  device_category text,
  device_risk_class text,
  interval_months integer not null,
  created_by uuid, -- Profil, das den Nachweis erfasst hat
  created_at timestamptz not null default now(),
  foreign key (tenant_id, profile_id) references public.profiles (tenant_id, id),
  foreign key (tenant_id, device_id) references public.devices (tenant_id, id)
);
create index certificates_lookup_idx on public.certificates (tenant_id, profile_id, device_id, trained_at desc);

-- Änderungsprotokoll. Geschrieben wird es von der Datenbank selbst, nicht von der App.
create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  department_id uuid,
  actor_profile_id uuid,
  actor_name text not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index audit_logs_tenant_idx on public.audit_logs (tenant_id, created_at desc);

-- Erinnerungen pro Abteilung: an wen, wie lange vor Ablauf, was zusätzlich gemeldet wird
create table public.reminder_settings (
  tenant_id uuid not null,
  department_id uuid primary key,
  email text not null default '',
  lead_days integer[] not null default '{90,30}',
  include_expired boolean not null default true,
  include_missing boolean not null default true,
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, department_id) references public.departments (tenant_id, id) on delete cascade
);


-- =====================================================================
-- 2. HILFSFUNKTIONEN: Wer ist angemeldet?
--    Sie lesen das Profil der angemeldeten Person. Deaktivierte Profile
--    zählen nicht, wer deaktiviert ist, sieht also nichts mehr.
-- =====================================================================

create function app.tenant_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.tenant_id from public.profiles p where p.user_id = auth.uid() and p.active
$$;

create function app.profile_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.profiles p where p.user_id = auth.uid() and p.active
$$;

create function app.user_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.user_id = auth.uid() and p.active
$$;

create function app.department_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.department_id from public.profiles p where p.user_id = auth.uid() and p.active
$$;

-- Gehört die Person zur Abteilung der angemeldeten Stationsleitung?
create function app.in_my_department(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile
      and p.tenant_id = app.tenant_id()
      and p.department_id is not null
      and p.department_id = app.department_id()
  )
$$;

-- Eintrag ins Änderungsprotokoll, mit dem Namen der angemeldeten Person
create function app.log_action(p_tenant uuid, p_department uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := app.profile_id();
  v_name text;
begin
  -- Wird eine Einrichtung als Ganzes gelöscht, gibt es nichts mehr zu protokollieren
  if not exists (select 1 from public.tenants t where t.id = p_tenant) then
    return;
  end if;
  select p.name into v_name from public.profiles p where p.id = v_actor;
  insert into public.audit_logs (tenant_id, department_id, actor_profile_id, actor_name, action)
  values (p_tenant, p_department, v_actor, coalesce(v_name, 'System'), p_action);
end
$$;


-- =====================================================================
-- 3. REGELN BEIM SPEICHERN
-- =====================================================================

-- Neuer Schulungsnachweis: Die Datenbank ergänzt, was die App nicht selbst
-- bestimmen darf (Art der Schulung, Stand des Geräts, wer erfasst hat).
create function app.certificate_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_device public.devices;
begin
  if new.trained_at > (now() at time zone 'Europe/Zurich')::date then
    raise exception 'Das Schulungsdatum darf nicht in der Zukunft liegen.';
  end if;

  select d.* into v_device from public.devices d where d.id = new.device_id and d.tenant_id = new.tenant_id;
  if not found then
    raise exception 'Das Gerät gehört nicht zu dieser Einrichtung.';
  end if;

  new.device_model := v_device.model;
  new.device_category := v_device.category;
  new.device_risk_class := v_device.risk_class;
  new.interval_months := v_device.interval_months;
  new.type := case
    when exists (
      select 1 from public.certificates c
      where c.tenant_id = new.tenant_id and c.profile_id = new.profile_id and c.device_id = new.device_id
    ) then 'wiederholung'::public.training_type
    else 'erstschulung'::public.training_type
  end;
  new.created_by := app.profile_id();
  new.created_at := now();
  return new;
end
$$;

create trigger certificate_before_insert before insert on public.certificates
for each row execute function app.certificate_before_insert();

-- Nachweise sind unveränderlich, für alle. Eine Korrektur ist ein neuer Nachweis.
create function app.certificate_no_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Schulungsnachweise können nicht geändert werden.';
end
$$;

create trigger certificate_no_update before update on public.certificates
for each row execute function app.certificate_no_update();

-- Protokoll: Schulung erfasst
create function app.certificate_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_person public.profiles;
begin
  select p.* into v_person from public.profiles p where p.id = new.profile_id;
  perform app.log_action(
    new.tenant_id,
    v_person.department_id,
    'Schulung erfasst: ' || new.device_model || ', ' || v_person.name || ', '
      || to_char(new.trained_at, 'DD.MM.YYYY') || ', ' || new.instructor
  );
  return null;
end
$$;

create trigger certificate_after_insert after insert on public.certificates
for each row execute function app.certificate_after_insert();

-- Protokoll: Zuteilung hinzugefügt oder entfernt
create function app.assignment_log() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.assignments := coalesce(new, old);
  v_person public.profiles;
  v_model text;
begin
  select p.* into v_person from public.profiles p where p.id = v_row.profile_id;
  select d.model into v_model from public.devices d where d.id = v_row.device_id;
  -- Fehlt eines von beiden, wird gerade die Person oder das Gerät selbst gelöscht
  if v_person.id is null or v_model is null then
    return null;
  end if;
  perform app.log_action(
    v_row.tenant_id,
    v_person.department_id,
    'Zuteilung ' || case when tg_op = 'INSERT' then 'hinzugefügt' else 'entfernt' end || ': ' || v_person.name || ', ' || v_model
  );
  return null;
end
$$;

create trigger assignment_log after insert or delete on public.assignments
for each row execute function app.assignment_log();

-- Protokoll: Listen importiert (ein Eintrag pro Import, nicht pro Zeile)
create function app.devices_added_log() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v record;
begin
  for v in select n.tenant_id, count(*) as anzahl from neu n group by n.tenant_id loop
    perform app.log_action(v.tenant_id, null,
      'Inventar: ' || v.anzahl || case when v.anzahl = 1 then ' Gerät' else ' Geräte' end || ' aufgenommen');
  end loop;
  return null;
end
$$;

create trigger devices_added_log after insert on public.devices
referencing new table as neu for each statement execute function app.devices_added_log();

create function app.profiles_added_log() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v record;
begin
  for v in select n.tenant_id, n.department_id, count(*) as anzahl from neu n group by n.tenant_id, n.department_id loop
    perform app.log_action(v.tenant_id, v.department_id,
      'Team: ' || v.anzahl || case when v.anzahl = 1 then ' Person' else ' Personen' end || ' aufgenommen');
  end loop;
  return null;
end
$$;

create trigger profiles_added_log after insert on public.profiles
referencing new table as neu for each statement execute function app.profiles_added_log();

-- Erinnerungen: Zeitpunkt der Änderung setzen und protokollieren
create function app.reminder_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger reminder_before_write before insert or update on public.reminder_settings
for each row execute function app.reminder_before_write();

create function app.reminder_log() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform app.log_action(new.tenant_id, new.department_id,
    'Erinnerungen ' || case when new.email = '' then 'ausgeschaltet' else 'eingestellt' end);
  return null;
end
$$;

create trigger reminder_log after insert or update on public.reminder_settings
for each row execute function app.reminder_log();


-- =====================================================================
-- 4. ZUGRIFFSREGELN (Row Level Security)
--
--    Grundsatz: Ohne passende Regel ist alles verboten.
--    Jede Regel beginnt mit "tenant_id = eigene Einrichtung".
--
--    Mitarbeitende   sehen nur sich selbst, ihre Zuteilungen und Nachweise.
--    Stationsleitung sieht und pflegt ihre eigene Abteilung.
--    QM              sieht die ganze Einrichtung, ändert nichts.
--    Administrator   pflegt Abteilungen, Personen und Rollen der Einrichtung.
-- =====================================================================

alter table public.tenants enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.department_devices enable row level security;
alter table public.assignments enable row level security;
alter table public.certificates enable row level security;
alter table public.audit_logs enable row level security;
alter table public.reminder_settings enable row level security;

-- ---------- Einrichtung ----------
create policy tenants_select on public.tenants for select to authenticated
  using (id = (select app.tenant_id()));

-- ---------- Abteilungen ----------
create policy departments_select on public.departments for select to authenticated
  using (tenant_id = (select app.tenant_id()));

create policy departments_insert on public.departments for insert to authenticated
  with check (tenant_id = (select app.tenant_id()) and (select app.user_role()) = 'admin');

create policy departments_update on public.departments for update to authenticated
  using (tenant_id = (select app.tenant_id()) and (select app.user_role()) = 'admin')
  with check (tenant_id = (select app.tenant_id()) and (select app.user_role()) = 'admin');

-- ---------- Personen ----------
create policy profiles_select on public.profiles for select to authenticated
  using (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) in ('qm', 'admin')
      or id = (select app.profile_id())
      or ((select app.user_role()) = 'line' and department_id = (select app.department_id()))
    )
  );

-- Die Stationsleitung darf Mitarbeitende ihrer Abteilung erfassen und bearbeiten,
-- aber keine Rollen vergeben. Das darf nur der Administrator.
create policy profiles_insert on public.profiles for insert to authenticated
  with check (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) = 'admin'
      or ((select app.user_role()) = 'line' and role = 'employee' and department_id = (select app.department_id()))
    )
  );

create policy profiles_update on public.profiles for update to authenticated
  using (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) = 'admin'
      or ((select app.user_role()) = 'line' and role = 'employee' and department_id = (select app.department_id()))
    )
  )
  with check (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) = 'admin'
      or ((select app.user_role()) = 'line' and role = 'employee' and department_id = (select app.department_id()))
    )
  );

-- ---------- Geräte ----------
create policy devices_select on public.devices for select to authenticated
  using (tenant_id = (select app.tenant_id()));

create policy devices_insert on public.devices for insert to authenticated
  with check (tenant_id = (select app.tenant_id()) and (select app.user_role()) in ('line', 'admin'));

create policy devices_update on public.devices for update to authenticated
  using (tenant_id = (select app.tenant_id()) and (select app.user_role()) in ('line', 'admin'))
  with check (tenant_id = (select app.tenant_id()) and (select app.user_role()) in ('line', 'admin'));

-- ---------- Geräte pro Abteilung ----------
create policy department_devices_select on public.department_devices for select to authenticated
  using (tenant_id = (select app.tenant_id()));

create policy department_devices_insert on public.department_devices for insert to authenticated
  with check (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) = 'admin'
      or ((select app.user_role()) = 'line' and department_id = (select app.department_id()))
    )
  );

create policy department_devices_delete on public.department_devices for delete to authenticated
  using (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) = 'admin'
      or ((select app.user_role()) = 'line' and department_id = (select app.department_id()))
    )
  );

-- ---------- Zuteilungen ----------
create policy assignments_select on public.assignments for select to authenticated
  using (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) in ('qm', 'admin')
      or profile_id = (select app.profile_id())
      or ((select app.user_role()) = 'line' and app.in_my_department(profile_id))
    )
  );

create policy assignments_insert on public.assignments for insert to authenticated
  with check (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) = 'admin'
      or ((select app.user_role()) = 'line' and app.in_my_department(profile_id))
    )
  );

create policy assignments_delete on public.assignments for delete to authenticated
  using (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) = 'admin'
      or ((select app.user_role()) = 'line' and app.in_my_department(profile_id))
    )
  );

-- ---------- Schulungsnachweise: lesen und neu erfassen, sonst nichts ----------
create policy certificates_select on public.certificates for select to authenticated
  using (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) in ('qm', 'admin')
      or profile_id = (select app.profile_id())
      or ((select app.user_role()) = 'line' and app.in_my_department(profile_id))
    )
  );

create policy certificates_insert on public.certificates for insert to authenticated
  with check (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) = 'admin'
      or ((select app.user_role()) = 'line' and app.in_my_department(profile_id))
    )
  );

-- ---------- Änderungsprotokoll: nur lesen ----------
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) in ('qm', 'admin')
      or ((select app.user_role()) = 'line' and department_id = (select app.department_id()))
    )
  );

-- ---------- Erinnerungen ----------
create policy reminder_settings_select on public.reminder_settings for select to authenticated
  using (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) in ('qm', 'admin')
      or ((select app.user_role()) = 'line' and department_id = (select app.department_id()))
    )
  );

create policy reminder_settings_insert on public.reminder_settings for insert to authenticated
  with check (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) = 'admin'
      or ((select app.user_role()) = 'line' and department_id = (select app.department_id()))
    )
  );

create policy reminder_settings_update on public.reminder_settings for update to authenticated
  using (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) = 'admin'
      or ((select app.user_role()) = 'line' and department_id = (select app.department_id()))
    )
  )
  with check (
    tenant_id = (select app.tenant_id())
    and (
      (select app.user_role()) = 'admin'
      or ((select app.user_role()) = 'line' and department_id = (select app.department_id()))
    )
  );


-- =====================================================================
-- 5. FUNKTIONEN FÜR DIE APP
-- =====================================================================

-- Stand jeder Soll-Schulung: letzte Schulung und Ablaufdatum.
-- Die Sicht gibt nur zurück, was die angemeldete Person ohnehin sehen darf.
create view public.training_status with (security_invoker = true) as
select
  a.tenant_id,
  a.profile_id,
  a.device_id,
  latest.trained_at as last_trained_at,
  (latest.trained_at + make_interval(months => d.interval_months))::date as valid_until
from public.assignments a
join public.devices d on d.tenant_id = a.tenant_id and d.id = a.device_id
left join lateral (
  select c.trained_at
  from public.certificates c
  where c.tenant_id = a.tenant_id and c.profile_id = a.profile_id and c.device_id = a.device_id
  order by c.trained_at desc
  limit 1
) latest on true
where d.active and d.interval_months > 0;

-- Nach der ersten Anmeldung: verknüpft das Login mit der Person, die mit
-- derselben bestätigten E-Mail-Adresse erfasst wurde. Gibt die Profil-ID zurück.
create function public.link_profile() returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_profile uuid;
  v_matches uuid[];
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet.';
  end if;

  select p.id into v_profile from public.profiles p where p.user_id = v_uid;
  if v_profile is not null then
    return v_profile;
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then
    return null;
  end if;

  select array_agg(p.id) into v_matches
  from public.profiles p
  where lower(p.email) = v_email and p.user_id is null and p.active;

  if v_matches is null then
    return null;
  end if;
  if cardinality(v_matches) > 1 then
    raise exception 'Diese E-Mail-Adresse ist in mehreren Einrichtungen erfasst. Bitte den Support kontaktieren.';
  end if;

  update public.profiles set user_id = v_uid where id = v_matches[1];
  return v_matches[1];
end
$$;

-- Rolle vergeben: nur der Administrator, nur in der eigenen Einrichtung.
create function public.set_profile_role(p_profile uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid := app.tenant_id();
  v_person public.profiles;
begin
  if app.user_role() is distinct from 'admin' then
    raise exception 'Nur Administratoren dürfen Rollen vergeben.';
  end if;

  select p.* into v_person from public.profiles p where p.id = p_profile and p.tenant_id = v_tenant;
  if not found then
    raise exception 'Person nicht gefunden.';
  end if;

  -- Die Einrichtung darf nie ohne Administrator dastehen
  if v_person.role = 'admin' and p_role <> 'admin' and not exists (
    select 1 from public.profiles p
    where p.tenant_id = v_tenant and p.role = 'admin' and p.active and p.id <> p_profile
  ) then
    raise exception 'Es braucht mindestens einen Administrator.';
  end if;

  update public.profiles set role = p_role where id = p_profile;
  perform app.log_action(v_tenant, v_person.department_id, 'Rolle geändert: ' || v_person.name || ', neu ' || p_role);
end
$$;


-- =====================================================================
-- 6. RECHTE
--    Zuerst alles entziehen, dann gezielt erlauben. Wer nicht angemeldet
--    ist (anon), darf nichts. Rolle, Login-Verknüpfung, Nachweis-Art und
--    Protokoll kann die App nicht direkt schreiben.
-- =====================================================================

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema app from public, anon, authenticated;

grant usage on schema app to authenticated;
grant execute on function app.tenant_id(), app.profile_id(), app.user_role(), app.department_id(), app.in_my_department(uuid) to authenticated;
grant execute on function public.link_profile(), public.set_profile_role(uuid, public.app_role) to authenticated;

grant select on public.tenants, public.departments, public.profiles, public.devices, public.department_devices,
  public.assignments, public.certificates, public.audit_logs, public.reminder_settings, public.training_status to authenticated;

grant insert (tenant_id, name, short_name), update (name, short_name) on public.departments to authenticated;

grant insert (tenant_id, name, job_title, pers_no, email, role, department_id, active),
      update (name, job_title, pers_no, email, department_id, active) on public.profiles to authenticated;

grant insert (tenant_id, model, category, vendor, risk_class, interval_months, active),
      update (model, category, vendor, risk_class, interval_months, active) on public.devices to authenticated;

grant insert, delete on public.department_devices to authenticated;

grant insert (tenant_id, profile_id, device_id), delete on public.assignments to authenticated;

grant insert (tenant_id, profile_id, device_id, trained_at, instructor, signature_png) on public.certificates to authenticated;

grant insert (tenant_id, department_id, email, lead_days, include_expired, include_missing),
      update (email, lead_days, include_expired, include_missing) on public.reminder_settings to authenticated;
