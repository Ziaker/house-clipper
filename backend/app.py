import os
import sys
import json
import subprocess
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from backend.config import get_config, save_config, get_history, remove_history_item
from backend.downloader import (
    extract_video_info, 
    DownloadManager, 
    active_tasks,
    COOKIES_JSON_PATH,
    get_active_cookie_file
)

app = FastAPI(title="House Clipper API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoInfoRequest(BaseModel):
    url: str

class ClipRequest(BaseModel):
    url: str
    start_time: float
    end_time: float
    title: Optional[str] = None
    quality: str = "best"
    is_audio: bool = False
    is_vertical: bool = False
    is_gif: bool = False
    normalize_audio: bool = False
    embed_subtitles: bool = False
    color_filter: Optional[str] = None

class FullDownloadRequest(BaseModel):
    url: str
    quality: str = "best"
    is_audio: bool = False
    title: Optional[str] = None
    normalize_audio: bool = False
    color_filter: Optional[str] = None

class ConfigUpdateRequest(BaseModel):
    download_dir: Optional[str] = None
    theme: Optional[str] = None
    default_quality: Optional[str] = None

class OpenFileRequest(BaseModel):
    path: str

class CookiesUpdateRequest(BaseModel):
    cookies_json_text: str

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "House Clipper", "version": "v1.3.0"}

@app.post("/api/info")
def get_info(req: VideoInfoRequest):
    try:
        data = extract_video_info(req.url)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/clip")
def start_clip(req: ClipRequest):
    if req.start_time < 0 or req.end_time <= req.start_time:
        raise HTTPException(status_code=400, detail="Ponto inicial deve ser menor que o ponto final.")
    
    try:
        task_id = DownloadManager.start_clip_download(
            url=req.url,
            start_time=req.start_time,
            end_time=req.end_time,
            custom_title=req.title,
            quality=req.quality,
            is_audio_only=req.is_audio,
            is_vertical=req.is_vertical,
            is_gif=req.is_gif,
            normalize_audio=req.normalize_audio,
            embed_subtitles=req.embed_subtitles
        )
        return {"task_id": task_id, "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/download")
def start_full_download(req: FullDownloadRequest):
    try:
        task_id = DownloadManager.start_full_download(
            url=req.url,
            quality=req.quality,
            is_audio_only=req.is_audio,
            custom_title=req.title,
            normalize_audio=req.normalize_audio
        )
        return {"task_id": task_id, "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tasks/{task_id}")
def get_task_status(task_id: str):
    task = active_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    return task

@app.get("/api/history")
def list_history():
    return get_history()

@app.delete("/api/history/{item_id}")
def delete_history_item(item_id: str):
    remove_history_item(item_id)
    return {"success": True}

@app.get("/api/config")
def read_config():
    return get_config()

@app.post("/api/config")
def update_config(req: ConfigUpdateRequest):
    updates = {}
    if req.download_dir:
        updates["download_dir"] = req.download_dir
    if req.theme:
        updates["theme"] = req.theme
    if req.default_quality:
        updates["default_quality"] = req.default_quality
    return save_config(updates)

@app.get("/api/cookies")
def get_cookies_info():
    if not COOKIES_JSON_PATH.exists():
        return {"has_cookies": False, "count": 0, "raw": "[]"}
    try:
        with open(COOKIES_JSON_PATH, "r", encoding="utf-8") as f:
            content = f.read()
            data = json.loads(content)
            
        count = len(data) if isinstance(data, list) else len(data.keys())
        is_example = isinstance(data, list) and len(data) == 1 and data[0].get("name") == "EXEMPLO_COOKIE"
        
        return {
            "has_cookies": count > 0 and not is_example,
            "count": 0 if is_example else count,
            "raw": content
        }
    except Exception as e:
        return {"has_cookies": False, "count": 0, "raw": "[]", "error": str(e)}

@app.post("/api/cookies")
def update_cookies(req: CookiesUpdateRequest):
    try:
        parsed = json.loads(req.cookies_json_text)
        with open(COOKIES_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(parsed, f, indent=2, ensure_ascii=False)
            
        get_active_cookie_file()
        count = len(parsed) if isinstance(parsed, list) else len(parsed.keys())
        return {"success": True, "count": count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"JSON inválido: {str(e)}")

@app.post("/api/open-cookies-file")
def open_cookies_file():
    if not COOKIES_JSON_PATH.exists():
        with open(COOKIES_JSON_PATH, "w", encoding="utf-8") as f:
            f.write("[]")
    try:
        if sys.platform == "win32":
            subprocess.Popen(["notepad.exe", str(COOKIES_JSON_PATH)])
        else:
            subprocess.Popen(["open", str(COOKIES_JSON_PATH)])
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/select-folder")
def select_folder():
    try:
        import tkinter as tk
        from tkinter import filedialog
        
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        folder = filedialog.askdirectory(title="Selecione a pasta para o House Clipper")
        root.destroy()
        
        if folder:
            save_config({"download_dir": folder})
            return {"download_dir": folder}
        return {"download_dir": get_config().get("download_dir")}
    except Exception as e:
        return {"download_dir": get_config().get("download_dir"), "error": str(e)}

@app.post("/api/open-folder")
def open_folder(req: Optional[OpenFileRequest] = None):
    folder = (req.path if req and req.path else get_config().get("download_dir"))
    if not folder or not os.path.exists(folder):
        folder = os.path.expanduser("~")
    
    try:
        if sys.platform == "win32":
            os.startfile(folder)
        elif sys.platform == "darwin":
            subprocess.Popen(["open", folder])
        else:
            subprocess.Popen(["xdg-open", folder])
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/open-file")
def open_file(req: OpenFileRequest):
    if not os.path.exists(req.path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no disco.")
    try:
        if sys.platform == "win32":
            os.startfile(req.path)
        elif sys.platform == "darwin":
            subprocess.Popen(["open", req.path])
        else:
            subprocess.Popen(["xdg-open", req.path])
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

root_dir = Path(__file__).resolve().parent.parent
frontend_dir = root_dir / "frontend"
static_path = str(root_dir) if (root_dir / "index.html").exists() else str(frontend_dir)
app.mount("/", StaticFiles(directory=static_path, html=True), name="frontend")
