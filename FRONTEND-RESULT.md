# TavernBoard front end: build result

Built 2026-11-26 for the Gnome Tavern Hackathon. Work directory:
`~/workspace/hackathons/gnome-tavern-2026-11-26/app/`

## Design identity

Deep indigo night tavern with amber lamplight. Chosen to differ from the
recent CareBridge (warm cream and green serif), GenShift (dark lime
dashboard) and PopHop (white and coral playful) builds.

- Background: deep indigo near black blue `#0d1021`, with a soft amber
  radial glow at the top like lamplight over the board.
- Panels: lighter indigo `#171b33` cards with thin indigo borders,
  rounded corners (16px), soft shadow.
- Accent: amber gold `#f5b942`. The primary button carries a subtle
  amber glow shadow.
- Text: warm off-white parchment tones (`#f5efe2` family).
- Fonts: DM Serif Display for headings (Fraunces was already used by
  CareBridge), Public Sans for body text, IBM Plex Mono for addresses
  and commands. Loaded from Google Fonts with system fallbacks.
- Header motif: a Lucide Flame icon in an amber ringed rounded square
  with a small Pin badge, like a lantern over a notice board. Lucide
  icons only, no emoji, no pictures of people.
- Stack: React 18, Vite 5, Tailwind CSS 3, shadcn-style components
  written in `src/components/ui/` (Button, Card, Input, Textarea,
  Badge), Lucide icons. No Java anywhere.

## Features

- Board view: message cards with display name, short author address,
  text, relative time and cheer count. Newest first by default.
- Search filter across note text, names and addresses (every word must
  match). Sort toggle: Newest or Most cheered.
- Post form: optional name (40 chars max), note text with live counter
  (280 chars max, non-empty enforced, inline errors). Review step opens
  a sign with wallet panel that explains honestly that this page has no
  wallet write path wired in, shows a copyable gnokey `maketx call`
  template for the realm, and offers saving a demo post instead. Demo
  posts are stored in localStorage, shown with a Pending on chain
  badge, and never presented as confirmed transactions.
- Cheers: one per visitor per note, stored in localStorage, counts
  update live. Local post cheer counts persist with the post.
- Stats strip: notes on the board, cheers given, voices heard (unique
  authors), latest activity.
- Refresh button re-reads the realm. A status line always says where
  the visible data came from.

## Data layer

Single config file: `src/config.js`. Read path, in order:

1. JSON-RPC `abci_query` with path `vm/qrender` and data
   `gno.land/r/tavernboard:` (hex encoded) against the testnet RPC.
   The base64 response value is decoded to the realm Render markdown.
2. If that fails or yields no notes, fetch the realm page on gnoweb
   and parse its text.
3. If both fail, show 12 realistic sample notes with a Demo data badge
   in the header and Demo note badges on cards. The board is never
   empty or broken.

The parser (`src/lib/rpc.js`) accepts three realm output shapes:
embedded JSON (fenced or raw array, alternate field names like
`message`, `cheers`, `timestamp`), markdown list lines carrying a
`g1...` address with optional name, cheer suffix and timestamp, and
markdown tables. Local demo posts and cheers persist in localStorage
(`tavernboard.localPosts.v1`, `tavernboard.likes.v1`,
`tavernboard.visitorName.v1`), so the app works offline-ish.

Network facts verified against docs.gno.land on 2026-11-26: current
testnet is Onyx, chain id `onyx-1`, RPC
`https://rpc.onyx.testnets.gno.land:443` (alias
`https://rpc.latest.testnets.gno.land:443`), gnoweb at
`https://onyx.testnets.gno.land`.

## Config values to change once the realm path is final

Everything lives in `src/config.js`:

- `REALM_PATH`: currently the placeholder `gno.land/r/tavernboard`.
  One-line change to the deployed realm path, for example
  `gno.land/r/<deployer-address>/tavernboard` if the realm is deployed
  under a user namespace. The gnoweb link, status text and gnokey
  template all follow this value.
- `RENDER_PATH`: currently empty (root render). Set only if the realm
  serves the board under a render subpath.
- `RPC_ENDPOINT`, `CHAIN_ID`, `GNOWEB_BASE`: already set to Onyx
  testnet defaults. Change only if the realm lands on another network.
- In `src/components/PostForm.jsx`, the gnokey template assumes a
  realm function named `PostMessage` taking the note text as its
  argument. Update the function name and args to match the deployed
  realm interface. The panel already tells users to check the realm
  source before signing.

If the realm Render format differs from the three parsed shapes,
extend `parseRenderText` in `src/lib/rpc.js` and add a fixture test in
`src/lib/__tests__/rpc.test.js`.

## Tests and build

- Vitest: 36 tests in 3 files, all passing.
  - `messages.test.js` (18): validation (empty, length limit, name
    limit), sorting newest and most liked, filtering (text, name,
    address, multi-word), like toggling (add, remove, floor at zero),
    stats, short address, relative time, local message creation.
  - `rpc.test.js` (12): hex and base64 helpers, ABCI response parsing
    with fixture (success, RPC error, realm error), render parsing
    with markdown list, table and JSON fixtures, and the full load
    chain with mocked fetch (RPC success, gnoweb fallback, both fail,
    empty render).
  - `storage.test.js` (6): local post and liked id round trips,
    corrupt data fallbacks, like overlay behaviour.
- Production build: passes (`npm run build`). Output: `dist/index.html`
  (1.08 kB), CSS 17.02 kB, JS 203.47 kB (64.89 kB gzipped). Vite
  `base` is `./` so the build works from a GitHub Pages subpath.
- Served check: `npm run preview` answered HTTP 200 on
  `http://127.0.0.1:4173/` and the page title and board rendered.
- Screenshots (Playwright, Chromium) in
  `~/workspace/hackathons/gnome-tavern-2026-11-26/screenshots/`:
  `desktop-home.png` (1280x900), `mobile-home.png` (390x844),
  `desktop-sign-flow.png` (review and sign panel open),
  `mobile-board.png` (board list on mobile). In the sandbox the chain
  reads fail, so shots show the demo data fallback working as
  designed. Console errors during capture were the expected failed
  RPC and gnoweb fetches.

## Staging and path files

- GitHub Pages staging build: `~/workspace/hackathons/gnome-tavern-2026-11-26/gh-pages-staging/`
  (built site plus `.nojekyll`).
- NUL-delimited staging paths: `~/workspace/hackathons/gnome-tavern-2026-11-26/tavernboard-ghpages-paths.txt`
  (5 entries, relative to `gh-pages-staging/`).
- NUL-delimited source paths: `~/workspace/hackathons/gnome-tavern-2026-11-26/tavernboard-source-paths.txt`
  (27 entries, relative to `app/`, text files only, `node_modules`
  and `dist` excluded).
- Binary assets: none inside `app/` (the favicon is an SVG text file).
  The only binaries produced are the 4 PNG screenshots listed above,
  which live outside the app source tree.

## How to run

```bash
cd ~/workspace/hackathons/gnome-tavern-2026-11-26/app
npm install
npm run dev      # local development
npm test         # Vitest suite
npm run build    # production build into dist/
npm run preview  # serve the build on 127.0.0.1:4173
```

## Merge update (2026-11-26, finishing pass)

- `REALM_PATH` in `src/config.js` now points at the real realm:
  `gno.land/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard`.
- `parseRenderText` gained a realm-section parser for the actual
  `Render` format from `realm/tavernboard.gno` (verified against the
  local proof output in `realm/local-proof.log`), with 3 new fixture
  tests. Test total is now 39, all passing.
- The gnokey template gas values now match the realm guidance
  (5000ugnot fee, 5000000 gas wanted).
- Production build refreshed into `../gh-pages-staging/` and both path
  files regenerated. See `../FINAL-RESULT.md` for the full record.
