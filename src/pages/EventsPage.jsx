import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { RARITY, levelInfo } from '../lib/game'
import Modal from '../components/Modal'
import VoucherShop from '../components/VoucherShop'

const PACK_COST = 100

export default function EventsPage() {
  const location = useLocation()
  const [tab, setTab] = useState(location.state?.tab || 'cards')
  return (
    <div className="page">
      <section className="event-banner">
        <div className="eyebrow light">Sự kiện</div>
        <h1>Săn thẻ Thủ đô</h1>
        <p>Làm nhiệm vụ nhận Hanoi Coins, mở gói thẻ và sưu tầm đủ bộ Hà Nội!</p>
      </section>
      <div className="segmented">
        <button className={tab === 'cards' ? 'active' : ''} onClick={() => setTab('cards')}>🎴 Thẻ</button>
        <button className={tab === 'shop' ? 'active' : ''} onClick={() => setTab('shop')}>🎁 Đổi quà</button>
        <button className={tab === 'rank' ? 'active' : ''} onClick={() => setTab('rank')}>🏆 Xếp hạng</button>
      </div>
      {tab === 'cards' && <Collection />}
      {tab === 'shop' && <VoucherShop />}
      {tab === 'rank' && <Leaderboard />}
    </div>
  )
}

function Collection() {
  const { user, profile, setProfile } = useAuth()
  const toast = useToast()
  const [cards, setCards] = useState([])
  const [owned, setOwned] = useState({})
  const [opening, setOpening] = useState(false)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    const [c, u] = await Promise.all([
      supabase.from('cards').select('*').order('sort_order'),
      supabase.from('user_cards').select('card_id, count').eq('user_id', user.id),
    ])
    if (c.data) setCards(c.data)
    if (u.data) setOwned(Object.fromEntries(u.data.map((x) => [x.card_id, x.count])))
  }, [user.id])

  useEffect(() => { load() }, [load])

  const openPack = async () => {
    setOpening(true)
    const { data, error } = await supabase.rpc('open_pack')
    setOpening(false)
    if (error) return toast(friendlyError(error), 'error')
    setProfile({ ...profile, coins: data.coins })
    setResult(data.cards)
    load()
  }

  const ownedCount = cards.filter((c) => owned[c.id]).length

  return (
    <>
      <section className="card pack-card">
        <div className="pack-art">🎁</div>
        <div className="pack-body">
          <h3>Gói thẻ Hà Nội</h3>
          <p className="muted small">3 thẻ ngẫu nhiên · có cơ hội ra thẻ Huyền thoại</p>
          <button className="btn gold" onClick={openPack} disabled={opening || (profile?.coins ?? 0) < PACK_COST}>
            {opening ? 'Đang mở…' : `Mở gói · 🪙 ${PACK_COST}`}
          </button>
          {(profile?.coins ?? 0) < PACK_COST && <p className="muted small">Làm thêm nhiệm vụ để có đủ coins nhé!</p>}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <h3>Bộ sưu tập</h3>
          <span className="muted small">{ownedCount}/{cards.length} thẻ</span>
        </div>
        <div className="progress"><div style={{ width: `${cards.length ? (ownedCount / cards.length) * 100 : 0}%` }} /></div>
        <div className="card-grid">
          {cards.map((c) => (
            <button key={c.id} className={`game-card${owned[c.id] ? '' : ' locked'}`} style={{ '--rar': RARITY[c.rarity].color }}
              onClick={() => owned[c.id] && setSelected(c)}>
              <span className="game-card-emoji">{owned[c.id] ? c.emoji : '❔'}</span>
              <span className="game-card-name">{owned[c.id] ? c.name : '???'}</span>
              {owned[c.id] > 1 && <span className="game-card-count">×{owned[c.id]}</span>}
            </button>
          ))}
        </div>
      </section>

      <Modal open={!!result} onClose={() => setResult(null)} title="Bạn nhận được">
        <div className="pack-result">
          {result?.map((c, i) => (
            <div key={i} className="game-card reveal" style={{ '--rar': RARITY[c.rarity].color, animationDelay: `${i * 0.15}s` }}>
              <span className="game-card-emoji">{c.emoji}</span>
              <span className="game-card-name">{c.name}</span>
              <span className="rarity" style={{ color: RARITY[c.rarity].color }}>{RARITY[c.rarity].label}</span>
            </div>
          ))}
        </div>
        <button className="btn primary block" onClick={() => setResult(null)}>Tuyệt!</button>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="celebrate">
            <div className="celebrate-emoji">{selected.emoji}</div>
            <h2>{selected.name}</h2>
            <div className="rarity" style={{ color: RARITY[selected.rarity].color }}>{RARITY[selected.rarity].label}</div>
            <p>{selected.description}</p>
            <p className="muted small">Bạn có {owned[selected.id]} thẻ này</p>
          </div>
        )}
      </Modal>
    </>
  )
}

function Leaderboard() {
  const { user } = useAuth()
  const { friends } = useOutletContext()
  const [scope, setScope] = useState('all')
  const [rows, setRows] = useState(null)
  const friendIds = friends.map((f) => f.other?.id).filter(Boolean)
  const friendKey = friendIds.join(',')

  useEffect(() => {
    setRows(null)
    let q = supabase.from('profiles').select('id, username, display_name, avatar, xp').order('xp', { ascending: false }).limit(30)
    if (scope === 'friends') q = q.in('id', [user.id, ...friendKey.split(',').filter(Boolean)])
    q.then(({ data }) => setRows(data || []))
  }, [scope, friendKey, user.id])

  const isFriend = (id) => friendIds.includes(id)

  return (
    <section className="card">
      <div className="chips">
        <button className={`chip${scope === 'all' ? ' active' : ''}`} onClick={() => setScope('all')}>🌏 Tất cả</button>
        <button className={`chip${scope === 'friends' ? ' active' : ''}`} onClick={() => setScope('friends')}>👥 Bạn bè</button>
      </div>
      {!rows ? <div className="spinner" /> : rows.map((r, i) => (
        <Link key={r.id} to={isFriend(r.id) ? `/u/${r.username}` : r.id === user.id ? '/me' : '#'}
          onClick={(e) => !isFriend(r.id) && r.id !== user.id && e.preventDefault()}
          className={`rank-row${r.id === user.id ? ' me' : ''}`}>
          <span className="rank-no">{['🥇', '🥈', '🥉'][i] || i + 1}</span>
          <span className="rank-avatar">{r.avatar}</span>
          <span className="rank-name">
            <strong>{r.display_name || r.username}</strong>
            <span className="muted small">@{r.username} · Lv {levelInfo(r.xp).level}</span>
          </span>
          <span className="rank-xp">{r.xp} XP</span>
        </Link>
      ))}
      {rows && scope === 'friends' && friendIds.length === 0 && (
        <p className="muted small center">Kết bạn để đua top cùng nhau! <Link to="/friends">Tìm bạn</Link></p>
      )}
    </section>
  )
}
