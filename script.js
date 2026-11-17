/* ==========================================================================
   Azhar - portfolio site
   Small progressive enhancements that reproduce the original behaviour:
     1. Live clock (digital time/date + analogue hands) - updates every second
     2. Videos start playing when they scroll into view (IntersectionObserver)
     3. Hairline rules animate in when they scroll into view
     4. Like buttons - localStorage-backed, no backend/Supabase needed
   ========================================================================== */
(() => {
  "use strict";

  /* ------------------------------------------------------------------
     1. Live clock
     The original Framer build renders the clock in the *visitor's* own
     timezone (the "GMT+8" heading is just a label), so we deliberately do
     not pass a `timeZone` option to Intl - the browser's local zone is used.
     ------------------------------------------------------------------ */

  // DOM elements for the clock
  const timeElement = document.getElementById("clock-time");
  const dateElement = document.getElementById("clock-date");
  const clockElement = document.querySelector(".clock");

  // Formatters for different clock display parts
  // Digital time format: "h:mm AM/PM" (e.g., "7:55 PM")
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Date format: "Mon day, year" (e.g., "Nov 11, 2026")
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Full-part formatter for reading hour/minute/second values programmatically
  const partsFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  /** Reads the hour, minute, and second from the current Date object
   *  by parsing it through Intl.DateTimeFormat and extracting the
   *  typed parts (hour, minute, second). */
  const getLocalTime = () => {
    const parts = partsFormatter.formatToParts(new Date());
    // Helper: find the part object with the matching .type and return its .value
    const read = (type) => Number(parts.find((part) => part.type === type).value);
    return { hour: read("hour"), minute: read("minute"), second: read("second") };
  };

  /** Rotates the three analogue clock hands (hour, minute, second)
   *  by setting a CSS custom property (--angle) on each hand element.
   *  The rotation values are calculated in degrees:
   *    - Hour hand: 360° / 12 hours = 30° per hour, plus fraction for minutes
   *    - Minute hand: 360° / 60 minutes = 6° per minute, plus fraction for seconds
   *    - Second hand: 360° / 60 seconds = 6° per second
   */
  const updateHands = ({ hour, minute, second }) => {
    if (!clockElement) return;

    // Calculate angles for each hand:
    //   hour: (hour % 12) gives 0-11, + minute/60 gives smooth movement
    //   minute: + second/60 gives smooth minute movement
    //   second: raw second value * 6° per second
    const angles = {
      "clock__hand--hour": ((hour % 12) + minute / 60) * 30,
      "clock__hand--minute": (minute + second / 60) * 6,
      "clock__hand--second": second * 6,
    };

    // Apply each angle to the corresponding hand element via CSS var
    for (const [className, angle] of Object.entries(angles)) {
      const hand = clockElement.querySelector(`.${className}`);
      if (hand) hand.style.setProperty("--angle", `${angle}deg`);
    }
  };

  /** Main clock update function:
   *   - Formats the current time and displays it in the timeElement
   *   - Formats the current date and displays it in the dateElement
   *   - Calls updateHands() to rotate the analogue clock hands
   *   Uses the browser's local timezone (no timeZone option passed to Intl).
   */
  const updateClock = () => {
    const now = new Date();
    if (timeElement) timeElement.textContent = timeFormatter.format(now);
    if (dateElement) dateElement.textContent = dateFormatter.format(now);
    updateHands(getLocalTime());
  };

  // Start the clock immediately, then refresh every 1000ms (1 second)
  // so the second hand sweeps continuously around the clock face.
  if (timeElement || dateElement || clockElement) {
    updateClock();
    setInterval(updateClock, 1000);
  }

  /* ------------------------------------------------------------------
     2. Videos play only while they are on screen
     ------------------------------------------------------------------ */
  // Collect all video elements that have a src attribute set (not empty/none)
  // Framer renders a placeholder for empty sources - those stay as posters only.
  const videos = Array.from(document.querySelectorAll("video")).filter((video) => {
    const source = video.getAttribute("src");
    return Boolean(source) && source !== "null";
  });

  // Only initialize the observer if there are videos with actual sources
  if (videos.length) {
    const videoObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target;
          if (entry.isIntersecting) {
            // When the video enters the viewport:
            // - Set preload to "auto" so it can download in background
            // - Call .play() to start playback; .catch() suppresses errors
            //   if autoplay is blocked by the browser (poster stays visible)
            video.preload = "auto";
            video.play().catch(() => {
              /* Autoplay can still be blocked - the poster stays visible. */
            });
          } else {
            // When the video leaves the viewport, pause it
            // so it doesn't continue playing off-screen
            video.pause();
          }
        }
      },
      { threshold: 0.1 } // trigger when 10% of video is visible
    );

    // Observe each video element
    videos.forEach((video) => videoObserver.observe(video));
  }

  /* ------------------------------------------------------------------
     3. Hairline rules animate in when they scroll into view
     ------------------------------------------------------------------ */
  // Select all .rule elements (there are two: one above the info section,
  // and one between the testimonials and the clock)
  const rules = Array.from(document.querySelectorAll(".rule"));

  // Only initialize if rule elements exist in the DOM
  if (rules.length) {
    const ruleObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // When the rule enters the viewport, add the .is-visible class
            // which triggers the CSS transition (width animation from 0% to 100%)
            entry.target.classList.add("is-visible");
            // Unobserve so the rule only animates once (not re-animates on re-scroll)
            ruleObserver.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.4 } // trigger when 40% of the rule is visible
    );

    // Observe each rule element
    rules.forEach((rule) => ruleObserver.observe(rule));
  }

  /* ------------------------------------------------------------------
     4. Like buttons (localStorage-backed, no backend/Supabase needed)
     ------------------------------------------------------------------ */
  // Select all like button elements that have a data-project-id attribute
  // These buttons allow visitors to "like" a project; the count is stored
  // in the browser's localStorage so it persists across page reloads.
  const likeButtons = Array.from(document.querySelectorAll(".project__like-btn"));

  // Only initialize like button functionality if buttons exist
  if (likeButtons.length) {
    const likesKey = "azhar-likes"; // LocalStorage key for the likes data

    /** Reads the likes data from localStorage.
     *  Returns an empty object if no data is stored yet.
     */
    const getLikes = (projectId) => {
      const stored = localStorage.getItem(likesKey);
      if (!stored) return {};
      return JSON.parse(stored); // stored data is JSON.stringify'd object
    };

    /** Writes the likes object to localStorage,
     *  serializing it as JSON string.
     */
    const setLikes = (likes) => localStorage.setItem(likesKey, JSON.stringify(likes));

    // Initialize like buttons and attach click handlers
    likeButtons.forEach((button) => {
      // Get the project ID from the button's data attribute
      // Fall back to "global" if no data-project-id is set
      const projectId = button.dataset.projectId || "global";

      // Retrieve existing likes data and get the current count for this project
      const likes = getLikes(projectId);
      const currentLikes = likes[projectId] || 0;

      // Render the button with the current like count and an SVG icon
      button.innerHTML = `
        <svg class="like-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.5zM9.375 8.5c-.675 0-1.338.225-1.95.65L.563 10.75c-.245.406-.35 1.055.35 1.65 0 .695.305 1.36.775 1.925l1.525 1.388 4.383-4.0c.438-.41.525-.95.525-1.65 0-.695-.35-1.34-.775-1.95l-4.383 4.015z"/>
        </svg>
        <span class="like-count">${currentLikes}</span>
      `;

      // Attach click handler to the like button
      button.addEventListener("click", (e) => {
        e.stopPropagation(); // prevent click from propagating to parent elements

        // Get current likes and increment the count for this project
        const likes = getLikes(projectId);
        likes[projectId] = currentLikes + 1;
        setLikes(likes); // persist to localStorage

        // Update the displayed like count on the button
        button.querySelector(".like-count").textContent = likes[projectId];

        // Visual feedback: toggle the heart icon fill colour
        // Red = liked, default (= var(--copy)) = not yet liked
        const icon = button.querySelector(".like-icon");
        icon.style.fill = icon.style.fill === "red" ? var(--copy) : "red";
      });
    });
  }
})();