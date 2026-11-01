-- =====================================================================
-- HANOI GO! — Supabase schema
-- Chạy toàn bộ file này 1 lần trong Supabase Dashboard → SQL Editor → Run.
-- Chạy lại cũng được (các lệnh đều an toàn khi chạy lặp lại).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES — mỗi tài khoản có 1 hồ sơ
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name     text not null default '' check (char_length(display_name) <= 40),
  avatar           text not null default '🐢' check (char_length(avatar) <= 16),
  bio              text not null default '' check (char_length(bio) <= 160),
  xp               int  not null default 0,
  coins            int  not null default 200,
  streak           int  not null default 0,
  best_streak      int  not null default 0,
  last_active_date date,
  created_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: signed-in users can read" on public.profiles;
create policy "profiles: signed-in users can read" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Người dùng chỉ được sửa tên hiển thị, avatar, bio. XP / coins / streak
-- chỉ thay đổi qua các hàm phía server bên dưới → không gian lận được.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, avatar, bio) on public.profiles to authenticated;

-- Tự tạo profile khi có tài khoản mới
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
             new.raw_user_meta_data ->> 'username')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. QUESTS — nhiệm vụ
--    kind: 'photo' (chụp ảnh) | 'checkin' (định vị) | 'quiz' (câu đố)
-- ---------------------------------------------------------------------
create table if not exists public.quests (
  id               bigint generated always as identity primary key,
  title            text not null,
  description      text not null default '',
  kind             text not null check (kind in ('photo', 'checkin', 'quiz')),
  place_name       text not null default '',
  area             text not null default '',
  lat              double precision,
  lng              double precision,
  radius_m         int  not null default 200,
  require_location boolean not null default false,
  is_daily         boolean not null default false,
  xp_reward        int  not null default 50,
  coin_reward      int  not null default 20,
  emoji            text not null default '📍',
  tip              text not null default '',
  quiz_question    text,
  quiz_options     jsonb,
  sort_order       int  not null default 0,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table public.quests enable row level security;
drop policy if exists "quests: readable" on public.quests;
create policy "quests: readable" on public.quests
  for select to authenticated using (active);

-- Đáp án câu đố: bảng riêng, KHÔNG có policy → client không đọc được
create table if not exists public.quest_answers (
  quest_id      bigint primary key references public.quests(id) on delete cascade,
  correct_index int not null
);
alter table public.quest_answers enable row level security;

-- ---------------------------------------------------------------------
-- 3. QUEST COMPLETIONS — lịch sử hoàn thành nhiệm vụ
-- ---------------------------------------------------------------------
create table if not exists public.quest_completions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  quest_id     bigint not null references public.quests(id) on delete cascade,
  completed_on date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  photo_path   text,
  lat          double precision,
  lng          double precision,
  xp_earned    int not null default 0,
  coins_earned int not null default 0,
  created_at   timestamptz not null default now(),
  unique (user_id, quest_id, completed_on)
);

alter table public.quest_completions enable row level security;
drop policy if exists "completions: read own" on public.quest_completions;
create policy "completions: read own" on public.quest_completions
  for select to authenticated using (auth.uid() = user_id);
-- Không có policy insert: chỉ ghi qua hàm complete_quest()

-- ---------------------------------------------------------------------
-- 4. JOURNAL — Sổ hành trình (ảnh + ghi chú của từng người)
-- ---------------------------------------------------------------------
create table if not exists public.journal_entries (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title      text not null default '' check (char_length(title) <= 80),
  note       text not null default '' check (char_length(note) <= 1000),
  photo_path text,
  place_name text not null default '' check (char_length(place_name) <= 80),
  quest_id   bigint references public.quests(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.journal_entries enable row level security;
drop policy if exists "journal: read own" on public.journal_entries;
create policy "journal: read own" on public.journal_entries
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "journal: insert own" on public.journal_entries;
create policy "journal: insert own" on public.journal_entries
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "journal: update own" on public.journal_entries;
create policy "journal: update own" on public.journal_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "journal: delete own" on public.journal_entries;
create policy "journal: delete own" on public.journal_entries
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 5. CARDS — thẻ sưu tập
-- ---------------------------------------------------------------------
create table if not exists public.cards (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  description text not null default '',
  rarity      text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  emoji       text not null default '🎴',
  sort_order  int  not null default 0
);
alter table public.cards enable row level security;
drop policy if exists "cards: readable" on public.cards;
create policy "cards: readable" on public.cards for select to authenticated using (true);

create table if not exists public.user_cards (
  user_id  uuid   not null references public.profiles(id) on delete cascade,
  card_id  bigint not null references public.cards(id) on delete cascade,
  count    int    not null default 1,
  first_at timestamptz not null default now(),
  primary key (user_id, card_id)
);
alter table public.user_cards enable row level security;
drop policy if exists "user_cards: read own" on public.user_cards;
create policy "user_cards: read own" on public.user_cards
  for select to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 6. STORAGE — bucket ảnh riêng tư, mỗi người 1 thư mục <user_id>/...
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "photos: upload own folder" on storage.objects;
create policy "photos: upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos: read own folder" on storage.objects;
create policy "photos: read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos: delete own folder" on storage.objects;
create policy "photos: delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 7. SERVER FUNCTIONS (RPC)
-- ---------------------------------------------------------------------

-- Hoàn thành nhiệm vụ: kiểm tra điều kiện, cộng XP/coins, cập nhật streak
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

  if q.require_location or q.kind = 'checkin' then
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

  select * into p from public.profiles where id = v_uid for update;
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

-- Mở gói thẻ: trừ 100 coins, nhận 3 thẻ ngẫu nhiên theo độ hiếm
create or replace function public.open_pack()
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_cost  int := 100;
  v_coins int;
  v_roll  double precision;
  v_rar   text;
  c       public.cards;
  v_cards jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập';
  end if;

  select coins into v_coins from public.profiles where id = v_uid for update;
  if v_coins < v_cost then
    raise exception 'Bạn cần % Hanoi Coins để mở gói thẻ (đang có %)', v_cost, v_coins;
  end if;
  update public.profiles set coins = coins - v_cost where id = v_uid;

  for i in 1..3 loop
    v_roll := random();
    v_rar := case
      when v_roll < 0.03 then 'legendary'
      when v_roll < 0.15 then 'epic'
      when v_roll < 0.42 then 'rare'
      else 'common'
    end;
    select * into c from public.cards where rarity = v_rar order by random() limit 1;
    if not found then
      select * into c from public.cards order by random() limit 1;
    end if;
    insert into public.user_cards (user_id, card_id) values (v_uid, c.id)
      on conflict (user_id, card_id) do update set count = public.user_cards.count + 1;
    v_cards := v_cards || jsonb_build_object(
      'id', c.id, 'name', c.name, 'emoji', c.emoji, 'rarity', c.rarity, 'description', c.description);
  end loop;

  return json_build_object('cards', v_cards, 'coins', v_coins - v_cost);
end $$;

revoke execute on function public.complete_quest(bigint, text, double precision, double precision, int, text) from public, anon;
grant  execute on function public.complete_quest(bigint, text, double precision, double precision, int, text) to authenticated;
revoke execute on function public.open_pack() from public, anon;
grant  execute on function public.open_pack() to authenticated;

-- ---------------------------------------------------------------------
-- 8. DỮ LIỆU MẪU — nhiệm vụ & thẻ (sửa / thêm tuỳ ý)
-- ---------------------------------------------------------------------
insert into public.quests
  (title, description, kind, place_name, area, lat, lng, radius_m, require_location, is_daily, xp_reward, coin_reward, emoji, tip, sort_order)
select * from (values
  ('Khoảnh khắc Hà Nội hôm nay', 'Chụp một bức ảnh bất kỳ về Hà Nội hôm nay — con phố, ly cà phê, gánh hàng rong…', 'photo', 'Bất kỳ đâu ở Hà Nội', 'Hà Nội', null::float8, null::float8, 200, false, true, 30, 15, '📸', 'Mỗi ngày làm 1 lần để giữ chuỗi streak 🔥', 1),
  ('Check-in Đại học Văn hóa Hà Nội', 'Đến cổng trường, giơ 2 ngón tay ✌️ và lưu lại khoảnh khắc của bạn!', 'photo', 'Đại học Văn hóa Hà Nội', 'Đống Đa', 21.0226, 105.8212, 300, false, false, 120, 80, '🎓', 'Chọn góc có bảng tên trường để ảnh đẹp hơn.', 2),
  ('Tháp Rùa giữa lòng hồ', 'Chụp Tháp Rùa từ bờ Hồ Hoàn Kiếm.', 'photo', 'Hồ Hoàn Kiếm', 'Hoàn Kiếm', 21.0287, 105.8524, 300, false, false, 100, 50, '🐢', 'Buổi sáng sớm hoặc lúc hoàng hôn là đẹp nhất.', 3),
  ('Qua cầu Thê Húc', 'Check-in tại Đền Ngọc Sơn — cây cầu son đỏ nổi tiếng.', 'checkin', 'Đền Ngọc Sơn', 'Hoàn Kiếm', 21.0307, 105.8524, 200, true, false, 80, 40, '🌉', 'Bật định vị trên điện thoại khi đến nơi.', 4),
  ('Khuê Văn Các', 'Ghé Văn Miếu – Quốc Tử Giám, trường đại học đầu tiên của Việt Nam, và chụp Khuê Văn Các.', 'photo', 'Văn Miếu – Quốc Tử Giám', 'Đống Đa', 21.0293, 105.8355, 300, false, false, 120, 60, '🏯', 'Khuê Văn Các có trên tờ tiền 100.000đ đó!', 5),
  ('Chùa Một Cột', 'Check-in ngôi chùa có kiến trúc độc đáo hình bông sen.', 'checkin', 'Chùa Một Cột', 'Ba Đình', 21.0359, 105.8336, 200, true, false, 80, 40, '🪷', '', 6),
  ('Hoàng thành Thăng Long', 'Khám phá Di sản Văn hóa Thế giới giữa lòng thủ đô.', 'checkin', 'Hoàng thành Thăng Long', 'Ba Đình', 21.0353, 105.8403, 250, true, false, 100, 50, '🏰', 'Nhớ ghé Đoan Môn và khu khảo cổ 18 Hoàng Diệu.', 7),
  ('Hoàng hôn Chùa Trấn Quốc', 'Chụp ngôi chùa cổ nhất Hà Nội bên Hồ Tây.', 'photo', 'Chùa Trấn Quốc', 'Tây Hồ', 21.0480, 105.8366, 300, false, false, 100, 50, '🌅', '', 8),
  ('Nhà hát Lớn', 'Check-in công trình kiến trúc Pháp nổi bật của Hà Nội.', 'checkin', 'Nhà hát Lớn Hà Nội', 'Hoàn Kiếm', 21.0242, 105.8576, 200, true, false, 80, 40, '🎭', '', 9),
  ('Nhà thờ Lớn', 'Chụp ảnh với Nhà thờ Lớn và thưởng thức một cốc trà chanh gần đó.', 'photo', 'Nhà thờ Lớn Hà Nội', 'Hoàn Kiếm', 21.0287, 105.8489, 250, false, false, 90, 45, '⛪', '', 10),
  ('Đi bộ trên cầu Long Biên', 'Check-in cây cầu hơn trăm tuổi bắc qua sông Hồng.', 'checkin', 'Cầu Long Biên', 'Long Biên', 21.0430, 105.8590, 400, true, false, 100, 50, '🚂', 'Lên cầu từ phía phố Phùng Hưng.', 11),
  ('Chợ Đồng Xuân', 'Chụp một góc chợ lớn nhất phố cổ.', 'photo', 'Chợ Đồng Xuân', 'Hoàn Kiếm', 21.0381, 105.8494, 250, false, false, 80, 40, '🛍️', '', 12)
) v
where not exists (select 1 from public.quests);

-- Câu đố
insert into public.quests (title, description, kind, place_name, area, emoji, xp_reward, coin_reward, quiz_question, quiz_options, sort_order)
select v.title, v.descr, 'quiz', v.place, v.area, v.emoji, 60, 30, v.question, v.options::jsonb, v.ord
from (values
  ('Đố vui: Văn Miếu', 'Trả lời đúng để nhận thưởng.', 'Văn Miếu – Quốc Tử Giám', 'Đống Đa', '❓', 'Văn Miếu được xây dựng vào năm nào?', '["1010","1070","1428","1802"]', 101),
  ('Đố vui: Hồ Gươm', 'Trả lời đúng để nhận thưởng.', 'Hồ Hoàn Kiếm', 'Hoàn Kiếm', '❓', 'Truyền thuyết trả gươm ở Hồ Hoàn Kiếm gắn với vị vua nào?', '["Lý Thái Tổ","Trần Nhân Tông","Lê Lợi","Quang Trung"]', 102),
  ('Đố vui: Dời đô', 'Trả lời đúng để nhận thưởng.', 'Hoàng thành Thăng Long', 'Ba Đình', '❓', 'Vua Lý Thái Tổ ban Chiếu dời đô về Thăng Long vào năm nào?', '["938","1010","1288","1945"]', 103),
  ('Đố vui: Cầu Long Biên', 'Trả lời đúng để nhận thưởng.', 'Cầu Long Biên', 'Long Biên', '❓', 'Cầu Long Biên được khánh thành vào năm nào?', '["1886","1902","1931","1954"]', 104),
  ('Đố vui: Phố cổ', 'Trả lời đúng để nhận thưởng.', 'Phố cổ Hà Nội', 'Hoàn Kiếm', '❓', 'Khu phố cổ Hà Nội thường được gọi bằng cái tên nào?', '["36 phố phường","12 cửa ô","Thập tam trại","Tứ trấn"]', 105)
) as v(title, descr, place, area, emoji, question, options, ord)
where not exists (select 1 from public.quests where kind = 'quiz');

insert into public.quest_answers (quest_id, correct_index)
select q.id, a.idx
from public.quests q
join (values
  ('Đố vui: Văn Miếu', 1),
  ('Đố vui: Hồ Gươm', 2),
  ('Đố vui: Dời đô', 1),
  ('Đố vui: Cầu Long Biên', 1),
  ('Đố vui: Phố cổ', 0)
) as a(title, idx) on a.title = q.title
on conflict (quest_id) do nothing;

-- Thẻ sưu tập
insert into public.cards (name, description, rarity, emoji, sort_order) values
  ('Phở bò',             'Bát phở nóng hổi buổi sáng Hà Nội.',                'common',    '🍜', 1),
  ('Bún chả',            'Chả nướng than hoa thơm lừng.',                     'common',    '🥢', 2),
  ('Hoa sữa',            'Mùi hương đặc trưng của Hà Nội mùa thu.',           'common',    '🌼', 3),
  ('Xích lô',            'Dạo một vòng phố cổ chậm rãi.',                     'common',    '🛺', 4),
  ('Trà đá vỉa hè',      'Ngồi ghế nhựa, ngắm phố, tán chuyện.',              'common',    '🧊', 5),
  ('Bánh cuốn',          'Mỏng tang, chấm nước mắm thơm.',                    'common',    '🥟', 6),
  ('Cà phê trứng',       'Béo ngậy, đặc sản riêng của Hà Nội.',               'rare',      '☕', 7),
  ('Cốm làng Vòng',      'Hương vị mùa thu gói trong lá sen.',                'rare',      '🍃', 8),
  ('Chả cá Lã Vọng',     'Món ăn đã thành tên một con phố.',                  'rare',      '🐟', 9),
  ('Chùa Một Cột',       'Ngôi chùa hình bông sen độc đáo.',                  'rare',      '🪷', 10),
  ('Tháp Rùa',           'Biểu tượng giữa lòng Hồ Gươm.',                     'epic',      '🐢', 11),
  ('Cầu Long Biên',      'Chứng nhân lịch sử hơn một thế kỷ.',                'epic',      '🌉', 12),
  ('Múa rối nước',       'Nghệ thuật dân gian độc đáo của đồng bằng Bắc Bộ.', 'epic',      '🎎', 13),
  ('Khuê Văn Các',       'Biểu tượng của Thủ đô Hà Nội.',                     'legendary', '🏯', 14),
  ('Hoàng thành Thăng Long', 'Di sản Văn hóa Thế giới.',                      'legendary', '🏰', 15)
on conflict (name) do nothing;
