#!/usr/bin/env bash
# На VPS под root: сбрасывает пароль админки и отключает Secure-cookie до HTTPS.
# Использование: bash fix-admin-login.sh
# Или свой пароль: ADMIN_PASSWORD='ВашПарольНеКороче16' bash fix-admin-login.sh
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/granity-karelii.env}"
APP_DIR="${APP_DIR:-/var/www/granity-karelii}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Нет $ENV_FILE — сначала запустите setup-vps.sh"
  exit 1
fi

NEW_PASSWORD="${ADMIN_PASSWORD:-}"
if [[ -z "$NEW_PASSWORD" ]]; then
  NEW_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
fi
if [[ ${#NEW_PASSWORD} -lt 16 ]]; then
  echo "Пароль должен быть не короче 16 символов"
  exit 1
fi

# Убрать Secure-cookie (ломает вход по http://IP)
if grep -q '^ADMIN_COOKIE_SECURE=' "$ENV_FILE"; then
  sed -i 's/^ADMIN_COOKIE_SECURE=.*/# ADMIN_COOKIE_SECURE=1  # включите после HTTPS/' "$ENV_FILE"
else
  echo "# ADMIN_COOKIE_SECURE=1  # включите после HTTPS" >>"$ENV_FILE"
fi

if grep -q '^ADMIN_PASSWORD=' "$ENV_FILE"; then
  sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${NEW_PASSWORD}|" "$ENV_FILE"
else
  echo "ADMIN_PASSWORD=${NEW_PASSWORD}" >>"$ENV_FILE"
fi

chmod 600 "$ENV_FILE"

# Подтянуть фикс cookie из git, если репозиторий есть
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch origin cursor/vps-deploy-a5db 2>/dev/null || true
  git -C "$APP_DIR" pull --ff-only origin cursor/vps-deploy-a5db 2>/dev/null \
    || git -C "$APP_DIR" checkout cursor/vps-deploy-a5db 2>/dev/null || true
fi

pm2 restart granity-admin
pm2 save

echo ""
echo "=== Новый пароль админки (сохраните) ==="
echo "$NEW_PASSWORD"
echo "========================================"
echo "Откройте: http://95.163.228.173/admin"
echo "После HTTPS: добавьте ADMIN_COOKIE_SECURE=1 в $ENV_FILE и pm2 restart granity-admin"
