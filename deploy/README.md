# Деплой на VPS (Reg.cloud)

Сервер: **Std C2-M2-D40**, Ubuntu 22.04+, IP в панели Reg.cloud.

## 0. DNS в Reg.ru (домен → VPS)

Цель: чтобы **granit-karel.ru** и **www.granit-karel.ru** открывали ваш сервер Reg.cloud (**95.163.228.173**), а не старый хостинг / GitHub Pages / parking.

### 0.1. Куда зайти

1. [https://www.reg.ru](https://www.reg.ru) → войти под аккаунтом, где лежит домен.
2. **Домены** → выбрать **granit-karel.ru**.
3. Раздел **DNS-серверы и управление зоной** (или **Управление зоной DNS** / **Ресурсные записи**).

Должна быть **зона DNS у Reg.ru** (стандартные NS вроде `ns1.reg.ru`, `ns2.reg.ru`).  
Если домен переведён на NS Beget/Timeweb — записи правят **там**, не в Reg.ru (логика та же: A на IP VPS).

### 0.2. Что должно получиться

| Имя (хост) | Тип | Значение | TTL |
|------------|-----|----------|-----|
| `@` (или пусто) | **A** | `95.163.228.173` | 300–3600 |
| `www` | **A** | `95.163.228.173` | 300–3600 |

**Не обязательно, но можно вместо A для www:**  
`www` → **CNAME** → `granit-karel.ru` (тогда certbot и nginx всё равно настраиваем на оба имени).

### 0.3. Что удалить или изменить (частые конфликты)

Просмотрите все записи в зоне. **Удалите или замените**, если есть:

| Запись | Проблема |
|--------|----------|
| A `@` / A `www` на **старый IP** Beget / другого VPS | Сайт уходит не на Reg.cloud |
| A `@` на IP **GitHub Pages** | Был статический сайт с GitHub |
| CNAME `@` или `www` на `*.github.io`, `*.beget.tech`, parking | Домен не дойдёт до VPS |
| Лишние **AAAA** (IPv6) на старые адреса | Часть пользователей уйдёт не туда; либо обновите AAAA под Reg.cloud, либо удалите, если IPv6 на VPS не используете |

**MX** (почта `@`) и **TXT** (SPF, DKIM, verification) **не трогайте**, если почта на `@` нужна как раньше.

### 0.4. Сохранить и подождать

1. **Сохранить** зону в Reg.ru.  
2. Обычно **5–30 минут**, иногда до **24 ч** (зависит от TTL и кеша провайдеров).

### 0.5. Как проверить, что DNS уже «переехал»

**Windows (PowerShell):**

```powershell
nslookup granit-karel.ru
nslookup www.granit-karel.ru
```

В ответе для обоих должно быть **95.163.228.173**.

**Mac / Linux / сервер:**

```bash
dig +short granit-karel.ru A
dig +short www.granit-karel.ru A
```

Ожидаемый вывод (две строки по одной на каждую команду):

```text
95.163.228.173
```

**Онлайн:** [https://dnschecker.org](https://dnschecker.org) → тип A → `granit-karel.ru` → смотрите, что в РФ/Европе везде ваш IP.

### 0.6. Порядок работ (чтобы не было простоя)

1. **Сначала** шаги 2–3 (SSH + `setup-vps.sh`) — сайт уже открывается по **http://95.163.228.173**.  
2. **Потом** DNS (этот шаг) — домен начнёт вести на тот же сервер.  
3. **После** того как `dig` показывает новый IP — **certbot** (HTTPS).

Так вы не ждёте DNS с пустым сервером.

### 0.7. Если домен на Beget, а VPS на Reg.cloud

Это нормально: **домен и DNS остаются в Reg.ru**, меняете только **A-записи** на IP Reg.cloud. Хостинг Beget для сайта больше не нужен (аккаунт можно не закрывать, если там почта/другое).

---

## 1. SSH на сервер

В Reg.cloud: сервер → доступ → пароль **root** (или свой ключ).

```bash
ssh root@95.163.228.173
```

## 2. Установка одной командой

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

## 3. HTTPS

После того как DNS указывает на VPS:

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d granit-karel.ru -d www.granit-karel.ru --redirect \
  -m info@granit-karel.ru --agree-tos -n
```

## 4. Обновление сайта

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
