import { useState } from 'react'
import { MapContainer, Marker, useMapEvents } from 'react-leaflet'
import { supabase, friendlyError } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { CATEGORIES } from '../lib/partner'
import { getPosition } from '../lib/geo'
import { pinIcon } from '../lib/mapIcons'
import BaseMap from './BaseMap'
import Emoji, { emojify } from './Emoji'
import { tr } from '../lib/i18n'

const HANOI = [21.0313, 105.8467]

function ClickToPick({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

// Đăng ký đối tác mới hoặc sửa hồ sơ đối tác
export default function PartnerProfileForm({ partner, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: partner?.name || '',
    category: partner?.category || 'cafe',
    description: partner?.description || '',
    address: partner?.address || '',
    phone: partner?.phone || '',
    emoji: partner?.emoji || CATEGORIES.cafe.emoji,
  })
  const [loc, setLoc] = useState(partner?.lat != null ? { lat: partner.lat, lng: partner.lng } : null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const pickCategory = (c) => setForm({ ...form, category: c, emoji: CATEGORIES[c].emoji })

  const useMyLocation = async () => {
    try {
      setLoc(await getPosition())
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!loc) return toast(tr('Hãy chọn vị trí địa điểm trên bản đồ'), 'error')
    setBusy(true)
    const payload = { ...form, name: form.name.trim(), lat: loc.lat, lng: loc.lng }
    const { error } = partner
      ? await supabase.from('partners').update(payload).eq('id', partner.id)
      : await supabase.from('partners').insert(payload)
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    toast(partner ? tr('Đã cập nhật hồ sơ đối tác') : tr('Đã gửi đăng ký! Chờ quản trị viên duyệt nhé.'), 'success')
    onSaved()
  }

  return (
    <form onSubmit={save}>
      <label className="field"><span>{tr('Tên địa điểm / thương hiệu')}</span>
        <input value={form.name} onChange={set('name')} required minLength={2} maxLength={60} placeholder={tr('vd: Cà phê Phố Cổ')} /></label>
      <div className="field"><span>{tr('Loại hình')}</span>
        <div className="chips wrap">
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <button type="button" key={k} className={`chip${form.category === k ? ' active' : ''}`} onClick={() => pickCategory(k)}>{emojify(c.emoji)} {emojify(c.label)}</button>
          ))}
        </div>
      </div>
      <label className="field"><span>{tr('Giới thiệu ngắn')}</span>
        <textarea rows={2} value={form.description} onChange={set('description')} maxLength={300} placeholder={tr('Điều đặc biệt ở địa điểm của bạn…')} /></label>
      <label className="field"><span>{tr('Địa chỉ')}</span>
        <input value={form.address} onChange={set('address')} maxLength={120} placeholder={tr('vd: 11 Hàng Gai, Hoàn Kiếm')} /></label>
      <label className="field"><span>{tr('Số điện thoại')}</span>
        <input value={form.phone} onChange={set('phone')} maxLength={20} inputMode="tel" /></label>
      <div className="field">
        <span>{tr('Vị trí trên bản đồ ')}<small className="muted">{tr('(chạm vào bản đồ để chọn)')}</small></span>
        <div className="mini-map">
          <MapContainer center={loc ? [loc.lat, loc.lng] : HANOI} zoom={15} style={{ height: '100%' }}>
            <BaseMap />
            <ClickToPick onPick={setLoc} />
            {loc && <Marker position={[loc.lat, loc.lng]} icon={pinIcon(form.emoji)} />}
          </MapContainer>
        </div>
        <button type="button" className="ghost small" style={{ alignSelf: 'flex-start' }} onClick={useMyLocation}><Emoji e="📍" play="static" />{tr(' Dùng vị trí hiện tại')}</button>
      </div>
      <button className="btn primary block" disabled={busy}>{busy ? tr('Đang lưu…') : partner ? tr('Lưu hồ sơ') : tr('Gửi đăng ký đối tác')}</button>
    </form>
  )
}
