const express = require("express");
const crypto = require("node:crypto");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static("public"));

const categories = ["Books", "Stationery", "Electronics", "Lab Equipment", "Project Components", "Calculators", "Bags", "Other"];
const conditions = ["Excellent", "Good", "Fair"];

const items = [
  { id: 1, name: "Engineering Mathematics Book", category: "Books", condition: "Good", description: "Engineering Mathematics III reference book with clean pages.", ownerId: "seed", owner: "Aarav", status: "AVAILABLE", requestedBy: null },
  { id: 2, name: "Scientific Calculator", category: "Calculators", condition: "Excellent", description: "Casio scientific calculator, lightly used for one semester.", ownerId: "seed", owner: "Meera", status: "AVAILABLE", requestedBy: null },
  { id: 3, name: "Arduino Uno Kit", category: "Project Components", condition: "Good", description: "Uno board with USB cable and jumper wires for student projects.", ownerId: "seed", owner: "Rohan", status: "AVAILABLE", requestedBy: null },
  { id: 4, name: "DBMS Notes", category: "Books", condition: "Excellent", description: "Unit-wise handwritten notes with SQL examples and diagrams.", ownerId: "seed", owner: "Ishita", status: "AVAILABLE", requestedBy: null },
  { id: 5, name: "Laptop Stand", category: "Other", condition: "Good", description: "Foldable aluminium stand suitable for coding and study desks.", ownerId: "seed", owner: "Kabir", status: "AVAILABLE", requestedBy: null },
  { id: 6, name: "Breadboard + Sensors Pack", category: "Electronics", condition: "Good", description: "Breadboard, LEDs, resistors and basic sensors for mini projects.", ownerId: "seed", owner: "Neel", status: "AVAILABLE", requestedBy: null },
  { id: 7, name: "College Backpack", category: "Bags", condition: "Fair", description: "Spacious backpack with laptop sleeve; minor signs of use.", ownerId: "seed", owner: "Sara", status: "AVAILABLE", requestedBy: null },
  { id: 8, name: "Software Engineering Book", category: "Books", condition: "Good", description: "UML, Agile and software design reference for semester study.", ownerId: "seed", owner: "Vihaan", status: "REQUESTED", requestedBy: "seed2" }
];

const users = new Map();
const sessions = new Map();
let nextItemId = items.length + 1;

function commit() {
  return String(process.env.GIT_SHA || process.env.RENDER_GIT_COMMIT || "local").slice(0, 7);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = stored.split(":");
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function createSession(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, userId);
  return token;
}

function currentUser(req) {
  const token = req.headers.cookie?.split(";").map(x => x.trim()).find(x => x.startsWith("session="))?.split("=")[1];
  const userId = token ? sessions.get(token) : null;
  return userId ? users.get(userId) : null;
}

function requireAuth(req, res, next) {
  if (!currentUser(req)) return res.redirect("/login?message=Please+login+to+continue");
  next();
}

function layout(title, body, user) {
  const nav = user
    ? `<a href="/">Browse</a><a href="/dashboard">Dashboard</a><a href="/#list">List Item</a><span class="nav-user">Hi, ${esc(user.name.split(" ")[0])}</span><form method="POST" action="/logout" class="inline"><button class="nav-btn">Logout</button></form>`
    : "<a href=\"/\">Browse</a><a href=\"/login\">Login</a><a class=\"nav-cta\" href=\"/register\">Create account</a>";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Campus ReUse student resource exchange platform"><title>${esc(title)} · Campus ReUse</title><link rel="stylesheet" href="/style.css"></head><body><header class="site-header"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">CR</span><span>Campus <b>ReUse</b></span></a><div class="nav-links">${nav}</div></nav></header>${body}<footer><div><b>Campus ReUse</b><span>Student resource exchange platform</span></div><span>Running commit: <code>${esc(commit())}</code></span></footer></body></html>`;
}

function flash(message, type = "info") {
  return message ? `<div class="flash ${type}">${esc(message)}</div>` : "";
}

function itemCard(item, user) {
  const own = user && item.ownerId === user.id;
  const requested = item.status === "REQUESTED";
  const action = !user
    ? "<a class=\"button secondary\" href=\"/login\">Login to request</a>"
    : own
      ? "<span class=\"pill neutral\">Your listing</span>"
      : requested
        ? "<span class=\"pill requested\">Requested</span>"
        : `<form method="POST" action="/items/${item.id}/request"><button class="button">Request item</button></form>`;
  return `<article class="item-card"><div class="item-top"><span class="category">${esc(item.category)}</span><span class="pill ${requested ? "requested" : "available"}">${requested ? "Requested" : "Available"}</span></div><div class="item-icon">${iconFor(item.category)}</div><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><div class="meta"><span>Condition: <b>${esc(item.condition)}</b></span><span>Owner: <b>${esc(item.owner)}</b></span></div><div class="card-action">${action}</div></article>`;
}

function iconFor(category) {
  return ({ Books: "📚", Calculators: "🧮", Electronics: "🔌", "Lab Equipment": "🧪", "Project Components": "🛠️", Stationery: "✏️", Bags: "🎒", Other: "📦" })[category] || "📦";
}

app.get("/", (req, res) => {
  const user = currentUser(req);
  const q = String(req.query.search || "").trim().toLowerCase();
  const category = String(req.query.category || "").trim();
  const filtered = items.filter(item => {
    const textMatch = !q || `${item.name} ${item.category} ${item.description} ${item.owner}`.toLowerCase().includes(q);
    return textMatch && (!category || item.category === category);
  });
  const available = items.filter(x => x.status === "AVAILABLE").length;
  const requested = items.filter(x => x.status === "REQUESTED").length;
  const cards = filtered.map(x => itemCard(x, user)).join("");
  const message = req.query.message;
  const body = `<main><section class="hero"><div class="hero-copy"><span class="eyebrow">STUDENT-TO-STUDENT EXCHANGE</span><h1>Give your unused stuff a <span>second life.</span></h1><p>Books, calculators, electronics and project resources — shared within your campus community.</p><div class="hero-actions"><a class="button" href="#items">Explore items</a><a class="button secondary" href="#list">List something</a></div></div><div class="hero-art"><div class="orb orb-one"></div><div class="orb orb-two"></div><div class="floating-card"><span>♻️</span><div><b>Reuse. Save. Share.</b><small>Built for students</small></div></div></div></section>${flash(message)}<section class="stats"><div><b>${items.length}</b><span>Total listings</span></div><div><b>${available}</b><span>Available now</span></div><div><b>${requested}</b><span>Requests</span></div><div><b>${categories.length}</b><span>Categories</span></div></section><section id="items" class="section"><div class="section-heading"><div><span class="eyebrow">MARKETPLACE</span><h2>Find what you need</h2></div><span class="result-count">${filtered.length} item${filtered.length === 1 ? "" : "s"}</span></div><form class="filters" method="GET" action="/"><input name="search" value="${esc(req.query.search || "")}" placeholder="Search books, calculators, electronics..."><select name="category"><option value="">All categories</option>${categories.map(c => `<option ${category === c ? "selected" : ""}>${c}</option>`).join("")}</select><button class="button">Search</button></form><div class="items-grid">${cards || "<div class=\"empty\"><span>🔎</span><h3>No items found</h3><p>Try another keyword or category.</p></div>"}</div></section><section id="list" class="list-section"><div class="section-heading"><div><span class="eyebrow">CONTRIBUTE</span><h2>List an unused item</h2><p>Help another student while clearing your shelf.</p></div></div>${user ? `<form method="POST" action="/items" class="listing-form"><div><label>Item name</label><input name="name" placeholder="e.g. Operating Systems Book" required></div><div><label>Category</label><select name="category" required><option value="">Choose category</option>${categories.map(c => `<option>${c}</option>`).join("")}</select></div><div><label>Condition</label><select name="condition" required><option value="">Choose condition</option>${conditions.map(c => `<option>${c}</option>`).join("")}</select></div><div class="wide"><label>Description</label><textarea name="description" maxlength="300" placeholder="Mention edition, accessories, usage, etc." required></textarea></div><div class="wide"><button class="button">Publish listing</button></div></form>` : "<div class=\"login-prompt\"><div><h3>Ready to share something?</h3><p>Create a free account to list items and manage requests.</p></div><a class=\"button\" href=\"/register\">Create account</a></div>"}</section></main>`;
  res.send(layout("Home", body, user));
});

app.get("/register", (req, res) => {
  const body = `<main class="auth-page"><div class="auth-card"><div class="auth-logo">CR</div><span class="eyebrow">JOIN CAMPUS REUSE</span><h1>Create your account</h1><p>List resources, request items and manage your campus exchange activity.</p>${flash(req.query.message, "error")}<form method="POST" action="/register" class="auth-form"><label>Full name<input name="name" required minlength="2" maxlength="60" placeholder="Your name"></label><label>College email<input type="email" name="email" required maxlength="100" placeholder="you@college.edu"></label><label>Password<input type="password" name="password" required minlength="6" placeholder="At least 6 characters"></label><button class="button">Create account</button></form><p class="auth-switch">Already have an account? <a href="/login">Login</a></p></div></main>`;
  res.send(layout("Create account", body, currentUser(req)));
});

app.post("/register", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2 || !email.includes("@") || password.length < 6) return res.redirect("/register?message=Please+enter+valid+details+and+a+6%2B+character+password");
  if (users.has(email)) return res.redirect("/login?message=Account+already+exists+for+that+email");
  const user = { id: crypto.randomUUID(), name, email, passwordHash: hashPassword(password) };
  users.set(email, user);
  const token = createSession(user.id);
  res.setHeader("Set-Cookie", `session=${token}; HttpOnly; Path=/; SameSite=Lax`);
  res.redirect("/dashboard?message=Welcome+to+Campus+ReUse");
});

app.get("/login", (req, res) => {
  const body = `<main class="auth-page"><div class="auth-card"><div class="auth-logo">CR</div><span class="eyebrow">WELCOME BACK</span><h1>Login to Campus ReUse</h1><p>Access your listings, requests and campus exchange dashboard.</p>${flash(req.query.message)}<form method="POST" action="/login" class="auth-form"><label>College email<input type="email" name="email" required placeholder="you@college.edu"></label><label>Password<input type="password" name="password" required placeholder="Your password"></label><button class="button">Login</button></form><p class="auth-switch">New here? <a href="/register">Create an account</a></p></div></main>`;
  res.send(layout("Login", body, currentUser(req)));
});

app.post("/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = users.get(email);
  if (!user || !verifyPassword(password, user.passwordHash)) return res.redirect("/login?message=Invalid+email+or+password");
  const token = createSession(user.id);
  res.setHeader("Set-Cookie", `session=${token}; HttpOnly; Path=/; SameSite=Lax`);
  res.redirect("/dashboard");
});

app.post("/logout", (req, res) => {
  const token = req.headers.cookie?.split(";").map(x => x.trim()).find(x => x.startsWith("session="))?.split("=")[1];
  if (token) sessions.delete(token);
  res.setHeader("Set-Cookie", "session=; Max-Age=0; HttpOnly; Path=/; SameSite=Lax");
  res.redirect("/?message=You+have+been+logged+out");
});

app.get("/dashboard", requireAuth, (req, res) => {
  const user = currentUser(req);
  const mine = items.filter(x => x.ownerId === user.id);
  const requests = items.filter(x => x.requestedBy === user.id);
  const body = `<main class="dashboard"><section class="dash-head"><div><span class="eyebrow">YOUR CAMPUS SPACE</span><h1>Welcome, ${esc(user.name.split(" ")[0])} 👋</h1><p>Manage your listings and keep track of requested resources.</p></div><a class="button" href="/#list">+ List new item</a></section>${flash(req.query.message, "success")}<section class="dashboard-grid"><div class="dash-card"><span class="dash-icon">📦</span><b>${mine.length}</b><span>Your listings</span></div><div class="dash-card"><span class="dash-icon">📨</span><b>${requests.length}</b><span>Your requests</span></div><div class="dash-card"><span class="dash-icon">♻️</span><b>${items.filter(x => x.status === "AVAILABLE").length}</b><span>Available campus items</span></div></section><section class="dash-section"><div class="section-heading"><div><span class="eyebrow">MY LISTINGS</span><h2>Items you shared</h2></div></div><div class="dashboard-list">${mine.length ? mine.map(x => `<div class="dash-row"><span class="row-icon">${iconFor(x.category)}</span><div><b>${esc(x.name)}</b><small>${esc(x.category)} · ${esc(x.condition)}</small></div><span class="pill ${x.status === "REQUESTED" ? "requested" : "available"}">${x.status}</span></div>`).join("") : "<div class=\"empty small\"><span>📦</span><p>You haven't listed anything yet.</p></div>"}</div></section><section class="dash-section"><div class="section-heading"><div><span class="eyebrow">MY REQUESTS</span><h2>Resources you requested</h2></div></div><div class="dashboard-list">${requests.length ? requests.map(x => `<div class="dash-row"><span class="row-icon">${iconFor(x.category)}</span><div><b>${esc(x.name)}</b><small>Owner: ${esc(x.owner)}</small></div><span class="pill requested">Requested</span></div>`).join("") : "<div class=\"empty small\"><span>🔎</span><p>No requests yet. <a href=\"/\">Browse items</a>.</p></div>"}</div></section></main>`;
  res.send(layout("Dashboard", body, user));
});

app.post("/items", requireAuth, (req, res) => {
  const user = currentUser(req);
  const name = String(req.body.name || "").trim();
  const category = String(req.body.category || "").trim();
  const condition = String(req.body.condition || "").trim();
  const description = String(req.body.description || "").trim();
  if (!name || !categories.includes(category) || !conditions.includes(condition) || !description || name.length > 80 || description.length > 300) return res.status(400).send("Invalid listing data");
  items.push({ id: nextItemId++, name, category, condition, description, ownerId: user.id, owner: user.name, status: "AVAILABLE", requestedBy: null });
  res.redirect("/dashboard?message=Your+item+is+now+listed");
});

app.post("/items/:id/request", requireAuth, (req, res) => {
  const user = currentUser(req);
  const item = items.find(x => x.id === Number(req.params.id));
  if (!item) return res.status(404).send("Item not found");
  if (item.ownerId === user.id) return res.status(409).send("You cannot request your own item");
  if (item.status !== "AVAILABLE") return res.status(409).send("Item unavailable");
  item.status = "REQUESTED";
  item.requestedBy = user.id;
  res.redirect("/?message=Request+sent+successfully");
});

app.get("/api/items", (req, res) => res.json(items));
app.get("/api/stats", (req, res) => res.json({ total: items.length, available: items.filter(x => x.status === "AVAILABLE").length, requested: items.filter(x => x.status === "REQUESTED").length, categories: categories.length }));
app.get("/health", (req, res) => res.json({ status: "ok", commit: commit() }));

module.exports = app;
