(() => {
  // Куда уходит заявка. Сайт на GitHub Pages сам письма не хранит.
  // Вставьте Access Key из кабинета https://web3forms.com — это и есть API-токен.
  const FORM_ENDPOINT = "https://api.web3forms.com/submit";
  const FORM_ACCESS_KEY = "";

  const PHONE_HREF = "tel:+79218017170";
  const PHONE_TEXT = "+7 921 801 71 70";

  const phoneData = () => window.GK_PHONE_COUNTRIES;

  const policyHref = () => {
    const link = document.querySelector('a[href$="politika.html"]');
    return link ? link.getAttribute("href") : "politika.html";
  };

  const phoneFieldHtml = () => `
    <label class="phone-label">
      Телефон / WhatsApp
      <div class="phone-field">
        <button type="button" class="phone-country" aria-haspopup="listbox" aria-expanded="false" aria-label="Код страны">
          <span class="phone-flag" aria-hidden="true">🇷🇺</span>
          <span class="phone-code">+7</span>
          <span class="phone-caret" aria-hidden="true">▾</span>
        </button>
        <input type="tel" name="phone" required autocomplete="tel" inputmode="tel" placeholder="(___) ___-__-__" />
        <input type="hidden" name="phone_country" value="RU" />
        <input type="hidden" name="phone_dial" value="7" />
      </div>
      <div class="phone-dropdown" hidden role="listbox" aria-label="Страна"></div>
    </label>
  `;

  const fieldsHtml = () => `
    <label>
      Имя / организация
      <input type="text" name="name" required autocomplete="name" placeholder="Ваше имя или компания" />
    </label>
    ${phoneFieldHtml()}
    <label>
      Тип продукции
      <select name="product">
        <option value="">Выберите тип</option>
        <option>Памятники</option>
        <option>Плиты мощения</option>
        <option>Брусчатка</option>
        <option>Бордюры</option>
        <option>Слэбы</option>
        <option>Другое</option>
      </select>
    </label>
    <label>
      Город доставки
      <input type="text" name="city" autocomplete="address-level2" placeholder="Город доставки (для расчета логистики)" />
    </label>
    <label>
      Текст заявки / объём
      <textarea name="comment" placeholder="Изделия, ориентировочный объем или размеры"></textarea>
    </label>
    <label class="lead-hp">Не заполняйте это поле
      <input type="text" name="botcheck" tabindex="-1" autocomplete="off" />
    </label>
    <input type="hidden" name="subject" value="Заявка на партию" />
    <div class="form-agreement">
      <input type="checkbox" id="agreement" name="agreement" required checked />
      <label for="agreement">Нажимая кнопку, я даю согласие на <a href="${policyHref()}" target="_blank" rel="noopener noreferrer">обработку персональных данных</a> и соглашаюсь с Политикой конфиденциальности.</label>
    </div>
    <p class="lead-status" role="status" aria-live="polite"></p>
    <button class="btn btn-primary" type="submit">Отправить заявку</button>
  `;

  const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

  const applyMask = (digits, mask) => {
    let out = "";
    let i = 0;
    for (const char of mask) {
      if (char === "#") {
        if (i >= digits.length) break;
        out += digits[i++];
      } else if (i < digits.length) {
        out += char;
      } else {
        break;
      }
    }
    return out;
  };

  const formatNational = (country, digits) => {
    let national = onlyDigits(digits);
    if (country.iso === "KZ") {
      if (!national.startsWith("7")) national = `7${national.replace(/^7*/, "")}`;
      national = national.slice(0, 10);
    } else {
      national = national.slice(0, country.max);
    }
    if (country.mask) return applyMask(national, country.mask);
    return national.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  };

  const placeholderFor = (country) => {
    if (country.iso === "KZ") return "(7__) ___-__-__";
    if (country.mask) return country.mask.replace(/#/g, "_");
    return "номер без кода страны";
  };

  const isValidNational = (country, digits) => {
    const national = onlyDigits(digits);
    if (country.iso === "KZ") return national.length === 10 && national.startsWith("7");
    return national.length >= country.min && national.length <= country.max;
  };

  const fullPhone = (country, digits) => `+${country.dial}${onlyDigits(digits)}`;

  const closeDropdown = (root) => {
    const menu = root.querySelector(".phone-dropdown");
    const button = root.querySelector(".phone-country");
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    root.classList.remove("is-open");
  };

  const placeDropdown = (root) => {
    const menu = root.querySelector(".phone-dropdown");
    const field = root.querySelector(".phone-field");
    if (!menu || !field) return;
    const rect = field.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const preferUp = spaceBelow < 220 && rect.top > spaceBelow;
    root.classList.toggle("is-drop-up", preferUp);
    menu.style.maxHeight = `${Math.max(140, Math.min(260, preferUp ? rect.top - 12 : spaceBelow - 12))}px`;
  };

  const bindPhoneField = (form) => {
    const data = phoneData();
    if (!data) return;

    let label = form.querySelector(".phone-label");
    if (!label) {
      const old = form.querySelector('input[name="phone"]');
      if (!old) return;
      const wrap = document.createElement("div");
      wrap.innerHTML = phoneFieldHtml().trim();
      label = wrap.firstElementChild;
      old.replaceWith(label);
    }

    const root = label;
    const button = root.querySelector(".phone-country");
    const flagEl = root.querySelector(".phone-flag");
    const codeEl = root.querySelector(".phone-code");
    const input = root.querySelector('input[name="phone"]');
    const countryInput = root.querySelector('input[name="phone_country"]');
    const dialInput = root.querySelector('input[name="phone_dial"]');
    const menu = root.querySelector(".phone-dropdown");
    if (!button || !input || !menu || root.dataset.phoneBound === "1") return;
    root.dataset.phoneBound = "1";

    let country = data.byIso.get(data.defaultIso);

    const renderMenu = () => {
      menu.innerHTML = data.groups
        .map((group) => {
          const items = group.isos
            .map((iso) => data.byIso.get(iso))
            .filter(Boolean)
            .map(
              (item) => `<button type="button" class="phone-option${item.iso === country.iso ? " is-active" : ""}" role="option" data-iso="${item.iso}" aria-selected="${item.iso === country.iso}">
              <span class="phone-option-flag" aria-hidden="true">${item.flag}</span>
              <span class="phone-option-name">${item.name}</span>
              <span class="phone-option-code">+${item.dial}</span>
            </button>`
            )
            .join("");
          return `<div class="phone-group" role="group" aria-label="${group.title}">
            <div class="phone-group-title">${group.title}</div>
            ${items}
          </div>`;
        })
        .join("");
    };

    const setCountry = (next, { keepDigits = false } = {}) => {
      country = next;
      flagEl.textContent = country.flag;
      codeEl.textContent = `+${country.dial}`;
      countryInput.value = country.iso;
      dialInput.value = country.dial;
      input.placeholder = placeholderFor(country);
      let digits = keepDigits ? onlyDigits(input.dataset.national || "") : "";
      if (country.iso === "KZ" && digits && !digits.startsWith("7")) digits = `7${digits}`.slice(0, 10);
      input.dataset.national = digits;
      input.value = formatNational(country, digits);
      input.setCustomValidity("");
      renderMenu();
    };

    const syncValidity = () => {
      const digits = input.dataset.national || "";
      if (!digits) {
        input.setCustomValidity("Укажите номер телефона");
        return false;
      }
      if (!isValidNational(country, digits)) {
        input.setCustomValidity("Проверьте номер для выбранной страны");
        return false;
      }
      input.setCustomValidity("");
      return true;
    };

    const readDigits = (raw) => {
      let digits = onlyDigits(raw);
      const dial = country.dial;
      if (digits.startsWith(dial) && digits.length > dial.length) {
        digits = digits.slice(dial.length);
      }
      if (country.iso === "KZ") {
        // Local numbers start with 7; keep that prefix once the user types.
        if (digits && !digits.startsWith("7")) digits = `7${digits}`;
        digits = digits.slice(0, 10);
      } else {
        digits = digits.slice(0, country.max);
      }
      return digits;
    };

    button.addEventListener("click", (event) => {
      event.preventDefault();
      const open = menu.hidden;
      document.querySelectorAll(".phone-label.is-open").forEach((node) => {
        if (node !== root) closeDropdown(node);
      });
      if (open) {
        renderMenu();
        menu.hidden = false;
        button.setAttribute("aria-expanded", "true");
        root.classList.add("is-open");
        placeDropdown(root);
      } else {
        closeDropdown(root);
      }
    });

    menu.addEventListener("click", (event) => {
      const option = event.target.closest("[data-iso]");
      if (!option) return;
      const next = data.byIso.get(option.dataset.iso);
      if (!next) return;
      setCountry(next);
      closeDropdown(root);
      input.focus();
    });

    input.addEventListener("input", () => {
      const digits = readDigits(input.value);
      input.dataset.national = digits;
      input.value = formatNational(country, digits);
      syncValidity();
    });

    input.addEventListener("focus", () => closeDropdown(root));
    input.addEventListener("blur", syncValidity);

    document.addEventListener("click", (event) => {
      if (!root.contains(event.target)) closeDropdown(root);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDropdown(root);
    });

    window.addEventListener("resize", () => {
      if (!menu.hidden) placeDropdown(root);
    });

    form.addEventListener("reset", () => {
      queueMicrotask(() => setCountry(data.byIso.get(data.defaultIso)));
    });

    form.addEventListener(
      "submit",
      () => {
        syncValidity();
        if (!isValidNational(country, input.dataset.national || "")) return;
        input.value = fullPhone(country, input.dataset.national || "");
      },
      true
    );

    setCountry(data.byIso.get(data.defaultIso));
  };

  const setStatus = (form, kind, html) => {
    const status = form.querySelector(".lead-status");
    status.className = `lead-status${kind ? ` is-${kind}` : ""}`;
    status.innerHTML = html;
  };

  const applyTopic = (form, topic) => {
    const subject = form.querySelector('[name="subject"]');
    if (subject) subject.value = topic || "Заявка на партию";
  };

  const bindForm = (form) => {
    if (form.dataset.bound === "1") return;
    form.dataset.bound = "1";
    bindPhoneField(form);
    const button = form.querySelector('[type="submit"]');
    const idleLabel = button.textContent;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      if (!FORM_ACCESS_KEY) {
        setStatus(
          form,
          "err",
          `Ошибка отправки, пожалуйста, позвоните по телефону <a href="${PHONE_HREF}">${PHONE_TEXT}</a>.`
        );
        return;
      }

      button.disabled = true;
      button.textContent = "Отправка...";
      setStatus(form, "", "");

      const countryIso = form.phone_country ? form.phone_country.value : "RU";
      const country = phoneData()?.byIso.get(countryIso);
      const body = {
        access_key: FORM_ACCESS_KEY,
        subject: form.subject.value,
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        phone_country: country ? `${country.name} (+${country.dial})` : countryIso,
        product: form.product.value,
        city: form.city.value.trim(),
        comment: form.comment.value.trim(),
        botcheck: form.botcheck.value
      };

      try {
        const response = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(body)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
          throw new Error("send");
        }
        form.reset();
        applyTopic(form, form.dataset.topic || "");
        setStatus(form, "ok", "Заявка успешно принята, свяжемся в течение дня");
      } catch {
        setStatus(
          form,
          "err",
          `Ошибка отправки, пожалуйста, позвоните по телефону <a href="${PHONE_HREF}">${PHONE_TEXT}</a>.`
        );
      } finally {
        button.disabled = false;
        button.textContent = idleLabel;
      }
    });
  };

  const ensureDialog = () => {
    let dialog = document.getElementById("lead-dialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "lead-dialog";
    dialog.className = "lead-dialog";
    dialog.innerHTML = `
      <div class="lead-dialog-head">
        <h2 class="supply-title" id="lead-dialog-title">Запросить оптовый расчёт / спецификацию</h2>
        <button class="btn btn-ghost lead-close" type="button">Закрыть</button>
      </div>
      <form class="lead-form calc-form"></form>
    `;
    dialog.querySelector("form").innerHTML = fieldsHtml();
    dialog.querySelector(".lead-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    document.body.appendChild(dialog);
    bindForm(dialog.querySelector("form"));
    return dialog;
  };

  document.querySelectorAll(".lead-form").forEach(bindForm);

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".js-lead");
    if (!trigger) return;
    event.preventDefault();
    const topic = trigger.getAttribute("data-lead-topic") || "";
    const inline = document.querySelector("#zayavka .lead-form");
    if (inline) {
      inline.dataset.topic = topic;
      applyTopic(inline, topic);
      document.getElementById("zayavka").scrollIntoView({ behavior: "smooth", block: "start" });
      const name = inline.querySelector("[name=name]");
      if (name) name.focus({ preventScroll: true });
      return;
    }
    const dialog = ensureDialog();
    const form = dialog.querySelector("form");
    form.dataset.topic = topic;
    applyTopic(form, topic);
    if (!dialog.open) dialog.showModal();
    const name = form.querySelector("[name=name]");
    if (name) name.focus();
  });
})();
