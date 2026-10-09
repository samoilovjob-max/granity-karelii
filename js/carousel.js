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
    root._timer = null;
    if (root.dataset.paused === "1" || document.hidden) return;
    const ms = Number(root.dataset.interval) || INTERVAL_DEFAULT;
    root._timer = setInterval(() => {
      goTo(root, currentIndex(root) + 1);
    }, ms);
  }

  function pause(root) {
    root.dataset.paused = "1";
    clearInterval(root._timer);
    root._timer = null;
  }

  function resume(root) {
    if (lightbox && !lightbox.hidden && lightboxRoot === root) return;
    root.dataset.paused = "0";
    restartTimer(root);
  }

  function bindDrag(surface, onSwipe, { onTap } = {}) {
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let locked = null;
    let moved = false;

    const begin = (clientX, clientY) => {
      startX = clientX;
      startY = clientY;
      dragging = true;
      locked = null;
      moved = false;
    };

    const move = (clientX, clientY, event) => {
      if (!dragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (!moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) moved = true;
      if (locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (locked === "x" && event && event.cancelable) event.preventDefault();
    };

    const finish = (clientX) => {
      if (!dragging) return;
      const dx = clientX - startX;
      dragging = false;
      surface.classList.remove("is-dragging");
      if (locked === "x" && Math.abs(dx) >= SWIPE_THRESHOLD) {
        onSwipe(dx < 0 ? 1 : -1);
      } else if (!moved && onTap) {
        onTap();
      }
      locked = null;
    };

    surface.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length !== 1) return;
        begin(event.touches[0].clientX, event.touches[0].clientY);
      },
      { passive: true }
    );
    surface.addEventListener(
      "touchmove",
      (event) => {
        if (event.touches.length !== 1) return;
        move(event.touches[0].clientX, event.touches[0].clientY, event);
      },
      { passive: false }
    );
    surface.addEventListener(
      "touchend",
      (event) => {
        const touch = event.changedTouches[0];
        finish(touch ? touch.clientX : startX);
      },
      { passive: true }
    );
    surface.addEventListener(
      "touchcancel",
      () => {
        dragging = false;
        surface.classList.remove("is-dragging");
      },
      { passive: true }
    );
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
    const root = lightboxRoot;
    lightboxRoot = null;
    if (root) resume(root);
  }

  carousels.forEach((root) => {
    root.dataset.index = "0";
    root.dataset.paused = "0";

    const prev = root.querySelector("[data-prev]");
    const next = root.querySelector("[data-next]");
    const step = (index) => {
      root.dataset.paused = "0";
      goTo(root, index);
      // Blur controls so focus does not keep autoplay paused.
      if (document.activeElement instanceof HTMLElement && root.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    };

    prev?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      step(currentIndex(root) - 1);
    });
    next?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      step(currentIndex(root) + 1);
    });
    const track = root.querySelector("[data-track]");
    let touched = false;
    track?.addEventListener("touchstart", () => {
      touched = true;
    }, { passive: true });

    bindDrag(
      track,
      (dir) => {
        touched = true;
        root.dataset.paused = "0";
        goTo(root, currentIndex(root) + dir);
      },
      {
        onTap: () => {
          touched = true;
          openLightbox(root, currentIndex(root));
        }
      }
    );

    // Mouse and trackpad open the photo on click. They do not drag to the next frame.
    track?.addEventListener("click", (event) => {
      if (touched) {
        touched = false;
        return;
      }
      if (event.target.closest(".photo-carousel-nav")) return;
      openLightbox(root, currentIndex(root));
    });

    restartTimer(root);
  });

  document.addEventListener("visibilitychange", () => {
    carousels.forEach((root) => {
      if (document.hidden) {
        clearInterval(root._timer);
        root._timer = null;
      } else if (root.dataset.paused !== "1") {
        restartTimer(root);
      }
    });
  });
})();
