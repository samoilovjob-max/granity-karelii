(() => {
  const src = document.currentScript && document.currentScript.src;
  const prefix = src ? src.replace(/lead-boot\.js(?:\?.*)?$/i, "") : "js/";
  let started = false;

  const load = () => {
    if (started) return;
    started = true;
    const phone = document.createElement("script");
    phone.src = `${prefix}phone-countries.js`;
    phone.onload = () => {
      const lead = document.createElement("script");
      lead.src = `${prefix}lead.js`;
      document.body.appendChild(lead);
    };
    phone.onerror = () => {
      started = false;
    };
    document.body.appendChild(phone);
  };

  // Calculators bind the phone field as soon as the order panel opens.
  const needsEager =
    document.querySelector("[data-calc-order]") ||
    document.querySelector('script[src*="calculator.js"]') ||
    document.querySelector('script[src*="paving.js"]');

  if (needsEager) {
    load();
    return;
  }

  ["pointerdown", "keydown", "touchstart", "scroll"].forEach((type) => {
    window.addEventListener(type, load, { once: true, passive: true });
  });
  window.addEventListener("load", () => setTimeout(load, 6000));
})();
