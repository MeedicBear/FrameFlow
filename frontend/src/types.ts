export interface VideoMetadata {
  video_id: string;
  filename: string;
  file_size_bytes: number;
  duration_seconds: number;
  width: number;
  height: number;
  fps: number;
  total_frames: number;
  codec: string;
  video_url: string;
}

export type ExtractionMode = 'interval' | 'step' | 'scene' | 'keyframe' | 'range';

export interface ExtractionConfig {
  video_id: string;
  mode: ExtractionMode;
  interval_seconds?: number;
  frame_step?: number;
  target_fps?: number;
  scene_threshold?: number;
  start_time?: number;
  end_time?: number;
  format: 'jpg' | 'png' | 'webp';
  quality?: number;
  scale_width?: number | null;
  scale_height?: number | null;
}

export interface TaskProgress {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percent: number;
  frames_extracted: number;
  current_timestamp: number;
  total_expected_frames?: number | null;
  error?: string | null;
  completed_at?: string | null;
}

export interface FrameInfo {
  frame_id: string;
  frame_number: number;
  timestamp_seconds: number;
  timestamp_formatted: string;
  filename: string;
  url: string;
  file_size_bytes: number;
  width: number;
  height: number;
}
