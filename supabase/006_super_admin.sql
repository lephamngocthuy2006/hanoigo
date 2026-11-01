-- =====================================================================
-- HANOI GO! — Cập nhật 006: QUẢN TRỊ TỐI CAO (super admin)
-- Super admin cấp / thu hồi quyền Admin và Tối cao cho người khác ngay trong app.
-- Chạy SAU 005_admin.sql. Chạy lại cũng an toàn.
-- =====================================================================

alter table public.profiles add column if not exists is_super_admin boolean not null default false;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_super_admin from public.profiles where id = auth.uid()), false);
$$;

-- p_role: 'user' (người dùng thường) | 'admin' (quản trị) | 'super' (quản trị tối cao)
create or replace function public.admin_set_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Chỉ quản trị viên tối cao mới cấp quyền được'; end if;
  if p_role not in ('user', 'admin', 'super') then raise exception 'Vai trò không hợp lệ'; end if;
  if p_user_id = auth.uid() and p_role <> 'super' then
    raise exception 'Không thể tự hạ quyền của chính mình';
  end if;
  update public.profiles set
    is_admin = p_role in ('admin', 'super'),
    is_super_admin = p_role = 'super'
  where id = p_user_id;
  if not found then raise exception 'Không tìm thấy người dùng'; end if;
end $$;

revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant  execute on function public.admin_set_role(uuid, text) to authenticated;

-- Số liệu đăng ký cho trang quản trị
create or replace function public.admin_user_stats()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên mới xem được'; end if;
  return json_build_object(
    'total',        (select count(*) from public.profiles),
    'today',        (select count(*) from public.profiles where (created_at at time zone 'Asia/Ho_Chi_Minh')::date = v_today),
    'week',         (select count(*) from public.profiles where (created_at at time zone 'Asia/Ho_Chi_Minh')::date > v_today - 7),
    'active_today', (select count(*) from public.profiles where last_active_date = v_today),
    'admins',       (select count(*) from public.profiles where is_admin)
  );
end $$;

revoke execute on function public.admin_user_stats() from public, anon;
grant  execute on function public.admin_user_stats() to authenticated;

-- ---------------------------------------------------------------------
-- CẤP QUYỀN TỐI CAO ĐẦU TIÊN (chỉ làm 1 lần bằng SQL, sau đó cấp trong app)
-- ---------------------------------------------------------------------
-- update public.profiles set is_admin = true, is_super_admin = true where username = 'voquoclong';
