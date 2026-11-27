/**
 * Production battle-check for granit-karel.ru
 * Usage: node scripts/battle-check.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const ROOT = path.join(__dirname, "..");
const BASE = process.env.SITE_URL || "https://granit-karel.ru";
const ORIGIN = new URL(BASE).origin;

const results = [];
let fails = 0;
let warns = 0;

function ok(name, detail = "") {
  results.push({ level: "ok", name, detail });
  console.log(`OK   ${name}${detail ? ` — ${detail}` : ""}`);
}
function warn(name, detail = "") {
  warns++;
  results.push({ level: "warn", name, detail });
  console.log(`WARN ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  fails++;
  results.push({ level: "fail", name, detail });
  console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

function fetchUrl(url, opts = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: u.pathname + u.search,
        method: opts.method || "GET",
        headers: {
          "User-Agent": "granit-karel-battle-check/1.0",
          Accept: "text/html,application/xhtml+xml,*/*",
          ...(opts.headers || {})
        },
        timeout: opts.timeout || 15000,
        rejectUnauthorized: opts.insecure ? false : true
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          const text = opts.binary ? null : buf.toString("utf8");
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: text,
            size: buf.length,
            url
          });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout", url });
    });
    req.on("error", (err) => resolve({ status: 0, error: err.message, url }));
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function fetchFollow(url, max = 5) {
  let current = url;
  const chain = [];
  for (let i = 0; i < max; i++) {
    const res = await fetchUrl(current, { method: "GET" });
    chain.push({ url: current, status: res.status, location: res.headers && res.headers.location });
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      current = new URL(res.headers.location, current).href;
      continue;
    }
    return { ...res, finalUrl: current, chain };
  }
  return { status: 0, error: "too many redirects", chain, finalUrl: current };
}

function extract(html, re, flags = "gi") {
  const out = [];
  const rx = new RegExp(re, flags);
  let m;
  while ((m = rx.exec(html))) out.push(m[1] || m[0]);
  return out;
}

function meta(html, name) {
  const m =
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i")) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i"));
  return m ? m[1] : "";
}

function prop(html, property) {
  const m =
    html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i")) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"));
  return m ? m[1] : "";
}

function title(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].trim() : "";
}

function canonical(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return m ? m[1] : "";
}

function loadLocalSitemapUrls() {
  const xml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function localHtmlPages() {
  const pages = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".git", ".cursor", "admin", "scripts"].includes(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name.endsWith(".html")) {
        const rel = path.relative(ROOT, full).replace(/\\/g, "/");
        pages.push(rel);
      }
    }
  }
  walk(ROOT);
  return pages;
}

async function checkRedirects() {
  console.log("\n=== Redirects / HTTPS ===");
  const www = await fetchUrl("http://www.granit-karel.ru/", { method: "GET" });
  if (www.status >= 300 && www.status < 400) {
    const loc = www.headers.location || "";
    if (/https:\/\/granit-karel\.ru\/?/.test(loc)) ok("www → apex HTTPS", `${www.status} → ${loc}`);
    else warn("www redirect target", `${www.status} → ${loc}`);
  } else fail("www HTTP redirect", `status ${www.status} ${www.error || ""}`);

  const httpApex = await fetchUrl("http://granit-karel.ru/", { method: "GET" });
  if (httpApex.status >= 300 && httpApex.status < 400) {
    const loc = httpApex.headers.location || "";
    if (/https:\/\/granit-karel\.ru\/?/.test(loc)) ok("HTTP → HTTPS apex", `${httpApex.status} → ${loc}`);
    else warn("HTTP apex redirect", `${httpApex.status} → ${loc}`);
  } else if (httpApex.status === 200) warn("HTTP apex serves 200 without redirect");
  else fail("HTTP apex", `status ${httpApex.status} ${httpApex.error || ""}`);

  const httpsHome = await fetchFollow(`${ORIGIN}/`);
  if (httpsHome.status === 200) ok("HTTPS home", `${httpsHome.size} bytes`);
  else fail("HTTPS home", `status ${httpsHome.status} ${httpsHome.error || ""}`);
}

async function checkCorePages() {
  console.log("\n=== Core pages ===");
  const core = [
    "/",
    "/o-kompanii.html",
    "/vidy.html",
    "/produkciya.html",
    "/galereya.html",
    "/kontakty.html",
    "/kalkulyator-massy-granita.html",
    "/kalkulyator-bruschatki.html",
    "/postavka-granita-petrozavodsk-kareliya.html",
    "/politika.html",
    "/soglashenie.html",
    "/polezno.html",
    "/robots.txt",
    "/sitemap.xml",
    "/favicon.ico",
    "/css/styles.css",
    "/js/nav.js",
    "/js/lead.js",
    "/js/carousel.js"
  ];
  for (const p of core) {
    const res = await fetchFollow(`${ORIGIN}${p}`);
    if (p === "/polezno.html") {
      if (res.status === 200 && /kalkulyator-massy|location\.replace|refresh/i.test(res.body || "")) {
        ok("polezno redirect page", "points to calculator");
      } else if (res.status === 200) warn("polezno.html", "200 but no clear redirect markup");
      else fail("polezno.html", `status ${res.status}`);
      continue;
    }
    if (res.status === 200) ok(p, `${res.size}b`);
    else fail(p, `status ${res.status} ${res.error || ""}`);
  }
}

async function checkSitemapCrawl() {
  console.log("\n=== Sitemap crawl ===");
  const sm = await fetchFollow(`${ORIGIN}/sitemap.xml`);
  if (sm.status !== 200) {
    fail("sitemap.xml live", `status ${sm.status}`);
    return [];
  }
  const urls = [...(sm.body || "").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  ok("sitemap urls", String(urls.length));
  if (urls.some((u) => /polezno\.html/i.test(u))) fail("sitemap contains polezno.html");
  else ok("sitemap without polezno");

  const local = loadLocalSitemapUrls();
  if (local.length !== urls.length) warn("sitemap count local vs live", `local ${local.length} / live ${urls.length}`);

  const sample = urls;
  let bad = 0;
  const broken = [];
  for (let i = 0; i < sample.length; i++) {
    const url = sample[i];
    const res = await fetchFollow(url);
    process.stdout.write(`\r  crawl ${i + 1}/${sample.length}   `);
    if (res.status !== 200) {
      bad++;
      broken.push(`${url} → ${res.status}`);
    }
  }
  process.stdout.write("\n");
  if (bad === 0) ok("all sitemap URLs 200", `${sample.length}`);
  else fail("broken sitemap URLs", broken.slice(0, 10).join("; "));
  return urls;
}

async function checkSeoSamples() {
  console.log("\n=== SEO / content ===");
  const pages = [
    { path: "/", expectTitle: /гранит/i, geo: true },
    { path: "/o-kompanii.html", expectTitle: /./, geo: true },
    { path: "/produkciya/bruschatka.html", expectTitle: /брусчатк/i, retailBan: true },
    { path: "/produkciya/pamyatniki.html", expectTitle: /памятник/i, retailBan: true },
    { path: "/granity/gabbro-diabaz.html", expectTitle: /габбро/i },
    { path: "/galereya.html", expectTitle: /галере/i },
    { path: "/kontakty.html", expectTitle: /контакт/i, geo: true }
  ];

  for (const page of pages) {
    const res = await fetchFollow(`${ORIGIN}${page.path}`);
    if (res.status !== 200) {
      fail(`seo ${page.path}`, `status ${res.status}`);
      continue;
    }
    const html = res.body || "";
    const t = title(html);
    const d = meta(html, "description");
    const c = canonical(html);
    const kw = meta(html, "keywords");
    const robots = meta(html, "robots");

    if (!t) fail(`title ${page.path}`, "empty");
    else if (page.expectTitle && !page.expectTitle.test(t)) warn(`title ${page.path}`, t);
    else if (t.length < 20 || t.length > 90) warn(`title length ${page.path}`, `${t.length}: ${t}`);
    else ok(`title ${page.path}`, `${t.length} chars`);

    if (!d) fail(`description ${page.path}`, "empty");
    else if (d.length < 70 || d.length > 200) warn(`description length ${page.path}`, `${d.length}`);
    else ok(`description ${page.path}`, `${d.length} chars`);

    if (!c) fail(`canonical ${page.path}`);
    else if (!c.startsWith("https://granit-karel.ru/")) fail(`canonical host ${page.path}`, c);
    else ok(`canonical ${page.path}`);

    if (kw) fail(`meta keywords present ${page.path}`, kw.slice(0, 60));
    else ok(`no keywords ${page.path}`);

    if (/купить\s+\S+\s+недорого|заказать надгробие/i.test(html)) fail(`retail wording ${page.path}`);
    else if (page.retailBan) ok(`no retail wording ${page.path}`);

    if (page.geo === false && /петрозаводск/i.test(t)) warn(`geo in title ${page.path}`, t);
  }
}

async function checkNav() {
  console.log("\n=== Navigation ===");
  const res = await fetchFollow(`${ORIGIN}/`);
  const html = res.body || "";
  if (/polezno\.html">Обзор</.test(html) || />Обзор</.test(html)) fail("nav still has Обзор");
  else ok("nav without Обзор");
  if (/<summary[^>]*>Полезно<\/summary>/.test(html) && /kalkulyator-massy-granita\.html/.test(html)) {
    ok("Полезно menu has calculators");
  } else warn("Полезно menu structure unexpected");
  if (!/kontakty\.html/.test(html) || !/galereya\.html/.test(html)) fail("core nav links missing");
  else ok("core nav links present");
}

async function checkGallery() {
  console.log("\n=== Gallery ===");
  const res = await fetchFollow(`${ORIGIN}/galereya.html`);
  const html = res.body || "";
  const cards = extract(html, 'class="gallery-card');
  const imgs = extract(html, '<img[^>]+src="(images/[^"]+)"');
  ok("gallery cards markup", `${(html.match(/gallery-card/g) || []).length} mentions`);
  if ((html.match(/data-title="/g) || []).length < 5) warn("few data-title on gallery");
  else ok("gallery data-title present");
  if ((html.match(/data-stone="/g) || []).length < 5) warn("few data-stone on gallery");
  else ok("gallery data-stone present");

  const unique = [...new Set(imgs)].slice(0, 12);
  let broken = 0;
  for (const src of unique) {
    const r = await fetchFollow(`${ORIGIN}/${src}`);
    if (r.status !== 200) broken++;
  }
  if (broken) fail("gallery image 404", `${broken}/${unique.length}`);
  else ok("sample gallery images 200", `${unique.length}`);
}

async function checkLeadAndForms() {
  console.log("\n=== Lead / forms ===");
  const res = await fetchFollow(`${ORIGIN}/produkciya/bruschatka.html`);
  const html = res.body || "";
  if (/js-lead|lead-fab|#zayavka|id="zayavka"/.test(html)) ok("lead CTA present on product");
  else warn("lead CTA missing on product");
  if (/web3forms|access_key|js\/lead\.js/.test(html)) ok("lead.js referenced");
  else warn("lead.js not found on product page");
}

async function checkDataPhoto() {
  console.log("\n=== Editable photos markers ===");
  const home = await fetchFollow(`${ORIGIN}/`);
  const about = await fetchFollow(`${ORIGIN}/o-kompanii.html`);
  if (/data-photo="home\.hero"/.test(home.body || "")) ok("home.hero data-photo");
  else fail("home.hero data-photo missing");
  if (/data-photo="about\.workshop"/.test(about.body || "") && /data-photo="about\.products"/.test(about.body || "")) {
    ok("about photo markers");
  } else fail("about photo markers missing");
}

async function checkLocalParity() {
  console.log("\n=== Local vs expected coverage ===");
  const htmlPages = localHtmlPages().filter((p) => p !== "polezno.html" && !p.startsWith("admin/"));
  const sitemap = new Set(loadLocalSitemapUrls().map((u) => u.replace(ORIGIN + "/", "").replace(/\/$/, "") || "index"));
  // sitemap uses "" for home as full URL ending /
  const smPaths = loadLocalSitemapUrls().map((u) => {
    const p = u.replace(/^https:\/\/granit-karel\.ru\/?/, "");
    return p || "index.html";
  });
  const smSet = new Set(smPaths);
  const missingInSm = htmlPages.filter((p) => {
    if (["max.html", "404.html", "polezno.html"].includes(p)) return false;
    if (p.endsWith("soglashenie.html") || p.endsWith("politika.html")) return !smSet.has(p);
    // calculators may be in sm
    return !smSet.has(p) && (p.startsWith("granity/") || p.startsWith("produkciya/") || ["index.html", "vidy.html", "produkciya.html", "galereya.html", "kontakty.html", "o-kompanii.html"].includes(p));
  });
  if (missingInSm.length) warn("HTML not in local sitemap", missingInSm.slice(0, 8).join(", "));
  else ok("key HTML covered by local sitemap");
  ok("local html pages", String(htmlPages.length));
}

async function checkSslHeaders() {
  console.log("\n=== Security headers (soft) ===");
  const res = await fetchUrl(`${ORIGIN}/`, { method: "GET" });
  const h = res.headers || {};
  if (h["strict-transport-security"]) ok("HSTS present");
  else warn("HSTS missing");
  if (/max-age/i.test(String(h["strict-transport-security"] || ""))) ok("HSTS max-age");
}

async function main() {
  console.log(`Battle check → ${ORIGIN}`);
  console.log(new Date().toISOString());
  await checkRedirects();
  await checkCorePages();
  await checkSitemapCrawl();
  await checkSeoSamples();
  await checkNav();
  await checkGallery();
  await checkLeadAndForms();
  await checkDataPhoto();
  await checkLocalParity();
  await checkSslHeaders();

  console.log("\n=== SUMMARY ===");
  console.log(`OK: ${results.filter((r) => r.level === "ok").length}`);
  console.log(`WARN: ${warns}`);
  console.log(`FAIL: ${fails}`);
  const report = {
    at: new Date().toISOString(),
    origin: ORIGIN,
    ok: results.filter((r) => r.level === "ok").length,
    warn: warns,
    fail: fails,
    results
  };
  const out = path.join(ROOT, "scripts", "battle-check-report.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`Report: ${out}`);
  process.exit(fails ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
