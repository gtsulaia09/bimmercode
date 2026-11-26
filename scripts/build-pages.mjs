#!/usr/bin/env node
// Static demo for GitHub Pages: https://gtsulaia09.github.io/bimmercode/
//
// The production site runs on Cloudflare Pages with Functions, D1 and R2. GitHub Pages serves static files only, so
// this script builds a static copy into _site/:
//   - the site's own files, with root paths ("/code/…", "/js/…") moved under the base path (BASE, default /bimmercode);
//   - one small JSON file per trouble code (data/code/<ID>.json) from data/codes.json and data/data.json;
//   - 404.html, which renders /code/<ID> in the browser with the same renderPage() as functions/code/[id].js;
//   - js/demo-shim.js on every page: calls to /api answer "not available in the demo" (forum, sign-in, AI assistant,
//     admin need the server), and a short banner says so.
// Usage: node scripts/build-pages.mjs   (BASE=/ for a local check at the site root)
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, '_site');
const BASE = (process.env.BASE ?? '/bimmercode').replace(/\/+$/, '');

// What is published: the site itself, never Functions, migrations, local secrets or tooling.
const SKIP = new Set([
  '.git', '.github', '.cursor', '_site', 'node_modules', 'functions', 'migrations', 'scratch', 'docs', 'scripts',
  '.dev.vars', '.dev.vars.example', '.gitignore', 'package.json', 'package-lock.json', 'wrangler.toml', '_redirects',
  'README.md', 'sw.js',
]);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const name of readdirSync(ROOT)) {
  if (SKIP.has(name) || name.startsWith('.')) continue;
  cpSync(join(ROOT, name), join(OUT, name), { recursive: true });
}

// Root paths → under BASE. Only paths of this site: links, scripts, styles, data, pages. /api stays as is (the shim
// answers it), protocol-relative "//host" and absolute URLs are untouched.
const PAGES = 'forum|topic|admin|profile|parts|js/|css/|data/|code|vin|assets/|index|contact|privacy|terms|all|site\\.webmanifest|\\?search|\\?code';
// The pages also load their own styles and scripts by full production URL (https://bimmercodes.net/css/…): those, and
// links people click (<a href>), point at the demo; canonical/hreflang/Open Graph tags keep the production address.
const SITE = 'https://bimmercodes.net/';
const ASSETS = /\b(href|src)=(["'])https:\/\/bimmercodes\.net\/(?=css\/|js\/|assets\/|site\.webmanifest|favicon|apple-touch)/g;
const rebase = (text) =>
  text
    // Root paths first, then the full production URLs (so nothing gets the base path twice).
    .replace(/\b(href|src|action|content|data-src)=(["'])\/(?!\/)/g, `$1=$2${BASE}/`)
    .replace(new RegExp(`(["'\`])\\/(${PAGES})`, 'g'), `$1${BASE}/$2`)
    .replace(/url\((["']?)\/(?!\/)/g, `url($1${BASE}/`)
    // <base href="https://bimmercodes.net/"> would send every relative path to production.
    .replace(/<base\s+href=(["'])https:\/\/bimmercodes\.net\/\1/gi, `<base href=$1${BASE}/$1`)
    .replace(ASSETS, `$1=$2${BASE}/`)
    .replace(/<a\b[^>]*>/g, (tag) => tag.split(`href="${SITE}`).join(`href="${BASE}/`));

const SHIM = `<script src="${BASE}/js/demo-shim.js"></script>`;
// Files that already build their URLs from their own location (document.currentScript): left as they are.
const AS_IS = new Set([join(OUT, 'js', 'ai-chat-loader.js')]);
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (p !== join(OUT, 'data')) walk(p);
      continue;
    }
    const ext = extname(name);
    if (!['.html', '.js', '.css', '.webmanifest'].includes(ext) || AS_IS.has(p)) continue;
    let text = rebase(readFileSync(p, 'utf8'));
    if (ext === '.webmanifest') text = text.replace(/(":\s*")\/(?!\/)/g, `$1${BASE}/`);
    if (ext === '.html') text = text.replace(/<head[^>]*>/i, (m) => `${m}\n  ${SHIM}`);
    writeFileSync(p, text);
  }
}
walk(OUT);

// One file per code, in the order functions/code/[id].js looks them up (codes.json first).
const codeDir = join(OUT, 'data', 'code');
mkdirSync(codeDir, { recursive: true });
let written = 0;
for (const file of ['codes.json', 'data.json']) {
  for (const code of JSON.parse(readFileSync(join(ROOT, 'data', file), 'utf8')).codes) {
    const id = String(code.code).toUpperCase();
    const target = join(codeDir, `${encodeURIComponent(id)}.json`);
    if (existsSync(target)) continue;
    writeFileSync(target, JSON.stringify(code));
    written++;
  }
}

// The code page renderer, as a browser module.
writeFileSync(
  join(OUT, 'js', 'code-page.js'),
  `${readFileSync(join(ROOT, 'functions', 'code', '[id].js'), 'utf8')}\nexport { renderPage, renderNotFound };\n`,
);

writeFileSync(
  join(OUT, 'js', 'demo-shim.js'),
  `// GitHub Pages demo (scripts/build-pages.mjs): no server here.
(function () {
  var BASE = ${JSON.stringify(BASE)};
  var MESSAGE = "This feature needs the server and is off in the GitHub Pages demo.";
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var path = new URL(url, location.href);
    if (path.origin === location.origin && /\\/api(\\/|$)/.test(path.pathname)) {
      return Promise.resolve(new Response(JSON.stringify({ error: MESSAGE, success: false }), {
        status: 503, headers: { "Content-Type": "application/json" }
      }));
    }
    return realFetch(input, init);
  };
  if (navigator.serviceWorker) navigator.serviceWorker.register = function () { return Promise.resolve(); };
  document.addEventListener("DOMContentLoaded", function () {
    var bar = document.createElement("div");
    bar.setAttribute("role", "note");
    bar.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:99999;max-width:360px;padding:10px 14px;border-radius:10px;" +
      "background:rgba(17,24,39,.92);color:#e5e7eb;font:13px/1.45 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3)";
    bar.innerHTML = "<strong>Demo on GitHub Pages.</strong> Code search and code pages work; forum, sign-in, AI assistant and admin need the server and are off. " +
      "<a href='#' style='color:#93c5fd'>Hide</a>";
    bar.querySelector("a").addEventListener("click", function (e) { e.preventDefault(); bar.remove(); });
    document.body.appendChild(bar);
  });
})();
`,
);

writeFileSync(
  join(OUT, '404.html'),
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BimmerCodes</title>
  <style>body{background:#0b0f17;color:#e5e7eb;font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0}a{color:#93c5fd}</style>
</head>
<body>
  <p id="msg">Loading…</p>
  <script type="module">
    const BASE = ${JSON.stringify(BASE)};
    const LANGS = ["en", "ru", "ka"];
    const m = location.pathname.match(/\\/code\\/([^/]+)\\/?$/);
    if (!m) {
      document.getElementById("msg").innerHTML = 'Page not found. <a href="' + BASE + '/">Back to BimmerCodes</a>';
    } else {
      const id = decodeURIComponent(m[1]).toUpperCase();
      let saved = null;
      try { saved = localStorage.getItem("language"); } catch (_) {}
      const q = new URLSearchParams(location.search).get("lang");
      const lang = LANGS.includes(q) ? q : LANGS.includes(saved) ? saved : "en";
      const { renderPage, renderNotFound } = await import(BASE + "/js/code-page.js");
      let code = null;
      try {
        const res = await fetch(BASE + "/data/code/" + encodeURIComponent(id) + ".json");
        if (res.ok) code = await res.json();
      } catch (_) {}
      const html = (code ? renderPage(code, lang) : renderNotFound(id, lang))
        .replace(/\\b(href|src|action|content)=(["'])\\/(?!\\/)/g, "$1=$2" + BASE + "/")
        .replace(/<head[^>]*>/i, (h) => h + '<script src="' + BASE + '/js/demo-shim.js"><\\/script>');
      document.open();
      document.write(html);
      document.close();
    }
  </script>
</body>
</html>
`,
);

console.log(`built _site/ for ${BASE || '/'}: ${written} code files`);
