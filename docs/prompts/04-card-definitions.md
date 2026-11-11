# Step 04 — Card definitions with ids, extension tags and child gender

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 04 and the steps just before it
- docs/planning/ARCHITECTURE.md — all of it once, then closely: §2 Card data, §12 step 4, docs/extensions/girl-power/girl-power.md (Decision 11: genders of the base children)
- docs/planning/AUDIT.md

## Goal

Turn card data into definitions that extensions can add to, and stop rules from naming cards where a group is meant.

## What to do

1. Restructure `src/data/` as described in §2 and §10: `base.js` (definitions), `index.js` (catalogue by id, `buildDeck(extensions)`). Every definition gets `id` (`base.<slug>`), `ext: 'base'`, `tags`. Instances keep their fields and gain `def`.
2. Give the ten base children their `gender` (see Decision 11 in the Girl Power spec).
3. Add tags and use them in `rules.js` / `reducer.js` wherever the code lists card keys to mean a group: `outlaw` (Bandit, Gourou), `prof`, `trophy`, `fonctionnaire`, `interim`, `house`, `animal`, `travel`. Single-card rules may keep using the id.
4. `START_GAME` accepts `extensions: []` (only `base` exists for now) and stores it in state.
5. Make uids opaque: number the cards after a seeded shuffle so a uid no longer reveals the card type. Keep the rule and the tests that a hidden card never appears with its real uid.
6. Update `src/components/cardArt.js` and the gallery if they depended on the old tables. Illustration file names must not change.
7. Regenerate goldens (uids changed) and say so.

## Rules for this session

- Do not add any extension card.
- Do not change any rule of the base game.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

All 200 cards come from definitions with ids; a test checks the 200 total and the per-type counts.

## How Teto tests it

Open the card gallery (add `#cartes` to your game link): all cards and illustrations are still there. Play a few turns.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
