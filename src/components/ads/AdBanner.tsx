import React, { useEffect, useId, useState } from 'react';
import { adManager } from '../../utils/adManager';
import { AdUnitConfig, ADS_CONFIG } from '../../config/adsConfig';
import { Sparkles, ExternalLink } from 'lucide-react';

interface AdBannerProps {
  adUnit: AdUnitConfig;
  className?: string;
  variant?: 'leaderboard' | 'rectangle' | 'inContent';
}

export const AdBanner: React.FC<AdBannerProps> = ({
  adUnit,
  className = '',
  variant = 'leaderboard',
}) => {
  const uniqueId = useId().replace(/:/g, '');
  const slotDivId = `gam-ad-slot-${uniqueId}`;
  const [isSlotRendered, setIsSlotRendered] = useState(false);

  useEffect(() => {
    // Register Google Ad Manager slot
    adManager.registerSlot(slotDivId, adUnit);
    setIsSlotRendered(true);

    // Periodic Refresh Timer
    let refreshTimer: NodeJS.Timeout | null = null;
    if (ADS_CONFIG.refreshIntervalSeconds > 0) {
      refreshTimer = setInterval(() => {
        adManager.refreshSlot(slotDivId);
      }, ADS_CONFIG.refreshIntervalSeconds * 1000);
    }

    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
      adManager.destroySlot(slotDivId);
    };
  }, [adUnit, slotDivId]);

  return (
    <div
      className={`relative mx-auto flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm shadow-lg overflow-hidden group ${className}`}
    >
      {/* Top Subtle Advertisement Label */}
      <div className="w-full flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 pb-1.5 border-b border-slate-800/40">
        <span className="flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
          ADVERTISEMENT
        </span>
        <span className="text-slate-600 flex items-center gap-0.5">
          Google Ad Manager <ExternalLink className="w-2 h-2 ml-0.5 opacity-60" />
        </span>
      </div>

      {/* Actual GAM Slot Mount Point */}
      <div
        id={slotDivId}
        className="w-full flex items-center justify-center min-h-[50px] sm:min-h-[90px] pt-1.5 overflow-hidden"
      >
        {/* Dynamic Fallback / Test Ad Simulator when GPT is in test mode */}
        {ADS_CONFIG.isTestMode && (
          <div className="w-full py-2 px-3 sm:px-6 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/20 text-center flex flex-col sm:flex-row items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-black text-xs">
                GAM
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>{adUnit.name}</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-extrabold border border-emerald-500/30">
                    TEST AD
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Google Publisher Tag Slot: <code className="text-cyan-400 font-mono">{adUnit.path}</code>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 hidden md:inline">
                Sizes: {adUnit.sizes.map((s) => `${s[0]}x${s[1]}`).join(', ')}
              </span>
              <a
                href="https://admanager.google.com"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold transition flex items-center gap-1"
              >
                <span>Ad Manager</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
