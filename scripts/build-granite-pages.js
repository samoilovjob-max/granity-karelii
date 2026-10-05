const fs = require("fs");
const path = require("path");
const stones = require("./stones-data");

const root = path.join(__dirname, "..");
const stoneDir = path.join(root, "granity");

function esc(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[char]));
}

function nav(prefix, active) {
  const href = (file) => `${prefix}${file}`;
  const item = (file, label, key) =>
    `<a${active === key ? ' class="is-active"' : ""} href="${href(file)}">${label}</a>`;
  return `<header class="site-header">
    <div class="header-inner">
      <a class="brand" href="${href("index.html")}" aria-label="Граниты Карелии">
        <img src="${href("images/brand/logo-gk.jpg")}" alt="" width="40" height="40" />
        <span>Граниты Карелии</span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Меню</button>
      <nav class="nav" id="site-nav" aria-label="Навигация">
        <a${active === "about" ? ' class="is-active"' : ""} href="${href("o-kompanii.html")}">О компании</a>
        ${item("vidy.html", "Виды гранитов", "types")}
        <a href="${href("index.html")}#products">Продукция</a>
        <a href="${href("index.html")}#gallery">Галерея</a>
        ${item("polezno.html", "Полезно", "calc")}
        <a href="${href("index.html")}#contacts">Контакты</a>
      </nav>
    </div>
  </header>`;
}

function footer(prefix) {
  return `<footer class="site-footer">
    <div class="footer-inner">
      <a class="brand" href="${prefix}index.html" aria-label="Граниты Карелии">
        <img src="${prefix}images/brand/logo-gk.jpg" alt="" width="36" height="36" />
        <span>Граниты Карелии</span>
      </a>
      <p>18 пород · калькулятор массы</p>
    </div>
  </footer>
  <script src="${prefix}js/nav.js"></script>`;
}

function head(prefix, title, description) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="icon" href="${prefix}images/brand/logo-gk.jpg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${prefix}css/styles.css" />
</head>
<body>`;
}

function photo(stone, prefix, compact) {
  const file = `${prefix}images/granites/${stone.id}.jpg`;
  const caption = compact
    ? ""
    : `<figcaption>Фото появится здесь: images/granites/${esc(stone.id)}.jpg</figcaption>`;
  return `<figure class="stone-photo">
        <!-- Фото породы: уберите placeholder и укажите src="${file}" -->
        <div class="stone-photo-placeholder" style="background:${stone.color}" role="img" aria-label="Место для фотографии: ${esc(stone.name)}"></div>
        ${caption}
      </figure>`;
}

function stonePage(stone, index) {
  const prev = stones[(index - 1 + stones.length) % stones.length];
  const next = stones[(index + 1) % stones.length];
  const specs = [
    ["Плотность", stone.density],
    ["Водопоглощение", stone.water],
    ["Сжатие", stone.strength],
    ["Морозостойкость", stone.frost],
    ["Истираемость", stone.wear],
    ["Радиация", stone.radiation]
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("");

  return `${head("../", `${stone.name} — Граниты Карелии`, stone.lead)}
  ${nav("../", "types")}
  <main class="page">
    <p class="crumbs"><a href="../vidy.html">Виды гранитов</a><span aria-hidden="true">/</span><span>${esc(stone.name)}</span></p>
    <section class="stone-hero">
      <div class="stone-copy">
        <p class="eyebrow">${esc(stone.latin)}</p>
        <h1>${esc(stone.name)}</h1>
        <p class="lead">${esc(stone.lead)}</p>
        <p class="lead">${esc(stone.place)}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="../polezno.html">Рассчитать массу</a>
          <a class="btn btn-ghost" href="mailto:info@granit-karel.ru?subject=${encodeURIComponent(stone.name)}">Оставить заявку</a>
        </div>
      </div>
      ${photo(stone, "../")}
    </section>
    <section class="stone-layout" aria-label="Характеристики">
      <dl class="specs">${specs}</dl>
      <div>
        <details class="fold">
          <summary>Как выглядит</summary>
          <p>${esc(stone.look)}</p>
        </details>
        <details class="fold">
          <summary>Фактуры</summary>
          <ul>${stone.finishes.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
        </details>
        <details class="fold">
          <summary>Где применяют</summary>
          <ul>${stone.uses.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
        </details>
        <details class="fold" open>
          <summary>Гравировка</summary>
          <p>${esc(stone.engraving)}</p>
        </details>
      </div>
    </section>
    <nav class="pager" aria-label="Соседние породы">
      <a href="${prev.id}.html">← ${esc(prev.name)}</a>
      <a href="${next.id}.html">${esc(next.name)} →</a>
    </nav>
  </main>
  ${footer("../")}
</body>
</html>
`;
}

function catalogPage() {
  const cards = stones.map((stone) => `<a class="stone-card" href="granity/${stone.id}.html">
        ${photo(stone, "", true)}
        <h2>${esc(stone.name)}</h2>
        <p>${esc(stone.lead)}</p>
        <p class="density">${esc(stone.density)}</p>
      </a>`).join("\n");

  return `${head("", "Виды гранитов — Граниты Карелии", "18 пород: цвет, плотность, морозостойкость и отдельная страница на каждый камень.")}
  ${nav("", "types")}
  <main class="page">
    <section class="page-intro">
      <p class="eyebrow">Каталог</p>
      <h1>Виды гранитов</h1>
      <p class="lead">18 пород. У каждой своя страница: цвет, характеристики и заметка по гравировке. Цифры — из описаний пород.</p>
    </section>
    <section class="stone-grid" aria-label="Породы">${cards}</section>
    <section class="section-gap">
      <h2>На что смотреть</h2>
      <div class="perk-grid">
        <article><h2>Плотность</h2><p>Нужна для массы партии. Точный расчёт — в калькуляторе.</p></article>
        <article><h2>Морозостойкость</h2><p>Значение F указано в карточке породы.</p></article>
        <article><h2>Гравировка</h2><p>Прямой портрет уверенно читается на габбро-диабазе, Хауки и кольском габбро-диорите.</p></article>
        <article><h2>Фактура</h2><p>Полировка для цвета, термообработка для улицы, где поверхность не должна скользить.</p></article>
      </div>
    </section>
    <section class="cta-band section-gap">
      <h2>Нужна масса партии</h2>
      <p>Выберите породу и размеры плиты в калькуляторе.</p>
      <div class="hero-actions"><a class="btn btn-primary" href="polezno.html">Открыть калькулятор</a></div>
    </section>
  </main>
  ${footer("")}
</body>
</html>
`;
}

fs.mkdirSync(stoneDir, { recursive: true });
stones.forEach((stone, index) => {
  fs.writeFileSync(path.join(stoneDir, `${stone.id}.html`), stonePage(stone, index));
});
fs.writeFileSync(path.join(root, "vidy.html"), catalogPage());
console.log(`wrote vidy.html and ${stones.length} stone pages`);
