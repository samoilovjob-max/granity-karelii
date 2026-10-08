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

/**
 * Photos in images/{dir}/{id}/.
 * A polished finish (filename contains polir / polish / polirov) is always first
 * on catalog cards and in the carousel. One file images/{dir}/{id}.webp or .jpg
 * is the fallback when the folder is empty.
 */
function imageGallery(dir, id) {
  const folder = path.join(root, "images", dir, id);
  if (fs.existsSync(folder) && fs.statSync(folder).isDirectory()) {
    const files = fs
      .readdirSync(folder)
      .filter((name) => /\.(webp|jpe?g|png)$/i.test(name))
      .sort((a, b) => {
        const polished = Number(isPolishedName(b)) - Number(isPolishedName(a));
        return polished || a.localeCompare(b, "en", { numeric: true });
      });
    if (files.length) return files.map((name) => `images/${dir}/${id}/${name}`);
  }
  const single = imageRel(dir, id);
  return single ? [single] : [];
}

module.exports = { imageGallery, isPolishedName };
