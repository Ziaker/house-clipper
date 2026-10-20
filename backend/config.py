import os
import json
from pathlib import Path

# Diretório padrão para downloads House Clipper
DEFAULT_DOWNLOAD_DIR = str(Path.home() / "Downloads" / "HouseClipper")
CONFIG_FILE = Path(__file__).resolve().parent.parent / "config.json"
HISTORY_FILE = Path(__file__).resolve().parent.parent / "history.json"

def get_config():
    if not os.path.exists(DEFAULT_DOWNLOAD_DIR):
        try:
            os.makedirs(DEFAULT_DOWNLOAD_DIR, exist_ok=True)
        except Exception:
            pass

    config = {
        "download_dir": DEFAULT_DOWNLOAD_DIR,
        "theme": "burnt_yellow",
        "default_quality": "best"
    }
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                config.update(saved)
        except Exception:
            pass
    return config

def save_config(new_config: dict):
    config = get_config()
    config.update(new_config)
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print("Erro salvando config:", e)
    return config

def get_history():
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def add_history_item(item: dict):
    history = get_history()
    history.insert(0, item)
    history = history[:100]
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print("Erro salvando history:", e)

def remove_history_item(item_id: str):
    history = get_history()
    history = [item for item in history if item.get("id") != item_id]
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print("Erro removendo item history:", e)
