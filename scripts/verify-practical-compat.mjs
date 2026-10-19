import assert from 'node:assert/strict'
const { chromium } = await import(
  process.env.CR_PLAYWRIGHT_MODULE ??
    '/tmp/cr027-tools/node_modules/playwright/index.mjs'
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
  page.on('pageerror', (e) => errors.push(e.message))
  page.setDefaultTimeout(10000)
  await page.goto(`${base}/try#me`)
  const editor = page.getByRole('region', { name: '테스트 프로필 설정' })
  const apply = () =>
    editor.getByRole('button', { name: '선택한 정보로 풀이 보기' }).click()
  await editor.getByLabel('출생일 · 양력', { exact: true }).fill('2000-01-07')
  await editor.getByRole('combobox', { name: 'MBTI 유형' }).selectOption('ENTJ')
  await apply()
  await page.getByText('궁금한 친구와 조합 확인하기', { exact: true }).click()
  const birth = page.getByLabel('친구 출생일', { exact: true })
  const mbti = page.getByRole('combobox', { name: '친구가 공개한 MBTI (선택)', exact: true })
  const submit = page.getByRole('button', {
    name: '우리 조합 보기',
    exact: true,
  })
  const report = page.getByRole('region', {
    name: '현실적인 조합 해설',
    exact: true,
  })
  await birth.fill('2000-01-01')
  await page.getByLabel('친구가 이 비교에 동의했어요.').check()
  await submit.click()
  await report
    .getByRole('heading', {
      name: '약속을 바꾸는 방식부터 맞춰야 해요',
      exact: true,
    })
    .waitFor()
  const clash = report
    .locator('article')
    .filter({
      has: page.getByRole('heading', {
        name: '약속을 바꾸는 방식부터 맞춰야 해요',
        exact: true,
      }),
    })
  const toggle = clash.getByText('실제 생활 예시와 파훼법', { exact: true })
  await toggle.focus()
  await page.keyboard.press('Enter')
  await clash
    .getByRole('heading', { name: '둘이 해볼 순서', exact: true })
    .waitFor()
  assert.equal(await clash.locator('ol li').count(), 3)
  assert.match(await clash.innerText(), /미리|통보/)
  await clash.getByText('이 해설이 나온 비교 근거', { exact: true }).click()
  assert.match(await clash.innerText(), /일지.*부딪히는/)
  await report
    .getByRole('heading', {
      name: '검토는 도움이 되지만, 훈수는 피곤해요',
      exact: true,
    })
    .waitFor()
  assert.match(await report.innerText(), /출생시간 없이/)
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow ${width}`,
    )
  }
  passed.push(
    'real clash/control basis, clear good/bad behavior, example and three-step repair, unknown hour, keyboard and mobile widths',
  )
  await birth.fill('2000-01-02')
  assert.equal(await report.count(), 0)
  await submit.click()
  assert.equal(
    await report
      .getByRole('heading', {
        name: '약속을 바꾸는 방식부터 맞춰야 해요',
        exact: true,
      })
      .count(),
    0,
  )
  await report
    .getByRole('heading', {
      name: '끌림은 좋은 출발점, 약속은 따로 확인해요',
      exact: true,
    })
    .waitFor()
  await report
    .getByRole('heading', {
      name: '검토는 도움이 되지만, 훈수는 피곤해요',
      exact: true,
    })
    .waitFor()
  passed.push(
    'birth change removes stale clash, shows simultaneous attraction and friction without canceling either',
  )
  await mbti.selectOption('ISFP')
  await submit.click()
  const differentTitle = '해결책부터 말하면 위로가 안 될 수 있어요'
  await report
    .getByRole('heading', { name: differentTitle, exact: true })
    .waitFor()
  const tf = report
    .locator('article')
    .filter({
      has: page.getByRole('heading', { name: differentTitle, exact: true }),
    })
  await tf.getByText('실제 생활 예시와 파훼법', { exact: true }).click()
  await tf
    .getByText(
      '“그 상황이면 많이 지쳤겠다. 지금은 내가 들어줄까, 아니면 다음에 어떻게 말할지 같이 생각해볼까?”',
      { exact: true },
    )
    .waitFor()
  await mbti.selectOption('ENTJ')
  await submit.click()
  assert.equal(
    await report
      .getByRole('heading', { name: differentTitle, exact: true })
      .count(),
    0,
  )
  await report
    .getByRole('heading', {
      name: '공감 방식이 닮아도 필요한 도움은 물어봐요',
      exact: true,
    })
    .waitFor()
  await mbti.selectOption('')
  await submit.click()
  assert.equal(
    await report
      .getByRole('heading', {
        name: '공감 방식이 닮아도 필요한 도움은 물어봐요',
        exact: true,
      })
      .count(),
    0,
  )
  passed.push(
    'same and different MBTI produce distinct realistic advice; unavailable MBTI never fabricates a dimension',
  )
  await editor.getByLabel('출생일 · 양력', { exact: true }).fill('2000-03-10')
  await apply()
  await birth.fill('2000-01-17')
  await submit.click()
  await report
    .getByRole('heading', {
      name: '서로 돕는 건 좋지만, 한쪽 전담은 지쳐요',
      exact: true,
    })
    .waitFor()
  await report
    .getByRole('heading', {
      name: '편한 사이라도 배려를 생략하면 안 돼요',
      exact: true,
    })
    .waitFor()
  assert.equal(
    await report
      .getByRole('heading', {
        name: '약속을 바꾸는 방식부터 맞춰야 해요',
        exact: true,
      })
      .count(),
    0,
  )
  assert.match(
    await report.innerText(),
    /현재 규칙에서 차이 근거가 나오지 않았어요/,
  )
  await page.getByLabel('친구가 이 비교에 동의했어요.').uncheck()
  assert.equal(await report.count(), 0)
  await page
    .getByRole('button', { name: '친구 정보 지우기', exact: true })
    .click()
  assert.equal(await birth.inputValue(), '')
  await page.reload()
  assert.equal(await report.count(), 0)
  assert.equal(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
    0,
  )
  assert.equal(external, 0)
  assert.deepEqual(errors, [])
  passed.push(
    'support/combine strengths retain their realistic pitfalls; no fake differences, consent removal/clear/reload and no persistence',
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
