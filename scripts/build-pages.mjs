#!/usr/bin/env node
// Static build for GitHub Pages: https://gtsulaia09.github.io/bimmercode/
//
// Builds _site/ with:
//   - all public assets rebased cleanly under BASE (default /bimmercode);
//   - per-code static JSON files (data/code/<ID>.json) + 404.html client-side SSR fallback for /code/<ID>;
//   - js/demo-shim.js: a full localStorage-persisted serverless API adapter so Registration, Sign In,
//     Password Recovery, AI Diagnostic Assistant, Forum Discussions, Replies, Reactions, Profile & Personal
//     BMW Garage, OEM Parts Finder, Contact Forms, and Admin Console work 100% interactively even on GitHub Pages.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, '_site');
const BASE = (process.env.BASE ?? '/bimmercode').replace(/\/+$/, '');

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

const PAGES = 'forum|topic|admin|profile|parts|js/|css/|data/|code|vin|assets/|index|contact|privacy|terms|all|site\\.webmanifest|\\?search|\\?code';
const SITE = 'https://bimmercodes.net/';
const ASSETS = /\b(href|src)=(["'])https:\/\/bimmercodes\.net\/(?=css\/|js\/|assets\/|site\.webmanifest|favicon|apple-touch)/g;
const rebase = (text) =>
  text
    .replace(/\b(href|src|action|content|data-src)=(["'])\/(?!\/)/g, `$1=$2${BASE}/`)
    .replace(new RegExp(`(["'\`])\\/(${PAGES})`, 'g'), `$1${BASE}/$2`)
    .replace(/url\((["']?)\/(?!\/)/g, `url($1${BASE}/`)
    .replace(/<base\s+href=(["'])https:\/\/bimmercodes\.net\/\1/gi, `<base href=$1${BASE}/$1`)
    .replace(ASSETS, `$1=$2${BASE}/`)
    .replace(/<a\b[^>]*>/g, (tag) => tag.split(`href="${SITE}`).join(`href="${BASE}/`));

const SHIM = `<script src="${BASE}/js/demo-shim.js"></script>`;
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

writeFileSync(
  join(OUT, 'js', 'code-page.js'),
  `${readFileSync(join(ROOT, 'functions', 'code', '[id].js'), 'utf8')}\nexport { renderPage, renderNotFound };\n`,
);

writeFileSync(
  join(OUT, 'js', 'demo-shim.js'),
  `// GitHub Pages localStorage-backed serverless API runtime (scripts/build-pages.mjs)
(function () {
  "use strict";
  var BASE = ${JSON.stringify(BASE)};
  var STORE_KEY = "bc_ghpages_db_v1";
  var realFetch = window.fetch.bind(window);

  if (navigator.serviceWorker) {
    navigator.serviceWorker.register = function () { return Promise.resolve(); };
  }

  function b64url(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
  }

  function makeJwt(user) {
    var now = Math.floor(Date.now() / 1000);
    return b64url({ alg: "HS256", typ: "JWT" }) + "." +
           b64url({ id: user.id, username: user.username, role: user.role_id || "user_role", iat: now, exp: now + 86400 * 30 }) +
           ".ghpages_sig";
  }

  function parseJwtUid(headers) {
    try {
      var auth = "";
      if (headers && typeof headers.get === "function") auth = headers.get("Authorization") || "";
      else if (headers) auth = headers.Authorization || headers.authorization || "";
      if (!auth || auth.indexOf("Bearer ") !== 0) return null;
      var parts = auth.slice(7).split(".");
      if (parts.length < 2) return null;
      var json = decodeURIComponent(escape(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))));
      return JSON.parse(json).id || null;
    } catch (_) {
      return null;
    }
  }

  function loadDb() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    var seeded = {
      users: [
        {
          id: "u_lukas",
          username: "m54_lukas",
          email: "lukas@bimmercodes.net",
          pw: "Bimmer2026",
          sec_q: "first_car",
          sec_a: "e46",
          bio: "Munich Specialist · ISTA / E-Sys / N55 & B58 Diagnostics",
          car_model: "BMW F30 335i",
          bmw_year: 2015,
          bmw_body: "F30",
          bmw_engine: "N55",
          city: "Munich",
          country: "Germany",
          preferred_lang: "en",
          avatar_url: "",
          role_id: "super_admin_role",
          role: "super_admin_role",
          reputation: 640,
          created_at: "2026-02-14T10:00:00Z"
        },
        {
          id: "u_giorgi",
          username: "b58_giorgi",
          email: "giorgi@bimmercodes.net",
          pw: "Bimmer2026",
          sec_q: "city_born",
          sec_a: "tbilisi",
          bio: "BMW Powertrain & Coding Technician",
          car_model: "BMW G20 M340i",
          bmw_year: 2021,
          bmw_body: "G20",
          bmw_engine: "B58",
          city: "Tbilisi",
          country: "Georgia",
          preferred_lang: "ka",
          avatar_url: "",
          role_id: "moderator_role",
          role: "moderator_role",
          reputation: 390,
          created_at: "2026-02-16T12:00:00Z"
        }
      ],
      topics: [
        {
          id: "t_118001_f30",
          user_id: "u_lukas",
          username: "m54_lukas",
          category: "diagnostics",
          title: "F30 335i N55 — 118001 Mixture too lean on cold start (+18% STFT)",
          content: "Seeing **118001** (Mixture control: Fuel-air mixture too lean) on my 2015 F30 335i (N55, EWG) during the first 90 seconds of cold start.\\n\\n- Idle STFT: **+17.8%**, drops to **+2.5%** above 2,200 RPM\\n- Smoke-tested the chargepipe and found a hairline split under the throttle-body O-ring.",
          related_code: "118001",
          lang: "en",
          tags: ["f30", "n55", "118001", "fuel-trim"],
          views: 148,
          reply_count: 1,
          is_solved: 1,
          is_pinned: 1,
          is_locked: 0,
          last_reply_at: "2026-03-10T14:20:00Z",
          last_reply_username: "b58_giorgi",
          created_at: "2026-03-09T09:15:00Z"
        },
        {
          id: "t_2a82_e90",
          user_id: "u_giorgi",
          username: "b58_giorgi",
          category: "engine-drivetrain",
          title: "E90 N52 — 2A82 VANOS intake solenoid jamming after oil service",
          content: "If anyone gets **2A82** right after an oil change on an N52/N53: inspect the oil filter housing cap first to verify the center plastic cage and lower Viton O-ring were not discarded with the old filter.",
          related_code: "2A82",
          lang: "en",
          tags: ["e90", "n52", "2a82", "vanos"],
          views: 96,
          reply_count: 0,
          is_solved: 0,
          is_pinned: 0,
          is_locked: 0,
          last_reply_at: null,
          last_reply_username: null,
          created_at: "2026-03-11T11:30:00Z"
        }
      ],
      posts: [
        {
          id: "p_seed_1",
          topic_id: "t_118001_f30",
          user_id: "u_giorgi",
          username: "b58_giorgi",
          content: "Confirmed — replacing the OEM plastic chargepipe with an aluminum pipe and fresh Viton O-ring resolves **118001** when trims normalize under load. Reset DME mixture adaptations in ISTA afterwards.",
          is_solution: 1,
          is_pinned: 0,
          reply_to_post_id: null,
          created_at: "2026-03-10T14:20:00Z"
        }
      ],
      reactions: [],
      messages: [],
      recovery: {}
    };
    saveDb(seeded);
    return seeded;
  }

  function saveDb(db) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (_) {}
  }

  function jsonRes(obj, status) {
    return Promise.resolve(new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    }));
  }

  function pubUser(u) {
    var copy = Object.assign({}, u);
    delete copy.pw;
    delete copy.sec_a;
    return copy;
  }

  function checkPw(pw) {
    var errs = [];
    if (!pw || pw.length < 8) errs.push("Password must be at least 8 characters long");
    if (pw && !/[A-Z]/.test(pw)) errs.push("Password must contain at least one uppercase letter");
    if (pw && !/[a-z]/.test(pw)) errs.push("Password must contain at least one lowercase letter");
    if (pw && !/[0-9]/.test(pw)) errs.push("Password must contain at least one number");
    return errs;
  }

  var CATS = [
    { slug: "diagnostics", icon: "fas fa-microchip", color: "#2877EE", en: "Fault Codes & ISTA", ru: "Коды ошибок и ISTA", ka: "კოდები და ISTA" },
    { slug: "engine-drivetrain", icon: "fas fa-gears", color: "#38BDF8", en: "Engine & Transmission", ru: "Двигатель и КПП", ka: "ძრავა და ტრანსმისია" },
    { slug: "electronics", icon: "fas fa-bolt", color: "#F59E0B", en: "ECU & Body Electronics", ru: "ЭБУ и электроника", ka: "ელექტრონიკა და ბლოკები" },
    { slug: "coding-retrofits", icon: "fas fa-terminal", color: "#10B981", en: "Coding & Retrofits", ru: "Кодирование и дооснащение", ka: "კოდირება და რეტროფიტი" },
    { slug: "suspension-brakes", icon: "fas fa-car-side", color: "#94A3B8", en: "Chassis, DSC & Brakes", ru: "Шасси, DSC и тормоза", ka: "სავალი ნაწილი და DSC" }
  ];

  async function handleApi(urlObj, init) {
    var method = ((init && init.method) || "GET").toUpperCase();
    var p = urlObj.pathname;
    if (BASE && p.indexOf(BASE + "/api") === 0) p = p.slice(BASE.length);
    var qs = urlObj.searchParams;
    var db = loadDb();
    var uid = parseJwtUid(init && init.headers);
    var me = uid ? db.users.find(function (x) { return String(x.id) === String(uid); }) : null;

    if (p === "/api/upload" && method === "POST") {
      try {
        var fd = init && init.body;
        var file = fd && typeof fd.get === "function" ? fd.get("file") : null;
        if (!file) return jsonRes({ error: "No file uploaded" }, 400);
        var dataUrl = await new Promise(function (resolve, reject) {
          var fr = new FileReader();
          fr.onload = function () { resolve(fr.result); };
          fr.onerror = reject;
          fr.readAsDataURL(file);
        });
        return jsonRes({ success: true, url: dataUrl });
      } catch (e) {
        return jsonRes({ error: "Upload failed" }, 500);
      }
    }

    var body = {};
    if (init && typeof init.body === "string" && init.body) {
      try { body = JSON.parse(init.body); } catch (_) {}
    }

    if (p === "/api/ai/chat") {
      if (method === "GET") return jsonRes({ used: 0, limit: 40, remaining: 40 });
      // Trigger js/ai-chat.js built-in 9,906-code BMW diagnostic engine seamlessly
      return jsonRes({ error: "local_engine" }, 503);
    }

    if (p === "/api/analytics/track") return jsonRes({ success: true });
    if (p === "/api/notifications") return jsonRes({ notifications: [], unread_count: 0 });
    if (p === "/api/notifications/mute") return jsonRes({ mutes: [] });

    if (p === "/api/auth/register" && method === "POST") {
      var uname = String(body.username || "").trim();
      var email = String(body.email || "").trim().toLowerCase();
      var pw = String(body.password || "");
      var sq = String(body.security_question || "").trim();
      var sa = String(body.security_answer || "").trim().toLowerCase();
      if (!uname || !email || !pw || !sq || !sa) return jsonRes({ error: "Missing required fields" }, 400);
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(uname)) return jsonRes({ error: "Username must be 3-20 characters" }, 400);
      var pe = checkPw(pw);
      if (pe.length) return jsonRes({ error: "Password does not meet requirements", details: pe }, 400);
      var dup = db.users.find(function (u) { return u.email.toLowerCase() === email || u.username.toLowerCase() === uname.toLowerCase(); });
      if (dup) return jsonRes({ error: "Email or username already exists" }, 409);
      var nu = {
        id: "u_" + Math.random().toString(36).slice(2, 10),
        username: uname,
        email: email,
        pw: pw,
        sec_q: sq,
        sec_a: sa,
        first_name: body.first_name || null,
        last_name: body.last_name || null,
        age: body.age || null,
        bio: "",
        car_model: "",
        bmw_year: null,
        bmw_body: "",
        bmw_engine: "",
        city: "",
        country: "",
        preferred_lang: body.language || "en",
        avatar_url: "",
        role_id: "user_role",
        role: "user_role",
        reputation: 10,
        created_at: new Date().toISOString()
      };
      db.users.push(nu);
      saveDb(db);
      return jsonRes({ success: true, user: pubUser(nu) }, 201);
    }

    if (p === "/api/auth/login" && method === "POST") {
      var ident = String(body.email || body.identifier || body.username || "").trim().toLowerCase();
      var lpw = String(body.password || "");
      var hit = db.users.find(function (u) { return u.email.toLowerCase() === ident || u.username.toLowerCase() === ident; });
      if (!hit || hit.pw !== lpw) return jsonRes({ error: "Invalid credentials" }, 401);
      return jsonRes({ success: true, token: makeJwt(hit), user: pubUser(hit) });
    }

    if (p === "/api/auth/password-recovery/init" && method === "POST") {
      var rid = String(body.identifier || "").trim().toLowerCase();
      var ru = db.users.find(function (u) { return u.email.toLowerCase() === rid || u.username.toLowerCase() === rid; });
      if (!ru) return jsonRes({ error: "Account not found" }, 404);
      var rtok = "rec_" + Math.random().toString(36).slice(2, 12);
      db.recovery[rtok] = { uid: ru.id, verified: false };
      saveDb(db);
      return jsonRes({ success: true, recovery_token: rtok, security_question: ru.sec_q || "first_car" });
    }

    if (p === "/api/auth/password-recovery/verify" && method === "POST") {
      var rec = db.recovery[body.recovery_token];
      if (!rec) return jsonRes({ error: "Invalid recovery session" }, 400);
      var vu = db.users.find(function (u) { return u.id === rec.uid; });
      if (!vu || vu.sec_a !== String(body.security_answer || "").trim().toLowerCase()) {
        return jsonRes({ error: "Incorrect security answer" }, 400);
      }
      var rst = "rst_" + Math.random().toString(36).slice(2, 12);
      db.recovery[rst] = { uid: vu.id, verified: true };
      saveDb(db);
      return jsonRes({ success: true, reset_token: rst });
    }

    if (p === "/api/auth/password-recovery/reset" && method === "POST") {
      var inf = db.recovery[body.reset_token];
      if (!inf || !inf.verified) return jsonRes({ error: "Invalid reset token" }, 400);
      var npw = String(body.new_password || "");
      var rpe = checkPw(npw);
      if (rpe.length) return jsonRes({ error: "Password does not meet requirements", details: rpe }, 400);
      var tu = db.users.find(function (u) { return u.id === inf.uid; });
      if (tu) tu.pw = npw;
      delete db.recovery[body.reset_token];
      saveDb(db);
      return jsonRes({ success: true });
    }

    if (p === "/api/categories" && method === "GET") {
      var clang = qs.get("lang") || "en";
      var cats = CATS.map(function (c) {
        var cnt = db.topics.filter(function (t) { return t.category === c.slug; }).length;
        return { slug: c.slug, title: c[clang] || c.en, icon: c.icon, color: c.color, topics_count: cnt };
      });
      return jsonRes({ success: true, categories: cats });
    }

    if (p === "/api/forum/tags" && method === "GET") {
      var counts = {};
      db.topics.forEach(function (t) {
        (t.tags || []).forEach(function (tg) {
          var n = typeof tg === "string" ? tg : tg.name;
          if (n) counts[n] = (counts[n] || 0) + 1;
        });
      });
      var tagArr = Object.keys(counts).map(function (k) { return { name: k, usage_count: counts[k], color: "#2877EE" }; });
      return jsonRes({ success: true, tags: tagArr });
    }

    if (p === "/api/forum/topics" && method === "GET") {
      var cat = qs.get("category") || "all";
      var tab = qs.get("tab") || "all";
      var q = (qs.get("search") || "").trim().toLowerCase();
      var tagQ = (qs.get("tag") || "").trim().toLowerCase();
      var uidQ = qs.get("user_id") || "";
      var list = db.topics.filter(function (t) {
        if (cat !== "all" && t.category !== cat) return false;
        if (uidQ && String(t.user_id) !== String(uidQ)) return false;
        if (tab === "unanswered" && (t.reply_count || 0) > 0) return false;
        if (tab === "solved" && !t.is_solved) return false;
        if (tab === "pinned" && !t.is_pinned) return false;
        if (tagQ && !(t.tags || []).some(function (x) { return String(x.name || x).toLowerCase() === tagQ; })) return false;
        if (q && t.title.toLowerCase().indexOf(q) < 0 && t.content.toLowerCase().indexOf(q) < 0 && String(t.related_code || "").toLowerCase().indexOf(q) < 0) return false;
        return true;
      }).map(function (t) {
        var au = db.users.find(function (u) { return u.id === t.user_id; }) || {};
        return Object.assign({}, t, {
          author_avatar: au.avatar_url || "",
          author_role: au.role_id || "user_role",
          author_reputation: au.reputation || 0,
          tags: (t.tags || []).map(function (x) { return typeof x === "string" ? { name: x, color: "#2877EE" } : x; })
        });
      });
      return jsonRes({ topics: list, nextCursor: null, hasMore: false, total: list.length, totalPages: 1 });
    }

    if (p === "/api/forum/topics" && method === "POST") {
      if (!me) return jsonRes({ error: "Authentication required" }, 401);
      var tid = "t_" + Math.random().toString(36).slice(2, 10);
      var nt = {
        id: tid,
        user_id: me.id,
        username: me.username,
        category: body.category || "diagnostics",
        title: String(body.title || "(no title)").trim(),
        content: String(body.content || "").trim(),
        related_code: body.related_code ? String(body.related_code).toUpperCase() : null,
        lang: body.lang || "en",
        tags: Array.isArray(body.tags) ? body.tags : [],
        views: 1,
        reply_count: 0,
        is_solved: 0,
        is_pinned: 0,
        is_locked: 0,
        last_reply_at: null,
        last_reply_username: null,
        created_at: new Date().toISOString()
      };
      db.topics.unshift(nt);
      me.reputation = (me.reputation || 0) + 5;
      saveDb(db);
      return jsonRes({ success: true, topicId: tid }, 201);
    }

    if (p === "/api/forum/topic" && method === "GET") {
      var idQ = qs.get("id") || "";
      var vUid = qs.get("user_id") || "";
      var tp = db.topics.find(function (x) { return x.id === idQ; });
      if (!tp) return jsonRes({ error: "Topic not found" }, 404);
      if (qs.get("count_view") === "1") { tp.views = (tp.views || 0) + 1; saveDb(db); }
      var au2 = db.users.find(function (u) { return u.id === tp.user_id; }) || {};
      var fmtReacts = function (pid) {
        var rows = db.reactions.filter(function (r) { return r.post_id === pid; });
        var byE = {};
        rows.forEach(function (r) { (byE[r.emoji] = byE[r.emoji] || []).push(r.username); });
        return Object.keys(byE).map(function (em) { return { emoji: em, count: byE[em].length, users: byE[em] }; });
      };
      var myReacts = function (pid) {
        if (!vUid) return [];
        return db.reactions.filter(function (r) { return r.post_id === pid && String(r.user_id) === String(vUid); }).map(function (r) { return r.emoji; });
      };
      var topicOut = Object.assign({}, tp, {
        author_avatar: au2.avatar_url || "",
        author_role: au2.role_id || "user_role",
        author_reputation: au2.reputation || 0,
        tags: (tp.tags || []).map(function (x) { return typeof x === "string" ? { name: x, color: "#2877EE" } : x; }),
        reactions: fmtReacts(tp.id),
        my_reactions: myReacts(tp.id)
      });
      var postsOut = db.posts.filter(function (x) { return x.topic_id === tp.id; }).map(function (po) {
        var pu = db.users.find(function (u) { return u.id === po.user_id; }) || {};
        return Object.assign({}, po, {
          author_avatar: pu.avatar_url || "",
          author_role: pu.role_id || "user_role",
          author_reputation: pu.reputation || 0,
          reactions: fmtReacts(po.id),
          my_reactions: myReacts(po.id),
          is_hidden: false
        });
      });
      return jsonRes({ topic: topicOut, posts: postsOut });
    }

    if (p === "/api/forum/topic" && method === "POST") {
      if (!me) return jsonRes({ error: "Authentication required" }, 401);
      var rTopic = db.topics.find(function (x) { return x.id === body.topic_id; });
      if (!rTopic) return jsonRes({ error: "Topic not found" }, 404);
      var pid = "p_" + Math.random().toString(36).slice(2, 10);
      var nowIso = new Date().toISOString();
      db.posts.push({
        id: pid,
        topic_id: rTopic.id,
        user_id: me.id,
        username: me.username,
        content: String(body.content || "").trim(),
        is_solution: 0,
        is_pinned: 0,
        reply_to_post_id: body.reply_to_post_id || null,
        created_at: nowIso
      });
      rTopic.reply_count = (rTopic.reply_count || 0) + 1;
      rTopic.last_reply_at = nowIso;
      rTopic.last_reply_username = me.username;
      me.reputation = (me.reputation || 0) + 3;
      saveDb(db);
      return jsonRes({ success: true, postId: pid }, 201);
    }

    if (p === "/api/forum/reactions" && method === "POST") {
      if (!me) return jsonRes({ error: "Authentication required" }, 401);
      var ix = db.reactions.findIndex(function (r) { return r.post_id === body.post_id && r.user_id === me.id && r.emoji === body.emoji; });
      if (ix >= 0) db.reactions.splice(ix, 1);
      else db.reactions.push({ post_id: body.post_id, user_id: me.id, username: me.username, emoji: body.emoji || "👍" });
      saveDb(db);
      return jsonRes({ success: true });
    }

    if (p === "/api/forum/solve" && method === "POST") {
      if (!me) return jsonRes({ error: "Authentication required" }, 401);
      var stp = db.topics.find(function (x) { return x.id === body.topic_id; });
      if (stp) stp.is_solved = body.set_solution ? 1 : 0;
      db.posts.filter(function (x) { return x.topic_id === body.topic_id; }).forEach(function (x) {
        x.is_solution = (body.set_solution && x.id === body.post_id) ? 1 : 0;
      });
      saveDb(db);
      return jsonRes({ success: true });
    }

    if (p === "/api/user/get" && method === "GET") {
      var tUid = qs.get("id") || "";
      var gu = db.users.find(function (x) { return String(x.id) === String(tUid); });
      if (!gu) return jsonRes({ error: "User not found" }, 404);
      var outU = pubUser(gu);
      var utopics = db.topics.filter(function (x) { return x.user_id === gu.id; });
      var uposts = db.posts.filter(function (x) { return x.user_id === gu.id; });
      outU.stats = {
        topics_count: utopics.length,
        posts_count: uposts.length,
        solved_count: uposts.filter(function (x) { return x.is_solution; }).length
      };
      outU.recent_topics = utopics.slice(0, 5);
      return jsonRes(outU);
    }

    if (p === "/api/user/update" && method === "POST") {
      if (!me || String(me.id) !== String(body.id)) return jsonRes({ error: "Unauthorized" }, 401);
      ["username", "bio", "car_model", "city", "country", "first_name", "last_name", "age", "bmw_year", "bmw_body", "bmw_engine", "preferred_lang", "avatar_url"].forEach(function (k) {
        if (body[k] !== undefined) me[k] = body[k];
      });
      saveDb(db);
      return jsonRes({ success: true, username: me.username });
    }

    if (p === "/api/user/change-password" && method === "POST") {
      if (!me) return jsonRes({ error: "Unauthorized" }, 401);
      if (me.pw !== body.current_password) return jsonRes({ error: "Current password is incorrect" }, 401);
      var cpe = checkPw(body.new_password);
      if (cpe.length) return jsonRes({ error: cpe[0] }, 400);
      me.pw = body.new_password;
      saveDb(db);
      return jsonRes({ success: true });
    }

    if (p === "/api/user/change-email" && method === "POST") {
      if (!me) return jsonRes({ error: "Unauthorized" }, 401);
      if (me.pw !== body.current_password) return jsonRes({ error: "Current password is incorrect" }, 401);
      me.email = String(body.new_email || "").trim().toLowerCase();
      saveDb(db);
      return jsonRes({ success: true, email: me.email });
    }

    if (p === "/api/parts" && method === "GET") {
      var cCode = (qs.get("code") || "BMW").toUpperCase();
      var qEnc = encodeURIComponent("BMW " + cCode);
      return jsonRes({
        parts: {
          primary: [{
            id: "pt_1",
            part_name_en: "Genuine BMW / OE Primary Assembly (" + cCode + ")",
            oem_number: cCode === "2A82" ? "11367585425" : cCode === "P0128" ? "11537549476" : "13717604033",
            manufacturer: "Genuine BMW / Pierburg / Bosch OE",
            is_original: true,
            price_min: 85,
            price_max: 245,
            installation_difficulty: "medium",
            links: [
              { id: "l1", marketplace: "fcpeuro", affiliate_url: "https://www.fcpeuro.com/products?keywords=" + qEnc, current_price: 129, in_stock: true },
              { id: "l2", marketplace: "realoem", affiliate_url: "https://www.realoem.com/bmw/enUS/select", current_price: 0, in_stock: true }
            ]
          }],
          secondary: [],
          optional: []
        },
        estimated_cost: { min: 85, max: 245 }
      });
    }

    if (p === "/api/contact" && method === "POST") {
      if (!body.name || !body.email || !body.message) return jsonRes({ error: "Missing required fields" }, 400);
      db.messages.unshift({ id: "m_" + Date.now(), name: body.name, email: body.email, subject: body.subject || "General", message: body.message, created_at: new Date().toISOString() });
      saveDb(db);
      return jsonRes({ success: true });
    }

    if (p.indexOf("/api/admin/") === 0) {
      if (!me || ["super_admin_role", "admin_role", "moderator_role"].indexOf(me.role_id) < 0) {
        return jsonRes({ error: "Forbidden" }, 403);
      }
      if (p === "/api/admin/access") return jsonRes({ ok: true, role: me.role_id });
      if (p === "/api/admin/stats") {
        return jsonRes({
          success: true,
          stats: {
            users: { total: db.users.length, active: db.users.length, banned: 0 },
            moderation: { pending_reports: 0 },
            content: { posts: db.posts.length, topics: db.topics.length, new_topics_24h: 1, new_posts_24h: 1 },
            growth: { new_users_24h: 1 }
          }
        });
      }
      if (p === "/api/admin/analytics") {
        return jsonRes({
          success: true,
          data: {
            activeUsers: 4,
            pageViews: [{ hour: "08:00", count: 18 }, { hour: "12:00", count: 42 }, { hour: "16:00", count: 57 }, { hour: "20:00", count: 39 }],
            devices: [{ device_type: "desktop", count: 68 }, { device_type: "mobile", count: 32 }],
            topPages: [{ path: "/", count: 140 }, { path: "/vin.html", count: 64 }, { path: "/forum.html", count: 49 }]
          }
        });
      }
      if (p === "/api/admin/dashboard") {
        return jsonRes({
          success: true,
          widgets: {
            top_users: db.users.map(function (u) { return { username: u.username, post_count: 3 }; }),
            top_topics: db.topics.map(function (t) { return { title: t.title, reply_count: t.reply_count || 0 }; }),
            top_searches: [{ query: "118001", cnt: 29 }, { query: "2A82", cnt: 21 }, { query: "30FF", cnt: 17 }]
          }
        });
      }
      if (p === "/api/admin/users") return jsonRes({ success: true, users: db.users.map(pubUser), total: db.users.length, page: 1, totalPages: 1 });
      if (p === "/api/admin/messages") return jsonRes({ success: true, messages: db.messages });
      return jsonRes({ success: true, items: [], categories: CATS, tags: [], logs: [] });
    }

    return jsonRes({ success: true });
  }

  window.fetch = function (input, init) {
    var rawUrl = typeof input === "string" ? input : (input && input.url) || "";
    var parsed = new URL(rawUrl, location.href);
    var relPath = parsed.pathname;
    if (BASE && relPath.indexOf(BASE + "/api") === 0) relPath = relPath.slice(BASE.length);
    if (parsed.origin === location.origin && /^\\/api(\\/|$)/.test(relPath)) {
      return handleApi(parsed, init);
    }
    return realFetch(input, init);
  };
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
  <style>body{background:#0A0C10;color:#EDF1F7;font:15px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0}a{color:#6EA8FF}</style>
</head>
<body>
  <p id="msg">Loading diagnostic datasheet…</p>
  <script type="module">
    const BASE = ${JSON.stringify(BASE)};
    const LANGS = ["en", "ru", "ka"];
    const m = location.pathname.match(/\\/code\\/([^/]+)\\/?$/);
    if (!m) {
      document.getElementById("msg").innerHTML = 'Page not found. <a href="' + BASE + '/">Return to BimmerCodes</a>';
    } else {
      const id = decodeURIComponent(m[1]).toUpperCase();
      let saved = null;
      try { saved = localStorage.getItem("forumLanguage") || localStorage.getItem("language"); } catch (_) {}
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
