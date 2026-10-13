import { useState } from 'react'
import {
  ACTIVITY_WINDOW,
  CONNECTION_PRICE,
  PAYMENT_WINDOW,
  canChat,
  connectionFor,
  createDatingDemo,
  eligible,
  matchReasons,
  messageWarnings,
  paymentLabels,
  person,
  recommendations,
  transition,
  type DatingAction,
  type PersonaId,
  type ReportReason,
} from '../../core/dating'
import { ChemistryCharacter } from '../ChemistryCharacters'
import { navigate } from '../router'
import styles from './DatingPilot.module.css'

const reportNames: Record<ReportReason, string> = {
  money: '금전·투자 권유',
  identity: '사칭·사진 도용 의심',
  harassment: '협박·불쾌한 접근',
  other: '그 밖의 문제',
}
const connectionNames = {
  interest: '관심을 전했어요',
  mutual: '서로 관심 있어요',
  waiting: '한 사람의 결제를 기다려요',
  open: '대화가 열렸어요',
  closed: '종료된 연결',
}
export function DatingPilot() {
  const [state, setState] = useState(() => createDatingDemo())
  const [actor, setActor] = useState<PersonaId>('mori')
  const [tab, setTab] = useState<
    'discover' | 'connections' | 'activity' | 'support'
  >('discover')
  const [selected, setSelected] = useState<PersonaId | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [reason, setReason] = useState<ReportReason>('money')
  const [consent, setConsent] = useState(false)
  const [tools, setTools] = useState(false)
  const [read, setRead] = useState<Record<string, number>>({})
  const me = person(state, actor)
  const target = selected ? person(state, selected) : null
  const connection = target ? connectionFor(state, actor, target.id) : undefined
  const connections = state.connections.filter((c) => c.members.includes(actor))
  const unread = state.messages.filter(
    (m) =>
      m.sender !== actor &&
      connections.some((c) => c.id === m.connectionId) &&
      m.id > (read[actor + ':' + m.connectionId] ?? 0),
  ).length
  function act(action: DatingAction, text: string) {
    try {
      const next = transition(state, action)
      setState(next)
      setError('')
      setNotice(text)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청을 완료하지 못했어요.')
      return false
    }
  }
  function open(id: PersonaId) {
    setSelected(id)
    setDraft('')
    setConsent(false)
    setNotice('')
    setError('')
    const c = connectionFor(state, actor, id)
    if (c)
      setRead({
        ...read,
        [actor + ':' + c.id]:
          state.messages[state.messages.length - 1]?.id ?? 0,
      })
    window.scrollTo(0, 0)
  }
  function switchActor(id: PersonaId) {
    setActor(id)
    setSelected(null)
    setConsent(false)
    setNotice('')
    setError('')
    setDraft('')
  }
  function showTab(next: typeof tab) {
    setTab(next)
    setSelected(null)
    setNotice('')
    setError('')
  }
  const myReports = state.reports.filter((r) => r.reporter === actor)
  const sanctions = state.reports.filter(
    (r) =>
      r.target === actor &&
      r.status === 'restricted' &&
      me.status === 'restricted',
  )
  return (
    <main className={styles.pilot}>
      <div className={styles.demoBanner}>
        <b>가상 체험</b>
        <span>가상 인물 4명 · 실제 결제·인증·전송 없음</span>
      </div>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.brand}
          onClick={() => navigate('/dating')}
        >
          cross<span>reading</span>
          <small>서로에게, 한 걸음</small>
        </button>
        <button
          type="button"
          className={styles.toolButton}
          aria-expanded={tools}
          onClick={() => setTools(!tools)}
        >
          체험 도구 {tools ? '닫기' : '열기'}
        </button>
      </header>
      <section className={styles.switcher} aria-label="가상 인물 선택">
        <p>
          지금 체험 중인 인물 <b>{me.name}</b>
        </p>
        <div>
          {state.people.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={actor === p.id}
              onClick={() => switchActor(p.id)}
            >
              <ChemistryCharacter kind={p.character} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
        <small>상대 인물로 바꾸면 관심·결제·답장을 직접 해볼 수 있어요.</small>
      </section>
      {tools && (
        <section className={styles.tools} aria-label="체험 도구">
          <h2>시간과 운영 상황 재현</h2>
          <p>
            체험 데이터는 이 화면의 메모리에만 있어요. 새로고침하면 초기화돼요.
            실제 개인정보는 입력하지 마세요.
          </p>
          <div className={styles.buttonRow}>
            <button
              type="button"
              onClick={() =>
                act(
                  { type: 'advance', milliseconds: PAYMENT_WINDOW },
                  '체험 시간을 24시간 이동했어요. 기한이 끝난 결제를 확인해 보세요.',
                )
              }
            >
              24시간 지나기
            </button>
            <button
              type="button"
              onClick={() =>
                act(
                  { type: 'advance', milliseconds: ACTIVITY_WINDOW },
                  '체험 시간을 7일 이동했어요. 활동 의사를 다시 확인해 주세요.',
                )
              }
            >
              7일 지나기
            </button>
            <button
              type="button"
              onClick={() => {
                setState(createDatingDemo())
                setSelected(null)
                setRead({})
                setConsent(false)
                setDraft('')
                setNotice('체험을 처음부터 시작해요.')
                setError('')
              }}
            >
              체험 초기화
            </button>
          </div>
          <p className={styles.tiny}>
            체험 시각{' '}
            {new Date(state.now).toLocaleString('ko-KR', {
              timeZone: 'Asia/Seoul',
            })}
          </p>
        </section>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {target ? (
        <section className={styles.detail} aria-label="소개 상세">
          <button
            type="button"
            className={styles.back}
            onClick={() => setSelected(null)}
          >
            ← 소개 목록으로
          </button>
          <div className={styles.profileHero}>
            <span className={styles.eyebrow}>
              FICTIONAL PROFILE · 가상 인물
            </span>
            <ChemistryCharacter kind={target.character} />
            <h1>
              {target.name}
              <span>{target.age}세</span>
            </h1>
            <p>{target.style}</p>
            <div className={styles.chips}>
              <span>{target.area}</span>
              <span>{target.slots.join(' · ')}</span>
            </div>
          </div>
          <section className={styles.card}>
            <h2>이런 점이 맞닿아 있어요</h2>
            <ul className={styles.reasons}>
              {matchReasons(me, target).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className={styles.tiny}>
              조건이 맞는다는 뜻이에요. 호감이나 관계의 결과를 보장하지 않아요.
            </p>
            <details>
              <summary>기질 캐릭터와 첫 대화</summary>
              <p>{target.opener}</p>
              <p className={styles.tiny}>
                캐릭터는 자기소개를 돕는 이야기예요. 사주·기질로 인품이나 안전을
                판단하지 않아요.
              </p>
            </details>
          </section>
          {!connection && (
            <button
              type="button"
              className={styles.primary}
              onClick={() =>
                act(
                  { type: 'interest', actor, target: target.id },
                  '관심을 전했어요. 상대도 관심을 보내면 다음 단계가 열려요.',
                )
              }
            >
              관심 보내기
            </button>
          )}
          {connection && (
            <section className={styles.card} aria-label="연결 상태">
              <span className={styles.eyebrow}>OUR NEXT STEP</span>
              <h2>{connectionNames[connection.status]}</h2>
              <ol className={styles.progress}>
                {['서로 관심', '반씩 결제', '대화 시작'].map((label, i) => (
                  <li
                    key={label}
                    data-done={
                      i === 0
                        ? connection.likes.length === 2
                        : i === 1
                          ? connection.status === 'open'
                          : canChat(state, connection, actor)
                    }
                  >
                    {label}
                  </li>
                ))}
              </ol>
              {connection.status === 'interest' && (
                <>
                  <p>
                    {connection.likes.includes(actor)
                      ? '상대가 결정할 시간을 기다려 주세요. 아직 결제하지 않아요.'
                      : '상대가 관심을 보냈어요. 나도 알아가 보고 싶나요?'}
                  </p>
                  {!connection.likes.includes(actor) && (
                    <button
                      type="button"
                      className={styles.primary}
                      onClick={() =>
                        act(
                          { type: 'interest', actor, target: target.id },
                          '서로의 관심이 확인됐어요. 결제 조건을 확인해 주세요.',
                        )
                      }
                    >
                      나도 관심 있어요
                    </button>
                  )}
                </>
              )}
              {['mutual', 'waiting'].includes(connection.status) && (
                <>
                  <div className={styles.price}>
                    <span>두 사람의 연결비</span>
                    <strong>각 {CONNECTION_PRICE.toLocaleString()}원</strong>
                    <small>
                      합계 6,000원 · 대화 개설 후 메시지 추가 과금 없음
                    </small>
                  </div>
                  <div className={styles.paymentPeople}>
                    <span>
                      나 · {paymentLabels[connection.payments[actor]]}
                    </span>
                    <span>
                      상대 ·{' '}
                      {connection.payments[target.id] === 'paid'
                        ? '결제 완료'
                        : '결제 전'}
                    </span>
                  </div>
                  <p>
                    {connection.expiresAt
                      ? `남은 시간 ${Math.max(0, Math.ceil((connection.expiresAt - state.now) / 3600000))}시간 · ${new Date(connection.expiresAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}까지`
                      : '첫 사람이 결제하면 24시간의 기한이 시작돼요.'}
                  </p>
                  <div className={styles.refundNote}>
                    상대가 기한 안에 결제하지 않으면
                    <br />
                    <b>먼저 낸 금액을 전액 환불해요.</b>
                  </div>
                  {connection.payments[actor] === 'unpaid' && (
                    <>
                      <label className={styles.check}>
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                        />
                        <span>
                          대화 개설 조건과 미결제·취소 시 환불 안내를
                          확인했어요. 결제가 상대의 답장·만남을 보장하지 않음을
                          이해해요.
                        </span>
                      </label>
                      <button
                        type="button"
                        className={styles.primary}
                        disabled={!consent}
                        onClick={() =>
                          act(
                            { type: 'pay', actor, target: target.id },
                            '가상 결제를 완료했어요. 실제 돈은 결제되지 않았어요.',
                          )
                        }
                      >
                        가상 3,000원 결제하기
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() =>
                      act(
                        { type: 'cancel', actor, target: target.id },
                        '연결을 취소했어요. 먼저 결제했다면 전액 환불 처리 대상으로 표시돼요.',
                      )
                    }
                  >
                    연결 취소하기
                  </button>
                </>
              )}
              {connection.status === 'closed' && (
                <>
                  <p>{connection.closedReason}</p>
                  <p>
                    <b>내 결제: {paymentLabels[connection.payments[actor]]}</b>
                  </p>
                  {['refund_pending', 'refund_failed'].includes(
                    connection.payments[actor],
                  ) && (
                    <>
                      <p className={styles.tiny}>
                        취소 요청과 실제 환불 완료는 달라요. 아래는 결과를
                        재현하는 체험 버튼이에요.
                      </p>
                      <div className={styles.buttonRow}>
                        <button
                          type="button"
                          onClick={() =>
                            act(
                              {
                                type: 'refund',
                                connectionId: connection.id,
                                actor,
                                outcome: 'success',
                              },
                              '가상 환불 완료를 확인했어요.',
                            )
                          }
                        >
                          가상 환불 완료 확인
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            act(
                              {
                                type: 'refund',
                                connectionId: connection.id,
                                actor,
                                outcome: 'failure',
                              },
                              '가상 환불이 실패했어요. 재처리가 필요해요.',
                            )
                          }
                        >
                          환불 실패 재현
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
              {canChat(state, connection, actor) && (
                <div
                  className={styles.chat}
                  role="region"
                  aria-label="서로의 대화"
                >
                  <p className={styles.chatNotice}>
                    대화가 열렸어요. 처음에는 앱 안에서 천천히 알아가요.
                  </p>
                  <button
                    className={styles.secondary}
                    type="button"
                    onClick={() => setDraft(target.opener)}
                  >
                    첫 질문 가져오기
                  </button>
                  <div
                    className={styles.messages}
                    role="log"
                    aria-label="메시지 목록"
                  >
                    {state.messages
                      .filter((m) => m.connectionId === connection.id)
                      .map((m) => (
                        <div
                          key={m.id}
                          className={
                            m.sender === actor ? styles.mine : styles.theirs
                          }
                        >
                          <small>{person(state, m.sender).name}</small>
                          <p>{m.body}</p>
                          {messageWarnings(m.body).map((w) => (
                            <aside key={w}>{w}</aside>
                          ))}
                        </div>
                      ))}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (
                        act(
                          {
                            type: 'message',
                            actor,
                            target: target.id,
                            body: draft,
                          },
                          '가상 대화에 메시지를 남겼어요.',
                        )
                      )
                        setDraft('')
                    }}
                  >
                    <label htmlFor="dating-message">메시지</label>
                    <textarea
                      id="dating-message"
                      value={draft}
                      maxLength={1000}
                      placeholder="실제 연락처·개인정보는 쓰지 마세요"
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <button
                      type="submit"
                      className={styles.primary}
                      disabled={!draft.trim()}
                    >
                      보내기
                    </button>
                  </form>
                </div>
              )}
            </section>
          )}
          {connection && (
            <details className={styles.card}>
              <summary>불편한 일이 있나요? 신고·차단</summary>
              <label className={styles.label}>
                신고 사유
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReportReason)}
                >
                  {Object.entries(reportNames).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={styles.secondary}
                onClick={() =>
                  act(
                    { type: 'report', actor, target: target.id, reason },
                    '가상 신고를 접수했어요. 신고만으로 상대가 자동 제재되지는 않아요.',
                  )
                }
              >
                신고 접수하기
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() =>
                  act(
                    { type: 'block', actor, target: target.id },
                    '이 상대와의 소개·대화를 차단했어요.',
                  )
                }
              >
                이 상대 차단하기
              </button>
              <p className={styles.tiny}>
                급박한 신체 위험은 112로 신고해 주세요. 앱의 답변을 기다리지
                마세요.
              </p>
            </details>
          )}
        </section>
      ) : (
        <>
          {tab === 'discover' && (
            <>
              <section className={styles.hero}>
                <span className={styles.eyebrow}>
                  LESS SWIPING, MORE MEETING
                </span>
                <h1>
                  만날 수 있는 거리,
                  <br />
                  마음이 겹치는 시간.
                </h1>
                <p>
                  서로 알아가고 싶을 때,
                  <br />
                  같이 한 걸음 내딛는 소개.
                </p>
                <div className={styles.heroArt}>
                  <ChemistryCharacter kind="sprout" />
                  <span>✦</span>
                  <ChemistryCharacter kind="flame" />
                </div>
                <div className={styles.heroFooter}>
                  <span>서로 관심 확인</span>
                  <span>비용은 절반씩</span>
                  <span>미결제 시 환불</span>
                </div>
              </section>
              <div className={styles.sectionHeading}>
                <h2>오늘, 알아가 볼 사람</h2>
                <span>조건이 맞는 소개</span>
              </div>
              {!eligible(state, actor) && (
                <section className={styles.empty}>
                  <h2>지금은 소개를 쉬고 있어요</h2>
                  <p>
                    {me.status === 'restricted'
                      ? '운영 검토 중이에요. 지원에서 조치와 이의제기를 확인해 주세요.'
                      : '새로운 소개를 받을 준비가 됐다면 활동 의사를 확인해 주세요.'}
                  </p>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() =>
                      showTab(
                        me.status === 'restricted' ? 'support' : 'activity',
                      )
                    }
                  >
                    {me.status === 'restricted'
                      ? '지원 확인'
                      : '활동 의사 확인'}
                  </button>
                </section>
              )}
              {recommendations(state, actor).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={styles.personCard}
                  onClick={() => open(p.id)}
                >
                  <div className={styles.portrait}>
                    <ChemistryCharacter kind={p.character} />
                    <span>가상 인물</span>
                  </div>
                  <div>
                    <h3>
                      {p.name} <small>{p.age}세</small>
                    </h3>
                    <p>{p.style}</p>
                    <span className={styles.matchLine}>
                      {matchReasons(me, p)[1]}
                    </span>
                    <b>소개 자세히 보기 ↗</b>
                  </div>
                </button>
              ))}
              {eligible(state, actor) &&
                recommendations(state, actor).length === 0 && (
                  <section className={styles.empty}>
                    <h2>조건이 맞는 소개를 기다리고 있어요</h2>
                    <p>
                      활동 중인 상대와 일정이 맞을 때 소개해요. 대기 중에는
                      결제하지 않아요.
                    </p>
                  </section>
                )}
              <p className={styles.footnote}>
                성인·본인·사진 확인은 실제 출시 전에 필요해요. 지금 보이는
                인물과 확인 상태는 체험용 설정이에요.
              </p>
            </>
          )}
          {tab === 'connections' && (
            <>
              <div className={styles.sectionHeading}>
                <h1>서로의 한 걸음</h1>
                <span>내 관심 · 연결 · 환불</span>
              </div>
              {connections.length === 0 ? (
                <section className={styles.empty}>
                  <ChemistryCharacter kind="cloud" />
                  <h2>아직 건넨 인사가 없어요</h2>
                  <p>소개에서 알아가고 싶은 사람에게 관심을 보내보세요.</p>
                  <button
                    className={styles.primary}
                    type="button"
                    onClick={() => showTab('discover')}
                  >
                    소개 보러 가기
                  </button>
                </section>
              ) : (
                connections.map((c) => {
                  const p = person(state, c.members.find((id) => id !== actor)!)
                  const fresh = state.messages.filter(
                    (m) =>
                      m.connectionId === c.id &&
                      m.sender !== actor &&
                      m.id > (read[actor + ':' + c.id] ?? 0),
                  ).length
                  return (
                    <button
                      type="button"
                      key={c.id}
                      className={styles.connectionCard}
                      onClick={() => open(p.id)}
                    >
                      <ChemistryCharacter kind={p.character} />
                      <div>
                        <h2>
                          {p.name}
                          {fresh > 0 && (
                            <span className={styles.unread}>
                              새 메시지 {fresh}
                            </span>
                          )}
                        </h2>
                        <p>{connectionNames[c.status]}</p>
                        <small>
                          내 결제 · {paymentLabels[c.payments[actor]]}
                        </small>
                      </div>
                      <span>→</span>
                    </button>
                  )
                })
              )}
            </>
          )}
          {tab === 'activity' && (
            <>
              <section className={styles.profileHero}>
                <ChemistryCharacter kind={me.character} />
                <h1>{me.name}의 소개</h1>
                <p>{me.style}</p>
                <div className={styles.chips}>
                  <span>{me.area}</span>
                  <span>{me.intent}</span>
                </div>
              </section>
              <section className={styles.card}>
                <h2>내가 만날 수 있는 시간</h2>
                <div className={styles.chips}>
                  {me.slots.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
                <p className={styles.tiny}>
                  상대에게는 넓은 생활권과 가능한 시간대를 보여줘요. 정확한
                  위치와 연락처는 공개하지 않아요.
                </p>
              </section>
              <section className={styles.card}>
                <h2>
                  {eligible(state, actor)
                    ? '소개를 받을 준비가 됐어요'
                    : '소개 노출을 쉬고 있어요'}
                </h2>
                <p>
                  7일마다 소개 의사를 다시 확인해요. 답이 없으면 추천에서 잠시
                  숨겨져요. 계정·환불·신고는 계속 확인할 수 있어요.
                </p>
                <button
                  className={styles.primary}
                  type="button"
                  disabled={me.status === 'restricted'}
                  onClick={() =>
                    act(
                      { type: 'activity', actor, active: true },
                      '새로운 소개를 받을 의사를 확인했어요.',
                    )
                  }
                >
                  이번 주 소개 받을게요
                </button>
                <button
                  className={styles.secondary}
                  type="button"
                  disabled={me.status === 'restricted'}
                  onClick={() =>
                    act(
                      { type: 'activity', actor, active: false },
                      '소개 노출을 잠시 멈췄어요. 기존 대화·환불·지원은 이용할 수 있어요.',
                    )
                  }
                >
                  잠시 쉬기
                </button>
              </section>
            </>
          )}
          {tab === 'support' && (
            <>
              <h1>안심하고 알아가기</h1>
              <section className={styles.card}>
                <h2>돈을 보내달라고 하나요?</h2>
                <p>
                  투자·대출·급한 사정을 이유로 송금을 요구하면 멈추고 확인해
                  주세요. 인증 배지가 있어도 금전 거래를 권하지 않아요.
                </p>
                <ul className={styles.reasons}>
                  <li>신고는 운영자가 내용을 확인해요.</li>
                  <li>확인된 위반에는 소개·대화 제한을 적용해요.</li>
                  <li>단순 거절·미결제는 제재 사유가 아니에요.</li>
                  <li>사주·성향으로 범죄나 인품을 판단하지 않아요.</li>
                </ul>
                <p className={styles.tiny}>
                  위험을 모두 막을 수는 없어요. 급박한 위험에는 112에
                  신고하세요.
                </p>
              </section>
              <section className={styles.card}>
                <h2>내 신고 처리</h2>
                {myReports.length === 0 ? (
                  <p>접수한 신고가 없어요.</p>
                ) : (
                  myReports.map((r) => (
                    <p key={r.id}>
                      {reportNames[r.reason]} ·{' '}
                      {r.status === 'pending' ? '검토 대기' : '검토 완료'}
                    </p>
                  ))
                )}
              </section>
              {sanctions.map((r) => (
                <section key={r.id} className={styles.card}>
                  <h2>소개 제한 안내</h2>
                  <p>
                    {reportNames[r.reason]} 관련 운영 조치가 있어요. 사실과
                    다르면 이의제기를 요청해 주세요.
                  </p>
                  <button
                    className={styles.secondary}
                    type="button"
                    disabled={r.appeal}
                    onClick={() =>
                      act(
                        { type: 'appeal', actor, reportId: r.id },
                        '가상 이의제기를 접수했어요. 검토 후 안내해요.',
                      )
                    }
                  >
                    {r.appeal ? '이의제기 검토 중' : '이의제기 요청'}
                  </button>
                </section>
              ))}
              <details className={styles.tools}>
                <summary>가상 운영자 검토 체험</summary>
                <p>
                  체험 데이터에만 적용돼요. 실제 서비스에서는 권한이 있는
                  운영자만 근거를 확인하고 조치해요.
                </p>
                {state.reports.length === 0 && (
                  <p>접수된 가상 신고가 없어요.</p>
                )}
                {state.reports.map((r) => (
                  <div key={r.id} className={styles.review}>
                    <b>
                      가상 신고 #{r.id} · {reportNames[r.reason]}
                    </b>
                    <p>
                      대상 {person(state, r.target).name} ·{' '}
                      {r.status === 'pending'
                        ? '검토 대기'
                        : r.status === 'dismissed'
                          ? '위반 확인 안 됨'
                          : '소개 제한'}
                      {r.appeal ? ' · 이의제기 접수' : ''}
                    </p>
                    {r.status === 'pending' && (
                      <div className={styles.buttonRow}>
                        <button
                          type="button"
                          onClick={() =>
                            act(
                              {
                                type: 'review',
                                reportId: r.id,
                                decision: 'dismissed',
                              },
                              '위반을 확인하지 못해 조치 없이 검토를 마쳤어요.',
                            )
                          }
                        >
                          조치 없이 종결
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            act(
                              {
                                type: 'review',
                                reportId: r.id,
                                decision: 'restricted',
                              },
                              '위반이 확인된 상황을 재현해 소개·대화를 제한했어요.',
                            )
                          }
                        >
                          위반 확인·제한 재현
                        </button>
                      </div>
                    )}
                    {r.appeal &&
                      person(state, r.target).status === 'restricted' && (
                        <button
                          className={styles.secondary}
                          type="button"
                          onClick={() =>
                            act(
                              { type: 'restore', actor: r.target },
                              '재검토 후 제한을 해제했어요. 본인이 활동 의사를 확인하면 소개에 복귀해요.',
                            )
                          }
                        >
                          재검토 후 제한 해제
                        </button>
                      )}
                  </div>
                ))}
              </details>
            </>
          )}
        </>
      )}
      <nav className={styles.nav} aria-label="소개팅 메뉴">
        {(
          [
            ['discover', '✦', '소개'],
            ['connections', '♡', '연결'],
            ['activity', '◉', '내 소개'],
            ['support', '◇', '지원'],
          ] as const
        ).map(([key, icon, label]) => (
          <button
            type="button"
            key={key}
            aria-current={tab === key && !selected ? 'page' : undefined}
            onClick={() => showTab(key)}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
            {key === 'connections' && unread > 0 && (
              <i aria-label={`새 메시지 ${unread}개`}>{unread}</i>
            )}
          </button>
        ))}
      </nav>
    </main>
  )
}
