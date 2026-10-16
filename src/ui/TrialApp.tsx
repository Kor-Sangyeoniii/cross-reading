import { ReadingExperience } from './ReadingExperience'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { computeSaju, seoulToday } from '../core/saju'
import { summarizeProfile } from '../core/profileSummary'
import { personalPeriods, TEN_GOD_READING } from '../core/personalReading'
import type { MyProfile } from '../lib/profile'
import { APP_TABS, Tabs, type AppTab } from './kit'
import { navigate, type ReadingTopic } from './router'
import { READING_MENU } from './readingCatalog'
import { ZodiacCard } from './ZodiacCard'
import { zodiacPersona } from '../core/zodiac'
import { TrialProfileEditor } from './TrialProfileEditor'
import { PersonalReading } from './PersonalReading'
import { DetailedReading } from './DetailedReading'
import { natalNarrative } from '../core/readingNarrative'
import { ElementFlow } from './ElementFlow'
import { ReadingDetails } from './ReadingDetails'
import { DatingGuide, type GuideProgress } from './dating/DatingGuide'
import styles from './TrialApp.module.css'

// Defaults are synthetic. User-selected comparison inputs stay in memory only.
const SAMPLE: MyProfile = {
  nickname: '가상 산책러',
  birth: {
    year: 1992,
    month: 1,
    day: 21,
    calendar: 'solar',
    time: { hour: 12, minute: 0 },
  },
  mbti: null,
}
const topics: ReadingTopic[] = [
  'temperament',
  'elements',
  'natal',
  'day',
  'month',
  'year',
  'luck',
]
function selectedTab(): AppTab {
  const hash = window.location.hash.slice(1)
  return APP_TABS.find((tab) => tab.id === hash)?.id ?? 'home'
}
export function TrialApp() {
  const [profile, setProfile] = useState<MyProfile>(SAMPLE)
  const [custom, setCustom] = useState(false)
  const [revision, setRevision] = useState(0)
  const [tab, setTab] = useState<AppTab>(selectedTab)
  const [topic, setTopic] = useState<ReadingTopic | null>(null)
  const [progress, setProgress] = useState<GuideProgress>({
    hasConnection: false,
    messageCount: 0,
    stage: 'profile',
  })
  const [read, setRead] = useState(0)
  const [pageVisible, setPageVisible] = useState(
    () => document.visibilityState !== 'hidden',
  )
  const heading = useRef<HTMLHeadingElement>(null)
  const chart = useMemo(() => computeSaju(profile.birth), [profile.birth])
  const summary = useMemo(() => summarizeProfile(chart), [chart])
  const day = TEN_GOD_READING[personalPeriods(chart, seoulToday()).day.stemGod]
  const guideVisible =
    tab === 'dating' || (tab === 'rooms' && progress.hasConnection)
  const unread = Math.max(0, progress.messageCount - read)
  const updateProgress = useCallback(
    (next: GuideProgress) => setProgress(next),
    [],
  )
  const choose = (next: AppTab) => {
    if (next !== tab) window.history.pushState(null, '', '#' + next)
    setTab(next)
    setTopic(null)
  }
  useEffect(() => {
    const update = () => {
      setTab(selectedTab())
      setTopic(null)
    }
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])
  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [tab, topic])
  useEffect(() => {
    if (guideVisible && pageVisible) setRead(progress.messageCount)
  }, [guideVisible, pageVisible, progress.messageCount])
  function applyProfile(next: MyProfile, changed: boolean) {
    setProfile(next)
    setCustom(changed)
    setRevision((value) => value + 1)
    if (tab === 'settings') choose('me')
  }
  function openTopic(next: ReadingTopic) {
    choose('me')
    setTopic(next)
  }
  return (
    <main className={`screen with-tabs ${styles.app}`}>
      <div className={styles.banner}>
        테스트 모드 · 선택 정보는 이 화면에서만 사용
      </div>
      <header className={styles.header}>
        <b>
          cross<span>reading</span>
        </b>
        <button type="button" onClick={() => navigate('/')}>
          내 계정으로 이용
        </button>
      </header>
      <h1 ref={heading} tabIndex={-1} className={styles.title}>
        {tab === 'home'
          ? '오늘, 나와 우리'
          : tab === 'me'
            ? topic
              ? READING_MENU[topic].title
              : '내 사주'
            : tab === 'dating'
              ? '소개'
              : tab === 'rooms'
                ? '대화'
                : '마이'}
      </h1>
      {tab === 'home' && (
        <div className="stack-lg">
          <section className={styles.today}>
            <span>
              {seoulToday()} ·{' '}
              {custom ? '선택한 출생정보의 오늘 풀이' : '가상 인물의 오늘 풀이'}
            </span>
            <h2>{day.theme}</h2>
            <p>{day.meaning}</p>
            <button className="btn" onClick={() => openTopic('day')}>
              오늘 풀이 열기
            </button>
          </section>
          <button className="btn secondary" onClick={() => choose('me')}>
            출생일·MBTI 바꾸기
          </button>
          <section className="card">
            <h2>
              {progress.hasConnection
                ? '이어가던 소개가 있어요'
                : '만날 수 있는 시간부터'}
            </h2>
            <p className="muted">
              {progress.hasConnection
                ? '관심·결제·대화 상태를 이어서 확인해요.'
                : '내 소개를 만들고, 시간이 겹치는 가상 상대를 만나보세요.'}
            </p>
            <button
              className="btn secondary"
              onClick={() =>
                choose(progress.hasConnection ? 'rooms' : 'dating')
              }
            >
              {progress.hasConnection ? '연결 이어보기' : '내 소개부터 시작'}
            </button>
          </section>
          {unread > 0 && (
            <button className="btn" onClick={() => choose('rooms')}>
              새 예시 메시지 {unread}개 확인하기
            </button>
          )}
          <section>
            <h2>나를 알아가는 이야기</h2>
            <div className={styles.grid}>
              {(['temperament', 'month', 'year', 'luck'] as const).map((t) => (
                <button key={t} onClick={() => openTopic(t)}>
                  <b>{READING_MENU[t].title}</b>
                  <small>{READING_MENU[t].description}</small>
                </button>
              ))}
            </div>
          </section>
          <button className={styles.characterLink} onClick={() => choose('me')}>
            <span>나의 일주 수호신</span>
            <strong>{zodiacPersona(chart).title} ↗</strong>
            <small>일지의 동물과 일간의 오행으로 보는 모습</small>
          </button>
          <p className="muted small">
            {custom
              ? '선택한 출생정보로 계산했어요. '
              : '처음에는 가상 출생정보로 계산해요. '}
            내 사주에서 날짜와 MBTI를 바꿔 비교할 수 있어요. 사주는 자기 탐색을
            위한 참고 이야기예요.
          </p>
        </div>
      )}
      {tab === 'me' && (
        <div className="stack-lg">
          {!topic ? (
            <>
              <TrialProfileEditor
                profile={profile}
                example={SAMPLE}
                onApply={applyProfile}
              />
              <section className="card" aria-label="선택한 MBTI">
                <h2>내가 고른 MBTI</h2>
                <p>{profile.mbti ?? '아직 선택하지 않았어요.'}</p>
                <p className="muted small">
                  직접 선택한 유형이에요. 사주와 별도로 참고해요.
                </p>
              </section>
              <ZodiacCard chart={chart} example={!custom} />
              <section aria-label="풀이 주제">
                <h2>어떤 이야기가 궁금하세요?</h2>
                <div className={styles.grid}>
                  {topics.map((t) => (
                    <button key={t} onClick={() => setTopic(t)}>
                      <b>{READING_MENU[t].title}</b>
                      <small>{READING_MENU[t].description}</small>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              <button className="btn secondary" onClick={() => setTopic(null)}>
                내 사주 목록으로
              </button>
              <p className="notice small">
                {custom
                  ? '선택한 출생정보로 계산한 참고용 풀이예요.'
                  : '가상 출생정보로 계산한 참고용 풀이예요. 실제 내 결과가 아니에요.'}
              </p>
              {topic === 'temperament' ? (
                <ReadingExperience chart={chart} context={{ mode: 'natal' }}>
                  <DetailedReading report={natalNarrative(chart)} />
                  <section className="card" aria-label="선택한 MBTI">
                    <h2>내가 고른 MBTI</h2>
                    <p>{profile.mbti ?? '아직 선택하지 않았어요.'}</p>
                    <p className="muted small">
                      사주 해석과 별도로 참고하는 직접 선택한 유형이에요.
                    </p>
                  </section>
                  <section className="card">
                    <h2>{summary.headline}</h2>
                    <p>{summary.dayMasterImage}</p>
                    <ul>
                      {summary.traits.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <details>
                      <summary>해석 근거와 일상 예시</summary>
                      <ReadingDetails {...summary.details.traits} />
                    </details>
                  </section>
                  <section className="card">
                    <h2>관계에서 참고할 점</h2>
                    <ul>
                      {summary.conversationTips.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <details>
                      <summary>구체적인 대화 예시</summary>
                      <ReadingDetails {...summary.details.conversationTips} />
                    </details>
                  </section>
                </ReadingExperience>
              ) : topic === 'elements' ? (
                <ElementFlow
                  elements={chart.elements}
                  hourKnown={chart.hourKnown}
                />
              ) : (
                <PersonalReading
                  key={`${topic}-${revision}`}
                  chart={chart}
                  birth={profile.birth}
                  mode={topic}
                />
              )}
            </>
          )}
        </div>
      )}
      {/* Keep the single-person journey mounted across tabs; reset only on refresh or explicit restart. */}
      <div hidden={!guideVisible}>
        <DatingGuide
          embedded
          active={guideVisible && pageVisible}
          onProgress={updateProgress}
        />
      </div>
      {tab === 'rooms' && !progress.hasConnection && (
        <section className="card stack">
          <h2>아직 연결된 소개가 없어요</h2>
          <p>
            소개에서 관심을 보내면 여기서 연결 상태를 이어볼 수 있어요. 실제
            친구 모임은 로그인 후 이용해요.
          </p>
          <button className="btn" onClick={() => choose('dating')}>
            소개 시작하기
          </button>
          <button className="btn secondary" onClick={() => navigate('/rooms')}>
            내 계정의 친구 대화
          </button>
        </section>
      )}
      {tab === 'settings' && (
        <div className="stack-lg">
          <section className="card stack">
            <h2>지금은 테스트 프로필이에요</h2>
            <p>
              출생일·출생시간·MBTI를 바꿔 사주를 비교할 수 있어요. 선택 정보와
              별명·대화는 이 화면의 메모리에서만 쓰고 새로고침하면 초기화해요.
            </p>
            <button className="btn" onClick={() => navigate('/')}>
              회원가입·로그인
            </button>
          </section>
          <TrialProfileEditor
            profile={profile}
            example={SAMPLE}
            onApply={applyProfile}
          />
          <section className="card stack">
            <h2>연결·결제 상태</h2>
            <p>
              {progress.hasConnection
                ? '진행 중인 가상 연결을 대화 탭에서 확인하세요.'
                : '아직 진행 중인 연결이 없어요.'}
            </p>
            <p className="muted small">
              여기서는 실제 결제·환불 내역이 만들어지지 않아요.
            </p>
            <button className="btn secondary" onClick={() => choose('rooms')}>
              연결 상태 확인
            </button>
          </section>
          <section className="card">
            <h2>알림과 안전</h2>
            <details>
              <summary>새 메시지는 어떻게 확인하나요?</summary>
              <p>
                다른 탭을 보는 동안 예시 메시지가 도착하면 대화 탭과 오늘 화면에
                표시돼요. 로그인한 계정의 웹 푸시는 마이에서 직접 켤 수 있어요.
              </p>
            </details>
            <details>
              <summary>불편한 대화·금전 요구가 있다면</summary>
              <p>
                송금하지 말고 신고·차단을 이용하세요. 신원 확인은 인품이나 범죄
                무이력 보증이 아니에요.
              </p>
              <button
                className="btn secondary"
                onClick={() => navigate('/dating/lab')}
              >
                신고·차단·환불 직접 시험하기
              </button>
            </details>
          </section>
        </div>
      )}
      <Tabs current={tab} onSelect={choose} unread={unread} />
    </main>
  )
}
