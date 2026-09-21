import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Sparkles,
  Flame,
  Zap,
  ShoppingBag,
  Coins,
  Pause,
  Heart,
  Shield,
  Snowflake,
  Crosshair,
  Award,
  Sliders,
  ChevronRight,
  Layers,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// --- KATANA BLADES ---
interface KatanaBlade {
  id: string;
  name: string;
  trailColor: string;
  glowColor: string;
  coreColor: string;
  scoreBonus: number;
  price: number;
  description: string;
}

const KATANA_BLADES: KatanaBlade[] = [
  {
    id: 'blade_quantum',
    name: 'Quantum Cyan Katana',
    trailColor: '#00f0ff',
    glowColor: 'rgba(0, 240, 255, 0.6)',
    coreColor: '#ffffff',
    scoreBonus: 1.0,
    price: 0,
    description: 'Standard laser katana with balanced holographic edge.'
  },
  {
    id: 'blade_crimson',
    name: 'Crimson Plasma Saber',
    trailColor: '#ff0055',
    glowColor: 'rgba(255, 0, 85, 0.7)',
    coreColor: '#ffe4e6',
    scoreBonus: 1.2,
    price: 350,
    description: 'Thermal plasma edge that vaporizes fruit rinds instantly.'
  },
  {
    id: 'blade_golden',
    name: 'Solar Dragon Blade',
    trailColor: '#facc15',
    glowColor: 'rgba(250, 204, 21, 0.75)',
    coreColor: '#fef08a',
    scoreBonus: 1.4,
    price: 750,
    description: 'Golden stellar blade granting +40% bonus Cyber Credits.'
  },
  {
    id: 'blade_matrix',
    name: 'Void Matrix Slicer',
    trailColor: '#00ff88',
    glowColor: 'rgba(0, 255, 136, 0.7)',
    coreColor: '#dcfce7',
    scoreBonus: 1.5,
    price: 1200,
    description: 'Phase-shifting quantum blade with ultra-wide slicing arc.'
  }
];

// --- DOJO LEVELS ---
interface DojoLevel {
  level: number;
  name: string;
  themeColor: string;
  targetFruits: number;
  speedMultiplier: number;
  bombChance: number;
  freezeChance: number;
  frenzyChance: number;
  description: string;
}

const DOJO_LEVELS: DojoLevel[] = [
  {
    level: 1,
    name: 'Neo Tokyo Garden',
    themeColor: '#22c55e',
    targetFruits: 15,
    speedMultiplier: 1.0,
    bombChance: 0,
    freezeChance: 0.1,
    frenzyChance: 0.05,
    description: 'Master your basic laser blade slashes on fresh cyber fruits.'
  },
  {
    level: 2,
    name: 'Cybernetic Orchard',
    themeColor: '#00f0ff',
    targetFruits: 25,
    speedMultiplier: 1.15,
    bombChance: 0.06,
    freezeChance: 0.15,
    frenzyChance: 0.1,
    description: 'Faster launches with Freeze Glitch time-warp powerups.'
  },
  {
    level: 3,
    name: 'Plasma Matrix Dojo',
    themeColor: '#a855f7',
    targetFruits: 35,
    speedMultiplier: 1.3,
    bombChance: 0.14,
    freezeChance: 0.12,
    frenzyChance: 0.14,
    description: 'Volatile red plasma bombs and high-velocity multi-launches.'
  },
  {
    level: 4,
    name: 'Quantum Void Citadel',
    themeColor: '#f43f5e',
    targetFruits: 45,
    speedMultiplier: 1.45,
    bombChance: 0.18,
    freezeChance: 0.15,
    frenzyChance: 0.18,
    description: 'Intense supersonic fruit swarms and double combo multipliers.'
  },
  {
    level: 5,
    name: 'Infinite Cyber Overdrive',
    themeColor: '#facc15',
    targetFruits: 60,
    speedMultiplier: 1.6,
    bombChance: 0.22,
    freezeChance: 0.18,
    frenzyChance: 0.2,
    description: 'Ultimate cyber blade mastery with endless jackpot frenzy!'
  }
];

// Fruit types
type FruitType = 'watermelon' | 'dragonfruit' | 'orange' | 'apple' | 'pineapple' | 'freeze' | 'frenzy' | 'bomb';

interface FruitItem {
  id: number;
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  innerColor: string;
  rotation: number;
  rotSpeed: number;
  sliced: boolean;
  sliceAngle?: number;
  half1Offset?: { x: number; y: number; vx: number; vy: number; rot: number; rotSpd: number };
  half2Offset?: { x: number; y: number; vx: number; vy: number; rot: number; rotSpd: number };
  isSpecial?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

export const CyberFruitKatana3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game States
  const [gameState, setGameState] = useState<'menu' | 'dojo' | 'playing' | 'paused' | 'gameover'>('menu');
  const [cyberCredits, setCyberCredits] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_katana_credits');
    return saved !== null ? parseInt(saved, 10) : 350;
  });
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_katana_high');
    return saved !== null ? parseInt(saved, 10) : 2450;
  });

  // Level Progression State
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_katana_max_level');
    return saved !== null ? parseInt(saved, 10) : 1;
  });
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [levelSlicedCount, setLevelSlicedCount] = useState<number>(0);
  const [levelUpBanner, setLevelUpBanner] = useState<{ title: string; subtitle: string } | null>(null);

  const [selectedBladeIdx, setSelectedBladeIdx] = useState<number>(0);
  const [unlockedBlades, setUnlockedBlades] = useState<string[]>(() => {
    const saved = localStorage.getItem('novaplay_katana_unlocked');
    return saved ? JSON.parse(saved) : ['blade_quantum'];
  });

  // Upgrades
  const [bladeWidthLevel, setBladeWidthLevel] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_katana_w_lvl');
    return saved !== null ? parseInt(saved, 10) : 1;
  });
  const [slowMoLevel, setSlowMoLevel] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_katana_sm_lvl');
    return saved !== null ? parseInt(saved, 10) : 1;
  });
  const [shieldLevel, setShieldLevel] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_katana_sh_lvl');
    return saved !== null ? parseInt(saved, 10) : 1;
  });

  // Live HUD state
  const [score, setScore] = useState<number>(0);
  const [totalSlicedCount, setTotalSlicedCount] = useState<number>(0);
  const [lives, setLives] = useState<number>(5);
  const [isSlowMoActive, setIsSlowMoActive] = useState<boolean>(false);
  const [shieldCount, setShieldCount] = useState<number>(0);
  const [comboToast, setComboToast] = useState<string | null>(null);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Input & Simulation Refs
  const isPointerDownRef = useRef<boolean>(false);
  const trailPointsRef = useRef<TrailPoint[]>([]);
  const fruitsRef = useRef<FruitItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const spawnTimerRef = useRef<number>(0);
  const slowMoTimerRef = useRef<number>(0);
  const currentSwipeSlicedRef = useRef<FruitType[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const animFrameRef = useRef<number | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('novaplay_katana_credits', cyberCredits.toString());
  }, [cyberCredits]);

  useEffect(() => {
    localStorage.setItem('novaplay_katana_high', highScore.toString());
  }, [highScore]);

  useEffect(() => {
    localStorage.setItem('novaplay_katana_max_level', maxUnlockedLevel.toString());
  }, [maxUnlockedLevel]);

  useEffect(() => {
    localStorage.setItem('novaplay_katana_unlocked', JSON.stringify(unlockedBlades));
  }, [unlockedBlades]);

  useEffect(() => {
    localStorage.setItem('novaplay_katana_w_lvl', bladeWidthLevel.toString());
    localStorage.setItem('novaplay_katana_sm_lvl', slowMoLevel.toString());
    localStorage.setItem('novaplay_katana_sh_lvl', shieldLevel.toString());
  }, [bladeWidthLevel, slowMoLevel, shieldLevel]);

  const toggleSound = () => {
    const isMute = sound.toggleMute();
    setMuted(isMute);
  };

  const currentLevelConfig = DOJO_LEVELS[Math.min(currentLevelIdx, DOJO_LEVELS.length - 1)];

  // Fruit Factory based on current Level config
  const spawnFruit = (width: number, height: number, forceType?: FruitType): FruitItem => {
    const cfg = currentLevelConfig;
    const types: FruitType[] = ['watermelon', 'dragonfruit', 'orange', 'apple', 'pineapple'];
    let type = forceType || types[Math.floor(Math.random() * types.length)];

    // Rare powerups & bombs based on Level config
    if (!forceType) {
      const rand = Math.random();
      if (rand < cfg.bombChance) {
        type = 'bomb';
      } else if (rand < cfg.bombChance + cfg.freezeChance) {
        type = 'freeze';
      } else if (rand < cfg.bombChance + cfg.freezeChance + cfg.frenzyChance) {
        type = 'frenzy';
      }
    }

    const x = width * 0.15 + Math.random() * (width * 0.7);
    const y = height + 40;
    const targetX = width * 0.2 + Math.random() * (width * 0.6);
    const vx = ((targetX - x) / 45) * cfg.speedMultiplier;
    const vy = -(height * 0.024 + Math.random() * (height * 0.012)) * cfg.speedMultiplier;

    let radius = 38;
    let color = '#22c55e';
    let innerColor = '#ff2e63';

    if (type === 'watermelon') {
      radius = 42;
      color = '#22c55e';
      innerColor = '#ff2e63';
    } else if (type === 'dragonfruit') {
      radius = 36;
      color = '#ec4899';
      innerColor = '#ffffff';
    } else if (type === 'orange') {
      radius = 34;
      color = '#f59e0b';
      innerColor = '#fef08a';
    } else if (type === 'apple') {
      radius = 32;
      color = '#ef4444';
      innerColor = '#fef9c3';
    } else if (type === 'pineapple') {
      radius = 40;
      color = '#eab308';
      innerColor = '#fef08a';
    } else if (type === 'freeze') {
      radius = 36;
      color = '#00f0ff';
      innerColor = '#e0f2fe';
    } else if (type === 'frenzy') {
      radius = 38;
      color = '#a855f7';
      innerColor = '#fae8ff';
    } else if (type === 'bomb') {
      radius = 35;
      color = '#1e1b4b';
      innerColor = '#ef4444';
    }

    return {
      id: Math.random(),
      type,
      x,
      y,
      vx,
      vy,
      radius,
      color,
      innerColor,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 4,
      sliced: false,
      isSpecial: ['freeze', 'frenzy', 'bomb'].includes(type)
    };
  };

  // Splash Particle Emitter
  const emitSliceParticles = (x: number, y: number, color: string, count: number = 20) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 6,
        life: 0,
        maxLife: 25 + Math.random() * 20
      });
    }
  };

  // Check Line Segment Intersection with Circle
  const checkIntersection = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    circle: { x: number; y: number; r: number }
  ) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return false;

    const u = ((circle.x - p1.x) * dx + (circle.y - p1.y) * dy) / (len * len);
    const clampedU = Math.max(0, Math.min(1, u));
    const closestX = p1.x + clampedU * dx;
    const closestY = p1.y + clampedU * dy;

    const distSq = (circle.x - closestX) * (circle.x - closestX) + (circle.y - closestY) * (circle.y - closestY);
    return distSq <= circle.r * circle.r;
  };

  // Start Game at designated level
  const startRun = (levelIdx: number = 0) => {
    fruitsRef.current = [];
    particlesRef.current = [];
    trailPointsRef.current = [];
    currentSwipeSlicedRef.current = [];
    slowMoTimerRef.current = 0;

    setCurrentLevelIdx(levelIdx);
    setLevelSlicedCount(0);
    setLevelUpBanner(null);

    setScore(0);
    setTotalSlicedCount(0);
    setLives(5);
    setShieldCount(shieldLevel > 1 ? 1 : 0);
    setIsSlowMoActive(false);
    setIsNewRecord(false);
    setGameState('playing');
    sound.playPowerup();
  };

  // Trigger Level Up
  const triggerLevelUp = useCallback((nextLvlIdx: number) => {
    const nextCfg = DOJO_LEVELS[Math.min(nextLvlIdx, DOJO_LEVELS.length - 1)];
    setCurrentLevelIdx(nextLvlIdx);
    setLevelSlicedCount(0);

    // Save max unlocked level
    setMaxUnlockedLevel((prev) => Math.max(prev, nextCfg.level));

    // Rewards: Score bonus, Credits, Restore 1 heart
    setScore((prev) => prev + 500);
    setCyberCredits((prev) => prev + 50);
    setLives((prev) => Math.min(5, prev + 1));

    sound.playWin();
    confetti({ particleCount: 80, spread: 70 });

    setLevelUpBanner({
      title: `⚡ LEVEL ${nextCfg.level} UNLOCKED!`,
      subtitle: `${nextCfg.name} • +500 PTS & +1 LIFE RESTORED`
    });

    setTimeout(() => {
      setLevelUpBanner(null);
    }, 2800);
  }, []);

  // Main Game Loop (60 FPS)
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    const blade = KATANA_BLADES[selectedBladeIdx];
    const bladeArcWidth = 8 + (bladeWidthLevel - 1) * 3;
    const slowMoDuration = 4.0 + (slowMoLevel - 1) * 1.5;

    const gameLoop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      const timeScale = slowMoTimerRef.current > 0 ? 0.35 : 1.0;
      if (slowMoTimerRef.current > 0) {
        slowMoTimerRef.current -= dt;
        if (slowMoTimerRef.current <= 0) setIsSlowMoActive(false);
      }

      // Clear Canvas
      ctx.fillStyle = '#050515';
      ctx.fillRect(0, 0, width, height);

      // Cyber Grid Dojo Background Lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      const step = 60;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Spawn Fruits
      spawnTimerRef.current += dt * timeScale;
      if (spawnTimerRef.current > 1.3) {
        spawnTimerRef.current = 0;
        const count = Math.random() < 0.45 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          fruitsRef.current.push(spawnFruit(width, height));
        }
      }

      // --- PROCESS KATANA SWIPE & CUTS ---
      const trail = trailPointsRef.current;
      const now = performance.now();
      trailPointsRef.current = trail.filter((pt) => now - pt.time < 140);

      if (trail.length >= 2) {
        const p1 = trail[trail.length - 2];
        const p2 = trail[trail.length - 1];
        const cutAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        fruitsRef.current.forEach((fruit) => {
          if (
            !fruit.sliced &&
            checkIntersection(p1, p2, { x: fruit.x, y: fruit.y, r: fruit.radius + bladeArcWidth + 12 })
          ) {
            fruit.sliced = true;
            fruit.sliceAngle = cutAngle;

            // Half fling kinematics
            const flingSpeed = 4.0;
            fruit.half1Offset = {
              x: 0,
              y: 0,
              vx: Math.cos(cutAngle - Math.PI / 2) * flingSpeed + fruit.vx * 0.5,
              vy: Math.sin(cutAngle - Math.PI / 2) * flingSpeed + fruit.vy * 0.5,
              rot: fruit.rotation,
              rotSpd: -4
            };
            fruit.half2Offset = {
              x: 0,
              y: 0,
              vx: Math.cos(cutAngle + Math.PI / 2) * flingSpeed + fruit.vx * 0.5,
              vy: Math.sin(cutAngle + Math.PI / 2) * flingSpeed + fruit.vy * 0.5,
              rot: fruit.rotation,
              rotSpd: 4
            };

            // Process specific fruit triggers
            if (fruit.type === 'bomb') {
              if (shieldCount > 0) {
                setShieldCount((prev) => prev - 1);
                sound.playShield();
                emitSliceParticles(fruit.x, fruit.y, '#ef4444', 35);
              } else {
                sound.playExplosion();
                emitSliceParticles(fruit.x, fruit.y, '#ef4444', 60);
                setGameState('gameover');
                return;
              }
            } else if (fruit.type === 'freeze') {
              slowMoTimerRef.current = slowMoDuration;
              setIsSlowMoActive(true);
              sound.playPowerup();
              emitSliceParticles(fruit.x, fruit.y, '#00f0ff', 40);
            } else if (fruit.type === 'frenzy') {
              sound.playPowerup();
              emitSliceParticles(fruit.x, fruit.y, '#a855f7', 40);
              for (let f = 0; f < 6; f++) {
                fruitsRef.current.push(spawnFruit(width, height));
              }
            } else {
              // Regular fruit cut
              sound.playCollect();
              emitSliceParticles(fruit.x, fruit.y, fruit.innerColor, 24);
              currentSwipeSlicedRef.current.push(fruit.type);

              const pts = Math.round(100 * blade.scoreBonus);
              setScore((prev) => prev + pts);
              setTotalSlicedCount((prev) => prev + 1);
              setCyberCredits((prev) => prev + 2);

              // Level Progression Check
              setLevelSlicedCount((prev) => {
                const nextCount = prev + 1;
                const target = currentLevelConfig.targetFruits;
                if (nextCount >= target) {
                  triggerLevelUp(currentLevelIdx + 1);
                  return 0;
                }
                return nextCount;
              });
            }
          }
        });
      }

      // Check Multi-Slice Combos (Silent top toast, never blocking screen)
      if (!isPointerDownRef.current && currentSwipeSlicedRef.current.length > 0) {
        const sliceCount = currentSwipeSlicedRef.current.length;
        if (sliceCount >= 3) {
          const comboBonus = sliceCount * 150;
          setScore((prev) => prev + comboBonus);
          setCyberCredits((prev) => prev + sliceCount * 3);
          sound.playPowerup();
          setComboToast(`🔥 COMBO x${sliceCount}! +${comboBonus} PTS`);
          setTimeout(() => setComboToast(null), 1200);
          confetti({ particleCount: 35, spread: 50 });
        }
        currentSwipeSlicedRef.current = [];
      }

      // Update & Render Fruits
      const gravity = 18 * timeScale;
      for (let i = fruitsRef.current.length - 1; i >= 0; i--) {
        const fruit = fruitsRef.current[i];

        if (!fruit.sliced) {
          fruit.x += fruit.vx * timeScale * 60 * dt;
          fruit.y += fruit.vy * timeScale * 60 * dt;
          fruit.vy += gravity * dt;
          fruit.rotation += fruit.rotSpeed * timeScale * dt;

          // Dropped regular fruit -> Lose a life (Silent heart decrement, zero annoying screen popups)
          if (fruit.y > height + 80 && fruit.vy > 0) {
            if (!fruit.isSpecial) {
              setLives((prev) => {
                const nextLives = prev - 1;
                if (nextLives <= 0) {
                  sound.playGameOver();
                  setGameState('gameover');
                } else {
                  sound.playHit();
                }
                return Math.max(0, nextLives);
              });
            }
            fruitsRef.current.splice(i, 1);
            continue;
          }

          // Draw Whole Fruit
          ctx.save();
          ctx.translate(fruit.x, fruit.y);
          ctx.rotate(fruit.rotation);

          // Outer Glow
          ctx.shadowColor = fruit.color;
          ctx.shadowBlur = 15;

          // Main Fruit Body
          ctx.beginPath();
          ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
          ctx.fillStyle = fruit.color;
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = fruit.innerColor;
          ctx.stroke();

          // Fruit Pattern / Icon
          if (fruit.type === 'bomb') {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(0, 0, fruit.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
          } else if (fruit.type === 'freeze') {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('❄', 0, 0);
          } else if (fruit.type === 'frenzy') {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', 0, 0);
          }

          ctx.restore();
        } else {
          // Sliced Halves Physics
          const h1 = fruit.half1Offset!;
          const h2 = fruit.half2Offset!;

          h1.x += h1.vx * timeScale * 60 * dt;
          h1.y += h1.vy * timeScale * 60 * dt;
          h1.vy += gravity * dt;
          h1.rot += h1.rotSpd * timeScale * dt;

          h2.x += h2.vx * timeScale * 60 * dt;
          h2.y += h2.vy * timeScale * 60 * dt;
          h2.vy += gravity * dt;
          h2.rot += h2.rotSpd * timeScale * dt;

          // Draw Half 1
          ctx.save();
          ctx.translate(fruit.x + h1.x, fruit.y + h1.y);
          ctx.rotate(fruit.sliceAngle! + h1.rot);
          ctx.beginPath();
          ctx.arc(0, 0, fruit.radius, 0, Math.PI, false);
          ctx.closePath();
          ctx.fillStyle = fruit.innerColor;
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = fruit.color;
          ctx.stroke();
          ctx.restore();

          // Draw Half 2
          ctx.save();
          ctx.translate(fruit.x + h2.x, fruit.y + h2.y);
          ctx.rotate(fruit.sliceAngle! + h2.rot);
          ctx.beginPath();
          ctx.arc(0, 0, fruit.radius, Math.PI, Math.PI * 2, false);
          ctx.closePath();
          ctx.fillStyle = fruit.innerColor;
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = fruit.color;
          ctx.stroke();
          ctx.restore();

          // Cleanup when offscreen
          if (fruit.y + h1.y > height + 80 && fruit.y + h2.y > height + 80) {
            fruitsRef.current.splice(i, 1);
          }
        }
      }

      // Update & Render Particles
      for (let p = particlesRef.current.length - 1; p >= 0; p--) {
        const pt = particlesRef.current[p];
        pt.x += pt.vx * timeScale;
        pt.y += pt.vy * timeScale;
        pt.vy += 12 * dt;
        pt.life++;

        const alpha = 1 - pt.life / pt.maxLife;
        if (alpha <= 0) {
          particlesRef.current.splice(p, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Katana Laser Blade Trail
      if (trail.length >= 2) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer Glow Arc
        ctx.shadowColor = blade.glowColor;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = blade.trailColor;
        ctx.lineWidth = bladeArcWidth * 1.6;

        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let t = 1; t < trail.length; t++) {
          ctx.lineTo(trail[t].x, trail[t].y);
        }
        ctx.stroke();

        // Core White Hot Arc
        ctx.shadowBlur = 0;
        ctx.strokeStyle = blade.coreColor;
        ctx.lineWidth = bladeArcWidth * 0.6;
        ctx.stroke();

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, selectedBladeIdx, bladeWidthLevel, slowMoLevel, shieldLevel, shieldCount, currentLevelIdx, currentLevelConfig, triggerLevelUp]);

  // Pointer Event Handlers (Mouse & Touch Drag)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDownRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    trailPointsRef.current = [{ x: e.clientX - rect.left, y: e.clientY - rect.top, time: performance.now() }];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current && e.pointerType === 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    trailPointsRef.current.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: performance.now()
    });
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  // Buy Blades & Dojo Upgrades
  const buyBlade = (idx: number) => {
    const blade = KATANA_BLADES[idx];
    if (cyberCredits >= blade.price && !unlockedBlades.includes(blade.id)) {
      setCyberCredits((prev) => prev - blade.price);
      setUnlockedBlades((prev) => [...prev, blade.id]);
      setSelectedBladeIdx(idx);
      sound.playPowerup();
      confetti({ particleCount: 60, spread: 60 });
    }
  };

  const buyUpgrade = (type: 'w' | 'sm' | 'sh') => {
    const cost = 250;
    if (cyberCredits >= cost) {
      setCyberCredits((prev) => prev - cost);
      if (type === 'w') setBladeWidthLevel((p) => p + 1);
      if (type === 'sm') setSlowMoLevel((p) => p + 1);
      if (type === 'sh') setShieldLevel((p) => p + 1);
      sound.playPowerup();
    }
  };

  const progressPercent = Math.min(100, Math.round((levelSlicedCount / currentLevelConfig.targetFruits) * 100));

  return (
    <div className="relative w-full h-[620px] md:h-[700px] bg-slate-950 rounded-2xl overflow-hidden select-none touch-none overscroll-none font-sans border border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.15)]">
      {/* 2D/3D Slicing Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="absolute inset-0 w-full h-full cursor-crosshair touch-none select-none"
      />

      {/* --- IN-GAME HUD --- */}
      {gameState === 'playing' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 md:p-5">
          {/* Top Header: Score, Level Badge & Progress Bar, Hearts */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Score & Sliced */}
            <div className="flex items-center gap-2">
              <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-rose-500/40 flex items-center gap-2.5 shadow-lg">
                <Trophy className="w-5 h-5 text-rose-400 animate-pulse shrink-0" />
                <div>
                  <div className="text-[9px] uppercase font-bold text-slate-400">Score</div>
                  <div className="text-lg md:text-xl font-black text-white font-mono leading-none">{score.toLocaleString()}</div>
                </div>
              </div>

              <div className="bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-amber-500/40 hidden sm:flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[9px] uppercase font-bold text-slate-400">Sliced</div>
                  <div className="text-base font-black text-amber-300 font-mono leading-none">{totalSlicedCount}</div>
                </div>
              </div>
            </div>

            {/* Center: LEVEL BADGE & PROGRESS BAR */}
            <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-cyan-500/40 flex flex-col items-center gap-1 shadow-xl min-w-[170px] sm:min-w-[220px]">
              <div className="flex items-center justify-between w-full text-[11px] font-black">
                <span className="text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" /> LVL {currentLevelConfig.level}: {currentLevelConfig.name}
                </span>
                <span className="text-slate-400 font-mono text-[10px]">{levelSlicedCount}/{currentLevelConfig.targetFruits}</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Right: Lives & Controls */}
            <div className="flex items-center gap-2">
              {/* Slow Mo Indicator */}
              {isSlowMoActive && (
                <div className="bg-cyan-500/20 border border-cyan-400 px-2.5 py-1.5 rounded-xl hidden md:flex items-center gap-1 text-cyan-300 text-xs font-black animate-pulse">
                  <Snowflake className="w-3.5 h-3.5" /> SLOW-MO
                </div>
              )}

              {/* Shield Indicator */}
              {shieldCount > 0 && (
                <div className="bg-indigo-500/20 border border-indigo-400 px-2.5 py-1.5 rounded-xl hidden md:flex items-center gap-1 text-indigo-300 text-xs font-black">
                  <Shield className="w-3.5 h-3.5" /> SHIELD
                </div>
              )}

              {/* Hearts / Lives */}
              <div className="bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700 flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      i < lives ? 'fill-rose-500 text-rose-500 animate-pulse' : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Sound & Pause */}
              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  onClick={toggleSound}
                  className="p-2 bg-slate-900/85 hover:bg-slate-800 rounded-xl border border-slate-700 text-slate-300 transition-all hover:scale-105"
                >
                  {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
                <button
                  onClick={() => setGameState('paused')}
                  className="p-2 bg-slate-900/85 hover:bg-slate-800 rounded-xl border border-slate-700 text-slate-300 transition-all hover:scale-105"
                >
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Level Up Banner Overlay */}
          {levelUpBanner && (
            <div className="mx-auto my-auto animate-bounce bg-gradient-to-r from-cyan-600/95 via-purple-600/95 to-pink-600/95 backdrop-blur-md px-6 py-3.5 rounded-3xl border-2 border-cyan-300 shadow-2xl text-center shadow-cyan-500/40">
              <div className="text-xl md:text-3xl font-black text-white tracking-wider drop-shadow-md">
                {levelUpBanner.title}
              </div>
              <div className="text-xs md:text-sm font-bold text-cyan-200 mt-1 tracking-wide">
                {levelUpBanner.subtitle}
              </div>
            </div>
          )}

          {/* Non-intrusive Top Floating Combo Toast */}
          {comboToast && (
            <div className="mx-auto mt-2 bg-gradient-to-r from-amber-500/90 to-rose-500/90 text-slate-950 font-black px-4 py-1.5 rounded-full text-xs shadow-lg animate-fade-in">
              {comboToast}
            </div>
          )}
        </div>
      )}

      {/* --- START MENU MODAL (With Level Select) --- */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-20 overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900/95 border-2 border-rose-500/40 rounded-3xl p-6 md:p-8 shadow-[0_0_60px_rgba(244,63,94,0.2)] text-center relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold mb-3 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> 3D Cyber Blade Dojo • Level System
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 tracking-wider font-mono">
              CYBER FRUIT KATANA 3D
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-sm mx-auto font-medium">
              Slice flying holographic fruits with your laser katana! Conquer all 5 dojo levels, unlock cyber blades, and achieve legendary master rank!
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-2xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" /> High Score
                </div>
                <div className="text-xl font-black text-amber-300 font-mono mt-0.5">{highScore.toLocaleString()}</div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-2xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-rose-400" /> Cyber Credits
                </div>
                <div className="text-xl font-black text-rose-300 font-mono mt-0.5">{cyberCredits.toLocaleString()}</div>
              </div>
            </div>

            {/* Level Selector */}
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 mb-5 text-left">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-cyan-400" /> Select Starting Level</span>
                <span className="text-cyan-400 font-mono text-[10px]">Max Unlocked: Lvl {maxUnlockedLevel}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {DOJO_LEVELS.map((lvl, idx) => {
                  const isUnlocked = lvl.level <= maxUnlockedLevel;
                  const isSelected = currentLevelIdx === idx;
                  return (
                    <button
                      key={lvl.level}
                      onClick={() => {
                        if (isUnlocked) setCurrentLevelIdx(idx);
                      }}
                      disabled={!isUnlocked}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        isSelected
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 font-black scale-105 shadow-md shadow-cyan-500/20'
                          : isUnlocked
                          ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500'
                          : 'bg-slate-900 border-slate-800/60 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="text-xs font-black">L{lvl.level}</div>
                      <div className="text-[9px] truncate">{lvl.targetFruits}🍓</div>
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-400 mt-2 font-medium">
                🎯 <b className="text-white">{DOJO_LEVELS[currentLevelIdx].name}:</b> {DOJO_LEVELS[currentLevelIdx].description}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => startRun(currentLevelIdx)}
                className="w-full py-4 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-rose-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Play className="w-6 h-6 fill-white" /> PLAY LEVEL {currentLevelIdx + 1}
              </button>

              <button
                onClick={() => setGameState('dojo')}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700/90 text-white font-bold rounded-2xl border border-slate-600 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-5 h-5 text-rose-400" /> KATANA DOJO & UPGRADES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DOJO SHOP MODAL --- */}
      {gameState === 'dojo' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-20 overflow-y-auto">
          <div className="max-w-2xl w-full bg-slate-900 border-2 border-rose-500/30 rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-rose-400" /> KATANA DOJO ARSENAL
                </h2>
                <p className="text-xs text-slate-400">Unlock legendary cyber blades and upgrade slicing powers</p>
              </div>

              <div className="bg-slate-800 px-4 py-2 rounded-xl border border-rose-500/40 flex items-center gap-2">
                <Coins className="w-5 h-5 text-rose-400" />
                <span className="font-mono font-black text-rose-300 text-lg">{cyberCredits}</span>
              </div>
            </div>

            {/* Blades Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {KATANA_BLADES.map((blade, idx) => {
                const isUnlocked = unlockedBlades.includes(blade.id);
                const isSelected = selectedBladeIdx === idx;

                return (
                  <div
                    key={blade.id}
                    onClick={() => {
                      if (isUnlocked) setSelectedBladeIdx(idx);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-950/40 border-rose-400 shadow-lg shadow-rose-500/20'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-black text-white text-base">{blade.name}</div>
                        <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{blade.description}</div>
                      </div>
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: blade.trailColor }}
                      />
                    </div>

                    <div className="text-[10px] font-bold text-amber-300 my-2">
                      SCORE BONUS: +{Math.round((blade.scoreBonus - 1) * 100)}%
                    </div>

                    {isUnlocked ? (
                      <button
                        onClick={() => setSelectedBladeIdx(idx)}
                        className={`w-full py-2 rounded-xl text-xs font-black transition-all ${
                          isSelected
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        {isSelected ? 'EQUIPPED' : 'EQUIP BLADE'}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          buyBlade(idx);
                        }}
                        disabled={cyberCredits < blade.price}
                        className={`w-full py-2 rounded-xl text-xs font-black transition-all ${
                          cyberCredits >= blade.price
                            ? 'bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950 hover:brightness-110'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        UNLOCK ({blade.price} CREDITS)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dojo Upgrades */}
            <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 mb-6">
              <div className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-rose-400" /> Dojo Slicing Upgrades (250 Credits)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <button
                  onClick={() => buyUpgrade('w')}
                  disabled={cyberCredits < 250}
                  className="p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-left transition-all disabled:opacity-50"
                >
                  <div className="text-[10px] text-slate-400 font-bold">BLADE ARC WIDTH</div>
                  <div className="text-sm font-black text-rose-400">LVL {bladeWidthLevel}</div>
                </button>

                <button
                  onClick={() => buyUpgrade('sm')}
                  disabled={cyberCredits < 250}
                  className="p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-left transition-all disabled:opacity-50"
                >
                  <div className="text-[10px] text-slate-400 font-bold">SLOW-MO DURATION</div>
                  <div className="text-sm font-black text-cyan-400">LVL {slowMoLevel}</div>
                </button>

                <button
                  onClick={() => buyUpgrade('sh')}
                  disabled={cyberCredits < 250}
                  className="p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-left transition-all disabled:opacity-50"
                >
                  <div className="text-[10px] text-slate-400 font-bold">BOMB DEFLECTOR</div>
                  <div className="text-sm font-black text-amber-400">LVL {shieldLevel}</div>
                </button>
              </div>
            </div>

            {/* Return */}
            <button
              onClick={() => setGameState('menu')}
              className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-black rounded-xl transition-all"
            >
              BACK TO MAIN MENU
            </button>
          </div>
        </div>
      )}

      {/* --- PAUSED MODAL --- */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-20">
          <div className="max-w-sm w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-6 text-center shadow-2xl">
            <h3 className="text-2xl font-black text-white mb-2">DOJO PAUSED</h3>
            <p className="text-xs text-slate-400 mb-6">Sheath your katana and catch your breath</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setGameState('playing')}
                className="py-3 bg-rose-500 text-white font-black rounded-xl hover:bg-rose-400 transition-all"
              >
                RESUME SLICING
              </button>
              <button
                onClick={() => startRun(currentLevelIdx)}
                className="py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-all"
              >
                RESTART ROUND
              </button>
              <button
                onClick={() => setGameState('menu')}
                className="py-3 bg-slate-800 text-rose-400 font-bold rounded-xl hover:bg-slate-700 transition-all"
              >
                QUIT TO MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- GAME OVER SUMMARY MODAL --- */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-20">
          <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 md:p-8 text-center shadow-2xl">
            <div className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">
              Dojo Trial • Round Summary
            </div>

            <h2 className="text-3xl font-black text-white font-mono mb-4">ROUND OVER</h2>

            {isNewRecord && (
              <div className="inline-block px-4 py-1.5 bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black rounded-full mb-4 animate-bounce">
                ★ NEW HIGH SCORE RECORD! ★
              </div>
            )}

            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 mb-6 text-left">
              <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                <span className="text-slate-400 text-sm">Level Reached:</span>
                <span className="font-mono font-black text-cyan-400 text-base">Level {currentLevelConfig.level} ({currentLevelConfig.name})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                <span className="text-slate-400 text-sm">Fruits Sliced:</span>
                <span className="font-mono font-black text-amber-400 text-base">{totalSlicedCount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                <span className="text-slate-400 text-sm">Final Score:</span>
                <span className="font-mono font-black text-rose-400 text-base">{score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400 text-sm">Credits Earned:</span>
                <span className="font-mono font-black text-purple-400 text-base">+{Math.floor(score / 40)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => startRun(currentLevelIdx)}
                className="w-full py-4 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-black rounded-2xl shadow-xl shadow-rose-500/25 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> SLICE AGAIN
              </button>

              <button
                onClick={() => setGameState('menu')}
                className="w-full py-3 bg-slate-800 text-slate-300 font-bold rounded-2xl hover:bg-slate-700 transition-all"
              >
                MAIN MENU & LEVEL SELECT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CyberFruitKatana3D;
