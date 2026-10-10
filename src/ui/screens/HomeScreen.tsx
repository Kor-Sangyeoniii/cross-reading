import type { MyProfile } from '../../lib/profile'
import { seoulToday } from '../../core/saju'
import { ChemistryCharacter } from '../ChemistryCharacters'
import { ReadingMenu } from '../ReadingMenu'
import { TopBar, Tabs } from '../kit'
import { navigate } from '../router'
import styles from '../ReadingHome.module.css'

export function HomeScreen({ profile }: { profile: MyProfile }) {
  return <main className="screen with-tabs">
    <TopBar title="Cross Reading" right={<button className="icon-btn" aria-label="설정" type="button" onClick={() => navigate('/settings')}>⚙</button>} />
    <div className="stack-lg">
      <header className={styles.welcome}><p>{profile.nickname}님, 반가워요.</p><h2>오늘은 무엇이<br />궁금하세요?</h2></header>
      <button className={styles.today} type="button" onClick={() => navigate('/readings/day')}>
        <span><small>{seoulToday().replace(/-/g, '.')} · 나를 위한 하루</small><strong>오늘의 운세</strong><p>오늘의 흐름을 가볍게 읽어봐요.</p><b>오늘 풀이 열기 →</b></span>
        <span aria-hidden="true"><ChemistryCharacter kind="sun" /></span>
      </button>
      <section aria-label="원하는 풀이 고르기"><h2 className={styles.sectionTitle}>보고 싶은 풀이를 골라보세요</h2><ReadingMenu topics={['temperament', 'month', 'year', 'luck']} /></section>
      <button className={styles.relationship} type="button" onClick={() => navigate('/rooms')}><span><strong>우리 궁합은 어떨까?</strong><small>친구와의 조합과 대화 보러 가기</small></span><span aria-hidden="true">↗</span></button>
      <section aria-label="내 사주 더 알아보기"><h2 className={styles.sectionTitle}>내 사주를 더 알고 싶다면</h2><ReadingMenu topics={['natal', 'elements']} /></section>
      <p className="muted small">사주 풀이는 나를 돌아보는 참고용 이야기예요. 미래나 관계를 판정하지 않아요.</p>
    </div>
    <Tabs current="home" />
  </main>
}
