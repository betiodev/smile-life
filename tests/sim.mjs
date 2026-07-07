// Simulation headless : joue des parties complètes au hasard via le reducer
import { gameReducer } from '../src/game/reducer.js'
import { canPoseSelf, canPlayMalus, canTakeDiscardTop, isPlayableFromDiscard, malusHasTarget, handTarget } from '../src/game/rules.js'
import { computeScore } from '../src/game/scoring.js'
import { buildDeck } from '../src/data/cards.js'

const deck = buildDeck()
console.log('Total cartes :', deck.length)
const byType = {}
for (const c of deck) byType[c.type] = (byType[c.type] || 0) + 1
console.log(byType)
if (deck.length !== 200) throw new Error('Le paquet ne fait pas 200 cartes !')

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]

function step(s) {
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

let totalTurns = 0
for (let g = 0; g < 40; g++) {
  const n = 2 + (g % 4)
  const river = g % 2 === 0
  let s = gameReducer(null, { type: 'START_GAME', names: Array.from({ length: n }, (_, i) => `J${i + 1}`), river })
  let guard = 0
  while (s.screen !== 'gameover') {
    const next = step(s)
    if (next === s) {
      throw new Error(`Partie ${g} : action sans effet ! phase=${s.phase} pending=${s.pending?.type} forced=${s.forced?.name}`)
    }
    s = next
    if (++guard > 20000) throw new Error('Partie infinie ?')
  }
  totalTurns += guard
  // vérifications d'intégrité : toutes les cartes comptabilisées
  let count = s.deck.length + s.discard.length + s.removed.length + s.river.length
  if (s.casino?.stake) count += 1
  for (const p of s.players) {
    count += p.hand.length + p.studies.length + (p.job ? 1 : 0) + p.salaries.length + p.flirts.length +
      (p.marriage ? 1 : 0) + (p.adultery ? 1 : 0) + p.children.length + p.acquisitions.length +
      p.distinctions.length + p.specials.length + p.malusKept.length
    const sc = computeScore(p)
    if (sc.total < 0 || isNaN(sc.total)) throw new Error('score invalide')
    if (p.hand.length !== 0) throw new Error('main non défaussée en fin de partie')
  }
  if (count !== 200) throw new Error(`Partie ${g} : ${count} cartes comptées au lieu de 200 !`)
  const scores = s.players.map((p) => computeScore(p).total)
  console.log(`Partie ${g} (${n}j${river ? ', rivière' : ''}) : ${guard} étapes — scores ${scores.join(' / ')}`)
}
console.log(`\n✅ 40 parties complètes sans erreur (${totalTurns} étapes au total)`)
