/**
 * Replace every <footer class="site-footer">…</footer> with the unified 3-column footer.
 * Path prefix ("" or "../") is inferred from file depth.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const site = JSON.parse(fs.readFileSync(path.join(root, "data/site.json"), "utf8"));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["admin", "node_modules", ".git", ".cursor"].includes(e.name)) continue;
      walk(full, out);
    } else if (e.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function footerHtml(prefix) {
  const wa = site.phoneTel.replace(/^\+/, "");
  const tg = site.telegramUrl || `https://t.me/+${wa}`;
  const max = site.maxUrl || "https://max.ru/";
  return `<footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-col footer-id">
        <a class="brand" href="${prefix}index.html" aria-label="Граниты Карелии">
          <img src="${prefix}images/brand/logo-gk-transparent.svg" alt="" width="36" height="36" />
          <span>Граниты Карелии</span>
        </a>
        <ul class="footer-contacts">
          <li>ИНН <span class="footer-inn" data-edit="site.inn">${esc(site.inn)}</span></li>
          <li class="footer-copy">© 2014 Граниты Карелии</li>
        </ul>
      </div>
      <div class="footer-col footer-mid">
        <ul class="footer-contacts">
          <li class="footer-phone">
            <a href="tel:${esc(site.phoneTel)}" data-edit="site.phone" data-bind="tel">${esc(site.phone)}</a>
            <span class="footer-apps">
              <a href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><img src="${prefix}images/messengers/whatsapp.png" alt="" width="18" height="18" /></a>
              <a href="${esc(tg)}" target="_blank" rel="noopener noreferrer" aria-label="Telegram"><img src="${prefix}images/messengers/telegram.png" alt="" width="18" height="18" /></a>
              <a href="${esc(max)}" target="_blank" rel="noopener noreferrer" aria-label="MAX"><img src="${prefix}images/messengers/max.png" alt="" width="18" height="18" /></a>
            </span>
          </li>
          <li><a href="mailto:${esc(site.email)}" data-edit="site.email" data-bind="mailto">${esc(site.email)}</a></li>
        </ul>
      </div>
      <div class="footer-col footer-end">
        <p class="footer-note">Камнеобработка в Карелии</p>
        <ul class="footer-contacts">
          <li class="footer-legal"><a href="${prefix}politika.html">Персональные данные</a></li>
          <li class="footer-legal"><a href="${prefix}soglashenie.html">Пользовательское соглашение</a></li>
          <li class="footer-legal"><a href="${prefix}politika.html">Политика в отношении обработки персональных данных</a></li>
        </ul>
      </div>
    </div>
  </footer>`;
}

const footerRe = /<footer class="site-footer">[\s\S]*?<\/footer>/;

let updated = 0;
let skipped = 0;
for (const file of walk(root)) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (rel === "postavka.html") {
    skipped++;
    continue;
  }
  const depth = rel.split("/").length - 1;
  const prefix = depth > 0 ? "../".repeat(depth) : "";
  const html = fs.readFileSync(file, "utf8");
  if (!footerRe.test(html)) {
    skipped++;
    continue;
  }
  const next = html.replace(footerRe, footerHtml(prefix));
  if (next !== html) {
    fs.writeFileSync(file, next);
    updated++;
    console.log("updated", rel);
  } else {
    skipped++;
  }
}
console.log(JSON.stringify({ updated, skipped }));
