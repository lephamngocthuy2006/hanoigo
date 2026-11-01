-- =====================================================================
-- HANOI GO! — Cập nhật 007: THẢ CẢM XÚC (giống Facebook) cho Sổ hành trình
-- 👍 Thích · ❤️ Yêu thích · 🥰 Thương thương · 😆 Haha · 😮 Wow · 😢 Buồn · 😡 Phẫn nộ · 🤬 Đập bàn (vui)
-- Chạy SAU 006_super_admin.sql. Chạy lại cũng an toàn. Lượt tim cũ giữ nguyên là ❤️.
-- =====================================================================

alter table public.journal_likes add column if not exists reaction text not null default '❤️';

alter table public.journal_likes drop constraint if exists journal_likes_reaction_check;
alter table public.journal_likes add constraint journal_likes_reaction_check
  check (reaction in ('👍', '❤️', '🥰', '😆', '😮', '😢', '😡', '🤬'));

-- Cho phép đổi cảm xúc của chính mình
drop policy if exists "likes: update own" on public.journal_likes;
create policy "likes: update own" on public.journal_likes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant update (reaction) on public.journal_likes to authenticated;
