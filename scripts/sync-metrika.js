/**
 * Inject / refresh Yandex.Metrika snippet on all HTML pages (except redirects/verification).
 * Counter id from data/site.json → metrikaId.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const site = JSON.parse(fs.readFileSync(path.join(root, "data/site.json"), "utf8"));
const id = String(site.metrikaId || "").trim();

if (!/^\d+$/.test(id)) {
  console.error("Set numeric metrikaId in data/site.json");
  process.exit(1);
}

const snippet = `<!-- Yandex.Metrika counter -->
<script type="text/javascript">
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
   window.GK_METRIKA_ID = ${id};
   ym(${id}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/${id}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- /Yandex.Metrika counter -->
`;

const blockRe =
  /\s*<!-- Yandex\.Metrika counter -->[\s\S]*?<!-- \/Yandex\.Metrika counter -->\s*/g;

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

const skip = new Set(["postavka.html", "google0955be30a03c36db.html"]);
let updated = 0;
for (const file of walk(root)) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (skip.has(path.basename(file)) || skip.has(rel)) continue;
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes("</head>")) continue;
  html = html.replace(blockRe, "\n");
  if (!html.includes("</head>")) continue;
  html = html.replace("</head>", `${snippet}</head>`);
  fs.writeFileSync(file, html);
  updated++;
  console.log("ok", rel);
}
console.log(JSON.stringify({ metrikaId: id, updated }));
