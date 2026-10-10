import type { CharacterKind } from '../core/chemistry'

import { characterDrawing } from '../core/characterArt'

export function ChemistryCharacter({ kind, alternate = false }: { kind: CharacterKind; alternate?: boolean }) {
  return <svg viewBox="0 0 164 164" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: characterDrawing(kind, alternate) }} />
}
export function ChemistryDuo({ kinds }: { kinds: [CharacterKind, CharacterKind] }) {
  return <div className="chemistry-duo" aria-hidden="true"><ChemistryCharacter kind={kinds[0]} /><span>✦</span><ChemistryCharacter kind={kinds[1]} alternate /></div>
}
