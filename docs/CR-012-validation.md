# CR-012 검증 기록

2026-10-10. 개인정보는 전부 가짜 데이터로 검증했다. 실제 계정 생성·채팅·푸시 발송·배포·merge·유료 호출은 하지 않았다.

## 변경

- 프로필과 궁합에 오행 상생/상극 그림을 제공하고 오행 버튼으로 근거·일상 예시를 표시한다. 색 외에 글자·화살표·텍스트·키보드 버튼도 제공한다.
- 일간 비유·분포·대화 팁의 근거와 구체적인 예시를 보강한다. 동률 오행 모두를 설명하고 없는 오행을 능력 부족으로 표현하지 않는다.
- 이전에 배포된 `room-compat` 응답에도 규칙 코드로 설명을 붙인다. 타인의 출생정보·간지를 새로 요청하지 않으며 서버 함수·DB 변경 없이 사용할 수 있다.
- 날짜별 풀이는 한국 시간의 양력 일진 천간 오행과 본인 일간 오행만 비교한다. 자정 경계, 1900~2100년, 윤일/날짜 검사, 오늘 복귀, 시간 모름/절기 안내를 포함한다. 길흉·사건 예측·대운 계산이 아니다.
- 앱 전체 배너·관계 탭·모임 카드·대화 탭에 새 메시지를 표시한다. 최근 받은 메시지의 ID만 조회하고 방별 확인 ID만 사용자별 `sessionStorage`에 저장한다. 본문·닉네임·출생정보는 저장하지 않는다. 기존 RLS가 타 방·차단자를 제외한다.
- Realtime 구독, 연결/화면 복귀 시 재조회, 보이는 페이지에서 30초 주기 확인을 사용한다. 새 모임도 재조회에 포함한다. 기기의 현재 브라우저 탭 기준이며 다른 기기와 읽음을 동기화하지 않는다.
- 실제 대화 탭의 보이는 메시지까지 확인 처리한다. 궁합 탭/백그라운드에 도착한 메시지는 확인 처리하지 않는다. 초기 조회와 Realtime 사이 INSERT/DELETE 경합을 보완했다.
- 웹 푸시 켜짐은 현재 계정의 DB 등록과 브라우저 구독을 함께 확인한다. endpoint 중복 오류를 무조건 성공으로 삼지 않는다. 초기 DB 등록 실패 시 새 구독을 되돌리고 DB 해제 실패 시 브라우저 구독을 보존한다. 서비스워커 없는 개발 환경에서 무한 대기하지 않는다.
- 푸시 함수의 응답 오류를 확인하고, 요청 실패는 이미 저장된 메시지와 분리해 사용자에게 알린다. 요청 성공도 실제 수신을 보장하지 않는다.

## 확인 결과

- 기준선(main `36c0f42`): `npm ci`, 테스트 77개, build, lint 통과.
- 변경 후: `npm test` **95개 통과 / 실패 0 / 건너뜀 0**, `npm run build`, `npm run lint` 통과. 추가 테스트 18개: 오행 관계·날짜·설명 6, 읽음 2, 푸시 7, 화면 3.
- 공개 설정을 포함한 빌드는 minified JS 약 584kB로 Vite의 500kB 안내가 발생한다. 빌드 성공과 별개로 이후 성능 작업에서 코드 분할을 검토할 수 있다. 의존성·lockfile은 변경하지 않았다.
- 로컬 Vite HTML HTTP 200. 프로덕션 preview의 HTML·서비스워커·manifest HTTP 200. Chromium에서 시작 화면의 두 로그인 버튼·서비스워커 active/scope `/` 확인, 페이지 오류 0. 로그인 버튼을 누르지 않았다.
- Chromium 가짜 backend의 **14개 시나리오** 통과, 외부 HTTP 요청 0, 페이지 오류 0:
  1. 모바일 오행 클릭·키보드 Enter
  2. 날짜 변경·오늘 복귀
  3. 360/390/430px 가로 넘침 없음
  4. 프로필·궁합 화면 표시
  5. 대화 탭 밖 새 메시지 표시
  6. 보이는 대화 확인 후 배지 해제
  7. 초기 조회 중 도착한 메시지 보존
  8. 본인 메시지는 새 메시지에서 제외
  9. 푸시 요청 실패에도 전송된 메시지 보존
  10. DELETE 이벤트 반영
  11. 연결 오류 안내·복구 재조회
  12. 읽음 저장값에는 ID만 포함
  13. 백그라운드 도착을 읽음으로 처리하지 않음
  14. 차단자 메시지·배지 제외

브라우저 검증 재현(저장소 개발 서버를 켠 상태):

```sh
npm run dev -- --host 0.0.0.0
# 다른 터미널. 도구는 저장소 의존성을 바꾸지 않고 /tmp에 설치한다.
npm install --prefix /tmp/cross-browser --cache /tmp/cross-reading-npm-cache --no-audit --no-fund playwright@1.64.0
node scripts/verify-reading.mjs
```

설치된 Playwright 버전은 실제 `npm list --prefix /tmp/cross-browser playwright`로 확인한다. 다른 설치 위치는 `CR_PLAYWRIGHT_MODULE`, Chromium 실행 파일은 `CR_CHROMIUM_PATH`로 지정할 수 있다. 기본 Chromium 경로는 `/usr/bin/chromium`이다. 스크린샷은 가짜 데이터로 `/tmp/cross-browser/profile-{360,390,430}.png`에 생성한다. 실제 Supabase 모듈을 로컬 mock으로 대체하고 외부 요청은 전부 차단한다.

## 저장소·기존 작업

- `Kor-Sangyeoniii/cross-reading` main `36c0f42`, 열린 PR #3(DB/RLS 초안): 이번 변경과 파일 겹침 없음.
- `Kor-Sangyeoniii/Ai_Business_Lab` main `ea82e88`, 열린 PR #10(와이어프레임), #11(Codex 이전·인수인계): diff 확인 후 참고만 했고 관제탑 파일은 수정하지 않았다.
- 네트워크 초기 API 403 이후 GitHub API PR 조회 성공. 두 저장소 최신 main SHA를 API로 다시 확인했다.
- 사용자 직접 지시가 기존 담당 표보다 우선하므로 Codex가 화면·core·lib를 담당한다. AGENTS/PROJECT/DECISIONS/ACTIVE 확정 문서는 수정하지 않았다.

## 개발 환경과 남은 검증

- Node 24.19.0, npm 11.9.0. frozen 설치는 `npm ci`를 사용한다.
- 기존 배포 workflow에 이미 공개되어 있는 브라우저 공개 설정만 Git에서 제외되는 `.env.local`에 준비했다. 기존 파일이 있으면 보존한다. 서버 비밀키는 사용하지 않는다.
- 환경 초안에 `install_script`, `start_skill`, 필요한 custom network domains(`api.github.com`, `bfntkulpspknuuwmnhfx.supabase.co`)를 저장한다. 스크립트 저장은 실행·런타임 적용·환경 publish·앱 배포를 뜻하지 않는다.
- Supabase Auth health 읽기 요청은 실제 프록시 CONNECT 단계에서 **403**. URL/공개키 부족으로 단정하지 않으며, 설정 초안 적용 후 다시 확인해야 한다.
- 실제 카카오/구글 로그인, 두 가짜 계정 간 DB/RLS·Realtime 수신, 모바일 기기의 실제 웹 푸시 수신은 **미검증**. 키가 설정된 공개 workflow만으로 서버 VAPID 설정이나 함수 배포 상태를 확인했다고 주장하지 않는다.
- 배포 승인 후 수신 검증 시: 동일한 VAPID public key 사용·서버 private key/subject 설정·함수 배포 여부를 값 출력 없이 확인하고, HTTPS PWA에서 본인 테스트 계정 두 개의 알림 허용·모임 가입·새 메시지·알림 클릭을 검증한다. iOS는 지원 버전의 Safari 홈 화면 앱에서 검증한다. 실제 외부 푸시 발송은 별도 승인이 필요하다.
- 개인정보·푸시 구독 경로는 HIGH 검토 대상으로 Claude 리뷰와 사용자 승인 전 merge·배포하지 않는다. 이 검증은 독립 벤더 리뷰를 대신하지 않는다.
