# Step 15 — UI ready for extensions

Model: Sonnet 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 15 and the steps just before it
- docs/planning/ARCHITECTURE.md §2, §3.1, §3.2
- docs/art/STYLE-GUIDE.md (if it exists)
- src/components/cardArt.js, Card.jsx, SetupScreen.jsx, PlayerBoard.jsx, TableView.jsx, CardGallery.jsx

## Goal

Everything the screen needs so that a new extension shows up without redesign.

## What to do

1. Setup screen: a list of extensions with a switch each (Girl Power, Vie de luxe, Trash, Politique, Fantastique, Apocalypse). Only extensions whose data exists are selectable; the others show "bientôt". Show the resulting number of cards.
2. Card rendering: any new `type` / `subtype` gets a frame, tint, label and fallback icon. Until a dedicated frame exists, reuse the closest one. Card text (`desc` / `flavor`) fits on the card and in the zoom.
3. Show a small extension mark on cards that are not from the base game.
4. Boards: show received malus that have a lasting effect, protected cards, used (flipped) cards and cards placed on another card.
5. Table view: a "centre" area for cards in force for everyone, and the out-of-game pile, both browsable like the discard pile.
6. Card gallery: one section per extension, listing the illustration file name expected for each card.

## Rules for this session

- Do not add extension cards.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.

## Done when

With the test extension from step 12 enabled in development, its two cards display correctly in hand, on a board and in the centre.

## How Teto tests it

Open the setup screen: the extension list is there, all marked "bientôt". Open the gallery: the base game section looks as before.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
