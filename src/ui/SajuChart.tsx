import { useId } from 'react'
import type { SajuChart as SajuChartData, SajuChar } from '../core/saju'
import styles from './SajuChart.module.css'

export interface SajuChartProps {
  chart: SajuChartData
  nickname: string
}

const ELEMENTS = [
  ['목', '木'], ['화', '火'], ['토', '土'], ['금', '金'], ['수', '水'],
] as const

function CharacterBox({ character, title, kind, isDayMaster = false }: {
  character: SajuChar
  title: string
  kind: '천간' | '지지'
  isDayMaster?: boolean
}) {
  return (
    <div
      className={`${styles.box}${isDayMaster ? ` ${styles.dayMaster}` : ''}`}
      data-element={character.element}
      data-day-master={isDayMaster || undefined}
      role="img"
      aria-label={`${title} ${kind} ${character.ko}, ${character.yinYang}의 ${character.element}, ${character.tenGod}`}
    >
      <span className={styles.hanja} aria-hidden="true">{character.hanja}</span>
      <span className={styles.characterLabel} aria-hidden="true">
        {character.ko} · {character.yinYang}{character.element}
      </span>
    </div>
  )
}

/** Personal chart only: display the supplied calculation without adding scores or interpretations. */
export function SajuChart({ chart, nickname }: SajuChartProps) {
  const id = useId()
  const total = Object.values(chart.elements).reduce((sum, count) => sum + count, 0)

  return (
    <section className={styles.chart} aria-labelledby={`${id}-title`}>
      <h2 className={styles.title} id={`${id}-title`}>{nickname}님의 사주</h2>
      <div className={styles.summary}>
        <p>일간 <strong>{chart.dayMaster.label}</strong></p>
        <p className={styles.description}>나를 나타내는 글자예요</p>
      </div>

      {(!chart.hourKnown || chart.yearMonthUncertain) && (
        <div className={styles.notices}>
          {!chart.hourKnown && <p>출생시간 없이 봤어요</p>}
          {chart.yearMonthUncertain && <p>절기가 바뀌는 날이라 일부 해석이 달라질 수 있어요</p>}
        </div>
      )}

      <div className={styles.pillars} style={{ gridTemplateColumns: `repeat(${chart.cells.length}, minmax(0, 1fr))` }}>
        {chart.cells.map((cell) => (
          <div className={styles.pillar} key={cell.pillar} role="group" aria-labelledby={`${id}-${cell.pillar}`}>
            <h3 className={styles.pillarTitle} id={`${id}-${cell.pillar}`}>{cell.title}</h3>
            <span className={styles.tenGod} aria-hidden="true">{cell.stem.tenGod}</span>
            <CharacterBox character={cell.stem} title={cell.title} kind="천간" isDayMaster={cell.pillar === 'day'} />
            <CharacterBox character={cell.branch} title={cell.title} kind="지지" />
            <span className={styles.tenGod} aria-hidden="true">{cell.branch.tenGod}</span>
          </div>
        ))}
      </div>

      <section className={styles.distribution} aria-labelledby={`${id}-elements`}>
        <h3 id={`${id}-elements`}>오행 분포</h3>
        <p className={styles.distributionNote}>총 {total}글자 기준</p>
        <ul className={styles.elementList}>
          {ELEMENTS.map(([element, hanja]) => (
            <li className={styles.elementRow} data-element={element} key={element}>
              <span className={styles.dot} aria-hidden="true" />
              <span>{element}({hanja})</span>
              <span
                className={styles.bar}
                role="meter"
                aria-label={`${element} 오행 개수`}
                aria-valuemin={0}
                aria-valuemax={total || 1}
                aria-valuenow={chart.elements[element]}
                aria-valuetext={`${total}글자 중 ${chart.elements[element]}개`}
              >
                <span style={{ width: `${total ? chart.elements[element] / total * 100 : 0}%` }} />
              </span>
              <span className={styles.count}>{chart.elements[element]}</span>
            </li>
          ))}
        </ul>
      </section>
      <p className={styles.footer}>자기이해와 대화를 위한 참고예요.</p>
    </section>
  )
}
