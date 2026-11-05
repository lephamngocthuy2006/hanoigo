-- =====================================================================
-- HANOI GO! — Cập nhật 020: MỞ THÔNG BÁO BÌNH LUẬN → NHẢY TỚI ĐÚNG BÌNH LUẬN
-- - Thông báo "đã bình luận" và "cũng đã bình luận" giờ cũng lưu mã bình luận (comment_id)
--   (trước chỉ có "trả lời" và "thả cảm xúc vào bình luận")
-- - Thông báo đẩy mở thẳng tới bình luận đó (…?entry=…&comment=…)
-- Thông báo cũ không đổi (vẫn mở đúng bài). Chạy SAU 019_bulk_delete_users.sql. Chạy lại cũng an toàn.
-- =====================================================================

create or replace function public.notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_parent_author uuid := new.reply_to;
begin
  select user_id into v_owner from public.journal_entries where id = new.entry_id;
  if v_owner is null then return new; end if;

  if v_parent_author is not null and v_parent_author <> new.user_id then
    insert into public.notifications (user_id, actor_id, kind, entry_id, comment_id, body)
    values (v_parent_author, new.user_id, 'comment_reply', new.entry_id, new.id, left(new.body, 120));
  end if;

  if v_owner <> new.user_id and v_owner is distinct from v_parent_author then
    insert into public.notifications (user_id, actor_id, kind, entry_id, comment_id, body)
    values (v_owner, new.user_id, 'comment', new.entry_id, new.id, left(new.body, 120));
  end if;

  if new.parent_id is null then
    insert into public.notifications (user_id, actor_id, kind, entry_id, comment_id, body)
    select distinct c.user_id, new.user_id, 'reply', new.entry_id, new.id, left(new.body, 120)
    from public.journal_comments c
    where c.entry_id = new.entry_id and c.id <> new.id and c.user_id not in (new.user_id, v_owner);
  end if;
  return new;
end $$;

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

revoke execute on function public.notify_comment() from public, anon, authenticated;
revoke execute on function public.notify_push() from public, anon, authenticated;
