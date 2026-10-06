const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const seoDefaults = require(path.join(root, "data/seo-defaults.json"));

const paths = {
  site: path.join(root, "data/site.json"),
  pages: path.join(root, "data/pages.json"),
  gallery: path.join(root, "data/gallery.json"),
  overrides: path.join(root, "data/product-overrides.json"),
  stones: path.join(root, "scripts/stones-data.js"),
  stoneArticles: path.join(root, "scripts/stones-articles.json"),
  products: path.join(root, "scripts/products-data.js"),
  productArticles: path.join(root, "scripts/products-articles.json")
};

const HAND = {
  about: {
    title: "О компании",
    group: "Страницы",
    file: "o-kompanii.html",
    groups: [
      { title: "Шапка", open: true, fields: [
        { id: "about.h1", label: "Заголовок" },
        { id: "about.lead", label: "Вступление", type: "textarea" }
      ]},
      { title: "Собственный цех", fields: [
        { id: "about.workshop.title", label: "Заголовок блока" },
        { id: "about.workshop.text", label: "Текст", type: "textarea" }
      ]},
      { title: "Палитра пород", fields: [
        { id: "about.palette.title", label: "Заголовок блока" },
        { id: "about.palette.text", label: "Текст", type: "textarea" }
      ]},
      { title: "Что мы создаём", fields: [
        { id: "about.products.title", label: "Заголовок блока" },
        { id: "about.products.text", label: "Текст", type: "textarea" }
      ]},
      { title: "Наш подход", fields: [
        { id: "about.approach.title", label: "Заголовок блока" },
        { id: "about.approach.text", label: "Текст", type: "textarea" }
      ]}
    ]
  },
  contacts: {
    title: "Контакты",
    group: "Страницы",
    file: "kontakty.html",
    groups: [
      { title: "Шапка", open: true, fields: [
        { id: "contacts.h1", label: "Заголовок" },
        { id: "contacts.lead", label: "Вступление", type: "textarea" }
      ]},
      { title: "Производство", fields: [
        { id: "contacts.address", label: "Адрес производства", type: "textarea" },
        { id: "site.phone", label: "Телефон" },
        { id: "site.email", label: "Почта" }
      ]},
      { title: "Реквизиты", fields: [
        { id: "contacts.req.name", label: "Наименование", type: "textarea" },
        { id: "site.inn", label: "ИНН" },
        { id: "contacts.req.postal", label: "Почтовый адрес", type: "textarea" },
        { id: "contacts.req.bank", label: "Банк" },
        { id: "contacts.req.account", label: "Расчётный счёт" },
        { id: "contacts.req.corr", label: "Корр. счёт" },
        { id: "contacts.req.bik", label: "БИК" },
        { id: "contacts.req.okved", label: "ОКВЭД", type: "textarea" }
      ]}
    ]
  },
  policy: {
    title: "Персональные данные",
    group: "Страницы",
    file: "politika.html",
    groups: [
      { title: "Шапка", open: true, fields: [
        { id: "policy.h1", label: "Заголовок" },
        { id: "policy.lead", label: "Вступление", type: "textarea" }
      ]},
      { title: "Кто получает данные", fields: [
        { id: "policy.who.title", label: "Заголовок блока" },
        { id: "policy.who.operator", label: "Оператор", type: "textarea" },
        { id: "policy.who.address", label: "Почтовый адрес", type: "textarea" }
      ]},
      { title: "Какие данные и зачем", fields: [
        { id: "policy.what.title", label: "Заголовок блока" },
        { id: "policy.what.p1", label: "Абзац 1", type: "textarea" },
        { id: "policy.what.p2", label: "Абзац 2", type: "textarea" },
        { id: "policy.what.p3", label: "Абзац 3", type: "textarea" }
      ]},
      { title: "Где это хранится", fields: [
        { id: "policy.store.title", label: "Заголовок блока" },
        { id: "policy.store.p1", label: "Абзац 1", type: "textarea" },
        { id: "policy.store.p2", label: "Абзац 2", type: "textarea" }
      ]},
      { title: "Ваши права", fields: [
        { id: "policy.rights.title", label: "Заголовок блока" },
        { id: "policy.rights.p1", label: "Абзац 1", type: "textarea" },
        { id: "policy.rights.p2", label: "Абзац 2", type: "textarea" }
      ]}
    ]
  },
  polezno: {
    title: "Калькулятор массы гранитного изделия",
    group: "Полезно",
    file: "polezno.html",
    groups: [
      { title: "Шапка", open: true, fields: [
        { id: "polezno.h1", label: "Заголовок" },
        { id: "polezno.lead", label: "Вступление", type: "textarea" }
      ]}
    ]
  },
  paving: {
    title: "Калькулятор брусчатки",
    group: "Полезно",
    file: "kalkulyator-bruschatki.html",
    groups: [
      { title: "Шапка", open: true, fields: [
        { id: "paving.h1", label: "Заголовок" },
        { id: "paving.lead", label: "Вступление", type: "textarea" }
      ]},
      { title: "Как пользоваться", fields: [
        { id: "paving.how.title", label: "Заголовок" },
        { id: "paving.how.p", label: "Вступление", type: "textarea" },
        { id: "paving.how.li1", label: "Пункт 1" },
        { id: "paving.how.li2", label: "Пункт 2" },
        { id: "paving.how.li3", label: "Пункт 3" },
        { id: "paving.how.li4", label: "Пункт 4" },
        { id: "paving.how.p2", label: "Про толщину", type: "textarea" }
      ]},
      { title: "Формула", fields: [
        { id: "paving.formula.title", label: "Заголовок" },
        { id: "paving.pieces.title", label: "Штуки на м²" },
        { id: "paving.pieces.p", label: "Как считаются штуки", type: "textarea" },
        { id: "paving.pieces.example", label: "Пример штук", type: "textarea" },
        { id: "paving.reserve.title", label: "Запас" },
        { id: "paving.reserve.p", label: "Про запас", type: "textarea" },
        { id: "paving.weight.title", label: "Вес и насыпь" },
        { id: "paving.weight.p", label: "Как считается вес", type: "textarea" },
        { id: "paving.weight.p2", label: "Пример веса", type: "textarea" }
      ]},
      { title: "Характеристики", fields: [
        { id: "paving.chars.title", label: "Заголовок" },
        { id: "paving.density.title", label: "Плотность" },
        { id: "paving.density.p", label: "Про плотность", type: "textarea" },
        { id: "paving.sizes.title", label: "Размеры" },
        { id: "paving.sizes.p", label: "Подпись к таблице", type: "textarea" }
      ]},
      { title: "Зачем считать", fields: [
        { id: "paving.why.title", label: "Заголовок" },
        { id: "paving.order.title", label: "Заказ" },
        { id: "paving.order.p", label: "Про заказ", type: "textarea" },
        { id: "paving.delivery.title", label: "Доставка" },
        { id: "paving.delivery.p", label: "Про доставку", type: "textarea" }
      ]},
      { title: "Заказ", fields: [
        { id: "paving.buy.title", label: "Заголовок" },
        { id: "paving.buy.p", label: "Текст", type: "textarea" }
      ]}
    ]
  }
};

const SPEC_LABELS = {
  density: "Плотность",
  water: "Водопоглощение",
  strength: "Сжатие",
  frost: "Морозостойкость",
  wear: "Истираемость",
  radiation: "Радиация"
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

function readStones() {
  delete require.cache[require.resolve(paths.stones)];
  return require(paths.stones);
}

function readProducts() {
  delete require.cache[require.resolve(paths.products)];
  const products = require(paths.products);
  const overrides = readJson(paths.overrides);
  return products.map((product) => ({ ...product, ...(overrides[product.id] || {}) }));
}

function decodeText(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function encodeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function encodeAttr(value) {
  return encodeText(value).replace(/"/g, "&quot;");
}

function normalizeKeywords(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  const seen = new Set();
  const phrases = [];
  for (const item of list) {
    const phrase = String(item).replace(/,/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!phrase) continue;
    const key = phrase.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    phrases.push(phrase);
    if (phrases.length >= 12) break;
  }
  return phrases;
}

function cleanSearchText(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function readHeadSeo(html) {
  const title = decodeText((html.match(/<title>([^<]*)<\/title>/) || ["", ""])[1]);
  const description = decodeText((html.match(/<meta name="description" content="([^"]*)"/) || ["", ""])[1]);
  const keywordsRaw = decodeText((html.match(/<meta name="keywords" content="([^"]*)"/) || ["", ""])[1]);
  return {
    title,
    description,
    keywords: keywordsRaw.split(",").map((item) => item.trim()).filter(Boolean)
  };
}

function writeHeadSeo(html, seo) {
  const title = cleanSearchText(seo && seo.title, 300);
  const description = cleanSearchText(seo && seo.description, 4000);
  if (!title) {
    const error = new Error("Заголовок в поиске не может быть пустым");
    error.status = 400;
    throw error;
  }
  if (!description) {
    const error = new Error("Описание в поиске не может быть пустым");
    error.status = 400;
    throw error;
  }
  const keywords = normalizeKeywords(seo.keywords);
  const lines = [
    `<title>${encodeText(title)}</title>`,
    `<meta name="description" content="${encodeAttr(description)}" />`
  ];
  const keywordsContent = encodeAttr(keywords.join(", "));
  if (keywords.length) lines.push(`<meta name="keywords" content="${keywordsContent}" />`);
  lines.push(
    `<meta property="og:title" content="${encodeAttr(title)}" />`,
    `<meta property="og:description" content="${encodeAttr(description)}" />`,
    `<meta property="og:type" content="website" />`
  );
  const block = `${lines.map((line) => `  ${line}`).join("\n")}\n`;
  const pattern = /  <title>[^<]*<\/title>\n(?:  <meta (?:name="(?:description|keywords)"|property="og:[^"]+") content="[^"]*"\s*\/?>\n)*/;
  if (!pattern.test(html)) {
    const error = new Error("На странице не найден заголовок для поиска");
    error.status = 400;
    throw error;
  }
  return html.replace(pattern, block);
}

function withSeo(page, relativeFile) {
  const html = fs.readFileSync(path.join(root, relativeFile), "utf8");
  const seo = readHeadSeo(html);
  seo.url = `https://granit-karel.ru/${relativeFile.replace(/^\//, "")}`;
  return { ...page, seo };
}

function isPositioningSection(section) {
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

function defaultArticleDescription(article) {
  const positioning = (article.sections || []).find(isPositioningSection);
  return [article.meta, positioning ? sectionPlainText(positioning) : ""].filter(Boolean).join(" ");
}

function applyArticleSeo(article, seo) {
  if (!seo || typeof seo !== "object") return false;
  const title = cleanSearchText(seo.title, 300);
  const description = cleanSearchText(seo.description, 4000);
  if (!title) {
    const error = new Error("Заголовок в поиске не может быть пустым");
    error.status = 400;
    throw error;
  }
  if (!description) {
    const error = new Error("Описание в поиске не может быть пустым");
    error.status = 400;
    throw error;
  }
  let changed = false;
  if (article.seoTitle !== title) {
    article.seoTitle = title;
    changed = true;
  }
  const fallback = defaultArticleDescription(article);
  if (description === fallback) {
    if (Object.prototype.hasOwnProperty.call(article, "seoDescription")) {
      delete article.seoDescription;
      changed = true;
    }
  } else if (article.seoDescription !== description) {
    article.seoDescription = description;
    changed = true;
  }
  const keywords = normalizeKeywords(seo.keywords);
  const previous = Array.isArray(article.keywords) ? article.keywords : [];
  if (keywords.join("\n") !== previous.join("\n")) {
    if (keywords.length) article.keywords = keywords;
    else delete article.keywords;
    changed = true;
  }
  return changed;
}

function gallerySearchTitle(title) {
  return `${String(title || "").trim() || "Галерея"} — Граниты Карелии`;
}

function storedSearchSeo(input, fallbackTitle, fallbackDescription) {
  if (!input || typeof input !== "object") return undefined;
  const title = cleanSearchText(input.title, 300);
  const description = cleanSearchText(input.description, 4000);
  if (!title) {
    const error = new Error("Заголовок в поиске не может быть пустым");
    error.status = 400;
    throw error;
  }
  if (!description) {
    const error = new Error("Описание в поиске не может быть пустым");
    error.status = 400;
    throw error;
  }
  const keywords = normalizeKeywords(input.keywords);
  const seo = {};
  if (title !== fallbackTitle) seo.title = title;
  if (description !== fallbackDescription) seo.description = description;
  if (keywords.length) seo.keywords = keywords;
  return Object.keys(seo).length ? seo : undefined;
}

function readField(html, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`data-edit="${escaped}"[^>]*>([^<]*)`));
  return match ? decodeText(match[1]) : "";
}

function writeField(html, id, value) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(data-edit="${escaped}"[^>]*>)([^<]*)`, "g");
  if (!pattern.test(html)) {
    const error = new Error(`На странице нет поля «${id}»`);
    error.status = 400;
    throw error;
  }
  pattern.lastIndex = 0;
  const safe = encodeText(value);
  return html.replace(pattern, (_match, start) => start + safe);
}

function rebuild() {
  execFileSync(process.execPath, [path.join(root, "scripts/build-granite-pages.js")], {
    cwd: root,
    stdio: "pipe"
  });
}

function formatPhone(input) {
  let digits = String(input).replace(/\D/g, "");
  if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) digits = digits.slice(1);
  if (digits.length !== 10) {
    const error = new Error("Телефон нужен из 10 цифр, например 921 801 71 70");
    error.status = 400;
    throw error;
  }
  return {
    display: `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`,
    tel: `+7${digits}`
  };
}

function handFiles() {
  return Object.values(HAND).map((page) => path.join(root, page.file));
}

function applySiteFields(fields) {
  const site = readJson(paths.site);
  const next = { ...site };
  if (Object.prototype.hasOwnProperty.call(fields, "site.phone")) {
    const phone = formatPhone(fields["site.phone"]);
    fields["site.phone"] = phone.display;
    next.phone = phone.display;
    next.phoneTel = phone.tel;
  }
  if (Object.prototype.hasOwnProperty.call(fields, "site.email")) {
    const email = String(fields["site.email"]).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const error = new Error("Почта выглядит неполной");
      error.status = 400;
      throw error;
    }
    fields["site.email"] = email;
    next.email = email;
  }
  if (Object.prototype.hasOwnProperty.call(fields, "site.inn")) {
    const inn = String(fields["site.inn"]).trim();
    if (!/^\d{10,12}$/.test(inn)) {
      const error = new Error("ИНН — это 10 или 12 цифр");
      error.status = 400;
      throw error;
    }
    fields["site.inn"] = inn;
    next.inn = inn;
  }
  const changed = next.phone !== site.phone || next.email !== site.email || next.inn !== site.inn;
  if (!changed) return false;
  writeJson(paths.site, next);
  for (const file of handFiles()) {
    let html = fs.readFileSync(file, "utf8");
    if (next.phoneTel !== site.phoneTel) {
      html = html.split(site.phoneTel.replace(/\D/g, "")).join(next.phoneTel.replace(/\D/g, ""));
    }
    if (next.email !== site.email) html = html.split(site.email).join(next.email);
    if (next.inn !== site.inn) html = html.split(site.inn).join(next.inn);
    if (fields["site.phone"] !== undefined) html = writeField(html, "site.phone", next.phone);
    if (fields["site.email"] !== undefined) html = writeField(html, "site.email", next.email);
    if (fields["site.inn"] !== undefined) html = writeField(html, "site.inn", next.inn);
    fs.writeFileSync(file, html);
  }
  return true;
}

function fillHand(page) {
  const html = fs.readFileSync(path.join(root, page.file), "utf8");
  return {
    id: page.id,
    title: page.title,
    href: `/${page.file}`,
    groups: page.groups.map((group) => ({
      title: group.title,
      open: Boolean(group.open),
      fields: group.fields.map((field) => ({
        ...field,
        type: field.type || (readField(html, field.id).length > 90 ? "textarea" : "text"),
        value: readField(html, field.id)
      }))
    }))
  };
}

function stoneGroups(stone, article) {
  const key = `stone.${stone.id}`;
  const groups = [
    {
      title: "Шапка",
      open: true,
      fields: [
        { id: `${key}.name`, label: "Название в списках", value: stone.name },
        { id: `${key}.latin`, label: "Подпись латиницей", value: stone.latin },
        { id: `${key}.headline`, label: "Заголовок страницы", type: "textarea", value: article.headline },
        ...article.lead.map((paragraph, index) => ({
          id: `${key}.lead.${index}`,
          label: article.lead.length > 1 ? `Вступление, абзац ${index + 1}` : "Вступление",
          type: "textarea",
          value: paragraph
        }))
      ]
    },
    {
      title: "Характеристики",
      fields: Object.keys(SPEC_LABELS).map((name) => ({
        id: `${key}.${name}`,
        label: SPEC_LABELS[name],
        value: stone[name]
      }))
    }
  ];
  article.sections.forEach((section, sectionIndex) => {
    if (/^6\.\s/.test(section.title) || section.title.includes("Рыночное позиционирование") || section.title.includes("причин выбрать")) return;
    const fields = [{ id: `${key}.s.${sectionIndex}.title`, label: "Заголовок блока", value: section.title }];
    section.blocks.forEach((block, blockIndex) => {
      if (block.type === "p") {
        fields.push({
          id: `${key}.s.${sectionIndex}.b.${blockIndex}`,
          label: "Абзац",
          type: "textarea",
          value: block.text
        });
        return;
      }
      block.items.forEach((item, itemIndex) => {
        fields.push({
          id: `${key}.s.${sectionIndex}.b.${blockIndex}.i.${itemIndex}.label`,
          label: `Пункт ${itemIndex + 1}, заголовок`,
          value: item.label
        });
        fields.push({
          id: `${key}.s.${sectionIndex}.b.${blockIndex}.i.${itemIndex}.text`,
          label: `Пункт ${itemIndex + 1}, текст`,
          type: "textarea",
          value: item.text
        });
      });
    });
    groups.push({ title: section.title, fields });
  });
  return groups;
}

function photoInfo(dir, id, key) {
  const webp = path.join(root, "images", dir, `${id}.webp`);
  const jpg = path.join(root, "images", dir, `${id}.jpg`);
  if (fs.existsSync(webp)) return { key, url: `/images/${dir}/${id}.webp` };
  if (fs.existsSync(jpg)) return { key, url: `/images/${dir}/${id}.jpg` };
  return { key, url: "" };
}

function getPage(id) {
  if (id === "gallery") {
    const gallery = readJson(paths.gallery);
    return withSeo({
      id,
      title: "Галерея",
      href: "/galereya.html",
      mode: "gallery",
      titleText: gallery.title,
      lead: gallery.lead,
      items: gallery.items
    }, "galereya.html");
  }
  if (HAND[id]) return withSeo({ id, ...fillHand({ ...HAND[id], id }) }, HAND[id].file);
  if (id === "catalog") {
    const copy = readJson(paths.pages).catalog;
    return withSeo({
      id,
      title: "Список пород",
      href: "/vidy.html",
      groups: [
        { title: "Шапка", open: true, fields: [
          { id: "catalog.h1", label: "Заголовок", value: copy.h1 },
          { id: "catalog.lead", label: "Вступление", type: "textarea", value: copy.lead }
        ]},
        { title: "Подсказки внизу страницы", fields: [1, 2, 3, 4].flatMap((n) => [
          { id: `catalog.perk${n}.title`, label: `Блок ${n}, заголовок`, value: copy[`perk${n}`].title },
          { id: `catalog.perk${n}.text`, label: `Блок ${n}, текст`, type: "textarea", value: copy[`perk${n}`].text }
        ])}
      ]
    }, "vidy.html");
  }
  if (id === "products") {
    const copy = readJson(paths.pages).products;
    return withSeo({
      id,
      title: "Список продукции",
      href: "/produkciya.html",
      groups: [
        { title: "Шапка", open: true, fields: [
          { id: "products.h1", label: "Заголовок", value: copy.h1 },
          { id: "products.lead", label: "Вступление", type: "textarea", value: copy.lead }
        ]}
      ]
    }, "produkciya.html");
  }
  if (id.startsWith("stone:")) {
    const stoneId = id.slice(6);
    const stone = readStones().find((item) => item.id === stoneId);
    const article = readJson(paths.stoneArticles).find((item) => item.id === stoneId);
    if (!stone || !article) missing(id);
    return withSeo({
      id,
      title: stone.name,
      href: `/granity/${stoneId}.html`,
      photo: photoInfo("granites", stoneId, `stone.${stoneId}.photo`),
      groups: stoneGroups(stone, article)
    }, `granity/${stoneId}.html`);
  }
  if (id.startsWith("product:")) {
    const productId = id.slice(8);
    const product = readProducts().find((item) => item.id === productId);
    const article = readJson(paths.productArticles).find((item) => item.id === productId);
    if (!product || !article) missing(id);
    const key = `product.${productId}`;
    const groups = [
      {
        title: "Шапка",
        open: true,
        fields: [
          { id: `${key}.name`, label: "Название", value: product.name },
          { id: `${key}.summary`, label: "Текст карточки в общем списке", type: "textarea", value: product.summary },
          { id: `${key}.headline`, label: "Заголовок страницы", type: "textarea", value: article.headline },
          ...article.lead.map((paragraph, index) => ({
            id: `${key}.lead.${index}`,
            label: article.lead.length > 1 ? `Вступление, абзац ${index + 1}` : "Вступление",
            type: "textarea",
            value: paragraph
          }))
        ]
      }
    ];
    article.sections.forEach((section, sectionIndex) => {
      if (section.title.includes("причин выбрать")) return;
      const fields = [{ id: `${key}.s.${sectionIndex}.title`, label: "Заголовок блока", value: section.title }];
      section.blocks.forEach((block, blockIndex) => {
        if (block.type === "p") {
          fields.push({ id: `${key}.s.${sectionIndex}.b.${blockIndex}`, label: "Абзац", type: "textarea", value: block.text });
          return;
        }
        block.items.forEach((item, itemIndex) => {
          fields.push({ id: `${key}.s.${sectionIndex}.b.${blockIndex}.i.${itemIndex}.label`, label: `Пункт ${itemIndex + 1}, заголовок`, value: item.label });
          fields.push({ id: `${key}.s.${sectionIndex}.b.${blockIndex}.i.${itemIndex}.text`, label: `Пункт ${itemIndex + 1}, текст`, type: "textarea", value: item.text });
        });
      });
      groups.push({ title: section.title, fields });
    });
    return withSeo({
      id,
      title: product.name,
      href: `/produkciya/${productId}.html`,
      photo: photoInfo("products", productId, `product.${productId}.photo`),
      groups
    }, `produkciya/${productId}.html`);
  }
  missing(id);
}

function missing(id) {
  const error = new Error(`Нет страницы ${id}`);
  error.status = 404;
  throw error;
}

function listPages() {
  const stones = readStones();
  const products = readProducts().slice().sort((a, b) => {
    const rank = { memorial: 1, construction: 2 };
    return rank[a.category] - rank[b.category] || a.order - b.order;
  });
  return [
    { id: "about", title: "О компании", group: "Страницы" },
    { id: "contacts", title: "Контакты", group: "Страницы" },
    { id: "gallery", title: "Галерея", group: "Страницы" },
    { id: "policy", title: "Персональные данные", group: "Страницы" },
    { id: "catalog", title: "Список пород", group: "Виды гранитов" },
    ...stones.map((stone) => ({ id: `stone:${stone.id}`, title: stone.name, group: "Виды гранитов" })),
    { id: "products", title: "Список продукции", group: "Продукция" },
    ...products.map((product) => ({ id: `product:${product.id}`, title: product.name, group: "Продукция" })),
    { id: "polezno", title: "Калькулятор массы гранитного изделия", group: "Полезно" },
    { id: "paving", title: "Калькулятор брусчатки", group: "Полезно" }
  ];
}

function assignArticle(article, key, id, value) {
  const rest = key.slice(id.length + 1);
  if (rest === "headline") {
    article.headline = value;
    return;
  }
  if (rest.startsWith("lead.")) {
    article.lead[Number(rest.slice(5))] = value;
    return;
  }
  const parts = rest.split(".");
  const section = article.sections[Number(parts[1])];
  if (!section) return;
  if (parts[2] === "title") {
    section.title = value;
    return;
  }
  const block = section.blocks[Number(parts[3])];
  if (!block) return;
  if (parts.length === 4) {
    block.text = value;
    return;
  }
  const item = block.items[Number(parts[5])];
  if (!item) return;
  if (parts[6] === "label") item.label = value;
  else item.text = value;
}

function savePage(id, fields, seo) {
  if (!fields || typeof fields !== "object") {
    const error = new Error("Нет данных для сохранения");
    error.status = 400;
    throw error;
  }
  const siteChanged = applySiteFields(fields);
  if (id.startsWith("stone:")) {
    const stoneId = id.slice(6);
    const stones = readStones();
    const articles = readJson(paths.stoneArticles);
    const stone = stones.find((item) => item.id === stoneId);
    const article = articles.find((item) => item.id === stoneId);
    if (!stone || !article) missing(id);
    const prefix = `stone.${stoneId}.`;
    const stonesBefore = JSON.stringify(stones);
    const articlesBefore = JSON.stringify(articles);
    for (const [key, value] of Object.entries(fields)) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      if (["name", "latin", "density", "water", "strength", "frost", "wear", "radiation"].includes(rest)) {
        stone[rest] = String(value);
      } else {
        assignArticle(article, key, `stone.${stoneId}`, String(value));
      }
    }
    applyArticleSeo(article, seo);
    if (JSON.stringify(stones) !== stonesBefore) {
      fs.writeFileSync(paths.stones, `module.exports = ${JSON.stringify(stones, null, 2)};\n`);
    }
    if (JSON.stringify(articles) !== articlesBefore) writeJson(paths.stoneArticles, articles);
    if (JSON.stringify(stones) !== stonesBefore || JSON.stringify(articles) !== articlesBefore) rebuild();
    return getPage(id);
  }
  if (id.startsWith("product:")) {
    const productId = id.slice(8);
    const articles = readJson(paths.productArticles);
    const article = articles.find((item) => item.id === productId);
    if (!article) missing(id);
    const overrides = readJson(paths.overrides);
    const overridesBefore = JSON.stringify(overrides);
    const articlesBefore = JSON.stringify(articles);
    overrides[productId] = overrides[productId] || {};
    const prefix = `product.${productId}.`;
    for (const [key, value] of Object.entries(fields)) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      if (rest === "name" || rest === "summary") overrides[productId][rest] = String(value);
      else assignArticle(article, key, `product.${productId}`, String(value));
    }
    if (!Object.keys(overrides[productId]).length) delete overrides[productId];
    applyArticleSeo(article, seo);
    if (JSON.stringify(overrides) !== overridesBefore) writeJson(paths.overrides, overrides);
    if (JSON.stringify(articles) !== articlesBefore) writeJson(paths.productArticles, articles);
    if (JSON.stringify(overrides) !== overridesBefore || JSON.stringify(articles) !== articlesBefore) rebuild();
    return getPage(id);
  }
  if (id === "catalog" || id === "products") {
    const copy = readJson(paths.pages);
    const before = JSON.stringify(copy);
    for (const [key, value] of Object.entries(fields)) {
      const parts = key.split(".");
      if (parts[0] !== id) continue;
      if (parts.length === 2) copy[id][parts[1]] = String(value);
      else if (parts.length === 3 && copy[id][parts[1]]) copy[id][parts[1]][parts[2]] = String(value);
    }
    if (seo) {
      const fallback = seoDefaults[id];
      const stored = storedSearchSeo(seo, fallback.title, fallback.description);
      if (stored) copy[id].seo = stored;
      else delete copy[id].seo;
    }
    if (JSON.stringify(copy) !== before) {
      writeJson(paths.pages, copy);
      rebuild();
    }
    return getPage(id);
  }
  if (id === "gallery") {
    const current = readJson(paths.gallery);
    saveGallery({
      title: fields["gallery.title"],
      lead: fields["gallery.lead"],
      items: current.items,
      seo: seo || current.seo
    });
    return getPage(id);
  }
  const page = HAND[id];
  if (!page) missing(id);
  const file = path.join(root, page.file);
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  for (const [key, value] of Object.entries(fields)) {
    if (key.startsWith("site.")) continue;
    html = writeField(html, key, String(value));
  }
  if (seo) html = writeHeadSeo(html, seo);
  if (html !== before) fs.writeFileSync(file, html);
  if (siteChanged) rebuild();
  return getPage(id);
}

function saveGallery(next) {
  const current = readJson(paths.gallery);
  const items = Array.isArray(next.items) ? next.items : current.items;
  const known = new Map(current.items.map((item) => [item.id, item]));
  const clean = items.map((item) => {
    const stored = known.get(item.id);
    if (!stored) return null;
    return { id: stored.id, src: stored.src, caption: String(item.caption || "").slice(0, 180) };
  }).filter(Boolean);
  const title = String(next.title || current.title).slice(0, 120);
  const lead = String(next.lead || current.lead).slice(0, 400);
  const data = { title, lead, items: clean };
  if (Object.prototype.hasOwnProperty.call(next, "seo")) {
    const stored = next.seo
      ? storedSearchSeo(next.seo, gallerySearchTitle(title), lead.trim())
      : undefined;
    if (stored) data.seo = stored;
  } else if (current.seo) {
    data.seo = current.seo;
  }
  writeJson(paths.gallery, data);
  for (const item of current.items) {
    if (!clean.some((kept) => kept.id === item.id)) {
      const file = path.join(root, item.src);
      if (file.startsWith(path.join(root, "images/gallery")) && fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
  rebuild();
  return readJson(paths.gallery);
}

function addGalleryItem(src) {
  const gallery = readJson(paths.gallery);
  const item = { id: `g${Date.now().toString(36)}`, src, caption: "" };
  gallery.items.push(item);
  writeJson(paths.gallery, gallery);
  rebuild();
  return item;
}

module.exports = {
  root,
  listPages,
  getPage,
  savePage,
  saveGallery,
  addGalleryItem,
  rebuild,
  readJson,
  paths
};
