import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from './Logo'
import Emoji from './Emoji'
import LangSwitch from './LangSwitch'
import PraiseWords from './PraiseWords'
import { ADMIN_CONTACTS } from '../lib/site'
import { tr } from '../lib/i18n'

const COLORS = ['#f2cf63', '#ffe9a8', '#e8505b', '#ff8fa3', '#ffffff', '#8fd3ff', '#c9a4ff']
const rand = (a, b) => a + Math.random() * (b - a)

// Một đợt hoa giấy: mỗi mảnh có vị trí, màu, tốc độ, độ xoay riêng
function makeConfetti(n, burst = false) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${Date.now()}-${i}-${Math.random()}`,
    left: burst ? rand(30, 70) : rand(0, 100),
    color: COLORS[i % COLORS.length],
    w: rand(6, 11),
    h: rand(10, 18),
    dur: burst ? rand(1.6, 2.8) : rand(6, 12),
    delay: burst ? rand(0, 0.25) : rand(-12, 0),
    drift: rand(-90, 90),
    spin: rand(360, 1080) * (Math.random() < 0.5 ? -1 : 1),
    round: Math.random() < 0.25,
  }))
}

/**
 * Trang "Web tạm ngưng" — hiện cho mọi người khi chủ web bật tạm ngưng.
 * Không có nút đăng nhập / đăng xuất: chủ web vào thẳng đường dẫn #/login để đăng nhập.
 * mode: 'preview' (chủ web xem thử → nút quay lại web), còn lại hiện như mọi người
 */
export default function SitePaused({ mode = 'guest' }) {
  const navigate = useNavigate()
  const rain = useMemo(() => makeConfetti(46), [])
  const sparkles = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ id: i, x: rand(2, 98), y: rand(2, 98), d: rand(1.8, 4), delay: rand(0, 4), s: rand(0.5, 1.2) })), [])
  const [bursts, setBursts] = useState([])

  // chạm vào ảnh → bắn thêm một chùm hoa giấy
  const celebrate = () => {
    const pieces = makeConfetti(36, true)
    setBursts((b) => [...b, ...pieces])
    setTimeout(() => setBursts((b) => b.filter((p) => !pieces.includes(p))), 3200)
  }

  return (
    <div className="paused">
      <div className="paused-sky" aria-hidden="true">
        <span className="aurora a1" /><span className="aurora a2" /><span className="aurora a3" />
        {sparkles.map((s) => (
          <span key={s.id} className="spark" style={{ left: `${s.x}%`, top: `${s.y}%`, '--d': `${s.d}s`, '--delay': `${s.delay}s`, '--s': s.s }} />
        ))}
        {[...rain, ...bursts].map((c) => (
          <span key={c.id} className={`confetti${c.round ? ' round' : ''}${c.dur < 3 ? ' burst' : ''}`} style={{
            left: `${c.left}%`, width: c.w, height: c.round ? c.w : c.h, background: c.color,
            '--dur': `${c.dur}s`, '--delay': `${c.delay}s`, '--drift': `${c.drift}px`, '--spin': `${c.spin}deg`,
          }} />
        ))}
      </div>

      <main className="paused-body">
        <div className="paused-top">
          <span className="paused-brand"><Logo size={34} /><b>HANOI GO!</b></span>
          <LangSwitch className="paused-lang" />
        </div>

        <div className="paused-ribbon">
          <Emoji e="🏆" play="loop" />
          <span>{tr('Quán quân · NextGen Tourism Leader 2026')}</span>
          <Emoji e="🏆" play="loop" />
        </div>

        <button type="button" className="paused-photo" onClick={celebrate} aria-label={tr('Chạm để bắn pháo hoa giấy')}>
          <span className="photo-ring" aria-hidden="true" />
          <span className="photo-inner">
            <img src={`${import.meta.env.BASE_URL}award.jpg`} alt={tr('Khoảnh khắc nhận Giải Quán quân NextGen Tourism Leader 2026')} />
            <span className="photo-shine" aria-hidden="true" />
          </span>
          <PraiseWords />
          <span className="photo-tag"><Emoji e="🎉" play="loop" /> {tr('Khoảnh khắc nhận giải')}</span>
        </button>

        <h1 className="paused-title">
          <span className="line1">{tr('HANOI GO! xin phép')}</span>
          <span className="line2">{tr('tạm ngưng một thời gian')}</span>
        </h1>

        <p className="paused-text">
          {tr('Cảm ơn bạn đã cùng HANOI GO! dạo khắp Hà Nội! Dự án đã khép lại chặng đường thi thật đẹp với')}{' '}
          <strong>{tr('Giải Quán quân NextGen Tourism Leader 2026')}</strong>{' '}
          {tr('tại Trường Đại học Văn hoá Hà Nội.')} <Emoji e="🥳" play="loop" />
        </p>
        <p className="paused-text muted-light">{tr('Web đang tạm ngưng hoạt động. Bạn muốn tiếp tục khám phá Hà Nội cùng HANOI GO!? Nhắn cho admin để được mở lại nhé!')}</p>

        <div className="paused-contacts">
          {ADMIN_CONTACTS.map((c) => (
            <a key={c.url} className="fb-btn" href={c.url} target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.23 2.68.23v2.97h-1.51c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" /></svg>
              <span className="fb-text">
                <strong>{tr('Nhắn cho {0}', c.name)}</strong>
                <small>{tr(c.role)} · Facebook</small>
              </span>
              <span className="fb-arrow" aria-hidden="true">→</span>
            </a>
          ))}
        </div>

        <footer className="paused-foot">
          <span>{tr('Hẹn gặp lại bạn ở những hành trình tiếp theo')} <Emoji e="💛" play="loop" /></span>
          {mode === 'preview' && <button type="button" className="btn small" onClick={() => navigate('/settings')}>{tr('← Quay lại web')}</button>}
        </footer>
      </main>
    </div>
  )
}
