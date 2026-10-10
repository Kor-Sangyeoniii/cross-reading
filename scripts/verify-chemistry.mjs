// No screenshots, files downloaded to disk, live accounts or outbound shares.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.CR_PLAYWRIGHT_MODULE ?? '/tmp/cross-motion/node_modules/playwright/index.mjs');
const source=await readFile(new URL('./verify-reading.mjs',import.meta.url),'utf8');
const baseline=source.match(/const mock = `([\s\S]*?)`;/)?.[1];assert.ok(baseline);
const multi=baseline+`
const c='00000000-0000-0000-0000-000000000003',d='00000000-0000-0000-0000-000000000004';
members.push({user_id:c,nickname:'가상 친구 세 번째',mbti:null,share_summary:false},{user_id:d,nickname:'가상 친구 네 번째 아주 긴 닉네임',mbti:null,share_summary:false});
const f=(code,kind='match')=>({code,kind,text:'가상 비공개 닉네임과 원문'});
const make=(a,b,facts)=>({a,b,facts,questions:['가상 질문 하나'],notes:[]});
compat.memberCount=4;
compat.pairs=[make(me,other,[f('generates'),f('mbti-JP','difference')]),make(me,c,[f('stem-combine'),f('controls','difference')]),make(me,d,[f('same-element')]),make(other,c,[f('complement')]),make(other,d,[]),make(c,d,[f('branch-clash','difference')])];
window.__compat=compat;
`;
const browser=await chromium.launch({executablePath:process.env.CR_CHROMIUM_PATH ?? '/usr/bin/chromium',args:['--no-sandbox']});
let external=0;const errors=[];
async function open(mock, path='/rooms/10000000-0000-0000-0000-000000000001'){
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR',reducedMotion:'reduce'});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(u.hostname)){external++;return route.abort()};if(u.pathname==='/src/lib/supabase.ts')return route.fulfill({contentType:'application/javascript',body:mock});return route.continue()});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173'+path);return {page,context};
}
try {
 const {page,context}=await open(multi);const card=page.getByRole('region',{name:'한눈에 보는 우리 궁합'});
 await card.getByRole('heading',{name:'서로의 부스터',exact:true}).waitFor();
 assert.equal(await card.locator('svg').count(),2);
 assert.equal(await card.locator('svg').first().evaluate(e=>getComputedStyle(e).animationName),'none');
 const hero=await card.locator('h2').boundingBox();assert.ok(hero.y<450,'result title must appear in first viewport');
 for(const width of [360,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
 const select=page.getByLabel('누구와 누구를 볼까요?');assert.equal(await select.locator('option').count(),6);
 for(const [value,title] of [['1','다른 박자 듀오'],['2','닮은꼴 메이트'],['3','뜻밖의 퍼즐'],['4','알아가는 메이트'],['5','다른 박자 듀오']]){await select.selectOption(value);await card.getByRole('heading',{name:title,exact:true}).waitFor()}
 await select.selectOption('1');await card.getByText('서로 끌리는 지점을 찾아봐요',{exact:true}).waitFor();await card.getByText('일을 풀어가는 속도가 달라요',{exact:true}).waitFor();
 await page.getByText('왜 이런 조합일까? · 해석 근거 보기',{exact:true}).click();await page.getByRole('heading',{name:'잘 통하는 근거',exact:true}).waitFor();
 await page.evaluate(()=>{window.__shareCalls=0;window.__cancelShare=true;Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.__shareCalls++;if(window.__cancelShare)throw new DOMException('Cancelled','AbortError');const f=payload.files[0];window.__shareResult={name:f.name,type:f.type,size:f.size,text:payload.text,header:Array.from(new Uint8Array(await f.arrayBuffer()).slice(0,8))}}})});
 await card.getByRole('button',{name:'우리 조합 카드 공유하기 ↗',exact:true}).click();const sheet=page.getByRole('dialog',{name:'공유할 우리 조합'});
 await sheet.getByRole('button',{name:'이미지 공유 또는 저장',exact:true}).waitFor();
 const img=sheet.getByAltText('공유할 익명 궁합 카드');assert.ok(await img.evaluate(e=>e.complete&&e.naturalWidth===1080&&e.naturalHeight===1350));
 assert.equal(await page.evaluate(()=>window.__shareCalls),0,'preview must not share automatically');
 assert.ok(!(await sheet.textContent()).includes('가상 친구'));
 await sheet.getByRole('button',{name:'이미지 공유 또는 저장',exact:true}).click();assert.equal(await sheet.getByText('공유 요청을 완료했어요.').count(),0);
 await page.evaluate(()=>window.__cancelShare=false);await sheet.getByRole('button',{name:'이미지 공유 또는 저장',exact:true}).click();await sheet.getByRole('status').filter({hasText:'공유 요청을 완료했어요'}).waitFor();
 const shared=await page.evaluate(()=>window.__shareResult);assert.equal(shared.type,'image/png');assert.ok(shared.size>10000);assert.deepEqual(shared.header,[137,80,78,71,13,10,26,10]);assert.ok(!shared.text.includes('/rooms/')&&!shared.text.includes('/invite/')&&!shared.text.includes('가상'));
 await sheet.getByRole('button',{name:'닫기',exact:true}).click();
 // Probe download fallback without allowing a filesystem download or external share.
 const fallback=await page.evaluate(async()=>{const {sendOrSaveChemistry}=await import('/src/lib/chemistryShare.ts');Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});const original=HTMLAnchorElement.prototype.click;let clicks=0;HTMLAnchorElement.prototype.click=function(){if(this.download==='cross-reading-chemistry.png')clicks++};try{return {result:await sendOrSaveChemistry(new File(['synthetic'],'cross-reading-chemistry.png',{type:'image/png'}),window.__compat.pairs[0]),clicks}}finally{HTMLAnchorElement.prototype.click=original}});assert.deepEqual(fallback,{result:'downloaded',clicks:1});
 // Export privacy is checked against full original facts, not the rendered page.
 const svg=await page.evaluate(async()=>{const {chemistryShareSvg}=await import('/src/lib/chemistryShare.ts');return chemistryShareSvg(window.__compat.pairs[1])});assert.ok(!svg.includes('가상')&&!svg.includes('00000000')&&!svg.includes('비공개'));
 await page.getByRole('button',{name:'이 질문으로 대화 시작',exact:true}).click();await page.getByRole('textbox',{name:'메시지',exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'메시지',exact:true}).inputValue(),'가상 질문 하나');assert.equal(await page.evaluate(()=>window.__fake.messages.some(m=>m.body==='가상 질문 하나')),false,'question stays unsent in composer');
 await context.close();
 const third=await open(multi+'\nuser.id=c;');await third.page.getByRole('region',{name:'한눈에 보는 우리 궁합'}).waitFor();assert.equal(await third.page.getByLabel('누구와 누구를 볼까요?').inputValue(),'1');await third.context.close();
 const profile=await open(baseline,'/me');await profile.page.getByRole('region',{name:'내 사주 캐릭터'}).waitFor();assert.equal(await profile.page.getByRole('region',{name:'내 사주 캐릭터'}).locator('svg').count(),1);await profile.context.close();
 const authSource=await readFile(new URL('./verify-auth-entry.mjs',import.meta.url),'utf8');const authMock=authSource.match(/const mock = `([\s\S]*?)`;/)[1];const start=await open(authMock,'/');await start.page.getByRole('heading',{name:'너랑 나, 무슨 조합일까?'}).waitFor();assert.equal(await start.page.locator('.chemistry-duo svg').count(),2);assert.equal(await start.page.getByText('우리 모임은 불(화) 기운이 가장 많아요.').count(),0);await start.context.close();
 assert.equal(external,0);assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:['first viewport result and character pair','five story types across six pairs','default pair includes current viewer','both match and difference visible','expandable evidence','anonymous PNG preview and privacy','cancel does not claim success','native file share after explicit click','download fallback without disk write','question stays unsent','personal character','branded start without fake example','360/390/430px and reduced motion'],externalRequests:external,pageErrors:errors.length,screenshots:0}));
} finally {await browser.close()}
