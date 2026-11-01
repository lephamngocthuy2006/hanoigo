import { useQuests } from '../lib/data'
import { tourProgress, useTours } from '../lib/tours'
import TourCard from '../components/TourCard'
import { tr } from '../lib/i18n'

export default function ToursPage() {
  const { quests, isDone, loading: lq } = useQuests()
  const { tours, claimed, loading, error } = useTours()
  const doneById = (id) => {
    const q = quests.find((x) => x.id === id)
    return q ? isDone(q) : false
  }

  return (
    <div className="page">
      <section className="tours-hero">
        <div className="eyebrow light">{tr('Sản phẩm du lịch')}</div>
        <h1>{tr('Tour theo chủ đề')}</h1>
        <p>{tr('Những tuyến tham quan được thiết kế sẵn: lộ trình, thời gian, chi phí và câu chuyện ở từng điểm dừng.')}</p>
      </section>
      {error && <div className="card error">{tr('Chưa có dữ liệu tour. Hãy chạy file ')}<code>supabase/003_tours_reviews.sql</code>.</div>}
      {loading || lq ? <div className="spinner" /> : tours.map((t) => (
        <TourCard key={t.id} tour={t} wide progress={tourProgress(t, doneById)} claimed={claimed.has(t.id)} />
      ))}
    </div>
  )
}
