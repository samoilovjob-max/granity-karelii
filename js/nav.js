(() => {
  const button = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!button || !nav) return;

  button.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    button.setAttribute("aria-expanded", open ? "true" : "false");
  });
})();
