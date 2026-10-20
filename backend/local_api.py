"""Desktop API, isolated from concurrently developed download effects."""
import json
import math
import os
import subprocess
import sys
from pathlib import Path
from typing import Literal, Optional
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
from starlette.middleware.trustedhost import TrustedHostMiddleware

from backend import app as legacy
from backend.config import get_config, save_config, get_history, remove_history_item, atomic_json, STORAGE_LOCK
from backend.media import extract_video_info, COOKIES_JSON_PATH
from backend.tasks import DownloadManager

app = FastAPI(title="House Clipper API")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "[::1]"])


@app.middleware("http")
async def local_api_guard(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        origin = request.headers.get("origin")
        if ((origin and origin != str(request.base_url).rstrip("/"))
                or request.headers.get("sec-fetch-site") == "cross-site"
                or request.headers.get("x-house-clipper") != "1"):
            return JSONResponse({"detail": "Acesse pela interface local do House Clipper."}, status_code=403)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


class VideoInfoRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, value):
        parsed = urlsplit(value)
        host = (parsed.hostname or "").lower()
        domains = ("youtube.com", "youtu.be", "twitter.com", "x.com")
        if (parsed.scheme not in ("https", "http") or parsed.username or parsed.password
                or parsed.port not in (None, 80, 443)
                or not any(host == d or host.endswith("." + d) for d in domains)):
            raise ValueError("Use um link válido do YouTube ou Twitter/X.")
        return value


class DownloadValidation(VideoInfoRequest):
    quality: str = "best"

    @field_validator("quality")
    @classmethod
    def validate_quality(cls, value):
        if value != "best" and (not value.isdigit() or not 144 <= int(value) <= 8640):
            raise ValueError("Resolução inválida.")
        return value


# Inherit the additional export options instead of overwriting the other work.
class ClipRequest(legacy.ClipRequest, DownloadValidation):
    pass


class FullDownloadRequest(legacy.FullDownloadRequest, DownloadValidation):
    pass


class ConfigUpdateRequest(BaseModel):
    download_dir: Optional[str] = None
    theme: Optional[Literal["burnt_yellow", "dark_amber"]] = None
    default_quality: Optional[Literal["best", "1080", "720", "480"]] = None


class OpenFileRequest(BaseModel):
    path: Optional[str] = None


class CookiesUpdateRequest(BaseModel):
    cookies_json_text: str


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "House Clipper", "version": "v1.3.0"}


@app.post("/api/info")
def get_info(req: VideoInfoRequest):
    try:
        return extract_video_info(req.url)
    except Exception as exc:
        raise HTTPException(400, str(exc))


def queue_request(req, kind):
    data = req.model_dump()
    data["custom_title"] = data.pop("title")
    data["is_audio_only"] = data.pop("is_audio")
    try:
        task_id = DownloadManager.submit(kind, data)
        return {"task_id": task_id, "status": "queued"}
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@app.post("/api/clip")
def start_clip(req: ClipRequest):
    if not all(math.isfinite(t) for t in (req.start_time, req.end_time)) or not 0 <= req.start_time < req.end_time:
        raise HTTPException(400, "O início deve ser menor que o fim e não pode ser negativo.")
    return queue_request(req, "clip")


@app.post("/api/download")
def start_full_download(req: FullDownloadRequest):
    return queue_request(req, "full")


@app.get("/api/tasks")
def list_tasks():
    return DownloadManager.snapshot()


@app.get("/api/tasks/{task_id}")
def get_task_status(task_id: str):
    for task in DownloadManager.snapshot():
        if task["id"] == task_id:
            return task
    raise HTTPException(404, "Tarefa não encontrada.")


@app.post("/api/tasks/{task_id}/cancel")
def cancel_task(task_id: str):
    try:
        DownloadManager.cancel(task_id)
        return {"success": True}
    except KeyError:
        raise HTTPException(404, "Tarefa não encontrada.")


@app.post("/api/tasks/{task_id}/retry")
def retry_task(task_id: str):
    try:
        return {"task_id": DownloadManager.retry(task_id)}
    except KeyError:
        raise HTTPException(404, "Tarefa não encontrada.")
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@app.get("/api/history")
def list_history():
    return [{**item, "available": Path(item["file_path"]).is_file()} for item in get_history()]


@app.delete("/api/history/{item_id}")
def delete_history_item(item_id: str):
    remove_history_item(item_id)
    return {"success": True}


@app.get("/api/config")
def read_config():
    return get_config()


@app.post("/api/config")
def update_config(req: ConfigUpdateRequest):
    return save_config(req.model_dump(exclude_none=True))


@app.get("/api/cookies")
def get_cookies_info():
    with STORAGE_LOCK:
        data = json.loads(COOKIES_JSON_PATH.read_text(encoding="utf-8-sig")) if COOKIES_JSON_PATH.exists() else []
    example = isinstance(data, list) and len(data) == 1 and data[0].get("name") == "EXEMPLO_COOKIE"
    count = 0 if example else len(data)
    return {"has_cookies": count > 0, "count": count}


@app.post("/api/cookies")
def update_cookies(req: CookiesUpdateRequest):
    try:
        parsed = json.loads(req.cookies_json_text)
        if not isinstance(parsed, list):
            raise ValueError("Cole uma lista de cookies em JSON.")
        for cookie in parsed:
            if not isinstance(cookie, dict) or not isinstance(cookie.get("name"), str) or not isinstance(cookie.get("value"), str):
                raise ValueError("Cada cookie precisa de nome e valor em texto.")
            domain = cookie.get("domain", ".youtube.com").lstrip(".")
            if not any(domain == d or domain.endswith("." + d) for d in ("youtube.com", "google.com", "twitter.com", "x.com")):
                raise ValueError("O arquivo contém cookies de outro serviço.")
            if any(c in str(v) for v in cookie.values() for c in ("\n", "\r", "\t")):
                raise ValueError("Cookie contém caracteres inválidos.")
            expiry = cookie.get("expirationDate") or cookie.get("expiry") or 2147483647
            if not math.isfinite(float(expiry)) or float(expiry) < 0:
                raise ValueError("Validade de cookie inválida.")
        atomic_json(COOKIES_JSON_PATH, parsed)
        return {"success": True, "count": len(parsed)}
    except (ValueError, TypeError, AttributeError) as exc:
        raise HTTPException(400, f"Cookies inválidos: {exc}")


app.post("/api/select-folder")(legacy.select_folder)
app.post("/api/open-cookies-file")(legacy.open_cookies_file)


def known_media(path):
    if not path:
        raise HTTPException(400, "Informe um arquivo.")
    resolved = Path(path).resolve()
    known = {Path(item["file_path"]).resolve() for item in get_history()}
    if resolved not in known or resolved.suffix.lower() not in {".mp4", ".mp3", ".webm", ".m4a", ".mkv", ".gif"}:
        raise HTTPException(403, "Arquivo não pertence ao histórico de mídia.")
    return resolved


def open_native(path):
    if sys.platform == "win32":
        os.startfile(str(path))
    else:
        subprocess.Popen(["open" if sys.platform == "darwin" else "xdg-open", str(path)])


@app.post("/api/open-folder")
def open_folder(req: Optional[OpenFileRequest] = None):
    folder = known_media(req.path).parent if req and req.path else Path(get_config()["download_dir"]).resolve()
    if not folder.is_dir():
        raise HTTPException(404, "Pasta não encontrada.")
    open_native(folder)
    return {"success": True}


@app.post("/api/open-file")
def open_file(req: OpenFileRequest):
    path = known_media(req.path)
    if not path.is_file():
        raise HTTPException(404, "Arquivo não encontrado no disco.")
    open_native(path)
    return {"success": True}


frontend_dir = Path(__file__).resolve().parent.parent / "frontend"


@app.get("/", response_class=HTMLResponse)
@app.get("/index.html", response_class=HTMLResponse)
def desktop_page():
    # Compose the desktop improvements without overwriting the shared web UI.
    source = (frontend_dir / "index.html").read_text(encoding="utf-8")
    if 'src="features.js"' not in source:
        source = source.replace("</body>", '<script src="features.js"></script></body>')
    source = source.replace("</head>", '<link rel="stylesheet" href="features.css"></head>')
    return source


app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
