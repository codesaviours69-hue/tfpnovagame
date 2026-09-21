import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, RotateCcw, Volume2, VolumeX, Sparkles, Trophy, Zap, 
  Flame, Gauge, Award, ChevronRight, Star, Compass, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Flag
} from 'lucide-react';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// TYPES & DATA STRUCTURES
// ----------------------------------------------------
export interface CyberBike {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  unlocked: boolean;
  color: string;
  accentColor: string;
  wheelColor: string;
  topSpeed: number;
  acceleration: number;
  agility: number;
  suspension: number;
}

export const CYBER_BIKES: CyberBike[] = [
  {
    id: 'tron-lightcycle',
    name: 'Neon Tron Lightcycle',
    subtitle: 'Balanced All-Rounder',
    price: 0,
    unlocked: true,
    color: '#00f0ff',
    accentColor: '#38bdf8',
    wheelColor: '#00f0ff',
    topSpeed: 23,
    acceleration: 0.9,
    agility: 1.0,
    suspension: 1.0,
  },
  {
    id: 'dirt-ripper',
    name: 'Cyber Dirt Ripper',
    subtitle: 'Extreme Shock Absorption',
    price: 300,
    unlocked: false,
    color: '#10b981',
    accentColor: '#34d399',
    wheelColor: '#10b981',
    topSpeed: 25,
    acceleration: 1.0,
    agility: 1.1,
    suspension: 1.3,
  },
  {
    id: 'plasma-speeder',
    name: 'Turbo Plasma Speeder',
    subtitle: 'Maximum Straight-Line Nitro',
    price: 650,
    unlocked: false,
    color: '#f43f5e',
    accentColor: '#fb7185',
    wheelColor: '#f43f5e',
    topSpeed: 29,
    acceleration: 1.15,
    agility: 1.15,
    suspension: 1.0,
  },
  {
    id: 'quantum-hover',
    name: 'Quantum Hover-Bike',
    subtitle: 'Low-Gravity Air Glider',
    price: 1100,
    unlocked: false,
    color: '#a855f7',
    accentColor: '#c084fc',
    wheelColor: '#a855f7',
    topSpeed: 27,
    acceleration: 1.05,
    agility: 1.35,
    suspension: 1.2,
  },
  {
    id: 'ninja-phantom',
    name: 'Shadow Ninja Phantom',
    subtitle: '720° Stunt Spin Master',
    price: 1600,
    unlocked: false,
    color: '#eab308',
    accentColor: '#fde047',
    wheelColor: '#eab308',
    topSpeed: 26,
    acceleration: 1.1,
    agility: 1.55,
    suspension: 1.1,
  },
  {
    id: 'magma-titan',
    name: 'Magma Titan 9000',
    subtitle: 'Heavy Hazard Breaker',
    price: 2400,
    unlocked: false,
    color: '#f97316',
    accentColor: '#fb923c',
    wheelColor: '#f97316',
    topSpeed: 31,
    acceleration: 1.25,
    agility: 1.2,
    suspension: 1.4,
  },
];

interface Point {
  x: number;
  y: number;
}

interface StuntToast {
  id: number;
  text: string;
  points: number;
  color: string;
}

interface Hazard {
  type: 'saw' | 'tnt' | 'spring' | 'boost';
  x: number;
  y: number;
  radius: number;
  active: boolean;
  angle?: number;
}

interface LevelData {
  id: number;
  name: string;
  subtitle: string;
  points: Point[];
  hazards: Hazard[];
  checkpoints: number[];
  finishX: number;
  parTime: number;
}

// ----------------------------------------------------
// PROCEDURAL LEVEL GEOMETRY GENERATOR (5 FULL TRACKS)
// ----------------------------------------------------
const generateLevel = (levelIndex: number): LevelData => {
  const points: Point[] = [];
  const hazards: Hazard[] = [];
  const checkpoints: number[] = [];

  let curX = 0;
  let curY = 420;
  points.push({ x: curX, y: curY });

  // Safe Starting Runway
  for (let i = 0; i < 5; i++) {
    curX += 90;
    points.push({ x: curX, y: curY });
  }

  if (levelIndex === 1) {
    // Track 1: Cyber Highway Overpass
    checkpoints.push(curX);

    // Ramp Jump 1
    curX += 140; curY -= 60; points.push({ x: curX, y: curY });
    curX += 120; curY -= 80; points.push({ x: curX, y: curY });
    // Landing Downslope
    curX += 220; curY += 140; points.push({ x: curX, y: curY });
    curX += 160; curY += 0; points.push({ x: curX, y: curY });
    hazards.push({ type: 'boost', x: curX - 60, y: curY - 10, radius: 24, active: true });

    // Checkpoint 1
    checkpoints.push(curX);

    // Spring Catapult & High Chasm
    curX += 160; curY -= 60; points.push({ x: curX, y: curY });
    hazards.push({ type: 'spring', x: curX - 30, y: curY - 10, radius: 20, active: true });
    curX += 280; curY += 60; points.push({ x: curX, y: curY });
    curX += 180; curY += 0; points.push({ x: curX, y: curY });

    // Final Mega Ramp
    curX += 160; curY -= 100; points.push({ x: curX, y: curY });
    curX += 280; curY += 100; points.push({ x: curX, y: curY });
    for (let i = 0; i < 4; i++) {
      curX += 100; points.push({ x: curX, y: curY });
    }
  } else if (levelIndex === 2) {
    // Track 2: Neon Rooftop Loopings
    checkpoints.push(curX);
    hazards.push({ type: 'boost', x: curX + 100, y: curY - 10, radius: 24, active: true });

    // Approach Ramp & Big Incline
    curX += 200; curY -= 80; points.push({ x: curX, y: curY });
    curX += 180; curY -= 60; points.push({ x: curX, y: curY });
    curX += 240; curY += 140; points.push({ x: curX, y: curY });
    curX += 160; curY += 0; points.push({ x: curX, y: curY });

    checkpoints.push(curX);
    hazards.push({ type: 'saw', x: curX + 120, y: curY - 25, radius: 24, active: true, angle: 0 });

    curX += 180; curY -= 90; points.push({ x: curX, y: curY });
    curX += 260; curY += 90; points.push({ x: curX, y: curY });
    curX += 180; curY -= 110; points.push({ x: curX, y: curY });
    curX += 300; curY += 110; points.push({ x: curX, y: curY });
    for (let i = 0; i < 4; i++) {
      curX += 100; points.push({ x: curX, y: curY });
    }
  } else if (levelIndex === 3) {
    // Track 3: Industrial Laser Canyon
    checkpoints.push(curX);
    curX += 160; curY -= 70; points.push({ x: curX, y: curY });
    hazards.push({ type: 'tnt', x: curX + 90, y: curY - 12, radius: 18, active: true });
    curX += 240; curY += 70; points.push({ x: curX, y: curY });

    checkpoints.push(curX);
    hazards.push({ type: 'saw', x: curX + 130, y: curY - 35, radius: 26, active: true, angle: 0 });
    curX += 280; curY -= 110; points.push({ x: curX, y: curY });
    hazards.push({ type: 'spring', x: curX - 20, y: curY - 10, radius: 20, active: true });

    curX += 340; curY += 110; points.push({ x: curX, y: curY });
    checkpoints.push(curX);

    curX += 180; curY -= 120; points.push({ x: curX, y: curY });
    hazards.push({ type: 'boost', x: curX, y: curY - 10, radius: 24, active: true });
    curX += 360; curY += 120; points.push({ x: curX, y: curY });
    for (let i = 0; i < 4; i++) {
      curX += 100; points.push({ x: curX, y: curY });
    }
  } else if (levelIndex === 4) {
    // Track 4: Gravity Flux Matrix
    checkpoints.push(curX);
    hazards.push({ type: 'boost', x: curX + 80, y: curY - 10, radius: 24, active: true });
    curX += 200; curY -= 130; points.push({ x: curX, y: curY });
    curX += 240; curY -= 70; points.push({ x: curX, y: curY });
    curX += 300; curY += 200; points.push({ x: curX, y: curY });

    checkpoints.push(curX);
    hazards.push({ type: 'spring', x: curX + 40, y: curY - 10, radius: 22, active: true });
    curX += 300; curY -= 160; points.push({ x: curX, y: curY });
    hazards.push({ type: 'saw', x: curX + 120, y: curY - 20, radius: 26, active: true, angle: 0 });
    curX += 380; curY += 160; points.push({ x: curX, y: curY });

    checkpoints.push(curX);
    curX += 220; curY -= 140; points.push({ x: curX, y: curY });
    curX += 400; curY += 140; points.push({ x: curX, y: curY });
    for (let i = 0; i < 4; i++) {
      curX += 100; points.push({ x: curX, y: curY });
    }
  } else {
    // Track 5: Volcanic Cyber Core Finale
    checkpoints.push(curX);
    hazards.push({ type: 'boost', x: curX + 70, y: curY - 10, radius: 24, active: true });
    curX += 190; curY -= 120; points.push({ x: curX, y: curY });
    hazards.push({ type: 'tnt', x: curX + 80, y: curY - 12, radius: 18, active: true });
    curX += 250; curY += 100; points.push({ x: curX, y: curY });

    checkpoints.push(curX);
    hazards.push({ type: 'spring', x: curX + 60, y: curY - 10, radius: 22, active: true });
    curX += 280; curY -= 160; points.push({ x: curX, y: curY });
    hazards.push({ type: 'saw', x: curX + 110, y: curY - 45, radius: 28, active: true, angle: 0 });
    curX += 400; curY += 170; points.push({ x: curX, y: curY });

    checkpoints.push(curX);
    hazards.push({ type: 'boost', x: curX + 80, y: curY - 10, radius: 24, active: true });
    curX += 240; curY -= 180; points.push({ x: curX, y: curY });
    curX += 460; curY += 190; points.push({ x: curX, y: curY });
    for (let i = 0; i < 5; i++) {
      curX += 100; points.push({ x: curX, y: curY });
    }
  }

  const finishX = curX - 120;
  const names = [
    '',
    'Cyber Highway Overpass',
    'Neon Rooftop Loopings',
    'Industrial Laser Canyon',
    'Gravity Flux Matrix',
    'Volcanic Cyber Core Finale',
  ];
  const subtitles = [
    '',
    'Ramps, High Airtime & Speed Boosters',
    'Rooftop Drops & Jump Gaps',
    'Spinning Laser Saws & TNT Barrels',
    'Anti-Gravity Springs & Mega Chasms',
    'Ultimate Extreme Trials Master Course',
  ];

  return {
    id: levelIndex,
    name: names[levelIndex] || `Cyber Course #${levelIndex}`,
    subtitle: subtitles[levelIndex] || 'Extreme Trials Physics',
    points,
    hazards,
    checkpoints,
    finishX,
    parTime: 35 + levelIndex * 10,
  };
};

export const CyberMotoTrials: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Game Lifecycle States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'crashed' | 'level_clear' | 'garage'>('menu');
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('cybermoto_coins') || '250', 10);
  });
  const [unlockedBikes, setUnlockedBikes] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cybermoto_unlocked_bikes') || '["tron-lightcycle"]');
    } catch {
      return ['tron-lightcycle'];
    }
  });
  const [activeBikeId, setActiveBikeId] = useState<string>(() => {
    return localStorage.getItem('cybermoto_active_bike') || 'tron-lightcycle';
  });

  const [score, setScore] = useState<number>(0);
  const [stuntToasts, setStuntToasts] = useState<StuntToast[]>([]);
  const [nitro, setNitro] = useState<number>(100);
  const [isNitroActive, setIsNitroActive] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [stars, setStars] = useState<number>(0);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  const activeBike = CYBER_BIKES.find((b) => b.id === activeBikeId) || CYBER_BIKES[0];

  // ----------------------------------------------------
  // ROBUST RIGID-BODY BIKE ENGINE
  // ----------------------------------------------------
  const engineRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    angularVel: number;
    isGrounded: boolean;
    cumRotation: number;
    level: LevelData;
    lastCheckpointX: number;
    lastCheckpointY: number;
    gas: boolean;
    brake: boolean;
    leanLeft: boolean;
    leanRight: boolean;
    nitroTrigger: boolean;
    startTime: number;
    isCrashed: boolean;
    particles: Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number; size: number }>;
  }>({
    x: 120,
    y: 380,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVel: 0,
    isGrounded: true,
    cumRotation: 0,
    level: generateLevel(1),
    lastCheckpointX: 120,
    lastCheckpointY: 380,
    gas: false,
    brake: false,
    leanLeft: false,
    leanRight: false,
    nitroTrigger: false,
    startTime: performance.now(),
    isCrashed: false,
    particles: [],
  });

  // Stunt Notification Badge with Auto Dismiss (Top Non-Obtrusive Pill)
  const addStuntToast = (text: string, points: number, color: string = '#00f0ff') => {
    const id = Date.now() + Math.random();
    setStuntToasts((prev) => [...prev.slice(-1), { id, text, points, color }]);
    setScore((s) => s + points);
    setNitro((n) => Math.min(100, n + 30));
    sound.playStuntFlip();

    setTimeout(() => {
      setStuntToasts((prev) => prev.filter((t) => t.id !== id));
    }, 1200);
  };

  // ----------------------------------------------------
  // TERRAIN EVALUATION
  // ----------------------------------------------------
  const getTerrainAt = (x: number, points: Point[]): { y: number; slopeAngle: number; tangentX: number; tangentY: number } => {
    if (x <= points[0].x) {
      return { y: points[0].y, slopeAngle: 0, tangentX: 1, tangentY: 0 };
    }
    if (x >= points[points.length - 1].x) {
      return { y: points[points.length - 1].y, slopeAngle: 0, tangentX: 1, tangentY: 0 };
    }

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (x >= p1.x && x <= p2.x) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const t = (x - p1.x) / dx;
        const y = p1.y + t * dy;
        const slopeAngle = Math.atan2(dy, dx);
        return { y, slopeAngle, tangentX: dx / len, tangentY: dy / len };
      }
    }

    return { y: 420, slopeAngle: 0, tangentX: 1, tangentY: 0 };
  };

  // ----------------------------------------------------
  // 60 FPS PHYSICS GAME LOOP
  // ----------------------------------------------------
  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);
      if (gameState !== 'playing') {
        renderScene();
        return;
      }

      const eng = engineRef.current;
      if (eng.isCrashed) {
        renderScene();
        return;
      }

      const bike = activeBike;
      const wheelBase = 46;
      const wheelRadius = 18;

      // Update timer & level progress
      const elapsed = Math.floor((performance.now() - eng.startTime) / 1000);
      setElapsedTime(elapsed);
      const totalDist = eng.level.finishX - 120;
      const curDist = Math.max(0, eng.x - 120);
      setProgressPct(Math.min(100, Math.floor((curDist / totalDist) * 100)));

      // Handle Nitro Boost
      let nitroMult = 1.0;
      if (eng.nitroTrigger && nitro > 0) {
        nitroMult = 1.75;
        setNitro((n) => Math.max(0, n - 0.45));
        setIsNitroActive(true);
        // Exhaust Flame Particles
        eng.particles.push({
          x: eng.x - Math.cos(eng.angle) * 32,
          y: eng.y - Math.sin(eng.angle) * 32,
          vx: -Math.cos(eng.angle) * 7 + (Math.random() - 0.5) * 3,
          vy: -Math.sin(eng.angle) * 7 + (Math.random() - 0.5) * 3,
          color: Math.random() > 0.5 ? '#00f0ff' : '#ec4899',
          life: 0,
          maxLife: 18,
          size: Math.random() * 5 + 3,
        });
      } else {
        setIsNitroActive(false);
      }

      // Calculate Rear & Front Wheel Positions
      const rearX = eng.x - Math.cos(eng.angle) * (wheelBase / 2);
      const frontX = eng.x + Math.cos(eng.angle) * (wheelBase / 2);

      const terrainRear = getTerrainAt(rearX, eng.level.points);
      const terrainFront = getTerrainAt(frontX, eng.level.points);
      const terrainCenter = getTerrainAt(eng.x, eng.level.points);

      // Ideal Ground Height for chassis
      const groundCenterY = (terrainRear.y + terrainFront.y) / 2 - wheelRadius;
      const isTouchingGround = eng.y >= groundCenterY - 4;

      if (isTouchingGround) {
        // === ON GROUND PHYSICS ===
        eng.isGrounded = true;
        eng.y = groundCenterY;
        eng.vy = 0;

        // Align chassis angle to terrain slope
        const groundSlope = Math.atan2(terrainFront.y - terrainRear.y, frontX - rearX);
        eng.angle += (groundSlope - eng.angle) * 0.25;
        eng.angularVel = 0;
        eng.cumRotation = 0;

        // Drive Acceleration along terrain tangent
        if (eng.gas) {
          const accel = bike.acceleration * 0.45 * nitroMult;
          eng.vx += terrainCenter.tangentX * accel;
          eng.vy += terrainCenter.tangentY * accel;
        } else if (eng.brake) {
          eng.vx *= 0.92;
        } else {
          eng.vx *= 0.985; // Natural rolling resistance
        }

        // Upward ramp launch detection
        if (eng.vx > 6 && terrainCenter.tangentY < -0.3) {
          eng.vy = terrainCenter.tangentY * eng.vx * 0.85;
        }
      } else {
        // === IN-AIR STUNT PHYSICS ===
        eng.isGrounded = false;
        // Gravity
        eng.vy += 0.55;

        // Air Lean / Stunt Controls
        if (eng.leanLeft) {
          eng.angularVel -= 0.085 * bike.agility;
        }
        if (eng.leanRight) {
          eng.angularVel += 0.085 * bike.agility;
        }

        eng.angularVel *= 0.95;
        eng.angle += eng.angularVel;
        eng.cumRotation += eng.angularVel;

        // Detect 360° Flips
        if (eng.cumRotation >= Math.PI * 1.85) {
          eng.cumRotation -= Math.PI * 2;
          addStuntToast('⚡ FRONTFLIP', 500, '#00f0ff');
        } else if (eng.cumRotation <= -Math.PI * 1.85) {
          eng.cumRotation += Math.PI * 2;
          addStuntToast('🔥 BACKFLIP', 500, '#ff007f');
        }

        // Air Drag
        eng.vx *= 0.996;

        // Landing Impact Check
        if (eng.y >= groundCenterY) {
          const groundSlope = Math.atan2(terrainFront.y - terrainRear.y, frontX - rearX);
          const angleDiff = Math.abs(eng.angle - groundSlope);

          // If upside down -> Crash!
          if (angleDiff > Math.PI * 0.65) {
            handleCrash();
            return;
          }

          // Safe landing
          eng.y = groundCenterY;
          eng.vy = 0;
          eng.angle = groundSlope;
          eng.angularVel = 0;
          eng.cumRotation = 0;
        }
      }

      // Max Speed Clamping
      const maxSpd = bike.topSpeed * nitroMult;
      eng.vx = Math.max(-6, Math.min(maxSpd, eng.vx));

      // Integrate Position
      eng.x += eng.vx;
      eng.y += eng.vy;

      setSpeedKmh(Math.floor(Math.abs(eng.vx) * 5.2));

      // 3. Hazard Collisions
      eng.level.hazards.forEach((hazard) => {
        if (!hazard.active) return;
        const dx = eng.x - hazard.x;
        const dy = eng.y - hazard.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < hazard.radius + 25) {
          if (hazard.type === 'saw' || hazard.type === 'tnt') {
            handleCrash();
          } else if (hazard.type === 'spring') {
            eng.vy = -18;
            eng.vx += 8;
            sound.playSpringBounce();
            addStuntToast('🚀 SPRING LAUNCH', 250, '#38bdf8');
          } else if (hazard.type === 'boost') {
            eng.vx = 26;
            sound.playJump();
            addStuntToast('⚡ MEGA BOOST', 300, '#a855f7');
          }
        }
      });

      // 4. Checkpoints
      eng.level.checkpoints.forEach((cpX) => {
        if (eng.x > cpX && eng.lastCheckpointX < cpX) {
          eng.lastCheckpointX = cpX;
          eng.lastCheckpointY = getTerrainAt(cpX, eng.level.points).y - 25;
          sound.playCheckpointPing();
        }
      });

      // 5. Level Finish Line
      if (eng.x >= eng.level.finishX) {
        handleLevelClear();
        return;
      }

      // Update Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (p.life >= p.maxLife) {
          eng.particles.splice(i, 1);
        }
      }

      renderScene();
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, activeBike, nitro]);

  // ----------------------------------------------------
  // 2D CANVAS RENDERING (CLEAN VECTOR ARTWORK)
  // ----------------------------------------------------
  const renderScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const eng = engineRef.current;
    const bike = activeBike;

    // Smooth Camera Follow
    const cameraX = eng.x - width * 0.35;
    const cameraY = eng.y - height * 0.6;

    ctx.save();
    // Clear Background with Deep Cyber Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.6, '#0f172a');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Parallax Distant Metropolis Skyline
    ctx.save();
    ctx.translate(-cameraX * 0.15, -cameraY * 0.1);
    ctx.fillStyle = '#090d16';
    for (let x = -200; x < 3500; x += 90) {
      const bH = 180 + Math.sin(x * 0.05) * 80;
      ctx.fillRect(x, height - bH, 75, bH);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(x + 20, height - bH + 30, 4, 4);
      ctx.fillRect(x + 45, height - bH + 60, 4, 4);
      ctx.fillStyle = '#090d16';
    }
    ctx.restore();

    // Transform World to Camera
    ctx.translate(-cameraX, -cameraY);

    // Draw Terrain Spline & Neon Rail Top
    const points = eng.level.points;
    if (points.length > 1) {
      // 1. Terrain Fill Below Ground
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y + 500);
      ctx.lineTo(points[0].x, points[0].y + 500);
      ctx.closePath();

      const terrainGrad = ctx.createLinearGradient(0, 200, 0, 800);
      terrainGrad.addColorStop(0, '#0f172a');
      terrainGrad.addColorStop(1, '#020617');
      ctx.fillStyle = terrainGrad;
      ctx.fill();

      // 2. Glowing Neon Top Track Line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Sub-rail grid lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.lineWidth = 2;
      for (let i = 0; i < points.length - 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[i].x, points[i].y + 40);
        ctx.stroke();
      }
    }

    // Draw Checkpoints
    eng.level.checkpoints.forEach((cpX) => {
      const cpTerrain = getTerrainAt(cpX, points);
      ctx.fillStyle = eng.x > cpX ? '#10b981' : '#f59e0b';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.fillRect(cpX - 2, cpTerrain.y - 65, 4, 65);
      // Holographic Flag
      ctx.beginPath();
      ctx.moveTo(cpX + 2, cpTerrain.y - 65);
      ctx.lineTo(cpX + 28, cpTerrain.y - 50);
      ctx.lineTo(cpX + 2, cpTerrain.y - 35);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw Finish Line Cyber Arch
    const finishY = getTerrainAt(eng.level.finishX, points).y;
    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(eng.level.finishX - 10, finishY);
    ctx.lineTo(eng.level.finishX - 10, finishY - 95);
    ctx.lineTo(eng.level.finishX + 10, finishY - 95);
    ctx.lineTo(eng.level.finishX + 10, finishY);
    ctx.stroke();
    // Checkered Banner
    ctx.fillStyle = '#facc15';
    ctx.fillRect(eng.level.finishX - 30, finishY - 95, 60, 24);
    ctx.fillStyle = '#020617';
    ctx.fillRect(eng.level.finishX - 20, finishY - 95, 10, 12);
    ctx.fillRect(eng.level.finishX, finishY - 95, 10, 12);
    ctx.fillRect(eng.level.finishX - 30, finishY - 83, 10, 12);
    ctx.fillRect(eng.level.finishX - 10, finishY - 83, 10, 12);
    ctx.fillRect(eng.level.finishX + 10, finishY - 83, 10, 12);
    ctx.restore();

    // Draw Hazards
    eng.level.hazards.forEach((hazard) => {
      ctx.save();
      ctx.translate(hazard.x, hazard.y);

      if (hazard.type === 'saw') {
        hazard.angle = (hazard.angle || 0) + 0.15;
        ctx.rotate(hazard.angle);
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI * 2) / 8;
          const r = i % 2 === 0 ? hazard.radius : hazard.radius * 0.6;
          const hx = Math.cos(a) * r;
          const hy = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
      } else if (hazard.type === 'tnt') {
        // Glowing Cyber Hazard Explosive Canister
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.fillRect(-14, -20, 28, 20);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-14, -13, 28, 6);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, -10, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (hazard.type === 'spring') {
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.fillRect(-16, -8, 32, 8);
        ctx.beginPath();
        ctx.arc(0, -8, 14, Math.PI, 0);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (hazard.type === 'boost') {
        // Sleek Glowing Chevron Arrows (No Text Clutter)
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 12;
        ctx.fillRect(-24, -4, 48, 4);

        // 3 Glowing Arrowheads
        ctx.fillStyle = '#c084fc';
        for (let offset = -14; offset <= 14; offset += 14) {
          ctx.beginPath();
          ctx.moveTo(offset - 4, -12);
          ctx.lineTo(offset + 4, -6);
          ctx.lineTo(offset - 4, 0);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    });

    // Draw Particles
    eng.particles.forEach((p) => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 🏍️ DRAW CYBER MOTO & RIDER
    ctx.save();
    ctx.translate(eng.x, eng.y);
    ctx.rotate(eng.angle);

    // Wheels
    const wheelR = 18;
    const wBase = 46;

    // Rear Wheel
    ctx.save();
    ctx.translate(-wBase / 2, 12);
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = bike.wheelColor;
    ctx.shadowColor = bike.wheelColor;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Spokes
    ctx.beginPath();
    ctx.moveTo(-wheelR, 0); ctx.lineTo(wheelR, 0);
    ctx.moveTo(0, -wheelR); ctx.lineTo(0, wheelR);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Front Wheel
    ctx.save();
    ctx.translate(wBase / 2, 12);
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = bike.wheelColor;
    ctx.shadowColor = bike.wheelColor;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Spokes
    ctx.beginPath();
    ctx.moveTo(-wheelR, 0); ctx.lineTo(wheelR, 0);
    ctx.moveTo(0, -wheelR); ctx.lineTo(0, wheelR);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Bike Frame & Chassis
    ctx.strokeStyle = bike.color;
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.shadowColor = bike.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-wBase / 2, 12);
    ctx.lineTo(0, -4);
    ctx.lineTo(wBase / 2, 12);
    ctx.lineTo(16, -18);
    ctx.lineTo(-14, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Plasma Engine Core
    ctx.fillStyle = bike.accentColor;
    ctx.fillRect(-8, -8, 16, 8);

    // 👤 Rider Body & Helmet
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;

    // Torso & Arm
    ctx.beginPath();
    ctx.moveTo(-10, -18);
    ctx.lineTo(2, -36);
    ctx.lineTo(16, -18);
    ctx.stroke();

    // Cyber Helmet & Visor
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(4, -42, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Glowing Visor
    ctx.fillStyle = '#facc15';
    ctx.fillRect(7, -44, 6, 4);

    ctx.restore(); // Restore bike rotation

    ctx.restore(); // Restore camera
  };

  // ----------------------------------------------------
  // KEYBOARD EVENT LISTENERS
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const eng = engineRef.current;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') eng.gas = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') eng.brake = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') eng.leanLeft = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') eng.leanRight = true;
      if (e.code === 'ShiftLeft' || e.code === 'Space') eng.nitroTrigger = true;
      if (e.code === 'KeyR') respawnCheckpoint();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') eng.gas = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') eng.brake = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') eng.leanLeft = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') eng.leanRight = false;
      if (e.code === 'ShiftLeft' || e.code === 'Space') eng.nitroTrigger = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // ----------------------------------------------------
  // GAME LIFECYCLE HANDLERS
  // ----------------------------------------------------
  const startLevel = (lvlNum: number) => {
    sound.playCollect();
    const newLvl = generateLevel(lvlNum);
    setCurrentLevel(lvlNum);

    const eng = engineRef.current;
    eng.level = newLvl;
    eng.x = 120;
    eng.y = 380;
    eng.vx = 0;
    eng.vy = 0;
    eng.angle = 0;
    eng.angularVel = 0;
    eng.cumRotation = 0;
    eng.lastCheckpointX = 120;
    eng.lastCheckpointY = 380;
    eng.startTime = performance.now();
    eng.isCrashed = false;
    eng.particles = [];
    eng.gas = false;
    eng.brake = false;
    eng.leanLeft = false;
    eng.leanRight = false;
    eng.nitroTrigger = false;

    setScore(0);
    setNitro(100);
    setElapsedTime(0);
    setProgressPct(0);
    setStuntToasts([]);
    setGameState('playing');
  };

  const handleCrash = () => {
    if (engineRef.current.isCrashed) return;
    engineRef.current.isCrashed = true;
    sound.playBikeCrash();

    // Explosion particles
    for (let i = 0; i < 25; i++) {
      engineRef.current.particles.push({
        x: engineRef.current.x,
        y: engineRef.current.y,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14,
        color: ['#00f0ff', '#ff007f', '#facc15'][Math.floor(Math.random() * 3)],
        life: 0,
        maxLife: 35,
        size: Math.random() * 6 + 3,
      });
    }

    setGameState('crashed');
  };

  const respawnCheckpoint = () => {
    sound.playClick();
    const eng = engineRef.current;
    eng.x = eng.lastCheckpointX;
    eng.y = eng.lastCheckpointY;
    eng.vx = 0;
    eng.vy = 0;
    eng.angle = 0;
    eng.angularVel = 0;
    eng.cumRotation = 0;
    eng.isCrashed = false;
    setGameState('playing');
  };

  const handleLevelClear = () => {
    sound.playWin();
    const time = elapsedTime;
    const earnedStars = time < engineRef.current.level.parTime ? 3 : time < engineRef.current.level.parTime + 15 ? 2 : 1;
    setStars(earnedStars);

    const earnedCoins = earnedStars * 100 + Math.floor(score / 10);
    const totalCoins = coins + earnedCoins;
    setCoins(totalCoins);
    localStorage.setItem('cybermoto_coins', String(totalCoins));

    setGameState('level_clear');
  };

  const buyBike = (bike: CyberBike) => {
    if (coins < bike.price) {
      sound.playHit();
      return;
    }
    sound.playWin();
    const newCoins = coins - bike.price;
    setCoins(newCoins);
    localStorage.setItem('cybermoto_coins', String(newCoins));

    const updated = [...unlockedBikes, bike.id];
    setUnlockedBikes(updated);
    localStorage.setItem('cybermoto_unlocked_bikes', JSON.stringify(updated));
    setActiveBikeId(bike.id);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[420px] sm:h-[580px] md:h-[680px] max-h-[75vh] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden select-none border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 font-sans touch-none"
    >
      {/* 2D Canvas Layer */}
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        className="w-full h-full block"
      />

      {/* ==================================================== */}
      {/* 🎮 TOP HUD BAR (NON-INTRUSIVE & CLEAN)                */}
      {/* ==================================================== */}
      {gameState === 'playing' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2.5 sm:p-5 z-10">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between gap-2">
            {/* Speed & Nitro Bar Pill */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl bg-slate-900/85 backdrop-blur-md border border-cyan-500/40 shadow-xl">
              <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
              <div className="flex flex-col">
                <div className="text-xs sm:text-base font-black text-white leading-none">
                  {speedKmh} <span className="text-[9px] text-cyan-400 font-bold">KM/H</span>
                </div>
                <div className="w-14 sm:w-20 h-1 sm:h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 transition-all duration-100"
                    style={{ width: `${nitro}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Track Progress Indicator (Center Top) */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700 shadow-lg">
              <Flag className="w-3.5 h-3.5 text-amber-400" />
              <div className="flex flex-col items-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 leading-none">Track {currentLevel}</div>
                <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-amber-400 transition-all duration-150" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </div>

            {/* Time, Score, Audio & Respawn (Top Right) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="px-2 sm:px-3 py-1 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700 shadow-lg text-right">
                <div className="text-[8px] uppercase font-bold text-slate-400 leading-none">Time</div>
                <div className="text-xs sm:text-sm font-black text-amber-300">{elapsedTime}s</div>
              </div>

              <div className="px-2 sm:px-3 py-1 rounded-xl bg-slate-900/85 backdrop-blur-md border border-cyan-500/40 shadow-lg">
                <div className="text-[8px] uppercase font-bold text-slate-400 leading-none">Score</div>
                <div className="text-xs sm:text-sm font-black text-cyan-300">{score}</div>
              </div>

              <button
                onClick={respawnCheckpoint}
                className="pointer-events-auto p-2 rounded-xl bg-slate-900/85 border border-slate-700 hover:border-amber-400 text-amber-400 transition-all shadow-lg active:scale-95"
                title="Respawn at Checkpoint [R]"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={() => {
                  const m = sound.toggleMute();
                  setMuted(m);
                }}
                className="pointer-events-auto p-2 rounded-xl bg-slate-900/85 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-all shadow-lg active:scale-95"
              >
                {muted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />}
              </button>
            </div>
          </div>

          {/* Stunt Toasts (Top Notification Badge, Never Blocking Center) */}
          <div className="absolute top-14 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20">
            {stuntToasts.map((toast) => (
              <div
                key={toast.id}
                className="px-3.5 py-1 rounded-full bg-slate-950/90 border border-cyan-400 text-xs font-black text-white shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                style={{ borderColor: toast.color }}
              >
                {toast.text} <span className="text-amber-400">+{toast.points}</span>
              </div>
            ))}
          </div>

          {/* Bottom On-Screen Mobile Touch Controls (Clean Edge Corners) */}
          <div className="flex items-end justify-between w-full pt-2 gap-2">
            {/* Left Lean / Air Flips */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onPointerDown={() => { engineRef.current.leanLeft = true; }}
                onPointerUp={() => { engineRef.current.leanLeft = false; }}
                className="pointer-events-auto w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-900/85 border border-cyan-500/50 backdrop-blur-md text-white font-black text-lg sm:text-xl flex items-center justify-center shadow-xl active:scale-95 active:bg-cyan-500 active:text-slate-950 transition-all"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                onPointerDown={() => { engineRef.current.leanRight = true; }}
                onPointerUp={() => { engineRef.current.leanRight = false; }}
                className="pointer-events-auto w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-900/85 border border-cyan-500/50 backdrop-blur-md text-white font-black text-lg sm:text-xl flex items-center justify-center shadow-xl active:scale-95 active:bg-cyan-500 active:text-slate-950 transition-all"
              >
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Right Gas, Brake, Nitro */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onPointerDown={() => { engineRef.current.nitroTrigger = true; }}
                onPointerUp={() => { engineRef.current.nitroTrigger = false; }}
                className="pointer-events-auto w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-purple-600 border border-fuchsia-400 text-white font-black text-xs sm:text-sm flex flex-col items-center justify-center shadow-xl shadow-fuchsia-950/50 active:scale-95 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span className="text-[8px] sm:text-[9px] leading-none">NITRO</span>
              </button>

              <button
                onPointerDown={() => { engineRef.current.brake = true; }}
                onPointerUp={() => { engineRef.current.brake = false; }}
                className="pointer-events-auto w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-900/85 border border-rose-500/50 backdrop-blur-md text-white font-black text-xs sm:text-sm flex flex-col items-center justify-center shadow-xl active:scale-95 active:bg-rose-500 active:text-slate-950 transition-all"
              >
                <ArrowDown className="w-4 h-4 text-rose-400" />
                <span className="text-[8px] sm:text-[9px] leading-none">BRAKE</span>
              </button>

              <button
                onPointerDown={() => { engineRef.current.gas = true; }}
                onPointerUp={() => { engineRef.current.gas = false; }}
                className="pointer-events-auto w-13 h-13 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 border border-emerald-300 text-slate-950 font-black text-sm sm:text-base flex flex-col items-center justify-center shadow-xl shadow-emerald-950/50 active:scale-95 transition-all"
              >
                <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[9px] sm:text-[10px] leading-none">GAS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 🏁 MAIN START / STAGE SELECT MENU                    */}
      {/* ==================================================== */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-3 sm:p-6 text-center space-y-2.5 sm:space-y-4 overflow-y-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 text-[10px] sm:text-xs font-black uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            EXTREME 2D RIGID-BODY STUNT TRIALS
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            CYBER <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300">MOTO TRIALS</span>
          </h1>

          <p className="text-[11px] sm:text-xs md:text-sm text-slate-400 max-w-md line-clamp-2 sm:line-clamp-none">
            Master 360° loops, air backflips, spring catapults, and avoid spinning laser saws across 5 stunt-packed cyberpunk courses!
          </p>

          <div className="flex items-center gap-2 sm:gap-4 py-1">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2 sm:gap-3">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
              <div className="text-left">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 leading-none">Cyber Credits</div>
                <div className="text-sm sm:text-lg font-black text-white">{coins}</div>
              </div>
            </div>

            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2 sm:gap-3">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
              <div className="text-left">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 leading-none">Active Bike</div>
                <div className="text-xs sm:text-sm font-black text-cyan-300 truncate max-w-[110px] sm:max-w-none">{activeBike.name}</div>
              </div>
            </div>
          </div>

          {/* Level Selection Cards (5 Compact Columns) */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 max-w-xl w-full">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                onClick={() => startLevel(lvl)}
                className="p-1.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-center transition-all hover:scale-105 active:scale-95 group shadow-lg"
              >
                <div className="text-xs sm:text-lg font-black text-white group-hover:text-cyan-400">Track {lvl}</div>
                <div className="text-[9px] sm:text-[10px] text-slate-400">Lvl {lvl}</div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 pt-1">
            <button
              onClick={() => startLevel(1)}
              className="px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs sm:text-base shadow-xl shadow-cyan-500/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>START RACE</span>
            </button>

            <button
              onClick={() => setGameState('garage')}
              className="px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
            >
              <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-fuchsia-400" />
              <span>BIKE GARAGE</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 💥 CRASHED OVERLAY                                   */}
      {/* ==================================================== */}
      {gameState === 'crashed' && (
        <div className="absolute inset-0 z-20 bg-rose-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-rose-600/30 border-2 border-rose-500 flex items-center justify-center shadow-2xl shadow-rose-900/60">
            <Flame className="w-8 h-8 text-rose-400 animate-bounce" />
          </div>

          <h2 className="text-3xl font-black text-white tracking-tight">RIDER WIPEOUT!</h2>
          <p className="text-xs text-rose-200">Rider head impact or hazard collision detected.</p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={respawnCheckpoint}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-sm flex items-center gap-2 shadow-xl active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESPAWN CHECKPOINT [R]</span>
            </button>

            <button
              onClick={() => startLevel(currentLevel)}
              className="px-5 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
            >
              RESTART TRACK
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 🏆 LEVEL CLEAR OVERLAY                               */}
      {/* ==================================================== */}
      {gameState === 'level_clear' && (
        <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase">
            <Award className="w-4 h-4" />
            TRACK COMPLETED!
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white">VICTORY CLEAR!</h2>

          {/* Stars */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`w-8 h-8 ${
                  s <= stars ? 'text-amber-400 fill-amber-400 animate-bounce' : 'text-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xs w-full text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400">Total Time</div>
              <div className="text-base font-black text-white">{elapsedTime}s</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400">Stunt Score</div>
              <div className="text-base font-black text-cyan-400">{score}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            {currentLevel < 5 ? (
              <button
                onClick={() => startLevel(currentLevel + 1)}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-sm flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                <span>NEXT TRACK</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setGameState('menu')}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-sm"
              >
                MAIN MENU
              </button>
            )}

            <button
              onClick={() => startLevel(currentLevel)}
              className="px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold"
            >
              RETRY
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 🏍️ GARAGE OVERLAY                                    */}
      {/* ==================================================== */}
      {gameState === 'garage' && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xl font-black text-white">CYBER BIKE GARAGE</h2>
              <p className="text-xs text-slate-400">Unlock & customize high-performance stunt lightcycles</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{coins} CREDITS</span>
              </div>

              <button
                onClick={() => setGameState('menu')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
              >
                BACK
              </button>
            </div>
          </div>

          {/* Bike Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            {CYBER_BIKES.map((bike) => {
              const isUnlocked = unlockedBikes.includes(bike.id);
              const isActive = activeBikeId === bike.id;

              return (
                <div
                  key={bike.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-slate-900/90 border-cyan-400 shadow-xl shadow-cyan-950/50'
                      : isUnlocked
                      ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/60 border-slate-900 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: bike.color }} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{bike.subtitle}</span>
                  </div>

                  <div className="text-sm font-black text-white">{bike.name}</div>

                  {/* Stats Bars */}
                  <div className="space-y-1.5 my-3 text-[10px] text-slate-400 font-bold">
                    <div className="flex items-center justify-between">
                      <span>Top Speed</span>
                      <span className="text-cyan-400">{Math.floor(bike.topSpeed * 4.2)} KM/H</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Stunt Agility</span>
                      <span className="text-fuchsia-400">{Math.floor(bike.agility * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Suspension</span>
                      <span className="text-emerald-400">{Math.floor(bike.suspension * 100)}%</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  {isActive ? (
                    <div className="w-full py-2 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-black text-center">
                      EQUIPPED
                    </div>
                  ) : isUnlocked ? (
                    <button
                      onClick={() => {
                        sound.playClick();
                        setActiveBikeId(bike.id);
                        localStorage.setItem('cybermoto_active_bike', bike.id);
                      }}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
                    >
                      SELECT BIKE
                    </button>
                  ) : (
                    <button
                      onClick={() => buyBike(bike)}
                      className={`w-full py-2 rounded-xl text-xs font-black transition-all ${
                        coins >= bike.price
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      BUY FOR {bike.price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center text-xs text-slate-500">
            Complete tracks with 3 stars and perform air flips to earn extra Cyber Credits!
          </div>
        </div>
      )}
    </div>
  );
};
