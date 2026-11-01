import { useQuests } from '../lib/data'
import { tourProgress, useTours } from '../lib/tours'
import TourCard from '../components/TourCard'

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
        <div className="eyebrow light">Sản phẩm du lịch</div>
        <h1>Tour theo chủ đề</h1>
        <p>Những tuyến tham quan được thiết kế sẵn: lộ trình, thời gian, chi phí và câu chuyện ở từng điểm dừng.</p>
      </section>
      {error && <div className="card error">Chưa có dữ liệu tour. Hãy chạy file <code>supabase/003_tours_reviews.sql</code>.</div>}
      {loading || lq ? <div className="spinner" /> : tours.map((t) => (
        <TourCard key={t.id} tour={t} wide progress={tourProgress(t, doneById)} claimed={claimed.has(t.id)} />
      ))}
    </div>
  )
}
