import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet'
import { useQuests } from '../lib/data'
import { KIND } from '../lib/game'
import { distanceM, formatDistance, getPosition } from '../lib/geo'
import { pinIcon } from '../lib/mapIcons'
import BaseMap from '../components/BaseMap'
import { useToast } from '../context/ToastContext'
import Emoji, { emojify } from '../components/Emoji'
import { tr } from '../lib/i18n'

const HANOI = [21.0313, 105.8467]

function FlyTo({ pos }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.flyTo([pos.lat, pos.lng], 16, { duration: 0.8 })
  }, [map, pos])
  return null
}

// Chọn ở danh sách → bay tới địa điểm và mở popup
function FocusQuest({ quest, markers }) {
  const map = useMap()
  useEffect(() => {
    if (!quest) return
    map.flyTo([quest.lat, quest.lng], Math.max(map.getZoom(), 16), { duration: 0.6 })
    const t = setTimeout(() => markers.current[quest.id]?.openPopup(), 650)
    return () => clearTimeout(t)
  }, [map, quest, markers])
  return null
}

export default function MapPage() {
  const { quests, isDone, loading } = useQuests()
  const toast = useToast()
  const [pos, setPos] = useState(null)
  const [onlyTodo, setOnlyTodo] = useState(false)
  const [selected, setSelected] = useState(null)
  const markers = useRef({})
  const itemRefs = useRef({})

  const located = quests
    .filter((q) => q.lat != null && (!onlyTodo || !isDone(q)))
    .map((q) => ({ q, d: pos ? distanceM(pos, q) : null }))
    .sort((a, b) => (pos ? a.d - b.d : 0))

  const locate = async () => {
    try {
      setPos(await getPosition())
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  // bấm ghim trên bản đồ → làm nổi bật mục tương ứng trong danh sách
  const pickFromMap = (q) => {
    setSelected(null)
    itemRefs.current[q.id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    itemRefs.current[q.id]?.classList.add('flash')
    setTimeout(() => itemRefs.current[q.id]?.classList.remove('flash'), 1200)
  }

  return (
    <div className="map-layout">
      <aside className="map-list">
        <div className="map-list-head">
          <h2><Emoji e="🌏" play="loop" />{tr(' Bản đồ khám phá')}</h2>
          <p className="muted small">{loading ? tr('Đang tải…') : tr('{0} địa điểm', located.length)}{pos && tr(' · sắp xếp theo khoảng cách')}</p>
          <div className="chips">
            <button className={`chip${!onlyTodo ? ' active' : ''}`} onClick={() => setOnlyTodo(false)}>{tr('Tất cả')}</button>
            <button className={`chip${onlyTodo ? ' active' : ''}`} onClick={() => setOnlyTodo(true)}>{tr('Chưa làm')}</button>
            <button className="chip" onClick={locate}>{emojify(tr('📍 Gần tôi'))}</button>
          </div>
        </div>
        <div className="map-list-items">
          {located.map(({ q, d }) => (
            <button key={q.id} ref={(el) => (itemRefs.current[q.id] = el)}
              className={`map-item${selected?.id === q.id ? ' active' : ''}${isDone(q) ? ' done' : ''}`}
              onClick={() => setSelected(q)}>
              <span className="quest-emoji"><Emoji e={q.emoji} play="hover" /></span>
              <span className="quest-main">
                <span className="quest-kind">{emojify(KIND[q.kind].label)}{q.area && ` · ${q.area}`}</span>
                <span className="quest-title">{q.title}</span>
                <span className="quest-reward">
                  {isDone(q) ? tr('✓ Đã hoàn thành') : <><Emoji e="⭐" play="static" /> +{q.xp_reward} XP</>}
                  {d != null && ` · ${formatDistance(d)}`}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="map-page">
        <MapContainer center={HANOI} zoom={14} style={{ height: '100%' }} zoomControl={false}>
          <BaseMap />
          {located.map(({ q }) => (
            <Marker key={q.id} position={[q.lat, q.lng]} ref={(m) => (markers.current[q.id] = m)}
              icon={pinIcon(isDone(q) ? '✅' : q.emoji, isDone(q) ? 'done' : '')}
              eventHandlers={{ click: () => pickFromMap(q) }}>
              <Popup>
                <div className="popup">
                  <div className="eyebrow">{emojify(KIND[q.kind].label)}</div>
                  <strong>{q.title}</strong>
                  <div className="muted small">{q.place_name}</div>
                  <div className="small"><Emoji e="⭐" play="static" /> +{q.xp_reward} · <Emoji e="🪙" play="static" /> +{q.coin_reward}</div>
                  <Link to={`/quest/${q.id}`} className="btn primary small">{isDone(q) ? tr('Xem lại') : tr('Làm nhiệm vụ')}</Link>
                </div>
              </Popup>
            </Marker>
          ))}
          {pos && <Marker position={[pos.lat, pos.lng]} icon={pinIcon('🧍', 'me')} />}
          <FlyTo pos={pos} />
          <FocusQuest quest={selected} markers={markers} />
        </MapContainer>
        <div className="map-overlay top">
          <div className="map-title"><Emoji e="🗺️" play="static" />{tr(' Bản đồ khám phá ')}{loading ? '' : tr('· {0} địa điểm', located.length)}</div>
          <button className={`chip${onlyTodo ? ' active' : ''}`} onClick={() => setOnlyTodo(!onlyTodo)}>{tr('Chưa làm')}</button>
        </div>
        <button className="map-locate" onClick={locate} aria-label={tr('Vị trí của tôi')}>◎</button>
      </div>
    </div>
  )
}
