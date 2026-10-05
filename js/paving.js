(() => {
  const form = document.getElementById("paveForm");
  if (!form) return;

  const areaInput = document.getElementById("paveArea");
  const sizeSelect = document.getElementById("paveSize");
  const dims = document.getElementById("paveDims");
  const lengthInput = document.getElementById("paveLength");
  const widthInput = document.getElementById("paveWidth");
  const thicknessInput = document.getElementById("paveThickness");
  const stoneSelect = document.getElementById("paveStone");
  const densityValue = document.getElementById("paveDensityValue");
  const densityWrap = document.getElementById("paveDensityWrap");
  const densityInput = document.getElementById("paveDensity");
  const reserveSelect = document.getElementById("paveReserve");
  const kindSelect = document.getElementById("paveKind");
  const modeWrap = document.getElementById("paveModeWrap");
  const modeSelect = document.getElementById("paveMode");
  const layerWrap = document.getElementById("paveLayerWrap");
  const layerInput = document.getElementById("paveLayer");
  const errorEl = document.getElementById("paveError");
  const hintEl = document.getElementById("paveHint");
  const perM2El = document.getElementById("pavePerM2");
  const plainEl = document.getElementById("pavePlain");
  const reserveCountEl = document.getElementById("paveReserveCount");
  const weightEl = document.getElementById("paveWeight");
  const weightCard = document.getElementById("paveWeightCard");
  const bulkEl = document.getElementById("paveBulk");
  const bulkCard = document.getElementById("paveBulkCard");

  // Список размеров, мм. Новый типоразмер — ещё одна строка до «custom».
  const SIZES = [
    { id: "80x80x50", l: 80, w: 80, t: 50, label: "80×80×50" },
    { id: "80x80x80", l: 80, w: 80, t: 80, label: "80×80×80" },
    { id: "100x100x50", l: 100, w: 100, t: 50, label: "100×100×50" },
    { id: "100x100x80", l: 100, w: 100, t: 80, label: "100×100×80" },
    { id: "200x100x50", l: 200, w: 100, t: 50, label: "200×100×50" },
    { id: "300x100x50", l: 300, w: 100, t: 50, label: "300×100×50" },
    { id: "100x100x100", l: 100, w: 100, t: 100, label: "100×100×100" },
    { id: "200x100x100", l: 200, w: 100, t: 100, label: "200×100×100" },
    { id: "custom", label: "Свой размер" }
  ];

  // Запас умножается на количество штук, не на площадь.
  const RESERVES = [
    { id: "straight", rate: 0.05, label: "Прямая без подрезки (5%)" },
    { id: "cut", rate: 0.1, label: "Прямая с подрезкой (10%)" },
    { id: "herringbone", rate: 0.15, label: "Ёлочка или диагональ (15%)" }
  ];

  // Брусчатку обычно делают из габбро-диабаза. Список и кг/м³ — из js/densities.js,
  // те же середины диапазонов, что в калькуляторе массы. Другая порода — пункт селекта,
  // произвольное число — пункт «custom».
  const DEFAULT_STONE_ID = "gabbro-diabaz";
  const STONES = window.GRANITE_DENSITIES || [];

  // Колотая насыпью: поправка на неровные грани, верх диапазона 105–110 к базе 100.
  // Геометрия 100×100×100 даёт 1 000 шт/м³. «≈100 шт/м³» из брифа — это 100 шт
  // на 1 м² или на слой 0,1 м (0,1 м³). Коэффициент 1,10 — верхняя граница +10%.
  const SPLIT_PACKING = 1.1;

  const intFmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
  const rateFmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
  const tonneFmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });
  const volumeFmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });

  SIZES.forEach((size) => {
    const option = document.createElement("option");
    option.value = size.id;
    option.textContent = size.label;
    sizeSelect.appendChild(option);
  });

  RESERVES.forEach((reserve) => {
    const option = document.createElement("option");
    option.value = reserve.id;
    option.textContent = reserve.label;
    reserveSelect.appendChild(option);
  });

  STONES.forEach((stone) => {
    const option = document.createElement("option");
    option.value = stone.id;
    option.textContent = stone.name;
    stoneSelect.appendChild(option);
  });
  const customDensity = document.createElement("option");
  customDensity.value = "custom";
  customDensity.textContent = "Своя плотность";
  stoneSelect.appendChild(customDensity);
  stoneSelect.value = DEFAULT_STONE_ID;

  const readNumber = (input) => {
    const raw = input.value.trim();
    if (!raw) return null;
    if (Number.isFinite(input.valueAsNumber)) return input.valueAsNumber;
    const parsed = Number(raw.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const ceilPieces = (value) => {
    const rounded = Math.round(value * 1e6) / 1e6;
    return Math.ceil(rounded - 1e-9);
  };

  const selectedSize = () => SIZES.find((size) => size.id === sizeSelect.value) || SIZES[0];
  const selectedReserve = () => RESERVES.find((item) => item.id === reserveSelect.value) || RESERVES[0];
  const selectedStone = () => STONES.find((stone) => stone.id === stoneSelect.value);

  const syncFields = () => {
    const custom = sizeSelect.value === "custom";
    const split = kindSelect.value === "split";
    const ownDensity = stoneSelect.value === "custom";
    dims.hidden = !custom;
    modeWrap.hidden = !split;
    layerWrap.hidden = !split;
    densityWrap.hidden = !ownDensity;
    if (!split) modeSelect.value = "pieces";
    const stone = selectedStone();
    const typed = readNumber(densityInput);
    const shown = ownDensity ? typed : stone && stone.density;
    densityValue.textContent = shown > 0 ? String(Math.round(shown)) : "—";
  };

  const fail = (message) => ({ ok: false, error: message });

  const positive = (value, sentence) => {
    if (value === null || Number.isNaN(value) || value <= 0) return sentence;
    return "";
  };

  const readForm = () => {
    const area = readNumber(areaInput);
    if (area === null || Number.isNaN(area)) return fail("Укажите площадь мощения — число больше нуля.");
    if (area <= 0) return fail("Площадь мощения должна быть больше нуля.");

    const size = selectedSize();
    let length = size.l;
    let width = size.w;
    let thickness = size.t;

    if (size.id === "custom") {
      length = readNumber(lengthInput);
      width = readNumber(widthInput);
      thickness = readNumber(thicknessInput);
      const lengthError = positive(length, "Длина должна быть больше нуля.");
      if (lengthError) return fail(lengthError);
      const widthError = positive(width, "Ширина должна быть больше нуля.");
      if (widthError) return fail(widthError);
      if (thickness !== null && (Number.isNaN(thickness) || thickness < 0)) {
        return fail("Толщина не может быть отрицательной.");
      }
      if (thickness !== null && thickness <= 0) thickness = null;
    }

    const ownDensity = stoneSelect.value === "custom";
    const density = ownDensity ? readNumber(densityInput) : selectedStone().density;
    const densityError = positive(density, "Плотность должна быть больше нуля.");
    if (densityError) return fail(densityError);

    const reserve = selectedReserve();
    const split = kindSelect.value === "split";
    const bulk = split && modeSelect.value === "bulk";
    let layer = 0.1;

    if (split) {
      layer = readNumber(layerInput);
      const layerError = positive(layer, "Толщина слоя должна быть больше нуля.");
      if (layerError) return fail(layerError);
    }

    if (bulk && !(thickness > 0)) {
      return fail("Для насыпи укажите толщину камня: по ней считается число штук в кубометре.");
    }

    return {
      ok: true,
      area,
      length,
      width,
      thickness: thickness > 0 ? thickness : null,
      reserve,
      density,
      split,
      bulk,
      layer
    };
  };

  const calculate = (input) => {
    // A = (L мм / 1000) × (W мм / 1000), м². Толщина на шт/м² не влияет.
    const areaOne = (input.length / 1000) * (input.width / 1000);
    const perM2 = 1 / areaOne;
    const reserveRate = input.reserve.rate;

    let plainExact;
    let bulkVolume = null;
    let perM3 = null;

    if (input.bulk) {
      bulkVolume = input.area * input.layer;
      const stoneM3 = areaOne * (input.thickness / 1000);
      perM3 = (1 / stoneM3) * SPLIT_PACKING;
      plainExact = bulkVolume * perM3;
    } else {
      plainExact = input.area * perM2;
      if (input.split) bulkVolume = input.area * input.layer;
    }

    const plain = ceilPieces(plainExact);
    const withReserve = ceilPieces(plainExact * (1 + reserveRate));

    let weight = null;
    if (input.thickness > 0) {
      const stoneVolume = areaOne * (input.thickness / 1000) * withReserve;
      weight = stoneVolume * input.density / 1000;
    }

    return { perM2, plain, withReserve, weight, bulkVolume, perM3, reserveRate, density: input.density };
  };

  const hintText = (input, result) => {
    const percent = Math.round(result.reserveRate * 100);
    const density = `${Math.round(result.density)} кг/м³`;
    if (input.bulk) {
      return `Насыпь: объём = площадь × слой. К геометрическому числу штук добавлено 10% на неровные грани, затем запас ${percent}% на укладку. Вес при плотности ${density}. Толщина камня на штуки с квадратного метра не влияет.`;
    }
    const bulkNote = input.split ? " Объём насыпи = площадь × толщина слоя." : "";
    const weightNote = result.weight === null ? " Чтобы увидеть вес, укажите толщину." : ` Вес при плотности ${density}.`;
    return `Запас ${percent}% добавлен к количеству штук, не к площади. Толщина не меняет штуки на 1 м².${weightNote}${bulkNote}`;
  };

  const showError = (message) => {
    errorEl.hidden = false;
    errorEl.textContent = message;
    perM2El.textContent = "—";
    plainEl.textContent = "—";
    reserveCountEl.textContent = "—";
    weightEl.textContent = "—";
    bulkEl.textContent = "—";
    hintEl.textContent = "";
    weightCard.hidden = false;
    bulkCard.hidden = kindSelect.value !== "split";
  };

  const render = () => {
    syncFields();
    const input = readForm();
    if (!input.ok) {
      showError(input.error);
      return;
    }

    const result = calculate(input);
    errorEl.hidden = true;
    errorEl.textContent = "";
    perM2El.textContent = rateFmt.format(result.perM2);
    plainEl.textContent = intFmt.format(result.plain);
    reserveCountEl.textContent = intFmt.format(result.withReserve);
    weightCard.hidden = result.weight === null;
    weightEl.textContent = result.weight === null ? "—" : tonneFmt.format(result.weight);
    bulkCard.hidden = result.bulkVolume === null;
    bulkEl.textContent = result.bulkVolume === null ? "—" : volumeFmt.format(result.bulkVolume);
    hintEl.textContent = hintText(input, result);
  };

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  document.getElementById("paveReset").addEventListener("click", () => {
    areaInput.value = "10";
    sizeSelect.value = SIZES[0].id;
    lengthInput.value = "";
    widthInput.value = "";
    thicknessInput.value = "";
    reserveSelect.value = RESERVES[0].id;
    stoneSelect.value = DEFAULT_STONE_ID;
    densityInput.value = "";
    kindSelect.value = "sawn";
    modeSelect.value = "pieces";
    layerInput.value = "0.1";
    render();
  });

  render();
})();
