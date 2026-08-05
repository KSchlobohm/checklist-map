# checklist-map

A home inventory walkthrough app: track the things you always need, check them off as you go, and never forget an item on the list again.

**Live app:** [kschlobohm.github.io/checklist-map](https://kschlobohm.github.io/checklist-map/)

## Features

- Walk through inventory by location and build a shopping list.
- Keep inventory, walkthrough history, and theme preferences in browser storage.
- Export or import a portable backup and open the Data page on another device by QR code.
- Install the app and use its cached app shell offline after the first load.

## Development

Requires Node.js 22 and npm.

```sh
npm ci
npm run dev
```

Run the same quality gate used by GitHub Actions:

```sh
npx playwright install chromium
npm run check
```

The quality gate runs ESLint, Node unit tests, a production Vite build, and Playwright browser journeys. Use `npm test` or `npm run test:e2e` to run either test layer independently.

## Architecture

Checklist Map is a framework-free Vite and TypeScript progressive web app. It has no server runtime, framework, account, authentication, remote storage, analytics, or telemetry.

- `src/data.ts` owns the validated application document and all persistence mutations.
- `src/domain/` contains DOM-independent walkthrough and backup behavior.
- `src/main.ts` renders the browser UI with semantic DOM APIs.
- `vite-plugin-pwa` generates the manifest, offline app shell, and update lifecycle.

Inventory and walkthrough state are stored as one versioned `localStorage` document under `checklist-map:data:v1`. On first launch after this migration, existing `pantry_items`, `shopping_list`, `walkthrough_count`, and `last_walkthrough_at` values are validated and copied into the new document. The legacy values are not removed.

## GitHub Pages deployment

Pull requests targeting `main` run linting, tests, browser journeys, and a production build. Successful pushes to `main` deploy the root-level `dist` artifact to GitHub Pages.

Vite configures the `/checklist-map/` asset base required by the project site. QR sharing derives the Data page URL from the deployed app itself, so the static Pages deployment does not require a server configuration endpoint.

See [the manual smoke checklist](docs/manual-smoke-checklist.md) for post-deployment checks.

## Packback architecture

The root-level Vite project, pure domain modules, versioned browser document, generated PWA, explicit update prompt, unified quality gate, client-only Pages deployment, and manual smoke checklist intentionally align with Packback. Checklist Map retains its own inventory and walkthrough domain model and adds Playwright coverage for migration safety.
