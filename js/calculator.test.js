var assert = require("assert");
var calc = require("./calculator.js");

var gabbro = calc.calculate({
  length: 600,
  width: 300,
  thickness: 20,
  density: 3050,
  quantity: 1,
  unit: "mm"
});

assert.strictEqual(gabbro.ok, true);
assert.strictEqual(gabbro.volumeM3, 0.0036);
assert.strictEqual(gabbro.massKg, 10.98);
assert.strictEqual(gabbro.areaM2, 0.18);

var ten = calc.calculate({
  length: 1,
  width: 1,
  thickness: 0.03,
  density: 2700,
  quantity: 10,
  unit: "m"
});

assert.strictEqual(ten.ok, true);
assert.strictEqual(ten.volumeM3, 0.3);
assert.strictEqual(ten.massKg, 810);

var bad = calc.calculate({
  length: 0,
  width: 300,
  thickness: 20,
  density: 3050,
  quantity: 1,
  unit: "mm"
});
assert.strictEqual(bad.ok, false);

var fraction = calc.calculate({
  length: 100,
  width: 100,
  thickness: 20,
  density: 2650,
  quantity: 1.5,
  unit: "cm"
});
assert.strictEqual(fraction.ok, false);

console.log("calculator tests passed");
