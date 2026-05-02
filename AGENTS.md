# AGENTS.md

Keep this file updated anytime you notice a difference between its contents and the reality of the
codebase.

## Project overview

Static site (no build, no npm, no framework). A map of capoeira training locations read from a CSV file.

4 files: `index.html`, `estilo.css`, `mapa.js`, `dados.csv`. Full docs in `LEIAME.md`.

Code is formatted with **Prettier** (2-space indent, single quotes → double quotes, trailing commas).

## Developer commands

No build, lint, test, or typecheck. To preview:

```bash
python3 -m http.server 8000
```

Must serve via HTTP — `fetch()` in `mapa.js` will not work with `file://` protocol.

## CSV format

Current columns: `Mostrar no Mapa`, `Nome do Endereço`, `Endereço`, `Plus Code`, `Coordenadas`, `Nome do Responsável`, `Telefone de Contato`, `Grupo`, `Horários de Treino`, `Última revisão em`

- **Delimiter:** comma (not semicolon, despite being common in Brazil)
- Fields containing commas or special characters must be double-quoted
- The `Horários de Treino` column uses `;` as an **internal** separator between schedule entries — do not confuse with CSV delimiter
- `Coordenadas` column (optional): `lat,lon` pair — when present and valid, geocoding is skipped
- `Plus Code` column (optional): Google Plus Code address — used as a geocoding fallback via Nominatim
- `Mostrar no Mapa` column: `TRUE`/`FALSE` — only rows with `TRUE` are displayed on the map and sidebar
- The `Estilo` column was removed (no longer in CSV or UI)
- `Latitude` and `Longitude` columns are optional; when present and valid, geocoding is skipped for that row

## Code conventions

- All variable names, function names, and UI text are in **Brazilian Portuguese**
- No comments in code unless explicitly requested
- Leaflet.js and its CSS are loaded from unpkg CDN — no local node_modules
- Use `const` by default, `let` only when reassignment is needed — never `var`
- Code is formatted with **Prettier** (2-space indent, double quotes, trailing commas)

## Key architecture details

- `mapa.js` is the single entrypoint (self-invoking `principal()` at the bottom)
- Geocoding uses **Nominatim** (OpenStreetMap) with a 1.1-second delay between requests (`ATRASO_GEOCODE_MS`)
- Coordinate resolution order: `Coordenadas` column → `Latitude`/`Longitude` columns → Plus Code geocoding → `Endereço` geocoding
- Geocode results are cached in `localStorage` under key `mapacapoeira_geocode`
- Cache is keyed by the raw address string passed to `geocodificar()` — if an address or Plus Code is corrected in the CSV, the old cache entry will still match and serve stale coordinates. Clear with `localStorage.removeItem('mapacapoeira_geocode')`
- The CSV parser (`parsearCSV` / `separarCampos`) handles quoted fields and escaped double-quotes, but does not handle newlines inside quoted fields
- Rows are filtered by `Mostrar no Mapa` = `TRUE` before processing (others are silently skipped)
