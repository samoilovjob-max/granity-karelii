(() => {
  const button = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  const useful = document.querySelector("details.nav-useful");

  const setMobileOpen = (open) => {
    if (!button || !nav) return;
    nav.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  };

  const closeUseful = () => {
    if (useful && useful.open) useful.open = false;
  };

  if (button && nav) {
    button.addEventListener("click", () => {
      setMobileOpen(!nav.classList.contains("is-open"));
    });

    nav.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link || !nav.contains(link)) return;
      setMobileOpen(false);
      closeUseful();
    });
  }

  document.addEventListener("click", (event) => {
    if (nav && nav.classList.contains("is-open")) {
      if (!nav.contains(event.target) && !(button && button.contains(event.target))) {
        setMobileOpen(false);
      }
    }
    if (useful && useful.open && !useful.contains(event.target)) {
      closeUseful();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    setMobileOpen(false);
    closeUseful();
  });

  // Rescue lead kit when lead-boot.js 404s or was omitted (prod outage guard).
  const ensureLeadKit = () => {
    if (window.GK_LEAD) return;
    if (document.querySelector("script[data-gk-lead-kit]")) return;

    const hasDirectLead = document.querySelector(
      'script[src*="lead.js"]:not([src*="lead-boot"])'
    );
    const hasPhone = document.querySelector('script[src*="phone-countries.js"]');
    const hasBoot = document.querySelector('script[src*="lead-boot.js"]');

    const loadKit = () => {
      if (window.GK_LEAD || document.querySelector("script[data-gk-lead-kit]")) return;
      const navScript = document.querySelector('script[src*="nav.js"]');
      const prefix = navScript && navScript.src ? navScript.src.replace(/nav\.js(?:\?.*)?$/i, "") : "js/";
      const phone = document.createElement("script");
      phone.src = `${prefix}phone-countries.js`;
      phone.dataset.gkLeadKit = "1";
      phone.onload = () => {
        const lead = document.createElement("script");
        lead.src = `${prefix}lead.js`;
        lead.dataset.gkLeadKit = "1";
        document.body.appendChild(lead);
      };
      document.body.appendChild(phone);
    };

    const afterLoad = (delay, fn) => {
      const run = () => window.setTimeout(fn, delay);
      if (document.readyState === "complete") run();
      else window.addEventListener("load", run, { once: true });
    };

    if (hasDirectLead || hasPhone) {
      // Defer scripts should win; only rescue after full load if GK_LEAD never appeared.
      afterLoad(800, () => {
        if (!window.GK_LEAD) loadKit();
      });
      return;
    }

    // lead-boot present but likely 404'd, or no lead scripts at all.
    afterLoad(hasBoot ? 400 : 0, loadKit);
  };

  queueMicrotask(ensureLeadKit);
})();
