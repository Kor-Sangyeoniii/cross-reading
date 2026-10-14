import { zodiacPersona, ZODIAC_FORMS } from '../core/zodiac'
import { PERSONA_ELEMENTS } from '../core/elementPersona'
import type { SajuChart } from '../core/saju'
import { withBase } from '../lib/basePath'
import styles from './ZodiacCard.module.css'

export function ZodiacCard({
  chart,
  example = false,
}: {
  chart: SajuChart
  example?: boolean
}) {
  const p = zodiacPersona(chart)
  return (
    <section className={styles.card} aria-label="내 사주 캐릭터">
      <p className={styles.eyebrow}>
        {example ? '가상 인물의 계산 예시' : '나의 일주 수호신'} · 임시 아트
      </p>
      <h2>{p.title}</h2>
      <p>
        {chart.pillars.day}일주 · {chart.dayMaster.element} 일간 × {p.animal}{' '}
        일지
      </p>
      {p.fireMonkey ? (
        <img
          className={styles.art}
          src={withBase('/characters/fire-monkey.png')}
          alt="치솟는 불꽃 갈기와 강렬한 표정의 원숭이 수호신 임시 시안"
        />
      ) : (
        <div
          className={styles.placeholder}
          style={{ color: p.form.color }}
          role="img"
          aria-label={`${p.title} 임시 심볼`}
        >
          <span>{p.symbol}</span>
          <b>{p.form.name}</b>
          <small>상세 일러스트 준비 중</small>
        </div>
      )}
      <p className={styles.description}>
        {p.form.appearance}. 외형으로 오행을 표현하는 창작 캐릭터예요.
      </p>
      <details>
        <summary>내 캐릭터의 근거 보기</summary>
        <p>
          동물은 태어난 날의 지지 ‘{p.branch}’에서, 기본 모습은 일간{' '}
          {chart.dayMaster.label}에서 가져왔어요. 출생 연도의 띠와는 달라요.
        </p>
        <p>
          분노하거나 차분한 외형은 미술 설정이에요. 내 실제 성격·인품·안전을
          판단하지 않아요.
        </p>
        <p>
          전체 분포는 {p.distribution.leaders.join('·')}이 가장 많이 보여요.
          일간과 분포는 서로 다른 정보예요.
        </p>
        <dl className={styles.counts}>
          {PERSONA_ELEMENTS.map((e) => (
            <div key={e}>
              <dt>{e}</dt>
              <dd>{chart.elements[e]}개</dd>
            </div>
          ))}
        </dl>
        <p className="muted small">
          표시된 {p.distribution.total}글자의 대표 오행을 센 값이에요.
          계절·지장간 등을 종합한 강약이나 점수가 아니에요.
        </p>
        {!chart.hourKnown && (
          <p className="notice">
            출생시간을 몰라 시주를 제외했어요. 시간을 알면 분포가 달라질 수
            있어요.
          </p>
        )}
        {chart.yearMonthUncertain && (
          <p className="notice">
            절기 경계라 연주·월주 확인이 필요한 임시 분포예요.
          </p>
        )}
      </details>
      <details>
        <summary>다섯 오행은 어떻게 달라지나요?</summary>
        <ul>
          {PERSONA_ELEMENTS.map((e) => (
            <li key={e}>
              <b>
                {e} · {ZODIAC_FORMS[e].name}
              </b>{' '}
              — {ZODIAC_FORMS[e].appearance}
            </li>
          ))}
        </ul>
        <p className="muted small">
          동물 12종에 일간의 오행을 반영해요. 완성 일러스트는 순차적으로
          추가합니다.
        </p>
      </details>
    </section>
  )
}
