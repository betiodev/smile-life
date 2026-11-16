// Tests des derniers mécanismes du moteur (roadmap étape 12), prouvés avec
// l'extension factice 'test' (tests/ext/test-ext.mjs) :
// zones partagées (centre, cagnotte, cartes de côté), cartes jouées d'office
// (pioche, main de départ, main complétée, Chance), durée en tours de table,
// protection, face cachée, regards temporaires, canSee, mise en place, flux
// emboîtés (carte jouée d'office pendant un achat), et scan de fuite sur des
// parties simulées avec l'extension.
import { TEST_DEFS, SPARE_COUNT } from './test-ext.mjs'
import { gameReducer, newGameState } from '../../src/game/reducer.js'
import { viewFor, canSee } from '../../src/game/view.js'
import { legalActions } from '../../src/game/legal.js'
import { canPlace, canTarget, canPlayMalus, handSize, drawMode } from '../../src/game/rules.js'
import { computeScore, CATEGORIES } from '../../src/game/scoring.js'
import { checkInvariants } from '../invariants.mjs'
import { defaultAction } from '../../src/game/turn.js'
import { CATALOGUE, EXTENSIONS, buildDeck } from '../../src/data/index.js'
import { setStep, setPlays, setForced } from '../../src/game/flows/turn.js'
import { startFlow, setFlow } from '../../src/game/flows/index.js'
import { registerExtension } from '../../src/game/extensions.js'
import {
  draw, placeCard, placeCenter, remove, protect, setFaceDown, addSight, put, setJob, attach, place,
} from '../../src/game/primitives.js'
import {
  topFrame, turnFrame, jobOf, metaOf, centerInForce, choiceOf, inSetup, boardCards, playsLeft, onOf,
} from '../../src/game/state.js'
import { step, newGame } from '../sim-lib.mjs'

let passed = 0
function check(label, cond) {
  if (!cond) throw new Error('ÉCHEC : ' + label)
  console.log('✓', label)
  passed++
}
const throws = (fn) => { try { fn(); return false } catch { return true } }

const RULE = 'test.global-rule'
const SHIELD = 'test.shield'
const names = ['Ana', 'Ben', 'Cléo']

// ferme les annonces en attente (flux test.notice), jusqu'au tour
function settle(s) {
  while (topFrame(s)?.flow === 'test.notice') s = gameReducer(s, { type: 'CLOSE_INFO', by: topFrame(s).data.player })
  return s
}
// partie avec l'extension test, prête à jouer (au tour d'Ana, étape draw)
// (graine sans carte jouée d’office dans les mains de départ)
function fresh(seed = 12) {
  return settle(newGameState(names, null, { seed, extensions: ['test'] }))
}
// sort une carte de la définition def de la pioche (ou d'une main : la main
// reçoit à la place une carte ordinaire du dessous de la pioche)
function grab(s, def) {
  let i = s.deck.findIndex((c) => c.def === def)
  if (i >= 0) return s.deck.splice(i, 1)[0]
  for (const p of s.players) {
    i = p.hand.findIndex((c) => c.def === def)
    if (i >= 0) {
      const [card] = p.hand.splice(i, 1)
      const j = s.deck.findIndex((c) => !c.tags.includes('autoPlay'))
      p.hand.push(s.deck.splice(j, 1)[0])
      return card
    }
  }
  throw new Error(`grab : plus de ${def}`)
}
// met une carte de la définition def sur le dessus de la pioche
const toTop = (s, def) => { const c = grab(s, def); s.deck.push(c); return c }
// carte ordinaire (pas jouée d'office) de la pioche, d'après un prédicat
function grabWhere(s, pred) {
  const i = s.deck.findIndex((c) => pred(c) && !c.tags.includes('autoPlay'))
  if (i < 0) throw new Error('grabWhere : rien trouvé')
  return s.deck.splice(i, 1)[0]
}
// la pioche ne contient plus de carte jouée d'office sur le dessus (tests
// qui piochent « une carte ordinaire »)
function plainTop(s, n = 12) {
  for (let k = 0; k < n; k++) {
    const i = s.deck.length - 1 - k
    if (s.deck[i]?.tags.includes('autoPlay')) {
      const j = s.deck.findIndex((c) => !c.tags.includes('autoPlay'))
      ;[s.deck[i], s.deck[j]] = [s.deck[j], s.deck[i]]
    }
  }
}
const act = (s, a) => {
  const r = gameReducer(s, a)
  if (r === s) throw new Error(`action refusée : ${JSON.stringify(a)}`)
  return r
}

// --- enregistrement de l'extension -----------------------------------------------
{
  check('extension test enregistrée (définitions au catalogue)', EXTENSIONS.includes('test') && CATALOGUE[RULE] && CATALOGUE[SHIELD])
  check('paquet de base inchangé : 200 cartes, sans carte test', buildDeck().length === 200 && !buildDeck().some((c) => c.ext === 'test'))
  const n = TEST_DEFS.reduce((t, d) => t + d.count, 0)
  check(`paquet avec l'extension test : 200 + ${n} cartes`, buildDeck(['test']).length === 200 + n)
  check('enregistrer deux fois la même extension est refusé', throws(() => registerExtension({ id: 'test', defs: [] })))
  check('un flux d’extension doit être nommé <ext>.<nom>', throws(() => registerExtension({ id: 'zz', flows: { notice: {} } })))
  const base = newGameState(names, null, { seed: 11 })
  check('partie sans l’extension : aucune carte test, rien de côté, centre vide',
    ![...base.deck, ...base.players.flatMap((p) => p.hand)].some((c) => c.ext === 'test') && base.spare.length === 0 && base.center.length === 0)
  check('zones partagées présentes dès le départ (centre, cagnotte, de côté, regards)',
    ['center', 'pot', 'spare', 'sight'].every((z) => Array.isArray(base[z]) && base[z].length === 0))
}

// --- mise en place -----------------------------------------------------------------
{
  const s = fresh()
  check(`mise en place : l’étape de l’extension met ${SPARE_COUNT} cartes de côté`, s.spare.length === SPARE_COUNT)
  check('mise en place : étapes dans l’ordre (mains, puis l’extension, puis le début)',
    s.log.findIndex((e) => e.text.includes('mises de côté')) < s.log.findIndex((e) => e.text.includes('La partie commence')))
  check('mise en place finie : le tour d’Ana est tout en bas de la pile', s.stack.length === 1 && turnFrame(s) && s.current === 0)
  const base = newGameState(names, null, { seed: 11 })
  check('jeu de base : pas d’étape d’extension (rien de côté, pas de message)', !base.log.some((e) => e.text.includes('de côté')))
}

// --- carte jouée d'office dans une main de départ ------------------------------------
{
  // une graine dont une main de départ contient la carte : la mise en place attend
  let s = null
  for (let seed = 1; seed < 200 && !s; seed++) {
    const t = newGameState(names, null, { seed, extensions: ['test'] })
    if (inSetup(t)) s = t
  }
  check('main de départ : une graine trouvée où la carte sort dans une main', !!s)
  const frame = topFrame(s)
  check('main de départ : la carte est au centre, l’annonce attend celui qui l’a piochée',
    frame.flow === 'test.notice' && s.center.some((c) => c.uid === frame.data.uid) && s.stack[0].flow === 'setup')
  check('main de départ : chaque main est quand même complète (5 cartes), sans carte jouée d’office',
    s.players.every((p) => p.hand.length === 5 && !p.hand.some((c) => c.def === RULE)))
  check('main de départ : seul celui qui l’a piochée peut agir (fermer l’annonce)',
    legalActions(s, frame.data.player).length === 1 && names.every((_, i) => i === frame.data.player || legalActions(s, i).length === 0))
  check('main de départ : la partie n’a pas encore commencé', !s.log.some((e) => e.text.includes('La partie commence')))
  check('main de départ : la vue montre la carte au centre et la mise en place', viewFor(s, null).center.some((c) => c.uid === frame.data.uid) && viewFor(s, null).stack[0].flow === 'setup')
  s = settle(s)
  check('main de départ : annonces fermées → mise en place finie, premier tour', s.stack.length === 1 && turnFrame(s)?.step === 'draw' &&
    s.log.some((e) => e.text.includes('La partie commence')))
  check('main de départ : la carte au centre a une durée lancée par celui qui l’a piochée', s.center.every((c) => metaOf(s, c.uid).timer?.left === 2))
}

// --- carte jouée d'office à la pioche du tour ----------------------------------------
{
  let s = fresh()
  const card = toTop(s, RULE)
  const handBefore = s.players[0].hand.length
  s = act(s, { type: 'DRAW_DECK', by: 0 })
  check('pioche : la carte part au centre, pas dans la main', s.center.some((c) => c.uid === card.uid) && !s.players[0].hand.some((c) => c.uid === card.uid))
  check('pioche (redraw) : le joueur pioche une autre carte à la place', s.players[0].hand.length === handBefore + 1)
  check('pioche : méta au centre (ordre de pose, durée 2 tours, lancée par Ana)',
    metaOf(s, card.uid).seq > 0 && metaOf(s, card.uid).timer.left === 2 && metaOf(s, card.uid).timer.by === 0)
  check('pioche : annonce posée sur le tour, le tour passe à l’étape play', topFrame(s).flow === 'test.notice' && turnFrame(s).step === 'play')
  check('pioche : journal public qui nomme la carte (elle est visible)', s.log.at(-1).text.includes('Règle globale (test)'))
  s = act(s, { type: 'CLOSE_INFO', by: 0 })
  check('annonce fermée : le tour reprend', topFrame(s) === turnFrame(s) && turnFrame(s).step === 'play')

  // redraw: false (option de la définition) : pas de carte de remplacement
  const d = CATALOGUE[RULE]
  d.autoPlay = { ...d.autoPlay, redraw: false }
  let t = fresh()
  toTop(t, RULE)
  const h = t.players[0].hand.length
  t = act(t, { type: 'DRAW_DECK', by: 0 })
  check('option redraw: false : la pioche du tour n’apporte rien en main', t.players[0].hand.length === h && t.center.length === 1)
  d.autoPlay = { ...d.autoPlay, redraw: true }
}

// --- la règle : personne ne pose de flirt, pendant 2 tours de table -----------------
{
  let s = fresh()
  const flirts = [0, 1, 2].map(() => grabWhere(s, (c) => c.type === 'flirt'))
  flirts.forEach((f, i) => s.players[i].hand.push(f))
  check('sans la carte : un flirt se pose', canPlace(s, 0, flirts[0]).ok)
  const rule = toTop(s, RULE)
  s = settle(act(s, { type: 'DRAW_DECK', by: 0 }))
  const no = canPlace(s, 0, flirts[0])
  check('carte au centre : flirt interdit, avec la raison en français', !no.ok && no.reason.includes('personne ne pose de flirt'))
  check('carte au centre : interdit pour tout le monde (portée everyone)', [1, 2].every((i) => !canPlace(s, i, flirts[i]).ok))
  check('carte au centre : le flirt n’est pas dans les actions permises', !legalActions(s, 0).some((a) => a.type === 'PLAY_SELF' && a.uid === flirts[0].uid))
  check('carte au centre : même réponse sur la vue du joueur', !canPlace(viewFor(s, 0), 0, flirts[0]).ok)
  check('les autres cartes ne sont pas touchées', centerInForce(s).length === 1)
  // on fait tourner la table : Ana défausse, Ben et Cléo aussi
  plainTop(s, 40)
  const discardOne = (st) => {
    const me = st.current
    if (turnFrame(st).step === 'draw') st = settle(act(st, { type: 'DRAW_DECK', by: me }))
    const c = st.players[me].hand.find((x) => !flirts.some((f) => f.uid === x.uid))
    return settle(act(st, { type: 'DISCARD_CARD', uid: c.uid, by: me }))
  }
  s = discardOne(s) // Ana finit son tour
  s = discardOne(s) // Ben
  s = discardOne(s) // Cléo → retour chez Ana : 1 tour de table
  check('1 tour de table : la carte est toujours là (1 restant)', s.current === 0 && metaOf(s, rule.uid)?.timer.left === 1)
  s = discardOne(s); s = discardOne(s)
  // Ben passe son prochain tour : le décompte compte aussi un tour passé
  s.players[0].skipTurns = 1
  s = discardOne(s)
  check('2 tours de table (siège passé compris) : la carte quitte le centre pour la défausse',
    !s.center.some((c) => c.uid === rule.uid) && s.discard.some((e) => e.card.uid === rule.uid && e.by === null) && !metaOf(s, rule.uid))
  check('fin de la carte : annoncée dans le journal', s.log.some((e) => e.text.includes('n’est plus en vigueur')))
  check('fin de la carte : les flirts se posent de nouveau', canPlace(s, 0, flirts[0]).ok)
}

// --- centre : une carte qui en recouvre une autre (meta.on) --------------------------
{
  const s = fresh()
  const a = grab(s, RULE)
  const b = grab(s, RULE)
  placeCenter(s, a, { by: 0 })
  placeCenter(s, b, { by: 0, on: a.uid })
  check('pile au centre : seule la carte du dessus est en vigueur', centerInForce(s).map((c) => c.uid).join() === b.uid)
  remove(s, b.uid, { cause: 'test' })
  check('la carte du dessus part : celle du dessous reprend', centerInForce(s).map((c) => c.uid).join() === a.uid && !metaOf(s, a.uid).on)
}

// --- Chance : option withChance de la définition ----------------------------------------
{
  const chanceOf = (s) => grabWhere(s, (c) => c.key === 'chance')
  let s = fresh()
  setStep(s, 'play')
  const ch = chanceOf(s)
  s.players[0].hand.push(ch)
  const rule = toTop(s, RULE)
  s = act(s, { type: 'PLAY_SELF', uid: ch.uid, by: 0 })
  check('Chance (withChance: false) : la carte reste une carte ordinaire parmi les 3',
    choiceOf(s).type === 'chance' && choiceOf(s).cards.length === 3 && choiceOf(s).cards.some((c) => c.uid === rule.uid) && s.center.length === 0)
  check('Chance : les 3 cartes restent cachées aux autres', !canSee(s, 1, rule.uid) && canSee(s, 0, rule.uid))

  CATALOGUE[RULE].autoPlay = { ...CATALOGUE[RULE].autoPlay, withChance: true }
  let t = fresh()
  setStep(t, 'play')
  const ch2 = chanceOf(t)
  t.players[0].hand.push(ch2)
  const rule2 = toTop(t, RULE)
  t = act(t, { type: 'PLAY_SELF', uid: ch2.uid, by: 0 })
  check('Chance (withChance: true) : la carte est jouée au centre, la Chance montre les 2 autres',
    t.center.some((c) => c.uid === rule2.uid) && choiceOf(t).type === 'chance' && choiceOf(t).cards.length === 2)
  check('Chance + annonce : deux cadres empilés sur le tour', t.stack.map((f) => f.flow).join('>') === 'turn>test.notice>chance')
  t = act(t, { type: 'CHANCE_PICK', uid: choiceOf(t).cards[0].uid, by: 0 })
  t = act(t, { type: 'CLOSE_INFO', by: 0 })
  check('Chance + annonce : réglées l’une après l’autre, le tour reprend', topFrame(t) === turnFrame(t))
  CATALOGUE[RULE].autoPlay = { ...CATALOGUE[RULE].autoPlay, withChance: false }
}

// --- carte jouée d'office en complétant une main (fin de tour) ------------------------
{
  let s = fresh()
  plainTop(s)
  s = act(s, { type: 'DRAW_DECK', by: 0 })
  // la main d'Ana a une carte de moins (mise en place du test) : la fin de
  // son tour va piocher la carte
  s.discard.push({ card: s.players[0].hand.pop(), by: 0 })
  const rule = toTop(s, RULE)
  s = act(s, { type: 'DISCARD_CARD', uid: s.players[0].hand[0].uid, by: 0 })
  check('main complétée : la carte part au centre, la main d’Ana est complète quand même',
    s.center.some((c) => c.uid === rule.uid) && s.players[0].hand.length === 5)
  check('main complétée : le tour de Ben commence, l’annonce d’Ana passe d’abord',
    s.current === 1 && turnFrame(s).step === 'draw' && topFrame(s).flow === 'test.notice' && topFrame(s).data.player === 0)
  check('main complétée : seule Ana peut agir (fermer l’annonce)', legalActions(s, 1).length === 0 && legalActions(s, 0).length === 1)
  s = act(s, { type: 'CLOSE_INFO', by: 0 })
  check('annonce fermée : Ben joue son tour', topFrame(s) === turnFrame(s) && legalActions(s, 1).some((a) => a.type === 'DRAW_DECK'))
}

// --- flux emboîtés : carte jouée d'office pendant un achat --------------------------------
{
  let s = fresh()
  setStep(s, 'play')
  const house = grabWhere(s, (c) => c.tags.includes('house') && c.def.startsWith('base.'))
  const salaries = [grabWhere(s, (c) => c.type === 'salary' && c.level === 4), grabWhere(s, (c) => c.type === 'salary' && c.level === 4),
    grabWhere(s, (c) => c.type === 'salary' && c.level === 4)]
  const ana = s.players[0]
  for (const c of salaries) placeCard(s, ana.money, c)
  ana.hand.push(house)
  s = act(s, { type: 'PLAY_SELF', uid: house.uid, by: 0 })
  check('achat : le flux d’achat attend le paiement', topFrame(s).flow === 'purchase')
  const purchaseData = JSON.stringify(topFrame(s).data)
  // pendant l'achat, une carte est piochée (un effet de carte, par exemple)
  const rule = toTop(s, RULE)
  draw(s, 0)
  check('pendant l’achat : la carte jouée d’office pose son annonce PAR-DESSUS l’achat',
    s.stack.map((f) => f.flow).join('>') === 'turn>purchase>test.notice' && s.center.some((c) => c.uid === rule.uid))
  check('pendant l’achat : seule l’annonce est jouable', legalActions(s, 0).map((a) => a.type).join() === 'CLOSE_INFO')
  check('pendant l’achat : la règle globale est déjà en vigueur', !canPlace(s, 0, grabWhere(s, (c) => c.type === 'flirt')).ok)
  s = act(s, { type: 'CLOSE_INFO', by: 0 })
  check('annonce fermée : l’achat reprend, intact', topFrame(s).flow === 'purchase' && JSON.stringify(topFrame(s).data) === purchaseData)
  const pay = legalActions(s, 0).find((a) => a.type === 'PURCHASE_CONFIRM')
  s = act(s, pay)
  check('achat payé : la maison est posée, le tour continue', s.players[0].acquisitions.some((c) => c.uid === house.uid) && topFrame(s) === turnFrame(s))
}

// --- protection : le Bouclier ---------------------------------------------------------
{
  let s = fresh()
  setStep(s, 'play')
  const shieldCard = grab(s, SHIELD)
  s.players[0].hand.push(shieldCard)
  check('Bouclier sans carte posée : refusé, avec la raison', canPlace(s, 0, shieldCard).reason === 'Aucune carte à protéger')
  const job = grabWhere(s, (c) => c.key === 'pizzaiolo')
  setJob(s, s.players[0], job)
  check('Bouclier avec une carte posée : jouable', canPlace(s, 0, shieldCard).ok)
  check('Bouclier : jouable, aussi d’après la vue d’Ana', canPlace(viewFor(s, 0), 0, shieldCard).ok)
  plainTop(s, 30)
  s = act(s, { type: 'PLAY_SELF', uid: shieldCard.uid, by: 0 })
  check('Bouclier joué : la dernière carte posée d’Ana est protégée par lui', metaOf(s, job.uid).protectedBy === shieldCard.uid)
  check('Bouclier : la protection est publique (méta dans la vue des autres)', viewFor(s, 1).meta[job.uid].protectedBy === shieldCard.uid)
  // Ben licencie Ana : le métier reste, le malus est quand même posé
  s = settle(s)
  check('tour de Ben', s.current === 1)
  setStep(s, 'play')
  const lic = grabWhere(s, (c) => c.key === 'licenciement')
  s.players[1].hand.push(lic)
  s = act(s, { type: 'PLAY_MALUS', uid: lic.uid, target: 0, by: 1 })
  check('Licenciement sur un métier protégé : le métier reste, le malus est posé',
    jobOf(s.players[0])?.uid === job.uid && s.players[0].malus.some((c) => c.uid === lic.uid))
  check('Licenciement sur un métier protégé : aucun métier perdu annoncé', !s.log.some((e) => e.text.includes('Grand Prix')) && s.discard.every((e) => e.card.uid !== job.uid))
  // Ana peut démissionner elle-même (la protection ne joue que contre les autres)
  s = settle(s)
  while (s.current !== 0) {
    plainTop(s)
    if (turnFrame(s).step === 'draw') s = settle(act(s, { type: 'DRAW_DECK', by: s.current }))
    s = settle(act(s, { type: 'DISCARD_CARD', uid: s.players[s.current].hand[0].uid, by: s.current }))
  }
  s.players[0].skipTurns = 0
  s = act(s, { type: 'RESIGN', by: 0 })
  check('démission d’un métier protégé : permise à son propriétaire', !jobOf(s.players[0]) && s.discard.some((e) => e.card.uid === job.uid))
}

// --- protection : flirt protégé, protection levée quand la protectrice part -----------
{
  const s = fresh()
  setStep(s, 'play')
  // un flirt dont un autre du même lieu est aussi dans la pioche
  const f1 = grabWhere(s, (c) => c.type === 'flirt' && s.deck.filter((d) => d.type === 'flirt' && d.place === c.place).length >= 2)
  const twin = grabWhere(s, (c) => c.type === 'flirt' && c.place === f1.place)
  const shieldCard = grab(s, SHIELD)
  place(s, 1, f1)
  place(s, 1, shieldCard)
  protect(s, f1.uid, shieldCard.uid)
  s.players[0].hand.push(twin)
  const r = act(s, { type: 'PLAY_SELF', uid: twin.uid, by: 0 })
  check('flirt protégé : pas volé par un flirt du même lieu', r.players[1].flirts.some((c) => c.uid === f1.uid) && !r.log.some((e) => e.text.includes('vole le flirt')))
  check('flirt protégé : remove rend null', remove(structuredClone(s), f1.uid, { cause: 'vol', by: 0 }) === null)
  remove(s, shieldCard.uid, { cause: 'test', by: 1 })
  check('la carte protectrice quitte la table : la protection disparaît', !metaOf(s, f1.uid).protectedBy)
  check('flirt plus protégé : remove le retire', remove(s, f1.uid, { cause: 'vol', by: 0 }) !== null)
}

// --- face cachée --------------------------------------------------------------------------
{
  const s = fresh()
  const job = grabWhere(s, (c) => c.key === 'pizzaiolo')
  const sal = grabWhere(s, (c) => c.type === 'salary' && c.level === 1)
  setJob(s, s.players[1], job)
  placeCard(s, s.players[1].money, sal)
  attach(s, sal.uid, job.uid) // lien « on » vers la carte qui sera cachée
  setFaceDown(s, job.uid)
  for (const v of [0, 1, 2, null]) {
    const view = viewFor(s, v)
    const json = JSON.stringify(view)
    check(`face cachée, vue de ${v ?? 'spectateur'} : ni uid ni contenu, une carte cachée à sa place`,
      !json.includes(`"${job.uid}"`) && !json.includes('Pizzaïolo') && view.players[1].jobs[0].hidden && view.players[1].jobs[0].faceDown)
  }
  check('face cachée : invisible même pour son propriétaire (canSee)', [0, 1, 2, null].every((v) => !canSee(s, v, job.uid)))
  check('face cachée : le lien « on » vers elle n’est pas envoyé', !('on' in viewFor(s, 0).meta[sal.uid]))
  setFaceDown(s, job.uid, false)
  check('retournée face visible : de nouveau visible de tous', [0, 1, 2, null].every((v) => canSee(s, v, job.uid)))
}

// --- regards temporaires (state.sight) ----------------------------------------------------
{
  let s = fresh()
  plainTop(s)
  const card = s.players[0].hand[0]
  addSight(s, 1, [card.uid])
  check('regard : Ben voit cette carte de la main d’Ana', canSee(s, 1, card.uid) && viewFor(s, 1).players[0].hand[0].uid === card.uid)
  check('regard : Cléo et le spectateur ne la voient pas', !canSee(s, 2, card.uid) && !JSON.stringify(viewFor(s, 2)).includes(`"${card.uid}"`) &&
    !JSON.stringify(viewFor(s, null)).includes(`"${card.uid}"`))
  check('regard : seule la vue de Ben contient le regard', viewFor(s, 1).sight.length === 1 && viewFor(s, 2).sight.length === 0)
  const top = s.deck.at(-1)
  addSight(s, 'all', [top.uid])
  const seen = viewFor(s, 2).seen
  check('regard sur la pioche : tout le monde voit la carte du dessus (index 0), la pioche reste cachée',
    seen?.length === 1 && seen[0].index === 0 && seen[0].card.uid === top.uid && !('deck' in viewFor(s, 2)))
  s = act(s, { type: 'DRAW_DECK', by: 0 })
  s = settle(act(s, { type: 'DISCARD_CARD', uid: s.players[0].hand.at(-1).uid, by: 0 }))
  check('regards « jusqu’à la fin du tour » : effacés au tour suivant', s.current === 1 && s.sight.length === 0 && !canSee(s, 1, card.uid))
  // jusqu'à la fin du flux
  const t = fresh()
  setStep(t, 'play')
  setFlow(t, 'medium', 'look', { cards: [] })
  addSight(t, 2, [t.players[0].hand[0].uid], 'flow')
  check('regard « jusqu’à la fin du flux » : actif tant que le flux est ouvert', canSee(t, 2, t.players[0].hand[0].uid))
  const u = act(t, { type: 'CLOSE_INFO', by: 0 })
  check('regard « jusqu’à la fin du flux » : effacé quand le flux se ferme', u.sight.length === 0)
}

// --- canSee : la règle par zone --------------------------------------------------------------
{
  const s = fresh()
  const hand = s.players[0].hand[0]
  const spareCard = s.spare[0]
  const potCard = grabWhere(s, (c) => c.type === 'salary')
  put(s, potCard, 'pot')
  const job = grabWhere(s, (c) => c.key === 'pizzaiolo')
  setJob(s, s.players[2], job)
  const deckCard = s.deck[0]
  check('canSee main : son propriétaire seulement', canSee(s, 0, hand.uid) && !canSee(s, 1, hand.uid) && !canSee(s, null, hand.uid))
  check('canSee pioche : personne', [0, 1, 2, null].every((v) => !canSee(s, v, deckCard.uid)))
  check('canSee de côté : personne', [0, 1, 2, null].every((v) => !canSee(s, v, spareCard.uid)))
  check('canSee cagnotte, plateau, défausse : tout le monde', [0, 1, null].every((v) => canSee(s, v, potCard.uid) && canSee(s, v, job.uid)))
  check('cagnotte : publique dans la vue', viewFor(s, 1).pot.some((c) => c.uid === potCard.uid))
  check('carte introuvable : non', !canSee(s, 0, 'c99999'))
  const views = [0, 1, 2, null].map((v) => JSON.stringify(viewFor(s, v)))
  check('les cartes de côté n’apparaissent dans aucune vue', s.spare.every((c) => views.every((j) => !j.includes(`"${c.uid}"`))) && views.every((j) => !j.includes('"spare"')))
}

// --- règles bonus d'une extension (sans carte) ----------------------------------------------
{
  const s = fresh()
  const shieldCard = grab(s, SHIELD)
  place(s, 1, shieldCard)
  check('règle bonus : +1 smile par Bouclier posé, pour son propriétaire seulement',
    computeScore(s, s.players[1]).bonus === 1 && computeScore(s, s.players[0]).bonus === 0)
  const off = structuredClone(s)
  off.extensions = []
  check('règle bonus : pas en vigueur si l’extension n’est pas choisie', computeScore(off, off.players[1]).bonus === 0)
  const v = viewFor(s, 0)
  check('règle bonus : la même réponse sur une vue', computeScore(v, v.players[1]).bonus === 1)
}

// --- questions du tour : drawMode, nextPlayer et sens du jeu, skipLength, canDiscard, ----
// --- taille de main propre au joueur, tour de plus, souvenirs (history) -----------------------
{
  const probe = (answers, seed = 5) => {
    const s = newGameState(names, null, { seed, extensions: ['probe'] })
    s.probe = answers
    return s
  }
  const endTurnOf = (st) => {
    const me = st.current
    if (turnFrame(st).step === 'draw') st = act(st, legalActions(st, me).find((a) => a.type === 'DRAW_DECK' || a.type === 'SKIP_DRAW'))
    return act(st, legalActions(st, me).find((a) => a.type === 'DISCARD_CARD'))
  }
  // jeu de base : réponses de base
  const base = newGameState(names, null, { seed: 5 })
  check('jeu de base : drawMode « normal », sens +1, taille de main 5', drawMode(base, 0) === 'normal' && base.direction === 1 && handSize(base, 0) === 5)

  // drawMode 'none' : pas de pioche ce tour
  let s = probe({ drawMode: { set: 'none' } })
  const l = legalActions(s, 0).map((a) => a.type)
  check('drawMode none : on passe la pioche (SKIP_DRAW), sans pioche ni défausse', l.includes('SKIP_DRAW') && !l.includes('DRAW_DECK') && !l.includes('TAKE_DISCARD'))
  check('drawMode none : piocher est refusé', gameReducer(s, { type: 'DRAW_DECK', by: 0 }) === s)
  check('drawMode none : l’action par défaut est de passer la pioche', defaultAction(s, 0)?.type === 'SKIP_DRAW')
  const h = s.players[0].hand.length
  s = act(s, { type: 'SKIP_DRAW', by: 0 })
  check('drawMode none : étape play, main inchangée', turnFrame(s).step === 'play' && s.players[0].hand.length === h)
  const normal = probe({})
  check('drawMode normal : SKIP_DRAW absent et refusé', !legalActions(normal, 0).some((a) => a.type === 'SKIP_DRAW') && gameReducer(normal, { type: 'SKIP_DRAW', by: 0 }) === normal)

  // drawMode 'noDiscard' : pas de carte de la défausse
  s = probe({ drawMode: { set: 'noDiscard' } })
  const study = grabWhere(s, (c) => c.type === 'study')
  s.discard.push({ card: study, by: 1 })
  check('drawMode noDiscard : la carte de la défausse n’est pas proposée, et refusée',
    !legalActions(s, 0).some((a) => a.type === 'TAKE_DISCARD') && gameReducer(s, { type: 'TAKE_DISCARD', by: 0 }) === s)
  const withDiscard = probe({})
  withDiscard.discard.push({ card: grabWhere(withDiscard, (c) => c.type === 'study'), by: 1 })
  check('drawMode normal : la même carte de la défausse est proposée', legalActions(withDiscard, 0).some((a) => a.type === 'TAKE_DISCARD'))

  // nextPlayer et sens du jeu
  s = endTurnOf(probe({ nextPlayer: { set: 2 } }))
  check('nextPlayer : après Ana, le joueur que la question désigne (Cléo)', s.current === 2)
  let r = probe({})
  r.direction = -1
  r = endTurnOf(r)
  check('sens inversé : après Ana vient Cléo', r.current === 2)
  r = endTurnOf(r)
  check('sens inversé : puis Ben', r.current === 1 && !r.probe.rounds)
  r = endTurnOf(r)
  check('sens inversé : retour chez Ana = fin du tour de table (roundEnd)', r.current === 0 && r.probe.rounds === 1)

  // skipLength
  const accidentOn = (answers) => {
    let st = probe(answers)
    setStep(st, 'play')
    setPlays(st, 2) // le tour d'Ana reste ouvert : le tour passé de Ben n'est pas encore consommé
    const acc = grabWhere(st, (c) => c.key === 'accident')
    st.players[0].hand.push(acc)
    st = act(st, { type: 'PLAY_MALUS', uid: acc.uid, target: 1, by: 0 })
    return st.players[1].skipTurns
  }
  check('skipLength : Accident = 1 tour passé (imprimé)', accidentOn({}) === 1)
  check('skipLength : une règle +1 → 2 tours passés', accidentOn({ skipLength: { add: 1 } }) === 2)

  // canDiscard
  s = probe({ canDiscard: { forbid: 'Cette carte ne quitte pas la main' } })
  s = act(s, { type: 'DRAW_DECK', by: 0 })
  const c0 = s.players[0].hand[0]
  check('canDiscard interdit : la défausse n’est pas proposée, et refusée',
    !legalActions(s, 0).some((a) => a.type === 'DISCARD_CARD') && gameReducer(s, { type: 'DISCARD_CARD', uid: c0.uid, by: 0 }) === s)

  // taille de main propre au joueur (handDelta)
  s = probe({})
  s.players[0].handDelta = 1
  check('handDelta +1 : main de 6', handSize(s, 0) === 6)
  s = endTurnOf(s)
  check('handDelta +1 : la fin du tour complète la main à 6', s.players[0].hand.length === 6)
  s.players[1].handDelta = -1
  check('handDelta −1 : main de 4 (sur la vue aussi)', handSize(s, 1) === 4 && handSize(viewFor(s, 0), 1) === 4)

  // tour de plus
  s = probe({})
  s.players[0].extraTurns = 1
  const turnBefore = s.turnCount
  s = endTurnOf(s)
  check('tour de plus : Ana rejoue tout de suite, un nouveau tour commence', s.current === 0 && s.players[0].extraTurns === 0 &&
    s.turnCount === turnBefore + 1 && turnFrame(s).step === 'draw' && s.log.some((e) => e.text.includes('rejoue un tour')))
  s = endTurnOf(s)
  check('tour de plus utilisé : puis Ben', s.current === 1)

  // souvenirs
  s = probe({})
  setStep(s, 'play')
  const bandit = grabWhere(s, (c) => c.key === 'bandit')
  s.players[0].hand.push(bandit)
  check('souvenirs : rien au départ', !s.players[0].history.wasBandit && !s.players[0].history.didAttentat)
  s = act(s, { type: 'PLAY_SELF', uid: bandit.uid, by: 0 })
  check('souvenirs : le Bandit posé est retenu (history.wasBandit)', s.players[0].history.wasBandit === true)
}

// --- cartes d'extension par le registre (étape F2) : malus, acquisitions, ------------------
// --- distinction, carte spéciale qui compte ----------------------------------------------------
const GEL = 'test.gel', CHATON = 'test.chaton', CHATEAU = 'test.chateau', MEDAILLE = 'test.medaille', TREFLE = 'test.trefle'
{
  // malus : canTarget du comportement, onTarget pour l'effet
  let s = fresh()
  setStep(s, 'play')
  plainTop(s, 30)
  const gel = grab(s, GEL)
  s.players[0].hand.push(gel)
  // (réponse de base : canPlayMalus ; la question canTarget ne rend pas « hard »)
  const r = canPlayMalus(s, 0, gel, 1)
  check('malus d’extension : refusé sans flirt chez la cible, avec sa raison (refus normal)',
    !r.ok && r.reason === 'La cible doit avoir un flirt' && !r.hard && canTarget(s, 0, gel, 1).reason === r.reason)
  check('malus d’extension : jamais sur soi-même (refus définitif)', canPlayMalus(s, 0, gel, 0).hard === true)
  const unknown = { ...gel, uid: 'zz', def: 'zz.malus' }
  const u = canPlayMalus(s, 0, unknown, 1)
  check('malus sans canTarget : refus normal « Malus inconnu »', !u.ok && u.reason === 'Malus inconnu' && !u.hard)
  const f1 = grabWhere(s, (c) => c.type === 'flirt')
  place(s, 1, f1)
  check('malus d’extension : permis sur Ben (un flirt), pas sur Cléo (aucun)', canTarget(s, 0, gel, 1).ok && !canTarget(s, 0, gel, 2).ok)
  check('malus d’extension : listé dans les actions permises, seulement sur Ben',
    legalActions(s, 0).filter((a) => a.type === 'PLAY_MALUS' && a.uid === gel.uid).map((a) => a.target).join() === '1')
  s = act(s, { type: 'PLAY_MALUS', uid: gel.uid, target: 1, by: 0 })
  check('malus d’extension joué : le flirt de Ben est défaussé, le malus posé chez lui',
    s.players[1].flirts.length === 0 && s.discard.some((e) => e.card.uid === f1.uid) && s.players[1].malus.some((c) => c.uid === gel.uid))
  check('malus d’extension joué : le journal le dit', s.log.some((e) => e.text.includes('❄️ Ana gèle Ben')))
  // Ben renvoie le Gel avec la Vengeance
  s = settle(s)
  check('tour de Ben', s.current === 1)
  setStep(s, 'play')
  const f2 = grabWhere(s, (c) => c.type === 'flirt')
  place(s, 0, f2)
  const ven = grabWhere(s, (c) => c.key === 'vengeance')
  s.players[1].hand.push(ven)
  s = act(s, { type: 'PLAY_SELF', uid: ven.uid, by: 1 })
  check('Vengeance : le Gel reçu peut être renvoyé à Ana (elle a un flirt)',
    legalActions(s, 1).some((a) => a.type === 'VENGEANCE_PICK' && a.uid === gel.uid && a.target === 0))
  s = act(s, { type: 'VENGEANCE_PICK', uid: gel.uid, target: 0, by: 1 })
  check('Vengeance avec le Gel : le flirt d’Ana est défaussé, le Gel passe chez elle',
    s.players[0].flirts.length === 0 && s.players[0].malus.some((c) => c.uid === gel.uid) && !s.players[1].malus.some((c) => c.uid === gel.uid))
}
{
  // acquisition gratuite (animal) : onPlace joué à la pose
  let s = fresh()
  setStep(s, 'play')
  plainTop(s, 30)
  const chaton = grab(s, CHATON)
  s.players[0].hand.push(chaton)
  check('Chaton : gratuit, jouable sans argent', canPlace(s, 0, chaton).ok)
  s = act(s, { type: 'PLAY_SELF', uid: chaton.uid, by: 0 })
  check('Chaton joué : posé, son onPlace donne un jeu de plus (le tour d’Ana continue)',
    s.players[0].acquisitions.some((c) => c.uid === chaton.uid) && s.current === 0 && playsLeft(s) === 1)
  check('Chaton joué : le journal le dit', s.log.some((e) => e.text.includes('🐱 Le Chaton de Ana')))
}
{
  // acquisition à payer : onPlace après le paiement ; il pose un flux, l'achat l'attend
  let s = fresh()
  setStep(s, 'play')
  plainTop(s, 30)
  const chateau = grab(s, CHATEAU)
  const sal = grabWhere(s, (c) => c.type === 'salary' && c.level === 2)
  placeCard(s, s.players[0].money, sal)
  s.players[0].hand.push(chateau)
  s = act(s, { type: 'PLAY_SELF', uid: chateau.uid, by: 0 })
  check('Château : le flux d’achat attend le paiement, pas d’annonce avant', topFrame(s).flow === 'purchase' && s.stack.length === 2)
  const pay = legalActions(s, 0).find((a) => a.type === 'PURCHASE_CONFIRM' && !a.useArchitect)
  s = act(s, pay)
  check('Château payé : posé sur le salaire, puis son onPlace pose l’annonce PAR-DESSUS l’achat',
    s.players[0].acquisitions.some((c) => c.uid === chateau.uid) && onOf(s, sal) === chateau.uid &&
    s.stack.map((f) => `${f.flow}:${f.step}`).join('>') === 'turn:play>purchase:done>test.notice:look')
  check('Château payé : le jeu est déjà consommé, le tour attend l’annonce', playsLeft(s) === 0 && s.current === 0)
  check('Château payé : seule l’annonce est jouable', legalActions(s, 0).map((a) => a.type).join() === 'CLOSE_INFO')
  check('Château payé : invariants vérifiés pendant l’attente (chaque carte à un seul endroit, actions permises acceptées)',
    !throws(() => checkInvariants(s)))
  s = act(s, { type: 'CLOSE_INFO', by: 0 })
  check('annonce fermée : l’achat sort et le tour reprend une seule fois (au tour de Ben)',
    s.current === 1 && s.stack.length === 1 && turnFrame(s).step === 'draw')
  // carte forcée (prise dans la défausse) payée : la carte forcée est jouée
  let t = fresh()
  setStep(t, 'play')
  plainTop(t, 30)
  const ch2 = grab(t, CHATEAU)
  placeCard(t, t.players[0].money, grabWhere(t, (c) => c.type === 'salary' && c.level === 2))
  setForced(t, ch2, true)
  t = act(t, { type: 'PLAY_SELF', uid: ch2.uid, by: 0 })
  t = act(t, legalActions(t, 0).find((a) => a.type === 'PURCHASE_CONFIRM' && !a.useArchitect))
  check('Château forcé payé : plus de carte forcée pendant l’annonce', !turnFrame(t).data.forced && topFrame(t).flow === 'test.notice')
  check('Château forcé payé : invariants vérifiés pendant l’annonce', !throws(() => checkInvariants(t)))
  t = act(t, { type: 'CLOSE_INFO', by: 0 })
  check('Château forcé : annonce fermée, le tour passe à Ben', t.current === 1 && t.stack.length === 1)
}
{
  // distinction : canPlay du comportement ; type inconnu sans comportement
  let s = fresh()
  setStep(s, 'play')
  plainTop(s, 30)
  const med = grab(s, MEDAILLE)
  s.players[0].hand.push(med)
  check('Médaille : refusée sans enfant, avec sa raison', canPlace(s, 0, med).reason === 'Il faut au moins un enfant')
  check('distinction sans canPlay : « Carte inconnue »', canPlace(s, 0, { ...med, uid: 'zz', def: 'zz.distinction' }).reason === 'Carte inconnue')
  check('type inconnu sans canPlay : « Carte inconnue »', canPlace(s, 0, { ...med, uid: 'zz', def: 'zz.x', type: 'zz' }).reason === 'Carte inconnue')
  place(s, 0, grabWhere(s, (c) => c.type === 'child'))
  check('Médaille : permise avec un enfant (aussi d’après la vue d’Ana)', canPlace(s, 0, med).ok && canPlace(viewFor(s, 0), 0, med).ok)
  s = act(s, { type: 'PLAY_SELF', uid: med.uid, by: 0 })
  check('Médaille jouée : posée dans les distinctions, comptée (2 smiles)',
    s.players[0].distinctions.some((c) => c.uid === med.uid) && computeScore(s, 0).cat['Distinctions 🏅'] === 2)
}
{
  // décompte : cartes spéciales et malus reçus comptent aussi
  let s = fresh()
  setStep(s, 'play')
  plainTop(s, 30)
  const trefle = grab(s, TREFLE)
  s.players[0].hand.push(trefle)
  s = act(s, { type: 'PLAY_SELF', uid: trefle.uid, by: 0 })
  const sc = computeScore(s, 0)
  check('Trèfle joué : 2 smiles dans « Cartes spéciales », comptés dans le total',
    s.players[0].specials.some((c) => c.uid === trefle.uid) && sc.cat['Cartes spéciales 🃏'] === 2 && sc.total === 2 + sc.bonus + sc.cat['Études 📚'] + sc.cat['Métier 💼'] + sc.cat['Salaires 💰'] + sc.cat['Flirts 💕'] + sc.cat['Mariage 💒'] + sc.cat['Adultère 😏'] + sc.cat['Enfants 👶'] + sc.cat['Acquisitions 🏠'] + sc.cat['Distinctions 🏅'] + sc.cat['Malus ⚡'])
  const t = structuredClone(s)
  const bad = { ...grab(t, GEL), smiles: -3 }
  place(t, 1, bad)
  check('un malus reçu qui vaut des smiles compte dans « Malus »', computeScore(t, 1).cat['Malus ⚡'] === -3)
  check('les catégories couvrent tout le plateau de chaque joueur',
    t.players.every((p) => CATEGORIES.reduce((n, [, cards]) => n + cards(p).length, 0) === boardCards(p).length))
}

// --- fuite : parties simulées avec l'extension, chaque étape, chaque joueur ---------------------
{
  // cartes cachées à viewer, calculées sans canSee (contrôle indépendant)
  function hiddenUids(s, viewer) {
    const hidden = new Set()
    const pend = choiceOf(s)
    const me = viewer != null && viewer === s.current
    const sightOf = new Set((s.sight ?? []).filter((e) => e.viewer === 'all' || e.viewer === viewer).flatMap((e) => e.uids))
    const medium = new Set(me && pend?.type === 'medium' ? pend.cards.map((c) => c.uid) : [])
    for (const c of s.deck) if (!medium.has(c.uid)) hidden.add(c.uid)
    for (const c of s.spare) hidden.add(c.uid)
    s.players.forEach((p, i) => {
      if (i !== viewer && !(me && pend?.type === 'journalist')) for (const c of p.hand) hidden.add(c.uid)
      for (const c of boardCards(p)) if (metaOf(s, c.uid)?.faceDown) hidden.add(c.uid)
    })
    if (pend?.type === 'chance' && !me) for (const c of pend.cards) hidden.add(c.uid)
    if (s.casino?.stake && s.casino.stake.by !== viewer) hidden.add(s.casino.stake.card.uid)
    for (const u of sightOf) hidden.delete(u)
    return hidden
  }
  const GAMES = 12
  let views = 0
  let withCenter = 0
  const flows = new Set()
  for (let g = 0; g < GAMES; g++) {
    let s = newGame(g, 2000 + g, ['test'])
    // de temps en temps, un regard et une carte face cachée, pour que le scan les couvre
    let guard = 0
    let sawCenter = false
    while (true) {
      if (guard % 37 === 5 && s.status === 'playing') {
        const p = s.players[(guard / 37 | 0) % s.players.length]
        const c = boardCards(p)[0]
        s = structuredClone(s)
        if (c) setFaceDown(s, c.uid, !metaOf(s, c.uid).faceDown)
        if (p.hand[0]) addSight(s, (s.current + 1) % s.players.length, [p.hand[0].uid])
      }
      for (const v of [...s.players.keys(), null]) {
        const json = JSON.stringify(viewFor(s, v))
        if ('rng' in JSON.parse(json)) throw new Error('FUITE : rng')
        for (const u of hiddenUids(s, v)) if (json.includes(`"${u}"`)) throw new Error(`FUITE (partie ${g}, étape ${guard}, joueur ${v}) : carte ${u}`)
        views++
      }
      if (s.center.length) sawCenter = true
      for (const f of s.stack) flows.add(f.flow)
      if (s.status === 'over') break
      s = step(s)
      if (++guard > 20000) throw new Error('Partie infinie ?')
    }
    if (sawCenter) withCenter++
  }
  check(`fuite : le scan couvre le centre (${withCenter} parties) et l’annonce`, withCenter > 0 && flows.has('test.notice'))
  check(`aucune fuite sur ${GAMES} parties avec l’extension test (${views} vues, cartes de côté, faces cachées et regards compris)`, true)
}

console.log(`\n✅ ${passed} vérifications de l’extension test réussies`)
