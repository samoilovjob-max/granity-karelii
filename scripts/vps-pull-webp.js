/** Pull recently compressed WebP from VPS. Env: VPS_HOST, VPS_PASSWORD */
const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const host = process.env.VPS_HOST;
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;
const siteRoot = "/var/www/granity-karelii";
const root = path.join(__dirname, "..");

if (!host || !password) {
  console.error("Need VPS_HOST and VPS_PASSWORD");
  process.exit(1);
}

const LIST = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "images/granites/dyadina-gora/01-polirovka.webp",
      "images/granites/dyadina-gora/02.webp",
      "images/granites/dymovskiy/01-polirovka.webp",
      "images/granites/gabbro-diabaz/02.webp",
      "images/granites/gabbro-diabaz/04.webp",
      "images/granites/kalguvaara/01-polirovka.webp",
      "images/granites/kashina-gora/01-polirovka.webp",
      "images/granites/sopka-buntina/04.webp",
      "images/products/bruschatka/001_svetlye-kubiki.webp",
      "images/products/bruschatka/002_kubiki-v-cehe.webp",
      "images/products/bruschatka/004_partiya-vo-dvore.webp",
      "images/products/plity-mosheniya/001_plitka-rozovaya.webp",
      "images/products/plity-mosheniya/002_plitka-seraya.webp",
      "images/products/sleby/003_faktura-sleba.webp"
    ];

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on("ready", resolve).on("error", reject).connect({
      host,
      username,
      password,
      readyTimeout: 60000
    });
  });
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)));
  });

  let ok = 0;
  let fail = 0;
  for (const rel of LIST) {
    const remote = `${siteRoot}/${rel}`;
    const local = path.join(root, rel);
    const tmp = `${local}.pull.webp`;
    try {
      await new Promise((resolve, reject) => {
        sftp.fastGet(remote, tmp, (err) => (err ? reject(err) : resolve()));
      });
      const before = fs.existsSync(local) ? fs.statSync(local).size : 0;
      const after = fs.statSync(tmp).size;
      try {
        if (fs.existsSync(local)) fs.unlinkSync(local);
      } catch (_) {
        /* ignore */
      }
      if (fs.existsSync(local)) {
        console.warn(`locked ${rel} → ${rel}.pull.webp`);
        fail += 1;
        continue;
      }
      fs.renameSync(tmp, local);
      ok += 1;
      console.log(`ok ${rel} ${(before / 1024).toFixed(0)}→${(after / 1024).toFixed(0)} KB`);
    } catch (error) {
      fail += 1;
      console.warn(`fail ${rel}: ${error.message}`);
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch (_) {
        /* ignore */
      }
    }
  }

  console.log(`pulled ok=${ok} fail/locked=${fail}`);
  conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
