-- =====================================================================
-- HANOI GO! — Cập nhật 014: CHECK-IN BẰNG MÃ QR TẠI TỪNG ĐIỂM
-- - Mỗi nhiệm vụ có một mã QR bí mật (chỉ quản trị viên xem / in được)
-- - Quét mã tại điểm → xác nhận đã đến nơi, check-in không cần GPS trong 2 giờ
-- - Quản trị viên đổi được mã (mã cũ in ra sẽ hết tác dụng)
-- Chạy SAU 013_comment_reactions.sql. Chạy lại cũng an toàn.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. MÃ QR CỦA TỪNG NHIỆM VỤ
-- ---------------------------------------------------------------------
create or replace function public.new_qr_token() returns text
language sql volatile as $$ select substr(replace(gen_random_uuid()::text, '-', ''), 1, 16) $$;

create table if not exists public.quest_qr (
  quest_id   bigint primary key references public.quests(id) on delete cascade,
  token      text   not null unique default public.new_qr_token(),
  updated_at timestamptz not null default now()
);

alter table public.quest_qr enable row level security;

-- Chỉ quản trị viên đọc được mã (người chơi không thể "quét hộ" từ xa)
drop policy if exists "quest qr: admin read" on public.quest_qr;
create policy "quest qr: admin read" on public.quest_qr
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.quest_qr from anon, authenticated;

-- Tạo mã cho mọi nhiệm vụ hiện có và nhiệm vụ thêm sau này
insert into public.quest_qr (quest_id) select id from public.quests on conflict do nothing;

create or replace function public.quest_qr_create() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.quest_qr (quest_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists quests_qr_create on public.quests;
create trigger quests_qr_create after insert on public.quests
  for each row execute function public.quest_qr_create();

-- Đổi mã mới (khi mã in ra bị lộ)
create or replace function public.regenerate_quest_qr(p_quest_id bigint) returns text
language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên mới đổi được mã QR'; end if;
  insert into public.quest_qr (quest_id) values (p_quest_id)
  on conflict (quest_id) do update set token = public.new_qr_token(), updated_at = now()
  returning token into v_token;
  return v_token;
end $$;

-- ---------------------------------------------------------------------
-- 2. LƯỢT QUÉT
-- ---------------------------------------------------------------------
create table if not exists public.quest_qr_scans (
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  quest_id   bigint not null references public.quests(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);

alter table public.quest_qr_scans enable row level security;

drop policy if exists "qr scans: read own" on public.quest_qr_scans;
create policy "qr scans: read own" on public.quest_qr_scans
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.quest_qr_scans from anon, authenticated;

-- Quét mã: trả về nhiệm vụ tương ứng và ghi lại lượt quét
create or replace function public.scan_quest_qr(p_token text) returns json
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_quest bigint;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập'; end if;
  select r.quest_id into v_quest from public.quest_qr r
  join public.quests q on q.id = r.quest_id and q.active
  where r.token = lower(trim(p_token));
  if v_quest is null then
    return json_build_object('ok', false, 'message', 'Mã QR không hợp lệ hoặc đã được thay mới');
  end if;
  insert into public.quest_qr_scans (user_id, quest_id) values (v_uid, v_quest)
  on conflict (user_id, quest_id) do update set scanned_at = now();
  return json_build_object('ok', true, 'quest_id', v_quest);
end $$;

-- ---------------------------------------------------------------------
-- 3. CHECK-IN: chấp nhận lượt quét QR thay cho GPS
-- ---------------------------------------------------------------------
create or replace function public.complete_quest(
  p_quest_id bigint,
  p_photo_path text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_answer int default null,
  p_note text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_today   date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  q         public.quests;
  p         public.profiles;
  v_dist    double precision;
  v_correct int;
  v_streak  int;
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập';
  end if;

  select * into q from public.quests where id = p_quest_id and active;
  if not found then
    raise exception 'Không tìm thấy nhiệm vụ';
  end if;

  select * into p from public.profiles where id = v_uid for update;

  if q.is_daily then
    if exists (select 1 from public.quest_completions
               where user_id = v_uid and quest_id = q.id and completed_on = v_today) then
      raise exception 'Hôm nay bạn đã hoàn thành nhiệm vụ này rồi, mai quay lại nhé!';
    end if;
  elsif exists (select 1 from public.quest_completions
                where user_id = v_uid and quest_id = q.id) then
    raise exception 'Bạn đã hoàn thành nhiệm vụ này rồi';
  end if;

  if q.kind = 'photo' and (p_photo_path is null or split_part(p_photo_path, '/', 1) <> v_uid::text) then
    raise exception 'Cần chụp một bức ảnh để hoàn thành nhiệm vụ';
  end if;

  if q.kind = 'quiz' then
    select correct_index into v_correct from public.quest_answers where quest_id = q.id;
    if p_answer is null or v_correct is null or p_answer <> v_correct then
      return json_build_object('ok', false, 'message', 'Chưa đúng rồi, thử lại nhé!');
    end if;
  end if;

  -- Tài khoản demo bỏ qua kiểm tra vị trí (để thuyết trình trong phòng).
  -- Đã quét mã QR tại điểm trong 2 giờ qua cũng không cần GPS.
  if (q.require_location or q.kind = 'checkin') and not p.is_demo
     and not exists (select 1 from public.quest_qr_scans s
                     where s.user_id = v_uid and s.quest_id = q.id and s.scanned_at > now() - interval '2 hours') then
    if p_lat is null or p_lng is null then
      raise exception 'Cần bật định vị (GPS) hoặc quét mã QR tại điểm để check-in';
    end if;
    if q.lat is not null and q.lng is not null then
      v_dist := 2 * 6371000 * asin(sqrt(
        power(sin(radians(p_lat - q.lat) / 2), 2) +
        cos(radians(q.lat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - q.lng) / 2), 2)
      ));
      if v_dist > q.radius_m then
        raise exception 'Bạn đang cách % khoảng % m. Hãy lại gần hơn (trong % m) nhé!',
          q.place_name, round(v_dist)::int, q.radius_m;
      end if;
    end if;
  end if;

  v_streak := case
    when p.last_active_date = v_today then greatest(p.streak, 1)
    when p.last_active_date = v_today - 1 then p.streak + 1
    else 1
  end;

  update public.profiles set
    xp = xp + q.xp_reward,
    coins = coins + q.coin_reward,
    streak = v_streak,
    best_streak = greatest(best_streak, v_streak),
    last_active_date = v_today
  where id = v_uid;

  insert into public.quest_completions
    (user_id, quest_id, completed_on, photo_path, lat, lng, xp_earned, coins_earned)
  values (v_uid, q.id, v_today, p_photo_path, p_lat, p_lng, q.xp_reward, q.coin_reward);

  if p_photo_path is not null then
    insert into public.journal_entries (user_id, title, note, photo_path, place_name, quest_id)
    values (v_uid, q.title, left(coalesce(p_note, ''), 1000), p_photo_path, left(q.place_name, 80), q.id);
  end if;

  return json_build_object('ok', true, 'xp', q.xp_reward, 'coins', q.coin_reward, 'streak', v_streak);
end $$;

revoke execute on function public.quest_qr_create() from public, anon, authenticated;
revoke execute on function public.regenerate_quest_qr(bigint) from public, anon;
grant  execute on function public.regenerate_quest_qr(bigint) to authenticated;
revoke execute on function public.scan_quest_qr(text) from public, anon;
grant  execute on function public.scan_quest_qr(text) to authenticated;
revoke execute on function public.complete_quest(bigint, text, double precision, double precision, int, text) from public, anon;
grant  execute on function public.complete_quest(bigint, text, double precision, double precision, int, text) to authenticated;
