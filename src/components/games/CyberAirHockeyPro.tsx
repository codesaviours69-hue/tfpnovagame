import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  User,
  Bot,
  Users,
  Shield,
  Zap,
  Target,
  Award,
  Crown,
  ChevronRight,
  Pause,
  Sliders
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

// --- TYPES & INTERFACES ---
type GameMode = 'vs_ai' | 'pass_play' | 'tournament' | 'target_practice';
type AIDifficulty = 'easy' | 'medium' | 'hard' | 'godlike';
type TableTheme = 'cyber_neon' | 'matrix_grid' | 'solar_inferno' | 'void_synth';

interface Mallet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  prevX: number;
  prevY: number;
  radius: number;
  baseRadius: number;
  color: string;
  glowColor: string;
  freezeTimer: number;
  megaTimer: number;
  shieldTimer: number;
  score: number;
}

interface Puck {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  speedBoostTimer: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: 'speed' | 'barrier' | 'multipuck' | 'mega' | 'freeze';
  duration: number;
  icon: string;
  color: string;
  pulse: number;
}

interface PracticeTarget {
  id: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  vx: number;
  vy: number;
  points: number;
  color: string;
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
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

// Table Virtual Coordinates
const V_WIDTH = 540;
const V_HEIGHT = 860;
const TABLE_PADDING = 24;
const GOAL_WIDTH = 190;
const GOAL_DEPTH = 18;
const BASE_MALLET_RADIUS = 34;
const BASE_PUCK_RADIUS = 20;

// Theme Palettes
const THEMES: Record<
  TableTheme,
  {
    name: string;
    bgGradStart: string;
    bgGradEnd: string;
    tableBorder: string;
    centerLine: string;
    p1Color: string;
    p1Glow: string;
    p2Color: string;
    p2Glow: string;
    puckColor: string;
    puckGlow: string;
    accent: string;
  }
> = {
  cyber_neon: {
    name: 'Cyber Neon',
    bgGradStart: '#080c1e',
    bgGradEnd: '#02040a',
    tableBorder: '#00f0ff',
    centerLine: 'rgba(0, 240, 255, 0.35)',
    p1Color: '#00f0ff',
    p1Glow: 'rgba(0, 240, 255, 0.8)',
    p2Color: '#ff007f',
    p2Glow: 'rgba(255, 0, 127, 0.8)',
    puckColor: '#ffe600',
    puckGlow: 'rgba(255, 230, 0, 0.9)',
    accent: '#00f0ff',
  },
  matrix_grid: {
    name: 'Matrix Grid',
    bgGradStart: '#04150c',
    bgGradEnd: '#010804',
    tableBorder: '#00ff66',
    centerLine: 'rgba(0, 255, 102, 0.35)',
    p1Color: '#00ff66',
    p1Glow: 'rgba(0, 255, 102, 0.8)',
    p2Color: '#38bdf8',
    p2Glow: 'rgba(56, 189, 248, 0.8)',
    puckColor: '#facc15',
    puckGlow: 'rgba(250, 204, 21, 0.9)',
    accent: '#00ff66',
  },
  solar_inferno: {
    name: 'Solar Inferno',
    bgGradStart: '#200808',
    bgGradEnd: '#0a0202',
    tableBorder: '#ff3b30',
    centerLine: 'rgba(255, 59, 48, 0.35)',
    p1Color: '#ff9500',
    p1Glow: 'rgba(255, 149, 0, 0.8)',
    p2Color: '#ff2d55',
    p2Glow: 'rgba(255, 45, 85, 0.8)',
    puckColor: '#00f0ff',
    puckGlow: 'rgba(0, 240, 255, 0.9)',
    accent: '#ff3b30',
  },
  void_synth: {
    name: 'Void Synth',
    bgGradStart: '#19062e',
    bgGradEnd: '#07010f',
    tableBorder: '#b026ff',
    centerLine: 'rgba(176, 38, 255, 0.35)',
    p1Color: '#a855f7',
    p1Glow: 'rgba(168, 85, 247, 0.8)',
    p2Color: '#ec4899',
    p2Glow: 'rgba(236, 72, 153, 0.8)',
    puckColor: '#22d3ee',
    puckGlow: 'rgba(34, 211, 238, 0.9)',
    accent: '#b026ff',
  },
};

const BOT_PROFILES: Record<
  AIDifficulty,
  {
    name: string;
    speed: number;
    reactionDelay: number;
    aggression: number;
    errorRate: number;
    title: string;
    desc: string;
  }
> = {
  easy: {
    name: 'Cyber Rookie AI',
    speed: 5.5,
    reactionDelay: 0.12,
    aggression: 0.35,
    errorRate: 0.25,
    title: 'Beginner',
    desc: 'Slow reaction and low power strikes.',
  },
  medium: {
    name: 'Neon Striker v2',
    speed: 8.5,
    reactionDelay: 0.06,
    aggression: 0.65,
    errorRate: 0.12,
    title: 'Pro',
    desc: 'Solid defense and reliable banking counter-attacks.',
  },
  hard: {
    name: 'Vortex Sentinel 9000',
    speed: 12.5,
    reactionDelay: 0.02,
    aggression: 0.9,
    errorRate: 0.03,
    title: 'Master',
    desc: 'Lightning fast smashes, laser angle precision.',
  },
  godlike: {
    name: 'QUANTUM OVERLORD',
    speed: 16.5,
    reactionDelay: 0.0,
    aggression: 1.0,
    errorRate: 0.0,
    title: 'Cyber God',
    desc: 'Near-impossible prediction reflexes & hyper-velocity spikes.',
  },
};

export const CyberAirHockeyPro: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Game UI States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'goal' | 'gameover'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('vs_ai');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [theme, setTheme] = useState<TableTheme>('cyber_neon');
  const [targetScore, setTargetScore] = useState<number>(7);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [winner, setWinner] = useState<'p1' | 'p2' | null>(null);
  const [goalScorer, setGoalScorer] = useState<'p1' | 'p2' | null>(null);
  const [p1Score, setP1Score] = useState<number>(0);
  const [p2Score, setP2Score] = useState<number>(0);
  const [practiceScore, setPracticeScore] = useState<number>(0);
  const [practiceTimeLeft, setPracticeTimeLeft] = useState<number>(60);
  const [tournamentRound, setTournamentRound] = useState<number>(1);

  // Tournament Opponents
  const tournamentBots: { name: string; diff: AIDifficulty; stage: string }[] = [
    { name: 'Neon Scout', diff: 'easy', stage: 'Quarterfinals' },
    { name: 'Apex Striker', diff: 'medium', stage: 'Semifinals' },
    { name: 'CHRONO CYBORG', diff: 'hard', stage: 'Grand Championship Finals' },
  ];

  // Engine Refs
  const engineRef = useRef<{
    p1: Mallet;
    p2: Mallet;
    pucks: Puck[];
    powerUps: PowerUp[];
    targets: PracticeTarget[];
    particles: Particle[];
    shockwaves: Shockwave[];
    keys: Record<string, boolean>;
    p1Target: { x: number; y: number } | null;
    p2Target: { x: number; y: number } | null;
    lastTime: number;
    shake: number;
    goalBannerTimer: number;
    nextPowerUpTime: number;
    animId: number | null;
  }>({
    p1: {
      x: V_WIDTH / 2,
      y: V_HEIGHT - 120,
      vx: 0,
      vy: 0,
      prevX: V_WIDTH / 2,
      prevY: V_HEIGHT - 120,
      radius: BASE_MALLET_RADIUS,
      baseRadius: BASE_MALLET_RADIUS,
      color: THEMES.cyber_neon.p1Color,
      glowColor: THEMES.cyber_neon.p1Glow,
      freezeTimer: 0,
      megaTimer: 0,
      shieldTimer: 0,
      score: 0,
    },
    p2: {
      x: V_WIDTH / 2,
      y: 120,
      vx: 0,
      vy: 0,
      prevX: V_WIDTH / 2,
      prevY: 120,
      radius: BASE_MALLET_RADIUS,
      baseRadius: BASE_MALLET_RADIUS,
      color: THEMES.cyber_neon.p2Color,
      glowColor: THEMES.cyber_neon.p2Glow,
      freezeTimer: 0,
      megaTimer: 0,
      shieldTimer: 0,
      score: 0,
    },
    pucks: [],
    powerUps: [],
    targets: [],
    particles: [],
    shockwaves: [],
    keys: {},
    p1Target: null,
    p2Target: null,
    lastTime: performance.now(),
    shake: 0,
    goalBannerTimer: 0,
    nextPowerUpTime: 0,
    animId: null,
  });

  // Spawn Initial Puck
  const resetPuck = useCallback(
    (toPlayer: 'p1' | 'p2' | 'neutral' = 'neutral') => {
      const currentTheme = THEMES[theme];
      let startY = V_HEIGHT / 2;
      let startVy = 0;

      if (toPlayer === 'p1') {
        startY = V_HEIGHT / 2 + 80;
        startVy = 2;
      } else if (toPlayer === 'p2') {
        startY = V_HEIGHT / 2 - 80;
        startVy = -2;
      }

      engineRef.current.pucks = [
        {
          id: 1,
          x: V_WIDTH / 2,
          y: startY,
          vx: (Math.random() - 0.5) * 4,
          vy: startVy,
          radius: BASE_PUCK_RADIUS,
          color: currentTheme.puckColor,
          glowColor: currentTheme.puckGlow,
          speedBoostTimer: 0,
          trail: [],
        },
      ];
    },
    [theme]
  );

  // Start New Match
  const startMatch = (mode: GameMode = gameMode, customDiff?: AIDifficulty) => {
    sound.playClick();
    setGameMode(mode);
    if (customDiff) setDifficulty(customDiff);

    const eng = engineRef.current;
    const curTheme = THEMES[theme];

    // Reset mallets
    eng.p1 = {
      x: V_WIDTH / 2,
      y: V_HEIGHT - 120,
      vx: 0,
      vy: 0,
      prevX: V_WIDTH / 2,
      prevY: V_HEIGHT - 120,
      radius: BASE_MALLET_RADIUS,
      baseRadius: BASE_MALLET_RADIUS,
      color: curTheme.p1Color,
      glowColor: curTheme.p1Glow,
      freezeTimer: 0,
      megaTimer: 0,
      shieldTimer: 0,
      score: 0,
    };

    eng.p2 = {
      x: V_WIDTH / 2,
      y: 120,
      vx: 0,
      vy: 0,
      prevX: V_WIDTH / 2,
      prevY: 120,
      radius: BASE_MALLET_RADIUS,
      baseRadius: BASE_MALLET_RADIUS,
      color: curTheme.p2Color,
      glowColor: curTheme.p2Glow,
      freezeTimer: 0,
      megaTimer: 0,
      shieldTimer: 0,
      score: 0,
    };

    eng.powerUps = [];
    eng.particles = [];
    eng.shockwaves = [];
    eng.nextPowerUpTime = performance.now() + 8000;

    if (mode === 'target_practice') {
      spawnPracticeTargets();
      setPracticeScore(0);
      setPracticeTimeLeft(60);
    } else {
      eng.targets = [];
    }

    setP1Score(0);
    setP2Score(0);
    setWinner(null);
    setGoalScorer(null);
    resetPuck();

    setGameState('playing');
  };

  // Practice Targets Spawn
  const spawnPracticeTargets = () => {
    const targets: PracticeTarget[] = [];
    const colors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff66', '#a855f7'];
    for (let i = 0; i < 6; i++) {
      targets.push({
        id: i + 1,
        x: TABLE_PADDING + 50 + Math.random() * (V_WIDTH - TABLE_PADDING * 2 - 100),
        y: TABLE_PADDING + 80 + Math.random() * (V_HEIGHT / 2 - 140),
        radius: 20 + Math.random() * 8,
        hp: 2,
        maxHp: 2,
        vx: (Math.random() - 0.5) * 2.5,
        vy: (Math.random() - 0.5) * 1.5,
        points: 100,
        color: colors[i % colors.length],
      });
    }
    engineRef.current.targets = targets;
  };

  // Spawn Random Powerup on Table
  const spawnRandomPowerUp = () => {
    const types: PowerUp['type'][] = ['speed', 'barrier', 'multipuck', 'mega', 'freeze'];
    const pType = types[Math.floor(Math.random() * types.length)];
    const colors: Record<PowerUp['type'], string> = {
      speed: '#ffe600',
      barrier: '#00f0ff',
      multipuck: '#a855f7',
      mega: '#00ff66',
      freeze: '#38bdf8',
    };

    const icons: Record<PowerUp['type'], string> = {
      speed: '⚡',
      barrier: '🛡️',
      multipuck: '🌀',
      mega: '🔨',
      freeze: '❄️',
    };

    const newPowerUp: PowerUp = {
      id: Date.now(),
      x: TABLE_PADDING + 60 + Math.random() * (V_WIDTH - TABLE_PADDING * 2 - 120),
      y: V_HEIGHT / 2 - 100 + Math.random() * 200,
      radius: 18,
      type: pType,
      duration: 6,
      icon: icons[pType],
      color: colors[pType],
      pulse: 0,
    };

    engineRef.current.powerUps.push(newPowerUp);
    sound.playPowerupSpawn();
  };

  // Apply PowerUp
  const activatePowerUp = (pu: PowerUp, player: 'p1' | 'p2') => {
    const eng = engineRef.current;
    const targetMallet = player === 'p1' ? eng.p1 : eng.p2;
    const oppMallet = player === 'p1' ? eng.p2 : eng.p1;

    sound.playPowerup();

    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24;
      const spd = 3 + Math.random() * 4;
      eng.particles.push({
        x: pu.x,
        y: pu.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 4 + Math.random() * 3,
        color: pu.color,
        alpha: 1,
        decay: 0.025,
      });
    }

    if (pu.type === 'speed') {
      eng.pucks.forEach((p) => {
        p.speedBoostTimer = 5;
        p.vx *= 1.5;
        p.vy *= 1.5;
      });
    } else if (pu.type === 'barrier') {
      targetMallet.shieldTimer = 7;
    } else if (pu.type === 'multipuck') {
      if (eng.pucks.length < 3) {
        const cur = eng.pucks[0] || { x: V_WIDTH / 2, y: V_HEIGHT / 2 };
        eng.pucks.push(
          {
            id: Date.now() + 1,
            x: cur.x + 15,
            y: cur.y + 15,
            vx: -cur.vx || -5,
            vy: cur.vy || 5,
            radius: BASE_PUCK_RADIUS,
            color: '#a855f7',
            glowColor: 'rgba(168, 85, 247, 0.9)',
            speedBoostTimer: 0,
            trail: [],
          },
          {
            id: Date.now() + 2,
            x: cur.x - 15,
            y: cur.y - 15,
            vx: cur.vx || 6,
            vy: -cur.vy || -6,
            radius: BASE_PUCK_RADIUS,
            color: '#ec4899',
            glowColor: 'rgba(236, 72, 153, 0.9)',
            speedBoostTimer: 0,
            trail: [],
          }
        );
      }
    } else if (pu.type === 'mega') {
      targetMallet.megaTimer = 8;
      targetMallet.radius = BASE_MALLET_RADIUS * 1.55;
    } else if (pu.type === 'freeze') {
      oppMallet.freezeTimer = 2.2;
    }
  };

  // NATIVE MOBILE TOUCH LISTENERS (Fixes all touch issues & multi-touch)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault(); // Stop mobile scroll & gestures!
      if (gameState !== 'playing') return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = V_WIDTH / rect.width;
      const scaleY = V_HEIGHT / rect.height;

      if (e.touches.length === 0) return;

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;

        if (gameMode === 'pass_play') {
          if (y > V_HEIGHT / 2) {
            engineRef.current.p1Target = { x, y };
          } else {
            engineRef.current.p2Target = { x, y };
          }
        } else {
          // Single player: bottom half controls P1
          if (y > V_HEIGHT / 2 - 40) {
            engineRef.current.p1Target = { x, y };
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        engineRef.current.p1Target = null;
        engineRef.current.p2Target = null;
      }
    };

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('touchmove', handleTouch);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [gameState, gameMode]);

  // Main Game Loop Engine
  useEffect(() => {
    let animationFrameId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      engineRef.current.keys[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      engineRef.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const updatePhysics = (dt: number) => {
      const eng = engineRef.current;
      if (gameState !== 'playing') return;

      const curTheme = THEMES[theme];

      // Update PowerUp Timers on Mallets
      [eng.p1, eng.p2].forEach((m) => {
        if (m.freezeTimer > 0) m.freezeTimer -= dt;
        if (m.shieldTimer > 0) m.shieldTimer -= dt;
        if (m.megaTimer > 0) {
          m.megaTimer -= dt;
          if (m.megaTimer <= 0) m.radius = BASE_MALLET_RADIUS;
        }
      });

      // Update puck speedboost timers
      eng.pucks.forEach((p) => {
        if (p.speedBoostTimer > 0) p.speedBoostTimer -= dt;
      });

      // Spawn powerups periodically
      if (performance.now() > eng.nextPowerUpTime && eng.powerUps.length < 2 && gameMode !== 'target_practice') {
        spawnRandomPowerUp();
        eng.nextPowerUpTime = performance.now() + 12000 + Math.random() * 8000;
      }

      // --- PLAYER 1 CONTROLS ---
      const p1 = eng.p1;
      p1.prevX = p1.x;
      p1.prevY = p1.y;

      if (p1.freezeTimer <= 0) {
        if (eng.p1Target) {
          const dx = eng.p1Target.x - p1.x;
          const dy = eng.p1Target.y - p1.y;
          p1.vx = dx * 18;
          p1.vy = dy * 18;
          p1.x += dx * 0.45;
          p1.y += dy * 0.45;
        } else {
          const spd = 620;
          let kx = 0;
          let ky = 0;
          if (eng.keys['ArrowLeft'] || (gameMode !== 'pass_play' && eng.keys['KeyA'])) kx -= 1;
          if (eng.keys['ArrowRight'] || (gameMode !== 'pass_play' && eng.keys['KeyD'])) kx += 1;
          if (eng.keys['ArrowUp'] || (gameMode !== 'pass_play' && eng.keys['KeyW'])) ky -= 1;
          if (eng.keys['ArrowDown'] || (gameMode !== 'pass_play' && eng.keys['KeyS'])) ky += 1;

          if (kx !== 0 && ky !== 0) {
            kx *= 0.7071;
            ky *= 0.7071;
          }

          p1.vx = kx * spd;
          p1.vy = ky * spd;
          p1.x += p1.vx * dt;
          p1.y += p1.vy * dt;
        }
      }

      // Player 1 Bounds Constraint (Bottom Half)
      const p1MinX = TABLE_PADDING + p1.radius;
      const p1MaxX = V_WIDTH - TABLE_PADDING - p1.radius;
      const p1MinY = V_HEIGHT / 2 + p1.radius + 8;
      const p1MaxY = V_HEIGHT - TABLE_PADDING - p1.radius;

      p1.x = Math.max(p1MinX, Math.min(p1MaxX, p1.x));
      p1.y = Math.max(p1MinY, Math.min(p1MaxY, p1.y));
      p1.vx = (p1.x - p1.prevX) / (dt || 0.016);
      p1.vy = (p1.y - p1.prevY) / (dt || 0.016);

      // --- PLAYER 2 / AI CONTROLS ---
      const p2 = eng.p2;
      p2.prevX = p2.x;
      p2.prevY = p2.y;

      if (p2.freezeTimer <= 0) {
        if (gameMode === 'pass_play') {
          if (eng.p2Target) {
            const dx = eng.p2Target.x - p2.x;
            const dy = eng.p2Target.y - p2.y;
            p2.vx = dx * 18;
            p2.vy = dy * 18;
            p2.x += dx * 0.45;
            p2.y += dy * 0.45;
          } else {
            const spd = 620;
            let kx = 0;
            let ky = 0;
            if (eng.keys['KeyA']) kx -= 1;
            if (eng.keys['KeyD']) kx += 1;
            if (eng.keys['KeyW']) ky -= 1;
            if (eng.keys['KeyS']) ky += 1;

            if (kx !== 0 && ky !== 0) {
              kx *= 0.7071;
              ky *= 0.7071;
            }

            p2.vx = kx * spd;
            p2.vy = ky * spd;
            p2.x += p2.vx * dt;
            p2.y += p2.vy * dt;
          }
        } else {
          // Smart AI Logic
          const botConf = BOT_PROFILES[difficulty];
          const closestPuck = eng.pucks.reduce((closest, p) => {
            if (!closest) return p;
            return p.y < closest.y ? p : closest;
          }, eng.pucks[0]);

          let targetX = V_WIDTH / 2;
          let targetY = 140;

          if (closestPuck) {
            if (closestPuck.y < V_HEIGHT / 2 + 60) {
              const leadTime = Math.min(0.2, (closestPuck.y - p2.y) / (closestPuck.vy || 1));
              const predictedX = closestPuck.x + closestPuck.vx * leadTime;

              targetX = predictedX;
              if (closestPuck.y > p2.y) {
                targetY = closestPuck.y + 10;
              } else {
                targetY = Math.max(TABLE_PADDING + p2.radius + 20, closestPuck.y - 45);
              }
            } else {
              targetX = V_WIDTH / 2 + (closestPuck.x - V_WIDTH / 2) * 0.65;
              targetY = 110;
            }
          }

          const maxSpeed = botConf.speed * 60;
          const toX = targetX - p2.x;
          const toY = targetY - p2.y;
          const dist = Math.hypot(toX, toY);

          if (dist > 2) {
            const step = Math.min(dist, maxSpeed * dt);
            p2.x += (toX / dist) * step;
            p2.y += (toY / dist) * step;
          }
        }
      }

      // Player 2 Bounds Constraint (Top Half)
      const p2MinX = TABLE_PADDING + p2.radius;
      const p2MaxX = V_WIDTH - TABLE_PADDING - p2.radius;
      const p2MinY = TABLE_PADDING + p2.radius;
      const p2MaxY = V_HEIGHT / 2 - p2.radius - 8;

      p2.x = Math.max(p2MinX, Math.min(p2MaxX, p2.x));
      p2.y = Math.max(p2MinY, Math.min(p2MaxY, p2.y));
      p2.vx = (p2.x - p2.prevX) / (dt || 0.016);
      p2.vy = (p2.y - p2.prevY) / (dt || 0.016);

      // --- PUCKS PHYSICS & COLLISIONS ---
      eng.pucks.forEach((puck) => {
        puck.vx *= 0.993;
        puck.vy *= 0.993;

        const speed = Math.hypot(puck.vx, puck.vy);
        const maxPuckSpeed = puck.speedBoostTimer > 0 ? 34 : 26;
        if (speed > maxPuckSpeed) {
          puck.vx = (puck.vx / speed) * maxPuckSpeed;
          puck.vy = (puck.vy / speed) * maxPuckSpeed;
        }

        puck.x += puck.vx;
        puck.y += puck.vy;

        if (puck.trail.length > 10) puck.trail.shift();
        puck.trail.push({ x: puck.x, y: puck.y, alpha: 1.0 });

        const minX = TABLE_PADDING + puck.radius;
        const maxX = V_WIDTH - TABLE_PADDING - puck.radius;

        if (puck.x <= minX) {
          puck.x = minX;
          puck.vx = -puck.vx * 0.88;
          sound.playPuckWallBounce();
          createWallSparks(puck.x, puck.y, 1, 0, curTheme.accent);
        } else if (puck.x >= maxX) {
          puck.x = maxX;
          puck.vx = -puck.vx * 0.88;
          sound.playPuckWallBounce();
          createWallSparks(puck.x, puck.y, -1, 0, curTheme.accent);
        }

        const goalLeft = (V_WIDTH - GOAL_WIDTH) / 2;
        const goalRight = (V_WIDTH + GOAL_WIDTH) / 2;
        const inGoalSlot = puck.x >= goalLeft && puck.x <= goalRight;

        // Top Goal
        const minY = TABLE_PADDING + puck.radius;
        if (puck.y <= minY) {
          const isShieldActive = eng.p2.shieldTimer > 0;
          if (inGoalSlot && !isShieldActive) {
            handleGoal('p1');
            return;
          } else {
            puck.y = minY;
            puck.vy = -puck.vy * 0.88;
            sound.playPuckWallBounce();
            createWallSparks(puck.x, puck.y, 0, 1, curTheme.p2Color);
          }
        }

        // Bottom Goal
        const maxY = V_HEIGHT - TABLE_PADDING - puck.radius;
        if (puck.y >= maxY) {
          const isShieldActive = eng.p1.shieldTimer > 0;
          if (inGoalSlot && !isShieldActive) {
            handleGoal('p2');
            return;
          } else {
            puck.y = maxY;
            puck.vy = -puck.vy * 0.88;
            sound.playPuckWallBounce();
            createWallSparks(puck.x, puck.y, 0, -1, curTheme.p1Color);
          }
        }

        // Mallet Collisions
        [eng.p1, eng.p2].forEach((mallet) => {
          const dx = puck.x - mallet.x;
          const dy = puck.y - mallet.y;
          const dist = Math.hypot(dx, dy);
          const minDist = mallet.radius + puck.radius;

          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;

            const overlap = minDist - dist;
            puck.x += nx * overlap;
            puck.y += ny * overlap;

            const rvx = puck.vx - mallet.vx * 0.05;
            const rvy = puck.vy - mallet.vy * 0.05;
            const velAlongNormal = rvx * nx + rvy * ny;

            if (velAlongNormal < 0) {
              const restitution = 1.35;
              const impulse = -(1 + restitution) * velAlongNormal;

              puck.vx += nx * impulse + mallet.vx * 0.035;
              puck.vy += ny * impulse + mallet.vy * 0.035;

              const strikeSpeed = Math.hypot(puck.vx, puck.vy);
              sound.playPuckMalletHit(strikeSpeed / 10);

              if (strikeSpeed > 16) {
                eng.shake = Math.min(8, strikeSpeed * 0.3);
              }

              eng.shockwaves.push({
                x: mallet.x + nx * mallet.radius,
                y: mallet.y + ny * mallet.radius,
                radius: 8,
                maxRadius: 42,
                color: mallet.color,
                alpha: 0.9,
              });

              for (let i = 0; i < 12; i++) {
                const spd = 3 + Math.random() * 5;
                const angle = Math.atan2(ny, nx) + (Math.random() - 0.5) * 1.2;
                eng.particles.push({
                  x: puck.x,
                  y: puck.y,
                  vx: Math.cos(angle) * spd,
                  vy: Math.sin(angle) * spd,
                  size: 3 + Math.random() * 2.5,
                  color: mallet.color,
                  alpha: 1,
                  decay: 0.04,
                });
              }
            }
          }
        });

        // PowerUp Interceptions
        for (let i = eng.powerUps.length - 1; i >= 0; i--) {
          const pu = eng.powerUps[i];
          const dist = Math.hypot(puck.x - pu.x, puck.y - pu.y);
          if (dist < puck.radius + pu.radius) {
            const beneficiary = puck.vy < 0 ? 'p1' : 'p2';
            activatePowerUp(pu, beneficiary);
            eng.powerUps.splice(i, 1);
          }
        }

        // Target Practice Collisions
        if (gameMode === 'target_practice') {
          for (let i = eng.targets.length - 1; i >= 0; i--) {
            const tgt = eng.targets[i];
            const dist = Math.hypot(puck.x - tgt.x, puck.y - tgt.y);
            if (dist < puck.radius + tgt.radius) {
              tgt.hp -= 1;
              puck.vx = -puck.vx * 0.9;
              puck.vy = -puck.vy * 0.9;
              sound.playPuckWallBounce();

              if (tgt.hp <= 0) {
                sound.playTargetHit();
                setPracticeScore((prev) => prev + tgt.points);
                for (let k = 0; k < 16; k++) {
                  const angle = (Math.PI * 2 * k) / 16;
                  const spd = 4 + Math.random() * 4;
                  eng.particles.push({
                    x: tgt.x,
                    y: tgt.y,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    size: 3.5,
                    color: tgt.color,
                    alpha: 1,
                    decay: 0.035,
                  });
                }
                eng.targets.splice(i, 1);

                if (eng.targets.length === 0) {
                  spawnPracticeTargets();
                  sound.playWin();
                }
              }
            }
          }
        }
      });

      // Target Practice Countdown Timer
      if (gameMode === 'target_practice') {
        setPracticeTimeLeft((prev) => {
          const next = prev - dt;
          if (next <= 0) {
            setGameState('gameover');
            sound.playGameOver();
            return 0;
          }
          return next;
        });
      }

      // Update Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) eng.particles.splice(i, 1);
      }

      // Update Shockwaves
      for (let i = eng.shockwaves.length - 1; i >= 0; i--) {
        const sw = eng.shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.2;
        sw.alpha -= 0.05;
        if (sw.alpha <= 0) eng.shockwaves.splice(i, 1);
      }

      if (eng.shake > 0) eng.shake *= 0.88;
    };

    const createWallSparks = (x: number, y: number, nx: number, ny: number, color: string) => {
      const eng = engineRef.current;
      for (let i = 0; i < 7; i++) {
        const spd = 2 + Math.random() * 4;
        const angle = Math.atan2(ny, nx) + (Math.random() - 0.5) * 1.5;
        eng.particles.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          size: 2.5 + Math.random() * 2,
          color,
          alpha: 1,
          decay: 0.045,
        });
      }
    };

    const handleGoal = (scorer: 'p1' | 'p2') => {
      sound.playAirHockeyGoalHorn();
      setGoalScorer(scorer);
      setGameState('goal');

      const eng = engineRef.current;
      eng.shake = 12;

      if (scorer === 'p1') {
        const nextScore = p1Score + 1;
        setP1Score(nextScore);
        eng.p1.score = nextScore;
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });

        if (nextScore >= targetScore && gameMode !== 'target_practice') {
          handleMatchWon('p1');
          return;
        }
      } else {
        const nextScore = p2Score + 1;
        setP2Score(nextScore);
        eng.p2.score = nextScore;

        if (nextScore >= targetScore && gameMode !== 'target_practice') {
          handleMatchWon('p2');
          return;
        }
      }

      setTimeout(() => {
        setGoalScorer(null);
        setGameState('playing');
        resetPuck(scorer === 'p1' ? 'p2' : 'p1');
      }, 1400);
    };

    const handleMatchWon = (winnerPlayer: 'p1' | 'p2') => {
      setWinner(winnerPlayer);
      setGameState('gameover');
      if (winnerPlayer === 'p1') {
        sound.playWin();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      } else {
        sound.playGameOver();
      }
    };

    // --- RENDER PASS ---
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const eng = engineRef.current;
      const curTheme = THEMES[theme];

      ctx.save();
      if (eng.shake > 0.5) {
        ctx.translate((Math.random() - 0.5) * eng.shake, (Math.random() - 0.5) * eng.shake);
      }

      // 1. Table Background
      ctx.fillStyle = curTheme.bgGradEnd;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      const tableGrad = ctx.createRadialGradient(
        V_WIDTH / 2,
        V_HEIGHT / 2,
        40,
        V_WIDTH / 2,
        V_HEIGHT / 2,
        V_HEIGHT / 1.5
      );
      tableGrad.addColorStop(0, curTheme.bgGradStart);
      tableGrad.addColorStop(1, curTheme.bgGradEnd);

      ctx.fillStyle = tableGrad;
      ctx.fillRect(TABLE_PADDING, TABLE_PADDING, V_WIDTH - TABLE_PADDING * 2, V_HEIGHT - TABLE_PADDING * 2);

      // 2. Table Markings & Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = TABLE_PADDING; x <= V_WIDTH - TABLE_PADDING; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, TABLE_PADDING);
        ctx.lineTo(x, V_HEIGHT - TABLE_PADDING);
        ctx.stroke();
      }
      for (let y = TABLE_PADDING; y <= V_HEIGHT - TABLE_PADDING; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(TABLE_PADDING, y);
        ctx.lineTo(V_WIDTH - TABLE_PADDING, y);
        ctx.stroke();
      }

      // Center Line
      ctx.strokeStyle = curTheme.centerLine;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(TABLE_PADDING, V_HEIGHT / 2);
      ctx.lineTo(V_WIDTH - TABLE_PADDING, V_HEIGHT / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center Ring
      ctx.beginPath();
      ctx.arc(V_WIDTH / 2, V_HEIGHT / 2, 75, 0, Math.PI * 2);
      ctx.strokeStyle = curTheme.centerLine;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(V_WIDTH / 2, V_HEIGHT / 2, 8, 0, Math.PI * 2);
      ctx.fillStyle = curTheme.accent;
      ctx.fill();

      // Goal Creases
      ctx.beginPath();
      ctx.arc(V_WIDTH / 2, TABLE_PADDING, 100, 0, Math.PI);
      ctx.strokeStyle = curTheme.p2Glow;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(V_WIDTH / 2, V_HEIGHT - TABLE_PADDING, 100, Math.PI, 0);
      ctx.strokeStyle = curTheme.p1Glow;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Outer Rink Border Glow
      ctx.strokeStyle = curTheme.tableBorder;
      ctx.lineWidth = 5;
      ctx.shadowColor = curTheme.tableBorder;
      ctx.shadowBlur = 14;
      ctx.strokeRect(TABLE_PADDING, TABLE_PADDING, V_WIDTH - TABLE_PADDING * 2, V_HEIGHT - TABLE_PADDING * 2);
      ctx.shadowBlur = 0;

      // 3. Goal Slots
      const goalLeft = (V_WIDTH - GOAL_WIDTH) / 2;

      // Top Goal (P2)
      ctx.fillStyle = '#000000';
      ctx.fillRect(goalLeft, TABLE_PADDING - GOAL_DEPTH, GOAL_WIDTH, GOAL_DEPTH);
      ctx.strokeStyle = curTheme.p2Color;
      ctx.lineWidth = 3;
      ctx.strokeRect(goalLeft, TABLE_PADDING - GOAL_DEPTH, GOAL_WIDTH, GOAL_DEPTH);

      // Bottom Goal (P1)
      ctx.fillStyle = '#000000';
      ctx.fillRect(goalLeft, V_HEIGHT - TABLE_PADDING, GOAL_WIDTH, GOAL_DEPTH);
      ctx.strokeStyle = curTheme.p1Color;
      ctx.lineWidth = 3;
      ctx.strokeRect(goalLeft, V_HEIGHT - TABLE_PADDING, GOAL_WIDTH, GOAL_DEPTH);

      // Laser Goal Barriers
      if (eng.p2.shieldTimer > 0) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(goalLeft, TABLE_PADDING);
        ctx.lineTo(goalLeft + GOAL_WIDTH, TABLE_PADDING);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      if (eng.p1.shieldTimer > 0) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(goalLeft, V_HEIGHT - TABLE_PADDING);
        ctx.lineTo(goalLeft + GOAL_WIDTH, V_HEIGHT - TABLE_PADDING);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 4. PowerUps
      eng.powerUps.forEach((pu) => {
        pu.pulse += 0.05;
        const scale = 1 + Math.sin(pu.pulse) * 0.12;

        ctx.save();
        ctx.translate(pu.x, pu.y);
        ctx.scale(scale, scale);

        ctx.beginPath();
        ctx.arc(0, 0, pu.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fill();
        ctx.strokeStyle = pu.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = pu.color;
        ctx.shadowBlur = 12;
        ctx.stroke();

        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pu.icon, 0, 1);
        ctx.restore();
      });

      // 5. Practice Targets
      if (gameMode === 'target_practice') {
        eng.targets.forEach((tgt) => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(tgt.x, tgt.y, tgt.radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fill();
          ctx.strokeStyle = tgt.color;
          ctx.lineWidth = 3;
          ctx.shadowColor = tgt.color;
          ctx.shadowBlur = 12;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(tgt.x, tgt.y, tgt.radius * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = tgt.color;
          ctx.fill();
          ctx.restore();
        });
      }

      // 6. Shockwaves
      eng.shockwaves.forEach((sw) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      });

      // 7. Particles
      eng.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 8. Pucks
      eng.pucks.forEach((puck) => {
        puck.trail.forEach((t, idx) => {
          const ratio = (idx + 1) / puck.trail.length;
          ctx.save();
          ctx.globalAlpha = ratio * 0.4;
          ctx.fillStyle = puck.color;
          ctx.beginPath();
          ctx.arc(t.x, t.y, puck.radius * ratio * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        ctx.save();
        ctx.beginPath();
        ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        const puckGrad = ctx.createRadialGradient(puck.x, puck.y, 2, puck.x, puck.y, puck.radius);
        puckGrad.addColorStop(0, '#ffffff');
        puckGrad.addColorStop(0.4, puck.color);
        puckGrad.addColorStop(1, '#0f172a');

        ctx.fillStyle = puckGrad;
        ctx.beginPath();
        ctx.arc(puck.x, puck.y, puck.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = puck.color;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = puck.glowColor;
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();
      });

      // 9. Mallets
      [eng.p1, eng.p2].forEach((m) => {
        ctx.save();

        if (m.freezeTimer > 0) {
          ctx.strokeStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 18;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (m.megaTimer > 0) {
          ctx.strokeStyle = '#00ff66';
          ctx.shadowColor = '#00ff66';
          ctx.shadowBlur = 20;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.radius + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#090d16';
        ctx.fill();

        const malletGrad = ctx.createRadialGradient(m.x, m.y, 4, m.x, m.y, m.radius);
        malletGrad.addColorStop(0, '#ffffff');
        malletGrad.addColorStop(0.3, m.color);
        malletGrad.addColorStop(0.8, '#0f172a');
        malletGrad.addColorStop(1, '#05070c');

        ctx.fillStyle = malletGrad;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius * 0.85, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#05070c';
        ctx.fill();
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = m.color;
        ctx.lineWidth = 4;
        ctx.shadowColor = m.glowColor;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      });

      // 10. Goal Flash Overlay
      if (gameState === 'goal' && goalScorer) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

        ctx.font = '900 44px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const color = goalScorer === 'p1' ? curTheme.p1Color : curTheme.p2Color;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 24;

        const scorerName =
          goalScorer === 'p1'
            ? 'PLAYER 1 GOAL!'
            : gameMode === 'pass_play'
            ? 'PLAYER 2 GOAL!'
            : `${BOT_PROFILES[difficulty].name.toUpperCase()} GOAL!`;

        ctx.fillText('⚡ GOAL! ⚡', V_WIDTH / 2, V_HEIGHT / 2 - 20);
        ctx.font = '700 18px Inter, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(scorerName, V_WIDTH / 2, V_HEIGHT / 2 + 25);
        ctx.restore();
      }

      ctx.restore();
    };

    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      updatePhysics(dt);
      render();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, gameMode, difficulty, theme, targetScore, p1Score, p2Score, goalScorer, resetPuck]);

  // Desktop Mouse Handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Pointer type touch is handled natively via touch listener
    if (e.pointerType === 'touch') return;
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (gameMode === 'pass_play') {
      if (y > V_HEIGHT / 2) {
        engineRef.current.p1Target = { x, y };
      } else {
        engineRef.current.p2Target = { x, y };
      }
    } else {
      if (y > V_HEIGHT / 2 - 40) {
        engineRef.current.p1Target = { x, y };
      }
    }
  };

  return (
    <div
      ref={containerRef}
      id="cyber-air-hockey-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1"
    >
      {/* Compact Top HUD / Scoreboard (Mobile Optimized) */}
      <div className="w-full mb-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md flex items-center justify-between shadow-xl shadow-cyan-950/40">
        {/* P2 / Bot Profile */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
            {gameMode === 'pass_play' ? <Users className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-pink-400 truncate max-w-[90px] sm:max-w-none">
              {gameMode === 'pass_play' ? 'P2' : BOT_PROFILES[difficulty].name.split(' ')[0]}
            </div>
            <div className="text-xl sm:text-2xl font-black text-white leading-none">{p2Score}</div>
          </div>
        </div>

        {/* Center Target & In-game Quick Menu */}
        <div className="flex items-center gap-2">
          {gameMode === 'target_practice' ? (
            <div className="text-center">
              <div className="text-[10px] sm:text-xs uppercase font-bold text-amber-400 flex items-center justify-center gap-1">
                <Target className="w-3 h-3" /> Time
              </div>
              <div className="text-base sm:text-lg font-black text-white leading-none">{Math.ceil(practiceTimeLeft)}s</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Goal Target</div>
              <div className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] sm:text-xs font-bold text-cyan-300 leading-tight">
                {targetScore} PTS
              </div>
            </div>
          )}

          {gameState === 'playing' && (
            <button
              onClick={() => setGameState('menu')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Menu / Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* P1 Profile */}
        <div className="flex items-center gap-2 text-right">
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-cyan-400">Player 1</div>
            <div className="text-xl sm:text-2xl font-black text-white leading-none">{p1Score}</div>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Responsive Canvas Table Stage */}
      <div className="relative w-full max-w-[460px] aspect-[540/860] max-h-[74vh] sm:max-h-[82vh] flex items-center justify-center rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-black touch-none">
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          onPointerMove={handlePointerMove}
          className="w-full h-full object-contain block touch-none cursor-crosshair"
        />

        {/* In-Game Active Buff Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none text-[10px]">
          {engineRef.current.p2.shieldTimer > 0 && (
            <div className="px-2 py-0.5 rounded bg-pink-500/30 border border-pink-500 text-pink-300 font-bold flex items-center gap-1 animate-pulse">
              <Shield className="w-3 h-3" /> P2 Barrier ({Math.ceil(engineRef.current.p2.shieldTimer)}s)
            </div>
          )}
          {engineRef.current.p2.freezeTimer > 0 && (
            <div className="px-2 py-0.5 rounded bg-cyan-500/30 border border-cyan-500 text-cyan-300 font-bold flex items-center gap-1">
              ❄️ P2 Frozen
            </div>
          )}
        </div>

        <div className="absolute bottom-2.5 left-2.5 flex flex-col gap-1 pointer-events-none text-[10px]">
          {engineRef.current.p1.shieldTimer > 0 && (
            <div className="px-2 py-0.5 rounded bg-cyan-500/30 border border-cyan-500 text-cyan-300 font-bold flex items-center gap-1 animate-pulse">
              <Shield className="w-3 h-3" /> P1 Barrier ({Math.ceil(engineRef.current.p1.shieldTimer)}s)
            </div>
          )}
          {engineRef.current.p1.megaTimer > 0 && (
            <div className="px-2 py-0.5 rounded bg-emerald-500/30 border border-emerald-500 text-emerald-300 font-bold flex items-center gap-1">
              🔨 Mega Striker
            </div>
          )}
          {engineRef.current.p1.freezeTimer > 0 && (
            <div className="px-2 py-0.5 rounded bg-pink-500/30 border border-pink-500 text-pink-300 font-bold flex items-center gap-1">
              ❄️ You are Frozen
            </div>
          )}
        </div>

        {/* Start / Menu Modal Overlay (Mobile Responsive Scrollable) */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-start p-3 sm:p-5 text-center overflow-y-auto z-20 space-y-3 sm:space-y-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mt-1 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 p-0.5 shadow-xl shadow-cyan-500/30 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400 animate-bounce" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
                <Crown className="w-3 h-3 text-amber-400" /> PREMIUM ESPORTS
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                CYBER AIR HOCKEY <span className="text-cyan-400">PRO</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mx-auto">
                Touch & drag your glowing striker to smash goals!
              </p>
            </div>

            {/* Game Mode Selector */}
            <div className="w-full max-w-xs space-y-1.5">
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-left">
                Select Mode
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setGameMode('vs_ai')}
                  className={`p-2 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    gameMode === 'vs_ai'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" /> VS Bot AI
                </button>
                <button
                  onClick={() => setGameMode('pass_play')}
                  className={`p-2 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    gameMode === 'pass_play'
                      ? 'bg-pink-500/20 border-pink-400 text-pink-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> 2P Split Duel
                </button>
                <button
                  onClick={() => setGameMode('tournament')}
                  className={`p-2 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    gameMode === 'tournament'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" /> Tournament Cup
                </button>
                <button
                  onClick={() => setGameMode('target_practice')}
                  className={`p-2 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    gameMode === 'target_practice'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" /> Target Rush
                </button>
              </div>
            </div>

            {/* Difficulty Selector (If VS AI) */}
            {gameMode === 'vs_ai' && (
              <div className="w-full max-w-xs space-y-1">
                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-left">
                  Bot Difficulty
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(['easy', 'medium', 'hard', 'godlike'] as AIDifficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-1 rounded-lg border text-[10px] sm:text-xs font-bold capitalize transition-all ${
                        difficulty === d
                          ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-black'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {BOT_PROFILES[d].title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Table Theme Selector */}
            <div className="w-full max-w-xs space-y-1">
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-left">
                Felt Theme
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(Object.keys(THEMES) as TableTheme[]).map((th) => (
                  <button
                    key={th}
                    onClick={() => setTheme(th)}
                    className={`py-1 rounded-lg border text-[10px] sm:text-xs font-bold capitalize transition-all ${
                      theme === th
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {THEMES[th].name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Goals Target Selector */}
            {gameMode !== 'target_practice' && (
              <div className="w-full max-w-xs space-y-1">
                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-left">
                  First To
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[3, 5, 7, 10].map((sc) => (
                    <button
                      key={sc}
                      onClick={() => setTargetScore(sc)}
                      className={`py-1 rounded-lg border text-[10px] sm:text-xs font-bold transition-all ${
                        targetScore === sc
                          ? 'bg-cyan-600 border-cyan-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sc} Goals
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={() => startMatch()}
              className="w-full max-w-xs py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-sm sm:text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              START MATCH
            </button>
          </div>
        )}

        {/* Game Over / Victory Modal */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-3 sm:space-y-4 animate-fade-in z-20 overflow-y-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0">
              {winner === 'p1' ? (
                <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 animate-bounce" />
              ) : (
                <Award className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400" />
              )}
            </div>

            <div>
              <div className="text-[10px] sm:text-xs uppercase font-bold text-slate-400 tracking-wider mb-0.5">
                Match Concluded
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {gameMode === 'target_practice'
                  ? 'TIME EXPIRED!'
                  : winner === 'p1'
                  ? 'VICTORY! YOU WON!'
                  : gameMode === 'pass_play'
                  ? 'PLAYER 2 WINS!'
                  : 'AI BOT WINS!'}
              </h2>
              {gameMode === 'target_practice' ? (
                <div className="text-xs sm:text-sm font-bold text-amber-400 mt-1">Final Score: {practiceScore} Pts</div>
              ) : (
                <div className="text-xs sm:text-sm text-slate-300 mt-1">
                  Final Score: <span className="font-bold text-cyan-400">{p1Score}</span> -{' '}
                  <span className="font-bold text-pink-400">{p2Score}</span>
                </div>
              )}
            </div>

            {gameMode === 'tournament' && winner === 'p1' && tournamentRound < 3 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] sm:text-xs font-bold">
                🎉 Round {tournamentRound} Cleared! Advancing to {tournamentBots[tournamentRound].stage}...
              </div>
            )}

            <div className="flex flex-col gap-2 w-full max-w-xs">
              {gameMode === 'tournament' && winner === 'p1' && tournamentRound < 3 ? (
                <button
                  onClick={() => {
                    const nextRound = tournamentRound + 1;
                    setTournamentRound(nextRound);
                    startMatch('tournament', tournamentBots[nextRound - 1].diff);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/30 flex items-center justify-center gap-1.5 hover:scale-105 transition-all"
                >
                  NEXT TOURNAMENT ROUND <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => startMatch()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-1.5 hover:scale-105 transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> REMATCH
                </button>
              )}

              <button
                onClick={() => setGameState('menu')}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs transition-colors"
              >
                Return to Menu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Quick Controls */}
      <div className="w-full mt-2 flex items-center justify-between text-xs text-slate-400">
        <div className="text-[11px] text-slate-400">
          📱 <span className="text-cyan-300 font-medium">Touch & drag</span> to strike
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const isMute = sound.toggleMute();
              setMuted(isMute);
            }}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={() => setGameState('menu')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold flex items-center gap-1 text-[11px] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Menu
          </button>
        </div>
      </div>
    </div>
  );
};
