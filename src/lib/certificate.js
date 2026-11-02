import QRCode from 'qrcode'
import { supabase } from './supabase'
import { signedUrls } from './photos'
import { tr, locale } from './i18n'

// Chứng nhận hoàn thành tour: vẽ ảnh 1080×1350 (khung dọc, đăng Instagram/Facebook đẹp)
const W = 1080
const H = 1350
const FONT = '"Be Vietnam Pro", system-ui, sans-serif'
const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'https://lephamngocthuy2006.github.io/hanoigo/'

export const certUrl = (code) => `${PUBLIC_URL}#/cert/${code}`

// Mã chứng nhận + ngày hoàn thành của chính mình
export async function loadMyCertificate(tourId, userId) {
  const { data, error } = await supabase.from('tour_completions')
    .select('cert_code, completed_at').eq('tour_id', tourId).eq('user_id', userId).maybeSingle()
  return { data, error }
}

export const verifyCertificate = (code) => supabase.rpc('verify_certificate', { p_code: code })

// Ảnh trong Sổ hành trình chụp tại các điểm của tour (mỗi điểm lấy ảnh mới nhất)
async function tourPhotos(stops, userId) {
  const ids = stops.map((s) => s.quest_id)
  const { data } = await supabase.from('journal_entries').select('quest_id, photo_path, created_at')
    .eq('user_id', userId).in('quest_id', ids).not('photo_path', 'is', null).order('created_at', { ascending: false })
  const byQuest = {}
  ;(data || []).forEach((e) => { byQuest[e.quest_id] ??= e.photo_path })
  const urls = await signedUrls(Object.values(byQuest))
  return Object.fromEntries(Object.entries(byQuest).map(([q, p]) => [q, urls[p]]))
}

// Tải ảnh qua fetch → blob để canvas không bị "tainted" khi xuất file
async function loadImage(url) {
  if (!url) return null
  try {
    const blob = await (await fetch(url)).blob()
    return await createImageBitmap(blob)
  } catch {
    return null
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

// Vẽ ảnh phủ kín ô (giống object-fit: cover)
function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height)
  const sw = w / s, sh = h / s
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
}

// Cắt chữ dài cho vừa chiều ngang
function fit(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

// Chia chữ thành nhiều dòng
function wrap(ctx, text, maxW, maxLines) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  words.forEach((w) => {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = w } else line = next
  })
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = fit(ctx, lines[maxLines - 1] + '…', maxW)
  }
  return lines
}

/**
 * Vẽ chứng nhận, trả về Blob PNG.
 * tour: { title, emoji, color, stops }, stops: [{ quest_id, quest: { title, emoji } }]
 */
export async function drawCertificate({ tour, stops, name, code, completedAt, userId }) {
  await Promise.all(['400', '600', '800'].map((w) => document.fonts?.load(`${w} 40px "Be Vietnam Pro"`).catch(() => null)))
  const [photos, logo, qr] = await Promise.all([
    tourPhotos(stops, userId),
    loadImage(`${import.meta.env.BASE_URL}logo-mark.png`),
    QRCode.toDataURL(certUrl(code), { width: 300, margin: 1, color: { dark: '#3a2a24', light: '#ffffff' } }).then(loadImage),
  ])
  const images = await Promise.all(stops.map((s) => loadImage(photos[s.quest_id])))

  const color = tour.color || '#8f2d3a'
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'alphabetic'

  // Nền giấy + khung màu tour
  ctx.fillStyle = '#fffaf1'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W, 0, 0, W, 0, 900)
  glow.addColorStop(0, 'rgba(242, 207, 99, 0.28)')
  glow.addColorStop(1, 'rgba(242, 207, 99, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = color
  ctx.lineWidth = 14
  roundRect(ctx, 28, 28, W - 56, H - 56, 36)
  ctx.stroke()
  ctx.strokeStyle = '#d9ac2e'
  ctx.lineWidth = 3
  roundRect(ctx, 50, 50, W - 100, H - 100, 24)
  ctx.stroke()

  // Logo + tên app
  if (logo) {
    ctx.save()
    roundRect(ctx, 96, 92, 84, 84, 20)
    ctx.clip()
    ctx.drawImage(logo, 96, 92, 84, 84)
    ctx.restore()
  }
  ctx.fillStyle = '#8f2d3a'
  ctx.font = `800 44px ${FONT}`
  ctx.fillText('HANOI GO!', 200, 140)
  ctx.fillStyle = '#8a7b70'
  ctx.font = `italic 400 24px ${FONT}`
  ctx.fillText(tr('Hà Nội trong tầm tay'), 202, 172)

  // Tiêu đề
  ctx.textAlign = 'center'
  ctx.fillStyle = '#b8860b'
  ctx.font = `800 26px ${FONT}`
  ctx.letterSpacing = '6px'
  ctx.fillText(tr('CHỨNG NHẬN HOÀN THÀNH TOUR'), W / 2, 262)
  ctx.letterSpacing = '0px'

  ctx.font = `400 72px ${FONT}`
  ctx.fillText(tour.emoji || '🏅', W / 2, 340)

  ctx.fillStyle = color
  ctx.font = `800 64px ${FONT}`
  const titleLines = wrap(ctx, tour.title, W - 220, 2)
  titleLines.forEach((l, i) => ctx.fillText(l, W / 2, 420 + i * 70))
  let y = 420 + (titleLines.length - 1) * 70

  ctx.fillStyle = '#8a7b70'
  ctx.font = `400 28px ${FONT}`
  ctx.fillText(tr('Trao cho'), W / 2, y + 58)
  ctx.fillStyle = '#3a2a24'
  ctx.font = `800 56px ${FONT}`
  ctx.fillText(fit(ctx, name, W - 220), W / 2, y + 120)
  y += 152

  // Lưới ảnh các điểm dừng (tối đa 6 ô, 3 cột)
  const shown = stops.slice(0, 6)
  const cols = 3
  const gap = 18
  const cellW = (W - 192 - gap * (cols - 1)) / cols
  const rows = Math.ceil(shown.length / cols)
  const cellH = rows > 1 ? 190 : 250
  shown.forEach((s, i) => {
    // hàng cuối thiếu ô thì căn giữa
    const row = Math.floor(i / cols)
    const inRow = Math.min(cols, shown.length - row * cols)
    const cx = 96 + (cols - inRow) * (cellW + gap) / 2 + (i % cols) * (cellW + gap)
    const cy = y + Math.floor(i / cols) * (cellH + gap)
    ctx.save()
    roundRect(ctx, cx, cy, cellW, cellH, 20)
    ctx.clip()
    if (images[i]) {
      drawCover(ctx, images[i], cx, cy, cellW, cellH)
    } else {
      const g = ctx.createLinearGradient(cx, cy, cx + cellW, cy + cellH)
      g.addColorStop(0, color)
      g.addColorStop(1, '#3a2a24')
      ctx.fillStyle = g
      ctx.fillRect(cx, cy, cellW, cellH)
      ctx.fillStyle = '#fff'
      ctx.font = `400 64px ${FONT}`
      ctx.fillText(s.quest.emoji || '📍', cx + cellW / 2, cy + cellH / 2 + 10)
    }
    // nhãn trạm
    const label = ctx.createLinearGradient(0, cy + cellH - 70, 0, cy + cellH)
    label.addColorStop(0, 'rgba(0,0,0,0)')
    label.addColorStop(1, 'rgba(0,0,0,0.65)')
    ctx.fillStyle = label
    ctx.fillRect(cx, cy + cellH - 70, cellW, 70)
    ctx.fillStyle = '#fff'
    ctx.font = `700 21px ${FONT}`
    ctx.fillText(fit(ctx, `${i + 1}. ${s.quest.title}`, cellW - 24), cx + cellW / 2, cy + cellH - 18)
    ctx.restore()
  })
  y += rows * (cellH + gap) + 26

  // Dòng thông tin
  const date = new Date(completedAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  ctx.fillStyle = '#3a2a24'
  ctx.font = `600 28px ${FONT}`
  ctx.fillText(tr('{0} điểm dừng · Hoàn thành ngày {1}', stops.length, date), W / 2, y + 10)

  // Chân trang: QR xác thực + mã
  const footY = H - 236
  ctx.strokeStyle = '#eadfcf'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(96, footY - 24)
  ctx.lineTo(W - 96, footY - 24)
  ctx.stroke()
  if (qr) ctx.drawImage(qr, 96, footY, 160, 160)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#8a7b70'
  ctx.font = `600 22px ${FONT}`
  ctx.fillText(tr('MÃ XÁC THỰC'), 290, footY + 44)
  ctx.fillStyle = '#3a2a24'
  ctx.font = `800 44px ${FONT}`
  ctx.letterSpacing = '4px'
  ctx.fillText(code, 290, footY + 98)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = '#8a7b70'
  ctx.font = `400 22px ${FONT}`
  ctx.fillText(tr('Quét mã QR để xác thực chứng nhận'), 290, footY + 140)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}
