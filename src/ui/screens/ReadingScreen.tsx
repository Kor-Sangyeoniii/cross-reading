import { useEffect, useMemo, useRef } from 'react'
import { computeSaju } from '../../core/saju'
import { summarizeProfile } from '../../core/profileSummary'
import type { MyProfile } from '../../lib/profile'
import { TopBar, Tabs, ErrorNotice } from '../kit'
import { navigate, type ReadingTopic } from '../router'
import { READING_MENU } from '../readingCatalog'
import { ChemistryCharacter } from '../ChemistryCharacters'
import { PersonalCharacter } from '../ChemistryCard'
import { PersonalReading } from '../PersonalReading'
import { ReadingDetails } from '../ReadingDetails'
import { ElementFlow } from '../ElementFlow'
import { SajuChart } from '../SajuChart'
import styles from '../ReadingHome.module.css'

export function ReadingScreen({ topic, profile }: { topic: ReadingTopic; profile: MyProfile }) {
  const main = useRef<HTMLElement>(null)
  useEffect(() => { main.current?.focus({ preventScroll: true }) }, [])
  const result = useMemo(() => {
    try { const chart = computeSaju(profile.birth); return { chart, summary: summarizeProfile(chart) } } catch { return null }
  }, [profile.birth])
  const item = READING_MENU[topic]
  return <main className="screen with-tabs" tabIndex={-1} ref={main} style={{ outline: 'none' }}>
    <TopBar title={item.title} back="/" />
    <div className="stack-lg">
      <header className={styles.intro} style={{ background: item.color }}><div><h2>{item.title}</h2><p>{item.description}</p></div><ChemistryCharacter kind={item.character} /></header>
      {!result ? <div className="stack"><ErrorNotice message="저장된 출생정보를 확인해 주세요." /><button className="btn" onClick={() => navigate('/settings')}>출생정보 수정하기</button></div> : <>
        {topic === 'temperament' && <>
          <PersonalCharacter element={result.chart.dayMaster.element} />
          <section className="card"><h2>{result.summary.headline}</h2><p>{result.summary.dayMasterImage}</p><ul className="tag-list" style={{ marginTop: 12 }}>{result.summary.keywords.map(k => <li key={k}>{k}</li>)}</ul></section>
          {([
            ['나의 특징', result.summary.traits, result.summary.details.traits],
            ['관계에서 편한 점', result.summary.relationshipEase, result.summary.details.relationshipEase],
            ['대화할 때 참고할 점', result.summary.conversationTips, result.summary.details.conversationTips],
          ] as const).map(([title, lines, details]) => <section className="card" key={title}><h2>{title} <span className="badge">사주</span></h2><ul>{lines.map(line => <li key={line}>{line}</li>)}</ul><details><summary>해석 근거와 일상 예시 보기 ＋</summary><ReadingDetails {...details} /></details></section>)}
          <section className="card"><h2>내가 고른 MBTI</h2><p>{profile.mbti ? `${profile.mbti} · 내가 선택한 유형이에요. 사주와 별도로 친구와 성향을 비교할 때 참고해요.` : '등록한 MBTI가 없어요. 사주 풀이에는 영향을 주지 않아요.'}</p></section>
          <p className="muted small">{result.summary.disclaimer}</p>
        </>}
        {topic === 'elements' && <ElementFlow elements={result.chart.elements} hourKnown={result.chart.hourKnown} />}
        {topic !== 'temperament' && topic !== 'elements' && <PersonalReading key={JSON.stringify(profile.birth)} chart={result.chart} birth={profile.birth} mode={topic} />}
        {topic === 'natal' && <SajuChart chart={result.chart} nickname={profile.nickname} />}
        {result.summary.notes.length > 0 && <div className="notice">{result.summary.notes.map(n => <p key={n}>{n}</p>)}</div>}
      </>}
      <button className="btn secondary" type="button" onClick={() => navigate('/')}>다른 풀이 고르기</button>
    </div>
    <Tabs current="home" />
  </main>
}
