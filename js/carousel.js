(() => {
  const INTERVAL_DEFAULT = 7000;
  const SWIPE_THRESHOLD = 48;

  const carousels = [...document.querySelectorAll("[data-carousel]")];
  if (!carousels.length) return;

  let lightbox = null;
  let lightboxIndex = 0;
  let lightboxRoot = null;
  let lightboxImages = [];

  function slidesOf(root) {
    return [...root.querySelectorAll(".photo-carousel-slide")];
  }

  function goTo(root, index, { restart = true } = {}) {
    const slides = slidesOf(root);
    if (!slides.length) return;
    const next = ((index % slides.length) + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === next);
    });
    root.querySelectorAll(".photo-carousel-dot").forEach((dot, i) => {
      const active = i === next;
      dot.classList.toggle("is-active", active);
      if (active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    root.dataset.index = String(next);
    if (restart) restartTimer(root);
  }

  function currentIndex(root) {
    return Number(root.dataset.index || 0);
  }

  function restartTimer(root) {
    clearInterval(root._timer);
    if (root.dataset.paused === "1" || document.hidden) return;
    const ms = Number(root.dataset.interval) || INTERVAL_DEFAULT;
    root._timer = setInterval(() => goTo(root, currentIndex(root) + 1), ms);
  }

  function pause(root) {
    root.dataset.paused = "1";
    clearInterval(root._timer);
  }

  function resume(root) {
    root.dataset.paused = "0";
    restartTimer(root);
  }

  function bindDrag(root, onSwipe) {
    const track = root.querySelector("[data-track]") || root;
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let locked = null;

    const start = (clientX, clientY) => {
      startX = clientX;
      startY = clientY;
      dragging = true;
      locked = null;
      pause(root);
    };

    const move = (clientX, clientY, event) => {
      if (!dragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (locked === "x" && event) event.preventDefault();
    };

    const end = (clientX) => {
      if (!dragging) return;
      const dx = clientX - startX;
      dragging = false;
      if (locked === "x" && Math.abs(dx) >= SWIPE_THRESHOLD) {
        onSwipe(dx < 0 ? 1 : -1);
      }
      resume(root);
      locked = null;
    };

    track.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length !== 1) return;
        start(event.touches[0].clientX, event.touches[0].clientY);
      },
      { passive: true }
    );
    track.addEventListener(
      "touchmove",
      (event) => {
        if (event.touches.length !== 1) return;
        move(event.touches[0].clientX, event.touches[0].clientY, event);
      },
      { passive: false }
    );
    track.addEventListener(
      "touchend",
      (event) => {
        const touch = event.changedTouches[0];
        end(touch ? touch.clientX : startX);
      },
      { passive: true }
    );

    track.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch" || event.button !== 0) return;
      track.setPointerCapture(event.pointerId);
      start(event.clientX, event.clientY);
      track.classList.add("is-dragging");
    });
    track.addEventListener("pointermove", (event) => {
      if (!dragging || event.pointerType === "touch") return;
      move(event.clientX, event.clientY);
    });
    track.addEventListener("pointerup", (event) => {
      if (event.pointerType === "touch") return;
      track.classList.remove("is-dragging");
      end(event.clientX);
    });
    track.addEventListener("pointercancel", () => {
      track.classList.remove("is-dragging");
      dragging = false;
      resume(root);
    });
  }

  function ensureLightbox() {
    if (lightbox) return lightbox;
    lightbox = document.createElement("div");
    lightbox.className = "photo-lightbox";
    lightbox.hidden = true;
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Просмотр фотографии");
    lightbox.innerHTML = `
      <div class="photo-lightbox-backdrop" data-close></div>
      <button type="button" class="photo-lightbox-close" data-close aria-label="Закрыть">×</button>
      <button type="button" class="photo-lightbox-nav photo-lightbox-prev" data-prev aria-label="Предыдущее фото">‹</button>
      <figure class="photo-lightbox-figure">
        <img alt="" draggable="false" />
        <figcaption></figcaption>
      </figure>
      <button type="button" class="photo-lightbox-nav photo-lightbox-next" data-next aria-label="Следующее фото">›</button>`;
    document.body.appendChild(lightbox);

    lightbox.addEventListener("click", (event) => {
      if (event.target.closest("[data-close]")) closeLightbox();
      else if (event.target.closest("[data-prev]")) stepLightbox(-1);
      else if (event.target.closest("[data-next]")) stepLightbox(1);
    });

    bindDrag(lightbox.querySelector(".photo-lightbox-figure"), (dir) => stepLightbox(dir));

    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;
      if (event.key === "Escape") closeLightbox();
      else if (event.key === "ArrowLeft") stepLightbox(-1);
      else if (event.key === "ArrowRight") stepLightbox(1);
    });

    return lightbox;
  }

  function showLightboxSlide() {
    const img = lightbox.querySelector("img");
    const caption = lightbox.querySelector("figcaption");
    const slide = lightboxImages[lightboxIndex];
    img.src = slide.src;
    img.alt = slide.alt;
    caption.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
  }

  function stepLightbox(dir) {
    lightboxIndex = (lightboxIndex + dir + lightboxImages.length) % lightboxImages.length;
    showLightboxSlide();
    if (lightboxRoot) goTo(lightboxRoot, lightboxIndex, { restart: false });
  }

  function openLightbox(root, index) {
    ensureLightbox();
    lightboxRoot = root;
    lightboxImages = slidesOf(root).map((slide) => {
      const img = slide.querySelector("img");
      return { src: img.currentSrc || img.src, alt: img.alt || "" };
    });
    lightboxIndex = index;
    pause(root);
    showLightboxSlide();
    lightbox.hidden = false;
    document.body.classList.add("has-lightbox");
    lightbox.querySelector(".photo-lightbox-close").focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    document.body.classList.remove("has-lightbox");
    if (lightboxRoot) resume(lightboxRoot);
    lightboxRoot = null;
  }

  carousels.forEach((root) => {
    root.dataset.index = "0";
    root.querySelector("[data-prev]")?.addEventListener("click", () => goTo(root, currentIndex(root) - 1));
    root.querySelector("[data-next]")?.addEventListener("click", () => goTo(root, currentIndex(root) + 1));
    root.querySelectorAll(".photo-carousel-dot").forEach((dot) => {
      dot.addEventListener("click", () => goTo(root, Number(dot.dataset.index)));
    });

    const track = root.querySelector("[data-track]");
    let pointerDownAt = null;
    let hoverTimer = null;
    const canHover = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    track?.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType !== "touch") return;
      pointerDownAt = { x: event.clientX, y: event.clientY };
      clearTimeout(hoverTimer);
    });
    track?.addEventListener("pointerup", (event) => {
      if (!pointerDownAt) return;
      const dx = Math.abs(event.clientX - pointerDownAt.x);
      const dy = Math.abs(event.clientY - pointerDownAt.y);
      pointerDownAt = null;
      if (dx < 10 && dy < 10) openLightbox(root, currentIndex(root));
    });

    // Fullscreen on intentional hover over the photo (desktop). Arrows/dots are outside the track.
    track?.addEventListener("mouseenter", () => {
      if (!canHover()) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => openLightbox(root, currentIndex(root)), 280);
    });
    track?.addEventListener("mouseleave", () => clearTimeout(hoverTimer));

    root.addEventListener("focusin", () => pause(root));
    root.addEventListener("focusout", () => {
      if (lightbox?.hidden !== false) resume(root);
    });

    bindDrag(root, (dir) => goTo(root, currentIndex(root) + dir));
    restartTimer(root);
  });

  document.addEventListener("visibilitychange", () => {
    carousels.forEach((root) => {
      if (document.hidden) clearInterval(root._timer);
      else if (lightbox?.hidden !== false) restartTimer(root);
    });
  });
})();
