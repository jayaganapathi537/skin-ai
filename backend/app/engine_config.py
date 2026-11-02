import os

# Skin AI colour engine — tunable parameters.
# Every number here is a starting value. Calibrate on real photos
# by running: python scripts/calibrate.py

# --- A. UNDERTONE ---

# Hue-angle boundaries (degrees, from skin Lab a*/b*).
# Cool if hue < COOL_BOUNDARY, Warm if hue > WARM_BOUNDARY, else Neutral.
COOL_BOUNDARY = 50
WARM_BOUNDARY = 60

# Lean thresholds inside the Neutral band.
# "leaning warm" if hue >= LEAN_WARM, "leaning cool" if hue <= LEAN_COOL.
LEAN_WARM = 57
LEAN_COOL = 53

# Spectrum position formula: clamp((hue - SPECTRUM_OFFSET) / SPECTRUM_RANGE, 0, 1)
# 0 = coolest, 1 = warmest.
SPECTRUM_OFFSET = 40
SPECTRUM_RANGE = 35

# Lip and hair adjustment weights. Default 0 (disabled). Set > 0 to enable.
LIP_WEIGHT = 0      # applied to lip-hue warm/cool signal
HAIR_WEIGHT = 0      # applied to hair b* warm/cool signal

# --- B. DEPTH ---

# Skin L* thresholds.
LIGHT_MIN_L = 62     # L* >= this → light
MEDIUM_MIN_L = 45    # L* >= this and < LIGHT_MIN_L → medium; below → deep

# Medium-depth family split: use the light-side palette family if
# skin L* >= this, otherwise the deep-side family.
MEDIUM_LIGHT_SPLIT_L = 52

# --- B. CONTRAST ---

# Bands for abs(skin_L - mean(features_L)).
HIGH_CONTRAST = 40
MEDIUM_CONTRAST = 20

# --- C. PHOTO QUALITY checks ---

# Skin L* plausible range.
SKIN_L_MIN = 20
SKIN_L_MAX = 90

# Skin chroma (sqrt(a^2+b^2)) plausible range.
SKIN_CHROMA_MIN = 8
SKIN_CHROMA_MAX = 40

# Hair plausibility: flag if L* above this or hue outside this range.
HAIR_L_MAX = 90
HAIR_HUE_MIN = 30
HAIR_HUE_MAX = 90

# Eyes: flag if L* above this.
EYES_L_MAX = 75

# Deduction per failed check.
QUALITY_DEDUCTION = 0.2

# Retake threshold.
RETAKE_THRESHOLD = 0.6

# --- C. UNDERTONE CLARITY ---

# For Warm/Cool: clarity = min(1, distance_past_boundary / this value).
CLARITY_DIVISOR = 10

# --- D. GARMENT RANKING ---

# score = max(0, 100 - GARMENT_DELTA_E_MULTIPLIER * deltaE).
GARMENT_DELTA_E_MULTIPLIER = 5

# Band thresholds by deltaE (not score).
GREAT_MAX_DELTA_E = 6
GOOD_MAX_DELTA_E = 12
OKAY_MAX_DELTA_E = 20     # above this: hidden

# --- F. BUDGET & RATE LIMITS ---

# Per-IP daily limits.
PER_IP_TONE_LIMIT = 2
PER_IP_TRYON_LIMIT = 6

# Global daily limits (across all users).
GLOBAL_TONE_LIMIT = 10
GLOBAL_TRYON_LIMIT = 100

# YouCam API unit costs per call.
UNITS_PER_TONE = 20
UNITS_PER_TRYON = 2

# Daily unit floor: stop live calls when daily remaining < this.
DAILY_UNIT_FLOOR = 100

# Lifetime unit budget. Set REMAINING_UNITS_AT_DEPLOY to the number shown
# on your YouCam dashboard at deploy time. The store tracks how many have
# been consumed since deploy; when (REMAINING_UNITS_AT_DEPLOY - consumed)
# <= RESERVE_UNITS, all live calls are blocked.
REMAINING_UNITS_AT_DEPLOY = 1000   # ← replace with your real dashboard number
RESERVE_UNITS = 100

# Trust X-Forwarded-For header for client IP? Enable when behind a reverse
# proxy (Vercel, Render, Railway). Disable in local dev.
TRUST_PROXY = os.getenv("TRUST_PROXY", "false").lower() in ("1", "true", "yes")

# --- E. CORRECTION HEX VALUES ---
# Representative hex colours for user-driven corrections.
HAIR_CORRECTION_HEX = {
    "Black": "#1A1110",
    "Brown": "#3B2F2F",
    "Blonde": "#C8A070",
    "Auburn": "#6A3B2A",
    "Red": "#8B2500",
    "Grey/White": "#A0A0A0",
}

EYE_CORRECTION_HEX = {
    "Brown": "#6B4226",
    "Blue": "#4A7FA5",
    "Green": "#4E7D5B",
    "Gray": "#808080",
    "Amber": "#C87820",
}
