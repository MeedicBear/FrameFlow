from pydantic import BaseModel, Field
from typing import Optional, List

class ExtractionRequest(BaseModel):
    video_id: str
    mode: str = Field("interval", description="'interval', 'step', 'scene', 'keyframe', 'range', 'timestamps'")
    interval_seconds: Optional[float] = Field(1.0, description="Extract every X seconds (mode='interval')")
    frame_step: Optional[int] = Field(30, description="Extract every N frames (mode='step')")
    target_fps: Optional[float] = Field(None, description="Extract at target fps e.g. 1.0 (mode='step')")
    scene_threshold: Optional[float] = Field(0.3, description="Scene detection sensitivity 0.0 - 1.0 (mode='scene')")
    start_time: Optional[float] = Field(0.0, description="Start timestamp in seconds")
    end_time: Optional[float] = Field(None, description="End timestamp in seconds (None = end of video)")
    timestamps: Optional[List[float]] = Field(None, description="Explicit list of timestamps to extract")
    format: str = Field("jpg", description="'jpg', 'png', 'webp'")
    quality: Optional[int] = Field(90, description="Quality 1-100 for jpg/webp")
    scale_width: Optional[int] = Field(None, description="Target width (None = original)")
    scale_height: Optional[int] = Field(None, description="Target height (None = original)")

class VideoMetadata(BaseModel):
    video_id: str
    filename: str
    file_size_bytes: int
    duration_seconds: float
    width: int
    height: int
    fps: float
    total_frames: int
    codec: str
    video_url: str

class FrameInfo(BaseModel):
    frame_id: str
    frame_number: int
    timestamp_seconds: float
    timestamp_formatted: str
    filename: str
    url: str
    file_size_bytes: int
    width: int
    height: int

class TaskProgress(BaseModel):
    task_id: str
    status: str  # 'pending', 'processing', 'completed', 'failed'
    progress_percent: float
    frames_extracted: int
    current_timestamp: float
    total_expected_frames: Optional[int] = None
    error: Optional[str] = None
    completed_at: Optional[str] = None
