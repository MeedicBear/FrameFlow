import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
  Film,
  Maximize2,
  Sliders,
  Check,
} from 'lucide-react';
import { VideoMetadata } from '../types';

interface VideoPlayerScrubberProps {
  metadata: VideoMetadata;
  videoSrc: string;
  startTime: number;
  endTime: number;
  setStartTime: (t: number) => void;
  setEndTime: (t: number) => void;
  onCurrentTimeChange?: (t: number) => void;
}

export const VideoPlayerScrubber: React.FC<VideoPlayerScrubberProps> = ({
  metadata,
  videoSrc,
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  onCurrentTimeChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const duration = metadata.duration_seconds || 1;
  const frameDuration = metadata.fps > 0 ? 1 / metadata.fps : 1 / 30;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onCurrentTimeChange?.(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onCurrentTimeChange]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(seconds, duration));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const stepFrame = (forward: boolean) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    const newTime = forward
      ? videoRef.current.currentTime + frameDuration
      : videoRef.current.currentTime - frameDuration;
    seekTo(newTime);
  };

  const stepSeconds = (seconds: number) => {
    if (!videoRef.current) return;
    seekTo(videoRef.current.currentTime + seconds);
  };

  const formatTimecode = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hrs > 0 ? `${hrs.toString().padStart(2, '0')}:` : ''}${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
      {/* Video Container */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
          playsInline
        />

        {/* Center overlay play button when paused */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-slate-900/80 border border-slate-700/80 text-white flex items-center justify-center hover:scale-110 transition shadow-2xl backdrop-blur-md"
          >
            <Play className="w-8 h-8 fill-current ml-1 text-indigo-400" />
          </button>
        )}

        {/* Range highlight banner */}
        {(startTime > 0 || endTime < duration) && (
          <div className="absolute top-3 left-3 bg-indigo-500/80 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-lg font-mono font-medium shadow-md flex items-center space-x-1.5 border border-indigo-400/30">
            <span>Trim Active:</span>
            <span>{formatTimecode(startTime)}</span>
            <span>→</span>
            <span>{formatTimecode(endTime)}</span>
          </div>
        )}

        {/* Timecode overlay badge */}
        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-slate-200 text-xs px-2.5 py-1 rounded-md font-mono border border-white/10">
          {formatTimecode(currentTime)} / {formatTimecode(duration)}
        </div>
      </div>

      {/* Scrubber & Trimmer Timeline Bar */}
      <div className="p-4 space-y-3 bg-slate-900/90 border-t border-slate-800/80">
        <div className="relative h-6 flex items-center group">
          {/* Base track */}
          <div className="w-full h-2 bg-slate-800 rounded-full relative overflow-hidden">
            {/* Active Range Highlight */}
            <div
              className="absolute top-0 bottom-0 bg-indigo-500/40 rounded-full border-x border-indigo-400"
              style={{
                left: `${(startTime / duration) * 100}%`,
                width: `${Math.max(0, ((endTime - startTime) / duration) * 100)}%`,
              }}
            />
          </div>

          {/* Interactive Range Seek Bar */}
          <input
            type="range"
            min={0}
            max={duration}
            step={frameDuration}
            value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="absolute w-full h-2 opacity-0 cursor-pointer z-20"
          />

          {/* Current playhead indicator pin */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg shadow-black/50 pointer-events-none border-2 border-indigo-500 transition-transform group-hover:scale-125 z-10"
            style={{ left: `calc(${(currentTime / duration) * 100}% - 8px)` }}
          />
        </div>

        {/* Playback Controls & Frame Stepping */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Left: Playback controls */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => stepSeconds(-1)}
              title="Back 1 second"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => stepFrame(false)}
              title="Previous Frame"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[10px] font-mono ml-0.5 hidden sm:inline">-1f</span>
            </button>

            <button
              onClick={togglePlay}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/20"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => stepFrame(true)}
              title="Next Frame"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center"
            >
              <span className="text-[10px] font-mono mr-0.5 hidden sm:inline">+1f</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => stepSeconds(1)}
              title="Forward 1 second"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Playback speed selector */}
            <div className="pl-2 border-l border-slate-800 hidden sm:flex items-center space-x-1">
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`text-[11px] px-2 py-0.5 rounded font-mono transition ${
                    playbackSpeed === s
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Right: Quick Range Marking */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setStartTime(currentTime)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-medium flex items-center space-x-1 transition"
            >
              <span>Set Start [A]</span>
            </button>

            <button
              onClick={() => setEndTime(currentTime)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-medium flex items-center space-x-1 transition"
            >
              <span>Set End [B]</span>
            </button>

            {(startTime > 0 || endTime < duration) && (
              <button
                onClick={() => {
                  setStartTime(0);
                  setEndTime(duration);
                }}
                className="text-xs px-2 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Reset Trim Range"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Info Footer */}
      <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-y-2">
        <div className="flex items-center space-x-4">
          <span className="font-medium text-slate-200 truncate max-w-[200px] sm:max-w-xs">
            {metadata.filename}
          </span>
          <span className="text-slate-500">•</span>
          <span>
            {metadata.width} × {metadata.height}
          </span>
          <span className="text-slate-500">•</span>
          <span>{metadata.fps} FPS</span>
        </div>

        <div className="flex items-center space-x-3 text-slate-400 font-mono text-[11px]">
          <span>Codec: {metadata.codec.toUpperCase()}</span>
          <span>Total: ~{metadata.total_frames} frames</span>
          <span>{formatBytes(metadata.file_size_bytes)}</span>
        </div>
      </div>
    </div>
  );
};
