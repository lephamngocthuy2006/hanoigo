import { setThemePref, useTheme } from '../lib/theme'
import { tr } from '../lib/i18n'

const OPTIONS = [
  ['light', '☀️ ', 'Sáng'],
  ['dark', '🌙 ', 'Tối'],
  ['system', '📱 ', 'Theo máy'],
]

// Chọn giao diện: đổi ngay, không cần tải lại trang
export default function ThemeSwitch({ className = '' }) {
  const { pref } = useTheme()
  return (
    <div className={`segmented theme-switch ${className}`} role="group" aria-label={tr('Giao diện')}>
      {OPTIONS.map(([value, icon, label]) => (
        <button key={value} type="button" className={pref === value ? 'active' : ''}
          aria-pressed={pref === value} onClick={() => setThemePref(value)}>
          {icon}{tr(label)}
        </button>
      ))}
    </div>
  )
}
