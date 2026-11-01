import { Link } from 'react-router-dom'
import { KIND } from '../lib/game'
import { formatDistance } from '../lib/geo'
import Emoji, { emojify } from './Emoji'
import { tr } from '../lib/i18n'

export default function QuestRow({ quest, done, distance }) {
  return (
    <Link to={`/quest/${quest.id}`} className={`quest-row${done ? ' done' : ''}`}>
      <span className="quest-emoji"><Emoji e={quest.emoji} play="once" /></span>
      <span className="quest-main">
        <span className="quest-kind">{emojify(KIND[quest.kind].label)}{quest.is_daily && tr(' · Hằng ngày')}{quest.area && ` · ${quest.area}`}</span>
        <span className="quest-title">{quest.title}</span>
        {quest.partners && <span className="partner-badge"><Emoji e="🏪" play="static" />{tr(' Đối tác · ')}{quest.partners.name}</span>}
        <span className="quest-reward"><Emoji e="⭐" play="static" /> +{quest.xp_reward} XP · <Emoji e="🪙" play="static" /> +{quest.coin_reward}{emojify(distance != null && ` · 📍 ${formatDistance(distance)}`)}</span>
      </span>
      <span className={`quest-status${done ? ' ok' : ''}`}>{done ? '✓' : '›'}</span>
    </Link>
  )
}
