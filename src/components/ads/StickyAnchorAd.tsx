import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { AdManagerBanner, AD_MANAGER_SLOTS } from './AdManagerBanner';

interface StickyAnchorAdProps {
  isFullView?: boolean;
}

export const StickyAnchorAd: React.FC<StickyAnchorAdProps> = ({ isFullView = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div
      id="sticky-anchor-ad-wrapper"
      className={`fixed bottom-0 inset-x-0 z-50 flex flex-col items-center justify-center transition-all duration-300 pointer-events-auto select-none ${
        isFullView ? 'pb-1' : 'pb-0'
      }`}
    >
      {/* Floating Minimize/Close Tab */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-t-xl bg-slate-900/95 border-t border-x border-slate-700/80 backdrop-blur-md shadow-2xl">
        <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" />
          SPONSORED
        </span>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold flex items-center gap-0.5 transition"
          title={isCollapsed ? 'Expand Ad' : 'Collapse Ad'}
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3 h-3" />
              <span>Show</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>Hide</span>
            </>
          )}
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          className="px-1 py-0.5 rounded text-slate-500 hover:text-rose-400 text-[10px] font-bold transition"
          title="Dismiss ad for this session"
        >
          ✕
        </button>
      </div>

      {/* Main Sticky Banner Body */}
      {!isCollapsed && (
        <div className="w-full max-w-4xl mx-auto bg-slate-950/95 border-t border-slate-800 backdrop-blur-xl shadow-2xl px-2 py-1 flex items-center justify-center">
          <AdManagerBanner
            slot={AD_MANAGER_SLOTS.DISPLAY_5}
            label="STICKY ADVERTISEMENT"
            className="border-0 bg-transparent p-0 shadow-none"
          />
        </div>
      )}
    </div>
  );
};
