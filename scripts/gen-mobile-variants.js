/** Generate .w720.webp siblings for heavy WebP (mobile LCP / srcset). */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const IMG = path.join(ROOT, "images");
const WIDTH = Number(process.env.WEBP_MOBILE_WIDTH || 720);
const QUALITY = Number(process.env.WEBP_MOBILE_QUALITY || 68);
const MIN_LONG_EDGE = Number(process.env.WEBP_MOBILE_MIN_EDGE || 800);

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "_fixed") continue;
      walk(full, acc);
    } else if (/\.webp$/i.test(ent.name) && !/\.w\d+\.webp$/i.test(ent.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function variantPath(file) {
  return file.replace(/\.webp$/i, `.w${WIDTH}.webp`);
}

async function main() {
  const files = walk(IMG);
  let ok = 0;
  let skip = 0;
  for (const file of files) {
    const out = variantPath(file);
    try {
      const meta = await sharp(file).metadata();
      const longEdge = Math.max(meta.width || 0, meta.height || 0);
      if (!longEdge || longEdge < MIN_LONG_EDGE) {
        skip += 1;
        continue;
      }
      const buffer = await sharp(file)
        .rotate()
        .resize({
          width: WIDTH,
          height: WIDTH,
          fit: "inside",
          withoutEnlargement: true
        })
        .webp({ quality: QUALITY })
        .toBuffer();
      fs.writeFileSync(out, buffer);
      ok += 1;
      console.log(
        `ok ${path.relative(ROOT, out)} ${(buffer.length / 1024).toFixed(0)} KB (from ${meta.width}x${meta.height})`
      );
    } catch (error) {
      console.warn(`fail ${path.relative(ROOT, file)}: ${error.message}`);
    }
  }
  console.log(`variants=${ok}; skipped=${skip}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
