// Synthetic local flow only: no screenshots, real accounts, payments or external messages.
import assert from 'node:assert/strict'
const { chromium } = await import(
  process.env.CR_PLAYWRIGHT_MODULE ??
    '/tmp/cross-motion/node_modules/playwright/index.mjs'
)
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
})
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
})
const base = (
  process.env.CR_DATING_BASE_URL ?? 'http://127.0.0.1:5173'
).replace(/\/$/, '')
const errors = [],
  passed = []
let external = 0
await context.route('**/*', (route) => {
  const u = new URL(route.request().url())
  if (!['localhost', '127.0.0.1'].includes(u.hostname)) {
    external++
    return route.abort()
  }
  return route.continue()
})
const page = await context.newPage()
page.setDefaultTimeout(10000)
page.on('pageerror', (e) => errors.push(e.message))
const nav = page.getByRole('navigation', { name: '주요 메뉴' })
const tab = (name) => nav.getByRole('button', { name, exact: true }).click()
const widthCheck = async () => {
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
  }
}
try {
  await page.goto(base + '/try')
  await page
    .getByRole('heading', { name: '오늘, 나와 우리', exact: true })
    .waitFor()
  assert.equal(await nav.getByRole('button').count(), 5)
  await widthCheck()
  await page
    .getByRole('button', { name: '오늘 풀이 열기', exact: true })
    .click()
  await page
    .getByRole('button', { name: '자세한 풀이·만세력', exact: true })
    .click()
  const answer = page.getByRole('region', { name: '일운', exact: true })
  await answer.waitFor()
  await page.locator('input[type=date]').fill('2026-10-10')
  const before = await answer.textContent()
  await page.locator('input[type=date]').fill('2026-10-11')
  await page.getByText(/2026-10-11의 한국 시간 정오/).waitFor()
  assert.notEqual(await answer.textContent(), before)
  passed.push(
    'five-tab public app, narrow screens, shared real calculation engine and date-dependent detail',
  )
  await tab('내 사주')
  await page
    .getByRole('heading', { name: '불꽃 원숭이', exact: true })
    .waitFor()
  await page.getByText('내 캐릭터의 근거 보기', { exact: true }).click()
  await page.getByText(/출생 연도의 띠와는 달라요/).waitFor()
  assert.ok(
    await page
      .locator('img[alt*=원숭이]')
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  )
  for (const label of [
    '내 기질',
    '나의 오행',
    '원국·십신',
    '월간 운세',
    '연간 운세',
    '나의 대운',
  ]) {
    await page
      .getByRole('region', { name: '풀이 주제' })
      .getByRole('button', { name: new RegExp(label) })
      .click()
    await page.getByRole('heading', { name: label, level: 1 }).waitFor()
    if (label !== '나의 오행')
      await page
        .getByRole('button', { name: '자세한 풀이·만세력', exact: true })
        .click()
    if (label === '나의 대운') {
      await page
        .getByRole('combobox', { name: '대운 순·역행 계산 기준' })
        .selectOption('male')
      await page
        .getByRole('region', { name: '선택한 대운', exact: true })
        .waitFor()
    }
    await widthCheck()
    await page.getByRole('button', { name: '내 사주 목록으로' }).click()
  }
  passed.push(
    'day-branch guardian and all six additional personal topics, including selectable luck convention',
  )
  await tab('소개')
  await page
    .getByRole('heading', { name: '먼저, 내 소개부터 만들어요' })
    .waitFor()
  await page.getByRole('textbox', { name: '체험에 쓸 별명' }).fill('합성산책러')
  await page.getByRole('button', { name: '내 조건으로 소개 받기 →' }).click()
  await page.getByRole('button', { name: /타오.*어떤 사람인지 보기/ }).click()
  await page.getByRole('button', { name: '관심 보내기 · 무료' }).click()
  await tab('오늘')
  await page.getByRole('button', { name: '연결 이어보기' }).waitFor()
  await tab('대화')
  await page.getByRole('heading', { name: '서로 알아가고 싶어요' }).waitFor()
  await page.getByRole('checkbox', { name: /연결 조건과 미결제/ }).check()
  await page
    .getByRole('button', { name: '내 몫 결제하고 다음으로 · 실제 0원' })
    .click()
  await tab('오늘')
  await page
    .getByRole('button', { name: '새 예시 메시지 1개 확인하기' })
    .waitFor()
  await page
    .getByRole('button', { name: '새 예시 메시지 1개 확인하기' })
    .click()
  await page
    .getByRole('heading', { name: '이제 둘이 이야기할 수 있어요' })
    .waitFor()
  await nav.locator('.badge').waitFor({ state: 'detached' })
  await page.getByRole('button', { name: '예시 인사 넣기' }).click()
  await page.getByRole('button', { name: '인사 보내보기' }).click()
  await page
    .getByText('사용 순서를 모두 따라왔어요.', { exact: true })
    .waitFor()
  await tab('내 사주')
  await tab('대화')
  await page
    .getByText('사용 순서를 모두 따라왔어요.', { exact: true })
    .waitFor()
  passed.push(
    'single-person journey survives tab changes, background example message badge clears when viewed, sent message persists',
  )
  await tab('마이')
  await page
    .getByRole('heading', { name: '지금은 테스트 프로필이에요' })
    .waitFor()
  await page.goBack()
  await page.getByRole('heading', { name: '대화', exact: true }).waitFor()
  await page.reload()
  await page
    .getByRole('heading', { name: '아직 연결된 소개가 없어요' })
    .waitFor()
  assert.equal(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => /trial|dating/.test(k)),
    ),
    false,
  )
  await widthCheck()
  passed.push(
    'browser Back restores tab; reload clears synthetic inputs and connections',
  )
  await tab('소개')
  await page.getByRole('button', { name: '내 조건으로 소개 받기 →' }).click()
  await page.getByRole('button', { name: /타오.*어떤 사람인지 보기/ }).click()
  await page.getByRole('button', { name: '관심 보내기 · 무료' }).click()
  await page.getByRole('heading', { name: '서로 알아가고 싶어요' }).waitFor()
  await page.getByRole('checkbox', { name: /연결 조건과 미결제/ }).check()
  await page.evaluate(() => {
    window.__testHidden = true
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (window.__testHidden ? 'hidden' : 'visible'),
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page
    .getByRole('button', { name: '내 몫 결제하고 다음으로 · 실제 0원' })
    .click()
  await nav.locator('.badge').waitFor()
  await page.evaluate(() => {
    window.__testHidden = false
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await nav.locator('.badge').waitFor({ state: 'detached' })
  passed.push(
    'background browser tab retains unread message until document becomes visible',
  )
  assert.equal(external, 0)
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify({
      passed,
      externalRequests: external,
      pageErrors: errors.length,
      screenshots: 0,
    }),
  )
} finally {
  await browser.close()
}
