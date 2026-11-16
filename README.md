# Clueless – AI-Assisted Personal Styling & Virtual Wardrobe

Inspired by Cher's closet computer. Upload your wardrobe, set your profile, pick an occasion/mood/budget – Clueless scores outfits using colour theory, seasonal palettes, body-shape rules, formality and live weather, explains *why*, and builds "shop the look" links for Myntra, Newme and Savana.

## Run locally (Node 18+)
```bash
cd backend  && npm install && npm start      # http://localhost:5000
cd frontend && npm install && npm run dev    # http://localhost:5173 (proxies /api)
```
Production: `cd frontend && npm run build`, then `npm start` in backend serves everything on :5000.

## Accounts & permanent closet (SQLite)
Sign up once; your closet, profile and stylist preferences are saved in a SQLite database on the server (`backend/data/clueless.db`) and load automatically on any device after you log in. Passwords are hashed (scrypt); sessions are signed tokens valid 30 days.

Env vars: `JWT_SECRET` (**set a long random string in production**), `DB_PATH` (where the .db file lives, e.g. `/var/data/clueless.db`), `PORT`.

### Using it from any device = host it online
`localhost` only works on your own computer. Deploy the repo as one web service (e.g. Render / Railway / Fly.io):
- Build: `cd frontend && npm install && npm run build && cd ../backend && npm install`
- Start: `cd backend && npm start`
- Attach a **persistent disk** and point `DB_PATH` to it. Free tiers with temporary disks erase SQLite on restart – use a disk, or swap SQLite for a hosted DB (Postgres/Turso) if you stay on free tier.

## Optional env (backend/.env style, export in shell)
- `GEMINI_API_KEY` – turns rule-engine reasons into friendlier prose (free tier). Works without it.
- `GOOGLE_CSE_KEY` + `GOOGLE_CSE_CX` – live site-restricted product results. Without them you get smart deep-links.
Weather uses Open-Meteo (no key).

## Structure
- `backend/engine.js` – colour theory, palettes, body-shape, mood, formality, weather scoring
- `backend/data/rules.json` – editable styling knowledge base
- `backend/server.js` – REST API: `/api/weather`, `/api/outfits`, `/api/shop`
- `frontend/` – React (Vite) vintage-editorial UI; login screen, colour auto-detected from photos, all data synced to the backend DB

## Push to GitHub
```bash
git init && git add . && git commit -m "Clueless" && git branch -M main
git remote add origin <your-repo-url> && git push -u origin main
```
Team: Achira Shukla (992401040101), Siya Srivastava (992401040083) · Android & iOS Lab · F-18 / G-04
