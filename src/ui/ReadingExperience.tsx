import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type { SajuChart } from '../core/saju'
import {
  LIFE_SCENES,
  readingStory,
  type LifeScene,
  type StoryContext,
} from '../core/readingStory'
import { zodiacPersona } from '../core/zodiac'
import { withBase } from '../lib/basePath'
import styles from './ReadingExperience.module.css'

const STEPS = ['만나기', '생활 장면', '내 선택', '이야기 풀이', '작은 실천']
function Guide({
  chart,
  small = false,
}: {
  chart: SajuChart
  small?: boolean
}) {
  const guardian = zodiacPersona(chart)
  return (
    <div
      className={`${styles.guide} ${small ? styles.smallGuide : ''}`}
      style={{ '--guardian-color': guardian.form.color } as CSSProperties}
    >
      <span className={styles.halo} aria-hidden="true" />
      {guardian.fireMonkey ? (
        <img
          src={withBase('/characters/fire-monkey.png')}
          alt={`${guardian.title} 이야기 안내 캐릭터`}
        />
      ) : (
        <span
          className={styles.animal}
          role="img"
          aria-label={`${guardian.title} 이야기 안내 캐릭터`}
        >
          {guardian.symbol}
        </span>
      )}
      <span className={styles.spark} aria-hidden="true">
        ✦
      </span>
    </div>
  )
}
function StoryReader({
  chart,
  context,
  onFull,
}: {
  chart: SajuChart
  context: StoryContext
  onFull: () => void
}) {
  const [scene, setScene] = useState<LifeScene>('work')
  const [step, setStep] = useState(0)
  const [choice, setChoice] = useState<number | null>(null)
  const [picked, setPicked] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const guardian = zodiacPersona(chart)
  const story = readingStory(chart, context, scene)
  function go(next: number) {
    setStep(next)
    // Focus after React commits the new panel; no auto-advance or timed text.
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }))
  }
  const reset = () => {
    setChoice(null)
    setPicked(false)
    go(0)
  }
  const chooseScene = (next: LifeScene) => {
    setScene(next)
    setChoice(null)
    setPicked(false)
    go(0)
  }
  if (!story)
    return (
      <section className={styles.empty} aria-label="이야기 준비">
        <Guide chart={chart} />
        <h2>이야기를 열 준비를 해볼까요?</h2>
        <p>
          먼저 위에서 살펴볼 날짜와 긴 흐름의 계산 기준을 골라주세요. 확인되지
          않은 운으로 이야기를 만들지는 않아요.
        </p>
      </section>
    )
  const activeChoice = choice === null ? null : story.choices[choice]
  const place = LIFE_SCENES.find((s) => s.id === scene)!
  return (
    <section className={styles.story} aria-label="내 사주 이야기">
      <header className={styles.header}>
        <span>READING QUEST · {story.frame.title}</span>
        <h2>나를 알아가는 작은 모험</h2>
        <p>
          {context.label ? `${context.label} · ` : ''}
          {guardian.title}와 한 장면씩 읽어봐요.
        </p>
      </header>
      <div className={styles.scenePicker} aria-label="생활 장면 고르기">
        {LIFE_SCENES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={scene === item.id}
            disabled={
              context.mode === 'natal' && item.id === 'plan' && !chart.hourKnown
            }
            onClick={() => chooseScene(item.id)}
          >
            <span aria-hidden="true">{item.symbol}</span>
            {item.label}
          </button>
        ))}
      </div>
      {!chart.hourKnown && context.mode === 'natal' && (
        <p className={styles.hint}>
          태어난 시간을 몰라 ‘앞으로의 계획’ 장면은 비워뒀어요. 다른 두 장면부터
          볼 수 있어요.
        </p>
      )}
      <ol className={styles.steps} aria-label="이야기 순서">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={step === i ? 'step' : undefined}>
            <span aria-hidden="true">{i < step ? '✓' : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {story.note && <p className={styles.hint}>{story.note}</p>}
      <div className={styles.panel} data-scene={scene} data-step={step}>
        <p className={styles.sceneLabel}>
          <span aria-hidden="true">{place.symbol}</span> {place.place} ·{' '}
          {story.frame.time}
        </p>
        <h3 ref={heading} tabIndex={-1} className={styles.sceneTitle}>
          {step === 0
            ? story.title
            : step === 1
              ? '이런 순간, 있지 않나요?'
              : step === 2
                ? '그 선택 다음에는'
                : step === 3
                  ? '내 사주와 연결해 읽어보면'
                  : '이번에 해볼 작은 한 가지'}
        </h3>
        {step === 0 && (
          <>
            <div className={styles.meeting}>
              <Guide chart={chart} />
              <div className={styles.speech}>
                <b>{guardian.title}</b>
                <p>안녕! 어려운 이름부터 외울 필요 없어.</p>
                <p>{story.invitation}</p>
              </div>
            </div>
            <p className={styles.narrator}>
              {story.frame.invitation} 장면과 대사는 이해를 돕는 예시예요.
            </p>
            <button className={styles.primary} onClick={() => go(1)}>
              이야기 시작하기 <span aria-hidden="true">→</span>
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <div className={styles.comic}>
              <div className={styles.comicFrame}>
                <div className={styles.backdrop} aria-hidden="true">
                  <span>
                    {scene === 'work'
                      ? '📋'
                      : scene === 'relationship'
                        ? '☕'
                        : '📚'}
                  </span>
                  <i>✦</i>
                </div>
                <p className={styles.caption}>어느 익숙한 순간</p>
                <div className={styles.dialogue}>
                  <span>장면 속의 나</span>
                  <p>{story.setting}</p>
                </div>
              </div>
              <div className={`${styles.comicFrame} ${styles.guideFrame}`}>
                <Guide chart={chart} small />
                <div className={styles.dialogue}>
                  <span>{guardian.title}</span>
                  <p>지금 너라면, 어떤 말부터 꺼내고 싶어?</p>
                  <small>둘 다 가능한 선택이야. 정답은 없어.</small>
                </div>
              </div>
            </div>
            <div className={styles.choices} aria-label="장면 속 선택">
              {story.choices.map((item, i) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setChoice(i)
                    setPicked(false)
                    go(2)
                  }}
                >
                  <span aria-hidden="true">{i === 0 ? 'A' : 'B'}</span>
                  {item.label}
                  <b aria-hidden="true">↗</b>
                </button>
              ))}
            </div>
            <p className={styles.hint}>
              선택은 이야기를 바꿔요. 사주 계산이나 성격 판정에는 쓰지 않아요.
            </p>
          </>
        )}
        {step === 2 && activeChoice && (
          <>
            <div className={styles.myChoice}>
              <span>내가 고른 말</span>
              <p>“{activeChoice.label}”</p>
            </div>
            <div className={styles.meeting}>
              <Guide chart={chart} small />
              <div className={styles.speech}>
                <b>{guardian.title}</b>
                <p>{activeChoice.reply}</p>
              </div>
            </div>
            <div className={styles.script}>
              <span>이렇게 말해볼 수도 있어요</span>
              <p>{activeChoice.next}</p>
            </div>
            <p className={styles.narrator}>
              어떤 선택이 더 좋은 사람을 뜻하지는 않아요. 지금의 상황과 마음에
              맞는 말을 찾아보는 거예요.
            </p>
            <button className={styles.primary} onClick={() => go(3)}>
              왜 이런 이야기인지 알아보기 →
            </button>
          </>
        )}
        {step === 3 && (
          <>
            <div className={styles.meeting}>
              <Guide chart={chart} small />
              <div className={styles.speech}>
                <b>이 장면의 핵심</b>
                <p>{story.lens}</p>
              </div>
            </div>
            <section
              className={styles.explanation}
              aria-label="쉬운 이야기 풀이"
            >
              <h4>실제 생활에서는 이렇게</h4>
              <p>{story.depth}</p>
              <p>
                앞에서 고른 말은 이 관점을 연습해 보는 한 가지 방법이에요. 실제
                경험이 다르다면 내 상황에 맞게 바꿔도 괜찮아요.
              </p>
            </section>
            <details className={styles.evidence}>
              <summary>내 사주의 어떤 부분에서 나온 이야기인가요?</summary>
              <p>{story.personal}</p>
              <p>{story.basis}</p>
              <p>
                신살·다른 기둥까지 함께 읽는 긴 설명과 원국표는 ‘자세한
                풀이·만세력’에서 볼 수 있어요.
              </p>
            </details>
            <button className={styles.primary} onClick={() => go(4)}>
              나에게 맞는 한 걸음 고르기 →
            </button>
          </>
        )}
        {step === 4 && (
          <>
            <div className={styles.questCard}>
              <span aria-hidden="true">🌿</span>
              <h4>작은 실천 카드</h4>
              <p>{story.mission}</p>
              <button
                className={styles.primary}
                aria-pressed={picked}
                onClick={() => setPicked(!picked)}
              >
                {picked
                  ? '이번에 해볼 일로 골랐어요 ✓'
                  : '내가 해볼 일로 고르기'}
              </button>
              {picked && (
                <p role="status">
                  잘 맞는 때에 한 번 해보세요. 고르지 않거나 나중에 해도
                  괜찮아요.
                </p>
              )}
            </div>
            <div className={styles.next}>
              <button onClick={onFull}>근거와 긴 해설 이어 읽기 →</button>
              <button onClick={reset}>다른 선택으로 다시 보기 ↺</button>
            </div>
          </>
        )}
        {step > 0 && (
          <button className={styles.back} onClick={() => go(step - 1)}>
            ← 이전 장면
          </button>
        )}
      </div>
      <p className={styles.footnote}>
        캐릭터와 상황은 이해를 돕는 창작 표현이에요. 미래에 일어날 사건을
        예고하거나 내 성격을 확정하지 않아요.
      </p>
    </section>
  )
}
export function ReadingExperience({
  chart,
  context,
  children,
}: {
  chart: SajuChart
  context: StoryContext
  children: ReactNode
}) {
  const [view, setView] = useState<'story' | 'full'>('story')
  const id = useId()
  const key = [
    chart.pillars.year,
    chart.pillars.month,
    chart.pillars.day,
    chart.pillars.hour,
    context.mode,
    context.label,
    context.reading?.label,
  ].join('|')
  return (
    <section className={styles.experience} aria-label="풀이 읽는 방법">
      <div className={styles.views}>
        <button
          aria-pressed={view === 'story'}
          aria-controls={`${id}-story`}
          onClick={() => setView('story')}
        >
          이야기로 보기
        </button>
        <button
          aria-pressed={view === 'full'}
          aria-controls={`${id}-full`}
          onClick={() => setView('full')}
        >
          자세한 풀이·만세력
        </button>
      </div>
      <div id={`${id}-story`} hidden={view !== 'story'}>
        <StoryReader
          key={key}
          chart={chart}
          context={context}
          onFull={() => setView('full')}
        />
      </div>
      <div id={`${id}-full`} hidden={view !== 'full'}>
        {view === 'full' && <div className="stack-lg">{children}</div>}
      </div>
    </section>
  )
}
