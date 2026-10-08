# 사주 표 컴포넌트

```tsx
import { SajuChart } from './ui/SajuChart'

<SajuChart chart={chart} nickname={nickname} />
```

`chart`는 `src/core/saju.ts`의 `computeSaju()` 반환값을 그대로 전달한다. 컴포넌트는 계산·통신·저장을 하지 않는다. 개인 프로필 화면에서 사용하며 그룹 궁합 화면에 다른 사람의 원국을 노출하는 용도가 아니다.

- 시·일·월·연 순서와 시주 생략은 `chart.cells`의 계약을 따른다.
- 오행 분포는 전달된 글자 개수의 합(시간 앎 8, 모름 6)을 기준으로 표시한다. 점수가 아니다.
- 음양오행·십신은 글자와 접근성 이름으로 제공한다. 한자는 설치된 명조 계열 글꼴을 사용하며 외부 폰트를 가져오지 않는다.
- 스타일은 CSS Module로 분리했다. 부모 컨테이너 너비 안에서 최대 480px로 표시한다.
- App.tsx·라우팅은 변경하지 않았다. 후속 개인 프로필 화면에서 가져다 연결하면 된다. 데이터 추가 요청은 없다.

## 검증

`npm test`: UI 7건을 포함해 총 39건 통과. `npm run build`, `npm run lint` 통과.
기존 Vite 테스트 검색 범위가 `.test.ts`이므로 `SajuChart.runner.test.ts`가 `.test.tsx` 테스트를 불러온다. 설정/패키지 변경 없이 기존 React DOM 서버 렌더러와 Vitest를 사용했다. 향후 검색 범위에 TSX를 포함하면 중복 실행을 피하도록 runner를 제거한다.

실제 컴포넌트를 React 서버 렌더링하고 Vite가 변환한 CSS Module을 적용한 HTML을 Chromium에서 확인했다. 360·390·430px마다 시간 앎·모름·절기 경계·긴 닉네임 4개 상태를 검사했다. 모든 기둥이 한 줄에 있으며 가로 넘침 없음. 일간 보라 강조·금 막대 회색·접근성 이름 확인, 외부 요청 0건. 사용자 인터랙션 없는 표시 컴포넌트이며 실제 로그인/프로필 연결 검사는 포함하지 않는다.

스크린샷의 닉네임과 날짜는 가짜 예시다. 시간 앎은 1992-10-24 05:30, 시간 모름/절기 경계는 2024-02-04를 사용했다. 실제 사용자 정보가 아니다.

| 폭 | 시간 앎 4칸 |
| --- | --- |
| 360px | [스크린샷](__screenshots__/saju-chart-360.png) |
| 390px | [스크린샷](__screenshots__/saju-chart-390.png) |
| 430px | [스크린샷](__screenshots__/saju-chart-430.png) |

[시간 모름·절기 경계 3칸 (390px)](__screenshots__/saju-chart-unknown-390.png)
