# Architecture — an engine that can carry all six extensions

Status: design, written 2026-11-11 by Claude Fable. Nothing here is built yet. `docs/ROADMAP.md` turns the migration plan (section 12) into sessions.

Read `docs/planning/AUDIT.md` first for how the code works today.

## 0. The design in one page

Today the engine knows every card by name inside five `switch` statements. That works for 200 cards whose effects are mostly "do one thing now". It does not work for extensions, where a card can change a rule for everyone, for the rest of the game, in combination with other cards.

The new engine keeps what is good (pure reducer, actions signed with `by`, `viewFor`) and changes five things:

1. **Cards are data plus a behaviour looked up by id.** Card data comes straight from the fill-in tables. Behaviour lives in a registry, one file per extension. The base game becomes "extension zero" and uses the same registry.
2. **Rules are questions with modifiers.** The engine asks a fixed list of questions ("may this player place this card?", "what salary levels may they place?", "what does this cost?"). Any card on the table can modify the answer. One function decides who wins when cards disagree.
3. **Everything that happens to a card goes through a few primitives** (draw, place, remove, move). Primitives check protection and announce events. Cards react to events.
4. **A stack of flows replaces the single `pending` slot.** A flow is a small step-by-step procedure (a purchase, a monster going round the table, a vote). Flows can nest. Every step that waits for a player has a default answer, which is what timeouts, bots and departed players use.
5. **The engine stops knowing about screens, timers and phones.** A thin *driver* around the engine owns those. Hot-seat, same-wifi host, online host and bots are four drivers over the same engine.

Layers, bottom to top. Each only knows the ones below it.

```
data        card definitions (plain JSON-like objects, no functions)
engine      pure: (state, action) → state.  Queries, primitives, flows, card behaviours
view        viewFor(state, viewer) → what one player may know
driver      owns the real state, timers, bots, saving.  One per game, on the host device
transport   local (same device) or PeerJS (other phones)
UI          React.  Reads views, sends actions
```

## 1. What stays exactly as it is

- The reducer is pure and runs in Node without a browser.
- Every action carries `by`; the engine rejects actions from players who may not act.
- The UI reads only `viewFor(state, viewer)`.
- Rule checks return `{ ok, reason }` with the reason in French.
- All verified base rules in `CLAUDE.md`. The base rule tests must pass unchanged, apart from test set-up code, at every migration step.

## 2. Card data

### 2.1 Definitions and instances

A **definition** describes a kind of card. An **instance** is one physical card in a game.

```js
// src/data/ext/gp.js  — one entry per row of the fill-in table
{ id: 'gp.drh', ext: 'gp', type: 'job', name: 'DRH',
  studyReq: 4, salaryLevel: 3, smiles: 2, status: null, count: 1,
  flavor: 'Licenciez une personne (sauf bandit et fonctionnaire)',
  tags: [] }
```

- `id` is `<ext>.<slug>` and never changes. Extension ids: `base`, `gp`, `luxe`, `trash`, `pol`, `fan`, `apo`.
- `ext` is the origin tag (needed by Four Women, Fée, "acquisition de luxe", and deck building).
- `type` keeps today's values and adds what the extensions need: `study, job, salary, flirt, marriage, adultery, child, malus, special, acquisition, distinction` plus `money` (argent sale, bijoux, primes, allocations), `global` (réformes, crises, events, éphémérides, taxes, monsters), `party`, `character`, `attachment` (Star).
- `subtype` refines a type: acquisitions are `animal, travel, house, apartment, weapon, vehicle, survival, object, potion, drug, luxe…`; globals are `reform, crisis, event, ephemeride, tax, monster`.
- `tags` are how cards refer to groups of other cards **without naming them**. Policier chases everything tagged `outlaw` (Bandit, Gourou, and with Trash also Proxénète and Dealer). Other tags: `prof`, `trophy`, `fonctionnaire`, `interim`, `political`, `minister`, `housing`, `house`, `drug`, `stuckInHand`, `autoPlay`. A cross-extension reference is always a tag or an id guarded by "is that extension in this game?".
- Children get `gender: 'fille' | 'garcon'`, **including the ten base children**.
- A definition never contains a function. Definitions are the same on every device.

An instance in state is the definition's fields copied onto an object with a `uid`, as today, plus `def: 'gp.drh'`. Keeping the fields on the instance means existing code that reads `card.type` or `card.smiles` keeps working.

**Uids become opaque.** Today `buildDeck` numbers cards in order, so `c27` is always a métier. The new `buildDeck` numbers cards *after* a seeded shuffle of the numbering, so a uid says nothing about the card. The rule "a hidden card never appears with its real uid" stays anyway, because a uid still lets you follow one card from zone to zone.

### 2.2 From fill-in table to code

The Girl Power workbook is the model. One sheet per category, one row per different card:

| Sheet | Columns | Becomes |
|---|---|---|
| Métiers | Nom, Niveau d'études requis, Salaire max (niveau), Smiles, Statut, Exemplaires, Notes | `name, studyReq, salaryLevel, smiles, status, count, flavor` |
| Études sup' | Nom / texte, Smiles, Exemplaires, Notes | `name, smiles, count`, and `levels` (currently hidden in Notes) |
| Flirts | Lieu, Smiles, Permet un enfant ?, Notes | `place, smiles, allowsChild` |
| Mariages | Lieu, Smiles, Notes | `name, smiles` |
| Acquisitions | Nom, Prix, Smiles, Animal ?, Exemplaires, Notes | `name, cost, smiles, subtype, count` |
| Enfants | Nom, Genre, Smiles, Notes | `name, gender, smiles` |
| Primes de naissance | Nom, Enfants posés requis, Valeur, Smiles, Notes | `type: 'money'`, `requires, value, smiles` |
| Spéciales & Malus | Nom, Catégorie, Smiles, Exemplaires, Notes | `type, name, smiles, count, desc` |
| Enfants jeu de base | Nom, Genre, Notes | `gender` on base children |

The implementation session for an extension reads the workbook and writes `src/data/ext/<id>.js` by hand. A test then checks the totals against the leaflet (Girl Power: 60 cards, 11 métiers, 7 enfants…), which catches a missed or doubled row. No converter script: six workbooks don't justify one.

"Notes" holds the text printed on the card. It becomes `flavor` or `desc` and is shown to players, so it must be the exact French wording.

### 2.3 Deck building and game set-up

```js
{ type: 'START_GAME', seats: [...], extensions: ['gp', 'luxe'], options: {...}, seed: 123456 }
```

- `buildDeck(extensions)` takes every definition of the chosen extensions that has `inDeck !== false` (characters and Apocalypse timers are not in the deck), `count` times each.
- Set-up is itself a flow (section 6), so extensions can add steps: deal one Fantastique character per player, handle auto-play cards in opening hands, shuffle an éphéméride back.
- `options` is where a deck-size limit would go if Teto wants shorter games with many extensions.
- The list of enabled extensions is stored in state. Behaviours and bonus rules (Four Women, Ladies Night, Anarchie, Messe noire) of extensions that are not enabled are never consulted.

## 3. Game state

State stays one plain JSON object. It can be saved, sent and compared. No functions, no class instances, no `Map` or `Set`.

### 3.1 Zones

Every zone is an array of card instances.

**Per player**

| Zone | Today | Change |
|---|---|---|
| `hand`, `studies`, `flirts`, `children`, `acquisitions`, `specials` | arrays of cards | none |
| `jobs` | `job` (one card or null) | array; the number of slots is a query |
| `marriages` | `marriage` | array; slots are a query (Polygamie) |
| `adultery` | one card or null | array of at most one, for uniformity |
| `money` | `salaries: [{card, invested, paidFor}]` | array of cards; everything that pays (salaries, argent sale, bijoux, primes, allocations) |
| `distinctions` | `[{card, active}]` | array of cards |
| `malus` | `malusKept` | renamed; received malus and maléfices |
| `party` | — | Politique |
| `character` | — | Fantastique, fixed for the game |

Selectors hide the shape: `jobOf(p)` (the only or first job), `jobs(p)`, `isMarried(p)`, `topFlirt(p)`. UI, rules and tests go through selectors, so a shape change touches one file.

**Shared**

| Zone | Contents |
|---|---|
| `deck` | never sent to players |
| `discard` | public, whole pile; each entry remembers who discarded it |
| `outOfGame` | today's `removed`. Public. Each entry remembers why it left (attentat, monster, dragon, crisis ended…), because which cards can be recovered from it is a ruling per extension |
| `river` | already exists; used by Lune bleue only once the standalone mode is removed |
| `center` | cards in force for everyone: réformes (stacked by domain), current éphéméride, crises and timed events, the election card, a monster on its way round |
| `pot` | Politique tax money |
| `spare` | cards set aside at set-up (unused characters, cards beyond a deck-size limit). Never visible |

### 3.2 Card meta: the state of a placed card

One table holds everything the engine knows about a card that is on the table:

```js
state.meta = {
  'k8f2': { seq: 141, used: false, on: null, protectedBy: null, faceDown: false, fraud: false, timer: null },
}
```

| Field | Meaning | Needed by |
|---|---|---|
| `seq` | global placement counter. Higher = placed more recently | "most recent wins"; "dernier salaire/flirt/enfant" |
| `used` | flipped after use; still scores, no longer acts | spent money, used weapons and vehicles, eaten animals, Girl power replays, inactive Grand prix, Buzz after a firing, amulettes |
| `on` | uid of the card this one sits on or under | salaries under an acquisition, Star on a job, salaries on Dette / Paradis fiscal, flirts on Sugar daddy, voyages on Première classe, the card in a Bunker or under the Cape, réformes stacked by domain |
| `protectedBy` | uid of the protecting card, or a reason code | Super bouclier, Bunker, Cape, Partouze flirts, cards gained by a pouvoir éphémère |
| `faceDown` | hidden from everyone, position shuffled | Purge |
| `fraud` | bought with pot money | Détournement de fonds |
| `timer` | rounds left, and whose turn ticks it | crises, timed events |

This replaces `invested` / `paidFor` on salaries, `active` on distinctions and the `heritageFor` map, which are the same ideas under three names. When a card leaves the table its meta entry is deleted.

A side table is used instead of wrapping every card in `{ card, …flags }` because zones then stay simple arrays of cards and most existing code is untouched.

### 3.3 Player and game flags

Kept small on purpose. Most "statuses" are not flags: they are a malus sitting in the player's `malus` zone whose behaviour modifies a query (Stérilité, Amputation, Exhibition, Plafond de verre…). Real flags are only facts that no card on the table records:

- per player: `skipTurns`, `history` (`wasBandit`, `didAttentat`, `hadJob`, `tookFromPot`, `ephemeralUsed`), `handDelta` (Roulette russe −1, Magicien ±1), `extraTurns`.
- per game: `direction` (+1 / −1), `round`, `seqCounter`, `rng`, `extensions`, `status` (`playing` / `over`).

### 3.4 What leaves the game state

`screen`, the `transition` step and the `READY` action are hot-seat display concerns and move to the driver (section 8). The engine only knows `status`.

### 3.5 Copying state

The hand-written `cloneState` is replaced by `structuredClone(state)`. A new zone can then never be forgotten in the copy. If bot simulations later prove too slow, optimise then, with the invariant tests as a safety net.

## 4. Randomness

All randomness comes from a small seeded generator whose state lives in `state.rng`. `Math.random()` is banned in `src/game/` and a test greps for it.

- A game can be replayed exactly from its seed and action list. A bug report becomes a file.
- Tests are repeatable.
- `state.rng` is never sent in a view.

Log entry ids also move into state (today a module-level counter).

## 5. Rules: queries, modifiers and precedence

### 5.1 Queries

The engine asks a fixed set of questions. Each has a base answer (today's rule) that card behaviours can modify.

| Query | Base answer | Examples of modifiers |
|---|---|---|
| `canPlace(player, card)` | today's `canPoseSelf` | Crise sanitaire, Anneau de pouvoir, Plafond de verre, Dette, réformes, Stérilité, Potion de fertilité |
| `canTarget(attacker, card, target, targetCard?)` | today's `canPlayMalus` | Garagiste, Démontage de cliché, Ange, Four Women, Survivaliste, Casburnas, Alcatras |
| `isProtected(card, cause)` | no | Super bouclier, Bunker, Cape, Coffre-fort |
| `salaryLevels(player)` | `{1…job level}`; a **set**, not a maximum | Grand prix, Infirmière (1 and 3), Égalité de salaire, Promotion canapé, Star, réforme ±1, Mariage d'argent, Minus / Maxus, Croque-mort, Anarchie |
| `studyLevel(player)` | sum of levels | École privée, Potion de savoir |
| `studyReq(player, job)` | printed | réforme enseignement, Piston |
| `jobSlots`, `marriageSlots`, `flirtLimit`, `studyCardLimit` | 1, 1, 5, 6 | Démontage, Proviseure, Polygamie, Barmaid, Maison close, Sirène, réformes |
| `canHaveChild(player)` | married, or one child with a top Hôtel/Camping flirt | Stérilité, Fertilité, Prêtre, Capote trouée, Crise alimentaire, réforme natalité |
| `price(player, card)` | printed; houses half when married | Architecte, Pilote, "gratuit pour…", half price, Ristournelle, Liquidation totale, Groloto, Balai |
| `paymentRule(player)` | overpaying allowed, no superfluous salary | Salrapas (exact change) |
| `handSize(player)` | 5 | Chercheur, Roulette russe, Magicien, Messe noire, Crise écologique |
| `canDiscard(player, card)` | yes unless it must be played | Virus, Sextape |
| `drawMode(player)` | draw one, then play | Hémorragie (none), Star (two, keep one), Aveuglement (play, then draw), Crise politique (face-up deck), Amputation (no discard pile) |
| `skipLength(player, malus)` | printed | Bisrepetitas |
| `cardSmiles(player, card)` | printed | Loup-garou, Vampire, Fée, Magicien, Zoophilie, VIP, Gynocratie / Phallocratie, Tâches ménagères, Paradis fiscal, Licorne |
| `scoreBonus(player)` | 0 | Ladies Night, Famille monoparentale, Sado-maso, Virus −3, Mano negra |
| `nextPlayer` | clockwise | partis politiques |

The list is closed. A new card adds a modifier to an existing query. A new query is added only when no existing one fits, and that is a design change worth a note in this file.

### 5.2 Modifiers

A behaviour declares modifiers. A modifier is active while its card is in force: on a player's board and not `used`, in a player's `malus` zone, in `center` on top of its stack, or as a player's character. Bonus rules of an enabled extension are always in force.

```js
// src/game/cards/base.js
'base.garagiste': {
  modifiers: [{
    query: 'canTarget', scope: 'owner-is-target',
    when: (q) => q.card.def === 'base.accident',
    effect: { forbid: 'Le Garagiste ne subit aucun accident' },
  }],
},
```

Scope says whose question it changes: the card's owner, the owner when targeted, or everyone. An effect is one of:

- yes/no questions: `allow` or `forbid` (with the French reason);
- numbers: `set`, `add`, `multiply`, `min`, `max`;
- sets (salary levels): `include`, `exclude`, `replace`.

### 5.3 Who wins: one precedence function

All answers are combined in **one** function, `resolve(query, baseAnswer, contributions)`. Each contribution carries its `seq`, its source kind (personal card, received malus, global card, character, bonus rule) and its effect. This is the only place where precedence is decided, so a ruling from Teto is a change in one table and one test.

Default precedence, built only from what the leaflets say:

1. **Numbers:** apply `set`, then `add` / `multiply`, then the query's hard bounds. Among several `set`, the highest `seq` wins. Source: Politique, "Grand prix (niv. 4) and réforme (−1) = niv. 3", and "level-4 jobs cannot be raised further".
2. **Yes/no, two personal effects that contradict:** the highest `seq` wins. Source: the global rule in the Girl Power leaflet, and Fantastique's Fertilité against Stérilité.
3. **A limit set by a réforme against a personal "unlimited":** the personal effect wins. Source: Politique, "les effets permettant de dépasser une limite s'appliquent".
4. **A réforme that forbids an action:** the réforme wins, except for players who may ignore réformes (ministres, président). Source: Politique, "une réforme interdisant une action reste prioritaire".
5. **A personal ban under a réforme that allows:** the ban still applies. Source: Politique.

Rules 2 and 4 can disagree (a personal `allow` placed after a forbidding réforme). The leaflets do not settle it. It is listed for Teto in `docs/extensions/INTERACTIONS.md`; until ruled, the engine follows rule 4.

Every pair of cards that can disagree gets a row in `INTERACTIONS.md` and a test.

## 6. Things that happen: primitives, events and flows

### 6.1 Primitives

Card behaviours never edit zones directly. They call a small library:

`draw`, `refill`, `place`, `remove`, `move`, `steal`, `flip`, `attach`, `loseJob`, `skip`, `pay`, `giveMoney`, `shuffleInto`, `reveal`, `log`.

Three of them carry most of the weight:

- **`draw(state, player, { from, count, mode })`** is the only way a card leaves the deck. It checks `autoPlay` cards (crises, events, monsters, réformes, taxes, éphémérides, Mine antipersonnel) and starts their flow instead of putting them in hand. Opening hands, refills, Chance and Médium all go through it, so "placed as soon as drawn, even from a starting hand" is implemented once. Each extension's exception (Apocalypse: not with Chance; Politique: even with Chance) is a field on the definition.
- **`place(state, player, card, { unconditional })`** puts a card on a board, gives it `seq`, fires `cardPlaced`. Stolen, redistributed and "sans condition" cards use the same path with `unconditional: true`.
- **`remove(state, uid, { cause, by, to })`** is the only way a placed card leaves a board. It asks `isProtected`, moves the card to `discard`, `outOfGame`, a hand or another board, clears its meta, handles cards stacked on it, and fires `cardLeft`. Today each malus removes cards its own way, which is why "protected" could not be added in one place.

### 6.2 Events

Primitives announce what happened. Behaviours subscribe.

`gameSetup`, `turnStart`, `cardDrawn`, `cardPlaced`, `cardLeft`, `jobLost`, `malusReceived`, `handRefilled`, `turnEnd`, `roundEnd`, `gameEnd`.

```js
'gp.dragon': {
  on: { cardPlaced: (state, ev) => { /* if owner now has Dragon and Dany: start the 'burn' flow */ } },
},
```

A subscriber may change state through primitives or start a flow. It may not wait for a player; only flows wait.

### 6.3 Flows: the stack that replaces `pending`

`state.stack` is an array of **frames**. A frame is plain data: `{ flow: 'purchase', step: 'pay', data: {…} }`. The top frame decides who may act and which actions are legal. The turn itself is the bottom frame.

A flow is a module:

```js
// src/game/flows/purchase.js
export default {
  start(state, data) {},                // set the first step
  actors(state, frame) {},              // who may act now (replaces the RULES list in turn.js)
  legal(state, frame, actor) {},        // every legal action for this actor, fully listed
  apply(state, frame, action) {},       // perform one action; may push another flow or pop this one
  resume(state, frame, result) {},      // the flow pushed on top of this one has finished
  fallback(state, frame, actor) {},     // the action taken on timeout, by a bot with no opinion, or for a player who left
  view(state, frame, viewer) {},        // what this viewer may know about the frame
}
```

Four rules make this hold together:

1. **Frames are data.** "What to do next" is the frame's `step` or a named flow, never a stored function. The stack must survive being saved and sent.
2. **Every wait has a `fallback`.** Today two prompts have one (Anniversaire gives the smallest salary, Chercheur discards at random). Making it compulsory is what lets one mechanism handle timeouts, bots and departed players.
3. **Flows nest.** Starting a flow while another is waiting pushes a frame; finishing pops it and calls `resume` on the one below. A monster drawn during a purchase during a crisis is three frames.
4. **Triggers queue, then stack by priority.** Events raised while an effect is being applied are queued and started when it finishes, monsters first (Apocalypse: "combattu en priorité").

Today's twelve `pending` types, the `forced` card and the `resume` strings all become flows. So do the new multi-player procedures: a monster's round, a crisis starting, Armageddon, Purge, Inondation, Roulette russe, the co-op Invasion, Trafic d'organes, Référendum, Élection.

**Reactions.** A few cards answer another player's action (Menace nucléaire, the Chasseur's interruption, an alliance against a monster, a hostage's ransom). The acting flow opens a response step for the players who visibly hold such a card, with "do nothing" as the fallback. Because the cards are public, opening the step leaks nothing.

### 6.4 The turn flow

```
start   options instead of drawing: démission, divorce, bunker swap, PDG firing,
        paying a debt with placed money, a pouvoir éphémère…
draw    as drawMode says; auto-play cards interrupt here
play    one play (or more: Arc-en-ciel, Pleine lune), or discard
end     refill to handSize, tick timers, fire turnEnd / roundEnd
next    nextPlayer, consuming skipped turns; extraTurns keeps the same player
```

"Rejouez" exists in two strengths and the engine supports both: one more *play* in the same turn (`plays += 1`, as Arc-en-ciel does) and one more whole *turn* (`extraTurns += 1`). Which one each card means is a rules question per card.

### 6.5 One list of legal actions

`legalActions(state, actor)` asks the top frame and returns every action the actor may take, with parameters filled in (which card, which target). It works on a view as well as on the full state.

- The reducer accepts an action only if it is in that list.
- The UI uses it to grey out cards and targets.
- The simulator picks from it at random.
- Bots choose from it.

Payments are the one place where listing every combination is too many; there the list contains the cheapest valid payment and the action accepts any payment that `paymentRule` validates.

## 7. Money, prices and scoring

**Money.** Anything that can pay is a card in the `money` zone (or an acquisition used as money) whose definition says what it is good for:

```js
money: { value: 3, taxable: false, casino: false, gift: false, payTax: false, needsJob: false }
```

| Card | value | taxable | casino | gift | pays a tax |
|---|---|---|---|---|---|
| Salaire | 1–4 | yes | yes | yes | yes |
| Argent sale (Trash) | 1–4 | no | yes | yes | to rule |
| Prime de naissance (GP) | 1–5 | no | no | to rule | to rule |
| Bijou de famille (Luxe) | on card | no | no | no | to rule |
| Allocation (Politique) | on card | to rule | no | no | no |
| Lingot d'or (Luxe) | 5 | no | no | no | to rule |
| Héritage (base) | 3, all or nothing | no | no | no | no |

"To rule" cells are questions for Teto in the extension specs. Héritage stops being a special counter and becomes a money source like the others.

**Buying** is one flow: ask `price`, list the sources the player may use (own money, and the pot for a politician), validate with `paymentRule`, then `attach` the spent cards under the acquisition and mark them `used`. Free and discounted purchases are `price` modifiers, so "gratuit pour l'architecte" on a Bunker and "moitié prix pour le serveur" on Caviar need no code of their own.

**Scoring** is a pipeline: for each placed card ask `cardSmiles`, sum per category, then add `scoreBonus`. The Licorne bonus becomes a modifier on the Licorne. Effects that compare players (Sado-maso) run after every player's subtotal is known.

## 8. View, driver, network and bots

### 8.1 View

`viewFor(state, viewer)` keeps its contract. Three additions:

1. **One visibility function**, `canSee(state, viewer, uid)`, used for every zone. Default per zone (hand: owner only; boards, discard, out-of-game, center, pot: everyone; deck, spare: nobody), then exceptions from meta (`faceDown`) and from flows.
2. **Flows describe their own secrecy** through `view(state, frame, viewer)`. The secrecy rules for Médium, Journaliste, Chance and Chef troc move out of `view.js` into their flows, unchanged.
3. **Temporary sight** for peeks: `state.sight = [{ viewer, uids, until }]`. Radar, Boule de cristal, Échangisme, Braquage, Exhibition (everyone sees the draw) and the face-up deck of Crise politique are entries here, removed when the step or turn ends.

Log entries get an optional `only: [players]` so a private detail can be logged for one player. A public entry must never name a hidden card, as today.

The leak test stays the judge: simulate games, build every view at every step, and fail if a card the viewer may not see appears by uid or by content. It runs for every extension combination.

### 8.2 Driver

The driver is the only code that holds the full state. There is one per game, on the host device.

```
driver.dispatch(seat, action)   stamp `by` from the seat, run the reducer, save, send views
driver.tick()                   deadline passed for a waiting actor → apply the flow's fallback
driver.seats                    [{ name, color, kind: 'human' | 'bot' | 'remote', connected }]
```

- **Hot-seat** (today's mode): one driver, all seats local. The "pass the phone" screen is UI: it shows whenever the acting seat changes.
- **Timers** move from the React hook into the driver, so they keep running when a phone sleeps and exist exactly once.
- **Saving:** the driver writes the full state to the host's local storage after every action. A refresh or a sleeping host can resume.
- `by` is set by the driver from the connection a message arrived on. A client cannot act as someone else.

### 8.3 Network

Clients send `{ action }`. The host sends each client its own view after every change, with a counter so a client can tell it missed one and ask again.

A view with a 500-card discard pile is large if every card carries all its text. The transport strips each visible card to `{ uid, def }` plus meta, and the client refills the rest from its own copy of the definitions. The engine is not involved.

Reconnection, host loss and the choice of free services are the subject of `docs/planning/NETWORKING.md`.

### 8.4 Bots

A bot is a seat of kind `bot`. When it must act, the driver gives it **its view** and the list from `legalActions`, and it returns one of them. It cannot cheat because it never receives the state.

What the engine guarantees to make bots possible, including for cards nobody hand-coded a strategy for:

- `legalActions` is complete and works on a view;
- the reducer is pure and seeded, so a bot can try an action on a guessed state and look at the result;
- `unseenCards(view)` lists the cards the viewer cannot locate, which is what a bot shuffles to guess hidden hands;
- every wait has a `fallback`, so a bot always has a legal move, and a human who leaves is replaced by setting `kind: 'bot'`.

Design of the bot itself is `docs/planning/AI-PLAYER.md`.

## 9. What the extensions need, gathered in one place

Each line names the mechanism above that carries it. If a card needs something not on this list, the design has a hole and this file must be updated before the card is built.

| Need | Extensions | Mechanism |
|---|---|---|
| Card played as soon as drawn, also from opening hand and refills | Apo, Pol, Fan, Trash | `draw` primitive, `autoPlay` tag |
| Rule that applies to everyone while a card is out | Apo, Pol, Fan | `center` zone, modifiers with scope "everyone" |
| Rule that lasts N rounds | Apo | `meta.timer`, `roundEnd` |
| Replacing a rule of the same domain, and restoring the one beneath | Pol | `meta.on` stack in `center` |
| Permanent personal effect, good or bad | all | card stays on board or in `malus`; modifiers |
| "Most recent wins" | all | `meta.seq`, `resolve` |
| One-use card that still scores | Apo, Fan, Luxe, GP | `meta.used` |
| Protected cards | GP, Apo, Fan, Trash | `meta.protectedBy`, `isProtected`, `remove` |
| Card on or under another card | Luxe, Apo, Fan, Pol, base | `meta.on` |
| Two jobs, job plus attachment, two marriages, party | GP, Luxe, Trash, Pol | array zones, slot queries |
| Job that requires or replaces another job | GP, Pol, base | `canPlace`, `place` with replacement |
| Money that is not a salary | Trash, GP, Luxe, Pol | `money` traits |
| Free, half price, −1, exact change | all | `price`, `paymentRule` |
| Shared money | Pol | `pot` zone |
| Salary level from several effects | GP, Trash, Luxe, Pol, Fan, Apo | `salaryLevels` as a set |
| Out-of-game zone you can recover from | base, GP, Trash, Apo, Fan, Pol | `outOfGame` with cause |
| Taking any placed card from someone | Apo, Fan, GP, Trash | `steal` = `remove` + `place` |
| Card stuck in hand | Apo, Trash | `canDiscard`, `stuckInHand` |
| Hand of 1, 4, 6, ±1; "redraw to what you had" | Apo, Trash, Fan, base | `handSize`, `handDelta`, `refill` option |
| Skip turns, longer skips, skipping without being a Bandit | all | `skipTurns`, `skipLength`, `canTarget` |
| No draw, draw two, play then draw, face-up deck | Trash, Luxe, Fan, Apo | `drawMode` |
| Extra play or extra turn | Fan, Luxe, base | `plays`, `extraTurns` |
| An action instead of drawing | Luxe, Apo, base | turn flow `start` step |
| Direction of play | Pol | `direction`, `nextPlayer` |
| Something travelling round the table | Apo | flow with a per-player step |
| Everyone chooses or acts in turn | Apo, Trash, Pol, Fan | flows with several actors |
| Answering another player's action | Apo, Fan, Trash | response step |
| Seeing hidden cards for a moment | Apo, Fan, Trash, Luxe, base | `sight` |
| Placed cards turned face down | Apo | `meta.faceDown`, `canSee` |
| Score doubles, bonuses, penalties, comparisons | all | `cardSmiles`, `scoreBonus` |
| Remembering the past | base, Pol, Fan | `history` |
| Game ending early, or restarting | Apo | `status`, a flow |
| Set-up steps | Fan | set-up flow |
| Always-on bonus rules of an extension | GP, Trash, Fan | behaviours with no card, active when the extension is enabled |

**Cards with no digital equivalent as printed.** The engine can carry any of these stand-ins; which one is used is Teto's ruling, recorded in the extension spec.

| Card | Printed | What the engine can offer |
|---|---|---|
| Bombardement (Apo) | drop the card onto the target from shoulder height | a seeded chance, or a timing mini-game in the UI whose result is sent as the action |
| Grève (Pol) | stop the game one minute per réforme | a pause held by the driver, shortened or skippable by vote |
| Référendum (Pol) | show of hands | a vote flow, every player acts, fallback = abstain |
| Negotiation (Dictateur, Ange, alliances) | free talk | an offer/accept step limited to "give these cards", or nothing beyond voice chat between friends |
| Mutation génétique (Apo) | five blind draws between two cards | five seeded coin flips |

## 10. File layout after migration

```
src/data/
  base.js              base definitions
  ext/gp.js …          one file per extension
  index.js             catalogue by id, buildDeck(extensions)
src/game/
  engine.js            reducer entry: check actor, check legality, run the top flow
  state.js             initial state, selectors
  rng.js               seeded generator
  primitives.js        draw, place, remove, …
  queries.js           the query list, modifier collection, resolve()
  legal.js             legalActions()
  scoring.js           scoring pipeline
  view.js              viewFor, canSee
  flows/               turn.js, purchase.js, birthday.js, monster.js, …
  cards/               base.js, gp.js, …   behaviours by definition id
src/session/
  driver.js            state owner, timers, saving
  hotseat.js           today's mode
  host.js, client.js   network (later)
  bot/                 bots (later)
src/components/        UI, unchanged in role
tests/
  regles.test.mjs      base rules (regression net)
  ext/<id>.test.mjs    one per extension
  combos.test.mjs      rows of INTERACTIONS.md
  sim.mjs              random games + invariants, all extension combinations
  view.test.mjs        visibility + leak scan
  helpers.mjs          scenario builder
```

## 11. Testing strategy

**Base regression net.** `tests/regles.test.mjs` stays and must pass at every migration step. Before the migration starts, any verified rule in `CLAUDE.md` or the brief's appendix that has no test gets one.

**Golden games.** Once randomness is seeded, record for 50 seeds the final scores and a hash of the final state. A step that claims to be a pure refactor must reproduce them exactly. A step that changes the order of random draws regenerates them on purpose and says so in its commit.

**Invariants, checked after every action in every simulated game:**

- every card uid is in exactly one place, and the total equals the deck that was built;
- every meta entry belongs to a card on the table; every `on` points at a card that is there;
- someone may act, unless the game is over;
- every action in `legalActions` changes the state when applied; a sample of actions *not* in the list is rejected;
- the state survives `JSON.parse(JSON.stringify(state))` and plays on identically;
- no view leaks (section 8.1);
- the game ends.

**Per extension.** `tests/ext/<id>.test.mjs`: at least one scenario per card with an effect, and one test per numbered entry in the spec's "Decisions" section, named after it. Scenarios are built with a helper instead of by editing state by hand, so they survive shape changes:

```js
const g = scenario({ players: 3, ext: ['gp'] })
  .board(1, { jobs: ['base.pizzaiolo'] })
  .hand(0, ['gp.drh'])
  .studies(0, 4)
g.play(0, 'gp.drh').choose(0, { target: 1 })
check('DRH : le Pizzaïolo est licencié', g.player(1).jobs.length === 0)
```

**Combinations.** Random games over all 64 subsets of the six extensions, at 2, 3 and 4 players, with invariants on. Plus one targeted test per row of `INTERACTIONS.md`.

**Bots as testers.** Once bots exist, bot-against-bot games replace purely random play in the simulator. They reach situations random play almost never does (expensive purchases, long combos).

Tests stay plain Node scripts run by `npm test`. No framework is needed.

## 12. Migration plan

Each step is one session, leaves the game playable and all tests green, and can be deployed. Steps 1–4 change no behaviour and are useful even if extensions were never built. No extension card is written before step 10.

| # | Step | Why here |
|---|---|---|
| 1 | Seeded randomness and log ids in state. Record golden games. Add missing base-rule tests. | Everything after is checked against the goldens |
| 2 | `legalActions()`; simulator, UI hints and reducer validation use it. Invariant checks in the simulator. | Catches mistakes in every later step |
| 3 | Driver: move `screen`, `READY`, the hot-seat hand-over and the 30-second timers out of the engine. | Unblocks network and bots; independent of extensions |
| 4 | Card definitions with `id`, `ext`, `tags`, child `gender`; `buildDeck(extensions)`; opaque uids. Replace key lists in rules by tags. | Data shape first, behaviour later |
| 5 | Selectors, then array zones (`jobs`, `marriages`, `money`, `malus`), `removed` → `outOfGame`. | Shape change hidden behind selectors |
| 6 | `meta` table and `seq`; fold `invested` / `paidFor` / `active` / `heritageFor` into it. `structuredClone`. | Per-card state exists before anything needs it |
| 7 | Primitives and events; every draw, placement and loss goes through them. | Pure refactor, verified by goldens |
| 8 | Flow stack; port the twelve pendings, `forced` and `resume`. Flow `view` and compulsory `fallback`. | The largest step; may need two sessions |
| 9 | Queries, modifiers and `resolve`; move base job perks and immunities into `cards/base.js`. Money traits, `price`, scoring pipeline. | The base game now runs on the extension mechanism, which proves it |
| 10 | `center` zone, auto-play on draw, `sight`, visibility function. Tested with two fake cards that exist only in tests. | Last missing mechanisms, proven before real cards depend on them |
| 11 | Girl Power, as the pilot extension. | Its spec is complete; it exercises slots, protection, transfers, scoring |

Order among the later extensions is a roadmap decision. From an engine point of view: Luxe and Trash need nothing beyond step 10; Politique leans on `center`, `pot` and precedence; Fantastique adds characters and set-up; Apocalypse uses everything, including face-down boards and the co-op flow, and should be last.

If step 8 or 9 turns out harder than planned, stop and split it. Do not start extension cards on a half-migrated engine.

## 13. Risks and honest limits

- **This is a rewrite of the engine's inside, done in place.** About 1,400 lines of `rules.js` and `reducer.js` end up restructured. The golden games and the rule tests are what make it safe; skipping steps 1 and 2 to "save time" removes the safety.
- **The design has been checked against the leaflets, not against the cards.** Roughly 300 cards have text only on the physical card. A card may need a query or event not listed here. Section 9 says what to do then.
- **Behaviours are code, not data.** A purely data-driven effect language was considered and rejected: the effects are too varied (a dexterity test, a co-op mini-game, a lottery) and the language would grow into a second programming language. The price is that bots cannot "read" what a card does; they learn it by trying the action on a guessed state.
- **Apocalypse's Purge hides placed cards**, which breaks the assumption that boards are public. The design covers it, but it touches the UI everywhere a board is drawn.
- **Performance is unmeasured.** Modifiers are collected by scanning the table on every query, and state is deep-copied on every action. Fine for people playing; it may need caching once bots simulate thousands of actions per move.
