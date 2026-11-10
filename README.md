# Pokédex: Mystery Dungeon (`pokedex-md`)

A recruitment checklist and small guide for **Pokémon Mystery Dungeon: Rescue Team DX**,
built as an installable, offline-capable web app (PWA). It's a static site with no backend:
progress is saved on the device (IndexedDB) and can be backed up and restored as a JSON file.

- **Pokédex**: all 418 recruitable Pokémon, with search, filter (missing / recruited / type) and sort.
- **Pokémon pages**: a Mystery Dungeon portrait, how to get it (dungeon, strong foe, legendary encounter, Mystery House...) and its camp.
- **Dungeons**: in unlock order, with which Pokémon you can recruit in each and how many you have.
- **Camps**: which Pokémon live in each Rescue Team Camp.
- **Settings**: language, back up / restore / reset progress, install.

## Development

Requires Node 24+ (the data script runs TypeScript with Node's built-in type stripping).

```sh
npm install
npm run dev       # builds data, starts Vite at http://localhost:5173
npm test          # data validation + unit tests
npm run check     # svelte-check / TypeScript
npm run build     # production build in dist/
npm run portraits # re-download portraits + credits (only needed when species are added)
npm run icons     # regenerate the favicon and app icons in public/ from scripts/build-icons.ts
```

List ↔ Pokémon page navigation uses the View Transition API: the router names the
selected Pokémon's portrait and name on both pages so they morph (see `sharedEntry` in
`src/lib/router.svelte.ts`). Browsers without the API, or with reduced motion on, just
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

## Portraits

`public/portraits/<species-id>.png` are 40×40 portraits from
[PMDCollab SpriteCollab](https://github.com/PMDCollab/SpriteCollab), shared under
CC BY-NC 4.0: no commercial use, and artists must be credited. Most are original Spike
Chunsoft portraits from earlier Mystery Dungeon games. Artist credits are in
`data/shared/portrait-credits.yaml` and are listed in Settings → About.

## Data and disclaimer

The data was imported from Serebii and Bulbapedia and has not been verified entry by entry
in-game; see `data/README.md`. This is an unofficial fan project, not affiliated with
Nintendo, Creatures, GAME FREAK, The Pokémon Company or Spike Chunsoft.
