// Generate a public product asset from original vector art, never a page screenshot.
// Node 22.18+ or 24; Playwright is installed outside the checkout.
import { writeFile } from 'node:fs/promises';
import { characterDrawing } from '../src/core/characterArt.ts';
const { chromium } = await import(process.env.CR_PLAYWRIGHT_MODULE ?? '/tmp/cross-motion/node_modules/playwright/index.mjs');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#e6e0fa"/><circle cx="920" cy="330" r="256" fill="#f7f1e8"/><g font-family="system-ui, sans-serif" fill="#282438"><text x="66" y="94" font-size="23" font-weight="800" letter-spacing="6">CROSS READING</text><text x="62" y="238" font-size="83" font-weight="900">너랑 나,</text><text x="62" y="338" font-size="74" font-weight="900">무슨 조합일까?</text><text x="66" y="410" font-size="30">통하는 순간도, 다른 박자도.</text><text x="66" y="456" font-size="30">우리의 궁합을 캐릭터로 만나봐요.</text><text x="66" y="568" font-size="22">사주·성향을 활용한 참고용 관계 이야기</text></g><g transform="translate(640 160) rotate(-8 120 120) scale(1.55)">${characterDrawing('sprout')}</g><g transform="translate(870 240) rotate(10 120 120) scale(1.55)">${characterDrawing('star')}</g></svg>`;
const browser=await chromium.launch({executablePath:process.env.CR_CHROMIUM_PATH ?? '/usr/bin/chromium',args:['--no-sandbox']});
try {
 const page=await browser.newPage();
 const data=await page.evaluate(async svg=>{const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;canvas.getContext('2d').drawImage(image,0,0);return canvas.toDataURL('image/png').split(',')[1]},svg);
 await writeFile(new URL('../public/og-image.png',import.meta.url),Buffer.from(data,'base64'));
 console.log('Generated original 1200x630 public brand asset; no screenshots.');
} finally {await browser.close()}
