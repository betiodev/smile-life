// Tests ciblés des 5 corrections signalées
import { gameReducer, newGameState } from '../src/game/reducer.js'
import {
  canPlace, canTakeDiscardTop, validatePayment, canPlayFromHand, canDiscardFromHand,
  flirtStealVictims, cheapestPayment, birthdayDonors, canTarget, interimReplaced,
  paidSalaries, spentSalaries, availableLiasses, effectiveSalaryLevel,
  unusedHeritage, paidCards, spentCards, canStopAdultery, canTakeRiverNow, heritageLiasses,
  handSize, price, needsPayment, architectFree, salaryLevels, hasTag, checkPayment, paymentRule,
} from '../src/game/rules.js'
import { computeScore, computeScores, cardSmiles } from '../src/game/scoring.js'
import {
  jobOf, marriageOf, adulteryOf, moneyOf, unspentMoney, malusOf, outOfGameCards, isMarried, isUsed, metaOf,
  moneyTraits, moneyValue, canStake, taxableMoney, giftableMoney,
} from '../src/game/state.js'
import {
  setJob, setMarriage, setAdultery, setMoney, addMoney, setMalus, placeCard, liftCard, loseJob,
} from '../src/game/primitives.js'
import { whoMustAct } from '../src/game/turn.js'
import { applyMalus } from '../src/game/effects.js'
import { setStep, setPlays, setForced, beginTurn } from '../src/game/flows/turn.js'
import { startFlow, setFlow } from '../src/game/flows/index.js'
import { phaseOf, playsLeft, forcedOf, isRainbow, cardPlayedThisTurn, choiceOf, onOf, specialsUnder, looseSpecials } from '../src/game/state.js'
import { legalActions, actionKey } from '../src/game/legal.js'
import { viewFor } from '../src/game/view.js'
import { buildDeck } from '../src/data/index.js'

const deck = buildDeck()
const find = (pred) => deck.find(pred)
const findAll = (pred) => deck.filter(pred)
const JOBS_IN_DECK = [...new Map(findAll((c) => c.type === 'job').map((c) => [c.key, c])).values()]

// partie neuve (Ana commence)
function freshState() {
  return gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'] })
}
let passed = 0
function check(label, cond) {
  if (!cond) throw new Error('ÉCHEC : ' + label)
  console.log('✓', label)
  passed++
}

// --- 1 & 5 : plafond = 6 CARTES études ; Médecin/Chirurgien au-delà ---------
{
  const s = freshState()
  const p = s.players[0]
  const singles = findAll((c) => c.type === 'study' && c.levels === 1)
  const double = find((c) => c.type === 'study' && c.levels === 2)
  // 5 cartes dont 1 double = 6 niveaux → une 6e carte doit être autorisée
  p.studies = [...singles.slice(0, 4), double]
  check('5 cartes (dont 1 double, niv. 6) → 6e carte autorisée', canPlace(s, 0, singles[10]).ok)
  // 6 cartes → 7e refusée
  p.studies = singles.slice(0, 6)
  check('6 cartes études → 7e refusée', !canPlace(s, 0, singles[10]).ok)
  // Médecin : études continues même au-delà de 6 cartes
  setJob(s, p, find((c) => c.key === 'medecin'))
  check('Médecin avec 6 cartes → 7e autorisée', canPlace(s, 0, singles[10]).ok)
  setJob(s, p, find((c) => c.key === 'chirurgien'))
  check('Chirurgien avec 6 cartes → 7e autorisée', canPlace(s, 0, singles[10]).ok)
  // un autre métier bloque toujours les études
  setJob(s, p, find((c) => c.key === 'pizzaiolo'))
  p.studies = singles.slice(0, 2)
  check('Pizzaïolo → études bloquées', !canPlace(s, 0, singles[10]).ok)
}

// --- 2 : la victime d'un malus ne reprend pas sa carte défaussée ------------
{
  let s = freshState()
  const study = find((c) => c.type === 'study' && c.levels === 1)
  const redoublement = find((c) => c.key === 'redoublement')
  s.players[1].studies = [study]
  s.players[0].hand[0] = redoublement
  setStep(s, 'play')
  s = gameReducer(s, { by: s.current, type: 'PLAY_MALUS', uid: redoublement.uid, target: 1 })
  const top = s.discard[s.discard.length - 1]
  check('Redoublement : l’étude défaussée est au nom de la victime', top.card.uid === study.uid && top.by === 1)
  s.current = 1; setStep(s, 'draw')
  check('La victime ne peut pas reprendre son étude de la défausse', !canTakeDiscardTop(s, 1).ok)
  check('Un autre joueur peut la reprendre', canTakeDiscardTop(s, 0).ok)

  // Divorce : le mariage défaussé est au nom de la victime
  let s2 = freshState()
  const marriage = find((c) => c.type === 'marriage')
  const flirt = find((c) => c.type === 'flirt')
  const divorce = find((c) => c.key === 'divorce')
  setMarriage(s2, s2.players[1], marriage)
  s2.players[1].flirts = [flirt]
  s2.players[0].hand[0] = divorce
  setStep(s2, 'play')
  s2 = gameReducer(s2, { by: s2.current, type: 'PLAY_MALUS', uid: divorce.uid, target: 1 })
  const top2 = s2.discard[s2.discard.length - 1]
  check('Divorce : le mariage défaussé est au nom de la victime', top2.card.uid === marriage.uid && top2.by === 1)
  s2.current = 1; setStep(s2, 'draw')
  check('La victime ne peut pas reprendre son mariage', !canTakeDiscardTop(s2, 1).ok)
}

// --- 3 : Chance → la carte gardée va en main, le tour se joue normalement ---
{
  let s = freshState()
  const chance = find((c) => c.key === 'chance')
  s.players[0].hand[0] = chance
  setStep(s, 'play')
  const before = s.players[0].hand.length // 5
  s = gameReducer(s, { by: s.current, type: 'PLAY_SELF', uid: chance.uid })
  check('Chance ouvre le choix des 3 cartes', choiceOf(s)?.type === 'chance' && choiceOf(s).cards.length === 3)
  const kept = choiceOf(s).cards[1]
  s = gameReducer(s, { by: s.current, type: 'CHANCE_PICK', uid: kept.uid })
  const p = s.players[0]
  check('La carte gardée est en main', p.hand.some((c) => c.uid === kept.uid))
  check('Pas de carte forcée après Chance', !forcedOf(s))
  check('Le joueur doit encore jouer sa carte du tour', phaseOf(s) === 'play' && playsLeft(s) === 1 && s.status === 'playing')
  check('Main = 5 (a joué Chance, gardé 1)', p.hand.length === before)
  check('Les 2 autres cartes sont défaussées à son nom', s.discard.slice(-2).every((e) => e.by === 0))
}

// --- 4 : Barmaid — flirts illimités sans mariage, plafond au départ du métier
{
  const s = freshState()
  const p = s.players[0]
  const flirts = findAll((c) => c.type === 'flirt')
  const barmaid = find((c) => c.key === 'barmaid')
  check('La carte s’appelle Barmaid', barmaid.name === 'Barmaid')
  p.flirts = flirts.slice(0, 5)
  check('Sans métier : 6e flirt refusé', !canPlace(s, 0, flirts[6]).ok)
  setJob(s, p, barmaid)
  check('Barmaid célibataire : 6e flirt autorisé', canPlace(s, 0, flirts[6]).ok)
  p.flirts = flirts.slice(0, 7)
  check('Barmaid : 8e flirt autorisé (illimité)', canPlace(s, 0, flirts[8]).ok)
  setMarriage(s, p, find((c) => c.type === 'marriage'))
  check('Barmaid mariée : flirt interdit', !canPlace(s, 0, flirts[8]).ok)
  setMarriage(s, p, null)
  setJob(s, p, null) // démission/licenciement
  check('Après le métier : flirts conservés (7) mais plus de pose', !canPlace(s, 0, flirts[8]).ok && p.flirts.length === 7)
}

// --- Achat : pas de salaire superflu (anti-évasion fiscale) ------------------
{
  // coût 3 : [2,1] exact → OK ; [2,2] surpaie inévitable → OK ; [2,2,1] superflu → refusé
  check('Paiement exact accepté', validatePayment(3, [2, 1]).ok)
  check('Surpaie inévitable acceptée (manque 1, paie avec un salaire de 2)', validatePayment(3, [2, 2]).ok)
  check('Salaire superflu refusé', !validatePayment(3, [2, 2, 1]).ok)
  check('Total insuffisant refusé', !validatePayment(3, [1, 1]).ok)
  // héritage (3 liasses, tout ou rien)
  check('Héritage nécessaire accepté', validatePayment(3, [], 3).ok)
  check('Héritage superflu refusé', !validatePayment(3, [3], 3).ok)
  check('Salaire superflu en plus de l’héritage refusé', !validatePayment(3, [1], 3).ok)

  // et côté reducer : PURCHASE_CONFIRM applique la même règle
  const s = freshState()
  const travel = find((c) => c.acqType === 'travel')
  const sal2 = findAll((c) => c.type === 'salary' && c.level === 2)
  const sal1 = find((c) => c.type === 'salary' && c.level === 1)
  setStep(s, 'play')
  setMoney(s, s.players[0], [sal2[0], sal2[1], sal1])
  startFlow(s, 'purchase', { card: travel })
  const refus = gameReducer(s, { by: s.current, type: 'PURCHASE_CONFIRM', salaryUids: [sal2[0].uid, sal2[1].uid, sal1.uid], useHeritage: false })
  check('Reducer : achat avec salaire superflu refusé', refus === s)
  const okBuy = gameReducer(s, { by: s.current, type: 'PURCHASE_CONFIRM', salaryUids: [sal2[0].uid, sal2[1].uid], useHeritage: false })
  check('Reducer : surpaie inévitable acceptée (4/3)', okBuy !== s && okBuy.players[0].acquisitions.some((c) => c.uid === travel.uid))
  check('Reducer : les 2 salaires choisis sont investis, le 3e non',
    moneyOf(okBuy.players[0]).length - unspentMoney(okBuy, okBuy.players[0]).length === 2 &&
    unspentMoney(okBuy, okBuy.players[0]).some((c) => c.uid === sal1.uid))
  // un même salaire nommé plusieurs fois ne compte qu'une fois
  check('Reducer : un salaire répété dans le paiement ne compte qu’une fois', travel.cost > 1 &&
    gameReducer(s, { by: s.current, type: 'PURCHASE_CONFIRM', salaryUids: Array(travel.cost).fill(sal1.uid), useHeritage: false }) === s)

  // les salaires payés sont rattachés à l'acquisition (posés sous elle)
  const buyer = okBuy.players[0]
  check('Achat : les salaires payés sont liés à l’acquisition',
    paidSalaries(okBuy, buyer, travel.uid).map((c) => c.uid).sort().join() === [sal2[0].uid, sal2[1].uid].sort().join())
  check('Achat : aucun salaire dépensé orphelin', spentSalaries(okBuy, buyer).length === 0)
  check('Méta : salaires payés retournés et posés sous l’acquisition',
    [sal2[0], sal2[1]].every((c) => metaOf(okBuy, c.uid).used && metaOf(okBuy, c.uid).on === travel.uid) && !isUsed(okBuy, sal1))
  check('Méta : l’acquisition est posée après les salaires',
    metaOf(okBuy, travel.uid).seq > Math.max(...[sal2[0], sal2[1], sal1].map((c) => metaOf(okBuy, c.uid).seq)))
  // acquisition retirée du jeu : ses salaires restent au joueur, retournés
  const score = computeScore(okBuy, buyer).total
  const lost = structuredClone(okBuy)
  liftCard(lost, lost.players[0].acquisitions, travel.uid)
  const sans = lost.players[0]
  check('Acquisition perdue : sa méta disparaît, les salaires ne sont plus posés dessus',
    !metaOf(lost, travel.uid) && [sal2[0], sal2[1]].every((c) => isUsed(lost, c) && !metaOf(lost, c.uid).on))
  check('Acquisition perdue : ses salaires deviennent « dépensés »', spentSalaries(lost, sans).length === 2)
  check('Salaires dépensés : smiles conservés', computeScore(lost, sans).total === score - travel.smiles)
  check('Salaires dépensés : inutilisables pour payer', availableLiasses(lost, sans) === 1)
}

// --- Héritage : visible jusqu'à l'achat, puis sous l'acquisition --------------
{
  let s = freshState()
  setStep(s, 'play')
  const her = find((c) => c.key === 'heritage')
  const travel = find((c) => c.acqType === 'travel')
  s.players[0].hand[0] = her
  s = gameReducer(s, { by: s.current, type: 'PLAY_SELF', uid: her.uid })
  const p0 = s.players[0]
  check('Héritage posé : 3 liasses, carte visible (non utilisée)', heritageLiasses(s, p0) === 3 && unusedHeritage(s, p0).length === 1)
  s.current = 0
  setStep(s, 'play')
  setPlays(s, 1)
  startFlow(s, 'purchase', { card: travel })
  const buy = gameReducer(s, { by: s.current, type: 'PURCHASE_CONFIRM', salaryUids: [], useHeritage: true })
  const b0 = buy.players[0]
  check('Achat avec l’Héritage : il passe sous l’acquisition', heritageLiasses(buy, b0) === 0 && unusedHeritage(buy, b0).length === 0 &&
    paidCards(buy, b0, travel.uid).some((c) => c.uid === her.uid))
  check('Méta : l’Héritage est retourné, posé sous l’acquisition', metaOf(buy, her.uid).used && metaOf(buy, her.uid).on === travel.uid)
  check('Héritage : reste parmi les cartes spéciales jouées', b0.specials.some((c) => c.uid === her.uid))
  const lost = structuredClone(buy)
  liftCard(lost, lost.players[0].acquisitions, travel.uid)
  check('Acquisition perdue : l’Héritage rejoint l’argent dépensé', spentCards(lost, lost.players[0]).some((c) => c.uid === her.uid))
  check('Acquisition perdue : l’Héritage ne revient pas en liasses', heritageLiasses(lost, lost.players[0]) === 0)
}

// --- Grand Prix d'excellence : métier perdu → sans effet, smiles conservés ---
{
  const s = freshState()
  setStep(s, 'play')
  const lic = find((c) => c.key === 'licenciement')
  const gp = find((c) => c.key === 'grandprix')
  const legion = find((c) => c.key === 'legion')
  const ecrivain = JOBS_IN_DECK.find((c) => c.key === 'ecrivain')
  const autre = JOBS_IN_DECK.find((c) => c.tags.includes('trophy') && c.key !== 'ecrivain')
  setJob(s, s.players[1], ecrivain)
  placeCard(s, s.players[1].distinctions, legion)
  placeCard(s, s.players[1].distinctions, gp)
  s.players[0].hand[0] = lic
  check('Grand Prix actif : salaire niveau 4', effectiveSalaryLevel(s, s.players[1]) === 4)
  const after = gameReducer(s, { by: s.current, type: 'PLAY_MALUS', uid: lic.uid, target: 1 })
  const v = after.players[1]
  check('Licenciement : Grand Prix sans effet, Légion intacte',
    !jobOf(v) && isUsed(after, gp) && !isUsed(after, legion))
  check('Licenciement : le Grand Prix compte toujours ses smiles', computeScore(after, v).cat['Distinctions 🏅'] === gp.smiles + legion.smiles)
  const suite = structuredClone(after)
  setJob(suite, suite.players[1], autre)
  check('Nouveau métier : le Grand Prix reste sans effet', effectiveSalaryLevel(suite, suite.players[1]) === autre.salaryLevel)
}

// --- Anniversaire : chaque donateur choisit le salaire offert ---------------
// Ana joue l'Anniversaire ; Ben (salaires 1 et 3) et Cléo (2 libre, 4 investi)
// offrent chacun un salaire via BIRTHDAY_GIFT, dans n'importe quel ordre.
{
  const anniv = find((c) => c.key === 'anniversaire')
  const lv = (n) => find((c) => c.type === 'salary' && c.level === n)
  const [b1, b3, c2, c4] = [lv(1), lv(3), lv(2), lv(4)]
  const setup = () => {
    const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben', 'Cléo'] })
    setStep(s, 'play')
    s.players[0].hand[0] = anniv
    setMoney(s, s.players[1], [b1, b3])
    setMoney(s, s.players[2], [c2])
    addMoney(s, s.players[2], c4, { used: true })
    return s
  }
  const uids = (p) => moneyOf(p).map((c) => c.uid).sort().join()
  const texts = (s, n) => s.log.slice(-n).map((e) => e.text)
  const gift = (s, by, uid) => gameReducer(s, { type: 'BIRTHDAY_GIFT', by, uid })

  const s = setup()
  check('Anniversaire : Ben et Cléo sont donateurs', birthdayDonors(s, 0).join() === '1,2')
  const p = gameReducer(s, { by: 0, type: 'PLAY_SELF', uid: anniv.uid })
  check('Anniversaire : un choix des donateurs est en attente', choiceOf(p)?.type === 'birthday' &&
    choiceOf(p).donors.join() === '1,2' && p.players[0].specials.some((c) => c.uid === anniv.uid))
  check('Anniversaire : aucun salaire ne bouge avant la fin des choix', moneyOf(p.players[0]).length === 0 &&
    moneyOf(p.players[1]).length === 2 && moneyOf(p.players[2]).length === 2)
  check('whoMustAct : les deux donateurs pendant l’Anniversaire', whoMustAct(p).join() === '1,2')
  check('Anniversaire : PLAY_SELF n’accepte plus de « gifts »',
    choiceOf(gameReducer(s, { by: 0, type: 'PLAY_SELF', uid: anniv.uid, gifts: { 1: b3.uid, 2: c2.uid } }))?.type === 'birthday')

  // refus
  check('Anniversaire : le joueur fêté ne peut pas offrir', gift(p, 0, null) === p)
  check('Anniversaire : le joueur fêté ne peut pas jouer pendant les choix',
    gameReducer(p, { by: 0, type: 'DISCARD_CARD', uid: p.players[0].hand[0].uid }) === p)
  check('Anniversaire : un salaire investi est refusé', gift(p, 2, c4.uid) === p)
  check('Anniversaire : le salaire d’un autre joueur est refusé', gift(p, 1, c2.uid) === p)
  check('Anniversaire : un salaire inconnu est refusé', gift(p, 1, 'pas-un-uid') === p)

  // Ben puis Cléo
  const r1 = gift(p, 1, b3.uid)
  check('Anniversaire : le choix de Ben est noté, rien n’est encore donné', choiceOf(r1)?.gifts[1] === b3.uid &&
    moneyOf(r1.players[1]).length === 2 && moneyOf(r1.players[0]).length === 0)
  check('Anniversaire : choiceOf(p) reste inchangé (état immuable)', Object.keys(choiceOf(p).gifts).length === 0)
  check('whoMustAct : seule Cléo reste à choisir', whoMustAct(r1).join() === '2')
  check('Anniversaire : Ben ne peut pas offrir deux fois', gift(r1, 1, b1.uid) === r1)
  const r2 = gift(r1, 2, null)
  check('Anniversaire : le salaire choisi par Ben (niveau 3) est offert',
    moneyOf(r2.players[0]).some((c) => c.uid === b3.uid) && uids(r2.players[1]) === b1.uid)
  check('Anniversaire : uid null offre le plus petit salaire libre (pas l’investi)',
    moneyOf(r2.players[0]).some((c) => c.uid === c2.uid) && uids(r2.players[2]) === c4.uid)
  check('Anniversaire : journal dans l’ordre des joueurs', texts(r2, 2).join('|') ===
    '🎂 Ben offre un salaire niveau 3 à Ana|🎂 Cléo offre un salaire niveau 2 à Ana')
  check('Anniversaire : le tour se termine ensuite normalement', choiceOf(r2) === null &&
    r2.current === 1 && r2.turnCount === p.turnCount + 1 && whoMustAct(r2).join() === '1')

  // Cléo puis Ben : même résultat
  const q2 = gift(gift(p, 2, null), 1, b3.uid)
  check('Anniversaire : ordre inverse, même résultat',
    q2.players.every((x, i) => uids(x) === uids(r2.players[i])) && q2.current === r2.current &&
    texts(q2, 2).join('|') === texts(r2, 2).join('|'))
  check('Anniversaire : uid null de Ben offre son niveau 1',
    moneyOf(gift(gift(p, 1, null), 2, null).players[0]).some((c) => c.uid === b1.uid))

  // Cléo n'a aucun salaire libre : seul Ben donne
  const sc = setup()
  setMoney(sc, sc.players[2], [])
  addMoney(sc, sc.players[2], c4, { used: true })
  const pc = gameReducer(sc, { by: 0, type: 'PLAY_SELF', uid: anniv.uid })
  check('Anniversaire : sans salaire libre, Cléo n’est pas donatrice', choiceOf(pc).donors.join() === '1' && whoMustAct(pc).join() === '1')
  check('Anniversaire : Cléo ne peut pas offrir', gift(pc, 2, null) === pc)
  const rc = gift(pc, 1, b1.uid)
  check('Anniversaire : Cléo « n’a aucun salaire à offrir »', choiceOf(rc) === null &&
    texts(rc, 2).join('|') === '🎂 Ben offre un salaire niveau 1 à Ana|🎂 Cléo n’a aucun salaire à offrir')

  // personne ne peut donner : réglé tout de suite
  const sn = setup()
  setMoney(sn, sn.players[1], [])
  setMoney(sn, sn.players[2], [])
  addMoney(sn, sn.players[2], c4, { used: true })
  check('Anniversaire : sans salaire non investi, pas de donateur', birthdayDonors(sn, 0).length === 0)
  const rn = gameReducer(sn, { by: 0, type: 'PLAY_SELF', uid: anniv.uid })
  check('Anniversaire sans donateur : réglé tout de suite', choiceOf(rn) === null && rn.current === 1 &&
    rn.log.some((e) => e.text === '🎂 Triste anniversaire pour Ana...'))

  // pendant un Arc-en-ciel : Ana continue de jouer après les cadeaux
  const sa = setup()
  setPlays(sa, 3)
  const ra = gift(gift(gameReducer(sa, { by: 0, type: 'PLAY_SELF', uid: anniv.uid }), 1, null), 2, null)
  check('Anniversaire pendant un Arc-en-ciel : le tour continue', choiceOf(ra) === null && ra.current === 0 &&
    phaseOf(ra) === 'play' && playsLeft(ra) === 2 && whoMustAct(ra).join() === '0')
  const next = gameReducer(ra, { by: 0, type: 'DISCARD_CARD', uid: ra.players[0].hand[0].uid })
  check('Anniversaire pendant un Arc-en-ciel : Ana peut rejouer', next !== ra && playsLeft(next) === 1)
}

// --- Aides d'interface : jouabilité, défausse forcée, vol de flirt, paiement --
{
  const s = freshState()
  setStep(s, 'play')
  const sal = find((c) => c.type === 'salary' && c.level === 1)
  check('Salaire sans métier : injouable, avec la raison du moteur', canPlayFromHand(s, 0, sal).reason === 'Il faut un métier pour poser un salaire')
  const prison = find((c) => c.key === 'prison')
  check('Prison sans Bandit en jeu : injouable', !canPlayFromHand(s, 0, prison).ok)
  setForced(s, sal, true)
  check('Carte prise dans la défausse : défausse interdite', !canDiscardFromHand(s, 0, sal).ok)
  setForced(s, forcedOf(s), false)
  check('Carte d’Étoile filante : défausse permise', canDiscardFromHand(s, 0, sal).ok)

  const bars = findAll((c) => c.type === 'flirt' && c.place === 'Au bar')
  const zoo = find((c) => c.type === 'flirt' && c.place === 'Au zoo')
  s.players[1].flirts = [bars[0], zoo]
  check('Flirt sous le dessus : pas de vol', flirtStealVictims(s, 0, bars[1]).length === 0)
  s.players[1].flirts = [zoo, bars[0]]
  check('Flirt du dessus, même lieu : vol chez Ben', flirtStealVictims(s, 0, bars[1]).join() === '1')

  const p = s.players[0]
  const lv = (n, k = 0) => findAll((c) => c.type === 'salary' && c.level === n)[k]
  setMoney(s, p, [lv(4), lv(2), lv(1), lv(2, 1)])
  const pay = cheapestPayment(s, p, 3)
  check('Paiement le moins cher pour 3 : 2+1', pay.total === 3 && pay.salaryUids.length === 2)
  check('Paiement le moins cher pour 6 : 4+2', cheapestPayment(s, p, 6).total === 6 && cheapestPayment(s, p, 6).salaryUids.length === 2)
  check('Paiement impossible → null', cheapestPayment(s, p, 20) === null)
  placeCard(s, p.specials, find((c) => c.key === 'heritage'))
  check('Héritage seul quand il suffit pour 3 (aucun salaire investi)', cheapestPayment(s, p, 3).useHeritage && cheapestPayment(s, p, 3).salaryUids.length === 0)
}

// --- Intérimaire : Études ou nouveau métier sans démissionner ---------------
{
  const study = find((c) => c.type === 'study' && c.levels === 1)
  const sal = find((c) => c.type === 'salary' && c.level === 1)
  const barmaid = find((c) => c.key === 'barmaid')
  const setup = (card) => {
    const s = freshState()
    setStep(s, 'play')
    const p = s.players[0]
    setJob(s, p, barmaid)
    setMoney(s, p, [sal])
    p.hand[0] = card
    return s
  }
  const interims = JOBS_IN_DECK.filter((j) => j.status === 'interim').map((j) => j.key).sort().join()
  check('Intérimaires : Serveur, Barmaid, Jardinier, Plombier, Stripteaser', interims === 'barmaid,jardinier,plombier,serveur,stripteaser')

  // intérimaire → Études
  let s = setup(study)
  check('Intérimaire : Études jouables', canPlayFromHand(s, 0, study).ok)
  check('Intérimaire : Études remplacent le métier', interimReplaced(s.players[0], study)?.uid === barmaid.uid)
  s = gameReducer(s, { by: s.current, type: 'PLAY_SELF', uid: study.uid })
  let p = s.players[0]
  check('Intérimaire → Études : étude posée, métier retiré', p.studies.some((c) => c.uid === study.uid) && jobOf(p) === null)
  check('Intérimaire → Études : Barmaid à la défausse, au nom du joueur', s.discard.some((e) => e.card.uid === barmaid.uid && e.by === 0))
  check('Intérimaire → Études : salaire conservé tel quel', moneyOf(p).length === 1 && unspentMoney(s, p)[0]?.uid === sal.uid)
  check('Intérimaire → Études : le jeu du tour est consommé', s.current === 1)

  // intérimaire → nouveau métier (exigences remplies)
  const pizzaiolo = find((c) => c.key === 'pizzaiolo')
  s = setup(pizzaiolo)
  check('Intérimaire : Pizzaïolo jouable', canPlayFromHand(s, 0, pizzaiolo).ok)
  s = gameReducer(s, { by: s.current, type: 'PLAY_SELF', uid: pizzaiolo.uid })
  p = s.players[0]
  check('Intérimaire → métier : nouveau métier en poste', jobOf(p)?.uid === pizzaiolo.uid)
  check('Intérimaire → métier : Barmaid à la défausse', s.discard.some((e) => e.card.uid === barmaid.uid))
  check('Intérimaire → métier : salaire conservé', moneyOf(p).length === 1 && moneyOf(p)[0].uid === sal.uid)
  check('Intérimaire → métier : le jeu du tour est consommé', s.current === 1)

  // intérimaire → métier sans les études requises : toujours bloqué
  const medecin = find((c) => c.key === 'medecin')
  s = setup(medecin)
  const why = canPlayFromHand(s, 0, medecin)
  check('Intérimaire → Médecin sans études : bloqué, avec la raison', !why.ok && why.reason === 'Niveau d’études insuffisant (0/6)')
  check('Reducer : la pose refusée ne change rien', gameReducer(s, { by: s.current, type: 'PLAY_SELF', uid: medecin.uid }) === s)

  // métier normal → Études : toujours bloqué
  s = setup(study)
  setJob(s, s.players[0], pizzaiolo)
  const why2 = canPlayFromHand(s, 0, study)
  check('Métier normal → Études : bloqué (démission d’abord)', !why2.ok && /démissionnez/.test(why2.reason))
  check('Métier normal → autre métier : bloqué', !canPlayFromHand(s, 0, find((c) => c.key === 'serveur')).ok)
  check('Métier normal : rien n’est remplacé', interimReplaced(s.players[0], study) === null)

  // intérimaire → Piston : le métier part à la pose du Piston, puis on choisit le métier
  const piston = find((c) => c.key === 'piston')
  s = setup(piston)
  s.players[0].hand[1] = medecin
  check('Intérimaire : Piston jouable', canPlayFromHand(s, 0, piston).ok)
  s = gameReducer(s, { by: s.current, type: 'PLAY_SELF', uid: piston.uid })
  p = s.players[0]
  check('Intérimaire → Piston : Barmaid défaussée, choix du métier ouvert',
    jobOf(p) === null && choiceOf(s)?.type === 'piston' && s.discard.some((e) => e.card.uid === barmaid.uid && e.by === 0))
  s = gameReducer(s, { by: s.current, type: 'PISTON_PICK', uid: medecin.uid })
  p = s.players[0]
  check('Intérimaire → Piston : Médecin en poste sans les études', jobOf(p)?.uid === medecin.uid && p.studies.length === 0)
  check('Intérimaire → Piston : salaire conservé', moneyOf(p).length === 1 && moneyOf(p)[0].uid === sal.uid)
  check('Intérimaire → Piston : le jeu du tour est consommé', s.current === 1)
  s = setup(piston)
  setJob(s, s.players[0], pizzaiolo)
  s.players[0].hand[1] = medecin
  check('Métier normal → Piston : toujours bloqué', !canPlayFromHand(s, 0, piston).ok)
}

// --- Licenciement : jamais sur un fonctionnaire -----------------------------
{
  const fonctionnaires = JOBS_IN_DECK.filter((j) => j.status === 'fonctionnaire').map((j) => j.key).sort().join()
  check('Fonctionnaires : Militaire, Policier, 4 Profs, Grand Prof',
    fonctionnaires === 'grand_prof,militaire,policier,prof_anglais,prof_francais,prof_histoire,prof_maths')
  const lic = find((c) => c.key === 'licenciement')
  const setup = (job) => {
    const s = freshState()
    setStep(s, 'play')
    s.players[0].hand[0] = lic
    setJob(s, s.players[1], job ? find((c) => c.key === job) : null)
    return s
  }
  let s = setup('prof_maths')
  check('Licenciement sur un fonctionnaire : bloqué', !canTarget(s, 0, lic, 1).ok)
  check('Licenciement sans cible : injouable, avec la raison', canPlayFromHand(s, 0, lic).reason === 'Aucun joueur ne peut être licencié')
  check('Licenciement sans cible : défausse permise', canDiscardFromHand(s, 0, lic).ok)
  check('Reducer : licenciement d’un fonctionnaire refusé', gameReducer(s, { by: s.current, type: 'PLAY_MALUS', uid: lic.uid, target: 1 }) === s)
  s = setup(null)
  check('Licenciement sur un joueur sans métier : bloqué', canPlayFromHand(s, 0, lic).reason === 'Aucun joueur ne peut être licencié')

  s = setup('pizzaiolo')
  check('Licenciement sur un métier normal : jouable', canTarget(s, 0, lic, 1).ok && canPlayFromHand(s, 0, lic).ok)
  s = gameReducer(s, { by: s.current, type: 'PLAY_MALUS', uid: lic.uid, target: 1 })
  check('Licenciement : le Pizzaïolo est défaussé', jobOf(s.players[1]) === null && s.discard.some((e) => e.card.key === 'pizzaiolo'))

  s = setup('serveur')
  check('Licenciement sur un intérimaire : jouable', canTarget(s, 0, lic, 1).ok)
  s = gameReducer(s, { by: s.current, type: 'PLAY_MALUS', uid: lic.uid, target: 1 })
  check('Licenciement : le Serveur est défaussé', jobOf(s.players[1]) === null)
}

// --- Auteur des actions : seul un joueur autorisé peut agir ----------------
{
  let s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben', 'Cléo'] })
  check('whoMustAct : le joueur courant au début du tour', JSON.stringify(whoMustAct(s)) === '[0]')
  check('« Prêt » n’existe plus dans le moteur (passage d’écran : src/session/)', gameReducer(s, { type: 'READY', by: 0 }) === s)
  check('Action sans auteur ignorée', gameReducer(s, { type: 'DRAW_DECK' }) === s)
  check('Tour normal : pioche d’un autre joueur ignorée', gameReducer(s, { type: 'DRAW_DECK', by: 1 }) === s)
  check('Tour normal : pioche d’un 3e joueur ignorée', gameReducer(s, { type: 'DRAW_DECK', by: 2 }) === s)
  s = gameReducer(s, { type: 'DRAW_DECK', by: 0 })
  check('Tour normal : le joueur courant pioche', phaseOf(s) === 'play' && s.players[0].hand.length === 6)
  const uid = s.players[0].hand[0].uid
  check('Tour normal : défausse par un autre joueur ignorée', gameReducer(s, { type: 'DISCARD_CARD', uid, by: 1 }) === s)
}

// --- Troc du Chef : à l'étape opp-pick, c'est l'adversaire qui choisit ------
{
  const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben', 'Cléo'] })
  setStep(s, 'play')
  setJob(s, s.players[0], find((c) => c.key === 'chef_achats'))
  const protectedUid = s.players[0].hand[0].uid
  setFlow(s, 'chef-troc', 'opp-pick', { target: 1, protectedUid })
  check('whoMustAct : l’adversaire visé en opp-pick', JSON.stringify(whoMustAct(s)) === '[1]')
  check('Chef troc opp-pick : le Chef est refusé', gameReducer(s, { type: 'CHEF_TROC_OPP_PICK', index: 0, by: 0 }) === s)
  check('Chef troc opp-pick : un 3e joueur est refusé', gameReducer(s, { type: 'CHEF_TROC_OPP_PICK', index: 0, by: 2 }) === s)
  const r = gameReducer(s, { type: 'CHEF_TROC_OPP_PICK', index: 0, by: 1 })
  // l'adversaire pioche dans la main du Chef, hors carte protégée
  check('Chef troc opp-pick : l’adversaire est accepté', r !== s && choiceOf(r).step === 'chef-pick' &&
    choiceOf(r).oppPickedUid !== protectedUid && s.players[0].hand.some((c) => c.uid === choiceOf(r).oppPickedUid))
  check('Chef troc chef-pick : de nouveau au tour du Chef', JSON.stringify(whoMustAct(r)) === '[0]' &&
    gameReducer(r, { type: 'CHEF_TROC_CHEF_PICK', index: 0, by: 1 }) === r)
}

// --- Troc du Chef : les pioches face cachée ne dépendent pas de la position ---
{
  const RUNS = 200
  const base = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'] })
  setStep(base, 'play')
  setJob(base, base.players[0], find((c) => c.key === 'chef_achats'))
  const chefHand = base.players[0].hand
  const oppHand = base.players[1].hand
  const protectedUid = chefHand[0].uid

  // l'adversaire pioche chez le Chef, en visant toujours la dernière position
  const oppState = structuredClone(base)
  setFlow(oppState, 'chef-troc', 'opp-pick', { target: 1, protectedUid })
  const lastPickable = chefHand.length - 2
  const oppTaken = new Map()
  for (let i = 0; i < RUNS; i++) {
    // hasard à graine : une graine différente à chaque essai
    const r = gameReducer({ ...oppState, rng: i }, { type: 'CHEF_TROC_OPP_PICK', index: lastPickable, by: 1 })
    oppTaken.set(choiceOf(r).oppPickedUid, (oppTaken.get(choiceOf(r).oppPickedUid) ?? 0) + 1)
  }
  check('Chef troc opp-pick : la carte protégée n’est jamais prise', !oppTaken.has(protectedUid))
  check('Chef troc opp-pick : la dernière position n’est pas toujours prise',
    (oppTaken.get(chefHand[chefHand.length - 1].uid) ?? 0) < RUNS)
  check('Chef troc opp-pick : chaque carte non protégée est prise au moins une fois',
    chefHand.slice(1).every((c) => oppTaken.has(c.uid)))

  // le Chef pioche chez l'adversaire ; la dernière carte est connue (ex. prise dans la rivière)
  const oppPickedUid = chefHand[1].uid
  const chefState = structuredClone(base)
  setFlow(chefState, 'chef-troc', 'chef-pick', { target: 1, oppPickedUid })
  const known = oppHand[oppHand.length - 1]
  const chefTaken = new Map()
  for (let i = 0; i < RUNS; i++) {
    const r = gameReducer({ ...chefState, rng: i }, { type: 'CHEF_TROC_CHEF_PICK', index: oppHand.length - 1, by: 0 })
    const got = r.players[0].hand[r.players[0].hand.length - 1]
    chefTaken.set(got.uid, (chefTaken.get(got.uid) ?? 0) + 1)
  }
  check('Chef troc chef-pick : la carte connue n’est pas toujours prise', (chefTaken.get(known.uid) ?? 0) < RUNS)
  check('Chef troc chef-pick : chaque carte adverse est prise au moins une fois',
    oppHand.every((c) => chefTaken.has(c.uid)))
}

// --- Chercheur qui perd son métier : il choisit la carte défaussée en plus ---
{
  const chercheur = find((c) => c.key === 'chercheur')
  const licenciement = find((c) => c.key === 'licenciement')
  // Ana (0) joue, Ben (1) est Chercheur avec 6 cartes en main
  const setup = () => {
    const s = freshState()
    setStep(s, 'play')
    setJob(s, s.players[1], chercheur)
    s.players[1].hand.push(s.deck.pop())
    s.players[0].hand[0] = licenciement
    return s
  }

  // Licenciement pendant le tour d'Ana
  const s = setup()
  const r = gameReducer(s, { type: 'PLAY_MALUS', uid: licenciement.uid, target: 1, by: 0 })
  check('Chercheur licencié : le choix s’ouvre pour Ben', choiceOf(r)?.type === 'chercheur-discard' && choiceOf(r).player === 1 &&
    jobOf(r.players[1]) === null && r.players[1].hand.length === 6)
  check('Chercheur licencié : seul Ben peut agir', JSON.stringify(whoMustAct(r)) === '[1]')
  check('Chercheur licencié : le tour d’Ana attend le choix', r.current === 0 && r.turnCount === s.turnCount)
  const chosen = r.players[1].hand[2]
  check('Chercheur licencié : Ana ne peut pas choisir à sa place',
    gameReducer(r, { type: 'CHERCHEUR_DISCARD', uid: chosen.uid, by: 0 }) === r)
  check('Chercheur licencié : Ana ne peut rien jouer d’autre', gameReducer(r, { type: 'END_PLAYS', by: 0 }) === r)
  check('Chercheur licencié : une carte hors de sa main est refusée',
    gameReducer(r, { type: 'CHERCHEUR_DISCARD', uid: r.players[0].hand[1].uid, by: 1 }) === r)
  const d = gameReducer(r, { type: 'CHERCHEUR_DISCARD', uid: chosen.uid, by: 1 })
  check('Chercheur licencié : la carte choisie va à la défausse', d.discard[d.discard.length - 1].card.uid === chosen.uid &&
    d.discard[d.discard.length - 1].by === 1 && d.players[1].hand.length === 5 && !d.players[1].hand.some((c) => c.uid === chosen.uid))
  check('Chercheur licencié : le métier est défaussé', d.discard.some((e) => e.card.uid === chercheur.uid))
  check('Chercheur licencié : puis le tour d’Ana se termine normalement', choiceOf(d) === null && d.current === 1 &&
    d.turnCount === r.turnCount + 1 && d.players[0].hand.length === 5)
  check('Chercheur licencié : action sans choix en attente refusée',
    gameReducer(d, { type: 'CHERCHEUR_DISCARD', uid: d.players[1].hand[0].uid, by: 1 }) === d)

  // uid null (délai dépassé) : une carte de sa main au hasard
  const n = gameReducer(r, { type: 'CHERCHEUR_DISCARD', uid: null, by: 1 })
  const top = n.discard[n.discard.length - 1]
  check('Chercheur : uid null défausse une carte de sa main', n.players[1].hand.length === 5 && top.by === 1 &&
    r.players[1].hand.some((c) => c.uid === top.card.uid) && n.current === 1)

  // Licenciement par Vengeance : le choix n'est pas écrasé
  const v = setup()
  v.players[0].hand[0] = v.deck.pop()
  setMalus(v, v.players[0], [licenciement])
  setFlow(v, 'vengeance', 'pick')
  setPlays(v, 0) // la carte Vengeance a déjà consommé le jeu
  const rv = gameReducer(v, { type: 'VENGEANCE_PICK', uid: licenciement.uid, target: 1, by: 0 })
  check('Chercheur licencié par Vengeance : le choix s’ouvre pour Ben', choiceOf(rv)?.type === 'chercheur-discard' && rv.current === 0)
  const dv = gameReducer(rv, { type: 'CHERCHEUR_DISCARD', uid: null, by: 1 })
  check('Chercheur licencié par Vengeance : puis le tour d’Ana se termine', choiceOf(dv) === null && dv.current === 1)

  // Démission volontaire pendant son propre tour
  const m = freshState()
  setJob(m, m.players[0], chercheur)
  m.players[0].hand.push(m.deck.pop())
  const rm = gameReducer(m, { type: 'RESIGN', by: 0 })
  check('Chercheur démissionnaire : le choix s’ouvre, le tour n’est pas fini', choiceOf(rm)?.type === 'chercheur-discard' &&
    choiceOf(rm).player === 0 && rm.current === 0 && rm.turnCount === m.turnCount && rm.players[0].hand.length === 6)
  check('Chercheur démissionnaire : pas de pioche avant le choix', gameReducer(rm, { type: 'DRAW_DECK', by: 0 }) === rm)
  check('Chercheur démissionnaire : un autre joueur est refusé',
    gameReducer(rm, { type: 'CHERCHEUR_DISCARD', uid: null, by: 1 }) === rm)
  const pick = rm.players[0].hand[0]
  const dm = gameReducer(rm, { type: 'CHERCHEUR_DISCARD', uid: pick.uid, by: 0 })
  check('Chercheur démissionnaire : la carte choisie est défaussée, puis il passe son tour',
    dm.discard[dm.discard.length - 1].card.uid === pick.uid && choiceOf(dm) === null && dm.current === 1 &&
    dm.turnCount === rm.turnCount + 1 && dm.players[0].hand.length === 5)

  // main vide : aucun choix
  const e = setup()
  e.players[1].hand = []
  const re = gameReducer(e, { type: 'PLAY_MALUS', uid: licenciement.uid, target: 1, by: 0 })
  check('Chercheur licencié, main vide : aucun choix, le tour se termine', choiceOf(re) === null && re.current === 1 &&
    re.discard[re.discard.length - 1].card.uid === chercheur.uid)
}

// --- Arrêter l'adultère : pendant son tour, sans choix en attente ----------
{
  const adultere = find((c) => c.type === 'adultery')
  const flirt = find((c) => c.type === 'flirt')
  const setup = () => {
    let s = freshState()
    setAdultery(s, s.players[0], adultere)
    s.players[0].flirts = [flirt]
    return s
  }
  let s = setup()
  const autreTour = { ...s, current: 1 }
  check('Adultère : refusé pendant le tour d’un autre joueur', !canStopAdultery(autreTour, 0).ok &&
    gameReducer(autreTour, { type: 'STOP_ADULTERY', by: 0 }) === autreTour)
  check('Adultère : un autre joueur ne peut pas l’arrêter', gameReducer(s, { type: 'STOP_ADULTERY', by: 1 }) === s)

  // avant la pioche
  let r = gameReducer(s, { type: 'STOP_ADULTERY', by: 0 })
  check('Adultère : arrêt autorisé avant la pioche', adulteryOf(r.players[0]) === null &&
    r.players[0].flirts.length === 1 && r.discard.at(-1).card.uid === adultere.uid && phaseOf(r) === 'draw')

  // après la pioche, avant de jouer
  s = gameReducer(s, { type: 'DRAW_DECK', by: 0 })
  r = gameReducer(s, { type: 'STOP_ADULTERY', by: 0 })
  check('Adultère : arrêt autorisé après la pioche, sans consommer le jeu', adulteryOf(r.players[0]) === null &&
    phaseOf(r) === 'play' && playsLeft(r) === 1 && r.current === 0)

  // le joueur joue ensuite normalement
  const study = find((c) => c.type === 'study' && c.levels === 1)
  r.players[0].hand[0] = study
  const played = gameReducer(r, { type: 'PLAY_SELF', uid: study.uid, by: 0 })
  check('Adultère : le joueur joue une carte normalement ensuite', played !== r &&
    played.players[0].studies.some((c) => c.uid === study.uid) && played.current === 1)

  // refusé après avoir joué l'Arc-en-ciel, entre ses jeux
  const arc = find((c) => c.key === 'arcenciel')
  const avant = gameReducer(s, { type: 'STOP_ADULTERY', by: 0 })
  s.players[0].hand[0] = arc
  const arcJoue = gameReducer(s, { type: 'PLAY_SELF', uid: arc.uid, by: 0 })
  check('Adultère : autorisé avant l’Arc-en-ciel', adulteryOf(avant.players[0]) === null)
  check('Adultère : refusé entre les jeux de l’Arc-en-ciel', playsLeft(arcJoue) === 3 &&
    !canStopAdultery(arcJoue, 0).ok && gameReducer(arcJoue, { type: 'STOP_ADULTERY', by: 0 }) === arcJoue)

  // refusé aussi après une Chance (le jeu revient à 1, mais une carte a été jouée)
  const chance = find((c) => c.key === 'chance')
  s.players[0].hand[0] = chance
  let ch = gameReducer(s, { type: 'PLAY_SELF', uid: chance.uid, by: 0 })
  ch = gameReducer(ch, { type: 'CHANCE_PICK', uid: choiceOf(ch).cards[0].uid, by: 0 })
  check('Adultère : refusé après avoir joué Chance', playsLeft(ch) === 1 &&
    gameReducer(ch, { type: 'STOP_ADULTERY', by: 0 }) === ch)

  // au tour suivant, de nouveau autorisé
  const tourSuivant = gameReducer(arcJoue, { type: 'END_PLAYS', by: 0 })
  check('Adultère : le marqueur est remis à zéro au tour suivant', cardPlayedThisTurn(tourSuivant) === false)

  // refusé pendant un choix en attente ou avec une carte forcée
  const pend = structuredClone(s)
  setFlow(pend, 'journalist', 'look')
  check('Adultère : refusé pendant un choix en attente', gameReducer(pend, { type: 'STOP_ADULTERY', by: 0 }) === pend)
  const forced = structuredClone(s)
  setForced(forced, study, false)
  check('Adultère : refusé avec une carte forcée', gameReducer(forced, { type: 'STOP_ADULTERY', by: 0 }) === forced)
}

// --- Rivière : Chance jouée tout de suite, le remplacement vide la pioche ---
{
  let s = newGameState(['Ana', 'Ben'], null, { river: true })
  const chance = find((c) => c.key === 'chance')
  s.river[0] = chance
  // une seule carte en pioche : elle remplacera la Chance dans la rivière
  s.deck = s.deck.slice(0, 1)
  check('Rivière : Chance non jouable si le remplacement vide la pioche', !canTakeRiverNow(s, 0, chance))
  check('Rivière : prise « jouer » refusée (pas de carte forcée bloquée)',
    gameReducer(s, { type: 'TAKE_RIVER', index: 0, playNow: true, by: 0 }) === s)
  const garde = gameReducer(s, { type: 'TAKE_RIVER', index: 0, playNow: false, by: 0 })
  check('Rivière : la Chance peut quand même être gardée en main',
    garde.players[0].hand.some((c) => c.uid === chance.uid) && garde.deck.length === 0)
  // avec 2 cartes en pioche, il en reste une après le remplacement
  s.deck = buildDeck().slice(0, 2).map((c, i) => ({ ...c, uid: 'test-pioche-' + i }))
  check('Rivière : Chance jouable s’il reste une carte après le remplacement', canTakeRiverNow(s, 0, chance))
  const joue = gameReducer(s, { type: 'TAKE_RIVER', index: 0, playNow: true, by: 0 })
  check('Rivière : Chance prise et forcée', forcedOf(joue)?.uid === chance.uid && joue.deck.length === 1)
}

// --- Règles vérifiées (CLAUDE.md) sans test jusqu'ici --------------------------

// Flirts : jamais retournés ; seul le flirt du dessus peut être volé
{
  const bars = findAll((c) => c.type === 'flirt' && c.place === 'Au bar')
  const zoo = find((c) => c.type === 'flirt' && c.place === 'Au zoo')
  const parc = findAll((c) => c.type === 'flirt' && c.place !== 'Au bar' && c.place !== 'Au zoo')
  const play = (setup) => {
    const s = freshState()
    setStep(s, 'play')
    setup(s)
    return s
  }

  // le flirt du dessus de Ben est d'un autre lieu : son flirt « Au bar » dessous n'est pas volé
  const s1 = play((s) => { s.players[1].flirts = [bars[0], zoo]; s.players[0].hand[0] = bars[1] })
  const r1 = gameReducer(s1, { type: 'PLAY_SELF', uid: bars[1].uid, by: 0 })
  check('Vol de flirt (reducer) : un flirt sous le dessus n’est jamais volé',
    r1.players[1].flirts.map((c) => c.uid).join() === [bars[0].uid, zoo.uid].join() &&
    r1.players[0].flirts.map((c) => c.uid).join() === bars[1].uid)

  // le flirt du dessus est du même lieu : lui seul est volé
  const s2 = play((s) => { s.players[1].flirts = [zoo, bars[0]]; s.players[0].hand[0] = bars[1] })
  const r2 = gameReducer(s2, { type: 'PLAY_SELF', uid: bars[1].uid, by: 0 })
  check('Vol de flirt (reducer) : seul le flirt du dessus est volé',
    r2.players[1].flirts.map((c) => c.uid).join() === zoo.uid &&
    r2.players[0].flirts.map((c) => c.uid).sort().join() === [bars[0].uid, bars[1].uid].sort().join())

  // mariage, adultère, divorce : les flirts restent posés, face visible, avec leurs smiles
  const marriage = find((c) => c.type === 'marriage')
  const s3 = play((s) => { s.players[0].flirts = parc.slice(0, 3); s.players[0].hand[0] = marriage })
  const before = JSON.stringify(s3.players[0].flirts)
  const r3 = gameReducer(s3, { type: 'PLAY_SELF', uid: marriage.uid, by: 0 })
  check('Mariage : les flirts restent posés, inchangés (jamais retournés)',
    marriageOf(r3.players[0])?.uid === marriage.uid && JSON.stringify(r3.players[0].flirts) === before)
  check('Mariage : les flirts comptent toujours leurs smiles', computeScore(r3, 0).cat['Flirts 💕'] === 3)
  check('Flirts : jamais rangés parmi les cartes retournées',
    !r3.players[0].specials.some((c) => c.type === 'flirt') && !malusOf(r3.players[0]).some((c) => c.type === 'flirt'))
}

// Piston : jamais pour la promotion Grand Prof
{
  const piston = find((c) => c.key === 'piston')
  const grandProf = find((c) => c.key === 'grand_prof')
  const medecin = find((c) => c.key === 'medecin')
  const s = freshState()
  setStep(s, 'play')
  s.players[0].hand = [piston, grandProf]
  check('Piston : injouable avec le seul Grand Prof en main', !canPlayFromHand(s, 0, piston).ok)
  s.players[0].hand = [piston, grandProf, medecin]
  check('Piston : jouable avec un autre métier en main', canPlayFromHand(s, 0, piston).ok)
  const r = gameReducer(s, { type: 'PLAY_SELF', uid: piston.uid, by: 0 })
  check('Piston : le choix du métier s’ouvre', choiceOf(r)?.type === 'piston')
  check('Piston : le Grand Prof est refusé', gameReducer(r, { type: 'PISTON_PICK', uid: grandProf.uid, by: 0 }) === r)
  const ok = gameReducer(r, { type: 'PISTON_PICK', uid: medecin.uid, by: 0 })
  check('Piston : un métier normal est accepté', jobOf(ok.players[0])?.uid === medecin.uid)
}

// Piston : la carte reste derrière le métier obtenu (tout le monde voit
// pourquoi), puis rejoint les spéciales utilisées quand ce métier est perdu
{
  const piston = find((c) => c.key === 'piston')
  const medecin = find((c) => c.key === 'medecin')
  const licenciement = find((c) => c.key === 'licenciement')
  const s = freshState()
  setStep(s, 'play')
  s.players[0].hand = [piston, medecin]
  let r = gameReducer(s, { type: 'PLAY_SELF', uid: piston.uid, by: 0 })
  r = gameReducer(r, { type: 'PISTON_PICK', uid: medecin.uid, by: 0 })
  const a = r.players[0]
  check('Piston : la carte est sous le métier obtenu', onOf(r, piston) === medecin.uid &&
    specialsUnder(r, a, medecin.uid).map((c) => c.uid).join() === piston.uid && !looseSpecials(r, a).some((c) => c.uid === piston.uid))
  check('Piston : visible de tous, sous le métier', [1, null].every((v) => viewFor(r, v).meta[piston.uid]?.on === medecin.uid))
  // licenciement : le Piston rejoint les spéciales utilisées
  const l = structuredClone(r)
  l.players[1].hand[0] = licenciement
  setStep(l, 'play')
  const fired = gameReducer(l, { type: 'PLAY_MALUS', uid: licenciement.uid, target: 0, by: 1 })
  check('Piston : métier perdu par licenciement → spéciale utilisée',
    jobOf(fired.players[0]) === null && onOf(fired, piston) === null &&
    looseSpecials(fired, fired.players[0]).some((c) => c.uid === piston.uid))
  // démission : pareil
  const d = structuredClone(r)
  d.current = 0
  beginTurn(d)
  const quit = gameReducer(d, { type: 'RESIGN', by: 0 })
  check('Piston : métier perdu par démission → spéciale utilisée',
    jobOf(quit.players[0]) === null && onOf(quit, piston) === null &&
    looseSpecials(quit, quit.players[0]).some((c) => c.uid === piston.uid))
  check('Piston : il compte toujours parmi les spéciales du joueur', quit.players[0].specials.some((c) => c.uid === piston.uid))
}

// Licorne : doublée seulement avec l'Arc-en-ciel ET l'Étoile filante
{
  const licorne = find((c) => c.key === 'licorne')
  const arc = find((c) => c.key === 'arcenciel')
  const etoile = find((c) => c.key === 'etoile')
  const acq = (specials) => {
    const s = freshState()
    placeCard(s, s.players[0].acquisitions, licorne)
    for (const c of specials) placeCard(s, s.players[0].specials, c)
    return computeScore(s, 0).cat['Acquisitions 🏠']
  }
  check('Licorne seule : 3 smiles', acq([]) === 3)
  check('Licorne + Arc-en-ciel seul : pas doublée', acq([arc]) === 3)
  check('Licorne + Étoile filante seule : pas doublée', acq([etoile]) === 3)
  check('Licorne + Arc-en-ciel + Étoile filante : doublée (6)', acq([arc, etoile]) === 6)
  {
    const s = freshState()
    placeCard(s, s.players[0].acquisitions, licorne)
    placeCard(s, s.players[0].specials, arc)
    placeCard(s, s.players[0].specials, etoile)
    const ch = computeScore(s, 0).changed['Acquisitions 🏠']
    check('Licorne doublée : signalée à l’écran de fin (3 → 6)', ch?.length === 1 && ch[0].printed === 3 && ch[0].smiles === 6)
    check('Licorne doublée : seulement chez son propriétaire', computeScore(s, 1).changed['Acquisitions 🏠'] === undefined)
  }
}

// --- Liste des actions permises (legalActions) et trous fermés dans le reducer ---
{
  const types = (l) => l.map((a) => a.type)
  let s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'] })
  check('legalActions : rien pour un joueur qui n’a pas la main', legalActions(s, 1).length === 0)
  check('legalActions : les actions sont signées', legalActions(s, 0).every((a) => a.by === 0))
  check('« Prêt » refusé (n’existe plus)', gameReducer(s, { type: 'READY', by: 0 }) === s)
  check('legalActions : la pioche est proposée', types(legalActions(s, 0)).includes('DRAW_DECK'))
  s = gameReducer(s, { type: 'DRAW_DECK', by: 0 })
  check('legalActions : défausser chaque carte de la main est proposé',
    s.players[0].hand.every((c) => legalActions(s, 0).some((a) => a.type === 'DISCARD_CARD' && a.uid === c.uid)))
  check('Fin de tour sans jouer (un seul jeu) : refusée et absente de la liste',
    gameReducer(s, { type: 'END_PLAYS', by: 0 }) === s && !types(legalActions(s, 0)).includes('END_PLAYS'))
}
{
  // carte forcée : elle seule peut être jouée
  const s = freshState()
  setStep(s, 'play')
  const study = find((c) => c.type === 'study')
  const sal = find((c) => c.type === 'salary')
  setForced(s, study, true)
  s.players[0].hand[0] = sal
  s.casino = { owner: 1, stake: null }
  const other = s.players[0].hand[1]
  check('Carte forcée : jouer une autre carte de la main est refusé',
    gameReducer(s, { type: 'PLAY_SELF', uid: other.uid, by: 0 }) === s && gameReducer(s, { type: 'DISCARD_CARD', uid: other.uid, by: 0 }) === s)
  check('Carte forcée : miser un salaire de la main au Casino est refusé', gameReducer(s, { type: 'CASINO_BET', uid: sal.uid, by: 0 }) === s)
  check('Carte forcée : la liste ne propose que la carte forcée',
    JSON.stringify(legalActions(s, 0).map((a) => [a.type, a.uid])) === JSON.stringify([['PLAY_SELF', study.uid]]))
}
{
  // Casino : le salaire pris dans la défausse peut être misé (règle vérifiée par Teto)
  let s = freshState()
  // un vrai salaire de la pioche de cette partie (une copie de buildDeck() peut
  // porter le même uid qu'une carte de la partie : le test échouait 3 fois sur 100)
  const [sal] = s.deck.splice(s.deck.findIndex((c) => c.type === 'salary' && c.level === 1), 1)
  setMoney(s, s.players[1], [])
  s.discard = [{ card: sal, by: 1 }]
  s.casino = { owner: 1, stake: null }
  setJob(s, s.players[0], find((c) => c.key === 'pizzaiolo'))
  s = gameReducer(s, { type: 'TAKE_DISCARD', by: 0 })
  check('Casino : salaire pris dans la défausse, mise proposée', forcedOf(s)?.uid === sal.uid &&
    legalActions(s, 0).some((a) => a.type === 'CASINO_BET' && a.uid === sal.uid))
  const r = gameReducer(s, { type: 'CASINO_BET', uid: sal.uid, by: 0 })
  check('Casino : salaire de la défausse misé, le tour se termine', r !== s && r.casino.stake?.card.uid === sal.uid &&
    forcedOf(r) === null && r.current === 1 && phaseOf(r) === 'draw')
  check('Casino : la carte misée n’est plus nulle part ailleurs',
    !r.players[0].hand.some((c) => c.uid === sal.uid) && !r.discard.some((e) => e.card.uid === sal.uid))
}
{
  // Troc du Chef : un index hors de la main est refusé
  const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'] })
  setStep(s, 'play')
  setJob(s, s.players[0], find((c) => c.key === 'chef_achats'))
  setFlow(s, 'chef-troc', 'opp-pick', { target: 1, protectedUid: s.players[0].hand[0].uid })
  const n = s.players[0].hand.length - 1
  check('Chef troc : la liste propose une pioche par carte non protégée', legalActions(s, 1).length === n)
  check('Chef troc : index hors de la main refusé', gameReducer(s, { type: 'CHEF_TROC_OPP_PICK', index: n, by: 1 }) === s &&
    gameReducer(s, { type: 'CHEF_TROC_OPP_PICK', index: -1, by: 1 }) === s)
  check('Chef troc : même liste sur la vue de l’adversaire',
    legalActions(viewFor(s, 1), 1).map(actionKey).join() === legalActions(s, 1).map(actionKey).join())
}
{
  // achat : la liste donne le paiement le moins cher ; toute autre combinaison valide reste acceptée
  const s = freshState()
  setStep(s, 'play')
  const travel = find((c) => c.acqType === 'travel' && c.cost === 3)
  const lv = (n) => findAll((c) => c.type === 'salary' && c.level === n)
  const [a1, b1] = lv(1), [a2] = lv(2), [a3] = lv(3)
  setJob(s, s.players[0], find((c) => c.key === 'pizzaiolo'))
  setMoney(s, s.players[0], [a1, b1, a2, a3])
  startFlow(s, 'purchase', { card: travel })
  const pay = legalActions(s, 0).find((a) => a.type === 'PURCHASE_CONFIRM')
  check('Achat : la liste propose le paiement le moins cher (le salaire de 3)', JSON.stringify(pay.salaryUids) === JSON.stringify([a3.uid]))
  check('Achat : un autre paiement valide reste accepté (2 + 1)',
    gameReducer(s, { type: 'PURCHASE_CONFIRM', salaryUids: [a2.uid, a1.uid], by: 0 }) !== s)
  check('Achat : même liste sur la vue du joueur',
    legalActions(viewFor(s, 0), 0).map(actionKey).join() === legalActions(s, 0).map(actionKey).join())
}
{
  // un état n'est jamais modifié par une action essayée dessus (pile des cartes retirées comprise)
  const s = freshState()
  setStep(s, 'play')
  const attentat = find((c) => c.key === 'attentat')
  s.players[0].hand[0] = attentat
  const before = JSON.stringify(s)
  const r = gameReducer(s, { type: 'PLAY_MALUS', uid: attentat.uid, target: 1, by: 0 })
  check('Attentat : la carte est retirée du jeu', outOfGameCards(r).some((c) => c.uid === attentat.uid))
  check('Attentat : l’état de départ n’est pas modifié', JSON.stringify(s) === before && outOfGameCards(s).length === 0)
  check('Hors jeu : chaque carte garde sa cause et son auteur',
    r.outOfGame.length > 0 && r.outOfGame.every((e) => e.cause === 'attentat' && e.by === 0))
}
{
  // les zones sont des listes, mais le jeu de base garde un seul métier et un seul mariage
  const s = freshState()
  const p = s.players[0]
  const [pizzaiolo, serveur] = [find((c) => c.key === 'pizzaiolo'), find((c) => c.key === 'serveur')]
  const [m1, m2] = findAll((c) => c.type === 'marriage')
  setJob(s, p, pizzaiolo)
  check('Un seul métier : un 2e métier est refusé', !canPlace(s, 0, serveur).ok)
  p.flirts.push(find((c) => c.type === 'flirt'))
  setMarriage(s, p, m1)
  check('Un seul mariage : un 2e mariage est refusé', !canPlace(s, 0, m2).ok)
  check('Sélecteurs : une seule carte dans chaque liste', jobOf(p) === pizzaiolo && marriageOf(p) === m1 && isMarried(p))
}

// --- Arc-en-ciel : « jouez JUSQU'À 3 cartes », on peut s'arrêter avant ------
{
  const arc = find((c) => c.key === 'arcenciel')
  const peutTerminer = (st) => legalActions(st, 0).some((a) => a.type === 'END_PLAYS')
  let s = gameReducer(freshState(), { type: 'DRAW_DECK', by: 0 })
  check('Tour normal : pas de bouton Terminer', !peutTerminer(s) &&
    gameReducer(s, { type: 'END_PLAYS', by: 0 }) === s)
  s.players[0].hand[0] = arc
  s = gameReducer(s, { type: 'PLAY_SELF', uid: arc.uid, by: 0 })
  check('Arc-en-ciel : 3 jeux, on peut terminer tout de suite', playsLeft(s) === 3 && peutTerminer(s))
  const apres = (st, n) => {
    for (let i = 0; i < n; i++) st = gameReducer(st, { type: 'DISCARD_CARD', uid: st.players[0].hand[0].uid, by: 0 })
    return st
  }
  for (const n of [1, 2]) {
    const r = apres(s, n)
    check(`Arc-en-ciel : après ${n} carte(s), on peut terminer`, r.current === 0 && playsLeft(r) === 3 - n && peutTerminer(r))
    const fin = gameReducer(r, { type: 'END_PLAYS', by: 0 })
    check(`Arc-en-ciel : terminer après ${n} carte(s) passe au joueur suivant`, fin.current === 1 &&
      phaseOf(fin) === 'draw' && fin.players[0].hand.length === 5 && !isRainbow(fin) && !peutTerminer(fin))
  }
  const trois = apres(s, 3)
  check('Arc-en-ciel : après 3 cartes, le tour se termine seul', trois.current === 1 && !isRainbow(trois))
  check('Arc-en-ciel : un autre joueur ne peut pas terminer', gameReducer(s, { type: 'END_PLAYS', by: 1 }) === s)
}

// --- Méta des cartes posées : ordre de pose, carte qui quitte la table ----------
{
  const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'], seed: 6 })
  check('Méta : vide au début de la partie', Object.keys(s.meta).length === 0 && s.seqCounter === 0)
  setStep(s, 'play')
  const [f1, f2] = findAll((c) => c.type === 'flirt' && c.place === findAll((x) => x.type === 'flirt')[0].place)
  const mariage = find((c) => c.type === 'marriage')
  const divorce = find((c) => c.key === 'divorce')
  // Ben a un flirt et un mariage ; Ana pose un flirt au même endroit et vole celui de Ben
  placeCard(s, s.players[1].flirts, f1)
  setMarriage(s, s.players[1], mariage)
  s.players[0].hand[0] = f2
  const seqBefore = s.meta[f1.uid].seq
  const vol = gameReducer(s, { by: 0, type: 'PLAY_SELF', uid: f2.uid })
  check('Méta : la carte posée reçoit le numéro suivant', vol.meta[f2.uid].seq === s.seqCounter + 1)
  check('Méta : le flirt volé est posé de nouveau chez le voleur (plus récent)',
    vol.players[0].flirts.at(-1).uid === f1.uid && vol.meta[f1.uid].seq > seqBefore && vol.meta[f1.uid].seq > vol.meta[f2.uid].seq)
  check('Méta : l’état précédent n’est pas modifié', s.meta[f1.uid].seq === seqBefore && !s.meta[f2.uid])
  // Ben subit un Divorce : le mariage quitte la table, sa méta disparaît ; le Divorce est posé
  vol.current = 0; setStep(vol, 'play'); setPlays(vol, 1)
  vol.players[0].hand[0] = divorce
  const d = gameReducer(vol, { by: 0, type: 'PLAY_MALUS', uid: divorce.uid, target: 1 })
  check('Méta : la carte qui quitte la table perd sa méta', !d.meta[mariage.uid] && d.discard.some((e) => e.card.uid === mariage.uid))
  check('Méta : le malus reçu est posé avec un numéro', d.meta[divorce.uid]?.seq === vol.seqCounter + 1)
}

// --- Avantages et immunités des métiers (modificateurs, src/game/cards/base.js) ---
// Les raisons de refus sont celles d'avant, mot pour mot.
{
  const job = (key) => find((c) => c.type === 'job' && c.key === key)
  const malus = (key) => find((c) => c.type === 'malus' && c.key === key)
  const reason = (r) => (r.ok ? 'OK' : r.reason)
  const s = freshState()
  const [ana, ben] = s.players
  setJob(s, ana, job('pizzaiolo'))
  const vs = (key) => reason(canTarget(s, 0, malus(key), 1))

  setJob(s, ben, job('garagiste'))
  check('Garagiste : « Le Garagiste ne subit aucun accident »', vs('accident') === 'Le Garagiste ne subit aucun accident')
  check('Garagiste : la maladie passe', vs('maladie') === 'OK')
  for (const key of ['pharmacien', 'medecin', 'chirurgien']) {
    setJob(s, ben, job(key))
    check(`${job(key).name} : « immunisé contre la maladie »`, vs('maladie') === `${job(key).name} : immunisé contre la maladie`)
  }
  setJob(s, ben, job('avocat'))
  check('Avocat non marié : « La cible doit être mariée »', vs('divorce') === 'La cible doit être mariée')
  setMarriage(s, ben, find((c) => c.type === 'marriage'))
  check('Avocat marié : « L’Avocat ne subit aucun divorce »', vs('divorce') === 'L’Avocat ne subit aucun divorce')
  setMarriage(s, ben, null)
  setJob(s, ben, job('prof_maths'))
  check('Prof : « Un fonctionnaire ne peut pas être licencié »', vs('licenciement') === 'Un fonctionnaire ne peut pas être licencié')
  setJob(s, ben, job('grand_prof'))
  check('Grand Prof : fonctionnaire aussi', vs('licenciement') === 'Un fonctionnaire ne peut pas être licencié')
  setJob(s, ben, job('bandit'))
  check('Bandit : « Le Bandit : ni impôt, ni licenciement » (licenciement)', vs('licenciement') === 'Le Bandit : ni impôt, ni licenciement')
  check('Bandit sans salaire : la raison Bandit passe avant (impôt)', vs('impot') === 'Le Bandit : ni impôt, ni licenciement')
  check('Bandit : la Prison est jouable', vs('prison') === 'OK')
  setJob(s, ben, job('gourou'))
  check('Gourou : « La prison ne concerne que le Bandit »', vs('prison') === 'La prison ne concerne que le Bandit')
  setJob(s, ben, null)
  check('Sans métier : « La cible doit avoir un métier »', vs('licenciement') === 'La cible doit avoir un métier')
  check('Sur soi-même : refusé', reason(canTarget(s, 0, malus('accident'), 0)) === 'On ne joue pas un malus sur soi-même')
  // Militaire : aucun attentat, ni contre lui ni contre les autres, ni par lui
  setJob(s, ben, job('militaire'))
  check('Militaire : « Un Militaire est en poste : aucun attentat possible »', vs('attentat') === 'Un Militaire est en poste : aucun attentat possible')
  check('Militaire : le Militaire lui-même non plus', reason(canTarget(s, 1, malus('attentat'), 0)) === 'Un Militaire est en poste : aucun attentat possible')
  // Policier : ni Bandit ni Gourou, pour tout le monde
  setJob(s, ben, job('policier'))
  setJob(s, ana, null)
  check('Policier : « Un Policier est en poste : ni Bandit ni Gourou »',
    reason(canPlace(s, 0, job('bandit'))) === 'Un Policier est en poste : ni Bandit ni Gourou')
  setJob(s, ana, job('pizzaiolo'))
  check('Policier, mais déjà un métier : « Un seul métier à la fois » reste la raison',
    reason(canPlace(s, 0, job('gourou'))) === 'Un seul métier à la fois (démissionnez d’abord)')
  // Légion d'honneur : Bandit en poste
  setJob(s, ben, job('bandit'))
  check('Bandit en poste : « Interdite aux Bandits, présents ou passés »',
    reason(canPlace(s, 1, find((c) => c.key === 'legion'))) === 'Interdite aux Bandits, présents ou passés')
  // Chercheur : main de 6
  setJob(s, ben, job('chercheur'))
  check('Chercheur : main de 6', handSize(s, 1) === 6 && handSize(s, 0) === 5)
  // Pilote : voyage gratuit, posé sans achat
  setJob(s, ben, job('pilote'))
  const voyage = find((c) => hasTag(c, 'travel'))
  check('Pilote : voyage gratuit', price(s, 1, voyage) === 0 && !needsPayment(s, 1, voyage) && canPlace(s, 1, voyage).ok)
  check('Sans Pilote : le voyage coûte 3', price(s, 0, voyage) === 3 && needsPayment(s, 0, voyage))
  check('Sans argent : « Coût : 3 liasses (vous avez 0) »', reason(canPlace(s, 0, voyage)) === 'Coût : 3 liasses (vous avez 0)')
  // Architecte : maison offerte au choix (le prix normal reste proposé)
  setJob(s, ben, job('architecte'))
  const maison = find((c) => hasTag(c, 'house'))
  check('Architecte : maison offerte au choix', architectFree(s, 1, maison) && price(s, 1, maison) === maison.cost && canPlace(s, 1, maison).ok)
  ben.architectFreeUsed = true
  check('Architecte : une seule maison offerte par métier', !architectFree(s, 1, maison) && !canPlace(s, 1, maison).ok)
  // Grand Prix : niveaux de salaire 1 à 4 (un ensemble)
  setJob(s, ben, job('ecrivain'))
  check('Écrivain : niveau 1 seulement', salaryLevels(s, 1).join() === '1')
  placeCard(s, ben.distinctions, find((c) => c.key === 'grandprix'))
  check('Écrivain + Grand Prix : niveaux 1 à 4', salaryLevels(s, 1).join() === '1,2,3,4')
}

// --- Pilote et Architecte (décisions de Teto, 2026-11-15) ---------------------
{
  const job = (key) => find((c) => c.type === 'job' && c.key === key)
  const travels = findAll((c) => hasTag(c, 'travel'))
  const houses = findAll((c) => hasTag(c, 'house'))
  const arc = find((c) => c.key === 'arcenciel')
  const fresh = () => { const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'], seed: 1 }); setStep(s, 'play'); return s }
  const play = (s, uid) => gameReducer(s, { by: 0, type: 'PLAY_SELF', uid })

  // Arc-en-ciel : Pilote posé, puis 2 voyages gratuits au même tour
  let s = fresh()
  s.players[0].hand = [arc, job('pilote'), travels[0], travels[1]]
  for (const c of findAll((c) => c.type === 'study').slice(0, 5)) placeCard(s, s.players[0].studies, c)
  s = play(s, arc.uid)
  s = play(s, job('pilote').uid)
  s = play(s, travels[0].uid)
  s = play(s, travels[1].uid)
  check('Pilote : Arc-en-ciel → Pilote puis 2 voyages gratuits au même tour',
    jobOf(s.players[0])?.key === 'pilote' && s.players[0].acquisitions.length === 2 && unspentMoney(s, s.players[0]).length === 0)

  // Pilote en poste + Arc-en-ciel : 3 voyages gratuits
  s = fresh()
  setJob(s, s.players[0], job('pilote'))
  s.players[0].hand = [arc, ...travels.slice(0, 3)]
  s = play(s, arc.uid)
  for (const t of travels.slice(0, 3)) s = play(s, t.uid)
  check('Pilote : Arc-en-ciel → 3 voyages gratuits', s.players[0].acquisitions.length === 3)

  // sans Arc-en-ciel : un voyage, et le tour passe
  s = fresh()
  setJob(s, s.players[0], job('pilote'))
  s.players[0].hand = [travels[0], travels[1]]
  s = play(s, travels[0].uid)
  check('Pilote : un voyage gratuit est le jeu du tour', s.players[0].acquisitions.length === 1 && s.current === 1)

  // Architecte : une maison offerte par métier d'Architecte
  s = fresh()
  setJob(s, s.players[0], job('architecte'))
  s.players[0].hand = [houses[0], houses[1]]
  s = play(s, houses[0].uid)
  s = gameReducer(s, { by: 0, type: 'PURCHASE_CONFIRM', useArchitect: true })
  check('Architecte : 1re maison offerte', s.players[0].acquisitions.some((c) => c.uid === houses[0].uid))
  s.current = 0; setStep(s, 'play'); setPlays(s, 1)
  check('Architecte : pas de 2e maison offerte au tour suivant', !architectFree(s, 0, houses[1]) && !canPlace(s, 0, houses[1]).ok)
  loseJob(s, 0, { cause: 'licenciement', by: 1 })
  setJob(s, s.players[0], job('architecte'))
  check('Architecte : un nouveau métier d’Architecte redonne une maison offerte', architectFree(s, 0, houses[1]))
}

// --- Argent, prix et décompte (étape 11 : traits money, price, paymentRule, cardSmiles)
{
  const her = find((c) => c.key === 'heritage')
  const sal = (n, k = 0) => findAll((c) => c.type === 'salary' && c.level === n)[k]
  const job = (key) => find((c) => c.type === 'job' && c.key === key)
  const s = freshState()
  const [ana, ben] = s.players
  check('Traits : un salaire vaut son niveau, imposable, misable, à offrir, avec un métier',
    JSON.stringify(moneyTraits(sal(3))) === JSON.stringify({ value: 3, taxable: true, casino: true, gift: true, payTax: true, needsJob: true }))
  check('Traits : l’Héritage vaut 3, tout ou rien, ni imposable ni misable ni à offrir',
    moneyValue(her) === 3 && moneyTraits(her).allOrNothing && !moneyTraits(her).taxable && !canStake(her) && !moneyTraits(her).gift)
  check('Traits : une carte sans argent ne vaut rien', moneyValue(find((c) => c.type === 'study')) === 0 && !canStake(her))
  check('Traits : pas copiés sur la carte (lus dans la définition)', !('money' in sal(1)))
  // Impôt : vise l'argent imposable, pas l'Héritage
  setJob(s, ben, job('pizzaiolo'))
  placeCard(s, ben.specials, her)
  const impot = find((c) => c.key === 'impot')
  check('Impôt : l’Héritage seul n’est pas imposable', taxableMoney(s, ben).length === 0 && !canTarget(s, 0, impot, 1).ok)
  addMoney(s, ben, sal(1))
  check('Impôt : un salaire non investi est imposable', taxableMoney(s, ben).length === 1 && canTarget(s, 0, impot, 1).ok)
  // Anniversaire : seul l'argent qu'on peut offrir
  check('Anniversaire : l’Héritage ne s’offre pas', giftableMoney(s, ben).map((c) => c.uid).join() === sal(1).uid)
  // achat : salaires et Héritage, règle de paiement de base
  check('Règle de paiement de base : « nécessaire »', paymentRule(s, 1) === 'necessary')
  const pay = checkPayment(s, 1, 4, { salaryUids: [sal(1).uid], useHeritage: true })
  check('Paiement : salaire + Héritage, tout passe sous l’acquisition', pay.ok && pay.total === 4 && pay.cards.length === 2)
  check('Paiement : salaire inconnu ignoré', checkPayment(s, 1, 3, { salaryUids: ['x'], useHeritage: true }).total === 3)
  check('Règle « exacte » : surpayer refusé', !validatePayment(3, [2, 2], 0, 'exact').ok && validatePayment(3, [2, 1], 0, 'exact').ok)
  // prix : maison à moitié prix une fois marié (modificateur des cartes Mariage)
  const villa = find((c) => c.name === 'Villa')
  const simple = find((c) => c.name === 'Maison simple')
  const voyage = find((c) => hasTag(c, 'travel'))
  check('Prix : maison au prix imprimé sans mariage', price(s, 0, villa) === 10)
  setMarriage(s, ana, find((c) => c.type === 'marriage'))
  check('Prix : maison à moitié prix une fois marié (Villa 10 → 5)', price(s, 0, villa) === 5 && price(s, 0, simple) === 3)
  check('Prix : le voyage n’est pas concerné par le mariage', price(s, 0, voyage) === 3)
  check('Prix : le mariage d’Ana ne change pas les prix de Ben', price(s, 1, villa) === 10)
  setJob(s, ana, job('architecte'))
  check('Prix : Architecte marié, maison offerte au choix (sinon moitié prix)',
    price(s, 0, villa, { withOptional: true }) === 0 && price(s, 0, villa) === 5)
  // décompte : smiles par carte, somme par catégorie, bonus
  check('Décompte : cardSmiles = smiles imprimés', cardSmiles(s, 0, villa) === villa.smiles)
  const sc = computeScore(s, 0)
  check('Décompte : catégories d’avant, puis cartes spéciales et malus à la fin',
    Object.keys(sc.cat).join() === 'Études 📚,Métier 💼,Salaires 💰,Flirts 💕,Mariage 💒,Adultère 😏,Enfants 👶,Acquisitions 🏠,Distinctions 🏅,Cartes spéciales 🃏,Malus ⚡')
  check('Décompte : cartes spéciales et malus valent 0 dans le jeu de base',
    sc.cat['Cartes spéciales 🃏'] === 0 && sc.cat['Malus ⚡'] === 0)
  check('Décompte : total = somme des catégories + bonus (0 dans le jeu de base)',
    sc.bonus === 0 && sc.total === Object.values(sc.cat).reduce((a, b) => a + b, 0))
  check('Décompte : par indice ou par joueur, et pour tous', computeScore(s, ana).total === sc.total && computeScores(s).length === 2)
}

// --- F1 : règles de base qui n'avaient aucun test direct ------------------------
{
  const key = (k) => find((c) => c.key === k)
  const lv = (n) => find((c) => c.type === 'salary' && c.level === n)
  const studies = (n) => findAll((c) => c.type === 'study' && c.levels === 1).slice(0, n)
  const children = (n) => findAll((c) => c.type === 'child').slice(0, n)
  const flirts = (n) => findAll((c) => c.type === 'flirt').slice(0, n)
  const pizzaiolo = JOBS_IN_DECK.find((c) => c.key === 'pizzaiolo')
  const uidList = (cards) => cards.map((c) => c.uid).sort().join()
  const inDiscard = (s, card, by) => s.discard.some((e) => e.card.uid === card.uid && (by === undefined || e.by === by))
  // partie à n joueurs, au tour d'Ana (0), étape « jouer »
  const play = (n = 2, setup = () => {}) => {
    const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben', 'Cléo'].slice(0, n), seed: 'f1-regles' })
    setStep(s, 'play')
    setup(s)
    return s
  }
  const malus = (s, card, target, by = 0) => gameReducer(s, { type: 'PLAY_MALUS', uid: card.uid, target, by })
  // finit le tour du joueur courant avec une défausse (piochant d'abord si besoin)
  const endTurnByDiscard = (s) => {
    let r = s
    if (phaseOf(r) === 'draw') r = gameReducer(r, { type: 'DRAW_DECK', by: r.current })
    const d = legalActions(r, r.current).find((a) => a.type === 'DISCARD_CARD')
    return gameReducer(r, d)
  }

  // 1. Accident, Maladie, Burn-out : 1 tour passé, le malus reste chez la cible
  for (const k of ['accident', 'maladie', 'burnout']) {
    const card = key(k)
    const s = play(2, (s) => { setJob(s, s.players[1], pizzaiolo) })
    const direct = structuredClone(s)
    applyMalus(direct, 0, card, 1)
    check(`${card.name} : la cible passera 1 tour`, direct.players[1].skipTurns === 1)
    check(`${card.name} : le malus est posé chez la cible`, malusOf(direct.players[1]).some((c) => c.uid === card.uid))
    s.players[0].hand[0] = card
    const r = malus(s, card, 1)
    check(`${card.name} joué : posé chez la cible, plus en main`,
      malusOf(r.players[1]).some((c) => c.uid === card.uid) && !r.players[0].hand.some((c) => c.uid === card.uid))
  }
  {
    const burn = key('burnout')
    check('Burn-out : refusé sur un joueur sans métier', !canTarget(play(), 0, burn, 1).ok)
    check('Burn-out : permis sur un joueur qui a un métier', canTarget(play(2, (s) => setJob(s, s.players[1], pizzaiolo)), 0, burn, 1).ok)
  }

  // 2. Tours passés : une fois, puis le joueur rejoue normalement
  {
    const s = play(3, (s) => { s.players[1].skipTurns = 1 })
    const r1 = endTurnByDiscard(s)
    check('Tour passé : Ben est sauté, le tour va à Cléo', r1.current === 2 && r1.players[1].skipTurns === 0)
    const r2 = endTurnByDiscard(r1)
    check('Tour passé : Cléo joue, puis le tour revient à Ana', r2.current === 0)
    const r3 = endTurnByDiscard(r2)
    check('Tour passé : Ben rejoue normalement ensuite', r3.current === 1)
    // Accident joué avec 3 joueurs : la cible est passée, le tour va au suivant
    const acc = key('accident')
    const s2 = play(3, (s) => { s.players[0].hand[0] = acc })
    const r = malus(s2, acc, 1)
    check('Accident (3 joueurs) : Ben est passé, c’est à Cléo', r.current === 2 && r.players[1].skipTurns === 0)
  }

  // 3. Prison : seulement sur un Bandit, 3 tours, Bandit et Prison à la défausse
  {
    const prison = key('prison'), bandit = JOBS_IN_DECK.find((c) => c.key === 'bandit')
    const s = play(3, (s) => { setJob(s, s.players[1], bandit); s.players[0].hand[0] = prison })
    check('Prison : permise sur un Bandit', canTarget(s, 0, prison, 1).ok)
    check('Prison : refusée sur un autre métier', !canTarget(play(2, (x) => setJob(x, x.players[1], pizzaiolo)), 0, prison, 1).ok)
    check('Prison : refusée sur un joueur sans métier', !canTarget(play(), 0, prison, 1).ok)
    const direct = structuredClone(s)
    applyMalus(direct, 0, prison, 1)
    check('Prison : la cible passe 3 tours', direct.players[1].skipTurns === 3)
    const r = malus(s, prison, 1)
    check('Prison : le Bandit est défaussé', jobOf(r.players[1]) === null && inDiscard(r, bandit, 1))
    check('Prison : la carte Prison va à la défausse, pas chez la cible',
      inDiscard(r, prison) && !malusOf(r.players[1]).some((c) => c.uid === prison.uid))
  }

  // 4. Impôt : dernier salaire non investi, défaussé au nom de la cible
  {
    const imp = key('impot'), [a, b, c] = [lv(1), lv(2), lv(3)]
    const s = play(2, (s) => {
      setJob(s, s.players[1], pizzaiolo)
      setMoney(s, s.players[1], [a, b])
      addMoney(s, s.players[1], c, { used: true }) // posé en dernier, mais déjà dépensé
      s.players[0].hand[0] = imp
    })
    const r = malus(s, imp, 1)
    check('Impôt : le dernier salaire non investi est défaussé au nom de la cible', inDiscard(r, b, 1))
    check('Impôt : les autres salaires (dont le dépensé) restent', uidList(moneyOf(r.players[1])) === uidList([a, c]))
    check('Impôt : la carte Impôt est posée chez la cible', malusOf(r.players[1]).some((x) => x.uid === imp.uid))
    const sans = play(2, (s) => { setJob(s, s.players[1], pizzaiolo); addMoney(s, s.players[1], a, { used: true }); s.players[0].hand[0] = imp })
    check('Impôt : refusé sans salaire non investi', !canTarget(sans, 0, imp, 1).ok && malus(sans, imp, 1) === sans)
  }

  // 5. Redoublement : la dernière étude est défaussée
  {
    const red = key('redoublement'), [e1, e2] = studies(2)
    const s = play(2, (s) => { s.players[1].studies = [e1, e2]; s.players[0].hand[0] = red })
    const r = malus(s, red, 1)
    check('Redoublement : la dernière étude posée est défaussée', inDiscard(r, e2, 1) && r.players[1].studies.map((c) => c.uid).join() === e1.uid)
    check('Redoublement : refusé sur un joueur qui a un métier',
      !canTarget(play(2, (x) => { x.players[1].studies = [e1]; setJob(x, x.players[1], pizzaiolo) }), 0, red, 1).ok)
    check('Redoublement : refusé sans carte études', !canTarget(play(), 0, red, 1).ok)
  }

  // 6, 7. Divorce (malus)
  {
    const div = key('divorce'), mar = find((c) => c.type === 'marriage'), adu = find((c) => c.type === 'adultery')
    const kids = children(2), fl = flirts(2)
    const s6 = play(2, (s) => {
      setMarriage(s, s.players[1], mar); s.players[1].children = [...kids]; s.players[1].flirts = [...fl]
      s.players[0].hand[0] = div
    })
    const r6 = malus(s6, div, 1)
    check('Divorce : le mariage est défaussé', !isMarried(r6.players[1]) && inDiscard(r6, mar, 1))
    check('Divorce sans adultère : enfants et flirts restent',
      uidList(r6.players[1].children) === uidList(kids) && uidList(r6.players[1].flirts) === uidList(fl))
    check('Divorce : refusé sur un joueur non marié', !canTarget(play(), 0, div, 1).ok)
    const s7 = play(2, (s) => {
      setMarriage(s, s.players[1], mar); setAdultery(s, s.players[1], adu)
      s.players[1].children = [...kids]; s.players[1].flirts = [...fl]
      s.players[0].hand[0] = div
    })
    const r7 = malus(s7, div, 1)
    check('Divorce en plein adultère : mariage et Adultère défaussés', !isMarried(r7.players[1]) && adulteryOf(r7.players[1]) == null && inDiscard(r7, mar) && inDiscard(r7, adu))
    check('Divorce en plein adultère : tous les enfants sont défaussés', r7.players[1].children.length === 0 && kids.every((k) => inDiscard(r7, k)))
    check('Divorce en plein adultère : les flirts restent', uidList(r7.players[1].flirts) === uidList(fl))
  }

  // 8. Divorce volontaire : à la place de piocher
  {
    const mar = find((c) => c.type === 'marriage'), adu = find((c) => c.type === 'adultery')
    const kids = children(2), fl = flirts(2)
    const setup = (withAdultery) => (s) => {
      setMarriage(s, s.players[0], mar)
      if (withAdultery) setAdultery(s, s.players[0], adu)
      s.players[0].children = [...kids]; s.players[0].flirts = [...fl]
    }
    const sDraw = play(3, setup(false)); setStep(sDraw, 'draw')
    check('Divorce volontaire : proposé à la place de la pioche', legalActions(sDraw, 0).some((a) => a.type === 'DIVORCE_VOLUNTARY'))
    const sPlay = play(3, setup(false))
    check('Divorce volontaire : refusé après la pioche', gameReducer(sPlay, { type: 'DIVORCE_VOLUNTARY', by: 0 }) === sPlay)
    const r = gameReducer(sDraw, { type: 'DIVORCE_VOLUNTARY', by: 0 })
    check('Divorce volontaire : mariage défaussé, enfants et flirts gardés',
      !isMarried(r.players[0]) && inDiscard(r, mar, 0) && uidList(r.players[0].children) === uidList(kids) && uidList(r.players[0].flirts) === uidList(fl))
    check('Divorce volontaire : le tour passe au joueur suivant', r.current === 1)
    const sAdu = play(3, setup(true)); setStep(sAdu, 'draw')
    const ra = gameReducer(sAdu, { type: 'DIVORCE_VOLUNTARY', by: 0 })
    check('Divorce volontaire pendant un adultère : l’Adultère est défaussé aussi, enfants et flirts gardés',
      adulteryOf(ra.players[0]) == null && inDiscard(ra, adu, 0) && ra.players[0].children.length === 2 && ra.players[0].flirts.length === 2)
  }

  // 9. Attentat (règle vérifiée : les enfants de TOUS les joueurs sont retirés du jeu)
  {
    const att = key('attentat'), legion = key('legion')
    const ka = children(1), kt = findAll((c) => c.type === 'child').slice(1, 3)
    const s = play(3, (s) => { s.players[0].children = [...ka]; s.players[1].children = [...kt]; s.players[0].hand[0] = att })
    const r = malus(s, att, 1)
    check('Attentat : les enfants de l’auteur et de la cible sont retirés du jeu',
      r.players[0].children.length === 0 && r.players[1].children.length === 0 &&
      outOfGameCards(r).length >= 4 && [...ka, ...kt].every((k) => r.outOfGame.some((e) => e.card.uid === k.uid)))
    check('Attentat : cause et auteur notés sur chaque carte retirée',
      r.outOfGame.every((e) => e.cause === 'attentat' && e.by === 0))
    check('Attentat : la carte elle-même sort du jeu', r.outOfGame.some((e) => e.card.uid === att.uid) && !inDiscard(r, att))
    check('Attentat : l’auteur ne peut plus poser la Légion d’honneur', !canPlace(r, 0, legion).ok)
    check('Légion d’honneur : permise à qui n’a pas commis d’attentat', canPlace(play(), 0, legion).ok)
  }
  {
    // à 3 joueurs : les enfants du troisième joueur (ni auteur ni cible) partent aussi
    const att = key('attentat')
    const [k0, k1, k2] = [0, 1, 2].map((i) => findAll((c) => c.type === 'child').slice(2 * i, 2 * i + 2))
    const s = play(3, (s) => {
      s.players[0].children = [...k0]; s.players[1].children = [...k1]; s.players[2].children = [...k2]
      s.players[0].hand[0] = att
    })
    const r = malus(s, att, 1)
    check('Attentat : les enfants de TOUS les joueurs sont retirés du jeu (le troisième joueur compris)',
      r.players.every((p) => p.children.length === 0) &&
      [...k0, ...k1, ...k2].every((k) => r.outOfGame.some((e) => e.card.uid === k.uid && e.cause === 'attentat' && e.by === 0)))
  }

  // 10. Policier (posé, ou obtenu par Piston) : Bandits et Gourous des AUTRES défaussés
  {
    const pol = key('policier'), piston = key('piston')
    const bandit = JOBS_IN_DECK.find((c) => c.key === 'bandit'), gourou = JOBS_IN_DECK.find((c) => c.key === 'gourou')
    const setup = (s) => { setJob(s, s.players[1], bandit); setJob(s, s.players[2], gourou) }
    const s1 = play(3, (s) => { setup(s); s.players[0].studies = studies(1); s.players[0].hand[0] = pol })
    const r1 = gameReducer(s1, { type: 'PLAY_SELF', uid: pol.uid, by: 0 })
    check('Policier posé : le Bandit et le Gourou des autres sont défaussés',
      jobOf(r1.players[0])?.uid === pol.uid && !jobOf(r1.players[1]) && !jobOf(r1.players[2]) && inDiscard(r1, bandit, 1) && inDiscard(r1, gourou, 2))
    const s2 = play(3, (s) => { setup(s); s.players[0].hand = [piston, pol] })
    let r2 = gameReducer(s2, { type: 'PLAY_SELF', uid: piston.uid, by: 0 })
    r2 = gameReducer(r2, { type: 'PISTON_PICK', uid: pol.uid, by: 0 })
    check('Policier obtenu par Piston : même purge',
      jobOf(r2.players[0])?.uid === pol.uid && !jobOf(r2.players[1]) && !jobOf(r2.players[2]) && inDiscard(r2, bandit, 1) && inDiscard(r2, gourou, 2))
    check('Policier en poste : ni Bandit ni Gourou ne se posent', !canPlace(r1, 1, bandit).ok)
  }

  // 11. Astronaute
  {
    const astro = key('astronaute'), sal = lv(2)
    const setup = (discard) => play(2, (s) => {
      s.players[0].studies = studies(6); s.players[0].hand[0] = astro
      s.discard = discard
    })
    const s = setup([{ card: sal, by: 1 }])
    const r = gameReducer(s, { type: 'PLAY_SELF', uid: astro.uid, by: 0 })
    check('Astronaute : le choix dans la défausse s’ouvre', choiceOf(r)?.type === 'discard-pick' && jobOf(r.players[0])?.uid === astro.uid)
    const p = gameReducer(r, { type: 'DISCARD_PICK', uid: sal.uid, by: 0 })
    check('Astronaute : la carte choisie devient la carte à jouer d’abord, hors jeu du tour',
      forcedOf(p)?.uid === sal.uid && p.current === 0 && !inDiscard(p, sal) && playsLeft(p) === 0)
    const played = gameReducer(p, { type: 'PLAY_SELF', uid: sal.uid, by: 0 })
    check('Astronaute : la carte jouée rejoint le plateau, puis le tour finit',
      moneyOf(played.players[0]).some((c) => c.uid === sal.uid) && played.current === 1)
    check('Astronaute : la carte forcée peut être défaussée', legalActions(p, 0).some((a) => a.type === 'DISCARD_CARD' && a.uid === sal.uid))
    const thrown = gameReducer(p, { type: 'DISCARD_CARD', uid: sal.uid, by: 0 })
    check('Astronaute : carte défaussée, le tour finit', inDiscard(thrown, sal) && thrown.current === 1)
    const none = gameReducer(setup([]), { type: 'PLAY_SELF', uid: astro.uid, by: 0 })
    check('Astronaute sans carte jouable : avantage perdu, le tour se termine',
      !choiceOf(none) && !forcedOf(none) && none.current === 1 && jobOf(none.players[0])?.uid === astro.uid)
  }

  // 12. Grand Prof
  {
    const gp = key('grand_prof'), prof = JOBS_IN_DECK.find((c) => c.key === 'prof_maths'), sal = lv(2)
    check('Grand Prof : refusé sans métier', !canPlace(play(), 0, gp).ok)
    check('Grand Prof : refusé sur un métier qui n’est pas Prof', !canPlace(play(2, (s) => setJob(s, s.players[0], pizzaiolo)), 0, gp).ok)
    const s = play(2, (s) => { setJob(s, s.players[0], prof); setMoney(s, s.players[0], [sal]); s.players[0].hand[0] = gp })
    check('Grand Prof : permis sur un Prof', canPlace(s, 0, gp).ok)
    const r = gameReducer(s, { type: 'PLAY_SELF', uid: gp.uid, by: 0 })
    check('Grand Prof : il prend la place du Prof, qui est défaussé', jobOf(r.players[0])?.uid === gp.uid && inDiscard(r, prof, 0))
    check('Grand Prof : les salaires posés restent', uidList(moneyOf(r.players[0])) === sal.uid)
  }

  // 13. Casino
  {
    const casino = key('casino')
    const [a, b, c] = [lv(2), lv(2) && findAll((x) => x.type === 'salary' && x.level === 2)[1], lv(3)]
    // ouverture : pas de salaire en main → rien à miser, le tour finit
    const s0 = play(2, (s) => { s.players[0].hand = [casino, ...studies(4)] })
    const o = gameReducer(s0, { type: 'PLAY_SELF', uid: casino.uid, by: 0 })
    check('Casino : ouvert, aucune mise en attente', o.casino?.owner === 0 && o.casino.stake === null)
    // ouverture avec un salaire en main : on peut miser tout de suite
    const s1 = play(2, (s) => { s.players[0].hand = [casino, a, ...studies(3)] })
    const o1 = gameReducer(s1, { type: 'PLAY_SELF', uid: casino.uid, by: 0 })
    check('Casino : avec un salaire en main, la mise immédiate est proposée', choiceOf(o1)?.type === 'casino-stake')
    const m1 = gameReducer(o1, { type: 'CASINO_STAKE', uid: a.uid, by: 0 })
    check('Casino : la mise immédiate est enregistrée', m1.casino.stake?.card.uid === a.uid && m1.casino.stake.by === 0)
    // deuxième mise, même niveau ou niveau différent
    const duel = (second) => play(2, (s) => {
      s.casino = { owner: 0, stake: { card: a, by: 0 } }
      s.current = 1; setStep(s, 'play'); s.players[1].hand[0] = second
    })
    const same = gameReducer(duel(b), { type: 'CASINO_BET', uid: b.uid, by: 1 })
    check('Casino, même niveau : le 2e joueur gagne les deux salaires, non dépensés',
      uidList(moneyOf(same.players[1])) === uidList([a, b]) && unspentMoney(same, same.players[1]).length === 2 && moneyOf(same.players[0]).length === 0)
    check('Casino : la mise est réglée', same.casino.stake === null)
    const diff = gameReducer(duel(c), { type: 'CASINO_BET', uid: c.uid, by: 1 })
    check('Casino, niveaux différents : le 1er joueur gagne les deux salaires, non dépensés',
      uidList(moneyOf(diff.players[0])) === uidList([a, c]) && unspentMoney(diff, diff.players[0]).length === 2 && moneyOf(diff.players[1]).length === 0)
    // pas de mise contre soi-même
    const self = play(2, (s) => { s.casino = { owner: 0, stake: { card: a, by: 0 } }; s.players[0].hand[0] = b })
    check('Casino : on ne mise pas contre soi-même',
      gameReducer(self, { type: 'CASINO_BET', uid: b.uid, by: 0 }) === self && !legalActions(self, 0).some((x) => x.type === 'CASINO_BET'))
  }

  // 14. Tsunami
  {
    const s = play(3, (s) => {
      const t = s.deck.splice(s.deck.findIndex((c) => c.key === 'tsunami'), 1)[0]
      s.players[0].hand.push(s.deck.pop())
      s.players[0].hand[0] = t // 6 cartes avec le Tsunami
      // mains inégales : 6 / 3 / 7 (15 cartes à redistribuer sans le Tsunami)
      s.players[2].hand.push(...s.players[1].hand.splice(0, 2))
    })
    const t = s.players[0].hand[0]
    const before = s.players.flatMap((p) => p.hand).filter((c) => c.uid !== t.uid)
    const deckBefore = s.deck.length
    const r = gameReducer(s, { type: 'PLAY_SELF', uid: t.uid, by: 0 })
    const after = r.players.flatMap((p) => p.hand)
    check('Tsunami : aucune carte perdue ni en double', after.length === before.length && uidList(after) === uidList(before) && new Set(after.map((c) => c.uid)).size === after.length)
    check('Tsunami : sans Chercheur, chacun a 5 cartes', r.players.every((p) => p.hand.length === 5))
    check('Tsunami : la pioche n’est pas touchée', r.deck.length === deckBefore)
  }

  // 15. Fin de partie : pioche vide à la fin d'un tour
  {
    const sal = lv(2)
    const s = play(2, (s) => {
      s.deck = []
      s.casino = { owner: 0, stake: { card: sal, by: 1 } }
    })
    const handBefore = [...s.players[0].hand]
    const d = legalActions(s, 0).find((a) => a.type === 'DISCARD_CARD')
    const r = gameReducer(s, d)
    check('Fin de partie : pioche vide en fin de tour → partie finie', r.status === 'over')
    check('Fin de partie : toutes les mains sont défaussées', r.players.every((p) => p.hand.length === 0) &&
      handBefore.every((c) => inDiscard(r, c)))
    check('Fin de partie : plus aucun flux en attente', r.stack.length === 0)
    check('Fin de partie : la mise du Casino non relevée revient à son joueur, non dépensée',
      r.casino.stake === null && moneyOf(r.players[1]).some((c) => c.uid === sal.uid) && unspentMoney(r, r.players[1]).length === 1)
    check('Fin de partie : cette mise compte dans le score', computeScore(r, 1).cat['Salaires 💰'] >= sal.smiles)
    // pioche non vide : la partie continue
    const s2 = play(2)
    check('Pioche non vide : la partie continue', endTurnByDiscard(s2).status === 'playing')
  }

  // 16. Pioche presque vide : Chance
  {
    const chance = key('chance')
    const setup = (n) => play(2, (s) => { s.deck = s.deck.slice(0, n); s.players[0].hand[0] = chance })
    const s2 = setup(2)
    const r = gameReducer(s2, { type: 'PLAY_SELF', uid: chance.uid, by: 0 })
    check('Chance avec 2 cartes dans la pioche : 2 cartes proposées', choiceOf(r)?.type === 'chance' && choiceOf(r).cards.length === 2)
    const s0 = setup(0)
    check('Chance refusée avec une pioche vide', !canPlace(s0, 0, chance).ok && gameReducer(s0, { type: 'PLAY_SELF', uid: chance.uid, by: 0 }) === s0)
  }
}

console.log(`\n✅ ${passed} vérifications OK`)
