import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fmtDateVN } from '../lib/partner'
import { todayVN } from '../lib/game'
import Modal from './Modal'
import Emoji, { emojify } from './Emoji'
import { tr } from '../lib/i18n'

// Đổi Hanoi Coins lấy voucher của đối tác + ví voucher của tôi
export default function VoucherShop() {
  const { user, profile, setProfile } = useAuth()
  const toast = useToast()
  const [vouchers, setVouchers] = useState(null)
  const [mine, setMine] = useState([])
  const [confirm, setConfirm] = useState(null)
  const [showing, setShowing] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const today = todayVN()
    const [v, m] = await Promise.all([
      supabase
        .from('vouchers')
        .select('*, partners(name, emoji, address)')
        .eq('active', true)
        .or(`valid_until.is.null,valid_until.gte.${today}`)
        .order('cost_coins'),
      supabase.from('voucher_codes').select('*, vouchers(title, description, valid_until, partners(name, emoji, address))')
        .eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    setVouchers(v.error ? [] : (v.data || []).filter((x) => !x.valid_until || x.valid_until >= today))
    setMine(m.data || [])
  }, [user.id])
  useEffect(() => { load() }, [load])

  const redeem = async () => {
    setBusy(true)
    const { data, error } = await supabase.rpc('redeem_voucher', { p_voucher_id: confirm.id })
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    setProfile({ ...profile, coins: data.coins })
    setConfirm(null)
    await load()
    toast(tr('Đổi ưu đãi thành công! 🎉'), 'success')
  }

  if (!vouchers) return <div className="spinner" />
  const unused = mine.filter((c) => c.status === 'issued')
  const used = mine.filter((c) => c.status === 'used')

  return (
    <>
      {unused.length > 0 && (
        <section className="card">
          <div className="section-head"><h3><Emoji e="👛" play="static" />{tr(' Ví voucher của tôi')}</h3><span className="muted small">{unused.length}{tr(' mã chưa dùng')}</span></div>
          {unused.map((c) => (
            <button key={c.id} className="voucher-card as-button mine" onClick={() => setShowing(c)}>
              <div className="voucher-left"><Emoji e={c.vouchers?.partners?.emoji} play="once" /></div>
              <div className="voucher-body">
                <strong>{c.vouchers?.title}</strong>
                <span className="muted small">{c.vouchers?.partners?.name}</span>
                <span className="small code-chip">{tr('Mã: ')}{c.code}{tr(' · Chạm để xem QR')}</span>
              </div>
            </button>
          ))}
        </section>
      )}

      <section className="card">
        <div className="section-head"><h3><Emoji e="🎁" play="static" />{tr(' Đổi quà từ đối tác')}</h3><span className="muted small"><Emoji e="🪙" play="static" /> {profile?.coins ?? 0}</span></div>
        {vouchers.length === 0 ? (
          <p className="muted small">{tr('Chưa có ưu đãi nào. Các quán, điểm tham quan đối tác sẽ sớm phát hành ưu đãi!')}</p>
        ) : vouchers.map((v) => {
          const soldOut = v.stock != null && v.stock <= 0
          const enough = (profile?.coins ?? 0) >= v.cost_coins
          return (
            <div key={v.id} className="voucher-card">
              <div className="voucher-left"><Emoji e={v.partners?.emoji} play="once" /></div>
              <div className="voucher-body">
                <strong>{v.title}</strong>
                <span className="muted small">{v.partners?.name}{v.partners?.address && ` · ${v.partners.address}`}</span>
                {v.description && <span className="small">{v.description}</span>}
                <span className="muted small">{v.stock == null ? '' : tr('Còn {0} lượt · ', v.stock)}{v.valid_until ? tr('HSD {0}', fmtDateVN(v.valid_until)) : ''}</span>
              </div>
              <button className="btn gold small" disabled={soldOut || !enough} onClick={() => setConfirm(v)}>
                {emojify(soldOut ? tr('Hết') : `🪙 ${v.cost_coins}`)}
              </button>
            </div>
          )
        })}
      </section>

      {used.length > 0 && (
        <section className="card">
          <div className="section-head"><h3><Emoji e="🧾" play="static" />{tr(' Đã sử dụng')}</h3></div>
          {used.map((c) => (
            <div key={c.id} className="voucher-card used">
              <div className="voucher-left"><Emoji e="✓" play="once" /></div>
              <div className="voucher-body">
                <strong>{c.vouchers?.title}</strong>
                <span className="muted small">{c.vouchers?.partners?.name}{tr(' · dùng ngày ')}{fmtDateVN(c.used_at)}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={tr('Xác nhận đổi ưu đãi')}>
        {confirm && (
          <>
            <p><b>{confirm.title}</b>{tr(' tại ')}{confirm.partners?.name}</p>
            <p className="muted small">{tr('Bạn sẽ dùng ')}<b><Emoji e="🪙" play="static" /> {confirm.cost_coins}</b>{tr(' Hanoi Coins (còn lại ')}{(profile?.coins ?? 0) - confirm.cost_coins}).</p>
            <button className="btn primary block" disabled={busy} onClick={redeem}>{busy ? tr('Đang đổi…') : tr('Đổi ngay')}</button>
          </>
        )}
      </Modal>

      <Modal open={!!showing} onClose={() => setShowing(null)}>
        {showing && <VoucherQR code={showing} />}
      </Modal>
    </>
  )
}

function VoucherQR({ code }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    QRCode.toDataURL(code.code, { width: 240, margin: 1, color: { dark: '#3a2a24', light: '#ffffff' } }).then(setSrc)
  }, [code.code])
  return (
    <div className="celebrate">
      <div className="eyebrow">{emojify(code.vouchers?.partners?.emoji)} {code.vouchers?.partners?.name}</div>
      <h2>{code.vouchers?.title}</h2>
      {src && <img className="qr" src={src} alt={tr('Mã QR {0}', code.code)} />}
      <div className="big-code">{code.code}</div>
      <p className="muted small">{tr('Đưa mã này cho nhân viên để xác nhận ưu đãi.')}</p>
      {code.vouchers?.description && <p className="small">{code.vouchers.description}</p>}
    </div>
  )
}
