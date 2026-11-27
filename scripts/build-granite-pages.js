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
const SITE_URL = String(site.siteUrl || "https://granit-karel.ru").replace(/\/$/, "");
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/granites/gabbro-diabaz/01-polirovka.webp`;

function absoluteUrl(pagePath = "") {
  const clean = String(pagePath || "").replace(/^\//, "");
  return clean ? `${SITE_URL}/${clean}` : `${SITE_URL}/`;
}

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

function mobileVariantSrc(src) {
  const rel = String(src || "").replace(/^\//, "");
  if (!rel || !/\.webp$/i.test(rel)) return "";
  const variantRel = rel.replace(/\.webp$/i, ".w720.webp");
  return fs.existsSync(path.join(root, variantRel)) ? variantRel : "";
}

function withMobileSrc(item) {
  if (!item || !item.src) return item;
  const srcMobile = mobileVariantSrc(item.src);
  return srcMobile ? { ...item, srcMobile } : item;
}

function nav(prefix, active) {
  const href = (file) => `${prefix}${file}`;
  const item = (file, label, key) =>
    `<a${active === key ? ' class="is-active"' : ""} href="${href(file)}">${label}</a>`;
  const usefulActive = active === "calc" || active === "useful";
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
        <details class="nav-useful">
          <summary${usefulActive ? ' class="is-active"' : ""}>Полезно</summary>
          <div class="nav-useful-menu">
            <a href="${href("kalkulyator-massy-granita.html")}">Калькулятор массы</a>
            <a href="${href("kalkulyator-bruschatki.html")}">Калькулятор брусчатки</a>
            <a href="${href("postavka-granita-petrozavodsk-kareliya.html")}">Поставка и доставка</a>
            <a href="${href("polezno/buchardirovanie-granita.html")}">Бучардирование гранита</a>
            <a href="${href("polezno/svojstva-gabbro-diabaza-i-amfibolita.html")}">Свойства габбро и амфиболита</a>
            <a href="${href("polezno/karery-karelii.html")}">Карьеры Карелии</a>
          </div>
        </details>
        <a${active === "contacts" ? ' class="is-active"' : ""} href="${href("kontakty.html")}">Контакты</a>
      </nav>
    </div>
  </header>`;
}

function consentNote(prefix) {
  return `<p class="consent-note">Заявка уходит на почту производства и на сайте не сохраняется. Отправляя заявку, вы соглашаетесь на <a href="${prefix}politika.html">обработку персональных данных</a>.</p>`;
}

function footer(prefix) {
  return `<footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-col footer-id">
        <a class="brand" href="${prefix}index.html" aria-label="Граниты Карелии">
          <img src="${prefix}images/brand/logo-gk-transparent.svg" alt="" width="36" height="36" />
          <span>Граниты Карелии</span>
        </a>
        <ul class="footer-contacts">
          <li><span data-edit="site.legalName">${esc(site.legalName || "ООО «ГРАНИТЫ КАРЕЛИИ»")}</span>, ИНН <span class="footer-inn" data-edit="site.inn">${esc(site.inn)}</span></li>
          <li class="footer-copy">© 2014 Граниты Карелии</li>
        </ul>
      </div>
      <div class="footer-col footer-mid">
        <ul class="footer-contacts">
          <li class="footer-phone">
            <a href="tel:${esc(site.phoneTel)}" data-edit="site.phone" data-bind="tel">${esc(site.phone)}</a>
            <span class="footer-apps">
              <a href="https://wa.me/${esc(site.phoneTel.replace(/^\+/, ""))}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><img src="${prefix}images/messengers/whatsapp.webp" alt="" width="18" height="18" loading="lazy" /></a>
              <a href="${esc(site.telegramUrl || `https://t.me/+${site.phoneTel.replace(/^\+/, "")}`)}" target="_blank" rel="noopener noreferrer" aria-label="Telegram"><img src="${prefix}images/messengers/telegram.webp" alt="" width="18" height="18" loading="lazy" /></a>
              <a href="${esc(site.maxUrl || "https://max.ru/")}" target="_blank" rel="noopener noreferrer" aria-label="MAX"><img src="${prefix}images/messengers/max.webp" alt="" width="18" height="18" loading="lazy" /></a>
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
  </footer>
  <script src="${prefix}js/nav.js" defer></script>
  <script src="${prefix}js/carousel.js" defer></script>
  <script src="${prefix}js/gallery.js" defer></script>
  <script src="${prefix}js/phone-countries.js" defer></script>
  <script src="${prefix}js/lead.js" defer></script>`;
}

function metrikaSnippet() {
  const id = String(site.metrikaId || "").trim();
  if (!/^\d+$/.test(id)) return "";
  return `<!-- Yandex.Metrika counter -->
<script type="text/javascript">
   window.GK_METRIKA_ID = ${id};
   (function(){
     var started = false;
     function boot(){
       if (started) return;
       started = true;
       (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
       m[i].l=1*new Date();
       for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
       k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
       (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
       ym(${id}, "init", { clickmap:false, trackLinks:true, accurateTrackBounce:true, webvisor:false });
     }
     ["pointerdown","keydown","touchstart","scroll"].forEach(function(type){
       window.addEventListener(type, boot, { once:true, passive:true });
     });
     window.addEventListener("load", function(){ setTimeout(boot, 8000); });
   })();
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/${id}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- /Yandex.Metrika counter -->
`;
}

function head(prefix, title, description, extra = "", pagePath = "", ogImage = DEFAULT_OG_IMAGE) {
  const pageUrl = absoluteUrl(pagePath);
  const shareImage = ogImage || DEFAULT_OG_IMAGE;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:type" content="website" />
  <link rel="canonical" href="${esc(pageUrl)}" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta property="og:locale" content="ru_RU" />
  <meta property="og:image" content="${esc(shareImage)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(shareImage)}" />
  ${extra}
  <link rel="icon" href="${prefix}favicon.ico" sizes="32x32" />
  <link rel="icon" type="image/svg+xml" href="${prefix}images/brand/logo-gk-transparent.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="${prefix}images/brand/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="180x180" href="${prefix}images/brand/apple-touch-icon.png" />
  <link rel="apple-touch-icon" href="${prefix}images/brand/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap" />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${prefix}css/styles.css" />
  ${metrikaSnippet()}</head>
<body>`;
}

function photoCarousel(rels, prefix, name, photoKey, compact) {
  const slides = rels
    .map((rel, index) => {
      const src = `${prefix}${rel}`;
      const imgAttrs =
        index === 0
          ? `src="${src}" width="800" height="600"`
          : `data-src="${src}" width="800" height="600"`;
      return `<div class="photo-carousel-slide${index === 0 ? " is-active" : ""}" data-index="${index}" role="group" aria-roledescription="слайд" aria-label="${index + 1} из ${rels.length}">
          <img ${imgAttrs} alt="${esc(name)} оптом от производителя" draggable="false" />
        </div>`;
    })
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
        <img src="${prefix}${gallery[0]}" alt="${esc(stone.name)}" width="800" height="600" loading="lazy" />
        ${caption}
      </figure>`;
  }
  return `<figure class="stone-photo stone-photo--await" data-photo="${photoKey}">
        <!-- Фото породы: images/granites/${stone.id}/ — пока временный UX -->
        ${photoAwait(stone.name, {
          compact,
          topic: compact ? "" : `${stone.name} — фото образца`,
          leadHref: "#zayavka"
        })}
      </figure>`;
}

function cardLead(article) {
  const text = article.lead[0];
  const cut = text.search(/\.\s/);
  return cut === -1 ? text : text.slice(0, cut + 1);
}

function isPositioning(section) {
  const title = String(section.title || "");
  if (/^6\.\s/.test(title)) return true;
  if (/позиционирование|причин выбрать|выбирают нас|почему (клиенты|нас)/i.test(title)) return true;
  const blocks = Array.isArray(section.blocks) ? section.blocks : [];
  return blocks.some((block) => /👉|ОСТАВИТЬ ЗАЯВКУ|ПОЗВОНИТЬ СЕЙЧАС/.test(String(block.text || "")));
}

function sectionPlainText(section) {
  return section.blocks.map((block) => {
    if (block.type === "p") return block.text;
    return block.items.map((item) => `${item.label}: ${item.text}`).join(" ");
  }).join(" ");
}

/** Убрать CTA/эмодзи и обрезать текст до длины сниппета (~160). */
function scrubSeoJunk(text) {
  return String(text || "")
    .replace(/👉\s*\[[^\]]*\]/g, " ")
    .replace(/📞\s*\[[^\]]*\]/g, " ")
    .replace(/[✔✅❌⚠⚠️📌✨🔥💡⭐️⭐]/gu, " ")
    .replace(/Почему клиенты выбирают нас\?[\s\S]*$/i, " ")
    .replace(/Не откладывайте[\s\S]*$/i, " ")
    .replace(/Заполните форму[\s\S]*$/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clipSeoDescription(text, max = 170) {
  const clean = scrubSeoJunk(text);
  if (!clean) return "";
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max - 1);
  const dot = slice.lastIndexOf(". ");
  const comma = slice.lastIndexOf(", ");
  const space = slice.lastIndexOf(" ");
  let cut = slice;
  if (dot >= max * 0.55) cut = slice.slice(0, dot + 1);
  else if (comma >= max * 0.55) cut = slice.slice(0, comma);
  else if (space >= max * 0.55) cut = slice.slice(0, space);
  cut = cut.replace(/[,:;–—\-]\s*$/u, "").trim();
  if (!cut) cut = clean.slice(0, max - 1).trim();
  return /[.!?…]$/u.test(cut) ? cut : `${cut}…`;
}

// Своё seoDescription из админки; иначе только meta/lead — без блока позиционирования и CTA.
function articleDescription(article) {
  if (article.seoDescription && String(article.seoDescription).trim()) {
    return clipSeoDescription(article.seoDescription, 170);
  }
  const source = article.meta || (Array.isArray(article.lead) && article.lead[0]) || "";
  return clipSeoDescription(source, 170);
}

function searchHead(prefix, stored, fallbackTitle, fallbackDescription, extra = "", pagePath = "", ogImage = DEFAULT_OG_IMAGE) {
  const seo = stored && typeof stored === "object" ? stored : {};
  const title = String(seo.title || fallbackTitle);
  const description = String(seo.description || fallbackDescription);
  return head(prefix, title, description, extra, pagePath, ogImage);
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

function ldJson(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function breadcrumbList(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path || "")
    }))
  };
}

function collectionPageLd(name, description, path, { image = DEFAULT_OG_IMAGE, crumbName = name, itemList } = {}) {
  const page = {
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    image,
    isPartOf: { "@type": "WebSite", name: "Граниты Карелии", url: `${SITE_URL}/` },
    provider: { "@type": "Organization", name: "Граниты Карелии", url: `${SITE_URL}/` }
  };
  if (itemList) page.mainEntity = itemList;
  return ldJson({
    "@context": "https://schema.org",
    "@graph": [
      page,
      breadcrumbList([
        { name: "Главная", path: "" },
        { name: crumbName, path }
      ])
    ]
  });
}

function structuredData(stone, article) {
  const shots = imageGallery("granites", stone.id);
  const product = {
    "@type": "Product",
    name: stone.name,
    alternateName: stone.latin,
    url: absoluteUrl(`granity/${stone.id}.html`),
    description: articleDescription(article),
    brand: { "@type": "Brand", name: "Граниты Карелии" }
  };
  if (shots[0]) product.image = absoluteUrl(shots[0]);
  return ldJson({
    "@context": "https://schema.org",
    "@graph": [
      product,
      breadcrumbList([
        { name: "Главная", path: "" },
        { name: "Виды гранитов", path: "vidy.html" },
        { name: stone.name, path: `granity/${stone.id}.html` }
      ])
    ]
  });
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

  const stoneOg = (() => {
    const shots = imageGallery("granites", stone.id);
    return shots[0] ? absoluteUrl(shots[0]) : DEFAULT_OG_IMAGE;
  })();
  return `${head("../", article.seoTitle, articleDescription(article), structuredData(stone, article), `granity/${stone.id}.html`, stoneOg)}
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
    <section class="cta-band section-gap lead-mid-cta" aria-label="Заявка на расчёт">
      <h2>Нужен расчёт по этой породе?</h2>
      <p>Пришлите объём и город — посчитаем партию и спецификацию.</p>
      <div class="hero-actions">
        <a class="btn btn-primary btn-lead js-lead" href="#zayavka" data-lead-topic="${esc(stone.name)}">Запросить расчёт</a>
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
        <p>${esc(cardLead(articleById[stone.id]))}</p>
        <p class="density">${esc(stone.density)}</p>
      </a>`).join("\n");

  const catalogSeoTitle = String((pagesCopy.catalog.seo && pagesCopy.catalog.seo.title) || seoDefaults.catalog.title);
  const catalogSeoDesc = String((pagesCopy.catalog.seo && pagesCopy.catalog.seo.description) || seoDefaults.catalog.description);
  const catalogOg = DEFAULT_OG_IMAGE;
  const catalogLd = collectionPageLd(catalogSeoTitle, catalogSeoDesc, "vidy.html", {
    image: catalogOg,
    crumbName: "Виды гранитов",
    itemList: {
      "@type": "ItemList",
      itemListElement: stones.map((stone, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: stone.name,
        url: absoluteUrl(`granity/${stone.id}.html`)
      }))
    }
  });
  return `${searchHead("", pagesCopy.catalog.seo, seoDefaults.catalog.title, seoDefaults.catalog.description, catalogLd, "vidy.html", catalogOg)}
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

function photoAwait(name, { compact = false, topic = "", leadHref = "#zayavka" } = {}) {
  const label = esc(name);
  if (compact) {
    return `<div class="photo-await photo-await--compact" role="img" aria-label="Фото по запросу: ${label}">
        <span class="photo-await-title">Фото по запросу</span>
      </div>`;
  }
  const topicAttr = topic ? ` data-lead-topic="${esc(topic)}"` : "";
  return `<div class="photo-await" role="img" aria-label="Фото партии по запросу: ${label}">
        <p class="photo-await-title">Фото партии по запросу</p>
        <p class="photo-await-text">Пришлём актуальные снимки со склада вместе с расчётом партии.</p>
        <a class="btn btn-primary btn-lead js-lead" href="${esc(leadHref)}"${topicAttr}>Запросить фото</a>
      </div>`;
}

function productPhoto(product, prefix, compact) {
  const photoKey = `product.${product.id}.photo`;
  const shots = imageGallery("products", product.id);
  if (shots.length > 1 && !compact) {
    return photoCarousel(shots, prefix, product.name, photoKey, compact);
  }
  if (shots.length) {
    const caption = compact ? "" : `<figcaption>${esc(product.name)}</figcaption>`;
    return `<figure class="stone-photo" data-photo="${photoKey}">
        <img src="${prefix}${shots[0]}" alt="${esc(product.name)}" width="800" height="600" loading="lazy" />
        ${caption}
      </figure>`;
  }
  const topic = compact ? "" : `${product.name} — фото партии`;
  return `<figure class="stone-photo stone-photo--await" data-photo="${photoKey}">
        <!-- Фото продукции: images/products/${product.id}/ — пока временный UX -->
        ${photoAwait(product.name, { compact, topic, leadHref: "#zayavka" })}
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
  const shots = imageGallery("products", product.id);
  const productLd = {
    "@type": "Product",
    name: product.name,
    category: CATEGORY_LABEL[product.category],
    url: absoluteUrl(`produkciya/${product.id}.html`),
    description: articleDescription(article),
    brand: { "@type": "Brand", name: "Граниты Карелии" }
  };
  if (shots[0]) productLd.image = absoluteUrl(shots[0]);
  return ldJson({
    "@context": "https://schema.org",
    "@graph": [
      productLd,
      breadcrumbList([
        { name: "Главная", path: "" },
        { name: "Продукция", path: "produkciya.html" },
        { name: product.name, path: `produkciya/${product.id}.html` }
      ])
    ]
  });
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
  const productOg = (() => {
    const shots = imageGallery("products", product.id);
    return shots[0] ? absoluteUrl(shots[0]) : DEFAULT_OG_IMAGE;
  })();
  return `${head("../", article.seoTitle || product.name, articleDescription(article), productStructuredData(product, article), `produkciya/${product.id}.html`, productOg)}
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
    <section class="cta-band section-gap lead-mid-cta" aria-label="Заявка на расчёт">
      <h2>Нужен расчёт по этому изделию?</h2>
      <p>Пришлите объём и город — посчитаем партию под вашу машину.</p>
      <div class="hero-actions">
        <a class="btn btn-primary btn-lead js-lead" href="#zayavka" data-lead-topic="${esc(product.name)}">Запросить расчёт</a>
      </div>
    </section>
    <nav class="pager" aria-label="Соседние изделия">${pager}</nav>
  </main>
  ${footer("../")}
</body>
</html>
`;
}

function productsPage(list) {
  const productsSeoTitle = String((pagesCopy.products.seo && pagesCopy.products.seo.title) || seoDefaults.products.title);
  const productsSeoDesc = String((pagesCopy.products.seo && pagesCopy.products.seo.description) || seoDefaults.products.description);
  const productsOg = absoluteUrl("images/products/nadgrobiya/005_kompleks-na-kladbishche.webp");
  const productsLd = collectionPageLd(productsSeoTitle, productsSeoDesc, "produkciya.html", {
    image: productsOg,
    crumbName: "Продукция",
    itemList: {
      "@type": "ItemList",
      itemListElement: list.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: product.name,
        url: absoluteUrl(`produkciya/${product.id}.html`)
      }))
    }
  });
  return `${searchHead("", pagesCopy.products.seo, seoDefaults.products.title, seoDefaults.products.description, productsLd, "produkciya.html", productsOg)}
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
syncHomeProductsCarousel();
syncHomeBlocksCarousel();
syncHomeStonesCarousel();
optimizeHomePlantImages();
ensureHomeLcpPreload();
writeSitemap(orderedProducts);
console.log(`wrote vidy.html, produkciya.html, galereya.html, sitemap.xml, ${stones.length} stone pages, ${orderedProducts.length} product pages`);

function writeSitemap(productList) {
  const base = `${SITE_URL}/`;
  const lastmod = new Date().toISOString().slice(0, 10);
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
    "soglashenie.html",
    "polezno/buchardirovanie-granita.html",
    "polezno/svojstva-gabbro-diabaza-i-amfibolita.html",
    "polezno/karery-karelii.html",
    ...stones.map((stone) => `granity/${stone.id}.html`),
    ...productList.map((product) => `produkciya/${product.id}.html`)
  ];
  const body = urls
    .map(
      (url) =>
        `  <url>\n    <loc>${base}${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync(path.join(root, "sitemap.xml"), xml);
}

function galleryCard(item, index) {
  const title = item.title || item.caption || gallery.title;
  const stone = item.stone || "";
  const category = item.category || "workshop";
  const workshop = category === "workshop";
  const topic = stone ? `${title} (${stone})` : title;
  const meta = workshop
    ? ""
    : `<div class="gallery-card-meta">
        <p class="gallery-card-title">${esc(title)}</p>
        ${stone ? `<p class="gallery-card-stone">${esc(stone)}</p>` : ""}
      </div>`;
  return `<article class="gallery-card${workshop ? " gallery-card--workshop" : ""}" data-category="${esc(category)}" data-id="${esc(item.id)}" data-title="${esc(title)}" data-stone="${esc(stone)}" data-lead-topic="${esc(topic)}">
      <button type="button" class="gallery-card-media" aria-label="Открыть фото: ${esc(title)}">
        <img src="${esc(item.src)}" alt="${esc(title)}${stone ? ` — ${esc(stone)}` : ""}" width="${workshop ? 960 : 800}" height="${workshop ? 600 : 1000}"${index < 3 ? "" : ' loading="lazy"'} />
      </button>
      ${meta}
    </article>`;
}

function galleryPage() {
  const items = Array.isArray(gallery.items) ? gallery.items : [];
  const filters = Array.isArray(gallery.filters) && gallery.filters.length
    ? gallery.filters
    : [
        { id: "all", label: "Все работы" },
        { id: "memorial", label: "Памятники и стелы" },
        { id: "turned", label: "Вазы и балясины" },
        { id: "construction", label: "Плиты и стройматериалы" },
        { id: "workshop", label: "Цех и отгрузка" }
      ];
  const catalog = items.filter((item) => item.category !== "workshop");
  const workshop = items.filter((item) => item.category === "workshop");
  const filterBar = `<div class="gallery-filters" role="tablist" aria-label="Фильтр галереи">
      ${filters.map((f, i) => `<button type="button" class="gallery-filter${i === 0 ? " is-active" : ""}" role="tab" aria-selected="${i === 0 ? "true" : "false"}" data-filter="${esc(f.id)}">${esc(f.label)}</button>`).join("")}
    </div>`;
  const catalogGrid = catalog.length
    ? `<section class="gallery-block" data-gallery-block="catalog">
      <h2 class="gallery-block-title">Готовые изделия</h2>
      <div class="gallery-grid gallery-grid--catalog" aria-label="Каталожные фото">${catalog.map((item, i) => galleryCard(item, i)).join("\n")}</div>
    </section>`
    : "";
  const workshopGrid = workshop.length
    ? `<section class="gallery-block" data-gallery-block="workshop">
      <h2 class="gallery-block-title">Производство и склад</h2>
      <div class="gallery-grid gallery-grid--workshop" aria-label="Фото с производства">${workshop.map((item, i) => galleryCard(item, i + catalog.length)).join("\n")}</div>
    </section>`
    : "";
  const body = items.length
    ? `${filterBar}<div id="gallery-root">${catalogGrid}${workshopGrid}</div>`
    : `<section class="gallery-grid" id="gallery-root" aria-label="Фотографии"><p class="gallery-empty">Фотографии работ появятся здесь.</p></section>`;
  const galleryTitle = String((gallery.seo && gallery.seo.title) || `${gallery.title} — Граниты Карелии`);
  const galleryDesc = String((gallery.seo && gallery.seo.description) || gallery.lead);
  const galleryOg = absoluteUrl(
    (items[0] && items[0].src) || "images/production/ceh-raspilovka-01.webp"
  );
  const galleryLd = collectionPageLd(galleryTitle, galleryDesc, "galereya.html", {
    image: galleryOg,
    crumbName: "Галерея"
  });
  return `${searchHead("", gallery.seo, `${gallery.title} — Граниты Карелии`, gallery.lead, galleryLd, "galereya.html", galleryOg)}
  ${nav("", "gallery")}
  <main class="page">
    <section class="page-intro">
      <p class="eyebrow">Галерея</p>
      <h1 data-edit="gallery.title">${esc(gallery.title)}</h1>
      <p class="lead" data-edit="gallery.lead">${esc(gallery.lead)}</p>
    </section>
    ${body}
  </main>
  ${footer("")}
</body>
</html>
`;
}

/** Gallery photos for the home blocks carousel: explicit tag or caption with «блок». */
function isBlockGalleryItem(item) {
  if (!item || !item.src) return false;
  if (Array.isArray(item.tags) && item.tags.includes("blocks")) return true;
  return /блок/i.test(String(item.caption || item.title || ""));
}

function homeCarouselMarkup({
  start,
  end,
  label,
  interval,
  items,
  indent = "    ",
  figureClass = "home-photo home-photo--carousel section-gap",
  firstPriority = false
}) {
  if (!items.length) {
    return `${start}
${indent}<!-- нет фото для карусели «${label}» -->
${indent}${end}`;
  }
  const slides = items
    .map((item, index) => {
      const alt = esc(item.alt || label);
      const src = esc(item.src);
      const mobileSrc = esc(item.srcMobile || "");
      // Do not put the full-size file in srcset: mobile DPR would pick it and kill LCP.
      const srcset = mobileSrc
        ? ` srcset="${mobileSrc} 720w" sizes="(max-width: 767px) 100vw, min(560px, 46vw)"`
        : "";
      const deferredMobile = mobileSrc ? ` data-src-mobile="${mobileSrc}"` : "";
      const fullAttr = ` data-full="${src}"`;
      const attrs =
        index === 0 && firstPriority
          ? `src="${mobileSrc || src}" width="1200" height="800" fetchpriority="high"${srcset}${fullAttr}`
          : index === 0
            ? `src="${mobileSrc || src}" width="1200" height="800"${srcset}${fullAttr}`
            : `data-src="${src}"${deferredMobile}${fullAttr} width="1200" height="800"`;
      return `<div class="photo-carousel-slide${index === 0 ? " is-active" : ""}" data-index="${index}" role="group" aria-roledescription="слайд" aria-label="${index + 1} из ${items.length}">
          <img ${attrs} alt="${alt}" draggable="false" />
        </div>`;
    })
    .join("");
  const dots = items
    .map(
      (_, index) =>
        `<button type="button" class="photo-carousel-dot${index === 0 ? " is-active" : ""}" data-index="${index}" aria-label="Фото ${index + 1}"${index === 0 ? ' aria-current="true"' : ""}></button>`
    )
    .join("");
  return `${start}
${indent}<figure class="${figureClass}">
${indent}  <div class="photo-carousel" data-carousel data-interval="${interval}" aria-roledescription="карусель" aria-label="${esc(label)}">
${indent}    <div class="photo-carousel-track" data-track>${slides}</div>
${indent}    <button type="button" class="photo-carousel-nav photo-carousel-prev" data-prev aria-label="Предыдущее фото">‹</button>
${indent}    <button type="button" class="photo-carousel-nav photo-carousel-next" data-next aria-label="Следующее фото">›</button>
${indent}    <div class="photo-carousel-dots" role="tablist" aria-label="Выбор фото">${dots}</div>
${indent}  </div>
${indent}</figure>
${indent}${end}`;
}

function syncHomeProductsCarousel() {
  const start = "<!-- HOME_PRODUCTS_CAROUSEL:start -->";
  const end = "<!-- HOME_PRODUCTS_CAROUSEL:end -->";
  const byCat = { memorial: [], turned: [], construction: [] };
  for (const item of Array.isArray(gallery.items) ? gallery.items : []) {
    if (!item || !item.src || item.category === "workshop") continue;
    if (byCat[item.category]) byCat[item.category].push(item);
  }
  const picked = [];
  const max = 12;
  for (let i = 0; picked.length < max; i++) {
    let added = false;
    for (const cat of ["memorial", "turned", "construction"]) {
      const item = byCat[cat][i];
      if (!item) continue;
      picked.push(
        withMobileSrc({
          src: item.src,
          alt: item.title || item.caption || "Готовая продукция"
        })
      );
      added = true;
      if (picked.length >= max) break;
    }
    if (!added) break;
  }
  const markup = homeCarouselMarkup({
    start,
    end,
    label: "Готовая продукция",
    interval: 8000,
    items: picked,
    indent: "      ",
    figureClass: "home-photo home-hero-photo home-photo--carousel",
    firstPriority: true
  });
  patchIndexCarousel(start, end, markup, "home products carousel", picked.length);
}

function patchIndexCarousel(start, end, markup, logLabel, count) {
  const indexPath = path.join(root, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  const from = html.indexOf(start);
  const to = html.indexOf(end);
  if (from === -1 || to === -1 || to < from) {
    console.warn(`${logLabel} markers missing in index.html`);
    return;
  }
  html = `${html.slice(0, from)}${markup}${html.slice(to + end.length)}`;
  fs.writeFileSync(indexPath, html);
  console.log(`${logLabel}: ${count} photo(s)`);
}

function syncHomeBlocksCarousel() {
  const start = "<!-- HOME_BLOCKS_CAROUSEL:start -->";
  const end = "<!-- HOME_BLOCKS_CAROUSEL:end -->";
  const items = (Array.isArray(gallery.items) ? gallery.items : [])
    .filter(isBlockGalleryItem)
    .map((item) => withMobileSrc({ src: item.src, alt: item.caption || "Блоки гранита" }));
  const markup = homeCarouselMarkup({
    start,
    end,
    label: "Блоки гранита",
    interval: 7000,
    items
  });
  patchIndexCarousel(start, end, markup, "home blocks carousel", items.length);
}

function syncHomeStonesCarousel() {
  const start = "<!-- HOME_STONES_CAROUSEL:start -->";
  const end = "<!-- HOME_STONES_CAROUSEL:end -->";
  const items = stones
    .map((stone) => {
      const shots = imageGallery("granites", stone.id);
      if (!shots.length) return null;
      return withMobileSrc({ src: shots[0], alt: stone.name });
    })
    .filter(Boolean);
  const markup = homeCarouselMarkup({
    start,
    end,
    label: "Виды гранита",
    interval: 8000,
    items,
    indent: "      "
  });
  patchIndexCarousel(start, end, markup, "home stones carousel", items.length);
}

function optimizeHomePlantImages() {
  const indexPath = path.join(root, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  html = html.replace(
    /<img src="(images\/production\/[^"]+\.webp)"([^>]*) loading="lazy"([^>]*)>/g,
    (match, src, pre, post) => {
      const mobile = mobileVariantSrc(src);
      const mobileAttr = mobile ? ` data-src-mobile="${mobile}"` : "";
      return `<img data-src="${src}"${mobileAttr} data-full="${src}"${pre}${post}>`;
    }
  );
  html = html.replace(/<img src="(images\/production\/[^"]+\.webp)"([^>]*?)>/g, (match, src, rest) => {
    if (/data-src=/.test(rest)) return match;
    const mobile = mobileVariantSrc(src);
    if (!mobile) return match;
    const cleaned = rest.replace(/\s*srcset="[^"]*"/g, "").replace(/\s*sizes="[^"]*"/g, "").replace(/\s*data-full="[^"]*"/g, "");
    return `<img src="${mobile}" srcset="${mobile} 720w" sizes="(max-width: 767px) 100vw, min(560px, 46vw)" data-full="${src}"${cleaned}>`;
  });
  // Already converted to .w720.webp but still listing full file in srcset
  html = html.replace(
    /<img src="(images\/production\/[^"]+\.w720\.webp)"([^>]*)>/g,
    (match, mobile, rest) => {
      const full = mobile.replace(/\.w720\.webp$/i, ".webp");
      const cleaned = rest.replace(/\s*srcset="[^"]*"/g, "").replace(/\s*sizes="[^"]*"/g, "").replace(/\s*data-full="[^"]*"/g, "");
      return `<img src="${mobile}" srcset="${mobile} 720w" sizes="(max-width: 767px) 100vw, min(560px, 46vw)" data-full="${full}"${cleaned}>`;
    }
  );
  html = html.replace(
    /<img data-src="(images\/production\/[^"]+\.webp)"([^>]*)>/g,
    (match, src, rest) => {
      const mobile = mobileVariantSrc(src);
      if (!mobile) return match;
      let next = rest;
      if (!/data-src-mobile=/.test(next)) next = ` data-src-mobile="${mobile}"${next}`;
      if (!/data-full=/.test(next)) next = ` data-full="${src}"${next}`;
      return `<img data-src="${src}"${next}>`;
    }
  );
  fs.writeFileSync(indexPath, html);
}

function ensureHomeLcpPreload() {
  const indexPath = path.join(root, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  const heroMatch = html.match(
    /<img src="(images\/products\/[^"]+\.w720\.webp)"[^>]*fetchpriority="high"/
  );
  const hero = heroMatch ? heroMatch[1] : "images/products/nadgrobiya/005_kompleks-na-kladbishche.w720.webp";
  html = html.replace(/\n\s*<link rel="preload" as="image"[^>]*>/g, "");
  const preload = `  <link rel="preload" as="image" href="${hero}" imagesrcset="${hero} 720w" imagesizes="(max-width: 767px) 100vw, min(560px, 46vw)" fetchpriority="high" />`;
  html = html.replace(
    '<link rel="stylesheet" href="css/styles.css" />',
    `<link rel="stylesheet" href="css/styles.css" />\n${preload}`
  );
  fs.writeFileSync(indexPath, html);
}
