/** Bulk HTML: defer local scripts, og:image, font preload. */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OG = "https://granit-karel.ru/images/granites/gabbro-diabaz/01-polirovka.webp";
const FONT =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap";
const SKIP = new Set(["node_modules", ".git", "admin", "scripts"]);

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, acc);
    else if (ent.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

let changed = 0;
for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  html = html.replace(/<script(\s[^>]*\bsrc=(["'])[^"']+\2[^>]*)>/gi, (full, attrs) => {
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(attrs)) return full;
    if (/\b(?:defer|async)\b/i.test(attrs)) return full;
    if (!/\bsrc=/i.test(attrs)) return full;
    return `<script${attrs} defer>`;
  });

  if (!/property=["']og:image["']/i.test(html) && /property=["']og:locale["']/i.test(html)) {
    html = html.replace(
      /(<meta\s+property=["']og:locale["'][^>]*>)/i,
      `$1\n  <meta property="og:image" content="${OG}" />`
    );
  } else if (!/property=["']og:image["']/i.test(html) && /property=["']og:url["']/i.test(html)) {
    html = html.replace(
      /(<meta\s+property=["']og:url["'][^>]*>)/i,
      `$1\n  <meta property="og:image" content="${OG}" />`
    );
  }

  if (html.includes(FONT) && !html.includes(`rel="preload" as="style" href="${FONT}"`)) {
    html = html.replace(
      `<link href="${FONT}" rel="stylesheet" />`,
      `<link rel="preload" as="style" href="${FONT}" />\n  <link href="${FONT}" rel="stylesheet" />`
    );
    html = html.replace(
      `<link href="${FONT}" rel="stylesheet"/>`,
      `<link rel="preload" as="style" href="${FONT}" />\n  <link href="${FONT}" rel="stylesheet"/>`
    );
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    changed += 1;
    console.log("updated", path.relative(ROOT, file).replace(/\\/g, "/"));
  }
}
console.log(`done, files changed: ${changed}`);
