Smile Life — digital adaptation

Web version of the French card game Smile Life (Alexandre Seba / Blackrock Games). Goal: friends play together from a shared link. Currently local multiplayer (2–5 players, shared screen).

Stack & commands
React 18 + Tailwind CSS 4 + Vite. All game state lives in memory (useReducer).
npm run dev — local server · npm test — rule tests + 40 simulated games
Deploys to GitHub Pages automatically on push to main.
Where things are
src/data/cards.js — all 200 cards (source of truth for card data)
src/game/rules.js — placement/validation rules · reducer.js — game state machine · scoring.js — smiles count
src/components/ — screens and card rendering (Card.jsx)
tests/ — regles.test.mjs (rule cases), sim.mjs (full random games)
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
