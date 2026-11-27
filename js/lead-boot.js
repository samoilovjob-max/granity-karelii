(() => {
  const src = document.currentScript && document.currentScript.src;
  const prefix = src ? src.replace(/lead-boot\.js(?:\?.*)?$/i, "") : "js/";
  let started = false;
  let pendingLead = null;

  const flushPendingLead = () => {
    const trigger = pendingLead;
    pendingLead = null;
    if (!trigger || !document.contains(trigger)) return;
    // lead.js has registered its delegated click handler by now.
    trigger.click();
  };

  window.addEventListener("gk:lead-ready", flushPendingLead);

  const load = () => {
    if (started) return;
    started = true;
    const phone = document.createElement("script");
    phone.src = `${prefix}phone-countries.js`;
    phone.onload = () => {
      const lead = document.createElement("script");
      lead.src = `${prefix}lead.js`;
      lead.onerror = () => {
        started = false;
      };
      document.body.appendChild(lead);
    };
    phone.onerror = () => {
      started = false;
    };
    document.body.appendChild(phone);
  };

  // First .js-lead click can arrive before lead.js is ready (lazy boot).
  // Hold navigation and replay the click once GK_LEAD is available.
  document.addEventListener(
    "click",
    (event) => {
      if (window.GK_LEAD) return;
      const trigger = event.target.closest(".js-lead");
      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      pendingLead = trigger;
      load();
    },
    true
  );

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
