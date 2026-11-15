// Tests de resolve() (src/game/queries.js) : une règle de précédence par bloc
// (ARCHITECTURE.md §5.3, INTERACTIONS.md G1–G4), avec de faux modificateurs.
import { resolve, collect, QUERIES } from '../src/game/queries.js'
import { BEHAVIOURS } from '../src/game/cards/index.js'
import { gameReducer } from '../src/game/reducer.js'
import { setJob } from '../src/game/primitives.js'

let passed = 0
function check(label, cond) {
  if (!cond) throw new Error('ÉCHEC : ' + label)
  console.log('✓', label)
  passed++
}

// une fausse contribution : source, seq, effet
const c = (seq, effect, source = 'personal') => ({ source, seq, effect, card: { name: `carte ${seq}` }, owner: 0 })
const OK = { ok: true }
const NO = (reason) => ({ ok: false, reason })
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// --- sans modificateur : la réponse de base -------------------------------------
check('Sans modificateur : oui/non de base', same(resolve('canPlace', NO('base'), []), NO('base')))
check('Sans modificateur : nombre de base', resolve('handSize', 5, []) === 5)
check('Sans modificateur : ensemble de base', same(resolve('salaryLevels', [1, 2], []), [1, 2]))
check('Condition préalable (hard) : aucun effet ne la lève',
  same(resolve('canTarget', { ok: false, reason: 'pré', hard: true }, [c(9, { allow: true })]), NO('pré')))

// --- règle 1 : nombres — « devient » d'abord (le plus récent), puis + / −, puis ×, puis bornes
check('Règle 1 : entre deux « devient », le plus récent l’emporte',
  resolve('handSize', 5, [c(3, { set: 4 }), c(1, { set: 6 })]) === 4)
check('Règle 1 : « devient » puis + : Grand prix 4 et réforme −1 = 3',
  resolve('studyReq', 2, [c(1, { add: -1 }), c(2, { set: 4 })]) === 3)
check('Règle 1 : + avant × : (5 + 1) × 2 = 12',
  resolve('handSize', 5, [c(1, { multiply: 2 }), c(2, { add: 1 })]) === 12)
check('Règle 1 : × qui s’empilent : Phénix ×2 ×2 sur 1,5 = 6',
  resolve('studyLevel', 1.5, [c(1, { multiply: 2 }), c(2, { multiply: 2 })]) === 6)
check('Règle 1 : min / max après ×', resolve('handSize', 5, [c(1, { max: 3 }), c(2, { min: 1 })]) === 3)
check('Règle 1 : bornes imprimées en dernier (un prix jamais sous 0)',
  resolve('price', 3, [c(1, { add: -5 })]) === 0)
check('Règle 1 : niveaux de salaire bornés à 1–4 (le niveau 4 ne monte pas plus haut)',
  same(resolve('salaryLevels', [1, 2, 3, 4], [c(1, { include: [5] })]), [1, 2, 3, 4]))
check('Règle 1 : ensembles — replace (le plus récent), puis include, puis exclude',
  same(resolve('salaryLevels', [1], [c(1, { replace: [1, 2] }), c(2, { replace: [1, 2, 3, 4] }), c(3, { exclude: [2] }), c(4, { include: [2] })]),
    [1, 3, 4]))

// --- règle 2 : oui/non, deux effets personnels qui se contredisent : le plus récent
check('Règle 2 : interdiction plus récente que l’autorisation → refusé',
  same(resolve('canPlace', OK, [c(2, { allow: true }), c(5, { forbid: 'Stérilité' }, 'malus')]), NO('Stérilité')))
check('Règle 2 : autorisation plus récente → permis (Fertilité après Stérilité)',
  same(resolve('canPlace', OK, [c(2, { forbid: 'Stérilité' }, 'malus'), c(5, { allow: true })]), OK))
check('Règle 2 : un effet personnel l’emporte sur la réponse de base',
  same(resolve('canPlace', NO('base'), [c(1, { allow: true })]), OK) &&
  same(resolve('canPlace', OK, [c(1, { forbid: 'non' })]), NO('non')))
check('Règle 2 : la raison est celle de l’interdiction la plus récente',
  same(resolve('canTarget', OK, [c(1, { forbid: 'a' }), c(4, { forbid: 'b' })]), NO('b')))

// --- règle 3 : limite d'une réforme contre un effet personnel « illimité » : le personnel
check('Règle 3 : « illimité » personnel bat la limite d’une réforme plus récente',
  resolve('flirtLimit', 5, [c(1, { set: Infinity }), c(9, { set: 3 }, 'global')]) === Infinity)
check('Règle 3 : sans réforme, une limite personnelle plus récente reste la règle 1',
  resolve('flirtLimit', 5, [c(1, { set: Infinity }), c(9, { set: 3 })]) === 3)

// --- règle 4 : une réforme qui interdit l'emporte, sauf pour un joueur exempté
check('Règle 4 : la réforme qui interdit l’emporte, même posée avant l’autorisation personnelle',
  same(resolve('canPlace', OK, [c(1, { forbid: 'Réforme' }, 'global'), c(8, { allow: true })]), NO('Réforme')))
check('Règle 4 : un ministre ou le président l’ignore (exempt)',
  same(resolve('canPlace', NO('base'), [c(1, { forbid: 'Réforme' }, 'global'), c(8, { allow: true })], { exempt: true }), OK))

// --- règle 5 : une interdiction personnelle tient sous une réforme qui autorise
check('Règle 5 : interdiction personnelle sous une réforme qui autorise → refusé',
  same(resolve('canPlace', NO('base'), [c(9, { allow: true }, 'global'), c(1, { forbid: 'Blacklisté' })]), NO('Blacklisté')))
check('Règle 5 : réforme qui autorise, sans interdiction personnelle → permis',
  same(resolve('canPlace', NO('base'), [c(9, { allow: true }, 'global')]), OK))

// --- effets au choix du joueur (Architecte) -------------------------------------
check('Effet au choix : ignoré par défaut', resolve('price', 6, [c(1, { set: 0, optional: true })]) === 6)
check('Effet au choix : compté avec withOptional', resolve('price', 6, [c(1, { set: 0, optional: true })], { withOptional: true }) === 0)

// --- la liste est fermée ------------------------------------------------------------
let threw = false
try { resolve('inventee', 0, []) } catch { threw = true }
check('Question inconnue : erreur', threw)
const unknown = Object.entries(BEHAVIOURS).flatMap(([id, b]) => (b.modifiers ?? []).filter((m) => !QUERIES[m.query]).map(() => id))
check('Tous les modificateurs du jeu de base portent sur une question de la liste', unknown.length === 0)

// --- collecte : seules les cartes en jeu comptent ---------------------------------
{
  const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'], seed: 3 })
  const all = [...s.deck, ...s.players.flatMap((p) => p.hand)]
  const garagiste = all.find((x) => x.key === 'garagiste')
  const accident = all.find((x) => x.key === 'accident')
  const q = { player: 0, card: accident, target: 1 }
  check('Collecte : rien sans carte en jeu', collect(s, 'canTarget', q).length === 0)
  setJob(s, s.players[1], garagiste)
  const got = collect(s, 'canTarget', q)
  check('Collecte : le Garagiste de Ben compte quand Ben est la cible', got.length === 1 && got[0].source === 'personal' && got[0].owner === 1)
  check('Collecte : pas quand Ana est la cible', collect(s, 'canTarget', { ...q, player: 1, target: 0 }).length === 0)
  s.meta[garagiste.uid].used = true
  check('Collecte : une carte retournée ne compte plus', collect(s, 'canTarget', q).length === 0)
}

console.log(`\n✅ ${passed} vérifications de la précédence (resolve) réussies`)
