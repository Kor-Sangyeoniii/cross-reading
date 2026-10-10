# CR-018 사용자 테스트 배포

사용자가 2026-10-10 배포를 승인하고 이후 캡처 생성을 중단하도록 요청했다.

## 포함한 변경

- #17 오행/설명과 채팅 알림
- #18 아이콘 로딩 모션
- #19 개인 원국/십신/대운/연월일
- #20 로그인/회원가입 구분
- #21 시작 예시 제거 (PASS/SMS 실제 연동은 보류)
- #22 이메일 아이디·비밀번호 가입/로그인/복구

main에서 만든 통합 브랜치 codex/CR-018-test-deployment에 해당 브랜치를 합쳤다. kit.tsx의 import 충돌은 로딩 모션과 메시지 알림 두 기능을 모두 유지하도록 해결했다. main에 PR을 merge하지 않는다.

## 검증

- 테스트 18파일·111개 통과, VITE_BASE=/cross-reading/ 빌드·lint 통과.
- 캡처 없이 브라우저 검증: 풀이/알림 17, 소셜 인증 9, 비밀번호 인증 13항목 통과. 각 외부 요청 0건·pageerror 0건.
- 인증용 가상 클라이언트에 통합 알림 구독 API를 보완했다. 브라우저 스크립트는 기본으로 캡처를 만들지 않는다.
- 기존 500kB 초과 JS 청크 경고가 남아 있다.

## 배포 방식

기존 무료 GitHub Pages 워크플로 pages.yml을 작업 브랜치 ref로 workflow_dispatch한다. gh-pages에 빌드 결과가 게시되며 URL은 https://kor-sangyeoniii.github.io/cross-reading/ 이다. main 또는 기존 기능 PR은 merge하지 않는다.

현재 실행 환경에서 해당 github.io 호스트 직접 HTTP 조회는 프록시 정책의 403으로 차단된다. GitHub API로 Actions 결과·Pages 빌드 상태·게시된 파일을 확인한다. 차단을 우회하지 않는다.

## 실제 사용자 테스트 범위

실제 계정/메일/기기 푸시는 대신 생성·발송하지 않았다. 이메일 가입은 활성화·확인 필수 상태만 읽기 확인했다. 운영 SMTP/수신 가능 여부와 Auth Redirect URLs, OAuth 제공자 설정은 실제 사용자 테스트로 확인할 사항이다. PASS/SMS와 새 DB 변경·유료 사용은 없음.
