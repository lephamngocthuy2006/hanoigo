import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { supabase, friendlyError } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useQuests } from '../lib/data'
import { useTours } from '../lib/tours'
import { qrUrl } from '../lib/qr'
import Emoji, { emojify } from './Emoji'
import { tr } from '../lib/i18n'

/**
 * Trang quản trị → Mã QR: xem, tải, in và đổi mã QR dán tại từng điểm.
 * In theo tour: mỗi trang A4 hai mã, kèm số trạm và hướng dẫn quét.
 */
export default function AdminQrTab() {
  const toast = useToast()
  const { quests, loading } = useQuests()
  const { tours } = useTours()
  const [tokens, setTokens] = useState(null)
  const [images, setImages] = useState({})
  const [filter, setFilter] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('quest_qr').select('quest_id, token')
    if (error) return toast(friendlyError(error), 'error')
    setTokens(Object.fromEntries(data.map((r) => [r.quest_id, r.token])))
  }, [toast])
  useEffect(() => { load() }, [load])

  // mặc định chọn tour đầu tiên (Dấu chân Hà Nội)
  useEffect(() => { if (filter === null && tours.length) setFilter(tours[0].id) }, [tours, filter])

  // danh sách cần hiện: theo thứ tự trạm của tour, hoặc mọi nhiệm vụ
  const items = useMemo(() => {
    const tour = tours.find((t) => t.id === filter)
    if (!tour) return quests.map((q) => ({ quest: q, stop: null }))
    return tour.stops.map((s, i) => ({ quest: quests.find((q) => q.id === s.quest_id), stop: i + 1 })).filter((x) => x.quest)
  }, [tours, quests, filter])

  useEffect(() => {
    if (!tokens) return
    let alive = true
    Promise.all(items.filter((x) => tokens[x.quest.id]).map(async ({ quest }) =>
      [quest.id, await QRCode.toDataURL(qrUrl(tokens[quest.id]), { width: 480, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#3a2a24', light: '#ffffff' } })],
    )).then((pairs) => alive && setImages((m) => ({ ...m, ...Object.fromEntries(pairs) })))
    return () => { alive = false }
  }, [items, tokens])

  const regenerate = async (quest) => {
    if (!confirm(tr('Đổi mã QR cho "{0}"? Mã cũ đã in ra sẽ không dùng được nữa.', quest.title))) return
    const { data, error } = await supabase.rpc('regenerate_quest_qr', { p_quest_id: quest.id })
    if (error) return toast(friendlyError(error), 'error')
    setImages((m) => { const n = { ...m }; delete n[quest.id]; return n })
    setTokens((t) => ({ ...t, [quest.id]: data }))
    toast(tr('Đã đổi mã QR mới — nhớ in lại nhé!'), 'success')
  }

  if (loading || !tokens) return <div className="spinner" />
  const tour = tours.find((t) => t.id === filter)

  return (
    <>
      <div className="card admin-note">
        <Emoji e="💡" play="static" />{tr(' In mã và dán tại từng điểm. Khách quét bằng camera điện thoại (hoặc nút "Quét QR" trong nhiệm vụ) là được xác nhận đã đến nơi — check-in không cần GPS trong 2 giờ.')}
      </div>
      <div className="chips">
        {tours.map((t) => (
          <button key={t.id} className={`chip${filter === t.id ? ' active' : ''}`} onClick={() => setFilter(t.id)}>{emojify(t.emoji)} {t.title}</button>
        ))}
        <button className={`chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>{tr('Tất cả nhiệm vụ')}</button>
      </div>
      <div className="row tight" style={{ justifyContent: 'flex-start', marginTop: 0 }}>
        <button className="btn primary" onClick={() => window.print()}><Emoji e="🖨️" play="static" />{tr(' In các mã đang hiện')}</button>
      </div>

      <div className="qr-sheet">
        {items.map(({ quest, stop }) => (
          <article key={quest.id} className="card qr-card">
            <div className="qr-card-head">
              {stop && <span className="qr-stop">{tr('Trạm {0}', stop)}</span>}
              <strong>{emojify(quest.emoji)} {quest.title}</strong>
              <span className="muted small">{quest.place_name}</span>
            </div>
            {images[quest.id] ? <img className="qr-img" src={images[quest.id]} alt={tr('Mã QR của {0}', quest.title)} /> : <div className="qr-img"><div className="spinner" /></div>}
            <p className="qr-hint">{tr('📷 Quét mã để check-in')}<br /><b>HANOI GO!</b>{tour && ` · ${tour.title}`}</p>
            <div className="qr-actions">
              {images[quest.id] && <a className="ghost small" href={images[quest.id]} download={`hanoigo-qr-${stop ? `tram-${stop}-` : ''}${quest.id}.png`}><Emoji e="⬇️" play="static" />{tr(' Tải ảnh')}</a>}
              <button className="ghost small" onClick={() => regenerate(quest)}><Emoji e="🔄" play="static" />{tr(' Đổi mã')}</button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
