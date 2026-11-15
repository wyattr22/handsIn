-- HandsIn medication scanner: private, versioned, care-circle scoped data.
create extension if not exists pgcrypto;

create type public.circle_role as enum ('coordinator', 'caregiver', 'helper', 'recipient');
create type public.medication_product_type as enum ('prescription', 'otc', 'supplement');
create type public.medication_state as enum ('draft', 'proposed', 'active', 'archived');
create type public.review_state as enum ('read_clearly', 'needs_review', 'missing', 'conflicts', 'corrected', 'confirmed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Caregiver'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.care_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.care_circle_memberships (
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.circle_role not null,
  can_view_source_images boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create table public.care_recipients (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  display_name text not null,
  timezone text not null default 'America/Los_Angeles',
  routine jsonb not null default '{"wake":"07:00","breakfast":"08:00","lunch":"12:30","dinner":"18:30","bedtime":"22:00"}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.medication_items (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  product_type public.medication_product_type not null,
  state public.medication_state not null default 'draft',
  current_version_id uuid,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.medication_versions (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medication_items(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  medication_name text not null,
  active_ingredient text,
  rxcui text,
  strength text,
  dosage_form text,
  directions text,
  prescriber text,
  pharmacy text,
  quantity text,
  expiration_date date,
  field_review jsonb not null default '{}'::jsonb,
  source text not null default 'manual',
  created_by uuid not null references public.profiles(id),
  confirmed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (medication_id, version_number)
);

alter table public.medication_items add constraint medication_items_current_version_fk
  foreign key (current_version_id) references public.medication_versions(id);

create table public.medication_private_details (
  medication_id uuid primary key references public.medication_items(id) on delete cascade,
  prescription_number text,
  refills_remaining integer,
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.medication_schedules (
  id uuid primary key default gen_random_uuid(),
  medication_version_id uuid not null references public.medication_versions(id) on delete cascade,
  as_needed boolean not null default false,
  schedule_kind text not null check (schedule_kind in ('fixed', 'interval', 'manual', 'none')),
  rationale text,
  active boolean not null default false,
  confirmed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.medication_schedule_times (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.medication_schedules(id) on delete cascade,
  local_time time not null,
  sort_order smallint not null default 0
);

create table public.medication_uploads (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medication_items(id) on delete cascade,
  storage_path text not null unique,
  category text not null check (category in ('pharmacy_label', 'directions', 'facts', 'other')),
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medication_items(id) on delete cascade,
  status text not null check (status in ('queued', 'processing', 'needs_review', 'complete', 'failed')),
  raw_text text,
  structured_draft jsonb,
  error_code text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.interaction_reviews (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  medication_version_id uuid not null references public.medication_versions(id) on delete cascade,
  provider text not null,
  status text not null check (status in ('complete', 'incomplete', 'unavailable', 'failed')),
  disclaimer text not null,
  checked_at timestamptz not null default now()
);

create table public.interaction_findings (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.interaction_reviews(id) on delete cascade,
  finding_type text not null,
  severity text,
  summary text not null,
  source_name text not null,
  source_url text,
  source_payload jsonb,
  created_at timestamptz not null default now()
);

create table public.interaction_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.interaction_reviews(id) on delete cascade,
  acknowledged_by uuid not null references public.profiles(id),
  note text,
  acknowledged_at timestamptz not null default now(),
  unique (review_id, acknowledged_by)
);

create table public.care_audit_events (
  id bigint generated always as identity primary key,
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_circle_member(requested_circle_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.care_circle_memberships m
    where m.circle_id = requested_circle_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_circle_coordinator(requested_circle_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.care_circle_memberships m
    where m.circle_id = requested_circle_id and m.user_id = auth.uid() and m.role = 'coordinator'
  );
$$;

create or replace function public.create_care_circle(circle_name text, recipient_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_circle_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(circle_name)) < 2 or length(trim(recipient_name)) < 1 then
    raise exception 'Circle and recipient names are required';
  end if;
  insert into public.profiles (id, display_name)
  values (auth.uid(), coalesce((select email from auth.users where id = auth.uid()), 'Caregiver'))
  on conflict (id) do nothing;
  insert into public.care_circles (name, created_by)
  values (trim(circle_name), auth.uid()) returning id into new_circle_id;
  insert into public.care_circle_memberships (circle_id, user_id, role)
  values (new_circle_id, auth.uid(), 'coordinator');
  insert into public.care_recipients (circle_id, display_name)
  values (new_circle_id, trim(recipient_name));
  return new_circle_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.care_circles enable row level security;
alter table public.care_circle_memberships enable row level security;
alter table public.care_recipients enable row level security;
alter table public.medication_items enable row level security;
alter table public.medication_versions enable row level security;
alter table public.medication_private_details enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.medication_schedule_times enable row level security;
alter table public.medication_uploads enable row level security;
alter table public.extraction_jobs enable row level security;
alter table public.interaction_reviews enable row level security;
alter table public.interaction_findings enable row level security;
alter table public.interaction_acknowledgments enable row level security;
alter table public.care_audit_events enable row level security;

create policy "profiles readable by self" on public.profiles for select using (id = auth.uid());
create policy "profiles created by self" on public.profiles for insert with check (id = auth.uid());
create policy "profiles updated by self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "circles visible to members" on public.care_circles for select using (public.is_circle_member(id));
create policy "memberships visible to members" on public.care_circle_memberships for select using (public.is_circle_member(circle_id));
create policy "memberships managed by coordinators" on public.care_circle_memberships for all using (public.is_circle_coordinator(circle_id)) with check (public.is_circle_coordinator(circle_id));
create policy "recipients visible to circle" on public.care_recipients for select using (public.is_circle_member(circle_id));
create policy "recipients managed by coordinators" on public.care_recipients for all using (public.is_circle_coordinator(circle_id)) with check (public.is_circle_coordinator(circle_id));
create policy "medications visible to circle" on public.medication_items for select using (public.is_circle_member(circle_id));
create policy "members can create medication drafts" on public.medication_items for insert with check (public.is_circle_member(circle_id) and created_by = auth.uid() and state in ('draft', 'proposed'));
create policy "coordinators manage medications" on public.medication_items for update using (public.is_circle_coordinator(circle_id)) with check (public.is_circle_coordinator(circle_id));
create policy "versions visible to circle" on public.medication_versions for select using (exists (select 1 from public.medication_items i where i.id = medication_id and public.is_circle_member(i.circle_id)));
create policy "members propose versions" on public.medication_versions for insert with check (created_by = auth.uid() and exists (select 1 from public.medication_items i where i.id = medication_id and public.is_circle_member(i.circle_id)));
create policy "coordinators confirm versions" on public.medication_versions for update using (exists (select 1 from public.medication_items i where i.id = medication_id and public.is_circle_coordinator(i.circle_id)));
create policy "private details visible to coordinators" on public.medication_private_details for all using (exists (select 1 from public.medication_items i where i.id = medication_id and public.is_circle_coordinator(i.circle_id))) with check (exists (select 1 from public.medication_items i where i.id = medication_id and public.is_circle_coordinator(i.circle_id)));

create policy "schedules visible to circle" on public.medication_schedules for select using (exists (select 1 from public.medication_versions v join public.medication_items i on i.id = v.medication_id where v.id = medication_version_id and public.is_circle_member(i.circle_id)));
create policy "coordinators manage schedules" on public.medication_schedules for all using (exists (select 1 from public.medication_versions v join public.medication_items i on i.id = v.medication_id where v.id = medication_version_id and public.is_circle_coordinator(i.circle_id))) with check (exists (select 1 from public.medication_versions v join public.medication_items i on i.id = v.medication_id where v.id = medication_version_id and public.is_circle_coordinator(i.circle_id)));
create policy "schedule times follow schedule access" on public.medication_schedule_times for select using (exists (select 1 from public.medication_schedules s join public.medication_versions v on v.id = s.medication_version_id join public.medication_items i on i.id = v.medication_id where s.id = schedule_id and public.is_circle_member(i.circle_id)));
create policy "coordinators manage schedule times" on public.medication_schedule_times for all using (exists (select 1 from public.medication_schedules s join public.medication_versions v on v.id = s.medication_version_id join public.medication_items i on i.id = v.medication_id where s.id = schedule_id and public.is_circle_coordinator(i.circle_id))) with check (exists (select 1 from public.medication_schedules s join public.medication_versions v on v.id = s.medication_version_id join public.medication_items i on i.id = v.medication_id where s.id = schedule_id and public.is_circle_coordinator(i.circle_id)));

create policy "uploads visible to image-enabled members" on public.medication_uploads for select using (exists (select 1 from public.medication_items i join public.care_circle_memberships m on m.circle_id = i.circle_id where i.id = medication_id and m.user_id = auth.uid() and m.can_view_source_images));
create policy "members create upload records" on public.medication_uploads for insert with check (uploaded_by = auth.uid() and exists (select 1 from public.medication_items i where i.id = medication_id and public.is_circle_member(i.circle_id)));
create policy "jobs visible to circle" on public.extraction_jobs for select using (exists (select 1 from public.medication_items i where i.id = medication_id and public.is_circle_member(i.circle_id)));
create policy "members create jobs" on public.extraction_jobs for insert with check (created_by = auth.uid() and exists (select 1 from public.medication_items i where i.id = medication_id and public.is_circle_member(i.circle_id)));

create policy "reviews visible to recipient circle" on public.interaction_reviews for select using (exists (select 1 from public.care_recipients r where r.id = recipient_id and public.is_circle_member(r.circle_id)));
create policy "findings visible with review" on public.interaction_findings for select using (exists (select 1 from public.interaction_reviews r join public.care_recipients c on c.id = r.recipient_id where r.id = review_id and public.is_circle_member(c.circle_id)));
create policy "coordinators acknowledge reviews" on public.interaction_acknowledgments for insert with check (acknowledged_by = auth.uid() and exists (select 1 from public.interaction_reviews r join public.care_recipients c on c.id = r.recipient_id where r.id = review_id and public.is_circle_coordinator(c.circle_id)));
create policy "acknowledgments visible to circle" on public.interaction_acknowledgments for select using (exists (select 1 from public.interaction_reviews r join public.care_recipients c on c.id = r.recipient_id where r.id = review_id and public.is_circle_member(c.circle_id)));
create policy "audit visible to circle" on public.care_audit_events for select using (public.is_circle_member(circle_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('care-documents', 'care-documents', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false;

create policy "members upload care documents" on storage.objects for insert to authenticated
with check (bucket_id = 'care-documents' and public.is_circle_member(((storage.foldername(name))[1])::uuid));
create policy "image-enabled members read care documents" on storage.objects for select to authenticated
using (bucket_id = 'care-documents' and exists (
  select 1 from public.care_circle_memberships m
  where m.circle_id = ((storage.foldername(name))[1])::uuid
    and m.user_id = auth.uid() and m.can_view_source_images
));
create policy "coordinators remove care documents" on storage.objects for delete to authenticated
using (bucket_id = 'care-documents' and public.is_circle_coordinator(((storage.foldername(name))[1])::uuid));

comment on table public.care_audit_events is 'Append-only application audit history; clients receive select access only.';
comment on column public.interaction_reviews.disclaimer is 'Required user-facing statement of screening scope and limitations.';
