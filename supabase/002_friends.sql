-- =====================================================================
-- HANOI GO! — Cập nhật 002: Bạn bè, xem Sổ hành trình của bạn, thả tim
-- Chạy SAU schema.sql: Supabase Dashboard → SQL Editor → New query → dán → Run.
-- Chạy lại cũng an toàn.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. FRIENDSHIPS — lời mời kết bạn & bạn bè
-- ---------------------------------------------------------------------
create table if not exists public.friendships (
  id         bigint generated always as identity primary key,
  requester  uuid not null references public.profiles(id) on delete cascade,
  addressee  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);

-- Mỗi cặp người chỉ có 1 dòng, bất kể ai gửi trước
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

alter table public.friendships enable row level security;

drop policy if exists "friendships: read own" on public.friendships;
create policy "friendships: read own" on public.friendships
  for select to authenticated using (auth.uid() in (requester, addressee));

-- Huỷ lời mời / từ chối / huỷ kết bạn: ai trong cặp cũng xoá được
drop policy if exists "friendships: delete own" on public.friendships;
create policy "friendships: delete own" on public.friendships
  for delete to authenticated using (auth.uid() in (requester, addressee));

-- Gửi & chấp nhận lời mời chỉ qua hàm bên dưới
revoke insert, update on public.friendships from anon, authenticated;

create or replace function public.is_friend(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a))
  );
$$;

-- Gửi lời mời theo tên đăng nhập. Nếu người kia đã mời mình trước → thành bạn luôn.
create or replace function public.send_friend_request(p_username text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_target uuid;
  f        public.friendships;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập'; end if;

  select id into v_target from public.profiles where username = lower(trim(p_username));
  if v_target is null then raise exception 'Không tìm thấy người dùng "%"', p_username; end if;
  if v_target = v_uid then raise exception 'Không thể tự kết bạn với chính mình'; end if;

  select * into f from public.friendships
  where least(requester, addressee) = least(v_uid, v_target)
    and greatest(requester, addressee) = greatest(v_uid, v_target);

  if found then
    if f.status = 'accepted' then raise exception 'Hai bạn đã là bạn bè rồi'; end if;
    if f.requester = v_uid then raise exception 'Bạn đã gửi lời mời rồi, chờ người ấy đồng ý nhé'; end if;
    update public.friendships set status = 'accepted' where id = f.id;
    return json_build_object('status', 'accepted');
  end if;

  insert into public.friendships (requester, addressee) values (v_uid, v_target);
  return json_build_object('status', 'pending');
end $$;

-- Người nhận chấp nhận (true) hoặc từ chối (false)
create or replace function public.respond_friend_request(p_id bigint, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_accept then
    update public.friendships set status = 'accepted'
    where id = p_id and addressee = auth.uid() and status = 'pending';
  else
    delete from public.friendships
    where id = p_id and addressee = auth.uid() and status = 'pending';
  end if;
  if not found then raise exception 'Lời mời không còn tồn tại'; end if;
end $$;

revoke execute on function public.send_friend_request(text) from public, anon;
grant  execute on function public.send_friend_request(text) to authenticated;
revoke execute on function public.respond_friend_request(bigint, boolean) from public, anon;
grant  execute on function public.respond_friend_request(bigint, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 2. JOURNAL — thêm chế độ riêng tư, bạn bè xem được trang không riêng tư
-- ---------------------------------------------------------------------
alter table public.journal_entries add column if not exists is_private boolean not null default false;
create index if not exists journal_entries_user_idx on public.journal_entries (user_id, created_at desc);
create index if not exists journal_entries_photo_idx on public.journal_entries (photo_path);

drop policy if exists "journal: read own" on public.journal_entries;
drop policy if exists "journal: read own or friends" on public.journal_entries;
create policy "journal: read own or friends" on public.journal_entries
  for select to authenticated
  using (auth.uid() = user_id or (not is_private and public.is_friend(auth.uid(), user_id)));

-- Ảnh: bạn bè xem được ảnh gắn với trang nhật ký không riêng tư
drop policy if exists "photos: friends read shared" on storage.objects;
create policy "photos: friends read shared" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.journal_entries j
      where j.photo_path = storage.objects.name
        and not j.is_private
        and public.is_friend(auth.uid(), j.user_id)
    )
  );

-- ---------------------------------------------------------------------
-- 3. LIKES — thả tim trang nhật ký
-- ---------------------------------------------------------------------
create table if not exists public.journal_likes (
  entry_id   bigint not null references public.journal_entries(id) on delete cascade,
  user_id    uuid   not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);

alter table public.journal_likes enable row level security;

-- Thấy tim của những trang mình được xem (RLS của journal_entries lọc giúp)
drop policy if exists "likes: read visible" on public.journal_likes;
create policy "likes: read visible" on public.journal_likes
  for select to authenticated
  using (exists (select 1 from public.journal_entries j where j.id = entry_id));

drop policy if exists "likes: insert own" on public.journal_likes;
create policy "likes: insert own" on public.journal_likes
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.journal_entries j where j.id = entry_id));

drop policy if exists "likes: delete own" on public.journal_likes;
create policy "likes: delete own" on public.journal_likes
  for delete to authenticated using (user_id = auth.uid());
