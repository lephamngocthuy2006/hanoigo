import { useEffect, useState } from 'react'
import { supabase, friendlyError } from '../lib/supabase'
import { CRITERIA } from '../lib/reviews'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from './Modal'
import Stars from './Stars'

const EMPTY = { overall: 0, attraction: 0, information: 0, facilities: 0, value: 0, recommend: true, comment: '' }
const OVERALL_TEXT = ['', 'Rất tệ', 'Chưa tốt', 'Bình thường', 'Tốt', 'Tuyệt vời!']

// target: { questId } hoặc { tourId }, existing: đánh giá cũ của mình (nếu có)
export default function ReviewForm({ open, onClose, target, title, existing, onSaved }) {
  const { refreshProfile } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setForm(existing ? { ...EMPTY, ...existing } : EMPTY)
  }, [open, existing])

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const complete = form.overall && CRITERIA.every((c) => form[c.key])

  const save = async (e) => {
    e.preventDefault()
    if (!complete) return toast('Hãy chấm đủ các tiêu chí nhé', 'error')
    setBusy(true)
    const { data, error } = await supabase.rpc('submit_review', {
      p_quest_id: target.questId ?? null,
      p_tour_id: target.tourId ?? null,
      p_overall: form.overall,
      p_attraction: form.attraction,
      p_information: form.information,
      p_facilities: form.facilities,
      p_value: form.value,
      p_recommend: form.recommend,
      p_comment: form.comment.trim(),
    })
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    toast(data.coins ? `Cảm ơn bạn đã đánh giá! +${data.coins} Hanoi Coins 🪙` : 'Đã cập nhật đánh giá', 'success')
    if (data.coins) refreshProfile()
    onSaved?.()
  }

  return (
    <Modal open={open} onClose={onClose} title="Đánh giá trải nghiệm">
      <form onSubmit={save} className="review-form">
        <p className="muted small" style={{ marginTop: -8 }}>{title}</p>
        <div className="review-overall">
          <Stars value={form.overall} onChange={set('overall')} size="2.2rem" label="Đánh giá tổng thể" />
          <span className="muted small">{OVERALL_TEXT[form.overall] || 'Chạm để chấm điểm tổng thể'}</span>
        </div>
        {CRITERIA.map((c) => (
          <div key={c.key} className="criterion">
            <div>
              <strong>{c.label}</strong>
              <span className="muted small">{c.hint}</span>
            </div>
            <Stars value={form[c.key]} onChange={set(c.key)} size="1.35rem" label={c.label} />
          </div>
        ))}
        <div className="criterion">
          <strong>Bạn có giới thiệu nơi này cho bạn bè?</strong>
          <span className="seg-mini">
            <button type="button" className={form.recommend ? 'active' : ''} onClick={() => set('recommend')(true)}>👍 Có</button>
            <button type="button" className={!form.recommend ? 'active' : ''} onClick={() => set('recommend')(false)}>👎 Không</button>
          </span>
        </div>
        <label className="field">
          <span>Nhận xét (tuỳ chọn)</span>
          <textarea rows={3} maxLength={500} value={form.comment} onChange={(e) => set('comment')(e.target.value)}
            placeholder="Điều bạn thích, điều cần cải thiện…" />
        </label>
        <button className="btn primary block" disabled={busy || !complete}>
          {busy ? 'Đang gửi…' : existing ? 'Cập nhật đánh giá' : 'Gửi đánh giá · +20 🪙'}
        </button>
      </form>
    </Modal>
  )
}
