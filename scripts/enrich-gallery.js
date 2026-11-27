/** Enrich gallery.json: categories, titles, stones; clean studio photo corners. */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const galleryPath = path.join(root, "data/gallery.json");
const products = require("./products-data");
const stones = require("./stones-data");
const stoneName = Object.fromEntries(stones.map((s) => [s.id, s.name]));
const productById = Object.fromEntries(products.map((p) => [p.id, p]));

const FILTERS = {
  memorial: "memorial",
  turned: "turned",
  construction: "construction",
  workshop: "workshop"
};

function productIdFromItem(item) {
  const m = String(item.id || "").match(/^prod-([a-z0-9-]+)-/);
  if (m) return m[1];
  const fromSrc = String(item.src || "").match(/images\/products\/([^/]+)\//);
  return fromSrc ? fromSrc[1] : "";
}

function categoryFor(item, productId) {
  const tags = item.tags || [];
  if (tags.includes("blocks") || String(item.src || "").includes("/gallery/")) return FILTERS.workshop;
  if (productId === "balyasiny") return FILTERS.turned;
  if (["pamyatniki", "nadgrobiya", "tumby", "tsvetniki"].includes(productId)) return FILTERS.memorial;
  if (productId) return FILTERS.construction;
  const cap = String(item.caption || "").toLowerCase();
  if (/цех|склад|блок|отгруз|площад|фактур|обработ/.test(cap)) return FILTERS.workshop;
  return FILTERS.workshop;
}

function titleFor(item, productId) {
  const stem = String(item.id || "").replace(/^prod-[a-z0-9-]+-/, "").replace(/^\d+_/, "");
  const map = {
    "balyasina-tri-yarusa": "Балясина трёхъярусная",
    "balyasina-dva-shara": "Балясина двухъярусная",
    "balyasina-s-poyasom": "Балясина с поясом",
    "vazon-chernyy": "Вазон точёный",
    "vazony-chernye-para": "Вазоны точёные, пара",
    "vazon-korichnevyy": "Вазон точёный",
    "vazon-korichnevyy-uzkiy": "Вазон точёный узкий",
    "vazon-chernyy-vysokiy": "Вазон точёный высокий",
    "vazony-chernye-raznye": "Вазоны точёные",
    "vazon-korichnevyy-otkrytyy": "Вазон точёный открытый",
    "vazon-chernyy-klassicheskiy": "Вазон точёный классический",
    "vazon-korichnevyy-ploskaya-kromka": "Вазон точёный",
    "nadgrobnaya-plita": "Надгробная плита",
    "plita-s-krestom": "Надгробная плита с крестом",
    "kompleks-s-vstavkoy": "Мемориальный комплекс",
    "gravirovka": "Стела с гравировкой",
    "kompleks-na-kladbishche": "Мемориальный комплекс",
    "krest-i-derevo": "Стела с резьбой",
    "stela-s-derevom": "Стела фигурная с резьбой",
    "kromka-tumby": "Тумба под памятник",
    "shtabel-tumb": "Тумбы под памятники",
    "svetlye-kubiki": "Брусчатка кубическая",
    "kubiki-v-cehe": "Брусчатка в цехе",
    "kubiki-v-yashchike": "Брусчатка в ящике",
    "partiya-vo-dvore": "Партия брусчатки",
    "kubiki-krupno": "Брусчатка крупным планом",
    "pryamougolnye": "Брусчатка прямоугольная",
    "rozovye-kubiki": "Брусчатка розовая",
    "plitka-rozovaya": "Плита мощения",
    "plitka-seraya": "Плита мощения",
    "shtabel-plitki": "Плиты мощения",
    "plita-s-konusami": "Тактильная плита",
    "plita-s-kvadratnymi-rifami": "Тактильная плита",
    "krasnaya-s-kvadratnymi-rifami": "Тактильная плита",
    "korichnevaya-s-konusami": "Тактильная плита",
    "shtabeli-plit": "Слэбы",
    "naklonnye-sleby": "Слэбы",
    "faktura-sleba": "Фактура слэба",
    "ryady-slebov": "Слэбы на складе"
  };
  if (TITLE_BY_ID[item.id]) return TITLE_BY_ID[item.id];
  if (map[stem]) return map[stem];
  if (productById[productId]) return productById[productId].name;
  return String(item.caption || "Гранитное изделие").split(":")[0].trim();
}

/** Ручные правки породы по id (имена файлов иногда врут: «chernyy», а камень дымовский). */
const STONE_BY_ID = {
  "prod-balyasiny-001_balyasina-tri-yarusa": "Возрождение",
  "prod-balyasiny-002_balyasina-dva-shara": "Возрождение",
  "prod-balyasiny-003_balyasina-s-poyasom": "Возрождение",
  "prod-balyasiny-008_vazon-chernyy-vysokiy": "Дымовский гранит",
  "prod-balyasiny-011_vazon-chernyy-klassicheskiy": "Дымовский гранит",
  "prod-balyasiny-010_vazon-korichnevyy-otkrytyy": "Габбро-диабаз",
  "prod-balyasiny-012_vazon-korichnevyy-ploskaya-kromka": "Габбро-диабаз",
  "prod-bruschatka-007_rozovye-kubiki": "Винга",
  "prod-taktilnye-plity-003_krasnaya-s-kvadratnymi-rifami": "Винга",
  "prod-plity-mosheniya-001_plitka-rozovaya": "Возрождение"
};

const TITLE_BY_ID = {
  "prod-balyasiny-010_vazon-korichnevyy-otkrytyy": "Вазоны точёные"
};

function stoneFor(item, productId, category) {
  if (category === FILTERS.workshop) return "";
  if (STONE_BY_ID[item.id]) return STONE_BY_ID[item.id];
  const stem = String(item.id || "");
  if (/korich|dymov|дымов|коричне/i.test(stem + item.caption)) return "Дымовский гранит";
  if (/rozov|kalgu|три-ярус|dva-shara|poyasom|розов/i.test(stem + item.caption)) return "Калгуваара";
  if (/vozrozh|svetlye|серая|seraya/i.test(stem + item.caption)) return "Возрождение";
  if (/chern|gabbro|черн/i.test(stem + item.caption)) return "Габбро-диабаз";
  const product = productById[productId];
  if (product && product.granites && product.granites[0]) return stoneName[product.granites[0]] || "";
  return "Гранит Карелии";
}

async function wipeCorner(file) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) return false;
  const meta = await sharp(abs).metadata();
  const w = meta.width;
  const h = meta.height;
  const patchW = Math.max(48, Math.round(w * 0.14));
  const patchH = Math.max(36, Math.round(h * 0.09));
  const sample = await sharp(abs)
    .extract({
      left: Math.min(w - 6, Math.round(w * 0.08)),
      top: Math.max(0, h - patchH - Math.round(h * 0.04)),
      width: 4,
      height: 4
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [r, g, b] = sample.data;
  const overlay = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${h - patchH}" width="${patchW}" height="${patchH}" fill="rgb(${r},${g},${b})"/>
    </svg>`
  );
  const tmp = `${abs}.tmp.webp`;
  await sharp(abs).composite([{ input: overlay, top: 0, left: 0 }]).webp({ quality: 84 }).toFile(tmp);
  fs.copyFileSync(tmp, abs);
  fs.unlinkSync(tmp);
  return true;
}

async function main() {
  const gallery = JSON.parse(fs.readFileSync(galleryPath, "utf8"));
  const enriched = (gallery.items || []).map((item) => {
    const productId = productIdFromItem(item);
    const category = categoryFor(item, productId);
    const title = titleFor(item, productId);
    const stone = stoneFor(item, productId, category);
    const tags = new Set(item.tags || []);
    tags.add(category);
    if (productId) tags.add(productId);
    return {
      id: item.id,
      src: item.src,
      caption: item.caption || title,
      title,
      stone,
      category,
      tags: [...tags]
    };
  });

  const order = { turned: 1, memorial: 2, construction: 3, workshop: 4 };
  enriched.sort((a, b) => {
    const oa = order[a.category] || 9;
    const ob = order[b.category] || 9;
    if (oa !== ob) return oa - ob;
    return String(a.title).localeCompare(String(b.title), "ru");
  });

  gallery.items = enriched;
  gallery.filters = [
    { id: "all", label: "Все работы" },
    { id: "memorial", label: "Памятники и стелы" },
    { id: "turned", label: "Вазы и балясины" },
    { id: "construction", label: "Плиты и стройматериалы" },
    { id: "workshop", label: "Цех и отгрузка" }
  ];
  fs.writeFileSync(galleryPath, `${JSON.stringify(gallery, null, 2)}\n`);
  console.log(`enriched ${enriched.length} items`);

  const studio = enriched.filter((i) => i.category === "turned" && i.src.includes("balyasiny"));
  for (const item of studio) {
    const ok = await wipeCorner(item.src);
    if (ok) console.log("cleaned", item.src);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
