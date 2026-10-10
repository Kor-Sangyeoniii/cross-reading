// Synthetic authentication only. Install Playwright outside the checkout.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.CR_PLAYWRIGHT_MODULE ?? '/tmp/cross-motion/node_modules/playwright/index.mjs');
const out = process.env.CR_AUTH_CAPTURE_DIR ?? '/tmp/cross-auth';
await mkdir(out, { recursive: true });
const mock = `
const user={id:'00000000-0000-0000-0000-000000000001',app_metadata:{},user_metadata:{},aud:'authenticated'};
const session={user,access_token:'synthetic',refresh_token:'synthetic'};
const profile={nickname:'가상 사용자',birth_year:1990,birth_month:6,birth_day:15,calendar:'solar',is_leap_month:false,birth_hour:null,birth_minute:null,mbti:null};
const state=window.__auth={existing:true,behavior:'error',calls:[],reads:0,writes:0,rpcs:[],callback:null};
function query(table){state.reads++;const q={select(){return q},eq(){return q},order(){return q},insert(){state.writes++;return q},maybeSingle:async()=>({data:table==='profiles'&&state.existing?profile:null,error:null}),then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}};return q}
export const supabase={auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user}}),onAuthStateChange(fn){state.callback=fn;return {data:{subscription:{unsubscribe(){state.callback=null}}}}},async signInWithOAuth(input){state.calls.push(input);if(state.behavior==='throw')throw new Error('synthetic sensitive details');if(state.behavior==='error')return {error:{message:'synthetic sensitive details'}};if(state.behavior==='pending')return new Promise(()=>{});history.replaceState(null,'','/auth/callback');state.callback?.('SIGNED_IN',session);return {error:null}}},channel(){const q={on(){return q},subscribe(fn){fn?.('SUBSCRIBED');return q}};return q},removeChannel(){},from:query,rpc:async(name)=>{state.rpcs.push(name);return {data:[{inviter_nickname:'가상 친구',member_count:2,is_full:false,is_valid:true}],error:null}}};
`;
const browser=await chromium.launch({executablePath:process.env.CR_CHROMIUM_PATH ?? '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
let external=0;const errors=[];
async function open(path='/'){
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR'});
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(url.hostname)){external++;return route.abort()};if(url.pathname==='/src/lib/supabase.ts')return route.fulfill({contentType:'application/javascript',body:mock});return route.continue()});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173'+path);
  await page.getByRole('button',{name:'카카오 계정으로 로그인',exact:true}).waitFor();return {context,page};
}
try {
  const {context,page}=await open();
  assert.equal(await page.evaluate(()=>window.__auth.reads),0);
  for(const width of [360,390,430]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if (process.env.CR_CAPTURE_SCREENSHOTS === '1') await page.screenshot({path:out+'/login-'+width+'.png',fullPage:true});
  }
  await page.getByRole('button',{name:'회원가입',exact:true}).click();
  await page.getByRole('heading',{name:'회원가입',exact:true}).waitFor();
  await page.getByRole('button',{name:'카카오 계정으로 회원가입',exact:true}).waitFor();
  if (process.env.CR_CAPTURE_SCREENSHOTS === '1') await page.screenshot({path:out+'/signup.png',fullPage:true});
  await page.getByRole('button',{name:'로그인으로 돌아가기',exact:true}).click();
  await page.getByRole('button',{name:'카카오 계정으로 로그인',exact:true}).click();
  await page.getByRole('status').filter({hasText:'인증을 시작하지 못했어요'}).waitFor();
  assert.equal(await page.evaluate(()=>window.__auth.calls[0].provider),'kakao');
  assert.equal(await page.getByText('synthetic sensitive details').count(),0);
  assert.ok(await page.getByRole('button',{name:'카카오 계정으로 로그인',exact:true}).isEnabled());
  await page.evaluate(()=>window.__auth.behavior='throw');
  await page.getByRole('button',{name:'구글 계정으로 로그인',exact:true}).click();
  await page.getByRole('status').filter({hasText:'인증을 시작하지 못했어요'}).waitFor();
  assert.ok(await page.getByRole('button',{name:'카카오 계정으로 로그인',exact:true}).isEnabled());
  await page.evaluate(()=>window.__auth.behavior='pending');
  await page.getByRole('button',{name:'카카오 계정으로 로그인',exact:true}).click();
  assert.ok(await page.getByRole('button',{name:'회원가입',exact:true}).isDisabled());
  assert.ok(await page.getByRole('button',{name:'구글 계정으로 로그인',exact:true}).isDisabled());
  await context.close();
  for(const existing of [true,false])for(const signup of [true,false]){
    const next=await open();
    await next.page.evaluate(value=>{window.__auth.existing=value;window.__auth.behavior='complete'},existing);
    if(signup)await next.page.getByRole('button',{name:'회원가입',exact:true}).click();
    await next.page.getByRole('button',{name:signup?'카카오 계정으로 회원가입':'카카오 계정으로 로그인',exact:true}).click();
    await next.page.getByRole('heading',{name:existing?'Cross Reading':'시작하기 전에',exact:true}).waitFor();
    assert.equal(new URL(next.page.url()).pathname,existing?'/':'/onboarding');
    assert.equal(await next.page.evaluate(()=>window.__auth.writes),0);
    await next.context.close();
  }
  const invite='/invite/'+'a'.repeat(64);
  const invited=await open(invite+'?source=synthetic');
  await invited.page.getByRole('button',{name:'회원가입',exact:true}).click();
  await invited.page.evaluate(()=>window.__auth.behavior='complete');
  await invited.page.getByRole('button',{name:'카카오 계정으로 회원가입',exact:true}).click();
  await invited.page.getByRole('heading',{name:'초대',exact:true}).waitFor();
  assert.equal(new URL(invited.page.url()).pathname,invite);
  assert.equal(new URL(invited.page.url()).search,'?source=synthetic');
  assert.ok(!(await invited.page.evaluate(()=>window.__auth.rpcs)).includes('accept_invite'));
  await invited.context.close();
  assert.equal(external,0);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:['login/signup entry switch','Kakao provider dispatch','failure and thrown-error retry without details','pending duplicate prevention','existing member skips signup in both modes','new member starts consent in both modes','no profile write from authentication','invite return preserved without acceptance','360/390/430px no overflow'],externalRequests:external,pageErrors:errors.length,captureDir:out}));
} finally {await browser.close()}
