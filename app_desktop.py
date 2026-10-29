import os
import sys
import time
import socket
import threading
import urllib.request
import webbrowser
from pathlib import Path

# Add backend directory to path
if getattr(sys, "frozen", False):
    base_dir = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    sys.path.insert(0, str(base_dir / "backend"))
else:
    base_dir = Path(__file__).resolve().parent
    sys.path.insert(0, str(base_dir / "backend"))

import uvicorn
from main import app


def find_free_port(start_port: int = 8000) -> int:
    """Finds an available local port starting from start_port."""
    for port in range(start_port, start_port + 100):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return 8000


def wait_for_server(url: str, timeout: float = 10.0) -> bool:
    """Polls the server until it responds to health check."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(f"{url}/api/health", timeout=1.0) as res:
                if res.status == 200:
                    return True
        except Exception:
            time.sleep(0.15)
    return False


def start_server(port: int):
    import asyncio
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    config = uvicorn.Config(
        app=app,
        host="127.0.0.1",
        port=port,
        log_level="error",
        access_log=False,
        loop="asyncio",
    )
    server = uvicorn.Server(config)
    server.run()


def main():
    # In windowed PyInstaller executables (console=False), sys.stdout and sys.stderr are None
    if sys.stdout is None:
        try:
            log_dir = Path(os.environ.get("LOCALAPPDATA", ".")) / "FrameFlow"
            log_dir.mkdir(parents=True, exist_ok=True)
            sys.stdout = open(log_dir / "app.log", "a", encoding="utf-8")
        except Exception:
            sys.stdout = open(os.devnull, "w")
    elif hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    if sys.stderr is None:
        try:
            log_dir = Path(os.environ.get("LOCALAPPDATA", ".")) / "FrameFlow"
            log_dir.mkdir(parents=True, exist_ok=True)
            sys.stderr = open(log_dir / "app.log", "a", encoding="utf-8")
        except Exception:
            sys.stderr = open(os.devnull, "w")
    elif hasattr(sys.stderr, "reconfigure"):
        try:
            sys.stderr.reconfigure(encoding="utf-8")
        except Exception:
            pass

    port = find_free_port(8000)
    server_url = f"http://127.0.0.1:{port}"

    # Start FastAPI server in background thread
    server_thread = threading.Thread(target=start_server, args=(port,), daemon=True)
    server_thread.start()

    # Wait for server ready
    wait_for_server(server_url)

    # Attempt to open as native WebView2 desktop window
    opened_window = False
    try:
        import webview

        window = webview.create_window(
            title="FrameFlow - Video Frame Extractor",
            url=server_url,
            width=1320,
            height=880,
            min_size=(980, 640),
            background_color="#020617",
            text_select=True,
        )
        opened_window = True
        webview.start()
    except Exception as e:
        print(f"pywebview window creation failed ({e}), falling back to default browser...")

    if not opened_window:
        webbrowser.open(server_url)
        print(f"FrameFlow running at: {server_url}")
        print("Press Ctrl+C to close.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
