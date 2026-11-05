import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AVATARS, levelInfo, levelTitle, liveStreak } from '../lib/game'
import Modal from '../components/Modal'
import Emoji from '../components/Emoji'
import Icon from '../components/Icon'
import { tr, locale } from '../lib/i18n'

// Menu trang Tôi: chia nhóm, icon nét mảnh trong ô màu, mũi tên › cuối dòng
const MENU = [
  {
    title: tr('Cộng đồng'),
    items: [
      { to: '/friends', icon: 'users', tone: 'rose', label: tr('Bạn bè'),
        sub: ({ friends, incoming }) => tr('{0} người', friends.length) + (incoming.length ? tr(' · {0} lời mời', incoming.length) : ''),
        badge: ({ incoming }) => incoming.length },
      { to: '/notifications', icon: 'bell', tone: 'gold', label: tr('Thông báo'),
        sub: ({ unread }) => (unread ? tr('{0} chưa đọc', unread) : tr('Cảm xúc, bình luận, lời mời')),
        badge: ({ unread }) => unread },
    ],
  },
  {
    title: tr('Khám phá'),
    items: [
      { to: '/tours', icon: 'compass', tone: 'teal', label: tr('Tour theo chủ đề'), sub: () => tr('Lộ trình nhiều điểm & chứng nhận') },
      { to: '/insights', icon: 'chart', tone: 'blue', label: tr('Thống kê trải nghiệm'), sub: () => tr('Đánh giá & điểm đến nổi bật') },
    ],
  },
  {
    title: tr('Doanh nghiệp & quản trị'),
    items: [
      { to: '/partner', icon: 'store', tone: 'amber', label: tr('Cổng đối tác'), sub: () => tr('Dành cho doanh nghiệp, cửa hàng') },
      { to: '/admin', icon: 'shield', tone: 'plum', label: tr('Trang quản trị'), sub: () => tr('Đối tác, người dùng, mã QR'), admin: true },
    ],
  },
  {
    title: tr('Tài khoản'),
    items: [
      { to: '/settings', icon: 'settings', tone: 'slate', label: tr('Cài đặt'), sub: () => tr('Ngôn ngữ, giao diện, thông báo') },
      { icon: 'lock', tone: 'slate', label: tr('Đổi mật khẩu') },
    ],
  },
]

export default function MePage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const navigate = useNavigate()
  const { friends, incoming, notifications } = useOutletContext()

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
      <div className="two-col me-cols">
      <div className="col">
      <section className="profile-hero">
        <div className="profile-avatar"><Emoji e={profile.avatar} play="loop" /></div>
        <h1>{profile.display_name || profile.username}</h1>
        <div className="muted">@{profile.username}</div>
        {profile.is_demo && <span className="tag ok" title={tr('Check-in được ở bất kỳ đâu khi thuyết trình')}><Emoji e="🎤" play="static" />{tr(' Chế độ demo')}</span>}
        {profile.bio && <p className="bio">{profile.bio}</p>}
        <button className="ghost small" onClick={() => setEditOpen(true)}><Emoji e="✏️" play="static" />{tr(' Chỉnh sửa hồ sơ')}</button>
      </section>

      <section className="card level-card">
        <div className="level-badge">{lv.level}</div>
        <div className="level-body">
          <div className="eyebrow">Level {lv.level}</div>
          <strong>{levelTitle(lv.level)}</strong>
          <div className="progress"><div style={{ width: `${lv.pct}%` }} /></div>
          <div className="muted small">{lv.current} / {lv.need}{tr(' XP · còn ')}{lv.need - lv.current}{tr(' XP lên level')}</div>
        </div>
      </section>
      </div>
      <div className="col">
      <div className="stat-grid">
        <div className="stat"><strong><Emoji e="🪙" play="once" /> {profile.coins}</strong><span>Hanoi Coins</span></div>
        <div className="stat"><strong><Emoji e="⭐" play="once" /> {profile.xp}</strong><span>{tr('Tổng XP')}</span></div>
        <div className="stat"><strong><Emoji e="🔥" play="once" /> {liveStreak(profile)}</strong><span>{tr('Streak (kỷ lục ')}{profile.best_streak})</span></div>
        <div className="stat"><strong><Emoji e="🏅" play="once" /> {stats?.quests ?? '…'}</strong><span>{tr('Lượt hoàn thành')}</span></div>
        <div className="stat"><strong><Emoji e="📸" play="once" /> {stats?.photos ?? '…'}</strong><span>{tr('Ảnh đã lưu')}</span></div>
        <div className="stat"><strong><Emoji e="🎴" play="once" /> {stats?.cards ?? '…'}</strong><span>{tr('Loại thẻ')}</span></div>
      </div>

      {MENU.map((group) => {
        const items = group.items.filter((it) => !it.admin || profile.is_admin)
        return (
          <section key={group.title} className="menu-group">
            <h4 className="menu-group-title">{group.title}</h4>
            <div className="card menu-card">
              {items.map((it) => {
                const sub = it.sub?.({ friends, incoming, unread: notifications?.unread || 0 })
                const badge = it.badge?.({ incoming, unread: notifications?.unread || 0 })
                return (
                  <button key={it.label} className="menu-item" onClick={() => (it.to ? navigate(it.to) : setPwOpen(true))}>
                    <span className={`menu-ico tone-${it.tone}`}><Icon name={it.icon} /></span>
                    <span className="menu-text">
                      <strong>{it.label}</strong>
                      {sub && <small>{sub}</small>}
                    </span>
                    {badge > 0 && <span className="menu-badge">{badge > 9 ? '9+' : badge}</span>}
                    <Icon name="chevron" size={18} className="menu-chevron" />
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
      <button className="logout-btn" onClick={() => { navigate('/', { replace: true }); signOut() }}>
        <Icon name="logout" size={19} />{tr('Đăng xuất')}
      </button>
      <p className="muted small center">{tr('Tham gia từ ')}{new Date(profile.created_at).toLocaleDateString(locale)}</p>
      </div>
      </div>

      <EditProfile open={editOpen} onClose={() => setEditOpen(false)} profile={profile}
        onSaved={() => { setEditOpen(false); refreshProfile(); toast(tr('Đã cập nhật hồ sơ'), 'success') }} />
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
    <Modal open={open} onClose={onClose} title={tr('Chỉnh sửa hồ sơ')}>
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
        <label className="field"><span>{tr('Tên hiển thị')}</span>
          <input value={form.display_name} maxLength={40} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></label>
        <label className="field"><span>{tr('Giới thiệu')}</span>
          <textarea rows={3} value={form.bio} maxLength={160} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
        <button className="btn primary block" disabled={busy}>{busy ? tr('Đang lưu…') : tr('Lưu')}</button>
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
    if (pw !== pw2) return toast(tr('Mật khẩu nhập lại không khớp'), 'error')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    toast(tr('Đã đổi mật khẩu'), 'success')
    setPw(''); setPw2(''); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={tr('Đổi mật khẩu')}>
      <form onSubmit={save}>
        <label className="field"><span>{tr('Mật khẩu mới')}</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required autoComplete="new-password" /></label>
        <label className="field"><span>{tr('Nhập lại')}</span>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={6} required autoComplete="new-password" /></label>
        <button className="btn primary block" disabled={busy}>{busy ? tr('Đang lưu…') : tr('Đổi mật khẩu')}</button>
      </form>
    </Modal>
  )
}
