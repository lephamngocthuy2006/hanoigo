-- =====================================================================
-- HANOI GO! — Cập nhật 024: CHỦ WEB + TẠM NGƯNG WEB
-- - profiles.is_owner: "chủ web" — cao hơn quản trị viên tối cao, chỉ gán được bằng SQL này
-- - app_settings.site_paused: bật → ai mở web (kể cả chưa đăng nhập) cũng chỉ thấy trang thông báo
--   tạm ngưng; riêng chủ web đăng nhập vẫn dùng bình thường và bấm "Mở lại web" được
-- - site_status(): ai cũng đọc được (kể cả chưa đăng nhập) — chỉ trả về đang tạm ngưng hay không
-- - Không ai (kể cả quản trị viên tối cao) hạ quyền hay xoá được tài khoản chủ web
-- Chạy SAU 023_premium_bill.sql. Chạy lại cũng an toàn.
-- =====================================================================

alter table public.profiles add column if not exists is_owner boolean not null default false;
alter table public.app_settings add column if not exists site_paused boolean not null default false;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_owner from public.profiles where id = auth.uid()), false);
$$;

-- Trạng thái web cho mọi người (kể cả chưa đăng nhập)
create or replace function public.site_status()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('paused', coalesce((select site_paused from public.app_settings where id = 1), false));
$$;
revoke execute on function public.site_status() from public;
grant  execute on function public.site_status() to anon, authenticated;

-- Chủ web bật / tắt tạm ngưng
create or replace function public.owner_set_site_paused(p_paused boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Chỉ chủ web mới bật/tắt được'; end if;
  update public.app_settings set site_paused = coalesce(p_paused, false), updated_at = now() where id = 1;
end $$;
revoke execute on function public.owner_set_site_paused(boolean) from public, anon;
grant  execute on function public.owner_set_site_paused(boolean) to authenticated;

-- Bảo vệ tài khoản chủ web: người khác không đổi được quyền, không xoá được
-- (chạy SQL trong Supabase thì auth.uid() rỗng → vẫn sửa được như bình thường)
create or replace function public.protect_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_owner() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then
    if old.is_owner then raise exception 'Không thể xoá tài khoản chủ web'; end if;
    return old;
  end if;
  if new.is_owner is distinct from old.is_owner then raise exception 'Không thể đổi quyền chủ web'; end if;
  if old.is_owner and (new.is_admin is distinct from old.is_admin or new.is_super_admin is distinct from old.is_super_admin) then
    raise exception 'Không thể đổi quyền của chủ web';
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_owner on public.profiles;
create trigger profiles_protect_owner before update or delete on public.profiles
  for each row execute function public.protect_owner();

-- Gán chủ web
update public.profiles set is_owner = true where username = 'voquoclong';

-- ---------------------------------------------------------------------
-- DỰ PHÒNG (không đăng nhập được): chạy riêng 1 dòng dưới đây trong SQL Editor để mở lại web
--   update public.app_settings set site_paused = false where id = 1;
-- ---------------------------------------------------------------------

select username, is_owner, is_super_admin from public.profiles where is_owner;
