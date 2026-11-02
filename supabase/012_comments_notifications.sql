-- =====================================================================
-- HANOI GO! — Cập nhật 012: BÌNH LUẬN & THÔNG BÁO
-- - Bình luận dưới mỗi trang Sổ hành trình (ai xem được trang thì bình luận được)
-- - Thông báo tự tạo khi: bạn bè thả cảm xúc, bình luận (cả khi người khác bình luận
--   tiếp vào bài mình đã bình luận), gửi lời mời kết bạn, chấp nhận kết bạn
-- Chạy SAU 011_dau_chan_quests.sql. Chạy lại cũng an toàn.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. COMMENTS
-- ---------------------------------------------------------------------
create table if not exists public.journal_comments (
  id         bigint generated always as identity primary key,
  entry_id   bigint not null references public.journal_entries(id) on delete cascade,
  user_id    uuid   not null default auth.uid() references public.profiles(id) on delete cascade,
  body       text   not null check (char_length(trim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists journal_comments_entry_idx on public.journal_comments (entry_id, created_at);

alter table public.journal_comments enable row level security;

-- Thấy bình luận của những trang mình được xem (RLS của journal_entries lọc giúp)
drop policy if exists "comments: read visible" on public.journal_comments;
create policy "comments: read visible" on public.journal_comments
  for select to authenticated
  using (exists (select 1 from public.journal_entries j where j.id = entry_id));

drop policy if exists "comments: insert own" on public.journal_comments;
create policy "comments: insert own" on public.journal_comments
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.journal_entries j where j.id = entry_id));

-- Xoá: người viết, hoặc chủ trang nhật ký
drop policy if exists "comments: delete own or owner" on public.journal_comments;
create policy "comments: delete own or owner" on public.journal_comments
  for delete to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.journal_entries j where j.id = entry_id and j.user_id = auth.uid()));

revoke update on public.journal_comments from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. NOTIFICATIONS
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,   -- người nhận
  actor_id   uuid not null references public.profiles(id) on delete cascade,   -- người tương tác
  kind       text not null check (kind in ('reaction', 'comment', 'reply', 'friend_request', 'friend_accept')),
  entry_id   bigint references public.journal_entries(id) on delete cascade,
  reaction   text,
  body       text not null default '',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications: update own" on public.notifications;
create policy "notifications: update own" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications: delete own" on public.notifications;
create policy "notifications: delete own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Chỉ được đánh dấu đã đọc; thông báo chỉ do trigger tạo
revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Cập nhật trực tiếp (realtime) để chuông thông báo nhảy số ngay
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object or undefined_object then null;
end $$;

-- ---------------------------------------------------------------------
-- 3. TRIGGERS — tự tạo thông báo
-- ---------------------------------------------------------------------

-- Cảm xúc: báo chủ trang; đổi cảm xúc thì sửa thông báo cũ thay vì tạo thêm
create or replace function public.notify_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.notifications
    where kind = 'reaction' and entry_id = old.entry_id and actor_id = old.user_id and read_at is null;
    return old;
  end if;
  select user_id into v_owner from public.journal_entries where id = new.entry_id;
  if v_owner is null or v_owner = new.user_id then return new; end if;
  if tg_op = 'UPDATE' then
    update public.notifications set reaction = new.reaction, created_at = now(), read_at = null
    where kind = 'reaction' and entry_id = new.entry_id and actor_id = new.user_id;
    if found then return new; end if;
  end if;
  insert into public.notifications (user_id, actor_id, kind, entry_id, reaction)
  values (v_owner, new.user_id, 'reaction', new.entry_id, coalesce(new.reaction, '❤️'));
  return new;
end $$;

drop trigger if exists journal_likes_notify on public.journal_likes;
create trigger journal_likes_notify
  after insert or update of reaction or delete on public.journal_likes
  for each row execute function public.notify_reaction();

-- Bình luận: báo chủ trang + những người đã bình luận trước đó
create or replace function public.notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.journal_entries where id = new.entry_id;
  if v_owner is null then return new; end if;
  if v_owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, kind, entry_id, body)
    values (v_owner, new.user_id, 'comment', new.entry_id, left(new.body, 120));
  end if;
  insert into public.notifications (user_id, actor_id, kind, entry_id, body)
  select distinct c.user_id, new.user_id, 'reply', new.entry_id, left(new.body, 120)
  from public.journal_comments c
  where c.entry_id = new.entry_id and c.user_id not in (new.user_id, v_owner);
  return new;
end $$;

drop trigger if exists journal_comments_notify on public.journal_comments;
create trigger journal_comments_notify
  after insert on public.journal_comments
  for each row execute function public.notify_comment();

-- Kết bạn: lời mời mới → báo người nhận; được chấp nhận → báo người gửi; huỷ lời mời → xoá thông báo
create or replace function public.notify_friendship() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (user_id, actor_id, kind) values (new.addressee, new.requester, 'friend_request');
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    delete from public.notifications
    where kind = 'friend_request' and user_id = new.addressee and actor_id = new.requester;
    insert into public.notifications (user_id, actor_id, kind) values (new.requester, new.addressee, 'friend_accept');
  elsif tg_op = 'DELETE' then
    -- lời mời bị huỷ / từ chối → bỏ thông báo lời mời chưa xử lý
    delete from public.notifications
    where kind = 'friend_request' and user_id = old.addressee and actor_id = old.requester;
    return old;
  end if;
  return new;
end $$;

drop trigger if exists friendships_notify on public.friendships;
create trigger friendships_notify
  after insert or update of status or delete on public.friendships
  for each row execute function public.notify_friendship();

revoke execute on function public.notify_reaction() from public, anon, authenticated;
revoke execute on function public.notify_comment() from public, anon, authenticated;
revoke execute on function public.notify_friendship() from public, anon, authenticated;
