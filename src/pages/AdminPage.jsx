import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { CATEGORIES, fmtDateVN } from '../lib/partner'
import { levelInfo } from '../lib/game'
import Modal from '../components/Modal'
import Stars from '../components/Stars'

const STATUS = {
  pending: { label: 'Chờ duyệt', cls: '' },
  approved: { label: 'Đã duyệt', cls: 'ok' },
  rejected: { label: 'Từ chối', cls: 'bad' },
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [tab, setTab] = useState('partners')
  const [pending, setPending] = useState(0)

  if (!profile) return <div className="page"><div className="spinner" /></div>
  if (!profile.is_admin) return <Navigate to="/me" replace />

  return (
    <div className="page">
      <button className="ghost back" onClick={() => navigate(-1)}>← Quay lại</button>
      <section className="admin-hero">
        <div className="eyebrow light">Quản trị hệ thống</div>
        <h1>🛡️ Trang quản trị</h1>
        <p>Duyệt đối tác, quản lý người dùng và kiểm duyệt nội dung đánh giá.</p>
      </section>
      <div className="segmented">
        <button className={tab === 'partners' ? 'active' : ''} onClick={() => setTab('partners')}>
          🏪 Đối tác{pending > 0 && <span className="badge static">{pending}</span>}
        </button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>👤 Người dùng</button>
        <button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>💬 Đánh giá</button>
      </div>
      {tab === 'partners' && <PartnersTab onPendingCount={setPending} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'reviews' && <ReviewsTab />}
    </div>
  )
}

/* ------------------------------ Đối tác ------------------------------ */
function PartnersTab({ onPendingCount }) {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [deciding, setDeciding] = useState(null) // { partner, status }
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('partners')
      .select('*, owner:profiles!partners_owner_id_fkey(username, display_name, avatar)')
      .order('created_at', { ascending: false })
    if (error) return toast(friendlyError(error), 'error')
    setRows(data)
    onPendingCount(data.filter((p) => p.status === 'pending').length)
  }, [toast, onPendingCount])
  useEffect(() => { load() }, [load])

  const open = (partner, status) => {
    setDeciding({ partner, status })
    setNote(status === 'approved' ? 'Chào mừng bạn đến với HANOI GO!' : '')
  }

  const decide = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('admin_set_partner_status', { p_id: deciding.partner.id, p_status: deciding.status, p_note: note.trim() })
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    toast(deciding.status === 'approved' ? `Đã duyệt ${deciding.partner.name} ✅` : `Đã cập nhật ${deciding.partner.name}`, 'success')
    setDeciding(null)
    load()
  }

  if (!rows) return <div className="spinner" />
  const list = rows.filter((p) => filter === 'all' || p.status === filter)
  const count = (s) => rows.filter((p) => p.status === s).length

  return (
    <>
      <div className="chips">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button key={s} className={`chip${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>{STATUS[s].label} ({count(s)})</button>
        ))}
        <button className={`chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
      </div>

      {list.length === 0 && <p className="muted small center">Không có hồ sơ nào ở mục này.</p>}
      {list.map((p) => (
        <section key={p.id} className="card admin-partner">
          <div className="admin-partner-head">
            <span className="partner-emoji small">{p.emoji}</span>
            <div className="grow">
              <strong>{p.name}</strong>
              <div className="muted small">{CATEGORIES[p.category]?.emoji} {CATEGORIES[p.category]?.label} · đăng ký {fmtDateVN(p.created_at)}</div>
            </div>
            <span className={`tag ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
          </div>
          {p.description && <p className="small">{p.description}</p>}
          <dl className="admin-dl">
            <dt>Chủ tài khoản</dt><dd>{p.owner?.avatar} {p.owner?.display_name} (@{p.owner?.username})</dd>
            {p.address && <><dt>Địa chỉ</dt><dd>{p.address}</dd></>}
            {p.phone && <><dt>Điện thoại</dt><dd>{p.phone}</dd></>}
            <dt>Vị trí</dt>
            <dd>{p.lat != null
              ? <a href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">Xem trên Google Maps ↗</a>
              : 'Chưa có'}</dd>
            {p.admin_note && <><dt>Ghi chú</dt><dd>{p.admin_note}</dd></>}
          </dl>
          <div className="row tight">
            {p.status !== 'approved' && <button className="btn primary small" onClick={() => open(p, 'approved')}>✓ Duyệt</button>}
            {p.status !== 'rejected' && <button className="btn danger small" onClick={() => open(p, 'rejected')}>{p.status === 'approved' ? 'Thu hồi' : '✕ Từ chối'}</button>}
          </div>
        </section>
      ))}

      <Modal open={!!deciding} onClose={() => setDeciding(null)}
        title={deciding?.status === 'approved' ? 'Duyệt đối tác' : deciding?.partner.status === 'approved' ? 'Thu hồi quyền đối tác' : 'Từ chối hồ sơ'}>
        {deciding && (
          <>
            <p><b>{deciding.partner.emoji} {deciding.partner.name}</b></p>
            {deciding.status === 'rejected' && (
              <p className="muted small">Nhiệm vụ và ưu đãi của đối tác này sẽ bị ẩn khỏi app cho tới khi được duyệt lại.</p>
            )}
            <label className="field">
              <span>{deciding.status === 'approved' ? 'Lời nhắn tới đối tác (tuỳ chọn)' : 'Lý do (đối tác sẽ thấy)'}</span>
              <textarea rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={deciding.status === 'approved' ? '' : 'vd: Thiếu địa chỉ cụ thể, vui lòng bổ sung'} />
            </label>
            <button className={`btn block ${deciding.status === 'approved' ? 'primary' : 'danger'}`} disabled={busy} onClick={decide}>
              {busy ? 'Đang lưu…' : deciding.status === 'approved' ? 'Xác nhận duyệt' : 'Xác nhận'}
            </button>
          </>
        )}
      </Modal>
    </>
  )
}

/* ------------------------------ Người dùng ------------------------------ */
function UsersTab() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState(null)

  const load = useCallback(async () => {
    let q = supabase.from('profiles').select('id, username, display_name, avatar, xp, coins, is_demo, is_admin, created_at, last_active_date')
      .order('created_at', { ascending: false }).limit(50)
    const term = query.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (term) q = q.ilike('username', `%${term}%`)
    const { data } = await q
    setRows(data || [])
  }, [query])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const toggleDemo = async (u) => {
    const { error } = await supabase.rpc('admin_set_demo', { p_user_id: u.id, p_on: !u.is_demo })
    if (error) return toast(friendlyError(error), 'error')
    toast(!u.is_demo ? `Đã bật chế độ demo cho @${u.username}` : `Đã tắt chế độ demo cho @${u.username}`, 'success')
    load()
  }

  return (
    <>
      <input className="search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 Tìm tên đăng nhập…" autoCapitalize="none" />
      {!rows ? <div className="spinner" /> : (
        <section className="card">
          <div className="section-head"><h3>Người dùng</h3><span className="muted small">{rows.length} tài khoản</span></div>
          {rows.map((u) => (
            <div key={u.id} className="person-row">
              <span className="person-link">
                <span className="rank-avatar">{u.avatar}</span>
                <span className="rank-name">
                  <strong>{u.display_name || u.username} {u.is_admin && <span className="tag ok">Admin</span>}</strong>
                  <span className="muted small">@{u.username} · Lv {levelInfo(u.xp).level} · 🪙 {u.coins} · tham gia {fmtDateVN(u.created_at)}</span>
                </span>
              </span>
              <button className={`chip${u.is_demo ? ' active' : ''}`} onClick={() => toggleDemo(u)} title="Chế độ demo: check-in được ở bất kỳ đâu">
                🎤 Demo {u.is_demo ? 'bật' : 'tắt'}
              </button>
            </div>
          ))}
        </section>
      )}
    </>
  )
}

/* ------------------------------ Đánh giá ------------------------------ */
function ReviewsTab() {
  const toast = useToast()
  const [rows, setRows] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(username, display_name, avatar), quests(title, emoji), tours(title, emoji)')
      .order('created_at', { ascending: false })
      .limit(100)
    setRows(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const remove = async (r) => {
    if (!confirm('Xoá đánh giá này? Thao tác không thể hoàn tác.')) return
    const { error } = await supabase.rpc('admin_delete_review', { p_id: r.id })
    if (error) return toast(friendlyError(error), 'error')
    toast('Đã xoá đánh giá', 'success')
    load()
  }

  if (!rows) return <div className="spinner" />
  return (
    <section className="card">
      <div className="section-head"><h3>Đánh giá gần đây</h3><span className="muted small">{rows.length}</span></div>
      {rows.length === 0 && <p className="muted small">Chưa có đánh giá nào.</p>}
      {rows.map((r) => (
        <div key={r.id} className="review-item">
          <span className="rank-avatar">{r.profiles?.avatar}</span>
          <div className="grow">
            <div className="review-head">
              <strong>{r.profiles?.display_name || r.profiles?.username}</strong>
              <Stars value={r.overall} size="0.8rem" />
            </div>
            <span className="muted small">{r.quests ? `${r.quests.emoji} ${r.quests.title}` : `${r.tours?.emoji} Tour ${r.tours?.title}`} · {fmtDateVN(r.created_at)}</span>
            {r.comment ? <p>{r.comment}</p> : <p className="muted small">(không có nhận xét)</p>}
          </div>
          <button className="ghost small danger-text" onClick={() => remove(r)} aria-label="Xoá đánh giá">🗑</button>
        </div>
      ))}
    </section>
  )
}
