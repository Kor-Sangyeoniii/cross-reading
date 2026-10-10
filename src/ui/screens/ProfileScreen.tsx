import { useMemo, useState } from 'react'
import { summarizeProfile } from '../../core/profileSummary'
import { computeSaju } from '../../core/saju'
import type { MyProfile } from '../../lib/profile'
import { InviteSheet } from '../InviteSheet'
import { ErrorNotice, Tabs, TopBar } from '../kit'
import { navigate } from '../router'
import { SajuChart } from '../SajuChart'
import { ElementFlow } from '../ElementFlow'
import { DailyReading } from '../DailyReading'
import { ReadingDetails } from '../ReadingDetails'

// 06 내 프로필: 한 줄 요약, 키워드, 나의 특징 / 관계에서 편한 점 / 대화할 때 참고할 점, 사주 표.
// 계산은 이 기기에서 내 정보로만 한다. 사주 근거와 MBTI 근거를 나눠 보여준다.

export function ProfileScreen({ profile }: { profile: MyProfile }) {
  const [inviting, setInviting] = useState(false)
  const result = useMemo(() => {
    try {
      const chart = computeSaju(profile.birth)
      return { chart, summary: summarizeProfile(chart) }
    } catch {
      return null
    }
  }, [profile])

  return (
    <main className="screen with-tabs">
      <TopBar
        title="내 프로필"
        right={
          <button className="icon-btn" type="button" aria-label="설정" onClick={() => navigate('/settings')}>
            ⚙️
          </button>
        }
      />
      {!result ? (
        <ErrorNotice message="저장된 생년월일을 다시 확인해 주세요. 설정 > 정보 수정에서 고칠 수 있어요." />
      ) : (
        <div className="stack-lg">
          <section className="card">
            <p className="muted small">{profile.nickname}님은</p>
            <h2 style={{ fontSize: 21, margin: '4px 0 6px' }}>{result.summary.headline}</h2>
            <p className="muted small">{result.summary.dayMasterImage}{profile.mbti ? ` · ${profile.mbti}` : ''}</p>
            <ul className="tag-list" style={{ marginTop: 12 }} aria-label="키워드">
              {result.summary.keywords.map((k) => <li key={k}>#{k}</li>)}
            </ul>
          </section>

          <button className="btn" type="button" onClick={() => setInviting(true)}>친구 초대하기</button>

          <section className="card">
            <h2>나의 특징 <span className="badge">사주</span></h2>
            <ul>{result.summary.traits.map((t) => <li key={t}>{t}</li>)}</ul>
            <ReadingDetails {...result.summary.details.traits} />
          </section>
          <section className="card">
            <h2>관계에서 편한 점 <span className="badge">사주</span></h2>
            <ul>{result.summary.relationshipEase.map((t) => <li key={t}>{t}</li>)}</ul>
            <ReadingDetails {...result.summary.details.relationshipEase} />
          </section>
          <section className="card">
            <h2>대화할 때 참고할 점 <span className="badge">사주</span></h2>
            <ul>{result.summary.conversationTips.map((t) => <li key={t}>{t}</li>)}</ul>
            <ReadingDetails {...result.summary.details.conversationTips} />
          </section>
          <section className="card">
            <h2>MBTI <span className="badge">MBTI</span></h2>
            {profile.mbti ? (
              <p>내가 고른 유형은 <strong>{profile.mbti}</strong>예요. 친구와 궁합을 볼 때 성향 차이를 비교하는 데 쓰여요.</p>
            ) : (
              <p className="muted">MBTI 없이 사주만으로 봤어요. 설정 &gt; 정보 수정에서 언제든 추가할 수 있어요.</p>
            )}
          </section>

          {result.summary.notes.length > 0 && (
            <div className="notice">{result.summary.notes.map((n) => <p key={n}>{n}</p>)}</div>
          )}

          <ElementFlow elements={result.chart.elements} hourKnown={result.chart.hourKnown} />
          <DailyReading chart={result.chart} />
          <SajuChart chart={result.chart} nickname={profile.nickname} />
          <p className="muted small">{result.summary.disclaimer}</p>
        </div>
      )}
      {inviting && (
        <InviteSheet nickname={profile.nickname} onClose={() => setInviting(false)} />
      )}
      <Tabs current="me" />
    </main>
  )
}
