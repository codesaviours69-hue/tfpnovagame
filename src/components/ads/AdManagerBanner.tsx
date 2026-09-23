import React, { useEffect, useRef } from 'react';

export interface AdManagerSlotConfig {
  adUnitPath: string;
  divId: string;
  sizes: [number, number][];
  minWidth?: number;
  minHeight?: number;
}

export const AD_MANAGER_SLOTS = {
  DISPLAY_1: {
    adUnitPath: '/22856454650/NovaGame-Display-1',
    divId: 'div-gpt-ad-1790164631114-0',
    sizes: [
      [250, 250],
      [300, 250],
      [336, 280],
    ] as [number, number][],
    minWidth: 250,
    minHeight: 250,
  },
  DISPLAY_2: {
    adUnitPath: '/22856454650/NovaGame-Display-2',
    divId: 'div-gpt-ad-1790164685198-0',
    sizes: [
      [250, 250],
      [300, 250],
      [336, 280],
    ] as [number, number][],
    minWidth: 250,
    minHeight: 250,
  },
  DISPLAY_3: {
    adUnitPath: '/22856454650/NovaGame-Display-3',
    divId: 'div-gpt-ad-1790164725573-0',
    sizes: [
      [250, 250],
      [300, 250],
      [336, 280],
    ] as [number, number][],
    minWidth: 250,
    minHeight: 250,
  },
  DISPLAY_4: {
    adUnitPath: '/22856454650/NovaGame-Display-4',
    divId: 'div-gpt-ad-1790165143780-0',
    sizes: [
      [250, 250],
      [300, 250],
      [336, 280],
    ] as [number, number][],
    minWidth: 250,
    minHeight: 250,
  },
  DISPLAY_5: {
    adUnitPath: '/22856454650/NovaGame-Display-5',
    divId: 'div-gpt-ad-1790165185793-0',
    sizes: [
      [250, 250],
      [300, 250],
      [336, 280],
    ] as [number, number][],
    minWidth: 250,
    minHeight: 250,
  },
} as const;

declare global {
  interface Window {
    googletag: any;
  }
}

interface AdManagerBannerProps {
  slot: AdManagerSlotConfig;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export const AdManagerBanner: React.FC<AdManagerBannerProps> = ({
  slot,
  className = '',
  style = {},
  label = 'SPONSORED ADVERTISEMENT',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let definedSlot: any = null;

    if (typeof window !== 'undefined') {
      window.googletag = window.googletag || { cmd: [] };
      window.googletag.cmd.push(() => {
        try {
          // If this slot element ID is already registered in pubads, destroy it first to avoid duplicates
          if (window.googletag.pubads && typeof window.googletag.pubads().getSlots === 'function') {
            const currentSlots = window.googletag.pubads().getSlots();
            const existing = currentSlots.find((s: any) => s.getSlotElementId() === slot.divId);
            if (existing) {
              window.googletag.destroySlots([existing]);
            }
          }

          // Define slot for Google Ad Manager
          definedSlot = window.googletag
            .defineSlot(slot.adUnitPath, slot.sizes, slot.divId)
            ?.addService(window.googletag.pubads());

          // Enable services
          if (!window.googletag.pubadsReady) {
            window.googletag.enableServices();
          }

          // Display ad in the matching div
          window.googletag.display(slot.divId);

          // If pubads was already initialized, trigger a refresh to fetch creative
          if (window.googletag.pubadsReady && definedSlot) {
            window.googletag.pubads().refresh([definedSlot]);
          }
        } catch (err) {
          console.error('Google Ad Manager display error:', err);
        }
      });
    }

    return () => {
      if (typeof window !== 'undefined' && window.googletag && definedSlot) {
        window.googletag.cmd.push(() => {
          try {
            window.googletag.destroySlots([definedSlot]);
          } catch (err) {
            console.error('Google Ad Manager destroy error:', err);
          }
        });
      }
    };
  }, [slot.divId, slot.adUnitPath]);

  return (
    <div
      className={`relative mx-auto flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm shadow-lg overflow-visible w-full ${className}`}
      style={{ minHeight: `${slot.minHeight || 250}px` }}
    >
      {label && (
        <div className="w-full flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 pb-1.5 border-b border-slate-800/40 mb-1">
          <span>{label}</span>
          <span className="text-slate-600">Google Ad Manager</span>
        </div>
      )}

      {/* GAM Slot Container */}
      <div className="w-full flex justify-center items-center overflow-visible">
        <div
          id={slot.divId}
          ref={containerRef}
          style={{
            minWidth: `${slot.minWidth || 250}px`,
            minHeight: `${slot.minHeight || 250}px`,
            ...style,
          }}
        />
      </div>
    </div>
  );
};
