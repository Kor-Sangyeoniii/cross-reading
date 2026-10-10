import { useState } from 'react'
import { dailyReading } from '../core/reading'
import { seoulToday, type SajuChart } from '../core/saju'
import { ReadingDetails } from './ReadingDetails'

export function DailyReading({ chart }: { chart: SajuChart }) {
  const [date, setDate] = useState(() => seoulToday())
  let reading: ReturnType<typeof dailyReading> | undefined
  let error = ''
  try { reading = dailyReading(chart, date) } catch (e) { error = (e as Error).message }
  return <section className="card stack">
    <h2>날짜별 풀이</h2>
    <label className="field">살펴볼 날짜 · 한국 시간<input className="input" type="date" min="1900-01-01" max="2100-12-31" value={date} onChange={(e) => setDate(e.target.value)} /></label>
    <button className="btn small secondary" type="button" onClick={() => setDate(seoulToday())}>오늘로 돌아가기</button>
    <div aria-live="polite">
      {error ? <p role="alert">{error}</p> : reading && <div className="stack">
        <h3>{reading.date} · {reading.headline}</h3><p>{reading.text}</p>
        <ReadingDetails basis={reading.basis} example={reading.example} />
        <p>오늘의 질문 · {reading.question}</p>
        {reading.notes.map((note) => <p className="muted small" key={note}>{note}</p>)}
        <p className="muted small">{reading.disclaimer}</p>
      </div>}
    </div>
  </section>
}
