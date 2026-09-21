/**
 * Google Ad Manager (GAM / GPT) Configuration
 *
 * NOTE FOR PUBLISHER:
 * You can easily replace the test Ad Unit paths below with your real
 * Google Ad Manager Network Code and Ad Unit paths (e.g. '/12345678/novaplay_banner').
 */

export interface AdUnitConfig {
  path: string;
  sizes: [number, number][];
  name: string;
}

export interface GAMConfig {
  /** Set to false when deploying real production ads, or true to enable Google test ads */
  isTestMode: boolean;
  /** Google Ad Manager Network Code (e.g. '6499' for Google Test Network) */
  networkCode: string;
  /** Auto refresh interval for banner ads in seconds (0 to disable) */
  refreshIntervalSeconds: number;
  /** Ad Units Definition */
  adUnits: {
    topLeaderboard: AdUnitConfig;
    inContentBanner: AdUnitConfig;
    sidebarRectangle: AdUnitConfig;
    stickyBottomAnchor: AdUnitConfig;
    interstitial: {
      path: string;
      name: string;
      countdownSeconds: number;
    };
    rewarded: {
      path: string;
      name: string;
      rewardCoins: number;
      watchSeconds: number;
    };
  };
}

export const ADS_CONFIG: GAMConfig = {
  isTestMode: true,
  networkCode: '6499', // Google's official public test network code
  refreshIntervalSeconds: 30,

  adUnits: {
    // 1. Top Header / Catalog Leaderboard Ad (728x90, 320x50, 468x60)
    topLeaderboard: {
      path: '/6499/example/banner',
      sizes: [
        [728, 90],
        [468, 60],
        [320, 50],
      ],
      name: 'NovaPlay Top Leaderboard Banner',
    },

    // 2. In-Content Game Detail Banner (728x90, 300x250, 320x50)
    inContentBanner: {
      path: '/6499/example/banner',
      sizes: [
        [728, 90],
        [320, 50],
      ],
      name: 'NovaPlay In-Game Catalog Banner',
    },

    // 3. Sidebar / Medium Rectangle Ad (300x250, 336x280)
    sidebarRectangle: {
      path: '/6499/example/med-rect',
      sizes: [
        [300, 250],
        [336, 280],
      ],
      name: 'NovaPlay Sidebar Medium Rectangle',
    },

    // 4. Sticky Bottom Mobile & Desktop Anchor Ad (728x90, 320x50)
    stickyBottomAnchor: {
      path: '/6499/example/anchor',
      sizes: [
        [728, 90],
        [320, 50],
      ],
      name: 'NovaPlay Bottom Sticky Anchor',
    },

    // 5. Fullscreen Interstitial Ad (Triggered on Game Over / Level Clear)
    interstitial: {
      path: '/6499/example/interstitial',
      name: 'NovaPlay Fullscreen Interstitial',
      countdownSeconds: 5,
    },

    // 6. Rewarded Video Ad (Watch to earn bonus Coins & Upgrades)
    rewarded: {
      path: '/6499/example/rewarded',
      name: 'NovaPlay Rewarded Video',
      rewardCoins: 2500,
      watchSeconds: 8,
    },
  },
};
