import { tr } from './i18n'
// Cấp độ: mỗi level cần nhiều XP hơn level trước một chút
export function levelInfo(xp = 0) {
  let level = 1
  let need = 300
  let rest = xp
  while (rest >= need) {
    rest -= need
    level += 1
    need = 300 + (level - 1) * 100
  }
  return { level, current: rest, need, pct: Math.round((rest / need) * 100) }
}

export function levelTitle(level) {
  if (level >= 20) return tr('Huyền thoại Thăng Long')
  if (level >= 12) return tr('Explorer Hà Nội')
  if (level >= 7) return tr('Lữ khách phố cổ')
  if (level >= 3) return tr('Người dạo phố')
  return tr('Tân binh')
}

export function todayVN() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

// Streak hiển thị: nếu bỏ lỡ quá 1 ngày thì về 0
export function liveStreak(profile) {
  if (!profile?.last_active_date) return 0
  const today = new Date(todayVN())
  const last = new Date(profile.last_active_date)
  const diff = Math.round((today - last) / 86400000)
  return diff <= 1 ? profile.streak : 0
}

export const RARITY = {
  common: { label: tr('Thường'), color: '#8a8f98' },
  rare: { label: tr('Hiếm'), color: '#3b82c4' },
  epic: { label: tr('Sử thi'), color: '#8b4fc9' },
  legendary: { label: tr('Huyền thoại'), color: '#d49a1f' },
}

export const KIND = {
  photo: { label: 'Photo Quest', icon: '📸' },
  checkin: { label: 'Check-in', icon: '📍' },
  quiz: { label: tr('Đố vui'), icon: '❓' },
}

export const AVATARS = ['🐢', '🦊', '🐱', '🐶', '🐼', '🐰', '🐸', '🦁', '🐧', '🦄', '🌸', '🍜', '☕', '🎓', '🏯', '🌼']
