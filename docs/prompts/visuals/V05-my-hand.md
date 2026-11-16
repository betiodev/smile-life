# Step V5 — Ma main: a hand you can read

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends on phones, in landscape only. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

**The problem, in words (you cannot see Teto's screenshots).** The first game screen, "Ma main" (`src/components/MyView.jsx`), has three columns on an iPhone in landscape (about 844×390 CSS pixels; 330 high inside a browser):

- left, 17 % of the width: the deck and the discard pile;
- centre: a one-line top bar; then the player's own placed cards as a strip of small stacks taking 34 % of the height, where cards are about 42 pixels wide (titles printed at 4 pixels: unreadable); then the hand as a fan, where cards are about 67 pixels wide (still too small to read);
- right, 17 % of the width: one big round button "Voir la table" and the turn's buttons (Démissionner, Divorcer, Arrêter l'adultère, Terminer mon tour, Casino bets).

One third of the width holds two piles and a button, while the cards the player must read, the hand, get what is left of the height.

**What already exists (steps V3 and V4).** `PlayerMat.jsx` (one player's board in zones, every card a line of text), `ZoneSheet.jsx` (the cards of one zone at readable size), `zones.js` (which card goes in which zone), and the new "La table".

**The target.** A card's printed text is readable from about 100 pixels wide. The hand must reach that. The player's own board does not need to be cards on this screen: it becomes a strip of words that opens their mat.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — only the section "How to use this roadmap"
- `docs/VISUALS-GUIDE.md` — all of "Design direction" (the sketch of "Ma main" is the target of this step), and step V5
- `src/components/MyView.jsx`, `SwipeCard.jsx`, `usePlayIntent.js` (especially `spots`, which computes where ghosts of played cards go), `GameScreen.jsx`, `useCardAnimations.js`, `PlayChoices.jsx`, `CardZoom.jsx`, `PlayedStacks.jsx`, `PlayerMat.jsx`, `zones.js`, `layout.js`, `src/index.css`

## Goal

On "Ma main" the hand gets the height and is readable; the player's own board is a strip of zone tiles that opens their mat; the side columns shrink to what they hold. Every gesture and button works as before.

## What to do

1. **Layout of the screen.**
   - A top bar on the full width: the player's colour and name, the turn status as today, the score, a button "La table", and the menu.
   - Left column, about 100 px: the deck with its count, and the discard pile with the **name of its top card written under it**. Tapping them does what it does today.
   - Right column, about 100 px, only as wide as its buttons: the turn's buttons, same labels, same conditions as today. Nothing when it is not the player's turn.
   - Centre: the strip, then the hand on all the remaining height.
2. **The strip** (the player's own board): one tile per zone from `zones.js`, in the zone's colour: label, count, and the newest card's name or the number that matters (same content as a line of the table overview). One row when each tile can be at least about 84 px wide, otherwise two rows of four. Minimum text size 10 px. Tapping the strip opens the player's own mat (`PlayerMat`), with a back button to the hand.
3. **The hand.** Same fan, same `SwipeCard`. Card width: as large as the height allows, between 100 and about 130 px on a 844×390 screen with 6 cards; cards overlap more when there are more, and the hand never scrolls. At 100 px and above, use the card size that shows the full text. Leave room for a card to rise when it is dragged, and keep the hand clear of the bottom safe area (`env(safe-area-inset-bottom)`).
4. **The hint** "← Défausser · Ma main · Jouer →" must not take a line of height: show it faintly behind or beside the hand.
5. **Ghosts and animations.** When a card is played, a ghost flies to the player's board and the real card then lands there:
   - `spots.played` (in `usePlayIntent.js`) must now return a place on the strip (the tile of the card's zone if you can, otherwise the strip);
   - the strip carries `data-board` (the viewer's index) and `data-snap`; the "La table" button keeps `data-pile="table"`; the piles keep `data-pile="deck"` and `data-pile="discard"`; the hand keeps `data-zone="hand"`. Follow the contract at the top of `useCardAnimations.js`;
   - `boardHiddenUid` (a card shown elsewhere by a ghost: the intérimaire métier leaving, the Anniversaire card while gifts are chosen) must still hide that card's entry on the strip while the ghost is on screen;
   - the shake of a player hit by a malus (`anim-hit`) applies to the strip.
6. **Every state of the screen still works.** Check each one: the draw phase (the deck glows; the discard pile glows when its top card can be taken); a card that must be played first (the hand shows only that card); several plays left (Arc-en-ciel); Casino bets; the end-of-turn "linger" view where nothing can be touched; another player's turn seen by the Chercheur who must discard; the river (an internal option: it must still render, it does not need to be pretty).
7. `MyView.jsx` no longer uses `PlayedStacks`. If nothing else uses `PlayedStacks.jsx`, leave it for step V6 to delete, and say so.

## How to check your work

Dev server, preview in landscape at 844×390, 844×330 (the height inside a browser), 667×375 and 932×430.
- Measure the hand card width with 5, 6, 8 and 11 cards in hand at each size and give the numbers in your summary.
- Play several turns: swipe right to play, left to discard, tap to enlarge, swipe the enlarged card, cancel with "Annuler", let the toast finish.
- Buy an acquisition (the payment sheet), play a malus (the screen switches to "La table" and comes back), take the top discard.
- Open the strip, open a zone, go back to the hand.

## Rules for this session

- Display only: no change in `src/game/` or `src/session/`. The screens read only the view.
- Do not change what a gesture does, the thresholds of the swipe, or the logic of the toast.
- Landscape only. Keep swipe to play and discard, tap to enlarge, the yellow card back, the existing frames and illustrations.
- All player-facing text in French, card names exactly as printed.
- Be honest: if 100 px cannot be reached at 667×375 or at 330 of height, give the real number and what limits it.

## Done when

Hand cards are at least 100 px wide at 844×390 with 6 cards in hand; the strip opens the player's mat; every state of point 6 works; `npm test` and `npm run build` pass.

## How Teto tests it

Play a full game against the bot, from the home-screen icon. Can you read the cards in your hand without tapping them? Swipe right to play, left to discard, tap "Annuler" once. Tap the strip above your hand: your mat opens. Try with 7 or more cards in hand if you get the chance (Chercheur, or after a Troc).

## Finish

1. Run `npm test` and `npm run build`. Everything must pass.
2. Update the "Screens" section of `CLAUDE.md` (what "Ma main" shows). Keep it short.
3. In `docs/VISUALS-GUIDE.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary with the measured card widths, what changed, what did not, and exactly what to test.
