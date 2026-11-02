const fmtDate = (s) => new Date(s).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
import Emoji from './Emoji'
import { tr, locale } from '../lib/i18n'

export { fmtDate }

export default function JournalGrid({ entries, urls, likes = {}, comments = {}, onOpen }) {
  return (
    <div className="journal-grid">
      {entries.map((e) => (
        <button key={e.id} className="journal-item" onClick={() => onOpen(e)}>
          {e.photo_path ? <img src={urls[e.photo_path]} alt={e.title} loading="lazy" /> : <div className="journal-noimg"><Emoji e="✍️" play="static" /></div>}
          {e.is_private && <span className="journal-lock" title={tr('Chỉ mình tôi')}><Emoji e="🔒" play="static" /></span>}
          {likes[e.id]?.count > 0 && (
            <span className="journal-likes">{likes[e.id].top.map((r) => <Emoji key={r} e={r} play="static" />)} {likes[e.id].count}</span>
          )}
          {comments[e.id] > 0 && (
            <span className="journal-comments"><Emoji e="💬" play="static" /> {comments[e.id]}</span>
          )}
          <div className="journal-meta">
            <strong>{e.title || tr('Không tiêu đề')}</strong>
            <span>{fmtDate(e.created_at)}{e.place_name && ` · ${e.place_name}`}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
