import { useCallback, useEffect, useState } from 'react'
import { getRoomMembers, listMyRooms, type MyRoom, type RoomMember } from '../../lib/rooms'
import { InviteSheet } from '../InviteSheet'
import { ErrorNotice, Loading, Tabs, TopBar } from '../kit'
import { messageOf } from '../messages'
import { navigate } from '../router'
import { useUserId } from '../useSession'

// 12 관계 목록: 내가 속한 모임(2~4명). 카드를 누르면 15 궁합 / 16 대화가 있는 모임 화면으로.

type RoomCard = MyRoom & { members: RoomMember[] }

export function RoomsScreen({ nickname }: { nickname: string }) {
  const me = useUserId()
  const [rooms, setRooms] = useState<RoomCard[] | null>(null)
  const [error, setError] = useState('')
  const [inviting, setInviting] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const list = await listMyRooms()
      const withMembers = await Promise.all(list.map(async (r) => ({ ...r, members: await getRoomMembers(r.id) })))
      setRooms(withMembers)
    } catch (e) {
      setError(messageOf(e))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="screen with-tabs">
      <TopBar title="관계" />
      {error && <ErrorNotice message={error} onRetry={load} />}
      {!error && rooms === null && <Loading text="모임을 불러오고 있어요." />}
      {rooms && rooms.length === 0 && (
        <div className="center">
          <p style={{ fontWeight: 700 }}>아직 연결된 친구가 없어요</p>
          <p className="muted">친구를 초대하면 최대 4명이 함께 궁합을 보고 대화할 수 있어요.</p>
          <button className="btn" type="button" onClick={() => setInviting(true)}>친구 초대하기</button>
        </div>
      )}
      {rooms && rooms.length > 0 && (
        <div className="stack">
          {rooms.map((r) => {
            const others = r.members.filter((m) => m.userId !== me).map((m) => m.nickname)
            const waiting = r.memberCount < 2
            return (
              <button
                key={r.id}
                type="button"
                className="card"
                style={{ textAlign: 'left', border: 0, cursor: 'pointer', width: '100%' }}
                onClick={() => navigate(`/rooms/${r.id}`)}
              >
                <p style={{ fontWeight: 700 }}>{others.length > 0 ? `${others.join(', ')}님과 나` : '친구를 기다리는 모임'}</p>
                <p className="muted small">
                  {r.memberCount}/4명 · {waiting ? '친구의 수락을 기다리고 있어요' : '궁합 보기 · 대화하기'}
                </p>
              </button>
            )
          })}
          <button className="btn secondary" type="button" onClick={() => setInviting(true)}>새 모임 만들기</button>
        </div>
      )}
      {inviting && (
        <InviteSheet
          nickname={nickname}
          onClose={() => {
            setInviting(false)
            void load()
          }}
        />
      )}
      <Tabs current="rooms" />
    </main>
  )
}
