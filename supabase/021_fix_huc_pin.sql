-- =====================================================================
-- HANOI GO! — Cập nhật 021: DỜI GHIM "Check-in Đại học Văn hóa Hà Nội"
-- Ghim cũ (21.0226, 105.8212) rơi xuống giữa đường Vành đai 1, lệch ~200 m về phía tây nam.
-- Toạ độ mới lấy theo điểm "Trường Đại học Văn hóa Hà Nội" trên OpenStreetMap (nằm trong khuôn viên trường).
-- Bán kính check-in giữ 300 m nên đứng ở cổng trường (418 La Thành) vẫn được tính.
-- Chạy lại cũng an toàn.
-- =====================================================================

update public.quests
set lat = 21.02392, lng = 105.82280
where title = 'Check-in Đại học Văn hóa Hà Nội' and place_name = 'Đại học Văn hóa Hà Nội';

-- Kiểm tra: phải thấy 1 dòng với toạ độ mới
select id, title, lat, lng, radius_m from public.quests where title = 'Check-in Đại học Văn hóa Hà Nội';
