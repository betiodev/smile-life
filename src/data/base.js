// ---------------------------------------------------------------------------
// Smile Life — définitions des cartes du jeu de base (200 cartes, 98 sortes)
//
// Une DÉFINITION décrit une sorte de carte ; `count` = nombre d'exemplaires.
// Les cartes d'une partie (instances) sont fabriquées par buildDeck
// (src/data/index.js) : champs de la définition + uid + def (= id).
//
//  id    'base.<slug>' — ne change jamais
//  ext   'base' (extension d'origine)
//  tags  groupes de cartes auxquels les règles font référence sans nommer
//        les cartes : outlaw, prof, trophy, fonctionnaire, interim,
//        animal, travel, house
//  key   identifiant des cartes qui ont un comportement (règles, effets)
//
// Une définition ne contient jamais de fonction (données pures).
// ---------------------------------------------------------------------------

const EXT = 'base'

// « Au bar » → « au_bar » (sert à fabriquer les id)
const slug = (s) => String(s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')

const def = (slugPart, fields, { count = 1, tags = [] } = {}) =>
  ({ id: `${EXT}.${slugPart}`, ext: EXT, count, tags, ...fields })

// --- ÉTUDES (25) -------------------------------------------------------------
const STUDIES = [
  def('etudes', { type: 'study', name: 'Études', levels: 1, smiles: 1 }, { count: 22 }),
  def('etudes_doubles', { type: 'study', name: 'Études doubles', levels: 2, smiles: 1 }, { count: 3 }),
]

// --- MÉTIERS (30, 2 smiles) -----------------------------------------------------
// status (imprimé) : 'fonctionnaire' | 'interim' | null — repris en tag
// perk : 'app' (permanent) | 'api' (instantané) | null
const JOB_ROWS = [
  // key, name, studyReq, salaryLevel, status, perk, flavor, tags en plus du statut
  ['serveur', 'Serveur', 0, 1, 'interim', null, 'Vous êtes serviable'],
  ['barmaid', 'Barmaid', 0, 1, 'interim', 'app', 'Flirts illimités avant le mariage'],
  ['jardinier', 'Jardinier', 1, 1, 'interim', null, 'Vous êtes écolo'],
  ['plombier', 'Plombier', 1, 1, 'interim', null, 'Vous êtes bricolo'],
  ['stripteaser', 'Stripteaser', 0, 1, 'interim', null, 'Vous êtes chaud bouillant'],
  ['pizzaiolo', 'Pizzaïolo', 0, 2, null, null, 'Vous êtes fin gourmet'],
  ['garagiste', 'Garagiste', 1, 2, null, 'app', 'Vous ne subissez aucun accident'],
  ['bandit', 'Bandit', 0, 4, null, 'app', 'Ni impôt Ni licenciement', ['outlaw']],
  ['gourou', 'Gourou', 0, 3, null, null, 'Vous êtes illuminé', ['outlaw']],
  ['militaire', 'Militaire', 0, 1, 'fonctionnaire', 'app', 'Aucun attentat en votre présence'],
  ['policier', 'Policier', 1, 1, 'fonctionnaire', 'app', 'Ni Gourou Ni Bandit en votre présence'],
  ['prof_maths', 'Prof de maths', 2, 2, 'fonctionnaire', null, 'Pythagore est votre idole', ['prof']],
  ['prof_francais', 'Prof de français', 2, 2, 'fonctionnaire', null, 'Molière est votre idole', ['prof']],
  ['prof_anglais', "Prof d'anglais", 2, 2, 'fonctionnaire', null, 'Elisabeth II est votre idole', ['prof']],
  ['prof_histoire', "Prof d'histoire", 2, 2, 'fonctionnaire', null, 'Napoléon est votre idole', ['prof']],
  ['designer', 'Designer', 4, 3, null, null, 'Vous êtes branché'],
  ['ecrivain', 'Écrivain', 0, 1, null, null, 'Vous êtes romantique', ['trophy']],
  ['journaliste', 'Journaliste', 3, 2, null, 'api', 'Vous pouvez voir le jeu de chacun', ['trophy']],
  ['pharmacien', 'Pharmacien', 5, 3, null, 'app', 'Vous ne subissez aucune maladie'],
  ['chef_achats', 'Chef des achats', 3, 3, null, 'api', 'Troquez en protégeant 1 carte'],
  ['chef_ventes', 'Chef des ventes', 3, 3, null, 'api', 'Troquez en protégeant 1 carte'],
  ['medium', 'Médium', 0, 1, null, 'api', 'Vous voyez les 13 cartes à venir'],
  ['chercheur', 'Chercheur', 6, 2, null, 'app', 'Expérimentez le jeu à six cartes', ['trophy']],
  ['avocat', 'Avocat', 4, 3, null, 'app', 'Vous ne subissez aucun divorce'],
  ['architecte', 'Architecte', 4, 3, null, 'app', 'Une maison offerte au lieu de la payer'],
  ['medecin', 'Médecin', 6, 4, null, 'app', 'Aucune maladie et études continues'],
  ['chirurgien', 'Chirurgien', 6, 4, null, 'app', 'Aucune maladie et études continues'],
  ['pilote', 'Pilote de ligne', 5, 4, null, 'app', 'Vous voyagez gratuitement'],
  ['astronaute', 'Astronaute', 6, 4, null, 'api', 'Choisissez une carte dans la défausse'],
  // promotion de carrière : pas d'études requises, réservée aux profs
  ['grand_prof', 'Grand Prof', null, 3, 'fonctionnaire', null, 'Promotion de carrière réservée aux profs'],
]
const JOBS = JOB_ROWS.map(([key, name, studyReq, salaryLevel, status, perk, flavor, extra = []]) =>
  def(key, { type: 'job', smiles: 2, key, name, studyReq, salaryLevel, status, perk, flavor },
    { tags: [...(status ? [status] : []), ...extra] }))

// --- SALAIRES (40 : 10 par niveau, 1 smile) -----------------------------------
const SALARIES = [1, 2, 3, 4].map((level) =>
  def(`salaire_${level}`, { type: 'salary', name: `Salaire ${level}`, level, smiles: 1 }, { count: 10 }))

// --- FLIRTS (10 lieux × 2, 1 smile) -------------------------------------------
const FLIRTS = [
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
].map((f) => def(`flirt_${slug(f.place)}`, { type: 'flirt', name: f.place, smiles: 1, ...f }, { count: 2 }))

// --- MARIAGES (7, 3 smiles) -----------------------------------------------------
const MARRIAGES = ['Corps-Nuds', 'Sainte-Verge', 'Monteton', 'Bourg-la-Reine', 'Bourg-Madame', 'Fourqueux', 'Montcuq']
  .map((name) => def(`mariage_${slug(name)}`, { type: 'marriage', name, smiles: 3 }))

// --- ADULTÈRE (3, 1 smile) ------------------------------------------------------
const ADULTERY = [def('adultere', { type: 'adultery', name: 'Adultère', smiles: 1 }, { count: 3 })]

// --- ENFANTS (10, 2 smiles) -----------------------------------------------------
// genre : décision 11 de Girl Power (docs/extensions/girl-power/girl-power.md)
const CHILDREN = [
  { name: 'Luigi', gender: 'garcon', desc: 'Bébé avec un chapeau vert' },
  { name: 'Leïa', gender: 'fille', desc: 'Bébé avec un nœud et coiffure Leïa' },
  { name: 'Lara', gender: 'fille', desc: 'Bébé avec les cheveux attachés' },
  { name: 'Zelda', gender: 'fille', desc: 'Bébé avec les cheveux comme Zelda' },
  { name: 'Diana', gender: 'fille', desc: 'Bébé avec bandeau Wonder Woman' },
  { name: 'Hermione', gender: 'fille', desc: 'Bébé roux' },
  { name: 'Luke', gender: 'garcon', desc: 'Bébé avec un sabre laser' },
  { name: 'Harry', gender: 'garcon', desc: 'Bébé avec lunettes et cicatrice' },
  { name: 'Rocky', gender: 'garcon', desc: 'Bébé avec gants de boxe et ceinture' },
  { name: 'Mario', gender: 'garcon', desc: 'Bébé avec un chapeau rouge' },
].map((c) => def(`enfant_${slug(c.name)}`, { type: 'child', name: c.name, desc: c.desc, gender: c.gender, smiles: 2 }))

// --- MALUS (37, 0 smile) ----------------------------------------------------------
const MALUS = [
  { key: 'accident', name: 'Accident', count: 5, desc: 'Passe 1 tour', cond: "N'importe qui" },
  { key: 'maladie', name: 'Maladie', count: 5, desc: 'Passe 1 tour', cond: "N'importe qui" },
  { key: 'burnout', name: 'Burn out', count: 5, desc: 'Passe 1 tour', cond: 'Doit avoir un métier' },
  { key: 'licenciement', name: 'Licenciement', count: 5, desc: 'Le métier est défaussé', cond: 'Doit avoir un métier' },
  { key: 'impot', name: 'Impôt sur le revenu', count: 5, desc: 'Dernier salaire non-investi défaussé', cond: 'Doit avoir un métier' },
  { key: 'divorce', name: 'Divorce', count: 5, desc: 'Le mariage est défaussé (adultère : enfants perdus aussi)', cond: 'Doit être marié' },
  { key: 'redoublement', name: 'Redoublement', count: 5, desc: 'Dernière carte études défaussée', cond: 'Doit être étudiant' },
  { key: 'prison', name: 'Prison', count: 1, desc: 'Passe 3 tours, le Bandit est défaussé', cond: 'Doit être Bandit' },
  { key: 'attentat', name: 'Attentat', count: 1, desc: "TOUS les enfants de l'auteur et de la victime sont retirés du jeu", cond: "N'importe qui" },
].map(({ count, ...m }) => def(m.key, { type: 'malus', ...m, smiles: 0 }, { count }))

// --- SPÉCIALES (10, 0 smile) ------------------------------------------------------
const SPECIALS = [
  { key: 'anniversaire', name: 'Anniversaire', desc: 'Chaque joueur vous offre un de ses salaires posés, au choix' },
  { key: 'arcenciel', name: 'Arc-en-ciel', desc: "Jouez jusqu'à 3 cartes d'un coup puis repiochez pour revenir à 5" },
  { key: 'chance', name: 'Chance', desc: 'Piochez 3 cartes, gardez-en une en main, défaussez les deux autres' },
  { key: 'etoile', name: 'Étoile filante', desc: 'Prenez une carte au choix dans la défausse et jouez-la directement' },
  { key: 'heritage', name: 'Héritage', desc: 'Vaut 3 liasses de billets pour vos futurs achats' },
  { key: 'piston', name: 'Piston', desc: 'Posez le métier de votre choix sans les études nécessaires' },
  { key: 'troc', name: 'Troc', desc: 'Échangez une carte au hasard avec le joueur de votre choix' },
  { key: 'tsunami', name: 'Tsunami', desc: 'Toutes les mains sont mélangées et redistribuées' },
  { key: 'vengeance', name: 'Vengeance', desc: 'Infligez un de vos malus reçus à un autre joueur' },
  { key: 'casino', name: 'Casino', desc: 'Misez un salaire. Même niveau : le 2e joueur gagne tout, sinon le 1er' },
].map((s) => def(s.key, { type: 'special', ...s, smiles: 0 }))

// --- ACQUISITIONS (15) --------------------------------------------------------------
// acqType = sous-type affiché (cadre, icône) ; les règles lisent les tags
const ANIMALS = [
  { key: 'chat', name: 'Chat', smiles: 1, emoji: '🐱' },
  { key: 'chien', name: 'Chien', smiles: 1, emoji: '🐕' },
  { key: 'lapin', name: 'Lapin', smiles: 1, emoji: '🐰' },
  { key: 'poussin', name: 'Poussin', smiles: 1, emoji: '🐣' },
  { key: 'licorne', name: 'Licorne', smiles: 3, emoji: '🦄' },
].map((a) => def(a.key, { type: 'acquisition', acqType: 'animal', ...a, cost: 0 }, { tags: ['animal'] }))

const TRAVELS = ['Londres', 'Sydney', 'Le Caire', 'Rio de Janeiro', 'New York']
  .map((name) => def(`voyage_${slug(name)}`, { type: 'acquisition', acqType: 'travel', name, smiles: 2, cost: 3 }, { tags: ['travel'] }))

const HOUSES = [
  { name: 'Maison simple', smiles: 1, cost: 6, count: 2 },
  { name: 'Grande maison', smiles: 2, cost: 8, count: 2 },
  { name: 'Villa', smiles: 3, cost: 10, count: 1 },
].map(({ count, ...h }) => def(slug(h.name), { type: 'acquisition', acqType: 'house', ...h }, { count, tags: ['house'] }))

// --- DISTINCTIONS (3) ---------------------------------------------------------------
const DISTINCTIONS = [
  def('legion', { type: 'distinction', key: 'legion', name: "Légion d'honneur", smiles: 3, desc: 'Interdite aux Bandits (présents ou passés) et aux auteurs d’attentat' }),
  def('grandprix', { type: 'distinction', key: 'grandprix', name: "Grand prix d'excellence", smiles: 4, desc: 'Réservé aux Écrivains, Chercheurs et Journalistes. Salaire niveau 4 tant que vous exercez ce métier' }, { count: 2 }),
]

export const BASE_DEFS = [
  ...STUDIES, ...JOBS, ...SALARIES, ...FLIRTS, ...MARRIAGES, ...ADULTERY, ...CHILDREN,
  ...MALUS, ...SPECIALS, ...ANIMALS, ...TRAVELS, ...HOUSES, ...DISTINCTIONS,
]
