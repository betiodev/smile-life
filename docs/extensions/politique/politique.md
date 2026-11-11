# Extension spec — Politique

Source: `politique-rules.md` (faithful transcript of the 2-page leaflet "Règles constitutionnelles"). Rules restated in structured form for implementation; card names kept in French as printed. Numbers and most card names are only on the cards and live in `politique-card-data.xlsx`.

Status: **draft**. Section 12 is empty until Teto rules on the questions in section 13. Nothing in section 13 is decided; each question carries a recommendation only.

**This is the extension the leaflet describes least.** It names none of the 10 réformes, 6 partis, 12 métiers, 4 acquisitions or 4 flirts. The card table has to be filled before this spec can be completed; step 32 of the roadmap adds the missing cards here.

## 1. Overview

- 60 cards, shuffled into the base deck.
- Theme: politics. Introduces **réformes** (rules for everyone that last all game and replace each other by domain), **taxes** feeding a **pot commun**, a ladder of political jobs (maire → ministre → Premier ministre / Président), parties, and allocations.
- Cards with the **red symbol** (réformes, events, taxes) are played as soon as drawn and apply to everyone, "même avec Chance etc.". In a starting hand: play them and redraw.

## 2. Card list (60)

| Category | Count | Cards |
|---|---|---|
| Réformes (red) | 10 | Not named. Known from examples and the diagram: économie ±1 liasse on salary level; flirts before marriage limited to 4 (and one at 6); métiers need one study level less; natalité (no child may be placed); enseignement. |
| Partis politiques | 6 | Not named. The diagram shows GAUCHE / MILIEU / DROITE. |
| Métiers (politiques) | 12 | Maires, ministres (one is Ministre de la Justice), Premier ministre, Président de la République. Split not given. |
| Taxes (red) | 8 | Taxe sur le jeu, de séjour, de succession, foncière, locative, sur le bonheur, TVA, sur l'impôt |
| Malus | 3 | Détournement de fonds, Exclusion de parti, Fin de mandat |
| Événements (red) | 3 | Élection présidentielle, Grève, Révolution |
| Cartes spéciales | 5 | Référendum, Remaniement, Manif générale, Manif anti-riches, Manif anti-pauvres |
| Allocations | 5 | Aide au logement, Allocation chômage, Allocation familiale, Bourse étudiante, Prime d'activité |
| Acquisitions | 4 | Appartements |
| Flirts | 4 | not named |

## 3. New engine concepts

| Concept | Needed by | Mechanism (ARCHITECTURE.md) |
|---|---|---|
| Cards played as soon as drawn, also from a starting hand | réformes, taxes, events | `autoPlay`, `draw` |
| Rules for everyone that last all game | réformes | `center`, modifiers with scope "everyone" |
| Replacing a rule of the same domain, restoring the one beneath | réformes, Manif générale | `meta.on` stack |
| Players exempt from global rules | ministres, Président | `resolve` |
| Shared money | pot commun | `pot` zone |
| Buying with someone else's money, and being punished for it | pot purchases, Détournement de fonds | `meta.fraud` |
| A job that requires and replaces another job | Maire, ministres, PM, Président | `canPlace`, `place` with replacement |
| A party card, one at a time | partis | `party` zone |
| Direction of play | partis | `direction` |
| Money usable only to buy | allocations | `money` traits |
| Remembering the past | Allocation chômage (had a job), Détournement (took from the pot) | `history` |
| A vote by all players | Référendum | flow |
| A real-time pause | Grève | driver pause |
| A random draw between two cards | Élection with a sitting Président | flow, seeded |

## 4. Réformes (red symbol)

- Played when drawn, placed in the centre, active for the whole game. Drawing one "compte pour un tour".
- Réformes of different domains sit side by side. A réforme of a domain already present is placed on top and replaces it.
- Not retroactive. They add to the effects of other cards (Grand prix at 4 with −1 = level 3).
- Level-4 jobs cannot be raised further.
- The number of study cards stays limited to 6.
- Effects that let a player exceed a limit still apply (unlimited flirts).
- A réforme that forbids an action has priority (no child may be placed).
- A personal ban (a malus…) still applies under a réforme.
- Ministres and the Président do not suffer the effects of réformes "qui vous déplaisent".

Each réforme's exact text and domain come from the table. Hooks depend on the text: `salaryLevels`, `flirtLimit`, `studyReq`, `canHaveChild`, `studyCardLimit`.

## 5. Partis politiques (×6)

- Placed without condition.
- Mandatory to become ministre or Président.
- One at a time. You may change party on your turn: place the new one, discard the old.
- "Le sens du jeu peut varier (vers la droite ou la gauche) selon les partis posés…": mechanism not given.

## 6. Métiers politiques (×12)

| Card | Effect | Hook |
|---|---|---|
| Maire | Placeable only if you already have a job; that job is discarded. Opens the way to ministre. | `canPlace`, replacement |
| Ministre | Three ways: (a) a party and the required studies; (b) a party and being maire (the maire is discarded); (c) no party, from a specific civil job named on the card (avocat → Ministre de la Justice), which is discarded. | `canPlace`, replacement |
| Premier ministre | Placeable if you are a ministre with a party placed; the ministre is discarded. Same rules as ministres. ⚡ When placed, may fire one ministre. | `canPlace`, `onPlace` |
| Président de la République | Needs a party. Placeable during the Élection, or when already ministre (discarded). ⚡ When placed, may fire all ministres and take all the money of the pot, placed in front of them, mixed with their salaries and safe from Détournement de fonds. May also buy from the pot afterwards. | `canPlace`, `onPlace` |

- Maire, ministre and Président may buy acquisitions with pot money (section 8).
- **Piston** works for ministres (with a party), not for maires or the Président.

## 7. Événements (red symbol)

| Card | Effect | Hook |
|---|---|---|
| Élection présidentielle | Placed in the centre when drawn. A player holding the Président and having a party placed may place it at once, then redraws; the job it replaces is discarded. Play resumes after the player who drew. **If a Président is already placed:** shuffle the Élection and the Président cards and draw one; if the Président comes out he stays, otherwise he is discarded and the Élection goes out of the game. | flow |
| Grève | Play stops for as many minutes as réformes in force, 5 at most; none in force → no stop. A "politique" may resign during the strike; play then resumes at once, at the player whose turn it is. | flow, driver |
| Révolution | The Président, the ministres and every réforme go out of the game. Play resumes with the next player. | `remove` |

## 8. Taxes (red symbol) and pot commun

- Apply to everyone concerned, **Bandit included**, as soon as drawn. Drawing a tax counts as the drawer's turn.
- Each player concerned loses their last placed salary. One salary per player per tax. Only salaries can pay (no Héritage, allocations…). A player with no money placed pays nothing.
- The money goes on top of the tax, next to the deck: this is the pot commun.

| Tax | Who pays |
|---|---|
| Taxe sur le jeu | everyone |
| Taxe de séjour | players with a voyage placed |
| Taxe de succession | players with a child placed |
| Taxe foncière | players with housing placed (house or apartment) |
| Taxe locative | players with no housing placed |
| Taxe sur le bonheur | players with more than 10 smiles placed (flipped cards included) |
| TVA | players with a paid acquisition placed |
| Taxe sur l'impôt | players with an Impôt sur le revenu among their received malus |

**Pot commun.** Maires, ministres and the Président may take money from it at the moment of a purchase, for all or part of the price. An acquisition bought this way is placed **upside down** on the spent salaries ("acquisition frauduleuse") and is exposed to Détournement de fonds.

## 9. Malus

| Card | Effect | Hook |
|---|---|---|
| Détournement de fonds | On a player who has taken money from the pot. They discard their job and the acquisitions paid with pot money. "L'argent est conservé." | `canTarget`, `remove` |
| Exclusion de parti | Target discards their party, without losing their current political job. | `remove` |
| Fin de mandat | Only on a maire: the maire is discarded. | `canTarget`, `loseJob` |

## 10. Cartes spéciales

| Card | Effect | Hook |
|---|---|---|
| Référendum | Choose a réforme in force. Everyone votes for or against, you included. A majority against sends it out of the game; a tie keeps it. | flow |
| Remaniement | Take a ministre, placed or in the discard, and place it in front of you "si posable". | `steal` / `move` |
| Manif générale | Discard a placed réforme or ministre of your choice. Removing a réforme that covered another brings the one beneath back into force. | `remove` |
| Manif anti-riches | Discard every placed job of salary level 4, yours included, except political ones. | `remove` |
| Manif anti-pauvres | Discard every placed job of salary level 1, yours included, except political ones. | `remove` |

The two Manifs use the *effective* salary level (Grand prix, réforme…).

## 11. Allocations, appartements, flirts

- **Allocations** are placed, then used like salaries to buy acquisitions. They cannot pay a tax, be given at an Anniversaire or staked at the Casino.

| Allocation | Placeable if |
|---|---|
| Aide au logement | no housing placed |
| Allocation chômage | no job placed, but you had one before |
| Allocation familiale | at least one child placed |
| Bourse étudiante | at least one study placed and no job |
| Prime d'activité | a job placed |

- **Appartements** are acquisitions with base properties. They are housing for the taxes and Aide au logement. Not free for the Architecte.
- **Flirts**: base properties.

## 12. Decisions

None yet.

## 13. Remaining questions

Each has a recommendation, not a ruling. Answer in the session for roadmap step 32.

**Red cards in general**

1. **What does the drawer's turn look like after a red card?** *Recommended:* the card resolves, the drawer does not play and does not draw a replacement, play passes on. Same for réformes, taxes and events (the Élection text agrees).
2. **Red card obtained other than by the turn's draw (Chance, Médium, refill).** *Recommended:* played the moment it would enter a hand; with Chance the two other cards are discarded and no card is kept. A red card already in the discard cannot be picked up.
3. **Red cards in starting hands.** *Recommended:* resolved in seating order before the first turn, each replaced by a new card; applies to events too.

**Réformes**

4. **What is a "domain"?** Read the cards: the icon or subtitle. The table has a column for it.
5. **Salary below 1 under a −1 réforme.** *Recommended:* the level never goes below 1, mirroring the stated ceiling of 4.
6. **Study requirement below 0.** *Recommended:* it stops at 0.
7. **"Les réformes qui vous déplaisent."** *Recommended:* simple and automatic: a ministre or Président ignores every réforme that restricts them and keeps every réforme that helps them. No choice to make during play.
8. **Are maires and the Premier ministre exempt?** *Recommended:* Premier ministre yes (same rules as ministres); maires no (not listed).

**Partis**

9. **Direction of play.** Read the party cards. *Recommended:* nothing can be decided until the table is filled; if the cards say nothing usable, play stays clockwise.
10. **Does changing party use the turn?** *Recommended:* yes, it is placing a card.
11. **Ministre without a party (path c): what can they not do?** *Recommended:* they cannot become Premier ministre or Président, and Piston does not apply; everything else is as for other ministres.

**Métiers**

12. **Maire: which job can it replace?** *Recommended:* any non-political job. Its studies, salary and smiles come from the card.
13. **Where do fired ministres go, and what do they suffer?** *Recommended:* to the discard, with the base consequences of losing a job. Fonctionnaire-style immunity does not exist for them.
14. **Président: fire all ministres or choose?** *Recommended:* all or none, his choice, Premier ministre included.
15. **Président: pot money taken at placement.** *Recommended:* it becomes ordinary unspent salaries in front of him. Later purchases from the pot are fraudulent like anyone's.
16. **Are political jobs fonctionnaires? Can Licenciement hit them?** Read the "Statut" on the cards. *Recommended:* follow the card.
17. **Remaniement on a placed ministre.** *Recommended:* the victim simply loses the job. The taker must meet one of the three ways of becoming ministre, and their current job is discarded.
18. **Manif générale: can it remove the Premier ministre or the Président?** *Recommended:* Premier ministre yes (a ministre), Président no.
19. **Manifs: are maires "politiques"?** *Recommended:* yes; all twelve cards of this category are spared.

**Événements**

20. **Élection: several players could place the Président.** *Recommended:* only one Président card exists, so only its holder can; they must have a party placed.
21. **Élection: nobody places the Président.** *Recommended:* the Élection card goes out of the game; nothing else happens.
22. **Élection with a sitting Président: who "draws"?** *Recommended:* a 50/50 seeded draw.
23. **Grève on a phone.** There is no clock to watch together. *Recommended:* the game shows a pause of 20 seconds per réforme in force (100 seconds at most) that any player can end by tapping "Reprendre" once all agree, and that ends at once if a politician resigns. Alternative: skip the pause and only keep "a politician may resign".
24. **Grève: what is "démissionner" for a politician?** *Recommended:* the base démission: the job is discarded; here it costs no turn because it ends the strike.
25. **Révolution: who and what goes?** *Recommended:* Président, Premier ministre, all ministres and every réforme including those underneath. Maires, parties and the pot stay.

**Taxes and pot**

26. **"Dernier salaire posé."** *Recommended:* the most recent unspent, taxable salary. Money that cannot pay a tax is skipped; a player with only such money pays nothing.
27. **Taxe sur le bonheur.** *Recommended:* smiles of every card placed in front of the player, flipped ones included, counted as at end of game, strictly more than 10.
28. **TVA: "acquisition payante".** *Recommended:* an acquisition with a printed price, however it was obtained.
29. **What can be bought with pot money?** *Recommended:* anything bought through the normal purchase flow.
30. **Détournement de fonds.** *Recommended:* playable on any player who owns an upside-down acquisition. They lose their current job, whatever it is, and every upside-down acquisition; the spent money stays face down in front of them and still scores.
31. **Exclusion de parti: consequences.** *Recommended:* the job is kept; without a party the player can no longer be promoted until they place a new one.

**Allocations**

32. **Does an allocation stay when its condition stops being true?** *Recommended:* yes; the condition is checked only when placing.
33. **Value and smiles.** Read the cards (table).

**Vote**

34. **Référendum on phones.** *Recommended:* each player taps Pour or Contre, votes hidden until all are in, 30 seconds, no vote = abstention; removed only if Contre has a strict majority of votes cast.
