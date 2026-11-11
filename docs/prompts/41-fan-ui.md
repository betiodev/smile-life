# Step 41 — Fantastique — screens and interactions

Model: Sonnet 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 41 and the steps just before it
- docs/extensions/fantastique/fantastique.md
- docs/art/STYLE-GUIDE.md
- src/components/ (GameScreen, MyView, TableView, PlayChoices, Modals, usePlayIntent)

## Goal

Make every Fantastique card pleasant to play on a phone.

## What to do

1. Play through each new flow of this extension against bots in the preview and fix what is unclear or missing on screen. In particular: a character per player; the current éphéméride in the centre; the Lune bleue river; face-down draws for Loup-garou and Sorcière.
2. Every choice a player must make has a clear French prompt, shows the countdown when one applies, and can be done one-handed in landscape.
3. New card categories get their frame/tint (reuse the closest until Teto provides a new frame) and the gallery lists the expected illustration file names.
4. All text in French, card names exactly as printed.

## Rules for this session

- No game logic in components: if a rule is missing, it belongs in `src/game/`.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.

## Done when

Every flow of the extension can be completed on a phone-sized screen without confusion.

## How Teto tests it

On your phone, play a full solo game with Fantastique on. Note any moment where you didn't know what to tap.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
