-- =====================================================================
-- HANOI GO! — Cập nhật 013: THẢ CẢM XÚC CHO BÌNH LUẬN
-- Cùng bộ cảm xúc với Sổ hành trình (👍 ❤️ 🥰 😆 😮 😢 😡 🤬 Đập bàn)
-- Người viết bình luận nhận thông báo khi có người thả cảm xúc.
-- Chạy SAU 012_comments_notifications.sql. Chạy lại cũng an toàn.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. COMMENT REACTIONS
-- ---------------------------------------------------------------------
create table if not exists public.comment_reactions (
  comment_id bigint not null references public.journal_comments(id) on delete cascade,
  user_id    uuid   not null default auth.uid() references public.profiles(id) on delete cascade,
  reaction   text   not null default '❤️'
             check (reaction in ('👍', '❤️', '🥰', '😆', '😮', '😢', '😡', '🤬')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_reactions enable row level security;

-- Thấy cảm xúc của những bình luận mình được xem (RLS của journal_comments lọc giúp)
drop policy if exists "comment reactions: read visible" on public.comment_reactions;
create policy "comment reactions: read visible" on public.comment_reactions
  for select to authenticated
  using (exists (select 1 from public.journal_comments c where c.id = comment_id));

drop policy if exists "comment reactions: insert own" on public.comment_reactions;
create policy "comment reactions: insert own" on public.comment_reactions
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.journal_comments c where c.id = comment_id));

drop policy if exists "comment reactions: update own" on public.comment_reactions;
create policy "comment reactions: update own" on public.comment_reactions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "comment reactions: delete own" on public.comment_reactions;
create policy "comment reactions: delete own" on public.comment_reactions
  for delete to authenticated using (user_id = auth.uid());

revoke update on public.comment_reactions from anon, authenticated;
grant update (reaction) on public.comment_reactions to authenticated;

-- ---------------------------------------------------------------------
-- 2. NOTIFICATIONS: thêm loại 'comment_reaction'
-- ---------------------------------------------------------------------
alter table public.notifications
  add column if not exists comment_id bigint references public.journal_comments(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('reaction', 'comment', 'reply', 'friend_request', 'friend_accept', 'comment_reaction'));

-- Báo người viết bình luận; đổi cảm xúc thì sửa thông báo cũ, gỡ thì xoá thông báo chưa đọc
create or replace function public.notify_comment_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_entry bigint; v_body text;
begin
  if tg_op = 'DELETE' then
    delete from public.notifications
    where kind = 'comment_reaction' and comment_id = old.comment_id and actor_id = old.user_id and read_at is null;
    return old;
  end if;
  select user_id, entry_id, body into v_author, v_entry, v_body from public.journal_comments where id = new.comment_id;
  if v_author is null or v_author = new.user_id then return new; end if;
  if tg_op = 'UPDATE' then
    update public.notifications set reaction = new.reaction, created_at = now(), read_at = null
    where kind = 'comment_reaction' and comment_id = new.comment_id and actor_id = new.user_id;
    if found then return new; end if;
  end if;
  insert into public.notifications (user_id, actor_id, kind, entry_id, comment_id, reaction, body)
  values (v_author, new.user_id, 'comment_reaction', v_entry, new.comment_id, new.reaction, left(v_body, 120));
  return new;
end $$;

drop trigger if exists comment_reactions_notify on public.comment_reactions;
create trigger comment_reactions_notify
  after insert or update of reaction or delete on public.comment_reactions
  for each row execute function public.notify_comment_reaction();

revoke execute on function public.notify_comment_reaction() from public, anon, authenticated;
