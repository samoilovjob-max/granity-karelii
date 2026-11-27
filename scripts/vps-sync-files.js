/** Upload listed files to VPS. Env: VPS_HOST, VPS_PASSWORD, VPS_USER?, files as args */
const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const host = process.env.VPS_HOST;
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;
const siteRoot = "/var/www/granity-karelii";
const files = process.argv.slice(2);

if (!host || !password || !files.length) {
  console.error("Usage: VPS_HOST=… VPS_PASSWORD=… node scripts/vps-sync-files.js path1 path2");
  process.exit(1);
}

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on("ready", resolve).on("error", reject).connect({ host, username, password, readyTimeout: 60000 });
  });
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)));
  });
  const root = path.join(__dirname, "..");
  for (const rel of files) {
    const local = path.join(root, rel);
    const remote = `${siteRoot}/${rel.replace(/\\/g, "/")}`;
    await new Promise((resolve, reject) => {
      sftp.fastPut(local, remote, (err) => (err ? reject(err) : resolve()));
    });
    console.log("ok", rel);
  }
  await new Promise((resolve, reject) => {
    conn.exec("pm2 restart granity-admin", (err, stream) => {
      if (err) return reject(err);
      stream.on("close", resolve);
      stream.resume();
    });
  });
  console.log("pm2 restarted");
  conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
