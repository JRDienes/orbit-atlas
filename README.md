# 🛰️ Orbit Atlas

> A real-time 3D space object tracking and visualization system built with React, Three.js, and a live Space Force data pipeline.

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
- [x] Supabase PostgreSQL database with 31,142 tracked objects
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
- [x] Dynamic object count in header based on active filters
- [x] Smooth satellite occlusion behind Earth
- [x] Vercel deployment with auto-deploy on push
- [x] Vercel Web Analytics

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
- [x] Ground track projection — shows where ISS is heading
- [x] Dedicated always-visible panel: altitude, velocity, lat/lon, daylight/eclipse status

---

## 🚧 Roadmap

### 🌐 Globe & Visualization
- [x] Real TLE-based positioning using satellite.js — one-time SGP4 propagation at page load
- [x] Animated satellite movement along orbital paths — Keplerian theta propagation, chunked per-frame updates
- [x] Simulation speed slider — PAUSE, 1×, 60×, 600×, 3600× presets with Earth rotation locked to same timescale
- [ ] Real-time orbital propagation (update positions every 30s via full SGP4)
- [ ] Level of detail (LOD) — fewer points when zoomed out
- [ ] Full 27,000+ object rendering including debris

### 🛰️ Satellite Detail & Interaction
- [x] Mobile responsive layout — bottom tab bar (FILTER / CODES / OBJECT / ISS / SPEED), bottom sheet panels, touch controls
- [ ] Search bar to find satellite by name or NORAD ID

### 🔭 Space Telescopes
- [ ] Highlight space telescopes as a dedicated category (Hubble, James Webb, Chandra, Spitzer, Kepler, TESS, Roman)
- [ ] Telescope detail panel — mission info, launch date, orbit type, imagery
- [ ] Animated orbit rings for telescope orbits (JWST is at L2, unique path)
- [ ] Show field of view cone for active telescopes like JWST

### 🚀 Launch Trajectories
- [ ] Click a satellite → animated launch trajectory from launch site to orbit
- [ ] Accurate Falcon 9 ascent profile for Starlink launches
- [ ] Historic mission trajectories — Apollo, Artemis, Voyager, New Horizons
- [ ] Starlink batch deploy animation — fairing separation, stack release
- [ ] Launch site markers on globe (Kennedy, Vandenberg, Baikonur, etc.)

### ⏳ Time Machine
- [ ] Year selector dropdown (1957 — present)
- [ ] Globe shows only satellites active in selected year
- [ ] Animated timelapse — watch orbital shell fill up year by year
- [ ] Sputnik 1957 → Starlink era dramatic growth visualization
- [ ] Launch history bar chart by year in sidebar

### 🌍 ISS Enhancements
- [ ] Crew manifest panel — current astronauts aboard
- [ ] ISS live video feed embed
- [ ] Pass prediction — when will ISS fly over your location

### ⚠️ Conjunction & Reentry Alerts
- [ ] Near-miss/conjunction alerts from Space-Track CDM feed
- [ ] Highlighted close approach pairs on globe
- [ ] Alert panel with distance, time, probability
- [ ] Decay/reentry predictions with countdown timers
- [ ] Reentry risk map — show predicted impact zones

### 🛸 Constellation Trackers
- [ ] AST SpaceMobile constellation tracker
- [ ] OneWeb constellation
- [ ] Watch each constellation grow in real time as launches occur
- [ ] Constellation coverage map — show ground coverage footprint

### 🪐 Solar System Mode
- [ ] Expand view beyond Earth orbit to show full solar system
- [ ] Planets rendered to scale with accurate orbital positions
- [ ] Active deep space probes (Voyager 1 & 2, New Horizons, Parker Solar Probe)
- [ ] Asteroid belt visualization
- [ ] Switch between Earth orbit mode and solar system mode
- [ ] Mars missions — show active orbiters (MAVEN, MRO, Hope, Tianwen)

### 📊 Data & Backend
- [ ] Enable Supabase Row Level Security (RLS) before public launch
- [ ] Second PostgreSQL database for user data and saved views
- [ ] User accounts — save favorite satellites, custom filters
- [ ] Satellite alerts — notify when a specific satellite passes overhead
- [ ] NASA APIs integration — mission data, crew info, imagery
- [ ] N2YO API — pass predictions over user location
- [ ] Launch schedule feed — upcoming launches with countdown timers

### ✨ Polish
- [ ] Custom domain
- [ ] About panel explaining the data source and methodology
- [ ] Share a specific satellite view via URL
- [ ] Embed mode — shareable iframe for specific satellites
- [ ] Dark/light mode toggle (light = daytime Earth texture)

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
| Analytics | Vercel Web Analytics |
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
# Create and activate conda environment
conda create -n space-tracker python=3.11
conda activate space-tracker

# Install dependencies
pip install requests python-dotenv supabase

# Create .env file
cp .env.example .env
# Add your Space-Track and Supabase credentials

# Run pipeline
python fetch.py
```

### Frontend

```bash
cd orbit-atlas-web

# Install dependencies
npm install

# Create .env file
echo "REACT_APP_SUPABASE_URL=your_url" > .env
echo "REACT_APP_SUPABASE_KEY=your_key" >> .env

# Start dev server
npm start
```

---

## 📊 Data Sources

| Source | Data | Update Frequency |
|---|---|---|
| Space-Track.org (U.S. Space Force) | All tracked orbital objects, TLE data, conjunction data | Weekly |
| wheretheiss.at | ISS real-time position | Every 5 seconds |
| NASA APIs | Mission data, crew info, imagery | On demand |
| N2YO API | Real-time positions, pass predictions | Real-time |

---

## 👤 Author

**Jackson Dienes**
