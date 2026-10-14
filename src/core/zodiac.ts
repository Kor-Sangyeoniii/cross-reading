import type { SajuChart } from './saju'
import { elementPersona, type PersonaElement } from './elementPersona'

export const ZODIAC_ANIMALS = {
  자: ['쥐', '🐭'],
  축: ['소', '🐮'],
  인: ['호랑이', '🐯'],
  묘: ['토끼', '🐰'],
  진: ['용', '🐲'],
  사: ['뱀', '🐍'],
  오: ['말', '🐴'],
  미: ['양', '🐑'],
  신: ['원숭이', '🐵'],
  유: ['닭', '🐔'],
  술: ['개', '🐶'],
  해: ['돼지', '🐷'],
} as const
export const ZODIAC_FORMS: Record<
  PersonaElement,
  { name: string; appearance: string; color: string }
> = {
  목: {
    name: '숲결',
    appearance: '가지와 잎처럼 뻗은 갈기, 차분한 실루엣',
    color: '#5c8155',
  },
  화: {
    name: '불꽃',
    appearance: '치솟는 불꽃 갈기, 강렬한 눈빛과 당당한 자세',
    color: '#c95e35',
  },
  토: {
    name: '대지',
    appearance: '층층이 쌓인 황토색 갈기, 묵직하게 버티는 자세',
    color: '#987241',
  },
  금: {
    name: '은빛',
    appearance: '각이 선 은빛 털, 정돈된 윤곽과 절제된 움직임',
    color: '#8275ac',
  },
  수: {
    name: '물결',
    appearance: '흐르는 남색 갈기, 고요한 눈빛과 유연한 움직임',
    color: '#427a9b',
  },
}

/** Day branch chooses the animal; day stem chooses its form. Counts are a separate layer. */
export function zodiacPersona(chart: SajuChart) {
  const day = chart.cells.find((cell) => cell.pillar === 'day')
  if (
    !day ||
    !Object.prototype.hasOwnProperty.call(ZODIAC_ANIMALS, day.branch.ko)
  )
    throw new Error('일주 정보를 확인하지 못했어요.')
  const [animal, symbol] =
    ZODIAC_ANIMALS[day.branch.ko as keyof typeof ZODIAC_ANIMALS]
  const distribution = elementPersona(chart)
  const form = ZODIAC_FORMS[chart.dayMaster.element]
  return {
    animal,
    symbol,
    form,
    distribution,
    title: `${form.name} ${animal}`,
    branch: day.branch.ko,
    fireMonkey: day.branch.ko === '신' && chart.dayMaster.element === '화',
  }
}
