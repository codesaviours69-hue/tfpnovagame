export interface Game {
  id: string;
  title: string;
  slug: string;
  category: 'action' | 'arcade' | 'puzzle' | 'racing' | 'sports';
  description: string;
  instructions: {
    desktop: string[];
    mobile: string[];
  };
  controls: {
    key: string;
    action: string;
  }[];
  thumbnailGradient: string;
  posterUrl?: string;
  iconName: string;
  tags: string[];
  rating: number;
  plays: number;
  isNew?: boolean;
  isHot?: boolean;
  isReady: boolean;
}

export type CategoryFilter = 'all' | 'action' | 'arcade' | 'sports' | 'puzzle';

export interface HighScoreRecord {
  gameId: string;
  score: number;
  date: string;
  playerName: string;
}

export type ModalType = 'privacy' | 'terms' | 'about' | 'contact' | 'wallet' | null;
