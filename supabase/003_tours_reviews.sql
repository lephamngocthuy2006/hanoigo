-- =====================================================================
-- HANOI GO! — Cập nhật 003: Tour theo chủ đề, thông tin điểm đến,
-- đánh giá trải nghiệm (chất lượng dịch vụ), chế độ demo thuyết trình.
-- Chạy SAU 002_friends.sql. Chạy lại cũng an toàn.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. THÔNG TIN ĐIỂM ĐẾN (gắn vào từng nhiệm vụ / địa điểm)
-- ---------------------------------------------------------------------
alter table public.quests add column if not exists opening_hours text not null default '';
alter table public.quests add column if not exists ticket_info   text not null default '';
alter table public.quests add column if not exists story         text not null default '';
alter table public.quests add column if not exists etiquette     text not null default '';

update public.quests set
  opening_hours = v.hours, ticket_info = v.ticket, story = v.story, etiquette = v.etiquette
from (values
  ('Check-in Đại học Văn hóa Hà Nội', 'Giờ hành chính', 'Miễn phí',
   'Tiền thân là Trường Cán bộ Văn hóa thành lập năm 1959, nay là cái nôi đào tạo các ngành văn hóa, du lịch, thông tin – thư viện.',
   'Giữ trật tự trong khuôn viên trường, không làm ảnh hưởng giờ học.'),
  ('Tháp Rùa giữa lòng hồ', 'Cả ngày', 'Miễn phí',
   'Tháp Rùa được xây dựng cuối thế kỷ XIX trên gò Rùa giữa Hồ Hoàn Kiếm, gắn với truyền thuyết vua Lê Lợi trả gươm cho Rùa Vàng.',
   'Cuối tuần quanh hồ là phố đi bộ, hạn chế xe máy. Không xả rác xuống hồ.'),
  ('Qua cầu Thê Húc', 'Khoảng 7:00 – 18:00', 'Có vé vào đền (giá tham khảo tại quầy)',
   'Đền Ngọc Sơn thờ Văn Xương Đế Quân và Đức Thánh Trần Hưng Đạo. Cầu Thê Húc sơn đỏ, tên có nghĩa là "nơi đậu ánh sáng ban mai".',
   'Ăn mặc kín đáo, giữ yên lặng trong khu thờ tự, không chạm vào đồ lễ.'),
  ('Khuê Văn Các', 'Khoảng 8:00 – 17:00', 'Có vé (giảm giá cho học sinh, sinh viên)',
   'Văn Miếu được xây dựng năm 1070 thời vua Lý Thánh Tông; năm 1076 lập Quốc Tử Giám – trường đại học đầu tiên của Việt Nam. 82 bia Tiến sĩ được UNESCO ghi danh là Di sản tư liệu thế giới.',
   'Không ngồi, trèo lên hay xoa đầu rùa đá bia Tiến sĩ. Trang phục lịch sự.'),
  ('Chùa Một Cột', 'Khoảng 7:00 – 17:00', 'Miễn phí',
   'Chùa được xây dựng năm 1049 thời vua Lý Thái Tông, kiến trúc độc đáo như một đóa sen mọc lên từ mặt nước.',
   'Nằm gần khu Lăng Chủ tịch Hồ Chí Minh: ăn mặc chỉnh tề, không mặc quần short, váy ngắn.'),
  ('Hoàng thành Thăng Long', 'Khoảng 8:00 – 17:00', 'Có vé (giảm giá cho học sinh, sinh viên)',
   'Trung tâm quyền lực của nhiều triều đại suốt hơn 1.000 năm, được UNESCO công nhận là Di sản Văn hóa Thế giới năm 2010.',
   'Không leo trèo lên di tích, không chạm vào hiện vật khu khảo cổ.'),
  ('Hoàng hôn Chùa Trấn Quốc', 'Khoảng 8:00 – 16:00', 'Miễn phí',
   'Được xem là ngôi chùa cổ nhất Hà Nội với lịch sử khoảng 1.500 năm, nằm trên bán đảo nhỏ phía đông Hồ Tây.',
   'Trang phục kín đáo khi vào chùa. Hoàng hôn đẹp nhất có thể ngắm từ đường Thanh Niên.'),
  ('Nhà hát Lớn', 'Bên ngoài: cả ngày', 'Ngắm bên ngoài miễn phí; tham quan bên trong / xem biểu diễn có vé',
   'Khánh thành năm 1911, lấy cảm hứng từ Nhà hát Opera Garnier ở Paris – biểu tượng kiến trúc Pháp của Hà Nội.',
   'Không chắn lối vào khi chụp ảnh vào giờ có biểu diễn.'),
  ('Nhà thờ Lớn', 'Bên ngoài: cả ngày', 'Miễn phí',
   'Nhà thờ chính tòa Thánh Giuse khánh thành năm 1886, mang phong cách kiến trúc Gothic với hai tháp chuông cao.',
   'Giữ trật tự khi có thánh lễ, ăn mặc lịch sự nếu vào bên trong.'),
  ('Đi bộ trên cầu Long Biên', 'Cả ngày', 'Miễn phí',
   'Cầu do người Pháp xây dựng từ 1898 đến 1902, từng là một trong những cây cầu dài nhất châu Á, chứng nhân của nhiều giai đoạn lịch sử.',
   'Đi đúng phần đường dành cho người đi bộ, không đứng trên đường ray tàu.'),
  ('Chợ Đồng Xuân', 'Khoảng 6:00 – 18:00 (chợ đêm cuối tuần)', 'Miễn phí',
   'Xây dựng năm 1889, là chợ lớn và lâu đời nhất khu phố cổ Hà Nội.',
   'Hỏi giá trước khi mua, giữ đồ cá nhân cẩn thận nơi đông người.')
) as v(title, hours, ticket, story, etiquette)
where quests.title = v.title;

-- ---------------------------------------------------------------------
-- 2. TOURS — tuyến tham quan theo chủ đề, ghép từ các nhiệm vụ
-- ---------------------------------------------------------------------
create table if not exists public.tours (
  id          bigint generated always as identity primary key,
  title       text not null unique,
  subtitle    text not null default '',
  description text not null default '',
  emoji       text not null default '🧭',
  color       text not null default '#8f2d3a',
  duration    text not null default '',
  est_cost    text not null default '',
  best_time   text not null default '',
  audience    text not null default '',
  difficulty  text not null default 'Dễ',
  bonus_xp    int  not null default 150,
  bonus_coins int  not null default 100,
  sort_order  int  not null default 0,
  active      boolean not null default true
);
alter table public.tours enable row level security;
drop policy if exists "tours: readable" on public.tours;
create policy "tours: readable" on public.tours for select to authenticated using (active);

create table if not exists public.tour_stops (
  tour_id  bigint not null references public.tours(id) on delete cascade,
  quest_id bigint not null references public.quests(id) on delete cascade,
  position int    not null,
  note     text   not null default '',
  primary key (tour_id, quest_id)
);
alter table public.tour_stops enable row level security;
drop policy if exists "tour_stops: readable" on public.tour_stops;
create policy "tour_stops: readable" on public.tour_stops for select to authenticated using (true);

create table if not exists public.tour_completions (
  user_id      uuid   not null references public.profiles(id) on delete cascade,
  tour_id      bigint not null references public.tours(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, tour_id)
);
alter table public.tour_completions enable row level security;
drop policy if exists "tour_completions: read own" on public.tour_completions;
create policy "tour_completions: read own" on public.tour_completions
  for select to authenticated using (auth.uid() = user_id);

-- Nhận thưởng khi đã hoàn thành mọi điểm dừng của tour
create or replace function public.claim_tour(p_tour_id bigint)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  t      public.tours;
  v_left int;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập'; end if;
  select * into t from public.tours where id = p_tour_id and active;
  if not found then raise exception 'Không tìm thấy tour'; end if;
  if exists (select 1 from public.tour_completions where user_id = v_uid and tour_id = t.id) then
    raise exception 'Bạn đã nhận thưởng tour này rồi';
  end if;

  select count(*) into v_left from public.tour_stops s
  where s.tour_id = t.id
    and not exists (select 1 from public.quest_completions c where c.user_id = v_uid and c.quest_id = s.quest_id);
  if v_left > 0 then raise exception 'Còn % điểm dừng chưa hoàn thành', v_left; end if;

  insert into public.tour_completions (user_id, tour_id) values (v_uid, t.id);
  update public.profiles set xp = xp + t.bonus_xp, coins = coins + t.bonus_coins where id = v_uid;
  return json_build_object('xp', t.bonus_xp, 'coins', t.bonus_coins);
end $$;

revoke execute on function public.claim_tour(bigint) from public, anon;
grant  execute on function public.claim_tour(bigint) to authenticated;

-- Dữ liệu mẫu: 3 tour
insert into public.tours (title, subtitle, description, emoji, color, duration, est_cost, best_time, audience, difficulty, bonus_xp, bonus_coins, sort_order) values
  ('Di sản Thăng Long', 'Ngược dòng nghìn năm văn hiến',
   'Hành trình qua những di sản tiêu biểu nhất của kinh thành Thăng Long: từ Hoàng thành, Chùa Một Cột đến Văn Miếu – Quốc Tử Giám. Phù hợp để tìm hiểu lịch sử, văn hóa và truyền thống hiếu học của người Việt.',
   '🏯', '#8f2d3a', 'Nửa ngày (~4 giờ)', 'Khoảng 100.000 – 200.000đ (vé tham quan)', 'Buổi sáng, 8:00 – 11:30', 'Học sinh, sinh viên, khách yêu lịch sử', 'Dễ', 200, 150, 1),
  ('Phố cổ & Hồ Gươm', 'Một ngày dạo bộ trái tim Hà Nội',
   'Đi bộ quanh Hồ Hoàn Kiếm, qua cầu Thê Húc, len lỏi phố cổ đến chợ Đồng Xuân rồi ngắm sông Hồng từ cầu Long Biên. Trải nghiệm nhịp sống, ẩm thực và kiến trúc đặc trưng của Hà Nội.',
   '🐢', '#2f7d6d', '1 ngày đi bộ (~5 – 6 giờ)', 'Khoảng 100.000 – 250.000đ (vé + ăn vặt)', 'Cuối tuần (phố đi bộ quanh hồ)', 'Mọi lứa tuổi, khách lần đầu đến Hà Nội', 'Vừa', 250, 180, 2),
  ('Dấu ấn kiến trúc Pháp', 'Hà Nội thời thuộc địa qua những công trình',
   'Khám phá các công trình kiến trúc Pháp cuối thế kỷ XIX – đầu XX: Nhà hát Lớn, Nhà thờ Lớn và cầu Long Biên. Phù hợp cho người yêu kiến trúc và nhiếp ảnh.',
   '🎭', '#3b5b8f', 'Nửa ngày (~3 giờ)', 'Gần như miễn phí', 'Chiều muộn, ánh sáng đẹp để chụp ảnh', 'Người yêu kiến trúc, nhiếp ảnh', 'Dễ', 150, 100, 3)
on conflict (title) do nothing;

insert into public.tour_stops (tour_id, quest_id, position, note)
select t.id, q.id, s.pos, s.note
from (values
  ('Di sản Thăng Long', 'Hoàng thành Thăng Long', 1, 'Bắt đầu sớm để tránh nắng, ghé Đoan Môn trước.'),
  ('Di sản Thăng Long', 'Đố vui: Dời đô', 2, 'Trả lời ngay tại Hoàng thành.'),
  ('Di sản Thăng Long', 'Chùa Một Cột', 3, ''),
  ('Di sản Thăng Long', 'Khuê Văn Các', 4, ''),
  ('Di sản Thăng Long', 'Đố vui: Văn Miếu', 5, ''),
  ('Phố cổ & Hồ Gươm', 'Tháp Rùa giữa lòng hồ', 1, 'Buổi sáng sớm mặt hồ đẹp và mát nhất.'),
  ('Phố cổ & Hồ Gươm', 'Qua cầu Thê Húc', 2, ''),
  ('Phố cổ & Hồ Gươm', 'Đố vui: Hồ Gươm', 3, ''),
  ('Phố cổ & Hồ Gươm', 'Nhà thờ Lớn', 4, 'Nghỉ chân với cốc trà chanh gần nhà thờ.'),
  ('Phố cổ & Hồ Gươm', 'Chợ Đồng Xuân', 5, 'Đi xuyên qua các phố Hàng – phố cổ 36 phố phường.'),
  ('Phố cổ & Hồ Gươm', 'Đố vui: Phố cổ', 6, ''),
  ('Phố cổ & Hồ Gươm', 'Đi bộ trên cầu Long Biên', 7, 'Kết thúc ngày bằng hoàng hôn trên sông Hồng.'),
  ('Dấu ấn kiến trúc Pháp', 'Nhà hát Lớn', 1, ''),
  ('Dấu ấn kiến trúc Pháp', 'Nhà thờ Lớn', 2, ''),
  ('Dấu ấn kiến trúc Pháp', 'Đi bộ trên cầu Long Biên', 3, ''),
  ('Dấu ấn kiến trúc Pháp', 'Đố vui: Cầu Long Biên', 4, '')
) as s(tour, quest, pos, note)
join public.tours t on t.title = s.tour
join public.quests q on q.title = s.quest
on conflict (tour_id, quest_id) do nothing;

-- ---------------------------------------------------------------------
-- 3. REVIEWS — đánh giá trải nghiệm theo tiêu chí chất lượng dịch vụ
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  quest_id    bigint references public.quests(id) on delete cascade,
  tour_id     bigint references public.tours(id) on delete cascade,
  overall     int not null check (overall between 1 and 5),
  attraction  int not null check (attraction between 1 and 5),   -- Mức độ hấp dẫn
  information int not null check (information between 1 and 5),  -- Hướng dẫn & thông tin
  facilities  int not null check (facilities between 1 and 5),   -- Dịch vụ & tiện ích
  value       int not null check (value between 1 and 5),        -- Xứng đáng thời gian / chi phí
  recommend   boolean not null default true,                     -- Có giới thiệu cho người khác?
  comment     text not null default '' check (char_length(comment) <= 500),
  created_at  timestamptz not null default now(),
  check ((quest_id is null) <> (tour_id is null))
);
create unique index if not exists reviews_user_quest_idx on public.reviews (user_id, quest_id) where quest_id is not null;
create unique index if not exists reviews_user_tour_idx  on public.reviews (user_id, tour_id)  where tour_id  is not null;

alter table public.reviews enable row level security;
-- Đánh giá là công khai trong cộng đồng (giống review trên Google Maps)
drop policy if exists "reviews: readable" on public.reviews;
create policy "reviews: readable" on public.reviews for select to authenticated using (true);
drop policy if exists "reviews: delete own" on public.reviews;
create policy "reviews: delete own" on public.reviews for delete to authenticated using (auth.uid() = user_id);
revoke insert, update on public.reviews from anon, authenticated;

-- Gửi / sửa đánh giá (chỉ khi đã trải nghiệm), lần đầu được +20 coins
create or replace function public.submit_review(
  p_quest_id bigint, p_tour_id bigint,
  p_overall int, p_attraction int, p_information int, p_facilities int, p_value int,
  p_recommend boolean, p_comment text
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_id    bigint;
  v_bonus int := 0;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập'; end if;
  if (p_quest_id is null) = (p_tour_id is null) then raise exception 'Thiếu đối tượng đánh giá'; end if;

  if p_quest_id is not null and not exists (
    select 1 from public.quest_completions where user_id = v_uid and quest_id = p_quest_id) then
    raise exception 'Hãy hoàn thành nhiệm vụ trước khi đánh giá';
  end if;
  if p_tour_id is not null and not exists (
    select 1 from public.tour_completions where user_id = v_uid and tour_id = p_tour_id) then
    raise exception 'Hãy hoàn thành tour trước khi đánh giá';
  end if;

  select id into v_id from public.reviews
  where user_id = v_uid and quest_id is not distinct from p_quest_id and tour_id is not distinct from p_tour_id;

  if v_id is null then
    insert into public.reviews (user_id, quest_id, tour_id, overall, attraction, information, facilities, value, recommend, comment)
    values (v_uid, p_quest_id, p_tour_id, p_overall, p_attraction, p_information, p_facilities, p_value, p_recommend, left(coalesce(p_comment, ''), 500));
    v_bonus := 20;
    update public.profiles set coins = coins + v_bonus where id = v_uid;
  else
    update public.reviews set overall = p_overall, attraction = p_attraction, information = p_information,
      facilities = p_facilities, value = p_value, recommend = p_recommend,
      comment = left(coalesce(p_comment, ''), 500), created_at = now()
    where id = v_id;
  end if;
  return json_build_object('coins', v_bonus);
end $$;

revoke execute on function public.submit_review(bigint, bigint, int, int, int, int, int, boolean, text) from public, anon;
grant  execute on function public.submit_review(bigint, bigint, int, int, int, int, int, boolean, text) to authenticated;

-- Số liệu tổng hợp cho trang Thống kê (chỉ trả số đếm, không lộ dữ liệu cá nhân)
create or replace function public.app_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'users',       (select count(*) from public.profiles),
    'completions', (select count(*) from public.quest_completions),
    'photos',      (select count(*) from public.quest_completions where photo_path is not null),
    'tours_done',  (select count(*) from public.tour_completions),
    'reviews',     (select count(*) from public.reviews),
    'top_quests',  (select coalesce(json_agg(t), '[]'::json) from (
                      select q.title, q.emoji, count(*) as n
                      from public.quest_completions c join public.quests q on q.id = c.quest_id
                      where not q.is_daily
                      group by q.id order by n desc limit 5) t)
  );
$$;
revoke execute on function public.app_stats() from public, anon;
grant  execute on function public.app_stats() to authenticated;

-- ---------------------------------------------------------------------
-- 4. CHẾ ĐỘ DEMO — tài khoản thuyết trình check-in được ở bất kỳ đâu
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists is_demo boolean not null default false;

-- Bật cho tài khoản thuyết trình: bỏ dấu -- ở dòng dưới, sửa tên đăng nhập rồi chạy
-- update public.profiles set is_demo = true where username = 'ten_dang_nhap';

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

  -- Tài khoản demo bỏ qua kiểm tra vị trí (để thuyết trình trong phòng)
  if (q.require_location or q.kind = 'checkin') and not p.is_demo then
    if p_lat is null or p_lng is null then
      raise exception 'Cần bật định vị (GPS) để check-in';
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

-- ---------------------------------------------------------------------
-- 5. (TUỲ CHỌN) XOÁ TÀI KHOẢN TEST trước khi thuyết trình
--    Bỏ dấu -- ở dòng dưới rồi chạy riêng dòng đó.
-- ---------------------------------------------------------------------
-- delete from auth.users where email like 'test\_claude%@users.hanoigo.app';
