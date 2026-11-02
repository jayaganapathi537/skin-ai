from pydantic import BaseModel
from typing import Optional


class DetectedColors(BaseModel):
    skin_hex: str
    eye_hex: str
    eye_color_name: str
    lip_hex: str
    eyebrow_hex: str
    hair_hex: str
    hair_color_name: str


class PaletteColor(BaseModel):
    hex: str
    name: str
    reason: Optional[str] = None


class Palette(BaseModel):
    family: str
    heroes: list[PaletteColor]
    neutrals: list[PaletteColor]
    care_colors: list[PaletteColor]


class Profile(BaseModel):
    depth: str
    undertone: str
    contrast: str
    confidence: float
    palette_family: str
    summary: str


class AnalysisResult(BaseModel):
    detected_colors: DetectedColors
    profile: Profile
    palette: Palette


class GarmentMatch(BaseModel):
    id: int
    name: str
    category: str
    dominant_hex: str
    image: str
    price: str
    tags: list[str]
    match_score: float
    match_band: str


class CatalogResponse(BaseModel):
    garments: list[GarmentMatch]


class TryOnStartResponse(BaseModel):
    task_id: str


class TryOnStatusResponse(BaseModel):
    status: str
    result_url: Optional[str] = None


class DemoResponse(BaseModel):
    persona: str
    analysis: AnalysisResult
    catalog: list[GarmentMatch]
    tryon_result_url: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    daily_tone_remaining: int
    daily_tryon_remaining: int
