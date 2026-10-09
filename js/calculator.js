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
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const calc = (length, width, thickness, qty, density) => {
    const volume = ((length * width * thickness) / 1_000_000_000) * qty;
    const mass = volume * density;
    return { volume, mass };
  };

  const trimFixed = (value, digits) => {
    if (!Number.isFinite(value)) return "0";
    const text = value.toFixed(digits).replace(/\.?0+$/, "");
    return text === "" ? "0" : text;
  };
  const formatVolume = (value) => trimFixed(value, 6);
  const formatMass = (value) => trimFixed(value, 3);

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

  const renderItems = () => {
    if (!items.length) {
      itemsBody.innerHTML = '<tr class="empty-row"><td colspan="6">Позиций пока нет — добавьте изделие</td></tr>';
      totalVolume.textContent = "0";
      totalMass.textContent = "0";
      updateTruck(0);
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

    const totals = items.reduce(
      (acc, item) => {
        acc.volume += item.volume;
        acc.mass += item.mass;
        return acc;
      },
      { volume: 0, mass: 0 }
    );

    totalVolume.textContent = formatVolume(totals.volume);
    totalMass.textContent = formatMass(totals.mass);
    updateTruck(totals.mass);
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
})();
