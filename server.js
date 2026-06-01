/* ═══════════════════════════════════════════════
   TRPG Crossing Terminal - HTTP Server (读 + 写)
   启动: node server.js → http://localhost:3000
   ═══════════════════════════════════════════════ */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

http.createServer((req, res) => {
  // ── CORS headers ──
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // ── POST /api/data/<relative-path> — 写入 data/ 下的 JSON 文件 ──
  const PREFIX = "/api/data/";
  if (req.method === "POST" && req.url.startsWith(PREFIX)) {
    const relPath = decodeURIComponent(req.url.slice(PREFIX.length));
    const safePath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
    const fullPath = path.join(DATA_DIR, safePath);

    if (!fullPath.startsWith(DATA_DIR)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Forbidden" }));
    }

    if (path.extname(fullPath) !== ".json") {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Only .json files allowed" }));
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        JSON.parse(body);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, body, "utf-8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── DELETE /api/data/<relative-path> — 删除 data/ 下的 JSON 文件 ──
  if (req.method === "DELETE" && req.url.startsWith(PREFIX)) {
    const relPath = decodeURIComponent(req.url.slice(PREFIX.length));
    const safePath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
    const fullPath = path.join(DATA_DIR, safePath);

    if (!fullPath.startsWith(DATA_DIR) || path.extname(fullPath) !== ".json") {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Forbidden" }));
    }

    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "File not found" }));
      }
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── GET — 静态文件服务 ──
  let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);
  const ext = path.extname(filePath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found: " + req.url);
    }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log("╔═══════════════════════════════════════╗");
  console.log("║  穿越团 · 主神空间终端               ║");
  console.log("║  服务器已启动（读写模式）             ║");
  console.log(`║  → http://localhost:${PORT}               ║`);
  console.log("║  Ctrl+C 停止服务器                   ║");
  console.log("╚═══════════════════════════════════════╝");
});
