(() => {
  // Куда уходит заявка. Сайт на GitHub Pages сам письма не хранит.
  // Вставьте Access Key из кабинета https://web3forms.com — это и есть API-токен.
  const FORM_ENDPOINT = "https://api.web3forms.com/submit";
  const FORM_ACCESS_KEY = "";

  const PHONE_HREF = "tel:+79218017170";
  const PHONE_TEXT = "+7 921 801 71 70";

  const policyHref = () => {
    const link = document.querySelector('a[href$="politika.html"]');
    return link ? link.getAttribute("href") : "politika.html";
  };

  const fieldsHtml = () => `
    <label>
      Имя / организация
      <input type="text" name="name" required autocomplete="name" placeholder="Ваше имя или компания" />
    </label>
    <label>
      Телефон / WhatsApp
      <input type="tel" name="phone" required autocomplete="tel" placeholder="+7 (___) ___-__-__" />
    </label>
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

      const body = {
        access_key: FORM_ACCESS_KEY,
        subject: form.subject.value,
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
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
