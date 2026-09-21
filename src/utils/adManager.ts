import { ADS_CONFIG, AdUnitConfig } from '../config/adsConfig';

// Extend window object for Google Publisher Tag (GPT)
declare global {
  interface Window {
    googletag?: {
      cmd: Array<() => void>;
      defineSlot?: (
        adUnitPath: string,
        size: [number, number] | [number, number][],
        divId: string
      ) => GoogletagSlot;
      defineOutOfPageSlot?: (adUnitPath: string, format?: unknown) => GoogletagSlot;
      display?: (divId: string) => void;
      destroySlots?: (slots?: GoogletagSlot[]) => boolean;
      pubads?: () => GoogletagPubAdsService;
      enableServices?: () => void;
    };
  }
}

export interface GoogletagSlot {
  addService: (service: GoogletagPubAdsService) => GoogletagSlot;
  setTargeting: (key: string, value: string | string[]) => GoogletagSlot;
  clearTargeting: (key?: string) => GoogletagSlot;
  getSlotElementId: () => string;
}

export interface GoogletagPubAdsService {
  enableSingleRequest: () => void;
  enableLazyLoad?: (config?: unknown) => void;
  collapseEmptyDivs: (opt_collapseBeforeAdFetch?: boolean) => void;
  refresh: (opt_slots?: GoogletagSlot[]) => void;
  addEventListener: (eventType: string, listener: (event: unknown) => void) => void;
  setTargeting: (key: string, value: string | string[]) => void;
}

class AdManager {
  private isInitialized = false;
  private definedSlots: Map<string, GoogletagSlot> = new Map();
  private listeners: Map<string, Set<() => void>> = new Map();

  constructor() {
    this.init();
  }

  public init() {
    if (typeof window === 'undefined' || this.isInitialized) return;

    window.googletag = window.googletag || { cmd: [] };
    window.googletag.cmd.push(() => {
      if (!window.googletag?.pubads) return;

      const pubads = window.googletag.pubads();
      pubads.enableSingleRequest();
      pubads.collapseEmptyDivs(true);

      // Global targeting for gaming site
      pubads.setTargeting('category', 'h5_games');
      pubads.setTargeting('platform', 'novaplay_web');
      if (ADS_CONFIG.isTestMode) {
        pubads.setTargeting('test_mode', 'true');
      }

      // Track impressions
      pubads.addEventListener('slotRenderEnded', (event: unknown) => {
        // Log ad impression for analytics/debugging
        if (ADS_CONFIG.isTestMode) {
          console.log('[GAM AdManager] Slot Render Ended:', event);
        }
      });

      pubads.addEventListener('impressionViewable', (event: unknown) => {
        if (ADS_CONFIG.isTestMode) {
          console.log('[GAM AdManager] Ad Impression Viewable (100% Verified):', event);
        }
      });

      window.googletag.enableServices?.();
      this.isInitialized = true;
    });
  }

  /**
   * Defines and mounts a standard GAM slot into a DOM element ID
   */
  public registerSlot(divId: string, adUnit: AdUnitConfig): void {
    if (typeof window === 'undefined') return;

    window.googletag = window.googletag || { cmd: [] };
    window.googletag.cmd.push(() => {
      if (!window.googletag?.defineSlot || !window.googletag?.pubads) return;

      // If slot was previously defined on this divId, destroy it first
      const existingSlot = this.definedSlots.get(divId);
      if (existingSlot && window.googletag.destroySlots) {
        window.googletag.destroySlots([existingSlot]);
        this.definedSlots.delete(divId);
      }

      try {
        const slot = window.googletag.defineSlot(adUnit.path, adUnit.sizes, divId);
        if (slot) {
          slot.addService(window.googletag.pubads());
          this.definedSlots.set(divId, slot);
          window.googletag.display?.(divId);
        }
      } catch (e) {
        console.warn('[GAM AdManager] Error registering slot:', divId, e);
      }
    });
  }

  /**
   * Refreshes an existing ad slot (e.g., periodic rotation)
   */
  public refreshSlot(divId: string): void {
    if (typeof window === 'undefined') return;

    window.googletag = window.googletag || { cmd: [] };
    window.googletag.cmd.push(() => {
      const slot = this.definedSlots.get(divId);
      if (slot && window.googletag?.pubads) {
        window.googletag.pubads().refresh([slot]);
      }
    });
  }

  /**
   * Unregisters and destroys a slot when component unmounts
   */
  public destroySlot(divId: string): void {
    if (typeof window === 'undefined') return;

    window.googletag = window.googletag || { cmd: [] };
    window.googletag.cmd.push(() => {
      const slot = this.definedSlots.get(divId);
      if (slot && window.googletag?.destroySlots) {
        window.googletag.destroySlots([slot]);
        this.definedSlots.delete(divId);
      }
    });
  }
}

export const adManager = new AdManager();
