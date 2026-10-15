// Synthetic profile only. No screenshots, remote calls, stored birth data or payments.
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
const nav = page.getByRole('navigation', { name: '주요 메뉴' })
const tab = (name) => nav.getByRole('button', { name, exact: true }).click()
const topic = async (name) => {
  await tab('내 사주')
  await page
    .getByRole('region', { name: '풀이 주제' })
    .getByRole('button', { name: new RegExp(name) })
    .click()
}
const chart = page.getByRole('region', {
  name: '내 원국 · 시주·일주·월주·연주',
  exact: true,
})
const area = page.getByRole('region', { name: '원국과 신살 풀이', exact: true })
const detail = page.getByRole('region', {
  name: '선택한 신살 풀이',
  exact: true,
})
const together = page.getByRole('region', {
  name: '신살 함께 읽기',
  exact: true,
})
const natalChars = () =>
  chart
    .getByRole('img')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
const config = () =>
  area.getByText('계산 기준·지원 범위 확인 및 변경', { exact: true }).click()
try {
  await page.goto(base + '/try#me')
  const editor = page.getByRole('region', { name: '테스트 프로필 설정' })
  await editor.getByLabel('출생일 · 양력', { exact: true }).fill('1992-01-12')
  await editor.getByLabel('출생시간', { exact: true }).fill('08:00')
  await editor.getByRole('button', { name: '선택한 정보로 풀이 보기' }).click()
  await topic('원국·십신')
  await chart.waitFor()
  assert.deepEqual(
    await chart.getByRole('group').getByRole('heading').allTextContents(),
    ['시주', '일주', '월주', '연주'],
  )
  assert.equal((await natalChars()).length, 8)
  await chart
    .getByRole('button', { name: '일주 천을귀인 풀이', exact: true })
    .focus()
  await page.keyboard.press('Enter')
  await detail.getByRole('heading', { name: /천을귀인/ }).waitFor()
  assert.ok(await detail.evaluate((el) => el === document.activeElement))
  assert.match(await detail.textContent(), /내 일간 정/)
  await chart
    .getByRole('button', { name: '시주 백호대살 풀이', exact: true })
    .click()
  await detail.getByRole('heading', { name: /백호대살/ }).waitFor()
  assert.match(await detail.textContent(), /시주 갑진/)
  const pair = together
    .locator('details')
    .filter({ hasText: '일주 천을귀인 + 시주 백호대살' })
  await pair.locator('summary').click()
  assert.match(await pair.textContent(), /근거 1/)
  assert.match(await pair.textContent(), /근거 2/)
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
  }
  passed.push(
    'four natal pillars, actual noble/day and white tiger/hour, click + keyboard detail, pair evidence and narrow screens',
  )
  await config()
  await area.getByLabel('백호 간지 대조 범위').selectOption('day')
  assert.equal(await chart.getByRole('button', { name: /백호대살/ }).count(), 0)
  assert.equal(
    await together
      .getByText('일주 천을귀인 + 시주 백호대살', { exact: true })
      .count(),
    0,
  )
  assert.equal(
    await detail.getByRole('heading').count(),
    0,
    'removed selection must not leave stale detail',
  )
  await area.getByLabel('백호 간지 대조 범위').selectOption('all')
  const yearChips = await chart.getByRole('button').allTextContents()
  await area.getByLabel('12신살 기준').selectOption('day')
  assert.deepEqual(
    await chart.getByRole('button').allTextContents(),
    yearChips,
    'synthetic year 未 and day 亥 share the same three-branch group',
  )
  await chart
    .getByRole('button', { name: '시주 반안살 풀이', exact: true })
    .click()
  assert.match(await detail.textContent(), /내 일지 해/)
  passed.push(
    'explicit school conventions recalculate badges and remove unavailable detail/pair',
  )
  await topic('오늘의 운세')
  const date = page.getByLabel('살펴볼 날짜 · 한국 시간', { exact: true })
  await date.fill('2026-10-10')
  const natal = await natalChars()
  const before = await page
    .getByRole('region', { name: '일운', exact: true })
    .textContent()
  await date.fill('2026-10-11')
  await page.getByText(/2026-10-11의 한국 시간 정오/).waitFor()
  assert.notEqual(
    await page.getByRole('region', { name: '일운', exact: true }).textContent(),
    before,
  )
  assert.deepEqual(await natalChars(), natal)
  const transit = page.getByRole('region', {
    name: '선택한 운의 신살',
    exact: true,
  })
  await transit.getByRole('button').first().click()
  assert.match(
    await detail.textContent(),
    /원국에 새 신살이 생겼다는 뜻은 아니에요/,
  )
  await date.fill('')
  await page.getByRole('alert').waitFor()
  assert.equal(await transit.count(), 0)
  assert.equal(await detail.getByRole('heading').count(), 0)
  assert.deepEqual(await natalChars(), natal)
  await page.getByRole('button', { name: '오늘로 돌아가기' }).click()
  await transit.waitFor()
  passed.push(
    'selected date changes transit but preserves natal chart; invalid date clears transit and stale detail',
  )
  await topic('월간 운세')
  await page.getByLabel('이번 달에서 살펴볼 날짜').fill('2024-02-04')
  await transit.getByText(/절기 경계일의 정오/).waitFor()
  assert.ok(
    (await transit.getByRole('button').allTextContents()).every((s) =>
      s.includes('*'),
    ),
  )
  await topic('연간 운세')
  await page.getByLabel('올해에서 살펴볼 날짜').fill('2024-02-03')
  await transit
    .getByRole('heading', { name: '선택 간지 · 계묘', exact: true })
    .waitFor()
  await page.getByLabel('올해에서 살펴볼 날짜').fill('2024-02-05')
  await transit
    .getByRole('heading', { name: '선택 간지 · 갑진', exact: true })
    .waitFor()
  await topic('나의 대운')
  assert.equal(await transit.count(), 0, 'no invented direction')
  await page.getByLabel('대운 순·역행 계산 기준').selectOption('male')
  await transit.waitFor()
  const luckBefore = await transit.textContent()
  const cycles = page.getByLabel('10년 흐름 선택')
  const next = String((Number(await cycles.inputValue()) + 1) % 10)
  await cycles.selectOption(next)
  assert.notEqual(await transit.textContent(), luckBefore)
  assert.deepEqual(await natalChars(), natal)
  passed.push(
    'month boundary warning, spring-based year change, explicit luck convention and selected cycle comparison',
  )
  await tab('내 사주')
  await editor.getByRole('checkbox', { name: '시간을 몰라요' }).check()
  await editor.getByRole('button', { name: '선택한 정보로 풀이 보기' }).click()
  await topic('원국·십신')
  await chart.getByRole('group', { name: '시주 미상', exact: true }).waitFor()
  assert.equal((await natalChars()).length, 6)
  assert.equal(await chart.getByRole('button', { name: /^시주 / }).count(), 0)
  assert.equal(await together.getByText(/시주 백호대살/).count(), 0)
  await tab('내 사주')
  await editor.getByLabel('출생일 · 양력', { exact: true }).fill('2024-02-04')
  await editor.getByRole('button', { name: '선택한 정보로 풀이 보기' }).click()
  await topic('원국·십신')
  const flagged = chart.getByRole('button').filter({ hasText: '*' })
  assert.ok((await flagged.count()) > 0)
  await flagged.first().click()
  assert.match(await detail.textContent(), /확인 필요/)
  const stored = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
      url: location.href,
    }),
  )
  assert.ok(!stored.includes('1992-01-12') && !stored.includes('2024-02-04'))
  passed.push(
    'unknown hour has an empty slot without invented symbols; uncertain birth anchor flagged; inputs not persisted',
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
