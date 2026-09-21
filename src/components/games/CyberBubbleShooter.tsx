import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Trophy,
  Sparkles,
  Zap,
  Flame,
  Crown,
  Play,
  RotateCcw,
  Palette,
  Crosshair,
  RefreshCw,
  Bomb,
  Layers,
  CircleDot
} from 'lucide-react';
import { sound } from '../../utils/audio';

// --- TYPES & CONSTANTS ---
export type BubbleColor = 'cyan' | 'rose' | 'amber' | 'emerald' | 'purple' | 'blue' | 'bomb' | 'rainbow';

interface BubbleDef {
  color: BubbleColor;
  name: string;
  fill: string;
  glow: string;
  inner: string;
  icon?: string;
}

const BUBBLE_THEMES: Record<BubbleColor, BubbleDef> = {
  cyan: {
    color: 'cyan',
    name: 'Quantum Cyan',
    fill: '#06b6d4',
    glow: '#00f0ff',
    inner: '#cffafe',
  },
  rose: {
    color: 'rose',
    name: 'Plasma Rose',
    fill: '#f43f5e',
    glow: '#fb7185',
    inner: '#ffe4e6',
  },
  amber: {
    color: 'amber',
    name: 'Solar Amber',
    fill: '#f59e0b',
    glow: '#fcd34d',
    inner: '#fef3c7',
  },
  emerald: {
    color: 'emerald',
    name: 'Matrix Emerald',
    fill: '#10b981',
    glow: '#34d399',
    inner: '#d1fae5',
  },
  purple: {
    color: 'purple',
    name: 'Void Purple',
    fill: '#a855f7',
    glow: '#c084fc',
    inner: '#f3e8ff',
  },
  blue: {
    color: 'blue',
    name: 'Hyper Blue',
    fill: '#3b82f6',
    glow: '#60a5fa',
    inner: '#dbeafe',
  },
  bomb: {
    color: 'bomb',
    name: 'Plasma Bomb',
    fill: '#ef4444',
    glow: '#f87171',
    inner: '#ffffff',
    icon: '💣',
  },
  rainbow: {
    color: 'rainbow',
    name: 'Prism Rainbow',
    fill: '#ec4899',
    glow: '#ffffff',
    inner: '#ffffff',
    icon: '🌈',
  },
};

const STANDARD_COLORS: BubbleColor[] = ['cyan', 'rose', 'amber', 'emerald', 'purple', 'blue'];

const GRID_COLS = 11;
const GRID_ROWS = 14;
const BUBBLE_RADIUS = 18;
const ROW_HEIGHT = BUBBLE_RADIUS * Math.sqrt(3); // ~31.17px

interface GridBubble {
  color: BubbleColor;
  row: number;
  col: number;
  x: number;
  y: number;
  scale: number;
  alpha: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
  radius: number;
}

interface FallingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
  radius: number;
  alpha: number;
  rotation: number;
  vRot: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

interface FloatingScore {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
}

export const CyberBubbleShooter: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Helper for coordinates
  const getBubbleCoords = (row: number, col: number) => {
    const isOdd = row % 2 === 1;
    const startX = 425 - (GRID_COLS * BUBBLE_RADIUS * 2) / 2 + BUBBLE_RADIUS;
    const x = startX + col * (BUBBLE_RADIUS * 2) + (isOdd ? BUBBLE_RADIUS : 0);
    const y = 35 + row * ROW_HEIGHT;
    return { x, y };
  };

  // Helper to create an initial blank/level-1 grid for immediate safe ref creation
  const createInitialGrid = () => {
    const grid: (GridBubble | null)[][] = [];
    const availableColors = STANDARD_COLORS.slice(0, 3);
    for (let r = 0; r < GRID_ROWS; r++) {
      grid[r] = [];
      const cols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
      for (let c = 0; c < cols; c++) {
        if (r < 5) {
          const color = availableColors[Math.floor(Math.random() * availableColors.length)];
          const { x, y } = getBubbleCoords(r, c);
          grid[r][c] = {
            color,
            row: r,
            col: c,
            x,
            y,
            scale: 1,
            alpha: 1,
          };
        } else {
          grid[r][c] = null;
        }
      }
    }
    return grid;
  };

  // Game React States
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'victory'>('start');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_bubble_highscore') || '0', 10);
  });
  const [level, setLevel] = useState<number>(1);
  const [currentBubble, setCurrentBubble] = useState<BubbleColor>('cyan');
  const [nextBubble, setNextBubble] = useState<BubbleColor>('rose');
  const [missesUntilDrop, setMissesUntilDrop] = useState<number>(5);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());
  const [combo, setCombo] = useState<number>(0);

  // Engine Refs
  const engineRef = useRef({
    grid: createInitialGrid(),
    projectile: null as Projectile | null,
    fallingBubbles: [] as FallingBubble[],
    particles: [] as Particle[],
    floatingScores: [] as FloatingScore[],
    aimAngle: -Math.PI / 2, // Upwards
    shooterX: 425,
    shooterY: 505,
    screenShake: 0,
    animationFrameId: 0,
    nextScoreId: 1,
    ceilingDropOffset: 0,
    shotsFired: 0,
    isAiming: false,
  });

  // Sound Toggle
  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Add floating score text
  const addScoreText = (text: string, color: string, x: number, y: number) => {
    const eng = engineRef.current;
    eng.floatingScores.push({
      id: eng.nextScoreId++,
      x,
      y,
      text,
      color,
      alpha: 1,
    });
  };

  // Pick random active color from grid or standard colors
  const getRandomActiveColor = useCallback((): BubbleColor => {
    const eng = engineRef.current;
    const activeColors = new Set<BubbleColor>();

    for (let r = 0; r < eng.grid.length; r++) {
      for (let c = 0; c < (eng.grid[r]?.length || 0); c++) {
        const b = eng.grid[r][c];
        if (b && b.color !== 'bomb' && b.color !== 'rainbow') {
          activeColors.add(b.color);
        }
      }
    }

    if (activeColors.size > 0) {
      const arr = Array.from(activeColors);
      // 5% chance of special Bomb or Rainbow
      if (Math.random() < 0.04) return 'bomb';
      if (Math.random() < 0.04) return 'rainbow';
      return arr[Math.floor(Math.random() * arr.length)];
    }

    return STANDARD_COLORS[Math.floor(Math.random() * STANDARD_COLORS.length)];
  }, []);

  // Initialize Level Grid
  const generateLevelGrid = useCallback((lvl: number) => {
    const rows = Math.min(8, 4 + lvl);
    const grid: (GridBubble | null)[][] = [];

    const availableColors = STANDARD_COLORS.slice(0, Math.min(6, 3 + Math.floor(lvl / 2)));

    for (let r = 0; r < GRID_ROWS; r++) {
      grid[r] = [];
      const cols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
      for (let c = 0; c < cols; c++) {
        if (r < rows) {
          // Patterns based on level
          let color: BubbleColor;
          if (lvl % 2 === 0 && (r + c) % 4 === 0 && Math.random() < 0.2) {
            color = 'bomb';
          } else {
            color = availableColors[Math.floor(Math.random() * availableColors.length)];
          }

          const { x, y } = getBubbleCoords(r, c);
          grid[r][c] = {
            color,
            row: r,
            col: c,
            x,
            y,
            scale: 1,
            alpha: 1,
          };
        } else {
          grid[r][c] = null;
        }
      }
    }

    return grid;
  }, []);

  // Initialize or Restart Game
  const initGame = useCallback(
    (targetLvl: number = 1) => {
      const eng = engineRef.current;
      eng.grid = generateLevelGrid(targetLvl);
      eng.projectile = null;
      eng.fallingBubbles = [];
      eng.particles = [];
      eng.floatingScores = [];
      eng.aimAngle = -Math.PI / 2;
      eng.screenShake = 0;
      eng.ceilingDropOffset = 0;
      eng.shotsFired = 0;

      setLevel(targetLvl);
      setMissesUntilDrop(5);
      setCombo(0);

      const c1 = STANDARD_COLORS[Math.floor(Math.random() * 4)];
      const c2 = STANDARD_COLORS[Math.floor(Math.random() * 4)];
      setCurrentBubble(c1);
      setNextBubble(c2);
    },
    [generateLevelGrid]
  );

  const handleStartGame = () => {
    setScore(0);
    initGame(1);
    setGameState('playing');
    sound.playPowerup();
  };

  const handleRestart = () => {
    handleStartGame();
  };

  // Swap current & next bubble
  const handleSwapBubbles = () => {
    if (gameState !== 'playing' || engineRef.current.projectile) return;
    const temp = currentBubble;
    setCurrentBubble(nextBubble);
    setNextBubble(temp);
    sound.playClick();
  };

  // Helper: Find neighbors of a grid slot
  const getNeighbors = (r: number, c: number) => {
    const isOdd = r % 2 === 1;
    const neighbors: { r: number; c: number }[] = [];

    // Left & Right
    neighbors.push({ r, c: c - 1 });
    neighbors.push({ r, c: c + 1 });

    // Top-Left & Top-Right
    if (isOdd) {
      neighbors.push({ r: r - 1, c });
      neighbors.push({ r: r - 1, c: c + 1 });
      neighbors.push({ r: r + 1, c });
      neighbors.push({ r: r + 1, c: c + 1 });
    } else {
      neighbors.push({ r: r - 1, c: c - 1 });
      neighbors.push({ r: r - 1, c });
      neighbors.push({ r: r + 1, c: c - 1 });
      neighbors.push({ r: r + 1, c });
    }

    return neighbors.filter((n) => {
      if (n.r < 0 || n.r >= GRID_ROWS) return false;
      const cols = n.r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
      return n.c >= 0 && n.c < cols;
    });
  };

  // Drop Orphaned (Disconnected) Bubbles
  const dropFloatingOrphans = () => {
    const eng = engineRef.current;
    const visited = new Set<string>();
    const queue: { r: number; c: number }[] = [];

    // 1. Mark all bubbles connected to top ceiling (row 0)
    for (let c = 0; c < GRID_COLS; c++) {
      if (eng.grid[0]?.[c]) {
        queue.push({ r: 0, c });
        visited.add(`0,${c}`);
      }
    }

    // BFS traverse all anchored bubbles
    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = getNeighbors(current.r, current.c);

      for (const n of neighbors) {
        const key = `${n.r},${n.c}`;
        if (!visited.has(key) && eng.grid[n.r]?.[n.c]) {
          visited.add(key);
          queue.push(n);
        }
      }
    }

    // 2. Any bubble not visited is detached -> Drop it!
    let droppedCount = 0;
    for (let r = 0; r < GRID_ROWS; r++) {
      const cols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
      for (let c = 0; c < cols; c++) {
        const b = eng.grid[r]?.[c];
        if (b && !visited.has(`${r},${c}`)) {
          eng.grid[r][c] = null;
          droppedCount++;

          eng.fallingBubbles.push({
            x: b.x,
            y: b.y,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * -3 - 1,
            color: b.color,
            radius: BUBBLE_RADIUS,
            alpha: 1,
            rotation: 0,
            vRot: (Math.random() - 0.5) * 0.1,
          });
        }
      }
    }

    if (droppedCount > 0) {
      sound.playBubbleDrop();
      const bonus = droppedCount * 150;
      setScore((prev) => {
        const next = prev + bonus;
        if (next > highScore) {
          setHighScore(next);
          localStorage.setItem('cyber_bubble_highscore', next.toString());
        }
        return next;
      });
      addScoreText(`+${bonus} CLUSTER DROP! 💥`, '#f59e0b', 425, 250);
    }
  };

  // Check Match-3 Flood Fill and Pop
  const processBubbleCollision = (snappedRow: number, snappedCol: number, color: BubbleColor) => {
    const eng = engineRef.current;
    const spec = BUBBLE_THEMES[color];

    // Bomb Special
    if (color === 'bomb') {
      sound.playBombExplode();
      eng.screenShake = 18;

      // Pop all bubbles in 2-cell radius
      const toPop: { r: number; c: number }[] = [];
      for (let r = Math.max(0, snappedRow - 2); r <= Math.min(GRID_ROWS - 1, snappedRow + 2); r++) {
        const cols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
        for (let c = Math.max(0, snappedCol - 2); c <= Math.min(cols - 1, snappedCol + 2); c++) {
          if (eng.grid[r][c]) {
            toPop.push({ r, c });
          }
        }
      }

      toPop.forEach((p) => {
        const b = eng.grid[p.r][p.c];
        if (b) {
          eng.grid[p.r][p.c] = null;
          // Spawn burst particles
          for (let i = 0; i < 6; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = Math.random() * 5 + 2;
            eng.particles.push({
              x: b.x,
              y: b.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              color: '#ef4444',
              size: Math.random() * 4 + 2,
              alpha: 1,
              decay: 0.04,
            });
          }
        }
      });

      const bombPoints = toPop.length * 100;
      setScore((prev) => prev + bombPoints);
      addScoreText(`+${bombPoints} BOMB DEMOLITION! 💣`, '#ef4444', 425, 220);

      dropFloatingOrphans();
      return true;
    }

    // Standard Color Match Check (BFS)
    const matchingCluster: { r: number; c: number }[] = [];
    const queue: { r: number; c: number }[] = [{ r: snappedRow, c: snappedCol }];
    const visited = new Set<string>();
    visited.add(`${snappedRow},${snappedCol}`);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      matchingCluster.push(curr);

      const neighbors = getNeighbors(curr.r, curr.c);
      for (const n of neighbors) {
        const key = `${n.r},${n.c}`;
        const neighborBubble = eng.grid[n.r][n.c];

        if (!visited.has(key) && neighborBubble) {
          if (color === 'rainbow' || neighborBubble.color === color || neighborBubble.color === 'rainbow') {
            visited.add(key);
            queue.push(n);
          }
        }
      }
    }

    // Match-3 or more found!
    if (matchingCluster.length >= 3 || color === 'rainbow') {
      sound.playBubblePop(matchingCluster.length);

      matchingCluster.forEach((pos) => {
        const b = eng.grid[pos.r][pos.c];
        if (b) {
          eng.grid[pos.r][pos.c] = null;
          // Spawn particle sparks
          for (let p = 0; p < 8; p++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = Math.random() * 6 + 2;
            eng.particles.push({
              x: b.x,
              y: b.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              color: spec.glow,
              size: Math.random() * 3 + 2,
              alpha: 1,
              decay: 0.04,
            });
          }
        }
      });

      // Combo count & scoring
      const comboStep = combo + 1;
      setCombo(comboStep);
      const points = matchingCluster.length * 50 * comboStep;

      setScore((prev) => {
        const next = prev + points;
        if (next > highScore) {
          setHighScore(next);
          localStorage.setItem('cyber_bubble_highscore', next.toString());
        }
        return next;
      });

      if (comboStep >= 2) {
        addScoreText(`${comboStep}x COMBO! (+${points})`, spec.glow, 425, 200);
      } else {
        addScoreText(`+${points}`, spec.glow, 425, 200);
      }

      dropFloatingOrphans();

      // Check if board is cleared -> Victory!
      let remainingCount = 0;
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (eng.grid[r][c]) remainingCount++;
        }
      }

      if (remainingCount === 0) {
        sound.playComboFanfare(5);
        setGameState('victory');
      }

      return true;
    } else {
      // No match -> Reset combo & decrement countdown to ceiling drop
      setCombo(0);
      setMissesUntilDrop((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          // Drop ceiling by 1 row!
          descendCeiling();
          return 5;
        }
        return next;
      });
      return false;
    }
  };

  // Descend Ceiling Logic
  const descendCeiling = () => {
    const eng = engineRef.current;
    sound.playCrash();
    eng.screenShake = 12;

    // Shift all rows down by 1
    for (let r = GRID_ROWS - 1; r > 0; r--) {
      const prevCols = (r - 1) % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
      const currCols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;

      for (let c = 0; c < currCols; c++) {
        if (c < prevCols && eng.grid[r - 1][c]) {
          const oldB = eng.grid[r - 1][c]!;
          const coords = getBubbleCoords(r, c);
          eng.grid[r][c] = {
            ...oldB,
            row: r,
            col: c,
            x: coords.x,
            y: coords.y,
          };
        } else {
          eng.grid[r][c] = null;
        }
      }
    }

    // Fill top row with new random bubbles
    const available = STANDARD_COLORS.slice(0, 4);
    for (let c = 0; c < GRID_COLS; c++) {
      const color = available[Math.floor(Math.random() * available.length)];
      const coords = getBubbleCoords(0, c);
      eng.grid[0][c] = {
        color,
        row: 0,
        col: c,
        x: coords.x,
        y: coords.y,
        scale: 1,
        alpha: 1,
      };
    }

    // Check if any bubble crossed the bottom danger line (Row 11)
    for (let r = 11; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (eng.grid[r][c]) {
          sound.playBombExplode();
          setGameState('gameover');
          return;
        }
      }
    }
  };

  // Snap Flying Projectile to Closest Valid Hex Grid Slot
  const snapProjectileToGrid = (proj: Projectile) => {
    const eng = engineRef.current;
    let closestDist = Infinity;
    let bestRow = -1;
    let bestCol = -1;

    for (let r = 0; r < GRID_ROWS; r++) {
      const cols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
      for (let c = 0; c < cols; c++) {
        if (!eng.grid[r][c]) {
          const coords = getBubbleCoords(r, c);
          const dist = Math.hypot(proj.x - coords.x, proj.y - coords.y);

          // Must be adjacent to an existing bubble OR on top row 0
          const neighbors = getNeighbors(r, c);
          const hasNeighbor = r === 0 || neighbors.some((n) => eng.grid[n.r]?.[n.c] !== null);

          if (hasNeighbor && dist < closestDist) {
            closestDist = dist;
            bestRow = r;
            bestCol = c;
          }
        }
      }
    }

    if (bestRow !== -1 && bestCol !== -1) {
      const coords = getBubbleCoords(bestRow, bestCol);
      eng.grid[bestRow][bestCol] = {
        color: proj.color,
        row: bestRow,
        col: bestCol,
        x: coords.x,
        y: coords.y,
        scale: 1,
        alpha: 1,
      };

      // Check if snapped too low -> Game Over
      if (bestRow >= 11) {
        sound.playBombExplode();
        setGameState('gameover');
        return;
      }

      processBubbleCollision(bestRow, bestCol, proj.color);
    }

    // Ready next shots
    eng.projectile = null;
    setCurrentBubble(nextBubble);
    setNextBubble(getRandomActiveColor());
  };

  // Shoot Loaded Bubble
  const shootBubble = () => {
    if (gameState !== 'playing' || engineRef.current.projectile) return;

    const eng = engineRef.current;
    const speed = 15;
    const vx = Math.cos(eng.aimAngle) * speed;
    const vy = Math.sin(eng.aimAngle) * speed;

    eng.projectile = {
      x: eng.shooterX,
      y: eng.shooterY,
      vx,
      vy,
      color: currentBubble,
      radius: BUBBLE_RADIUS,
    };

    sound.playBubbleShoot();
  };

  // Aiming Pointer and Touch Handlers (Touch Drag-to-Aim, Release-to-Shoot)
  const updateAimCoords = (clientX: number, clientY: number, currentTarget: HTMLElement) => {
    const rect = currentTarget.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 850;
    const y = ((clientY - rect.top) / rect.height) * 540;

    const eng = engineRef.current;
    const dx = x - eng.shooterX;
    const dy = y - eng.shooterY;
    let angle = Math.atan2(dy, dx);

    // Limit aim angle between -170 deg and -10 deg so it can only shoot upwards
    angle = Math.max(-Math.PI * 0.95, Math.min(-Math.PI * 0.05, angle));
    eng.aimAngle = angle;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updateAimCoords(e.clientX, e.clientY, e.currentTarget);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    updateAimCoords(e.clientX, e.clientY, e.currentTarget);
    engineRef.current.isAiming = true;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState === 'playing' && engineRef.current.isAiming) {
      updateAimCoords(e.clientX, e.clientY, e.currentTarget);
      shootBubble();
    }
    engineRef.current.isAiming = false;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyC' || e.code === 'KeyS') {
        handleSwapBubbles();
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'playing') {
          shootBubble();
        } else if (gameState === 'start' || gameState === 'gameover' || gameState === 'victory') {
          handleStartGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, currentBubble, nextBubble]);

  // --- MAIN RENDER & PHYSICS LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const eng = engineRef.current;

    const tick = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      const minX = 425 - (GRID_COLS * BUBBLE_RADIUS * 2) / 2 + BUBBLE_RADIUS;
      const maxX = 425 + (GRID_COLS * BUBBLE_RADIUS * 2) / 2 - BUBBLE_RADIUS;

      // 1. UPDATE FLYING PROJECTILE
      if (eng.projectile) {
        const p = eng.projectile;
        p.x += p.vx;
        p.y += p.vy;

        // Wall Bouncing
        if (p.x - p.radius <= minX) {
          p.x = minX + p.radius;
          p.vx = -p.vx;
          sound.playLaser();
        } else if (p.x + p.radius >= maxX) {
          p.x = maxX - p.radius;
          p.vx = -p.vx;
          sound.playLaser();
        }

        // Ceiling collision (Top row)
        if (p.y - p.radius <= 35) {
          p.y = 35 + p.radius;
          snapProjectileToGrid(p);
        } else {
          // Collision check with any existing grid bubble
          let collided = false;
          for (let r = 0; r < GRID_ROWS; r++) {
            const cols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
            for (let c = 0; c < cols; c++) {
              const gb = eng.grid[r][c];
              if (gb) {
                const dist = Math.hypot(p.x - gb.x, p.y - gb.y);
                if (dist <= BUBBLE_RADIUS * 1.85) {
                  collided = true;
                  snapProjectileToGrid(p);
                  break;
                }
              }
            }
            if (collided) break;
          }
        }
      }

      // 2. UPDATE FALLING ORPHAN BUBBLES
      for (let i = eng.fallingBubbles.length - 1; i >= 0; i--) {
        const fb = eng.fallingBubbles[i];
        fb.x += fb.vx;
        fb.y += fb.vy;
        fb.vy += 0.45;
        fb.rotation += fb.vRot;
        fb.alpha -= 0.012;

        if (fb.y > height + 50 || fb.alpha <= 0) {
          eng.fallingBubbles.splice(i, 1);
        }
      }

      // 3. UPDATE PARTICLES
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const pt = eng.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.15;
        pt.alpha -= pt.decay;
        if (pt.alpha <= 0) eng.particles.splice(i, 1);
      }

      // 4. UPDATE FLOATING TEXTS
      for (let i = eng.floatingScores.length - 1; i >= 0; i--) {
        const fs = eng.floatingScores[i];
        fs.y -= 1.3;
        fs.alpha -= 0.02;
        if (fs.alpha <= 0) eng.floatingScores.splice(i, 1);
      }

      // Screen Shake damping
      if (eng.screenShake > 0) {
        eng.screenShake *= 0.88;
        if (eng.screenShake < 0.2) eng.screenShake = 0;
      }

      // ==========================================
      // 5. RENDER GRAPHICS
      // ==========================================
      ctx.save();

      // Screen shake translation
      if (eng.screenShake > 0) {
        const sx = (Math.random() - 0.5) * eng.screenShake;
        const sy = (Math.random() - 0.5) * eng.screenShake;
        ctx.translate(sx, sy);
      }

      // Dark Cyberpunk Arena Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.6, '#080d21');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Cyber Hex Grid Background Pattern
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      for (let x = minX - 10; x <= maxX + 10; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Arena Boundaries Side Rails
      ctx.strokeStyle = '#38bdf844';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(minX - BUBBLE_RADIUS, 0);
      ctx.lineTo(minX - BUBBLE_RADIUS, height);
      ctx.moveTo(maxX + BUBBLE_RADIUS, 0);
      ctx.lineTo(maxX + BUBBLE_RADIUS, height);
      ctx.stroke();

      // Danger Bottom Laser Line (Row 11)
      const dangerY = 35 + 11 * ROW_HEIGHT;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(minX - BUBBLE_RADIUS, dangerY);
      ctx.lineTo(maxX + BUBBLE_RADIUS, dangerY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText('⚠ CRITICAL DANGER BOUNDARY ⚠', 425 - 90, dangerY - 6);

      // Trajectory Aiming Laser Guide
      if (gameState === 'playing' && !eng.projectile) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        let rayX = eng.shooterX;
        let rayY = eng.shooterY;
        let rvx = Math.cos(eng.aimAngle) * 12;
        let rvy = Math.sin(eng.aimAngle) * 12;

        ctx.beginPath();
        ctx.moveTo(rayX, rayY);

        for (let step = 0; step < 50; step++) {
          rayX += rvx;
          rayY += rvy;

          // Wall bounce preview
          if (rayX - BUBBLE_RADIUS <= minX) {
            rayX = minX + BUBBLE_RADIUS;
            rvx = -rvx;
            ctx.lineTo(rayX, rayY);
          } else if (rayX + BUBBLE_RADIUS >= maxX) {
            rayX = maxX - BUBBLE_RADIUS;
            rvx = -rvx;
            ctx.lineTo(rayX, rayY);
          }

          if (rayY <= 40) break;
        }

        ctx.lineTo(rayX, rayY);
        ctx.stroke();
        ctx.restore();
      }

      // Render Helper Function for Bubble Sphere
      const drawBubbleSphere = (bx: number, by: number, color: BubbleColor, radius: number = BUBBLE_RADIUS) => {
        const spec = BUBBLE_THEMES[color];
        ctx.save();
        ctx.translate(bx, by);

        // Neon Glow
        ctx.shadowColor = spec.glow;
        ctx.shadowBlur = 12;

        // Outer Sphere Fill
        ctx.fillStyle = spec.fill;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // 3D Glass Sphere Specular Highlight (Inner Gradient)
        const shineGrad = ctx.createRadialGradient(-radius * 0.35, -radius * 0.35, 1, 0, 0, radius);
        shineGrad.addColorStop(0, '#ffffffaa');
        shineGrad.addColorStop(0.5, `${spec.inner}44`);
        shineGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = shineGrad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Outer Rim Ring
        ctx.strokeStyle = '#ffffff55';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Icon if special
        if (spec.icon) {
          ctx.font = '14px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(spec.icon, 0, 1);
        }

        ctx.restore();
      };

      // 6. RENDER GRID BUBBLES
      for (let r = 0; r < GRID_ROWS; r++) {
        const cols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
        for (let c = 0; c < cols; c++) {
          const gb = eng.grid[r]?.[c];
          if (gb) {
            drawBubbleSphere(gb.x, gb.y, gb.color);
          }
        }
      }

      // 7. RENDER FLYING PROJECTILE
      if (eng.projectile) {
        drawBubbleSphere(eng.projectile.x, eng.projectile.y, eng.projectile.color);
      }

      // 8. RENDER FALLING ORPHAN BUBBLES
      eng.fallingBubbles.forEach((fb) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, fb.alpha);
        drawBubbleSphere(fb.x, fb.y, fb.color, fb.radius);
        ctx.restore();
      });

      // 9. RENDER PARTICLES
      eng.particles.forEach((pt) => {
        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 10. RENDER CANNON SHOOTER BASE
      ctx.save();
      ctx.translate(eng.shooterX, eng.shooterY);

      // Cannon Turret Barrel
      ctx.rotate(eng.aimAngle + Math.PI / 2);
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fillRect(-12, -35, 24, 30);
      ctx.strokeRect(-12, -35, 24, 30);

      // Barrel Tip Light
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-10, -36, 20, 4);

      ctx.restore();

      // Cannon Turret Base Platform
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(eng.shooterX, eng.shooterY, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Render Current Loaded Bubble on Cannon
      if (gameState === 'playing' && !eng.projectile) {
        drawBubbleSphere(eng.shooterX, eng.shooterY, currentBubble);
      }

      // Render Next Bubble Queued
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(eng.shooterX - 70, eng.shooterY + 6, 20, 0, Math.PI * 2);
      ctx.fill();
      drawBubbleSphere(eng.shooterX - 70, eng.shooterY + 6, nextBubble, 14);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT', eng.shooterX - 70, eng.shooterY + 30);

      // Swap Button Icon
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText('⇄', eng.shooterX - 42, eng.shooterY + 8);

      // 11. RENDER FLOATING TEXTS
      eng.floatingScores.forEach((fs) => {
        ctx.save();
        ctx.font = '900 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = fs.color;
        ctx.globalAlpha = Math.max(0, fs.alpha);
        ctx.shadowColor = fs.color;
        ctx.shadowBlur = 14;
        ctx.fillText(fs.text, fs.x, fs.y);
        ctx.restore();
      });

      ctx.restore();

      eng.animationFrameId = requestAnimationFrame(tick);
    };

    eng.animationFrameId = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      cancelAnimationFrame(eng.animationFrameId);
    };
  }, [gameState, currentBubble, nextBubble, combo, highScore]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center select-none">
      {/* Container */}
      <div className="relative w-full bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Top HUD */}
        <div className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
          {/* Score & Level */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/80 border border-cyan-500/30 rounded-xl text-cyan-400 font-black text-sm">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>SCORE: {score}</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300 font-bold text-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>RECORD: {highScore}</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 font-bold text-xs rounded-xl">
              <span>LVL {level}</span>
            </div>
          </div>

          {/* Ceiling Warning & Controls */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold">
              <span>DROPS IN:</span>
              <span className="text-amber-400 font-bold">{missesUntilDrop}</span>
            </div>

            <button
              onClick={handleSwapBubbles}
              className="p-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-xl transition flex items-center gap-1 text-xs font-bold px-2.5"
              title="Swap Next Bubble (Key: C / S)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SWAP</span>
            </button>

            <button
              onClick={toggleSound}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div
          className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[560px] flex items-center justify-center cursor-crosshair touch-none"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <canvas
            ref={canvasRef}
            width={850}
            height={540}
            className="w-full h-full object-cover"
          />

          {/* Start Screen Overlay */}
          {gameState === 'start' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/30 mb-4 animate-bounce">
                <CircleDot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
                CYBER BUBBLE <span className="text-cyan-400">SHOOTER</span>
              </h2>
              <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
                Aim with precise laser guides to match 3 or more plasma orbs! Trigger explosive cluster drops, deploy Plasma Bombs, and clear the matrix before the ceiling descends!
              </p>

              <button
                onClick={handleStartGame}
                className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>START POPPING</span>
              </button>

              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-6 mt-4 sm:mt-8 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-slate-800 rounded border border-slate-700">AIM & CLICK</span>
                  <span>Shoot Orb</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-slate-800 rounded border border-slate-700">C / SWAP</span>
                  <span>Switch Bubble</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-cyan-950 text-cyan-300 rounded border border-cyan-800">MATCH 3+</span>
                  <span>Cluster Drops</span>
                </div>
              </div>
            </div>
          )}

          {/* Victory Overlay */}
          {gameState === 'victory' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3">
                <Crown className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black text-emerald-400 tracking-wide mb-1">MATRIX CLEARED!</h3>
              <p className="text-xs text-slate-400 mb-4">Incredible precision! All plasma bubbles eradicated.</p>

              <button
                onClick={() => {
                  initGame(level + 1);
                  setGameState('playing');
                  sound.playPowerup();
                }}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>NEXT LEVEL {level + 1}</span>
              </button>
            </div>
          )}

          {/* Game Over Screen */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-3">
                <span className="text-3xl">💥</span>
              </div>
              <h3 className="text-2xl font-black text-rose-400 tracking-wide mb-1">ARENA BREACHED!</h3>
              <p className="text-xs text-slate-400 mb-4">Plasma orbs crossed the critical bottom boundary</p>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-72 mb-6 flex justify-around">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Final Score</div>
                  <div className="text-xl font-black text-white">{score}</div>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Best Record</div>
                  <div className="text-xl font-black text-amber-400">{highScore}</div>
                </div>
              </div>

              <button
                onClick={handleRestart}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>POP AGAIN</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
