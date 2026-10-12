# Dynamic JavaScript DOM Logic & RESTful API Client

A responsive product explorer using modern JavaScript modules, async/await, the public Fake Store API, dynamic DOM rendering, live filters, sorting, localStorage caching, and friendly loading/error states.

## Run locally

Because this project uses ES modules and `fetch`, open it through a local web server (not by double-clicking `index.html`).

1. Extract the ZIP and open the folder in VS Code.
2. Install the VS Code **Live Server** extension if needed.
3. Right-click `index.html` → **Open with Live Server**.
4. Ensure you have an internet connection so the browser can request `https://fakestoreapi.com/products`.

## Features

- Fetches live product data with async/await and `AbortController`; includes built-in demo products as a fallback when the public API is unavailable.
- Separates network/cache logic into `js/api.js` and UI/state logic into `js/app.js`.
- Real-time text search, category tabs, category select, sorting, and load-more.
- Product detail dialog and add-to-cart demo.
- Saves cart, saved items, theme, and cached API data in localStorage.
- Loading skeletons, retryable error banner, empty state, and live announcements.
- Responsive layout for mobile, tablet, and desktop.

## Offline structural verification

Run `python scripts/check-project.py` from the project folder. This checks required files, HTML references, and JavaScript syntax. It does not replace manual browser testing.

## Test checklist

- [ ] Products load while online.
- [ ] Search updates results without a full page reload.
- [ ] Category chips and select filter results.
- [ ] Sort by price, rating, and name.
- [ ] Saved products remain saved after refresh.
- [ ] Cart count persists after refresh.
- [ ] Theme toggle works and persists.
- [ ] Turn off the network and refresh to verify the friendly error and retry behavior.
- [ ] Check the browser console and test mobile widths.

## Limitations

This is a front-end demo. The Fake Store API supplies sample product data, and the cart does not process payments or perform checkout. API availability depends on the public service and the user's network. Test in a browser before claiming all behaviors are verified.

## Files

```text
index.html
styles.css
js/
  api.js
  app.js
screenshots/
README.md
```

## Publish

```bash
git init
git add .
git commit -m "Build dynamic REST API product client"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the sample URL with your own repository URL. If a remote already exists, inspect it with `git remote -v` first.
