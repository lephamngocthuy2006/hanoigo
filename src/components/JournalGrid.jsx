const fmtDate = (s) => new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

export { fmtDate }

export default function JournalGrid({ entries, urls, likes = {}, onOpen }) {
  return (
    <div className="journal-grid">
      {entries.map((e) => (
        <button key={e.id} className="journal-item" onClick={() => onOpen(e)}>
          {e.photo_path ? <img src={urls[e.photo_path]} alt={e.title} loading="lazy" /> : <div className="journal-noimg">✍️</div>}
          {e.is_private && <span className="journal-lock" title="Chỉ mình tôi">🔒</span>}
          {likes[e.id]?.count > 0 && <span className="journal-likes">❤️ {likes[e.id].count}</span>}
          <div className="journal-meta">
            <strong>{e.title || 'Không tiêu đề'}</strong>
            <span>{fmtDate(e.created_at)}{e.place_name && ` · ${e.place_name}`}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
