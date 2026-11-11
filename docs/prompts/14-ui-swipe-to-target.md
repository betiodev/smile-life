# Step 14 — UI step 3 — swipe to target

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 14 and the steps just before it
- src/components/SwipeCard.jsx, usePlayIntent.js, TableView.jsx, MyView.jsx, GameScreen.jsx

## Goal

Playing a card that needs a target opens the table view; players who cannot be targeted are greyed out; the targeted player's area glows and grows before release.

## What to do

1. When a swipe-right starts on a card that needs a target (malus, Troc, Vengeance, Chef troc target…), switch to the table view while the finger is still down.
2. Grey out players that `legalActions` does not allow as a target, with the French reason shown on tap.
3. Highlight (glow and slight scale) the player area under the finger; releasing on it plays the card on that player; releasing elsewhere cancels and returns the card to the hand.
4. Keep the 3-second "Annuler" toast behaviour consistent with step 2 of the redesign.
5. Targets must come from `legalActions`, so new extension cards with targets work without new UI code. Support two kinds of target: a player, and a specific placed card of a player (needed by many extension cards).
6. Landscape only. Test at phone size in the preview.

## Rules for this session

- No game logic in components.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.

## Done when

A malus can be played in one gesture from hand to target on a phone.

## How Teto tests it

On your phone, in a game against bots, play a malus by swiping it onto a player. Try releasing on a greyed-out player and outside any player.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
