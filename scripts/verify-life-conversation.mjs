import assert from 'node:assert/strict'
const { chromium } = await import(
  process.env.CR_PLAYWRIGHT_MODULE ??
    '/tmp/cross-motion/node_modules/playwright/index.mjs'
)
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
})
const base = (
  process.env.CR_DATING_BASE_URL ?? 'http://127.0.0.1:5173'
).replace(/\/$/, '')
const passed = [],
  errors = []
let external = 0
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
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
  page.on('pageerror', (e) => errors.push(e.message))
  page.setDefaultTimeout(10000)
  const tab = (name) =>
    page
      .getByRole('navigation', { name: '주요 메뉴' })
      .getByRole('button', { name, exact: true })
      .click()
  const overview = page.getByRole('region', { name: '분야별 사주 해설' })
  const topic = async (name) => {
    await tab('내 사주')
    await page
      .getByRole('region', { name: '풀이 주제' })
      .getByRole('button', { name: new RegExp(name) })
      .click()
  }
  const widths = async () => {
    for (const width of [360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 })
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `overflow ${width}`,
      )
    }
  }
  await page.goto(`${base}/try#me`)
  await overview
    .getByRole('heading', { name: '내 사주, 그래서 나에게 어떤 의미일까?' })
    .waitFor()
  for (const label of ['직업운', '연애운', '금전운', '성공·성취운']) {
    const card = overview
      .locator('details')
      .filter({ has: page.locator('summary').filter({ hasText: `${label} ` }) })
      .first()
    await card.locator('summary').first().focus()
    await page.keyboard.press('Enter')
    await card.getByRole('heading', { name: '생활에서는 이렇게' }).waitFor()
    await card.getByText(`${label} 지수 계산 근거`, { exact: true }).click()
    assert.match(await card.innerText(), /원국의 확인된 십성/)
    await widths()
  }
  passed.push(
    'four life areas show transparent indices, actual basis, daily examples and keyboard disclosures at mobile widths',
  )
  await topic('오늘의 운세')
  const date = page.getByLabel('살펴볼 날짜 · 한국 시간')
  await date.fill('2026-10-18')
  const first = await overview.innerText()
  await date.fill('2026-10-19')
  assert.notEqual(await overview.innerText(), first)
  await date.fill('')
  assert.equal(
    await overview.count(),
    0,
    'invalid date clears scores instead of showing natal scores as daily',
  )
  await topic('나의 대운')
  assert.equal(
    await overview.count(),
    0,
    'no fabricated decade before convention selection',
  )
  await page.getByLabel('대운 순·역행 계산 기준').selectOption('male')
  await overview.waitFor()
  const luckFirst = await overview.innerText()
  await page.getByLabel('10년 흐름 선택').selectOption('0')
  assert.notEqual(await overview.innerText(), luckFirst)
  passed.push(
    'date and selected decade alter actual context; missing dates and conventions never fabricate indices',
  )
  await tab('내 사주')
  await page.getByText('궁금한 친구와 조합 확인하기', { exact: true }).click()
  const compare = page.getByRole('button', {
    name: '우리 조합 보기',
    exact: true,
  })
  assert.ok(await compare.isDisabled())
  await page.getByLabel('친구 출생일', { exact: true }).fill('1994-06-15')
  await page.getByLabel('친구가 이 비교에 동의했어요.').check()
  await compare.click()
  const pair = page.getByRole('region', { name: '친구 조합 결과' })
  await pair.waitFor()
  const firstPair = await pair.innerText()
  await page.getByLabel('친구 출생일', { exact: true }).fill('1996-03-20')
  assert.equal(await pair.count(), 0)
  await compare.click()
  assert.notEqual(await pair.innerText(), firstPair)
  await page.getByRole('button', { name: '친구 정보 지우기' }).click()
  assert.equal(await pair.count(), 0)
  assert.equal(
    await page.getByLabel('친구 출생일', { exact: true }).inputValue(),
    '',
  )
  passed.push(
    'friend comparison requires consent, uses selected birth, clears stale results and deletes local inputs',
  )
  await tab('대화')
  const lab = page.getByRole('region', { name: '대화 분석 도구' })
  const consent = lab.getByRole('checkbox')
  const analyze = lab.getByRole('button', { name: '대화 살펴보기' })
  await lab.getByRole('button', { name: '가상 대화로 사용해보기' }).click()
  assert.ok(await analyze.isDisabled())
  await consent.check()
  await analyze.click()
  await lab.getByText('4개 메시지 · 2명', { exact: false }).waitFor()
  assert.equal(await lab.getByLabel('답변할 메시지').count(), 0)
  await lab.getByLabel('대화에서 나는 누구인가요?').selectOption('나')
  await lab.getByLabel('답변할 메시지').selectOption('2')
  await lab.getByText('이 메시지에 답변 추천', { exact: true }).click()
  await lab.getByText('피로·고민 관련 표현', { exact: true }).waitFor()
  await lab.getByRole('button', { name: /많이 힘들었겠다/ }).click()
  assert.match(await lab.getByLabel('내 답변 초안').inputValue(), /들어주는/)
  await lab.getByLabel('내 답변 초안').fill('내 말로 수정한 가상 답변')
  await lab.getByLabel('답변할 메시지').selectOption('4')
  assert.equal(await lab.getByLabel('내 답변 초안').inputValue(), '')
  await lab.getByText('이 메시지에 답변 추천', { exact: true }).click()
  await lab.getByText('일정·만남 관련 표현', { exact: true }).waitFor()
  await widths()
  await consent.uncheck()
  assert.equal(await lab.getByLabel('내 답변 초안').count(), 0)
  passed.push(
    'consented local import, explicit self selection, accurate counts, per-message suggestions, editable draft and revocation',
  )
  const file = lab.getByLabel('카카오톡 텍스트 파일')
  await file.setInputFiles({
    name: 'synthetic.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      '[나] [오후 6:10] 안녕?\n2026년 10월 18일 오후 6:11, 친구 : <img src=x onerror=alert(1)>\n두 번째 줄',
    ),
  })
  await lab.getByLabel('대화 텍스트').filter({ hasText: '' }).waitFor()
  await page.waitForFunction(() =>
    [...document.querySelectorAll('textarea')].some((x) =>
      x.value.includes('<img'),
    ),
  )
  await consent.check()
  await analyze.click()
  await lab.getByLabel('대화에서 나는 누구인가요?').selectOption('나')
  await lab
    .getByText('<img src=x onerror=alert(1)>', { exact: false })
    .first()
    .waitFor()
  assert.equal(await lab.locator('img').count(), 0)
  await file.setInputFiles({
    name: 'too-big.txt',
    mimeType: 'text/plain',
    buffer: Buffer.alloc(300001, 'x'),
  })
  await lab.getByRole('alert').getByText(/300KB/).waitFor()
  assert.equal(await lab.getByLabel('내 답변 초안').count(), 0)
  await lab.getByLabel('대화 텍스트').fill('인식할 수 없는 가상 문장')
  await analyze.click()
  await lab
    .getByRole('alert')
    .getByText(/인식할 수 있는 대화가 없어요/)
    .waitFor()
  await lab.getByRole('button', { name: '분석·입력 지우기' }).click()
  assert.equal(await lab.getByLabel('대화 텍스트').inputValue(), '')
  await page.reload()
  assert.equal(await lab.getByLabel('대화 텍스트').inputValue(), '')
  assert.equal(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
    0,
  )
  passed.push(
    'UTF-8 file import, multiline and mobile format, HTML rendered as text, size/format errors, clear/reload and no persistence',
  )
  await tab('소개')
  await page.getByRole('button', { name: '내 조건으로 소개 받기 →' }).click()
  await page.getByRole('button', { name: /타오.*어떤 사람인지 보기/ }).click()
  await page.getByRole('button', { name: '관심 보내기 · 무료' }).click()
  await page.getByRole('checkbox', { name: /연결 조건과 미결제/ }).check()
  await page
    .getByRole('button', { name: '내 몫 결제하고 다음으로 · 실제 0원' })
    .click()
  await page
    .getByRole('heading', { name: '이제 둘이 이야기할 수 있어요' })
    .waitFor()
  const chat = page.getByRole('log', { name: '안내 대화' })
  await chat.getByText('이 메시지에 답변 추천', { exact: true }).first().click()
  const count = await chat.locator('p').count()
  await chat.getByRole('button').first().click()
  assert.ok(
    (
      await page
        .getByRole('textbox', { name: '첫 인사', exact: true })
        .inputValue()
    ).length > 0,
  )
  assert.equal(
    await chat.locator('p').count(),
    count,
    'recommendation does not send',
  )
  passed.push(
    'in-app example message recommendation fills composer only, with no automatic send',
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
