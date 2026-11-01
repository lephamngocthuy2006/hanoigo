import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, usernameToEmail, USERNAME_RE } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) return setProfile(null)
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data)
  }, [])

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
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signUp = async ({ username, password, displayName }) => {
    const u = username.trim().toLowerCase()
    if (!USERNAME_RE.test(u)) throw new Error('Tên đăng nhập 3–20 ký tự, chỉ gồm chữ thường không dấu, số và dấu _')
    if (password.length < 6) throw new Error('Mật khẩu cần ít nhất 6 ký tự')
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(u),
      password,
      options: { data: { username: u, display_name: displayName?.trim() || u } },
    })
    if (error) throw error
    // Supabase trả về user "giả" (không có identities) nếu email đã tồn tại
    if (data.user && data.user.identities?.length === 0) throw new Error('Tên đăng nhập này đã có người dùng')
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
