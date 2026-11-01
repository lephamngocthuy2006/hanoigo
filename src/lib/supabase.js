import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

export const supabase = isConfigured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

// Supabase Auth cần email, nên username được đổi thành một email "ảo" nội bộ.
// Không có email nào được gửi đi (đã tắt "Confirm email" trong Supabase).
const EMAIL_DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'users.hanoigo.app'

export const usernameToEmail = (username) => `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/

// Dịch lỗi Supabase sang tiếng Việt dễ hiểu
export function friendlyError(error) {
  const msg = error?.message || String(error || '')
  if (/Invalid login credentials/i.test(msg)) return 'Sai tên đăng nhập hoặc mật khẩu'
  if (/already registered|already exists/i.test(msg)) return 'Tên đăng nhập này đã có người dùng'
  if (/Password should be at least/i.test(msg)) return 'Mật khẩu cần ít nhất 6 ký tự'
  if (/Email not confirmed/i.test(msg)) return 'Tài khoản chưa được xác nhận. Hãy tắt "Confirm email" trong Supabase (xem README).'
  if (/rate limit/i.test(msg)) return 'Thao tác quá nhanh, vui lòng thử lại sau ít phút'
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Không kết nối được máy chủ. Kiểm tra mạng nhé!'
  return msg || 'Đã có lỗi xảy ra'
}
