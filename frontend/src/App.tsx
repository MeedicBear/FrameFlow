import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { UploadDropzone } from './components/UploadDropzone';
import { VideoPlayerScrubber } from './components/VideoPlayerScrubber';
import { ExtractionSettings } from './components/ExtractionSettings';
import { ProgressBar } from './components/ProgressBar';
import { FrameGallery } from './components/FrameGallery';
import { VideoMetadata, ExtractionConfig, TaskProgress, FrameInfo } from './types';
import { Sparkles, Video, ArrowDownCircle, CheckCircle, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isLoadingUpload, setIsLoadingUpload] = useState<boolean>(false);

  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState<TaskProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [frames, setFrames] = useState<FrameInfo[]>([]);

  const handleVideoLoaded = (meta: VideoMetadata, localUrl?: string) => {
    setMetadata(meta);
    setVideoSrc(localUrl || meta.video_url);
    setStartTime(0);
    setEndTime(meta.duration_seconds);
    setFrames([]);
    setActiveTaskId(null);
    setTaskProgress(null);
  };

  const handleReset = () => {
    setMetadata(null);
    setVideoSrc('');
    setStartTime(0);
    setEndTime(0);
    setFrames([]);
    setActiveTaskId(null);
    setTaskProgress(null);
    setIsProcessing(false);
  };

  const handleStartExtraction = async (config: ExtractionConfig) => {
    setIsProcessing(true);
    setFrames([]);
    setTaskProgress({
      task_id: '',
      status: 'pending',
      progress_percent: 0,
      frames_extracted: 0,
      current_timestamp: startTime,
    });

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to start extraction' }));
        throw new Error(err.detail || 'Extraction failed');
      }

      const data = await res.json();
      const taskId = data.task_id;
      setActiveTaskId(taskId);

      // Start Server-Sent Events (SSE) listener for real-time progress
      const eventSource = new EventSource(`/api/tasks/${taskId}/events`);

      eventSource.onmessage = (event) => {
        try {
          const progress: TaskProgress = JSON.parse(event.data);
          setTaskProgress(progress);

          if (progress.status === 'completed') {
            eventSource.close();
            setIsProcessing(false);
            // Fetch generated frames
            fetchFrames(taskId);
          } else if (progress.status === 'failed') {
            eventSource.close();
            setIsProcessing(false);
          }
        } catch (e) {
          console.error('Error parsing SSE event:', e);
        }
      };

      eventSource.onerror = (e) => {
        console.error('SSE error:', e);
        eventSource.close();
        // Fallback to polling once
        checkFallbackStatus(taskId);
      };
    } catch (err: any) {
      alert(err.message || 'Failed to start extraction');
      setIsProcessing(false);
    }
  };

  const checkFallbackStatus = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/progress`);
      if (res.ok) {
        const progress: TaskProgress = await res.json();
        setTaskProgress(progress);
        if (progress.status === 'completed') {
          setIsProcessing(false);
          fetchFrames(taskId);
        } else if (progress.status === 'failed') {
          setIsProcessing(false);
        } else {
          // Retry poll after 1s
          setTimeout(() => checkFallbackStatus(taskId), 1000);
        }
      }
    } catch (e) {
      setIsProcessing(false);
    }
  };

  const fetchFrames = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/frames`);
      if (res.ok) {
        const frameList: FrameInfo[] = await res.json();
        setFrames(frameList);
      }
    } catch (err) {
      console.error('Failed to fetch frames:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar onReset={handleReset} hasActiveVideo={!!metadata} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {!metadata ? (
          /* Empty / Upload View */
          <div className="py-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Video Processing Suite</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                Extract Perfect Video Frames in Seconds
              </h1>
              <p className="text-base text-slate-400">
                Extract lossless PNG, JPG, or WebP frames at exact timestamps, intervals, or scene cuts. Powered by FFmpeg 7.1 with instantaneous ZIP export.
              </p>
            </div>

            <UploadDropzone
              onVideoLoaded={handleVideoLoaded}
              isLoading={isLoadingUpload}
              setIsLoading={setIsLoadingUpload}
            />

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-6">
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Video className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">Interactive Player & Trimmer</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Scrub frame-by-frame, mark range in/out markers, and inspect timestamps before extracting.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">Smart Extraction Modes</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Choose from time intervals, target FPS, keyframe detection, or AI scene change thresholds.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ArrowDownCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">Batch ZIP Packaging</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Download all frames or multi-select specific highlights and package into a ZIP instantly.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active Video Workspace */
          <div className="space-y-8 animate-fadeIn">
            {/* Top Workspace Grid: Video Player + Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Player & Scrubber (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <VideoPlayerScrubber
                  metadata={metadata}
                  videoSrc={videoSrc}
                  startTime={startTime}
                  endTime={endTime}
                  setStartTime={setStartTime}
                  setEndTime={setEndTime}
                />
              </div>

              {/* Right Column: Parameters & Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <ExtractionSettings
                  metadata={metadata}
                  startTime={startTime}
                  endTime={endTime}
                  onStartExtraction={handleStartExtraction}
                  isProcessing={isProcessing}
                />
              </div>
            </div>

            {/* Live Progress Bar */}
            {taskProgress && (
              <div className="max-w-7xl mx-auto">
                <ProgressBar progress={taskProgress} />
              </div>
            )}

            {/* Frame Gallery */}
            {activeTaskId && frames.length > 0 && (
              <div className="max-w-7xl mx-auto">
                <FrameGallery taskId={activeTaskId} frames={frames} />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/60 bg-slate-950/80 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center space-x-2">
            <span>FrameFlow &copy; 2026</span>
            <span>•</span>
            <span>High Performance Native Video Processing</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Local Processing Engine</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
