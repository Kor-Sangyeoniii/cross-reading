import { useState } from 'react'
import type { Gender, TenGod } from 'manseryeok'
import { natalReadings, personalLuck, personalPeriods, PERSONAL_LIMIT, TEN_GOD_READING } from '../core/personalReading'
import { seoulToday, type BirthInput, type SajuChart } from '../core/saju'

function GodDetail({ god, basis }: { god: TenGod; basis: string }) {
  const reading = TEN_GOD_READING[god]
  return <details className="card" style={{ marginTop: 10 }}><summary><strong>{god} · {reading.theme}</strong></summary><div className="stack" style={{ marginTop: 12 }}><p>{reading.meaning}</p><p className="muted small">근거 · {basis}</p><p>생활 예시 · {reading.example}</p></div></details>
}
function PillarReading({ title, reading, chart }: { title: string; reading: ReturnType<typeof personalPeriods>['day']; chart: SajuChart }) {
  return <section className="card"><h3>{title} · {reading.label}</h3><p className="muted small">내 일간 {chart.dayMaster.label}과 이 기간의 간지를 비교했어요.</p><GodDetail god={reading.stemGod} basis={`내 일간과 ${reading.label[0]} 천간의 오행·음양 관계를 비교했어요.`} /><GodDetail god={reading.branchGod} basis={`${reading.label[1]} 지지의 대표 지장간(정기)을 내 일간과 비교했어요. 지장간 전체를 종합한 풀이는 아니에요.`} /></section>
}
export function PersonalReading({ chart, birth }: { chart: SajuChart; birth: BirthInput }) {
  const [tab, setTab] = useState<'natal' | 'luck' | 'periods'>('natal')
  const [date, setDate] = useState(seoulToday)
  const [convention, setConvention] = useState<Gender | null>(null)
  const [selectedLuck, setSelectedLuck] = useState<number | null>(null)
  let periods: ReturnType<typeof personalPeriods> | undefined, luck: ReturnType<typeof personalLuck> | undefined, error = ''
  try { if (tab === 'periods') periods = personalPeriods(chart, date); if (tab === 'luck') luck = personalLuck(birth, convention, date) } catch (e) { error = (e as Error).message }
  const current = luck?.available ? luck.approximateCurrent : -1
  const chosen = luck?.available ? luck.pillars[selectedLuck ?? (current >= 0 ? current : 0)] : undefined
  return <section className="stack-lg" aria-label="나의 개인 사주 풀이">
    <div className="card"><h2>나의 사주 흐름</h2><p>내 원국을 기준으로 십신과 긴 흐름, 연·월·일의 변화를 살펴봐요.</p><p className="muted small">일간 {chart.dayMaster.label} · 같은 날짜라도 각자의 일간에 따라 십신이 달라져요.</p></div>
    <div className="segmented" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} role="tablist" aria-label="개인 풀이 종류">{([['natal','원국 풀이'],['luck','대운'],['periods','연·월·일']] as const).map(([key,label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === 'natal' && <div className="stack"><p>원국의 각 자리에 나타난 십신이에요. 항목을 누르면 뜻과 생활 예시가 열려요. 반복 횟수가 성격의 강도나 좋고 나쁨을 뜻하지 않아요.</p>{natalReadings(chart).map(({source,god}) => <div key={source}><h3>{source}</h3><GodDetail god={god} basis={`${source}를 내 일간에 대조한 결과예요. 지지는 대표 지장간만 사용해요.`} /></div>)}{!chart.hourKnown && <p className="notice">출생시간을 몰라 시주는 제외했어요.</p>}</div>}
    {tab !== 'natal' && <label className="field">살펴볼 날짜 · 한국 시간<input type="date" className="input" min="1900-01-01" max="2100-12-31" value={date} onChange={(e) => setDate(e.target.value)} /><button type="button" className="btn small secondary" onClick={() => setDate(seoulToday())}>오늘로 돌아가기</button></label>}
    {tab === 'luck' && <div className="stack"><label className="field">대운 순·역행 계산 기준<select className="input" value={convention ?? ''} onChange={(e) => {setConvention((e.target.value || null) as Gender | null);setSelectedLuck(null)}}><option value="">직접 선택해 주세요</option><option value="male">전통 남성 기준</option><option value="female">전통 여성 기준</option></select></label><p className="muted small">연간 음양과 선택한 기준으로 방향을 정해요. 이 선택은 이번 화면에서만 사용하며 계정에 저장하지 않아요.</p>{luck && !luck.available && <p className="notice">{luck.reason}</p>}{luck?.available && <><p>{luck.forward ? '순행' : '역행'} · 출생 후 약 {luck.startYears}년 {luck.startMonths}개월 {luck.startDays}일부터 시작하는 계산이에요.</p><p className="muted small">아래 나이 구간은 엔진의 반올림된 시작 나이를 쓰는 근사 표시예요. 실제 전환일 전후에는 구간이 다를 수 있고, 첫 대운 전에는 해당 구간이 없어요.</p><label className="field">10년 흐름 선택<select className="input" value={selectedLuck ?? (current >= 0 ? current : 0)} onChange={(e) => setSelectedLuck(Number(e.target.value))}>{luck.pillars.map((p,i) => <option key={i} value={i}>약 {p.age}~{p.endAge}세 · {p.label}{i === current ? ' · 선택 날짜 기준 근사 구간' : ''}</option>)}</select></label>{chosen && <PillarReading title="선택한 대운" reading={chosen} chart={chart} />}</>}</div>}
    {periods && <div className="stack"><p>{date}의 한국 시간 정오 기준이에요. 연운은 입춘, 월운은 절기에서 바뀌고 일운은 자정에서 바뀌어요.</p>{(periods.yearBoundary || periods.monthBoundary) && <p className="notice">선택한 날 안에 연운 또는 월운이 바뀌어요. 이 화면은 정오의 간지를 표시하므로 절입 전후의 풀이가 다를 수 있어요.</p>}<PillarReading title="연운" reading={periods.year} chart={chart} /><PillarReading title="월운" reading={periods.month} chart={chart} /><PillarReading title="일운" reading={periods.day} chart={chart} /><p className="muted small">세 기간을 함께 보되, 각 십신을 합쳐 특정 사건을 예측하지 않아요. 날짜를 바꾸면 해당 시점의 연·월·일을 다시 계산해요.</p></div>}
    {error && <p className="notice error" role="alert">{error}</p>}
    {chart.yearMonthUncertain && <p className="notice">출생일이 절기 경계일이라 내 원국의 연주·월주는 확인이 필요해요.</p>}
    <p className="muted small">{PERSONAL_LIMIT}</p>
  </section>
}
