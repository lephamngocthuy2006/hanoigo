-- =====================================================================
-- HANOI GO! — Cập nhật 018: BÁO QUẢN TRỊ VIÊN KHI CÓ NGƯỜI ĐĂNG KÝ MỚI
-- - Chỉ quản trị viên / quản trị tối cao bật được (Cài đặt → "Báo khi có người đăng ký")
-- - Mỗi tài khoản mới → thông báo trong web + thông báo đẩy (nếu thiết bị đã bật thông báo đẩy)
-- Chạy SAU 017_comment_replies.sql. Chạy lại cũng an toàn.
-- =====================================================================

alter table public.profiles add column if not exists notify_signups boolean not null default false;

-- Bật / tắt cho chính mình (chỉ quản trị viên)
create or replace function public.set_notify_signups(p_on boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên mới bật được thông báo này'; end if;
  update public.profiles set notify_signups = p_on where id = auth.uid();
  return p_on;
end $$;

revoke execute on function public.set_notify_signups(boolean) from public, anon;
grant  execute on function public.set_notify_signups(boolean) to authenticated;

-- Thông báo loại mới 'new_user'
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('reaction', 'comment', 'reply', 'friend_request', 'friend_accept',
                  'comment_reaction', 'comment_reply', 'new_user'));

-- Hồ sơ mới được tạo (ngay khi đăng ký) → báo các quản trị viên đã bật
create or replace function public.notify_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, kind)
  select p.id, new.id, 'new_user'
  from public.profiles p
  where p.is_admin and p.notify_signups and p.id <> new.id;
  return new;
exception when others then
  -- Không được làm hỏng việc đăng ký nếu gửi thông báo lỗi
  return new;
end $$;

drop trigger if exists profiles_notify_new_user on public.profiles;
create trigger profiles_notify_new_user after insert on public.profiles
  for each row execute function public.notify_new_user();

-- Thông báo đẩy: câu chữ + link cho loại mới
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
    when 'friend_request' then 'đã gửi lời mời kết bạn'
    when 'friend_accept' then 'đã chấp nhận lời mời kết bạn'
    else 'đã tương tác với bạn' end;
  if coalesce(new.body, '') <> '' then v_body := v_body || ': “' || left(new.body, 80) || '”'; end if;

  v_url := case
    when new.kind = 'friend_request' then './#/friends'
    when new.kind = 'friend_accept' then './#/u/' || v_actor_username
    when new.kind = 'new_user' then './#/admin?tab=users'
    when new.entry_id is null then './#/notifications'
    when v_owner = new.user_id then './#/journal?entry=' || new.entry_id
    else './#/u/' || v_owner_username || '?entry=' || new.entry_id end;

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

revoke execute on function public.notify_new_user() from public, anon, authenticated;
revoke execute on function public.notify_push() from public, anon, authenticated;
