import React, { useState, useEffect, useId } from 'react';
import { adManager } from '../../utils/adManager';
import { ADS_CONFIG } from '../../config/adsConfig';
import { Sparkles, ShieldCheck, X, ExternalLink, Play } from 'lucide-react';
import { sound } from '../../utils/audio';

interface InterstitialAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const InterstitialAdModal: React.FC<InterstitialAdModalProps> = ({
  isOpen,
  onClose,
  title = 'INTERMISSION',
}) => {
  const [countdown, setCountdown] = useState(ADS_CONFIG.adUnits.interstitial.countdownSeconds);
  const [canSkip, setCanSkip] = useState(false);
  const uniqueId = useId().replace(/:/g, '');
  const slotDivId = `gam-interstitial-${uniqueId}`;

  useEffect(() => {
    if (!isOpen) return;

    sound.playClick();
    setCountdown(ADS_CONFIG.adUnits.interstitial.countdownSeconds);
    setCanSkip(false);

    // Register GAM Interstitial Slot
    adManager.registerSlot(slotDivId, {
      path: ADS_CONFIG.adUnits.interstitial.path,
      sizes: [[640, 480], [300, 250]],
      name: ADS_CONFIG.adUnits.interstitial.name,
    });

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      adManager.destroySlot(slotDivId);
    };
  }, [isOpen, slotDivId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in select-none">
      {/* Top Header Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-black text-xs border border-cyan-500/30 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            GOOGLE AD MANAGER
          </span>
          <span className="text-xs font-bold text-slate-400 hidden sm:inline">
            {title}
          </span>
        </div>

        {/* Skip / Close Button with Countdown */}
        <div>
          {canSkip ? (
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition"
            >
              <span>Continue Game</span>
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 font-bold text-xs flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span>Skip in {countdown}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Center Ad Canvas Area */}
      <div className="w-full max-w-3xl flex-1 flex flex-col items-center justify-center my-4">
        <div id={slotDivId} className="w-full flex items-center justify-center">
          {/* Test Ad Visual Presentation */}
          {ADS_CONFIG.isTestMode && (
            <div className="w-full max-w-xl p-6 sm:p-8 rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-2xl flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 text-white animate-pulse">
                <Play className="w-8 h-8 fill-current ml-1" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[10px] uppercase tracking-wider border border-emerald-500/30">
                  INTERSTITIAL IMPRESSION VERIFIED
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
                  {ADS_CONFIG.adUnits.interstitial.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mt-1">
                  Fullscreen ad impression delivered via Google Publisher Tag (<code className="text-cyan-400">{ADS_CONFIG.adUnits.interstitial.path}</code>)
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <a
                  href="https://admanager.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>Google Ad Manager</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Assurance */}
      <div className="w-full max-w-md text-center text-[10px] text-slate-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Safe, Certified Ad Experience via Google Publisher Tag</span>
      </div>
    </div>
  );
};
