# Skin AI

**Discover your personal colour palette with AI-powered skin tone analysis, get matched clothing recommendations, and try them on virtually.**

---

## Problem Statement

Choosing clothing colours that complement your skin tone is subjective and often frustrating. Most people rely on trial and error, generic seasonal colour guides, or sales assistants. There is no accessible, personalised tool that analyses your actual skin tone and recommends flattering garments you can preview on yourself before purchasing.

## Solution

Skin AI is a full-stack web application that uses computer vision to detect a user's facial colour tones from a selfie, classifies their undertone and depth using colour science, generates a personalised colour palette, ranks a garment catalogue by colour compatibility, and offers virtual try-on powered by AI.

The entire flow — from photo capture to virtual try-on — takes under a minute.

---

## Key Features

- **AI Skin Tone Analysis** — Upload a selfie to detect skin, eye, lip, eyebrow, and hair colours via the YouCam Facial Color Tones Analyzer API.
- **Undertone & Depth Classification** — CIELab colour space analysis determines warm/cool/neutral undertone and light/medium/deep depth.
- **Personalised Colour Palette** — 10 hero colours, 4 neutrals, and 4 care (caution) colours generated from 6 palette families.
- **Garment Colour Matching** — Catalogue items ranked by CIEDE2000 colour distance to the user's palette, scored as Great / Good / Okay.
- **Virtual Try-On** — Full-body photo + garment image processed through the YouCam AI Clothes Virtual Try-On API to generate a composite preview.
- **Sample Personas** — Three cached demo profiles (light, medium, deep) allow full exploration without uploading a photo or consuming API calls.
- **Budget & Rate Limiting** — Per-IP and global daily limits with lifetime unit tracking via Upstash Redis. Fail-closed design blocks live calls if the store is unreachable.
- **Privacy First** — Photos are used only for analysis. No images are stored permanently or shared with third parties beyond the API call.

---

## User Journey

1. **Capture** — Take or upload a selfie.
2. **Analyse** — AI detects your facial colour tones and classifies your undertone, depth, and palette family.
3. **Profile** — Review your detected colours, undertone, and depth. Adjust eye/hair colour if the detection was off.
4. **Palette** — Explore your personalised hero colours, neutrals, and care colours with explanations.
5. **Shop** — Browse the garment catalogue ranked by colour match. Items with virtual try-on available are badged.
6. **Try On** — Upload a full-body photo and preview a garment on yourself.
7. **Share** — View a summary of your colour profile.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, Framer Motion, React Router 7 |
| Backend | Python, FastAPI, Uvicorn |
| Colour Science | CIELab colour space (via `colorspacious`), CIEDE2000 perceptual distance |
| AI APIs | YouCam AI Facial Color Tones Analyzer, YouCam AI Clothes Virtual Try-On (cloth-v3) |
| Budget Store | Upstash Redis (REST API) |
| Image Processing | Pillow (catalogue thumbnail/tryon image generation) |
| Hosting | Vercel (frontend), Render (backend) |

---

## Architecture

```
Browser (React SPA)
  │
  ├── /api/analyze    POST   → YouCam Tone Analysis → Colour Engine → Palette + Catalog
  ├── /api/catalog    GET    → Scored garment list for a palette family
  ├── /api/tryon      POST   → YouCam cloth-v3 Virtual Try-On → Result image
  ├── /api/demo/:id   GET    → Cached persona fixture (no API call)
  ├── /api/results/:f GET    → Serve try-on result images
  ├── /api/recompute  POST   → Re-run engine with corrected colours
  ├── /api/health     GET    → Health check + budget counters
  └── /images/garments/**    → Static garment thumbnails and tryon images
```

### YouCam API Integrations

**Facial Color Tones Analyzer** (`skin-tone-analysis`)
- Accepts a face photo via the YouCam File API (presigned URL upload).
- Returns detected hex colours for skin, eyes, lips, eyebrows, and hair.
- These raw hex values are fed into the colour engine for classification.

**AI Clothes Virtual Try-On** (`cloth-v3`)
- Accepts a full-body user photo and a garment image, both uploaded via the File API.
- Creates an asynchronous task, polled every 2 seconds until completion.
- Returns a URL to the composite result image showing the garment on the user.

Both APIs use the same flow: register file → upload to presigned URL → create task → poll for result.

---

## Colour Matching Engine

The engine classifies a user's skin tone and generates recommendations without any machine learning — it uses deterministic colour science:

1. **Hex → CIELab** — Skin colour hex is converted to CIELab colour space via `colorspacious`.
2. **Undertone** — The hue angle from the `a*` and `b*` channels determines warm (high angle), cool (low angle), or neutral (middle band). Neutral is further classified as leaning warm, leaning cool, or balanced.
3. **Depth** — The `L*` (lightness) channel determines light, medium, or deep.
4. **Palette Family** — Undertone + depth map to one of 6 families: `warm-light`, `warm-deep`, `cool-light`, `cool-deep`, `neutral-soft`, `neutral-rich`. Medium depth uses a lightness split to assign to the light or deep variant.
5. **Garment Matching** — Each garment's dominant colour is compared against the user's hero + neutral palette colours using CIEDE2000 perceptual colour distance. The minimum distance determines the match score (0–100) and band (Great / Good / Okay / Hidden). A garment closer to a care colour than any positive colour is downgraded.

All thresholds are configurable in `backend/app/engine_config.py`.

---

## Sample Personas & Demo Mode

Three pre-computed personas allow full app exploration without API calls:

| Persona | Skin Hex | Depth | Undertone | Family |
|---------|----------|-------|-----------|--------|
| Sophia (light) | `#F0C8A8` | Light | Warm | warm-light |
| Priya (medium) | `#AC8A77` | Medium | Neutral, balanced | neutral-soft |
| Amara (deep) | `#6B4226` | Deep | Neutral, leaning warm | neutral-rich |

These are stored as JSON fixtures in `backend/data/fixtures/` and include a full profile, palette, and scored catalogue. The "Try Sample" button on the landing page loads the light persona. All personas are labelled as sample profiles.

---

## Local Installation

### Prerequisites

- Python 3.9+
- Node.js 18+
- A YouCam API key (for live analysis and try-on)
- An Upstash Redis instance (for budget tracking; without it, live calls are blocked but demo mode works)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Then edit .env with your values
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to `http://localhost:8000` by default.

---

## Environment Variables

### Backend (`backend/.env`)

```env
YOUCAM_API_KEY=your_youcam_api_key
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
CORS_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
TRUST_PROXY=false
```

Set `TRUST_PROXY=true` when deploying behind a reverse proxy (Render, Railway, etc.) so per-IP rate limits work correctly.

### Frontend

```env
VITE_API_URL=http://localhost:8000
```

For production, set `VITE_API_URL` to your deployed backend URL. This is a build-time variable — changes require a rebuild.

---

## Deployment

| Service | Platform | Root Directory | Build Command | Start Command |
|---------|----------|---------------|---------------|---------------|
| Backend | Render | `backend` | `pip install -r requirements.txt` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Frontend | Vercel | `frontend` | `npm run build` | — (static) |

---

## Limitations & Honest Notes

- **Colour detection is an estimate.** YouCam's detected hex values depend on lighting, camera quality, and angle. The engine classifies based on these estimates — results may not match professional colour analysis.
- **Sample profiles are illustrative.** The three demo personas use hardcoded colours, not real API results. They demonstrate the flow and palette logic.
- **Small catalogue.** The garment catalogue contains 9 items with real images. Some palette families may have fewer than 3 "Great" matches due to limited colour diversity.
- **Ephemeral try-on results.** On Render's free tier, try-on result images written at runtime are lost on redeploy. Pre-cached demo results persist because they are committed to the repository.
- **Budget system is fail-closed.** If Upstash Redis is not configured or unreachable, all live API calls are blocked. Demo mode continues to work.
- **No purchase functionality.** Prices shown in the catalogue are illustrative. Nothing can be purchased.
- **Mobile camera support varies.** Camera capture depends on browser `getUserMedia` support, which varies across mobile browsers.

---

## License

This project was built for a hackathon demonstration.
