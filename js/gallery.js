(() => {
  const root = document.getElementById("gallery-root");
  const filters = document.querySelector(".gallery-filters");
  if (!root || !filters) return;

  const cards = () => [...root.querySelectorAll(".gallery-card")];
  const blocks = () => [...root.querySelectorAll("[data-gallery-block]")];

  function setFilter(id) {
    filters.querySelectorAll("[data-filter]").forEach((btn) => {
      const active = btn.getAttribute("data-filter") === id;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    if (id === "all") {
      blocks().forEach((block) => {
        block.hidden = false;
      });
      cards().forEach((card) => {
        card.hidden = false;
      });
      return;
    }

    blocks().forEach((block) => {
      const kind = block.getAttribute("data-gallery-block");
      if (id === "workshop") block.hidden = kind !== "workshop";
      else block.hidden = kind !== "catalog";
    });
    cards().forEach((card) => {
      card.hidden = card.getAttribute("data-category") !== id;
    });
  }

  filters.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-filter]");
    if (!btn) return;
    setFilter(btn.getAttribute("data-filter"));
  });
})();
