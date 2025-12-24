// ==========================================
// 연천장로교회 청년부 기도 네트워크 (Final v17)
// ==========================================

// 1. 서비스 워커 등록 및 업데이트 감지
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
    }, function(err) { console.log('SW 등록 실패: ', err); });
}

// PWA 설치 프로프트 제어
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

// 2. Firebase 설정 및 초기화
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

// 3. 변수 및 상태 관리
let isAdmin = false;
let isFirstRender = true;
let isDataLoaded = false;
let currentMemberData = null;
let members = [];
let globalNodes = [];
let simulation = null;
let readStatus = JSON.parse(localStorage.getItem('readStatus')) || {};
let isNotiEnabled = localStorage.getItem('isNotiEnabled') !== 'false'; 
let mySessionId = localStorage.getItem('mySessionId') || 'user_' + Date.now();
localStorage.setItem('mySessionId', mySessionId);

let isFabOpen = false;
let newMemberIds = new Set();
let lastChatReadTime = Number(localStorage.getItem('lastChatReadTime')) || Date.now();

const brightColors = ["#FFCDD2", "#F8BBD0", "#E1BEE7", "#D1C4E9", "#C5CAE9", "#BBDEFB", "#B3E5FC", "#B2EBF2", "#B2DFDB", "#C8E6C9", "#DCEDC8", "#F0F4C3", "#FFF9C4", "#FFECB3", "#FFE0B2", "#FFCCBC", "#D7CCC8", "#F5F5F5", "#CFD8DC"];

// 4. UI 및 설정창 핸들러
function toggleFabMenu() {
    isFabOpen = !isFabOpen;
    const container = document.getElementById('menu-container');
    if(isFabOpen) container.classList.add('menu-open');
    else container.classList.remove('menu-open');
}

// 화면 클릭 시 닫기 처리
document.body.addEventListener('click', (e) => {
    if(isFabOpen && !e.target.closest('#menu-container')) { toggleFabMenu(); }
    // 더보기 메뉴 외 영역 클릭 시 닫기
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

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.remove('active');
}

function handleNotiToggle(checkbox) {
    if (checkbox.checked) {
        if (!("Notification" in window)) {
            alert("알림을 지원하지 않는 기기입니다.");
            checkbox.checked = false;
            return;
        }
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
    if (checkbox.checked) {
        checkbox.checked = false; 
        openAdminModal(); 
    } else {
        if (confirm("관리자 모드를 해제하시겠습니까?")) {
            firebase.auth().signOut().then(() => {
                isAdmin = false;
                document.getElementById('body').classList.remove('admin-mode');
                alert("해제되었습니다.");
            });
        } else checkbox.checked = true;
    }
}

function forceRefresh() {
    if(confirm("데이터를 초기화하고 새로고침 하시겠습니까?")) {
        if ('caches' in window) {
            caches.keys().then(names => {
                for (let name of names) caches.delete(name);
                window.location.reload(true);
            });
        } else window.location.reload(true);
    }
}

// 5. 데이터 로드 및 시각화 엔진
let centerNode = { id: "center", name: "연천장로교회\n청년부", type: "root", color: "#FFF8E1", icon: "✝️" };

function loadData() {
    setTimeout(() => {
        document.getElementById('loading').classList.add('hide');
        if (!isDataLoaded) { updateGraph(); fetchWeather(); }
    }, 3000);

    Promise.all([membersRef.once('value'), centerNodeRef.once('value')])
    .then(([mSnap, cSnap]) => {
        const mData = mSnap.val();
        const cData = cSnap.val();
        if (mData) members = Object.keys(mData).map(key => ({ firebaseKey: key, ...mData[key] }));
        if (cData && cData.icon) centerNode.icon = cData.icon;

        members.forEach(m => {
            if(!m.rotationDirection) m.rotationDirection = Math.random() < 0.5 ? 1 : -1;
            if(m.rotation === undefined) m.rotation = 0;
        });

        isDataLoaded = true;
        document.getElementById('loading').classList.add('hide');
        updateGraph();
        fetchWeather();
        isFirstRender = false;
    }).catch(err => {
        console.log("로드 에러:", err);
        document.getElementById('loading').classList.add('hide');
        updateGraph();
    });
}
loadData();

// D3 엔진 초기화
const width = window.innerWidth, height = window.innerHeight;
const svg = d3.select("#visualization").append("svg").attr("width", width).attr("height", height);
const g = svg.append("g");
svg.call(d3.zoom().scaleExtent([0.1, 4]).on("zoom", (e) => g.attr("transform", e.transform)));

const linkGroup = g.append("g").attr("class", "links");
const nodeGroup = g.append("g").attr("class", "nodes");

simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(140))
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(d => (d.type==='root'?80:40) + 30));

function updateGraph() {
    globalNodes = [centerNode, ...members];
    const links = members.map(m => ({ source: "center", target: m.id }));

    let link = linkGroup.selectAll("line").data(links, d => d.target.id || d.target);
    link.exit().remove();
    link = link.enter().append("line").attr("stroke", "#fff").attr("stroke-width", 2).merge(link);

    let node = nodeGroup.selectAll("g").data(globalNodes, d => d.id);
    node.exit().remove();

    const nodeEnter = node.enter().append("g")
        .attr("cursor", "pointer")
        .on("click", (e, d) => { if(d.type !== 'root') openPrayerPopup(d); });

    nodeEnter.append("circle")
        .attr("r", d => d.type === 'root' ? 70 : 35)
        .attr("fill", d => d.color || "#FFF3E0")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    nodeEnter.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .text(d => d.name.split('\n')[0])
        .style("font-size", d => d.type === 'root' ? "14px" : "12px")
        .style("font-weight", "bold");

    node = nodeEnter.merge(node);

    simulation.nodes(globalNodes).on("tick", () => {
        node.attr("transform", d => `translate(${d.x},${d.y})`);
        link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    });
    simulation.force("link").links(links);
    simulation.alpha(1).restart();
}

// 6. 기도제목 기능 (더보기 메뉴 적용)
function renderPrayers() {
    const list = document.getElementById("prayer-list"); 
    list.innerHTML = "";
    if(!currentMemberData || !currentMemberData.prayers) {
        list.innerHTML = "<p style='text-align:center; padding:20px;'>기도제목을 나눠주세요!</p>";
        return;
    }

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
        pinBtn.onclick = (e) => { e.stopPropagation(); togglePin(i); };
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
            document.querySelectorAll('.more-options').forEach(el => { if(el.id !== `opt-${i}`) el.classList.remove('active'); });
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

function syncPrayers() {
    membersRef.child(currentMemberData.firebaseKey).update({
        prayers: currentMemberData.prayers || []
    }).then(() => renderPrayers());
}

function addPrayer() {
    const v = document.getElementById("new-prayer").value.trim();
    if(!v) return;
    const p = currentMemberData.prayers || [];
    p.unshift({ content: v, date: new Date().toISOString().split('T')[0] });
    membersRef.child(currentMemberData.firebaseKey).update({ prayers: p });
    document.getElementById("new-prayer").value = "";
}

function editPrayer(i) {
    const v = prompt("수정할 내용을 입력하세요:", currentMemberData.prayers[i].content);
    if(v) { currentMemberData.prayers[i].content = v; syncPrayers(); }
}

function deletePrayer(i) {
    if(confirm("이 기도제목을 삭제하시겠습니까?")) {
        currentMemberData.prayers.splice(i, 1); syncPrayers();
    }
}

function adminDeletePrayer(i) {
    if(confirm("[관리자] 강제로 삭제하시겠습니까?")) {
        currentMemberData.prayers.splice(i, 1); syncPrayers();
    }
}

function addReply(i) {
    const v = prompt("답글을 입력하세요:");
    if(v) {
        if(!currentMemberData.prayers[i].replies) currentMemberData.prayers[i].replies = [];
        currentMemberData.prayers[i].replies.push({ content: v });
        syncPrayers();
    }
}

function deleteReply(pIdx, rIdx) {
    if(confirm("이 답글을 삭제하시겠습니까?")) {
        currentMemberData.prayers[pIdx].replies.splice(rIdx, 1);
        syncPrayers();
    }
}

function togglePin(index) {
    currentMemberData.prayers[index].isPinned = !(currentMemberData.prayers[index].isPinned || false);
    syncPrayers();
}

// 7. 시스템 및 유틸리티
function createSafeElement(tag, className, text) { 
    const el = document.createElement(tag); 
    if (className) el.className = className; 
    if (text) el.textContent = text; 
    return el; 
}

function openPrayerPopup(d) {
    currentMemberData = d;
    document.getElementById("panel-name").innerText = d.name;
    document.getElementById("prayer-popup").classList.add("active");
    renderPrayers();
}

function closePrayerPopup() {
    document.getElementById("prayer-popup").classList.remove("active");
    currentMemberData = null;
}

function toggleChatPopup() {
    const el = document.getElementById('chat-popup');
    el.classList.toggle('active');
    if(el.classList.contains('active')) {
        document.getElementById('chat-badge').classList.remove('active');
        localStorage.setItem('lastChatReadTime', Date.now());
    }
}

function checkAdmin() { 
    const inputPw = document.getElementById('admin-pw').value;
    const adminEmail = "admin@church.com"; 
    firebase.auth().signInWithEmailAndPassword(adminEmail, inputPw).then(() => {
        isAdmin = true;
        document.getElementById('body').classList.add('admin-mode');
        document.getElementById('admin-modal').classList.remove('active');
        alert("관리자 인증 성공!");
        const adminToggle = document.getElementById('setting-admin-toggle');
        if(adminToggle) adminToggle.checked = true;
        if(currentMemberData) renderPrayers();
    }).catch(() => alert("비밀번호가 틀렸습니다."));
}

function openAdminModal() { document.getElementById('admin-modal').classList.add('active'); }
function closeAdminModal(e) { if(e.target.id === 'admin-modal') document.getElementById('admin-modal').classList.remove('active'); }

async function fetchWeather() {
    const text = document.getElementById('weather-text');
    text.innerText = "연천군: 맑음, 5.0°C";
    const toast = document.getElementById('weather-toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function addNewMember() {
    const n = prompt("새로운 이름을 입력하세요:");
    if(n) {
        membersRef.push({
            id: "m_" + Date.now(),
            name: n,
            type: "member",
            color: brightColors[Math.floor(Math.random()*brightColors.length)],
            prayers: []
        }).then(() => window.location.reload());
    }
}

function updateNotiButtonUI() {
    const btn = document.getElementById('noti-btn');
    if (btn) btn.innerText = isNotiEnabled ? "🔕 알림 끄기" : "🔔 알림 켜기";
}

// 초기 실행 및 리스너
membersRef.on('value', snap => {
    const data = snap.val();
    if (data) {
        members = Object.keys(data).map(key => ({ firebaseKey: key, ...data[key] }));
        if (isDataLoaded) updateGraph();
    }
});

// 마지막 알림 초기화
updateNotiButtonUI();
// 끝
