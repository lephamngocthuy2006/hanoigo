-- =====================================================================
-- HANOI GO! — Cập nhật 011: NHIỆM VỤ CHI TIẾT 6 TRẠM "DẤU CHÂN HÀ NỘI"
-- Theo bài thuyết trình: mỗi trạm một quest có tên riêng.
--   1 Sương Mù Thời Gian (Quiz)      2 Dấu Ấn Thần Rùa (Quiz)
--   3 Góc Nhìn Di Sản (Photo)        4 Vị Phố Thăng Long (Check-in)
--   5 Bàn Tay Nghệ Nhân (Craft)      6 Vinh Quang Di Sản (Reward)
-- Chạy SAU 010_dau_chan_ha_noi.sql. Chạy lại cũng an toàn.
-- =====================================================================

-- ---------- Trạm 1: Sương Mù Thời Gian (Quiz Quest) ----------
update public.quests set
  title = 'Sương Mù Thời Gian', kind = 'quiz', emoji = '🌫️', require_location = false,
  description = 'Quiz Quest · Trả lời câu hỏi về Tháp Hòa Phong để mở khoá trạm đầu tiên.',
  tip = 'Quan sát kỹ vị trí ngọn tháp ven hồ trước khi chọn đáp án.',
  quiz_question = 'Công trình Tháp Hòa Phong nằm ở vị trí nào và là di tích còn lại của ngôi chùa nào sau đây?',
  quiz_options = '["Nằm ven Hồ Gươm, là di tích còn lại của chùa Báo Quốc (Báo Nhơn)","Nằm trên đảo Ngọc, là di tích còn lại của chùa Trấn Quốc","Nằm ở phố Hàng Buồm, là di tích còn lại của chùa Kim Cổ","Nằm ở phố Hàng Mành, là di tích còn lại của chùa Lý Quốc Sư"]'::jsonb,
  title_en = 'Mists of Time', description_en = 'Quiz Quest · Answer a question about Hoa Phong Tower to unlock the first station.',
  tip_en = 'Look closely at where the tower stands by the lake before you answer.',
  quiz_question_en = 'Where is Hoa Phong Tower located, and which pagoda is it the remnant of?',
  quiz_options_en = '["By Hoan Kiem Lake, the remnant of Bao Quoc (Bao Nhon) Pagoda","On Ngoc Island, the remnant of Tran Quoc Pagoda","On Hang Buom Street, the remnant of Kim Co Pagoda","On Hang Manh Street, the remnant of Ly Quoc Su Pagoda"]'::jsonb
where title = 'Tháp Hòa Phong';

-- ---------- Trạm 2: Dấu Ấn Thần Rùa (Quiz Quest) — nhiệm vụ riêng, không đụng "Qua cầu Thê Húc" ----------
insert into public.quests
  (title, description, kind, place_name, area, lat, lng, radius_m, require_location, xp_reward, coin_reward, emoji, tip,
   opening_hours, ticket_info, story, etiquette, quiz_question, quiz_options, sort_order,
   title_en, description_en, place_name_en, tip_en, opening_hours_en, ticket_info_en, story_en, etiquette_en, quiz_question_en, quiz_options_en)
select 'Dấu Ấn Thần Rùa', 'Quiz Quest · Quan sát thực địa tại Đền Ngọc Sơn và trả lời câu hỏi.', 'quiz',
  'Đền Ngọc Sơn & Cầu Thê Húc', 'Hoàn Kiếm', 21.0307, 105.8524, 200, false, 100, 50, '🐢',
  'Qua cầu Thê Húc vào đền, để ý các gian trưng bày.', 'Khoảng 7:00 – 18:00', 'Vé vào đền (xem giá tại quầy)',
  'Đền Ngọc Sơn nằm trên đảo Ngọc, nối với bờ bằng cầu Thê Húc sơn đỏ. Trong đền lưu giữ tiêu bản Rùa Hồ Gươm, gắn với truyền thuyết trả gươm.',
  'Ăn mặc lịch sự, giữ trật tự trong đền.',
  'Khi quan sát thực địa tại Đền Ngọc Sơn, tiêu bản Rùa Hồ Gươm (Rùa thần) nổi tiếng đang được trưng bày ở đâu?',
  '["Đặt trên bệ đá ngoài sân đền","Bên trong tủ kính tại gian trưng bày chính","Được treo trên gác lầu Đắc Nguyệt Lâu","Dưới chân tháp Bút cạnh cổng vào"]'::jsonb, 206,
  'Mark of the Sacred Turtle', 'Quiz Quest · Observe Ngoc Son Temple on site and answer the question.',
  'Ngoc Son Temple & The Huc Bridge', 'Cross The Huc Bridge into the temple and look around the exhibition rooms.',
  'About 7:00 – 18:00', 'Temple entrance fee (see prices at the counter)',
  'Ngoc Son Temple sits on Jade Island, linked to the shore by the red The Huc Bridge. It preserves the specimen of the Hoan Kiem Turtle, tied to the legend of the returned sword.',
  'Dress modestly and keep quiet inside the temple.',
  'When visiting Ngoc Son Temple, where is the famous Hoan Kiem Turtle (Sacred Turtle) specimen displayed?',
  '["On a stone pedestal in the temple yard","Inside a glass case in the main exhibition room","Hung in the Dac Nguyet Lau pavilion","At the foot of the Pen Tower by the gate"]'::jsonb
where not exists (select 1 from public.quests where title = 'Dấu Ấn Thần Rùa');

-- ---------- Trạm 3: Góc Nhìn Di Sản (Photo Quest) ----------
update public.quests set
  title = 'Góc Nhìn Di Sản', kind = 'photo', emoji = '📸', require_location = false,
  description = 'Photo Quest · Đưa ống kính vào khung chụp mỹ thuật gợi ý trên app, chụp lại toàn cảnh Ô Quan Chưởng và tải lên Nhật ký hành trình để AI quét xác nhận.',
  tip = 'Khung gợi ý: đứng chéo góc từ phố Đào Duy Từ để lấy trọn vòm cổng và lầu canh.',
  title_en = 'Heritage Perspective',
  description_en = 'Photo Quest · Frame the shot with the app''s suggested artistic frame, capture the whole O Quan Chuong Gate and upload it to your Travel Journal for AI verification.',
  tip_en = 'Suggested frame: stand diagonally from Dao Duy Tu Street to fit the whole arch and watchtower.'
where title = 'Ô Quan Chưởng';

-- ---------- Trạm 4: Vị Phố Thăng Long (Check-in Quest) ----------
update public.quests set
  title = 'Vị Phố Thăng Long', kind = 'checkin', emoji = '🍜', require_location = true,
  place_name = 'Ẩm thực Phố Cổ (Hàng Buồm / Hàng Mành)',
  description = 'Check-in Quest · Ghé quán bún chả hoặc cà phê trứng thuộc mạng lưới liên kết, thưởng thức món ăn và quét mã QR tại bàn để xác nhận và nhận xu kèm voucher ưu đãi.',
  tip = 'Đổi xu lấy voucher của quán đối tác trong mục Thẻ & Quà.',
  title_en = 'Taste of Thang Long', place_name_en = 'Old Quarter Food (Hang Buom / Hang Manh)',
  description_en = 'Check-in Quest · Visit a partner bun cha or egg coffee shop, enjoy the dish and scan the QR code on your table to confirm and get coins plus a discount voucher.',
  tip_en = 'Swap coins for partner shop vouchers in Rewards.'
where title = 'Phố ẩm thực';

-- ---------- Trạm 5: Bàn Tay Nghệ Nhân (Craft Quest) ----------
update public.quests set
  title = 'Bàn Tay Nghệ Nhân', kind = 'photo', emoji = '🎨', require_location = false,
  place_name = 'Không gian Làng nghề Phố Cổ',
  description = 'Craft Quest · Trực tiếp tham gia 01 hoạt động thủ công (nặn tò he, làm tranh Hàng Trống, vuốt gốm...) và nhờ nghệ nhân quét mã QR xác nhận hoàn thành.',
  tip = 'Chụp ảnh sản phẩm bạn tự làm để lưu vào Nhật ký hành trình.',
  story = 'Phố cổ Hà Nội hình thành từ các phường nghề: mỗi phố "Hàng…" gắn với một nghề và mặt hàng riêng. Tò he, tranh Hàng Trống, gốm… là những nghề thủ công truyền thống còn được lưu giữ đến nay.',
  title_en = 'Artisan''s Hands', place_name_en = 'Old Quarter Craft Village Space',
  description_en = 'Craft Quest · Join one handicraft activity (to he figurines, Hang Trong paintings, pottery…) and ask the artisan to scan the QR code to confirm.',
  tip_en = 'Take a photo of what you made to save it in your Travel Journal.',
  story_en = 'Hanoi''s Old Quarter grew out of craft guilds: each "Hang…" street was tied to its own trade and goods. To he figurines, Hang Trong paintings and pottery are traditional crafts still alive today.'
where title = 'Văn hóa Phố Cổ';

-- ---------- Trạm 6: Vinh Quang Di Sản (Reward Quest) ----------
delete from public.quest_answers where quest_id in (select id from public.quests where title = 'Tổng kết: Dấu chân Hà Nội');
update public.quests set
  title = 'Vinh Quang Di Sản', kind = 'checkin', emoji = '🏆', require_location = true,
  place_name = 'Trạm Đổi Thưởng & Tổng Kết',
  description = 'Reward Quest · Mở app nhận phần thưởng số (vật phẩm, Hanoi Coins, thẻ di sản) và ghé trạm đổi thưởng thực địa để nhận quà vật lý (móc khóa/bưu thiếp) hoặc xuất file Nhật ký hành trình.',
  tip = 'Check-in xong, bấm "Nhận thưởng" ở trang tour để mở rương thưởng.',
  quiz_question = null, quiz_options = null, quiz_question_en = null, quiz_options_en = null,
  title_en = 'Heritage Glory', place_name_en = 'Rewards & Wrap-up Station',
  description_en = 'Reward Quest · Open the app to collect digital rewards (items, Hanoi Coins, heritage cards) and visit the on-site reward station for a physical gift (keychain/postcard) or to export your Travel Journal.',
  tip_en = 'After checking in, tap "Claim reward" on the tour page to open the reward chest.'
where title = 'Tổng kết: Dấu chân Hà Nội';

-- ---------- Đáp án ----------
insert into public.quest_answers (quest_id, correct_index)
select q.id, a.idx from public.quests q
join (values ('Sương Mù Thời Gian', 0), ('Dấu Ấn Thần Rùa', 1)) as a(title, idx) on a.title = q.title
on conflict (quest_id) do update set correct_index = excluded.correct_index;

-- ---------- Lộ trình 6 trạm ----------
update public.tours set
  description = 'Tuyến mẫu thử nghiệm gồm 6 trạm đi bộ, mỗi trạm một nhiệm vụ: Sương Mù Thời Gian (Tháp Hòa Phong), Dấu Ấn Thần Rùa (Đền Ngọc Sơn & Cầu Thê Húc), Góc Nhìn Di Sản (Ô Quan Chưởng), Vị Phố Thăng Long (Ẩm thực Phố Cổ), Bàn Tay Nghệ Nhân (Không gian Làng nghề) và Vinh Quang Di Sản (Đổi thưởng & Tổng kết).',
  description_en = 'A pilot walking route of 6 stations, each with its own quest: Mists of Time (Hoa Phong Tower), Mark of the Sacred Turtle (Ngoc Son Temple & The Huc Bridge), Heritage Perspective (O Quan Chuong Gate), Taste of Thang Long (Old Quarter food), Artisan''s Hands (Craft Village Space) and Heritage Glory (Rewards & Wrap-up).'
where title = 'Dấu chân Hà Nội';

delete from public.tour_stops where tour_id = (select id from public.tours where title = 'Dấu chân Hà Nội');
insert into public.tour_stops (tour_id, quest_id, position, note, note_en)
select t.id, q.id, s.pos, s.note, s.note_en
from (values
  ('Sương Mù Thời Gian', 1, 'Trạm Khởi Đầu · Tháp Hòa Phong · Quiz Quest', 'Starting Station · Hoa Phong Tower · Quiz Quest'),
  ('Dấu Ấn Thần Rùa', 2, 'Trạm 2 · Đền Ngọc Sơn & Cầu Thê Húc · Quiz Quest', 'Station 2 · Ngoc Son Temple & The Huc Bridge · Quiz Quest'),
  ('Góc Nhìn Di Sản', 3, 'Trạm 3 · Ô Quan Chưởng · Photo Quest', 'Station 3 · O Quan Chuong Gate · Photo Quest'),
  ('Vị Phố Thăng Long', 4, 'Trạm 4 · Ẩm Thực Phố Cổ (Hàng Buồm / Hàng Mành) · Check-in Quest', 'Station 4 · Old Quarter Food (Hang Buom / Hang Manh) · Check-in Quest'),
  ('Bàn Tay Nghệ Nhân', 5, 'Trạm 5 · Không Gian Làng Nghề Phố Cổ · Craft Quest', 'Station 5 · Old Quarter Craft Village Space · Craft Quest'),
  ('Vinh Quang Di Sản', 6, 'Chặng Cuối · Trạm Đổi Thưởng & Tổng Kết · Reward Quest', 'Final Leg · Rewards & Wrap-up Station · Reward Quest')
) as s(quest, pos, note, note_en)
join public.tours t on t.title = 'Dấu chân Hà Nội'
join public.quests q on q.title = s.quest
on conflict (tour_id, quest_id) do nothing;
