(() => {

 "use strict";




 const CACHE_KEY = "ironhome.v3";

 const OLD_KEYS = ["ironhome.v1", "ironhome.v2", "ironhome"];

 const DATA_URLS = [

 "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json",

 "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/data/exercises.json"

 ];

 const MEDIA_BASE = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/";

 const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

 const PAGE_LABELS = { Dashboard: "Home", Plans: "Plans", Session: "Session", Library: "Exercises", Progress: "Progress", Nutrition: "Nutrition", Settings: "Settings" };

 const NAV_PAGES = ["Dashboard", "Plans", "Library", "Progress", "Nutrition", "Settings"];

 const ICONS = {

 Dashboard: "M3 11.5 12 4l9 7.5M5 10v10h14V10M9 20v-6h6v6",

 Plans: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",

 Session: "M6 7h12M6 17h12M8 5v4M16 5v4M8 15v4M16 15v4M3 9v6M21 9v6",

 Library: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5a2 2 0 0 1 2-2h14v14H6.5A2.5 2.5 0 0 0 4 19.5Z",

 Progress: "M4 19V9M10 19V5M16 19v-7M22 19V2",

 Nutrition: "M12 8c-4-3-8 0-8 5 0 4 3 8 7 8h2c4 0 7-4 7-8 0-5-4-8-8-5Zm0 0c0-3 2-5 5-5-1 3-2 4-5 5",

 Settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM19.4 13.5l1.1.9-1.5 2.6-1.3-.5a6.9 6.9 0 0 1-1.8 1l-.2 1.5h-3l-.3-1.5a6.9 6.9 0 0 1-1.8-1l-1.3.5-1.5-2.6 1.1-.9a6.8 6.8 0 0 1 0-2l-1.1-.9 1.5-2.6 1.3.5a6.9 6.9 0 0 1 1.8-1l.3-1.5h3l.2 1.5a6.9 6.9 0 0 1 1.8 1l1.3-.5 1.5 2.6-1.1.9a6.8 6.8 0 0 1 0 2Z"

 };




 const DEFAULT_PLANS = [

 {

 id: uid(), name: "Upper Body A", day: 1, note: "Dumbbell push + pull", exercises: [

 ref("dumbbell bench press", 3, "8-12"), ref("dumbbell bent over row", 3, "8-12"),

 ref("dumbbell seated shoulder press", 3, "8-12"), ref("dumbbell biceps curl", 3, "10-15"),

 ref("dumbbell standing triceps extension", 3, "10-15")

 ]

 },

 {

 id: uid(), name: "Lower Body (knee-friendly)", day: 3, note: "Keep the range pain-free; avoid deep knee bend", exercises: [

 ref("dumbbell romanian deadlift", 3, "8-12"), ref("dumbbell glute bridge", 3, "10-15"),

 ref("dumbbell standing calf raise", 3, "12-20"), ref("dead bug", 3, "8-12 / side"),

 ref("bird dog", 3, "8-12 / side")

 ]

 },

 {

 id: uid(), name: "Upper Body B", day: 5, note: "Dumbbell upper-body variation", exercises: [

 ref("dumbbell incline bench press", 3, "8-12"), ref("dumbbell one arm row", 3, "8-12 / side"),

 ref("dumbbell lateral raise", 3, "12-15"), ref("dumbbell hammer curl", 3, "10-15"),

 ref("dumbbell lying triceps extension", 3, "10-15")

 ]

 }

 ];




 let state = loadState();

 let page = "Dashboard";

 let exercises = [];

 let datasetStatus = "loading";

 let datasetError = "";

 let libraryQuery = "";

 let libraryBody = "all";

 let libraryEquipment = "all";

 let editorDraft = null;

 let editorId = null;

 let supabaseClient = null;

 let currentUser = null;

 let syncStatus = "local";

 let syncTimer = null;

 let realtimeChannel = null;

 let pendingRemote = null;

 let suppressPush = false;

 let restSeconds = 0;

 let restTimer = null;

 let toastTimer = null;




 const app = document.getElementById("app");

 const nav = document.getElementById("nav");

 const modalRoot = document.getElementById("modal-root");




 function uid() {

 if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

 return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

 }




 function ref(name, sets, reps) {

 return { id: "", name, sets, reps, equipment: "dumbbell", target: "", image: "", gif_url: "", instructions: "" };

 }




 function clone(value) { return JSON.parse(JSON.stringify(value)); }




 function defaultState() {

 return {

 version: 3,

 plans: clone(DEFAULT_PLANS),

 sessions: [],

 draft: null,

 weights: [],

 meals: [],

 goals: { kcal: 2300, protein: 112 },

 theme: "auto",

 migratedAt: new Date().toISOString()

 };

 }




 function migrateState(raw) {

 const next = raw && typeof raw === "object" ? raw : {};

 if (!Array.isArray(next.plans) && Array.isArray(next.plan)) next.plans = next.plan;

 next.plans = Array.isArray(next.plans) && next.plans.length ? next.plans.map((plan, index) => ({

 id: plan.id || uid(),

 name: plan.name || `Workout ${index + 1}`,

 day: Number.isFinite(+plan.day) ? +plan.day : 1,

 note: plan.note || "",

 exercises: (plan.exercises || plan.ex || []).map((exercise) => {

 if (Array.isArray(exercise)) return ref(exercise[0], +exercise[1] || 3, exercise[2] || "8-12");

 return {

 id: exercise.id || "", name: exercise.name || exercise.n || "Exercise",

 sets: +exercise.sets || 3, reps: exercise.reps || exercise.r || "8-12",

 equipment: exercise.equipment || "", target: exercise.target || "",

 image: exercise.image || "", gif_url: exercise.gif_url || exercise.gif || "",

 instructions: typeof exercise.instructions === "string" ? exercise.instructions : (exercise.instructions?.en || "")

 };

 })

 })) : clone(DEFAULT_PLANS);

 next.sessions = Array.isArray(next.sessions) ? next.sessions : [];

 next.draft = next.draft || null;

 next.weights = Array.isArray(next.weights) ? next.weights : [];

 next.meals = Array.isArray(next.meals) ? next.meals : [];

 next.goals = next.goals || { kcal: 2300, protein: 112 };

 next.theme = next.theme || "auto";

 next.version = 3;

 return next;

 }




 function loadState() {

 let raw = null;

 try { raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (_) {}

 if (!raw) {

 for (const key of OLD_KEYS) {

 try {

 const legacy = JSON.parse(localStorage.getItem(key) || "null");

 if (legacy) { raw = legacy; break; }

 } catch (_) {}

 }

 }

 const next = migrateState(raw || defaultState());

 try {

 localStorage.setItem(CACHE_KEY, JSON.stringify(next));

 OLD_KEYS.forEach((key) => localStorage.removeItem(key));

 } catch (_) {}

 return next;

 }




 function cleanState() {

 return clone({ ...state, version: 3, lastChangedAt: new Date().toISOString() });

 }




 function save({ immediate = false } = {}) {

 try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (_) {}

 if (!suppressPush && currentUser) scheduleCloudPush(immediate ? 0 : 700);

 }




 function esc(value) {

 return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

 }




 function mediaUrl(path) {

 if (!path) return "";

 if (/^https?:\/\//i.test(path)) return path;

 return MEDIA_BASE + String(path).replace(/^\.\//, "");

 }




 function showToast(message) {

 const toast = document.getElementById("toast");

 toast.textContent = message;

 toast.classList.add("show");

 clearTimeout(toastTimer);

 toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);

 }




 function setTheme(theme) {

 state.theme = theme;

 if (theme === "dark") document.documentElement.dataset.theme = "dark";

 else if (theme === "light") document.documentElement.dataset.theme = "light";

 else {

 const dark = matchMedia("(prefers-color-scheme: dark)").matches;

 document.documentElement.dataset.theme = dark ? "dark" : "light";

 }

 save();

 }




 function icon(name) {

 return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name]}"></path></svg>`;

 }




 function renderNav() {

 nav.innerHTML = `<div class="brand">Iron Home</div>` + NAV_PAGES.map((name) =>

 `<button data-nav="${name}" class="${page === name ? "on" : ""}" ${page === name ? 'aria-current="page"' : ""}>${icon(name)}<span>${PAGE_LABELS[name]}</span></button>`

 ).join("");

 }




 function route(name) {

 page = name;

 closeModal();

 render();

 window.scrollTo({ top: 0, behavior: "smooth" });

 app.focus({ preventScroll: true });

 }




 function todayPlan() {

 const day = new Date().getDay();

 return state.plans.find((plan) => +plan.day === day) || null;

 }




 function render() {

 renderNav();

 const views = {

 Dashboard: renderDashboard,

 Plans: renderPlans,

 Session: renderSession,

 Library: renderLibrary,

 Progress: renderProgress,

 Nutrition: renderNutrition,

 Settings: renderSettings

 };

 app.innerHTML = (views[page] || renderDashboard)();

 if (page === "Library") renderLibraryResults();

 }




 function syncBadge() {

 const label = currentUser ? (syncStatus === "syncing" ? "Syncing\u2026" : syncStatus === "error" ? "Sync error" : "Realtime on") : "Local only";

 return `<span class="tag ${currentUser ? "" : "gray"}"><span class="status-dot ${currentUser && syncStatus !== "error" ? "online" : ""}"></span>${esc(label)}</span>`;

 }




 function renderDashboard() {

 const plan = todayPlan();

 const recent = state.sessions.slice().sort((a, b) => new Date(b.finishedAt || b.d) - new Date(a.finishedAt || a.d))[0];

 const weekStart = Date.now() - 7 * 864e5;

 const weekCount = state.sessions.filter((s) => new Date(s.finishedAt || s.d).getTime() >= weekStart).length;

 return `
 <div class="top"><div><h1>Dashboard</h1><p>Home training, synced across your devices.</p></div>${syncBadge()}</div>
 <section class="card dashboard-hero">
 <div class="row between"><div><h2>${plan ? `Today: ${esc(plan.name)}` : "Recovery day"}</h2><p class="muted">${plan ? `${plan.exercises.length} exercises \u00B7 ${DAYS[plan.day]}` : "No workout scheduled today."}</p></div>${plan ? `<button class="btn" data-start-plan="${esc(plan.id)}">Start workout</button>` : `<button class="btn" data-nav="Plans">View plans</button>`}</div>
 </section>
 <div class="grid three">
 <div class="card"><div class="muted small">This week</div><div class="num">${weekCount}</div><div class="muted small">sessions</div></div>
 <div class="card"><div class="muted small">Workout plans</div><div class="num">${state.plans.length}</div><div class="muted small">editable plans</div></div>
 <div class="card"><div class="muted small">Exercise library</div><div class="num">${datasetStatus === "ready" ? exercises.length.toLocaleString() : "\u2014"}</div><div class="muted small">${datasetStatus === "ready" ? "with GIF media" : "loading dataset"}</div></div>
 </div>
 <section class="card"><div class="row between"><h2>Quick actions</h2></div><div class="row"><button class="btn primary" data-new-plan>Add workout plan</button><button class="btn" data-nav="Library">Browse exercises</button>${state.draft ? `<button class="btn" data-nav="Session">Resume session</button>` : ""}</div></section>
 <section class="card"><h2>Latest session</h2>${recent ? `<p><strong>${esc(recent.name)}</strong></p><p class="muted">${new Date(recent.finishedAt || recent.d).toLocaleString()} \u00B7 ${(recent.exercises || recent.ex || []).length} exercises</p>` : `<div class="empty">Complete a workout to see it here.</div>`}</section>`;

 }




 function renderPlans() {

 const cards = state.plans.map((plan) => `
 <article class="card plan-card">
 <div class="plan-head">
 <div><div class="tag">${DAYS[+plan.day] || "Day"}</div><h2 style="margin-top:9px">${esc(plan.name)}</h2><p class="muted">${esc(plan.note || `${plan.exercises.length} exercises`)}</p></div>
 <div class="actions"><button class="icon-btn" data-edit-plan="${esc(plan.id)}" aria-label="Edit ${esc(plan.name)}">\u270E</button><button class="icon-btn" data-delete-plan="${esc(plan.id)}" aria-label="Delete ${esc(plan.name)}">\u232B</button></div>
 </div>
 <div>${plan.exercises.map((exercise) => exerciseRow(exercise)).join("") || `<div class="empty">No exercises yet. Edit this plan to add one.</div>`}</div>
 <div class="row between" style="margin-top:12px"><span class="muted small">About ${plan.exercises.length * 8 + 5} min</span><button class="btn primary" data-start-plan="${esc(plan.id)}" ${plan.exercises.length ? "" : "disabled"}>Start session</button></div>
 </article>`).join("");

 return `<div class="top"><div><h1>Workout plans</h1><p>Add, edit or delete a complete plan.</p></div><button class="btn primary" data-new-plan>+ Add plan</button></div>
 <div class="knee"><strong>Knee-friendly reminder:</strong> stay in a pain-free range. Stop if pain or swelling increases and seek medical advice when needed.</div>
 ${cards || `<div class="card empty"><h2>No workout plans</h2><button class="btn primary" data-new-plan>Create your first plan</button></div>`}`;

 }




 function exerciseRow(exercise, { session = false } = {}) {

 const gif = mediaUrl(exercise.gif_url);

 const media = gif ? `<button class="gif-thumb" data-preview='${attrJson(exercise)}' aria-label="Open GIF for ${esc(exercise.name)}"><img src="${esc(gif)}" alt="${esc(exercise.name)} exercise GIF" loading="lazy"></button>` : `<button class="gif-placeholder" data-find-media="${esc(exercise.name)}">GIF loading\u2026</button>`;

 return `<div class="exercise-row">${media}<div><h3>${esc(exercise.name)}</h3><p>${session ? esc(exercise.reps || "") : `${exercise.sets} sets \u00D7 ${esc(exercise.reps)}`}${exercise.target ? ` \u00B7 ${esc(exercise.target)}` : ""}</p></div>${session ? "" : `<div class="row"><span class="tag gray">${esc(exercise.equipment || "exercise")}</span></div>`}</div>`;

 }




 function attrJson(value) {

 return esc(JSON.stringify(value));

 }




 function startPlan(planId) {

 const plan = state.plans.find((item) => item.id === planId);

 if (!plan || !plan.exercises.length) return;

 state.draft = {

 id: uid(), planId: plan.id, name: plan.name, startedAt: new Date().toISOString(),

 exercises: plan.exercises.map((exercise) => ({

 ...clone(exercise), skipped: false, note: "",

 completedSets: Array.from({ length: +exercise.sets || 3 }, () => ({ kg: 6, reps: parseInt(exercise.reps, 10) || 10, done: false }))

 }))

 };

 save({ immediate: true });

 route("Session");

 }




 function renderSession() {

 if (!state.draft) {

 return `<div class="top"><div><h1>Session</h1><p>Choose a plan to begin.</p></div></div>${state.plans.map((plan) => `<div class="card row between"><div><h2>${esc(plan.name)}</h2><span class="muted">${plan.exercises.length} exercises</span></div><button class="btn primary" data-start-plan="${esc(plan.id)}" ${plan.exercises.length ? "" : "disabled"}>Start</button></div>`).join("") || `<div class="card empty">Create a plan first.</div>`}`;

 }

 const draft = state.draft;

 const total = draft.exercises.reduce((sum, ex) => sum + ex.completedSets.length, 0);

 const done = draft.exercises.reduce((sum, ex) => sum + ex.completedSets.filter((set) => set.done).length, 0);

 return `<div class="top"><div><h1>${esc(draft.name)}</h1><p>${done}/${total} sets complete</p></div><button class="btn danger" data-cancel-session>Cancel</button></div>

 <div class="progress" aria-label="${done} of ${total} sets"><span style="width:${total ? done / total * 100 : 0}%"></span></div>

 <div class="card rest"><div class="row between"><strong>Rest timer</strong><span id="rest-clock" class="num">${formatTime(restSeconds)}</span><div class="row"><button class="chip" data-rest="60">60s</button><button class="chip" data-rest="90">90s</button><button class="chip" data-rest="120">120s</button></div></div></div>

 ${draft.exercises.map((exercise, exIndex) => `<section class="card ${exercise.skipped ? "flat" : ""}">

 ${exerciseRow(exercise, { session: true })}

 <div class="row between"><span class="muted small">Set \u00B7 kg \u00B7 reps \u00B7 done</span><button class="chip ${exercise.skipped ? "on" : ""}" data-skip-ex="${exIndex}">${exercise.skipped ? "Skipped" : "Skip"}</button></div>

 ${exercise.completedSets.map((set, setIndex) => `<div class="session-set"><strong>${setIndex + 1}</strong><input type="number" min="0" step="0.5" value="${set.kg}" data-session-input="kg" data-ex-index="${exIndex}" data-set-index="${setIndex}" aria-label="Weight kg"><input type="number" min="0" value="${set.reps}" data-session-input="reps" data-ex-index="${exIndex}" data-set-index="${setIndex}" aria-label="Repetitions"><button class="check btn ${set.done ? "primary" : ""}" data-toggle-set data-ex-index="${exIndex}" data-set-index="${setIndex}" aria-label="Toggle set ${setIndex + 1}">\u2713</button></div>`).join("")}

 <input placeholder="Exercise notes" value="${esc(exercise.note || "")}" data-ex-note="${exIndex}" aria-label="Notes for ${esc(exercise.name)}">

 </section>`).join("")}

 <div class="card row between"><span class="muted">Finish when the completed sets are correct.</span><button class="btn primary" data-finish-session>Finish workout</button></div>`;

 }




 function finishSession() {

 if (!state.draft) return;

 const completed = state.draft.exercises.some((ex) => ex.completedSets.some((set) => set.done));

 if (!completed) { showToast("Complete at least one set first"); return; }

 state.sessions.push({ ...clone(state.draft), finishedAt: new Date().toISOString() });

 state.draft = null;

 save({ immediate: true });

 showToast("Workout saved");

 route("Progress");

 }




 function renderLibrary() {

 const bodyParts = [...new Set(exercises.map((x) => x.body_part || x.category).filter(Boolean))].sort();

 const equipment = [...new Set(exercises.map((x) => x.equipment).filter(Boolean))].sort();

 return `<div class="top"><div><h1>Exercise library</h1><p>Search the exercises-dataset catalogue.</p></div><span class="tag ${datasetStatus === "ready" ? "" : "gray"}">${datasetStatus === "ready" ? `${exercises.length.toLocaleString()} exercises` : datasetStatus === "error" ? "Load failed" : "Loading\u2026"}</span></div>
 <div class="library-controls"><input id="library-search" type="search" value="${esc(libraryQuery)}" placeholder="Search exercise\u2026" autocomplete="off"><select id="library-body" aria-label="Filter body part"><option value="all">All muscles</option>${bodyParts.map((x) => `<option value="${esc(x)}" ${libraryBody === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select><select id="library-equipment" aria-label="Filter equipment"><option value="all">All equipment</option>${equipment.map((x) => `<option value="${esc(x)}" ${libraryEquipment === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>
 ${datasetStatus === "error" ? `<div class="card"><strong>Dataset could not be loaded.</strong><p class="muted">${esc(datasetError)}</p><button class="btn" data-retry-dataset>Retry</button></div>` : ""}
 <div id="library-results"></div>`;

 }




 function filteredExercises(limit = 80) {

 const q = libraryQuery.trim().toLowerCase();

 return exercises.filter((exercise) => {

 const haystack = `${exercise.name} ${exercise.target} ${exercise.muscle_group} ${(exercise.secondary_muscles || []).join(" ")}`.toLowerCase();

 return (!q || haystack.includes(q)) && (libraryBody === "all" || (exercise.body_part || exercise.category) === libraryBody) && (libraryEquipment === "all" || exercise.equipment === libraryEquipment);

 }).slice(0, limit);

 }




 function renderLibraryResults() {

 const root = document.getElementById("library-results");

 if (!root) return;

 if (datasetStatus === "loading") {

 root.innerHTML = `<div class="exercise-grid">${Array.from({ length: 8 }, () => `<div class="card skeleton" style="height:250px"></div>`).join("")}</div>`;

 return;

 }

 const list = filteredExercises();

 root.innerHTML = list.length ? `<div class="exercise-grid">${list.map((exercise) => `<article class="card exercise-card"><button class="gif-thumb" style="width:100%;height:auto;border:0;border-radius:0" data-preview='${attrJson(exercise)}'><img class="media" src="${esc(mediaUrl(exercise.image))}" alt="${esc(exercise.name)}" loading="lazy"></button><div class="body"><h3>${esc(exercise.name)}</h3><p class="muted small">${esc(exercise.body_part || exercise.category)} \u00B7 ${esc(exercise.equipment)}</p><div class="row between"><span class="tag gray">${esc(exercise.target)}</span><button class="chip" data-add-exercise='${attrJson(exercise)}'>Add to plan</button></div></div></article>`).join("")}</div><p class="muted small">Showing up to 80 matching exercises.</p>` : `<div class="card empty">No exercises match these filters.</div>`;

 }




 function normalizeExercise(exercise) {

 return {

 id: String(exercise.id || ""), name: exercise.name || "Exercise",

 category: exercise.category || exercise.body_part || "", body_part: exercise.body_part || exercise.category || "",

 equipment: exercise.equipment || "", target: exercise.target || "", muscle_group: exercise.muscle_group || "",

 secondary_muscles: Array.isArray(exercise.secondary_muscles) ? exercise.secondary_muscles : [],

 image: exercise.image || "", gif_url: exercise.gif_url || "",

 instructions: typeof exercise.instructions === "string" ? exercise.instructions : (exercise.instructions?.en || ""),

 attribution: exercise.attribution || "\u00A9 Gym visual \u2014 https://gymvisual.com/"

 };

 }




 async function loadDataset() {

 datasetStatus = "loading";

 datasetError = "";

 if (page === "Library") render();

 for (const url of DATA_URLS) {

 try {

 const response = await fetch(url, { cache: "force-cache" });

 if (!response.ok) throw new Error(`HTTP ${response.status}`);

 const data = await response.json();

 if (!Array.isArray(data) || !data.length) throw new Error("Invalid dataset");

 exercises = data.map(normalizeExercise);

 datasetStatus = "ready";

 resolvePlanMedia();

 render();

 return;

 } catch (error) { datasetError = error.message; }

 }

 datasetStatus = "error";

 datasetError = `Unable to reach the exercise dataset (${datasetError || "network error"}).`;

 render();

 }




 // Normalize exercise names so saved plans can still match the dataset when

 // punctuation, spacing, word order or optional position words differ.

 function normName(value) {

 return String(value || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

 }




 // Prefer an exact normalized name, then fall back to the best token-overlap

 // match. This keeps older/localized plan records useful after cloud sync.

 function findMediaMatch(name) {

 const wanted = normName(name);

 if (!wanted || !exercises.length) return null;

 const exact = exercises.find((exercise) => normName(exercise.name) === wanted);

 if (exact) return exact;




 const stopWords = ["with", "the", "and", "standing", "seated", "lying"];

 const tokens = wanted.split(" ").filter((token) => token.length > 2 && !stopWords.includes(token));

 if (!tokens.length) return null;




 let best = null;

 let bestScore = 0;

 for (const exercise of exercises) {

 const words = normName(exercise.name).split(" ");

 let score = tokens.filter((token) => words.includes(token)).length;

 if (score && tokens.includes("dumbbell") && exercise.equipment === "dumbbell") score += 0.5;

 if (score > bestScore || (score === bestScore && best && exercise.name.length < best.name.length)) {

 best = exercise;

 bestScore = score;

 }

 }

 return bestScore >= Math.max(1, Math.ceil(tokens.length * 0.6)) ? best : null;

 }




 // Attach dataset media and exercise details without replacing the plan's

 // display name, which may have been customized by the user.

 function resolveItem(item) {

 if (!item || item.gif_url) return false;

 const match = findMediaMatch(item.name);

 if (!match) return false;

 Object.assign(item, {

 id: match.id,

 equipment: match.equipment,

 target: match.target,

 image: match.image,

 gif_url: match.gif_url,

 instructions: match.instructions

 });

 return true;

 }




 // Re-attach GIFs to both saved plans and an in-progress session. This is

 // intentionally safe to run after local load, dataset load or cloud pull.

 function resolvePlanMedia() {

 if (datasetStatus !== "ready") return false;

 let changed = false;

 state.plans.forEach((plan) => plan.exercises.forEach((item) => {

 if (resolveItem(item)) changed = true;

 }));

 (state.draft?.exercises || []).forEach((item) => {

 if (resolveItem(item)) changed = true;

 });

 if (changed) save();

 return changed;

 }




 function renderProgress() {

 const sessions = state.sessions.slice().sort((a, b) => new Date(b.finishedAt || b.d) - new Date(a.finishedAt || a.d));

 const weights = state.weights.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

 return `<div class="top"><div><h1>Progress</h1><p>Your workout and body-weight history.</p></div></div>
 <div class="grid two"><section class="card"><h2>Completed workouts</h2><div class="num">${sessions.length}</div><span class="muted">all time</span></section><section class="card"><h2>Latest weight</h2><div class="num">${weights.length ? `${weights[0].kg} kg` : "\u2014"}</div><span class="muted">${weights.length ? new Date(weights[0].date).toLocaleDateString() : "not logged"}</span></section></div>
 <section class="card"><h2>Log body weight</h2><div class="row"><input id="weight-value" type="number" step="0.1" min="1" placeholder="Weight in kg" style="max-width:240px"><button class="btn primary" data-add-weight>Save</button></div></section>
 <section class="card"><h2>Session history</h2>${sessions.length ? sessions.map((session) => `<div class="exercise-row" style="grid-template-columns:1fr auto"><div><h3>${esc(session.name)}</h3><p>${new Date(session.finishedAt || session.d).toLocaleString()} \u00B7 ${(session.exercises || session.ex || []).length} exercises</p></div><button class="chip danger" data-delete-session="${esc(session.id || session.finishedAt)}">Delete</button></div>`).join("") : `<div class="empty">No completed sessions yet.</div>`}</section>`;

 }




 function renderNutrition() {

 const today = new Date().toDateString();

 const meals = state.meals.filter((meal) => new Date(meal.date).toDateString() === today);

 const kcal = meals.reduce((sum, meal) => sum + (+meal.kcal || 0), 0);

 const protein = meals.reduce((sum, meal) => sum + (+meal.protein || 0), 0);

 const bar = (value, goal) => `<div class="progress"><span style="width:${Math.min(100, value / goal * 100)}%"></span></div>`;

 return `<div class="top"><div><h1>Nutrition</h1><p>Simple daily calorie and protein log.</p></div></div>

 <div class="grid two"><div class="card"><h2>Calories</h2><div class="num">${Math.round(kcal)} / ${state.goals.kcal}</div>${bar(kcal, state.goals.kcal)}</div><div class="card"><h2>Protein</h2><div class="num">${Math.round(protein)} / ${state.goals.protein} g</div>${bar(protein, state.goals.protein)}</div></div>

 <section class="card"><h2>Add food</h2><div class="field-row"><div><label for="meal-name">Food</label><input id="meal-name" placeholder="e.g. chicken and rice"></div><div><label for="meal-type">Meal</label><select id="meal-type"><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select></div><div><label for="meal-kcal">kcal</label><input id="meal-kcal" type="number" min="0"></div><div><label for="meal-protein">Protein (g)</label><input id="meal-protein" type="number" min="0"></div></div><button class="btn primary" data-add-meal style="margin-top:12px">Add food</button></section>

 <section class="card"><h2>Today</h2>${meals.length ? meals.map((meal) => `<div class="exercise-row" style="grid-template-columns:1fr auto"><div><h3>${esc(meal.name)}</h3><p>${esc(meal.type)} \u00B7 ${meal.kcal} kcal \u00B7 ${meal.protein} g protein</p></div><button class="chip danger" data-delete-meal="${esc(meal.id)}">Delete</button></div>`).join("") : `<div class="empty">Nothing logged today.</div>`}</section>`;

 }




 function configured() {

 const config = window.IRON_HOME_CONFIG || {};

 return /^https:\/\/.+\.supabase\.co$/.test(config.supabaseUrl || "") && config.supabaseAnonKey && !/YOUR_|PLACEHOLDER/i.test(config.supabaseAnonKey);

 }




 function renderSettings() {

 const configOk = configured();

 const account = currentUser ? `<div class="row between"><div><strong>${esc(currentUser.email || "Signed in")}</strong><p class="muted small">Supabase Auth \u00B7 Realtime enabled</p></div><div class="row"><button class="btn" data-sync-now>Sync now</button><button class="btn danger" data-sign-out>Sign out</button></div></div>` : `<div class="field-row"><div><label for="auth-email">Email</label><input id="auth-email" type="email" autocomplete="email" placeholder="you@example.com"></div><div><label for="auth-password">Password</label><input id="auth-password" type="password" autocomplete="current-password" placeholder="At least 6 characters"></div></div><div class="row" style="margin-top:12px"><button class="btn primary" data-sign-in ${configOk ? "" : "disabled"}>Sign in</button><button class="btn" data-sign-up ${configOk ? "" : "disabled"}>Create account</button><button class="btn" data-magic-link ${configOk ? "" : "disabled"}>Send magic link</button></div>`;

 return `<div class="top"><div><h1>Settings</h1><p>Account, sync and local data.</p></div>${syncBadge()}</div>

 <section class="card"><h2>Account / Login</h2>${!configOk ? `<div class="knee"><strong>Supabase is not configured.</strong> Add Project URL and anon/publishable key in <code>config.js</code>. Never use a service_role key.</div>` : ""}${account}</section>

 <section class="card"><h2>Appearance</h2><div class="row"><button class="chip ${state.theme === "light" ? "on" : ""}" data-theme="light">Light</button><button class="chip ${state.theme === "dark" ? "on" : ""}" data-theme="dark">Dark</button><button class="chip ${state.theme === "auto" ? "on" : ""}" data-theme="auto">Match device</button></div></section>

 <section class="card"><h2>Backup</h2><p class="muted">Export a JSON backup or restore one. Cloud sync uses the same data structure.</p><div class="row"><button class="btn" data-export>Download backup</button><label class="btn" style="margin:0">Restore backup<input id="import-file" type="file" accept="application/json" hidden></label></div></section>

 <section class="card danger-zone"><h2>Danger zone</h2><p class="muted">Reset plans, sessions and logs on this device and in your synced cloud state.</p><button class="btn danger" data-reset>Reset all data</button></section>`;

 }




 function openModal(title, body, { wide = false } = {}) {

 modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-modal-panel><div class="modal-head"><h2 id="modal-title">${esc(title)}</h2><button class="icon-btn" data-close-modal aria-label="Close">\u00D7</button></div><div class="modal-body">${body}</div></section></div>`;

 modalRoot.querySelector(".modal-backdrop").addEventListener("click", (event) => { if (event.target === event.currentTarget) closeModal(); });

 setTimeout(() => modalRoot.querySelector("button,input,select")?.focus(), 0);

 }




 function closeModal() { modalRoot.innerHTML = ""; }




 function previewExercise(exercise) {

 const gif = mediaUrl(exercise.gif_url);

 const instructions = exercise.instructions || "Instructions are available in the exercise dataset.";

 openModal(exercise.name || "Exercise", `${gif ? `<img class="modal-gif" src="${esc(gif)}" alt="${esc(exercise.name)} animated exercise demonstration">` : `<div class="empty">GIF is not available yet.</div>`}<div class="row"><span class="tag">${esc(exercise.target || "exercise")}</span><span class="tag gray">${esc(exercise.equipment || "equipment")}</span></div><p>${esc(instructions)}</p><p class="attribution">${esc(exercise.attribution || "Exercise media \u00A9 Gym visual \u2014 source: exercises-dataset")}</p>`);

 }




 function openPlanEditor(planId = null) {

 const plan = planId ? state.plans.find((item) => item.id === planId) : null;

 editorId = plan?.id || null;

 editorDraft = plan ? clone(plan) : { id: uid(), name: "", day: 1, note: "", exercises: [] };

 renderPlanEditor();

 }




 function renderPlanEditor() {

 if (!editorDraft) return;

 openModal(editorId ? "Edit workout plan" : "Add workout plan", `

 <div class="field-row"><div><label for="plan-name">Plan name</label><input id="plan-name" value="${esc(editorDraft.name)}" placeholder="e.g. Upper Body C" data-editor-plan="name"></div><div><label for="plan-day">Training day</label><select id="plan-day" data-editor-plan="day">${DAYS.map((day, index) => `<option value="${index}" ${+editorDraft.day === index ? "selected" : ""}>${day}</option>`).join("")}</select></div></div>

 <label for="plan-note">Notes</label><input id="plan-note" value="${esc(editorDraft.note || "")}" placeholder="Goal, equipment, safety notes\u2026" data-editor-plan="note">

 <div class="row between" style="margin-top:18px"><h3>Exercises (${editorDraft.exercises.length})</h3><button class="btn" data-open-picker>+ Add exercise</button></div>

 <div id="editor-exercises">${editorDraft.exercises.map((exercise, index) => `<div class="editor-exercise"><div><strong>${esc(exercise.name)}</strong><div class="muted small">${esc(exercise.equipment || "")}</div></div><input type="number" min="1" max="20" value="${exercise.sets}" data-editor-ex="sets" data-editor-index="${index}" aria-label="Sets"><input value="${esc(exercise.reps)}" data-editor-ex="reps" data-editor-index="${index}" aria-label="Reps"><button class="chip danger remove" data-remove-editor-ex="${index}">Remove</button></div>`).join("") || `<div class="empty">Add at least one exercise from the dataset.</div>`}</div>

 <div class="row between" style="margin-top:18px"><button class="btn" data-close-modal>Cancel</button><button class="btn primary" data-save-plan>Save plan</button></div>`, { wide: true });

 }




 function savePlanEditor() {

 if (!editorDraft) return;

 editorDraft.name = editorDraft.name.trim();

 if (!editorDraft.name) { showToast("Enter a plan name"); document.getElementById("plan-name")?.focus(); return; }

 if (!editorDraft.exercises.length) { showToast("Add at least one exercise"); return; }

 if (editorId) {

 const index = state.plans.findIndex((plan) => plan.id === editorId);

 if (index >= 0) state.plans[index] = clone(editorDraft);

 } else state.plans.push(clone(editorDraft));

 save({ immediate: true });

 editorDraft = null;

 editorId = null;

 closeModal();

 render();

 showToast("Workout plan saved");

 }




 function openPicker() {

 if (datasetStatus !== "ready") { showToast("Exercise dataset is still loading"); return; }

 openModal("Choose an exercise", `<div class="library-controls" style="position:static"><input id="picker-search" type="search" placeholder="Search exercises\u2026" autocomplete="off"><select id="picker-equipment"><option value="all">All equipment</option>${[...new Set(exercises.map((x) => x.equipment))].sort().map((x) => `<option value="${esc(x)}" ${x === "dumbbell" ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div><div id="picker-results" class="picker-list"></div><div class="row" style="margin-top:14px"><button class="btn" data-back-editor>Back to plan</button></div>`, { wide: true });

 renderPickerResults("", "dumbbell");

 }




 function renderPickerResults(query = "", equipment = "all") {

 const root = document.getElementById("picker-results");

 if (!root) return;

 const q = query.trim().toLowerCase();

 const list = exercises.filter((exercise) => (!q || `${exercise.name} ${exercise.target}`.toLowerCase().includes(q)) && (equipment === "all" || exercise.equipment === equipment)).slice(0, 80);

 root.innerHTML = list.map((exercise) => `<div class="picker-item"><img src="${esc(mediaUrl(exercise.image))}" alt="" loading="lazy"><div><strong>${esc(exercise.name)}</strong><div class="muted small">${esc(exercise.target)} \u00B7 ${esc(exercise.equipment)}</div></div><button class="chip" data-pick-exercise='${attrJson(exercise)}'>Add</button></div>`).join("") || `<div class="empty">No matching exercises.</div>`;

 }




 function confirmDeletePlan(planId) {

 const plan = state.plans.find((item) => item.id === planId);

 if (!plan) return;

 openModal("Delete workout plan?", `<p>Delete <strong>${esc(plan.name)}</strong>? Completed session history will not be removed.</p><div class="row between"><button class="btn" data-close-modal>Cancel</button><button class="btn danger" data-confirm-delete-plan="${esc(plan.id)}">Delete plan</button></div>`);

 }




 function formatTime(seconds) {

 const safe = Math.max(0, seconds);

 return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;

 }




 function startRest(seconds) {

 restSeconds = +seconds;

 clearInterval(restTimer);

 const tick = () => {

 const el = document.getElementById("rest-clock");

 if (el) el.textContent = formatTime(restSeconds);

 if (restSeconds <= 0) {

 clearInterval(restTimer);

 try { navigator.vibrate?.(250); } catch (_) {}

 return;

 }

 restSeconds -= 1;

 };

 tick();

 restTimer = setInterval(tick, 1000);

 }




 async function initSupabase() {

 if (!configured() || !window.supabase?.createClient) return;

 const config = window.IRON_HOME_CONFIG;

 supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: true } });

 const { data } = await supabaseClient.auth.getSession();

 await setUser(data.session?.user || null);

 supabaseClient.auth.onAuthStateChange((_event, session) => setTimeout(() => setUser(session?.user || null), 0));

 document.addEventListener("visibilitychange", () => { if (!document.hidden && currentUser) cloudPull(); });

 window.addEventListener("focus", () => { if (currentUser) cloudPull(); });

 setInterval(() => { if (currentUser && !document.hidden) cloudPull(); }, 30000);

 }




 async function setUser(user) {

 const changed = user?.id !== currentUser?.id;

 currentUser = user;

 syncStatus = user ? "syncing" : "local";

 if (changed) {

 if (realtimeChannel && supabaseClient) await supabaseClient.removeChannel(realtimeChannel);

 realtimeChannel = null;

 if (user) {

 await cloudPull({ firstLogin: true });

 subscribeRealtime();

 }

 }

 render();

 }




 async function cloudPull({ firstLogin = false } = {}) {

 if (!supabaseClient || !currentUser) return;

 syncStatus = "syncing";

 renderNav();

 try {

 const { data, error } = await supabaseClient.from("iron_home_state").select("state,updated_at").eq("user_id", currentUser.id).maybeSingle();

 if (error) throw error;

 if (data?.state) applyRemote(data.state);

 else if (firstLogin) await cloudPush();

 syncStatus = "online";

 } catch (error) {

 console.error(error);

 syncStatus = "error";

 showToast("Cloud sync failed; local copy is safe");

 }

 render();

 }




 function applyRemote(remoteState) {

 if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {

 pendingRemote = remoteState;

 return;

 }

 suppressPush = true;

 state = migrateState(remoteState);

 try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (_) {}

 suppressPush = false;

 resolvePlanMedia();

 }




 function scheduleCloudPush(delay) {

 clearTimeout(syncTimer);

 syncTimer = setTimeout(cloudPush, delay);

 }




 async function cloudPush() {

 if (!supabaseClient || !currentUser) return;

 syncStatus = "syncing";

 try {

 const { error } = await supabaseClient.from("iron_home_state").upsert({ user_id: currentUser.id, state: cleanState(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });

 if (error) throw error;

 syncStatus = "online";

 } catch (error) {

 console.error(error);

 syncStatus = "error";

 }

 renderNav();

 }




 function subscribeRealtime() {

 if (!supabaseClient || !currentUser) return;

 realtimeChannel = supabaseClient.channel(`iron-home-${currentUser.id}`).on("postgres_changes", { event: "*", schema: "public", table: "iron_home_state", filter: `user_id=eq.${currentUser.id}` }, (payload) => {

 if (payload.new?.state) {

 applyRemote(payload.new.state);

 syncStatus = "online";

 render();

 }

 }).subscribe();

 }




 async function authAction(action) {

 if (!supabaseClient) { showToast("Configure Supabase first"); return; }

 const email = document.getElementById("auth-email")?.value.trim();

 const password = document.getElementById("auth-password")?.value;

 if (!email) { showToast("Enter your email"); return; }

 let result;

 if (action === "signin") result = await supabaseClient.auth.signInWithPassword({ email, password });

 if (action === "signup") result = await supabaseClient.auth.signUp({ email, password });

 if (action === "magic") result = await supabaseClient.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split("#")[0] } });

 if (result?.error) showToast(result.error.message);

 else showToast(action === "magic" ? "Magic link sent \u2014 check your email" : action === "signup" ? "Account created \u2014 check email if confirmation is enabled" : "Signed in");

 }




 function exportBackup() {

 const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });

 const url = URL.createObjectURL(blob);

 const link = Object.assign(document.createElement("a"), { href: url, download: `iron-home-backup-${new Date().toISOString().slice(0, 10)}.json` });

 link.click();

 URL.revokeObjectURL(url);

 }




 async function importBackup(file) {

 try {

 const parsed = JSON.parse(await file.text());

 state = migrateState(parsed);

 save({ immediate: true });

 render();

 showToast("Backup restored");

 } catch (_) { showToast("Invalid backup file"); }

 }




 document.addEventListener("click", async (event) => {

 const target = event.target.closest("button,[data-nav],[data-preview],[data-add-exercise],label");

 if (!target) return;

 if (target.dataset.nav) return route(target.dataset.nav);

 if (target.hasAttribute("data-close-modal")) return closeModal();

 if (target.hasAttribute("data-new-plan")) return openPlanEditor();

 if (target.dataset.editPlan) return openPlanEditor(target.dataset.editPlan);

 if (target.dataset.deletePlan) return confirmDeletePlan(target.dataset.deletePlan);

 if (target.dataset.confirmDeletePlan) {

 state.plans = state.plans.filter((plan) => plan.id !== target.dataset.confirmDeletePlan);

 save({ immediate: true }); closeModal(); render(); showToast("Workout plan deleted"); return;

 }

 if (target.dataset.startPlan) return startPlan(target.dataset.startPlan);

 if (target.dataset.preview) { try { previewExercise(JSON.parse(target.dataset.preview)); } catch (_) {} return; }

 if (target.dataset.findMedia) {

 if (datasetStatus !== "ready") { showToast("GIF data is loading"); return; }

 const match = findMediaMatch(target.dataset.findMedia);

 if (!match) { showToast("No matching GIF found. Edit the plan and pick this exercise from the dataset."); return; }

 resolvePlanMedia();

 render();

 previewExercise(match);

 return;

 }

 if (target.hasAttribute("data-open-picker")) return openPicker();

 if (target.hasAttribute("data-back-editor")) return renderPlanEditor();

 if (target.dataset.pickExercise) {

 try {

 const picked = JSON.parse(target.dataset.pickExercise);

 editorDraft.exercises.push({ ...picked, sets: 3, reps: "8-12" });

 renderPlanEditor(); showToast("Exercise added");

 } catch (_) {}

 return;

 }

 if (target.dataset.removeEditorEx != null) { editorDraft.exercises.splice(+target.dataset.removeEditorEx, 1); renderPlanEditor(); return; }

 if (target.hasAttribute("data-save-plan")) return savePlanEditor();

 if (target.dataset.addExercise) {

 const picked = JSON.parse(target.dataset.addExercise);

 if (!state.plans.length) { openPlanEditor(); editorDraft.exercises.push({ ...picked, sets: 3, reps: "8-12" }); renderPlanEditor(); return; }

 openModal("Add to workout plan", `<p>Add <strong>${esc(picked.name)}</strong> to:</p>${state.plans.map((plan) => `<button class="btn" style="width:100%;margin:5px 0" data-add-to-plan="${esc(plan.id)}" data-exercise='${attrJson(picked)}'>${esc(plan.name)}</button>`).join("")}`);

 return;

 }

 if (target.dataset.addToPlan) {

 const plan = state.plans.find((x) => x.id === target.dataset.addToPlan);

 if (plan) plan.exercises.push({ ...JSON.parse(target.dataset.exercise), sets: 3, reps: "8-12" });

 save({ immediate: true }); closeModal(); showToast("Exercise added to plan"); return;

 }

 if (target.dataset.rest) return startRest(target.dataset.rest);

 if (target.hasAttribute("data-toggle-set")) {

 const set = state.draft.exercises[+target.dataset.exIndex].completedSets[+target.dataset.setIndex];

 set.done = !set.done; save(); render(); return;

 }

 if (target.dataset.skipEx != null) { const ex = state.draft.exercises[+target.dataset.skipEx]; ex.skipped = !ex.skipped; save(); render(); return; }

 if (target.hasAttribute("data-finish-session")) return finishSession();

 if (target.hasAttribute("data-cancel-session")) {

 openModal("Cancel session?", `<p>The in-progress session will be discarded.</p><div class="row between"><button class="btn" data-close-modal>Keep training</button><button class="btn danger" data-confirm-cancel-session>Discard session</button></div>`); return;

 }

 if (target.hasAttribute("data-confirm-cancel-session")) { state.draft = null; save({ immediate: true }); closeModal(); route("Plans"); return; }

 if (target.hasAttribute("data-add-weight")) {

 const input = document.getElementById("weight-value"); const kg = +input.value;

 if (!(kg > 0)) return showToast("Enter a valid weight");

 state.weights.push({ id: uid(), kg, date: new Date().toISOString() }); save(); render(); return;

 }

 if (target.dataset.deleteSession) { state.sessions = state.sessions.filter((s) => (s.id || s.finishedAt) !== target.dataset.deleteSession); save(); render(); return; }

 if (target.hasAttribute("data-add-meal")) {

 const name = document.getElementById("meal-name").value.trim();

 if (!name) return showToast("Enter a food name");

 state.meals.push({ id: uid(), name, type: document.getElementById("meal-type").value, kcal: +document.getElementById("meal-kcal").value || 0, protein: +document.getElementById("meal-protein").value || 0, date: new Date().toISOString() }); save(); render(); return;

 }

 if (target.dataset.deleteMeal) { state.meals = state.meals.filter((meal) => meal.id !== target.dataset.deleteMeal); save(); render(); return; }

 if (target.dataset.theme) { setTheme(target.dataset.theme); render(); return; }

 if (target.hasAttribute("data-sign-in")) return authAction("signin");

 if (target.hasAttribute("data-sign-up")) return authAction("signup");

 if (target.hasAttribute("data-magic-link")) return authAction("magic");

 if (target.hasAttribute("data-sign-out")) { await supabaseClient?.auth.signOut(); return; }

 if (target.hasAttribute("data-sync-now")) { await cloudPull(); showToast("Cloud data refreshed"); return; }

 if (target.hasAttribute("data-export")) return exportBackup();

 if (target.hasAttribute("data-reset")) {

 openModal("Reset all data?", `<p>This deletes plans, sessions and logs. If signed in, the reset state will sync to your other devices.</p><div class="row between"><button class="btn" data-close-modal>Cancel</button><button class="btn danger" data-confirm-reset>Reset everything</button></div>`); return;

 }

 if (target.hasAttribute("data-confirm-reset")) { state = defaultState(); save({ immediate: true }); closeModal(); render(); showToast("Iron Home was reset"); return; }

 if (target.hasAttribute("data-retry-dataset")) return loadDataset();

 });




 document.addEventListener("input", (event) => {

 const target = event.target;

 if (target.id === "library-search") { libraryQuery = target.value; renderLibraryResults(); return; }

 if (target.id === "picker-search" || target.id === "picker-equipment") { renderPickerResults(document.getElementById("picker-search")?.value || "", document.getElementById("picker-equipment")?.value || "all"); return; }

 if (target.dataset.editorPlan && editorDraft) { editorDraft[target.dataset.editorPlan] = target.dataset.editorPlan === "day" ? +target.value : target.value; return; }

 if (target.dataset.editorEx && editorDraft) { editorDraft.exercises[+target.dataset.editorIndex][target.dataset.editorEx] = target.dataset.editorEx === "sets" ? +target.value : target.value; return; }

 if (target.dataset.sessionInput && state.draft) {

 state.draft.exercises[+target.dataset.exIndex].completedSets[+target.dataset.setIndex][target.dataset.sessionInput] = +target.value || 0;

 save(); return;

 }

 if (target.dataset.exNote != null && state.draft) { state.draft.exercises[+target.dataset.exNote].note = target.value; save(); }

 });




 document.addEventListener("change", (event) => {

 const target = event.target;

 if (target.id === "library-body") { libraryBody = target.value; renderLibraryResults(); }

 if (target.id === "library-equipment") { libraryEquipment = target.value; renderLibraryResults(); }

 if (target.id === "picker-equipment") renderPickerResults(document.getElementById("picker-search")?.value || "", target.value);

 if (target.id === "import-file" && target.files?.[0]) importBackup(target.files[0]);

 });




 document.addEventListener("focusout", () => {

 if (pendingRemote) {

 const remote = pendingRemote; pendingRemote = null;

 setTimeout(() => { applyRemote(remote); render(); showToast("Updated from another device"); }, 0);

 }

 });




 document.addEventListener("keydown", (event) => {

 if (event.key === "Escape" && modalRoot.innerHTML) closeModal();

 });




 setTheme(state.theme);

 render();

 loadDataset();

 initSupabase();

})();