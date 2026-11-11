# Step 09 — Flow stack, part 2: every remaining choice

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 09 and the steps just before it
- docs/planning/ARCHITECTURE.md — all of it once, then closely: §6.3 Flows, §8.1 View (point 2), §12 step 8
- docs/planning/AUDIT.md

## Goal

Finish the move to flows so the old `pending` slot disappears.

## What to do

1. Port the remaining pendings to flows: chance, discard-pick, piston, troc, chef-troc, vengeance, casino-stake, birthday, chercheur-discard, journalist, medium. Port `resume` strings to `resume()`.
2. Move each flow's secrecy rules from `view.js` into its `view(state, frame, viewer)`, unchanged. The view tests in `tests/view.test.mjs` must still pass and the leak scan must cover every flow.
3. Delete `state.pending`, `state.forced`, `forcedConsumesPlay` and the `RULES` list in `turn.js`.
4. Add a test that nests flows: a Chercheur licencié by a Vengeance during an Arc-en-ciel turn.
5. The driver's timeout now calls the top frame's `fallback` for whoever is late, for every flow.

## Rules for this session

- Do not add any extension card.
- Do not change any rule of the base game.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

No `pending` or `forced` left in `src/`; every waiting step has a fallback.

## How Teto tests it

Play a game using as many special cards as you can (Troc, Chance, Anniversaire, Casino, Piston). Each one behaves as before.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
