import { useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { askLater, pushSupported, signupInviteDue, signupInviteLater, usePush } from '../lib/push'
import { supabase, friendlyError } from '../lib/supabase'
import Modal from './Modal'
import Emoji from './Emoji'
import { tr } from '../lib/i18n'

/**
 * Tự mời bật thông báo đẩy một lần sau khi vào web (chờ vài giây cho trang tải xong).
 * Trình duyệt chỉ cho xin quyền khi người dùng bấm nút → bấm "Bật" mới hiện hộp thoại Cho phép / Chặn.
 * "Để sau" thì 7 ngày nữa mới mời lại; vẫn bật / tắt được bất cứ lúc nào trong Cài đặt.
 *
 * Quản trị viên chưa bật "Báo khi có người đăng ký" (vd. vừa được cấp quyền mà không biết):
 * lời mời ghi rõ quyền quản trị, một nút bật cả báo người đăng ký lẫn thông báo đẩy về máy.
 */
export default function PushInvite({ userId }) {
  const toast = useToast()
  const push = usePush(userId)
  const { profile, refreshProfile } = useAuth()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('push') // 'push' | 'admin'
  const [busy, setBusy] = useState(false)

  const adminDue = !!profile?.is_admin && profile.notify_signups === false && signupInviteDue(userId)

  useEffect(() => {
    if (push.state === null || (!adminDue && !push.shouldInvite)) return
    const t = setTimeout(() => {
      setMode(adminDue ? 'admin' : 'push')
      setOpen(true)
    }, 4000)
    return () => clearTimeout(t)
  }, [push.shouldInvite, push.state, adminDue])

  const later = () => {
    if (mode === 'admin') signupInviteLater(userId)
    if (push.shouldInvite) askLater()
    setOpen(false)
  }

  const accept = async () => {
    setBusy(true)
    try {
      if (mode === 'admin') {
        const { error } = await supabase.rpc('set_notify_signups', { p_on: true })
        if (error) throw error
        await refreshProfile()
      }
      // thông báo đẩy về máy (nếu trình duyệt hỗ trợ và chưa bật)
      if (pushSupported() && push.state === 'off' && Notification.permission !== 'denied') await push.enable()
      const pushOn = pushSupported() && Notification.permission === 'granted'
      if (mode === 'admin') {
        toast(pushOn ? tr('Đã bật! Mỗi tài khoản mới đăng ký sẽ báo về máy này.') : tr('Đã bật! Tài khoản mới sẽ hiện trong 🔔 Thông báo.'), 'success')
      } else if (pushOn) {
        toast(tr('Đã bật! Bạn sẽ nhận thông báo kể cả khi đóng web.'), 'success')
      } else {
        askLater()
      }
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
    setBusy(false)
    setOpen(false)
  }

  const isAdmin = mode === 'admin'
  return (
    <Modal open={open} onClose={later}>
      <div className="celebrate push-invite">
        <div className="celebrate-emoji"><Emoji e={isAdmin ? '🛡️' : '🔔'} play="loop" /></div>
        <h2>{isAdmin ? tr('Bạn có quyền quản trị') : tr('Bật thông báo nhé?')}</h2>
        <p>{isAdmin
          ? tr('Bật thông báo để biết ngay mỗi khi có người đăng ký tài khoản mới (giúp phát hiện spam sớm) — kèm tương tác của bạn bè.')
          : tr('Biết ngay khi bạn bè thả cảm xúc, bình luận kỷ niệm hay gửi lời mời kết bạn — kể cả khi đã đóng web.')}</p>
        <div className="row">
          <button className="btn primary" disabled={busy || push.busy} onClick={accept}>{busy || push.busy ? tr('Đang xử lý…') : tr('Bật thông báo')}</button>
          <button className="btn" onClick={later}>{tr('Để sau')}</button>
        </div>
        <p className="muted small">{tr('Bạn có thể bật / tắt bất cứ lúc nào trong ⚙️ Cài đặt.')}</p>
      </div>
    </Modal>
  )
}
