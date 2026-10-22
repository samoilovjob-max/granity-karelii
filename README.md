# Граниты Карелии

Сайт `granit-karel.ru`. Сейчас в репозитории раздел «Полезно»: калькулятор массы изделий.

Откройте `kalkulyator-massy-granita.html` — калькулятор массы. Главная и `polezno.html` перенаправляют туда же.

Каталог пород: `vidy.html`. У каждой породы своя страница в `granity/`. Текст «О компании» — `o-kompanii.html`.

Каталог продукции: `produkciya.html`. Сначала мемориальные изделия, затем строительные. Страницы изделий — в `produkciya/`. Связи с породами задаются в `scripts/products-data.js`.

Формула (размеры в мм):

- объём, м³ = (Д × Ш × Т / 1 000 000 000) × количество
- масса, кг = объём × плотность породы

Плотности — в `docs/densities.md`. План разделов — в `PLAN.md`.

Локально сайт без админки:

```bash
python3 -m http.server 8080
```

Страница: http://localhost:8080/kalkulyator-massy-granita.html

Админка (тексты всех страниц, галерея, фото в WebP, заголовок и описание для поиска, предпросмотр):

```bash
npm install
```

Пароль (обязательно, без него сервер не стартует):

```bash
# Windows PowerShell
$env:ADMIN_PASSWORD="YourStrongPass1"; npm start

# macOS / Linux
ADMIN_PASSWORD="YourStrongPass1" npm start
```

Или положите пароль в `admin/.local-password` (файл в `.gitignore`, не коммитить) и запустите `npm start`.

Требования: минимум 12 символов, буква и цифра.

Адрес: http://127.0.0.1:8787/admin — только localhost, снаружи сети недоступен.

Пункт меню «Галерея» открывает `galereya.html`. GitHub Pages отдаёт уже сохранённые страницы (`admin/` в публикацию не входит — см. `_config.yml`); сама админка работает, пока запущен `npm start`.
