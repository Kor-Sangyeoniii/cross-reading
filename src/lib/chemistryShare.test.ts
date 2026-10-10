import { describe, expect, it } from 'vitest'
import { chemistryShareSvg } from './chemistryShare'
import type { PairCompat } from '../core/compat'
const base: PairCompat = { a: 'private-id-a', b: 'private-id-b', facts: [], questions: ['비공개 대화 질문'], notes: ['가상 생일 1990-06-15'] }
describe('anonymous chemistry card', () => {
  it('exports catalog copy, never names, birth input, messages or IDs', () => {
    const svg = chemistryShareSvg({ ...base, facts: [{ kind: 'match', code: 'generates', text: '가상 비밀닉네임 <script>leak</script> private-id-a' }] })
    expect(svg).toContain('서로의 부스터')
    for (const privateText of ['private-id', '비밀닉네임', '1990-06-15', '비공개', '<script>', '/invite/', 'access_token']) expect(svg).not.toContain(privateText)
    expect(svg).toContain('관계를 판정하지 않아요')
    expect(svg).toContain('width="1080" height="1350"')
  })
  it('shows both kinds of signal in the shared result', () => {
    const svg = chemistryShareSvg({ ...base, facts: [{ kind: 'match', code: 'generates', text: '' }, { kind: 'difference', code: 'controls', text: '' }] })
    expect(svg).toContain('잘 통하는 포인트')
    expect(svg).toContain('맞춰볼 포인트')
    expect(svg).toContain('서로에게 힘을 보태는 관계')
    expect(svg).toContain('일을 풀어가는 속도가 달라요')
  })
  it('unknown facts cannot inject markup into the exported card', () => {
    const svg = chemistryShareSvg({ ...base, facts: [{ kind: 'difference', code: '"><image href="https://private.invalid"/>', text: 'private input' }] })
    expect(svg).not.toContain('private.invalid')
    expect(svg).not.toContain('private input')
    expect(svg).toContain('함께 살펴볼 관계 포인트')
  })
})
