import { PracticalCompat } from './PracticalCompat'
import { useState } from 'react'
import { comparePair, type Mbti } from '../core/compat'
import { computeSaju, seoulToday, type SajuChart } from '../core/saju'
import { zodiacPersona } from '../core/zodiac'
import { MBTI_TYPES } from './form'
import styles from './LifeOverview.module.css'

export function FriendExplorer({
  chart,
  mbti,
}: {
  chart: SajuChart
  mbti: Mbti | null
}) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [unknown, setUnknown] = useState(true)
  const [friendMbti, setFriendMbti] = useState<Mbti | ''>('')
  const [consent, setConsent] = useState(false)
  const [friend, setFriend] = useState<SajuChart | null>(null)
  const [error, setError] = useState('')
  const result =
    friend && consent
      ? comparePair(
          { id: 'me', nickname: '나', chart, mbti },
          {
            id: 'friend',
            nickname: '친구',
            chart: friend,
            mbti: friendMbti || null,
          },
        )
      : null
  function changed() {
    setFriend(null)
    setError('')
  }
  function compare() {
    changed()
    if (!consent) return
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      date < '1900-01-01' ||
      date > seoulToday()
    ) {
      setError('친구의 출생일을 1900년부터 오늘 사이에서 선택해 주세요.')
      return
    }
    if (!unknown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError('시간을 입력하거나 시간 미상을 선택해 주세요.')
      return
    }
    const [year, month, day] = date.split('-').map(Number)
    const check = new Date(Date.UTC(year, month - 1, day))
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() + 1 !== month ||
      check.getUTCDate() !== day
    ) {
      setError('실제로 존재하는 날짜를 선택해 주세요.')
      return
    }
    const [hour, minute] = time.split(':').map(Number)
    try {
      setFriend(
        computeSaju({
          year,
          month,
          day,
          calendar: 'solar',
          time: unknown ? null : { hour, minute },
        }),
      )
    } catch {
      setError('출생정보를 계산하지 못했어요. 날짜와 시간을 확인해 주세요.')
    }
  }
  return (
    <details className={styles.tools}>
      <summary>궁금한 친구와 조합 확인하기</summary>
      <p>
        친구의 동의를 받은 정보만 넣어주세요. 양력·한국 시간 기준으로 비교하고
        이 화면 밖에 저장하지 않아요. 음력 생일은 양력으로 확인한 뒤 입력해
        주세요.
      </p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          compare()
        }}
      >
        <label className="field">
          친구 출생일
          <input
            className="input"
            type="date"
            min="1900-01-01"
            max={seoulToday()}
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              changed()
            }}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={unknown}
            onChange={(e) => {
              setUnknown(e.target.checked)
              changed()
            }}
          />{' '}
          친구 출생시간 미상
        </label>
        {!unknown && (
          <label className="field">
            친구 출생시간
            <input
              className="input"
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value)
                changed()
              }}
            />
          </label>
        )}
        <label className="field">
          친구가 공개한 MBTI (선택)
          <select
            className="input"
            value={friendMbti}
            onChange={(e) => {
              setFriendMbti(e.target.value as Mbti | '')
              changed()
            }}
          >
            <option value="">모름 / 비교하지 않기</option>
            {MBTI_TYPES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked)
              changed()
            }}
          />{' '}
          친구가 이 비교에 동의했어요.
        </label>
        <button className="btn" type="submit" disabled={!consent}>
          우리 조합 보기
        </button>
        <button
          className="btn secondary"
          type="button"
          onClick={() => {
            setDate('')
            setTime('')
            setUnknown(true)
            setFriendMbti('')
            setConsent(false)
            changed()
          }}
        >
          친구 정보 지우기
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {result && friend && (
        <section aria-label="친구 조합 결과" className="stack">
          <h3>
            {zodiacPersona(chart).symbol} 나 × {zodiacPersona(friend).symbol}{' '}
            친구
          </h3>
          <p>
            일간 {chart.dayMaster.label} ↔ {friend.dayMaster.label} · 일지{' '}
            {chart.pillars.day[1]} ↔ {friend.pillars.day[1]}
          </p>
          <PracticalCompat pair={result} />
          <h4>둘이 직접 물어볼 질문</h4>
          <ul>
            {result.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <p className="muted small">
            전통 사주 비교와 직접 선택한 MBTI를 각각 참고해요.
            관계·호감·상대방의 안전성을 판정하지 않아요. 실제 대화와 행동을 함께
            살펴보세요.
          </p>
        </section>
      )}
    </details>
  )
}
