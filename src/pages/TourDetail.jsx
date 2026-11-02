import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MapContainer, Marker, Polyline } from 'react-leaflet'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQuests } from '../lib/data'
import { tourProgress, useTours, walkMinutes } from '../lib/tours'
import { distanceM, formatDistance } from '../lib/geo'
import { KIND } from '../lib/game'
import { pinIcon } from '../lib/mapIcons'
import BaseMap from '../components/BaseMap'
import Modal from '../components/Modal'
import ReviewSummary from '../components/ReviewSummary'
import TourCertificate from '../components/TourCertificate'
import Emoji, { emojify } from '../components/Emoji'
import { tr } from '../lib/i18n'

export default function TourDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const toast = useToast()
  const { quests, isDone, loading: lq } = useQuests()
  const { tours, claimed, loading, reload } = useTours()
  const [busy, setBusy] = useState(false)
  const [reward, setReward] = useState(null)
  const [reviewSignal, setReviewSignal] = useState(0)
  const [certSignal, setCertSignal] = useState(0)

  const tour = tours.find((t) => String(t.id) === id)
  const byId = useMemo(() => Object.fromEntries(quests.map((q) => [q.id, q])), [quests])

  if (loading || lq) return <div className="page"><div className="spinner" /></div>
  if (!tour) return <div className="page"><p className="muted">{tr('Không tìm thấy tour.')}</p></div>

  const stops = tour.stops.map((s) => ({ ...s, quest: byId[s.quest_id] })).filter((s) => s.quest)
  const progress = tourProgress(tour, (qid) => (byId[qid] ? isDone(byId[qid]) : false))
  const isClaimed = claimed.has(tour.id)
  const allDone = progress.done === progress.total
  const nextStop = stops.find((s) => !isDone(s.quest))

  // Điểm có toạ độ, theo thứ tự → vẽ lộ trình + tính quãng đường đi bộ
  const located = stops.filter((s) => s.quest.lat != null)
  const route = located.map((s) => [s.quest.lat, s.quest.lng])
  const legs = {}
  let totalM = 0
  located.forEach((s, i) => {
    if (i === 0) return
    const m = distanceM(located[i - 1].quest, s.quest)
    legs[s.quest_id] = m
    totalM += m
  })
  const bounds = route.length ? route : null

  const claim = async () => {
    setBusy(true)
    const { data, error } = await supabase.rpc('claim_tour', { p_tour_id: tour.id })
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    setReward(data)
    refreshProfile()
    reload()
  }

  let mapNo = 0

  return (
    <div className="page">
      <button className="ghost back" onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/tours', { replace: true }))}>{tr('← Quay lại')}</button>

      <section className="tour-hero" style={{ '--tour': tour.color }}>
        <span className="tour-hero-emoji"><Emoji e={tour.emoji} play="loop" /></span>
        <div className="eyebrow light">{tr('Tour theo chủ đề · ')}{tour.difficulty}</div>
        <h1>{tour.title}</h1>
        <p className="tour-sub">{tour.subtitle}</p>
        <div className="tour-progress light"><div style={{ width: `${progress.pct}%` }} /></div>
        <span className="small">{progress.done}/{progress.total}{tr(' điểm dừng · ')}{emojify(isClaimed ? tr('🏅 Đã hoàn thành') : tr('Thưởng hoàn thành: ⭐ +{0} · 🪙 +{1}', tour.bonus_xp, tour.bonus_coins))}</span>
      </section>

      <div className="info-grid">
        <div><span><Emoji e="⏱" play="static" />{tr(' Thời lượng')}</span><strong>{tour.duration}</strong></div>
        <div><span><Emoji e="🚶" play="static" />{tr(' Quãng đường')}</span><strong>{tr('Khoảng ')}{formatDistance(totalM * 1.3)}{tr(' đi bộ')}</strong></div>
        <div><span><Emoji e="💰" play="static" />{tr(' Chi phí ước tính')}</span><strong>{tour.est_cost}</strong></div>
        <div><span><Emoji e="🕗" play="static" />{tr(' Thời điểm đẹp')}</span><strong>{tour.best_time}</strong></div>
        <div className="span2"><span><Emoji e="👥" play="static" />{tr(' Phù hợp với')}</span><strong>{tour.audience}</strong></div>
      </div>

      <div className="two-col detail-cols">
      <div className="col">
      <p>{tour.description}</p>

      <section className="card">
        <div className="section-head"><h3><Emoji e="🗺️" play="static" />{tr(' Lộ trình')}</h3><span className="muted small">{stops.length}{tr(' điểm dừng')}</span></div>
        <ol className="timeline">
          {stops.map((s) => {
            const done = isDone(s.quest)
            const isNext = nextStop?.quest_id === s.quest_id
            return (
              <li key={s.quest_id} className={`${done ? 'done' : ''}${isNext ? ' next' : ''}`}>
                {legs[s.quest_id] != null && (
                  <div className="leg"><Emoji e="🚶" play="static" /> {formatDistance(legs[s.quest_id] * 1.3)}{tr(' · khoảng ')}{walkMinutes(legs[s.quest_id])}{tr(' phút đi bộ')}</div>
                )}
                <Link to={`/quest/${s.quest.id}`} className="stop">
                  <span className="stop-dot">{done ? '✓' : <Emoji e={s.quest.emoji} play="once" />}</span>
                  <span className="stop-body">
                    <span className="quest-kind">{emojify(KIND[s.quest.kind].label)}{s.quest.place_name && ` · ${s.quest.place_name}`}</span>
                    <strong>{s.quest.title}</strong>
                    {s.note && <span className="muted small"><Emoji e="💡" play="static" /> {s.note}</span>}
                  </span>
                  {isNext && <span className="tag ok">{tr('Tiếp theo')}</span>}
                </Link>
              </li>
            )
          })}
        </ol>
        {!isClaimed && (
          <button className="btn gold block big" disabled={!allDone || busy} onClick={claim}>
            {emojify(allDone ? (busy ? tr('Đang nhận…') : tr('🏅 Nhận thưởng hoàn thành tour')) : tr('Hoàn thành {0} điểm nữa để nhận thưởng', progress.total - progress.done))}
          </button>
        )}
        {!isClaimed && nextStop && (
          <Link to={`/quest/${nextStop.quest.id}`} className="btn primary block" style={{ marginTop: 8 }}>{tr('Đến điểm tiếp theo: ')}{nextStop.quest.title} →
          </Link>
        )}
      </section>
      </div>
      <div className="col sticky">
      {bounds && (
        <div className="mini-map tall">
          <MapContainer bounds={bounds} boundsOptions={{ padding: [36, 36] }} scrollWheelZoom={false} style={{ height: '100%' }}>
            <BaseMap />
            <Polyline positions={route} pathOptions={{ color: tour.color, weight: 4, dashArray: '8 8' }} />
            {located.map((s) => {
              mapNo += 1
              return <Marker key={s.quest_id} position={[s.quest.lat, s.quest.lng]} icon={pinIcon(isDone(s.quest) ? '✓' : String(mapNo), isDone(s.quest) ? 'done' : 'num')} />
            })}
          </MapContainer>
        </div>
      )}

      {isClaimed && <TourCertificate tour={tour} stops={stops} openSignal={certSignal} />}
      <ReviewSummary target={{ tourId: tour.id }} title={tour.title} canReview={isClaimed} openSignal={reviewSignal} />
      </div>
      </div>

      <Modal open={!!reward} onClose={() => setReward(null)}>
        <div className="celebrate">
          <div className="celebrate-emoji"><Emoji e="🏅" play="loop" /></div>
          <h2>{tr('Hoàn thành tour!')}</h2>
          <p>{tour.title}</p>
          <div className="reward-grid">
            <div><strong><Emoji e="⭐" play="once" /> +{reward?.xp}</strong><span>XP</span></div>
            <div><strong><Emoji e="🪙" play="once" /> +{reward?.coins}</strong><span>Coins</span></div>
            <div><strong><Emoji e="🏅" play="static" /></strong><span>{tr('Huy hiệu tour')}</span></div>
          </div>
          <p className="muted small">{tr('Hãy đánh giá tour để giúp người sau trải nghiệm tốt hơn (+20 ')}<Emoji e="🪙" play="static" />)</p>
          <div className="row">
            <button className="btn gold" onClick={() => { setReward(null); setCertSignal((n) => n + 1) }}><Emoji e="🎖️" play="static" />{tr(' Nhận chứng nhận')}</button>
            <button className="btn primary" onClick={() => { setReward(null); setReviewSignal((n) => n + 1) }}>{tr('Đánh giá ngay')}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
