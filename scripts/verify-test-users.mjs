import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newManifest, provision, PROJECT_URL } from './provision-test-users.mjs';
function fakeServer() {
  const users = new Map(), calls = [];
  const request = async (url, options) => {
    const path = url.slice(PROJECT_URL.length), body = options.body && JSON.parse(options.body);
    calls.push({ path, method: options.method });
    if (path.startsWith('/auth/v1/admin/users/') && options.method === 'GET') return users.has(path.split('/').at(-1)) ? Response.json(users.get(path.split('/').at(-1))) : new Response('', { status: 404 });
    if (path === '/auth/v1/admin/users') { assert.equal(body.email_confirm, true); users.set(body.id, body); return Response.json(body); }
    assert.equal(path, '/rest/v1/profiles?on_conflict=id');
    assert.equal(body.marketing_agreed_at, null);
    return new Response(null, { status: 201 });
  };
  return { users, calls, request };
}
test('requires credential before any network calls', async () => {
  let calls = 0;
  await assert.rejects(provision(newManifest(), { request: async () => { calls++; } }), /Missing/);
  assert.equal(calls, 0);
});
test('four distinct users; no email dispatch; repeat run does not duplicate or reset accounts', async () => {
  const manifest = newManifest(), server = fakeServer();
  assert.equal(new Set(manifest.accounts.map(a => a.password)).size, 4);
  const options = { key: 'synthetic-admin', request: server.request };
  assert.deepEqual(await provision(manifest, options), { created: 4 });
  const writes = server.calls.filter(c => c.method === 'POST').length;
  await provision(manifest, options);
  assert.equal(server.calls.filter(c => c.method === 'POST').length, writes);
  assert.ok(server.calls.every(c => !/invite|recover|signup|mail/.test(c.path)));
});
test('does not touch a user owned by a different manifest', async () => {
  const manifest = newManifest(), server = fakeServer();
  server.users.set(manifest.accounts[0].id, { ...manifest.accounts[0], app_metadata: {} });
  await assert.rejects(provision(manifest, { key: 'synthetic-admin', request: server.request }), /refusing changes/);
  assert.equal(server.calls.filter(c => c.method === 'POST').length, 0);
});
test('provider errors never expose response data or credentials', async () => {
  await assert.rejects(provision(newManifest(), { key: 'synthetic-admin', request: async () => new Response('sensitive-provider-data', { status: 401 }) }), error => error.message.includes('401') && !error.message.includes('sensitive-provider-data'));
});
test('interrupted creation resumes by planned ID without password reset', async () => {
  const manifest = newManifest(), server = fakeServer();
  let fail = true;
  const options = { key: 'synthetic-admin', request: async (url, opts) => { if (fail && url.includes('/rest/')) { fail = false; return new Response(null, { status: 503 }); } return server.request(url, opts); } };
  await assert.rejects(provision(manifest, options), /503/);
  await provision(manifest, options);
  assert.equal(server.calls.filter(c => c.method === 'POST' && c.path === '/auth/v1/admin/users').length, 4);
});
