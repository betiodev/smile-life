// ---------------------------------------------------------------------------
// Smile Life — hasard reproductible
// Générateur pseudo-aléatoire à graine (mulberry32). Son état est un simple
// entier 32 bits rangé dans state.rng : une partie se rejoue à l'identique à
// partir de sa graine et de la liste des actions.
// Le hasard du navigateur est interdit dans src/game/ (un test le vérifie).
// state.rng et state.seed ne sont JAMAIS envoyés dans une vue (ils
// permettraient de prédire la pioche).
// ---------------------------------------------------------------------------

// graine quelconque (nombre ou texte) → entier 32 bits non signé
export function seedFrom(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0
  // texte : hachage FNV-1a
  let h = 0x811c9dc5
  for (const ch of String(seed)) {
    h ^= ch.codePointAt(0)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

// graine aléatoire pour une partie lancée sans graine (vrai hasard du système)
export function randomSeed() {
  const a = new Uint32Array(1)
  globalThis.crypto.getRandomValues(a)
  return a[0]
}

// une étape de mulberry32 : (état) → [nouvel état, nombre dans [0, 1[)
function mulberry32(st) {
  const next = (st + 0x6d2b79f5) >>> 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [next, ((t ^ (t >>> 14)) >>> 0) / 4294967296]
}

// nombre dans [0, 1[ tiré du générateur de l'état s (avance s.rng)
export function nextRandom(s) {
  const [st, x] = mulberry32(s.rng)
  s.rng = st
  return x
}

// entier dans [0, n[
export function randomInt(s, n) {
  return Math.floor(nextRandom(s) * n)
}

// élément au hasard d'une liste (undefined si vide, sans consommer de tirage)
export function pick(s, arr) {
  return arr.length === 0 ? undefined : arr[randomInt(s, arr.length)]
}

// fonction () → [0, 1[ liée à l'état s, pour shuffle()
export const rngOf = (s) => () => nextRandom(s)

// générateur autonome (hors état de partie), pour les tests et le simulateur
export function makeRng(seed) {
  let st = seedFrom(seed)
  return () => {
    const [next, x] = mulberry32(st)
    st = next
    return x
  }
}
