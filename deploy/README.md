# Деплой на VPS (Reg.cloud)

Сервер: **Std C2-M2-D40**, Ubuntu 22.04+, IP в панели Reg.cloud.

## 1. DNS (Reg.ru)

Для `granit-karel.ru`:

| Запись | Значение |
|--------|----------|
| A `@` | IP VPS (например `95.163.228.173`) |
| A `www` | тот же IP |

Подождите 5–30 минут, проверка: `dig +short granit-karel.ru A`

## 2. SSH на сервер

В Reg.cloud: сервер → доступ → пароль **root** (или свой ключ).

```bash
ssh root@95.163.228.173
```

## 3. Установка одной командой

На сервере (ветка `main` после merge PR с безопасностью):

```bash
apt-get update && apt-get install -y git
git clone --depth 1 https://github.com/samoilovjob-max/granity-karelii.git /var/www/granity-karelii
cd /var/www/granity-karelii/deploy
chmod +x setup-vps.sh
sudo DOMAIN=granit-karel.ru BRANCH=main bash setup-vps.sh
```

До merge hardening можно временно: `BRANCH=cursor/security-hardening-a5db`

Скрипт выведет **пароль админки** — сохраните.

## 4. HTTPS

После того как DNS указывает на VPS:

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d granit-karel.ru -d www.granit-karel.ru --redirect \
  -m info@granit-karel.ru --agree-tos -n
```

## 5. Обновление сайта

```bash
cd /var/www/granity-karelii
git pull origin main
npm install --omit=dev
pm2 restart granity-admin
```

## Файлы

- `setup-vps.sh` — Node 22, PM2, nginx, ufw, env
- `nginx-granit-karel.ru.conf` — прокси на `127.0.0.1:8787`
- `granity-karelii.env.example` — переменные окружения
