# Step 31 — Politique — spec and fill-in table

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 31 and the steps just before it
- docs/extensions/politique/politique-rules.md
- docs/extensions/girl-power/girl-power.md and girl-power-card-data.xlsx — the model to match
- docs/extensions/INTERACTIONS.md (if it exists)
- docs/planning/ARCHITECTURE.md §5, §9

## Goal

Turn the rules transcript into a structured spec and an empty card-data table for Teto to fill. (Fable does this during the planning session; skip the step if `docs/extensions/politique/politique.md` and `docs/extensions/politique/politique-card-data.xlsx` already exist.)

## What to do

1. Write `docs/extensions/politique/politique.md` with the same sections as the Girl Power spec: overview, card list, new engine concepts, cards by category (effect, one-time or permanent, engine hook), bonus rules, Decisions (empty), Remaining questions.
2. Every unresolved point from the transcript's "Ambiguities" section becomes a numbered question for Teto with your recommended answer and why. Cards that cannot work on a phone as printed get a proposed digital stand-in as a question.
3. Write `docs/extensions/politique/politique-card-data.xlsx`: one sheet per category with the same columns as the Girl Power workbook, plus a "Lisez-moi" sheet. Pre-fill names and counts from the transcript; leave the cells Teto must fill from the physical cards empty and yellow. Add columns only where this extension needs data the Girl Power columns cannot hold, and say which in "Lisez-moi".
4. Add this extension's clashes with the base game and with every other extension to `docs/extensions/INTERACTIONS.md`.

## Rules for this session

- Do not write game code.
- Do not answer the questions yourself.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.

## Done when

Spec and table exist; counts add up to the leaflet's total.

## How Teto tests it

Open the spec on GitHub: you should be able to read every card's effect and every question without the leaflet.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
