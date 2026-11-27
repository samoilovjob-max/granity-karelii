/** Apply Nginx vhost: apex canonical, www→apex, http→https, IP→444.
 * Env: VPS_HOST, VPS_PASSWORD
 */
const { Client } = require("ssh2");

const host = process.env.VPS_HOST;
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;
const siteRoot = "/var/www/granity-karelii";

if (!host || !password) {
  console.error("Need VPS_HOST and VPS_PASSWORD");
  process.exit(1);
}

const nginxConf = `# granit-karel.ru — каноникал без www
# Лимит попыток логина в админку (http context: файл include'ится внутри http {})
limit_req_zone $binary_remote_addr zone=gk_admin_login:10m rate=8r/m;

# www → apex (http и https)
server {
  listen 80;
  listen [::]:80;
  listen 443 ssl;
  listen [::]:443 ssl;
  http2 on;
  server_name www.granit-karel.ru;

  ssl_certificate /etc/letsencrypt/live/granit-karel.ru/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/granit-karel.ru/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

  return 301 https://granit-karel.ru$request_uri;
}

# HTTP apex → HTTPS
server {
  listen 80;
  listen [::]:80;
  server_name granit-karel.ru;
  return 301 https://granit-karel.ru$request_uri;
}

# HTTPS apex — основной сайт
server {
  listen 443 ssl;
  listen [::]:443 ssl;
  http2 on;
  server_name granit-karel.ru;

  root ${siteRoot};
  index index.html;

  client_max_body_size 32m;

  ssl_certificate /etc/letsencrypt/live/granit-karel.ru/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/granit-karel.ru/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

  # HSTS: браузер запоминает HTTPS на год (включая www)
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
  add_header X-Frame-Options "SAMEORIGIN" always;

  location = /admin/api/login {
    limit_req zone=gk_admin_login burst=5 nodelay;
    limit_req_status 429;
    # add_header в location сбрасывает server-level — security headers повторяем явно
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    proxy_pass http://127.0.0.1:8787/admin/api/login;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /admin/ {
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
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

  # Soft-stub HTML → постоянный 301 на канонические URL
  location = /polezno.html {
    return 301 https://granit-karel.ru/kalkulyator-massy-granita.html;
  }
  location = /postavka.html {
    return 301 https://granit-karel.ru/postavka-granita-petrozavodsk-kareliya.html;
  }

  location / {
    error_page 418 = @preview;
    if ($arg_preview = "1") {
      return 418;
    }
    try_files $uri $uri/ $uri.html =404;
  }

  location @preview {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location ~ /\\. {
    deny all;
  }

  location ^~ /admin/.local-password {
    deny all;
  }
}

# IP / неизвестный Host — не индексировать как дубль
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  listen 443 ssl default_server;
  listen [::]:443 ssl default_server;
  http2 on;
  server_name _;

  ssl_certificate /etc/letsencrypt/live/granit-karel.ru/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/granit-karel.ru/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

  return 444;
}
`;

const remote = `
set -e
cat > /etc/nginx/sites-available/granit-karel <<'NGINX_EOF'
${nginxConf}
NGINX_EOF
ln -sfn /etc/nginx/sites-available/granit-karel /etc/nginx/sites-enabled/granit-karel
rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/granit-karel.ru
nginx -t
systemctl reload nginx
echo "=== checks ==="
echo "-- http apex"
curl -sI -H 'Host: granit-karel.ru' http://127.0.0.1/ | head -6
echo "-- http www"
curl -sI -H 'Host: www.granit-karel.ru' http://127.0.0.1/ | head -6
echo "-- https www"
curl -skI -H 'Host: www.granit-karel.ru' https://127.0.0.1/ | head -6
echo "-- https apex"
curl -skI -H 'Host: granit-karel.ru' https://127.0.0.1/ | head -12
echo "-- http2"
curl -skI --http2 -H 'Host: granit-karel.ru' https://127.0.0.1/ | head -3
echo "-- polezno 301"
curl -skI -H 'Host: granit-karel.ru' https://127.0.0.1/polezno.html | head -8
echo "-- postavka 301"
curl -skI -H 'Host: granit-karel.ru' https://127.0.0.1/postavka.html | head -8
echo "-- http IP"
curl -sI http://127.0.0.1/ | head -6 || echo "closed/empty (444 ok)"
echo "=== done ==="
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
