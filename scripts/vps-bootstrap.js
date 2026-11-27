/**
 * One-shot VPS bootstrap over SSH.
 * Env: VPS_HOST, VPS_USER (default root), VPS_PASSWORD, ADMIN_PASSWORD
 */
const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const host = process.env.VPS_HOST;
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;
const adminPassword = process.env.ADMIN_PASSWORD;
const siteRoot = "/var/www/granity-karelii";

if (!host || !password) {
  console.error("Set VPS_HOST and VPS_PASSWORD");
  process.exit(1);
}
if (!adminPassword || adminPassword.length < 12) {
  console.error("Set ADMIN_PASSWORD (min 12 chars, letter+digit)");
  process.exit(1);
}

function exec(conn, command, opts = {}) {
  return new Promise((resolve, reject) => {
    console.log(`$ ${command.slice(0, 120)}${command.length > 120 ? "…" : ""}`);
    conn.exec(command, { pty: opts.pty || false }, (err, stream) => {
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
        if (code !== 0 && !opts.allowFail) {
          reject(new Error(`exit ${code}: ${errOut || out}`));
        } else {
          resolve({ code, out, errOut });
        }
      });
    });
  });
}

function uploadDir(sftp, localDir, remoteDir, skip = new Set()) {
  return new Promise((resolve, reject) => {
    const entries = fs.readdirSync(localDir, { withFileTypes: true });
    let i = 0;
    const next = () => {
      if (i >= entries.length) return resolve();
      const ent = entries[i++];
      if (skip.has(ent.name) || ent.name === ".git" || ent.name === "node_modules") return next();
      const local = path.join(localDir, ent.name);
      const remote = `${remoteDir}/${ent.name}`.replace(/\\/g, "/");
      if (ent.isDirectory()) {
        sftp.mkdir(remote, (err) => {
          // ignore exists
          uploadDir(sftp, local, remote, skip).then(next).catch(reject);
        });
      } else if (ent.isFile()) {
        sftp.fastPut(local, remote, (err) => {
          if (err) return reject(err);
          if (i % 25 === 0) console.log(`uploaded ${i}/${entries.length} in ${path.basename(localDir)}`);
          next();
        });
      } else next();
    };
    next();
  });
}

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn
      .on("ready", resolve)
      .on("error", reject)
      .connect({ host, port: 22, username, password, readyTimeout: 60000 });
  });
  console.log("SSH connected");

  await exec(
    conn,
    [
      "export DEBIAN_FRONTEND=noninteractive",
      "apt-get update -y",
      "apt-get install -y nginx git curl ca-certificates gnupg",
      "if ! command -v node >/dev/null 2>&1; then",
      "  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
      "  apt-get install -y nodejs",
      "fi",
      "npm install -g pm2",
      "mkdir -p /var/www",
      `rm -rf ${siteRoot}`,
      `mkdir -p ${siteRoot}`,
      "node -v && npm -v && nginx -v"
    ].join("\n")
  );

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)));
  });
  console.log("Uploading site files…");
  const localRoot = path.join(__dirname, "..");
  await uploadDir(
    sftp,
    localRoot,
    siteRoot,
    new Set([".git", "node_modules", ".cursor", "agent-tools", "assets", "admin/.local-password"])
  );
  // ensure nested skip of node_modules handled; also skip agent caches if any
  console.log("Upload finished");

  const nginxConf = `
# www → apex
server {
  listen 80;
  listen [::]:80;
  server_name www.granit-karel.ru;
  return 301 https://granit-karel.ru$request_uri;
}

# HTTP apex → HTTPS (SSL добавит certbot)
server {
  listen 80;
  listen [::]:80;
  server_name granit-karel.ru;

  client_max_body_size 32m;
  root ${siteRoot};
  index index.html;

  location /admin/ {
    proxy_pass http://127.0.0.1:8787/admin/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location = /admin {
    return 301 /admin/;
  }

  location / {
    try_files $uri $uri/ $uri.html =404;
  }
}

# IP / неизвестный Host
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;
  return 444;
}
`.trim();

  await exec(conn, `cat > /etc/nginx/sites-available/granit-karel <<'EOF'\n${nginxConf}\nEOF`);
  await exec(
    conn,
    [
      "ln -sfn /etc/nginx/sites-available/granit-karel /etc/nginx/sites-enabled/granit-karel",
      "rm -f /etc/nginx/sites-enabled/default",
      "nginx -t",
      "systemctl enable nginx",
      "systemctl restart nginx"
    ].join("\n")
  );

  const escPass = adminPassword.replace(/'/g, `'\"'\"'`);
  await exec(
    conn,
    [
      `cd ${siteRoot}`,
      "npm ci --omit=dev || npm install --omit=dev",
      `printf '%s\\n' '${escPass}' > admin/.local-password`,
      "chmod 600 admin/.local-password",
      "pm2 delete granity-admin >/dev/null 2>&1 || true",
      "pm2 start npm --name granity-admin -- start",
      "pm2 save",
      "pm2 startup systemd -u root --hp /root | tail -n 1 | bash || true",
      "pm2 status",
      "curl -sI http://127.0.0.1:8787/ | head -n 5",
      "curl -sI http://127.0.0.1/ | head -n 5"
    ].join("\n")
  );

  conn.end();
  console.log("\nDone. Open http://" + host + "/");
  console.log("Admin: http://" + host + "/admin (password in admin/.local-password on server)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
