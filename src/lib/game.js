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
  if (level >= 20) return 'Huyền thoại Thăng Long'
  if (level >= 12) return 'Explorer Hà Nội'
  if (level >= 7) return 'Lữ khách phố cổ'
  if (level >= 3) return 'Người dạo phố'
  return 'Tân binh'
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
  common: { label: 'Thường', color: '#8a8f98' },
  rare: { label: 'Hiếm', color: '#3b82c4' },
  epic: { label: 'Sử thi', color: '#8b4fc9' },
  legendary: { label: 'Huyền thoại', color: '#d49a1f' },
}

export const KIND = {
  photo: { label: 'Photo Quest', icon: '📸' },
  checkin: { label: 'Check-in', icon: '📍' },
  quiz: { label: 'Đố vui', icon: '❓' },
}

export const AVATARS = ['🐢', '🦊', '🐱', '🐶', '🐼', '🐰', '🐸', '🦁', '🐧', '🦄', '🌸', '🍜', '☕', '🎓', '🏯', '🌼']
