# hattenhauer-net

Cloudflare Worker for hattenhauer.net — professional services landing page with context-driven recommendations.

**Release date:** 2026-08-31 (last deployed via Wrangler)  
**Compatibility date:** 2026-08-25  
**Compatibility flags:** `nodejs_compat`

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing page — professional services & consulting |
| `/a` | Discover & Shop — geo-aware, multilingual recommendations page |
| `/health` | Health check endpoint (JSON) |
| `/nasa-bg.jpg` | Proxied NASA background image (cached 1 year) |
| `/favicon.ico` | 204 No Content |

## Features

- **Geo-aware content** — uses `request.cf` for city, region, country, coordinates, timezone
- **AI translation** — auto-translates page content via Workers AI (`@cf/meta/llama-3.2-3b-instruct`) based on `Accept-Language` header
- **D1 integration** — pulls product data from a D1 database with fallback to curated static content
- **Amazon Associates** — builds affiliate links with configurable associate tag
- **Content categories:** Family, Health, Biblical, Music, Podcasts, Events

## Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `DB` | D1 Database | Product/recommendation data (optional — falls back to static content) |
| `AI` | Workers AI | Content translation for non-English visitors (optional) |
| `AMAZON_ASSOCIATE_TAG` | Var/Secret | Amazon affiliate tag for product links (optional) |

## Setup

```bash
npm install -g wrangler
wrangler deploy
```

Configure bindings in `wrangler.toml` or via the Cloudflare dashboard.
