(() => {
  // #region agent log
  const __dbg = (hypothesisId, location, message, data) => {
    try {
      fetch("http://127.0.0.1:7399/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hypothesisId, location, message, data: data || {}, timestamp: Date.now() })
      }).catch(() => {});
    } catch (_) {}
  };
  // #endregion

  const src = document.currentScript && document.currentScript.src;
  const prefix = src ? src.replace(/lead-boot\.js(?:\?.*)?$/i, "") : "js/";
  let started = false;

  // #region agent log
  __dbg("D", "lead-boot.js:init", "lead-boot executing", {
    prefix,
    hasCurrentScript: Boolean(document.currentScript),
    src: src || null,
    readyState: document.readyState,
    hasGkLead: Boolean(window.GK_LEAD)
  });
  // #endregion

  const load = (reason) => {
    if (started) {
      // #region agent log
      __dbg("A", "lead-boot.js:load", "load skipped (already started)", { reason });
      // #endregion
      return;
    }
    started = true;
    // #region agent log
    __dbg("A", "lead-boot.js:load", "starting phone-countries load", {
      reason,
      phoneSrc: `${prefix}phone-countries.js`,
      hasGkLead: Boolean(window.GK_LEAD)
    });
    // #endregion
    const phone = document.createElement("script");
    phone.src = `${prefix}phone-countries.js`;
    phone.onload = () => {
      // #region agent log
      __dbg("D", "lead-boot.js:phone.onload", "phone-countries loaded; appending lead.js", {
        hasPhoneData: Boolean(window.GK_PHONE_COUNTRIES),
        leadSrc: `${prefix}lead.js`
      });
      // #endregion
      const lead = document.createElement("script");
      lead.src = `${prefix}lead.js`;
      lead.onload = () => {
        // #region agent log
        __dbg("D", "lead-boot.js:lead.onload", "lead.js loaded", {
          hasGkLead: Boolean(window.GK_LEAD),
          hasPhoneData: Boolean(window.GK_PHONE_COUNTRIES)
        });
        // #endregion
      };
      lead.onerror = () => {
        // #region agent log
        __dbg("D", "lead-boot.js:lead.onerror", "lead.js failed to load", { leadSrc: lead.src });
        // #endregion
      };
      document.body.appendChild(lead);
    };
    phone.onerror = () => {
      // #region agent log
      __dbg("D", "lead-boot.js:phone.onerror", "phone-countries failed to load", { phoneSrc: phone.src });
      // #endregion
      started = false;
    };
    document.body.appendChild(phone);
  };

  // Calculators bind the phone field as soon as the order panel opens.
  const needsEager =
    document.querySelector("[data-calc-order]") ||
    document.querySelector('script[src*="calculator.js"]') ||
    document.querySelector('script[src*="paving.js"]');

  // #region agent log
  __dbg("C", "lead-boot.js:needsEager", "eager-load decision", {
    needsEager: Boolean(needsEager),
    hasCalcOrder: Boolean(document.querySelector("[data-calc-order]")),
    hasCalculatorScript: Boolean(document.querySelector('script[src*="calculator.js"]')),
    hasPavingScript: Boolean(document.querySelector('script[src*="paving.js"]')),
    path: location.pathname
  });
  // #endregion

  // #region agent log
  document.addEventListener(
    "click",
    (event) => {
      const leadTrigger = event.target.closest(".js-lead");
      const calcOpen = event.target.closest("#calcOrderOpen");
      if (!leadTrigger && !calcOpen) return;
      __dbg("A", "lead-boot.js:early-click", "CTA click before/without lead handler check", {
        kind: leadTrigger ? "js-lead" : "calcOrderOpen",
        hasGkLead: Boolean(window.GK_LEAD),
        started,
        href: leadTrigger ? leadTrigger.getAttribute("href") : null,
        topic: leadTrigger ? leadTrigger.getAttribute("data-lead-topic") : null,
        disabled: calcOpen ? Boolean(calcOpen.disabled) : null,
        className: (leadTrigger || calcOpen).className
      });
    },
    true
  );
  // #endregion

  if (needsEager) {
    load("eager");
    return;
  }

  ["pointerdown", "keydown", "touchstart", "scroll"].forEach((type) => {
    window.addEventListener(
      type,
      () => {
        // #region agent log
        __dbg("A", "lead-boot.js:interaction", "lazy trigger fired", { type, started });
        // #endregion
        load(`interaction:${type}`);
      },
      { once: true, passive: true }
    );
  });
  window.addEventListener("load", () => setTimeout(() => load("timeout-6s"), 6000));
})();
