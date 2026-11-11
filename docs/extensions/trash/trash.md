# Extension spec — Trash

Source: `trash-rules.md` (faithful transcript of the 2-page leaflet, © 2020, "public averti"). Rules restated in structured form for implementation; card names kept in French as printed. Numbers that are only on the cards live in `trash-card-data.xlsx`.

Status: **draft**. Section 11 is empty until Teto rules on the questions in section 12. Nothing in section 12 is decided; each question carries a recommendation only.

## 1. Overview

- 55 cards, shuffled into the base deck. No set-up change. The leaflet allows playing with all cards "ou juste une partie au hasard".
- Theme: adult black humour. Introduces dirty money, an out-of-game zone you can recover from, permanent malus on the way a player draws, cards stuck in hand, and several "everybody is involved" specials.
- The Policier now also chases the Proxénète and the Dealer.

## 2. Card list (55)

| Category | Count | Cards |
|---|---|---|
| Métiers | 5 | Acteur porno, Bourreau, Dealer, Prêtre, Proxénète |
| Flirts | 6 | not named in the leaflet |
| Mariages forcés | 2 | — |
| Enfants | 2 | not named in the leaflet |
| Argent sale | 5 | level 1 ×1, level 2 ×2, level 3 ×1, level 4 ×1 |
| Acquisitions | 10 | Cannabis ×2, Cocaïne ×3, Héroïne ×3, Maison close, Tourisme sexuel |
| Malus | 10 | Amputation, Exhibition, Fin précoce, Hémorragie, Herpès génital, Mine antipersonnel, Overdose, Poupée vaudou, Prise d'otage, Stérilité |
| Cartes spéciales | 10 | Capote trouée, Échangisme, Exhumation, Kid'napping, Partouze, Promotion canapé, Polygamie, Sado-maso, Trafic d'organes, Zoophilie |
| Cartes très spéciales | 5 | Chasse ouverte, Extorsion capitaliste, Extorsion communiste, Roulette russe, Sextape |

## 3. New engine concepts

| Concept | Needed by | Mechanism (ARCHITECTURE.md) |
|---|---|---|
| Money placed without a job, not taxable | Argent sale | `money` traits |
| Out-of-game zone that cards come back from | Bourreau, Fin précoce, Chasse ouverte, Exhumation | `outOfGame` with cause |
| Permanent malus on drawing | Amputation, Exhibition, Hémorragie | `drawMode`, `sight` |
| Card that acts when drawn | Mine antipersonnel | `autoPlay` |
| Card that cannot leave the hand | Sextape | `canDiscard`, tag `stuckInHand` |
| Permanently smaller hand | Roulette russe | `handDelta` |
| "Redraw to the number you had" | very special cards, Poupée vaudou, Partouze | `refill` option |
| Two marriages | Polygamie | `marriageSlots` |
| Marriage without a flirt | Mariage forcé | `canPlace` |
| A job that forbids marriage | Prêtre | `canPlace` |
| Flirts kept apart, protected | Partouze | `meta.on`, `meta.protectedBy` |
| Looking at hands | Échangisme, Trafic d'organes | `sight` |
| Everyone acts in turn | Roulette russe, Trafic d'organes, Extorsions, Poupée vaudou | flows |
| Draw until a marker card | Chasse ouverte | flow, seeded |
| Skip count computed from the board | Overdose, Prise d'otage | `skip` |
| Global bonus rule from a set of jobs | Anarchie | bonus rule, tags |
| Score doubling and end-of-game comparison | Zoophilie, Sado-maso, bonus addictif | `cardSmiles`, `scoreBonus` |

## 4. Métiers and mariages forcés

| Card | Type | Effect | Hook |
|---|---|---|---|
| Acteur porno | permanent, intérimaire | The only one who can place the Sextape. | `canPlace` (Sextape) |
| Bourreau | ⚡, intérimaire | Remove a child or an animal of another player; it goes out of the game. | `onPlace` |
| Dealer | permanent | Places drugs without paying. | `price` |
| Prêtre | permanent | Cannot be married; can flirt and have children, even under Stérilité. | `canPlace`, `canHaveChild` |
| Proxénète | — | No ability described. Half price on the Maison close. | `price` |
| Mariage forcé ×2 | — | A marriage that needs no flirt. | `canPlace` |

**Policier (base):** when placed, also sends the Proxénète and the Dealer to the discard, and blocks them while in post, as for Bandit and Gourou. Implemented with the tag `outlaw`.

## 5. Bonus rule — Anarchie

If Bandit, Gourou, Proxénète and Dealer are all on the table: "ces métiers peuvent alors cumuler" salaries of every level, unlimited flirts before or after marriage, children without marriage, free acquisitions. It ends when one of the four is stopped (licenciement, démission, prison, Policier).

Hooks: `salaryLevels`, `flirtLimit`, `canHaveChild`, `price`.

## 6. Argent sale (×5)

- Placed without condition, with or without a job.
- Not taxable. If the last salary is argent sale, Impôt takes the last legal salary instead.
- Otherwise used like salaries: purchases, Casino, Anniversaire.

## 7. Acquisitions

| Card | Effect | Hook |
|---|---|---|
| Cocaïne ×3, Héroïne ×3 | "Bonus addictif": more smiles when you hold several of the same drug; value on the card. Counted by Overdose. | `cardSmiles` |
| Cannabis ×2 | No rule in the leaflet. | — |
| Maison close | Afterwards you place flirts without condition or limit, even married. Half price for the Proxénète, free for the Architecte (if the free house is unused). | `flirtLimit`, `canPlace`, `price` |
| Tourisme sexuel | Placed like a voyage. Free for the Pilote. | tag `travel` |

## 8. Malus

| Card | Type | Effect | Hook |
|---|---|---|---|
| Amputation | permanent | Target can no longer draw from the discard pile, except through Étoile filante or Astronaute. | `drawMode` |
| Exhibition | permanent | Target shows every card they draw until the end of the game. | `sight` |
| Fin précoce | ⚡ | Target loses their last child; it goes out of the game. | `remove` |
| Hémorragie | lasting | Target plays or discards without drawing, each turn, until their hand is empty; then refills. | `drawMode` |
| Herpès génital | ⚡ | Target discards their last flirt, even married. An "identical" flirt placed by anyone is discarded too. | `remove` |
| Mine antipersonnel | when drawn | Whoever draws it discards their hand at once and redraws it. Same if it arrives in a starting hand or a refill. | `autoPlay` |
| Overdose | ⚡ | Target skips as many turns as Héroïne and Cocaïne cards placed. | `skip` |
| Poupée vaudou | ⚡ | Target suffers every malus from their own hand and the other hands that can be inflicted on them, in play order. Two identical malus may stack here. Players who supplied malus redraw. | flow |
| Prise d'otage | ⚡ | Target is taken hostage. The attacker picks another player and takes every salary from that player's hand as ransom, placing them without condition. The hostage skips turns according to the ransom (scale on the card). With two players, the hostage pays. | flow, `skip` |
| Stérilité | permanent | Target cannot have children any more, except through Kid'napping, Prêtre, Exhumation "etc." | `canHaveChild` |

**Vengeance (base):** a permanent malus can be sent back. Hémorragie only once it has run its course. For Poupée vaudou, only the doll is sent, and it acts again.

## 9. Cartes spéciales

| Card | Type | Effect | Hook |
|---|---|---|---|
| Capote trouée | permanent | "Permet d'avoir un enfant (unique) à chaque dernier flirt", except under Stérilité. | `canHaveChild` |
| Échangisme | ⚡ | Look at "le jeu de chacun", then swap your hand with one player, or not. Uneven hands: swap enough cards for each to keep their count. | `sight`, flow |
| Exhumation | ⚡ | Take a card from the out-of-game zone and place it without condition. | `move`, `place` |
| Kid'napping | ⚡ | Take a placed child from another player and place it without condition. | `steal` |
| Partouze | ⚡ | Place all your flirts and all flirts from the other hands, without condition or limit. Players redraw. These flirts are flipped and protected, counted apart from the 5, and cannot be taken. | flow, `meta` |
| Polygamie | permanent | Two marriages at once. Can be placed before any marriage. Suffered Divorce: lose one. Voluntary divorce: discard both, skip one turn. No new flirts after the first marriage; no two Adultères. | `marriageSlots` |
| Promotion canapé | lasting | Needs a job. Salary one level higher with the current job. Kept but void after démission or licenciement. | `salaryLevels`, `jobLost` |
| Sado-maso | scoring | +3 smiles if you have collected the most malus at the end. Ties count. | `scoreBonus` |
| Trafic d'organes | ⚡ | Each player looks at their left neighbour's hand and takes a card. The card taken by the first player cannot be taken from them in the last pick. | flow, `sight` |
| Zoophilie | scoring | Each of your placed animals scores double. Licorne with Étoile filante and Arc-en-ciel: 9 smiles. | `cardSmiles` |

## 10. Cartes très spéciales

Played like special cards. General note: a player who "refait sa main" after an action redraws to the number of cards they had just before.

| Card | Effect | Hook |
|---|---|---|
| Chasse ouverte | Shuffle every placed animal (yours too) with this card, face down. Reveal one by one: each animal revealed goes out of the game, until the Chasse card appears. Spared animals go back to their owners. | flow |
| Extorsion capitaliste | Everyone lays down all salaries from their hand. Whoever has the most "liasses" takes everything and places it. Everyone redraws. A tie sends all of it to the discard. | flow |
| Extorsion communiste | Take every unspent placed salary of all players, yours included. Shuffle and deal them out to everyone, starting with you. | flow |
| Roulette russe | After drawing, lay your whole hand (this card included) face down in the centre and shuffle. The game pauses. Each player in turn draws one of the cards; cards other than the Roulette are discarded. Whoever draws the Roulette gives you a card of your choice from their hand and plays with 4 cards for the rest of the game; you refill to 5. If you draw it yourself, you refill to 4 for the rest of the game. | flow, `handDelta` |
| Sextape | Stays in your hand all game. Only the Acteur porno can place it. Can be discarded by Hémorragie, Mine antipersonnel, Roulette russe…, or change hands by Troc, Tsunami, etc. | `canDiscard`, `canPlace` |

## 11. Decisions

None yet.

## 12. Remaining questions

Each has a recommendation, not a ruling. Answer in the session for roadmap step 26.

**Cards the leaflet doesn't describe**

1. **The 6 flirts and 2 enfants: any effect?** Read the cards (table). *Recommended:* plain cards unless the card says otherwise.
2. **Proxénète: status, salary, ability.** Read the card. *Recommended:* no ability beyond the Maison close discount.
3. **Cannabis: is it a "drogue" for the Dealer, for Overdose?** *Recommended:* free for the Dealer (it is a drug), not counted by Overdose (which names only héroïne and cocaïne), no bonus addictif unless printed.
4. **Mariage forcé while already married, or on a Prêtre.** *Recommended:* same limits as any marriage: not if already married (unless Polygamie), never for the Prêtre.

**Métiers and Anarchie**

5. **Anarchie: "réunis sur la table".** *Recommended:* across all players, not in front of one.
6. **Anarchie: who benefits?** *Recommended:* each player holding one of the four jobs, for as long as all four are on the table.
7. **Bourreau: who chooses, and do protections apply?** *Recommended:* the Bourreau chooses any one child or animal of one opponent; cards protected by another extension cannot be chosen.

**Argent sale**

8. **Impôt when the target has only argent sale.** *Recommended:* Impôt cannot be played on them.
9. **Does argent sale need to respect the job's salary level?** *Recommended:* no ("sans condition").

**Acquisitions**

10. **Maison close half price on an odd price.** *Recommended:* round up, as for houses when married.
11. **Is the Maison close a house?** *Recommended:* yes for the Architecte (printed) and for half price when married; it uses up the Architecte's one free house.
12. **Maison close "flirts sans condition ni limite".** *Recommended:* for the rest of the game while you own it: no cap, allowed while married without Adultère.
13. **Tourisme sexuel and the Pilote.** *Recommended:* it is a voyage in every respect; the Pilote's free voyages have no limit in the base game, so nothing is used up.
14. **Bonus addictif.** Read the cards. *Recommended:* apply exactly the printed values.

**Malus**

15. **Hémorragie when the player cannot play.** *Recommended:* they can always discard, so the hand always empties. Cards stuck in hand (Sextape) are discarded by it, as the Sextape rule says.
16. **Herpès: "flirt identique".** *Recommended:* same place name. Partouze flirts are protected and not hit.
17. **Mine antipersonnel: where does the Mine go, and can it loop?** *Recommended:* the Mine is discarded with the hand. If the new hand contains a Mine again, it triggers again (the leaflet says so for refills).
18. **Mine in a Roulette russe pile.** *Recommended:* it is not "drawn into a hand" there, so it is simply discarded.
19. **Overdose count.** *Recommended:* the target's own Héroïne and Cocaïne cards at the moment the malus is played. With none, the malus cannot be played.
20. **Poupée vaudou procedure.** *Recommended:* in play order starting with the attacker, each player's malus that can legally target the victim are applied automatically, one by one, re-checking the condition each time. Each supplier then redraws that many cards.
21. **Prise d'otage with two players.** *Recommended:* the attacker takes the salaries from the hostage's own hand.
22. **Prise d'otage: does the chosen player show their hand?** *Recommended:* no; their salaries are simply handed over.
23. **Stérilité exceptions ("etc.").** *Recommended:* it blocks only *placing a child from your hand*. Any effect that gives you a child "sans condition" still works. The Prêtre ignores it.
24. **Which malus are "permanent" for Vengeance?** *Recommended:* Amputation, Exhibition, Stérilité (printed as permanent), and Hémorragie once finished. One-shot malus follow the base Vengeance rule.

**Cartes spéciales**

25. **Capote trouée.** *Recommended:* it lets you place one child for each new top flirt, without marriage: after each flirt you place, you may place one child from your hand on a later play. No child is created. Blocked by Stérilité.
26. **Échangisme: "le jeu de chacun".** *Recommended:* the hands.
27. **Échangisme with uneven hands.** *Recommended:* the smaller hand is swapped whole; the player with more cards chooses which of theirs to give, the same number.
28. **Exhumation and Attentat.** The leaflet contradicts itself (question 21 of the transcript). The game sends Attentat's children out of the game, and Exhumation agrees. *Recommended:* keep that; treat the Fin précoce aside as a misprint.
29. **Partouze flirts.** *Recommended:* they score, they count as "having a flirt" for marriage, they are outside the limit of 5, cannot be stolen or discarded by any effect, and never allow a child.
30. **Polygamie: how do you reach a second marriage?** *Recommended:* any marriage card can be placed as the second one without a new flirt; flirting stays forbidden once married.
31. **Polygamie and children.** *Recommended:* nothing changes; one marriage is enough for children.
32. **Promotion canapé.** *Recommended:* +1 to the job's maximum level, capped at 4, for the job held when it was placed, intérimaire included.
33. **Sado-maso: which malus count?** *Recommended:* the malus cards in front of you at the end of the game.
34. **Trafic d'organes order.** *Recommended:* the player of the card picks first from their left neighbour, then each player in play order does the same; the card the first player took is set aside until the round ends, so it cannot be taken back.
35. **Zoophilie and the Licorne.** *Recommended:* as printed: 9 with the combo (not 12); otherwise the Licorne doubles to 6. One Zoophilie only exists, so no stacking.

**Cartes très spéciales**

36. **Extorsion capitaliste: "le plus de liasses".** *Recommended:* highest total value, not number of cards. The winner places them without condition.
37. **Extorsion communiste dealing.** *Recommended:* one card at a time, round-robin from the player of the card, face down then placed without condition whatever the job level. Argent sale is included.
38. **Roulette russe with a hand that isn't 5 cards.** *Recommended:* the pile is whatever the hand holds. The player of the card draws too when their turn comes round.
39. **Hit by a second Roulette.** *Recommended:* hand size drops again (4, then 3).
40. **Roulette "pause".** *Recommended:* nothing else can be done until the Roulette is found.
41. **Sextape and hand size.** *Recommended:* it counts as one of your cards, so you effectively play with one card fewer. Only an Acteur porno can place it, from their own hand.
42. **"Refaire sa main" versus Hémorragie and Mine.** *Recommended:* in every case the player redraws to the number they held just before the effect, bounded by their current hand size.
