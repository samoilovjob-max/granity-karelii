/** Inspect and fix Nginx vhost for granit-karel.ru. Env: VPS_HOST, VPS_PASSWORD */
const { Client } = require("ssh2");

const host = process.env.VPS_HOST;
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;

if (!host || !password) {
  console.error("Need VPS_HOST and VPS_PASSWORD");
  process.exit(1);
}

const remote = `
set -e
echo "=== sites-enabled ==="
ls -la /etc/nginx/sites-enabled/
echo "=== sites-available ==="
ls -la /etc/nginx/sites-available/
echo "=== granit-karel ==="
cat /etc/nginx/sites-available/granit-karel 2>/dev/null || echo MISSING
echo "=== granit-karel.ru ==="
cat /etc/nginx/sites-available/granit-karel.ru 2>/dev/null || echo MISSING
echo "=== default ==="
grep -n "server_name\\|root\\|listen\\|proxy_pass" /etc/nginx/sites-available/default 2>/dev/null || true
echo "=== nginx -T server blocks ==="
nginx -T 2>/dev/null | grep -E 'server_name|listen |root |proxy_pass|ssl_certificate' | head -80
`;

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(remote, (err, stream) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => {
        conn.end();
        process.exit(code || 0);
      });
    });
  })
  .on("error", (e) => {
    console.error(e);
    process.exit(1);
  })
  .connect({ host, username, password, readyTimeout: 60000 });
