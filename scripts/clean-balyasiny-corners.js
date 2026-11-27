const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const dir = path.join(root, "images/products/balyasiny");
const outDir = path.join(dir, "_fixed");

async function wipeCorner(name) {
  const abs = path.join(dir, name);
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
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="${h - patchH}" width="${patchW}" height="${patchH}" fill="rgb(${r},${g},${b})"/></svg>`
  );
  const out = path.join(outDir, name);
  await sharp(abs).composite([{ input: overlay, top: 0, left: 0 }]).webp({ quality: 84 }).toFile(out);
  console.log("fixed", name);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".webp"))) {
    await wipeCorner(name);
  }
  // Replace originals from _fixed when possible
  for (const name of fs.readdirSync(outDir).filter((n) => n.endsWith(".webp"))) {
    const from = path.join(outDir, name);
    const to = path.join(dir, name);
    try {
      fs.copyFileSync(from, to);
      fs.unlinkSync(from);
      console.log("replaced", name);
    } catch (err) {
      console.warn("keep fixed copy for", name, err.code);
    }
  }
  try {
    fs.rmdirSync(outDir);
  } catch (_) {
    /* leftover locked originals still in _fixed */
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
