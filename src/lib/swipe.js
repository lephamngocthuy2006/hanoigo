import { useEffect, useRef } from 'react'

// Vuốt ngang để đổi tab (chỉ trên điện thoại, chỉ ở 5 trang của thanh dưới cùng).
// Nội dung trượt theo ngón tay; thả ra đủ xa / đủ nhanh thì sang tab bên cạnh.
const IGNORE = '.leaflet-container, .tour-scroller, .chips, .segmented, .modal-backdrop, .reaction-picker, input, textarea, select, [data-no-swipe]'
const EDGE = 24 // px sát mép: để dành cho cử chỉ "quay lại" của iPhone
const DIST = 70 // px tối thiểu
const FAST = 0.45 // px/ms: vuốt nhanh thì ngắn hơn cũng tính

// Phần tử (hoặc cha của nó) đang cuộn ngang được → để nó tự cuộn
function scrollsSideways(el, stop) {
  for (let n = el; n && n !== stop; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 4) {
      const ox = getComputedStyle(n).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
    }
  }
  return false
}

/**
 * ref: vùng nội dung để bắt cử chỉ và cho trượt theo tay.
 * tabs: danh sách đường dẫn theo thứ tự; current: đường dẫn hiện tại; go(to, dir): chuyển tab.
 */
export function useTabSwipe(ref, tabs, current, go) {
  const goRef = useRef(go)
  goRef.current = go

  useEffect(() => {
    const el = ref.current
    const idx = tabs.indexOf(current)
    if (!el || idx < 0 || !window.matchMedia('(max-width: 1023px) and (pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let s = null // { x, y, t, lock: null | 'x' | 'y' }
    const reset = (animate) => {
      el.style.transition = animate ? 'transform 0.22s ease-out, opacity 0.22s ease-out' : ''
      el.style.transform = ''
      el.style.opacity = ''
    }

    const onStart = (e) => {
      if (e.touches.length !== 1) return (s = null)
      const t = e.touches[0]
      if (t.clientX < EDGE || t.clientX > window.innerWidth - EDGE) return (s = null)
      if (e.target.closest(IGNORE) || scrollsSideways(e.target, el)) return (s = null)
      s = { x: t.clientX, y: t.clientY, t: e.timeStamp, lock: null }
    }
    const onMove = (e) => {
      if (!s) return
      const t = e.touches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (!s.lock && Math.hypot(dx, dy) > 10) s.lock = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'x' : 'y'
      if (s.lock !== 'x') return
      // không còn tab ở phía đó → trượt rất ít (cảm giác "chạm biên")
      const edge = (dx > 0 && idx === 0) || (dx < 0 && idx === tabs.length - 1)
      const shift = edge ? dx * 0.12 : dx * 0.45
      el.style.transition = ''
      el.style.transform = `translateX(${shift}px)`
      el.style.opacity = String(1 - Math.min(Math.abs(shift) / 600, 0.25))
    }
    const onEnd = (e) => {
      if (!s) return
      const was = s
      s = null
      if (was.lock !== 'x') return reset(false)
      const dx = (e.changedTouches[0]?.clientX ?? was.x) - was.x
      const speed = Math.abs(dx) / Math.max(1, e.timeStamp - was.t)
      const next = idx + (dx < 0 ? 1 : -1)
      if ((Math.abs(dx) > DIST || (Math.abs(dx) > 30 && speed > FAST)) && next >= 0 && next < tabs.length) {
        reset(false)
        goRef.current(tabs[next], dx < 0 ? 'left' : 'right')
      } else {
        reset(true)
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    const onCancel = () => { s = null; reset(true) }
    el.addEventListener('touchcancel', onCancel, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onCancel)
      reset(false)
    }
  }, [ref, tabs, current])
}
