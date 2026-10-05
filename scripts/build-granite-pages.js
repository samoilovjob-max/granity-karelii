const fs = require("fs");
const path = require("path");
const stones = require("./stones-data");
const articles = require("./stones-articles.json");
const products = require("./products-data");
const productArticles = require("./products-articles.json");

const articleById = Object.fromEntries(articles.map((article) => [article.id, article]));
const productArticleById = Object.fromEntries(productArticles.map((article) => [article.id, article]));
const stoneById = Object.fromEntries(stones.map((stone) => [stone.id, stone]));

const root = path.join(__dirname, "..");
const stoneDir = path.join(root, "granity");
const productDir = path.join(root, "produkciya");

/**
 * Порядок блоков каталога продукции.
 * memorial всегда раньше construction — на любом экране и в любом списке ссылок.
 * Внутри блока карточки идут по полю order.
 */
const CATEGORY_RANK = { memorial: 1, construction: 2 };
const CATEGORY_LABEL = {
  memorial: "Мемориальная продукция",
  construction: "Строительная продукция"
};

function sortedProducts(list = products) {
  return list.slice().sort((a, b) => {
    const byCategory = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
    return byCategory || a.order - b.order;
  });
}

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
        ${item("produkciya.html", "Продукция", "products")}
        <a href="${href("index.html")}#gallery">Галерея</a>
        ${item("polezno.html", "Полезно", "calc")}
        <a${active === "contacts" ? ' class="is-active"' : ""} href="${href("kontakty.html")}">Контакты</a>
      </nav>
    </div>
  </header>`;
}

function footer(prefix, note = "18 пород · калькулятор массы") {
  return `<footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-id">
        <a class="brand" href="${prefix}index.html" aria-label="Граниты Карелии">
          <img src="${prefix}images/brand/logo-gk.jpg" alt="" width="36" height="36" />
          <span>Граниты Карелии</span>
        </a>
        <ul class="footer-contacts">
          <li>ИНН <span class="footer-inn">102003029438</span></li>
          <li class="footer-phone">
            <a href="tel:+79218017170">+7 921 801 71 70</a>
            <span class="footer-apps">
              <a href="https://wa.me/79218017170" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><img src="${prefix}images/messengers/whatsapp.svg" alt="" width="32" height="32" /></a>
              <a href="https://t.me/+79218017170" target="_blank" rel="noopener noreferrer" aria-label="Telegram"><img src="${prefix}images/messengers/telegram.svg" alt="" width="32" height="32" /></a>
              <!-- Профиль MAX: когда появится ссылка https://max.ru/u/…, подставьте её вместо https://max.ru/ -->
              <a href="https://max.ru/" target="_blank" rel="noopener noreferrer" aria-label="MAX"><img src="${prefix}images/messengers/max.svg" alt="" width="32" height="32" /></a>
            </span>
          </li>
          <li><a href="mailto:info@granit-karel.ru">info@granit-karel.ru</a></li>
        </ul>
      </div>
      <p>${note}</p>
    </div>
  </footer>
  <script src="${prefix}js/nav.js"></script>`;
}

function head(prefix, title, description, extra = "") {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  ${extra}
  <link rel="icon" href="${prefix}favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="${prefix}images/brand/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="180x180" href="${prefix}images/brand/apple-touch-icon.png" />
  <link rel="apple-touch-icon" href="${prefix}images/brand/apple-touch-icon.png" />
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

function cardLead(article) {
  const text = article.lead[0];
  const cut = text.search(/\.\s/);
  return cut === -1 ? text : text.slice(0, cut + 1);
}

function isPositioning(section) {
  return /^6\.\s/.test(section.title)
    || section.title.includes("Рыночное позиционирование")
    || section.title.includes("причин выбрать");
}

function sectionPlainText(section) {
  return section.blocks.map((block) => {
    if (block.type === "p") return block.text;
    return block.items.map((item) => `${item.label}: ${item.text}`).join(" ");
  }).join(" ");
}

function story(article) {
  const visible = article.sections.filter((section) => !isPositioning(section));
  return `<div class="stone-story">${visible.map((section) => `<section class="stone-section">
        <h2>${esc(section.title)}</h2>
        ${section.blocks.map((block) => {
          if (block.type === "p") return `<p>${esc(block.text)}</p>`;
          return `<ul class="points">${block.items.map((item) => `<li><strong>${esc(item.label)}</strong> ${esc(item.text)}</li>`).join("")}</ul>`;
        }).join("")}
      </section>`).join("")}</div>`;
}

function structuredData(stone, article) {
  const positioning = article.sections.find(isPositioning);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: stone.name,
    alternateName: stone.latin,
    description: [article.meta, positioning ? sectionPlainText(positioning) : ""].filter(Boolean).join(" "),
    brand: { "@type": "Brand", name: "Граниты Карелии" },
    additionalProperty: positioning
      ? {
          "@type": "PropertyValue",
          name: positioning.title.replace(/^\d+\.\s*/, ""),
          value: sectionPlainText(positioning)
        }
      : undefined
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function stonePage(stone, index) {
  const article = articleById[stone.id];
  if (!article) throw new Error(`Нет текста документа для ${stone.id}`);
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

  const positioning = article.sections.find(isPositioning);
  const meta = [article.meta, positioning ? sectionPlainText(positioning) : ""].filter(Boolean).join(" ");
  return `${head("../", article.seoTitle, meta, structuredData(stone, article))}
  ${nav("../", "types")}
  <main class="page">
    <p class="crumbs"><a href="../vidy.html">Виды гранитов</a><span aria-hidden="true">/</span><span>${esc(stone.name)}</span></p>
    <section class="stone-hero">
      <div class="stone-copy">
        <p class="eyebrow">${esc(stone.latin)}</p>
        <h1>${esc(article.headline)}</h1>
        ${article.lead.map((paragraph) => `<p class="lead">${esc(paragraph)}</p>`).join("")}
        <div class="hero-actions">
          <a class="btn btn-primary" href="../polezno.html">Рассчитать массу</a>
          <a class="btn btn-ghost" href="mailto:info@granit-karel.ru?subject=${encodeURIComponent(stone.name)}">Оставить заявку</a>
        </div>
      </div>
      ${photo(stone, "../")}
    </section>
    <dl class="specs specs-board" aria-label="Характеристики">${specs}</dl>
    ${appliedProducts(stone)}
    ${story(article)}
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
        <p>${esc(cardLead(articleById[stone.id]))}</p>
        <p class="density">${esc(stone.density)}</p>
      </a>`).join("\n");

  return `${head("", "Виды гранитов — Граниты Карелии", "18 пород: полное описание, свойства, фактуры, гравировка и применение.")}
  ${nav("", "types")}
  <main class="page">
    <section class="page-intro">
      <p class="eyebrow">Каталог</p>
      <h1>Виды гранитов</h1>
      <p class="lead">18 пород. На странице камня — текст из описания: минералогия, свойства, фактуры, гравировка и где камень применяют.</p>
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

function productPhoto(product, prefix, compact) {
  const stone = stoneById[product.granites[0]];
  const rel = `images/products/${product.id}.jpg`;
  const file = `${prefix}${rel}`;
  if (fs.existsSync(path.join(root, rel))) {
    const caption = compact ? "" : `<figcaption>${esc(rel)}</figcaption>`;
    return `<figure class="stone-photo">
        <img src="${file}" alt="${esc(product.name)}" loading="lazy" />
        ${caption}
      </figure>`;
  }
  const caption = compact
    ? ""
    : `<figcaption>Фото появится здесь: ${esc(rel)}</figcaption>`;
  return `<figure class="stone-photo">
        <!-- Фото продукции: положите файл ${rel} и пересоберите страницы.
             Атрибуты готового изображения: src="${file}", alt — название изделия, loading="lazy".
             Пока файла нет, показан placeholder цвета первой связанной породы. -->
        <div class="stone-photo-placeholder" style="background:${stone.color}" role="img" aria-label="Место для фотографии: ${esc(product.name)}"></div>
        ${caption}
      </figure>`;
}

function graniteLinks(product, prefix) {
  return product.granites.map((id) => {
    const stone = stoneById[id];
    if (!stone) throw new Error(`${product.id}: нет породы ${id}`);
    return `<li><a href="${prefix}granity/${id}.html">${esc(stone.name)}</a></li>`;
  }).join("");
}

function productCard(product) {
  return `<article class="stone-card">
        <a class="card-main" href="produkciya/${product.id}.html">
          ${productPhoto(product, "", true)}
          <h2>${esc(product.name)}</h2>
          <p>${esc(product.summary)}</p>
        </a>
        <div class="stone-links">
          <p>Используемые граниты</p>
          <ul>${graniteLinks(product, "")}</ul>
        </div>
      </article>`;
}

function productGroups(list) {
  return ["memorial", "construction"].map((category) => {
    const items = list.filter((product) => product.category === category);
    if (!items.length) return "";
    return `<section class="product-block" id="${category}" aria-labelledby="heading-${category}">
      <h2 id="heading-${category}">${CATEGORY_LABEL[category]}</h2>
      <div class="stone-grid">${items.map(productCard).join("\n")}</div>
    </section>`;
  }).join("\n");
}

function appliedProducts(stone) {
  const list = sortedProducts().filter((product) => product.granites.includes(stone.id));
  if (!list.length) return "";
  const groups = ["memorial", "construction"].map((category) => {
    const items = list.filter((product) => product.category === category);
    if (!items.length) return "";
    const links = items.map((product) => `<li><a href="../produkciya/${product.id}.html">${esc(product.name)}</a></li>`).join("");
    return `<p class="eyebrow">${CATEGORY_LABEL[category]}</p><ul class="stone-links">${links}</ul>`;
  }).join("");
  return `<section class="stone-section" aria-label="Где применяется">
        <h2>Где применяется</h2>
        ${groups}
      </section>`;
}

function productStructuredData(product, article) {
  const positioning = article.sections.find(isPositioning);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    category: CATEGORY_LABEL[product.category],
    description: [article.meta, positioning ? sectionPlainText(positioning) : ""].filter(Boolean).join(" "),
    brand: { "@type": "Brand", name: "Граниты Карелии" },
    additionalProperty: positioning
      ? {
          "@type": "PropertyValue",
          name: positioning.title.replace(/^\d+\.\s*/, ""),
          value: sectionPlainText(positioning)
        }
      : undefined
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function productPage(product, siblings) {
  const article = productArticleById[product.id];
  if (!article) throw new Error(`Нет текста документа для ${product.id}`);
  const index = siblings.findIndex((item) => item.id === product.id);
  const prev = siblings[index - 1];
  const next = siblings[index + 1];
  const pager = [
    prev ? `<a href="${prev.id}.html">← ${esc(prev.name)}</a>` : "<span></span>",
    next ? `<a href="${next.id}.html">${esc(next.name)} →</a>` : "<span></span>"
  ].join("");
  const positioning = article.sections.find(isPositioning);
  const meta = [article.meta, positioning ? sectionPlainText(positioning) : ""].filter(Boolean).join(" ");
  return `${head("../", article.seoTitle || product.name, meta, productStructuredData(product, article))}
  ${nav("../", "products")}
  <main class="page">
    <p class="crumbs"><a href="../produkciya.html">Продукция</a><span aria-hidden="true">/</span><span>${esc(product.name)}</span></p>
    <section class="stone-hero">
      <div class="stone-copy">
        <p class="eyebrow">${esc(CATEGORY_LABEL[product.category])}</p>
        <h1>${esc(article.headline)}</h1>
        ${article.lead.map((paragraph) => `<p class="lead">${esc(paragraph)}</p>`).join("")}
        <div class="hero-actions">
          <a class="btn btn-primary" href="../polezno.html">Рассчитать массу</a>
          <a class="btn btn-ghost" href="mailto:info@granit-karel.ru?subject=${encodeURIComponent(product.name)}">Оставить заявку</a>
        </div>
      </div>
      ${productPhoto(product, "../")}
    </section>
    <section class="stone-section" aria-label="Используемые граниты">
      <h2>Используемые граниты</h2>
      <ul class="stone-links">${graniteLinks(product, "../")}</ul>
    </section>
    ${story(article)}
    <nav class="pager" aria-label="Соседние изделия">${pager}</nav>
  </main>
  ${footer("../")}
</body>
</html>
`;
}

function productsPage(list) {
  return `${head("", "Продукция — Граниты Карелии", "Мемориальная и строительная продукция из карельского гранита. Сначала мемориальные изделия, затем строительные.")}
  ${nav("", "products")}
  <main class="page">
    <section class="page-intro">
      <p class="eyebrow">Каталог</p>
      <h1>Выпускаемая продукция</h1>
      <p class="lead">Сначала мемориальные изделия, затем строительные. В карточке — породы, из которых это изделие делают.</p>
    </section>
    <!-- Порядок секций: memorial, затем construction. Его задаёт sortedProducts(), не вёрстка сетки. -->
    ${productGroups(list)}
  </main>
  ${footer("")}
</body>
</html>
`;
}

function assertProducts() {
  const ids = new Set();
  products.forEach((product) => {
    if (ids.has(product.id)) throw new Error(`Повтор id ${product.id}`);
    ids.add(product.id);
    if (!CATEGORY_RANK[product.category]) throw new Error(`${product.id}: category должна быть memorial или construction`);
    if (product.granites.length < 2 || product.granites.length > 4) {
      throw new Error(`${product.id}: нужно 2–4 гранита, сейчас ${product.granites.length}`);
    }
    product.granites.forEach((id) => {
      if (!stoneById[id]) throw new Error(`${product.id}: неизвестная порода ${id}`);
    });
    if (!productArticleById[product.id]) throw new Error(`${product.id}: нет статьи`);
  });
  const ordered = sortedProducts();
  const seenConstruction = ordered.some((product, index) => {
    if (product.category !== "construction") return false;
    return ordered.slice(index + 1).some((next) => next.category === "memorial");
  });
  if (seenConstruction) throw new Error("Мемориальная продукция оказалась после строительной");
}

assertProducts();

fs.mkdirSync(stoneDir, { recursive: true });
stones.forEach((stone, index) => {
  fs.writeFileSync(path.join(stoneDir, `${stone.id}.html`), stonePage(stone, index));
});
fs.writeFileSync(path.join(root, "vidy.html"), catalogPage());

const orderedProducts = sortedProducts();
fs.mkdirSync(productDir, { recursive: true });
["memorial", "construction"].forEach((category) => {
  const siblings = orderedProducts.filter((product) => product.category === category);
  siblings.forEach((product) => {
    fs.writeFileSync(path.join(productDir, `${product.id}.html`), productPage(product, siblings));
  });
});
fs.writeFileSync(path.join(root, "produkciya.html"), productsPage(orderedProducts));
console.log(`wrote vidy.html, produkciya.html, ${stones.length} stone pages, ${orderedProducts.length} product pages`);
