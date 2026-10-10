import type { CharacterKind } from './chemistry'

// Original inline vector mascots; no external image request or personal seed.
export function characterDrawing(kind: CharacterKind, alternate = false) {
  const shape: Record<CharacterKind, string> = {
    sprout: '<path d="M43 98 Q25 81 45 65 Q35 44 57 41 Q65 12 82 31 Q110 24 114 49 Q141 61 120 85 Q135 112 107 123 Q85 147 61 127 Q36 128 43 98Z" fill="#9cce59"/><path d="M79 37Q60 18 54 31Q57 44 79 43M81 36Q91 13 104 22Q108 38 81 43" fill="#447c42"/>',
    sun: '<path d="M81 19L94 32L112 26L117 44L137 48L132 68L148 82L132 98L137 117L115 122L108 140L90 134L74 148L60 130L40 134L34 114L15 106L24 86L13 68L33 57L33 36L56 38L66 19Z" fill="#f5bc4f"/><circle cx="81" cy="82" r="48" fill="#ffda77"/>',
    cloud: '<path d="M29 81C10 47 47 30 66 42C76 15 116 28 119 50C150 47 159 86 137 101C144 131 111 145 91 128C67 146 39 129 43 111C19 111 11 91 29 81Z" fill="'+(alternate?'#b6b7ef':'#9ec9f0')+'"/>',
    star: '<path d="M81 16Q90 16 103 48Q108 54 141 61Q151 66 134 87L119 104L121 135Q119 148 97 135L81 124L57 138Q40 149 41 128L43 105L21 83Q8 67 30 61L56 54L72 22Q76 16 81 16Z" fill="#bcb1f0"/>',
    flame: '<path d="M80 17C114 38 89 54 119 50C144 78 146 107 119 128C98 145 66 145 43 124C18 101 32 76 47 63C49 86 61 77 61 66C52 45 72 39 80 17Z" fill="#ff9475"/><path d="M78 102Q95 89 104 107Q111 126 91 134Q64 136 62 120Q64 106 78 102Z" fill="#ffbd8d"/>',
  }
  return `${shape[kind]}<ellipse cx="56" cy="91" rx="9" ry="5" fill="#ee8d83" opacity=".5"/><ellipse cx="108" cy="91" rx="9" ry="5" fill="#ee8d83" opacity=".5"/><path d="M65 73v9M98 73v9" stroke="#293335" stroke-width="5" stroke-linecap="round"/><path d="M73 93Q82 103 91 93" fill="none" stroke="#293335" stroke-width="3.5" stroke-linecap="round"/>`
}
