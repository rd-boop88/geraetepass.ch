-- =====================================================================
-- geraetepass.ch: Anmeldung nur noch mit Personalnummer und PIN
--
--   - Die Stationsleitung (oder der Administrator) erzeugt eine Start-PIN
--     und händigt sie aus. Beim ersten Anmelden legt die Person ihre
--     eigene PIN fest.
--   - Keine Anmeldung per E-Mail mehr: link_profile() entfällt, und die
--     Datenbank nimmt nur noch Logins an, die die PIN-Anmeldung selbst
--     anlegt. Fremde können so auch keine leeren Konten erstellen.
-- =====================================================================

alter table app.profile_pins add column must_change boolean not null default false;

drop function public.link_profile();
drop function public.set_pin(uuid, text);
drop function public.pin_status();
drop function public.create_tenant(text, text, text, text, text);


-- ---------- Hilfsfunktionen ----------

-- Zu einfache PINs: gleiche Ziffern oder auf-/absteigende Folgen
create function app.pin_too_simple(p_pin text) returns boolean
language sql immutable set search_path = '' as $$
  select p_pin ~ '^(.)\1+$'
    or position(p_pin in '01234567890123456789') > 0
    or position(p_pin in '98765432109876543210') > 0
$$;

-- Zufällige 6-stellige Start-PIN (kryptografischer Zufall, keine einfachen Muster)
create function app.new_pin() returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_pin text;
begin
  loop
    v_pin := lpad((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0');
    exit when not app.pin_too_simple(v_pin);
  end loop;
  return v_pin;
end
$$;

-- PIN speichern (nur als Hash). Setzt Fehlversuche und Sperre zurück.
create function app.store_pin(p_profile uuid, p_tenant uuid, p_pin text, p_must_change boolean) returns void
language sql volatile security definer set search_path = '' as $$
  insert into app.profile_pins (profile_id, tenant_id, pin_hash, must_change)
  values (p_profile, p_tenant, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)), p_must_change)
  on conflict (profile_id) do update
    set pin_hash = excluded.pin_hash, must_change = excluded.must_change,
        failed_attempts = 0, locked_until = null, updated_at = now()
$$;


-- ---------- Start-PINs erzeugen (Stationsleitung, Administrator) ----------
-- Gibt die PINs genau einmal im Klartext zurück, damit sie ausgehändigt werden können.
create function public.issue_pins(p_profiles uuid[])
returns table (profile_id uuid, name text, pers_no text, pin text)
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.app_role := app.user_role();
  v_person public.profiles;
  v_pin text;
begin
  if v_role is distinct from 'admin' and v_role is distinct from 'line' then
    raise exception 'Nur Stationsleitung und Administrator können Start-PINs erzeugen.';
  end if;

  for v_person in
    select p.* from public.profiles p
    where p.id = any (p_profiles) and p.tenant_id = app.tenant_id()
    order by p.name
  loop
    if not v_person.active then
      raise exception 'Für ausgetretene Personen gibt es keine PIN: %', v_person.name;
    end if;
    if v_person.id = app.profile_id() then
      raise exception 'Die eigene PIN ändern Sie unter «Mein Gerätepass».';
    end if;
    if v_role = 'line' and (v_person.role <> 'employee' or v_person.department_id is distinct from app.department_id()) then
      raise exception 'Keine Berechtigung für %.', v_person.name;
    end if;
    if v_person.pers_no is null or trim(v_person.pers_no) = '' then
      raise exception 'Für % fehlt die Personalnummer. Sie ist für die Anmeldung nötig.', v_person.name;
    end if;

    v_pin := app.new_pin();
    perform app.store_pin(v_person.id, v_person.tenant_id, v_pin, true);
    perform app.log_action(v_person.tenant_id, v_person.department_id, 'Start-PIN ausgegeben: ' || v_person.name);

    profile_id := v_person.id;
    name := v_person.name;
    pers_no := v_person.pers_no;
    pin := v_pin;
    return next;
  end loop;

  if not found then
    raise exception 'Keine passende Person gefunden.';
  end if;
end
$$;


-- ---------- Eigene PIN festlegen (jede angemeldete Person) ----------
create function public.change_own_pin(p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_person public.profiles;
begin
  select p.* into v_person from public.profiles p where p.id = app.profile_id();
  if v_person.id is null then
    raise exception 'Nicht angemeldet.';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{6,8}$' then
    raise exception 'Die PIN besteht aus 6 bis 8 Ziffern.';
  end if;
  if app.pin_too_simple(p_pin) then
    raise exception 'Diese PIN ist zu einfach. Bitte keine Folgen wie 123456 oder 111111.';
  end if;
  perform app.store_pin(v_person.id, v_person.tenant_id, p_pin, false);
end
$$;


-- ---------- Stand der PINs: wer hat eine, wer muss sie noch ändern ----------
create function public.pin_status() returns table (profile_id uuid, locked boolean, must_change boolean)
language sql stable security definer set search_path = '' as $$
  select pp.profile_id, coalesce(pp.locked_until > now(), false), pp.must_change
  from app.profile_pins pp
  join public.profiles p on p.id = pp.profile_id
  where p.tenant_id = app.tenant_id()
    and (
      app.user_role() in ('admin', 'qm')
      or p.id = app.profile_id()
      or (app.user_role() = 'line' and p.department_id = app.department_id())
    )
$$;


-- ---------- Neue Einrichtung mit erstem Administrator (nur wir) ----------
-- Gibt die Start-PIN des Administrators zurück.
create function public.create_tenant(p_name text, p_code text, p_admin_name text, p_admin_pers_no text, p_plan text default 'pilot')
returns table (tenant_id uuid, start_pin text)
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_profile uuid;
  v_pin text := app.new_pin();
begin
  insert into public.tenants (name, code, plan)
  values (trim(p_name), lower(trim(p_code)), p_plan)
  returning id into v_tenant;

  insert into public.profiles (tenant_id, name, role, pers_no)
  values (v_tenant, trim(p_admin_name), 'admin', trim(p_admin_pers_no))
  returning id into v_profile;

  perform app.store_pin(v_profile, v_tenant, v_pin, true);

  tenant_id := v_tenant;
  start_pin := v_pin;
  return next;
end
$$;


-- ---------- Nur Logins der PIN-Anmeldung zulassen ----------
-- Die Edge Function "pin-login" legt Logins mit einer Platzhalter-Adresse an.
-- Alles andere (z.B. jemand, der sich über die Supabase-Schnittstelle mit
-- einer eigenen E-Mail-Adresse registrieren will) wird abgewiesen.
create function app.only_pin_logins() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.email is null or new.email !~ '^pin-[0-9a-f-]{36}@pin\.geraetepass\.ch$' then
    raise exception 'Anmeldung nur mit Personalnummer und PIN.';
  end if;
  return new;
end
$$;

create trigger only_pin_logins before insert or update of email on auth.users
for each row execute function app.only_pin_logins();


-- ---------- Rechte ----------
revoke all on function app.pin_too_simple(text), app.new_pin(), app.store_pin(uuid, uuid, text, boolean), app.only_pin_logins()
  from public, anon, authenticated;
revoke all on function public.issue_pins(uuid[]), public.change_own_pin(text), public.pin_status(),
  public.create_tenant(text, text, text, text, text) from public, anon, authenticated;

grant execute on function public.issue_pins(uuid[]), public.change_own_pin(text), public.pin_status() to authenticated;
grant execute on function public.create_tenant(text, text, text, text, text) to service_role;
