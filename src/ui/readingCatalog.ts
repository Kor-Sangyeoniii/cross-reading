import type { CharacterKind } from '../core/chemistry'
import type { ReadingTopic } from './router'

export const READING_MENU: Record<ReadingTopic, { title: string; description: string; character: CharacterKind; color: string }> = {
  day: { title: '오늘의 운세', description: '오늘의 흐름과 나를 위한 작은 힌트', character: 'sun', color: '#fff0c9' },
  month: { title: '월간 운세', description: '이번 달, 어떤 흐름일까?', character: 'cloud', color: '#e2edfc' },
  year: { title: '연간 운세', description: '한 해를 바라보는 키워드', character: 'star', color: '#eee5fa' },
  temperament: { title: '내 기질', description: '나다운 점과 관계에서의 모습', character: 'sprout', color: '#e8f0d7' },
  luck: { title: '나의 대운', description: '10년 단위로 살펴보는 변화', character: 'flame', color: '#ffe5da' },
  natal: { title: '원국·십신', description: '비견, 겁재… 내 사주에는?', character: 'star', color: '#f4e6ed' },
  elements: { title: '나의 오행', description: '목·화·토·금·수의 흐름', character: 'sprout', color: '#e1f1eb' },
}

