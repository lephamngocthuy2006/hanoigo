// Bộ icon nét mảnh dùng cho menu (cùng khung 24×24, nét 1.8, bo tròn) — thay emoji để giao diện đồng bộ hơn.
const PATHS = {
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6" />
      <path d="M16 4.8a3.3 3.3 0 0 1 0 6.4" />
      <path d="M18 14.6c2 .7 3.2 2.5 3.5 5.4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.8h-15z" />
      <path d="M10 21a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <rect x="5.5" y="11" width="3" height="6.5" rx="1" />
      <rect x="10.5" y="6.5" width="3" height="11" rx="1" />
      <rect x="15.5" y="13.5" width="3" height="4" rx="1" />
    </>
  ),
  store: (
    <>
      <path d="M4 9.5l1.4-5h13.2l1.4 5" />
      <path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
      <path d="M5.5 12.2V20h13v-7.8" />
      <path d="M10 20v-4.5h4V20" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7.5 3v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V6z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8l1.6 2.3 2.8-.3.6 2.7 2.5 1.3-1 2.6 1 2.6-2.5 1.3-.6 2.7-2.8-.3L12 21.2l-1.6-2.3-2.8.3-.6-2.7-2.5-1.3 1-2.6-1-2.6 2.5-1.3.6-2.7 2.8.3z" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2.5" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h10" />
    </>
  ),
  chevron: <path d="M9.5 6l6 6-6 6" />,
}

export default function Icon({ name, size = 20, className = '' }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}
