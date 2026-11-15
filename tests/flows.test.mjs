// Pile des flux (src/game/flows/, étape 08) : le tour en bas, l'achat posé
// dessus, la carte forcée dans le tour ; le cadre du dessus décide qui agit et
// ce qui est permis ; chaque attente a une action par défaut ; la pile est une
// simple donnée (survit à JSON) et chaque joueur la voit par la vue du flux.
import { gameReducer } from '../src/game/reducer.js'
import { whoMustAct, defaultAction } from '../src/game/turn.js'
import { legalActions, actionKey } from '../src/game/legal.js'
import { viewFor } from '../src/game/view.js'
import { buildDeck, hasTag } from '../src/data/index.js'
import { setMoney } from '../src/game/primitives.js'
import { setStep, setPlays } from '../src/game/flows/turn.js'
import { flowOf } from '../src/game/flows/index.js'
import { topFrame, phaseOf, playsLeft, forcedOf, pendingOf, unspentMoney } from '../src/game/state.js'

let passed = 0
function check(label, cond) {
  if (!cond) throw new Error('ÉCHEC : ' + label)
  console.log('✓', label)
  passed++
}

const deck = buildDeck()
const findAll = (pred) => deck.filter(pred)
const find = (pred) => deck.find(pred)
const flows = (s) => s.stack.map((f) => `${f.flow}:${f.step}`).join('>')
const isLegal = (s, a) => legalActions(s, a.by).some((l) => actionKey(l) === actionKey(a))
const types = (list) => [...new Set(list.map((a) => a.type))].sort().join()

// partie neuve à 2 joueurs (Ana commence). Les cartes de test sont des copies
// du paquet : on les place à la main, la pioche n'est pas consultée ici.
function freshState() {
  return gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'], seed: 'flux' })
}
const travel = find((c) => c.acqType === 'travel')
const house = find((c) => hasTag(c, 'house'))
const salaries = findAll((c) => c.type === 'salary' && c.level === 4)
const study = find((c) => c.type === 'study' && c.levels === 1)

// --- la pile au début : un tour, en attente de la pioche -------------------
{
  const s = freshState()
  check('Début : la pile ne contient que le tour, étape pioche', flows(s) === 'turn:draw' && phaseOf(s) === 'draw' && playsLeft(s) === 1)
  check('Début : la pile est une simple donnée (JSON)', JSON.stringify(JSON.parse(JSON.stringify(s.stack))) === JSON.stringify(s.stack))
  check('Début : le tour dit qui agit', whoMustAct(s).join() === '0')
  check('Début : action par défaut = piocher', defaultAction(s, 0)?.type === 'DRAW_DECK' && isLegal(s, defaultAction(s, 0)))
  check('Début : Ben n’a pas d’action par défaut', defaultAction(s, 1) === null)
  const v = viewFor(s, 1)
  check('Vue : chaque joueur reçoit la pile', JSON.stringify(v.stack) === JSON.stringify(s.stack))
  const d = gameReducer(s, { type: 'DRAW_DECK', by: 0 })
  check('Pioche : le tour passe à l’étape jeu', flows(d) === 'turn:play' && flows(s) === 'turn:draw')
  const fb = defaultAction(d, 0)
  check('Étape jeu : action par défaut = défausser une carte', fb?.type === 'DISCARD_CARD' && isLegal(d, fb))
}

// --- achat depuis la main : un cadre posé sur le tour ----------------------
{
  const s = freshState()
  setStep(s, 'play')
  setMoney(s, s.players[0], salaries.slice(0, 3))
  s.players[0].hand[0] = travel
  const hand = s.players[0].hand.length
  const a = gameReducer(s, { type: 'PLAY_SELF', uid: travel.uid, by: 0 })
  check('Achat : un cadre d’achat est posé sur le tour', flows(a) === 'turn:play>purchase:pay')
  check('Achat : le voyage est tenu par le cadre, plus dans la main',
    topFrame(a).data.card.uid === travel.uid && a.players[0].hand.length === hand - 1 && !a.players[0].hand.some((c) => c.uid === travel.uid))
  check('Achat : pendingOf le présente comme un choix « purchase »', pendingOf(a)?.type === 'purchase' && pendingOf(a).card.uid === travel.uid)
  check('Achat : seul le paiement ou l’annulation sont permis', types(legalActions(a, 0)) === 'PURCHASE_CANCEL,PURCHASE_CONFIRM')
  check('Achat : aucune autre action n’est acceptée',
    gameReducer(a, { type: 'DISCARD_CARD', uid: a.players[0].hand[0].uid, by: 0 }) === a &&
    gameReducer(a, { type: 'DRAW_DECK', by: 0 }) === a)
  check('Achat : le jeu n’est pas encore consommé', playsLeft(a) === 1)
  check('Achat : action par défaut = annuler (carte de la main)', defaultAction(a, 0)?.type === 'PURCHASE_CANCEL')
  check('Achat : Ben voit le cadre (carte jouée face visible)', viewFor(a, 1).stack[1]?.data.card.uid === travel.uid)

  const c = gameReducer(a, { type: 'PURCHASE_CANCEL', by: 0 })
  check('Annuler : le cadre est retiré, le voyage revient en main, le tour attend toujours',
    flows(c) === 'turn:play' && c.players[0].hand.some((x) => x.uid === travel.uid) && playsLeft(c) === 1 && c.current === 0)

  const pay = legalActions(a, 0).find((x) => x.type === 'PURCHASE_CONFIRM')
  const b = gameReducer(a, pay)
  check('Payer : le voyage est posé, le jeu est consommé, le tour passe à Ben',
    b.players[0].acquisitions.some((x) => x.uid === travel.uid) && b.current === 1 && flows(b) === 'turn:draw')
}

// --- maison prise dans la défausse : carte forcée, puis achat ---------------
{
  const s = freshState()
  setMoney(s, s.players[0], salaries.slice(0, 4))
  s.discard.push({ card: house, by: 1 })
  check('Défausse : Ana peut prendre la maison (assez de salaires)', legalActions(s, 0).some((x) => x.type === 'TAKE_DISCARD'))
  const t = gameReducer(s, { type: 'TAKE_DISCARD', by: 0 })
  check('Défausse : la maison devient la carte forcée du tour', forcedOf(t)?.uid === house.uid && flows(t) === 'turn:play')
  check('Défausse : seule la maison peut être jouée, pas défaussée',
    legalActions(t, 0).map((x) => x.type).join() === 'PLAY_SELF' &&
    gameReducer(t, { type: 'DISCARD_CARD', uid: house.uid, by: 0 }) === t)
  const a = gameReducer(t, { type: 'PLAY_SELF', uid: house.uid, by: 0 })
  check('Défausse : jouer la maison ouvre l’achat (fromForced)', flows(a) === 'turn:play>purchase:pay' && topFrame(a).data.fromForced === true)
  const fb = defaultAction(a, 0)
  check('Défausse : action par défaut = le paiement le moins cher (la carte doit être jouée)',
    fb?.type === 'PURCHASE_CONFIRM' && isLegal(a, fb))
  const c = gameReducer(a, { type: 'PURCHASE_CANCEL', by: 0 })
  check('Défausse : annuler laisse la maison forcée, pas en main',
    flows(c) === 'turn:play' && forcedOf(c)?.uid === house.uid && !c.players[0].hand.some((x) => x.uid === house.uid))
  const b = gameReducer(a, fb)
  check('Défausse : payer pose la maison et termine le tour',
    b.players[0].acquisitions.some((x) => x.uid === house.uid) && forcedOf(b) === null && b.current === 1 &&
    unspentMoney(b, b.players[0]).length < 4)
}

// --- la pile d'abord, puis l'ancien pending ---------------------------------
{
  const s = freshState()
  setStep(s, 'play')
  setPlays(s, 0) // le Journaliste posé a consommé le jeu du tour
  s.pending = { type: 'journalist' }
  check('Pending au-dessus du tour : le tour n’est plus le cadre actif',
    legalActions(s, 0).map((a) => a.type).join() === 'CLOSE_PENDING' && defaultAction(s, 0) === null)
  check('Pending : les actions du tour sont refusées', gameReducer(s, { type: 'DISCARD_CARD', uid: s.players[0].hand[0].uid, by: 0 }) === s)
  const r = gameReducer(s, { type: 'CLOSE_PENDING', by: 0 })
  check('Pending fermé : le tour reprend la main (jeu consommé → Ben)', r.pending === null && r.current === 1 && flows(r) === 'turn:draw')
}

// --- chaque flux définit toute l'interface ----------------------------------
for (const name of ['turn', 'purchase']) {
  const f = flowOf(name)
  check(`Flux ${name} : start, actors, legal, apply, resume, fallback, view`,
    ['start', 'actors', 'legal', 'apply', 'resume', 'fallback', 'view'].every((k) => typeof f[k] === 'function'))
}

// --- Étoile filante : carte de la défausse jouée en plus (pas le jeu du tour) -
{
  const s = freshState()
  setStep(s, 'play')
  const etoile = find((c) => c.key === 'etoile')
  s.players[0].hand[0] = etoile
  s.discard.push({ card: study, by: 1 })
  const e = gameReducer(s, { type: 'PLAY_SELF', uid: etoile.uid, by: 0 })
  const r = gameReducer(e, { type: 'DISCARD_PICK', uid: study.uid, by: 0 })
  check('Étoile filante : la carte reprise est forcée, et peut être défaussée',
    forcedOf(r)?.uid === study.uid && legalActions(r, 0).some((a) => a.type === 'DISCARD_CARD' && a.uid === study.uid))
}

console.log(`\n✅ ${passed} vérifications de la pile des flux réussies`)
