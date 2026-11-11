# Extension spec — Girl Power

Source: physical rules leaflet (2 pages), photographed 2026-11-04. Rules restated in structured form for implementation; card names kept in French as in game.

## 1. Overview

- 60 cards, shuffled into the base deck. No separate pile, no setup change.
- Theme: gender parity. Introduces **girl/boy children** as a mechanic, multi-job holding, payouts between players, and several permanent effects.
- The leaflet only explains new effects; everything else follows base rules.

### Global rule (applies to ALL extensions)
- **Conflict resolution:** when two cards' effects conflict, the one placed **most recently** wins.
  → Engine requirement: every placed card stores a global placement order (timestamp/counter).

## 2. Card list (60)

| Category | Count | Cards |
|---|---|---|
| Métiers | 11 | Agent immobilier, Babysitter, Comptable, DRH, Hôtesse de l'air, Infirmière, Proviseure, Vétérinaire + Ingénieure, Prof de chimie, Prof de philo (no special ability) |
| Études sup' | 3 | — |
| Flirts | 4 | — |
| Mariages | 2 | — |
| Acquisitions | 6 | Crapaud, Dragon, Super bouclier, Place de concert, Maison ×2 |
| Enfants | 7 | includes "Dany" (see Dragon) |
| Primes de naissance | 5 | — |
| Cartes spéciales | 11 | Coup de foudre, Contraception, Démontage de cliché ×3 (one per advantage), Égalité de salaire, Erreur d'étiquetage, Famille monoparentale, Girl power, Répartition des tâches, Soirée entre filles |
| Malus | 11 | Charge mentale, Chagrin d'amour ×5, Tâches ménagères, Balance ton porc, Gynocratie, Phallocratie, Plafond de verre |

**Numeric card data** (études level, salary, smiles, prices, child genders, flirt/mariage locations, prime thresholds) is not in the leaflet: it lives in the companion card-data table `girl-power-card-data.xlsx`.

## 3. New engine concepts

| Concept | Needed by |
|---|---|
| Child gender (fille / garçon) — **base-game children have a gender too** | Four Women, Gynocratie, Phallocratie, Girl power, Soirée entre filles |
| Extension origin tag on cards | Four Women (counts only Girl Power girls) |
| Holding two métiers at once | Proviseure, Démontage de cliché, Répartition des tâches |
| Transfer of placed salaries between players | Agent immobilier, Babysitter, Comptable, Vétérinaire |
| "Out of game" zone next to discard (not browsable as discard) | Dragon |
| Skip-a-turn status | Vétérinaire, Démission with two métiers |
| Protection flag on placed cards | Super bouclier |
| Flipped/used flag on placed specials | Girl power |
| Global placement order | conflict rule |

## 4. Métiers (⚡ = one-time effect on placement)

| Card | Type | Effect | Hook |
|---|---|---|---|
| Agent immobilier | ⚡ | For each house a player owns, that player gives you one salary of their choice from **any** of their invested salaries (spent on any acquisition, not necessarily that house). A player with no invested salary gives nothing. You place them face up, no condition. | onPlace |
| Babysitter | ⚡ | Take a placed child from another player. If its parent has salary cards in hand, they **must** give you all of them (no choice to abandon the child) and get the child back; you place the salaries, no condition. If they have none, you keep the child placed in front of you. | onPlace |
| Comptable | ⚡ | Take one placed salary from the player with the most placed salaries; place it, no condition. Tie → you choose among tied players. Primes de naissance and argent sale (Trash ext.) don't count. | onPlace |
| DRH | ⚡ | Fire a chosen player (not Fonctionnaire, not Bandit). Follows Licenciement rules. | onPlace |
| Hôtesse de l'air | ⚡ | Take a Voyage from the discard pile and place it for free. | onPlace |
| Infirmière | permanent | You may place level-3 salaries as well as level-1. | canPlaceSalary |
| Proviseure | — | Only placeable if you're already a Prof. You then hold both métiers. Can't keep it without being Prof; can't combine with Grand Prof. | canPlace, onLoseJob |
| Vétérinaire | ⚡ | Each player with at least one animal gives you one placed salary of their choice. A player with no placed salary skips a turn instead. | onPlace |
| Ingénieure, Prof de chimie, Prof de philo | — | No ability. | — |

## 5. Bonus rules (banners, not cards)

Active only when Girl Power is in the game, and only while their condition is met.

| Rule | Effect | Hook |
|---|---|---|
| Four Women | With 4 Girl Power girls placed in front of you, you're immune to Phallocratie and Plafond de verre. | canBeTargeted |
| Ladies Night | +2 smiles at end if you have 1 bar flirt + 2 nightclub flirts placed (or 2 bar + 1 nightclub). | endScoring |

## 6. Acquisitions

| Card | Effect | Hook |
|---|---|---|
| Crapaud | Joke card ("lets you find Prince Charmant" — footnote says not finding him is normal). No mechanical effect beyond normal acquisition. | — |
| Dragon | If you also have Dany (a Girl Power child): burn one placed card from each other player. Burned cards go out of game. Triggers only once, when the second of Dragon/Dany is placed. Can't burn children protected by Super bouclier. | onPlace (Dragon or Dany) |
| Super bouclier | Your already-placed children become immune to maluses targeting them (Attentat, divorce with adultery…). Children placed later aren't covered. Doesn't protect against special cards (e.g. Erreur d'étiquetage). | canBeTargeted |
| Place de concert, Maison ×2 | Standard acquisitions. Houses interact with Agent immobilier and Tâches ménagères. | — |

## 7. Primes de naissance (×5)

- Placeable only when you have at least N children placed (N printed on each prime).
- Once placed, usable to buy acquisitions like a salary.
- Not affected by Impôts; can't be staked at the Casino; don't count for Comptable.

## 8. Malus (apply only to other players)

| Card | Type | Effect | Hook |
|---|---|---|---|
| Charge mentale | ⚡ | Target discards a child. Target must have a métier. | canTarget, onPlace |
| Chagrin d'amour ×5 | ⚡ | Target discards their latest flirt. Target must be unmarried and not in adultery. | canTarget, onPlace |
| Tâches ménagères | permanent | Each of target's houses scores −1 smile at end. | endScoring |
| Balance ton porc | ⚡ | Target loses marriage AND métier (Bandit and Fonctionnaire included). Target must be married AND employed. Uses divorce rules (with/without adultery) and licenciement rules. | canTarget, onPlace |
| Gynocratie | permanent | Target's boys score half (= 1 smile). | endScoring |
| Phallocratie | permanent | Target's girls score half (= 1 smile). Can't be combined with Gynocratie on the same player. | canTarget, endScoring |
| Plafond de verre | permanent | Target can't place a métier above études level 4; if currently in a level-5/6 métier, they're fired. Can still place up to 6 études. Piston and Répartition des tâches temporarily bypass it for the new métier they grant. | canPlace, onPlace |

## 9. Cartes spéciales (playable on your turn, no condition)

| Card | Type | Effect | Hook |
|---|---|---|---|
| Coup de foudre | ⚡ | Steal a placed marriage, even without flirts. If the target is in adultery, they discard the Adultère but keep flirts and children. Not allowed if you're already married (exception: Polygamie, Trash ext.). | canPlay, onPlace |
| Contraception | permanent | On your turn, you may discard a child card from hand and draw again to replay. **Once per turn**, every turn for the rest of the game. | turn action |
| Démontage de cliché ×3 | permanent | Each copy grants one permanent advantage: immune to Accident / unlimited flirts before marriage / two métiers at once. | canBeTargeted, flirt limit, job slots |
| ↳ two-métier sub-rules | | Licenciement: the attacker picks which métier is lost. Démission: one skipped turn to quit one or both (Intérimaire excepted). Études: the first métier placed blocks your études (base rule). | |
| Égalité de salaire | permanent | Your métier's salary level = highest salary level of any placed métier (all players); changes dynamically. Applies to all your métiers; can be placed without a métier to take effect later. | salaryLevel |
| Erreur d'étiquetage | ⚡ | Swap one of your placed children with any placed child of another player. | onPlace |
| Famille monoparentale | scoring | +2 smiles at end if you have at least one child placed and you're not married **at end of game**. | endScoring |
| Girl power | permanent | Each time you place a girl, you may replay one of your placed special cards. Each special can be replayed only once (then flipped). | onPlace (girl) |
| Répartition des tâches | ⚡ | Collect all placed métiers (incl. yours), randomly redistribute to the players who had one. They keep the new métier unconditionally. Bypasses Plafond de verre for that métier. A player with two métiers gets only one back. Proviseure still can't be kept without Prof. | onPlace |
| Soirée entre filles | ⚡ | Every player (you included) reveals all girl children from their hand; **all of them are placed in front of you** (the player of the card), unconditionally. Each player then draws as many cards as they lost. | onPlace |

## 10. Decisions (settled 2026-11-04)

1. Numeric card data → companion table `girl-power-card-data.xlsx`.
2. Base-game children count as filles/garçons for every gender-based effect.
3. Démontage de cliché: 3 copies, one per advantage.
4. Babysitter: paying is mandatory if the parent holds salaries in hand.
5. Agent immobilier: any invested salary counts (not only the house's); no invested salary → nothing.
6. Famille monoparentale: marital status checked at end of game.
7. Contraception: once per turn.
8. Dany is a Girl Power child; the Dragon can't burn children protected by Super bouclier.
9. Four Women and Ladies Night: always-on bonus rules of this extension, active only while their conditions are met.
10. Soirée entre filles: all revealed girls go in front of the player of the card (it's a steal).
11. **Gender of the ten base-game children** (Teto, 2026-11-11): garçons = Mario, Luigi, Rocky, Luke, Harry; filles = Leïa, Lara, Hermione, Diana, Zelda.
12. **The card-data table is correct as filled** (Teto, 2026-11-11), including the three Démontage de cliché rows. One correction: the Notes of Crapaud and Dragon were swapped in the table and have been put right (Crapaud = the Prince Charmant joke; **Dragon = burns a card with Dany**, as the leaflet says). Notes are the text printed on the card.
13. **Études sup'** are three cards worth 1, 2 and 3 study levels. Nothing is printed on the card to say so; the level is recorded in the table's Notes column. A 3-level study card is new compared with the base game.
14. **Small powers printed only on a card** exist and are not in the leaflet. Known so far: Cléo — "Voyage au Caire vaut triple". Always read the Notes column of the table for these.
15. Flirt "À la bibliothèque" allows a child (confirmed).

## 11. Remaining questions

- **Four Women when already hit:** if a player already suffers Phallocratie or Plafond de verre and then reaches 4 Girl Power girls, does the malus stop applying? And if they drop below 4, does it come back?
- **Ladies Night counts:** exactly 1+2 flirts, or at least (e.g. 2 bar + 2 nightclub also qualifies)?
