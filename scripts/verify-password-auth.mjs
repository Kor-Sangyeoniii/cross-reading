// Reuse the synthetic Supabase baseline from CR-015; no real emails are sent.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.CR_PLAYWRIGHT_MODULE ?? '/tmp/cross-motion/node_modules/playwright/index.mjs');
const out=process.env.CR_PASSWORD_CAPTURE_DIR ?? '/tmp/cross-password';await mkdir(out,{recursive:true});
const baseline=await readFile(new URL('./verify-auth-entry.mjs',import.meta.url),'utf8');
const original=baseline.match(/const mock = `([\s\S]*?)`;/)?.[1];assert.ok(original);
const mock=original.replace('session:null', 'session:window.__recovery?session:null')+`
state.emailCalls=[];
function result(kind){state.emailCalls.push(kind);if(state.behavior==='throw')throw new Error('private provider details');if(state.behavior==='error')return {data:{session:null},error:{message:'private provider details'}};return {data:{session:null},error:null}}
supabase.auth.signUp=async()=>{const r=result('signup');if(!r.error&&state.behavior==='complete'){state.callback?.('SIGNED_IN',session);return {data:{session},error:null}};return r};
supabase.auth.signInWithPassword=async()=>{const r=result('login');if(!r.error){state.callback?.('SIGNED_IN',session);return {data:{session},error:null}};return r};
supabase.auth.resetPasswordForEmail=async()=>result('recover');
supabase.auth.updateUser=async()=>result('update');
`;
const browser=await chromium.launch({executablePath:process.env.CR_CHROMIUM_PATH ?? '/usr/bin/chromium',args:['--no-sandbox']});
let external=0;const errors=[];
async function open(path='/',recovery=false){
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR'});
 await context.addInitScript(value=>{window.__recovery=value},recovery);
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(u.hostname)){external++;return route.abort()};if(u.pathname==='/src/lib/supabase.ts')return route.fulfill({contentType:'application/javascript',body:mock});return route.continue()});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173'+path);return {context,page};
}
async function fill(page,signup=false){await page.getByLabel('아이디 (이메일)',{exact:true}).fill('synthetic@example.invalid');await page.getByLabel('비밀번호',{exact:true}).fill('synthetic-pass');if(signup)await page.getByLabel('비밀번호 확인',{exact:true}).fill('synthetic-pass')}
try {
 const {page,context}=await open();await page.getByRole('heading',{name:'로그인',exact:true}).waitFor();
 for(const width of [360,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/login-'+width+'.png',fullPage:true})}
 await page.getByRole('button',{name:'회원가입',exact:true}).click();await fill(page,true);
 await page.getByLabel('비밀번호 확인',{exact:true}).fill('different-pass');
 await page.getByRole('button',{name:'아이디·비밀번호로 회원가입',exact:true}).click();await page.getByRole('alert').filter({hasText:'일치하지'}).waitFor();assert.equal(await page.evaluate(()=>window.__auth.emailCalls.length),0);
 await fill(page,true);await page.evaluate(()=>window.__auth.behavior='confirm');
 await page.getByRole('button',{name:'아이디·비밀번호로 회원가입',exact:true}).click();
 await page.getByRole('status').filter({hasText:'가입 요청을 처리했어요'}).waitFor();
 assert.equal(await page.getByLabel('비밀번호',{exact:true}).inputValue(),'');assert.equal(await page.getByRole('heading',{name:'시작하기 전에',exact:true}).count(),0);
 assert.equal(await page.evaluate(()=>window.__auth.writes),0);await page.screenshot({path:out+'/confirmation.png',fullPage:true});
 await page.getByRole('button',{name:'로그인으로 돌아가기',exact:true}).click();await fill(page);await page.evaluate(()=>window.__auth.behavior='throw');
 await page.getByRole('button',{name:'아이디·비밀번호로 로그인',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByText('private provider details').count(),0);assert.ok(await page.getByRole('button',{name:'카카오 계정으로 로그인',exact:true}).isEnabled());
 await page.getByRole('button',{name:'비밀번호를 잊으셨나요?',exact:true}).click();await page.evaluate(()=>window.__auth.behavior='confirm');
 await page.getByRole('button',{name:'재설정 메일 받기',exact:true}).click();await page.getByRole('status').filter({hasText:'가입된 이메일이면'}).waitFor();await page.screenshot({path:out+'/recovery.png',fullPage:true});
 const stored=await page.evaluate(()=>Object.values(sessionStorage).concat(Object.values(localStorage)));assert.ok(stored.every(v=>!v.includes('synthetic-pass')&&!v.includes('synthetic@example.invalid')));
 await context.close();
 for(const existing of [true,false]){
  const next=await open();await next.page.getByRole('button',{name:'아이디·비밀번호로 로그인',exact:true}).waitFor();await next.page.evaluate(value=>{window.__auth.existing=value;window.__auth.behavior='complete'},existing);await fill(next.page);await next.page.getByRole('button',{name:'아이디·비밀번호로 로그인',exact:true}).click();await next.page.getByRole('heading',{name:existing?'관계':'시작하기 전에',exact:true}).waitFor();await next.context.close();
 }
 const signup=await open();await signup.page.getByRole('button',{name:'회원가입',exact:true}).click();await signup.page.evaluate(()=>{window.__auth.existing=false;window.__auth.behavior='complete'});await fill(signup.page,true);await signup.page.getByRole('button',{name:'아이디·비밀번호로 회원가입',exact:true}).click();await signup.page.getByRole('heading',{name:'시작하기 전에',exact:true}).waitFor();await signup.context.close();
 const invite='/invite/'+'b'.repeat(64);const invited=await open(invite);await fill(invited.page);await invited.page.evaluate(()=>window.__auth.behavior='complete');await invited.page.getByRole('button',{name:'아이디·비밀번호로 로그인',exact:true}).click();await invited.page.getByRole('heading',{name:'초대',exact:true}).waitFor();assert.equal(new URL(invited.page.url()).pathname,invite);assert.ok(!(await invited.page.evaluate(()=>window.__auth.rpcs)).includes('accept_invite'));await invited.context.close();
 const event=await open();await event.page.getByRole('heading',{name:'로그인',exact:true}).waitFor();await event.page.evaluate(()=>{window.__auth.callback('PASSWORD_RECOVERY',{user:{id:'00000000-0000-0000-0000-000000000001'},access_token:'synthetic',refresh_token:'synthetic'})});await event.page.getByRole('heading',{name:'비밀번호 재설정',exact:true}).waitFor();assert.equal(new URL(event.page.url()).pathname,'/auth/reset-password');await event.context.close();
 const invalid=await open('/auth/reset-password');await invalid.page.getByRole('alert').filter({hasText:'링크를 확인할 수 없어요'}).waitFor();assert.equal(await invalid.page.getByRole('button',{name:'비밀번호 변경',exact:true}).count(),0);await invalid.context.close();
 const reset=await open('/auth/reset-password',true);await reset.page.getByLabel('새 비밀번호',{exact:true}).fill('synthetic-new-pass');await reset.page.getByLabel('새 비밀번호 확인',{exact:true}).fill('synthetic-new-pass');await reset.page.evaluate(()=>{window.__auth.behavior='confirm'});await reset.page.getByRole('button',{name:'비밀번호 변경',exact:true}).click();await reset.page.getByRole('status').filter({hasText:'비밀번호를 변경했어요'}).waitFor();assert.deepEqual(await reset.page.evaluate(()=>window.__auth.emailCalls),['update']);await reset.context.close();
 const failed=await open('/auth/reset-password?error=access_denied',true);await failed.page.getByRole('alert').waitFor();assert.equal(await failed.page.getByRole('button',{name:'비밀번호 변경',exact:true}).count(),0);await failed.context.close();
 assert.equal(external,0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:['mobile forms without overflow','signup mismatch prevents API','confirmation wait without profile/session','failure retry and sanitized errors','generic recovery response','no credential persistence','existing/new password login routing','immediate-session signup','invite preserved without acceptance','recovery event opens dedicated screen','unsigned reset rejected','authenticated password update','failed recovery link rejected'],externalRequests:external,pageErrors:errors.length,captureDir:out}));
} finally {await browser.close()}
