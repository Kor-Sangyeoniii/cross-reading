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
})
const base = (
  process.env.CR_DATING_BASE_URL ?? 'http://127.0.0.1:5173'
).replace(/\/$/, '')
let external = 0
const errors = [],
  passed = []
await context.route('**/*', (route) => {
  const url = new URL(route.request().url())
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
    external++
    return route.abort()
  }
  return route.continue()
})
const page = await context.newPage()
page.setDefaultTimeout(10000)
page.on('pageerror', (e) => errors.push(e.message))
const editor = page.getByRole('region', { name: '테스트 프로필 설정' })
const card = page.getByRole('region', { name: '내 사주 캐릭터' })
const nav = page.getByRole('navigation', { name: '주요 메뉴' })
const tab = (name) => nav.getByRole('button', { name, exact: true }).click()
const apply = () =>
  editor.getByRole('button', { name: '선택한 정보로 풀이 보기' }).click()
const birth = editor.getByLabel('출생일 · 양력', { exact: true })
const mbti = editor.getByRole('combobox', { name: 'MBTI 유형' })
try {
  await page.goto(base + '/try')
  await page.getByRole('button', { name: '출생일·MBTI 바꾸기' }).click()
  await editor.waitFor()
  assert.equal(await birth.getAttribute('type'), 'date')
  assert.equal(await mbti.locator('option').count(), 17)
  const initial = await card.textContent()
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
  }
  await birth.fill('1992-01-22')
  await mbti.selectOption('ENFP')
  assert.equal(
    await card.textContent(),
    initial,
    'unapplied draft must not replace reading',
  )
  await apply()
  await editor.getByRole('status').waitFor()
  const changed = await card.textContent()
  assert.notEqual(changed, initial)
  await page
    .getByRole('region', { name: '선택한 MBTI' })
    .getByText('ENFP', { exact: true })
    .waitFor()
  passed.push(
    'calendar and 16 MBTI types; explicit apply changes chart and selected type; mobile widths',
  )
  await mbti.selectOption('INTJ')
  await apply()
  assert.equal(
    await card.textContent(),
    changed,
    'MBTI must not change saju calculation',
  )
  await tab('마이')
  assert.equal(await birth.inputValue(), '1992-01-22')
  assert.equal(await mbti.inputValue(), 'INTJ')
  await apply()
  await page.getByRole('heading', { name: '내 사주', exact: true }).waitFor()
  await tab('오늘')
  assert.equal(
    await page
      .getByRole('button', { name: /나의 일주 수호신/ })
      .getByText('불꽃 원숭이 ↗', { exact: true })
      .count(),
    0,
  )
  await page
    .getByRole('button', { name: '오늘 풀이 열기', exact: true })
    .click()
  await page
    .getByRole('button', { name: '자세한 풀이·만세력', exact: true })
    .click()
  const daily = page.getByRole('region', { name: '일운', exact: true })
  await daily.waitFor()
  await daily.locator('summary').first().click()
  const appliedDaily = await daily.textContent()
  await tab('내 사주')
  await editor.getByRole('button', { name: '예시값으로 되돌리기' }).click()
  await card
    .getByRole('heading', { name: '불꽃 원숭이', exact: true })
    .waitFor()
  await tab('오늘')
  await page
    .getByRole('button', { name: '오늘 풀이 열기', exact: true })
    .click()
  await page
    .getByRole('button', { name: '자세한 풀이·만세력', exact: true })
    .click()
  await daily.waitFor()
  await daily.locator('summary').first().click()
  assert.notEqual(
    await daily.textContent(),
    appliedDaily,
    'daily basis follows chosen birth, not original sample',
  )
  passed.push(
    'MBTI separate from calculation, applied values survive tabs, home character and daily basis refresh',
  )
  await tab('내 사주')
  await birth.fill('')
  await apply()
  await editor.getByRole('alert').waitFor()
  await card
    .getByRole('heading', { name: '불꽃 원숭이', exact: true })
    .waitFor()
  await birth.fill('2099-01-01')
  await apply()
  await editor.getByRole('alert').waitFor()
  await birth.fill('2000-02-29')
  await editor.getByLabel('출생시간', { exact: true }).fill('')
  await apply()
  await editor
    .getByRole('alert')
    .getByText(/출생시간을 선택/)
    .waitFor()
  await editor.getByRole('checkbox', { name: '시간을 몰라요' }).check()
  await mbti.selectOption('')
  await apply()
  assert.equal(
    await editor.getByLabel('출생시간', { exact: true }).isDisabled(),
    true,
  )
  await card.getByText('내 캐릭터의 근거 보기', { exact: true }).click()
  await card.getByText(/시주를 제외/).waitFor()
  await page
    .getByRole('region', { name: '선택한 MBTI' })
    .getByText('아직 선택하지 않았어요.', { exact: true })
    .waitFor()
  passed.push(
    'empty/future date and missing time rejected without discarding applied profile; leap day and unknown time accepted',
  )
  await page
    .getByRole('region', { name: '풀이 주제' })
    .getByRole('button', { name: /나의 대운/ })
    .click()
  await page
    .getByRole('combobox', { name: '대운 순·역행 계산 기준' })
    .selectOption('male')
  await page
    .getByRole('button', { name: '자세한 풀이·만세력', exact: true })
    .click()
  assert.equal(
    await page
      .getByRole('region', { name: '선택한 대운', exact: true })
      .count(),
    0,
  )
  await tab('내 사주')
  await editor.getByRole('checkbox', { name: '시간을 몰라요' }).uncheck()
  await editor.getByLabel('출생시간', { exact: true }).fill('09:30')
  await mbti.selectOption('ISFP')
  await apply()
  await page
    .getByRole('region', { name: '풀이 주제' })
    .getByRole('button', { name: /나의 대운/ })
    .click()
  await page
    .getByRole('combobox', { name: '대운 순·역행 계산 기준' })
    .selectOption('male')
  await page
    .getByRole('button', { name: '자세한 풀이·만세력', exact: true })
    .click()
  await page.getByRole('region', { name: '선택한 대운', exact: true }).waitFor()
  const stored = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
    search: location.search,
    hash: location.hash,
  }))
  assert.ok(!JSON.stringify(stored).includes('2000-02-29'))
  assert.ok(!JSON.stringify(stored).includes('ISFP'))
  await page.reload()
  await page.getByRole('region', { name: '테스트 프로필 설정' }).waitFor()
  assert.equal(await birth.inputValue(), '1992-01-21')
  assert.equal(await mbti.inputValue(), '')
  passed.push(
    'luck availability follows unknown/known time; no profile in storage/URL; reload restores synthetic default',
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
