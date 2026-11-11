# Step 10 — Queries, modifiers and one precedence function

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 10 and the steps just before it
- docs/planning/ARCHITECTURE.md — all of it once, then closely: §5 Rules: queries, modifiers and precedence, §12 step 9
- docs/planning/AUDIT.md

## Goal

Move the base game's perks and immunities onto the mechanism the extensions will use, which proves the mechanism.

## What to do

1. Add `src/game/queries.js`: the query list of §5.1, collection of modifiers from cards in force, and `resolve()` implementing the default precedence of §5.3.
2. Add `src/game/cards/base.js`: the behaviour registry for base cards. Move job perks and immunities out of the `switch` statements into modifiers: Garagiste, Pharmacien, Médecin, Chirurgien, Avocat, Bandit, Militaire, Policier, Barmaid, Chercheur (hand size), Pilote, Architecte, fonctionnaire immunity, Grand prix (salary level).
3. Move instant job powers (Journaliste, Médium, Astronaute, Chefs, Policier purge) and special cards to `onPlace` behaviours that start flows.
4. `canPoseSelf` and `canPlayMalus` become the base answers of `canPlace` and `canTarget`. Keep their French reasons word for word.
5. Give `resolve()` its own unit tests, one per precedence rule of §5.3, using fake modifiers.
6. Pure refactor for the base game: goldens identical.

## Rules for this session

- Do not add any extension card.
- Do not change any rule of the base game.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

No `hasJob(p, '…')` perk checks left in rules or reducer; goldens identical.

## How Teto tests it

Play a game and try a blocked move for each perk you can (Accident on a Garagiste, Licenciement on a Prof…). The refusal message is the same as before.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
