Đọc SKILL.md trước khi làm.

## TASK: BottomNav động theo role — dịch từ HTML preview

## Model: OPUS

## File: components/layout/BottomNav.tsx

Dưới đây là file HTML preview BottomNav động theo role.
Hãy dịch UI này sang Next.js + Tailwind CSS.

### Yêu cầu kỹ thuật:

1. Icon: lucide-react, strokeWidth=1.5, size=22, outline only — KHÔNG fill
2. Tab theo role:
   - staff → 5 tab: Home · Lịch · Checklist · Tip · Hồ sơ
   - azubi → 5 tab: Home · Lịch · Học · Checklist · Hồ sơ
   - manager → 6 tab: Home · Lịch · Checklist · Tip · Duyệt · Hồ sơ
   - owner → 6 tab: Home · Lịch · Checklist · Tip · Duyệt · Hồ sơ
3. Active state: icon đổi màu --brand (màu quán), label hiện
   Inactive: icon gray-400, label ẩn (opacity-0, h-0)
4. Grid: grid-cols-5 hoặc grid-cols-6 tùy role
5. Icon size nhỏ hơn khi 6 tab: size=20 thay vì 22
6. Badge đỏ góc icon: Duyệt (pending count), Chat (unread count)
7. iOS safe area: pb-[env(safe-area-inset-bottom)]
8. Active detection: usePathname().startsWith(tab.href)
9. CSS variable --brand set từ getLocationTheme(profile.location_id)
10. Badge Duyệt: poll Supabase mỗi 30s, chỉ khi role=manager/owner

### Viewport meta (thêm vào app/layout.tsx nếu chưa có):

<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

### Không làm:

- Không dùng animation phức tạp, chỉ transition color/opacity
- Không thêm package mới
- Không sửa file ngoài BottomNav.tsx

---

## HTML PREVIEW (nguồn thiết kế):

<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nav động theo Role — Enso HR</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');

- { margin: 0; padding: 0; box-sizing: border-box; }

body {
font-family: 'DM Sans', sans-serif;
background: #EDEEF2;
min-height: 100vh;
padding: 40px 20px 60px;
display: flex;
flex-direction: column;
align-items: center;
gap: 40px;
}

h1 {
font-family: 'Sora', sans-serif;
font-size: 12px;
font-weight: 600;
letter-spacing: 0.12em;
text-transform: uppercase;
color: #888;
}

/_ Role switcher _/
.role-switcher {
display: flex;
background: #fff;
border-radius: 16px;
padding: 4px;
gap: 2px;
box-shadow: 0 2px 12px rgba(0,0,0,0.07);
}
.role-btn {
font-family: 'Sora', sans-serif;
font-size: 12px;
font-weight: 600;
padding: 8px 18px;
border-radius: 12px;
border: none;
cursor: pointer;
background: transparent;
color: #999;
transition: all 0.2s;
}
.role-btn.active { background: #2D6A4F; color: #fff; }

/_ phones _/
.phones { display: flex; gap: 28px; flex-wrap: wrap; justify-content: center; }

.phone {
width: 300px;
height: 620px;
border-radius: 44px;
box-shadow: 0 32px 80px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.07);
overflow: hidden;
border: 7px solid #111;
display: flex;
flex-direction: column;
animation: fadeUp 0.35s ease both;
}
@keyframes fadeUp {
from { opacity:0; transform:translateY(14px); }
to { opacity:1; transform:translateY(0); }
}

.status-bar {
height: 36px;
background: #2D6A4F;
color: #fff;
display: flex;
align-items: center;
justify-content: space-between;
padding: 0 22px;
font-size: 11px;
font-weight: 700;
font-family: 'Sora', sans-serif;
flex-shrink: 0;
}

.screen-body {
flex: 1;
background: #f4f7f5;
overflow-y: auto;
scrollbar-width: none;
padding: 20px 16px;
display: flex;
flex-direction: column;
gap: 12px;
}
.screen-body::-webkit-scrollbar { display: none; }

/_ Page label _/
.page-label {
font-family: 'Sora', sans-serif;
font-size: 18px;
font-weight: 700;
color: #1a1a1a;
}
.role-chip {
display: inline-flex;
align-items: center;
gap: 5px;
font-size: 11px;
font-weight: 700;
padding: 4px 10px;
border-radius: 20px;
font-family: 'Sora', sans-serif;
}

/_ Fake content cards _/
.card {
background: #fff;
border-radius: 16px;
padding: 14px;
box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.card-row { display: flex; align-items: center; gap: 10px; }
.card-icon {
width: 40px; height: 40px; border-radius: 12px;
display: flex; align-items: center; justify-content: center;
font-size: 18px; flex-shrink: 0;
}
.card-lines { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.card-line {
height: 10px; background: #eee; border-radius: 5px;
}

/_ Studyhub card (azubi special) _/
.studyhub-card {
background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 60%, #52B788 100%);
border-radius: 18px;
padding: 16px;
color: #fff;
position: relative;
overflow: hidden;
}
.studyhub-card::before {
content: '📚';
position: absolute;
right: -4px;
top: -8px;
font-size: 64px;
opacity: 0.15;
}
.studyhub-title {
font-family: 'Sora', sans-serif;
font-size: 14px;
font-weight: 700;
margin-bottom: 3px;
}
.studyhub-sub {
font-size: 11px;
opacity: 0.75;
margin-bottom: 12px;
}
.studyhub-progress {
background: rgba(255,255,255,0.2);
border-radius: 6px;
height: 6px;
margin-bottom: 5px;
overflow: hidden;
}
.studyhub-progress-fill {
height: 100%;
background: #fff;
border-radius: 6px;
width: 35%;
}
.studyhub-meta {
font-size: 10px;
opacity: 0.65;
}

/_ ===== BOTTOM NAV ===== _/
.bottom-nav {
background: #fff;
border-top: 1px solid rgba(0,0,0,0.06);
padding: 8px 4px 10px;
box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
flex-shrink: 0;
display: grid;
}
.nav-4 { grid-template-columns: repeat(4, 1fr); }
.nav-5 { grid-template-columns: repeat(5, 1fr); }

.nav-item {
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
gap: 3px;
cursor: pointer;
}

.nav-pill {
height: 28px;
border-radius: 14px;
display: flex;
align-items: center;
justify-content: center;
transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
width: 40px;
position: relative;
}
.nav-4 .nav-pill { width: 44px; }
.nav-5 .nav-pill { width: 38px; }

.nav-pill svg {
width: 20px; height: 20px;
stroke: #c0c8d0; fill: none;
stroke-width: 1.8;
stroke-linecap: round; stroke-linejoin: round;
transition: stroke 0.2s;
}
.nav-pill.active {
background: rgba(45,106,79,0.1);
}
.nav-pill.active { width: 48px; }
.nav-4 .nav-pill.active { width: 52px; }
.nav-5 .nav-pill.active { width: 44px; }

.nav-pill.active svg { stroke: #2D6A4F; }

.nav-label {
font-size: 9px;
font-weight: 700;
color: #2D6A4F;
font-family: 'Sora', sans-serif;
opacity: 0;
transition: opacity 0.2s;
white-space: nowrap;
}
.nav-pill.active + .nav-label { opacity: 1; }

/_ Badge _/
.nav-badge {
position: absolute;
top: -2px; right: -2px;
width: 14px; height: 14px;
background: #ef4444;
border-radius: 7px;
font-size: 8px; font-weight: 700;
color: white;
display: flex; align-items: center; justify-content: center;
border: 2px solid #fff;
}

/_ Studyhub tab special glow _/
.nav-pill.studyhub-active {
background: rgba(45,106,79,0.12);
width: 44px !important;
}
.nav-pill.studyhub-active svg { stroke: #2D6A4F; }
.nav-pill.studyhub-active + .nav-label { opacity: 1; }

/_ Role diff label _/
.diff-label {
display: flex;
align-items: center;
gap: 8px;
padding: 8px 14px;
background: #fff;
border-radius: 12px;
font-size: 11px;
font-weight: 500;
color: #555;
box-shadow: 0 2px 8px rgba(0,0,0,0.06);
font-family: 'Sora', sans-serif;
}
.diff-dot {
width: 8px; height: 8px;
border-radius: 4px;
background: #2D6A4F;
}

/_ Code block _/
.code-section { width: 100%; max-width: 860px; }
.code-header {
font-family: 'Sora', sans-serif;
font-size: 11px; font-weight: 700;
letter-spacing: 0.1em; text-transform: uppercase;
color: #666; margin-bottom: 10px;
}
.code-box {
background: #13131f;
border-radius: 20px;
padding: 28px;
font-family: 'Courier New', monospace;
font-size: 11.5px;
line-height: 1.75;
color: #c9d1d9;
white-space: pre-wrap;
word-break: break-word;
box-shadow: 0 12px 40px rgba(0,0,0,0.25);
position: relative;
}
.copy-btn {
position: absolute; top: 18px; right: 18px;
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.12);
color: #8b949e; font-size: 11px; font-weight: 600;
padding: 6px 14px; border-radius: 8px; cursor: pointer;
transition: all 0.2s; font-family: 'Sora', sans-serif;
}
.copy-btn:hover { background: rgba(255,255,255,0.14); color: #ccc; }
.copy-btn.copied { background: #238636; color: #fff; border-color: #238636; }
.c-h { color: #79c0ff; font-weight: 700; }
.c-k { color: #ff7b72; }
.c-v { color: #a5d6ff; }
.c-s { color: #a8ff9e; }
.c-c { color: #555d6a; font-style: italic; }
.c-w { color: #ffa657; font-weight: 600; }
</style>

</head>
<body>

<h1>Nav động theo Role — Enso HR</h1>

<!-- Role switcher -->
<div class="role-switcher">
  <button class="role-btn active" onclick="switchRole('staff', this)">👨‍🍳 Staff</button>
  <button class="role-btn" onclick="switchRole('azubi', this)">🎓 Azubi</button>
  <button class="role-btn" onclick="switchRole('manager', this)">👔 Manager</button>
  <button class="role-btn" onclick="switchRole('owner', this)">👑 Owner</button>
</div>

<!-- Diff labels -->
<div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center">
  <div class="diff-label"><div class="diff-dot" style="background:#2D6A4F"></div>4 tab: Home · Lịch · Chat · Hồ sơ</div>
  <div class="diff-label"><div class="diff-dot" style="background:#7c3aed"></div>5 tab (azubi): + Học 📚</div>
</div>

<div class="phones" id="phoneWrap">
  <!-- Phone sẽ được render bằng JS -->
</div>

<!-- Prompt / Code -->
<div class="code-section">
  <div class="code-header">📋 Prompt — BottomNav động theo role</div>
  <div class="code-box" id="promptBox">
<button class="copy-btn" onclick="copyPrompt(this)">Copy</button>
<span class="c-h">## TASK: BottomNav động theo role</span>
<span class="c-h">## Model: SONNET</span>
<span class="c-k">## File:</span> <span class="c-v">components/layout/BottomNav.tsx</span>

<span class="c-w">### Logic hiển thị tab theo role:</span>

<span class="c-c">// 4 tab mặc định (staff, manager, owner)</span>
const BASE_TABS = [
{ label: 'Home', icon: Home, href: '/home' },
{ label: 'Lịch', icon: Calendar, href: '/schedule' },
{ label: 'Chat', icon: MessageCircle,href: '/chat', badge: unreadCount },
{ label: 'Hồ sơ', icon: User, href: '/hr' },
]

<span class="c-c">// Tab bổ sung CHỈ dành cho azubi</span>
const AZUBI_EXTRA_TAB = {
label: 'Học',
icon: BookOpen,
href: '/studyhub',
badge: requiredCoursesCount, <span class="c-c">// số khóa bắt buộc chưa xong</span>
}

<span class="c-c">// Ghép tab theo role</span>
const tabs = useMemo(() => {
if (role === 'azubi') {
<span class="c-c">// Chèn tab Học vào vị trí thứ 3 (giữa Chat và Hồ sơ)</span>
return [
BASE_TABS[0], <span class="c-c">// Home</span>
BASE_TABS[1], <span class="c-c">// Lịch</span>
BASE_TABS[2], <span class="c-c">// Chat</span>
AZUBI_EXTRA_TAB, <span class="c-c">// Học 📚</span>
BASE_TABS[3], <span class="c-c">// Hồ sơ</span>
]
}
return BASE_TABS
}, [role, unreadCount, requiredCoursesCount])

<span class="c-w">### Grid động:</span>
&lt;nav className={cn(
'grid',
tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4'
)}&gt;

<span class="c-w">### Icon size theo số tab:</span>
tabs.length === 5
? 'w-[18px] h-[18px]' <span class="c-c">// nhỏ hơn 1 chút khi 5 tab</span>
: 'w-[20px] h-[20px]' <span class="c-c">// size bình thường khi 4 tab</span>

<span class="c-w">### Pill width theo số tab:</span>
tabs.length === 5
? isActive ? 'w-[42px]' : 'w-[36px]'
: isActive ? 'w-[52px]' : 'w-[44px]'

<span class="c-w">### Lấy role từ session:</span>
<span class="c-c">// Dùng hook đã có</span>
const { profile } = useAuth()
const role = profile?.role <span class="c-c">// 'owner'|'manager'|'staff'|'azubi'</span>

<span class="c-w">### Badge tab Học (azubi):</span>
<span class="c-c">// Query: courses bắt buộc chưa enroll hoặc chưa hoàn thành</span>
const { data: requiredCoursesCount } = useQuery({
queryKey: ['required-courses', profile?.id],
queryFn: () => getRequiredCoursesCount(profile.id),
enabled: role === 'azubi', <span class="c-c">// chỉ query khi là azubi</span>
})

<span class="c-w">### Home page — Card Studyhub (chỉ azubi):</span>
Thêm vào Home page, hiển thị nếu role === 'azubi':

- Card gradient xanh đậm
- "Khóa học đang học" + progress bar
- "X/Y bài hoàn thành"
- Nút "Tiếp tục học →" → /studyhub

<span class="c-w">### Không làm:</span>

- Không sửa routing hoặc auth guard
- Không làm trang /studyhub trong task này
- Không sửa file ngoài BottomNav.tsx
</div>
</div>

<script>
const ROLES = {
  staff:   { label: '👨‍🍳 Staff',   color: '#2D6A4F', tabs: 4 },
  azubi:   { label: '🎓 Azubi',   color: '#2D6A4F', tabs: 5 },
  manager: { label: '👔 Manager', color: '#2D6A4F', tabs: 4 },
  owner:   { label: '👑 Owner',   color: '#2D6A4F', tabs: 4 },
}

const ALL_TABS = {
  home:     { label: 'Home',   emoji: '🏠', icon: `<svg viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1z"/><path d="M9 21V12h6v9"/></svg>` },
  schedule: { label: 'Lịch',   emoji: '📅', icon: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>` },
  chat:     { label: 'Chat',   emoji: '💬', icon: `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`, badge: 3 },
  studyhub: { label: 'Học',    emoji: '📚', icon: `<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`, badge: 2, isAzubi: true },
  hr:       { label: 'Hồ sơ', emoji: '👤', icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>` },
}

const TAB_SETS = {
  staff:   ['home','schedule','chat','hr'],
  azubi:   ['home','schedule','chat','studyhub','hr'],
  manager: ['home','schedule','chat','hr'],
  owner:   ['home','schedule','chat','hr'],
}

const HOME_CONTENT = {
  staff:   { greeting: 'Xin chào 👋', name: 'Nguyễn Văn A', role: 'Staff · Bếp', extra: null },
  azubi:   { greeting: 'Xin chào 👋', name: 'Trần Thị B', role: 'Azubi · Service', extra: 'studyhub' },
  manager: { greeting: 'Xin chào 👋', name: 'Lê Quản Lý', role: 'Manager · Enso', extra: null },
  owner:   { greeting: 'Xin chào 👋', name: 'Chủ Quán', role: 'Owner', extra: null },
}

function renderPhone(role) {
  const tabKeys = TAB_SETS[role]
  const isAzubi = role === 'azubi'
  const content = HOME_CONTENT[role]
  const gridClass = tabKeys.length === 5 ? 'nav-5' : 'nav-4'
  const pillW = tabKeys.length === 5 ? '38px' : '44px'
  const pillActiveW = tabKeys.length === 5 ? '44px' : '52px'
  const iconSize = tabKeys.length === 5 ? '18px' : '20px'

  const navItems = tabKeys.map((key, i) => {
    const tab = ALL_TABS[key]
    const isActive = key === 'home'
    const isStudyhub = key === 'studyhub'
    return `
      <div class="nav-item">
        <div class="nav-pill ${isActive ? 'active' : ''}"
             style="width:${isActive ? pillActiveW : pillW};
                    ${isStudyhub && !isActive ? 'background:rgba(124,58,237,0.08)' : ''}">
          <svg viewBox="0 0 24 24" style="width:${iconSize};height:${iconSize};stroke:${isActive ? '#2D6A4F' : isStudyhub ? '#7c3aed' : '#c0c8d0'};fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round">${tab.icon.match(/>(.+)<\/svg>/s)?.[1] || ''}</svg>
          ${tab.badge ? `<span class="nav-badge">${tab.badge}</span>` : ''}
        </div>
        <span class="nav-label" style="color:${isActive ? '#2D6A4F' : '#999'};opacity:${isActive ? '1' : '0'}">${tab.label}</span>
      </div>
    `
  }).join('')

  const studyhubCard = isAzubi ? `
    <div class="studyhub-card">
      <div class="studyhub-title">📚 Khóa học của bạn</div>
      <div class="studyhub-sub">An toàn thực phẩm · 3/8 bài</div>
      <div class="studyhub-progress"><div class="studyhub-progress-fill"></div></div>
      <div class="studyhub-meta">2 khóa bắt buộc chưa hoàn thành</div>
    </div>
  ` : ''

  return `
    <div class="phone" style="background:#fff">
      <div class="status-bar">
        <span>9:41</span>
        <span style="font-size:10px;opacity:0.8">${content.role}</span>
        <span>●●</span>
      </div>
      <div class="screen-body">
        <div>
          <div style="font-size:11px;color:#aaa;font-weight:500;margin-bottom:2px">${content.greeting}</div>
          <div class="page-label">${content.name}</div>
        </div>
        <div>
          <span class="role-chip" style="background:${isAzubi ? 'rgba(124,58,237,0.1)' : 'rgba(45,106,79,0.1)'};color:${isAzubi ? '#7c3aed' : '#2D6A4F'}">
            ${role === 'azubi' ? '🎓 Azubi' : role === 'manager' ? '👔 Manager' : role === 'owner' ? '👑 Owner' : '👨‍🍳 Staff'}
          </span>
        </div>
        ${studyhubCard}
        <div class="card">
          <div class="card-row">
            <div class="card-icon" style="background:#D8F3DC">🍳</div>
            <div class="card-lines">
              <div class="card-line" style="width:70%"></div>
              <div class="card-line" style="width:45%"></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-row">
            <div class="card-icon" style="background:#e8f4fd">📋</div>
            <div class="card-lines">
              <div class="card-line" style="width:80%"></div>
              <div class="card-line" style="width:55%"></div>
            </div>
          </div>
        </div>
        ${isAzubi ? '' : `<div class="card">
          <div class="card-row">
            <div class="card-icon" style="background:#fef3c7">💰</div>
            <div class="card-lines">
              <div class="card-line" style="width:60%"></div>
              <div class="card-line" style="width:40%"></div>
            </div>
          </div>
        </div>`}
      </div>
      <nav class="bottom-nav ${gridClass}">
        ${navItems}
      </nav>
    </div>
  `
}

let currentRole = 'staff'

function switchRole(role, btn) {
  currentRole = role
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  const wrap = document.getElementById('phoneWrap')
  wrap.innerHTML = renderPhone(role)
}

// Init
document.getElementById('phoneWrap').innerHTML = renderPhone('staff')

function copyPrompt(btn) {
  const box = document.getElementById('promptBox')
  const text = box.innerText.replace(/^(Copy|Copied! ✓)\n/, '')
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copied! ✓'
    btn.classList.add('copied')
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied') }, 2200)
  })
}
</script>
</body>
</html>
