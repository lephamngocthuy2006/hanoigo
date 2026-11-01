import { useEffect, useRef, useState } from 'react'

// Biểu tượng động dùng bộ Noto Animated Emoji của Google (CC BY 4.0).
// - Emoji có bản động: phát animation Lottie (nhẹ, nét ở mọi kích thước)
// - Emoji không có bản động: ảnh SVG tĩnh cùng bộ Noto để đồng bộ phong cách
// - Lỗi mạng: quay về emoji của hệ điều hành
const BASE = 'https://fonts.gstatic.com/s/e/notoemoji/latest/'

const ANIMATED = new Set(
  ('23f3 2615 2699 26a0 2705 270c 270d 270f 274c 2753 2764 2b50 2728 1f195 1f305 1f307 1f30d 1f30e 1f30f 1f31f 1f338 ' +
    '1f33c 1f343 1f35c 1f381 1f389 1f393 1f39f 1f3ad 1f3af 1f3c6 1f41f 1f422 1f427 1f431 1f438 1f43c 1f44d 1f44e ' +
    '1f44f 1f451 1f48e 1f4a1 1f4aa 1f4ab 1f4ac 1f4af 1f4b8 1f4c8 1f4ca 1f4e3 1f4f7 1f4f8 1f50e 1f512 1f514 1f525 ' +
    '1f5d1 1f60d 1f64c 1f64f 1f680 1f682 1f90d 1f91d 1f929 1f947 1f948 1f949 1f962 1f970 1f973 1f981 1f984 1f98a ' +
    '1fa99 1fab7').split(' '),
)

export const toCodepoint = (e) =>
  Array.from(e || '')
    .map((c) => c.codePointAt(0).toString(16))
    .filter((cp) => cp !== 'fe0f')
    .join('_')

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Tải lottie-web và file animation một lần, dùng lại cho mọi chỗ
let lottiePromise
const loadLottie = () => (lottiePromise ??= import('lottie-web/build/player/lottie_light').then((m) => m.default))
const dataCache = new Map()
const loadData = (cp) => {
  if (!dataCache.has(cp)) {
    dataCache.set(cp, fetch(`${BASE}${cp}/lottie.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status)))))
  }
  return dataCache.get(cp)
}

/**
 * play: 'loop'   – lặp liên tục khi đang hiện trên màn hình (điểm nhấn)
 *       'once'   – chạy 1 lần khi xuất hiện, sau đó đứng yên (danh sách)
 *       'hover'  – chạy khi rê chuột / chạm vào
 *       'static' – không chuyển động
 */
export default function Emoji({ e, size = '1.2em', play = 'loop', label, className = '' }) {
  const cp = toCodepoint(e)
  const canAnimate = ANIMATED.has(cp) && play !== 'static' && !reducedMotion()
  const boxRef = useRef(null)
  const animRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    if (!canAnimate) return
    let cancelled = false
    let observer
    const el = boxRef.current

    Promise.all([loadLottie(), loadData(cp)])
      .then(([lottie, data]) => {
        if (cancelled || !el) return
        const anim = lottie.loadAnimation({
          container: el,
          renderer: 'svg',
          loop: play === 'loop',
          autoplay: false,
          // mỗi instance cần bản sao riêng vì lottie sửa trực tiếp dữ liệu
          animationData: structuredClone(data),
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
        })
        animRef.current = anim
        anim.addEventListener('DOMLoaded', () => !cancelled && setReady(true))
        if (play === 'once') anim.addEventListener('complete', () => anim.goToAndStop(0, true))

        // chỉ chạy khi đang nằm trong màn hình để tiết kiệm pin
        let playedOnce = false
        observer = new IntersectionObserver(([entry]) => {
          if (play === 'hover') return
          if (entry.isIntersecting) {
            if (play === 'loop') anim.play()
            else if (!playedOnce) {
              playedOnce = true
              anim.goToAndPlay(0, true)
            }
          } else if (play === 'loop') anim.pause()
        })
        observer.observe(el)
      })
      .catch(() => {}) // giữ ảnh tĩnh nếu không tải được

    return () => {
      cancelled = true
      observer?.disconnect()
      animRef.current?.destroy()
      animRef.current = null
      setReady(false)
    }
  }, [cp, canAnimate, play])

  const onEnter = () => {
    if (play === 'hover' && animRef.current) animRef.current.goToAndPlay(0, true)
  }

  if (!e) return null
  const style = { width: size, height: size }

  if (broken) {
    return <span className={`emo emo-text ${className}`} style={{ fontSize: size }} role="img" aria-label={label}>{e}</span>
  }

  return (
    <span className={`emo ${className}`} style={style} role="img" aria-label={label || e} onPointerEnter={onEnter}>
      {!ready && (
        <img src={`${BASE}${cp}/emoji.svg`} alt="" draggable="false" loading="lazy" onError={() => setBroken(true)} />
      )}
      {canAnimate && <span ref={boxRef} className="emo-anim" style={{ opacity: ready ? 1 : 0 }} />}
    </span>
  )
}
