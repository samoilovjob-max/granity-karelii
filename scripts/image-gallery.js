const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function isPolishedName(name) {
  return /polir|polish|polirov/i.test(name);
}

function imageRel(dir, id) {
  if (fs.existsSync(path.join(root, "images", dir, `${id}.webp`))) return `images/${dir}/${id}.webp`;
  if (fs.existsSync(path.join(root, "images", dir, `${id}.jpg`))) return `images/${dir}/${id}.jpg`;
  return "";
}

function compareGranitePhotos(a, b) {
  const polished = Number(isPolishedName(b)) - Number(isPolishedName(a));
  return polished || a.localeCompare(b, "en", { numeric: true });
}

/** Filename order, character by character: 001_name, then 002_name, then 00_name. Polishing is not special. */
function compareProductPhotos(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Photos in images/{dir}/{id}/.
 * Granite: a polished finish is first on the card and in the carousel.
 * Products: the filename sets the order (001_название, 002_название, 00_название).
 * One file images/{dir}/{id}.webp or .jpg is the fallback when the folder is empty.
 */
function imageGallery(dir, id) {
  const folder = path.join(root, "images", dir, id);
  if (fs.existsSync(folder) && fs.statSync(folder).isDirectory()) {
    const compare = dir === "products" ? compareProductPhotos : compareGranitePhotos;
    const files = fs
      .readdirSync(folder)
      .filter((name) => /\.(webp|jpe?g|png)$/i.test(name))
      .sort(compare);
    if (files.length) return files.map((name) => `images/${dir}/${id}/${name}`);
  }
  const single = imageRel(dir, id);
  return single ? [single] : [];
}

/** Keep the uploaded product name, including its order prefix: 001_название.jpg → 001_название.webp */
function productPhotoName(originalName) {
  const raw = path.basename(String(originalName || ""));
  const stem = raw.replace(/\.[^.]+$/, "");
  const cleaned = stem
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!/^\d+_/.test(cleaned)) {
    const error = new Error("Назовите файл так: 001_название");
    error.status = 400;
    throw error;
  }
  return `${cleaned}.webp`;
}

module.exports = { imageGallery, isPolishedName, compareProductPhotos, productPhotoName };
