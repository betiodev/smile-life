// ---------------------------------------------------------------------------
// Smile Life — reducer principal
// Vérifie l'auteur de l'action, copie l'état, puis laisse le cadre actif de la
// pile des flux (src/game/flows/) jouer l'action : un flux posé sur le tour
// (achat), sinon le choix encore dans state.pending (étape 09 : portés en
// flux), sinon le tour lui-même.
// ---------------------------------------------------------------------------
import { buildDeck, shuffle } from '../data/index.js'
import { canPlayMalus, isPlayableFromDiscard, hasJob, hasTag, isGrandProf, lowestUnusedSalary } from './rules.js'
import { canAct } from './turn.js'
import { jobOf, unspentMoney, malusOf } from './state.js'
import { log, fillDeck, draw, refill, take, put, move, place, remove } from './primitives.js'
import { emit } from './events.js'
import { seedFrom, randomSeed, rngOf, pick } from './rng.js'
import { flowOf, activeFrame } from './flows/index.js'
import { beginTurn, finishPlay, endTurn, setForced } from './flows/turn.js'
import { applyMalus, policeSweep, triggerJobApi, giveBirthdayGifts } from './effects.js'

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
      meta: {},           // état des cartes posées, par uid : { seq, used?, on? } (state.js)
      seqCounter: 0,      // dernier numéro d'ordre de pose (meta[uid].seq)
      river: [],
      riverEnabled: river,
      riverIdle: 0,
      current: 0,         // joueur du tour
      stack: [],          // pile des flux : [tour, …] (src/game/flows/)
      pending: null,      // choix pas encore porté en flux (étape 09)
      casino: null,
      log: [],
      turnCount: 1,       // n° du tour (augmente à chaque changement de tour)
    }
    // uid numérotés au hasard (un uid ne révèle pas la carte), puis paquet mélangé
    fillDeck(s, shuffle(buildDeck(s.extensions, rngOf(s)), rngOf(s)))
    s.players.forEach((_, i) => draw(s, i, { count: 5 }))
    if (s.riverEnabled) draw(s, null, { count: 3, to: 'river' })
    log(s, `🎉 La partie commence ! ${s.players.map((p) => p.name).join(', ')}`)
    emit(s, 'gameSetup')
    beginTurn(s)
    return s
  }
}


// choix encore dans state.pending (étape 09 : portés en flux)
function applyPending(s, action) {
  const p = s.players[s.current]
  switch (action.type) {
    case 'CHANCE_PICK': {
      if (s.pending?.type !== 'chance') return false
      const cards = s.pending.cards
      const kept = cards.find((c) => c.uid === action.uid)
      if (!kept) return false
      for (const c of cards) if (c.uid !== kept.uid) put(s, c, 'discard', { by: s.current })
      // la carte gardée rejoint la main : le joueur joue ensuite ce qu'il veut
      put(s, kept, { hand: s.current })
      s.pending = null
      log(s, `🍀 ${p.name} garde une carte en main et défausse les deux autres`)
      finishPlay(s)
      return true
    }
    case 'DISCARD_PICK': {
      // Étoile filante / Astronaute : prendre une carte de la défausse et la jouer
      if (s.pending?.type !== 'discard-pick') return false
      const entry = s.discard.find((e) => e.card.uid === action.uid)
      if (!entry || !isPlayableFromDiscard(s, s.current, entry.card)) return false
      const card = take(s, 'discard', action.uid)
      s.pending = null
      setForced(s, card, false)
      log(s, `${p.name} récupère ${card.name} dans la défausse`)
      return true
    }
    case 'PISTON_PICK': {
      if (s.pending?.type !== 'piston') return false
      const card = p.hand.find((c) => c.uid === action.uid)
      if (!card || card.type !== 'job' || isGrandProf(card)) return false
      if (hasTag(card, 'outlaw') && s.players.some((q) => hasJob(q, 'policier'))) return false
      if (jobOf(p)) return false
      take(s, { hand: s.current }, card.uid)
      place(s, s.current, card)
      if (card.key === 'bandit') p.wasBandit = true
      log(s, `🤝 Grâce au Piston, ${p.name} devient ${card.name} sans les études !`)
      s.pending = null
      // "repiochez pour avoir 5 cartes"
      refill(s, s.current)
      // le métier pistonné déclenche aussi son avantage instantané
      triggerJobApi(s, s.current, card)
      // Policier pistonné : purge les Bandits et Gourous
      if (card.key === 'policier') policeSweep(s, s.current)
      finishPlay(s)
      return true
    }
    case 'TROC_PICK': {
      if (s.pending?.type !== 'troc') return false
      const t = s.players[action.target]
      if (!t || action.target === s.current || t.hand.length === 0) return false
      const mine = pick(s, p.hand)
      const theirs = pick(s, t.hand)
      if (mine) move(s, mine.uid, { hand: s.current }, { hand: action.target })
      if (theirs) move(s, theirs.uid, { hand: action.target }, { hand: s.current })
      log(s, `🔄 ${p.name} troque une carte au hasard avec ${t.name}`)
      s.pending = null
      finishPlay(s)
      return true
    }

    // ----- Troc du Chef des achats/ventes (avantage instantané) ------------
    case 'CHEF_TROC_TARGET': {
      if (s.pending?.type !== 'chef-troc' || s.pending.step !== 'target') return false
      const t = s.players[action.target]
      if (!t || action.target === s.current || t.hand.length === 0) return false
      // s'il reste au moins 2 cartes en main, le Chef en protège une
      if (p.hand.length >= 2) {
        s.pending = { type: 'chef-troc', step: 'protect', target: action.target }
      } else {
        s.pending = { type: 'chef-troc', step: 'opp-pick', target: action.target, protectedUid: null }
      }
      return true
    }
    case 'CHEF_TROC_PROTECT': {
      if (s.pending?.type !== 'chef-troc' || s.pending.step !== 'protect') return false
      if (!p.hand.some((c) => c.uid === action.uid)) return false
      log(s, `🛡️ ${p.name} protège 1 carte de son troc`)
      s.pending = { type: 'chef-troc', step: 'opp-pick', target: s.pending.target, protectedUid: action.uid }
      return true
    }
    case 'CHEF_TROC_OPP_PICK': {
      // l'adversaire choisit, face cachée, une carte non protégée du Chef
      if (s.pending?.type !== 'chef-troc' || s.pending.step !== 'opp-pick') return false
      // Pioche face cachée : l'ordre de la main est public (cartes ajoutées à la fin),
      // donc on ignore action.index et on tire au hasard, comme une main mélangée à la table.
      const pickable = p.hand.filter((c) => c.uid !== s.pending.protectedUid)
      if (!(Number.isInteger(action.index) && action.index >= 0 && action.index < pickable.length)) return false
      const picked = pick(s, pickable)
      s.pending = { type: 'chef-troc', step: 'chef-pick', target: s.pending.target, oppPickedUid: picked.uid }
      return true
    }
    case 'CHEF_TROC_CHEF_PICK': {
      // le Chef choisit, face cachée, une carte de l'adversaire — puis échange
      if (s.pending?.type !== 'chef-troc' || s.pending.step !== 'chef-pick') return false
      const t = s.players[s.pending.target]
      // même raison : action.index est ignoré, tirage au hasard dans la main adverse
      if (!(Number.isInteger(action.index) && action.index >= 0 && action.index < t.hand.length)) return false
      const theirs = pick(s, t.hand)
      move(s, s.pending.oppPickedUid, { hand: s.current }, { hand: s.pending.target })
      move(s, theirs.uid, { hand: s.pending.target }, { hand: s.current })
      log(s, `🔄 ${p.name} (${jobOf(p).name}) troque une carte avec ${t.name} en en protégeant une`)
      s.pending = null
      finishPlay(s)
      return true
    }
    case 'VENGEANCE_PICK': {
      if (s.pending?.type !== 'vengeance') return false
      const malus = malusOf(p).find((c) => c.uid === action.uid)
      if (!malus) return false
      if (!canPlayMalus(s, s.current, malus, action.target).ok) return false
      remove(s, malus.uid, { cause: 'vengeance', by: s.current, to: 'aside' })
      log(s, `😈 ${p.name} se venge avec ${malus.name} !`)
      // avant applyMalus : un licenciement de Chercheur ouvre un nouveau choix
      s.pending = null
      applyMalus(s, s.current, malus, action.target)
      finishPlay(s)
      return true
    }
    case 'CASINO_STAKE': {
      if (s.pending?.type !== 'casino-stake') return false
      if (action.uid) {
        const card = p.hand.find((c) => c.uid === action.uid)
        if (!card || card.type !== 'salary') return false
        take(s, { hand: s.current }, card.uid)
        s.casino.stake = { card, by: s.current }
        log(s, `🎰 ${p.name} mise immédiatement un salaire (et repioche)`)
        draw(s, s.current)
      }
      s.pending = null
      finishPlay(s)
      return true
    }
    case 'BIRTHDAY_GIFT': {
      // un donateur de l'Anniversaire offre l'un de ses salaires non investis
      // (uid null : son plus petit, choix par défaut à l'expiration du délai)
      const pend = s.pending
      if (pend?.type !== 'birthday' || !pend.donors.includes(action.by) || action.by in pend.gifts) return false
      const donor = s.players[action.by]
      const gift = action.uid == null
        ? lowestUnusedSalary(s, donor)
        : unspentMoney(s, donor).find((c) => c.uid === action.uid)
      if (!gift) return false
      const gifts = { ...pend.gifts, [action.by]: gift.uid }
      if (pend.donors.some((i) => !(i in gifts))) {
        s.pending = { ...pend, gifts }
        return true
      }
      s.pending = null
      giveBirthdayGifts(s, s.current, gifts)
      finishPlay(s)
      return true
    }
    case 'CHERCHEUR_DISCARD': {
      // l'ex-Chercheur défausse la carte de son choix
      // (uid null : au hasard, choix par défaut à l'expiration du délai)
      const pend = s.pending
      const q = s.players[pend.player]
      const card = action.uid == null
        ? pick(s, q.hand)
        : q.hand.find((c) => c.uid === action.uid)
      if (!card) return false
      move(s, card.uid, { hand: pend.player }, 'discard', { by: pend.player })
      log(s, `${q.name} (Chercheur) défausse 1 carte en plus`)
      s.pending = null
      // reprend là où la perte du métier s'était arrêtée
      if (pend.resume === 'end-turn') endTurn(s)
      else if (pend.resume === 'finish-play') finishPlay(s)
      return true
    }
    case 'CLOSE_PENDING': {
      // fermer les modales d'information (Journaliste, Médium)
      if (s.pending?.type !== 'journalist' && s.pending?.type !== 'medium') return false
      s.pending = null
      finishPlay(s)
      return true
    }
    default:
      return false
  }
}

export function gameReducer(prev, action) {
  if (action.type === 'START_GAME') return newGameState(action.names, action.colors, { seed: action.seed, extensions: action.extensions })

  // l'auteur de l'action doit être un joueur autorisé à agir maintenant
  if (!prev?.players || prev.status !== 'playing' || !canAct(prev, action.by)) return prev

  // Chercheur qui perd son métier : seule sa défausse est attendue
  if ((prev.pending?.type === 'chercheur-discard') !== (action.type === 'CHERCHEUR_DISCARD')) return prev

  // copie complète : aucune zone ne peut être oubliée dans la copie
  const s = structuredClone(prev)
  // le cadre actif joue l'action ; sans cadre actif, c'est le choix pending
  const frame = activeFrame(s)
  const ok = frame ? flowOf(frame.flow).apply(s, frame, action) : applyPending(s, action)
  return ok ? s : prev
}
