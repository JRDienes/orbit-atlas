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
 
### Performance
- [ ] Switch to full 27,000+ object rendering (debris included)
- [ ] Debris layer as separate toggle — dimmer, smaller points
- [ ] Level of detail (LOD) — fewer points when zoomed out
### Orbital Mechanics
- [ ] Real TLE-based positioning using satellite.js
- [ ] Real-time orbital propagation (update positions every 30s)
- [ ] Orbit ring visualization on satellite click
- [ ] Category orbit rings — click SpaceX to see all Starlink orbits
### UI / UX
- [ ] Click satellite → detail panel (name, type, country, orbit stats)
- [ ] Search bar to find a specific satellite by name or NORAD ID
- [ ] Satellite count breakdown per organization in sidebar
- [ ] Animated satellite movement along orbital paths
- [ ] Mobile touch support (pinch to zoom, drag to rotate)
### Data & Backend
- [ ] Enable Supabase Row Level Security (RLS) before public launch
- [ ] Add debris to database with separate rendering pipeline
- [ ] Historical launch date timeline slider
- [ ] Filter by object type (payload, rocket body, debris)
- [ ] Link second PostgreSQL database for user data / saved views
### Polish
- [ ] Custom domain
- [ ] Loading screen with progress bar
- [ ] About panel explaining the data source
- [ ] Share a specific satellite view via URL
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
 
## 📊 Data Source
 
All orbital data sourced from **[Space-Track.org](https://www.space-track.org)**, operated by the U.S. Space Force 18th Space Defense Squadron. Data is updated weekly and includes General Perturbations (GP) element sets for all tracked objects in Earth orbit.
 
---
 
## 👤 Author
 
**Jackson Dienes**