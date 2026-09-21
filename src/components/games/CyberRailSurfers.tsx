import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Trophy, 
  Zap, 
  Sparkles, 
  Flame, 
  Shield, 
  HelpCircle, 
  ShoppingBag, 
  Compass, 
  Magnet, 
  Rocket, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown,
  X
} from 'lucide-react';
import { sound } from '../../utils/audio';

// Canvas Virtual Dimensions
const V_WIDTH = 960;
const V_HEIGHT = 540;
const HORIZON_Y = 160;
const LANE_WIDTH_3D = 130;
const LANES_X = [-LANE_WIDTH_3D, 0, LANE_WIDTH_3D];

// Hoverboard Shop Items
interface BoardItem {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  color: string;
  glowColor: string;
  trailColor: string;
  description: string;
}

// Character Outfits
interface RunnerOutfit {
  id: string;
  name: string;
  type: 'jake' | 'robot' | 'ninja' | 'punk' | 'phoenix';
  price: number;
  unlocked: boolean;
  jacketColor: string;
  hairColor: string;
  accentColor: string;
  glowColor: string;
  description: string;
  avatarEmoji: string;
}

const DEFAULT_BOARDS: BoardItem[] = [
  {
    id: 'cyber-pulse',
    name: 'Cyber Pulse Deck',
    price: 0,
    unlocked: true,
    color: '#0284c7',
    glowColor: '#00f0ff',
    trailColor: '#38bdf8',
    description: 'Standard issue high-voltage frictionless levitation deck.',
  },
  {
    id: 'photon-blade',
    name: 'Photon Blade 3000',
    price: 350,
    unlocked: false,
    color: '#059669',
    glowColor: '#10b981',
    trailColor: '#34d399',
    description: 'Ultra-aerodynamic carbon foil with emerald plasma thrusters.',
  },
  {
    id: 'solar-flame',
    name: 'Solar Flare Cruiser',
    price: 700,
    unlocked: false,
    color: '#ea580c',
    glowColor: '#f97316',
    trailColor: '#fbbf24',
    description: 'Ignites fiery solar tailwinds and grants extra jump height.',
  },
  {
    id: 'void-phantom',
    name: 'Void Phantom Cruiser',
    price: 1200,
    unlocked: false,
    color: '#7c3aed',
    glowColor: '#c084fc',
    trailColor: '#e879f9',
    description: 'Anti-gravity dark matter core with extended crash shield duration.',
  },
  {
    id: 'gold-hyperion',
    name: 'Midas Golden Hyperion',
    price: 2000,
    unlocked: false,
    color: '#ca8a04',
    glowColor: '#fde047',
    trailColor: '#fef08a',
    description: 'Emits dazzling gold sparkles and boosts coin magnetic reach!',
  },
];

const DEFAULT_CHARACTERS: RunnerOutfit[] = [
  {
    id: 'cyber-jake',
    name: 'Neon Jake (સુપર દાગલો)',
    type: 'jake',
    price: 0,
    unlocked: true,
    jacketColor: '#0284c7',
    hairColor: '#f59e0b',
    accentColor: '#ef4444',
    glowColor: '#38bdf8',
    avatarEmoji: '🧢',
    description: 'The legendary subway surfer with red snapback cap, DJ headphones, spray backpack, and high-top sneakers.',
  },
  {
    id: 'turbo-bot',
    name: 'Turbo-Bot 9000 (ટર્બોબોટ)',
    type: 'robot',
    price: 250,
    unlocked: false,
    jacketColor: '#0f172a',
    hairColor: '#00f0ff',
    accentColor: '#38bdf8',
    glowColor: '#00f0ff',
    avatarEmoji: '🤖',
    description: 'Autonomous mecha combat android with glowing cyclops visor, twin shoulder plasma rockets, and piston limbs.',
  },
  {
    id: 'shadow-kunoichi',
    name: 'Shadow Kunoichi (સાયબર નીન્જા)',
    type: 'ninja',
    price: 550,
    unlocked: false,
    jacketColor: '#4a044e',
    hairColor: '#ec4899',
    accentColor: '#a855f7',
    glowColor: '#d946ef',
    avatarEmoji: '🥷',
    description: 'Shinobi cyber ninja with twin katanas on back, fluttering neon scarf, and high-velocity rail reflexes.',
  },
  {
    id: 'cyber-tricky',
    name: 'Cyber Tricky (પંક દાગલી)',
    type: 'punk',
    price: 900,
    unlocked: false,
    jacketColor: '#be185d',
    hairColor: '#06b6d4',
    accentColor: '#fbbf24',
    glowColor: '#f43f5e',
    avatarEmoji: '🎧',
    description: 'Graffiti artist with neon beanie, oversized boombox backpack, spray can holster, and roller sneakers.',
  },
  {
    id: 'solar-phoenix',
    name: 'Solar Phoenix (ગોલ્ડન ચેમ્પિયન)',
    type: 'phoenix',
    price: 1500,
    unlocked: false,
    jacketColor: '#b45309',
    hairColor: '#fde047',
    accentColor: '#ea580c',
    glowColor: '#fbbf24',
    avatarEmoji: '👑',
    description: 'Gilded 24K gold power armor emitting royal solar flares and golden particle speed trails.',
  },
];

// Obstacle Types
type ObstacleType = 'barrier_low' | 'barrier_high' | 'train' | 'ramp';
type PowerupType = 'magnet' | 'multiplier' | 'boots' | 'jetpack';

interface WorldObstacle {
  id: number;
  z: number; // Distance ahead in 3D world (0 to 1800)
  lane: number; // -1, 0, 1
  type: ObstacleType;
  height: number;
  length: number;
  speedZ: number; // For incoming trains
  passed: boolean;
}

interface WorldCoin {
  id: number;
  z: number;
  lane: number;
  y: number; // height offset
  collected: boolean;
}

interface WorldPowerup {
  id: number;
  z: number;
  lane: number;
  y: number;
  type: PowerupType;
  collected: boolean;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
  alpha: number;
}

export const CyberRailSurfers: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState<number>(0);
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_surfers_coins') || '120', 10);
  });
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_surfers_highscore') || '0', 10);
  });
  const [boards, setBoards] = useState<BoardItem[]>(() => {
    const saved = localStorage.getItem('cyber_surfers_boards');
    if (saved) {
      try {
        const parsed: BoardItem[] = JSON.parse(saved);
        // Merge missing boards
        return DEFAULT_BOARDS.map((def) => {
          const found = parsed.find((p) => p.id === def.id);
          return found ? { ...def, unlocked: found.unlocked } : def;
        });
      } catch {
        return DEFAULT_BOARDS;
      }
    }
    return DEFAULT_BOARDS;
  });
  const [characters, setCharacters] = useState<RunnerOutfit[]>(() => {
    const saved = localStorage.getItem('cyber_surfers_chars');
    if (saved) {
      try {
        const parsed: RunnerOutfit[] = JSON.parse(saved);
        // Merge missing characters & update attributes
        return DEFAULT_CHARACTERS.map((def) => {
          const found = parsed.find((p) => p.id === def.id);
          return found ? { ...def, unlocked: found.unlocked } : def;
        });
      } catch {
        return DEFAULT_CHARACTERS;
      }
    }
    return DEFAULT_CHARACTERS;
  });

  const [selectedBoardId, setSelectedBoardId] = useState<string>('cyber-pulse');
  const [selectedCharId, setSelectedCharId] = useState<string>('cyber-jake');

  const [hasHoverboard, setHasHoverboard] = useState<boolean>(false);
  const [hoverboardTimer, setHoverboardTimer] = useState<number>(0);
  const [activePowerup, setActivePowerup] = useState<'none' | 'magnet' | 'multiplier' | 'boots' | 'jetpack'>('none');
  const [powerupTimer, setPowerupTimer] = useState<number>(0);

  const [showShop, setShowShop] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());

  // Engine Physics Reference
  const engineRef = useRef({
    player: {
      lane: 0, // -1: Left, 0: Mid, 1: Right
      worldX: 0,
      targetX: 0,
      worldY: 0, // 0 is ground level
      vy: 0,
      isGrounded: true,
      isSliding: false,
      slideTimer: 0,
      hoverboardActive: false,
      hoverboardTime: 0,
      magnetTime: 0,
      multiplierTime: 0,
      bootsTime: 0,
      jetpackTime: 0,
      runAnim: 0,
      onTrainTop: false,
    },
    gameSpeed: 16.5,
    distanceMeters: 0,
    sessionScore: 0,
    sessionCoins: 0,
    multiplier: 1,
    obstacles: [] as WorldObstacle[],
    coins: [] as WorldCoin[],
    powerups: [] as WorldPowerup[],
    particles: [] as Particle3D[],
    floatingTexts: [] as FloatingText[],
    nextObjId: 1,
    spawnDistance: 0,
    screenShake: 0,
    trackOffset: 0,
  });

  // Touch Gesture Tracker
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Callout Text Trigger
  const triggerCallout = (text: string, color: string = '#00f0ff') => {
    const eng = engineRef.current;
    sound.playDriftBonus();
    eng.floatingTexts.push({
      id: eng.nextObjId++,
      text,
      color,
      x: V_WIDTH / 2 + (Math.random() - 0.5) * 60,
      y: V_HEIGHT / 2 - 40,
      alpha: 1.0,
    });
  };

  // 3D Perspective Projection Math
  // Projects a 3D point (x, y, z) into 2D canvas screen coordinates
  const project3D = (x: number, y: number, z: number) => {
    const fov = 380;
    const camY = -120;
    const camZ = -220;

    const relZ = z - camZ;
    if (relZ <= 10) return { x: 0, y: 0, scale: 0, visible: false };

    const scale = fov / relZ;
    const screenX = V_WIDTH / 2 + x * scale;
    const screenY = HORIZON_Y + (y - camY) * scale;

    return {
      x: screenX,
      y: screenY,
      scale,
      visible: z >= 0 && z <= 1800,
    };
  };

  // Emit 3D Particles
  const emitParticles = (x: number, y: number, z: number, count: number, color: string, speedMult: number = 1) => {
    const eng = engineRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 4 + 2) * speedMult;
      eng.particles.push({
        x,
        y: y + (Math.random() - 0.5) * 10,
        z,
        vx: Math.cos(angle) * spd,
        vy: -Math.random() * 5 - 1,
        vz: Math.sin(angle) * spd + eng.gameSpeed * 0.3,
        color,
        alpha: 1,
        size: Math.random() * 4 + 2,
        life: 0,
        maxLife: 20 + Math.random() * 15,
      });
    }
  };

  // Spawn Obstacles & Coins Ahead in 3D Space
  const spawnTrackSegment = (spawnZ: number) => {
    const eng = engineRef.current;
    const rand = Math.random();

    // 1. Train / Obstacle Patterns
    if (rand < 0.35) {
      // Maglev Incoming or Parked Train on a random lane
      const trainLane = Math.floor(Math.random() * 3) - 1;
      const isMoving = Math.random() < 0.6;
      eng.obstacles.push({
        id: eng.nextObjId++,
        z: spawnZ,
        lane: trainLane,
        type: 'train',
        height: 70,
        length: 260,
        speedZ: isMoving ? -5.5 : 0,
        passed: false,
      });

      // Place Ramp in front of train for vaulting chance
      if (Math.random() < 0.7) {
        eng.obstacles.push({
          id: eng.nextObjId++,
          z: spawnZ - 140,
          lane: trainLane,
          type: 'ramp',
          height: 35,
          length: 60,
          speedZ: 0,
          passed: false,
        });
      }

      // Train roof coins!
      for (let i = 0; i < 5; i++) {
        eng.coins.push({
          id: eng.nextObjId++,
          z: spawnZ + i * 45,
          lane: trainLane,
          y: -75,
          collected: false,
        });
      }
    } else if (rand < 0.65) {
      // Low or High Barrier on 1 or 2 lanes
      const blockedLane1 = Math.floor(Math.random() * 3) - 1;
      const isLow = Math.random() < 0.6;
      eng.obstacles.push({
        id: eng.nextObjId++,
        z: spawnZ,
        lane: blockedLane1,
        type: isLow ? 'barrier_low' : 'barrier_high',
        height: isLow ? 32 : 55,
        length: 20,
        speedZ: 0,
        passed: false,
      });

      // Free lane coin arc
      const freeLane = blockedLane1 === 0 ? 1 : 0;
      for (let i = 0; i < 4; i++) {
        eng.coins.push({
          id: eng.nextObjId++,
          z: spawnZ + i * 36 - 60,
          lane: freeLane,
          y: -Math.sin((i / 4) * Math.PI) * 45,
          collected: false,
        });
      }
    } else {
      // Open Coin Trail + Powerup Box
      const pLane = Math.floor(Math.random() * 3) - 1;
      for (let i = 0; i < 6; i++) {
        eng.coins.push({
          id: eng.nextObjId++,
          z: spawnZ + i * 35,
          lane: pLane,
          y: 0,
          collected: false,
        });
      }

      // Occasional Powerup
      if (Math.random() < 0.4) {
        const types: PowerupType[] = ['magnet', 'multiplier', 'boots', 'jetpack'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        const powLane = Math.floor(Math.random() * 3) - 1;
        eng.powerups.push({
          id: eng.nextObjId++,
          z: spawnZ + 240,
          lane: powLane,
          y: -15,
          type: chosen,
          collected: false,
        });
      }
    }
  };

  // Player Actions: Move Lane, Jump, Slide, Hoverboard
  const moveLeft = useCallback(() => {
    const p = engineRef.current.player;
    if (p.lane > -1) {
      p.lane -= 1;
      p.targetX = LANES_X[p.lane + 1];
      sound.playLaneSwitch();
    }
  }, []);

  const moveRight = useCallback(() => {
    const p = engineRef.current.player;
    if (p.lane < 1) {
      p.lane += 1;
      p.targetX = LANES_X[p.lane + 1];
      sound.playLaneSwitch();
    }
  }, []);

  const jump = useCallback(() => {
    const p = engineRef.current.player;
    if (p.isGrounded || p.onTrainTop) {
      const jumpPower = p.bootsTime > 0 ? -17 : -12.5;
      p.vy = jumpPower;
      p.isGrounded = false;
      p.onTrainTop = false;
      p.isSliding = false;
      sound.playJump();
    }
  }, []);

  const slide = useCallback(() => {
    const p = engineRef.current.player;
    if (!p.isGrounded && !p.onTrainTop) {
      // Fast drop downward
      p.vy = 16;
    }
    p.isSliding = true;
    p.slideTimer = 40; // ~0.7 seconds
    sound.playBladeHit();
  }, []);

  const activateHoverboard = useCallback(() => {
    const p = engineRef.current.player;
    if (!p.hoverboardActive) {
      p.hoverboardActive = true;
      p.hoverboardTime = 600; // 10 seconds
      setHasHoverboard(true);
      setHoverboardTimer(600);
      sound.playHoverboard();
      triggerCallout('🛹 HOVERBOARD ENGAGED!', '#00f0ff');
    }
  }, []);

  // Initialize Game
  const initGame = useCallback(() => {
    const eng = engineRef.current;
    eng.player = {
      lane: 0,
      worldX: 0,
      targetX: 0,
      worldY: 0,
      vy: 0,
      isGrounded: true,
      isSliding: false,
      slideTimer: 0,
      hoverboardActive: false,
      hoverboardTime: 0,
      magnetTime: 0,
      multiplierTime: 0,
      bootsTime: 0,
      jetpackTime: 0,
      runAnim: 0,
      onTrainTop: false,
    };
    eng.gameSpeed = 16.5;
    eng.distanceMeters = 0;
    eng.sessionScore = 0;
    eng.sessionCoins = 0;
    eng.multiplier = 1;
    eng.obstacles = [];
    eng.coins = [];
    eng.powerups = [];
    eng.particles = [];
    eng.floatingTexts = [];
    eng.screenShake = 0;
    eng.trackOffset = 0;

    setScore(0);
    setHasHoverboard(false);
    setHoverboardTimer(0);
    setActivePowerup('none');
    setPowerupTimer(0);

    // Initial safe track runway
    for (let z = 500; z <= 1700; z += 350) {
      spawnTrackSegment(z);
    }
  }, []);

  const handleStart = () => {
    initGame();
    setGameState('playing');
    sound.playPowerup();
  };

  const handleRestart = () => {
    initGame();
    setGameState('playing');
    sound.playPowerup();
  };

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') {
        if (e.code === 'KeyR' && gameState === 'gameover') handleRestart();
        if (e.code === 'Space' && gameState === 'start') handleStart();
        return;
      }

      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        moveLeft();
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        moveRight();
      } else if (['ArrowUp', 'KeyW'].includes(e.code)) {
        jump();
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        slide();
      } else if (e.code === 'Space') {
        // Spacebar activates hoverboard or jump
        if (engineRef.current.player.hoverboardActive) {
          jump();
        } else {
          activateHoverboard();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, moveLeft, moveRight, jump, slide, activateHoverboard]);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    // Detect double tap for hoverboard
    if (Math.hypot(dx, dy) < 20 && dt < 250) {
      if (gameState === 'playing') {
        activateHoverboard();
      }
      touchStartRef.current = null;
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal Swipe
      if (dx > 30) moveRight();
      else if (dx < -30) moveLeft();
    } else {
      // Vertical Swipe
      if (dy < -30) jump();
      else if (dy > 30) slide();
    }
    touchStartRef.current = null;
  };

  // Buy & Equip Items
  const buyBoard = (board: BoardItem) => {
    if (coins >= board.price && !board.unlocked) {
      const newCoins = coins - board.price;
      const updated = boards.map((b) => (b.id === board.id ? { ...b, unlocked: true } : b));
      setCoins(newCoins);
      setBoards(updated);
      setSelectedBoardId(board.id);
      localStorage.setItem('cyber_surfers_coins', newCoins.toString());
      localStorage.setItem('cyber_surfers_boards', JSON.stringify(updated));
      sound.playPowerup();
    }
  };

  const equipBoard = (board: BoardItem) => {
    if (board.unlocked) {
      setSelectedBoardId(board.id);
      sound.playClick();
    }
  };

  const buyCharacter = (c: RunnerOutfit) => {
    if (coins >= c.price && !c.unlocked) {
      const newCoins = coins - c.price;
      const updated = characters.map((char) => (char.id === c.id ? { ...char, unlocked: true } : char));
      setCoins(newCoins);
      setCharacters(updated);
      setSelectedCharId(c.id);
      localStorage.setItem('cyber_surfers_coins', newCoins.toString());
      localStorage.setItem('cyber_surfers_chars', JSON.stringify(updated));
      sound.playPowerup();
    }
  };

  const equipCharacter = (c: RunnerOutfit) => {
    if (c.unlocked) {
      setSelectedCharId(c.id);
      sound.playClick();
    }
  };

  // Main 60 FPS Engine Game Loop
  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const eng = engineRef.current;
      const p = eng.player;
      const activeBoard = boards.find((b) => b.id === selectedBoardId) || DEFAULT_BOARDS[0];
      const activeChar = characters.find((c) => c.id === selectedCharId) || DEFAULT_CHARACTERS[0];

      // ============================================
      // 1. UPDATE PHYSICS & ENTITIES
      // ============================================
      if (gameState === 'playing') {
        // Distance progress & speed ramping
        eng.distanceMeters += eng.gameSpeed * 0.035;
        eng.sessionScore += Math.floor(eng.multiplier * (p.multiplierTime > 0 ? 2 : 1) * (eng.gameSpeed * 0.08));
        setScore(eng.sessionScore);

        if (eng.sessionScore > highScore) {
          setHighScore(eng.sessionScore);
          localStorage.setItem('cyber_surfers_highscore', eng.sessionScore.toString());
        }

        // Speed ramp up
        eng.gameSpeed = Math.min(26, 16.5 + eng.distanceMeters * 0.004);
        eng.trackOffset = (eng.trackOffset + eng.gameSpeed) % 80;

        // Smooth X lane transition
        p.worldX += (p.targetX - p.worldX) * 0.22;

        // Slide timer
        if (p.isSliding) {
          p.slideTimer--;
          if (p.slideTimer <= 0) p.isSliding = false;
        }

        // Hoverboard timer
        if (p.hoverboardActive) {
          p.hoverboardTime--;
          setHoverboardTimer(p.hoverboardTime);
          if (p.hoverboardTime <= 0) {
            p.hoverboardActive = false;
            setHasHoverboard(false);
          }
          // Hoverboard trail sparks
          emitParticles(p.worldX, p.worldY, 0, 2, activeBoard.trailColor, 1.2);
        }

        // Jetpack mode
        if (p.jetpackTime > 0) {
          p.jetpackTime--;
          p.worldY = -140; // High in sky
          setPowerupTimer(p.jetpackTime);
          if (p.jetpackTime <= 0) setActivePowerup('none');
          // Jetpack thruster flames
          emitParticles(p.worldX - 10, p.worldY + 30, 0, 3, '#f59e0b', 2.0);
        } else {
          // Normal Gravity / Jump
          if (!p.isGrounded) {
            p.vy += 0.65; // gravity
            p.worldY += p.vy;

            // Ground floor or train rooftop snap
            const groundLimit = p.onTrainTop ? -70 : 0;
            if (p.worldY >= groundLimit) {
              p.worldY = groundLimit;
              p.vy = 0;
              p.isGrounded = true;
            }
          } else if (!p.onTrainTop && p.worldY !== 0) {
            p.isGrounded = false;
          }
        }

        // Powerup Timers
        if (p.magnetTime > 0) {
          p.magnetTime--;
          setPowerupTimer(p.magnetTime);
          if (p.magnetTime <= 0 && activePowerup === 'magnet') setActivePowerup('none');
        }
        if (p.multiplierTime > 0) {
          p.multiplierTime--;
          setPowerupTimer(p.multiplierTime);
          if (p.multiplierTime <= 0 && activePowerup === 'multiplier') setActivePowerup('none');
        }
        if (p.bootsTime > 0) {
          p.bootsTime--;
          setPowerupTimer(p.bootsTime);
          if (p.bootsTime <= 0 && activePowerup === 'boots') setActivePowerup('none');
        }

        // Continuous Spawning Ahead
        eng.spawnDistance += eng.gameSpeed;
        if (eng.spawnDistance > 320) {
          eng.spawnDistance = 0;
          spawnTrackSegment(1700);
        }

        // Update Obstacles & Train Collisions
        let standingOnTrain = false;

        for (let i = eng.obstacles.length - 1; i >= 0; i--) {
          const obs = eng.obstacles[i];
          obs.z -= eng.gameSpeed + obs.speedZ;

          // Train horn warning when train is coming
          if (obs.type === 'train' && obs.z > 300 && obs.z < 400 && obs.speedZ !== 0) {
            sound.playTrainHorn();
          }

          // Player Proximity Collision Check in 3D
          const inSameLane = Math.abs(p.worldX - LANES_X[obs.lane + 1]) < 45;
          const inZRange = obs.z > -40 && obs.z < obs.length + 30;

          if (inSameLane && inZRange && p.jetpackTime <= 0) {
            if (obs.type === 'ramp') {
              // Smooth vault ramp upward onto train
              if (p.worldY > -45) {
                p.worldY = -70;
                p.vy = -4;
                p.isGrounded = true;
                p.onTrainTop = true;
                standingOnTrain = true;
                sound.playJump();
              }
            } else if (obs.type === 'train') {
              // Check if player is on top of train or crashing into front
              if (p.worldY <= -65) {
                // Safely running on train roof!
                p.onTrainTop = true;
                standingOnTrain = true;
              } else {
                // Frontal Crash into Train!
                if (p.hoverboardActive) {
                  // Hoverboard absorbs crash!
                  p.hoverboardActive = false;
                  setHasHoverboard(false);
                  eng.screenShake = 18;
                  sound.playExplosion();
                  emitParticles(p.worldX, p.worldY, 0, 30, '#00f0ff', 3.0);
                  triggerCallout('🛡️ HOVERBOARD SAVED YOU!', '#38bdf8');
                  obs.z = -200; // Despawn obstacle to continue
                } else {
                  // Game Over!
                  sound.playExplosion();
                  sound.playGameOver();
                  eng.screenShake = 25;
                  emitParticles(p.worldX, p.worldY, 0, 45, '#ef4444', 3.5);
                  setGameState('gameover');
                }
              }
            } else if (obs.type === 'barrier_low') {
              // Must jump over low barrier
              if (p.worldY > -28) {
                if (p.hoverboardActive) {
                  p.hoverboardActive = false;
                  setHasHoverboard(false);
                  eng.screenShake = 16;
                  sound.playExplosion();
                  emitParticles(p.worldX, p.worldY, 0, 25, '#00f0ff', 2.5);
                  triggerCallout('🛡️ HOVERBOARD CRASHED!', '#38bdf8');
                  obs.z = -100;
                } else {
                  sound.playExplosion();
                  sound.playGameOver();
                  eng.screenShake = 22;
                  emitParticles(p.worldX, p.worldY, 0, 40, '#ef4444', 3.5);
                  setGameState('gameover');
                }
              }
            } else if (obs.type === 'barrier_high') {
              // Must slide under high barrier
              if (!p.isSliding) {
                if (p.hoverboardActive) {
                  p.hoverboardActive = false;
                  setHasHoverboard(false);
                  eng.screenShake = 16;
                  sound.playExplosion();
                  emitParticles(p.worldX, p.worldY, 0, 25, '#00f0ff', 2.5);
                  triggerCallout('🛡️ HOVERBOARD CRASHED!', '#38bdf8');
                  obs.z = -100;
                } else {
                  sound.playExplosion();
                  sound.playGameOver();
                  eng.screenShake = 22;
                  emitParticles(p.worldX, p.worldY, 0, 40, '#ef4444', 3.5);
                  setGameState('gameover');
                }
              }
            }
          }

          // Remove past obstacles
          if (obs.z < -200) {
            eng.obstacles.splice(i, 1);
          }
        }

        if (!standingOnTrain && p.onTrainTop) {
          p.onTrainTop = false;
          p.isGrounded = false;
        }

        // Update Coins & Magnet Attractor
        const magnetActive = p.magnetTime > 0 || activeBoard.id === 'gold-hyperion';
        for (let i = eng.coins.length - 1; i >= 0; i--) {
          const c = eng.coins[i];
          c.z -= eng.gameSpeed;

          // Magnet Attraction
          if (magnetActive && !c.collected && c.z < 450 && c.z > -20) {
            const coinX = LANES_X[c.lane + 1];
            const dx = p.worldX - coinX;
            const dy = p.worldY - c.y;
            c.lane += (dx > 0 ? 0.08 : -0.08);
            c.y += dy * 0.1;
          }

          // Collection Check
          const coinX = LANES_X[Math.round(c.lane) + 1];
          const dist2D = Math.hypot(p.worldX - coinX, p.worldY - c.y);
          if (!c.collected && c.z > -30 && c.z < 40 && dist2D < 50) {
            c.collected = true;
            eng.sessionCoins++;
            sound.playCollect();
            emitParticles(p.worldX, p.worldY, 0, 6, '#fbbf24', 1.5);
            setCoins((prev) => {
              const updated = prev + 1;
              localStorage.setItem('cyber_surfers_coins', updated.toString());
              return updated;
            });
          }

          if (c.z < -60 || c.collected) {
            eng.coins.splice(i, 1);
          }
        }

        // Update Powerups
        for (let i = eng.powerups.length - 1; i >= 0; i--) {
          const pw = eng.powerups[i];
          pw.z -= eng.gameSpeed;

          const pwX = LANES_X[pw.lane + 1];
          const dist = Math.hypot(p.worldX - pwX, p.worldY - pw.y);

          if (!pw.collected && pw.z > -30 && pw.z < 40 && dist < 55) {
            pw.collected = true;
            sound.playPowerup();
            emitParticles(p.worldX, p.worldY, 0, 25, '#38bdf8', 3.0);

            if (pw.type === 'magnet') {
              p.magnetTime = 480; // ~8 seconds
              setActivePowerup('magnet');
              setPowerupTimer(480);
              triggerCallout('🧲 SUPER COIN MAGNET!', '#f59e0b');
            } else if (pw.type === 'multiplier') {
              p.multiplierTime = 480;
              setActivePowerup('multiplier');
              setPowerupTimer(480);
              triggerCallout('⚡ 2X SCORE MULTIPLIER!', '#38bdf8');
            } else if (pw.type === 'boots') {
              p.bootsTime = 480;
              setActivePowerup('boots');
              setPowerupTimer(480);
              triggerCallout('👟 SUPER BOUNCE SNEAKERS!', '#10b981');
            } else if (pw.type === 'jetpack') {
              p.jetpackTime = 360; // 6 seconds
              setActivePowerup('jetpack');
              setPowerupTimer(360);
              sound.playNitroBoost();
              triggerCallout('🚀 QUANTUM SKY JETPACK!', '#c084fc');
            }

            eng.powerups.splice(i, 1);
          } else if (pw.z < -60) {
            eng.powerups.splice(i, 1);
          }
        }

        p.runAnim += 0.3;
        if (eng.screenShake > 0) eng.screenShake *= 0.88;
      }

      // ============================================
      // 2. RENDER 3D RETRO-FUTURISTIC PERSPECTIVE
      // ============================================
      ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

      const shakeX = (Math.random() - 0.5) * eng.screenShake;
      const shakeY = (Math.random() - 0.5) * eng.screenShake;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Deep Sci-Fi Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
      skyGrad.addColorStop(0, '#030712');
      skyGrad.addColorStop(0.6, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, V_WIDTH, HORIZON_Y);

      // Distant Cyber City Skyline & Glowing Towers
      ctx.fillStyle = '#090d16';
      const towers = [
        { x: 80, w: 45, h: 90 },
        { x: 140, w: 70, h: 120 },
        { x: 230, w: 55, h: 80 },
        { x: 310, w: 60, h: 110 },
        { x: 580, w: 65, h: 115 },
        { x: 670, w: 50, h: 85 },
        { x: 740, w: 80, h: 130 },
        { x: 840, w: 55, h: 95 },
      ];
      towers.forEach((tw) => {
        ctx.fillRect(tw.x, HORIZON_Y - tw.h, tw.w, tw.h);
        // Neon beacon atop towers
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(tw.x + tw.w / 2 - 1.5, HORIZON_Y - tw.h - 8, 3, 8);
        ctx.fillStyle = '#090d16';
      });

      // Horizon Glowing Sun / Portal
      const sunGrad = ctx.createRadialGradient(V_WIDTH / 2, HORIZON_Y, 10, V_WIDTH / 2, HORIZON_Y, 120);
      sunGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      sunGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.2)');
      sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, HORIZON_Y - 100, V_WIDTH, 120);

      // Track Ground Floor
      const groundGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, V_HEIGHT);
      groundGrad.addColorStop(0, '#0a0f1d');
      groundGrad.addColorStop(1, '#020617');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, HORIZON_Y, V_WIDTH, V_HEIGHT - HORIZON_Y);

      // Draw 3D Railway Track Perspective Lines
      const leftRailFar = project3D(-LANE_WIDTH_3D * 1.6, 0, 1600);
      const leftRailNear = project3D(-LANE_WIDTH_3D * 1.6, 0, 0);
      const rightRailFar = project3D(LANE_WIDTH_3D * 1.6, 0, 1600);
      const rightRailNear = project3D(LANE_WIDTH_3D * 1.6, 0, 0);

      // Track Bed Polygon
      ctx.fillStyle = '#090e1c';
      ctx.beginPath();
      ctx.moveTo(leftRailFar.x, leftRailFar.y);
      ctx.lineTo(rightRailFar.x, rightRailFar.y);
      ctx.lineTo(rightRailNear.x, rightRailNear.y);
      ctx.lineTo(leftRailNear.x, leftRailNear.y);
      ctx.closePath();
      ctx.fill();

      // Glowing Lane Dividers
      LANES_X.forEach((laneX) => {
        const farP = project3D(laneX, 0, 1600);
        const nearP = project3D(laneX, 0, 0);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(farP.x, farP.y);
        ctx.lineTo(nearP.x, nearP.y);
        ctx.stroke();
      });

      // Animated Cross Railroad Sleepers / Ties
      for (let z = 1600 - eng.trackOffset; z > 0; z -= 70) {
        const p1 = project3D(-LANE_WIDTH_3D * 1.5, 0, z);
        const p2 = project3D(LANE_WIDTH_3D * 1.5, 0, z);

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
        ctx.lineWidth = Math.max(1, p1.scale * 3.5);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Outer Neon Guardrails
      [-LANE_WIDTH_3D * 1.55, LANE_WIDTH_3D * 1.55].forEach((rx) => {
        const farP = project3D(rx, -20, 1600);
        const nearP = project3D(rx, -20, 0);

        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(farP.x, farP.y);
        ctx.lineTo(nearP.x, nearP.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Depth-Sorted Render Queue for 3D Entities
      // Sort obstacles, coins, and powerups by Z descending (furthest first)
      const renderQueue: Array<{
        type: 'obstacle' | 'coin' | 'powerup' | 'player';
        z: number;
        data: any;
      }> = [];

      eng.obstacles.forEach((obs) => {
        renderQueue.push({ type: 'obstacle', z: obs.z, data: obs });
      });

      eng.coins.forEach((coin) => {
        renderQueue.push({ type: 'coin', z: coin.z, data: coin });
      });

      eng.powerups.forEach((pw) => {
        renderQueue.push({ type: 'powerup', z: pw.z, data: pw });
      });

      // Insert Player at Z = 0
      renderQueue.push({ type: 'player', z: 0, data: null });

      // Sort from back to front (highest Z to lowest Z)
      renderQueue.sort((a, b) => b.z - a.z);

      // Render Each 3D Item
      renderQueue.forEach((item) => {
        if (item.type === 'obstacle') {
          const obs = item.data as WorldObstacle;
          const laneX = LANES_X[obs.lane + 1];

          if (obs.type === 'train') {
            // 3D MAGLEV CYBER TRAIN
            const front = project3D(laneX, 0, obs.z);
            const back = project3D(laneX, 0, obs.z + obs.length);

            if (front.visible) {
              const trainW = 90 * front.scale;
              const trainH = obs.height * front.scale;
              const roofTopY = front.y - trainH;

              ctx.save();
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 12;

              // Front Train Face
              ctx.fillStyle = '#1e293b';
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.roundRect(front.x - trainW / 2, roofTopY, trainW, trainH, 6 * front.scale);
              ctx.fill();
              ctx.stroke();

              // Train Front Red Glowing Windshield
              ctx.fillStyle = '#dc2626';
              ctx.fillRect(front.x - trainW * 0.35, roofTopY + trainH * 0.2, trainW * 0.7, trainH * 0.35);

              // Train Top Roof Platform (walkable)
              ctx.fillStyle = '#334155';
              ctx.fillRect(front.x - trainW * 0.45, roofTopY, trainW * 0.9, 6 * front.scale);
              ctx.restore();
            }
          } else if (obs.type === 'barrier_low') {
            // LOW JUMPABLE BARRICADE
            const p3 = project3D(laneX, 0, obs.z);
            if (p3.visible) {
              const barW = 85 * p3.scale;
              const barH = obs.height * p3.scale;

              ctx.save();
              ctx.shadowColor = '#f59e0b';
              ctx.shadowBlur = 10;
              ctx.fillStyle = '#f59e0b';
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 1.5;

              // Barrier Plank
              ctx.beginPath();
              ctx.roundRect(p3.x - barW / 2, p3.y - barH, barW, barH, 4 * p3.scale);
              ctx.fill();
              ctx.stroke();

              // Hazard stripes
              ctx.fillStyle = '#000000';
              ctx.fillRect(p3.x - barW * 0.3, p3.y - barH + 4, barW * 0.15, barH - 8);
              ctx.fillRect(p3.x + barW * 0.15, p3.y - barH + 4, barW * 0.15, barH - 8);
              ctx.restore();
            }
          } else if (obs.type === 'barrier_high') {
            // HIGH OVERHEAD SIGN / SLIDE BARRIER
            const p3 = project3D(laneX, 0, obs.z);
            if (p3.visible) {
              const barW = 95 * p3.scale;
              const signH = 28 * p3.scale;
              const groundY = p3.y;
              const signY = groundY - obs.height * p3.scale;

              ctx.save();
              // Support Poles on sides
              ctx.strokeStyle = '#94a3b8';
              ctx.lineWidth = 2 * p3.scale;
              ctx.beginPath();
              ctx.moveTo(p3.x - barW / 2, groundY);
              ctx.lineTo(p3.x - barW / 2, signY);
              ctx.moveTo(p3.x + barW / 2, groundY);
              ctx.lineTo(p3.x + barW / 2, signY);
              ctx.stroke();

              // High Laser Gate
              ctx.shadowColor = '#c084fc';
              ctx.shadowBlur = 14;
              ctx.fillStyle = '#7c3aed';
              ctx.fillRect(p3.x - barW / 2, signY, barW, signH);

              // Slide Warning Text
              ctx.fillStyle = '#ffffff';
              ctx.font = `bold ${Math.max(8, 11 * p3.scale)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.fillText('SLIDE ⬇', p3.x, signY + signH * 0.7);
              ctx.restore();
            }
          } else if (obs.type === 'ramp') {
            // 3D JUMP RAMP
            const p3 = project3D(laneX, 0, obs.z);
            if (p3.visible) {
              const rampW = 80 * p3.scale;
              const rampH = obs.height * p3.scale;

              ctx.save();
              ctx.fillStyle = '#0284c7';
              ctx.strokeStyle = '#00f0ff';
              ctx.lineWidth = 2 * p3.scale;
              ctx.beginPath();
              ctx.moveTo(p3.x - rampW / 2, p3.y);
              ctx.lineTo(p3.x, p3.y - rampH);
              ctx.lineTo(p3.x + rampW / 2, p3.y);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            }
          }
        } else if (item.type === 'coin') {
          const c = item.data as WorldCoin;
          const coinX = LANES_X[Math.round(c.lane) + 1];
          const p3 = project3D(coinX, c.y, c.z);

          if (p3.visible && !c.collected) {
            ctx.save();
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10;

            const radius = 9 * p3.scale;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(p3.x, p3.y - 12 * p3.scale, radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner Gleam
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(p3.x, p3.y - 12 * p3.scale, radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        } else if (item.type === 'powerup') {
          const pw = item.data as WorldPowerup;
          const pwX = LANES_X[pw.lane + 1];
          const p3 = project3D(pwX, pw.y, pw.z);

          if (p3.visible && !pw.collected) {
            ctx.save();
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 14;

            const boxSize = 24 * p3.scale;
            ctx.fillStyle = '#0284c7';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 * p3.scale;
            ctx.beginPath();
            ctx.roundRect(p3.x - boxSize / 2, p3.y - boxSize, boxSize, boxSize, 4 * p3.scale);
            ctx.fill();
            ctx.stroke();

            // Icon symbol
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(8, 12 * p3.scale)}px sans-serif`;
            ctx.textAlign = 'center';
            const sym = pw.type === 'magnet' ? '🧲' : pw.type === 'multiplier' ? '⚡' : pw.type === 'boots' ? '👟' : '🚀';
            ctx.fillText(sym, p3.x, p3.y - boxSize * 0.3);
            ctx.restore();
          }
        } else if (item.type === 'player') {
          // ============================================
          // ADVANCED 3D CHARACTER AVATAR (દાગલો & ટર્બોબોટ)
          // ============================================
          const p3 = project3D(p.worldX, p.worldY, 0);

          // 1. GROUND CONTACT SHADOW
          const groundY = p.onTrainTop ? project3D(p.worldX, -70, 0).y : project3D(p.worldX, 0, 0).y;
          const jumpDist = Math.abs(p.worldY - (p.onTrainTop ? -70 : 0));
          const shadowScale = Math.max(0.35, 1 - jumpDist / 140);

          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.beginPath();
          ctx.ellipse(p3.x, groundY, 26 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.translate(p3.x, p3.y);

          // 2. DYNAMIC LANE TURN BANKING (TILT)
          const bankAngle = Math.max(-0.22, Math.min(0.22, (p.targetX - p.worldX) * 0.007));
          ctx.rotate(bankAngle);

          const isRobot = activeChar.type === 'robot';
          const isNinja = activeChar.type === 'ninja';
          const isPunk = activeChar.type === 'punk';
          const isPhoenix = activeChar.type === 'phoenix';

          // 3. HOVERBOARD UNDER FEET
          if (p.hoverboardActive) {
            ctx.save();
            ctx.shadowColor = activeBoard.glowColor;
            ctx.shadowBlur = 18;

            // Hoverboard Deck Surface
            const boardTilt = bankAngle * 1.5;
            ctx.rotate(boardTilt);

            // Deck base
            ctx.fillStyle = activeBoard.color;
            ctx.strokeStyle = activeBoard.glowColor;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(-42, -4, 84, 12, 6);
            ctx.fill();
            ctx.stroke();

            // Grip tape neon center stripe
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-32, -3, 64, 2);

            // Dual Anti-Grav Repulsor Discs Underneath
            [-22, 22].forEach((rx) => {
              ctx.fillStyle = activeBoard.glowColor;
              ctx.beginPath();
              ctx.ellipse(rx, 9, 8, 4, 0, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(rx, 9, 2.5, 0, Math.PI * 2);
              ctx.fill();
            });

            // Thruster Tail Fire
            ctx.fillStyle = activeBoard.trailColor;
            ctx.beginPath();
            ctx.moveTo(-42, -2);
            ctx.lineTo(-58, 2);
            ctx.lineTo(-42, 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // 4. PLAYER POSES & ANIMATION
          if (p.jetpackTime > 0) {
            // ============================================
            // POSE A: SKY JETPACK FLYING (SUPERHERO FLIGHT)
            // ============================================
            ctx.save();
            ctx.rotate(-0.15); // Horizontal flight lean

            // Dual Quantum Jet Thrusters on Back
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            ctx.fillRect(-22, -38, 10, 26);
            ctx.strokeRect(-22, -38, 10, 26);
            ctx.fillRect(12, -38, 10, 26);
            ctx.strokeRect(12, -38, 10, 26);

            // Exhaust Flames Blasting Downward
            const flamePulse = (Math.sin(Date.now() * 0.03) + 1) * 6;
            const jetGrad = ctx.createLinearGradient(0, -12, 0, 30);
            jetGrad.addColorStop(0, '#ffffff');
            jetGrad.addColorStop(0.3, '#38bdf8');
            jetGrad.addColorStop(0.7, '#f59e0b');
            jetGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = jetGrad;

            [-17, 17].forEach((jx) => {
              ctx.beginPath();
              ctx.moveTo(jx - 4, -12);
              ctx.lineTo(jx + 4, -12);
              ctx.lineTo(jx, 22 + flamePulse);
              ctx.closePath();
              ctx.fill();
            });

            // Hero Body
            ctx.shadowColor = activeChar.glowColor;
            ctx.shadowBlur = 12;
            ctx.fillStyle = activeChar.jacketColor;
            ctx.beginPath();
            ctx.roundRect(-16, -42, 32, 36, 8);
            ctx.fill();

            // Stretched Flight Legs
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(-6, -6);
            ctx.lineTo(-8, 16);
            ctx.moveTo(6, -6);
            ctx.lineTo(8, 16);
            ctx.stroke();

            // Sneakers
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-12, 14, 8, 10);
            ctx.fillRect(4, 14, 8, 10);

            // Head Looking Forward
            ctx.fillStyle = isRobot ? '#475569' : '#fed7aa';
            ctx.beginPath();
            ctx.arc(0, -54, 12, 0, Math.PI * 2);
            ctx.fill();

            // Visor / Hair
            if (isRobot) {
              ctx.fillStyle = '#00f0ff';
              ctx.fillRect(-8, -58, 16, 6);
            } else {
              ctx.fillStyle = activeChar.hairColor;
              ctx.fillRect(-10, -66, 20, 10);
            }
            ctx.restore();

          } else if (p.isSliding) {
            // ============================================
            // POSE B: LOW PROFILE SLIDE DASH
            // ============================================
            ctx.save();
            ctx.shadowColor = activeChar.glowColor;
            ctx.shadowBlur = 10;

            // Rail Spark Particles from Shoe Contact
            if (Math.random() < 0.4) {
              emitParticles(p.worldX, p.worldY, 0, 1, '#fbbf24', 0.8);
            }

            // Low Torso
            ctx.fillStyle = activeChar.jacketColor;
            ctx.beginPath();
            ctx.roundRect(-26, -24, 52, 22, 6);
            ctx.fill();

            // Forward Extended Leg & Sliding Sneaker
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(12, -12);
            ctx.lineTo(34, -2);
            ctx.moveTo(-16, -12);
            ctx.lineTo(-28, -2);
            ctx.stroke();

            // High-Top Sneakers
            ctx.fillStyle = p.bootsTime > 0 ? '#10b981' : '#ffffff';
            ctx.fillRect(32, -6, 14, 8);
            ctx.fillRect(-34, -6, 12, 8);

            // Head Forward
            ctx.fillStyle = isRobot ? '#475569' : '#fed7aa';
            ctx.beginPath();
            ctx.arc(22, -14, 10, 0, Math.PI * 2);
            ctx.fill();

            // Visor / Cap
            if (isRobot) {
              ctx.fillStyle = '#00f0ff';
              ctx.fillRect(18, -17, 10, 5);
            } else {
              ctx.fillStyle = activeChar.accentColor;
              ctx.beginPath();
              ctx.arc(22, -18, 11, Math.PI, 0);
              ctx.fill();
            }
            ctx.restore();

          } else if (p.hoverboardActive) {
            // ============================================
            // POSE C: AUTHENTIC SURFER STANCE (SIDEWAYS)
            // ============================================
            ctx.save();
            // Surf stance leg positions
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 7;
            ctx.beginPath();
            // Front leg forward bent
            ctx.moveTo(4, -22);
            ctx.lineTo(16, -4);
            // Back leg back bent
            ctx.moveTo(-4, -22);
            ctx.lineTo(-18, -4);
            ctx.stroke();

            // Sneakers on Board
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(14, -8, 12, 6);
            ctx.fillRect(-22, -8, 12, 6);

            // Upper Body Turned
            ctx.shadowColor = activeChar.glowColor;
            ctx.shadowBlur = 12;
            ctx.fillStyle = activeChar.jacketColor;
            ctx.beginPath();
            ctx.roundRect(-14, -50, 28, 30, 6);
            ctx.fill();

            // Outstretched Balancing Arms
            ctx.strokeStyle = activeChar.jacketColor;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(-12, -42);
            ctx.lineTo(-28, -34);
            ctx.moveTo(12, -42);
            ctx.lineTo(28, -34);
            ctx.stroke();

            // Head Facing Forward
            ctx.fillStyle = isRobot ? '#475569' : '#fed7aa';
            ctx.beginPath();
            ctx.arc(0, -60, 12, 0, Math.PI * 2);
            ctx.fill();

            // Headgear / Face
            if (isRobot) {
              // Turbo-Bot Mecha Visor & Antenna
              ctx.fillStyle = '#00f0ff';
              ctx.fillRect(-8, -63, 16, 6);
              // Top Antenna
              ctx.strokeStyle = '#94a3b8';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(0, -72);
              ctx.lineTo(0, -80);
              ctx.stroke();
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(0, -81, 2.5, 0, Math.PI * 2);
              ctx.fill();
            } else if (isNinja) {
              // Shinobi Visor & Flowing Scarf
              ctx.fillStyle = '#ec4899';
              ctx.fillRect(-7, -63, 14, 5);
              // Fluttering Scarf in Wind
              const scarfWave = Math.sin(p.runAnim * 1.5) * 8;
              ctx.strokeStyle = '#a855f7';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.moveTo(-8, -52);
              ctx.quadraticCurveTo(-24, -48 + scarfWave, -38, -56 + scarfWave);
              ctx.stroke();
            } else if (isPunk) {
              // Beanie & DJ Headphones
              ctx.fillStyle = '#ec4899';
              ctx.fillRect(-10, -72, 20, 12);
              ctx.fillStyle = '#06b6d4';
              ctx.fillRect(-12, -62, 4, 10);
              ctx.fillRect(8, -62, 4, 10);
            } else if (isPhoenix) {
              // Solar Crown
              ctx.fillStyle = '#fbbf24';
              ctx.beginPath();
              ctx.moveTo(-10, -70);
              ctx.lineTo(-5, -78);
              ctx.lineTo(0, -72);
              ctx.lineTo(5, -78);
              ctx.lineTo(10, -70);
              ctx.closePath();
              ctx.fill();
            } else {
              // Neon Jake: Red Snapback Cap with backward brim & DJ Headphones
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(0, -64, 12, Math.PI, 0);
              ctx.fill();
              // Backwards cap brim
              ctx.fillRect(-16, -64, 10, 3);

              // DJ Headphones around neck
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(-14, -54, 5, 8);
              ctx.fillRect(9, -54, 5, 8);
              ctx.strokeStyle = '#00f0ff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(0, -52, 13, 0, Math.PI);
              ctx.stroke();
            }
            ctx.restore();

          } else {
            // ============================================
            // POSE D: RUNNING & JUMPING SKELETON KINEMATICS
            // ============================================
            const isJumping = !p.isGrounded && !p.onTrainTop;
            const runCycle = p.runAnim;
            const legSwing = isJumping ? 0 : Math.sin(runCycle) * 16;
            const armSwing = isJumping ? 0 : -Math.sin(runCycle) * 18;
            const bodyBob = isJumping ? 0 : Math.abs(Math.cos(runCycle)) * 3;

            ctx.save();
            ctx.translate(0, -bodyBob);

            // A. BACKPACK / EQUIPMENT
            ctx.save();
            if (isRobot) {
              // Turbo-Bot Reactor Core & Dual Plasma Exhausts
              ctx.shadowColor = '#00f0ff';
              ctx.shadowBlur = 12;
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(-16, -46, 32, 18);

              // Dual Shoulder Exhaust Thrusters
              [-14, 14].forEach((tx) => {
                ctx.fillStyle = '#0284c7';
                ctx.fillRect(tx - 3, -52, 6, 8);
                // Micro Blue Plasma Jet Flame
                const flameY = Math.sin(Date.now() * 0.04 + tx) * 3 + 6;
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.moveTo(tx - 2, -44);
                ctx.lineTo(tx + 2, -44);
                ctx.lineTo(tx, -44 + flameY);
                ctx.closePath();
                ctx.fill();
              });
            } else if (isNinja) {
              // Crossed Dual Katanas on Back
              ctx.strokeStyle = '#64748b';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(-18, -58);
              ctx.lineTo(18, -26);
              ctx.moveTo(18, -58);
              ctx.lineTo(-18, -26);
              ctx.stroke();
              // Gold Hilts
              ctx.fillStyle = '#fbbf24';
              ctx.fillRect(-22, -62, 5, 5);
              ctx.fillRect(17, -62, 5, 5);
            } else if (isPunk) {
              // Neon Boombox Backpack
              ctx.fillStyle = '#be185d';
              ctx.fillRect(-16, -44, 32, 16);
              ctx.fillStyle = '#06b6d4';
              ctx.fillRect(-12, -40, 8, 8);
              ctx.fillRect(4, -40, 8, 8);
            } else if (isPhoenix) {
              // Solar Energy Wings
              ctx.shadowColor = '#fbbf24';
              ctx.shadowBlur = 14;
              ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
              ctx.beginPath();
              ctx.moveTo(-14, -44);
              ctx.lineTo(-32, -62);
              ctx.lineTo(-22, -32);
              ctx.closePath();
              ctx.fill();
              ctx.beginPath();
              ctx.moveTo(14, -44);
              ctx.lineTo(32, -62);
              ctx.lineTo(22, -32);
              ctx.closePath();
              ctx.fill();
            } else {
              // Jake's Street Graffiti Backpack with Spray Cans
              ctx.fillStyle = '#1e293b';
              ctx.beginPath();
              ctx.roundRect(-15, -46, 30, 20, 4);
              ctx.fill();

              // Silver Spray Cans with Red & Cyan Caps
              ctx.fillStyle = '#94a3b8';
              ctx.fillRect(-12, -52, 6, 8);
              ctx.fillRect(6, -52, 6, 8);
              ctx.fillStyle = '#ef4444';
              ctx.fillRect(-11, -55, 4, 3);
              ctx.fillStyle = '#00f0ff';
              ctx.fillRect(7, -55, 4, 3);
            }
            ctx.restore();

            // B. LEGS & SNEAKERS
            ctx.save();
            ctx.strokeStyle = isRobot ? '#334155' : '#0f172a';
            ctx.lineWidth = 7;

            if (isJumping) {
              // Athletic In-Air Tuck Pose
              ctx.beginPath();
              ctx.moveTo(-6, -20);
              ctx.lineTo(-14, -6);
              ctx.moveTo(6, -20);
              ctx.lineTo(14, -6);
              ctx.stroke();

              // Sneakers
              ctx.fillStyle = p.bootsTime > 0 ? '#10b981' : '#ffffff';
              ctx.fillRect(-18, -8, 12, 7);
              ctx.fillRect(6, -8, 12, 7);
            } else {
              // Running Leg Swing
              ctx.beginPath();
              // Left Leg
              ctx.moveTo(-6, -20);
              ctx.lineTo(-8 - legSwing * 0.8, -4);
              // Right Leg
              ctx.moveTo(6, -20);
              ctx.lineTo(8 + legSwing * 0.8, -4);
              ctx.stroke();

              // High-Top Cyber Sneakers with Glowing Air Cushion
              const lShoeX = -14 - legSwing * 0.8;
              const rShoeX = 2 + legSwing * 0.8;
              const lShoeY = -6 + (legSwing > 0 ? -4 : 0);
              const rShoeY = -6 + (legSwing < 0 ? -4 : 0);

              // Shoes
              ctx.fillStyle = p.bootsTime > 0 ? '#10b981' : '#ffffff';
              ctx.fillRect(lShoeX, lShoeY, 14, 8);
              ctx.fillRect(rShoeX, rShoeY, 14, 8);

              // Colored Sole / Glow Rim
              ctx.fillStyle = p.bootsTime > 0 ? '#34d399' : activeChar.accentColor;
              ctx.fillRect(lShoeX, lShoeY + 6, 14, 2.5);
              ctx.fillRect(rShoeX, rShoeY + 6, 14, 2.5);
            }
            ctx.restore();

            // C. TORSO & JACKET
            ctx.save();
            ctx.shadowColor = activeChar.glowColor;
            ctx.shadowBlur = 10;
            ctx.fillStyle = activeChar.jacketColor;
            ctx.beginPath();
            ctx.roundRect(-16, -52, 32, 34, 7);
            ctx.fill();

            // Zipper / Chest Emblem / Power Core
            if (isRobot) {
              // Glowing Reactor Core
              ctx.fillStyle = '#00f0ff';
              ctx.beginPath();
              ctx.arc(0, -36, 6, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(0, -36, 2.5, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Cyber Hoodie Zipper & Racing Stripe
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(-1, -50, 2, 30);
              ctx.fillStyle = activeChar.accentColor;
              ctx.fillRect(-12, -48, 3, 26);
              ctx.fillRect(9, -48, 3, 26);
            }
            ctx.restore();

            // D. ARMS & HANDS SWING
            ctx.save();
            ctx.strokeStyle = activeChar.jacketColor;
            ctx.lineWidth = 6;
            ctx.beginPath();
            // Left Arm
            ctx.moveTo(-14, -46);
            ctx.lineTo(-20 + armSwing * 0.7, -30);
            // Right Arm
            ctx.moveTo(14, -46);
            ctx.lineTo(20 - armSwing * 0.7, -30);
            ctx.stroke();

            // Gloves / Robotic Hands
            ctx.fillStyle = isRobot ? '#00f0ff' : '#1e293b';
            ctx.beginPath();
            ctx.arc(-20 + armSwing * 0.7, -29, 3.5, 0, Math.PI * 2);
            ctx.arc(20 - armSwing * 0.7, -29, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // E. HEAD, HAIR & ACCESSORIES
            ctx.save();
            // Face skin / Chassis
            ctx.fillStyle = isRobot ? '#475569' : '#fed7aa';
            ctx.beginPath();
            ctx.arc(0, -62, 13, 0, Math.PI * 2);
            ctx.fill();

            if (isRobot) {
              // Turbo-Bot Mecha Cyclops Visor
              const scanPos = Math.sin(Date.now() * 0.008) * 5;
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(-10, -66, 20, 8);
              ctx.fillStyle = '#00f0ff';
              ctx.shadowColor = '#00f0ff';
              ctx.shadowBlur = 8;
              ctx.fillRect(-3 + scanPos, -65, 6, 6);

              // Top Antenna
              ctx.strokeStyle = '#94a3b8';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(0, -75);
              ctx.lineTo(0, -84);
              ctx.stroke();
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(0, -85, 3, 0, Math.PI * 2);
              ctx.fill();
            } else if (isNinja) {
              // Shinobi Mask & Glowing Eye Slit
              ctx.fillStyle = '#18181b';
              ctx.fillRect(-11, -62, 22, 10);
              ctx.fillStyle = '#ec4899';
              ctx.fillRect(-7, -66, 14, 4);

              // Fluttering Scarf
              const scarfWave = Math.sin(p.runAnim * 1.5) * 8;
              ctx.strokeStyle = '#a855f7';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.moveTo(-8, -54);
              ctx.quadraticCurveTo(-22, -50 + scarfWave, -36, -58 + scarfWave);
              ctx.stroke();
            } else if (isPunk) {
              // Beanie & DJ Headphones
              ctx.fillStyle = '#ec4899';
              ctx.fillRect(-11, -74, 22, 13);
              ctx.fillStyle = '#06b6d4';
              ctx.fillRect(-13, -64, 4, 10);
              ctx.fillRect(9, -64, 4, 10);
            } else if (isPhoenix) {
              // Golden Sun Crown & Flaming Eyes
              ctx.fillStyle = '#fbbf24';
              ctx.beginPath();
              ctx.moveTo(-11, -72);
              ctx.lineTo(-6, -80);
              ctx.lineTo(0, -74);
              ctx.lineTo(6, -80);
              ctx.lineTo(11, -72);
              ctx.closePath();
              ctx.fill();
            } else {
              // Neon Jake (Red Snapback Cap backward & DJ Headphones)
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(0, -66, 13, Math.PI, 0);
              ctx.fill();
              // Backwards cap brim
              ctx.fillRect(-18, -66, 10, 4);

              // Surfer blonde hair tuft in front
              ctx.fillStyle = '#f59e0b';
              ctx.fillRect(4, -66, 6, 6);

              // DJ Headphones around neck
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(-15, -56, 5, 8);
              ctx.fillRect(10, -56, 5, 8);
              ctx.strokeStyle = '#00f0ff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(0, -54, 14, 0, Math.PI);
              ctx.stroke();
            }
            ctx.restore();

            ctx.restore(); // Restore bodyBob
          }

          // 5. POWERUP AURAS (SUPER MAGNET / MULTIPLIER / SHIELD)
          if (p.magnetTime > 0) {
            ctx.save();
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(0, -30, 48, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          if (p.multiplierTime > 0) {
            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, -30, 42, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          ctx.restore(); // Restore main player transform
        }
      });

      // Render 3D Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const pt = eng.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.z -= eng.gameSpeed * 0.6;
        pt.life++;
        pt.alpha = 1 - pt.life / pt.maxLife;

        const p3 = project3D(pt.x, pt.y, pt.z);
        if (p3.visible && pt.alpha > 0) {
          ctx.fillStyle = pt.color;
          ctx.globalAlpha = Math.max(0, pt.alpha);
          ctx.beginPath();
          ctx.arc(p3.x, p3.y, pt.size * p3.scale, 0, Math.PI * 2);
          ctx.fill();
        }

        if (pt.life >= pt.maxLife || pt.z < -100) {
          eng.particles.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1;

      // Floating Callout Texts
      for (let i = eng.floatingTexts.length - 1; i >= 0; i--) {
        const ft = eng.floatingTexts[i];
        ft.y -= 1.2;
        ft.alpha -= 0.025;

        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = 'black 18px sans-serif';
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 14;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();

        if (ft.alpha <= 0) {
          eng.floatingTexts.splice(i, 1);
        }
      }

      ctx.restore(); // Restore global shake

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, selectedBoardId, selectedCharId, boards, characters, highScore]);

  return (
    <div id="cyber-rail-surfers-root" className="w-full flex flex-col items-center select-none">
      {/* Top HUD Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-t border-x border-slate-800 rounded-t-2xl backdrop-blur-md">
        {/* Left: Score & Best */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Score</span>
              <span className="text-lg font-black text-white leading-none">{score}</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>BEST: {highScore}</span>
          </div>

          {/* Hoverboard Badge */}
          {hasHoverboard && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs font-black animate-pulse">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>HOVERBOARD</span>
            </div>
          )}

          {/* Active Powerup Badge */}
          {activePowerup !== 'none' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/20 border border-purple-400/50 text-purple-300 text-xs font-black animate-pulse">
              {activePowerup === 'magnet' && <Magnet className="w-3.5 h-3.5 text-amber-400" />}
              {activePowerup === 'multiplier' && <Zap className="w-3.5 h-3.5 text-cyan-400" />}
              {activePowerup === 'boots' && <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
              {activePowerup === 'jetpack' && <Rocket className="w-3.5 h-3.5 text-fuchsia-400" />}
              <span className="uppercase">{activePowerup}</span>
            </div>
          )}
        </div>

        {/* Right: Coins, Shop, Help & Sound */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{coins}</span>
          </div>

          <button
            id="surfers-shop-btn"
            onClick={() => {
              sound.playClick();
              setShowShop((prev) => !prev);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Hoverboard & Character Shop"
          >
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            id="surfers-help-btn"
            onClick={() => {
              sound.playClick();
              setShowHelp((prev) => !prev);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="How to Play"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </button>

          <button
            id="surfers-sound-btn"
            onClick={toggleSound}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Container */}
      <div className="relative w-full max-w-4xl aspect-[4/3] sm:aspect-[16/9] bg-slate-950 border-x border-b border-slate-800 rounded-b-2xl overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          className="w-full h-full object-contain cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />

        {/* START SCREEN OVERLAY */}
        {gameState === 'start' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 space-y-5 animate-fade-in">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold tracking-wider uppercase">
                <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                3D CYBER RAILWAY RUNNER
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                NEON SURFERS: <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300">RAIL DASH 3D</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Switch lanes with <span className="text-cyan-400 font-bold">A / D / Arrows</span>, Jump over barricades with <span className="text-cyan-400 font-bold">W / Up</span>, Slide under high gates with <span className="text-cyan-400 font-bold">S / Down</span>, and activate your <span className="text-fuchsia-400 font-bold">HOVERBOARD</span> with Spacebar!
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                id="start-surfers-game-btn"
                onClick={handleStart}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-cyan-500/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                START RUNNING
              </button>

              <button
                id="start-open-shop-btn"
                onClick={() => {
                  sound.playClick();
                  setShowShop(true);
                }}
                className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm flex items-center gap-2 transition-all"
              >
                <ShoppingBag className="w-4 h-4 text-cyan-400" />
                HOVERBOARD SHOP
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER SCREEN OVERLAY */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Flame className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-4xl font-black text-white">TRACK WIPEOUT!</h2>
              <p className="text-xs sm:text-sm text-slate-400">You crashed into oncoming cyber defenses</p>
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 w-full max-w-sm">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Score</span>
                <div className="text-base sm:text-lg font-black text-cyan-400">{score}</div>
              </div>
              <div className="text-center border-x border-slate-800 px-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Coins</span>
                <div className="text-base sm:text-lg font-black text-amber-400">+{engineRef.current.sessionCoins}</div>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Best</span>
                <div className="text-base sm:text-lg font-black text-white">{highScore}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="surfers-retry-btn"
                onClick={handleRestart}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                PLAY AGAIN (R)
              </button>

              <button
                id="surfers-gameover-shop-btn"
                onClick={() => {
                  sound.playClick();
                  setShowShop(true);
                }}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm flex items-center gap-2 transition-all"
              >
                <ShoppingBag className="w-4 h-4 text-cyan-400" />
                SHOP
              </button>
            </div>
          </div>
        )}

        {/* MOBILE TOUCH CONTROLS OVERLAY */}
        {/* MOBILE CONTROLS OVERLAY FOR PHONE SCREENS */}
        {gameState === 'playing' && (
          <div className="absolute inset-x-2 bottom-2 flex items-end justify-between pointer-events-auto sm:hidden gap-1 select-none touch-none">
            {/* Lane Switching */}
            <div className="flex items-center gap-1.5">
              <button
                id="mobile-left-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  moveLeft();
                }}
                className="w-11 h-11 rounded-xl bg-slate-900/90 border border-slate-700 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center text-cyan-400 shadow-lg active:scale-95 transition-transform"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                id="mobile-right-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  moveRight();
                }}
                className="w-11 h-11 rounded-xl bg-slate-900/90 border border-slate-700 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center text-cyan-400 shadow-lg active:scale-95 transition-transform"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Jump, Slide, Board */}
            <div className="flex items-center gap-1.5">
              <button
                id="mobile-slide-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  slide();
                }}
                className="w-11 h-11 rounded-xl bg-slate-900/90 border border-purple-500/50 active:bg-purple-500 active:text-white flex items-center justify-center text-purple-400 shadow-lg active:scale-95 transition-transform"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
              <button
                id="mobile-jump-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  jump();
                }}
                className="w-11 h-11 rounded-xl bg-cyan-600/90 border border-cyan-400 active:bg-cyan-500 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
              <button
                id="mobile-board-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  activateHoverboard();
                }}
                className="px-2.5 h-11 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 border border-fuchsia-400 active:from-fuchsia-500 active:to-pink-500 flex items-center justify-center text-white font-black text-[10px] shadow-lg active:scale-95 transition-transform"
              >
                🛹 BOARD
              </button>
            </div>
          </div>
        )}
      </div>

      {/* HOVERBOARD & CHARACTER SHOP MODAL */}
      {showShop && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">CYBER SURF SHOP</h3>
                  <p className="text-xs text-slate-400">Unlock futuristic hoverboards and cyber runner skins</p>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setShowShop(false);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Hoverboards */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-bold text-cyan-400 tracking-wider">Hoverboard Decks</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {boards.map((b) => {
                  const isSelected = b.id === selectedBoardId;
                  return (
                    <div
                      key={b.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-400 ring-1 ring-cyan-400/50'
                          : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md"
                            style={{ backgroundColor: b.color }}
                          >
                            🛹
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white leading-snug">{b.name}</div>
                            <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{b.description}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                        {b.unlocked ? (
                          <button
                            onClick={() => equipBoard(b)}
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                            }`}
                          >
                            {isSelected ? 'EQUIPPED' : 'EQUIP DECK'}
                          </button>
                        ) : (
                          <button
                            onClick={() => buyBoard(b)}
                            disabled={coins < b.price}
                            className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              coins >= b.price
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>UNLOCK ({b.price} COINS)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Runner Characters */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs uppercase font-bold text-fuchsia-400 tracking-wider">Cyber Runner Characters</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {characters.map((c) => {
                  const isSelected = c.id === selectedCharId;
                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-fuchsia-500/10 border-fuchsia-400 ring-1 ring-fuchsia-400/50'
                          : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shadow-md border border-white/20"
                          style={{ 
                            backgroundColor: c.jacketColor,
                            boxShadow: `0 0 12px ${c.glowColor}40`
                          }}
                        >
                          {c.avatarEmoji || '🏃'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white leading-snug">{c.name}</div>
                          <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{c.description}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                        {c.unlocked ? (
                          <button
                            onClick={() => equipCharacter(c)}
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                            }`}
                          >
                            {isSelected ? 'EQUIPPED' : 'EQUIP RUNNER'}
                          </button>
                        ) : (
                          <button
                            onClick={() => buyCharacter(c)}
                            disabled={coins < c.price}
                            className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              coins >= c.price
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>UNLOCK ({c.price} COINS)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HOW TO PLAY HELP MODAL */}
      {showHelp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-black text-white">HOW TO PLAY</h3>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  setShowHelp(false);
                }}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                <span className="font-bold text-cyan-400">🎮 Steering & Movement:</span>
                <p>Press <b className="text-white">A / D or Left / Right Arrows</b> to switch lanes smoothly across 3 tracks.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                <span className="font-bold text-emerald-400">🚀 Jump & Slide:</span>
                <p>Press <b className="text-white">W / Up Arrow</b> to Jump over low barricades and onto train roofs via ramps. Press <b className="text-white">S / Down Arrow</b> to slide under high laser barriers.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                <span className="font-bold text-fuchsia-400">🛹 Neon Hoverboard:</span>
                <p>Press <b className="text-white">SPACEBAR</b> (or Double Tap on mobile) to activate your hoverboard! If you hit an obstacle while on a hoverboard, the board breaks but you survive!</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                <span className="font-bold text-amber-400">⚡ Powerups:</span>
                <p>Grab 🧲 Super Magnets, ⚡ 2X Score Multipliers, 👟 Bounce Boots, and 🚀 Sky Jetpacks for massive high scores!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
