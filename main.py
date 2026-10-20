import sys
import time
import socket
import threading
import webbrowser
import uvicorn
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app import app

def find_free_port(start_port=8520):
    port = start_port
    while port < 65535:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
            port += 1
    return start_port

def run_server(port):
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")

def wait_for_server(port, timeout=10):
    start = time.time()
    while time.time() - start < timeout:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) == 0:
                return True
        time.sleep(0.1)
    return False

def main():
    port = find_free_port()
    url = f"http://127.0.0.1:{port}"

    server_thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    server_thread.start()

    if not wait_for_server(port):
        print("Erro ao iniciar o servidor backend do House Clipper.")
        sys.exit(1)

    print(f"House Clipper rodando em {url}")

    opened_window = False
    try:
        import webview
        print("Iniciando janela nativa do House Clipper...")
        window = webview.create_window(
            title="House Clipper - v1.1.0",
            url=url,
            width=1260,
            height=860,
            min_size=(920, 620),
            background_color="#0b0906"
        )
        opened_window = True
        webview.start()
    except Exception as e:
        print("Aviso: Janela nativa indisponível, abrindo no navegador padrão:", e)
        opened_window = False

    if not opened_window:
        webbrowser.open(url)
        print("Pressione Ctrl+C para encerrar o aplicativo.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Encerrando House Clipper...")

if __name__ == "__main__":
    main()
