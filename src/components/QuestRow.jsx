import { Link } from 'react-router-dom'
import { KIND } from '../lib/game'
import { formatDistance } from '../lib/geo'

export default function QuestRow({ quest, done, distance }) {
  return (
    <Link to={`/quest/${quest.id}`} className={`quest-row${done ? ' done' : ''}`}>
      <span className="quest-emoji">{quest.emoji}</span>
      <span className="quest-main">
        <span className="quest-kind">{KIND[quest.kind].label}{quest.is_daily && ' · Hằng ngày'}{quest.area && ` · ${quest.area}`}</span>
        <span className="quest-title">{quest.title}</span>
        <span className="quest-reward">⭐ +{quest.xp_reward} XP · 🪙 +{quest.coin_reward}{distance != null && ` · 📍 ${formatDistance(distance)}`}</span>
      </span>
      <span className={`quest-status${done ? ' ok' : ''}`}>{done ? '✓' : '›'}</span>
    </Link>
  )
}
