import React, { useState } from 'react';
import {
  Clock,
  Layers,
  Sparkles,
  Key,
  Scissors,
  Settings2,
  Sliders,
  DownloadCloud,
  FileImage,
  Zap,
} from 'lucide-react';
import { ExtractionConfig, ExtractionMode, VideoMetadata } from '../types';

interface ExtractionSettingsProps {
  metadata: VideoMetadata;
  startTime: number;
  endTime: number;
  onStartExtraction: (config: ExtractionConfig) => void;
  isProcessing: boolean;
}

export const ExtractionSettings: React.FC<ExtractionSettingsProps> = ({
  metadata,
  startTime,
  endTime,
  onStartExtraction,
  isProcessing,
}) => {
  const [mode, setMode] = useState<ExtractionMode>('interval');
  const [intervalSeconds, setIntervalSeconds] = useState<number>(1.0);
  const [frameStep, setFrameStep] = useState<number>(30);
  const [sceneThreshold, setSceneThreshold] = useState<number>(0.3);
  const [format, setFormat] = useState<'jpg' | 'png' | 'webp'>('jpg');
  const [quality, setQuality] = useState<number>(92);
  const [scalePreset, setScalePreset] = useState<string>('original');

  const effectiveDuration = Math.max(0.1, (endTime || metadata.duration_seconds) - (startTime || 0));

  // Compute estimated frame count
  let estimatedFrames = 0;
  if (mode === 'interval' || mode === 'range') {
    estimatedFrames = Math.max(1, Math.floor(effectiveDuration / Math.max(0.01, intervalSeconds)));
  } else if (mode === 'step') {
    const totalFramesInRange = Math.floor(effectiveDuration * metadata.fps);
    estimatedFrames = Math.max(1, Math.floor(totalFramesInRange / Math.max(1, frameStep)));
  } else if (mode === 'scene') {
    estimatedFrames = Math.max(1, Math.round(effectiveDuration * 0.5)); // rough approximation
  } else if (mode === 'keyframe') {
    estimatedFrames = Math.max(1, Math.round(effectiveDuration * 0.4)); // rough approximation
  }

  const handleExtractClick = () => {
    let scale_width: number | null = null;
    let scale_height: number | null = null;

    if (scalePreset === '1080p') {
      scale_width = 1920;
      scale_height = 1080;
    } else if (scalePreset === '720p') {
      scale_width = 1280;
      scale_height = 720;
    } else if (scalePreset === '480p') {
      scale_width = 854;
      scale_height = 480;
    }

    const config: ExtractionConfig = {
      video_id: metadata.video_id,
      mode,
      interval_seconds: intervalSeconds,
      frame_step: frameStep,
      scene_threshold: sceneThreshold,
      start_time: startTime > 0 ? startTime : undefined,
      end_time: endTime < metadata.duration_seconds ? endTime : undefined,
      format,
      quality,
      scale_width,
      scale_height,
    };

    onStartExtraction(config);
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <Settings2 className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-slate-100">Extraction Parameters</h2>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Est. frames: <span className="font-bold text-indigo-400">~{estimatedFrames}</span>
        </div>
      </div>

      {/* Mode Selection Chips */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Extraction Mode
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: 'interval', label: 'Time Interval', icon: Clock, desc: 'Every X seconds' },
            { id: 'step', label: 'Frame Step', icon: Layers, desc: 'Every N frames' },
            { id: 'scene', label: 'Scene Cuts', icon: Sparkles, desc: 'AI scene changes' },
            { id: 'keyframe', label: 'Keyframes', icon: Key, desc: 'I-frames only' },
            { id: 'range', label: 'Trim Range', icon: Scissors, desc: 'Selected clip' },
          ].map((item) => {
            const Icon = item.icon;
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id as ExtractionMode)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  active
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                </div>
                <div>
                  <div className="text-xs font-semibold">{item.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode-Specific Settings */}
      <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-4">
        {mode === 'interval' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Extraction Frequency (seconds):
              </label>
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                1 frame every {intervalSeconds}s
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min={0.1}
                max={10}
                step={0.1}
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
            {/* Quick preset buttons */}
            <div className="flex items-center space-x-2 pt-1">
              {[0.25, 0.5, 1.0, 2.0, 5.0].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setIntervalSeconds(sec)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition ${
                    intervalSeconds === sec
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'step' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Extract Every N Frames:</label>
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                Every {frameStep} frames (~{(frameStep / metadata.fps).toFixed(2)}s)
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={120}
              step={1}
              value={frameStep}
              onChange={(e) => setFrameStep(parseInt(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex items-center space-x-2 pt-1">
              {[1, 5, 15, 30, 60].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setFrameStep(step)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition ${
                    frameStep === step
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {step === 1 ? 'Every Frame (All)' : `${step}f`}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'scene' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Scene Cut Sensitivity:</label>
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                Threshold: {sceneThreshold}
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.8}
              step={0.05}
              value={sceneThreshold}
              onChange={(e) => setSceneThreshold(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Lower threshold = more frames detected (subtle camera shifts). Higher threshold = only major scene transitions.
            </p>
          </div>
        )}

        {mode === 'keyframe' && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200">Intra-Frame (I-Frame) Extraction</div>
            <p className="text-xs text-slate-400">
              Extracts only native keyframes stored in the video container. This runs with maximum speed and zero generational decoding loss.
            </p>
          </div>
        )}

        {mode === 'range' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-200">
              Trimmed Range: {startTime.toFixed(2)}s → {endTime.toFixed(2)}s ({effectiveDuration.toFixed(2)}s duration)
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Frequency inside range:</span>
              <span className="text-xs font-mono text-indigo-400">1 frame every {intervalSeconds}s</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={5}
              step={0.1}
              value={intervalSeconds}
              onChange={(e) => setIntervalSeconds(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Output Format & Resolution Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        {/* Format */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Format
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            {(['jpg', 'png', 'webp'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`py-1 text-xs font-bold uppercase rounded-lg transition ${
                  format === fmt
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Quality (JPG/WebP) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Quality
            </label>
            <span className="text-xs font-mono text-slate-300">
              {format === 'png' ? 'Lossless' : `${quality}%`}
            </span>
          </div>
          <input
            type="range"
            min={40}
            max={100}
            step={2}
            value={quality}
            disabled={format === 'png'}
            onChange={(e) => setQuality(parseInt(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer disabled:opacity-40 mt-2"
          />
        </div>

        {/* Resolution Scale */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Resolution
          </label>
          <select
            value={scalePreset}
            onChange={(e) => setScalePreset(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="original">Original ({metadata.width} × {metadata.height})</option>
            <option value="1080p">Full HD (1920 × 1080)</option>
            <option value="720p">HD (1280 × 720)</option>
            <option value="480p">SD (854 × 480)</option>
          </select>
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-2">
        <button
          onClick={handleExtractClick}
          disabled={isProcessing}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all transform active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Extracting Frames with FFmpeg...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-current text-amber-300" />
              <span>Extract Frames Now (~{estimatedFrames} frames)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
