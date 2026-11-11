# Networking plan — from one phone to friends online

Status: design, written 2026-11-11 by Claude Fable. Built in roadmap steps 51 and 52 (same wifi), 55 (bot takeover), 56 (online) and 57 (host leaving). Depends on `ARCHITECTURE.md` §8 (view, driver).

Free-tier terms below were looked up on 2026-11-11. **They change.** The session that builds step 56 must check them again before relying on them. Sources are at the end.

## Summary

- **Fully free online play is possible**, with no server of your own and no card number anywhere. It relies on free services run by others, which come with no guarantee.
- **Recommended path:** phones talk directly to each other (WebRTC, through the PeerJS library). The only outside help needed is PeerJS's free public "broker", which introduces the phones to each other and then steps aside. No account.
- **What this covers:** phones on the same wifi, and most home-wifi-to-home-wifi games.
- **What it does not cover:** some phones on mobile data, and some office or guest wifi, cannot be reached directly. For those a small relay is needed.
- **Fallback for those cases:** a tiny relay on Cloudflare's free plan (one free account, which stops working when its daily allowance is used up instead of charging). It is added only in step 56, and only if real tests with your friends show it is needed.
- **If every free option disappeared:** about 5 US dollars a month would buy a guaranteed replacement. Nothing in this plan can start charging you by itself.
- **The game lives on the host's phone.** If the host leaves for good, the game is lost unless you accept a trade-off described in section 9.

## 1. Vocabulary

| Word | Meaning here |
|---|---|
| Host | The one phone that runs the real game (the driver and the full state). |
| Client | Every other phone. It only ever receives its own player's view. |
| Broker (signalling) | A meeting point on the internet. Two phones each tell it "here is how to reach me"; after that they talk directly. It never sees game data. |
| Direct connection (WebRTC) | Phone-to-phone link, encrypted. |
| STUN | A free public service that tells a phone its own internet address so others can reach it. Carries no game data. |
| TURN / relay | A server that passes data along when two phones cannot reach each other directly. It does carry the (encrypted) data, which is why it is rarely free. |

## 2. Options compared

| Option | What it is | Cost and terms (2026-11) | Account / card | Verdict |
|---|---|---|---|---|
| **PeerJS public broker** (`0.peerjs.com`) | Free signalling run by the PeerJS project | Free, donation-funded, shared with everyone, no stated limits, no guarantee. Their page: "For high-traffic applications, please host your own PeerServer." Past outages reported. Provides no TURN. | none | **Use** for signalling |
| Google public STUN | Address discovery | Free, public, no terms for us to accept | none | **Use** |
| Trystero (public Nostr / MQTT / BitTorrent relays) | Another free way to do signalling, no single operator | Free, no guarantee; reliability reports mixed | none | Keep as spare signalling if the PeerJS broker goes away |
| Metered "Open Relay" TURN | Free TURN quota | 20 GB a month free; needs a free account and an API key. Whether sign-up asks for a card, and what happens past 20 GB, is not stated on their page. A game uses a few megabytes at most. | account; card unclear | Possible, **only if sign-up asks for no card** |
| Cloudflare TURN | TURN from Cloudflare | Free only together with their video service; otherwise 0.05 USD per GB | billing needed | **Reject** |
| **Cloudflare Workers + Durable Objects, free plan** | A few lines of code on Cloudflare that pass messages between phones over ordinary web connections | Free plan: 100,000 requests a day; each incoming message counts as 1/20 of a request; over the limit, it returns errors until midnight UTC. Cloudflare states free-plan users "will not be charged". | free account; "no card" is reported by third parties, not confirmed on Cloudflare's own docs | **Fallback** relay |
| Supabase Realtime, free plan | Hosted message channels | 200 connections; free projects pause after a week unused and must be woken by hand in a dashboard | account | Reject: the pause would bite a game played every few weeks |
| Firebase Realtime Database, Spark plan | Hosted database with live updates | 100 connections, 10 GB a month; hard stop at the limit | Google account, reported no card | Workable spare, but more code than the Cloudflare relay |
| Your own small server | PeerServer plus a TURN server on a rented machine | about 4 to 6 USD or EUR a month | card | Only if everything free fails |

## 3. Recommended design

```
        ┌──────────── host phone ────────────┐
        │  driver  (full state, timers, bots) │
        │  viewFor(seat) for each seat        │
        └───┬───────────┬───────────┬─────────┘
   direct   │           │           │   (encrypted phone-to-phone links)
        client A    client B    client C
        own view    own view    own view
```

- **Star shape.** Every client is connected to the host only. Clients never talk to each other.
- **The host decides everything.** Clients send "I want to do this action"; the host checks it with the engine and answers with new views. The host sets who the action comes from by which connection it arrived on, so a modified client cannot play for someone else.
- **Each client receives only its own view.** Other hands and the deck never leave the host's phone.
- **One transport interface, three implementations**, so the rest of the app does not care how messages travel:

```js
// src/session/transport/
host = await openRoom(code)        // host side:  host.onJoin, host.send(conn, msg), host.close()
link = await joinRoom(code)        // client side: link.send(msg), link.onMessage, link.onStatus
```

| Implementation | Used for |
|---|---|
| `memory` | automated tests: several fake phones in one process |
| `peerjs` | the real thing, steps 51 onwards |
| `relay` | the Cloudflare fallback, step 56, if needed |

The `peerjs` package is bundled into the game by the normal build; nothing is loaded from another site at run time.

## 4. Rooms and joining

- **Room code:** five letters from an alphabet without look-alikes (no I, O, 0, 1), generated on the host. Under the hood the host registers at the broker as `smilelife-<CODE>`. The broker is shared with the whole world, so if the name is taken the host draws another code.
- **Joining:** "Rejoindre une partie" → type the code. The host's lobby also shows a link (`…/#r/ABCDE`) and a QR code of it for friends in the same room. The code sits after the `#`, which browsers never send to a server.
- **Lobby:** the host sees each arrival by name and can remove one. Players pick a name and colour; the host picks extensions, fills empty seats with bots, and starts.
- **The code is the only lock.** Anyone who has it can ask to join; the host's lobby is the check. That is enough for games among friends.
- **Seat ticket:** on joining, a client gets a random ticket stored on that phone. It is what lets the same phone take its seat back after a disconnection, and stops someone else from taking it.

## 5. Messages

All messages are small JSON objects.

| From | Message | Purpose |
|---|---|---|
| client | `hello { name, colour, ticket? }` | ask for a seat, or reclaim one |
| host | `lobby { seats, extensions }` | lobby state |
| host | `view { n, view }` | this player's view; `n` increases by one each time |
| client | `action { id, action }` | a move |
| host | `result { id, ok, reason? }` | accepted or refused, with the French reason |
| client | `resync { have: n }` | "I think I missed something" |
| both | `ping` / `pong` | notice a dead link within a few seconds |

A view is sent whole each time, slimmed as in ARCHITECTURE.md §8.3 (each visible card as its id plus state; the phone fills in texts from its own card data). No diffing: simple beats clever here. If `n` jumps, the client asks for a resync and gets the current view.

## 6. Same wifi (steps 51 and 52)

- It is the same code as online play. Two phones on one wifi find a direct local path, which is fast and very reliable.
- **Internet is still needed** for the first hello through the broker. A static web page has no way to find another phone on the wifi by itself, so play with no internet at all is not possible.
- Some guest or hotel wifi forbids devices from seeing each other. Then the phones try the internet path instead, as if they were in different places.

## 7. When a phone sleeps, reloads or drops

**Clients**

- A phone that locks or switches app loses its link. When it comes back to the page, it reconnects by itself with its ticket and receives the current view.
- A reload does the same: the room code and ticket are kept on the phone.
- Meanwhile the others see "<name> est déconnecté". If that player must act, the driver's deadline applies the flow's default choice, exactly as for a slow player.

**Host**

- The game only advances while the host's page is open and in front. The host screen is kept awake with the browser's wake-lock feature where available, and the lobby says plainly: "Garde ce téléphone allumé et sur cette page pendant la partie."
- The host saves the complete game on its own phone after every action. If the host's page reloads or the phone locks for a moment, the host reopens the game link, taps "Reprendre la partie", registers under the same room code, and the clients reconnect by themselves.
- While the host is away, clients show "L'hôte est absent… la partie reprendra à son retour" and keep trying.
- Known uncertainty: after a host drops, the broker may hold its old name for up to a minute before the host can take it again. Step 52 must measure this and, if it is a problem, have the host come back under `<CODE>-2`, `<CODE>-3`… with clients trying those in order.

## 8. When a player leaves for good (step 55)

1. Disconnected and it is not their turn: nothing happens.
2. They must act and are away: the deadline applies the default choice. This can repeat.
3. After **two turns in a row played by default, or 90 seconds disconnected while the game waits for them**, the host's phone switches the seat to a bot (level Moyen, see `AI-PLAYER.md` §7) and tells everyone.
4. If the player returns, their ticket gives the seat back at the next moment that seat has to act.

The host can also do this by hand from a small menu ("Remplacer par l'ordinateur"), for the friend who says "I have to go".

## 9. When the host leaves (step 57)

This is the weak point of running the game on one phone.

**Baseline, always built:** the host can come back (section 7). A flat battery or a call does not kill the game as long as the host returns on the same phone and browser.

**If the host is gone for good, the game is gone**, unless a copy exists elsewhere. A copy of the full game contains every hand and the deck order. There are two honest choices:

| Choice | How it works | Price |
|---|---|---|
| A. No copy | Nothing is sent. Host lost = game lost. | Keeps the promise that no other phone ever holds hidden cards. |
| B. Backup with a friend | The host regularly sends a sealed copy to one client. It is never shown, and is opened only if the host has been gone two minutes and the remaining players all tap "Continuer sans l'hôte". That phone becomes the host. | The hidden cards are technically on a second phone. A friend with programming skills could dig them out. |

**Recommendation: build A in step 57, and offer B to Teto as an option to decide then.** Among friends B is reasonable; it is a choice about trust, not a technical one, so it is Teto's.

Practical advice either way: the host should be the person with the best connection and a charger.

## 10. Online play (step 56)

Order of work:

1. **Test first, build second.** With steps 51 and 52 done, online play already works between many homes. Ask two or three friends in other places to join, including one on mobile data. Write down who could not connect.
2. If everyone connects: step 56 is only the diagnostics below. Stop there.
3. If someone cannot: add the fallback.

**Diagnostics (always):** if no link is established within 10 seconds, say why in plain French and what to try: "Connexion directe impossible depuis ce réseau. Essaie en wifi, ou demande à l'hôte de créer la partie depuis chez lui."

**Fallback: Cloudflare relay.**

- A Worker of about 60 lines: one "room" object per code; it accepts ordinary secure web connections from the host and the clients and passes each message to the right phone. It knows nothing about the game and stores nothing.
- The host stays in charge exactly as before; only the pipe changes. Works on every network that can open a web page.
- The app tries the direct link first and switches to the relay by itself if that fails.
- Budget check: a long game is about 2,000 messages towards the relay, counted as 100 requests, plus a handful of connections. The free allowance is 100,000 a day. If someone abused the public address, the relay would stop until midnight UTC; it would not charge.
- **Teto's part:** create a free Cloudflare account and paste one key into a GitHub setting; the session writes the exact clicks. **If Cloudflare asks for a card number at any point, stop and tell the session**; the alternative is the Metered TURN account under the same condition, and if that also wants a card, online play stays "works for most networks, not all".
- The relay's code lives in the repository under `relay/`, deployed by its own GitHub workflow. It is not part of the game's page.

## 11. What each piece costs if its free tier ended

| Piece | If it disappeared | Cost |
|---|---|---|
| PeerJS public broker | switch signalling to Trystero's public networks, or to the Cloudflare relay (which can also do signalling) | 0 |
| Google STUN | other free public STUN servers exist | 0 |
| Cloudflare free plan | Cloudflare paid plan | 5 USD a month |
| Everything free, at once | a small rented server running PeerServer and a TURN server | about 4 to 6 USD/EUR a month |
| Doing nothing | players on difficult networks cannot join; same-wifi and most home networks still work | 0 |

## 12. Privacy

- The broker sees room names and internet addresses of the phones, not game content.
- Direct links are encrypted between the phones.
- With the relay, messages pass through Cloudflare over an encrypted web connection. They contain only what each player may see.
- No accounts for players, no names stored anywhere but on the phones.

## 13. Testing

- **Automated** (in `npm test`, with the `memory` transport): three fake clients and a host play a full bot-driven game; every message received by a client is scanned for cards it may not see; links are dropped and restored mid-flow; the host is "reloaded" from its saved game.
- **By hand:** the "How you test it" lines of steps 51, 52, 55, 56 and 57 in the roadmap. Real phones are the only real test for networking; expect surprises with iPhones in particular (they suspend web pages aggressively).

## 14. Risks

- **Free services are favours, not contracts.** The PeerJS broker has been down before. The transport interface exists so that swapping it is a contained job.
- **iPhones.** Safari stops pages that are not in front. A host on an iPhone must keep the game on screen. Wake lock needs a recent iOS.
- **Mobile data** is the most likely place for "cannot connect". The test in section 10 tells you early.
- **Card-number check not confirmed.** Whether Cloudflare's or Metered's sign-up asks for a card could not be confirmed from their own pages. The plan stops rather than enter one.

## Sources (consulted 2026-11-11)

- PeerJS cloud server: https://peerjs.com/server/cloud and https://www.peerjs.com/docs
- PeerJS broker reliability reports: https://www.github.com/peers/peerjs/issues/671 , https://dev.to/alakkadshaw/peerjs-alternatives-in-2026-free-turn-auto-reconnect-and-which-webrtc-library-to-actually-pick-14ad
- Metered Open Relay: https://www.metered.ca/tools/openrelay/
- Cloudflare TURN pricing: https://developers.cloudflare.com/realtime/llms-full.txt
- Cloudflare Durable Objects free plan: https://developers.cloudflare.com/changelog/post/2025-04-07-durable-objects-free-tier/ , https://developers.cloudflare.com/durable-objects/platform/pricing , https://community.cloudflare.com/t/durable-objects-free-quota-block-below-100k-after-websocket-20-1-adjustment/967650
- Supabase Realtime limits: https://supabase.com/docs/guides/realtime/limits
- Firebase Realtime Database limits: https://firebase.google.com/docs/database/faq-and-troubleshooting
- Trystero: https://github.com/dmotz/trystero
