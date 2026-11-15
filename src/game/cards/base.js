// ---------------------------------------------------------------------------
// Comportements des cartes du jeu de base, par id de définition
// (ARCHITECTURE.md §5.2, §6.2). Trois sortes d'entrées :
//
//  modifiers  changent la réponse d'une question (src/game/queries.js) tant
//             que la carte est en jeu : avantages et immunités des métiers,
//             maisons à moitié prix (Mariages), Licorne, Grand Prix ;
//  onPlace    ce que fait la carte quand son propriétaire la JOUE (de sa main,
//             carte forcée, Piston) : avantages instantanés des métiers et
//             cartes spéciales. onPlace(s, self) avec self = { card, owner },
//             la carte déjà posée ; → true si un flux attend un joueur. Une
//             carte volée ou offerte n'appelle pas onPlace ;
//  on         réactions aux événements (src/game/events.js).
//
// Les textes (raisons de refus, journal) sont ceux du jeu d'avant, mot pour mot.
// ---------------------------------------------------------------------------
import { BASE_DEFS } from '../../data/base.js'
import { hasTag, shuffle } from '../../data/index.js'
import { jobOf, isMarried, marriageOf, canStake } from '../state.js'
import { flip, log, loseJob, draw, put, takeAll } from '../primitives.js'
import { startFlow } from '../flows/index.js'
import { addPlays, startRainbow } from '../flows/turn.js'
import { isPlayableFromDiscard, birthdayDonors, handSize } from '../rules.js'
import { giveBirthdayGifts } from '../effects.js'
import { rngOf } from '../rng.js'

const malusIs = (key) => (q) => q.card.type === 'malus' && q.card.key === key
const immune = (key, forbid) => ({ query: 'canTarget', scope: 'target', when: malusIs(key), effect: { forbid } })
// Pharmacien, Médecin, Chirurgien : « <métier> : immunisé contre la maladie »
const noMaladie = {
  query: 'canTarget', scope: 'target', when: malusIs('maladie'),
  effect: (q, self) => ({ forbid: `${self.card.name} : immunisé contre la maladie` }),
}
// Médecin, Chirurgien : études continues (même avec un métier, au-delà de 6 cartes)
const continuedStudies = { query: 'canPlace', scope: 'owner', when: (q) => q.card.type === 'study', effect: { allow: true } }

// Policier (posé ou pistonné) : les Bandits et Gourous déjà posés sont défaussés
export function policeSweep(s, pIdx) {
  s.players.forEach((q, qi) => {
    if (qi !== pIdx && hasTag(jobOf(q), 'outlaw')) {
      log(s, `👮 Le Policier fait défausser le ${jobOf(q).name} de ${q.name}`, 'malus')
      loseJob(s, qi, { cause: 'policier', by: pIdx })
    }
  })
}

// ---------------------------------------------------------------------------
// Métiers
// ---------------------------------------------------------------------------
const JOBS = {
  'base.garagiste': { modifiers: [immune('accident', 'Le Garagiste ne subit aucun accident')] },
  'base.pharmacien': { modifiers: [noMaladie] },
  'base.medecin': { modifiers: [noMaladie, continuedStudies] },
  'base.chirurgien': { modifiers: [noMaladie, continuedStudies] },
  'base.avocat': { modifiers: [immune('divorce', 'L’Avocat ne subit aucun divorce')] },
  'base.bandit': {
    modifiers: [
      immune('licenciement', 'Le Bandit : ni impôt, ni licenciement'),
      immune('impot', 'Le Bandit : ni impôt, ni licenciement'),
      // la Prison ne concerne que le Bandit
      { query: 'canTarget', scope: 'target', when: malusIs('prison'), effect: { allow: true } },
      { query: 'canPlace', scope: 'owner', when: (q) => q.card.key === 'legion', effect: { forbid: 'Interdite aux Bandits, présents ou passés' } },
    ],
    // souvenir pour la Légion d'honneur (Bandit passé)
    onPlace(s, { owner }) {
      s.players[owner].wasBandit = true
      return false
    },
  },
  'base.militaire': {
    // aucun attentat en sa présence, contre personne
    modifiers: [{ ...immune('attentat', 'Un Militaire est en poste : aucun attentat possible'), scope: 'everyone' }],
  },
  'base.policier': {
    modifiers: [{
      query: 'canPlace', scope: 'everyone',
      when: (q) => q.card.type === 'job' && hasTag(q.card, 'outlaw'),
      effect: { forbid: 'Un Policier est en poste : ni Bandit ni Gourou' },
    }],
    onPlace(s, { owner }) {
      policeSweep(s, owner)
      return false
    },
  },
  'base.barmaid': {
    // flirts illimités avant le mariage
    modifiers: [{ query: 'flirtLimit', scope: 'owner', when: (q, self, s) => !isMarried(s.players[self.owner]), effect: { set: Infinity } }],
  },
  'base.chercheur': { modifiers: [{ query: 'handSize', scope: 'owner', effect: { set: 6 } }] },
  'base.pilote': {
    modifiers: [{ query: 'price', scope: 'owner', when: (q) => hasTag(q.card, 'travel'), effect: { set: 0, note: 'Pilote' } }],
  },
  'base.architecte': {
    // une maison offerte au lieu de la payer : au choix du joueur, une fois par métier
    modifiers: [{
      query: 'price', scope: 'owner',
      when: (q, self, s) => hasTag(q.card, 'house') && !s.players[self.owner].architectFreeUsed,
      effect: { set: 0, optional: true },
    }],
  },
  // avantages instantanés
  'base.journaliste': { onPlace: (s) => (startFlow(s, 'journalist'), true) },
  'base.medium': { onPlace: (s) => (startFlow(s, 'medium'), true) },
  'base.astronaute': {
    onPlace(s, { owner }) {
      if (s.discard.some((e) => isPlayableFromDiscard(s, owner, e.card))) {
        startFlow(s, 'discard-pick', { source: 'Astronaute' })
        return true
      }
      log(s, `L’avantage de l’Astronaute est perdu (rien de jouable dans la défausse)`)
      return false
    },
  },
}
// Chef des achats, Chef des ventes : troc en protégeant une carte
function chefTroc(s, { card, owner }) {
  if (s.players.some((q, qi) => qi !== owner && q.hand.length > 0)) {
    startFlow(s, 'chef-troc')
    return true
  }
  log(s, `L’avantage du ${card.name} est perdu (aucun adversaire avec des cartes)`)
  return false
}
JOBS['base.chef_achats'] = { onPlace: chefTroc }
JOBS['base.chef_ventes'] = { onPlace: chefTroc }

// Fonctionnaires (statut imprimé, tag) : jamais licenciés
const FONCTIONNAIRE = immune('licenciement', 'Un fonctionnaire ne peut pas être licencié')
for (const d of BASE_DEFS) {
  if (d.type !== 'job' || !hasTag(d, 'fonctionnaire')) continue
  const b = (JOBS[d.id] ??= {})
  b.modifiers = [...(b.modifiers ?? []), FONCTIONNAIRE]
}

// ---------------------------------------------------------------------------
// Mariages : maisons à moitié prix (arrondi au-dessus) une fois marié.
// Seul le premier mariage compte (deux mariages ne font pas un quart de prix).
// ---------------------------------------------------------------------------
const MARRIAGES = {}
const HALF_HOUSE = {
  query: 'price', scope: 'owner',
  when: (q, self, s) => hasTag(q.card, 'house') && marriageOf(s.players[self.owner])?.uid === self.card.uid,
  effect: { multiply: 0.5 },
}
for (const d of BASE_DEFS) if (d.type === 'marriage') MARRIAGES[d.id] = { modifiers: [HALF_HOUSE] }

// ---------------------------------------------------------------------------
// Acquisitions
// ---------------------------------------------------------------------------
const ACQUISITIONS = {
  // Licorne : doublée seulement avec l'Arc-en-ciel ET l'Étoile filante joués
  'base.licorne': {
    modifiers: [{
      query: 'cardSmiles', scope: 'owner',
      when: (q, self, s) => q.card.uid === self.card.uid &&
        ['arcenciel', 'etoile'].every((k) => s.players[self.owner].specials.some((c) => c.key === k)),
      effect: { multiply: 2 },
    }],
  },
}

// ---------------------------------------------------------------------------
// Distinctions
// ---------------------------------------------------------------------------
const DISTINCTIONS = {
  // Grand Prix d'excellence : salaire niveau 4 tant que le métier est exercé ;
  // retourné (sans effet, smiles conservés) quand son propriétaire perd son métier
  'base.grandprix': {
    modifiers: [{
      query: 'salaryLevels', scope: 'owner',
      when: (q, self, s) => !!jobOf(s.players[self.owner]),
      effect: { replace: [1, 2, 3, 4] },
    }],
    on: {
      jobLost(s, ev, self) {
        if (ev.player !== self.owner) return
        flip(s, self.card.uid)
        log(s, `Le Grand Prix de ${s.players[self.owner].name} est retourné (smiles conservés)`)
      },
    },
  },
}

// ---------------------------------------------------------------------------
// Cartes spéciales (posées avant onPlace)
// ---------------------------------------------------------------------------
const SPECIALS = {
  'base.anniversaire': {
    onPlace(s, { card, owner }) {
      // chaque adversaire ayant un salaire non investi choisit celui qu'il offre
      // (action BIRTHDAY_GIFT) ; sans donateur, l'anniversaire est réglé tout de suite
      const donors = birthdayDonors(s, owner)
      if (donors.length === 0) {
        giveBirthdayGifts(s, owner, {})
        return false
      }
      startFlow(s, 'birthday', { card, donors })
      return true
    },
  },
  'base.arcenciel': {
    onPlace(s, { owner }) {
      // +3 jeux : après consommation de la pose de l'Arc-en-ciel, il en reste 3
      addPlays(s, 3)
      startRainbow(s) // le joueur peut s'arrêter quand il veut (END_PLAYS)
      log(s, `🌈 ${s.players[owner].name} joue Arc-en-ciel : jusqu’à 3 cartes d’un coup !`)
      return false
    },
  },
  'base.chance': {
    onPlace(s, { owner }) {
      // (une carte jouée d'office n'y est jouée que si sa définition le dit : autoPlay.withChance)
      const cards = draw(s, owner, { count: 3, to: 'aside', chance: true })
      // Chance agit comme une pioche : elle ne consomme pas le jeu du tour
      addPlays(s, 1)
      log(s, `🍀 ${s.players[owner].name} joue Chance : pioche ${cards.length} cartes, en garde une en main`)
      startFlow(s, 'chance', { cards })
      return true
    },
  },
  'base.etoile': {
    onPlace(s, { owner }) {
      log(s, `🌠 ${s.players[owner].name} joue Étoile filante`)
      startFlow(s, 'discard-pick', { source: 'Étoile filante' })
      return true
    },
  },
  'base.heritage': {
    onPlace(s, { owner }) {
      log(s, `💵 ${s.players[owner].name} touche un Héritage : 3 liasses pour ses futurs achats`)
      return false
    },
  },
  'base.piston': { onPlace: (s, { card }) => (startFlow(s, 'piston', { card }), true) },
  'base.troc': { onPlace: (s) => (startFlow(s, 'troc'), true) },
  'base.tsunami': {
    onPlace(s, { owner }) {
      let pool = []
      s.players.forEach((q, qi) => { pool = pool.concat(takeAll(s, { hand: qi })) })
      pool = shuffle(pool, rngOf(s))
      // redistribution équitable : chacun vers sa taille de main cible
      const order = s.players.map((_, i) => (owner + i) % s.players.length)
      let active = true
      while (pool.length > 0 && active) {
        active = false
        for (const qi of order) {
          if (pool.length === 0) break
          if (s.players[qi].hand.length < handSize(s, qi)) {
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
      log(s, `🌊 ${s.players[owner].name} déclenche un Tsunami : toutes les mains sont redistribuées !`)
      return false
    },
  },
  'base.vengeance': { onPlace: (s) => (startFlow(s, 'vengeance'), true) },
  'base.casino': {
    onPlace(s, { owner }) {
      const p = s.players[owner]
      s.casino = { owner, stake: null }
      log(s, `🎰 ${p.name} ouvre un Casino !`)
      if (p.hand.some(canStake)) {
        startFlow(s, 'casino-stake')
        return true
      }
      return false
    },
  },
}

export default { ...JOBS, ...MARRIAGES, ...ACQUISITIONS, ...DISTINCTIONS, ...SPECIALS }
