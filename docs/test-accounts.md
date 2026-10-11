# CR-021 합성 테스트 계정

실제 사람을 등록하지 않는다. 테스트 계정은 모두 `example.invalid` 주소로 만들고 관리자 API의 `email_confirm: true`를 사용하므로 메일/SMS를 발송하지 않는다. 공개 화면에 계정 전환 버튼이나 비밀번호를 넣지 않는다.

| 계정 | 가상 닉네임 | 테스트 범위 |
| --- | --- | --- |
| cross-reading-test-01@example.invalid | 테스트 모리 | 출생시간 있음, ENTJ |
| cross-reading-test-02@example.invalid | 테스트 타오 | 다른 원국·출생시간 있음, ISFP |
| cross-reading-test-03@example.invalid | 테스트 도담 | 다른 원국·출생시간 있음, ENFP |
| cross-reading-test-04@example.invalid | 테스트 몽울 | 출생시간·MBTI 미상 안내 |

닉네임은 캐릭터 이름을 빌린 가상 별칭이며 해당 계정의 사주 캐릭터를 미리 정하지 않는다. 사주 캐릭터와 궁합은 입력값에서 계산한다.

## 관리자 실행

현재 프로젝트 `bfntkulpspknuuwmnhfx`용 `SUPABASE_SERVICE_ROLE_KEY`를 클라우드 환경 보안 설정으로 공급한다. 환경 설정 초안에 요구 사항만 저장되어 있으며 값은 들어 있지 않다. 키를 채팅/코드/로그에 넣지 않는다. 서비스 키는 앱의 `VITE_` 변수로 사용하지 않는다.

Node 24에서 저장소 밖의 비공개 파일 경로를 전달한다.

```sh
node --use-env-proxy scripts/provision-test-users.mjs /tmp/cross-reading-test-credentials.json
```

스크립트는 먼저 권한 0600의 비공개 manifest에 서로 다른 무작위 비밀번호와 예정 ID를 저장한 뒤, 해당 ID의 합성 사용자만 확인/생성한다. 모든 사용자 목록 조회, 기존 비밀번호 재설정, 기존 프로필 덮어쓰기는 하지 않는다. 기존 계정이 다른 manifest 소유면 중단한다. 실패 후 같은 파일로 재실행하면 완료된 단계를 재사용한다. 파일을 잃으면 임의로 기존 계정을 덮어쓰지 말고 소유자가 처리한다.

사용자 전달용 자격 증명은 비공개 수단으로만 공유한다. 저장소/PR/공개 사이트에 파일을 올리지 않는다. `.invalid` 계정은 이메일 복구를 받을 수 없으므로 manifest를 안전하게 보관한다.

## 직접 테스트

계정별 서로 다른 브라우저 프로필/시크릿 창을 사용한다. 같은 브라우저의 일반 탭들은 Supabase 로그인 저장소를 공유하므로 독립 계정 테스트가 되지 않는다. 각 계정으로 로그인하여 개인 풀이를 확인하고, 한 계정에서 초대 링크를 만들어 나머지 세 계정에서 수락하면 4인 모임을 테스트할 수 있다. 기존 실제 사용자의 모임에 자동 추가하거나 메시지를 자동 발송하지 않는다.

관리자 권한이 없을 때에는 계정이 생성되었다고 표시하지 않는다. 생성 스크립트의 로컬 모의 테스트 통과는 실제 Supabase 생성 성공을 뜻하지 않는다.

API 근거: [공식 auth-js GoTrueAdminApi](https://github.com/supabase/auth-js/blob/master/src/GoTrueAdminApi.ts), 설치된 auth-js의 `AdminUserAttributes.id`, `email_confirm`. 관리자 키가 필요한 서버 전용 API를 사용한다.
