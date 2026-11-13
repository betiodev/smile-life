// Définitions des cartes (src/data/) : totaux, id, tags, genre des enfants,
// uid opaques, extensions en jeu
import { BASE_DEFS } from '../src/data/base.js'
import { CATALOGUE, EXTENSIONS, buildDeck, defsFor, hasTag } from '../src/data/index.js'
import { gameReducer } from '../src/game/reducer.js'
import { viewFor } from '../src/game/view.js'
import { makeRng } from '../src/game/rng.js'

let passed = 0
function check(label, cond) {
  if (!cond) throw new Error('ÉCHEC : ' + label)
  console.log('✓', label)
  passed++
}
const sameSet = (a, b) => [...a].sort().join() === [...b].sort().join()

// --- totaux --------------------------------------------------------------------
{
  const deck = buildDeck()
  check('200 cartes dans le jeu de base', deck.length === 200)
  const byType = {}
  for (const c of deck) byType[c.type] = (byType[c.type] || 0) + 1
  const expected = {
    study: 25, job: 30, salary: 40, flirt: 20, marriage: 7, adultery: 3,
    child: 10, malus: 37, special: 10, acquisition: 15, distinction: 3,
  }
  check('Nombre de cartes par type', JSON.stringify(Object.keys(expected).map((t) => byType[t])) ===
    JSON.stringify(Object.values(expected)) && Object.keys(byType).length === Object.keys(expected).length)
  check('98 sortes de cartes', BASE_DEFS.length === 98)
  check('Somme des exemplaires = 200', BASE_DEFS.reduce((n, d) => n + d.count, 0) === 200)
  const sub = (t) => deck.filter((c) => c.acqType === t).length
  check('Acquisitions : 5 animaux, 5 voyages, 5 maisons', sub('animal') === 5 && sub('travel') === 5 && sub('house') === 5)
  const malus = (k) => deck.filter((c) => c.key === k).length
  check('Malus : 5 de chaque, 1 Prison, 1 Attentat',
    ['accident', 'maladie', 'burnout', 'licenciement', 'impot', 'divorce', 'redoublement'].every((k) => malus(k) === 5) &&
    malus('prison') === 1 && malus('attentat') === 1)
}

// --- définitions -----------------------------------------------------------------
{
  const ids = BASE_DEFS.map((d) => d.id)
  check('id uniques', new Set(ids).size === ids.length)
  check('id de la forme base.<slug>', ids.every((id) => /^base\.[a-z0-9_]+$/.test(id)))
  check('ext = base, tags = liste', BASE_DEFS.every((d) => d.ext === 'base' && Array.isArray(d.tags)))
  check('Catalogue : chaque définition par son id', BASE_DEFS.every((d) => CATALOGUE[d.id] === d))
  check('Définitions = données pures (aucune fonction)', JSON.stringify(JSON.parse(JSON.stringify(BASE_DEFS))) === JSON.stringify(BASE_DEFS))
  check('Aucune extension disponible pour l’instant', EXTENSIONS.length === 0 && defsFor([]).length === 98)
  let threw = false
  try { buildDeck(['gp']) } catch { threw = true }
  check('Extension inconnue refusée', threw)
}

// --- instances ---------------------------------------------------------------------
{
  const deck = buildDeck()
  check('Chaque carte connaît sa définition (def)', deck.every((c) => CATALOGUE[c.def]))
  check('Une carte porte les champs de sa définition', deck.every((c) => {
    const { id, count, ...fields } = CATALOGUE[c.def]
    return Object.entries(fields).every(([k, v]) => JSON.stringify(c[k]) === JSON.stringify(v))
  }))
  check('Les tags d’une carte ne sont pas ceux de la définition (copie)', deck[0].tags !== CATALOGUE[deck[0].def].tags)
}

// --- tags ----------------------------------------------------------------------------
{
  const jobs = BASE_DEFS.filter((d) => d.type === 'job')
  const tagged = (t) => BASE_DEFS.filter((d) => hasTag(d, t)).map((d) => d.key ?? d.id)
  check('outlaw : Bandit et Gourou', sameSet(tagged('outlaw'), ['bandit', 'gourou']))
  check('prof : les 4 profs (pas le Grand Prof)', sameSet(tagged('prof'), ['prof_maths', 'prof_francais', 'prof_anglais', 'prof_histoire']))
  check('trophy : Écrivain, Journaliste, Chercheur', sameSet(tagged('trophy'), ['ecrivain', 'journaliste', 'chercheur']))
  check('fonctionnaire : Militaire, Policier, profs, Grand Prof', sameSet(tagged('fonctionnaire'),
    ['militaire', 'policier', 'prof_maths', 'prof_francais', 'prof_anglais', 'prof_histoire', 'grand_prof']))
  check('interim : les 5 intérimaires', sameSet(tagged('interim'), ['serveur', 'barmaid', 'jardinier', 'plombier', 'stripteaser']))
  check('Tag de statut = statut imprimé', jobs.every((j) =>
    hasTag(j, 'fonctionnaire') === (j.status === 'fonctionnaire') && hasTag(j, 'interim') === (j.status === 'interim')))
  for (const t of ['animal', 'travel', 'house'])
    check(`${t} : les 5 acquisitions de ce type`, BASE_DEFS.filter((d) => d.acqType === t).every((d) => hasTag(d, t)) &&
      buildDeck().filter((c) => hasTag(c, t)).length === 5)
}

// --- genre des enfants (Girl Power, décision 11) --------------------------------------
{
  const children = BASE_DEFS.filter((d) => d.type === 'child')
  const of = (g) => children.filter((c) => c.gender === g).map((c) => c.name)
  check('Garçons : Mario, Luigi, Rocky, Luke, Harry', sameSet(of('garcon'), ['Mario', 'Luigi', 'Rocky', 'Luke', 'Harry']))
  check('Filles : Leïa, Lara, Hermione, Diana, Zelda', sameSet(of('fille'), ['Leïa', 'Lara', 'Hermione', 'Diana', 'Zelda']))
}

// --- uid opaques --------------------------------------------------------------------
{
  const all = Array.from({ length: 200 }, (_, i) => `c${i + 1}`)
  const a = buildDeck([], makeRng(1))
  const b = buildDeck([], makeRng(2))
  check('uid : c1…c200, chacun une fois', sameSet(a.map((c) => c.uid), all))
  check('uid tirés au hasard : même uid, autre carte selon la graine', a.some((c, i) => c.uid !== b[i].uid))
  check('Même graine, mêmes uid', JSON.stringify(buildDeck([], makeRng(1))) === JSON.stringify(a))
  // sur 30 parties, l'uid c1 désigne des cartes de plusieurs types
  const types = new Set()
  for (let seed = 0; seed < 30; seed++) {
    const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'], seed })
    const cards = [...s.deck, ...s.players.flatMap((p) => p.hand)]
    types.add(cards.find((c) => c.uid === 'c1').type)
  }
  check('Un uid ne révèle pas le type de carte', types.size > 1)
}

// --- extensions dans la partie --------------------------------------------------------
{
  const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'], seed: 4 })
  check('START_GAME sans extensions : liste vide en mémoire', Array.isArray(s.extensions) && s.extensions.length === 0)
  const s2 = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'], seed: 4, extensions: [] })
  check('extensions: [] = partie de base', JSON.stringify(s2) === JSON.stringify(s))
  check('Les extensions en jeu sont publiques (vue)', Array.isArray(viewFor(s, 1).extensions) && Array.isArray(viewFor(s, null).extensions))
  let threw = false
  try { gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'], extensions: ['inconnue'] }) } catch { threw = true }
  check('START_GAME avec une extension inconnue refusé', threw)
}

console.log(`\n✅ ${passed} vérifications des cartes OK`)
