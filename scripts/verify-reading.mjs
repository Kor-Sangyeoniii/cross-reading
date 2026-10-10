// Install browser tools outside the checkout; see docs/CR-012-validation.md.
const { chromium } = await import(process.env.CR_PLAYWRIGHT_MODULE ?? '/tmp/cross-browser/node_modules/playwright/index.mjs');
import assert from 'node:assert/strict';

const mock = `
import {computeSaju} from '/src/core/saju.ts';
import {groupCompat} from '/src/core/compat.ts';
const me='00000000-0000-0000-0000-000000000001', other='00000000-0000-0000-0000-000000000002', room='10000000-0000-0000-0000-000000000001';
const user={id:me,app_metadata:{provider:'kakao'},user_metadata:{},aud:'authenticated',created_at:'2026-10-10T00:00:00Z'};
const session={user,access_token:'synthetic-token',refresh_token:'synthetic-refresh',expires_at:9999999999};
const profile={id:me,nickname:'가상 사용자',birth_year:1990,birth_month:6,birth_day:15,calendar:'solar',is_leap_month:false,birth_hour:null,birth_minute:null,mbti:'ENTJ'};
const members=[{user_id:me,nickname:'가상 사용자',mbti:'ENTJ',share_summary:true,joined_at:'2026-10-10T00:00:00Z'}, {user_id:other,nickname:'가상 친구',mbti:'ISFP',share_summary:true,joined_at:'2026-10-10T00:00:00Z'}];
const chart=computeSaju({year:1990,month:6,day:15,calendar:'solar',time:null});
const compat=groupCompat([{id:me,nickname:'가상 사용자',chart,mbti:'ENTJ'},{id:other,nickname:'가상 친구',chart,mbti:'ISFP'}]);
const state=window.__fake={messages:[{id:1,room_id:room,sender_id:other,body:'가상 첫 메시지',member_count_at_send:2,created_at:'2026-10-10T00:00:00Z'}],channels:[],blocked:false,delay:0,fail:false};
function event(m,kind='INSERT'){ for(const c of state.channels) for(const h of c.handlers) if(h.options.table==='messages'&&(h.options.event===kind||h.options.event==='*')) h.fn({new:m,old:{id:m.id}}) }
window.__incoming=(body='가상 새 메시지')=>{const m={id:Math.max(0,...state.messages.map(x=>x.id))+1,room_id:room,sender_id:other,body,member_count_at_send:2,created_at:'2026-10-10T00:01:00Z'};state.messages.push(m);event(m);return m.id};
window.__delete=(id)=>{state.messages=state.messages.filter(m=>m.id!==id);event({id},'DELETE')};
window.__disconnect=()=>state.channels.forEach(c=>c.status?.('CHANNEL_ERROR'));
function query(table){const filters=[];let columns='*',limit=50,values=null;
 const q={select(c){columns=c;return q},eq(k,v){filters.push([k,v,false]);return q},neq(k,v){filters.push([k,v,true]);return q},order(){return q},limit(n){limit=n;return q},lt(){return q},insert(v){values=v;return q},delete(){return q},maybeSingle(){return run(true)},single(){return run(true)},then(resolve,reject){return run(false).then(resolve,reject)}};
 async function run(single){
  if(state.fail&&table==='messages') return {data:null,error:{code:'fake'}};
  let data=[];
  if(table==='profiles')data=[profile];
  if(table==='rooms')data=[{id:room,member_count:2,created_at:'2026-10-10T00:00:00Z'}];
  if(table==='blocks'&&values){state.blocked=true;data=[]}
  if(table==='messages'){
   if(values){const m={id:Math.max(0,...state.messages.map(x=>x.id))+1,...values,member_count_at_send:2,created_at:'2026-10-10T00:02:00Z'};state.messages.push(m);event(m);data=[{id:m.id}]}
   else {data=state.messages.filter(m=>!(state.blocked&&m.sender_id===other)&&filters.every(([k,v,ne])=>ne?m[k]!==v:m[k]===v)).sort((a,b)=>b.id-a.id).slice(0,limit).map(m=>columns==='id'?{id:m.id}:{...m})}
  }
  const snapshot={data:single?data[0]??null:data,error:null};
  if(table==='messages'&&columns!=='id'&&state.delay) await new Promise(r=>setTimeout(r,state.delay));
  return snapshot;
 }
 return q;
}
export const supabase={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:query,rpc:async(name)=>({data:name==='get_room_members'?members:null,error:null}),functions:{invoke:async(name)=>name==='room-compat'?{data:compat,error:null}:{data:null,error:{code:'synthetic-push-error'}}},channel(name){const c={name,handlers:[],on(_kind,options,fn){c.handlers.push({options,fn});return c},subscribe(fn){c.status=fn;setTimeout(()=>fn?.('SUBSCRIBED'),10);return c}};state.channels.push(c);return c},removeChannel(c){state.channels=state.channels.filter(x=>x!==c)}};
`;
const browser=await chromium.launch({executablePath:process.env.CR_CHROMIUM_PATH ?? '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR'});
let external=0; const errors=[];
await context.route('**/*',async route=>{const url=new URL(route.request().url()); if(!['127.0.0.1','localhost'].includes(url.hostname)){external++;return route.abort()};if(url.pathname==='/src/lib/supabase.ts')return route.fulfill({contentType:'application/javascript',body:mock});return route.continue()});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
console.log('check: start');
await page.goto('http://127.0.0.1:5173/');
await page.getByRole('heading',{name:'관계',exact:true}).waitFor();
await page.getByRole('button',{name:/새 메시지가 있는 모임 1개/}).waitFor();
await page.getByRole('button',{name:'내 프로필',exact:true}).click();
await page.getByRole('heading',{name:'오행 흐름',exact:true}).waitFor();
await page.getByRole('button',{name:/수, \d+글자, 상세 풀이/}).click();
assert.equal(await page.getByRole('heading',{name:'물 · 관찰과 쉼',exact:true}).count(),1);
await page.getByRole('button',{name:'상극 · 조절'}).click();
assert.ok(await page.getByText('목 → 토 · 화 → 금 · 토 → 수 · 금 → 목 · 수 → 화',{exact:true}).count());
await page.getByRole('button',{name:/금, \d+글자, 상세 풀이/}).focus();await page.keyboard.press('Enter');
assert.equal(await page.getByRole('heading',{name:'쇠 · 정리와 기준',exact:true}).count(),1);
const personal=page.getByRole('region',{name:'나의 개인 사주 풀이'});
assert.equal(await personal.locator('details').count(),5,'unknown hour excludes hour readings');
await personal.locator('summary').first().click();
await personal.getByText(/생활 예시/).first().waitFor();
if (process.env.CR_CAPTURE_SCREENSHOTS === '1') await personal.screenshot({path:'/tmp/cross-browser/personal-natal.png',style:'.topbar, .tabs { display: none !important; }'});
await page.getByRole('tab',{name:'대운',exact:true}).click();
await personal.locator('select').selectOption('male');
await personal.getByText(/출생시간이 필요해요/).waitFor();
await page.getByRole('tab',{name:'연·월·일',exact:true}).click();
const date=page.locator('input[type=date]');await date.fill('2026-10-11');
await page.getByText(/2026-10-11의 한국 시간 정오/).waitFor();
await date.fill('2026-10-12');await page.getByText(/2026-10-12의 한국 시간 정오/).waitFor();
await page.getByRole('button',{name:'오늘로 돌아가기'}).click();
assert.notEqual(await date.inputValue(),'2026-10-12');
assert.equal(await personal.getByRole('heading',{name:/^(연운|월운|일운) ·/}).count(),3);
await personal.locator('summary').first().click();
if (process.env.CR_CAPTURE_SCREENSHOTS === '1') await personal.screenshot({path:'/tmp/cross-browser/personal-periods.png',style:'.topbar, .tabs { display: none !important; }'});
for(const width of [360,390,430]) {await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth), 'horizontal overflow at '+width);await page.evaluate(()=>window.scrollTo(0,0));if (process.env.CR_CAPTURE_SCREENSHOTS === '1') await page.screenshot({path:'/tmp/cross-browser/profile-'+width+'.png',fullPage:true})}
await page.getByRole('button',{name:/새 메시지가 있는 모임 1개/}).click();
console.log('check: room');
await page.getByRole('button',{name:/가상 친구님과 나/}).click();
await page.getByRole('region',{name:'한눈에 보는 우리 궁합'}).waitFor();
await page.locator('[role=tab]').filter({hasText:'대화'}).locator('.badge').waitFor();
await page.getByRole('tab',{name:/대화/}).click();await page.getByText('가상 첫 메시지',{exact:true}).waitFor();
console.log('check: read');
await page.waitForFunction(()=>!document.body.textContent.includes('새 메시지가 있는 모임'));
await page.getByRole('tab',{name:'궁합',exact:true}).click();
await page.evaluate(()=>{window.__fake.delay=500});
await page.getByRole('tab',{name:'대화',exact:true}).click();
await page.waitForTimeout(100);await page.evaluate(()=>window.__incoming('가상 조회 중 도착'));
await page.getByText('가상 조회 중 도착',{exact:true}).waitFor();
console.log('check: read');
await page.waitForFunction(()=>!document.body.textContent.includes('새 메시지가 있는 모임'));
await page.evaluate(()=>{window.__fake.delay=0});
await page.getByRole('tab',{name:'궁합',exact:true}).click();
await page.evaluate(()=>window.__incoming('가상 탭 밖 도착'));
await page.locator('[role=tab]').filter({hasText:'대화'}).locator('.badge').waitFor();
await page.getByRole('tab',{name:/대화/}).click();await page.getByText('가상 탭 밖 도착',{exact:true}).waitFor();
await page.getByRole('textbox',{name:'메시지',exact:true}).fill('가상 발신 확인');
await page.getByRole('button',{name:'보내기',exact:true}).click();
await page.getByText('가상 발신 확인',{exact:true}).waitFor();
await page.getByText(/메시지는 보냈지만 웹 푸시 요청/).waitFor();
assert.equal(await page.locator('[role=tab]').filter({hasText:'대화'}).locator('.badge').count(),0,'own message must not count unread');
await page.evaluate(()=>window.__delete(1));await page.waitForFunction(()=>!document.body.textContent.includes('가상 첫 메시지'));
await page.getByRole('button',{name:'뒤로',exact:true}).click();
console.log('check: disconnect');
await page.evaluate(()=>{window.__fake.fail=true;window.__disconnect()});
await page.getByText(/새 메시지 확인이 지연/).waitFor();
await page.evaluate(()=>{window.__fake.fail=false;window.__incoming('가상 복구 확인')});
if(await page.getByRole('button',{name:'다시 확인',exact:true}).count()) await page.getByRole('button',{name:'다시 확인',exact:true}).click();
await page.getByRole('button',{name:/새 메시지가 있는 모임 1개/}).waitFor();
console.log('check: room');
await page.getByRole('button',{name:/가상 친구님과 나/}).click();await page.getByRole('tab',{name:/대화/}).click();
await page.getByText('가상 복구 확인',{exact:true}).waitFor();
const hiddenRead = await page.evaluate(() => {
 const before = sessionStorage.getItem('cr:read:00000000-0000-0000-0000-000000000001');
 Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
 document.dispatchEvent(new Event('visibilitychange'));
 window.__incoming('가상 백그라운드 도착');
 return before;
});
await page.waitForTimeout(100);
assert.equal(await page.evaluate(() => sessionStorage.getItem('cr:read:00000000-0000-0000-0000-000000000001')), hiddenRead, 'background message must not be marked read');
await page.evaluate(() => { delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
await page.getByText('가상 백그라운드 도착', { exact: true }).waitFor();
await page.waitForFunction(()=>!document.body.textContent.includes('새 메시지가 있는 모임'));
await page.getByRole('button', { name: '신고·차단', exact: true }).first().click();
await page.getByRole('button', { name: '차단하기', exact: true }).click();
await page.getByText('차단했어요.', { exact: true }).waitFor();
await page.getByRole('button', { name: '확인', exact: true }).click();
await page.evaluate(() => window.__incoming('가상 차단 후 도착'));
await page.waitForTimeout(100);
assert.equal(await page.getByText('가상 차단 후 도착', { exact: true }).count(), 0);
assert.equal(await page.getByRole('button', { name: /새 메시지가 있는 모임/ }).count(), 0);
const stored=await page.evaluate(()=>Object.entries(sessionStorage));
assert.ok(stored.every(([k,v])=>!v.includes('가상')&&!v.includes('1990')),'read storage must contain only IDs');
assert.equal(external,0);assert.deepEqual(errors,[]);
const known=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR'});
await known.route('**/*',async route=>{const url=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(url.hostname)){external++;return route.abort()};if(url.pathname==='/src/lib/supabase.ts')return route.fulfill({contentType:'application/javascript',body:mock.replace('birth_hour:null,birth_minute:null','birth_hour:5,birth_minute:30')});return route.continue()});
const kp=await known.newPage();kp.on('pageerror',e=>errors.push(e.message));
await kp.goto('http://127.0.0.1:5173/');
await kp.getByRole('button',{name:'내 프로필',exact:true}).click();
const kr=kp.getByRole('region',{name:'나의 개인 사주 풀이'});
assert.equal(await kr.locator('details').count(),7);
await kp.getByRole('tab',{name:'대운',exact:true}).click();
await kr.getByLabel('대운 순·역행 계산 기준').selectOption('male');
await kr.getByText(/순행 · 출생 후/).waitFor();
const cycles=kr.getByLabel('10년 흐름 선택');
assert.equal(await cycles.locator('option').count(),10);
await cycles.selectOption('0');
const forward=await kr.getByRole('heading',{name:/선택한 대운/}).textContent();
await kr.locator('summary').first().click();
if (process.env.CR_CAPTURE_SCREENSHOTS === '1') await kr.screenshot({path:'/tmp/cross-browser/personal-luck.png',style:'.topbar, .tabs { display: none !important; }'});
await kr.getByLabel('대운 순·역행 계산 기준').selectOption('female');
await kr.getByText(/역행 · 출생 후/).waitFor();
await cycles.selectOption('0');
assert.notEqual(await kr.getByRole('heading',{name:/선택한 대운/}).textContent(),forward);
assert.equal(errors.length,0);
assert.equal(external,0);
await known.close();
console.log(JSON.stringify({passed:['personal natal details and missing birth time','ten decade cycles and explicit opposite directions','year month day panels','mobile flow click and keyboard','date selection and today','360/390/430px no overflow','profile and compatibility screens','incoming notice outside chat','read clears only on visible chat','message during initial fetch retained','own message excluded','push failure preserves sent message','delete event','connection failure and resync','read storage contains IDs only','background arrival not marked read','blocked sender omitted from messages and notice'],externalRequests:external,pageErrors:errors.length}));
} finally { await browser.close(); }
