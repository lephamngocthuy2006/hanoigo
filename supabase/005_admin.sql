-- =====================================================================
-- HANOI GO! — Cập nhật 005: TRANG QUẢN TRỊ (ADMIN)
-- Duyệt / từ chối đối tác, quản lý người dùng (chế độ demo), kiểm duyệt đánh giá.
-- Chạy SAU 004_partners.sql. Chạy lại cũng an toàn.
-- =====================================================================

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.partners add column if not exists admin_note text not null default '';
alter table public.partners add column if not exists reviewed_at timestamptz;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Admin xem được mọi hồ sơ đối tác (kể cả đang chờ / bị từ chối)
drop policy if exists "partners: read approved or own" on public.partners;
create policy "partners: read approved or own" on public.partners
  for select to authenticated
  using (status = 'approved' or owner_id = auth.uid() or public.is_admin());

-- Duyệt / từ chối / thu hồi đối tác, kèm ghi chú gửi tới đối tác
create or replace function public.admin_set_partner_status(p_id bigint, p_status text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên mới thực hiện được'; end if;
  if p_status not in ('pending', 'approved', 'rejected') then raise exception 'Trạng thái không hợp lệ'; end if;
  update public.partners
    set status = p_status, admin_note = left(coalesce(p_note, ''), 300), reviewed_at = now()
  where id = p_id;
  if not found then raise exception 'Không tìm thấy đối tác'; end if;
end $$;

-- Bật / tắt chế độ demo cho một tài khoản
create or replace function public.admin_set_demo(p_user_id uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên mới thực hiện được'; end if;
  update public.profiles set is_demo = coalesce(p_on, false) where id = p_user_id;
end $$;

-- Xoá đánh giá vi phạm (spam, ngôn từ không phù hợp)
create or replace function public.admin_delete_review(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên mới thực hiện được'; end if;
  delete from public.reviews where id = p_id;
end $$;

revoke execute on function public.admin_set_partner_status(bigint, text, text) from public, anon;
grant  execute on function public.admin_set_partner_status(bigint, text, text) to authenticated;
revoke execute on function public.admin_set_demo(uuid, boolean) from public, anon;
grant  execute on function public.admin_set_demo(uuid, boolean) to authenticated;
revoke execute on function public.admin_delete_review(bigint) from public, anon;
grant  execute on function public.admin_delete_review(bigint) to authenticated;

-- ---------------------------------------------------------------------
-- CẤP QUYỀN ADMIN: sửa tên đăng nhập rồi chạy (admin đầu tiên phải cấp bằng SQL)
-- ---------------------------------------------------------------------
-- update public.profiles set is_admin = true where username = 'ten_dang_nhap';
