import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { notiIcon, notiLink, notiText, personName, timeAgo } from '../lib/social'
import EmptyState from '../components/EmptyState'
import Emoji from '../components/Emoji'
import { tr } from '../lib/i18n'

export default function NotificationsPage() {
  const { user } = useAuth()
  const { notifications } = useOutletContext()
  const { items, loaded, markAllRead, reload } = notifications
  // Tải lại mỗi lần mở trang: thông báo bị xoá (bình luận / cảm xúc đã gỡ) không được báo qua realtime
  useEffect(() => { reload() }, [reload])
  // Giữ nền "chưa đọc" cho những thông báo mới trong lúc đang xem, dù đã đánh dấu đọc
  const [fresh, setFresh] = useState(null)

  useEffect(() => {
    if (!loaded || fresh) return
    setFresh(new Set(items.filter((n) => !n.read_at).map((n) => n.id)))
    if (items.some((n) => !n.read_at)) markAllRead()
  }, [loaded, items, fresh, markAllRead])

  // thông báo đến khi đang mở trang này: đánh dấu đọc luôn
  useEffect(() => {
    if (!fresh) return
    const incoming = items.filter((n) => !n.read_at)
    if (!incoming.length) return
    setFresh((s) => new Set([...s, ...incoming.map((n) => n.id)]))
    markAllRead()
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <section className="friends-hero noti-hero">
        <div className="eyebrow light">{tr('Cộng đồng')}</div>
        <h1>{tr('Thông báo')}</h1>
        <p>{tr('Cảm xúc, bình luận và lời mời kết bạn từ bạn bè.')}</p>
      </section>

      {!loaded ? <div className="spinner" /> : items.length === 0 ? (
        <EmptyState emoji="🔔" tone="gold" title={tr('Chưa có thông báo nào')} action={{ label: tr('🤝 Tìm bạn bè'), to: '/friends' }}>
          {tr('Kết bạn và chia sẻ kỷ niệm để nhận tương tác nhé!')}
        </EmptyState>
      ) : (
        <ul className="card noti-list">
          {items.map((n) => (
            <li key={n.id}>
              <Link to={notiLink(n, user.id)} className={`noti${fresh?.has(n.id) ? ' unread' : ''}`}>
                <span className="noti-avatar">
                  <Emoji e={n.actor?.avatar || '🐢'} play="static" />
                  <span className="noti-kind"><Emoji e={notiIcon(n)} play="static" /></span>
                </span>
                <span className="noti-body">
                  <span><strong>{personName(n.actor)}</strong> {notiText(n)}</span>
                  {n.body && <span className="noti-quote">“{n.body}”</span>}
                  <span className="muted small">{timeAgo(n.created_at)}</span>
                </span>
                {fresh?.has(n.id) && <span className="noti-dot" aria-label={tr('Mới')} />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
