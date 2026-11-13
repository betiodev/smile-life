// ---------------------------------------------------------------------------
// Smile Life — catalogue des cartes et construction du paquet
// ---------------------------------------------------------------------------
import { BASE_DEFS } from './base.js'

// définitions par extension ; 'base' est toujours dans le jeu
const SETS = { base: BASE_DEFS }

// extensions que l'on peut ajouter à une partie (aucune pour l'instant)
export const EXTENSIONS = Object.keys(SETS).filter((e) => e !== 'base')

// toutes les définitions, par id
export const CATALOGUE = Object.fromEntries(Object.values(SETS).flat().map((d) => [d.id, d]))

// une carte (ou une définition) appartient-elle au groupe `tag` ?
export const hasTag = (card, tag) => !!card?.tags?.includes(tag)

// définitions des cartes d'une partie : base + extensions choisies
export function defsFor(extensions = []) {
  for (const e of extensions)
    if (!EXTENSIONS.includes(e)) throw new Error(`Extension inconnue : ${e}`)
  return ['base', ...extensions].flatMap((e) => SETS[e])
}

// une carte de partie : les champs de la définition + uid + def (id de la définition)
export function instanceOf(d, uid) {
  const { id, count, ...fields } = d
  return { uid, def: id, ...fields, tags: [...fields.tags] }
}

// Paquet complet (toutes les définitions, `count` exemplaires chacune).
// rng (fonction () → [0, 1[) : les uid sont numérotés dans un ordre tiré au
// hasard, pour qu'un uid ne révèle pas la sorte de carte. Sans rng (tests,
// galerie) : numérotés dans l'ordre des définitions.
export function buildDeck(extensions = [], rng = null) {
  const defs = defsFor(extensions).flatMap((d) => Array.from({ length: d.count }, () => d))
  const numbers = defs.map((_, i) => i + 1)
  const order = rng ? shuffle(numbers, rng) : numbers
  return defs.map((d, i) => instanceOf(d, `c${order[i]}`))
}

// mélange de Fisher-Yates ; rng = fonction () → [0, 1[ (obligatoire : le moteur
// passe le générateur à graine de la partie, voir src/game/rng.js)
export function shuffle(array, rng) {
  if (typeof rng !== 'function') throw new Error('shuffle : générateur aléatoire manquant')
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
