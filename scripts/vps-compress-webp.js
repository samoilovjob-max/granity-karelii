/** Upload compress script and run it on VPS. Env: VPS_HOST, VPS_PASSWORD */
const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const host = process.env.VPS_HOST;
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;
const siteRoot = "/var/www/granity-karelii";

if (!host || !password) {
  console.error("Need VPS_HOST and VPS_PASSWORD");
  process.exit(1);
}

const localScript = path.join(__dirname, "compress-heavy-webp.js");
const remoteScript = `${siteRoot}/scripts/compress-heavy-webp.js`;

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      let errOut = "";
      stream.on("data", (d) => {
        out += d;
        process.stdout.write(d);
      });
      stream.stderr.on("data", (d) => {
        errOut += d;
        process.stderr.write(d);
      });
      stream.on("close", (code) => {
        if (code) reject(new Error(`exit ${code}: ${errOut || out}`));
        else resolve(out);
      });
    });
  });
}

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

  await new Promise((resolve, reject) => {
    sftp.mkdir(`${siteRoot}/scripts`, { mode: 0o755 }, () => resolve());
  });
  await new Promise((resolve, reject) => {
    sftp.fastPut(localScript, remoteScript, (err) => (err ? reject(err) : resolve()));
  });
  console.log("uploaded compress script");

  const quality = process.env.WEBP_QUALITY || "72";
  const maxWidth = process.env.WEBP_MAX_WIDTH || "1400";
  const maxBytes = process.env.WEBP_MAX_BYTES || String(280 * 1024);
  // sharp уже есть у сайта (admin dependency); запускаем из корня сайта
  await exec(
    conn,
    `cd ${siteRoot} && node -e "require('sharp'); console.log('sharp ok')" && WEBP_QUALITY=${quality} WEBP_MAX_WIDTH=${maxWidth} WEBP_MAX_BYTES=${maxBytes} node scripts/compress-heavy-webp.js`
  );

  await exec(
    conn,
    `cd ${siteRoot}/images && find . -type f -name '*.webp' -size +280k | wc -l && du -sh .`
  );

  conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
