import { useState } from 'react'
import { createMyProfile } from '../../lib/profile'
import { ServiceConsent } from '../Consents'
import { EMPTY_SERVICE_CONSENT, serviceConsentReady, toConsents } from '../consent'
import { checkForm, EMPTY_FORM, placeSaveError, toBirthInput, toMbti, type FormErrors, type ProfileForm } from '../form'
import { ErrorNotice, Loading, TopBar } from '../kit'
import { messageOf } from '../messages'
import { BirthFields, MbtiPicker } from '../ProfileFields'
import { navigate } from '../router'
import { useSession } from '../useSession'

// 새 사용자: 02 동의·연령 → 03 출생정보 → 04 MBTI → 05 결과 준비 → 06 내 프로필.
// 앞 단계로 돌아가도 입력은 유지한다.

type Step = 'consent' | 'birth' | 'mbti' | 'saving'

export function OnboardingScreen() {
  const { refreshProfile } = useSession()
  const [step, setStep] = useState<Step>('consent')
  const [consent, setConsent] = useState(EMPTY_SERVICE_CONSENT)
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saveError, setSaveError] = useState('')
  const set = (patch: Partial<ProfileForm>) => setForm((f) => ({ ...f, ...patch }))

  function nextFromBirth() {
    const e = checkForm(form, { needMbti: false })
    setErrors(e)
    if (Object.keys(e).length === 0) setStep('mbti')
  }

  async function save() {
    const e = checkForm(form, { needMbti: true })
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setSaveError('')
    setStep('saving')
    try {
      await createMyProfile({ nickname: form.nickname, birth: toBirthInput(form), mbti: toMbti(form), consents: toConsents(consent) })
      await refreshProfile()
      navigate('/me', { replace: true })
    } catch (err) {
      // 오류가 난 칸이 있는 단계로 돌아가 그 칸 아래에 보여준다.
      const placed = placeSaveError(messageOf(err), (err as { code?: string }).code)
      if (placed.field === 'consent') setStep('consent')
      else if (placed.field && placed.field !== 'mbti') {
        setErrors({ [placed.field]: placed.message })
        setStep('birth')
      } else {
        setSaveError(placed.message)
        setStep('mbti')
      }
    }
  }

  if (step === 'saving') return <Loading text="내 프로필을 준비하고 있어요." />

  return (
    <main className="screen">
      {step === 'consent' && (
        <>
          <TopBar title="시작하기 전에" />
          <div className="stack-lg">
            <p className="muted">정보를 입력하기 전에 아래 내용을 확인해 주세요. (1/3)</p>
            <ServiceConsent value={consent} onChange={setConsent} />
            <p className="muted small">여기서 동의해도 친구 궁합 계산이나 정보 공개에 동의한 것은 아니에요. 그건 초대할 때 따로 물어봐요.</p>
            <button className="btn" type="button" disabled={!serviceConsentReady(consent)} onClick={() => setStep('birth')}>
              동의하고 입력 시작
            </button>
          </div>
        </>
      )}

      {step === 'birth' && (
        <>
          <TopBar title="출생정보" back={() => setStep('consent')} />
          <div className="stack-lg">
            <p className="muted">사주 계산에 쓰여요. 생년월일은 친구에게 보여주지 않아요. (2/3)</p>
            <BirthFields form={form} set={set} errors={errors} />
            <button className="btn" type="button" onClick={nextFromBirth}>다음</button>
          </div>
        </>
      )}

      {step === 'mbti' && (
        <>
          <TopBar title="MBTI 선택" back={() => setStep('birth')} />
          <div className="stack-lg">
            <p className="muted">알고 있는 유형을 골라 주세요. 몰라도 괜찮아요. (3/3)</p>
            <MbtiPicker form={form} set={set} error={errors.mbti} variant="onboarding" />
            {saveError && <ErrorNotice message={saveError} />}
            <button className="btn" type="button" onClick={save}>
              {form.mbti === 'unknown' ? '사주만으로 내 프로필 보기' : '내 프로필 보기'}
            </button>
          </div>
        </>
      )}
    </main>
  )
}
