# CR-017 이메일 아이디·비밀번호 인증 검증

## 구현

이메일을 로그인 아이디로 사용한다. 기존 소셜 인증과 함께 첫 화면에 가입/로그인 폼을 제공하고 비밀번호 찾기·새 비밀번호 설정을 연결했다. Supabase Auth의 signUp, signInWithPassword, resetPasswordForEmail, updateUser만 사용한다. 비밀번호를 자체 테이블이나 웹 저장소에 보관하지 않는다.

- 가입 확인이 필요한 응답에서는 세션이나 프로필이 생겼다고 표시하지 않고 메일 확인을 안내한다.
- 바로 세션이 생기는 설정도 기존 onboarding 경로로 이어진다.
- 로그인은 계정을 자동 생성하지 않는다.
- 비밀번호는 가입/변경 시 8자 이상, 확인 입력 일치가 필요하다. 기존 비밀번호 로그인에는 새 길이 제한을 적용하지 않는다. 비밀번호 공백은 임의로 제거하지 않는다.
- 비밀번호 찾기 응답은 계정 존재 여부를 노출하지 않는 안내를 사용한다.
- 인증 오류 원문·이메일·비밀번호는 로그나 오류 안내에 포함하지 않는다.
- reset-password 경로는 프로필 입력 리다이렉트보다 먼저 처리한다. 복구 이벤트가 Site URL로 돌아와도 재설정 화면을 연다. 무세션/오류 링크는 비밀번호 변경을 허용하지 않는다.
- 초대 경로와 동의는 기존 방식 그대로다. 계정 인증만으로 초대를 수락하지 않는다.

## 검증 결과

- npm test: 13파일, 85개 통과.
- npm run build·npm run lint 통과. JS 청크 500kB 초과 경고 남음.
- verify-password-auth.mjs: 13항목 통과. 확인 대기, 비밀번호 불일치, 실패 재시도, 가입/로그인 라우팅, 복구 이벤트/오류 링크, 비밀번호 변경, 개인정보 미저장, 초대 복귀 등.
- verify-auth-entry.mjs: 기존 소셜 진입 회귀 9항목 통과.
- 두 브라우저 검증 모두 가상 계정/가상 응답만 사용, 외부 요청 0건·페이지 오류 0건. 360/390/430px 가로 넘침 없음.

## 재현

개발 서버를 `npm run dev -- --host 127.0.0.1`로 5173 포트에서 실행한다. Playwright/Chromium은 저장소 밖에 설치하고 다음을 실행한다:

```sh
CR_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CR_CHROMIUM_PATH=/path/to/chromium node scripts/verify-password-auth.mjs
CR_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CR_CHROMIUM_PATH=/path/to/chromium node scripts/verify-auth-entry.mjs
```

가상 캡처는 기본 /tmp/cross-password에 생성한다. 실제 계정으로 테스트하지 않는다.

## 운영 연결 전 확인할 사항

공개 Auth settings를 읽어 이메일 가입 활성화 및 이메일 확인 필수 상태를 확인했다. SMTP/메일 전달은 확인하지 않았다. Supabase 기본 메일 서비스의 수신자/발송 제한과 운영 SMTP 필요 여부를 확인해야 한다. 대시보드 운영 설정은 변경하지 않았다.

승인 후 배포 도메인과 경로를 반영한 `/auth/callback`·`/auth/reset-password` 주소가 Auth Redirect URLs에 허용되는지 확인하고, 실제 가입 확인/복구 메일 전달을 검증해야 한다. PKCE 확인 메일은 요청을 시작한 브라우저에서 열도록 안내한다.

운영 사용자 생성·실제 메일 발송·SMTP 계약/유료 사용·merge·배포 없음. 본 PR은 #21 위의 추가 변경이며 #17의 App.tsx 알림 래퍼와 함께 합칠 때 기능을 모두 유지해야 한다.
