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

export async function scanBill(file, { amount, note, onProgress }) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (m) => m.status === 'recognizing text' && onProgress?.(Math.round(m.progress * 100)),
  })
  try {
    const { data } = await worker.recognize(file)
    return { ...checkBill(data.text, { amount, note }), text: data.text }
  } finally {
    worker.terminate()
  }
}
