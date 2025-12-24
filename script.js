// ==========================================
// 연천장로교회 청년부 기도 네트워크 (Final v15)
// ==========================================

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
const centerNodeRef = database.ref('centerNode');
const onlineRef = database.ref('.info/connected');
const presenceRef = database.ref('presence');
const messagesRef = database.ref('messages');

let isAdmin = false;
let isFirstRender = true;
let currentMemberData = null;
let readStatus = JSON.parse(localStorage.getItem('readStatus')) || {};
let isNotiEnabled = localStorage.getItem('isNotiEnabled') !== 'false'; 
let mySessionId = localStorage.getItem('mySessionId') || 'user_' + Date.now();
localStorage.setItem('mySessionId', mySessionId);
let isFabOpen = false;

function toggleFabMenu() {
    isFabOpen = !isFabOpen;
    const container = document.getElementById('menu-container');
    if(isFabOpen) container.classList.add('menu-open');
    else container.classList.remove('menu-open');
}

document.body.addEventListener('click', (e) => {
    if(isFabOpen && !e.target.closest('#menu-container')) { toggleFabMenu(); }
    if (!e.target.closest('.more-btn')) {
        document.querySelectorAll('.more-options').forEach(el => el.classList.remove('active'));
    }
});

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
        updateNotiButtonUI();
        alert("알림이 해제되었습니다.");
    }
}

function handleAdminToggle(checkbox) {
    if (checkbox.checked) { checkbox.checked = false; openAdminModal(); }
    else {
        if (confirm("관리자 모드를 해제하시겠습니까?")) {
            firebase.auth().signOut().then(() => { isAdmin = false; alert("해제되었습니다."); });
        } else checkbox.checked = true;
    }
}

function checkAdmin() { 
    const inputPw = document.getElementById('admin-pw').value;
    const adminEmail = "admin@church.com"; 
    firebase.auth().signInWithEmailAndPassword(adminEmail, inputPw).then(() => {
        document.getElementById('admin-modal').classList.remove('active');
        alert("관리자 모드 활성!");
        document.getElementById('admin-pw').value=""; 
        const adminToggle = document.getElementById('setting-admin-toggle');
        if(adminToggle) adminToggle.checked = true;
        if(currentMemberData) renderPrayers();
    }).catch(() => alert("틀렸습니다."));
}

function forceRefresh() {
    if(confirm("데이터를 초기화하고 새로고침 하시겠습니까?")) {
        if ('caches' in window) {
            caches.keys().then(names => { for (let name of names) caches.delete(name); window.location.reload(true); });
        } else window.location.reload(true);
    }
}

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

        const moreWrapper = document.createElement("div");
        moreWrapper.style.position = "relative";
        const moreBtn = createSafeElement("button", "more-btn", "···");
        const optionsMenu = createSafeElement("div", "more-options");
        optionsMenu.id = `opt-${i}`;

        const optEdit = createSafeElement("button", "opt-btn", "📝 수정");
        optEdit.onclick = (e) => { e.stopPropagation(); editPrayer(i); optionsMenu.classList.remove('active'); };
        
        const optDel = createSafeElement("button", "opt-btn del-opt", isAdmin ? "🗑️ 강제삭제" : "🗑️ 삭제");
        optDel.onclick = (e) => { e.stopPropagation(); isAdmin ? adminDeletePrayer(i) : deletePrayer(i); optionsMenu.classList.remove('active'); };

        optionsMenu.appendChild(optEdit); optionsMenu.appendChild(optDel);
        moreBtn.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.more-options').forEach(el => el.id !== `opt-${i}` && el.classList.remove('active'));
            optionsMenu.classList.toggle('active');
        };

        moreWrapper.appendChild(moreBtn); moreWrapper.appendChild(optionsMenu);
        header.appendChild(headerLeft); header.appendChild(moreWrapper);

        const actionGroup = createSafeElement("div", "action-group");
        const replyBtn = createSafeElement("button", "text-btn", "💬 답글");
        replyBtn.onclick = () => addReply(i);
        actionGroup.appendChild(replyBtn);

        div.appendChild(header); 
        div.appendChild(createSafeElement("div", "prayer-content", p.content)); 
        div.appendChild(actionGroup);

        if (p.replies) {
            const replySection = createSafeElement("div", "reply-section");
            p.replies.forEach((r, rIdx) => {
                const rItem = createSafeElement("div", "reply-item");
                const delBtn = document.createElement("button");
                delBtn.innerHTML = "&times;"; delBtn.style.cssText = "border:none; background:none; color:#aaa; cursor:pointer; font-size:1.2rem; padding-left:10px;";
                delBtn.onclick = () => deleteReply(i, rIdx);
                rItem.appendChild(createSafeElement("span", "", "💬 " + r.content)); rItem.appendChild(delBtn);
                replySection.appendChild(rItem);
            });
            div.appendChild(replySection);
        }
        list.appendChild(div);
    });
}

function createSafeElement(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text) el.textContent = text; return el; }
function deleteReply(pIdx, rIdx) { if(confirm("삭제하시겠습니까?")) { currentMemberData.prayers[pIdx].replies.splice(rIdx, 1); syncPrayers(); } }
function togglePin(index) { currentMemberData.prayers[index].isPinned = !(currentMemberData.prayers[index].isPinned || false); syncPrayers(); }
function deletePrayer(i) { if(confirm("정말 삭제?")) { currentMemberData.prayers.splice(i, 1); syncPrayers(); } }
function adminDeletePrayer(i) { if(confirm("강제 삭제?")) { currentMemberData.prayers.splice(i, 1); syncPrayers(); } }
function editPrayer(i) { const v = prompt("수정:", currentMemberData.prayers[i].content); if(v) { currentMemberData.prayers[i].content = v; syncPrayers(); } }
function syncPrayers() { membersRef.child(currentMemberData.firebaseKey).update({prayers: currentMemberData.prayers || []}).then(() => renderPrayers()); }

// [나머지 Firebase 리스너 및 D3 코드는 동일하므로 생략 없이 파일 뒤에 통합하세요]
// ... (loadData, updateGraph, fetchWeather, gameLoop 등)
