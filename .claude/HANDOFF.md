# ycpraying — Codex Handoff (v3.0.4)

## 현재 상태
- 최신 커밋: `073516e fix: SW v57 Network-First 전략, 시즌2 멤버 추가 에러 표면화`
- 브랜치: main
- 배포: GitHub Pages (max2guy.github.io/ycpraying) + Firebase Hosting
- Firebase RTDB 규칙: 방금 배포 완료 (아래 참조)

## 방금 수정한 내용

### 근본 원인 발견
Firebase CLI로 데이터베이스 직접 조회한 결과:
- `/s2` 경로 → `null` (S2 데이터 한 번도 쓰인 적 없음)
- Firebase RTDB 보안 규칙에 `s2/*` 경로가 없었음 → 읽기/쓰기 모두 DENY

### 버그 설명
- **Bug 1** (앱 최초 실행 시 그래프에 S1 데이터): 이전 코드(initSeasonRefs fix 전)가 S1 paths 읽음
- **Bug 2** (S2 멤버 추가 실패): Firebase 규칙이 `s2/members` 쓰기를 차단

### 해결 방법

**database.rules.json** (신규 파일)
```json
{
  "rules": {
    "members": { ".read": true, ".write": true },
    "presence": { ".read": true, ".write": true },
    "messages": { ".read": true, ".write": true },
    "centerNode": { ".read": true, ".write": true },
    "fcmTokens": { ".read": false, ".write": true },
    "prayerEvents": { ".read": false, ".write": true },
    "s2": {
      "members": { ".read": true, ".write": true },
      "presence": { ".read": true, ".write": true },
      "messages": { ".read": true, ".write": true },
      "centerNode": { ".read": true, ".write": true }
    }
  }
}
```

**firebase.json**: `"database": { "rules": "database.rules.json" }` 섹션 추가

`firebase deploy --only database` 로 즉시 적용 완료.

## 프로젝트 개요
- **프레임워크**: 순수 HTML/CSS/JS PWA (프레임워크 없음)
- **데이터베이스**: Firebase Realtime Database (아시아 서버)
  - 시즌1 경로: `members`, `centerNode`, `presence`, `messages`
  - 시즌2 경로: `s2/members`, `s2/centerNode`, `s2/presence`, `s2/messages`
- **인증**: Firebase Auth
- **알림**: FCM (Firebase Cloud Messaging)
- **배포**: GitHub Pages (기본) + Firebase Hosting
- **SW**: sw.js v57, Cache-Name: yc-prayer-v57

## 주요 파일
- `index.html` — PWA 메인 HTML, 쿼리스트링 버전 관리
- `script.js` — 전체 앱 로직 (D3 그래프, Firebase 리스너, 시즌 전환)
- `style.css` — 스타일 (시즌1 기본, `.theme-s2` 클래스로 시즌2 레드 테마)
- `sw.js` — Service Worker v57 (Network-First, FCM 백그라운드)
- `database.rules.json` — Firebase RTDB 보안 규칙 (S1 + S2 경로 허용)
- `firebase.json` — Firebase 배포 설정 (database rules 포함)
- `functions/index.js` — Firebase Cloud Functions (FCM 발송 등)

## 핵심 함수 위치 (script.js)
- `initSeasonRefs()` line 129: localStorage의 activeSeason 기준 Firebase refs 재초기화
- `initSeasonRefs()` 호출 line 286: 앱 시작 시 실행 (Bug 1 수정 포인트)
- `loadData()` line ~450: membersRef, centerNodeRef에서 초기 데이터 로드
- `switchSeason()` line 791: 시즌 전환 (리스너 해제 → refs 갱신 → 재연결)
- `addNewMember()` line 903: 멤버 추가 (membersRef.push, 에러 콜백 포함)
- `registerMemberListeners()` line ~460: 멤버 CRUD 리스너 등록

## 현재 상태 설명
- S2는 현재 완전히 빈 상태 (`s2/members` = null)
- Firebase 규칙 배포 후 S2 멤버 추가가 정상 작동해야 함
- iOS PWA 사용자는 홈화면 앱을 force-quit(스와이프 종료)해야 SW v57 업데이트 적용

## 다음으로 할 수 있는 작업
1. 실제 앱에서 S2 멤버 추가 테스트 (첫 번째 S2 멤버가 생성되어야 함)
2. S2 채팅 기능 테스트 (messages 경로 쓰기)
3. S2 홈커밍데이 노드(centerNode) 관련 기능 확인

## 빌드 & 배포
```bash
# 배포 (GitHub Pages 자동 — push 시 배포됨)
git push origin main

# Firebase Hosting 배포 (필요 시)
firebase deploy --only hosting

# Firebase RTDB 규칙 배포
firebase deploy --only database

# Cloud Functions 배포
firebase deploy --only functions
```
