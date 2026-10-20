import os
import re
import json
import time
import uuid
import subprocess
import threading
from pathlib import Path
from typing import Dict, Any, Optional
import yt_dlp
from yt_dlp.utils import download_range_func
from backend.config import get_config, add_history_item

active_tasks: Dict[str, Dict[str, Any]] = {}
COOKIES_JSON_PATH = Path(__file__).resolve().parent.parent / "cookies.json"
COOKIES_TXT_PATH = Path(__file__).resolve().parent.parent / "cookies_netscape.txt"

def get_active_cookie_file() -> Optional[str]:
    """Converte cookies.json em formato Netscape se houver cookies válidos."""
    if not COOKIES_JSON_PATH.exists():
        return None
    try:
        with open(COOKIES_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        if not data:
            return None
            
        if isinstance(data, list) and len(data) == 1 and data[0].get("name") == "EXEMPLO_COOKIE":
            return None

        with open(COOKIES_TXT_PATH, "w", encoding="utf-8") as f:
            f.write("# Netscape HTTP Cookie File\n")
            if isinstance(data, list):
                for c in data:
                    domain = c.get("domain", ".youtube.com")
                    flag = "TRUE" if domain.startswith(".") else "FALSE"
                    path = c.get("path", "/")
                    secure = "TRUE" if c.get("secure", False) else "FALSE"
                    expiry = int(c.get("expirationDate") or c.get("expiry") or 2147483647)
                    name = c.get("name", "")
                    value = c.get("value", "")
                    if name:
                        f.write(f"{domain}\t{flag}\t{path}\t{secure}\t{expiry}\t{name}\t{value}\n")
            elif isinstance(data, dict):
                for name, value in data.items():
                    f.write(f".youtube.com\tTRUE\t/\tTRUE\t2147483647\t{name}\t{value}\n")
                    
        return str(COOKIES_TXT_PATH)
    except Exception as e:
        print("Aviso cookies:", e)
        return None

def sanitize_filename(name: str) -> str:
    clean = re.sub(r'[\\/*?:"<>|]', "", name)
    clean = clean.strip()
    return clean[:120] if len(clean) > 120 else clean

def format_duration(seconds: Optional[float]) -> str:
    if seconds is None:
        return "00:00"
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

def extract_video_info(url: str) -> dict:
    cookie_file = get_active_cookie_file()
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'remote_components': ['ejs:github'],
        'js_runtimes': {'node': {}},
    }
    if cookie_file:
        ydl_opts['cookiefile'] = cookie_file
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        if 'entries' in info:
            info = info['entries'][0]
            
        title = info.get('title') or info.get('description') or 'Vídeo'
        if len(title) > 90:
            title = title[:87] + '...'
            
        duration = info.get('duration')
        uploader = info.get('uploader') or info.get('channel') or info.get('uploader_id') or 'Desconhecido'
        thumbnail = info.get('thumbnail')
        
        extractor = (info.get('extractor') or '').lower()
        platform = "youtube" if "youtube" in extractor else ("twitter" if "twitter" in extractor else "other")
        
        raw_chapters = info.get('chapters') or []
        chapters = []
        for ch in raw_chapters:
            chapters.append({
                "title": ch.get("title", ""),
                "start_time": ch.get("start_time", 0),
                "end_time": ch.get("end_time", 0),
                "start_formatted": format_duration(ch.get("start_time", 0)),
                "end_formatted": format_duration(ch.get("end_time", 0)),
            })

        formats = []
        raw_formats = info.get('formats') or []
        resolutions_seen = set()
        
        for f in raw_formats:
            height = f.get('height')
            vcodec = f.get('vcodec')
            if height and vcodec != 'none' and height not in resolutions_seen:
                resolutions_seen.add(height)
                formats.append({
                    'format_id': f.get('format_id'),
                    'resolution': f"{height}p",
                    'height': height,
                    'ext': f.get('ext', 'mp4')
                })
        
        formats.sort(key=lambda x: x['height'], reverse=True)
        
        return {
            "title": title,
            "uploader": uploader,
            "duration": duration,
            "duration_formatted": format_duration(duration),
            "thumbnail": thumbnail,
            "platform": platform,
            "url": url,
            "chapters": chapters,
            "formats": formats
        }

COLOR_FILTERS = {
    "blue": "colorbalance=rh=-0.1:gh=0:bh=0.25:rm=-0.1:bm=0.25:rs=-0.1:bs=0.2",
    "red": "colorbalance=rh=0.25:gh=-0.1:bh=-0.1:rm=0.2:gm=-0.05:rs=0.15",
    "green": "colorbalance=rh=-0.15:gh=0.25:bh=-0.15:gm=0.2:gs=0.15",
    "purple": "colorbalance=rh=0.2:gh=-0.2:bh=0.25:rm=0.15:bm=0.2",
    "pink": "colorbalance=rh=0.25:gh=-0.1:bh=0.15:rm=0.2:gm=-0.05:bm=0.1:rs=0.2",
}

def process_advanced_effects(input_file: str, is_vertical: bool, normalize_audio: bool, export_gif: bool, color_filter: Optional[str] = None) -> str:
    """Aplica pós-processamentos FFmpeg (9:16 com blur, GIF otimizado, filtro de cores ou normalização de som)."""
    base, ext = os.path.splitext(input_file)
    
    if export_gif:
        out_file = base + ".gif"
        # Filtro de paleta de 2 passos para GIF de altíssima fidelidade
        filter_str = "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer"
        cmd = ["ffmpeg", "-y", "-i", input_file, "-vf", filter_str, out_file]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        if os.path.exists(out_file) and out_file != input_file and os.path.exists(input_file):
            try:
                os.remove(input_file)
            except Exception:
                pass
        return out_file

    has_color_filter = color_filter in COLOR_FILTERS
    if not is_vertical and not normalize_audio and not has_color_filter:
        return input_file

    out_file = base + "_processed.mp4"
    cmd = ["ffmpeg", "-y", "-i", input_file]

    # Filtro de Vídeo: 9:16 Vertical com Fundo Desfocado e/ou Filtro de Cores
    if is_vertical:
        vf = "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[bg];[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2"
        if has_color_filter:
            vf += f",{COLOR_FILTERS[color_filter]}"
        cmd.extend(["-vf", vf, "-c:v", "libx264", "-preset", "fast", "-crf", "22"])
    elif has_color_filter:
        cmd.extend(["-vf", COLOR_FILTERS[color_filter], "-c:v", "libx264", "-preset", "fast", "-crf", "22"])
    else:
        cmd.extend(["-c:v", "copy"])

    # Filtro de Áudio: Normalização de volume inteligente (loudnorm)
    if normalize_audio:
        cmd.extend(["-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k"])
    else:
        cmd.extend(["-c:a", "copy"])

    cmd.append(out_file)
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    if os.path.exists(out_file):
        try:
            os.remove(input_file)
            os.rename(out_file, input_file)
            return input_file
        except Exception:
            return out_file
    return input_file

class DownloadManager:
    @staticmethod
    def _create_progress_hook(task_id: str):
        def hook(d):
            task = active_tasks.get(task_id)
            if not task:
                return
            
            status = d.get('status')
            if status == 'downloading':
                total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
                downloaded_bytes = d.get('downloaded_bytes') or 0
                
                percent = 0.0
                if total_bytes > 0:
                    percent = round((downloaded_bytes / total_bytes) * 100, 1)
                elif '_percent_str' in d:
                    try:
                        clean_str = re.sub(r'[^\d.]', '', d['_percent_str'])
                        percent = float(clean_str)
                    except Exception:
                        percent = task.get('progress', 0.0)
                
                speed = d.get('_speed_str', '')
                eta = d.get('_eta_str', '')
                
                task.update({
                    "status": "downloading",
                    "progress": min(percent, 99.0),
                    "speed": speed.strip(),
                    "eta": eta.strip(),
                    "total_bytes": total_bytes,
                    "downloaded_bytes": downloaded_bytes
                })
            elif status == 'finished':
                task.update({
                    "status": "processing",
                    "progress": 99.5,
                    "message": "Processando clipe e filtros com FFmpeg..."
                })
        return hook

    @classmethod
    def start_clip_download(cls, url: str, start_time: float, end_time: float, 
                            custom_title: Optional[str] = None, 
                            quality: str = "best", 
                            is_audio_only: bool = False,
                            is_vertical: bool = False,
                            is_gif: bool = False,
                            normalize_audio: bool = False,
                            embed_subtitles: bool = False,
                            color_filter: Optional[str] = None) -> str:
        task_id = str(uuid.uuid4())
        active_tasks[task_id] = {
            "id": task_id,
            "type": "clip",
            "url": url,
            "start_time": start_time,
            "end_time": end_time,
            "status": "queued",
            "progress": 0.0,
            "speed": "",
            "eta": "",
            "message": "Iniciando clipe...",
            "file_path": None,
            "file_name": None,
            "error": None,
            "created_at": time.time()
        }

        def worker():
            task = active_tasks[task_id]
            try:
                task["status"] = "preparing"
                task["message"] = "Localizando trecho no stream..."
                
                config = get_config()
                output_dir = config.get("download_dir") or str(os.path.join(os.path.expanduser("~"), "Downloads", "HouseClipper"))
                os.makedirs(output_dir, exist_ok=True)
                
                if is_audio_only:
                    format_spec = "bestaudio/best"
                else:
                    if quality == "1080":
                        format_spec = "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"
                    elif quality == "720":
                        format_spec = "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best"
                    elif quality == "480":
                        format_spec = "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]/best"
                    else:
                        format_spec = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best"

                start_formatted = format_duration(start_time).replace(":", "-")
                end_formatted = format_duration(end_time).replace(":", "-")

                suffix = "_9x16" if is_vertical else ""
                if is_gif:
                    suffix = "_gif"

                base_name = sanitize_filename(custom_title) if custom_title and custom_title.strip() else "%(title)s"
                outtmpl = os.path.join(output_dir, f"{base_name}_clip_{start_formatted}_{end_formatted}{suffix}.%(ext)s")

                cookie_file = get_active_cookie_file()
                ydl_opts = {
                    'quiet': True,
                    'no_warnings': True,
                    'remote_components': ['ejs:github'],
                    'js_runtimes': {'node': {}},
                    'download_ranges': download_range_func(None, [(start_time, end_time)]),
                    'force_keyframes_at_cuts': True,
                    'format': format_spec,
                    'outtmpl': outtmpl,
                    'progress_hooks': [cls._create_progress_hook(task_id)],
                }
                if cookie_file:
                    ydl_opts['cookiefile'] = cookie_file

                if embed_subtitles and not is_audio_only and not is_gif:
                    ydl_opts['writesubtitles'] = True
                    ydl_opts['writeautomaticsub'] = True
                    ydl_opts['subtitleslangs'] = ['pt', 'pt-BR', 'en']
                    ydl_opts['postprocessors'] = [{'key': 'FFmpegEmbedSubtitle'}]

                if is_audio_only:
                    ydl_opts['postprocessors'] = [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '192',
                    }]
                else:
                    ydl_opts['merge_output_format'] = 'mp4'

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    if 'entries' in info:
                        info = info['entries'][0]
                    
                    final_filename = ydl.prepare_filename(info)
                    if is_audio_only:
                        final_filename = os.path.splitext(final_filename)[0] + ".mp3"
                    elif not final_filename.endswith(".mp4"):
                        mp4_candidate = os.path.splitext(final_filename)[0] + ".mp4"
                        if os.path.exists(mp4_candidate):
                            final_filename = mp4_candidate

                # Pós-processamento avançado: 9:16 Vertical, GIF, Filtro de Cor ou Normalização de áudio
                if not is_audio_only and (is_vertical or is_gif or normalize_audio or color_filter):
                    task["message"] = "Renderizando efeitos avançados (9:16 / GIF / Cores / Loudness)..."
                    final_filename = process_advanced_effects(
                        final_filename, 
                        is_vertical=is_vertical, 
                        normalize_audio=normalize_audio, 
                        export_gif=is_gif,
                        color_filter=color_filter
                    )

                file_size = os.path.getsize(final_filename) if os.path.exists(final_filename) else 0

                task.update({
                    "status": "completed",
                    "progress": 100.0,
                    "message": "Clipe salvo com sucesso!",
                    "file_path": final_filename,
                    "file_name": os.path.basename(final_filename),
                    "file_size": file_size
                })

                type_label = "GIF Animado" if is_gif else ("Vídeo 9:16" if is_vertical else "Clipe")
                add_history_item({
                    "id": task_id,
                    "title": os.path.basename(final_filename),
                    "type": "clip",
                    "subtype": type_label,
                    "duration": f"{format_duration(start_time)} até {format_duration(end_time)} ({int(end_time - start_time)}s)",
                    "file_path": final_filename,
                    "file_size": file_size,
                    "timestamp": time.time(),
                    "url": url,
                    "is_audio": is_audio_only
                })

            except Exception as e:
                task.update({
                    "status": "error",
                    "error": str(e),
                    "message": f"Erro ao gerar clipe: {str(e)}"
                })

        thread = threading.Thread(target=worker, daemon=True)
        thread.start()
        return task_id

    @classmethod
    def start_full_download(cls, url: str, 
                            quality: str = "best", 
                            is_audio_only: bool = False,
                            custom_title: Optional[str] = None,
                            normalize_audio: bool = False) -> str:
        task_id = str(uuid.uuid4())
        active_tasks[task_id] = {
            "id": task_id,
            "type": "full",
            "url": url,
            "status": "queued",
            "progress": 0.0,
            "speed": "",
            "eta": "",
            "message": "Iniciando download...",
            "file_path": None,
            "file_name": None,
            "error": None,
            "created_at": time.time()
        }

        def worker():
            task = active_tasks[task_id]
            try:
                task["status"] = "preparing"
                task["message"] = "Obtendo vídeo completo..."
                
                config = get_config()
                output_dir = config.get("download_dir") or str(os.path.join(os.path.expanduser("~"), "Downloads", "HouseClipper"))
                os.makedirs(output_dir, exist_ok=True)

                if is_audio_only:
                    format_spec = "bestaudio/best"
                else:
                    if quality == "1080":
                        format_spec = "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"
                    elif quality == "720":
                        format_spec = "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best"
                    elif quality == "480":
                        format_spec = "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]/best"
                    else:
                        format_spec = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best"

                base_name = sanitize_filename(custom_title) if custom_title and custom_title.strip() else "%(title)s"
                outtmpl = os.path.join(output_dir, f"{base_name}.%(ext)s")

                cookie_file = get_active_cookie_file()
                ydl_opts = {
                    'quiet': True,
                    'no_warnings': True,
                    'remote_components': ['ejs:github'],
                    'js_runtimes': {'node': {}},
                    'format': format_spec,
                    'outtmpl': outtmpl,
                    'progress_hooks': [cls._create_progress_hook(task_id)],
                }
                if cookie_file:
                    ydl_opts['cookiefile'] = cookie_file

                if is_audio_only:
                    ydl_opts['postprocessors'] = [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '192',
                    }]
                else:
                    ydl_opts['merge_output_format'] = 'mp4'

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    if 'entries' in info:
                        info = info['entries'][0]
                    
                    final_filename = ydl.prepare_filename(info)
                    if is_audio_only:
                        final_filename = os.path.splitext(final_filename)[0] + ".mp3"
                    elif not final_filename.endswith(".mp4"):
                        mp4_candidate = os.path.splitext(final_filename)[0] + ".mp4"
                        if os.path.exists(mp4_candidate):
                            final_filename = mp4_candidate

                if normalize_audio:
                    final_filename = process_advanced_effects(final_filename, is_vertical=False, normalize_audio=True, export_gif=False)

                file_size = os.path.getsize(final_filename) if os.path.exists(final_filename) else 0

                task.update({
                    "status": "completed",
                    "progress": 100.0,
                    "message": "Download completo salvo!",
                    "file_path": final_filename,
                    "file_name": os.path.basename(final_filename),
                    "file_size": file_size
                })

                add_history_item({
                    "id": task_id,
                    "title": os.path.basename(final_filename),
                    "type": "full",
                    "duration": format_duration(info.get('duration')),
                    "file_path": final_filename,
                    "file_size": file_size,
                    "timestamp": time.time(),
                    "url": url,
                    "is_audio": is_audio_only
                })

            except Exception as e:
                task.update({
                    "status": "error",
                    "error": str(e),
                    "message": f"Erro no download: {str(e)}"
                })

        thread = threading.Thread(target=worker, daemon=True)
        thread.start()
        return task_id
