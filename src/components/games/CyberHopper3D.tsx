import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  Sparkles,
  Shield,
  Zap,
  Magnet,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bot,
  Flame,
  Award,
} from 'lucide-react';
import { sound } from '../../utils/audio';

// Grid Constants
const GRID_COLS = 13;
const TILE_SIZE = 48; // Base tile size in pixels
const EAGLE_TIMEOUT_SEC = 10; // Seconds idle before Hunter Drone descends

// Lane Types
type LaneType = 'grass' | 'road' | 'river' | 'railway';

interface Obstacle {
  x: number; // in pixel coordinates on lane
  width: number;
  speed: number; // positive = moving right, negative = moving left
  type: 'car' | 'truck' | 'hoverbike' | 'log' | 'pad' | 'train';
  color: string;
  glowColor: string;
}

interface Lane {
  id: number;
  row: number; // 0 is start, 1, 2, 3... forward
  type: LaneType;
  obstacles: Obstacle[];
  trees: boolean[]; // For grass lanes: true if tile has rock/tree obstacle
  coins: boolean[]; // True if coin exists on column
  powerup?: { col: number; type: 'shield' | 'magnet' | 'jetpack' };
  trainWarningTime?: number; // Timer for train alert (flashing red lights)
  trainCooldown?: number;
}

// Playable Character Skins
interface CharacterSkin {
  id: string;
  name: string;
  emoji: string;
  color: string;
  accent: string;
  glow: string;
  price: number;
  description: string;
}

const CHARACTERS: CharacterSkin[] = [
  {
    id: 'cyber-duck',
    name: 'Cyber Duck',
    emoji: '🦆',
    color: '#eab308',
    accent: '#f97316',
    glow: 'rgba(234, 179, 8, 0.6)',
    price: 0,
    description: 'The legendary cybernetic crosser of highways!',
  },
  {
    id: 'mecha-kitty',
    name: 'Mecha Kitty',
    emoji: '🐱',
    color: '#ec4899',
    accent: '#a855f7',
    glow: 'rgba(236, 72, 153, 0.6)',
    price: 50,
    description: 'High-agility feline with holographic whiskers.',
  },
  {
    id: 'neon-frog',
    name: 'Neon Frog',
    emoji: '🐸',
    color: '#10b981',
    accent: '#06b6d4',
    glow: 'rgba(16, 185, 129, 0.6)',
    price: 120,
    description: 'Master of plasma rivers and lilypads.',
  },
  {
    id: 'robo-bot',
    name: 'Robo Bot-9000',
    emoji: '🤖',
    color: '#06b6d4',
    accent: '#3b82f6',
    glow: 'rgba(6, 182, 212, 0.7)',
    price: 250,
    description: 'Armed with magnetic titanium circuits.',
  },
  {
    id: 'solar-fox',
    name: 'Solar Fox',
    emoji: '🦊',
    color: '#f97316',
    accent: '#ef4444',
    glow: 'rgba(249, 115, 22, 0.7)',
    price: 450,
    description: 'Leaves a blaze of fiery solar sparks behind.',
  },
  {
    id: 'cyber-dino',
    name: 'Cyber Rex',
    emoji: '🦖',
    color: '#8b5cf6',
    accent: '#d946ef',
    glow: 'rgba(139, 92, 246, 0.8)',
    price: 750,
    description: 'Jurassic cyber apex beast of the meta-streets.',
  },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

export const CyberHopper3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High Scores & Progression
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);
  const [selectedChar, setSelectedChar] = useState<string>('cyber-duck');
  const [unlockedChars, setUnlockedChars] = useState<string[]>(['cyber-duck']);
  const [gameState, setGameState] = useState<'playing' | 'gameover' | 'garage'>('playing');
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Active Powerups Status
  const [hasShield, setHasShield] = useState<boolean>(false);
  const [magnetTimer, setMagnetTimer] = useState<number>(0);

  // Player Grid State
  const playerRef = useRef({
    col: 6, // Center column (0 to GRID_COLS - 1)
    row: 0, // 0 = start
    targetCol: 6,
    targetRow: 0,
    jumpProgress: 1, // 0 to 1 during hop animation
    facing: 'up' as 'up' | 'down' | 'left' | 'right',
    dead: false,
    deathReason: '' as 'traffic' | 'drown' | 'drone' | '',
    logSpeed: 0, // Current horizontal velocity if standing on a floating log
    shieldActive: false,
    magnetTime: 0,
    idleTime: 0,
  });

  // World Lanes Generation Ref
  const lanesRef = useRef<Map<number, Lane>>(new Map());
  const maxRowGenerated = useRef<number>(0);
  const maxRowReached = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const touchSwipeRef = useRef<{ startX: number; startY: number; time: number } | null>(null);

  // Hunter Drone Tracking
  const droneYRef = useRef<number>(-200);

  // Load Saved Stats
  useEffect(() => {
    try {
      const savedHigh = localStorage.getItem('cyber_hopper_high');
      if (savedHigh) setHighScore(parseInt(savedHigh, 10));

      const savedCoins = localStorage.getItem('cyber_hopper_coins');
      if (savedCoins) setCoins(parseInt(savedCoins, 10));

      const savedChars = localStorage.getItem('cyber_hopper_chars');
      if (savedChars) setUnlockedChars(JSON.parse(savedChars));

      const savedActive = localStorage.getItem('cyber_hopper_active_char');
      if (savedActive) setSelectedChar(savedActive);
    } catch {
      // ignore
    }
  }, []);

  // Generate a Specific Lane by Row Index
  const generateLane = useCallback((row: number): Lane => {
    if (row <= 2) {
      // Safe Starting Zone Grass
      return {
        id: row,
        row,
        type: 'grass',
        obstacles: [],
        trees: Array(GRID_COLS).fill(false),
        coins: Array(GRID_COLS).fill(false),
      };
    }

    const rand = Math.random();
    let type: LaneType = 'road';

    if (rand < 0.25) type = 'grass';
    else if (rand < 0.65) type = 'road';
    else if (rand < 0.88) type = 'river';
    else type = 'railway';

    const trees = Array(GRID_COLS).fill(false);
    const coinsArr = Array(GRID_COLS).fill(false);
    const obstacles: Obstacle[] = [];

    // Grass Trees & Rocks
    if (type === 'grass') {
      let openPaths = 0;
      for (let c = 0; c < GRID_COLS; c++) {
        if (Math.random() < 0.28) {
          trees[c] = true;
        } else {
          openPaths++;
        }
      }
      // Ensure at least 3 walkable tiles
      if (openPaths < 3) {
        trees[5] = false;
        trees[6] = false;
        trees[7] = false;
      }
    }

    // Road Vehicles (Cars, Trucks, Hoverbikes)
    if (type === 'road') {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = (Math.random() * 80 + 70 + Math.min(row * 0.8, 120)) * dir;
      const isTruck = Math.random() < 0.35;
      const isBike = !isTruck && Math.random() < 0.3;

      const vehicleWidth = isTruck ? 110 : isBike ? 42 : 72;
      const colors = ['#f43f5e', '#06b6d4', '#eab308', '#a855f7', '#10b981'];
      const vColor = colors[Math.floor(Math.random() * colors.length)];

      const count = Math.floor(Math.random() * 2) + 2; // 2 or 3 vehicles per lane
      const spacing = (GRID_COLS * TILE_SIZE + 200) / count;

      for (let i = 0; i < count; i++) {
        obstacles.push({
          x: i * spacing + Math.random() * 40,
          width: vehicleWidth,
          speed,
          type: isTruck ? 'truck' : isBike ? 'hoverbike' : 'car',
          color: vColor,
          glowColor: vColor,
        });
      }
    }

    // River Floating Logs & Energy Pads
    if (type === 'river') {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = (Math.random() * 45 + 40) * dir;
      const logCount = Math.floor(Math.random() * 2) + 2;
      const spacing = (GRID_COLS * TILE_SIZE + 180) / logCount;

      for (let i = 0; i < logCount; i++) {
        const isLongLog = Math.random() < 0.5;
        obstacles.push({
          x: i * spacing + Math.random() * 30,
          width: isLongLog ? 130 : 85,
          speed,
          type: isLongLog ? 'log' : 'pad',
          color: '#0284c7',
          glowColor: '#38bdf8',
        });
      }
    }

    // Hyperloop Railway Track
    if (type === 'railway') {
      // Trains spawn periodically with a siren warning
    }

    // Spawn Coins
    for (let c = 0; c < GRID_COLS; c++) {
      if (!trees[c] && Math.random() < 0.12) {
        coinsArr[c] = true;
      }
    }

    // Occasional Powerups (Shield, Magnet, Jetpack)
    let powerup: Lane['powerup'] = undefined;
    if (Math.random() < 0.08 && type === 'grass') {
      const validCols = [];
      for (let c = 1; c < GRID_COLS - 1; c++) {
        if (!trees[c]) validCols.push(c);
      }
      if (validCols.length > 0) {
        const col = validCols[Math.floor(Math.random() * validCols.length)];
        const types: ('shield' | 'magnet' | 'jetpack')[] = ['shield', 'magnet', 'jetpack'];
        powerup = { col, type: types[Math.floor(Math.random() * types.length)] };
      }
    }

    return {
      id: row,
      row,
      type,
      obstacles,
      trees,
      coins: coinsArr,
      powerup,
      trainWarningTime: 0,
      trainCooldown: Math.random() * 4 + 3.5, // 3.5 to 7.5s
    };
  }, []);

  // Ensure Lanes around player are generated
  const ensureLanes = useCallback((currentRow: number) => {
    const minRow = Math.max(0, currentRow - 5);
    const maxRow = currentRow + 16;

    for (let r = minRow; r <= maxRow; r++) {
      if (!lanesRef.current.has(r)) {
        lanesRef.current.set(r, generateLane(r));
        if (r > maxRowGenerated.current) maxRowGenerated.current = r;
      }
    }

    // Clean up very old lanes
    lanesRef.current.forEach((_, key) => {
      if (key < minRow - 5) {
        lanesRef.current.delete(key);
      }
    });
  }, [generateLane]);

  // Restart / Start Game
  const startGame = useCallback(() => {
    sound.playClick();
    setGameState('playing');
    setScore(0);
    setHasShield(false);
    setMagnetTimer(0);

    playerRef.current = {
      col: 6,
      row: 0,
      targetCol: 6,
      targetRow: 0,
      jumpProgress: 1,
      facing: 'up',
      dead: false,
      deathReason: '',
      logSpeed: 0,
      shieldActive: false,
      magnetTime: 0,
      idleTime: 0,
    };

    lanesRef.current.clear();
    maxRowGenerated.current = 0;
    maxRowReached.current = 0;
    particlesRef.current = [];
    droneYRef.current = -300;

    ensureLanes(0);
  }, [ensureLanes]);

  // Handle Player Death
  const triggerGameOver = useCallback((reason: 'traffic' | 'drown' | 'drone') => {
    if (playerRef.current.dead) return;
    playerRef.current.dead = true;
    playerRef.current.deathReason = reason;

    if (reason === 'drown') {
      sound.playSplash();
    } else {
      sound.playCrash();
    }

    // Spawn Death Particles
    const activeChar = CHARACTERS.find((c) => c.id === selectedChar) || CHARACTERS[0];
    for (let i = 0; i < 25; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 6 + 2;
      particlesRef.current.push({
        x: playerRef.current.col * TILE_SIZE + TILE_SIZE / 2,
        y: playerRef.current.row * TILE_SIZE + TILE_SIZE / 2,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: Math.random() < 0.6 ? activeChar.color : '#ef4444',
        alpha: 1,
        size: Math.random() * 4 + 2,
      });
    }

    setGameState('gameover');
  }, [selectedChar]);

  // Hop Movement Function
  const movePlayer = useCallback((dCol: number, dRow: number) => {
    const p = playerRef.current;
    if (p.dead || gameState !== 'playing') return;

    // Reset idle timer
    p.idleTime = 0;

    const nextCol = Math.max(0, Math.min(GRID_COLS - 1, p.col + dCol));
    const nextRow = Math.max(0, p.row + dRow);

    // Check if target is blocked by tree/rock
    const targetLane = lanesRef.current.get(nextRow);
    if (targetLane && targetLane.type === 'grass' && targetLane.trees[nextCol]) {
      sound.playError();
      return;
    }

    // Set Facing Direction
    if (dRow > 0) p.facing = 'up';
    else if (dRow < 0) p.facing = 'down';
    else if (dCol < 0) p.facing = 'left';
    else if (dCol > 0) p.facing = 'right';

    p.targetCol = nextCol;
    p.targetRow = nextRow;
    p.jumpProgress = 0;

    sound.playHop();

    // Check High Score
    if (nextRow > maxRowReached.current) {
      maxRowReached.current = nextRow;
      setScore(nextRow);
      if (nextRow > highScore) {
        setHighScore(nextRow);
        try {
          localStorage.setItem('cyber_hopper_high', String(nextRow));
        } catch {
          // ignore
        }
      }
    }

    ensureLanes(nextRow);
  }, [gameState, highScore, ensureLanes]);

  // Keyboard Controller
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        movePlayer(0, 1);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        movePlayer(0, -1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        movePlayer(-1, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        movePlayer(1, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, gameState]);

  // Touch Swipe & Tap on Canvas
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const touch = e.touches[0];
    touchSwipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchSwipeRef.current || gameState !== 'playing') return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchSwipeRef.current.startX;
    const dy = touch.clientY - touchSwipeRef.current.startY;
    const dist = Math.hypot(dx, dy);
    const duration = Date.now() - touchSwipeRef.current.time;

    // If tap (< 18px movement in under 350ms), hop forward
    if (dist < 18 && duration < 350) {
      movePlayer(0, 1);
    } else if (dist >= 20) {
      // Swipe gesture in predominant direction
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) movePlayer(1, 0); // Right
        else movePlayer(-1, 0); // Left
      } else {
        if (dy < 0) movePlayer(0, 1); // Up (Forward)
        else movePlayer(0, -1); // Down (Back)
      }
    }
    touchSwipeRef.current = null;
  };

  // Buy Skin from Garage
  const buyCharacter = (char: CharacterSkin) => {
    if (unlockedChars.includes(char.id)) {
      setSelectedChar(char.id);
      localStorage.setItem('cyber_hopper_active_char', char.id);
      sound.playClick();
      return;
    }

    if (coins >= char.price) {
      sound.playWin();
      confetti({ particleCount: 60, spread: 70 });
      const nextCoins = coins - char.price;
      const nextChars = [...unlockedChars, char.id];
      setCoins(nextCoins);
      setUnlockedChars(nextChars);
      setSelectedChar(char.id);

      localStorage.setItem('cyber_hopper_coins', String(nextCoins));
      localStorage.setItem('cyber_hopper_chars', JSON.stringify(nextChars));
      localStorage.setItem('cyber_hopper_active_char', char.id);
    } else {
      sound.playError();
    }
  };

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    ensureLanes(0);

    const gameLoop = (now: number) => {
      if (!isRunning) return;

      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // Handle Canvas Responsive Sizing
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.save();
      ctx.scale(dpr, dpr);

      const viewWidth = rect.width;
      const viewHeight = rect.height;

      const p = playerRef.current;
      const activeChar = CHARACTERS.find((c) => c.id === selectedChar) || CHARACTERS[0];

      // 1. UPDATE PLAYER HOP INTERPOLATION
      if (p.jumpProgress < 1) {
        p.jumpProgress += dt * 7.5; // Hop animation speed
        if (p.jumpProgress >= 1) {
          p.jumpProgress = 1;
          p.col = p.targetCol;
          p.row = p.targetRow;

          // Check Tile Pickups (Coins / Powerups)
          const lane = lanesRef.current.get(p.row);
          if (lane) {
            // Coin Pickup
            if (lane.coins[p.col]) {
              lane.coins[p.col] = false;
              sound.playFruitSlice(3);
              setCoins((c) => {
                const nextC = c + 1;
                localStorage.setItem('cyber_hopper_coins', String(nextC));
                return nextC;
              });
            }

            // Powerup Pickup
            if (lane.powerup && lane.powerup.col === p.col) {
              const pType = lane.powerup.type;
              lane.powerup = undefined;

              if (pType === 'shield') {
                sound.playPowerup();
                p.shieldActive = true;
                setHasShield(true);
              } else if (pType === 'magnet') {
                sound.playPowerup();
                p.magnetTime = 8.0;
                setMagnetTimer(8);
              } else if (pType === 'jetpack') {
                sound.playFrenzyChime();
                // Rocket 5 lanes forward!
                p.targetRow = p.row + 5;
                p.row = p.targetRow;
                p.jumpProgress = 1;
                ensureLanes(p.row);
                maxRowReached.current = Math.max(maxRowReached.current, p.row);
                setScore(p.row);
              }
            }
          }
        }
      }

      // Magnet Timer & Coin Suction
      if (p.magnetTime > 0) {
        p.magnetTime -= dt;
        setMagnetTimer(Math.max(0, Math.ceil(p.magnetTime)));
        // Auto collect coins within 3 rows
        lanesRef.current.forEach((lane) => {
          if (Math.abs(lane.row - p.row) <= 3) {
            for (let c = 0; c < GRID_COLS; c++) {
              if (lane.coins[c]) {
                lane.coins[c] = false;
                sound.playFruitSlice(2);
                setCoins((co) => {
                  const nextC = co + 1;
                  localStorage.setItem('cyber_hopper_coins', String(nextC));
                  return nextC;
                });
              }
            }
          }
        });
      }

      // Idle Hunter Drone Timer
      if (gameState === 'playing' && !p.dead) {
        p.idleTime += dt;
        if (p.idleTime >= EAGLE_TIMEOUT_SEC) {
          triggerGameOver('drone');
        }
      }

      // 2. UPDATE OBSTACLES (Cars, Trains, Logs)
      const totalWidth = GRID_COLS * TILE_SIZE;

      lanesRef.current.forEach((lane) => {
        // Vehicles & Logs Movement
        lane.obstacles.forEach((obs) => {
          obs.x += obs.speed * dt;
          // Wrap around lane
          if (obs.speed > 0 && obs.x > totalWidth + 100) {
            obs.x = -obs.width - 50;
          } else if (obs.speed < 0 && obs.x < -obs.width - 100) {
            obs.x = totalWidth + 50;
          }
        });

        // Railway Train Spawning Logic
        if (lane.type === 'railway') {
          lane.trainCooldown = (lane.trainCooldown || 5) - dt;

          // Train Warning Lights
          if (lane.trainCooldown <= 1.5 && lane.trainCooldown > 0) {
            if ((lane.trainWarningTime || 0) <= 0) {
              sound.playTrainWarning();
              lane.trainWarningTime = 1.5;
            }
          }

          // Train Rushes Through!
          if (lane.trainCooldown <= 0 && lane.obstacles.length === 0) {
            sound.playBladeSwipe();
            const trainDir = Math.random() < 0.5 ? 1 : -1;
            const trainSpeed = 750 * trainDir; // Ultra high-speed hyperloop
            lane.obstacles.push({
              x: trainDir > 0 ? -500 : totalWidth + 500,
              width: 480,
              speed: trainSpeed,
              type: 'train',
              color: '#f43f5e',
              glowColor: '#ef4444',
            });
          }

          // Remove train once passed
          if (lane.obstacles.length > 0 && lane.obstacles[0].type === 'train') {
            const tr = lane.obstacles[0];
            if (
              (tr.speed > 0 && tr.x > totalWidth + 600) ||
              (tr.speed < 0 && tr.x < -600)
            ) {
              lane.obstacles = [];
              lane.trainCooldown = Math.random() * 5 + 4; // next train in 4-9s
              lane.trainWarningTime = 0;
            }
          }
        }
      });

      // 3. COLLISION & LOG DRIFT PHYSICS
      const playerPixelX =
        (p.col + (p.targetCol - p.col) * p.jumpProgress) * TILE_SIZE + TILE_SIZE / 2;
      const currentLane = lanesRef.current.get(p.row);

      if (currentLane && gameState === 'playing' && !p.dead && p.jumpProgress === 1) {
        // A) ROAD / RAILWAY COLLISION
        if (currentLane.type === 'road' || currentLane.type === 'railway') {
          for (const obs of currentLane.obstacles) {
            const obsLeft = obs.x;
            const obsRight = obs.x + obs.width;
            if (playerPixelX >= obsLeft + 6 && playerPixelX <= obsRight - 6) {
              if (p.shieldActive) {
                // Shield saves player from 1 hit!
                p.shieldActive = false;
                setHasShield(false);
                sound.playIceFreeze();
                // Push vehicle back slightly
                obs.x += obs.speed > 0 ? -100 : 100;
              } else {
                triggerGameOver('traffic');
              }
              break;
            }
          }
        }

        // B) RIVER LOG / DROWNING LOGIC
        if (currentLane.type === 'river') {
          let isOnLog = false;
          let currentLogSpeed = 0;

          for (const obs of currentLane.obstacles) {
            const obsLeft = obs.x;
            const obsRight = obs.x + obs.width;
            if (playerPixelX >= obsLeft - 4 && playerPixelX <= obsRight + 4) {
              isOnLog = true;
              currentLogSpeed = obs.speed;
              break;
            }
          }

          if (isOnLog) {
            // Drift with the log horizontally
            const driftDelta = (currentLogSpeed * dt) / TILE_SIZE;
            const newColFloat = p.col + driftDelta;
            if (newColFloat < 0 || newColFloat >= GRID_COLS) {
              triggerGameOver('drown');
            } else {
              p.col = Math.max(0, Math.min(GRID_COLS - 1, newColFloat));
              p.targetCol = p.col;
            }
          } else {
            // Fell in plasma water!
            triggerGameOver('drown');
          }
        }
      }

      // 4. CAMERA VIEWPORT CALCULATION
      // Smoothly follow player Y position
      const playerY = (p.row + (p.targetRow - p.row) * p.jumpProgress) * TILE_SIZE;
      const cameraY = playerY - viewHeight * 0.4; // Keep player in lower-middle third
      const cameraX = (GRID_COLS * TILE_SIZE - viewWidth) / 2;

      // 5. RENDER BACKGROUND & LANES
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      ctx.save();
      ctx.translate(-cameraX, cameraY); // Move camera

      // Render visible lanes from back to front
      const visibleMinRow = Math.floor((cameraY - 100) / TILE_SIZE);
      const visibleMaxRow = Math.ceil((cameraY + viewHeight + 100) / TILE_SIZE);

      for (let r = visibleMinRow; r <= visibleMaxRow; r++) {
        const lane = lanesRef.current.get(r);
        if (!lane) continue;

        const laneY = viewHeight - (r + 1) * TILE_SIZE;

        // Draw Lane Base Surface
        if (lane.type === 'grass') {
          ctx.fillStyle = r % 2 === 0 ? '#0f291e' : '#143829';
          ctx.fillRect(0, laneY, totalWidth, TILE_SIZE);

          // Subtle Cyber Grid Pattern
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
          ctx.lineWidth = 1;
          for (let c = 0; c <= GRID_COLS; c++) {
            ctx.strokeRect(c * TILE_SIZE, laneY, TILE_SIZE, TILE_SIZE);
          }

          // Draw Trees & Rocks (Obstacles)
          for (let c = 0; c < GRID_COLS; c++) {
            if (lane.trees[c]) {
              const tx = c * TILE_SIZE + TILE_SIZE / 2;
              const ty = laneY + TILE_SIZE / 2;

              // Holographic Cyber Tree
              ctx.fillStyle = '#047857';
              ctx.beginPath();
              ctx.arc(tx, ty - 4, 18, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#10b981';
              ctx.beginPath();
              ctx.arc(tx, ty - 8, 12, 0, Math.PI * 2);
              ctx.fill();

              // Glowing Tree Top
              ctx.fillStyle = '#34d399';
              ctx.beginPath();
              ctx.arc(tx, ty - 12, 6, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (lane.type === 'road') {
          // Asphalt Cyber Highway
          ctx.fillStyle = '#0b0f19';
          ctx.fillRect(0, laneY, totalWidth, TILE_SIZE);

          // Dashed Neon Center Line
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(0, laneY + TILE_SIZE / 2);
          ctx.lineTo(totalWidth, laneY + TILE_SIZE / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (lane.type === 'river') {
          // Plasma Water River
          ctx.fillStyle = '#0369a1';
          ctx.fillRect(0, laneY, totalWidth, TILE_SIZE);

          // Water Current Waves
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
          ctx.lineWidth = 1.5;
          const waveShift = (now * 0.05) % 30;
          for (let w = -30; w < totalWidth + 30; w += 40) {
            ctx.beginPath();
            ctx.arc(w + waveShift, laneY + TILE_SIZE / 2, 8, 0, Math.PI);
            ctx.stroke();
          }
        } else if (lane.type === 'railway') {
          // Hyperloop Railway Track
          ctx.fillStyle = '#1e1b4b';
          ctx.fillRect(0, laneY, totalWidth, TILE_SIZE);

          // Metal Rails
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, laneY + 12);
          ctx.lineTo(totalWidth, laneY + 12);
          ctx.moveTo(0, laneY + TILE_SIZE - 12);
          ctx.lineTo(totalWidth, laneY + TILE_SIZE - 12);
          ctx.stroke();

          // Flashing Warning Beacons if Train is coming
          if ((lane.trainWarningTime || 0) > 0) {
            const flash = Math.floor(now / 150) % 2 === 0;
            ctx.fillStyle = flash ? '#ef4444' : '#7f1d1d';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = flash ? 16 : 0;
            ctx.beginPath();
            ctx.arc(24, laneY + TILE_SIZE / 2, 8, 0, Math.PI * 2);
            ctx.arc(totalWidth - 24, laneY + TILE_SIZE / 2, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        // Draw Floating Logs (River Obstacles)
        if (lane.type === 'river') {
          lane.obstacles.forEach((obs) => {
            const ox = obs.x;
            const oy = laneY + 6;
            const oh = TILE_SIZE - 12;

            ctx.save();
            ctx.fillStyle = '#0c4a6e';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
            ctx.shadowBlur = 8;

            // Rounded Floating Platform Log
            ctx.beginPath();
            ctx.roundRect(ox, oy, obs.width, oh, 8);
            ctx.fill();
            ctx.stroke();

            // Tech Circuit Nodes on Log
            ctx.fillStyle = '#38bdf8';
            for (let dot = 12; dot < obs.width - 6; dot += 20) {
              ctx.beginPath();
              ctx.arc(ox + dot, oy + oh / 2, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          });
        }

        // Draw Coins
        for (let c = 0; c < GRID_COLS; c++) {
          if (lane.coins[c]) {
            const cx = c * TILE_SIZE + TILE_SIZE / 2;
            const cy = laneY + TILE_SIZE / 2;
            const bobY = Math.sin(now * 0.006 + c) * 3;

            ctx.save();
            ctx.fillStyle = '#facc15';
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(cx, cy + bobY, 9, 0, Math.PI * 2);
            ctx.fill();

            // Coin Core
            ctx.fillStyle = '#ca8a04';
            ctx.beginPath();
            ctx.arc(cx, cy + bobY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // Draw Powerups (Shield, Magnet, Jetpack)
        if (lane.powerup) {
          const px = lane.powerup.col * TILE_SIZE + TILE_SIZE / 2;
          const py = laneY + TILE_SIZE / 2;
          const pulse = Math.sin(now * 0.008) * 4;

          ctx.save();
          ctx.shadowBlur = 14;

          if (lane.powerup.type === 'shield') {
            ctx.shadowColor = '#3b82f6';
            ctx.fillStyle = '#1d4ed8';
            ctx.beginPath();
            ctx.arc(px, py + pulse, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#60a5fa';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🛡️', px, py + pulse + 4);
          } else if (lane.powerup.type === 'magnet') {
            ctx.shadowColor = '#ec4899';
            ctx.fillStyle = '#be185d';
            ctx.beginPath();
            ctx.arc(px, py + pulse, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f472b6';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🧲', px, py + pulse + 4);
          } else if (lane.powerup.type === 'jetpack') {
            ctx.shadowColor = '#f97316';
            ctx.fillStyle = '#c2410c';
            ctx.beginPath();
            ctx.arc(px, py + pulse, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fb923c';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🚀', px, py + pulse + 4);
          }
          ctx.restore();
        }

        // Draw Road Vehicles & Trains
        if (lane.type === 'road' || lane.type === 'railway') {
          lane.obstacles.forEach((obs) => {
            const ox = obs.x;
            const oy = laneY + 4;
            const oh = TILE_SIZE - 8;

            ctx.save();
            ctx.fillStyle = obs.color;
            ctx.shadowColor = obs.glowColor;
            ctx.shadowBlur = 12;

            if (obs.type === 'train') {
              // Ultra-Long Bullet Hyperloop Train
              ctx.beginPath();
              ctx.roundRect(ox, oy, obs.width, oh, 12);
              ctx.fill();

              // Glowing Windows
              ctx.fillStyle = '#fef08a';
              for (let win = 20; win < obs.width - 20; win += 24) {
                ctx.fillRect(ox + win, oy + 6, 12, 10);
              }
            } else {
              // Cyber Car / Truck / Bike
              ctx.beginPath();
              ctx.roundRect(ox, oy, obs.width, oh, 8);
              ctx.fill();

              // Headlights & Tail Lights
              const isMovingRight = obs.speed > 0;
              const frontX = isMovingRight ? ox + obs.width - 4 : ox + 4;
              const backX = isMovingRight ? ox + 4 : ox + obs.width - 4;

              // Front Headlight Beam
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = '#ffffff';
              ctx.shadowBlur = 10;
              ctx.fillRect(frontX - 2, oy + 4, 4, 6);
              ctx.fillRect(frontX - 2, oy + oh - 10, 4, 6);

              // Red Rear Brake Lights
              ctx.fillStyle = '#ef4444';
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 8;
              ctx.fillRect(backX - 2, oy + 4, 4, 6);
              ctx.fillRect(backX - 2, oy + oh - 10, 4, 6);
            }
            ctx.restore();
          });
        }
      }

      // 6. DRAW PLAYER CHARACTER (HOPPING 3D CUBE / AVATAR)
      if (!p.dead) {
        const curCol = p.col + (p.targetCol - p.col) * p.jumpProgress;
        const curRow = p.row + (p.targetRow - p.row) * p.jumpProgress;

        const px = curCol * TILE_SIZE + TILE_SIZE / 2;
        const py = viewHeight - (curRow + 1) * TILE_SIZE + TILE_SIZE / 2;

        // Parabolic Hop Arc Height (Z-axis)
        const hopHeight = Math.sin(p.jumpProgress * Math.PI) * 22;

        ctx.save();
        ctx.translate(px, py - hopHeight);

        // Ground Drop Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, hopHeight + 12, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Active Shield Sphere Aura
        if (p.shieldActive) {
          ctx.strokeStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 16;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Character Main Body
        ctx.fillStyle = activeChar.color;
        ctx.shadowColor = activeChar.glow;
        ctx.shadowBlur = 14;

        // Rounded Cube Body
        ctx.beginPath();
        ctx.roundRect(-14, -14, 28, 28, 8);
        ctx.fill();

        // Inner Character Emoji / Face
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeChar.emoji, 0, 1);

        ctx.restore();
      }

      // 7. DRAW DEATH PARTICLES
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= dt * 1.5;

        if (pt.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pt.x, viewHeight - pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore(); // Restore Camera Transform

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, selectedChar, ensureLanes, triggerGameOver]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center select-none">
      <div
        id="cyber-hopper-container"
        className="relative w-full max-w-[680px] min-h-[440px] sm:min-h-[580px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between items-center select-none font-sans mx-auto border-4 border-slate-900/90 bg-slate-950 p-2.5 sm:p-5 touch-none"
      >
      {/* 1. TOP HEADER (Distance Score, High Score, Coins, Controls) */}
      <div className="w-full flex items-center justify-between gap-1 sm:gap-2 z-20">
        {/* Left: Distance & Best Score */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 text-cyan-300 flex flex-col items-center shadow-md">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              DISTANCE
            </span>
            <span className="text-base sm:text-lg font-black">{score}m</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-amber-300 flex flex-col items-center shadow-md">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> BEST
            </span>
            <span className="text-base sm:text-lg font-black">{highScore}m</span>
          </div>

          {/* Coins */}
          <div className="px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-yellow-500/30 text-yellow-300 flex items-center gap-1.5 shadow-md">
            <span className="text-sm">🪙</span>
            <span className="text-xs sm:text-sm font-black">{coins}</span>
          </div>
        </div>

        {/* Right: Character Garage & Restart & Sound */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Character Garage Button */}
          <button
            onClick={() => {
              sound.playClick();
              setGameState(gameState === 'garage' ? 'playing' : 'garage');
            }}
            className={`p-2 rounded-2xl border transition-all cursor-pointer ${
              gameState === 'garage'
                ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/40'
                : 'bg-slate-900/90 border-slate-700 text-purple-300 hover:text-white'
            }`}
            title="Character Garage"
          >
            <Bot className="w-4 h-4" />
          </button>

          {/* Restart */}
          <button
            onClick={startGame}
            className="p-2 rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer"
            title="Restart Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const isM = sound.toggleMute();
              setMuted(isM);
            }}
            className="p-2 rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {/* 2. ACTIVE POWERUPS HUD (Shield & Magnet Timer) */}
      <div className="w-full flex items-center justify-between px-2 py-1 z-20">
        <div className="flex items-center gap-2">
          {hasShield && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-950/80 border border-blue-400 text-blue-200 text-xs font-black animate-pulse shadow-md shadow-blue-500/40">
              <Shield className="w-3.5 h-3.5" /> SHIELD ACTIVE
            </div>
          )}
          {magnetTimer > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-pink-950/80 border border-pink-400 text-pink-200 text-xs font-black animate-pulse shadow-md shadow-pink-500/40">
              <Magnet className="w-3.5 h-3.5" /> MAGNET ({magnetTimer}s)
            </div>
          )}
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          W/A/S/D or ARROWS TO HOP
        </div>
      </div>

      {/* 3. MAIN GAMEPLAY CANVAS */}
      <div className="relative w-full flex-1 aspect-[540/740] sm:aspect-[4/3] max-h-[74vh] sm:max-h-[82vh] rounded-2xl overflow-hidden border-2 border-slate-800 shadow-inner z-10 touch-none">
        <canvas
          ref={canvasRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            if (gameState === 'playing') movePlayer(0, 1);
          }}
          className="w-full h-full block cursor-pointer touch-none"
        />

        {/* 4. CHARACTER GARAGE MODAL */}
        {gameState === 'garage' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-2xl flex flex-col justify-between p-5 text-center z-30 animate-fade-in">
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Bot className="w-6 h-6 text-purple-400" />
                <h3 className="text-2xl font-black text-white tracking-wider">
                  CYBER AVATAR GARAGE
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-bold">
                Unlock and equip futuristic crosser heroes with custom trail glows!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3 max-h-[260px] overflow-y-auto px-1">
              {CHARACTERS.map((char) => {
                const isUnlocked = unlockedChars.includes(char.id);
                const isEquipped = selectedChar === char.id;

                return (
                  <div
                    key={char.id}
                    onClick={() => buyCharacter(char)}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      isEquipped
                        ? 'bg-slate-900 border-purple-500 shadow-lg shadow-purple-500/30'
                        : isUnlocked
                        ? 'bg-slate-900/70 border-slate-700 hover:border-slate-500'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-md"
                        style={{
                          backgroundColor: '#0f172a',
                          border: `2px solid ${char.color}`,
                          boxShadow: `0 0 10px ${char.glow}`,
                        }}
                      >
                        {char.emoji}
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-black text-white block">
                          {char.name}
                        </span>
                        <span
                          className="text-[10px] font-bold block"
                          style={{ color: char.color }}
                        >
                          {isEquipped ? 'EQUIPPED' : isUnlocked ? 'UNLOCKED' : `🪙 ${char.price} COINS`}
                        </span>
                      </div>
                    </div>

                    <button
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        isEquipped
                          ? 'bg-purple-600 text-white shadow-md'
                          : isUnlocked
                          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                          : coins >= char.price
                          ? 'bg-amber-500 text-slate-950 font-black hover:bg-amber-400'
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {isEquipped ? 'EQUIPPED' : isUnlocked ? 'SELECT' : 'BUY'}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setGameState('playing');
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs tracking-wider shadow-lg active:scale-95 cursor-pointer"
            >
              RETURN TO HIGHWAY
            </button>
          </div>
        )}

        {/* 5. GAME OVER MODAL */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-700 flex items-center justify-center shadow-2xl shadow-rose-500/40 border border-rose-400 mb-2">
              <RotateCcw className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-3xl font-black text-white">CRASHED!</h2>
            <p className="text-xs text-rose-300 font-bold uppercase tracking-widest mt-0.5">
              {playerRef.current.deathReason === 'drown'
                ? 'DROWNED IN PLASMA RIVER'
                : playerRef.current.deathReason === 'drone'
                ? 'ZAPPED BY HUNTER DRONE'
                : 'HIT BY SPEEDING TRAFFIC'}
            </p>

            <div className="flex gap-4 my-4">
              <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block font-bold">DISTANCE</span>
                <span className="text-xl font-black text-cyan-400">{score}m</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block font-bold">RECORD</span>
                <span className="text-xl font-black text-amber-400">{highScore}m</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs tracking-wide shadow-lg active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>TRY AGAIN</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. ON-SCREEN D-PAD CONTROLLER (FOR MOBILE / TOUCH / QUICK CLICK) */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between mt-3 px-2 gap-2">
        <div className="text-slate-400 text-xs font-bold text-center sm:text-left">
          Swipe or tap canvas to hop • Dodge hovercars & hyperloop trains!
        </div>

        {/* D-Pad Buttons */}
        <div className="flex items-center gap-2 touch-none select-none">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              movePlayer(-1, 0);
            }}
            className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
            title="Hop Left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex flex-col gap-2">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                movePlayer(0, 1);
              }}
              className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500 text-cyan-300 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
              title="Hop Forward"
            >
              <ChevronUp className="w-7 h-7" />
            </button>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                movePlayer(0, -1);
              }}
              className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
              title="Hop Back"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              movePlayer(1, 0);
            }}
            className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
            title="Hop Right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};
