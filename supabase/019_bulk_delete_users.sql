-- =====================================================================
-- HANOI GO! — Cập nhật 019: XOÁ NHIỀU TÀI KHOẢN CÙNG LÚC (dọn spam)
-- - Chỉ quản trị viên tối cao
-- - Không bao giờ xoá quản trị viên / tối cao / chính mình (kể cả nếu lỡ chọn)
-- - Mỗi lần gọi tối đa 500 tài khoản; trả về số tài khoản đã xoá
-- Chạy SAU 018_signup_alerts.sql. Chạy lại cũng an toàn.
-- =====================================================================

create or replace function public.admin_delete_users(p_user_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not public.is_super_admin() then
    raise exception 'Chỉ quản trị viên tối cao mới xoá được tài khoản';
  end if;
  if coalesce(array_length(p_user_ids, 1), 0) > 500 then
    raise exception 'Mỗi lần chỉ xoá tối đa 500 tài khoản';
  end if;

  -- Xoá trong auth.users → profile, nhật ký, bình luận, bạn bè… tự xoá theo (cascade)
  delete from auth.users u
  where u.id = any(p_user_ids)
    and u.id <> auth.uid()
    and not exists (select 1 from public.profiles p where p.id = u.id and (p.is_admin or p.is_super_admin));
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke execute on function public.admin_delete_users(uuid[]) from public, anon;
grant  execute on function public.admin_delete_users(uuid[]) to authenticated;
