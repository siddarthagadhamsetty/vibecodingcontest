const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    /* private mode */
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const clock = document.getElementById("clock");
function tickClock() {
  if (!clock) return;
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  clock.textContent = `HYD ${time}`;
}
tickClock();
setInterval(tickClock, 1000);

const header = document.querySelector(".site-header");
const nav = document.getElementById("nav");
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = [...nav.querySelectorAll("a")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function renderHeader() {
  const solid = window.scrollY > 24 || nav.classList.contains("is-open");
  header.classList.toggle("is-solid", solid);
  const mark = window.scrollY + 110;
  let current = null;
  sections.forEach((section) => {
    if (section.offsetTop <= mark) current = section;
  });
  navLinks.forEach((link) => {
    link.classList.toggle("is-current", current && link.getAttribute("href") === `#${current.id}`);
  });
}

menuToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  document.body.classList.toggle("menu-open", open);
  renderHeader();
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
    document.body.classList.remove("menu-open");
    renderHeader();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav.classList.contains("is-open")) {
    nav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
    document.body.classList.remove("menu-open");
    menuToggle.focus();
    renderHeader();
  }
});

window.addEventListener("scroll", renderHeader, { passive: true });
renderHeader();

const hero = document.querySelector(".hero");
const seam = document.getElementById("seam");
const heroMedia = document.querySelector(".hero-media");
let seamDrag = false;

function setSeamPct(pct) {
  const next = clamp(pct, 22, 78);
  hero.style.setProperty("--seam", `${next}%`);
  seam.setAttribute("aria-valuenow", String(Math.round(next)));
  seam.setAttribute("aria-valuetext", `${Math.round(next)} percent badminton`);
}

function seamFromClient(clientX) {
  const rect = hero.getBoundingClientRect();
  setSeamPct(((clientX - rect.left) / rect.width) * 100);
}

heroMedia.addEventListener("pointerdown", (event) => {
  if (window.matchMedia("(max-width: 800px)").matches) return;
  if (event.target.closest("a")) return;
  seamDrag = true;
  seam.classList.add("is-used");
  heroMedia.setPointerCapture(event.pointerId);
  seamFromClient(event.clientX);
});

heroMedia.addEventListener("pointermove", (event) => {
  if (!seamDrag) return;
  seamFromClient(event.clientX);
});

function endSeamDrag() {
  seamDrag = false;
}

heroMedia.addEventListener("pointerup", endSeamDrag);
heroMedia.addEventListener("pointercancel", endSeamDrag);

seam.addEventListener("keydown", (event) => {
  const current = Number(seam.getAttribute("aria-valuenow")) || 56;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    setSeamPct(current - 4);
    seam.classList.add("is-used");
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    setSeamPct(current + 4);
    seam.classList.add("is-used");
  }
  if (event.key === "Home") setSeamPct(22);
  if (event.key === "End") setSeamPct(78);
});

function nudgeSeam(sport) {
  const target = sport === "pitch" ? 34 : 68;
  const start = Number(seam.getAttribute("aria-valuenow")) || 56;
  if (reduceMotion || window.matchMedia("(max-width: 800px)").matches) {
    setSeamPct(target);
    return;
  }
  const started = performance.now();
  function step(now) {
    const t = clamp((now - started) / 480, 0, 1);
    const eased = 1 - (1 - t) ** 3;
    setSeamPct(start + (target - start) * eased);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const rallyTitle = document.getElementById("rally-title");
const rallyCopy = document.getElementById("rally-copy");

function sport() {
  return document.documentElement.dataset.sport === "pitch" ? "pitch" : "shuttle";
}

function bestKey() {
  return sport() === "pitch" ? "lahari-best-pitch" : "lahari-best-shuttle";
}

function applySportCopy(next) {
  if (next === "pitch") {
    rallyTitle.textContent = "Stay with the ball.";
    rallyCopy.textContent =
      "Pitch mode: the ball keeps its speed and answers to gravity. Stay with it along the baseline. Switch back to Shuttle for a bird that dies in the air.";
  } else {
    rallyTitle.textContent = "Stay under it.";
    rallyCopy.textContent =
      "Shuttle mode: the bird sheds speed in a hurry. Track it with the pointer and keep the rally alive. Switch to Pitch in the header for a heavier ball.";
  }
}

const sportButtons = document.querySelectorAll(".sport-switch button");

function applySport(next, announce) {
  document.documentElement.dataset.sport = next;
  try {
    sessionStorage.setItem("lahari-sport", next);
  } catch (err) {
    /* ignore */
  }
  sportButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.sport === next));
  });
  applySportCopy(next);
  game.alive = false;
  game.rally = 0;
  game.best = Number(storageGet(bestKey()) || 0);
  game.trail = [];
  game.particles = [];
  updateScore();
  if (announce) {
    setStatus(next === "pitch" ? "Pitch selected. Serve when you are set." : "Shuttle selected. Serve when you are set.");
    nudgeSeam(next);
  }
}

sportButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.sport === sport()) return;
    applySport(button.dataset.sport, true);
  });
});

const buildRows = [...document.querySelectorAll(".build-row")];
const buildPreview = document.getElementById("build-preview");

function showBuild(row) {
  const nextSrc = row.dataset.img;
  const nextAlt = row.dataset.alt;
  buildRows.forEach((item) => item.classList.toggle("is-current", item === row));
  if (buildPreview.getAttribute("src") === nextSrc) return;
  if (reduceMotion) {
    buildPreview.src = nextSrc;
    buildPreview.alt = nextAlt;
    return;
  }
  buildPreview.style.opacity = "0.35";
  const finish = () => {
    buildPreview.style.opacity = "1";
    buildPreview.removeEventListener("load", finish);
  };
  buildPreview.addEventListener("load", finish);
  buildPreview.src = nextSrc;
  buildPreview.alt = nextAlt;
}

buildRows.forEach((row) => {
  row.addEventListener("mouseenter", () => showBuild(row));
  row.addEventListener("focus", () => showBuild(row));
});
if (buildRows[0]) showBuild(buildRows[0]);

const court = document.getElementById("court");
const ctx = court.getContext("2d");
const stage = document.getElementById("play-stage");
const rallyCount = document.getElementById("rally-count");
const bestCount = document.getElementById("best-count");
const serveButton = document.getElementById("serve");
const soundButton = document.getElementById("sound");
const playStatus = document.getElementById("play-status");

const TUNING = {
  shuttle: { g: 820, drag: 1.15, hit: -760, spread: 3.6, wobble: 180 },
  pitch: { g: 1280, drag: 0.2, hit: -860, spread: 4.4, wobble: 340 },
};

const game = {
  alive: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  rally: 0,
  best: 0,
  racket: 180,
  hitLock: false,
  particles: [],
  trail: [],
  visible: false,
  loopOn: false,
  last: 0,
};

let audioOn = false;
let audioCtx = null;

function setStatus(text) {
  playStatus.textContent = text;
}

function updateScore() {
  rallyCount.textContent = String(game.rally);
  bestCount.textContent = String(game.best);
}

function tuning() {
  return TUNING[sport()];
}

function blip(freq) {
  if (!audioOn || !audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.045, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.13);
}

function spawnBurst(x, y) {
  if (reduceMotion) return;
  for (let i = 0; i < 7; i += 1) {
    game.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 220,
      vy: -30 - Math.random() * 140,
      life: 0.32,
    });
  }
}

function serve() {
  const w = court.clientWidth;
  game.alive = true;
  game.rally = 0;
  game.x = w * 0.5;
  game.y = 64;
  game.vx = sport() === "pitch" ? 160 : 70;
  game.vy = sport() === "pitch" ? 280 : 160;
  game.hitLock = false;
  game.trail = [];
  updateScore();
  setStatus(sport() === "pitch" ? "Ball in play." : "Shuttle in play.");
  ensureLoop();
}

function placeRacket(clientX) {
  const rect = court.getBoundingClientRect();
  game.racket = clamp(clientX - rect.left, 36, rect.width - 36);
}

stage.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) return;
  placeRacket(event.clientX);
});

stage.addEventListener("pointermove", (event) => {
  placeRacket(event.clientX);
});

court.addEventListener("keydown", (event) => {
  const width = court.clientWidth;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    game.racket = clamp(game.racket - 32, 36, width - 36);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    game.racket = clamp(game.racket + 32, 36, width - 36);
  }
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    serve();
  }
});

serveButton.addEventListener("click", serve);

soundButton.addEventListener("click", async () => {
  audioOn = !audioOn;
  soundButton.setAttribute("aria-pressed", String(audioOn));
  soundButton.textContent = audioOn ? "Sound on" : "Sound off";
  if (!audioOn) return;
  if (!audioCtx) audioCtx = new AudioContext();
  await audioCtx.resume();
  blip(sport() === "pitch" ? 190 : 540);
});

function step(dt) {
  const { w, h } = view();
  const model = tuning();
  const prevY = game.y;
  const drag = Math.exp(-model.drag * dt);
  game.vx *= drag;
  game.vy = game.vy * drag + model.g * dt;
  game.vx = clamp(game.vx, -560, 560);
  game.x += game.vx * dt;
  game.y += game.vy * dt;

  if (game.x < 20) {
    game.x = 20;
    game.vx = Math.abs(game.vx);
  }
  if (game.x > w - 20) {
    game.x = w - 20;
    game.vx = -Math.abs(game.vx);
  }

  if (game.y < 28 && game.vy < 0) {
    game.y = 28;
    game.vy = Math.max(240, Math.abs(game.vy) * 0.82);
    game.vx = (Math.random() - 0.5) * model.wobble;
  }

  const baseline = h - 78;
  const crossed = prevY < baseline && game.y >= baseline;
  const inZone = game.y >= baseline && game.y <= h - 8;
  if ((crossed || inZone) && game.vy > 0 && Math.abs(game.x - game.racket) < 72 && !game.hitLock) {
    game.hitLock = true;
    const offset = game.x - game.racket;
    game.vy = model.hit;
    game.vx += offset * model.spread;
    game.rally += 1;
    if (game.rally > game.best) {
      game.best = game.rally;
      storageSet(bestKey(), String(game.best));
    }
    rallyCount.classList.remove("pop");
    void rallyCount.offsetWidth;
    rallyCount.classList.add("pop");
    spawnBurst(game.x, baseline);
    blip(sport() === "pitch" ? 170 + game.rally * 8 : 480 + game.rally * 18);
    updateScore();
  } else if (game.y < baseline - 36) {
    game.hitLock = false;
  }

  if (game.y > h + 30) {
    game.alive = false;
    setStatus(game.rally ? `Out after ${game.rally}. Serve for another.` : "Out. Serve to start.");
  }

  game.trail.push({ x: game.x, y: game.y });
  if (game.trail.length > 8) game.trail.shift();
}

function updateParticles(dt) {
  game.particles.forEach((particle) => {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  });
  game.particles = game.particles.filter((particle) => particle.life > 0);
}

function view() {
  return { w: court.clientWidth, h: court.clientHeight };
}

function drawCourt(w, h) {
  if (sport() === "pitch") {
    for (let x = 0; x < w; x += 34) {
      ctx.fillStyle = Math.floor(x / 34) % 2 === 0 ? "#126b34" : "#187a3c";
      ctx.fillRect(x, 0, 34, h);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 12, w - 28, h - 24);
    ctx.beginPath();
    ctx.moveTo(14, h / 2);
    ctx.lineTo(w - 14, h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(w * 0.28, 12, w * 0.44, h * 0.16);
  } else {
    const floor = ctx.createLinearGradient(0, 0, 0, h);
    floor.addColorStop(0, "#12382f");
    floor.addColorStop(0.35, "#1c4a3c");
    floor.addColorStop(1, "#7a4e2c");
    ctx.fillStyle = floor;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 14, w - 32, h - 28);
    ctx.beginPath();
    ctx.moveTo(16, h * 0.2);
    ctx.lineTo(w - 16, h * 0.2);
    ctx.moveTo(16, h * 0.8);
    ctx.lineTo(w - 16, h * 0.8);
    ctx.moveTo(w / 2, 14);
    ctx.lineTo(w / 2, h - 14);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(16, h / 2);
    ctx.lineTo(w - 16, h / 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.setLineDash([5, 7]);
  ctx.strokeStyle = sport() === "pitch" ? "rgba(242,193,78,0.8)" : "rgba(223,242,90,0.8)";
  ctx.beginPath();
  ctx.moveTo(16, h - 78);
  ctx.lineTo(w - 16, h - 78);
  ctx.stroke();
  ctx.restore();
}

function drawShuttle(x, y, vx, vy) {
  const angle = Math.atan2(vy, vx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = "rgba(244,241,228,0.95)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(2, 0);
  ctx.moveTo(-9, 0);
  ctx.lineTo(1, -6);
  ctx.moveTo(-9, 0);
  ctx.lineTo(1, 6);
  ctx.stroke();
  ctx.fillStyle = "#f7f4ea";
  ctx.beginPath();
  ctx.ellipse(7, 0, 6.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBall(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#f6f3ea";
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1c1c1c";
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-2, 0, 11, -1.1, 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4, -9);
  ctx.quadraticCurveTo(2, 0, -4, 9);
  ctx.stroke();
  ctx.restore();
}

function drawActor(x, y, vx, vy) {
  if (sport() === "pitch") drawBall(x, y);
  else drawShuttle(x, y, vx, vy);
}

function drawRacket(x, baseline) {
  if (sport() === "pitch") {
    ctx.fillStyle = "#f2c14e";
    ctx.beginPath();
    ctx.roundRect(x - 30, baseline - 8, 60, 16, 8);
    ctx.fill();
    return;
  }
  ctx.strokeStyle = "#dff25a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, baseline, 28, 16, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, baseline + 14);
  ctx.lineTo(x, baseline + 34);
  ctx.stroke();
}

function draw() {
  const { w, h } = view();
  if (w < 2 || h < 2) return;
  ctx.clearRect(0, 0, w, h);
  drawCourt(w, h);

  if (game.alive) {
    game.trail.forEach((point, index) => {
      ctx.globalAlpha = (index + 1) / game.trail.length / 3;
      ctx.fillStyle = "#f4f1e4";
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    drawActor(game.x, game.y, game.vx, game.vy);
  } else {
    drawActor(game.racket, h - 108, 0, -1);
  }

  drawRacket(game.racket, h - 78);

  game.particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life / 0.32);
    ctx.fillStyle = sport() === "pitch" ? "#f2c14e" : "#f4f1e4";
    ctx.fillRect(particle.x, particle.y, 3, 3);
  });
  ctx.globalAlpha = 1;
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = court.clientWidth;
  const h = court.clientHeight;
  court.width = Math.max(1, Math.floor(w * dpr));
  court.height = Math.max(1, Math.floor(h * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!game.racket) game.racket = w / 2;
  draw();
}

function frame(ts) {
  if (!game.visible) {
    game.loopOn = false;
    return;
  }
  if (!game.last) game.last = ts;
  const dt = clamp((ts - game.last) / 1000, 0, 0.033);
  game.last = ts;
  if (game.alive) step(dt);
  updateParticles(dt);
  draw();
  requestAnimationFrame(frame);
}

function ensureLoop() {
  game.visible = true;
  if (game.loopOn) return;
  game.loopOn = true;
  game.last = 0;
  requestAnimationFrame(frame);
}

if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(resize).observe(court);
} else {
  window.addEventListener("resize", resize);
}

const courtWatcher = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      game.visible = entry.isIntersecting;
      if (game.visible) ensureLoop();
    });
  },
  { threshold: 0.08 }
);
courtWatcher.observe(stage);
resize();
game.racket = court.clientWidth / 2 || 180;

const NS = "http://www.w3.org/2000/svg";
const QMAX = 160;
const PMAX = 120;
const B_SLOPE = 1.1;
const D_SLOPE = 0.85;
const PAD_L = 52;
const PAD_R = 24;
const PAD_T = 20;
const PAD_B = 42;
const PLOT_W = 640 - PAD_L - PAD_R;
const PLOT_H = 420 - PAD_T - PAD_B;

const demandInput = document.getElementById("demand");
const supplyInput = document.getElementById("supply");
const demandVal = document.getElementById("demand-val");
const supplyVal = document.getElementById("supply-val");
const eqP = document.getElementById("eq-p");
const eqQ = document.getElementById("eq-q");
const eqStory = document.getElementById("eq-story");
const eqMetaphor = document.getElementById("eq-metaphor");
const demandPath = document.getElementById("demand-path");
const supplyPath = document.getElementById("supply-path");
const eqDot = document.getElementById("eq-dot");
const eqV = document.getElementById("eq-v");
const eqH = document.getElementById("eq-h");
const labelD = document.getElementById("label-d");
const labelS = document.getElementById("label-s");
const grid = document.getElementById("grid");
const presets = [...document.querySelectorAll(".preset, .presets .btn-ink")];

function mapQ(q) {
  return PAD_L + (q / QMAX) * PLOT_W;
}

function mapP(p) {
  return PAD_T + (1 - p / PMAX) * PLOT_H;
}

function addSvg(name, attrs) {
  const node = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function drawGrid() {
  for (let q = 0; q <= QMAX; q += 40) {
    const x = mapQ(q);
    grid.appendChild(addSvg("line", {
      x1: x, x2: x, y1: mapP(PMAX), y2: mapP(0), class: "grid-line",
    }));
    const label = addSvg("text", { x, y: mapP(0) + 20, "text-anchor": "middle" });
    label.textContent = String(q);
    grid.appendChild(label);
  }
  for (let p = 40; p <= PMAX; p += 40) {
    const y = mapP(p);
    grid.appendChild(addSvg("line", {
      x1: mapQ(0), x2: mapQ(QMAX), y1: y, y2: y, class: "grid-line",
    }));
    const label = addSvg("text", { x: mapQ(0) - 8, y: y + 4, "text-anchor": "end" });
    label.textContent = String(p);
    grid.appendChild(label);
  }
  const qName = addSvg("text", { x: mapQ(QMAX / 2), y: 412, "text-anchor": "middle" });
  qName.textContent = "Quantity";
  grid.appendChild(qName);
  const pName = addSvg("text", {
    x: 16,
    y: mapP(PMAX / 2),
    "text-anchor": "middle",
    transform: `rotate(-90 16 ${mapP(PMAX / 2)})`,
  });
  pName.textContent = "Price";
  grid.appendChild(pName);
}

function curvePoints(kind, a, c) {
  const points = [];
  for (let p = 0; p <= PMAX; p += 2) {
    const q = kind === "demand" ? a - B_SLOPE * p : c + D_SLOPE * p;
    if (q >= 0 && q <= QMAX) points.push({ x: mapQ(q), y: mapP(p) });
  }
  return points;
}

function toPath(points) {
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function clearing(a, c) {
  const p = (a - c) / (B_SLOPE + D_SLOPE);
  const q = c + D_SLOPE * p;
  if (p <= 0 || q <= 0 || p > PMAX || q > QMAX) return null;
  return { p, q };
}

function placeLabel(node, point, dx, dy) {
  if (!point) {
    node.textContent = "";
    return;
  }
  node.setAttribute("x", String(point.x + dx));
  node.setAttribute("y", String(point.y + dy));
}

function renderMarket() {
  const a = Number(demandInput.value);
  const c = Number(supplyInput.value);
  demandVal.textContent = String(a);
  supplyVal.textContent = String(c);
  const demandPts = curvePoints("demand", a, c);
  const supplyPts = curvePoints("supply", a, c);
  demandPath.setAttribute("d", toPath(demandPts));
  supplyPath.setAttribute("d", toPath(supplyPts));
  placeLabel(labelD, demandPts[demandPts.length - 1], 8, -6);
  placeLabel(labelS, supplyPts[supplyPts.length - 1], 8, 16);
  labelD.textContent = demandPts.length ? "D" : "";
  labelS.textContent = supplyPts.length ? "S" : "";

  const eq = clearing(a, c);
  const show = eq ? "visible" : "hidden";
  eqDot.setAttribute("visibility", show);
  eqV.setAttribute("visibility", show);
  eqH.setAttribute("visibility", show);
  if (eq) {
    const x = mapQ(eq.q);
    const y = mapP(eq.p);
    eqDot.setAttribute("cx", x.toFixed(1));
    eqDot.setAttribute("cy", y.toFixed(1));
    eqV.setAttribute("x1", x);
    eqV.setAttribute("x2", x);
    eqV.setAttribute("y1", y);
    eqV.setAttribute("y2", mapP(0));
    eqH.setAttribute("x1", x);
    eqH.setAttribute("x2", mapQ(0));
    eqH.setAttribute("y1", y);
    eqH.setAttribute("y2", y);
    eqP.textContent = eq.p.toFixed(1);
    eqQ.textContent = eq.q.toFixed(1);
    eqStory.textContent = `The market clears at a price of ${eq.p.toFixed(1)} and a quantity of ${eq.q.toFixed(1)}. Numbers are an index, not rupees.`;
  } else {
    eqP.textContent = "—";
    eqQ.textContent = "—";
    eqStory.textContent = "Nothing clears. The cheapest seller still wants more than anyone will pay.";
  }

  if (a >= 124) {
    eqMetaphor.textContent = "Match day. Everyone wants the same hour, so the price of a slot jumps.";
  } else if (a <= 78) {
    eqMetaphor.textContent = "A quiet afternoon. Open courts, and the price eases off.";
  } else {
    eqMetaphor.textContent = "An ordinary evening. Demand and supply meet in the middle.";
  }
}

function markPreset(button) {
  presets.forEach((item) => item.classList.toggle("is-on", item === button));
}

presets.forEach((button) => {
  button.addEventListener("click", () => {
    demandInput.value = button.dataset.a;
    supplyInput.value = button.dataset.c;
    markPreset(button);
    renderMarket();
  });
});

function onSlider() {
  markPreset(null);
  renderMarket();
}

demandInput.addEventListener("input", onSlider);
supplyInput.addEventListener("input", onSlider);
drawGrid();
renderMarket();

const skills = {
  python: {
    role: "The striker",
    name: "Python",
    text: "The language I open when an idea needs a script, a plot, or a quick model.",
  },
  micro: {
    role: "The playmaker",
    name: "Microeconomics",
    text: "Choices under constraints. Who wants the next court, and what they will give up for it.",
  },
  js: {
    role: "The winger",
    name: "JavaScript",
    text: "How this page moves: the seam, the rally, and the chart.",
  },
  macro: {
    role: "The keeper",
    name: "Macroeconomics",
    text: "The bigger machine — growth, shocks, and why one good week is not the whole season.",
  },
  stats: {
    role: "The anchor",
    name: "Statistics",
    text: "What a sample can honestly say, and when it is just noise in a kit.",
  },
  dsa: {
    role: "The midfield",
    name: "Data structures",
    text: "Keeping the messy middle of a problem in an order I can actually use.",
  },
  web: {
    role: "The fullback",
    name: "The web",
    text: "HTML, CSS, and the browser. Structure first, then the moment it answers.",
  },
  markets: {
    role: "The captain",
    name: "Markets",
    text: "Prices as messages. Useful in a problem set, and useful when everyone wants the same slot.",
  },
};

const skillRole = document.getElementById("skill-role");
const skillName = document.getElementById("skill-name");
const skillText = document.getElementById("skill-text");
const tokens = [...document.querySelectorAll(".token")];

function showSkill(key) {
  const skill = skills[key];
  if (!skill) return;
  skillRole.textContent = skill.role;
  skillName.textContent = skill.name;
  skillText.textContent = skill.text;
  tokens.forEach((token) => {
    token.setAttribute("aria-pressed", String(token.dataset.skill === key));
  });
}

tokens.forEach((token) => {
  token.addEventListener("click", () => showSkill(token.dataset.skill));
});

const scroller = document.getElementById("frame-scroller");
let frameDrag = null;

scroller.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") return;
  frameDrag = { x: event.clientX, left: scroller.scrollLeft };
  scroller.setPointerCapture(event.pointerId);
  scroller.classList.add("is-dragging");
});

scroller.addEventListener("pointermove", (event) => {
  if (!frameDrag) return;
  scroller.scrollLeft = frameDrag.left - (event.clientX - frameDrag.x);
});

function endFrameDrag() {
  frameDrag = null;
  scroller.classList.remove("is-dragging");
}

scroller.addEventListener("pointerup", endFrameDrag);
scroller.addEventListener("pointercancel", endFrameDrag);

scroller.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    event.preventDefault();
    scroller.scrollBy({ left: 400, behavior: reduceMotion ? "auto" : "smooth" });
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    scroller.scrollBy({ left: -400, behavior: reduceMotion ? "auto" : "smooth" });
  }
});

const form = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");
const copyNote = document.getElementById("copy-note");
const notePreview = document.getElementById("note-preview");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(name, message) {
  const field = form.querySelector(`[name="${name}"]`);
  const wrap = field.closest(".field");
  const error = wrap.querySelector(".error");
  wrap.classList.toggle("has-error", Boolean(message));
  error.textContent = message;
  field.setAttribute("aria-invalid", message ? "true" : "false");
  field.setAttribute("aria-describedby", `${name}-error`);
}

function validateForm() {
  const data = Object.fromEntries(new FormData(form));
  let valid = true;
  let first = null;

  function check(name, message) {
    setFieldError(name, message);
    if (message && !first) first = name;
    if (message) valid = false;
  }

  check("name", data.name.trim() ? "" : "Please enter your name.");
  check("email", emailPattern.test(data.email.trim()) ? "" : "Enter a valid email address.");
  check("about", data.about ? "" : "Choose what this note is about.");
  check("message", data.message.trim().length >= 12 ? "" : "A little more detail helps — 12 characters or more.");

  if (first) form.querySelector(`[name="${first}"]`).focus();
  return valid;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formStatus.classList.remove("is-error");
  if (!validateForm()) {
    formStatus.textContent = "Please fix the highlighted fields.";
    formStatus.classList.add("is-error");
    return;
  }
  const data = Object.fromEntries(new FormData(form));
  const note = `To Lahari, BITS Pilani Hyderabad\nName: ${data.name.trim()}\nEmail: ${data.email.trim()}\nAbout: ${data.about}\n\n${data.message.trim()}`;
  form.dataset.note = note;
  notePreview.hidden = true;
  copyNote.hidden = false;
  copyNote.textContent = "Copy note";
  formStatus.textContent = "Kept on this page. Copy it if you want to send it on.";
  form.reset();
});

copyNote.addEventListener("click", async () => {
  const note = form.dataset.note || "";
  try {
    await navigator.clipboard.writeText(note);
    copyNote.textContent = "Copied";
    formStatus.textContent = "Copied. Paste it into a mail or a message.";
  } catch (err) {
    notePreview.hidden = false;
    notePreview.textContent = note;
    formStatus.textContent = "Clipboard was blocked. The note is below — select and copy it.";
    formStatus.classList.add("is-error");
  }
});

applySport(sport(), false);
