-- Bildet für lokale Tests nach, was Supabase mitbringt: die Rollen, das Schema
-- "auth" und die grosszügigen Standardrechte. Wird NICHT in Supabase eingespielt.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema extensions;
create extension pgcrypto with schema extensions;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  email_confirmed_at timestamptz
);

-- Wer angemeldet ist, steht wie bei Supabase in den Angaben des Anmelde-Tokens
create function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;

-- Supabase gibt neuen Tabellen und Funktionen in "public" von Haus aus alle Rechte.
-- Die Tests laufen mit derselben Voreinstellung, damit sie beweisen, dass die
-- Migration diese Rechte wirklich entzieht.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
