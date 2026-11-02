import hashlib
import json
import os
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import httpx

from . import budget, cache, engine, engine_config as cfg, youcam
from .youcam import YouCamError

app = FastAPI(title="Skin AI", version="1.0.0")

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^(http://localhost:\d+|https://.*\.vercel\.app)$",
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_UPLOAD = 10 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/jpg"}

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
FIXTURES_DIR = os.path.join(DATA_DIR, "fixtures")
RESULTS_DIR = os.path.join(DATA_DIR, "results")
GARMENTS_DIR = os.path.join(DATA_DIR, "garments")
os.makedirs(RESULTS_DIR, exist_ok=True)
os.makedirs(GARMENTS_DIR, exist_ok=True)


BUDGET_MESSAGES = {
    "personal": "You've used your daily analyses. Explore our sample personas instead!",
    "global": "We've hit today's usage cap. Explore our sample personas while we recharge!",
    "daily_units": "API budget is running low. Explore our sample personas while we recharge!",
    "lifetime": "API budget is running low. Explore our sample personas while we recharge!",
    "store_down": "Service temporarily unavailable. Explore our sample personas instead!",
}


def _client_ip(request: Request) -> str:
    if cfg.TRUST_PROXY:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_budget(ip: str, kind: str):
    result = budget.check(ip, kind)
    if not result["allowed"]:
        msg = BUDGET_MESSAGES.get(result["reason"], BUDGET_MESSAGES["store_down"])
        raise HTTPException(
            status_code=429,
            detail={
                "message": msg,
                "reason": result["reason"],
                "allowance_exceeded": True,
            },
        )


@app.post("/api/analyze")
async def analyze(request: Request, image: UploadFile = File(...)):
    ip = _client_ip(request)
    _check_budget(ip, "tone")

    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG and PNG images are accepted.")

    image_bytes = await image.read()
    if len(image_bytes) > MAX_UPLOAD:
        raise HTTPException(status_code=400, detail="Image must be under 10 MB.")

    image_hash = hashlib.sha256(image_bytes).hexdigest()

    cached = await cache.get(image_hash)
    if cached:
        return JSONResponse(content=cached)

    try:
        youcam_result = await youcam.analyze_tone(image_bytes, image.content_type or "image/jpeg")
    except YouCamError as e:
        status = 502 if e.code.startswith("http_") else 422
        detail = f"{e.step}: {e.message}" if e.step else e.message
        raise HTTPException(status_code=status, detail=detail)
    except (httpx.ConnectError, httpx.TimeoutException):
        raise HTTPException(status_code=502, detail="Could not reach YouCam API. Please try again later.")

    try:
        print(f"[Engine] input: {youcam_result}")
        result = engine.analyze(youcam_result)
        print(f"[Engine] success")
    except Exception as e:
        print(f"[Engine Error] {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Colour analysis failed. Please try a different photo.")

    catalog_path = os.path.join(DATA_DIR, "catalog.json")
    with open(catalog_path, "r") as f:
        garments = json.load(f)

    palette = result.get("palette", {})
    scored = []
    for g in garments:
        match = engine.match_garment(g["dominant_hex"], palette)
        scored.append({**g, "match_score": match["score"], "match_band": match["band"]})
    scored.sort(key=lambda x: x["match_score"], reverse=True)
    result["catalog"] = scored

    await cache.set(image_hash, result)
    budget.increment(ip, "tone")

    return JSONResponse(content=result)


@app.get("/api/catalog")
async def catalog(palette_family: str = "neutral-soft"):
    catalog_path = os.path.join(DATA_DIR, "catalog.json")
    with open(catalog_path, "r") as f:
        garments = json.load(f)

    palettes_path = os.path.join(DATA_DIR, "palettes.json")
    with open(palettes_path, "r") as f:
        palettes = json.load(f)

    family_data = palettes.get(palette_family, palettes.get("neutral-soft", {}))
    palette = {
        "hero_colors": family_data.get("heroes", []),
        "neutral_colors": family_data.get("neutrals", []),
    }

    scored = []
    for g in garments:
        match = engine.match_garment(g["dominant_hex"], palette)
        scored.append({**g, "match_score": match["score"], "match_band": match["band"]})

    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return JSONResponse(content={"garments": scored})


@app.post("/api/tryon")
async def tryon(
    request: Request,
    user_photo: UploadFile = File(...),
    garment_image_url: str = Form(...),
):
    ip = _client_ip(request)
    _check_budget(ip, "tryon")

    if user_photo.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG and PNG images are accepted.")

    photo_bytes = await user_photo.read()
    if len(photo_bytes) > MAX_UPLOAD:
        raise HTTPException(status_code=400, detail="Image must be under 10 MB.")

    if garment_image_url.startswith("/images/garments/"):
        rel = garment_image_url.replace("/images/garments/", "", 1)
        safe = os.path.normpath(rel)
        if safe.startswith("..") or os.path.isabs(safe):
            raise HTTPException(status_code=400, detail="Invalid garment path.")
        local_path = os.path.join(GARMENTS_DIR, safe)
        if not os.path.isfile(local_path):
            raise HTTPException(status_code=400, detail="Garment image not found.")
        with open(local_path, "rb") as f:
            garment_bytes = f.read()
        garment_ct = "image/png" if local_path.endswith(".png") else "image/jpeg"
    else:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                garment_resp = await client.get(garment_image_url)
                garment_resp.raise_for_status()
            garment_bytes = garment_resp.content
            garment_ct = garment_resp.headers.get("content-type", "image/jpeg")
        except Exception:
            raise HTTPException(status_code=400, detail="Could not fetch garment image.")

    try:
        result_url = await youcam.run_tryon(
            photo_bytes, garment_bytes,
            user_photo.content_type or "image/jpeg", garment_ct,
        )
    except YouCamError as e:
        status = 502 if e.code.startswith("http_") else 422
        detail = f"{e.step}: {e.message}" if e.step else e.message
        raise HTTPException(status_code=status, detail=detail)
    except (httpx.ConnectError, httpx.TimeoutException):
        raise HTTPException(status_code=502, detail="Could not reach YouCam API. Please try again later.")

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            dl = await client.get(result_url)
            dl.raise_for_status()
        ext = "png" if "png" in dl.headers.get("content-type", "") else "jpg"
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(RESULTS_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(dl.content)
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to download result image from YouCam.")

    budget.increment(ip, "tryon")
    return JSONResponse(content={
        "status": "completed",
        "result_url": f"/api/results/{filename}",
    })


@app.get("/api/results/{filename}")
async def get_result(filename: str):
    safe = os.path.basename(filename)
    filepath = os.path.join(RESULTS_DIR, safe)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Result not found.")
    media = "image/png" if safe.endswith(".png") else "image/jpeg"
    return FileResponse(filepath, media_type=media)


@app.get("/api/demo/{persona}")
async def demo(persona: str):
    valid = ("light", "medium", "deep")
    if persona not in valid:
        raise HTTPException(status_code=404, detail=f"Unknown persona. Choose from: {', '.join(valid)}")

    fixture_path = os.path.join(FIXTURES_DIR, f"{persona}.json")
    if not os.path.exists(fixture_path):
        raise HTTPException(status_code=404, detail="Demo data not found.")

    with open(fixture_path, "r") as f:
        data = json.load(f)

    catalog_path = os.path.join(DATA_DIR, "catalog.json")
    with open(catalog_path, "r") as f:
        garments = json.load(f)

    palette = data.get("palette", {})
    scored = []
    for g in garments:
        match = engine.match_garment(g["dominant_hex"], palette)
        scored.append({**g, "match_score": match["score"], "match_band": match["band"]})
    scored.sort(key=lambda x: x["match_score"], reverse=True)

    return JSONResponse(
        content={
            "persona": persona,
            "analysis": {
                "profile": data["profile"],
                "palette": data["palette"],
            },
            "catalog": scored,
            "tryon_result_url": data.get("tryon_result_url"),
        }
    )


@app.post("/api/recompute")
async def recompute(request: Request):
    body = await request.json()
    youcam_input = {
        "skin_color": body.get("skin_color", ""),
        "eye_color": body.get("eye_color", ""),
        "eye_color_name": body.get("eye_color_name", "Brown"),
        "lip_color": body.get("lip_color", ""),
        "eyebrow_color": body.get("eyebrow_color", ""),
        "hair_color": body.get("hair_color", ""),
        "hair_color_name": body.get("hair_color_name", ""),
    }
    try:
        result = engine.analyze(youcam_input)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Recompute failed.")
    return JSONResponse(content=result)


@app.get("/api/health")
async def health(request: Request):
    ip = _client_ip(request)
    return JSONResponse(content={"status": "ok", **budget.status(ip)})


app.mount("/images/garments", StaticFiles(directory=GARMENTS_DIR), name="garment-images")
