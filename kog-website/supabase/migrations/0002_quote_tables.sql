-- Module 2: the smart quote form intake
create table quote_requests (
  id uuid primary key default gen_random_uuid(), -- client-generated before insert
  name text not null,
  company text,
  email text not null,
  phone text,
  requester_type text,
  property_type text check (property_type in ('home','business','vve')),
  component_types text[],
  work_type text,
  location text,
  scope text,
  preferred_timing text,
  message text,
  indicative_advice text,
  status text not null default 'new' check (status in ('new','reviewed','converted','archived')),
  converted_property_id uuid references properties(id),
  converted_at timestamptz,
  created_at timestamptz not null default now()
);

create table quote_photos (
  id uuid primary key default gen_random_uuid(), -- client-generated before insert
  quote_id uuid not null references quote_requests(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index on quote_photos(quote_id);
