# PayFlow

A demo digital wallet. Send payments by email, watch balances update in real time and track every transaction in one dashboard.

Built with plain HTML, CSS and JavaScript. No build step. All data is stored in the browser with `localStorage`, and no real money moves.

## Run locally

Open `index.html` in a browser, or run a local server:

```bash
python3 -m http.server 8000
```

## Deploy on GitHub Pages

1. Push these files to a GitHub repository.
2. Open Settings, then Pages.
3. Under Source, choose the `main` branch and the `/ (root)` folder, then save.
4. Your site goes live at `https://<username>.github.io/<repo>/`.

## Files

- `index.html`: page structure and meta tags
- `style.css`: all styling
- `script.js`: wallet logic, rendering and cross tab updates
