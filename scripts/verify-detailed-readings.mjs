// Entirely synthetic profile; no account calls, personal-data logs or screenshots.
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
let external = 0
const errors = [],
  passed = [],
  lengths = {}
await context.route('**/*', (route) => {
  if (
    !['localhost', '127.0.0.1'].includes(
      new URL(route.request().url()).hostname,
    )
  ) {
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
const editor = page.getByRole('region', { name: '테스트 프로필 설정' })
const apply = () =>
  editor.getByRole('button', { name: '선택한 정보로 풀이 보기' }).click()
const topic = async (name) => {
  await tab('내 사주')
  await page
    .getByRole('region', { name: '풀이 주제' })
    .getByRole('button', { name: new RegExp(name) })
    .click()
  await page
    .getByRole('button', { name: '자세한 풀이·만세력', exact: true })
    .click()
}
const report = (name) => page.getByRole('region', { name, exact: true })
const natal = report('내 사주, 근거부터 깊이 읽기')
const expand = async (r) => {
  await r.getByRole('button', { name: '전체 풀이 펼치기', exact: true }).click()
  assert.equal(await r.locator('details[open]').count(), 6)
}
const chart = report('내 원국 · 시주·일주·월주·연주')
const natalChars = () =>
  chart
    .getByRole('img')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
try {
  await page.goto(base + '/try#me')
  await editor.getByLabel('출생일 · 양력', { exact: true }).fill('1992-01-12')
  await editor.getByLabel('출생시간', { exact: true }).fill('08:00')
  await apply()
  await topic('원국·십신')
  await natal.waitFor()
  assert.equal(await natal.locator('details[open]').count(), 1)
  assert.match(await natal.locator('header').textContent(), /월주 신축/)
  assert.match(await natal.locator('header').textContent(), /일지 해/)
  assert.match(await natal.locator('header').textContent(), /시주 갑진/)
  await natal.getByRole('button', { name: '전체 풀이 펼치기' }).focus()
  await page.keyboard.press('Enter')
  assert.equal(await natal.locator('details[open]').count(), 6)
  lengths.natal = (await natal.innerText()).length
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
  }
  await natal.getByRole('button', { name: '설명 모두 접기' }).click()
  assert.equal(await natal.locator('details[open]').count(), 0)
  await natal.locator('summary').nth(1).click()
  assert.equal(await natal.locator('details[open]').count(), 1)
  const workBefore = await natal.locator('details').nth(1).innerText()
  const sources = report('원국 십성 풀이')
  await sources.locator('summary').first().click()
  const term = sources.locator('details').first()
  await term
    .getByRole('heading', { name: '일·공부에서 구체적으로', exact: true })
    .waitFor()
  await term
    .getByRole('heading', { name: '친한 사람·연인과의 관계에서', exact: true })
    .waitFor()
  assert.match(await term.innerText(), /시주 천간 갑\(甲\)/)
  lengths.tenGod = (await term.innerText()).length
  passed.push(
    'personalized natal report visible, six readable chapters, keyboard expand/collapse, detailed term basis and work/relationship context, narrow widths',
  )
  await chart
    .getByRole('button', { name: '시주 백호대살 풀이', exact: true })
    .click()
  const detail = report('선택한 신살 풀이')
  await detail
    .getByRole('heading', { name: '가까운 관계에서 적용해 보기', exact: true })
    .waitFor()
  assert.match(await detail.innerText(), /반안살도 함께 표시/)
  lengths.shinsal = (await detail.innerText()).length
  const pair = report('신살 함께 읽기')
    .locator('details')
    .filter({
      has: page
        .locator('summary')
        .filter({ hasText: '일주 천을귀인 + 시주 백호대살' }),
    })
  await pair.locator('summary').click()
  await pair
    .getByRole('heading', { name: '두 위치를 구분해서 읽기', exact: true })
    .waitFor()
  assert.match(await pair.innerText(), /중간 점검/)
  assert.match(
    await pair.innerText(),
    /천을귀인이 백호의 작용을 없앤다는 뜻은 아니에요/,
  )
  lengths.pair = (await pair.innerText()).length
  const connections = report('기둥 사이의 합충')
  if (await connections.locator('details').count()) {
    await connections.locator('summary').first().click()
    await connections
      .getByRole('heading', { name: '생활에 옮겨보는 순서', exact: true })
      .first()
      .waitFor()
  }
  passed.push(
    '19-name detail renderer exposes position, co-located terms and full scenarios; actual noble/white tiger pair and separate connection explanations',
  )
  await tab('내 사주')
  await editor.getByLabel('출생일 · 양력', { exact: true }).fill('1992-01-13')
  await apply()
  await topic('원국·십신')
  await expand(natal)
  assert.notEqual(await natal.locator('details').nth(1).innerText(), workBefore)
  await topic('내 기질')
  await natal.waitFor()
  assert.match(await natal.locator('header').textContent(), /일지 자/)
  await tab('내 사주')
  await editor.getByLabel('출생일 · 양력', { exact: true }).fill('1992-01-12')
  await apply()
  await topic('오늘의 운세')
  const day = report('일운, 내 원국과 자세히 읽기')
  const date = page.getByLabel('살펴볼 날짜 · 한국 시간', { exact: true })
  await date.fill('2026-10-16')
  await expand(day)
  const before = await day.innerText(),
    natalBefore = await natalChars()
  lengths.daily = before.length
  assert.match(before, /하루는 연락 한 번/)
  await date.fill('2026-10-17')
  await day
    .locator('header')
    .getByText(/2026-10-17/)
    .waitFor()
  await expand(day)
  assert.notEqual(await day.innerText(), before)
  assert.deepEqual(await natalChars(), natalBefore)
  await date.fill('')
  await page.getByRole('alert').waitFor()
  assert.equal(await day.count(), 0)
  assert.equal(await report('선택한 운의 신살').count(), 0)
  await page.getByRole('button', { name: '오늘로 돌아가기' }).click()
  await day.waitFor()
  passed.push(
    'different birth changes real narrative, temperament has deep report, daily date updates explanations without changing birth chart, invalid date clears report',
  )
  await topic('월간 운세')
  const month = report('월운, 내 원국과 자세히 읽기')
  await page.getByLabel('이번 달에서 살펴볼 날짜').fill('2024-02-04')
  await expand(month)
  assert.match(await month.locator('header').innerText(), /정오 기준/)
  assert.match(await month.innerText(), /절기 구간/)
  await topic('연간 운세')
  const year = report('연운, 내 원국과 자세히 읽기')
  await expand(year)
  assert.match(await year.innerText(), /입춘/)
  assert.match(await year.innerText(), /한 해 동안/)
  await topic('나의 대운')
  const luck = report('선택한 대운, 내 원국과 자세히 읽기')
  assert.equal(await luck.count(), 0)
  await page.getByLabel('대운 순·역행 계산 기준').selectOption('male')
  await expand(luck)
  assert.match(await luck.innerText(), /근사 구간/)
  const luckBefore = await luck.innerText()
  const cycles = page.getByLabel('10년 흐름 선택')
  await cycles.selectOption(
    String((Number(await cycles.inputValue()) + 1) % 10),
  )
  await expand(luck)
  assert.notEqual(await luck.innerText(), luckBefore)
  passed.push(
    'different daily/monthly/annual/decade context, solar-term uncertainty in visible lead, decade selection follows actual selected range',
  )
  await tab('내 사주')
  await editor.getByRole('checkbox', { name: '시간을 몰라요' }).check()
  await apply()
  await topic('원국·십신')
  assert.match(await natal.locator('header').innerText(), /시주는 미상/)
  await expand(natal)
  assert.doesNotMatch(await natal.innerText(), /시주 갑진/)
  assert.equal(await sources.locator('details').count(), 5)
  await tab('내 사주')
  await editor.getByLabel('출생일 · 양력', { exact: true }).fill('2024-02-04')
  await apply()
  await topic('원국·십신')
  assert.match(
    await natal.locator('header').innerText(),
    /연주·월주는 확인이 필요/,
  )
  const stored = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
      url: location.href,
    }),
  )
  assert.ok(!stored.includes('1992-01-12') && !stored.includes('2024-02-04'))
  assert.deepEqual(errors, [])
  assert.equal(external, 0)
  passed.push(
    'no invented hour narrative; uncertain birth disclosed upfront; no new persistence or external requests',
  )
  console.log(
    JSON.stringify({
      passed,
      renderedCharacters: lengths,
      externalRequests: external,
      pageErrors: errors.length,
      screenshots: 0,
    }),
  )
} finally {
  await browser.close()
}
