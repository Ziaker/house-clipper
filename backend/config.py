import json
import os
import tempfile
import threading
from pathlib import Path

DEFAULT_DOWNLOAD_DIR = str(Path.home() / 'Downloads' / 'HouseClipper')
ROOT = Path(__file__).resolve().parent.parent
CONFIG_FILE = ROOT / 'config.json'
HISTORY_FILE = ROOT / 'history.json'
STORAGE_LOCK = threading.RLock()


def atomic_json(path, data):
    path = Path(path)
    with STORAGE_LOCK:
        fd, temporary = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as stream:
                json.dump(data, stream, ensure_ascii=False, indent=2)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)


def read_json(path, default):
    with STORAGE_LOCK:
        if not Path(path).exists():
            return default
        with open(path, encoding='utf-8') as stream:
            return json.load(stream)


def get_config():
    return {'download_dir': DEFAULT_DOWNLOAD_DIR, 'theme': 'burnt_yellow',
            'default_quality': 'best', **read_json(CONFIG_FILE, {})}


def save_config(new_config):
    with STORAGE_LOCK:
        config = {**get_config(), **new_config}
        atomic_json(CONFIG_FILE, config)
        return config


def get_history():
    return read_json(HISTORY_FILE, [])


def add_history_item(item):
    with STORAGE_LOCK:
        history = get_history()
        history.insert(0, item)
        atomic_json(HISTORY_FILE, history[:1000])


def remove_history_item(item_id):
    with STORAGE_LOCK:
        atomic_json(HISTORY_FILE, [x for x in get_history() if x.get('id') != item_id])
