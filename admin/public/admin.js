const login = document.querySelector("#login");
const app = document.querySelector("#app");
const editor = document.querySelector("#editor");
const pageList = document.querySelector("#pageList");
const preview = document.querySelector("#preview");
const frameWrap = document.querySelector("#frameWrap");
const status = document.querySelector("#status");
const pageTitle = document.querySelector("#pageTitle");

let pages = [];
let current = null;
let fields = {};
let gallery = null;
let ready = false;

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[char]));
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Не получилось");
  return data;
}

function showApp(on) {
  login.hidden = on;
  app.hidden = !on;
}

function setStatus(text) {
  status.textContent = text;
}

function pushPreview() {
  if (!ready || !preview.contentWindow) return;
  const message = { type: "gk-preview", fields };
  if (gallery) message.gallery = gallery;
  preview.contentWindow.postMessage(message, location.origin);
}

function collectFields() {
  fields = {};
  editor.querySelectorAll("[data-field]").forEach((el) => {
    fields[el.dataset.field] = el.value;
  });
  if (gallery) {
    if (Object.prototype.hasOwnProperty.call(fields, "gallery.title")) gallery.title = fields["gallery.title"];
    if (Object.prototype.hasOwnProperty.call(fields, "gallery.lead")) gallery.lead = fields["gallery.lead"];
    editor.querySelectorAll("[data-caption]").forEach((el) => {
      const item = gallery.items.find((entry) => entry.id === el.dataset.caption);
      if (item) item.caption = el.value;
    });
  }
  pushPreview();
  setStatus("Есть несохранённые правки");
}

function renderPages(filter) {
  const query = filter.trim().toLowerCase();
  const groups = new Map();
  pages.forEach((page) => {
    if (query && !page.title.toLowerCase().includes(query)) return;
    if (!groups.has(page.group)) groups.set(page.group, []);
    groups.get(page.group).push(page);
  });
  pageList.innerHTML = [...groups].map(([name, items]) => `
    <section class="group">
      <h2>${escapeHtml(name)}</h2>
      ${items.map((page) => `<button class="page${current && current.id === page.id ? " is-on" : ""}" type="button" data-id="${escapeHtml(page.id)}">${escapeHtml(page.title)}</button>`).join("")}
    </section>
  `).join("");
}

function photoBlock(page) {
  if (!page.photo) return "";
  const image = page.photo.url
    ? `<img src="${escapeHtml(page.photo.url)}?t=${Date.now()}" alt="" />`
    : `<div class="thumb"></div>`;
  return `<div class="photo-box">
    <strong>Фотография</strong>
    ${image}
    <div class="photo-actions">
      <label class="primary">Заменить фото<input id="photoFile" type="file" accept="image/jpeg,image/png,image/webp" hidden /></label>
    </div>
    <p class="hint">JPG и PNG при загрузке сами станут WebP: этот формат легче и страница открывается быстрее.</p>
  </div>`;
}

function renderEditor(page) {
  pageTitle.textContent = page.title;
  if (page.mode === "gallery") {
    gallery = {
      title: page.titleText,
      lead: page.lead,
      items: page.items.map((item) => ({ ...item }))
    };
    fields = { "gallery.title": gallery.title, "gallery.lead": gallery.lead };
    editor.innerHTML = `
      <label>Заголовок<input data-field="gallery.title" value="${escapeHtml(gallery.title)}" /></label>
      <label>Вступление<textarea data-field="gallery.lead">${escapeHtml(gallery.lead)}</textarea></label>
      <div class="drop" id="drop">Перетащите фотографии сюда или нажмите, чтобы выбрать<input id="galleryFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden /></div>
      <p class="hint">Каждое фото само сожмётся в WebP. Подпись можно сразу поправить — справа видно сетку, как на сайте.</p>
      <div id="items"></div>`;
    renderGalleryItems();
    return;
  }
  gallery = null;
  fields = {};
  page.groups.forEach((group) => group.fields.forEach((field) => { fields[field.id] = field.value; }));
  editor.innerHTML = page.groups.map((group) => `
    <details${group.open ? " open" : ""}>
      <summary>${escapeHtml(group.title)}</summary>
      ${group.fields.map((field) => `<label>${escapeHtml(field.label)}${field.type === "textarea"
        ? `<textarea data-field="${escapeHtml(field.id)}">${escapeHtml(field.value)}</textarea>`
        : `<input data-field="${escapeHtml(field.id)}" value="${escapeHtml(field.value)}" />`}</label>`).join("")}
    </details>`).join("") + photoBlock(page);
}

function renderGalleryItems() {
  const box = document.querySelector("#items");
  if (!box) return;
  box.innerHTML = gallery.items.map((item, index) => `
    <article class="gallery-item">
      <img class="thumb" src="/${escapeHtml(item.src)}" alt="" />
      <div>
        <label>Подпись<input data-caption="${escapeHtml(item.id)}" value="${escapeHtml(item.caption || "")}" /></label>
        <div class="item-actions">
          <button class="ghost" type="button" data-move="-1" data-index="${index}" ${index === 0 ? "disabled" : ""}>Выше</button>
          <button class="ghost" type="button" data-move="1" data-index="${index}" ${index === gallery.items.length - 1 ? "disabled" : ""}>Ниже</button>
          <button class="ghost" type="button" data-remove="${escapeHtml(item.id)}">Удалить</button>
        </div>
      </div>
    </article>`).join("");
  pushPreview();
}

function openPreview(href) {
  ready = false;
  const glue = href.includes("?") ? "&" : "?";
  preview.src = `${href}${glue}preview=1&t=${Date.now()}`;
}

async function openPage(id) {
  setStatus("Открываю…");
  const page = await api(`/admin/api/page?id=${encodeURIComponent(id)}`);
  current = page;
  renderEditor(page);
  renderPages(document.querySelector("#filter").value);
  openPreview(page.href);
  setStatus("");
}

async function uploadFiles(files, kind, id) {
  for (const file of files) {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(`/admin/api/upload?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id || "")}`, {
      method: "POST",
      body
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Фото не загрузилось");
    if (kind === "gallery" && data.item) {
      gallery.items.push(data.item);
      renderGalleryItems();
    } else if (current && current.photo) {
      current.photo.url = data.url;
      const message = { type: "gk-preview", fields, photo: { key: current.photo.key, url: `${data.url}?t=${Date.now()}` } };
      if (preview.contentWindow) preview.contentWindow.postMessage(message, location.origin);
      const box = editor.querySelector(".photo-box img, .photo-box .thumb");
      if (box) {
        const image = document.createElement("img");
        image.src = `${data.url}?t=${Date.now()}`;
        image.alt = "";
        box.replaceWith(image);
      }
    }
  }
}

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  document.querySelector("#loginError").hidden = true;
  try {
    await api("/admin/api/login", {
      method: "POST",
      body: JSON.stringify({ password: document.querySelector("#password").value })
    });
    pages = (await api("/admin/api/pages")).pages;
    showApp(true);
    renderPages("");
    await openPage("about");
  } catch (error) {
    const box = document.querySelector("#loginError");
    box.hidden = false;
    box.textContent = error.message;
  }
});

document.querySelector("#logout").addEventListener("click", async () => {
  await api("/admin/api/logout", { method: "POST", body: "{}" });
  showApp(false);
});

document.querySelector("#filter").addEventListener("input", (event) => {
  renderPages(event.target.value);
});

pageList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (button) openPage(button.dataset.id).catch((error) => setStatus(error.message));
});

editor.addEventListener("input", (event) => {
  if (event.target.matches("[data-field], [data-caption]")) collectFields();
});

editor.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove]");
  const move = event.target.closest("[data-move]");
  if (remove && gallery) {
    gallery.items = gallery.items.filter((item) => item.id !== remove.dataset.remove);
    renderGalleryItems();
    setStatus("Убираю фото…");
    api("/admin/api/gallery", { method: "PUT", body: JSON.stringify(gallery) })
      .then(() => setStatus("Фото убрано со страницы"))
      .catch((error) => setStatus(error.message));
  }
  if (move && gallery) {
    const index = Number(move.dataset.index);
    const next = index + Number(move.dataset.move);
    const [item] = gallery.items.splice(index, 1);
    gallery.items.splice(next, 0, item);
    renderGalleryItems();
    setStatus("Есть несохранённые правки");
  }
  if (event.target.id === "drop") document.querySelector("#galleryFiles").click();
});

editor.addEventListener("change", (event) => {
  if (event.target.id === "photoFile") {
    const id = current.id.startsWith("stone:") ? current.id.slice(6) : current.id.slice(8);
    const kind = current.id.startsWith("stone:") ? "stone" : "product";
    setStatus("Сжимаю фото в WebP…");
    uploadFiles(event.target.files, kind, id)
      .then(() => setStatus("Фото уже на странице. Текст сохранится кнопкой «Сохранить»."))
      .catch((error) => setStatus(error.message));
  }
  if (event.target.id === "galleryFiles") {
    setStatus("Сжимаю фото в WebP…");
    uploadFiles(event.target.files, "gallery")
      .then(() => setStatus("Фото добавлено. Подпись сохранится кнопкой «Сохранить»."))
      .catch((error) => setStatus(error.message));
  }
});

editor.addEventListener("dragover", (event) => {
  if (!event.target.closest("#drop")) return;
  event.preventDefault();
  event.target.closest("#drop").classList.add("over");
});

editor.addEventListener("dragleave", (event) => {
  const drop = event.target.closest("#drop");
  if (drop) drop.classList.remove("over");
});

editor.addEventListener("drop", (event) => {
  const drop = event.target.closest("#drop");
  if (!drop) return;
  event.preventDefault();
  drop.classList.remove("over");
  setStatus("Сжимаю фото в WebP…");
  uploadFiles(event.dataTransfer.files, "gallery")
    .then(() => setStatus("Фото добавлено. Подпись сохранится кнопкой «Сохранить»."))
    .catch((error) => setStatus(error.message));
});

document.querySelector("#save").addEventListener("click", async () => {
  if (!current) return;
  setStatus("Сохраняю…");
  try {
    if (current.mode === "gallery") {
      collectFields();
      const saved = await api("/admin/api/gallery", {
        method: "PUT",
        body: JSON.stringify(gallery)
      });
      gallery.items = saved.items;
      renderGalleryItems();
    } else {
      collectFields();
      current = await api("/admin/api/page", {
        method: "PUT",
        body: JSON.stringify({ id: current.id, fields })
      });
      pages = (await api("/admin/api/pages")).pages;
      renderPages(document.querySelector("#filter").value);
    }
    openPreview(current.href || "/galereya.html");
    setStatus("Сохранено");
  } catch (error) {
    setStatus(error.message);
  }
});

document.querySelectorAll(".width").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".width").forEach((item) => item.classList.toggle("is-on", item === button));
    frameWrap.style.justifyItems = button.dataset.width === "100%" ? "stretch" : "center";
    preview.style.width = button.dataset.width;
  });
});

window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || !event.data || event.data.type !== "gk-preview-ready") return;
  ready = true;
  pushPreview();
});

api("/admin/api/me").then((me) => {
  if (!me.ok) return;
  showApp(true);
  return api("/admin/api/pages").then(async (data) => {
    pages = data.pages;
    renderPages("");
    await openPage("about");
  });
}).catch(() => {});
