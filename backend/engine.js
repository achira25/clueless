import fs from "fs";
const R = JSON.parse(fs.readFileSync(new URL("./data/rules.json", import.meta.url)));

export function hsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
  return { h, s, l };
}
const neutral = c => c.s < .18 || c.l < .12 || c.l > .9;
const hd = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

export function colorPair(a, b) {
  const A = hsl(a), B = hsl(b);
  if (neutral(A) || neutral(B)) return [.75, "a neutral anchors the colour"];
  const d = hd(A.h, B.h);
  if (d < 15) return [.8, "a tonal monochrome pairing"];
  if (d < 40) return [.85, "analogous colours that sit side by side on the wheel"];
  if (Math.abs(d - 180) < 25) return [.9, "complementary colours that make each other pop"];
  if (Math.abs(d - 120) < 20) return [.7, "a triadic colour mix"];
  return [.3, "colours that fight each other"];
}
function palette(hex, undertone) {
  const c = hsl(hex); if (neutral(c)) return .9;
  return (R.undertones[undertone] || R.undertones.neutral).hues.some(([a, b]) => c.h >= a && c.h <= b) ? 1 : .5;
}
function mood(hex, m) {
  const c = hsl(hex), n = neutral(c);
  const f = {
    cozy: () => c.s < .55 && (c.h < 70 || c.h > 330 || c.l < .5),
    bold: () => c.s > .6 && !n,
    romantic: () => ((c.h > 320 || c.h < 20) && c.l > .45) || (n && c.l > .8),
    professional: () => n || (c.h > 190 && c.h < 260 && c.s < .55),
    playful: () => c.s > .5 && c.l > .55,
    edgy: () => c.l < .25 || (n && c.l < .5)
  }[m];
  return f ? (f() ? 1 : .5) : .8;
}
function body(item, profile) {
  const s = R.shapes[profile.shape]; if (!s) return [.8, null];
  const cat = ["top", "bottom", "dress"].includes(item.category) ? item.category : null;
  if (!cat) return [.8, null];
  let v = .7, why = null;
  if ((s.prefer[cat] || []).includes(item.fit)) { v = 1; why = `the ${item.fit} ${cat} is made for a ${profile.shape} shape (${s.tip})`; }
  if ((s.avoid[cat] || []).includes(item.fit)) v = .35;
  if (profile.height && profile.height < 160 && item.fit === "highwaist") v = Math.min(1, v + .1);
  return [v, why];
}

export function scoreOutfits(items, profile = {}, ctx = {}, weather = null) {
  const by = c => items.filter(i => i.category === c);
  let combos = [...by("dress").map(d => [d]), ...by("top").flatMap(t => by("bottom").map(b => [t, b]))];
  const shoes = by("shoes"), layers = by("layer");
  combos = combos.flatMap(c => (shoes.length ? shoes : [null]).map(s => s ? [...c, s] : c));
  if (weather && weather.temp < 18 && layers.length) combos = combos.flatMap(c => layers.map(l => [...c, l]));
  const target = R.occasions[ctx.occasion] ?? 2;

  return combos.map(c => {
    const why = [], pairs = [];
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
      const [v, w] = colorPair(c[i].color, c[j].color); pairs.push(v);
      if (v >= .85 && why.length < 1) why.push(`${c[i].name} + ${c[j].name}: ${w}`);
    }
    const color = pairs.length ? avg(pairs) : .8;
    const pal = avg(c.map(i => palette(i.color, profile.undertone)));
    if (pal >= .9) why.push(`colours sit inside your ${(R.undertones[profile.undertone] || R.undertones.neutral).label}`);
    const md = avg(c.map(i => mood(i.color, ctx.mood)));
    if (md >= .9 && ctx.mood) why.push(`the palette reads ${ctx.mood}`);
    const fm = Math.max(0, 1 - Math.abs(avg(c.map(i => i.formality || 2)) - target) / 4);
    if (fm >= .85 && ctx.occasion) why.push(`formality suits a ${ctx.occasion}`);
    const bs = c.map(i => body(i, profile)), bd = avg(bs.map(x => x[0]));
    bs.forEach(x => x[1] && why.length < 5 && why.push(x[1]));
    let wx = 1;
    if (weather) {
      const need = weather.temp >= 28 ? 1 : weather.temp >= 18 ? 2 : 3;
      wx = Math.max(0, 1 - Math.abs(need - avg(c.map(i => R.fabricWarmth[i.fabric] || 2))) / 2);
      if (weather.rain && c.some(i => R.rainAvoid.includes(i.fabric))) wx *= .5;
      if (wx >= .85) why.push(`fabrics work for ${Math.round(weather.temp)}°C${weather.rain ? " and rain" : ""}`);
    }
    return { items: c, score: Math.round(100 * (.3 * color + .15 * pal + .15 * md + .15 * fm + .15 * bd + .1 * wx)), why };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
}

export function shopLinks({ occasion = "party", mood = "", budget = "", want = "outfit", color = "" }) {
  const q = [color, mood, occasion, want].filter(Boolean).join(" ") + (budget ? ` under ${budget}` : "");
  const dash = q.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/ +/g, "-"), e = encodeURIComponent(q);
  return { query: q, links: [
    { site: "Myntra", url: `https://www.myntra.com/${dash}` },
    { site: "Newme", url: `https://newme.asia/search?q=${e}` },
    { site: "Savana", url: `https://www.savana.com/search?q=${e}` },
    { site: "Google Shopping", url: `https://www.google.com/search?tbm=shop&q=${e}` }
  ] };
}
