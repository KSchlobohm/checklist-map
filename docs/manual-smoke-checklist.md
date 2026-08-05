# Manual smoke checklist

Run these checks on the deployed GitHub Pages site in current desktop Chrome or Edge and mobile Safari or Chrome:

1. Load the app and confirm the home screen, icons, and styles resolve beneath `/checklist-map/`.
2. Add and edit inventory items, refresh, and confirm the changes remain.
3. Complete a walkthrough and confirm the resulting shopping list and last-walked value remain after refresh.
4. Open each navigation view and confirm the Data page loads directly from `?view=importExport`.
5. Scan the Data page QR code and confirm it opens the deployed Data page on another device.
6. Export a backup, alter local data, import the backup, and confirm the original items and shopping list return.
7. Paste malformed backup text and confirm existing data remains unchanged.
8. Toggle the theme and confirm it remains selected after refresh.
9. Install the PWA, open it offline after an initial online load, and confirm the cached app shell works.
10. With the previous deployed version installed, deploy an update and confirm the update prompt appears and reloads into the new version only after approval.
11. In a browser profile containing the previous `pantry_items` storage, load the new release and confirm items, shopping-list state, walkthrough count, and last-walked time migrate without changing the legacy keys.
