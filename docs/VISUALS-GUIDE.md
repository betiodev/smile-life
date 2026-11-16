# Smile Life — visuals guide (readable cards on a phone)

Six steps that rework the layout of the two game screens so that cards can be read on a phone in landscape, late in the game, with four players. Rules and mechanics do not change. Written in November 2026 after the checkpoint review ([planning/CODE-REVIEW.md](planning/CODE-REVIEW.md), section F).

## How to use this guide

It works exactly like the main roadmap ([ROADMAP.md](ROADMAP.md), section "How to use this roadmap"): one step at a time, a new Claude Code session per step, paste the line shown after "Paste:", wait for the pull request, check the green tick, merge, test on your phone. Sessions tick their own box **in this file**.

Visual steps are the ones where your eye matters most. If a merged step looks wrong on your phone, go back to the same session, say what you see (a screenshot helps), and let it fix it. If it is badly wrong, use **Revert** on the pull request as the roadmap explains: the game goes back to how it looked.

### When to do it

```
fixes guide      F1 → F6
main roadmap     Checkpoint A, then step 13 (easy bot, solo mode)
this guide       V1 → V6
main roadmap     step 14 (swipe to target), step 15 (screens ready for extensions), Phase 3…
```

**After step 13, before step 14.** Reasons:

- With the bot you can test every visual step alone, in a real game, on your phone.
- Step 14 (swipe a card onto a player) and step 15 (screens ready for extensions) are built on the table layout. Done before the rework, they would be done twice.
- Every extension has a "screens" step (19, 24, 30…). They should all build on the final layout, with its zones, and not on today's row of stacks.
- Not later than that: the extensions add card categories. The new layout has a named place for each, and a default place for anything unknown, so it must exist before the first extension reaches the screen.

**One exception: step V1 (the game as a home-screen app) is independent.** You can do it today. It gives back the part of the screen the browser's bar takes, with no change to the game.

### Which model

Opus 5.5 for V3, V4 and V5 (layout judgement on a very small screen, and the animations must keep working). Sonnet 5.5 for V1, V2 and V6.

### A demo game to look at

Step V2 adds a link ending in `#demo`: it opens a 4-player game already far advanced, so you (and the sessions) can judge a crowded table in ten seconds instead of playing for half an hour.


## The problem, measured

Your two screenshots, converted to the phone's own units (the screen is about 870 units wide and 400 high; the browser's bar leaves about 330 of height):

- **Ma main:** the cards you have placed are about **42 units wide**. Their titles are printed at about 4 units, where 10 is the smallest comfortable size. The cards in your hand are about **67 wide**. One third of the width (the two side columns) holds two piles and one button.
- **La table:** ten stacks side by side fill the width, so each card is about 60 wide, and the space above and below stays empty. The layout code can use two rows, but it reserves room above every row for salaries peeking over acquisitions, so two rows almost never win.
- A stack shows its newest card and "×7". What the other six are, you cannot tell without opening it.
- The browser's bar takes one sixth of the height. (Your screenshots are from the DuckDuckGo browser, not Safari; it has no way to hide its bar.)

## What fits on a phone, honestly

A card's printed title becomes readable when the card is about **100 units wide** (146 high). The screen is 330 to 400 high. So:

- **Two rows of readable cards is the maximum**, about seven per row. A player late in the game has 40 to 60 cards placed. They cannot all be readable cards at once. No layout can change this.
- **Four players' cards readable at the same time: no.** Three opponents share the screen; each gets a column about 250 wide.
- So the design stops asking the small card to carry the text. **A small card is a picture, for recognising. The name is written next to it as real text, at a readable size.** Readable full cards appear where there is room: your hand, one zone opened, one card zoomed.

What I recommend against, and why:

| Idea | Verdict |
|---|---|
| Zones like the official mats | **Yes.** It is the core of the design below. Layout idea only; no artwork, logo or wording from the mats. |
| Cascading stacks showing each title bar | **Yes, as text bars**, not as slices of the card image: a slice of a 60-wide card is still unreadable. |
| Cards that scale to the space | **Yes for the hand** (they almost double). On boards, scaling alone is what you have today; it is not enough. |
| Tap a zone or stack to expand it | **Yes.** One tap shows every card of a zone at readable size. |
| Zoom on one player | **Yes.** It is the main way to read a board. |
| Home-screen app to remove the browser bars | **Yes, and first.** Details below. |
| A themed mat per extension (black for Trash, purple for Girl Power) | **Not now.** With several extensions in one game there is no single theme, and it adds art to make. The zone colours come from the card frames you already have. Possible later as decoration. |
| All four players visible with their cards on "Ma main" | **No.** There is no room; the table screen is one tap away. |

### iPhone facts (checked 2026-11-16)

- **Added to the home screen, the game opens without any browser bar.** Since iOS 26 this is the default for every site ("Open as Web App" is switched on in the Add to Home Screen sheet). On older iOS it needs one line in the page, which step V1 adds.
- It must be added **from Safari** (Share → "Sur l'écran d'accueil"). Other browsers can only do it if they chose to offer it.
- **A web page cannot lock the iPhone in landscape**, in the browser or as a home-screen app. The "Tourne ton téléphone" screen stays.
- **The "Plein écran" button of the menu does nothing on an iPhone** (Apple allows it on iPad only). Step V1 hides it there and shows the home-screen tip instead.
- The home-screen app has **its own storage**, separate from Safari: a game saved in Safari (fix step F4) is not found in the app, and the other way round. Use one of the two.
- An update of the game arrives the next time the app is opened from scratch (swipe it away, open it again).

Sources: [iOS PWA compatibility notes (firt.dev)](https://firt.dev/notes/pwa-ios/), [News from WWDC25 (webkit.org)](https://webkit.org/?p=16993).


## Design direction

Three ideas, used on both screens.

1. **Zones.** A player's board is a mat with fixed zones, each in the colour of its card frames, always at the same place. You learn once where things are.
2. **Picture + name bars.** In a zone, the newest card is shown as a picture. Every card is also one line of text, a "bar": name, smiles, and the one number that matters (salary level, price…). Identical cards share a bar: "Études ×5", "Salaire niveau 1 ×3".
3. **Three depths.** Overview (names only) → one player's mat (pictures and bars) → one zone opened (readable cards). One tap between each; the existing tap-to-enlarge stays the last level.

### The mat (one player, whole screen)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ← Table   ‹  Ben  ›    5 en main · passe 1 tour                       😄 37      │
├───────────────────┬───────────────────┬───────────────────┬────────────────────┤
│ SALAIRES    4 lia.│ ENFANTS         4 │ ACQUISITIONS    3 │ DISTINCTIONS ·     │
│ ┌────┐ Niveau 2 ×2│ ┌────┐ Leïa      2│ ┌────┐ Le Caire  2│ SPÉCIALES        2 │
│ │ 💵 │ dépensés ×4│ │ 👧 │ Zelda     2│ │ 🏜 │  payé 2+1  │ ┌────┐ Grand Prix 4│
│ └────┘            │ └────┘ Rocky     1│ └────┘ Chat      1│ │ 🏆 │ Chance     0│
│                   │        Diana     2│        Licorne   3│ └────┘             │
├───────────────────┼───────────────────┤                   ├────────────────────┤
│ ÉTUDES → MÉTIER   │ FLIRTS → MARIAGE  │                   │ MALUS            2 │
│ ┌────┐ Astronaute │ ┌────┐ Corps-Nuds3│                   │ ┌────┐ Accident    │
│ │ 👩‍🚀 │  salaire 4 │ │ 💒 │ Adultère  1│                   │ │ 💥 │ Divorce     │
│ └────┘ Études ×6  │ └────┘ Au théâtre1│                   │ └────┘             │
│        niveau 6   │        ↑ dessus   │                   │                    │
│                   │        + 6 flirts │                   │                    │
└───────────────────┴───────────────────┴───────────────────┴────────────────────┘
```

- **Four columns, the mat's idea.** Vie pro: salaires above, études and métier below. Vie perso: enfants above, flirts and mariage below. Acquisitions: animals, voyages, maisons, on the full height. Last column: distinctions and cartes spéciales above, malus below.
- **Zone colours** come from the card frames (one table in the code), so a zone looks like the cards it holds.
- **In a zone:** the picture of the newest card (about 62 wide), and the bars beside it. When there are more cards than lines, the last line says "+ 6 flirts".
- **Details that matter are words on the bar:** "payé 2+1" on an acquisition, "↑ dessus" on the flirt that can be stolen, "sans effet" on a Grand Prix whose métier is lost, "Piston" on a métier obtained that way, a shield on a protected card, "carte cachée" for a face-down card.
- **Tap a bar or the picture:** that card enlarged (today's zoom). **Tap the zone's title:** the zone opens.
- **‹ ›** go to the previous and next player without going back.
- **Extensions:** a fifth column appears only when an extension in the game has a zone of its own. A card type the screen does not know lands in a zone "Autres", so nothing is ever invisible.

### A zone opened

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ✕  Flirts de Ben · 7                                                             │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐         │
│  │        │  │        │  │        │  │        │  │        │  │        │   ← glisser
│  │Au théât│  │ Au zoo │  │Au cinéma│ │ Au bar │  │À l'hôtel│ │Internet│         │
│  │        │  │        │  │        │  │        │  │        │  │        │         │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘         │
│   dessus                                                                         │
└────────────────────────────────────────────────────────────────────────────────┘
```

Every card of the zone at readable size (about 105 wide), newest first, in one row that slides sideways. Salaries that paid for an acquisition are shown tucked under it. Tap a card to enlarge it.

### La table (overview)

With **one opponent**, "La table" is that player's mat, directly. With **two or three**, one column each:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ← Ma main   La table        Centre 1 · Défausse 23 · Hors jeu 4   ● Tour de Ben │
├──────────────────────────┬──────────────────────────┬──────────────────────────┤
│ Ben    5 en main    😄 37│ Cléo   5 en main    😄 21│ Dan   passe 2 tours 😄 12│
│ ▌Métier   Astronaute  s.4│ ▌Métier   Barmaid     s.1│ ▌Métier   —              │
│ ▌Études   ×6 · niveau 6  │ ▌Études   ×2 · niveau 2  │ ▌Études   ×3 · niveau 4  │
│ ▌Salaires ×2 · 4 liasses │ ▌Salaires ×1 · 1 liasse  │ ▌Salaires —              │
│ ▌Flirts   ×7  Au théâtre │ ▌Flirts   ×3  Au zoo     │ ▌Flirts   ×1  Au bar     │
│ ▌Mariage  Corps-Nuds     │ ▌Mariage  —              │ ▌Mariage  —              │
│ ▌Enfants  ×4             │ ▌Enfants  —              │ ▌Enfants  —              │
│ ▌Acquis.  ×3  Le Caire   │ ▌Acquis.  ×1  Chat       │ ▌Acquis.  —              │
│ ▌Malus    ×2             │ ▌Malus    ×1             │ ▌Malus    ×3             │
└──────────────────────────┴──────────────────────────┴──────────────────────────┘
```

- One line per zone, in the zone's colour: how many, and the newest card's name or the number that matters. No card pictures here: at this size they would be 25 wide.
- **Tap a player:** their mat.
- **Choosing a target** (malus, Troc, Vengeance): same screen; each column is a large button, greyed with the reason when not allowed. This is what step 14 will turn into "drop the card on the player".
- **Top right:** the discard pile and the out-of-game pile open as a sliding row of cards, like a zone. "Centre" is the place for cards in force for everyone; it appears with the extensions (step 15).

### Ma main

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ● Dos · c'est ton tour · joue une carte              😄 34    [ 👁 La table ] [≡]│
├────────┬─────────────────────────────────────────────────────────────┬─────────┤
│ Pioche │ Métier    Études   Salaires  Flirts   Mariage  Enfants  Acq.  Malus   │
│   77   │ Astronaute ×6 n.6  ×2 · 4 l. ×7       Corps-N. ×3       ×2    ×2      │ ← mon tapis, résumé
│        ├─────────────────────────────────────────────────────────────┤ Démis-  │
│Défausse│        ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐      │ sionner │
│ Gourou │        │      ││      ││      ││      ││      ││      │      │         │
│        │        │Casino││Études││ Leïa ││Sal. 2││Milit.││Gd Prix│     │ Arrêter │
│        │        │      ││      ││      ││      ││      ││      │      │l'adultère│
│        │        └──────┘└──────┘└──────┘└──────┘└──────┘└──────┘      │         │
└────────┴─────────────────────────────────────────────────────────────┴─────────┘
```

- **The hand gets the height.** Cards about 110 to 130 wide instead of 67: readable without enlarging. Same fan, same swipe right to play and left to discard, same tap to enlarge, same "Annuler" toast.
- **Your own board becomes one strip of zone tiles** (count and newest card's name). Tap it: your mat, the same screen as for an opponent.
- **"La table" moves into the top bar**; the side columns shrink to what they hold (two piles on the left, the turn's buttons on the right). The name of the discard pile's top card is written under it.

### Kept as decided

Landscape only. The two screens, "Ma main" and "La table". Swipe to play and discard. Tap to enlarge. The yellow card back. The existing frames and illustrations. All text in French.

### What this asks of later steps

- **Swipe to target (step 14):** the targets are the columns of the overview; a target that is one placed card opens that player's mat to pick it.
- **Extensions (step 15 and each "screens" step):** give each new card type a zone in the display table; add a column only if the extension has a zone of its own.
- **Apocalypse's face-down boards:** a hidden card is a bar "carte cachée"; a zone of hidden cards shows only how many.
- **Animations (step 50):** cards fly to a zone's picture or bar. The attributes the animations look for must stay on whatever replaces a card on screen.


## Steps

- [ ] **Step V1 — The game as a home-screen app**
  - Goal: Opened from the iPhone's home screen, the game uses the whole screen, with no browser bar.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Inputs to attach: none
  - Paste: `Read docs/prompts/visuals/V01-home-screen-app.md and follow it.`
  - Done when: The site has an app manifest, an original icon and the lines iPhones before iOS 26 need; the setup screen shows how to add the game to the home screen when it is not already opened that way; the "Plein écran" button is hidden where it cannot work.
  - How you test it: On your iPhone, open the game link **in Safari**. Tap Share, then "Sur l'écran d'accueil", then "Ajouter". Open the game from the new icon and turn the phone: no address bar, no buttons at the bottom. Start a game: the cards are already a little bigger.
  - Prompt: [docs/prompts/visuals/V01-home-screen-app.md](prompts/visuals/V01-home-screen-app.md)

- [ ] **Step V2 — One place for colours and sizes, and a demo game**
  - Goal: Prepare the styling code so that the layout steps change layout only; add a ready-made crowded game to look at. Nothing changes on screen.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Inputs to attach: none
  - Paste: `Read docs/prompts/visuals/V02-design-tokens-demo.md and follow it.`
  - Done when: Colours, text sizes and card proportions are defined once and used everywhere; the animation code is in its own file with its rules written down; the game link followed by `#demo` opens a late 4-player game.
  - How you test it: Play a few turns: the game looks exactly as before. Then add `#demo` at the end of your game link: a game with four players and many cards on the table opens.
  - Prompt: [docs/prompts/visuals/V02-design-tokens-demo.md](prompts/visuals/V02-design-tokens-demo.md)

- [ ] **Step V3 — The mat: one player's board in zones**
  - Goal: Build the zone layout for one player, and the "zone opened" row. Use it when you tap a player on "La table".
  - Where: New Claude Code session · Model: Opus 5.5
  - Inputs to attach: your two screenshots if you want (optional; the prompt describes them)
  - Paste: `Read docs/prompts/visuals/V03-player-mat.md and follow it.`
  - Done when: Tapping a player on "La table" opens their mat with the four columns; every placed card can be found by name without opening anything; tapping a zone title shows all its cards at readable size.
  - How you test it: Open `#demo`, tap "Voir la table", tap a player. Can you say, without tapping, what their métier is, how many flirts they have and which one is on top, and what their acquisitions are? Tap "Flirts": are the cards readable? Tap one: it enlarges as before.
  - Prompt: [docs/prompts/visuals/V03-player-mat.md](prompts/visuals/V03-player-mat.md)

- [ ] **Step V4 — La table: every opponent at a glance**
  - Goal: Replace the rows of small stacks on "La table" by one summary column per opponent, with the discard and out-of-game piles one tap away.
  - Where: New Claude Code session · Model: Opus 5.5
  - Inputs to attach: none
  - Paste: `Read docs/prompts/visuals/V04-table-overview.md and follow it.`
  - Done when: With 2 or 3 opponents each has a column of zone lines; with 1 opponent the mat is shown directly; choosing a target works on the new columns; the discard pile and the out-of-game pile can be browsed.
  - How you test it: Open `#demo` and "Voir la table": three columns, every line readable. Tap one: the mat. Go back and play a real game against the bot: play a malus and choose the target on the new screen; a player who cannot be targeted is grey and says why.
  - Prompt: [docs/prompts/visuals/V04-table-overview.md](prompts/visuals/V04-table-overview.md)

- [ ] **Step V5 — Ma main: a hand you can read**
  - Goal: Give the height of "Ma main" to the hand, and turn your own board into a strip that opens your mat.
  - Where: New Claude Code session · Model: Opus 5.5
  - Inputs to attach: none
  - Paste: `Read docs/prompts/visuals/V05-my-hand.md and follow it.`
  - Done when: Hand cards are at least 100 units wide on a 844×390 screen with 6 cards in hand; your board is a strip of zone tiles that opens your mat; swipe, tap, toast and every turn button work as before.
  - How you test it: Play a full game against the bot from the home-screen icon. Can you read the cards in your hand without tapping them? Swipe right to play, left to discard, tap "Annuler" once. Tap the strip: your mat opens. Try with 7 or more cards in hand if you get the chance (Chercheur, or after a Troc).
  - Prompt: [docs/prompts/visuals/V05-my-hand.md](prompts/visuals/V05-my-hand.md)

- [ ] **Step V6 — Lighter pictures and loose ends**
  - Goal: Make the new screens light for the phone, check the animations land where the cards now are, remove the old layout code.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Inputs to attach: none
  - Paste: `Read docs/prompts/visuals/V06-performance-polish.md and follow it.`
  - Done when: Small pictures use a small image file; every card movement of a game ends on a visible element; the old stacks code is gone; `CLAUDE.md` describes the screens as they are.
  - How you test it: Play a full game against the bot on your phone. Watch a card being drawn, placed, stolen (a flirt) and a malus: you should always see where it went. The game should stay smooth to the last turn.
  - Prompt: [docs/prompts/visuals/V06-performance-polish.md](prompts/visuals/V06-performance-polish.md)

When V6 is ticked, go back to the main roadmap: **step 14**.
