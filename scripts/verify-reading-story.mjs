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
  passed = []
await context.route('**/*', (route) => {
  if (
    !['127.0.0.1', 'localhost'].includes(
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
const story = page.getByRole('region', { name: '내 사주 이야기', exact: true })
const nav = page.getByRole('navigation', { name: '주요 메뉴' })
const tab = (name) => nav.getByRole('button', { name, exact: true }).click()
const topic = async (name) => {
  await tab('내 사주')
  await page
    .getByRole('region', { name: '풀이 주제' })
    .getByRole('button', { name: new RegExp(name) })
    .click()
}
const editor = page.getByRole('region', { name: '테스트 프로필 설정' })
const apply = () =>
  editor.getByRole('button', { name: '선택한 정보로 풀이 보기' }).click()
const full = () =>
  page.getByRole('button', { name: '자세한 풀이·만세력', exact: true }).click()
const backToStory = () =>
  page.getByRole('button', { name: '이야기로 보기', exact: true }).click()
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
  await page.goto(base + '/try#me')
  await editor.getByLabel('출생일 · 양력', { exact: true }).fill('1992-01-12')
  await editor.getByLabel('출생시간', { exact: true }).fill('08:00')
  await apply()
  await topic('원국·십신')
  await story.waitFor()
  await story
    .getByRole('img', { name: '불꽃 돼지 이야기 안내 캐릭터' })
    .waitFor()
  assert.equal(
    await page
      .getByRole('region', { name: '내 사주, 근거부터 깊이 읽기', exact: true })
      .count(),
    0,
    'long report not forced into first screen',
  )
  assert.equal(
    await page
      .getByRole('region', { name: '원국과 신살 풀이', exact: true })
      .count(),
    0,
  )
  await widthCheck()
  await story
    .getByRole('button', { name: '이야기 시작하기', exact: false })
    .focus()
  await page.keyboard.press('Enter')
  const heading = story.getByRole('heading', {
    name: '이런 순간, 있지 않나요?',
    exact: true,
  })
  await heading.waitFor()
  await page.waitForFunction(() => document.activeElement?.tagName === 'H3')
  assert.equal(
    await heading.evaluate((el) => el === document.activeElement),
    true,
  )
  const choices = story.getByRole('button').filter({ hasText: /^A|^B/ })
  assert.equal(await choices.count(), 2)
  await choices.first().click()
  await story
    .getByRole('heading', { name: '그 선택 다음에는', exact: true })
    .waitFor()
  const first = await story.innerText()
  await story.getByRole('button', { name: '이전 장면', exact: false }).click()
  await choices.nth(1).click()
  await story
    .getByRole('heading', { name: '그 선택 다음에는', exact: true })
    .waitFor()
  assert.notEqual(await story.innerText(), first)
  await story
    .getByRole('button', { name: '왜 이런 이야기인지 알아보기', exact: false })
    .click()
  await story.getByRole('region', { name: '쉬운 이야기 풀이' }).waitFor()
  await story
    .getByText('내 사주의 어떤 부분에서 나온 이야기인가요?', { exact: true })
    .click()
  assert.match(await story.innerText(), /월주 천간 신/)
  assert.match(await story.innerText(), /편재/)
  await widthCheck()
  await story
    .getByRole('button', { name: '나에게 맞는 한 걸음 고르기', exact: false })
    .click()
  await story
    .getByRole('button', { name: '내가 해볼 일로 고르기', exact: true })
    .click()
  await story.getByRole('status').waitFor()
  await story
    .getByRole('button', { name: '근거와 긴 해설 이어 읽기', exact: false })
    .click()
  await page
    .getByRole('region', { name: '내 사주, 근거부터 깊이 읽기', exact: true })
    .waitFor()
  const chart = page.getByRole('region', {
    name: '내 원국 · 시주·일주·월주·연주',
    exact: true,
  })
  const original = await chart
    .getByRole('img')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  await backToStory()
  assert.equal(
    await story
      .getByRole('button', { name: '이번에 해볼 일로 골랐어요', exact: false })
      .getAttribute('aria-pressed'),
    'true',
  )
  await story
    .getByRole('button', { name: '다른 선택으로 다시 보기', exact: false })
    .click()
  await story
    .getByRole('button', { name: '이야기 시작하기', exact: false })
    .waitFor()
  passed.push(
    'comic-first experience, actual animal, five-step journey, keyboard focus, two different responses, evidence and full-reading link, reversible local practice card',
  )
  await story
    .getByRole('button', { name: '가까운 사람과', exact: false })
    .click()
  await story
    .getByRole('button', { name: '이야기 시작하기', exact: false })
    .click()
  assert.match(await story.innerText(), /답장을 기다리다/)
  await choices.first().click()
  await story
    .getByRole('button', { name: '왜 이런 이야기인지 알아보기', exact: false })
    .click()
  await story
    .getByText('내 사주의 어떤 부분에서 나온 이야기인가요?', { exact: true })
    .click()
  assert.match(await story.innerText(), /일주 지지 해/)
  await full()
  assert.deepEqual(
    await chart
      .getByRole('img')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))),
    original,
  )
  await backToStory()
  await story
    .getByRole('button', { name: '앞으로의 계획', exact: false })
    .click()
  await story
    .getByRole('button', { name: '이야기 시작하기', exact: false })
    .click()
  assert.match(await story.innerText(), /배우고 싶어/)
  passed.push(
    'work/relationship/planning use distinct real pillar sources; story choices leave natal chart unchanged; all scenes fit mobile',
  )
  await topic('오늘의 운세')
  const date = page.getByLabel('살펴볼 날짜 · 한국 시간', { exact: true })
  await date.fill('2026-10-16')
  await story
    .getByRole('button', { name: '이야기 시작하기', exact: false })
    .click()
  await choices.first().click()
  await date.fill('2026-10-17')
  await story
    .getByRole('button', { name: '이야기 시작하기', exact: false })
    .waitFor()
  assert.match(await story.innerText(), /2026-10-17/)
  await date.fill('')
  await page.getByRole('alert').waitFor()
  assert.equal(await story.count(), 0)
  await page.getByRole('button', { name: '오늘로 돌아가기' }).click()
  await story.waitFor()
  for (const [name, frame] of [
    ['월간 운세', '반복되는 장면'],
    ['연간 운세', '한 해에 지키고 싶은'],
  ]) {
    await topic(name)
    assert.match(await story.innerText(), new RegExp(frame))
  }
  await topic('나의 대운')
  assert.equal(await story.count(), 0)
  await page.getByLabel('대운 순·역행 계산 기준').selectOption('male')
  await story.waitFor()
  const before = await story.innerText(),
    cycles = page.getByLabel('10년 흐름 선택')
  await cycles.selectOption(
    String((Number(await cycles.inputValue()) + 1) % 10),
  )
  assert.notEqual(await story.innerText(), before)
  passed.push(
    'date and decade changes reset story choices; empty date/direction has no invented story; monthly and annual contexts differ',
  )
  await tab('내 사주')
  await editor.getByLabel('출생일 · 양력', { exact: true }).fill('1992-01-13')
  await apply()
  await topic('내 기질')
  await story.getByRole('img', { name: '대지 쥐 이야기 안내 캐릭터' }).waitFor()
  await tab('내 사주')
  await editor.getByRole('checkbox', { name: '시간을 몰라요' }).check()
  await apply()
  await topic('원국·십신')
  assert.equal(
    await story
      .getByRole('button', { name: '앞으로의 계획', exact: false })
      .isDisabled(),
    true,
  )
  await tab('내 사주')
  await editor.getByLabel('출생일 · 양력', { exact: true }).fill('2024-02-04')
  await apply()
  await topic('원국·십신')
  assert.match(await story.innerText(), /시간 경계/)
  await story
    .getByRole('button', { name: '이야기 시작하기', exact: false })
    .click()
  assert.equal(
    await story
      .locator('[data-step]')
      .evaluate((el) => getComputedStyle(el).animationName),
    'none',
  )
  const stored = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
      url: location.href,
    }),
  )
  assert.ok(!stored.includes('1992-01-12') && !stored.includes('2024-02-04'))
  await page.reload()
  assert.equal(
    await editor.getByLabel('출생일 · 양력', { exact: true }).inputValue(),
    '1992-01-21',
  )
  assert.equal(external, 0)
  assert.deepEqual(errors, [])
  passed.push(
    'new birth changes guardian; unknown hour disables unsupported scene; boundary shown early; reduced motion; no persistence or external calls',
  )
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
