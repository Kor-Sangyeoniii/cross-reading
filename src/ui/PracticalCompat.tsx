import type { PairCompat } from '../core/compat'
import { practicalCompat } from '../core/practicalCompat'
import styles from './PracticalCompat.module.css'

export function PracticalCompat({ pair }: { pair: PairCompat }) {
  const report = practicalCompat(pair)
  return (
    <section className={styles.report} aria-label="현실적인 조합 해설">
      <header>
        <span className={styles.eyebrow}>
          좋은 점 · 부딪히는 점 · 풀어가는 법
        </span>
        <h2>그래서, 우리는 어떻게 잘 지낼까?</h2>
        <p>
          아래 장면은 비교 근거를 생활에 연결한 예시예요. 실제 두 사람에게
          있었던 일이라는 뜻은 아니에요. 해당하는 장면을 골라 지금의 행동과
          비교해 보세요.
        </p>
      </header>
      {!!pair.notes.length && (
        <aside className={styles.notes}>
          {[...new Set(pair.notes)].map((note) => (
            <p key={note}>{note}</p>
          ))}
        </aside>
      )}
      <div className={styles.overview}>
        <section>
          <h3>활용하면 좋은 부분</h3>
          {report.strengths.length ? (
            <ul>
              {report.strengths.map((card) => (
                <li key={card.key}>{card.title}</li>
              ))}
            </ul>
          ) : (
            <p>
              현재 규칙에서 공통점 근거가 나오지 않았어요. 잘 맞는 부분이 없다는
              뜻은 아니므로 실제 편했던 경험부터 확인해요.
            </p>
          )}
        </section>
        <section>
          <h3>먼저 조율할 부분</h3>
          {report.adjustments.length ? (
            <ul>
              {report.adjustments.map((card) => (
                <li key={card.key}>{card.title}</li>
              ))}
            </ul>
          ) : (
            <p>
              현재 규칙에서 차이 근거가 나오지 않았어요. 갈등이 없다는 판정은
              아니에요. 아래 장점도 일방적인 양보로 유지하고 있지는 않은지
              살펴봐요.
            </p>
          )}
        </section>
      </div>
      {!!report.cards.length && (
        <p className={styles.hint}>
          차이로 나온 항목부터 보여줘요. 심각도 순위는 아니에요. 좋은 점을
          살리는 조건과 나쁘게 작용하는 행동을 함께 읽어보세요.
        </p>
      )}
      {report.cards.map((card, index) => (
        <article
          className={styles.card}
          key={`${pair.a}|${pair.b}|${card.key}|${card.bases.join('|')}`}
        >
          <span className={styles.tag}>
            {card.source} ·{' '}
            {card.kind === 'difference'
              ? '차이에서 출발한 해설'
              : '공통·보완점에서 출발한 해설'}
          </span>
          <h3>{card.title}</h3>
          <div className={styles.good}>
            <h4>좋은 점</h4>
            <p>{card.good}</p>
          </div>
          <div className={styles.bad}>
            <h4>이렇게 되면 나빠요</h4>
            <p>{card.bad}</p>
          </div>
          <details className={styles.scene} open={index === 0}>
            <summary>실제 생활 예시와 파훼법</summary>
            <h4>이런 장면이라면</h4>
            <p>{card.scene}</p>
            <div className={styles.words}>
              <div>
                <b>갈등을 키우는 말</b>
                <p>{card.worse}</p>
              </div>
              <div>
                <b>이렇게 바꿔 말해요</b>
                <p>{card.better}</p>
              </div>
            </div>
            <h4>둘이 해볼 순서</h4>
            <ol>
              {card.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <h4>해봐도 나아지지 않는다면</h4>
            <p>{card.check}</p>
          </details>
          <details className={styles.basis}>
            <summary>이 해설이 나온 비교 근거</summary>
            {card.bases.map((basis) => (
              <p key={basis}>{basis}</p>
            ))}
            <p>
              이 근거로 생활 장면을 선택했어요. 누가 위 행동을 하는지, 실제로
              갈등이 있는지는 이 정보만으로 알 수 없어요.
            </p>
          </details>
        </article>
      ))}
      {!!report.extra.length && (
        <details className={styles.basis}>
          <summary>추가로 확인할 비교 근거</summary>
          {report.extra.map((fact, i) => (
            <p key={i}>{fact.text}</p>
          ))}
          <p>
            이 항목에는 아직 연결된 생활 해설이 없어서 임의의 장면을 붙이지
            않았어요.
          </p>
        </details>
      )}
      <footer className={styles.footer}>
        <h3>파훼법의 기준은 실제로 달라지는 행동이에요</h3>
        <p>
          둘 다 동의할 수 있는 작은 약속을 정하고 다음 만남에서 지켰는지
          확인해요. 한 사람만 계속 참거나, 상대를 바꾸려고 설득하는 것으로
          끝내지 마세요. 맞지 않는 조건은 함께할 범위를 줄이거나 관계를 다시
          생각할 이유가 될 수 있어요.
        </p>
        <p>
          사주나 MBTI가 협박·모욕·통제·원치 않는 요구를 정당화하지는 않아요.
          그런 행동이 있다면 위 대화 연습을 억지로 계속할 필요는 없어요. 내
          경계와 안전을 우선하세요.
        </p>
      </footer>
    </section>
  )
}
