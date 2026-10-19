#!/usr/bin/env bash
# Первичная настройка Ubuntu 22.04/24.04 на Reg.cloud для granit-karel.ru
# Запуск на сервере: sudo bash setup-vps.sh
set -euo pipefail

DOMAIN="${DOMAIN:-granit-karel.ru}"
REPO="${REPO:-https://github.com/samoilovjob-max/granity-karelii.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/var/www/granity-karelii}"
ENV_FILE="${ENV_FILE:-/etc/granity-karelii.env}"
NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Запустите от root: sudo bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx git curl ca-certificates ufw

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

mkdir -p "$(dirname "$APP_DIR")"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone --branch "$BRANCH" --depth 1 "$REPO" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH" || true
fi

cd "$APP_DIR"
npm install --omit=dev

if [[ ! -f "$ENV_FILE" ]]; then
  ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
  cat >"$ENV_FILE" <<EOF
NODE_ENV=production
PORT=8787
ADMIN_BIND_HOST=127.0.0.1
ADMIN_COOKIE_SECURE=1
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EOF
  chmod 600 "$ENV_FILE"
  echo ""
  echo "=== Пароль админки (сохраните, больше не показывается) ==="
  echo "$ADMIN_PASSWORD"
  echo "========================================================="
else
  echo "Файл $ENV_FILE уже есть — пароль не менялся."
fi

START_WRAPPER="/usr/local/bin/granity-karelii-start"
cat >"$START_WRAPPER" <<EOF
#!/usr/bin/env bash
set -a
source ${ENV_FILE}
set +a
cd ${APP_DIR}
exec node admin/server.js
EOF
chmod 755 "$START_WRAPPER"

pm2 delete granity-admin 2>/dev/null || true
pm2 start "$START_WRAPPER" --name granity-admin --interpreter bash
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/nginx-granit-karel.ru.conf" ]]; then
  cp "$SCRIPT_DIR/nginx-granit-karel.ru.conf" "$NGINX_SITE"
else
  cp "$APP_DIR/deploy/nginx-granit-karel.ru.conf" "$NGINX_SITE"
fi
ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/${DOMAIN}"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo ""
echo "Готово. Проверьте DNS: A @ и A www -> $(curl -4 -s ifconfig.me || echo 'IP_СЕРВЕРА')"
echo "Сайт по HTTP: http://${DOMAIN}/"
echo "Админка: https://${DOMAIN}/admin (HTTPS после certbot)"
echo ""
echo "Когда DNS обновился:"
echo "  apt-get install -y certbot python3-certbot-nginx"
echo "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --redirect -m info@${DOMAIN} --agree-tos -n"
