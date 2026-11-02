import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { scanQr } from '../lib/qr'
import { friendlyError } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import Emoji from '../components/Emoji'
import { tr } from '../lib/i18n'

// Mở từ link trong mã QR (quét bằng ứng dụng Camera): xác nhận rồi chuyển tới nhiệm vụ của điểm đó
export default function ScanPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [error, setError] = useState(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    scanQr(token).then(({ data, error: err }) => {
      if (err) return setError(friendlyError(err))
      if (!data.ok) return setError(data.message)
      toast(tr('Đã xác nhận bạn đang ở điểm này bằng mã QR!'), 'success')
      navigate(`/quest/${data.quest_id}`, { replace: true })
    })
  }, [token, navigate, toast])

  return (
    <div className="page narrow">
      {error ? (
        <div className="card empty">
          <div className="empty-emoji"><Emoji e="😕" play="loop" /></div>
          <p>{error}</p>
          <button className="btn primary" onClick={() => navigate('/', { replace: true })}>{tr('Về trang chủ')}</button>
        </div>
      ) : (
        <div className="card empty">
          <div className="spinner" />
          <p className="muted">{tr('Đang kiểm tra mã QR…')}</p>
        </div>
      )}
    </div>
  )
}
