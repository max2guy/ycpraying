const functions = require('firebase-functions');
const admin     = require('firebase-admin');
admin.initializeApp();

const APP_URL = 'https://max2guy.github.io/ycpraying/';

/* ── 전체 FCM 토큰 수집 (특정 senderId 제외 가능) ── */
async function getAllTokens(excludeSessionId) {
    const snap = await admin.database().ref('fcmTokens').once('value');
    const result = [];
    snap.forEach(child => {
        if (child.key === excludeSessionId) return;
        const d = child.val();
        if (d && d.token) result.push({ token: d.token, sessionId: child.key });
    });
    return result;
}

/* ── 멀티캐스트 발송 + 만료 토큰 자동 정리 ── */
async function sendPush(tokenDatas, title, body, extraData = {}) {
    if (!tokenDatas.length) return;
    const tokens = tokenDatas.map(t => t.token);

    const message = {
        tokens,
        data: { title, body, ...extraData },
        webpush: {
            notification: {
                title, body,
                icon:  APP_URL + 'notification-icon.svg',
                badge: APP_URL + 'notification-icon.svg'
            },
            fcmOptions: { link: APP_URL }
        }
    };

    const resp = await admin.messaging().sendEachForMulticast(message);

    // 만료/무효 토큰 삭제
    const removes = [];
    resp.responses.forEach((r, i) => {
        if (!r.success && r.error) {
            const code = r.error.code;
            if (code === 'messaging/invalid-registration-token' ||
                code === 'messaging/registration-token-not-registered') {
                removes.push(admin.database().ref(`fcmTokens/${tokenDatas[i].sessionId}`).remove());
            }
        }
    });
    if (removes.length) await Promise.all(removes);
}

/* ── 1. 새 기도 멤버 추가 ── */
exports.onNewMember = functions
    .region('asia-northeast3')
    .database.ref('members/{memberId}')
    .onCreate(async snap => {
        const member = snap.val();
        if (!member || !member.name) return null;
        const tokenDatas = await getAllTokens(null);
        await sendPush(tokenDatas,
            '🙏 새 기도 멤버',
            `${member.name}님이 기도 네트워크에 참여했습니다.`,
            { type: 'new_member' }
        );
        return null;
    });

/* ── 2. 새 채팅 메시지 ── */
exports.onNewChatMessage = functions
    .region('asia-northeast3')
    .database.ref('messages/{msgId}')
    .onCreate(async snap => {
        const msg = snap.val();
        if (!msg || !msg.text) return null;
        const tokenDatas = await getAllTokens(msg.senderId);
        const preview = msg.text.length > 50 ? msg.text.slice(0, 50) + '…' : msg.text;
        await sendPush(tokenDatas,
            '💬 새 채팅 메시지',
            preview,
            { type: 'chat' }
        );
        return null;
    });

/* ── 3. 새 기도제목 / 새 답글 (prayerEvents 트리거) ── */
exports.onNewPrayerEvent = functions
    .region('asia-northeast3')
    .database.ref('prayerEvents/{eventId}')
    .onCreate(async snap => {
        const ev = snap.val();
        if (!ev || !ev.type) return null;

        let title, body;
        if (ev.type === 'new_prayer') {
            title = `🙏 ${ev.memberName}님의 새 기도제목`;
            const preview = ev.content.length > 50 ? ev.content.slice(0, 50) + '…' : ev.content;
            body = preview;
        } else if (ev.type === 'new_reply') {
            title = `💬 ${ev.memberName}님 기도제목에 응원 댓글`;
            const preview = ev.content.length > 50 ? ev.content.slice(0, 50) + '…' : ev.content;
            body = preview;
        } else {
            return null;
        }

        const tokenDatas = await getAllTokens(ev.senderId);
        await sendPush(tokenDatas, title, body, { type: ev.type });

        // 처리 후 이벤트 삭제 (중복 알림 방지)
        await snap.ref.remove();
        return null;
    });
