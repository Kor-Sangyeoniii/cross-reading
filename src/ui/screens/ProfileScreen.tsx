import { useMemo } from 'react'
import { computeSaju } from '../../core/saju'
import type { MyProfile } from '../../lib/profile'
import { ErrorNotice, Tabs, TopBar } from '../kit'
import { navigate } from '../router'
import { PersonalCharacter } from '../ChemistryCard'
import { ReadingMenu } from '../ReadingMenu'

export function ProfileScreen({ profile }: { profile: MyProfile }) {
  const chart = useMemo(() => {
    try { return computeSaju(profile.birth) } catch { return null }
  }, [profile.birth])
  return <main className="screen with-tabs">
    <TopBar title="내 프로필" right={<button className="icon-btn" type="button" aria-label="설정" onClick={() => navigate('/settings')}>⚙</button>} />
    <div className="stack-lg">
      <header><h2>{profile.nickname}님</h2><p className="muted">나를 알아가는 이야기, 궁금한 만큼 열어보세요.</p></header>
      {chart ? <PersonalCharacter element={chart.dayMaster.element} /> : <ErrorNotice message="저장된 출생정보를 설정에서 확인해 주세요." />}
      <ReadingMenu topics={['temperament', 'natal', 'elements', 'luck']} />
      <button className="btn secondary" type="button" onClick={() => navigate('/')}>오늘·월간·연간 운세 보러 가기</button>
      <button className="btn secondary" type="button" onClick={() => navigate('/settings')}>내 정보·알림 설정</button>
    </div>
    <Tabs current="me" />
  </main>
}
