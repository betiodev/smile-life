// Tests ciblés des 5 corrections signalées
import { gameReducer } from '../src/game/reducer.js'
import {
  canPoseSelf, canTakeDiscardTop, validatePayment, canPlayFromHand, canDiscardFromHand,
  flirtStealVictims, cheapestPayment, birthdayDonors, canPlayMalus, interimReplaced,
  paidSalaries, spentSalaries, availableLiasses, effectiveSalaryLevel,
  unusedHeritage, paidCards, spentCards, canStopAdultery,
} from '../src/game/rules.js'
import { computeScore } from '../src/game/scoring.js'
import { whoMustAct } from '../src/game/turn.js'
import { buildDeck } from '../src/data/cards.js'

const deck = buildDeck()
const find = (pred) => deck.find(pred)
const findAll = (pred) => deck.filter(pred)
const JOBS_IN_DECK = [...new Map(findAll((c) => c.type === 'job').map((c) => [c.key, c])).values()]

function freshState() {
  return gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'], river: false })
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
  check('5 cartes (dont 1 double, niv. 6) → 6e carte autorisée', canPoseSelf(s, 0, singles[10]).ok)
  // 6 cartes → 7e refusée
  p.studies = singles.slice(0, 6)
  check('6 cartes études → 7e refusée', !canPoseSelf(s, 0, singles[10]).ok)
  // Médecin : études continues même au-delà de 6 cartes
  p.job = find((c) => c.key === 'medecin')
  check('Médecin avec 6 cartes → 7e autorisée', canPoseSelf(s, 0, singles[10]).ok)
  p.job = find((c) => c.key === 'chirurgien')
  check('Chirurgien avec 6 cartes → 7e autorisée', canPoseSelf(s, 0, singles[10]).ok)
  // un autre métier bloque toujours les études
  p.job = find((c) => c.key === 'pizzaiolo')
  p.studies = singles.slice(0, 2)
  check('Pizzaïolo → études bloquées', !canPoseSelf(s, 0, singles[10]).ok)
}

// --- 2 : la victime d'un malus ne reprend pas sa carte défaussée ------------
{
  let s = freshState()
  const study = find((c) => c.type === 'study' && c.levels === 1)
  const redoublement = find((c) => c.key === 'redoublement')
  s.players[1].studies = [study]
  s.players[0].hand[0] = redoublement
  s.phase = 'play'
  s = gameReducer(s, { by: s.current, type: 'PLAY_MALUS', uid: redoublement.uid, target: 1 })
  const top = s.discard[s.discard.length - 1]
  check('Redoublement : l’étude défaussée est au nom de la victime', top.card.uid === study.uid && top.by === 1)
  s.screen = 'game'; s.current = 1; s.phase = 'draw'
  check('La victime ne peut pas reprendre son étude de la défausse', !canTakeDiscardTop(s, 1).ok)
  check('Un autre joueur peut la reprendre', canTakeDiscardTop(s, 0).ok)

  // Divorce : le mariage défaussé est au nom de la victime
  let s2 = freshState()
  const marriage = find((c) => c.type === 'marriage')
  const flirt = find((c) => c.type === 'flirt')
  const divorce = find((c) => c.key === 'divorce')
  s2.players[1].marriage = marriage
  s2.players[1].flirts = [flirt]
  s2.players[0].hand[0] = divorce
  s2.phase = 'play'
  s2 = gameReducer(s2, { by: s2.current, type: 'PLAY_MALUS', uid: divorce.uid, target: 1 })
  const top2 = s2.discard[s2.discard.length - 1]
  check('Divorce : le mariage défaussé est au nom de la victime', top2.card.uid === marriage.uid && top2.by === 1)
  s2.current = 1; s2.phase = 'draw'
  check('La victime ne peut pas reprendre son mariage', !canTakeDiscardTop(s2, 1).ok)
}

// --- 3 : Chance → la carte gardée va en main, le tour se joue normalement ---
{
  let s = freshState()
  const chance = find((c) => c.key === 'chance')
  s.players[0].hand[0] = chance
  s.screen = 'game'
  s.phase = 'play'
  const before = s.players[0].hand.length // 5
  s = gameReducer(s, { by: s.current, type: 'PLAY_SELF', uid: chance.uid })
  check('Chance ouvre le choix des 3 cartes', s.pending?.type === 'chance' && s.pending.cards.length === 3)
  const kept = s.pending.cards[1]
  s = gameReducer(s, { by: s.current, type: 'CHANCE_PICK', uid: kept.uid })
  const p = s.players[0]
  check('La carte gardée est en main', p.hand.some((c) => c.uid === kept.uid))
  check('Pas de carte forcée après Chance', !s.forced)
  check('Le joueur doit encore jouer sa carte du tour', s.phase === 'play' && s.playsRemaining === 1 && s.screen === 'game')
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
  check('Sans métier : 6e flirt refusé', !canPoseSelf(s, 0, flirts[6]).ok)
  p.job = barmaid
  check('Barmaid célibataire : 6e flirt autorisé', canPoseSelf(s, 0, flirts[6]).ok)
  p.flirts = flirts.slice(0, 7)
  check('Barmaid : 8e flirt autorisé (illimité)', canPoseSelf(s, 0, flirts[8]).ok)
  p.marriage = find((c) => c.type === 'marriage')
  check('Barmaid mariée : flirt interdit', !canPoseSelf(s, 0, flirts[8]).ok)
  p.marriage = null
  p.job = null // démission/licenciement
  check('Après le métier : flirts conservés (7) mais plus de pose', !canPoseSelf(s, 0, flirts[8]).ok && p.flirts.length === 7)
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
  s.screen = 'game'
  s.phase = 'play'
  s.players[0].salaries = [sal2[0], sal2[1], sal1].map((card) => ({ card, invested: false }))
  s.pending = { type: 'purchase', cardUid: travel.uid, card: travel, fromForced: false }
  const refus = gameReducer(s, { by: s.current, type: 'PURCHASE_CONFIRM', salaryUids: [sal2[0].uid, sal2[1].uid, sal1.uid], useHeritage: false })
  check('Reducer : achat avec salaire superflu refusé', refus === s)
  const okBuy = gameReducer(s, { by: s.current, type: 'PURCHASE_CONFIRM', salaryUids: [sal2[0].uid, sal2[1].uid], useHeritage: false })
  check('Reducer : surpaie inévitable acceptée (4/3)', okBuy !== s && okBuy.players[0].acquisitions.some((c) => c.uid === travel.uid))
  check('Reducer : les 2 salaires choisis sont investis, le 3e non',
    okBuy.players[0].salaries.filter((x) => x.invested).length === 2 &&
    !okBuy.players[0].salaries.find((x) => x.card.uid === sal1.uid).invested)

  // les salaires payés sont rattachés à l'acquisition (posés sous elle)
  const buyer = okBuy.players[0]
  check('Achat : les salaires payés sont liés à l’acquisition',
    paidSalaries(buyer, travel.uid).map((c) => c.uid).sort().join() === [sal2[0].uid, sal2[1].uid].sort().join())
  check('Achat : aucun salaire dépensé orphelin', spentSalaries(buyer).length === 0)
  // acquisition retirée du jeu : ses salaires restent au joueur, retournés
  const score = computeScore(buyer).total
  const sans = { ...buyer, acquisitions: buyer.acquisitions.filter((c) => c.uid !== travel.uid) }
  check('Acquisition perdue : ses salaires deviennent « dépensés »', spentSalaries(sans).length === 2)
  check('Salaires dépensés : smiles conservés', computeScore(sans).total === score - travel.smiles)
  check('Salaires dépensés : inutilisables pour payer', availableLiasses(sans) === 1)
}

// --- Héritage : visible jusqu'à l'achat, puis sous l'acquisition --------------
{
  let s = freshState()
  s.screen = 'game'
  s.phase = 'play'
  const her = find((c) => c.key === 'heritage')
  const travel = find((c) => c.acqType === 'travel')
  s.players[0].hand[0] = her
  s = gameReducer(s, { by: s.current, type: 'PLAY_SELF', uid: her.uid })
  const p0 = s.players[0]
  check('Héritage posé : 3 liasses, carte visible (non utilisée)', p0.heritage === 3 && unusedHeritage(p0).length === 1)
  s.current = 0
  s.phase = 'play'
  s.playsRemaining = 1
  s.pending = { type: 'purchase', cardUid: travel.uid, card: travel, fromForced: false }
  const buy = gameReducer(s, { by: s.current, type: 'PURCHASE_CONFIRM', salaryUids: [], useHeritage: true })
  const b0 = buy.players[0]
  check('Achat avec l’Héritage : il passe sous l’acquisition', b0.heritage === 0 && unusedHeritage(b0).length === 0 &&
    paidCards(b0, travel.uid).some((c) => c.uid === her.uid))
  check('Héritage : reste parmi les cartes spéciales jouées', b0.specials.some((c) => c.uid === her.uid))
  const sans = { ...b0, acquisitions: b0.acquisitions.filter((c) => c.uid !== travel.uid) }
  check('Acquisition perdue : l’Héritage rejoint l’argent dépensé', spentCards(sans).some((c) => c.uid === her.uid))
}

// --- Grand Prix d'excellence : métier perdu → sans effet, smiles conservés ---
{
  const s = freshState()
  s.screen = 'game'
  s.phase = 'play'
  const lic = find((c) => c.key === 'licenciement')
  const gp = find((c) => c.key === 'grandprix')
  const legion = find((c) => c.key === 'legion')
  const ecrivain = JOBS_IN_DECK.find((c) => c.key === 'ecrivain')
  const autre = JOBS_IN_DECK.find((c) => c.trophy && c.key !== 'ecrivain')
  s.players[1].job = ecrivain
  s.players[1].distinctions = [{ card: legion, active: true }, { card: gp, active: true }]
  s.players[0].hand[0] = lic
  check('Grand Prix actif : salaire niveau 4', effectiveSalaryLevel(s.players[1]) === 4)
  const after = gameReducer(s, { by: s.current, type: 'PLAY_MALUS', uid: lic.uid, target: 1 })
  const v = after.players[1]
  check('Licenciement : Grand Prix sans effet, Légion intacte',
    !v.job && !v.distinctions.find((d) => d.card.key === 'grandprix').active && v.distinctions.find((d) => d.card.key === 'legion').active)
  check('Licenciement : le Grand Prix compte toujours ses smiles', computeScore(v).cat['Distinctions 🏅'] === gp.smiles + legion.smiles)
  const nouveau = { ...v, job: autre }
  check('Nouveau métier : le Grand Prix reste sans effet', effectiveSalaryLevel(nouveau) === autre.salaryLevel)
}

// --- Anniversaire : chaque donateur choisit le salaire offert ---------------
// Ana joue l'Anniversaire ; Ben (salaires 1 et 3) et Cléo (2 libre, 4 investi)
// offrent chacun un salaire via BIRTHDAY_GIFT, dans n'importe quel ordre.
{
  const anniv = find((c) => c.key === 'anniversaire')
  const lv = (n) => find((c) => c.type === 'salary' && c.level === n)
  const [b1, b3, c2, c4] = [lv(1), lv(3), lv(2), lv(4)]
  const setup = () => {
    const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben', 'Cléo'], river: false })
    s.screen = 'game'
    s.phase = 'play'
    s.players[0].hand[0] = anniv
    s.players[1].salaries = [b1, b3].map((card) => ({ card, invested: false }))
    s.players[2].salaries = [{ card: c2, invested: false }, { card: c4, invested: true }]
    return s
  }
  const uids = (p) => p.salaries.map((x) => x.card.uid).sort().join()
  const texts = (s, n) => s.log.slice(-n).map((e) => e.text)
  const gift = (s, by, uid) => gameReducer(s, { type: 'BIRTHDAY_GIFT', by, uid })

  const s = setup()
  check('Anniversaire : Ben et Cléo sont donateurs', birthdayDonors(s, 0).join() === '1,2')
  const p = gameReducer(s, { by: 0, type: 'PLAY_SELF', uid: anniv.uid })
  check('Anniversaire : un choix des donateurs est en attente', p.pending?.type === 'birthday' &&
    p.pending.donors.join() === '1,2' && p.players[0].specials.some((c) => c.uid === anniv.uid))
  check('Anniversaire : aucun salaire ne bouge avant la fin des choix', p.players[0].salaries.length === 0 &&
    p.players[1].salaries.length === 2 && p.players[2].salaries.length === 2)
  check('whoMustAct : les deux donateurs pendant l’Anniversaire', whoMustAct(p).join() === '1,2')
  check('Anniversaire : PLAY_SELF n’accepte plus de « gifts »',
    gameReducer(s, { by: 0, type: 'PLAY_SELF', uid: anniv.uid, gifts: { 1: b3.uid, 2: c2.uid } }).pending?.type === 'birthday')

  // refus
  check('Anniversaire : le joueur fêté ne peut pas offrir', gift(p, 0, null) === p)
  check('Anniversaire : le joueur fêté ne peut pas jouer pendant les choix',
    gameReducer(p, { by: 0, type: 'DISCARD_CARD', uid: p.players[0].hand[0].uid }) === p)
  check('Anniversaire : un salaire investi est refusé', gift(p, 2, c4.uid) === p)
  check('Anniversaire : le salaire d’un autre joueur est refusé', gift(p, 1, c2.uid) === p)
  check('Anniversaire : un salaire inconnu est refusé', gift(p, 1, 'pas-un-uid') === p)

  // Ben puis Cléo
  const r1 = gift(p, 1, b3.uid)
  check('Anniversaire : le choix de Ben est noté, rien n’est encore donné', r1.pending?.gifts[1] === b3.uid &&
    r1.players[1].salaries.length === 2 && r1.players[0].salaries.length === 0)
  check('Anniversaire : p.pending reste inchangé (état immuable)', Object.keys(p.pending.gifts).length === 0)
  check('whoMustAct : seule Cléo reste à choisir', whoMustAct(r1).join() === '2')
  check('Anniversaire : Ben ne peut pas offrir deux fois', gift(r1, 1, b1.uid) === r1)
  const r2 = gift(r1, 2, null)
  check('Anniversaire : le salaire choisi par Ben (niveau 3) est offert',
    r2.players[0].salaries.some((x) => x.card.uid === b3.uid) && uids(r2.players[1]) === b1.uid)
  check('Anniversaire : uid null offre le plus petit salaire libre (pas l’investi)',
    r2.players[0].salaries.some((x) => x.card.uid === c2.uid) && uids(r2.players[2]) === c4.uid)
  check('Anniversaire : journal dans l’ordre des joueurs', texts(r2, 2).join('|') ===
    '🎂 Ben offre un salaire niveau 3 à Ana|🎂 Cléo offre un salaire niveau 2 à Ana')
  check('Anniversaire : le tour se termine ensuite normalement', r2.pending === null &&
    r2.current === 1 && r2.screen === 'transition' && whoMustAct(r2).join() === '1')

  // Cléo puis Ben : même résultat
  const q2 = gift(gift(p, 2, null), 1, b3.uid)
  check('Anniversaire : ordre inverse, même résultat',
    q2.players.every((x, i) => uids(x) === uids(r2.players[i])) && q2.current === r2.current &&
    texts(q2, 2).join('|') === texts(r2, 2).join('|'))
  check('Anniversaire : uid null de Ben offre son niveau 1',
    gift(gift(p, 1, null), 2, null).players[0].salaries.some((x) => x.card.uid === b1.uid))

  // Cléo n'a aucun salaire libre : seul Ben donne
  const sc = setup()
  sc.players[2].salaries = [{ card: c4, invested: true }]
  const pc = gameReducer(sc, { by: 0, type: 'PLAY_SELF', uid: anniv.uid })
  check('Anniversaire : sans salaire libre, Cléo n’est pas donatrice', pc.pending.donors.join() === '1' && whoMustAct(pc).join() === '1')
  check('Anniversaire : Cléo ne peut pas offrir', gift(pc, 2, null) === pc)
  const rc = gift(pc, 1, b1.uid)
  check('Anniversaire : Cléo « n’a aucun salaire à offrir »', rc.pending === null &&
    texts(rc, 2).join('|') === '🎂 Ben offre un salaire niveau 1 à Ana|🎂 Cléo n’a aucun salaire à offrir')

  // personne ne peut donner : réglé tout de suite
  const sn = setup()
  sn.players[1].salaries = []
  sn.players[2].salaries = [{ card: c4, invested: true }]
  check('Anniversaire : sans salaire non investi, pas de donateur', birthdayDonors(sn, 0).length === 0)
  const rn = gameReducer(sn, { by: 0, type: 'PLAY_SELF', uid: anniv.uid })
  check('Anniversaire sans donateur : réglé tout de suite', rn.pending === null && rn.current === 1 &&
    rn.log.some((e) => e.text === '🎂 Triste anniversaire pour Ana...'))

  // pendant un Arc-en-ciel : Ana continue de jouer après les cadeaux
  const sa = setup()
  sa.playsRemaining = 3
  const ra = gift(gift(gameReducer(sa, { by: 0, type: 'PLAY_SELF', uid: anniv.uid }), 1, null), 2, null)
  check('Anniversaire pendant un Arc-en-ciel : le tour continue', ra.pending === null && ra.current === 0 &&
    ra.phase === 'play' && ra.playsRemaining === 2 && whoMustAct(ra).join() === '0')
  const next = gameReducer(ra, { by: 0, type: 'DISCARD_CARD', uid: ra.players[0].hand[0].uid })
  check('Anniversaire pendant un Arc-en-ciel : Ana peut rejouer', next !== ra && next.playsRemaining === 1)
}

// --- Aides d'interface : jouabilité, défausse forcée, vol de flirt, paiement --
{
  const s = freshState()
  s.screen = 'game'
  s.phase = 'play'
  const sal = find((c) => c.type === 'salary' && c.level === 1)
  check('Salaire sans métier : injouable, avec la raison du moteur', canPlayFromHand(s, 0, sal).reason === 'Il faut un métier pour poser un salaire')
  const prison = find((c) => c.key === 'prison')
  check('Prison sans Bandit en jeu : injouable', !canPlayFromHand(s, 0, prison).ok)
  s.forced = sal
  s.forcedConsumesPlay = true
  check('Carte prise dans la défausse : défausse interdite', !canDiscardFromHand(s, 0, sal).ok)
  s.forcedConsumesPlay = false
  check('Carte d’Étoile filante : défausse permise', canDiscardFromHand(s, 0, sal).ok)

  const bars = findAll((c) => c.type === 'flirt' && c.place === 'Au bar')
  const zoo = find((c) => c.type === 'flirt' && c.place === 'Au zoo')
  s.players[1].flirts = [bars[0], zoo]
  check('Flirt sous le dessus : pas de vol', flirtStealVictims(s, 0, bars[1]).length === 0)
  s.players[1].flirts = [zoo, bars[0]]
  check('Flirt du dessus, même lieu : vol chez Ben', flirtStealVictims(s, 0, bars[1]).join() === '1')

  const p = s.players[0]
  const lv = (n, k = 0) => findAll((c) => c.type === 'salary' && c.level === n)[k]
  p.salaries = [lv(4), lv(2), lv(1), lv(2, 1)].map((card) => ({ card, invested: false }))
  const pay = cheapestPayment(p, 3)
  check('Paiement le moins cher pour 3 : 2+1', pay.total === 3 && pay.salaryUids.length === 2)
  check('Paiement le moins cher pour 6 : 4+2', cheapestPayment(p, 6).total === 6 && cheapestPayment(p, 6).salaryUids.length === 2)
  check('Paiement impossible → null', cheapestPayment(p, 20) === null)
  p.heritage = 3
  check('Héritage seul quand il suffit pour 3 (aucun salaire investi)', cheapestPayment(p, 3).useHeritage && cheapestPayment(p, 3).salaryUids.length === 0)
}

// --- Intérimaire : Études ou nouveau métier sans démissionner ---------------
{
  const study = find((c) => c.type === 'study' && c.levels === 1)
  const sal = find((c) => c.type === 'salary' && c.level === 1)
  const barmaid = find((c) => c.key === 'barmaid')
  const setup = (card) => {
    const s = freshState()
    s.screen = 'game'
    s.phase = 'play'
    const p = s.players[0]
    p.job = barmaid
    p.salaries = [{ card: sal, invested: false }]
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
  check('Intérimaire → Études : étude posée, métier retiré', p.studies.some((c) => c.uid === study.uid) && p.job === null)
  check('Intérimaire → Études : Barmaid à la défausse, au nom du joueur', s.discard.some((e) => e.card.uid === barmaid.uid && e.by === 0))
  check('Intérimaire → Études : salaire conservé tel quel', p.salaries.length === 1 && p.salaries[0].card.uid === sal.uid && !p.salaries[0].invested)
  check('Intérimaire → Études : le jeu du tour est consommé', s.current === 1)

  // intérimaire → nouveau métier (exigences remplies)
  const pizzaiolo = find((c) => c.key === 'pizzaiolo')
  s = setup(pizzaiolo)
  check('Intérimaire : Pizzaïolo jouable', canPlayFromHand(s, 0, pizzaiolo).ok)
  s = gameReducer(s, { by: s.current, type: 'PLAY_SELF', uid: pizzaiolo.uid })
  p = s.players[0]
  check('Intérimaire → métier : nouveau métier en poste', p.job?.uid === pizzaiolo.uid)
  check('Intérimaire → métier : Barmaid à la défausse', s.discard.some((e) => e.card.uid === barmaid.uid))
  check('Intérimaire → métier : salaire conservé', p.salaries.length === 1 && p.salaries[0].card.uid === sal.uid)
  check('Intérimaire → métier : le jeu du tour est consommé', s.current === 1)

  // intérimaire → métier sans les études requises : toujours bloqué
  const medecin = find((c) => c.key === 'medecin')
  s = setup(medecin)
  const why = canPlayFromHand(s, 0, medecin)
  check('Intérimaire → Médecin sans études : bloqué, avec la raison', !why.ok && why.reason === 'Niveau d’études insuffisant (0/6)')
  check('Reducer : la pose refusée ne change rien', gameReducer(s, { by: s.current, type: 'PLAY_SELF', uid: medecin.uid }) === s)

  // métier normal → Études : toujours bloqué
  s = setup(study)
  s.players[0].job = pizzaiolo
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
    p.job === null && s.pending?.type === 'piston' && s.discard.some((e) => e.card.uid === barmaid.uid && e.by === 0))
  s = gameReducer(s, { by: s.current, type: 'PISTON_PICK', uid: medecin.uid })
  p = s.players[0]
  check('Intérimaire → Piston : Médecin en poste sans les études', p.job?.uid === medecin.uid && p.studies.length === 0)
  check('Intérimaire → Piston : salaire conservé', p.salaries.length === 1 && p.salaries[0].card.uid === sal.uid)
  check('Intérimaire → Piston : le jeu du tour est consommé', s.current === 1)
  s = setup(piston)
  s.players[0].job = pizzaiolo
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
    s.screen = 'game'
    s.phase = 'play'
    s.players[0].hand[0] = lic
    s.players[1].job = job ? find((c) => c.key === job) : null
    return s
  }
  let s = setup('prof_maths')
  check('Licenciement sur un fonctionnaire : bloqué', !canPlayMalus(s, 0, lic, 1).ok)
  check('Licenciement sans cible : injouable, avec la raison', canPlayFromHand(s, 0, lic).reason === 'Aucun joueur ne peut être licencié')
  check('Licenciement sans cible : défausse permise', canDiscardFromHand(s, 0, lic).ok)
  check('Reducer : licenciement d’un fonctionnaire refusé', gameReducer(s, { by: s.current, type: 'PLAY_MALUS', uid: lic.uid, target: 1 }) === s)
  s = setup(null)
  check('Licenciement sur un joueur sans métier : bloqué', canPlayFromHand(s, 0, lic).reason === 'Aucun joueur ne peut être licencié')

  s = setup('pizzaiolo')
  check('Licenciement sur un métier normal : jouable', canPlayMalus(s, 0, lic, 1).ok && canPlayFromHand(s, 0, lic).ok)
  s = gameReducer(s, { by: s.current, type: 'PLAY_MALUS', uid: lic.uid, target: 1 })
  check('Licenciement : le Pizzaïolo est défaussé', s.players[1].job === null && s.discard.some((e) => e.card.key === 'pizzaiolo'))

  s = setup('serveur')
  check('Licenciement sur un intérimaire : jouable', canPlayMalus(s, 0, lic, 1).ok)
  s = gameReducer(s, { by: s.current, type: 'PLAY_MALUS', uid: lic.uid, target: 1 })
  check('Licenciement : le Serveur est défaussé', s.players[1].job === null)
}

// --- Auteur des actions : seul un joueur autorisé peut agir ----------------
{
  let s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben', 'Cléo'], river: false })
  check('whoMustAct : le joueur courant au début du tour', JSON.stringify(whoMustAct(s)) === '[0]')
  check('Transition : un autre joueur ne peut pas dire « Prêt »', gameReducer(s, { type: 'READY', by: 1 }) === s)
  check('Action sans auteur ignorée', gameReducer(s, { type: 'READY' }) === s)
  s = gameReducer(s, { type: 'READY', by: 0 })
  check('Tour normal : pioche d’un autre joueur ignorée', gameReducer(s, { type: 'DRAW_DECK', by: 1 }) === s)
  check('Tour normal : pioche d’un 3e joueur ignorée', gameReducer(s, { type: 'DRAW_DECK', by: 2 }) === s)
  s = gameReducer(s, { type: 'DRAW_DECK', by: 0 })
  check('Tour normal : le joueur courant pioche', s.phase === 'play' && s.players[0].hand.length === 6)
  const uid = s.players[0].hand[0].uid
  check('Tour normal : défausse par un autre joueur ignorée', gameReducer(s, { type: 'DISCARD_CARD', uid, by: 1 }) === s)
}

// --- Troc du Chef : à l'étape opp-pick, c'est l'adversaire qui choisit ------
{
  const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben', 'Cléo'], river: false })
  s.screen = 'game'
  s.phase = 'play'
  s.players[0].job = find((c) => c.key === 'chef_achats')
  const protectedUid = s.players[0].hand[0].uid
  s.pending = { type: 'chef-troc', step: 'opp-pick', target: 1, protectedUid }
  check('whoMustAct : l’adversaire visé en opp-pick', JSON.stringify(whoMustAct(s)) === '[1]')
  check('Chef troc opp-pick : le Chef est refusé', gameReducer(s, { type: 'CHEF_TROC_OPP_PICK', index: 0, by: 0 }) === s)
  check('Chef troc opp-pick : un 3e joueur est refusé', gameReducer(s, { type: 'CHEF_TROC_OPP_PICK', index: 0, by: 2 }) === s)
  const r = gameReducer(s, { type: 'CHEF_TROC_OPP_PICK', index: 0, by: 1 })
  // l'adversaire pioche dans la main du Chef, hors carte protégée
  check('Chef troc opp-pick : l’adversaire est accepté', r !== s && r.pending.step === 'chef-pick' &&
    r.pending.oppPickedUid !== protectedUid && s.players[0].hand.some((c) => c.uid === r.pending.oppPickedUid))
  check('Chef troc chef-pick : de nouveau au tour du Chef', JSON.stringify(whoMustAct(r)) === '[0]' &&
    gameReducer(r, { type: 'CHEF_TROC_CHEF_PICK', index: 0, by: 1 }) === r)
}

// --- Troc du Chef : les pioches face cachée ne dépendent pas de la position ---
{
  const RUNS = 200
  const base = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'], river: false })
  base.screen = 'game'
  base.phase = 'play'
  base.players[0].job = find((c) => c.key === 'chef_achats')
  const chefHand = base.players[0].hand
  const oppHand = base.players[1].hand
  const protectedUid = chefHand[0].uid

  // l'adversaire pioche chez le Chef, en visant toujours la dernière position
  const oppState = { ...base, pending: { type: 'chef-troc', step: 'opp-pick', target: 1, protectedUid } }
  const lastPickable = chefHand.length - 2
  const oppTaken = new Map()
  for (let i = 0; i < RUNS; i++) {
    const r = gameReducer(oppState, { type: 'CHEF_TROC_OPP_PICK', index: lastPickable, by: 1 })
    oppTaken.set(r.pending.oppPickedUid, (oppTaken.get(r.pending.oppPickedUid) ?? 0) + 1)
  }
  check('Chef troc opp-pick : la carte protégée n’est jamais prise', !oppTaken.has(protectedUid))
  check('Chef troc opp-pick : la dernière position n’est pas toujours prise',
    (oppTaken.get(chefHand[chefHand.length - 1].uid) ?? 0) < RUNS)
  check('Chef troc opp-pick : chaque carte non protégée est prise au moins une fois',
    chefHand.slice(1).every((c) => oppTaken.has(c.uid)))

  // le Chef pioche chez l'adversaire ; la dernière carte est connue (ex. prise dans la rivière)
  const oppPickedUid = chefHand[1].uid
  const chefState = { ...base, pending: { type: 'chef-troc', step: 'chef-pick', target: 1, oppPickedUid } }
  const known = oppHand[oppHand.length - 1]
  const chefTaken = new Map()
  for (let i = 0; i < RUNS; i++) {
    const r = gameReducer(chefState, { type: 'CHEF_TROC_CHEF_PICK', index: oppHand.length - 1, by: 0 })
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
    s.screen = 'game'
    s.phase = 'play'
    s.players[1].job = chercheur
    s.players[1].hand.push(s.deck.pop())
    s.players[0].hand[0] = licenciement
    return s
  }

  // Licenciement pendant le tour d'Ana
  const s = setup()
  const r = gameReducer(s, { type: 'PLAY_MALUS', uid: licenciement.uid, target: 1, by: 0 })
  check('Chercheur licencié : le choix s’ouvre pour Ben', r.pending?.type === 'chercheur-discard' && r.pending.player === 1 &&
    r.players[1].job === null && r.players[1].hand.length === 6)
  check('Chercheur licencié : seul Ben peut agir', JSON.stringify(whoMustAct(r)) === '[1]')
  check('Chercheur licencié : le tour d’Ana attend le choix', r.current === 0 && r.screen === 'game')
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
  check('Chercheur licencié : puis le tour d’Ana se termine normalement', d.pending === null && d.current === 1 &&
    d.screen === 'transition' && d.players[0].hand.length === 5)
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
  v.players[0].malusKept = [licenciement]
  v.pending = { type: 'vengeance' }
  v.playsRemaining = 0 // la carte Vengeance a déjà consommé le jeu
  const rv = gameReducer(v, { type: 'VENGEANCE_PICK', uid: licenciement.uid, target: 1, by: 0 })
  check('Chercheur licencié par Vengeance : le choix s’ouvre pour Ben', rv.pending?.type === 'chercheur-discard' && rv.current === 0)
  const dv = gameReducer(rv, { type: 'CHERCHEUR_DISCARD', uid: null, by: 1 })
  check('Chercheur licencié par Vengeance : puis le tour d’Ana se termine', dv.pending === null && dv.current === 1)

  // Démission volontaire pendant son propre tour
  const m = freshState()
  m.screen = 'game'
  m.players[0].job = chercheur
  m.players[0].hand.push(m.deck.pop())
  const rm = gameReducer(m, { type: 'RESIGN', by: 0 })
  check('Chercheur démissionnaire : le choix s’ouvre, le tour n’est pas fini', rm.pending?.type === 'chercheur-discard' &&
    rm.pending.player === 0 && rm.current === 0 && rm.screen === 'game' && rm.players[0].hand.length === 6)
  check('Chercheur démissionnaire : pas de pioche avant le choix', gameReducer(rm, { type: 'DRAW_DECK', by: 0 }) === rm)
  check('Chercheur démissionnaire : un autre joueur est refusé',
    gameReducer(rm, { type: 'CHERCHEUR_DISCARD', uid: null, by: 1 }) === rm)
  const pick = rm.players[0].hand[0]
  const dm = gameReducer(rm, { type: 'CHERCHEUR_DISCARD', uid: pick.uid, by: 0 })
  check('Chercheur démissionnaire : la carte choisie est défaussée, puis il passe son tour',
    dm.discard[dm.discard.length - 1].card.uid === pick.uid && dm.pending === null && dm.current === 1 &&
    dm.screen === 'transition' && dm.players[0].hand.length === 5)

  // main vide : aucun choix
  const e = setup()
  e.players[1].hand = []
  const re = gameReducer(e, { type: 'PLAY_MALUS', uid: licenciement.uid, target: 1, by: 0 })
  check('Chercheur licencié, main vide : aucun choix, le tour se termine', re.pending === null && re.current === 1 &&
    re.discard[re.discard.length - 1].card.uid === chercheur.uid)
}

// --- Arrêter l'adultère : pendant son tour, sans choix en attente ----------
{
  const adultere = find((c) => c.type === 'adultery')
  const flirt = find((c) => c.type === 'flirt')
  const setup = () => {
    let s = freshState()
    s.players[0].adultery = adultere
    s.players[0].flirts = [flirt]
    return s
  }
  let s = setup()
  check('Adultère : refusé sur l’écran de transition', !canStopAdultery(s, 0).ok &&
    gameReducer(s, { type: 'STOP_ADULTERY', by: 0 }) === s)
  s = gameReducer(s, { type: 'READY', by: 0 })
  check('Adultère : un autre joueur ne peut pas l’arrêter', gameReducer(s, { type: 'STOP_ADULTERY', by: 1 }) === s)

  // avant la pioche
  let r = gameReducer(s, { type: 'STOP_ADULTERY', by: 0 })
  check('Adultère : arrêt autorisé avant la pioche', r.players[0].adultery === null &&
    r.players[0].flirts.length === 1 && r.discard.at(-1).card.uid === adultere.uid && r.phase === 'draw')

  // après la pioche, avant de jouer
  s = gameReducer(s, { type: 'DRAW_DECK', by: 0 })
  r = gameReducer(s, { type: 'STOP_ADULTERY', by: 0 })
  check('Adultère : arrêt autorisé après la pioche, sans consommer le jeu', r.players[0].adultery === null &&
    r.phase === 'play' && r.playsRemaining === 1 && r.current === 0)

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
  check('Adultère : autorisé avant l’Arc-en-ciel', avant.players[0].adultery === null)
  check('Adultère : refusé entre les jeux de l’Arc-en-ciel', arcJoue.playsRemaining === 3 &&
    !canStopAdultery(arcJoue, 0).ok && gameReducer(arcJoue, { type: 'STOP_ADULTERY', by: 0 }) === arcJoue)

  // refusé aussi après une Chance (le jeu revient à 1, mais une carte a été jouée)
  const chance = find((c) => c.key === 'chance')
  s.players[0].hand[0] = chance
  let ch = gameReducer(s, { type: 'PLAY_SELF', uid: chance.uid, by: 0 })
  ch = gameReducer(ch, { type: 'CHANCE_PICK', uid: ch.pending.cards[0].uid, by: 0 })
  check('Adultère : refusé après avoir joué Chance', ch.playsRemaining === 1 &&
    gameReducer(ch, { type: 'STOP_ADULTERY', by: 0 }) === ch)

  // au tour suivant, de nouveau autorisé
  const tourSuivant = gameReducer(gameReducer(arcJoue, { type: 'END_PLAYS', by: 0 }), { type: 'READY', by: 1 })
  check('Adultère : le marqueur est remis à zéro au tour suivant', tourSuivant.cardPlayed === false)

  // refusé pendant un choix en attente ou avec une carte forcée
  const pend = { ...s, pending: { type: 'journalist' } }
  check('Adultère : refusé pendant un choix en attente', gameReducer(pend, { type: 'STOP_ADULTERY', by: 0 }) === pend)
  const forced = { ...s, forced: study }
  check('Adultère : refusé avec une carte forcée', gameReducer(forced, { type: 'STOP_ADULTERY', by: 0 }) === forced)
}

console.log(`\n✅ ${passed} vérifications OK`)
