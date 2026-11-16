import express from "express";
import cors from "cors";
import fs from "fs";
import { scoreOutfits, shopLinks } from "./engine.js";
import { db } from "./db.js";
import { hash, check, sign, auth } from "./auth.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.get("/api/weather", async (req, res) => {
  try {
    const city = String(req.query.city || "Delhi");
    const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`)).json();
    const p = g.results?.[0]; if (!p) return res.status(404).json({ error: "City not found" });
    const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,precipitation,weather_code`)).json();
    const c = w.current;
    res.json({ city: p.name, temp: c.temperature_2m, rain: c.precipitation > 0 || c.weather_code >= 51 });
  } catch { res.status(502).json({ error: "Weather service unavailable" }); }
});

async function prose(reasons, ctx) {
  const plain = reasons.length ? "Why it works: " + reasons.join("; ") + "." : "A decent match from your closet.";
  const key = process.env.GEMINI_API_KEY; if (!key || !reasons.length) return plain;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: `You are Cher from Clueless, a warm stylist. In 2 short sentences explain this outfit for a ${ctx.occasion || "day out"} using only these facts: ${reasons.join("; ")}` }] }] })
    });
    return (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text?.trim() || plain;
  } catch { return plain; }
}

app.post("/api/outfits", async (req, res) => {
  const { items = [], profile = {}, context = {}, weather = null } = req.body;
  const out = scoreOutfits(items, profile, context, weather);
  for (const o of out) o.explanation = await prose(o.why, context);
  res.json({ outfits: out });
});

app.post("/api/shop", async (req, res) => {
  const s = shopLinks(req.body || {});
  const { GOOGLE_CSE_KEY: k, GOOGLE_CSE_CX: cx } = process.env;
  if (k && cx) {
    try {
      const j = await (await fetch(`https://www.googleapis.com/customsearch/v1?key=${k}&cx=${cx}&q=${encodeURIComponent(s.query)}&num=6`)).json();
      s.results = (j.items || []).map(i => ({ title: i.title, url: i.link, image: i.pagemap?.cse_thumbnail?.[0]?.src }));
    } catch { /* fall back to deep links */ }
  }
  res.json(s);
});

// ---------- accounts & permanent closet (SQLite) ----------
const J = v => { try { return JSON.parse(v); } catch { return {}; } };
const cred = (req, res) => {
  const { email = "", password = "", name = "" } = req.body || {};
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) { res.status(400).json({ error: "Valid email and a password of 6+ characters required" }); return null; }
  return { email: email.toLowerCase().trim(), password, name: name.trim() || email.split("@")[0] };
};
app.post("/api/auth/register", (req, res) => {
  const c = cred(req, res); if (!c) return;
  if (db.prepare("select 1 from users where email=?").get(c.email)) return res.status(409).json({ error: "Email already registered" });
  const id = db.prepare("insert into users(email,name,pass) values(?,?,?)").run(c.email, c.name, hash(c.password)).lastInsertRowid;
  res.json({ token: sign(Number(id)), user: { name: c.name, email: c.email } });
});
app.post("/api/auth/login", (req, res) => {
  const { email = "", password = "" } = req.body || {};
  const u = db.prepare("select * from users where email=?").get(email.toLowerCase().trim());
  if (!u || !check(password, u.pass)) return res.status(401).json({ error: "Wrong email or password" });
  res.json({ token: sign(u.id), user: { name: u.name, email: u.email } });
});
app.get("/api/closet", auth, (req, res) => {
  const u = db.prepare("select name,email,profile,ctx from users where id=?").get(req.uid);
  if (!u) return res.status(401).json({ error: "Login required" });
  const items = db.prepare("select data from items where user_id=? order by created, rowid").all(req.uid).map(r => J(r.data));
  res.json({ user: { name: u.name, email: u.email }, items, profile: J(u.profile), ctx: J(u.ctx) });
});
app.post("/api/items", auth, (req, res) => {
  const ins = db.prepare("insert or replace into items(id,user_id,data) values(?,?,?)");
  db.transaction(list => list.forEach(i => ins.run(String(i.id), req.uid, JSON.stringify(i))))([].concat(req.body));
  res.json({ ok: true });
});
app.delete("/api/items/:id", auth, (req, res) => { db.prepare("delete from items where id=? and user_id=?").run(req.params.id, req.uid); res.json({ ok: true }); });
app.put("/api/prefs", auth, (req, res) => {
  db.prepare("update users set profile=?, ctx=? where id=?").run(JSON.stringify(req.body.profile || {}), JSON.stringify(req.body.ctx || {}), req.uid);
  res.json({ ok: true });
});

const dist = new URL("../frontend/dist/", import.meta.url).pathname;
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get("*", (_, r) => r.sendFile(dist + "index.html")); }

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Clueless API on :${port}`));
