-- Module 3: the Property File
create table properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  postcode text,
  city text,
  type text not null check (type in ('home','business','vve')),
  owner_name text,
  owner_email text,
  owner_phone text,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table building_components (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  component_type text not null check (component_type in
    ('kozijnen','gevel','balkon','trappenhuis','boeideel','deuren','dak','overig')),
  label text,
  created_at timestamptz not null default now()
);
create index on building_components(property_id);

create table maintenance_entries (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references building_components(id) on delete cascade,
  date_carried_out date,
  work_done text,
  findings text,
  materials_used text,
  status text not null default 'planned' check (status in
    ('planned','quoted','in_progress','completed','inspection_needed')),
  handover_notes text,
  next_inspection_date date,
  next_maintenance_advice text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index on maintenance_entries(component_id);

create table maintenance_photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references maintenance_entries(id) on delete cascade,
  storage_path text not null,
  phase text not null check (phase in ('before','during','after')),
  created_at timestamptz not null default now()
);
create index on maintenance_photos(entry_id);
