-- =====================================================================
-- FoodPrint - Data demo SIMULASI (bukan data usaha nyata)
--
-- Cara pakai:
--   1. Jalankan schema.sql dulu.
--   2. Supabase > Authentication > Users > Add user (centang Auto Confirm User):
--        - akun owner demo    : demo@foodprint.id     (password bebas)
--        - akun customer demo : pembeli@foodprint.id  (password bebas)
--      Kalau email berbeda, ganti v_owner_email / v_customer_email di bawah.
--   3. Jalankan file ini. Aman dijalankan ulang (data demo lama diganti).
--
-- Pola simulasi: Senin & Rabu ramai, Jumat paling sepi, variasi acak kecil
-- (deterministik). Gado-Gado & Soto Ayam sengaja diproduksi berlebih.
-- Listing surplus hanya aktif ~4 jam -> jalankan ulang sebelum demo/penjurian.
-- =====================================================================

do $$
declare
  v_owner_email    text := 'demo@foodprint.id';
  v_customer_email text := 'pembeli@foodprint.id';
  v_owner    uuid;
  v_customer uuid;
  v_outlet   uuid;
  v_menu     record;
  v_menu_id  uuid;
  v_day      date;
  v_dow      int;
  v_factor   numeric;
  v_noise    int;
  v_produced int;
  v_sold     int;
  v_listing1 uuid;
  v_listing2 uuid;
begin
  select id into v_owner from auth.users where email = v_owner_email;
  if v_owner is null then
    raise exception 'User % belum ada. Buat dulu di Authentication > Users.', v_owner_email;
  end if;
  select id into v_customer from auth.users where email = v_customer_email;

  -- profil & outlet owner demo
  insert into public.profiles (id, role, full_name, phone)
  values (v_owner, 'owner', 'Pengelola Kantin Demo', '6281200000001')
  on conflict (id) do update set role = 'owner', full_name = excluded.full_name, phone = excluded.phone;

  insert into public.outlets (owner_id, business_name, business_type, address, whatsapp)
  values (v_owner, 'Kantin Kampus Demo', 'kantin', 'Gedung A lantai 1, dekat parkiran motor', '6281200000001')
  on conflict (owner_id) do update
    set business_name = excluded.business_name, business_type = excluded.business_type,
        address = excluded.address, whatsapp = excluded.whatsapp
  returning id into v_outlet;

  -- bersihkan data demo lama
  delete from public.orders           where outlet_id = v_outlet;
  delete from public.surplus_listings where outlet_id = v_outlet;
  delete from public.ai_insights      where outlet_id = v_outlet;
  delete from public.daily_records    where outlet_id = v_outlet;
  delete from public.menus            where outlet_id = v_outlet;
  delete from public.ai_usage         where user_id in (v_owner, v_customer);
  delete from public.food_logs        where user_id = v_customer;
  delete from public.weight_logs      where user_id = v_customer;

  -- profil customer demo (onboarded = false agar juri melihat pertanyaan tujuan diet saat login pertama)
  if v_customer is not null then
    insert into public.profiles (id, role, full_name, phone, diet_goal, diet_notes, onboarded, start_weight, target_weight, daily_target)
    values (v_customer, 'customer', 'Mahasiswa Demo', '6281200000002', 'turun_bb', 'Tidak terlalu suka pedas', false, 72, 65, null)
    on conflict (id) do update set role = 'customer', full_name = excluded.full_name, phone = excluded.phone,
      diet_goal = excluded.diet_goal, diet_notes = excluded.diet_notes, onboarded = false,
      start_weight = excluded.start_weight, target_weight = excluded.target_weight, daily_target = null;

    -- riwayat berat 4 minggu (turun perlahan)
    insert into public.weight_logs (user_id, log_date, weight_kg)
    select v_customer, current_date - d, round((72 - (28 - d) * 0.09 + ((abs(hashtext(d::text)) % 5) - 2) * 0.1)::numeric, 1)
    from generate_series(0, 28, 3) as d;

    -- catatan makan 14 hari: minggu lalu lebih banyak gula & kalori, minggu ini membaik
    insert into public.food_logs (user_id, log_date, food_name, portion, calories, protein_g, carbs_g, fat_g, sugar_g, sodium_mg, verdict, score)
    select v_customer, current_date - d, f.name, f.portion,
           f.cal * case when d >= 7 then 1.15 else 1 end, f.p, f.c, f.f,
           f.sugar * case when d >= 7 then 1.6 else 1 end, f.na, f.verdict, f.score
    from generate_series(0, 13) as d
    cross join (values
      ('Nasi telur', '1 piring', 450, 15, 65, 14, 2, 700, 'cukup', 62),
      ('Gado-gado', '1 piring', 380, 15, 35, 20, 12, 800, 'baik', 78),
      ('Es teh manis', '1 gelas', 120, 0, 30, 0, 28, 10, 'kurang', 35)
    ) as f(name, portion, cal, p, c, f, sugar, na, verdict, score)
    where (abs(hashtext(f.name || d::text)) % 4) <> 0;
  end if;

  -- menu + catatan harian 8 minggu (hari kerja saja)
  for v_menu in
    select * from (values
      ('Nasi Ayam Goreng', 15000, 9000, 40, 44),
      ('Mie Goreng',       12000, 6500, 30, 33),
      ('Nasi Telur',       10000, 5500, 35, 38),
      ('Soto Ayam',        13000, 7500, 22, 32),
      ('Gado-Gado',        12000, 7000, 16, 26),
      ('Es Teh',            4000, 1500, 55, 60)
    ) as m(name, price, hpp, base_demand, base_production)
  loop
    insert into public.menus (outlet_id, name, price, hpp)
    values (v_outlet, v_menu.name, v_menu.price, v_menu.hpp)
    returning id into v_menu_id;

    for v_day in select generate_series(current_date - 56, current_date, interval '1 day')::date loop
      v_dow := extract(isodow from v_day);
      continue when v_dow > 5;

      v_factor := case v_dow when 1 then 1.20 when 2 then 1.00 when 3 then 1.15 when 4 then 1.00 else 0.70 end;
      v_noise  := (abs(hashtext(v_menu.name || v_day::text)) % 7) - 3;      -- -3..+3, deterministik
      v_produced := v_menu.base_production + ((abs(hashtext(v_day::text || v_menu.name)) % 5) - 2);
      v_sold := greatest(0, least(v_produced, round(v_menu.base_demand * v_factor)::int + v_noise));

      insert into public.daily_records (outlet_id, menu_id, record_date, produced, sold, leftover)
      values (v_outlet, v_menu_id, v_day, v_produced, v_sold, v_produced - v_sold);
    end loop;
  end loop;

  -- contoh listing surplus aktif (~4 jam)
  insert into public.surplus_listings (outlet_id, menu_id, title, quantity, remaining_qty, price, original_price,
                                       pickup_until, location_note, safety_confirmed, is_active)
  select v_outlet, id, 'Gado-Gado (sisa siang)', 8, 6, 5000, 12000, now() + interval '4 hours',
         'Ambil di kasir Kantin Kampus Demo, sebutkan kode pesanan', true, true
  from public.menus where outlet_id = v_outlet and name = 'Gado-Gado'
  returning id into v_listing1;

  insert into public.surplus_listings (outlet_id, menu_id, title, quantity, remaining_qty, price, original_price,
                                       pickup_until, location_note, safety_confirmed, is_active)
  select v_outlet, id, 'Soto Ayam porsi bungkus', 6, 6, 0, 13000, now() + interval '3 hours',
         'Gratis untuk mahasiswa, bawa wadah sendiri lebih baik', true, true
  from public.menus where outlet_id = v_outlet and name = 'Soto Ayam'
  returning id into v_listing2;

  -- contoh pesanan dari customer demo
  if v_customer is not null then
    insert into public.orders (code, listing_id, outlet_id, customer_id, customer_name, customer_phone,
                               item_title, quantity, unit_price, total_price, status, pickup_until)
    values ('FP-DEMO01', v_listing1, v_outlet, v_customer, 'Mahasiswa Demo', '6281200000002',
            'Gado-Gado (sisa siang)', 2, 5000, 10000, 'pending', now() + interval '4 hours');
  end if;
end $$;
