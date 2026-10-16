import { useId, useState } from 'react'
import type { ReadingChapter, ReadingReport } from '../core/readingNarrative'
import styles from './DetailedReading.module.css'

/** Use inside an already expanded term: all paragraphs are readable without another click. */
export function ReadingChapters({ chapters }: { chapters: ReadingChapter[] }) {
  return (
    <div className={styles.chapters}>
      {chapters.map((chapter) => (
        <section key={chapter.title}>
          <h4>{chapter.title}</h4>
          {chapter.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  )
}

export function DetailedReading({ report }: { report: ReadingReport }) {
  const id = useId()
  const [expansion, setExpansion] = useState<'first' | 'all' | 'none'>('first')
  return (
    <section className={styles.report} aria-labelledby={`${id}-title`}>
      <header>
        <span className={styles.label}>근거를 따라 읽는 상세 풀이</span>
        <h2 id={`${id}-title`}>{report.title}</h2>
        {report.lead.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </header>
      <div className={styles.toolbar}>
        <p>첫 설명부터 읽거나, 궁금한 제목을 눌러보세요.</p>
        <button
          type="button"
          className="btn secondary small"
          onClick={() => setExpansion(expansion === 'all' ? 'none' : 'all')}
        >
          {expansion === 'all' ? '설명 모두 접기' : '전체 풀이 펼치기'}
        </button>
      </div>
      <div className={styles.sections}>
        {report.chapters.map((chapter, i) => (
          <details
            key={`${expansion}-${chapter.title}`}
            open={expansion === 'all' || (expansion === 'first' && i === 0)}
          >
            <summary>{chapter.title}</summary>
            <div>
              {chapter.paragraphs.map((text, j) => (
                <p key={j}>{text}</p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
