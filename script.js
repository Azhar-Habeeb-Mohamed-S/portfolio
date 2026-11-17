/* ==========================================================================
   Azhar - portfolio site
   The page is almost entirely static CSS. This file only adds the three
   pieces of behaviour that cannot be expressed in CSS:
     1. the live clock (digital time/date + analogue hands)
     2. the hairline rules that draw themselves in on scroll
     3. the single "like" button in the footer
   ========================================================================== */
(() => {
  "use strict";

  /* ------------------------------------------------------------------
     1. Live clock
     The original shows the visitor's own local time ("GMT+8" is only a
     label), so no `timeZone` option is passed to Intl.
     ------------------------------------------------------------------ */
  const timeElement = document.getElementById("clock-time");
  const dateElement = document.getElementById("clock-date");
  const clockElement = document.querySelector(".clock");

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  /** Hour/minute/second of "now" in the visitor's timezone. */
  const partsFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const getLocalTime = () => {
    const parts = partsFormatter.formatToParts(new Date());
    const read = (type) => Number(parts.find((part) => part.type === type).value);
    return { hour: read("hour"), minute: read("minute"), second: read("second") };
  };

  /** Rotates the hour, minute and second hands of the analogue clock. */
  const updateHands = ({ hour, minute, second }) => {
    if (!clockElement) return;

    const angles = {
      "clock__hand--hour": ((hour % 12) + minute / 60) * 30,
      "clock__hand--minute": (minute + second / 60) * 6,
      "clock__hand--second": second * 6,
    };

    for (const [className, angle] of Object.entries(angles)) {
      const hand = clockElement.querySelector(`.${className}`);
      if (hand) hand.style.setProperty("--angle", `${angle}deg`);
    }
  };

  const updateClock = () => {
    const now = new Date();
    if (timeElement) timeElement.textContent = timeFormatter.format(now);
    if (dateElement) dateElement.textContent = dateFormatter.format(now);
    updateHands(getLocalTime());
  };

  if (timeElement || dateElement || clockElement) {
    updateClock();
    setInterval(updateClock, 1000);
  }

  /* ------------------------------------------------------------------
     2. Hairline rules
     Each .rule__line starts at width 0 and grows to 100% (see styles.css).
     A rule is revealed as soon as it has been reached, which also covers
     instant jumps (anchor links, restored scroll position) where an
     IntersectionObserver can miss the element entirely.
     ------------------------------------------------------------------ */
  const rules = Array.from(document.querySelectorAll(".rule"));

  if (rules.length) {
    let frame = 0;

    const revealRules = () => {
      frame = 0;
      const viewportHeight = window.innerHeight;

      for (const rule of rules) {
        if (rule.classList.contains("is-visible")) continue;
        if (rule.getBoundingClientRect().top < viewportHeight) {
          rule.classList.add("is-visible");
        }
      }
    };

    // Batch scroll events into one layout read per animation frame.
    const scheduleReveal = () => {
      if (!frame) frame = requestAnimationFrame(revealRules);
    };

    revealRules();
    window.addEventListener("scroll", scheduleReveal, { passive: true });
    window.addEventListener("resize", scheduleReveal);
  }

  /* ------------------------------------------------------------------
     3. Footer like button
     A static site has no backend, so the count is stored per browser in
     localStorage. Storage errors (private mode) are ignored - the button
     still works for the current page view.
     ------------------------------------------------------------------ */
  const LIKE_KEY = "azhar-site-like";
  const likeButton = document.querySelector(".footer__like");

  if (likeButton) {
    const countElement = likeButton.querySelector(".like-count");
    let state = { liked: false, count: 0 };

    try {
      state = { ...state, ...JSON.parse(localStorage.getItem(LIKE_KEY) || "{}") };
    } catch {
      /* Corrupt or unavailable storage - keep the defaults. */
    }

    /** Reflects `state` in the button (class, aria attributes, number). */
    const render = () => {
      likeButton.classList.toggle("is-liked", state.liked);
      likeButton.setAttribute("aria-pressed", String(state.liked));
      likeButton.setAttribute("aria-label", state.liked ? "Unlike this site" : "Like this site");
      if (countElement) countElement.textContent = String(state.count);
    };

    const toggle = () => {
      state.liked = !state.liked;
      state.count = Math.max(0, state.count + (state.liked ? 1 : -1));

      try {
        localStorage.setItem(LIKE_KEY, JSON.stringify(state));
      } catch {
        /* Storage unavailable - the state still updates on screen. */
      }

      render();
    };

    render();
    likeButton.addEventListener("click", toggle);
  }
})();
