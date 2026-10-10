import { useEffect, useState, type CSSProperties } from 'react'
import type { PairCompat } from '../core/compat'
import { chemistryStory, CHARACTER_PROFILES } from '../core/chemistry'
import { chemistryShareFile, sendOrSaveChemistry } from '../lib/chemistryShare'
import { ChemistryCharacter, ChemistryDuo } from './ChemistryCharacters'
import { Sheet } from './kit'
import styles from './ChemistryCard.module.css'

function ResultArt({ pair, names }: { pair: PairCompat; names?: [string, string] }) {
  const story = chemistryStory(pair)
  return <div className={styles.hero} style={{ '--story-color': story.color } as CSSProperties}>
    <p className={styles.eyebrow}>OUR CHEMISTRY · 우리 둘의 조합</p>
    <h2>{story.title}</h2><p className={styles.subtitle}>{story.subtitle}</p>
    <div className={styles.duo}><ChemistryDuo kinds={story.characters} /></div>
    <span className={styles.tag}>{story.tag}</span>
    {names && <p className={styles.pair}><span>{names[0]}</span><span>×</span><span>{names[1]}</span></p>}
  </div>
}
export function ChemistryCard({ pair, names }: { pair: PairCompat; names: [string, string] }) {
  const story = chemistryStory(pair)
  const [sharing, setSharing] = useState(false)
  return <section aria-label="한눈에 보는 우리 궁합">
    <ResultArt pair={pair} names={names} />
    <div className={styles.signals}>
      <div className={styles.signal}><h3>✦ 잘 통하는 포인트</h3><strong>{story.matches[0]?.title ?? '우리의 공통점은 알아가는 중'}</strong><p>{story.matches[0]?.tip ?? '지금 정보만으로 공통점을 정하기 어려워요. 좋아하는 것부터 하나씩 물어보세요.'}</p>{story.matches[0] && <small>{story.matches[0].source}에서 찾은 대화 힌트</small>}</div>
      <div className={`${styles.signal} ${styles.difference}`}><h3>↔ 맞춰볼 포인트</h3><strong>{story.differences[0]?.title ?? '눈에 띄는 차이는 아직 없어요'}</strong><p>{story.differences[0]?.tip ?? '차이가 없다는 판정은 아니에요. 서로의 생활 방식을 더 알아봐요.'}</p>{story.differences[0] && <small>{story.differences[0].source}에서 찾은 대화 힌트</small>}</div>
    </div>
    <button className={`btn ${styles.share}`} type="button" onClick={() => setSharing(true)}>우리 조합 카드 공유하기 ↗</button>
    <p className={styles.note}>캐릭터는 관계의 비유예요. 사주·공개한 MBTI를 참고하며 관계를 판정하지 않아요.</p>
    {sharing && <ChemistryShareSheet pair={pair} onClose={() => setSharing(false)} />}
  </section>
}
function ChemistryShareSheet({ pair, onClose }: { pair: PairCompat; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    let url = ''
    chemistryShareFile(pair).then((f) => { if (active) { setFile(f);url = URL.createObjectURL(f);setPreview(url) } }).catch(() => { if (active) setStatus('카드를 준비하지 못했어요. 창을 닫고 다시 시도해 주세요.') })
    return () => { active = false;if (url) URL.revokeObjectURL(url) }
  }, [pair])
  async function share() {
    if (!file || busy) return
    setBusy(true);setStatus('')
    try {
      const result = await sendOrSaveChemistry(file, pair)
      if (result === 'downloaded') setStatus('카드를 저장했어요. 원하는 대화방이나 스토리에 올려보세요.')
      if (result === 'shared') setStatus('공유 요청을 완료했어요.')
    } catch { setStatus('공유하지 못했어요. 잠시 후 다시 시도해 주세요.') }
    finally { setBusy(false) }
  }
  return <Sheet title="공유할 우리 조합" onClose={onClose}><div className="stack">
    {preview ? <img src={preview} alt="공유할 익명 궁합 카드" style={{ width: '100%', maxHeight: 380, objectFit: 'contain' }} /> : <p role="status">공유 카드를 준비하고 있어요.</p>}<p className="muted small">잘 통하는 점과 맞춰볼 점이 담긴 이미지 카드예요. 이름·생년월일·모임 링크는 넣지 않아요.</p>
    <button className="btn" type="button" disabled={!file || busy} onClick={share}>{busy ? '공유하는 중…' : file ? '이미지 공유 또는 저장' : '카드 준비 중…'}</button>
    {status && <p role="status" className="notice">{status}</p>}<button className="btn ghost" type="button" onClick={onClose}>닫기</button>
  </div></Sheet>
}
export function PersonalCharacter({ element }: { element: string }) {
  const profile = CHARACTER_PROFILES[element]
  if (!profile) return null
  return <section className={styles.mini} aria-label="내 사주 캐릭터"><ChemistryCharacter kind={profile.kind} /><div><p className={styles.eyebrow}>MY CHARACTER</p><h2>{profile.name}</h2><p>{profile.line}</p><p className={styles.note}>일간 오행을 그린 참고용 캐릭터</p></div></section>
}
export function BrandCharacters({ invited = false }: { invited?: boolean }) {
  return <div className={styles.brand}><h1>Cross Reading</h1><h2>너랑 나,<br />무슨 조합일까?</h2><div className={styles.duo}><ChemistryDuo kinds={['sprout', 'star']} /></div><p>{invited ? '친구가 우리 조합을 기다리고 있어요.' : '통하는 순간도, 다른 박자도.'}<br />우리의 궁합을 캐릭터로 만나봐요.</p></div>
}
