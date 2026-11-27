const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const dir = path.join(root, "images/products/balyasiny");
const outDir = path.join(dir, "_fixed");
const files = ["008_vazon-chernyy-vysokiy.webp", "011_vazon-chernyy-klassicheskiy.webp"];

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of files) {
    const abs = path.join(dir, name);
    const meta = await sharp(abs).metadata();
    const w = meta.width;
    const h = meta.height;
    const targetRatio = 4 / 5;
    let cropW = w;
    let cropH = h;
    let left = 0;
    let top = 0;
    if (w / h > targetRatio) {
      cropW = Math.round(h * targetRatio);
      left = Math.round((w - cropW) / 2);
    } else {
      cropH = Math.round(w / targetRatio);
      top = Math.round((h - cropH) / 2);
    }
    const out = path.join(outDir, name);
    await sharp(abs)
      .extract({ left, top, width: cropW, height: cropH })
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 84 })
      .toFile(out);
    try {
      fs.copyFileSync(out, abs);
      fs.unlinkSync(out);
      console.log("replaced", name);
    } catch {
      console.log("kept fixed", name);
    }
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
