// ---------------------------------------------------------------------------
// Décompte final des smiles (ARCHITECTURE.md §7) : un pipeline
//   1. chaque carte posée : la question cardSmiles (réponse de base : les
//      smiles imprimés ; la Licorne doublée est un modificateur, cards/base.js)
//   2. somme par catégorie
//   3. la question scoreBonus, une fois les sous-totaux de TOUS les joueurs
//      connus (les effets qui comparent les joueurs les lisent dans q.subtotals)
// Marche sur l'état complet comme sur une vue (viewFor).
// ---------------------------------------------------------------------------
import { jobs, moneyOf, marriages, adulteries, malusOf } from './state.js'
import { ask } from './queries.js'

// catégories de l'écran de fin, dans l'ordre : [libellé, cartes du joueur,
// options]. Ensemble, elles couvrent tout le plateau du joueur (boardCards).
// hideIfZero : l'écran de fin ne montre pas la ligne si elle vaut 0 pour
// tout le monde (cartes spéciales et malus ne valent rien dans le jeu de base)
export const CATEGORIES = [
  ['Études 📚', (p) => p.studies],
  ['Métier 💼', jobs],
  ['Salaires 💰', moneyOf],
  ['Flirts 💕', (p) => p.flirts],
  ['Mariage 💒', marriages],
  ['Adultère 😏', adulteries],
  ['Enfants 👶', (p) => p.children],
  ['Acquisitions 🏠', (p) => p.acquisitions],
  ['Distinctions 🏅', (p) => p.distinctions],
  ['Cartes spéciales 🃏', (p) => p.specials, { hideIfZero: true }],
  ['Malus ⚡', malusOf, { hideIfZero: true }],
]

// smiles d'une carte posée devant le joueur pIdx
export const cardSmiles = (s, pIdx, card) => ask(s, 'cardSmiles', { player: pIdx, card }, card.smiles ?? 0)

// sous-total d'un joueur : { cat, changed, subtotal }
// changed[catégorie] = [{ card, printed, smiles }] : cartes qui ne comptent
// pas leurs smiles imprimés (Licorne doublée…), pour l'écran de fin
function subtotalOf(s, pIdx) {
  const p = s.players[pIdx]
  const cat = {}
  const changed = {}
  for (const [label, cards] of CATEGORIES) {
    let n = 0
    for (const card of cards(p)) {
      const smiles = cardSmiles(s, pIdx, card)
      n += smiles
      if (smiles !== (card.smiles ?? 0)) (changed[label] ??= []).push({ card, printed: card.smiles ?? 0, smiles })
    }
    cat[label] = n
  }
  const subtotal = Object.values(cat).reduce((a, b) => a + b, 0)
  return { cat, changed, subtotal }
}

// Scores de tous les joueurs : [{ cat, changed, bonus, total }]
export function computeScores(s) {
  const subs = s.players.map((_, i) => subtotalOf(s, i))
  const subtotals = subs.map((x) => x.subtotal)
  return subs.map(({ cat, changed, subtotal }, i) => {
    const bonus = ask(s, 'scoreBonus', { player: i, subtotals }, 0)
    return { cat, changed, bonus, total: subtotal + bonus }
  })
}

// Score d'un joueur (player : son indice, ou le joueur lui-même)
export function computeScore(s, player) {
  const i = typeof player === 'number' ? player : s.players.indexOf(player)
  if (i < 0) throw new Error('computeScore : joueur absent de la partie')
  return computeScores(s)[i]
}
