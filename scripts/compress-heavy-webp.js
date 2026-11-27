/** Recompress WebP larger than threshold (max width 1400, quality 72). */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const IMG = path.join(ROOT, "images");
const MAX_BYTES = Number(process.env.WEBP_MAX_BYTES || 280 * 1024);
const MAX_WIDTH = Number(process.env.WEBP_MAX_WIDTH || 1400);
const QUALITY = Number(process.env.WEBP_QUALITY || 72);

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, acc);
    else if (/\.webp$/i.test(ent.name) && !/\.new\.webp$/i.test(ent.name)) acc.push(full);
  }
  return acc;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function replaceFile(original, buffer) {
  const next = `${original}.new.webp`;
  fs.writeFileSync(next, buffer);
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.unlinkSync(original);
      fs.renameSync(next, original);
      return;
    } catch (error) {
      lastError = error;
      await sleep(120 * (attempt + 1));
    }
  }
  try {
    fs.writeFileSync(original, buffer);
    fs.unlinkSync(next);
  } catch (error) {
    try {
      fs.unlinkSync(next);
    } catch (_) {
      /* ignore */
    }
    throw lastError || error;
  }
}

async function main() {
  const files = walk(IMG).filter((f) => fs.statSync(f).size > MAX_BYTES);
  console.log(`candidates: ${files.length}`);
  let saved = 0;
  let ok = 0;
  let fail = 0;
  for (const file of files) {
    const before = fs.statSync(file).size;
    try {
      const buffer = await sharp(file)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();
      if (buffer.length < before * 0.98) {
        await replaceFile(file, buffer);
        saved += before - buffer.length;
        ok += 1;
        console.log(
          `ok ${path.relative(ROOT, file)} ${(before / 1024).toFixed(0)}→${(buffer.length / 1024).toFixed(0)} KB`
        );
      } else {
        console.log(`skip ${path.relative(ROOT, file)} (no gain)`);
      }
    } catch (error) {
      fail += 1;
      console.warn(`fail ${path.relative(ROOT, file)}: ${error.code || error.message}`);
    }
  }
  console.log(`saved ~${(saved / 1024).toFixed(0)} KB; ok=${ok}; fail=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
