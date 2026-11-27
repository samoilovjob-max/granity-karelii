/** Create images/products/balyasiny on VPS and upload webp + pages. Env: VPS_HOST, VPS_PASSWORD */
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

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => (out += d));
      stream.stderr.on("data", (d) => (out += d));
      stream.on("close", (code) => (code ? reject(new Error(out || `exit ${code}`)) : resolve(out)));
    });
  });
}

function upload(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => (err ? reject(err) : resolve()));
  });
}

async function main() {
  const photos = fs
    .readdirSync(path.join(root, "images/products/balyasiny"))
    .filter((n) => n.endsWith(".webp"))
    .map((n) => `images/products/balyasiny/${n}`);
  const files = ["data/gallery.json", "produkciya.html", "produkciya/balyasiny.html", "galereya.html", ...photos];

  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on("ready", resolve).on("error", reject).connect({ host, username, password, readyTimeout: 60000 });
  });
  await exec(conn, `mkdir -p ${siteRoot}/images/products/balyasiny`);
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)));
  });
  for (const rel of files) {
    await upload(sftp, path.join(root, rel), `${siteRoot}/${rel}`);
    console.log("ok", rel);
  }
  await exec(conn, "pm2 restart granity-admin");
  console.log("pm2 restarted");
  conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
