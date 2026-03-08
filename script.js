// ==========================================
// 연천장로교회 청년부 기도 네트워크
// v24 — Sanctuary Dark Edition
// ==========================================

// ── 서비스 워커 ──
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function(reg) {
        reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            nw.addEventListener('statechange', () => {
                if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                    document.getElementById('update-toast').classList.add('show');
                }
            });
        });
    }).catch(err => console.log('SW Fail:', err));
}

// ── PWA 설치 배너 ──
let deferredPrompt;
const installBanner = document.getElementById('install-banner');
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt = e;
    setTimeout(() => { if (installBanner) installBanner.classList.add('show'); }, 5000);
});
document.getElementById('btn-install-app').addEventListener('click', () => {
    if (installBanner) installBanner.classList.remove('show');
    if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt = null; }); }
});
document.getElementById('btn-close-install').addEventListener('click', () => {
    if (installBanner) installBanner.classList.remove('show');
});

// ── UI 핸들러 ──
let isFabOpen = false;
function toggleFabMenu() {
    isFabOpen = !isFabOpen;
    const c = document.getElementById('menu-container');
    c.classList.toggle('menu-open', isFabOpen);
}
document.body.addEventListener('click', e => {
    if (isFabOpen && !e.target.closest('#menu-container')) toggleFabMenu();
});

function forceRefresh() {
    if (!confirm("화면을 강제로 새로고침 하시겠습니까?\n(캐시된 데이터를 모두 삭제합니다)")) return;
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
    }
    if ('caches' in window) {
        caches.keys().then(names => { names.forEach(n => caches.delete(n)); window.location.reload(true); });
    } else {
        window.location.reload(true);
    }
}

function openSettingsModal()  { if (isFabOpen) toggleFabMenu(); document.getElementById('settings-modal').classList.add('active'); }
function closeSettingsModal() { document.getElementById('settings-modal').classList.remove('active'); }

// ── Firebase 초기화 ──
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
const database    = firebase.database();
const membersRef  = database.ref('members');
const centerNodeRef = database.ref('centerNode');
const onlineRef   = database.ref('.info/connected');
const presenceRef = database.ref('presence');
const messagesRef = database.ref('messages');

let mySessionId = localStorage.getItem('mySessionId');
if (!mySessionId) {
    mySessionId = 'user_' + Date.now();
    localStorage.setItem('mySessionId', mySessionId);
}

// ── 상태 변수 ──
let isAdmin       = false;
let isFirstRender = true;
let readStatus    = JSON.parse(localStorage.getItem('prayerReadStatus')) || {};
let newMemberIds  = new Set();
let globalNodes   = [];
let simulation    = null;
let unreadChatKeys = new Set();
let touchStartTime = 0, touchStartX = 0, touchStartY = 0, isTouchMove = false;
let dragStartX = 0, dragStartY = 0, isDragAction = false;
let currentMemberData = null;   // ← 명시적 선언 (버그 수정)
let cropper = null;

const brightColors = ["#FFCDD2","#F8BBD0","#E1BEE7","#D1C4E9","#C5CAE9","#BBDEFB","#B3E5FC","#B2EBF2","#B2DFDB","#C8E6C9","#DCEDC8","#F0F4C3","#FFF9C4","#FFECB3","#FFE0B2","#FFCCBC","#D7CCC8","#F5F5F5","#CFD8DC"];
let lastChatReadTime = Number(localStorage.getItem('lastChatReadTime')) || Date.now();

// ── 유틸 ──
function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}
function createSafeElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function checkNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'denied' && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}
checkNotificationPermission();

function setAppBadge(count) {
    if ('setAppBadge' in navigator) {
        if (count > 0) navigator.setAppBadge(count).catch(() => {});
        else navigator.clearAppBadge().catch(() => {});
    }
}

async function getMyIp() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) { return '알수없음'; }
}

// ── 접속자 현황 ──
onlineRef.on('value', async snap => {
    if (snap.val()) {
        const myIp = await getMyIp();
        const con = presenceRef.push();
        con.onDisconnect().remove();
        con.set({ ip: myIp, time: Date.now(), device: navigator.userAgent });
    }
});
presenceRef.on('value', snap => {
    document.getElementById('online-count').innerText = `${snap.numChildren() || 0}명 접속 중`;
});

// ── 이스터에그 ──
let eggClickCount = 0, eggTimer = null, isHeartRain = false;
const originalCenterName = "연천장로교회\n청년부\n함께 기도해요";

function handleOnlineCounterClick() {
    if (isAdmin) { showConnectedUsers(); return; }
    eggClickCount++;
    if (eggTimer) clearTimeout(eggTimer);
    eggTimer = setTimeout(() => { eggClickCount = 0; }, 1500);
    if (eggClickCount >= 5) { eggClickCount = 0; triggerHeartRain(); }
}

function triggerHeartRain() {
    isHeartRain = !isHeartRain;
    if (isHeartRain) {
        createHearts();
        centerNode.icon = "💖";
        centerNode.name = "사랑이 넘치는\n우리 청년부";
        updateGraph();
        showWeatherToast("이스터에그 발견! 🎁", "사랑이 가득하네요 🥰", 6000);
        wctx.clearRect(0, 0, wc.width, wc.height);
    } else {
        fetchWeather();
        centerNode.icon = "✝️";
        centerNode.name = originalCenterName;
        updateGraph();
        showWeatherToast("일상 모드", "원래대로 돌아왔습니다.");
    }
    updateNodeVisuals();
}

function showConnectedUsers() {
    presenceRef.once('value').then(snap => {
        const data = snap.val();
        const existing = document.getElementById('kick-modal');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'kick-modal';
        modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;justify-content:center;align-items:center;";
        let html = `<div style="background:var(--bg-2);border:1px solid var(--gold-border);width:88%;max-width:350px;border-radius:18px;padding:20px;max-height:70vh;overflow-y:auto;box-shadow:0 8px 48px rgba(0,0,0,0.8);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--gold-border);padding-bottom:12px;">
                <h3 style="margin:0;color:var(--gold);font-size:1rem;">👮 접속자 관리</h3>
                <button onclick="document.getElementById('kick-modal').remove()" style="border:none;background:none;font-size:1.5rem;cursor:pointer;color:var(--text-dim);">&times;</button>
            </div>`;
        if (!data) {
            html += `<p style="text-align:center;color:var(--text-dim);font-size:0.9rem;">현재 접속자가 없습니다.</p>`;
        } else {
            Object.entries(data).forEach(([key, user]) => {
                let device = '기타 기기';
                if (user && user.device) {
                    if (user.device.includes('iPhone')) device = '아이폰';
                    else if (user.device.includes('Android')) device = '안드로이드';
                    else if (user.device.includes('Windows')) device = 'Windows PC';
                    else if (user.device.includes('Mac')) device = 'Mac';
                }
                const time = user && user.time ? new Date(user.time).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '';
                const ip   = user && user.ip ? escHtml(user.ip) : '알수없음';
                html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px dashed rgba(255,255,255,0.06);">
                    <div style="font-size:0.88rem;color:var(--text);line-height:1.5;">
                        <b>${escHtml(device)}</b><br>
                        <span style="font-size:0.78rem;color:var(--text-dim);">${ip} / ${time}</span>
                    </div>
                    <button onclick="kickUser('${escHtml(key)}')" style="background:var(--danger);color:white;border:none;padding:6px 12px;border-radius:20px;cursor:pointer;font-weight:700;font-size:0.8rem;">Kick</button>
                </div>`;
            });
        }
        html += `</div>`;
        modal.innerHTML = html;
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
    });
}
function kickUser(key) {
    if (confirm("강퇴하시겠습니까?")) {
        presenceRef.child(key).remove().then(() => {
            document.getElementById('kick-modal').remove();
            setTimeout(showConnectedUsers, 500);
        });
    }
}

// ── 금칙어 ──
const bannedWords = ["욕설","비속어","시발","씨발","개새끼","병신","지랄","존나","졸라","미친","성매매","섹스","야동","조건만남","주식","코인","비트코인","투자","리딩방","수익","바보","멍청이"];
function containsBannedWords(text) { return bannedWords.some(w => text.includes(w)); }

// ── 관리자 인증 ──
firebase.auth().onAuthStateChanged(user => {
    if (user) { isAdmin = true;  document.getElementById('body').classList.add('admin-mode'); }
    else       { isAdmin = false; document.getElementById('body').classList.remove('admin-mode'); }
});

// ── 데이터 ──
let centerNode = { id:"center", name:"연천장로교회\n청년부\n함께 기도해요", type:"root", icon:"✝️", color:"#FFF8E1" };
let members = [];
let isDataLoaded = false;

function showEnterButton() {
    isDataLoaded = true;
    const spinner = document.getElementById('intro-loading-spinner');
    const btn = document.getElementById('enter-btn');
    if (spinner) spinner.style.display = 'none';
    if (btn) btn.style.display = 'inline-block';
}

function loadData() {
    setTimeout(() => { if (!isDataLoaded) showEnterButton(); }, 5000);
    Promise.all([membersRef.once('value'), centerNodeRef.once('value')])
    .then(([mSnap, cSnap]) => {
        const mData = mSnap.val(), cData = cSnap.val();
        if (mData) members = Object.keys(mData).map(k => ({ firebaseKey:k, ...mData[k] }));
        if (cData && cData.icon) centerNode.icon = cData.icon;
        members.forEach(m => {
            if (!m.rotationDirection) m.rotationDirection = Math.random() < 0.5 ? 1 : -1;
            if (m.rotation === undefined) m.rotation = 0;
        });
        showEnterButton();
        updateGraph();
        fetchWeather();
        setTimeout(() => { isFirstRender = false; }, 5000);
    })
    .catch(err => { console.log("Error:", err); showEnterButton(); updateGraph(); });
}
loadData();

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

// ── D3 그래프 ──
const width = window.innerWidth, height = window.innerHeight;
const svg = d3.select("#visualization").append("svg").attr("width", width).attr("height", height);
const defs = svg.append("defs");
const g = svg.append("g");
svg.call(d3.zoom().scaleExtent([0.1, 4]).on("zoom", event => g.attr("transform", event.transform)));
const linkGroup = g.append("g").attr("class","links");
const nodeGroup = g.append("g").attr("class","nodes");
const sizeScale = d3.scaleSqrt().domain([0,15]).range([28,60]).clamp(true);
simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(140))
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width/2, height/2))
    .force("collide", d3.forceCollide().radius(d => calculateRadius(d) + 30));
let link, node;

function updateGraph() {
    globalNodes = [centerNode, ...members];
    const links = members.map(m => ({ source:centerNode.id, target:m.id }));
    const patterns = defs.selectAll("pattern").data(members, d => d.id);
    patterns.enter().append("pattern")
        .attr("id", d => "img-" + d.id).attr("width",1).attr("height",1)
        .attr("patternContentUnits","objectBoundingBox")
        .append("image").attr("x",0).attr("y",0).attr("width",1).attr("height",1)
        .attr("preserveAspectRatio","xMidYMid slice").attr("xlink:href", d => d.photoUrl);
    patterns.select("image").attr("xlink:href", d => d.photoUrl);
    patterns.exit().remove();

    link = linkGroup.selectAll("line").data(links, d => d.target.id || d.target);
    link.exit().remove();
    const le = link.enter().append("line").attr("stroke","rgba(201,168,76,0.25)").attr("stroke-width",1.5).style("opacity",0);
    le.transition().delay(800).duration(1500).style("opacity",1);
    link = le.merge(link);

    node = nodeGroup.selectAll("g").data(globalNodes, d => d.id);
    node.exit().remove();
    const ne = node.enter().append("g").attr("cursor","pointer").style("pointer-events","all")
        .on("touchstart", function(event, d) {
            event.stopPropagation();
            touchStartTime = Date.now(); touchStartX = event.touches[0].clientX; touchStartY = event.touches[0].clientY; isTouchMove = false;
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
        })
        .on("touchmove", function(event, d) {
            if (event.touches.length > 0) {
                const dx = event.touches[0].clientX - touchStartX, dy = event.touches[0].clientY - touchStartY;
                if (Math.sqrt(dx*dx+dy*dy) > 10) isTouchMove = true;
                d.fx = event.touches[0].clientX; d.fy = event.touches[0].clientY;
            }
        })
        .on("touchend", function(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
            if ((Date.now() - touchStartTime < 500) && !isTouchMove && d.type === 'member') {
                event.preventDefault(); openPrayerPopup(d);
            }
        })
        .on("click", function(event, d) {
            event.stopPropagation();
            if (!isDragAction && d.type === 'member') openPrayerPopup(d);
        })
        .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

    ne.append("circle").attr("stroke-width",0).attr("r",0).style("pointer-events","all");
    ne.append("rect").attr("rx",10).attr("ry",10).attr("fill","rgba(8,12,24,0.65)").style("opacity",0).style("pointer-events","none");
    ne.append("text").attr("text-anchor","middle").attr("dominant-baseline","middle").attr("font-weight","bold").style("pointer-events","none").style("opacity",0);
    const badge = ne.append("g").attr("class","node-badge").style("opacity",0).style("pointer-events","none");
    badge.append("circle").attr("r",9).attr("cx",0).attr("cy",0).attr("fill","#f87171").attr("stroke","#080c18").attr("stroke-width",2);
    badge.append("text").attr("x",0).attr("y",0).attr("dy","0.35em").attr("text-anchor","middle").attr("fill","white").style("font-size","11px").style("font-weight","bold");
    node = ne.merge(node);
    node.style("pointer-events","all");
    updateNodeVisuals();
    simulation.nodes(globalNodes);
    simulation.force("link").links(links);
    simulation.alpha(1).restart();
}

function updateNodeVisuals() {
    if (!node) return;
    node.each(function(d) {
        const el = d3.select(this);
        const r = calculateRadius(d);
        const circle = el.select("circle");
        const textDelay = isFirstRender ? (d.id === 'center' ? 0 : 800 + globalNodes.indexOf(d) * 80) : 0;

        if (circle.attr("r") == 0) {
            circle.transition().delay(textDelay).duration(isFirstRender ? 800 : 500).ease(d3.easeElasticOut.amplitude(3)).attr("r", r);
        } else {
            circle.transition().duration(500).attr("r", r);
        }

        const fillUrl = (d.photoUrl && d.type !== 'root') ? `url(#img-${d.id})` : (d.type === 'root' ? "#FFF8E1" : d.color);
        const pct = getTotalPrayerCount(d);
        let filterStr = (d.type === 'root')
            ? "drop-shadow(0 0 18px rgba(201,168,76,0.6))"
            : (pct > 0 ? `drop-shadow(0 0 ${Math.min(pct*3,28)}px rgba(255,140,0,${0.4+pct/25}))` : "drop-shadow(0 2px 6px rgba(0,0,0,0.4))");

        circle.attr("fill", fillUrl).style("opacity",1).style("filter",filterStr).style("-webkit-filter",filterStr)
            .attr("stroke", (d.type !== 'root' && pct > 0) ? "#c9a84c" : "rgba(255,255,255,0.25)")
            .attr("stroke-width", (d.type !== 'root' && pct > 0) ? 2.5 : 1.5);

        const textEl = el.select("text"), rectEl = el.select("rect");
        textEl.text(null);
        if (d.type === 'root') {
            textEl.append("tspan").text(d.icon).attr("x",0).attr("dy","-1.2em").attr("font-size","2.8rem");
            d.name.split("\n").forEach((l,i) => textEl.append("tspan").text(l).attr("x",0).attr("dy",i===0?"4.0em":"1.3em").attr("font-size","14px").attr("fill","#ede8de"));
            rectEl.style("display","none");
            textEl.transition().delay(textDelay).duration(800).style("opacity",1);
        } else {
            const ty = d.photoUrl ? r + 15 : 0;
            textEl.attr("y", ty).text(d.name).attr("font-size","12px").attr("fill","#ede8de");
            const bbox = textEl.node().getBBox();
            const w = bbox.width > 0 ? bbox.width + 16 : d.name.length * 12 + 16;
            if (d.photoUrl) {
                rectEl.style("display","block").attr("x",-w/2).attr("y",ty-10).attr("width",w).attr("height",20)
                    .transition().delay(textDelay).duration(500).style("opacity",1);
            } else {
                rectEl.style("display","none");
            }
            textEl.transition().delay(textDelay).duration(800).style("opacity",1);
        }

        if (d.type !== 'root') {
            const unread = Math.max(0, getTotalPrayerCount(d) - (readStatus[d.id] || 0));
            const isNew  = newMemberIds.has(d.id);
            const badge  = el.select(".node-badge");
            const bx = r * 0.707 + 5, by = -(r * 0.707 + 5);
            if (unread > 0 || isNew) {
                badge.style("display","block");
                badge.select("circle").attr("fill", unread > 0 ? "#f87171" : "#fb923c");
                badge.select("text").text(unread > 0 ? unread : "N");
                badge.transition().delay(textDelay + 400).duration(200).attr("transform",`translate(${bx},${by})`).style("opacity",1);
            } else { badge.style("opacity",0); }
        }
    });
}

function calculateRadius(d) { return d.type === 'root' ? 80 : sizeScale(getTotalPrayerCount(d)); }
function getTotalPrayerCount(d) {
    if (d.type === 'root') return 0;
    let t = d.prayers ? d.prayers.length : 0;
    if (d.prayers) d.prayers.forEach(p => { if (p.replies) t += p.replies.length; });
    return t;
}
function getRandomColor() { return brightColors[Math.floor(Math.random() * brightColors.length)]; }
function dragstarted(event) { isDragAction=false; dragStartX=event.x; dragStartY=event.y; if(!event.active) simulation.alphaTarget(0.3).restart(); event.subject.fx=event.subject.x; event.subject.fy=event.subject.y; }
function dragged(event) { const dx=event.x-dragStartX,dy=event.y-dragStartY; if(dx*dx+dy*dy>25)isDragAction=true; event.subject.fx=event.x; event.subject.fy=event.y; }
function dragended(event) { if(!event.active)simulation.alphaTarget(0); event.subject.fx=null; event.subject.fy=null; }
window.addEventListener("resize", () => {
    const w=window.innerWidth, h=window.innerHeight;
    svg.attr("width",w).attr("height",h);
    simulation.force("center", d3.forceCenter(w/2,h/2));
    simulation.alpha(0.5).restart();
    resizeWeatherCanvas();
});

// ── UI FUNCTIONS ──
function toggleCampPopup()  { document.getElementById('camp-popup').classList.toggle('active'); }
function toggleChatPopup() {
    const el = document.getElementById('chat-popup');
    el.classList.toggle('active');
    if (el.classList.contains('active')) {
        document.getElementById('chat-badge').classList.remove('active');
        unreadChatKeys.clear(); setAppBadge(0);
        lastChatReadTime = Date.now(); localStorage.setItem('lastChatReadTime', lastChatReadTime);
        checkNotificationPermission();
        setTimeout(() => { document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight; }, 100);
    }
}
function openPrayerPopup(data) {
    currentMemberData = data; newMemberIds.delete(data.id);
    readStatus[data.id] = getTotalPrayerCount(data);
    localStorage.setItem('prayerReadStatus', JSON.stringify(readStatus));
    updateNodeVisuals();
    document.getElementById("panel-name").innerText = data.name;
    document.getElementById("current-color-display").style.backgroundColor = data.color;
    document.getElementById("prayer-popup").classList.add('active');
    document.getElementById("prayer-list").innerHTML = `<div class="skeleton-card"><div class="skeleton sk-text-sm"></div><div class="skeleton sk-text"></div><div class="skeleton sk-text" style="width:60%"></div><div class="skeleton sk-block"></div></div>`;
    requestAnimationFrame(() => setTimeout(() => renderPrayers(), 150));
}
function closePrayerPopup() { document.getElementById("prayer-popup").classList.remove('active'); currentMemberData = null; }
function openColorModal() {
    const grid = document.getElementById('color-grid'); grid.innerHTML = '';
    brightColors.forEach(c => {
        const sw = document.createElement('div'); sw.className = 'color-swatch';
        sw.style.backgroundColor = c; sw.onclick = () => selectColor(c); grid.appendChild(sw);
    });
    document.getElementById('color-modal').classList.add('active');
}
function closeColorModal() { document.getElementById('color-modal').classList.remove('active'); }
function selectColor(color) { updateMemberColor(color); document.getElementById("current-color-display").style.backgroundColor = color; closeColorModal(); }
function toggleAdminMode() { if (isAdmin) { firebase.auth().signOut().then(() => alert("관리자 모드 해제")); } else openAdminModal(); }
function openAdminModal()  { document.getElementById('admin-modal').classList.add('active'); document.getElementById('admin-pw').focus(); }
function closeAdminModal(e){ if (e.target.id === 'admin-modal') document.getElementById('admin-modal').classList.remove('active'); }
function checkAdmin() {
    firebase.auth().signInWithEmailAndPassword("admin@church.com", document.getElementById('admin-pw').value)
        .then(() => {
            document.getElementById('admin-modal').classList.remove('active');
            document.getElementById('admin-pw').value = '';
            if (currentMemberData) renderPrayers();
        })
        .catch(() => alert("비밀번호 오류"));
}

// ── 간단 입력 모달 (prompt 대체) ──
let simpleModalCallback = null;
let simpleModalType = 'text';

function openSimpleModal(title, type, placeholder, defaultValue, callback) {
    simpleModalType = type;
    simpleModalCallback = callback;
    document.getElementById('simple-modal-title').textContent = title;
    const textEl = document.getElementById('simple-modal-text');
    const taEl   = document.getElementById('simple-modal-textarea');
    if (type === 'textarea') {
        taEl.style.display = 'block'; textEl.style.display = 'none';
        taEl.placeholder = placeholder; taEl.value = defaultValue || '';
    } else {
        textEl.style.display = 'block'; taEl.style.display = 'none';
        textEl.placeholder = placeholder; textEl.value = defaultValue || '';
    }
    document.getElementById('simple-input-modal').classList.add('active');
    setTimeout(() => (type === 'textarea' ? taEl : textEl).focus(), 200);
}
function closeSimpleModal() {
    document.getElementById('simple-input-modal').classList.remove('active');
    simpleModalCallback = null;
}
function confirmSimpleModal() {
    const value = (simpleModalType === 'textarea'
        ? document.getElementById('simple-modal-textarea').value
        : document.getElementById('simple-modal-text').value).trim();
    if (simpleModalCallback) simpleModalCallback(value);
    closeSimpleModal();
}

// ── 멤버 관리 ──
function addNewMember() {
    if (isFabOpen) toggleFabMenu();
    openSimpleModal('새 기도 멤버 추가', 'text', '이름을 입력하세요', '', name => {
        if (!name) return;
        if (containsBannedWords(name)) return alert("부적절한 이름입니다.");
        membersRef.push({ id:`member_${Date.now()}`, name, type:"member", color:getRandomColor(), prayers:[], rotation:0, rotationDirection:1 });
    });
}
function updateMemberColor(v) { if (currentMemberData) membersRef.child(currentMemberData.firebaseKey).update({ color:v }); }
function deleteMember() {
    if (!currentMemberData) return;
    if (!isAdmin) { alert("멤버 삭제는 관리자만 가능합니다."); return; }
    if (confirm("정말 삭제하시겠습니까?")) {
        membersRef.child(currentMemberData.firebaseKey).remove();
        closePrayerPopup();
    }
}

// ── 프로필 편집 ──
const DEFAULT_PROFILE_IMG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0QwQzJCRSI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==';
let isProfilePhotoRemoved = false;

function editProfile() {
    if (!currentMemberData) return;
    isProfilePhotoRemoved = false;
    document.getElementById('edit-profile-name').value = currentMemberData.name;
    document.getElementById('profile-view-mode').style.display = 'flex';
    document.getElementById('profile-edit-mode').style.display  = 'none';
    document.getElementById('edit-profile-preview').src = currentMemberData.photoUrl || DEFAULT_PROFILE_IMG;
    document.getElementById('profile-edit-modal').classList.add('active');
    if (cropper) { cropper.destroy(); cropper = null; }
}
function closeProfileEditModal() {
    document.getElementById('profile-edit-modal').classList.remove('active');
    if (cropper) { cropper.destroy(); cropper = null; }
}
function removeProfilePhoto() {
    if (confirm("프로필 사진을 삭제하고 기본 이미지로 돌아가시겠습니까?")) {
        isProfilePhotoRemoved = true;
        document.getElementById('edit-profile-preview').src = DEFAULT_PROFILE_IMG;
        if (cropper) { cropper.destroy(); cropper = null; }
        document.getElementById('profile-view-mode').style.display = 'flex';
        document.getElementById('profile-edit-mode').style.display  = 'none';
    }
}
function handleProfileFileSelect(event) {
    const file = event.target.files[0]; if (!file) return;
    isProfilePhotoRemoved = false;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = e => {
        document.getElementById('profile-view-mode').style.display = 'none';
        document.getElementById('profile-edit-mode').style.display  = 'flex';
        const img = document.getElementById('cropper-target-img');
        img.src = e.target.result;
        if (cropper) cropper.destroy();
        setTimeout(() => { cropper = new Cropper(img, { aspectRatio:1, viewMode:1, dragMode:'move', autoCropArea:0.8 }); }, 100);
    };
}
function saveProfileChanges() {
    if (!currentMemberData) return;
    const newName = document.getElementById('edit-profile-name').value.trim();
    if (!newName) return alert("이름을 입력해주세요.");
    if (containsBannedWords(newName)) return alert("부적절한 이름입니다.");
    let finalImageUrl = '';
    if (cropper) {
        finalImageUrl = cropper.getCroppedCanvas({ width:300, height:300 }).toDataURL('image/jpeg', 0.8);
    } else if (isProfilePhotoRemoved) {
        finalImageUrl = '';
    } else {
        finalImageUrl = currentMemberData.photoUrl || '';
    }
    membersRef.child(currentMemberData.firebaseKey).update({ name:newName, photoUrl:finalImageUrl }).then(() => {
        document.getElementById("panel-name").innerText = newName;
        closeProfileEditModal();
    });
}

// ── 기도제목 렌더링 ──
function renderPrayers() {
    const list = document.getElementById("prayer-list"); list.innerHTML = '';
    if (!currentMemberData || !currentMemberData.prayers || currentMemberData.prayers.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--text-dim);"><div style="font-size:3rem;margin-bottom:12px;opacity:0.4;">🙏</div><p style="font-size:0.9rem;">아직 기도제목이 없습니다.</p></div>`;
        return;
    }
    const displayList = currentMemberData.prayers.map((p, i) => ({ ...p, originalIndex:i }));
    displayList.sort((a,b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    displayList.forEach(p => {
        const i = p.originalIndex;
        const div = createSafeElement("div", "prayer-card" + (p.isPinned ? " pinned" : ""));
        const header  = createSafeElement("div", "prayer-header");
        const dateDiv = createSafeElement("div", "prayer-date");
        if (p.isPinned) { const pm = createSafeElement("span","pinned-mark"); pm.textContent = "📌"; dateDiv.appendChild(pm); }
        const dateSpan = createSafeElement("span"); dateSpan.textContent = p.date || ''; dateDiv.appendChild(dateSpan);
        header.appendChild(dateDiv);

        const content = createSafeElement("div","prayer-content", p.content);
        const actionGroup = createSafeElement("div","action-group");
        const amens = p.amens ? Object.keys(p.amens).length : 0;
        const iAmened = p.amens && p.amens[mySessionId];

        // 아멘 버튼
        const amenBtn = createSafeElement("button", `amen-btn${iAmened ? ' active' : ''}`);
        amenBtn.innerHTML = `<span>🙏</span><span>아멘${amens > 0 ? ' ' + amens : ''}</span>`;
        amenBtn.addEventListener('click', e => toggleAmen(i, e));

        // 고정 버튼
        const pinBtn = createSafeElement("button", `icon-btn pin-btn${p.isPinned ? ' active' : ''}`);
        pinBtn.title = '고정'; pinBtn.setAttribute('aria-label','상단 고정');
        pinBtn.innerHTML = `<span class="material-symbols-rounded">push_pin</span>`;
        pinBtn.addEventListener('click', () => togglePin(i));

        // 수정 버튼
        const editBtn = createSafeElement("button", "icon-btn edit-btn");
        editBtn.title = '수정'; editBtn.setAttribute('aria-label','내용 수정');
        editBtn.innerHTML = `<span class="material-symbols-rounded">edit</span>`;
        editBtn.addEventListener('click', () => editPrayer(i));

        // 답글 버튼
        const replyBtn = createSafeElement("button", "icon-btn reply-btn");
        replyBtn.title = '답글'; replyBtn.setAttribute('aria-label','답글 달기');
        replyBtn.innerHTML = `<span class="material-symbols-rounded">chat_bubble</span>`;
        replyBtn.addEventListener('click', () => addReply(i));

        // 삭제 버튼
        const delBtn = createSafeElement("button", isAdmin ? "icon-btn admin-delete-btn-icon" : "icon-btn delete-btn");
        delBtn.title = '삭제'; delBtn.setAttribute('aria-label','삭제');
        delBtn.innerHTML = `<span class="material-symbols-rounded">delete_forever</span>`;
        delBtn.addEventListener('click', () => isAdmin ? adminDeletePrayer(i) : deletePrayer(i));

        actionGroup.append(amenBtn, pinBtn, editBtn, replyBtn, delBtn);
        div.append(header, content, actionGroup);

        // 답글
        if (p.replies && p.replies.length > 0) {
            const rs = createSafeElement("div","reply-section");
            p.replies.forEach((r, rIdx) => {
                const ri = createSafeElement("div","reply-item");
                const icon = createSafeElement("span","reply-icon"); icon.textContent = "↳";
                const text = createSafeElement("span"); text.style.flexGrow = '1'; text.style.wordBreak = 'break-all'; text.textContent = r.content; // ← XSS 방지: textContent
                const delR = createSafeElement("button","reply-delete-btn"); delR.textContent = "×"; delR.setAttribute('aria-label','답글 삭제');
                delR.addEventListener('click', () => deleteReply(i, rIdx));
                ri.append(icon, text, delR); rs.appendChild(ri);
            });
            div.appendChild(rs);
        }
        list.appendChild(div);
    });
}

// ── 기도제목 CRUD ──
function toggleAmen(i, e) {
    if (!currentMemberData) return;
    // 불꽃 파티클 (버그 수정: createFirework 구현)
    if (e && e.clientX) createFirework(e.clientX, e.clientY);
    const ref = firebase.database().ref(`members/${currentMemberData.firebaseKey}/prayers/${i}/amens`);
    if (currentMemberData.prayers[i].amens && currentMemberData.prayers[i].amens[mySessionId]) {
        ref.child(mySessionId).remove();
    } else {
        ref.child(mySessionId).set(true);
        if (navigator.vibrate) navigator.vibrate(50);
    }
}
function togglePin(i) {
    if (!currentMemberData) return;
    currentMemberData.prayers[i].isPinned = !currentMemberData.prayers[i].isPinned;
    membersRef.child(currentMemberData.firebaseKey).update({ prayers:currentMemberData.prayers }).then(() => renderPrayers());
}
function deletePrayer(i) {
    if (!confirm("삭제하시겠습니까?")) return;
    currentMemberData.prayers.splice(i, 1);
    const d = currentMemberData.prayers.length > 0 ? currentMemberData.prayers : [];
    membersRef.child(currentMemberData.firebaseKey).update({ prayers:d });
    closePrayerPopup();
}
function adminDeletePrayer(i) {
    if (!confirm("관리자 권한으로 삭제하시겠습니까?")) return;
    currentMemberData.prayers.splice(i, 1);
    const d = currentMemberData.prayers.length > 0 ? currentMemberData.prayers : [];
    membersRef.child(currentMemberData.firebaseKey).update({ prayers:d });
    closePrayerPopup();
}
function addPrayer() {
    const v = document.getElementById("new-prayer").value.trim(); if (!v) return;
    if (containsBannedWords(v)) return alert("부적절한 내용이 포함되어 있습니다.");
    const p = currentMemberData.prayers || [];
    p.unshift({ content:v, date:new Date().toISOString().split('T')[0] });
    membersRef.child(currentMemberData.firebaseKey).update({ prayers:p });
    document.getElementById("new-prayer").value = '';
}
function editPrayer(i) {
    openSimpleModal('기도제목 수정', 'textarea', '수정할 내용을 입력하세요', currentMemberData.prayers[i].content, value => {
        if (!value) return;
        if (containsBannedWords(value)) return alert("부적절한 내용입니다.");
        currentMemberData.prayers[i].content = value;
        membersRef.child(currentMemberData.firebaseKey).update({ prayers:currentMemberData.prayers });
    });
}
function addReply(i) {
    openSimpleModal('답글 달기', 'textarea', '답글을 입력하세요', '', value => {
        if (!value) return;
        if (containsBannedWords(value)) return alert("부적절한 내용입니다.");
        if (!currentMemberData.prayers[i].replies) currentMemberData.prayers[i].replies = [];
        currentMemberData.prayers[i].replies.push({ content:value });
        membersRef.child(currentMemberData.firebaseKey).update({ prayers:currentMemberData.prayers });
    });
}
function deleteReply(pi, ri) {
    if (!confirm("답글을 삭제하시겠습니까?")) return;
    currentMemberData.prayers[pi].replies.splice(ri, 1);
    membersRef.child(currentMemberData.firebaseKey).update({ prayers:currentMemberData.prayers }).then(() => renderPrayers());
}

// ── 채팅 (XSS 수정 + 금칙어 추가) ──
function sendChatMessage() {
    const t = document.getElementById("chat-msg").value.trim(); if (!t) return;
    if (containsBannedWords(t)) { alert("부적절한 내용이 포함되어 있습니다."); return; }
    messagesRef.push({ name:"익명", text:t, senderId:mySessionId, timestamp:firebase.database.ServerValue.TIMESTAMP });
    document.getElementById("chat-msg").value = '';
}
function deleteChatMessage(k) {
    if (confirm("메시지를 삭제하시겠습니까?")) messagesRef.child(k).remove();
}

messagesRef.limitToLast(50).on('child_added', snap => {
    const d = snap.val();
    if (d.timestamp > lastChatReadTime && d.senderId !== mySessionId) {
        unreadChatKeys.add(snap.key);
        if (!document.getElementById('chat-popup').classList.contains('active')) {
            document.getElementById('chat-badge').classList.add('active');
            setAppBadge(unreadChatKeys.size);
        }
    }
    const isMine = d.senderId === mySessionId;
    const wrapper = createSafeElement("div","chat-bubble-wrapper");
    wrapper.setAttribute('data-key', snap.key);
    wrapper.style.alignItems = isMine ? 'flex-end' : 'flex-start';

    if (!isMine) {
        const sender = createSafeElement("span","chat-sender"); sender.textContent = d.name; wrapper.appendChild(sender);
    }
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:5px;";

    // 관리자 삭제 버튼
    const delSpan = createSafeElement("span","admin-delete-chat"); delSpan.textContent = " [삭제]";
    delSpan.onclick = () => deleteChatMessage(snap.key);

    const bubble = createSafeElement("div", `chat-bubble ${isMine ? 'mine' : 'others'}`);
    bubble.textContent = d.text; // ← XSS 방지: textContent 사용

    if (isMine) { row.append(delSpan, bubble); } else { row.append(bubble, delSpan); }
    wrapper.appendChild(row);
    document.getElementById("chat-messages").appendChild(wrapper);
    setTimeout(() => { document.getElementById("chat-messages").scrollTop = document.getElementById("chat-messages").scrollHeight; }, 100);
});
messagesRef.on('child_removed', snap => {
    const el = document.querySelector(`.chat-bubble-wrapper[data-key="${snap.key}"]`);
    if (el) el.remove();
});

// ── BGM ──
let player, isMusicPlaying = false;
const ytTag = document.createElement('script');
ytTag.src = "https://www.youtube.com/iframe_api";
document.getElementsByTagName('script')[0].parentNode.insertBefore(ytTag, document.getElementsByTagName('script')[0]);
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height:'0', width:'0', videoId:'0wcxl81QclQ',
        playerVars:{ autoplay:0, loop:1, playlist:'0wcxl81QclQ', controls:0, showinfo:0, modestbranding:1, playsinline:1 },
        events:{ onStateChange: onPlayerStateChange }
    });
}
function enterApp() {
    if (player && typeof player.playVideo === 'function') player.playVideo();
    document.getElementById('intro-screen').classList.add('fade-out');
    setTimeout(() => {
        document.getElementById('intro-screen').style.display = 'none';
        showWeatherToast("환영합니다", "배경음악이 재생됩니다 🎵");
    }, 800);
}
function onPlayerStateChange(e) {
    const btn = document.getElementById('music-btn'), icon = document.getElementById('music-icon');
    if (e.data === YT.PlayerState.PLAYING) {
        isMusicPlaying = true; if (btn) btn.classList.add('music-playing'); if (icon) icon.innerText = 'music_note';
    } else {
        isMusicPlaying = false; if (btn) btn.classList.remove('music-playing'); if (icon) icon.innerText = 'music_off';
    }
}
function toggleMusic() {
    if (!player) return;
    if (isMusicPlaying) { player.pauseVideo(); showWeatherToast("음악", "배경음악 끔 🔇"); }
    else                { player.playVideo();  showWeatherToast("음악", "배경음악 켬 🎵"); }
}

// ── 날씨 ──
const apiKey = "39d8b0517ec448eb742a1ee5e39c2bf3";
async function fetchWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async pos => {
            try {
                const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&appid=${apiKey}&units=metric`);
                applyWeather(await res.json(), true);
            } catch(e) { useFallbackWeather(); }
        }, useFallbackWeather);
    } else { useFallbackWeather(); }
}
async function useFallbackWeather() {
    try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=38.0964&longitude=127.0748&current_weather=true");
        const d = await res.json();
        applyWeather({ name:"연천군", main:{temp:d.current_weather.temperature}, weather:[{id:convertMeteoCode(d.current_weather.weathercode)}] }, false);
    } catch(e) {}
}
function convertMeteoCode(c) { if(c>=50&&c<=69)return 500; if(c>=70&&c<=79)return 600; return 800; }
function applyWeather(d, r) {
    const t = Math.round(d.main.temp);
    if (r) { const h = new Date().getHours(); centerNode.icon = (h>6&&h<18) ? "☀️" : "🌙"; }
    const c = d.weather[0].id;
    wParts = []; // ← 날씨 파티클 초기화 (버그 수정: 잔상 제거)
    if (c>=200&&c<600) { createRain();  centerNode.icon="🌧️"; }
    else if (c>=600&&c<700) { createSnow(); centerNode.icon="❄️"; }
    else if (c>800) centerNode.icon="☁️";
    updateNodeVisuals();
    showWeatherToast(d.name, `${t}°C`);
}
function showWeatherToast(l, i, duration=3000) {
    const t = document.getElementById('weather-toast');
    document.getElementById('weather-text').innerHTML = `📍 ${escHtml(l)}<br>${escHtml(String(i))}`;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
}

// ── 캔버스 & 파티클 ──
const wc = document.getElementById('weather-canvas');
const wctx = wc.getContext('2d');
let wParts = [], fireParts = [];

function resizeWeatherCanvas() { wc.width = window.innerWidth; wc.height = window.innerHeight; }
resizeWeatherCanvas();
function createRain()   { wParts=[]; for(let i=0;i<35;i++) wParts.push({x:Math.random()*wc.width,y:Math.random()*wc.height,s:3+Math.random()*4,l:7+Math.random()*8}); }
function createSnow()   { wParts=[]; for(let i=0;i<35;i++) wParts.push({x:Math.random()*wc.width,y:Math.random()*wc.height,s:1+Math.random()*2,r:2+Math.random()*3}); }
function createHearts() { wParts=[]; for(let i=0;i<30;i++) wParts.push({x:Math.random()*wc.width,y:Math.random()*wc.height,s:2+Math.random()*2}); }

// ← createFirework 버그 수정: 실제 구현
function createFirework(x, y) {
    for (let k = 0; k < 36; k++) {
        const angle = (Math.PI * 2 * k) / 36;
        const speed = 3 + Math.random() * 5;
        fireParts.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 1.0,
            color: `hsl(${35 + Math.random()*25}, 100%, ${55+Math.random()*20}%)`,
            size: 4 + Math.random() * 4
        });
    }
}

function openLightbox(src) { document.getElementById('lightbox-img').src=src; document.getElementById('lightbox').classList.add('active'); }
function closeLightbox()    { document.getElementById('lightbox').classList.remove('active'); }

// ── 게임 루프 ──
let lastTime = 0;
const fpsInterval = 1000 / 60;
function gameLoop(time) {
    requestAnimationFrame(gameLoop);
    const elapsed = time - lastTime;
    if (elapsed < fpsInterval) return;
    lastTime = time - (elapsed % fpsInterval);

    if (node) {
        members.forEach(m => {
            m.rotation = (m.rotation || 0) + (m.rotationDirection * 0.1);
            if (m.rotation > 360) m.rotation -= 360;
            else if (m.rotation < -360) m.rotation += 360;
        });
        node.attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotation||0})`);
        if (link) link.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
    }

    // 항상 캔버스 초기화 (버그 수정: 잔상 제거)
    wctx.clearRect(0, 0, wc.width, wc.height);

    // 날씨 / 하트 파티클
    if (wParts.length > 0) {
        if (isHeartRain) {
            wctx.font = "20px serif";
            wParts.forEach(p => { wctx.fillText("💖",p.x,p.y); p.y+=p.s; if(p.y>wc.height)p.y=-20; });
        } else {
            wctx.strokeStyle = "rgba(174,194,224,0.7)"; wctx.lineWidth = 1;
            wctx.fillStyle   = "rgba(255,255,255,0.75)";
            wParts.forEach(p => {
                if (centerNode.icon === "🌧️") {
                    wctx.beginPath(); wctx.moveTo(p.x,p.y); wctx.lineTo(p.x,p.y+p.l); wctx.stroke();
                    p.y += p.s; if(p.y>wc.height)p.y=-p.l;
                } else {
                    wctx.beginPath(); wctx.arc(p.x,p.y,p.r,0,Math.PI*2); wctx.fill();
                    p.y += p.s; if(p.y>wc.height)p.y=-5;
                }
            });
        }
    }

    // 불꽃 파티클 (아멘)
    for (let i = fireParts.length - 1; i >= 0; i--) {
        const p = fireParts[i];
        wctx.globalAlpha = p.life;
        wctx.beginPath(); wctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        wctx.fillStyle = p.color; wctx.fill();
        wctx.globalAlpha = 1;
        p.x += p.vx; p.y += p.vy; p.vy += 0.12;
        p.life -= 0.025; p.size *= 0.96;
        if (p.life <= 0) fireParts.splice(i, 1);
    }
}
requestAnimationFrame(gameLoop);
