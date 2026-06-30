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
