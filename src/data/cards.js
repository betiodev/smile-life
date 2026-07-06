// ---------------------------------------------------------------------------
// Smile Life — données complètes des 200 cartes
// ---------------------------------------------------------------------------

let uidCounter = 0
const uid = () => `c${++uidCounter}`

// --- MÉTIERS (30) ----------------------------------------------------------
// status: 'fonctionnaire' | 'interim' | null
// perk: 'app' (permanent) | 'api' (instantané) | null
export const JOBS = [
  { key: 'serveur', name: 'Serveur', studyReq: 0, salaryLevel: 1, status: 'interim', perk: null, trophy: false, flavor: 'Vous êtes serviable' },
  { key: 'barman', name: 'Barman', studyReq: 0, salaryLevel: 1, status: 'interim', perk: 'app', trophy: false, flavor: 'Flirts illimités avant le mariage' },
  { key: 'jardinier', name: 'Jardinier', studyReq: 1, salaryLevel: 1, status: 'interim', perk: null, trophy: false, flavor: 'Vous êtes écolo' },
  { key: 'plombier', name: 'Plombier', studyReq: 1, salaryLevel: 1, status: 'interim', perk: null, trophy: false, flavor: 'Vous êtes bricolo' },
  { key: 'stripteaser', name: 'Stripteaser', studyReq: 0, salaryLevel: 1, status: 'interim', perk: null, trophy: false, flavor: 'Vous êtes chaud bouillant' },
  { key: 'pizzaiolo', name: 'Pizzaïolo', studyReq: 0, salaryLevel: 2, status: null, perk: null, trophy: false, flavor: 'Vous êtes fin gourmet' },
  { key: 'garagiste', name: 'Garagiste', studyReq: 1, salaryLevel: 2, status: null, perk: 'app', trophy: false, flavor: 'Vous ne subissez aucun accident' },
  { key: 'bandit', name: 'Bandit', studyReq: 0, salaryLevel: 4, status: null, perk: 'app', trophy: false, flavor: 'Ni impôt Ni licenciement' },
  { key: 'gourou', name: 'Gourou', studyReq: 0, salaryLevel: 3, status: null, perk: null, trophy: false, flavor: 'Vous êtes illuminé' },
  { key: 'militaire', name: 'Militaire', studyReq: 0, salaryLevel: 1, status: 'fonctionnaire', perk: 'app', trophy: false, flavor: 'Aucun attentat en votre présence' },
  { key: 'policier', name: 'Policier', studyReq: 1, salaryLevel: 1, status: 'fonctionnaire', perk: 'app', trophy: false, flavor: 'Ni Gourou Ni Bandit en votre présence' },
  { key: 'prof_maths', name: 'Prof de maths', studyReq: 2, salaryLevel: 2, status: 'fonctionnaire', perk: null, trophy: false, flavor: 'Pythagore est votre idole', isProf: true },
  { key: 'prof_francais', name: 'Prof de français', studyReq: 2, salaryLevel: 2, status: 'fonctionnaire', perk: null, trophy: false, flavor: 'Molière est votre idole', isProf: true },
  { key: 'prof_anglais', name: "Prof d'anglais", studyReq: 2, salaryLevel: 2, status: 'fonctionnaire', perk: null, trophy: false, flavor: 'Elisabeth II est votre idole', isProf: true },
  { key: 'prof_histoire', name: "Prof d'histoire", studyReq: 2, salaryLevel: 2, status: 'fonctionnaire', perk: null, trophy: false, flavor: 'Napoléon est votre idole', isProf: true },
  { key: 'designer', name: 'Designer', studyReq: 4, salaryLevel: 3, status: null, perk: null, trophy: false, flavor: 'Vous êtes branché' },
  { key: 'ecrivain', name: 'Écrivain', studyReq: 0, salaryLevel: 1, status: null, perk: null, trophy: true, flavor: 'Vous êtes romantique' },
  { key: 'journaliste', name: 'Journaliste', studyReq: 3, salaryLevel: 2, status: null, perk: 'api', trophy: true, flavor: 'Vous pouvez voir le jeu de chacun' },
  { key: 'pharmacien', name: 'Pharmacien', studyReq: 5, salaryLevel: 3, status: null, perk: 'app', trophy: false, flavor: 'Vous ne subissez aucune maladie' },
  { key: 'chef_achats', name: 'Chef des achats', studyReq: 3, salaryLevel: 3, status: null, perk: 'api', trophy: false, flavor: 'Troquez en protégeant 1 carte' },
  { key: 'chef_ventes', name: 'Chef des ventes', studyReq: 3, salaryLevel: 3, status: null, perk: 'api', trophy: false, flavor: 'Troquez en protégeant 1 carte' },
  { key: 'medium', name: 'Médium', studyReq: 0, salaryLevel: 1, status: null, perk: 'api', trophy: false, flavor: 'Vous voyez les 13 cartes à venir' },
  { key: 'chercheur', name: 'Chercheur', studyReq: 6, salaryLevel: 2, status: null, perk: 'app', trophy: true, flavor: 'Expérimentez le jeu à six cartes' },
  { key: 'avocat', name: 'Avocat', studyReq: 4, salaryLevel: 3, status: null, perk: 'app', trophy: false, flavor: 'Vous ne subissez aucun divorce' },
  { key: 'architecte', name: 'Architecte', studyReq: 4, salaryLevel: 3, status: null, perk: 'app', trophy: false, flavor: 'Une maison offerte au lieu de la payer' },
  { key: 'medecin', name: 'Médecin', studyReq: 6, salaryLevel: 4, status: null, perk: 'app', trophy: false, flavor: 'Aucune maladie et études continues' },
  { key: 'chirurgien', name: 'Chirurgien', studyReq: 6, salaryLevel: 4, status: null, perk: 'app', trophy: false, flavor: 'Aucune maladie et études continues' },
  { key: 'pilote', name: 'Pilote de ligne', studyReq: 5, salaryLevel: 4, status: null, perk: 'app', trophy: false, flavor: 'Vous voyagez gratuitement' },
  { key: 'astronaute', name: 'Astronaute', studyReq: 6, salaryLevel: 4, status: null, perk: 'api', trophy: false, flavor: 'Choisissez une carte dans la défausse' },
  { key: 'grand_prof', name: 'Grand Prof', studyReq: null, salaryLevel: 3, status: 'fonctionnaire', perk: null, trophy: false, flavor: 'Promotion de carrière réservée aux profs', isGrandProf: true },
]

// --- FLIRTS (10 lieux × 2) --------------------------------------------------
export const FLIRT_PLACES = [
  { place: 'Au bar', allowsChild: false, emoji: '🍸' },
  { place: 'Sur Internet', allowsChild: false, emoji: '💻' },
  { place: 'Au restaurant', allowsChild: false, emoji: '🍽️' },
  { place: 'Au cinéma', allowsChild: false, emoji: '🎬' },
  { place: 'Au théâtre', allowsChild: false, emoji: '🎭' },
  { place: 'Au camping', allowsChild: true, emoji: '⛺' },
  { place: "À l'hôtel", allowsChild: true, emoji: '🏨' },
  { place: 'En boîte de nuit', allowsChild: false, emoji: '🪩' },
  { place: 'Au zoo', allowsChild: false, emoji: '🦁' },
  { place: 'Au parc', allowsChild: false, emoji: '🌳' },
]

export const MARRIAGE_PLACES = ['Corps-Nuds', 'Sainte-Verge', 'Monteton', 'Bourg-la-Reine', 'Bourg-Madame', 'Fourqueux', 'Montcuq']

export const CHILDREN = [
  { name: 'Luigi', desc: 'Bébé avec un chapeau vert' },
  { name: 'Leïa', desc: 'Bébé avec un nœud et coiffure Leïa' },
  { name: 'Lara', desc: 'Bébé avec les cheveux attachés' },
  { name: 'Zelda', desc: 'Bébé avec les cheveux comme Zelda' },
  { name: 'Diana', desc: 'Bébé avec bandeau Wonder Woman' },
  { name: 'Hermione', desc: 'Bébé roux' },
  { name: 'Luke', desc: 'Bébé avec un sabre laser' },
  { name: 'Harry', desc: 'Bébé avec lunettes et cicatrice' },
  { name: 'Rocky', desc: 'Bébé avec gants de boxe et ceinture' },
  { name: 'Mario', desc: 'Bébé avec un chapeau rouge' },
]

// --- MALUS (37) --------------------------------------------------------------
export const MALUS_DEFS = [
  { key: 'accident', name: 'Accident', count: 5, desc: 'Passe 1 tour', cond: "N'importe qui" },
  { key: 'maladie', name: 'Maladie', count: 5, desc: 'Passe 1 tour', cond: "N'importe qui" },
  { key: 'burnout', name: 'Burn out', count: 5, desc: 'Passe 1 tour', cond: 'Doit avoir un métier' },
  { key: 'licenciement', name: 'Licenciement', count: 5, desc: 'Le métier est défaussé', cond: 'Doit avoir un métier' },
  { key: 'impot', name: 'Impôt sur le revenu', count: 5, desc: 'Dernier salaire non-investi défaussé', cond: 'Doit avoir un métier' },
  { key: 'divorce', name: 'Divorce', count: 5, desc: 'Le mariage est défaussé (adultère : enfants perdus aussi)', cond: 'Doit être marié' },
  { key: 'redoublement', name: 'Redoublement', count: 5, desc: 'Dernière carte études défaussée', cond: 'Doit être étudiant' },
  { key: 'prison', name: 'Prison', count: 1, desc: 'Passe 3 tours, le Bandit est défaussé', cond: 'Doit être Bandit' },
  { key: 'attentat', name: 'Attentat', count: 1, desc: "TOUS les enfants de l'auteur et de la victime sont retirés du jeu", cond: "N'importe qui" },
]

// --- SPÉCIALES (10) -----------------------------------------------------------
export const SPECIAL_DEFS = [
  { key: 'anniversaire', name: 'Anniversaire', desc: 'Chaque joueur vous offre un salaire posé (le plus petit)' },
  { key: 'arcenciel', name: 'Arc-en-ciel', desc: "Jouez jusqu'à 3 cartes d'un coup puis repiochez pour revenir à 5" },
  { key: 'chance', name: 'Chance', desc: 'Piochez 3 cartes, gardez-en une et jouez-la, défaussez les autres' },
  { key: 'etoile', name: 'Étoile filante', desc: 'Prenez une carte au choix dans la défausse et jouez-la directement' },
  { key: 'heritage', name: 'Héritage', desc: 'Vaut 3 liasses de billets pour vos futurs achats' },
  { key: 'piston', name: 'Piston', desc: 'Posez le métier de votre choix sans les études nécessaires' },
  { key: 'troc', name: 'Troc', desc: 'Échangez une carte au hasard avec le joueur de votre choix' },
  { key: 'tsunami', name: 'Tsunami', desc: 'Toutes les mains sont mélangées et redistribuées' },
  { key: 'vengeance', name: 'Vengeance', desc: 'Infligez un de vos malus reçus à un autre joueur' },
  { key: 'casino', name: 'Casino', desc: 'Misez un salaire. Même niveau : le 2e joueur gagne tout, sinon le 1er' },
]

// --- ACQUISITIONS (15) ---------------------------------------------------------
export const ANIMALS = [
  { key: 'chat', name: 'Chat', smiles: 1, emoji: '🐱' },
  { key: 'chien', name: 'Chien', smiles: 1, emoji: '🐕' },
  { key: 'lapin', name: 'Lapin', smiles: 1, emoji: '🐰' },
  { key: 'poussin', name: 'Poussin', smiles: 1, emoji: '🐣' },
  { key: 'licorne', name: 'Licorne', smiles: 3, emoji: '🦄' },
]
export const TRAVELS = ['Londres', 'Sydney', 'Le Caire', 'Rio de Janeiro', 'New York']
export const HOUSES = [
  { key: 'maison1', name: 'Maison simple', smiles: 1, cost: 6 },
  { key: 'maison2', name: 'Maison simple', smiles: 1, cost: 6 },
  { key: 'grande1', name: 'Grande maison', smiles: 2, cost: 8 },
  { key: 'grande2', name: 'Grande maison', smiles: 2, cost: 8 },
  { key: 'villa', name: 'Villa', smiles: 3, cost: 10 },
]

// ---------------------------------------------------------------------------
// Construction du paquet complet (200 cartes)
// ---------------------------------------------------------------------------
export function buildDeck() {
  uidCounter = 0
  const deck = []

  // Études : 22 simples + 3 doubles = 25 (1 smile chacune)
  for (let i = 0; i < 22; i++) deck.push({ uid: uid(), type: 'study', name: 'Études', levels: 1, smiles: 1 })
  for (let i = 0; i < 3; i++) deck.push({ uid: uid(), type: 'study', name: 'Études doubles', levels: 2, smiles: 1 })

  // Métiers : 30 (2 smiles chacun)
  for (const j of JOBS) deck.push({ uid: uid(), type: 'job', smiles: 2, ...j })

  // Salaires : 40 (10 par niveau, 1 smile)
  for (let level = 1; level <= 4; level++)
    for (let i = 0; i < 10; i++) deck.push({ uid: uid(), type: 'salary', name: `Salaire ${level}`, level, smiles: 1 })

  // Flirts : 20 (10 lieux × 2, 1 smile)
  for (const f of FLIRT_PLACES)
    for (let i = 0; i < 2; i++) deck.push({ uid: uid(), type: 'flirt', name: f.place, smiles: 1, ...f })

  // Mariages : 7 (3 smiles)
  for (const m of MARRIAGE_PLACES) deck.push({ uid: uid(), type: 'marriage', name: m, smiles: 3 })

  // Adultère : 3 (1 smile)
  for (let i = 0; i < 3; i++) deck.push({ uid: uid(), type: 'adultery', name: 'Adultère', smiles: 1 })

  // Enfants : 10 (2 smiles)
  for (const c of CHILDREN) deck.push({ uid: uid(), type: 'child', name: c.name, desc: c.desc, smiles: 2 })

  // Malus : 37 (0 smile)
  for (const m of MALUS_DEFS)
    for (let i = 0; i < m.count; i++)
      deck.push({ uid: uid(), type: 'malus', key: m.key, name: m.name, desc: m.desc, cond: m.cond, smiles: 0 })

  // Spéciales : 10 (0 smile)
  for (const s of SPECIAL_DEFS) deck.push({ uid: uid(), type: 'special', key: s.key, name: s.name, desc: s.desc, smiles: 0 })

  // Acquisitions : 15
  for (const a of ANIMALS) deck.push({ uid: uid(), type: 'acquisition', acqType: 'animal', key: a.key, name: a.name, smiles: a.smiles, emoji: a.emoji, cost: 0 })
  for (const t of TRAVELS) deck.push({ uid: uid(), type: 'acquisition', acqType: 'travel', key: t, name: t, smiles: 2, cost: 3 })
  for (const h of HOUSES) deck.push({ uid: uid(), type: 'acquisition', acqType: 'house', key: h.key, name: h.name, smiles: h.smiles, cost: h.cost })

  // Distinctions : 3
  deck.push({ uid: uid(), type: 'distinction', key: 'legion', name: "Légion d'honneur", smiles: 3, desc: 'Interdite aux Bandits (présents ou passés) et aux auteurs d’attentat' })
  for (let i = 0; i < 2; i++)
    deck.push({ uid: uid(), type: 'distinction', key: 'grandprix', name: "Grand prix d'excellence", smiles: 4, desc: 'Réservé aux Écrivains, Chercheurs et Journalistes. Salaire niveau 4 tant que vous exercez ce métier' })

  return deck
}

export function shuffle(array, rng = Math.random) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
