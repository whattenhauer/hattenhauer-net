# hattenhauer-net

Cloudflare Worker for hattenhauer.net — professional services landing page with a context-driven discovery/shopping page at `/a`.

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/a` | Ads / discovery page (geo-aware, multilingual via Workers AI, clickable product cards) |
| `/health` | Health check JSON endpoint |
| `/nasa-bg.jpg` | Proxied NASA background image |
| `/favicon.ico` | 204 No Content |

## Deploy

This Worker is connected to the `whattenhauer/hattenhauer-net` GitHub repository via Workers Builds. Pushing to the production branch automatically builds and deploys.

```bash
npx wrangler deploy
```

## Configuration

See `wrangler.jsonc` for the Worker name, entry point, and compatibility date.
