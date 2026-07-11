-- Per-store purchase-list (cart) toggle (run once in the Supabase SQL editor).
-- Stores can turn the shopper cart off so the app becomes a pure price-checker.
-- Defaults to true so every existing store keeps its current behavior.

alter table public.stores
  add column if not exists cart_enabled boolean not null default true;
