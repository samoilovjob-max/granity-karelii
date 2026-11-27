async function main() {
  const home = await fetch("https://granit-karel.ru/", { method: "HEAD" });
  console.log("home headers", {
    nosniff: home.headers.get("x-content-type-options"),
    ref: home.headers.get("referrer-policy"),
    frame: home.headers.get("x-frame-options"),
    hsts: home.headers.get("strict-transport-security")
  });

  const produkciya = await fetch("https://granit-karel.ru/produkciya.html").then((r) => r.text());
  console.log("produkciya", {
    collection: /CollectionPage/.test(produkciya),
    defer: /nav\.js" defer/.test(produkciya),
    awaitUx: /photo-await/.test(produkciya)
  });

  const massy = await fetch("https://granit-karel.ru/kalkulyator-massy-granita.html").then((r) => r.text());
  console.log("massy", {
    og: /og:image/.test(massy),
    defer: /calculator\.js" defer/.test(massy),
    preload: /rel="preload" as="style"/.test(massy)
  });

  const bordyury = await fetch("https://granit-karel.ru/produkciya/bordyury.html").then((r) => r.text());
  console.log("bordyury", {
    crumb: /BreadcrumbList/.test(bordyury),
    awaitBtn: /Запросить фото/.test(bordyury)
  });

  const calc = await fetch("https://granit-karel.ru/js/calculator.js").then((r) => r.text());
  console.log("calc comma", /replace\([^)]*,\s*["']\.["']\)/.test(calc));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
