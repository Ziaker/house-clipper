"""Isolated download worker; stdout carries JSON events only."""
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

import yt_dlp
from yt_dlp.utils import download_range_func
from backend.media import get_active_cookie_file, sanitize_filename, format_duration


def emit(**event):
    print(json.dumps(event, ensure_ascii=True), flush=True)


class QuietLogger:
    def debug(self, message): pass
    def warning(self, message): pass
    def error(self, message): pass


def validate_media(path, is_audio):
    path = Path(path)
    if not path.is_file() or path.stat().st_size == 0:
        raise ValueError("O arquivo final não foi encontrado ou está vazio.")
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type",
         "-of", "json", str(path)], capture_output=True, text=True, timeout=60,
        **({"creationflags": subprocess.CREATE_NO_WINDOW} if sys.platform == "win32" else {}))
    if result.returncode:
        raise ValueError("O arquivo gerado não pôde ser validado. Tente novamente.")
    info = json.loads(result.stdout)
    duration = float(info.get("format", {}).get("duration", 0))
    required = "audio" if is_audio else "video"
    if not math.isfinite(duration) or duration <= 0 or not any(
            s.get("codec_type") == required for s in info.get("streams", [])):
        raise ValueError("O arquivo gerado não contém mídia válida.")
    return duration


def run(request):
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise ValueError("FFmpeg e FFprobe são necessários. Instale-os e reabra o aplicativo.")
    output = Path(request["output_dir"]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    audio = request.get("is_audio_only", False)
    quality = request.get("quality", "best")
    limit = f"[height<={int(quality)}]" if quality != "best" else ""
    spec = "bestaudio/best" if audio else f"bestvideo{limit}[ext=mp4]+bestaudio[ext=m4a]/bestvideo{limit}+bestaudio/best{limit}"
    base = sanitize_filename(request.get("custom_title") or "") or "%(title).100s"
    # Literal user titles must not be interpreted as yt-dlp template expressions.
    if request.get("custom_title"):
        base = base.replace("%", "%%")
    template = str(output / f"{base}_{request['task_id'][:8]}.%(ext)s")
    final_paths = []

    def progress(data):
        if data["status"] == "downloading":
            total = data.get("total_bytes") or data.get("total_bytes_estimate")
            value = min(99, data.get("downloaded_bytes", 0) / total * 100) if total else None
            emit(status="downloading", progress=value, message="Baixando…",
                 speed=data.get("_speed_str", "").strip(), eta=data.get("_eta_str", "").strip())
        elif data["status"] == "finished":
            emit(status="processing", progress=None, message="Processando e validando arquivo…")

    options = {
        "format": spec, "outtmpl": template, "noplaylist": True,
        "quiet": True, "no_warnings": True, "logger": QuietLogger(),
        "socket_timeout": 20, "retries": 3, "fragment_retries": 3,
        "remote_components": ["ejs:github"], "js_runtimes": {"node": {}},
        "progress_hooks": [progress],
        "post_hooks": [lambda path: final_paths.append(path)],
    }
    cookie = get_active_cookie_file()
    if cookie:
        emit(cookie_jar=cookie)
    if cookie:
        options["cookiefile"] = cookie
    if audio:
        options["postprocessors"] = [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}]
    else:
        options["merge_output_format"] = "mp4"
        options["postprocessors"] = [{"key": "FFmpegVideoRemuxer", "preferedformat": "mp4"}]
    if request.get("embed_subtitles") and not audio and not request.get("is_gif"):
        options.update(writesubtitles=True, writeautomaticsub=True, subtitleslangs=["pt", "pt-BR", "en"])
        options["postprocessors"].append({"key": "FFmpegEmbedSubtitle"})
    with yt_dlp.YoutubeDL(options) as downloader:
        info = downloader.extract_info(request["url"], download=False)
        if info.get("entries") is not None:
            raise ValueError("Use o link de um único vídeo.")
        if "start_time" in request:
            start, end = request["start_time"], request["end_time"]
            duration = info.get("duration")
            if not duration or not (0 <= start < end <= duration):
                raise ValueError("Selecione um trecho dentro da duração do vídeo.")
            downloader.params.update(download_ranges=download_range_func(None, [(start, end)]),
                                     force_keyframes_at_cuts=True)
        downloader.process_ie_result(info, download=True)
    if not final_paths:
        raise ValueError("O download não informou o arquivo final.")
    path = Path(final_paths[-1]).resolve()
    if path.parent != output:
        raise ValueError("Destino do arquivo inválido.")
    if not audio and any(request.get(key) for key in ("is_vertical", "normalize_audio", "is_gif", "color_filter")):
        from backend.downloader import process_advanced_effects
        emit(status="processing", progress=None, message="Aplicando opções de exportação…")
        path = Path(process_advanced_effects(str(path), request.get("is_vertical", False),
                    request.get("normalize_audio", False), request.get("is_gif", False), request.get("color_filter"))).resolve()
    elif audio and request.get("normalize_audio"):
        normalized = path.with_stem(path.stem + "_normalized")
        subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-af", "loudnorm",
                        "-c:a", "libmp3lame", "-b:a", "192k", str(normalized)],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                       **({"creationflags": subprocess.CREATE_NO_WINDOW} if sys.platform == "win32" else {}))
        path = normalized
    duration = validate_media(path, audio)
    emit(result={"file_path": str(path), "file_name": path.name, "file_size": path.stat().st_size,
                 "duration": format_duration(duration), "thumbnail": info.get("thumbnail"),
                 "source_title": info.get("title", "")})


if __name__ == "__main__":
    try:
        run(json.loads(sys.stdin.readline()))
    except Exception as exc:
        emit(status="error", error=str(exc), message=str(exc))
        sys.exit(1)
