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
from backend.config import STORAGE_LOCK

COOKIES_JSON_PATH = Path(__file__).resolve().parent.parent / "cookies.json"
COOKIES_TXT_PATH = Path(__file__).resolve().parent.parent / "cookies_netscape.txt"

def get_active_cookie_file() -> Optional[str]:
    """Each extractor owns its mutable cookie jar."""
    import tempfile
    import atexit
    if not COOKIES_JSON_PATH.exists():
        return None
    with STORAGE_LOCK:
        data = json.loads(COOKIES_JSON_PATH.read_text(encoding='utf-8-sig'))
    if not data or (isinstance(data, list) and len(data) == 1 and data[0].get('name') == 'EXEMPLO_COOKIE'):
        return None
    if isinstance(data, dict):
        data = [{'name': k, 'value': v, 'domain': '.youtube.com'} for k, v in data.items()]
    lines = ['# Netscape HTTP Cookie File']
    for cookie in data:
        domain = cookie.get('domain', '.youtube.com')
        values = [domain, 'TRUE' if domain.startswith('.') else 'FALSE', cookie.get('path', '/'),
                  'TRUE' if cookie.get('secure') else 'FALSE',
                  str(int(cookie.get('expirationDate') or cookie.get('expiry') or 2147483647)),
                  cookie.get('name', ''), cookie.get('value', '')]
        if any(any(c in str(value) for c in ('\n', '\r', '\t')) for value in values):
            raise ValueError('Cookie inválido. Importe novamente nas configurações.')
        lines.append('\t'.join(str(v) for v in values))
    fd, filename = tempfile.mkstemp(prefix='houseclipper-cookies-', suffix='.txt')
    with os.fdopen(fd, 'w', encoding='utf-8') as stream:
        stream.write('\n'.join(lines) + '\n')
    atexit.register(lambda: Path(filename).unlink(missing_ok=True))
    return filename

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
        'extract_flat': False, 'noplaylist': True, 'socket_timeout': 20,
        'remote_components': ['ejs:github'],
        'js_runtimes': {'node': {}},
    }
    if cookie_file:
        ydl_opts['cookiefile'] = cookie_file
    
    from contextlib import ExitStack
    with ExitStack() as stack:
        if cookie_file:
            stack.callback(Path(cookie_file).unlink, missing_ok=True)
        ydl = stack.enter_context(yt_dlp.YoutubeDL(ydl_opts))
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
            "formats": formats, "storyboard": extract_storyboard(info)
        }


def extract_storyboard(info):
    boards = [f for f in info.get('formats', []) if f.get('protocol') == 'mhtml' and f.get('fragments') and f.get('fps')]
    if not boards:
        return None
    board = min(boards, key=lambda f: abs(f.get('width', 160) - 160))
    return {k: board.get(k) for k in ('width', 'height', 'rows', 'columns', 'fps', 'fragments')}
