-- Indizes für die zusammengesetzten Verweise (Hinweis des Supabase-Prüfwerkzeugs)
create index assignments_profile_idx on public.assignments (tenant_id, profile_id);
create index certificates_device_idx on public.certificates (tenant_id, device_id);
create index department_devices_department_idx on public.department_devices (tenant_id, department_id);
create index department_devices_device_idx on public.department_devices (tenant_id, device_id);
create index reminder_settings_department_idx on public.reminder_settings (tenant_id, department_id);
