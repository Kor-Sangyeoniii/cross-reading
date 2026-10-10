import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { computeSaju } from '../core/saju'
import { ElementFlow } from './ElementFlow'
import { DailyReading } from './DailyReading'
import { CompatFactList } from './ReadingDetails'
const chart = computeSaju({ year: 1990, month: 6, day: 15, calendar: 'solar', time: null }, new Date('2026-10-10T00:00:00Z'))
describe('풀이 화면', () => {
  it('흐름은 다섯 개의 키보드 버튼과 방향 텍스트·상세 근거를 제공한다', () => {
    const html = renderToStaticMarkup(<ElementFlow elements={chart.elements} hourKnown={false} />)
    expect(html.match(/상세 풀이"/g)).toHaveLength(5)
    expect(html).toContain('목 → 화')
    expect(html).toContain('해석 근거')
    expect(html).toContain('일상 예시')
    expect(html).toContain('시주 두 글자는 제외')
  })
  it('날짜 선택·오늘 버튼·풀이 범위를 표시한다', () => {
    const html = renderToStaticMarkup(<DailyReading chart={chart} />)
    expect(html).toContain('type="date"')
    expect(html).toContain('한국 시간')
    expect(html).toContain('오늘로 돌아가기')
    expect(html).toContain('길흉을 계산한 풀이가 아니에요')
  })
  it('이전 서버의 facts에도 근거와 생활 예시를 보강한다', () => {
    const html = renderToStaticMarkup(<CompatFactList facts={[{ code: 'controls', kind: 'difference', text: '가상 풀이' }]} />)
    expect(html).toContain('가상 풀이')
    expect(html).toContain('나쁜 관계를 뜻하지 않아요')
    expect(html).toContain('후보 두 개와 결정 시간')
  })
})
