## TASK: BottomNav — Icon outline tinh tế + động theo role
## Model: OPUS
## File: components/layout/BottomNav.tsx

---

### MÔ TẢ CHUNG
Bottom navigation bar với icon outline đơn giản, tinh tế.
Số tab thay đổi theo role — không cố định 7 tab cho tất cả.

---

### CẤU TRÚC TAB THEO ROLE

```typescript
// Base tabs — tất cả role đều thấy
const BASE_TABS = [
  { key: 'home',      label: 'Home',      href: '/home',      icon: HomeIcon      },
  { key: 'schedule',  label: 'Lịch',      href: '/schedule',  icon: CalendarIcon  },
  { key: 'hr',        label: 'Hồ sơ',     href: '/hr',        icon: UserIcon      },
]

// Tab bổ sung theo role
const ROLE_TABS: Record<string, TabItem[]> = {
  azubi: [
    { key: 'studyhub',  label: 'Học',       href: '/studyhub',        icon: BookOpenIcon   },
    { key: 'checklist', label: 'Checklist', href: '/checklist',       icon: ChecklistIcon  },
  ],
  staff: [
    { key: 'checklist', label: 'Checklist', href: '/checklist',       icon: ChecklistIcon  },
    { key: 'tip',       label: 'Tip',       href: '/finance/tip-pool',icon: TipIcon        },
  ],
  manager: [
    { key: 'checklist', label: 'Checklist', href: '/checklist',       icon: ChecklistIcon  },
    { key: 'tip',       label: 'Tip',       href: '/finance/tip-pool',icon: TipIcon        },
    { key: 'approval',  label: 'Duyệt',     href: '/admin/approval',  icon: ApprovalIcon,
      badge: pendingCount },
  ],
  owner: [
    { key: 'checklist', label: 'Checklist', href: '/checklist',       icon: ChecklistIcon  },
    { key: 'tip',       label: 'Tip',       href: '/finance/tip-pool',icon: TipIcon        },
    { key: 'approval',  label: 'Duyệt',     href: '/admin/approval',  icon: ApprovalIcon,
      badge: pendingCount },
  ],
}

// Ghép + sắp xếp đúng thứ tự
const buildTabs = (role: string): TabItem[] => {
  const extra = ROLE_TABS[role] ?? []
  // Thứ tự: Home → Lịch → [extra] → Hồ sơ
  return [BASE_TABS[0], BASE_TABS[1], ...extra, BASE_TABS[2]]
}
```

Kết quả số tab theo role:
- staff   → 5 tab: Home · Lịch · Checklist · Tip · Hồ sơ
- azubi   → 5 tab: Home · Lịch · Học · Checklist · Hồ sơ
- manager → 6 tab: Home · Lịch · Checklist · Tip · Duyệt · Hồ sơ
- owner   → 6 tab: Home · Lịch · Checklist · Tip · Duyệt · Hồ sơ

---

### ICON SET (lucide-react — outline, stroke-width 1.5)

```typescript
import {
  Home,           // Home
  Calendar,       // Lịch
  BookOpen,       // Học (Studyhub)
  ClipboardList,  // Checklist
  CircleDollarSign, // Tip
  UserCheck,      // Duyệt
  User,           // Hồ sơ
} from 'lucide-react'
```

Tất cả icon: size 22px, strokeWidth={1.5}
Không fill, chỉ outline — giữ đúng style ảnh mẫu.

---

### THIẾT KẾ TỪNG TAB ITEM

```tsx
// Mỗi tab item
<button
  onClick={() => router.push(tab.href)}
  className="flex flex-col items-center justify-center gap-[3px] flex-1 py-2 relative"
>
  {/* Icon wrapper */}
  <div className={cn(
    'relative flex items-center justify-center',
    'w-7 h-7 rounded-xl transition-all duration-200',
  )}>
    <tab.icon
      size={22}
      strokeWidth={1.5}
      className={cn(
        'transition-all duration-200',
        isActive
          ? 'stroke-[--brand]'       // màu quán khi active
          : 'stroke-gray-400'        // xám nhạt khi inactive
      )}
    />
    {/* Badge số */}
    {tab.badge > 0 && (
      <span className="absolute -top-1 -right-1.5
                        w-[14px] h-[14px] rounded-full
                        bg-red-500 text-white
                        text-[8px] font-bold
                        flex items-center justify-center
                        border-[1.5px] border-white">
        {tab.badge > 9 ? '9+' : tab.badge}
      </span>
    )}
  </div>

  {/* Label — chỉ hiện khi active */}
  <span className={cn(
    'text-[10px] font-semibold leading-none transition-all duration-200',
    'font-[Sora,sans-serif] tracking-[0.02em]',
    isActive
      ? 'opacity-100 text-[--brand]'
      : 'opacity-0 h-0 overflow-hidden'
  )}>
    {tab.label}
  </span>
</button>
```

---

### CONTAINER NAV

```tsx
<nav
  className={cn(
    'fixed bottom-0 left-0 right-0 z-50',
    'bg-white border-t border-black/[0.06]',
    'grid',
    // Grid động theo số tab
    tabs.length === 6 ? 'grid-cols-6' : 'grid-cols-5',
    'pb-[env(safe-area-inset-bottom)]',  // iOS notch
  )}
  style={{ boxShadow: '0 -1px 0 rgba(0,0,0,0.06), 0 -4px 16px rgba(0,0,0,0.04)' }}
>
```

---

### CSS VARIABLE MÀU QUÁN

```typescript
// Lấy từ profile.location_id sau khi login
const BRAND_COLORS = {
  enso:    '#2D6A4F',
  origami: '#8B7355',
  okyu:    '#C62828',
} as const

// Set vào root element
document.documentElement.style.setProperty('--brand', BRAND_COLORS[locationId])
```

---

### ACTIVE DETECTION

```typescript
'use client'
const pathname = usePathname()

const isActive = (href: string) => {
  if (href === '/home') return pathname === '/home'
  return pathname.startsWith(href)  // /schedule/123 vẫn active tab Lịch
}
```

---

### BADGE — ĐẾM PENDING (manager/owner)

```typescript
// Chỉ query khi role là manager hoặc owner
const { data: pendingCount = 0 } = useQuery({
  queryKey: ['pending-profiles', profile?.location_id],
  queryFn: async () => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('location_id', profile.location_id)
    return count ?? 0
  },
  enabled: ['manager', 'owner'].includes(profile?.role ?? ''),
  refetchInterval: 30_000, // poll mỗi 30 giây
})
```

---

### VIEWPORT META (thêm vào app/layout.tsx nếu chưa có)

```tsx
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover"
/>
```

---

### KHÔNG LÀM
- Không dùng animation phức tạp (chỉ transition opacity/color)
- Không thêm package mới ngoài lucide-react đã có
- Không sửa file ngoài BottomNav.tsx
- Không làm active background pill — chỉ đổi màu icon + hiện label
