// Synthetic sessions only; no screenshots, external requests or live messages.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.CR_PLAYWRIGHT_MODULE ?? '/tmp/cross-motion/node_modules/playwright/index.mjs');
const source = await readFile(new URL('./verify-reading.mjs', import.meta.url), 'utf8');
const mock = source.match(/const mock = `([\s\S]*?)`;/)[1];
const authSource = await readFile(new URL('./verify-auth-entry.mjs', import.meta.url), 'utf8');
const authMock = authSource.match(/const mock = `([\s\S]*?)`;/)[1];
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
let external = 0;
const errors = [], passed = [];
async function open(path = '/', body = mock) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', reducedMotion: 'reduce' });
  await context.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname)) { external++; return route.abort(); }
    if (u.pathname === '/src/lib/supabase.ts') return route.fulfill({ contentType: 'application/javascript', body });
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173' + path);
  return { page, context };
}
try {
  const { page, context } = await open();
  await page.getByRole('heading', { name: 'Cross Reading', exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, '/');
  assert.equal(await page.getByRole('region', { name: '나의 개인 사주 풀이' }).count(), 0);
  assert.equal(await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button').count(), 3);
  const daily = page.getByRole('button', { name: /오늘 풀이 열기/ });
  assert.ok((await daily.boundingBox()).y < 350);
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  passed.push('signed-in home with visible choices and three navigation items');
  await daily.focus(); await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: '오늘의 운세', level: 1 }).waitFor();
  const answer = page.getByRole('region', { name: '일운', exact: true });
  await answer.waitFor();
  assert.equal(await page.getByRole('region', { name: '월운', exact: true }).count(), 0);
  assert.equal(await answer.locator('details').first().getAttribute('open'), null);
  await answer.locator('summary').first().click();
  await answer.getByText(/천간을 오행·음양으로 비교한/).waitFor();
  await page.locator('input[type=date]').fill('2026-10-11');
  const first = await answer.textContent();
  await page.locator('input[type=date]').fill('2026-10-12');
  await page.getByText(/2026-10-12의 한국 시간 정오/).waitFor();
  assert.notEqual(await answer.textContent(), first);
  await page.locator('input[type=date]').fill('');
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('region', { name: '일운', exact: true }).count(), 0);
  await page.getByRole('button', { name: '오늘로 돌아가기', exact: true }).click();
  await answer.waitFor();
  passed.push('keyboard opens daily reading; date changes, empty-date recovery and expandable basis');
  await page.goBack(); await page.getByRole('heading', { name: 'Cross Reading', exact: true }).waitFor();
  passed.push('browser Back returns to home');
  for (const [topic, label, period] of [['month', '월간 운세', '월운'], ['year', '연간 운세', '연운']]) {
    await page.getByRole('button', { name: new RegExp(label) }).click();
    await page.getByRole('heading', { name: label, level: 1 }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/readings/' + topic);
    await page.getByRole('region', { name: period, exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: /^(일운|월운|연운) ·/ }).count(), 1);
    await page.reload(); await page.getByRole('region', { name: period, exact: true }).waitFor();
    await page.getByRole('button', { name: '뒤로', exact: true }).click();
  }
  passed.push('month/year cards open only their own period and survive reload');
  await page.getByRole('button', { name: /내 기질/ }).click();
  await page.getByRole('heading', { name: '나의 특징', exact: false }).waitFor();
  assert.equal(await page.getByRole('region', { name: '나의 개인 사주 풀이' }).count(), 0);
  await page.locator('summary').first().click();
  await page.getByText('해석 근거', { exact: true }).first().waitFor();
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  passed.push('temperament has own explanation and optional evidence without all other readings');
  await page.getByRole('button', { name: '홈', exact: true }).click();
  await page.getByRole('button', { name: /우리 궁합은 어떨까/ }).click();
  await page.getByRole('heading', { name: '관계', exact: true }).waitFor();
  await page.getByRole('button', { name: /가상 친구님과 나/ }).click();
  await page.getByRole('region', { name: '한눈에 보는 우리 궁합' }).waitFor();
  passed.push('compatibility card leads to existing real room selector and result');
  await context.close();
  const profile = await open('/me');
  await profile.page.getByRole('region', { name: '내 사주 캐릭터' }).waitFor();
  assert.equal(await profile.page.getByRole('region', { name: '나의 개인 사주 풀이' }).count(), 0);
  await profile.page.getByRole('button', { name: '내 정보·알림 설정', exact: true }).click();
  await profile.page.getByRole('heading', { name: '설정', exact: true }).waitFor();
  await profile.context.close();
  passed.push('compact profile retains character, topic links and settings');
  const loggedOut = await open('/readings/month', authMock);
  await loggedOut.page.getByRole('button', { name: '카카오 계정으로 로그인', exact: true }).waitFor();
  await loggedOut.page.evaluate(() => window.__auth.behavior = 'complete');
  await loggedOut.page.getByRole('button', { name: '카카오 계정으로 로그인', exact: true }).click();
  await loggedOut.page.getByRole('heading', { name: '월간 운세', level: 1 }).waitFor();
  assert.equal(new URL(loggedOut.page.url()).pathname, '/readings/month');
  await loggedOut.context.close();
  passed.push('login preserves requested reading deep link');
  const invalid = await open('/readings/unknown');
  await invalid.page.getByRole('heading', { name: 'Cross Reading', exact: true }).waitFor();
  assert.equal(new URL(invalid.page.url()).pathname, '/');
  await invalid.context.close();
  passed.push('unknown reading safely returns to home');
  assert.equal(external, 0); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed, externalRequests: external, pageErrors: errors.length, screenshots: 0 }));
} finally { await browser.close(); }
