import crypto from "crypto";
const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
if (!process.env.JWT_SECRET) console.warn("⚠ Set JWT_SECRET in production");

export const hash = pw => { const s = crypto.randomBytes(16).toString("hex"); return s + ":" + crypto.scryptSync(pw, s, 64).toString("hex"); };
export const check = (pw, h) => { const [s, k] = h.split(":"); return crypto.timingSafeEqual(crypto.scryptSync(pw, s, 64), Buffer.from(k, "hex")); };
const mac = p => crypto.createHmac("sha256", SECRET).update(p).digest("base64url");
export const sign = uid => { const p = Buffer.from(JSON.stringify({ uid, exp: Date.now() + 30 * 864e5 })).toString("base64url"); return p + "." + mac(p); };

export function auth(req, res, next) {
  const [p, sig] = (req.headers.authorization || "").replace("Bearer ", "").split(".");
  const deny = () => res.status(401).json({ error: "Login required" });
  if (!p || !sig) return deny();
  const ok = mac(p);
  if (sig.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(ok))) return deny();
  try { const d = JSON.parse(Buffer.from(p, "base64url")); if (d.exp < Date.now()) return deny(); req.uid = d.uid; next(); } catch { deny(); }
}
