const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const content = require("./content");

const PORT = Number(process.env.PORT) || 8787;
const PASSWORD = process.env.ADMIN_PASSWORD || "karelia";
const sessions = new Set();

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
    var alt = figure.getAttribute("data-photo");
    figure.innerHTML = '<img src="' + url + '" alt="" />';
    var image = figure.querySelector("img");
    image.alt = alt;
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

function tokenFrom(req) {
  const raw = req.headers.cookie || "";
  const match = raw.match(/(?:^|; )gk_admin=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function requireAuth(req, res, next) {
  if (sessions.has(tokenFrom(req))) return next();
  res.status(401).json({ error: "Нужно войти" });
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
  const password = String(req.body && req.body.password || "");
  const left = Buffer.from(password);
  const right = Buffer.from(PASSWORD);
  const same = left.length === right.length && crypto.timingSafeEqual(left, right);
  if (!same) return res.status(401).json({ error: "Неверный пароль" });
  const token = crypto.randomBytes(24).toString("hex");
  sessions.add(token);
  res.setHeader("Set-Cookie", `gk_admin=${token}; HttpOnly; SameSite=Lax; Path=/`);
  res.json({ ok: true });
});

app.post("/admin/api/logout", (req, res) => {
  sessions.delete(tokenFrom(req));
  res.setHeader("Set-Cookie", "gk_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  res.json({ ok: true });
});

app.get("/admin/api/me", (req, res) => {
  res.json({ ok: sessions.has(tokenFrom(req)) });
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

app.put("/admin/api/page", requireAuth, (req, res, next) => {
  try {
    res.json(content.savePage(String(req.body.id || ""), req.body.fields || {}, req.body.seo));
  } catch (error) {
    next(error);
  }
});

app.put("/admin/api/gallery", requireAuth, (req, res, next) => {
  try {
    res.json(content.saveGallery(req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.post("/admin/api/upload", requireAuth, upload.single("file"), async (req, res, next) => {
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
    const file = path.join(content.root, req.path);
    const root = path.resolve(content.root);
    if (!file.startsWith(root) || !fs.existsSync(file)) return next();
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

app.listen(PORT, () => {
  console.log(`Админка: http://127.0.0.1:${PORT}/admin`);
  console.log("Пароль берётся из ADMIN_PASSWORD, иначе karelia");
});
