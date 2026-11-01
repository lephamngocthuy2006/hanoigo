import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { CRITERIA, fmtScore, loadReviews, summarize } from '../lib/reviews'
import ReviewForm from './ReviewForm'
import Stars from './Stars'
import Emoji, { emojify } from './Emoji'
import { tr } from '../lib/i18n'

// Khối đánh giá đặt trong trang nhiệm vụ / tour
export default function ReviewSummary({ target, title, canReview, openSignal = 0 }) {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const load = useCallback(() => {
    loadReviews(target).then(setRows).catch(() => setRows([]))
  }, [target.questId, target.tourId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])
  // trang cha yêu cầu mở form (vd: sau khi hoàn thành nhiệm vụ)
  useEffect(() => { if (openSignal) setOpen(true) }, [openSignal])

  if (!rows) return null
  const s = summarize(rows)
  const mine = rows.find((r) => r.user_id === user.id)
  const comments = rows.filter((r) => r.comment)

  return (
    <section className="card">
      <div className="section-head">
        <h3><Emoji e="⭐" play="static" />{tr(' Đánh giá trải nghiệm')}</h3>
        <span className="muted small">{s.count}{tr(' lượt')}</span>
      </div>

      {s.count > 0 ? (
        <div className="review-summary">
          <div className="score-big">
            <strong>{fmtScore(s.overall)}</strong>
            <Stars value={s.overall} />
            <span className="muted small"><Emoji e="👍" play="static" /> {s.recommendPct}{tr('% giới thiệu')}</span>
          </div>
          <div className="criteria-bars">
            {CRITERIA.map((c) => (
              <div key={c.key} className="crit-bar">
                <span>{emojify(c.label)}</span>
                <div className="bar"><div style={{ width: `${(s.criteria[c.key] / 5) * 100}%` }} /></div>
                <b>{fmtScore(s.criteria[c.key])}</b>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="muted small">{tr('Chưa có đánh giá nào. ')}{canReview ? tr('Hãy là người đầu tiên!') : tr('Hoàn thành để đánh giá nhé.')}</p>
      )}

      {(showAll ? comments : comments.slice(0, 3)).map((r) => (
        <div key={r.id} className="review-item">
          <span className="rank-avatar"><Emoji e={r.profiles?.avatar} play="hover" /></span>
          <div>
            <div className="review-head">
              <strong>{r.profiles?.display_name || r.profiles?.username}</strong>
              <Stars value={r.overall} size="0.8rem" />
            </div>
            <p>{r.comment}</p>
            {r.partner_reply && <div className="partner-reply"><b><Emoji e="🏪" play="static" />{tr(' Phản hồi từ đối tác:')}</b> {r.partner_reply}</div>}
          </div>
        </div>
      ))}
      {comments.length > 3 && !showAll && (
        <button className="ghost small" onClick={() => setShowAll(true)}>{tr('Xem tất cả ')}{comments.length}{tr(' nhận xét')}</button>
      )}

      {canReview && (
        <button className="btn block" style={{ marginTop: 10 }} onClick={() => setOpen(true)}>
          {emojify(mine ? tr('✏️ Sửa đánh giá của bạn') : tr('⭐ Viết đánh giá · +20 🪙'))}
        </button>
      )}
      <ReviewForm open={open} onClose={() => setOpen(false)} target={target} title={title} existing={mine}
        onSaved={() => { setOpen(false); load() }} />
    </section>
  )
}
