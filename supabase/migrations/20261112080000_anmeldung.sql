-- =====================================================================
-- geraetepass.ch: Anmeldung
--
--   1. Einrichtungscode (für die Anmeldung auf Stations-Tablets)
--   2. PIN pro Person, gespeichert nur als Hash in einem Schema, das
--      der Browser nicht erreicht
--   3. PIN festlegen (Person selbst, Stationsleitung, Administrator)
--   4. PIN prüfen (nur die Serverfunktion "pin-login"), mit Sperre nach
--      fünf Fehlversuchen
--   5. Neue Einrichtung anlegen (nur wir, nicht die App)
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;


-- ---------- 1. Einrichtungscode ----------
-- Kurzer Code wie "spital-muster". Auf dem Tablet einmal eingeben, danach
-- melden sich die Mitarbeitenden nur noch mit Personalnummer und PIN an.
alter table public.tenants add column code text;
update public.tenants set code = 'einrichtung-' || left(id::text, 8) where code is null;
alter table public.tenants alter column code set not null;
alter table public.tenants add constraint tenants_code_format check (code ~ '^[a-z0-9][a-z0-9-]{2,29}$');
create unique index tenants_code_key on public.tenants (code);


-- ---------- 2. PIN ----------
create table app.profile_pins (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
create index profile_pins_tenant_idx on app.profile_pins (tenant_id);
-- Kein Zugriff von aussen, auch nicht lesend. Nur die Funktionen unten arbeiten damit.
alter table app.profile_pins enable row level security;
revoke all on app.profile_pins from public, anon, authenticated;


-- ---------- 3. PIN festlegen oder entfernen (p_pin = null) ----------
create function public.set_pin(p_profile uuid, p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.app_role := app.user_role();
  v_person public.profiles;
begin
  select p.* into v_person from public.profiles p
  where p.id = p_profile and p.tenant_id = app.tenant_id() and p.active;
  if not found then
    raise exception 'Person nicht gefunden.';
  end if;

  -- Erlaubt: die Person selbst, der Administrator, die Stationsleitung für Mitarbeitende ihrer Abteilung
  if not (
    v_person.id = app.profile_id()
    or v_role = 'admin'
    or (v_role = 'line' and v_person.role = 'employee' and v_person.department_id = app.department_id())
  ) then
    raise exception 'Keine Berechtigung, für diese Person eine PIN festzulegen.';
  end if;

  if p_pin is null then
    delete from app.profile_pins where profile_id = p_profile;
    perform app.log_action(v_person.tenant_id, v_person.department_id, 'PIN entfernt: ' || v_person.name);
    return;
  end if;

  if p_pin !~ '^[0-9]{6,8}$' then
    raise exception 'Die PIN besteht aus 6 bis 8 Ziffern.';
  end if;
  if p_pin ~ '^(.)\1+$'
     or position(p_pin in '01234567890123456789') > 0
     or position(p_pin in '98765432109876543210') > 0 then
    raise exception 'Diese PIN ist zu einfach. Bitte keine Folgen wie 123456 oder 111111.';
  end if;
  if v_person.pers_no is null or trim(v_person.pers_no) = '' then
    raise exception 'Für die Anmeldung mit PIN braucht die Person eine Personalnummer.';
  end if;

  insert into app.profile_pins (profile_id, tenant_id, pin_hash)
  values (p_profile, v_person.tenant_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)))
  on conflict (profile_id) do update
    set pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null, updated_at = now();

  perform app.log_action(v_person.tenant_id, v_person.department_id, 'PIN festgelegt: ' || v_person.name);
end
$$;

-- Wer hat eine PIN? Nur für Personen, die die angemeldete Person ohnehin sieht.
create function public.pin_status() returns table (profile_id uuid, locked boolean)
language sql stable security definer set search_path = '' as $$
  select pp.profile_id, coalesce(pp.locked_until > now(), false)
  from app.profile_pins pp
  join public.profiles p on p.id = pp.profile_id
  where p.tenant_id = app.tenant_id()
    and (
      app.user_role() in ('admin', 'qm')
      or p.id = app.profile_id()
      or (app.user_role() = 'line' and p.department_id = app.department_id())
    )
$$;


-- ---------- 4. PIN prüfen: nur für die Serverfunktion ----------
-- Gibt 'ok' mit Profil und Login zurück, sonst 'invalid' oder 'locked'.
-- Wirft bewusst keine Fehler, damit der Zähler der Fehlversuche gespeichert bleibt.
create function public.verify_pin(p_code text, p_pers_no text, p_pin text)
returns table (status text, profile_id uuid, user_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_pin app.profile_pins;
  v_failed integer;
begin
  select p.* into v_profile
  from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where t.code = lower(trim(p_code)) and lower(p.pers_no) = lower(trim(p_pers_no)) and p.active;

  if v_profile.id is not null then
    select pp.* into v_pin from app.profile_pins pp where pp.profile_id = v_profile.id for update;
  end if;

  if v_pin.profile_id is null then
    -- Gleich viel Rechenzeit wie bei einer echten Prüfung: verrät nicht, ob es die Person gibt
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
    return query select 'ok'::text, v_profile.id, v_profile.user_id;
    return;
  end if;

  -- Fünf Fehlversuche in Folge sperren die PIN für 15 Minuten
  v_failed := v_pin.failed_attempts + 1;
  if v_failed >= 5 then
    update app.profile_pins set failed_attempts = 0, locked_until = now() + interval '15 minutes'
    where app.profile_pins.profile_id = v_pin.profile_id;
    perform app.log_action(v_profile.tenant_id, v_profile.department_id, 'PIN nach 5 Fehlversuchen gesperrt: ' || v_profile.name);
    return query select 'locked'::text, null::uuid, null::uuid;
  else
    update app.profile_pins set failed_attempts = v_failed where app.profile_pins.profile_id = v_pin.profile_id;
    return query select 'invalid'::text, null::uuid, null::uuid;
  end if;
end
$$;


-- ---------- 5. Neue Einrichtung mit erstem Administrator ----------
-- Nur für uns (Service-Zugang). Der Administrator meldet sich danach mit
-- seiner E-Mail-Adresse an und wird über link_profile() verknüpft.
create function public.create_tenant(p_name text, p_code text, p_admin_name text, p_admin_email text, p_plan text default 'pilot')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
begin
  insert into public.tenants (name, code, plan)
  values (trim(p_name), lower(trim(p_code)), p_plan)
  returning id into v_tenant;

  insert into public.profiles (tenant_id, name, role, email)
  values (v_tenant, trim(p_admin_name), 'admin', lower(trim(p_admin_email)));

  return v_tenant;
end
$$;


-- ---------- Rechte ----------
revoke all on function public.set_pin(uuid, text), public.pin_status(), public.verify_pin(text, text, text),
  public.create_tenant(text, text, text, text, text) from public, anon, authenticated;

grant execute on function public.set_pin(uuid, text), public.pin_status() to authenticated;
grant execute on function public.verify_pin(text, text, text), public.create_tenant(text, text, text, text, text) to service_role;
