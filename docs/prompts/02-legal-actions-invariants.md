# Step 02 — One list of legal actions, and invariant checks

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 02 and the steps just before it
- docs/planning/ARCHITECTURE.md — all of it once, then closely: §6.5 One list of legal actions, §11 Testing strategy, §12 step 2
- docs/planning/AUDIT.md

## Goal

Give the engine one function that lists every legal action, and make the simulator check the game's integrity after every action.

## What to do

1. Add `src/game/legal.js` with `legalActions(state, actor)`. It returns every action `actor` may take now, with parameters filled in (card uid, target…). For purchases, return the cheapest valid payment (the reducer still accepts any valid payment). It must work on a view (`viewFor`) as well as on the full state.
2. Rewrite `step()` in `tests/sim-lib.mjs` to pick from `legalActions` instead of rebuilding the list by hand.
3. Add invariant checks run after every action of every simulated game: each card uid is in exactly one place and the total is the deck size; someone may act unless the game is over; every action from `legalActions` changes the state; a sample of actions not in the list is rejected; the state survives `JSON.parse(JSON.stringify(state))` and plays on identically; the game ends.
4. Use `legalActions` for the UI hints that today call rule helpers one by one, where that is a simple swap. Leave complex UI code alone.
5. This step changes the order of random choices in simulations, so regenerate the golden file and say so in the commit message.

## Rules for this session

- Do not add any extension card.
- Do not change any rule of the base game.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

`legalActions` exists, the simulator uses it, invariants run in `npm test`.

## How Teto tests it

Play one full game. Playable cards and valid targets are highlighted exactly as before.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
