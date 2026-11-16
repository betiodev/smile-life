# Step F5 — Hand-over and animations that work for any player's action

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

Today every action comes from the one phone that is passed around. Computer players arrive at roadmap step 13 and other phones later. A review (`docs/planning/CODE-REVIEW.md`, findings B4, B5, C2) found three places in the session and screen code that only work while every action comes from the local screen:

1. **Hand-over.** `src/session/hotseat.js` decides who must hold the phone. It knows one special case by name: the flow `chercheur-discard` (a player who is not the current one must choose a card from their own hand). Extensions add many such choices.
2. **Animations.** `src/components/GameScreen.jsx` shakes the board of the player hit by a malus. It finds the victim in `lastAction`, the last action *this screen* sent. An action sent by a bot or by another phone never passes through it.
3. **A small bug.** During an Arc-en-ciel, the button "Terminer mon tour" stays active while the 3-second "Annuler" toast of a swiped card is still counting. Tapping it ends the turn and the card is silently not played.

## Read first

- `CLAUDE.md` — including the section "Ce que chaque joueur voit", which is verified and must stay true
- `docs/ROADMAP.md` — only the section "How to use this roadmap"
- `docs/FIXES-GUIDE.md` — find step F5
- `src/session/hotseat.js`, `src/session/driver.js`, `src/game/flows/index.js`, `src/game/flows/chercheur-discard.js`
- `src/App.jsx`, `src/components/GameScreen.jsx` (the hook `useCardAnimations`), `usePlayIntent.js`, `MyView.jsx` (the `Actions` component), `TransitionScreen.jsx`
- `tests/session.test.mjs`, `tests/view.test.mjs`

## Goal

The hot-seat hand-over works for any flow that declares it needs the chooser's own screen; the view carries a safe summary of the last action, and the animations use it; the turn buttons wait for the toast.

## What to do

**Hand-over**

1. A flow module may declare `ownScreen: true`: "the player who acts in this flow needs their own screen (their hand)". Set it on `chercheur-discard`. Document the field in the header of `src/game/flows/index.js`. Flows without it are answered on the current player's screen, as Anniversaire and the Chef's troc are today.
2. Add a helper next to the flow registry that works **on a view**: given a view, which seat must hold the screen? The first actor of the top frame if its flow has `ownScreen` and that actor is not the current player; otherwise the current player.
3. `hotseat.js` uses the helper and no longer names any flow. The screen kinds stay the same; replace the reason `'chercheur'` by `'choice'` and carry the flow's name.
4. In `App.jsx`, the text of the hand-over screen comes from a small table by flow name (keep today's sentence for the Chercheur) with a general fallback: "Un choix t'attend."
5. Tests: the existing hand-over tests still pass; add one with a fake `ownScreen` flow registered by the test extension, and one with a flow that has other actors but no `ownScreen` (the screen stays with the current player).

**Last action in the view**

6. `driver.view(seat)` adds `lastAction` and `actionCount` (number of accepted actions, so a screen can tell a new action from the same one). `lastAction` is built from an **explicit list per action type** of what is public:
   - `PLAY_MALUS` and `VENGEANCE_PICK`: `{ type, by, target, uid }` (the malus ends face up on a board, in the discard pile or out of the game);
   - `TROC_PICK`, `CHEF_TROC_TARGET`: `{ type, by, target }`;
   - every other type, and any type not in the list: `{ type, by }` only. Never a card uid, never an index.
7. `useCardAnimations` reads the victim and the malus card from `state.lastAction` when `state.actionCount` has changed, instead of the local `lastAction`. Keep the local value only for the `quiet` flag (a card already shown at its place by the toast's ghost), which is a detail of this screen.
8. Tests: over simulated games, `lastAction` in every view never contains a `uid` or an `index` except for the two malus types; a view never contains the uid of a card hidden from its viewer (the existing leak scan must cover the new field: check that it does, extend it if not).

**Toast**

9. While a play intent is pending (the toast is counting, or a choice sheet is open), the buttons of the `Actions` column that send an action directly (Terminer mon tour, Arrêter l'adultère, Démissionner, Divorcer, the Casino bets) and the deck are disabled. They work again as soon as the intent is confirmed or cancelled.

## Rules for this session

- No change to any rule, and no change in `src/game/` beyond the `ownScreen` field and the helper. `tests/golden.json` must not be modified.
- What each player sees of the game itself must not change. `lastAction` is an addition, and it must never name a hidden card.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If something is unclear, ask Teto.
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only the view.

## Done when

`hotseat.js` names no flow; the view's `lastAction` exists and is tested as safe; animations no longer depend on which screen sent the action; the turn buttons are disabled during the toast; `npm test` passes.

## How Teto tests it

3-player game on your phone. (1) If you can, give a player the Chercheur and fire them with a Licenciement: the phone must be passed to them to choose a card, as before. (2) Play a malus on a player: their area shakes. (3) Play Arc-en-ciel, swipe a card and tap "Terminer mon tour" during the 3 seconds: the button must not react; when the card is played it works again.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. Update `CLAUDE.md`: the flow-stack rule (`ownScreen`), the `src/session/` line (`lastAction`, `actionCount`, the list of what is public per action type), and the view section (one sentence on `lastAction`). Keep it short.
3. In `docs/FIXES-GUIDE.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test (the "How you test it" line of this step in the fixes guide).
