import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { searchUsers } from '../lib/friends'
import { levelInfo, liveStreak } from '../lib/game'
import Emoji from '../components/Emoji'

function PersonRow({ person, children, to }) {
  const body = (
    <>
      <span className="rank-avatar"><Emoji e={person.avatar} play="hover" /></span>
      <span className="rank-name">
        <strong>{person.display_name || person.username}</strong>
        <span className="muted small">@{person.username} · Lv {levelInfo(person.xp).level} · <Emoji e="🔥" play="static" /> {liveStreak(person)}</span>
      </span>
    </>
  )
  return (
    <div className="person-row">
      {to ? <Link to={to} className="person-link">{body}</Link> : <span className="person-link">{body}</span>}
      {children && <span className="person-actions">{children}</span>}
    </div>
  )
}

export default function FriendsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const { friends, incoming, outgoing, loaded, error, reload } = useOutletContext()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [busyId, setBusyId] = useState(null)

  // tìm theo tên đăng nhập, chờ người dùng gõ xong 300ms
  useEffect(() => {
    const t = setTimeout(() => searchUsers(query, user.id).then(setResults), 300)
    return () => clearTimeout(t)
  }, [query, user.id])

  const relation = (id) => {
    if (friends.some((f) => f.other?.id === id)) return 'friend'
    if (outgoing.some((f) => f.other?.id === id)) return 'sent'
    if (incoming.some((f) => f.other?.id === id)) return 'incoming'
    return null
  }

  const run = async (key, fn, success) => {
    setBusyId(key)
    const { error: err } = await fn()
    setBusyId(null)
    if (err) return toast(friendlyError(err), 'error')
    if (success) toast(success, 'success')
    reload()
  }

  const sendRequest = (p) =>
    run(p.id, async () => {
      const r = await supabase.rpc('send_friend_request', { p_username: p.username })
      if (!r.error && r.data?.status === 'accepted') toast(`Bạn và ${p.display_name || p.username} đã là bạn bè! 🎉`, 'success')
      else if (!r.error) toast('Đã gửi lời mời kết bạn', 'success')
      return r
    })

  const respond = (f, accept) =>
    run(f.id, () => supabase.rpc('respond_friend_request', { p_id: f.id, p_accept: accept }), accept ? 'Đã trở thành bạn bè 🎉' : null)

  const remove = (f, msg) => run(f.id, () => supabase.from('friendships').delete().eq('id', f.id), msg)

  if (error) {
    return (
      <div className="page">
        <div className="card error">
          Tính năng bạn bè chưa được bật trên máy chủ. Hãy chạy file <code>supabase/002_friends.sql</code> trong Supabase SQL Editor.
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <section className="friends-hero">
        <div className="eyebrow light">Cộng đồng</div>
        <h1>Bạn bè</h1>
        <p>Kết bạn để xem Sổ hành trình, thả tim kỷ niệm và đua top cùng nhau.</p>
      </section>

      <div className="two-col friends-cols">
      <div className="col">
      <section className="card">
        <label className="field" style={{ marginBottom: 6 }}>
          <span>Tìm theo tên đăng nhập</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="vd: linh" autoCapitalize="none" />
        </label>
        {query.trim().length >= 2 && results.length === 0 && <p className="muted small">Không tìm thấy ai.</p>}
        {results.map((p) => {
          const rel = relation(p.id)
          return (
            <PersonRow key={p.id} person={p} to={rel === 'friend' ? `/u/${p.username}` : null}>
              {rel === 'friend' && <span className="tag ok">Bạn bè</span>}
              {rel === 'sent' && <span className="tag">Đã gửi</span>}
              {rel === 'incoming' && <span className="tag">Đã mời bạn</span>}
              {!rel && (
                <button className="btn primary small" disabled={busyId === p.id} onClick={() => sendRequest(p)}>＋ Kết bạn</button>
              )}
            </PersonRow>
          )
        })}
      </section>

      {incoming.length > 0 && (
        <section className="card">
          <div className="section-head"><h3><Emoji e="📩" play="static" /> Lời mời kết bạn</h3><span className="badge static">{incoming.length}</span></div>
          {incoming.map((f) => (
            <PersonRow key={f.id} person={f.other}>
              <button className="btn primary small" disabled={busyId === f.id} onClick={() => respond(f, true)}>Đồng ý</button>
              <button className="ghost small" disabled={busyId === f.id} onClick={() => respond(f, false)}>Từ chối</button>
            </PersonRow>
          ))}
        </section>
      )}
      </div>
      <div className="col">
      <section className="card">
        <div className="section-head"><h3><Emoji e="👥" play="static" /> Bạn bè</h3><span className="muted small">{friends.length} người</span></div>
        {!loaded ? <div className="spinner" /> : friends.length === 0 ? (
          <p className="muted small center">Chưa có bạn bè. Tìm tên đăng nhập của bạn bè ở ô phía trên nhé!</p>
        ) : (
          friends.map((f) => (
            <PersonRow key={f.id} person={f.other} to={`/u/${f.other.username}`}>
              <Link to={`/u/${f.other.username}`} className="ghost small"><Emoji e="📖" play="static" /> Xem Sổ</Link>
            </PersonRow>
          ))
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="card">
          <div className="section-head"><h3><Emoji e="⏳" play="static" /> Đang chờ đồng ý</h3></div>
          {outgoing.map((f) => (
            <PersonRow key={f.id} person={f.other}>
              <button className="ghost small" disabled={busyId === f.id} onClick={() => remove(f, 'Đã huỷ lời mời')}>Huỷ</button>
            </PersonRow>
          ))}
        </section>
      )}
      </div>
      </div>
    </div>
  )
}
