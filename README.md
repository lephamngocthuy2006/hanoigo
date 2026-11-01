# HANOI GO! — Khám phá Hà Nội

Web app khám phá Hà Nội qua nhiệm vụ: chụp ảnh check-in, check-in GPS, đố vui, Sổ hành trình, thẻ sưu tập và bảng xếp hạng.
Mỗi người có tài khoản riêng (tên đăng nhập + mật khẩu), dữ liệu và ảnh được lưu riêng cho từng người.

- **Frontend:** React + Vite, chạy dưới dạng web tĩnh trên **GitHub Pages**
- **Backend:** **Supabase** (Auth, Postgres, Storage), gói miễn phí là đủ cho project học tập
- **Bản đồ:** Leaflet + OpenStreetMap (miễn phí, không cần API key)

## Tính năng

| Màn hình | Có gì |
|---|---|
| Đăng ký / Đăng nhập | Tên đăng nhập + mật khẩu, tự giữ đăng nhập, đổi mật khẩu |
| Nhiệm vụ | Nhiệm vụ gợi ý, nhiệm vụ hằng ngày, streak 🔥, lọc theo loại, sắp xếp theo khoảng cách |
| Chi tiết nhiệm vụ | Chụp ảnh bằng camera điện thoại (tự nén ảnh), check-in GPS có kiểm tra bán kính, câu đố, bản đồ nhỏ + chỉ đường |
| Bản đồ | Toàn bộ địa điểm nhiệm vụ trên bản đồ thật, vị trí của bạn |
| Sổ hành trình | Ảnh từ nhiệm vụ tự vào sổ; thêm / sửa / xoá kỷ niệm; 🔒 "Chỉ mình tôi" để ẩn với bạn bè |
| Thẻ & Quà | Mở gói thẻ bằng Hanoi Coins, bộ sưu tập 15 thẻ, bảng xếp hạng XP (tất cả / bạn bè) |
| Tour theo chủ đề | 3 tuyến tham quan: lộ trình trên bản đồ, thời lượng, chi phí, thời gian đi bộ giữa các điểm, thưởng hoàn thành |
| Đánh giá & Thống kê | Chấm điểm 4 tiêu chí chất lượng dịch vụ + mức sẵn sàng giới thiệu; trang thống kê tự gợi ý điểm cần cải thiện |
| Đổi quà | Đổi Hanoi Coins lấy voucher của đối tác, nhận mã + QR để dùng tại quán |
| Cổng đối tác | Doanh nghiệp đăng ký → được duyệt → tạo nhiệm vụ & voucher, xác nhận mã, phản hồi đánh giá, xem thống kê 7 ngày & chất lượng dịch vụ |
| Bạn bè | Tìm theo tên đăng nhập, gửi / đồng ý lời mời, xem Sổ hành trình của bạn, thả tim ❤️ |
| Tôi | Level, XP, coins, streak, thống kê, đổi avatar / tên / giới thiệu |

**Bảo mật:** XP, coins, streak và đáp án câu đố đều được xử lý trên server (hàm SQL), người dùng không tự sửa được.
Ảnh nằm trong bucket private, ai chỉ xem được ảnh của người đó (Row Level Security).

---

## Cài đặt (làm 1 lần)

### 1. Tạo project Supabase

1. Vào <https://supabase.com>, đăng nhập và bấm **New project** (chọn region **Singapore** cho nhanh).
2. Vào **SQL Editor → New query**, lần lượt dán và **Run** từng file theo thứ tự:
   1. [`supabase/schema.sql`](supabase/schema.sql) — bảng chính, nhiệm vụ, thẻ
   2. [`supabase/002_friends.sql`](supabase/002_friends.sql) — bạn bè, thả tim, chế độ riêng tư
   3. [`supabase/003_tours_reviews.sql`](supabase/003_tours_reviews.sql) — tour theo chủ đề, thông tin điểm đến, đánh giá, thống kê, chế độ demo
   4. [`supabase/004_partners.sql`](supabase/004_partners.sql) — cổng đối tác, voucher, phản hồi đánh giá
3. Vào **Authentication → Sign In / Providers → Email**:
   - **Tắt "Confirm email"** (bắt buộc, vì app dùng tên đăng nhập, không gửi email).
   - Bấm **Save**.
4. Vào **Project Settings → API** (hoặc **Data API / API Keys**), copy **Project URL** và khoá **anon public**.

> Khoá `anon` là khoá công khai, để trong web là bình thường. **Không bao giờ** dùng khoá `service_role` trong web.

### 2. Chạy thử trên máy

```bash
npm install
```

Tạo file `.env` (copy từ `.env.example`) và điền 2 giá trị vừa lấy:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm run dev
```

Mở <http://localhost:5173>.

### 3. Đưa lên GitHub Pages

1. Tạo repo mới trên GitHub và đẩy code lên nhánh `main`.
2. Repo → **Settings → Secrets and variables → Actions → New repository secret**, thêm 2 secret:
   `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.
3. Repo → **Settings → Pages → Source: GitHub Actions**.
4. Mỗi lần push lên `main`, web tự build và cập nhật tại `https://<tên-github>.github.io/<tên-repo>/`.

---

## Tuỳ chỉnh

- **Thêm / sửa nhiệm vụ:** Supabase → **Table Editor → quests**. Lấy toạ độ bằng cách nhấp chuột phải trên Google Maps.
  - `kind`: `photo` (chụp ảnh), `checkin` (GPS), `quiz` (đố vui)
  - `is_daily`: làm lại được mỗi ngày
  - `require_location` + `radius_m`: bắt buộc đứng trong bán kính bao nhiêu mét
  - Câu đố: điền `quiz_question`, `quiz_options` (vd `["A","B","C","D"]`) và thêm đáp án vào bảng `quest_answers` (`correct_index` bắt đầu từ 0)
- **Thêm thẻ:** bảng `cards` (`rarity`: common / rare / epic / legendary).
- **Màu sắc:** biến CSS ở đầu file `src/styles.css`.

## Duyệt đối tác

Doanh nghiệp đăng ký trong app (Tôi → Cổng đối tác). Quản trị viên duyệt ở Supabase → **Table Editor → partners**, đổi `status` thành `approved` (hoặc dùng lệnh SQL cuối file `004_partners.sql`).

## Chế độ demo (thuyết trình)

Tài khoản demo check-in GPS được ở bất kỳ đâu. Bật trong SQL Editor:

```sql
update public.profiles set is_demo = true where username = 'ten_dang_nhap';
```

## Lưu ý

- Camera và GPS chỉ chạy trên **HTTPS** (GitHub Pages có sẵn) hoặc `localhost`.
- Quên mật khẩu: chưa có email nên không tự khôi phục được. Admin đặt lại mật khẩu trong Supabase → **Authentication → Users**.
- Project Supabase gói Free sẽ tạm dừng nếu không dùng 7 ngày; vào dashboard bấm **Restore** là chạy lại.
