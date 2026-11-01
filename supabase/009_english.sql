-- =====================================================================
-- HANOI GO! — Cập nhật 009: NỘI DUNG TIẾNG ANH (song ngữ Việt – Anh)
-- Thêm các cột *_en cho nhiệm vụ, câu đố, thẻ, tour. App tự dùng bản tiếng Anh
-- khi người dùng chọn English; ô nào để trống thì hiện bản tiếng Việt.
-- Chạy SAU 008_delete_user.sql. Chạy lại cũng an toàn.
-- =====================================================================

alter table public.quests add column if not exists title_en         text;
alter table public.quests add column if not exists description_en   text;
alter table public.quests add column if not exists place_name_en    text;
alter table public.quests add column if not exists tip_en           text;
alter table public.quests add column if not exists quiz_question_en text;
alter table public.quests add column if not exists quiz_options_en  jsonb;
alter table public.quests add column if not exists opening_hours_en text;
alter table public.quests add column if not exists ticket_info_en   text;
alter table public.quests add column if not exists story_en         text;
alter table public.quests add column if not exists etiquette_en     text;

alter table public.cards add column if not exists name_en        text;
alter table public.cards add column if not exists description_en text;

alter table public.tours add column if not exists title_en       text;
alter table public.tours add column if not exists subtitle_en    text;
alter table public.tours add column if not exists description_en text;
alter table public.tours add column if not exists duration_en    text;
alter table public.tours add column if not exists est_cost_en    text;
alter table public.tours add column if not exists best_time_en   text;
alter table public.tours add column if not exists audience_en    text;
alter table public.tours add column if not exists difficulty_en  text;

alter table public.tour_stops add column if not exists note_en text;

-- ---------- Nhiệm vụ ----------
update public.quests set
  title_en = v.title, description_en = v.descr, place_name_en = v.place, tip_en = nullif(v.tip, '')
from (values
  ('Khoảnh khắc Hà Nội hôm nay', 'Hanoi moment of the day',
   'Snap any photo of Hanoi today — a street, a cup of coffee, a street vendor…', 'Anywhere in Hanoi',
   'Do it once a day to keep your 🔥 streak'),
  ('Check-in Đại học Văn hóa Hà Nội', 'Check-in at Hanoi University of Culture',
   'Go to the school gate, throw up a ✌️ and capture your moment!', 'Hanoi University of Culture',
   'Frame the school''s name sign for a better shot.'),
  ('Tháp Rùa giữa lòng hồ', 'Turtle Tower in the lake',
   'Photograph Turtle Tower from the shore of Hoan Kiem Lake.', 'Hoan Kiem Lake',
   'Early morning or sunset is the most beautiful time.'),
  ('Qua cầu Thê Húc', 'Cross The Huc Bridge',
   'Check in at Ngoc Son Temple — home of the famous red bridge.', 'Ngoc Son Temple',
   'Turn on location on your phone when you arrive.'),
  ('Khuê Văn Các', 'Khue Van Cac pavilion',
   'Visit the Temple of Literature – Imperial Academy, Vietnam''s first university, and photograph Khue Van Cac.', 'Temple of Literature',
   'Khue Van Cac is printed on the 100,000 VND banknote!'),
  ('Chùa Một Cột', 'One Pillar Pagoda',
   'Check in at the pagoda with its unique lotus-shaped architecture.', 'One Pillar Pagoda', ''),
  ('Hoàng thành Thăng Long', 'Thang Long Imperial Citadel',
   'Explore a UNESCO World Heritage Site in the heart of the capital.', 'Thang Long Imperial Citadel',
   'Don''t miss Doan Mon Gate and the archaeological site at 18 Hoang Dieu.'),
  ('Hoàng hôn Chùa Trấn Quốc', 'Sunset at Tran Quoc Pagoda',
   'Photograph Hanoi''s oldest pagoda on the shore of West Lake.', 'Tran Quoc Pagoda', ''),
  ('Nhà hát Lớn', 'Hanoi Opera House',
   'Check in at one of Hanoi''s most striking French-era buildings.', 'Hanoi Opera House', ''),
  ('Nhà thờ Lớn', 'St. Joseph''s Cathedral',
   'Take a photo with the Cathedral and enjoy a lemon tea nearby.', 'St. Joseph''s Cathedral', ''),
  ('Đi bộ trên cầu Long Biên', 'Walk across Long Bien Bridge',
   'Check in at the century-old bridge over the Red River.', 'Long Bien Bridge',
   'Get onto the bridge from Phung Hung street.'),
  ('Chợ Đồng Xuân', 'Dong Xuan Market',
   'Photograph a corner of the Old Quarter''s biggest market.', 'Dong Xuan Market', ''),
  ('Đố vui: Văn Miếu', 'Quiz: Temple of Literature', 'Answer correctly to earn rewards.', 'Temple of Literature', ''),
  ('Đố vui: Hồ Gươm', 'Quiz: Hoan Kiem Lake', 'Answer correctly to earn rewards.', 'Hoan Kiem Lake', ''),
  ('Đố vui: Dời đô', 'Quiz: Moving the capital', 'Answer correctly to earn rewards.', 'Thang Long Imperial Citadel', ''),
  ('Đố vui: Cầu Long Biên', 'Quiz: Long Bien Bridge', 'Answer correctly to earn rewards.', 'Long Bien Bridge', ''),
  ('Đố vui: Phố cổ', 'Quiz: The Old Quarter', 'Answer correctly to earn rewards.', 'Hanoi Old Quarter', '')
) as v(vi, title, descr, place, tip)
where quests.title = v.vi;

-- Câu đố: giữ nguyên thứ tự đáp án (đáp án đúng không đổi)
update public.quests set quiz_question_en = v.q, quiz_options_en = v.opts::jsonb
from (values
  ('Đố vui: Văn Miếu', 'In which year was the Temple of Literature built?', '["1010","1070","1428","1802"]'),
  ('Đố vui: Hồ Gươm', 'The legend of returning the sword at Hoan Kiem Lake is linked to which king?', '["Ly Thai To","Tran Nhan Tong","Le Loi","Quang Trung"]'),
  ('Đố vui: Dời đô', 'In which year did King Ly Thai To issue the edict moving the capital to Thang Long?', '["938","1010","1288","1945"]'),
  ('Đố vui: Cầu Long Biên', 'In which year was Long Bien Bridge inaugurated?', '["1886","1902","1931","1954"]'),
  ('Đố vui: Phố cổ', 'What is the Hanoi Old Quarter often called?', '["36 streets and guilds","12 city gates","13 hamlets","4 guardian temples"]')
) as v(vi, q, opts)
where quests.title = v.vi;

-- Thông tin điểm đến
update public.quests set
  opening_hours_en = v.hours, ticket_info_en = v.ticket, story_en = v.story, etiquette_en = v.etiquette
from (values
  ('Check-in Đại học Văn hóa Hà Nội', 'Office hours', 'Free',
   'Founded in 1959 as the School of Cultural Officials, it now trains students in culture, tourism, and information & library science.',
   'Keep quiet on campus and don''t disturb classes.'),
  ('Tháp Rùa giữa lòng hồ', 'All day', 'Free',
   'Built in the late 19th century on Turtle Islet in Hoan Kiem Lake, linked to the legend of King Le Loi returning his sword to the Golden Turtle.',
   'At weekends the lakeside becomes a pedestrian zone. Don''t litter in the lake.'),
  ('Qua cầu Thê Húc', 'About 7:00 – 18:00', 'Temple entrance fee (see prices at the counter)',
   'Ngoc Son Temple honours Van Xuong De Quan and Saint Tran Hung Dao. The red The Huc Bridge''s name means "where the morning sunlight rests".',
   'Dress modestly, keep quiet in worship areas, and don''t touch offerings.'),
  ('Khuê Văn Các', 'About 8:00 – 17:00', 'Ticketed (discounts for students)',
   'The Temple of Literature was built in 1070 under King Ly Thanh Tong; in 1076 the Imperial Academy — Vietnam''s first university — was founded. Its 82 Doctors'' steles are listed by UNESCO as Memory of the World.',
   'Don''t sit on, climb, or rub the heads of the stone turtles. Dress respectfully.'),
  ('Chùa Một Cột', 'About 7:00 – 17:00', 'Free',
   'Built in 1049 under King Ly Thai Tong, its unique design resembles a lotus rising from the water.',
   'It is next to the Ho Chi Minh Mausoleum area: dress neatly, no shorts or short skirts.'),
  ('Hoàng thành Thăng Long', 'About 8:00 – 17:00', 'Ticketed (discounts for students)',
   'The seat of power of many dynasties for over 1,000 years, recognised by UNESCO as a World Heritage Site in 2010.',
   'Don''t climb on the relics or touch artefacts at the archaeological site.'),
  ('Hoàng hôn Chùa Trấn Quốc', 'About 8:00 – 16:00', 'Free',
   'Regarded as Hanoi''s oldest pagoda with about 1,500 years of history, on a small peninsula on the east side of West Lake.',
   'Dress modestly inside the pagoda. The best sunset view is from Thanh Nien road.'),
  ('Nhà hát Lớn', 'Outside: all day', 'Free to view from outside; tours inside / performances are ticketed',
   'Opened in 1911 and inspired by the Palais Garnier in Paris — a symbol of French architecture in Hanoi.',
   'Don''t block the entrance when taking photos during show times.'),
  ('Nhà thờ Lớn', 'Outside: all day', 'Free',
   'St. Joseph''s Cathedral opened in 1886 in Gothic style with two tall bell towers.',
   'Keep quiet during Mass and dress respectfully if you go inside.'),
  ('Đi bộ trên cầu Long Biên', 'All day', 'Free',
   'Built by the French from 1898 to 1902, it was once one of the longest bridges in Asia and has witnessed many chapters of history.',
   'Stay on the pedestrian path and never stand on the railway tracks.'),
  ('Chợ Đồng Xuân', 'About 6:00 – 18:00 (night market at weekends)', 'Free',
   'Built in 1889, it is the largest and oldest market in Hanoi''s Old Quarter.',
   'Ask the price before buying and keep an eye on your belongings in crowds.')
) as v(vi, hours, ticket, story, etiquette)
where quests.title = v.vi;

-- ---------- Thẻ sưu tầm ----------
update public.cards set name_en = v.name, description_en = v.descr
from (values
  ('Phở bò', 'Beef pho', 'A steaming bowl of pho on a Hanoi morning.'),
  ('Bún chả', 'Bun cha', 'Charcoal-grilled pork with a mouth-watering aroma.'),
  ('Hoa sữa', 'Milk flowers', 'The signature scent of Hanoi in autumn.'),
  ('Xích lô', 'Cyclo', 'A slow ride around the Old Quarter.'),
  ('Trà đá vỉa hè', 'Sidewalk iced tea', 'Plastic stools, street watching, and a good chat.'),
  ('Bánh cuốn', 'Banh cuon', 'Paper-thin rice rolls dipped in fragrant fish sauce.'),
  ('Cà phê trứng', 'Egg coffee', 'Rich and creamy — a Hanoi original.'),
  ('Cốm làng Vòng', 'Vong village green rice', 'The taste of autumn wrapped in a lotus leaf.'),
  ('Chả cá Lã Vọng', 'Cha ca La Vong', 'A dish so famous a street is named after it.'),
  ('Chùa Một Cột', 'One Pillar Pagoda', 'A one-of-a-kind lotus-shaped pagoda.'),
  ('Tháp Rùa', 'Turtle Tower', 'The symbol in the heart of Hoan Kiem Lake.'),
  ('Cầu Long Biên', 'Long Bien Bridge', 'A witness to more than a century of history.'),
  ('Múa rối nước', 'Water puppetry', 'A unique folk art of the Red River Delta.'),
  ('Khuê Văn Các', 'Khue Van Cac', 'The symbol of Hanoi, the capital.'),
  ('Hoàng thành Thăng Long', 'Thang Long Imperial Citadel', 'A UNESCO World Heritage Site.')
) as v(vi, name, descr)
where cards.name = v.vi;

-- ---------- Tour ----------
update public.tours set
  title_en = v.title, subtitle_en = v.sub, description_en = v.descr, duration_en = v.dur,
  est_cost_en = v.cost, best_time_en = v.best, audience_en = v.aud, difficulty_en = v.diff
from (values
  ('Di sản Thăng Long', 'Thang Long Heritage', 'A journey back through a thousand years of culture',
   'A route through the most iconic heritage sites of the Thang Long capital: the Imperial Citadel, One Pillar Pagoda and the Temple of Literature. Great for learning about Vietnamese history, culture and the tradition of learning.',
   'Half a day (~4 hours)', 'About 100,000 – 200,000 VND (entrance tickets)', 'Morning, 8:00 – 11:30', 'Students and history lovers', 'Easy'),
  ('Phố cổ & Hồ Gươm', 'Old Quarter & Hoan Kiem Lake', 'A day on foot in the heart of Hanoi',
   'Stroll around Hoan Kiem Lake, cross The Huc Bridge, wander the Old Quarter to Dong Xuan Market and watch the Red River from Long Bien Bridge. Experience Hanoi''s rhythm of life, food and architecture.',
   '1 day on foot (~5 – 6 hours)', 'About 100,000 – 250,000 VND (tickets + snacks)', 'Weekends (lakeside walking street)', 'All ages, first-time visitors to Hanoi', 'Moderate'),
  ('Dấu ấn kiến trúc Pháp', 'French Architecture Trail', 'Colonial-era Hanoi through its buildings',
   'Discover French buildings from the late 19th – early 20th century: the Opera House, St. Joseph''s Cathedral and Long Bien Bridge. Ideal for architecture and photography lovers.',
   'Half a day (~3 hours)', 'Almost free', 'Late afternoon, beautiful light for photos', 'Architecture and photography lovers', 'Easy')
) as v(vi, title, sub, descr, dur, cost, best, aud, diff)
where tours.title = v.vi;

update public.tour_stops ts set note_en = v.note
from (values
  ('Di sản Thăng Long', 'Hoàng thành Thăng Long', 'Start early to beat the heat; visit Doan Mon Gate first.'),
  ('Di sản Thăng Long', 'Đố vui: Dời đô', 'Answer it right at the Imperial Citadel.'),
  ('Phố cổ & Hồ Gươm', 'Tháp Rùa giữa lòng hồ', 'The lake is most beautiful and cool early in the morning.'),
  ('Phố cổ & Hồ Gươm', 'Nhà thờ Lớn', 'Take a break with a lemon tea near the cathedral.'),
  ('Phố cổ & Hồ Gươm', 'Chợ Đồng Xuân', 'Walk through the "Hang" streets — the 36 streets of the Old Quarter.'),
  ('Phố cổ & Hồ Gươm', 'Đi bộ trên cầu Long Biên', 'End the day with a sunset over the Red River.')
) as v(tour, quest, note)
join public.tours t on t.title = v.tour
join public.quests q on q.title = v.quest
where ts.tour_id = t.id and ts.quest_id = q.id;
