import { lang, setLang } from '../lib/i18n'

// Chọn ngôn ngữ: đổi xong tải lại trang
export default function LangSwitch({ className = '' }) {
  return (
    <div className={`segmented lang-switch ${className}`} role="group" aria-label="Ngôn ngữ / Language">
      <button type="button" className={lang === 'vi' ? 'active' : ''} onClick={() => lang !== 'vi' && setLang('vi')}>Tiếng Việt</button>
      <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => lang !== 'en' && setLang('en')}>English</button>
    </div>
  )
}
