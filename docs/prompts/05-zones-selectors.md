# Step 05 — Selectors, then zones as arrays

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 05 and the steps just before it
- docs/planning/ARCHITECTURE.md — all of it once, then closely: §3.1 Zones, §12 step 5
- docs/planning/AUDIT.md

## Goal

Let a player hold more than one job or marriage, and give money and malus their final zones, without breaking anything that reads the board.

## What to do

1. First add selectors in `src/game/state.js` (`jobOf`, `jobs`, `isMarried`, `marriageOf`, `topFlirt`, `moneyOf`, …) and make rules, reducer, scoring, view, UI and tests read through them. Commit. Tests must pass with no shape change yet.
2. Then change the shape: `job` → `jobs[]`, `marriage` → `marriages[]`, `adultery` → array of at most one, `salaries` → `money`, `malusKept` → `malus`, `removed` → `outOfGame` (each entry records the cause and who caused it).
3. The base game still allows one job and one marriage: the limits stay in the rules, not in the shape.
4. Update `viewFor` and the view tests for the renamed zones. Update `CLAUDE.md` where it names zones.

## Rules for this session

- Do not add any extension card.
- Do not change any rule of the base game.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

Zones match §3.1; UI and tests read boards only through selectors.

## How Teto tests it

Play a full game with a job change, a marriage, a divorce and an Attentat if you can. Boards display as before.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
