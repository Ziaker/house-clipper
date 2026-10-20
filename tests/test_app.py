import concurrent.futures
import json
import queue
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from backend import config, tasks
from backend.local_api import app
from backend.media import extract_storyboard
from backend.worker import validate_media


class AppTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent)
        self.root = Path(self.temp.name)
        self.patches = [
            patch.object(config, "CONFIG_FILE", self.root / "config.json"),
            patch.object(config, "HISTORY_FILE", self.root / "history.json"),
            patch("backend.local_api.COOKIES_JSON_PATH", self.root / "cookies.json")]
        for item in self.patches:
            item.start()
        self.client = TestClient(app, base_url="http://127.0.0.1", headers={"X-House-Clipper": "1"})

    def tearDown(self):
        self.client.close()
        for item in reversed(self.patches):
            item.stop()
        self.temp.cleanup()

    def test_api_requires_custom_header(self):
        response = TestClient(app, base_url="http://127.0.0.1").get("/api/health")
        self.assertEqual(response.status_code, 403)

    def test_cross_origin_and_untrusted_hosts_rejected(self):
        self.assertEqual(self.client.get("/api/cookies", headers={"Origin": "https://evil.example"}).status_code, 403)
        self.assertEqual(self.client.get("/api/health", headers={"Host": "evil.example"}).status_code, 400)
        self.assertEqual(self.client.options("/api/config", headers={"Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST"}).status_code, 403)

    def test_health_and_frontend_available(self):
        self.assertEqual(self.client.get("/api/health").json()["status"], "ok")
        self.assertEqual(self.client.get("/").status_code, 200)
        for path in ("/cookies.json", "/backend/app.py", "/config.json", "/.git/config"):
            self.assertEqual(self.client.get(path).status_code, 404)

    def test_invalid_urls_rejected_before_extraction(self):
        for url in ("file:///etc/passwd", "http://127.0.0.1", "https://youtube.com.evil.example/a",
                    "https://user:pass@youtube.com/watch?v=abc", "https://youtube.com:1234/a"):
            self.assertEqual(self.client.post("/api/info", json={"url": url}).status_code, 422)

    def test_invalid_ranges_and_quality(self):
        request = {"url": "https://youtube.com/watch?v=abcdefghijk", "start_time": 4, "end_time": 2}
        self.assertEqual(self.client.post("/api/clip", json=request).status_code, 400)
        request.update(start_time=0, end_time=10, quality="invalid")
        self.assertEqual(self.client.post("/api/clip", json=request).status_code, 422)

    def test_cookies_not_exposed_and_invalid_update_preserves_existing(self):
        payload = [{"name": "session", "value": "secret", "domain": ".youtube.com"}]
        self.assertEqual(self.client.post("/api/cookies", json={"cookies_json_text": json.dumps(payload)}).status_code, 200)
        response = self.client.get("/api/cookies")
        self.assertNotIn("secret", response.text)
        self.assertNotIn("raw", response.json())
        before = (self.root / "cookies.json").read_bytes()
        for bad in ('"text"', '[{"name":"a"}]', '[{"name":"a","value":"b","domain":"evil.com"}]'):
            self.assertEqual(self.client.post("/api/cookies", json={"cookies_json_text": bad}).status_code, 400)
            self.assertEqual((self.root / "cookies.json").read_bytes(), before)

    def test_history_concurrent_writes_preserve_all_items(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
            list(pool.map(lambda i: config.add_history_item({"id": str(i)}), range(80)))
        self.assertEqual(len(config.get_history()), 80)
        self.assertEqual(len({item["id"] for item in config.get_history()}), 80)

    def test_open_media_only_from_history_and_correct_folder(self):
        path = self.root / "old-downloads" / "clip.mp4"
        path.parent.mkdir()
        path.write_bytes(b"test")
        config.add_history_item({"id": "one", "file_path": str(path)})
        with patch("backend.local_api.open_native") as opener:
            self.assertEqual(self.client.post("/api/open-folder", json={"path": str(path)}).status_code, 200)
            opener.assert_called_once_with(path.parent)
        self.assertEqual(self.client.post("/api/open-file", json={"path": str(self.root / "program.exe")}).status_code, 403)
        path.unlink()
        self.assertEqual(self.client.post("/api/open-file", json={"path": str(path)}).status_code, 404)
        self.assertFalse(self.client.get("/api/history").json()[0]["available"])

    def test_missing_or_empty_media_fails(self):
        path = self.root / "output.mp4"
        with self.assertRaises(ValueError):
            validate_media(path, False)
        path.touch()
        with self.assertRaises(ValueError):
            validate_media(path, False)

    def test_wrong_stream_type_fails_validation(self):
        path = self.root / "output.mp4"
        path.write_bytes(b"media")
        result = subprocess.CompletedProcess([], 0, json.dumps({"format": {"duration": "10"},
            "streams": [{"codec_type": "audio"}]}), "")
        with patch("backend.worker.subprocess.run", return_value=result):
            with self.assertRaises(ValueError):
                validate_media(path, False)
            self.assertEqual(validate_media(path, True), 10)

    def test_queue_cancel_and_retry(self):
        with patch.object(tasks, "_started", True), patch.object(tasks, "active_tasks", {}), patch.object(tasks, "_queue", queue.Queue()):
            task_id = tasks.DownloadManager.start_full_download(url="https://youtu.be/abcdefghijk",
                quality="720", is_audio_only=False, custom_title="One")
            tasks.DownloadManager.cancel(task_id)
            self.assertEqual(tasks.active_tasks[task_id]["status"], "cancelled")
            new_id = tasks.DownloadManager.retry(task_id)
            self.assertNotEqual(new_id, task_id)
            self.assertEqual(tasks.active_tasks[new_id]["status"], "queued")
            self.assertEqual(tasks.active_tasks[new_id]["request"]["quality"], "720")
            with self.assertRaises(ValueError):
                tasks.DownloadManager.retry(new_id)
            self.assertNotIn("request", tasks.DownloadManager.snapshot()[0])

    def test_active_cancel_stops_own_process(self):
        with patch.object(tasks, "active_tasks", {"one": {"status": "downloading"}}), \
             patch.object(tasks, "_processes", {"one": object()}), patch.object(tasks, "stop_process") as stop:
            tasks.DownloadManager.cancel("one")
            stop.assert_called_once()
            self.assertEqual(tasks.active_tasks["one"]["status"], "cancelled")

    def test_storyboard_metadata(self):
        self.assertIsNone(extract_storyboard({"formats": []}))
        data = {"formats": [{"protocol": "mhtml", "width": 160, "height": 90,
            "rows": 5, "columns": 5, "fps": .2, "fragments": [{"url": "https://example.com/sprite.jpg"}]}]}
        self.assertEqual(extract_storyboard(data)["columns"], 5)


if __name__ == "__main__":
    unittest.main()
