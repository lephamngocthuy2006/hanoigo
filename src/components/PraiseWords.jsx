import { useEffect, useRef, useState } from 'react'
import { lang } from '../lib/i18n'

// Lời khen "bay" quanh ảnh nhận giải — mỗi chữ xuất hiện theo một kiểu ngẫu nhiên
const WORDS = {
  vi: [
    'Ngầu!', 'Ngầu vãi 😎', 'Đỉnh!', 'Đỉnh vô cùng 🔥', '10đ!', '10 điểm không có nhưng', 'Thích vãi',
    'Quá đỉnh 🙌', 'Xuất sắc!', 'Chúc mừng! 🎉', 'Quán quân đây rồi 🏆', 'Đẳng cấp ✨', 'Hết nước chấm',
    'Slay 💅', 'Mãi đỉnh', 'Tự hào quá 🥹', 'Giỏi quá trời', 'Ai cản nổi', 'Đỉnh của chóp', 'Xịn xò',
    'Vô địch!', 'Yêu ghê 💛', 'Out trình', 'Không đối thủ', 'Chất lừ', 'Nể thật sự 👏', 'Siêu đỉnh',
    'Quá dữ', 'Nhất rồi 🥇', 'Iu quá 💖', 'Đỉnh nóc kịch trần', 'Đỉnh nóc, kịch trần, bay phấp phới 🚀',
    'Số 1 luôn ☝️', 'Đẹp quá trời 🌸', 'Ngầu xỉu', 'Trên cả tuyệt vời', 'Quá là xịn', 'Vỗ tay! 👏👏',
    'Chiến thần 💪', 'Huyền thoại', '100 điểm 💯', 'Đỉnh thật sự', 'Ghê chưa 😤', 'Ối dồi ôi đỉnh',
  ],
  en: [
    'So cool!', 'Iconic 😎', 'Legend!', 'GOAT 🐐', '10/10!', 'Champion 🏆', 'Slay 💅', 'Unstoppable',
    'Incredible 🔥', 'Congrats! 🎉', 'Queen 👑', 'Top tier ✨', 'So proud 🥹', 'Absolute best', '100% 💯',
    'Next level 🚀', 'Bravo! 👏', 'No. 1 ☝️', 'Amazing!', 'Pure class', 'On fire 🔥', 'Love it 💖',
  ],
}

// kiểu xuất hiện: nảy lên, bay ngang, trôi lên như bình luận livestream, đóng dấu, phóng to, vụt chéo, đèn neon
const KINDS = ['pop', 'fly', 'rise', 'stamp', 'zoom', 'swipe', 'neon', 'fly-rev']
const TONES = ['gold', 'pink', 'cyan', 'white', 'fire', 'violet']
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const rand = (a, b) => a + Math.random() * (b - a)

export default function PraiseWords() {
  const [items, setItems] = useState([])
  const recent = useRef([])

  useEffect(() => {
    const words = WORDS[lang] || WORDS.vi
    let timer
    const spawn = () => {
      // đang ẩn tab thì nghỉ, quay lại mới tiếp
      if (document.visibilityState === 'visible') {
        let text
        do text = pick(words); while (recent.current.includes(text) && words.length > 8)
        recent.current = [...recent.current.slice(-6), text]
        const kind = pick(KINDS)
        // tránh che mặt (giữa, nửa trên ảnh) → đẩy chữ xuống dưới hoặc ra hai bên
        let x = rand(14, 86), y = rand(10, 88)
        if (x > 36 && x < 68 && y > 12 && y < 52) y = rand(62, 90)
        setItems((list) => [...list.slice(-6), {
          id: `${Date.now()}-${Math.random()}`, text, kind, tone: pick(TONES),
          x, y, rot: rand(-14, 14),
          size: kind === 'stamp' || kind === 'zoom' ? rand(1.5, 2.1) : rand(1, 1.5),
        }])
      }
      timer = setTimeout(spawn, rand(650, 1400))
    }
    timer = setTimeout(spawn, 1600) // đợi trang hiện xong mới bắt đầu
    return () => clearTimeout(timer)
  }, [])

  const done = (id) => setItems((list) => list.filter((i) => i.id !== id))

  return (
    <span className="praise-layer" aria-hidden="true">
      {items.map((i) => (
        <span key={i.id} className={`praise k-${i.kind} t-${i.tone}`} onAnimationEnd={(e) => e.target === e.currentTarget && done(i.id)}
          style={{ '--x': `${i.x}%`, '--y': `${i.y}%`, '--rot': `${i.rot}deg`, '--size': i.size }}>
          {i.text}
        </span>
      ))}
    </span>
  )
}
