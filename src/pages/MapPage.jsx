import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet'
import { useQuests } from '../lib/data'
import { KIND } from '../lib/game'
import { getPosition } from '../lib/geo'
import { pinIcon } from '../lib/mapIcons'
import BaseMap from '../components/BaseMap'
import { useToast } from '../context/ToastContext'
import Emoji, { emojify } from '../components/Emoji'

const HANOI = [21.0313, 105.8467]

function FlyTo({ pos }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.flyTo([pos.lat, pos.lng], 16, { duration: 0.8 })
  }, [map, pos])
  return null
}

export default function MapPage() {
  const { quests, isDone, loading } = useQuests()
  const toast = useToast()
  const [pos, setPos] = useState(null)
  const [onlyTodo, setOnlyTodo] = useState(false)

  const located = quests.filter((q) => q.lat != null && (!onlyTodo || !isDone(q)))

  const locate = async () => {
    try {
      setPos(await getPosition())
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <div className="map-page">
      <MapContainer center={HANOI} zoom={14} style={{ height: '100%' }} zoomControl={false}>
        <BaseMap />
        {located.map((q) => (
          <Marker key={q.id} position={[q.lat, q.lng]} icon={pinIcon(isDone(q) ? '✅' : q.emoji, isDone(q) ? 'done' : '')}>
            <Popup>
              <div className="popup">
                <div className="eyebrow">{emojify(KIND[q.kind].label)}</div>
                <strong>{q.title}</strong>
                <div className="muted small">{q.place_name}</div>
                <div className="small"><Emoji e="⭐" play="static" /> +{q.xp_reward} · <Emoji e="🪙" play="static" /> +{q.coin_reward}</div>
                <Link to={`/quest/${q.id}`} className="btn primary small">{isDone(q) ? 'Xem lại' : 'Làm nhiệm vụ'}</Link>
              </div>
            </Popup>
          </Marker>
        ))}
        {pos && <Marker position={[pos.lat, pos.lng]} icon={pinIcon('🧍', 'me')} />}
        <FlyTo pos={pos} />
      </MapContainer>
      <div className="map-overlay top">
        <div className="map-title"><Emoji e="🗺️" play="static" /> Bản đồ khám phá {loading ? '' : `· ${located.length} địa điểm`}</div>
        <button className={`chip${onlyTodo ? ' active' : ''}`} onClick={() => setOnlyTodo(!onlyTodo)}>Chưa làm</button>
      </div>
      <button className="map-locate" onClick={locate} aria-label="Vị trí của tôi">◎</button>
    </div>
  )
}
