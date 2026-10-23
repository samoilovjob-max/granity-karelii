const fs = require("fs");
const path = require("path");

const roots = [".", "produkciya", "granity"];
const pages = [];

for (const r of roots) {
  for (const f of fs.readdirSync(r)) {
    if (!f.endsWith(".html")) continue;
    const p = r === "." ? f : path.join(r, f);
    if (p.startsWith("admin")) continue;
    const html = fs.readFileSync(p, "utf8");
    const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const d = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
    pages.push({
      p: p.replace(/\\/g, "/"),
      t,
      d,
      tl: [...t].length,
      dl: [...d].length
    });
  }
}

pages.sort((a, b) => a.p.localeCompare(b.p));
console.log("COUNT", pages.length);
const price = /цена|м²|м\.п\.|руб|₽/i;
const bad = pages.filter((x) => price.test(x.t) || price.test(x.d));
console.log("PRICE_HITS", bad.length);
bad.forEach((x) => console.log("BAD", x.p));
pages.forEach((x) => console.log(`${x.p}\tT${x.tl}\tD${x.dl}\t${x.t}`));
