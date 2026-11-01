import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MapContainer, Marker, Circle } from 'react-leaflet'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQuests } from '../lib/data'
import { KIND } from '../lib/game'
import { distanceM, formatDistance, getPosition } from '../lib/geo'
import { deletePhoto, uploadPhoto } from '../lib/photos'
import { pinIcon } from '../lib/mapIcons'
import BaseMap from '../components/BaseMap'
import Modal from '../components/Modal'
import ReviewSummary from '../components/ReviewSummary'
import { useTours } from '../lib/tours'

// key theo id để mỗi nhiệm vụ có state riêng (ảnh, đáp án, popup thưởng…)
export default function QuestDetail() {
  const { id } = useParams()
  return <QuestDetailInner key={id} id={id} />
}

function QuestDetailInner({ id }) {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const { tours } = useTours()
  const [reviewSignal, setReviewSignal] = useState(0)
  const toast = useToast()
  const { quests, isDone, loading, reload } = useQuests()
  const quest = quests.find((q) => String(q.id) === id)

  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [note, setNote] = useState('')
  const [pos, setPos] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [busy, setBusy] = useState(false)
  const [reward, setReward] = useState(null)

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  if (loading) return <div className="page"><div className="spinner" /></div>
  if (!quest) return <div className="page"><p className="muted">Không tìm thấy nhiệm vụ.</p></div>

  const done = isDone(quest)
  const inTours = tours.filter((t) => t.stops.some((s) => s.quest_id === quest.id))
  const needsLocation = quest.kind === 'checkin' || quest.require_location
  const dist = pos && quest.lat != null ? distanceM(pos, quest) : null

  const pickFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) return toast('Vui lòng chọn một file ảnh', 'error')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const locate = async () => {
    try {
      const p = await getPosition()
      setPos(p)
      return p
    } catch (e) {
      toast(e.message, 'error')
      return null
    }
  }

  const submit = async () => {
    setBusy(true)
    let photoPath = null
    try {
      let p = pos
      if (needsLocation && !p) {
        // tài khoản demo vẫn thử lấy vị trí nhưng không bắt buộc
        p = profile?.is_demo ? await getPosition().catch(() => null) : await locate()
        if (!p && !profile?.is_demo) return
      }
      if (quest.kind === 'photo') {
        if (!file) return toast('Hãy chụp hoặc chọn một bức ảnh trước nhé', 'error')
        photoPath = await uploadPhoto(user.id, file)
      }
      const { data, error } = await supabase.rpc('complete_quest', {
        p_quest_id: quest.id,
        p_photo_path: photoPath,
        p_lat: p?.lat ?? null,
        p_lng: p?.lng ?? null,
        p_answer: quest.kind === 'quiz' ? answer : null,
        p_note: note || null,
      })
      if (error) throw error
      if (!data.ok) {
        toast(data.message, 'error')
        return
      }
      photoPath = null // đã lưu thành công, không xoá
      setReward(data)
      refreshProfile()
      reload()
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      if (photoPath) deletePhoto(photoPath)
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <button className="ghost back" onClick={() => navigate(-1)}>← Quay lại</button>

      <div className="detail-head">
        <span className="detail-emoji">{quest.emoji}</span>
        <div>
          <div className="eyebrow">{KIND[quest.kind].label}{quest.is_daily && ' · Hằng ngày'}</div>
          <h1>{quest.title}</h1>
          {quest.place_name && <div className="muted">📍 {quest.place_name}{quest.area && ` · ${quest.area}`}</div>}
        </div>
      </div>

      <p>{quest.description}</p>

      <div className="reward-grid">
        <div><strong>⭐ +{quest.xp_reward}</strong><span>XP</span></div>
        <div><strong>🪙 +{quest.coin_reward}</strong><span>Coins</span></div>
        <div><strong>{quest.kind === 'photo' ? '📖 +1' : '🔥'}</strong><span>{quest.kind === 'photo' ? 'Trang nhật ký' : 'Streak'}</span></div>
      </div>

      {quest.tip && <div className="tip">💡 {quest.tip}</div>}

      {quest.partners && (
        <section className="card partner-card">
          <span className="partner-emoji small">{quest.partners.emoji}</span>
          <div>
            <div className="eyebrow">🏪 Đối tác HANOI GO!</div>
            <strong>{quest.partners.name}</strong>
            {quest.partners.description && <p className="small">{quest.partners.description}</p>}
            <span className="muted small">{quest.partners.address}{quest.partners.phone && ` · ☎ ${quest.partners.phone}`}</span>
            <Link to="/events" state={{ tab: 'shop' }} className="ghost small" style={{ alignSelf: 'flex-start', marginTop: 6 }}>🎁 Xem ưu đãi đối tác</Link>
          </div>
        </section>
      )}

      {inTours.length > 0 && (
        <div className="chips">
          {inTours.map((t) => (
            <Link key={t.id} to={`/tour/${t.id}`} className="chip tour-link" style={{ '--tour': t.color }}>{t.emoji} Thuộc tour: {t.title}</Link>
          ))}
        </div>
      )}

      {(quest.opening_hours || quest.ticket_info || quest.story || quest.etiquette) && (
        <section className="card place-info">
          <h3>🏛️ Thông tin điểm đến</h3>
          <div className="info-grid compact">
            {quest.opening_hours && <div><span>🕗 Giờ mở cửa</span><strong>{quest.opening_hours}</strong></div>}
            {quest.ticket_info && <div><span>🎫 Vé tham quan</span><strong>{quest.ticket_info}</strong></div>}
          </div>
          {quest.story && <div className="story"><b>📜 Câu chuyện</b><p>{quest.story}</p></div>}
          {quest.etiquette && <div className="etiquette"><b>🙏 Lưu ý văn hoá</b><p>{quest.etiquette}</p></div>}
          <p className="muted small">Thông tin mang tính tham khảo, có thể thay đổi theo thời điểm.</p>
        </section>
      )}

      {quest.lat != null && (
        <div className="mini-map">
          <MapContainer center={[quest.lat, quest.lng]} zoom={16} scrollWheelZoom={false} style={{ height: '100%' }}>
            <BaseMap />
            <Marker position={[quest.lat, quest.lng]} icon={pinIcon(quest.emoji)} />
            {needsLocation && <Circle center={[quest.lat, quest.lng]} radius={quest.radius_m} pathOptions={{ color: '#8f2d3a' }} />}
            {pos && <Marker position={[pos.lat, pos.lng]} icon={pinIcon('🧍', 'me')} />}
          </MapContainer>
          <a className="map-link" target="_blank" rel="noreferrer"
            href={`https://www.google.com/maps/dir/?api=1&destination=${quest.lat},${quest.lng}`}>Chỉ đường ↗</a>
        </div>
      )}

      {done ? (
        <div className="card done-card">
          ✅ {quest.is_daily ? 'Bạn đã hoàn thành nhiệm vụ này hôm nay. Mai quay lại nhé!' : 'Bạn đã hoàn thành nhiệm vụ này.'}
        </div>
      ) : (
        <section className="card action-card">
          {quest.kind === 'photo' && (
            <>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={pickFile} />
              {preview ? (
                <div className="photo-preview">
                  <img src={preview} alt="Ảnh đã chọn" />
                  <button className="ghost small" onClick={() => fileRef.current.click()}>Chụp lại</button>
                </div>
              ) : (
                <button className="photo-drop" onClick={() => fileRef.current.click()}>
                  <span>📷</span>
                  Chụp ảnh hoặc chọn từ thư viện
                </button>
              )}
              <label className="field">
                <span>Ghi chú cho Sổ hành trình (tuỳ chọn)</span>
                <textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hôm nay mình đi cùng…" />
              </label>
            </>
          )}

          {quest.kind === 'quiz' && (
            <>
              <h3>{quest.quiz_question}</h3>
              <div className="quiz-options">
                {(quest.quiz_options || []).map((opt, i) => (
                  <button key={i} className={`quiz-opt${answer === i ? ' picked' : ''}`} onClick={() => setAnswer(i)}>
                    <span>{String.fromCharCode(65 + i)}</span>{opt}
                  </button>
                ))}
              </div>
            </>
          )}

          {needsLocation && (
            <div className="loc-row">
              <span className="muted">
                {dist != null ? `Bạn đang cách ${formatDistance(dist)} (cần trong ${quest.radius_m} m)` : 'Cần bật định vị khi đến nơi.'}
              </span>
              <button className="ghost small" onClick={locate}>📍 Lấy vị trí</button>
            </div>
          )}

          <button className="btn primary block big" onClick={submit}
            disabled={busy || (quest.kind === 'photo' && !file) || (quest.kind === 'quiz' && answer == null)}>
            {busy ? 'Đang gửi…' : quest.kind === 'photo' ? '📸 Hoàn thành & lưu ảnh' : quest.kind === 'quiz' ? 'Trả lời' : '📍 Check-in ngay'}
          </button>
        </section>
      )}

      {quest.kind !== 'quiz' && (
        <ReviewSummary target={{ questId: quest.id }} title={quest.title} canReview={done} openSignal={reviewSignal} />
      )}

      <Modal open={!!reward} onClose={() => navigate('/')}>
        <div className="celebrate">
          <div className="celebrate-emoji">🎉</div>
          <h2>Hoàn thành!</h2>
          <p>{quest.title}</p>
          <div className="reward-grid">
            <div><strong>⭐ +{reward?.xp}</strong><span>XP</span></div>
            <div><strong>🪙 +{reward?.coins}</strong><span>Coins</span></div>
            <div><strong>🔥 {reward?.streak}</strong><span>ngày liên tiếp</span></div>
          </div>
          <div className="row">
            {quest.kind === 'photo' && <button className="btn" onClick={() => navigate('/journal')}>Xem Sổ hành trình</button>}
            {quest.kind !== 'quiz' && (
              <button className="btn gold" onClick={() => { setReward(null); setReviewSignal((n) => n + 1) }}>⭐ Đánh giá +20 🪙</button>
            )}
            <button className="btn primary" onClick={() => navigate('/')}>Nhiệm vụ khác</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
