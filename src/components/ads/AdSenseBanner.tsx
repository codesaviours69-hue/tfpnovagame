import React, { useEffect, useRef } from 'react';

interface AdSenseBannerProps {
  adSlot: string;
  adClient?: string;
  adFormat?: string;
  fullWidthResponsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  minHeight?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  adSlot,
  adClient = 'ca-pub-1020203735300376',
  adFormat = 'auto',
  fullWidthResponsive = true,
  className = '',
  style = {},
  minHeight = '250px',
}) => {
  const adRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    // Only push once when element is rendered
    if (!pushedRef.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushedRef.current = true;
      } catch (err) {
        console.error('AdSense push error:', err);
      }
    }
  }, []);

  return (
    <div
      className={`relative mx-auto flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm shadow-lg overflow-visible w-full ${className}`}
      style={{ minHeight }}
    >
      {/* AdSense ins tag */}
      <div className="w-full flex justify-center items-center overflow-visible" style={{ minHeight }}>
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight, ...style }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={adFormat}
          data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
        />
      </div>
    </div>
  );
};

// Exported presets for the 3 user AdSense units
export const ADSENSE_SLOTS = {
  GAME_ADS_1: '5415771297', // Top Leaderboard / Catalog Home Ad
  GAME_ADS_2: '2406464578', // In-Content / Game Play Detail Ad
  GAME_ADS_3: '5682977568', // Sticky Anchor / Bottom Footer Ad
};
