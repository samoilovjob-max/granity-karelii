# Agent notes

## GitHub Pages + Reg.ru

After finishing a change: push the branch, open a pull request, and **merge it into `main` immediately**. Do not wait for “слей PR”.

- **GitHub Pages** publishes from `main` (preview: `samoilovjob-max.github.io/granity-karelii`).
- **Production `granit-karel.ru`** is hosted on **Reg.ru**. Pages ≠ Reg.ru until DNS points at Pages or FTP deploy runs.
- FTP deploy: `.github/workflows/deploy-regru.yml` uploads static files via FTP (SSH git-pull from Actions timed out on port 22). Secrets: `REGRU_FTP_HOST`, `REGRU_FTP_USER`, `REGRU_FTP_PASSWORD` (optional `REGRU_FTP_DIR`).
 - Host / login / password: ЛК Рег.ру → услуга хостинга → вкладка «Доступы» (логин вида `u1234567`, хост — IP сервера). Do **not** put root SSH credentials into these secrets — use the hosting FTP account.
 - `REGRU_FTP_DIR`: корневая папка сайта (часто `www/granit-karel.ru/`, `public_html/` или `httpdocs/` — зависит от панели).
- Keep `siteUrl` / canonical / sitemap on `https://granit-karel.ru`. `CNAME` in repo is for Pages custom domain when DNS is switched.

`_config.yml` excludes `admin/` (and Node tooling) from the published site. Do not remove that exclude without another way to keep the CMS off Pages.

## Admin security

- Require a strong `ADMIN_PASSWORD` (or `admin/.local-password`); never restore a default password.
- Server must bind to `127.0.0.1` only; Nginx proxies `/admin/` and sets `X-Real-IP` / `X-Forwarded-For`.
- Rate-limit login by real client IP (Node reads proxy headers only from loopback). Optional allowlist: `ADMIN_ALLOW_IPS=1.2.3.4,5.6.7.8` (PM2 env).
- Mutating admin API calls need the `X-CSRF-Token` header; keep CSRF + Secure-on-HTTPS cookie (`Path=/admin`).
- `robots.txt` must `Disallow: /admin/`; Nginx also sends `X-Robots-Tag: noindex`.
