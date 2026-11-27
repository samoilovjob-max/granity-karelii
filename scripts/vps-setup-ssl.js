/** Install certbot + issue SSL for granit-karel.ru. Env: VPS_HOST, VPS_PASSWORD */
const { Client } = require("ssh2");

const host = process.env.VPS_HOST;
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;
const domains = "granit-karel.ru www.granit-karel.ru";
const email = process.env.SSL_EMAIL || "admin@granit-karel.ru";

if (!host || !password) {
  console.error("Need VPS_HOST and VPS_PASSWORD");
  process.exit(1);
}

const remote = `
set -e
export DEBIAN_FRONTEND=noninteractive
echo "=== ports ==="
ss -tlnp | grep -E ':80|:443' || true
echo "=== nginx sites ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true
ls -la /etc/nginx/conf.d/ 2>/dev/null || true
echo "=== find site conf ==="
grep -RIl "granit-karel\\|granity-karelii" /etc/nginx/ 2>/dev/null || true
echo "=== ensure server_name ==="
CONF=$(grep -RIl "root /var/www/granity-karelii" /etc/nginx/ 2>/dev/null | head -1 || true)
if [ -z "$CONF" ]; then
  CONF=/etc/nginx/sites-available/granit-karel.ru
  cat > "$CONF" <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name granit-karel.ru www.granit-karel.ru;
    root /var/www/granity-karelii;
    index index.html;

    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    location /admin/ {
        proxy_pass http://127.0.0.1:8787/admin/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8787/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
  ln -sf "$CONF" /etc/nginx/sites-enabled/granit-karel.ru
  rm -f /etc/nginx/sites-enabled/default
fi
# Make sure server_name includes both hosts
if [ -n "$CONF" ] && [ -f "$CONF" ]; then
  if ! grep -q "server_name.*granit-karel.ru" "$CONF"; then
    sed -i 's/server_name .*/server_name granit-karel.ru www.granit-karel.ru;/' "$CONF" || true
  fi
fi
nginx -t
systemctl reload nginx
apt-get update -qq
apt-get install -y -qq certbot python3-certbot-nginx
certbot --nginx -d granit-karel.ru -d www.granit-karel.ru --non-interactive --agree-tos -m ${email} --redirect
nginx -t
systemctl reload nginx
echo "=== ssl ok ==="
ss -tlnp | grep -E ':80|:443' || true
curl -skI https://127.0.0.1/ -H "Host: granit-karel.ru" | head -15
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
