import React from 'react';
import { AlertCircle, CheckCircle2, Film } from 'lucide-react';
import { TaskProgress } from '../types';

interface ProgressBarProps {
  progress: TaskProgress | null;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  if (!progress) return null;

  const isCompleted = progress.status === 'completed';
  const isFailed = progress.status === 'failed';

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : isFailed ? (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          ) : (
            <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          )}
          <span className="text-sm font-bold text-slate-100">
            {isCompleted
              ? 'Extraction Completed!'
              : isFailed
              ? 'Extraction Failed'
              : 'Extracting frames in real-time...'}
          </span>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-slate-400">Frames:</span>
          <span className="font-bold text-indigo-400">{progress.frames_extracted}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-200">{progress.progress_percent.toFixed(0)}%</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isCompleted
              ? 'bg-emerald-500'
              : isFailed
              ? 'bg-rose-500'
              : 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400'
          }`}
          style={{ width: `${Math.max(2, Math.min(progress.progress_percent, 100))}%` }}
        />
      </div>

      {isFailed && progress.error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono break-all">
          {progress.error}
        </div>
      )}
    </div>
  );
};
