// Server-side only. Never import into the app or run from a public workflow.
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { open, readFile, lstat, realpath, rename } from 'node:fs/promises';
import { isAbsolute, relative, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

class ProvisionError extends Error {}

export const PROJECT_URL = 'https://bfntkulpspknuuwmnhfx.supabase.co';
export const FIXTURES = [
  { nickname: '테스트 모리', birth_year: 1990, birth_month: 6, birth_day: 15, birth_hour: 5, birth_minute: 30, mbti: 'ENTJ' },
  { nickname: '테스트 타오', birth_year: 1994, birth_month: 11, birth_day: 23, birth_hour: 14, birth_minute: 20, mbti: 'ISFP' },
  { nickname: '테스트 도담', birth_year: 1988, birth_month: 3, birth_day: 8, birth_hour: 9, birth_minute: 10, mbti: 'ENFP' },
  { nickname: '테스트 몽울', birth_year: 1998, birth_month: 9, birth_day: 2, birth_hour: null, birth_minute: null, mbti: null },
];
export function newManifest() {
  return { project: PROJECT_URL, batch: randomUUID(), accounts: FIXTURES.map((profile, index) => {
    const email = `cross-reading-test-0${index + 1}@example.invalid`;
    const h = createHash('sha256').update(PROJECT_URL + email).digest('hex');
    const id = `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
    return { id, email, password: randomBytes(24).toString('base64url'), profile, authCreated: false, profileCreated: false };
  }) };
}
export async function provision(manifest, { key, request = fetch, save = async () => {} }) {
  if (!key) throw new ProvisionError('Missing SUPABASE_SERVICE_ROLE_KEY; no accounts created.');
  if (manifest.project !== PROJECT_URL || manifest.accounts.length !== 4) throw new ProvisionError('Unexpected test manifest.');
  const expected = newManifest().accounts;
  for (const [index, account] of manifest.accounts.entries()) {
    if (account.id !== expected[index].id || account.email !== expected[index].email || !account.password || account.password.length < 24) throw new ProvisionError('Unexpected test account identity.');
  }
  async function call(path, method = 'GET', body, allowMissing = false) {
    let response;
    try { response = await request(PROJECT_URL + path, { method, redirect: 'error', signal: AbortSignal.timeout(20000), headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
    catch { throw new ProvisionError('Supabase request failed; use the same private manifest to resume.'); }
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) throw new ProvisionError(`Supabase operation failed (HTTP ${response.status}); response body withheld.`);
    if (response.status === 204 || response.headers.get('content-length') === '0') return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  for (const account of manifest.accounts) {
    let user = await call(`/auth/v1/admin/users/${account.id}`, 'GET', undefined, true);
    user = user?.user ?? user;
    if (!user) {
      if (account.authCreated) throw new ProvisionError('A previously created test user is missing; refusing to recreate it.');
      user = await call('/auth/v1/admin/users', 'POST', { id: account.id, email: account.email, password: account.password, email_confirm: true, app_metadata: { test_fixture: 'CR-021', fixture_batch: manifest.batch }, user_metadata: { synthetic: true } });
      user = user?.user ?? user;
    }
    if (user?.id !== account.id || user?.email !== account.email || user?.app_metadata?.test_fixture !== 'CR-021' || user?.app_metadata?.fixture_batch !== manifest.batch) throw new ProvisionError('Existing user does not belong to this private test manifest; refusing changes.');
    account.authCreated = true; await save(manifest);
    if (!account.profileCreated) {
      const at = new Date().toISOString();
      const profile = FIXTURES[manifest.accounts.indexOf(account)];
      const solar = `${profile.birth_year}-${String(profile.birth_month).padStart(2,'0')}-${String(profile.birth_day).padStart(2,'0')}`;
      await call('/rest/v1/profiles?on_conflict=id', 'POST', { id: account.id, ...profile, calendar: 'solar', is_leap_month: false, solar_birth_date: solar, age_14_confirmed: true, terms_agreed_at: at, privacy_agreed_at: at, marketing_agreed_at: null });
      account.profileCreated = true; await save(manifest);
    }
  }
  return { created: manifest.accounts.filter(a => a.authCreated && a.profileCreated).length };
}
async function main() {
  // Secrets are supplied only by the environment's secure binding, never CLI args.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new ProvisionError('Missing SUPABASE_SERVICE_ROLE_KEY; no accounts created.');
  const output = process.argv[2];
  const repo = fileURLToPath(new URL('../', import.meta.url));
  if (!output || !isAbsolute(output) || !relative(repo, resolve(output)).startsWith('..')) throw new ProvisionError('Provide an absolute private manifest path outside the checkout.');
  const actualOutput = resolve(await realpath(dirname(output)), basename(output));
  if (!relative(repo, actualOutput).startsWith('..')) throw new ProvisionError('Manifest must be outside the checkout.');
  let manifest;
  try {
    const stat = await lstat(output);
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw new ProvisionError('Manifest must be a private regular file (0600).');
    manifest = JSON.parse(await readFile(output, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    manifest = newManifest();
    const file = await open(output, 'wx', 0o600);
    try { await file.writeFile(JSON.stringify(manifest, null, 2)); } finally { await file.close(); }
  }
  const save = async value => {
    const temporary = output + '.' + randomUUID() + '.tmp';
    const file = await open(temporary, 'wx', 0o600);
    try { await file.writeFile(JSON.stringify(value, null, 2)); await file.sync(); } finally { await file.close(); }
    await rename(temporary, output);
  };
  const result = await provision(manifest, { key, save });
  console.log(`Prepared ${result.created} synthetic accounts. Credentials remain in the private manifest; none printed.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error instanceof ProvisionError ? error.message : 'Local manifest operation failed; sensitive details withheld.'); process.exitCode = 1; });
