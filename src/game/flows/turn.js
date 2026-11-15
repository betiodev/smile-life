// ---------------------------------------------------------------------------
// Smile Life — le flux du tour (ARCHITECTURE.md §6.4)
// Toujours tout en bas de la pile (state.stack[0]). Le joueur du tour est
// state.current. Étapes :
//   start  début du tour (beginTurn) : jeux remis à 1, événement turnStart
//   draw   ATTENTE : piocher (pioche, défausse, rivière) ou, à la place,
//          démissionner / divorcer (dans le jeu de base, les options « au lieu
//          de piocher » sont proposées dans la même attente que la pioche)
//   play   ATTENTE : jouer une carte (ou plusieurs : Arc-en-ciel), ou défausser.
//          data.forced : carte forcée à jouer d'abord (prise dans la défausse
//          ou la rivière, Étoile filante, Astronaute)
//   end    fin du tour (endTurn) : main complétée, turnEnd, fin de partie.
//          Comme étape rangée dans le cadre : seulement quand la fin du tour
//          attend un choix posé au-dessus (Chercheur qui démissionne)
//   next   joueur suivant, en consommant les tours passés, roundEnd
// start, end et next n'attendent personne : ce sont des fonctions, pas des
// étapes rangées dans la pile.
//
// data = { plays, rainbow, cardPlayed, forced: null | { card, consumesPlay },
//          riverUsed }
// ---------------------------------------------------------------------------
import { draw, refill, take, takeAll, put, place, remove, loseJob, log, tickTimers, clearSight } from '../primitives.js'
import { emit } from '../events.js'
import {
  canPlace, canTarget, canTakeDiscardTop, canTakeRiverNow, canStopAdultery, canEndPlays, isInterim,
  canDiscardFromHand, drawMode, nextPlayer,
} from '../rules.js'
import {
  jobOf, isMarried, marriageOf, adulteryOf, turnFrame, topFrame, forcedOf, canStake, moneyValue,
} from '../state.js'
import { poseSelf, applyMalus } from '../effects.js'

const range = (n) => Array.from({ length: n }, (_, i) => i)
const copy = (x) => JSON.parse(JSON.stringify(x))
const dataOf = (s) => turnFrame(s).data

// ===========================================================================
// Aides du tour (utilisées par les effets et les autres flux)
// ===========================================================================

// un jeu de plus ce tour (Chance : n'use pas le jeu ; Arc-en-ciel : +3)
export function addPlays(s, n) { dataOf(s).plays += n }
// Arc-en-ciel : le joueur peut terminer son tour quand il veut
export function startRainbow(s) { dataOf(s).rainbow = true }
// une carte doit être jouée d'abord. consumesPlay : c'est le jeu du tour
// (prise dans la défausse / la rivière) ; sinon elle est en plus (Étoile filante)
export function setForced(s, card, consumesPlay) { dataOf(s).forced = { card, consumesPlay } }

// Consommation d'un jeu de carte (forcée ou non)
export function consumePlay(s, wasForced) {
  const d = dataOf(s)
  d.cardPlayed = true
  if (wasForced) {
    if (d.forced?.consumesPlay) d.plays -= 1
    d.forced = null
  } else {
    d.plays -= 1
  }
}

// appelé après chaque résolution de jeu : continue, ou termine le tour
// (un choix posé au-dessus du tour, ou une carte forcée : on attend)
export function finishPlay(s) {
  if (topFrame(s) !== turnFrame(s) || forcedOf(s)) return
  if (dataOf(s).plays > 0) return
  endTurn(s)
}

// étape start : nouveau cadre de tour pour state.current, tout en bas de la
// pile. Les cadres posés au-dessus pendant la fin du tour précédent (une carte
// jouée d'office en complétant une main) restent : ils se règlent d'abord.
// Les regards « jusqu'à la fin du tour » (state.sight) sont finis.
export function beginTurn(s) {
  const above = ['turn', 'setup'].includes(s.stack[0]?.flow) ? s.stack.slice(1) : s.stack
  s.stack = [turn.start(s), ...above]
  clearSight(s, 'turn')
  emit(s, 'turnStart', { player: s.current })
}

// étapes end puis next
export function endTurn(s) {
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
    if (dataOf(s).riverUsed) s.riverIdle = 0
    else s.riverIdle += 1
    if (s.riverIdle >= s.players.length) {
      for (const c of takeAll(s, 'river')) put(s, c, 'discard')
      draw(s, null, { count: 3, to: 'river', fill: true })
      s.riverIdle = 0
      log(s, `🌊 La rivière est renouvelée`)
      if (s.deck.length === 0) {
        gameOver(s)
        return
      }
    }
  }

  // tour de plus (« rejouez », un tour entier) : le même joueur rejoue, sans
  // faire avancer la table
  const me = s.players[pIdx]
  if (me.extraTurns > 0) {
    me.extraTurns -= 1
    log(s, `🔁 ${me.name} rejoue un tour`)
    s.turnCount += 1
    beginTurn(s)
    return
  }

  // next : joueur suivant (question nextPlayer, dans le sens du jeu), en
  // consommant les tours passés. Chaque siège par lequel passe le tour (joué
  // ou passé) décompte ses cartes à durée. Le tour de table est fini quand le
  // tour revient au premier joueur (siège 0).
  let next = nextPlayer(s, pIdx)
  let wrapped = next === 0
  tickTimers(s, next)
  while (s.players[next].skipTurns > 0) {
    s.players[next].skipTurns -= 1
    log(s, `⏭️ ${s.players[next].name} passe son tour (${s.players[next].skipTurns} restant)`)
    next = nextPlayer(s, next)
    if (next === 0) wrapped = true
    tickTimers(s, next)
  }
  if (wrapped) emit(s, 'roundEnd')

  s.current = next
  s.turnCount += 1
  beginTurn(s)
}

export function gameOver(s) {
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
  s.stack = []
  emit(s, 'gameEnd')
}

// ===========================================================================
// Actions permises
// ===========================================================================

// une carte jouée (main ou carte forcée) : pose devant soi, ou malus sur chaque cible valide
export function playsOf(state, me, card) {
  if (card.type === 'malus')
    return range(state.players.length)
      .filter((i) => i !== me && canTarget(state, me, card, i).ok)
      .map((i) => ({ type: 'PLAY_MALUS', uid: card.uid, target: i }))
  return canPlace(state, me, card).ok ? [{ type: 'PLAY_SELF', uid: card.uid }] : []
}

function drawActions(state) {
  const me = state.current
  const p = state.players[me]
  // façon de piocher (question drawMode) : 'none' → on passe la pioche
  const mode = drawMode(state, me)
  if (mode === 'none') {
    const out = [{ type: 'SKIP_DRAW' }]
    if (jobOf(p)) out.push({ type: 'RESIGN' })
    if (isMarried(p)) out.push({ type: 'DIVORCE_VOLUNTARY' })
    return out
  }
  const out = [{ type: 'DRAW_DECK' }]
  if (mode !== 'noDiscard' && canTakeDiscardTop(state, me).ok) out.push({ type: 'TAKE_DISCARD' })
  if (state.riverEnabled)
    state.river.forEach((c, index) => {
      out.push({ type: 'TAKE_RIVER', index, playNow: false })
      if (canTakeRiverNow(state, me, c)) out.push({ type: 'TAKE_RIVER', index, playNow: true })
    })
  if (jobOf(p)) out.push({ type: 'RESIGN' })
  if (isMarried(p)) out.push({ type: 'DIVORCE_VOLUNTARY' })
  return out
}

function playActions(state, frame) {
  const me = state.current
  const p = state.players[me]
  const { forced } = frame.data
  // carte forcée : elle seule peut être jouée ; défaussable seulement si elle
  // ne consomme pas le jeu (un salaire forcé peut aussi être misé au Casino)
  const casinoOpen = state.casino && (!state.casino.stake || state.casino.stake.by !== me)
  if (forced) {
    const c = forced.card
    const out = playsOf(state, me, c)
    if (canStake(c) && casinoOpen) out.push({ type: 'CASINO_BET', uid: c.uid })
    if (canDiscardFromHand(state, me, c).ok) out.push({ type: 'DISCARD_CARD', uid: c.uid })
    return out
  }
  const out = []
  for (const c of p.hand) {
    out.push(...playsOf(state, me, c))
    if (canStake(c) && casinoOpen) out.push({ type: 'CASINO_BET', uid: c.uid })
    // (question canDiscard : une carte qui ne peut pas quitter la main)
    if (canDiscardFromHand(state, me, c).ok) out.push({ type: 'DISCARD_CARD', uid: c.uid })
  }
  // Arc-en-ciel : on peut s'arrêter avant d'avoir joué toutes ses cartes
  if (canEndPlays(state)) out.push({ type: 'END_PLAYS' })
  return out
}

// ===========================================================================
// Actions du tour
// ===========================================================================

// la carte jouée : la carte forcée, ou une carte de la main → { card, fromForced } ou null
function playedCard(s, frame, uid) {
  const forced = frame.data.forced
  const fromForced = forced?.card.uid === uid
  // une carte forcée attend : elle seule peut être jouée
  if (forced && !fromForced) return null
  const card = fromForced ? forced.card : s.players[s.current].hand.find((c) => c.uid === uid)
  return card ? { card, fromForced } : null
}

// → false si l'action est refusée
function apply(s, frame, action) {
  const p = s.players[s.current]
  const d = frame.data
  switch (action.type) {
    // ----- étape draw --------------------------------------------------------
    case 'DRAW_DECK': {
      if (frame.step !== 'draw' || drawMode(s, s.current) === 'none') return false
      draw(s, s.current)
      frame.step = 'play'
      return true
    }
    case 'SKIP_DRAW': {
      // pas de pioche ce tour (drawMode 'none') : on passe à l'étape play
      if (frame.step !== 'draw' || drawMode(s, s.current) !== 'none') return false
      frame.step = 'play'
      log(s, `${p.name} ne pioche pas ce tour`)
      return true
    }
    case 'TAKE_DISCARD': {
      if (frame.step !== 'draw' || !canTakeDiscardTop(s, s.current).ok) return false
      if (['none', 'noDiscard'].includes(drawMode(s, s.current))) return false
      const card = take(s, 'discard', s.discard.at(-1).card.uid)
      setForced(s, card, true)
      frame.step = 'play'
      log(s, `${p.name} prend ${card.name} dans la défausse (à jouer immédiatement)`)
      return true
    }
    case 'TAKE_RIVER': {
      if (frame.step !== 'draw' || !s.riverEnabled || drawMode(s, s.current) === 'none') return false
      const i = action.index
      if (i < 0 || i >= s.river.length) return false
      if (action.playNow && !canTakeRiverNow(s, s.current, s.river[i])) return false
      const card = take(s, 'river', s.river[i].uid)
      draw(s, null, { to: 'river', at: i, fill: true })
      d.riverUsed = true
      frame.step = 'play'
      if (action.playNow) {
        setForced(s, card, true)
        log(s, `${p.name} prend ${card.name} dans la rivière (jouée immédiatement)`)
      } else {
        put(s, card, { hand: s.current })
        log(s, `${p.name} prend une carte dans la rivière`)
      }
      return true
    }
    case 'RESIGN': {
      if (frame.step !== 'draw' || !jobOf(p)) return false
      const interim = isInterim(p)
      log(s, `${p.name} démissionne de ${jobOf(p).name}${interim ? ' (Intérimaire : joue quand même)' : ' et passe son tour'}`)
      // il passe son tour ; un Chercheur choisit d'abord la carte qu'il
      // défausse en plus (flux posé au-dessus) : le tour attend à l'étape end
      if (!interim) frame.step = 'end'
      loseJob(s, s.current, { cause: 'demission', by: s.current })
      if (!interim && topFrame(s) === frame) endTurn(s)
      return true
    }
    case 'DIVORCE_VOLUNTARY': {
      if (frame.step !== 'draw' || !marriageOf(p)) return false
      remove(s, marriageOf(p).uid, { cause: 'divorce', by: s.current })
      if (adulteryOf(p)) {
        remove(s, adulteryOf(p).uid, { cause: 'divorce', by: s.current })
        log(s, `${p.name} divorce volontairement (adultère défaussé, enfants et flirts conservés) et passe son tour`)
      } else {
        log(s, `${p.name} divorce volontairement (enfants conservés) et passe son tour`)
      }
      endTurn(s)
      return true
    }
    case 'STOP_ADULTERY': {
      if (!canStopAdultery(s, s.current).ok) return false
      remove(s, adulteryOf(p).uid, { cause: 'fin-adultere', by: s.current })
      log(s, `${p.name} met fin à son adultère (flirts conservés)`)
      return true
    }

    // ----- étape play --------------------------------------------------------
    case 'PLAY_SELF': {
      if (frame.step !== 'play') return false
      const played = playedCard(s, frame, action.uid)
      if (!played || !canPlace(s, s.current, played.card).ok) return false
      const { card, fromForced } = played
      if (!fromForced) take(s, { hand: s.current }, card.uid)
      poseSelf(s, s.current, card, { fromForced })
      // achat : la pose n'est effective qu'après le paiement (resume plus bas).
      // Les autres choix (Chance, Piston…) viennent après la pose : le jeu est
      // consommé tout de suite, le tour reprend quand le choix est fini
      if (topFrame(s).flow === 'purchase') return true
      consumePlay(s, fromForced)
      finishPlay(s)
      return true
    }
    case 'PLAY_MALUS': {
      if (frame.step !== 'play') return false
      const played = playedCard(s, frame, action.uid)
      if (!played || played.card.type !== 'malus') return false
      if (!canTarget(s, s.current, played.card, action.target).ok) return false
      if (!played.fromForced) take(s, { hand: s.current }, played.card.uid)
      applyMalus(s, s.current, played.card, action.target)
      consumePlay(s, played.fromForced)
      finishPlay(s)
      return true
    }
    case 'DISCARD_CARD': {
      if (frame.step !== 'play') return false
      const played = playedCard(s, frame, action.uid)
      // une carte prise dans la défausse ou la rivière doit être réellement
      // jouée ; une carte peut ne pas pouvoir quitter la main (question canDiscard)
      if (!played || !canDiscardFromHand(s, s.current, played.card).ok) return false
      if (!played.fromForced) take(s, { hand: s.current }, played.card.uid)
      put(s, played.card, 'discard', { by: s.current })
      log(s, `${p.name} défausse une carte`)
      consumePlay(s, played.fromForced)
      finishPlay(s)
      return true
    }
    case 'CASINO_BET': {
      // jouer un salaire comme mise au casino : de sa main, ou le salaire forcé
      // (pris dans la défausse : la mise compte comme le jouer)
      if (frame.step !== 'play' || !s.casino) return false
      const played = playedCard(s, frame, action.uid)
      if (!played || !canStake(played.card)) return false
      if (s.casino.stake && s.casino.stake.by === s.current) return false
      const { card, fromForced } = played
      if (!fromForced) take(s, { hand: s.current }, card.uid)
      if (!s.casino.stake) {
        s.casino.stake = { card, by: s.current }
        log(s, `🎰 ${p.name} mise un salaire au Casino`)
      } else {
        const first = s.casino.stake
        const firstP = s.players[first.by]
        let winnerIdx
        const a = moneyValue(first.card), b = moneyValue(card)
        if (a === b) {
          winnerIdx = s.current
          log(s, `🎰 Même niveau (${b}) : ${p.name} remporte les deux salaires !`)
        } else {
          winnerIdx = first.by
          log(s, `🎰 Niveaux différents (${a} vs ${b}) : ${firstP.name} remporte les deux salaires !`)
        }
        place(s, winnerIdx, first.card)
        place(s, winnerIdx, card)
        s.casino.stake = null
      }
      consumePlay(s, fromForced)
      finishPlay(s)
      return true
    }
    case 'END_PLAYS': {
      // bouton "Terminer" pendant un Arc-en-ciel
      if (!canEndPlays(s)) return false
      d.plays = 0
      endTurn(s)
      return true
    }
    default:
      return false
  }
}

// ===========================================================================
// Le flux
// ===========================================================================
const turn = {
  start() {
    return {
      flow: 'turn',
      step: 'draw',
      data: { plays: 1, rainbow: false, cardPlayed: false, forced: null, riverUsed: false },
    }
  },
  actors: (state) => [state.current],
  legal(state, frame, actor) {
    const list = frame.step === 'draw' ? drawActions(state) : playActions(state, frame)
    if (canStopAdultery(state, actor).ok) list.push({ type: 'STOP_ADULTERY' })
    return list
  },
  apply,
  // le flux posé au-dessus est fini.
  // Achat : payé → le jeu est consommé ; annulé → la carte est revenue en main
  // (ou reste forcée), rien n'est joué.
  // Étape end (démission d'un Chercheur) : le tour se termine.
  // Autres choix : le jeu (déjà consommé) est terminé, on continue ou on finit.
  resume(s, frame, result, done) {
    if (done?.flow === 'purchase') {
      if (result?.bought) {
        consumePlay(s, result.fromForced)
        finishPlay(s)
      }
      return
    }
    if (frame.step === 'end') endTurn(s)
    else finishPlay(s)
  },
  // délai dépassé, bot sans avis, joueur parti : piocher ; puis terminer
  // l'Arc-en-ciel, sinon défausser (la première carte de la main), sinon jouer
  // la carte forcée de la première façon permise
  fallback(state, frame, actor) {
    const legal = turn.legal(state, frame, actor)
    const pickType = (type) => legal.find((a) => a.type === type)
    if (frame.step === 'draw') return pickType('DRAW_DECK') ?? pickType('SKIP_DRAW')
    return pickType('END_PLAYS') ?? pickType('DISCARD_CARD') ?? legal[0] ?? null
  },
  // tout est public : la carte forcée vient de la défausse ou de la rivière
  view: (state, frame) => copy(frame),
  // carte tenue à part : la carte forcée
  held: (state, frame) => (frame.data.forced ? [frame.data.forced.card] : []),
}

export default turn

// --- mise en place des tests (comme les set… de primitives.js) -------------
// met le tour à l'étape step ('draw' | 'play')
export function setStep(s, step) { turnFrame(s).step = step }
// fixe le nombre de jeux restant ce tour
export function setPlays(s, n) { dataOf(s).plays = n }
