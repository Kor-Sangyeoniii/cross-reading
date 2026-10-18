import { replySuggestions } from '../core/conversation'
import styles from './LifeOverview.module.css'

export function ReplySuggestions({
  body,
  onChoose,
}: {
  body: string
  onChoose: (text: string) => void
}) {
  const result = replySuggestions(body)
  if (!result) return null
  return (
    <details className={styles.reply}>
      <summary>이 메시지에 답변 추천</summary>
      <p className="muted small">
        기기 안 규칙 기반 제안 · AI 생성 아님. 선택하면 초안에만 들어가요.
        문맥에 맞게 고쳐서 보내세요.
      </p>
      <b>{result.topic}</b>
      <p>{result.reason}</p>
      {result.replies.map((reply) => (
        <button
          type="button"
          className="btn secondary small"
          key={reply}
          onClick={() => onChoose(reply)}
        >
          {reply}
        </button>
      ))}
    </details>
  )
}
