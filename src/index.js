export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // ─── Existing routes (unchanged) ───

      if (path === '/nasa-bg.jpg') {
        const img = await fetch('https://images-assets.nasa.gov/image/art002e014066/art002e014066~large.jpg', {
          cf: { cacheEverything: true, cacheTtl: 31536000 }
        });
        return new Response(img.body, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
          }
        });
      }

      if (path === '/favicon.ico') {
        return new Response(null, { status: 204 });
      }

      if (path === '/health') {
        return json({ status: 'ok', time: new Date().toISOString() });
      }

      // ─── Ads / Discovery page at /a ───
      if (path === '/a' || path.startsWith('/a/')) {
        return await handleAdsPage(request, env, ctx);
      }

      // ─── Default: landing page ───
      return html(landingPage());

    } catch (err) {
      return html('<h1 style="color:#ff6b6b">Error</h1><p style="color:#fff">' + err.message + '</p>', 500);
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// ADS / DISCOVERY PAGE
// ═══════════════════════════════════════════════════════════════

async function handleAdsPage(request, env, ctx) {
  // ─── 1. Geolocation from Cloudflare edge (request.cf) ───
  // Available on all plans at zero latency — no client-side permission prompt.
  // Full list: https://developers.cloudflare.com/workers/runtime-apis/request/#the-cf-property
  const cf = request.cf || {};
  const geo = {
    city: cf.city || 'Unknown',
    region: cf.region || (cf.regionCode || ''),
    country: cf.country || '',
    countryCode: cf.countryCode || '',
    continent: cf.continent || '',
    postalCode: cf.postalCode || '',
    latitude: cf.latitude || '',
    longitude: cf.longitude || '',
    timezone: cf.timezone || 'UTC',
    asn: cf.asn || '',
  };

  // ─── 2. Language detection from Accept-Language header ───
  const acceptLang = request.headers.get('Accept-Language') || 'en';
  const viewerLang = parseAcceptLanguage(acceptLang);
  const langName = LANGUAGE_NAMES[viewerLang] || viewerLang;
  const needsTranslation = viewerLang !== 'en' && !!env.AI;

  // ─── 3. Gather content (mock data now, real APIs later) ───
  // Each category below has commented-out real API integration code.
  const sections = await gatherContent(geo, env, ctx);

  // ─── 4. Auto-translate if viewer language is not English ───
  // Uses Workers AI (@cf/meta/llama-3.2-3b-instruct — multilingual).
  // Falls back to English silently on any error.
  let uiStrings = UI_STRINGS;
  let translatedSections = sections;

  if (needsTranslation) {
    try {
      const translated = await translateContent(env.AI, uiStrings, sections, langName);
      uiStrings = translated.ui;
      translatedSections = translated.sections;
    } catch (e) {
      // Graceful fallback: serve English if translation fails
    }
  }

  // ─── 5. Render the page ───
  return adsHtml(adsPageHTML(uiStrings, translatedSections, geo, viewerLang, langName, needsTranslation));
}

// ─── Language parsing ───
const LANGUAGE_NAMES = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean', pt: 'Portuguese', ru: 'Russian', ar: 'Arabic',
  hi: 'Hindi', it: 'Italian', nl: 'Dutch', pl: 'Polish', tr: 'Turkish',
  vi: 'Vietnamese', th: 'Thai', id: 'Indonesian', sv: 'Swedish', da: 'Danish',
  fi: 'Finnish', no: 'Norwegian', cs: 'Czech', el: 'Greek', he: 'Hebrew',
  ro: 'Romanian', hu: 'Hungarian', uk: 'Ukrainian', ms: 'Malay', fa: 'Persian',
};

function parseAcceptLanguage(header) {
  const langs = header.split(',').map(l => {
    const [code, q] = l.trim().split(';q=');
    return { code: code.split('-')[0].toLowerCase(), q: q ? parseFloat(q) : 1 };
  }).sort((a, b) => b.q - a.q);
  return langs[0]?.code || 'en';
}

// ─── UI Strings (translatable) ───
const UI_STRINGS = {
  pageTitle: 'Discover & Shop',
  pageSubtitle: 'Context-driven recommendations based on your location and interests',
  detectedLocation: 'Showing results for',
  detectedLanguage: 'Page language',
  autoTranslated: 'Auto-translated from English',
  sectionFamily: 'Family Development',
  sectionFamilyDesc: 'Resources for strengthening family bonds and parenting',
  sectionHealth: 'Health Products',
  sectionHealthDesc: 'Curated wellness and health essentials',
  sectionBiblical: 'Biblical Publications',
  sectionBiblicalDesc: 'Latest books and study materials for spiritual growth',
  sectionMusic: 'Christian Music',
  sectionMusicDesc: 'Trending worship songs and Christian albums',
  sectionPodcasts: 'Christian Podcasts',
  sectionPodcastsDesc: 'Inspiring conversations and biblical teachings',
  sectionEvents: 'Local Events',
  sectionEventsDesc: 'Gatherings and activities near you',
  viewMore: 'View Details',
  noEvents: 'No events found near your location — check back soon!',
  backHome: 'Back to Home',
  loadingNote: 'Live data integration pending — showing curated examples',
};

// ─── Mock data + commented API integration ───

async function gatherContent(geo, env, ctx) {
  // ═══ 1. Family Development (Amazon PA-API 5.0) ═══
  // To enable live data, set these secrets:
  //   wrangler secret put AMAZON_ACCESS_KEY
  //   wrangler secret put AMAZON_SECRET_KEY
  //   wrangler secret put AMAZON_ASSOCIATE_TAG
  //
  // const familyProducts = await fetchAmazonProducts({
  //   env, ctx,
  //   searchIndex: 'Books',
  //   keywords: 'family development parenting',
  //   sortBy: 'SalesRank',
  //   maxResults: 4,
  //   cacheKey: 'family_dev',
  // });

  const familyProducts = [
    { title: 'The Whole-Brain Child', desc: "12 revolutionary strategies to nurture your child's developing mind", price: '$14.99', link: '#', tag: 'Bestseller' },
    { title: 'Boundaries with Kids', desc: 'How healthy choices grow healthy children', price: '$12.99', link: '#', tag: 'Trending' },
    { title: 'Parenting with Love and Logic', desc: 'Teaching children responsibility and character', price: '$16.99', link: '#', tag: 'Popular' },
    { title: 'The 5 Love Languages of Children', desc: "Discover your child's love language", price: '$11.99', link: '#', tag: 'New' },
  ];

  // ═══ 2. Health Products (Amazon PA-API 5.0) ═══
  // const healthProducts = await fetchAmazonProducts({
  //   env, ctx,
  //   searchIndex: 'HealthPersonalCare',
  //   keywords: 'wellness natural supplements',
  //   sortBy: 'SalesRank',
  //   maxResults: 4,
  //   cacheKey: 'health_products',
  // });

  const healthProducts = [
    { title: 'Vitamin D3 + K2 Complex', desc: 'Bone health and immune support formula', price: '$24.99', link: '#', tag: 'Bestseller' },
    { title: 'Natural Sleep Support', desc: 'Melatonin-free restful sleep blend', price: '$19.99', link: '#', tag: 'Trending' },
    { title: 'Omega-3 Fish Oil', desc: 'Ultra-pure molecularly distilled EPA/DHA', price: '$22.99', link: '#', tag: 'Popular' },
    { title: 'Organic Turmeric Curcumin', desc: 'With black pepper extract for absorption', price: '$17.99', link: '#', tag: 'New' },
  ];

  // ═══ 3. Biblical Publications (Amazon PA-API 5.0) ═══
  // const biblicalPubs = await fetchAmazonProducts({
  //   env, ctx,
  //   searchIndex: 'Books',
  //   keywords: 'biblical studies Christian theology',
  //   sortBy: 'DateNewest',
  //   maxResults: 4,
  //   cacheKey: 'biblical_pubs',
  // });

  const biblicalPubs = [
    { title: 'EKO Books: Interesting Books ', desc: 'EKO writes the untold story of Jesus. The Nazarene Saga follows the carpenter through the years the Gospels leave mostly silent: the work, family obligations, friendships, and journeys that preceded his public ministry. EKO is also the author of the Unsealed Archives, historical thrillers drawn from declassified records and unresolved testimony. He spends the rest of his time with his children, usually outdoors or on a motorcycle.', price: '~ $14.98 pe paperback', link: '4zdF1yy', tag: 'New Release' },
    { title: 'The Bible Project: Understanding Scripture', desc: 'A visual journey through every book of the Bible', price: '$29.99', link: '#', tag: 'New Release' },
    { title: 'Knowing God', desc: "J.I. Packer's classic guide to the character of God", price: '$15.99', link: '#', tag: 'Classic' },
    { title: 'The Case for Christ', desc: "A journalist's personal investigation of the evidence", price: '$13.99', link: '#', tag: 'Bestseller' },
    { title: 'Mere Christianity', desc: 'C.S. Lewis on the Christian faith', price: '$12.99', link: '#', tag: 'Timeless' },
  ];

  // ═══ 4. Christian Music (Spotify Web API) ═══
  // To enable live data, set:
  //   wrangler secret put SPOTIFY_CLIENT_ID
  //   wrangler secret put SPOTIFY_CLIENT_SECRET
  //
  // const music = await fetchSpotifyTracks({
  //   env, ctx,
  //   search: 'Christian worship',
  //   maxResults: 4,
  //   cacheKey: 'christian_music',
  // });

  const music = [
    { title: 'Goodness of God', desc: 'CeCe Winans — Worship Album of the Year', price: 'Stream', link: '#', tag: 'Trending' },
    { title: 'Holy Forever', desc: 'Chris Tomlin — Live worship anthem', price: 'Stream', link: '#', tag: 'Popular' },
    { title: 'Graves into Gardens', desc: 'Elevation Worship ft. Brandon Lake', price: 'Stream', link: '#', tag: 'Bestseller' },
    { title: 'Fear Is Not My Future', desc: 'Maverick City Music x Kirk Franklin', price: 'Stream', link: '#', tag: 'New' },
  ];

  // ═══ 5. Christian Podcasts (PodcastIndex API) ═══
  // To enable live data, set:
  //   wrangler secret put PODCASTINDEX_API_KEY
  //   wrangler secret put PODCASTINDEX_API_SECRET
  //
  // const podcasts = await fetchPodcastIndexShows({
  //   env, ctx,
  //   search: 'Christian Bible teaching',
  //   maxResults: 4,
  //   cacheKey: 'christian_podcasts',
  // });

  const podcasts = [
    { title: 'The Bible in a Year', desc: 'Fr. Mike Schmitz walks you through the entire Bible', price: 'Free', link: '#', tag: '#1 Podcast' },
    { title: 'The Briefing', desc: 'Daily worldview analysis with Albert Mohler', price: 'Free', link: '#', tag: 'Daily' },
    { title: 'Desiring God', desc: 'John Piper on the sovereignty of God in all things', price: 'Free', link: '#', tag: 'Popular' },
    { title: 'Advent Conspiracy', desc: 'Rethinking the Christmas season with intention', price: 'Free', link: '#', tag: 'Seasonal' },
  ];

  // ═══ 6. Local Events (Eventbrite API) ═══
  // To enable live data, set:
  //   wrangler secret put EVENTBRITE_API_KEY
  //
  // const events = await fetchLocalEvents({
  //   env, ctx, geo,
  //   lat: geo.latitude,
  //   lon: geo.longitude,
  //   radius: 25,
  //   maxResults: 4,
  //   cacheKey: 'local_events_' + (geo.city || 'unknown'),
  // });

  const events = (geo.city && geo.city !== 'Unknown') ? [
    { title: 'Community Worship Night', desc: 'An evening of worship and fellowship near ' + geo.city, price: 'Free', link: '#', tag: 'This Week' },
    { title: 'Family Conference 2026', desc: 'Three-day family enrichment event in ' + geo.region, price: '$45', link: '#', tag: 'Upcoming' },
    { title: 'Health & Wellness Fair', desc: 'Local vendors and workshops in ' + geo.city, price: 'Free', link: '#', tag: 'This Weekend' },
    { title: 'Bible Study Kickoff', desc: 'New study series beginning in your area', price: 'Free', link: '#', tag: 'New' },
  ] : [];

  return [
    { id: 'family', items: familyProducts },
    { id: 'health', items: healthProducts },
    { id: 'biblical', items: biblicalPubs },
    { id: 'music', items: music },
    { id: 'podcasts', items: podcasts },
    { id: 'events', items: events },
  ];
}

// ═══════════════════════════════════════════════════════════════
// COMMENTED API INTEGRATION FUNCTIONS
// Uncomment and configure when API keys are provided.
// All functions use the same pattern: check KV cache → fetch API → cache result.
// ═══════════════════════════════════════════════════════════════

/*
// ─── Amazon Product Advertising API (PA-API 5.0) ───
// Requires: AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_ASSOCIATE_TAG secrets
// Docs: https://webservices.amazon.com/paapi5/documentation/
// Note: PA-API requires AWS Signature v4 signing. See the Amazon SDK or
//   https://webservices.amazon.com/paapi5/documentation/signing-requests.html
//
// async function fetchAmazonProducts(opts) {
//   const { env, ctx, searchIndex, keywords, sortBy, maxResults, cacheKey } = opts;
//   const cacheKeyFull = `amazon:${cacheKey}`;
//
//   // ── KV cache check (requires CONTENT_KV namespace binding) ──
//   if (env.CONTENT_KV) {
//     const cached = await env.CONTENT_KV.get(cacheKeyFull, 'json');
//     if (cached) return cached;
//   }
//
//   // ── PA-API 5.0 SearchItems request (simplified — full AWS Sig v4 signing needed) ──
//   const response = await fetch(
//     'https://webservices.amazon.com/paapi5/searchitems', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json; charset=UTF-8',
//         'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
//         // AWS Signature v4 authorization headers go here
//       },
//       body: JSON.stringify({
//         PartnerTag: env.AMAZON_ASSOCIATE_TAG,
//         PartnerType: 'Associates',
//         Marketplace: 'www.amazon.com',
//         Keywords: keywords,
//         SearchIndex: searchIndex,
//         ItemCount: maxResults,
//         SortBy: sortBy,
//       }),
//     }
//   );
//
//   const data = await response.json();
//   const items = (data.SearchResult?.Items || []).map(item => ({
//     title: item.ItemInfo?.Title?.DisplayValue || 'Untitled',
//     desc: item.ItemInfo?.Features?.DisplayValues?.join(', ') || '',
//     price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount || '',
//     link: item.DetailPageURL || '#',
//     tag: sortBy === 'SalesRank' ? 'Bestseller' : 'New',
//   }));
//
//   // ── Cache in KV for 1 hour to stay under PA-API rate limits ──
//   if (env.CONTENT_KV) {
//     ctx.waitUntil(env.CONTENT_KV.put(cacheKeyFull, JSON.stringify(items), { expirationTtl: 3600 }));
//   }
//
//   return items;
// }

// ─── Spotify Web API ───
// Requires: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET secrets
// Docs: https://developer.spotify.com/documentation/web-api
//
// async function fetchSpotifyTracks(opts) {
//   const { env, ctx, search, maxResults, cacheKey } = opts;
//   const cacheKeyFull = `spotify:${cacheKey}`;
//
//   if (env.CONTENT_KV) {
//     const cached = await env.CONTENT_KV.get(cacheKeyFull, 'json');
//     if (cached) return cached;
//   }
//
//   // ── Client Credentials flow for app-only access ──
//   const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//     body: `grant_type=client_credentials&client_id=${env.SPOTIFY_CLIENT_ID}&client_secret=${env.SPOTIFY_CLIENT_SECRET}`,
//   });
//   const { access_token } = await tokenResp.json();
//
//   // ── Search tracks ──
//   const searchResp = await fetch(
//     `https://api.spotify.com/v1/search?q=${encodeURIComponent(search)}&type=track&limit=${maxResults}`, {
//       headers: { 'Authorization': `Bearer ${access_token}` },
//     }
//   );
//   const searchData = await searchResp.json();
//   const items = (searchData.tracks?.items || []).map(track => ({
//     title: track.name,
//     desc: track.artists.map(a => a.name).join(', '),
//     price: 'Stream',
//     link: track.external_urls?.spotify || '#',
//     tag: 'Trending',
//   }));
//
//   if (env.CONTENT_KV) {
//     ctx.waitUntil(env.CONTENT_KV.put(cacheKeyFull, JSON.stringify(items), { expirationTtl: 3600 }));
//   }
//
//   return items;
// }

// ─── PodcastIndex API ───
// Requires: PODCASTINDEX_API_KEY, PODCASTINDEX_API_SECRET secrets
// Docs: https://podcastindex-org.github.io/docs-api/
//
// async function fetchPodcastIndexShows(opts) {
//   const { env, ctx, search, maxResults, cacheKey } = opts;
//   const cacheKeyFull = `podcast:${cacheKey}`;
//
//   if (env.CONTENT_KV) {
//     const cached = await env.CONTENT_KV.get(cacheKeyFull, 'json');
//     if (cached) return cached;
//   }
//
//   // ── PodcastIndex auth: API-Key + Auth-Date + SHA-1 hash ──
//   const authDate = Math.floor(Date.now() / 1000).toString();
//   const authHash = await crypto.subtle.digest('SHA-1',
//     new TextEncoder().encode(env.PODCASTINDEX_API_KEY + env.PODCASTINDEX_API_SECRET + authDate));
//   const authHashHex = [...new Uint8Array(authHash)].map(b => b.toString(16).padStart(2, '0')).join('');
//
//   const resp = await fetch(
//     `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(search)}&max=${maxResults}`, {
//       headers: {
//         'X-Auth-Date': authDate,
//         'X-Auth-Key': env.PODCASTINDEX_API_KEY,
//         'Authorization': authHashHex,
//         'User-Agent': 'hattenhauer.net',
//       },
//     }
//   );
//   const data = await resp.json();
//   const items = (data.feeds || []).map(feed => ({
//     title: feed.title,
//     desc: feed.description || '',
//     price: 'Free',
//     link: feed.url || '#',
//     tag: 'Podcast',
//   }));
//
//   if (env.CONTENT_KV) {
//     ctx.waitUntil(env.CONTENT_KV.put(cacheKeyFull, JSON.stringify(items), { expirationTtl: 3600 }));
//   }
//
//   return items;
// }

// ─── Eventbrite API ───
// Requires: EVENTBRITE_API_KEY secret
// Docs: https://www.eventbrite.com/platform/api
//
// async function fetchLocalEvents(opts) {
//   const { env, ctx, geo, lat, lon, radius, maxResults, cacheKey } = opts;
//   const cacheKeyFull = `events:${cacheKey}`;
//
//   if (env.CONTENT_KV) {
//     const cached = await env.CONTENT_KV.get(cacheKeyFull, 'json');
//     if (cached) return cached;
//   }
//
//   // ── Search events by lat/lon within radius ──
//   const resp = await fetch(
//     `https://www.eventbriteapi.com/v3/events/search/` +
//     `?location.latitude=${lat}&location.longitude=${lon}` +
//     `&location.within=${radius}mi&sort_by=date&per_page=${maxResults}`, {
//       headers: { 'Authorization': `Bearer ${env.EVENTBRITE_API_KEY}` },
//     }
//   );
//   const data = await resp.json();
//   const items = (data.events || []).map(ev => ({
//     title: ev.name?.text || 'Untitled',
//     desc: ev.summary || '',
//     price: ev.is_free ? 'Free' : (ev.ticket_classes?.[0]?.cost?.display || 'See details'),
//     link: ev.url || '#',
//     tag: ev.start?.local ? new Date(ev.start.local).toLocaleDateString() : '',
//   }));
//
//   if (env.CONTENT_KV) {
//     ctx.waitUntil(env.CONTENT_KV.put(cacheKeyFull, JSON.stringify(items), { expirationTtl: 3600 }));
//   }
//
//   return items;
// }
*/

// ═══════════════════════════════════════════════════════════════
// AUTO-TRANSLATION via Workers AI
// Model: @cf/meta/llama-3.2-3b-instruct (multilingual, 80k context)
// The viewer's Accept-Language header determines the target language.
// All UI strings + item titles/descriptions are translated in one call.
// Falls back to English silently on any error.
// ═══════════════════════════════════════════════════════════════

async function translateContent(AI, uiStrings, sections, targetLangName) {
  // Combine all translatable text into a single payload for one AI call
  const payload = {
    ui: uiStrings,
    sections: sections.map(s => ({
      id: s.id,
      items: s.items.map(item => ({
        title: item.title,
        desc: item.desc,
        tag: item.tag,
      })),
    })),
  };

  const prompt = 'Translate all text values in this JSON from English to ' + targetLangName +
    '. Keep all keys and structure unchanged. Return ONLY valid JSON, no markdown fences, no explanation.\n\n' +
    JSON.stringify(payload);

  const response = await AI.run('@cf/meta/llama-3.2-3b-instruct', {
    messages: [
      { role: 'system', content: 'You are a precise translator. You receive JSON and return the same JSON with all text values translated. You never change keys or structure. You output only valid JSON.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 4000,
  });

  const text = response.response || '';
  // Extract JSON from response (handles markdown fences or raw JSON)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in AI response');

  const translated = JSON.parse(jsonMatch[0]);

  // Merge translated text back into sections (preserve links, prices, non-translated fields)
  const translatedSections = sections.map((s, i) => {
    const tSection = translated.sections?.[i];
    if (!tSection) return s;
    return {
      id: s.id,
      items: s.items.map((item, j) => {
        const tItem = tSection.items?.[j];
        if (!tItem) return item;
        return {
          ...item,
          title: tItem.title || item.title,
          desc: tItem.desc || item.desc,
          tag: tItem.tag || item.tag,
        };
      }),
    };
  });

  return { ui: translated.ui || uiStrings, sections: translatedSections };
}

// ═══════════════════════════════════════════════════════════════
// ADS PAGE HTML RENDERING
// ═══════════════════════════════════════════════════════════════

function adsPageHTML(strings, sections, geo, viewerLang, langName, translated) {
  const year = new Date().getFullYear();
  const locationStr = [geo.city, geo.region, geo.country].filter(Boolean).join(', ');

  const sectionMap = {
    family:   { title: strings.sectionFamily,   desc: strings.sectionFamilyDesc,   icon: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}' },
    health:   { title: strings.sectionHealth,    desc: strings.sectionHealthDesc,    icon: '\u{1F33F}' },
    biblical: { title: strings.sectionBiblical,  desc: strings.sectionBiblicalDesc,  icon: '\u{1F4D6}' },
    music:    { title: strings.sectionMusic,     desc: strings.sectionMusicDesc,     icon: '\u{1F3B5}' },
    podcasts: { title: strings.sectionPodcasts,  desc: strings.sectionPodcastsDesc,  icon: '\u{1F3A4}' },
    events:   { title: strings.sectionEvents,    desc: strings.sectionEventsDesc,    icon: '\u{1F4CD}' },
  };

  const sectionsHTML = sections.map(section => {
    const meta = sectionMap[section.id] || { title: section.id, desc: '', icon: '\u{1F4CC}' };
    const itemsHTML = section.items.length > 0
      ? section.items.map(item =>
        '<div class="product-card">' +
          '<div class="product-tag">' + (item.tag || '') + '</div>' +
          '<h3>' + item.title + '</h3>' +
          '<p>' + item.desc + '</p>' +
          '<div class="product-footer">' +
            '<span class="product-price">' + (item.price || '') + '</span>' +
            '<a href="' + (item.link || '#') + '" class="product-link" rel="nofollow sponsored noopener">' + strings.viewMore + ' \u2192</a>' +
          '</div>' +
        '</div>'
      ).join('')
      : '<p class="no-events">' + strings.noEvents + '</p>';

    return (
      '<section class="content-section" id="' + section.id + '">' +
        '<div class="section-header">' +
          '<span class="section-icon">' + meta.icon + '</span>' +
          '<div><h2>' + meta.title + '</h2><p>' + meta.desc + '</p></div>' +
        '</div>' +
        '<div class="product-grid">' + itemsHTML + '</div>' +
      '</section>'
    );
  }).join('');

  return (
    '<nav class="ads-nav">' +
      '<a href="/" class="nav-home">\u2190 ' + strings.backHome + '</a>' +
      '<span class="nav-brand">Hattenhauer</span>' +
    '</nav>' +
    '<header class="ads-hero">' +
      '<h1>' + strings.pageTitle + '</h1>' +
      '<p>' + strings.pageSubtitle + '</p>' +
      '<div class="geo-badge">\u{1F4CD} ' + strings.detectedLocation + ': <strong>' + locationStr + '</strong>' +
        (geo.latitude ? ' (' + geo.latitude + ', ' + geo.longitude + ')' : '') +
      '</div>' +
      '<div class="lang-badge">\u{1F310} ' + strings.detectedLanguage + ': <strong>' + langName + '</strong>' +
        (translated ? '<span class="translated-note"> \u2014 ' + strings.autoTranslated + '</span>' : '') +
      '</div>' +
    '</header>' +
    '<div class="ads-note">\u2139\uFE0F ' + strings.loadingNote + '</div>' +
    sectionsHTML +
    '<footer class="ads-footer">' +
      '<p>&copy; ' + year + ' William Hattenhauer. All rights reserved.</p>' +
      '<p><a href="/">hattenhauer.net</a></p>' +
    '</footer>'
  );
}

// ─── Ads page HTML wrapper with its own CSS ───

function adsHtml(content) {
  const page = '<!DOCTYPE html>' +
  '<html lang="en">' +
  '<head>' +
  '<meta charset="UTF-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
  '<title>Hattenhauer — Discover & Shop</title>' +
  '<meta name="description" content="Context-driven recommendations for family, health, faith, music, podcasts, and local events">' +
  '<meta name="robots" content="noindex, follow">' +
  '<style>' +
  ':root{--teal:#40E0D0;--teal-dark:#20B2AA;--bg-dark:#0a0a0f;--bg-card:rgba(255,255,255,0.03);--text:#e4e4e7;--text-muted:#a1a1aa;--border:rgba(255,255,255,0.08);--tag-bg:rgba(64,224,208,0.12)}' +
  '*{margin:0;padding:0;box-sizing:border-box}' +
  'html{scroll-behavior:smooth}' +
  'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:var(--bg-dark);color:var(--text);line-height:1.6;min-height:100vh}' +
  // Nav
  '.ads-nav{display:flex;justify-content:space-between;align-items:center;padding:1rem 2rem;border-bottom:1px solid var(--border);position:sticky;top:0;background:rgba(10,10,15,0.85);backdrop-filter:blur(12px);z-index:100}' +
  '.nav-home{color:var(--teal);text-decoration:none;font-size:0.9rem;transition:opacity 0.2s}' +
  '.nav-home:hover{opacity:0.7}' +
  '.nav-brand{font-weight:700;font-size:1.1rem;background:linear-gradient(135deg,var(--teal) 0%,#7dd3fc 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}' +
  // Hero
  '.ads-hero{text-align:center;padding:3rem 2rem 2rem;max-width:900px;margin:0 auto}' +
  '.ads-hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;letter-spacing:-0.02em;margin-bottom:0.75rem;background:linear-gradient(135deg,var(--teal) 0%,#7dd3fc 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}' +
  '.ads-hero p{color:var(--text-muted);font-size:1.1rem;max-width:560px;margin:0 auto 1.5rem}' +
  '.geo-badge,.lang-badge{display:inline-block;padding:0.5rem 1.25rem;border-radius:8px;font-size:0.9rem;margin:0.25rem}' +
  '.geo-badge{background:var(--bg-card);border:1px solid var(--border)}' +
  '.lang-badge{background:var(--bg-card);border:1px solid var(--border)}' +
  '.geo-badge strong,.lang-badge strong{color:var(--teal)}' +
  '.translated-note{color:var(--text-muted);font-size:0.85rem}' +
  // Note
  '.ads-note{text-align:center;padding:0.75rem 2rem;color:var(--text-muted);font-size:0.85rem;background:rgba(64,224,208,0.04);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}' +
  // Sections
  '.content-section{padding:3rem 2rem;max-width:1200px;margin:0 auto}' +
  '.section-header{display:flex;align-items:flex-start;gap:1rem;margin-bottom:2rem}' +
  '.section-icon{font-size:2rem;flex-shrink:0}' +
  '.section-header h2{font-size:1.5rem;font-weight:700;margin-bottom:0.25rem}' +
  '.section-header h2{color:var(--text)}' +
  '.section-header p{color:var(--text-muted);font-size:0.95rem}' +
  // Product grid
  '.product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.5rem}' +
  '.product-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:1.5rem;transition:all 0.2s ease;display:flex;flex-direction:column}' +
  '.product-card:hover{border-color:rgba(64,224,208,0.2);transform:translateY(-3px)}' +
  '.product-tag{display:inline-block;padding:0.25rem 0.75rem;border-radius:6px;font-size:0.75rem;font-weight:600;background:var(--tag-bg);color:var(--teal);margin-bottom:0.75rem;align-self:flex-start}' +
  '.product-card h3{font-size:1.05rem;font-weight:600;margin-bottom:0.5rem;color:var(--text)}' +
  '.product-card p{color:var(--text-muted);font-size:0.9rem;flex-grow:1;margin-bottom:1rem}' +
  '.product-footer{display:flex;justify-content:space-between;align-items:center;margin-top:auto}' +
  '.product-price{font-weight:700;color:var(--teal);font-size:1rem}' +
  '.product-link{color:var(--text-muted);text-decoration:none;font-size:0.85rem;transition:color 0.2s}' +
  '.product-link:hover{color:var(--teal)}' +
  '.no-events{color:var(--text-muted);font-style:italic;padding:1rem 0}' +
  // Footer
  '.ads-footer{text-align:center;padding:3rem 2rem;border-top:1px solid var(--border);color:var(--text-muted);font-size:0.9rem}' +
  '.ads-footer a{color:var(--teal);text-decoration:none}' +
  '.ads-footer a:hover{text-decoration:underline}' +
  '@media(max-width:640px){.ads-nav{padding:0.75rem 1rem}.ads-hero{padding:2rem 1rem 1rem}.content-section{padding:2rem 1rem}.section-header{flex-direction:column;gap:0.5rem}}' +
  '</style>' +
  '</head>' +
  '<body>' + content + '</body>' +
  '</html>';

  return new Response(page, {
    status: 200,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// EXISTING HELPER FUNCTIONS (unchanged)
// ═══════════════════════════════════════════════════════════════

function json(data, status) {
  status = status || 200;
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    }
  });
}

function html(content, status) {
  status = status || 200;
  const year = new Date().getFullYear();
  const page = '<!DOCTYPE html>' +
  '<html lang="en">' +
  '<head>' +
  '<meta charset="UTF-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
  '<title>Hattenhauer</title>' +
  '<meta name="description" content="Hattenhauer - Professional services and consulting">' +
  '<style>' +
  ':root{--teal:#40E0D0;--teal-dark:#20B2AA;--bg-dark:#0a0a0f;--bg-card:rgba(255,255,255,0.03);--text:#e4e4e7;--text-muted:#a1a1aa;--border:rgba(255,255,255,0.08)}' +
  '*{margin:0;padding:0;box-sizing:border-box}' +
  'html{scroll-behavior:smooth}' +
  'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:var(--bg-dark);color:var(--text);line-height:1.6;min-height:100vh}' +
  '.hero{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;background:linear-gradient(180deg,rgba(10,10,15,0.3) 0%,var(--bg-dark) 100%),url(/nasa-bg.jpg) center/cover no-repeat fixed}' +
  '.hero::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 0%,var(--bg-dark) 90%);pointer-events:none}' +
  '.hero-content{position:relative;z-index:1;max-width:800px}' +
  '.hero h1{font-size:clamp(2.5rem,6vw,4.5rem);font-weight:800;letter-spacing:-0.02em;margin-bottom:1rem;background:linear-gradient(135deg,var(--teal) 0%,#7dd3fc 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}' +
  '.hero p{font-size:clamp(1.1rem,2.5vw,1.35rem);color:var(--text-muted);max-width:560px;margin:0 auto 2.5rem}' +
  '.btn{display:inline-flex;align-items:center;gap:0.5rem;padding:0.875rem 2rem;border-radius:8px;font-size:1rem;font-weight:600;text-decoration:none;transition:all 0.2s ease;cursor:pointer;border:none}' +
  '.btn-primary{background:linear-gradient(135deg,var(--teal) 0%,var(--teal-dark) 100%);color:#0a0a0f}' +
  '.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(64,224,208,0.25)}' +
  '.btn-outline{background:transparent;color:var(--teal);border:1.5px solid var(--teal);margin-left:0.75rem}' +
  '.btn-outline:hover{background:var(--teal);color:#0a0a0f}' +
  '.actions{display:flex;flex-wrap:wrap;gap:0.75rem;justify-content:center}' +
  '.section{padding:5rem 2rem;max-width:1100px;margin:0 auto}' +
  '.section h2{font-size:2rem;font-weight:700;margin-bottom:1rem;text-align:center}' +
  '.section h2 span{color:var(--teal)}' +
  '.section>p{text-align:center;color:var(--text-muted);max-width:600px;margin:0 auto 3rem}' +
  '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.5rem}' +
  '.card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:2rem;transition:all 0.2s ease}' +
  '.card:hover{border-color:rgba(64,224,208,0.2);transform:translateY(-3px)}' +
  '.card h3{font-size:1.15rem;font-weight:600;margin-bottom:0.5rem;color:var(--teal)}' +
  '.card p{color:var(--text-muted);font-size:0.95rem}' +
  '.footer{text-align:center;padding:3rem 2rem;border-top:1px solid var(--border);color:var(--text-muted);font-size:0.9rem}' +
  '.footer a{color:var(--teal);text-decoration:none}' +
  '.footer a:hover{text-decoration:underline}' +
  '@media(max-width:480px){.btn-outline{margin-left:0}}' +
  '</style>' +
  '</head>' +
  '<body>' + content +
  '</body>' +
  '</html>';

  return new Response(page, {
    status: status,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    }
  });
}

function landingPage() {
  const year = new Date().getFullYear();
  return '' +
  '<section class="hero">' +
  '<div class="hero-content">' +
  '<h1>Hattenhauer</h1>' +
  '<p>Professional services, strategic consulting, and technical solutions for modern businesses.</p>' +
  '<div class="actions">' +
  '<a href="mailto:contact@hattenhauer.net" class="btn btn-primary">Get in Touch</a>' +
  '<a href="#services" class="btn btn-outline">Learn More</a>' +
  '</div>' +
  '</div>' +
  '</section>' +
  '<section class="section" id="services">' +
  '<h2>What We <span>Do</span></h2>' +
  '<p>Focused expertise across strategy, technology, and operations to drive measurable outcomes.</p>' +
  '<div class="grid">' +
  '<div class="card">' +
  '<h3>Strategy</h3>' +
  '<p>Business planning, market analysis, and growth roadmaps tailored to your goals.</p>' +
  '</div>' +
  '<div class="card">' +
  '<h3>Technology</h3>' +
  '<p>Cloud architecture, system design, and digital transformation at scale.</p>' +
  '</div>' +
  '<div class="card">' +
  '<h3>Operations</h3>' +
  '<p>Process optimization, automation, and operational excellence programs.</p>' +
  '</div>' +
  '<div class="card">' +
  '<h3>Resources</h3>' +
  '<a href="https://hattenhauer.net/a" class="btn btn-outline">Excellent Resources & Programs.</a>' +
  '</div>' +
  '</div>' +
  '</section>' +
  '<section class="section">' +
  '<h2>Get <span>Started</span></h2>' +
  '<p>Ready to move forward? Reach out and let us discuss your next project.</p>' +
  '<div class="actions" style="margin-top:2rem">' +
  '<a href="mailto:contact@hattenhauer.net" class="btn btn-primary">Contact Us</a>' +
  '</div>' +
  '</section>' +
  '<footer class="footer">' +
  '<p>&copy; ' + year + ' William Hattenhauer. All rights reserved.</p>' +
  '<p style="margin-top:0.5rem"><a href="mailto:contact@hattenhauer.net">contact@hattenhauer.net</a></p>' +
  '</footer>';
}
