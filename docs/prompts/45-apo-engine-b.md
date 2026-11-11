# Step 45 — Apocalypse — engine B: monstres and malus

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 45 and the steps just before it
- docs/extensions/apocalypse/apocalypse.md (Decisions are binding)
- docs/extensions/apocalypse/apocalypse-rules.md
- docs/extensions/INTERACTIONS.md
- docs/planning/ARCHITECTURE.md §5–§9

## Goal

Make these Apocalypse cards work: the 6 monstres (round the table, damage, alliance, flight) and the 5 malus.

## What to do

1. Implement the behaviours for: the 6 monstres (round the table, damage, alliance, flight) and the 5 malus. Put them in `src/game/cards/apo.js` (and flows in `src/game/flows/` when a card needs players to choose).
2. Use the existing queries, primitives, events and flows. If a card needs one that does not exist, add it and document it in ARCHITECTURE.md (§5.1, §6.1 or §6.2) in the same commit.
3. For each card with an effect, add at least one scenario to `tests/ext/apo.test.mjs`. For each numbered Decision in the spec that concerns these cards, add a test named after it.
4. Every new step that waits for a player needs a `fallback`, a `view` that hides what must be hidden, and entries in `legalActions`. Extend the leak scan and the invariants if you add a zone or a flag.
5. Run the simulator with this extension alone and combined with: Girl Power, Vie de luxe, Trash, Politique, Fantastique. Fix what it finds.

## Rules for this session

- Do not change base rules or earlier extensions' rulings.
- A card the spec leaves ambiguous is not implemented by guessing: ask Teto and record the Decision.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

Listed cards implemented and tested; simulations with invariants pass alone and combined.

## How Teto tests it

Start a solo game against bots with Apocalypse switched on (still marked "en cours": only the cards of the steps done so far have their effect). Play until you have seen several of these cards. Compare what happens with the physical card.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
