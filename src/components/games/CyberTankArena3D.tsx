import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Play, 
  Crosshair, Award, Flame, Star, CheckCircle, ArrowRight, Flag,
  Radio, Target, AlertTriangle, RefreshCw, ChevronRight, Heart
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// TYPES & DATA STRUCTURES
// ----------------------------------------------------

export interface TankModel {
  id: string;
  name: string;
  nameGuj: string;
  price: number;
  unlocked: boolean;
  color: string;
  glowColor: string;
  turretColor: string;
  maxHp: number;
  speed: number;
  damage: number;
  fireRate: number;      // Shots per second
  bulletSpeed: number;
  specialWeapon: 'tri-shot' | 'homing-missile' | 'railgun' | 'plasma-mortar' | 'golden-barrage';
  previewEmoji: string;
  description: string;
}

export interface ArenaStage {
  id: number;
  name: string;
  nameGuj: string;
  theme: 'neon-grid' | 'cyber-docks' | 'magma-foundry' | 'orbital-deck' | 'matrix-core';
  targetKills: number;
  waves: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme' | 'Insane';
  color: string;
  accentColor: string;
}

interface Point2D {
  x: number;
  y: number;
}

interface WallObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  destructible?: boolean;
  hp?: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  bouncesLeft: number;
  isEnemy: boolean;
  color: string;
  homing?: boolean;
}

interface EnemyTank {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  turretAngle: number;
  hp: number;
  maxHp: number;
  type: 'drone' | 'scout' | 'heavy' | 'sniper' | 'boss';
  color: string;
  fireCooldown: number;
  fireRate: number;
  speed: number;
  size: number;
}

interface PowerupItem {
  id: number;
  x: number;
  y: number;
  type: 'shield' | 'tri-shot' | 'health' | 'nuke' | 'coin';
  radius: number;
  duration: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  shape?: 'circle' | 'spark' | 'smoke' | 'ring';
}

const DEFAULT_TANKS: TankModel[] = [
  {
    id: 'apex-scout',
    name: 'Apex Scout MK-1',
    nameGuj: 'એપેક્સ સ્કાઉટ MK-1',
    price: 0,
    unlocked: true,
    color: '#06b6d4',
    glowColor: '#22d3ee',
    turretColor: '#00f0ff',
    maxHp: 100,
    speed: 160,
    damage: 35,
    fireRate: 3.0,
    bulletSpeed: 420,
    specialWeapon: 'tri-shot',
    previewEmoji: '🛡️',
    description: 'Agile hover-tank with fast rapid-fire dual plasma blasters and high maneuverability.',
  },
  {
    id: 'plasma-titan',
    name: 'Plasma Titan V2',
    nameGuj: 'પ્લાઝમા ટાઇટન V2',
    price: 450,
    unlocked: false,
    color: '#10b981',
    glowColor: '#34d399',
    turretColor: '#6ee7b7',
    maxHp: 150,
    speed: 140,
    damage: 55,
    fireRate: 2.5,
    bulletSpeed: 390,
    specialWeapon: 'plasma-mortar',
    previewEmoji: '🟢',
    description: 'Armored combat titan firing heavy-yield ricochet shells that shatter enemy armor.',
  },
  {
    id: 'railgun-striker',
    name: 'Railgun Striker 900',
    nameGuj: 'રેલગન સ્ટ્રાઈકર 900',
    price: 1100,
    unlocked: false,
    color: '#f97316',
    glowColor: '#fb923c',
    turretColor: '#fed7aa',
    maxHp: 120,
    speed: 150,
    damage: 85,
    fireRate: 2.0,
    bulletSpeed: 580,
    specialWeapon: 'railgun',
    previewEmoji: '⚡',
    description: 'Hyper-velocity railgun sniper tank capable of piercing multiple obstacles and enemies.',
  },
  {
    id: 'phantom-mirage',
    name: 'Phantom Mirage X',
    nameGuj: 'ફેન્ટમ મિરાજ X',
    price: 2100,
    unlocked: false,
    color: '#a855f7',
    glowColor: '#c084fc',
    turretColor: '#ec4899',
    maxHp: 140,
    speed: 175,
    damage: 60,
    fireRate: 3.5,
    bulletSpeed: 460,
    specialWeapon: 'homing-missile',
    previewEmoji: '🟣',
    description: 'Stealth combat tank equipped with smart-lock homing micro-missiles and forcefield shields.',
  },
  {
    id: 'solaris-dreadnought',
    name: 'Solaris Dreadnought 24K',
    nameGuj: 'સોલારિસ ડ્રેડનોટ 24K ગોલ્ડ',
    price: 4500,
    unlocked: false,
    color: '#d97706',
    glowColor: '#fbbf24',
    turretColor: '#ffffff',
    maxHp: 200,
    speed: 180,
    damage: 100,
    fireRate: 4.5,
    bulletSpeed: 520,
    specialWeapon: 'golden-barrage',
    previewEmoji: '👑',
    description: 'Pure 24K gold flagship battle tank with quad-plasma cannons and devastating cluster barrages!',
  },
];

const ARENA_STAGES: ArenaStage[] = [
  {
    id: 1,
    name: 'Neon Grid Sector 7',
    nameGuj: 'નિયોન ગ્રીડ સેક્ટર 7',
    theme: 'neon-grid',
    targetKills: 15,
    waves: 3,
    difficulty: 'Easy',
    color: '#06b6d4',
    accentColor: '#3b82f6',
  },
  {
    id: 2,
    name: 'Cyber Harbor Warehouse',
    nameGuj: 'સાયબર હાર્બર વેરહાઉસ',
    theme: 'cyber-docks',
    targetKills: 25,
    waves: 4,
    difficulty: 'Medium',
    color: '#f97316',
    accentColor: '#ea580c',
  },
  {
    id: 3,
    name: 'Magma Core Foundry',
    nameGuj: 'લાવા વોલ્કેનો રશ',
    theme: 'magma-foundry',
    targetKills: 35,
    waves: 5,
    difficulty: 'Hard',
    color: '#ef4444',
    accentColor: '#f59e0b',
  },
  {
    id: 4,
    name: 'Orbital Space Deck',
    nameGuj: 'ઓર્બિટલ સ્પેસ ડેક',
    theme: 'orbital-deck',
    targetKills: 45,
    waves: 5,
    difficulty: 'Extreme',
    color: '#a855f7',
    accentColor: '#ec4899',
  },
  {
    id: 5,
    name: 'Matrix Quantum Core',
    nameGuj: 'મેટ્રિક્સ ક્વોન્ટમ કોર',
    theme: 'matrix-core',
    targetKills: 60,
    waves: 6,
    difficulty: 'Insane',
    color: '#10b981',
    accentColor: '#06b6d4',
  },
];

export const CyberTankArena3D: React.FC = () => {
  // ----------------------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------------------
  const [gameState, setGameState] = useState<'menu' | 'garage' | 'playing' | 'completed' | 'gameover'>('menu');
  const [activeStageId, setActiveStageId] = useState<number>(1);

  // Persistence State
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_tank_coins') || '600', 10);
  });
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_tank_highscore') || '0', 10);
  });
  const [unlockedStages, setUnlockedStages] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('cyber_tank_stages');
      return saved ? JSON.parse(saved) : [1];
    } catch {
      return [1];
    }
  });
  const [tanks, setTanks] = useState<TankModel[]>(() => {
    const saved = localStorage.getItem('cyber_tank_tanks');
    if (saved) {
      try {
        const parsed: TankModel[] = JSON.parse(saved);
        return DEFAULT_TANKS.map((def) => {
          const found = parsed.find((p) => p.id === def.id);
          return found ? { ...def, unlocked: found.unlocked } : def;
        });
      } catch {
        return DEFAULT_TANKS;
      }
    }
    return DEFAULT_TANKS;
  });
  const [selectedTankId, setSelectedTankId] = useState<string>(() => {
    return localStorage.getItem('cyber_tank_active_tank') || 'apex-scout';
  });

  // Sound State
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // HUD & Metrics
  const [score, setScore] = useState<number>(0);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [maxHp, setMaxHp] = useState<number>(100);
  const [currentWave, setCurrentWave] = useState<number>(1);
  const [killsCount, setKillsCount] = useState<number>(0);
  const [targetKills, setTargetKills] = useState<number>(15);
  const [activePowerup, setActivePowerup] = useState<string | null>(null);
  const [stuntToast, setStuntToast] = useState<{ text: string; bonus: number; key: number } | null>(null);

  // Canvas & Loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  // Keys & Input State
  const keysRef = useRef<{
    w: boolean;
    s: boolean;
    a: boolean;
    d: boolean;
    shoot: boolean;
    aimLeft: boolean;
    aimRight: boolean;
    mouseX: number;
    mouseY: number;
  }>({
    w: false,
    s: false,
    a: false,
    d: false,
    shoot: false,
    aimLeft: false,
    aimRight: false,
    mouseX: 400,
    mouseY: 300,
  });

  // Player Tank State
  const playerRef = useRef({
    x: 450,
    y: 300,
    vx: 0,
    vy: 0,
    chassisAngle: 0,
    turretAngle: 0,
    hp: 100,
    maxHp: 100,
    fireCooldown: 0,
    shieldTimer: 0,
    triShotTimer: 0,
    screenShake: 0,
  });

  const wallsRef = useRef<WallObstacle[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<EnemyTank[]>([]);
  const powerupsRef = useRef<PowerupItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  const activeTank = tanks.find((t) => t.id === selectedTankId) || tanks[0];
  const activeStage = ARENA_STAGES.find((s) => s.id === activeStageId) || ARENA_STAGES[0];

  // ----------------------------------------------------
  // PERSISTENCE EFFECTS
  // ----------------------------------------------------
  useEffect(() => {
    localStorage.setItem('cyber_tank_coins', coins.toString());
  }, [coins]);

  useEffect(() => {
    localStorage.setItem('cyber_tank_highscore', highScore.toString());
  }, [highScore]);

  useEffect(() => {
    localStorage.setItem('cyber_tank_stages', JSON.stringify(unlockedStages));
  }, [unlockedStages]);

  useEffect(() => {
    localStorage.setItem('cyber_tank_tanks', JSON.stringify(tanks));
  }, [tanks]);

  useEffect(() => {
    localStorage.setItem('cyber_tank_active_tank', selectedTankId);
  }, [selectedTankId]);

  // ----------------------------------------------------
  // KEYBOARD & MOUSE CONTROLS
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const k = e.key.toLowerCase();
      if (e.key === 'ArrowUp' || k === 'w') keysRef.current.w = true;
      if (e.key === 'ArrowDown' || k === 's') keysRef.current.s = true;
      if (e.key === 'ArrowLeft' || k === 'a') keysRef.current.a = true;
      if (e.key === 'ArrowRight' || k === 'd') keysRef.current.d = true;
      if (e.key === ' ' || k === 'j') keysRef.current.shoot = true;
      if (k === 'q' || e.key === 'ArrowLeft') keysRef.current.aimLeft = true;
      if (e.key === 'e' || e.key === 'ArrowRight') keysRef.current.aimRight = true;
      if (k === 'r') {
        initArena(activeStageId);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === 'ArrowUp' || k === 'w') keysRef.current.w = false;
      if (e.key === 'ArrowDown' || k === 's') keysRef.current.s = false;
      if (e.key === 'ArrowLeft' || k === 'a') keysRef.current.a = false;
      if (e.key === 'ArrowRight' || k === 'd') keysRef.current.d = false;
      if (e.key === ' ' || k === 'j') keysRef.current.shoot = false;
      if (k === 'q' || e.key === 'ArrowLeft') keysRef.current.aimLeft = false;
      if (e.key === 'e' || e.key === 'ArrowRight') keysRef.current.aimRight = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      keysRef.current.mouseX = (e.clientX - rect.left) * scaleX;
      keysRef.current.mouseY = (e.clientY - rect.top) * scaleY;
    };

    const handleMouseDown = () => {
      keysRef.current.shoot = true;
    };

    const handleMouseUp = () => {
      keysRef.current.shoot = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeStageId]);

  // ----------------------------------------------------
  // PROCEDURAL ARENA GENERATOR
  // ----------------------------------------------------
  const generateArena = (stageId: number) => {
    const walls: WallObstacle[] = [];
    const width = 900;
    const height = 550;
    const wallThick = 20;

    // Outer boundary walls
    walls.push({ x: 0, y: 0, w: width, h: wallThick }); // Top
    walls.push({ x: 0, y: height - wallThick, w: width, h: wallThick }); // Bottom
    walls.push({ x: 0, y: 0, w: wallThick, h: height }); // Left
    walls.push({ x: width - wallThick, y: 0, w: wallThick, h: height }); // Right

    // Internal Tactical Obstacles
    if (stageId === 1) {
      // Sector 7: 4 corner blocks and central diamond
      walls.push({ x: 180, y: 140, w: 140, h: 25, destructible: true, hp: 100 });
      walls.push({ x: 580, y: 140, w: 140, h: 25, destructible: true, hp: 100 });
      walls.push({ x: 180, y: 380, w: 140, h: 25, destructible: true, hp: 100 });
      walls.push({ x: 580, y: 380, w: 140, h: 25, destructible: true, hp: 100 });
      walls.push({ x: 420, y: 240, w: 60, h: 60, destructible: false });
    } else if (stageId === 2) {
      // Harbor Warehouse: Container columns
      for (let c = 0; c < 3; c++) {
        walls.push({ x: 250 + c * 200, y: 100, w: 30, h: 140, destructible: true, hp: 120 });
        walls.push({ x: 250 + c * 200, y: 320, w: 30, h: 140, destructible: true, hp: 120 });
      }
    } else if (stageId === 3) {
      // Magma Foundry: Choke points & cross corridors
      walls.push({ x: 220, y: 120, w: 25, h: 300 });
      walls.push({ x: 650, y: 120, w: 25, h: 300 });
      walls.push({ x: 380, y: 160, w: 140, h: 30 });
      walls.push({ x: 380, y: 360, w: 140, h: 30 });
    } else if (stageId === 4) {
      // Orbital Deck: Symmetrical Hexagonal Pillars
      walls.push({ x: 220, y: 180, w: 80, h: 80, destructible: true, hp: 150 });
      walls.push({ x: 600, y: 180, w: 80, h: 80, destructible: true, hp: 150 });
      walls.push({ x: 220, y: 320, w: 80, h: 80, destructible: true, hp: 150 });
      walls.push({ x: 600, y: 320, w: 80, h: 80, destructible: true, hp: 150 });
      walls.push({ x: 410, y: 230, w: 80, h: 80 });
    } else {
      // Matrix Quantum Core: Complex maze labyrinth
      walls.push({ x: 160, y: 100, w: 160, h: 25 });
      walls.push({ x: 580, y: 100, w: 160, h: 25 });
      walls.push({ x: 320, y: 200, w: 260, h: 25 });
      walls.push({ x: 160, y: 420, w: 160, h: 25 });
      walls.push({ x: 580, y: 420, w: 160, h: 25 });
      walls.push({ x: 320, y: 320, w: 260, h: 25 });
    }

    wallsRef.current = walls;
  };

  // ----------------------------------------------------
  // SPAWN ENEMIES WAVE
  // ----------------------------------------------------
  const spawnWave = (waveNum: number, stageId: number) => {
    const enemyCount = 3 + waveNum * 2;
    const newEnemies: EnemyTank[] = [];
    const types: ('drone' | 'scout' | 'heavy' | 'sniper')[] = ['drone', 'scout'];
    if (waveNum >= 2 || stageId >= 2) types.push('heavy');
    if (waveNum >= 3 || stageId >= 3) types.push('sniper');

    // Spawn around arena corners away from player
    const spawnPoints = [
      { x: 100, y: 100 },
      { x: 800, y: 100 },
      { x: 100, y: 450 },
      { x: 800, y: 450 },
      { x: 450, y: 80 },
      { x: 450, y: 470 },
    ];

    for (let i = 0; i < enemyCount; i++) {
      const sp = spawnPoints[i % spawnPoints.length];
      const type = (waveNum === activeStage.waves && i === 0 && stageId >= 2) 
        ? 'boss' 
        : types[Math.floor(Math.random() * types.length)];

      let maxHp = 40;
      let speed = 90;
      let fireRate = 1.2;
      let color = '#f87171';
      let size = 20;

      if (type === 'drone') {
        maxHp = 30;
        speed = 130;
        fireRate = 1.5;
        color = '#fb923c';
        size = 16;
      } else if (type === 'heavy') {
        maxHp = 100;
        speed = 65;
        fireRate = 0.8;
        color = '#ef4444';
        size = 26;
      } else if (type === 'sniper') {
        maxHp = 50;
        speed = 80;
        fireRate = 0.6;
        color = '#c084fc';
        size = 22;
      } else if (type === 'boss') {
        maxHp = 350;
        speed = 50;
        fireRate = 2.0;
        color = '#e11d48';
        size = 38;
      }

      newEnemies.push({
        id: Math.random(),
        x: sp.x + (Math.random() - 0.5) * 60,
        y: sp.y + (Math.random() - 0.5) * 60,
        vx: 0,
        vy: 0,
        angle: 0,
        turretAngle: 0,
        hp: maxHp,
        maxHp,
        type,
        color,
        fireCooldown: Math.random() * 1.5,
        fireRate,
        speed,
        size,
      });

      // Spawn teleport effect
      particlesRef.current.push({
        x: sp.x,
        y: sp.y,
        vx: 0,
        vy: 0,
        size: 30,
        color: '#f43f5e',
        alpha: 1,
        decay: 0.05,
        shape: 'ring',
      });
    }

    enemiesRef.current = newEnemies;
  };

  // ----------------------------------------------------
  // INIT ARENA
  // ----------------------------------------------------
  const initArena = (stageId: number) => {
    generateArena(stageId);

    playerRef.current = {
      x: 450,
      y: 275,
      vx: 0,
      vy: 0,
      chassisAngle: 0,
      turretAngle: 0,
      hp: activeTank.maxHp,
      maxHp: activeTank.maxHp,
      fireCooldown: 0,
      shieldTimer: 0,
      triShotTimer: 0,
      screenShake: 0,
    };

    bulletsRef.current = [];
    powerupsRef.current = [];
    particlesRef.current = [];
    setScore(0);
    setPlayerHp(activeTank.maxHp);
    setMaxHp(activeTank.maxHp);
    setCurrentWave(1);
    setKillsCount(0);
    setTargetKills(activeStage.targetKills);
    setActivePowerup(null);
    setStuntToast(null);

    spawnWave(1, stageId);
    sound.playPowerup();
    setGameState('playing');
  };

  // ----------------------------------------------------
  // MAIN COMBAT GAME LOOP
  // ----------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing') return;

    let animId: number;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      const dt = Math.min(rawDt, 0.033);

      const p = playerRef.current;
      const keys = keysRef.current;
      const tankStats = activeCarOrTank;

      // 1. PLAYER TANK MOVEMENT (WASD / Arrow Keys)
      let moveX = 0;
      let moveY = 0;
      if (keys.w) moveY -= 1;
      if (keys.s) moveY += 1;
      if (keys.a) moveX -= 1;
      if (keys.d) moveX += 1;

      if (moveX !== 0 || moveY !== 0) {
        const moveAngle = Math.atan2(moveY, moveX);
        p.chassisAngle = moveAngle;

        const targetSpeed = tankStats.speed;
        p.vx = Math.cos(moveAngle) * targetSpeed;
        p.vy = Math.sin(moveAngle) * targetSpeed;

        // Tread smoke particles
        if (Math.random() < 0.25) {
          particlesRef.current.push({
            x: p.x - Math.cos(p.chassisAngle) * 16,
            y: p.y - Math.sin(p.chassisAngle) * 16,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            size: Math.random() * 4 + 2,
            color: 'rgba(255, 255, 255, 0.2)',
            alpha: 0.6,
            decay: 0.04,
            shape: 'smoke',
          });
        }
      } else {
        p.vx *= 0.85;
        p.vy *= 0.85;
      }

      // Next position with Wall Collision
      let nextX = p.x + p.vx * dt;
      let nextY = p.y + p.vy * dt;
      const tankR = 18;

      // Wall collision resolution
      wallsRef.current.forEach((w) => {
        if (nextX + tankR > w.x && nextX - tankR < w.x + w.w &&
            nextY + tankR > w.y && nextY - tankR < w.y + w.h) {
          // Push out along shortest penetration
          const overlapLeft = (nextX + tankR) - w.x;
          const overlapRight = (w.x + w.w) - (nextX - tankR);
          const overlapTop = (nextY + tankR) - w.y;
          const overlapBottom = (w.y + w.h) - (nextY - tankR);

          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
          if (minOverlap === overlapLeft) nextX = w.x - tankR;
          else if (minOverlap === overlapRight) nextX = w.x + w.w + tankR;
          else if (minOverlap === overlapTop) nextY = w.y - tankR;
          else nextY = w.y + w.h + tankR;
        }
      });

      p.x = nextX;
      p.y = nextY;

      // 2. TURRET AIMING (Mouse / Touch / Arrow Keys)
      if (keys.aimLeft) p.turretAngle -= 4 * dt;
      if (keys.aimRight) p.turretAngle += 4 * dt;
      if (!keys.aimLeft && !keys.aimRight) {
        // Aim at mouse pointer
        p.turretAngle = Math.atan2(keys.mouseY - p.y, keys.mouseX - p.x);
      }

      // 3. SHOOTING CANNON (Player)
      p.fireCooldown -= dt;
      if (p.shieldTimer > 0) p.shieldTimer -= dt;
      if (p.triShotTimer > 0) p.triShotTimer -= dt;

      if (keys.shoot && p.fireCooldown <= 0) {
        p.fireCooldown = 1.0 / tankStats.fireRate;
        sound.playLaser();
        p.screenShake = 4;

        const bSpeed = tankStats.bulletSpeed;
        const bDam = tankStats.damage;

        if (p.triShotTimer > 0 || tankStats.specialWeapon === 'tri-shot') {
          // Tri-Shot Spread
          [-0.2, 0, 0.2].forEach((spread) => {
            const shootAng = p.turretAngle + spread;
            bulletsRef.current.push({
              id: Math.random(),
              x: p.x + Math.cos(shootAng) * 24,
              y: p.y + Math.sin(shootAng) * 24,
              vx: Math.cos(shootAng) * bSpeed,
              vy: Math.sin(shootAng) * bSpeed,
              radius: 5,
              damage: bDam,
              bouncesLeft: 2,
              isEnemy: false,
              color: tankStats.glowColor,
            });
          });
        } else if (tankStats.specialWeapon === 'homing-missile') {
          bulletsRef.current.push({
            id: Math.random(),
            x: p.x + Math.cos(p.turretAngle) * 24,
            y: p.y + Math.sin(p.turretAngle) * 24,
            vx: Math.cos(p.turretAngle) * bSpeed,
            vy: Math.sin(p.turretAngle) * bSpeed,
            radius: 6,
            damage: bDam * 1.4,
            bouncesLeft: 1,
            isEnemy: false,
            color: '#ec4899',
            homing: true,
          });
        } else {
          // Single Super Plasma Round
          bulletsRef.current.push({
            id: Math.random(),
            x: p.x + Math.cos(p.turretAngle) * 24,
            y: p.y + Math.sin(p.turretAngle) * 24,
            vx: Math.cos(p.turretAngle) * bSpeed,
            vy: Math.sin(p.turretAngle) * bSpeed,
            radius: 6,
            damage: bDam,
            bouncesLeft: 2,
            isEnemy: false,
            color: tankStats.glowColor,
          });
        }

        // Muzzle flash particle
        particlesRef.current.push({
          x: p.x + Math.cos(p.turretAngle) * 26,
          y: p.y + Math.sin(p.turretAngle) * 26,
          vx: Math.cos(p.turretAngle) * 60,
          vy: Math.sin(p.turretAngle) * 60,
          size: 10,
          color: tankStats.glowColor,
          alpha: 1,
          decay: 0.1,
          shape: 'spark',
        });
      }

      // 4. BULLET PHYSICS & RICOCHET WALL BOUNCE
      bulletsRef.current = bulletsRef.current.filter((b) => {
        // Homing bullet steer towards closest enemy
        if (b.homing && !b.isEnemy && enemiesRef.current.length > 0) {
          let closestDist = 9999;
          let targetE: EnemyTank | null = null;
          enemiesRef.current.forEach((en) => {
            const d = Math.hypot(en.x - b.x, en.y - b.y);
            if (d < closestDist) {
              closestDist = d;
              targetE = en;
            }
          });
          if (targetE) {
            const targetAngle = Math.atan2(targetE.y - b.y, targetE.x - b.x);
            const curAngle = Math.atan2(b.vy, b.vx);
            const newAngle = curAngle + (targetAngle - curAngle) * 0.15;
            const spd = Math.hypot(b.vx, b.vy);
            b.vx = Math.cos(newAngle) * spd;
            b.vy = Math.sin(newAngle) * spd;
          }
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Wall collisions with Ricochet
        let alive = true;
        wallsRef.current.forEach((w) => {
          if (b.x + b.radius > w.x && b.x - b.radius < w.x + w.w &&
              b.y + b.radius > w.y && b.y - b.radius < w.y + w.h) {
            if (b.bouncesLeft > 0) {
              b.bouncesLeft -= 1;
              sound.playHit();

              // Determine collision side and invert velocity
              const prevX = b.x - b.vx * dt;
              const prevY = b.y - b.vy * dt;
              if (prevX <= w.x || prevX >= w.x + w.w) {
                b.vx = -b.vx;
              } else {
                b.vy = -b.vy;
              }

              // Spark particles on bounce
              for (let i = 0; i < 4; i++) {
                particlesRef.current.push({
                  x: b.x,
                  y: b.y,
                  vx: (Math.random() - 0.5) * 80,
                  vy: (Math.random() - 0.5) * 80,
                  size: 3,
                  color: b.color,
                  alpha: 1,
                  decay: 0.08,
                  shape: 'spark',
                });
              }

              // Damage destructible walls
              if (w.destructible && w.hp !== undefined) {
                w.hp -= b.damage;
              }
            } else {
              alive = false;
            }
          }
        });

        // Hit Player (Enemy bullets)
        if (b.isEnemy) {
          const distToPlayer = Math.hypot(p.x - b.x, p.y - b.y);
          if (distToPlayer < tankR + b.radius) {
            alive = false;
            if (p.shieldTimer <= 0) {
              p.hp -= b.damage;
              setPlayerHp(p.hp);
              sound.playHit();
              p.screenShake = 6;

              if (p.hp <= 0) {
                handlePlayerDeath();
              }
            } else {
              sound.playPowerup();
            }
          }
        } else {
          // Hit Enemies (Player bullets)
          enemiesRef.current.forEach((en) => {
            const distToEnemy = Math.hypot(en.x - b.x, en.y - b.y);
            if (distToEnemy < en.size + b.radius) {
              alive = false;
              en.hp -= b.damage;
              sound.playHit();

              // Damage spark
              for (let i = 0; i < 6; i++) {
                particlesRef.current.push({
                  x: b.x,
                  y: b.y,
                  vx: (Math.random() - 0.5) * 120,
                  vy: (Math.random() - 0.5) * 120,
                  size: 4,
                  color: '#fbbf24',
                  alpha: 1,
                  decay: 0.08,
                  shape: 'spark',
                });
              }
            }
          });
        }

        return alive;
      });

      // Filter destroyed walls
      wallsRef.current = wallsRef.current.filter((w) => !w.destructible || (w.hp !== undefined && w.hp > 0));

      // 5. ENEMY TANK AI & MOVEMENT
      enemiesRef.current = enemiesRef.current.filter((en) => {
        if (en.hp <= 0) {
          // Enemy Destroyed!
          sound.playExplosion();
          p.screenShake = 8;
          setScore((s) => s + (en.type === 'boss' ? 1000 : 150));
          setCoins((c) => c + (en.type === 'boss' ? 100 : 25));
          setKillsCount((k) => {
            const nextKills = k + 1;
            if (nextKills >= activeStage.targetKills) {
              handleVictory();
            }
            return nextKills;
          });

          setStuntToast({
            text: en.type === 'boss' ? 'BOSS DESTROYED! +1000' : 'ENEMY DOWN! +150',
            bonus: en.type === 'boss' ? 1000 : 150,
            key: Date.now(),
          });

          // Explosion fireball
          for (let i = 0; i < 25; i++) {
            particlesRef.current.push({
              x: en.x + (Math.random() - 0.5) * 20,
              y: en.y + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 220,
              vy: (Math.random() - 0.5) * 220,
              size: Math.random() * 6 + 3,
              color: i % 2 === 0 ? '#ef4444' : '#fbbf24',
              alpha: 1,
              decay: 0.04,
              shape: 'spark',
            });
          }

          // Random Powerup Drop (25% chance)
          if (Math.random() < 0.35) {
            const types: ('shield' | 'tri-shot' | 'health' | 'nuke')[] = ['shield', 'tri-shot', 'health', 'nuke'];
            powerupsRef.current.push({
              id: Math.random(),
              x: en.x,
              y: en.y,
              type: types[Math.floor(Math.random() * types.length)],
              radius: 16,
              duration: 15,
            });
          }

          return false;
        }

        // Enemy AI Navigation towards Player
        const angleToPlayer = Math.atan2(p.y - en.y, p.x - en.x);
        en.turretAngle = angleToPlayer;
        en.angle = angleToPlayer;

        const distToPlayer = Math.hypot(p.x - en.x, p.y - en.y);
        const preferDist = en.type === 'sniper' ? 300 : en.type === 'heavy' ? 180 : 100;

        if (distToPlayer > preferDist) {
          en.vx = Math.cos(angleToPlayer) * en.speed;
          en.vy = Math.sin(angleToPlayer) * en.speed;
        } else if (distToPlayer < preferDist - 50) {
          en.vx = -Math.cos(angleToPlayer) * en.speed * 0.8;
          en.vy = -Math.sin(angleToPlayer) * en.speed * 0.8;
        } else {
          // Circle strafe
          en.vx = -Math.sin(angleToPlayer) * en.speed * 0.7;
          en.vy = Math.cos(angleToPlayer) * en.speed * 0.7;
        }

        en.x += en.vx * dt;
        en.y += en.vy * dt;

        // Enemy Firing
        en.fireCooldown -= dt;
        if (en.fireCooldown <= 0 && distToPlayer < 450) {
          en.fireCooldown = 1.0 / en.fireRate;
          bulletsRef.current.push({
            id: Math.random(),
            x: en.x + Math.cos(en.turretAngle) * (en.size + 4),
            y: en.y + Math.sin(en.turretAngle) * (en.size + 4),
            vx: Math.cos(en.turretAngle) * 320,
            vy: Math.sin(en.turretAngle) * 320,
            radius: en.type === 'boss' ? 7 : 5,
            damage: en.type === 'boss' ? 35 : en.type === 'heavy' ? 25 : 15,
            bouncesLeft: 1,
            isEnemy: true,
            color: en.color,
          });
        }

        return true;
      });

      // Wave Progression Check
      if (enemiesRef.current.length === 0 && killsCount < activeStage.targetKills) {
        if (currentWave < activeStage.waves) {
          setCurrentWave((w) => {
            const nextW = w + 1;
            spawnWave(nextW, activeStageId);
            setStuntToast({ text: `WAVE ${nextW} INCOMING! ⚠️`, bonus: 200, key: Date.now() });
            sound.playPowerup();
            return nextW;
          });
        }
      }

      // 6. POWERUP PICKUPS
      powerupsRef.current.forEach((pu) => {
        const dist = Math.hypot(p.x - pu.x, p.y - pu.y);
        if (dist < tankR + pu.radius) {
          sound.playPowerup();
          if (pu.type === 'shield') {
            p.shieldTimer = 8;
            setActivePowerup('ENERGY SHIELD (8s)');
          } else if (pu.type === 'tri-shot') {
            p.triShotTimer = 10;
            setActivePowerup('TRI-SHOT CANNON (10s)');
          } else if (pu.type === 'health') {
            p.hp = Math.min(p.maxHp, p.hp + 40);
            setPlayerHp(p.hp);
            setActivePowerup('HEALTH REPAIR (+40 HP)');
          } else if (pu.type === 'nuke') {
            // Destroy all regular enemies
            enemiesRef.current.forEach((en) => {
              if (en.type !== 'boss') en.hp = 0;
            });
            p.screenShake = 14;
            sound.playExplosion();
            setActivePowerup('TACTICAL EMP NUKE!');
          }
          // Remove powerup
          pu.duration = 0;
        }
      });
      powerupsRef.current = powerupsRef.current.filter((pu) => pu.duration > 0);

      // 7. PARTICLES & SCREEN SHAKE
      p.screenShake = Math.max(0, p.screenShake - dt * 20);

      particlesRef.current = particlesRef.current.filter((pt) => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.alpha -= pt.decay;
        return pt.alpha > 0;
      });

      // Render Stage Canvas
      renderArenaStage();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, selectedTankId, activeStageId]);

  // ----------------------------------------------------
  // VICTORY & DEATH
  // ----------------------------------------------------
  const handleVictory = () => {
    sound.playFinishFanfare();
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });

    const cashPrize = 300 + activeStageId * 150;
    setCoins((prev) => prev + cashPrize);

    if (activeStageId < ARENA_STAGES.length) {
      setUnlockedStages((prev) => {
        if (!prev.includes(activeStageId + 1)) {
          return [...prev, activeStageId + 1];
        }
        return prev;
      });
    }

    if (playerRef.current.hp > 0) {
      setHighScore((prev) => Math.max(prev, score + 1000));
    }

    setGameState('completed');
  };

  const handlePlayerDeath = () => {
    sound.playExplosion();
    setGameState('gameover');
  };

  const activeCarOrTank = activeTank;

  // ----------------------------------------------------
  // 2.5D CANVAS RENDERER
  // ----------------------------------------------------
  const renderArenaStage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const p = playerRef.current;
    const tankStats = activeTank;
    const stage = activeStage;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply Screen Shake
    if (p.screenShake > 0) {
      const sx = (Math.random() - 0.5) * p.screenShake;
      const sy = (Math.random() - 0.5) * p.screenShake;
      ctx.translate(sx, sy);
    }

    // 1. ARENA FLOOR GRID
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, width, height);

    // Cyber Grid Hatching
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.07)';
    ctx.lineWidth = 1;
    const gridSize = 45;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. DRAW WALLS & NEON BARRIERS
    wallsRef.current.forEach((w) => {
      ctx.save();
      // Wall Shadow
      ctx.fillStyle = '#020617';
      ctx.fillRect(w.x + 4, w.y + 4, w.w, w.h);

      // Main Wall Structure
      ctx.fillStyle = w.destructible ? '#1e293b' : '#0f172a';
      ctx.fillRect(w.x, w.y, w.w, w.h);

      // Glowing Neon Border
      ctx.strokeStyle = w.destructible ? '#f59e0b' : stage.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = w.destructible ? '#f59e0b' : stage.color;
      ctx.shadowBlur = 10;
      ctx.strokeRect(w.x, w.y, w.w, w.h);

      // Inset texture lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(w.x + 4, w.y + 4, Math.max(0, w.w - 8), Math.max(0, w.h - 8));
      ctx.restore();
    });

    // 3. DRAW POWERUPS
    powerupsRef.current.forEach((pu) => {
      ctx.save();
      ctx.translate(pu.x, pu.y);
      const pulse = (Math.sin(Date.now() * 0.008) + 1) * 3;

      let pColor = '#38bdf8';
      let iconText = '🛡️';
      if (pu.type === 'tri-shot') { pColor = '#f43f5e'; iconText = '⚡'; }
      if (pu.type === 'health') { pColor = '#10b981'; iconText = '💚'; }
      if (pu.type === 'nuke') { pColor = '#fbbf24'; iconText = '💣'; }

      ctx.fillStyle = pColor;
      ctx.shadowColor = pColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, pu.radius + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(iconText, 0, 1);
      ctx.restore();
    });

    // 4. DRAW BULLETS
    bulletsRef.current.forEach((b) => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 5. DRAW ENEMY TANKS
    enemiesRef.current.forEach((en) => {
      ctx.save();
      ctx.translate(en.x, en.y);

      // Enemy Health Bar
      const hpPercent = Math.max(0, en.hp / en.maxHp);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-en.size, -en.size - 12, en.size * 2, 5);
      ctx.fillStyle = en.color;
      ctx.fillRect(-en.size, -en.size - 12, en.size * 2 * hpPercent, 5);

      // Tank Chassis
      ctx.save();
      ctx.rotate(en.angle);
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = en.color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = en.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(-en.size, -en.size * 0.8, en.size * 2, en.size * 1.6, 5);
      ctx.fill();
      ctx.stroke();

      // Left & Right Treads
      ctx.fillStyle = '#020617';
      ctx.fillRect(-en.size * 0.9, -en.size * 0.95, en.size * 1.8, en.size * 0.3);
      ctx.fillRect(-en.size * 0.9, en.size * 0.65, en.size * 1.8, en.size * 0.3);
      ctx.restore();

      // Turret Barrel & Dome
      ctx.save();
      ctx.rotate(en.turretAngle);
      ctx.fillStyle = en.color;
      ctx.fillRect(0, -3, en.size * 1.1, 6);
      ctx.beginPath();
      ctx.arc(0, 0, en.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    });

    // 6. DRAW PARTICLES
    particlesRef.current.forEach((pt) => {
      ctx.save();
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 7. DRAW PLAYER TANK
    if (p.hp > 0) {
      ctx.save();
      ctx.translate(p.x, p.y);

      // Active Energy Shield Bubble
      if (p.shieldTimer > 0) {
        ctx.save();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.fill();
        ctx.restore();
      }

      // Tank Chassis Body
      ctx.save();
      ctx.rotate(p.chassisAngle);

      // Treads
      ctx.fillStyle = '#020617';
      ctx.fillRect(-18, -16, 36, 6);
      ctx.fillRect(-18, 10, 36, 6);

      // Chassis Armor Plate
      ctx.fillStyle = tankStats.color;
      ctx.shadowColor = tankStats.glowColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(-16, -12, 32, 24, 6);
      ctx.fill();

      // Cyber Details
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-10, -8, 20, 16);
      ctx.restore();

      // 360° Rotating Laser Turret & Barrel
      ctx.save();
      ctx.rotate(p.turretAngle);

      // Cannon Barrel
      ctx.fillStyle = tankStats.turretColor;
      ctx.shadowColor = tankStats.glowColor;
      ctx.shadowBlur = 10;
      ctx.fillRect(0, -3.5, 24, 7);

      // Muzzle Ring
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(20, -5, 4, 10);

      // Turret Center Dome
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = tankStats.glowColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Center Core
      ctx.fillStyle = tankStats.glowColor;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }

    ctx.restore(); // Restore Canvas
  };

  // ----------------------------------------------------
  // BUY / SELECT TANK
  // ----------------------------------------------------
  const handleBuyTank = (tankItem: TankModel) => {
    if (coins >= tankItem.price) {
      setCoins((prev) => prev - tankItem.price);
      setTanks((prev) =>
        prev.map((t) => (t.id === tankItem.id ? { ...t, unlocked: true } : t))
      );
      setSelectedTankId(tankItem.id);
      sound.playPowerup();
    } else {
      sound.playClick();
    }
  };

  // ----------------------------------------------------
  // COMPONENT JSX
  // ----------------------------------------------------
  return (
    <div className="relative w-full max-w-5xl mx-auto rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl font-sans select-none">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
            <Crosshair className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-wide flex items-center gap-2">
              CYBER TANK ARENA 3D
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                PRO EDITION
              </span>
            </h2>
            <p className="text-xs text-slate-400">રિકોશે પ્લાઝમા બેટલ રોયલ • Ricochet Combat Arena</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* COINS */}
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>${coins.toLocaleString()}</span>
          </div>

          {/* HIGH SCORE */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-bold">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span>BEST: {highScore.toLocaleString()}</span>
          </div>

          {/* SOUND TOGGLE */}
          <button
            onClick={() => {
              const next = !muted;
              setMuted(next);
              sound.setMuted(next);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* GAME VIEWPORT */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-black flex items-center justify-center overflow-hidden">
        {/* CANVAS */}
        <canvas
          ref={canvasRef}
          width={900}
          height={550}
          className="w-full h-full object-contain cursor-crosshair"
        />

        {/* ------------------------------------------------ */}
        {/* PLAYING HUD OVERLAY */}
        {/* ------------------------------------------------ */}
        {gameState === 'playing' && (
          <div className="absolute inset-0 pointer-events-none p-2 sm:p-4 flex flex-col justify-between z-10 select-none">
            {/* TOP BAR STATS */}
            <div className="flex items-start justify-between gap-1">
              {/* HEALTH BAR & TANK */}
              <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-slate-700/80 shadow-lg pointer-events-auto">
                <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-400 shrink-0" />
                <div>
                  <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-slate-300 mb-0.5">
                    <span>HULL</span>
                    <span className={playerHp < 35 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}>
                      {Math.max(0, Math.round(playerHp))}/{maxHp}
                    </span>
                  </div>
                  <div className="w-20 sm:w-32 h-2 sm:h-2.5 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className={`h-full rounded-full transition-all ${
                        playerHp < 35 ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                      }`}
                      style={{ width: `${Math.max(0, (playerHp / maxHp) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* TOAST POPUP */}
              {stuntToast && (
                <div
                  key={stuntToast.key}
                  className="animate-bounce flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 text-white font-black text-[10px] sm:text-sm shadow-xl border border-cyan-300"
                >
                  <Flame className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-none">{stuntToast.text}</span>
                </div>
              )}

              {/* ACTIVE POWERUP BADGE */}
              {activePowerup && (
                <div className="animate-pulse px-2 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] sm:text-xs font-black">
                  ✨ {activePowerup}
                </div>
              )}

              {/* KILLS & SCORE */}
              <div className="flex flex-col items-end gap-1">
                <div className="bg-slate-900/90 backdrop-blur-md px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl border border-slate-700 text-right">
                  <div className="text-[9px] font-bold text-slate-400">SCORE</div>
                  <div className="text-sm sm:text-xl font-black text-white">{score.toLocaleString()}</div>
                </div>

                <div className="flex items-center gap-1">
                  <div className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] sm:text-xs font-black">
                    💥 {killsCount}/{targetKills}
                  </div>
                  <div className="px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] sm:text-xs font-bold">
                    W{currentWave}/{activeStage.waves}
                  </div>
                </div>
              </div>
            </div>

            {/* MOBILE TOUCH CONTROLS */}
            <div className="flex items-end justify-between pointer-events-auto sm:hidden pt-2 gap-2 select-none touch-none">
              {/* D-Pad Movement */}
              <div className="grid grid-cols-3 gap-1 w-28 h-28">
                <div />
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    keysRef.current.w = true;
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    keysRef.current.w = false;
                  }}
                  onPointerLeave={() => {
                    keysRef.current.w = false;
                  }}
                  className="rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-400 font-black text-base flex items-center justify-center active:bg-cyan-500 active:text-slate-950 active:scale-95 transition-transform"
                >
                  ▲
                </button>
                <div />
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    keysRef.current.a = true;
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    keysRef.current.a = false;
                  }}
                  onPointerLeave={() => {
                    keysRef.current.a = false;
                  }}
                  className="rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-400 font-black text-base flex items-center justify-center active:bg-cyan-500 active:text-slate-950 active:scale-95 transition-transform"
                >
                  ◀
                </button>
                <div className="rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-center text-[9px] text-slate-500 font-bold">
                  MOVE
                </div>
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    keysRef.current.d = true;
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    keysRef.current.d = false;
                  }}
                  onPointerLeave={() => {
                    keysRef.current.d = false;
                  }}
                  className="rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-400 font-black text-base flex items-center justify-center active:bg-cyan-500 active:text-slate-950 active:scale-95 transition-transform"
                >
                  ▶
                </button>
                <div />
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    keysRef.current.s = true;
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    keysRef.current.s = false;
                  }}
                  onPointerLeave={() => {
                    keysRef.current.s = false;
                  }}
                  className="rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-400 font-black text-base flex items-center justify-center active:bg-cyan-500 active:text-slate-950 active:scale-95 transition-transform"
                >
                  ▼
                </button>
                <div />
              </div>

              {/* Aim & Fire Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    keysRef.current.aimLeft = true;
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    keysRef.current.aimLeft = false;
                  }}
                  onPointerLeave={() => {
                    keysRef.current.aimLeft = false;
                  }}
                  className="w-11 h-12 rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-400 font-black text-[10px] flex items-center justify-center shadow-lg active:bg-cyan-500 active:text-slate-950 active:scale-95 transition-transform"
                >
                  ↺ AIM
                </button>
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    keysRef.current.aimRight = true;
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    keysRef.current.aimRight = false;
                  }}
                  onPointerLeave={() => {
                    keysRef.current.aimRight = false;
                  }}
                  className="w-11 h-12 rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-400 font-black text-[10px] flex items-center justify-center shadow-lg active:bg-cyan-500 active:text-slate-950 active:scale-95 transition-transform"
                >
                  AIM ↻
                </button>
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    keysRef.current.shoot = true;
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    keysRef.current.shoot = false;
                  }}
                  onPointerLeave={() => {
                    keysRef.current.shoot = false;
                  }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 border border-rose-400 text-white text-xs font-black flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                >
                  💥 FIRE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* MENU SCREEN */}
        {/* ------------------------------------------------ */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-500 flex items-center justify-center text-white shadow-2xl shadow-cyan-500/30 border border-white/20">
              <Crosshair className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                CYBER TANK ARENA 3D
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md">
                Master 360° laser cannons, ricochet plasma rounds around tactical neon barriers, and destroy enemy drone waves!
              </p>
            </div>

            {/* STAGE SELECT PREVIEWS */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full max-w-2xl">
              {ARENA_STAGES.map((st) => {
                const isUnlocked = unlockedStages.includes(st.id);
                const isCurrent = activeStageId === st.id;
                return (
                  <button
                    key={st.id}
                    disabled={!isUnlocked}
                    onClick={() => setActiveStageId(st.id)}
                    className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      isCurrent
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/20 text-white'
                        : isUnlocked
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-950/80 border-slate-900 text-slate-600 opacity-60'
                    }`}
                  >
                    <div className="text-xs font-black mb-0.5">SECTOR {st.id}</div>
                    <div className="text-[11px] font-bold text-slate-200 truncate">{st.name}</div>
                    <div className="text-[9px] text-slate-400">{st.targetKills} Kills Target</div>
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs font-bold text-slate-400">
                        🔒 LOCKED
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setGameState('garage')}
                className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-sm font-bold flex items-center gap-2 transition-all"
              >
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>TANK ARMORY ({activeTank.name.split(' ')[0]})</span>
              </button>

              <button
                onClick={() => initArena(activeStageId)}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-black text-sm flex items-center gap-2 shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>START COMBAT DEPLOYMENT</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* GARAGE / ARMORY SCREEN */}
        {/* ------------------------------------------------ */}
        {gameState === 'garage' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 z-20 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-black text-white">TANK ARMORY & WORKSHOP (હથિયારાગાર)</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 fill-amber-400" />
                  <span>${coins.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => setGameState('menu')}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                >
                  DONE
                </button>
              </div>
            </div>

            {/* TANK ROSTER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {tanks.map((tank) => {
                const isSelected = selectedTankId === tank.id;
                return (
                  <div
                    key={tank.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md border border-white/20"
                          style={{ backgroundColor: tank.color }}
                        >
                          {tank.previewEmoji}
                        </div>
                        <div>
                          <div className="text-sm font-black text-white">{tank.name}</div>
                          <div className="text-[11px] text-cyan-400 font-bold">{tank.nameGuj}</div>
                        </div>
                      </div>

                      {tank.unlocked ? (
                        isSelected ? (
                          <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                            EQUIPPED
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedTankId(tank.id)}
                            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700"
                          >
                            SELECT
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleBuyTank(tank)}
                          disabled={coins < tank.price}
                          className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 ${
                            coins >= tank.price
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>${tank.price}</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mb-3">{tank.description}</p>

                    {/* STATS */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>HULL ARMOR (HP)</span>
                        <span>{tank.maxHp} HP</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${(tank.maxHp / 200) * 100}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>CANNON DAMAGE</span>
                        <span>{tank.damage} DMG</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-400 rounded-full"
                          style={{ width: `${(tank.damage / 100) * 100}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>FIRE RATE</span>
                        <span>{tank.fireRate} /s</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full"
                          style={{ width: `${(tank.fireRate / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* GAME OVER SCREEN */}
        {/* ------------------------------------------------ */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-3xl shadow-xl shadow-rose-500/20">
              💥
            </div>
            <div>
              <h2 className="text-2xl font-black text-rose-500">TANK DESTROYED!</h2>
              <p className="text-xs text-slate-400 mt-1">
                તમારી ટેન્ક ધ્વસ્ત થઈ ગઈ! દિવાલોનો આશરો લઈ રિકોશે શોટ્સનો ઉપયોગ કરો.
              </p>
            </div>

            <div className="bg-slate-900 px-6 py-3 rounded-2xl border border-slate-800 flex items-center gap-6 text-center">
              <div>
                <div className="text-[10px] font-bold text-slate-400">KILLS</div>
                <div className="text-lg font-black text-rose-400">{killsCount}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400">FINAL SCORE</div>
                <div className="text-lg font-black text-white">{score.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setGameState('menu')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold"
              >
                MENU
              </button>
              <button
                onClick={() => initArena(activeStageId)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white text-xs font-black flex items-center gap-1.5 shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>TRY AGAIN (R)</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* VICTORY SCREEN */}
        {/* ------------------------------------------------ */}
        {gameState === 'completed' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20 animate-bounce">
              🏆
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">SECTOR CLEARED!</h2>
              <p className="text-xs text-slate-400 mt-1">
                અભિનંદન! તમે બધા જ દુશ્મનોને સફળતાપૂર્વક નષ્ટ કર્યા છે!
              </p>
            </div>

            <div className="bg-slate-900 px-6 py-3.5 rounded-2xl border border-slate-800 grid grid-cols-2 gap-4 text-center max-w-sm w-full">
              <div>
                <div className="text-[10px] font-bold text-slate-400">TOTAL KILLS</div>
                <div className="text-base font-black text-rose-400">{killsCount}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400">FINAL SCORE</div>
                <div className="text-base font-black text-emerald-400">{score.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setGameState('menu')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold"
              >
                MENU
              </button>
              {activeStageId < ARENA_STAGES.length ? (
                <button
                  onClick={() => {
                    setActiveStageId(activeStageId + 1);
                    initArena(activeStageId + 1);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg"
                >
                  <span>NEXT SECTOR</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => initArena(activeStageId)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-black"
                >
                  REPLAY
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER CONTROLS GUIDE */}
      <div className="px-5 py-3 bg-slate-900/80 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <span>🎮 <b>W / A / S / D</b> : Move Tank (ટેન્ક મૂવમેન્ટ)</span>
          <span><b>Mouse / Q / E</b> : 360° Aim Turret (કેનન એમ)</span>
          <span><b>Space / Left Click</b> : Fire Cannon (ફાયર)</span>
          <span><b>R</b> : Instant Restart (રીસ્ટાર્ટ)</span>
        </div>
        <div className="flex items-center gap-1 text-cyan-400 font-bold">
          <span>Ricochet Bounces = Strategic Trickshots!</span>
        </div>
      </div>
    </div>
  );
};
