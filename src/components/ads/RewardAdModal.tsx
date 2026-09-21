import React, { useState, useEffect, useId } from 'react';
import { adManager } from '../../utils/adManager';
import { ADS_CONFIG } from '../../config/adsConfig';
import { Gift, Coins, CheckCircle, Sparkles, X, Play, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface RewardAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardGranted: (rewardAmount: number) => void;
  rewardDescription?: string;
  customRewardAmount?: number;
}

export const RewardAdModal: React.FC<RewardAdModalProps> = ({
  isOpen,
  onClose,
  onRewardGranted,
  rewardDescription = 'Watch short video to earn bonus Cyber Energy Coins!',
  customRewardAmount,
}) => {
  const rewardAmount = customRewardAmount || ADS_CONFIG.adUnits.rewarded.rewardCoins;
  const watchTotalSeconds = ADS_CONFIG.adUnits.rewarded.watchSeconds;

  const [secondsRemaining, setSecondsRemaining] = useState(watchTotalSeconds);
  const [isCompleted, setIsCompleted] = useState(false);
  const uniqueId = useId().replace(/:/g, '');
  const slotDivId = `gam-rewarded-${uniqueId}`;

  useEffect(() => {
    if (!isOpen) return;

    sound.playClick();
    setSecondsRemaining(watchTotalSeconds);
    setIsCompleted(false);

    adManager.registerSlot(slotDivId, {
      path: ADS_CONFIG.adUnits.rewarded.path,
      sizes: [[640, 480], [300, 250]],
      name: ADS_CONFIG.adUnits.rewarded.name,
    });

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsCompleted(true);
          sound.playCoin();
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
            });
          } catch {
            // ignore
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      adManager.destroySlot(slotDivId);
    };
  }, [isOpen, slotDivId, watchTotalSeconds]);

  if (!isOpen) return null;

  const progressPercent = ((watchTotalSeconds - secondsRemaining) / watchTotalSeconds) * 100;

  const handleClaim = () => {
    sound.playPowerup();
    onRewardGranted(rewardAmount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl shadow-cyan-950/80 text-center relative">
        {/* Close Button (Only active if user wants to cancel early or already completed) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Badge */}
        <div className="flex items-center justify-center gap-2">
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 font-black text-xs border border-amber-500/40 flex items-center gap-1.5 shadow-md">
            <Gift className="w-4 h-4 text-amber-400" />
            REWARDED AD EXPERIENCE
          </span>
        </div>

        {/* Reward Icon & Title */}
        <div className="space-y-2">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-300 flex items-center justify-center shadow-xl shadow-amber-500/30 text-slate-950 animate-bounce">
            <Coins className="w-10 h-10" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white">
            +{rewardAmount.toLocaleString()} <span className="text-amber-400">COINS</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            {rewardDescription}
          </p>
        </div>

        {/* Simulated Video Ad Screen / GAM Slot */}
        <div className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]">
          <div id={slotDivId} className="w-full flex flex-col items-center justify-center space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-xs">
              <Play className="w-4 h-4 fill-current animate-pulse" />
              <span>Google Ad Manager Rewarded Stream</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Ad Unit: {ADS_CONFIG.adUnits.rewarded.path}
            </div>
          </div>

          {/* Video Timer Overlay */}
          <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-slate-900/90 text-[10px] font-bold text-slate-300 border border-slate-700 flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-cyan-400" />
            <span>{secondsRemaining > 0 ? `${secondsRemaining}s` : 'DONE'}</span>
          </div>

          {/* Progress Bar */}
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {isCompleted ? (
            <button
              onClick={handleClaim}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 animate-pulse"
            >
              <CheckCircle className="w-5 h-5 fill-current" />
              CLAIM +{rewardAmount.toLocaleString()} COINS NOW!
            </button>
          ) : (
            <div className="w-full py-3.5 rounded-2xl bg-slate-800 text-slate-400 font-bold text-sm flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span>Reward unlocking in {secondsRemaining}s...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
