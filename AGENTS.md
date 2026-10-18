# Agent notes

## GitHub Pages

After finishing a change: push the branch, open a pull request, and **merge it into `main` immediately**. Do not wait for “слей PR”. GitHub Pages is served from `main`; unmerged PRs are invisible on the live site.

## Cursor Cloud specific instructions

- **Сайт:** статический HTML в корне; локально `python3 -m http.server 8080`.
- **Админка:** `npm install` then `ADMIN_PASSWORD='…минимум 8 символов…' npm start` → http://127.0.0.1:8787/admin (bind `127.0.0.1` по умолчанию). Для CI/облака без своего пароля: `ADMIN_ALLOW_DEFAULT=1` только в development.
- **Проверки:** `npm audit`; smoke админки через curl к `/admin/api/login` и `/data/site.json` (должен быть 404 при работающем `npm start`).
