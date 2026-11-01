import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, friendlyError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { deletePhoto, signedUrls, uploadPhoto } from '../lib/photos'
import { Link } from 'react-router-dom'
import { loadLikes } from '../lib/friends'
import ReactionBar from '../components/ReactionBar'
import Modal from '../components/Modal'
import JournalGrid, { fmtDate } from '../components/JournalGrid'
import Emoji, { emojify } from '../components/Emoji'
import { tr } from '../lib/i18n'

export default function JournalPage() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [entries, setEntries] = useState([])
  const [urls, setUrls] = useState({})
  const [likes, setLikes] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // {} = mới, entry = sửa
  const [viewing, setViewing] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('journal_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) toast(friendlyError(error), 'error')
    else {
      setEntries(data)
      const [u, l] = await Promise.all([signedUrls(data.map((e) => e.photo_path)), loadLikes(data.map((e) => e.id), user.id)])
      setUrls(u)
      setLikes(l)
    }
    setLoading(false)
  }, [user.id, toast])

  useEffect(() => { load() }, [load])

  const remove = async (entry) => {
    if (!confirm(tr('Xoá trang nhật ký này?'))) return
    const { error } = await supabase.from('journal_entries').delete().eq('id', entry.id)
    if (error) return toast(friendlyError(error), 'error')
    // ảnh của nhiệm vụ vẫn giữ trong lịch sử hoàn thành, chỉ xoá ảnh tự thêm
    if (!entry.quest_id) deletePhoto(entry.photo_path)
    setViewing(null)
    load()
  }

  const places = new Set(entries.map((e) => e.place_name).filter(Boolean)).size
  const photos = entries.filter((e) => e.photo_path).length

  return (
    <div className="page">
      <section className="journal-cover">
        <div className="eyebrow light">My Hanoi Journal</div>
        <h1>{tr('Sổ hành trình')}</h1>
        <p className="cover-sub">{tr('Hà Nội của ')}{profile?.display_name || profile?.username}</p>
        <div className="cover-stats">
          <div><strong>{entries.length}</strong><span>{tr('Kỷ niệm')}</span></div>
          <div><strong>{photos}</strong><span>{tr('Bức ảnh')}</span></div>
          <div><strong>{places}</strong><span>{tr('Địa điểm')}</span></div>
        </div>
      </section>

      <div className="row tight">
        <button className="btn primary grow" onClick={() => setEditing({})}>{tr('＋ Thêm kỷ niệm')}</button>
        <Link to="/friends" className="btn"><Emoji e="👥" play="static" />{tr(' Bạn bè')}</Link>
      </div>

      {loading ? <div className="spinner" /> : entries.length === 0 ? (
        <div className="card empty">
          <div className="empty-emoji"><Emoji e="📖" play="loop" /></div>
          <p>{tr('Sổ hành trình còn trống. Hoàn thành một ')}<strong>Photo Quest</strong>{tr(' hoặc thêm kỷ niệm đầu tiên nhé!')}</p>
        </div>
      ) : (
        <JournalGrid entries={entries} urls={urls} likes={likes} onOpen={setViewing} />
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)}>
        {viewing && (
          <div className="entry-view">
            {viewing.photo_path && <img src={urls[viewing.photo_path]} alt={viewing.title} />}
            <h3>{viewing.title || tr('Không tiêu đề')}</h3>
            <div className="muted small">{fmtDate(viewing.created_at)}{emojify(viewing.place_name && ` · 📍 ${viewing.place_name}`)}{emojify(viewing.quest_id && tr(' · 🏅 Nhiệm vụ'))}</div>
            {viewing.note && <p className="entry-note">{viewing.note}</p>}
            <p className="muted small">
              {emojify(viewing.is_private ? tr('🔒 Chỉ mình bạn xem được') : tr('👥 Bạn bè xem được'))}
            </p>
            <ReactionBar entryId={viewing.id} userId={user.id} like={likes[viewing.id]} showPeople
              onChange={(like) => setLikes((m) => ({ ...m, [viewing.id]: like }))} />
            <div className="row">
              <button className="btn" onClick={() => { setEditing(viewing); setViewing(null) }}>{tr('Sửa')}</button>
              <button className="btn danger" onClick={() => remove(viewing)}>{tr('Xoá')}</button>
            </div>
          </div>
        )}
      </Modal>

      <EntryEditor entry={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
    </div>
  )
}

function EntryEditor({ entry, onClose, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)
  const [form, setForm] = useState({ title: '', note: '', place_name: '', is_private: false })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const isNew = entry && !entry.id

  useEffect(() => {
    if (entry) setForm({ title: entry.title || '', note: entry.note || '', place_name: entry.place_name || '', is_private: entry.is_private || false })
    setFile(null)
  }, [entry])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    let newPath = null
    try {
      if (file) newPath = await uploadPhoto(user.id, file)
      const payload = { ...form, ...(newPath && { photo_path: newPath }) }
      const { error } = isNew
        ? await supabase.from('journal_entries').insert({ ...payload, user_id: user.id })
        : await supabase.from('journal_entries').update(payload).eq('id', entry.id)
      if (error) throw error
      if (newPath && !isNew && entry.photo_path && !entry.quest_id) deletePhoto(entry.photo_path)
      newPath = null
      toast(tr('Đã lưu vào Sổ hành trình 📖'), 'success')
      onSaved()
    } catch (err) {
      toast(friendlyError(err), 'error')
    } finally {
      if (newPath) deletePhoto(newPath)
      setBusy(false)
    }
  }

  return (
    <Modal open={!!entry} onClose={onClose} title={isNew ? tr('Thêm kỷ niệm') : tr('Sửa kỷ niệm')}>
      <form onSubmit={save}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="button" className="photo-drop small" onClick={() => fileRef.current.click()}>
          <span><Emoji e="📷" play="static" /></span>{file ? file.name : entry?.photo_path ? tr('Đổi ảnh khác') : tr('Thêm ảnh (tuỳ chọn)')}
        </button>
        <label className="field"><span>{tr('Tiêu đề')}</span><input value={form.title} onChange={set('title')} maxLength={80} required /></label>
        <label className="field"><span>{tr('Địa điểm')}</span><input value={form.place_name} onChange={set('place_name')} maxLength={80} placeholder={tr('vd: Hồ Tây')} /></label>
        <label className="field"><span>{tr('Ghi chú')}</span><textarea rows={4} value={form.note} onChange={set('note')} maxLength={1000} /></label>
        <label className="switch-row">
          <input type="checkbox" checked={form.is_private} onChange={(e) => setForm({ ...form, is_private: e.target.checked })} />
          <span><Emoji e="🔒" play="static" />{tr(' Chỉ mình tôi ')}<small className="muted">{tr('(bạn bè sẽ không thấy trang này)')}</small></span>
        </label>
        <button className="btn primary block" disabled={busy}>{busy ? tr('Đang lưu…') : tr('Lưu')}</button>
      </form>
    </Modal>
  )
}
