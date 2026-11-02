import { useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext'
import { askLater, usePush } from '../lib/push'
import { friendlyError } from '../lib/supabase'
import Modal from './Modal'
import Emoji from './Emoji'
import { tr } from '../lib/i18n'

/**
 * Tự mời bật thông báo đẩy một lần sau khi vào web (chờ vài giây cho trang tải xong).
 * Trình duyệt chỉ cho xin quyền khi người dùng bấm nút → bấm "Bật" mới hiện hộp thoại Cho phép / Chặn.
 * "Để sau" thì 7 ngày nữa mới mời lại; vẫn bật / tắt được bất cứ lúc nào trong Cài đặt.
 */
export default function PushInvite({ userId }) {
  const toast = useToast()
  const push = usePush(userId)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!push.shouldInvite) return
    const t = setTimeout(() => setOpen(true), 4000)
    return () => clearTimeout(t)
  }, [push.shouldInvite])

  const later = () => {
    askLater()
    setOpen(false)
  }

  const accept = async () => {
    try {
      await push.enable()
      if (Notification.permission === 'granted') toast(tr('Đã bật! Bạn sẽ nhận thông báo kể cả khi đóng web.'), 'success')
      else askLater()
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
    setOpen(false)
  }

  return (
    <Modal open={open} onClose={later}>
      <div className="celebrate push-invite">
        <div className="celebrate-emoji"><Emoji e="🔔" play="loop" /></div>
        <h2>{tr('Bật thông báo nhé?')}</h2>
        <p>{tr('Biết ngay khi bạn bè thả cảm xúc, bình luận kỷ niệm hay gửi lời mời kết bạn — kể cả khi đã đóng web.')}</p>
        <div className="row">
          <button className="btn primary" disabled={push.busy} onClick={accept}>{push.busy ? tr('Đang xử lý…') : tr('Bật thông báo')}</button>
          <button className="btn" onClick={later}>{tr('Để sau')}</button>
        </div>
        <p className="muted small">{tr('Bạn có thể bật / tắt bất cứ lúc nào trong ⚙️ Cài đặt.')}</p>
      </div>
    </Modal>
  )
}
