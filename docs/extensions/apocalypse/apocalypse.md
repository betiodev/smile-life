# Extension spec — Apocalypse

Source: `apocalypse-rules.md` (faithful transcript of the 2-sided leaflet). Rules restated in structured form for implementation; card names kept in French as printed. Weapon power, monster strength and damage, prices and smiles are only on the cards and live in `apocalypse-card-data.xlsx`.

Status: **draft**. Section 13 is empty until Teto rules on the questions in section 14. Nothing in section 14 is decided; each question carries a recommendation only.

**This is the heaviest extension.** It has rules that last several rounds for everyone, monsters that travel round the table, a co-operative mini-game, and an event that turns placed cards face down. It is built last (roadmap steps 42 to 48).

## 1. Overview

- 60 cards: 58 shuffled into the base deck, plus 2 timers (not playing cards).
- Cards with the **red symbol** (monstres, crises, événements) apply to everyone and stack. They are placed face up as soon as drawn, **except with the Chance card**. In a starting hand or after a refill: place it at once and redraw; the player whose turn it is then takes it as if they had drawn it.
- A monster that appears during a crisis or an event is fought first.
- Cards lost to a monster or an event go **out of the game**. Cards lost during a crisis are **discarded**.

## 2. Card list (60)

| Category | Count | Cards |
|---|---|---|
| Crises (red) | 5 | Alimentaire (2 rounds), Écologique (4), Économique (3), Politique (4), Sanitaire (3) |
| Événements (red) | 4 | Armageddon (immediate), Liquidation totale (3), Purge (2), Invasion extraterrestre (4) |
| Monstres (red) | 6 | Escargot mutant, Poisson mortel, Plante carnivore, Robotueur, Zombie, Lézard géant |
| Armes | 15 | Arbalète, Boomerang, Batte, Bazooka, Cocktail Molotov, Couteau, Grenade, Hache, Lance-pierre, Nunchaku, Poing américain, Pistolet, Sabre laser, Shuriken, Tronçonneuse |
| Véhicules | 3 | Hélicoptère, Moto, Tank (also a weapon) |
| Survies | 8 | Bunker, Coffre-fort, Masque à gaz, Menace nucléaire, Potager, Radar, Ration, Trousse de secours |
| Animaux | 3 | Pangolin, Tortue, Vautour |
| Malus | 5 | Bombardement, Mutation génétique, Nuage radioactif, Pénurie d'essence, Virus |
| Métiers | 5 | Croque-mort, Dictateur, Hacker, Ninja, Survivaliste |
| Cataclysmes | 4 | Incendie, Inondation, Tornade, Séisme |
| Timers | 2 | discs with four quarters, for counting rounds |

## 3. New engine concepts

| Concept | Needed by | Mechanism (ARCHITECTURE.md) |
|---|---|---|
| Cards played as soon as drawn, also from starting hands and refills | red cards | `autoPlay`, `draw` |
| A rule for everyone lasting N rounds, counted from one player | crises, timed events | `center`, `meta.timer`, `roundEnd` |
| Several global rules at once | "se cumulent" | `center` holds a list |
| Something travelling round the table, one player at a time | monsters, Nuage radioactif | flow with a per-player step |
| Losing placed cards worth N smiles, chosen by the loser, in a forced order | monster damage | flow |
| One-use placed cards that still score | weapons, vehicles, Ration, eaten animals | `meta.used` |
| A stat on cards, summed across a board | weapon power | definition field, a helper |
| Stealing any placed card | weapon attack, Purge | `steal` |
| Reacting to being attacked | Menace nucléaire | response step |
| Helping another player | Alliance | response step |
| Protected placed cards | Bunker, Coffre-fort | `meta.protectedBy`, `meta.on` |
| An action instead of drawing | Bunker swap, Dictateur's jailing | turn `start` action |
| Hand of one card; "refill as before" | Crise écologique | `handSize`, `refill` option |
| Card stuck in hand, passed on by another card | Virus | `canDiscard`, `stuckInHand` |
| Deck played face up | Crise politique | `sight`, `drawMode` |
| Peeking at the next card | Radar | `sight` |
| Placed cards turned face down and shuffled | Purge | `meta.faceDown`, `canSee` |
| Everyone acts in turn inside one card | Armageddon, Purge, Inondation, Tornade, Séisme | flows |
| A co-operative phase with a shared target | Invasion extraterrestre | flow |
| The game ending early, or boards wiped | failed Invasion | `status`, flow |
| Recovering cards from out of the game | Vautour | `outOfGame` with cause |
| Replaying a finished global card | Hacker | `move` from `outOfGame` |
| A random outcome from a physical act | Bombardement, Mutation génétique | flow, seeded |
| Score penalty | Virus (−3) | `scoreBonus` |

## 4. Crises (red symbol)

- The drawer places the crisis on a timer in front of them and does not play. The next player starts the first round.
- Each time play comes back to the drawer and they have played, the timer advances one notch. When it runs out, the crisis goes out of the game.
- A round counts even if players are skipping turns, fighting a monster, etc.

| Crisis | Rounds | When it appears | While it lasts |
|---|---|---|---|
| Alimentaire | 2 | Everyone feeds each placed child by flipping one placed animal per child (its smiles still count), or with a Ration or the Potager. A child that cannot be fed is given to a player of your choice who can feed it. If nobody can, it is discarded. | No child may be placed unless you can feed it. |
| Écologique | 4 | Everyone discards their hand except one card. | Everyone plays with one card in hand. At the end, hands are refilled "comme avant". The Virus cannot be thrown away during it. |
| Économique | 3 | Everyone discards all placed unspent salaries (argent sale included). | Nobody places salaries (except the Croque-mort). Casino and Héritage remain playable. |
| Politique | 4 | The deck is turned over and played face up; the discard stays accessible. Every job is lost, without exception (Bandit, fonctionnaires…), except the Survivaliste. | No job may be placed, except the Dictateur. The Survivaliste may draw from either side of the deck. |
| Sanitaire | 3 | Everyone shows their hand. A player with the Virus places it at once. | Nobody places cards in front of themselves: only discards and malus on others. Démission and voluntary divorce are allowed. |

## 5. Événements (red symbol)

| Event | Rounds | Effect |
|---|---|---|
| Armageddon | — | Each player chooses one placed card of the player on their left. These are shuffled with the Armageddon card, face down, and turned over one by one: each card revealed goes out of the game, until the Armageddon appears. Spared cards go back to their owners. |
| Liquidation totale | 3 | All acquisitions are free. On their turn each player may place one acquisition without paying (it is their turn's play). |
| Purge | 2 | Everyone flips all their placed cards and may shuffle them: cards already flipped (used weapons, spent money, specials…) become face up, the others face down. Then, in turn, each player takes one face-down card from a player of their choice, turns it up and places it without condition. **A weapon revealed** cannot be taken: its owner instead uncovers one of the taker's face-down cards and places it; this can chain. A stolen marriage is discarded if you are already married. A stolen job may replace yours. Lost studies or flirts do not cost you your job or marriage. Weapons uncovered stay usable afterwards. |
| Invasion extraterrestre | 4 | The game pauses and becomes co-operative. Target = total smiles in all hands when it starts. On your turn: draw (deck only), then throw any card from your hand onto the aliens; its smiles count toward the target. Reached within 4 rounds: aliens and thrown cards go out of the game. **Not reached: the game stops**; placed smiles decide the winner, who may choose to relaunch: all placed cards are discarded and everyone keeps only their hand. Special cards thrown have no effect. Other red cards drawn meanwhile are suffered normally; "seule la purge sera jouée une fois l'invasion terminée". |

## 6. Monstres (red symbol)

- The drawer places the monster and must fight or flee, without drawing; it is their turn.
- **Win:** placed weapons whose total power is at least the monster's combativité. The weapons used are flipped (they still score); the monster goes out of the game.
- **Lose or decline:** the player loses placed cards worth the damage in smiles, out of the game. Marriage before flirts; job before studies. More than the damage if they lack the exact amount. Flipped cards cannot be given.
- Undefeated, the monster moves to the next player, who fights without drawing. After a full round it goes out of the game.
- **Dépouillement:** if a player loses all their face-up placed cards, the monster leaves at once.
- **Alliance:** the fighter may ask others to add their weapons' power. Play resumes after the player who beat the monster.
- **Flight:** flip a vehicle; the monster passes on without attacking you.

## 7. Armes, véhicules, survies, animaux

Acquisitions, free or priced as printed. One-use ones are activated by flipping.

**Armes (×15).** Power, price, smiles, boosts and "free with" are on each card.
- *Attack:* when you place a weapon, if its own power exceeds the total power of all weapons of the player you attack, flip it and steal one of their placed cards. The stolen card must be placeable in front of you. Stolen acquisitions are not paid again. A stolen weapon cannot attack. A stolen job or animal has its effect again.
- *Defence:* your weapons' total power protects you from attacks and fights monsters.

**Véhicules (×3).** Hélicoptère, Moto: paid; flip to flee a monster. **Tank:** vehicle and weapon, usable for one of the two.

**Survies (×8).**

| Card | Effect | Use |
|---|---|---|
| Bunker | Protects one of your placed cards; neither it nor the Bunker can be taken. To change the card, on your turn instead of drawing (it is your turn). A Bandit in the Bunker cannot be sent to Prison. Free for the Architecte. | permanent |
| Coffre-fort | Protects all your placed salaries before and during the Crise économique. Free for the Chef des ventes / achats. | permanent |
| Menace nucléaire | When a player attacks you, you may use it: the attacker throws all their placed cards out of the game. Free for the Chercheur and the Dictateur. | once |
| Masque à gaz | Protects from maladies, Virus and Crise sanitaire. Lets you discard the Virus from your hand. | permanent |
| Potager | Feeds all your children in a Crise alimentaire. Free for the Jardinier. | permanent |
| Radar | Lets you look at the next card of the deck before playing. | permanent |
| Ration | Feeds one child in a Crise alimentaire. | once |
| Trousse de secours | Reduces monster damage (and Mutation génétique) by one smile. Free for Médecin, Chirurgien, Pharmacien. | permanent |

**Animaux (×3).** Placed without condition; effect only when placed; can be eaten in a Crise alimentaire. An animal taken from another player has its effect again.

| Card | Effect |
|---|---|
| Pangolin | "Ne peut pas être mangé." Additional rule: eating it triggers a Crise sanitaire. |
| Tortue | Take the Ninja from the discard, if it is there and you can place it. |
| Vautour | Take a card from out of the game and place it, if you could place it under the rules. |

## 8. Malus

| Card | Effect | Hook |
|---|---|---|
| Bombardement | Choose a placed card of a player. Physically: stand, hold the card at shoulder height and drop it; if it lands even partly on the target, the target goes out of the game. | flow |
| Mutation génétique | Choose an animal of a player; it attacks them. Strength: five blind draws between the animal (0) and the malus card (1), so 0 to 5; damage equals strength. They fight with weapons or flee. The animal then goes out of the game, unless strength was 0. The Licorne is immune. | flow |
| Nuage radioactif | Placed in front of the player on your left: choose one of their received malus to inflict on them again. They pass the cloud on, and so on, stopping before you. A player with no malus is skipped. The last player to suffer it keeps it. | flow |
| Pénurie d'essence | Target cannot use a vehicle to flee a monster. Permanent. | modifier |
| Virus | Stays in your hand all game once drawn, unless you lose your whole hand. Passed on only with a Maladie (or a special: Troc, Tsunami…): you then take a card of your choice from the infected player's hand. The receiver skips a turn. In a Crise sanitaire: place it, redraw, and lose 3 smiles at the end. Médecin, Chirurgien, Pharmacien cannot receive it through a Maladie. Cannot be passed by Vengeance once placed. | `stuckInHand`, `scoreBonus` |

## 9. Métiers

| Card | Type | Effect | Hook |
|---|---|---|---|
| Croque-mort | permanent | Places salaries of every level during crises (sanitaire and économique included). Still loses unspent salaries when the Crise économique appears. | `salaryLevels`, `canPlace` |
| Dictateur | once | Placeable only during the Crise politique (kept afterwards). On one of your turns, jail a player: they skip three turns. | `canPlace`, turn action |
| Hacker | ⚡ | On your turn, relaunch a past crisis or event by placing it again. | `onPlace` |
| Ninja | ⚡ | Take a weapon from the discard, free, and place it. | `onPlace` |
| Survivaliste | permanent | Suffers no crisis, no armed attack, no monster (it passes on). Still suffers malus and events. | modifiers |

## 10. Cataclysmes

Played like base special cards; they affect everyone.

| Card | Effect |
|---|---|
| Incendie | Everyone discards their whole hand, in play order, and redraws the same number. |
| Séisme | You choose one face-up placed card of each player, yourself included (not a malus). They are shuffled and dealt at random; each player places the card received, or discards it if they cannot. Effects of the card received can be reused. The Dictateur cannot be placed outside a Crise politique unless it returns to its owner. |
| Tornade | Everyone gives their whole hand to the player on their left. A Chercheur keeps one card more. |
| Inondation | All hands are laid face up in the centre as a single pool. Starting with you, each player in turn takes one card and places it if they can, otherwise discards it. When the pool is empty, hands are refilled and play resumes with the player whose turn it was. |

## 11. Cards a phone cannot do as printed

| Card | Printed | Proposed stand-in (question in section 14) |
|---|---|---|
| Bombardement | drop the card on the target | question 33 |
| Mutation génétique | five blind draws | five seeded coin flips, shown one by one |
| Alliance, Dictateur's "négocier" | talking | question 21 and 40 |
| Timers | a disc to turn | a round counter on the card |
| Purge "en pouvant les mélanger" | shuffling your own cards | the engine shuffles |

## 12. References outside this extension

- "Argent sale" and (in the Virus text) "Tornade" are internal or Trash references. "Vengeance" is a base card.
- Base jobs given free cards: Architecte, Chef des ventes / achats, Chercheur, Jardinier, Médecin, Chirurgien, Pharmacien.

## 13. Decisions

None yet.

## 14. Remaining questions

Each has a recommendation, not a ruling. Answer in the session for roadmap step 43.

**Red cards and timers**

1. **More than two timed cards at once.** There are two timers. *Recommended:* no limit on screen; every timed card shows its own counter.
2. **Red card found in a refill on someone else's turn.** *Recommended:* as printed: it is placed at once and treated as drawn by the player whose turn it is.
3. **Does the drawer of a crisis or event redraw?** *Recommended:* no; they lose their play and their hand is refilled at end of turn as usual.
4. **Counting rounds when the drawer is skipping turns.** *Recommended:* the notch advances each time the drawer's turn comes up, played or skipped, in line with "un tour est comptabilisé même si…".
5. **Cards lost through the Pangolin's Crise sanitaire.** *Recommended:* it is a crisis, so cards lost are discarded.

**Crises**

6. **Crise alimentaire: the player who receives a child.** *Recommended:* they must feed it at once with one of their own unused means; that is why they were eligible.
7. **Is a flipped (eaten) animal still an animal?** *Recommended:* yes for everything (scoring, effects that count animals) except that it cannot feed a child again.
8. **Pangolin.** *Recommended:* it *can* be eaten, and doing so starts a Crise sanitaire at once (the "additional rule" overrides the first sentence).
9. **Virus when the Crise sanitaire appears: redraw or not?** The two sections disagree. *Recommended:* place it and redraw one card (the Virus section is the more detailed).
10. **Does the Virus count in your hand size?** *Recommended:* yes; it takes one of your places.
11. **Crise sanitaire and the Croque-mort.** *Recommended:* the Croque-mort may place salaries, and only salaries.
12. **Crise politique: is a Dictateur placed during it safe?** *Recommended:* yes; the mass firing happens once, when the crisis appears.
13. **Crise politique: face-up deck.** *Recommended:* everyone sees the top card of the deck; you draw it or take the discard as usual. The Survivaliste may instead draw the bottom card unseen.
14. **Crise politique and fonctionnaires.** *Recommended:* as printed, every job is lost; the base immunity does not apply here.
15. **Survivaliste and crises.** *Recommended:* fully exempt from all five crises, both the opening effect and the lasting rule. He still suffers events and malus; monsters pass him by.
16. **Crise écologique: "refait sa main comme avant".** *Recommended:* back to the player's normal hand size.
17. **Coffre-fort.** *Recommended:* your unspent salaries are not discarded when the Crise économique appears. It gives no right to place salaries during it.

**Monstres**

18. **Who chooses the cards lost to damage?** *Recommended:* the player, subject to the two printed orders (marriage before flirts, job before studies). Overpaid smiles are lost.
19. **Does a player who is skipping turns fight?** *Recommended:* yes ("en toute situation").
20. **Flipped allies' weapons.** *Recommended:* every weapon used, the allies' too, is flipped.
21. **Alliance on phones.** *Recommended:* the fighter taps "Demander de l'aide"; each other player with unused weapons has 20 seconds to offer them or not; no answer = no.
22. **Trousse de secours.** *Recommended:* damage −1 only; the monster's combativité is unchanged.

**Armes**

23. **Attacking a player with no weapon.** *Recommended:* allowed; any power above 0 exceeds 0.
24. **Is attacking compulsory when placing a weapon?** *Recommended:* no; you may place it just to hold it. The attack is only possible at the moment of placing.
25. **Which card can be stolen?** *Recommended:* any face-up, unused, unprotected placed card that the attacker could place, including a flirt that is not on top. (Clashes with the base "only the top flirt" rule: see `INTERACTIONS.md`.)
26. **Tank.** *Recommended:* its use is chosen when it is first used and it is then flipped.
27. **Menace nucléaire: what is an "attaque"?** *Recommended:* an armed attack with a weapon only. The attacker loses every placed card, protected ones excepted.

**Événements**

28. **Armageddon: left neighbour has nothing placed.** *Recommended:* that player contributes no card.
29. **Purge: flipping.** *Recommended:* face-up active cards become hidden and stealable; already-used cards become visible and are safe. Positions are shuffled by the engine.
30. **Purge: a revealed weapon.** *Recommended:* it stays with its owner, face up and usable; its owner then uncovers one of the taker's hidden cards and takes it.
31. **Purge: "2 tours".** *Recommended:* each player takes one card per round for two rounds; then all cards are turned back.
32. **Purge: are flirts stolen freely, and what about Bunker-protected cards?** *Recommended:* any hidden card can be taken; protected cards are not flipped and stay safe.
33. **Bombardement on phones.** *Recommended:* a fixed chance of 50 %, shown as a short falling-bomb animation. Alternative: a timing mini-game where the attacker taps to release.
34. **Invasion: "4 tours".** *Recommended:* four rounds of the table, like every other duration on these cards.
35. **Invasion: red cards drawn during it.** *Recommended:* monsters and crises are suffered at once as usual; a Purge drawn during the Invasion waits until it ends; other events resolve at once.
36. **Invasion failed: relaunch.** *Recommended:* the winner is announced; a "Relancer" button, if tapped by the winner, discards every placed card (malus included), keeps hands and the out-of-game pile, and play continues.
37. **Liquidation totale: which acquisitions?** *Recommended:* every acquisition of every extension, base included; nothing is placed underneath.
38. **Hacker.** *Recommended:* when placed, the Hacker may take one crisis or event from out of the game and it starts again, with the Hacker as its drawer.

**Malus, survies, animaux, cataclysmes**

39. **Mutation génétique draws.** *Recommended:* five independent 50/50 flips.
40. **Dictateur's negotiation.** *Recommended:* no in-game bargaining; the Dictateur simply chooses who is jailed, once.
41. **Nuage radioactif.** *Recommended:* the player before each victim in the chain chooses the malus; it is re-applied only if its conditions are met now, otherwise the cloud moves on. The last victim keeps the cloud as a received malus.
42. **Bunker: against what?** *Recommended:* against everything that takes, discards or removes a card: attacks, malus, monsters' damage, events and cataclysmes. The protected card cannot be chosen as a loss either.
43. **Radar.** *Recommended:* once per turn, before choosing how to draw, you see the top card of the deck.
44. **Vautour / Tortue taken from another player or received in a Séisme.** *Recommended:* the effect happens again, as the leaflet says for stolen animals.
45. **Tornade and the Chercheur.** *Recommended:* the Chercheur keeps one card of their choice and passes the rest; everyone ends with as many cards as their neighbour gave.
46. **Séisme and protected cards.** *Recommended:* a protected card cannot be chosen.
