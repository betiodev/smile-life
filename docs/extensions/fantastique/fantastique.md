# Extension spec — Fantastique

Source: `fantastique-rules.md` (faithful transcript of the 2-page leaflet, © 2023). Rules restated in structured form for implementation; card names kept in French as printed. Prices and smiles are only on the cards and live in `fantastique-card-data.xlsx`.

Status: **draft**. Section 12 is empty until Teto rules on the questions in section 13. Nothing in section 13 is decided; each question carries a recommendation only.

## 1. Overview

- 60 cards: 10 personnages dealt at set-up, 50 shuffled into the base deck.
- Theme: fantasy. Each player gets a **character** for the whole game, with a permanent power and a one-time power usable only during a given **éphéméride**. Éphémérides are drawn from the deck and change a turn rule for everyone until the next one. Adds magic objects, potions and **maléfices** (permanent curses).
- Stated in this leaflet: with other extensions, "le dernier effet posé l'emporte sur le précédent" (Fertilité against Trash's Stérilité).

## 2. Card list (60)

| Category | Count | Cards |
|---|---|---|
| Personnages | 10 | Ange, Démon, Fée, Loup-garou, Magicien, Sirène, Sorcière, Vampire, Chasseur (3+ players), Mutant (3+ players) |
| Éphémérides | 5 | Pleine lune, Lune rouge, Lune bleue, Éclipse, Équinoxe |
| Objets magiques | 13 | Chaudron, Balai, Baguette magique, Lampe magique, Cape d'invisibilité, Boule de cristal, Miroir, Lasso magique, Anneau de pouvoir, Grimoire, Flûte enchantée, Amulette ×2 |
| Potions magiques | 11 | Intérim, Vitalité, Fertilité, Amour éternel, Ristournelle, Argent, Épousailles, Savoir, Résurrection, Chance, Excellence |
| Maléfices | 10 | Casburnas, Restataplas, Salrapas, Mano negra, Aveuglement, Alcatras, Bisrepetitas, Minus miserabilis, Maxus miserabilis, Désenchantement |
| Animaux | 4 | Phénix, Chauve-souris, Hibou, Rat |
| Voyages | 4 | Transylvanie, Atlantide, Écosse, Salem |
| Enfants | 3 | Péter, Merlin, Buffy |

## 3. New engine concepts

| Concept | Needed by | Mechanism (ARCHITECTURE.md) |
|---|---|---|
| A fixed character per player, dealt at set-up | personnages | set-up flow, `character` zone |
| One-time power tied to a global card | pouvoirs éphémères | turn `start` action, `history.ephemeralUsed` |
| A global rule replaced by the next one | éphémérides | `center`, `autoPlay` |
| Several plays or several discards in a turn | Pleine lune, Lune rouge | turn flow `plays` |
| A river that appears and disappears | Lune bleue | `river` (already in the engine) |
| Free démission / divorce | Éclipse, Potion d'intérim | turn `start` action |
| Trade the drawn card | Équinoxe | flow |
| Permanent curses on a player | maléfices | `malus` zone, modifiers |
| Immunity to a whole class of cards | Ange | `canTarget` |
| Play first, draw afterwards | Aveuglement | `drawMode` |
| Protected placed card | Cape d'invisibilité, cards won by a pouvoir éphémère | `meta.protectedBy` |
| Cancelling a card's permanent effect while it stays and scores | Désenchantement | `meta.used` |
| Replaying a used card | Chaudron, Baguette magique | `flip` back + re-trigger |
| Two cards that combine | Amulettes → Talisman | `cardPlaced` |
| Permanent hand-size change | Magicien, Messe noire | `handDelta`, `handSize` |
| Looking at all hands and the deck | Boule de cristal, Magicien, Sirène | `sight` |
| Interrupting another player's action | Chasseur | response step |
| Copying another character's power | Mutant | modifier indirection |
| Buying placed cards from other players | Démon | flow, `price` = smiles |
| Random reveal among face-down cards | Loup-garou, Sorcière, Flûte enchantée | flows, seeded |
| Hidden bonus rule | Messe noire | bonus rule |
| Score multipliers by character | Fée, Loup-garou, Magicien, Vampire, animals, children | `cardSmiles` |

## 4. Set-up

- Deal one personnage at random to each player; the others are put away. It is placed visibly and never changes.
- Chasseur and Mutant: from 3 players.
- Shuffle the other 50 cards into the deck.
- An éphéméride in a starting hand goes back into the deck at a random place; draw a replacement.

## 5. Personnages

PP = permanent power. PE = pouvoir éphémère: once per game, on your turn, during the éphéméride named; using it is your turn. You may never use it. Children and animals gained through a PE are flipped: protected and kept until the end.

| Character | PP | PE (during) |
|---|---|---|
| Ange | No maléfice can be inflicted on you. | (Éclipse) Cancel one player's maléfice. They may negotiate with you for it. |
| Démon | Play again after each malus you send. | (Lune rouge) Buy placed cards from the other players and place them under the normal rules. Price = the card's smiles, exact change, one card per player. Spent salaries are flipped. |
| Fée | Your placed special cards from the base game score 2 smiles. | (Lune bleue) Take in front of you, without condition, all children in the hands (yours too) OR those in the discard. |
| Loup-garou | Your placed animals score double. | (Pleine lune) Each player lays their animals and children face down; you turn one card per player: an animal comes to you, a child goes out of the game. |
| Magicien | Your placed studies score 2 smiles. | (Éclipse) Look at every hand and take one card from one player. They play with one card fewer, you with one more, until the end. |
| Sirène | Unlimited flirts, even married. | (Lune bleue) Take every hand, look, and redistribute as you like, yourself included; each player gets back as many cards as before. |
| Sorcière | Potions are free. | (Pleine lune) Announce boys OR girls. All placed children are shuffled face down and turned one by one: you take each one that matches; the first that doesn't ends it and the rest go back to their owners. |
| Vampire | Your placed flirts score 2 smiles. | (Lune rouge) Take from the other players every placed flirt that doubles one of yours. No flirt limit (they are set apart), even married. |
| Chasseur | Magic objects are free. | (no éphéméride) Block a player's PE at the moment they activate it. They lose their turn and their PE (except with the Talisman). Usable once. |
| Mutant | Copy the PP of one player, announced at the start. | (Équinoxe) Change to another player's PP, until the end. Copying the Ange is not retroactive on maléfices already received. |

**Messe noire** (hidden rule, printed upside down): if Démon, Vampire and Sorcière are all in the game, the first of them to have exactly 13 smiles placed draws 13 cards, gives one of their choice to each of the three, and puts the rest back in the deck. Those three then play with 6 cards until the end.

## 6. Éphémérides

Placed in the centre as soon as drawn; the drawer does not redraw and play passes to the next player. It lasts until another éphéméride replaces it. Drawn with Chance: it is placed and the two other cards are discarded.

| Éphéméride | Rule for everyone | PE of |
|---|---|---|
| Pleine lune | You may place several cards in front of you on your turn, then refill. Not combined with a malus or a discard. | Sorcière, Loup-garou |
| Lune rouge | You may discard several cards on your turn, then refill. Not combined with a malus or placing a card. | Vampire, Démon |
| Lune bleue | A river of three face-up cards next to the deck. On your turn take from the river OR the deck OR the discard. A river card may be played at once or kept. It is replaced from the deck. At the end the river goes to the discard. | Sirène, Fée |
| Éclipse | You may resign and/or divorce without losing your turn. | Ange, Magicien |
| Équinoxe | After looking at the card you drew, you may give it to another player and take a random card from their hand, then play. | Mutant |

## 7. Objets magiques

Bought like acquisitions, price on the card. EP = permanent, EI = once, when placed.

| Card | Effect | Hook |
|---|---|---|
| Chaudron (EI) | Replay one of your placed potions, even after a Désenchantement. | `onPlace` |
| Balai (EP, free for Sorcière) | Your voyages score double and are free. | `price`, `cardSmiles` |
| Baguette magique (EI, free for Fée) | Replay a special card placed in front of you. | `onPlace` |
| Lampe magique (EI) | Take three cards from the discard and place them, under the normal rules. | `onPlace` |
| Cape d'invisibilité (EP) | Protect one of your placed cards under it. Neither can be taken from you. | `isProtected` |
| Boule de cristal (EP, free for Médium) | On your turn, look at every hand and the deck. | `sight` |
| Miroir (EI) | Send a maléfice you received to a player of your choice. Sent to the Ange, it has no effect. | `onPlace` |
| Lasso magique (EI, free with Diana) | Steal a placed card and place it under the normal rules. Not a card already used (spent salary, used potion). | `steal` |
| Anneau de pouvoir (EP) | Once placed, you can place no other card in front of you, unless you are the Démon. | `canPlace` |
| Grimoire (EI, free for Magicien) | Steal a placed study card from any player and place it, without condition or study limit. The victim keeps their job. | `steal` |
| Flûte enchantée (EI) | The animals of a player of your choice are shuffled face down; take one at random. | flow |
| Amulette ×2 (one use) | On a later turn, place any acquisition without paying; the Amulette is flipped like a spent salary. | `price` |
| Talisman (both Amulettes, unflipped) | At that moment: cancel a maléfice you received, or replay your PE whatever the éphéméride. Both Amulettes are flipped. | `cardPlaced` |

## 8. Potions magiques

Bought; the effect applies as soon as placed.

| Potion | Effect | Hook |
|---|---|---|
| Intérim (EP) | Resign without losing your turn. | turn action |
| Vitalité (EP) | No more Maladie or Burn out for you. | `canTarget` |
| Fertilité (EP) | Children without marriage or flirt. | `canHaveChild` |
| Amour éternel (EP) | No more Divorce for you. Placeable without a marriage. | `canTarget` |
| Ristournelle (EP) | Your next purchases cost one liasse less. | `price` |
| Argent (EI) | All your spent salaries are turned face up and can be used again. | `flip` |
| Épousailles (EI) | Take a marriage from the discard, if unmarried, and place it, even with no flirt. | `move`, `place` |
| Savoir (EP) | Your study level is doubled. Losing the potion does not affect your current job. | `studyLevel` |
| Résurrection (EI) | Take an animal or a child from out of the game and place it without condition. | `move`, `place` |
| Chance (EI) | Choose one card among the next 10 of the deck; leave the others; play. | flow, `sight` |
| Excellence (EP) | Lets you place the Grand prix d'excellence, sooner or later, with any job. | `canPlace` |

## 9. Maléfices

Inflicted on other players, on your turn, without condition. Permanent. Playing one is your turn.

| Maléfice | Effect on the target | Hook |
|---|---|---|
| Casburnas | Impôt and Burn out can hit you even with no job. | `canTarget` |
| Restataplas | You no longer benefit from any professional advantage. | modifier filter |
| Salrapas | You must pay acquisitions with exact change. | `paymentRule` |
| Mano negra | At the end, subtract the smiles of your hand from your score. | `scoreBonus` |
| Aveuglement | Play, then draw. Except when taking the top of the discard. Also with the river. If you draw-and-place an éphéméride, draw again. | `drawMode` |
| Alcatras | Prison can be inflicted on you without being the Bandit. If it is, only the Prison card is discarded. Once only. | `canTarget` |
| Bisrepetitas | Maladie, Burn out and Accident make you skip two turns. | `skipLength` |
| Minus miserabilis | No more level-1 salaries. Not combinable with Maxus. | `salaryLevels`, `canTarget` |
| Maxus miserabilis | No more level-4 salaries. Not combinable with Minus. | `salaryLevels`, `canTarget` |
| Désenchantement | Cancels the permanent effect of one magic object or potion (smiles still count). | `flip` |

Minus and Maxus do not apply to special cards (Casino, Anniversaire…).

## 10. Animaux, voyages, enfants

| Card | Bonus | Hook |
|---|---|---|
| Voyage en Transylvanie / Atlantide / Écosse / à Salem | Free for the Vampire / Sirène / Chasseur / Sorcière. | `price` |
| Péter / Merlin | +1 smile for the Fée / Magicien. | `cardSmiles` |
| Buffy | +1 smile for the Chasseur. Cannot be placed by the Vampire. | `cardSmiles`, `canPlace` |
| Phénix | Scores double with the Potion de résurrection (Loup-garou + Phénix + potion = 6). | `cardSmiles` |
| Chauve-souris / Hibou | Scores double for the Vampire / Magicien. | `cardSmiles` |
| Rat | "Juste un rat !" | — |

## 11. References outside this extension

- **Médium** and **Diana** are base-game cards (a job and a child). Confirmed present in the base data.
- "cf. agissements" in the leaflet points to a section that does not exist.
- The leaflet recalls that taking the top of the discard is "à partir de trois joueurs". The game currently allows it with two. This is a **base-rule question**, listed as number 1 below.

## 12. Decisions

None yet.

## 13. Remaining questions

Each has a recommendation, not a ruling. Answer in the session for roadmap step 37.

**Base rule**

1. **Taking the top of the discard pile with two players.** The leaflet says three or more; the game allows two. *Recommended:* check your base rulebook. If it says three, the game should change, as a separate small step.

**Set-up and characters**

2. **Two players.** *Recommended:* deal among the eight characters that work with two.
3. **Chasseur's PE has no éphéméride.** *Recommended:* usable under any éphéméride, or none.
4. **How is "protected and flipped" shown, and do those cards score?** *Recommended:* they stay readable with a protection mark; they score; no effect can take or remove them.
5. **Démon PE.** *Recommended:* at most one card from each opponent in the one activation; only cards not already used; the Démon must be able to place each one; paid from his placed money with exact change. The seller gets nothing.
6. **Démon PP "rejouez après chaque malus".** *Recommended:* one more whole turn after each malus or maléfice he sends.
7. **Are maléfices "malus"?** The leaflet uses the words separately. *Recommended:* they are a different category: base cards that say "malus" (Vengeance, immunities) do not cover maléfices, and the Ange's immunity does not cover malus. The Démon's replay covers both, since he "sends" both.
8. **Fée PE "enfants en main".** *Recommended:* every child in every hand; the players redraw.
9. **Fée PP "du jeu de base uniquement".** *Recommended:* special cards with the base origin tag, placed in front of the Fée, 2 smiles each.
10. **Magicien PE and other hand-size effects.** *Recommended:* it is a permanent ±1 that adds to any other hand-size rule.
11. **Vampire PE "en double des vôtres".** *Recommended:* same place name as one of his placed flirts. The flirts taken score (double, by his PP) and sit apart from the limit.
12. **Mutant and "gratuit pour X".** *Recommended:* the Mutant copies only the PP sentence. Card bonuses that name a character (free Balai for the Sorcière) do not transfer.
13. **Mutant at set-up.** *Recommended:* chooses after all characters are revealed, before the first turn.
14. **Ange PE negotiation.** *Recommended:* no in-game bargaining; friends talk it over, the Ange simply chooses a maléfice to cancel.
15. **Buffy and the Vampire.** *Recommended:* the Vampire can never have Buffy in front of him, by any means.

**Messe noire**

16. **Reading.** *Recommended:* it triggers once per game, the first time one of the three ends a turn with exactly 13 smiles placed. That player looks at the top 13 cards and gives one to each of the three (themselves included). All three then have a hand size of 6.

**Éphémérides**

17. **Pleine lune / Lune rouge: any limit?** *Recommended:* none; as many as you want, then refill to hand size.
18. **Lune bleue and the discard pile.** *Recommended:* the normal rules for taking from the discard still apply.
19. **Équinoxe.** *Recommended:* optional for the drawer, every turn, on the turn's draw only; the other player cannot refuse.
20. **Éclipse.** *Recommended:* resign and/or divorce at the start of the turn, then draw and play normally.
21. **Éphéméride drawn with Chance.** *Recommended:* it is placed, the two others are discarded, the player keeps none.
22. **Éphéméride and auto-play cards of other extensions.** See `INTERACTIONS.md`.

**Objets magiques**

23. **Anneau de pouvoir "ou le défausser en cours de jeu".** *Recommended:* this means discarding it from your hand instead of placing it. Once placed it stays. Its owner can still play malus and maléfices on others.
24. **Boule de cristal.** *Recommended:* looking is your turn's action: you look instead of playing a card. The Vie de luxe leaflet says so ("utiliser la boule de cristal compte pour un tour de jeu").
25. **Cape d'invisibilité and Désenchantement.** *Recommended:* the Cape protects itself, so Désenchantement cannot target it.
26. **Amulette "lors d'un tour suivant".** *Recommended:* any later turn of yours.
27. **Talisman.** *Recommended:* both Amulettes must be face up in front of the same player; the choice is made when the second is placed.
28. **Lampe magique.** *Recommended:* up to three cards, each must be placeable when taken; acquisitions among them are placed without paying.
29. **Miroir on the Ange.** *Recommended:* the maléfice is discarded with no effect.

**Potions**

30. **Ristournelle.** *Recommended:* every later purchase, −1, never below 0, applied after other discounts.
31. **Savoir and the Magicien.** *Recommended:* Savoir doubles the study *level* for job requirements; the Magicien doubles study *smiles*. They do not interact.
32. **Phénix "= 6".** *Recommended:* multipliers multiply: base × 2 (potion) × 2 (Loup-garou).
33. **Excellence.** *Recommended:* it removes the "trophy job" condition of the Grand prix; everything else about the Grand prix is the base rule.
34. **Argent.** *Recommended:* spent salaries become unspent again; acquisitions they paid for stay.

**Maléfices**

35. **Désenchantement: who chooses the card?** *Recommended:* the player who inflicts it.
36. **Alcatras "une seule fois".** *Recommended:* one Prison; after it the Alcatras is flipped.
37. **Second of Minus / Maxus on the same player.** *Recommended:* it cannot be played on them.
38. **Restataplas.** *Recommended:* every permanent or instant advantage printed on the target's job cards stops applying to them, good or bad; the job's salary level and smiles stay.
39. **Salrapas and overpaying.** *Recommended:* the base game allows overpaying for lack of change; under Salrapas the total must equal the price exactly, otherwise no purchase.
40. **Mano negra.** *Recommended:* the smiles printed on the cards in the target's hand when the game ends, before hands are discarded.
