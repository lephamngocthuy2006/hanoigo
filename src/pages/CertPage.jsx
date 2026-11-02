import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { verifyCertificate } from '../lib/certificate'
import Logo from '../components/Logo'
import Emoji from '../components/Emoji'
import { isEn, locale, tr } from '../lib/i18n'

// Xác thực chứng nhận (mở từ QR trên ảnh chứng nhận). Không cần đăng nhập.
export default function CertPage({ signedIn }) {
  const { code } = useParams()
  const [cert, setCert] = useState(null)

  useEffect(() => {
    verifyCertificate(code).then(({ data, error }) => setCert(error ? { ok: false } : data))
  }, [code])

  const title = cert && (isEn && cert.tour_title_en ? cert.tour_title_en : cert.tour_title)

  return (
    <div className={`page narrow cert-page${signedIn ? "" : " standalone"}`}>
      <div className="cert-page-brand"><Logo size={44} /><span className="brand-name">HANOI GO!</span></div>
      {!cert ? <div className="spinner" /> : cert.ok ? (
        <section className="card cert-verify" style={{ '--tour': cert.tour_color }}>
          <div className="tag ok cert-valid"><Emoji e="✅" play="static" />{tr(' Chứng nhận hợp lệ')}</div>
          <div className="cert-verify-emoji"><Emoji e={cert.tour_emoji} play="loop" /></div>
          <p className="muted small">{tr('Chứng nhận hoàn thành tour')}</p>
          <h1>{title}</h1>
          <p>{tr('Trao cho')} <strong>{cert.name}</strong> <span className="muted">@{cert.username}</span></p>
          <p className="muted small">
            {tr('{0} điểm dừng · Hoàn thành ngày {1}', cert.stops, new Date(cert.completed_at).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }))}
          </p>
          <p className="muted small">{tr('Mã xác thực: ')}<code>{code.toUpperCase()}</code></p>
        </section>
      ) : (
        <section className="card empty">
          <div className="empty-emoji"><Emoji e="❌" play="static" /></div>
          <p>{tr('Không tìm thấy chứng nhận với mã này. Hãy kiểm tra lại mã trên ảnh.')}</p>
        </section>
      )}
      <Link className="btn primary block" to={signedIn ? '/tours' : '/register'}>
        {signedIn ? tr('Khám phá các tour khác') : tr('Tham gia HANOI GO! — khám phá Hà Nội theo cách của bạn')}
      </Link>
    </div>
  )
}
