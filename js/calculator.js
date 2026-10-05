(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GraniteCalc = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var UNIT_TO_METERS = { mm: 0.001, cm: 0.01, m: 1 };

  var STONES = [
    { id: "gabbro", name: "Габбро-диабаз", density: 3050 },
    { id: "grey", name: "Гранит серый", density: 2700 },
    { id: "red", name: "Гранит красный", density: 2670 },
    { id: "shoksha", name: "Кварцит шокшинский", density: 2650 }
  ];

  function round(value, digits) {
    var factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
  }

  function calculate(input) {
    var unit = UNIT_TO_METERS[input.unit] ? input.unit : "mm";
    var factor = UNIT_TO_METERS[unit];
    var length = Number(input.length);
    var width = Number(input.width);
    var thickness = Number(input.thickness);
    var density = Number(input.density);
    var quantity = Number(input.quantity);

    if (![length, width, thickness, density, quantity].every(isFinite)) {
      return { ok: false, error: "Введите числа во все поля." };
    }
    if (length <= 0 || width <= 0 || thickness <= 0 || density <= 0) {
      return { ok: false, error: "Размеры и плотность должны быть больше нуля." };
    }
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return { ok: false, error: "Количество — целое число больше нуля." };
    }

    var lengthM = length * factor;
    var widthM = width * factor;
    var thicknessM = thickness * factor;
    var volumeOne = lengthM * widthM * thicknessM;
    var volume = volumeOne * quantity;
    var massKg = volume * density;

    return {
      ok: true,
      unit: unit,
      quantity: quantity,
      density: density,
      lengthM: lengthM,
      widthM: widthM,
      thicknessM: thicknessM,
      areaM2: round(lengthM * widthM * quantity, 4),
      volumeM3: round(volume, 6),
      massKg: round(massKg, 2),
      massT: round(massKg / 1000, 3)
    };
  }

  return {
    STONES: STONES,
    calculate: calculate
  };
});
