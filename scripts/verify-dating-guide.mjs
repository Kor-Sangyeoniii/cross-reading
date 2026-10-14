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
  locale: 'ko-KR',
  reducedMotion: 'reduce',
  acceptDownloads: true,
})
const base = (
  process.env.CR_DATING_BASE_URL ?? 'http://127.0.0.1:5173'
).replace(/\/$/, '')
let external = 0
const errors = [],
  passed = []
await context.route('**/*', (route) => {
  const u = new URL(route.request().url())
  if (!['127.0.0.1', 'localhost'].includes(u.hostname)) {
    external++
    return route.abort()
  }
  return route.continue()
})
const page = await context.newPage()
page.setDefaultTimeout(10000)
page.on('pageerror', (e) => errors.push(e.message))
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
const enter = async () => {
  await page
    .getByRole('button', { name: '내 조건으로 소개 받기 →', exact: true })
    .click()
  await page.getByRole('button', { name: /타오.*어떤 사람인지 보기/ }).click()
  await page.getByRole('button', { name: '관심 보내기 · 무료' }).click()
  await page
    .getByRole('heading', { name: '서로 알아가고 싶어요', exact: true })
    .waitFor()
}
try {
  await page.goto(base + '/dating')
  await page
    .getByRole('heading', { name: '처음이라면, 순서대로 따라와 보세요' })
    .waitFor()
  await page
    .getByRole('button', { name: '내 소개부터 시작하기', exact: true })
    .click()
  await page
    .getByRole('heading', { name: '먼저, 내 소개부터 만들어요' })
    .waitFor()
  assert.equal(
    await page.getByRole('region', { name: '가상 인물 선택' }).count(),
    0,
  )
  await page.getByRole('textbox', { name: '체험에 쓸 별명' }).fill('가상별명')
  await page
    .getByRole('checkbox', { name: '토요일 오후', exact: true })
    .uncheck()
  assert.equal(
    await page
      .getByRole('button', { name: '내 조건으로 소개 받기 →' })
      .isEnabled(),
    false,
  )
  await page.getByRole('checkbox', { name: '평일 저녁', exact: true }).check()
  await page.getByRole('button', { name: '내 조건으로 소개 받기 →' }).click()
  assert.equal(
    await page
      .getByRole('button', { name: /타오.*어떤 사람인지 보기/ })
      .count(),
    0,
  )
  await page.getByRole('button', { name: /몽울.*어떤 사람인지 보기/ }).waitFor()
  await page.getByRole('button', { name: '내 소개 수정하기' }).click()
  await page.getByRole('checkbox', { name: '토요일 오후', exact: true }).check()
  await widthCheck()
  passed.push(
    'single-person profile flow validates availability and changes introduction choices',
  )
  await enter()
  await widthCheck()
  assert.equal(
    await page
      .getByRole('button', { name: '내 몫 결제하고 다음으로 · 실제 0원' })
      .isEnabled(),
    false,
  )
  await page.getByRole('checkbox', { name: /연결 조건과 미결제/ }).check()
  await page
    .getByRole('button', { name: '내 몫 결제하고 다음으로 · 실제 0원' })
    .click()
  await page
    .getByRole('heading', { name: '이제 둘이 이야기할 수 있어요' })
    .waitFor()
  await page
    .getByText('상대 메시지는 미리 작성한 가상 예시예요', { exact: true })
    .waitFor()
  await page.getByRole('button', { name: '예시 인사 넣기' }).click()
  await page.getByRole('button', { name: '인사 보내보기' }).click()
  await page
    .getByRole('status')
    .getByText('사용 순서를 모두 따라왔어요.')
    .waitFor()
  await widthCheck()
  passed.push(
    'scripted counterpart advances interest and payment without switching personas; first message completes guide',
  )
  await page.getByRole('button', { name: '처음부터', exact: true }).click()
  await enter()
  await page.getByRole('checkbox', { name: /연결 조건과 미결제/ }).check()
  await page
    .getByText('상대가 결제하지 않으면 어떻게 되나요?', { exact: true })
    .click()
  await page.getByRole('button', { name: '미결제·환불 순서 보기' }).click()
  await page
    .getByRole('heading', { name: '3,000원 전액 환불 처리 중' })
    .waitFor()
  await page.getByRole('button', { name: '환불 완료 상태 보기' }).click()
  await page
    .getByRole('heading', { name: '3,000원 전액 환불 완료 예시' })
    .waitFor()
  assert.equal(await page.getByRole('region', { name: '대화 시작' }).count(), 0)
  passed.push(
    'alternative refund journey separates pending and completion, never opens chat',
  )
  await page.getByRole('button', { name: '처음부터', exact: true }).click()
  await page.getByRole('button', { name: '내 조건으로 소개 받기 →' }).click()
  await page.getByRole('button', { name: /타오.*어떤 사람인지 보기/ }).click()
  await page.getByRole('button', { name: '관심 보내기 · 무료' }).click()
  await page.getByRole('button', { name: '처음부터', exact: true }).click()
  await page.waitForTimeout(1700)
  await page
    .getByRole('heading', { name: '먼저, 내 소개부터 만들어요' })
    .waitFor()
  assert.equal(
    await page.getByRole('region', { name: '연결비 안내' }).count(),
    0,
  )
  await page.reload()
  assert.equal(
    await page.getByRole('textbox', { name: '체험에 쓸 별명' }).inputValue(),
    '산책러',
  )
  passed.push(
    'restart cancels pending scripted responses; refresh clears input, no persistence',
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
