import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useQuests } from '../lib/data'
import { KIND, liveStreak } from '../lib/game'
import { distanceM, getPosition } from '../lib/geo'
import { useToast } from '../context/ToastContext'
import QuestRow from '../components/QuestRow'
import TourCard from '../components/TourCard'
import { tourProgress, useTours } from '../lib/tours'
import Emoji, { emojify } from '../components/Emoji'

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'photo', label: '📸 Chụp ảnh' },
  { id: 'checkin', label: '📍 Check-in' },
  { id: 'quiz', label: '❓ Đố vui' },
  { id: 'todo', label: 'Chưa làm' },
]

export default function QuestsPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const { quests, isDone, loading, error, reload } = useQuests()
  const { tours, claimed } = useTours()
  const [filter, setFilter] = useState('all')
  const [pos, setPos] = useState(null)
  const [locating, setLocating] = useState(false)

  const daily = quests.filter((q) => q.is_daily)
  const featured = quests.find((q) => !q.is_daily && q.kind !== 'quiz' && !isDone(q))
  const streak = liveStreak(profile)
  const doneToday = daily.length > 0 && daily.every(isDone)

  const list = useMemo(() => {
    let l = quests.filter((q) => !q.is_daily)
    if (filter === 'todo') l = l.filter((q) => !isDone(q))
    else if (filter !== 'all') l = l.filter((q) => q.kind === filter)
    const withDist = l.map((q) => ({ q, d: pos && q.lat != null ? distanceM(pos, q) : null }))
    if (pos) withDist.sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity))
    return withDist
  }, [quests, filter, pos, isDone])

  const locate = async () => {
    setLocating(true)
    try {
      setPos(await getPosition())
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLocating(false)
    }
  }

  if (loading) return <div className="page"><div className="spinner" /></div>
  if (error) return (
    <div className="page">
      <div className="card error">Không tải được nhiệm vụ: {error.message}. Bạn đã chạy file <code>supabase/schema.sql</code> chưa?</div>
      <button className="btn" onClick={reload}>Thử lại</button>
    </div>
  )

  const completedCount = quests.filter((q) => !q.is_daily && isDone(q)).length
  const total = quests.filter((q) => !q.is_daily).length

  return (
    <div className="page">
      <section className="hello">
        <div>
          <div className="eyebrow">Xin chào</div>
          <h1>{profile?.display_name || profile?.username} {emojify(profile?.avatar)}</h1>
        </div>
        <div className="progress-chip">{completedCount}/{total} nhiệm vụ</div>
      </section>

      {featured && (
        <Link to={`/quest/${featured.id}`} className="hero-quest">
          <div className="hero-emoji"><Emoji e={featured.emoji} play="loop" /></div>
          <div className="hero-body">
            <div className="eyebrow light">{emojify(KIND[featured.kind].label)} gợi ý</div>
            <h2>{featured.title}</h2>
            <p>{featured.description}</p>
            <div className="hero-rewards">
              <span><Emoji e="⭐" play="static" /> +{featured.xp_reward} XP</span>
              <span><Emoji e="🪙" play="static" /> +{featured.coin_reward}</span>
            </div>
            <span className="btn gold">{emojify(featured.kind === 'photo' ? '📷 Chụp ngay' : '📍 Check-in ngay')}</span>
          </div>
        </Link>
      )}

      {tours.length > 0 && (
        <section>
          <div className="section-head">
            <h3><Emoji e="🧭" play="static" /> Tour theo chủ đề</h3>
            <Link to="/tours" className="ghost small">Xem tất cả</Link>
          </div>
          <div className="tour-scroller">
            {tours.map((t) => (
              <TourCard key={t.id} tour={t} claimed={claimed.has(t.id)}
                progress={tourProgress(t, (id) => { const q = quests.find((x) => x.id === id); return q ? isDone(q) : false })} />
            ))}
          </div>
        </section>
      )}

      <div className="two-col quests-cols">
      <div className="col side sticky">
      <section className={`streak-banner${doneToday ? ' lit' : ''}`}>
        <span className="streak-fire"><Emoji e="🔥" play="loop" /></span>
        <div>
          <strong>{doneToday ? `Chuỗi ${streak} ngày — tuyệt vời!` : streak > 0 ? `Giữ chuỗi ${streak} ngày nhé!` : 'Thắp sáng streak của bạn hôm nay!'}</strong>
          <p className="muted">{doneToday ? 'Bạn đã hoàn thành nhiệm vụ hôm nay. Mai gặp lại!' : 'Hoàn thành một nhiệm vụ hôm nay để duy trì chuỗi khám phá.'}</p>
        </div>
      </section>

      {daily.length > 0 && (
        <section className="card">
          <div className="section-head">
            <h3><Emoji e="🌤️" play="static" /> Nhiệm vụ hôm nay</h3>
            <span className="muted small">Làm mới mỗi ngày</span>
          </div>
          {daily.map((q) => <QuestRow key={q.id} quest={q} done={isDone(q)} />)}
        </section>
      )}
      </div>

      <div className="col">
      <section className="card">
        <div className="section-head">
          <h3><Emoji e="🧭" play="static" /> Tất cả nhiệm vụ</h3>
          <button className="ghost small" onClick={locate} disabled={locating}>{emojify(locating ? 'Đang định vị…' : pos ? '📍 Cập nhật' : '📍 Gần tôi')}</button>
        </div>
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.id} className={`chip${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>{emojify(f.label)}</button>
          ))}
        </div>
        {list.length === 0 && <p className="muted center">Không có nhiệm vụ nào ở mục này <Emoji e="🎉" play="static" /></p>}
        <div className="quest-grid">
          {list.map(({ q, d }) => <QuestRow key={q.id} quest={q} done={isDone(q)} distance={d} />)}
        </div>
      </section>
      </div>
      </div>
    </div>
  )
}
