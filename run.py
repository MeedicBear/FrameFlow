import os
import sys
from pathlib import Path
import uvicorn

if sys.platform == "win32" and sys.stdout is not None and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to Python module search path
backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    print("=" * 65)
    print("  FrameFlow - Video Frame Extractor Application")
    print("  Server URL: http://localhost:8000")
    print("  Extracted Frames & Data: ./backend/data")
    print("=" * 65)
    
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        app_dir=str(backend_dir),
        reload=False
    )
