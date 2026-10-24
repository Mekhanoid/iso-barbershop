/* ===== Iso Barbershop — app.js ===== */

// ---- Sozlamalar (o'zingiznikiga almashtiring) ----
const TELEGRAM_USERNAME = "lil.mekhaa";

const YEAR_MIN = 1979; // shrift "toza" holati
const YEAR_MAX = 2050; // shrift "erigan" holati
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let lenis = null;

const $ = (sel) => document.querySelector(sel);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const ease = (t) => 1 - Math.pow(1 - t, 3);

const loader = $("#loader");
const loaderWord = $("#loaderWord");
const loaderBar = $("#loaderBar");
const loaderCount = $("#loaderCount");
const heroWord = $("#heroWord");
const footerWord = $("#footerWord");

function setYear(el, year) {
  el.style.setProperty("--year", year.toFixed(1));
}

/* Harflar sichqoncha ostida eriydi, uzoqlashsa tiklanadi */
function createMeltWord(el, container) {
  const letters = [...el.querySelectorAll("span")];
  const amount = letters.map(() => 0);
  const target = letters.map(() => 0);
  let base = YEAR_MAX;
  let running = false;

  function apply() {
    letters.forEach((s, i) => {
      const y = base + amount[i] * (YEAR_MAX - base);
      s.style.setProperty("--year", y.toFixed(1));
    });
  }
  function tick() {
    let moving = false;
    for (let i = 0; i < letters.length; i++) {
      const diff = target[i] - amount[i];
      if (Math.abs(diff) > 0.002) { amount[i] += diff * 0.1; moving = true; }
      else amount[i] = target[i];
    }
    apply();
    if (moving) requestAnimationFrame(tick); else running = false;
  }
  function kick() {
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  if (!reduceMotion) {
    container.addEventListener("pointermove", (e) => {
      letters.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        const radius = Math.max(r.width, r.height) * 0.85;
        target[i] = clamp(1 - d / radius, 0, 1);
      });
      kick();
    });
    container.addEventListener("pointerleave", () => { target.fill(0); kick(); });
  }

  return { setBase(y) { base = y; apply(); } };
}

const heroMelt = createMeltWord(heroWord, $("#hero"));
const footerMelt = createMeltWord(footerWord, $(".footer"));
const titles = [...document.querySelectorAll(".title")];

/* ---------- 1. Loading ---------- */
let introFinished = false;

function runLoader() {
  const duration = reduceMotion ? 300 : 2400;
  const start = performance.now();
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  let fontsDone = false;
  fontsReady.then(() => (fontsDone = true));
  setTimeout(() => (fontsDone = true), 4000); // shrift kech kelsa ham kutib o'tirmaymiz

  function frame(now) {
    const t = clamp((now - start) / duration, 0, 1);
    let p = ease(t);
    if (!fontsDone) p = Math.min(p, 0.92);

    loaderBar.style.width = p * 100 + "%";
    loaderCount.textContent = Math.round(p * 100) + "%";
    setYear(loaderWord, YEAR_MIN + p * (YEAR_MAX - YEAR_MIN)); // yuklanganda harflar eriydi

    if (p >= 1) return finishLoader();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function finishLoader() {
  loader.classList.add("done");
  document.body.classList.remove("lock");
  if (lenis) lenis.start();

  // Hero so'zi erigan holatdan toza holatga qaytadi
  const duration = reduceMotion ? 0 : 1600;
  const start = performance.now();
  heroMelt.setBase(YEAR_MAX);

  function frame(now) {
    const t = duration ? clamp((now - start) / duration, 0, 1) : 1;
    heroMelt.setBase(YEAR_MAX - ease(t) * (YEAR_MAX - YEAR_MIN));
    if (t < 1) return requestAnimationFrame(frame);
    introFinished = true;
    measureFly();
    onScroll();
  }
  requestAnimationFrame(frame);

  setTimeout(() => loader.remove(), 1000);
}

/* ---------- 2. Scroll: harflar erishi ---------- */
function onScroll() {
  if (!introFinished) return;
  const vh = window.innerHeight;

  // Hero: pastga tushgan sari "ISO" eriydi
  const heroP = clamp(window.scrollY / (vh * 0.9), 0, 1);
  heroMelt.setBase(YEAR_MIN + Math.sin(Math.PI * heroP) * (YEAR_MAX - YEAR_MIN)); // eriydi, keyin logoga qo'nganda tiklanadi
  applyFly(heroP);
  updatePole();

  // Footer: ko'ringan sari toza holatga keladi
  const r = footerWord.getBoundingClientRect();
  const fp = clamp((vh - r.top) / (vh * 0.8), 0, 1);
  footerMelt.setBase(YEAR_MAX - fp * (YEAR_MAX - YEAR_MIN));

  // Sarlavhalar: ekranga kirganda erigan, o'rtaga kelganda toza
  titles.forEach((el) => {
    const tr = el.getBoundingClientRect();
    const t = (tr.top + tr.height / 2) / vh; // 0 = tepada, 1 = pastda
    let amount = 0;
    if (!reduceMotion) {
      if (t > 0.62) amount = clamp((t - 0.62) / 0.33, 0, 1);
      else if (t < 0.22) amount = clamp((0.22 - t) / 0.3, 0, 1) * 0.7;
    }
    setYear(el, YEAR_MIN + amount * (YEAR_MAX - YEAR_MIN));
  });
}

let ticking = false;
window.addEventListener("scroll", () => {
  if (ticking || reduceMotion) return;
  ticking = true;
  requestAnimationFrame(() => {
    onScroll();
    ticking = false;
  });
}, { passive: true });

window.addEventListener("resize", () => { measureFly(); onScroll(); });

/* ---------- 3. Bo'limlar paydo bo'lishi ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ---------- 4. Glass kartalar ustida yorug'lik ---------- */
document.querySelectorAll(".glass").forEach((el) => {
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", e.clientX - r.left + "px");
    el.style.setProperty("--my", e.clientY - r.top + "px");
  });
});

/* ---------- 5. Zakaz formasi ---------- */
const form = $("#bookingForm");
const errorBox = $("#formError");
const daysEl = $("#days");
const timesEl = $("#times");
const summaryEl = $("#summary");
const hintEl = $("#bookHint");
const tgLink = $("#tgLink");
const submitBtn = $("#submitBtn");
const phoneInput = $("#phoneInput");

const WEEK_SHORT = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Juma", "Shan"];
const WEEK_FULL = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];
const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

const OPEN_MIN = 10 * 60;        // 10:00
const LAST_SLOT_MIN = 21 * 60 + 30; // oxirgi vaqt 21:30
const SLOT_STEP = 30;            // har 30 daqiqada
const BUFFER_MIN = 30;           // bugun: hozirdan kamida 30 daqiqa keyin
const DAYS_AHEAD = 14;

const state = { service: null, price: "", dayIndex: 0, time: null };

const pad = (n) => String(n).padStart(2, "0");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const DAYS = Array.from({ length: DAYS_AHEAD }, (_, i) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + i);
  return d;
});

function slotsFor(i) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const out = [];
  for (let m = OPEN_MIN; m <= LAST_SLOT_MIN; m += SLOT_STEP) {
    out.push({
      label: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`,
      disabled: i === 0 && m < nowMin + BUFFER_MIN,
    });
  }
  return out;
}

function dayWord(i) {
  if (i === 0) return "Bugun";
  if (i === 1) return "Ertaga";
  return cap(WEEK_FULL[DAYS[i].getDay()]);
}
function dayText(i) {
  const d = DAYS[i];
  return `${dayWord(i)}, ${d.getDate()}-${MONTHS[d.getMonth()]}`;
}

function renderDays() {
  daysEl.innerHTML = "";
  DAYS.forEach((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "day";
    b.setAttribute("aria-pressed", i === state.dayIndex);
    const top = i === 0 ? "Bugun" : i === 1 ? "Ertaga" : WEEK_SHORT[d.getDay()];
    b.innerHTML = `<small>${top}</small><strong>${d.getDate()}</strong><small>${MONTHS[d.getMonth()].slice(0, 3)}</small>`;
    b.addEventListener("click", () => {
      state.dayIndex = i;
      daysEl.querySelectorAll(".day").forEach((el, k) => el.setAttribute("aria-pressed", k === i));
      renderTimes();
      updateSummary();
    });
    daysEl.appendChild(b);
  });
}

function renderTimes() {
  const slots = slotsFor(state.dayIndex);
  const still = slots.find((s) => s.label === state.time && !s.disabled);
  if (!still) state.time = null;

  timesEl.innerHTML = "";
  slots.forEach((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "slot";
    b.textContent = s.label;
    b.disabled = s.disabled;
    b.setAttribute("aria-pressed", s.label === state.time);
    b.addEventListener("click", () => {
      state.time = s.label;
      timesEl.querySelectorAll(".slot").forEach((el) => el.setAttribute("aria-pressed", el === b));
      updateSummary();
    });
    timesEl.appendChild(b);
  });
}

function updateSummary() {
  errorBox.textContent = "";
  if (state.service && state.time) {
    summaryEl.textContent = `${state.service} · ${dayText(state.dayIndex)} · ${state.time} · ${state.price} so'm`;
    summaryEl.classList.add("ready");
  } else {
    summaryEl.textContent = "Xizmat va vaqtni tanlang";
    summaryEl.classList.remove("ready");
  }
}

form.querySelectorAll('input[name="service"]').forEach((r) => {
  r.addEventListener("change", () => {
    state.service = r.value;
    state.price = r.dataset.price;
    updateSummary();
  });
});

// Telefon: +998 XX XXX XX XX ko'rinishida avtomatik yoziladi
phoneInput.addEventListener("input", () => {
  const raw = phoneInput.value;
  let digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+") || digits.length > 9) {
    if (digits.startsWith("998")) digits = digits.slice(3);
  }
  digits = digits.slice(0, 9);
  if (!digits) { phoneInput.value = ""; return; }
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean);
  phoneInput.value = "+998 " + parts.join(" ");
});

function showError(msg) {
  errorBox.textContent = msg;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = form.elements.name.value.trim();
  const phoneDigits = phoneInput.value.replace(/\D/g, "").replace(/^998/, "");

  if (!state.service) return showError("Xizmatni tanlang.");
  if (!state.time) return showError("Vaqtni tanlang.");
  if (name.length < 2) return showError("Ismingizni yozing.");
  if (phoneDigits.length !== 9) return showError("Telefon raqamini to'liq kiriting.");

  const text =
    `🔥 YANGI ZAKAZ — ISO BARBERSHOP\n` +
    `━━━━━━━━━━━━━━━\n` +
    `💈 Xizmat: ${state.service}\n` +
    `💵 Narx: ${state.price} so'm\n` +
    `📅 Sana: ${dayText(state.dayIndex)}\n` +
    `⏰ Vaqt: ${state.time}\n` +
    `━━━━━━━━━━━━━━━\n` +
    `👤 Ism: ${name}\n` +
    `📞 Telefon: ${phoneInput.value}`;

  const url = `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(text)}`;
  tgLink.href = url;
  hintEl.hidden = false;
  errorBox.textContent = "";
  submitBtn.textContent = "Telegramga o'tilmoqda...";

  // Avtomatik Telegramga o'tadi; brauzer bloklasa shu oynada ochiladi
  const win = window.open(url, "_blank");
  if (!win) window.location.href = url;

  setTimeout(() => (submitBtn.textContent = "Zakaz berish"), 4000);
});

// Boshlang'ich holat: sana = bugun (bugun vaqt qolmagan bo'lsa ertaga)
state.dayIndex = slotsFor(0).some((s) => !s.disabled) ? 0 : 1;
renderDays();
renderTimes();
updateSummary();

/* ---------- 5b. Qo'shimcha effektlar ---------- */

// (a) Katta "ISO" scroll paytida menyudagi logoga uchib o'tadi
const navLogo = $(".nav__logo");
const fly = { cx: 0, cy: 0, lx: 0, ly: 0, scale: 1, ready: false };
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function measureFly() {
  if (reduceMotion) return;
  heroWord.style.transform = "none";
  const wr = heroWord.getBoundingClientRect();
  const lr = navLogo.getBoundingClientRect();
  fly.cx = wr.left + wr.width / 2;
  fly.cy = wr.top + wr.height / 2 + window.scrollY; // sahifa koordinatasi
  fly.lx = lr.left + lr.width / 2;
  fly.ly = lr.top + lr.height / 2;                  // menyu fixed: ekran koordinatasi
  fly.scale = parseFloat(getComputedStyle(navLogo).fontSize) / parseFloat(getComputedStyle(heroWord).fontSize);
  fly.ready = true;
}

function applyFly(p) {
  if (!fly.ready) return;
  const e = easeInOut(p);
  const y = window.scrollY;
  const tx = (fly.lx - fly.cx) * e;
  const ty = fly.cy + (fly.ly - fly.cy) * e - (fly.cy - y);
  const s = 1 + (fly.scale - 1) * e;
  heroWord.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`;
  const f = clamp((p - 0.88) / 0.12, 0, 1); // oxirida logo bilan almashadi
  heroWord.style.opacity = 1 - f;
  navLogo.style.opacity = f;
}

if (reduceMotion) navLogo.style.opacity = "1";
if (document.fonts) document.fonts.ready.then(() => { measureFly(); onScroll(); });

// (b) Barber ustuni: scroll bo'yicha o'sadigan chiziq
const poleBar = $("#poleBar");
function updatePole() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  poleBar.style.width = (max > 0 ? clamp(window.scrollY / max, 0, 1) * 100 : 0) + "%";
}

// (c) Yumshoq scroll + havolalarga silliq o'tish
if (!reduceMotion && typeof Lenis !== "undefined") {
  lenis = new Lenis({ lerp: 0.1 });
  lenis.stop(); // loading tugaguncha
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: id === "#top" ? 0 : -70 });
    else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
});

const finePointer = window.matchMedia("(pointer: fine)").matches;
if (finePointer && !reduceMotion) {
  // (d) Kursor atrofida fon katakchalari yorishadi
  const rootEl = document.documentElement;
  let lightQueued = false, lx = 0, ly = 0;
  window.addEventListener("pointermove", (e) => {
    lx = e.clientX; ly = e.clientY;
    if (lightQueued) return;
    lightQueued = true;
    requestAnimationFrame(() => {
      rootEl.style.setProperty("--cx", lx + "px");
      rootEl.style.setProperty("--cy", ly + "px");
      lightQueued = false;
    });
  }, { passive: true });

  // (e) Tugmalar kursorga biroz tortiladi
  const btns = [...document.querySelectorAll(".btn")];
  window.addEventListener("pointermove", (e) => {
    btns.forEach((b) => {
      const r = b.getBoundingClientRect();
      const ex = e.clientX - clamp(e.clientX, r.left, r.right);
      const ey = e.clientY - clamp(e.clientY, r.top, r.bottom);
      if (Math.hypot(ex, ey) < 70) {
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        b.style.transform = `translate(${clamp(dx * 0.2, -8, 8)}px, ${clamp(dy * 0.3, -6, 6)}px)`;
      } else if (b.style.transform) {
        b.style.transform = "";
      }
    });
  }, { passive: true });

  // (f) Xizmat ustiga borganda kursorga ergashadigan rasm
  const peek = $("#peek");
  const peekImg = peek.querySelector("img");
  let px = 0, py = 0, tx = 0, ty = 0, peekRunning = false;

  function peekTick() {
    px += (tx - px) * 0.14;
    py += (ty - py) * 0.14;
    const tilt = clamp((tx - px) * 0.06, -8, 8);
    peek.style.transform = `translate(${(px + 28).toFixed(1)}px, ${(py - 135).toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`;
    if (peek.classList.contains("on") || Math.abs(tx - px) > 0.5) requestAnimationFrame(peekTick);
    else peekRunning = false;
  }
  document.querySelectorAll(".row[data-img]").forEach((row) => {
    row.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse") return;
      peekImg.src = row.dataset.img;
      if (!peek.classList.contains("on")) { px = tx = e.clientX; py = ty = e.clientY; }
      peek.classList.add("on");
      if (!peekRunning) { peekRunning = true; requestAnimationFrame(peekTick); }
    });
    row.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; });
    row.addEventListener("pointerleave", () => peek.classList.remove("on"));
  });
}

/* ---------- 5c. Videolar: faqat ko'ringanda ijro etiladi ---------- */
const videos = [...document.querySelectorAll("video")];
const saveData = navigator.connection && navigator.connection.saveData;
if (reduceMotion || saveData) {
  // Harakatni kamaytirish yoki trafik tejash yoqilgan: video o'rniga rasm (poster) qoladi
  videos.forEach((v) => {
    v.removeAttribute("autoplay");
    v.querySelectorAll("source").forEach((s) => s.remove());
    v.load();
  });
} else {
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting) {
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        v.pause();
      }
    });
  }, { threshold: 0.3 });
  videos.forEach((v) => videoObserver.observe(v));
}

/* ---------- 6. Boshqa ---------- */
$("#year").textContent = new Date().getFullYear();

heroMelt.setBase(YEAR_MAX);
footerMelt.setBase(YEAR_MAX);
runLoader();