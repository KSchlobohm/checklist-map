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
cd InventoryApp/ClientApp
npm ci
npm start
```

Run the same quality gate used by GitHub Actions:

```sh
npm run check
```

## GitHub Pages deployment

Pull requests targeting `main` run linting, tests, and a production build. Successful pushes to `main` deploy the client build to GitHub Pages and publish the `InventoryApp/ClientApp/build` artifact.

The Create React App `homepage` setting provides the `/checklist-map/` asset base required by the project site. QR sharing derives the Data page URL from the deployed app itself, so the static Pages deployment does not require a server configuration endpoint.

See [the manual smoke checklist](docs/manual-smoke-checklist.md) for post-deployment checks.

## Packback lessons

The Pages workflow, repository-specific asset base, unified quality gate, client-only deployment, and manual smoke checklist follow patterns evaluated from Packback. Checklist Map keeps Create React App and its existing service worker rather than adopting Packback's Vite migration or update-prompt implementation because those changes are not required for reliable Pages deployment.
