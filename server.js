// ---- 1. Load the tools we need ----
const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");        // scrambles passwords (hashing)
const jwt = require("jsonwebtoken");       // makes and checks login tokens
const { DatabaseSync } = require("node:sqlite");

const app = express();
const PORT = 3000;

// Secret used to sign tokens. In a real project this goes in a .env file.
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-later";

// ---- 2. Database and tables ----
const db = new DatabaseSync(path.join(__dirname, "expenses.db"));

// NEW: users table. We store a password HASH, never the real password.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  )
`);

// CHANGED: every expense now belongs to a user (user_id)
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT,
    date TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// ---- 3. Middleware ----
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Helper: make a token that says "this is user #id"
function makeToken(user) {
  return jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
}

// The "security guard": runs before protected routes and checks the token
function requireLogin(req, res, next) {
  const header = req.headers.authorization || "";   // looks like: "Bearer <token>"
  const token = header.replace("Bearer ", "");

  try {
    req.user = jwt.verify(token, JWT_SECRET);        // valid token -> we know who it is
    next();                                          // let the request continue
  } catch (error) {
    res.status(401).json({ error: "Please log in first" });
  }
}

// ---- 4. Auth routes (open to everyone) ----

// Sign up
app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: "This email is already registered" });
  }

  const hash = bcrypt.hashSync(password, 10);        // scramble the password
  const result = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run(name.trim(), cleanEmail, hash);

  const user = { id: Number(result.lastInsertRowid), name: name.trim() };
  res.status(201).json({ token: makeToken(user), name: user.name });
});

// Log in
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || "").trim().toLowerCase();

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);

  // Same message for both mistakes, so nobody can guess which emails exist
  if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
    return res.status(401).json({ error: "Wrong email or password" });
  }

  res.json({ token: makeToken(user), name: user.name });
});

// ---- 5. Expense routes (protected: requireLogin runs first) ----

// GET: only THIS user's expenses
app.get("/api/expenses", requireLogin, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, id DESC")
    .all(req.user.id);
  res.json(rows);
});

// POST: save an expense for THIS user
app.post("/api/expenses", requireLogin, (req, res) => {
  const { title, amount, category, date } = req.body;

  if (!title || !amount || !date) {
    return res.status(400).json({ error: "title, amount and date are required" });
  }

  const result = db
    .prepare("INSERT INTO expenses (user_id, title, amount, category, date) VALUES (?, ?, ?, ?, ?)")
    .run(req.user.id, title, Number(amount), category, date);

  res.status(201).json({ id: Number(result.lastInsertRowid), title, amount, category, date });
});

// DELETE: only if the expense belongs to THIS user
app.delete("/api/expenses/:id", requireLogin, (req, res) => {
  db.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?").run(
    Number(req.params.id),
    req.user.id
  );
  res.json({ success: true });
});

// ---- 6. Start the server ----
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
