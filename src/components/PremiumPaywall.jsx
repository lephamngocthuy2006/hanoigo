import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fmtVnd, transferNote } from '../lib/premium'
import { findBank, vietQrPayload } from '../lib/vietqr'
import { uploadBill } from '../lib/photos'
import { scanBill } from '../lib/billScan'
import Emoji from './Emoji'
import { tr } from '../lib/i18n'

// Một dòng thông tin chuyển khoản, bấm để sao chép (copy: giá trị chép ra nếu khác chữ hiển thị)
function CopyRow({ label, value, copy: copyValue = value, mono }) {
  const toast = useToast()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(copyValue))
      toast(tr('Đã sao chép {0}', label.toLowerCase()), 'success')
    } catch {
      toast(tr('Không sao chép được, hãy chép tay nhé'), 'error')
    }
  }
  return (
    <button type="button" className="pay-row" onClick={copy}>
      <span className="muted small">{label}</span>
      <strong className={mono ? 'mono' : ''}>{value}</strong>
      <span className="pay-copy">{tr('Sao chép')}</span>
    </button>
  )
}

/**
 * Trang mời mua gói Premium (hiện thay cho Sổ hành trình khi đang bật yêu cầu Premium).
 * friendName: đang xem Sổ của bạn bè thì ghi tên người đó.
 */
export default function PremiumPaywall({ settings, friendName }) {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()
  const [pending, setPending] = useState(null) // null: đang kiểm tra, false: chưa báo, object: đang chờ
  const [step, setStep] = useState(null) // null | 'upload' | số % đang đọc bill | 'save'
  const billRef = useRef(null)

  useEffect(() => {
    supabase.from('premium_requests').select('id, created_at').eq('user_id', user.id).eq('status', 'pending').maybeSingle()
      .then(({ data }) => setPending(data || false))
  }, [user.id])

  const hasBank = settings?.bank_account && settings?.bank_holder
  const note = transferNote(profile?.username)
  const price = settings?.premium_price ?? 13000

  // Mã VietQR: quét bằng app ngân hàng là điền sẵn tài khoản, số tiền, nội dung
  const [qr, setQr] = useState(null)
  const payload = hasBank ? vietQrPayload({ bankName: settings.bank_name, account: settings.bank_account, amount: price, note }) : null
  useEffect(() => {
    if (!payload) return setQr(null)
    QRCode.toDataURL(payload, { width: 520, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1f1815', light: '#ffffff' } }).then(setQr)
  }, [payload])

  // Tải bill lên → đọc chữ trên bill ngay trên máy → đúng số tiền + nội dung thì mở Premium luôn
  const onBill = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast(tr('Vui lòng chọn ảnh chụp bill'), 'error')
    try {
      setStep('upload')
      const [path, check] = await Promise.all([
        uploadBill(user.id, file),
        scanBill(file, { amount: price, note, onProgress: (p) => setStep(p) }).catch(() => ({ ok: false, summary: 'Bill: không đọc được ảnh' })),
      ])
      setStep('save')
      const { data, error } = await supabase.rpc('submit_premium_bill', { p_bill_path: path, p_auto: check.ok, p_ocr: check.summary })
      if (error) throw error
      if (data.granted) {
        toast(tr('Đã kiểm tra bill — gói Premium đã mở! 👑'), 'success')
        await refreshProfile() // trang tự mở khoá Sổ hành trình
      } else {
        setPending({ id: data.id, created_at: new Date().toISOString() })
        toast(tr('Chưa đọc rõ số tiền hoặc nội dung trên bill — đã gửi cho quản trị viên kiểm tra nhé.'), 'info')
      }
    } catch (err) {
      toast(friendlyError(err), 'error')
    } finally {
      setStep(null)
    }
  }

  return (
    <div className="paywall">
      <section className="paywall-hero">
        <div className="paywall-crown"><Emoji e="👑" play="loop" /></div>
        <div className="eyebrow light">HANOI GO! Premium</div>
        <h1>{friendName ? tr('Mở Sổ hành trình của {0}', friendName) : tr('Sổ hành trình Premium')}</h1>
        <p>{tr('Lưu giữ và xem lại mọi khoảnh khắc Hà Nội của bạn — chỉ với một lần thanh toán.')}</p>
        <div className="paywall-price">{fmtVnd(settings?.premium_price ?? 13000)}<span>{tr(' · thanh toán một lần')}</span></div>
      </section>

      <section className="card paywall-perks">
        {[
          ['📖', tr('Xem lại toàn bộ kỷ niệm và ảnh từ các nhiệm vụ đã làm')],
          ['👥', tr('Xem Sổ hành trình của bạn bè, thả cảm xúc và bình luận')],
          ['✍️', tr('Thêm kỷ niệm riêng, chỉnh sửa và đặt chế độ riêng tư')],
          ['💛', tr('Ủng hộ nhóm sinh viên phát triển HANOI GO!')],
        ].map(([e, t]) => (
          <div key={t} className="perk"><Emoji e={e} play="static" /><span>{t}</span></div>
        ))}
        <p className="muted small">{tr('Ảnh chụp ở Photo Quest vẫn được lưu bình thường — mở Premium là xem lại được ngay.')}</p>
      </section>

      <section className="card paywall-pay">
        <h3><Emoji e="🏦" play="static" />{tr(' Chuyển khoản để mua gói')}</h3>
        {hasBank ? (
          <>
            {qr && (
              <div className="vietqr">
                <div className="vietqr-frame">
                  <img src={qr} alt={tr('Mã VietQR chuyển khoản {0}', fmtVnd(price))} />
                  <span className="vietqr-badge">VietQR · NAPAS 247</span>
                </div>
                <p className="small"><strong>{tr('Mở app ngân hàng → Quét mã QR')}</strong><br />
                  <span className="muted">{tr('Số tiền {0} và nội dung chuyển khoản đã được điền sẵn.', fmtVnd(price))}</span></p>
                <a className="btn small" href={qr} download={`hanoigo-premium-${profile?.username || 'qr'}.png`}><Emoji e="⬇️" play="static" />{tr(' Lưu ảnh QR')}</a>
              </div>
            )}
            {qr && <div className="pay-or"><span>{tr('hoặc chuyển khoản thủ công')}</span></div>}
            {settings.bank_name && <CopyRow label={tr('Ngân hàng')} value={findBank(settings.bank_name)?.name || settings.bank_name} />}
            <CopyRow label={tr('Số tài khoản')} value={settings.bank_account} mono />
            <CopyRow label={tr('Chủ tài khoản')} value={settings.bank_holder} />
            <CopyRow label={tr('Số tiền')} value={fmtVnd(price)} copy={price} mono />
            <CopyRow label={tr('Nội dung chuyển khoản')} value={note} mono />
            <p className="muted small">{tr('Ghi đúng nội dung để quản trị viên nhận ra tài khoản của bạn. Bấm vào từng dòng để sao chép.')}</p>
            <input ref={billRef} type="file" accept="image/*" hidden onChange={onBill} />
            {pending === null ? <div className="spinner small" /> : pending && step === null ? (
              <div className="paywall-pending">
                <Emoji e="⏳" play="loop" />
                <span>
                  {tr('Bill đã gửi — đang chờ quản trị viên kiểm tra. Bạn sẽ nhận thông báo khi gói được mở.')}{' '}
                  <button type="button" className="link-btn" onClick={() => billRef.current.click()}>{tr('Gửi lại ảnh bill rõ hơn')}</button>
                </span>
              </div>
            ) : (
              <div className="bill-step">
                <button className="btn gold block big" disabled={step !== null} onClick={() => billRef.current.click()}>
                  {step === null ? tr('📸 Tải ảnh bill chuyển khoản')
                    : step === 'upload' ? tr('Đang tải bill lên…')
                    : step === 'save' ? tr('Đang mở gói…')
                    : tr('Đang kiểm tra bill… {0}%', step)}
                </button>
                <p className="muted small center">{tr('Chuyển khoản xong, chụp màn hình giao dịch thành công rồi tải lên — web tự kiểm tra số tiền và nội dung, đúng là mở Premium ngay.')}</p>
              </div>
            )}
          </>
        ) : (
          <p className="muted">{tr('Thông tin thanh toán đang được cập nhật, bạn quay lại sau ít phút nhé!')}</p>
        )}
      </section>
    </div>
  )
}
