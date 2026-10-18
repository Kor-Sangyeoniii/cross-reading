import { useEffect, useRef, useState } from 'react'
import {
  conversationStats,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_CHARS,
  parseConversation,
  type ConversationMessage,
} from '../core/conversation'
import { ReplySuggestions } from './ReplySuggestions'
import styles from './LifeOverview.module.css'

const EXAMPLE =
  '[나][오후 6:10] 오늘 하루 어땠어?\n[친구][오후 6:12] 오늘 일이 많아서 조금 지쳤어.\n[나][오후 6:13] 고생했어. 쉬고 이야기해도 괜찮아.\n[친구][오후 6:15] 고마워. 주말에 시간 돼?'
export function ConversationLab({
  messages: supplied,
  me,
  onDraft,
  names,
}: {
  messages?: ConversationMessage[]
  me?: string
  onDraft?: (text: string) => void
  names?: Record<string, string>
}) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<{
    messages: ConversationMessage[]
    skipped: number
  } | null>(null)
  const [own, setOwn] = useState('')
  const [selected, setSelected] = useState('')
  const [draft, setDraft] = useState('')
  const [draftSource, setDraftSource] = useState('')
  const [error, setError] = useState('')
  const [consent, setConsent] = useState(false)
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const sequence = useRef(0)
  useEffect(
    () => () => {
      sequence.current++
    },
    [],
  )
  const messages = supplied ?? parsed?.messages ?? []
  const stats = conversationStats(messages)
  const ownId = me ?? own
  const incoming = ownId ? messages.filter((m) => m.sender !== ownId) : []
  const target =
    incoming.find((m) => m.id === selected) ??
    (selected ? undefined : incoming[incoming.length - 1])
  const sourceKey = target ? `${target.id}|${target.body}` : ''
  const activeDraft = draftSource === sourceKey ? draft : ''
  function editDraft(value: string) {
    setDraft(value)
    setDraftSource(sourceKey)
  }
  function clear() {
    sequence.current++
    setText('')
    setParsed(null)
    setOwn('')
    setSelected('')
    setDraft('')
    setDraftSource('')
    setError('')
    setConsent(false)
    setShown(false)
    setBusy(false)
  }
  function changed(value: string) {
    sequence.current++
    setText(value)
    setParsed(null)
    setOwn('')
    setSelected('')
    setDraft('')
    setDraftSource('')
    setError('')
    setShown(false)
    setBusy(false)
  }
  async function load(file?: File) {
    if (!file) return
    changed('')
    if (file.size > MAX_IMPORT_BYTES || !/\.txt$/i.test(file.name)) {
      setError('300KB 이하의 .txt 파일을 선택해 주세요.')
      return
    }
    const request = ++sequence.current
    setBusy(true)
    try {
      const value = new TextDecoder('utf-8', { fatal: true }).decode(
        await file.arrayBuffer(),
      )
      if (request !== sequence.current) return
      if (value.length > MAX_IMPORT_CHARS) {
        setError('10만 자 이내로 나눠 주세요.')
        return
      }
      changed(value)
    } catch {
      if (request === sequence.current)
        setError(
          'UTF-8 텍스트 파일을 읽지 못했어요. 필요한 대화를 붙여넣어 주세요.',
        )
    } finally {
      if (request === sequence.current) setBusy(false)
    }
  }
  function analyze() {
    if (!consent) return
    setError('')
    setSelected('')
    setDraft('')
    setDraftSource('')
    setOwn('')
    try {
      if (!supplied) setParsed(parseConversation(text))
      setShown(true)
    } catch (e) {
      setParsed(null)
      setShown(false)
      setError((e as Error).message)
    }
  }
  return (
    <section className={styles.tools} aria-label="대화 분석 도구">
      <h2>우리 대화, 어떻게 이어가면 좋을까?</h2>
      <p>
        {supplied
          ? '내가 볼 수 있는 이 방의 메시지만 살펴봐요.'
          : '카카오톡에서 내보낸 대화 텍스트를 선택하거나 붙여넣어 보세요. 카카오 계정에 접속하지 않아요.'}{' '}
        분석은 기기 안에서 실행하며 원문을 별도로 저장하거나 외부 AI에 보내지
        않아요.
      </p>
      {!supplied && (
        <>
          <details>
            <summary>불러오는 방법·지원 형식</summary>
            <p>
              카카오톡의 대화 내용 내보내기에서 텍스트 파일을 준비해요. 메뉴
              위치는 기기·버전에 따라 달라요. UTF-8 .txt, 300KB·10만 자·메시지
              2,000개·참여자 20명 이내를 지원해요. 사진·음성·첨부파일 자체는
              분석하지 않아요.
            </p>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {
                '[이름] [오후 6:10] 내용\n2026년 10월 18일 오후 6:10, 이름 : 내용'
              }
            </pre>
            <p>
              표시되는 참여자와 메시지를 확인하세요. 다른 형식이나 복사 과정에서
              형식이 바뀐 대화는 인식하지 못할 수 있어요.
            </p>
          </details>
          <label className="field">
            카카오톡 텍스트 파일
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={(e) => {
                void load(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          <label className="field">
            대화 텍스트
            <textarea
              className="input"
              rows={5}
              maxLength={MAX_IMPORT_CHARS}
              value={text}
              onChange={(e) => changed(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn secondary"
            onClick={() => changed(EXAMPLE)}
          >
            가상 대화로 사용해보기
          </button>
        </>
      )}
      <label>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked)
            if (!e.target.checked) {
              setShown(false)
              setParsed(null)
              setDraft('')
              setDraftSource('')
              setSelected('')
              setOwn('')
            }
          }}
        />{' '}
        참여자의 동의를 받은 대화이며, 필요한 내용만 사용합니다.
      </label>
      <button
        className="btn"
        type="button"
        disabled={
          !consent || busy || !(supplied ? messages.length : text.trim())
        }
        onClick={analyze}
      >
        {busy ? '파일 읽는 중…' : '대화 살펴보기'}
      </button>
      {error && <p role="alert">{error}</p>}
      {shown && consent && (
        <div className="stack">
          <h3>선택한 대화에서 확인한 것</h3>
          <p>
            {messages.length}개 메시지 · {stats.length}명
            {parsed ? ` · 제외한 안내/첨부 줄 ${parsed.skipped}개` : ''}
          </p>
          {stats.map((s) => (
            <div className={styles.stats} key={s.sender}>
              <b>{s.sender === me ? '나' : (names?.[s.sender] ?? s.sender)}</b>
              <span>메시지 {s.count}개</span>
              <span>물음표 포함 {s.questions}개</span>
              <span>평균 {s.averageLength}자</span>
            </div>
          ))}
          <p className="muted small">
            양과 길이를 셌어요. 질문 수·답장량으로 호감, 인성, 거짓말이나 관계의
            안전성을 알 수는 없어요. 답장 속도·감정·의도는 판정하지 않아요.
          </p>
          {!me && (
            <label className="field">
              대화에서 나는 누구인가요?
              <select
                className="input"
                value={own}
                onChange={(e) => {
                  setOwn(e.target.value)
                  setSelected('')
                  setDraft('')
                  setDraftSource('')
                }}
              >
                <option value="">참여자를 직접 선택하세요</option>
                {stats.map((s) => (
                  <option key={s.sender}>{s.sender}</option>
                ))}
              </select>
            </label>
          )}
          {!!ownId && !incoming.length && (
            <p>상대방 메시지가 있어야 답변을 제안할 수 있어요.</p>
          )}
          {!!incoming.length && (
            <>
              <label className="field">
                답변할 메시지
                <select
                  className="input"
                  value={target?.id ?? ''}
                  onChange={(e) => {
                    setSelected(e.target.value)
                    setDraft('')
                    setDraftSource('')
                  }}
                >
                  <option value="" disabled>
                    메시지를 선택하세요
                  </option>
                  {incoming.map((m, i) => (
                    <option key={m.id} value={m.id}>
                      {i + 1}. {names?.[m.sender] ?? m.sender} ·{' '}
                      {m.body.slice(0, 50)}
                    </option>
                  ))}
                </select>
              </label>
              {target ? (
                <div key={`${target.id}-${target.body}`}>
                  <blockquote>{target.body}</blockquote>
                  <ReplySuggestions body={target.body} onChoose={editDraft} />
                </div>
              ) : (
                <p>선택한 메시지가 더 이상 없어요. 다른 메시지를 선택하세요.</p>
              )}
              <label className="field">
                내 답변 초안
                <textarea
                  className="input"
                  rows={3}
                  maxLength={1000}
                  value={activeDraft}
                  onChange={(e) => editDraft(e.target.value)}
                />
              </label>
              {onDraft && (
                <button
                  type="button"
                  className="btn secondary"
                  disabled={!activeDraft.trim() || !target}
                  onClick={() => onDraft(activeDraft)}
                >
                  채팅 입력칸에 넣기
                </button>
              )}
              <p className="muted small">
                자동으로 전송하지 않아요. 실제 마음과 사실에 맞게 고쳐서
                사용하세요. 외부 AI 생성은 아직 연결되지 않았어요.
              </p>
            </>
          )}
        </div>
      )}
      <button type="button" className="btn secondary" onClick={clear}>
        분석·입력 지우기
      </button>
    </section>
  )
}
