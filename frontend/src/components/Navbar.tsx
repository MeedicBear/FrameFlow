import React from 'react';
import { Film, Sparkles, Layers } from 'lucide-react';

interface NavbarProps {
  onReset?: () => void;
  hasActiveVideo?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onReset, hasActiveVideo }) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onReset}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Film className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                FrameFlow
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                FFmpeg 7.1
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              High-Precision Video Frame Extraction Engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {hasActiveVideo && (
            <button
              onClick={onReset}
              className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800/60 transition"
            >
              Upload New Video
            </button>
          )}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
};
