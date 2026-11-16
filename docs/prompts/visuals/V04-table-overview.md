# Step V4 — La table: every opponent at a glance

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends on phones, in landscape only. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

**The problem, in words (you cannot see Teto's screenshots).** The second game screen, "La table", shows the other players, one panel each, in a grid of two columns. Inside a panel the player's placed cards are a row of small stacks (`src/components/PlayedStacks.jsx`): on an iPhone in landscape (about 844×390 CSS pixels; 330 high inside a browser) the cards are 45 to 60 pixels wide, unreadable, with empty space above and below. With three opponents each panel is a quarter of the screen and it gets worse.

**What already exists (step V3).** `PlayerMat.jsx` shows one player's whole board in coloured zones, with each card written as a line of text; `ZoneSheet.jsx` shows every card of one zone at readable size; `zones.js` is the one table that says which card goes in which zone.

**The limit.** Three opponents share the width: about 250 pixels each. Card pictures would be 25 pixels wide. So the overview shows **words and numbers only**, and one tap opens a player's mat.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — only the section "How to use this roadmap"
- `docs/VISUALS-GUIDE.md` — all of "Design direction" (the sketch of "La table (overview)" is the target of this step), and step V4
- `src/components/TableView.jsx` (including the `targeting` object described in its comments), `PlayerMat.jsx`, `ZoneSheet.jsx`, `zones.js`, `GameScreen.jsx`, `usePlayIntent.js`, `useCardAnimations.js`, `PlayChoices.jsx` (the `Dock` component)
- `src/game/state.js`

## Goal

"La table" becomes: with one opponent, that player's mat directly; with two or three, one summary column per opponent. The discard pile and the out-of-game pile can be browsed from this screen.

## What to do

1. **One summary column per opponent** (`PlayerSummary.jsx` or similar), built from `zones.js`:
   - a header in the player's colour: name, cards in hand, turns to skip, score; a clear mark when it is that player's turn;
   - one line per zone, with the zone's colour as a stripe: label, count, and the one thing worth knowing — the métier's name and its salary level; "×6 · niveau 6" for études; "×2 · 4 liasses" for unspent salaries; the name of the top flirt; the mariage's name; the newest acquisition; counts for the rest; "—" when empty. Minimum text size 10 px; long names are cut with "…".
   - the whole column is a button: tap opens the player's mat (V3), with previous / next to move between players.
2. **One opponent:** show their mat directly, with the table's header above it.
3. **The header of "La table":** back to "Ma main", whose turn it is, and three small buttons on the right: "Défausse 23", "Hors jeu 4", and "Centre 1" **only when the centre holds a card** (it is empty in the base game). Each opens a sliding row of readable cards, newest first, reusing `ZoneSheet`. For "Hors jeu", write under each card why it left and who caused it (the entries carry `cause` and `by`). Use `loading="lazy"` images: the discard pile can hold 150 cards.
4. **Choosing a target** (malus, Troc, Vengeance). `TableView` receives a `targeting` object: `{ title, card, from, check(i) → { ok, reason }, selected, onSelect(i), onConfirm, onCancel }`. Keep that interface exactly. On the new screen each column is the button: allowed columns stand out, the others are grey and show the reason, the selected one is clearly marked, "Annuler" and "Confirmer" stay in the header with the card being played (`Dock`). With one opponent, the mat is shown with the same header and the same confirm step. While a target is being chosen, tapping a column selects it and does not open the mat.
5. **Animations.** Each column carries `data-board` (the player's index) and `data-snap`, and the class that shakes a player hit by a malus (`anim-hit`) applies to the column. Cards flying to an opponent land on the column. Follow the contract at the top of `useCardAnimations.js`.
6. `TableView.jsx` no longer uses `PlayedStacks`. Do not delete `PlayedStacks.jsx`: "Ma main" still uses it until step V5.

## How to check your work

Dev server, preview in landscape at 844×390, 667×375 and 932×430.
- Demo game (`#demo`): three columns, nothing cut off, no text under 10 px. Open a player, move to the next, come back.
- A normal 2-player game: the table is the opponent's mat.
- A normal 3-player game: play a malus and choose a target; check a refused target shows its reason; cancel once, confirm once; watch the malus card fly to the column and the column shake.
- Play Troc and Vengeance if you can set them up; otherwise say in your summary that they were not checked.

## Rules for this session

- Display only: no change in `src/game/` or `src/session/`. The screens read only the view.
- Do not change "Ma main" in this step. Do not change how a play is confirmed or cancelled (`usePlayIntent.js`) beyond what the new screen needs.
- Landscape only. All player-facing text in French, card names exactly as printed.
- Be honest: if something in the sketch does not fit at 667×375, say so and show what you did instead.

## Done when

With 2 or 3 opponents each has a column of readable lines; with 1 opponent the mat is shown directly; choosing a target works on the new columns; the discard and out-of-game piles can be browsed; `npm test` and `npm run build` pass.

## How Teto tests it

Open your game link with `#demo` and tap "Voir la table": three columns, every line readable. Tap one: the mat. Go back. Then play a real game against the bot: play a malus and choose the target on the new screen; a player who cannot be targeted is grey and says why. Tap "Défausse": you can slide through the discarded cards.

## Finish

1. Run `npm test` and `npm run build`. Everything must pass.
2. Update the "Screens" section of `CLAUDE.md` (what "La table" shows, the three pile buttons). Keep it short.
3. In `docs/VISUALS-GUIDE.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test.
