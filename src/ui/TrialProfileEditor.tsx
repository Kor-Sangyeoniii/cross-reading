import { useRef, useState } from 'react'
import { computeSaju, seoulToday } from '../core/saju'
import type { Mbti, MyProfile } from '../lib/profile'
import { MBTI_TYPES } from './form'
import styles from './TrialApp.module.css'

function birthDate(profile: MyProfile) {
  const { year, month, day } = profile.birth
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function birthTime(profile: MyProfile) {
  const time = profile.birth.time
  return time
    ? `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`
    : ''
}

export function TrialProfileEditor({
  profile,
  example,
  onApply,
}: {
  profile: MyProfile
  example: MyProfile
  onApply: (profile: MyProfile, custom: boolean) => void
}) {
  const [date, setDate] = useState(() => birthDate(profile))
  const [time, setTime] = useState(() => birthTime(profile))
  const [unknown, setUnknown] = useState(profile.birth.time === null)
  const [mbti, setMbti] = useState<Mbti | ''>(profile.mbti ?? '')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const dateInput = useRef<HTMLInputElement>(null)
  function changed() {
    setError('')
    setNotice('')
  }
  function apply() {
    setNotice('')
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      date < '1900-01-01' ||
      date > seoulToday()
    ) {
      setError('출생일을 1900년부터 오늘 사이의 날짜로 선택해 주세요.')
      return
    }
    if (!unknown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError('출생시간을 선택하거나 ‘시간을 몰라요’를 체크해 주세요.')
      return
    }
    if (mbti && !MBTI_TYPES.includes(mbti)) {
      setError('MBTI 유형을 다시 선택해 주세요.')
      return
    }
    const [year, month, day] = date.split('-').map(Number)
    const check = new Date(Date.UTC(year, month - 1, day))
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() + 1 !== month ||
      check.getUTCDate() !== day
    ) {
      setError('달력에 있는 날짜를 선택해 주세요.')
      return
    }
    const [hour, minute] = time.split(':').map(Number)
    const next: MyProfile = {
      nickname: profile.nickname,
      mbti: mbti || null,
      birth: {
        year,
        month,
        day,
        calendar: 'solar',
        time: unknown ? null : { hour, minute },
      },
    }
    try {
      computeSaju(next.birth)
    } catch {
      setError('선택한 출생일과 시간을 다시 확인해 주세요.')
      return
    }
    setError('')
    onApply(next, true)
    setNotice('선택한 정보로 풀이를 바꿨어요. 아래에서 확인해 보세요.')
  }
  return (
    <section
      className={`card stack ${styles.profileEditor}`}
      aria-label="테스트 프로필 설정"
    >
      <h2>출생일과 MBTI 바꿔보기</h2>
      <p className="muted small">
        출생일은 사주 계산의 기준이에요. 풀이를 보고 싶은 날짜는 일별·월간·연간
        화면에서 따로 골라요.
      </p>
      <form
        className="stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          apply()
        }}
      >
        <label className="field">
          출생일 · 양력
          <input
            className="input"
            ref={dateInput}
            type="date"
            min="1900-01-01"
            max={seoulToday()}
            required
            value={date}
            onChange={(event) => {
              setDate(event.target.value)
              changed()
            }}
          />
        </label>
        <button
          className="btn small secondary"
          type="button"
          onClick={() => {
            try {
              dateInput.current?.showPicker()
            } catch {
              dateInput.current?.focus()
            }
          }}
        >
          달력 열기
        </button>
        <label className="field">
          출생시간
          <input
            className="input"
            type="time"
            value={unknown ? '' : time}
            disabled={unknown}
            onChange={(event) => {
              setTime(event.target.value)
              changed()
            }}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={unknown}
            onChange={(event) => {
              setUnknown(event.target.checked)
              changed()
            }}
          />
          <span>시간을 몰라요</span>
        </label>
        <label className="field">
          MBTI 유형
          <select
            className="input"
            value={mbti}
            onChange={(event) => {
              setMbti(event.target.value as Mbti | '')
              changed()
            }}
          >
            <option value="">아직 몰라요 / 선택 안 함</option>
            {MBTI_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <p className="muted small">
          MBTI는 직접 고른 유형으로 별도 표시해요. 사주 계산이나 소개 순위를
          바꾸지 않아요.
        </p>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button className="btn" type="submit">
          선택한 정보로 풀이 보기
        </button>
        <button
          className="btn secondary"
          type="button"
          onClick={() => {
            setDate(birthDate(example))
            setTime(birthTime(example))
            setUnknown(example.birth.time === null)
            setMbti(example.mbti ?? '')
            setError('')
            onApply(example, false)
            setNotice('처음 예시로 돌아왔어요.')
          }}
        >
          예시값으로 되돌리기
        </button>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
      </form>
      <p className="muted small">
        ‘선택한 정보로 풀이 보기’를 눌러야 반영돼요. 이 화면에서만 사용하며
        서버·브라우저 저장소에 저장하지 않아요. 새로고침하면 초기화돼요.
      </p>
    </section>
  )
}
