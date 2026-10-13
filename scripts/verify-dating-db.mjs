// Isolated PostgreSQL WASM. No network, real users, secrets, production database or mocks of SQL.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const ids = [1,2,3,4].map(n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
const passed=[];
async function check(name, fn) { await fn(); passed.push(name); }
async function as(role,user,sql,params=[]) {
  await db.exec(`set role ${role}`);
  try { await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']); return (await db.query(sql,params)).rows; }
  finally { await db.exec('reset role'); }
}
const user=(n,sql,params=[])=>as('authenticated',ids[n-1],sql,params);
const server=(sql,params=[])=>as('service_role',null,sql,params);
const field=(rows)=>Object.values(rows[0])[0];
try {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;`);
  for(const id of ids) await db.query('insert into auth.users values($1)',[id]);
  await db.exec(await readFile(new URL('../supabase/migrations/20261013000001_dating_pilot.sql',import.meta.url),'utf8'));
  await check('all nine dating tables have RLS',async()=>{ const rows=(await db.query("select relname from pg_class join pg_namespace on pg_namespace.oid=relnamespace where nspname='public' and relkind='r' and relname like 'dating_%' and relrowsecurity")).rows;assert.equal(rows.length,9); });
  for(let n=1;n<=4;n++) await user(n,"select public.dating_save_profile($1,'서울 서북권',array['토요일 오후'],'천천히 알아가는 연애',$2,$3,'pilot-2026-10-13')",[`합성 인물 ${n}`,n%2?'woman':'man',n%2?'man':'woman']);
  await check('self profile only; no client self verification or service config write',async()=>{
    assert.equal((await user(1,'select * from public.dating_members')).length,1);
    await assert.rejects(user(1,'update public.dating_members set adult_verified=true'));
    await assert.rejects(user(1,'update public.dating_config set enabled=true'));
    await assert.rejects(as('anon',null,'select public.dating_catalog()'));
  });
  await check('live gate closed by default, no unverified introductions',async()=>{
    await user(1,'select public.dating_activity(true)');
    assert.deepEqual(field(await user(1,'select public.dating_catalog()')),[]);
    await assert.rejects(user(1,'select public.dating_interest($1)',[ids[1]]));
    await server('update public.dating_config set enabled=true');
    assert.deepEqual(field(await user(1,'select public.dating_catalog()')),[]);
  });
  await server("update public.dating_members set adult_verified=true,photo_reviewed=true,verified_until=now()+interval '365 days',status='active'");
  await check('catalog has reciprocal matching and no private verification fields',async()=>{const catalog=field(await user(1,'select public.dating_catalog()'));assert.equal(catalog.length,2);assert.deepEqual(Object.keys(catalog[0]).sort(),['area','intent','nickname','slots','user_id']);});
  const c1=field(await user(1,'select public.dating_interest($1)',[ids[1]]));
  await check('one-sided interest cannot create a payment order',()=>assert.rejects(user(1,'select public.dating_create_order($1)',[c1])));
  assert.equal(field(await user(2,'select public.dating_interest($1)',[ids[0]])),c1);
  const o1=field(await user(1,'select public.dating_create_order($1)',[c1]));
  const o2=field(await user(2,'select public.dating_create_order($1)',[c1]));
  await check('orders are idempotent and inaccessible to an unrelated user',async()=>{assert.equal(field(await user(1,'select public.dating_create_order($1)',[c1])).orderId,o1.orderId);await assert.rejects(user(3,'select public.dating_create_order($1)',[c1]));await assert.rejects(user(1,'select * from public.dating_orders'));});
  await check('client cannot settle payments; mismatched receipt rejected',async()=>{await assert.rejects(user(1,"select public.dating_record_payment($1,'synthetic-p1',3000,'KRW')",[o1.orderId]));await assert.rejects(server("select public.dating_record_payment($1,'synthetic-p1',1,'KRW')",[o1.orderId]));});
  await server("select public.dating_record_payment($1,'synthetic-p1',3000,'KRW')",[o1.orderId]);
  await check('one paid order cannot send; duplicate payment does not reset deadline',async()=>{await assert.rejects(user(1,"select public.dating_send($1,'가상 인사')",[c1]));const before=field(await server('select expires_at from public.dating_connections where id=$1',[c1]));await server("select public.dating_record_payment($1,'synthetic-p1',3000,'KRW')",[o1.orderId]);assert.deepEqual(field(await server('select expires_at from public.dating_connections where id=$1',[c1])),before);});
  await server("select public.dating_record_payment($1,'synthetic-p2',3000,'KRW')",[o2.orderId]);
  await check('two paid orders open a member-only conversation',async()=>{assert.equal(field(await server('select status from public.dating_connections where id=$1',[c1])),'open');await user(1,"select public.dating_send($1,'합성 인사의 대화')",[c1]);assert.equal((await user(2,'select * from public.dating_messages')).length,1);assert.equal((await user(3,'select * from public.dating_messages')).length,0);await assert.rejects(user(3,"select public.dating_send($1,'침입')",[c1]));await assert.rejects(user(1,"select public.dating_send($1,'https://example.com')",[c1]));await assert.rejects(user(1,"select public.dating_send($1,'   ')",[c1]));});
  const report=field(await user(1,"select public.dating_report($1,'money')",[c1]));
  await check('report is private, idempotent, and does not itself restrict',async()=>{assert.equal(field(await user(1,"select public.dating_report($1,'money')",[c1])),report);assert.equal((await user(2,'select * from public.dating_reports')).length,0);assert.equal(field(await server('select status from public.dating_members where user_id=$1',[ids[1]])),'active');await assert.rejects(user(1,"select public.dating_review($1,true,'공개 사유',$2,'합성 근거로 운영 검토함')",[report,ids[0]]));});
  await check('blocking stops conversation without automatic refund of opened service',async()=>{await user(1,'select public.dating_block($1)',[ids[1]]);await assert.rejects(user(2,"select public.dating_send($1,'차단 후 인사')",[c1]));assert.equal(field(await server('select status from public.dating_orders where id=$1',[o1.orderId])),'paid');await assert.rejects(user(1,'select public.dating_cancel($1)',[c1]));});
  await server("select public.dating_review($1,true,'금전 요구 위반 확인',$2,'합성 증거와 소명을 검토하여 제한함')",[report,ids[3]]);
  await check('server review is audited and target can appeal but cannot unrestrict',async()=>{assert.equal(field(await server('select status from public.dating_members where user_id=$1',[ids[1]])),'restricted');const reviews=await user(2,'select * from public.dating_reviews');assert.equal(reviews.length,1);assert.equal((await user(3,'select * from public.dating_reviews')).length,0);await user(2,'select public.dating_appeal($1)',[reviews[0].id]);await assert.rejects(user(1,'select public.dating_appeal($1)',[reviews[0].id]));await assert.rejects(user(2,'select public.dating_activity(true)'));assert.equal((await server('select * from public.dating_review_audit')).length,1);});
  await check('refund failure remains retryable, completion idempotent and server-only',async()=>{await assert.rejects(user(1,"select public.dating_settle_refund($1,'synthetic-p1',true)",[o1.orderId]));await server("select public.dating_settle_refund($1,'synthetic-p1',false)",[o1.orderId]);assert.equal(field(await server('select status from public.dating_orders where id=$1',[o1.orderId])),'refund_failed');await server("select public.dating_settle_refund($1,'synthetic-p1',true)",[o1.orderId]);await server("select public.dating_settle_refund($1,'synthetic-p1',false)",[o1.orderId]);assert.equal(field(await server('select status from public.dating_orders where id=$1',[o1.orderId])),'refunded');});
  await server("select public.dating_restore($1,$2,'합성 재검토 근거에 따라 제한을 해제함')",[ids[1],ids[3]]);
  await check('restored member must actively opt in again',async()=>{assert.equal(field(await server('select status from public.dating_members where user_id=$1',[ids[1]])),'paused');await user(2,'select public.dating_activity(true)');assert.equal(field(await server('select status from public.dating_members where user_id=$1',[ids[1]])),'active');});
  const c2=field(await user(3,'select public.dating_interest($1)',[ids[3]]));await user(4,'select public.dating_interest($1)',[ids[2]]);
  const o3=field(await user(3,'select public.dating_create_order($1)',[c2]));const o4=field(await user(4,'select public.dating_create_order($1)',[c2]));
  await server("select public.dating_record_payment($1,'synthetic-p3',3000,'KRW')",[o3.orderId]);
  await server("update public.dating_connections set expires_at=now()-interval '1 second' where id=$1",[c2]);
  await check('deadline job closes unpaid counterpart and queues only actual payments',async()=>{assert.equal(field(await server('select public.dating_expire()')),1);assert.equal(field(await server('select status from public.dating_orders where id=$1',[o3.orderId])),'refund_pending');assert.equal(field(await server('select status from public.dating_orders where id=$1',[o4.orderId])),'created');});
  await check('late provider receipt becomes refund, never reopens chat',async()=>{assert.equal(field(await server("select public.dating_record_payment($1,'synthetic-p4',3000,'KRW')",[o4.orderId])),'refund_pending');assert.equal(field(await server('select status from public.dating_connections where id=$1',[c2])),'closed');await assert.rejects(user(4,"select public.dating_send($1,'늦은 결제 인사')",[c2]));});
  await check('paused service still provides own refund dashboard and reporting',async()=>{await server('update public.dating_config set enabled=false');const own=field(await user(3,'select public.dating_dashboard()'));assert.equal(own.length,1);assert.equal(own[0].myPayment,'refund_pending');assert.ok(!JSON.stringify(own).includes('synthetic-p'));await user(3,"select public.dating_report($1,'other')",[c2]);});
  await check('seven-day inactivity removes a member from discovery',async()=>{await server('update public.dating_config set enabled=true');await server("update public.dating_members set confirmed_at=now()-interval '7 days' where user_id=$1",[ids[0]]);assert.deepEqual(field(await user(1,'select public.dating_catalog()')),[]);});
  console.log(JSON.stringify({passed, count:passed.length, database:'isolated PGlite PostgreSQL', productionRequests:0}));
} finally { await db.close(); }
