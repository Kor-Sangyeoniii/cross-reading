import { createClient } from '@supabase/supabase-js'

// 브라우저에는 공개값(URL, publishable/anon key)만 둔다. service_role 키는 절대 쓰지 않는다 (AGENTS.md P3).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// PKCE: 로그인 후 /auth/callback?code=... 로 돌아오면 클라이언트가 자동으로 세션을 교환한다.
export const supabase =
  url && anonKey ? createClient(url, anonKey, { auth: { flowType: 'pkce', detectSessionInUrl: true } }) : null
