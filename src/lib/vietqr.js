// Mã VietQR (chuẩn EMVCo của NAPAS 247): app ngân hàng nào quét cũng tự điền
// ngân hàng, số tài khoản, số tiền và nội dung chuyển khoản. Tạo ngay trong web, không gọi dịch vụ ngoài.

// Mã BIN (mã ngân hàng NAPAS) — chọn ngân hàng trong danh sách này thì mới tạo được QR
export const BANKS = [
  { bin: '970436', name: 'Vietcombank', alias: ['vcb', 'ngoai thuong'] },
  { bin: '970415', name: 'VietinBank', alias: ['ctg', 'cong thuong'] },
  { bin: '970418', name: 'BIDV', alias: ['dau tu phat trien'] },
  { bin: '970405', name: 'Agribank', alias: ['nong nghiep'] },
  { bin: '970407', name: 'Techcombank', alias: ['tcb', 'ky thuong'] },
  { bin: '970422', name: 'MB Bank', alias: ['mb', 'mbbank', 'quan doi'] },
  { bin: '970416', name: 'ACB', alias: ['a chau'] },
  { bin: '970432', name: 'VPBank', alias: ['vp', 'viet nam thinh vuong'] },
  { bin: '970423', name: 'TPBank', alias: ['tp', 'tien phong'] },
  { bin: '970403', name: 'Sacombank', alias: ['stb', 'sai gon thuong tin'] },
  { bin: '970437', name: 'HDBank', alias: ['hd'] },
  { bin: '970441', name: 'VIB', alias: ['quoc te'] },
  { bin: '970443', name: 'SHB', alias: ['sai gon ha noi'] },
  { bin: '970426', name: 'MSB', alias: ['maritime', 'hang hai'] },
  { bin: '970448', name: 'OCB', alias: ['phuong dong'] },
  { bin: '970440', name: 'SeABank', alias: ['seabank', 'dong nam a'] },
  { bin: '970431', name: 'Eximbank', alias: ['exim', 'xuat nhap khau'] },
  { bin: '970449', name: 'LPBank', alias: ['lienvietpostbank', 'lpb', 'loc phat'] },
  { bin: '970428', name: 'Nam A Bank', alias: ['nama', 'nam a'] },
  { bin: '970409', name: 'Bac A Bank', alias: ['baca', 'bac a'] },
  { bin: '970412', name: 'PVcomBank', alias: ['pvcom'] },
  { bin: '970425', name: 'ABBANK', alias: ['an binh'] },
  { bin: '970452', name: 'Kienlongbank', alias: ['kienlong', 'kien long'] },
  { bin: '970454', name: 'BVBank', alias: ['viet capital', 'ban viet'] },
  { bin: '970419', name: 'NCB', alias: ['quoc dan'] },
  { bin: '970433', name: 'VietBank', alias: ['viet nam thuong tin'] },
  { bin: '970438', name: 'BaoViet Bank', alias: ['bao viet'] },
  { bin: '546034', name: 'CAKE by VPBank', alias: ['cake'] },
  { bin: '546035', name: 'Ubank by VPBank', alias: ['ubank'] },
]

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/ngan hang|bank|tmcp|\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()

// Tìm ngân hàng theo tên quản trị viên đã nhập ("Vietcombank", "MB", "Ngân hàng Quân đội"…)
export function findBank(name) {
  const n = norm(name)
  if (!n) return null
  return BANKS.find((b) => norm(b.name) === n || b.alias.some((a) => norm(a) === n)) || null
}

// Nội dung chuyển khoản: chỉ chữ in hoa không dấu, số, khoảng trắng; tối đa 25 ký tự (giới hạn của VietQR)
const ascii = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
  .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()

export function transferNote(username) {
  const u = ascii(username)
  const note = `HANOIGO ${u}`.trim()
  return note.length <= 25 ? note : `HG ${u}`.slice(0, 25)
}

const tlv = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`

// CRC-16/CCITT-FALSE (poly 0x1021, khởi tạo 0xFFFF) — trường 63 của chuẩn EMVCo
export function crc16(str) {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Chuỗi VietQR (đưa vào thư viện qrcode để vẽ). Trả về null nếu không nhận ra ngân hàng / thiếu số tài khoản.
 */
export function vietQrPayload({ bankName, account, amount, note }) {
  const bank = findBank(bankName)
  const acc = String(account || '').replace(/\D/g, '')
  if (!bank || !acc) return null
  const beneficiary = tlv('00', bank.bin) + tlv('01', acc)
  const merchant = tlv('00', 'A000000727') + tlv('01', beneficiary) + tlv('02', 'QRIBFTTA')
  const amt = Math.round(Number(amount) || 0)
  const info = ascii(note).slice(0, 25)
  let s = tlv('00', '01') + tlv('01', amt > 0 ? '12' : '11') + tlv('38', merchant) + tlv('53', '704')
  if (amt > 0) s += tlv('54', String(amt))
  s += tlv('58', 'VN')
  if (info) s += tlv('62', tlv('08', info))
  s += '6304'
  return s + crc16(s)
}
