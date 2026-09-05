/* Pulse — Pomodoro timer logic. Vanilla JS, localStorage stats. */
(function () {
  "use strict";

  var MODES = {
    focus: { label: "focus session", seconds: 25 * 60 },
    short: { label: "short break", seconds: 5 * 60 },
    long: { label: "long break", seconds: 15 * 60 }
  };
  var CYCLE_LENGTH = 4;
  var STORE_KEY = "pulse_stats_v1";

  var ringFill = document.getElementById("ringFill");
  var timeLeft = document.getElementById("timeLeft");
  var modeLabel = document.getElementById("modeLabel");
  var startBtn = document.getElementById("startBtn");
  var resetBtn = document.getElementById("resetBtn");
  var dotsEl = document.getElementById("dots");
  var announce = document.getElementById("announce");
  var statFocus = document.getElementById("statFocus");
  var statMinutes = document.getElementById("statMinutes");
  var statStreak = document.getElementById("statStreak");
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll(".mode"));

  var CIRCUMFERENCE = 2 * Math.PI * 118;
  ringFill.style.strokeDasharray = CIRCUMFERENCE.toFixed(2);

  var state = {
    mode: "focus",
    remaining: MODES.focus.seconds,
    total: MODES.focus.seconds,
    running: false,
    timerId: null,
    cycle: 1,
    dots: [false, false, false, false]
  };

  var stats = loadStats();
  renderStats();
  renderDots();
  updateRing();

  function loadStats() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (typeof s.focus === "number" && typeof s.minutes === "number") return s;
      }
    } catch (e) { /* corrupted stats: start fresh */ }
    return { focus: 0, minutes: 0 };
  }

  function saveStats() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(stats)); } catch (e) { /* ignore */ }
  }

  function renderStats() {
    statFocus.textContent = String(stats.focus);
    statMinutes.textContent = String(stats.minutes);
    statStreak.textContent = String(state.cycle);
  }

  function renderDots() {
    dotsEl.innerHTML = "";
    for (var i = 0; i < CYCLE_LENGTH; i++) {
      var d = document.createElement("span");
      d.className = "dot" + (state.dots[i] ? " done" : "");
      dotsEl.appendChild(d);
    }
  }

  function fmt(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function updateRing() {
    var fraction = state.remaining / state.total;
    ringFill.style.strokeDashoffset = (CIRCUMFERENCE * (1 - fraction)).toFixed(2);
    timeLeft.textContent = fmt(state.remaining);
    timeLeft.setAttribute("datetime", fmt(state.remaining));
    document.title = state.running
      ? fmt(state.remaining) + " - " + MODES[state.mode].label + " - Pulse"
      : "Pulse - Pomodoro Focus Timer";
  }

  function setMode(mode) {
    state.mode = mode;
    state.total = MODES[mode].seconds;
    state.remaining = state.total;
    stopTicking();
    state.running = false;
    startBtn.textContent = "Start";
    modeLabel.textContent = MODES[mode].label;
    modeButtons.forEach(function (b) {
      var active = b.getAttribute("data-mode") === mode;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });
    updateRing();
  }

  function stopTicking() {
    if (state.timerId !== null) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function completeSession() {
    stopTicking();
    state.running = false;
    startBtn.textContent = "Start";

    if (state.mode === "focus") {
      stats.focus += 1;
      stats.minutes += Math.round(MODES.focus.seconds / 60);
      saveStats();
      renderStats();
      var slot = state.dots.indexOf(false);
      if (slot !== -1) state.dots[slot] = true;
      renderDots();
      var nextMode = state.dots.every(Boolean) ? "long" : "short";
      announce.textContent = "Focus session complete. Time for a " + MODES[nextMode].label + ".";
      if (state.dots.every(Boolean)) {
        state.dots = [false, false, false, false];
        state.cycle += 1;
        renderStats();
        renderDots();
      }
      setMode(nextMode);
    } else {
      announce.textContent = "Break over. Back to focus.";
      setMode("focus");
    }
  }

  function tick() {
    state.remaining -= 1;
    if (state.remaining <= 0) {
      state.remaining = 0;
      updateRing();
      completeSession();
      return;
    }
    updateRing();
  }

  startBtn.addEventListener("click", function () {
    if (state.running) {
      stopTicking();
      state.running = false;
      startBtn.textContent = "Resume";
      announce.textContent = "Paused.";
    } else {
      state.timerId = setInterval(tick, 1000);
      state.running = true;
      startBtn.textContent = "Pause";
      announce.textContent = MODES[state.mode].label + " started.";
    }
    updateRing();
  });

  resetBtn.addEventListener("click", function () {
    stopTicking();
    state.running = false;
    state.remaining = state.total;
    startBtn.textContent = "Start";
    announce.textContent = "Timer reset.";
    updateRing();
  });

  modeButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      setMode(b.getAttribute("data-mode"));
      announce.textContent = MODES[state.mode].label + " selected.";
    });
  });
})();
