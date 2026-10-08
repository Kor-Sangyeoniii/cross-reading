import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { computeSaju } from '../core/saju'
import { SajuChart } from './SajuChart'

// Synthetic dates only; no actual user's birth information.
const now = new Date('2026-10-08T12:00:00Z')
const birth = { year: 1992, month: 10, day: 24, calendar: 'solar' as const }
const known = computeSaju({ ...birth, time: { hour: 5, minute: 30 } }, now)
const unknown = computeSaju({ ...birth, time: null }, now)
const render = (chart = known, nickname = '가상지민') => renderToStaticMarkup(<SajuChart chart={chart} nickname={nickname} />)

describe('SajuChart', () => {
  it('renders four pillars in hour/day/month/year order with actual characters and ten gods', () => {
    const html = render()
    expect([...html.matchAll(/<h3[^>]*>(시주|일주|월주|연주)<\/h3>/g)].map((m) => m[1])).toEqual(['시주', '일주', '월주', '연주'])
    expect(html.match(/role="img"/g)).toHaveLength(8)
    for (const cell of known.cells) {
      for (const [kind, char] of [['천간', cell.stem], ['지지', cell.branch]] as const) {
        expect(html).toContain(`aria-label="${cell.title} ${kind} ${char.ko}, ${char.yinYang}의 ${char.element}, ${char.tenGod}"`)
        expect(html).toContain(`>${char.hanja}</span>`)
      }
    }
  })

  it('omits the hour pillar for unknown time and explains the six-character basis', () => {
    const html = render(unknown)
    expect(html.match(/role="group"/g)).toHaveLength(3)
    expect(html.match(/role="img"/g)).toHaveLength(6)
    expect(html).not.toContain('시주')
    expect(html).toContain('출생시간 없이 봤어요')
    expect(html).toContain('총 6글자 기준')
  })

  it('highlights only the day stem and shows its label and reference notice', () => {
    const html = render()
    expect(html.match(/data-day-master="true"/g)).toHaveLength(1)
    expect(html).toMatch(/data-day-master="true" role="img" aria-label="일주 천간/)
    expect(html).toContain(known.dayMaster.label)
    expect(html).toContain('나를 나타내는 글자예요')
    expect(html).toContain('자기이해와 대화를 위한 참고예요.')
    expect(html).not.toContain('출생시간 없이 봤어요')
    expect(html).not.toContain('절기가 바뀌는 날')
  })

  it('shows the boundary warning for a synthetic solar-term date', () => {
    const boundary = computeSaju({ year: 2024, month: 2, day: 4, calendar: 'solar', time: null }, now)
    expect(boundary.yearMonthUncertain).toBe(true)
    const html = render(boundary)
    expect(html).toContain('출생시간 없이 봤어요')
    expect(html).toContain('절기가 바뀌는 날이라 일부 해석이 달라질 수 있어요')
  })

  it.each([known, unknown])('gives all five bars accurate counts and proportions, including zero', (chart) => {
    const html = render(chart)
    const total = Object.values(chart.elements).reduce((a, b) => a + b, 0)
    expect(html.match(/role="meter"/g)).toHaveLength(5)
    for (const [element, count] of Object.entries(chart.elements)) {
      expect(html).toContain(`aria-label="${element} 오행 개수" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${count}" aria-valuetext="${total}글자 중 ${count}개"`)
      expect(html).toContain(`width:${count / total * 100}%`)
    }
  })

  it('treats nicknames as text rather than HTML', () => {
    const html = render(known, '<script>fake</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;fake&lt;/script&gt;님의 사주')
  })
})
