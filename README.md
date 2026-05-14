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
 
Orbit Atlas visualizes every tracked object in Earth's orbit in real time on an interactive 3D globe. Data is pulled directly from the U.S. Space Force's Space-Track API, stored in a PostgreSQL database, and rendered using Three.js with color-coded filtering by organization.
 
- **27,000+ tracked objects** including active satellites, rocket bodies, and debris
- **Filter by organization** — SpaceX/Starlink, DOD/Military, Russia, China, UK, and others
- **Dynamic object count** updates based on active filters
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
- [x] Drag to rotate, scroll to zoom
- [x] Star field background
- [x] Atmosphere glow effect
- [x] Wireframe grid overlay
- [x] Points geometry rendering (21,000+ satellites, performant)
- [x] Color-coded satellites by organization
- [x] Left sidebar with toggle filters per organization
- [x] Active/dimmed state when filters selected
- [x] Dynamic object count in header based on active filters
- [x] Smooth satellite occlusion behind Earth
- [x] Vercel deployment with auto-deploy on push
- [x] Vercel Web Analytics
---
 
## 🚧 Roadmap
 
### 🌐 Globe & Visualization
- [ ] Real TLE-based positioning using satellite.js
- [ ] Real-time orbital propagation (update positions every 30s)
- [x] Orbit ring visualization on satellite click
- [x] Category orbit rings — click SpaceX to see all Starlink orbits
- [x] Debris layer as separate toggle — dimmer, smaller points
- [ ] Level of detail (LOD) — fewer points when zoomed out
- [ ] Full 27,000+ object rendering including debris
### 🛰️ Satellite Detail & Interaction
- [x] Click satellite → slide-in detail panel (name, type, country, orbit stats)
- [ ] Search bar to find satellite by name or NORAD ID
- [ ] Animated satellite movement along orbital paths
- [ ] Mobile touch support (pinch to zoom, drag to rotate)
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
### 🌍 ISS Live Tracker
- [ ] Real-time ISS position updating every 5 seconds
- [ ] Unique ISS icon on globe
- [ ] Crew manifest panel — current astronauts aboard
- [ ] ISS live video feed embed
- [ ] Ground track projection — show where ISS is heading
- [ ] Pass prediction — when will ISS fly over your location
### ⚠️ Conjunction & Reentry Alerts
- [ ] Near-miss/conjunction alerts from Space-Track CDM feed
- [ ] Highlighted close approach pairs on globe
- [ ] Alert panel with distance, time, probability
- [ ] Decay/reentry predictions with countdown timers
- [ ] Reentry risk map — show predicted impact zones
### 🛸 Constellation Trackers
- [x] Amazon Kuiper constellation — live growth tracker
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
- [ ] Loading screen with animated progress bar
- [ ] About panel explaining the data source and methodology
- [ ] Share a specific satellite view via URL
- [ ] Embed mode — shareable iframe for specific satellites
- [ ] Dark/light mode toggle (light = daytime Earth texture)
---
 
## 🛠️ Tech Stack
 
| Layer | Technology |
|---|---|
| Frontend | React 19, Three.js |
| Orbital Math | satellite.js (TLE propagation) |
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
| NASA APIs | Mission data, crew info, imagery | On demand |
| N2YO API | Real-time positions, pass predictions | Real-time |
 
---
 
## 👤 Author
 
**Jackson Dienes**
