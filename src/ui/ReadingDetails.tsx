import type { CompatFact } from '../core/compat'
import { explainCompatFact } from '../core/reading'

export function ReadingDetails({ basis, example }: { basis: string; example: string }) {
  return <div className="reading-details" style={{ marginTop: 12, padding: 12, borderLeft: '3px solid #cbd5e0', background: '#f7fafc', fontSize: 14, lineHeight: 1.7 }}><p><strong>해석 근거</strong> · {basis}</p><p><strong>일상 예시</strong> · {example}</p></div>
}

/** Fallback also explains facts returned by the currently deployed, older Edge Function. */
export function CompatFactList({ facts }: { facts: CompatFact[] }) {
  return <ul>{facts.map((f) => {
    const detail = explainCompatFact(f.code)
    return <li key={f.code + f.text}><p>{f.text}</p>{detail && <ReadingDetails {...detail} />}</li>
  })}</ul>
}
