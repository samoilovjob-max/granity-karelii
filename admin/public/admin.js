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
let seo = { title: "", description: "", keywords: [], url: "" };
let ready = false;

function signs(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "знак";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "знака";
  return "знаков";
}

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
  const message = { type: "gk-preview", fields, seo: { title: seo.title, description: seo.description } };
  if (gallery) message.gallery = gallery;
  preview.contentWindow.postMessage(message, location.origin);
}

function collectFields() {
  fields = {};
  editor.querySelectorAll("[data-field]").forEach((el) => {
    fields[el.dataset.field] = el.value;
  });
  const titleInput = editor.querySelector("[data-seo='title']");
  if (titleInput) {
    seo.title = titleInput.value;
    seo.description = editor.querySelector("[data-seo='description']").value;
  }
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

function displayUrl(url) {
  return String(url || "").replace(/^https?:\/\//, "");
}

function rememberSeo(page) {
  const source = page.seo || {};
  seo = {
    title: source.title || "",
    description: source.description || "",
    keywords: Array.isArray(source.keywords) ? source.keywords.slice() : [],
    url: source.url || ""
  };
}

function seoBlock() {
  return `<section class="seo">
    <h2>Продвижение в поиске</h2>
    <p class="hint">Так строка выглядит в Яндексе. Она обновляется сразу и может отличаться от заголовка на странице.</p>
    <article class="snippet" aria-label="Как страница выглядит в поиске">
      <p class="snippet-url"><img src="/images/brand/logo-gk-transparent.svg" alt="" width="16" height="16" /><span id="snippetUrl">${escapeHtml(displayUrl(seo.url))}</span></p>
      <p class="snippet-title" id="snippetTitle">${escapeHtml(seo.title)}</p>
      <p class="snippet-text" id="snippetText">${escapeHtml(seo.description)}</p>
    </article>
    <label>Заголовок в поиске
      <input data-seo="title" value="${escapeHtml(seo.title)}" />
      <span class="count" id="titleCount"></span>
    </label>
    <label>Описание в поиске
      <textarea data-seo="description">${escapeHtml(seo.description)}</textarea>
      <span class="count" id="descriptionCount"></span>
    </label>
    <div class="phrases-box">
      <strong>Ключевые фразы</strong>
      <p class="hint">На странице их не видно. Поиск сначала читает заголовок и описание.</p>
      <div class="phrases" id="phrases"></div>
      <div class="phrase-row">
        <label>Новая фраза
          <input id="phraseInput" placeholder="например, брусчатка" autocomplete="off" />
        </label>
        <button class="ghost" id="addPhrase" type="button">Добавить фразу</button>
      </div>
    </div>
  </section>`;
}

function renderPhrases() {
  const box = document.querySelector("#phrases");
  if (!box) return;
  if (!seo.keywords.length) {
    box.innerHTML = `<p class="hint">Пока нет фраз.</p>`;
    return;
  }
  box.innerHTML = seo.keywords.map((phrase, index) => `
    <span class="phrase">${escapeHtml(phrase)}<button class="phrase-x" type="button" data-phrase-remove="${index}" aria-label="Убрать фразу ${escapeHtml(phrase)}">×</button></span>
  `).join("");
}

function refreshSeo(quiet) {
  const titleInput = editor.querySelector("[data-seo='title']");
  const descriptionInput = editor.querySelector("[data-seo='description']");
  if (!titleInput || !descriptionInput) return;
  seo.title = titleInput.value;
  seo.description = descriptionInput.value;
  const titleNode = document.querySelector("#snippetTitle");
  const textNode = document.querySelector("#snippetText");
  if (titleNode) titleNode.textContent = seo.title.replace(/\s+/g, " ").trim() || "Заголовок появится здесь";
  if (textNode) textNode.textContent = seo.description.replace(/\s+/g, " ").trim() || "Описание появится здесь";
  const titleCount = document.querySelector("#titleCount");
  const descriptionCount = document.querySelector("#descriptionCount");
  const titleLength = seo.title.replace(/\s+/g, " ").trim().length;
  const descriptionLength = seo.description.replace(/\s+/g, " ").trim().length;
  if (titleCount) {
    titleCount.textContent = titleLength > 60
      ? `${titleLength} ${signs(titleLength)} · поиск обычно показывает до 60`
      : `${titleLength} ${signs(titleLength)} · помещается в выдачу`;
    titleCount.classList.toggle("is-long", titleLength > 60);
  }
  if (descriptionCount) {
    if (descriptionLength > 160) descriptionCount.textContent = `${descriptionLength} ${signs(descriptionLength)} · поиск обычно показывает до 160`;
    else if (descriptionLength < 120) descriptionCount.textContent = `${descriptionLength} ${signs(descriptionLength)} · удобнее 120–160`;
    else descriptionCount.textContent = `${descriptionLength} ${signs(descriptionLength)} · хорошая длина`;
    descriptionCount.classList.toggle("is-long", descriptionLength > 160);
    descriptionCount.classList.toggle("is-ok", descriptionLength >= 120 && descriptionLength <= 160);
  }
  pushPreview();
  if (!quiet) setStatus("Есть несохранённые правки");
}

function addPhrase() {
  const input = document.querySelector("#phraseInput");
  if (!input) return;
  const parts = input.value.split(",");
  let added = false;
  for (const part of parts) {
    const phrase = part.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!phrase || seo.keywords.length >= 12) continue;
    if (seo.keywords.some((item) => item.toLowerCase() === phrase.toLowerCase())) continue;
    seo.keywords.push(phrase);
    added = true;
  }
  input.value = "";
  renderPhrases();
  if (seo.keywords.length >= 12) setStatus(added ? "Фраза добавлена. Больше 12 фраз на страницу не нужно" : "На странице уже 12 фраз");
  else if (added) setStatus("Есть несохранённые правки");
}

function photoBlock(page) {
  if (!page.photo) return "";
  const product = String(page.id || "").startsWith("product:");
  const image = page.photo.url
    ? `<img src="${escapeHtml(page.photo.url)}?t=${Date.now()}" alt="" />`
    : `<div class="thumb"></div>`;
  const label = product ? "Добавить фото" : "Заменить фото";
  const multiple = product ? " multiple" : "";
  const hint = product
    ? "Порядок задаёт имя файла: 001_название, затем 002_название, затем 00_название. JPG и PNG станут WebP."
    : "JPG и PNG при загрузке сами станут WebP: этот формат легче и страница открывается быстрее.";
  return `<div class="photo-box">
    <strong>Фотография</strong>
    ${image}
    <div class="photo-actions">
      <label class="primary">${label}<input id="photoFile" type="file" accept="image/jpeg,image/png,image/webp"${multiple} hidden /></label>
    </div>
    <p class="hint">${hint}</p>
  </div>`;
}

function renderEditor(page) {
  pageTitle.textContent = page.title;
  rememberSeo(page);
  if (page.mode === "gallery") {
    gallery = {
      title: page.titleText,
      lead: page.lead,
      items: page.items.map((item) => ({ ...item }))
    };
    fields = { "gallery.title": gallery.title, "gallery.lead": gallery.lead };
    editor.innerHTML = `${seoBlock()}
      <label>Заголовок<input data-field="gallery.title" value="${escapeHtml(gallery.title)}" /></label>
      <label>Вступление<textarea data-field="gallery.lead">${escapeHtml(gallery.lead)}</textarea></label>
      <div class="drop" id="drop">Перетащите фотографии сюда или нажмите, чтобы выбрать<input id="galleryFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden /></div>
      <p class="hint">Каждое фото само сожмётся в WebP. Подпись можно сразу поправить — справа видно сетку, как на сайте.</p>
      <div id="items"></div>`;
    renderPhrases();
    refreshSeo(true);
    renderGalleryItems();
    return;
  }
  gallery = null;
  fields = {};
  page.groups.forEach((group) => group.fields.forEach((field) => { fields[field.id] = field.value; }));
  editor.innerHTML = seoBlock() + page.groups.map((group) => `
    <details${group.open ? " open" : ""}>
      <summary>${escapeHtml(group.title)}</summary>
      ${group.fields.map((field) => `<label>${escapeHtml(field.label)}${field.type === "textarea"
        ? `<textarea data-field="${escapeHtml(field.id)}">${escapeHtml(field.value)}</textarea>`
        : `<input data-field="${escapeHtml(field.id)}" value="${escapeHtml(field.value)}" />`}</label>`).join("")}
    </details>`).join("") + photoBlock(page);
  renderPhrases();
  refreshSeo(true);
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
  if (event.target.matches("[data-seo]")) {
    refreshSeo(false);
    return;
  }
  if (event.target.matches("[data-field], [data-caption]")) collectFields();
});

editor.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.id === "phraseInput") {
    event.preventDefault();
    addPhrase();
  }
});

editor.addEventListener("click", (event) => {
  if (event.target.id === "addPhrase") {
    addPhrase();
    return;
  }
  const removePhrase = event.target.closest("[data-phrase-remove]");
  if (removePhrase) {
    seo.keywords.splice(Number(removePhrase.dataset.phraseRemove), 1);
    renderPhrases();
    setStatus("Есть несохранённые правки");
    return;
  }
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
        body: JSON.stringify({ ...gallery, seo })
      });
      gallery.items = saved.items;
      renderGalleryItems();
    } else {
      collectFields();
      current = await api("/admin/api/page", {
        method: "PUT",
        body: JSON.stringify({ id: current.id, fields, seo })
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
