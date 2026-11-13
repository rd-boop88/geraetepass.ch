-- =====================================================================
-- geraetepass.ch: Geräte bearbeiten und Stations-Tablets
--
--   1. Änderungen an Geräten und das Entfernen aus einer Abteilung
--      landen im Änderungsprotokoll.
--   2. Stations-Tablets: Eine Stationsleitung richtet ein Gerät einmal für
--      ihre Station ein. Danach zeigt es beim Anmelden die Namensliste der
--      Station; man tippt auf den eigenen Namen und gibt die PIN ein.
--      Das Gerät erhält dafür einen langen Zufallsschlüssel. Gespeichert
--      wird nur dessen Hash.
-- =====================================================================


-- ---------- 1. Protokoll für Geräte ----------

create function app.device_update_log() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_changes text[] := '{}';
begin
  if new.model is distinct from old.model then
    v_changes := v_changes || ('Modell ' || old.model || ' → ' || new.model);
  end if;
  if new.category is distinct from old.category then
    v_changes := v_changes || ('Gerätetyp ' || coalesce(old.category, '–') || ' → ' || coalesce(new.category, '–'));
  end if;
  if new.vendor is distinct from old.vendor then
    v_changes := v_changes || ('Hersteller ' || coalesce(old.vendor, '–') || ' → ' || coalesce(new.vendor, '–'));
  end if;
  if new.risk_class is distinct from old.risk_class then
    v_changes := v_changes || ('Klasse ' || coalesce(old.risk_class, '–') || ' → ' || coalesce(new.risk_class, '–'));
  end if;
  if new.interval_months is distinct from old.interval_months then
    v_changes := v_changes || ('Intervall ' || old.interval_months || ' → ' || new.interval_months || ' Monate');
  end if;
  if new.active is distinct from old.active then
    v_changes := v_changes || (case when new.active then 'wieder aktiv' else 'ausser Betrieb' end);
  end if;
  if cardinality(v_changes) > 0 then
    perform app.log_action(new.tenant_id, null, 'Gerät geändert: ' || new.model || ' (' || array_to_string(v_changes, ', ') || ')');
  end if;
  return null;
end
$$;

create trigger device_update_log after update on public.devices
for each row execute function app.device_update_log();

create function app.department_device_removed_log() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_model text;
  v_dept text;
begin
  select d.model into v_model from public.devices d where d.id = old.device_id;
  select d.name into v_dept from public.departments d where d.id = old.department_id;
  if v_model is null or v_dept is null then
    return null; -- Abteilung oder Gerät werden gerade ganz gelöscht
  end if;
  perform app.log_action(old.tenant_id, old.department_id, 'Gerät aus ' || v_dept || ' entfernt: ' || v_model);
  return null;
end
$$;

create trigger department_device_removed_log after delete on public.department_devices
for each row execute function app.department_device_removed_log();


-- ---------- 2. Stations-Tablets ----------

create table app.station_devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  department_id uuid not null,
  token_hash text not null unique,
  label text not null check (length(trim(label)) between 1 and 60),
  created_by uuid,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  foreign key (tenant_id, department_id) references public.departments (tenant_id, id) on delete cascade
);
create index station_devices_department_idx on app.station_devices (tenant_id, department_id);
alter table app.station_devices enable row level security;
revoke all on app.station_devices from public, anon, authenticated;

create function app.token_hash(p_token text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;

-- Darf die angemeldete Person Tablets dieser Abteilung verwalten?
create function app.can_manage_station(p_department uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.departments d
    where d.id = p_department and d.tenant_id = app.tenant_id()
  )
  and (
    app.user_role() = 'admin'
    or (app.user_role() = 'line' and app.department_id() = p_department)
  )
$$;

-- Dieses Gerät als Stations-Tablet einrichten. Gibt den Schlüssel genau einmal zurück.
create function public.register_station(p_department uuid, p_label text)
returns table (station_id uuid, station_token text)
language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_label text := trim(coalesce(p_label, ''));
  v_id uuid;
begin
  if not app.can_manage_station(p_department) then
    raise exception 'Keine Berechtigung, für diese Abteilung ein Tablet einzurichten.';
  end if;
  if v_label = '' or length(v_label) > 60 then
    raise exception 'Bitte dem Tablet einen kurzen Namen geben, zum Beispiel «Tablet Stationszimmer».';
  end if;
  insert into app.station_devices (tenant_id, department_id, token_hash, label, created_by)
  values (app.tenant_id(), p_department, app.token_hash(v_token), v_label, app.profile_id())
  returning id into v_id;
  perform app.log_action(app.tenant_id(), p_department, 'Stations-Tablet eingerichtet: ' || v_label);
  station_id := v_id;
  station_token := v_token;
  return next;
end
$$;

-- Eingerichtete Tablets, die die angemeldete Person sehen darf
create function public.list_stations()
returns table (id uuid, department_id uuid, label text, created_at timestamptz, last_used_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.department_id, s.label, s.created_at, s.last_used_at
  from app.station_devices s
  where s.tenant_id = app.tenant_id()
    and (
      app.user_role() in ('admin', 'qm')
      or (app.user_role() = 'line' and s.department_id = app.department_id())
    )
  order by s.created_at
$$;

-- Ein Tablet abmelden (verloren, ersetzt): Es zeigt danach keine Namensliste mehr.
create function public.remove_station(p_station uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_station app.station_devices;
begin
  select s.* into v_station from app.station_devices s where s.id = p_station and s.tenant_id = app.tenant_id();
  if v_station.id is null or not app.can_manage_station(v_station.department_id) then
    raise exception 'Tablet nicht gefunden.';
  end if;
  delete from app.station_devices where id = p_station;
  perform app.log_action(v_station.tenant_id, v_station.department_id, 'Stations-Tablet entfernt: ' || v_station.label);
end
$$;

-- Für den Anmeldebildschirm des Tablets, ohne Anmeldung aufrufbar:
-- Einrichtung, Station und die Namen der Personen mit PIN. Ohne gültigen Schlüssel: null.
create function public.station_team(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'tenant', t.name,
    'code', t.code,
    'department', d.name,
    'team', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.name)
      from public.profiles p
      join app.profile_pins pp on pp.profile_id = p.id
      where p.tenant_id = s.tenant_id and p.department_id = s.department_id and p.active
    ), '[]'::jsonb)
  )
  from app.station_devices s
  join public.tenants t on t.id = s.tenant_id
  join public.departments d on d.id = s.department_id
  where s.token_hash = app.token_hash(p_token)
$$;


-- ---------- PIN-Prüfung für beide Wege ----------
-- Gemeinsamer Kern: zählt Fehlversuche, sperrt nach fünf.
create function app.check_pin(p_profile public.profiles, p_pin text)
returns table (status text, profile_id uuid, user_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_pin app.profile_pins;
  v_failed integer;
begin
  if p_profile.id is not null and p_profile.active then
    select pp.* into v_pin from app.profile_pins pp where pp.profile_id = p_profile.id for update;
  end if;

  if v_pin.profile_id is null then
    perform extensions.crypt(coalesce(p_pin, ''), extensions.gen_salt('bf', 8));
    return query select 'invalid'::text, null::uuid, null::uuid;
    return;
  end if;

  if v_pin.locked_until > now() then
    return query select 'locked'::text, null::uuid, null::uuid;
    return;
  end if;

  if extensions.crypt(coalesce(p_pin, ''), v_pin.pin_hash) = v_pin.pin_hash then
    update app.profile_pins set failed_attempts = 0, locked_until = null where app.profile_pins.profile_id = v_pin.profile_id;
    return query select 'ok'::text, p_profile.id, p_profile.user_id;
    return;
  end if;

  v_failed := v_pin.failed_attempts + 1;
  if v_failed >= 5 then
    update app.profile_pins set failed_attempts = 0, locked_until = now() + interval '15 minutes'
    where app.profile_pins.profile_id = v_pin.profile_id;
    perform app.log_action(p_profile.tenant_id, p_profile.department_id, 'PIN nach 5 Fehlversuchen gesperrt: ' || p_profile.name);
    return query select 'locked'::text, null::uuid, null::uuid;
  else
    update app.profile_pins set failed_attempts = v_failed where app.profile_pins.profile_id = v_pin.profile_id;
    return query select 'invalid'::text, null::uuid, null::uuid;
  end if;
end
$$;

-- Mit Einrichtungscode und Personalnummer (ersetzt die bisherige Fassung, gleiches Verhalten)
create or replace function public.verify_pin(p_code text, p_pers_no text, p_pin text)
returns table (status text, profile_id uuid, user_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
begin
  select p.* into v_profile
  from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where t.code = lower(trim(p_code)) and lower(p.pers_no) = lower(trim(p_pers_no)) and p.active;
  return query select * from app.check_pin(v_profile, p_pin);
end
$$;

-- Am Stations-Tablet: Schlüssel des Tablets und gewählte Person aus der Namensliste
create function public.verify_pin_station(p_token text, p_profile uuid, p_pin text)
returns table (status text, profile_id uuid, user_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_station app.station_devices;
  v_profile public.profiles;
begin
  select s.* into v_station from app.station_devices s where s.token_hash = app.token_hash(p_token);
  if v_station.id is null then
    return query select 'no_station'::text, null::uuid, null::uuid;
    return;
  end if;
  update app.station_devices set last_used_at = now() where id = v_station.id;

  select p.* into v_profile from public.profiles p
  where p.id = p_profile and p.tenant_id = v_station.tenant_id and p.department_id = v_station.department_id and p.active;
  return query select * from app.check_pin(v_profile, p_pin);
end
$$;


-- ---------- Rechte ----------
revoke all on function app.device_update_log(), app.department_device_removed_log(), app.token_hash(text),
  app.can_manage_station(uuid), app.check_pin(public.profiles, text) from public, anon, authenticated;
revoke all on function public.register_station(uuid, text), public.list_stations(), public.remove_station(uuid),
  public.station_team(text), public.verify_pin_station(text, uuid, text) from public, anon, authenticated;
revoke all on function public.verify_pin(text, text, text) from public, anon, authenticated;

grant execute on function public.register_station(uuid, text), public.list_stations(), public.remove_station(uuid) to authenticated;
grant execute on function public.station_team(text) to anon, authenticated;
grant execute on function public.verify_pin(text, text, text), public.verify_pin_station(text, uuid, text) to service_role;
