import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("novels.db");
db.pragma('foreign_keys = ON');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS novels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_id INTEGER,
    title TEXT NOT NULL,
    content TEXT,
    order_index INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/novels", (req, res) => {
    try {
      const novels = db.prepare("SELECT * FROM novels ORDER BY created_at DESC").all();
      res.json(novels);
    } catch (error) {
      console.error("Error fetching novels:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/novels", (req, res) => {
    try {
      const { title, author, description } = req.body;
      const info = db.prepare("INSERT INTO novels (title, author, description) VALUES (?, ?, ?)").run(title, author, description);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error("Error creating novel:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/novels/:id", (req, res) => {
    try {
      const novel = db.prepare("SELECT * FROM novels WHERE id = ?").get(req.params.id);
      if (!novel) return res.status(404).json({ error: "Novel not found" });
      const chapters = db.prepare("SELECT * FROM chapters WHERE novel_id = ? ORDER BY order_index ASC").all(req.params.id);
      res.json({ ...novel as any, chapters });
    } catch (error) {
      console.error("Error fetching novel details:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/novels/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Deleting novel with id: ${id}`);
      const info = db.prepare("DELETE FROM novels WHERE id = ?").run(id);
      console.log(`Delete novel result:`, info);
      res.json({ success: true, changes: info.changes });
    } catch (error) {
      console.error("Error deleting novel:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/chapters/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const chapter = db.prepare("SELECT * FROM chapters WHERE id = ?").get(id);
      res.json(chapter);
    } catch (error) {
      console.error("Error fetching chapter:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/novels/:id/chapters", (req, res) => {
    try {
      const novelId = parseInt(req.params.id);
      const { title, content, order_index } = req.body;
      const info = db.prepare("INSERT INTO chapters (novel_id, title, content, order_index) VALUES (?, ?, ?, ?)").run(novelId, title, content, order_index);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error("Error creating chapter:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/chapters/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, content } = req.body;
      db.prepare("UPDATE chapters SET title = ?, content = ? WHERE id = ?").run(title, content, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating chapter:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/chapters/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Deleting chapter with id: ${id}`);
      const info = db.prepare("DELETE FROM chapters WHERE id = ?").run(id);
      console.log(`Delete chapter result:`, info);
      res.json({ success: true, changes: info.changes });
    } catch (error) {
      console.error("Error deleting chapter:", error);
      res.status(500).json({ error: "Internal server error" });
    }
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
