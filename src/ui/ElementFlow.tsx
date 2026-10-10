import { useId, useState } from 'react'
import type { FiveElement } from 'manseryeok'
import { CONTROLS, ELEMENTS, ELEMENT_READING, elementDetail, GENERATES, READING_LIMIT } from '../core/reading'
import type { SajuChart } from '../core/saju'
import { ReadingDetails } from './ReadingDetails'
import styles from './ElementFlow.module.css'

const POINTS = [[150, 36], [258, 116], [216, 244], [84, 244], [42, 116]]
export function ElementFlow({ elements, hourKnown }: { elements: SajuChart['elements']; hourKnown?: boolean }) {
  const id = useId()
  const [selected, setSelected] = useState<FiveElement>('목')
  const [mode, setMode] = useState<'generate' | 'control'>('generate')
  const next = mode === 'generate' ? GENERATES : CONTROLS
  return <section className="card stack" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>오행 흐름</h2>
    <p className="muted small">오행을 누르면 뜻·해석 근거·생활 예시가 열려요. 화살표는 전통적인 관계를 보여줘요.</p>
    <div className="segmented" aria-label="흐름 선택">
      <button type="button" aria-pressed={mode === 'generate'} onClick={() => setMode('generate')}>상생 · 북돋움</button>
      <button type="button" aria-pressed={mode === 'control'} onClick={() => setMode('control')}>상극 · 조절</button>
    </div>
    <div className={styles.diagram}>
      <svg viewBox="0 0 300 280" aria-hidden="true">
        <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
        {ELEMENTS.map((el, i) => {
          const [x, y] = POINTS[i]; const [tx, ty] = POINTS[ELEMENTS.indexOf(next[el])]
          const distance = Math.hypot(tx - x, ty - y)
          return <line key={el} x1={x + (tx - x) * 32 / distance} y1={y + (ty - y) * 32 / distance} x2={tx - (tx - x) * 37 / distance} y2={ty - (ty - y) * 37 / distance} stroke="currentColor" strokeWidth="2" strokeDasharray={mode === 'control' ? '5 4' : undefined} markerEnd={`url(#${id}-arrow)`} />
        })}
      </svg>
      {ELEMENTS.map((el, i) => <button key={el} type="button" className={styles.node} data-element={el} style={{ left: `${POINTS[i][0] / 3}%`, top: `${POINTS[i][1] / 2.8}%` }} aria-pressed={selected === el} aria-controls={`${id}-detail`} aria-label={`${el}, ${elements[el]}글자, 상세 풀이`} onClick={() => setSelected(el)}><strong>{el}</strong><small>{elements[el]}글자</small></button>)}
    </div>
    <p className="small">{ELEMENTS.map((el) => `${el} → ${next[el]}`).join(' · ')}</p>
    <div id={`${id}-detail`} aria-live="polite" className="stack">
      <h3>{ELEMENT_READING[selected].name}</h3>
      <p>{ELEMENT_READING[selected].meaning}</p>
      <p>{selected} → {next[selected]}: {mode === 'generate' ? '이어지는 기운을 북돋는 상생의 비유예요.' : '서로 균형을 조절하는 상극의 비유예요. 좋고 나쁨을 가르지 않아요.'}</p>
      <ReadingDetails {...elementDetail(selected, elements, hourKnown)} />
    </div>
    <p className="muted small">{READING_LIMIT}</p>
  </section>
}
