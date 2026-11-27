/** Read-only site audit scanner. Does not modify files. */
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const root = path.join(__dirname, "..");
const ORIGIN = "https://granit-karel.ru";
const findings = [];

function add(level, area, file, issue, fix) {
  findings.push({ level, area, file, issue, fix });
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", ".cursor", "admin", "scripts", "agent-tools"].includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function fetchUrl(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: u.pathname + u.search,
        method: "GET",
        headers: { "User-Agent": "granit-audit/1.0", Accept: "*/*" },
        timeout: 15000,
        rejectUnauthorized: false
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
            url
          })
        );
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout", url });
    });
    req.on("error", (e) => resolve({ status: 0, error: e.message, url }));
    req.end();
  });
}

async function fetchFollow(url, max = 6) {
  let current = url;
  const chain = [];
  for (let i = 0; i < max; i++) {
    const res = await fetchUrl(current);
    chain.push({ url: current, status: res.status, location: res.headers && res.headers.location });
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      current = new URL(res.headers.location, current).href;
      continue;
    }
    return { ...res, finalUrl: current, chain };
  }
  return { status: 0, error: "too many redirects", chain, finalUrl: current };
}

function meta(html, name) {
  const m =
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i")) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i"));
  return m ? m[1].trim() : "";
}
function prop(html, p) {
  const m =
    html.match(new RegExp(`<meta[^>]+property=["']${p}["'][^>]+content=["']([^"']*)["']`, "i")) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${p}["']`, "i"));
  return m ? m[1].trim() : "";
}
function title(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].trim() : "";
}
function canonical(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return m ? m[1].trim() : "";
}
function countTag(html, tag) {
  return (html.match(new RegExp(`<${tag}\\b`, "gi")) || []).length;
}
function headings(html) {
  const out = [];
  const re = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    out.push({ tag: m[1].toLowerCase(), text });
  }
  return out;
}

function scanLocalHtml() {
  const files = walk(root).filter((f) => f.endsWith(".html"));
  const titles = new Map();
  const descriptions = new Map();
  const h1s = new Map();

  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    if (["max.html", "polezno.html"].includes(rel)) continue;
    const html = fs.readFileSync(file, "utf8");
    const t = title(html);
    const d = meta(html, "description");
    const c = canonical(html);
    const hs = headings(html);
    const h1 = hs.filter((h) => h.tag === "h1");
    const keywords = meta(html, "keywords");
    const ogTitle = prop(html, "og:title");
    const ogDesc = prop(html, "og:description");
    const ogImage = prop(html, "og:image");
    const hasJsonLd = /application\/ld\+json/i.test(html);
    const hasMetrika = /mc\.yandex\.ru|ym\(/i.test(html);
    const httpAssets = [...html.matchAll(/(?:src|href)=["'](http:\/\/[^"']+)["']/gi)].map((m) => m[1]);
    const ipHits = [...html.matchAll(/185\.20\.227\.150|samoilovjob-max\.github\.io/gi)].map((m) => m[0]);
    const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
    const imgsNoAlt = imgs.filter((tag) => !/\balt=/i.test(tag));
    const imgsEmptyAlt = imgs.filter((tag) => /\balt=["']\s*["']/i.test(tag));
    const imgsNoLazy = imgs.filter((tag) => !/loading=["']lazy["']/i.test(tag) && !/fetchpriority=["']high["']/i.test(tag));
    const imgsNoDims = imgs.filter((tag) => !/\bwidth=/i.test(tag) || !/\bheight=/i.test(tag));

    if (!t) add("red", "seo", rel, "Пустой или отсутствующий <title>", "Добавить уникальный title 55–70 символов");
    else {
      if (!titles.has(t)) titles.set(t, []);
      titles.get(t).push(rel);
      if (t.length < 30 || t.length > 80) add("yellow", "seo", rel, `Длина title ${t.length}: «${t}»`, "Укоротить/расширить до 55–70");
    }
    if (!d) add("red", "seo", rel, "Нет meta description", "Добавить description 140–170");
    else {
      if (!descriptions.has(d)) descriptions.set(d, []);
      descriptions.get(d).push(rel);
      if (d.length < 110 || d.length > 180) add("yellow", "seo", rel, `Длина description ${d.length}`, "Подогнать к 140–170");
    }
    if (keywords) add("yellow", "seo", rel, "Присутствует meta keywords (запрещён правилами проекта)", "Удалить meta keywords");
    if (h1.length === 0) add("red", "seo", rel, "Нет H1", "Добавить один H1");
    else if (h1.length > 1) add("red", "seo", rel, `Несколько H1 (${h1.length})`, "Оставить один H1");
    else {
      const key = h1[0].text;
      if (!h1s.has(key)) h1s.set(key, []);
      h1s.get(key).push(rel);
    }

    // heading hierarchy skips
    let prev = 0;
    for (const h of hs) {
      const level = Number(h.tag.slice(1));
      if (prev && level > prev + 1) {
        add("yellow", "seo", rel, `Пропуск уровней заголовков: h${prev} → h${level} («${h.text.slice(0, 60)}»)`, "Выровнять иерархию без пропусков");
        break;
      }
      prev = level;
    }

    if (!c) add("red", "seo", rel, "Нет canonical", "Добавить https://granit-karel.ru/…");
    else {
      if (!c.startsWith("https://granit-karel.ru/")) {
        add("red", "seo", rel, `Canonical не на apex HTTPS: ${c}`, "Исправить на https://granit-karel.ru/…");
      }
      if (c.includes("www.granit-karel.ru")) {
        add("red", "seo", rel, `Canonical на www: ${c}`, "Каноникал должен быть apex без www");
      }
      if (/185\.20\.227\.150|http:\/\//i.test(c)) {
        add("red", "seo", rel, `Подозрительный canonical: ${c}`, "Только https://granit-karel.ru");
      }
    }

    if (!ogTitle || !ogDesc) add("yellow", "seo", rel, "Неполные Open Graph title/description", "Добавить og:title и og:description");
    if (!ogImage) add("yellow", "seo", rel, "Нет og:image", "Добавить og:image абсолютным HTTPS URL");
    if (!hasJsonLd && !["politika.html", "soglashenie.html", "kalkulyator-massy-granita.html", "kalkulyator-bruschatki.html"].includes(rel)) {
      add("green", "seo", rel, "Нет JSON-LD Schema.org", "Добавить Organization/Product/FAQ где уместно");
    }
    if (!hasMetrika && !["max.html", "polezno.html"].includes(rel)) {
      add("yellow", "analytics", rel, "Нет Яндекс.Метрики", "Подключить тот же счётчик, что на главной");
    }
    const metrikaCount = (html.match(/ym\(113704179,\s*"init"/g) || []).length;
    if (metrikaCount > 1) add("yellow", "analytics", rel, `Метрика init дублируется (${metrikaCount})`, "Оставить один вызов init");

    for (const hit of ipHits) add("red", "migration", rel, `След переноса: ${hit}`, "Убрать IP/тестовый домен из публичных страниц");
    for (const url of httpAssets) add("red", "migration", rel, `Mixed content / http asset: ${url}`, "Заменить на https или относительный путь");

    if (imgsNoAlt.length) add("yellow", "seo", rel, `Img без alt: ${imgsNoAlt.length}`, "Добавить осмысленный alt");
    // empty alt on decorative icons in footer is OK; flag only content-ish pages with many
    if (imgsEmptyAlt.length > 8) add("green", "a11y", rel, `Много пустых alt (${imgsEmptyAlt.length}) — ок для иконок, проверить контентные фото`, "Контентным img дать описательный alt");
    if (imgsNoLazy.length > 3 && !rel.endsWith("index.html")) {
      add("green", "perf", rel, `Много img без lazy (${imgsNoLazy.length})`, "loading=lazy для нижеfold изображений");
    }
    if (imgsNoDims.length > 5) add("yellow", "perf", rel, `Img без width/height: ${imgsNoDims.length} (риск CLS)`, "Задать width/height или aspect-ratio в CSS");

    // retail wording
    if (/купить\s+.+\s+недорого|заказать надгробие/i.test(html)) {
      add("yellow", "seo", rel, "Розничные формулировки в тексте", "Заменить на B2B-формулировки по seo-b2b правилам");
    }

    // forms
    if (/<form\b/i.test(html)) {
      if (!/consent|политик|персональн/i.test(html)) {
        add("yellow", "conversion", rel, "Форма без явного согласия на ПДн рядом", "Добавить согласие со ссылкой на politika.html");
      }
    }
  }

  for (const [t, pages] of titles) {
    if (pages.length > 1) add("red", "seo", pages.join(", "), `Дублирующийся title: «${t}»`, "Сделать уникальные title");
  }
  for (const [d, pages] of descriptions) {
    if (pages.length > 1) add("yellow", "seo", pages.join(", "), `Дублирующийся description (${pages.length} стр.)`, "Уникализировать description");
  }
  for (const [h, pages] of h1s) {
    if (pages.length > 1 && h) add("yellow", "seo", pages.join(", "), `Одинаковый H1 на ${pages.length} страницах: «${h.slice(0, 80)}»`, "Дифференцировать H1");
  }

  return files.length;
}

function scanRepoForSecretsAndIp() {
  const files = walk(root).concat(
    walk(path.join(root, "admin")).filter((f) => /\.(js|html|json|yml|md|txt)$/i.test(f))
  );
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    if (rel.startsWith("scripts/battle-check") || rel.startsWith("scripts/audit-")) continue;
    let text = "";
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (/185\.20\.227\.150/.test(text) && !rel.startsWith("scripts/vps-") && !rel.includes("agent-transcript")) {
      if (/\.(html|css|js|xml|txt|json)$/i.test(rel) && !rel.startsWith("scripts/")) {
        add("red", "migration", rel, "Захардкожен IP 185.20.227.150", "Убрать из публичных/данных файлов");
      } else if (rel.startsWith("scripts/")) {
        add("green", "ops", rel, "IP VPS в deploy-скрипте (ожидаемо для ops)", "Держать только в env, не в публичном сайте");
      }
    }
    if (/ADMIN_PASSWORD|REGRU_FTP_PASSWORD|VPS_PASSWORD\s*=\s*['\"][^'\"]+['\"]/.test(text) && !rel.includes("vps-") && !rel.includes(".local")) {
      add("yellow", "security", rel, "Возможный хардкод секрета/пароля в репозитории", "Вынести в env / secrets, ротировать");
    }
    if (/web3forms|access_key|FORM_ACCESS_KEY/.test(text) && rel === "js/lead.js") {
      const m = text.match(/FORM_ACCESS_KEY\s*=\s*["']([^"']+)["']/);
      if (m && m[1] && m[1].length > 8) {
        add("yellow", "security", rel, "Публичный access_key Web3Forms в клиентском JS (норма для Web3Forms, но ключ ограничен)", "Ограничить домен в кабинете Web3Forms, honeypot уже есть");
      }
    }
  }
}

function scanJsCssPerf() {
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const scripts = [...index.matchAll(/<script\b([^>]*)>/gi)].map((m) => m[1]);
  const blocking = scripts.filter((attrs) => /src=/i.test(attrs) && !/defer|async/i.test(attrs) && !/yandex|metrika/i.test(attrs));
  if (blocking.length) {
    add("yellow", "perf", "index.html", `Внешние script без defer/async: ${blocking.length}`, "Добавить defer для nav/carousel/lead/gallery");
  }
  if (!/fonts\.googleapis\.com.*display=swap|font-display:\s*swap/.test(index + fs.readFileSync(path.join(root, "css/styles.css"), "utf8"))) {
    // google fonts URL may include display=swap
  }
  if (/fonts\.googleapis\.com/.test(index) && !/display=swap/.test(index)) {
    add("yellow", "perf", "index.html", "Google Fonts без display=swap", "Добавить &display=swap");
  } else if (/fonts\.googleapis\.com/.test(index) && /display=swap/.test(index)) {
    add("green", "perf", "index.html", "Google Fonts с display=swap — ок", "—");
  }

  // lead form checks
  const lead = fs.readFileSync(path.join(root, "js/lead.js"), "utf8");
  if (!/botcheck|honeypot|lead-hp/.test(lead)) add("red", "conversion", "js/lead.js", "Нет honeypot/антиспама", "Добавить honeypot");
  else add("green", "conversion", "js/lead.js", "Honeypot botcheck присутствует", "—");
  if (!/reportValidity|required/.test(lead)) add("yellow", "conversion", "js/lead.js", "Слабая клиентская валидация", "Усилить проверки");
  if (!/closeLeadDialog|setTimeout/.test(lead)) add("green", "conversion", "js/lead.js", "Автозакрытие диалога после успеха — проверить", "—");

  // calculators
  for (const calc of ["js/calculator.js", "js/paving.js"]) {
    const p = path.join(root, calc);
    if (!fs.existsSync(p)) continue;
    const code = fs.readFileSync(p, "utf8");
    if (!/Math\.max\(0|<|>\s*0|isNaN|Number\.isFinite/.test(code)) {
      add("yellow", "conversion", calc, "Неочевидна защита от отрицательных/пустых значений", "Явно отсекать <0, NaN, пустые поля");
    }
  }
}

async function scanLive() {
  const www = await fetchFollow("https://www.granit-karel.ru/");
  const apex = await fetchFollow("https://granit-karel.ru/");
  const wwwChain = (www.chain || []).map((c) => `${c.status}${c.location ? "→" + c.location : ""}`).join(" | ");
  if (www.finalUrl && www.finalUrl.startsWith("https://granit-karel.ru")) {
    add("green", "seo", "live:www", `www редиректит на apex: ${wwwChain}`, "—");
  } else {
    add("red", "seo", "live:www", `www не склеивается на apex (${www.finalUrl || www.error})`, "301 www→https://granit-karel.ru/");
  }
  if (apex.status !== 200) add("red", "tech", "live:apex", `HTTPS apex status ${apex.status}`, "Починить nginx/сертификат");

  const hsts = (apex.headers && (apex.headers["strict-transport-security"] || "")) || "";
  if (!hsts) add("yellow", "security", "live:apex", "Нет HSTS", "add_header Strict-Transport-Security");
  else add("green", "security", "live:apex", `HSTS: ${hsts}`, "—");

  const robots = await fetchFollow(`${ORIGIN}/robots.txt`);
  if (robots.status !== 200) add("red", "seo", "robots.txt", "Недоступен", "Опубликовать robots.txt");
  else {
    if (!/Sitemap:\s*https:\/\/granit-karel\.ru\/sitemap\.xml/i.test(robots.body || "")) {
      add("yellow", "seo", "robots.txt", "Нет строки Sitemap на apex", "Добавить Sitemap: https://granit-karel.ru/sitemap.xml");
    }
    if (/Disallow:\s*\/$/i.test(robots.body || "")) add("red", "seo", "robots.txt", "Закрыт весь сайт Disallow: /", "Убрать запрет");
  }

  const sm = await fetchFollow(`${ORIGIN}/sitemap.xml`);
  if (sm.status !== 200) add("red", "seo", "sitemap.xml", "Недоступен", "Починить sitemap");
  else {
    const locs = [...(sm.body || "").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    add("green", "seo", "sitemap.xml", `URL в sitemap: ${locs.length}`, "—");
    if (locs.some((u) => u.includes("www."))) add("red", "seo", "sitemap.xml", "В sitemap есть www URL", "Только apex");
    if (locs.some((u) => u.startsWith("http://"))) add("red", "seo", "sitemap.xml", "В sitemap есть http://", "Только https");
    if (locs.some((u) => /polezno\.html/i.test(u))) add("yellow", "seo", "sitemap.xml", "polezno.html в sitemap", "Убрать (редирект-страница)");
    // sample crawl
    let broken = 0;
    const sample = locs;
    for (const loc of sample) {
      const r = await fetchFollow(loc);
      if (r.status !== 200) {
        broken++;
        add("red", "seo", loc, `Sitemap URL status ${r.status}`, "Исправить или убрать из sitemap");
      }
    }
    if (!broken) add("green", "seo", "sitemap.xml", `Все ${sample.length} URL отдают 200`, "—");
  }

  // sample page SEO live
  for (const p of ["/", "/produkciya/pamyatniki.html", "/granity/gabbro-diabaz.html", "/galereya.html", "/kontakty.html"]) {
    const r = await fetchFollow(`${ORIGIN}${p}`);
    if (r.status !== 200) {
      add("red", "tech", p, `Live status ${r.status}`, "Починить страницу");
      continue;
    }
    const html = r.body || "";
    if (countTag(html, "h1") !== 1) add("red", "seo", `live:${p}`, `H1 count=${countTag(html, "h1")}`, "Один H1");
    const c = canonical(html);
    if (!c.startsWith("https://granit-karel.ru/")) add("red", "seo", `live:${p}`, `Bad canonical ${c}`, "Apex HTTPS");
  }

  // contact links
  const contacts = await fetchFollow(`${ORIGIN}/kontakty.html`);
  const ch = contacts.body || "";
  for (const need of ["tel:+79218017170", "mailto:info@granit-karel.ru", "wa.me/", "t.me/", "max.ru/"]) {
    if (!ch.includes(need.replace("tel:", "tel:")) && !ch.includes(need)) {
      // tel might be formatted
      if (need.startsWith("tel:") && /tel:\+?7\s*921|tel:\+7921/i.test(ch)) continue;
      add("yellow", "conversion", "kontakty.html", `Не найден контактный паттерн ${need}`, "Проверить ссылки мессенджеров/телефона");
    }
  }
}

function scanHtmlValidityHints() {
  const files = walk(root).filter((f) => f.endsWith(".html"));
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const html = fs.readFileSync(file, "utf8");
    const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((m) => m[1]);
    const seen = new Map();
    for (const id of ids) {
      seen.set(id, (seen.get(id) || 0) + 1);
    }
    for (const [id, n] of seen) {
      if (n > 1) add("yellow", "code", rel, `Дублирующийся id="${id}" (${n})`, "Сделать id уникальными");
    }
  }
}

function scanInternalLinks() {
  const htmlFiles = walk(root).filter((f) => f.endsWith(".html"));
  const existing = new Set(htmlFiles.map((f) => path.relative(root, f).replace(/\\/g, "/")));
  existing.add("index.html");
  for (const file of htmlFiles) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const dir = path.posix.dirname(rel);
    const html = fs.readFileSync(file, "utf8");
    const hrefs = [...html.matchAll(/href=["']([^"'#?]+)["']/gi)].map((m) => m[1]);
    for (const href of hrefs) {
      if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(href)) continue;
      if (href.startsWith("/")) {
        const cut = href.replace(/^\//, "");
        if (cut && !existing.has(cut) && !fs.existsSync(path.join(root, cut))) {
          // allow directories/assets
          if (!fs.existsSync(path.join(root, cut)) && !cut.endsWith("/")) {
            add("yellow", "seo", rel, `Возможно битая абсолютная ссылка ${href}`, "Проверить путь");
          }
        }
        continue;
      }
      const resolved = path.posix.normalize(dir === "." ? href : `${dir}/${href}`);
      if (/\.(html)$/i.test(resolved) && !existing.has(resolved) && !fs.existsSync(path.join(root, resolved))) {
        add("red", "seo", rel, `Битая внутренняя ссылка → ${href} (${resolved})`, "Исправить путь");
      }
      if (/\.(css|js|webp|png|svg|ico)$/i.test(resolved) && !fs.existsSync(path.join(root, resolved))) {
        add("red", "tech", rel, `Битый ассет → ${href}`, "Восстановить файл или путь");
      }
    }
  }
}

async function main() {
  console.log("Auditing local HTML…");
  const n = scanLocalHtml();
  console.log(`HTML files scanned: ${n}`);
  scanRepoForSecretsAndIp();
  scanJsCssPerf();
  scanHtmlValidityHints();
  scanInternalLinks();
  console.log("Auditing live…");
  await scanLive();

  const order = { red: 0, yellow: 1, green: 2 };
  findings.sort((a, b) => order[a.level] - order[b.level] || a.area.localeCompare(b.area));

  const out = {
    at: new Date().toISOString(),
    counts: {
      red: findings.filter((f) => f.level === "red").length,
      yellow: findings.filter((f) => f.level === "yellow").length,
      green: findings.filter((f) => f.level === "green").length,
      total: findings.length
    },
    findings
  };
  const reportPath = path.join(root, "scripts/audit-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.counts));
  console.log("Wrote", reportPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
