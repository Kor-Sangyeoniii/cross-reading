import { useState } from 'react'
import type { Gender, TenGod } from 'manseryeok'
import { natalReadings, personalLuck, personalPeriods, PERSONAL_LIMIT, TEN_GOD_READING } from '../core/personalReading'
import { seoulToday, type BirthInput, type SajuChart } from '../core/saju'
import styles from './ReadingHome.module.css'

type ReadingMode = 'natal' | 'luck' | 'day' | 'month' | 'year'
function GodDetail({ god, basis }: { god: TenGod; basis: string }) {
  const reading = TEN_GOD_READING[god]
  return <details className="card"><summary><strong>{god} · {reading.theme} ＋</strong></summary><div className="stack"><p>{reading.meaning}</p><p>생활 예시 · {reading.example}</p><p className="muted small">근거 · {basis}</p></div></details>
}
function PillarReading({ title, reading, chart }: { title: string; reading: ReturnType<typeof personalPeriods>['day']; chart: SajuChart }) {
  const main = TEN_GOD_READING[reading.stemGod]
  return <section className={styles.answer} aria-label={title}>
    <h2 className="small">{title} · {reading.label}</h2>
    <h3>{main.theme}</h3>
    <p>{main.meaning}</p>
    <p className="notice">생활에서 이렇게 살펴봐요<br />{main.example}</p>
    <details><summary>왜 이런 풀이일까요? · {reading.stemGod}</summary><p>내 일간 {chart.dayMaster.label}과 이 기간의 {reading.label[0]} 천간을 오행·음양으로 비교한 관계가 {reading.stemGod}이에요.</p><p>천간에서 찾은 한 가지 관점이에요. 내 원국 전체나 실제 상황을 대신하지 않아요.</p></details>
    <GodDetail god={reading.branchGod} basis={`${reading.label[1]} 지지의 대표 지장간(정기)을 내 일간과 비교했어요. 지장간 전체를 종합한 풀이는 아니에요.`} />
  </section>
}
export function PersonalReading({ chart, birth, mode }: { chart: SajuChart; birth: BirthInput; mode: ReadingMode }) {
  const [date, setDate] = useState(seoulToday)
  const [convention, setConvention] = useState<Gender | null>(null)
  const [selectedLuck, setSelectedLuck] = useState<number | null>(null)
  let periods: ReturnType<typeof personalPeriods> | undefined, luck: ReturnType<typeof personalLuck> | undefined, error = ''
  try {
    if (mode === 'day' || mode === 'month' || mode === 'year') periods = personalPeriods(chart, date)
    if (mode === 'luck') luck = personalLuck(birth, convention, date)
  } catch (e) { error = (e as Error).message }
  const current = luck?.available ? luck.approximateCurrent : -1
  const chosen = luck?.available ? luck.pillars[selectedLuck ?? (current >= 0 ? current : 0)] : undefined
  const period = periods && (mode === 'day' || mode === 'month' || mode === 'year') ? periods[mode] : undefined
  const dateLabel = mode === 'month' ? '이번 달에서 살펴볼 날짜' : mode === 'year' ? '올해에서 살펴볼 날짜' : '살펴볼 날짜 · 한국 시간'
  const periodTitle = mode === 'month' ? '월운' : mode === 'year' ? '연운' : '일운'
  return <section className="stack-lg" aria-label="나의 개인 사주 풀이">
    {mode === 'natal' && <div className="stack"><p>비견·겁재 같은 십신은 나와 다른 글자 사이의 관계를 부르는 이름이에요. 아래에서 궁금한 항목을 눌러 뜻과 생활 예시를 읽어보세요.</p><p className="muted small">반복 횟수가 성격의 강도나 좋고 나쁨을 뜻하지 않아요.</p>{natalReadings(chart).map(({source,god}) => <div key={source}><h3>{source}</h3><GodDetail god={god} basis={`${source}를 내 일간에 대조한 결과예요. 지지는 대표 지장간만 사용해요.`} /></div>)}{!chart.hourKnown && <p className="notice">출생시간을 몰라 시주는 제외했어요.</p>}</div>}
    {mode !== 'natal' && <div className="card stack"><label className="field">{dateLabel}<input type="date" className="input" min="1900-01-01" max="2100-12-31" value={date} onChange={(e) => { setDate(e.target.value); setSelectedLuck(null) }} /></label><button type="button" className="btn small secondary" onClick={() => { setDate(seoulToday()); setSelectedLuck(null) }}>오늘로 돌아가기</button></div>}
    {mode === 'luck' && <div className="stack"><label className="field">대운 순·역행 계산 기준<select className="input" value={convention ?? ''} onChange={(e) => {setConvention((e.target.value || null) as Gender | null);setSelectedLuck(null)}}><option value="">직접 선택해 주세요</option><option value="male">전통 남성 기준</option><option value="female">전통 여성 기준</option></select></label><p className="muted small">연간 음양과 선택한 기준으로 방향을 정해요. 이 선택은 이번 화면에서만 사용하며 계정에 저장하지 않아요.</p>{luck && !luck.available && <p className="notice">{luck.reason}</p>}{luck?.available && <><p>{luck.forward ? '순행' : '역행'} · 출생 후 약 {luck.startYears}년 {luck.startMonths}개월 {luck.startDays}일부터 시작하는 계산이에요.</p><p className="muted small">아래 나이 구간은 엔진의 반올림된 시작 나이를 쓰는 근사 표시예요. 실제 전환일 전후에는 구간이 다를 수 있고, 첫 대운 전에는 해당 구간이 없어요.</p><label className="field">10년 흐름 선택<select className="input" value={selectedLuck ?? (current >= 0 ? current : 0)} onChange={(e) => setSelectedLuck(Number(e.target.value))}>{luck.pillars.map((p,i) => <option key={i} value={i}>약 {p.age}~{p.endAge}세 · {p.label}{i === current ? ' · 선택 날짜 기준 근사 구간' : ''}</option>)}</select></label>{chosen && <PillarReading title="선택한 대운" reading={chosen} chart={chart} />}</>}</div>}
    {period && periods && <div className="stack" aria-live="polite">
      <PillarReading title={periodTitle} reading={period} chart={chart} />
      <p className="muted small">{date}의 한국 시간 정오 기준이에요. {mode === 'year' ? '연운은 1월 1일이 아닌 입춘에서 바뀌어요.' : mode === 'month' ? '월운은 달력의 1일이 아닌 절기에서 바뀌어요. 같은 달에도 선택한 날짜에 따라 다를 수 있어요.' : '일운은 자정에서 바뀌어요.'}</p>
      {((mode === 'year' && periods.yearBoundary) || (mode === 'month' && periods.monthBoundary)) && <p className="notice">선택한 날 안에 절기가 바뀌어요. 정오의 간지이므로 절입 전후의 풀이가 다를 수 있어요.</p>}
    </div>}
    {error && <p className="notice error" role="alert">{error}</p>}
    {chart.yearMonthUncertain && <p className="notice">출생일이 절기 경계일이라 내 원국의 연주·월주는 확인이 필요해요.</p>}
    <p className="muted small">{PERSONAL_LIMIT}</p>
  </section>
}
