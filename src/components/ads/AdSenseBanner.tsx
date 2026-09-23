import React from 'react';
import { AdManagerBanner, AD_MANAGER_SLOTS, AdManagerSlotConfig } from './AdManagerBanner';

// Backward compatibility slot mappings
export const ADSENSE_SLOTS = {
  GAME_ADS_1: '5415771297',
  GAME_ADS_2: '2406464578',
  GAME_ADS_3: '5682977568',
};

interface AdSenseBannerProps {
  adSlot?: string;
  adClient?: string;
  adFormat?: string;
  fullWidthResponsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  minHeight?: string;
  label?: string;
  slot?: AdManagerSlotConfig;
}

/**
 * AdSenseBanner compatibility wrapper transitioning to Google Ad Manager
 */
export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  adSlot,
  className = '',
  style = {},
  label,
  slot,
}) => {
  // Determine appropriate GAM slot
  let targetSlot = slot || AD_MANAGER_SLOTS.DISPLAY_1;

  if (!slot && adSlot) {
    if (adSlot === ADSENSE_SLOTS.GAME_ADS_2) {
      targetSlot = AD_MANAGER_SLOTS.DISPLAY_2;
    } else if (adSlot === ADSENSE_SLOTS.GAME_ADS_3) {
      targetSlot = AD_MANAGER_SLOTS.DISPLAY_3;
    } else {
      targetSlot = AD_MANAGER_SLOTS.DISPLAY_1;
    }
  }

  return (
    <AdManagerBanner
      slot={targetSlot}
      className={className}
      style={style}
      label={label}
    />
  );
};
