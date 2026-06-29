export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/nasa-bg.jpg') {
      const imageResponse = await fetch('https://images-assets.nasa.gov/image/art002e014066/art002e014066~large.jpg', {
        cf: { cacheEverything: true, cacheTtl: 31536000 }
      });
      return new Response(imageResponse.body, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        }
      });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>hattenhauer-maintenance</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
body {
  display: flex;
  align-items: center;
  justify-content: center;
  background: url('/nasa-bg.jpg') center/cover no-repeat;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.overlay {
  background: rgba(0, 0, 0, 0.45);
  padding: 3rem 4rem;
  border-radius: 12px;
  text-align: center;
  backdrop-filter: blur(4px);
}
h1 {
  color: #40E0D0;
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 8px rgba(0,0,0,0.6);
}
p {
  color: #20B2AA;
  font-size: 1.25rem;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}
</style>
</head>
<body>
<div class="overlay">
  <h1>hattenhauer-maintenance</h1>
  <p>Worker is online</p>
</div>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
};
