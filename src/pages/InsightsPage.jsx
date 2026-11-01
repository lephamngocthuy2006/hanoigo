import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CRITERIA, fmtScore, summarize } from '../lib/reviews'
import Stars from '../components/Stars'
import Emoji, { emojify } from '../components/Emoji'

// Gợi ý hành động cho tiêu chí có điểm thấp nhất
const ADVICE = {
  attraction: 'Làm mới nội dung trải nghiệm: thêm câu chuyện, hoạt động tương tác hoặc sự kiện theo mùa tại điểm đến.',
  information: 'Bổ sung chỉ dẫn: ảnh nhận diện điểm check-in, bản đồ chi tiết, biển chỉ dẫn và thông tin giờ mở cửa, giá vé.',
  facilities: 'Phối hợp với điểm đến cải thiện tiện ích: vệ sinh, chỗ nghỉ chân, nước uống, thái độ phục vụ.',
  value: 'Cân đối chi phí – trải nghiệm: thêm ưu đãi, voucher đối tác hoặc rút ngắn các bước không cần thiết.',
}

export default function InsightsPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [reviews, setReviews] = useState(null)

  useEffect(() => {
    supabase.rpc('app_stats').then(({ data }) => setStats(data || {}))
    supabase
      .from('reviews')
      .select('*, profiles(username, display_name, avatar), quests(title, emoji), tours(title, emoji)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews(data || []))
  }, [])

  if (!stats || !reviews) return <div className="page"><div className="spinner" /></div>

  const s = summarize(reviews)
  const weakest = s.count ? CRITERIA.reduce((a, b) => (s.criteria[a.key] <= s.criteria[b.key] ? a : b)) : null
  const strongest = s.count ? CRITERIA.reduce((a, b) => (s.criteria[a.key] >= s.criteria[b.key] ? a : b)) : null

  // Xếp hạng điểm đến / tour theo điểm trung bình
  const groups = {}
  reviews.forEach((r) => {
    const key = r.quest_id ? `q${r.quest_id}` : `t${r.tour_id}`
    const name = r.quests ? r.quests.title : r.tours?.title
    const emoji = r.quests ? r.quests.emoji : r.tours?.emoji
    groups[key] ??= { name, emoji, isTour: !!r.tour_id, link: r.quest_id ? `/quest/${r.quest_id}` : `/tour/${r.tour_id}`, rows: [] }
    groups[key].rows.push(r)
  })
  const ranking = Object.values(groups)
    .map((g) => ({ ...g, ...summarize(g.rows) }))
    .sort((a, b) => b.overall - a.overall || b.count - a.count)

  const kpis = [
    { icon: '👤', value: stats.users, label: 'Người dùng' },
    { icon: '🏅', value: stats.completions, label: 'Lượt hoàn thành nhiệm vụ' },
    { icon: '🧭', value: stats.tours_done, label: 'Tour hoàn thành' },
    { icon: '⭐', value: stats.reviews, label: 'Lượt đánh giá' },
  ]

  return (
    <div className="page">
      <button className="ghost back" onClick={() => navigate(-1)}>← Quay lại</button>
      <section className="insights-hero">
        <div className="eyebrow light">Quản trị chất lượng dịch vụ</div>
        <h1>Thống kê trải nghiệm</h1>
        <p>Số liệu thực từ người dùng HANOI GO!, cập nhật theo thời gian thực.</p>
      </section>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <span className="kpi-icon"><Emoji e={k.icon} play="once" /></span>
            <strong>{k.value ?? 0}</strong>
            <span>{emojify(k.label)}</span>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="section-head"><h3><Emoji e="📈" play="static" /> Mức độ hài lòng chung</h3><span className="muted small">{s.count} đánh giá</span></div>
        {s.count === 0 ? <p className="muted small">Chưa có đánh giá nào.</p> : (
          <div className="review-summary">
            <div className="score-big">
              <strong>{fmtScore(s.overall)}</strong>
              <Stars value={s.overall} />
              <span className="muted small"><Emoji e="👍" play="static" /> {s.recommendPct}% sẵn sàng giới thiệu</span>
            </div>
            <div className="criteria-bars">
              {CRITERIA.map((c) => (
                <div key={c.key} className={`crit-bar${weakest?.key === c.key ? ' weak' : ''}`}>
                  <span>{emojify(c.label)}</span>
                  <div className="bar"><div style={{ width: `${(s.criteria[c.key] / 5) * 100}%` }} /></div>
                  <b>{fmtScore(s.criteria[c.key])}</b>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {weakest && (
        <section className="card advice">
          <h3><Emoji e="💡" play="static" /> Gợi ý cải thiện</h3>
          <p><b>Điểm mạnh:</b> {emojify(strongest.label)} ({fmtScore(s.criteria[strongest.key])}/5).</p>
          <p><b>Cần ưu tiên:</b> {emojify(weakest.label)} ({fmtScore(s.criteria[weakest.key])}/5) — {ADVICE[weakest.key]}</p>
          {s.count < 10 && <p className="muted small">* Số lượng đánh giá còn ít ({s.count}), kết luận mang tính tham khảo.</p>}
        </section>
      )}

      {ranking.length > 0 && (
        <section className="card">
          <div className="section-head"><h3><Emoji e="🏆" play="static" /> Xếp hạng điểm đến & tour</h3></div>
          {ranking.map((g, i) => (
            <button key={g.link} className="rank-row as-button" onClick={() => navigate(g.link)}>
              <span className="rank-no">{i + 1}</span>
              <span className="rank-avatar"><Emoji e={g.emoji} play="hover" /></span>
              <span className="rank-name">
                <strong>{g.name}</strong>
                <span className="muted small">{g.isTour ? 'Tour' : 'Điểm đến'} · {g.count} đánh giá · <Emoji e="👍" play="static" /> {g.recommendPct}%</span>
              </span>
              <span className="rank-xp">★ {fmtScore(g.overall)}</span>
            </button>
          ))}
        </section>
      )}

      {stats.top_quests?.length > 0 && (
        <section className="card">
          <div className="section-head"><h3><Emoji e="🔥" play="static" /> Nhiệm vụ được tham gia nhiều nhất</h3></div>
          {stats.top_quests.map((q) => {
            const max = stats.top_quests[0].n
            return (
              <div key={q.title} className="crit-bar wide">
                <span>{emojify(q.emoji)} {q.title}</span>
                <div className="bar"><div style={{ width: `${(q.n / max) * 100}%` }} /></div>
                <b>{q.n}</b>
              </div>
            )
          })}
        </section>
      )}

      {reviews.some((r) => r.comment) && (
        <section className="card">
          <div className="section-head"><h3><Emoji e="💬" play="static" /> Nhận xét gần đây</h3></div>
          {reviews.filter((r) => r.comment).slice(0, 8).map((r) => (
            <div key={r.id} className="review-item">
              <span className="rank-avatar"><Emoji e={r.profiles?.avatar} play="hover" /></span>
              <div>
                <div className="review-head">
                  <strong>{r.profiles?.display_name || r.profiles?.username}</strong>
                  <Stars value={r.overall} size="0.8rem" />
                </div>
                <span className="muted small">{r.quests ? `${r.quests.emoji} ${r.quests.title}` : `${r.tours?.emoji} Tour ${r.tours?.title}`}</span>
                <p>{r.comment}</p>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
