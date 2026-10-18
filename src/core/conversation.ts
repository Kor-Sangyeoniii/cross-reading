export interface ConversationMessage {
  id: string
  sender: string
  body: string
}
export const MAX_IMPORT_BYTES = 300_000
export const MAX_IMPORT_CHARS = 100_000
export const MAX_IMPORT_MESSAGES = 2000
const systemLine =
  /^(?:-{3,}|\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*[월화수목금토일]요일|저장한 날짜|저장한 시간|대화 저장|.*님과 카카오톡 대화|.*님이 (?:들어왔습니다|나갔습니다|초대했습니다))|^\[(?:사진|동영상|파일|이모티콘)\]$/
const attachment =
  /^(?:사진(?:\s*\d+장)?|동영상|이모티콘|파일:.*|삭제된 메시지입니다\.?|메시지가 삭제되었습니다\.?)$/

/** Selected text only; no filesystem/network/storage/logging and no raw-input errors. */
export function parseConversation(text: string): {
  messages: ConversationMessage[]
  skipped: number
} {
  if (text.length > MAX_IMPORT_CHARS)
    throw new Error('대화가 너무 길어요. 10만 자 이내로 나눠 주세요.')
  const messages: ConversationMessage[] = []
  let skipped = 0,
    previous: ConversationMessage | undefined
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line.trim()) continue
    if (systemLine.test(line)) {
      previous = undefined
      skipped++
      continue
    }
    const match =
      line.match(
        /^\[([^\]\r\n]{1,80})\]\s*\[(?:(?:오전|오후)\s*)?\d{1,2}:\d{2}(?:\s*[AP]M)?\]\s?(.*)$/i,
      ) ??
      line.match(
        /^\d{4}[년./-]\s*\d{1,2}[월./-]\s*\d{1,2}일?\.?\s+(?:(?:오전|오후)\s*)?\d{1,2}:\d{2}(?:\s*[AP]M)?\s*,\s*([^:\r\n]{1,80})\s*:\s?(.*)$/i,
      )
    if (match) {
      previous = undefined
      if (attachment.test(match[2].trim())) {
        skipped++
        continue
      }
      if (messages.length >= MAX_IMPORT_MESSAGES)
        throw new Error('메시지 2,000개 이내로 나눠 주세요.')
      previous = {
        id: String(messages.length + 1),
        sender: match[1].trim(),
        body: match[2],
      }
      messages.push(previous)
    } else if (previous) {
      previous.body += '\n' + line
    } else skipped++
  }
  const nonempty = messages.filter((m) => m.body.trim())
  if (!nonempty.length)
    throw new Error(
      '인식할 수 있는 대화가 없어요. 안내된 카카오톡 텍스트 형식인지 확인해 주세요.',
    )
  if (new Set(nonempty.map((m) => m.sender)).size > 20)
    throw new Error('참여자 20명 이내의 대화로 나눠 주세요.')
  return { messages: nonempty, skipped }
}
export function conversationStats(messages: ConversationMessage[]) {
  const senders = [...new Set(messages.map((m) => m.sender))]
  return senders.map((sender) => {
    const own = messages.filter((m) => m.sender === sender)
    return {
      sender,
      count: own.length,
      questions: own.filter((m) => /[?？]/.test(m.body)).length,
      averageLength: Math.round(
        own.reduce((n, m) => n + m.body.length, 0) / own.length,
      ),
    }
  })
}
export function replySuggestions(body: string) {
  if (!body.trim()) return null
  const cases = [
    {
      pattern: /송금|계좌|인증번호|비밀번호|투자|돈.*빌려|입금|코인/,
      topic: '금전·민감정보 관련 표현',
      reason:
        '금전이나 인증정보에 관한 단어가 있어요. 문맥과 진위를 직접 확인하고, 압박 속에서 결정하지 않도록 경계를 표현하는 문장을 제안해요.',
      replies: [
        '돈이나 인증정보를 보내는 요청에는 응할 수 없어.',
        '지금 결정하지 않고 사실관계를 따로 확인할게. 이 요청은 여기서 멈춰줘.',
      ],
    },
    {
      pattern: /연락하지|그만|싫어|부담|하지\s*마/,
      topic: '중단·거절 관련 표현',
      reason:
        '거절이나 중단을 나타낼 수 있는 표현이 있어요. 설득을 이어가기보다 상대가 원하는 경계를 확인하고 존중하는 문장이에요.',
      replies: [
        '알겠어. 더 권하지 않을게. 말해줘서 고마워.',
        '네가 불편한 부분을 존중할게. 지금은 여기서 멈출게.',
      ],
    },
    {
      pattern: /서운|화났|짜증|왜\s*맨날|섭섭|미안|다퉜/,
      topic: '서운함·갈등 관련 표현',
      reason:
        '감정을 나타낼 수 있는 단어를 찾았어요. 누가 잘못했는지 판단하지 않고 어떤 상황이 힘들었는지 확인하는 문장이에요.',
      replies: [
        '그렇게 느꼈구나. 어떤 부분이 가장 마음에 걸렸는지 들어보고 싶어.',
        '바로 변명하기보다 네 이야기를 먼저 듣고 싶어. 지금 이야기해도 괜찮을까?',
      ],
    },
    {
      pattern: /힘들|지쳤|피곤|우울|속상|걱정/,
      topic: '피로·고민 관련 표현',
      reason:
        '힘든 마음이나 피로에 관한 표현이 있어요. 해결책을 먼저 주기보다 듣기와 도움 중 무엇을 원하는지 묻는 문장이에요.',
      replies: [
        '많이 힘들었겠다. 지금은 들어주는 게 좋을까, 같이 방법을 찾아볼까?',
        '바로 답하지 않아도 괜찮아. 네가 편할 때 이야기해줘.',
      ],
    },
    {
      pattern: /언제|몇\s*시|주말|만날|만나|약속|시간.*돼/,
      topic: '일정·만남 관련 표현',
      reason:
        '일정이나 만남에 관한 단어가 있어요. 내 가능한 시간을 확인한 뒤 조건을 구체적으로 말해보세요.',
      replies: [
        '가능한 시간을 확인해볼게. 너는 어느 시간대가 편해?',
        '만나는 시간과 장소를 같이 정해보자. 부담 없는 방식이 있으면 말해줘.',
      ],
    },
    {
      pattern: /[?？]/,
      topic: '질문이 포함된 메시지',
      reason:
        '물음표가 있는 메시지예요. 구체적인 답은 내 상황에 맞춰 적고, 필요하면 상대가 궁금해하는 범위를 확인해요.',
      replies: [
        '내 생각을 정리해서 말해볼게. 특히 어떤 부분이 궁금해?',
        '조금 더 알아보고 답하고 싶어. 잠깐 시간을 줘도 괜찮을까?',
      ],
    },
  ]
  return (
    cases.find((item) => item.pattern.test(body)) ?? {
      topic: '열린 대화',
      reason:
        '특정 상황을 확신하기 어려워요. 단정하지 않고 상대의 이야기를 더 듣는 문장을 제안해요.',
      replies: [
        '이야기해줘서 고마워. 그때 너는 어떻게 느꼈어?',
        '조금 더 듣고 싶어. 어떤 부분이 가장 기억에 남았어?',
      ],
    }
  )
}
