// Primitives et événements (src/game/primitives.js, src/game/events.js) :
// seules les primitives modifient les zones, et elles annoncent ce qui s'est
// passé.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { newGameState } from '../src/game/reducer.js'
import { buildDeck } from '../src/data/index.js'
import { metaOf, isUsed, jobOf } from '../src/game/state.js'
import {
  draw, refill, place, remove, steal, loseJob, take, put, move, setJob, placeCard,
} from '../src/game/primitives.js'
import { emit, EVENTS } from '../src/game/events.js'

let passed = 0
function check(name, cond) {
  if (!cond) throw new Error('ÉCHEC : ' + name)
  console.log('✓ ' + name)
  passed++
}

const deck = buildDeck()
const find = (pred) => deck.find(pred)
const fresh = () => newGameState(['Ana', 'Ben', 'Cléo'], null, { seed: 7 })

// --- aucune zone n'est modifiée hors de primitives.js ------------------------
// (view.js construit des copies pour les vues : il ne touche pas l'état)
{
  const root = fileURLToPath(new URL('../src/game/', import.meta.url))
  const files = []
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(m?js|jsx)$/.test(f)) files.push(p)
    }
  }
  walk(root)
  const ZONES = 'hand|deck|discard|river|outOfGame|studies|jobs|money|flirts|marriages|adultery|children|acquisitions|distinctions|specials|malus|meta'
  const edit = new RegExp(`\\.(${ZONES})(\\.(push|pop|splice|shift|unshift)\\(|\\.length\\s*=(?!=)|\\s*=(?![=>]))`)
  const offenders = []
  for (const f of files) {
    const rel = relative(root, f)
    if (rel === 'primitives.js' || rel === 'view.js') continue
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (edit.test(line.replace(/\/\/.*$/, ''))) offenders.push(`${rel}:${i + 1}`)
    })
  }
  check(`aucune zone modifiée hors de primitives.js (${files.length} fichiers lus)` +
    (offenders.length ? ' — trouvé : ' + offenders.join(', ') : ''), offenders.length === 0)
}

// --- liste des événements -----------------------------------------------------
check('événements : la liste de l’architecture (§6.2)', EVENTS.join() ===
  'gameSetup,turnStart,cardDrawn,cardPlaced,cardLeft,jobLost,malusReceived,handRefilled,turnEnd,roundEnd,gameEnd')
{
  let threw = false
  try { emit(fresh(), 'carteMagique') } catch { threw = true }
  check('événements : un nom inconnu est refusé', threw)
}

// --- pioche ---------------------------------------------------------------------
{
  const s = fresh()
  const n = s.deck.length
  const top = s.deck.at(-1)
  const [c] = draw(s, 1)
  check('draw : la carte du dessus va dans la main', c.uid === top.uid && s.players[1].hand.at(-1).uid === top.uid && s.deck.length === n - 1)
  const aside = draw(s, 0, { count: 3, to: 'aside' })
  check('draw à part : 3 cartes rendues, pas en main', aside.length === 3 && s.players[0].hand.length === 5)
  s.deck = s.deck.slice(-1)
  check('draw : la pioche s’épuise sans erreur', draw(s, 0, { count: 4 }).length === 1 && draw(s, 0).length === 0)
  const t = fresh()
  t.players[2].hand.splice(0, 2)
  refill(t, 2)
  check('refill : la main revient à 5', t.players[2].hand.length === 5)
}

// --- pose et retrait -----------------------------------------------------------
{
  const s = fresh()
  const flirt = find((c) => c.type === 'flirt')
  place(s, 0, flirt)
  check('place : la carte va dans la zone de son type, avec un numéro', s.players[0].flirts[0] === flirt && metaOf(s, flirt.uid)?.seq === s.seqCounter)
  steal(s, flirt.uid, 1, { cause: 'vol' })
  check('steal : la carte change de plateau, nouveau numéro', s.players[0].flirts.length === 0 &&
    s.players[1].flirts[0].uid === flirt.uid && metaOf(s, flirt.uid).seq === s.seqCounter)
  const back = remove(s, flirt.uid, { cause: 'test', by: 0 })
  check('remove : défaussée au nom de son propriétaire, méta effacée', back === flirt &&
    s.discard.at(-1).card === flirt && s.discard.at(-1).by === 1 && !metaOf(s, flirt.uid))
  const child = find((c) => c.type === 'child')
  place(s, 2, child)
  remove(s, child.uid, { cause: 'attentat', by: 0, to: 'outOfGame' })
  const e = s.outOfGame.at(-1)
  check('remove hors jeu : cause et auteur gardés', e.card === child && e.cause === 'attentat' && e.by === 0)
  check('remove : une carte absente des plateaux → null', remove(s, child.uid, { cause: 'test' }) === null)
}

// --- mains, défausse ------------------------------------------------------------
{
  const s = fresh()
  const c = s.players[0].hand[0]
  move(s, c.uid, { hand: 0 }, { hand: 2 })
  check('move : d’une main à l’autre', !s.players[0].hand.includes(c) && s.players[2].hand.at(-1) === c)
  move(s, c.uid, { hand: 2 }, 'discard', { by: 2 })
  check('move : vers la défausse, au nom de by', s.discard.at(-1).card === c && s.discard.at(-1).by === 2)
  const got = take(s, 'discard', c.uid)
  put(s, got, { hand: 1 })
  check('take / put : de la défausse à une main', got === c && s.discard.length === 0 && s.players[1].hand.at(-1) === c)
}

// --- jobLost : le Grand Prix abonné se retourne ----------------------------------
{
  const s = fresh()
  const ecrivain = find((c) => c.key === 'ecrivain')
  const gp = find((c) => c.key === 'grandprix')
  setJob(s, s.players[1], ecrivain)
  placeCard(s, s.players[1].distinctions, gp)
  const other = fresh()
  setJob(other, other.players[0], ecrivain)
  placeCard(other, other.players[1].distinctions, gp)
  loseJob(other, 0, { cause: 'licenciement', by: 2 })
  check('jobLost : le Grand Prix d’un autre joueur ne bouge pas', !isUsed(other, gp))
  loseJob(s, 1, { cause: 'licenciement', by: 0 })
  check('jobLost : le Grand Prix du joueur est retourné', isUsed(s, gp) && !jobOf(s.players[1]))
  check('jobLost : annoncé dans le journal', s.log.at(-1).text.includes('Grand Prix de Ben'))
}

console.log(`\n✅ ${passed} vérifications des primitives réussies`)
