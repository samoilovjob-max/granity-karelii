# Деплой на VPS (Reg.cloud)

Сервер: **Std C2-M2-D40**, Ubuntu 22.04+, IP в панели Reg.cloud.

## 0. DNS (домен → VPS)

**Домен на Beget** → сразу [§ 0.7](#07-домен-и-dns-на-beget-сайт-на-regcloud-ваш-случай).  
**DNS в Reg.ru** → § 0.1–0.6 ниже.

Цель: чтобы **granit-karel.ru** и **www.granit-karel.ru** открывали сервер Reg.cloud (**95.163.228.173**), а не старый хостинг Beget / GitHub Pages / parking.

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

### 0.7. Домен и DNS на Beget, сайт на Reg.cloud (ваш случай)

Домен **granit-karel.ru** / **www.granit-karel.ru** в Beget — это нормально. VPS Reg.cloud только **отдаёт сайт**; «куда смотрит домен» задаётся **DNS в Beget**.

#### Куда зайти в Beget

1. [https://cp.beget.com](https://cp.beget.com) → вход.
2. **Домены** → **granit-karel.ru** (или **Мои домены** → шестерёнка / **DNS**).
3. Раздел **«Редактор DNS»** / **«Подзона DNS»** / **«Управление DNS-записями»**.

Убедитесь, что домен использует **DNS Beget** (не «сторонние NS» на Reg.cloud). Если NS чужие — записи правят там, где NS.

#### Что прописать

| Имя (хост) | Тип | Значение |
|------------|-----|----------|
| `@` (или пусто, «домен без www») | **A** | `95.163.228.173` |
| `www` | **A** | `95.163.228.173` |

Либо для `www`: **CNAME** → `granit-karel.ru` (если Beget не даёт CNAME на www — используйте вторую **A**-запись).

Сохраните изменения. TTL у Beget часто 300–3600 сек — подождите **15–60 минут**.

#### Что убрать или не дублировать

В той же зоне Beget **удалите или замените**:

- старые **A** `@` / `www` на IP **хостинга Beget** (не ваш VPS);
- **A** на IP GitHub Pages, если когда-то вели сайт с GitHub;
- лишние **AAAA**, если не настраивали IPv6 на Reg.cloud.

**Не трогайте** без нужды: **MX**, **TXT** (почта, SPF, DKIM).

#### Хостинг Beget vs VPS

- Сайт будет жить на **Reg.cloud**; тариф **«Сайты» / виртуальный хостинг** Beget для granit-karel.ru **можно не использовать** (файлы в public_html больше не нужны для этого домена).
- Аккаунт Beget **не обязательно закрывать** — домен, почта, другие услуги могут остаться.
- Если в Beget для домена включён **«Парковка»** или **«Перенаправление»** — отключите, иначе перебьёт A-записи.

#### Проверка

```powershell
nslookup granit-karel.ru
nslookup www.granit-karel.ru
```

Ожидается **95.163.228.173** для обоих.

#### HTTPS

Certbot на VPS после того, как DNS указывает на VPS:

```bash
certbot --nginx -d granit-karel.ru -d www.granit-karel.ru --redirect ...
```

#### Если Beget не даёт менять DNS

Иногда домен только «припаркован» на NS Beget, но зона read-only — тогда в поддержку Beget или перенос DNS: редко нужно; обычно **Редактор DNS** доступен в cp.beget.com.

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
