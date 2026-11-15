// ---------------------------------------------------------------------------
// Smile Life — Troc du Chef des achats / Chef des ventes (avantage instantané)
// Étapes :
//   target    le Chef choisit l'adversaire (CHEF_TROC_TARGET)
//   protect   s'il a au moins 2 cartes, il en protège une (CHEF_TROC_PROTECT)
//   opp-pick  l'ADVERSAIRE prend, face cachée, une carte non protégée du Chef
//             (CHEF_TROC_OPP_PICK)
//   chef-pick le Chef prend, face cachée, une carte de l'adversaire, puis
//             l'échange a lieu (CHEF_TROC_CHEF_PICK)
// data = { target?, protectedUid?, oppPickedUid? }
// Secret : protectedUid et oppPickedUid ne sont vus que du Chef ; les autres
// savent seulement combien de cartes sont proposées (pickCount) et s'il y a
// une carte protégée. Les pioches face cachée sont par index ; l'ordre d'une
// main est public, donc l'index est ignoré et la carte tirée au hasard.
// ---------------------------------------------------------------------------
import { move, log } from '../primitives.js'
import { pick } from '../rng.js'
import { jobOf } from '../state.js'
import { opponentsWithCards } from './troc.js'
import { endFlow } from './index.js'

const range = (n) => Array.from({ length: n }, (_, i) => i)
const isIndex = (i, n) => Number.isInteger(i) && i >= 0 && i < n

const chefTroc = {
  start: () => ({ flow: 'chef-troc', step: 'target', data: {} }),
  // à l'étape opp-pick, c'est l'adversaire visé qui choisit
  actors: (state, frame) => (frame.step === 'opp-pick' ? [frame.data.target] : [state.current]),
  legal(state, frame) {
    const d = frame.data
    const p = state.players[state.current]
    switch (frame.step) {
      case 'target':
        return opponentsWithCards(state).map((i) => ({ type: 'CHEF_TROC_TARGET', target: i }))
      case 'protect':
        return p.hand.map((c) => ({ type: 'CHEF_TROC_PROTECT', uid: c.uid }))
      case 'opp-pick': {
        // l'adversaire ne connaît que le nombre de cartes (pickCount, dans sa vue)
        const n = d.pickCount ?? p.hand.filter((c) => c.uid !== d.protectedUid).length
        return range(n).map((index) => ({ type: 'CHEF_TROC_OPP_PICK', index }))
      }
      case 'chef-pick':
        return range(state.players[d.target].hand.length).map((index) => ({ type: 'CHEF_TROC_CHEF_PICK', index }))
      default:
        return []
    }
  },
  apply(s, frame, action) {
    const p = s.players[s.current]
    const d = frame.data
    switch (action.type) {
      case 'CHEF_TROC_TARGET': {
        if (frame.step !== 'target') return false
        const t = s.players[action.target]
        if (!t || action.target === s.current || t.hand.length === 0) return false
        // s'il reste au moins 2 cartes en main, le Chef en protège une
        if (p.hand.length >= 2) {
          frame.step = 'protect'
          frame.data = { target: action.target }
        } else {
          frame.step = 'opp-pick'
          frame.data = { target: action.target, protectedUid: null }
        }
        return true
      }
      case 'CHEF_TROC_PROTECT': {
        if (frame.step !== 'protect' || !p.hand.some((c) => c.uid === action.uid)) return false
        log(s, `🛡️ ${p.name} protège 1 carte de son troc`)
        frame.step = 'opp-pick'
        frame.data = { target: d.target, protectedUid: action.uid }
        return true
      }
      case 'CHEF_TROC_OPP_PICK': {
        if (frame.step !== 'opp-pick') return false
        const pickable = p.hand.filter((c) => c.uid !== d.protectedUid)
        if (!isIndex(action.index, pickable.length)) return false
        const picked = pick(s, pickable)
        frame.step = 'chef-pick'
        frame.data = { target: d.target, oppPickedUid: picked.uid }
        return true
      }
      case 'CHEF_TROC_CHEF_PICK': {
        if (frame.step !== 'chef-pick') return false
        const t = s.players[d.target]
        if (!isIndex(action.index, t.hand.length)) return false
        const theirs = pick(s, t.hand)
        move(s, d.oppPickedUid, { hand: s.current }, { hand: d.target })
        move(s, theirs.uid, { hand: d.target }, { hand: s.current })
        log(s, `🔄 ${p.name} (${jobOf(p).name}) troque une carte avec ${t.name} en en protégeant une`)
        endFlow(s)
        return true
      }
      default:
        return false
    }
  },
  resume() {},
  // délai dépassé : le premier choix de la liste (premier adversaire, première
  // carte, première position)
  fallback: (state, frame, actor) => chefTroc.legal(state, frame, actor)[0],
  view(state, frame, viewer) {
    const d = frame.data
    const chef = state.players[state.current]
    const pub = {}
    if ('target' in d) pub.target = d.target
    if (frame.step === 'opp-pick') {
      pub.protected = !!d.protectedUid
      pub.pickCount = chef.hand.filter((c) => c.uid !== d.protectedUid).length
    }
    if (viewer != null && viewer === state.current) {
      if ('protectedUid' in d) pub.protectedUid = d.protectedUid
      if ('oppPickedUid' in d) pub.oppPickedUid = d.oppPickedUid
    }
    return { flow: 'chef-troc', step: frame.step, data: pub }
  },
}

export default chefTroc
