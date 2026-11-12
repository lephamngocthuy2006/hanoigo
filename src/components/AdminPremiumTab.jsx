import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { supabase, friendlyError } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { fmtVnd, useAppSettings } from '../lib/premium'
import { BANKS, findBank, vietQrPayload } from '../lib/vietqr'
import { signedUrls } from '../lib/photos'
import Emoji from './Emoji'
import { tr, locale } from '../lib/i18n'

/** Công tắc bật/tắt (checkbox vẽ lại) */
export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <label className={`toggle${disabled ? ' disabled' : ''}`}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  )
}

// Ảnh bill thu nhỏ, bấm để mở to ở tab mới
function BillThumb({ url }) {
  if (!url) return null
  return (
    <a className="bill-thumb" href={url} target="_blank" rel="noreferrer" title={tr('Xem ảnh bill')}>
      <img src={url} alt={tr('Ảnh bill')} loading="lazy" />
    </a>
  )
}

const fmtTime = (s) => new Date(s).toLocaleString(locale, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })

/**
 * Trang quản trị → 👑 Premium (chỉ quản trị viên tối cao):
 * bật/tắt yêu cầu Premium, giá, thông tin nhận chuyển khoản; duyệt yêu cầu; bật/tắt Premium từng người.
 */
export default function AdminPremiumTab() {
  const toast = useToast()
  const confirm = useConfirm()
  const { settings, reload } = useAppSettings()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [requests, setRequests] = useState(null)
  const [members, setMembers] = useState(null)
  const [approved, setApproved] = useState([]) // yêu cầu đã duyệt (tự động / tay) — để đối soát
  const [bills, setBills] = useState({}) // bill_path -> signed url
  const [busyId, setBusyId] = useState(null)

  useEffect(() => { if (settings && !form) setForm({ ...settings }) }, [settings, form])

  // Xem trước mã VietQR người dùng sẽ thấy (nội dung mẫu)
  const [qrPreview, setQrPreview] = useState(null)
  const previewPayload = form && vietQrPayload({ bankName: form.bank_name, account: form.bank_account, amount: form.premium_price, note: 'HANOIGO TEN DANG NHAP' })
  useEffect(() => {
    if (!previewPayload) return setQrPreview(null)
    QRCode.toDataURL(previewPayload, { width: 360, margin: 1 }).then(setQrPreview)
  }, [previewPayload])

  const loadLists = useCallback(async () => {
    const cols = 'id, user_id, amount, note, status, created_at, decided_at, bill_path, auto, profiles!premium_requests_user_id_fkey(username, display_name, avatar, is_premium)'
    const [r, m, a] = await Promise.all([
      supabase.from('premium_requests').select(cols).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, username, display_name, avatar, premium_since')
        .eq('is_premium', true).order('premium_since', { ascending: false }),
      supabase.from('premium_requests').select(cols).eq('status', 'approved').order('decided_at', { ascending: false }).limit(500),
    ])
    if (r.error) toast(friendlyError(r.error), 'error')
    setRequests(r.data || [])
    setMembers(m.data || [])
    setApproved(a.data || [])
    setBills(await signedUrls([...(r.data || []), ...(a.data || [])].map((x) => x.bill_path).filter(Boolean)))
  }, [toast])
  useEffect(() => { loadLists() }, [loadLists])

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async (next = form) => {
    setSaving(true)
    const { error } = await supabase.rpc('admin_update_settings', {
      p_premium_enabled: next.premium_enabled,
      p_premium_price: Number(next.premium_price) || 0,
      p_bank_name: next.bank_name,
      p_bank_account: next.bank_account,
      p_bank_holder: next.bank_holder,
    })
    setSaving(false)
    if (error) return toast(friendlyError(error), 'error')
    const fresh = await reload()
    setForm({ ...fresh })
    return true
  }

  // Gạt công tắc chung: lưu ngay
  const toggleEnabled = async (on) => {
    if (on && !(form.bank_account && form.bank_holder)) {
      return toast(tr('Hãy điền số tài khoản và tên chủ tài khoản trước khi bật'), 'error')
    }
    if (await save({ ...form, premium_enabled: on })) {
      toast(on ? tr('Đã bật: Sổ hành trình cần gói Premium') : tr('Đã tắt: ai cũng xem được Sổ hành trình'), 'success')
    }
  }

  const setPremium = async (userId, on, name) => {
    if (!on && !(await confirm(tr('Tắt gói Premium của {0}?', name), { ok: tr('Tắt Premium'), danger: true }))) return
    setBusyId(userId)
    const { error } = await supabase.rpc('admin_set_premium', { p_user_id: userId, p_on: on })
    setBusyId(null)
    if (error) return toast(friendlyError(error), 'error')
    toast(on ? tr('Đã mở Premium cho {0} 👑', name) : tr('Đã tắt Premium của {0}', name), 'success')
    loadLists()
  }

  if (!form) return <div className="spinner" />
  const dirty = ['premium_price', 'bank_name', 'bank_account', 'bank_holder'].some((k) => String(form[k] ?? '') !== String(settings?.[k] ?? ''))

  return (
    <>
      <section className="card premium-settings">
        <div className="premium-switch-row">
          <div>
            <strong><Emoji e="👑" play="static" />{tr(' Yêu cầu gói Premium cho Sổ hành trình')}</strong>
            <p className="muted small">
              {form.premium_enabled
                ? tr('Đang BẬT — người chưa mua sẽ thấy trang mời mua thay cho Sổ hành trình.')
                : tr('Đang TẮT — ai cũng xem được Sổ hành trình như bình thường.')}
            </p>
          </div>
          <Toggle checked={form.premium_enabled} disabled={saving} onChange={toggleEnabled} />
        </div>

        <form className="premium-form" onSubmit={async (e) => { e.preventDefault(); if (await save()) toast(tr('Đã lưu thông tin thanh toán'), 'success') }}>
          <label className="field"><span>{tr('Giá gói (VNĐ)')}</span>
            <input type="number" min={0} step={1000} value={form.premium_price ?? ''} onChange={(e) => set('premium_price')(e.target.value)} required />
            <small className="muted">{tr('Hiển thị: ')}{fmtVnd(form.premium_price)}</small>
          </label>
          <label className="field"><span>{tr('Ngân hàng')}</span>
            <input value={form.bank_name} onChange={(e) => set('bank_name')(e.target.value)} list="vietqr-banks"
              placeholder={tr('Chọn trong danh sách, vd: Vietcombank, MB Bank…')} maxLength={80} />
            <datalist id="vietqr-banks">{BANKS.map((b) => <option key={b.bin} value={b.name} />)}</datalist>
            <small className={findBank(form.bank_name) ? 'qr-ok-text' : 'muted'}>
              {findBank(form.bank_name)
                ? tr('✅ {0} — tạo được mã QR', findBank(form.bank_name).name)
                : tr('Chọn ngân hàng trong danh sách để có mã QR (ví điện tử như Momo chưa hỗ trợ VietQR)')}
            </small>
          </label>
          <label className="field"><span>{tr('Số tài khoản')}</span>
            <input value={form.bank_account} onChange={(e) => set('bank_account')(e.target.value)} inputMode="numeric" placeholder="0123456789" maxLength={40} />
          </label>
          <label className="field"><span>{tr('Tên chủ tài khoản')}</span>
            <input value={form.bank_holder} onChange={(e) => set('bank_holder')(e.target.value)} placeholder="NGUYEN VAN A" maxLength={80} autoCapitalize="characters" />
          </label>
          {qrPreview && (
            <div className="qr-preview-admin">
              <img src={qrPreview} alt={tr('Xem trước mã QR')} />
              <span className="muted small">{tr('Xem trước mã QR người dùng sẽ quét (nội dung thật sẽ là tên đăng nhập của họ). Hãy thử quét bằng app ngân hàng của bạn — không cần chuyển tiền.')}</span>
            </div>
          )}
          <button className="btn primary" disabled={saving || !dirty}>{saving ? tr('Đang lưu…') : tr('Lưu thông tin thanh toán')}</button>
        </form>
      </section>

      <section className="card">
        <div className="section-head">
          <h3><Emoji e="⏳" play="static" />{tr(' Chờ xác nhận chuyển khoản')}</h3>
          <span className="muted small">{requests?.length ?? '…'}</span>
        </div>
        {!requests ? <div className="spinner" /> : requests.length === 0 ? (
          <p className="muted small">{tr('Chưa có ai báo chuyển khoản. Hãy kiểm tra tài khoản ngân hàng khi có thông báo nhé.')}</p>
        ) : requests.map((r) => {
          const p = r.profiles || {}
          const name = p.display_name || p.username
          return (
            <div key={r.id} className="premium-req">
              <span className="rank-avatar"><Emoji e={p.avatar || '🐢'} play="static" /></span>
              <div className="premium-req-body">
                <strong>{name}</strong>
                <span className="muted small">@{p.username} · {fmtTime(r.created_at)} · {fmtVnd(r.amount)}</span>
                {r.note && <span className="small mono">{r.note}</span>}
              </div>
              <BillThumb url={bills[r.bill_path]} />
              <div className="premium-req-actions">
                <button className="btn small primary" disabled={busyId === r.user_id} onClick={() => setPremium(r.user_id, true, name)}>{tr('Mở Premium')}</button>
                <button className="btn small" disabled={busyId === r.user_id} onClick={() => setPremium(r.user_id, false, name)}>{tr('Từ chối')}</button>
              </div>
            </div>
          )
        })}
      </section>

      {(() => {
        const autoN = approved.filter((x) => x.auto).length
        const manualN = approved.length - autoN
        const expected = approved.reduce((s, x) => s + (x.amount || 0), 0)
        return (
          <section className="card reconcile">
            <h3><Emoji e="🧾" play="static" />{tr(' Đối soát')}</h3>
            <div className="kpi-grid">
              <div className="kpi"><strong>{members?.length ?? '…'}</strong><span>{tr('Đang có Premium')}</span></div>
              <div className="kpi"><strong>{autoN}</strong><span>{tr('Mở tự động bằng bill')}</span></div>
              <div className="kpi"><strong>{manualN}</strong><span>{tr('Duyệt tay')}</span></div>
              <div className="kpi"><strong>{fmtVnd(expected)}</strong><span>{tr('Tổng tiền lẽ ra đã nhận')}</span></div>
            </div>
            <p className="muted small">{tr('So con số này với tổng tiền thực nhận trong sao kê ngân hàng. Nếu thiếu, soi ảnh bill ở danh sách bên dưới rồi gạt tắt Premium (và xoá tài khoản ở tab Người dùng nếu cần).')}</p>
          </section>
        )
      })()}

      <section className="card">
        <div className="section-head">
          <h3><Emoji e="👑" play="static" />{tr(' Thành viên Premium')}</h3>
          <span className="muted small">{members?.length ?? '…'}</span>
        </div>
        {!members ? <div className="spinner" /> : members.length === 0 ? (
          <p className="muted small">{tr('Chưa có ai. Bạn cũng có thể mở Premium cho từng người ở tab Người dùng.')}</p>
        ) : members.map((m) => {
          const req = approved.find((x) => x.user_id === m.id) // lần mở gần nhất
          return (
            <div key={m.id} className="premium-req">
              <span className="rank-avatar"><Emoji e={m.avatar || '🐢'} play="static" /></span>
              <div className="premium-req-body">
                <strong>
                  {m.display_name || m.username}{' '}
                  <span className={`tag ${req?.auto ? 'new' : 'ok'}`}>{req ? (req.auto ? tr('Tự động') : tr('Duyệt tay')) : tr('Mở tay, không bill')}</span>
                </strong>
                <span className="muted small">@{m.username}{m.premium_since && tr(' · từ {0}', fmtTime(m.premium_since))}{req && ` · ${fmtVnd(req.amount)}`}</span>
                {req?.note && <span className="small mono">{req.note}</span>}
              </div>
              <BillThumb url={bills[req?.bill_path]} />
              <Toggle checked disabled={busyId === m.id} onChange={() => setPremium(m.id, false, m.display_name || m.username)} />
            </div>
          )
        })}
      </section>
    </>
  )
}
