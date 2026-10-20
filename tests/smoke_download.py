"""Optional network smoke test: tiny public clip, isolated output and history."""
import sys
import tempfile
import time
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend import config, tasks
from backend.worker import validate_media


def main():
    with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent) as directory:
        root = Path(directory)
        with patch.object(config, "CONFIG_FILE", root / "config.json"), \
             patch.object(config, "HISTORY_FILE", root / "history.json"):
            config.save_config({"download_dir": str(root)})
            request = dict(url="https://www.youtube.com/watch?v=jNQXAC9IVRw",
                           start_time=1.2, end_time=3.2, custom_title="verificacao",
                           quality="144", is_audio_only=False)
            first = tasks.DownloadManager.start_clip_download(**request)
            cancelled = tasks.DownloadManager.start_clip_download(**request)
            tasks.DownloadManager.cancel(cancelled)
            previous = None
            deadline = time.monotonic() + 180
            try:
                while time.monotonic() < deadline:
                    status = tasks.active_tasks[first]["status"]
                    if status != previous:
                        print(status, flush=True)
                        previous = status
                    if status in tasks.TERMINAL:
                        break
                    time.sleep(.5)
                task = tasks.active_tasks[first]
                assert task["status"] == "completed", task.get("error") or task
                duration = validate_media(task["file_path"], False)
                assert 1.5 <= duration <= 2.5, duration
                assert tasks.active_tasks[cancelled]["status"] == "cancelled"
                assert len(config.get_history()) == 1
                print(f"OK: clipe válido de {duration:.3f}s; cancelamento da fila confirmado.", flush=True)
            finally:
                tasks.shutdown()
                # Wait until the supervisor has released worker handles and cookie jars.
                limit = time.monotonic() + 10
                while tasks._processes and time.monotonic() < limit:
                    time.sleep(.1)


if __name__ == "__main__":
    main()
