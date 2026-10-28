// Logique de simulation partagée (sim.mjs, view.test.mjs) : choisit au hasard
// une action valide pour l'état courant
import { gameReducer as rawReducer } from '../src/game/reducer.js'
import { whoMustAct } from '../src/game/turn.js'
import { canPoseSelf, canPlayMalus, canTakeDiscardTop, isPlayableFromDiscard } from '../src/game/rules.js'

export const stats = { birthdayGifts: 0 }

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]

// chaque action est signée par un joueur autorisé à agir (whoMustAct),
// sauf si elle précise déjà son auteur
export function gameReducer(s, action) {
  if (action.type === 'START_GAME') return rawReducer(s, action)
  return rawReducer(s, { ...action, by: action.by ?? rand(whoMustAct(s)) })
}

export function step(s) {
  // résout un état en choisissant une action valide au hasard
  if (s.screen === 'transition') return gameReducer(s, { type: 'READY' })

  if (s.pending) {
    const p = s.players[s.current]
    switch (s.pending.type) {
      case 'purchase': {
        const useArchitect = s.pending.card.acqType === 'house' && p.job?.key === 'architecte' && !p.architectFreeUsed
        if (useArchitect) return gameReducer(s, { type: 'PURCHASE_CONFIRM', useArchitect: true })
        // sélection gloutonne sans salaire superflu ; héritage seulement si nécessaire
        const cost = s.pending.card.acqType === 'house'
          ? (p.marriage ? Math.ceil(s.pending.card.cost / 2) : s.pending.card.cost)
          : s.pending.card.cost
        const avail = p.salaries.filter((x) => !x.invested).sort((a, b) => b.card.level - a.card.level)
        const allTotal = avail.reduce((t, x) => t + x.card.level, 0)
        const useHeritage = p.heritage > 0 && allTotal < cost
        let total = useHeritage ? p.heritage : 0
        const uids = []
        for (const sal of avail) {
          if (total >= cost) break
          uids.push(sal.card.uid)
          total += sal.card.level
        }
        const r = gameReducer(s, { type: 'PURCHASE_CONFIRM', salaryUids: uids, useHeritage })
        if (r === s) return gameReducer(s, { type: 'PURCHASE_CANCEL' })
        return r
      }
      case 'chance': return gameReducer(s, { type: 'CHANCE_PICK', uid: rand(s.pending.cards).uid })
      case 'discard-pick': {
        const playable = s.discard.filter((e) => isPlayableFromDiscard(s, s.current, e.card))
        if (playable.length === 0) throw new Error('discard-pick sans carte jouable !')
        return gameReducer(s, { type: 'DISCARD_PICK', uid: rand(playable).card.uid })
      }
      case 'piston': {
        const jobs = p.hand.filter((c) => c.type === 'job' && !c.isGrandProf)
        const ok = jobs.filter((j) => !((j.key === 'bandit' || j.key === 'gourou') && s.players.some((q) => q.job?.key === 'policier')))
        if (ok.length === 0) throw new Error('piston sans métier valide !')
        return gameReducer(s, { type: 'PISTON_PICK', uid: rand(ok).uid })
      }
      case 'troc': {
        const targets = s.players.map((q, i) => i).filter((i) => i !== s.current && s.players[i].hand.length > 0)
        return gameReducer(s, { type: 'TROC_PICK', target: rand(targets) })
      }
      case 'chef-troc': {
        if (s.pending.step === 'target') {
          const targets = s.players.map((q, i) => i).filter((i) => i !== s.current && s.players[i].hand.length > 0)
          return gameReducer(s, { type: 'CHEF_TROC_TARGET', target: rand(targets) })
        }
        if (s.pending.step === 'protect') return gameReducer(s, { type: 'CHEF_TROC_PROTECT', uid: rand(p.hand).uid })
        if (s.pending.step === 'opp-pick') {
          const n = p.hand.filter((c) => c.uid !== s.pending.protectedUid).length
          return gameReducer(s, { type: 'CHEF_TROC_OPP_PICK', index: Math.floor(Math.random() * n) })
        }
        const t = s.players[s.pending.target]
        return gameReducer(s, { type: 'CHEF_TROC_CHEF_PICK', index: Math.floor(Math.random() * t.hand.length) })
      }
      case 'vengeance': {
        const opts = []
        for (const m of p.malusKept)
          s.players.forEach((q, i) => {
            if (i !== s.current && canPlayMalus(s, s.current, m, i).ok) opts.push({ uid: m.uid, target: i })
          })
        if (opts.length === 0) throw new Error('vengeance sans option !')
        const o = rand(opts)
        return gameReducer(s, { type: 'VENGEANCE_PICK', ...o })
      }
      case 'casino-stake': {
        const sal = p.hand.filter((c) => c.type === 'salary')
        if (sal.length > 0 && Math.random() < 0.7) return gameReducer(s, { type: 'CASINO_STAKE', uid: rand(sal).uid })
        return gameReducer(s, { type: 'CASINO_STAKE', uid: null })
      }
      case 'journalist':
      case 'medium':
        return gameReducer(s, { type: 'CLOSE_PENDING' })
      case 'birthday': {
        // un donateur qui n'a pas encore offert (dans n'importe quel ordre) :
        // un salaire libre au hasard, ou null (délai dépassé → le plus petit)
        const by = rand(whoMustAct(s))
        const unused = s.players[by].salaries.filter((x) => !x.invested)
        stats.birthdayGifts++
        return gameReducer(s, { type: 'BIRTHDAY_GIFT', by, uid: Math.random() < 0.3 ? null : rand(unused).card.uid })
      }
      default:
        throw new Error('pending inconnu : ' + s.pending.type)
    }
  }

  const p = s.players[s.current]

  if (s.phase === 'draw') {
    const opts = [{ type: 'DRAW_DECK' }]
    if (canTakeDiscardTop(s, s.current).ok) opts.push({ type: 'TAKE_DISCARD' })
    if (s.riverEnabled)
      s.river.forEach((c, i) => {
        opts.push({ type: 'TAKE_RIVER', index: i, playNow: false })
        if (isPlayableFromDiscard(s, s.current, c)) opts.push({ type: 'TAKE_RIVER', index: i, playNow: true })
      })
    if (p.job && Math.random() < 0.02) opts.push({ type: 'RESIGN' })
    if (p.marriage && Math.random() < 0.02) opts.push({ type: 'DIVORCE_VOLUNTARY' })
    return gameReducer(s, rand(opts))
  }

  // phase de jeu
  if (s.forced) {
    const c = s.forced
    const opts = []
    if (c.type === 'malus') {
      s.players.forEach((q, i) => { if (i !== s.current && canPlayMalus(s, s.current, c, i).ok) opts.push({ type: 'PLAY_MALUS', uid: c.uid, target: i }) })
    } else if (canPoseSelf(s, s.current, c).ok) {
      opts.push({ type: 'PLAY_SELF', uid: c.uid })
    }
    if (!s.forcedConsumesPlay) opts.push({ type: 'DISCARD_CARD', uid: c.uid })
    if (opts.length === 0) throw new Error('carte forcée injouable : ' + c.name + ' (' + c.type + ')')
    return gameReducer(s, rand(opts))
  }

  const opts = []
  for (const c of p.hand) {
    if (c.type === 'malus') {
      s.players.forEach((q, i) => { if (i !== s.current && canPlayMalus(s, s.current, c, i).ok) opts.push({ type: 'PLAY_MALUS', uid: c.uid, target: i }) })
    } else if (canPoseSelf(s, s.current, c).ok) {
      opts.push({ type: 'PLAY_SELF', uid: c.uid })
    }
    if (c.type === 'salary' && s.casino && (!s.casino.stake || s.casino.stake.by !== s.current))
      opts.push({ type: 'CASINO_BET', uid: c.uid })
    opts.push({ type: 'DISCARD_CARD', uid: c.uid })
  }
  if (s.playsRemaining > 1) opts.push({ type: 'END_PLAYS' })
  if (opts.length === 0) throw new Error('aucune action possible en phase de jeu')
  return gameReducer(s, rand(opts))
}

// nouvelle partie n° g : 2 à 5 joueurs, rivière une partie sur deux
export function newGame(g) {
  const n = 2 + (g % 4)
  const river = g % 2 === 0
  return gameReducer(null, { type: 'START_GAME', names: Array.from({ length: n }, (_, i) => `J${i + 1}`), river })
}
