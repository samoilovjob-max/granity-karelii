const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const content = require("./content");

const PORT = Number(process.env.PORT) || 8787;
const HOST = "127.0.0.1";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const MIN_PASSWORD_LENGTH = 12;

const sessions = new Map();
const loginAttempts = new Map();

function loadPassword() {
  if (process.env.ADMIN_PASSWORD) return String(process.env.ADMIN_PASSWORD);
  const file = path.join(__dirname, ".local-password");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  return "";
}

function passwordIssues(password) {
  const issues = [];
  if (!password) {
    issues.push("задайте ADMIN_PASSWORD или создайте admin/.local-password");
    return issues;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    issues.push(`минимум ${MIN_PASSWORD_LENGTH} символов`);
  }
  if (!/[A-Za-zА-Яа-я]/.test(password)) issues.push("нужна хотя бы одна буква");
  if (!/\d/.test(password)) issues.push("нужна хотя бы одна цифра");
  if (password === "karelia") issues.push("пароль по умолчанию запрещён");
  return issues;
}

const PASSWORD = loadPassword();
const passwordProblems = passwordIssues(PASSWORD);
if (passwordProblems.length) {
  console.error("Админка не запущена: слабый или отсутствующий пароль.");
  console.error(`  ${passwordProblems.join("; ")}`);
  console.error("Пример: ADMIN_PASSWORD=\"YourStrongPass1\" npm start");
  console.error("Или: положите пароль в admin/.local-password (файл в .gitignore).");
  process.exit(1);
}

const previewScript = `<script>
(function () {
  if (!/[?&]preview=1(?:&|$)/.test(location.search)) return;
  function text(id, value) {
    document.querySelectorAll("[data-edit]").forEach(function (el) {
      if (el.getAttribute("data-edit") !== id) return;
      el.textContent = value;
      if (el.getAttribute("data-bind") === "tel") {
        var digits = String(value).replace(/\\D/g, "");
        if (digits.length === 11 && (digits.charAt(0) === "7" || digits.charAt(0) === "8")) digits = digits.slice(1);
        if (digits.length === 10) el.setAttribute("href", "tel:+7" + digits);
      }
      if (el.getAttribute("data-bind") === "mailto") el.setAttribute("href", "mailto:" + String(value).trim());
    });
  }
  function photo(key, url) {
    var figure = document.querySelector('[data-photo="' + key + '"]');
    if (!figure || !url) return;
    var alt = figure.getAttribute("data-photo") || "";
    figure.textContent = "";
    var image = document.createElement("img");
    image.src = url;
    image.alt = alt;
    figure.appendChild(image);
  }
  function gallery(data) {
    var root = document.getElementById("gallery-root");
    if (!root || !data) return;
    text("gallery.title", data.title || "");
    text("gallery.lead", data.lead || "");
    if (!data.items) return;
    if (!data.items.length) {
      root.innerHTML = '<p class="gallery-empty">Фотографии работ появятся здесь.</p>';
      return;
    }
    root.innerHTML = data.items.map(function (item) {
      var caption = item.caption ? '<figcaption>' + escapeHtml(item.caption) + '</figcaption>' : '<figcaption></figcaption>';
      return '<figure><img src="' + escapeHtml(item.src) + '" alt="' + escapeHtml(item.caption || "") + '" />' + caption + '</figure>';
    }).join("");
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char];
    });
  }
  window.addEventListener("message", function (event) {
    if (event.origin !== location.origin) return;
    var data = event.data;
    if (!data || data.type !== "gk-preview") return;
    if (data.fields) Object.keys(data.fields).forEach(function (id) { text(id, data.fields[id]); });
    if (data.photo) photo(data.photo.key, data.photo.url);
    if (data.gallery) gallery(data.gallery);
    if (data.seo) {
      if (typeof data.seo.title === "string") document.title = data.seo.title;
      var meta = document.querySelector('meta[name="description"]');
      if (meta && typeof data.seo.description === "string") meta.setAttribute("content", data.seo.description);
    }
  });
  window.parent.postMessage({ type: "gk-preview-ready" }, location.origin);
})();
</script>`;

function isInsideRoot(rootDir, candidate) {
  const rootResolved = path.resolve(rootDir);
  const fileResolved = path.resolve(candidate);
  const relative = path.relative(rootResolved, fileResolved);
  return relative === "" || (relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function tokenFrom(req) {
  const raw = req.headers.cookie || "";
  const match = raw.match(/(?:^|; )gk_admin=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function sessionOf(req) {
  return sessions.get(tokenFrom(req)) || null;
}

function requestIsHttps(req) {
  if (process.env.ADMIN_HTTPS === "1") return true;
  if (req.secure) return true;
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  return proto === "https";
}

function cookieHeader(name, value, req, extra = "") {
  const parts = [`${name}=${value}`, "HttpOnly", "SameSite=Lax", "Path=/"];
  if (requestIsHttps(req)) parts.push("Secure");
  if (extra) parts.push(extra);
  return parts.join("; ");
}

function clientIp(req) {
  return req.socket.remoteAddress || "unknown";
}

function loginAllowed(req) {
  const ip = clientIp(req);
  const now = Date.now();
  let entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(ip, entry);
  }
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  return { ok: true, entry };
}

function requireAuth(req, res, next) {
  if (sessionOf(req)) return next();
  res.status(401).json({ error: "Нужно войти" });
}

function requireCsrf(req, res, next) {
  const session = sessionOf(req);
  if (!session) return res.status(401).json({ error: "Нужно войти" });
  const header = String(req.headers["x-csrf-token"] || "");
  const left = Buffer.from(header);
  const right = Buffer.from(session.csrf);
  const same = left.length === right.length && crypto.timingSafeEqual(left, right);
  if (!same) return res.status(403).json({ error: "Неверный CSRF-токен" });
  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(Object.assign(new Error("Нужна фотография JPG, PNG или WebP"), { status: 400 }));
  }
});

async function toWebp(buffer, destination) {
  await sharp(buffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(destination);
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.post("/admin/api/login", (req, res) => {
  const gate = loginAllowed(req);
  if (!gate.ok) {
    res.setHeader("Retry-After", String(gate.retryAfterSec));
    return res.status(429).json({ error: "Слишком много попыток. Подождите и попробуйте снова." });
  }

  const password = String((req.body && req.body.password) || "");
  const left = Buffer.from(password);
  const right = Buffer.from(PASSWORD);
  const same = left.length === right.length && crypto.timingSafeEqual(left, right);
  if (!same) {
    gate.entry.count += 1;
    return res.status(401).json({ error: "Неверный пароль" });
  }

  loginAttempts.delete(clientIp(req));
  const token = crypto.randomBytes(24).toString("hex");
  const csrf = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { csrf });
  res.setHeader("Set-Cookie", cookieHeader("gk_admin", token, req));
  res.json({ ok: true, csrf });
});

app.post("/admin/api/logout", requireAuth, requireCsrf, (req, res) => {
  sessions.delete(tokenFrom(req));
  res.setHeader("Set-Cookie", cookieHeader("gk_admin", "", req, "Max-Age=0"));
  res.json({ ok: true });
});

app.get("/admin/api/me", (req, res) => {
  const session = sessionOf(req);
  if (!session) return res.json({ ok: false });
  res.json({ ok: true, csrf: session.csrf });
});

app.get("/admin/api/pages", requireAuth, (req, res) => {
  res.json({ pages: content.listPages() });
});

app.get("/admin/api/page", requireAuth, (req, res, next) => {
  try {
    res.json(content.getPage(String(req.query.id || "")));
  } catch (error) {
    next(error);
  }
});

app.put("/admin/api/page", requireAuth, requireCsrf, (req, res, next) => {
  try {
    res.json(content.savePage(String(req.body.id || ""), req.body.fields || {}, req.body.seo));
  } catch (error) {
    next(error);
  }
});

app.put("/admin/api/gallery", requireAuth, requireCsrf, (req, res, next) => {
  try {
    res.json(content.saveGallery(req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.post("/admin/api/upload", requireAuth, requireCsrf, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("Файл не пришёл");
      error.status = 400;
      throw error;
    }
    const kind = String(req.query.kind || "");
    const id = String(req.query.id || "").replace(/[^a-z0-9-]/g, "");
    let relative = "";
    if (kind === "stone" || kind === "product") {
      if (!id) {
        const error = new Error("Не выбрана страница");
        error.status = 400;
        throw error;
      }
      if (kind === "product") {
        const { productPhotoName } = require("../scripts/image-gallery");
        relative = `images/products/${id}/${productPhotoName(req.file.originalname)}`;
      } else {
        relative = `images/granites/${id}.webp`;
      }
    } else if (kind === "gallery") {
      relative = `images/gallery/g${Date.now().toString(36)}.webp`;
    } else {
      const error = new Error("Некуда сохранить фото");
      error.status = 400;
      throw error;
    }
    const absolute = path.join(content.root, relative);
    if (!isInsideRoot(content.root, absolute)) {
      const error = new Error("Некуда сохранить фото");
      error.status = 400;
      throw error;
    }
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    await toWebp(req.file.buffer, absolute);
    let item = null;
    if (kind === "gallery") item = content.addGalleryItem(relative);
    else content.rebuild();
    const stat = fs.statSync(absolute);
    res.json({ url: `/${relative}`, bytes: stat.size, item });
  } catch (error) {
    if (error.message && /unsupported|Input buffer|Vips/.test(error.message)) {
      error.status = 400;
      error.message = "Этот файл не читается. Сохраните фото как JPG или PNG и загрузите снова.";
    }
    next(error);
  }
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});
app.use("/admin", express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  if (req.path.startsWith("/node_modules") || req.path.startsWith("/.git") || req.path.includes(".local-password")) {
    return res.status(404).end();
  }
  if (req.query.preview === "1" && req.path.endsWith(".html")) {
    const root = path.resolve(content.root);
    const relative = path.normalize(decodeURIComponent(req.path)).replace(/^([/\\])+/, "");
    if (relative.includes("..")) return next();
    const file = path.resolve(root, relative);
    if (!isInsideRoot(root, file) || !fs.existsSync(file)) return next();
    const html = fs.readFileSync(file, "utf8").replace("</body>", `${previewScript}</body>`);
    return res.type("html").send(html);
  }
  next();
});

app.use(express.static(content.root, { dotfiles: "ignore", index: "index.html" }));

app.use((error, req, res, next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: status >= 500 ? "Не получилось сохранить" : error.message });
});

app.listen(PORT, HOST, () => {
  console.log(`Админка: http://${HOST}:${PORT}/admin`);
  console.log("Доступ только с этого компьютера (127.0.0.1).");
});
