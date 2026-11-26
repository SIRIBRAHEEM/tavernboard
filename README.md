# TavernBoard

TavernBoard is a community message board for the Gnome Tavern Hackathon.
Anyone can pin a short note on the board, and anyone can cheer a note
once. The notes live in a Gno realm on Gno.land, not in a private
database, so the board is public, permanent, and readable by anyone with
a browser or an RPC client. There is no admin, no delete, and no edit:
what is posted stays posted.

Live demo: [PASTE GITHUB PAGES URL HERE]
Demo video: [PASTE YOUTUBE URL HERE]
Realm on gnoweb (after testnet deploy):
https://onyx.testnets.gno.land/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard

## How it works

- The realm (`realm/tavernboard.gno`) stores every message on chain:
  author address, text (280 bytes max), block height, cheer count, and
  the set of addresses that cheered it. Message IDs start at 0 and never
  change.
- `Render` returns the board as Markdown for gnoweb, newest first (50
  messages at a time), and `Render("/<id>")` shows one message.
- The front end (`app/`, React + Vite + Tailwind) reads the realm over
  the testnet RPC first (`vm/qrender`), then falls back to the gnoweb
  page, then to clearly labelled sample notes if neither answers. The
  board is never empty or broken, and the page always says where the
  visible data came from.
- Posting for real means signing a realm call with your own wallet
  (Adena or gnokey). The page shows the exact gnokey command for your
  note and can also save a demo post on your device, marked "Pending on
  chain". Demo posts are never presented as confirmed transactions.
- Cheers in the front end are one per visitor per note, kept in the
  browser. On chain, `LikeMessage` enforces one cheer per address.

## Realm

- Path: `gno.land/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard`
- Network: Gno.land Onyx testnet, chain ID `onyx-1`
- RPC: `https://rpc.onyx.testnets.gno.land:443`
  (alias `https://rpc.latest.testnets.gno.land:443`)
- Gnoweb: `https://onyx.testnets.gno.land`

API:

- `PostMessage(text string) int` - posts a message from the caller and
  returns its ID. Panics on empty text or text over 280 bytes.
- `LikeMessage(id int) int` - cheers a message, once per address.
  Returns the new cheer count. Panics on an unknown ID or a repeat cheer.
- `MessageCount() int` - how many messages have been posted.
- `GetMessage(id int) (author string, text string, height int64, likes int)`
  - one message in full.
- `HasLiked(id int, who address) bool` - whether an address cheered a
  message.
- `Render(path string) string` - Markdown board for gnoweb.

Gas note: use `-gas-wanted 5000000 -gas-fee 5000ugnot` for calls.
Posting needed about 2.3M to 2.9M gas in local testing as the board
grew, so 5M keeps a safe margin.

## Run the front end

```bash
cd app
npm install
npm run dev      # local development server
npm test         # Vitest suite (39 tests)
npm run build    # production build into dist/
npm run preview  # serve the build on 127.0.0.1:4173
```

The chain settings live in one file, `app/src/config.js` (realm path,
chain ID, RPC endpoint, gnoweb base). The production build uses a
relative base path, so it works from a GitHub Pages subpath.

## Run the realm locally (no testnet needed)

Toolchain: `gno`, `gnokey`, `gnodev` v1.8.0. With `GNOROOT` pointing at
a gnolang/gno checkout (the `gno` CLI needs the stdlib sources):

```bash
export PATH="$HOME/workspace/gno-tools/bin:$PATH"
export GNOROOT="$HOME/workspace/gno-tools/gno"
cd realm

gno fmt -w ./...
gno lint ./...
gno test -v ./...          # 6 tests, all pass

# Local chain (RPC 127.0.0.1:26657, gnoweb 127.0.0.1:8888).
# Keep scratch files out of this directory while gnodev runs.
gnodev local -no-watch -home ./.gnokey-home \
  -deploy-key g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl \
  -add-account g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl=100000000000ugnot .

# In another terminal:
gnokey query vm/qrender -data "gno.land/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard:" -remote http://127.0.0.1:26657
gnokey maketx call -pkgpath "gno.land/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard" \
  -func PostMessage -args "Hello from the tavern" \
  -gas-fee 4000ugnot -gas-wanted 4000000 -chainid dev -remote http://127.0.0.1:26657 \
  -home ./.gnokey-home tavernboard-dev
# Open http://127.0.0.1:8888/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard
```

## Deploy the realm to the Onyx testnet

1. Fund the deploy key (browser step, captcha required). Go to
   https://faucet.gno.land, choose the Onyx Faucet (chain `onyx-1`),
   paste `g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl`, solve the captcha,
   submit. 100 GNOT is more than enough.

2. Confirm the funds landed:

```bash
gnokey query bank/balances/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl \
  -remote https://rpc.onyx.testnets.gno.land:443
```

3. Deploy the realm (run from the `realm/` directory; gnokey asks for
   the key password):

```bash
gnokey maketx addpkg \
  -pkgpath "gno.land/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard" \
  -pkgdir . \
  -gas-fee 5000ugnot -gas-wanted 5000000 \
  -chainid onyx-1 -remote https://rpc.onyx.testnets.gno.land:443 \
  -home ./.gnokey-home tavernboard-dev
```

4. Wait a few seconds: the testnet enables a new package shortly after
   `addpkg`. If calls fail with "package not known", wait and retry. If
   it still fails after a minute, look up the exact package path at
   https://gpas.latest.testnets.gno.land for the refusal reason.

5. Post and cheer:

```bash
gnokey maketx call -pkgpath "gno.land/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard" \
  -func PostMessage -args "Welcome to TavernBoard" \
  -gas-fee 5000ugnot -gas-wanted 5000000 -chainid onyx-1 \
  -remote https://rpc.onyx.testnets.gno.land:443 -home ./.gnokey-home tavernboard-dev

gnokey maketx call -pkgpath "gno.land/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard" \
  -func LikeMessage -args "0" \
  -gas-fee 5000ugnot -gas-wanted 5000000 -chainid onyx-1 \
  -remote https://rpc.onyx.testnets.gno.land:443 -home ./.gnokey-home tavernboard-dev
```

6. View it:
   https://onyx.testnets.gno.land/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard
   (single message: append `:/0`, `:/1`, and so on).

## Read the board state

- Render (Markdown, best for display): ABCI query path `vm/qrender`,
  data `gno.land/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard:`
  for the board, or `.../tavernboard:/<id>` for one message. With
  gnokey:
  `gnokey query vm/qrender -data "gno.land/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard:" -remote https://rpc.onyx.testnets.gno.land:443`
- Eval (typed values, best for app logic): ABCI query path `vm/qeval`,
  data
  `gno.land/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard.MessageCount()`,
  `.../tavernboard.GetMessage(0)`,
  `.../tavernboard.HasLiked(0, "g1...")`. Loop `GetMessage(i)` for `i`
  in `0..MessageCount()-1` to rebuild the board in a UI.
- Browser: open the gnoweb link above. The realm page has Content
  (Render output), Source, and Actions tabs. Actions shows a wallet
  form and the equivalent gnokey command per function.

## Status (honest)

- Realm: written, formatted, linted, unit tested (6 of 6 tests pass),
  and proven end to end on a local gnodev chain: deployed at its real
  path, 3 messages posted, 1 cheer recorded, renders and typed queries
  verified. Full record in `realm/REALM-RESULT.md` and
  `realm/local-proof.log`.
- Front end: built and tested (39 tests pass). It reads the realm over
  RPC, then gnoweb, then labelled sample notes. Its parser covers the
  realm Render format (verified against the local proof output) plus
  JSON and markdown fallbacks.
- Testnet: not deployed yet. The one remaining human step is funding
  the deploy key at the faucet (captcha in a browser), then running the
  deploy commands above. Key, code, tests, and commands are ready.
  Nothing about testnet state is claimed before that deploy lands.

## Project layout

- `realm/` - the Gno realm, its tests, and deployment notes.
- `app/` - the React front end (source, tests, build config).
- `screenshots/` - front end screenshots (desktop and mobile).
- `tavernboard-demo.mp4`, `thumbnail.png`, `video-script.txt`,
  `youtube-upload-details.txt`, `tavernboard-captions.srt` - demo video
  and upload pack.

## Licence

MIT. Use it, fork it, pin your own notes.
