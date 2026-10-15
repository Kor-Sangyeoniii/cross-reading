import { useId, useRef, useState } from 'react'
import type { SajuChart as ChartData, PillarKey } from '../core/saju'
import {
  analyzeShinsal,
  DEFAULT_SHINSAL_OPTIONS,
  PILLAR_CONTEXT,
  SHINSAL,
  type ShinsalHit,
  type ShinsalOptions,
  type TransitPillar,
} from '../core/shinsal'
import { SajuChart } from './SajuChart'
import styles from './ShinsalReading.module.css'

export function ShinsalReading({
  chart,
  transit,
}: {
  chart: ChartData
  transit?: TransitPillar
}) {
  const [options, setOptions] = useState<ShinsalOptions>(
    DEFAULT_SHINSAL_OPTIONS,
  )
  const [selected, setSelected] = useState<string | null>(null)
  const detail = useRef<HTMLElement>(null)
  const id = useId()
  const result = analyzeShinsal(chart, options, transit)
  const all = [...result.natalHits, ...result.transitHits]
  const active = all.find((h) => h.id === selected)
  function select(hit: ShinsalHit) {
    setSelected(hit.id)
    // The region stays mounted so keyboard focus can move without a timing race.
    detail.current?.focus({ preventScroll: true })
    detail.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }
  function chips(hits: ShinsalHit[]) {
    return (
      <div className={styles.chips}>
        {hits.map((hit) => (
          <button
            key={hit.id}
            type="button"
            className={styles.chip}
            aria-label={`${hit.title} ${hit.name} 풀이`}
            aria-pressed={active?.id === hit.id}
            aria-controls={`${id}-detail`}
            onClick={() => select(hit)}
          >
            {hit.name}
            {hit.uncertain ? ' *' : ''}
          </button>
        ))}
      </div>
    )
  }
  const renderPillar = (pillar: PillarKey) =>
    chips(result.natalHits.filter((h) => h.position === pillar))
  const connections = result.connections.filter((c) =>
    transit ? c.transit : !c.transit,
  )
  return (
    <section className={styles.root} aria-label="원국과 신살 풀이">
      <div className={styles.intro}>
        <strong>내 원국은 그대로, 운의 글자는 날짜에 따라</strong>
        <p>
          원국은 태어난 때의 네 기둥이에요. 위는 천간, 아래는 지지예요. 글자
          아래의 신살 이름을 누르면 뜻과 근거가 열려요.
        </p>
      </div>
      <SajuChart
        chart={chart}
        nickname="나"
        title="내 원국 · 시주·일주·월주·연주"
        footerForPillar={renderPillar}
      />
      {transit && (
        <section className={styles.transit} aria-label="선택한 운의 신살">
          <span>{transit.title} · 원국과 비교</span>
          <h3>선택 간지 · {transit.label}</h3>
          <p>
            내 일간 {chart.dayMaster.stem}·월지 {chart.pillars.month[1]}·
            {options.twelveBase === 'year' ? '연지' : '일지'}{' '}
            {chart.pillars[options.twelveBase][1]}를 기준으로 이 운의 글자를
            대조했어요.
          </p>
          {chips(result.transitHits)}
          {transit.uncertain && (
            <p className="notice">
              절기 경계일의 정오 기준이에요. 절입 전후에는 달라질 수 있어요.
            </p>
          )}
        </section>
      )}
      <section
        ref={detail}
        tabIndex={-1}
        id={`${id}-detail`}
        className={styles.detail}
        aria-label="선택한 신살 풀이"
      >
        {active ? (
          <>
            <span className={styles.eyebrow}>
              {active.title} · {active.label}
              {active.uncertain ? ' · 확인 필요' : ''}
            </span>
            <h3>
              {active.name} · {SHINSAL[active.name].theme}
            </h3>
            <p>{SHINSAL[active.name].meaning}</p>
            <p className={styles.example}>
              생활에서 살펴보기
              <br />
              {SHINSAL[active.name].example}
            </p>
            <h4>왜 여기에 표시됐나요?</h4>
            <p>{active.basis}</p>
            <p className="muted small">
              {active.position === 'transit'
                ? '선택한 운의 표시예요. 태어난 원국에 새 신살이 생겼다는 뜻은 아니에요.'
                : `${active.title}는 전통적으로 ‘${PILLAR_CONTEXT[active.position]}’에 연결해 읽기도 해요. 실제 삶의 원인이나 결과를 정하는 자리는 아니에요.`}
            </p>
            {active.uncertain && (
              <p className="notice">
                출생 또는 조회 날짜의 절기 경계 영향을 받는 항목이에요. 정확한
                시간을 확인하면 달라질 수 있어요.
              </p>
            )}
          </>
        ) : (
          <p>
            궁금한 신살 이름을 눌러보세요. 어느 기둥에 있고, 왜 표시됐는지
            여기에서 확인할 수 있어요.
          </p>
        )}
      </section>
      <section className={styles.section} aria-label="신살 함께 읽기">
        <h3>따로 외우지 않고 함께 읽기</h3>
        <p className="muted small">
          아래 두 항목이 함께 있다는 뜻이에요. 신살끼리 합쳐지거나 서로의 작용을
          없앤다는 판정은 아니에요.
        </p>
        {result.together.length ? (
          result.together.map((pair) => (
            <details className={styles.reading} key={`${pair.a}-${pair.b}`}>
              <summary>
                {pair.left.title} {pair.a} + {pair.right.title} {pair.b}
                {pair.uncertain ? ' · 확인 필요' : ''}
              </summary>
              <p>{pair.meaning}</p>
              <p className={styles.example}>{pair.example}</p>
              <p className="muted small">근거 1 · {pair.left.basis}</p>
              <p className="muted small">근거 2 · {pair.right.basis}</p>
              {pair.uncertain && (
                <p>절기 경계에 걸린 항목이 있어 이 조합은 확인이 필요해요.</p>
              )}
            </details>
          ))
        ) : (
          <p>
            현재 표시된 항목에는 준비된 연결 풀이 조합이 없어요. 각 기둥의
            이름을 눌러 개별 뜻을 읽어보세요.
          </p>
        )}
      </section>
      <section className={styles.section} aria-label="기둥 사이의 합충">
        <h3>
          {transit ? '내 원국과 선택한 운의 연결' : '내 기둥 사이의 연결'}
        </h3>
        <p className="muted small">
          이 부분은 신살과 별개로 실제 천간·지지 글자를 비교한 합·충이에요.
        </p>
        {connections.length ? (
          connections.map((c) => (
            <details className={styles.reading} key={c.id}>
              <summary>
                {c.title}
                {c.uncertain ? ' · 확인 필요' : ''}
              </summary>
              <p>{c.basis}</p>
              <p>{c.meaning}</p>
              <p className={styles.example}>{c.example}</p>
            </details>
          ))
        ) : (
          <p>
            이번 비교에서 천간합·지지육합·지지충에 해당하는 쌍은 없어요. 다른
            모든 관계가 없다는 뜻은 아니에요.
          </p>
        )}
      </section>
      <details className={styles.settings}>
        <summary>계산 기준·지원 범위 확인 및 변경</summary>
        <div className="stack">
          <label className="field">
            12신살 기준
            <select
              className="input"
              value={options.twelveBase}
              onChange={(e) =>
                setOptions({
                  ...options,
                  twelveBase: e.target.value as 'year' | 'day',
                })
              }
            >
              <option value="year">내 연지 기준</option>
              <option value="day">내 일지 기준</option>
            </select>
          </label>
          <label className="field">
            백호 간지 대조 범위
            <select
              className="input"
              value={options.baekhoScope}
              onChange={(e) =>
                setOptions({
                  ...options,
                  baekhoScope: e.target.value as 'all' | 'day',
                })
              }
            >
              <option value="all">네 기둥·운까지 · 확장 비교</option>
              <option value="day">내 원국 일주만</option>
            </select>
          </label>
          <p>
            12신살은 연지 기준, 백호는 네 기둥·운까지 간지를 대조하는 확장
            비교가 기본이에요. 일주만 보는 방식과 결과가 다를 수 있어요. 선택은
            이 화면에서만 적용돼요.
          </p>
          <p>
            천을·문창은 일간, 천덕·월덕은 월지 기준이에요. 양인은 양간만, 괴강은
            일주 경진·경술·임진·무술 기준이에요. ‘신’은 천간 辛과 지지 申을
            구별해요.
          </p>
          <p>
            현재 19종(귀인·특수 신살 7종, 12신살)을 지원해요.
            공망·홍염·원진·귀문, 형·파·해·삼합, 지장간 전체와 12운성 종합은
            포함하지 않았어요. 학파별 기준이 달라 다른 만세력 앱과 표시가 다를
            수 있어요.
          </p>
          <p>
            출생시간을 모르면 시주를 만들지 않아요. 절기 경계의 영향을 받는
            항목에는 * 또는 확인 필요를 표시해요. 한국 시간·자정 일자 변경,
            진태양시 보정 없음 기준이에요.
          </p>
        </div>
      </details>
      <p className="muted small">
        신살은 전통 해석의 참고 기호예요. 성격·인격·안전성이나 미래 사건을
        증명하지 않으며 소개 상대를 검증하는 수단이 아니에요.
      </p>
    </section>
  )
}
