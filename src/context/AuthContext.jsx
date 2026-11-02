import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, usernameToEmail, USERNAME_RE } from '../lib/supabase'
import { useToast } from './ToastContext'
import { tr } from '../lib/i18n'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const loadProfile = useCallback(async (userId) => {
    if (!userId) return setProfile(null)
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (!data && !error) {
      // Không còn hồ sơ: hỏi lại máy chủ xem tài khoản còn tồn tại không (bị quản trị viên xoá
      // thì phiên đăng nhập cũ vẫn còn trong máy) → đăng xuất thay vì kẹt ở màn hình tải
      const { error: userError } = await supabase.auth.getUser()
      if (userError && userError.status !== 0 && !/fetch|network/i.test(userError.message)) {
        await supabase.auth.signOut({ scope: 'local' })
        toast(tr('Tài khoản này không còn tồn tại. Vui lòng đăng nhập lại.'), 'error')
        return setProfile(null)
      }
    }
    setProfile(data)
  }, [toast])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // tránh gọi Supabase trực tiếp trong callback (khuyến nghị của supabase-js)
        setTimeout(() => loadProfile(s?.user.id), 0)
      }
    })
    // quay lại tab → kiểm tra lại tài khoản (có thể vừa bị xoá ở máy khác)
    const onFocus = () => document.visibilityState === 'visible' &&
      supabase.auth.getSession().then(({ data }) => data.session && loadProfile(data.session.user.id))
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      sub.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [loadProfile])

  const signUp = async ({ username, password, displayName }) => {
    const u = username.trim().toLowerCase()
    if (!USERNAME_RE.test(u)) throw new Error(tr('Tên đăng nhập 3–20 ký tự, chỉ gồm chữ thường không dấu, số và dấu _'))
    if (password.length < 6) throw new Error(tr('Mật khẩu cần ít nhất 6 ký tự'))
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(u),
      password,
      options: { data: { username: u, display_name: displayName?.trim() || u } },
    })
    if (error) throw error
    // Supabase trả về user "giả" (không có identities) nếu email đã tồn tại
    if (data.user && data.user.identities?.length === 0) throw new Error(tr('Tên đăng nhập này đã có người dùng'))
    if (!data.session) throw new Error('Email not confirmed')
  }

  const signIn = async ({ username, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password })
    if (error) throw error
  }

  const signOut = () => supabase.auth.signOut()

  const refreshProfile = () => loadProfile(session?.user.id)

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, setProfile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
