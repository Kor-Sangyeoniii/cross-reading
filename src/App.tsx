import { useEffect } from 'react'
import { ErrorNotice, Loading } from './ui/kit'
import { matchRoute, navigate, usePath } from './ui/router'
import { InviteScreen } from './ui/screens/InviteScreen'
import { OnboardingScreen } from './ui/screens/OnboardingScreen'
import { ProfileScreen } from './ui/screens/ProfileScreen'
import { RoomScreen } from './ui/screens/RoomScreen'
import { RoomsScreen } from './ui/screens/RoomsScreen'
import { SettingsScreen } from './ui/screens/SettingsScreen'
import { StartScreen } from './ui/screens/StartScreen'
import { SessionProvider } from './ui/session'
import { useSession } from './ui/useSession'

// 화면 연결. 처음부터 로그인(확정) → 프로필이 없으면 가입 단계 → 관계 / 내 프로필.
// 초대 링크는 프로필이 없어도 초대 전용 짧은 경로(11 → 19)로 바로 간다.

export default function App() {
  return (
    <SessionProvider>
      <div className="app">
        <Routes />
      </div>
    </SessionProvider>
  )
}

function Routes() {
  const path = usePath()
  const route = matchRoute(path)
  const { session, profile, profileError, refreshProfile } = useSession()

  const needsRedirect =
    session && profile !== undefined && route.name !== 'invite' && route.name !== 'callback'
      ? profile === null
        ? route.name !== 'onboarding' && '/onboarding'
        : (route.name === 'home' || route.name === 'onboarding' || route.name === 'notFound') && '/rooms'
      : false

  useEffect(() => {
    if (needsRedirect) navigate(needsRedirect, { replace: true })
  }, [needsRedirect])

  if (session === undefined) return <Loading text="불러오고 있어요." />
  if (!session) {
    if (route.name === 'callback') return <Loading text="로그인하고 있어요." />
    return <StartScreen invited={route.name === 'invite'} />
  }
  if (profileError) {
    return (
      <main className="screen" style={{ paddingTop: 48 }}>
        <ErrorNotice message="내 정보를 불러오지 못했어요." onRetry={refreshProfile} />
      </main>
    )
  }
  if (profile === undefined || route.name === 'callback' || needsRedirect) return <Loading text="불러오고 있어요." />

  if (route.name === 'invite') return <InviteScreen key={route.token} token={route.token} profile={profile} />
  if (!profile) return <OnboardingScreen />

  switch (route.name) {
    case 'me':
      return <ProfileScreen profile={profile} />
    case 'settings':
      return <SettingsScreen profile={profile} />
    case 'room':
      return <RoomScreen key={route.roomId} roomId={route.roomId} nickname={profile.nickname} />
    default:
      return <RoomsScreen nickname={profile.nickname} />
  }
}
