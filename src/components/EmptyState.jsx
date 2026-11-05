import { Link } from 'react-router-dom'
import Emoji from './Emoji'

/**
 * Màn hình trống: minh hoạ (emoji trong vầng màu có đốm trang trí) + tiêu đề + mô tả + nút hành động.
 * action: { label, to } hoặc { label, onClick }. compact: bản nhỏ đặt trong thẻ khác (vd. bình luận).
 */
export default function EmptyState({ emoji, title, children, action, compact = false, tone = 'brand' }) {
  const Btn = action?.to ? Link : 'button'
  return (
    <div className={`empty-state${compact ? ' compact' : ' card'} tone-${tone}`}>
      <div className="empty-art" aria-hidden="true">
        <span className="empty-dot d1" /><span className="empty-dot d2" /><span className="empty-dot d3" />
        <span className="empty-blob"><Emoji e={emoji} play="loop" /></span>
      </div>
      {title && <h3>{title}</h3>}
      {children && <p>{children}</p>}
      {action && (
        <Btn className={`btn ${compact ? 'small' : ''} primary`} {...(action.to ? { to: action.to } : { type: 'button', onClick: action.onClick })}>
          {action.label}
        </Btn>
      )}
    </div>
  )
}
