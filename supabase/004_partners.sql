-- =====================================================================
-- HANOI GO! — Cập nhật 004: CỔNG ĐỐI TÁC
-- Doanh nghiệp (quán, điểm tham quan…) đăng ký đối tác, tạo nhiệm vụ & ưu đãi,
-- xác nhận voucher, phản hồi đánh giá, xem thống kê.
-- Chạy SAU 003_tours_reviews.sql. Chạy lại cũng an toàn.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PARTNERS — hồ sơ đối tác (mỗi tài khoản tối đa 1 đối tác)
-- ---------------------------------------------------------------------
create table if not exists public.partners (
  id          bigint generated always as identity primary key,
  owner_id    uuid not null unique default auth.uid() references public.profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 60),
  category    text not null default 'other' check (category in ('food', 'cafe', 'attraction', 'stay', 'shopping', 'other')),
  description text not null default '' check (char_length(description) <= 300),
  address     text not null default '' check (char_length(address) <= 120),
  phone       text not null default '' check (char_length(phone) <= 20),
  emoji       text not null default '🏪' check (char_length(emoji) <= 16),
  lat         double precision,
  lng         double precision,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now()
);

alter table public.partners enable row level security;

drop policy if exists "partners: read approved or own" on public.partners;
create policy "partners: read approved or own" on public.partners
  for select to authenticated using (status = 'approved' or owner_id = auth.uid());

drop policy if exists "partners: insert own" on public.partners;
create policy "partners: insert own" on public.partners
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "partners: update own" on public.partners;
create policy "partners: update own" on public.partners
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Không cho tự duyệt: chỉ được ghi các cột thông tin, KHÔNG có cột status
revoke insert, update, delete on public.partners from anon, authenticated;
grant insert (name, category, description, address, phone, emoji, lat, lng) on public.partners to authenticated;
grant update (name, category, description, address, phone, emoji, lat, lng) on public.partners to authenticated;

-- Id đối tác ĐÃ DUYỆT của người đang đăng nhập (null nếu không có)
create or replace function public.my_partner_id()
returns bigint language sql stable security definer set search_path = public as $$
  select id from public.partners where owner_id = auth.uid() and status = 'approved';
$$;

-- ---------------------------------------------------------------------
-- 2. NHIỆM VỤ CỦA ĐỐI TÁC
-- ---------------------------------------------------------------------
alter table public.quests add column if not exists partner_id bigint references public.partners(id) on delete cascade;

drop policy if exists "quests: readable" on public.quests;
create policy "quests: readable" on public.quests
  for select to authenticated
  using (
    (active and (partner_id is null or exists (
      select 1 from public.partners p where p.id = partner_id and p.status = 'approved')))
    or (partner_id is not null and partner_id = public.my_partner_id())
  );

-- Tạo / sửa nhiệm vụ cho địa điểm của đối tác. Phần thưởng bị giới hạn để cân bằng game.
create or replace function public.partner_save_quest(
  p_id bigint, p_title text, p_description text, p_kind text, p_emoji text, p_tip text,
  p_xp int, p_coins int, p_radius int, p_opening_hours text, p_ticket_info text, p_active boolean
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_pid bigint := public.my_partner_id();
  pr    public.partners;
  v_id  bigint;
begin
  if v_pid is null then raise exception 'Tài khoản chưa là đối tác đã được duyệt'; end if;
  select * into pr from public.partners where id = v_pid;
  if p_kind not in ('photo', 'checkin') then raise exception 'Loại nhiệm vụ không hợp lệ'; end if;
  if char_length(coalesce(trim(p_title), '')) < 3 then raise exception 'Tên nhiệm vụ quá ngắn'; end if;
  if pr.lat is null or pr.lng is null then raise exception 'Hãy cập nhật vị trí địa điểm trong hồ sơ đối tác trước'; end if;

  if p_id is null then
    insert into public.quests
      (title, description, kind, place_name, area, lat, lng, radius_m, require_location, xp_reward, coin_reward,
       emoji, tip, opening_hours, ticket_info, partner_id, active, sort_order)
    values
      (left(trim(p_title), 80), left(coalesce(p_description, ''), 400), p_kind, pr.name, left(pr.address, 60), pr.lat, pr.lng,
       least(greatest(coalesce(p_radius, 150), 50), 500), p_kind = 'checkin',
       least(greatest(coalesce(p_xp, 50), 10), 150), least(greatest(coalesce(p_coins, 20), 5), 80),
       coalesce(nullif(p_emoji, ''), pr.emoji), left(coalesce(p_tip, ''), 200),
       left(coalesce(p_opening_hours, ''), 80), left(coalesce(p_ticket_info, ''), 120), v_pid, coalesce(p_active, true), 50)
    returning id into v_id;
  else
    update public.quests set
      title = left(trim(p_title), 80), description = left(coalesce(p_description, ''), 400), kind = p_kind,
      place_name = pr.name, lat = pr.lat, lng = pr.lng,
      radius_m = least(greatest(coalesce(p_radius, 150), 50), 500), require_location = p_kind = 'checkin',
      xp_reward = least(greatest(coalesce(p_xp, 50), 10), 150), coin_reward = least(greatest(coalesce(p_coins, 20), 5), 80),
      emoji = coalesce(nullif(p_emoji, ''), pr.emoji), tip = left(coalesce(p_tip, ''), 200),
      opening_hours = left(coalesce(p_opening_hours, ''), 80), ticket_info = left(coalesce(p_ticket_info, ''), 120),
      active = coalesce(p_active, true)
    where id = p_id and partner_id = v_pid
    returning id into v_id;
    if v_id is null then raise exception 'Không tìm thấy nhiệm vụ của bạn'; end if;
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 3. VOUCHER — ưu đãi đổi bằng Hanoi Coins
-- ---------------------------------------------------------------------
create table if not exists public.vouchers (
  id          bigint generated always as identity primary key,
  partner_id  bigint not null references public.partners(id) on delete cascade,
  title       text not null check (char_length(title) between 3 and 80),
  description text not null default '' check (char_length(description) <= 300),
  cost_coins  int  not null check (cost_coins between 10 and 5000),
  stock       int  check (stock is null or stock >= 0),
  valid_until date,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.vouchers enable row level security;
drop policy if exists "vouchers: readable" on public.vouchers;
create policy "vouchers: readable" on public.vouchers
  for select to authenticated
  using (
    (active and exists (select 1 from public.partners p where p.id = partner_id and p.status = 'approved'))
    or partner_id = public.my_partner_id()
  );
revoke insert, update, delete on public.vouchers from anon, authenticated;

create table if not exists public.voucher_codes (
  id         bigint generated always as identity primary key,
  voucher_id bigint not null references public.vouchers(id) on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  code       text   not null unique,
  status     text   not null default 'issued' check (status in ('issued', 'used')),
  created_at timestamptz not null default now(),
  used_at    timestamptz
);
alter table public.voucher_codes enable row level security;
drop policy if exists "voucher_codes: read own or partner" on public.voucher_codes;
create policy "voucher_codes: read own or partner" on public.voucher_codes
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.vouchers v where v.id = voucher_id and v.partner_id = public.my_partner_id())
  );
revoke insert, update, delete on public.voucher_codes from anon, authenticated;

create or replace function public.partner_save_voucher(
  p_id bigint, p_title text, p_description text, p_cost int, p_stock int, p_valid_until date, p_active boolean
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_pid bigint := public.my_partner_id();
  v_id  bigint;
begin
  if v_pid is null then raise exception 'Tài khoản chưa là đối tác đã được duyệt'; end if;
  if p_id is null then
    insert into public.vouchers (partner_id, title, description, cost_coins, stock, valid_until, active)
    values (v_pid, left(trim(p_title), 80), left(coalesce(p_description, ''), 300), p_cost, p_stock, p_valid_until, coalesce(p_active, true))
    returning id into v_id;
  else
    update public.vouchers set title = left(trim(p_title), 80), description = left(coalesce(p_description, ''), 300),
      cost_coins = p_cost, stock = p_stock, valid_until = p_valid_until, active = coalesce(p_active, true)
    where id = p_id and partner_id = v_pid
    returning id into v_id;
    if v_id is null then raise exception 'Không tìm thấy ưu đãi của bạn'; end if;
  end if;
  return v_id;
end $$;

-- Người dùng đổi coins lấy mã voucher
create or replace function public.redeem_voucher(p_voucher_id bigint)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v       public.vouchers;
  v_coins int;
  v_code  text;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập'; end if;
  select * into v from public.vouchers where id = p_voucher_id for update;
  if not found or not v.active
     or not exists (select 1 from public.partners p where p.id = v.partner_id and p.status = 'approved') then
    raise exception 'Ưu đãi không còn hoạt động';
  end if;
  if v.valid_until is not null and v.valid_until < (now() at time zone 'Asia/Ho_Chi_Minh')::date then
    raise exception 'Ưu đãi đã hết hạn';
  end if;
  if v.stock is not null and v.stock <= 0 then raise exception 'Ưu đãi đã hết lượt'; end if;
  if exists (select 1 from public.voucher_codes where voucher_id = v.id and user_id = v_uid and status = 'issued') then
    raise exception 'Bạn đang có một mã chưa sử dụng cho ưu đãi này';
  end if;

  select coins into v_coins from public.profiles where id = v_uid for update;
  if v_coins < v.cost_coins then
    raise exception 'Bạn cần % Hanoi Coins (đang có %)', v.cost_coins, v_coins;
  end if;

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.voucher_codes where code = v_code);
  end loop;

  update public.profiles set coins = coins - v.cost_coins where id = v_uid;
  if v.stock is not null then update public.vouchers set stock = stock - 1 where id = v.id; end if;
  insert into public.voucher_codes (voucher_id, user_id, code) values (v.id, v_uid, v_code);
  return json_build_object('code', v_code, 'coins', v_coins - v.cost_coins);
end $$;

-- Đối tác xác nhận mã khi khách đến sử dụng
create or replace function public.use_voucher_code(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_pid bigint := public.my_partner_id();
  c     public.voucher_codes;
  v     public.vouchers;
  u     public.profiles;
begin
  if v_pid is null then raise exception 'Tài khoản chưa là đối tác đã được duyệt'; end if;
  select * into c from public.voucher_codes where code = upper(trim(p_code)) for update;
  if not found then raise exception 'Mã không tồn tại'; end if;
  select * into v from public.vouchers where id = c.voucher_id;
  if v.partner_id <> v_pid then raise exception 'Mã này không thuộc ưu đãi của bạn'; end if;
  if c.status = 'used' then
    raise exception 'Mã đã được sử dụng lúc %', to_char(c.used_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM/YYYY');
  end if;
  update public.voucher_codes set status = 'used', used_at = now() where id = c.id;
  select * into u from public.profiles where id = c.user_id;
  return json_build_object('voucher', v.title, 'customer', coalesce(nullif(u.display_name, ''), u.username));
end $$;

-- ---------------------------------------------------------------------
-- 4. PHẢN HỒI ĐÁNH GIÁ
-- ---------------------------------------------------------------------
alter table public.reviews add column if not exists partner_reply text not null default '';
alter table public.reviews add column if not exists replied_at timestamptz;
alter table public.reviews add column if not exists handled boolean not null default false;

create or replace function public.partner_reply_review(p_review_id bigint, p_reply text, p_handled boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_pid bigint := public.my_partner_id();
begin
  if v_pid is null then raise exception 'Tài khoản chưa là đối tác đã được duyệt'; end if;
  update public.reviews r set
    partner_reply = left(coalesce(p_reply, ''), 500),
    replied_at = case when coalesce(p_reply, '') <> '' then now() else null end,
    handled = coalesce(p_handled, true)
  from public.quests q
  where r.id = p_review_id and q.id = r.quest_id and q.partner_id = v_pid;
  if not found then raise exception 'Không tìm thấy đánh giá thuộc địa điểm của bạn'; end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. THỐNG KÊ CHO ĐỐI TÁC
-- ---------------------------------------------------------------------
create or replace function public.partner_stats()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_pid   bigint := public.my_partner_id();
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if v_pid is null then raise exception 'Tài khoản chưa là đối tác đã được duyệt'; end if;
  return json_build_object(
    'completions', (select count(*) from public.quest_completions c join public.quests q on q.id = c.quest_id where q.partner_id = v_pid),
    'visitors',    (select count(distinct c.user_id) from public.quest_completions c join public.quests q on q.id = c.quest_id where q.partner_id = v_pid),
    'issued',      (select count(*) from public.voucher_codes vc join public.vouchers v on v.id = vc.voucher_id where v.partner_id = v_pid),
    'used',        (select count(*) from public.voucher_codes vc join public.vouchers v on v.id = vc.voucher_id where v.partner_id = v_pid and vc.status = 'used'),
    'daily', (
      select json_agg(json_build_object('day', d::date, 'n', coalesce(x.n, 0)) order by d)
      from generate_series(v_today - 6, v_today, interval '1 day') d
      left join (
        select c.completed_on, count(*) as n
        from public.quest_completions c join public.quests q on q.id = c.quest_id
        where q.partner_id = v_pid group by c.completed_on
      ) x on x.completed_on = d::date
    )
  );
end $$;

-- ---------------------------------------------------------------------
-- 6. QUYỀN GỌI HÀM
-- ---------------------------------------------------------------------
revoke execute on function public.partner_save_quest(bigint, text, text, text, text, text, int, int, int, text, text, boolean) from public, anon;
grant  execute on function public.partner_save_quest(bigint, text, text, text, text, text, int, int, int, text, text, boolean) to authenticated;
revoke execute on function public.partner_save_voucher(bigint, text, text, int, int, date, boolean) from public, anon;
grant  execute on function public.partner_save_voucher(bigint, text, text, int, int, date, boolean) to authenticated;
revoke execute on function public.redeem_voucher(bigint) from public, anon;
grant  execute on function public.redeem_voucher(bigint) to authenticated;
revoke execute on function public.use_voucher_code(text) from public, anon;
grant  execute on function public.use_voucher_code(text) to authenticated;
revoke execute on function public.partner_reply_review(bigint, text, boolean) from public, anon;
grant  execute on function public.partner_reply_review(bigint, text, boolean) to authenticated;
revoke execute on function public.partner_stats() from public, anon;
grant  execute on function public.partner_stats() to authenticated;

-- ---------------------------------------------------------------------
-- 7. DUYỆT ĐỐI TÁC (làm bởi quản trị viên)
--    Xem đơn đăng ký: Table Editor → partners. Duyệt: đổi status thành approved,
--    hoặc bỏ dấu -- ở dòng dưới, sửa tên rồi chạy.
-- ---------------------------------------------------------------------
-- update public.partners set status = 'approved' where name = 'Tên đối tác';
