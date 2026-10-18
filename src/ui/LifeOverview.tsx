import type { SajuChart } from '../core/saju'
import type { PeriodReading } from '../core/readingNarrative'
import { lifeReading } from '../core/lifeReading'
import { GOD_CONTENT } from '../core/readingContent'
import styles from './LifeOverview.module.css'

export function LifeOverview({
  chart,
  period,
  label = '타고난 기질',
  uncertain = false,
}: {
  chart: SajuChart
  period?: PeriodReading
  label?: string
  uncertain?: boolean
}) {
  const areas = lifeReading(chart, period)
  return (
    <section className={styles.overview} aria-label="분야별 사주 해설">
      <header>
        <span className={styles.eyebrow}>MY LIFE READING · {label}</span>
        <h2>내 사주, 그래서 나에게 어떤 의미일까?</h2>
        <p>내 기질이 일·관계·돈·목표에서 드러나는 모습을 하나씩 살펴봐요.</p>
      </header>
      <div className={styles.summary}>
        <h3>{chart.dayMaster.label} 일간 · 나를 읽는 출발점</h3>
        <p>
          일간은 태어난 날의 중심 글자예요. 혼자서 성격을 정하는 글자가 아니라,
          다른 글자와의 관계를 읽는 기준이에요.
        </p>
        <h3>일할 때의 나 · {chart.tenGods.month.stem}</h3>
        <p>{GOD_CONTENT[chart.tenGods.month.stem].work}</p>
        <h3>가까운 사람 앞의 나 · {chart.tenGods.day.branch}</h3>
        <p>{GOD_CONTENT[chart.tenGods.day.branch].relationship}</p>
      </div>
      {(uncertain || chart.yearMonthUncertain || !chart.hourKnown) && (
        <p className="notice">
          {!chart.hourKnown
            ? '출생시간 미상으로 시주를 제외했어요. 시간이 확인되면 지수가 달라질 수 있어요. '
            : ''}
          {uncertain || chart.yearMonthUncertain
            ? '절기 경계의 근사 계산이 포함되어 있어 해설·지수 확인이 필요해요.'
            : ''}
        </p>
      )}
      <p className={styles.limit}>
        <b>참고지수는 운의 좋고 나쁨이나 성공 확률이 아니에요.</b> 해당 주제와
        연결한 십성이 얼마나 나타나는지 보여주는 앱의 편집 지표예요. 높은 수치가
        유리함을 뜻하지 않으며 과학적으로 검증된 척도가 아니에요.
      </p>
      <div className={styles.grid}>
        {areas.map((area) => (
          <details className={styles.area} key={area.id}>
            <summary>
              <span>
                {area.icon} {area.title}
              </span>
              <strong>
                {area.score}
                <small> / 100</small>
              </strong>
              <span className={styles.meter} aria-hidden="true">
                <i style={{ width: `${area.score}%` }} />
              </span>
              <small>참고지수 · 눌러서 내 해설 보기</small>
            </summary>
            <h3>{area.question}</h3>
            <p>{area.explanation}</p>
            <p className="muted small">
              근거 · {area.source.source} {area.source.god}. {area.selection}{' '}
              {area.source.basis}
            </p>
            <h4>생활에서는 이렇게</h4>
            <p>{area.example}</p>
            <h4>내가 조절할 수 있는 부분</h4>
            <p>{area.action}</p>
            {period && (
              <>
                <h4>{label}이 겹치면</h4>
                <p>
                  내 기질은 그대로 두고, 이 기간의 {period.label}을 내 일간과
                  비교해 {period.stemGod}·{period.branchGod}라는 관점을 더해
                  읽어요. 실제 사건이 생긴다는 뜻은 아니에요.
                </p>
                <p>{area.periodExplanation}</p>
                <p>
                  원국 주제 지수 {area.base} → 기간을 함께 읽은 지수{' '}
                  {area.score}. 차이는 앱의 가중치 변화이며 운이 좋아지거나
                  나빠졌다는 판정이 아니에요.
                </p>
              </>
            )}
            <details>
              <summary>{area.title} 지수 계산 근거</summary>
              <p>
                원국의 확인된 십성마다 기본 1, 이 주제에 연결한 십성은 2를 줘요.
                합계 ÷ (확인한 자리 수 × 2) × 100으로 계산해요. 값의 범위는
                50~100이며, 50도 나쁜 운을 뜻하지 않아요.
              </p>
              <p>
                이 주제의 가중치 2: {area.gods.join('·')}. 나머지는 1. 분야
                연결과 가중치는 앱이 정한 편집 규칙이에요.
              </p>
              <ul>
                {area.contributions.map((s) => (
                  <li key={s.source}>
                    {s.source} · {s.god} · {s.weight}
                  </li>
                ))}
              </ul>
              {period && (
                <p>
                  기간 지수: ({period.stemGod} 가중치 + {period.branchGod}{' '}
                  가중치) ÷ 4 × 100 = {area.transit}. 원국 70% + 기간 30%,
                  마지막에 반올림해요.
                </p>
              )}
            </details>
          </details>
        ))}
      </div>
      <details className={styles.summary}>
        <summary>원국·대운·연운·월운·일운은 어떻게 함께 작용하나요?</summary>
        <p>
          원국은 태어날 때의 글자들, 대운은 선택한 전통 기준에서 약 10년씩
          이동하는 글자들이에요. 연·월·일운은 선택한 시점의 글자예요. 모두 내
          일간과 비교해 어떤 관계가 추가되는지 읽어요.
        </p>
        <p>
          예를 들어 원국에서 내 방식과 자율성을 보는 비견을 읽고, 선택한
          대운에서 책임과 규칙을 보는 정관을 읽는다면 “자기 방식을 지키면서 공동
          규칙도 맞추는 과제”라는 질문을 만들 수 있어요. 이는 원리를 설명하는
          예시이며 내 원국에 두 글자가 있다고 단정하지 않아요.
        </p>
        <p>
          나의 대운에서 계산 기준과 구간을 선택하면 실제 간지·십성으로 비교해요.
          대운이 원국을 지우거나 특정 직업·결혼·재산을 보장하지 않아요. 연운은
          입춘, 월운은 절기, 일운은 한국 시간 자정 기준이에요.
        </p>
      </details>
    </section>
  )
}
