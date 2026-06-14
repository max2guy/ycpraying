# 시즌2 홈커밍데이 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 기도 네트워크 앱에 시즌2 "홈커밍데이"를 추가한다 — FAB 메뉴에서 시즌 전환, Firebase 경로 분리(`s2/` 접두사), 레드 테마 CSS.

**Architecture:** localStorage에 활성 시즌(`s1`/`s2`)을 저장하고, 전환 시 Firebase refs를 재할당하고 리스너를 재등록한다. CSS는 `body.theme-s2` 클래스 토글로 전환한다. 기존 시즌1 데이터 경로는 변경 없다.

**Tech Stack:** Firebase Realtime Database, D3.js, Vanilla JS, CSS Custom Properties

---

## 파일 맵

| 파일 | 변경 내용 |
|------|----------|
| `style.css` | `body.theme-s2` CSS 변수 오버라이드 추가 |
| `script.js` | refs `const`→`let`, 리스너 함수화, `switchSeason()` / `applySeasonTheme()` / `updateSeasonUI()` 추가 |
| `index.html` | FAB 시즌 전환 버튼, 인트로 부제 요소, S2 뱃지 추가 |

---

## Task 1: CSS — 시즌2 레드 테마

**Files:**
- Modify: `style.css` (`:root` 블록 이후)

- [ ] **Step 1: `style.css` `:root` 블록 바로 아래에 다음을 추가**

`style.css`의 27번째 줄 (`:root { ... }` 블록 닫힘) 바로 아래:

```css
/* ── 시즌2 홈커밍데이 레드 테마 ── */
body.theme-s2 {
  --bg:        #FFF0F0;
  --bg-2:      #FFF5F5;
  --bg-3:      #FFE4E4;
  --glass:     rgba(255,245,245,0.88);
  --rose:      #E74C3C;
  --rose-dim:  #C0392B;
  --rose-soft: rgba(231,76,60,0.15);
  --rose-border:rgba(231,76,60,0.30);
  --text:      #6A1A1A;
  --text-muted:#B05050;
  --text-dim:  #D4A0A0;
  --shadow-sm: 0 2px 12px rgba(200,60,60,0.12);
  --shadow-md: 0 6px 28px rgba(180,40,40,0.16);
  --shadow-lg: 0 10px 50px rgba(160,20,20,0.20);
}
body.theme-s2 {
  background: linear-gradient(135deg, #FFD6D6 0%, #FFEAEA 35%, #F9E8E8 70%, #EFD0D0 100%);
}
body.theme-s2::before {
  background:
    radial-gradient(ellipse at 15% 15%, rgba(255,150,150,0.35) 0%, transparent 45%),
    radial-gradient(ellipse at 85% 85%, rgba(230,100,100,0.30) 0%, transparent 45%),
    radial-gradient(ellipse at 75% 15%, rgba(200,100,100,0.18) 0%, transparent 38%);
}
@media (hover: none) and (pointer: coarse) {
  body.theme-s2 #intro-screen { background: #FFEAEA; }
}
```

- [ ] **Step 2: 커밋**

```bash
git add style.css
git commit -m "feat: 시즌2 홈커밍데이 레드 테마 CSS 추가"
```

---

## Task 2: Firebase refs를 `let`으로 변경 + 시즌 유틸 함수 추가

**Files:**
- Modify: `script.js` (lines 119–124, 272–273)

현재 `const`로 선언된 refs를 `let`으로 바꿔야 `switchSeason()` 에서 재할당 가능.

- [ ] **Step 1: `script.js` lines 119–124 — refs를 `let`으로 변경**

변경 전:
```js
const database    = firebase.database();
const membersRef  = database.ref('members');
const centerNodeRef = database.ref('centerNode');
const onlineRef   = database.ref('.info/connected');
const presenceRef = database.ref('presence');
const messagesRef = database.ref('messages');
```

변경 후:
```js
const database    = firebase.database();
let membersRef    = database.ref('members');
let centerNodeRef = database.ref('centerNode');
const onlineRef   = database.ref('.info/connected');   // .info/connected는 고정 경로
let presenceRef   = database.ref('presence');
let messagesRef   = database.ref('messages');
```

- [ ] **Step 2: 같은 파일 — refs 선언 바로 아래에 시즌 유틸 함수 추가**

`messagesRef` 선언 직후 (line 124 이후) 빈 줄 하나 두고 삽입:

```js
// ── 시즌 유틸 ──
function getActiveSeason() { return localStorage.getItem('activeSeason') || 's1'; }

function initSeasonRefs() {
    const prefix = getActiveSeason() === 's2' ? 's2/' : '';
    membersRef    = database.ref(prefix + 'members');
    centerNodeRef = database.ref(prefix + 'centerNode');
    presenceRef   = database.ref(prefix + 'presence');
    messagesRef   = database.ref(prefix + 'messages');
    myPresenceRef = presenceRef.child(mySessionId);
}
```

> **주의:** `myPresenceRef`는 아직 선언 전이지만 `initSeasonRefs()`는 함수라 호이스팅 이슈 없음. `myPresenceRef`는 Task 3에서 `let`으로 변경.

- [ ] **Step 3: `script.js` line 273 — `myPresenceRef`를 `let`으로 변경**

변경 전:
```js
const myPresenceRef = presenceRef.child(mySessionId);
```

변경 후:
```js
let myPresenceRef = presenceRef.child(mySessionId);
```

- [ ] **Step 4: 커밋**

```bash
git add script.js
git commit -m "refactor: Firebase refs를 let으로 변경 + 시즌 유틸 함수 추가"
```

---

## Task 3: Firebase 리스너를 재사용 가능한 함수로 추출

**Files:**
- Modify: `script.js` (lines 277–308, 444–471, 1051–1089)

시즌 전환 시 `.off()` 후 리스너를 다시 등록할 수 있도록 함수화.

- [ ] **Step 1: Presence 리스너 함수화**

`script.js` lines 277–308의 코드를 `registerPresenceListeners()` 함수로 감싼다.

변경 전 (lines 277–308):
```js
// 앱 시작 시 stale 레코드 정리 (이전 push() 방식 고아 레코드 포함)
presenceRef.once('value', snap => {
    const now = Date.now();
    snap.forEach(child => {
        const data = child.val();
        if (!data || !data.time || (now - data.time) > PRESENCE_TTL) {
            child.ref.remove();
        }
    });
});

onlineRef.on('value', async snap => {
    if (snap.val()) {
        const myIp = await getMyIp();
        myPresenceRef.onDisconnect().remove();
        myPresenceRef.set({ ip: myIp, time: Date.now(), device: navigator.userAgent });
    }
});

// 주기적으로 timestamp 갱신 (heartbeat) → stale 판정 방지
setInterval(() => {
    if (myPresenceRef) myPresenceRef.update({ time: Date.now() });
}, 60 * 1000);

presenceRef.on('value', snap => {
    const now = Date.now();
    let count = 0;
    snap.forEach(child => {
        const data = child.val();
        if (data && data.time && (now - data.time) <= PRESENCE_TTL) count++;
        else child.ref.remove();
    });
    document.getElementById('online-count').innerText = `${count}명 접속 중`;
});
```

변경 후:
```js
function registerPresenceListeners() {
    presenceRef.once('value', snap => {
        const now = Date.now();
        snap.forEach(child => {
            const data = child.val();
            if (!data || !data.time || (now - data.time) > PRESENCE_TTL) {
                child.ref.remove();
            }
        });
    });

    onlineRef.on('value', async snap => {
        if (snap.val()) {
            const myIp = await getMyIp();
            myPresenceRef.onDisconnect().remove();
            myPresenceRef.set({ ip: myIp, time: Date.now(), device: navigator.userAgent });
        }
    });

    presenceRef.on('value', snap => {
        const now = Date.now();
        let count = 0;
        snap.forEach(child => {
            const data = child.val();
            if (data && data.time && (now - data.time) <= PRESENCE_TTL) count++;
            else child.ref.remove();
        });
        document.getElementById('online-count').innerText = `${count}명 접속 중`;
    });
}

// heartbeat (시즌 무관 — 항상 현재 myPresenceRef 사용)
setInterval(() => {
    if (myPresenceRef) myPresenceRef.update({ time: Date.now() });
}, 60 * 1000);

registerPresenceListeners();
```

- [ ] **Step 2: 멤버 리스너 함수화**

`script.js` lines 444–471의 코드를 `registerMemberListeners()` 함수로 감싼다.

변경 전 (lines 444–471):
```js
membersRef.on('child_added', snap => {
    if (!isDataLoaded) return;
    const val = snap.val();
    if (!members.find(m => m.firebaseKey === snap.key)) {
        members.push({ ...val, firebaseKey:snap.key, rotation:0, rotationDirection:1 });
        if (!isFirstRender) newMemberIds.add(val.id);
        updateGraph();
    }
});
membersRef.on('child_changed', snap => {
    if (!isDataLoaded) return;
    const idx = members.findIndex(m => m.firebaseKey === snap.key);
    if (idx !== -1) {
        const old = members[idx];
        Object.assign(members[idx], { ...snap.val(), firebaseKey:snap.key, x:old.x, y:old.y, vx:old.vx, vy:old.vy, rotation:old.rotation, rotationDirection:old.rotationDirection });
        updateNodeVisuals();
        if (currentMemberData && currentMemberData.firebaseKey === snap.key) {
            currentMemberData = members[idx]; renderPrayers();
        }
    }
});
membersRef.on('child_removed', snap => {
    const idx = members.findIndex(m => m.firebaseKey === snap.key);
    if (idx !== -1) {
        members.splice(idx, 1); updateGraph();
        if (currentMemberData && currentMemberData.firebaseKey === snap.key) closePrayerPopup();
    }
});
```

변경 후:
```js
function registerMemberListeners() {
    membersRef.on('child_added', snap => {
        if (!isDataLoaded) return;
        const val = snap.val();
        if (!members.find(m => m.firebaseKey === snap.key)) {
            members.push({ ...val, firebaseKey:snap.key, rotation:0, rotationDirection:1 });
            if (!isFirstRender) newMemberIds.add(val.id);
            updateGraph();
        }
    });
    membersRef.on('child_changed', snap => {
        if (!isDataLoaded) return;
        const idx = members.findIndex(m => m.firebaseKey === snap.key);
        if (idx !== -1) {
            const old = members[idx];
            Object.assign(members[idx], { ...snap.val(), firebaseKey:snap.key, x:old.x, y:old.y, vx:old.vx, vy:old.vy, rotation:old.rotation, rotationDirection:old.rotationDirection });
            updateNodeVisuals();
            if (currentMemberData && currentMemberData.firebaseKey === snap.key) {
                currentMemberData = members[idx]; renderPrayers();
            }
        }
    });
    membersRef.on('child_removed', snap => {
        const idx = members.findIndex(m => m.firebaseKey === snap.key);
        if (idx !== -1) {
            members.splice(idx, 1); updateGraph();
            if (currentMemberData && currentMemberData.firebaseKey === snap.key) closePrayerPopup();
        }
    });
}
registerMemberListeners();
```

- [ ] **Step 3: 채팅 리스너 함수화**

`script.js` line 1051 부근 `messagesRef.limitToLast(50).on('child_added', ...)` 코드를 함수로 감싼다.

변경 전 (line 1051):
```js
messagesRef.limitToLast(50).on('child_added', snap => {
    // ... (기존 채팅 버블 렌더링 코드 전체)
});
```

변경 후:
```js
function registerChatListener() {
    messagesRef.limitToLast(50).on('child_added', snap => {
        // ... (기존 채팅 버블 렌더링 코드 전체 — 변경 없이 그대로)
    });
}
registerChatListener();
```

- [ ] **Step 4: 커밋**

```bash
git add script.js
git commit -m "refactor: Firebase 리스너를 함수로 추출 (registerMemberListeners, registerPresenceListeners, registerChatListener)"
```

---

## Task 4: `switchSeason()` + `applySeasonTheme()` + `updateSeasonUI()` 구현

**Files:**
- Modify: `script.js` (`// ── UI FUNCTIONS ──` 블록 이후 적절한 위치)

- [ ] **Step 1: `script.js`의 `// ── UI FUNCTIONS ──` 섹션 (line ~740) 아래에 세 함수 추가**

```js
// ── 시즌 전환 ──
function applySeasonTheme() {
    const isS2 = getActiveSeason() === 's2';
    document.body.classList.toggle('theme-s2', isS2);
    const badge = document.getElementById('season-badge');
    if (badge) badge.style.display = isS2 ? 'inline-flex' : 'none';
    const sub = document.getElementById('intro-subtitle');
    if (sub) sub.textContent = isS2 ? '시즌2 · 홈커밍데이' : '기도 네트워크에 오신 것을 환영합니다';
}

function updateSeasonUI() {
    const isS2 = getActiveSeason() === 's2';
    const label = document.getElementById('btn-season-label');
    if (label) label.textContent = isS2 ? '🔄 시즌1으로' : '🔄 시즌2 · 홈커밍데이';
}

function switchSeason(target) {
    if (getActiveSeason() === target) { if (isFabOpen) toggleFabMenu(); return; }
    const name = target === 's2' ? '시즌2 · 홈커밍데이' : '시즌1';
    showConfirmDialog('시즌 전환', `${name}로 전환할까요?`, () => {
        // 기존 리스너 해제
        membersRef.off();
        messagesRef.off();
        presenceRef.off();
        onlineRef.off();

        // 채팅 DOM 초기화
        const chatEl = document.getElementById('chat-messages');
        chatEl.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:0.8rem;padding:10px;">이 소통방은 익명이며,<br>서로 사랑과 격려의 말을 나눠주세요.</div>';
        unreadChatKeys.clear();
        document.getElementById('chat-badge').classList.remove('active');

        // 시즌 저장 + refs 재할당
        localStorage.setItem('activeSeason', target);
        initSeasonRefs();

        // 상태 초기화
        members = [];
        centerNode = { id:"center", name:"연천장로교회\n청년부\n함께 기도해요", type:"root", icon:"✝️", color:"#FFF8E1" };
        isDataLoaded = false;
        isFirstRender = true;
        currentMemberData = null;
        closePrayerPopup();

        // 테마 + UI 업데이트
        applySeasonTheme();
        updateSeasonUI();

        // 리스너 재등록 + 데이터 로드
        registerPresenceListeners();
        registerMemberListeners();
        registerChatListener();
        loadData();

        if (isFabOpen) toggleFabMenu();
    });
}
```

- [ ] **Step 2: 앱 초기 로드 시 시즌 적용**

`script.js` 맨 아래(gameLoop 아래)에 추가:

```js
// ── 앱 초기 시즌 적용 ──
applySeasonTheme();
updateSeasonUI();
```

- [ ] **Step 3: 커밋**

```bash
git add script.js
git commit -m "feat: switchSeason / applySeasonTheme / updateSeasonUI 구현"
```

---

## Task 5: index.html — FAB 버튼 + 인트로 부제 + S2 뱃지

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 인트로 화면에 부제 요소 추가**

`index.html` lines 27–38의 인트로 섹션에서 `<p>기도 네트워크에 오신 것을 환영합니다</p>`를 id를 붙여 교체:

변경 전:
```html
<p>기도 네트워크에 오신 것을 환영합니다</p>
```

변경 후:
```html
<p id="intro-subtitle">기도 네트워크에 오신 것을 환영합니다</p>
```

- [ ] **Step 2: 상단 UI에 S2 뱃지 추가**

`index.html` line 48의 캠프 버튼 바로 앞 또는 뒤에 뱃지 추가:

변경 전:
```html
<button class="camp-btn top-ui-common" onclick="event.stopPropagation(); toggleCampPopup()" aria-label="2026 캠프 정보 보기">⛺ 2026 캠프</button>
```

변경 후:
```html
<button class="camp-btn top-ui-common" onclick="event.stopPropagation(); toggleCampPopup()" aria-label="2026 캠프 정보 보기">⛺ 2026 캠프</button>
<span id="season-badge" class="season-badge" style="display:none;">S2</span>
```

- [ ] **Step 3: FAB 메뉴에 시즌 전환 버튼 추가**

`index.html` lines 71–82의 FAB 메뉴에서 `add-member-btn` 아래에 버튼 추가:

변경 전:
```html
<div id="menu-container">
    <button class="float-btn menu-main-btn" onclick="event.stopPropagation(); toggleFabMenu()" aria-label="메뉴 열기">
        <span class="material-symbols-rounded">menu</span>
    </button>
    <button class="float-btn sub-btn settings-btn" onclick="event.stopPropagation(); openSettingsModal()" title="설정" aria-label="설정 및 관리자 모드">
        <span class="material-symbols-rounded">settings</span>
    </button>
    <button class="float-btn sub-btn add-member-btn" onclick="event.stopPropagation(); addNewMember()" title="사람 추가" aria-label="새로운 기도 멤버 추가">
        <span class="material-symbols-rounded">person_add</span>
    </button>
</div>
```

변경 후:
```html
<div id="menu-container">
    <button class="float-btn menu-main-btn" onclick="event.stopPropagation(); toggleFabMenu()" aria-label="메뉴 열기">
        <span class="material-symbols-rounded">menu</span>
    </button>
    <button class="float-btn sub-btn settings-btn" onclick="event.stopPropagation(); openSettingsModal()" title="설정" aria-label="설정 및 관리자 모드">
        <span class="material-symbols-rounded">settings</span>
    </button>
    <button class="float-btn sub-btn add-member-btn" onclick="event.stopPropagation(); addNewMember()" title="사람 추가" aria-label="새로운 기도 멤버 추가">
        <span class="material-symbols-rounded">person_add</span>
    </button>
    <button class="float-btn sub-btn season-switch-btn" id="btn-season-switch" onclick="event.stopPropagation(); switchSeason(getActiveSeason()==='s1'?'s2':'s1')" aria-label="시즌 전환">
        <span class="material-symbols-rounded">sync</span>
    </button>
</div>
```

- [ ] **Step 4: S2 뱃지 + 시즌 전환 버튼 CSS 추가**

`style.css`에 추가 (파일 맨 아래):

```css
/* ── 시즌 뱃지 ── */
.season-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 12px;
  left: 90px;
  background: var(--rose);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  z-index: 100;
  letter-spacing: 0.05em;
  box-shadow: var(--shadow-sm);
}

/* ── 시즌 전환 버튼 라벨 ── */
.season-switch-btn {
  font-size: 0.75rem !important;
  min-width: 44px;
}
```

- [ ] **Step 5: 커밋**

```bash
git add index.html style.css
git commit -m "feat: FAB 시즌 전환 버튼, 인트로 부제, S2 뱃지 추가"
```

---

## Task 6: SW 캐시 버전 범프

**Files:**
- Modify: `sw.js`, `index.html` (`style.css?v=`, `script.js?v=`)

새 파일이 추가/수정됐으므로 SW 캐시를 갱신해 기존 사용자에게 업데이트가 전달되도록 한다.

- [ ] **Step 1: `sw.js` 캐시 버전 확인 후 버전 번호 올리기**

`sw.js`에서 `CACHE_NAME` 또는 버전 상수를 찾아 숫자를 1 올린다. 예:
```js
// 변경 전
const CACHE_NAME = 'ycprayer-v53';
// 변경 후
const CACHE_NAME = 'ycprayer-v54';
```

- [ ] **Step 2: `index.html` CSS/JS 쿼리스트링 버전 올리기**

`index.html`에서:
```html
<!-- 변경 전 -->
<link rel="stylesheet" href="style.css?v=46">
<script src="script.js?v=46" defer></script>
<!-- 변경 후 -->
<link rel="stylesheet" href="style.css?v=47">
<script src="script.js?v=47" defer></script>
```

- [ ] **Step 3: 커밋**

```bash
git add sw.js index.html
git commit -m "chore: SW 캐시 v54, 쿼리스트링 v47 (시즌2 업데이트 배포)"
```

---

## Task 7: 푸시 + 검증

- [ ] **Step 1: GitHub에 푸시**

```bash
git push origin main
```

- [ ] **Step 2: 동작 확인 체크리스트**

브라우저에서 `https://max2guy.github.io/ycpraying/` 열어 확인:

1. FAB 메뉴 열기 → "🔄 시즌2 · 홈커밍데이" 버튼 표시 여부
2. 버튼 클릭 → 확인 다이얼로그 등장
3. 확인 → 배경이 레드 계열로 전환
4. 상단에 "S2" 뱃지 표시
5. 인트로(페이지 새로고침) → "시즌2 · 홈커밍데이" 부제 표시
6. 멤버 추가 → `s2/members` 경로에 저장 (Firebase 콘솔 확인)
7. 채팅 → `s2/messages` 경로에 저장
8. FAB → 시즌1으로 전환 → 오렌지 테마 복원, S2 뱃지 숨김
9. 시즌1 멤버 데이터 그대로 유지 확인
