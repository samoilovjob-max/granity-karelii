const fs = require("fs");
const path = require("path");
const stones = require("./stones-data");
const articles = require("./stones-articles.json");
const products = require("./products-data");
const productArticles = require("./products-articles.json");
const site = require("../data/site.json");
const gallery = require("../data/gallery.json");
const pagesCopy = require("../data/pages.json");
const seoDefaults = require("../data/seo-defaults.json");
const productOverrides = require("../data/product-overrides.json");
const { imageGallery } = require("./image-gallery");

products.forEach((product) => {
  const extra = productOverrides[product.id];
  if (extra) Object.assign(product, extra);
});

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
        <img src="${href("images/brand/logo-gk-transparent.svg")}" alt="" width="40" height="40" />
        <span>Граниты Карелии</span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Меню</button>
      <nav class="nav" id="site-nav" aria-label="Навигация">
        <a${active === "about" ? ' class="is-active"' : ""} href="${href("o-kompanii.html")}">О компании</a>
        ${item("vidy.html", "Виды гранитов", "types")}
        ${item("produkciya.html", "Продукция", "products")}
        <a${active === "gallery" ? ' class="is-active"' : ""} href="${href("galereya.html")}">Галерея</a>
        ${item("kalkulyator-massy-granita.html", "Полезно", "calc")}
        <a${active === "contacts" ? ' class="is-active"' : ""} href="${href("kontakty.html")}">Контакты</a>
      </nav>
    </div>
  </header>`;
}

function consentNote(prefix) {
  return `<p class="consent-note">Заявка уходит на почту производства и на сайте не сохраняется. Отправляя заявку, вы соглашаетесь на <a href="${prefix}politika.html">обработку персональных данных</a>.</p>`;
}

function footer(prefix, note = "18 пород · калькулятор массы") {
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
          <li><a href="${prefix}produkciya.html">Производство изделий из гранита</a></li>
        </ul>
      </div>
      <div class="footer-col footer-mid">
        <ul class="footer-contacts">
          <li class="footer-phone">
            <a href="tel:${esc(site.phoneTel)}" data-edit="site.phone" data-bind="tel">${esc(site.phone)}</a>
            <span class="footer-apps">
              <a href="https://wa.me/${esc(site.phoneTel.replace(/^\+/, ""))}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><img src="${prefix}images/messengers/whatsapp.png" alt="" width="18" height="18" /></a>
              <a href="https://t.me/${esc(site.phoneTel)}" target="_blank" rel="noopener noreferrer" aria-label="Telegram"><img src="${prefix}images/messengers/telegram.png" alt="" width="18" height="18" /></a>
              <!-- Профиль MAX: когда появится ссылка https://max.ru/u/…, подставьте её вместо https://max.ru/ -->
              <a href="https://max.ru/" target="_blank" rel="noopener noreferrer" aria-label="MAX"><img src="${prefix}images/messengers/max.png" alt="" width="18" height="18" /></a>
            </span>
          </li>
          <li><a href="mailto:${esc(site.email)}" data-edit="site.email" data-bind="mailto">${esc(site.email)}</a></li>
          <li class="footer-legal"><a href="${prefix}politika.html">Персональные данные</a></li>
        </ul>
      </div>
      <p class="footer-note">${note}</p>
    </div>
  </footer>
  <script src="${prefix}js/nav.js"></script>
  <script src="${prefix}js/carousel.js"></script>
  <script src="${prefix}js/phone-countries.js"></script>
  <script src="${prefix}js/lead.js"></script>`;
}

function keywordTag(keywords) {
  const phrases = (Array.isArray(keywords) ? keywords : [])
    .map((item) => String(item).trim())
    .filter(Boolean);
  if (!phrases.length) return "";
  return `\n  <meta name="keywords" content="${esc(phrases.join(", "))}" />`;
}

function head(prefix, title, description, extra = "", keywords = []) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />${keywordTag(keywords)}
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:type" content="website" />
  ${extra}
  <link rel="icon" href="${prefix}favicon.ico" sizes="32x32" />
  <link rel="icon" type="image/svg+xml" href="${prefix}images/brand/logo-gk-transparent.svg" />
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

function photoCarousel(rels, prefix, name, photoKey, compact) {
  const slides = rels
    .map(
      (rel, index) =>
        `<div class="photo-carousel-slide${index === 0 ? " is-active" : ""}" data-index="${index}" role="group" aria-roledescription="слайд" aria-label="${index + 1} из ${rels.length}">
          <img src="${prefix}${rel}" alt="${esc(name)} — фото ${index + 1}" ${index === 0 ? "" : 'loading="lazy"'} draggable="false" />
        </div>`
    )
    .join("");
  const dots = rels
    .map(
      (_, index) =>
        `<button type="button" class="photo-carousel-dot${index === 0 ? " is-active" : ""}" data-index="${index}" aria-label="Фото ${index + 1}"${index === 0 ? ' aria-current="true"' : ""}></button>`
    )
    .join("");
  const caption = compact ? "" : `<figcaption>${esc(name)}</figcaption>`;
  return `<figure class="stone-photo stone-photo--carousel" data-photo="${photoKey}">
      <div class="photo-carousel" data-carousel data-interval="7000" aria-roledescription="карусель" aria-label="Фотографии: ${esc(name)}">
        <div class="photo-carousel-track" data-track>${slides}</div>
        <button type="button" class="photo-carousel-nav photo-carousel-prev" data-prev aria-label="Предыдущее фото">‹</button>
        <button type="button" class="photo-carousel-nav photo-carousel-next" data-next aria-label="Следующее фото">›</button>
        <div class="photo-carousel-dots" role="tablist" aria-label="Выбор фото">${dots}</div>
      </div>
      ${caption}
    </figure>`;
}

function photo(stone, prefix, compact) {
  const photoKey = `stone.${stone.id}.photo`;
  const gallery = imageGallery("granites", stone.id);
  if (gallery.length > 1 && !compact) {
    return photoCarousel(gallery, prefix, stone.name, photoKey, compact);
  }
  if (gallery.length) {
    const caption = compact ? "" : `<figcaption>${esc(stone.name)}</figcaption>`;
    return `<figure class="stone-photo" data-photo="${photoKey}">
        <img src="${prefix}${gallery[0]}" alt="${esc(stone.name)}" loading="lazy" />
        ${caption}
      </figure>`;
  }
  const caption = compact
    ? ""
    : `<figcaption>Фото появится здесь: images/granites/${esc(stone.id)}.webp</figcaption>`;
  return `<figure class="stone-photo" data-photo="${photoKey}">
        <!-- Фото породы подставляет админка в images/granites/${stone.id}.webp -->
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

// Если в админке задано своё описание, оно заменяет склейку meta и скрытого
// блока позиционирования. Пока своего описания нет, строка в поиске прежняя.
function articleDescription(article) {
  if (article.seoDescription && String(article.seoDescription).trim()) return String(article.seoDescription).trim();
  const positioning = article.sections.find(isPositioning);
  return [article.meta, positioning ? sectionPlainText(positioning) : ""].filter(Boolean).join(" ");
}

function searchHead(prefix, stored, fallbackTitle, fallbackDescription, extra = "") {
  const seo = stored && typeof stored === "object" ? stored : {};
  const title = String(seo.title || fallbackTitle);
  const description = String(seo.description || fallbackDescription);
  const keywords = Array.isArray(seo.keywords) ? seo.keywords : [];
  return head(prefix, title, description, extra, keywords);
}

function story(article, keyPrefix) {
  return `<div class="stone-story">${article.sections.map((section, sectionIndex) => {
    if (isPositioning(section)) return "";
    const blocks = section.blocks.map((block, blockIndex) => {
      if (block.type === "p") {
        return `<p data-edit="${keyPrefix}.s.${sectionIndex}.b.${blockIndex}">${esc(block.text)}</p>`;
      }
      const items = block.items.map((item, itemIndex) => `<li><strong data-edit="${keyPrefix}.s.${sectionIndex}.b.${blockIndex}.i.${itemIndex}.label">${esc(item.label)}</strong> <span data-edit="${keyPrefix}.s.${sectionIndex}.b.${blockIndex}.i.${itemIndex}.text">${esc(item.text)}</span></li>`).join("");
      return `<ul class="points">${items}</ul>`;
    }).join("");
    return `<section class="stone-section">
        <h2 data-edit="${keyPrefix}.s.${sectionIndex}.title">${esc(section.title)}</h2>
        ${blocks}
      </section>`;
  }).join("")}</div>`;
}

function structuredData(stone, article) {
  const positioning = article.sections.find(isPositioning);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: stone.name,
    alternateName: stone.latin,
    description: articleDescription(article),
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
    ["Плотность", stone.density, "density"],
    ["Водопоглощение", stone.water, "water"],
    ["Сжатие", stone.strength, "strength"],
    ["Морозостойкость", stone.frost, "frost"],
    ["Истираемость", stone.wear, "wear"],
    ["Радиация", stone.radiation, "radiation"]
  ].map(([label, value, key]) => `<div><dt>${label}</dt><dd data-edit="stone.${stone.id}.${key}">${esc(value)}</dd></div>`).join("");

  return `${head("../", article.seoTitle, articleDescription(article), structuredData(stone, article), article.keywords)}
  ${nav("../", "types")}
  <main class="page">
    <p class="crumbs"><a href="../vidy.html">Виды гранитов</a><span aria-hidden="true">/</span><span data-edit="stone.${stone.id}.name">${esc(stone.name)}</span></p>
    <section class="stone-hero">
      <div class="stone-copy">
        <p class="eyebrow" data-edit="stone.${stone.id}.latin">${esc(stone.latin)}</p>
        <h1 data-edit="stone.${stone.id}.headline">${esc(article.headline)}</h1>
        ${article.lead.map((paragraph, leadIndex) => `<p class="lead" data-edit="stone.${stone.id}.lead.${leadIndex}">${esc(paragraph)}</p>`).join("")}
        <div class="hero-actions">
          <a class="btn btn-primary" href="../kalkulyator-massy-granita.html">Рассчитать массу</a>
          <a class="btn btn-primary btn-lead js-lead" href="#zayavka" data-lead-topic="${esc(stone.name)}">Оставить заявку</a>
        </div>
        ${consentNote("../")}
      </div>
      ${photo(stone, "../")}
    </section>
    <dl class="specs specs-board" aria-label="Характеристики">${specs}</dl>
    ${appliedProducts(stone)}
    ${story(article, `stone.${stone.id}`)}
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

  return `${searchHead("", pagesCopy.catalog.seo, seoDefaults.catalog.title, seoDefaults.catalog.description)}
  ${nav("", "types")}
  <main class="page">
    <section class="page-intro">
      <p class="eyebrow">Каталог</p>
      <h1 data-edit="catalog.h1">${esc(pagesCopy.catalog.h1)}</h1>
      <p class="lead" data-edit="catalog.lead">${esc(pagesCopy.catalog.lead)}</p>
    </section>
    <section class="stone-grid" aria-label="Породы">${cards}</section>
    <section class="section-gap">
      <h2>На что смотреть</h2>
      <div class="perk-grid">
        <article><h2 data-edit="catalog.perk1.title">${esc(pagesCopy.catalog.perk1.title)}</h2><p data-edit="catalog.perk1.text">${esc(pagesCopy.catalog.perk1.text)}</p></article>
        <article><h2 data-edit="catalog.perk2.title">${esc(pagesCopy.catalog.perk2.title)}</h2><p data-edit="catalog.perk2.text">${esc(pagesCopy.catalog.perk2.text)}</p></article>
        <article><h2 data-edit="catalog.perk3.title">${esc(pagesCopy.catalog.perk3.title)}</h2><p data-edit="catalog.perk3.text">${esc(pagesCopy.catalog.perk3.text)}</p></article>
        <article><h2 data-edit="catalog.perk4.title">${esc(pagesCopy.catalog.perk4.title)}</h2><p data-edit="catalog.perk4.text">${esc(pagesCopy.catalog.perk4.text)}</p></article>
      </div>
    </section>
    <section class="cta-band section-gap">
      <h2>Нужна масса партии</h2>
      <p>Выберите породу и размеры плиты в калькуляторе.</p>
      <div class="hero-actions"><a class="btn btn-primary" href="kalkulyator-massy-granita.html">Калькулятор массы гранита</a></div>
    </section>
  </main>
  ${footer("")}
</body>
</html>
`;
}

function productPhoto(product, prefix, compact) {
  const stone = stoneById[product.granites[0]];
  const photoKey = `product.${product.id}.photo`;
  const shots = imageGallery("products", product.id);
  if (shots.length > 1 && !compact) {
    return photoCarousel(shots, prefix, product.name, photoKey, compact);
  }
  if (shots.length) {
    const caption = compact ? "" : `<figcaption>${esc(product.name)}</figcaption>`;
    return `<figure class="stone-photo" data-photo="${photoKey}">
        <img src="${prefix}${shots[0]}" alt="${esc(product.name)}" loading="lazy" />
        ${caption}
      </figure>`;
  }
  const caption = compact
    ? ""
    : `<figcaption>Фото появится здесь: images/products/${esc(product.id)}.webp</figcaption>`;
  return `<figure class="stone-photo" data-photo="${photoKey}">
        <!-- Фото продукции подставляет админка в images/products/${product.id}.webp -->
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
  const paving = product.id === "bruschatka"
    ? `\n          <p class="card-calc"><a href="kalkulyator-bruschatki.html">Калькулятор брусчатки</a></p>`
    : "";
  return `<article class="stone-card">
        <a class="card-main" href="produkciya/${product.id}.html">
          ${productPhoto(product, "", true)}
          <h2 data-edit="product.${product.id}.name">${esc(product.name)}</h2>
          <p data-edit="product.${product.id}.summary">${esc(product.summary)}</p>
        </a>
        <div class="stone-links">
          <p>Используемые граниты</p>
          <ul>${graniteLinks(product, "")}</ul>${paving}
        </div>
      </article>`;
}

function productGroups(list) {
  return ["memorial", "construction"].map((category) => {
    const items = list.filter((product) => product.category === category);
    if (!items.length) return "";
    return `<section class="product-block" id="${category}" aria-labelledby="heading-${category}">
      <h2 id="heading-${category}">${CATEGORY_LABEL[category]}</h2>
      <p class="tool-links"><a href="kalkulyator-massy-granita.html">${category === "memorial" ? "калькулятор массы гранита" : "рассчитать вес изделия из гранита"}</a></p>
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
    description: articleDescription(article),
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
  return `${head("../", article.seoTitle || product.name, articleDescription(article), productStructuredData(product, article), article.keywords)}
  ${nav("../", "products")}
  <main class="page">
    <p class="crumbs"><a href="../produkciya.html">Продукция</a><span aria-hidden="true">/</span><span data-edit="product.${product.id}.name">${esc(product.name)}</span></p>
    <section class="stone-hero">
      <div class="stone-copy">
        <p class="eyebrow">${esc(CATEGORY_LABEL[product.category])}</p>
        <h1 data-edit="product.${product.id}.headline">${esc(article.headline)}</h1>
        ${article.lead.map((paragraph, leadIndex) => `<p class="lead" data-edit="product.${product.id}.lead.${leadIndex}">${esc(paragraph)}</p>`).join("")}
        <div class="hero-actions">
          ${product.id === "bruschatka"
            ? `<a class="btn btn-primary" href="../kalkulyator-bruschatki.html">Калькулятор брусчатки</a>`
            : `<a class="btn btn-primary" href="../kalkulyator-massy-granita.html">Рассчитать массу</a>`}
          <a class="btn btn-primary btn-lead js-lead" href="#zayavka" data-lead-topic="${esc(product.name)}">Оставить заявку</a>
        </div>
        ${consentNote("../")}
      </div>
      ${productPhoto(product, "../")}
    </section>
    <section class="stone-section" aria-label="Используемые граниты">
      <h2>Используемые граниты</h2>
      <ul class="stone-links">${graniteLinks(product, "../")}</ul>
    </section>
    ${story(article, `product.${product.id}`)}
    <nav class="pager" aria-label="Соседние изделия">${pager}</nav>
  </main>
  ${footer("../")}
</body>
</html>
`;
}

function productsPage(list) {
  return `${searchHead("", pagesCopy.products.seo, seoDefaults.products.title, seoDefaults.products.description)}
  ${nav("", "products")}
  <main class="page">
    <section class="page-intro">
      <p class="eyebrow">Каталог</p>
      <h1 data-edit="products.h1">${esc(pagesCopy.products.h1)}</h1>
      <p class="lead" data-edit="products.lead">${esc(pagesCopy.products.lead)}</p>
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
fs.writeFileSync(path.join(root, "galereya.html"), galleryPage());
writeSitemap(orderedProducts);
console.log(`wrote vidy.html, produkciya.html, galereya.html, sitemap.xml, ${stones.length} stone pages, ${orderedProducts.length} product pages`);

function writeSitemap(productList) {
  const base = "https://samoilovjob-max.github.io/granity-karelii/";
  const urls = [
    "",
    "o-kompanii.html",
    "vidy.html",
    "produkciya.html",
    "galereya.html",
    "kalkulyator-massy-granita.html",
    "kalkulyator-bruschatki.html",
    "kontakty.html",
    "postavka-granita-petrozavodsk-kareliya.html",
    "politika.html",
    ...stones.map((stone) => `granity/${stone.id}.html`),
    ...productList.map((product) => `produkciya/${product.id}.html`)
  ];
  const body = urls.map((url) => `  <url><loc>${base}${url}</loc></url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync(path.join(root, "sitemap.xml"), xml);
}

function galleryPage() {
  const items = Array.isArray(gallery.items) ? gallery.items : [];
  const figures = items.map((item) => `<figure>
        <img src="${esc(item.src)}" alt="${esc(item.caption || gallery.title)}" loading="lazy" />
        ${item.caption ? `<figcaption data-caption="${esc(item.id)}">${esc(item.caption)}</figcaption>` : `<figcaption data-caption="${esc(item.id)}"></figcaption>`}
      </figure>`).join("\n");
  const grid = items.length
    ? `<section class="gallery-grid" id="gallery-root" aria-label="Фотографии">${figures}</section>`
    : `<section class="gallery-grid" id="gallery-root" aria-label="Фотографии"><p class="gallery-empty">Фотографии работ появятся здесь.</p></section>`;
  return `${searchHead("", gallery.seo, `${gallery.title} — Граниты Карелии`, gallery.lead)}
  ${nav("", "gallery")}
  <main class="page">
    <section class="page-intro">
      <p class="eyebrow">Галерея</p>
      <h1 data-edit="gallery.title">${esc(gallery.title)}</h1>
      <p class="lead" data-edit="gallery.lead">${esc(gallery.lead)}</p>
    </section>
    ${grid}
  </main>
  ${footer("", "Камнеобработка в Карелии")}
</body>
</html>
`;
}
