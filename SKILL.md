# SKILL.md — Enso / Origami / Okyu HR App
> Opus tự đọc file này khi nhận task. KHÔNG xóa hoặc sửa cấu trúc.
> Đặt tại root project (cùng cấp package.json)

---

## 1. DỰ ÁN

Web app HR nội bộ (PWA) cho chuỗi 3 nhà hàng Nhật tại Đức.
- **Enso** — xanh lá
- **Origami** — be/nâu
- **Okyu** — đỏ

Người dùng: owner / manager / staff / azubi
Truy cập: Chrome trên điện thoại, cài PWA lên homescreen như app thật
Deploy: Vercel (free)
Mục đích: Thay thế WhatsApp và giấy tờ thủ công

---

## 2. TECH STACK

| Thành phần | Công nghệ | Phiên bản |
|------------|-----------|-----------|
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| Backend/DB | Supabase (PostgreSQL) | latest |
| Auth | Supabase Auth | latest |
| Realtime | Supabase Realtime | latest |
| Storage | Supabase Storage | latest |
| PWA | next-pwa | latest |
| GPS | Web Geolocation API | browser native |
| Camera | input type=file capture | browser native |
| State | React Query (TanStack) | 5.x |
| Forms | react-hook-form + zod | latest |
| Icons | lucide-react | latest |
| Date | date-fns | 3.x |

---

## 3. PROJECT SETUP

```bash
npx create-next-app@latest enso-app \
  --typescript --tailwind --eslint \
  --app --src-dir --import-alias "@/*"

cd enso-app
npm install @supabase/supabase-js @supabase/ssr
npm install next-pwa
npm install @tanstack/react-query
npm install react-hook-form zod @hookform/resolvers
npm install date-fns lucide-react
```

---

## 4. FOLDER STRUCTURE

```
src/
├── app/
│   ├── layout.tsx                # Root layout + PWA meta
│   ├── page.tsx                  # Redirect → /login hoặc /home
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── pending/page.tsx
│   ├── (app)/                    # Protected routes
│   │   ├── layout.tsx            # Auth guard + Bottom Nav
│   │   ├── home/page.tsx
│   │   ├── schedule/page.tsx
│   │   ├── checkin/page.tsx
│   │   ├── checklist/page.tsx
│   │   ├── chat/page.tsx
│   │   ├── hr/
│   │   │   ├── page.tsx
│   │   │   ├── sick-report/page.tsx
│   │   │   ├── documents/page.tsx
│   │   │   └── whistleblower/page.tsx
│   │   ├── finance/
│   │   │   └── tip-pool/page.tsx
│   │   └── admin/                # Manager/Owner only
│   │       ├── approval/page.tsx
│   │       └── announcements/page.tsx
│   └── api/
│       └── push/route.ts
├── components/
│   ├── ui/                       # Button, Card, Input, Toast...
│   ├── layout/                   # BottomNav, Header, PageWrapper
│   └── features/                 # Feature components
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client
│   │   └── middleware.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useLocation.ts        # GPS hook
│   │   └── useRealtime.ts
│   ├── utils/
│   │   ├── tip-calculator.ts
│   │   └── geo.ts                # Haversine distance
│   └── constants.ts
├── types/
│   └── database.ts               # Supabase types
├── middleware.ts                  # Auth guard mọi request
└── public/
    ├── manifest.json             # PWA manifest
    └── icons/
```

---

## 5. CODING RULES — BẮT BUỘC

### Ngôn ngữ
- Code, biến, hàm, component → **tiếng Anh**
- Comment giải thích logic → **tiếng Việt**
- Thông báo lỗi cho user → **tiếng Việt**

### Component Pattern
```tsx
// ✅ Server Component (default) — không useState/useEffect
export default async function SchedulePage() {
  const supabase = createServerClient()
  const shifts = await getShifts(supabase)
  return <ShiftList shifts={shifts} />
}

// ✅ Client Component — chỉ khi cần tương tác
'use client'
export function CheckInButton({ shiftId }: { shiftId: string }) {
  const [loading, setLoading] = useState(false)
  // ...
}
```

### Error Handling
```tsx
// ✅ Luôn try/catch + toast tiếng Việt
try {
  await supabase.from('shifts').insert(data)
  toast.success('Đã lưu thành công')
} catch (error) {
  toast.error('Không thể lưu. Thử lại sau.')
  console.error(error)
}
```

### Naming
```
Files/folders: kebab-case      → sick-report/page.tsx
Components:    PascalCase      → CheckInButton
Hooks:         camelCase       → useLocation
Utils:         camelCase       → calculateTip
Constants:     SCREAMING_SNAKE → GEOFENCE_RADIUS
```

### Quy tắc
- Ưu tiên Server Components, 'use client' chỉ khi cần
- Mọi form dùng react-hook-form + zod
- Mọi async action có loading + error state
- Không sửa file ngoài file được chỉ định
- Không thêm package mới khi chưa được yêu cầu

---

## 6. BRAND COLORS

```typescript
// tailwind.config.ts
colors: {
  enso:    { DEFAULT: '#2D6A4F', dark: '#1B4332', light: '#52B788', surface: '#D8F3DC' },
  origami: { DEFAULT: '#8B7355', dark: '#6B5A45', light: '#B5936A', surface: '#F5EFE6' },
  okyu:    { DEFAULT: '#C62828', dark: '#8E0000', light: '#EF5350', surface: '#FFEBEE' },
}

// lib/utils/theme.ts
export function getLocationTheme(locationId: string) {
  const themes = {
    enso:    { primary: 'bg-enso',    text: 'text-enso',    surface: 'bg-enso-surface'    },
    origami: { primary: 'bg-origami', text: 'text-origami', surface: 'bg-origami-surface' },
    okyu:    { primary: 'bg-okyu',    text: 'text-okyu',    surface: 'bg-okyu-surface'    },
  }
  return themes[locationId] ?? themes.enso
}
```

---

## 7. PWA CONFIG

```json
// public/manifest.json
{
  "name": "Enso Group HR",
  "short_name": "Enso HR",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2D6A4F",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## 8. DATABASE SCHEMA

```sql
-- LOCATIONS
create table locations (
  id text primary key,
  name text not null,
  address text,
  lat float not null,
  lng float not null,
  geofence_radius int default 100,
  brand_color text,
  logo_url text,
  created_at timestamptz default now()
);

insert into locations values
  ('enso',    'Enso',    'Stuttgart', 48.7754284, 9.1818221, 100, '#2D6A4F', null, now()),
  ('origami', 'Origami', 'Stuttgart', 48.7702712, 9.1761777, 100, '#8B7355', null, now()),
  ('okyu',    'Okyu',    'Stuttgart', 48.7752705, 9.1724434, 100, '#C62828', null, now());

-- PROFILES
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  phone text,
  role text not null check (role in ('owner','manager','staff','azubi')),
  status text not null default 'pending' check (status in ('pending','active','suspended')),
  location_id text references locations(id),
  hired_at date,
  created_at timestamptz default now()
);

-- DOCUMENTS
create table documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  type text check (type in ('contract','rote_karte','gesundheitszeugnis','au','other')),
  file_url text,
  issued_at date,
  expires_at date,
  notes text,
  created_at timestamptz default now()
);

-- SICK REPORTS
create table sick_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  date date not null,
  au_code text,
  au_image_url text,
  status text default 'pending' check (status in ('pending','confirmed')),
  created_at timestamptz default now()
);

-- SHIFTS
create table shifts (
  id uuid primary key default gen_random_uuid(),
  location_id text references locations(id),
  profile_id uuid references profiles(id),
  role_tag text check (role_tag in ('bar','kitchen','service','all')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default 'scheduled' check (status in ('scheduled','open','filled','cancelled')),
  is_marketplace bool default false,
  created_at timestamptz default now()
);

-- SHIFT TEMPLATES
create table shift_templates (
  id uuid primary key default gen_random_uuid(),
  location_id text references locations(id),
  name text not null,
  template_data jsonb not null,
  created_at timestamptz default now()
);

-- ATTENDANCES
create table attendances (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid references shifts(id),
  profile_id uuid references profiles(id) on delete cascade,
  checkin_at timestamptz,
  checkout_at timestamptz,
  checkin_lat float,
  checkin_lng float,
  is_valid_location bool default false,
  pulse_mood int check (pulse_mood between 1 and 5),
  created_at timestamptz default now()
);

-- TIP POOLS
create table tip_pools (
  id uuid primary key default gen_random_uuid(),
  location_id text references locations(id),
  date date not null,
  total_amount decimal(10,2) not null,
  distributions jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- CHECKLIST TEMPLATES
create table checklist_templates (
  id uuid primary key default gen_random_uuid(),
  location_id text references locations(id),
  name text not null,
  type text check (type in ('open','close','custom')),
  items jsonb not null,
  created_at timestamptz default now()
);

-- CHECKLIST RUNS
create table checklist_runs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references checklist_templates(id),
  date date not null,
  completed_items jsonb default '[]',
  progress int default 0,
  created_at timestamptz default now()
);

-- CHANNELS
create table channels (
  id uuid primary key default gen_random_uuid(),
  location_id text references locations(id),
  name text not null,
  type text check (type in ('location','role','announcement')),
  created_at timestamptz default now()
);

-- MESSAGES
create table messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id) on delete cascade,
  sender_id uuid references profiles(id),
  body text not null,
  is_urgent bool default false,
  read_by jsonb default '[]',
  created_at timestamptz default now()
);

-- ANNOUNCEMENTS
create table announcements (
  id uuid primary key default gen_random_uuid(),
  location_id text references locations(id),
  title text not null,
  body text not null,
  is_urgent bool default false,
  confirmed_by jsonb default '[]',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- WHISTLEBLOWER (ẨN DANH TUYỆT ĐỐI)
create table whistleblower_reports (
  id uuid primary key default gen_random_uuid(),
  location_id text references locations(id),
  category text check (category in ('harassment','policy_violation','safety','other')),
  description text not null,
  created_at timestamptz default now()
  -- KHÔNG có profile_id — KHÔNG BAO GIỜ thêm
);
```

---

## 9. RLS POLICIES

```sql
alter table profiles enable row level security;
alter table shifts enable row level security;
alter table attendances enable row level security;
alter table documents enable row level security;

create policy "own_profile" on profiles
  for select using (auth.uid() = id);

create policy "manager_view_location" on profiles
  for select using (
    exists (
      select 1 from profiles p where p.id = auth.uid()
      and p.role in ('manager','owner')
      and p.location_id = profiles.location_id
    )
  );

create policy "own_shifts" on shifts
  for select using (profile_id = auth.uid());

create policy "manager_shifts" on shifts
  for all using (
    exists (
      select 1 from profiles p where p.id = auth.uid()
      and p.role in ('manager','owner')
      and p.location_id = shifts.location_id
    )
  );

create policy "anyone_report" on whistleblower_reports
  for insert with check (true);

create policy "owner_view_reports" on whistleblower_reports
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'owner'
    )
  );
```

---

## 10. BUSINESS RULES

### Auth
```
Đăng ký → status = 'pending'
middleware.ts check mọi request:
  pending   → /pending
  suspended → /suspended
  active    → tiếp tục vào app
```

### GPS (Web Geolocation API)
```
Geofence: 100 mét
navigator.geolocation.getCurrentPosition()
Tính khoảng cách: Haversine formula trong geo.ts
GPS tắt → hướng dẫn bật, không cho check-in
Auto check-out: Edge Function 30 phút sau shift.end_time
Nhắc: 15 phút trước shift.end_time
```

### Camera (Web)
```html
<!-- Upload ảnh AU — hoạt động trên mobile Chrome -->
<input type="file" accept="image/*" capture="environment" />
```

### Tip Pooling
```
Chỉ staff + azubi
hours_i  = checkout_at - checkin_at (giờ float)
ratio_i  = hours_i / sum(hours)
amount_i = round(total × ratio_i, 2)
Lệch → bù vào người nhiều giờ nhất
```

### Sick Report
```
1. Tạo sick_reports
2. Shift hôm nay → cancelled
3. Notify manager
eAU: ô text input
Ảnh AU: input file capture
```

### Urgent Announcement
```
Overlay full-screen
Chặn toàn bộ UI
Click "Đã đọc" → confirmed_by[] += profile_id
```

### Branding
```
Login → đọc location_id
→ getLocationTheme() → apply Tailwind classes
```

---

## 11. CONSTANTS

```typescript
// lib/constants.ts
export const GEOFENCE_RADIUS = 100
export const AUTO_CHECKOUT_MINUTES = 30
export const CHECKOUT_REMINDER_MINUTES = 15
export const DOCUMENT_EXPIRY_WARNING_DAYS = 30

export const LOCATIONS = { ENSO: 'enso', ORIGAMI: 'origami', OKYU: 'okyu' } as const
export const ROLES = { OWNER: 'owner', MANAGER: 'manager', STAFF: 'staff', AZUBI: 'azubi' } as const
export const STATUS = { PENDING: 'pending', ACTIVE: 'active', SUSPENDED: 'suspended' } as const
```

---

## 12. QUY TRÌNH OPUS KHI NHẬN TASK

```
1.  Đọc SKILL.md
2.  Xác nhận file cần tạo/sửa
3.  SQL migration nếu cần bảng mới
4.  TypeScript types
5.  Logic/utils
6.  UI (Server hoặc Client component)
7.  Đủ: Loading / Error / Empty states
8.  Không sửa file khác
9.  Không thêm package mới
10. Comment tiếng Việt cho logic phức tạp
11. Sau khi hoàn thành → tự chạy terminal:
    git add .
    git commit -m "feat: [mô tả ngắn task vừa làm]"
```

### Commit message format:
```
feat: thêm tính năng mới       → feat: login screen
fix: sửa bug                   → fix: gps check-in crash
style: chỉnh UI                → style: bottom nav spacing
refactor: tổ chức lại code     → refactor: tip calculator
chore: setup, config           → chore: supabase client setup
```

---

*SKILL.md v3.0 — Next.js 14 + Supabase + PWA*
*✅ Tọa độ GPS 3 quán đã cập nhật*
