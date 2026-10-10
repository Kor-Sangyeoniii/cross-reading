import { READING_MENU } from './readingCatalog'
import { ChemistryCharacter } from './ChemistryCharacters'
import { navigate, type ReadingTopic } from './router'
import styles from './ReadingHome.module.css'


export function ReadingMenu({ topics }: { topics: ReadingTopic[] }) {
  return <div className={styles.grid}>
    {topics.map((topic) => {
      const item = READING_MENU[topic]
      return <button key={topic} type="button" className={styles.tile} style={{ background: item.color }} onClick={() => navigate(`/readings/${topic}`)}>
        <span className={styles.tileArt} aria-hidden="true"><ChemistryCharacter kind={item.character} /></span>
        <strong>{item.title}<span aria-hidden="true"> ↗</span></strong><span>{item.description}</span>
      </button>
    })}
  </div>
}
