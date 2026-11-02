-- =====================================================================
-- HANOI GO! — Cập nhật 015: CHỨNG NHẬN HOÀN THÀNH TOUR
-- - Mỗi lượt hoàn thành tour có một mã chứng nhận riêng (in trên ảnh chứng nhận)
-- - Ai cũng xác thực được chứng nhận bằng mã / QR, kể cả khi chưa đăng nhập
--   (chỉ hiện tên hiển thị, tour và ngày hoàn thành)
-- Chạy SAU 014_qr_checkin.sql. Chạy lại cũng an toàn.
-- =====================================================================

create or replace function public.new_cert_code() returns text
language sql volatile as $$ select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)) $$;

-- Lượt hoàn thành cũ cũng được cấp mã (mỗi dòng một mã khác nhau)
alter table public.tour_completions
  add column if not exists cert_code text not null unique default public.new_cert_code();

create or replace function public.verify_certificate(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select coalesce((
    select json_build_object(
      'ok', true,
      'name', coalesce(nullif(p.display_name, ''), p.username),
      'username', p.username,
      'avatar', p.avatar,
      'tour_title', t.title,
      'tour_title_en', t.title_en,
      'tour_emoji', t.emoji,
      'tour_color', t.color,
      'stops', (select count(*) from public.tour_stops s where s.tour_id = t.id),
      'completed_at', c.completed_at)
    from public.tour_completions c
    join public.profiles p on p.id = c.user_id
    join public.tours t on t.id = c.tour_id
    where c.cert_code = upper(trim(p_code))
  ), json_build_object('ok', false));
$$;

revoke execute on function public.verify_certificate(text) from public;
grant  execute on function public.verify_certificate(text) to anon, authenticated;
