# TASKS.md — Enso / Origami / Okyu HR App

> Kế hoạch 4 tuần | Next.js + Supabase + PWA
> Tick [x] sau mỗi task hoàn thành

---

## 🤖 OPUS hay SONNET?

### Dùng OPUS:

```
✅ Logic phức tạp (Auth flow, GPS, Tip algorithm)
✅ Security (RLS, middleware, Whistleblower)
✅ Setup lần đầu (Supabase, Next.js config, PWA)
✅ Realtime (Chat, Checklist sync)
✅ Edge Functions
✅ Bug khó không rõ nguyên nhân
✅ Task ĐẦU TIÊN mỗi tuần
```

### Dùng SONNET:

```
✅ UI đơn giản (danh sách, form cơ bản)
✅ TypeScript types / interfaces
✅ Sửa lỗi nhỏ đã biết nguyên nhân
✅ Copy pattern trang cũ → trang tương tự
✅ Thêm text / style / màu
✅ Tạo component đơn giản
✅ Refactor code đã chạy đúng
✅ Comment / documentation
```

### Quy tắc ngày:

```
Sáng  → Opus (task khó nhất)
Chiều → Sonnet (task còn lại)
Opus hết quota → Sonnet, không chờ
Sonnet bí → chờ Opus reset
```

---

## 🗓️ TỔNG QUAN 4 TUẦN

```
Tuần 1  ██████  Foundation: Auth + Branding + PWA setup
Tuần 2  ██████  Daily Ops: Ca làm + GPS + Báo ốm + Checklist
Tuần 3  ██████  Comms + Finance: Chat + Tip + Documents
Tuần 4  ██████  Polish + Deploy Vercel 🚀

MVP sau tuần 2 → test thật 1 quán
Ra mắt tuần 4 → cả 3 quán dùng

Sau tuần 4 (thư thả):
         ░░░░░░  LMS + Gamification + AI Colleague + Auto-translate
```

---

## 📋 TUẦN 1 — FOUNDATION

**Mục tiêu:** Đăng nhập được, admin duyệt được, app đổi màu theo quán, cài được lên homescreen

### Ngày 1: Project Setup

- [ ] **[OPUS]** Tạo Supabase project
  - Chạy SQL: `locations` + `profiles` (từ SKILL.md mục 8)
  - Seed data 3 quán (cập nhật lat/lng thật)
  - Bật Google OAuth

- [ ] **[OPUS]** Khởi tạo Next.js project
  - Chạy lệnh setup từ SKILL.md mục 3
  - Tạo folder structure (mục 4)
  - Config Tailwind + brand colors (mục 6)
  - `lib/supabase/client.ts` + `lib/supabase/server.ts`
  - `lib/constants.ts`

### Ngày 2: PWA + Auth Config

- [ ] **[OPUS]** PWA Setup
  - `public/manifest.json`
  - next-pwa config trong `next.config.js`
  - Meta tags trong `app/layout.tsx`
  - Icons 192x192 + 512x512

- [ ] **[OPUS]** Middleware auth guard
  - `middleware.ts` — check status mọi request
  - pending → /pending | active → /home

### Ngày 3-4: Auth Screens

- [ ] **[OPUS]** Login Page
  - `app/(auth)/login/page.tsx`
  - Google OAuth + Email/Password
  - Sau login → redirect theo status

- [ ] **[SONNET]** Pending Page
  - `app/(auth)/pending/page.tsx`
  - Thông báo chờ duyệt + nút đăng xuất

- [ ] **[OPUS]** RLS Policies
  - Chạy SQL từ SKILL.md mục 9

- [ ] **[OPUS]** Admin Approval Page
  - `app/(app)/admin/approval/page.tsx`
  - Danh sách pending → chọn Role + Location → duyệt

### Ngày 5: Layout + Branding

- [ ] **[OPUS]** App Layout + Bottom Nav
  - `app/(app)/layout.tsx` — auth guard
  - `components/layout/BottomNav.tsx` — tabs theo role

- [ ] **[SONNET]** Profile Page
  - `app/(app)/hr/page.tsx`
  - Hiển thị: tên, email, role, quán, ngày vào làm

- [ ] **[OPUS]** Branding động
  - `lib/utils/theme.ts` — getLocationTheme()
  - Apply theme theo location_id sau login

**✅ Deliverable tuần 1:** Đăng ký → chờ duyệt → duyệt → vào app đúng màu + cài PWA lên homescreen

---

## 📋 TUẦN 2 — DAILY OPS

**Mục tiêu:** Nhân viên dùng được hàng ngày → test thật 1 quán cuối tuần

### Ngày 1-2: Scheduling + GPS

- [ ] **[OPUS]** SQL Migration: `shifts` + `attendances`

- [ ] **[SONNET]** Schedule Page — Staff xem ca
  - `app/(app)/schedule/page.tsx`
  - Xem ca theo tuần (Server Component)

- [ ] **[OPUS]** Manager tạo ca
  - Form: nhân viên + thời gian + khu vực
  - Client Component với react-hook-form + zod

- [ ] **[OPUS]** GPS Check-in Page
  - `app/(app)/checkin/page.tsx`
  - `lib/hooks/useLocation.ts` — Web Geolocation API
  - `lib/utils/geo.ts` — Haversine distance
  - Validate distance ≤ 100m → check-in
  - Handle: GPS tắt / ngoài vùng / đã check-in

- [ ] **[OPUS]** Auto check-out Edge Function
  - Chạy 30 phút sau shift.end_time
  - Nhắc check-out 15 phút trước end_time

### Ngày 3: Sick Report + Whistleblower

- [ ] **[OPUS]** SQL Migration: `sick_reports` + `whistleblower_reports`

- [ ] **[OPUS]** Sick Report Page
  - `app/(app)/hr/sick-report/page.tsx`
  - 1 nút → cancel shift → notify manager
  - Input mã eAU (text, tùy chọn)
  - Upload ảnh AU (`<input type="file" capture="environment">`)

- [ ] **[OPUS]** Whistleblower Page
  - `app/(app)/hr/whistleblower/page.tsx`
  - Form ẩn danh: category + mô tả
  - KHÔNG lưu user ID

### Ngày 4-5: Checklist + Announcement

- [ ] **[OPUS]** SQL Migration: `checklist_templates` + `checklist_runs` + `announcements`

- [ ] **[OPUS]** Checklist Page (Realtime)
  - `app/(app)/checklist/page.tsx`
  - `lib/hooks/useRealtime.ts`
  - Tick → Supabase Realtime cập nhật
  - Progress bar
  - Manager xem từ xa realtime

- [ ] **[OPUS]** Announcement Page + Urgent Overlay
  - `app/(app)/admin/announcements/page.tsx`
  - Urgent: full-screen overlay, click "Đã đọc"

- [ ] **[SONNET]** Home Page
  - `app/(app)/home/page.tsx`
  - Ca hôm nay + Quick actions

- [ ] **[SONNET]** Pulse Check Popup
  - Bật sau check-out: mood 1–5 sao

**✅ Deliverable tuần 2:** MVP — test thật với nhân viên 1 quán\*\*

---

## 📋 TUẦN 3 — COMMS + FINANCE

**Mục tiêu:** Thay WhatsApp hoàn toàn, tự động hóa tip và giấy tờ

### Ngày 1-2: Chat + Documents

- [ ] **[OPUS]** SQL Migration: `channels` + `messages` + `documents`

- [ ] **[OPUS]** Chat Page (Realtime)
  - `app/(app)/chat/page.tsx`
  - Supabase Realtime subscription
  - Auto-tạo channel theo location

- [ ] **[OPUS]** Documents Page
  - `app/(app)/hr/documents/page.tsx`
  - Upload: hợp đồng, Rote Karte, Gesundheitszeugnis
  - Supabase Storage

- [ ] **[OPUS]** Edge Function: Cảnh báo hết hạn
  - Chạy 8h sáng mỗi ngày
  - expires_at ≤ 30 ngày → notify manager + nhân viên

### Ngày 3-4: Tip + Marketplace

- [ ] **[OPUS]** SQL Migration: `tip_pools` + `shift_templates`

- [ ] **[OPUS]** Tip Pool Page
  - `app/(app)/finance/tip-pool/page.tsx`
  - Manager nhập tổng → tính theo giờ làm
  - `lib/utils/tip-calculator.ts`
  - Notify kết quả từng người

- [ ] **[SONNET]** Shift Marketplace
  - Đăng ca bán + claim + manager duyệt

- [ ] **[OPUS]** Shift Templates
  - Manager tạo lịch mẫu → áp dụng 1 click

- [ ] **[SONNET]** Availability Calendar
  - Nhân viên đánh dấu ngày bận/rảnh

### Ngày 5: Notifications

- [ ] **[OPUS]** Web Push Notification setup
  - `app/api/push/route.ts`
  - Sick report → notify manager
  - Tip → notify nhân viên
  - Hết hạn giấy tờ → notify 2 bên

**✅ Deliverable tuần 3:** Rollout cả 3 quán

---

## 📋 TUẦN 4 — POLISH + DEPLOY

**Mục tiêu:** 🚀 Live trên Vercel, nhân viên dùng thật

### Ngày 1-2: Bug Fix + Polish

- [ ] **[OPUS]** Edge Function: Auto tạo checklist_run lúc 5h sáng

- [ ] **[SONNET]** UI/UX review toàn bộ
  - Thống nhất spacing, màu, font
  - Empty states mọi trang
  - Loading skeletons thống nhất

- [ ] **[OPUS]** Test PWA đầy đủ
  - Cài lên homescreen Android/iOS
  - GPS check-in thật
  - Realtime chat thật
  - Camera upload thật

### Ngày 3-4: Deploy

- [ ] **[OPUS]** Deploy lên Vercel
  - Connect GitHub repo
  - Set environment variables (Supabase URL + keys)
  - Custom domain nếu có

- [ ] **[OPUS]** Fix bugs từ test thật

- [ ] **[SONNET]** Tạo hướng dẫn cài PWA cho nhân viên
  - Screenshot từng bước "Thêm vào màn hình chính"

### Ngày 5: Onboarding

- [ ] Onboard nhân viên quán đầu tiên
- [ ] Hướng dẫn manager duyệt tài khoản
- [ ] Thu thập feedback ngày đầu

**✅ Deliverable tuần 4:** App live, nhân viên dùng thật\*\*

---

## 🔜 SAU TUẦN 4 — Không deadline

- [ ] **[OPUS]** LMS / Studyhub (video + quiz)
- [ ] **[OPUS]** Gamification (XP + Leaderboard)
- [ ] **[OPUS]** AI Colleague (chatbot 24/7)
- [ ] **[OPUS]** Auto-translate chat (API dịch)
- [ ] **[SONNET]** iOS PWA optimization

---

## 📝 TEMPLATE TASK

```
## TASK: [Tên task]
## Model: [OPUS / SONNET]

### File:
src/app/[path]/page.tsx
hoặc src/components/[name].tsx

### Chức năng:
[Mô tả 3–5 dòng]

### Input:
[Dữ liệu đầu vào, từ đâu]

### Output / Side effects:
[Ghi DB, navigate đâu, notify gì]

### Logic theo thứ tự:
1. Bước 1
2. Bước 2

### Edge cases:
- Case 1 → xử lý thế nào
- Case 2 → xử lý thế nào

### UI:
- Loading: skeleton
- Empty: [text]
- Error: toast tiếng Việt
- [Wireframe nếu có]

### KHÔNG làm:
- Không sửa file khác
- Không thêm package mới
```

---

## ✅ TASK XONG KHI:

```
[ ] Chạy không crash
[ ] Loading state đúng
[ ] Error state đúng (thử tắt mạng)
[ ] Empty state đúng
[ ] Hỏi Opus: "Task này hoàn chỉnh chưa? Còn thiếu gì?"
[ ] Git commit: "feat: [tên tính năng]"
```

---

## 🐛 BUG TEMPLATE

```
## BUG

File: [tên file]
Lỗi: [mô tả / error message]

Stack trace:
[paste từ console]

Code hiện tại:
[paste đoạn bị lỗi]

Đã thử: [những gì đã thử]

Yêu cầu: Chỉ sửa phần bị lỗi.
Giải thích ngắn nguyên nhân tiếng Việt.
```

---

_TASKS.md v3.0 — Next.js + Supabase + PWA_
_Enso / Origami / Okyu HR App_
