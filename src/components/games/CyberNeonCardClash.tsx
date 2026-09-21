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
  HelpCircle,
  Eye,
} from 'lucide-react';
import { sound } from '../../utils/audio';

// --- Types & Interfaces ---

export type CardColor = 'CYAN' | 'PINK' | 'YELLOW' | 'GREEN' | 'WILD';
export type CardType = 'NUMBER' | 'PLUS_TWO' | 'PLUS_FOUR' | 'SKIP' | 'REVERSE' | 'WILD_COLOR';

export interface CardData {
  id: string;
  color: CardColor;
  value: number | string;
  type: CardType;
}

export interface DeckSkin {
  id: string;
  name: string;
  price: number;
  color: number;
  emissive: number;
  description: string;
}

export const DECK_SKINS: DeckSkin[] = [
  { id: 'synthwave', name: 'SYNTHWAVE CYAN', price: 0, color: 0x00f2fe, emissive: 0x00f2fe, description: 'Classic glowing neon cyber grid card back.' },
  { id: 'matrix', name: 'MATRIX EMERALD', price: 1200, color: 0x00ff66, emissive: 0x00ffaa, description: 'Green digital rain code stream pattern.' },
  { id: 'dragon', name: 'DRAGON FLAME', price: 3000, color: 0xffea00, emissive: 0xff6600, description: 'Golden solar flare fiery dragon back.' },
  { id: 'apex', name: 'APEX MULTIVERSE', price: 6000, color: 0xff00ff, emissive: 0x00ffff, description: 'Chroma rainbow pulse quantum energy card deck.' },
];

export interface CasinoArena {
  id: number;
  name: string;
  subtitle: string;
  opponentsCount: number;
  tableColor: number;
  fogColor: number;
  accentColor: number;
  hasBoss?: boolean;
  bossName?: string;
  description: string;
}

const CASINO_ARENAS: CasinoArena[] = [
  { id: 1, name: 'Neon Lounge', subtitle: 'Beginner Table', opponentsCount: 1, tableColor: 0x0f172a, fogColor: 0x090514, accentColor: 0x00f2fe, description: 'Relaxed 1v1 duel against Cyber Dealer Jax.' },
  { id: 2, name: 'Cyber Underground', subtitle: 'High-Stakes Bar', opponentsCount: 2, tableColor: 0x1e1b4b, fogColor: 0x0c0a24, accentColor: 0xff007f, description: 'Fast 3-player match with wild power card drops.' },
  { id: 3, name: 'Skyline Penthouse', subtitle: 'VIP Casino', opponentsCount: 2, tableColor: 0x14532d, fogColor: 0x052e16, accentColor: 0xffea00, description: 'High-altitude luxury game table with +4 EMP cards.' },
  { id: 4, name: 'Matrix Club Zero', subtitle: 'Digital Vault', opponentsCount: 3, tableColor: 0x022c22, fogColor: 0x011c15, accentColor: 0x00ff66, description: 'Intense 4-player battle in green matrix cyberspace.' },
  { id: 5, name: 'Quantum Arena', subtitle: 'Boss Dealer Trial', opponentsCount: 3, tableColor: 0x1e3a8a, fogColor: 0x0f172a, accentColor: 0x00e1ff, hasBoss: true, bossName: 'Quantum Oracle', description: 'Defeat the Quantum Oracle Boss in a 4-way showdown!' },
  { id: 6, name: 'High-Roller Stratosphere', subtitle: 'Cloud Club', opponentsCount: 2, tableColor: 0x312e81, fogColor: 0x1e1b4b, accentColor: 0xa855f7, description: 'Speed rounds with double skip and reverse cards.' },
  { id: 7, name: 'Volcanic Inferno VIP', subtitle: 'Magma Arena', opponentsCount: 3, tableColor: 0x450a0a, fogColor: 0x270707, accentColor: 0xff3300, description: 'Fiery high stakes where errors cost 2 draw cards!' },
  { id: 8, name: 'Orbital Space Casino', subtitle: 'Cosmos Tournament', opponentsCount: 3, tableColor: 0x3b0764, fogColor: 0x1d0436, accentColor: 0xd946ef, hasBoss: true, bossName: 'Cosmic Overlord', description: 'Face Cosmic Overlord Dealer in zero gravity!' },
  { id: 9, name: 'Solar Corona Royale', subtitle: 'Golden Cup', opponentsCount: 3, tableColor: 0x713f12, fogColor: 0x3a2008, accentColor: 0xfacc15, description: 'Semifinials of the Cyber Card World League.' },
  { id: 10, name: 'Apex Titan Championship', subtitle: 'Grand Final', opponentsCount: 3, tableColor: 0x701a75, fogColor: 0x3b0764, accentColor: 0x00ffff, hasBoss: true, bossName: 'Apex Titan Dealer', description: 'The ultimate 4-player Championship Final!' },
];

const COLOR_HEX: Record<CardColor, number> = {
  CYAN: 0x00f2fe,
  PINK: 0xff007f,
  YELLOW: 0xffea00,
  GREEN: 0x00ff66,
  WILD: 0xa855f7,
};

const COLOR_TAILWIND: Record<CardColor, string> = {
  CYAN: 'from-cyan-500 to-blue-600 border-cyan-400 text-cyan-300',
  PINK: 'from-pink-500 to-rose-600 border-pink-400 text-pink-300',
  YELLOW: 'from-amber-400 to-orange-500 border-amber-300 text-amber-200',
  GREEN: 'from-emerald-400 to-teal-600 border-emerald-300 text-emerald-200',
  WILD: 'from-purple-500 via-pink-500 to-cyan-400 border-purple-300 text-white',
};

// Generate Full Cyber Deck
const GENERATE_DECK = (): CardData[] => {
  const deck: CardData[] = [];
  const colors: CardColor[] = ['CYAN', 'PINK', 'YELLOW', 'GREEN'];

  colors.forEach((col) => {
    // Numbers 0 to 9
    for (let n = 0; n <= 9; n++) {
      deck.push({ id: `${col}_${n}_1`, color: col, value: n, type: 'NUMBER' });
      if (n > 0) deck.push({ id: `${col}_${n}_2`, color: col, value: n, type: 'NUMBER' });
    }

    // Action Cards (+2, Skip, Reverse)
    deck.push({ id: `${col}_PLUS2_1`, color: col, value: '+2', type: 'PLUS_TWO' });
    deck.push({ id: `${col}_PLUS2_2`, color: col, value: '+2', type: 'PLUS_TWO' });
    deck.push({ id: `${col}_SKIP_1`, color: col, value: '🚫', type: 'SKIP' });
    deck.push({ id: `${col}_SKIP_2`, color: col, value: '🚫', type: 'SKIP' });
    deck.push({ id: `${col}_REV_1`, color: col, value: '🔄', type: 'REVERSE' });
    deck.push({ id: `${col}_REV_2`, color: col, value: '🔄', type: 'REVERSE' });
  });

  // Wild Cards (+4 EMP and Wild Color Change)
  for (let w = 1; w <= 4; w++) {
    deck.push({ id: `WILD_COLOR_${w}`, color: 'WILD', value: '🌈', type: 'WILD_COLOR' });
    deck.push({ id: `WILD_PLUS4_${w}`, color: 'WILD', value: '+4', type: 'PLUS_FOUR' });
  }

  // Shuffle Deck (Fisher-Yates)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

export const CyberNeonCardClash: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Game Navigation & Storage State
  const [gameState, setGameState] = useState<'SELECT' | 'GARAGE' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('SELECT');
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [unlockedLevels, setUnlockedLevels] = useState<number>(() => {
    const saved = localStorage.getItem('cyber_card_unlocked_lvl');
    return saved ? parseInt(saved, 10) : 10;
  });

  const [credits, setCredits] = useState<number>(() => {
    const saved = localStorage.getItem('cyber_card_credits');
    return saved ? parseInt(saved, 10) : 800;
  });

  const [selectedSkinId, setSelectedSkinId] = useState<string>(() => {
    const saved = localStorage.getItem('cyber_card_skin_selected');
    return saved || 'synthwave';
  });

  const [ownedSkinIds, setOwnedSkinIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('cyber_card_skins_owned');
    return saved ? JSON.parse(saved) : ['synthwave'];
  });

  const [levelStars, setLevelStars] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem('cyber_card_stars');
    return saved ? JSON.parse(saved) : {};
  });

  // Active Match Gameplay State
  const [drawDeck, setDrawDeck] = useState<CardData[]>([]);
  const [discardPile, setDiscardPile] = useState<CardData[]>([]);
  const [playerHand, setPlayerHand] = useState<CardData[]>([]);
  const [aiHands, setAiHands] = useState<CardData[][]>([]);
  const [turnIndex, setTurnIndex] = useState<number>(0); // 0 = Player, 1+ = AI
  const [direction, setDirection] = useState<number>(1); // 1 = clockwise, -1 = counter
  const [activeColor, setActiveColor] = useState<CardColor>('CYAN');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState<boolean>(false);
  const [pendingWildCard, setPendingWildCard] = useState<CardData | null>(null);
  const [sessionCredits, setSessionCredits] = useState<number>(0);
  const [matchBanner, setMatchBanner] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());
  const [hasSaidClash, setHasSaidClash] = useState<boolean>(false);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const discardMeshRef = useRef<THREE.Mesh | null>(null);
  const animFrameId = useRef<number | null>(null);

  const activeSkin = DECK_SKINS.find((s) => s.id === selectedSkinId) || DECK_SKINS[0];
  const activeArena = CASINO_ARENAS[currentLevelIdx] || CASINO_ARENAS[0];

  // Save Progress Helpers
  const saveProgress = (levelId: number, stars: number, earnedCreds: number) => {
    const updatedStars = { ...levelStars, [levelId]: Math.max(levelStars[levelId] || 0, stars) };
    setLevelStars(updatedStars);
    localStorage.setItem('cyber_card_stars', JSON.stringify(updatedStars));

    const nextUnlocked = Math.max(unlockedLevels, Math.min(10, levelId + 1));
    setUnlockedLevels(nextUnlocked);
    localStorage.setItem('cyber_card_unlocked_lvl', String(nextUnlocked));

    const updatedCreds = credits + earnedCreds;
    setCredits(updatedCreds);
    localStorage.setItem('cyber_card_credits', String(updatedCreds));
  };

  const buySkin = (skin: DeckSkin) => {
    if (credits >= skin.price && !ownedSkinIds.includes(skin.id)) {
      const newCreds = credits - skin.price;
      const newOwned = [...ownedSkinIds, skin.id];
      setCredits(newCreds);
      setOwnedSkinIds(newOwned);
      setSelectedSkinId(skin.id);

      localStorage.setItem('cyber_card_credits', String(newCreds));
      localStorage.setItem('cyber_card_skins_owned', JSON.stringify(newOwned));
      localStorage.setItem('cyber_card_skin_selected', skin.id);
      sound.playWin();
    } else {
      sound.playHit();
    }
  };

  // Launch New Match
  const startMatch = (levelIndex: number) => {
    setCurrentLevelIdx(levelIndex);
    const arena = CASINO_ARENAS[levelIndex];

    const newDeck = GENERATE_DECK();
    const pHand: CardData[] = [];
    const aHands: CardData[][] = Array.from({ length: arena.opponentsCount }, () => []);

    // Deal 7 cards to each player
    for (let c = 0; c < 7; c++) {
      pHand.push(newDeck.pop()!);
      for (let o = 0; o < arena.opponentsCount; o++) {
        aHands[o].push(newDeck.pop()!);
      }
    }

    // Top card for discard stack
    let firstCard = newDeck.pop()!;
    while (firstCard.color === 'WILD') {
      newDeck.unshift(firstCard);
      firstCard = newDeck.pop()!;
    }

    setDrawDeck(newDeck);
    setDiscardPile([firstCard]);
    setPlayerHand(pHand);
    setAiHands(aHands);
    setActiveColor(firstCard.color);
    setTurnIndex(0);
    setDirection(1);
    setSessionCredits(0);
    setHasSaidClash(false);
    setGameState('PLAYING');
    sound.playClick();
  };

  // Initialize Three.js 3D Casino Table Scene
  useEffect(() => {
    if (!mountRef.current || gameState !== 'PLAYING') return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(activeArena.fogColor);
    scene.fog = new THREE.FogExp2(activeArena.fogColor, 0.0012);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 55, 45);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(activeArena.accentColor, 1.8);
    dirLight.position.set(0, 100, 50);
    scene.add(dirLight);

    // 3D Casino Card Table Surface
    const tableGeo = new THREE.CylinderGeometry(40, 42, 2, 48);
    const tableMat = new THREE.MeshStandardMaterial({
      color: activeArena.tableColor,
      roughness: 0.4,
      metalness: 0.6,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -1;
    scene.add(table);

    // Table Glowing Neon Ring Edge
    const ringGeo = new THREE.TorusGeometry(40.5, 0.8, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: activeArena.accentColor });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // Draw Deck Stack Mesh
    const deckGeo = new THREE.BoxGeometry(10, 2.5, 14);
    const deckMat = new THREE.MeshStandardMaterial({
      color: activeSkin.color,
      emissive: activeSkin.emissive,
      emissiveIntensity: 0.5,
    });
    const deckStack = new THREE.Mesh(deckGeo, deckMat);
    deckStack.position.set(-15, 1.2, 0);
    scene.add(deckStack);

    // Discard Pile Top Card Mesh
    const discardGeo = new THREE.BoxGeometry(10, 0.2, 14);
    const discardMat = new THREE.MeshStandardMaterial({
      color: COLOR_HEX[activeColor] || 0x00f2fe,
      emissive: COLOR_HEX[activeColor] || 0x00f2fe,
      emissiveIntensity: 0.8,
    });
    const discardCard = new THREE.Mesh(discardGeo, discardMat);
    discardCard.position.set(5, 0.1, 0);
    scene.add(discardCard);
    discardMeshRef.current = discardCard;

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);

      if (discardMeshRef.current) {
        discardMeshRef.current.rotation.y += 0.005;
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
  }, [gameState, currentLevelIdx, activeColor, selectedSkinId]);

  // Update Discard 3D Mesh Color
  useEffect(() => {
    if (discardMeshRef.current && discardPile.length > 0) {
      const top = discardPile[discardPile.length - 1];
      const colorHex = COLOR_HEX[activeColor] || COLOR_HEX[top.color] || 0x00f2fe;
      (discardMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(colorHex);
      (discardMeshRef.current.material as THREE.MeshStandardMaterial).emissive.setHex(colorHex);
    }
  }, [discardPile, activeColor]);

  // Check if a card is valid to play
  const isValidPlay = (card: CardData): boolean => {
    if (discardPile.length === 0) return true;
    const topCard = discardPile[discardPile.length - 1];

    if (card.color === 'WILD' || card.type === 'WILD_COLOR' || card.type === 'PLUS_FOUR') return true;
    if (card.color === activeColor) return true;
    if (card.value === topCard.value && card.value !== '') return true;
    if (card.type === topCard.type && card.type !== 'NUMBER') return true;

    return false;
  };

  // Execute Playing a Card
  const playCard = (card: CardData, chosenWildColor?: CardColor) => {
    if (turnIndex !== 0 && gameState === 'PLAYING') return;

    if (card.color === 'WILD' && !chosenWildColor) {
      setPendingWildCard(card);
      setIsColorPickerOpen(true);
      return;
    }

    const nextColor = chosenWildColor || (card.color === 'WILD' ? 'CYAN' : card.color);

    sound.playCollect();

    // Remove played card from player's hand
    const updatedHand = playerHand.filter((c) => c.id !== card.id);
    setPlayerHand(updatedHand);
    setDiscardPile((prev) => [...prev, card]);
    setActiveColor(nextColor);

    // Check Player Victory
    if (updatedHand.length === 0) {
      handleMatchVictory();
      return;
    }

    if (updatedHand.length === 1 && !hasSaidClash) {
      showBanner('⚡ CYBER CLASH ALERT! 1 CARD LEFT!');
      sound.playPowerup();
      setHasSaidClash(true);
    }

    // Process Action Card Powers
    advanceTurnAfterPlay(card, updatedHand.length);
  };

  // Draw Card from Deck
  const handlePlayerDraw = () => {
    if (turnIndex !== 0 || drawDeck.length === 0) return;

    sound.playClick();

    const newDeck = [...drawDeck];
    const drawn = newDeck.pop()!;
    setDrawDeck(newDeck);

    const updatedHand = [...playerHand, drawn];
    setPlayerHand(updatedHand);

    showBanner(`Drawn card: ${drawn.color} ${drawn.value}`);

    // If playable, auto advance turn or let player play
    if (!isValidPlay(drawn)) {
      setTimeout(() => advanceTurn(1), 1000);
    }
  };

  // Advance Turn & Process Action Special Effects
  const advanceTurnAfterPlay = (playedCard: CardData, remainingHandCount: number) => {
    const totalPlayers = activeArena.opponentsCount + 1;
    let step = direction;

    if (playedCard.type === 'SKIP') {
      step *= 2;
      showBanner('🚫 SYSTEM SHIELD! NEXT TURN SKIPPED');
      sound.playEmp();
    } else if (playedCard.type === 'REVERSE') {
      const nextDir = direction * -1;
      setDirection(nextDir);
      step = nextDir;
      showBanner('🔄 REVERSE HACK ACTIVATED');
      sound.playEmp();
    }

    let targetOpponent = (turnIndex + step + totalPlayers * 10) % totalPlayers;

    // Apply +2 or +4 Card Penalty
    if (playedCard.type === 'PLUS_TWO') {
      showBanner('⚡ GLITCH +2! OPPONENT DRAWS 2 CARDS');
      sound.playLaser();
      givePenaltyCards(targetOpponent, 2);
    } else if (playedCard.type === 'PLUS_FOUR') {
      showBanner('💥 CYBER EMP +4! OPPONENT DRAWS 4 CARDS');
      sound.playExplosion();
      givePenaltyCards(targetOpponent, 4);
    }

    advanceTurn(step);
  };

  const givePenaltyCards = (targetPlayerIdx: number, count: number) => {
    if (drawDeck.length < count) return;
    const newDeck = [...drawDeck];
    const penaltyCards: CardData[] = [];
    for (let i = 0; i < count; i++) {
      if (newDeck.length > 0) penaltyCards.push(newDeck.pop()!);
    }
    setDrawDeck(newDeck);

    if (targetPlayerIdx === 0) {
      setPlayerHand((prev) => [...prev, ...penaltyCards]);
    } else {
      const aiIdx = targetPlayerIdx - 1;
      setAiHands((prev) => {
        const copy = [...prev];
        copy[aiIdx] = [...copy[aiIdx], ...penaltyCards];
        return copy;
      });
    }
  };

  const advanceTurn = (step: number) => {
    const totalPlayers = activeArena.opponentsCount + 1;
    const nextTurn = (turnIndex + step + totalPlayers * 10) % totalPlayers;
    setTurnIndex(nextTurn);

    if (nextTurn !== 0) {
      // AI Turn Execution after 1.2s delay
      setTimeout(() => processAiTurn(nextTurn - 1), 1200);
    }
  };

  // AI Dealer Turn Automation
  const processAiTurn = (aiIdx: number) => {
    if (gameState !== 'PLAYING') return;

    setAiHands((currentAiHands) => {
      const hand = currentAiHands[aiIdx];
      if (!hand) return currentAiHands;

      // Find valid cards to play
      const playable = hand.filter((c) => isValidPlay(c));

      if (playable.length > 0) {
        // AI chooses best card: prefers action cards (+4, +2, Skip), then matching color
        const cardToPlay =
          playable.find((c) => c.type === 'PLUS_FOUR' || c.type === 'PLUS_TWO' || c.type === 'SKIP') ||
          playable.find((c) => c.color === activeColor) ||
          playable[0];

        sound.playClick();

        const updatedAiHand = hand.filter((c) => c.id !== cardToPlay.id);
        const updatedAiHands = [...currentAiHands];
        updatedAiHands[aiIdx] = updatedAiHand;

        setDiscardPile((prev) => [...prev, cardToPlay]);

        // Choose new color if Wild
        const colors: CardColor[] = ['CYAN', 'PINK', 'YELLOW', 'GREEN'];
        const chosenColor = cardToPlay.color === 'WILD' ? colors[Math.floor(Math.random() * colors.length)] : cardToPlay.color;
        setActiveColor(chosenColor);

        // Check AI Victory
        if (updatedAiHand.length === 0) {
          setTimeout(() => handleMatchLoss(aiIdx), 500);
          return updatedAiHands;
        }

        // Process AI Action Card
        let step = direction;
        if (cardToPlay.type === 'SKIP') {
          step *= 2;
          showBanner(`🚫 Dealer ${aiIdx + 1} played SKIP!`);
        } else if (cardToPlay.type === 'REVERSE') {
          const nextDir = direction * -1;
          setDirection(nextDir);
          step = nextDir;
          showBanner(`🔄 Dealer ${aiIdx + 1} REVERSED play direction!`);
        }

        const totalPlayers = activeArena.opponentsCount + 1;
        const currentTurnVal = aiIdx + 1;
        const targetOpponent = (currentTurnVal + step + totalPlayers * 10) % totalPlayers;

        if (cardToPlay.type === 'PLUS_TWO') {
          showBanner(`⚡ Dealer ${aiIdx + 1} played +2 GLITCH!`);
          givePenaltyCards(targetOpponent, 2);
        } else if (cardToPlay.type === 'PLUS_FOUR') {
          showBanner(`💥 Dealer ${aiIdx + 1} played +4 EMP!`);
          givePenaltyCards(targetOpponent, 4);
        }

        const nextTurn = (currentTurnVal + step + totalPlayers * 10) % totalPlayers;
        setTurnIndex(nextTurn);

        if (nextTurn !== 0) {
          setTimeout(() => processAiTurn(nextTurn - 1), 1200);
        }

        return updatedAiHands;
      } else {
        // AI Draws a Card
        if (drawDeck.length > 0) {
          const newDeck = [...drawDeck];
          const drawnCard = newDeck.pop()!;
          setDrawDeck(newDeck);

          const updatedAiHand = [...hand, drawnCard];
          const updatedAiHands = [...currentAiHands];
          updatedAiHands[aiIdx] = updatedAiHand;

          showBanner(`Dealer ${aiIdx + 1} drew a card.`);

          const totalPlayers = activeArena.opponentsCount + 1;
          const nextTurn = (aiIdx + 1 + direction + totalPlayers * 10) % totalPlayers;
          setTurnIndex(nextTurn);

          if (nextTurn !== 0) {
            setTimeout(() => processAiTurn(nextTurn - 1), 1200);
          }

          return updatedAiHands;
        }

        return currentAiHands;
      }
    });
  };

  const handleSelectWildColor = (col: CardColor) => {
    setIsColorPickerOpen(false);
    if (pendingWildCard) {
      playCard(pendingWildCard, col);
      setPendingWildCard(null);
    }
  };

  const showBanner = (text: string) => {
    setMatchBanner(text);
    setTimeout(() => setMatchBanner(null), 2400);
  };

  const handleMatchVictory = () => {
    sound.playWin();
    const earnedCreds = 500 + currentLevelIdx * 150;
    const stars = playerHand.length === 0 ? 3 : 2;
    setSessionCredits(earnedCreds);
    saveProgress(activeArena.id, stars, earnedCreds);
    setGameState('VICTORY');
  };

  const handleMatchLoss = (winningAiIdx: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
  };

  return (
    <div className="flex flex-col w-full font-sans select-none touch-none" style={{ touchAction: 'none' }}>
      {/* --- 3D CARD ARENA VIEWPORT CONTAINER --- */}
      <div className="relative w-full h-[540px] md:h-[720px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/20">
        {/* --- LEVEL SELECTION SCREEN --- */}
        {gameState === 'SELECT' && (
          <div className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-slate-950 via-purple-950/40 to-slate-950 p-6 md:p-8 overflow-y-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-300 tracking-wider">
                  CYBER NEON CARD CLASH 3D
                </h1>
                <p className="text-cyan-400/80 text-sm mt-0.5">Select your tournament casino arena</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-slate-900/90 border border-amber-500/40 px-4 py-2 rounded-xl flex items-center gap-2 text-amber-300 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>{credits} CREDITS</span>
                </div>

                <button
                  onClick={() => setGameState('GARAGE')}
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white rounded-xl shadow-lg hover:brightness-110 transition flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" /> CARD DECK SHOP
                </button>

                <button
                  onClick={() => setIsMuted(sound.toggleMute())}
                  className="p-2.5 bg-slate-900 border border-cyan-500/30 rounded-xl text-cyan-400 hover:bg-cyan-500/20 transition"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Level Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-auto">
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
                        ? 'bg-slate-900/80 border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(0,242,254,0.3)] hover:-translate-y-1'
                        : 'bg-slate-950/60 border-slate-800 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 rounded-full flex items-center gap-1">
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

                    <h3 className="text-lg font-extrabold text-white group-hover:text-cyan-300 transition flex items-center gap-2">
                      {arena.name}
                      {!isUnlocked && <Lock className="w-4 h-4 text-slate-500" />}
                    </h3>
                    <p className="text-xs text-pink-400 font-semibold mb-2">{arena.subtitle}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{arena.description}</p>

                    <div className="mt-4 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                      <span>Opponents: {arena.opponentsCount} Dealers</span>
                      <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* --- DECK CUSTOMIZATION SHOP GARAGE --- */}
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
                <h2 className="text-2xl font-black text-white">CARD DECK GARAGE</h2>
                <p className="text-xs text-cyan-400">Unlock custom 3D card back designs</p>
              </div>

              <div className="bg-slate-900 border border-amber-500/40 px-4 py-2 rounded-xl text-amber-300 font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{credits} CREDITS</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-auto">
              {DECK_SKINS.map((skin) => {
                const isOwned = ownedSkinIds.includes(skin.id);
                const isSelected = selectedSkinId === skin.id;

                return (
                  <div
                    key={skin.id}
                    className={`relative p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'bg-gradient-to-b from-cyan-950/60 to-slate-900 border-cyan-400 shadow-[0_0_30px_rgba(0,242,254,0.3)] scale-[1.02]'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="w-full h-36 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-4 relative overflow-hidden">
                        <div
                          className="w-20 h-28 rounded-lg border-2 flex items-center justify-center font-black text-xl shadow-2xl"
                          style={{
                            borderColor: `#${skin.color.toString(16).padStart(6, '0')}`,
                            boxShadow: `0 0 15px #${skin.color.toString(16).padStart(6, '0')}66`,
                            background: `radial-gradient(circle, #${skin.emissive.toString(16).padStart(6, '0')}44 0%, #090514 100%)`,
                            color: `#${skin.color.toString(16).padStart(6, '0')}`,
                          }}
                        >
                          ✦
                        </div>
                      </div>

                      <h3 className="text-lg font-extrabold text-white mb-1">{skin.name}</h3>
                      <p className="text-xs text-slate-400 mb-4">{skin.description}</p>
                    </div>

                    {isOwned ? (
                      <button
                        onClick={() => setSelectedSkinId(skin.id)}
                        disabled={isSelected}
                        className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 cursor-default'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                        }`}
                      >
                        {isSelected ? 'EQUIPPED' : 'SELECT DECK'}
                      </button>
                    ) : (
                      <button
                        onClick={() => buySkin(skin)}
                        className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                          credits >= skin.price
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4" /> UNLOCK ({skin.price} CREDITS)
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

        {/* --- MATCH PLAYING HUD OVERLAY --- */}
        {gameState === 'PLAYING' && (
          <div className="absolute inset-0 z-10 p-4 md:p-6 flex flex-col justify-between pointer-events-none">
            {/* Top Bar Info & AI Opponents Badges */}
            <div className="flex justify-between items-start gap-4 pointer-events-auto">
              <div className="bg-slate-950/85 border border-cyan-500/30 backdrop-blur-md px-4 py-2.5 rounded-xl text-white">
                <div className="text-xs text-cyan-400 font-bold uppercase">{activeArena.name}</div>
                <div className="text-base font-black text-amber-400 flex items-center gap-2">
                  TABLE COLOR:{' '}
                  <span
                    className="w-4 h-4 rounded-full inline-block border border-white/40"
                    style={{ backgroundColor: activeColor.toLowerCase() === 'wild' ? '#a855f7' : activeColor.toLowerCase() }}
                  />
                  {activeColor}
                </div>
              </div>

              {/* Opponent Dealer Badges */}
              <div className="flex gap-2">
                {aiHands.map((h, i) => (
                  <div
                    key={i}
                    className={`bg-slate-950/85 border p-2.5 rounded-xl text-center backdrop-blur-md transition-all ${
                      turnIndex === i + 1 ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105' : 'border-slate-800'
                    }`}
                  >
                    <div className="text-[10px] text-pink-400 font-bold">DEALER {i + 1}</div>
                    <div className="text-sm font-black text-white flex items-center justify-center gap-1">
                      <span>🎴</span> {h.length} CARDS
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Banner Overlay */}
            {matchBanner && (
              <div className="self-center bg-cyan-950/90 border border-cyan-400 text-cyan-300 font-extrabold px-6 py-2 rounded-full shadow-2xl animate-bounce text-sm text-center">
                {matchBanner}
              </div>
            )}

            {/* Middle Center Discard & Draw Stacks Interactive Bar */}
            <div className="flex justify-center items-center gap-6 pointer-events-auto my-auto">
              {/* Draw Deck Stack Button */}
              <button
                onClick={handlePlayerDraw}
                disabled={turnIndex !== 0}
                className={`group relative p-4 rounded-2xl border flex flex-col items-center justify-center w-28 h-36 transition-all ${
                  turnIndex === 0
                    ? 'bg-gradient-to-b from-cyan-950 to-slate-900 border-cyan-400 shadow-[0_0_25px_rgba(0,242,254,0.3)] hover:scale-105 active:scale-95'
                    : 'bg-slate-950/60 border-slate-800 opacity-60'
                }`}
              >
                <span className="text-3xl mb-1">🎴</span>
                <span className="text-xs font-black text-cyan-300">DRAW DECK</span>
                <span className="text-[10px] text-slate-400 font-bold">{drawDeck.length} LEFT</span>
              </button>

              {/* Discard Stack Top Card Display */}
              {discardPile.length > 0 && (
                <div className="relative p-4 rounded-2xl border border-pink-400/80 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center w-28 h-36 shadow-[0_0_30px_rgba(255,0,127,0.3)] animate-pulse">
                  <span className="text-xs font-bold text-slate-400 uppercase">TOP CARD</span>
                  <span className="text-3xl font-black my-1 text-white">{discardPile[discardPile.length - 1].value}</span>
                  <span className="text-[10px] font-black tracking-wider text-cyan-300">{activeColor}</span>
                </div>
              )}
            </div>

            {/* Bottom Player Hand Interactive Carousel */}
            <div className="pointer-events-auto bg-slate-950/90 border border-cyan-500/30 backdrop-blur-md p-3 rounded-2xl flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-cyan-400">YOUR HAND ({playerHand.length} CARDS)</span>
                {turnIndex === 0 ? (
                  <span className="text-xs font-black px-3 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-full animate-pulse">
                    YOUR TURN!
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">DEALER IS THINKING...</span>
                )}
              </div>

              {/* Scrollable Card Buttons Hand */}
              <div className="flex gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
                {playerHand.map((card) => {
                  const playable = isValidPlay(card) && turnIndex === 0;

                  return (
                    <button
                      key={card.id}
                      disabled={!playable}
                      onClick={() => playCard(card)}
                      className={`relative min-w-[72px] h-28 rounded-xl border flex flex-col justify-between p-2 text-left transition-all shrink-0 ${
                        playable
                          ? `bg-gradient-to-b ${COLOR_TAILWIND[card.color]} hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(0,242,254,0.5)] active:scale-95`
                          : 'bg-slate-900/60 border-slate-800 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-xs font-black">{card.value}</span>
                      <span className="text-2xl text-center font-black">{card.value}</span>
                      <span className="text-[9px] font-extrabold uppercase text-right">{card.color}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- WILD COLOR PICKER MODAL --- */}
        {isColorPickerOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl font-black text-white mb-2">CHOOSE ACTIVE COLOR</h3>
            <p className="text-xs text-cyan-300 mb-6">Select the color for the next round</p>

            <div className="grid grid-cols-2 gap-4 w-64">
              <button
                onClick={() => handleSelectWildColor('CYAN')}
                className="p-4 bg-cyan-500 font-extrabold text-slate-950 rounded-xl hover:scale-105 transition shadow-lg"
              >
                CYAN
              </button>
              <button
                onClick={() => handleSelectWildColor('PINK')}
                className="p-4 bg-pink-500 font-extrabold text-white rounded-xl hover:scale-105 transition shadow-lg"
              >
                PINK
              </button>
              <button
                onClick={() => handleSelectWildColor('YELLOW')}
                className="p-4 bg-amber-400 font-extrabold text-slate-950 rounded-xl hover:scale-105 transition shadow-lg"
              >
                YELLOW
              </button>
              <button
                onClick={() => handleSelectWildColor('GREEN')}
                className="p-4 bg-emerald-400 font-extrabold text-slate-950 rounded-xl hover:scale-105 transition shadow-lg"
              >
                GREEN
              </button>
            </div>
          </div>
        )}

        {/* --- GAMEOVER OVERLAY --- */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-4xl font-black text-red-500 mb-2">MATCH LOST</h2>
            <p className="text-slate-300 mb-6">AI Dealer cleared their hand before you!</p>

            <div className="flex gap-4">
              <button
                onClick={() => startMatch(currentLevelIdx)}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 font-bold text-white rounded-xl shadow-lg hover:brightness-110 transition flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> RETRY MATCH
              </button>
              <button
                onClick={() => setGameState('SELECT')}
                className="px-6 py-3 bg-slate-800 border border-slate-700 font-bold text-slate-200 rounded-xl hover:bg-slate-700 transition"
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
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 mb-2">
              TOURNAMENT VICTORY!
            </h2>
            <p className="text-cyan-300 font-semibold mb-4">{activeArena.name} Cleared</p>

            <div className="bg-slate-900/80 border border-cyan-500/30 p-4 rounded-2xl mb-6 w-72 text-slate-200 space-y-2">
              <div className="flex justify-between pt-2 text-amber-300 font-bold">
                <span>CREDITS EARNED:</span>
                <span>+{sessionCredits}</span>
              </div>
            </div>

            <div className="flex gap-4">
              {currentLevelIdx < CASINO_ARENAS.length - 1 && (
                <button
                  onClick={() => startMatch(currentLevelIdx + 1)}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-pink-500 font-bold text-white rounded-xl shadow-lg hover:brightness-110 transition flex items-center gap-2"
                >
                  NEXT ARENA <ChevronRight className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setGameState('SELECT')}
                className="px-6 py-3 bg-slate-800 border border-slate-700 font-bold text-slate-200 rounded-xl hover:bg-slate-700 transition"
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
