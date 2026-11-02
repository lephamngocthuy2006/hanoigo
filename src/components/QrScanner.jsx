import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { tr } from '../lib/i18n'

/**
 * Quét mã QR bằng camera sau. Dùng BarcodeDetector nếu trình duyệt có (Chrome/Android),
 * không thì dùng jsQR (Safari/iPhone) — chỉ tải khi mở máy quét.
 */
export default function QrScanner({ open, onClose, onResult }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => {
    if (!open) return
    let stream = null
    let raf = 0
    let stopped = false
    setError(null)

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (stopped) return stream.getTracks().forEach((t) => t.stop())
        const video = videoRef.current
        video.srcObject = stream
        await video.play()

        let detect
        if ('BarcodeDetector' in window && (await window.BarcodeDetector.getSupportedFormats?.())?.includes('qr_code')) {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
          detect = async () => (await detector.detect(video))[0]?.rawValue
        } else {
          const jsQR = (await import('jsqr')).default
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          detect = async () => {
            const w = video.videoWidth, h = video.videoHeight
            if (!w || !h) return null
            const scale = Math.min(1, 640 / Math.max(w, h))
            canvas.width = w * scale
            canvas.height = h * scale
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            return jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data
          }
        }

        const tick = async () => {
          if (stopped) return
          const text = await detect().catch(() => null)
          if (stopped) return
          if (text) {
            navigator.vibrate?.(40)
            onResultRef.current(text)
            return
          }
          raf = requestAnimationFrame(tick)
        }
        tick()
      } catch (e) {
        if (stopped) return
        setError(e.name === 'NotAllowedError'
          ? tr('Bạn chưa cho phép dùng camera. Hãy bật quyền camera cho trang web rồi thử lại.')
          : tr('Không mở được camera trên thiết bị này. Bạn có thể quét mã bằng ứng dụng Camera của điện thoại.'))
      }
    }
    start()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [open])

  return (
    <Modal open={open} onClose={onClose} title={tr('Quét mã QR tại điểm')}>
      {error ? (
        <p className="error">{error}</p>
      ) : (
        <div className="qr-scanner">
          <video ref={videoRef} playsInline muted />
          <div className="qr-frame" aria-hidden="true" />
        </div>
      )}
      <p className="muted small center">{tr('Hướng camera vào mã QR dán tại điểm dừng. Web sẽ tự nhận mã.')}</p>
    </Modal>
  )
}
