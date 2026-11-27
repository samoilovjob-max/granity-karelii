(() => {
  const stones = window.GRANITE_DENSITIES || [];
  const stoneSelect = document.getElementById("stone");
  const densityValue = document.getElementById("densityValue");
  const form = document.getElementById("calcForm");
  const clearBtn = document.getElementById("clearBtn");
  const itemsBody = document.getElementById("itemsBody");
  const itemVolume = document.getElementById("itemVolume");
  const itemMass = document.getElementById("itemMass");
  const totalVolume = document.getElementById("totalVolume");
  const totalMass = document.getElementById("totalMass");

  const fields = {
    length: document.getElementById("length"),
    width: document.getElementById("width"),
    thickness: document.getElementById("thickness"),
    qty: document.getElementById("qty")
  };

  let items = [];

  stones.forEach((stone) => {
    const option = document.createElement("option");
    option.value = stone.id;
    option.textContent = stone.name;
    stoneSelect.appendChild(option);
  });

  const selectedStone = () => stones.find((s) => s.id === stoneSelect.value) || stones[0];

  const toNumber = (value) => {
    const raw = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const calc = (length, width, thickness, qty, density) => {
    const volume = ((length * width * thickness) / 1_000_000_000) * qty;
    const mass = volume * density;
    return { volume, mass };
  };

  const formatVolume = (value) =>
    value.toFixed(4).replace(/\.?0+$/, (m) => (m.includes(".") ? m.replace(/0+$/, "").replace(/\.$/, "") : m)) ||
    "0";
  const formatMass = (value) => {
    if (value >= 100) return value.toFixed(1);
    if (value >= 10) return value.toFixed(2);
    return value.toFixed(3);
  };

  const currentValues = () => ({
    length: toNumber(fields.length.value),
    width: toNumber(fields.width.value),
    thickness: toNumber(fields.thickness.value),
    qty: toNumber(fields.qty.value),
    stone: selectedStone()
  });

  const updatePreview = () => {
    const { length, width, thickness, qty, stone } = currentValues();
    densityValue.textContent = String(stone.density);
    const { volume, mass } = calc(length, width, thickness, qty, stone.density);
    itemVolume.textContent = formatVolume(volume);
    itemMass.textContent = formatMass(mass);
  };

  const truckNow = document.getElementById("truckNow");
  const truckLeft = document.getElementById("truckLeft");
  const truckFill = document.getElementById("truckFill");
  const truckMeter = document.getElementById("truckMeter");
  const TRUCK_TONS = 20;

  const updateTruck = (massKg) => {
    if (!truckNow || !truckLeft || !truckFill || !truckMeter) return;
    const tons = massKg / 1000;
    const left = Math.max(0, TRUCK_TONS - tons);
    truckNow.textContent = tons.toFixed(1);
    truckLeft.textContent = left.toFixed(1);
    const share = Math.min(tons / TRUCK_TONS, 1);
    truckFill.style.width = `${share * 100}%`;
    truckMeter.setAttribute("aria-valuenow", tons.toFixed(1));
  };

  const totalsOf = (list) =>
    list.reduce(
      (acc, item) => {
        acc.volume += item.volume;
        acc.mass += item.mass;
        return acc;
      },
      { volume: 0, mass: 0 }
    );

  const orderOpen = document.getElementById("calcOrderOpen");
  const orderHint = document.getElementById("calcOrderHint");
  const orderPanel = document.getElementById("calcOrderPanel");
  const orderForm = document.getElementById("calcOrderForm");

  const syncOrderUi = () => {
    if (!orderOpen) return;
    const hasItems = items.length > 0;
    orderOpen.disabled = !hasItems;
    if (hasItems) {
      orderOpen.removeAttribute("title");
      if (orderHint) orderHint.hidden = true;
    } else {
      orderOpen.setAttribute("title", "Добавьте хотя бы одну позицию в расчёт");
      if (orderHint) orderHint.hidden = false;
      if (orderPanel && !orderPanel.hidden) {
        orderPanel.hidden = true;
        orderOpen.setAttribute("aria-expanded", "false");
      }
    }
  };

  const buildOrderMessage = ({ name, phone, phoneCountry, city, comment }) => {
    const totals = totalsOf(items);
    const tons = totals.mass / 1000;
    const lines = items.map(
      (item, index) =>
        `${index + 1}. ${item.stoneName} — ${item.length}×${item.width}×${item.thickness} мм — ${item.qty} шт — ${formatVolume(item.volume)} м³ — ${formatMass(item.mass)} кг`
    );
    return [
      "Заявка из калькулятора массы",
      "",
      "Контакты:",
      name ? `Имя / организация: ${name}` : "Имя / организация: —",
      `Телефон: ${phone}${phoneCountry ? ` (${phoneCountry})` : ""}`,
      `Город доставки: ${city}`,
      comment ? `Комментарий: ${comment}` : null,
      "",
      "Позиции:",
      ...lines,
      "",
      "Итого по партии:",
      `Общий объём: ${formatVolume(totals.volume)} м³`,
      `Общая масса: ${formatMass(totals.mass)} кг (${tons.toFixed(1)} т)`,
      `Загрузка фуры (20 т): ${tons.toFixed(1)} т / 20.0 т`
    ]
      .filter((line) => line !== null)
      .join("\n");
  };

  const bindOrderForm = () => {
    if (!orderForm || !orderOpen || !orderPanel) return;
    let ready = false;

    const attach = () => {
      if (ready || !window.GK_LEAD) return false;
      ready = true;
      window.GK_LEAD.bindPhoneField(orderForm);

      orderOpen.addEventListener("click", () => {
        if (orderOpen.disabled || !items.length) return;
        const open = orderPanel.hidden;
        orderPanel.hidden = !open;
        orderOpen.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) {
          const focusEl = orderForm.querySelector('[name="phone"]') || orderForm.querySelector('[name="name"]');
          if (focusEl) focusEl.focus({ preventScroll: true });
          orderPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });

      const button = orderForm.querySelector('[type="submit"]');
      const idleLabel = button ? button.textContent : "Отправить заявку";

      orderForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!items.length) {
          syncOrderUi();
          return;
        }
        if (!orderForm.reportValidity()) return;

        if (button) {
          button.disabled = true;
          button.textContent = "Отправка...";
        }
        window.GK_LEAD.setStatus(orderForm, "", "");

        const countryIso = orderForm.phone_country ? orderForm.phone_country.value : "RU";
        const country = window.GK_PHONE_COUNTRIES?.byIso.get(countryIso);
        const name = orderForm.name.value.trim();
        const phone = orderForm.phone.value.trim();
        const city = orderForm.city.value.trim();
        const comment = orderForm.comment.value.trim();
        const phoneCountry = country ? `${country.name} (+${country.dial})` : countryIso;

        try {
          await window.GK_LEAD.submitLead({
            subject: "Заявка из калькулятора массы",
            name,
            phone,
            phoneCountry,
            city,
            comment,
            message: buildOrderMessage({ name, phone, phoneCountry, city, comment }),
            botcheck: orderForm.botcheck ? orderForm.botcheck.value : ""
          });
          window.GK_LEAD.setStatus(
            orderForm,
            "ok",
            "Расчёт отправлен на почту производства. Ответим в течение рабочего дня"
          );
        } catch {
          window.GK_LEAD.setStatus(orderForm, "err", window.GK_LEAD.errorHelpHtml());
        } finally {
          if (button) {
            button.disabled = false;
            button.textContent = idleLabel;
          }
        }
      });
      return true;
    };

    if (attach()) return;

    const onReady = () => {
      if (attach()) cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("gk:lead-ready", onReady);
      clearInterval(timer);
    };

    window.addEventListener("gk:lead-ready", onReady);
    // Poll as a backup; keep waiting well past the old 6s cutoff.
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (attach() || tries > 200) cleanup();
    }, 150);
  };

  const renderItems = () => {
    if (!items.length) {
      itemsBody.innerHTML = '<tr class="empty-row"><td colspan="6">Позиций пока нет — добавьте изделие</td></tr>';
      totalVolume.textContent = "0";
      totalMass.textContent = "0";
      updateTruck(0);
      syncOrderUi();
      return;
    }

    itemsBody.innerHTML = items
      .map(
        (item, index) => `
      <tr>
        <td>${item.stoneName}</td>
        <td data-label="Размер, мм">${item.length}×${item.width}×${item.thickness}</td>
        <td data-label="Кол-во">${item.qty}</td>
        <td data-label="Объём, м³">${formatVolume(item.volume)}</td>
        <td data-label="Масса, кг">${formatMass(item.mass)}</td>
        <td><button class="remove-btn" type="button" data-index="${index}" aria-label="Удалить">✕</button></td>
      </tr>`
      )
      .join("");

    const totals = totalsOf(items);
    totalVolume.textContent = formatVolume(totals.volume);
    totalMass.textContent = formatMass(totals.mass);
    updateTruck(totals.mass);
    syncOrderUi();
  };

  stoneSelect.addEventListener("change", updatePreview);
  Object.values(fields).forEach((field) => field.addEventListener("input", updatePreview));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const { length, width, thickness, qty, stone } = currentValues();
    if (!length || !width || !thickness || !qty) return;
    const { volume, mass } = calc(length, width, thickness, qty, stone.density);
    items.push({
      stoneName: stone.name,
      length,
      width,
      thickness,
      qty,
      volume,
      mass
    });
    renderItems();
  });

  itemsBody.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-index]");
    if (!btn) return;
    items.splice(Number(btn.dataset.index), 1);
    renderItems();
  });

  clearBtn.addEventListener("click", () => {
    items = [];
    renderItems();
  });

  updatePreview();
  renderItems();
  bindOrderForm();
})();
