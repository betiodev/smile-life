# Step 07 — Primitives and events

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 07 and the steps just before it
- docs/planning/ARCHITECTURE.md — all of it once, then closely: §6.1 Primitives, §6.2 Events, §12 step 7
- docs/planning/AUDIT.md

## Goal

Route every draw, placement and loss of a card through a few shared functions that announce what happened.

## What to do

1. Add `src/game/primitives.js` with `draw`, `refill`, `place`, `remove`, `move`, `steal`, `flip`, `attach`, `loseJob`, `skip`, `log` as described in §6.1.
2. Replace every direct `deck.pop()`, every push onto a board zone and every ad-hoc removal in the reducer with a primitive. `remove` takes `{ cause, by, to }`.
3. Add an event list (§6.2) and a way for card behaviours to subscribe. Nothing subscribes yet except what you need to keep current behaviour (for example Grand prix flipped on `jobLost`).
4. This must be a pure refactor: the golden games must come out identical. If they do not, find out why before changing the golden file.

## Rules for this session

- Do not add any extension card.
- Do not change any rule of the base game.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

No zone is edited outside `primitives.js`; goldens identical.

## How Teto tests it

Play one full game. Nothing should look different.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
