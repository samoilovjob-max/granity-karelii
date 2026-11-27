(() => {
  const button = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!button || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  };

  button.addEventListener("click", () => {
    setOpen(!nav.classList.contains("is-open"));
  });

  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link || !nav.contains(link)) return;
    setOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (!nav.classList.contains("is-open")) return;
    if (nav.contains(event.target) || button.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
})();
