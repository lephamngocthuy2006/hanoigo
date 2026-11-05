import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { loadLikes } from '../lib/friends'
import { signedUrls, usePhotoUrlRefresh } from '../lib/photos'
import { levelInfo, levelTitle, liveStreak } from '../lib/game'
import JournalGrid, { fmtDate } from '../components/JournalGrid'
import ReactionBar from '../components/ReactionBar'
import Comments from '../components/Comments'
import { loadCommentCounts } from '../lib/social'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import Emoji, { emojify } from '../components/Emoji'
import { tr } from '../lib/i18n'

export default function FriendProfile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const { friends, reload: reloadFriends } = useOutletContext()
  const [person, setPerson] = useState(undefined)
  const [entries, setEntries] = useState([])
  const [urls, setUrls] = useState({})
  usePhotoUrlRefresh(entries.map((e) => e.photo_path), setUrls)
  const [likes, setLikes] = useState({})
  const [comments, setComments] = useState({})
  const [viewing, setViewing] = useState(null)
  const [params, setParams] = useSearchParams()

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
    const ids = list.map((e) => e.id)
    const [u, l, c] = await Promise.all([signedUrls(list.map((e) => e.photo_path)), loadLikes(ids, user.id), loadCommentCounts(ids)])
    setUrls(u)
    setLikes(l)
    setComments(c)
  }, [username, user.id])

  useEffect(() => { load() }, [load, friendship?.id])

  // Mở thẳng một trang khi đi từ thông báo (/u/ten?entry=123)
  const openId = Number(params.get('entry'))
  const [focusComment, setFocusComment] = useState(null) // bình luận cần cuộn tới (từ thông báo)
  useEffect(() => {
    if (!openId || person === undefined) return
    const found = entries.find((e) => e.id === openId)
    if (found) {
      setViewing(found)
      setFocusComment(Number(params.get('comment')) || null)
    }
    // trang đã bị xoá / chuyển riêng tư → chỉ bỏ tham số
    if (found || entries.length || !person) setParams({}, { replace: true })
  }, [openId, entries, person]) // eslint-disable-line react-hooks/exhaustive-deps

  if (person === undefined) return <div className="page"><div className="spinner" /></div>
  if (!person) return <div className="page"><p className="muted">{tr('Không tìm thấy người dùng @')}{username}.</p></div>
  if (person.id === user.id) return <Navigate to="/journal" replace />

  const unfriend = async () => {
    if (!(await confirm(tr('Huỷ kết bạn với {0}?', person.display_name || person.username), { ok: tr('Huỷ kết bạn'), danger: true }))) return
    const { error } = await supabase.from('friendships').delete().eq('id', friendship.id)
    if (error) return toast(friendlyError(error), 'error')
    reloadFriends()
    navigate('/friends')
  }

  const lv = levelInfo(person.xp)
  const setLike = (id) => (like) => setLikes((m) => ({ ...m, [id]: like }))

  return (
    <div className="page">
      <button className="ghost back" onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/friends', { replace: true }))}>{tr('← Quay lại')}</button>

      <section className="journal-cover">
        <div className="cover-avatar"><Emoji e={person.avatar} play="loop" /></div>
        <div className="eyebrow light">{tr('Sổ hành trình')}</div>
        <h1>{tr('Hà Nội của ')}{person.display_name || person.username}</h1>
        <p className="cover-sub">@{person.username} · Lv {lv.level} {levelTitle(lv.level)}</p>
        {person.bio && <p className="cover-bio">“{person.bio}”</p>}
        <div className="cover-stats">
          <div><strong>{entries.length}</strong><span>{tr('Kỷ niệm')}</span></div>
          <div><strong><Emoji e="⭐" play="once" /> {person.xp}</strong><span>XP</span></div>
          <div><strong><Emoji e="🔥" play="once" /> {liveStreak(person)}</strong><span>Streak</span></div>
        </div>
      </section>

      {!friendship ? (
        <div className="card center">
          <p>{tr('Hai bạn chưa là bạn bè, nên chưa xem được Sổ hành trình của @')}{person.username}.</p>
          <Link to="/friends" className="btn primary">{tr('Đến trang Bạn bè')}</Link>
        </div>
      ) : entries.length === 0 ? (
        <EmptyState emoji="📖" title={tr('Chưa có kỷ niệm')}>
          {person.display_name || person.username}{tr(' chưa chia sẻ kỷ niệm nào.')}
        </EmptyState>
      ) : (
        <JournalGrid entries={entries} urls={urls} likes={likes} comments={comments} onOpen={setViewing} />
      )}

      {friendship && <button className="ghost small danger-text" style={{ alignSelf: 'center' }} onClick={unfriend}>{tr('Huỷ kết bạn')}</button>}

      <Modal open={!!viewing} onClose={() => { setViewing(null); setFocusComment(null) }}>
        {viewing && (
          <div className="entry-view">
            {viewing.photo_path && <img src={urls[viewing.photo_path]} alt={viewing.title} />}
            <h3>{viewing.title || tr('Không tiêu đề')}</h3>
            <div className="muted small">{fmtDate(viewing.created_at)}{emojify(viewing.place_name && ` · 📍 ${viewing.place_name}`)}{emojify(viewing.quest_id && tr(' · 🏅 Nhiệm vụ'))}</div>
            {viewing.note && <p className="entry-note">{viewing.note}</p>}
            <div className="row">
              <ReactionBar entryId={viewing.id} userId={user.id} like={likes[viewing.id]} onChange={setLike(viewing.id)} />
            </div>
            <Comments entryId={viewing.id} ownerId={person.id} userId={user.id} highlightId={focusComment}
              onCount={(n) => setComments((m) => ({ ...m, [viewing.id]: n }))} />
          </div>
        )}
      </Modal>
    </div>
  )
}
