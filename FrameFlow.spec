# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path
import os
import sys

block_cipher = None

project_dir = Path.cwd()

# Data files to bundle inside the executable package:
# (source_path, target_folder_in_bundle)
datas = [
    (str(project_dir / "frontend" / "dist"), "frontend/dist"),
    (str(project_dir / "backend"), "backend"),
    (str(project_dir / "backend" / "bin" / "ffmpeg.exe"), "bin"),
    (str(project_dir / "backend" / "bin" / "ffprobe.exe"), "bin"),
]

hiddenimports = [
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "uvicorn.lifespan.off",
    "fastapi",
    "starlette",
    "python_multipart",
    "aiofiles",
    "pydantic",
    "pydantic_core",
    "webview",
    "clr_loader",
    "pythonnet",
]

a = Analysis(
    ['app_desktop.py'],
    pathex=[str(project_dir), str(project_dir / "backend")],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='FrameFlow',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # Desktop window mode (no black console prompt)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='FrameFlow',
)
