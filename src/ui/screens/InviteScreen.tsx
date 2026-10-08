import { useCallback, useEffect, useState } from 'react'
import { createMyProfile, type MyProfile } from '../../lib/profile'
import { acceptInvite, previewInvite, type InvitePreview, type ShareChoice } from '../../lib/rooms'
import { CalcConsent, ServiceConsent, ShareChoices } from '../Consents'
import { EMPTY_SERVICE_CONSENT, serviceConsentReady, toConsents } from '../consent'
import { checkForm, EMPTY_FORM, placeSaveError, toBirthInput, toMbti, type FormErrors, type ProfileForm } from '../form'
import { ErrorNotice, Loading, TopBar } from '../kit'
import { messageOf } from '../messages'
import { BirthFields, MbtiPicker } from '../ProfileFields'
import { navigate } from '../router'
import { useSession } from '../useSession'

// 초대받은 사람 짧은 경로 (확정): 09 링크 → 07 로그인 → 11 동의 3묶음 → 19 통합 입력(프로필 없을 때) → 05 → 15.
// 수락 전에는 궁합을 보여주지 않는다. 로그인만으로 자동 수락하지 않는다.

type Step = 'consent' | 'form' | 'accepting'

export function InviteScreen({ token, profile }: { token: string; profile: MyProfile | null }) {
  const { refreshProfile } = useSession()
  const [preview, setPreview] = useState<InvitePreview | null | undefined>(undefined)
  const [loadError, setLoadError] = useState('')
  const [step, setStep] = useState<Step>('consent')
  const [service, setService] = useState(EMPTY_SERVICE_CONSENT)
  const [calc, setCalc] = useState(false)
  const [share, setShare] = useState<ShareChoice>({ shareMbti: false, shareSummary: false })
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [error, setError] = useState('')
  const set = (patch: Partial<ProfileForm>) => setForm((f) => ({ ...f, ...patch }))

  const load = useCallback(async () => {
    setLoadError('')
    try {
      setPreview(await previewInvite(token))
    } catch (e) {
      setLoadError(messageOf(e))
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  async function accept(returnTo: Step) {
    setError('')
    setStep('accepting')
    try {
      const roomId = await acceptInvite(token, calc, share)
      navigate(`/rooms/${roomId}`, { replace: true })
    } catch (e) {
      setError(messageOf(e))
      setStep(returnTo)
    }
  }

  async function createThenAccept() {
    const e = checkForm(form, { needMbti: true })
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setError('')
    setStep('accepting')
    try {
      await createMyProfile({ nickname: form.nickname, birth: toBirthInput(form), mbti: toMbti(form), consents: toConsents(service) })
    } catch (err) {
      const placed = placeSaveError(messageOf(err), (err as { code?: string }).code)
      if (placed.field === 'consent') {
        setStep('consent')
      } else {
        if (placed.field) setErrors({ [placed.field]: placed.message })
        else setError(placed.message)
        setStep('form')
      }
      return
    }
    // 프로필은 만들어졌다. 이후 실패하면 프로필이 있는 경로(11에서 수락만 다시)로 돌아간다.
    await refreshProfile()
    await accept('consent')
  }

  if (loadError) {
    return (
      <main className="screen">
        <TopBar title="초대" back="/" />
        <ErrorNotice message={loadError} onRetry={load} />
      </main>
    )
  }
  if (preview === undefined) return <Loading text="초대를 확인하고 있어요." />
  if (step === 'accepting') return <Loading text="궁합을 준비하고 있어요." />

  if (!preview || !preview.isValid || preview.isFull) {
    return (
      <main className="screen">
        <TopBar title="초대" back="/" />
        <div className="center">
          <p style={{ fontWeight: 700 }}>{preview?.isFull ? '이 모임은 이미 4명이 모두 모였어요' : '초대 링크가 만료되었거나 취소되었어요'}</p>
          <p className="muted">친구에게 새 링크를 요청해 주세요.</p>
          <button className="btn secondary" type="button" onClick={() => navigate('/')}>처음으로</button>
        </div>
      </main>
    )
  }

  const inviter = preview.inviterNickname ?? '친구'
  const nickname = profile?.nickname ?? form.nickname

  if (step === 'form') {
    return (
      <main className="screen">
        <TopBar title="내 정보 입력" back={() => setStep('consent')} />
        <div className="stack-lg">
          <p className="muted">정보 입력 후 {inviter}님의 초대를 수락해요. 생년월일은 친구에게 보여주지 않아요.</p>
          <BirthFields form={form} set={set} errors={errors} />
          <MbtiPicker form={form} set={set} error={errors.mbti} variant="invite" />
          <section className="card">
            <h3>확인한 내용</h3>
            <ul className="small">
              <li>궁합 계산에 내 정보 사용: 동의함</li>
              <li>친구에게 MBTI 보여주기: {share.shareMbti ? (form.mbti && form.mbti !== 'unknown' ? `보여줌 (${form.mbti})` : '보여줌 (MBTI 없음)') : '보여주지 않음'}</li>
            </ul>
            <button className="btn ghost small" type="button" onClick={() => setStep('consent')}>바꾸기</button>
          </section>
          {error && <ErrorNotice message={error} />}
          <button className="btn" type="button" onClick={createThenAccept}>정보 확인하고 초대 수락</button>
          <p className="muted small" style={{ textAlign: 'center' }}>내 프로필은 나중에 ‘내 프로필’ 탭에서 볼 수 있어요.</p>
        </div>
      </main>
    )
  }

  // 11 초대받은 화면
  const ready = calc && (profile ? true : serviceConsentReady(service))
  return (
    <main className="screen">
      <TopBar title="초대" back="/" />
      <div className="stack-lg">
        <section className="card">
          <p style={{ fontSize: 18, fontWeight: 700 }}>{inviter}님이 함께 궁합을 보고 싶어 해요.</p>
          <p className="muted small">지금 {preview.memberCount}명이 모여 있어요 (최대 4명). 수락하기 전에는 궁합을 볼 수 없어요.</p>
        </section>

        {profile ? (
          <section className="consent-group required">
            <header>
              <h2>① 서비스 이용</h2>
              <span className="badge required">확인됨</span>
            </header>
            <p className="muted small">가입할 때 약관·개인정보 동의와 나이를 확인했어요.</p>
          </section>
        ) : (
          <ServiceConsent value={service} onChange={setService} framed />
        )}
        <CalcConsent checked={calc} onChange={setCalc} numbered />
        <ShareChoices nickname={nickname} value={share} onChange={setShare} numbered />

        {error && <ErrorNotice message={error} />}
        {profile ? (
          <button className="btn" type="button" disabled={!ready} onClick={() => accept('consent')}>초대 수락</button>
        ) : (
          <button className="btn" type="button" disabled={!ready} onClick={() => setStep('form')}>동의 확인하고 정보 입력</button>
        )}
        <button className="btn ghost" type="button" onClick={() => navigate('/')}>나중에</button>
      </div>
    </main>
  )
}
