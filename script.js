// ==========================================
// 연천장로교회 청년부 기도 네트워크 (Final v13)
// ==========================================

// 1. 서비스 워커 등록
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function(registration) {
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    document.getElementById('update-toast').classList.add('show');
                }
            });
        });
    });
}

// 2. Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyAF-L1RGBMb_uZBR4a3Aj0OVFu_KjccWZQ",
    authDomain: "ycprayer-7eac2.firebaseapp.com",
    databaseURL: "https://ycprayer-7eac2-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ycprayer-7eac2",
    storageBucket: "ycprayer-7eac2.firebasestorage.app",
    messagingSenderId: "308314713888",
    appId: "1:308314713888:web:dc52dc7ba1ac7b76153145",
    measurementId: "G-XGEMDBQG2J"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const membersRef = database.ref('members');
const messagesRef = database.ref('messages');
const presenceRef = database.ref('presence');

// 변수 및 상태 관리
let isAdmin = false;
let isFirstRender = true;
let currentMemberData = null;
let readStatus = JSON.parse(localStorage.getItem('readStatus')) || {};
let isNotiEnabled = localStorage.getItem('isNotiEnabled') !== 'false'; 
let mySessionId = localStorage.getItem('mySessionId') || 'user_' + Date.now();
localStorage.setItem('mySessionId', mySessionId);

// 설정 및 모달 제어
function openSettingsModal() {
    document.getElementById('setting-noti-toggle').checked = (isNotiEnabled && Notification.permission === "granted");
    document.getElementById('setting-admin-toggle').checked = isAdmin;
    document.getElementById('settings-modal').classList.add('active');
    if(isFabOpen) toggleFabMenu();
}
function closeSettingsModal() { document.getElementById('settings-modal').classList.remove('active'); }

function handleNotiToggle(checkbox) {
    if (checkbox.checked) {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") enableNotification();
            else { alert("권한이 거부되었습니다."); checkbox.checked = false; }
        });
    } else {
        isNotiEnabled = false;
        localStorage.setItem('isNotiEnabled', 'false');
        alert("알림이 해제되었습니다.");
    }
}

function handleAdminToggle(checkbox) {
    if (checkbox.checked) { checkbox.checked = false; openAdminModal(); }
    else if (confirm("해제하시겠습니까?")) { firebase.auth().signOut(); isAdmin = false; }
    else checkbox.checked = true;
}

// 기도제목 렌더링 (더보기 메뉴 적용)
function renderPrayers() {
    const list = document.getElementById("prayer-list"); 
    list.innerHTML = "";
    if(!currentMemberData || !currentMemberData.prayers) return;

    const displayList = currentMemberData.prayers.map((p, index) => ({ ...p, originalIndex: index }));
    displayList.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    displayList.forEach((p) => {
        const i = p.originalIndex;
        const div = createSafeElement("div", "prayer-card");
        if (p.isPinned) div.classList.add("pinned");

        const header = createSafeElement("div", "prayer-header");
        const headerLeft = createSafeElement("div");
        headerLeft.style.display = "flex"; headerLeft.style.alignItems = "center"; headerLeft.style.gap = "8px";

        const pinBtn = createSafeElement("button", "text-btn", p.isPinned ? "📌 해제" : "📍 고정");
        pinBtn.onclick = () => togglePin(i);
        pinBtn.style.color = p.isPinned ? "#E65100" : "#aaa";
        headerLeft.appendChild(pinBtn);
        headerLeft.appendChild(createSafeElement("span", "", p.date));

        // 더보기 버튼 메뉴
        const moreWrapper = document.createElement("div");
        moreWrapper.style.position = "relative";
        const moreBtn = createSafeElement("button", "more-btn", "···");
        const optionsMenu = createSafeElement("div", "more-options");
        optionsMenu.id = `opt-${i}`;

        const optEdit = createSafeElement("button", "opt-btn", "📝 수정");
        optEdit.onclick = (e) => { e.stopPropagation(); editPrayer(i); optionsMenu.classList.remove('active'); };
        const optDel = createSafeElement("button", "opt-btn del-opt", "🗑️ 삭제");
        optDel.onclick = (e) => { e.stopPropagation(); deletePrayer(i); optionsMenu.classList.remove('active'); };

        optionsMenu.appendChild(optEdit); optionsMenu.appendChild(optDel);
        moreBtn.onclick = (e) => { e.stopPropagation(); document.querySelectorAll('.more-options').forEach(el => el.id !== `opt-${i}` && el.classList.remove('active')); optionsMenu.classList.toggle('active'); };

        moreWrapper.appendChild(moreBtn); moreWrapper.appendChild(optionsMenu);
        header.appendChild(headerLeft); header.appendChild(moreWrapper);

        const actionGroup = createSafeElement("div", "action-group");
        const replyBtn = createSafeElement("button", "text-btn", "💬 답글");
        replyBtn.onclick = () => addReply(i);
        actionGroup.appendChild(replyBtn);

        div.appendChild(header); div.appendChild(createSafeElement("div", "prayer-content", p.content)); div.appendChild(actionGroup);

        if (p.replies) {
            const replySection = createSafeElement("div", "reply-section");
            p.replies.forEach((r, rIdx) => {
                const rItem = createSafeElement("div", "reply-item");
                const delBtn = document.createElement("button");
                delBtn.innerHTML = "&times;"; delBtn.style.cssText = "border:none; background:none; color:#aaa; cursor:pointer; font-size:1.2rem;";
                delBtn.onclick = () => deleteReply(i, rIdx);
                rItem.appendChild(createSafeElement("span", "", "💬 " + r.content)); rItem.appendChild(delBtn);
                replySection.appendChild(rItem);
            });
            div.appendChild(replySection);
        }
        list.appendChild(div);
    });
}

// 유틸리티 함수
function createSafeElement(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text) el.textContent = text; return el; }
function forceRefresh() { if(confirm("초기화 하시겠습니까?")) { caches.keys().then(names => names.forEach(n => caches.delete(n))); window.location.reload(true); } }

// 나머지 D3 및 애니메이션 로직은 기존 파일 뒷부분과 동일하게 통합하시면 됩니다.
