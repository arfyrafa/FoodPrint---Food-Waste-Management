-- =====================================================================
-- FoodPrint - Skema database Supabase (PostgreSQL)
-- Jalankan sekali di Supabase SQL Editor. Aman dijalankan ulang (idempotent
-- untuk tabel/fungsi/policy), tapi TIDAK menghapus data.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES (role: owner = admin restoran, customer = pembeli)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'customer' check (role in ('owner','customer')),
  full_name   text not null default '',
  phone       text,
  -- preferensi gizi customer (dipakai fitur Cek Gizi AI)
  diet_goal   text not null default 'seimbang'
              check (diet_goal in ('seimbang','turun_bb','jaga_bb','naik_otot','rendah_gula','rendah_garam')),
  diet_notes  text,          -- contoh: "tidak makan pedas", "vegetarian"
  created_at  timestamptz not null default now()
);

-- kolom progres diet customer (aman dijalankan ulang)
alter table public.profiles add column if not exists onboarded boolean not null default false;
alter table public.profiles add column if not exists start_weight numeric(5,1) check (start_weight between 20 and 300);
alter table public.profiles add column if not exists target_weight numeric(5,1) check (target_weight between 20 and 300);
alter table public.profiles add column if not exists daily_target integer check (daily_target between 1 and 10000);

-- ---------------------------------------------------------------------
-- 2. OUTLETS (satu per akun owner)
-- ---------------------------------------------------------------------
create table if not exists public.outlets (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null unique references auth.users(id) on delete cascade,
  business_name  text not null default 'Usaha Saya',
  business_type  text not null default 'kantin'
                 check (business_type in ('kantin','restoran','umkm','katering')),
  address        text,
  whatsapp       text,        -- format 62812xxxx, dipakai tombol hubungi
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. MENUS
-- ---------------------------------------------------------------------
create table if not exists public.menus (
  id          uuid primary key default gen_random_uuid(),
  outlet_id   uuid not null references public.outlets(id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 80),
  price       integer not null check (price >= 0),   -- harga jual / porsi (Rp)
  hpp         integer not null check (hpp >= 0),     -- biaya produksi / porsi (Rp)
  unit        text not null default 'porsi',
  is_active   boolean not null default true,         -- soft delete
  created_at  timestamptz not null default now(),
  unique (id, outlet_id)
);
create index if not exists menus_outlet_idx on public.menus(outlet_id);

-- ---------------------------------------------------------------------
-- 4. DAILY RECORDS (produksi, terjual, sisa per menu per hari)
-- ---------------------------------------------------------------------
create table if not exists public.daily_records (
  id           uuid primary key default gen_random_uuid(),
  outlet_id    uuid not null,
  menu_id      uuid not null,
  record_date  date not null,
  produced     integer not null check (produced >= 0),
  sold         integer not null check (sold >= 0),
  leftover     integer not null check (leftover >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (menu_id, record_date),
  check (sold + leftover <= produced),
  foreign key (menu_id, outlet_id) references public.menus(id, outlet_id) on delete cascade
);
create index if not exists daily_records_outlet_date_idx on public.daily_records(outlet_id, record_date);

-- ---------------------------------------------------------------------
-- 5. WASTE LOGS (hasil AI Vision / input manual)
-- ---------------------------------------------------------------------
create table if not exists public.waste_logs (
  id          uuid primary key default gen_random_uuid(),
  outlet_id   uuid not null references public.outlets(id) on delete cascade,
  log_date    date not null default current_date,
  source      text not null check (source in ('manual','ai_vision')),
  items       jsonb not null default '[]'::jsonb,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists waste_logs_outlet_idx on public.waste_logs(outlet_id, log_date);

-- ---------------------------------------------------------------------
-- 6. SURPLUS LISTINGS (makanan surplus yang dijual murah / gratis)
-- ---------------------------------------------------------------------
create table if not exists public.surplus_listings (
  id                uuid primary key default gen_random_uuid(),
  outlet_id         uuid not null,
  menu_id           uuid,
  title             text not null check (length(trim(title)) between 1 and 80),
  quantity          integer not null check (quantity > 0),
  remaining_qty     integer not null check (remaining_qty >= 0),
  price             integer not null default 0 check (price >= 0),          -- 0 = gratis
  original_price    integer check (original_price >= 0),
  pickup_until      timestamptz not null,
  location_note     text,
  safety_confirmed  boolean not null default false,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  check (remaining_qty <= quantity),
  -- listing aktif wajib lolos checklist keamanan pangan
  check (not is_active or safety_confirmed),
  foreign key (outlet_id) references public.outlets(id) on delete cascade,
  foreign key (menu_id, outlet_id) references public.menus(id, outlet_id) on delete set null (menu_id)
);
create index if not exists surplus_outlet_idx on public.surplus_listings(outlet_id);

-- ---------------------------------------------------------------------
-- 7. ORDERS (pesanan customer atas listing surplus, bayar saat ambil)
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  listing_id      uuid references public.surplus_listings(id) on delete set null,
  outlet_id       uuid not null references public.outlets(id) on delete cascade,
  customer_id     uuid not null references auth.users(id) on delete cascade,
  customer_name   text not null,
  customer_phone  text,
  item_title      text not null,
  quantity        integer not null check (quantity > 0),
  unit_price      integer not null check (unit_price >= 0),
  total_price     integer not null check (total_price >= 0),
  status          text not null default 'pending'
                  check (status in ('pending','confirmed','picked_up','cancelled')),
  pickup_until    timestamptz not null,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists orders_customer_idx on public.orders(customer_id, created_at desc);
create index if not exists orders_outlet_idx on public.orders(outlet_id, created_at desc);

-- ---------------------------------------------------------------------
-- 8. AI USAGE (rate limit) & AI INSIGHTS (cache penjelasan/kesimpulan)
-- ---------------------------------------------------------------------
create table if not exists public.ai_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  feature     text not null check (feature in ('vision','explain','daily','nutrition')),
  created_at  timestamptz not null default now()
);
create index if not exists ai_usage_user_time_idx on public.ai_usage(user_id, created_at);

create table if not exists public.ai_insights (
  id            uuid primary key default gen_random_uuid(),
  outlet_id     uuid not null references public.outlets(id) on delete cascade,
  insight_date  date not null,
  kind          text not null check (kind in ('forecast','daily')),
  content       jsonb not null,
  source        text not null default 'ai' check (source in ('ai','fallback')),
  created_at    timestamptz not null default now(),
  unique (outlet_id, insight_date, kind)
);

-- ---------------------------------------------------------------------
-- 9. FOOD LOGS & WEIGHT LOGS (progres diet customer)
-- ---------------------------------------------------------------------
create table if not exists public.food_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  log_date    date not null default current_date,
  food_name   text not null check (length(trim(food_name)) between 1 and 120),
  portion     text,
  calories    numeric(7,1) not null default 0 check (calories >= 0),
  protein_g   numeric(6,1) not null default 0 check (protein_g >= 0),
  carbs_g     numeric(6,1) not null default 0 check (carbs_g >= 0),
  fat_g       numeric(6,1) not null default 0 check (fat_g >= 0),
  sugar_g     numeric(6,1) not null default 0 check (sugar_g >= 0),
  sodium_mg   numeric(7,1) not null default 0 check (sodium_mg >= 0),
  verdict     text check (verdict in ('baik','cukup','kurang')),
  score       integer check (score between 0 and 100),
  created_at  timestamptz not null default now()
);
create index if not exists food_logs_user_date_idx on public.food_logs(user_id, log_date);

create table if not exists public.weight_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  log_date    date not null default current_date,
  weight_kg   numeric(5,1) not null check (weight_kg between 20 and 300),
  created_at  timestamptz not null default now(),
  unique (user_id, log_date)
);

-- =====================================================================
-- FUNGSI BANTU
-- =====================================================================
create or replace function public.owns_outlet(p_outlet uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.outlets o where o.id = p_outlet and o.owner_id = auth.uid());
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists daily_records_touch on public.daily_records;
create trigger daily_records_touch before update on public.daily_records
  for each row execute function public.touch_updated_at();
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Saat user daftar: buat profile, dan outlet jika role = owner.
-- Frontend mengirim role, full_name, business_name, business_type lewat options.data.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(nullif(new.raw_user_meta_data->>'role',''), 'customer');
begin
  if v_role not in ('owner','customer') then v_role := 'customer'; end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  if v_role = 'owner' then
    insert into public.outlets (owner_id, business_name, business_type)
    values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data->>'business_name'), ''), 'Usaha Saya'),
      case when new.raw_user_meta_data->>'business_type' in ('kantin','restoran','umkm','katering')
           then new.raw_user_meta_data->>'business_type' else 'kantin' end
    )
    on conflict (owner_id) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- RPC PESANAN (semua perubahan stok lewat fungsi agar atomik & aman)
-- =====================================================================
create or replace function public.place_order(p_listing uuid, p_qty integer, p_note text default null)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  v_listing public.surplus_listings;
  v_profile public.profiles;
  v_order   public.orders;
  v_code    text;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null or v_profile.role <> 'customer' then
    raise exception 'Hanya akun customer yang bisa memesan';
  end if;
  if p_qty is null or p_qty < 1 or p_qty > 20 then
    raise exception 'Jumlah pesanan tidak valid';
  end if;

  select * into v_listing from public.surplus_listings where id = p_listing for update;
  if v_listing.id is null or not v_listing.is_active or not v_listing.safety_confirmed
     or v_listing.pickup_until <= now() then
    raise exception 'Listing sudah tidak tersedia';
  end if;
  if v_listing.remaining_qty < p_qty then
    raise exception 'Stok tidak cukup (sisa % porsi)', v_listing.remaining_qty;
  end if;

  update public.surplus_listings set remaining_qty = remaining_qty - p_qty where id = p_listing;

  v_code := 'FP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.orders (code, listing_id, outlet_id, customer_id, customer_name, customer_phone,
                             item_title, quantity, unit_price, total_price, pickup_until, note)
  values (v_code, v_listing.id, v_listing.outlet_id, auth.uid(),
          coalesce(nullif(v_profile.full_name, ''), 'Pelanggan'), v_profile.phone,
          v_listing.title, p_qty, v_listing.price, v_listing.price * p_qty,
          v_listing.pickup_until, left(p_note, 200))
  returning * into v_order;
  return v_order;
end; $$;

create or replace function public.set_order_status(p_order uuid, p_status text)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_is_owner boolean;
begin
  select * into v_order from public.orders where id = p_order for update;
  if v_order.id is null then raise exception 'Pesanan tidak ditemukan'; end if;

  v_is_owner := public.owns_outlet(v_order.outlet_id);

  if v_order.customer_id = auth.uid() and not v_is_owner then
    -- customer hanya boleh membatalkan pesanan yang masih pending
    if p_status <> 'cancelled' or v_order.status <> 'pending' then
      raise exception 'Pesanan tidak bisa diubah';
    end if;
  elsif v_is_owner then
    if v_order.status in ('picked_up','cancelled') then
      raise exception 'Pesanan sudah selesai';
    end if;
    if p_status not in ('confirmed','picked_up','cancelled') then
      raise exception 'Status tidak valid';
    end if;
  else
    raise exception 'Tidak punya akses';
  end if;

  if p_status = 'cancelled' and v_order.listing_id is not null then
    update public.surplus_listings
       set remaining_qty = least(quantity, remaining_qty + v_order.quantity)
     where id = v_order.listing_id;
  end if;

  update public.orders set status = p_status where id = p_order returning * into v_order;
  return v_order;
end; $$;

-- =====================================================================
-- VIEW PUBLIK SURPLUS (dibaca tanpa login, kolom terbatas)
-- =====================================================================
create or replace view public.public_surplus as
select s.id, s.title, s.remaining_qty, s.quantity, s.price, s.original_price,
       s.pickup_until, s.location_note, s.created_at,
       o.id as outlet_id, o.business_name, o.business_type, o.address, o.whatsapp
from public.surplus_listings s
join public.outlets o on o.id = s.outlet_id
where s.is_active and s.safety_confirmed and s.pickup_until > now() and s.remaining_qty > 0;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.outlets           enable row level security;
alter table public.menus             enable row level security;
alter table public.daily_records     enable row level security;
alter table public.waste_logs        enable row level security;
alter table public.surplus_listings  enable row level security;
alter table public.orders            enable row level security;
alter table public.ai_usage          enable row level security;
alter table public.ai_insights       enable row level security;
alter table public.food_logs         enable row level security;
alter table public.weight_logs       enable row level security;

-- profiles: hanya milik sendiri. Kolom role tidak bisa diubah user.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, diet_goal, diet_notes, onboarded, start_weight, target_weight, daily_target) on public.profiles to authenticated;

-- outlets
drop policy if exists outlets_owner_all on public.outlets;
create policy outlets_owner_all on public.outlets for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- menus, daily_records, waste_logs, surplus_listings, ai_insights: milik outlet sendiri
drop policy if exists menus_owner_all on public.menus;
create policy menus_owner_all on public.menus for all
  using (public.owns_outlet(outlet_id)) with check (public.owns_outlet(outlet_id));

drop policy if exists daily_owner_all on public.daily_records;
create policy daily_owner_all on public.daily_records for all
  using (public.owns_outlet(outlet_id)) with check (public.owns_outlet(outlet_id));

drop policy if exists waste_owner_all on public.waste_logs;
create policy waste_owner_all on public.waste_logs for all
  using (public.owns_outlet(outlet_id)) with check (public.owns_outlet(outlet_id));

drop policy if exists surplus_owner_all on public.surplus_listings;
create policy surplus_owner_all on public.surplus_listings for all
  using (public.owns_outlet(outlet_id)) with check (public.owns_outlet(outlet_id));

drop policy if exists insights_owner_all on public.ai_insights;
create policy insights_owner_all on public.ai_insights for all
  using (public.owns_outlet(outlet_id)) with check (public.owns_outlet(outlet_id));

-- orders: customer lihat pesanannya, owner lihat pesanan outletnya.
-- Insert/update hanya lewat RPC place_order & set_order_status.
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select
  using (customer_id = auth.uid() or public.owns_outlet(outlet_id));
revoke insert, update, delete on public.orders from anon, authenticated;
grant select on public.orders to authenticated;

-- ai_usage: insert & select milik sendiri
drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage for select using (user_id = auth.uid());
drop policy if exists ai_usage_insert_own on public.ai_usage;
create policy ai_usage_insert_own on public.ai_usage for insert with check (user_id = auth.uid());

-- food_logs & weight_logs: hanya milik sendiri
drop policy if exists food_logs_own on public.food_logs;
create policy food_logs_own on public.food_logs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists weight_logs_own on public.weight_logs;
create policy weight_logs_own on public.weight_logs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- view publik & RPC
grant select on public.public_surplus to anon, authenticated;
revoke execute on function public.place_order(uuid, integer, text) from public, anon;
grant execute on function public.place_order(uuid, integer, text) to authenticated;
revoke execute on function public.set_order_status(uuid, text) from public, anon;
grant execute on function public.set_order_status(uuid, text) to authenticated;
