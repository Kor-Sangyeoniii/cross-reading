import { describe, expect, it } from 'vitest'
import { computeSaju } from './saju'
import { personalPeriods, readPillar } from './personalReading'
import { GOD_CONTENT, withParticle } from './readingContent'
import {
  connectionChapters,
  natalGodSources,
  natalNarrative,
  periodNarrative,
  tenGodChapters,
} from './readingNarrative'
import { shinsalChapters, togetherChapters } from './shinsalNarrative'
import { analyzeShinsal, SHINSAL, type ShinsalName } from './shinsal'

const birth = {
  year: 1992,
  month: 1,
  day: 12,
  calendar: 'solar' as const,
  time: { hour: 8, minute: 0 },
}
const chart = computeSaju(birth)
const text = (v: unknown) => JSON.stringify(v)

describe('detailed readings grounded in calculated positions', () => {
  it('uses Korean particles correctly for stems and terms', () => {
    expect(withParticle('갑', '은/는')).toBe('갑은')
    expect(withParticle('무', '은/는')).toBe('무는')
    expect(withParticle('겁재', '으로/로')).toBe('겁재로')
    expect(withParticle('비견', '으로/로')).toBe('비견으로')
    expect(withParticle('역마살', '으로/로')).toBe('역마살로')
    expect(withParticle('정인', '이/가')).toBe('정인이')
    expect(withParticle('갑목(甲木)', '을/를')).toBe('갑목(甲木)을')
    expect(withParticle('겁재', '이에요/예요')).toBe('겁재예요')
  })
  it('derives all seven natal sources, preserving the actual character and comparison basis', () => {
    const sources = natalGodSources(chart)
    expect(sources).toHaveLength(7)
    expect(sources.find((s) => s.source === '시주 천간')).toMatchObject({
      character: '갑',
      god: '정인',
      position: 'hour',
    })
    expect(sources.find((s) => s.source === '일주 지지')?.basis).toContain(
      '지지 해(亥)의 대표 지장간',
    )
    for (const s of sources) {
      const chapters = tenGodChapters(
        chart,
        s.god,
        s.source,
        s.basis,
        s.position,
      )
      expect(chapters[0].paragraphs[0]).toContain(s.basis)
      expect(chapters[1].title).toContain(s.source)
      expect(chapters[2].paragraphs).toContain(GOD_CONTENT[s.god].work)
      expect(chapters[3].paragraphs).toContain(GOD_CONTENT[s.god].relationship)
    }
  })
  it('changes the report with the real birth rather than only a nickname or date heading', () => {
    const other = computeSaju({ ...birth, day: 13 })
    const a = natalNarrative(chart),
      b = natalNarrative(other)
    expect(a.lead.join(' ')).toContain('월주 신축')
    expect(a.lead.join(' ')).toContain('일지 해')
    expect(a.lead.join(' ')).toContain('시주 갑진')
    expect(a.chapters[1].paragraphs).not.toEqual(b.chapters[1].paragraphs)
    expect(a.chapters[3].paragraphs).not.toEqual(b.chapters[3].paragraphs)
    expect(text(a)).not.toContain('undefined')
  })
  it('distinguishes the day master from element counts and does not infer strength or a useful god', () => {
    const report = natalNarrative(chart)
    const distribution = report.chapters.find((c) => c.title.startsWith('5.'))!
    for (const [el, n] of Object.entries(chart.elements))
      expect(text(distribution)).toContain(`${el} ${n}개`)
    expect(text(distribution)).toContain('신강·신약이나 용신을 정하지 않아요')
    expect(text(report)).toContain('일간은 비교의 기준')
  })
  it('omits unknown hour sources and explicitly explains that limitation before reading', () => {
    const c = computeSaju({ ...birth, time: null })
    expect(natalGodSources(c)).toHaveLength(5)
    expect(natalGodSources(c).some((s) => s.position === 'hour')).toBe(false)
    const report = natalNarrative(c)
    expect(report.lead[0]).toContain('시주는 미상')
    expect(text(report)).not.toContain('시주 갑진')
    expect(report.chapters[3].paragraphs[0]).toContain('산출하지 않았어요')
  })
  it('marks uncertain natal and transit inputs prominently, including position details', () => {
    const c = computeSaju({
      ...birth,
      year: 2024,
      month: 2,
      day: 4,
      time: null,
    })
    expect(c.yearMonthUncertain).toBe(true)
    expect(natalNarrative(c).lead.join(' ')).toContain(
      '연주·월주는 확인이 필요',
    )
    const source = natalGodSources(c).find((s) => s.position === 'month')!
    expect(
      tenGodChapters(
        c,
        source.god,
        source.source,
        source.basis,
        source.position,
      )[0].paragraphs[0],
    ).toContain('확인이 필요')
    const p = personalPeriods(c, '2024-02-04')
    const r = periodNarrative(c, p.month, 'month', p.date, p.monthBoundary)
    expect(r.lead.join(' ')).toContain('출생 원국의 연주·월주')
    expect(r.lead.join(' ')).toContain('정오 기준')
  })
  it('uses birth day master when explaining a transit, retaining natal data', () => {
    const original = structuredClone(chart)
    const p = readPillar(chart, { heavenlyStem: '갑', earthlyBranch: '자' })
    expect(p.stemGod).toBe('정인')
    const r = periodNarrative(chart, p, 'day', '2026-10-16')
    expect(r.lead.join(' ')).toContain('내 일간 정화')
    expect(r.chapters[1].paragraphs[0]).toContain('천간 갑은 양목')
    expect(r.chapters[1].paragraphs[0]).toContain('정인')
    expect(r.chapters[4].paragraphs[0]).toContain('시주 천간 갑의 정인')
    expect(chart).toEqual(original)
  })
  it('explains different timescales even with the same transit characters', () => {
    const p = readPillar(chart, { heavenlyStem: '갑', earthlyBranch: '자' })
    const day = periodNarrative(chart, p, 'day', '2026-10-16')
    const month = periodNarrative(chart, p, 'month', '2026-10-16')
    const year = periodNarrative(chart, p, 'year', '2026-10-16')
    const luck = periodNarrative(chart, p, 'luck', '약 30~39세 구간')
    expect(text(day.chapters[0])).toContain('하루는 연락 한 번')
    expect(text(month.chapters[0])).toContain('절기 구간')
    expect(text(year.chapters[0])).toContain('입춘')
    expect(text(luck.chapters[0])).toContain('근사 구간')
    expect(
      new Set([day, month, year, luck].map((r) => text(r.chapters[0]))).size,
    ).toBe(4)
    expect(luck.lead.join(' ')).toContain('약 30~39세 구간')
  })
  it('enumerates only actual natal/transit connections with their positions', () => {
    const p = readPillar(chart, { heavenlyStem: '기', earthlyBranch: '유' })
    const result = analyzeShinsal(chart, undefined, {
      label: p.label,
      title: '일운',
    })
    const report = periodNarrative(chart, p, 'day', '2026-10-16')
    for (const c of result.connections.filter((c) => c.transit)) {
      expect(text(report.chapters[4])).toContain(c.title)
      expect(connectionChapters(c, chart)[0].paragraphs[0]).toBe(c.basis)
    }
    const hour = result.connections.find(
      (c) => c.title === '시주 ↔ 일운 · 천간합',
    )!
    expect(text(connectionChapters(hour, chart))).toContain('시주 갑진')
    expect(text(connectionChapters(hour, chart))).not.toContain('월주 신축는')
  })
  it('expands an actual noble/day + white tiger/hour without inventing cancellation', () => {
    const r = analyzeShinsal(chart)
    const pair = r.together.find(
      (p) => p.a === '천을귀인' && p.b === '백호대살',
    )!
    const chapters = togetherChapters(pair)
    expect(text(chapters)).toContain('일주 정해의 천을귀인')
    expect(text(chapters)).toContain('시주 갑진의 백호대살')
    expect(text(chapters)).toContain('중간 점검')
    expect(text(chapters)).toContain(
      '천을귀인이 백호의 작용을 없앤다는 뜻은 아니에요',
    )
    expect(
      analyzeShinsal(chart, {
        twelveBase: 'year',
        baekhoScope: 'day',
      }).together.some((p) => p.b === '백호대살'),
    ).toBe(false)
    const hit = r.natalHits.find((h) => h.id === 'hour-백호대살')!
    const details = shinsalChapters(chart, hit, r.natalHits)
    expect(text(details)).toContain('시주 갑진')
    expect(text(details)).toContain('반안살도 함께 표시')
    expect(text(details)).toContain('천간 갑은 정인')
  })
  it('treats transit shinsal as a period observation rather than a new birth pillar', () => {
    const r = analyzeShinsal(chart, undefined, { label: '을유', title: '일운' })
    const hit = r.transitHits.find((h) => h.name === '천을귀인')!
    const details = shinsalChapters(chart, hit, [
      ...r.natalHits,
      ...r.transitHits,
    ])
    expect(text(details)).toContain('원국에 신살이 새로 생겼다는 뜻은 아니에요')
    expect(text(details)).toContain('원국 정해는 그대로')
    expect(text(details)).not.toContain('일운 을유는 이 화면에서')
  })
  it('provides distinct work and relationship content for all ten gods and all 19 supported shinsal', () => {
    expect(Object.keys(GOD_CONTENT)).toHaveLength(10)
    expect(new Set(Object.values(GOD_CONTENT).map((c) => c.work)).size).toBe(10)
    expect(
      new Set(Object.values(GOD_CONTENT).map((c) => c.relationship)).size,
    ).toBe(10)
    const chapterSets = (Object.keys(SHINSAL) as ShinsalName[]).map((name) =>
      shinsalChapters(
        chart,
        {
          id: `day-${name}`,
          name,
          position: 'day',
          title: '일주',
          label: '정해',
          basis: '합성 원고 검증용',
          uncertain: false,
        },
        [],
      ),
    )
    expect(new Set(chapterSets.map((chapters) => text(chapters[2]))).size).toBe(
      19,
    )
    expect(new Set(chapterSets.map((chapters) => text(chapters[3]))).size).toBe(
      19,
    )
    expect(text(chapterSets)).not.toMatch(/undefined|NaN/)
  })
})
