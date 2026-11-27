/** Clean duplicate nginx site configs and retry certbot. Env: VPS_HOST, VPS_PASSWORD */
const { Client } = require("ssh2");

const host = process.env.VPS_HOST;
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;
const email = process.env.SSL_EMAIL || "admin@granit-karel.ru";

if (!host || !password) {
  console.error("Need VPS_HOST and VPS_PASSWORD");
  process.exit(1);
}

const remote = `
set -e
echo "=== configs ==="
ls -la /etc/nginx/sites-available/ /etc/nginx/sites-enabled/
echo "=== granit-karel conf ==="
cat /etc/nginx/sites-available/granit-karel
echo "=== remove duplicate if any ==="
rm -f /etc/nginx/sites-enabled/granit-karel.ru /etc/nginx/sites-available/granit-karel.ru
# Keep only the original site file
ln -sfn /etc/nginx/sites-available/granit-karel /etc/nginx/sites-enabled/granit-karel
rm -f /etc/nginx/sites-enabled/default
# Ensure server_name
if ! grep -q 'server_name granit-karel.ru' /etc/nginx/sites-available/granit-karel; then
  sed -i '0,/server_name .*/s//server_name granit-karel.ru www.granit-karel.ru;/' /etc/nginx/sites-available/granit-karel
fi
nginx -t
systemctl reload nginx
echo "=== outbound LE ==="
curl -sI --connect-timeout 20 https://acme-v02.api.letsencrypt.org/directory | head -5 || echo LE_FAIL
echo "=== certbot retry ==="
certbot --nginx -d granit-karel.ru -d www.granit-karel.ru --non-interactive --agree-tos -m ${email} --redirect --preferred-challenges http
echo "=== after ==="
ss -tlnp | grep -E ':80|:443' || true
curl -skI --connect-timeout 10 https://127.0.0.1/ -H 'Host: granit-karel.ru' | head -15
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
