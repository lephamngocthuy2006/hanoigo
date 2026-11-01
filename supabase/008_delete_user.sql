-- =====================================================================
-- HANOI GO! — Cập nhật 008: QUYỀN XOÁ TÀI KHOẢN & DỌN DỮ LIỆU TEST
-- Quản trị viên tối cao xoá tài khoản khác ngay trong app; dọn tài khoản test.
-- Chạy SAU 007_reactions.sql. Chạy lại cũng an toàn.
-- =====================================================================

create or replace function public.admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'Chỉ quản trị viên tối cao mới xoá được tài khoản';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Không thể tự xoá tài khoản của chính mình';
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and is_super_admin) then
    raise exception 'Không thể xoá tài khoản Tối cao khác (hãy hạ quyền trước)';
  end if;

  -- Xoá trong auth.users sẽ tự động xoá theo dây chuyền (cascade):
  -- profile, đối tác, nhiệm vụ & voucher đối tác, nhật ký, đánh giá, bạn bè…
  delete from auth.users where id = p_user_id;
  if not found then raise exception 'Không tìm thấy người dùng'; end if;
end $$;

revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant  execute on function public.admin_delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- DỌN DỮ LIỆU TEST: không tự xoá ở đây. Xoá từng tài khoản trong app
-- (Trang quản trị → Người dùng → 🗑️ Xoá) sau khi đã chắc chắn.
