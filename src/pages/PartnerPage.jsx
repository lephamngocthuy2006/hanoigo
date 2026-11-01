import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { CATEGORIES, fmtDateVN, useMyPartner } from '../lib/partner'
import { CRITERIA, fmtScore, summarize } from '../lib/reviews'
import { KIND } from '../lib/game'
import Modal from '../components/Modal'
import Stars from '../components/Stars'
import PartnerProfileForm from '../components/PartnerProfileForm'
import Emoji, { emojify } from '../components/Emoji'
import { tr, locale, localize } from '../lib/i18n'

const TABS = [
  { id: 'overview', label: tr('📊 Tổng quan') },
  { id: 'quests', label: tr('🎯 Nhiệm vụ') },
  { id: 'vouchers', label: tr('🎟️ Ưu đãi') },
  { id: 'feedback', label: tr('💬 Phản hồi') },
]

export default function PartnerPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { partner, error, reload } = useMyPartner(user.id)
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  // dữ liệu dùng chung giữa các tab
  const [quests, setQuests] = useState([])
  const [reviews, setReviews] = useState([])

  const loadShared = useCallback(async () => {
    if (partner?.status !== 'approved') return
    const { data: q } = await supabase.from('quests').select('*').eq('partner_id', partner.id).order('created_at', { ascending: false })
    setQuests(q || [])
    const ids = (q || []).map((x) => x.id)
    if (!ids.length) return setReviews([])
    const { data: r } = await supabase
      .from('reviews')
      .select('*, profiles(username, display_name, avatar), quests(*)')
      .in('quest_id', ids)
      .order('created_at', { ascending: false })
    setReviews(localize(r || []))
  }, [partner?.id, partner?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadShared() }, [loadShared])

  if (error) return <div className="page"><div className="card error">{tr('Cổng đối tác chưa được bật. Hãy chạy file ')}<code>supabase/004_partners.sql</code>.</div></div>
  if (partner === undefined) return <div className="page"><div className="spinner" /></div>

  if (!partner) {
    return (
      <div className="page">
        <button className="ghost back mobile-only" onClick={() => navigate(-1)}>{tr('← Quay lại')}</button>
        <section className="partner-hero">
          <div className="eyebrow light">{tr('Dành cho doanh nghiệp')}</div>
          <h1>{tr('Trở thành đối tác HANOI GO!')}</h1>
          <p>{tr('Đưa địa điểm của bạn vào hành trình khám phá Hà Nội: tạo nhiệm vụ thu hút khách, phát hành ưu đãi và lắng nghe phản hồi.')}</p>
          <ul className="benefits">
            <li><Emoji e="🎯" play="static" />{tr(' Tạo nhiệm vụ check-in, chụp ảnh tại địa điểm')}</li>
            <li><Emoji e="🎟️" play="static" />{tr(' Phát hành voucher đổi bằng Hanoi Coins')}</li>
            <li><Emoji e="📊" play="static" />{tr(' Theo dõi lượt khách, đánh giá chất lượng dịch vụ')}</li>
          </ul>
        </section>
        <section className="card">
          <h3 style={{ marginBottom: 12 }}><Emoji e="📝" play="static" />{tr(' Đăng ký đối tác')}</h3>
          <PartnerProfileForm onSaved={reload} />
        </section>
      </div>
    )
  }

  if (partner.status !== 'approved') {
    return (
      <div className="page">
        <button className="ghost back mobile-only" onClick={() => navigate(-1)}>{tr('← Quay lại')}</button>
        <section className="card center">
          <div className="empty-emoji"><Emoji e={partner.status === 'pending' ? '⏳' : '❌'} play="loop" /></div>
          <h2>{emojify(partner.emoji)} {partner.name}</h2>
          <p>{partner.status === 'pending'
            ? tr('Hồ sơ đối tác đang chờ quản trị viên duyệt. Bạn sẽ dùng được cổng đối tác ngay khi được duyệt.')
            : tr('Hồ sơ đối tác chưa được duyệt. Hãy cập nhật thông tin và liên hệ quản trị viên.')}</p>
          {partner.admin_note && <div className="admin-note"><Emoji e="🛡️" play="static" /> <b>{tr('Ghi chú từ quản trị viên:')}</b> {partner.admin_note}</div>}
          <div className="row">
            <button className="btn" onClick={() => setEditOpen(true)}><Emoji e="✏️" play="static" />{tr(' Sửa hồ sơ')}</button>
            <button className="btn primary" onClick={reload}>{tr('↻ Kiểm tra lại')}</button>
          </div>
        </section>
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title={tr('Hồ sơ đối tác')}>
          <PartnerProfileForm partner={partner} onSaved={() => { setEditOpen(false); reload() }} />
        </Modal>
      </div>
    )
  }

  const unhandled = reviews.filter((r) => !r.handled).length

  return (
    <div className="page">
      <button className="ghost back mobile-only" onClick={() => navigate(-1)}>{tr('← Quay lại')}</button>
      <section className="partner-hero compact">
        <div className="partner-head">
          <span className="partner-emoji"><Emoji e={partner.emoji} play="loop" /></span>
          <div>
            <div className="eyebrow light">{tr('Cổng quản lý đối tác · ')}{emojify(CATEGORIES[partner.category]?.label)}</div>
            <h1>{partner.name}</h1>
            {partner.address && <p><Emoji e="📍" play="static" /> {partner.address}</p>}
          </div>
        </div>
        <button className="ghost small light" onClick={() => setEditOpen(true)}><Emoji e="✏️" play="static" />{tr(' Hồ sơ')}</button>
      </section>

      <div className="tabs-scroll">
        {TABS.map((t) => (
          <button key={t.id} className={`chip${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {emojify(t.label)}{t.id === 'feedback' && unhandled > 0 && <span className="badge static">{unhandled}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview quests={quests} reviews={reviews} goTo={setTab} />}
      {tab === 'quests' && <QuestsTab quests={quests} reload={loadShared} />}
      {tab === 'vouchers' && <VouchersTab />}
      {tab === 'feedback' && <FeedbackTab reviews={reviews} reload={loadShared} />}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={tr('Hồ sơ đối tác')}>
        <PartnerProfileForm partner={partner} onSaved={() => { setEditOpen(false); reload() }} />
      </Modal>
    </div>
  )
}

/* ------------------------------ Tổng quan ------------------------------ */
function Overview({ quests, reviews, goTo }) {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    supabase.rpc('partner_stats').then(({ data }) => setStats(data))
  }, [])
  if (!stats) return <div className="spinner" />

  const s = summarize(reviews)
  const max = Math.max(1, ...stats.daily.map((d) => d.n))
  const week = stats.daily.reduce((a, d) => a + d.n, 0)
  const unhandled = reviews.filter((r) => !r.handled).length
  const weakest = s.count ? CRITERIA.reduce((a, b) => (s.criteria[a.key] <= s.criteria[b.key] ? a : b)) : null
  const useRate = stats.issued ? Math.round((stats.used / stats.issued) * 100) : 0

  const todo = []
  if (!quests.length) todo.push({ level: tr('Bắt đầu'), text: tr('Tạo nhiệm vụ đầu tiên để khách biết đến địa điểm của bạn.'), tab: 'quests', cta: tr('Tạo nhiệm vụ') })
  if (unhandled) todo.push({ level: tr('Ưu tiên cao'), text: tr('{0} phản hồi chưa xử lý. Đọc, phản hồi và cập nhật trạng thái.', unhandled), tab: 'feedback', cta: tr('Mở phản hồi') })
  if (weakest && s.criteria[weakest.key] < 4) todo.push({ level: tr('Nên cải thiện'), text: tr("Tiêu chí \"{0}\" thấp nhất ({1}/5).", weakest.label, fmtScore(s.criteria[weakest.key])), tab: 'feedback', cta: tr('Xem chi tiết') })
  if (quests.length && !stats.issued) todo.push({ level: tr('Cơ hội'), text: tr('Phát hành ưu đãi để chuyển lượt check-in thành khách hàng thật.'), tab: 'vouchers', cta: tr('Tạo ưu đãi') })

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi"><span className="kpi-icon"><Emoji e="🏅" play="once" /></span><strong>{stats.completions}</strong><span>{tr('Lượt hoàn thành nhiệm vụ')}</span></div>
        <div className="kpi"><span className="kpi-icon"><Emoji e="👤" play="once" /></span><strong>{stats.visitors}</strong><span>{tr('Khách tham gia')}</span></div>
        <div className="kpi"><span className="kpi-icon"><Emoji e="🎟️" play="once" /></span><strong>{stats.used}/{stats.issued}</strong><span>{tr('Voucher đã dùng / đã đổi (')}{useRate}%)</span></div>
        <div className="kpi"><span className="kpi-icon"><Emoji e="⭐" play="once" /></span><strong>{fmtScore(s.overall)}</strong><span>{tr('Điểm đánh giá (')}{s.count}{tr(' lượt)')}</span></div>
      </div>

      <div className="dash-grid">
      <section className="card wide">
        <div className="section-head"><h3><Emoji e="📈" play="static" />{tr(' Lượt tham gia 7 ngày qua')}</h3><span className="muted small">{week}{tr(' lượt')}</span></div>
        <div className="bar-chart">
          {stats.daily.map((d) => (
            <div key={d.day} className="bar-col" title={tr('{0} lượt', d.n)}>
              <span className="bar-val">{d.n || ''}</span>
              <div className="bar-fill" style={{ height: `${(d.n / max) * 100}%` }} />
              <span className="bar-label">{new Date(d.day).toLocaleDateString(locale, { weekday: 'short' })}</span>
            </div>
          ))}
        </div>
      </section>

      {s.count > 0 && (
        <section className="card">
          <div className="section-head"><h3><Emoji e="⭐" play="static" />{tr(' Chất lượng dịch vụ')}</h3><span className="muted small"><Emoji e="👍" play="static" /> {s.recommendPct}{tr('% giới thiệu')}</span></div>
          <div className="criteria-bars">
            {CRITERIA.map((c) => (
              <div key={c.key} className={`crit-bar wide${weakest?.key === c.key ? ' weak' : ''}`}>
                <span>{emojify(c.label)}</span>
                <div className="bar"><div style={{ width: `${(s.criteria[c.key] / 5) * 100}%` }} /></div>
                <b>{fmtScore(s.criteria[c.key])}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="section-head"><h3><Emoji e="✅" play="static" />{tr(' Việc cần làm')}</h3></div>
        {todo.length === 0 ? <p className="muted small">{tr('Mọi thứ đều ổn. Tiếp tục duy trì chất lượng nhé! ')}<Emoji e="🎉" play="static" /></p> : todo.map((t) => (
          <div key={t.text} className="todo-row">
            <div><span className="tag">{t.level}</span><p>{emojify(t.text)}</p></div>
            <button className="ghost small" onClick={() => goTo(t.tab)}>{emojify(t.cta)} →</button>
          </div>
        ))}
      </section>
      </div>
    </>
  )
}

/* ------------------------------ Nhiệm vụ ------------------------------ */
const EMPTY_QUEST = { title: '', description: '', kind: 'photo', emoji: '', tip: '', xp: 80, coins: 40, radius: 150, opening_hours: '', ticket_info: '', active: true }

function QuestsTab({ quests, reload }) {
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  const open = (q) => setEditing(q ? {
    id: q.id, title: q.title, description: q.description, kind: q.kind, emoji: q.emoji, tip: q.tip,
    xp: q.xp_reward, coins: q.coin_reward, radius: q.radius_m, opening_hours: q.opening_hours, ticket_info: q.ticket_info, active: q.active,
  } : { ...EMPTY_QUEST })
  const set = (k) => (e) => setEditing({ ...editing, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.rpc('partner_save_quest', {
      p_id: editing.id ?? null, p_title: editing.title, p_description: editing.description, p_kind: editing.kind,
      p_emoji: editing.emoji, p_tip: editing.tip, p_xp: Number(editing.xp), p_coins: Number(editing.coins),
      p_radius: Number(editing.radius), p_opening_hours: editing.opening_hours, p_ticket_info: editing.ticket_info, p_active: editing.active,
    })
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    toast(editing.id ? tr('Đã cập nhật nhiệm vụ') : tr('Đã tạo nhiệm vụ — khách đã có thể thấy trên app! 🎉'), 'success')
    setEditing(null)
    reload()
  }

  return (
    <>
      <button className="btn primary block" onClick={() => open(null)}>{tr('＋ Tạo nhiệm vụ cho khách')}</button>
      {quests.length === 0 ? (
        <div className="card empty">
          <div className="empty-emoji"><Emoji e="🧭" play="loop" /></div>
          <p>{tr('Biến chuyến ghé thăm thành một cuộc khám phá: tạo nhiệm vụ check-in hoặc chụp ảnh tại địa điểm của bạn.')}</p>
        </div>
      ) : (
        <section className="card">
          {quests.map((q) => (
            <button key={q.id} className="quest-row as-button" onClick={() => open(q)}>
              <span className="quest-emoji"><Emoji e={q.emoji} play="once" /></span>
              <span className="quest-main">
                <span className="quest-kind">{emojify(KIND[q.kind].label)} · {emojify(q.active ? tr('🟢 Đang hiển thị') : tr('⚪ Đã ẩn'))}</span>
                <span className="quest-title">{q.title}</span>
                <span className="quest-reward"><Emoji e="⭐" play="static" /> +{q.xp_reward} XP · <Emoji e="🪙" play="static" /> +{q.coin_reward}</span>
              </span>
              <span className="quest-status"><Emoji e="✏️" play="static" /></span>
            </button>
          ))}
        </section>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? tr('Sửa nhiệm vụ') : tr('Tạo nhiệm vụ')}>
        {editing && (
          <form onSubmit={save}>
            <label className="field"><span>{tr('Tên nhiệm vụ')}</span>
              <input value={editing.title} onChange={set('title')} required minLength={3} maxLength={80} placeholder={tr('vd: Check-in góc ban công view phố cổ')} /></label>
            <div className="field"><span>{tr('Loại nhiệm vụ')}</span>
              <div className="seg-mini">
                <button type="button" className={editing.kind === 'photo' ? 'active' : ''} onClick={() => setEditing({ ...editing, kind: 'photo' })}><Emoji e="📸" play="static" />{tr(' Chụp ảnh')}</button>
                <button type="button" className={editing.kind === 'checkin' ? 'active' : ''} onClick={() => setEditing({ ...editing, kind: 'checkin' })}><Emoji e="📍" play="static" /> Check-in GPS</button>
              </div>
            </div>
            <label className="field"><span>{tr('Mô tả nhiệm vụ')}</span>
              <textarea rows={2} value={editing.description} onChange={set('description')} maxLength={400} placeholder={tr('Khách cần làm gì?')} /></label>
            <label className="field"><span>{tr('Mẹo cho khách (tuỳ chọn)')}</span>
              <input value={editing.tip} onChange={set('tip')} maxLength={200} /></label>
            <div className="form-grid">
              <label className="field"><span>{tr('Thưởng XP (≤150)')}</span><input type="number" min={10} max={150} value={editing.xp} onChange={set('xp')} /></label>
              <label className="field"><span>{tr('Thưởng Coins (≤80)')}</span><input type="number" min={5} max={80} value={editing.coins} onChange={set('coins')} /></label>
              <label className="field"><span>{tr('Giờ mở cửa')}</span><input value={editing.opening_hours} onChange={set('opening_hours')} maxLength={80} placeholder="7:00 – 22:00" /></label>
              <label className="field"><span>{tr('Giá / vé')}</span><input value={editing.ticket_info} onChange={set('ticket_info')} maxLength={120} placeholder={tr('Đồ uống từ 35.000đ')} /></label>
            </div>
            {editing.kind === 'checkin' && (
              <label className="field"><span>{tr('Bán kính check-in (m)')}</span><input type="number" min={50} max={500} value={editing.radius} onChange={set('radius')} /></label>
            )}
            <label className="switch-row">
              <input type="checkbox" checked={editing.active} onChange={set('active')} />
              <span>{tr('Hiển thị nhiệm vụ cho khách')}</span>
            </label>
            <button className="btn primary block" disabled={busy}>{busy ? tr('Đang lưu…') : tr('Lưu nhiệm vụ')}</button>
          </form>
        )}
      </Modal>
    </>
  )
}

/* ------------------------------ Ưu đãi ------------------------------ */
const EMPTY_VOUCHER = { title: '', description: '', cost: 150, stock: '', valid_until: '', active: true }

function VouchersTab() {
  const toast = useToast()
  const [vouchers, setVouchers] = useState(null)
  const [codes, setCodes] = useState([])
  const [editing, setEditing] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(null)

  const load = useCallback(async () => {
    const pid = (await supabase.rpc('my_partner_id')).data
    const { data: v } = await supabase.from('vouchers').select('*').eq('partner_id', pid).order('created_at', { ascending: false })
    setVouchers(v || [])
    const ids = (v || []).map((x) => x.id)
    if (ids.length) {
      const { data: c } = await supabase.from('voucher_codes').select('voucher_id, status').in('voucher_id', ids)
      setCodes(c || [])
    }
  }, [])
  useEffect(() => { load() }, [load])

  const set = (k) => (e) => setEditing({ ...editing, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const open = (v) => setEditing(v ? {
    id: v.id, title: v.title, description: v.description, cost: v.cost_coins, stock: v.stock ?? '', valid_until: v.valid_until ?? '', active: v.active,
  } : { ...EMPTY_VOUCHER })

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.rpc('partner_save_voucher', {
      p_id: editing.id ?? null, p_title: editing.title, p_description: editing.description, p_cost: Number(editing.cost),
      p_stock: editing.stock === '' ? null : Number(editing.stock), p_valid_until: editing.valid_until || null, p_active: editing.active,
    })
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    toast(tr('Đã lưu ưu đãi'), 'success')
    setEditing(null)
    load()
  }

  const verify = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { data, error } = await supabase.rpc('use_voucher_code', { p_code: code })
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    setVerified(data)
    setCode('')
    load()
  }

  if (!vouchers) return <div className="spinner" />
  const countOf = (id, status) => codes.filter((c) => c.voucher_id === id && (!status || c.status === status)).length

  return (
    <>
      <section className="card verify-card">
        <h3><Emoji e="✅" play="static" />{tr(' Xác nhận voucher của khách')}</h3>
        <p className="muted small">{tr('Nhập mã 8 ký tự trên màn hình của khách để xác nhận sử dụng.')}</p>
        <form onSubmit={verify} className="pw-row">
          <input className="code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} placeholder="VD: A1B2C3D4" required />
          <button className="btn primary" disabled={busy || code.length < 8}>{tr('Xác nhận')}</button>
        </form>
      </section>

      <button className="btn primary block" onClick={() => open(null)}>{tr('＋ Tạo ưu đãi mới')}</button>

      {vouchers.length === 0 ? (
        <div className="card empty">
          <div className="empty-emoji"><Emoji e="🎟️" play="loop" /></div>
          <p>{tr('Ưu đãi giúp chuyển khách khám phá thành khách hàng: giảm giá đồ uống, quà tặng, vé tham quan…')}</p>
        </div>
      ) : <div className="voucher-list">{vouchers.map((v) => (
        <button key={v.id} className="voucher-card as-button" onClick={() => open(v)}>
          <div className="voucher-left"><Emoji e="🎟️" play="once" /></div>
          <div className="voucher-body">
            <strong>{v.title}</strong>
            <span className="muted small"><Emoji e="🪙" play="static" /> {v.cost_coins} coins · {v.stock == null ? tr('Không giới hạn') : tr('Còn {0} lượt', v.stock)}{v.valid_until && ` · ${tr('HSD {0}', fmtDateVN(v.valid_until))}`}</span>
            <span className="small">{tr('Đã đổi ')}{countOf(v.id)}{tr(' · Đã dùng ')}{countOf(v.id, 'used')} · {emojify(v.active ? tr('🟢 Đang mở') : tr('⚪ Đã tắt'))}</span>
          </div>
        </button>
      ))}</div>}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? tr('Sửa ưu đãi') : tr('Tạo ưu đãi')}>
        {editing && (
          <form onSubmit={save}>
            <label className="field"><span>{tr('Tên ưu đãi')}</span>
              <input value={editing.title} onChange={set('title')} required minLength={3} maxLength={80} placeholder={tr('vd: Giảm 20% đồ uống')} /></label>
            <label className="field"><span>{tr('Điều kiện sử dụng')}</span>
              <textarea rows={2} value={editing.description} onChange={set('description')} maxLength={300} placeholder={tr('Áp dụng cho hoá đơn từ 50.000đ, không cộng dồn…')} /></label>
            <div className="form-grid">
              <label className="field"><span>{tr('Giá đổi (coins)')}</span><input type="number" min={10} max={5000} value={editing.cost} onChange={set('cost')} required /></label>
              <label className="field"><span>{tr('Số lượng (trống = ∞)')}</span><input type="number" min={0} value={editing.stock} onChange={set('stock')} /></label>
            </div>
            <label className="field"><span>{tr('Hạn sử dụng (tuỳ chọn)')}</span><input type="date" value={editing.valid_until} onChange={set('valid_until')} /></label>
            <label className="switch-row">
              <input type="checkbox" checked={editing.active} onChange={set('active')} />
              <span>{tr('Mở cho khách đổi')}</span>
            </label>
            <button className="btn primary block" disabled={busy}>{busy ? tr('Đang lưu…') : tr('Lưu ưu đãi')}</button>
          </form>
        )}
      </Modal>

      <Modal open={!!verified} onClose={() => setVerified(null)}>
        <div className="celebrate">
          <div className="celebrate-emoji"><Emoji e="✅" play="loop" /></div>
          <h2>{tr('Mã hợp lệ!')}</h2>
          <p><b>{verified?.voucher}</b></p>
          <p className="muted">{tr('Khách hàng: ')}{verified?.customer}</p>
          <button className="btn primary" onClick={() => setVerified(null)}>Xong</button>
        </div>
      </Modal>
    </>
  )
}

/* ------------------------------ Phản hồi ------------------------------ */
function FeedbackTab({ reviews, reload }) {
  const [filter, setFilter] = useState('open')
  const list = reviews.filter((r) => (filter === 'all' ? true : filter === 'open' ? !r.handled : r.handled))
  const s = summarize(reviews)

  return (
    <>
      <div className="kpi-grid three">
        <div className="kpi"><strong>{fmtScore(s.overall)} ★</strong><span>{tr('Điểm trung bình')}</span></div>
        <div className="kpi"><strong>{reviews.length}</strong><span>{tr('Tổng phản hồi')}</span></div>
        <div className="kpi"><strong>{reviews.filter((r) => !r.handled).length}</strong><span>{tr('Chưa xử lý')}</span></div>
      </div>
      <div className="chips">
        <button className={`chip${filter === 'open' ? ' active' : ''}`} onClick={() => setFilter('open')}>{tr('Chưa xử lý')}</button>
        <button className={`chip${filter === 'done' ? ' active' : ''}`} onClick={() => setFilter('done')}>{tr('Đã xử lý')}</button>
        <button className={`chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>{tr('Tất cả')}</button>
      </div>
      {list.length === 0 ? <p className="muted small center">{tr('Không có phản hồi nào ở mục này.')}</p> : (
        <div className="feedback-list">{list.map((r) => <FeedbackCard key={r.id} review={r} onSaved={reload} />)}</div>
      )}
    </>
  )
}

function FeedbackCard({ review, onSaved }) {
  const toast = useToast()
  const [reply, setReply] = useState(review.partner_reply || '')
  const [busy, setBusy] = useState(false)
  const weak = CRITERIA.filter((c) => review[c.key] <= 3)

  const save = async (handled) => {
    setBusy(true)
    const { error } = await supabase.rpc('partner_reply_review', { p_review_id: review.id, p_reply: reply.trim(), p_handled: handled })
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    toast(handled ? tr('Đã phản hồi & đánh dấu đã xử lý') : tr('Đã chuyển về chưa xử lý'), 'success')
    onSaved()
  }

  return (
    <section className={`card feedback-card${review.handled ? ' handled' : ''}`}>
      <div className="review-head">
        <span className="rank-avatar"><Emoji e={review.profiles?.avatar} play="hover" /></span>
        <strong>{review.profiles?.display_name || review.profiles?.username}</strong>
        <Stars value={review.overall} size="0.85rem" />
        <span className={`tag${review.handled ? ' ok' : ''}`} style={{ marginLeft: 'auto' }}>{review.handled ? tr('Đã xử lý') : tr('Chưa xử lý')}</span>
      </div>
      <span className="muted small">{emojify(review.quests?.emoji)} {review.quests?.title} · {fmtDateVN(review.created_at)} · {emojify(review.recommend ? tr('👍 Sẽ giới thiệu') : tr('👎 Không giới thiệu'))}</span>
      {review.comment && <p className="feedback-comment">“{review.comment}”</p>}
      {weak.length > 0 && <p className="small weak-note"><Emoji e="⚠️" play="static" />{tr(' Điểm thấp: ')}{weak.map((c) => `${c.label} (${review[c.key]})`).join(', ')}</p>}
      <textarea className="reply-box" rows={2} maxLength={500} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={tr('Phản hồi công khai tới khách (tuỳ chọn)…')} />
      <div className="row tight">
        {review.handled ? (
          <>
            <button className="btn small" disabled={busy} onClick={() => save(true)}>{tr('Cập nhật phản hồi')}</button>
            <button className="ghost small" disabled={busy} onClick={() => save(false)}>{tr('Chuyển về chưa xử lý')}</button>
          </>
        ) : (
          <button className="btn primary small" disabled={busy} onClick={() => save(true)}>{tr('✓ Phản hồi & đánh dấu đã xử lý')}</button>
        )}
      </div>
    </section>
  )
}
