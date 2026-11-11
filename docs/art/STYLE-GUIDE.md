# Illustration style guide

Written 2026-11-11 by Claude Fable after looking at a sample of the existing base-game art in `public/cards/` (Bandit, Harry, Licorne, Hôtel, Bar, Attentat, Prison, Anniversaire, Le Caire, a house) and the frames in `public/frames/`. It describes what is already there, so new cards match, and says what the extensions add.

All visuals must be original. No official Blackrock Games artwork or logos.

## 1. The look in one paragraph

Bright, glossy cartoon in the spirit of a modern sticker sheet: thick dark outlines, saturated colours, soft cel shading with a few shiny highlights, rounded shapes, friendly exaggerated faces. One clear subject, readable at thumbnail size on a phone. Humour comes from the pose or a prop, never from text.

## 2. Rules for every image

- **Square.** Existing sources are about 1024 to 1254 px a side. Anything from 1024 px up is fine; the build shrinks them.
- **No text, letters, numbers or logos in the image.** The card's name and text are added by the game. Signs and screens in a picture show pictograms only.
- **Background:** transparent (or plain white, which reads the same on the card) for everything except flirts. The frame supplies the coloured backdrop.
- **Subject centred, with a little air around it.** The frame's window is a tall rectangle; a square image sits in it with margin, so nothing important should touch the edges.
- **One idea per card.** If you need two objects to tell the joke, make one clearly the main one.
- **No real people, no real brands, no copyrighted characters.** See section 5.

## 3. Rules by category

| Category | What the existing cards do | Keep doing |
|---|---|---|
| **Métiers** | One character, full body or three-quarter, caricatured, with the tools of the job (the Bandit lounges on banknotes with sunglasses and a coffee). No scenery beyond the props touching the character. | Character only. Personality in pose and props. |
| **Enfants** | A toddler with one or two toys that wink at the pop-culture name (Harry: round glasses, a toy that makes a teddy float, a plush owl). The child does not wear the character's actual costume. | The wink is in props and hair, never a copy of the character. Always clearly a happy small child, fully dressed. |
| **Flirts** | A full square scene with background: two adults, warm and playful, in the place named. Clothed, affectionate, nothing more than a look or a lean. | Full-bleed scene. Flirts that allow a child (Hôtel, Camping, and Girl Power's Bibliothèque) show a more private setting: a reception desk with a key, a tent at night, a quiet corner between shelves. That is the whole hint. |
| **Mariage** | One shared illustration; the place name is written by the game. | Same for extension marriages unless the card is special (Mariage forcé, Mariage d'argent get their own). |
| **Malus** | **A red triangular warning road sign on a short metal post, with one symbolic object inside** (a cartoon bomb for Attentat, handcuffs for Prison). | Every new malus and maléfice uses this sign. It is also what keeps dark subjects harmless: the sign shows a symbol, never the act. |
| **Cartes spéciales** | Objects only, no people (Anniversaire: three wrapped presents). | Still-life of one to three objects. |
| **Animaux** | The animal alone, cute, a little cheeky (the Licorne winks). | Same. |
| **Voyages** | A cartoon tourist doing something silly at the landmark (pinching the top of a pyramid). | Same, landmark recognisable, tourist generic. |
| **Maisons** | The building alone on a small patch of grass, with a tiny living detail (a dog at the balcony). | Same for apartments, château, bunker. |
| **Salaires, études, distinctions** | Objects. | Same for argent sale, bijoux, primes, allocations. |

## 4. What the extensions add

**New kinds of card and how to draw them**

| Kind | Extension | Treatment |
|---|---|---|
| Armes, véhicules, survies | Apocalypse | Object alone, like a toy or a sticker: chunky, colourful, slightly worn, never held, never pointed at anyone. |
| Monstres | Apocalypse | Creature alone, funny rather than frightening: big eyes, goofy teeth, no blood. |
| Crises, événements, cataclysmes | Apocalypse | A small symbolic scene **without people**: an empty fridge, a falling stock arrow, a house in a puddle. |
| Personnages | Fantastique | Like métiers: one character, full body. These are the stars of that box; give them the most care. |
| Éphémérides | Fantastique | The moon or sky alone, each a different colour. |
| Objets magiques, potions | Fantastique | Object alone; potions share one bottle silhouette with different colours and a small symbol floating above. |
| Maléfices | Fantastique | The malus warning sign, in purple instead of red, symbol inside. No occult symbols (no pentagrams): use sparkles, a crooked wand, a black cat's paw. |
| Réformes | Politique | A rolled scroll with a ribbon and one pictogram for the domain (a heart, a mortarboard, a banknote, a pram). |
| Taxes | Politique | A piggy bank or a hand-held collection plate with one pictogram of what is taxed. |
| Partis | Politique | An invented emblem on a round badge: a fruit, an animal, a tool. Never a real party's colours-and-symbol pairing. |
| Métiers politiques | Politique | Like métiers. Invented faces; a sash or a desk is enough to say "minister". |
| Bijoux, lingot, luxe objects | Vie de luxe | Object alone, over-the-top shine. No brand shapes or monograms. |
| Star | Vie de luxe | A gold star trophy with a spotlight, no person. |
| Argent sale | Trash | Banknotes hanging on a washing line with clothes pegs. |
| Trash cards in general | Trash | Symbol, metaphor or aftermath only. See `RISKY-CARD-PROMPTS.md`; almost every card of that box is there. |

**Frames.** Frames are PNG, 1024 × 1536, with a title banner at the top, a round badge at the top right, a transparent window, and a text box at the bottom (the opaque part runs from x 31 to 999 and y 49 to 1466; new frames must match so the game's layout fits). Twelve exist. Most new kinds can reuse one:

| New kind | Frame |
|---|---|
| Armes, véhicules, survies, objets magiques, potions, drogues, luxe, appartements | `acquisition` |
| Argent sale, bijoux, primes, allocations | `salaire` |
| Cartes très spéciales, cataclysmes, Star | `speciale` |
| Maléfices | `malus` (or a purple copy, `malefice`, if you want them to stand out) |
| Partis | `distinction` |
| **Crises, événements, monstres, réformes, taxes, éphémérides** (cards that play themselves and affect everyone) | **new: `global`**. Worth making: players must see at a glance that this card is not theirs. Suggested: dark frame with a bright warning stripe. |
| **Personnages** | **new: `personnage`**. Suggested: night-blue with stars. |

So two new frames are needed, one optional. Until they exist the game reuses the nearest one.

## 5. Staying clear of copyright and real people

- **Children's names are the wink; the picture is a toddler with themed toys.** Describe the toys, the hair and the colours. Do not type the character's or the franchise's name into ChatGPT: it both risks a refusal and pulls the picture toward a copy.
- **No real celebrity, politician or athlete**, even as a caricature. Describe a type ("a pop singer with a sparkly jacket"), not a person.
- **No brands:** cars, watches, bags, phones, sports kits and bank cards are generic shapes with no logo, no monogram pattern, no recognisable grille or stripe design.
- **Famous props** (an energy sword, a ring of power, an invisibility cloak) are drawn as generic objects: a glowing toy sword, a plain gold ring, a shimmering blanket.

## 6. File names

`<category>-<card name>.png` in `public/cards/`: lowercase, no accents, words joined by hyphens. Examples from the base game: `metier-prof-d-anglais.png`, `malus-impot-sur-le-revenu.png`, `enfant-harry.png`, `flirt-a-l-hotel.png`.

**The card gallery is the authority.** Open your game link with `#cartes` at the end: each card shows the exact file name it expects. Copy it from there. From roadmap step 15 the gallery has one section per extension.

Add files with GitHub Desktop (Commit to main, Push origin). About two minutes later they appear in the gallery. A card with no picture yet shows a large icon instead, so you can add pictures in any order.

## 7. How to work in ChatGPT

1. Start one conversation per extension.
2. First message: paste the **style block** from the top of `RISKY-CARD-PROMPTS.md`, and attach two or three existing illustrations of the same category as examples.
3. Then ask for one card per message. For cards listed in `RISKY-CARD-PROMPTS.md`, paste the prompt given there. For the others, describe the subject in one sentence.
4. If a picture drifts from the style, say "same style as the first images" and attach an example again.
5. If ChatGPT refuses, use the fallback prompt. If it refuses again, describe only the object, with no mention of the card's name.

## 8. Checklist before adding a file

- Square, at least 1024 px.
- No letters or numbers anywhere.
- Transparent or white background (except flirts).
- Reads clearly when shrunk to the size of a postage stamp.
- No logo, no real face, no copied character.
- File name copied from the gallery.
