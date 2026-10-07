// Server kecil tanpa dependensi: menyajikan halaman dan meneruskan permintaan AI ke Anthropic API.
// API key hanya ada di server (variabel lingkungan), tidak pernah dikirim ke browser.
const http = require("http");
const fs = require("fs");
const path = require("path");

// Pembaca .env sederhana (untuk dijalankan di komputer sendiri)
try {
  fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/).forEach((l) => {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !l.trim().startsWith("#") && !(m[1] in process.env)) process.env[m[1]] = m[2];
  });
} catch (e) {}

const PORT = Number(process.env.PORT) || 3000;
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const PER_IP = Number(process.env.LIMIT_PER_IP_PER_HOUR) || 40; // permintaan AI per IP per jam
const PER_DAY = Number(process.env.LIMIT_PER_DAY) || 1000; // total permintaan AI per hari
const MAX_PROMPT = 8000; // karakter
const hits = new Map();
let day = new Date().toDateString();
let dayCount = 0;

const clientIp = (req) =>
  String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();

function allow(req) {
  const today = new Date().toDateString();
  if (today !== day) { day = today; dayCount = 0; }
  if (dayCount >= PER_DAY) return false;
  const ip = clientIp(req), now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600000);
  if (list.length >= PER_IP) { hits.set(ip, list); return false; }
  list.push(now); hits.set(ip, list); dayCount++;
  return true;
}
setInterval(() => { // bersihkan catatan lama
  const now = Date.now();
  for (const [ip, l] of hits) { const f = l.filter((t) => now - t < 3600000); f.length ? hits.set(ip, f) : hits.delete(ip); }
}, 600000).unref();

function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit = 30000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > limit) { reject(new Error("too_large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || "/").split("?")[0];
  try {
    if (req.method === "GET" && url === "/api/health") return send(res, 200, { ai: !!KEY });

    if (req.method === "POST" && url === "/api/ai") {
      if (!KEY) return send(res, 503, { error: "no_key", message: "ANTHROPIC_API_KEY belum diatur di server." });
      if (!allow(req)) return send(res, 429, { error: "rate_limited", message: "Batas penggunaan AI tercapai. Coba lagi nanti." });
      let body;
      try { body = JSON.parse(await readBody(req)); } catch (e) { return send(res, 400, { error: "bad_request" }); }
      const prompt = body && body.prompt;
      if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT) return send(res, 400, { error: "bad_request" });
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        console.error("Anthropic error", r.status, data && data.error && data.error.message);
        return send(res, r.status === 429 ? 429 : 502, { error: r.status === 429 ? "rate_limited" : "upstream", message: "AI sedang tidak bisa dipakai. Coba lagi." });
      }
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
      return send(res, 200, { text });
    }

    if (req.method === "GET" && (url === "/" || url === "/index.html")) {
      const html = fs.readFileSync(path.join(__dirname, "public", "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff" });
      return res.end(html);
    }
    send(res, 404, { error: "not_found" });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: "server_error" });
  }
});

server.listen(PORT, () => {
  console.log("Berjalan di http://localhost:" + PORT + (KEY ? "" : "  (peringatan: ANTHROPIC_API_KEY belum diatur, fitur AI nonaktif)"));
});
