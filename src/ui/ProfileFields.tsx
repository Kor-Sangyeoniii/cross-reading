import { useId, useState } from 'react'
import { MBTI_TYPES, type FormErrors, type ProfileForm } from './form'

// 03 출생정보 · 04 MBTI 선택 · 19 통합 입력 · 정보 수정이 같이 쓰는 입력 칸.

type Set = (patch: Partial<ProfileForm>) => void

export function BirthFields({ form, set, errors }: { form: ProfileForm; set: Set; errors: FormErrors }) {
  const id = useId()
  return (
    <div className="stack-lg">
      <div className="field">
        <label htmlFor={`${id}-nick`}>닉네임</label>
        <input
          id={`${id}-nick`}
          className="input"
          value={form.nickname}
          maxLength={20}
          autoComplete="nickname"
          placeholder="친구들에게 보일 이름"
          onChange={(e) => set({ nickname: e.target.value })}
          aria-invalid={Boolean(errors.nickname)}
          aria-describedby={errors.nickname ? `${id}-nick-err` : undefined}
        />
        {errors.nickname && <p className="field-error" id={`${id}-nick-err`}>{errors.nickname}</p>}
      </div>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ fontWeight: 600, marginBottom: 6 }}>생년월일</legend>
        <div className="choices cols-2" role="radiogroup" aria-label="양력 또는 음력">
          {(['solar', 'lunar'] as const).map((c) => (
            <label className="choice" key={c}>
              <input type="radio" name={`${id}-cal`} checked={form.calendar === c} onChange={() => set({ calendar: c })} />
              {c === 'solar' ? '양력' : '음력'}
            </label>
          ))}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input className="input" inputMode="numeric" placeholder="년 (예: 1995)" aria-label="태어난 해" maxLength={4} value={form.year} onChange={(e) => set({ year: e.target.value })} aria-invalid={Boolean(errors.date)} />
          <input className="input" inputMode="numeric" placeholder="월" aria-label="태어난 달" maxLength={2} value={form.month} onChange={(e) => set({ month: e.target.value })} aria-invalid={Boolean(errors.date)} />
          <input className="input" inputMode="numeric" placeholder="일" aria-label="태어난 날" maxLength={2} value={form.day} onChange={(e) => set({ day: e.target.value })} aria-invalid={Boolean(errors.date)} />
        </div>
        {form.calendar === 'lunar' && (
          <label className="check">
            <input type="checkbox" checked={form.isLeapMonth} onChange={(e) => set({ isLeapMonth: e.target.checked })} />
            <span>윤달이에요</span>
          </label>
        )}
        {errors.date && <p className="field-error">{errors.date}</p>}
      </fieldset>

      <div className="field">
        <label htmlFor={`${id}-time`}>출생시간</label>
        <input
          id={`${id}-time`}
          className="input"
          type="time"
          value={form.timeUnknown ? '' : form.time}
          disabled={form.timeUnknown}
          onChange={(e) => set({ time: e.target.value })}
          aria-invalid={Boolean(errors.time)}
        />
        <label className="check">
          <input type="checkbox" checked={form.timeUnknown} onChange={(e) => set({ timeUnknown: e.target.checked })} />
          <span>시간을 몰라요</span>
        </label>
        {form.timeUnknown && <p className="muted">출생시간을 모르면 일부 해석이 제한될 수 있어요.</p>}
        {errors.time && <p className="field-error">{errors.time}</p>}
      </div>
    </div>
  )
}

/**
 * MBTI 16유형 + '아직 몰라요'(같은 모양의 버튼). 짧은 질문으로 유형을 정하지 않는다.
 * variant: 'onboarding'은 간이 성향 테스트 선택 카드(준비 중), 'invite'는 "궁합을 본 뒤에" 안내만 (와이어프레임 04·19).
 */
export function MbtiPicker({ form, set, error, variant }: { form: ProfileForm; set: Set; error?: string; variant: 'onboarding' | 'invite' }) {
  const id = useId()
  const [quickTest, setQuickTest] = useState(false)
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="label" style={{ fontWeight: 600, marginBottom: 6 }}>MBTI 유형</legend>
      <div className="choices cols-4" role="radiogroup" aria-label="MBTI 유형">
        {MBTI_TYPES.map((t) => (
          <label className="choice" key={t}>
            <input type="radio" name={`${id}-mbti`} checked={form.mbti === t} onChange={() => set({ mbti: t })} />
            {t}
          </label>
        ))}
        <label className="choice wide">
          <input type="radio" name={`${id}-mbti`} checked={form.mbti === 'unknown'} onChange={() => set({ mbti: 'unknown' })} />
          아직 몰라요
        </label>
      </div>
      {error && <p className="field-error">{error}</p>}

      {form.mbti === 'unknown' && variant === 'onboarding' && (
        <div className="card stack" style={{ marginTop: 8 }}>
          <p>MBTI 없이 사주만으로 볼 수 있어요.</p>
          <button className="btn secondary" type="button" onClick={() => setQuickTest(true)}>
            간이 성향 테스트 해보기 (약 10문항)
          </button>
          {quickTest && <p className="notice">준비 중인 기능이에요.</p>}
          <p className="muted small">공식 검사가 아니며, 결과는 추정 성향으로만 표시돼요.</p>
        </div>
      )}
      {form.mbti === 'unknown' && variant === 'invite' && (
        <div className="card stack" style={{ marginTop: 8 }}>
          <p>사주만으로 계속해요.</p>
          <p className="muted small">간이 성향 테스트는 궁합을 본 뒤에 해볼 수 있어요.</p>
        </div>
      )}
    </fieldset>
  )
}
