"""A serial queue. Each download owns a process tree, including FFmpeg."""
import atexit
import json
import os
import queue
import signal
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path

from backend.config import get_config, add_history_item

active_tasks = {}
_lock = threading.RLock()
_queue = queue.Queue()
_processes = {}
_started = False
TERMINAL = {"completed", "error", "cancelled"}


def stop_process(process):
    if process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                       capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
    else:
        os.killpg(process.pid, signal.SIGKILL)


def shutdown():
    with _lock:
        for task in active_tasks.values():
            if task["status"] not in TERMINAL:
                task["status"] = "cancelled"
        for process in list(_processes.values()):
            stop_process(process)


atexit.register(shutdown)


def consume():
    while True:
        task_id = _queue.get()
        cookie_jar = None
        try:
            with _lock:
                task = active_tasks[task_id]
                if task["status"] == "cancelled":
                    continue
                task.update(status="preparing", message="Obtendo vídeo…")
                options = {"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {"start_new_session": True}
                process = subprocess.Popen(
                    [sys.executable, "-m", "backend.worker"], cwd=Path(__file__).resolve().parent.parent,
                    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                    text=True, encoding="utf-8", **options)
                _processes[task_id] = process
                process.stdin.write(json.dumps(task["request"]) + "\n")
                process.stdin.close()
            result = None
            for line in process.stdout:
                try:
                    event = json.loads(line)
                except (ValueError, TypeError):
                    continue
                if event.get("cookie_jar"):
                    cookie_jar = event["cookie_jar"]
                    continue
                with _lock:
                    if task["status"] == "cancelled":
                        continue
                    if event.get("result"):
                        result = event["result"]
                    else:
                        task.update({k: v for k, v in event.items() if k in
                                     {"status", "message", "progress", "speed", "eta", "error"}})
            code = process.wait()
            with _lock:
                if task["status"] == "cancelled":
                    continue
                if code != 0 or not result:
                    raise RuntimeError(task.get("error") or "O download foi interrompido. Tente novamente.")
                # Recheck the final file before recording success.
                path = Path(result["file_path"])
                if not path.is_file() or path.stat().st_size <= 0:
                    raise RuntimeError("O arquivo final não foi encontrado ou está vazio.")
                add_history_item({"id": task_id, "type": task["type"], "url": task["request"]["url"],
                                  "is_audio": task["request"]["is_audio_only"], "timestamp": time.time(),
                                  "title": path.name, **result})
                task.update(result, status="completed", progress=100, message="Salvo com sucesso!")
        except Exception as exc:
            with _lock:
                if active_tasks[task_id]["status"] != "cancelled":
                    active_tasks[task_id].update(status="error", error=str(exc), message=str(exc))
        finally:
            with _lock:
                process = _processes.pop(task_id, None)
                if process and process.poll() is None:
                    stop_process(process)
                if process and process.stdout:
                    process.stdout.close()
            if cookie_jar:
                try:
                    Path(cookie_jar).unlink(missing_ok=True)
                except OSError:
                    pass
            _queue.task_done()


class DownloadManager:
    @staticmethod
    def submit(kind, request):
        global _started
        with _lock:
            if sum(t["status"] not in TERMINAL for t in active_tasks.values()) >= 100:
                raise ValueError("A fila está cheia. Aguarde os downloads terminarem.")
            for old_id in list(active_tasks):
                if len(active_tasks) < 300:
                    break
                if active_tasks[old_id]["status"] in TERMINAL:
                    del active_tasks[old_id]
            task_id = str(uuid.uuid4())
            request = {**request, "task_id": task_id,
                       "output_dir": get_config()["download_dir"]}
            active_tasks[task_id] = {
                "id": task_id, "type": kind, "title": request.get("custom_title") or request["url"],
                "request": request, "status": "queued", "progress": 0,
                "message": "Na fila", "created_at": time.time()}
            _queue.put(task_id)
            if not _started:
                _started = True
                threading.Thread(target=consume, daemon=True).start()
            return task_id

    @classmethod
    def start_clip_download(cls, **kwargs):
        return cls.submit("clip", kwargs)

    @classmethod
    def start_full_download(cls, **kwargs):
        return cls.submit("full", kwargs)

    @staticmethod
    def snapshot():
        with _lock:
            return [{k: v for k, v in t.items() if k != "request"} for t in active_tasks.values()]

    @staticmethod
    def cancel(task_id):
        with _lock:
            task = active_tasks[task_id]
            if task["status"] not in TERMINAL:
                task.update(status="cancelled", message="Cancelado")
                process = _processes.get(task_id)
                if process:
                    stop_process(process)

    @classmethod
    def retry(cls, task_id):
        with _lock:
            task = active_tasks[task_id]
            if task["status"] not in {"error", "cancelled"}:
                raise ValueError("Somente tarefas canceladas ou com erro podem ser repetidas.")
            return cls.submit(task["type"], task["request"])
