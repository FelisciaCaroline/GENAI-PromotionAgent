-- PromoAgent AI: jalankan di Supabase SQL Editor
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  nama_usaha text, jenis_usaha text, kota text,
  gaya_bahasa_default text default 'gaul_jakarta',
  bahasa_default jsonb,
  created_at timestamptz default now()
);

create table if not exists campaigns (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  goal text not null,
  status text default 'selesai',
  report jsonb,
  language_config jsonb,
  created_at timestamptz default now()
);

create table if not exists transactions_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  file_name text, rows jsonb, created_at timestamptz default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  type text, url text, created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table campaigns enable row level security;
alter table transactions_uploads enable row level security;
alter table assets enable row level security;

create policy "profil milik sendiri" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "kampanye milik sendiri" on campaigns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "upload milik sendiri" on transactions_uploads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "aset milik kampanye sendiri" on assets for all
  using (exists (select 1 from campaigns c where c.id = campaign_id and c.user_id = auth.uid()))
  with check (exists (select 1 from campaigns c where c.id = campaign_id and c.user_id = auth.uid()));

insert into storage.buckets (id, name, public) values ('product-photos', 'product-photos', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('campaign-posters', 'campaign-posters', true) on conflict do nothing;
