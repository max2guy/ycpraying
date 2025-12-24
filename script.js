// ==========================================
// 연천장로교회 청년부 기도 네트워크 (v18 최종 수정본)
// Part 1: 초기 설정 및 알림/설정 로직
// ==========================================

// 1. 서비스 워커 등록 및 업데이트 감지
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function(registration) {
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // 새 버전 발견 시 사용자에게 알림 토스트 표시
                    const updateToast = document.getElementById('update-toast');
                    if(updateToast) updateToast.classList.add('show');
                }
            });
        });
    }, function(err) { console.log('SW 등록 실패: ', err); });
}

// PWA 설치 프롬프트 제어 변수
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

// 3. 전역 변수 및 앱 상태 관리
let isAdmin = false;
let isFirstRender = true;
let isDataLoaded = false;
let currentMemberData = null;
let members = [];
let globalNodes = [];
let simulation = null;

// 로컬 저장소 데이터 (읽음 상태 및 알림 설정)
let readStatus = JSON.parse(localStorage.getItem('readStatus')) || {};
let isNotiEnabled = localStorage.getItem('isNotiEnabled') !== 'false'; 
let mySessionId = localStorage.getItem('mySessionId') || 'user_' + Date.now();
localStorage.setItem('mySessionId', mySessionId);

let isFabOpen = false;
let newMemberIds = new Set();
let lastChatReadTime = Number(localStorage.getItem('lastChatReadTime')) || Date.now();
let unreadChatKeys = new Set();

// 노드용 밝은 색상 팔레트
const brightColors = ["#FFCDD2", "#F8BBD0", "#E1BEE7", "#D1C4E9", "#C5CAE9", "#BBDEFB", "#B3E5FC", "#B2EBF2", "#B2DFDB", "#C8E6C9", "#DCEDC8", "#F0F4C3", "#FFF9C4", "#FFECB3", "#FFE0B2", "#FFCCBC", "#D7CCC8", "#F5F5F5", "#CFD8DC"];

// 4. 메뉴 및 설정창 제어 함수
function toggleFabMenu() {
    isFabOpen = !isFabOpen;
    const container = document.getElementById('menu-container');
    if(isFabOpen) container.classList.add('menu-open');
    else container.classList.remove('menu-open');
}

// 배경 클릭 시 열린 메뉴들 닫기
document.body.addEventListener('click', (e) => {
    if(isFabOpen && !e.target.closest('#menu-container')) { toggleFabMenu(); }
    // 더보기(···) 메뉴 외 영역 클릭 시 모든 드롭다운 닫기
    if (!e.target.closest('.more-btn')) {
        document.querySelectorAll('.more-options').forEach(el => el.classList.remove('active'));
    }
});

function openSettingsModal() {
    const notiToggle = document.getElementById('setting-noti-toggle');
    const adminToggle = document.getElementById('setting-admin-toggle');
    
    if (notiToggle) {
        notiToggle.checked = (isNotiEnabled && Notification.permission === "granted");
    }
    if (adminToggle) {
        adminToggle.checked = isAdmin;
    }

    document.getElementById('settings-modal').classList.add('active');
    if(isFabOpen) toggleFabMenu();
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.remove('active');
}

// 알림 스위치 핸들러
function handleNotiToggle(checkbox) {
    if (checkbox.checked) {
        if (!("Notification" in window)) {
            alert("알림을 지원하지 않는 기기입니다.");
            checkbox.checked = false;
            return;
        }
        Notification.requestPermission().then(permission => {
            if (permission === "granted") enableNotification();
            else {
                alert("알림 권한이 거부되었습니다. 휴대폰 설정에서 권한을 허용해주세요.");
                checkbox.checked = false;
            }
        });
    } else {
        isNotiEnabled = false;
        localStorage.setItem('isNotiEnabled', 'false');
        updateNotiButtonUI();
        alert("알림이 해제되었습니다.");
    }
}

// 관리자 모드 스위치 핸들러
function handleAdminToggle(checkbox) {
    if (checkbox.checked) {
        checkbox.checked = false; // 인증창 열기 전 스위치 일단 복구
        openAdminModal(); 
    } else {
        if (confirm("관리자 모드를 해제하시겠습니까?")) {
            firebase.auth().signOut().then(() => {
                isAdmin = false;
                document.getElementById('body').classList.remove('admin-mode');
                alert("관리자 모드가 해제되었습니다.");
            });
        } else {
            checkbox.checked = true;
        }
    }
}

function enableNotification() {
    isNotiEnabled = true;
    localStorage.setItem('isNotiEnabled', 'true');
    updateNotiButtonUI();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification("알림 설정 완료", {
                body: "이제 새로운 기도와 메시지 알림을 받습니다.",
                icon: 'icon-192.png',
                vibrate: [100]
            });
        });
    }
}

function updateNotiButtonUI() {
    const btn = document.getElementById('noti-btn');
    if (btn) {
        btn.innerText = isNotiEnabled ? "🔕 알림 끄기" : "🔔 알림 켜기";
        btn.style.backgroundColor = isNotiEnabled ? "#FFCDD2" : "#FFF3E0";
    }
}

function forceRefresh() {
    if(confirm("데이터를 초기화하고 화면을 새로고침 하시겠습니까?")) {
        if ('caches' in window) {
            caches.keys().then(names => {
                for (let name of names) caches.delete(name);
                window.location.reload(true);
            });
        } else { window.location.reload(true); }
    }
}
// ==========================================
// Part 2: 기도제목 렌더링 및 기능 로직 (v18)
// ==========================================

// 5. 기도제목 리스트 출력 (더보기 메뉴 통합 및 겹침 오류 해결)
function renderPrayers() {
    const list = document.getElementById("prayer-list"); 
    if (!list) return;
    
    // 기존 내용을 깨끗이 비워 중복 생성을 방지합니다.
    list.innerHTML = "";
    
    if(!currentMemberData || !currentMemberData.prayers || currentMemberData.prayers.length === 0) { 
        list.innerHTML = "<p style='text-align:center; margin-top:30px; color:#8D6E63; font-size:0.9rem;'>기도제목을 나눠주세요! 🙏</p>"; 
        return; 
    }

    // 데이터 복사 및 정렬 (고정된 글을 최상단으로)
    const displayList = currentMemberData.prayers.map((p, index) => ({
        ...p,
        originalIndex: index
    }));

    displayList.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    displayList.forEach((p) => {
        const i = p.originalIndex;
        const div = createSafeElement("div", "prayer-card");
        if (p.isPinned) div.classList.add("pinned");

        // --- 1. 카드 헤더 (왼쪽: 고정핀/날짜 | 오른쪽: 더보기 메뉴) ---
        const header = createSafeElement("div", "prayer-header");
        
        const headerLeft = createSafeElement("div");
        headerLeft.style.display = "flex";
        headerLeft.style.alignItems = "center";
        headerLeft.style.gap = "6px";

        if (p.isPinned) {
            const pinIcon = createSafeElement("span", "pinned-icon", "📌");
            headerLeft.appendChild(pinIcon);
        }

        const dateSpan = createSafeElement("span", "", p.date);
        headerLeft.appendChild(dateSpan);

        // [핵심] 더보기(···) 메뉴 영역 - 기존의 '수정' 글씨나 'X' 아이콘은 생성하지 않습니다.
        const moreWrapper = document.createElement("div");
        moreWrapper.style.position = "relative";
        
        const moreBtn = createSafeElement("button", "more-btn", "···");
        
        const optionsMenu = createSafeElement("div", "more-options");
        optionsMenu.id = `opt-${i}`;

        // 메뉴 항목: 고정/해제
        const optPin = createSafeElement("button", "opt-btn", p.isPinned ? "📍 고정 해제" : "📌 상단 고정");
        optPin.onclick = (e) => { e.stopPropagation(); togglePin(i); optionsMenu.classList.remove('active'); };

        // 메뉴 항목: 수정
        const optEdit = createSafeElement("button", "opt-btn", "📝 수정하기");
        optEdit.onclick = (e) => { e.stopPropagation(); editPrayer(i); optionsMenu.classList.remove('active'); };

        // 메뉴 항목: 삭제 (관리자일 경우 문구 변경)
        const optDelLabel = isAdmin ? "🗑️ 강제 삭제" : "🗑️ 삭제하기";
        const optDel = createSafeElement("button", "opt-btn del-opt", optDelLabel);
        optDel.onclick = (e) => { e.stopPropagation(); deletePrayer(i); optionsMenu.classList.remove('active'); };

        optionsMenu.appendChild(optPin);
        optionsMenu.appendChild(optEdit);
        optionsMenu.appendChild(optDel);
        
        moreBtn.onclick = (e) => {
            e.stopPropagation();
            // 클릭한 것 외에 다른 모든 더보기 메뉴 닫기
            document.querySelectorAll('.more-options').forEach(el => {
                if(el.id !== `opt-${i}`) el.classList.remove('active');
            });
            optionsMenu.classList.toggle('active');
        };

        moreWrapper.appendChild(moreBtn);
        moreWrapper.appendChild(optionsMenu);

        header.appendChild(headerLeft);
        header.appendChild(moreWrapper);

        // --- 2. 카드 본문 ---
        const content = createSafeElement("div", "prayer-content", p.content);

        // --- 3. 카드 하단 (답글 버튼) ---
        const actionGroup = createSafeElement("div", "action-group");
        const replyBtn = createSafeElement("button", "text-btn", "💬 답글 달기");
        replyBtn.onclick = () => addReply(i);
        actionGroup.appendChild(replyBtn);
        
        // 요소 결합
        div.appendChild(header); 
        div.appendChild(content); 
        div.appendChild(actionGroup);

        // --- 4. 답글 섹션 ---
        if (p.replies && p.replies.length > 0) {
            const replySection = createSafeElement("div", "reply-section");
            p.replies.forEach((r, rIdx) => { 
                const rItem = createSafeElement("div", "reply-item");
                
                const rText = createSafeElement("span", "", "💬 " + r.content);
                rText.style.flex = "1";
                
                // 답글 삭제 버튼 (디자인 개선된 r-del-btn)
                const rDelBtn = createSafeElement("button", "r-del-btn", "&times;");
                rDelBtn.onclick = () => deleteReply(i, rIdx);
                
                rItem.appendChild(rText);
                rItem.appendChild(rDelBtn);
                replySection.appendChild(rItem); 
            });
            div.appendChild(replySection);
        }
        
        list.appendChild(div);
    });
}

// 6. 데이터 조작 및 Firebase 동기화 함수
function syncPrayers() {
    if (!currentMemberData) return;
    membersRef.child(currentMemberData.firebaseKey).update({
        prayers: currentMemberData.prayers || []
    }).then(() => {
        renderPrayers(); // 화면 갱신
    });
}

function addPrayer() {
    const input = document.getElementById("new-prayer");
    const v = input.value.trim();
    if(!v) return;
    if(containsBannedWords(v)) return alert("부적절한 단어가 포함되어 있습니다.");
    
    const p = currentMemberData.prayers || [];
    // 새로운 기도는 목록 맨 앞에 추가
    p.unshift({
        content: v, 
        date: new Date().toISOString().split('T')[0],
        isPinned: false
    });
    
    membersRef.child(currentMemberData.firebaseKey).update({ prayers: p });
    input.value = "";
}

function editPrayer(i) {
    const v = prompt("기도 제목 수정:", currentMemberData.prayers[i].content);
    if(v && v.trim()) {
        if(containsBannedWords(v)) return alert("부적절한 단어 포함");
        currentMemberData.prayers[i].content = v.trim();
        syncPrayers();
    }
}

function deletePrayer(i) {
    const msg = isAdmin ? "[관리자] 이 게시물을 강제로 삭제하시겠습니까?" : "기도제목을 삭제하시겠습니까?";
    if(confirm(msg)) {
        currentMemberData.prayers.splice(i, 1);
        syncPrayers();
    }
}

function togglePin(index) {
    const currentState = currentMemberData.prayers[index].isPinned || false;
    currentMemberData.prayers[index].isPinned = !currentState;
    syncPrayers();
}

function addReply(i) {
    const v = prompt("답글을 입력해 주세요:");
    if(v && v.trim()) {
        if(containsBannedWords(v)) return alert("부적절한 단어 포함");
        if(!currentMemberData.prayers[i].replies) currentMemberData.prayers[i].replies = [];
        currentMemberData.prayers[i].replies.push({ content: v.trim() });
        syncPrayers();
    }
}

function deleteReply(pIdx, rIdx) {
    if(confirm("이 답글을 삭제하시겠습니까?")) {
        currentMemberData.prayers[pIdx].replies.splice(rIdx, 1);
        syncPrayers();
    }
}

function createSafeElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) {
        if (text.includes("&times;")) el.innerHTML = text; // X 기호 등 HTML 허용
        else el.textContent = text;
    }
    return el;
}
// ==========================================
// Part 3: 시각화 엔진 및 실시간 소통 로직 (v18)
// ==========================================

// 7. D3.js 시각화 엔진 및 인터랙션 엔진
function initSimulation() {
    simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id).distance(140))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(d => (d.type === 'root' ? 85 : 45) + 25));
}

function updateGraph() {
    if (!isDataLoaded) return;
    globalNodes = [centerNode, ...members];
    const links = members.map(m => ({ source: "center", target: m.id }));

    // 사진 패턴 업데이트 (노드 안에 사진 넣기)
    const patterns = svg.select("defs").selectAll("pattern").data(members, d => d.id);
    const pEnter = patterns.enter().append("pattern")
        .attr("id", d => "img-" + d.id).attr("width", 1).attr("height", 1).attr("patternContentUnits", "objectBoundingBox");
    pEnter.append("image").attr("x", 0).attr("y", 0).attr("width", 1).attr("height", 1).attr("preserveAspectRatio", "xMidYMid slice");
    patterns.merge(pEnter).select("image").attr("xlink:href", d => d.photoUrl || "");
    patterns.exit().remove();

    // 선(Link) 업데이트
    let link = linkGroup.selectAll("line").data(links, d => d.target.id || d.target);
    link.exit().remove();
    link = link.enter().append("line")
        .attr("stroke", "#FFFFFF")
        .attr("stroke-width", 2.5)
        .style("opacity", 0.6)
        .merge(link);

    // 노드(Node) 업데이트
    let node = nodeGroup.selectAll("g").data(globalNodes, d => d.id);
    node.exit().remove();

    const nodeEnter = node.enter().append("g")
        .attr("cursor", "pointer")
        .on("click", (event, d) => { 
            event.stopPropagation();
            if (d.type !== 'root') openPrayerPopup(d); 
        });

    nodeEnter.append("circle")
        .attr("r", d => d.type === 'root' ? 75 : 40)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2.5)
        .style("filter", "drop-shadow(0 2px 5px rgba(0,0,0,0.1))");

    nodeEnter.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .style("font-weight", "bold")
        .style("fill", "#5D4037")
        .style("pointer-events", "none")
        .style("font-size", "12px");

    node = nodeEnter.merge(node);
    node.select("circle").attr("fill", d => {
        if (d.type === 'root') return "#FFF8E1";
        return d.photoUrl ? `url(#img-${d.id})` : (d.color || "#ccc");
    });
    node.select("text").text(d => d.name.split('\n')[0]);

    if (!simulation) initSimulation();
    simulation.nodes(globalNodes).on("tick", () => {
        node.attr("transform", d => `translate(${d.x},${d.y})`);
        link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    });
    simulation.force("link").links(links);
    simulation.alpha(1).restart();
}

// 8. 실시간 소통방(채팅) 로직
function sendChatMessage() {
    const msgInput = document.getElementById("chat-msg");
    const text = msgInput.value.trim();
    if (!text) return;
    if (containsBannedWords(text)) return alert("부적절한 단어가 포함되어 있습니다.");

    messagesRef.push({
        name: "익명",
        text: text,
        senderId: mySessionId,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    msgInput.value = "";
}

messagesRef.limitToLast(50).on('child_added', snap => {
    const d = snap.val();
    const chatBox = document.getElementById("chat-messages");
    if (!chatBox) return;

    const isMine = d.senderId === mySessionId;
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `display: flex; flex-direction: column; align-items: ${isMine ? "flex-end" : "flex-start"}; margin-bottom: 10px;`;

    const bubble = document.createElement("div");
    bubble.innerText = d.text;
    bubble.style.cssText = `max-width: 80%; padding: 10px 14px; border-radius: 15px; font-size: 0.95rem; line-height:1.4; position: relative;`;
    bubble.style.backgroundColor = isMine ? "#FFCC80" : "#f1f1f1";
    bubble.style.color = isMine ? "#3E2723" : "#333";
    bubble.style.borderTopRightRadius = isMine ? "2px" : "15px";
    bubble.style.borderTopLeftRadius = isMine ? "15px" : "2px";

    if (isAdmin) {
        bubble.title = "삭제하려면 클릭";
        bubble.onclick = () => confirm("이 메시지를 삭제하시겠습니까?") && messagesRef.child(snap.key).remove();
    }

    wrapper.appendChild(bubble);
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;

    // 푸시 알림 (앱이 백그라운드일 때만)
    if (!isFirstRender && !isMine && isNotiEnabled && document.hidden) {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification("💭 소통방 새 메시지", { body: d.text, icon: 'icon-192.png', tag: 'chat' });
            });
        }
    }
});

messagesRef.on('child_removed', () => {
    const chatBox = document.getElementById("chat-messages");
    if(chatBox) chatBox.innerHTML = ""; // 관리자가 지우면 화면 초기화 후 다시 로드 유도
});

// 9. 날씨 애니메이션 로직 (복구됨)
const wc = document.getElementById('weather-canvas');
const wctx = wc ? wc.getContext('2d') : null;
let wParts = [];

async function fetchWeather() {
    try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=38.09&longitude=127.07&current_weather=true");
        const d = await res.json();
        const temp = d.current_weather.temperature;
        const code = d.current_weather.weathercode;
        
        document.getElementById('weather-text').innerHTML = `📍 연천군<br>현재 기온: ${temp}°C`;
        const toast = document.getElementById('weather-toast');
        if(toast) { toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 4000); }
        
        // 날씨 코드에 따른 입자 생성 (비: 51~67, 눈: 71~86)
        if (code >= 51 && code <= 67) createRain();
        else if (code >= 71 && code <= 86) createSnow();
    } catch(e) { console.log("날씨 정보를 가져오지 못했습니다."); }
}

function createRain() {
    wParts = [];
    for(let i=0; i<40; i++) wParts.push({ x: Math.random()*wc.width, y: Math.random()*wc.height, s: 4+Math.random()*4, l: 8+Math.random()*10 });
}
function createSnow() {
    wParts = [];
    for(let i=0; i<40; i++) wParts.push({ x: Math.random()*wc.width, y: Math.random()*wc.height, s: 1+Math.random()*2, r: 2+Math.random()*3 });
}

function gameLoop() {
    if (wctx && wParts.length > 0) {
        wctx.clearRect(0, 0, wc.width, wc.height);
        wctx.strokeStyle = "rgba(174,194,224,0.6)"; wctx.fillStyle = "rgba(255,255,255,0.8)"; wctx.lineWidth = 1.5;
        wParts.forEach(p => {
            if (p.l) { // 비
                wctx.beginPath(); wctx.moveTo(p.x, p.y); wctx.lineTo(p.x, p.y+p.l); wctx.stroke(); p.y += p.s; if(p.y > wc.height) p.y = -p.l;
            } else { // 눈
                wctx.beginPath(); wctx.arc(p.x, p.y, p.r, 0, Math.PI*2); wctx.fill(); p.y += p.s; if(p.y > wc.height) p.y = -5;
            }
        });
    }
    requestAnimationFrame(gameLoop);
}

// 10. 기타 보조 함수 및 초기 실행
function editProfile() {
    if (!currentMemberData) return;
    document.getElementById('edit-profile-name').value = currentMemberData.name;
    document.getElementById('edit-profile-preview').src = currentMemberData.photoUrl || "https://via.placeholder.com/150?text=No+Image";
    document.getElementById('profile-edit-modal').classList.add('active');
}
function closeProfileEditModal() { document.getElementById('profile-edit-modal').classList.remove('active'); }

function saveProfileChanges() {
    const newName = document.getElementById('edit-profile-name').value.trim();
    if(!newName) return alert("이름을 입력하세요.");
    membersRef.child(currentMemberData.firebaseKey).update({
        name: newName,
        photoUrl: document.getElementById('edit-profile-preview').src
    }).then(() => { location.reload(); });
}

function handleProfileFileSelect(event) {
    const file = event.target.files[0];
    if (!file || file.size > 1024 * 1024) return alert("이미지가 너무 큽니다. (1MB 이하 권장)");
    const reader = new FileReader();
    reader.onload = e => document.getElementById('edit-profile-preview').src = e.target.result;
    reader.readAsDataURL(file);
}

function openPrayerPopup(d) {
    currentMemberData = d;
    document.getElementById("panel-name").innerText = d.name;
    document.getElementById("current-color-display").style.backgroundColor = d.color || "#ccc";
    document.getElementById("prayer-popup").classList.add("active");
    renderPrayers();
}
function closePrayerPopup() { document.getElementById("prayer-popup").classList.remove("active"); currentMemberData = null; }

function toggleChatPopup() {
    const el = document.getElementById('chat-popup');
    el.classList.toggle('active');
    if(el.classList.contains('active')) {
        document.getElementById('chat-badge').classList.remove('active');
        localStorage.setItem('lastChatReadTime', Date.now());
    }
}

function checkAdmin() {
    const pw = document.getElementById('admin-pw').value;
    const adminEmail = "admin@church.com"; // 기본 설정 이메일
    firebase.auth().signInWithEmailAndPassword(adminEmail, pw).then(() => {
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

function addNewMember() {
    const n = prompt("새로운 성도의 이름을 입력하세요:");
    if(n && n.trim()) {
        membersRef.push({
            id: "m_" + Date.now(),
            name: n.trim(),
            type: "member",
            color: brightColors[Math.floor(Math.random()*brightColors.length)],
            prayers: []
        });
    }
}

function deleteMember() {
    if(currentMemberData && confirm(`${currentMemberData.name}님의 모든 데이터를 삭제하시겠습니까?`)) {
        membersRef.child(currentMemberData.firebaseKey).remove();
        closePrayerPopup();
    }
}

function containsBannedWords(t) {
    const list = ["욕설1", "비속어2"]; // 실제 운영시 리스트 확장
    return list.some(w => t.includes(w));
}

// 초기 이벤트 바인딩
onlineRef.on('value', s => {
    if(s.val()) {
        const p = presenceRef.push();
        p.onDisconnect().remove();
        p.set({ time: firebase.database.ServerValue.TIMESTAMP });
    }
});
presenceRef.on('value', s => {
    const count = s.numChildren() || 0;
    const el = document.getElementById('online-count');
    if(el) el.innerText = `${count}명 접속 중`;
});

window.addEventListener('resize', () => {
    if(wc) { wc.width = window.innerWidth; wc.height = window.innerHeight; }
});
if(wc) { wc.width = window.innerWidth; wc.height = window.innerHeight; }

requestAnimationFrame(gameLoop);
updateNotiButtonUI();
// --- v18 script.js 끝 ---
