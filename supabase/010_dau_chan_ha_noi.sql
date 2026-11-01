-- =====================================================================
-- HANOI GO! — Cập nhật 010: TOUR MẪU THỬ NGHIỆM "DẤU CHÂN HÀ NỘI"
-- Lộ trình kết nối di tích, phố nghề & ẩm thực Hồ Gươm – Phố Cổ (6 trạm):
--   1 Tháp Hòa Phong → 2 Đền Ngọc Sơn & Cầu Thê Húc → 3 Ô Quan Chưởng
--   → 4 Phố ẩm thực → 5 Văn hóa Phố Cổ → 6 Tổng kết & Đổi thưởng
-- Chạy được độc lập (tự thêm cột *_en nếu chưa chạy 009). Chạy lại cũng an toàn.
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
alter table public.tours add column if not exists title_en       text;
alter table public.tours add column if not exists subtitle_en    text;
alter table public.tours add column if not exists description_en text;
alter table public.tours add column if not exists duration_en    text;
alter table public.tours add column if not exists est_cost_en    text;
alter table public.tours add column if not exists best_time_en   text;
alter table public.tours add column if not exists audience_en    text;
alter table public.tours add column if not exists difficulty_en  text;
alter table public.tour_stops add column if not exists note_en text;

-- ---------- Các điểm mới (trạm 2 dùng lại nhiệm vụ "Qua cầu Thê Húc") ----------
insert into public.quests
  (title, description, kind, place_name, area, lat, lng, radius_m, require_location, xp_reward, coin_reward,
   emoji, tip, opening_hours, ticket_info, story, etiquette, sort_order,
   title_en, description_en, place_name_en, tip_en, opening_hours_en, ticket_info_en, story_en, etiquette_en)
select v.* from (values
  ('Tháp Hòa Phong', 'Trạm khởi hành: chụp ảnh ngọn tháp cổ ba tầng bên bờ đông Hồ Gươm.', 'photo',
   'Tháp Hòa Phong', 'Hoàn Kiếm', 21.02755::float8, 105.85365::float8, 200, false, 100, 50,
   '🗼', 'Đứng từ vườn hoa bên hồ để lấy trọn tháp và mặt nước.', 'Cả ngày (ngắm từ bên ngoài)', 'Miễn phí',
   'Tháp Hòa Phong là phần còn sót lại của chùa Báo Ân, xây khoảng năm 1846. Ngọn tháp ba tầng bằng gạch, bốn mặt có cửa vòm, là một dấu tích kiến trúc cổ hiếm hoi bên Hồ Gươm.',
   'Không leo trèo, vẽ bậy lên tháp.', 201,
   'Hoa Phong Tower', 'Starting point: photograph the three-storey ancient tower on the east bank of Hoan Kiem Lake.',
   'Hoa Phong Tower', 'Stand in the lakeside garden to capture the whole tower and the water.', 'All day (viewed from outside)', 'Free',
   'Hoa Phong Tower is what remains of Bao An Pagoda, built around 1846. The three-storey brick tower with arched doors on all four sides is one of the rare ancient structures by Hoan Kiem Lake.',
   'Do not climb or draw on the tower.'),
  ('Ô Quan Chưởng', 'Check-in tại cửa ô cổ duy nhất còn lại của kinh thành Thăng Long.', 'checkin',
   'Ô Quan Chưởng', 'Hoàn Kiếm', 21.03693::float8, 105.85283::float8, 200, true, 120, 60,
   '🏯', 'Bật định vị khi đến đầu phố Hàng Chiếu – Đào Duy Từ.', 'Cả ngày', 'Miễn phí',
   'Ô Quan Chưởng (tên chính thức Đông Hà Môn) được xây lại năm 1817. Hà Nội xưa có nhiều cửa ô, nay chỉ còn Ô Quan Chưởng, gắn với câu chuyện viên chưởng cơ tử thủ chống quân Pháp năm 1873.',
   'Chú ý xe cộ khi chụp ảnh giữa cổng.', 202,
   'O Quan Chuong Gate', 'Check in at the only remaining ancient gate of the Thang Long citadel.',
   'O Quan Chuong Gate', 'Turn on location when you reach the corner of Hang Chieu – Dao Duy Tu.', 'All day', 'Free',
   'O Quan Chuong (officially Dong Ha Mon) was rebuilt in 1817. Old Hanoi had many gates; only this one survives, linked to the story of a commander who defended it against the French in 1873.',
   'Watch out for traffic when taking photos under the gate.'),
  ('Phố ẩm thực', 'Thưởng thức một món đặc sản phố cổ (phở, bún chả, cà phê trứng…) và chụp lại món ăn.', 'photo',
   'Phố ẩm thực Tạ Hiện – Hàng Buồm', 'Hoàn Kiếm', 21.03545::float8, 105.85160::float8, 250, false, 100, 50,
   '🍜', 'Hỏi giá trước khi gọi món ở hàng rong.', 'Đẹp nhất buổi tối, khoảng 18:00 – 23:00', 'Khoảng 30.000 – 80.000đ/món',
   'Khu Tạ Hiện – Hàng Buồm là nơi tập trung nhiều quán ăn đường phố nổi tiếng của Hà Nội, từ phở, bún chả đến cà phê trứng.',
   'Giữ vệ sinh chung, bỏ rác đúng chỗ.', 203,
   'Food Street', 'Enjoy an Old Quarter speciality (pho, bun cha, egg coffee…) and take a photo of your dish.',
   'Ta Hien – Hang Buom food streets', 'Ask for the price before ordering from street vendors.', 'Best in the evening, about 18:00 – 23:00', 'About 30,000 – 80,000 VND per dish',
   'The Ta Hien – Hang Buom area is packed with famous Hanoi street food, from pho and bun cha to egg coffee.',
   'Keep the street clean and use the bins.'),
  ('Văn hóa Phố Cổ', 'Ghé ngôi nhà cổ số 87 Mã Mây và các phố nghề "Hàng…", chụp một góc nghề truyền thống.', 'photo',
   'Nhà cổ 87 Mã Mây', 'Hoàn Kiếm', 21.03480::float8, 105.85330::float8, 250, false, 100, 50,
   '🏮', 'Đi bộ thêm qua Hàng Mã, Hàng Bạc để thấy rõ "mỗi phố một nghề".', 'Khoảng 8:00 – 17:00', 'Khoảng 10.000đ (nhà cổ)',
   'Nhà 87 Mã Mây là ngôi nhà ống cuối thế kỷ XIX được bảo tồn, cho thấy lối sống của người buôn bán phố cổ. Xung quanh là các phố nghề mang tên mặt hàng: Hàng Mã, Hàng Bạc, Hàng Thiếc…',
   'Nói nhỏ, xin phép trước khi chụp ảnh người bán hàng.', 204,
   'Old Quarter Culture', 'Visit the ancient house at 87 Ma May and the "Hang…" craft streets, then photograph a traditional craft.',
   'Ancient House, 87 Ma May', 'Walk on through Hang Ma and Hang Bac to see "one street, one craft".', 'About 8:00 – 17:00', 'About 10,000 VND (ancient house)',
   '87 Ma May is a preserved late-19th-century tube house showing how Old Quarter merchants lived. Around it are craft streets named after their goods: Hang Ma, Hang Bac, Hang Thiec…',
   'Keep your voice down and ask before photographing vendors.')
) as v(title, description, kind, place_name, area, lat, lng, radius_m, require_location, xp_reward, coin_reward,
       emoji, tip, opening_hours, ticket_info, story, etiquette, sort_order,
       title_en, description_en, place_name_en, tip_en, opening_hours_en, ticket_info_en, story_en, etiquette_en)
where not exists (select 1 from public.quests q where q.title = v.title);

-- Trạm 6: câu đố tổng kết, làm xong là nhận thưởng tour
insert into public.quests (title, description, kind, place_name, area, emoji, xp_reward, coin_reward, quiz_question, quiz_options, sort_order,
                           title_en, description_en, place_name_en, quiz_question_en, quiz_options_en)
select 'Tổng kết: Dấu chân Hà Nội', 'Trả lời câu hỏi tổng kết hành trình để mở khoá phần thưởng.', 'quiz', 'Hồ Gươm – Phố Cổ', 'Hoàn Kiếm', '🏆', 80, 40,
       'Cửa ô cổ duy nhất còn lại của Hà Nội ngày nay là cửa ô nào?', '["Ô Cầu Giấy","Ô Quan Chưởng","Ô Chợ Dừa","Ô Đống Mác"]'::jsonb, 205,
       'Wrap-up: Hanoi Footprints', 'Answer the wrap-up question to unlock your reward.', 'Hoan Kiem Lake – Old Quarter',
       'Which is the only ancient city gate of Hanoi that still stands today?', '["O Cau Giay","O Quan Chuong","O Cho Dua","O Dong Mac"]'::jsonb
where not exists (select 1 from public.quests where title = 'Tổng kết: Dấu chân Hà Nội');

insert into public.quest_answers (quest_id, correct_index)
select id, 1 from public.quests where title = 'Tổng kết: Dấu chân Hà Nội'
on conflict (quest_id) do nothing;

-- ---------- Tour ----------
insert into public.tours (title, subtitle, description, emoji, color, duration, est_cost, best_time, audience, difficulty, bonus_xp, bonus_coins, sort_order,
                          title_en, subtitle_en, description_en, duration_en, est_cost_en, best_time_en, audience_en, difficulty_en)
values ('Dấu chân Hà Nội', 'Lộ trình kết nối di tích, phố nghề & ẩm thực Hồ Gươm – Phố Cổ',
  'Tuyến mẫu thử nghiệm gồm 6 trạm đi bộ: Tháp Hòa Phong, Đền Ngọc Sơn & Cầu Thê Húc, Ô Quan Chưởng, Phố ẩm thực, Văn hóa Phố Cổ và trạm Tổng kết & Đổi thưởng. Mỗi trạm hoàn thành nhận XP và xu, đi hết hành trình để mở rương thưởng và đổi quà.',
  '👣', '#b23a2a', 'Nửa ngày (~4 – 5 giờ đi bộ)', 'Khoảng 100.000 – 200.000đ (vé + ăn uống)', 'Chiều muộn đến tối, 15:00 – 21:00',
  'Khách lần đầu đến Hà Nội, học sinh, sinh viên', 'Dễ', 300, 200, 0,
  'Hanoi Footprints', 'A route linking heritage sites, craft streets & food around Hoan Kiem Lake – Old Quarter',
  'A pilot walking route with 6 stations: Hoa Phong Tower, Ngoc Son Temple & The Huc Bridge, O Quan Chuong Gate, Food Street, Old Quarter Culture and the Wrap-up & Rewards station. Each station earns XP and coins; finish the journey to open the reward chest and redeem gifts.',
  'Half a day (~4 – 5 hours on foot)', 'About 100,000 – 200,000 VND (tickets + food)', 'Late afternoon to evening, 15:00 – 21:00',
  'First-time visitors to Hanoi, students', 'Easy')
on conflict (title) do nothing;

insert into public.tour_stops (tour_id, quest_id, position, note, note_en)
select t.id, q.id, s.pos, s.note, s.note_en
from (values
  ('Tháp Hòa Phong', 1, 'Trạm 1 · Điểm xuất phát bên bờ đông Hồ Gươm.', 'Station 1 · Starting point on the east bank of Hoan Kiem Lake.'),
  ('Qua cầu Thê Húc', 2, 'Trạm 2 · Đền Ngọc Sơn & Cầu Thê Húc.', 'Station 2 · Ngoc Son Temple & The Huc Bridge.'),
  ('Ô Quan Chưởng', 3, 'Trạm 3 · Đi bộ lên phía bắc qua phố cổ khoảng 15 phút.', 'Station 3 · About a 15-minute walk north through the Old Quarter.'),
  ('Phố ẩm thực', 4, 'Trạm 4 · Nghỉ chân và thưởng thức ẩm thực Hà Nội.', 'Station 4 · Take a break and taste Hanoi food.'),
  ('Văn hóa Phố Cổ', 5, 'Trạm 5 · Tìm hiểu "36 phố phường" và các phố nghề.', 'Station 5 · Discover the "36 streets" and craft streets.'),
  ('Tổng kết: Dấu chân Hà Nội', 6, 'Trạm 6 · Tổng kết & Đổi thưởng: trả lời câu hỏi rồi bấm nhận thưởng tour.', 'Station 6 · Wrap-up & Rewards: answer the question, then claim the tour reward.')
) as s(quest, pos, note, note_en)
join public.tours t on t.title = 'Dấu chân Hà Nội'
join public.quests q on q.title = s.quest
on conflict (tour_id, quest_id) do nothing;
