# Step F3 — New zones for extensions, a view that hides by default, and no dead end

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

The engine must carry six extensions, then network play and computer players. A review (`docs/planning/CODE-REVIEW.md`, findings A5, B1, B2) found three gaps:

1. **Zones are a closed list.** "Card type → board zone" (`ZONE_OF_TYPE` in `src/game/primitives.js`), the zones a player starts with (`makePlayer` in `src/game/reducer.js`) and `boardCards` (`src/game/state.js`) are three fixed lists. `registerExtension` cannot add a card type or a zone (Politique needs `party`, Fantastique `character`, several extensions a `money` type).
2. **The view sends everything it does not know.** `viewFor` (`src/game/view.js`) copies the whole state except a list of secret fields, and each player except `hand`. A field added later by an extension reaches every player by default. The leak test only looks for hidden cards.
3. **A turn can have no legal action.** At the play step, with an empty hand (or only cards that may not be discarded) and nothing forced, `legalActions` is empty and the game is stuck. It cannot happen in the base game; it can with "no draw this turn" (`drawMode` `'none'`) or cards stuck in hand.

## Read first

- `CLAUDE.md` — including the section "Ce que chaque joueur voit", which is verified and must stay true
- `docs/ROADMAP.md` — only the section "How to use this roadmap"
- `docs/FIXES-GUIDE.md` — find step F3 (step F2 must be ticked; if it is not, stop and tell Teto)
- `docs/planning/ARCHITECTURE.md` §3.1, §3.3, §8.1
- `src/game/primitives.js`, `reducer.js`, `state.js`, `view.js`, `extensions.js`, `flows/turn.js`, `scoring.js`
- `tests/invariants.mjs`, `tests/view.test.mjs`, `tests/ext/test-ext.mjs`

## Goal

One registry of board zones that extensions can add to; a view that sends only what is listed; a "pass" when nothing is legal. The base game plays exactly as before: `tests/golden.json` must pass unchanged.

## Ask Teto first

Before coding part 3, ask this one question and wait for the answer:

> "In some extensions a player can reach their turn with nothing they are able to do (no card in hand and no draw, or only cards that may not be discarded). I recommend: the game says « X ne peut rien jouer et passe son tour » and moves to the next player. It can never happen in the base game. OK?"

Record the answer in `docs/extensions/INTERACTIONS.md` as a general principle. If Teto prefers something else, do that instead.

## What to do

**Part 1 — zones**

1. Create one zone registry (for example `src/game/zones.js`): the base zones in today's `boardCards` order (studies, jobs, money, flirts, marriages, adultery, children, acquisitions, distinctions, specials, malus) and the card types each one receives. The order must not change: the order in which modifiers and events are collected depends on it.
2. `registerExtension` accepts `zones: { <zoneId>: [<card type>…] }`. A registered zone exists on every player of a game that lists the extension; a type may be sent to an existing zone (for example a `money` type into `money`).
3. `makePlayer`, `place`, `findOnBoard`, `boardCards`, `BOARD_ZONES`, `viewFor`, the scoring categories and `tests/invariants.mjs` all read the registry. No list of zone names is left anywhere else in `src/game/`.
4. In the test extension, add a zone with its own card type and a card that goes there; test placing, removing, scoring, visibility, and the invariants in the simulated games.

**Part 2 — the view sends only what is listed**

5. Before changing `view.js`, write a throwaway script (do not commit it) that hashes `JSON.stringify(viewFor(state, viewer))` for every viewer (each player and `null`) after every action of 10 seeded base games. Keep the hashes.
6. Rewrite the top of `viewFor` so that it builds the view from an explicit list of public fields of the game and of a player. Anything not listed is not sent.
7. Give extensions one place for their own data: `state.ext[<extId>]` for the game and `player.ext[<extId>]` for a player. They are **never** sent, unless the extension registers a `view(state, viewer)` function that returns what this viewer may know. Move the test module `probe` from `state.probe` to `state.ext.probe`, with a `view` that shows it to everyone (its answers must be the same on a view as on the full state: the simulator checks that `legalActions` agrees).
8. Run the throwaway script again: the hashes of the base games must be identical. Say so in the pull request.
9. Tests in `tests/view.test.mjs`: an unknown field put on the state and on a player appears in no view; `state.ext.<id>` without a `view` function appears in no view; with one, only what it returns appears.

**Part 3 — no dead end**

10. In the turn flow (`src/game/flows/turn.js`), when the play step has no legal action for the current player (ignoring `STOP_ADULTERY`), list one action, `PASS`. `apply` accepts it only in that situation; it logs the French sentence agreed with Teto and ends the turn. Its fallback is `PASS`. Add `PASS` to the action types tried by `tests/invariants.mjs`.
11. Test it with the `probe` module (`drawMode` `'none'` and an empty hand), and check that `PASS` is refused whenever anything else is legal.

## Rules for this session

- What each player sees in the base game must not change at all (step 8 proves it).
- `tests/golden.json` must not be modified.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling: the question above is the only rules point, and it is Teto's.
- Keep game logic in `src/game/` and display in `src/components/`.

## Done when

- The test extension adds a zone through `registerExtension` and nothing else in the engine names it.
- The three view tests of point 9 pass, and the base-game view hashes are identical before and after.
- A turn with nothing legal offers `PASS`.
- `npm test` passes with `tests/golden.json` untouched.

## How Teto tests it

Play one full game on your phone. Nothing should look different.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. Update `CLAUDE.md`: the "Board zones" rule (zones come from the registry; how an extension adds one), the "Extensions" rule (`zones`, `state.ext`, `player.ext`, the `view` function), the view section (one sentence: only listed fields are sent), and the `PASS` action. Keep it short.
3. In `docs/FIXES-GUIDE.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test (the "How you test it" line of this step in the fixes guide).
