# Pokédex: Mystery Dungeon (`pokedex-md`)

A recruitment checklist and small guide for **Pokémon Mystery Dungeon: Rescue Team DX**,
built as an installable, offline-capable web app (PWA). It's a static site with no backend:
progress is saved on the device (IndexedDB) and can be backed up and restored as a JSON file.

- **Pokédex**: all 418 recruitable Pokémon, plus the 28 that can be Shiny (each right after its regular one), with search, filter (missing / recruited / type) and sort.
- **Pokémon pages**: a Mystery Dungeon portrait, how to get it (dungeon, strong foe, legendary encounter, Mystery House...) and its camp.
- **Dungeons**: in unlock order with a screenshot, split into incomplete and complete, with which Pokémon you can recruit in each and how many you have.
- **Camps**: in unlock order with their artwork, split into incomplete and complete, and which Pokémon live in each.
- **Rescues**: turns a rescue request password into the A-OK password that revives your team
  (self-rescue). Type the 30 symbols, read them live with the camera, or import a photo or a
  Switch screenshot; it shows what the request says (team, Pokémon, dungeon and floor) as a check.
- **Settings**: language, back up / restore / reset progress, install.

## Development

Requires Node 24+ (the data script runs TypeScript with Node's built-in type stripping).

```sh
npm install
npm run dev       # builds data, starts Vite at http://localhost:5173
npm test          # data validation + unit tests
npm run check     # svelte-check / TypeScript
npm run build     # production build in dist/
npm run portraits # re-download Pokémon portraits from Serebii (only needed when Pokémon are added; needs cwebp)
npm run artwork   # re-download camp and dungeon artwork from Serebii (only needed when they're added; needs cwebp)
npm run icons     # regenerate the favicon and app icons in public/ from scripts/build-icons.ts
```

List ↔ Pokémon page navigation uses the View Transition API: the router names the
selected Pokémon's portrait and name on both pages so they morph (see `sharedEntry` in
`src/lib/router.svelte.ts`). Camps and dungeons do the same with their artwork and name between
their list and their page (`sharedCamp`, `sharedDungeon`). Browsers without the API, or with reduced motion on, just
switch pages.

Stack: Vite, Svelte 5, TypeScript, vite-plugin-pwa (Workbox), idb-keyval, Zod + YAML for
the data pipeline, Vitest.

## Project layout

```
data/                     # source of truth for game data and names (see data/README.md)
scripts/build-data.ts     # validates data/ and writes src/generated/ (git-ignored)
src/
  games/registry.ts       # known games (only `dx` for now)
  i18n/                   # UI strings per language + runtime lookup
  lib/                    # data loading, storage, progress, router, session
  lib/rescue/             # DX rescue passwords: codec, picture reader (+ its worker)
  components/ routes/     # Svelte UI
tests/
```

### Built for more games and languages

- Data lives in `data/games/<gameId>/`, routes are `#/<gameId>/...`, and saved progress
  is stored under `game/<gameId>/progress`. Adding a game means adding a data folder and
  one line in `src/games/registry.ts`. A game picker can come later without migrating anyone.
- Data files contain only ids. Every visible name (Pokémon, dungeons, camps, methods, and
  later moves and items) is looked up in `data/locales/<lang>/`. A game can override a
  shared name, and missing translations fall back to English.
- UI strings are in `src/i18n/ui/<lang>.ts`, typed against English.

## Deploying

`.github/workflows/deploy.yml` checks, tests and builds every push to `main`, then deploys
to GitHub Pages. In the repo settings, set **Pages → Source** to **GitHub Actions**.
The workflow sets `BASE_PATH` to `/<repo-name>/`.

## Rescue passwords

`src/lib/rescue/dx-password.ts` encodes and decodes DX's 30-symbol passwords. It's ported from
[pmd-gen](https://github.com/Karthik99999/pmd-gen) (MIT), credited in Settings → About.
`recognize.ts` reads a password from a picture, entirely on the device and in a Web Worker: it finds
the white glyphs, fits the 2×15 layout to them (the user can drag the corners if it's off), then
scores each symbol's suit by colour and by silhouette (`dx-suits.ts`; colours shift a lot in photos)
and its glyph against the masks in `dx-glyphs.ts`. When the best
guesses don't make a valid password, it tries swapping one or two symbols for runner-up guesses.
Symbols that were hard to read get a dashed border so they're checked against the screen. The
password's checksum is a plain sum, so two misreads can cancel out. `rescue.ts` checks the
dungeon, floor, Pokémon and team name too, which catches nearly all of those.
The camera (Photo) reads frames from a guide frame shaped like the game's panel (getUserMedia, so
laptop webcams work too) and takes the password once two reads in a row give the same valid one.
`tests/fixtures/rescue-*.jpg` are Serebii's screenshot of the password screen, a distorted copy of it
(perspective, blur, colour cast, glare) and a real phone photo of a Switch, used by `tests/rescue.test.ts`.

## Portraits

`public/portraits/<gameId>/<species-id>.webp` (and `<species-id>-<form>.webp` for forms, like
Unown letters, and `<species-id>-shiny.webp` for Shiny ones) are each game's own Pokémon portraits (Spike Chunsoft), downloaded from
[Serebii](https://www.serebii.net/dungeonrescueteamdx/pokemon.shtml) by `npm run portraits` and
re-encoded as WebP. Serebii is credited in Settings → About.

## Camp and dungeon artwork

`public/camps/<gameId>/<camp-id>.webp` is the official camp artwork and
`public/dungeons/<gameId>/<dungeon-id>.webp` a screenshot of each dungeon (both Spike Chunsoft),
downloaded from Serebii ([camps](https://www.serebii.net/dungeonrescueteamdx/rescueteamcamp.shtml),
[dungeons](https://www.serebii.net/dungeonrescueteamdx/dungeon/)) by `npm run artwork` and
credited in Settings → About.

## Data and disclaimer

The data was imported from Serebii and Bulbapedia and has not been verified entry by entry
in-game; see `data/README.md`. This is an unofficial fan project, not affiliated with
Nintendo, Creatures, GAME FREAK, The Pokémon Company or Spike Chunsoft.
