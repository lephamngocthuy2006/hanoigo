import { Link } from 'react-router-dom'
import Emoji from './Emoji'

export default function TourCard({ tour, progress, claimed, wide }) {
  return (
    <Link to={`/tour/${tour.id}`} className={`tour-card${wide ? ' wide' : ''}`} style={{ '--tour': tour.color }}>
      <div className="tour-card-top">
        <span className="tour-emoji"><Emoji e={tour.emoji} play="loop" /></span>
        {claimed ? <span className="tour-chip done">✓ Hoàn thành</span> : <span className="tour-chip">{tour.stops.length} điểm dừng</span>}
      </div>
      <h3>{tour.title}</h3>
      <p>{tour.subtitle}</p>
      <div className="tour-meta">
        <span>⏱ {tour.duration}</span>
        <span>🎁 +{tour.bonus_xp} XP</span>
      </div>
      <div className="tour-progress"><div style={{ width: `${progress.pct}%` }} /></div>
      <span className="tour-progress-text">{progress.done}/{progress.total} điểm</span>
    </Link>
  )
}
