# Extension spec — Vie de luxe

Source: `luxe-rules.md` (faithful transcript of the 2-page leaflet, © 2025). Rules restated in structured form for implementation; card names kept in French as printed. Numbers that are only on the cards live in `luxe-card-data.xlsx`.

Status: **draft**. Section 10 is empty until Teto rules on the questions in section 11. Nothing in section 11 is decided; each question carries a recommendation only.

## 1. Overview

- 60 cards, shuffled into the base deck. No set-up change.
- Theme: money and fame. Introduces a **Star** card attached to a job, **debt**, money that isn't a salary (bijoux, lingot), cards that hold other cards (Paradis fiscal, Sugar daddy, Première classe), and a lottery.
- "Acquisition de luxe" means any acquisition of this extension, free or paid.

## 2. Card list (60)

| Category | Count | Cards |
|---|---|---|
| Métiers | 6 | Acteur, Chanteur, Footballeur, Rappeur, Influenceur, PDG |
| Cartes Star | 2 | Star ×2 |
| Acquisitions de luxe | 17 | Named in the leaflet: Caviar, Collier pour animal, Chirurgie, Oeuvre d'art, Jet privé, Lingot d'or, Toilettes en or, Voiture de sport, Château, Hôtel particulier, Chihuahua. Six more are not named (voyages, véhicules, animaux…). |
| Bijoux de famille | 5 | not named |
| Flirts | 6 | not named |
| Mariage d'argent | 1 | — |
| Enfants | 2 | Cris, Kim |
| Cartes spéciales | 12 | Bling-bling, Buzz, Carte platinum, École privée, Fils à papa, Fils de, Groloto, Paradis fiscal, Première classe, Shopping, Sugar daddy, VIP |
| Malus | 9 | Bad buzz, Dette (amounts 1 to 4), Blacklisté, Braquage, Cambriolage, Impôt sur la fortune. The split of the 9 cards is not in the leaflet. |

## 3. New engine concepts

Names in the right column are the mechanisms of `docs/planning/ARCHITECTURE.md`.

| Concept | Needed by | Mechanism |
|---|---|---|
| Card attached to a job, lost with it | Star | `meta.on`, `jobLost` |
| Draw two, keep one | Star | `drawMode` |
| An action instead of drawing, repeatable every turn | PDG, paying a Dette with placed money | turn flow `start` step |
| Money that isn't a salary | Bijoux, Lingot d'or | `money` traits |
| Cards stacked on a card, scored or counted apart | Paradis fiscal, Sugar daddy, Première classe, Dette | `meta.on` |
| A malus that blocks buying until paid | Dette | `canPlace` modifier, a pay flow |
| Extra turn or extra play ("rejouez") | Bling-bling, Carte platinum | `extraTurns` / `plays` |
| Free or half-price by job, by owned card | Caviar, Chirurgie, Oeuvre d'art, Toilettes en or, Voiture de sport, Jet privé | `price` |
| Taking a named card from the discard | Cris, Fils de, Jet privé, Shopping | `move` from discard + `place` |
| Marriage that excludes having a job | Mariage d'argent | `canPlace`, `salaryLevels` |
| Seeing a hand | Braquage | `sight` |
| Lottery on the next five cards | Groloto | a flow, seeded |
| Lasting "everything is free" for one player | Groloto win | `price`, `salaryLevels`, `canPlace` |

## 4. Métiers

Study level, salary level, smiles and status come from the table.

| Card | Type | Effect | Hook |
|---|---|---|---|
| Acteur, Chanteur, Footballeur, Rappeur | permanent | Lets you place a Star on this job on a later turn. | `canPlace` (Star) |
| Influenceur | ⚡ | "Posable uniquement sans étude." If you have studies placed, they are discarded when you place it. | `onPlace` |
| PDG | permanent | From your next turn on: instead of drawing, fire a player of your choice (not a fonctionnaire, not the Bandit). That is your whole turn. Once per turn, as many turns as you like. | turn `start` action |

## 5. Star (×2)

- Placeable only on Acteur, Chanteur, Footballeur or Rappeur (or any job that has a Buzz, see section 8).
- "Votre salaire passe du niveau 1 à 4."
- Each turn you draw 2 cards instead of 1, keep one and discard the other, then play. This applies to every card drawn, including cards that play themselves (crises…). It does not apply when you take the top of the discard pile.
- Licenciement or démission: the Star is discarded with the job.
- No two Stars on the same job.

Hooks: `canPlace`, `salaryLevels`, `drawMode`, `jobLost`.

## 6. Bijoux de famille (×5) and Lingot d'or

| Card | Effect | Money traits |
|---|---|---|
| Bijou de famille | Placed with or without a job. Spent to buy an acquisition or to pay a Dette. | not taxable, no Casino, no Anniversaire |
| Lingot d'or (an acquisition) | From a later turn, usable like a salary worth 5 liasses to buy or pay a Dette. | not taxable, no Casino, no Anniversaire |

## 7. Acquisitions de luxe, Mariage d'argent, enfants

| Card | Effect | Hook |
|---|---|---|
| Château, Hôtel particulier | Count as houses (half price when married…). | tag `house` |
| Caviar | Half price for the Serveur. | `price` |
| Collier pour animal | "Vaut double avec chihuahua." | `cardSmiles` |
| Chirurgie | Free for the Chirurgien. Worth double with the child Kim. | `price`, `cardSmiles` |
| Oeuvre d'art | Free if you already have the Château. | `price` |
| Jet privé | Your voyages are free. When you place the Pilote de ligne, you may take the Jet from the discard at its printed price. | `price`, `onPlace` (Pilote) |
| Toilettes en or | Half price for the Plombier. | `price` |
| Voiture de sport | Half price for the Garagiste. | `price` |
| Chihuahua and the unnamed cards | Per the table. | — |
| **Mariage d'argent** | Permanent: lets you place salaries of level 1 to 4. Cannot be combined with a job or another marriage. With a job you must resign first; to take a job you must first divorce. | `canPlace`, `salaryLevels` |
| **Cris** (child) | When placed: take the Footballeur from the discard and place it, if you may place it. | `onPlace` |
| **Kim** (child) | Your Chirurgie is worth 2 smiles instead of 1. | `cardSmiles` |

## 8. Cartes spéciales

| Card | Type | Effect | Hook |
|---|---|---|---|
| Bling-bling | permanent | Needs a luxe acquisition already placed. When you draw a level 3 or 4 salary (also from the discard), show it to everyone before playing, "puis rejouez". As a Star, only for the salary you keep. | `cardDrawn`, `extraTurns` |
| Buzz | ⚡ then lasting | Needs a job. Lets you place a Star on that job on a later turn. Flipped on licenciement or démission. | `canPlace` (Star), `jobLost` |
| Carte platinum | permanent | Placeable with at least 5 unspent salaries placed. Afterwards, "rejouer" each time you make a purchase. | `canPlace`, `extraTurns` |
| École privée | permanent | +3 study levels. Placeable with no job AND a luxe acquisition placed. Immune to Redoublement; outside the 6-study-card limit. | `canPlace`, `studyLevel` |
| Fils à papa | ⚡ | Place one acquisition from your hand without paying, at the same time as this card. Then draw back to 5. | `onPlace` |
| Fils de | ⚡ | Take the Star or the PDG from the discard and place it at once, if you may place it. | `onPlace` |
| Groloto | ⚡ | Announce five digits from 0 to 4. Reveal the next 5 cards of the deck one by one. If their smiles match your digits in any order, you win: for the rest of the game you place all salaries and acquisitions free and without condition. The 5 cards are discarded. | flow |
| Paradis fiscal | permanent | Salaries placed on it from your hand (5 at most) are not taxable and score 2 smiles each. They can be spent, and then score 1 again. You may refill it later. | `meta.on`, `cardSmiles` |
| Première classe | permanent | When buying a voyage, you may pay 1 liasse more to place it on this card: +1 smile each at the end. Allowed with Jet privé or Pilote by paying 4 instead of nothing. | `price`, `cardSmiles` |
| Shopping | ⚡ | Buy an acquisition from the discard at once, paying for it. | `onPlace` |
| Sugar daddy | permanent | Needs a luxe acquisition placed. Lets you buy flirts from your hand, even married and without limit: 1 flirt = 1 liasse, one per turn, after drawing; it is your turn's play. They sit on the Sugar daddy and are counted apart. The "top flirt can be stolen by an identical one" rule applies to them. | turn action, `meta.on` |
| VIP | scoring | Placeable with 2 flirts "en double" (same place) placed. All your doubled flirts score double. | `canPlace`, `cardSmiles` |

## 9. Malus

| Card | Type | Effect | Hook |
|---|---|---|---|
| Bad buzz | ⚡ | Only on a Star. The Star is discarded; the job stays. | `canTarget` |
| Dette | lasting until paid | Amount on the card (1 to 4 liasses). Until fully paid, the target cannot buy (place paying cards). Everything else is allowed, including acquisitions made free. Paying: from hand after drawing, one salary you could place, as your play; or instead of drawing, one or more placed salaries. Money on the Dette no longer counts for anything except smiles. Once paid, it is flipped. Vengeance can return a Dette only once paid. | `canPlace`, pay flow |
| Blacklisté | permanent | No more flirts at the places named (bar / boîte / zoo); such flirts already placed are discarded. The marriage is kept even with no flirt left. | `canPlace`, `onPlace` |
| Braquage | ⚡ | Target shows their hand to the attacker and gives all salaries in it; the attacker places them without condition. Target redraws as many. | `sight`, `place` |
| Cambriolage | ⚡ | The attacker takes the target's placed bijoux and places them. | `steal` |
| Impôt sur la fortune | ⚡ | Target discards their 3 last placed salaries. Only on a player whose job allows level-4 salaries (Star, Grand prix… count). Not on the Bandit. | `canTarget`, `remove` |

## 10. Decisions

None yet.

## 11. Remaining questions

Each has a recommendation, not a ruling. Answer in the session for roadmap step 21.

**Star, Buzz**

1. **"Votre salaire passe du niveau 1 à 4."** *Recommended:* you may place salaries of levels 1 to 4, the same wording as Mariage d'argent.
2. **Does draw-two apply to anything besides the turn's draw?** *Recommended:* the turn's draw only; end-of-turn refills are normal. If either of the two cards is one that plays itself (another extension), it is played.
3. **"Pas 2 cartes star avec le même métier."** *Recommended:* one Star per job card. The second Star can go on another player's job.
4. **Which jobs can take a Buzz?** *Recommended:* any placed job, since the leaflet sets no limit.
5. **Job lost with Buzz and Star.** *Recommended:* Star discarded, Buzz flipped, both as printed.
6. **Bad buzz on a Star placed thanks to a Buzz.** *Recommended:* the Star is discarded, the Buzz stays active, a new Star may be placed later.

**Métiers**

7. **Influenceur with studies placed.** The two sentences conflict. *Recommended:* it can always be placed; placing it discards all your studies. Its required study level is 0.
8. **Can the PDG fire a Star, another PDG, a player on Mariage d'argent?** *Recommended:* yes, yes (Star goes with the job), no (no job). It follows every base Licenciement rule, including the Chercheur's extra discard.
9. **PDG's turn "sans piocher".** *Recommended:* the PDG neither draws nor plays a card that turn.

**Money**

10. **Lingot d'or.** *Recommended:* bought like any acquisition at its printed price; from the next turn it can pay as 5 liasses, once, with no change given. It is not a "salaire" for Carte platinum or Impôt sur la fortune.
11. **Bijoux: are they "salaires posés"?** *Recommended:* no (not for Carte platinum, not for Impôt sur la fortune). Cambriolage takes only bijoux not yet spent.
12. **Dette overpayment.** *Recommended:* lost, no change, as in base purchases.
13. **Two Dettes on one player.** *Recommended:* allowed; no purchase until every one is paid.
14. **Which free placements are allowed in debt?** *Recommended:* anything that costs nothing at that moment: Architecte, Pilote, Jet privé, Fils à papa, a Groloto win.
15. **Impôt sur la fortune: which salaries?** *Recommended:* the three most recent unspent salaries, skipping those on Paradis fiscal and on a Dette, and skipping bijoux. Fewer than three: all of them.
16. **Impôt sur la fortune: who can be hit?** *Recommended:* anyone who may currently place level-4 salaries, by any means (job, Star, Grand prix, Mariage d'argent, Groloto), except the Bandit.
17. **Braquage: are the stolen salaries ordinary placed salaries?** *Recommended:* yes.
18. **Paradis fiscal: does placing a salary on it need a job and the right level, and use the turn's play?** *Recommended:* yes to all three ("selon les règles établies").

**Acquisitions**

19. **Château and Hôtel particulier: houses for everything?** *Recommended:* yes: Architecte's free house, half price when married, and other extensions' house effects.
20. **Jet privé and the Pilote.** *Recommended:* an optional extra at the moment you place the Pilote: pay the printed price, take the Jet from the discard.
21. **"Collier vaut double avec chihuahua."** *Recommended:* the Collier's smiles double while you own the Chihuahua.
22. **Does a free luxe acquisition, or the Lingot, satisfy "acquisition de luxe posée"? What if it is lost later?** *Recommended:* yes; the condition is checked only when placing the card that needs it.
23. **"Chirurgie" and Kim's "chirurgie esthétique".** *Recommended:* the same card.

**Cartes spéciales**

24. **"Rejouez" (Bling-bling, Carte platinum).** *Recommended:* one more whole turn (draw, then play) after the current one. Open to the other reading: one more play this turn.
25. **What counts as an "achat" for Carte platinum?** *Recommended:* paying money for an acquisition. Free placements, Dette payments and Sugar daddy flirts do not count, which also stops endless chains.
26. **École privée after getting or losing a job.** *Recommended:* it stays and keeps giving +3; it is not a study card.
27. **Groloto with fewer than 5 cards in the deck.** *Recommended:* cannot be played.
28. **Groloto win: how far does "sans condition" go?** *Recommended:* salaries of any level with no job needed, and acquisitions free. Malus still apply (Impôt, Impôt sur la fortune); a Dette no longer blocks, since everything is free.
29. **Shopping: any acquisition in the discard?** *Recommended:* yes, base or any extension.
30. **Sugar daddy payment and effects.** *Recommended:* paid with placed money under the normal payment rules. Flirts on it score, can be stolen from the top, but do not count toward the flirt limit and do not allow a child.
31. **VIP.** *Recommended:* one pair is enough to place it; every flirt that shares its place with another of your flirts scores double, Sugar daddy flirts included.
32. **Blacklisté: one card for the three places, or one per place?** Read the cards (table).

**Family**

33. **Do Cris and Kim need the usual conditions for a child?** *Recommended:* yes.
34. **Does Mariage d'argent count as a marriage?** *Recommended:* yes for children, half-price houses, Divorce and the ban on flirting. It cannot be a second marriage under Polygamie (the card says "non cumulable").
35. **Cris when there is no Footballeur in the discard, or you already have a job.** *Recommended:* nothing happens; the effect is only at placement and optional.
