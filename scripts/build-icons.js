// Растровые иконки сайта из SVG-логотипа: npm run icons
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const brand = path.join(root, "images/brand");
const transparent = fs.readFileSync(path.join(brand, "logo-gk-transparent.svg"));
// iOS fills transparent pixels with black, so the touch icon keeps the light background.
const withBackground = fs.readFileSync(path.join(brand, "logo-gk.svg"));

const png = (svg, size) =>
  sharp(svg)
    .resize(size, size)
    .png()
    .toBuffer();

function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

(async () => {
  const icoSizes = [16, 32, 48];
  const icoImages = await Promise.all(icoSizes.map(async (size) => ({ size, data: await png(transparent, size) })));
  fs.writeFileSync(path.join(root, "favicon.ico"), ico(icoImages));
  fs.writeFileSync(path.join(brand, "favicon-32.png"), await png(transparent, 32));
  fs.writeFileSync(path.join(brand, "apple-touch-icon.png"), await png(withBackground, 180));
  console.log("wrote favicon.ico, images/brand/favicon-32.png, images/brand/apple-touch-icon.png");
})();
