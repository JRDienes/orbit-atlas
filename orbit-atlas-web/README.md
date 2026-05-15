# 🛰️ Orbit Atlas

> A real-time 3D space object tracking system built with React, Three.js, and a live Space Force data pipeline.

![Orbit Atlas](https://img.shields.io/badge/status-in%20development-00d4ff?style=flat-square&labelColor=020818)
![React](https://img.shields.io/badge/React-19-00d4ff?style=flat-square&labelColor=020818)
![Three.js](https://img.shields.io/badge/Three.js-r128-00ff88?style=flat-square&labelColor=020818)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-00d4ff?style=flat-square&labelColor=020818)

---

## 🌍 Live Demo

**[orbit-atlas.vercel.app](https://orbit-atlas.vercel.app)**

---

## 📡 What It Does

Orbit Atlas visualizes every tracked object in Earth's orbit on an interactive 3D globe. Data is pulled from the U.S. Space Force's Space-Track API, stored in PostgreSQL, and rendered in WebGL using Three.js. Satellites are grouped into 14 operator categories with individual Keplerian orbit traces, real-time ISS tracking, and country-level filtering.

- **27,000+ tracked objects** — active satellites, rocket bodies, and debris
- **14 operator categories** with country-representative colors
- **Per-satellite Keplerian orbit traces** shown when a category is toggled on
- **Live ISS tracker** — real-time position, 90s fading trail, full future orbit path
- **Country code drill-down** — filter to specific nations within any category
- **High-tech military aesthetic** — dark theme, electric blue and green accents
- **Auto-refreshing pipeline** — data updates weekly via GitHub Actions

---

## 🏗️ Architecture

```
Space-Track.org API (U.S. Space Force)
          ↓
   Python ETL Pipeline (fetch.py)
          ↓
   Supabase (PostgreSQL) — 31,000+ objects
          ↓
   React + Three.js Frontend
          ↓
   Vercel (Auto-deploy from GitHub)
```

---

## ✅ Completed

### Backend / Data Pipeline
- [x] Authenticated Space-Track.org API integration
- [x] Python ETL script to fetch, parse, and categorize all orbital objects
- [x] Supabase PostgreSQL database with 31,000+ tracked objects
- [x] Paginated data loading to bypass Supabase row limits
- [x] Upsert logic to prevent duplicate records on refresh
- [x] Weekly automated pipeline via GitHub Actions (every Monday)
- [x] Secure credential management via `.env` and GitHub Secrets

### Frontend / Globe
- [x] Interactive 3D globe with Earth texture (NASA dark map)
- [x] Military/HUD aesthetic — dark background, blue/green accents
- [x] Drag to rotate, scroll to zoom; pinch-to-zoom and drag-to-rotate on mobile
- [x] Atmosphere glow, wireframe grid overlay
- [x] Points geometry rendering (21,000+ satellites, single draw call)
- [x] Logarithmic altitude scale — LEO / MEO / GEO visually distinct
- [x] Animated loading screen with fade-out once data is ready
- [x] Globe reveals instantly — satellites fade in after worker completes
- [x] Welcome message shown between loading screen and satellite reveal
- [x] Dynamic object count in header based on active filters
- [x] Smooth satellite occlusion behind Earth
- [x] Vercel deployment with auto-deploy on push
- [x] Vercel Web Analytics
- [x] Vercel Speed Insights

### Satellite Categories & Filtering
- [x] 15 operator categories with country-representative colors (SpaceX/Starlink, Amazon Kuiper, AST SpaceMobile, US, UK, Europe/ESA, Russia, China, Japan, India, Middle East, Asia Pacific, Rest of World, Debris, Rocket Bodies)
- [x] Name-based detection for Starlink, Kuiper, and AST SpaceMobile (BLUEBIRD/SPACEMOBILE) constellations
- [x] Left sidebar toggle filters — active/dimmed states
- [x] Country code key panel — always visible, shows codes per active category
- [x] Click any country code chip to filter to that nation's satellites only
- [x] Multi-select country codes across different categories simultaneously
- [x] Per-category code filtering — selecting FR from Europe doesn't affect US visibility
- [x] Reset code filter button in key panel, reset all button in filter sidebar

### Orbit Visualization
- [x] Individual Keplerian orbit ellipses per satellite (one draw call per category)
- [x] Inclination + RAAN rotation for realistic polar / equatorial / inclined orbits
- [x] Orbits parented to Earth mesh — rotate correctly with globe drag
- [x] Orbit opacity scales with category density
- [x] Orbit traces filtered by selected country code chips

### Satellite Interaction
- [x] Hover snap — highlights nearest satellite on mousemove
- [x] Click to select — detail panel with name, type, country, and orbit stats
- [x] Drag vs click disambiguation (no accidental selections while rotating)

### ISS Live Tracker
- [x] Real-time ISS position via wheretheiss.at API (updates every 5 seconds)
- [x] Pulsing gold marker with animated size in render loop
- [x] 90-second fading past trail with vertex color fade
- [x] Full future orbit path via SGP4 propagation (~92 min ahead)
- [x] Dedicated always-visible panel: altitude, velocity, lat/lon, daylight/eclipse status

---

## 🚧 Roadmap

### Performance
- **Target: 90 Real Experience Score on Vercel Speed Insights** (currently 70)
- [x] Real TLE-based positioning using satellite.js — one-time SGP4 propagation at page load
- [x] Animated satellite movement along orbital paths — Keplerian theta propagation, chunked per-frame updates
- [x] Simulation speed slider — PAUSE, 1×, 60×, 600×, 3600× presets
- [x] Earth texture served locally — eliminates external CDN dependency
- [x] WebGL pixel ratio capped at 2× — reduces GPU load on high-DPR devices
- [x] Web Worker for SGP4 propagation — main thread unblocked during satellite load
- [x] Parallel Supabase page fetches via Promise.all — all pages in-flight simultaneously
- [ ] Real-time orbital propagation — update all dot positions every 30s via full SGP4
- [ ] Full 27,000+ object rendering with debris toggle
- [ ] Level of detail (LOD) — fewer points when zoomed out

### UI / UX
- [x] Mobile responsive layout — bottom tab bar (FILTER / CODES / OBJECT / ISS / SPEED), bottom sheet panels, touch controls
- [x] Tap to select satellite on mobile, badge indicators on active tabs
- [ ] Search bar to find a satellite by name or NORAD ID

### ISS Enhancements
- [ ] Crew manifest panel — current astronauts aboard
- [ ] Pass prediction — when will ISS fly over your location

### Data & Backend
- [ ] Enable Supabase Row Level Security (RLS)
- [ ] User accounts — save favourite satellites and custom filters
- [ ] Launch schedule feed with countdown timers

### Polish
- [ ] Custom domain
- [ ] About panel explaining the data source
- [ ] Share a specific satellite view via URL

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Three.js |
| Orbital Math | satellite.js 4.x (SGP4/SDP4 TLE propagation) |
| Database | Supabase (PostgreSQL) |
| Data Pipeline | Python 3.11, requests, python-dotenv |
| Scheduling | GitHub Actions (weekly cron) |
| Deployment | Vercel |
| Analytics | Vercel Web Analytics, Vercel Speed Insights |
| Data Source | Space-Track.org (U.S. Space Force) |

---

## 🚀 Running Locally

### Prerequisites
- Python 3.11+
- Node.js 22+
- Conda or venv
- Space-Track.org account (free)
- Supabase project (free)

### Backend (Data Pipeline)

```bash
conda create -n space-tracker python=3.11
conda activate space-tracker
pip install requests python-dotenv supabase
cp .env.example .env
python fetch.py
```

### Frontend

```bash
cd orbit-atlas-web
npm install
echo "REACT_APP_SUPABASE_URL=your_url" > .env
echo "REACT_APP_SUPABASE_KEY=your_key" >> .env
npm start
```

---

## 📊 Data Sources

| Source | Data | Update Frequency |
|---|---|---|
| Space-Track.org (U.S. Space Force) | All tracked orbital objects, TLE data | Weekly |
| wheretheiss.at | ISS real-time position | Every 5 seconds |

---

## 👤 Author

**Jackson Dienes**
