-- One table for the skeleton. Point-only geometry is stored in plain columns;
-- PostGIS + a geometry column arrives in Phase 1. Run this once against your DB:
--   psql "$NETLIFY_DATABASE_URL" -f db/schema.sql
-- (or paste it into the Neon SQL editor.)

create table if not exists georef (
  uri         text primary key,          -- at:// URI of the record (idempotent upsert key)
  cid         text,
  did         text not null,             -- author DID
  archive     text not null,
  item_id     text not null,
  loc_type    text not null check (loc_type in ('point','circle')),
  lat         double precision not null,
  lng         double precision not null,
  radius_m    integer,                   -- null for point
  bearing_deg integer,                   -- optional camera facing (point only)
  confidence  text,                      -- self-reported 'sure' | 'guess'
  note        text,
  created_at  timestamptz,
  indexed_at  timestamptz not null default now()
);

create index if not exists georef_photo_idx on georef (archive, item_id);
