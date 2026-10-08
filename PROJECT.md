# PROJECT — Cross Reading

## 목표
사주·성향 프로필과 궁합으로 유입 → 친구 2~4명 그룹방에서 반복 대화. 검증 가설 H1(공유→초대), H2(초대된 3명 이상 반복 메시지), H3(유료 관계 코칭 의향).
기준 문서(관제탑): `docs/gates/cross-reading/` — gate3-plan.md, mobile-wireframes.md(화면 기준), experiment-001.md(측정 기준).

## 기술 구성
- 화면: React 19 + TypeScript + Vite, PWA(vite-plugin-pwa)
- 로그인·DB·실시간 채팅: Supabase (Auth 카카오·구글, Postgres + RLS, Realtime)
- 알림: 웹 푸시 + Supabase Edge Function (홈 화면 설치 시)
- 사주 계산: `manseryeok` 2.0.0 (MIT) — `src/core/saju.ts`가 감싼다
- 배포: Cloudflare Pages (배포는 상연님 승인 후)

## 폴더
| 경로 | 내용 | 기본 담당 |
| --- | --- | --- |
| `src/core/` | 사주 계산·도메인 로직 (화면 무관, 테스트 필수) | Claude |
| `src/lib/` | Supabase 클라이언트·인증·데이터 접근 | Claude |
| `supabase/` | DB 마이그레이션·RLS·Edge Function | Claude |
| `src/ui/` | 화면·컴포넌트 | GPT(Codex) |
| `tasks/` | 태스크 카드 | Claude 작성, 상연님 승인 |

## 명령
- `npm install` / `npm run dev` / `npm test` / `npm run build` / `npm run lint`

## 환경 변수
`.env.example` 참고. 실제 값은 `.env.local`(Git 제외)과 배포 설정에만 둔다.
