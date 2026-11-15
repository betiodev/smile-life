Smile Life — digital adaptation

Web version of the French card game Smile Life (Alexandre Seba / Blackrock Games). Goal: friends play together from a shared link. Currently local multiplayer (2–4 players, shared screen).

Stack & commands
React 18 + Tailwind CSS 4 + Vite. All game state lives in memory (useReducer).
npm run dev — local server · npm test — rule tests + 40 simulated games + 50 golden games · npm run golden:update — re-record the golden games (only on purpose)
Deploys to GitHub Pages automatically on push to main.
Where things are
src/data/base.js — base-game card definitions (source of truth: 98 kinds, 200 cards; each has id `base.<slug>`, ext, count, tags) · index.js — CATALOGUE by id, buildDeck(extensions, rng), hasTag. A card in a game = its definition's fields + uid + def (the id)
src/game/rules.js — placement/validation rules · reducer.js — checks the actor, then hands the action to the active frame · flows/ — the flow stack: index.js (flowOf, startFlow, endFlow, finishFlow, activeFrame; setFlow for test set-up), turn.js (the turn: beginTurn, endTurn, finishPlay, consumePlay, setForced; setStep/setPlays for test set-up), one file per choice: purchase, chance, discard-pick, piston, troc, chef-troc, vengeance, casino-stake, birthday, chercheur-discard, journalist, medium · effects.js — what a played card does (poseSelf, applyMalus, specials) · scoring.js — smiles count · view.js — viewFor (what each player sees) · rng.js — seeded randomness · legal.js — legalActions(state, actor): every action a player may send now (works on a view too) · state.js — read-only selectors (zones: jobOf, jobs, isMarried, topFlirt, moneyOf, unspentMoney, malusOf, outOfGameCards, boardCards…; turn: topFrame, phaseOf, playsLeft, forcedOf, isRainbow, choiceOf (the choice on top of the turn, as { type, step, …data })…; work on a view too) · primitives.js — the only code that changes zones (draw, refill, place, remove, steal, flip, attach, loseJob, skip, take/put/move, log; plus set… helpers for test set-up) · events.js — event list and emit() · cards/ — card behaviours by definition id (base.js: Grand Prix flipped on jobLost)
src/components/ — screens and card rendering (Card.jsx)
src/session/ — driver.js: the only holder of the full state; dispatch(seat, action) stamps `by`, view(seat), 30-second deadlines on every flow above the turn (the turn itself is not timed) that play the top frame's fallback (fallbackAction in src/game/turn.js) · hotseat.js: shared-screen mode ("Passe l'écran" is UI, shown when the seat that must hold the screen changes)
tests/ — cartes.test.mjs (card definitions, totals, tags, opaque uids), regles.test.mjs (rule cases), flows.test.mjs (flow stack, purchase, forced card, fallbacks), session.test.mjs (driver, deadlines, hot-seat hand-over), sim.mjs (full random games picked from legalActions, step logic in sim-lib.mjs, integrity checks after every action in invariants.mjs), view.test.mjs (visibility + leak check), rng.test.mjs (seeded randomness, replay), primitives.test.mjs (primitives, events, and a scan that no zone is edited outside primitives.js), golden.test.mjs + golden.json (reference games)
Rules for working on this repo
All player-facing text is in French. Code comments may be French.
Keep game logic out of components: rules go in src/game/, display in src/components/.
Run npm test before every commit. When fixing a rule, add a test case in tests/regles.test.mjs.
No screens or timers in src/game/: the engine only knows status 'playing' | 'over'. Hand-over screens, deadlines and seats ({ name, color, kind: 'human' }) live in src/session/. Timed defaults (the driver's 30 s) are fallbackAction (src/game/turn.js): the top frame's fallback, for every flow but the turn. defaultAction gives the fallback of any wait, turn included (bots, departed players).
Randomness: never Math.random() in src/game/ (a test fails); draw from state.rng via src/game/rng.js. START_GAME takes an optional seed and extensions (list stored in state.extensions; only base exists for now); same seed + same actions = same game. rng and seed never appear in a view. Simulated games print their seed on failure (SEED=… GAME=… node tests/sim.mjs replays one).
Board zones: every zone is an array — per player jobs, marriages, adultery (at most one), money, malus (plus studies, flirts, children…); shared outOfGame entries are { card, cause, by }. Read zones through src/game/state.js, never p.jobs[0] by hand. Limits (one job, one marriage in the base game) are rules (maxJobs / maxMarriages in rules.js), not the shape.
State of placed cards lives in state.meta[uid] = { seq, used?, on? } (seq: placement order from state.seqCounter; used: spent salary/Héritage, inactive Grand Prix; on: the acquisition it paid for), never on the card or in a player field. Place and remove board cards only through the primitives, which create and delete the entry. Selectors that read meta take (state, player). viewFor sends meta only for cards on the table. The reducer copies state with structuredClone.
Groups of cards: rules use tags (hasTag(card, 'outlaw')…), never a list of card keys; a rule about one single card may use its key.
Primitives and events: every card that is drawn, placed, taken from a hand/discard/river or leaves a board goes through src/game/primitives.js (state first, players by index; primitives check no rule, the reducer validates first). remove(state, uid, { cause, by, to }) is the only way off a board (to: 'discard' in the owner's name, 'outOfGame', 'aside', { player }). Primitives announce events (list in events.js, closed); a card reacts by adding on: { event(state, ev, self) } in src/game/cards/, and only while it is on a board and not used. Events are handled at once and never stored in state.
Flow stack: state.stack = [turn frame, …frames on top]; a frame is plain data { flow, step, data }, never a function. The top frame decides whoMustAct, legalActions and the reducer; there is no state.pending. Every choice is a flow module with start, actors, legal, apply, resume, fallback, view (+ held for cards it holds aside); a flow's secrets live in its view, not in view.js. Flows nest: a flow that pushed another one on top of itself ends with finishFlow (waits at step 'done' until the child is done). The forced card is turn data (data.forced). Read the turn through state.js selectors, never s.stack[0] by hand. Tests set up a choice with setFlow(s, flow, step, data).
Legal actions: when you add or change an action or a rule, update its flow's legal too. The simulator checks after every action that each listed action is accepted by the reducer and that actions outside the list are refused.
Golden games: a pure refactor must keep tests/golden.json passing. A change that alters game results or the order of random draws re-records it with npm run golden:update and says so in the commit message.
Small, focused commits with a clear French message.
Do not use official Blackrock Games artwork or logos — all visuals must be original.
Verified rules (from the physical game — do not "correct" these)
Flirts are never flipped; only the top/most recent flirt can be stolen.
Piston cannot be used for the Grand Prof promotion.
The Piston card stays behind the métier it gave (meta.on = that job), face up, so everyone sees why that player has the job. When that métier is lost (Licenciement, démission…), the Piston joins the other used cartes spéciales.
Licorne doubles only with BOTH Arc-en-ciel AND Étoile filante.
A salary taken from the discard pile (must be played immediately) may instead be bet at the Casino.
Purchases: each salary invested must be necessary to reach the cost (no over-investing to dodge Impôt); overpaying for lack of change is allowed.
Losing the Chercheur job (Licenciement, resignation): the player discards 1 extra card from their hand and THEY choose it, even during another player's turn (flow chercheur-discard). Empty hand → no extra discard.
Ce que chaque joueur voit (src/game/view.js — verified, do not change)
The UI must only read from viewFor(state, viewer) (through the driver's view(seat)), never from the full state; actions go through the driver, which stamps `by`. viewer = player index, or null for a spectator (hand-over and game-over screens).
Public: every board, river, out-of-game pile (outOfGame, with cause and author), forced card, log, purchase and birthday choices, the WHOLE discard pile, every hand SIZE and the deck SIZE (deckCount).
Hands: only your own; other hands are placeholders { uid: 'hidden-<player>-<index>', hidden: true } with no card data.
Deck: never sent, only deckCount.
Médium: the 13 cards only to the Médium, only while its flow is open. Journaliste: only the Journaliste sees the other hands (data.hands of its flow), only while its flow is open. Chance: the 3 cards only to the current player.
Chef troc: protectedUid / oppPickedUid only to the Chef; everyone else gets pickCount (picks are by index, face down).
Casino stake: only the staker sees the card; everyone else sees { by, hidden: true }.
Card uids are numbered after a seeded shuffle, but a uid still lets you follow a card: a hidden card must never appear with its real uid anywhere in a view. Log messages must never name a hidden card.

Planning documents (read before any large change)
docs/ROADMAP.md — the ordered list of steps; each step has a prompt in docs/prompts/. Tick a step only when it is finished and tested.
docs/planning/ARCHITECTURE.md — target engine design for the extensions (card definitions, queries and modifiers, flows, driver). docs/planning/AUDIT.md — how the code worked before the migration.
docs/extensions/<name>/ — one folder per extension: rules transcript, spec (<name>.md) and card-data table. docs/extensions/INTERACTIONS.md — clashes between extensions.
Rules authority: transcripts and Teto's recorded Decisions. Never invent a ruling: ask Teto, then record the answer in the spec.
Nothing under docs/ is published. Never put rules text or leaflet photos in public/ (everything there is published).
