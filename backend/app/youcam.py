import asyncio
import logging
import os

import httpx

logger = logging.getLogger("youcam")

BASE_URL = "https://yce-api-01.makeupar.com"
POLL_INTERVAL = 2
POLL_TIMEOUT = 120

ERROR_MESSAGES = {
    "face_not_detected": "We couldn't detect a face. Please try a clearer photo with your face visible.",
    "face_too_small": "Your face is too small in the photo. Move closer or crop tighter so your face fills at least 60% of the frame.",
    "multiple_faces": "Multiple faces detected. Please use a photo with only one person.",
    "bad_angle": "Your face angle is too tilted. Please face the camera directly.",
    "bad_lighting": "The lighting isn't ideal. Try soft, even lighting without coloured bulbs.",
    "image_too_large": "The image exceeds 10 MB. Please use a smaller file.",
    "invalid_format": "Only JPG and PNG files are supported.",
    "resolution_too_low": "The image resolution is too low. Please use at least 320 px.",
}


class YouCamError(Exception):
    def __init__(self, code: str, message: str, step: str = ""):
        self.code = code
        self.message = message
        self.step = step
        super().__init__(message)


def _api_key() -> str:
    key = os.getenv("YOUCAM_API_KEY", "")
    if not key:
        raise YouCamError("no_api_key", "YouCam API key is not configured.")
    return key


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {_api_key()}",
    }


def _friendly_error(error_code: str) -> str:
    return ERROR_MESSAGES.get(
        error_code,
        f"Something went wrong ({error_code}). Please try again with a different photo.",
    )


def _check_response(resp: httpx.Response, step: str):
    # Always log the request details for debugging
    safe_url = str(resp.request.url)
    logger.info(
        "[YouCam %s] %s %s -> %d",
        step, resp.request.method, safe_url, resp.status_code,
    )

    if resp.is_success:
        return

    body_preview = resp.text[:500]
    logger.error(
        "[YouCam %s ERROR] %s %s -> %d | body: %s",
        step, resp.request.method, safe_url, resp.status_code, body_preview,
    )
    try:
        msg = resp.json().get("error", "")
    except Exception:
        msg = ""
    raise YouCamError(
        code=f"http_{resp.status_code}",
        message=msg or f"YouCam API error ({resp.status_code})",
        step=step,
    )


async def _upload_file(
    client: httpx.AsyncClient,
    image_bytes: bytes,
    content_type: str = "image/jpeg",
    file_endpoint: str = "/s2s/v2.0/file",
) -> str:
    is_png = "png" in content_type.lower()
    ext = "png" if is_png else "jpg"
    ctype = "image/png" if is_png else "image/jpg"
    full_url = f"{BASE_URL}{file_endpoint}"

    logger.info("[YouCam] Registering file at %s", full_url)
    resp = await client.post(
        full_url,
        headers={**_headers(), "Content-Type": "application/json"},
        json={
            "files": [{
                "content_type": ctype,
                "file_name": f"upload.{ext}",
                "file_size": len(image_bytes),
            }]
        },
    )
    _check_response(resp, "file_register")
    file_data = resp.json()["data"]["files"][0]
    file_id = file_data["file_id"]
    upload_req = file_data["requests"][0]

    logger.info("[YouCam] Uploading bytes to presigned URL (file_id=%s)", file_id)
    put_resp = await client.request(
        upload_req["method"],
        upload_req["url"],
        content=image_bytes,
        headers=upload_req.get("headers", {}),
    )
    logger.info("[YouCam] Upload -> %d", put_resp.status_code)
    if not put_resp.is_success:
        logger.error(
            "[YouCam upload ERROR] %s %s -> %d | body: %s",
            upload_req["method"], upload_req["url"][:80],
            put_resp.status_code, put_resp.text[:500],
        )
        raise YouCamError(
            code=f"http_{put_resp.status_code}",
            message=f"Failed to upload file bytes ({put_resp.status_code})",
            step="file_upload_put",
        )
    return file_id


async def _poll_task(client: httpx.AsyncClient, endpoint: str, task_id: str) -> dict:
    elapsed = 0
    while elapsed < POLL_TIMEOUT:
        resp = await client.get(
            f"{BASE_URL}{endpoint}/{task_id}",
            headers=_headers(),
        )
        _check_response(resp, "poll")
        data = resp.json().get("data", {})
        status = data.get("task_status", data.get("status", ""))

        if status == "success":
            return data
        if status == "error" or status == "failed":
            code = data.get("error") or data.get("error_code") or "unknown"
            message = data.get("error_message") or _friendly_error(code)
            raise YouCamError(code, message, step="poll")

        await asyncio.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL

    raise YouCamError("timeout", "Analysis timed out. Please try again.", step="poll")


async def analyze_tone(image_bytes: bytes, content_type: str = "image/jpeg") -> dict:
    async with httpx.AsyncClient(timeout=90) as client:
        file_id = await _upload_file(client, image_bytes, content_type)

        resp = await client.post(
            f"{BASE_URL}/s2s/v2.0/task/skin-tone-analysis",
            headers=_headers(),
            json={"src_file_id": file_id},
        )
        _check_response(resp, "create_task")
        task_id = resp.json()["data"]["task_id"]

        result = await _poll_task(client, "/s2s/v2.0/task/skin-tone-analysis", task_id)
        colors = result.get("results", {}).get("color", {})
        return {
            "skin_color": colors.get("skin_color", ""),
            "eye_color": colors.get("eye_color", ""),
            "eye_color_name": colors.get("eye_color_name", ""),
            "lip_color": colors.get("lip_color", ""),
            "eyebrow_color": colors.get("eyebrow_color", ""),
            "hair_color": colors.get("hair_color", ""),
            "hair_color_name": colors.get("hair_color_name", ""),
        }


async def run_tryon(
    user_photo_bytes: bytes,
    garment_bytes: bytes,
    user_content_type: str = "image/jpeg",
    garment_content_type: str = "image/jpeg",
) -> str:
    """Full cloth-v3 flow matching tryon_test.py: upload both images, create
    task, poll to completion, return the result image URL."""
    async with httpx.AsyncClient(timeout=180) as client:
        src_id = await _upload_file(
            client, user_photo_bytes, user_content_type,
            file_endpoint="/s2s/v2.0/file/cloth-v3",
        )
        ref_id = await _upload_file(
            client, garment_bytes, garment_content_type,
            file_endpoint="/s2s/v2.0/file/cloth-v3",
        )

        resp = await client.post(
            f"{BASE_URL}/s2s/v2.0/task/cloth-v3",
            headers={**_headers(), "Content-Type": "application/json"},
            json={
                "src_file_id": src_id,
                "ref_file_id": ref_id,
                "garment_category": "auto",
            },
        )
        _check_response(resp, "create_task")
        task_id = resp.json()["data"]["task_id"]
        logger.info("[YouCam] cloth-v3 task created: %s", task_id)

        elapsed = 0
        while elapsed < POLL_TIMEOUT:
            await asyncio.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL
            resp = await client.get(
                f"{BASE_URL}/s2s/v2.0/task/cloth-v3/{task_id}",
                headers=_headers(),
            )
            _check_response(resp, "poll")
            data = resp.json().get("data", {})
            status = data.get("task_status")
            logger.info("[YouCam] task_status = %s", status)

            if status == "success":
                return data["results"]["url"]
            if status in ("error", "failed"):
                code = data.get("error") or data.get("error_code") or "unknown"
                raise YouCamError(code, _friendly_error(code), step="poll")

        raise YouCamError(
            "timeout", "Try-on timed out after 2 minutes.", step="poll",
        )
