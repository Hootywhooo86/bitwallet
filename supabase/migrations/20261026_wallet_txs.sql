-- Optional cloud copy of bitwallet purchases ("Cloud backup & insights" in the app).
-- Locked like wallet_bank_links: RLS on, no policies, written only by the wallet-sync function.
create table if not exists public.wallet_txs (
  owner_hash text not null,
  id text not null,
  date date not null,
  amt numeric(12,2) not null,
  merchant text not null default '',
  cat text not null default 'other',
  card_name text,
  card_last4 text,
  note text,
  source text,
  updated_at timestamptz not null default now(),
  primary key (owner_hash, id)
);
create index if not exists wallet_txs_owner_date_idx on public.wallet_txs(owner_hash, date);
alter table public.wallet_txs enable row level security;
revoke all on public.wallet_txs from anon, authenticated;
