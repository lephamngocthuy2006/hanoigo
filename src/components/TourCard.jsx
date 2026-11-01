import { Link } from 'react-router-dom'
import Emoji from './Emoji'
import { tr } from '../lib/i18n'

export default function TourCard({ tour, progress, claimed, wide }) {
  return (
    <Link to={`/tour/${tour.id}`} className={`tour-card${wide ? ' wide' : ''}`} style={{ '--tour': tour.color }}>
      <div className="tour-card-top">
        <span className="tour-emoji"><Emoji e={tour.emoji} play="loop" /></span>
        {claimed ? <span className="tour-chip done">{tr('✓ Hoàn thành')}</span> : <span className="tour-chip">{tour.stops.length}{tr(' điểm dừng')}</span>}
      </div>
      <h3>{tour.title}</h3>
      <p>{tour.subtitle}</p>
      <div className="tour-meta">
        <span><Emoji e="⏱" play="static" /> {tour.duration}</span>
        <span><Emoji e="🎁" play="static" /> +{tour.bonus_xp} XP</span>
      </div>
      <div className="tour-progress"><div style={{ width: `${progress.pct}%` }} /></div>
      <span className="tour-progress-text">{progress.done}/{progress.total}{tr(' điểm')}</span>
    </Link>
  )
}
