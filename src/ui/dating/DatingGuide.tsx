import { ReplySuggestions } from '../ReplySuggestions'
import { useEffect, useRef, useState } from 'react'
import {
  CONNECTION_PRICE,
  PAYMENT_WINDOW,
  canChat,
  connectionFor,
  createDatingDemo,
  matchReasons,
  messageWarnings,
  person,
  recommendations,
  transition,
  type DatingAction,
  type DatingState,
  type PersonaId,
} from '../../core/dating'
import { ChemistryCharacter } from '../ChemistryCharacters'
import { navigate } from '../router'
import shared from './DatingPilot.module.css'
import styles from './DatingGuide.module.css'

const slots = ['평일 저녁', '토요일 오후', '일요일 오후']
const steps = ['내 소개', '상대 소개', '서로 연결', '대화']
export interface GuideProgress {
  hasConnection: boolean
  messageCount: number
  stage: string
}
type View = 'profile' | 'discover' | 'detail' | 'connection'

export function DatingGuide({
  embedded = false,
  active = true,
  onProgress,
}: {
  embedded?: boolean
  active?: boolean
  onProgress?: (progress: GuideProgress) => void
}) {
  const Root = embedded ? 'section' : 'main'
  const [state, setState] = useState(() => createDatingDemo())
  const [view, setView] = useState<View>('profile')
  const [actor, setActor] = useState<PersonaId>('mori')
  const [nickname, setNickname] = useState('산책러')
  const [available, setAvailable] = useState(['토요일 오후'])
  const [selected, setSelected] = useState<PersonaId | null>(null)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [sent, setSent] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const me = person(state, actor)
  const target = selected ? person(state, selected) : null
  const connection = target ? connectionFor(state, actor, target.id) : undefined
  const chatting = connection && canChat(state, connection, actor)
  const step =
    view === 'profile'
      ? 0
      : view === 'discover' || view === 'detail'
        ? 1
        : chatting
          ? 3
          : 2
  const title =
    view === 'profile'
      ? '먼저, 내 소개부터 만들어요'
      : view === 'discover'
        ? '내 시간에 맞는 사람을 만나봐요'
        : view === 'detail'
          ? '이 사람, 조금 더 궁금한가요?'
          : connection?.status === 'interest'
            ? '관심을 전했어요'
            : connection?.status === 'mutual'
              ? '서로 알아가고 싶어요'
              : connection?.status === 'waiting'
                ? '상대의 결제를 기다려요'
                : chatting
                  ? '이제 둘이 이야기할 수 있어요'
                  : '연결되지 않으면 돌려받아요'

  useEffect(() => {
    if (active) {
      heading.current?.focus()
      window.scrollTo(0, 0)
    }
  }, [view, connection?.status, active])
  const incomingCount = state.messages.filter((m) => m.sender !== actor).length
  useEffect(() => {
    onProgress?.({
      hasConnection: view === 'connection',
      messageCount: incomingCount,
      stage: connection?.status ?? 'profile',
    })
  }, [view, incomingCount, connection?.status, onProgress])
  // This local timer represents one scripted example, never a real person's action.
  // Cleanup cancels the example when changing step, restarting or leaving the route.
  useEffect(() => {
    if (
      view !== 'connection' ||
      !target ||
      !connection ||
      !['interest', 'waiting'].includes(connection.status)
    )
      return
    const status = connection.status
    const counterpart = target.id
    const timer = window.setTimeout(
      () =>
        setState((current) => {
          const c = connectionFor(current, actor, counterpart)
          if (!c || c.status !== status) return current
          const next = transition(current, {
            type: status === 'interest' ? 'interest' : 'pay',
            actor: counterpart,
            target: actor,
          })
          if (status !== 'waiting') return next
          return transition(next, {
            type: 'message',
            actor: counterpart,
            target: actor,
            body: '안녕하세요! 같은 시간에 여유가 있네요. 편하게 이야기해 봐요.',
          })
        }),
      1400,
    )
    return () => window.clearTimeout(timer)
  }, [view, connection?.status, actor, target, connection])

  function apply(action: DatingAction): DatingState | null {
    try {
      const next = transition(state, action)
      setState(next)
      setError('')
      return next
    } catch (e) {
      setError(e instanceof Error ? e.message : '다시 시도해 주세요.')
      return null
    }
  }
  function restart() {
    setState(createDatingDemo())
    setView('profile')
    setSelected(null)
    setConsent(false)
    setDraft('')
    setError('')
    setSent(false)
  }
  function saveProfile() {
    if (!nickname.trim() || !available.length) return
    const next = createDatingDemo()
    const profile = person(next, actor)
    profile.name = nickname.trim()
    profile.slots = [...available]
    setState(next)
    setSelected(null)
    setView('discover')
    setError('')
  }
  function pay(refundExample = false) {
    if (!target || !consent) return
    const paid = apply({ type: 'pay', actor, target: target.id })
    if (paid && refundExample)
      setState(
        transition(paid, { type: 'advance', milliseconds: PAYMENT_WINDOW }),
      )
  }
  const guidance =
    view === 'profile'
      ? '별명과 가능한 시간을 골라 주세요. 이 정보로 누구를 소개할지 정해요.'
      : view === 'discover'
        ? '만날 수 있는 시간이 겹치는 상대예요. 카드를 눌러 소개 이유를 확인해 보세요.'
        : view === 'detail'
          ? '괜찮다면 아래의 ‘관심 보내기’를 눌러 주세요. 이때는 비용이 들지 않아요.'
          : connection?.status === 'interest'
            ? '잠시 기다려 주세요. 여기서는 가상 상대가 관심을 돌려주는 예시를 보여드려요.'
            : connection?.status === 'mutual'
              ? '양쪽 모두 관심이 있어요. 비용·환불 안내를 확인하고 내 몫을 결제하면 돼요.'
              : connection?.status === 'waiting'
                ? '나는 결제를 마쳤어요. 이 예시에서는 상대도 결제를 마친 뒤 대화가 열려요.'
                : chatting
                  ? '아래에서 첫 인사를 보내보세요. 실제 이용에서는 상대가 직접 읽고 답장해요.'
                  : '상대가 24시간 안에 결제하지 않아 소개가 종료된 예시예요. 먼저 낸 금액 전액이 환불 대상이에요.'

  return (
    <Root className={`${shared.pilot} ${styles.guide}`}>
      <div className={shared.demoBanner}>
        <b>사용 순서 안내</b>
        <span>가상 상대 · 결제·인증·외부 전송 없음</span>
      </div>
      <header className={shared.header}>
        <button
          type="button"
          className={shared.brand}
          onClick={() => navigate('/dating')}
        >
          cross<span>reading</span>
          <small>서로에게, 한 걸음</small>
        </button>
        <button type="button" className={shared.toolButton} onClick={restart}>
          처음부터
        </button>
      </header>
      <ol className={styles.steps} aria-label="이용 순서">
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={step === i ? 'step' : undefined}
            data-complete={i < step}
          >
            <span>{i < step ? '✓' : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <header className={styles.heading}>
        <p>
          STEP {step + 1} · {steps[step]}
        </p>
        <h1 ref={heading} tabIndex={-1}>
          {title}
        </h1>
      </header>
      <aside className={styles.next} aria-label="지금 할 일">
        <b>지금은 이렇게 해보세요</b>
        <p>{guidance}</p>
      </aside>
      {error && (
        <p className={shared.error} role="alert">
          {error}
        </p>
      )}
      {view === 'profile' && (
        <form
          className={shared.card}
          onSubmit={(e) => {
            e.preventDefault()
            saveProfile()
          }}
        >
          <label className={styles.field}>
            체험에 쓸 별명
            <input
              required
              maxLength={12}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoComplete="off"
            />
          </label>
          <fieldset className={styles.fieldset}>
            <legend>어떤 소개를 볼까요?</legend>
            <div className={styles.choices}>
              {(
                [
                  ['mori', '남성 소개 보기'],
                  ['tao', '여성 소개 보기'],
                ] as const
              ).map(([id, label]) => (
                <label key={id}>
                  <input
                    type="radio"
                    name="guide-persona"
                    value={id}
                    checked={actor === id}
                    onChange={() => setActor(id)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className={styles.fieldset}>
            <legend>
              만날 수 있는 시간 <small>하나 이상</small>
            </legend>
            <div className={styles.choices}>
              {slots.map((slot) => (
                <label key={slot}>
                  <input
                    type="checkbox"
                    checked={available.includes(slot)}
                    onChange={(e) =>
                      setAvailable(
                        e.target.checked
                          ? [...available, slot]
                          : available.filter((s) => s !== slot),
                      )
                    }
                  />
                  {slot}
                </label>
              ))}
            </div>
          </fieldset>
          <div className={styles.summary}>
            <p>
              <span>예시 생활권</span>
              <b>서울 서북권</b>
            </p>
            <p>
              <span>관계 목적</span>
              <b>천천히 알아가는 연애</b>
            </p>
          </div>
          <p className={shared.tiny}>
            여기서는 가상 성인 프로필을 사용해요. 실명·사진·전화번호는 입력하지
            마세요. 입력은 저장·전송되지 않고 새로고침하면 초기화돼요.
          </p>
          <button
            type="submit"
            className={shared.primary}
            disabled={!nickname.trim() || !available.length}
          >
            내 조건으로 소개 받기 →
          </button>
          {!available.length && (
            <p className={shared.tiny}>
              가능한 시간을 하나 이상 선택해 주세요.
            </p>
          )}
          <details>
            <summary>실제 가입할 때는 무엇이 필요한가요?</summary>
            <p>
              계정 가입 후 성인·본인 확인과 사진 확인, 소개 참여 동의를 거쳐요.
              여기서는 사용 순서만 볼 수 있고 실제 인증은 진행하지 않아요.
            </p>
          </details>
        </form>
      )}
      {view === 'discover' && (
        <>
          <div className={styles.summary}>
            <p>
              <span>{me.name}님의 시간</span>
              <b>{me.slots.join(' · ')}</b>
            </p>
          </div>
          {recommendations(state, actor).map((p) => (
            <button
              type="button"
              key={p.id}
              className={shared.personCard}
              onClick={() => {
                setSelected(p.id)
                setView('detail')
                setConsent(false)
                setError('')
              }}
            >
              <div className={shared.portrait}>
                <ChemistryCharacter kind={p.character} />
                <span>가상 상대</span>
              </div>
              <div>
                <h2>
                  {p.name} <small>{p.age}세 · 예시</small>
                </h2>
                <p>{p.style}</p>
                <span className={shared.matchLine}>
                  {matchReasons(me, p)[1]}
                </span>
                <b>어떤 사람인지 보기 →</b>
              </div>
            </button>
          ))}
          {recommendations(state, actor).length === 0 && (
            <div className={shared.empty}>
              <h2>겹치는 시간이 있는 상대를 기다려요</h2>
              <p>조건이 맞지 않으면 억지로 소개하거나 결제하지 않아요.</p>
            </div>
          )}
          <button
            className={shared.secondary}
            type="button"
            onClick={() => setView('profile')}
          >
            내 소개 수정하기
          </button>
        </>
      )}
      {view === 'detail' && target && (
        <>
          <div className={shared.profileHero}>
            <ChemistryCharacter kind={target.character} />
            <h2>
              {target.name} <small>{target.age}세 · 가상 상대</small>
            </h2>
            <p>{target.style}</p>
          </div>
          <section className={shared.card}>
            <h2>왜 이 사람을 소개하나요?</h2>
            <ul className={shared.reasons}>
              {matchReasons(me, target).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className={shared.tiny}>
              생활 조건이 겹친다는 뜻이에요. 사주나 캐릭터로 인품·궁합을
              판정하지 않아요.
            </p>
          </section>
          <button
            type="button"
            className={shared.primary}
            onClick={() => {
              if (apply({ type: 'interest', actor, target: target.id }))
                setView('connection')
            }}
          >
            관심 보내기 · 무료
          </button>
          <button
            className={shared.secondary}
            type="button"
            onClick={() => {
              setView('discover')
              setSelected(null)
            }}
          >
            다른 소개 보기
          </button>
        </>
      )}
      {view === 'connection' && target && connection && (
        <>
          <div className={styles.pair}>
            <div>
              <ChemistryCharacter kind={me.character} />
              <b>나 · {me.name}</b>
            </div>
            <span aria-hidden="true">♡</span>
            <div>
              <ChemistryCharacter kind={target.character} />
              <b>{target.name} · 가상 상대</b>
            </div>
          </div>
          {['interest', 'waiting'].includes(connection.status) && (
            <section className={shared.card} role="status">
              <div className={styles.waiting} aria-hidden="true">
                •••
              </div>
              <p>
                {connection.status === 'interest'
                  ? '가상 상대의 관심 응답 예시를 보여드리는 중이에요.'
                  : '가상 상대의 결제 완료 예시를 보여드리는 중이에요.'}
              </p>
              <p className={shared.tiny}>
                실제로는 상대가 직접 결정해요. 관심이나 결제를 보장하지 않아요.
              </p>
            </section>
          )}
          {connection.status === 'mutual' && (
            <section className={shared.card} aria-label="연결비 안내">
              <span className={shared.eyebrow}>
                양쪽의 관심이 확인된 다음에만
              </span>
              <div className={shared.price}>
                <span>내가 낼 금액</span>
                <strong>{CONNECTION_PRICE.toLocaleString()}원</strong>
                <small>상대도 3,000원 · 두 사람 합계 6,000원</small>
              </div>
              <ol className={styles.terms}>
                <li>두 사람이 모두 결제하면 대화가 열려요.</li>
                <li>첫 결제 후 24시간 내 상대 미결제 시 전액 환불해요.</li>
                <li>대화가 열리면 메시지 추가 과금은 없어요.</li>
              </ol>
              <p className={shared.tiny}>
                가격·시간은 제안 중인 예시예요. 결제가 답장이나 만남을 보장하지
                않아요.
              </p>
              <label className={shared.check}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>연결 조건과 미결제 시 전액 환불 안내를 확인했어요.</span>
              </label>
              <button
                className={shared.primary}
                type="button"
                disabled={!consent}
                onClick={() => pay()}
              >
                내 몫 결제하고 다음으로 · 실제 0원
              </button>
              <p className={styles.explanation}>
                이 버튼은 가상 결제예요. 카드 입력이나 돈이 나가는 일은 없어요.
              </p>
              <details className={styles.alternative}>
                <summary>상대가 결제하지 않으면 어떻게 되나요?</summary>
                <p>
                  내 결제 뒤 24시간이 지난 상황을 보여드려요. 위 환불 안내를
                  확인한 뒤 선택해 주세요.
                </p>
                <button
                  className={shared.secondary}
                  type="button"
                  disabled={!consent}
                  onClick={() => pay(true)}
                >
                  미결제·환불 순서 보기
                </button>
              </details>
            </section>
          )}
          {connection.status === 'closed' && (
            <section className={shared.card} aria-label="환불 안내">
              <span className={styles.exampleLabel}>가상 시간 24시간 경과</span>
              <h2>
                {connection.payments[actor] === 'refunded'
                  ? '3,000원 전액 환불 완료 예시'
                  : '3,000원 전액 환불 처리 중'}
              </h2>
              <p>
                상대는 결제하지 않았어요. 대화는 열리지 않고 내가 먼저 낸 금액만
                환불돼요.
              </p>
              <p className={shared.tiny}>
                실제 결제에서는 취소 요청과 입금 완료가 다를 수 있어요. 완료될
                때까지 진행 상태를 보여줘야 해요. 여기서는 실제 거래가 없어요.
              </p>
              {connection.payments[actor] !== 'refunded' ? (
                <button
                  className={shared.primary}
                  type="button"
                  onClick={() =>
                    apply({
                      type: 'refund',
                      actor,
                      connectionId: connection.id,
                      outcome: 'success',
                    })
                  }
                >
                  환불 완료 상태 보기
                </button>
              ) : (
                <button
                  className={shared.primary}
                  type="button"
                  onClick={restart}
                >
                  이제 대화 연결 순서도 보기
                </button>
              )}
            </section>
          )}
          {chatting && (
            <section className={shared.card} aria-label="대화 시작">
              <span className={styles.exampleLabel}>
                상대 메시지는 미리 작성한 가상 예시예요
              </span>
              <div
                className={shared.messages}
                role="log"
                aria-label="안내 대화"
              >
                {state.messages
                  .filter((m) => m.connectionId === connection.id)
                  .map((m) => (
                    <div
                      key={m.id}
                      className={
                        m.sender === actor ? shared.mine : shared.theirs
                      }
                    >
                      <small>
                        {m.sender === actor
                          ? '나'
                          : `${target.name} · 예시 메시지`}
                      </small>
                      <p>{m.body}</p>
                      {m.sender !== actor && (
                        <ReplySuggestions body={m.body} onChoose={setDraft} />
                      )}
                      {messageWarnings(m.body).map((w) => (
                        <aside key={w}>{w}</aside>
                      ))}
                    </div>
                  ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const next = apply({
                    type: 'message',
                    actor,
                    target: target.id,
                    body: draft,
                  })
                  if (next) {
                    setDraft('')
                    setSent(true)
                  }
                }}
              >
                <label className={styles.field}>
                  첫 인사
                  <textarea
                    value={draft}
                    maxLength={1000}
                    placeholder="가벼운 인사를 적어보세요"
                    onChange={(e) => setDraft(e.target.value)}
                  />
                </label>
                <button
                  className={shared.secondary}
                  type="button"
                  onClick={() =>
                    setDraft('안녕하세요! 주말에는 보통 무엇을 하세요?')
                  }
                >
                  예시 인사 넣기
                </button>
                <button
                  className={shared.primary}
                  type="submit"
                  disabled={!draft.trim()}
                >
                  인사 보내보기
                </button>
              </form>
              <p className={shared.tiny}>
                이 대화는 화면 안에서만 보여요. 실제 연락처나 개인정보는 쓰지
                마세요.
              </p>
              {sent && (
                <aside className={styles.complete} role="status">
                  <b>사용 순서를 모두 따라왔어요.</b>
                  <p>
                    내 소개 → 상대 확인 → 서로 관심 → 양쪽 결제 → 대화. 실제
                    서비스에서는 여기서 상대와 대화하며 만날지 결정해요.
                  </p>
                </aside>
              )}
              <details className={styles.alternative}>
                <summary>대화가 불편하거나 돈을 요구하면?</summary>
                <p>
                  대화 화면에서 차단·신고를 이용해요. 송금하지 말고 확인해
                  주세요. 아래 ‘직접 시험하기’에서 신고·차단 순서도 볼 수
                  있어요.
                </p>
              </details>
            </section>
          )}
        </>
      )}
      <footer className={styles.footer}>
        <details>
          <summary>직접 시험하거나 기존 기능을 보고 싶어요</summary>
          <button
            className={shared.secondary}
            type="button"
            onClick={() => navigate('/dating/lab')}
          >
            여러 인물로 직접 시험하기
          </button>
          <button
            className={shared.secondary}
            type="button"
            onClick={() => navigate('/')}
          >
            개인 운세·기존 친구 대화로
          </button>
        </details>
      </footer>
    </Root>
  )
}
