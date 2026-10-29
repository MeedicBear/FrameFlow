import React, { useRef, useState } from 'react';
import { UploadCloud, Film, PlayCircle, AlertCircle, FileVideo, CheckCircle2 } from 'lucide-react';
import { VideoMetadata } from '../types';

interface UploadDropzoneProps {
  onVideoLoaded: (metadata: VideoMetadata, localUrl?: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onVideoLoaded,
  isLoading,
  setIsLoading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|avi|mkv|webm|flv|m4v)$/i)) {
      setErrorMsg('Please upload a valid video file (.mp4, .mov, .webm, .mkv, .avi)');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    setUploadPercent(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadPercent(40);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errData.detail || 'Upload failed');
      }

      setUploadPercent(90);
      const metadata: VideoMetadata = await res.json();
      
      // Also create a local blob URL for instant zero-latency playback preview
      const localUrl = URL.createObjectURL(file);
      setUploadPercent(100);
      setTimeout(() => {
        setIsLoading(false);
        onVideoLoaded(metadata, localUrl);
      }, 300);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload video');
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const loadSampleVideo = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setUploadPercent(30);
    try {
      // Fetch sample_test.mp4 from backend or root
      const sampleRes = await fetch('/sample_test.mp4');
      let blob: Blob;
      if (sampleRes.ok) {
        blob = await sampleRes.blob();
      } else {
        throw new Error('Sample video not found. Please upload your own video.');
      }

      const sampleFile = new File([blob], 'sample_test.mp4', { type: 'video/mp4' });
      await handleFile(sampleFile);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not load sample video');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-200 cursor-pointer ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
        } ${isLoading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mkv,.mov"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition shadow-inner">
            {isLoading ? (
              <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-10 h-10" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-100">
              {isLoading ? 'Analyzing Video with FFprobe...' : 'Drop your video here, or browse'}
            </h3>
            <p className="text-sm text-slate-400 max-w-md">
              Supports MP4, MOV, WebM, MKV, and AVI. High-performance native frame extraction without browser memory bottlenecks.
            </p>
          </div>

          {isLoading ? (
            <div className="w-64 max-w-full space-y-2 pt-2">
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
              <p className="text-xs text-indigo-400 font-mono">Probing video stream metadata...</p>
            </div>
          ) : (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
                Max Quality Lossless
              </span>
              <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
                Scene Cut AI
              </span>
              <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
                Frame-by-Frame Precision
              </span>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Demo Video Helper */}
      <div className="mt-6 flex items-center justify-center">
        <button
          onClick={loadSampleVideo}
          disabled={isLoading}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-indigo-400 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 px-4 py-2 rounded-xl transition shadow-sm"
        >
          <PlayCircle className="w-4 h-4 text-indigo-400" />
          <span>Quick Test with 5s Synthetic Sample Video</span>
        </button>
      </div>
    </div>
  );
};
