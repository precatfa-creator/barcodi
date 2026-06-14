-- Physical products table (run once in the Supabase SQL editor).
-- Each product becomes its own indexed row instead of living inside the
-- stores.products JSONB blob. The server migrates existing JSONB products into
-- this table automatically on first boot, then uses it as the source of truth.

create table if not exists products (
  id            text primary key,
  store_id      text not null,
  barcode       text not null default '',
  name          text not null,
  price         numeric not null default 0,
  category      text default 'general',
  description   text default '',
  image_emoji   text default '📦',
  image_url     text,
  stock         numeric,
  calories      numeric,
  weight        text,
  updated_at    timestamptz default now()
);

-- Fast lookups by store, and by barcode within a store (the scan path).
create index if not exists products_store_idx on products (store_id);
create index if not exists products_store_barcode_idx on products (store_id, barcode);

-- Optional: have the DB clean up a store's products when the store is deleted.
-- (The server also deletes them explicitly, so this is just a safety net.)
-- alter table products add constraint products_store_fk
--   foreign key (store_id) references stores (id) on delete cascade;
