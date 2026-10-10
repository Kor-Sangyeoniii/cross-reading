import { useId } from 'react'
import type { ShareChoice } from '../lib/rooms'
import type { ServiceConsentState } from './consent'

// 동의 묶음 (와이어프레임 02·08·11). 모든 체크는 기본 해제. 서비스 동의 · 궁합 계산 동의 · 공개 선택은 서로 대신하지 않는다.
// 프로필 요약 공개는 다른 사람 요약을 서버에서 만들어 줄 수단이 아직 없어 화면에서 뺐다(shareSummary는 항상 false).
// 실제 약관 문구·보관 기간은 미정이라 '자세히 보기'에는 자리만 둔다.

export function ServiceConsent({ value, onChange, framed }: { value: ServiceConsentState; onChange: (v: ServiceConsentState) => void; framed?: boolean }) {
  const id = useId()
  const set = (patch: Partial<ServiceConsentState>) => onChange({ ...value, ...patch })
  const body = (
    <div className="stack">
      <div>
        <p style={{ fontWeight: 600, marginBottom: 6 }}>나이 확인</p>
        <div className="choices cols-2" role="radiogroup" aria-label="나이 확인">
          <label className="choice">
            <input type="radio" name={`${id}-age`} checked={value.age === 'over14'} onChange={() => set({ age: 'over14' })} />
            만 14세 이상
          </label>
          <label className="choice">
            <input type="radio" name={`${id}-age`} checked={value.age === 'under14'} onChange={() => set({ age: 'under14' })} />
            만 14세 미만
          </label>
        </div>
        {value.age === 'under14' && (
          <p className="notice error" style={{ marginTop: 8 }}>
            만 14세 미만은 보호자 동의 절차 확인이 필요해요. 지금은 이용할 수 없어요.
          </p>
        )}
      </div>
      <div>
        <label className="check">
          <input type="checkbox" checked={value.terms} onChange={(e) => set({ terms: e.target.checked })} />
          <span><span className="badge required">필수</span> 서비스 이용약관 동의</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={value.privacy} onChange={(e) => set({ privacy: e.target.checked })} />
          <span><span className="badge required">필수</span> 개인정보 수집·이용 동의</span>
        </label>
        <details>
          <summary>자세히 보기</summary>
          <p className="muted small">
            수집 항목: 이메일(계정 로그인 방식에 따라), 닉네임, 생년월일(양력/음력), 출생시간(선택), MBTI(선택). 목적: 계정 식별·가입 확인·비밀번호 재설정, 내 프로필 해석과 친구 궁합 계산.
            보관 기간과 자세한 약관은 정식 출시 전에 안내할 예정이에요.
          </p>
        </details>
        <label className="check">
          <input type="checkbox" checked={value.marketing} onChange={(e) => set({ marketing: e.target.checked })} />
          <span><span className="badge">선택</span> 소식·혜택 받기 (안 해도 이용할 수 있어요)</span>
        </label>
      </div>
    </div>
  )
  if (!framed) return body
  return (
    <section className="consent-group required" aria-labelledby={`${id}-h`}>
      <header>
        <h2 id={`${id}-h`}>① 서비스 이용</h2>
        <span className="badge required">필수</span>
      </header>
      <p className="muted small" style={{ marginBottom: 8 }}>서비스를 이용하기 위한 약관·개인정보 안내와 나이를 확인해요.</p>
      {body}
    </section>
  )
}

export function CalcConsent({ checked, onChange, numbered }: { checked: boolean; onChange: (v: boolean) => void; numbered?: boolean }) {
  const id = useId()
  return (
    <section className="consent-group required" aria-labelledby={`${id}-h`}>
      <header>
        <h2 id={`${id}-h`}>{numbered ? '② ' : ''}궁합 계산</h2>
        <span className="badge required">필수</span>
      </header>
      <p className="muted small">내 정보를 친구들과의 궁합 해석에 사용하도록 허용해요.</p>
      <p className="notice" style={{ margin: '8px 0' }}>궁합 결과에는 내 정보에서 나온 해석이 포함돼요.</p>
      <label className="check">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>내 정보를 그룹 궁합 계산에 사용하는 데 동의해요</span>
      </label>
    </section>
  )
}

export function ShareChoices({ nickname, value, onChange, numbered }: { nickname: string; value: ShareChoice; onChange: (v: ShareChoice) => void; numbered?: boolean }) {
  const id = useId()
  return (
    <section className="consent-group" aria-labelledby={`${id}-h`}>
      <header>
        <h2 id={`${id}-h`}>{numbered ? '③ ' : ''}친구에게 보여줄 내 정보</h2>
        <span className="badge">선택</span>
      </header>
      <p className="muted small">궁합 해석과 별개로, 내 MBTI 유형을 보여줄지 골라요. 생년월일·출생시간은 보여주지 않아요.</p>
      <p style={{ margin: '8px 0 0' }}>{nickname ? <>닉네임 <strong>{nickname}</strong>은</> : '닉네임은'} 모임 친구들에게 항상 보여요.</p>
      <label className="check">
        <input type="checkbox" checked={value.shareMbti} onChange={(e) => onChange({ ...value, shareMbti: e.target.checked })} />
        <span>내 MBTI 유형 보여주기</span>
      </label>
      <p className="muted small">꺼도 궁합 해석에는 내 정보가 간접적으로 반영돼요.</p>
    </section>
  )
}
