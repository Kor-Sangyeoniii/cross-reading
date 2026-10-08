import type { Consents } from '../lib/profile'

// 서비스 이용 동의 상태 (02 · 11-①). 모든 항목 기본 해제.

export interface ServiceConsentState {
  age: 'over14' | 'under14' | null
  terms: boolean
  privacy: boolean
  marketing: boolean
}

export const EMPTY_SERVICE_CONSENT: ServiceConsentState = { age: null, terms: false, privacy: false, marketing: false }

export function serviceConsentReady(s: ServiceConsentState): boolean {
  return s.age === 'over14' && s.terms && s.privacy
}

export function toConsents(s: ServiceConsentState): Consents {
  return { age14OrOlder: s.age === 'over14', terms: s.terms, privacy: s.privacy, marketing: s.marketing }
}
