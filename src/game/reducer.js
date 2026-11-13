// ---------------------------------------------------------------------------
// Smile Life — reducer principal (machine à états du jeu)
// SETUP → TURN_TRANSITION → DRAW_PHASE → PLAY_PHASE → CHECK → ... → GAME_OVER
// ---------------------------------------------------------------------------
import { buildDeck, shuffle } from '../data/index.js'
import {
  canPoseSelf, canPlayMalus, canPlaySpecial, isPlayableFromDiscard, canTakeRiverNow,
  canTakeDiscardTop, hasJob, isProf, isInterim, interimReplaced, handTarget, houseCost, hasTag, isGrandProf,
  availableLiasses, validatePayment, canStopAdultery, birthdayDonors, lowestUnusedSalary,
} from './rules.js'
import { canAct } from './turn.js'
import {
  jobOf, addJob, removeJob, marriageOf, addMarriage, removeMarriage, adulteryOf, addAdultery, removeAdultery,
  topFlirt, unspentMoney, addMoney, takeMoney, investMoney, malusOf, addMalus, takeMalus, putOutOfGame,
} from './state.js'
import { seedFrom, randomSeed, rngOf, pick } from './rng.js'

// --- helpers ---------------------------------------------------------------

function makePlayer(name, color = null) {
  return {
    name,
    color,              // couleur choisie dans le salon (affichage seulement)
    hand: [],
    studies: [],
    jobs: [],           // métiers (jeu de base : un seul, règle dans rules.js)
    money: [],          // [{ card, invested, paidFor }] paidFor = uid de l'acquisition payée
    flirts: [],         // dernier élément = dessus de la pile
    marriages: [],      // mariages (jeu de base : un seul)
    adultery: [],       // au plus une carte
    children: [],
    acquisitions: [],
    distinctions: [],   // [{ card, active }]
    specials: [],       // cartes spéciales utilisées (retournées)
    malus: [],          // malus reçus (retournés)
    skipTurns: 0,
    wasBandit: false,
    didAttentat: false,
    heritage: 0,        // liasses d'héritage disponibles
    heritageFor: {},    // uid carte Héritage → uid de l'acquisition qu'elle a payée
    architectFreeUsed: false,
  }
}

// clone superficiel profond-suffisant : on clone les joueurs et les listes
function cloneState(state) {
  return {
    ...state,
    deck: [...state.deck],
    discard: [...state.discard],
    outOfGame: state.outOfGame.map((e) => ({ ...e })),
    river: [...state.river],
    log: [...state.log],
    players: state.players.map((p) => ({
      ...p,
      hand: [...p.hand],
      studies: [...p.studies],
      jobs: [...p.jobs],
      money: p.money.map((m) => ({ ...m })),
      flirts: [...p.flirts],
      marriages: [...p.marriages],
      adultery: [...p.adultery],
      children: [...p.children],
      acquisitions: [...p.acquisitions],
      distinctions: p.distinctions.map((d) => ({ ...d })),
      specials: [...p.specials],
      heritageFor: { ...p.heritageFor },
      malus: [...p.malus],
    })),
    casino: state.casino ? { ...state.casino, stake: state.casino.stake ? { ...state.casino.stake } : null } : null,
  }
}

// les id du journal sont numérotés dans l'état (partie rejouable à l'identique)
function log(s, text, kind = 'info') {
  s.nextLogId = (s.nextLogId ?? 0) + 1
  s.log.push({ id: s.nextLogId, text, kind })
  if (s.log.length > 60) s.log.shift()
}

function drawCard(s) {
  return s.deck.length > 0 ? s.deck.pop() : null
}

function toDiscard(s, card, byIdx = null) {
  s.discard.push({ card, by: byIdx })
}

function refillHand(s, pIdx) {
  const p = s.players[pIdx]
  const target = handTarget(p)
  while (p.hand.length < target) {
    const c = drawCard(s)
    if (!c) break
    p.hand.push(c)
  }
}

function removeFromHand(p, uidToRemove) {
  const i = p.hand.findIndex((c) => c.uid === uidToRemove)
  return i >= 0 ? p.hand.splice(i, 1)[0] : null
}

// Perte de métier (démission, licenciement, purge Policier, prison)
// Le métier est défaussé au nom de son propriétaire : il ne peut pas le reprendre.
// Retourne true si un choix reste à faire (Chercheur : carte à défausser) ;
// resume = ce qui reprend après ce choix ('finish-play' ou 'end-turn').
function loseJob(s, pIdx, destination = 'discard', resume = 'finish-play') {
  const p = s.players[pIdx]
  const job = jobOf(p)
  if (!job) return false
  removeJob(p, job.uid)
  p.architectFreeUsed = false
  // Grand Prix : retourné mais conserve ses smiles
  for (const d of p.distinctions) {
    if (d.card.key === 'grandprix' && d.active) {
      d.active = false
      log(s, `Le Grand Prix de ${p.name} est retourné (smiles conservés)`)
    }
  }
  if (destination === 'discard') toDiscard(s, job, pIdx)
  // Chercheur : défausse 1 carte en plus (main 6 → 5), choisie par le joueur
  // lui-même (action CHERCHEUR_DISCARD), même pendant le tour d'un autre
  if (job.key === 'chercheur' && p.hand.length > 0) {
    s.pending = { type: 'chercheur-discard', player: pIdx, resume }
    return true
  }
  return false
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
      t.skipTurns += 1
      addMalus(t, card)
      log(s, `${a.name} inflige ${card.name} à ${t.name} : passe 1 tour`, 'malus')
      break
    case 'licenciement':
      log(s, `${a.name} licencie ${t.name} (${jobOf(t).name})`, 'malus')
      loseJob(s, targetIdx)
      addMalus(t, card)
      break
    case 'impot': {
      // le dernier salaire non investi
      const last = unspentMoney(t).at(-1)
      if (last) {
        toDiscard(s, takeMoney(t, last.uid), targetIdx)
        log(s, `${a.name} impose ${t.name} : salaire niveau ${last.level} défaussé`, 'malus')
      }
      addMalus(t, card)
      break
    }
    case 'divorce': {
      toDiscard(s, removeMarriage(t, marriageOf(t).uid), targetIdx)
      if (adulteryOf(t)) {
        toDiscard(s, removeAdultery(t, adulteryOf(t).uid), targetIdx)
        for (const child of t.children) toDiscard(s, child, targetIdx)
        t.children = []
        log(s, `${a.name} divorce ${t.name} en plein adultère : mariage, adultère et enfants perdus !`, 'malus')
      } else {
        log(s, `${a.name} inflige un Divorce à ${t.name} (enfants conservés)`, 'malus')
      }
      addMalus(t, card)
      break
    }
    case 'redoublement': {
      const study = t.studies.pop()
      if (study) toDiscard(s, study, targetIdx)
      addMalus(t, card)
      log(s, `${a.name} fait redoubler ${t.name} : 1 carte études défaussée`, 'malus')
      break
    }
    case 'prison':
      t.skipTurns += 3
      log(s, `${a.name} envoie ${t.name} en Prison : passe 3 tours, le Bandit est défaussé`, 'malus')
      loseJob(s, targetIdx)
      toDiscard(s, card, attackerIdx)
      break
    case 'attentat': {
      for (const child of a.children) putOutOfGame(s, child, 'attentat', attackerIdx)
      for (const child of t.children) putOutOfGame(s, child, 'attentat', attackerIdx)
      const na = a.children.length, nt = t.children.length
      a.children = []
      t.children = []
      a.didAttentat = true
      putOutOfGame(s, card, 'attentat', attackerIdx)
      log(s, `💥 ${a.name} commet un Attentat contre ${t.name} : ${na + nt} enfant(s) retirés du jeu`, 'malus')
      break
    }
  }
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
    loseJob(s, pIdx)
  }
  switch (card.type) {
    case 'study':
      p.studies.push(card)
      log(s, `${p.name} pose ${card.name} (${p.studies.length} carte(s), niveau ${p.studies.reduce((t, c) => t + c.levels, 0)})`)
      break

    case 'job': {
      if (isGrandProf(card)) {
        // promotion : le Prof est défaussé
        const prof = jobOf(p)
        toDiscard(s, removeJob(p, prof.uid), pIdx)
        addJob(p, card)
        log(s, `${p.name} est promu Grand Prof !`)
        break
      }
      addJob(p, card)
      if (card.key === 'bandit') p.wasBandit = true
      log(s, `${p.name} devient ${card.name}`)
      // Policier : purge les Bandits et Gourous déjà posés
      if (card.key === 'policier') {
        s.players.forEach((q, qi) => {
          if (qi !== pIdx && hasTag(jobOf(q), 'outlaw')) {
            log(s, `👮 Le Policier fait défausser le ${jobOf(q).name} de ${q.name}`, 'malus')
            loseJob(s, qi)
          }
        })
      }
      // Avantages instantanés (API)
      return triggerJobApi(s, pIdx, card)
    }

    case 'salary':
      addMoney(p, card)
      log(s, `${p.name} pose un salaire niveau ${card.level}`)
      break

    case 'flirt': {
      p.flirts.push(card)
      log(s, `${p.name} flirte ${card.name} ${card.emoji}`)
      // Vol de flirt : même lieu que le flirt du DESSUS d'un adversaire
      s.players.forEach((q, qi) => {
        if (qi === pIdx) return
        const top = topFlirt(q)
        if (top && top.place === card.place) {
          q.flirts.pop()
          p.flirts.push(top)
          log(s, `💘 ${p.name} vole le flirt ${top.name} de ${q.name} !`, 'malus')
        }
      })
      break
    }

    case 'marriage':
      addMarriage(p, card)
      log(s, `💒 ${p.name} se marie à ${card.name} !`)
      break

    case 'adultery':
      addAdultery(p, card)
      log(s, `😏 ${p.name} commence un adultère...`)
      break

    case 'child':
      p.children.push(card)
      log(s, `👶 ${p.name} accueille ${card.name} !`)
      break

    case 'acquisition': {
      if (hasTag(card, 'animal')) {
        p.acquisitions.push(card)
        log(s, `${p.name} adopte ${card.name} ${card.emoji || ''}`)
        break
      }
      if (hasTag(card, 'travel') && hasJob(p, 'pilote')) {
        p.acquisitions.push(card)
        log(s, `✈️ ${p.name} voyage gratuitement à ${card.name} (Pilote)`)
        break
      }
      // achat à payer → modale d'investissement
      s.pending = { type: 'purchase', cardUid: card.uid, card }
      return true
    }

    case 'distinction': {
      p.distinctions.push({ card, active: true })
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
    const gift = takeMoney(q, gifts[qi])
    if (gift) {
      addMoney(p, gift)
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
      p.specials.push(card)
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
      p.specials.push(card)
      // +3 jeux : après consommation de la pose de l'Arc-en-ciel, il en reste 3
      s.playsRemaining += 3
      log(s, `🌈 ${p.name} joue Arc-en-ciel : jusqu’à 3 cartes d’un coup !`)
      return false
    case 'chance': {
      p.specials.push(card)
      const cards = []
      for (let i = 0; i < 3; i++) {
        const c = drawCard(s)
        if (c) cards.push(c)
      }
      // Chance agit comme une pioche : elle ne consomme pas le jeu du tour
      s.playsRemaining += 1
      log(s, `🍀 ${p.name} joue Chance : pioche ${cards.length} cartes, en garde une en main`)
      s.pending = { type: 'chance', cards }
      return true
    }
    case 'etoile':
      p.specials.push(card)
      log(s, `🌠 ${p.name} joue Étoile filante`)
      s.pending = { type: 'discard-pick', source: 'Étoile filante' }
      return true
    case 'heritage':
      p.specials.push(card)
      p.heritage += 3
      log(s, `💵 ${p.name} touche un Héritage : 3 liasses pour ses futurs achats`)
      return false
    case 'piston':
      p.specials.push(card)
      s.pending = { type: 'piston' }
      return true
    case 'troc':
      p.specials.push(card)
      s.pending = { type: 'troc' }
      return true
    case 'tsunami': {
      p.specials.push(card)
      let pool = []
      s.players.forEach((q) => { pool = pool.concat(q.hand); q.hand = [] })
      pool = shuffle(pool, rngOf(s))
      // redistribution équitable : chacun vers sa taille de main cible
      const order = s.players.map((_, i) => (pIdx + i) % s.players.length)
      let active = true
      while (pool.length > 0 && active) {
        active = false
        for (const qi of order) {
          if (pool.length === 0) break
          if (s.players[qi].hand.length < handTarget(s.players[qi])) {
            s.players[qi].hand.push(pool.pop())
            active = true
          }
        }
      }
      // s'il reste des cartes (mains inégales), distribution round-robin
      let k = 0
      while (pool.length > 0) {
        s.players[order[k % order.length]].hand.push(pool.pop())
        k++
      }
      log(s, `🌊 ${p.name} déclenche un Tsunami : toutes les mains sont redistribuées !`)
      return false
    }
    case 'vengeance':
      p.specials.push(card)
      s.pending = { type: 'vengeance' }
      return true
    case 'casino':
      p.specials.push(card)
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
  refillHand(s, pIdx)

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
      for (const c of s.river) toDiscard(s, c, null)
      s.river = []
      for (let i = 0; i < 3; i++) {
        const c = drawCard(s)
        if (c) s.river.push(c)
      }
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
  while (s.players[next].skipTurns > 0) {
    s.players[next].skipTurns -= 1
    log(s, `⏭️ ${s.players[next].name} passe son tour (${s.players[next].skipTurns} restant)`)
    next = (next + 1) % s.players.length
  }

  s.current = next
  s.phase = 'draw'
  s.playsRemaining = 1
  s.cardPlayed = false
  s.forced = null
  s.pending = null
  s.riverUsedThisTurn = false
  s.turnCount += 1
}

function gameOver(s) {
  // casino non résolu : le miseur récupère son salaire (avec son smile)
  if (s.casino?.stake) {
    const { card, by } = s.casino.stake
    addMoney(s.players[by], card)
    log(s, `🎰 Personne n’a relevé la mise : ${s.players[by].name} récupère son salaire`)
    s.casino.stake = null
  }
  // les mains restantes sont défaussées
  for (const p of s.players) {
    for (const c of p.hand) toDiscard(s, c, null)
    p.hand = []
  }
  log(s, `🏁 La pioche est vide : fin de partie !`)
  s.status = 'over'
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
      river: [],
      riverEnabled: river,
      riverIdle: 0,
      riverUsedThisTurn: false,
      current: 0,
      phase: 'draw',
      playsRemaining: 1,
      cardPlayed: false,  // une carte a-t-elle déjà été jouée ce tour ?
      forced: null,
      forcedConsumesPlay: false,
      pending: null,
      casino: null,
      log: [],
      turnCount: 1,       // n° du tour (augmente à chaque changement de tour)
    }
    // uid numérotés au hasard (un uid ne révèle pas la carte), puis paquet mélangé
    s.deck = shuffle(buildDeck(s.extensions, rngOf(s)), rngOf(s))
    for (const p of s.players) for (let i = 0; i < 5; i++) p.hand.push(s.deck.pop())
    if (s.riverEnabled) for (let i = 0; i < 3; i++) s.river.push(s.deck.pop())
    log(s, `🎉 La partie commence ! ${s.players.map((p) => p.name).join(', ')}`)
    return s
  }
}

export function gameReducer(prev, action) {
  if (action.type === 'START_GAME') return newGameState(action.names, action.colors, { seed: action.seed, extensions: action.extensions })

  // l'auteur de l'action doit être un joueur autorisé à agir maintenant
  if (!prev?.players || prev.status !== 'playing' || !canAct(prev, action.by)) return prev

  // Chercheur qui perd son métier : seule sa défausse est attendue
  if ((prev.pending?.type === 'chercheur-discard') !== (action.type === 'CHERCHEUR_DISCARD')) return prev

  const s = cloneState(prev)
  // p = joueur dont c'est le tour. Hors troc du Chef (étape opp-pick, où
  // l'adversaire choisit dans la main du Chef) et cadeaux d'Anniversaire (chaque
  // donateur offre son salaire), c'est aussi l'auteur de l'action.
  const p = s.players[s.current]

  switch (action.type) {
    // ----- PHASE DE PIOCHE ------------------------------------------------
    case 'DRAW_DECK': {
      if (s.phase !== 'draw') return prev
      const c = drawCard(s)
      if (c) p.hand.push(c)
      s.phase = 'play'
      return s
    }
    case 'TAKE_DISCARD': {
      if (s.phase !== 'draw' || !canTakeDiscardTop(s, s.current).ok) return prev
      const entry = s.discard.pop()
      s.forced = entry.card
      s.forcedConsumesPlay = true
      s.phase = 'play'
      log(s, `${p.name} prend ${entry.card.name} dans la défausse (à jouer immédiatement)`)
      return s
    }
    case 'TAKE_RIVER': {
      if (s.phase !== 'draw' || !s.riverEnabled) return prev
      const i = action.index
      if (i < 0 || i >= s.river.length) return prev
      if (action.playNow && !canTakeRiverNow(s, s.current, s.river[i])) return prev
      const card = s.river.splice(i, 1)[0]
      const repl = drawCard(s)
      if (repl) s.river.splice(i, 0, repl)
      s.riverUsedThisTurn = true
      s.phase = 'play'
      if (action.playNow) {
        s.forced = card
        s.forcedConsumesPlay = true
        log(s, `${p.name} prend ${card.name} dans la rivière (jouée immédiatement)`)
      } else {
        p.hand.push(card)
        log(s, `${p.name} prend une carte dans la rivière`)
      }
      return s
    }
    case 'RESIGN': {
      if (s.phase !== 'draw' || !jobOf(p)) return prev
      const interim = isInterim(p)
      log(s, `${p.name} démissionne de ${jobOf(p).name}${interim ? ' (Intérimaire : joue quand même)' : ' et passe son tour'}`)
      // Chercheur : le tour ne se termine qu'après le choix de la carte défaussée
      const choosing = loseJob(s, s.current, 'discard', interim ? 'none' : 'end-turn')
      if (!interim && !choosing) endTurn(s)
      return s
    }
    case 'DIVORCE_VOLUNTARY': {
      if (s.phase !== 'draw' || !marriageOf(p)) return prev
      toDiscard(s, removeMarriage(p, marriageOf(p).uid), s.current)
      if (adulteryOf(p)) {
        toDiscard(s, removeAdultery(p, adulteryOf(p).uid), s.current)
        log(s, `${p.name} divorce volontairement (adultère défaussé, enfants et flirts conservés) et passe son tour`)
      } else {
        log(s, `${p.name} divorce volontairement (enfants conservés) et passe son tour`)
      }
      endTurn(s)
      return s
    }
    case 'STOP_ADULTERY': {
      if (!canStopAdultery(s, s.current).ok) return prev
      toDiscard(s, removeAdultery(p, adulteryOf(p).uid), s.current)
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
      if (!fromForced) removeFromHand(p, card.uid)
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
      if (!fromForced) removeFromHand(p, card.uid)
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
      if (!fromForced) removeFromHand(p, card.uid)
      toDiscard(s, card, s.current)
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
      if (!fromForced) removeFromHand(p, card.uid)
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
        addMoney(s.players[winnerIdx], first.card)
        addMoney(s.players[winnerIdx], card)
        s.casino.stake = null
      }
      consumePlay(s, fromForced)
      finishPlay(s)
      return s
    }
    case 'END_PLAYS': {
      // bouton "Terminer" pendant un Arc-en-ciel
      if (s.phase !== 'play' || s.pending || s.forced || s.playsRemaining <= 1) return prev
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
        const unspent = unspentMoney(p)
        for (const su of action.salaryUids || []) {
          const sal = unspent.find((c) => c.uid === su)
          if (sal && !chosen.includes(sal)) chosen.push(sal)
        }
        const heritage = action.useHeritage && p.heritage > 0 ? p.heritage : 0
        // pas de salaire superflu : impossible de sur-investir pour échapper à l'Impôt
        if (!validatePayment(cost, chosen.map((c) => c.level), heritage).ok) return prev
        const paid = chosen.reduce((t, c) => t + c.level, 0) + heritage
        // les salaires passent sous l'acquisition qu'ils ont payée
        for (const sal of chosen) investMoney(p, sal.uid, card.uid)
        if (heritage > 0) {
          p.heritage = 0
          // l'Héritage (tout ou rien) passe sous l'acquisition, avec les salaires
          for (const c of p.specials) if (c.key === 'heritage' && !p.heritageFor[c.uid]) p.heritageFor[c.uid] = card.uid
        }
        log(s, `${p.name} achète ${card.name} pour ${cost} liasses (${paid} investies${paid > cost ? ' — pas de monnaie !' : ''})`)
      } else {
        p.architectFreeUsed = true
        log(s, `🏠 ${p.name} (Architecte) obtient ${card.name} gratuitement !`)
      }
      const wasForced = s.pending.fromForced
      p.acquisitions.push(card)
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
        p.hand.push(s.pending.card)
        s.pending = null
      }
      return s
    }
    case 'CHANCE_PICK': {
      if (s.pending?.type !== 'chance') return prev
      const cards = s.pending.cards
      const kept = cards.find((c) => c.uid === action.uid)
      if (!kept) return prev
      for (const c of cards) if (c.uid !== kept.uid) toDiscard(s, c, s.current)
      // la carte gardée rejoint la main : le joueur joue ensuite ce qu'il veut
      p.hand.push(kept)
      s.pending = null
      log(s, `🍀 ${p.name} garde une carte en main et défausse les deux autres`)
      finishPlay(s)
      return s
    }
    case 'DISCARD_PICK': {
      // Étoile filante / Astronaute : prendre une carte de la défausse et la jouer
      if (s.pending?.type !== 'discard-pick') return prev
      const i = s.discard.findIndex((e) => e.card.uid === action.uid)
      if (i < 0 || !isPlayableFromDiscard(s, s.current, s.discard[i].card)) return prev
      const entry = s.discard.splice(i, 1)[0]
      s.pending = null
      s.forced = entry.card
      s.forcedConsumesPlay = false
      log(s, `${p.name} récupère ${entry.card.name} dans la défausse`)
      return s
    }
    case 'PISTON_PICK': {
      if (s.pending?.type !== 'piston') return prev
      const card = p.hand.find((c) => c.uid === action.uid)
      if (!card || card.type !== 'job' || isGrandProf(card)) return prev
      if (hasTag(card, 'outlaw') && s.players.some((q) => hasJob(q, 'policier'))) return prev
      if (jobOf(p)) return prev
      removeFromHand(p, card.uid)
      addJob(p, card)
      if (card.key === 'bandit') p.wasBandit = true
      log(s, `🤝 Grâce au Piston, ${p.name} devient ${card.name} sans les études !`)
      s.pending = null
      // "repiochez pour avoir 5 cartes"
      refillHand(s, s.current)
      // le métier pistonné déclenche aussi son avantage instantané
      triggerJobApi(s, s.current, card)
      // Policier pistonné : purge les Bandits et Gourous
      if (card.key === 'policier') {
        s.players.forEach((q, qi) => {
          if (qi !== s.current && hasTag(jobOf(q), 'outlaw')) {
            log(s, `👮 Le Policier fait défausser le ${jobOf(q).name} de ${q.name}`, 'malus')
            loseJob(s, qi)
          }
        })
      }
      finishPlay(s)
      return s
    }
    case 'TROC_PICK': {
      if (s.pending?.type !== 'troc') return prev
      const t = s.players[action.target]
      if (!t || action.target === s.current || t.hand.length === 0) return prev
      const mine = pick(s, p.hand)
      const theirs = pick(s, t.hand)
      if (mine) removeFromHand(p, mine.uid)
      if (theirs) removeFromHand(t, theirs.uid)
      if (theirs) p.hand.push(theirs)
      if (mine) t.hand.push(mine)
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
      const mine = removeFromHand(p, s.pending.oppPickedUid)
      removeFromHand(t, theirs.uid)
      if (mine) t.hand.push(mine)
      p.hand.push(theirs)
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
      takeMalus(p, malus.uid)
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
        removeFromHand(p, card.uid)
        s.casino.stake = { card, by: s.current }
        log(s, `🎰 ${p.name} mise immédiatement un salaire (et repioche)`)
        const repl = drawCard(s)
        if (repl) p.hand.push(repl)
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
        ? lowestUnusedSalary(donor)
        : unspentMoney(donor).find((c) => c.uid === action.uid)
      if (!gift) return prev
      // nouvel objet : cloneState ne copie pas le pending
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
      removeFromHand(q, card.uid)
      toDiscard(s, card, pend.player)
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
