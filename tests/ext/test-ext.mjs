// ---------------------------------------------------------------------------
// Extension factice 'test' : elle n'existe que dans les tests (ARCHITECTURE.md
// §12, étape 10 ; roadmap étape 12). Elle prouve les derniers mécanismes du
// moteur avant qu'une vraie carte en dépende :
//   test.global-rule  jouée d'office dès qu'elle est piochée (main de départ,
//                     pioche, main complétée), posée au centre pour 2 tours de
//                     table ; tant qu'elle y est, personne ne pose de flirt.
//                     Elle annonce son arrivée (flux test.notice : celui qui
//                     l'a piochée ferme l'annonce).
//   test.shield       carte spéciale : protège la dernière carte posée de son
//                     propriétaire contre les autres joueurs (meta.protectedBy,
//                     question isProtected).
//   mise en place     3 cartes du dessous de la pioche mises de côté (spare).
//   règle bonus       (sans carte, toujours en vigueur avec l'extension) :
//                     +1 smile en fin de partie par Bouclier posé.
// Un deuxième module, 'probe', n'a ni carte ni étape : ses règles bonus
// répondent aux questions du tour (drawMode, nextPlayer, skipLength,
// canDiscard) selon state.probe, que les tests remplissent eux-mêmes.
// Importer ce fichier l'enregistre ; une partie ne l'utilise que si elle le
// choisit : START_GAME { extensions: ['test'] }.
// ---------------------------------------------------------------------------
import { registerExtension } from '../../src/game/extensions.js'
import { EXTENSIONS } from '../../src/data/index.js'
import { startFlow, endFlow } from '../../src/game/flows/index.js'
import { protect, log, setAsideFromDeck } from '../../src/game/primitives.js'
import { boardCards, metaOf } from '../../src/game/state.js'

const copy = (x) => JSON.parse(JSON.stringify(x))

export const TEST_DEFS = [
  {
    id: 'test.global-rule', ext: 'test', type: 'global', name: 'Règle globale (test)', smiles: 0, count: 4,
    tags: ['autoPlay'], autoPlay: { withChance: false, redraw: true }, rounds: 2,
    desc: 'Jouée dès qu’elle est piochée. Pendant 2 tours de table, personne ne pose de flirt.',
  },
  {
    id: 'test.shield', ext: 'test', type: 'special', name: 'Bouclier (test)', smiles: 0, count: 4, tags: [],
    desc: 'Protège votre dernière carte posée contre les autres joueurs.',
  },
]
export const SPARE_COUNT = 3

// la carte que le Bouclier protège : la plus récemment posée du joueur,
// pas encore protégée (ni le Bouclier lui-même) → la carte, ou null
export function shieldTarget(state, owner, shieldUid = null) {
  const p = state.players[owner]
  let best = null
  for (const c of boardCards(p)) {
    const m = metaOf(state, c.uid)
    if (!m || c.uid === shieldUid || m.protectedBy || c.def === 'test.shield') continue
    if (!best || m.seq > metaOf(state, best.uid).seq) best = c
  }
  return best
}

const BEHAVIOURS = {
  'test.global-rule': {
    modifiers: [{
      query: 'canPlace', scope: 'everyone',
      when: (q) => q.card.type === 'flirt',
      effect: { forbid: 'Règle globale (test) : personne ne pose de flirt' },
    }],
    onAutoPlay(s, { card, drawer }) {
      startFlow(s, 'test.notice', { player: drawer, uid: card.uid })
    },
  },
  'test.shield': {
    canPlay: (state, pIdx) => (shieldTarget(state, pIdx) ? { ok: true } : { ok: false, reason: 'Aucune carte à protéger' }),
    onPlace(s, { card, owner }) {
      const target = shieldTarget(s, owner, card.uid)
      if (target) {
        protect(s, target.uid, card.uid)
        log(s, `🛡️ ${s.players[owner].name} protège ${target.name}`)
      }
      return false
    },
    // la protection ne joue que contre les autres joueurs
    modifiers: [{
      query: 'isProtected', scope: 'owner',
      when: (q, self, s) => metaOf(s, q.card.uid)?.protectedBy === self.card.uid && q.by === self.owner,
      effect: { forbid: 'On peut toujours retirer soi-même sa carte' },
    }],
  },
}

// annonce d'une carte jouée d'office : celui qui l'a piochée ferme l'annonce
const notice = {
  start: (s, { player, uid }) => ({ flow: 'test.notice', step: 'look', data: { player, uid } }),
  actors: (s, frame) => [frame.data.player],
  legal: () => [{ type: 'CLOSE_INFO' }],
  apply(s, frame, action) {
    if (action.type !== 'CLOSE_INFO') return false
    endFlow(s)
    return true
  },
  resume() {},
  fallback: () => ({ type: 'CLOSE_INFO' }),
  // public : la carte est au centre, face visible
  view: (s, frame) => copy(frame),
}

if (!EXTENSIONS.includes('test')) {
  registerExtension({
    id: 'test',
    defs: TEST_DEFS,
    behaviours: BEHAVIOURS,
    flows: { 'test.notice': notice },
    bonus: [{
      id: 'test.bonus-shield',
      modifiers: [{
        query: 'scoreBonus', scope: 'everyone',
        effect: (q, self, s) => {
          const n = s.players[q.player].specials.filter((c) => c.def === 'test.shield').length
          return n ? { add: n } : null
        },
      }],
    }],
    setup: [{
      id: 'test.spare',
      run(s) {
        setAsideFromDeck(s, SPARE_COUNT)
        log(s, `🗃️ ${SPARE_COUNT} cartes sont mises de côté`)
      },
    }],
  })
}

// --- 'probe' : réponses choisies par le test (state.probe[question]) -----------
const PROBED = ['drawMode', 'nextPlayer', 'skipLength', 'canDiscard', 'handSize']
if (!EXTENSIONS.includes('probe')) {
  registerExtension({
    id: 'probe',
    bonus: [{
      id: 'probe.answers',
      modifiers: PROBED.map((query) => ({
        query, scope: 'everyone',
        effect: (q, self, s) => {
          const a = s.probe?.[query]
          return typeof a === 'function' ? a(q) : a ?? null
        },
      })),
      on: { roundEnd(s) { if (s.probe) s.probe.rounds = (s.probe.rounds ?? 0) + 1 } },
    }],
  })
}
