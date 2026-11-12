// Đọc ảnh bill chuyển khoản ngay trên máy người dùng (Tesseract.js — chỉ tải khi cần)
// rồi kiểm tra có đúng số tiền và nội dung chuyển khoản không.

// OCR hay nhầm chữ với số giống nhau → quy về một dạng trước khi so
const fold = (s) => String(s || '').toUpperCase()
  .replace(/[^A-Z0-9]/g, '')
  .replace(/O/g, '0').replace(/[IL|]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/Z/g, '2')

/**
 * Kiểm tra chữ đọc được trên bill.
 * - Số tiền: chấp nhận 13.000 / 13,000 / 13 000 / 13000 (kèm đ, VND… phía sau)
 * - Nội dung: có chứa nội dung chuyển khoản (bỏ khoảng trắng, chấp nhận OCR nhầm O/0, I/1…)
 */
export function checkBill(text, { amount, note }) {
  const up = String(text || '').toUpperCase()
  // gộp các nhóm nghìn: "13.000" "13,000" "13 000" → "13000"
  const merged = up.replace(/(\d)[.,\s](?=\d{3}(?!\d))/g, '$1').replace(/(\d)[.,\s](?=\d{3}(?!\d))/g, '$1')
  const numbers = merged.match(/\d+/g) || []
  const amountOk = numbers.some((n) => Number(n) === Number(amount) || Number(n) === Number(amount) * 100) // "13000,00"
  const noteOk = fold(note).length > 0 && fold(up).includes(fold(note))
  const summary = `Bill: ${amountOk ? `thấy số tiền ${amount}` : 'không thấy số tiền'} · ${noteOk ? 'đúng nội dung' : 'không thấy nội dung'}`
  return { ok: amountOk && noteOk, amountOk, noteOk, summary }
}

/**
 * Làm rõ ảnh trước khi đọc: bill ngân hàng hay có chữ trắng / xanh nhạt trên nền xanh đậm chuyển màu.
 * Ngưỡng thích nghi: mỗi điểm ảnh so với độ sáng trung bình xung quanh nó — sáng hơn hẳn (ảnh nền tối)
 * hoặc tối hơn hẳn (ảnh nền sáng) thì là nét chữ → tô đen, còn lại tô trắng. Nền chuyển màu không ảnh hưởng.
 */
export async function prepare(file, flip = false) {
  const bmp = await createImageBitmap(file)
  // chữ trên ảnh chụp điện thoại nhỏ → phóng to cho đủ ~1400px ngang
  const scale = Math.min(3, Math.max(1, 1400 / bmp.width))
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  const img = ctx.getImageData(0, 0, w, h)
  const p = img.data
  // ảnh xám + bảng cộng dồn (integral image) để tính trung bình một ô vuông bất kỳ thật nhanh
  const gray = new Float32Array(w * h)
  const integral = new Float64Array((w + 1) * (h + 1))
  let total = 0
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const v = 0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2]
      gray[i] = v
      row += v
      total += v
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row
    }
  }
  // ảnh tối (nền xanh đậm…) → chữ là phần SÁNG hơn xung quanh; ảnh sáng → chữ là phần TỐI hơn
  // flip: đọc lại với chiều ngược (bill nửa nền tối nửa nền sáng)
  const lightInk = (total / (w * h) < 128) !== flip
  const r = Math.round(w / 40) // ô xung quanh ~ 1/20 bề ngang ảnh, lớn hơn nét chữ
  const C = 22 // phải chênh ít nhất chừng này mới tính là chữ (bỏ qua nhiễu, nền mờ)
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1)
      const sum = integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0]
      const mean = sum / ((x1 - x0) * (y1 - y0))
      const i = y * w + x
      const ink = lightInk ? gray[i] > mean + C : gray[i] < mean - C
      const v = ink ? 0 : 255
      p[i * 4] = p[i * 4 + 1] = p[i * 4 + 2] = v
      p[i * 4 + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

/**
 * onProgress(x): 'load' khi đang tải bộ đọc chữ, số 0–100 khi đang đọc bill.
 * Đọc ảnh đã làm rõ trước; chưa thấy đủ thì đọc lại với chiều sáng/tối ngược, rồi ảnh gốc —
 * chữ của các lần đọc được gộp lại (số tiền thấy ở lần này, nội dung thấy ở lần kia vẫn tính).
 */
export async function scanBill(file, { amount, note, onProgress }) {
  onProgress?.('load')
  const { createWorker } = await import('tesseract.js')
  const images = [() => prepare(file), () => prepare(file, true), () => file]
  let pass = 0
  const worker = await createWorker('eng', 1, {
    logger: (m) => m.status === 'recognizing text' && onProgress?.(Math.round(((pass + m.progress) / images.length) * 100)),
  })
  try {
    let text = ''
    let result = null
    for (; pass < images.length; pass++) {
      const image = await Promise.resolve().then(images[pass]).catch(() => null)
      if (!image) continue
      text += '\n' + (await worker.recognize(image)).data.text
      result = checkBill(text, { amount, note })
      if (result.ok) break
    }
    return { ...(result || checkBill('', { amount, note })), text }
  } finally {
    worker.terminate()
  }
}
