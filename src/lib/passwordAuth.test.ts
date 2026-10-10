import { beforeEach, describe, expect, it, vi } from 'vitest'
const auth = vi.hoisted(() => ({ signUp: vi.fn(), signInWithPassword: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { auth } }))
import { changePassword, checkPassword, normalizeEmail, passwordAuth } from './passwordAuth'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('window', { location: { origin: 'https://app.example' } })
})
describe('password authentication (synthetic credentials only)', () => {
  it('validates email, preserves password whitespace, and rejects mismatch', () => {
    expect(normalizeEmail(' example@example.invalid ')).toBe('example@example.invalid')
    expect(() => normalizeEmail('user')).toThrow('이메일')
    expect(() => checkPassword('1234567', '1234567')).toThrow('8자')
    expect(() => checkPassword('example-pass', 'different')).toThrow('일치')
    expect(() => checkPassword(' spaces here ', ' spaces here ')).not.toThrow()
  })
  it('signup requests email confirmation without claiming a session', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
    expect(await passwordAuth('signup', ' example@example.invalid ', ' synthetic-pass ', ' synthetic-pass ')).toEqual({ kind: 'confirmation-needed' })
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'example@example.invalid', password: ' synthetic-pass ', options: { emailRedirectTo: 'https://app.example/auth/callback' } })
  })
  it('supports configurations with immediate signup sessions', async () => {
    auth.signUp.mockResolvedValue({ data: { session: { user: { id: 'synthetic' } } }, error: null })
    expect(await passwordAuth('signup', 'example@example.invalid', 'synthetic-pass', 'synthetic-pass')).toEqual({ kind: 'signed-in' })
  })
  it('logs in through the official password API, without signup fallback', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null })
    expect(await passwordAuth('login', 'example@example.invalid', 'old-pass')).toEqual({ kind: 'signed-in' })
    expect(auth.signUp).not.toHaveBeenCalled()
  })
  it('validates input before calling providers', async () => {
    await expect(passwordAuth('login', 'example@example.invalid')).rejects.toThrow('비밀번호')
    await expect(passwordAuth('signup', 'example@example.invalid', 'short', 'short')).rejects.toThrow('8자')
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
    expect(auth.signUp).not.toHaveBeenCalled()
  })
  it('sanitizes both returned and thrown errors', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'private input' } })
    await expect(passwordAuth('login', 'example@example.invalid', 'synthetic')).rejects.toThrow('인증하지 못했어요')
    auth.signInWithPassword.mockRejectedValue(new Error('private input'))
    await expect(passwordAuth('login', 'example@example.invalid', 'synthetic')).rejects.not.toThrow('private input')
  })
  it('maps rate limit and unconfirmed email without exposing identifiers', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { code: 'email_not_confirmed', message: 'private' } })
    await expect(passwordAuth('login', 'example@example.invalid', 'synthetic')).rejects.toThrow('확인 메일')
    auth.resetPasswordForEmail.mockResolvedValue({ error: { code: 'over_email_send_rate_limit' } })
    await expect(passwordAuth('recover', 'example@example.invalid')).rejects.toThrow('요청이 많아요')
  })
  it('requests recovery at a dedicated route and updates only through Auth', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    expect(await passwordAuth('recover', 'example@example.invalid')).toEqual({ kind: 'recovery-requested' })
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('example@example.invalid', { redirectTo: 'https://app.example/auth/reset-password' })
    auth.updateUser.mockResolvedValue({ error: null })
    await changePassword('synthetic-new-pass', 'synthetic-new-pass')
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'synthetic-new-pass' })
  })
})
