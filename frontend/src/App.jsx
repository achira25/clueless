import { useEffect, useRef, useState } from "react";

const CATS = ["top", "bottom", "dress", "shoes", "layer"];
const FITS = ["fitted", "structured", "aline", "wide", "highwaist", "wrap", "flowy", "vneck", "empire", "pleated", "flared", "straight", "fitandflare", "simple", "boxy"];
const FABRICS = ["cotton", "linen", "silk", "satin", "chiffon", "denim", "polyester", "knit", "wool", "velvet", "leather"];
const OCC = ["casual", "college", "work", "birthday", "party", "date", "anniversary", "wedding"];
const MOODS = ["cozy", "bold", "romantic", "professional", "playful", "edgy"];
const DEMO = [
  ["Blush satin top", "top", "#e8a0b4", "satin", 3, "fitted"], ["Yellow plaid blazer", "layer", "#e3b948", "wool", 3, "structured"],
  ["Pleated plaid skirt", "bottom", "#c9a227", "wool", 3, "pleated"], ["White tee", "top", "#f4f1ea", "cotton", 1, "simple"],
  ["Wide denim", "bottom", "#4a6a8a", "denim", 2, "wide"], ["Wine wrap dress", "dress", "#6b1e2e", "velvet", 4, "wrap"],
  ["Cream mary janes", "shoes", "#efe3c8", "leather", 3, "simple"], ["Sage flowy top", "top", "#8da580", "linen", 2, "flowy"],
  ["Black A-line skirt", "bottom", "#1d1a1a", "cotton", 3, "aline"],
].map(([name, category, color, fabric, formality, fit], i) => ({ id: "d" + i, name, category, color, fabric, formality, fit }));

const tok = () => localStorage.getItem("clueless.token");
const api = (p, body, method) => fetch("/api/" + p, {
  method: method || (body ? "POST" : "GET"),
  headers: { "Content-Type": "application/json", ...(tok() ? { Authorization: "Bearer " + tok() } : {}) },
  body: body ? JSON.stringify(body) : undefined,
}).then(async r => { const j = await r.json().catch(() => ({})); if (r.status === 401 && tok()) { localStorage.removeItem("clueless.token"); location.reload(); } return j; });
const logout = () => { localStorage.removeItem("clueless.token"); location.reload(); };

function detectColor(img) {
  const c = document.createElement("canvas"); c.width = c.height = 40;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0, 40, 40);
  const d = x.getImageData(8, 8, 24, 24).data; let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) continue; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  n = n || 1; return "#" + [r, g, b].map(v => Math.round(v / n).toString(16).padStart(2, "0")).join("");
}
function thumb(img) {
  const c = document.createElement("canvas"), s = 240 / Math.max(img.width, img.height);
  c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", .7);
}

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add("in")), { threshold: .12 });
    const scan = () => document.querySelectorAll(".rv:not(.in)").forEach(el => io.observe(el));
    scan(); const mo = new MutationObserver(scan); mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

const Sec = ({ n, title, children, id }) => (
  <section id={id} className="sec"><div className="rv sec-h"><span className="num">{n}</span><h2>{title}</h2></div>{children}</section>
);
const Chips = ({ list, value, onChange }) => (
  <div className="chips">{list.map(o => <button key={o} type="button" className={value === o ? "chip on" : "chip"} onClick={() => onChange(value === o ? "" : o)}>{o}</button>)}</div>
);

function Auth() {
  useReveal();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const go = async e => {
    e.preventDefault(); setErr("");
    const j = await api("auth/" + mode, f);
    if (j.token) { localStorage.setItem("clueless.token", j.token); location.reload(); } else setErr(j.error || "Something went wrong");
  };
  return (
    <div className="auth"><div className="grain" />
      <div className="arch"><div className="plaid" /></div>
      <form className="card" onSubmit={go}>
        <h2>Clueless<i>.</i></h2>
        <p>{mode === "login" ? "Welcome back — your closet is waiting." : "Create your closet. It follows you on every device."}</p>
        {mode === "register" && <input placeholder="Your name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />}
        <input type="email" placeholder="Email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <input type="password" placeholder="Password (6+ characters)" required minLength={6} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
        {err && <small className="err">{err}</small>}
        <button className="btn">{mode === "login" ? "Log in" : "Sign up"}</button>
        <button type="button" className="link" onClick={() => { setErr(""); setMode(mode === "login" ? "register" : "login"); }}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>
      </form>
    </div>
  );
}

export default function Root() { return tok() ? <Main /> : <Auth />; }

function Main() {
  useReveal();
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState("");
  const [profile, setProfile] = useState({ shape: "hourglass", undertone: "neutral", height: 165 });
  const [ctx, setCtx] = useState({ occasion: "birthday", mood: "romantic", budget: "3000", city: "Delhi" });
  const [weather, setWeather] = useState(null);
  const [res, setRes] = useState(null);
  const [shop, setShop] = useState(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ name: "", category: "top", fabric: "cotton", formality: 2, fit: "simple", color: "#c9a227", image: null });
  const [y, setY] = useState(0);
  const fileRef = useRef();

  useEffect(() => {
    api("closet").then(j => {
      if (j.items) { setItems(j.items); setUser(j.user); if (j.profile?.shape) setProfile(j.profile); if (j.ctx?.occasion) setCtx(c => ({ ...c, ...j.ctx })); }
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => api("prefs", { profile, ctx }, "PUT").then(() => setSaved("saved ✓")), 600);
    return () => clearTimeout(t);
  }, [profile, ctx, ready]);
  useEffect(() => { const f = () => setY(window.scrollY); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);

  const onFile = e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image(); img.onload = () => setDraft(d => ({ ...d, color: detectColor(img), image: thumb(img), name: d.name || f.name.replace(/\.\w+$/, "") })); img.src = URL.createObjectURL(f);
  };
  const add = async e => {
    e.preventDefault(); if (!draft.name) return;
    const it = { ...draft, id: Date.now() + "" };
    setItems(i => [...i, it]); setDraft(d => ({ ...d, name: "", image: null })); if (fileRef.current) fileRef.current.value = "";
    await api("items", it); setSaved("saved ✓");
  };
  const del = async id => { setItems(i => i.filter(x => x.id !== id)); await api("items/" + id, null, "DELETE"); setSaved("saved ✓"); };
  const loadDemo = async () => { const d = DEMO.map(x => ({ ...x, id: "d" + Date.now() + x.id })); setItems(i => [...i, ...d]); await api("items", d); setSaved("saved ✓"); };

  const style = async () => {
    setBusy(true);
    let w = null; try { const j = await api("weather?city=" + encodeURIComponent(ctx.city)); if (!j.error) w = j; } catch {}
    setWeather(w);
    const [o, s] = await Promise.all([
      api("outfits", { items, profile, context: ctx, weather: w }),
      api("shop", { occasion: ctx.occasion, mood: ctx.mood, budget: ctx.budget, want: "outfit" }),
    ]);
    setRes(o.outfits); setShop(s); setBusy(false);
    setTimeout(() => document.getElementById("looks")?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  return (
    <>
      <div className="grain" />
      <nav><b>Clueless<i>.</i></b><div><a href="#closet">Closet</a><a href="#profile">Profile</a><a href="#stylist">Stylist</a><a href="#looks">Looks</a><span className="saved">{saved}</span><button className="link" onClick={logout}>Log out{user ? ` (${user.name})` : ""}</button></div></nav>

      <header className="hero">
        <div className="hero-t">
          <p className="eyebrow rv">Atelier of everyday dressing · est. 1995</p>
          <h1 aria-label="Clueless">{"Clueless".split("").map((c, i) => <span key={i} style={{ animationDelay: i * 70 + "ms" }}>{c}</span>)}</h1>
          <p className="lede rv">Your wardrobe, digitised. Colour theory, body shape, weather and mood — weighed in seconds, explained like a friend would.</p>
          <a className="btn rv" href="#closet">Open the closet →</a>
        </div>
        <div className="arch" style={{ transform: `translateY(${y * -.08}px)` }}>
          <div className="plaid" />
          <svg viewBox="0 0 200 200" className="badge"><defs><path id="c" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" /></defs><text><textPath href="#c">as if! · as if! · as if! · as if! ·</textPath></text></svg>
        </div>
      </header>

      <div className="marquee"><div>{Array(6).fill("COLOUR THEORY ✦ SILHOUETTE ✦ FABRIC ✦ WEATHER ✦ MOOD ✦ OCCASION ✦ ").join("")}</div></div>

      <Sec n="01" title="The Closet" id="closet">
        <div className="grid2">
          <form className="card rv" onSubmit={add}>
            <label className="drop">{draft.image ? <img src={draft.image} alt="" /> : <span>＋ drop a photo<br /><small>colour is detected automatically</small></span>}<input ref={fileRef} type="file" accept="image/*" onChange={onFile} hidden /></label>
            <input placeholder="Name, e.g. Wine wrap dress" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
            <div className="row">
              <select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
              <select value={draft.fabric} onChange={e => setDraft({ ...draft, fabric: e.target.value })}>{FABRICS.map(c => <option key={c}>{c}</option>)}</select>
            </div>
            <div className="row">
              <select value={draft.fit} onChange={e => setDraft({ ...draft, fit: e.target.value })}>{FITS.map(c => <option key={c}>{c}</option>)}</select>
              <select value={draft.formality} onChange={e => setDraft({ ...draft, formality: +e.target.value })}>{[1, 2, 3, 4, 5].map(c => <option key={c} value={c}>formality {c}</option>)}</select>
            </div>
            <div className="row"><label className="clr">colour <input type="color" value={draft.color} onChange={e => setDraft({ ...draft, color: e.target.value })} /></label><button className="btn">Add to closet</button></div>
          </form>
          <div>
            <div className="closet">
              {items.map(it => (
                <figure key={it.id} className="piece rv">
                  <div className="ph" style={{ background: it.color }}>{it.image && <img src={it.image} alt={it.name} />}</div>
                  <figcaption>{it.name}<small>{it.category} · {it.fabric}</small></figcaption>
                  <button onClick={() => del(it.id)} aria-label="remove">×</button>
                </figure>
              ))}
              {!items.length && <p className="empty">Nothing here yet — add a piece, or load a ready-made closet.</p>}
            </div>
            <button className="link" onClick={loadDemo}>Load demo wardrobe</button>
          </div>
        </div>
      </Sec>

      <Sec n="02" title="Your Profile" id="profile">
        <div className="card wide rv">
          <h4>Body shape</h4><Chips list={["pear", "apple", "hourglass", "rectangle", "inverted"]} value={profile.shape} onChange={v => setProfile({ ...profile, shape: v })} />
          <h4>Skin undertone</h4><Chips list={["warm", "cool", "neutral"]} value={profile.undertone} onChange={v => setProfile({ ...profile, undertone: v })} />
          <h4>Height · {profile.height} cm</h4><input type="range" min="140" max="195" value={profile.height} onChange={e => setProfile({ ...profile, height: +e.target.value })} />
        </div>
      </Sec>

      <Sec n="03" title="Ask the Stylist" id="stylist">
        <div className="card wide rv">
          <h4>Occasion</h4><Chips list={OCC} value={ctx.occasion} onChange={v => setCtx({ ...ctx, occasion: v })} />
          <h4>Mood</h4><Chips list={MOODS} value={ctx.mood} onChange={v => setCtx({ ...ctx, mood: v })} />
          <div className="row"><label>Budget (₹)<input value={ctx.budget} onChange={e => setCtx({ ...ctx, budget: e.target.value })} /></label><label>City (for weather)<input value={ctx.city} onChange={e => setCtx({ ...ctx, city: e.target.value })} /></label></div>
          <button className="btn big" disabled={busy || items.length < 2} onClick={style}>{busy ? "Consulting the closet computer…" : "Style me →"}</button>
          {items.length < 2 && <small className="hint">Add at least a top and a bottom (or a dress) first.</small>}
        </div>
      </Sec>

      <Sec n="04" title="Today's Looks" id="looks">
        {weather && <p className="wx rv">{weather.city} · {Math.round(weather.temp)}°C{weather.rain ? " · rain expected" : ""}</p>}
        {!res && <p className="empty">Your looks will appear here.</p>}
        <div className="looks">
          {res?.map((o, i) => (
            <article key={i} className="look rv" style={{ transitionDelay: i * 120 + "ms" }}>
              <div className="score"><b>{o.score}</b><small>/100</small></div>
              <div className="stack">{o.items.map(it => <div key={it.id} className="mini"><div style={{ background: it.color }}>{it.image && <img src={it.image} alt="" />}</div><span>{it.name}</span></div>)}</div>
              <p className="why">{o.explanation}</p>
            </article>
          ))}
          {res && !res.length && <p className="empty">Not enough pieces to build an outfit yet.</p>}
        </div>
        {shop && (
          <div className="shop rv"><h3>Shop the look</h3><p>“{shop.query}”</p>
            <div className="chips">{shop.links.map(l => <a key={l.site} className="chip on" href={l.url} target="_blank" rel="noreferrer">{l.site} ↗</a>)}</div>
            {shop.results && <ul>{shop.results.map(r => <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer">{r.title}</a></li>)}</ul>}
          </div>
        )}
      </Sec>

      <footer><b>Clueless.</b> Achira Shukla · Siya Srivastava — Android &amp; iOS Lab, JIIT Noida</footer>
    </>
  );
}
