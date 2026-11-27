const { Client } = require("ssh2");

const host = process.env.VPS_HOST;
const password = process.env.VPS_PASSWORD;
if (!host || !password) {
  console.error("Need VPS_HOST and VPS_PASSWORD");
  process.exit(1);
}

const cmd = [
  "echo === ADMIN ===",
  "pm2 show granity-admin | sed -n '1,25p'",
  "curl -s -o /dev/null -w 'admin_http:%{http_code}\\n' http://127.0.0.1:8787/admin/",
  "curl -s http://127.0.0.1:8787/admin/api/me; echo",
  "echo === LISTEN ===",
  "ss -tlnp | grep -E ':80|:443|:8787' || true",
  "echo === NGINX ===",
  "nginx -t",
  "curl -sI -H 'Host: granit-karel.ru' http://127.0.0.1/ | sed -n '1,12p'",
  "echo === FILES ===",
  "wc -c /var/www/granity-karelii/admin/public/admin.js /var/www/granity-karelii/sitemap.xml /var/www/granity-karelii/index.html"
].join("; ");

const c = new Client();
c.on("ready", () => {
  c.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    let out = "";
    stream.on("data", (d) => (out += d));
    stream.stderr.on("data", (d) => (out += d));
    stream.on("close", (code) => {
      console.log(out);
      c.end();
      process.exit(code || 0);
    });
  });
})
  .on("error", (e) => {
    console.error(e);
    process.exit(1);
  })
  .connect({ host, username: "root", password, readyTimeout: 60000 });
