import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { drawCertificate, loadMyCertificate } from '../lib/certificate'
import { friendlyError } from '../lib/supabase'
import Modal from './Modal'
import Emoji from './Emoji'
import { tr } from '../lib/i18n'

/**
 * Chứng nhận hoàn thành tour (chỉ hiện khi đã nhận thưởng tour):
 * xem ảnh chứng nhận, tải về hoặc chia sẻ thẳng lên mạng xã hội.
 */
export default function TourCertificate({ tour, stops, openSignal }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [blob, setBlob] = useState(null)
  const [url, setUrl] = useState(null)
  const [cert, setCert] = useState(null)

  useEffect(() => { if (openSignal) setOpen(true) }, [openSignal])
  useEffect(() => () => url && URL.revokeObjectURL(url), [url])

  // vẽ khi mở lần đầu
  useEffect(() => {
    if (!open || blob) return
    let alive = true
    ;(async () => {
      const { data, error } = await loadMyCertificate(tour.id, user.id)
      if (!alive) return
      if (error || !data?.cert_code) {
        setOpen(false)
        return toast(error ? friendlyError(error) : tr('Chưa có mã chứng nhận. Hãy thử lại sau ít phút.'), 'error')
      }
      setCert(data)
      const png = await drawCertificate({
        tour, stops, userId: user.id, code: data.cert_code, completedAt: data.completed_at,
        name: profile?.display_name || profile?.username || '',
      })
      if (!alive) return
      setBlob(png)
      setUrl(URL.createObjectURL(png))
    })().catch((e) => { if (alive) { setOpen(false); toast(friendlyError(e), 'error') } })
    return () => { alive = false }
  }, [open, blob, tour, stops, user.id, profile, toast])

  const fileName = `hanoigo-chung-nhan-${cert?.cert_code || tour.id}.png`

  const download = () => {
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
  }

  const share = async () => {
    const file = new File([blob], fileName, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: tr('Chứng nhận HANOI GO!'), text: tr('Mình vừa hoàn thành tour "{0}" cùng HANOI GO! 🎉', tour.title) })
      } catch { /* người dùng huỷ chia sẻ */ }
    } else {
      download()
      toast(tr('Đã tải ảnh về máy — đăng lên Facebook/Instagram nhé!'), 'success')
    }
  }

  return (
    <>
      <section className="card cert-card">
        <span className="cert-badge"><Emoji e="🎖️" play="loop" /></span>
        <div>
          <strong>{tr('Chứng nhận hoàn thành tour')}</strong>
          <p className="muted small">{tr('Ảnh kỷ niệm có tên bạn, ảnh các điểm dừng và mã xác thực — chia sẻ ngay!')}</p>
        </div>
        <button className="btn gold" onClick={() => setOpen(true)}>{tr('Xem')}</button>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title={tr('🎖️ Chứng nhận của bạn')}>
        {url ? (
          <>
            <img className="cert-preview" src={url} alt={tr('Chứng nhận hoàn thành tour {0}', tour.title)} />
            <div className="row">
              <button className="btn primary" onClick={share}><Emoji e="📤" play="static" />{tr(' Chia sẻ')}</button>
              <button className="btn" onClick={download}><Emoji e="⬇️" play="static" />{tr(' Tải ảnh')}</button>
            </div>
          </>
        ) : (
          <div className="cert-loading"><div className="spinner" /><p className="muted small">{tr('Đang vẽ chứng nhận…')}</p></div>
        )}
      </Modal>
    </>
  )
}
