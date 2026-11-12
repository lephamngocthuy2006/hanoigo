-- =====================================================================
-- HANOI GO! — Cập nhật 023: TỰ ĐỘNG MỞ PREMIUM BẰNG ẢNH BILL CHUYỂN KHOẢN
-- - Người mua tải ảnh bill lên (thư mục riêng <user_id>/bill-...), web đọc chữ trên bill ngay trên máy:
--   thấy đúng số tiền + nội dung chuyển khoản → mở Premium luôn (auto); không đọc được → chờ duyệt tay
-- - Quản trị viên tối cao xem được ảnh bill để đối soát, thu hồi nếu bill giả
-- - Thông báo mới 'premium_auto' (gửi quản trị tối cao) khi có người được mở tự động
-- Chạy SAU 022_premium_journal.sql. Chạy lại cũng an toàn.
-- =====================================================================

alter table public.premium_requests add column if not exists bill_path text;
alter table public.premium_requests add column if not exists auto boolean not null default false;

-- Quản trị viên tối cao xem được ảnh bill (chỉ file bill-…, không phải ảnh nhật ký riêng tư)
drop policy if exists "photos: super admin read bills" on storage.objects;
create policy "photos: super admin read bills" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and name like '%/bill-%' and public.is_super_admin());

-- Gửi bill: p_auto = true khi web đã đọc thấy đúng số tiền + nội dung → mở Premium ngay
create or replace function public.submit_premium_bill(p_bill_path text, p_auto boolean, p_ocr text default '')
returns json language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_price int; v_id bigint;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập'; end if;
  if exists (select 1 from public.profiles where id = v_uid and is_premium) then
    raise exception 'Tài khoản của bạn đã có gói Premium rồi';
  end if;
  if p_bill_path is null or p_bill_path not like v_uid::text || '/bill-%'
     or not exists (select 1 from storage.objects o where o.bucket_id = 'photos' and o.name = p_bill_path) then
    raise exception 'Không tìm thấy ảnh bill, hãy tải lên lại nhé';
  end if;
  select premium_price into v_price from public.app_settings where id = 1;

  if p_auto then
    update public.profiles set is_premium = true, premium_since = coalesce(premium_since, now()) where id = v_uid;
    -- yêu cầu đang chờ (nếu có) coi như đã xong
    update public.premium_requests set status = 'approved', decided_at = now(), bill_path = coalesce(bill_path, p_bill_path)
    where user_id = v_uid and status = 'pending';
    insert into public.premium_requests (user_id, amount, note, status, decided_at, bill_path, auto)
    values (v_uid, coalesce(v_price, 0), left(coalesce(p_ocr, ''), 200), 'approved', now(), p_bill_path, true);
    insert into public.notifications (user_id, actor_id, kind, body)
    select p.id, v_uid, 'premium_auto', left(coalesce(p_ocr, ''), 120)
    from public.profiles p where p.is_super_admin and p.id <> v_uid;
    return json_build_object('ok', true, 'granted', true);
  end if;

  -- không đọc được bill → gắn vào yêu cầu đang chờ (hoặc tạo mới) để quản trị viên duyệt tay
  select id into v_id from public.premium_requests where user_id = v_uid and status = 'pending';
  if v_id is not null then
    update public.premium_requests set bill_path = p_bill_path, note = left(coalesce(p_ocr, note), 200) where id = v_id;
  else
    insert into public.premium_requests (user_id, amount, note, bill_path)
    values (v_uid, coalesce(v_price, 0), left(coalesce(p_ocr, ''), 200), p_bill_path)
    returning id into v_id;
    insert into public.notifications (user_id, actor_id, kind, body)
    select p.id, v_uid, 'premium_request', left(coalesce(p_ocr, ''), 120)
    from public.profiles p where p.is_super_admin and p.id <> v_uid;
  end if;
  return json_build_object('ok', true, 'granted', false, 'id', v_id);
end $$;

-- Thông báo: thêm loại 'premium_auto'
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('reaction', 'comment', 'reply', 'friend_request', 'friend_accept', 'comment_reaction',
                  'comment_reply', 'new_user', 'premium_request', 'premium_granted', 'premium_auto'));

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
    when 'premium_auto' then 'đã gửi bill và được mở Premium tự động ✅ — kiểm tra lại khi rảnh nhé'
    when 'friend_request' then 'đã gửi lời mời kết bạn'
    when 'friend_accept' then 'đã chấp nhận lời mời kết bạn'
    else 'đã tương tác với bạn' end;
  if coalesce(new.body, '') <> '' then v_body := v_body || ': “' || left(new.body, 80) || '”'; end if;

  v_url := case
    when new.kind = 'friend_request' then './#/friends'
    when new.kind = 'friend_accept' then './#/u/' || v_actor_username
    when new.kind = 'new_user' then './#/admin?tab=users'
    when new.kind in ('premium_request', 'premium_auto') then './#/admin?tab=premium'
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

revoke execute on function public.submit_premium_bill(text, boolean, text) from public, anon;
grant  execute on function public.submit_premium_bill(text, boolean, text) to authenticated;
revoke execute on function public.notify_push() from public, anon, authenticated;
