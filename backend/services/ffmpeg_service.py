import asyncio
import json
import logging
import os
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from models import ExtractionRequest, FrameInfo, TaskProgress, VideoMetadata

logger = logging.getLogger("video_extractor")

def get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
    return Path(__file__).resolve().parent.parent

def get_data_dir() -> Path:
    if getattr(sys, "frozen", False):
        local_app_data = os.environ.get("LOCALAPPDATA")
        if local_app_data:
            path = Path(local_app_data) / "FrameFlow" / "data"
            path.mkdir(parents=True, exist_ok=True)
            return path
    return Path(__file__).resolve().parent.parent / "data"

def get_ffmpeg_bin() -> str:
    base = get_base_dir()
    candidate = base / "bin" / "ffmpeg.exe"
    if candidate.exists():
        return str(candidate)
    backend_bin = Path(__file__).resolve().parent.parent / "bin" / "ffmpeg.exe"
    if backend_bin.exists():
        return str(backend_bin)
    return "ffmpeg"

def get_ffprobe_bin() -> str:
    base = get_base_dir()
    candidate = base / "bin" / "ffprobe.exe"
    if candidate.exists():
        return str(candidate)
    backend_bin = Path(__file__).resolve().parent.parent / "bin" / "ffprobe.exe"
    if backend_bin.exists():
        return str(backend_bin)
    return "ffprobe"

DATA_DIR = get_data_dir()
UPLOADS_DIR = DATA_DIR / "uploads"
TASKS_DIR = DATA_DIR / "tasks"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
TASKS_DIR.mkdir(parents=True, exist_ok=True)

# In-memory store for active task statuses
tasks_db: Dict[str, TaskProgress] = {}
tasks_frames: Dict[str, List[FrameInfo]] = {}
videos_metadata: Dict[str, VideoMetadata] = {}


def format_timestamp(seconds: float) -> str:
    """Formats seconds into HH:MM:SS.mmm string."""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hrs:02d}:{mins:02d}:{secs:06.3f}"


def parse_fps(fps_str: str) -> float:
    """Parses fractional fps like 30000/1001 or 30/1 to float."""
    try:
        if "/" in fps_str:
            num, denom = fps_str.split("/")
            return float(num) / float(denom) if float(denom) != 0 else 30.0
        return float(fps_str)
    except Exception:
        return 30.0


async def probe_video(file_path: Path, video_id: str, original_filename: str, base_url: str = "") -> VideoMetadata:
    """Runs ffprobe to retrieve video metadata."""
    cmd = [
        get_ffprobe_bin(),
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(file_path)
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"FFprobe failed: {stderr.decode('utf-8', errors='ignore')}")

    data = json.loads(stdout.decode("utf-8"))
    
    # Locate video stream
    video_stream = None
    for s in data.get("streams", []):
        if s.get("codec_type") == "video":
            video_stream = s
            break

    if not video_stream:
        raise ValueError("No video stream found in uploaded file")

    format_info = data.get("format", {})
    duration = float(video_stream.get("duration") or format_info.get("duration") or 0.0)
    width = int(video_stream.get("width", 0))
    height = int(video_stream.get("height", 0))
    fps_val = parse_fps(video_stream.get("avg_frame_rate", video_stream.get("r_frame_rate", "30/1")))
    
    nb_frames_raw = video_stream.get("nb_frames")
    if nb_frames_raw and nb_frames_raw.isdigit():
        total_frames = int(nb_frames_raw)
    else:
        total_frames = int(duration * fps_val) if duration > 0 else 0

    codec = video_stream.get("codec_name", "unknown")
    file_size = file_path.stat().st_size

    metadata = VideoMetadata(
        video_id=video_id,
        filename=original_filename,
        file_size_bytes=file_size,
        duration_seconds=round(duration, 3),
        width=width,
        height=height,
        fps=round(fps_val, 2),
        total_frames=total_frames,
        codec=codec,
        video_url=f"/api/videos/{video_id}/stream"
    )

    videos_metadata[video_id] = metadata
    return metadata


def build_ffmpeg_filter(req: ExtractionRequest, video_fps: float) -> Tuple[str, List[str]]:
    """Builds the -vf filter string and additional options for FFmpeg based on request."""
    filters = []

    # 1. Extraction mode filter
    if req.mode == "interval":
        interval = max(req.interval_seconds or 1.0, 0.01)
        fps_expr = f"fps=1/{interval}"
        filters.append(fps_expr)
    elif req.mode == "step":
        if req.target_fps and req.target_fps > 0:
            filters.append(f"fps={req.target_fps}")
        else:
            step = max(req.frame_step or 30, 1)
            filters.append(f"select='not(mod(n\\,{step}))'")
    elif req.mode == "scene":
        threshold = max(0.01, min(req.scene_threshold or 0.3, 1.0))
        filters.append(f"select='gt(scene\\,{threshold})'")
    elif req.mode == "keyframe":
        filters.append("select='eq(pict_type\\,I)'")
    elif req.mode == "range":
        # Range is handled by -ss and -to, interval can still apply
        interval = max(req.interval_seconds or 1.0, 0.01)
        filters.append(f"fps=1/{interval}")

    # 2. Scaling filter
    if req.scale_width or req.scale_height:
        w = req.scale_width if req.scale_width else -1
        h = req.scale_height if req.scale_height else -1
        # Ensure even dimensions for compatibility
        filters.append(f"scale={w}:{h}")

    vf_str = ",".join(filters) if filters else ""

    extra_args = []
    # If using select filter, use variable frame rate output so timestamps are preserved
    if req.mode in ["scene", "keyframe", "step"] and not (req.mode == "step" and req.target_fps):
        extra_args.extend(["-vsync", "vfr"])

    return vf_str, extra_args


async def run_extraction_process(task_id: str, video_path: Path, req: ExtractionRequest, metadata: VideoMetadata):
    """Executes FFmpeg extraction asynchronously while streaming progress."""
    task_dir = TASKS_DIR / task_id
    frames_dir = task_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    progress = TaskProgress(
        task_id=task_id,
        status="processing",
        progress_percent=0.0,
        frames_extracted=0,
        current_timestamp=req.start_time or 0.0,
        total_expected_frames=None
    )
    tasks_db[task_id] = progress
    tasks_frames[task_id] = []

    # Calculate effective duration
    start_sec = max(req.start_time or 0.0, 0.0)
    end_sec = min(req.end_time if req.end_time else metadata.duration_seconds, metadata.duration_seconds)
    effective_duration = max(end_sec - start_sec, 0.1)

    # Estimate expected frames
    if req.mode == "interval" or req.mode == "range":
        interval = max(req.interval_seconds or 1.0, 0.01)
        progress.total_expected_frames = int(effective_duration / interval) + 1
    elif req.mode == "step":
        if req.target_fps:
            progress.total_expected_frames = int(effective_duration * req.target_fps)
        elif metadata.fps > 0 and req.frame_step:
            total_range_frames = int(effective_duration * metadata.fps)
            progress.total_expected_frames = int(total_range_frames / req.frame_step) + 1

    # Output file extension and quality params
    ext = req.format.lower()
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        ext = "jpg"
    if ext == "jpeg":
        ext = "jpg"

    quality_args = []
    if ext == "jpg":
        # qscale:v 2 (best) to 31 (worst)
        q = max(1, min(req.quality or 90, 100))
        qscale = max(2, int(31 - ((q - 1) / 99) * 29))
        quality_args = ["-qscale:v", str(qscale)]
    elif ext == "webp":
        q = max(1, min(req.quality or 90, 100))
        quality_args = ["-quality", str(q)]
    elif ext == "png":
        quality_args = ["-compression_level", "3"]

    vf_str, extra_args = build_ffmpeg_filter(req, metadata.fps)
    output_pattern = str(frames_dir / f"frame_%05d.{ext}")

    # Build full ffmpeg command
    cmd = [get_ffmpeg_bin(), "-y"]

    # Accurate seeking: input seek if start > 0
    if start_sec > 0:
        cmd.extend(["-ss", str(start_sec)])

    cmd.extend(["-i", str(video_path)])

    if end_sec < metadata.duration_seconds:
        # If we already seeked -ss before -i, duration is (end_sec - start_sec)
        cmd.extend(["-t", str(effective_duration)])

    if vf_str:
        cmd.extend(["-vf", vf_str])

    cmd.extend(extra_args)
    cmd.extend(quality_args)
    cmd.extend(["-progress", "pipe:1", output_pattern])

    logger.info(f"Starting extraction for task {task_id}: {' '.join(cmd)}")

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        # Parse -progress output line by line
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            line_str = line.decode("utf-8", errors="ignore").strip()
            if "=" in line_str:
                k, v = line_str.split("=", 1)
                if k == "frame":
                    try:
                        progress.frames_extracted = int(v)
                    except ValueError:
                        pass
                elif k == "out_time_ms":
                    try:
                        time_sec = float(v) / 1_000_000.0
                        progress.current_timestamp = round(start_sec + time_sec, 3)
                        if effective_duration > 0:
                            pct = min(round((time_sec / effective_duration) * 100, 1), 99.0)
                            progress.progress_percent = pct
                    except ValueError:
                        pass
                elif k == "progress" and v == "end":
                    progress.progress_percent = 100.0

        await proc.wait()

        if proc.returncode != 0:
            stderr_out = await proc.stderr.read()
            err_msg = stderr_out.decode("utf-8", errors="ignore")
            logger.error(f"FFmpeg error: {err_msg}")
            progress.status = "failed"
            progress.error = err_msg[-500:]  # last 500 chars
            return

        # Scan frames and build frame info list
        generated_files = sorted(frames_dir.glob(f"frame_*.{ext}"))
        frame_list: List[FrameInfo] = []

        total_gen = len(generated_files)
        for idx, f in enumerate(generated_files):
            # Estimate timestamp
            if total_gen > 1:
                t_offset = (idx / (total_gen - 1)) * effective_duration
            else:
                t_offset = 0.0
            frame_ts = round(start_sec + t_offset, 3)
            
            frame_info = FrameInfo(
                frame_id=f"{task_id}_{idx+1:05d}",
                frame_number=idx + 1,
                timestamp_seconds=frame_ts,
                timestamp_formatted=format_timestamp(frame_ts),
                filename=f.name,
                url=f"/api/tasks/{task_id}/frames/{f.name}",
                file_size_bytes=f.stat().st_size,
                width=req.scale_width or metadata.width,
                height=req.scale_height or metadata.height
            )
            frame_list.append(frame_info)

        tasks_frames[task_id] = frame_list
        progress.frames_extracted = len(frame_list)
        progress.progress_percent = 100.0
        progress.status = "completed"
        progress.completed_at = datetime.now().isoformat()
        logger.info(f"Task {task_id} completed with {len(frame_list)} frames.")

    except Exception as e:
        logger.exception(f"Exception during extraction for {task_id}: {e}")
        progress.status = "failed"
        progress.error = str(e)


def create_zip_archive(task_id: str, frame_filenames: Optional[List[str]] = None) -> Path:
    """Zips the extracted frames for a task and returns the zip file path."""
    task_dir = TASKS_DIR / task_id
    frames_dir = task_dir / "frames"
    zip_path = task_dir / f"{task_id}_frames.zip"

    if not frames_dir.exists():
        raise FileNotFoundError(f"Frames directory for task {task_id} does not exist")

    # If specific filenames requested, filter; otherwise include all frames
    if frame_filenames and len(frame_filenames) > 0:
        files_to_zip = [frames_dir / fn for fn in frame_filenames if (frames_dir / fn).exists()]
    else:
        files_to_zip = sorted(list(frames_dir.iterdir()))

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in files_to_zip:
            if f.is_file() and not f.name.endswith(".zip"):
                zf.write(f, arcname=f.name)

    return zip_path
