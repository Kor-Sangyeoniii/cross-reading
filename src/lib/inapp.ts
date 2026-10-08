// 인앱 브라우저 판별 (CR-003).
// 구글은 2021-09-30부터 앱 내장 웹뷰에서의 OAuth 로그인을 차단한다(403 disallowed_useragent).
// 초대 링크는 대부분 카카오톡 인앱 브라우저에서 열리므로, 구글 로그인은 외부 브라우저로 넘겨야 한다.
// 출처: https://developers.googleblog.com/2021/06/upcoming-security-changes-to-googles-oauth-2.0-authorization-endpoint.html

export type InAppBrowser = 'kakaotalk' | 'other' | null

const OTHER_INAPP = /\b(FBAN|FBAV|Instagram|Line\/|NAVER\(inapp|DaumApps|everytimeApp|; wv\))/i

export function detectInAppBrowser(userAgent: string): InAppBrowser {
  if (/KAKAOTALK/i.test(userAgent)) return 'kakaotalk'
  if (OTHER_INAPP.test(userAgent)) return 'other'
  return null
}

/**
 * 카카오톡 인앱 브라우저에서 같은 주소를 기본 브라우저로 여는 스킴.
 * 공식 문서는 없고 커뮤니티 사례 기준이다. 사용자가 버튼을 누른 직후에 호출해야 동작한다는 보고가 있다.
 */
export function kakaoOpenExternalUrl(url: string): string {
  return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`
}
