# Step 32 — Politique — rulings and card data

Model: Sonnet 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 32 and the steps just before it
- docs/extensions/politique/politique.md
- docs/extensions/politique/politique-card-data.xlsx
- docs/extensions/politique/politique-rules.md
- docs/extensions/INTERACTIONS.md
- docs/planning/ARCHITECTURE.md §2

## Goal

Settle the open rules questions with Teto, then turn the filled table into card definitions.

## What to do

1. Read the workbook (it is a zip of XML; a short Python script can list every sheet and row). If yellow cells are still empty, list them for Teto and stop.
2. Compare the table with the spec. Cards often carry small powers that the leaflet does not mention: add every one to the spec.
3. Ask Teto the spec's "Remaining questions" and the rows of INTERACTIONS.md that involve this extension and the extensions already built (Girl Power, Vie de luxe, Trash). Ask in batches of at most 8, in plain words, each with your recommended answer. Record every answer in the spec's "Decisions" with the date, and mark the row in INTERACTIONS.md as ruled.
4. Write `src/data/ext/pol.js`: one definition per row, with `id` `pol.<slug>`, `ext`, `type`, `subtype`, `tags`, `count`, numbers, and the exact French card text. No behaviour yet.
5. Add `tests/ext/pol.test.mjs` with the count checks: 60 cards in total and the per-category counts from the leaflet.
6. Make the extension selectable on the setup screen with the label "en cours" (its cards can be drawn and discarded but have no effect yet). Add its section to the card gallery.

## Rules for this session

- Do not implement effects.
- Do not guess a missing number: ask.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.

## Done when

Every question has a recorded decision; definitions exist; count test passes.

## How Teto tests it

Open the card gallery: the new section lists every card of the extension with its text. Check five cards against the physical ones.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
