// ---------------------------------------------------------------------------
// Smile Life — reducer principal
// Vérifie l'auteur de l'action, copie l'état, puis laisse le cadre du dessus
// de la pile des flux (src/game/flows/) jouer l'action : un choix posé sur le
// tour (achat, Chance, Piston…), sinon le tour lui-même.
// ---------------------------------------------------------------------------
import { buildDeck, shuffle } from '../data/index.js'
import { canAct } from './turn.js'
import { fillDeck } from './primitives.js'
import { seedFrom, randomSeed, rngOf } from './rng.js'
import { flowOf, activeFrame } from './flows/index.js'
import { runSetup } from './flows/setup.js'

// --- helpers ---------------------------------------------------------------

function makePlayer(name, color = null) {
  return {
    name,
    color,              // couleur choisie dans le salon (affichage seulement)
    hand: [],
    studies: [],
    jobs: [],           // métiers (jeu de base : un seul, règle dans rules.js)
    money: [],          // cartes d'argent ; dépensées : state.meta (used, on = acquisition payée)
    flirts: [],         // dernier élément = dessus de la pile
    marriages: [],      // mariages (jeu de base : un seul)
    adultery: [],       // au plus une carte
    children: [],
    acquisitions: [],
    distinctions: [],   // Grand Prix sans effet : state.meta (used)
    specials: [],       // cartes spéciales utilisées (retournées)
    malus: [],          // malus reçus (retournés)
    skipTurns: 0,
    wasBandit: false,
    didAttentat: false,
    architectFreeUsed: false,
  }
}


// Crée une partie. La rivière n'est pas proposée aux joueurs : option interne
// (tests ; réutilisée plus tard par l'extension Fantastique).
// seed : graine du hasard (nombre ou texte) ; tirée au hasard si absente.
// Même graine + mêmes actions → même partie.
export function newGameState(names, colors, { river = false, seed, extensions = [] } = {}) {
  {
    const s0 = seedFrom(seed ?? randomSeed())
    const s = {
      seed: s0,           // graine de la partie (jamais envoyée dans une vue)
      rng: s0,            // état du générateur (src/game/rng.js), jamais dans une vue
      nextLogId: 0,       // dernier id utilisé dans le journal
      status: 'playing',  // 'playing' | 'over' (écrans, passage du téléphone : src/session/)
      extensions: [...extensions], // extensions en jeu (le jeu de base est toujours là)
      players: names.map((n, i) => makePlayer(n, colors?.[i] ?? null)),
      deck: [],
      discard: [],
      outOfGame: [],      // cartes retirées du jeu : [{ card, cause, by }], public
      center: [],         // centre de la table : cartes en vigueur pour tous (réformes, crises…), public
      pot: [],            // cagnotte partagée (Politique), public
      spare: [],          // cartes mises de côté à la mise en place, jamais visibles
      sight: [],          // regards temporaires : [{ viewer, uids, until }] (view.js)
      meta: {},           // état des cartes sur la table, par uid : { seq, used?, on?, protectedBy?, faceDown?, timer? } (state.js)
      seqCounter: 0,      // dernier numéro d'ordre de pose (meta[uid].seq)
      river: [],
      riverEnabled: river,
      riverIdle: 0,
      current: 0,         // joueur du tour
      stack: [],          // pile des flux : [tour, …] (src/game/flows/)
      casino: null,
      log: [],
      turnCount: 1,       // n° du tour (augmente à chaque changement de tour)
    }
    // uid numérotés au hasard (un uid ne révèle pas la carte), puis paquet mélangé
    fillDeck(s, shuffle(buildDeck(s.extensions, rngOf(s)), rngOf(s)))
    // mise en place (flows/setup.js) : mains de départ, rivière, étapes des
    // extensions ; puis le premier tour
    runSetup(s)
    return s
  }
}


export function gameReducer(prev, action) {
  if (action.type === 'START_GAME') return newGameState(action.names, action.colors, { seed: action.seed, extensions: action.extensions })

  // l'auteur de l'action doit être un joueur autorisé à agir maintenant
  if (!prev?.players || prev.status !== 'playing' || !canAct(prev, action.by)) return prev

  // copie complète : aucune zone ne peut être oubliée dans la copie
  const s = structuredClone(prev)
  // le cadre du dessus de la pile joue l'action
  const frame = activeFrame(s)
  const ok = !!frame && flowOf(frame.flow).apply(s, frame, action)
  return ok ? s : prev
}
