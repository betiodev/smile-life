# Computer players (bots)

Status: design, written 2026-11-11 by Claude Fable. Built in roadmap steps 13 (Facile, solo mode), 53 (Moyen), 54 (Difficile) and 55 (taking over a player who left). Depends on the engine described in `ARCHITECTURE.md`, especially §6.5 (`legalActions`), §8.2 (driver) and §8.4.

## Summary

- A bot is ordinary code that follows rules of thumb and tries moves out. No AI service, no server, no running cost.
- It plays through exactly what a human player sees. It is never given the hidden cards.
- Three levels: **Facile** follows simple priorities, **Moyen** tries each possible move and keeps the one that leaves it best placed, **Difficile** also imagines the hidden cards and plays a few turns ahead.
- It handles extension cards without anyone writing a strategy per card: it learns what a card does by playing it on a copy of the game and looking at the result.
- Honest limit: Smile Life has a lot of luck. Expect Difficile to win clearly more often than Facile, not every time.

## 1. Where a bot sits

A seat has a kind: `human`, `remote` or `bot`. When the engine is waiting for a seat of kind `bot`, the driver calls:

```js
// src/session/bot/index.js
chooseAction({ view, legal, level, seed, budgetMs }) → action
```

- `view` is `viewFor(state, seat)`, the same object the UI would draw for that seat.
- `legal` is `legalActions(view, seat)`. The bot must return one of these.
- `seed` drives the bot's own random choices. It is separate from the game's randomness, so a bot can never learn anything from it.
- `budgetMs` is the thinking time allowed.

The driver never passes the state. That is the whole anti-cheating mechanism, and it is enforced by a test (section 8).

The driver waits a short, slightly random time (about 0.7 to 1.5 seconds) before applying a bot's action, so people can follow what happened.

Bots answer every kind of prompt the same way, because every prompt is "pick one of `legal`": which card to play, which target, which salary to give at an Anniversaire, how to vote in a Référendum, whether to help against a monster.

## 2. Why bots can play cards nobody taught them

Four things from the engine make this work for every extension:

1. **`legalActions`** lists every move, so a bot cannot play illegally and never needs to know a card's conditions.
2. **The reducer is pure.** Given a state and an action it returns the next state and touches nothing else. A bot can apply a move to a copy and look.
3. **Scoring and rule queries are shared.** The bot judges a position with the engine's own scoring pipeline and queries (`salaryLevels`, `canHaveChild`, `handSize`, `flirtLimit`, `price`…). A card that changes one of those changes the bot's judgement automatically. Stérilité makes `canHaveChild` false, so a position with Stérilité on you is worth less, so the bot both avoids it and likes inflicting it.
4. **Every waiting step has a fallback**, so a bot that runs out of time still has a legal answer.

One escape hatch: a card definition may carry `ai: { bonus: n }`, a small nudge added to the bot's estimate when it plays that card. Use it only when tournaments show bots misjudging a card (section 8), and keep such hints rare. Without any hint a card still gets played.

## 3. Imagining the hidden cards

To try a move, the bot needs a complete game, and it only has a view. `determinize(view, rng)` builds one plausible complete game:

1. List every card of this game: `buildDeck(view.extensions)`.
2. Remove every card the bot can see: its hand, all boards, the discard pile, the out-of-game pile, the centre, the river, anything a peek has shown it. What remains is the **unseen pool**. The engine exposes this as `unseenCards(view)`.
3. Shuffle the pool with the bot's seed. Deal each opponent as many cards as their hand size; the rest becomes the deck. Hidden parts of a flow in progress (a Casino stake, a face-down board during Purge) are filled the same way.

The result is a guess, not the truth. One guess can be badly wrong, so Difficile makes several and averages.

Things the bot legitimately knows and must use when dealing guesses: a card an opponent took from the discard pile and has not played is in their hand; cards shown to it by Journaliste, Médium, Radar or Exhibition are where it saw them. These are tracked in a small `memory` object the driver keeps per bot seat and passes back on each call. Memory is built only from views that seat received.

## 4. Judging a position

`evaluate(state, seat)` returns one number: how good this position is for `seat`. It is used by Moyen and Difficile.

```
value = myOutlook − 0.7 × bestOpponentOutlook − 0.3 × averageOtherOutlook
```

`outlook(player)` is that player's expected final score:

| Part | How it is computed | Why |
|---|---|---|
| Smiles already placed | the engine's scoring pipeline | exact, includes every extension's scoring effects |
| Earning power | highest level in `salaryLevels`, times expected turns left, times the share of unseen salary cards of a usable level | a good job is worth more early than late |
| Study progress | study level, weighted by how many unseen or held jobs it unlocks | studies are an investment |
| Family | married → expected children (unseen children × chance to draw them); `canHaveChild` false → 0 | marriage and children are the biggest base scores |
| Buying power | unspent money against the `price` of acquisitions held | money in front of you is only worth what it buys |
| Hand | sum of each held card's playable value, discounted if not playable yet | keeps the bot from throwing away a job it is one study short of |
| Turns lost | `skipTurns` × average smiles per turn | Prison and Accident cost real points |
| Capacity | `handSize`, `flirtLimit`, job and marriage slots compared with the default | values permanent effects without naming them |

"Expected turns left" is `deckCount ÷ number of players`.

All weights live in one file, `src/session/bot/weights.js`, with a comment per weight. Tuning means editing numbers there and running the tournament.

This function is the part that needs iteration. The first version will be rough; the tournament tells you whether a change helped.

## 5. The three levels

### Facile

No trying out of moves. A fixed order of preference by kind of card, read from `type` and `tags`, so extension cards fall into place by their category:

1. Answer a prompt: take the flow's fallback three times out of four, otherwise a random legal answer.
2. Draw: take the top of the discard only if it is a card that scores when placed; otherwise the deck.
3. Play, first match wins: place a card that scores (highest smiles first) → place a job → place a study → place any other card → play a malus on a random legal target → discard.
4. Discard: a random card among those it cannot currently play; if none, the lowest smiles.
5. One time in five, ignore the order and pick any legal action that is not a discard.

Facile never resigns or divorces on purpose and never bets at the Casino unless it is a prompt.

It should feel like a new player: legal, a bit aimless, beatable.

### Moyen

For each legal action:

1. Make **one** guess of the hidden cards (section 3).
2. Apply the action with the real reducer. If that opens a prompt for the bot itself, answer it greedily the same way, until the bot's play is resolved.
3. Score the result with `evaluate`.

Play the action with the best score; break ties at random. If the action depends on hidden cards (Troc, Chance, Tsunami, a blind steal), average over three guesses instead of one.

What this gives without any card-specific code: it builds studies toward jobs it holds, places salaries it can use, aims malus at whoever is ahead, keeps cards that will become playable, and plays extension cards for what they actually change.

What it lacks: it does not look past the current move. It will not hold a Divorce for the right moment or see that a "rejouez" is worth a whole turn.

### Difficile

Moyen's method, plus looking ahead and averaging over many guesses:

1. Rank legal actions with Moyen's method; keep the best five (always including "draw from deck" and the best discard).
2. For each kept action and each of several guesses: apply the action, then **play the game forward** for two rounds of the table with every player, the bot included, choosing by a fast policy (Facile's order with targeting of the leader), then `evaluate`.
3. Average per action across guesses. Play the best.

It is an "anytime" search: it loops over guesses until `budgetMs` is used up, then answers with the averages so far. More time means steadier choices, never a later answer.

Extra habits, all from public information:
- **Counting cards.** The unseen pool tells it how many Licenciement, Divorce or Attentat are still out there, which changes how exposed a job or a marriage is. This falls out of the guesses; nothing extra to write.
- **Timing.** Because it plays forward, it sees that a malus held now can hit a bigger target later, and that an extra turn is worth a turn.
- **Not feeding the next player.** When discarding, it checks whether the next player could take that card from the discard pile and use it.

### Time budget

| Level | Budget per decision | Where it runs |
|---|---|---|
| Facile | under 5 ms | main thread |
| Moyen | up to 100 ms | main thread |
| Difficile | 400 ms by default | a Web Worker, so the screen never freezes |

All bots in a game think on the host's device. These numbers are targets; step 54 measures them on a real phone with all extensions on and lowers the number of guesses or the look-ahead if needed. If the engine is too slow for Difficile, optimise state copying then (ARCHITECTURE.md §13).

## 6. Solo games

- Setup screen: each seat is "Joueur" or "Ordinateur" with a level. A game needs at least one human.
- With one human, the "pass the phone" screen is skipped.
- Bots get plain names that cannot be confused with friends, for example "Ordi Camille (facile)".
- Bots' turns are shown at reading speed with the same animations as a human's.

## 7. Taking over a player who left

Details of detecting absence belong to `NETWORKING.md`. The bot side:

1. While a remote player is merely late, nothing changes: the driver's deadline applies each flow's fallback.
2. When the host's device decides a player is gone (rule in `NETWORKING.md`), the seat's kind switches from `remote` to `bot`, level **Moyen**. Everyone sees "<name> est remplacé par l'ordinateur".
3. The bot receives that seat's view and nothing else. It starts with an empty memory.
4. If the player comes back, the seat switches back to `remote` at the next moment that seat is asked to act. The bot never finishes a half-made choice on the player's behalf after they return.

Moyen is used so a replacement neither throws the game away nor plays better than the person it replaces would like.

## 8. Testing

`tests/bots.mjs`, part of `npm test`:

| Check | What it proves |
|---|---|
| Every action a bot returns is in `legal` | no illegal moves, for every level and extension mix |
| Bot-against-bot games with all engine invariants on | bots as engine testers: they reach situations random play does not |
| Same view, same seed → same action | bots are repeatable, so a strange move can be replayed |
| Two different true states that give the same view → same action | the bot cannot be using hidden information |
| `chooseAction` has no access to the driver or the state | enforced by how it is called, and by a test that greps the bot folder for imports from `driver.js` or `reducer.js` state internals other than the pure reducer |
| Decision time stays under budget | checked on the slowest expected case: all extensions, four players, early game |

`npm run bots:tournament` (not part of `npm test`, it takes minutes):

- Plays several hundred games per setting, seats rotated, and prints win rate and average score per level with a margin of error.
- Settings: 2 and 4 players; base only, each extension alone, all extensions.
- Targets: Moyen ahead of Facile, and Difficile ahead of Moyen, by a margin larger than the error. If a level is not ahead, it is not done.
- Also prints, per card, how often it was drawn, played and discarded by Difficile. A card that is almost always discarded is either weak or misjudged; look at it, and only then consider an `ai` hint.

## 9. Files

```
src/session/bot/
  index.js         chooseAction: picks the level
  facile.js
  moyen.js
  difficile.js
  evaluate.js      outlook and value
  weights.js       every tunable number
  determinize.js   guessing the hidden cards
  memory.js        what this seat has legitimately seen
  worker.js        runs Difficile off the main thread
tests/bots.mjs
scripts/tournament.mjs
```

## 10. Risks and limits

- **The judging function decides everything.** A wrong weight makes all levels play oddly in the same way. Budget time in steps 53 and 54 for tuning against the tournament.
- **Luck hides skill.** With few games, a better bot can look worse. Always read the margin of error.
- **Co-operative and social cards.** In the Invasion extraterrestre the bot plays as if maximising its own outlook, which usually means helping. For votes and alliances it simply compares outcomes. It does not bargain.
- **Speed on old phones** is unknown until measured.
- **Bots will find engine bugs.** That is useful, but expect steps 13 and 53 to spend time fixing the engine, not only writing bots.
