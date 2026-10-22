# Agent notes

## GitHub Pages + Beget

After finishing a change: push the branch, open a pull request, and **merge it into `main` immediately**. Do not wait for “слей PR”.

- **GitHub Pages** publishes from `main` (preview: `samoilovjob-max.github.io/granity-karelii`).
- **Production `granit-karel.ru`** currently resolves to **Beget**. Pages ≠ Beget until DNS points at Pages or FTP deploy runs.
- FTP deploy: `.github/workflows/deploy-beget.yml` needs repo secrets `BEGET_FTP_HOST`, `BEGET_FTP_USER`, `BEGET_FTP_PASSWORD` (optional `BEGET_FTP_DIR`).
- Keep `siteUrl` / canonical / sitemap on `https://granit-karel.ru`. `CNAME` in repo is for Pages custom domain when DNS is switched.

`_config.yml` excludes `admin/` (and Node tooling) from the published site. Do not remove that exclude without another way to keep the CMS off Pages.

## Admin security

- Require a strong `ADMIN_PASSWORD` (or `admin/.local-password`); never restore a default password.
- Server must bind to `127.0.0.1` only.
- Mutating admin API calls need the `X-CSRF-Token` header; keep CSRF + Secure-on-HTTPS cookie behavior.
