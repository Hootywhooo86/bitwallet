-- Bank links for bitwallet's Plaid auto-import.
-- Access tokens live only here; RLS is on with no policies, so only the
-- service role (used by the wallet-plaid edge function) can read or write.
create table if not exists public.wallet_bank_links (
  id uuid primary key default gen_random_uuid(),
  owner_hash text not null,
  item_id text not null unique,
  access_token text not null,
  institution text,
  cursor text,
  created_at timestamptz not null default now(),
  last_synced timestamptz
);
create index if not exists wallet_bank_links_owner_idx on public.wallet_bank_links(owner_hash);
alter table public.wallet_bank_links enable row level security;
revoke all on public.wallet_bank_links from anon, authenticated;
