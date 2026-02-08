/* =========================================
   6Devlox Calorie Tracker – script.js
   FULL VERSION (Confetti on New Streak 🎉)
   ========================================= */

/* ---------- PWA INSTALL ---------- */
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("installBanner")?.classList.remove("hidden");
});

document.addEventListener("DOMContentLoaded", () => {
  const installBtn = document.getElementById("installBtn");
  if (installBtn) {
    installBtn.onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      document.getElementById("installBanner")?.classList.add("hidden");
    };
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js");
  }
});

/* ---------- SPLASH ---------- */
window.addEventListener("load", () => {
  setTimeout(() => document.getElementById("splash")?.remove(), 2200);
});

/* ---------- STATE ---------- */
let data = {};
let currentDate = "";
let weeklyChart = null;
let lastStreak = Number(localStorage.getItem("lastStreak")) || 0;

const $ = (id) => document.getElementById(id);

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  data = JSON.parse(localStorage.getItem("calorieTracker")) || {};

  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light");
  }

  const defGoal = localStorage.getItem("defaultGoal");
  if (defGoal && $("defaultGoalInput")) {
    $("defaultGoalInput").value = defGoal;
  }

  const today = todayKey();
  $("datePicker").value = today;
  changeDate(today);

  $("dailyTab").onclick = () => showView("daily");
  $("weeklyTab").onclick = () => showView("weekly");
  $("settingsTab").onclick = () => showView("settings");

  $("setGoalBtn").onclick = setGoal;
  $("addFoodBtn").onclick = addFood;
  $("clearTodayBtn").onclick = clearToday;
  $("clearAllBtn").onclick = clearAll;
  $("saveDefaultGoalBtn").onclick = saveDefaultGoal;
  $("themeBtn").onclick = toggleTheme;
  $("datePicker").onchange = (e) => changeDate(e.target.value);

  document.querySelectorAll(".quick-grid button").forEach(btn => {
    btn.onclick = () => quickAdd(btn.dataset.name, Number(btn.dataset.cal));
  });

  initOnboarding();
  initReminders();
  showView("daily");
});

/* ---------- HELPERS ---------- */
function save() {
  localStorage.setItem("calorieTracker", JSON.stringify(data));
}

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function ensureDay(date) {
  if (!data[date]) {
    const def = Number(localStorage.getItem("defaultGoal")) || 0;
    data[date] = {
      goal: def,
      total: 0,
      foods: [],
      metGoal: false
    };
  }
}

/* ---------- THEME ---------- */
function toggleTheme() {
  document.body.classList.toggle("light");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("light") ? "light" : "dark"
  );
}

/* ---------- NAV ---------- */
function showView(view) {
  ["daily","weekly","settings"].forEach(v => {
    $(`${v}View`).style.display = v === view ? "block" : "none";
    $(`${v}Tab`).classList.toggle("active", v === view);
  });

  $("subtitle").textContent =
    view.charAt(0).toUpperCase() + view.slice(1);

  if (view === "weekly") renderWeekly();
}

/* ---------- DAILY ---------- */
function changeDate(date) {
  currentDate = date;
  ensureDay(date);
  renderDaily();
}

function setGoal() {
  data[currentDate].goal = Number($("goalInput").value);
  updateGoalStatus();
  save();
  updateProgress();
}

function addFood() {
  const name = $("foodName").value.trim();
  const cal = Number($("foodCalories").value);
  if (!name || cal <= 0) return;

  data[currentDate].foods.push({ name, cal });
  data[currentDate].total += cal;

  $("foodName").value = "";
  $("foodCalories").value = "";

  updateGoalStatus();
  save();
  renderDaily();
}

function quickAdd(name, cal) {
  data[currentDate].foods.push({ name, cal });
  data[currentDate].total += cal;
  updateGoalStatus();
  save();
  renderDaily();
}

function removeFood(i) {
  const food = data[currentDate].foods[i];
  data[currentDate].total -= food.cal;
  data[currentDate].foods.splice(i, 1);
  updateGoalStatus();
  save();
  renderDaily();
}

function renderDaily() {
  const d = data[currentDate];
  $("total").textContent = d.total;
  $("goalInput").value = d.goal;

  const list = $("foodList");
  list.innerHTML = "";

  d.foods.forEach((f, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${f.name} — ${f.cal} cal
      <button onclick="removeFood(${i})">🗑️</button>
    `;
    list.appendChild(li);
  });

  updateProgress();
  updateStreakBadge();
}

/* ---------- STREAK LOGIC ---------- */
function updateGoalStatus() {
  const d = data[currentDate];
  d.metGoal = d.goal > 0 && d.total <= d.goal;
}

function calculateStreak() {
  let streak = 0;
  let date = new Date();

  while (true) {
    const key = date.toISOString().split("T")[0];
    const day = data[key];
    if (!day || !day.metGoal || day.goal <= 0) break;
    streak++;
    date.setDate(date.getDate() - 1);
  }

  return streak;
}

/* ---------- STREAK BADGE ---------- */
function updateStreakBadge() {
  const badge = $("streakBadge");
  const count = $("streakCount");
  if (!badge || !count) return;

  const streak = calculateStreak();
  if (streak > 0) {
    count.textContent = streak;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

/* ---------- CONFETTI 🎉 ---------- */
function fireConfetti() {
  const duration = 800;
  const end = Date.now() + duration;

  (function frame() {
    const colors = ["#7c3aed", "#22d3ee", "#a855f7"];
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors
    });

    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/* ---------- PROGRESS ---------- */
function updateProgress() {
  const d = data[currentDate];

  if (d.goal <= 0) {
    $("progress").style.width = "0%";
    $("progressText").textContent = "Set goal";
    return;
  }

  const percent = Math.min((d.total / d.goal) * 100, 100);
  $("progress").style.width = percent + "%";

  const streak = calculateStreak();

  if (streak > lastStreak) {
    fireConfetti();
    lastStreak = streak;
    localStorage.setItem("lastStreak", streak);
  }

  $("progressText").textContent =
    percent >= 100
      ? `Goal hit 🎉 • ${streak}🔥`
      : `${Math.round(percent)}% • ${streak}🔥`;

  updateStreakBadge();
}

/* ---------- WEEKLY ---------- */
function renderWeekly() {
  const labels = [];
  const values = [];
  let total = 0;

  $("weeklyList").innerHTML = "";

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    ensureDay(key);

    const val = data[key].total;
    labels.push(key.slice(5));
    values.push(val);
    total += val;

    const li = document.createElement("li");
    li.textContent = `${key}: ${val} cal`;
    $("weeklyList").appendChild(li);
  }

  $("weeklyTotal").textContent = total;
  drawChart(labels, values);
}

function drawChart(labels, values) {
  if (weeklyChart) weeklyChart.destroy();

  weeklyChart = new Chart($("weeklyChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: "#7c3aed",
        borderRadius: 8
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

/* ---------- SETTINGS ---------- */
function saveDefaultGoal() {
  const v = Number($("defaultGoalInput").value);
  if (v <= 0) return;
  localStorage.setItem("defaultGoal", v);
  alert("Default goal saved");
}

function clearToday() {
  if (!confirm("Clear today?")) return;
  data[currentDate].foods = [];
  data[currentDate].total = 0;
  data[currentDate].metGoal = false;
  save();
  renderDaily();
}

function clearAll() {
  if (!confirm("Delete ALL data?")) return;
  data = {};
  localStorage.removeItem("lastStreak");
  save();
  location.reload();
}

/* ---------- ONBOARDING ---------- */
let onboardStep = 0;

function initOnboarding() {
  if (!localStorage.getItem("onboardingDone")) {
    document.getElementById("onboarding")?.classList.remove("hidden");
    setOnboardStep(0);
  }
}

function setOnboardStep(i) {
  document.querySelectorAll(".onboard-step")
    .forEach((s, idx) => s.classList.toggle("active", idx === i));
  onboardStep = i;
}

function nextOnboard() {
  setOnboardStep(onboardStep + 1);
}

function saveOnboardGoal() {
  const goal = Number(document.getElementById("onboardGoal").value);
  if (goal > 0) localStorage.setItem("defaultGoal", goal);
  nextOnboard();
}

function finishOnboarding() {
  localStorage.setItem("onboardingDone", "true");
  document.getElementById("onboarding")?.remove();
}

/* ---------- REMINDERS ---------- */
function initReminders() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
  setInterval(checkStreakReminder, 30 * 60 * 1000);
}

function checkStreakReminder() {
  if (Notification.permission !== "granted") return;

  const today = todayKey();
  ensureDay(today);
  const d = data[today];

  if (!d.metGoal && d.goal > 0) {
    new Notification("🔥 Keep your streak alive!", {
      body: `You're ${d.goal - d.total} calories away.`,
      icon: "icons/icon-192.png"
    });
  }
}
