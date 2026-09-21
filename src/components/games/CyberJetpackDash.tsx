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
  X,
  Shield,
  HelpCircle,
  ShoppingBag,
  Compass,
  Magnet,
  Rocket,
  Bot
} from 'lucide-react';
import { sound } from '../../utils/audio';

// Virtual Screen Coordinates
const V_WIDTH = 960;
const V_HEIGHT = 540;
const FLOOR_Y = 470;
const CEIL_Y = 60;

// Jetpack Upgrades
interface JetpackItem {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  color: string;
  flameColor: string;
  description: string;
  particleType: 'bullets' | 'rainbow' | 'plasma' | 'gravity' | 'gold';
}

// Outfit Items
interface OutfitItem {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  suitColor: string;
  visorColor: string;
  description: string;
}

const DEFAULT_JETPACKS: JetpackItem[] = [
  {
    id: 'bullet-jp',
    name: 'Mach-9 Bullet Thruster',
    price: 0,
    unlocked: true,
    color: '#94a3b8',
    flameColor: '#f59e0b',
    description: 'High-caliber downward bullet propulsion with shell casings.',
    particleType: 'bullets',
  },
  {
    id: 'rainbow-laser',
    name: 'Prism Rainbow Laser',
    price: 350,
    unlocked: false,
    color: '#c084fc',
    flameColor: '#38bdf8',
    description: 'Fires brilliant neon spectrum beam pulses.',
    particleType: 'rainbow',
  },
  {
    id: 'dragon-plasma',
    name: 'Solar Plasma Torch',
    price: 700,
    unlocked: false,
    color: '#f97316',
    flameColor: '#ef4444',
    description: 'Erupts intense solar flares with extra lift stability.',
    particleType: 'plasma',
  },
  {
    id: 'gravity-vortex',
    name: 'Quantum Singularity Engine',
    price: 1200,
    unlocked: false,
    color: '#06b6d4',
    flameColor: '#00f0ff',
    description: 'Generates anti-gravity dark matter shockwaves.',
    particleType: 'gravity',
  },
  {
    id: 'gold-booster',
    name: 'Midas Golden Emitter',
    price: 1800,
    unlocked: false,
    color: '#eab308',
    flameColor: '#fef08a',
    description: 'Rains golden sparks and doubles coin magnetic reach!',
    particleType: 'gold',
  },
];

const DEFAULT_OUTFITS: OutfitItem[] = [
  {
    id: 'agent-zero',
    name: 'Cyber Agent Zero',
    price: 0,
    unlocked: true,
    suitColor: '#0284c7',
    visorColor: '#00f0ff',
    description: 'Standard issue tactical cyberspace stealth uniform.',
  },
  {
    id: 'shadow-ninja',
    name: 'Nightshade Cyber Ninja',
    price: 400,
    unlocked: false,
    suitColor: '#581c87',
    visorColor: '#e879f9',
    description: 'Nanotech stealth fibers with reduced radar footprint.',
  },
  {
    id: 'solar-phoenix',
    name: 'Solar Titan Armor',
    price: 850,
    unlocked: false,
    suitColor: '#b45309',
    visorColor: '#fde047',
    description: 'Reinforced gilded alloy built for high-radiation zones.',
  },
  {
    id: 'mech-android',
    name: 'Chrome Android 99',
    price: 1500,
    unlocked: false,
    suitColor: '#334155',
    visorColor: '#ef4444',
    description: 'Full carbon-fiber robotic skeleton with glowing optics.',
  },
];

// Obstacle / Item Interfaces
interface Zapper {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angle: number;
  rotSpeed: number;
  length: number;
  active: boolean;
}

interface Missile {
  x: number;
  y: number;
  targetY: number;
  warningTimer: number; // >0 is warning phase
  speed: number;
  isFired: boolean;
  isEvaded: boolean;
}

interface LaserGrid {
  y: number;
  height: number;
  chargeTimer: number; // counts down
  activeDuration: number; // laser stays on
  state: 'charging' | 'firing' | 'cooldown';
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
  sinOffset: number;
}

interface PowerupBox {
  x: number;
  y: number;
  type: 'shield' | 'magnet' | 'turbo' | 'mech';
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
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

export const CyberJetpackDash: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High-level Game States
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [distance, setDistance] = useState<number>(0);
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_jetpack_coins') || '150', 10);
  });
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_jetpack_highscore') || '0', 10);
  });
  const [selectedJetpackId, setSelectedJetpackId] = useState<string>('bullet-jp');
  const [selectedOutfitId, setSelectedOutfitId] = useState<string>('agent-zero');
  const [jetpacks, setJetpacks] = useState<JetpackItem[]>(() => {
    const saved = localStorage.getItem('cyber_jetpack_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_JETPACKS;
      }
    }
    return DEFAULT_JETPACKS;
  });
  const [outfits, setOutfits] = useState<OutfitItem[]>(() => {
    const saved = localStorage.getItem('cyber_jetpack_outfits');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_OUTFITS;
      }
    }
    return DEFAULT_OUTFITS;
  });

  const [activePowerup, setActivePowerup] = useState<'none' | 'shield' | 'magnet' | 'turbo' | 'mech'>('none');
  const [powerupTimer, setPowerupTimer] = useState<number>(0);
  const [showArmory, setShowArmory] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());

  // Player Hold Ref
  const isThrustingRef = useRef<boolean>(false);

  // Engine Physics Simulation Reference
  const engineRef = useRef({
    player: {
      x: 180,
      y: FLOOR_Y - 40,
      vy: 0,
      width: 32,
      height: 48,
      isGrounded: true,
      runAnimFrame: 0,
      hasShield: false,
      magnetTimer: 0,
      turboTimer: 0,
      mechActive: false,
      angle: 0,
    },
    gameSpeed: 6.5,
    distanceMeters: 0,
    sessionCoins: 0,
    zappers: [] as Zapper[],
    missiles: [] as Missile[],
    lasers: [] as LaserGrid[],
    coins: [] as Coin[],
    powerups: [] as PowerupBox[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    textCounter: 1,
    screenShake: 0,
    bgOffset: 0,
    spawnDistanceTimer: 0,
    missileAlertTimer: 0,
    soundLoopTimer: 0,
  });

  // Callout Text Helper
  const triggerCallout = (text: string, color: string = '#00f0ff') => {
    const eng = engineRef.current;
    sound.playDriftBonus();
    eng.floatingTexts.push({
      id: eng.textCounter++,
      text,
      color,
      x: eng.player.x + 30,
      y: eng.player.y - 20,
      alpha: 1.0,
    });
  };

  // Particle Emitter
  const emitParticles = (x: number, y: number, count: number, color: string, speedMult: number = 1) => {
    const eng = engineRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 3 + 1.2) * speedMult;
      eng.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3.5 + 1.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 20,
      });
    }
  };

  // Generate Structured Coin Patterns
  const spawnCoinPattern = (startX: number) => {
    const eng = engineRef.current;
    const patternType = Math.floor(Math.random() * 4);
    const baseY = Math.floor(Math.random() * (FLOOR_Y - 200)) + 120;

    if (patternType === 0) {
      // Horizontal Wave
      for (let i = 0; i < 8; i++) {
        eng.coins.push({
          x: startX + i * 36,
          y: baseY + Math.sin(i * 0.7) * 45,
          collected: false,
          sinOffset: i * 0.4,
        });
      }
    } else if (patternType === 1) {
      // Arrow Up-Down
      for (let i = 0; i < 5; i++) {
        eng.coins.push({ x: startX + i * 32, y: baseY - i * 18, collected: false, sinOffset: i });
        eng.coins.push({ x: startX + i * 32, y: baseY + i * 18, collected: false, sinOffset: i });
      }
    } else if (patternType === 2) {
      // Rectangle Block
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          eng.coins.push({
            x: startX + c * 32,
            y: baseY + r * 30,
            collected: false,
            sinOffset: r + c,
          });
        }
      }
    } else {
      // High-Altitude Coin Arch
      for (let i = 0; i < 10; i++) {
        const archY = baseY - Math.sin((i / 10) * Math.PI) * 70;
        eng.coins.push({ x: startX + i * 30, y: archY, collected: false, sinOffset: i });
      }
    }
  };

  // Spawn Obstacles & Hazards ahead
  const spawnHazards = (startX: number) => {
    const eng = engineRef.current;
    const rand = Math.random();

    // 1. Zapper Obstacles
    if (rand < 0.65) {
      const zY = Math.floor(Math.random() * (FLOOR_Y - 180)) + 100;
      const zLength = Math.floor(Math.random() * 60) + 90;
      const zRot = (Math.random() - 0.5) * 0.04;
      const angle = Math.random() * Math.PI;

      eng.zappers.push({
        x1: startX,
        y1: zY - Math.sin(angle) * (zLength / 2),
        x2: startX + Math.cos(angle) * zLength,
        y2: zY + Math.sin(angle) * (zLength / 2),
        angle,
        rotSpeed: zRot,
        length: zLength,
        active: true,
      });
    }

    // 2. Powerup Box Chance
    if (Math.random() < 0.25) {
      const pTypes: Array<'shield' | 'magnet' | 'turbo' | 'mech'> = ['shield', 'magnet', 'turbo', 'mech'];
      const chosen = pTypes[Math.floor(Math.random() * pTypes.length)];
      const pY = Math.floor(Math.random() * (FLOOR_Y - 220)) + 120;
      eng.powerups.push({
        x: startX + 150,
        y: pY,
        type: chosen,
        collected: false,
      });
    }

    // 3. Coin Clusters
    spawnCoinPattern(startX + 60);
  };

  // Initialize and Reset Game
  const initGame = useCallback(() => {
    const eng = engineRef.current;
    eng.player = {
      x: 180,
      y: FLOOR_Y - 48,
      vy: 0,
      width: 32,
      height: 48,
      isGrounded: true,
      runAnimFrame: 0,
      hasShield: false,
      magnetTimer: 0,
      turboTimer: 0,
      mechActive: false,
      angle: 0,
    };
    eng.gameSpeed = 6.5;
    eng.distanceMeters = 0;
    eng.sessionCoins = 0;
    eng.zappers = [];
    eng.missiles = [];
    eng.lasers = [];
    eng.coins = [];
    eng.powerups = [];
    eng.particles = [];
    eng.floatingTexts = [];
    eng.screenShake = 0;
    eng.bgOffset = 0;
    eng.spawnDistanceTimer = 0;
    eng.missileAlertTimer = 0;
    eng.soundLoopTimer = 0;

    isThrustingRef.current = false;
    setDistance(0);
    setActivePowerup('none');
    setPowerupTimer(0);

    // Initial safe terrain and initial coin layout
    spawnCoinPattern(400);
    spawnCoinPattern(700);
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

  // Keyboard & Space / Touch controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        if (!isThrustingRef.current && gameState === 'playing') {
          sound.playJetpackPulse();
        }
        isThrustingRef.current = true;
      }
      if (e.code === 'KeyR' && gameState === 'gameover') {
        handleRestart();
      }
      if (e.code === 'KeyG') {
        setShowArmory((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        isThrustingRef.current = false;
      }
    };

    const handlePointerUpGlobal = () => {
      isThrustingRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerup', handlePointerUpGlobal);
    window.addEventListener('pointercancel', handlePointerUpGlobal);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerup', handlePointerUpGlobal);
      window.removeEventListener('pointercancel', handlePointerUpGlobal);
    };
  }, [gameState]);

  // Buy & Equip Items
  const buyJetpack = (item: JetpackItem) => {
    if (coins >= item.price && !item.unlocked) {
      const newCoins = coins - item.price;
      const updated = jetpacks.map((j) => (j.id === item.id ? { ...j, unlocked: true } : j));
      setCoins(newCoins);
      setJetpacks(updated);
      setSelectedJetpackId(item.id);
      localStorage.setItem('cyber_jetpack_coins', newCoins.toString());
      localStorage.setItem('cyber_jetpack_items', JSON.stringify(updated));
      sound.playPowerup();
    }
  };

  const equipJetpack = (item: JetpackItem) => {
    if (item.unlocked) {
      setSelectedJetpackId(item.id);
      sound.playClick();
    }
  };

  const buyOutfit = (item: OutfitItem) => {
    if (coins >= item.price && !item.unlocked) {
      const newCoins = coins - item.price;
      const updated = outfits.map((o) => (o.id === item.id ? { ...o, unlocked: true } : o));
      setCoins(newCoins);
      setOutfits(updated);
      setSelectedOutfitId(item.id);
      localStorage.setItem('cyber_jetpack_coins', newCoins.toString());
      localStorage.setItem('cyber_jetpack_outfits', JSON.stringify(updated));
      sound.playPowerup();
    }
  };

  const equipOutfit = (item: OutfitItem) => {
    if (item.unlocked) {
      setSelectedOutfitId(item.id);
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
      const activeJp = jetpacks.find((j) => j.id === selectedJetpackId) || DEFAULT_JETPACKS[0];
      const activeSuit = outfits.find((o) => o.id === selectedOutfitId) || DEFAULT_OUTFITS[0];

      // ============================================
      // 1. UPDATE PHYSICS & ENTITIES
      // ============================================
      if (gameState === 'playing') {
        // Distance progress & speed ramping
        eng.distanceMeters += eng.gameSpeed * 0.045;
        const currentDist = Math.floor(eng.distanceMeters);
        setDistance(currentDist);
        if (currentDist > highScore) {
          setHighScore(currentDist);
          localStorage.setItem('cyber_jetpack_highscore', currentDist.toString());
        }

        // Gradual speed acceleration
        const isTurbo = p.turboTimer > 0;
        const targetSpeed = isTurbo ? 14 : Math.min(10.5, 6.5 + eng.distanceMeters * 0.003);
        eng.gameSpeed += (targetSpeed - eng.gameSpeed) * 0.05;

        // Background scrolling offset
        eng.bgOffset = (eng.bgOffset + eng.gameSpeed) % V_WIDTH;

        // Powerup Timers
        if (p.turboTimer > 0) {
          p.turboTimer--;
          setPowerupTimer(p.turboTimer);
          if (p.turboTimer <= 0) setActivePowerup('none');
          // Turbo sparks trail
          emitParticles(p.x, p.y + 20, 3, '#38bdf8', 2.0);
        } else if (p.magnetTimer > 0) {
          p.magnetTimer--;
          setPowerupTimer(p.magnetTimer);
          if (p.magnetTimer <= 0) setActivePowerup('none');
        }

        // Jetpack Physics & Thrust
        if (isThrustingRef.current || isTurbo) {
          // Accelerate upwards
          const thrustPower = p.mechActive ? 0.75 : 0.62;
          p.vy -= thrustPower;
          p.angle = Math.max(-0.25, p.angle - 0.05);

          // Audio pulse
          eng.soundLoopTimer++;
          if (eng.soundLoopTimer % 10 === 0) {
            sound.playJetpackPulse();
          }

          // Emit jetpack thruster particles downwards
          const nozzleX = p.x - 10;
          const nozzleY = p.y + (p.mechActive ? 40 : 34);

          if (activeJp.particleType === 'bullets') {
            // Bullet projectile sparks
            for (let b = 0; b < 2; b++) {
              eng.particles.push({
                x: nozzleX + (Math.random() - 0.5) * 6,
                y: nozzleY,
                vx: -eng.gameSpeed * 0.4 + (Math.random() - 0.5) * 3,
                vy: Math.random() * 8 + 6,
                radius: 2.2,
                color: '#f59e0b',
                alpha: 1,
                life: 0,
                maxLife: 24,
              });
            }
          } else if (activeJp.particleType === 'rainbow') {
            const colors = ['#f43f5e', '#fbbf24', '#34d399', '#38bdf8', '#c084fc'];
            const randCol = colors[Math.floor(Math.random() * colors.length)];
            eng.particles.push({
              x: nozzleX,
              y: nozzleY,
              vx: -eng.gameSpeed * 0.3 + (Math.random() - 0.5) * 4,
              vy: Math.random() * 7 + 4,
              radius: Math.random() * 4 + 2,
              color: randCol,
              alpha: 1,
              life: 0,
              maxLife: 30,
            });
          } else if (activeJp.particleType === 'plasma') {
            eng.particles.push({
              x: nozzleX,
              y: nozzleY,
              vx: (Math.random() - 0.5) * 5,
              vy: Math.random() * 9 + 5,
              radius: Math.random() * 5 + 3,
              color: '#ef4444',
              alpha: 1,
              life: 0,
              maxLife: 26,
            });
          } else {
            // Gold / Gravity
            eng.particles.push({
              x: nozzleX,
              y: nozzleY,
              vx: (Math.random() - 0.5) * 4,
              vy: Math.random() * 8 + 4,
              radius: 3.5,
              color: activeJp.flameColor,
              alpha: 1,
              life: 0,
              maxLife: 25,
            });
          }
        } else {
          // Gravity pull downwards
          p.vy += p.mechActive ? 0.48 : 0.36;
          p.angle = Math.min(0.2, p.angle + 0.04);
        }

        // Clamp terminal velocity
        p.vy = Math.max(-9.5, Math.min(10.5, p.vy));
        p.y += p.vy;

        // Ground & Ceiling Collisions
        if (p.y >= FLOOR_Y - p.height) {
          p.y = FLOOR_Y - p.height;
          p.vy = 0;
          p.isGrounded = true;
          p.angle = 0;
          p.runAnimFrame += 0.25;
        } else {
          p.isGrounded = false;
        }

        if (p.y <= CEIL_Y) {
          p.y = CEIL_Y;
          p.vy = 0;
        }

        // Missile Spawner & AI Tracker
        eng.missileAlertTimer++;
        if (eng.missileAlertTimer > 280 && eng.distanceMeters > 50 && eng.missiles.length === 0) {
          eng.missileAlertTimer = 0;
          sound.playMissileWarning();
          eng.missiles.push({
            x: V_WIDTH + 60,
            y: p.y,
            targetY: p.y,
            warningTimer: 90,
            speed: 12.5,
            isFired: false,
            isEvaded: false,
          });
        }

        // Update Missiles
        for (let i = eng.missiles.length - 1; i >= 0; i--) {
          const m = eng.missiles[i];
          if (m.warningTimer > 0) {
            m.warningTimer--;
            // Smoothly lock onto player Y position during warning phase
            m.targetY += (p.y - m.targetY) * 0.06;
            m.y = m.targetY;

            if (m.warningTimer % 30 === 0) {
              sound.playMissileWarning();
            }

            if (m.warningTimer === 0) {
              m.isFired = true;
              sound.playLaser();
            }
          } else {
            // Rocket zoomed across screen
            m.x -= m.speed + eng.gameSpeed;

            // Rocket smoke trail
            emitParticles(m.x + 35, m.y + 6, 2, '#fbbf24', 1.2);

            // Evaded bonus
            if (!m.isEvaded && m.x < p.x - 40) {
              m.isEvaded = true;
              triggerCallout('🚀 MISSILE DODGED! +50', '#38bdf8');
              setCoins((c) => {
                const next = c + 5;
                localStorage.setItem('cyber_jetpack_coins', next.toString());
                return next;
              });
            }

            // Missile Player Collision
            if (
              !isTurbo &&
              Math.abs(p.x - m.x) < 28 &&
              Math.abs(p.y + p.height / 2 - m.y) < 22
            ) {
              // Hit by missile!
              if (p.hasShield || p.mechActive) {
                // Shield / Mech absorbs missile hit!
                if (p.mechActive) {
                  p.mechActive = false;
                  setActivePowerup('none');
                } else {
                  p.hasShield = false;
                  setActivePowerup('none');
                }
                eng.screenShake = 18;
                sound.playExplosion();
                emitParticles(m.x, m.y, 35, '#00f0ff', 3.5);
                triggerCallout('🛡️ SHIELD BROKEN!', '#38bdf8');
                eng.missiles.splice(i, 1);
                continue;
              } else {
                // Game Over!
                sound.playExplosion();
                sound.playGameOver();
                eng.screenShake = 24;
                emitParticles(p.x, p.y, 45, '#ef4444', 4.0);
                setGameState('gameover');
              }
            }

            if (m.x < -100) {
              eng.missiles.splice(i, 1);
            }
          }
        }

        // Spawn Spaced Hazards Ahead
        eng.spawnDistanceTimer += eng.gameSpeed;
        if (eng.spawnDistanceTimer > 320) {
          eng.spawnDistanceTimer = 0;
          spawnHazards(V_WIDTH + 80);
        }

        // Update Zappers & Collision Checks
        for (let i = eng.zappers.length - 1; i >= 0; i--) {
          const z = eng.zappers[i];
          z.x1 -= eng.gameSpeed;
          z.x2 -= eng.gameSpeed;

          // Rotate around center
          if (z.rotSpeed !== 0) {
            z.angle += z.rotSpeed;
            const midX = (z.x1 + z.x2) / 2;
            const midY = (z.y1 + z.y2) / 2;
            z.x1 = midX - Math.cos(z.angle) * (z.length / 2);
            z.y1 = midY - Math.sin(z.angle) * (z.length / 2);
            z.x2 = midX + Math.cos(z.angle) * (z.length / 2);
            z.y2 = midY + Math.sin(z.angle) * (z.length / 2);
          }

          // Line Segment to Point Distance for Player Hitbox
          if (!isTurbo) {
            const playerCenterX = p.x;
            const playerCenterY = p.y + p.height / 2;

            const lineDx = z.x2 - z.x1;
            const lineDy = z.y2 - z.y1;
            const lineLenSq = lineDx * lineDx + lineDy * lineDy;

            let t = ((playerCenterX - z.x1) * lineDx + (playerCenterY - z.y1) * lineDy) / lineLenSq;
            t = Math.max(0, Math.min(1, t));

            const closestX = z.x1 + t * lineDx;
            const closestY = z.y1 + t * lineDy;
            const dist = Math.hypot(playerCenterX - closestX, playerCenterY - closestY);

            if (dist < 22) {
              if (p.hasShield || p.mechActive) {
                if (p.mechActive) {
                  p.mechActive = false;
                  setActivePowerup('none');
                } else {
                  p.hasShield = false;
                  setActivePowerup('none');
                }
                eng.screenShake = 16;
                sound.playZapperZap();
                emitParticles(closestX, closestY, 30, '#00f0ff', 3.0);
                triggerCallout('🛡️ DEFLECTED!', '#38bdf8');
                z.active = false;
                eng.zappers.splice(i, 1);
                continue;
              } else {
                // Fried by zapper!
                sound.playZapperZap();
                sound.playGameOver();
                eng.screenShake = 22;
                emitParticles(p.x, p.y, 40, '#ef4444', 3.5);
                setGameState('gameover');
              }
            }
          }

          if (z.x1 < -120 && z.x2 < -120) {
            eng.zappers.splice(i, 1);
          }
        }

        // Update Coins & Magnet Attractor
        const magnetActive = p.magnetTimer > 0 || activeJp.particleType === 'gold';
        for (let i = eng.coins.length - 1; i >= 0; i--) {
          const c = eng.coins[i];
          c.x -= eng.gameSpeed;

          // Magnet Attraction
          if (magnetActive && !c.collected) {
            const dx = p.x - c.x;
            const dy = (p.y + p.height / 2) - c.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 260) {
              c.x += (dx / dist) * 12;
              c.y += (dy / dist) * 12;
            }
          }

          // Coin Collection Check
          if (!c.collected && Math.hypot(p.x - c.x, (p.y + p.height / 2) - c.y) < 32) {
            c.collected = true;
            eng.sessionCoins++;
            sound.playCollect();
            emitParticles(c.x, c.y, 8, '#fbbf24', 1.5);
            setCoins((prev) => {
              const updated = prev + 1;
              localStorage.setItem('cyber_jetpack_coins', updated.toString());
              return updated;
            });
          }

          if (c.x < -40 || c.collected) {
            eng.coins.splice(i, 1);
          }
        }

        // Update Powerups
        for (let i = eng.powerups.length - 1; i >= 0; i--) {
          const pw = eng.powerups[i];
          pw.x -= eng.gameSpeed;

          if (!pw.collected && Math.hypot(p.x - pw.x, (p.y + p.height / 2) - pw.y) < 38) {
            pw.collected = true;
            sound.playPowerup();
            emitParticles(pw.x, pw.y, 25, '#38bdf8', 3.0);

            if (pw.type === 'shield') {
              p.hasShield = true;
              setActivePowerup('shield');
              triggerCallout('🛡️ QUANTUM SHIELD!', '#38bdf8');
            } else if (pw.type === 'magnet') {
              p.magnetTimer = 360; // ~6 seconds
              setActivePowerup('magnet');
              setPowerupTimer(360);
              triggerCallout('🧲 COIN MAGNET ACTIVATED!', '#f59e0b');
            } else if (pw.type === 'turbo') {
              p.turboTimer = 240; // ~4 seconds
              setActivePowerup('turbo');
              setPowerupTimer(240);
              eng.screenShake = 15;
              sound.playNitroBoost();
              triggerCallout('⚡ SUPERSONIC BOOST!', '#00f0ff');
            } else if (pw.type === 'mech') {
              p.mechActive = true;
              setActivePowerup('mech');
              triggerCallout('🤖 TITAN MECH SUIT!', '#a855f7');
            }

            eng.powerups.splice(i, 1);
          } else if (pw.x < -60) {
            eng.powerups.splice(i, 1);
          }
        }

        if (eng.screenShake > 0) {
          eng.screenShake *= 0.9;
        }
      }

      // ============================================
      // 2. RENDER RETRO-FUTURISTIC LABORATORY CANVAS
      // ============================================
      ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

      const shakeX = (Math.random() - 0.5) * eng.screenShake;
      const shakeY = (Math.random() - 0.5) * eng.screenShake;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Deep Sci-Fi Backdrop Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#0b1329');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      // Parallax Background Grid & Wall Server Pillars
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1.5;
      const gridW = 60;
      for (let x = -eng.bgOffset * 0.3; x < V_WIDTH; x += gridW) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, V_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < V_HEIGHT; y += gridW) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(V_WIDTH, y);
        ctx.stroke();
      }

      // Glowing Neon Pipes along the ceiling
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, V_WIDTH, CEIL_Y);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, CEIL_Y);
      ctx.lineTo(V_WIDTH, CEIL_Y);
      ctx.stroke();

      // Laboratory Metallic Floor
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, FLOOR_Y, V_WIDTH, V_HEIGHT - FLOOR_Y);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, FLOOR_Y);
      ctx.lineTo(V_WIDTH, FLOOR_Y);
      ctx.stroke();

      // Floor Hazard Warning Stripes
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
      const stripeW = 40;
      for (let x = -eng.bgOffset; x < V_WIDTH + stripeW; x += stripeW * 2) {
        ctx.beginPath();
        ctx.moveTo(x, FLOOR_Y);
        ctx.lineTo(x + stripeW, FLOOR_Y);
        ctx.lineTo(x + stripeW - 15, V_HEIGHT);
        ctx.lineTo(x - 15, V_HEIGHT);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Render Floating Coins
      eng.coins.forEach((coin) => {
        ctx.save();
        ctx.translate(coin.x, coin.y);
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;

        // Outer Gold Ring
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner Shiny Core
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Powerup Mystery Crates
      eng.powerups.forEach((pw) => {
        ctx.save();
        ctx.translate(pw.x, pw.y);
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 16;

        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-16, -16, 32, 32, 6);
        ctx.fill();
        ctx.stroke();

        // Powerup Icon Indicator
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = pw.type === 'shield' ? '🛡️' : pw.type === 'magnet' ? '🧲' : pw.type === 'turbo' ? '⚡' : '🤖';
        ctx.fillText(label, 0, 0);
        ctx.restore();
      });

      // Render Electric Zapper Beams
      eng.zappers.forEach((z) => {
        ctx.save();
        // Electrodes at ends
        const drawNode = (nx: number, ny: number) => {
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(nx, ny, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
          ctx.fill();
        };

        drawNode(z.x1, z.y1);
        drawNode(z.x2, z.y2);

        // Jagged Electric Plasma Beam between nodes
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(z.x1, z.y1);

        const segments = 6;
        const dx = (z.x2 - z.x1) / segments;
        const dy = (z.y2 - z.y1) / segments;

        for (let s = 1; s < segments; s++) {
          const jitter = (Math.random() - 0.5) * 16;
          ctx.lineTo(z.x1 + dx * s + (dy !== 0 ? jitter : 0), z.y1 + dy * s + jitter);
        }
        ctx.lineTo(z.x2, z.y2);
        ctx.stroke();
        ctx.restore();
      });

      // Render Incoming Missile Warning & Missiles
      eng.missiles.forEach((m) => {
        if (m.warningTimer > 0) {
          // Warning Flashing Icon on Right Side
          ctx.save();
          ctx.translate(V_WIDTH - 40, m.y);
          const flash = Math.sin(Date.now() * 0.02) > 0;
          ctx.fillStyle = flash ? '#ef4444' : '#dc2626';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 20;

          // Warning Exclamation Box
          ctx.beginPath();
          ctx.roundRect(-18, -14, 36, 28, 6);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'black 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', 0, 0);

          // Guide line towards warning
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-V_WIDTH + 80, 0);
          ctx.stroke();
          ctx.restore();
        } else {
          // Fired Rocket Projectile
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 16;

          // Rocket Body
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.roundRect(-24, -8, 48, 16, 4);
          ctx.fill();

          // Rocket Cone Nose
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(-24, -8);
          ctx.lineTo(-34, 0);
          ctx.lineTo(-24, 8);
          ctx.closePath();
          ctx.fill();

          // Rocket Rear Exhaust Flame
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.moveTo(24, -6);
          ctx.lineTo(38 + Math.random() * 8, 0);
          ctx.lineTo(24, 6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      });

      // ============================================
      // 3. RENDER PLAYER HERO & JETPACK SUIT
      // ============================================
      ctx.save();
      ctx.translate(p.x, p.y + p.height / 2);
      ctx.rotate(p.angle);

      if (p.mechActive) {
        // TITAN ROBOT WALKER MECH SUIT
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2.5;

        // Mech Main Frame
        ctx.beginPath();
        ctx.roundRect(-24, -28, 48, 56, 8);
        ctx.fill();
        ctx.stroke();

        // Cockpit Glass
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(-12, -18, 24, 16);

        // Mech Thrusters
        ctx.fillStyle = '#9333ea';
        ctx.fillRect(-28, 0, 8, 20);
      } else {
        // CYBER AGENT HERO
        // 1. Jetpack On Back
        ctx.shadowColor = activeJp.flameColor;
        ctx.shadowBlur = 12;
        ctx.fillStyle = activeJp.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-18, -14, 14, 28, 4);
        ctx.fill();
        ctx.stroke();

        // 2. Character Body Suit
        ctx.shadowColor = activeSuit.visorColor;
        ctx.shadowBlur = 8;
        ctx.fillStyle = activeSuit.suitColor;
        ctx.beginPath();
        ctx.roundRect(-8, -16, 20, 32, 6);
        ctx.fill();

        // 3. Cyber Visor / Helmet Head
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(4, -22, 11, 0, Math.PI * 2);
        ctx.fill();

        // Glowing Visor Strip
        ctx.fillStyle = activeSuit.visorColor;
        ctx.shadowColor = activeSuit.visorColor;
        ctx.shadowBlur = 14;
        ctx.fillRect(4, -24, 9, 5);

        // 4. Running Legs when grounded
        if (p.isGrounded) {
          const legSwing = Math.sin(p.runAnimFrame) * 8;
          ctx.strokeStyle = activeSuit.suitColor;
          ctx.lineWidth = 4;
          // Leg 1
          ctx.beginPath();
          ctx.moveTo(-2, 16);
          ctx.lineTo(-2 + legSwing, 24);
          ctx.stroke();
          // Leg 2
          ctx.beginPath();
          ctx.moveTo(6, 16);
          ctx.lineTo(6 - legSwing, 24);
          ctx.stroke();
        } else {
          // Floating Thruster Flight Legs
          ctx.strokeStyle = activeSuit.suitColor;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-2, 16);
          ctx.lineTo(-6, 22);
          ctx.stroke();
        }
      }

      // Energy Shield Bubble around Player
      if (p.hasShield) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 20;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(2, 0, 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Magnet Aura
      if (p.magnetTimer > 0) {
        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(2, 0, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore(); // Restore player transform

      // Particles (Thruster fire, coin sparkles, explosions)
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const pt = eng.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
        pt.alpha = 1 - pt.life / pt.maxLife;

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();

        if (pt.life >= pt.maxLife) {
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
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 12;
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
  }, [gameState, selectedJetpackId, selectedOutfitId, jetpacks, outfits, highScore]);

  return (
    <div id="cyber-jetpack-dash-root" className="w-full flex flex-col items-center select-none">
      {/* Top HUD Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-t border-x border-slate-800 rounded-t-2xl backdrop-blur-md">
        {/* Left: Distance & Best */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Distance</span>
              <span className="text-lg font-black text-white leading-none">{distance} M</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>BEST: {highScore} M</span>
          </div>

          {/* Active Powerup Badge */}
          {activePowerup !== 'none' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs font-black animate-pulse">
              {activePowerup === 'shield' && <Shield className="w-3.5 h-3.5 text-sky-400" />}
              {activePowerup === 'magnet' && <Magnet className="w-3.5 h-3.5 text-amber-400" />}
              {activePowerup === 'turbo' && <Rocket className="w-3.5 h-3.5 text-cyan-400" />}
              {activePowerup === 'mech' && <Bot className="w-3.5 h-3.5 text-purple-400" />}
              <span className="uppercase">{activePowerup}</span>
            </div>
          )}
        </div>

        {/* Right: Coins, Armory, Help & Sound */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{coins}</span>
          </div>

          <button
            id="jetpack-armory-btn"
            onClick={() => {
              sound.playClick();
              setShowArmory((prev) => !prev);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Jetpack Armory & Outfits"
          >
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            id="jetpack-help-btn"
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
            id="jetpack-sound-btn"
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
          onMouseDown={() => {
            if (gameState === 'playing') {
              sound.playJetpackPulse();
              isThrustingRef.current = true;
            }
          }}
          onMouseUp={() => {
            isThrustingRef.current = false;
          }}
          onTouchStart={() => {
            if (gameState === 'playing') {
              sound.playJetpackPulse();
              isThrustingRef.current = true;
            }
          }}
          onTouchEnd={() => {
            isThrustingRef.current = false;
          }}
        />

        {/* START SCREEN OVERLAY */}
        {gameState === 'start' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 space-y-5 animate-fade-in">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold tracking-wider uppercase">
                <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                CYBER JETPACK ESCAPE
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                NEON JETPACK: <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300">OVERDRIVE</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Press and hold <span className="text-cyan-400 font-bold">CLICK / SPACEBAR / W</span> to fire your thrusters and soar upward. Dodge high-voltage electric zappers and incoming tracking missiles!
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                id="start-jetpack-game-btn"
                onClick={handleStart}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-cyan-500/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                LAUNCH JETPACK
              </button>

              <button
                id="start-open-armory-btn"
                onClick={() => {
                  sound.playClick();
                  setShowArmory(true);
                }}
                className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm flex items-center gap-2 transition-all"
              >
                <ShoppingBag className="w-4 h-4 text-cyan-400" />
                ARMORY
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
              <h2 className="text-2xl sm:text-4xl font-black text-white">LABORATORY CASUALTY!</h2>
              <p className="text-xs sm:text-sm text-slate-400">Your jetpack run was terminated by cyber defenses</p>
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 w-full max-w-sm">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Distance</span>
                <div className="text-base sm:text-lg font-black text-cyan-400">{distance} M</div>
              </div>
              <div className="text-center border-x border-slate-800 px-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Coins</span>
                <div className="text-base sm:text-lg font-black text-amber-400">+{engineRef.current.sessionCoins}</div>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Best</span>
                <div className="text-base sm:text-lg font-black text-white">{highScore} M</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="jetpack-retry-btn"
                onClick={handleRestart}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                PLAY AGAIN (R)
              </button>

              <button
                id="jetpack-gameover-armory-btn"
                onClick={() => {
                  sound.playClick();
                  setShowArmory(true);
                }}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm flex items-center gap-2 transition-all"
              >
                <ShoppingBag className="w-4 h-4 text-cyan-400" />
                ARMORY
              </button>
            </div>
          </div>
        )}

        {/* MOBILE HOLD-TO-FLY TOUCH AREA */}
        {gameState === 'playing' && (
          <div className="absolute inset-x-0 bottom-3 px-6 flex items-center justify-center pointer-events-none sm:hidden">
            <div className="px-6 py-2 rounded-full bg-slate-900/80 border border-cyan-500/30 text-cyan-300 font-bold text-xs backdrop-blur-sm animate-pulse">
              HOLD SCREEN TO THRUST UPWARD
            </div>
          </div>
        )}
      </div>

      {/* JETPACK ARMORY MODAL */}
      {showArmory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white">Jetpack Armory & Outfits</h3>
                  <p className="text-xs text-slate-400">Unlock thruster emitters and cybernetic suits</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{coins} Coins</span>
                </div>
                <button
                  onClick={() => setShowArmory(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Jetpack Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Rocket className="w-4 h-4" /> Jetpack Emitters
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {jetpacks.map((jp) => {
                  const isSelected = selectedJetpackId === jp.id;
                  return (
                    <div
                      key={jp.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-cyan-950/30 border-cyan-500 shadow-md shadow-cyan-950/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="text-sm font-extrabold text-white">{jp.name}</h5>
                          <p className="text-[11px] text-slate-400">{jp.description}</p>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: jp.flameColor }}
                        />
                      </div>

                      <div className="pt-1">
                        {jp.unlocked ? (
                          <button
                            onClick={() => equipJetpack(jp)}
                            className={`w-full py-1.5 rounded-xl font-bold text-xs transition-all ${
                              isSelected
                                ? 'bg-cyan-500 text-slate-950'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isSelected ? 'EQUIPPED' : 'EQUIP'}
                          </button>
                        ) : (
                          <button
                            onClick={() => buyJetpack(jp)}
                            disabled={coins < jp.price}
                            className={`w-full py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                              coins >= jp.price
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                                : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            UNLOCK FOR {jp.price} COINS
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Outfits Section */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-bold text-fuchsia-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> Agent Flight Suits
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {outfits.map((suit) => {
                  const isSelected = selectedOutfitId === suit.id;
                  return (
                    <div
                      key={suit.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-fuchsia-950/30 border-fuchsia-500 shadow-md shadow-fuchsia-950/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="text-sm font-extrabold text-white">{suit.name}</h5>
                          <p className="text-[11px] text-slate-400">{suit.description}</p>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: suit.visorColor }}
                        />
                      </div>

                      <div className="pt-1">
                        {suit.unlocked ? (
                          <button
                            onClick={() => equipOutfit(suit)}
                            className={`w-full py-1.5 rounded-xl font-bold text-xs transition-all ${
                              isSelected
                                ? 'bg-fuchsia-500 text-slate-950'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isSelected ? 'EQUIPPED' : 'EQUIP'}
                          </button>
                        ) : (
                          <button
                            onClick={() => buyOutfit(suit)}
                            disabled={coins < suit.price}
                            className={`w-full py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                              coins >= suit.price
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                                : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            UNLOCK FOR {suit.price} COINS
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

      {/* HOW TO PLAY MODAL */}
      {showHelp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">How to Play Neon Jetpack</h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <Rocket className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Thruster Controls:</strong> Press & Hold Space, Click, W, or Touch anywhere to ascend. Release to drop with gravity.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Dodge Hazards:</strong> Avoid rotating electric zappers and incoming tracking missiles.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Powerups & Upgrades:</strong> Collect Shields, Coin Magnets, Turbo Boosters, and Titan Mech suits. Use earned coins in the Armory!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
            >
              GOT IT, LET'S FLY!
            </button>
          </div>
        </div>
      )}

      {/* Mobile Thrust Button */}
      <div className="w-full flex items-center justify-between mt-3 px-2 gap-2 select-none touch-none">
        <div className="text-slate-400 text-xs font-bold hidden sm:block">
          Tap & hold to ignite plasma thrusters and ascend!
        </div>

        <button
          onPointerDown={(e) => {
            e.preventDefault();
            if (gameState === 'playing') {
              sound.playJetpackPulse();
              isThrustingRef.current = true;
            } else if (gameState === 'start') {
              handleStart();
            } else if (gameState === 'gameover') {
              handleRestart();
            }
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            isThrustingRef.current = false;
          }}
          onPointerLeave={() => {
            isThrustingRef.current = false;
          }}
          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 active:from-cyan-400 active:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/40 active:scale-95 transition-transform"
        >
          <Rocket className="w-5 h-5" />
          <span>HOLD TO THRUST (🚀)</span>
        </button>
      </div>
    </div>
  );
};
