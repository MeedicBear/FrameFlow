import React, { useState, useEffect } from 'react';
import {
  Download,
  Archive,
  CheckSquare,
  Square,
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  FileImage,
  ExternalLink,
} from 'lucide-react';
import { FrameInfo } from '../types';

interface FrameGalleryProps {
  taskId: string;
  frames: FrameInfo[];
}

export const FrameGallery: React.FC<FrameGalleryProps> = ({ taskId, frames }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : frames.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null && prev < frames.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, frames.length]);

  const toggleSelect = (filename: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(frames.map((f) => f.filename)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const downloadSingleFrame = (frame: FrameInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = frame.url;
    link.download = frame.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadZip = async (selectedOnly: boolean = false) => {
    setIsZipping(true);
    try {
      const filenames = selectedOnly ? Array.from(selectedIds) : undefined;
      const res = await fetch(`/api/tasks/${taskId}/export-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame_filenames: filenames }),
      });

      if (!res.ok) throw new Error('Failed to generate ZIP');
      const data = await res.json();

      const link = document.createElement('a');
      link.href = data.zip_url;
      link.download = data.filename || `frames_${taskId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Could not download zip archive.');
    } finally {
      setIsZipping(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!frames || frames.length === 0) {
    return null;
  }

  const activeLightboxFrame = lightboxIndex !== null ? frames[lightboxIndex] : null;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
      {/* Gallery Header & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Extracted Frames Gallery ({frames.length})
            </h3>
            <p className="text-xs text-slate-400">
              Click any frame to inspect full-size, or select frames to export.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Select Controls */}
          {selectedIds.size > 0 ? (
            <button
              onClick={clearSelection}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition"
            >
              Deselect ({selectedIds.size})
            </button>
          ) : (
            <button
              onClick={selectAll}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition"
            >
              Select All
            </button>
          )}

          {/* Download Selected */}
          {selectedIds.size > 0 && (
            <button
              onClick={() => downloadZip(true)}
              disabled={isZipping}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Download Selected ({selectedIds.size}) ZIP</span>
            </button>
          )}

          {/* Download All ZIP */}
          <button
            onClick={() => downloadZip(false)}
            disabled={isZipping}
            className="text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            {isZipping ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Archive className="w-3.5 h-3.5" />
            )}
            <span>Download All ({frames.length}) ZIP</span>
          </button>
        </div>
      </div>

      {/* Frame Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {frames.map((frame, index) => {
          const isSelected = selectedIds.has(frame.filename);
          return (
            <div
              key={frame.frame_id}
              onClick={() => setLightboxIndex(index)}
              className={`group relative bg-slate-950 rounded-xl overflow-hidden border transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/10'
                  : 'border-slate-800 hover:border-slate-700 hover:shadow-md'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="aspect-video bg-black/60 relative overflow-hidden flex items-center justify-center">
                <img
                  src={frame.url}
                  alt={frame.filename}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />

                {/* Selection Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(frame.filename);
                  }}
                  className={`absolute top-2 left-2 p-1 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-black/60 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-black/80'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

                {/* Single frame download button overlay */}
                <button
                  type="button"
                  onClick={(e) => downloadSingleFrame(frame, e)}
                  title="Download Frame"
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-slate-200 opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Hover inspect hint */}
                <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                  <div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] text-white flex items-center space-x-1">
                    <ZoomIn className="w-3 h-3 text-indigo-400" />
                    <span>View</span>
                  </div>
                </div>

                {/* Timestamp Pill */}
                <div className="absolute bottom-1.5 right-1.5 bg-black/75 backdrop-blur-sm text-slate-200 text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10">
                  {frame.timestamp_formatted.replace(/^00:/, '')}
                </div>
              </div>

              {/* Card Meta footer */}
              <div className="p-2 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 border-t border-slate-800/80">
                <span className="font-mono text-slate-300">#{frame.frame_number}</span>
                <span className="font-mono text-[10px] text-slate-500">
                  {formatFileSize(frame.file_size_bytes)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {activeLightboxFrame && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between text-white max-w-7xl mx-auto w-full z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3">
              <span className="text-sm font-bold font-mono">
                Frame {lightboxIndex + 1} of {frames.length}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-indigo-400 font-mono">
                Time: {activeLightboxFrame.timestamp_formatted}
              </span>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                {activeLightboxFrame.width} × {activeLightboxFrame.height}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => downloadSingleFrame(activeLightboxFrame, e)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Frame</span>
              </button>
              <button
                onClick={() => setLightboxIndex(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Image with Previous/Next Arrows */}
          <div
            className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Arrow */}
            <button
              onClick={() =>
                setLightboxIndex((prev) =>
                  prev !== null && prev > 0 ? prev - 1 : frames.length - 1
                )
              }
              className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white transition backdrop-blur-md shadow-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Main Preview */}
            <img
              src={activeLightboxFrame.url}
              alt={activeLightboxFrame.filename}
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
            />

            {/* Next Arrow */}
            <button
              onClick={() =>
                setLightboxIndex((prev) =>
                  prev !== null && prev < frames.length - 1 ? prev + 1 : 0
                )
              }
              className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white transition backdrop-blur-md shadow-lg"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Thumbnails Strip */}
          <div
            className="max-w-4xl mx-auto w-full overflow-x-auto py-2 flex items-center space-x-2 justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {frames.slice(Math.max(0, lightboxIndex - 4), lightboxIndex + 5).map((f) => {
              const idx = frames.findIndex((x) => x.frame_id === f.frame_id);
              const isActive = idx === lightboxIndex;
              return (
                <button
                  key={f.frame_id}
                  onClick={() => setLightboxIndex(idx)}
                  className={`w-14 h-9 rounded-md overflow-hidden border transition shrink-0 ${
                    isActive
                      ? 'border-indigo-400 ring-2 ring-indigo-400 scale-105'
                      : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={f.url} alt="" className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
