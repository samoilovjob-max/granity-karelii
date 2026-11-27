/** Convert baluster/vase photos → images/products/balyasiny + shuffle into gallery.json */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const assets = path.join(
  process.env.USERPROFILE || "",
  ".cursor/projects/c-Users-User-Projects-granity-karelii-deploy/assets"
);
const outDir = path.join(root, "images/products/balyasiny");
const galleryPath = path.join(root, "data/gallery.json");

const shots = [
  {
    src: "001_________-3a595102-5836-4d12-bd1f-a611c03aec23.jpg",
    name: "001_balyasina-tri-yarusa",
    caption: "Балясины: три яруса, розовый гранит"
  },
  {
    src: "002_________-dd0ed9aa-03d7-466e-b176-e919cc467d7d.jpg",
    name: "002_balyasina-dva-shara",
    caption: "Балясины: два шара, розовый гранит"
  },
  {
    src: "003_________-c1981b8e-2e47-4163-b107-5e311bdb8433.jpg",
    name: "003_balyasina-s-poyasom",
    caption: "Балясины: с поясом, серо-розовый гранит"
  },
  {
    src: "008_____-675d89c4-bd3e-4680-8fb4-4e0beafd1a0c.jpg",
    name: "004_vazon-chernyy",
    caption: "Балясины: вазон чёрный"
  },
  {
    src: "002_____-28b6449a-8842-4bea-84a5-3bf1837fb75b.jpg",
    name: "005_vazony-chernye-para",
    caption: "Балясины: пара чёрных вазонов"
  },
  {
    src: "005_____-b8b18159-7619-49be-84e0-aa3c1873ebe2.jpg",
    name: "006_vazon-korichnevyy",
    caption: "Балясины: вазон коричневый"
  },
  {
    src: "006_____-5b3009cd-855f-458b-a0b5-8dae97dffecb.jpg",
    name: "007_vazon-korichnevyy-uzkiy",
    caption: "Балясины: вазон коричневый узкий"
  },
  {
    src: "007_____-e683067b-8a35-4bc6-b71e-9ae7887ece7f.jpg",
    name: "008_vazon-chernyy-vysokiy",
    caption: "Балясины: вазон чёрный высокий"
  },
  {
    src: "003_____-3b101d4d-22cc-4f70-b48e-d671332cb679.jpg",
    name: "009_vazony-chernye-raznye",
    caption: "Балясины: чёрные вазоны разной высоты"
  },
  {
    src: "001_____-ef462093-f392-4391-8279-8c79a78d57ca.jpg",
    name: "010_vazon-korichnevyy-otkrytyy",
    caption: "Балясины: вазон коричневый открытый"
  },
  {
    src: "004_____-e2db8463-d771-4d70-aa23-25000187009d.jpg",
    name: "011_vazon-chernyy-klassicheskiy",
    caption: "Балясины: вазон чёрный классический"
  },
  {
    src: "009_____-6382afc2-3b5a-4f37-88af-f45842fcad66.jpg",
    name: "012_vazon-korichnevyy-ploskaya-kromka",
    caption: "Балясины: вазон коричневый с плоской кромкой"
  }
];

function shuffleInsert(list, newcomers) {
  const result = list.slice();
  for (const item of newcomers) {
    const idx = Math.floor(Math.random() * (result.length + 1));
    result.splice(idx, 0, item);
  }
  return result;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const galleryItems = [];

  for (const shot of shots) {
    const input = path.join(assets, shot.src);
    if (!fs.existsSync(input)) throw new Error(`Missing ${input}`);
    const dest = path.join(outDir, `${shot.name}.webp`);
    await sharp(input)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(dest);
    console.log("wrote", path.relative(root, dest));
    galleryItems.push({
      id: `prod-balyasiny-${shot.name}`,
      src: `images/products/balyasiny/${shot.name}.webp`,
      caption: shot.caption,
      tags: ["product", "balyasiny"]
    });
  }

  const gallery = JSON.parse(fs.readFileSync(galleryPath, "utf8"));
  const existing = (gallery.items || []).filter((item) => !String(item.id || "").startsWith("prod-balyasiny-"));
  gallery.items = shuffleInsert(existing, galleryItems);
  fs.writeFileSync(galleryPath, `${JSON.stringify(gallery, null, 2)}\n`);
  console.log(`gallery: +${galleryItems.length} items (shuffled), total ${gallery.items.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
