import type { CharacterKind } from '../core/chemistry'

import { withBase } from '../lib/basePath'
import { characterDrawing } from '../core/characterArt'

export function ChemistryCharacter({ kind, alternate = false }: { kind: CharacterKind; alternate?: boolean }) {
  return <svg viewBox="0 0 164 164" data-guardian={kind} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: characterDrawing(kind, alternate, withBase('/characters/guardians.png')) }} />
}
export function ChemistryDuo({ kinds }: { kinds: [CharacterKind, CharacterKind] }) {
  return <div className="chemistry-duo" aria-hidden="true"><ChemistryCharacter kind={kinds[0]} /><span>✦</span><ChemistryCharacter kind={kinds[1]} alternate /></div>
}
