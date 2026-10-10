import { useEffect, useState } from 'react'
import { deleteMyAccount } from '../../lib/account'
import { signOut, startLogin, type LoginProvider } from '../../lib/auth'
import { updateMyProfile, type MyProfile } from '../../lib/profile'
import { currentPushSupport, currentPushState, pushConfigured, disablePush, enablePush } from '../../lib/push'
import { checkForm, fromProfile, placeSaveError, toBirthInput, toMbti, type FormErrors, type ProfileForm } from '../form'
import { ErrorNotice, Sheet, TopBar } from '../kit'
import { messageOf } from '../messages'
import { BirthFields, MbtiPicker } from '../ProfileFields'
import { navigate } from '../router'
import { useSession, useUserId } from '../useSession'

// 18 설정·안전·삭제: 정보 수정 / 알림 / 로그아웃 / 계정·데이터 삭제.
// 대화방 나가기·차단·신고는 각 모임 화면의 더보기(⋯)에서 한다.

export function SettingsScreen({ profile }: { profile: MyProfile }) {
  const { session } = useSession()
  const [sheet, setSheet] = useState<'edit' | 'delete' | null>(null)
  const provider = (session?.user.app_metadata.provider ?? 'kakao') as LoginProvider

  return (
    <main className="screen">
      <TopBar title="설정" back="/me" />
      <div className="stack">
        <button className="btn secondary" type="button" onClick={() => setSheet('edit')}>정보 수정</button>
        <PushToggle />
        <p className="muted small">친구에게 보여줄 정보(MBTI)는 모임마다 초대·수락할 때 골라요.</p>
        <button className="btn secondary" type="button" onClick={() => signOut().then(() => navigate('/', { replace: true }))}>로그아웃</button>
        <button className="btn secondary" type="button" style={{ color: 'var(--danger)' }} onClick={() => setSheet('delete')}>계정·데이터 삭제</button>
      </div>
      {sheet === 'edit' && <EditSheet profile={profile} onClose={() => setSheet(null)} />}
      {sheet === 'delete' && <DeleteSheet provider={provider} onClose={() => setSheet(null)} />}
    </main>
  )
}

function PushToggle() {
  const userId = useUserId()
  const support = currentPushSupport()
  const [on, setOn] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (support !== 'supported') return
    let alive = true
    currentPushState(userId)
      .then((state) => { if (alive) setOn(state === 'enabled') })
      .catch(() => { if (alive) { setOn(false); setMessage('알림 등록 상태를 확인하지 못했어요. 다시 켜기를 눌러 확인해 주세요.') } })
    return () => {
      alive = false
    }
  }, [support, userId])

  async function toggle() {
    setBusy(true)
    setMessage('')
    try {
      if (on) {
        await disablePush()
        setOn(false)
      } else {
        await enablePush(userId)
        setOn(true)
      }
    } catch (e) {
      setMessage(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card stack">
      <h3>새 메시지 알림</h3>
      <p className="muted small">관계 목록과 대화 탭에 새 메시지가 표시돼요. 읽음 표시는 이 기기의 현재 브라우저 탭 기준이며, 대화 탭을 열어 확인하면 사라져요.</p>
      {support === 'install_required' && <p className="muted">아이폰은 Safari 공유 버튼 → ‘홈 화면에 추가’로 설치한 뒤 알림을 켤 수 있어요.</p>}
      {support === 'unsupported' && <p className="muted">이 브라우저에서는 알림을 받을 수 없어요.</p>}
      {!pushConfigured() && <p className="notice">이 환경에는 알림 연결 설정이 없어 웹 푸시를 켤 수 없어요. 앱 안 새 메시지 표시는 사용할 수 있어요.</p>}
      {support === 'supported' && pushConfigured() && (
        <>
          <p className="muted small">알림에는 메시지 내용이 보이지 않아요. “새 메시지가 왔어요”만 표시돼요.</p>
          <button className="btn small" type="button" disabled={busy || on === null} onClick={toggle}>
            {on ? '알림 끄기' : '알림 켜기'}
          </button>
        </>
      )}
      {message && <p className="notice" role="status">{message}</p>}
    </section>
  )
}

function EditSheet({ profile, onClose }: { profile: MyProfile; onClose: () => void }) {
  const { refreshProfile } = useSession()
  const [form, setForm] = useState<ProfileForm>(() => fromProfile(profile))
  const [errors, setErrors] = useState<FormErrors>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<ProfileForm>) => setForm((f) => ({ ...f, ...patch }))

  async function save() {
    const e = checkForm(form, { needMbti: true })
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setBusy(true)
    setError('')
    try {
      await updateMyProfile({ nickname: form.nickname, birth: toBirthInput(form), mbti: toMbti(form) })
      await refreshProfile()
      onClose()
    } catch (err) {
      const placed = placeSaveError(messageOf(err), (err as { code?: string }).code)
      if (placed.field && placed.field !== 'consent') setErrors({ [placed.field]: placed.message })
      else setError(placed.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="정보 수정" onClose={onClose}>
      <div className="stack-lg">
        <BirthFields form={form} set={set} errors={errors} />
        <MbtiPicker form={form} set={set} error={errors.mbti} variant="onboarding" />
        <p className="muted small">바꾼 정보는 다음에 궁합을 볼 때부터 반영돼요.</p>
        {error && <ErrorNotice message={error} />}
        <button className="btn" type="button" disabled={busy} onClick={save}>{busy ? '저장 중…' : '저장'}</button>
        <button className="btn ghost" type="button" onClick={onClose}>취소</button>
      </div>
    </Sheet>
  )
}

function DeleteSheet({ provider, onClose }: { provider: LoginProvider; onClose: () => void }) {
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ code?: string; message: string } | null>(null)

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await deleteMyAccount()
      navigate('/', { replace: true })
    } catch (e) {
      setError({ code: (e as { code?: string }).code, message: messageOf(e) })
    } finally {
      setBusy(false)
    }
  }

  async function relogin() {
    const r = await startLogin(provider, '/settings')
    if (r.kind === 'open-external' && r.url) window.location.href = r.url
  }

  return (
    <Sheet title="계정·데이터 삭제" onClose={onClose}>
      <div className="stack">
        <div className="card">
          <p style={{ fontWeight: 700, marginBottom: 6 }}>삭제하면 되돌릴 수 없어요</p>
          <ul className="small">
            <li>내 프로필과 출생정보, MBTI</li>
            <li>내가 속한 모임에서 나가기와 내가 보낸 메시지 전체</li>
            <li>알림 설정, 차단 목록</li>
          </ul>
        </div>
        <p className="muted small">모임만 나가고 싶다면 계정 삭제 대신 모임 화면의 ‘모임 나가기’를 써 주세요.</p>
        <label className="check">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <span>위 내용을 확인했고 계정을 삭제할게요</span>
        </label>
        {error && <ErrorNotice message={error.message} />}
        {error?.code === 'reauth_required' && (
          <button className="btn secondary" type="button" onClick={relogin}>다시 로그인하기</button>
        )}
        <button className="btn danger" type="button" disabled={!checked || busy} onClick={remove}>
          {busy ? '삭제 중…' : '계정·데이터 삭제'}
        </button>
        <button className="btn ghost" type="button" onClick={onClose}>취소</button>
      </div>
    </Sheet>
  )
}
