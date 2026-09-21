import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Star,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Lock,
  Check,
  Award,
  Zap,
  Flame,
  Shield,
  ArrowLeft,
  Crown,
  Eye,
  Coins,
  Radio,
  EyeOff,
  TrendingUp,
  HelpCircle,
  User,
  Swords,
  Users,
  CheckCircle2,
  XCircle,
  Sparkle,
  Info,
  Wallet,
} from 'lucide-react';
import { sound } from '../../utils/audio';

// --- Types & Data Definitions ---

export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';

export interface Card {
  id: string;
  suit: Suit;
  rank: number; // 2 to 14 (14 = Ace)
  label: string; // "2"..."10", "J", "Q", "K", "A"
  symbol: string; // "♠", "♥", "♦", "♣"
  color: 'RED' | 'BLACK';
}

export type HandCategory = 'TRAIL' | 'PURE_SEQUENCE' | 'SEQUENCE' | 'COLOR' | 'PAIR' | 'HIGH_CARD';

export interface EvaluatedHand {
  category: HandCategory;
  categoryName: string;
  rankValue: number;
}

export interface ChipSkin {
  id: string;
  name: string;
  price: number;
  color: number;
  emissive: number;
  description: string;
}

export const CHIP_SKINS: ChipSkin[] = [
  { id: 'gold_dragon', name: 'GOLDEN DRAGON CHIP', price: 0, color: 0xffea00, emissive: 0xffaa00, description: 'Classic 24K gold dragon high-roller casino chip.' },
  { id: 'neon_cyan', name: 'NEON CYAN LASER', price: 1500, color: 0x00f2fe, emissive: 0x00f2fe, description: 'Cyberpunk cyan laser pulse betting chip.' },
  { id: 'emerald_matrix', name: 'EMERALD MATRIX', price: 3500, color: 0x00ff66, emissive: 0x00ffaa, description: 'Green digital rain code stream chip.' },
  { id: 'chroma_apex', name: 'CHROMA APEX TITAN', price: 7500, color: 0xff00ff, emissive: 0x00ffff, description: 'Chroma rainbow pulse quantum energy chip.' },
];

export interface CasinoArena {
  id: number;
  name: string;
  subtitle: string;
  opponentsCount: number;
  minBet: number;
  tableColor: number;
  rimColor: number;
  fogColor: number;
  accentColor: number;
  hasBoss?: boolean;
  bossName?: string;
  description: string;
  opponentsNames: string[];
  opponentsAvatars: string[];
}

const CASINO_ARENAS: CasinoArena[] = [
  {
    id: 1,
    name: 'Goa Royal Neon',
    subtitle: '1v1 Starter Table',
    opponentsCount: 1,
    minBet: 50,
    tableColor: 0x0a361f,
    rimColor: 0x422006,
    fogColor: 0x04140c,
    accentColor: 0x00f2fe,
    description: 'Classic 1v1 showdown against Cyber Dealer Jax.',
    opponentsNames: ['Dealer Jax'],
    opponentsAvatars: ['🤖'],
  },
  {
    id: 2,
    name: 'Underground Vault',
    subtitle: 'High-Stakes Bar',
    opponentsCount: 2,
    minBet: 100,
    tableColor: 0x1e1b4b,
    rimColor: 0x31103f,
    fogColor: 0x0c0a24,
    accentColor: 0xff007f,
    description: 'Intense 3-player match in an underground cyberpunk club.',
    opponentsNames: ['Dealer Jax', 'Shadow Queen'],
    opponentsAvatars: ['🤖', '👑'],
  },
  {
    id: 3,
    name: 'Skyline Penthouse',
    subtitle: 'VIP Lounge',
    opponentsCount: 2,
    minBet: 200,
    tableColor: 0x14532d,
    rimColor: 0x78350f,
    fogColor: 0x052e16,
    accentColor: 0xffea00,
    description: 'High-altitude luxury poker table with 200 chip ante.',
    opponentsNames: ['Raja Royale', 'Neon Boss'],
    opponentsAvatars: ['👳‍♂️', '😎'],
  },
  {
    id: 4,
    name: 'Matrix Club Zero',
    subtitle: 'Digital Vault',
    opponentsCount: 3,
    minBet: 400,
    tableColor: 0x022c22,
    rimColor: 0x064e3b,
    fogColor: 0x011c15,
    accentColor: 0x00ff66,
    description: '4-player showdown in green matrix cyberspace.',
    opponentsNames: ['Matrix Neo', 'Cyber Jax', 'Viper Red'],
    opponentsAvatars: ['🕶️', '🤖', '🐍'],
  },
  {
    id: 5,
    name: 'Quantum Arena',
    subtitle: 'Boss Dealer Trial',
    opponentsCount: 3,
    minBet: 800,
    tableColor: 0x1e3a8a,
    rimColor: 0x1e1b4b,
    fogColor: 0x0f172a,
    accentColor: 0x00e1ff,
    hasBoss: true,
    bossName: 'Quantum Oracle',
    description: 'Defeat Quantum Oracle Boss in a 4-way high-stakes trial!',
    opponentsNames: ['Quantum Oracle 👑', 'Cyber Jax', 'Phoenix VIP'],
    opponentsAvatars: ['🔮', '🤖', '🔥'],
  },
  {
    id: 6,
    name: 'High-Roller Stratosphere',
    subtitle: 'Cloud Club',
    opponentsCount: 2,
    minBet: 1500,
    tableColor: 0x312e81,
    rimColor: 0x4c1d95,
    fogColor: 0x1e1b4b,
    accentColor: 0xa855f7,
    description: 'Fast betting rounds with 1500 chip min raise.',
    opponentsNames: ['Lord Sterling', 'Lady Sapphire'],
    opponentsAvatars: ['🎩', '💎'],
  },
  {
    id: 7,
    name: 'Volcanic Inferno VIP',
    subtitle: 'Magma Arena',
    opponentsCount: 3,
    minBet: 3000,
    tableColor: 0x450a0a,
    rimColor: 0x7f1d1d,
    fogColor: 0x270707,
    accentColor: 0xff3300,
    description: 'Fiery high stakes where weak hands get packed fast!',
    opponentsNames: ['Pyro King', 'Cyber Jax', 'Blaze Royale'],
    opponentsAvatars: ['👺', '🤖', '🌋'],
  },
  {
    id: 8,
    name: 'Orbital Space Casino',
    subtitle: 'Cosmos Tournament',
    opponentsCount: 3,
    minBet: 5000,
    tableColor: 0x3b0764,
    rimColor: 0x581c87,
    fogColor: 0x1d0436,
    accentColor: 0xd946ef,
    hasBoss: true,
    bossName: 'Cosmic Overlord',
    description: 'Face Cosmic Overlord Dealer in zero gravity!',
    opponentsNames: ['Cosmic Overlord 👑', 'Galaxy Ace', 'Nova Prince'],
    opponentsAvatars: ['👾', '✨', '🚀'],
  },
  {
    id: 9,
    name: 'Solar Corona Royale',
    subtitle: 'Golden Cup',
    opponentsCount: 3,
    minBet: 10000,
    tableColor: 0x713f12,
    rimColor: 0xa16207,
    fogColor: 0x3a2008,
    accentColor: 0xfacc15,
    description: 'Semifinals of the Cyber Teen Patti World League.',
    opponentsNames: ['Midas Gold', 'Cyber Jax', 'Aura Empress'],
    opponentsAvatars: ['🏆', '🤖', '👸'],
  },
  {
    id: 10,
    name: 'Apex Titan Championship',
    subtitle: 'Grand Final',
    opponentsCount: 3,
    minBet: 25000,
    tableColor: 0x701a75,
    rimColor: 0x831843,
    fogColor: 0x3b0764,
    accentColor: 0x00ffff,
    hasBoss: true,
    bossName: 'Apex Titan Dealer',
    description: 'The ultimate 4-player Championship Final!',
    opponentsNames: ['Apex Titan Dealer 👑', 'Cyber Jax', 'Dragon Sovereign'],
    opponentsAvatars: ['🐉', '🤖', '👑'],
  },
];

const GENERATE_DECK = (): Card[] => {
  const suits: { suit: Suit; symbol: string; color: 'RED' | 'BLACK' }[] = [
    { suit: 'SPADES', symbol: '♠', color: 'BLACK' },
    { suit: 'HEARTS', symbol: '♥', color: 'RED' },
    { suit: 'DIAMONDS', symbol: '♦', color: 'RED' },
    { suit: 'CLUBS', symbol: '♣', color: 'BLACK' },
  ];

  const labels: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  };

  const deck: Card[] = [];
  suits.forEach((s) => {
    for (let r = 2; r <= 14; r++) {
      deck.push({
        id: `${s.suit}_${r}`,
        suit: s.suit,
        rank: r,
        label: labels[r],
        symbol: s.symbol,
        color: s.color,
      });
    }
  });

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

export const evaluateTeenPattiHand = (cards: Card[]): EvaluatedHand => {
  if (!cards || cards.length !== 3) {
    return { category: 'HIGH_CARD', categoryName: 'High Card', rankValue: 0 };
  }

  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const [c1, c2, c3] = sorted;

  const isSameSuit = c1.suit === c2.suit && c2.suit === c3.suit;
  const isSameRankTrio = c1.rank === c2.rank && c2.rank === c3.rank;

  let isSequence = false;
  if (c1.rank === c2.rank + 1 && c2.rank === c3.rank + 1) {
    isSequence = true;
  } else if (c1.rank === 14 && c2.rank === 3 && c3.rank === 2) {
    isSequence = true;
  }

  const isPair = c1.rank === c2.rank || c2.rank === c3.rank || c1.rank === c3.rank;
  let pairRank = 0;
  let kicker = 0;
  if (isPair) {
    if (c1.rank === c2.rank) {
      pairRank = c1.rank;
      kicker = c3.rank;
    } else if (c2.rank === c3.rank) {
      pairRank = c2.rank;
      kicker = c1.rank;
    } else {
      pairRank = c1.rank;
      kicker = c2.rank;
    }
  }

  if (isSameRankTrio) {
    return {
      category: 'TRAIL',
      categoryName: `Trail of ${c1.label}'s 🔥`,
      rankValue: 600000 + c1.rank * 100,
    };
  }

  if (isSequence && isSameSuit) {
    return {
      category: 'PURE_SEQUENCE',
      categoryName: `Pure Sequence (${c1.label}-${c2.label}-${c3.label}) ✨`,
      rankValue: 500000 + c1.rank * 100,
    };
  }

  if (isSequence) {
    return {
      category: 'SEQUENCE',
      categoryName: `Sequence (${c1.label}-${c2.label}-${c3.label})`,
      rankValue: 400000 + c1.rank * 100,
    };
  }

  if (isSameSuit) {
    return {
      category: 'COLOR',
      categoryName: `Color Flush (${c1.label} High)`,
      rankValue: 300000 + c1.rank * 100 + c2.rank * 10 + c3.rank,
    };
  }

  if (isPair) {
    return {
      category: 'PAIR',
      categoryName: `Pair of ${sorted.find((c, _, arr) => arr.filter((x) => x.rank === c.rank).length === 2)?.label}'s`,
      rankValue: 200000 + pairRank * 100 + kicker,
    };
  }

  return {
    category: 'HIGH_CARD',
    categoryName: `High Card (${c1.label})`,
    rankValue: 100000 + c1.rank * 100 + c2.rank * 10 + c3.rank,
  };
};

export interface SeatedPlayer {
  idx: number;
  name: string;
  avatar: string;
  isUser: boolean;
  cards: Card[];
  seen: boolean;
  packed: boolean;
  currentBetTotal: number;
  lastAction: string | null;
}

export interface FlyingChipParticle {
  id: string;
  startX: number;
  startY: number;
  color: string;
}

export const CyberTeenPatti3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Game Navigation & Storage
  const [gameState, setGameState] = useState<'SELECT' | 'GARAGE' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('SELECT');
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [unlockedLevels, setUnlockedLevels] = useState<number>(() => {
    const saved = localStorage.getItem('cyber_patti_unlocked_lvl');
    return saved ? parseInt(saved, 10) : 10;
  });

  const [credits, setCredits] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_wallet_balance');
    return saved ? parseInt(saved, 10) : 5000;
  });

  const [selectedChipId, setSelectedChipId] = useState<string>(() => {
    const saved = localStorage.getItem('cyber_patti_chip_selected');
    return saved || 'gold_dragon';
  });

  const [ownedChipIds, setOwnedChipIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('cyber_patti_chips_owned');
    return saved ? JSON.parse(saved) : ['gold_dragon'];
  });

  const [levelStars, setLevelStars] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem('cyber_patti_stars');
    return saved ? JSON.parse(saved) : {};
  });

  // Active Match Seated Players & States
  const [seatedPlayers, setSeatedPlayers] = useState<SeatedPlayer[]>([]);
  const [pot, setPot] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(50);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [showdownResult, setShowdownResult] = useState<string | null>(null);
  const [sessionWinnings, setSessionWinnings] = useState<number>(0);
  const [matchBanner, setMatchBanner] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [isDealingAnimation, setIsDealingAnimation] = useState<boolean>(false);

  // Sideshow Modal State
  const [sideshowModal, setSideshowModal] = useState<{
    requesterName: string;
    targetName: string;
    targetIdx: number;
    requesterIdx: number;
    resultText?: string;
  } | null>(null);

  // Chip Throw Particles
  const [chipParticles, setChipParticles] = useState<FlyingChipParticle[]>([]);

  // Listen to Global Wallet events
  useEffect(() => {
    const syncWallet = () => {
      const saved = localStorage.getItem('novaplay_wallet_balance');
      if (saved) setCredits(parseInt(saved, 10));
    };
    window.addEventListener('wallet_balance_updated', syncWallet);
    window.addEventListener('storage', syncWallet);
    return () => {
      window.removeEventListener('wallet_balance_updated', syncWallet);
      window.removeEventListener('storage', syncWallet);
    };
  }, []);

  // Mutable State Refs for AI turns & async handlers
  const gameStateRef = useRef(gameState);
  const turnIndexRef = useRef(turnIndex);
  const seatedPlayersRef = useRef(seatedPlayers);
  const potRef = useRef(pot);
  const currentBetRef = useRef(currentBet);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { turnIndexRef.current = turnIndex; }, [turnIndex]);
  useEffect(() => { seatedPlayersRef.current = seatedPlayers; }, [seatedPlayers]);
  useEffect(() => { potRef.current = pot; }, [pot]);
  useEffect(() => { currentBetRef.current = currentBet; }, [currentBet]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const potChipsGroupRef = useRef<THREE.Group | null>(null);
  const spotlightRef = useRef<THREE.SpotLight | null>(null);
  const animFrameId = useRef<number | null>(null);

  const activeChip = CHIP_SKINS.find((c) => c.id === selectedChipId) || CHIP_SKINS[0];
  const activeArena = CASINO_ARENAS[currentLevelIdx] || CASINO_ARENAS[0];

  const openGlobalWallet = () => {
    sound.playClick();
    window.dispatchEvent(new Event('open_wallet_modal'));
  };

  // Wallet Deduction & Income Helpers
  const updateWalletBalance = (amountChange: number, title: string, type: 'WIN' | 'REWARD' | 'TOPUP' | 'SHOP') => {
    const currentGlobal = localStorage.getItem('novaplay_wallet_balance');
    const globalBal = currentGlobal ? parseInt(currentGlobal, 10) : 5000;
    const newGlobal = Math.max(0, globalBal + amountChange);

    setCredits(newGlobal);
    localStorage.setItem('novaplay_wallet_balance', String(newGlobal));

    const existingTxs = localStorage.getItem('novaplay_wallet_txs');
    const txs = existingTxs ? JSON.parse(existingTxs) : [];
    const newTx = {
      id: `tx_${Date.now()}`,
      title,
      amount: amountChange,
      date: 'Just now',
      type,
    };
    localStorage.setItem('novaplay_wallet_txs', JSON.stringify([newTx, ...txs.slice(0, 19)]));
    window.dispatchEvent(new Event('wallet_balance_updated'));
  };

  const saveProgress = (levelId: number, stars: number, earnedCreds: number) => {
    const updatedStars = { ...levelStars, [levelId]: Math.max(levelStars[levelId] || 0, stars) };
    setLevelStars(updatedStars);
    localStorage.setItem('cyber_patti_stars', JSON.stringify(updatedStars));

    const nextUnlocked = Math.max(unlockedLevels, Math.min(10, levelId + 1));
    setUnlockedLevels(nextUnlocked);
    localStorage.setItem('cyber_patti_unlocked_lvl', String(nextUnlocked));
  };

  const buyChip = (chip: ChipSkin) => {
    if (credits >= chip.price && !ownedChipIds.includes(chip.id)) {
      updateWalletBalance(-chip.price, `Unlocked ${chip.name}`, 'SHOP');
      const newOwned = [...ownedChipIds, chip.id];
      setOwnedChipIds(newOwned);
      setSelectedChipId(chip.id);

      localStorage.setItem('cyber_patti_chips_owned', JSON.stringify(newOwned));
      localStorage.setItem('cyber_patti_chip_selected', chip.id);
      sound.playWin();
    } else {
      sound.playHit();
    }
  };

  const addFreeTopup = () => {
    updateWalletBalance(2000, 'Free Casino Chips Bonus', 'TOPUP');
    sound.playPowerup();
    showBanner('🎁 +2000 FREE CHIPS ADDED TO WALLET!');
  };

  // Launch New Match Round
  const startMatch = (levelIndex: number) => {
    setCurrentLevelIdx(levelIndex);
    const arena = CASINO_ARENAS[levelIndex];

    const deck = GENERATE_DECK();

    // Create Seated Players Array
    // Seat 0: You (User)
    // Seats 1..N: Opponent Dealers & High Rollers
    const seats: SeatedPlayer[] = [];

    // User Seat (0)
    seats.push({
      idx: 0,
      name: 'YOU (ACE)',
      avatar: '🤠',
      isUser: true,
      cards: [deck.pop()!, deck.pop()!, deck.pop()!],
      seen: false,
      packed: false,
      currentBetTotal: arena.minBet,
      lastAction: 'ANTE BET',
    });

    // Opponent Seats (1..N)
    for (let i = 0; i < arena.opponentsCount; i++) {
      seats.push({
        idx: i + 1,
        name: arena.opponentsNames[i] || `Dealer ${i + 1}`,
        avatar: arena.opponentsAvatars[i] || '🤖',
        isUser: false,
        cards: [deck.pop()!, deck.pop()!, deck.pop()!],
        seen: false,
        packed: false,
        currentBetTotal: arena.minBet,
        lastAction: 'ANTE BET',
      });
    }

    const initialAnte = arena.minBet;
    const initialPot = initialAnte * seats.length;

    // Deduct ante from player wallet
    updateWalletBalance(-initialAnte, `Teen Patti - ${arena.name} Ante Bet`, 'WIN');

    setSeatedPlayers(seats);
    setPot(initialPot);
    setCurrentBet(initialAnte);
    setTurnIndex(0);
    setShowdownResult(null);
    setSessionWinnings(0);
    setSideshowModal(null);
    setGameState('PLAYING');
    setIsDealingAnimation(true);

    sound.playCollect();

    setTimeout(() => {
      setIsDealingAnimation(false);
      showBanner(`🎴 CARDS DEALT! ARENA ${arena.id} ANTE ${initialAnte} CHIPS`);
    }, 1200);
  };

  // Initialize Three.js 3D Felt Casino Table Scene
  useEffect(() => {
    if (!mountRef.current || gameState !== 'PLAYING') return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const aspect = width / height;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(activeArena.fogColor);
    scene.fog = new THREE.FogExp2(activeArena.fogColor, 0.001);
    sceneRef.current = scene;

    const initialFov = aspect < 1.1 ? 70 : 52;
    const camera = new THREE.PerspectiveCamera(initialFov, aspect, 0.1, 1000);
    camera.position.set(0, aspect < 1.1 ? 62 : 48, aspect < 1.1 ? 48 : 38);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(activeArena.accentColor, 1.8);
    dirLight.position.set(0, 100, 40);
    scene.add(dirLight);

    // Active Player Spotlight
    const spotLight = new THREE.SpotLight(0xffea00, 3, 100, Math.PI / 4, 0.5, 1);
    spotLight.position.set(0, 40, 20);
    spotLight.target.position.set(0, 0, 15); // Default target on user seat
    scene.add(spotLight);
    scene.add(spotLight.target);
    spotlightRef.current = spotLight;

    // 1. 3D Felt Casino Oval Table Surface
    const tableGeo = new THREE.CylinderGeometry(36, 38, 2.2, 64);
    const tableMat = new THREE.MeshStandardMaterial({
      color: activeArena.tableColor,
      roughness: 0.35,
      metalness: 0.25,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -1.1;
    scene.add(table);

    // 2. Leather Padded Armrest Outer Rim
    const rimGeo = new THREE.TorusGeometry(36.5, 1.5, 20, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: activeArena.rimColor,
      roughness: 0.6,
      metalness: 0.3,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.1;
    scene.add(rim);

    // 3. Metallic Gold Trim Ring
    const goldTrimGeo = new THREE.TorusGeometry(38.2, 0.4, 16, 64);
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: activeArena.accentColor,
      metalness: 0.9,
      roughness: 0.2,
      emissive: activeArena.accentColor,
      emissiveIntensity: 0.4,
    });
    const goldTrim = new THREE.Mesh(goldTrimGeo, goldTrimMat);
    goldTrim.rotation.x = Math.PI / 2;
    goldTrim.position.y = -0.1;
    scene.add(goldTrim);

    // 4. Printed Betting Circle Decal Ring on Table Felt
    const betRingGeo = new THREE.TorusGeometry(20, 0.2, 16, 64);
    const betRingMat = new THREE.MeshBasicMaterial({ color: activeArena.accentColor, transparent: true, opacity: 0.6 });
    const betRing = new THREE.Mesh(betRingGeo, betRingMat);
    betRing.rotation.x = Math.PI / 2;
    betRing.position.y = 0.02;
    scene.add(betRing);

    // 5. Dealer Card Shoe 3D Mesh (Top Table)
    const shoeGeo = new THREE.BoxGeometry(4, 3, 6);
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(0, 1.5, -22);
    shoe.rotation.y = Math.PI / 6;
    scene.add(shoe);

    // 6. Pot Central 3D Chips Stacks Group
    const chipsGroup = new THREE.Group();
    const chipGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.5, 24);
    const chipMat = new THREE.MeshStandardMaterial({
      color: activeChip.color,
      emissive: activeChip.emissive,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
    });

    const numChips = Math.min(30, Math.max(8, Math.floor(pot / 200)));
    for (let c = 0; c < numChips; c++) {
      const chip = new THREE.Mesh(chipGeo, chipMat);
      const stackIdx = c % 4;
      const heightInStack = Math.floor(c / 4);
      const angle = (stackIdx * Math.PI) / 2;
      const r = 4;
      chip.position.set(Math.cos(angle) * r + (Math.random() - 0.5), heightInStack * 0.5, Math.sin(angle) * r + (Math.random() - 0.5));
      chipsGroup.add(chip);
    }
    chipsGroup.position.set(0, 0.1, 0);
    scene.add(chipsGroup);
    potChipsGroupRef.current = chipsGroup;

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      const asp = w / h;
      camera.aspect = asp;
      camera.fov = asp < 1.1 ? 70 : 52;
      camera.position.set(0, asp < 1.1 ? 62 : 48, asp < 1.1 ? 48 : 38);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      if (potChipsGroupRef.current) {
        potChipsGroupRef.current.rotation.y += 0.005;
      }
      renderer.render(scene, camera);
    };

    animFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }
    };
  }, [gameState, currentLevelIdx, selectedChipId]);

  // Update Spotlight focus on active turn seat
  useEffect(() => {
    if (!spotlightRef.current || gameState !== 'PLAYING') return;

    // Positions for 4 seats:
    // Seat 0 (User): Z = 18, X = 0
    // Seat 1 (Dealer 1 / Left): X = -22, Z = 0
    // Seat 2 (Dealer 2 / Top): Z = -18, X = 0
    // Seat 3 (Dealer 3 / Right): X = 22, Z = 0
    const seatCoords = [
      { x: 0, z: 18 },
      { x: -22, z: 0 },
      { x: 0, z: -18 },
      { x: 22, z: 0 },
    ];

    const target = seatCoords[turnIndex] || seatCoords[0];
    spotlightRef.current.target.position.set(target.x, 0, target.z);
    spotlightRef.current.target.updateMatrixWorld();
  }, [turnIndex, gameState]);

  // Trigger Flying Chips Particle Animation
  const triggerChipThrowParticle = (seatIdx: number) => {
    const chipParticle: FlyingChipParticle = {
      id: `chip_${Date.now()}_${Math.random()}`,
      startX: seatIdx === 0 ? 50 : seatIdx === 1 ? 15 : seatIdx === 2 ? 50 : 85,
      startY: seatIdx === 0 ? 80 : seatIdx === 1 ? 30 : seatIdx === 2 ? 15 : 30,
      color: `#${activeChip.color.toString(16).padStart(6, '0')}`,
    };

    setChipParticles((prev) => [...prev, chipParticle]);
    setTimeout(() => {
      setChipParticles((prev) => prev.filter((p) => p.id !== chipParticle.id));
    }, 800);
  };

  // Action: User Sees Cards
  const handleSeeCards = () => {
    const updated = [...seatedPlayers];
    if (updated[0].seen) return;

    updated[0].seen = true;
    updated[0].lastAction = 'SEEN (2X STAKES)';
    setSeatedPlayers(updated);

    // In Teen Patti, seeing cards doubles your bet requirement compared to blind players
    setCurrentBet((prev) => prev * 2);

    sound.playPowerup();
    showBanner("👁️ CARDS REVEALED! YOUR BET REQUIREMENT IS NOW 2X!");
  };

  // Action: Player Bet / Chaal
  const handlePlayerBet = (multiplier: number = 1) => {
    if (turnIndex !== 0 || seatedPlayers[0].packed) return;

    const user = seatedPlayers[0];
    const betAmount = currentBet * (user.seen ? multiplier : multiplier);

    if (credits < betAmount) {
      sound.playHit();
      showBanner("⚠️ NOT ENOUGH CHIPS IN WALLET! USE FREE TOP-UP!");
      return;
    }

    sound.playCollect();
    triggerChipThrowParticle(0);

    // Deduct player's bet chips immediately from wallet!
    updateWalletBalance(-betAmount, `Teen Patti - Chaal Bet (+${betAmount})`, 'WIN');

    const updated = [...seatedPlayers];
    updated[0].currentBetTotal += betAmount;
    updated[0].lastAction = `CHAAL +${betAmount}`;
    setSeatedPlayers(updated);

    setPot((prev) => prev + betAmount);
    showBanner(`💰 CHAAL +${betAmount} CHIPS PLACED!`);

    advanceTurn();
  };

  // Action: Player Pack (Fold)
  const handlePlayerPack = () => {
    if (turnIndex !== 0 || seatedPlayers[0].packed) return;

    const updated = [...seatedPlayers];
    updated[0].packed = true;
    updated[0].lastAction = 'PACKED (FOLDED)';
    setSeatedPlayers(updated);

    sound.playHit();
    showBanner('🚫 YOU PACKED (FOLDED HAND)');

    const activeAi = updated.filter((p) => !p.isUser && !p.packed);
    if (activeAi.length <= 1) {
      const winnerIdx = activeAi.length === 1 ? activeAi[0].idx : 0;
      handleSingleWinnerVictory(winnerIdx);
    } else {
      // Fast forward AI showdown so user does not wait endlessly on table!
      setTimeout(() => {
        autoResolveAiShowdown(updated);
      }, 1000);
    }
  };

  // Action: Player Requests Sideshow
  const handleRequestSideshow = () => {
    if (turnIndex !== 0 || seatedPlayers[0].packed || !seatedPlayers[0].seen) return;

    // Find previous active SEEN player before user
    const activeSeenOpponents = seatedPlayers.filter((p) => !p.isUser && !p.packed && p.seen);

    if (activeSeenOpponents.length === 0) {
      showBanner('⚠️ SIDESHOW ONLY AVAILABLE AGAINST SEEN OPPONENTS!');
      sound.playHit();
      return;
    }

    const target = activeSeenOpponents[0]; // Choose first active seen opponent

    sound.playClick();
    setSideshowModal({
      requesterName: 'YOU',
      targetName: target.name,
      targetIdx: target.idx,
      requesterIdx: 0,
    });
  };

  // Execute Sideshow Hand Comparison
  const executeSideshowComparison = () => {
    if (!sideshowModal) return;

    const userHandEval = evaluateTeenPattiHand(seatedPlayers[0].cards);
    const targetHandEval = evaluateTeenPattiHand(seatedPlayers[sideshowModal.targetIdx].cards);

    let loserIdx = 0;
    let winnerName = sideshowModal.targetName;

    if (userHandEval.rankValue >= targetHandEval.rankValue) {
      loserIdx = sideshowModal.targetIdx;
      winnerName = 'YOU';
    } else {
      loserIdx = 0;
      winnerName = sideshowModal.targetName;
    }

    const updated = [...seatedPlayers];
    updated[loserIdx].packed = true;
    updated[loserIdx].lastAction = 'LOST SIDESHOW';
    setSeatedPlayers(updated);

    sound.playWin();

    setSideshowModal({
      ...sideshowModal,
      resultText: `⚔️ SIDESHOW RESULT: ${winnerName} WON! ${updated[loserIdx].name} HAS BEEN PACKED!`,
    });

    setTimeout(() => {
      setSideshowModal(null);
      const activePlayers = updated.filter((p) => !p.packed);
      if (activePlayers.length === 1) {
        handleSingleWinnerVictory(activePlayers[0].idx);
      } else {
        advanceTurn();
      }
    }, 2800);
  };

  // Action: Player Showdown
  const handlePlayerShowdown = () => {
    if (turnIndex !== 0 || seatedPlayers[0].packed) return;

    sound.playWin();

    // Evaluate all non-packed players
    const activePlayers = seatedPlayers.filter((p) => !p.packed);
    let bestPlayer = activePlayers[0];
    let bestEval = evaluateTeenPattiHand(bestPlayer.cards);

    activePlayers.forEach((p) => {
      const pEval = evaluateTeenPattiHand(p.cards);
      if (pEval.rankValue > bestEval.rankValue) {
        bestEval = pEval;
        bestPlayer = p;
      }
    });

    if (bestPlayer.isUser) {
      const winnings = pot;
      updateWalletBalance(winnings, `Teen Patti - ${activeArena.name} Showdown Win`, 'WIN');
      setSessionWinnings(winnings);
      setShowdownResult(`🏆 YOU WON SHOWDOWN WITH ${bestEval.categoryName}! CLAIMED +${winnings} CHIPS!`);
      saveProgress(activeArena.id, 3, winnings);
      setGameState('VICTORY');
    } else {
      setShowdownResult(`❌ ${bestPlayer.name} WON SHOWDOWN WITH ${bestEval.categoryName}!`);
      setGameState('GAMEOVER');
    }
  };

  // Fast Auto Showdown when user packs (folds)
  const autoResolveAiShowdown = (currentSeats: SeatedPlayer[]) => {
    const activeAi = currentSeats.filter((p) => !p.isUser && !p.packed);
    if (activeAi.length === 0) return;

    if (activeAi.length === 1) {
      handleSingleWinnerVictory(activeAi[0].idx);
      return;
    }

    // Add 1 final bet from each AI to pot
    const betAmt = currentBetRef.current;
    const extraPot = betAmt * activeAi.length;
    setPot((prev) => prev + extraPot);

    // Evaluate best AI hand
    let bestAi = activeAi[0];
    let bestEval = evaluateTeenPattiHand(bestAi.cards);

    activeAi.forEach((ai) => {
      const aiEval = evaluateTeenPattiHand(ai.cards);
      if (aiEval.rankValue > bestEval.rankValue) {
        bestEval = aiEval;
        bestAi = ai;
      }
    });

    sound.playGameOver();
    setShowdownResult(`❌ ${bestAi.name} WON POT WITH ${bestEval.categoryName}!`);
    setGameState('GAMEOVER');
  };

  // Single Player Remaining Victory
  const handleSingleWinnerVictory = (winnerIdx: number) => {
    const winner = seatedPlayers.find((p) => p.idx === winnerIdx) || seatedPlayers[0];

    if (winner.isUser) {
      const winnings = potRef.current;
      updateWalletBalance(winnings, `Teen Patti - All Opponents Folded Win`, 'WIN');
      setSessionWinnings(winnings);
      setShowdownResult(`🏆 ALL DEALERS PACKED! YOU WIN +${winnings} CHIPS!`);
      saveProgress(activeArena.id, 3, winnings);
      setGameState('VICTORY');
    } else {
      setShowdownResult(`❌ ${winner.name} WON THE POT!`);
      setGameState('GAMEOVER');
    }
  };

  // Advance Turn to Next Seated Player
  const advanceTurn = () => {
    const currentSeats = seatedPlayersRef.current;
    if (currentSeats.length === 0) return;

    let nextTurn = (turnIndexRef.current + 1) % currentSeats.length;

    // Skip packed players
    let loops = 0;
    while (currentSeats[nextTurn]?.packed && loops < currentSeats.length) {
      nextTurn = (nextTurn + 1) % currentSeats.length;
      loops++;
    }

    setTurnIndex(nextTurn);

    if (nextTurn !== 0 && !currentSeats[nextTurn]?.packed) {
      setTimeout(() => processAiTurn(nextTurn), 1100);
    }
  };

  // AI Dealer / Opponent Turn Handler
  const processAiTurn = (aiSeatIdx: number) => {
    if (gameStateRef.current !== 'PLAYING') return;
    const seats = seatedPlayersRef.current;

    // If human user is already packed, auto-resolve AI showdown immediately!
    if (seats[0]?.packed) {
      autoResolveAiShowdown(seats);
      return;
    }

    const ai = seats[aiSeatIdx];

    if (!ai || ai.packed) {
      advanceTurn();
      return;
    }

    // AI randomly sees cards after 1st round
    if (!ai.seen && Math.random() < 0.6) {
      ai.seen = true;
    }

    const aiEval = evaluateTeenPattiHand(ai.cards);
    const isWeakHand = aiEval.category === 'HIGH_CARD' && aiEval.rankValue < 100800;

    const updated = [...seats];

    if (isWeakHand && Math.random() < 0.45) {
      // AI Packs
      updated[aiSeatIdx].packed = true;
      updated[aiSeatIdx].lastAction = 'PACKED (FOLDED)';
      setSeatedPlayers(updated);

      sound.playHit();
      showBanner(`🚫 ${ai.name} Packed (Folded)`);

      const remainingActive = updated.filter((p) => !p.packed);
      if (remainingActive.length === 1) {
        setTimeout(() => handleSingleWinnerVictory(remainingActive[0].idx), 800);
        return;
      }
    } else {
      // AI Chaal Bet
      const betAmt = currentBetRef.current;
      updated[aiSeatIdx].currentBetTotal += betAmt;
      updated[aiSeatIdx].lastAction = `CHAAL +${betAmt}`;
      setSeatedPlayers(updated);

      setPot((prev) => prev + betAmt);
      triggerChipThrowParticle(aiSeatIdx);
      sound.playClick();
      showBanner(`💰 ${ai.name} Bet +${betAmt} Chips`);
    }

    advanceTurn();
  };

  const showBanner = (text: string) => {
    setMatchBanner(text);
    setTimeout(() => setMatchBanner(null), 2500);
  };

  const userPlayer = seatedPlayers[0];
  const userHandEval = userPlayer ? evaluateTeenPattiHand(userPlayer.cards) : null;

  return (
    <div className="flex flex-col w-full font-sans select-none touch-none" style={{ touchAction: 'none' }}>
      {/* --- MAIN 3D CASINO ARENA CONTAINER --- */}
      <div className="relative w-full min-h-[580px] h-[calc(100vh-130px)] max-h-[860px] md:h-[760px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/20 flex flex-col justify-between">
        
        {/* --- ARENA LOBBY SELECTION SCREEN --- */}
        {gameState === 'SELECT' && (
          <div className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-5 md:p-8 overflow-y-auto">
            {/* Header Title & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 tracking-wider flex items-center gap-3">
                  <Crown className="w-8 h-8 text-amber-400 animate-bounce" /> CYBER TEEN PATTI 3D
                </h1>
                <p className="text-cyan-400/90 text-xs sm:text-sm mt-0.5">High-Stakes 3-Card Casino Poker Arena</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={addFreeTopup}
                  className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs rounded-xl shadow-lg hover:brightness-110 transition flex items-center gap-1.5 animate-pulse"
                >
                  <Sparkle className="w-4 h-4 text-yellow-300" /> FREE +2000 CHIPS
                </button>

                <button
                  onClick={openGlobalWallet}
                  className="bg-slate-900 border border-amber-500/50 hover:border-amber-400 px-4 py-2 rounded-xl flex items-center gap-2 text-amber-300 font-extrabold text-sm shadow-md transition hover:scale-105"
                  title="Open Nova Cyber Wallet"
                >
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <span>{credits.toLocaleString()} CHIPS</span>
                </button>

                <button
                  onClick={() => setGameState('GARAGE')}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold text-slate-950 text-xs sm:text-sm rounded-xl shadow-lg hover:brightness-110 transition flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4" /> CHIP SHOP
                </button>

                <button
                  onClick={() => setShowRulesModal(true)}
                  className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-cyan-400 hover:bg-slate-800 transition"
                  title="How to Play Rules"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setIsMuted(sound.toggleMute())}
                  className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-cyan-400 hover:bg-slate-800 transition"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Level Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-auto pb-4">
              {CASINO_ARENAS.map((arena, idx) => {
                const isUnlocked = arena.id <= unlockedLevels;
                const stars = levelStars[arena.id] || 0;

                return (
                  <button
                    key={arena.id}
                    disabled={!isUnlocked}
                    onClick={() => startMatch(idx)}
                    className={`relative p-5 rounded-2xl border text-left transition-all group overflow-hidden ${
                      isUnlocked
                        ? 'bg-gradient-to-b from-slate-900/90 to-slate-950 border-cyan-500/40 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(255,234,0,0.3)] hover:-translate-y-1'
                        : 'bg-slate-950/60 border-slate-800 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[11px] font-bold px-3 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-full flex items-center gap-1">
                        {arena.hasBoss && <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />} ARENA {arena.id}
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3].map((starNum) => (
                          <Star
                            key={starNum}
                            className={`w-4 h-4 ${
                              starNum <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <h3 className="text-lg font-extrabold text-white group-hover:text-amber-300 transition flex items-center gap-2">
                      {arena.name}
                      {!isUnlocked && <Lock className="w-4 h-4 text-slate-500" />}
                    </h3>
                    <p className="text-xs text-pink-400 font-semibold mb-2">{arena.subtitle}</p>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">{arena.description}</p>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-md text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Users className="w-3 h-3 text-cyan-400" /> {arena.opponentsCount + 1} PLAYERS
                      </span>
                      <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-md text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Coins className="w-3 h-3 text-amber-400" /> ANTE {arena.minBet}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                      <span className="text-[11px] text-slate-400">Min Bet: {arena.minBet} Chips</span>
                      <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* --- CHIP CUSTOMIZATION SHOP GARAGE --- */}
        {gameState === 'GARAGE' && (
          <div className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setGameState('SELECT')}
                className="px-4 py-2 bg-slate-900 border border-cyan-500/30 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition flex items-center gap-2 font-bold"
              >
                <ArrowLeft className="w-5 h-5" /> ARENA SELECT
              </button>

              <div className="text-center">
                <h2 className="text-2xl font-black text-white">CASINO CHIP SHOP</h2>
                <p className="text-xs text-cyan-400">Unlock custom high-roller 3D betting chips</p>
              </div>

              <div className="bg-slate-900 border border-amber-500/40 px-4 py-2 rounded-xl text-amber-300 font-bold flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{credits} CHIPS</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-auto">
              {CHIP_SKINS.map((chip) => {
                const isOwned = ownedChipIds.includes(chip.id);
                const isSelected = selectedChipId === chip.id;

                return (
                  <div
                    key={chip.id}
                    className={`relative p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'bg-gradient-to-b from-amber-950/60 to-slate-900 border-amber-400 shadow-[0_0_30px_rgba(255,234,0,0.3)] scale-[1.02]'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="w-full h-36 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-4 relative overflow-hidden">
                        <div
                          className="w-20 h-20 rounded-full border-4 flex items-center justify-center font-black text-2xl shadow-2xl animate-pulse"
                          style={{
                            borderColor: `#${chip.color.toString(16).padStart(6, '0')}`,
                            boxShadow: `0 0 25px #${chip.color.toString(16).padStart(6, '0')}88`,
                            background: `radial-gradient(circle, #${chip.emissive.toString(16).padStart(6, '0')}66 0%, #090514 100%)`,
                            color: `#${chip.color.toString(16).padStart(6, '0')}`,
                          }}
                        >
                          👑
                        </div>
                      </div>

                      <h3 className="text-lg font-extrabold text-white mb-1">{chip.name}</h3>
                      <p className="text-xs text-slate-400 mb-4">{chip.description}</p>
                    </div>

                    {isOwned ? (
                      <button
                        onClick={() => setSelectedChipId(chip.id)}
                        disabled={isSelected}
                        className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 cursor-default'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        }`}
                      >
                        {isSelected ? 'EQUIPPED' : 'SELECT CHIP'}
                      </button>
                    ) : (
                      <button
                        onClick={() => buyChip(chip)}
                        className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                          credits >= chip.price
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4" /> UNLOCK ({chip.price} CHIPS)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- THREE.JS CANVAS MOUNT --- */}
        {gameState === 'PLAYING' && <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none" />}

        {/* --- CHIP THROW VISUAL PARTICLES --- */}
        {gameState === 'PLAYING' &&
          chipParticles.map((p) => (
            <div
              key={p.id}
              className="absolute z-30 w-6 h-6 rounded-full border-2 border-white shadow-2xl pointer-events-none transition-all duration-700 ease-out"
              style={{
                left: `${p.startX}%`,
                top: `${p.startY}%`,
                backgroundColor: p.color,
                boxShadow: `0 0 15px ${p.color}`,
                transform: 'translate(-50%, -50%) scale(1.3)',
                animation: 'chipThrow 0.7s forwards ease-in-out',
              }}
            />
          ))}

        {/* --- TEEN PATTI MATCH HUD OVERLAY --- */}
        {gameState === 'PLAYING' && (
          <div className="absolute inset-0 z-10 p-3 sm:p-5 flex flex-col justify-between pointer-events-none">
            
            {/* Top Bar Info & Seated Opponents Badges */}
            <div className="flex justify-between items-start gap-2 pointer-events-auto">
              <div className="bg-slate-950/90 border border-cyan-500/40 backdrop-blur-md px-3 sm:px-4 py-2 rounded-xl text-white shadow-xl flex items-center gap-3">
                <button
                  onClick={() => setGameState('SELECT')}
                  className="p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div>
                  <div className="text-[10px] sm:text-xs text-cyan-400 font-extrabold uppercase">{activeArena.name}</div>
                  <div className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-400 animate-pulse" /> POT: {pot}
                  </div>
                </div>

                <button
                  onClick={openGlobalWallet}
                  className="px-2.5 py-1 bg-amber-500/20 border border-amber-400/50 rounded-lg text-amber-300 font-extrabold text-xs flex items-center gap-1 hover:bg-amber-500/30 transition hover:scale-105"
                  title="Open Nova Cyber Wallet"
                >
                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                  <span>{credits.toLocaleString()}</span>
                </button>
              </div>

              {/* Seated Opponents Dealer Badges (Top & Sides) */}
              <div className="flex gap-2">
                {seatedPlayers.filter((p) => !p.isUser).map((opponent) => (
                  <div
                    key={opponent.idx}
                    className={`bg-slate-950/90 border px-3 py-1.5 rounded-xl text-center backdrop-blur-md transition-all shadow-xl ${
                      opponent.packed
                        ? 'border-rose-900/50 opacity-40'
                        : turnIndex === opponent.idx
                        ? 'border-amber-400 ring-2 ring-amber-400/60 scale-105 bg-amber-950/40'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-base">{opponent.avatar}</span>
                      <span className="text-[11px] font-black text-white">{opponent.name}</span>
                    </div>

                    <div className="text-[10px] font-extrabold mt-0.5">
                      {opponent.packed ? (
                        <span className="text-rose-400">PACKED</span>
                      ) : (
                        <span className={opponent.seen ? 'text-emerald-400' : 'text-amber-400'}>
                          {opponent.seen ? '👁️ SEEN' : '🙈 BLIND'}
                        </span>
                      )}
                    </div>

                    {opponent.lastAction && (
                      <div className="text-[9px] text-cyan-300 bg-slate-900/90 px-1.5 py-0.5 rounded mt-1 border border-cyan-500/20">
                        {opponent.lastAction}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Event Match Banner Overlay */}
            {matchBanner && (
              <div className="self-center bg-amber-950/95 border-2 border-amber-400 text-amber-300 font-black px-6 py-2.5 rounded-full shadow-2xl animate-bounce text-xs sm:text-sm text-center max-w-[90%] pointer-events-auto">
                {matchBanner}
              </div>
            )}

            {/* Center Felt Table Playing Cards Display */}
            <div className="flex flex-col items-center justify-center pointer-events-auto my-auto gap-3">
              
              {/* User 3 Dealt Cards */}
              <div className="flex gap-2.5 sm:gap-4">
                {userPlayer?.cards.map((card, cIdx) => (
                  <div
                    key={card.id}
                    className={`w-20 h-28 sm:w-24 sm:h-36 md:w-28 md:h-40 rounded-xl border-2 p-2 flex flex-col justify-between shadow-2xl transition-all duration-500 ${
                      userPlayer.seen
                        ? card.color === 'RED'
                          ? 'bg-gradient-to-b from-slate-900 via-rose-950 to-slate-950 border-rose-400 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                          : 'bg-gradient-to-b from-slate-900 via-cyan-950 to-slate-950 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                        : 'bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 border-amber-400/80 text-amber-400'
                    } ${isDealingAnimation ? 'scale-0 rotate-180' : 'scale-100 rotate-0'}`}
                    style={{ transitionDelay: `${cIdx * 150}ms` }}
                  >
                    {userPlayer.seen ? (
                      <>
                        <div className="text-xs font-black flex justify-between">
                          <span>{card.label}</span>
                          <span>{card.symbol}</span>
                        </div>
                        <div className="text-2xl sm:text-4xl text-center font-black my-auto">{card.symbol}</div>
                        <div className="text-xs font-black text-right">{card.label}</div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center">
                        <EyeOff className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400/70 mb-1 animate-pulse" />
                        <span className="text-[10px] sm:text-xs font-black tracking-widest text-amber-400">BLIND</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Hand Category Rank Indicator */}
              {userPlayer?.seen ? (
                <div className="bg-slate-950/95 border-2 border-amber-400/60 px-4 py-1.5 rounded-full text-xs font-black text-amber-300 tracking-wider shadow-2xl flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{userHandEval?.categoryName}</span>
                </div>
              ) : (
                <button
                  onClick={handleSeeCards}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 border border-cyan-300 text-white font-extrabold px-4 py-1.5 rounded-full text-xs hover:brightness-110 active:scale-95 transition shadow-lg flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" /> TAP TO SEE CARDS (2X STAKES)
                </button>
              )}
            </div>

            {/* Bottom Interactive Control Console Bar */}
            <div className="pointer-events-auto bg-slate-950/95 border border-cyan-500/40 backdrop-blur-md p-3 sm:p-4 rounded-2xl flex flex-col gap-2.5 shadow-2xl">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] sm:text-xs font-black text-cyan-400">YOUR SEAT:</span>
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    🤠 YOU {userPlayer?.seen ? '(SEEN)' : '(BLIND)'}
                  </span>
                </div>

                {turnIndex === 0 && !userPlayer?.packed ? (
                  <span className="text-[10px] sm:text-xs font-black px-3 py-0.5 bg-emerald-500/20 border border-emerald-400 text-emerald-300 rounded-full animate-pulse flex items-center gap-1">
                    👉 YOUR TURN! SELECT ACTION
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-400">
                    OPPONENT DEALER IS BETTING...
                  </span>
                )}
              </div>

              {/* Action Buttons Console Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {!userPlayer?.seen ? (
                  <button
                    onClick={handleSeeCards}
                    className="py-3 bg-gradient-to-r from-cyan-500 to-blue-600 font-extrabold text-white rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1 text-xs"
                  >
                    <Eye className="w-4 h-4" /> SEE CARDS
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlayerBet(2)}
                    disabled={turnIndex !== 0 || userPlayer?.packed}
                    className={`py-3 rounded-xl font-extrabold transition flex items-center justify-center gap-1 text-xs ${
                      turnIndex === 0 && !userPlayer?.packed
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-lg hover:brightness-110 active:scale-95 ring-2 ring-amber-300'
                        : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" /> RAISE 2X ({currentBet * 2})
                  </button>
                )}

                <button
                  onClick={() => handlePlayerBet(1)}
                  disabled={turnIndex !== 0 || userPlayer?.packed}
                  className={`py-3 rounded-xl font-extrabold transition flex items-center justify-center gap-1 text-xs ${
                    turnIndex === 0 && !userPlayer?.packed
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-lg hover:brightness-110 active:scale-95 ring-1 ring-amber-400'
                      : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  <Coins className="w-4 h-4" /> CHAAL (+{currentBet})
                </button>

                <button
                  onClick={handleRequestSideshow}
                  disabled={turnIndex !== 0 || userPlayer?.packed || !userPlayer?.seen}
                  className={`py-3 rounded-xl font-extrabold transition flex items-center justify-center gap-1 text-xs ${
                    turnIndex === 0 && !userPlayer?.packed && userPlayer?.seen
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:brightness-110 active:scale-95 border border-purple-400'
                      : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  <Swords className="w-4 h-4 text-purple-300" /> SIDESHOW
                </button>

                <button
                  onClick={handlePlayerPack}
                  disabled={turnIndex !== 0 || userPlayer?.packed}
                  className={`py-3 rounded-xl font-extrabold transition flex items-center justify-center gap-1 text-xs ${
                    turnIndex === 0 && !userPlayer?.packed
                      ? 'bg-slate-800 border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 active:scale-95'
                      : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  <Shield className="w-4 h-4 text-rose-400" /> PACK (FOLD)
                </button>

                <button
                  onClick={handlePlayerShowdown}
                  disabled={turnIndex !== 0 || userPlayer?.packed}
                  className={`py-3 rounded-xl font-extrabold transition flex items-center justify-center gap-1 text-xs ${
                    turnIndex === 0 && !userPlayer?.packed
                      ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg hover:brightness-110 active:scale-95 ring-2 ring-pink-400'
                      : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  <Crown className="w-4 h-4 text-amber-300" /> SHOWDOWN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- SIDESHOW CHALLENGE MODAL OVERLAY --- */}
        {sideshowModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-slate-900 border-2 border-purple-500 p-6 rounded-2xl max-w-md w-full shadow-2xl">
              <div className="p-3 bg-purple-500/20 border border-purple-400/40 rounded-full w-14 h-14 mx-auto mb-3 flex items-center justify-center text-purple-300">
                <Swords className="w-8 h-8 animate-bounce" />
              </div>

              <h2 className="text-2xl font-black text-white mb-1">SIDESHOW CHALLENGE</h2>
              <p className="text-xs text-purple-300 mb-4">
                Comparing hands confidentially between <span className="font-extrabold text-amber-300">{sideshowModal.requesterName}</span> vs{' '}
                <span className="font-extrabold text-cyan-300">{sideshowModal.targetName}</span>
              </p>

              {sideshowModal.resultText ? (
                <div className="bg-purple-950/80 border border-purple-400/40 p-4 rounded-xl text-amber-300 font-extrabold text-sm mb-4 animate-pulse">
                  {sideshowModal.resultText}
                </div>
              ) : (
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={executeSideshowComparison}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 font-extrabold text-white rounded-xl shadow-lg hover:brightness-110 transition flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2 className="w-5 h-5" /> REVEAL SIDESHOW RESULT
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- RULES MODAL OVERLAY --- */}
        {showRulesModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6">
            <div className="bg-slate-900 border border-cyan-500/40 p-6 rounded-2xl max-w-lg w-full shadow-2xl text-slate-200 overflow-y-auto max-h-[85vh]">
              <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                <h3 className="text-xl font-extrabold text-amber-300 flex items-center gap-2">
                  <Info className="w-5 h-5 text-cyan-400" /> TEEN PATTI RULES & HAND RANKS
                </h3>
                <button onClick={() => setShowRulesModal(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="font-extrabold text-amber-400 mb-0.5">1. TRAIL / TRIO (Three of a Kind)</div>
                  <div className="text-slate-400">Three cards of same rank (e.g., A-A-A is highest, 2-2-2 is lowest).</div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="font-extrabold text-pink-400 mb-0.5">2. PURE SEQUENCE (Straight Flush)</div>
                  <div className="text-slate-400">Three consecutive cards of same suit (e.g., A-K-Q or 4-3-2 of Spades).</div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="font-extrabold text-cyan-400 mb-0.5">3. SEQUENCE (Straight)</div>
                  <div className="text-slate-400">Three consecutive cards of mixed suits (e.g., A-K-Q or 7-6-5).</div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="font-extrabold text-emerald-400 mb-0.5">4. COLOR (Flush)</div>
                  <div className="text-slate-400">Three cards of same suit not in sequence.</div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="font-extrabold text-purple-400 mb-0.5">5. PAIR (Two of a Kind)</div>
                  <div className="text-slate-400">Two cards of same rank (e.g., K-K-5).</div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="font-extrabold text-slate-300 mb-0.5">6. SIDESHOW RULE</div>
                  <div className="text-slate-400">Seen players can challenge the previous Seen player to a private comparison. Lower hand folds!</div>
                </div>
              </div>

              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full mt-5 py-3 bg-amber-500 text-slate-950 font-extrabold rounded-xl hover:bg-amber-400 transition"
              >
                GOT IT, LET'S PLAY!
              </button>
            </div>
          </div>
        )}

        {/* --- GAMEOVER OVERLAY --- */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-4xl font-black text-rose-500 mb-2">ROUND LOST</h2>
            <p className="text-cyan-300 font-semibold mb-6">{showdownResult || 'AI Dealer won the pot!'}</p>

            <div className="flex gap-4">
              <button
                onClick={() => startMatch(currentLevelIdx)}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 font-extrabold text-white rounded-xl shadow-lg hover:brightness-110 transition flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> DEAL AGAIN
              </button>
              <button
                onClick={() => setGameState('SELECT')}
                className="px-6 py-3 bg-slate-800 border border-slate-700 font-extrabold text-slate-200 rounded-xl hover:bg-slate-700 transition"
              >
                ARENA SELECT
              </button>
            </div>
          </div>
        )}

        {/* --- VICTORY OVERLAY --- */}
        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="p-4 bg-amber-500/20 border border-amber-400/40 rounded-full mb-3 text-amber-400 animate-bounce">
              <Trophy className="w-12 h-12" />
            </div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 mb-2">
              POT WINNER!
            </h2>
            <p className="text-cyan-300 font-semibold mb-4">{showdownResult || `${activeArena.name} Cleared`}</p>

            <div className="bg-slate-900/90 border border-amber-500/40 p-4 rounded-2xl mb-6 w-80 text-slate-200 space-y-2 shadow-2xl">
              <div className="flex justify-between text-amber-300 font-extrabold text-base">
                <span>TOTAL WINNINGS:</span>
                <span>+{sessionWinnings} CHIPS</span>
              </div>
            </div>

            <div className="flex gap-4">
              {currentLevelIdx < CASINO_ARENAS.length - 1 && (
                <button
                  onClick={() => startMatch(currentLevelIdx + 1)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold text-slate-950 rounded-xl shadow-lg hover:brightness-110 transition flex items-center gap-2"
                >
                  NEXT ARENA <ChevronRight className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setGameState('SELECT')}
                className="px-6 py-3 bg-slate-800 border border-slate-700 font-extrabold text-slate-200 rounded-xl hover:bg-slate-700 transition"
              >
                ARENA SELECT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
