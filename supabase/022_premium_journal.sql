-- =====================================================================
-- HANOI GO! — Cập nhật 022: GÓI PREMIUM CHO SỔ HÀNH TRÌNH (thử nghiệm)
-- - Cài đặt chung (1 dòng): bật/tắt yêu cầu Premium, giá, thông tin nhận chuyển khoản
--   → chỉ quản trị viên tối cao sửa được; mọi người đăng nhập đều đọc được (để hiện thông tin chuyển khoản)
-- - profiles.is_premium: chỉ quản trị viên tối cao bật/tắt (người dùng không tự sửa được)
-- - Yêu cầu mua: người dùng bấm "Tôi đã chuyển khoản" → báo quản trị viên tối cao xác nhận
-- - Thông báo: 'premium_request' (gửi quản trị tối cao), 'premium_granted' (gửi người mua)
-- Chạy SAU 021_fix_huc_pin.sql. Chạy lại cũng an toàn.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CÀI ĐẶT CHUNG
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  id               int primary key default 1 check (id = 1),
  premium_enabled  boolean not null default false,
  premium_price    int not null default 13000 check (premium_price >= 0),
  bank_name        text not null default '',
  bank_account     text not null default '',
  bank_holder      text not null default '',
  updated_at       timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict do nothing;

alter table public.app_settings enable row level security;
drop policy if exists "settings: read" on public.app_settings;
create policy "settings: read" on public.app_settings for select to authenticated using (true);
revoke insert, update, delete on public.app_settings from anon, authenticated;

create or replace function public.admin_update_settings(
  p_premium_enabled boolean, p_premium_price int, p_bank_name text, p_bank_account text, p_bank_holder text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Chỉ quản trị viên tối cao mới sửa được cài đặt này'; end if;
  if p_premium_price is null or p_premium_price < 0 then raise exception 'Giá không hợp lệ'; end if;
  update public.app_settings set
    premium_enabled = coalesce(p_premium_enabled, false),
    premium_price = p_premium_price,
    bank_name = left(trim(coalesce(p_bank_name, '')), 80),
    bank_account = left(regexp_replace(coalesce(p_bank_account, ''), '\s', '', 'g'), 40),
    bank_holder = left(upper(trim(coalesce(p_bank_holder, ''))), 80),
    updated_at = now()
  where id = 1;
end $$;

-- ---------------------------------------------------------------------
-- 2. PREMIUM CỦA TỪNG NGƯỜI
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists is_premium boolean not null default false;
alter table public.profiles add column if not exists premium_since timestamptz;

-- ---------------------------------------------------------------------
-- 3. YÊU CẦU MUA (sau khi chuyển khoản)
-- ---------------------------------------------------------------------
create table if not exists public.premium_requests (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  amount     int  not null default 0,
  note       text not null default '',
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists premium_requests_status_idx on public.premium_requests (status, created_at desc);

alter table public.premium_requests enable row level security;
drop policy if exists "premium req: read own or super" on public.premium_requests;
create policy "premium req: read own or super" on public.premium_requests
  for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
revoke insert, update, delete on public.premium_requests from anon, authenticated;

-- Người dùng báo đã chuyển khoản (mỗi lúc chỉ 1 yêu cầu đang chờ)
create or replace function public.request_premium(p_note text default '') returns json
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id bigint; v_price int;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập'; end if;
  if exists (select 1 from public.profiles where id = v_uid and is_premium) then
    raise exception 'Tài khoản của bạn đã có gói Premium rồi';
  end if;
  select id into v_id from public.premium_requests where user_id = v_uid and status = 'pending';
  if v_id is not null then return json_build_object('ok', true, 'id', v_id, 'already', true); end if;
  select premium_price into v_price from public.app_settings where id = 1;
  insert into public.premium_requests (user_id, amount, note)
  values (v_uid, coalesce(v_price, 0), left(coalesce(p_note, ''), 200))
  returning id into v_id;
  -- báo mọi quản trị viên tối cao
  insert into public.notifications (user_id, actor_id, kind, body)
  select p.id, v_uid, 'premium_request', left(coalesce(p_note, ''), 120)
  from public.profiles p where p.is_super_admin and p.id <> v_uid;
  return json_build_object('ok', true, 'id', v_id, 'already', false);
end $$;

-- Quản trị viên tối cao bật / tắt Premium cho một người (đồng thời xử lý yêu cầu đang chờ)
create or replace function public.admin_set_premium(p_user_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_was boolean;
begin
  if not public.is_super_admin() then raise exception 'Chỉ quản trị viên tối cao mới mở được gói Premium'; end if;
  select is_premium into v_was from public.profiles where id = p_user_id;
  if not found then raise exception 'Không tìm thấy người dùng'; end if;
  update public.profiles set
    is_premium = p_on,
    premium_since = case when p_on then coalesce(premium_since, now()) else null end
  where id = p_user_id;
  update public.premium_requests set status = case when p_on then 'approved' else 'rejected' end, decided_at = now()
  where user_id = p_user_id and status = 'pending';
  if p_on and not v_was and p_user_id <> auth.uid() then
    insert into public.notifications (user_id, actor_id, kind) values (p_user_id, auth.uid(), 'premium_granted');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. THÔNG BÁO: 2 loại mới + câu chữ thông báo đẩy
-- ---------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('reaction', 'comment', 'reply', 'friend_request', 'friend_accept',
                  'comment_reaction', 'comment_reply', 'new_user', 'premium_request', 'premium_granted'));

create or replace function public.notify_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_secret text;
  v_subs   json;
  v_actor  text;
  v_actor_username text;
  v_title  text;
  v_owner  uuid;
  v_owner_username text;
  v_entry_title text;
  v_body   text;
  v_url    text;
begin
  select json_agg(json_build_object('endpoint', endpoint, 'keys', json_build_object('p256dh', p256dh, 'auth', auth)))
  into v_subs
  from (select * from public.push_subscriptions where user_id = new.user_id order by created_at desc limit 10) s;
  if v_subs is null then return new; end if;

  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'hanoigo_push_secret';
  if v_secret is null then return new; end if;

  select coalesce(nullif(display_name, ''), username), username into v_actor, v_actor_username
  from public.profiles where id = new.actor_id;
  select j.title, j.user_id, p.username into v_entry_title, v_owner, v_owner_username
  from public.journal_entries j join public.profiles p on p.id = j.user_id where j.id = new.entry_id;
  v_entry_title := case when coalesce(v_entry_title, '') <> '' then ' "' || v_entry_title || '"' else '' end;

  v_body := v_actor || ' ' || case new.kind
    when 'reaction' then coalesce(new.reaction, '❤️') || ' kỷ niệm' || v_entry_title || ' của bạn'
    when 'comment' then 'đã bình luận về kỷ niệm' || v_entry_title || ' của bạn'
    when 'reply' then 'cũng đã bình luận về kỷ niệm' || v_entry_title
    when 'comment_reaction' then coalesce(new.reaction, '❤️') || ' bình luận của bạn'
    when 'comment_reply' then 'đã trả lời bình luận của bạn'
    when 'new_user' then 'vừa đăng ký tài khoản HANOI GO! 🎉'
    when 'premium_request' then 'đã báo chuyển khoản gói Premium 👑 — vào xác nhận nhé'
    when 'premium_granted' then 'đã mở gói Premium cho bạn 👑 Sổ hành trình đã sẵn sàng!'
    when 'friend_request' then 'đã gửi lời mời kết bạn'
    when 'friend_accept' then 'đã chấp nhận lời mời kết bạn'
    else 'đã tương tác với bạn' end;
  if coalesce(new.body, '') <> '' then v_body := v_body || ': “' || left(new.body, 80) || '”'; end if;

  v_url := case
    when new.kind = 'friend_request' then './#/friends'
    when new.kind = 'friend_accept' then './#/u/' || v_actor_username
    when new.kind = 'new_user' then './#/admin?tab=users'
    when new.kind = 'premium_request' then './#/admin?tab=premium'
    when new.kind = 'premium_granted' then './#/journal'
    when new.entry_id is null then './#/notifications'
    when v_owner = new.user_id then './#/journal?entry=' || new.entry_id
    else './#/u/' || v_owner_username || '?entry=' || new.entry_id end;
  -- có bình luận cụ thể → mở bài rồi cuộn tới đúng bình luận đó
  if new.comment_id is not null and new.entry_id is not null then
    v_url := v_url || '&comment=' || new.comment_id;
  end if;

  perform net.http_post(
    url := 'https://wmkrarzkaqifomfzlgry.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object(
      'subscriptions', v_subs,
      'title', 'HANOI GO!',
      'body', v_body,
      'url', v_url,
      'tag', 'noti-' || new.kind || '-' || coalesce(new.entry_id::text, new.actor_id::text))
  );
  return new;
exception when others then
  -- Lỗi gửi đẩy không được làm hỏng thao tác chính (thả cảm xúc, bình luận…)
  return new;
end $$;

revoke execute on function public.admin_update_settings(boolean, int, text, text, text) from public, anon;
grant  execute on function public.admin_update_settings(boolean, int, text, text, text) to authenticated;
revoke execute on function public.request_premium(text) from public, anon;
grant  execute on function public.request_premium(text) to authenticated;
revoke execute on function public.admin_set_premium(uuid, boolean) from public, anon;
grant  execute on function public.admin_set_premium(uuid, boolean) to authenticated;
revoke execute on function public.notify_push() from public, anon, authenticated;
