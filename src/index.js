export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

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

      return html(landingPage());

    } catch (err) {
      return html('<h1 style="color:#ff6b6b">Error</h1><p style="color:#fff">' + err.message + '</p>', 500);
    }
  }
};

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
  '<title>Hattenhauer,Net</title>' +
  '<meta name="description" content="Hattenhauer - Professional services and consulting">' +
  '<style>' +
  ':root{--teal:#40E0D0;--teal-dark:#20B2AA;--bg-dark:#0a0a0f;--bg-card:rgba(255,255,255,0.03);--text:#e4e4e7;--text-muted:#a1a1aa;--border:rgba(255,255,255,0.08)}' +
  '*{margin:0;padding:0;box-sizing:border-box}' +
  'html{scroll-behavior:smooth}' +
  'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:var(--bg-dark);color:var(--text);line-height:1.6;min-height:100vh}' +
  '.hero{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;background:linear-gradient(180deg,rgba(10,10,15,0.3) 0%,var(--bg-dark) 100%),url(/nasa-bg.jpg) center/cover no-repeat fixed}' +
  '.hero::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 0%,var(--bg-dark) 90%);pointer-events:none}' +
  '.hero-content{position:relative;z-index:1;max-width:800px}' +
  '.hero h1{font-size:clamp(2.5rem,6vw,4.5rem);font-weight:800;letter-spacing:-0.02em;margin-bottom:1rem;background:linear-gradient(135deg,var(--teal) 0%,#7dd3fc 100%);-webkit-background-clip:text[...];}' +
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
