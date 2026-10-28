// Tests de la vue joueur (viewFor) : chaque joueur ne reçoit que ce qu'il a
// le droit de voir. Cas ciblés, puis vérification de fuite à chaque étape
// des 40 parties simulées, pour chaque joueur et pour un spectateur.
import { gameReducer } from '../src/game/reducer.js'
import { viewFor } from '../src/game/view.js'
import { buildDeck } from '../src/data/cards.js'
import { step, newGame } from './sim-lib.mjs'

let passed = 0
function check(label, cond) {
  if (!cond) throw new Error('ÉCHEC : ' + label)
  console.log('✓', label)
  passed++
}

// --- outils -----------------------------------------------------------------

// uid des cartes que `viewer` n'a PAS le droit de voir (d'après l'état complet)
function hiddenUids(s, viewer) {
  const hidden = new Set()
  if (!s.players) return hidden
  const me = viewer != null && viewer === s.current
  const pend = s.pending
  const seenByMedium = new Set(me && pend?.type === 'medium' ? pend.cards.map((c) => c.uid) : [])
  for (const c of s.deck) if (!seenByMedium.has(c.uid)) hidden.add(c.uid)
  s.players.forEach((p, i) => {
    if (i === viewer) return
    if (me && pend?.type === 'journalist') return
    for (const c of p.hand) hidden.add(c.uid)
  })
  if (pend?.type === 'chance' && !me) for (const c of pend.cards) hidden.add(c.uid)
  if (s.casino?.stake && s.casino.stake.by !== viewer) hidden.add(s.casino.stake.card.uid)
  return hidden
}

// tous les uid réels présents dans la vue sérialisée (clés et valeurs)
const uidsIn = (json) => new Set([...json.matchAll(/"(c\d+)"/g)].map((m) => m[1]))

// la vue de `viewer` ne contient aucune carte cachée (ni son uid, ni l'objet carte,
// qui contient forcément son uid)
function assertNoLeak(s, viewer, where) {
  const json = JSON.stringify(viewFor(s, viewer))
  const present = uidsIn(json)
  for (const u of hiddenUids(s, viewer)) {
    if (present.has(u)) throw new Error(`FUITE (${where}, joueur ${viewer}) : carte ${u}`)
  }
  return json
}

const deep = (x) => JSON.parse(JSON.stringify(x))
function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const v of Object.values(o)) deepFreeze(v)
  }
  return o
}

const deck = buildDeck()
const find = (pred) => deck.find(pred)
const findAll = (pred) => deck.filter(pred)

// partie à 3 joueurs, joueur 0 en phase de jeu ; `hand` remplace sa main
function gameAt(hand = null) {
  const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben', 'Cléo'], river: false })
  s.screen = 'game'
  s.phase = 'play'
  if (hand) s.players[0].hand = take(s, hand)
  return s
}
// sort des cartes de la pioche et des mains (pour les placer ailleurs)
function take(s, cards) {
  const uids = new Set(cards.map((c) => c.uid))
  s.deck = s.deck.filter((c) => !uids.has(c.uid))
  for (const q of s.players) q.hand = q.hand.filter((c) => !uids.has(c.uid))
  return cards.map((c) => ({ ...c }))
}
const play = (s, uid, by = 0) => gameReducer(s, { type: 'PLAY_SELF', uid, by })

// --- mains et pioche ----------------------------------------------------------
{
  const s = gameAt()
  const v0 = viewFor(s, 0)
  check('ma main est visible', JSON.stringify(v0.players[0].hand) === JSON.stringify(s.players[0].hand))
  check('les autres mains sont des cartes cachées (même taille)',
    v0.players[1].hand.length === s.players[1].hand.length && v0.players[1].hand.every((c) => c.hidden))
  check('carte cachée : uid sans lien avec la carte réelle, aucune donnée',
    v0.players[1].hand.every((c, k) => c.uid === `hidden-1-${k}` && Object.keys(c).join() === 'uid,hidden'))
  check('la pioche n’est jamais envoyée, seulement sa taille', !('deck' in v0) && v0.deckCount === s.deck.length)
  check('mayAct : le joueur courant peut agir, pas les autres', v0.mayAct === true && viewFor(s, 1).mayAct === false)
  const spec = viewFor(s, null)
  check('spectateur : aucune main visible', spec.players.every((q) => q.hand.every((c) => c.hidden)) && spec.mayAct === false)
  check('spectateur : aucune carte cachée dans sa vue', (assertNoLeak(s, null, 'spectateur'), true))
}

// --- défausse : entièrement visible -----------------------------------------------
{
  const s = gameAt()
  s.discard = s.deck.splice(0, 8).map((card) => ({ card, by: 1 }))
  check('la défausse entière est visible de tous',
    [0, 1, 2, null].every((v) => JSON.stringify(viewFor(s, v).discard) === JSON.stringify(s.discard)))
}

// --- Médium ---------------------------------------------------------------------
{
  const medium = find((c) => c.key === 'medium')
  let s = gameAt([medium])
  s = play(s, medium.uid)
  check('Médium : pending ouvert', s.pending?.type === 'medium')
  const seen = s.pending.cards.map((c) => c.uid)
  check('Médium : le Médium voit les 13 cartes', viewFor(s, 0).pending.cards.map((c) => c.uid).join() === seen.join())
  check('Médium : les autres ne voient rien', !('cards' in viewFor(s, 1).pending) && !('cards' in viewFor(s, null).pending))
  assertNoLeak(s, 1, 'Médium')
  s = gameReducer(s, { type: 'CLOSE_PENDING', by: 0 })
  const after = uidsIn(JSON.stringify(viewFor(s, 0)))
  // (la fin de tour a pu en piocher quelques-unes dans la main du Médium : celles-là, il les voit)
  const stillInDeck = seen.filter((u) => s.deck.some((c) => c.uid === u))
  check('Médium : regard unique, rien de gardé après', stillInDeck.length > 0 && stillInDeck.every((u) => !after.has(u)))
}

// --- Journaliste ------------------------------------------------------------------
{
  const journaliste = find((c) => c.key === 'journaliste')
  let s = gameAt([journaliste])
  s.players[0].studies = take(s, findAll((c) => c.type === 'study' && c.levels === 1).slice(0, 3))
  s = play(s, journaliste.uid)
  check('Journaliste : pending ouvert', s.pending?.type === 'journalist')
  const vj = viewFor(s, 0)
  check('Journaliste : voit toutes les autres mains',
    vj.pending.hands[0] === null && [1, 2].every((i) => JSON.stringify(vj.pending.hands[i]) === JSON.stringify(s.players[i].hand)))
  check('Journaliste : les autres ne voient pas les mains', !('hands' in viewFor(s, 1).pending))
  assertNoLeak(s, 1, 'Journaliste')
  assertNoLeak(s, null, 'Journaliste')
  const hand1 = s.players[1].hand.map((c) => c.uid)
  s = gameReducer(s, { type: 'CLOSE_PENDING', by: 0 })
  const after = uidsIn(JSON.stringify(viewFor(s, 0)))
  check('Journaliste : regard unique, mains de nouveau cachées', hand1.every((u) => !after.has(u)))
}

// --- Chance -------------------------------------------------------------------------
{
  const chance = find((c) => c.key === 'chance')
  let s = gameAt([chance])
  s = play(s, chance.uid)
  check('Chance : pending ouvert', s.pending?.type === 'chance')
  check('Chance : le joueur courant voit les 3 cartes', viewFor(s, 0).pending.cards.length === 3)
  check('Chance : les autres n’en voient que le nombre', !('cards' in viewFor(s, 1).pending) && viewFor(s, 1).pending.count === 3)
  assertNoLeak(s, 1, 'Chance')
  const cards = s.pending.cards
  s = gameReducer(s, { type: 'CHANCE_PICK', uid: cards[0].uid, by: 0 })
  const v1 = viewFor(s, 1)
  check('Chance : les 2 cartes défaussées deviennent publiques, la gardée reste cachée',
    cards.slice(1).every((c) => v1.discard.some((e) => e.card.uid === c.uid)) && !uidsIn(JSON.stringify(v1)).has(cards[0].uid))
}

// --- Troc du Chef des achats ---------------------------------------------------------
{
  const chef = find((c) => c.key === 'chef_achats')
  let s = gameAt([chef, ...findAll((c) => c.type === 'salary').slice(0, 3)])
  s.players[0].studies = take(s, findAll((c) => c.type === 'study' && c.levels === 1).slice(0, 3))
  s = play(s, chef.uid)
  s = gameReducer(s, { type: 'CHEF_TROC_TARGET', target: 1, by: 0 })
  check('Chef troc : étape protection', s.pending?.step === 'protect')
  const protectedUid = s.players[0].hand[0].uid
  s = gameReducer(s, { type: 'CHEF_TROC_PROTECT', uid: protectedUid, by: 0 })
  check('Chef troc (opp-pick) : le Chef voit la carte protégée', viewFor(s, 0).pending.protectedUid === protectedUid)
  const vt = viewFor(s, 1)
  check('Chef troc (opp-pick) : l’adversaire ne reçoit que le nombre de cartes',
    !('protectedUid' in vt.pending) && vt.pending.pickCount === s.players[0].hand.length - 1 && vt.pending.protected === true)
  check('Chef troc (opp-pick) : l’adversaire peut agir, le Chef attend', vt.mayAct && !viewFor(s, 0).mayAct)
  ;[1, 2, null].forEach((v) => assertNoLeak(s, v, 'Chef opp-pick'))
  s = gameReducer(s, { type: 'CHEF_TROC_OPP_PICK', index: 0, by: 1 })
  check('Chef troc : étape chef-pick', s.pending?.step === 'chef-pick')
  const vc = viewFor(s, 0)
  check('Chef troc (chef-pick) : le Chef voit sa carte prise, pas la main adverse',
    vc.pending.oppPickedUid === s.pending.oppPickedUid && vc.players[1].hand.every((c) => c.hidden))
  check('Chef troc (chef-pick) : uid cachés aux autres', !('oppPickedUid' in viewFor(s, 1).pending))
  ;[1, 2, null].forEach((v) => assertNoLeak(s, v, 'Chef chef-pick'))
}

// --- Casino -----------------------------------------------------------------------------
{
  const casino = find((c) => c.key === 'casino')
  const salary = find((c) => c.type === 'salary')
  let s = gameAt([casino, salary])
  s = play(s, casino.uid)
  s = gameReducer(s, { type: 'CASINO_STAKE', uid: salary.uid, by: 0 })
  check('Casino : mise posée', s.casino.stake?.card.uid === salary.uid)
  check('Casino : le miseur voit sa mise', viewFor(s, 0).casino.stake.card.uid === salary.uid)
  const vo = viewFor(s, 1)
  check('Casino : les autres voient une mise face cachée avec son auteur',
    vo.casino.stake.by === 0 && vo.casino.stake.hidden && !('card' in vo.casino.stake))
  ;[1, 2, null].forEach((v) => assertNoLeak(s, v, 'Casino'))
}

// --- pureté ---------------------------------------------------------------------------
{
  const s = gameAt()
  const before = JSON.stringify(s)
  deepFreeze(s)
  for (const v of [0, 1, 2, null]) viewFor(s, v)
  check('viewFor ne modifie pas l’état (état gelé, identique après)', JSON.stringify(s) === before)
  const v = viewFor(s, 0)
  check('la vue est un objet JSON simple', JSON.stringify(deep(v)) === JSON.stringify(v))
  check('écran de réglages : vue sans données', viewFor({ screen: 'setup', log: [] }, null).screen === 'setup')
}

// --- fuite : 40 parties simulées, chaque étape, chaque joueur + spectateur -------------
{
  const pendings = {}
  let views = 0
  for (let g = 0; g < 40; g++) {
    let s = newGame(g)
    // une partie sur deux commence avec un Chercheur posé (pris dans la pioche),
    // pour que la défausse du Chercheur (pending public) soit bien vérifiée
    if (g % 2 === 0) {
      const i = s.deck.findIndex((c) => c.key === 'chercheur')
      if (i >= 0) s.players[g % s.players.length].job = s.deck.splice(i, 1)[0]
    }
    const viewers = [...s.players.keys(), null]
    let guard = 0
    while (true) {
      const snapshot = JSON.stringify(s)
      for (const v of viewers) { assertNoLeak(s, v, `partie ${g}, étape ${guard}`); views++ }
      if (JSON.stringify(s) !== snapshot) throw new Error(`viewFor a modifié l’état (partie ${g})`)
      if (s.pending) pendings[s.pending.type] = (pendings[s.pending.type] || 0) + 1
      if (s.screen === 'gameover') break
      s = step(s)
      if (++guard > 20000) throw new Error('Partie infinie ?')
    }
  }
  check('fuite : la défausse du Chercheur est couverte par les parties simulées', pendings['chercheur-discard'] > 0)
  check(`aucune fuite sur 40 parties (${views} vues ; pendings vus : ${Object.keys(pendings).sort().join(', ')})`, true)
}

console.log(`\n✅ ${passed} vérifications de la vue joueur réussies`)
