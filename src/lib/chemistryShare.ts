import type { PairCompat } from '../core/compat'
import { chemistryStory } from '../core/chemistry'
import { characterDrawing } from '../core/characterArt'
import { withBase } from './basePath'

export function chemistryShareSvg(pair: PairCompat): string {
  const story = chemistryStory(pair)
  // Only catalog copy goes into the export: never IDs, names, notes, or fact text.
  const match = story.matches[0]?.title ?? '우리의 공통점은 알아가는 중'
  const difference = story.differences[0]?.title ?? '눈에 띄는 차이는 아직 없어요'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" rx="60" fill="${story.color}"/><g font-family="system-ui, sans-serif" fill="#242838"><text x="70" y="108" font-size="28" font-weight="800" letter-spacing="5">CROSS READING · OUR CHEMISTRY</text><text x="540" y="245" text-anchor="middle" font-size="88" font-weight="900">${story.title}</text><text x="540" y="304" text-anchor="middle" font-size="31">${story.tag}</text><ellipse cx="540" cy="726" rx="400" ry="28" fill="#242838" opacity=".08"/><g transform="translate(90 352) scale(2.65)">${characterDrawing(story.characters[0])}</g><g transform="translate(565 352) scale(2.65)">${characterDrawing(story.characters[1], true)}</g><text x="535" y="548" text-anchor="middle" font-size="70">✦</text><rect x="64" y="794" width="952" height="322" rx="36" fill="#fff"/><text x="112" y="859" font-size="29" fill="#38734c" font-weight="800">잘 통하는 포인트</text><text x="112" y="916" font-size="36" font-weight="700">${match}</text><path d="M112 950H968" stroke="#e4e0db"/><text x="112" y="1009" font-size="29" fill="#a74a31" font-weight="800">맞춰볼 포인트</text><text x="112" y="1065" font-size="36" font-weight="700">${difference}</text><text x="540" y="1190" text-anchor="middle" font-size="36" font-weight="800">너랑 나는 무슨 조합일까?</text><text x="540" y="1246" text-anchor="middle" font-size="26">kor-sangyeoniii.github.io/cross-reading/</text><text x="540" y="1305" text-anchor="middle" font-size="22">사주·공개한 MBTI를 활용한 참고용 비유 · 관계를 판정하지 않아요</text></g></svg>`
}
export async function chemistryShareFile(pair: PairCompat): Promise<File> {
  const url = URL.createObjectURL(new Blob([chemistryShareSvg(pair)], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 1080; canvas.height = 1350
    const context = canvas.getContext('2d')
    if (!context) throw new Error('공유 카드를 만들지 못했어요.')
    context.drawImage(image, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error('공유 카드를 만들지 못했어요.')), 'image/png'))
    return new File([blob], 'cross-reading-chemistry.png', { type: 'image/png' })
  } finally { URL.revokeObjectURL(url) }
}
export function publicShareUrl() { return window.location.origin + withBase('/') }
export async function sendOrSaveChemistry(file: File, pair: PairCompat): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const title = chemistryStory(pair).title
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ title: `우리 조합은 ${title}`, text: `너랑 나는 무슨 조합일까? ${publicShareUrl()}`, files: [file] })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      // Unsupported file sharing still has a download fallback.
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url; link.download = file.name
  document.body.append(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
