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
})();
