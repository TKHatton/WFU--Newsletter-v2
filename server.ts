import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const db = new Database("newsletter.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER,
    type TEXT NOT NULL,
    content TEXT,
    author_name TEXT,
    author_email TEXT,
    status TEXT DEFAULT 'pending',
    ai_feedback TEXT,
    word_limit INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id)
  );

  CREATE TABLE IF NOT EXISTS contributors (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'writer'
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // API Routes
  app.get("/api/issues", (req, res) => {
    const issues = db.prepare("SELECT * FROM issues ORDER BY created_at DESC").all();
    res.json(issues);
  });

  app.post("/api/issues", (req, res) => {
    const { title } = req.body;
    const result = db.prepare("INSERT INTO issues (title) VALUES (?)").run(title);
    const issueId = result.lastInsertRowid;

    // Create default sections for the new issue
    const sections = [
      { type: "Letter from the Dean", limit: 500 },
      { type: "Book Club", limit: 300 },
      { type: "Community Events", limit: 400 },
      { type: "Art/Poetry/Crafts", limit: 400 },
      { type: "Moral Dialog of the Week", limit: 600 },
      { type: "Health Note", limit: 250 },
      { type: "Spiritual Formation Connection", limit: 400 },
      { type: "Biblical Interpretation", limit: 500 },
      { type: "Impact/Service Highlight", limit: 400 }
    ];

    const insertSection = db.prepare("INSERT INTO sections (issue_id, type, word_limit) VALUES (?, ?, ?)");
    sections.forEach(s => insertSection.run(issueId, s.type, s.limit));

    res.json({ id: issueId });
  });

  app.get("/api/issues/:id/sections", (req, res) => {
    const sections = db.prepare("SELECT * FROM sections WHERE issue_id = ?").all(req.params.id);
    res.json(sections);
  });

  app.put("/api/sections/:id", (req, res) => {
    const { content, author_name, author_email, status, ai_feedback } = req.body;
    db.prepare(`
      UPDATE sections 
      SET content = ?, author_name = ?, author_email = ?, status = ?, ai_feedback = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(content, author_name, author_email, status, ai_feedback, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/contributors", (req, res) => {
    const contributors = db.prepare("SELECT * FROM contributors").all();
    res.json(contributors);
  });

  app.post("/api/contributors", (req, res) => {
    const { email, name, role } = req.body;
    db.prepare("INSERT OR REPLACE INTO contributors (email, name, role) VALUES (?, ?, ?)").run(email, name, role);
    res.json({ success: true });
  });

  app.post("/api/notify", async (req, res) => {
    const { type, recipient, context } = req.body;
    // In a real app, this would send an actual email.
    // Here we simulate the AI drafting the notification.
    const prompt = `Draft a professional ${type} notification for ${recipient}. Context: ${context}. The tone should be Wake Forest University professional.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    res.json({ draft: response.text });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
