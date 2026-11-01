// Hiển thị sao (value có thể lẻ) hoặc chọn sao khi có onChange
export default function Stars({ value = 0, onChange, size = '1rem', label }) {
  if (!onChange) {
    const pct = Math.max(0, Math.min(100, (value / 5) * 100))
    return (
      <span className="stars" style={{ fontSize: size }} aria-label={`${value.toFixed(1)} trên 5 sao`}>
        <span className="stars-bg">★★★★★</span>
        <span className="stars-fg" style={{ width: `${pct}%` }}>★★★★★</span>
      </span>
    )
  }
  return (
    <span className="stars-input" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} sao`}
          className={n <= value ? 'on' : ''} style={{ fontSize: size }} onClick={() => onChange(n)}>★</button>
      ))}
    </span>
  )
}
