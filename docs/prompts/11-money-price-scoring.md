# Step 11 — Money traits, prices and the scoring pipeline

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 11 and the steps just before it
- docs/planning/ARCHITECTURE.md — all of it once, then closely: §7 Money, prices and scoring, §12 step 9
- docs/planning/AUDIT.md

## Goal

Generalise paying and scoring so extension money, discounts and score modifiers need no special code.

## What to do

1. Add `money` traits to definitions (value, taxable, casino, gift, payTax, needsJob). Salaries and Héritage use them. Impôt, Casino, Anniversaire and the purchase flow ask the traits instead of checking `type === 'salary'`.
2. Add the `price` and `paymentRule` queries. House half price when married, Architecte and Pilote become `price` modifiers.
3. Rewrite `scoring.js` as the pipeline of §7: `cardSmiles` per card, sum per category, `scoreBonus`. The Licorne bonus becomes a modifier on the Licorne.
4. Pure refactor: goldens identical, and the final-score screen shows the same categories.

## Rules for this session

- Do not add any extension card.
- Do not change any rule of the base game.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

Purchases and scoring go through queries; goldens identical.

## How Teto tests it

Finish a game and compare the final score screen with a hand count of one player's cards.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
