/** 오류를 화면에 보여줄 문장으로. AppError·입력 오류는 이미 쉬운 문장이고, 그 밖의 원문은 보여주지 않는다. */
export function messageOf(e: unknown): string {
  if (e instanceof Error && ['AppError', 'ProfileInputError', 'SajuInputError'].includes(e.name)) return e.message
  return '잠시 후 다시 시도해 주세요.'
}
