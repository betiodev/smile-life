Smile Life — digital adaptation

Web version of the French card game Smile Life (Alexandre Seba / Blackrock Games). Goal: friends play together from a shared link. Currently local multiplayer (2–5 players, shared screen).

Stack & commands
React 18 + Tailwind CSS 4 + Vite. All game state lives in memory (useReducer).
npm run dev — local server · npm test — rule tests + 40 simulated games
Deploys to GitHub Pages automatically on push to main.
Where things are
src/data/cards.js — all 200 cards (source of truth for card data)
src/game/rules.js — placement/validation rules · reducer.js — game state machine · scoring.js — smiles count · view.js — viewFor (what each player sees)
src/components/ — screens and card rendering (Card.jsx)
tests/ — regles.test.mjs (rule cases), sim.mjs (full random games, step logic in sim-lib.mjs), view.test.mjs (visibility + leak check)
Rules for working on this repo
All player-facing text is in French. Code comments may be French.
Keep game logic out of components: rules go in src/game/, display in src/components/.
Run npm test before every commit. When fixing a rule, add a test case in tests/regles.test.mjs.
Small, focused commits with a clear French message.
Do not use official Blackrock Games artwork or logos — all visuals must be original.
Verified rules (from the physical game — do not "correct" these)
Flirts are never flipped; only the top/most recent flirt can be stolen.
Piston cannot be used for the Grand Prof promotion.
Licorne doubles only with BOTH Arc-en-ciel AND Étoile filante.
Purchases: each salary invested must be necessary to reach the cost (no over-investing to dodge Impôt); overpaying for lack of change is allowed.
Losing the Chercheur job (Licenciement, resignation): the player discards 1 extra card from their hand and THEY choose it, even during another player's turn (pending chercheur-discard). Empty hand → no extra discard.
Ce que chaque joueur voit (src/game/view.js — verified, do not change)
The UI must only read from viewFor(state, viewer), never from the full state; actions still go to the full reducer. viewer = player index, or null for a spectator (transition and game-over screens).
Public: every board, river, removed pile, forced card, log, purchase and birthday pendings, the WHOLE discard pile, every hand SIZE and the deck SIZE (deckCount).
Hands: only your own; other hands are placeholders { uid: 'hidden-<player>-<index>', hidden: true } with no card data.
Deck: never sent, only deckCount.
Médium: the 13 cards only to the Médium, only while the pending is open. Journaliste: only the Journaliste sees the other hands (pending.hands), only while the pending is open. Chance: the 3 cards only to the current player.
Chef troc: protectedUid / oppPickedUid only to the Chef; everyone else gets pickCount (picks are by index, face down).
Casino stake: only the staker sees the card; everyone else sees { by, hidden: true }.
Card uids leak card types (buildDeck numbers them in order): a hidden card must never appear with its real uid anywhere in a view. Log messages must never name a hidden card.
