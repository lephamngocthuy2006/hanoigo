import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { loadLikes } from '../lib/friends'
import { signedUrls } from '../lib/photos'
import { levelInfo, levelTitle, liveStreak } from '../lib/game'
import JournalGrid, { fmtDate } from '../components/JournalGrid'
import ReactionBar from '../components/ReactionBar'
import Modal from '../components/Modal'
import Emoji, { emojify } from '../components/Emoji'

export default function FriendProfile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const { friends, reload: reloadFriends } = useOutletContext()
  const [person, setPerson] = useState(undefined)
  const [entries, setEntries] = useState([])
  const [urls, setUrls] = useState({})
  const [likes, setLikes] = useState({})
  const [viewing, setViewing] = useState(null)

  const friendship = friends.find((f) => f.other?.username === username)

  const load = useCallback(async () => {
    const { data: p } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar, bio, xp, streak, best_streak, last_active_date')
      .eq('username', username)
      .maybeSingle()
    setPerson(p)
    if (!p) return
    // RLS chỉ trả về các trang không riêng tư của bạn bè
    const { data } = await supabase.from('journal_entries').select('*').eq('user_id', p.id).order('created_at', { ascending: false })
    const list = data || []
    setEntries(list)
    const [u, l] = await Promise.all([signedUrls(list.map((e) => e.photo_path)), loadLikes(list.map((e) => e.id), user.id)])
    setUrls(u)
    setLikes(l)
  }, [username, user.id])

  useEffect(() => { load() }, [load, friendship?.id])

  if (person === undefined) return <div className="page"><div className="spinner" /></div>
  if (!person) return <div className="page"><p className="muted">Không tìm thấy người dùng @{username}.</p></div>
  if (person.id === user.id) return <Navigate to="/journal" replace />

  const unfriend = async () => {
    if (!confirm(`Huỷ kết bạn với ${person.display_name || person.username}?`)) return
    const { error } = await supabase.from('friendships').delete().eq('id', friendship.id)
    if (error) return toast(friendlyError(error), 'error')
    reloadFriends()
    navigate('/friends')
  }

  const lv = levelInfo(person.xp)
  const setLike = (id) => (like) => setLikes((m) => ({ ...m, [id]: like }))

  return (
    <div className="page">
      <button className="ghost back" onClick={() => navigate(-1)}>← Quay lại</button>

      <section className="journal-cover">
        <div className="cover-avatar"><Emoji e={person.avatar} play="loop" /></div>
        <div className="eyebrow light">Sổ hành trình</div>
        <h1>Hà Nội của {person.display_name || person.username}</h1>
        <p className="cover-sub">@{person.username} · Lv {lv.level} {levelTitle(lv.level)}</p>
        {person.bio && <p className="cover-bio">“{person.bio}”</p>}
        <div className="cover-stats">
          <div><strong>{entries.length}</strong><span>Kỷ niệm</span></div>
          <div><strong><Emoji e="⭐" play="once" /> {person.xp}</strong><span>XP</span></div>
          <div><strong><Emoji e="🔥" play="once" /> {liveStreak(person)}</strong><span>Streak</span></div>
        </div>
      </section>

      {!friendship ? (
        <div className="card center">
          <p>Hai bạn chưa là bạn bè, nên chưa xem được Sổ hành trình của @{person.username}.</p>
          <Link to="/friends" className="btn primary">Đến trang Bạn bè</Link>
        </div>
      ) : entries.length === 0 ? (
        <div className="card empty">
          <div className="empty-emoji"><Emoji e="📖" play="loop" /></div>
          <p>{person.display_name || person.username} chưa chia sẻ kỷ niệm nào.</p>
        </div>
      ) : (
        <JournalGrid entries={entries} urls={urls} likes={likes} onOpen={setViewing} />
      )}

      {friendship && <button className="ghost small danger-text" style={{ alignSelf: 'center' }} onClick={unfriend}>Huỷ kết bạn</button>}

      <Modal open={!!viewing} onClose={() => setViewing(null)}>
        {viewing && (
          <div className="entry-view">
            {viewing.photo_path && <img src={urls[viewing.photo_path]} alt={viewing.title} />}
            <h3>{viewing.title || 'Không tiêu đề'}</h3>
            <div className="muted small">{fmtDate(viewing.created_at)}{emojify(viewing.place_name && ` · 📍 ${viewing.place_name}`)}{emojify(viewing.quest_id && ' · 🏅 Nhiệm vụ')}</div>
            {viewing.note && <p className="entry-note">{viewing.note}</p>}
            <div className="row">
              <ReactionBar entryId={viewing.id} userId={user.id} like={likes[viewing.id]} onChange={setLike(viewing.id)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
