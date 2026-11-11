# Interactions between extensions

What happens when cards from different boxes meet. Written 2026-11-11 from the six rules documents; the physical cards may add cases.

**Nothing here is decided.** Each row has a recommended ruling for Teto to confirm. When a row is ruled, change its Status to `ruled <date>` (and note the ruling if it differs), record it in the specs concerned, and add a test in `tests/combos.test.mjs`.

Codes: **B** base game, **GP** Girl Power, **L** Vie de luxe, **T** Trash, **P** Politique, **F** Fantastique, **A** Apocalypse.

## 1. Where the clashes are

Number of rows in sections 3 to 8 per pair of boxes (a row naming several boxes counts once for each).

| | B | GP | L | T | P | F |
|---|---|---|---|---|---|---|
| **GP** | 2 |  |  |  |  |  |
| **L** | 5 | 5 |  |  |  |  |
| **T** | 3 | 9 | 3 |  |  |  |
| **P** | 4 | 7 | 4 | 2 |  |  |
| **F** | 6 | 5 | 3 | 3 | 3 |  |
| **A** | 5 | 5 | 3 | 3 | 3 | 9 |

The general principles of section 2 apply to every pair and are not counted.

## 2. General principles (apply to every pair)

| # | Question | What the leaflets say | Recommended ruling | Status |
|---|---|---|---|---|
| G1 | Two personal effects contradict (one allows, one forbids). | GP: "the most recently placed wins". F: "le dernier effet posé l'emporte" (Fertilité against Stérilité). | The one placed last wins, for as long as both are in force. If the later one leaves, the earlier one applies again. | open |
| G2 | A réforme forbids something a personal card allows. | P: "une réforme interdisant une action reste prioritaire". | The réforme wins, even if the personal card was placed after it. Ministres and the Président are exempt. This is the one exception to G1. | open |
| G3 | A réforme sets a limit; a personal card removes that limit. | P: "les effets permettant de dépasser une limite s'appliquent". | The personal card wins (Barmaid, Sirène, Maison close, Démontage de cliché). | open |
| G4 | Several effects change the same number (salary level, price, smiles). | P: Grand prix 4 with réforme −1 = 3; level 4 cannot be raised. F: Phénix ×2 ×2 = 6. | Apply "becomes X" effects first (the latest wins), then + and −, then multiply, then the printed bounds (salary 1 to 4, price never below 0). | open |
| G5 | Three boxes have cards that play themselves when drawn, with different exceptions. | A: not with Chance. P: even with Chance. F: with Chance, placed and the two others discarded. | Each box keeps its own printed rule. Chance revealing two such cards: resolve them in the order drawn. | open |
| G6 | Auto-play cards in a starting hand. | A and P: play, redraw. F (éphéméride): back into the deck, redraw. T (Mine): redraw the hand. | Each box keeps its own printed rule, resolved in seating order before the first turn. | open |
| G7 | One "out of the game" pile for all boxes. | GP's spec called it "not browsable"; T, A and F have cards that take from it. | One pile, visible to everyone and browsable. Each recovery card says what it may take (G8). | open |
| G8 | Which out-of-game cards can be recovered? | T Exhumation: "une carte". A Vautour: a card you could place. F Résurrection: an animal or a child. | Any card in the pile regardless of how it got there, within each card's own limits. Ended crises, events and beaten monsters cannot be taken by these three (only the Hacker restarts those). | open |
| G9 | Words for "protected": GP Super bouclier, A Bunker, F Cape, T Partouze flirts, F cards won by a pouvoir éphémère. | Each defines its own scope. | Keep each scope as printed: Super bouclier only against malus aimed at children; Bunker, Cape, Partouze and PE-won cards against anything that takes, discards or removes. | open |
| G10 | "Sans condition" placement against a personal ban (Stérilité, Anneau de pouvoir, Crise sanitaire, Blacklisté). | T: Stérilité does not stop Kid'napping or Exhumation. | "Sans condition" ignores requirements (marriage, studies, limits) and personal bans on placing from hand, but not a global ban in force (Crise sanitaire, a forbidding réforme) and not the Anneau de pouvoir. | open |
| G11 | "Refaire sa main": to what size? | T: "le même nombre de cartes qu'il avait juste avant". | Always to the number held just before the effect, never above the player's current hand size. | open |
| G12 | Hand size when several effects apply (Chercheur 6, Roulette 4, Magicien ±1, Messe noire 6, Crise écologique 1). | none | "Becomes N" effects first (the latest wins), then ±1 effects; Crise écologique overrides everything while it lasts. | open |
| G13 | "Rejouez" from several cards in one turn (Démon, Bling-bling, Carte platinum). | none | Extra turns add up, taken one after another. | open |
| G14 | Game length. Six boxes make about 545 cards. | T: "jouez avec toutes les cartes ou juste une partie au hasard". | No change now. Roadmap step 49 measures real game length and reports before anything is decided. | open |

## 3. Base game

| # | With | Cards | Clash | Recommended ruling | Status |
|---|---|---|---|---|---|
| B1 | F | discard pile | F recalls "from three players" for taking the top of the discard; the game allows it with two. | Check the base rulebook; change the game only if it says three. | open |
| B2 | T | Attentat, Fin précoce, Exhumation | T's Fin précoce line says Attentat sends children to the discard; the game and Exhumation say out of the game. | Out of the game (current behaviour). | open |
| B3 | A, F | flirts | Base: only the top flirt can be stolen. A's weapons and Purge, F's Lasso steal "une carte posée". | Those cards may take any flirt. The top-flirt rule only governs stealing by placing an identical flirt. | open |
| B4 | A, P | fonctionnaires | Base: immune to Licenciement. A's Crise politique and GP's Balance ton porc remove them anyway. | Immunity covers only the Licenciement card and effects that say "follows Licenciement rules" (DRH, PDG). | open |
| B5 | P, L | Bandit | Base: no Impôt on the Bandit. P: taxes hit the Bandit. L: Impôt sur la fortune spares him. | Each as printed. | open |
| B6 | GP, P, L, A | Architecte | Free house: which cards are "houses"? | House = base houses, GP Maisons, L Château and Hôtel particulier, T Maison close (printed). Not P appartements (printed). A Bunker is free by its own text and does not use up the free house. | open |
| B7 | T, F, L | Vengeance | Which new malus can it send back? | Per box: T's rule for permanent malus; L's Dette once paid; A's Virus never once placed; F's maléfices are not malus (F question 7), so no. | open |
| B8 | all | Piston | Which jobs can it place? | Any job except: Grand Prof (base), maires and Président (P), Proviseure without Prof (GP), Dictateur outside a Crise politique (A). Ministres only with a party (P). | open |
| B9 | F, A, L | Médium, Chance, Radar, Boule de cristal, Groloto, Potion de chance | Several cards look at or take from the top of the deck in the same turn. | Each resolves fully before the next. During A's Crise politique the top card is public anyway. | open |
| B10 | F | Fée | "Cartes spéciales du jeu de base" score 2. | Only cards of type special with the base origin. | open |

## 4. Girl Power with the others

| # | With | Cards | Clash | Recommended ruling | Status |
|---|---|---|---|---|---|
| GP1 | T | Coup de foudre, Polygamie | GP: not if already married, "exception: Polygamie". | With Polygamie you may steal a second marriage. | open |
| GP2 | T | Coup de foudre, Mariage forcé, Prêtre | Can it steal a Mariage forcé? Can a Prêtre use it? | Yes; no (a Prêtre cannot be married). | open |
| GP3 | T | Comptable, Agent immobilier, Vétérinaire, argent sale | GP: argent sale does not count for the Comptable. | Argent sale is never counted or taken by the Comptable; it can be given to the Agent immobilier or Vétérinaire if the giver chooses it. | open |
| GP4 | T | Chagrin d'amour, Herpès génital, Partouze | Overlapping flirt removal. | Each as printed. Partouze flirts are immune to both. | open |
| GP5 | T | Démontage (two jobs), Promotion canapé, Anarchie | Which job does the promotion follow? | The job held when the promotion was placed; with two jobs, the player chooses one then. | open |
| GP6 | T | Contraception, Capote trouée | — | Independent: one discards children from hand, the other eases placing them. | open |
| GP7 | T | Super bouclier, Bourreau, Kid'napping, Fin précoce | Scope of the shield. | Fin précoce (a malus) is blocked. Bourreau (a job) and Kid'napping (a special) are not, as the shield covers only malus. | open |
| GP8 | T, F, L | child gender | Trash, Fantastique and Luxe children have no stated gender. | Read from the cards into each table. Péter, Merlin garçons; Buffy fille; Cris garçon; Kim fille (recommended, to confirm). | open |
| GP9 | L | Égalité de salaire, Star, Mariage d'argent | Does "highest placed job level" see the Star? | It looks at the printed level of placed job cards only. | open |
| GP10 | L, T, F, P | Plafond de verre | Can a level be pushed above what the capped job allows? | Plafond limits which *job* you may hold (studies ≤ 4), not the salary level, so salary boosts still apply. | open |
| GP11 | L | DRH, PDG, Bad buzz, Balance ton porc | Losing a job that carries a Star. | The Star always goes with the job. | open |
| GP12 | L | Agent immobilier, Tâches ménagères, Château, Hôtel particulier | Are luxe houses "maisons"? | Yes for both. | open |
| GP13 | P | two jobs, political jobs | Maire "discards your job": which one? Can a political job be the second job? | The player chooses which job is replaced. A political job may sit beside a civil one under Démontage. | open |
| GP14 | P | Répartition des tâches | Could hand a ministry to a player with no party. | The card says jobs are kept "unconditionally"; keep that. The Président is left out of the shuffle. | open |
| GP15 | P | Primes de naissance, taxes | Are primes "argent posé"? Can they pay a tax? | They are not salaries: never taken by a tax; a player with only primes pays nothing. | open |
| GP16 | P | DRH, Balance ton porc, political jobs | Can politicians be fired by them? | Yes unless the card's status says fonctionnaire (DRH) — Balance ton porc ignores status. | open |
| GP17 | P | Tâches ménagères, appartements | Houses only, or housing? | Houses only (the card says "maisons"). | open |
| GP18 | P | Babysitter, Erreur d'étiquetage, Soirée entre filles, Taxe de succession, Allocation familiale | Children move during the game. | Conditions are checked when the tax is drawn or the allocation placed; nothing is undone later. | open |
| GP19 | F | Girl power, Baguette magique, Chaudron | Three ways to replay a used card. | Each replay flips the card again; a card can be replayed by different sources but once per source. | open |
| GP20 | F | Gynocratie / Phallocratie, Sorcière | — | No clash: both use the gender on the card. | open |
| GP21 | F | Démontage (unlimited flirts), Sirène, Vampire | Stacking flirt effects. | Limits lift cumulatively; nothing conflicts. | open |
| GP22 | A | two jobs, Crise politique, Purge, Séisme | Lose both? Which is replaced? | Crise politique: both lost. A job gained by Purge or Séisme fills a free slot, otherwise the player chooses which to replace. | open |
| GP23 | A | Primes de naissance, Crise économique, Coffre-fort | Are primes "salaires"? | No: not discarded by the crisis, and they may still be placed during it. | open |
| GP24 | A | Super bouclier, Crise alimentaire, monsters, Armageddon | Scope. | The shield covers malus only: children can still starve, be given away or be lost to monsters and events. | open |
| GP25 | A | weapons "boost with certain children" | Card data. | Follow the cards; gender is not involved unless printed. | open |
| GP26 | A | Dragon, Vautour | Can the Vautour take a card the Dragon burned? | Yes (G8). | open |

## 5. Vie de luxe with Trash, Politique, Fantastique, Apocalypse

| # | With | Cards | Clash | Recommended ruling | Status |
|---|---|---|---|---|---|
| L1 | T | Mariage d'argent, Polygamie | L: "non cumulable avec un autre mariage". | Mariage d'argent can never be one of two marriages. | open |
| L2 | T | Sugar daddy, Maison close, Partouze | Three sets of flirts outside the limit. | Kept as three separate piles; each scores; none counts toward the limit. | open |
| L3 | T | Impôt sur la fortune, Carte platinum, argent sale | Is argent sale a "salaire posé"? | Counts for Carte platinum (it is a salary), never taken by Impôt sur la fortune (not taxable). | open |
| L4 | P | bijoux, Lingot, Paradis fiscal, taxes | What can a tax take? | Only ordinary taxable salaries not on Paradis fiscal or a Dette. | open |
| L5 | P | Dette, pot commun | Can a politician pay a Dette with pot money? | No: the pot buys acquisitions only. | open |
| L6 | P | Star, réforme économie, Manif anti-riches | Effective salary level. | The Star makes the job level 4 for the Manif and for the "cannot be raised" rule. | open |
| L7 | P | PDG, political jobs | Can the PDG fire them? | As GP16: unless fonctionnaire on the card. | open |
| L8 | F | Groloto, Boule de cristal | L's own note: using the Boule counts as a turn, so no Groloto that turn. | As printed. This also settles F question 24: looking with the Boule de cristal uses your turn. | open |
| L9 | F | Dette, Amulette, Sorcière, Chasseur | "Free" placements while in debt. | Allowed, like every free acquisition. | open |
| L10 | F | Salrapas, Lingot (5), Dette | Exact change with a 5-liasse card; paying a debt. | Salrapas applies to buying acquisitions only, not to paying a Dette. | open |
| L11 | A | Star draw-two, red cards | L: "s'applique pour toutes les cartes piochées sans exception (crises, etc.)". | Both drawn cards are looked at; every red card among them is placed; if both are red the player keeps none. | open |
| L12 | A | Crise économique, bijoux, Lingot, Paradis fiscal | Which money is lost, which can be placed? | Lost: ordinary unspent salaries, argent sale, and salaries on Paradis fiscal. Not lost: bijoux, Lingot. Bijoux can still be placed (not salaries). | open |
| L13 | A | Liquidation totale, Dette, Carte platinum | Free acquisitions. | Allowed in debt; not an "achat" for Carte platinum. | open |

## 6. Trash with Politique, Fantastique, Apocalypse

| # | With | Cards | Clash | Recommended ruling | Status |
|---|---|---|---|---|---|
| T1 | P | argent sale, taxes, pot | Can a tax take argent sale? | No ("non imposable"); the tax takes the last legal salary. | open |
| T2 | P | Anarchie, réformes | Anarchie's "all levels / unlimited / free" against réformes. | Limits are lifted (G3); a forbidding réforme still wins (G2). | open |
| T3 | F | Stérilité, Potion de fertilité | The leaflet's own example. | The one placed last wins (G1). | open |
| T4 | F | Zoophilie, Loup-garou, Phénix | Animal multipliers. | They multiply (G4). The Licorne combo with Zoophilie stays 9 as printed, then other multipliers apply. | open |
| T5 | F | Sextape, Mano negra | Smiles of a card stuck in hand. | Counted like any card in hand. | open |
| T6 | A | Virus, Sextape, Crise écologique | One card in hand, but two cannot be discarded. | Stuck cards do not count toward the one-card limit. | open |
| T7 | A | Hémorragie, Incendie, Tornade, Roulette russe, Virus | Losing the whole hand. | As A prints: the Virus leaves only when the whole hand is lost; these effects do that. | open |
| T8 | A | Chasse ouverte, flipped animals | Are eaten (flipped) animals hunted? | No: flipped cards are not taken by effects. | open |

## 7. Politique with Fantastique, Apocalypse

| # | With | Cards | Clash | Recommended ruling | Status |
|---|---|---|---|---|---|
| P1 | F | éphémérides, réformes | Both sit in the centre. | Independent: an éphéméride never replaces a réforme. | open |
| P2 | F | Restataplas, political jobs | "Aucun avantage professionnel." | The politician loses pot access and exemption from réformes; keeps the job. | open |
| P3 | F | Désenchantement, Référendum, Manif | — | Different targets (objects and potions against réformes and ministres); no clash. | open |
| P4 | A | Crise politique (A), political jobs | "Tous les métiers sans exception." | Political jobs are lost too; none may be placed during it. The Élection still happens. | open |
| P5 | A | Révolution, crises | Does Révolution remove crises? | No, only réformes and the named jobs. | open |
| P6 | A | Crise économique, pot commun, taxes | Is the pot emptied? Can a tax be paid? | The pot is not a player's salary: it stays. Taxes drawn during the crisis collect what little there is. | open |

## 8. Fantastique with Apocalypse

| # | Cards | Clash | Recommended ruling | Status |
|---|---|---|---|---|
| F1 | Lune bleue, red cards | A crisis or monster turned up into the river. | It is played at once, as drawn by the player whose turn it is, and replaced. | open |
| F2 | Boule de cristal, Aveuglement, Crise politique | Seeing the deck when it is face up. | No clash; the Boule shows more than the top card. | open |
| F3 | Magicien, Messe noire, Sirène, Crise écologique, Incendie, Tornade, Inondation | Hand sizes. | G11 and G12. | open |
| F4 | Cape d'invisibilité, Bunker | Two protections. | Both exist; each protects one card and itself. | open |
| F5 | Loup-garou, flipped animals, Mutation génétique | Do eaten animals still score double? | Yes: flipped cards keep scoring, and multipliers apply to what scores. | open |
| F6 | Ange, Apocalypse malus | Are malus maléfices? | No (F question 7): the Ange is immune only to maléfices. | open |
| F7 | Salrapas, Ristournelle, Liquidation totale | Price effects. | Free means nothing to pay, so Salrapas and Ristournelle do not apply. | open |
| F8 | Pleine lune, Crise sanitaire | Several cards against no cards. | The crisis forbids placing; Pleine lune gives nothing while it lasts. | open |
| F9 | Anneau de pouvoir, Purge, Séisme | Receiving a card when you can place none. | The card received is discarded, except for the Démon. | open |
