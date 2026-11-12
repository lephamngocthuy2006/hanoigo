import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { CATEGORIES, fmtDateVN } from '../lib/partner'
import { levelInfo } from '../lib/game'
import Modal from '../components/Modal'
import Stars from '../components/Stars'
import AdminQrTab from '../components/AdminQrTab'
import AdminPremiumTab from '../components/AdminPremiumTab'
import Emoji, { emojify } from '../components/Emoji'
import { tr, locale, localize } from '../lib/i18n'

const STATUS = {
  pending: { label: tr('Chờ duyệt'), cls: '' },
  approved: { label: tr('Đã duyệt'), cls: 'ok' },
  rejected: { label: tr('Từ chối'), cls: 'bad' },
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  // ?tab=users: mở thẳng tab Người dùng (từ thông báo "vừa đăng ký")
  const [params] = useSearchParams()
  const [tab, setTab] = useState(() => (['partners', 'users', 'reviews', 'qr', 'premium'].includes(params.get('tab')) ? params.get('tab') : 'partners'))
  const [pending, setPending] = useState(0)

  if (!profile) return <div className="page"><div className="spinner" /></div>
  if (!profile.is_admin) return <Navigate to="/me" replace />

  return (
    <div className="page">
      <button className="ghost back mobile-only" onClick={() => navigate(-1)}>{tr('← Quay lại')}</button>
      <section className="admin-hero">
        <div className="eyebrow light">{tr('Quản trị hệ thống · ')}{emojify(profile.is_super_admin ? tr('👑 Tối cao') : '🛡️ Admin')}</div>
        <h1><Emoji e="🛡️" play="static" />{tr(' Trang quản trị')}</h1>
        <p>{tr('Duyệt đối tác, quản lý người dùng và kiểm duyệt nội dung đánh giá.')}</p>
      </section>
      <div className="segmented admin-tabs">
        <button className={tab === 'partners' ? 'active' : ''} onClick={() => setTab('partners')}>
          <Emoji e="🏪" play="static" />{tr(' Đối tác')}{pending > 0 && <span className="badge static">{pending}</span>}
        </button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}><Emoji e="👤" play="static" />{tr(' Người dùng')}</button>
        <button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}><Emoji e="💬" play="static" />{tr(' Đánh giá')}</button>
        <button className={tab === 'qr' ? 'active' : ''} onClick={() => setTab('qr')}><Emoji e="📱" play="static" />{tr(' Mã QR')}</button>
        {profile.is_super_admin && (
          <button className={tab === 'premium' ? 'active' : ''} onClick={() => setTab('premium')}><Emoji e="👑" play="static" /> Premium</button>
        )}
      </div>
      {tab === 'partners' && <PartnersTab onPendingCount={setPending} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'reviews' && <ReviewsTab />}
      {tab === 'qr' && <AdminQrTab />}
      {tab === 'premium' && profile.is_super_admin && <AdminPremiumTab />}
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
    setNote(status === 'approved' ? tr('Chào mừng bạn đến với HANOI GO!') : '')
  }

  const decide = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('admin_set_partner_status', { p_id: deciding.partner.id, p_status: deciding.status, p_note: note.trim() })
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    toast(deciding.status === 'approved' ? tr('Đã duyệt {0} ✅', deciding.partner.name) : tr('Đã cập nhật {0}', deciding.partner.name), 'success')
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
          <button key={s} className={`chip${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>{emojify(STATUS[s].label)} ({count(s)})</button>
        ))}
        <button className={`chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>{tr('Tất cả')}</button>
      </div>

      {list.length === 0 && <p className="muted small center">{tr('Không có hồ sơ nào ở mục này.')}</p>}
      <div className="admin-partner-list">{list.map((p) => (
        <section key={p.id} className="card admin-partner">
          <div className="admin-partner-head">
            <span className="partner-emoji small"><Emoji e={p.emoji} play="loop" /></span>
            <div className="grow">
              <strong>{p.name}</strong>
              <div className="muted small">{emojify(CATEGORIES[p.category]?.emoji)} {emojify(CATEGORIES[p.category]?.label)}{tr(' · đăng ký ')}{fmtDateVN(p.created_at)}</div>
            </div>
            <span className={`tag ${STATUS[p.status].cls}`}>{emojify(STATUS[p.status].label)}</span>
          </div>
          {p.description && <p className="small">{p.description}</p>}
          <dl className="admin-dl">
            <dt>{tr('Chủ tài khoản')}</dt><dd>{emojify(p.owner?.avatar)} {p.owner?.display_name} (@{p.owner?.username})</dd>
            {p.address && <><dt>{tr('Địa chỉ')}</dt><dd>{p.address}</dd></>}
            {p.phone && <><dt>{tr('Điện thoại')}</dt><dd>{p.phone}</dd></>}
            <dt>{tr('Vị trí')}</dt>
            <dd>{p.lat != null
              ? <a href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">{tr('Xem trên Google Maps ↗')}</a>
              : tr('Chưa có')}</dd>
            {p.admin_note && <><dt>{tr('Ghi chú')}</dt><dd>{p.admin_note}</dd></>}
          </dl>
          <div className="row tight">
            {p.status !== 'approved' && <button className="btn primary small" onClick={() => open(p, 'approved')}>{tr('✓ Duyệt')}</button>}
            {p.status !== 'rejected' && <button className="btn danger small" onClick={() => open(p, 'rejected')}>{p.status === 'approved' ? tr('Thu hồi') : tr('✕ Từ chối')}</button>}
          </div>
        </section>
      ))}</div>

      <Modal open={!!deciding} onClose={() => setDeciding(null)}
        title={deciding?.status === 'approved' ? tr('Duyệt đối tác') : deciding?.partner.status === 'approved' ? tr('Thu hồi quyền đối tác') : tr('Từ chối hồ sơ')}>
        {deciding && (
          <>
            <p><b>{emojify(deciding.partner.emoji)} {deciding.partner.name}</b></p>
            {deciding.status === 'rejected' && (
              <p className="muted small">{tr('Nhiệm vụ và ưu đãi của đối tác này sẽ bị ẩn khỏi app cho tới khi được duyệt lại.')}</p>
            )}
            <label className="field">
              <span>{deciding.status === 'approved' ? tr('Lời nhắn tới đối tác (tuỳ chọn)') : tr('Lý do (đối tác sẽ thấy)')}</span>
              <textarea rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={deciding.status === 'approved' ? '' : tr('vd: Thiếu địa chỉ cụ thể, vui lòng bổ sung')} />
            </label>
            <button className={`btn block ${deciding.status === 'approved' ? 'primary' : 'danger'}`} disabled={busy} onClick={decide}>
              {busy ? tr('Đang lưu…') : deciding.status === 'approved' ? tr('Xác nhận duyệt') : tr('Xác nhận')}
            </button>
          </>
        )}
      </Modal>
    </>
  )
}

/* ------------------------------ Người dùng ------------------------------ */
const ROLES = {
  super: { label: tr('👑 Tối cao'), desc: tr('Toàn quyền quản trị + cấp quyền cho người khác') },
  admin: { label: '🛡️ Admin', desc: tr('Duyệt đối tác, quản lý người dùng, kiểm duyệt đánh giá') },
  user: { label: tr('👤 Người dùng'), desc: tr('Không có quyền quản trị') },
}
const roleOf = (u) => (u.is_super_admin ? 'super' : u.is_admin ? 'admin' : 'user')
const SORTS = [
  { id: 'new', label: tr('Mới đăng ký'), col: 'created_at' },
  { id: 'active', label: tr('Hoạt động gần đây'), col: 'last_active_date' },
  { id: 'xp', label: tr('Nhiều XP'), col: 'xp' },
]

const PAGE = 200

function UsersTab() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('new')
  const [rows, setRows] = useState(null)
  const [stats, setStats] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  // Xoá nhiều tài khoản cùng lúc (dọn spam): chỉ Tối cao, không chọn được quản trị viên / chính mình
  const confirm = useConfirm()
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState(() => new Map()) // id -> username
  const [bulk, setBulk] = useState(null) // { done, total } khi đang xoá
  const isSuper = profile?.is_super_admin

  const loadStats = useCallback(() => {
    supabase.rpc('admin_user_stats').then(({ data }) => setStats(data))
  }, [])

  // Tải theo trang 200 dòng; total = tổng số khớp tìm kiếm (không chỉ số dòng đang hiện)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [moreBusy, setMoreBusy] = useState(false)
  const fetchPage = useCallback(async (page) => {
    const col = SORTS.find((x) => x.id === sort).col
    let q = supabase
      .from('profiles')
      .select('id, username, display_name, avatar, xp, coins, is_demo, is_admin, is_super_admin, is_premium, created_at, last_active_date', { count: 'exact' })
      .order(col, { ascending: false, nullsFirst: false })
      .order('id')
      .range(page * PAGE, page * PAGE + PAGE - 1)
    const term = query.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (term) q = q.ilike('username', `%${term}%`)
    return q
  }, [query, sort])

  const load = useCallback(async () => {
    const { data, count } = await fetchPage(0)
    setRows(localize(data || []))
    setTotal(count ?? (data || []).length)
    setPages(1)
  }, [fetchPage])

  const loadMore = async () => {
    setMoreBusy(true)
    const { data, count, error } = await fetchPage(pages)
    setMoreBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    setRows((r) => [...r, ...localize(data || [])])
    if (count != null) setTotal(count)
    setPages((n) => n + 1)
  }

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => { loadStats() }, [loadStats])

  const togglePremium = async (u) => {
    const name = u.display_name || u.username
    if (u.is_premium && !(await confirm(tr('Tắt gói Premium của {0}?', name), { ok: tr('Tắt Premium'), danger: true }))) return
    const { error } = await supabase.rpc('admin_set_premium', { p_user_id: u.id, p_on: !u.is_premium })
    if (error) return toast(friendlyError(error), 'error')
    toast(!u.is_premium ? tr('Đã mở Premium cho {0} 👑', name) : tr('Đã tắt Premium của {0}', name), 'success')
    setRows((list) => list.map((x) => (x.id === u.id ? { ...x, is_premium: !u.is_premium } : x)))
  }

  const toggleDemo = async (u) => {
    const { error } = await supabase.rpc('admin_set_demo', { p_user_id: u.id, p_on: !u.is_demo })
    if (error) return toast(friendlyError(error), 'error')
    toast(!u.is_demo ? tr('Đã bật chế độ demo cho @{0}', u.username) : tr('Đã tắt chế độ demo cho @{0}', u.username), 'success')
    load()
  }

  const setRole = async (role) => {
    setBusy(true)
    const { error } = await supabase.rpc('admin_set_role', { p_user_id: editing.id, p_role: role })
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    toast(tr('@{0} giờ là {1}', editing.username, ROLES[role].label), 'success')
    setEditing(null)
    load()
    loadStats()
  }

  const deleteUser = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: deleting.id })
    setBusy(false)
    if (error) {
      const msg = /admin_delete_user|schema cache/i.test(error.message || '')
        ? tr('Hãy chạy file supabase/008_delete_user.sql trong Supabase SQL Editor để bật tính năng xoá tài khoản')
        : friendlyError(error)
      return toast(msg, 'error')
    }
    toast(tr('Đã xoá tài khoản @{0}', deleting.username), 'success')
    setDeleting(null)
    load()
    loadStats()
  }

  const isNew = (u) => Date.now() - new Date(u.created_at).getTime() < 86400000
  const canDelete = (u) => u.id !== user.id && !u.is_admin && !u.is_super_admin

  const togglePick = (u) => setPicked((s) => {
    const n = new Map(s)
    if (n.has(u.id)) n.delete(u.id)
    else n.set(u.id, u.username)
    return n
  })
  // Chọn MỌI tài khoản thường đăng ký trong 24 giờ qua (kể cả chưa hiện trong danh sách 200 dòng)
  const pickNew = async () => {
    const since = new Date(Date.now() - 86400000).toISOString()
    const found = new Map()
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('profiles').select('id, username')
        .gte('created_at', since).eq('is_admin', false).eq('is_super_admin', false).neq('id', user.id)
        .order('created_at', { ascending: false }).range(from, from + 999)
      if (error) return toast(friendlyError(error), 'error')
      data.forEach((u) => found.set(u.id, u.username))
      if (data.length < 1000) break
    }
    setPicked(found)
    if (!found.size) toast(tr('Không có tài khoản mới nào trong 24 giờ qua'))
  }
  const stopSelecting = () => {
    setSelecting(false)
    setPicked(new Map())
  }

  // Xoá theo từng đợt 200 tài khoản (database tự bỏ qua quản trị viên / chính mình)
  const deleteMany = async () => {
    const ids = [...picked.keys()]
    if (!ids.length) return
    const names = [...picked.values()].slice(0, 5).map((n) => '@' + n).join(', ') + (ids.length > 5 ? tr(' và {0} tài khoản khác', ids.length - 5) : '')
    if (!(await confirm(tr('Xoá vĩnh viễn {0} tài khoản: {1}? Toàn bộ nhật ký, ảnh, bình luận của họ cũng bị xoá, không thể hoàn tác.', ids.length, names), { ok: tr('Xoá {0} tài khoản', ids.length), danger: true }))) return
    let deleted = 0
    let error = null
    setBulk({ done: 0, total: ids.length })
    for (let i = 0; i < ids.length && !error; i += 200) {
      const res = await supabase.rpc('admin_delete_users', { p_user_ids: ids.slice(i, i + 200) })
      if (res.error) error = res.error
      else deleted += res.data
      setBulk({ done: Math.min(i + 200, ids.length), total: ids.length })
    }
    setBulk(null)
    stopSelecting()
    if (error) {
      const msg = /admin_delete_users|schema cache/i.test(error.message || '')
        ? tr('Hãy chạy file supabase/019_bulk_delete_users.sql trong Supabase SQL Editor để bật tính năng xoá nhiều tài khoản')
        : friendlyError(error)
      toast(deleted ? tr('Đã xoá {0} tài khoản, phần còn lại bị lỗi: {1}', deleted, msg) : msg, 'error')
    } else toast(tr('Đã xoá {0} tài khoản', deleted), 'success')
    load()
    loadStats()
  }

  return (
    <>
      {stats && (
        <div className="kpi-grid">
          <div className="kpi"><span className="kpi-icon"><Emoji e="👥" play="once" /></span><strong>{stats.total}</strong><span>{tr('Tổng tài khoản')}</span></div>
          <div className="kpi"><span className="kpi-icon"><Emoji e="🆕" play="once" /></span><strong>{stats.today}</strong><span>{tr('Đăng ký hôm nay · ')}{stats.week}{tr(' trong 7 ngày')}</span></div>
          <div className="kpi"><span className="kpi-icon"><Emoji e="🔥" play="once" /></span><strong>{stats.active_today}</strong><span>{tr('Hoạt động hôm nay')}</span></div>
          <div className="kpi"><span className="kpi-icon"><Emoji e="🛡️" play="once" /></span><strong>{stats.admins}</strong><span>{tr('Quản trị viên')}</span></div>
        </div>
      )}

      <input className="search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr('🔍 Tìm tên đăng nhập…')} autoCapitalize="none" />
      <div className="chips">
        {SORTS.map((x) => (
          <button key={x.id} className={`chip${sort === x.id ? ' active' : ''}`} onClick={() => setSort(x.id)}>{emojify(x.label)}</button>
        ))}
      </div>

      {!rows ? <div className="spinner" /> : (
        <section className="card">
          <div className="section-head">
            <div className="section-title">
              <h3>{tr('Người dùng')}</h3>
              <span className="muted small">
                {rows.length < total ? tr('Đang hiện {0} / {1} tài khoản', rows.length, total) : tr('{0} tài khoản', total)}
              </span>
            </div>
            <span className="section-actions">
              {isSuper && !selecting && (
                <button className="select-btn" onClick={() => setSelecting(true)}>
                  <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                    <rect x="2.5" y="2.5" width="15" height="15" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M6.4 10.2l2.5 2.5 4.8-5.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {tr('Chọn nhiều')}
                </button>
              )}
            </span>
          </div>
          {selecting && (
            <div className="bulk-bar">
              <span><b>{picked.size}</b>{tr(' đã chọn')}</span>
              <button className="chip" onClick={pickNew} disabled={!!bulk}><Emoji e="🆕" play="static" />{tr(' Chọn tài khoản mới (24 giờ)')}</button>
              <button className="chip" onClick={() => setPicked(new Map())} disabled={!!bulk || !picked.size}>{tr('Bỏ chọn')}</button>
              <span className="bulk-bar-end">
                <button className="btn small" onClick={stopSelecting} disabled={!!bulk}>{tr('Xong')}</button>
                <button className="btn small danger-fill" onClick={deleteMany} disabled={!!bulk || !picked.size}>
                  {bulk ? tr('Đang xoá {0}/{1}…', bulk.done, bulk.total) : <><Emoji e="🗑️" play="static" />{tr(' Xoá {0}', picked.size)}</>}
                </button>
              </span>
            </div>
          )}
          {rows.map((u) => (
            <div key={u.id} className={`admin-user${selecting && picked.has(u.id) ? ' picked' : ''}`}
              onClick={selecting && canDelete(u) && !bulk ? () => togglePick(u) : undefined}>
              {selecting && (
                <input type="checkbox" className="pick-box" checked={picked.has(u.id)} disabled={!canDelete(u) || !!bulk}
                  onChange={() => togglePick(u)} onClick={(e) => e.stopPropagation()}
                  aria-label={tr('Chọn @{0}', u.username)} title={canDelete(u) ? '' : tr('Không xoá hàng loạt quản trị viên hoặc chính mình')} />
              )}
              <span className="rank-avatar"><Emoji e={u.avatar} play="hover" /></span>
              <div className="admin-user-body">
                <strong>
                  {u.display_name || u.username}
                  {u.is_super_admin ? <span className="tag gold"><Emoji e="👑" play="static" />{tr(' Tối cao')}</span> : u.is_admin && <span className="tag ok"><Emoji e="🛡️" play="static" /> Admin</span>}
                  {isNew(u) && <span className="tag new">{tr('Mới')}</span>}
                </strong>
                <span className="muted small">@{u.username} · Lv {levelInfo(u.xp).level} · <Emoji e="🪙" play="static" /> {u.coins}</span>
                <span className="muted small">{tr('Đăng ký lúc ')}{new Date(u.created_at).toLocaleString(locale, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {u.last_active_date && tr(' · hoạt động {0}', fmtDateVN(u.last_active_date))}
                </span>
                {!selecting && <div className="admin-user-actions">
                  <button className={`chip${u.is_demo ? ' active' : ''}`} onClick={() => toggleDemo(u)} title={tr('Chế độ demo: check-in được ở bất kỳ đâu')}>
                    <Emoji e="🎤" play="static" /> Demo {u.is_demo ? tr('bật') : tr('tắt')}
                  </button>
                  {isSuper && (
                    <button className={`chip${u.is_premium ? ' active premium-chip' : ''}`} onClick={() => togglePremium(u)} title={tr('Gói Premium cho Sổ hành trình')}>
                      <Emoji e="👑" play="static" /> Premium {u.is_premium ? tr('bật') : tr('tắt')}
                    </button>
                  )}
                  {isSuper && u.id !== user.id && (
                    <button className="chip" onClick={() => setEditing(u)}><Emoji e="🔑" play="static" />{tr(' Phân quyền')}</button>
                  )}
                  {isSuper && u.id !== user.id && !u.is_super_admin && (
                    <button className="chip danger-text" onClick={() => setDeleting(u)}><Emoji e="🗑️" play="static" />{tr(' Xoá')}</button>
                  )}
                </div>}
              </div>
            </div>
          ))}
          {rows.length < total && (
            <button className="btn block load-more" onClick={loadMore} disabled={moreBusy}>
              {moreBusy ? tr('Đang tải…') : tr('Tải thêm {0} tài khoản', Math.min(PAGE, total - rows.length))}
            </button>
          )}
        </section>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={tr('Phân quyền')}>
        {editing && (
          <>
            <p>{emojify(editing.avatar)} <b>{editing.display_name || editing.username}</b> <span className="muted">@{editing.username}</span></p>
            <div className="role-list">
              {Object.entries(ROLES).map(([key, r]) => (
                <button key={key} className={`role-option${roleOf(editing) === key ? ' current' : ''}`} disabled={busy || roleOf(editing) === key}
                  onClick={() => setRole(key)}>
                  <strong>{emojify(r.label)}{roleOf(editing) === key && tr(' · hiện tại')}</strong>
                  <span className="muted small">{r.desc}</span>
                </button>
              ))}
            </div>
            <p className="muted small">{tr('Quản trị viên tối cao có thể cấp hoặc thu hồi quyền của người khác, nhưng không tự hạ quyền của mình.')}</p>
          </>
        )}
      </Modal>

      <Modal open={!!deleting} onClose={() => !busy && setDeleting(null)} title={tr('Xoá tài khoản')}>
        {deleting && (
          <>
            <p>{emojify(deleting.avatar)} <b>{deleting.display_name || deleting.username}</b> <span className="muted">@{deleting.username}</span></p>
            <p className="muted small">{tr('Tài khoản này cùng toàn bộ dữ liệu liên quan (Sổ hành trình, lượt hoàn thành, đánh giá, hồ sơ đối tác và ưu đãi nếu có) sẽ bị xoá vĩnh viễn và không thể hoàn tác.')}</p>
            <div className="row">
              <button className="btn grow" disabled={busy} onClick={() => setDeleting(null)}>{tr('Huỷ')}</button>
              <button className="btn danger grow" disabled={busy} onClick={deleteUser}>{busy ? tr('Đang xoá…') : tr('Xoá vĩnh viễn')}</button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}

/* ------------------------------ Đánh giá ------------------------------ */
function ReviewsTab() {
  const toast = useToast()
  const confirm = useConfirm()
  const [rows, setRows] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(username, display_name, avatar), quests(*), tours(*)')
      .order('created_at', { ascending: false })
      .limit(100)
    setRows(localize(data || []))
  }, [])
  useEffect(() => { load() }, [load])

  const remove = async (r) => {
    if (!(await confirm(tr('Xoá đánh giá này? Thao tác không thể hoàn tác.'), { ok: tr('Xoá'), danger: true }))) return
    const { error } = await supabase.rpc('admin_delete_review', { p_id: r.id })
    if (error) return toast(friendlyError(error), 'error')
    toast(tr('Đã xoá đánh giá'), 'success')
    load()
  }

  if (!rows) return <div className="spinner" />
  return (
    <section className="card">
      <div className="section-head"><h3>{tr('Đánh giá gần đây')}</h3><span className="muted small">{rows.length}</span></div>
      {rows.length === 0 && <p className="muted small">{tr('Chưa có đánh giá nào.')}</p>}
      {rows.map((r) => (
        <div key={r.id} className="review-item">
          <span className="rank-avatar"><Emoji e={r.profiles?.avatar} play="hover" /></span>
          <div className="grow">
            <div className="review-head">
              <strong>{r.profiles?.display_name || r.profiles?.username}</strong>
              <Stars value={r.overall} size="0.8rem" />
            </div>
            <span className="muted small">{r.quests ? `${r.quests.emoji} ${r.quests.title}` : `${r.tours?.emoji} Tour ${r.tours?.title}`} · {fmtDateVN(r.created_at)}</span>
            {r.comment ? <p>{r.comment}</p> : <p className="muted small">{tr('(không có nhận xét)')}</p>}
          </div>
          <button className="ghost small danger-text" onClick={() => remove(r)} aria-label={tr('Xoá đánh giá')}><Emoji e="🗑" play="static" /></button>
        </div>
      ))}
    </section>
  )
}
