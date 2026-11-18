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

  /**
   * Lifecycle registry. Every timer and listener is registered here so it can
   * be suspended when the page is unloaded and resumed when the page is
   * restored from the back/forward cache. Without the resume step the clock
   * would freeze after a bfcache restore.
   */
  const registrations = [];

  const register = (add, remove) => {
    const entry = { add, remove, active: true };
    add();
    registrations.push(entry);
  };

  const suspend = () => {
    for (const entry of registrations) {
      if (entry.active) {
        entry.remove();
        entry.active = false;
      }
    }
  };

  const resume = () => {
    for (const entry of registrations) {
      if (!entry.active) {
        entry.add();
        entry.active = true;
      }
    }
  };

  /* ------------------------------------------------------------------
     1. Live clock
     The original shows the visitor's own local time ("GMT+8" is only a
     label), so no `timeZone` option is passed to Intl. Intl is treated as
     optional: every browser in use supports it, but the fallback below uses
     plain Date methods so a missing/broken implementation cannot blank the
     clock.
     ------------------------------------------------------------------ */
  const timeElement = document.getElementById("clock-time");
  const dateElement = document.getElementById("clock-date");
  const clockElement = document.querySelector(".clock");

  const makeFormatter = (options) => {
    if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") {
      return null;
    }
    try {
      return new Intl.DateTimeFormat("en-US", options);
    } catch {
      return null;
    }
  };

  // "7:44 PM" - 12-hour clock with a leading-zero-free hour.
  const timeFormatter = makeFormatter({
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // "Nov 17, 2026" - short month, day, full year.
  const dateFormatter = makeFormatter({
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  /** Fallback time string when Intl is unavailable ("7:44 PM"). */
  const fallbackTime = (date) => {
    const hour = date.getHours();
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"}`;
  };

  /** Fallback date string when Intl is unavailable ("Nov 17, 2026"). */
  const fallbackDate = (date) =>
    `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

  /** Rotates the hour, minute and second hands of the analogue clock. */
  const updateHands = (now) => {
    if (!clockElement) return;

    const hour = now.getHours();
    const minute = now.getMinutes();
    const second = now.getSeconds();
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

  /** Writes the digital time/date and rotates the analogue hands. */
  const updateClock = () => {
    const now = new Date();
    if (timeElement) {
      timeElement.textContent = timeFormatter ? timeFormatter.format(now) : fallbackTime(now);
    }
    if (dateElement) {
      dateElement.textContent = dateFormatter ? dateFormatter.format(now) : fallbackDate(now);
    }
    updateHands(now);
  };

  if (timeElement || dateElement || clockElement) {
    let timer = null;
    register(
      () => {
        updateClock();
        timer = setInterval(updateClock, 1000);
      },
      () => {
        clearInterval(timer);
        timer = null;
      },
    );
  }

  /* ------------------------------------------------------------------
     2. Hairline rules
     Each .rule__line starts scaled to 0 and grows to its full width
     (see styles.css). The is-visible class is toggled rather than added
     once: while a rule is inside the reveal band it is drawn, and as soon
     as it leaves the band it resets to scaleX(0), so the line draws itself
     in again every time the visitor scrolls back to it. The checks also
     cover instant jumps (anchor links, restored scroll position) where an
     IntersectionObserver can miss the element entirely.
     ------------------------------------------------------------------ */
  const rules = Array.from(document.querySelectorAll(".rule"));

  if (rules.length) {
    let frame = 0;

    const revealRules = () => {
      frame = 0;
      const trigger = window.innerHeight * 0.8;

      for (const rule of rules) {
        const rect = rule.getBoundingClientRect();
        // Visible from the moment it passes 20% up from the bottom edge
        // until it has scrolled completely out through the top.
        rule.classList.toggle("is-visible", rect.top < trigger && rect.bottom > 0);
      }
    };

    // Batch scroll events into one layout read per animation frame.
    const scheduleReveal = () => {
      if (!frame) frame = requestAnimationFrame(revealRules);
    };

    revealRules();
    register(
      () => {
        window.addEventListener("scroll", scheduleReveal, { passive: true });
        window.addEventListener("resize", scheduleReveal);
      },
      () => {
        window.removeEventListener("scroll", scheduleReveal);
        window.removeEventListener("resize", scheduleReveal);
      },
    );
  }

  /* ------------------------------------------------------------------
     3. Footer like button
     With Supabase config the count is shared by every visitor: it is read
     on load and changed through a small RPC. localStorage still remembers
     whether THIS browser has liked, so a refresh cannot like twice.
     Without config (or if the request fails) the old per-browser count is
     used. Storage errors (private mode) are ignored.
     ------------------------------------------------------------------ */
  const LIKE_KEY = "azhar-site-like";
  const likeButton = document.querySelector(".like-button");
  const config = window.AZHAR_SUPABASE || {};
  const endpoint = typeof config.url === "string" ? config.url.replace(/\/$/, "") : "";
  const hasConfig =
    /^https:\/\/[^/]+\.supabase\.co$/.test(endpoint) &&
    typeof config.anonKey === "string" &&
    config.anonKey.length > 20;

  if (likeButton) {
    const countElement = likeButton.querySelector(".like-count");
    let state = { liked: false, count: 0 };

    try {
      const stored = JSON.parse(localStorage.getItem(LIKE_KEY) || "{}") || {};
      const storedCount = Number(stored.count);
      state = {
        liked: stored.liked === true,
        count: Number.isFinite(storedCount) ? Math.max(0, storedCount) : 0,
      };
    } catch {
      /* Corrupt or unavailable storage - keep the defaults. */
    }

    let online = hasConfig;
    let busy = false;

    /** Reflects `state` in the button (class, aria attributes, number). */
    const render = () => {
      likeButton.classList.toggle("is-liked", state.liked);
      likeButton.setAttribute("aria-pressed", String(state.liked));
      likeButton.setAttribute("aria-label", state.liked ? "Unlike this site" : "Like this site");
      if (countElement) countElement.textContent = String(state.count);
    };

    /** Remembers only this browser's liked flag (plus a local fallback count). */
    const persist = () => {
      try {
        localStorage.setItem(LIKE_KEY, JSON.stringify(state));
      } catch {
        /* Storage unavailable - the state still updates on screen. */
      }
    };

    const headers = () => ({
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
    });

    /** Reads the single shared counter row. */
    const readCount = async () => {
      const response = await fetch(`${endpoint}/rest/v1/site_likes?id=eq.1&select=count`, {
        headers: headers(),
      });
      if (!response.ok) throw new Error(`Could not read likes (${response.status})`);
      const rows = await response.json();
      if (!Array.isArray(rows) || !rows.length) throw new Error("No counter row");
      return Number(rows[0].count) || 0;
    };

    /** Adds delta (+1 / -1) via the security-definer RPC and returns the new count. */
    const adjustCount = async (delta) => {
      const response = await fetch(`${endpoint}/rest/v1/rpc/adjust_site_likes`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ delta }),
      });
      if (!response.ok) throw new Error(`Could not save like (${response.status})`);
      return Number(await response.json()) || 0;
    };

    if (online) {
      readCount()
        .then((count) => {
          state.count = count;
          render();
        })
        .catch(() => {
          online = false; // Fall back to the local count for this session.
          render();
        });
    }

    render();

    const onLike = async () => {
      if (busy) return;
      busy = true;

      try {
        const delta = state.liked ? -1 : 1;
        const previousCount = state.count;
        state.liked = !state.liked;
        state.count = Math.max(0, state.count + delta);
        persist();
        render();

        if (online) {
          try {
            state.count = await adjustCount(delta); // Server count is authoritative.
          } catch {
            online = false;
            // Restore the exact pre-click value. An arithmetic undo
            // (`state.count - delta`) is wrong when the optimistic increment
            // was clamped at zero.
            state.count = previousCount;
          }
          persist();
          render();
        }
      } finally {
        busy = false;
      }
    };

    register(
      () => likeButton.addEventListener("click", onLike),
      () => likeButton.removeEventListener("click", onLike),
    );
  }

  window.addEventListener("pagehide", suspend);
  window.addEventListener("pageshow", resume);
})();
