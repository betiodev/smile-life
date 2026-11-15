// ---------------------------------------------------------------------------
// Smile Life — reducer principal (machine à états du jeu)
// SETUP → TURN_TRANSITION → DRAW_PHASE → PLAY_PHASE → CHECK → ... → GAME_OVER
// ---------------------------------------------------------------------------
import { buildDeck, shuffle } from '../data/index.js'
import {
  canPoseSelf, canPlayMalus, canPlaySpecial, isPlayableFromDiscard, canTakeRiverNow,
  canTakeDiscardTop, hasJob, isProf, isInterim, interimReplaced, handTarget, houseCost, hasTag, isGrandProf,
  validatePayment, canStopAdultery, canEndPlays, birthdayDonors, lowestUnusedSalary,
  unusedHeritage, heritageLiasses,
} from './rules.js'
import { canAct } from './turn.js'
import { jobOf, marriageOf, adulteryOf, topFlirt, unspentMoney, malusOf } from './state.js'
import {
  log, fillDeck, draw, refill, take, takeAll, put, move, place, remove, removeAll, steal, attach, loseJob, skip,
} from './primitives.js'
import { emit } from './events.js'
import { seedFrom, randomSeed, rngOf, pick } from './rng.js'

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

// ---------------------------------------------------------------------------
// Effets des malus (utilisé pour jeu direct ET Vengeance)
// ---------------------------------------------------------------------------
function applyMalus(s, attackerIdx, card, targetIdx) {
  const a = s.players[attackerIdx]
  const t = s.players[targetIdx]
  switch (card.key) {
    case 'accident':
    case 'maladie':
    case 'burnout':
      skip(s, targetIdx, 1)
      place(s, targetIdx, card)
      log(s, `${a.name} inflige ${card.name} à ${t.name} : passe 1 tour`, 'malus')
      break
    case 'licenciement':
      log(s, `${a.name} licencie ${t.name} (${jobOf(t).name})`, 'malus')
      loseJob(s, targetIdx, { cause: 'licenciement', by: attackerIdx })
      place(s, targetIdx, card)
      break
    case 'impot': {
      // le dernier salaire non investi
      const last = unspentMoney(s, t).at(-1)
      if (last) {
        remove(s, last.uid, { cause: 'impot', by: attackerIdx })
        log(s, `${a.name} impose ${t.name} : salaire niveau ${last.level} défaussé`, 'malus')
      }
      place(s, targetIdx, card)
      break
    }
    case 'divorce': {
      const cause = { cause: 'divorce', by: attackerIdx }
      remove(s, marriageOf(t).uid, cause)
      if (adulteryOf(t)) {
        remove(s, adulteryOf(t).uid, cause)
        removeAll(s, targetIdx, 'children', cause)
        log(s, `${a.name} divorce ${t.name} en plein adultère : mariage, adultère et enfants perdus !`, 'malus')
      } else {
        log(s, `${a.name} inflige un Divorce à ${t.name} (enfants conservés)`, 'malus')
      }
      place(s, targetIdx, card)
      break
    }
    case 'redoublement': {
      const study = t.studies.at(-1)
      if (study) remove(s, study.uid, { cause: 'redoublement', by: attackerIdx })
      place(s, targetIdx, card)
      log(s, `${a.name} fait redoubler ${t.name} : 1 carte études défaussée`, 'malus')
      break
    }
    case 'prison':
      skip(s, targetIdx, 3)
      log(s, `${a.name} envoie ${t.name} en Prison : passe 3 tours, le Bandit est défaussé`, 'malus')
      loseJob(s, targetIdx, { cause: 'prison', by: attackerIdx })
      put(s, card, 'discard', { by: attackerIdx })
      break
    case 'attentat': {
      const na = a.children.length, nt = t.children.length
      const cause = { cause: 'attentat', by: attackerIdx, to: 'outOfGame' }
      removeAll(s, attackerIdx, 'children', cause)
      removeAll(s, targetIdx, 'children', cause)
      a.didAttentat = true
      put(s, card, 'outOfGame', cause)
      log(s, `💥 ${a.name} commet un Attentat contre ${t.name} : ${na + nt} enfant(s) retirés du jeu`, 'malus')
      break
    }
  }
}

// Policier (posé ou pistonné) : les Bandits et Gourous déjà posés sont défaussés
function policeSweep(s, pIdx) {
  s.players.forEach((q, qi) => {
    if (qi !== pIdx && hasTag(jobOf(q), 'outlaw')) {
      log(s, `👮 Le Policier fait défausser le ${jobOf(q).name} de ${q.name}`, 'malus')
      loseJob(s, qi, { cause: 'policier', by: pIdx })
    }
  })
}

// Avantages instantanés (API) déclenchés à la pose d'un métier
// (pose normale ou via Piston) — retourne true si un "pending" est créé
function triggerJobApi(s, pIdx, card) {
  if (card.key === 'journaliste') {
    s.pending = { type: 'journalist' }
    return true
  }
  if (card.key === 'medium') {
    s.pending = { type: 'medium', cards: s.deck.slice(-13).reverse() }
    return true
  }
  if (card.key === 'astronaute') {
    if (s.discard.some((e) => isPlayableFromDiscard(s, pIdx, e.card))) {
      s.pending = { type: 'discard-pick', source: 'Astronaute' }
      return true
    }
    log(s, `L’avantage de l’Astronaute est perdu (rien de jouable dans la défausse)`)
  }
  if (card.key === 'chef_achats' || card.key === 'chef_ventes') {
    if (s.players.some((q, qi) => qi !== pIdx && q.hand.length > 0)) {
      s.pending = { type: 'chef-troc', step: 'target' }
      return true
    }
    log(s, `L’avantage du ${card.name} est perdu (aucun adversaire avec des cartes)`)
  }
  return false
}

// ---------------------------------------------------------------------------
// Pose d'une carte devant soi (placement + effets)
// Retourne true si la pose crée un état "pending" (choix à faire)
// ---------------------------------------------------------------------------
function poseSelf(s, pIdx, card) {
  const p = s.players[pIdx]
  // Intérimaire : le métier part à la défausse, dans la même action
  // (les salaires déjà posés restent en place)
  const replaced = interimReplaced(p, card)
  if (replaced) {
    log(s, `${p.name} quitte son poste de ${replaced.name} (métier intérimaire défaussé)`)
    loseJob(s, pIdx, { cause: 'interim', by: pIdx })
  }
  switch (card.type) {
    case 'study':
      place(s, pIdx, card)
      log(s, `${p.name} pose ${card.name} (${p.studies.length} carte(s), niveau ${p.studies.reduce((t, c) => t + c.levels, 0)})`)
      break

    case 'job': {
      if (isGrandProf(card)) {
        // promotion : le Prof est défaussé
        const prof = jobOf(p)
        remove(s, prof.uid, { cause: 'promotion', by: pIdx })
        place(s, pIdx, card)
        log(s, `${p.name} est promu Grand Prof !`)
        break
      }
      place(s, pIdx, card)
      if (card.key === 'bandit') p.wasBandit = true
      log(s, `${p.name} devient ${card.name}`)
      // Policier : purge les Bandits et Gourous déjà posés
      if (card.key === 'policier') policeSweep(s, pIdx)
      // Avantages instantanés (API)
      return triggerJobApi(s, pIdx, card)
    }

    case 'salary':
      place(s, pIdx, card)
      log(s, `${p.name} pose un salaire niveau ${card.level}`)
      break

    case 'flirt': {
      place(s, pIdx, card)
      log(s, `${p.name} flirte ${card.name} ${card.emoji}`)
      // Vol de flirt : même lieu que le flirt du DESSUS d'un adversaire
      s.players.forEach((q, qi) => {
        if (qi === pIdx) return
        const top = topFlirt(q)
        if (top && top.place === card.place) {
          // le flirt volé est posé de nouveau, chez le voleur
          steal(s, top.uid, pIdx, { cause: 'vol' })
          log(s, `💘 ${p.name} vole le flirt ${top.name} de ${q.name} !`, 'malus')
        }
      })
      break
    }

    case 'marriage':
      place(s, pIdx, card)
      log(s, `💒 ${p.name} se marie à ${card.name} !`)
      break

    case 'adultery':
      place(s, pIdx, card)
      log(s, `😏 ${p.name} commence un adultère...`)
      break

    case 'child':
      place(s, pIdx, card)
      log(s, `👶 ${p.name} accueille ${card.name} !`)
      break

    case 'acquisition': {
      if (hasTag(card, 'animal')) {
        place(s, pIdx, card)
        log(s, `${p.name} adopte ${card.name} ${card.emoji || ''}`)
        break
      }
      if (hasTag(card, 'travel') && hasJob(p, 'pilote')) {
        place(s, pIdx, card)
        log(s, `✈️ ${p.name} voyage gratuitement à ${card.name} (Pilote)`)
        break
      }
      // achat à payer → modale d'investissement
      s.pending = { type: 'purchase', cardUid: card.uid, card }
      return true
    }

    case 'distinction': {
      place(s, pIdx, card)
      log(s, `🏅 ${p.name} reçoit ${card.name} !`)
      break
    }

    case 'special':
      return applySpecial(s, pIdx, card)
  }
  return false
}

// Anniversaire : applique tous les cadeaux d'un coup (gifts[qi] = uid du salaire
// offert par le joueur qi), dans l'ordre des joueurs
function giveBirthdayGifts(s, pIdx, gifts) {
  const p = s.players[pIdx]
  let count = 0
  s.players.forEach((q, qi) => {
    if (qi === pIdx) return
    const gift = unspentMoney(s, q).find((c) => c.uid === gifts[qi])
    if (gift) {
      steal(s, gift.uid, pIdx, { cause: 'anniversaire', by: qi })
      count++
      log(s, `🎂 ${q.name} offre un salaire niveau ${gift.level} à ${p.name}`)
    } else {
      log(s, `🎂 ${q.name} n’a aucun salaire à offrir`)
    }
  })
  if (count === 0) log(s, `🎂 Triste anniversaire pour ${p.name}...`)
}

// ---------------------------------------------------------------------------
// Cartes spéciales — retourne true si un "pending" est créé
// ---------------------------------------------------------------------------
function applySpecial(s, pIdx, card) {
  const p = s.players[pIdx]
  switch (card.key) {
    case 'anniversaire': {
      place(s, pIdx, card)
      // chaque adversaire ayant un salaire non investi choisit celui qu'il offre
      // (action BIRTHDAY_GIFT) ; sans donateur, l'anniversaire est réglé tout de suite
      const donors = birthdayDonors(s, pIdx)
      if (donors.length === 0) {
        giveBirthdayGifts(s, pIdx, {})
        return false
      }
      s.pending = { type: 'birthday', card, donors, gifts: {} }
      return true
    }
    case 'arcenciel':
      place(s, pIdx, card)
      // +3 jeux : après consommation de la pose de l'Arc-en-ciel, il en reste 3
      s.playsRemaining += 3
      s.rainbow = true // le joueur peut s'arrêter quand il veut (END_PLAYS)
      log(s, `🌈 ${p.name} joue Arc-en-ciel : jusqu’à 3 cartes d’un coup !`)
      return false
    case 'chance': {
      place(s, pIdx, card)
      const cards = draw(s, pIdx, { count: 3, to: 'aside' })
      // Chance agit comme une pioche : elle ne consomme pas le jeu du tour
      s.playsRemaining += 1
      log(s, `🍀 ${p.name} joue Chance : pioche ${cards.length} cartes, en garde une en main`)
      s.pending = { type: 'chance', cards }
      return true
    }
    case 'etoile':
      place(s, pIdx, card)
      log(s, `🌠 ${p.name} joue Étoile filante`)
      s.pending = { type: 'discard-pick', source: 'Étoile filante' }
      return true
    case 'heritage':
      place(s, pIdx, card)
      log(s, `💵 ${p.name} touche un Héritage : 3 liasses pour ses futurs achats`)
      return false
    case 'piston':
      place(s, pIdx, card)
      s.pending = { type: 'piston' }
      return true
    case 'troc':
      place(s, pIdx, card)
      s.pending = { type: 'troc' }
      return true
    case 'tsunami': {
      place(s, pIdx, card)
      let pool = []
      s.players.forEach((q, qi) => { pool = pool.concat(takeAll(s, { hand: qi })) })
      pool = shuffle(pool, rngOf(s))
      // redistribution équitable : chacun vers sa taille de main cible
      const order = s.players.map((_, i) => (pIdx + i) % s.players.length)
      let active = true
      while (pool.length > 0 && active) {
        active = false
        for (const qi of order) {
          if (pool.length === 0) break
          if (s.players[qi].hand.length < handTarget(s.players[qi])) {
            put(s, pool.pop(), { hand: qi })
            active = true
          }
        }
      }
      // s'il reste des cartes (mains inégales), distribution round-robin
      let k = 0
      while (pool.length > 0) {
        put(s, pool.pop(), { hand: order[k % order.length] })
        k++
      }
      log(s, `🌊 ${p.name} déclenche un Tsunami : toutes les mains sont redistribuées !`)
      return false
    }
    case 'vengeance':
      place(s, pIdx, card)
      s.pending = { type: 'vengeance' }
      return true
    case 'casino':
      place(s, pIdx, card)
      s.casino = { owner: pIdx, stake: null }
      log(s, `🎰 ${p.name} ouvre un Casino !`)
      if (p.hand.some((c) => c.type === 'salary')) {
        s.pending = { type: 'casino-stake' }
        return true
      }
      return false
  }
  return false
}

// ---------------------------------------------------------------------------
// Fin de tour / avancement
// ---------------------------------------------------------------------------
function finishPlay(s) {
  // appelé après chaque résolution de jeu : continue, ou termine le tour
  if (s.pending || s.forced) return
  if (s.playsRemaining > 0) return
  endTurn(s)
}

function endTurn(s) {
  const pIdx = s.current
  refill(s, pIdx)
  emit(s, 'turnEnd', { player: pIdx })

  // fin de partie : pioche vide
  if (s.deck.length === 0) {
    gameOver(s)
    return
  }

  // variante rivière : rotation si personne n'a pris pendant un tour complet
  if (s.riverEnabled) {
    if (s.riverUsedThisTurn) s.riverIdle = 0
    else s.riverIdle += 1
    if (s.riverIdle >= s.players.length) {
      for (const c of takeAll(s, 'river')) put(s, c, 'discard')
      draw(s, null, { count: 3, to: 'river' })
      s.riverIdle = 0
      log(s, `🌊 La rivière est renouvelée`)
      if (s.deck.length === 0) {
        gameOver(s)
        return
      }
    }
  }

  // joueur suivant, en consommant les tours passés
  let next = (pIdx + 1) % s.players.length
  let wrapped = next <= pIdx
  while (s.players[next].skipTurns > 0) {
    s.players[next].skipTurns -= 1
    log(s, `⏭️ ${s.players[next].name} passe son tour (${s.players[next].skipTurns} restant)`)
    next = (next + 1) % s.players.length
    if (next === 0) wrapped = true
  }
  if (wrapped) emit(s, 'roundEnd')

  s.current = next
  s.phase = 'draw'
  s.playsRemaining = 1
  s.rainbow = false
  s.cardPlayed = false
  s.forced = null
  s.pending = null
  s.riverUsedThisTurn = false
  s.turnCount += 1
  emit(s, 'turnStart', { player: next })
}

function gameOver(s) {
  // casino non résolu : le miseur récupère son salaire (avec son smile)
  if (s.casino?.stake) {
    const { card, by } = s.casino.stake
    place(s, by, card)
    log(s, `🎰 Personne n’a relevé la mise : ${s.players[by].name} récupère son salaire`)
    s.casino.stake = null
  }
  // les mains restantes sont défaussées
  s.players.forEach((_, i) => {
    for (const c of takeAll(s, { hand: i })) put(s, c, 'discard')
  })
  log(s, `🏁 La pioche est vide : fin de partie !`)
  s.status = 'over'
  emit(s, 'gameEnd')
}

// Consommation d'un jeu de carte (forcé ou non)
function consumePlay(s, wasForced) {
  s.cardPlayed = true
  if (wasForced) {
    if (s.forcedConsumesPlay) s.playsRemaining -= 1
    s.forced = null
    s.forcedConsumesPlay = false
  } else {
    s.playsRemaining -= 1
  }
}

// ---------------------------------------------------------------------------
// REDUCER
// ---------------------------------------------------------------------------
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
      riverUsedThisTurn: false,
      current: 0,
      phase: 'draw',
      playsRemaining: 1,
      rainbow: false,     // Arc-en-ciel joué ce tour : « jusqu'à 3 cartes », on peut s'arrêter
      cardPlayed: false,  // une carte a-t-elle déjà été jouée ce tour ?
      forced: null,
      forcedConsumesPlay: false,
      pending: null,
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
    emit(s, 'turnStart', { player: s.current })
    return s
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
  // p = joueur dont c'est le tour. Hors troc du Chef (étape opp-pick, où
  // l'adversaire choisit dans la main du Chef) et cadeaux d'Anniversaire (chaque
  // donateur offre son salaire), c'est aussi l'auteur de l'action.
  const p = s.players[s.current]

  switch (action.type) {
    // ----- PHASE DE PIOCHE ------------------------------------------------
    case 'DRAW_DECK': {
      if (s.phase !== 'draw') return prev
      draw(s, s.current)
      s.phase = 'play'
      return s
    }
    case 'TAKE_DISCARD': {
      if (s.phase !== 'draw' || !canTakeDiscardTop(s, s.current).ok) return prev
      const card = take(s, 'discard', s.discard.at(-1).card.uid)
      s.forced = card
      s.forcedConsumesPlay = true
      s.phase = 'play'
      log(s, `${p.name} prend ${card.name} dans la défausse (à jouer immédiatement)`)
      return s
    }
    case 'TAKE_RIVER': {
      if (s.phase !== 'draw' || !s.riverEnabled) return prev
      const i = action.index
      if (i < 0 || i >= s.river.length) return prev
      if (action.playNow && !canTakeRiverNow(s, s.current, s.river[i])) return prev
      const card = take(s, 'river', s.river[i].uid)
      draw(s, null, { to: 'river', at: i })
      s.riverUsedThisTurn = true
      s.phase = 'play'
      if (action.playNow) {
        s.forced = card
        s.forcedConsumesPlay = true
        log(s, `${p.name} prend ${card.name} dans la rivière (jouée immédiatement)`)
      } else {
        put(s, card, { hand: s.current })
        log(s, `${p.name} prend une carte dans la rivière`)
      }
      return s
    }
    case 'RESIGN': {
      if (s.phase !== 'draw' || !jobOf(p)) return prev
      const interim = isInterim(p)
      log(s, `${p.name} démissionne de ${jobOf(p).name}${interim ? ' (Intérimaire : joue quand même)' : ' et passe son tour'}`)
      // Chercheur : le tour ne se termine qu'après le choix de la carte défaussée
      const choosing = loseJob(s, s.current, { cause: 'demission', by: s.current, resume: interim ? 'none' : 'end-turn' })
      if (!interim && !choosing) endTurn(s)
      return s
    }
    case 'DIVORCE_VOLUNTARY': {
      if (s.phase !== 'draw' || !marriageOf(p)) return prev
      remove(s, marriageOf(p).uid, { cause: 'divorce', by: s.current })
      if (adulteryOf(p)) {
        remove(s, adulteryOf(p).uid, { cause: 'divorce', by: s.current })
        log(s, `${p.name} divorce volontairement (adultère défaussé, enfants et flirts conservés) et passe son tour`)
      } else {
        log(s, `${p.name} divorce volontairement (enfants conservés) et passe son tour`)
      }
      endTurn(s)
      return s
    }
    case 'STOP_ADULTERY': {
      if (!canStopAdultery(s, s.current).ok) return prev
      remove(s, adulteryOf(p).uid, { cause: 'fin-adultere', by: s.current })
      log(s, `${p.name} met fin à son adultère (flirts conservés)`)
      return s
    }

    // ----- PHASE DE JEU -----------------------------------------------------
    case 'PLAY_SELF': {
      if (s.phase !== 'play' || s.pending) return prev
      const fromForced = s.forced?.uid === action.uid
      // une carte forcée attend : elle seule peut être jouée
      if (s.forced && !fromForced) return prev
      const card = fromForced ? s.forced : p.hand.find((c) => c.uid === action.uid)
      if (!card || !canPoseSelf(s, s.current, card).ok) return prev
      if (!fromForced) take(s, { hand: s.current }, card.uid)
      const hasPending = poseSelf(s, s.current, card)
      // la pose "purchase" n'est effective qu'après confirmation
      if (hasPending && s.pending?.type === 'purchase') {
        s.pending.fromForced = fromForced
        return s
      }
      consumePlay(s, fromForced)
      finishPlay(s)
      return s
    }
    case 'PLAY_MALUS': {
      if (s.phase !== 'play' || s.pending) return prev
      const fromForced = s.forced?.uid === action.uid
      if (s.forced && !fromForced) return prev
      const card = fromForced ? s.forced : p.hand.find((c) => c.uid === action.uid)
      if (!card || card.type !== 'malus') return prev
      if (!canPlayMalus(s, s.current, card, action.target).ok) return prev
      if (!fromForced) take(s, { hand: s.current }, card.uid)
      applyMalus(s, s.current, card, action.target)
      consumePlay(s, fromForced)
      finishPlay(s)
      return s
    }
    case 'DISCARD_CARD': {
      if (s.phase !== 'play' || s.pending) return prev
      const fromForced = s.forced?.uid === action.uid
      // une carte prise dans la défausse ou la rivière doit être réellement jouée
      if (fromForced && s.forcedConsumesPlay) return prev
      if (s.forced && !fromForced) return prev
      const card = fromForced ? s.forced : p.hand.find((c) => c.uid === action.uid)
      if (!card) return prev
      if (!fromForced) take(s, { hand: s.current }, card.uid)
      put(s, card, 'discard', { by: s.current })
      log(s, `${p.name} défausse une carte`)
      consumePlay(s, fromForced)
      finishPlay(s)
      return s
    }
    case 'CASINO_BET': {
      // jouer un salaire comme mise au casino : de sa main, ou le salaire forcé
      // (pris dans la défausse : la mise compte comme le jouer). Une carte
      // forcée attend : elle seule peut être misée.
      if (s.phase !== 'play' || s.pending || !s.casino) return prev
      const fromForced = s.forced?.uid === action.uid
      if (s.forced && !fromForced) return prev
      const card = fromForced ? s.forced : p.hand.find((c) => c.uid === action.uid)
      if (!card || card.type !== 'salary') return prev
      if (s.casino.stake && s.casino.stake.by === s.current) return prev
      if (!fromForced) take(s, { hand: s.current }, card.uid)
      if (!s.casino.stake) {
        s.casino.stake = { card, by: s.current }
        log(s, `🎰 ${p.name} mise un salaire au Casino`)
      } else {
        const first = s.casino.stake
        const firstP = s.players[first.by]
        let winnerIdx
        if (first.card.level === card.level) {
          winnerIdx = s.current
          log(s, `🎰 Même niveau (${card.level}) : ${p.name} remporte les deux salaires !`)
        } else {
          winnerIdx = first.by
          log(s, `🎰 Niveaux différents (${first.card.level} vs ${card.level}) : ${firstP.name} remporte les deux salaires !`)
        }
        place(s, winnerIdx, first.card)
        place(s, winnerIdx, card)
        s.casino.stake = null
      }
      consumePlay(s, fromForced)
      finishPlay(s)
      return s
    }
    case 'END_PLAYS': {
      // bouton "Terminer" pendant un Arc-en-ciel
      if (!canEndPlays(s)) return prev
      s.playsRemaining = 0
      endTurn(s)
      return s
    }

    // ----- RÉSOLUTIONS DES PENDINGS ---------------------------------------
    case 'PURCHASE_CONFIRM': {
      if (s.pending?.type !== 'purchase') return prev
      const card = s.pending.card
      const isFree = hasTag(card, 'house') && hasJob(p, 'architecte') && !p.architectFreeUsed && action.useArchitect
      const cost = hasTag(card, 'house') ? houseCost(p, card) : card.cost
      if (!isFree) {
        const chosen = []
        const unspent = unspentMoney(s, p)
        for (const su of action.salaryUids || []) {
          const sal = unspent.find((c) => c.uid === su)
          if (sal && !chosen.includes(sal)) chosen.push(sal)
        }
        const heritage = action.useHeritage ? heritageLiasses(s, p) : 0
        // pas de salaire superflu : impossible de sur-investir pour échapper à l'Impôt
        if (!validatePayment(cost, chosen.map((c) => c.level), heritage).ok) return prev
        const paid = chosen.reduce((t, c) => t + c.level, 0) + heritage
        // les salaires passent sous l'acquisition qu'ils ont payée
        for (const sal of chosen) attach(s, sal.uid, card.uid)
        // l'Héritage (tout ou rien) passe sous l'acquisition, avec les salaires
        if (heritage > 0) for (const c of unusedHeritage(s, p)) attach(s, c.uid, card.uid)
        log(s, `${p.name} achète ${card.name} pour ${cost} liasses (${paid} investies${paid > cost ? ' — pas de monnaie !' : ''})`)
      } else {
        p.architectFreeUsed = true
        log(s, `🏠 ${p.name} (Architecte) obtient ${card.name} gratuitement !`)
      }
      const wasForced = s.pending.fromForced
      place(s, s.current, card)
      s.pending = null
      consumePlay(s, wasForced)
      finishPlay(s)
      return s
    }
    case 'PURCHASE_CANCEL': {
      if (s.pending?.type !== 'purchase') return prev
      // la carte revient en main (ou reste forcée)
      if (s.pending.fromForced) {
        s.pending = null
      } else {
        put(s, s.pending.card, { hand: s.current })
        s.pending = null
      }
      return s
    }
    case 'CHANCE_PICK': {
      if (s.pending?.type !== 'chance') return prev
      const cards = s.pending.cards
      const kept = cards.find((c) => c.uid === action.uid)
      if (!kept) return prev
      for (const c of cards) if (c.uid !== kept.uid) put(s, c, 'discard', { by: s.current })
      // la carte gardée rejoint la main : le joueur joue ensuite ce qu'il veut
      put(s, kept, { hand: s.current })
      s.pending = null
      log(s, `🍀 ${p.name} garde une carte en main et défausse les deux autres`)
      finishPlay(s)
      return s
    }
    case 'DISCARD_PICK': {
      // Étoile filante / Astronaute : prendre une carte de la défausse et la jouer
      if (s.pending?.type !== 'discard-pick') return prev
      const entry = s.discard.find((e) => e.card.uid === action.uid)
      if (!entry || !isPlayableFromDiscard(s, s.current, entry.card)) return prev
      const card = take(s, 'discard', action.uid)
      s.pending = null
      s.forced = card
      s.forcedConsumesPlay = false
      log(s, `${p.name} récupère ${card.name} dans la défausse`)
      return s
    }
    case 'PISTON_PICK': {
      if (s.pending?.type !== 'piston') return prev
      const card = p.hand.find((c) => c.uid === action.uid)
      if (!card || card.type !== 'job' || isGrandProf(card)) return prev
      if (hasTag(card, 'outlaw') && s.players.some((q) => hasJob(q, 'policier'))) return prev
      if (jobOf(p)) return prev
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
      return s
    }
    case 'TROC_PICK': {
      if (s.pending?.type !== 'troc') return prev
      const t = s.players[action.target]
      if (!t || action.target === s.current || t.hand.length === 0) return prev
      const mine = pick(s, p.hand)
      const theirs = pick(s, t.hand)
      if (mine) move(s, mine.uid, { hand: s.current }, { hand: action.target })
      if (theirs) move(s, theirs.uid, { hand: action.target }, { hand: s.current })
      log(s, `🔄 ${p.name} troque une carte au hasard avec ${t.name}`)
      s.pending = null
      finishPlay(s)
      return s
    }

    // ----- Troc du Chef des achats/ventes (avantage instantané) ------------
    case 'CHEF_TROC_TARGET': {
      if (s.pending?.type !== 'chef-troc' || s.pending.step !== 'target') return prev
      const t = s.players[action.target]
      if (!t || action.target === s.current || t.hand.length === 0) return prev
      // s'il reste au moins 2 cartes en main, le Chef en protège une
      if (p.hand.length >= 2) {
        s.pending = { type: 'chef-troc', step: 'protect', target: action.target }
      } else {
        s.pending = { type: 'chef-troc', step: 'opp-pick', target: action.target, protectedUid: null }
      }
      return s
    }
    case 'CHEF_TROC_PROTECT': {
      if (s.pending?.type !== 'chef-troc' || s.pending.step !== 'protect') return prev
      if (!p.hand.some((c) => c.uid === action.uid)) return prev
      log(s, `🛡️ ${p.name} protège 1 carte de son troc`)
      s.pending = { type: 'chef-troc', step: 'opp-pick', target: s.pending.target, protectedUid: action.uid }
      return s
    }
    case 'CHEF_TROC_OPP_PICK': {
      // l'adversaire choisit, face cachée, une carte non protégée du Chef
      if (s.pending?.type !== 'chef-troc' || s.pending.step !== 'opp-pick') return prev
      // Pioche face cachée : l'ordre de la main est public (cartes ajoutées à la fin),
      // donc on ignore action.index et on tire au hasard, comme une main mélangée à la table.
      const pickable = p.hand.filter((c) => c.uid !== s.pending.protectedUid)
      if (!(Number.isInteger(action.index) && action.index >= 0 && action.index < pickable.length)) return prev
      const picked = pick(s, pickable)
      s.pending = { type: 'chef-troc', step: 'chef-pick', target: s.pending.target, oppPickedUid: picked.uid }
      return s
    }
    case 'CHEF_TROC_CHEF_PICK': {
      // le Chef choisit, face cachée, une carte de l'adversaire — puis échange
      if (s.pending?.type !== 'chef-troc' || s.pending.step !== 'chef-pick') return prev
      const t = s.players[s.pending.target]
      // même raison : action.index est ignoré, tirage au hasard dans la main adverse
      if (!(Number.isInteger(action.index) && action.index >= 0 && action.index < t.hand.length)) return prev
      const theirs = pick(s, t.hand)
      move(s, s.pending.oppPickedUid, { hand: s.current }, { hand: s.pending.target })
      move(s, theirs.uid, { hand: s.pending.target }, { hand: s.current })
      log(s, `🔄 ${p.name} (${jobOf(p).name}) troque une carte avec ${t.name} en en protégeant une`)
      s.pending = null
      finishPlay(s)
      return s
    }
    case 'VENGEANCE_PICK': {
      if (s.pending?.type !== 'vengeance') return prev
      const malus = malusOf(p).find((c) => c.uid === action.uid)
      if (!malus) return prev
      if (!canPlayMalus(s, s.current, malus, action.target).ok) return prev
      remove(s, malus.uid, { cause: 'vengeance', by: s.current, to: 'aside' })
      log(s, `😈 ${p.name} se venge avec ${malus.name} !`)
      // avant applyMalus : un licenciement de Chercheur ouvre un nouveau choix
      s.pending = null
      applyMalus(s, s.current, malus, action.target)
      finishPlay(s)
      return s
    }
    case 'CASINO_STAKE': {
      if (s.pending?.type !== 'casino-stake') return prev
      if (action.uid) {
        const card = p.hand.find((c) => c.uid === action.uid)
        if (!card || card.type !== 'salary') return prev
        take(s, { hand: s.current }, card.uid)
        s.casino.stake = { card, by: s.current }
        log(s, `🎰 ${p.name} mise immédiatement un salaire (et repioche)`)
        draw(s, s.current)
      }
      s.pending = null
      finishPlay(s)
      return s
    }
    case 'BIRTHDAY_GIFT': {
      // un donateur de l'Anniversaire offre l'un de ses salaires non investis
      // (uid null : son plus petit, choix par défaut à l'expiration du délai)
      const pend = s.pending
      if (pend?.type !== 'birthday' || !pend.donors.includes(action.by) || action.by in pend.gifts) return prev
      const donor = s.players[action.by]
      const gift = action.uid == null
        ? lowestUnusedSalary(s, donor)
        : unspentMoney(s, donor).find((c) => c.uid === action.uid)
      if (!gift) return prev
      const gifts = { ...pend.gifts, [action.by]: gift.uid }
      if (pend.donors.some((i) => !(i in gifts))) {
        s.pending = { ...pend, gifts }
        return s
      }
      s.pending = null
      giveBirthdayGifts(s, s.current, gifts)
      finishPlay(s)
      return s
    }
    case 'CHERCHEUR_DISCARD': {
      // l'ex-Chercheur défausse la carte de son choix
      // (uid null : au hasard, choix par défaut à l'expiration du délai)
      const pend = s.pending
      const q = s.players[pend.player]
      const card = action.uid == null
        ? pick(s, q.hand)
        : q.hand.find((c) => c.uid === action.uid)
      if (!card) return prev
      move(s, card.uid, { hand: pend.player }, 'discard', { by: pend.player })
      log(s, `${q.name} (Chercheur) défausse 1 carte en plus`)
      s.pending = null
      // reprend là où la perte du métier s'était arrêtée
      if (pend.resume === 'end-turn') endTurn(s)
      else if (pend.resume === 'finish-play') finishPlay(s)
      return s
    }
    case 'CLOSE_PENDING': {
      // fermer les modales d'information (Journaliste, Médium)
      if (s.pending?.type !== 'journalist' && s.pending?.type !== 'medium') return prev
      s.pending = null
      finishPlay(s)
      return s
    }
    default:
      return prev
  }
}
