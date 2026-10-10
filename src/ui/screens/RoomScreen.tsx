import { useCallback, useEffect, useRef, useState } from 'react'
import type { GroupCompat } from '../../core/compat'
import { blockUser, listMessages, MAX_MESSAGE_LENGTH, removeMessage, reportUser, sendMessage, subscribeMessages, type ChatMessage } from '../../lib/chat'
import { getRoomCompat, getRoomMembers, leaveRoom, type RoomMember } from '../../lib/rooms'
import { InviteSheet } from '../InviteSheet'
import { ErrorNotice, Loading, Sheet, TopBar } from '../kit'
import { messageOf } from '../messages'
import { navigate } from '../router'
import { useUserId } from '../useSession'
import { ElementFlow } from '../ElementFlow'
import { ChemistryCard } from '../ChemistryCard'
import styles from '../ChemistryCard.module.css'
import { CompatFactList } from '../ReadingDetails'
import { useMessageNotices } from '../notices'

// 15 소그룹 궁합 + 16 그룹 대화를 한 모임 화면의 두 탭으로. 점수 없음, 자동 전송 없음.

type Tab = 'compat' | 'chat'

export function RoomScreen({ roomId, nickname }: { roomId: string; nickname: string }) {
  const me = useUserId()
  const { unreadRooms, refresh: refreshNotices } = useMessageNotices()
  const [tab, setTab] = useState<Tab>('compat')
  const [members, setMembers] = useState<RoomMember[] | null>(null)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [menu, setMenu] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [target, setTarget] = useState<{ member: RoomMember; messageId?: number } | null>(null)
  const [hiddenSenders, setHiddenSenders] = useState<string[]>([])

  const loadMembers = useCallback(async () => {
    setError('')
    try {
      setMembers(await getRoomMembers(roomId))
    } catch (e) {
      setError(messageOf(e))
    }
  }, [roomId])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  if (error) {
    return (
      <main className="screen">
        <TopBar title="모임" back="/rooms" />
        <ErrorNotice message={error} onRetry={loadMembers} />
      </main>
    )
  }
  if (!members) return <Loading text="모임을 불러오고 있어요." />

  const others = members.filter((m) => m.userId !== me)
  const title = others.length > 0 ? others.map((m) => m.nickname).join(', ') : '우리 모임'

  return (
    <main className="screen">
      <TopBar
        title={title}
        back="/rooms"
        right={
          <button className="icon-btn" type="button" aria-label="더보기" onClick={() => setMenu(true)}>
            ⋯
          </button>
        }
      />
      <p className="muted small" style={{ marginBottom: 8 }}>
        {members.length}/4명 · {members.map((m) => (m.userId === me ? '나' : m.nickname) + (m.mbti ? ` (${m.mbti})` : '')).join(' · ')}
      </p>
      <div className="segmented" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'compat'} onClick={() => setTab('compat')}>궁합</button>
        <button type="button" role="tab" aria-label={unreadRooms.includes(roomId) ? '대화 · 새 메시지' : '대화'} aria-selected={tab === 'chat'} onClick={() => setTab('chat')}>대화{unreadRooms.includes(roomId) && <span className="badge" role="status">새 메시지</span>}</button>
      </div>

      {tab === 'compat' ? (
        <CompatTab
          roomId={roomId}
          members={members}
          me={me}
          onInvite={() => setInviting(true)}
          onAsk={(q) => {
            setDraft(q)
            setTab('chat')
          }}
        />
      ) : (
        <ChatTab
          roomId={roomId}
          me={me}
          members={members}
          draft={draft}
          setDraft={setDraft}
          hiddenSenders={hiddenSenders}
          onReport={(member, messageId) => setTarget({ member, messageId })}
        />
      )}

      {menu && (
        <RoomMenu
          others={others}
          canInvite={members.length < 4}
          onClose={() => setMenu(false)}
          onInvite={() => {
            setMenu(false)
            setInviting(true)
          }}
          onPick={(member) => {
            setMenu(false)
            setTarget({ member })
          }}
          onLeave={async () => {
            await leaveRoom(roomId, me)
            navigate('/rooms', { replace: true })
          }}
        />
      )}
      {target && (
        <SafetySheet
          me={me}
          roomId={roomId}
          member={target.member}
          messageId={target.messageId}
          onClose={() => setTarget(null)}
          onBlocked={(id) => { setHiddenSenders((h) => [...h, id]); refreshNotices() }}
        />
      )}
      {inviting && <InviteSheet nickname={nickname} roomId={roomId} onClose={() => setInviting(false)} />}
    </main>
  )
}

function CompatTab({ roomId, members, me, onInvite, onAsk }: {
  roomId: string
  members: RoomMember[]
  me: string
  onInvite: () => void
  onAsk: (q: string) => void
}) {
  const [compat, setCompat] = useState<GroupCompat | null>(null)
  const [error, setError] = useState<{ code?: string; message: string } | null>(null)
  const [pair, setPair] = useState(0)

  const load = useCallback(async () => {
    setError(null)
    setCompat(null)
    try {
      const next = await getRoomCompat(roomId)
      setCompat(next)
      setPair(Math.max(0, next.pairs.findIndex((p) => p.a === me || p.b === me)))
    } catch (e) {
      setError({ code: (e as { code?: string }).code, message: messageOf(e) })
    }
  }, [roomId, me])

  useEffect(() => {
    void load()
  }, [load])

  const name = (id: string) => (id === me ? '나' : `${members.find((m) => m.userId === id)?.nickname ?? '친구'}님`)

  if (error?.code === 'room_not_open' || (members.length < 2 && !compat)) {
    return (
      <div className="stack">
        <div className="card stack">
          <p style={{ fontWeight: 700 }}>친구들의 수락을 기다려요</p>
          <p className="muted">친구가 초대를 수락하면 궁합과 대화가 열려요. 수락하지 않은 사람의 정보는 궁합에 들어가지 않아요.</p>
        </div>
        {members.length < 4 && <button className="btn" type="button" onClick={onInvite}>친구 초대하기</button>}
      </div>
    )
  }
  if (error) return <ErrorNotice message={error.message} onRetry={load} />
  if (!compat) return <Loading text="궁합을 준비하고 있어요." />

  const p = compat.pairs[Math.min(pair, compat.pairs.length - 1)]
  if (!p) return <ErrorNotice message="아직 비교할 조합이 없어요. 잠시 후 다시 확인해 주세요." onRetry={load} />
  const matches = p.facts.filter((f) => f.kind === 'match')
  const diffs = p.facts.filter((f) => f.kind === 'difference')

  return (
    <div className="stack-lg">
      {compat.pairs.length > 1 && (
        <div className="field">
          <label htmlFor="pair">누구와 누구를 볼까요?</label>
          <select id="pair" className="input" value={pair} onChange={(e) => setPair(Number(e.target.value))}>
            {compat.pairs.map((x, i) => (
              <option key={`${x.a}-${x.b}`} value={i}>{name(x.a)} ↔ {name(x.b)}</option>
            ))}
          </select>
        </div>
      )}

      <ChemistryCard key={`${p.a}-${p.b}`} pair={p} names={[name(p.a), name(p.b)]} />
      <details className={styles.details}>
        <summary>왜 이런 조합일까? · 해석 근거 보기</summary>
        <div className="stack-lg">
          <section><h3>잘 통하는 근거</h3>{matches.length > 0 ? <CompatFactList facts={matches} /> : <p className="muted">지금 정보로는 공통점을 더 살펴봐야 해요.</p>}</section>
          <section><h3>맞춰볼 근거</h3>{diffs.length > 0 ? <CompatFactList facts={diffs} /> : <p className="muted">현재 해석에서 두드러진 차이는 없어요.</p>}</section>
        </div>
      </details>

      <section className="card stack">
        <h2>이렇게 이야기해 보세요</h2>
        {p.questions.map((q) => (
          <div key={q} className="stack" style={{ gap: 6 }}>
            <p>“{q}”</p>
            <button className="btn small secondary" type="button" onClick={() => onAsk(q)}>이 질문으로 대화 시작</button>
          </div>
        ))}
      </section>

      {[...compat.notes, ...p.notes].length > 0 && (
        <div className="notice">{Array.from(new Set([...compat.notes, ...p.notes])).map((n) => <p key={n}>{n}</p>)}</div>
      )}

      <details className={styles.details}>
        <summary>모임 전체 오행 살펴보기</summary>
        <section><h2>우리 모임 요약</h2><CompatFactList facts={compat.facts} /></section>
        <ElementFlow elements={compat.elements} />
      </details>
      <p className="muted small">{compat.disclaimer}</p>
    </div>
  )
}

type Pending = { key: string; body: string; state: 'sending' | 'failed' }

function ChatTab({ roomId, me, members, draft, setDraft, hiddenSenders, onReport }: {
  roomId: string
  me: string
  members: RoomMember[]
  draft: string
  setDraft: (v: string) => void
  hiddenSenders: string[]
  onReport: (member: RoomMember, messageId: number) => void
}) {
  const { markRoomRead, refresh } = useMessageNotices()
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)
  const [pending, setPending] = useState<Pending[]>([])
  const [error, setError] = useState('')
  const [sendError, setSendError] = useState('')
  const [pushWarning, setPushWarning] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const loadSequence = useRef(0)
  const arriving = useRef(new Map<number, ChatMessage>())
  const deleted = useRef(new Set<number>())

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current
    setError('')
    try {
      const snapshot = await listMessages(roomId)
      if (sequence !== loadSequence.current) return
      // Preserve INSERTs received while the query was in flight and remove DELETEs.
      const merged = new Map(snapshot.map((m) => [m.id, m]))
      for (const [id, message] of arriving.current) if (!deleted.current.has(id)) merged.set(id, message)
      setMessages([...merged.values()].filter((m) => !deleted.current.has(m.id)).sort((a, b) => a.id - b.id))
      arriving.current.clear()
      deleted.current.clear()
    } catch (e) {
      if (sequence === loadSequence.current) setError(messageOf(e))
    }
  }, [roomId])

  useEffect(() => {
    const sequenceRef = loadSequence
    void load()
    const unsubscribe = subscribeMessages(
      roomId,
      (m) => {
        arriving.current.set(m.id, m)
        setMessages((list) => list && !list.some((x) => x.id === m.id) ? [...list, m].sort((a, b) => a.id - b.id) : list)
      },
      {
        onDelete: (id) => { deleted.current.add(id); arriving.current.delete(id); setMessages((list) => list ? removeMessage(list, id) : list) },
        onResync: () => void load(),
      },
    )
    const onVisible = () => { if (document.visibilityState === 'visible') void load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { sequenceRef.current++; unsubscribe(); document.removeEventListener('visibilitychange', onVisible) }
  }, [roomId, load])

  useEffect(() => {
    const acknowledge = () => {
      if (document.visibilityState !== 'visible' || !messages) return
      const visibleMessages = messages.filter((m) => !hiddenSenders.includes(m.senderId))
      const latest = Math.max(0, ...visibleMessages.map((m) => m.id))
      if (latest > 0) markRoomRead(roomId, latest)
    }
    acknowledge()
    document.addEventListener('visibilitychange', acknowledge)
    return () => document.removeEventListener('visibilitychange', acknowledge)
  }, [messages, me, hiddenSenders, markRoomRead, roomId])

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages, pending])

  // 입력 내용(예: 궁합 탭에서 가져온 질문)에 맞춰 입력창 높이를 늘린다.
  useEffect(() => {
    const el = input.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight + 2, 140)}px`
  }, [draft, messages])

  async function send(body: string, key = String(Date.now())) {
    setSendError('')
    setPending((p) => [...p.filter((x) => x.key !== key), { key, body, state: 'sending' }])
    if (draft === body) setDraft('')
    try {
      await sendMessage(roomId, me, body, () => setPushWarning(true))
      setPending((p) => p.filter((x) => x.key !== key))
      void load()
      refresh()
    } catch (e) {
      setPending((p) => p.map((x) => (x.key === key ? { ...x, state: 'failed' } : x)))
      setSendError(messageOf(e))
    }
  }

  if (error) return <ErrorNotice message={error} onRetry={load} />
  if (!messages) return <Loading text="대화를 불러오고 있어요." />

  const nameOf = (id: string) => members.find((m) => m.userId === id)?.nickname ?? '나간 친구'
  const visible = messages.filter((m) => !hiddenSenders.includes(m.senderId))
  const sending = pending.some((p) => p.state === 'sending')

  return (
    <>
      {members.length < 2 && <p className="notice">친구가 들어오면 대화할 수 있어요.</p>}
      <div className="messages" aria-live="polite">
        {visible.length === 0 && pending.length === 0 && (
          <p className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>
            첫 메시지를 보내 보세요. 궁합 탭의 질문으로 시작해도 좋아요.
          </p>
        )}
        {visible.map((m) => {
          const mine = m.senderId === me
          const sender = members.find((x) => x.userId === m.senderId)
          return (
            <div key={m.id} className={`msg${mine ? ' mine' : ''}`}>
              {!mine && <p className="who">{nameOf(m.senderId)}</p>}
              <p className="bubble">{m.body}</p>
              <p className="meta">
                {new Date(m.createdAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}
                {!mine && sender && (
                  <button className="btn ghost small" type="button" style={{ minHeight: 32, padding: '0 6px', fontSize: 12 }} onClick={() => onReport(sender, m.id)}>
                    신고·차단
                  </button>
                )}
              </p>
            </div>
          )
        })}
        {pending.map((p) => (
          <div key={p.key} className="msg mine">
            <p className="bubble" style={{ opacity: 0.6 }}>{p.body}</p>
            <div className="meta">
              {p.state === 'sending' ? (
                '보내는 중…'
              ) : (
                <span className="actions">
                  보내지 못했어요
                  <button className="btn ghost small" type="button" style={{ minHeight: 32, padding: '0 6px' }} onClick={() => send(p.body, p.key)}>다시 보내기</button>
                  <button className="btn ghost small" type="button" style={{ minHeight: 32, padding: '0 6px' }} onClick={() => setPending((x) => x.filter((y) => y.key !== p.key))}>삭제</button>
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {sendError && <ErrorNotice message={sendError} />}
      {pushWarning && <p className="notice" role="status">메시지는 보냈지만 웹 푸시 요청을 확인하지 못했어요. 상대방은 앱을 열어 새 메시지를 확인할 수 있어요.</p>}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          if (draft.trim() && !sending) void send(draft)
        }}
      >
        <label className="sr-only" htmlFor="composer">메시지</label>
        <textarea
          id="composer"
          ref={input}
          className="input"
          rows={1}
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={members.length < 2 ? '친구를 기다리는 중이에요' : '메시지 입력'}
          disabled={members.length < 2}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn" type="submit" disabled={!draft.trim() || sending || members.length < 2}>보내기</button>
      </form>
    </>
  )
}

function RoomMenu({ others, canInvite, onClose, onInvite, onPick, onLeave }: {
  others: RoomMember[]
  canInvite: boolean
  onClose: () => void
  onInvite: () => void
  onPick: (m: RoomMember) => void
  onLeave: () => Promise<void>
}) {
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [error, setError] = useState('')
  return (
    <Sheet title={confirmLeave ? '이 모임을 나갈까요?' : '모임 메뉴'} onClose={onClose}>
      {confirmLeave ? (
        <div className="stack">
          <p className="muted">나가면 이 모임의 궁합과 대화를 더 볼 수 없어요. 내가 보낸 메시지는 남아 있어요.</p>
          {error && <ErrorNotice message={error} />}
          <button className="btn danger" type="button" onClick={() => onLeave().catch((e) => setError(messageOf(e)))}>나가기</button>
          <button className="btn secondary" type="button" onClick={() => setConfirmLeave(false)}>계속 대화</button>
        </div>
      ) : (
        <div className="stack">
          {canInvite && <button className="btn secondary" type="button" onClick={onInvite}>친구 더 초대하기</button>}
          {others.map((m) => (
            <button key={m.userId} className="btn secondary" type="button" onClick={() => onPick(m)}>
              {m.nickname}님 신고·차단
            </button>
          ))}
          <button className="btn secondary" type="button" style={{ color: 'var(--danger)' }} onClick={() => setConfirmLeave(true)}>모임 나가기</button>
          <button className="btn ghost" type="button" onClick={onClose}>닫기</button>
        </div>
      )}
    </Sheet>
  )
}

const REASONS = ['불쾌한 말이나 괴롭힘', '스팸·광고', '개인정보 노출', '기타']

function SafetySheet({ me, roomId, member, messageId, onClose, onBlocked }: {
  me: string
  roomId: string
  member: RoomMember
  messageId?: number
  onClose: () => void
  onBlocked: (userId: string) => void
}) {
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [done, setDone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>, message: string) {
    setBusy(true)
    setError('')
    try {
      await action()
      setDone(message)
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title={`${member.nickname}님 신고·차단`} onClose={onClose}>
      {done ? (
        <div className="stack">
          <p className="notice ok">{done}</p>
          <button className="btn" type="button" onClick={onClose}>확인</button>
        </div>
      ) : (
        <div className="stack">
          <section className="card stack">
            <h3>차단</h3>
            <p className="muted small">차단하면 이 사람의 메시지가 내 화면에서만 보이지 않아요. 상대에게 알리지 않아요.</p>
            <button
              className="btn secondary"
              type="button"
              disabled={busy}
              onClick={() => run(async () => {
                await blockUser(me, member.userId)
                onBlocked(member.userId)
              }, '차단했어요.')}
            >
              차단하기
            </button>
          </section>
          <section className="card stack">
            <h3>신고{messageId ? ' (선택한 메시지 포함)' : ''}</h3>
            <div className="choices">
              {REASONS.map((r) => (
                <label key={r} className="choice" style={{ justifyContent: 'flex-start', paddingLeft: 12 }}>
                  <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
                  {r}
                </label>
              ))}
            </div>
            <textarea className="input" rows={2} placeholder="자세한 내용 (선택)" maxLength={500} value={detail} onChange={(e) => setDetail(e.target.value)} />
            <button
              className="btn danger"
              type="button"
              disabled={busy || !reason}
              onClick={() => run(
                () => reportUser({ reporterId: me, reportedUserId: member.userId, roomId, messageId, reason: detail.trim() ? `${reason}: ${detail.trim()}` : reason }),
                '신고를 접수했어요. 처리 결과는 따로 안내하지 않을 수 있어요.',
              )}
            >
              신고하기
            </button>
          </section>
          {error && <ErrorNotice message={error} />}
          <button className="btn ghost" type="button" onClick={onClose}>닫기</button>
        </div>
      )}
    </Sheet>
  )
}
