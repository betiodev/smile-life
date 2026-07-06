// ---------------------------------------------------------------------------
// Smile Life — reducer principal (machine à états du jeu)
// SETUP → TURN_TRANSITION → DRAW_PHASE → PLAY_PHASE → CHECK → ... → GAME_OVER
// ---------------------------------------------------------------------------
import { buildDeck, shuffle } from '../data/cards.js'
import {
  canPoseSelf, canPlayMalus, canPlaySpecial, isPlayableFromDiscard,
  canTakeDiscardTop, hasJob, isProf, isInterim, handTarget, houseCost,
  availableLiasses,
} from './rules.js'

// --- helpers ---------------------------------------------------------------

function makePlayer(name) {
  return {
    name,
    hand: [],
    studies: [],
    job: null,
    salaries: [],       // [{ card, invested }]
    flirts: [],         // dernier élément = dessus de la pile
    marriage: null,
    adultery: null,
    children: [],
    acquisitions: [],
    distinctions: [],   // [{ card, active }]
    specials: [],       // cartes spéciales utilisées (retournées)
    malusKept: [],      // malus reçus (retournés)
    skipTurns: 0,
    wasBandit: false,
    didAttentat: false,
    heritage: 0,        // liasses d'héritage disponibles
    architectFreeUsed: false,
  }
}

// clone superficiel profond-suffisant : on clone les joueurs et les listes
function cloneState(state) {
  return {
    ...state,
    deck: [...state.deck],
    discard: [...state.discard],
    river: [...state.river],
    log: [...state.log],
    players: state.players.map((p) => ({
      ...p,
      hand: [...p.hand],
      studies: [...p.studies],
      salaries: p.salaries.map((s) => ({ ...s })),
      flirts: [...p.flirts],
      children: [...p.children],
      acquisitions: [...p.acquisitions],
      distinctions: p.distinctions.map((d) => ({ ...d })),
      specials: [...p.specials],
      malusKept: [...p.malusKept],
    })),
    casino: state.casino ? { ...state.casino, stake: state.casino.stake ? { ...state.casino.stake } : null } : null,
  }
}

let logId = 0
function log(s, text, kind = 'info') {
  s.log.push({ id: ++logId, text, kind })
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
function loseJob(s, pIdx, destination = 'discard') {
  const p = s.players[pIdx]
  if (!p.job) return
  const job = p.job
  p.job = null
  p.architectFreeUsed = false
  // Grand Prix : retourné mais conserve ses smiles
  for (const d of p.distinctions) {
    if (d.card.key === 'grandprix' && d.active) {
      d.active = false
      log(s, `Le Grand Prix de ${p.name} est retourné (smiles conservés)`)
    }
  }
  // Chercheur : défausse 1 carte en plus (main 6 → 5)
  if (job.key === 'chercheur' && p.hand.length > 0) {
    const i = Math.floor(Math.random() * p.hand.length)
    const extra = p.hand.splice(i, 1)[0]
    toDiscard(s, extra, pIdx)
    log(s, `${p.name} (Chercheur) défausse 1 carte en plus`)
  }
  if (destination === 'discard') toDiscard(s, job, null)
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
      t.malusKept.push(card)
      log(s, `${a.name} inflige ${card.name} à ${t.name} : passe 1 tour`, 'malus')
      break
    case 'licenciement':
      log(s, `${a.name} licencie ${t.name} (${t.job.name})`, 'malus')
      loseJob(s, targetIdx)
      t.malusKept.push(card)
      break
    case 'impot': {
      for (let i = t.salaries.length - 1; i >= 0; i--) {
        if (!t.salaries[i].invested) {
          const [sal] = t.salaries.splice(i, 1)
          toDiscard(s, sal.card, null)
          log(s, `${a.name} impose ${t.name} : salaire niveau ${sal.card.level} défaussé`, 'malus')
          break
        }
      }
      t.malusKept.push(card)
      break
    }
    case 'divorce': {
      toDiscard(s, t.marriage, null)
      t.marriage = null
      if (t.adultery) {
        toDiscard(s, t.adultery, null)
        t.adultery = null
        for (const child of t.children) toDiscard(s, child, null)
        t.children = []
        log(s, `${a.name} divorce ${t.name} en plein adultère : mariage, adultère et enfants perdus !`, 'malus')
      } else {
        log(s, `${a.name} inflige un Divorce à ${t.name} (enfants conservés)`, 'malus')
      }
      t.malusKept.push(card)
      break
    }
    case 'redoublement': {
      const study = t.studies.pop()
      if (study) toDiscard(s, study, null)
      t.malusKept.push(card)
      log(s, `${a.name} fait redoubler ${t.name} : 1 carte études défaussée`, 'malus')
      break
    }
    case 'prison':
      t.skipTurns += 3
      log(s, `${a.name} envoie ${t.name} en Prison : passe 3 tours, le Bandit est défaussé`, 'malus')
      loseJob(s, targetIdx)
      toDiscard(s, card, null)
      break
    case 'attentat': {
      for (const child of a.children) s.removed.push(child)
      for (const child of t.children) s.removed.push(child)
      const na = a.children.length, nt = t.children.length
      a.children = []
      t.children = []
      a.didAttentat = true
      s.removed.push(card)
      log(s, `💥 ${a.name} commet un Attentat contre ${t.name} : ${na + nt} enfant(s) retirés du jeu`, 'malus')
      break
    }
  }
}

// ---------------------------------------------------------------------------
// Pose d'une carte devant soi (placement + effets)
// Retourne true si la pose crée un état "pending" (choix à faire)
// ---------------------------------------------------------------------------
function poseSelf(s, pIdx, card) {
  const p = s.players[pIdx]
  switch (card.type) {
    case 'study':
      p.studies.push(card)
      log(s, `${p.name} pose ${card.name} (niveau ${p.studies.reduce((t, c) => t + c.levels, 0)}/6)`)
      break

    case 'job': {
      if (card.isGrandProf) {
        // promotion : le Prof est défaussé
        toDiscard(s, p.job, null)
        p.job = card
        log(s, `${p.name} est promu Grand Prof !`)
        break
      }
      p.job = card
      if (card.key === 'bandit') p.wasBandit = true
      log(s, `${p.name} devient ${card.name}`)
      // Policier : purge les Bandits et Gourous déjà posés
      if (card.key === 'policier') {
        s.players.forEach((q, qi) => {
          if (qi !== pIdx && (hasJob(q, 'bandit') || hasJob(q, 'gourou'))) {
            log(s, `👮 Le Policier fait défausser le ${q.job.name} de ${q.name}`, 'malus')
            loseJob(s, qi)
          }
        })
      }
      // Avantages instantanés (API)
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
      break
    }

    case 'salary':
      p.salaries.push({ card, invested: false })
      log(s, `${p.name} pose un salaire niveau ${card.level}`)
      break

    case 'flirt': {
      p.flirts.push(card)
      log(s, `${p.name} flirte ${card.name} ${card.emoji}`)
      // Vol de flirt : même lieu que le flirt du DESSUS d'un adversaire
      s.players.forEach((q, qi) => {
        if (qi === pIdx) return
        const top = q.flirts[q.flirts.length - 1]
        if (top && top.place === card.place) {
          q.flirts.pop()
          p.flirts.push(top)
          log(s, `💘 ${p.name} vole le flirt ${top.name} de ${q.name} !`, 'malus')
        }
      })
      break
    }

    case 'marriage':
      p.marriage = card
      log(s, `💒 ${p.name} se marie à ${card.name} !`)
      break

    case 'adultery':
      p.adultery = card
      log(s, `😏 ${p.name} commence un adultère...`)
      break

    case 'child':
      p.children.push(card)
      log(s, `👶 ${p.name} accueille ${card.name} !`)
      break

    case 'acquisition': {
      if (card.acqType === 'animal') {
        p.acquisitions.push(card)
        log(s, `${p.name} adopte ${card.name} ${card.emoji || ''}`)
        break
      }
      if (card.acqType === 'travel' && hasJob(p, 'pilote')) {
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

// ---------------------------------------------------------------------------
// Cartes spéciales — retourne true si un "pending" est créé
// ---------------------------------------------------------------------------
function applySpecial(s, pIdx, card) {
  const p = s.players[pIdx]
  switch (card.key) {
    case 'anniversaire': {
      p.specials.push(card)
      let gifts = 0
      s.players.forEach((q, qi) => {
        if (qi === pIdx) return
        // le donateur donne rationnellement son plus petit salaire non investi
        let best = -1
        q.salaries.forEach((sal, i) => {
          if (!sal.invested && (best === -1 || sal.card.level < q.salaries[best].card.level)) best = i
        })
        if (best >= 0) {
          const [sal] = q.salaries.splice(best, 1)
          p.salaries.push(sal)
          gifts++
          log(s, `🎂 ${q.name} offre un salaire niveau ${sal.card.level} à ${p.name}`)
        } else {
          log(s, `🎂 ${q.name} n’a aucun salaire à offrir`)
        }
      })
      if (gifts === 0) log(s, `🎂 Triste anniversaire pour ${p.name}...`)
      return false
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
      log(s, `🍀 ${p.name} joue Chance : pioche ${cards.length} cartes, en garde une`)
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
      pool = shuffle(pool)
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
  s.forced = null
  s.pending = null
  s.riverUsedThisTurn = false
  s.screen = 'transition'
}

function gameOver(s) {
  // casino non résolu : le miseur récupère son salaire (avec son smile)
  if (s.casino?.stake) {
    const { card, by } = s.casino.stake
    s.players[by].salaries.push({ card, invested: false })
    log(s, `🎰 Personne n’a relevé la mise : ${s.players[by].name} récupère son salaire`)
    s.casino.stake = null
  }
  // les mains restantes sont défaussées
  for (const p of s.players) {
    for (const c of p.hand) toDiscard(s, c, null)
    p.hand = []
  }
  log(s, `🏁 La pioche est vide : fin de partie !`)
  s.screen = 'gameover'
}

// Consommation d'un jeu de carte (forcé ou non)
function consumePlay(s, wasForced) {
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
export const initialState = { screen: 'setup', log: [] }

export function gameReducer(prev, action) {
  if (action.type === 'START_GAME') {
    const s = {
      screen: 'transition',
      players: action.names.map(makePlayer),
      deck: shuffle(buildDeck()),
      discard: [],
      removed: [],
      river: [],
      riverEnabled: action.river,
      riverIdle: 0,
      riverUsedThisTurn: false,
      current: 0,
      phase: 'draw',
      playsRemaining: 1,
      forced: null,
      forcedConsumesPlay: false,
      pending: null,
      casino: null,
      log: [],
      turnCount: 1,
    }
    for (const p of s.players) for (let i = 0; i < 5; i++) p.hand.push(s.deck.pop())
    if (s.riverEnabled) for (let i = 0; i < 3; i++) s.river.push(s.deck.pop())
    log(s, `🎉 La partie commence ! ${s.players.map((p) => p.name).join(', ')}`)
    return s
  }
  if (action.type === 'RESTART') return { screen: 'setup', log: [] }

  const s = cloneState(prev)
  const p = s.players[s.current]

  switch (action.type) {
    case 'READY':
      s.screen = 'game'
      return s

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
      if (action.playNow && !isPlayableFromDiscard(s, s.current, s.river[i])) return prev
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
      if (s.phase !== 'draw' || !p.job) return prev
      const interim = isInterim(p)
      log(s, `${p.name} démissionne de ${p.job.name}${interim ? ' (Intérimaire : joue quand même)' : ' et passe son tour'}`)
      loseJob(s, s.current)
      if (!interim) endTurn(s)
      return s
    }
    case 'DIVORCE_VOLUNTARY': {
      if (s.phase !== 'draw' || !p.marriage) return prev
      toDiscard(s, p.marriage, null)
      p.marriage = null
      if (p.adultery) {
        toDiscard(s, p.adultery, null)
        p.adultery = null
        log(s, `${p.name} divorce volontairement (adultère défaussé, enfants et flirts conservés) et passe son tour`)
      } else {
        log(s, `${p.name} divorce volontairement (enfants conservés) et passe son tour`)
      }
      endTurn(s)
      return s
    }
    case 'STOP_ADULTERY': {
      if (!p.adultery) return prev
      toDiscard(s, p.adultery, null)
      p.adultery = null
      log(s, `${p.name} met fin à son adultère (flirts conservés)`)
      return s
    }

    // ----- PHASE DE JEU -----------------------------------------------------
    case 'PLAY_SELF': {
      if (s.phase !== 'play' || s.pending) return prev
      const fromForced = s.forced?.uid === action.uid
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
      // jouer un salaire de sa main comme mise au casino
      if (s.phase !== 'play' || s.pending || !s.casino) return prev
      const card = p.hand.find((c) => c.uid === action.uid)
      if (!card || card.type !== 'salary') return prev
      if (s.casino.stake && s.casino.stake.by === s.current) return prev
      removeFromHand(p, card.uid)
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
        s.players[winnerIdx].salaries.push({ card: first.card, invested: false })
        s.players[winnerIdx].salaries.push({ card, invested: false })
        s.casino.stake = null
      }
      s.playsRemaining -= 1
      finishPlay(s)
      return s
    }
    case 'END_PLAYS': {
      // bouton "Terminer" pendant un Arc-en-ciel
      if (s.phase !== 'play' || s.pending || s.forced) return prev
      s.playsRemaining = 0
      endTurn(s)
      return s
    }

    // ----- RÉSOLUTIONS DES PENDINGS ---------------------------------------
    case 'PURCHASE_CONFIRM': {
      if (s.pending?.type !== 'purchase') return prev
      const card = s.pending.card
      const isFree = card.acqType === 'house' && hasJob(p, 'architecte') && !p.architectFreeUsed && action.useArchitect
      const cost = card.acqType === 'house' ? houseCost(p, card) : card.cost
      if (!isFree) {
        let paid = 0
        const chosen = []
        for (const su of action.salaryUids || []) {
          const sal = p.salaries.find((x) => x.card.uid === su && !x.invested)
          if (sal) { chosen.push(sal); paid += sal.card.level }
        }
        if (action.useHeritage && p.heritage > 0) paid += p.heritage
        if (paid < cost) return prev
        for (const sal of chosen) sal.invested = true
        if (action.useHeritage) p.heritage = 0
        log(s, `${p.name} achète ${card.name} pour ${cost} liasses (${paid} investies — pas de monnaie !)`)
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
      s.pending = null
      s.forced = kept
      s.forcedConsumesPlay = false
      log(s, `🍀 ${p.name} garde une carte et défausse les deux autres`)
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
      if (!card || card.type !== 'job' || card.isGrandProf) return prev
      if ((card.key === 'bandit' || card.key === 'gourou') && s.players.some((q) => hasJob(q, 'policier'))) return prev
      if (p.job) return prev
      removeFromHand(p, card.uid)
      p.job = card
      if (card.key === 'bandit') p.wasBandit = true
      log(s, `🤝 Grâce au Piston, ${p.name} devient ${card.name} sans les études !`)
      s.pending = null
      // "repiochez pour avoir 5 cartes"
      refillHand(s, s.current)
      finishPlay(s)
      return s
    }
    case 'TROC_PICK': {
      if (s.pending?.type !== 'troc') return prev
      const t = s.players[action.target]
      if (!t || action.target === s.current || t.hand.length === 0) return prev
      // Chef des achats/ventes : protège sa meilleure carte (heuristique : plus de smiles)
      const pickFrom = (player) => {
        let pool = player.hand
        if (hasJob(player, 'chef_achats') || hasJob(player, 'chef_ventes')) {
          const best = [...player.hand].sort((a, b) => b.smiles - a.smiles)[0]
          if (player.hand.length > 1) {
            pool = player.hand.filter((c) => c.uid !== best.uid)
            log(s, `🛡️ ${player.name} (${player.job.name}) protège 1 carte du Troc`)
          }
        }
        return pool[Math.floor(Math.random() * pool.length)]
      }
      const mine = pickFrom(p)
      const theirs = pickFrom(t)
      if (mine) removeFromHand(p, mine.uid)
      if (theirs) removeFromHand(t, theirs.uid)
      if (theirs) p.hand.push(theirs)
      if (mine) t.hand.push(mine)
      log(s, `🔄 ${p.name} troque une carte au hasard avec ${t.name}`)
      s.pending = null
      finishPlay(s)
      return s
    }
    case 'VENGEANCE_PICK': {
      if (s.pending?.type !== 'vengeance') return prev
      const i = p.malusKept.findIndex((c) => c.uid === action.uid)
      if (i < 0) return prev
      const malus = p.malusKept[i]
      if (!canPlayMalus(s, s.current, malus, action.target).ok) return prev
      p.malusKept.splice(i, 1)
      log(s, `😈 ${p.name} se venge avec ${malus.name} !`)
      applyMalus(s, s.current, malus, action.target)
      s.pending = null
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
