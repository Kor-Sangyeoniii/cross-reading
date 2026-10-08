import { useState } from 'react'
import { createInvite, createRoom, inviteUrl, type ShareChoice } from '../lib/rooms'
import { CalcConsent, ShareChoices } from './Consents'
import { ErrorNotice, Sheet } from './kit'
import { navigate } from './router'
import { messageOf } from './messages'

// 08 공유·초대 패널. 새 모임을 만들 때는 계산 동의(필수)와 공개 선택을 받고, 이미 있는 모임이면 새 링크만 만든다.
// 공유 버튼을 눌렀다고 전송 완료로 보지 않는다. 공유를 취소해도 다른 화면으로 보내지 않는다.

const SHARE_TEXT = '나랑 궁합 보자 | Cross Reading — 우리의 공통점과 차이를 보고, 대화를 시작해요.'

export function InviteSheet({ nickname, roomId, onClose, onCreated }: {
  nickname: string
  /** 있으면 그 모임의 새 초대 링크, 없으면 새 모임 */
  roomId?: string
  onClose: () => void
  onCreated?: (roomId: string) => void
}) {
  const [calc, setCalc] = useState(false)
  const [share, setShare] = useState<ShareChoice>({ shareMbti: false, shareSummary: false })
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [createdRoom, setCreatedRoom] = useState('')

  async function makeLink() {
    setBusy(true)
    setError('')
    try {
      if (roomId) {
        setLink(inviteUrl(await createInvite(roomId)))
      } else {
        const r = await createRoom(share)
        setLink(inviteUrl(r.inviteToken))
        setCreatedRoom(r.roomId)
        onCreated?.(r.roomId)
      }
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  async function shareLink() {
    setStatus('')
    if (navigator.share) {
      try {
        await navigator.share({ title: '나랑 궁합 보자 | Cross Reading', text: SHARE_TEXT, url: link })
      } catch {
        // 사용자가 공유를 취소한 경우: 아무것도 하지 않는다.
      }
    } else {
      await copyLink()
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setStatus('링크를 복사했어요. 카카오톡 대화방에 붙여넣어 주세요.')
    } catch {
      setStatus('복사하지 못했어요. 아래 링크를 길게 눌러 복사해 주세요.')
    }
  }

  return (
    <Sheet title={roomId ? '친구 더 초대하기' : '나랑 궁합 보자'} onClose={onClose}>
      {!link ? (
        <div className="stack">
          <p className="muted">링크를 받은 친구가 수락하면 최대 4명까지 같은 모임에서 궁합을 보고 대화할 수 있어요.</p>
          {!roomId && (
            <>
              <ShareChoices nickname={nickname} value={share} onChange={setShare} />
              <CalcConsent checked={calc} onChange={setCalc} />
              {!calc && <p className="muted small">궁합 계산 동의가 있어야 초대할 수 있어요.</p>}
            </>
          )}
          {error && <ErrorNotice message={error} />}
          <button className="btn" type="button" disabled={busy || (!roomId && !calc)} onClick={makeLink}>
            {busy ? '링크 만드는 중…' : '초대 링크 만들기'}
          </button>
          <button className="btn ghost" type="button" onClick={onClose}>닫기</button>
        </div>
      ) : (
        <div className="stack">
          <p className="notice ok">초대 링크가 준비됐어요. 이 창을 닫으면 링크를 다시 볼 수 없지만, 모임 화면에서 새로 만들 수 있어요.</p>
          <p className="input small" style={{ userSelect: 'all', wordBreak: 'break-all', minHeight: 0 }}>{link}</p>
          <button className="btn kakao" type="button" onClick={shareLink}>카카오톡 등으로 공유</button>
          <button className="btn secondary" type="button" onClick={copyLink}>링크 복사</button>
          {status && <p className="muted" role="status">{status}</p>}
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              onClose()
              // 새 모임을 만들었으면 그 모임 화면(수락 대기 상태)으로 간다.
              if (createdRoom) navigate(`/rooms/${createdRoom}`)
            }}
          >
            {createdRoom ? '모임으로 가기' : '완료'}
          </button>
        </div>
      )}
    </Sheet>
  )
}
