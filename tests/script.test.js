/* Dependency-free unit tests for script.js.
 *
 * The site has no framework and no npm dependencies, so the tests load the
 * real script into a vm context with a small stub of the DOM/fetch surface it
 * uses. Run with: node --test tests/
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SCRIPT = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");

/** Let microtasks (fetch .then chains, etc.) settle before asserting. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

/** Minimal element stub: text, classes, attributes, listeners, children. */
function makeElement(options = {}) {
  const classes = new Set();
  const styles = {};
  const attrs = {};
  const listeners = {};

  return {
    textContent: options.textContent ?? "",
    styles,
    classes,
    attrs,
    listeners,
    style: {
      setProperty(name, value) {
        styles[name] = value;
      },
    },
    classList: {
      toggle(name, force) {
        const add = force === undefined ? !classes.has(name) : force;
        if (add) classes.add(name);
        else classes.delete(name);
        return add;
      },
      contains: (name) => classes.has(name),
    },
    setAttribute(name, value) {
      attrs[name] = value;
    },
    getAttribute(name) {
      return attrs[name] ?? null;
    },
    addEventListener(type, fn) {
      (listeners[type] ??= []).push(fn);
    },
    removeEventListener(type, fn) {
      const arr = listeners[type] ?? [];
      const index = arr.indexOf(fn);
      if (index !== -1) arr.splice(index, 1);
    },
    async dispatch(type) {
      for (const fn of listeners[type] ?? []) await fn();
    },
    getBoundingClientRect() {
      return options.rect ?? { top: 0, bottom: 0 };
    },
    querySelector(selector) {
      return options.children?.[selector] ?? null;
    },
  };
}

/** An Intl stub that returns fixed strings, so clock output is deterministic. */
const stubIntl = {
  DateTimeFormat: class {
    constructor(locale, options) {
      this.options = options;
    }
    format() {
      return this.options.month ? "STUB DATE" : "STUB TIME";
    }
  },
};

const throwingIntl = {
  DateTimeFormat: class {
    constructor() {
      throw new Error("Intl unavailable");
    }
  },
};

const SUPABASE_CONFIG = {
  url: "https://demo.supabase.co",
  anonKey: "eyJ" + "x".repeat(48),
};

/**
 * Boots script.js against stubs and returns handles for assertions.
 * Options: config, storedLike, readRows, readOk, rpcValue, rpcOk, intl, date,
 *          rules (array of rect objects).
 */
function boot(options = {}) {
  const {
    config = {},
    storedLike,
    readRows = [{ count: 5 }],
    readOk = true,
    rpcValue = 6,
    rpcOk = true,
    intl = undefined, // undefined disables Intl, exercising the fallback path
    date = { year: 2026, month: 10, day: 18, hour: 16, minute: 3, second: 5 },
    rules: ruleRects = [],
  } = options;

  const clockTime = makeElement();
  const clockDate = makeElement();
  const hands = {
    ".clock__hand--hour": makeElement(),
    ".clock__hand--minute": makeElement(),
    ".clock__hand--second": makeElement(),
  };
  const clock = makeElement({ children: hands });
  const likeCount = makeElement({ textContent: "0" });
  const likeButton = makeElement({ children: { ".like-count": likeCount } });
  const rules = ruleRects.map((rect) => makeElement({ rect }));

  const fetchCalls = [];
  const fetchStub = async (url, init) => {
    fetchCalls.push({ url, init });
    if (url.includes("/rest/v1/site_likes?")) {
      if (!readOk) return { ok: false, status: 500 };
      return { ok: true, status: 200, json: async () => readRows };
    }
    if (!rpcOk) return { ok: false, status: 500 };
    return { ok: true, status: 200, json: async () => rpcValue };
  };

  const store = new Map();
  if (storedLike !== undefined) store.set("azhar-site-like", storedLike);
  const localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };

  const intervals = [];
  const frames = [];
  const windowListeners = {};

  const sandbox = {
    document: {
      getElementById: (id) => ({ "clock-time": clockTime, "clock-date": clockDate })[id] ?? null,
      querySelector: (selector) =>
        ({ ".clock": clock, ".like-button": likeButton })[selector] ?? null,
      querySelectorAll: (selector) => (selector === ".rule" ? rules : []),
    },
    window: {
      innerHeight: 1000,
      AZHAR_SUPABASE: config,
      addEventListener: (type, fn) => {
        (windowListeners[type] ??= []).push(fn);
      },
      removeEventListener: (type, fn) => {
        const arr = windowListeners[type] ?? [];
        const index = arr.indexOf(fn);
        if (index !== -1) arr.splice(index, 1);
      },
    },
    localStorage,
    fetch: fetchStub,
    Intl: intl,
    Date: class FakeDate {
      constructor() {
        Object.assign(this, date);
      }
      getHours() {
        return this.hour;
      }
      getMinutes() {
        return this.minute;
      }
      getSeconds() {
        return this.second;
      }
      getMonth() {
        return this.month;
      }
      getDate() {
        return this.day;
      }
      getFullYear() {
        return this.year;
      }
    },
    setInterval: (fn, ms) => {
      const entry = { fn, ms, active: true };
      intervals.push(entry);
      return entry;
    },
    clearInterval: (entry) => {
      if (entry) entry.active = false;
    },
    requestAnimationFrame: (fn) => {
      frames.push(fn);
      return frames.length;
    },
  };

  vm.runInNewContext(SCRIPT, sandbox);

  return {
    clockTime,
    clockDate,
    hands,
    likeButton,
    likeCount,
    rules,
    ruleRects,
    fetchCalls,
    store,
    intervals,
    frames,
    windowListeners,
  };
}

/* ------------------------------------------------------------------ */
/* Clock                                                               */
/* ------------------------------------------------------------------ */

test("clock uses Intl formatters when available", () => {
  const { clockTime, clockDate } = boot({ intl: stubIntl });
  assert.equal(clockTime.textContent, "STUB TIME");
  assert.equal(clockDate.textContent, "STUB DATE");
});

test("clock falls back to Date methods when Intl is missing", () => {
  const { clockTime, clockDate, hands } = boot({ intl: undefined });
  assert.equal(clockTime.textContent, "4:03 PM");
  assert.equal(clockDate.textContent, "Nov 18, 2026");
  // 16:03:05 -> hour 4.05 * 30 = 121.5, minute 3.0833 * 6 = 18.5, second 5 * 6 = 30
  assert.equal(hands[".clock__hand--hour"].styles["--angle"], "121.5deg");
  assert.equal(hands[".clock__hand--minute"].styles["--angle"], "18.5deg");
  assert.equal(hands[".clock__hand--second"].styles["--angle"], "30deg");
});

test("clock falls back when the Intl constructor throws", () => {
  const { clockTime, clockDate } = boot({ intl: throwingIntl });
  assert.equal(clockTime.textContent, "4:03 PM");
  assert.equal(clockDate.textContent, "Nov 18, 2026");
});

test("clock tick is registered once a second", () => {
  const { intervals } = boot();
  assert.equal(intervals.length, 1);
  assert.equal(intervals[0].ms, 1000);
});

test("timers and listeners are suspended on pagehide and resumed on pageshow", () => {
  const b = boot({ rules: [{ top: 100, bottom: 120 }] });
  assert.equal(b.intervals[0].active, true);
  assert.equal(b.windowListeners.scroll.length, 1);

  for (const fn of b.windowListeners.pagehide) fn();
  assert.equal(b.intervals[0].active, false, "clock interval is cleared");
  assert.equal(b.windowListeners.scroll.length, 0, "scroll listener is removed");

  for (const fn of b.windowListeners.pageshow) fn();
  assert.equal(b.intervals.length, 2, "a fresh interval starts on bfcache restore");
  assert.equal(b.intervals[1].active, true);
  assert.equal(b.windowListeners.scroll.length, 1, "scroll listener is re-added");
});

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

test("rules reveal inside the viewport band and reset when scrolled away", () => {
  const near = { top: 500, bottom: 520 };
  const far = { top: 2000, bottom: 2020 };
  const { rules, windowListeners, frames } = boot({ rules: [near, far] });

  assert.ok(rules[0].classes.has("is-visible"));
  assert.ok(!rules[1].classes.has("is-visible"));

  near.top = -100;
  near.bottom = -80;
  far.top = 700;
  far.bottom = 720;
  for (const fn of windowListeners.scroll ?? []) fn();
  assert.equal(frames.length, 1, "scroll work is batched into one frame");
  frames.pop()();

  assert.ok(!rules[0].classes.has("is-visible"), "rule above the viewport resets");
  assert.ok(rules[1].classes.has("is-visible"), "rule scrolled into the band draws in");
});

/* ------------------------------------------------------------------ */
/* Like button                                                         */
/* ------------------------------------------------------------------ */

test("like uses the server value as authoritative on success", async () => {
  const b = boot({ config: SUPABASE_CONFIG, readRows: [{ count: 5 }], rpcValue: 7 });
  await flush();
  assert.equal(b.likeCount.textContent, "5", "shared count is read on load");

  await b.likeButton.dispatch("click");
  assert.equal(b.likeCount.textContent, "7");
  assert.equal(b.likeButton.attrs["aria-pressed"], "true");
  assert.equal(b.likeButton.attrs["aria-label"], "Unlike this site");
  assert.equal(JSON.parse(b.store.get("azhar-site-like")).count, 7);
  assert.equal(b.fetchCalls.length, 2);
});

test("unlike decrements and restores the label", async () => {
  const b = boot({
    config: SUPABASE_CONFIG,
    storedLike: JSON.stringify({ liked: true, count: 7 }),
    readRows: [{ count: 7 }],
    rpcValue: 6,
  });
  await flush();
  await b.likeButton.dispatch("click");

  assert.equal(b.likeCount.textContent, "6");
  assert.equal(b.likeButton.attrs["aria-pressed"], "false");
  assert.equal(b.likeButton.attrs["aria-label"], "Like this site");
});

test("failed RPC rolls back to the exact pre-click count", async () => {
  const b = boot({ config: SUPABASE_CONFIG, readRows: [{ count: 5 }], rpcOk: false });
  await flush();
  await b.likeButton.dispatch("click");

  assert.equal(b.likeCount.textContent, "5", "optimistic +1 is undone exactly");
  assert.equal(JSON.parse(b.store.get("azhar-site-like")).count, 5);
  assert.equal(b.likeButton.attrs["aria-pressed"], "true", "liked flag still toggles");
});

test("rollback is correct when an optimistic decrement would be clamped at zero", async () => {
  // Regression: the old arithmetic undo did `0 - (-1) === 1`, inventing a like.
  const b = boot({
    config: SUPABASE_CONFIG,
    storedLike: JSON.stringify({ liked: true, count: 0 }),
    readRows: [{ count: 0 }],
    rpcOk: false,
  });
  await flush();
  await b.likeButton.dispatch("click");

  assert.equal(b.likeCount.textContent, "0");
  assert.equal(JSON.parse(b.store.get("azhar-site-like")).count, 0);
});

test("without config the button uses the local count and makes no requests", async () => {
  const b = boot({ config: {}, storedLike: JSON.stringify({ liked: false, count: 3 }) });
  await flush();
  await b.likeButton.dispatch("click");

  assert.equal(b.likeCount.textContent, "4");
  assert.equal(b.fetchCalls.length, 0);
});

test("corrupt localStorage cannot break the button", async () => {
  const b = boot({ storedLike: "{not json" });
  await flush();
  assert.equal(b.likeCount.textContent, "0");
  await b.likeButton.dispatch("click");
  assert.equal(b.likeCount.textContent, "1");
});
