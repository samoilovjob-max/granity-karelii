const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SKIP = new Set(["node_modules", ".git", "admin", "scripts", "agent-tools"]);

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function metaContent(html, name) {
  const re1 = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`,
    "i"
  );
  return (html.match(re1) || html.match(re2) || [])[1] || "";
}

function propContent(html, prop) {
  const re1 = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`,
    "i"
  );
  return (html.match(re1) || html.match(re2) || [])[1] || "";
}

function stripTags(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const files = walk(ROOT);
const titles = new Map();
const descs = new Map();
const out = {
  pages: files.length,
  h1: [],
  hSkip: [],
  badCanonical: [],
  wwwCanonical: [],
  keywords: [],
  retail: [],
  noYm: [],
  noOgImage: [],
  noJsonLd: [],
  multiH1: [],
  zeroH1: [],
  titleLen: [],
  descLen: [],
  emptyAltContent: [],
  brokenLinks: [],
  missingAssets: [],
  placeholders: [],
  duplicateIds: [],
  scriptsNoDefer: [],
  imgNoDims: [],
  imgNoLazyBelowFold: [],
};

for (const f of files) {
  const html = fs.readFileSync(f, "utf8");
  const r = rel(f);
  const isStub =
    /google[0-9a-f]+\.html$/i.test(r) ||
    r === "postavka.html" ||
    r === "polezno.html";

  const title = stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const desc = metaContent(html, "description");
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    stripTags(m[1])
  );
  const can =
    (html.match(/rel=["']canonical["'][^>]*href=["']([^"']+)/i) ||
      html.match(/href=["']([^"']+)["'][^>]*rel=["']canonical/i) ||
      [])[1] || "";
  const headings = [...html.matchAll(/<(h[1-6])\b/gi)].map((m) => m[1].toLowerCase());

  if (!isStub) {
    if (h1s.length === 0) out.zeroH1.push(r);
    if (h1s.length > 1) out.multiH1.push({ file: r, count: h1s.length, texts: h1s });
    let prev = 0;
    for (const h of headings) {
      const n = Number(h[1]);
      if (prev && n > prev + 1) {
        out.hSkip.push({ file: r, chain: headings.join(">") });
        break;
      }
      if (n) prev = n;
    }
    if (title.length && (title.length < 30 || title.length > 75)) {
      out.titleLen.push({ file: r, len: title.length, title });
    }
    if (desc && (desc.length < 120 || desc.length > 180)) {
      out.descLen.push({ file: r, len: desc.length, desc: desc.slice(0, 100) });
    }
    if (!propContent(html, "og:image")) out.noOgImage.push(r);
    if (!/<script[^>]+application\/ld\+json/i.test(html)) out.noJsonLd.push(r);
    if (!/ym\(\s*113704179/i.test(html)) out.noYm.push(r);
  }

  if (can && !can.startsWith("https://granit-karel.ru")) {
    out.badCanonical.push({ file: r, can });
  }
  if (can && can.includes("www.")) out.wwwCanonical.push({ file: r, can });
  if (/name=["']keywords["']/i.test(html)) out.keywords.push(r);
  if (/купить\s+.{0,30}недорого|заказать\s+надгробие/i.test(html)) out.retail.push(r);

  titles.set(title, (titles.get(title) || []).concat(r));
  if (desc) descs.set(desc, (descs.get(desc) || []).concat(r));

  // duplicate ids
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((m) => m[1]);
  const seen = new Map();
  for (const id of ids) seen.set(id, (seen.get(id) || 0) + 1);
  const dups = [...seen.entries()].filter(([, c]) => c > 1).map(([id, c]) => `${id}×${c}`);
  if (dups.length) out.duplicateIds.push({ file: r, dups });

  // placeholders
  if (/stone-photo-placeholder|Место для фотографии/i.test(html)) {
    out.placeholders.push(r);
  }

  // scripts without defer/async (local only)
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)];
  const blocking = scripts.filter((m) => {
    const a = m[1];
    if (/type=["']application\/ld\+json["']/i.test(a)) return false;
    if (/src=/i.test(a) && !/\b(defer|async)\b/i.test(a)) return true;
    return false;
  });
  if (blocking.length && !isStub) {
    out.scriptsNoDefer.push({ file: r, count: blocking.length });
  }

  // img dims / lazy
  const imgs = [...html.matchAll(/<img\b([^>]*)>/gi)].map((m) => m[1]);
  const noDims = imgs.filter((a) => !/\bwidth=/i.test(a) || !/\bheight=/i.test(a)).length;
  if (noDims >= 6 && !isStub) out.imgNoDims.push({ file: r, count: noDims });

  // broken relative href/src
  const refs = [
    ...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi),
  ].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i.test(ref)) continue;
    if (ref.startsWith("blob:")) continue;
    const clean = ref.split("?")[0].split("#")[0];
    if (!clean || clean.endsWith("/")) continue;
    const target = path.resolve(path.dirname(f), clean);
    if (!fs.existsSync(target)) {
      out.brokenLinks.push({ file: r, ref });
    }
  }
}

out.dupTitles = [...titles.entries()]
  .filter(([t, a]) => t && a.length > 1)
  .map(([t, a]) => ({ title: t, files: a }));
out.dupDescs = [...descs.entries()]
  .filter(([, a]) => a.length > 1)
  .map(([d, a]) => ({ desc: d.slice(0, 120), files: a }));

// sitemap local
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
out.sitemap = {
  count: locs.length,
  hasPolezno: locs.some((u) => u.includes("polezno")),
  hasPostavkaShort: locs.some((u) => /\/postavka\.html$/.test(u)),
  httpUrls: locs.filter((u) => u.startsWith("http://")),
  nonApex: locs.filter((u) => !u.startsWith("https://granit-karel.ru")),
};

// calculator comma
const calc = fs.readFileSync(path.join(ROOT, "js", "calculator.js"), "utf8");
const paving = fs.readFileSync(path.join(ROOT, "js", "paving.js"), "utf8");
out.calc = {
  commaAware:
    /replace\(.*,.*['"],['"]\.['"]/.test(calc) ||
    /replace\([^)]*\\\\,/i.test(calc) ||
    calc.includes("replace(',', '.')") ||
    calc.includes('replace(",", ".")') ||
    calc.includes("replace(/,/g"),
  toNumberSnippet: (calc.match(/const toNumber[\s\S]{0,120}/) || [])[0] || "",
  pavingComma:
    paving.includes("replace(',', '.')") ||
    paving.includes('replace(",", ".")') ||
    paving.includes("replace(/,/g"),
};

// lead form security notes
const lead = fs.readFileSync(path.join(ROOT, "js", "lead.js"), "utf8");
out.lead = {
  hasHoneypot: /botcheck/.test(lead),
  hasAgreement: /agreement/.test(lead),
  hasAccessKey: /FORM_ACCESS_KEY/.test(lead),
  closesDialog: /close\(|dialog\.close/.test(lead),
};

fs.writeFileSync(
  path.join(__dirname, "audit-deep-report.json"),
  JSON.stringify(out, null, 2),
  "utf8"
);
console.log(
  JSON.stringify(
    {
      pages: out.pages,
      zeroH1: out.zeroH1,
      multiH1: out.multiH1,
      hSkip: out.hSkip.slice(0, 20),
      badCanonical: out.badCanonical,
      wwwCanonical: out.wwwCanonical,
      keywords: out.keywords,
      retail: out.retail,
      noYm: out.noYm,
      noOgImage: out.noOgImage,
      noJsonLd: out.noJsonLd,
      dupTitles: out.dupTitles,
      dupDescs: out.dupDescs,
      placeholders: out.placeholders,
      duplicateIds: out.duplicateIds,
      brokenLinks: out.brokenLinks.slice(0, 40),
      brokenCount: out.brokenLinks.length,
      scriptsNoDefer: out.scriptsNoDefer.slice(0, 10),
      imgNoDimsTop: out.imgNoDims.slice(0, 10),
      titleLenBad: out.titleLen.slice(0, 15),
      descLenBad: out.descLen.slice(0, 15),
      sitemap: out.sitemap,
      calc: out.calc,
      lead: out.lead,
    },
    null,
    2
  )
);
