/** Sync HTML + key site files to VPS. Env: VPS_HOST, VPS_PASSWORD */
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

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", ".cursor", "admin", "agent-tools"].includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (/\.(html|css|js|json|webp)$/i.test(ent.name)) {
      const rel = path.relative(root, full).replace(/\\/g, "/");
      if (rel.startsWith("scripts/") && !rel.endsWith("nav.js") && !rel.includes("carousel")) continue;
      if (rel.startsWith("admin/")) continue;
      out.push(rel);
    }
  }
  return out;
}

function upload(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    const dir = path.posix.dirname(remote);
    sftp.mkdir(dir, { mode: 0o755 }, () => {
      sftp.fastPut(local, remote, (err) => (err ? reject(err) : resolve()));
    });
  });
}

async function main() {
  const extras = process.argv.slice(2);
  const files = extras.length
    ? extras
    : [
        "index.html",
        "data/site.json",
        "css/styles.css",
        "js/carousel.js",
        "js/nav.js",
        ...walk(root).filter((f) => f.endsWith(".html"))
      ];
  const unique = [...new Set(files)];

  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on("ready", resolve).on("error", reject).connect({ host, username, password, readyTimeout: 60000 });
  });
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)));
  });

  let n = 0;
  for (const rel of unique) {
    const local = path.join(root, rel);
    if (!fs.existsSync(local)) continue;
    await upload(sftp, local, `${siteRoot}/${rel}`);
    n++;
    if (n % 20 === 0) console.log(`uploaded ${n}/${unique.length}`);
  }
  console.log(`uploaded ${n} files`);

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
