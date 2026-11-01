import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AVATARS, levelInfo, levelTitle, liveStreak } from '../lib/game'
import Modal from '../components/Modal'
import Emoji from '../components/Emoji'

export default function MePage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const navigate = useNavigate()
  const { friends, incoming } = useOutletContext()

  useEffect(() => {
    const count = (table, extra = (q) => q) =>
      extra(supabase.from(table).select('*', { count: 'exact', head: true }).eq('user_id', user.id)).then((r) => r.count ?? 0)
    Promise.all([
      count('quest_completions'),
      count('journal_entries', (q) => q.not('photo_path', 'is', null)),
      count('user_cards'),
    ]).then(([quests, photos, cards]) => setStats({ quests, photos, cards }))
  }, [user.id])

  if (!profile) return <div className="page"><div className="spinner" /></div>
  const lv = levelInfo(profile.xp)

  return (
    <div className="page">
      <section className="profile-hero">
        <div className="profile-avatar"><Emoji e={profile.avatar} play="loop" /></div>
        <h1>{profile.display_name || profile.username}</h1>
        <div className="muted">@{profile.username}</div>
        {profile.is_demo && <span className="tag ok" title="Check-in được ở bất kỳ đâu khi thuyết trình"><Emoji e="🎤" play="static" /> Chế độ demo</span>}
        {profile.bio && <p className="bio">{profile.bio}</p>}
        <button className="ghost small" onClick={() => setEditOpen(true)}><Emoji e="✏️" play="static" /> Chỉnh sửa hồ sơ</button>
      </section>

      <section className="card level-card">
        <div className="level-badge">{lv.level}</div>
        <div className="level-body">
          <div className="eyebrow">Level {lv.level}</div>
          <strong>{levelTitle(lv.level)}</strong>
          <div className="progress"><div style={{ width: `${lv.pct}%` }} /></div>
          <div className="muted small">{lv.current} / {lv.need} XP · còn {lv.need - lv.current} XP lên level</div>
        </div>
      </section>

      <div className="stat-grid">
        <div className="stat"><strong><Emoji e="🪙" play="once" /> {profile.coins}</strong><span>Hanoi Coins</span></div>
        <div className="stat"><strong><Emoji e="⭐" play="once" /> {profile.xp}</strong><span>Tổng XP</span></div>
        <div className="stat"><strong><Emoji e="🔥" play="once" /> {liveStreak(profile)}</strong><span>Streak (kỷ lục {profile.best_streak})</span></div>
        <div className="stat"><strong><Emoji e="🏅" play="once" /> {stats?.quests ?? '…'}</strong><span>Lượt hoàn thành</span></div>
        <div className="stat"><strong><Emoji e="📸" play="once" /> {stats?.photos ?? '…'}</strong><span>Ảnh đã lưu</span></div>
        <div className="stat"><strong><Emoji e="🎴" play="once" /> {stats?.cards ?? '…'}</strong><span>Loại thẻ</span></div>
      </div>

      <section className="card menu">
        <button onClick={() => navigate('/friends')}>
          <Emoji e="👥" play="static" /> Bạn bè ({friends.length}){incoming.length > 0 && <span className="badge static">{incoming.length} lời mời</span>}
        </button>
        <button onClick={() => navigate('/tours')}><Emoji e="🧭" play="static" /> Tour theo chủ đề</button>
        <button onClick={() => navigate('/insights')}><Emoji e="📊" play="static" /> Thống kê chất lượng trải nghiệm</button>
        <button onClick={() => navigate('/partner')}><Emoji e="🏪" play="static" /> Cổng đối tác (dành cho doanh nghiệp)</button>
        {profile.is_admin && <button onClick={() => navigate('/admin')}><Emoji e="🛡️" play="static" /> Trang quản trị</button>}
        <button onClick={() => setPwOpen(true)}><Emoji e="🔒" play="static" /> Đổi mật khẩu</button>
        <button className="danger-text" onClick={signOut}>↪ Đăng xuất</button>
      </section>
      <p className="muted small center">Tham gia từ {new Date(profile.created_at).toLocaleDateString('vi-VN')}</p>

      <EditProfile open={editOpen} onClose={() => setEditOpen(false)} profile={profile}
        onSaved={() => { setEditOpen(false); refreshProfile(); toast('Đã cập nhật hồ sơ', 'success') }} />
      <ChangePassword open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}

function EditProfile({ open, onClose, profile, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(profile)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(profile) }, [open, profile])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('profiles')
      .update({ display_name: form.display_name.trim(), avatar: form.avatar, bio: form.bio.trim() })
      .eq('id', profile.id)
    setBusy(false)
    if (error) toast(friendlyError(error), 'error')
    else onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Chỉnh sửa hồ sơ">
      <form onSubmit={save}>
        <div className="field"><span>Avatar</span>
          <div className="avatar-grid">
            {AVATARS.map((a) => (
              <button type="button" key={a} className={form.avatar === a ? 'active' : ''} onClick={() => setForm({ ...form, avatar: a })}>
                <Emoji e={a} play={form.avatar === a ? 'loop' : 'static'} />
              </button>
            ))}
          </div>
        </div>
        <label className="field"><span>Tên hiển thị</span>
          <input value={form.display_name} maxLength={40} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></label>
        <label className="field"><span>Giới thiệu</span>
          <textarea rows={3} value={form.bio} maxLength={160} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
        <button className="btn primary block" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      </form>
    </Modal>
  )
}

function ChangePassword({ open, onClose }) {
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    if (pw !== pw2) return toast('Mật khẩu nhập lại không khớp', 'error')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    toast('Đã đổi mật khẩu', 'success')
    setPw(''); setPw2(''); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Đổi mật khẩu">
      <form onSubmit={save}>
        <label className="field"><span>Mật khẩu mới</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required autoComplete="new-password" /></label>
        <label className="field"><span>Nhập lại</span>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={6} required autoComplete="new-password" /></label>
        <button className="btn primary block" disabled={busy}>{busy ? 'Đang lưu…' : 'Đổi mật khẩu'}</button>
      </form>
    </Modal>
  )
}
