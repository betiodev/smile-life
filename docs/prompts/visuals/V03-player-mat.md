# Step V3 — The mat: one player's board in zones

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends on phones, in landscape only. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

**The problem, in words (you cannot see Teto's screenshots).** On an iPhone in landscape (about 844×390 CSS pixels; 330 high inside a browser), a player's placed cards are drawn as one row of stacks, one stack per kind of card. With ten stacks the row fills the width, so each card is 45 to 60 pixels wide, with a large empty band above and below. A title printed on a card that small is about 4 pixels high: unreadable. A stack shows its newest card and a "×7" badge; what the other six are cannot be seen without opening it. The code that does this is `src/components/PlayedStacks.jsx`.

**The physical game** is played on a mat with fixed zones: salaires above métier and études, enfants above mariage and flirts, one zone for acquisitions, one for malus, and a corner for cartes spéciales. Teto wants that idea: a table organised in clear zones, each in its category's colour. Only the idea: no artwork, logo or wording from the official mats.

**The hard limit.** A card's printed title is readable from about 100 pixels wide (146 high). A late-game player has 40 to 60 cards placed. They cannot all be readable cards. So: **a small card is a picture for recognising; its name is written next to it as real text.** Readable full cards appear when one zone is opened.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — only the section "How to use this roadmap"
- `docs/VISUALS-GUIDE.md` — all of "Design direction" (the sketches of "The mat" and "A zone opened" are the target of this step), and step V3
- `src/components/PlayedStacks.jsx` (what is shown today, and every special case: money under an acquisition, Piston under a métier, unspent Héritage, spent salaries, a Grand Prix without effect, the Casino), `TableView.jsx`, `GameScreen.jsx`, `CardZoom.jsx`, `Card.jsx`, `cardArt.js`, `useCardAnimations.js`, `layout.js`
- `src/game/state.js` (the selectors: the screens read zones only through them)

## Goal

A screen that shows one player's whole board as a mat of zones, and a "zone opened" row. Reached by tapping a player on "La table". The rest of the screens stays as it is (steps V4 and V5 change them).

## What to do

1. **The display table of zones** — `src/components/zones.js`, display only, no rule. One ordered list; each zone has an id, a French label, a colour taken from `TINTS` in `cardArt.js`, the cards it shows (through the selectors of `state.js`), and how one card is written as a line of text. The zones and their columns:
   - column "Vie pro": **Salaires** (top), **Études → Métier** (bottom);
   - column "Vie perso": **Enfants** (top), **Flirts → Mariage** (bottom, with the Adultère card);
   - column **Acquisitions** (full height): animals, voyages, maisons;
   - last column: **Distinctions · Spéciales** (top), **Malus** (bottom).
   A card on the board that no zone claims goes to a last zone, **Autres**, shown only when not empty, so that an extension card is never invisible. Leave room in the structure for an extension to add a zone and a fifth column later; do not build that now.
2. **A bar** — one line of real text for one card: name, smiles, and the one number that matters (salary level of a métier, value of a salary, price of an acquisition). Minimum text size 10 px. Identical cards share a bar with a count ("Études ×5", "Niveau 1 ×3"); flirts are never grouped, are listed newest first, and the newest is marked "dessus" (it is the only one that can be stolen). Words on the bar carry the state: "payé 2+1" (the money under an acquisition), "Piston" (under a métier), "sans effet" (a used Grand Prix), "dépensé" (spent money whose acquisition is gone), "3 liasses pour un futur achat" (an unspent Héritage), a shield for a protected card (`protectedByOf`), "carte cachée" for a face-down card (the view sends it as `{ hidden: true, faceDown: true }`). The Casino (open, or with a bet and whose) is a line in the last column.
3. **A zone** — its label and count in its colour, the picture of its newest card (the existing `Card` component at a small width, about 56 to 70 px), and its bars beside it. When there are more bars than lines, the last line says how many more ("+ 6 flirts").
4. **The mat** — `PlayerMat.jsx`: the four columns in a CSS grid filling the screen under a one-line header (back, previous / next player, the player's name in their colour, cards in hand, turns to skip, score). Use CSS grid and the tokens of step V2; avoid measuring in JavaScript.
5. **A zone opened** — `ZoneSheet.jsx`: tap a zone's label and every card of the zone is shown at readable size (at least 100 px wide), newest first, in one row that scrolls sideways; money that paid an acquisition is tucked under it, visible. Tap a card: the existing `CardZoom`. Tap a bar or a picture on the mat: `CardZoom` on that card directly.
6. **Wire it in.** On "La table" (still today's panels), tapping a player's panel when no target is being chosen opens that player's mat. Back returns to the table.
7. **Animations.** Follow the contract written at the top of `useCardAnimations.js`: the mat carries `data-board` and `data-snap`; every card of the board is findable by `data-card-uid` on an element that has a size (the picture for the newest card, the bar for the others; for a grouped bar, one covering element per grouped card).
8. **A test** — `tests/zones.test.mjs`, added to `npm test`: over the final boards of 20 simulated games, every board card appears in exactly one zone, and a made-up card type lands in "Autres".

## How to check your work

Dev server, preview in landscape at 844×390, 667×375 and 932×430, with the demo game (`#demo` at the end of the address: a late 4-player game). For each size: no text under 10 px, nothing cut off, no zone overflowing its column, the mat fits without scrolling. Look at a player with many flirts and one with several acquisitions. Then play a few turns of a normal game and watch a card fly to the board while the mat is open.

## Rules for this session

- Display only: no change in `src/game/` or `src/session/`. The screens read only the view; zones are read through the selectors of `state.js`.
- Do not change "Ma main" or the table overview in this step.
- Landscape only. Keep tap-to-enlarge, the yellow card back, the existing frames and illustrations.
- All visuals original; all player-facing text in French, card names exactly as printed.
- Be honest: if something in the sketch does not fit at 667×375, say so and show what you did instead.

## Done when

Tapping a player on "La table" opens their mat; every placed card can be found by name without opening anything; opening a zone shows its cards at readable size; `npm test` and `npm run build` pass.

## How Teto tests it

Open your game link with `#demo` at the end, tap "Prêt", then "Voir la table", then a player. Can you say, without tapping, what their métier is, how many flirts they have and which one is on top, and what their acquisitions are? Tap "Flirts": are the cards readable? Tap one: it enlarges as before.

## Finish

1. Run `npm test` and `npm run build`. Everything must pass.
2. Update the "Screens" section of `CLAUDE.md`: `zones.js` (the one table that says which card goes in which zone on screen), `PlayerMat.jsx`, `ZoneSheet.jsx`. Keep it short.
3. In `docs/VISUALS-GUIDE.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what is new, what is not changed yet (Ma main, the table overview), and exactly what to test.
