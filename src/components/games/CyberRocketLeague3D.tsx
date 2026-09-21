import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Play,
  ChevronRight, Car, Gauge, Award, Flame, Star, ShoppingBag,
  Crosshair, Radio, AlertTriangle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  HelpCircle, Compass, Lock, CheckCircle2, CircleDot, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// TYPES & DATA STRUCTURES
// ----------------------------------------------------

export interface RocketCar {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  color: string;
  glowColor: string;
  accentColor: string;
  topSpeed: number;     // km/h
  accel: number;        // Accel multiplier
  boostPower: number;   // Supersonic boost thrust
  handling: number;     // Turn rate
  weight: number;       // Ball impact impulse
  hitboxWidth: number;
  hitboxLength: number;
  description: string;
}

export interface BoostSkin {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  color1: string;
  color2: string;
}

export interface TournamentMatch {
  round: 'Quarter-Finals' | 'Semi-Finals' | 'Grand Finals';
  opponentName: string;
  difficulty: 'Rookie' | 'Pro' | 'All-Star' | 'Godlike';
  rewardCredits: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  shape?: 'circle' | 'spark' | 'smoke' | 'shockwave';
}

interface BoostPad {
  x: number;
  y: number;
  isBig: boolean;
  active: boolean;
  respawnTimer: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
}

// ----------------------------------------------------
// DEFAULT CATALOG DATA
// ----------------------------------------------------

const BATTLE_CARS: RocketCar[] = [
  {
    id: 'octane-cyber',
    name: 'Octane Cyber',
    price: 0,
    unlocked: true,
    color: '#0284c7',
    glowColor: '#38bdf8',
    accentColor: '#f43f5e',
    topSpeed: 210,
    accel: 1.0,
    boostPower: 1.1,
    handling: 85,
    weight: 50,
    hitboxWidth: 32,
    hitboxLength: 54,
    description: 'The iconic balanced tournament striker with responsive aerial flips.',
  },
  {
    id: 'dominus-gt',
    name: 'Dominus GT Neon',
    price: 350,
    unlocked: false,
    color: '#ea580c',
    glowColor: '#f97316',
    accentColor: '#facc15',
    topSpeed: 235,
    accel: 1.1,
    boostPower: 1.2,
    handling: 82,
    weight: 55,
    hitboxWidth: 30,
    hitboxLength: 60,
    description: 'Long low-profile muscle car designed for devastating power shots.',
  },
  {
    id: 'fennec-apex',
    name: 'Fennec Apex',
    price: 750,
    unlocked: false,
    color: '#a855f7',
    glowColor: '#c084fc',
    accentColor: '#00f0ff',
    topSpeed: 225,
    accel: 1.15,
    boostPower: 1.15,
    handling: 90,
    weight: 52,
    hitboxWidth: 34,
    hitboxLength: 52,
    description: 'Compact hitbox champion favored by freestyle aerial masters.',
  },
  {
    id: 'shadow-valkyrie',
    name: 'Shadow Valkyrie',
    price: 1400,
    unlocked: false,
    color: '#e11d48',
    glowColor: '#fb7185',
    accentColor: '#facc15',
    topSpeed: 255,
    accel: 1.25,
    boostPower: 1.3,
    handling: 92,
    weight: 50,
    hitboxWidth: 30,
    hitboxLength: 56,
    description: 'Supersonic wedge chassis with twin afterburners.',
  },
  {
    id: 'aftershock-v12',
    name: 'Aftershock V12',
    price: 2400,
    unlocked: false,
    color: '#10b981',
    glowColor: '#34d399',
    accentColor: '#a855f7',
    topSpeed: 270,
    accel: 1.3,
    boostPower: 1.35,
    handling: 88,
    weight: 54,
    hitboxWidth: 32,
    hitboxLength: 58,
    description: 'Jet-engine prototype delivering supersonic kickoff bursts.',
  },
  {
    id: 'titan-juggernaut',
    name: 'Titan Juggernaut',
    price: 4000,
    unlocked: false,
    color: '#facc15',
    glowColor: '#fef08a',
    accentColor: '#f97316',
    topSpeed: 240,
    accel: 1.2,
    boostPower: 1.25,
    handling: 78,
    weight: 80,
    hitboxWidth: 40,
    hitboxLength: 64,
    description: 'Heavyweight goal fortress and physical demolition brute.',
  },
];

const BOOST_TRAILS: BoostSkin[] = [
  { id: 'plasma-cyan', name: 'Cyan Plasma', price: 0, unlocked: true, color1: '#00f0ff', color2: '#38bdf8' },
  { id: 'inferno-blaze', name: 'Inferno Blaze', price: 200, unlocked: false, color1: '#f97316', color2: '#ef4444' },
  { id: 'cosmic-nebula', name: 'Cosmic Nebula', price: 400, unlocked: false, color1: '#a855f7', color2: '#ec4899' },
  { id: 'electric-volt', name: 'Electric Volt', price: 700, unlocked: false, color1: '#facc15', color2: '#10b981' },
  { id: 'rainbow-hyper', name: 'RGB Hyperdrive', price: 1200, unlocked: false, color1: '#ec4899', color2: '#00f0ff' },
];

const TOURNAMENT_BRACKET: TournamentMatch[] = [
  { round: 'Quarter-Finals', opponentName: 'Cyber Bot Rookie', difficulty: 'Rookie', rewardCredits: 200 },
  { round: 'Semi-Finals', opponentName: 'Apex Striker Pro', difficulty: 'Pro', rewardCredits: 450 },
  { round: 'Grand Finals', opponentName: 'Titan Overlord AI', difficulty: 'All-Star', rewardCredits: 1000 },
];

// ----------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------

export const CyberRocketLeague3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'goal_replay' | 'gameover' | 'garage' | 'tournament' | 'instructions'>('menu');
  const [gameMode, setGameMode] = useState<'quick_match' | 'tournament' | 'target_practice'>('quick_match');
  const [aiDifficulty, setAiDifficulty] = useState<'Rookie' | 'Pro' | 'All-Star' | 'Godlike'>('Pro');
  const [matchDuration, setMatchDuration] = useState<number>(180); // 3 minutes
  const [tournamentIndex, setTournamentIndex] = useState<number>(0);

  // Persistence State
  const [credits, setCredits] = useState<number>(() => {
    const s = localStorage.getItem('cyber_rocket_credits');
    return s ? parseInt(s, 10) : 150;
  });

  const [unlockedCarIds, setUnlockedCarIds] = useState<string[]>(() => {
    const s = localStorage.getItem('cyber_rocket_unlocked_cars');
    return s ? JSON.parse(s) : ['octane-cyber'];
  });

  const [activeCarId, setActiveCarId] = useState<string>(() => {
    return localStorage.getItem('cyber_rocket_active_car') || 'octane-cyber';
  });

  const [unlockedBoostIds, setUnlockedBoostIds] = useState<string[]>(() => {
    const s = localStorage.getItem('cyber_rocket_unlocked_boosts');
    return s ? JSON.parse(s) : ['plasma-cyan'];
  });

  const [activeBoostId, setActiveBoostId] = useState<string>(() => {
    return localStorage.getItem('cyber_rocket_active_boost') || 'plasma-cyan';
  });

  // Dynamic In-Game HUD States
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [isOvertime, setIsOvertime] = useState(false);
  const [playerBoost, setPlayerBoost] = useState(50);
  const [playerSpeedKmh, setPlayerSpeedKmh] = useState(0);
  const [goalBannerText, setGoalBannerText] = useState('');
  const [kickoffCountText, setKickoffCountText] = useState('');
  const [muted, setMuted] = useState(sound.isMuted());

  // Input states
  const keysRef = useRef({
    gas: false,
    brake: false,
    left: false,
    right: false,
    boost: false,
    jump: false,
    drift: false,
  });

  // 60 FPS Physics Simulation Engine Refs
  const engineRef = useRef({
    // Arena Dimensions
    arenaWidth: 1200,
    arenaHeight: 700,
    goalWidth: 180,
    goalDepth: 90,
    // Camera
    cameraX: 0,
    cameraY: 0,
    // Player Vehicle
    player: {
      x: -300,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      angle: 0,
      speed: 0,
      boost: 50,
      isBoosting: false,
      isJumping: false,
      jumpCount: 0,
      canDoubleJump: true,
      flipTimer: 0,
      flipAngle: 0,
      isSupersonic: false,
      demolished: false,
      respawnTimer: 0,
    },
    // AI Opponent Vehicle
    ai: {
      x: 300,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      angle: Math.PI,
      speed: 0,
      boost: 50,
      isBoosting: false,
      isJumping: false,
      isSupersonic: false,
      demolished: false,
      respawnTimer: 0,
      aiState: 'attack' as 'attack' | 'defend' | 'recover' | 'boost_hunt',
    },
    // Energy Ball
    ball: {
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: 22,
      spin: 0,
      lastHitBy: 'player' as 'player' | 'ai' | 'none',
      trail: [] as { x: number; y: number; alpha: number }[],
    },
    // Boost Pads
    boostPads: [] as BoostPad[],
    // Particles & FX
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    // Match State
    playerGoals: 0,
    aiGoals: 0,
    matchTimer: 180,
    kickoffTimer: 3.0,
    goalCelebrationTimer: 0,
    screenShake: 0,
    lastTime: performance.now(),
    isRunning: false,
  });

  const activeCar = BATTLE_CARS.find((c) => c.id === activeCarId) || BATTLE_CARS[0];
  const activeBoost = BOOST_TRAILS.find((b) => b.id === activeBoostId) || BOOST_TRAILS[0];

  // ----------------------------------------------------
  // SOUND HELPERS
  // ----------------------------------------------------
  const toggleMute = () => {
    const m = sound.toggleMute();
    setMuted(m);
  };

  const playGoalHorn = useCallback(() => {
    if (sound.isMuted()) return;
    sound.playPowerup();
  }, []);

  const playBallHit = useCallback(() => {
    if (sound.isMuted()) return;
    sound.playHit();
  }, []);

  // ----------------------------------------------------
  // INITIALIZE BOOST PADS & ARENA
  // ----------------------------------------------------
  const initArenaPads = useCallback(() => {
    const pads: BoostPad[] = [];
    // 4 Big Corner Full 100% Boost Orbs
    pads.push({ x: -480, y: -260, isBig: true, active: true, respawnTimer: 0 });
    pads.push({ x: 480, y: -260, isBig: true, active: true, respawnTimer: 0 });
    pads.push({ x: -480, y: 260, isBig: true, active: true, respawnTimer: 0 });
    pads.push({ x: 480, y: 260, isBig: true, active: true, respawnTimer: 0 });
    // 2 Midfield Big Orbs
    pads.push({ x: 0, y: -300, isBig: true, active: true, respawnTimer: 0 });
    pads.push({ x: 0, y: 300, isBig: true, active: true, respawnTimer: 0 });

    // 12 Small 12% Boost Pads across pitch lanes
    const smallPadCoords = [
      [-250, 0], [250, 0], [0, -120], [0, 120],
      [-160, -180], [160, -180], [-160, 180], [160, 180],
      [-360, -120], [360, -120], [-360, 120], [360, 120]
    ];
    smallPadCoords.forEach(([px, py]) => {
      pads.push({ x: px, y: py, isBig: false, active: true, respawnTimer: 0 });
    });

    return pads;
  }, []);

  // ----------------------------------------------------
  // START & RESET MATCH SESSION
  // ----------------------------------------------------
  const startMatch = useCallback((mode: 'quick_match' | 'tournament' | 'target_practice' = 'quick_match', tIndex = 0) => {
    setGameMode(mode);
    setTournamentIndex(tIndex);

    const eng = engineRef.current;
    const pads = initArenaPads();
    eng.boostPads = pads;

    // Reset Match Scores & Timers
    eng.playerGoals = 0;
    eng.aiGoals = 0;
    const dur = mode === 'tournament' ? 180 : matchDuration;
    eng.matchTimer = dur;
    eng.kickoffTimer = 3.0;
    eng.goalCelebrationTimer = 0;
    eng.screenShake = 0;
    eng.particles = [];
    eng.floatingTexts = [];
    eng.cameraX = 0;
    eng.cameraY = 0;

    // Reset Player
    eng.player.x = -320;
    eng.player.y = 0;
    eng.player.z = 0;
    eng.player.vx = 0;
    eng.player.vy = 0;
    eng.player.vz = 0;
    eng.player.angle = 0;
    eng.player.speed = 0;
    eng.player.boost = 40;
    eng.player.isBoosting = false;
    eng.player.isJumping = false;
    eng.player.jumpCount = 0;
    eng.player.flipTimer = 0;
    eng.player.isSupersonic = false;
    eng.player.demolished = false;

    // Reset AI
    eng.ai.x = 320;
    eng.ai.y = 0;
    eng.ai.z = 0;
    eng.ai.vx = 0;
    eng.ai.vy = 0;
    eng.ai.vz = 0;
    eng.ai.angle = Math.PI;
    eng.ai.speed = 0;
    eng.ai.boost = 40;
    eng.ai.isBoosting = false;
    eng.ai.isJumping = false;
    eng.ai.isSupersonic = false;
    eng.ai.demolished = false;

    // Reset Ball
    eng.ball.x = 0;
    eng.ball.y = 0;
    eng.ball.z = 0;
    eng.ball.vx = 0;
    eng.ball.vy = 0;
    eng.ball.vz = 0;
    eng.ball.spin = 0;
    eng.ball.trail = [];

    eng.lastTime = performance.now();
    eng.isRunning = true;

    setPlayerScore(0);
    setAiScore(0);
    setTimeLeft(dur);
    setIsOvertime(false);
    setGameState('playing');

    sound.playClick();
  }, [initArenaPads, matchDuration]);

  // ----------------------------------------------------
  // RESET POSITION ON KICKOFF
  // ----------------------------------------------------
  const resetKickoff = useCallback((scorer: 'player' | 'ai' | 'none') => {
    const eng = engineRef.current;
    eng.kickoffTimer = 3.0;

    // Kickoff spawns
    eng.player.x = -320;
    eng.player.y = 0;
    eng.player.z = 0;
    eng.player.vx = 0;
    eng.player.vy = 0;
    eng.player.vz = 0;
    eng.player.angle = 0;
    eng.player.speed = 0;
    eng.player.isBoosting = false;
    eng.player.isJumping = false;
    eng.player.isSupersonic = false;

    eng.ai.x = 320;
    eng.ai.y = 0;
    eng.ai.z = 0;
    eng.ai.vx = 0;
    eng.ai.vy = 0;
    eng.ai.vz = 0;
    eng.ai.angle = Math.PI;
    eng.ai.speed = 0;
    eng.ai.isBoosting = false;
    eng.ai.isJumping = false;
    eng.ai.isSupersonic = false;

    eng.ball.x = 0;
    eng.ball.y = 0;
    eng.ball.z = 0;
    eng.ball.vx = 0;
    eng.ball.vy = 0;
    eng.ball.vz = 0;
    eng.ball.trail = [];
  }, []);

  // ----------------------------------------------------
  // PERFORM AERIAL JUMP & DOUBLE JUMP FLIP
  // ----------------------------------------------------
  const performJump = useCallback(() => {
    const eng = engineRef.current;
    const p = eng.player;
    if (p.demolished) return;

    if (p.z <= 0) {
      // First Jump
      p.isJumping = true;
      p.vz = 240;
      p.jumpCount = 1;
      sound.playJump();
    } else if (p.jumpCount === 1) {
      // Double Jump Aerial Front Flip!
      p.jumpCount = 2;
      p.flipTimer = 0.4;
      p.speed = Math.min(300, p.speed + 120);
      p.vz = 80;
      sound.playJump();

      // Sonic Boom Ring FX
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        eng.particles.push({
          x: p.x,
          y: p.y,
          z: p.z + 10,
          vx: Math.cos(ang) * 160,
          vy: Math.sin(ang) * 160,
          vz: 0,
          size: 4,
          color: '#00f0ff',
          alpha: 1,
          decay: 3.0,
          shape: 'shockwave',
        });
      }
    }
  }, []);

  // ----------------------------------------------------
  // UNLOCK / PURCHASE ITEMS
  // ----------------------------------------------------
  const buyCar = (car: RocketCar) => {
    if (credits >= car.price && !unlockedCarIds.includes(car.id)) {
      const nextCr = credits - car.price;
      const nextCars = [...unlockedCarIds, car.id];
      setCredits(nextCr);
      setUnlockedCarIds(nextCars);
      setActiveCarId(car.id);

      localStorage.setItem('cyber_rocket_credits', nextCr.toString());
      localStorage.setItem('cyber_rocket_unlocked_cars', JSON.stringify(nextCars));
      localStorage.setItem('cyber_rocket_active_car', car.id);

      sound.playWin();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    }
  };

  const buyBoost = (boost: BoostSkin) => {
    if (credits >= boost.price && !unlockedBoostIds.includes(boost.id)) {
      const nextCr = credits - boost.price;
      const nextBoosts = [...unlockedBoostIds, boost.id];
      setCredits(nextCr);
      setUnlockedBoostIds(nextBoosts);
      setActiveBoostId(boost.id);

      localStorage.setItem('cyber_rocket_credits', nextCr.toString());
      localStorage.setItem('cyber_rocket_unlocked_boosts', JSON.stringify(nextBoosts));
      localStorage.setItem('cyber_rocket_active_boost', boost.id);

      sound.playWin();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    }
  };

  // ----------------------------------------------------
  // 60 FPS CANVAS SIMULATION & RENDERING LOOP
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    const tick = (now: number) => {
      const eng = engineRef.current;
      const dt = Math.min((now - eng.lastTime) / 1000, 0.06);
      eng.lastTime = now;
      const car = BATTLE_CARS.find((c) => c.id === activeCarId) || BATTLE_CARS[0];

      // Handle Resize
      const container = canvas.parentElement;
      if (container) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
      }

      if (eng.isRunning && (gameState === 'playing' || gameState === 'goal_replay')) {
        const keys = keysRef.current;

        // 1. KICKOFF COUNTDOWN & CELEBRATION TIMERS
        if (eng.kickoffTimer > 0) {
          eng.kickoffTimer -= dt;
          const countSec = Math.ceil(eng.kickoffTimer);
          setKickoffCountText(countSec === 3 ? '3' : countSec === 2 ? '2' : countSec === 1 ? '1' : 'GO!');
        } else {
          setKickoffCountText('');
        }

        if (eng.goalCelebrationTimer > 0) {
          eng.goalCelebrationTimer -= dt;
          if (eng.goalCelebrationTimer <= 0) {
            resetKickoff('none');
          }
        } else if (eng.kickoffTimer <= 0) {
          // Regular match play timer
          eng.matchTimer -= dt;
          if (eng.matchTimer <= 0) {
            if (eng.playerGoals === eng.aiGoals) {
              setIsOvertime(true);
            } else {
              // Match Over
              eng.isRunning = false;
              setGameState('gameover');

              if (eng.playerGoals > eng.aiGoals) {
                const earnedCr = gameMode === 'tournament' ? TOURNAMENT_BRACKET[tournamentIndex]?.rewardCredits || 400 : 150;
                setCredits((c) => {
                  const nc = c + earnedCr;
                  localStorage.setItem('cyber_rocket_credits', nc.toString());
                  return nc;
                });
                sound.playWin();
                confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
              } else {
                sound.playGameOver();
              }
            }
          }
        }

        // 2. PLAYER VEHICLE MOVEMENT & ROCKET BOOST
        const p = eng.player;
        const isKickoffWait = eng.kickoffTimer > 0 || eng.goalCelebrationTimer > 0;

        if (!isKickoffWait && !p.demolished) {
          const maxForward = car.topSpeed * (p.isBoosting ? 1.45 : 1.0);
          const accel = car.accel * 520;

          // Rocket Boost
          if (keys.boost && p.boost > 0) {
            p.isBoosting = true;
            p.boost = Math.max(0, p.boost - dt * 32);
            p.isSupersonic = p.speed > car.topSpeed * 1.15;
            eng.screenShake = Math.max(eng.screenShake, 2.5);

            // Boost Flame Particles
            const bFlameAng = p.angle + Math.PI;
            for (let f = 0; f < 3; f++) {
              eng.particles.push({
                x: p.x - Math.cos(p.angle) * 26 + (Math.random() - 0.5) * 10,
                y: p.y - Math.sin(p.angle) * 26 + (Math.random() - 0.5) * 10,
                z: p.z + 8,
                vx: Math.cos(bFlameAng) * (220 + Math.random() * 120),
                vy: Math.sin(bFlameAng) * (220 + Math.random() * 120),
                vz: (Math.random() - 0.5) * 40,
                size: 5 + Math.random() * 4,
                color: activeBoost.color1,
                alpha: 0.9,
                decay: 3.2,
                shape: 'smoke',
              });
            }
          } else {
            p.isBoosting = false;
            p.isSupersonic = false;
          }

          // Throttle / Brake
          if (keys.gas) {
            p.speed = Math.min(maxForward, p.speed + accel * dt);
          } else if (keys.brake) {
            p.speed = Math.max(-120, p.speed - accel * 1.6 * dt);
          } else {
            p.speed *= Math.pow(0.96, dt * 60);
          }

          // Steering & Power Slide
          const turnRate = (car.handling / 100) * (keys.drift ? 4.0 : 2.8);
          if (Math.abs(p.speed) > 10) {
            const dir = p.speed >= 0 ? 1 : -1;
            if (keys.left) p.angle -= turnRate * dir * dt;
            if (keys.right) p.angle += turnRate * dir * dt;
          }

          // Aerial Flip Timer
          if (p.flipTimer > 0) {
            p.flipTimer -= dt;
          }

          // Gravity on Z-axis (Jumping)
          if (p.z > 0 || p.vz > 0) {
            p.vz -= 650 * dt;
            p.z += p.vz * dt;
            if (p.z <= 0) {
              p.z = 0;
              p.vz = 0;
              p.isJumping = false;
              p.jumpCount = 0;
            }
          }

          // Position integration
          p.vx = Math.cos(p.angle) * p.speed;
          p.vy = Math.sin(p.angle) * p.speed;
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          // Arena Wall Collision Bounds
          const halfW = eng.arenaWidth / 2 - 40;
          const halfH = eng.arenaHeight / 2 - 40;

          if (Math.abs(p.x) > halfW) {
            const inGoalMouth = Math.abs(p.y) < eng.goalWidth / 2;
            if (!inGoalMouth) {
              p.x = Math.sign(p.x) * halfW;
              p.vx *= -0.5;
              p.speed *= 0.5;
            }
          }
          if (Math.abs(p.y) > halfH) {
            p.y = Math.sign(p.y) * halfH;
            p.vy *= -0.5;
            p.speed *= 0.5;
          }
        }

        // 3. AI OPPONENT BOT BEHAVIOR
        const ai = eng.ai;
        if (!isKickoffWait && !ai.demolished) {
          const ball = eng.ball;
          // Target point: Ball location, angled toward attacking player goal (-550, 0)
          const targetBallX = ball.x;
          const targetBallY = ball.y;

          const dx = targetBallX - ai.x;
          const dy = targetBallY - ai.y;
          const targetAngle = Math.atan2(dy, dx);

          let diff = targetAngle - ai.angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;

          const aiTurn = aiDifficulty === 'Godlike' ? 3.6 : (aiDifficulty === 'All-Star' ? 3.0 : 2.2);
          ai.angle += Math.max(-aiTurn * dt, Math.min(aiTurn * dt, diff));

          const distToBall = Math.hypot(dx, dy);
          const aiMaxSpeed = aiDifficulty === 'Godlike' ? 270 : (aiDifficulty === 'All-Star' ? 230 : 190);

          if (distToBall > 90 && ai.boost > 10 && Math.abs(diff) < 0.4) {
            ai.isBoosting = true;
            ai.boost = Math.max(0, ai.boost - dt * 25);
            ai.speed = Math.min(aiMaxSpeed * 1.35, ai.speed + 600 * dt);
          } else {
            ai.isBoosting = false;
            ai.speed = Math.min(aiMaxSpeed, ai.speed + 380 * dt);
          }

          ai.vx = Math.cos(ai.angle) * ai.speed;
          ai.vy = Math.sin(ai.angle) * ai.speed;
          ai.x += ai.vx * dt;
          ai.y += ai.vy * dt;

          // AI Arena Bounds
          const halfW = eng.arenaWidth / 2 - 40;
          const halfH = eng.arenaHeight / 2 - 40;
          if (Math.abs(ai.x) > halfW) {
            if (Math.abs(ai.y) >= eng.goalWidth / 2) {
              ai.x = Math.sign(ai.x) * halfW;
              ai.vx *= -0.5;
              ai.speed *= 0.5;
            }
          }
          if (Math.abs(ai.y) > halfH) {
            ai.y = Math.sign(ai.y) * halfH;
            ai.vy *= -0.5;
            ai.speed *= 0.5;
          }
        }

        // 4. ENERGY SOCCER BALL PHYSICS
        const ball = eng.ball;
        if (!isKickoffWait) {
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;
          ball.vx *= Math.pow(0.985, dt * 60);
          ball.vy *= Math.pow(0.985, dt * 60);

          // Ball Z Gravity & Bounce
          if (ball.z > 0 || ball.vz > 0) {
            ball.vz -= 550 * dt;
            ball.z += ball.vz * dt;
            if (ball.z <= 0) {
              ball.z = 0;
              ball.vz = -ball.vz * 0.7;
              if (Math.abs(ball.vz) < 30) ball.vz = 0;
            }
          }

          // Ball Trail history
          ball.trail.push({ x: ball.x, y: ball.y, alpha: 0.8 });
          if (ball.trail.length > 10) ball.trail.shift();
          ball.trail.forEach((t) => (t.alpha -= dt * 2.5));

          // Goal Net Bounds
          const halfW = eng.arenaWidth / 2 - 25;
          const halfH = eng.arenaHeight / 2 - 25;

          const insideGoalLeft = ball.x < -halfW && Math.abs(ball.y) < eng.goalWidth / 2;
          const insideGoalRight = ball.x > halfW && Math.abs(ball.y) < eng.goalWidth / 2;

          // 5. GOAL SCORING DETECTION
          if (insideGoalRight && ball.x > halfW + 35 && eng.goalCelebrationTimer <= 0) {
            // GOAL BY BLUE!
            eng.playerGoals += 1;
            eng.goalCelebrationTimer = 4.0;
            eng.screenShake = 22;
            const goalKmh = Math.round(Math.hypot(ball.vx, ball.vy) * 0.45 + 70);
            setGoalBannerText(`⚽ GOAL! ${goalKmh} KM/H BY BLUE!`);
            setPlayerScore(eng.playerGoals);
            playGoalHorn();
            confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });

            // Goal shockwave blast
            for (let i = 0; i < 40; i++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 100 + Math.random() * 260;
              eng.particles.push({
                x: halfW + 40,
                y: ball.y,
                z: 10,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                vz: (Math.random() - 0.5) * 100,
                size: 6 + Math.random() * 6,
                color: '#00f0ff',
                alpha: 1,
                decay: 1.6,
                shape: 'shockwave',
              });
            }
          } else if (insideGoalLeft && ball.x < -halfW - 35 && eng.goalCelebrationTimer <= 0) {
            // GOAL BY ORANGE!
            eng.aiGoals += 1;
            eng.goalCelebrationTimer = 4.0;
            eng.screenShake = 22;
            const goalKmh = Math.round(Math.hypot(ball.vx, ball.vy) * 0.45 + 70);
            setGoalBannerText(`⚽ GOAL! ${goalKmh} KM/H BY ORANGE!`);
            setAiScore(eng.aiGoals);
            playGoalHorn();

            for (let i = 0; i < 40; i++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 100 + Math.random() * 260;
              eng.particles.push({
                x: -halfW - 40,
                y: ball.y,
                z: 10,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                vz: (Math.random() - 0.5) * 100,
                size: 6 + Math.random() * 6,
                color: '#f97316',
                alpha: 1,
                decay: 1.6,
                shape: 'shockwave',
              });
            }
          } else {
            // Rebound off walls
            if (Math.abs(ball.x) > halfW && !insideGoalLeft && !insideGoalRight) {
              ball.x = Math.sign(ball.x) * halfW;
              ball.vx *= -0.85;
              playBallHit();
            }
            if (Math.abs(ball.y) > halfH) {
              ball.y = Math.sign(ball.y) * halfH;
              ball.vy *= -0.85;
              playBallHit();
            }
          }

          // 6. CAR VS BALL COLLISION
          const pdx = ball.x - p.x;
          const pdy = ball.y - p.y;
          const pDist = Math.hypot(pdx, pdy);
          const pColDist = ball.radius + car.hitboxLength / 2;

          if (pDist < pColDist && Math.abs(ball.z - p.z) < 35 && !p.demolished) {
            const normalX = pdx / pDist;
            const normalY = pdy / pDist;
            const hitSpeed = Math.max(180, Math.hypot(p.vx, p.vy) * 1.6 * car.boostPower);

            ball.vx = normalX * hitSpeed + p.vx * 0.6;
            ball.vy = normalY * hitSpeed + p.vy * 0.6;
            ball.vz = Math.max(60, p.vz * 1.2 + 80);
            ball.lastHitBy = 'player';
            eng.screenShake = 8;
            playBallHit();

            for (let s = 0; s < 8; s++) {
              eng.particles.push({
                x: ball.x,
                y: ball.y,
                z: ball.z + 10,
                vx: (Math.random() - 0.5) * 180,
                vy: (Math.random() - 0.5) * 180,
                vz: Math.random() * 100,
                size: 4,
                color: '#38bdf8',
                alpha: 1,
                decay: 2.5,
                shape: 'spark',
              });
            }
          }

          // AI vs Ball
          const adx = ball.x - ai.x;
          const ady = ball.y - ai.y;
          const aDist = Math.hypot(adx, ady);
          if (aDist < pColDist && Math.abs(ball.z - ai.z) < 35 && !ai.demolished) {
            const normalX = adx / aDist;
            const normalY = ady / aDist;
            const hitSpeed = Math.max(180, Math.hypot(ai.vx, ai.vy) * 1.4);

            ball.vx = normalX * hitSpeed + ai.vx * 0.6;
            ball.vy = normalY * hitSpeed + ai.vy * 0.6;
            ball.vz = 80;
            ball.lastHitBy = 'ai';
            eng.screenShake = 6;
            playBallHit();
          }

          // 7. CAR VS CAR COLLISION & DEMOLITION
          const cdx = ai.x - p.x;
          const cdy = ai.y - p.y;
          const carDist = Math.hypot(cdx, cdy);
          if (carDist < 48 && !p.demolished && !ai.demolished) {
            if (p.isSupersonic) {
              ai.demolished = true;
              ai.respawnTimer = 3.0;
              eng.screenShake = 16;
              sound.playExplosion();
              eng.floatingTexts.push({
                id: Math.random(),
                text: '💥 DEMOLITION!',
                x: ai.x,
                y: ai.y - 30,
                color: '#ef4444',
                alpha: 1,
                scale: 1.5,
              });
            } else {
              const bumpForce = 180;
              p.vx -= (cdx / carDist) * bumpForce;
              p.vy -= (cdy / carDist) * bumpForce;
              ai.vx += (cdx / carDist) * bumpForce;
              ai.vy += (cdy / carDist) * bumpForce;
            }
          }
        }

        // 8. BOOST PADS RECHARGE
        eng.boostPads.forEach((pad) => {
          if (!pad.active) {
            pad.respawnTimer -= dt;
            if (pad.respawnTimer <= 0) pad.active = true;
            return;
          }

          const pDist = Math.hypot(p.x - pad.x, p.y - pad.y);
          if (pDist < 36 && p.boost < 100) {
            pad.active = false;
            pad.respawnTimer = pad.isBig ? 10.0 : 4.0;
            p.boost = Math.min(100, p.boost + (pad.isBig ? 100 : 12));
            sound.playCollect();
          }

          const aDist = Math.hypot(ai.x - pad.x, ai.y - pad.y);
          if (aDist < 36 && ai.boost < 100) {
            pad.active = false;
            pad.respawnTimer = pad.isBig ? 10.0 : 4.0;
            ai.boost = Math.min(100, ai.boost + (pad.isBig ? 100 : 12));
          }
        });

        // 9. DYNAMIC SMOOTH CAMERA FOLLOWING PLAYER & BALL
        const targetCamX = p.x * 0.65 + ball.x * 0.35;
        const targetCamY = p.y * 0.65 + ball.y * 0.35;
        eng.cameraX += (targetCamX - eng.cameraX) * 4.0 * dt;
        eng.cameraY += (targetCamY - eng.cameraY) * 4.0 * dt;

        // Update Particles & Floating Text
        eng.particles.forEach((pt) => {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.z += pt.vz * dt;
          pt.alpha -= pt.decay * dt;
        });
        eng.particles = eng.particles.filter((pt) => pt.alpha > 0);

        eng.floatingTexts.forEach((ft) => {
          ft.y -= 30 * dt;
          ft.alpha -= 0.8 * dt;
        });
        eng.floatingTexts = eng.floatingTexts.filter((ft) => ft.alpha > 0);

        if (eng.screenShake > 0) {
          eng.screenShake = Math.max(0, eng.screenShake - dt * 25);
        }

        // Sync React HUD
        setPlayerBoost(Math.round(p.boost));
        setPlayerSpeedKmh(Math.round(Math.hypot(p.vx, p.vy) * 0.45));
        setTimeLeft(Math.max(0, Math.ceil(eng.matchTimer)));
      }

      // ====================================================
      // 2.5D / 3D CANVAS RENDERING PASS
      // ====================================================
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Cyber Stadium Dark Gradient Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Apply Screen Shake
      if (eng.screenShake > 0) {
        const sx = (Math.random() - 0.5) * eng.screenShake;
        const sy = (Math.random() - 0.5) * eng.screenShake;
        ctx.translate(sx, sy);
      }

      // Dynamic Camera Scaling & Centering
      const scaleFactor = Math.min(width / 1150, height / 680);
      ctx.translate(centerX - eng.cameraX * scaleFactor * 0.5, centerY - eng.cameraY * scaleFactor * 0.5);
      ctx.scale(scaleFactor, scaleFactor);

      // --- A. Draw Stadium Pitch Surface ---
      const hw = eng.arenaWidth / 2;
      const hh = eng.arenaHeight / 2;

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(-hw - 20, -hh - 20, eng.arenaWidth + 40, eng.arenaHeight + 40);

      // Pitch Floor
      ctx.fillStyle = '#090d20';
      ctx.fillRect(-hw, -hh, eng.arenaWidth, eng.arenaHeight);

      // Grid Lines
      ctx.strokeStyle = 'rgba(30, 58, 138, 0.3)';
      ctx.lineWidth = 1.5;
      for (let gx = -hw; gx <= hw; gx += 80) {
        ctx.beginPath();
        ctx.moveTo(gx, -hh);
        ctx.lineTo(gx, hh);
        ctx.stroke();
      }
      for (let gy = -hh; gy <= hh; gy += 80) {
        ctx.beginPath();
        ctx.moveTo(-hw, gy);
        ctx.lineTo(hw, gy);
        ctx.stroke();
      }

      // Midfield Line & Center Circle
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -hh);
      ctx.lineTo(0, hh);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 110, 0, Math.PI * 2);
      ctx.stroke();

      // --- B. Draw Goal Nets (Blue Left, Orange Right) ---
      const gw = eng.goalWidth;
      const gd = eng.goalDepth;

      // Blue Goal (Left)
      ctx.fillStyle = 'rgba(2, 132, 199, 0.25)';
      ctx.fillRect(-hw - gd, -gw / 2, gd, gw);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.strokeRect(-hw - gd, -gw / 2, gd, gw);

      // Orange Goal (Right)
      ctx.fillStyle = 'rgba(234, 88, 12, 0.25)';
      ctx.fillRect(hw, -gw / 2, gd, gw);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 4;
      ctx.strokeRect(hw, -gw / 2, gd, gw);

      // --- C. Draw Boost Pads ---
      eng.boostPads.forEach((pad) => {
        ctx.save();
        ctx.translate(pad.x, pad.y);

        if (pad.isBig) {
          ctx.fillStyle = pad.active ? '#facc15' : 'rgba(100, 116, 139, 0.4)';
          ctx.shadowColor = pad.active ? '#facc15' : 'transparent';
          ctx.shadowBlur = pad.active ? 16 : 0;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = pad.active ? '#f59e0b' : 'rgba(71, 85, 105, 0.3)';
          ctx.shadowColor = pad.active ? '#f59e0b' : 'transparent';
          ctx.shadowBlur = pad.active ? 8 : 0;
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // --- D. Draw AI Opponent Car ---
      const ai = eng.ai;
      if (!ai.demolished) {
        ctx.save();
        ctx.translate(ai.x, ai.y);
        ctx.rotate(ai.angle);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-28, -15, 56, 30);

        ctx.fillStyle = '#ea580c';
        ctx.fillRect(-26, -14, 52, 28);
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2;
        ctx.strokeRect(-26, -14, 52, 28);

        ctx.fillStyle = '#050b14';
        ctx.fillRect(-6, -10, 16, 20);

        ctx.fillStyle = '#f97316';
        ctx.fillRect(-20, -12, 40, 24);

        ctx.restore();
      }

      // --- E. Draw Player Battle-Car ---
      const p = eng.player;
      if (!p.demolished) {
        ctx.save();
        ctx.translate(p.x, p.y - p.z * 0.4);
        ctx.rotate(p.angle);

        const shadowScale = Math.max(0.6, 1 - p.z / 150);
        ctx.save();
        ctx.translate(0, p.z * 0.4);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.scale(shadowScale, shadowScale);
        ctx.fillRect(-28, -16, 56, 32);
        ctx.restore();

        ctx.fillStyle = activeCar.glowColor;
        ctx.shadowColor = activeCar.glowColor;
        ctx.shadowBlur = p.isBoosting ? 24 : 12;
        ctx.fillRect(-24, -13, 48, 26);

        ctx.fillStyle = activeCar.color;
        ctx.fillRect(-activeCar.hitboxLength / 2, -activeCar.hitboxWidth / 2, activeCar.hitboxLength, activeCar.hitboxWidth);
        ctx.strokeStyle = activeCar.accentColor;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-activeCar.hitboxLength / 2, -activeCar.hitboxWidth / 2, activeCar.hitboxLength, activeCar.hitboxWidth);

        ctx.fillStyle = '#030712';
        ctx.fillRect(-8, -activeCar.hitboxWidth / 2 + 4, 18, activeCar.hitboxWidth - 8);

        ctx.fillStyle = activeCar.accentColor;
        ctx.fillRect(-activeCar.hitboxLength / 2 - 2, -activeCar.hitboxWidth / 2 - 2, 6, activeCar.hitboxWidth + 4);

        if (p.isSupersonic) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 16;
          ctx.strokeRect(-activeCar.hitboxLength / 2 - 4, -activeCar.hitboxWidth / 2 - 4, activeCar.hitboxLength + 8, activeCar.hitboxWidth + 8);
        }

        ctx.restore();
      }

      // --- F. Draw Giant Holographic Soccer Ball ---
      const ball = eng.ball;
      ctx.save();
      ctx.translate(ball.x, ball.y - ball.z * 0.4);

      ctx.save();
      ctx.translate(0, ball.z * 0.4);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      const bShadowScale = Math.max(0.5, 1 - ball.z / 200);
      ctx.scale(bShadowScale, bShadowScale);
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const isHighSpeed = Math.hypot(ball.vx, ball.vy) > 280;
      ctx.fillStyle = isHighSpeed ? '#f43f5e' : '#0284c7';
      ctx.shadowColor = isHighSpeed ? '#f43f5e' : '#38bdf8';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius * 0.55, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      // --- G. Draw Particles & Shockwaves ---
      eng.particles.forEach((pt) => {
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - pt.z * 0.4, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // --- H. Draw Floating Texts ---
      eng.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 14;
        ctx.font = `bold ${Math.round(18 * ft.scale)}px 'Impact', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // --- I. Draw Kickoff Big 3-2-1-GO! Animation ---
      if (eng.kickoffTimer > 0) {
        ctx.save();
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 25;
        ctx.font = 'bold 72px Impact, sans-serif';
        ctx.textAlign = 'center';
        const countText = Math.ceil(eng.kickoffTimer) === 3 ? '3' : Math.ceil(eng.kickoffTimer) === 2 ? '2' : '1';
        ctx.fillText(countText, 0, 20);
        ctx.restore();
      }

      ctx.restore();

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [activeBoost, activeCar, activeCarId, aiDifficulty, gameMode, gameState, playBallHit, playGoalHorn, resetKickoff, tournamentIndex]);

  // ----------------------------------------------------
  // KEYBOARD HANDLERS
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.gas = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.brake = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = true;
      if (['ShiftLeft', 'ShiftRight', 'KeyE'].includes(e.code)) keysRef.current.boost = true;
      if (['Space'].includes(e.code)) performJump();
      if (['ControlLeft', 'KeyQ'].includes(e.code)) keysRef.current.drift = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.gas = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.brake = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = false;
      if (['ShiftLeft', 'ShiftRight', 'KeyE'].includes(e.code)) keysRef.current.boost = false;
      if (['ControlLeft', 'KeyQ'].includes(e.code)) keysRef.current.drift = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [performJump]);

  // Touch Steering & Driving Handlers on Canvas
  const touchStartRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

  const updateTouchControls = (x: number, y: number, w: number, h: number) => {
    // Horizontal Steering
    if (x < w * 0.42) {
      keysRef.current.left = true;
      keysRef.current.right = false;
    } else if (x > w * 0.58) {
      keysRef.current.right = true;
      keysRef.current.left = false;
    } else {
      keysRef.current.left = false;
      keysRef.current.right = false;
    }

    // Vertical Drive (Gas / Brake)
    if (y < h * 0.58) {
      keysRef.current.gas = true;
      keysRef.current.brake = false;
    } else if (y > h * 0.8) {
      keysRef.current.brake = true;
      keysRef.current.gas = false;
    } else {
      keysRef.current.gas = true;
      keysRef.current.brake = false;
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    touchStartRef.current = { x: relX, y: relY, active: true };
    updateTouchControls(relX, relY, rect.width, rect.height);
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!touchStartRef.current?.active || gameState !== 'playing') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    updateTouchControls(relX, relY, rect.width, rect.height);
  };

  const handleCanvasTouchEnd = () => {
    touchStartRef.current = null;
    keysRef.current.left = false;
    keysRef.current.right = false;
    keysRef.current.gas = false;
    keysRef.current.brake = false;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ----------------------------------------------------
  // RENDER JSX UI
  // ----------------------------------------------------
  const handleButtonPress = (key: 'gas' | 'brake' | 'left' | 'right' | 'boost' | 'drift', active: boolean) => {
    keysRef.current[key] = active;
  };

  return (
    <div className="w-full flex flex-col gap-2.5 select-none font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP STATUS & SCOREBOARD BAR (UPPER BOX - OUTSIDE GAME CANVAS)          */}
      {/* ========================================================================= */}
      <div className="w-full flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl">
        {/* Left: Credits & Tournament / Difficulty Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-amber-500/50 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300 font-black text-xs sm:text-sm font-mono">{credits.toLocaleString()} CR</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700 text-slate-300 text-xs font-bold">
            <Trophy className="w-3 h-3 text-cyan-400" />
            <span>{aiDifficulty}</span>
          </div>
        </div>

        {/* Center: Live Match Scoreboard */}
        {gameState === 'playing' ? (
          <div className="flex items-center gap-2.5 sm:gap-4 px-3 sm:px-5 py-1 rounded-xl bg-slate-950/95 border border-cyan-500/50 shadow-lg">
            {/* Blue Team Score */}
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-black text-[10px] hidden sm:inline">BLUE</span>
              <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                {playerScore}
              </span>
            </div>

            {/* Match Clock / Overtime */}
            <div className="flex flex-col items-center px-2 sm:px-3 border-x border-slate-800">
              <span className={`font-mono text-xs sm:text-sm font-black ${isOvertime ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                {isOvertime ? '+ OT' : formatTime(timeLeft)}
              </span>
            </div>

            {/* Orange Team Score */}
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-orange-400 font-mono drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">
                {aiScore}
              </span>
              <span className="text-orange-400 font-black text-[10px] hidden sm:inline">ORANGE</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>CYBER DOME LEAGUE</span>
          </div>
        )}

        {/* Right: Boost Gauge & Pause / Sound Controls */}
        <div className="flex items-center gap-2">
          {gameState === 'playing' && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-rose-500 rounded-full transition-all duration-100"
                  style={{ width: `${playerBoost}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-black text-amber-300">{playerBoost}%</span>
            </div>
          )}

          {gameState === 'playing' && (
            <button
              onClick={() => setGameState('menu')}
              className="px-2.5 sm:px-3 py-1.5 bg-rose-600/80 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md"
            >
              PAUSE
            </button>
          )}

          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-slate-300 transition cursor-pointer shadow-md active:scale-95"
            title="Toggle Sound"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 3D ARENA VIEWPORT (CLEAN & UNOBSTRUCTED)                                */}
      {/* ========================================================================= */}
      <div className="relative w-full h-[380px] sm:h-[460px] md:h-[520px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/30 flex flex-col">
        {/* Background 3D Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

        {/* Goal Celebration Banner Overlay */}
        {gameState === 'playing' && engineRef.current.goalCelebrationTimer > 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none animate-bounce">
            <div className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-600 to-cyan-500 text-white font-black text-2xl sm:text-3xl tracking-wider shadow-[0_0_35px_rgba(245,158,11,0.9)] border-2 border-white">
              {goalBannerText}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN MENU OVERLAY                                                         */}
        {/* ========================================================================= */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full flex flex-col items-center gap-5">
              {/* Glowing Logo */}
              <div className="flex flex-col items-center">
                <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 font-bold text-xs tracking-widest uppercase mb-2 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  <CircleDot className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span>CYBER DOME LEAGUE</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.8)] font-sans">
                  CYBER ROCKET LEAGUE
                </h1>
                <p className="text-slate-400 text-xs md:text-sm font-medium mt-1">
                  Supersonic rocket car soccer! Aerial flips, boost hits & power strikes.
                </p>
              </div>

              {/* Selected Car Display Banner */}
              <div className="w-full p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md border"
                    style={{ backgroundColor: activeCar.color, borderColor: activeCar.glowColor }}
                  >
                    <Car className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-black text-sm">{activeCar.name}</div>
                    <div className="text-cyan-400 text-xs font-bold">Top Speed: {activeCar.topSpeed} km/h</div>
                  </div>
                </div>
                <button
                  onClick={() => setGameState('garage')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-cyan-300 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> GARAGE
                </button>
              </div>

              {/* Difficulty Selector */}
              <div className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <span className="text-slate-400 font-bold ml-2">BOT DIFFICULTY:</span>
                <div className="flex gap-1">
                  {(['Rookie', 'Pro', 'All-Star', 'Godlike'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setAiDifficulty(diff)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        aiDifficulty === diff
                          ? 'bg-cyan-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2.5">
                <button
                  onClick={() => startMatch('quick_match')}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-base sm:text-lg tracking-wider transition shadow-[0_0_25px_rgba(6,182,212,0.7)] flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" /> PLAY QUICK MATCH (1v1)
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setGameState('tournament')}
                    className="py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" /> CYBER CUP
                  </button>

                  <button
                    onClick={() => setGameState('instructions')}
                    className="py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-cyan-400" /> HOW TO PLAY
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GARAGE MODAL */}
        {gameState === 'garage' && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">
                  TURBO GARAGE & CUSTOMIZATION
                </h2>
                <p className="text-xs text-slate-400">Unlock battle-cars and supersonic boost flame skins</p>
              </div>
              <button
                onClick={() => setGameState('menu')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                BACK TO MENU
              </button>
            </div>

            {/* Cars Grid */}
            <h3 className="text-cyan-400 font-black text-sm mt-6 mb-3 flex items-center gap-2">
              <Car className="w-4 h-4" /> BATTLE-CARS ROSTER
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BATTLE_CARS.map((car) => {
                const isUnlocked = unlockedCarIds.includes(car.id);
                const isSelected = activeCarId === car.id;
                const canAfford = credits >= car.price;

                return (
                  <div
                    key={car.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                        : isUnlocked
                        ? 'bg-slate-900/80 border-slate-700/80 hover:border-slate-500'
                        : 'bg-slate-950/80 border-slate-800 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border-2"
                          style={{ backgroundColor: car.color, borderColor: car.glowColor }}
                        >
                          <Car className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-black text-base">{car.name}</div>
                          <div className="text-xs text-slate-400">{car.description}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400 text-[10px] font-black">
                          EQUIPPED
                        </span>
                      )}
                    </div>

                    {/* Stats Progress Bars */}
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-300">
                      <div>
                        <div className="flex justify-between text-slate-400 mb-0.5">
                          <span>Speed</span>
                          <span>{car.topSpeed}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400" style={{ width: `${(car.topSpeed / 300) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-400 mb-0.5">
                          <span>Boost</span>
                          <span>{Math.round(car.boostPower * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400" style={{ width: `${(car.boostPower / 1.5) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-400 mb-0.5">
                          <span>Agility</span>
                          <span>{car.handling}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-400" style={{ width: `${car.handling}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {isUnlocked ? (
                      <button
                        onClick={() => {
                          setActiveCarId(car.id);
                          localStorage.setItem('cyber_rocket_active_car', car.id);
                          sound.playClick();
                        }}
                        disabled={isSelected}
                        className={`w-full py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 cursor-default'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                        }`}
                      >
                        {isSelected ? 'SELECTED' : 'EQUIP CAR'}
                      </button>
                    ) : (
                      <button
                        onClick={() => buyCar(car)}
                        disabled={!canAfford}
                        className={`w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          canAfford
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-lg'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>UNLOCK FOR {car.price} CR</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Boost Trails Grid */}
            <h3 className="text-amber-400 font-black text-sm mt-8 mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4" /> ROCKET BOOST FLAME SKINS
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {BOOST_TRAILS.map((boost) => {
                const isUnlocked = unlockedBoostIds.includes(boost.id);
                const isSelected = activeBoostId === boost.id;
                const canAfford = credits >= boost.price;

                return (
                  <div
                    key={boost.id}
                    className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-400 shadow-md'
                        : isUnlocked
                        ? 'bg-slate-900/80 border-slate-700/80'
                        : 'bg-slate-950/80 border-slate-800 opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full shadow-md"
                        style={{ background: `linear-gradient(135deg, ${boost.color1}, ${boost.color2})` }}
                      />
                      <span className="text-white font-bold text-xs">{boost.name}</span>
                    </div>

                    {isUnlocked ? (
                      <button
                        onClick={() => {
                          setActiveBoostId(boost.id);
                          localStorage.setItem('cyber_rocket_active_boost', boost.id);
                          sound.playClick();
                        }}
                        disabled={isSelected}
                        className={`w-full py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                      >
                        {isSelected ? 'EQUIPPED' : 'EQUIP'}
                      </button>
                    ) : (
                      <button
                        onClick={() => buyBoost(boost)}
                        disabled={!canAfford}
                        className={`w-full py-1.5 rounded-lg font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        <span>{boost.price} CR</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TOURNAMENT CUP BRACKET */}
        {gameState === 'tournament' && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400">
                  CYBER CHAMPIONS CUP
                </h2>
                <p className="text-xs text-slate-400">Conquer 3 tournament rounds to claim the championship cup</p>
              </div>
              <button
                onClick={() => setGameState('menu')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                BACK TO MENU
              </button>
            </div>

            <div className="flex flex-col gap-4 mt-6 max-w-lg mx-auto w-full">
              {TOURNAMENT_BRACKET.map((match, idx) => (
                <div
                  key={match.round}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-between gap-4 shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-black text-amber-400">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{match.round}</div>
                      <div className="text-xs text-slate-400">VS {match.opponentName} ({match.difficulty})</div>
                      <div className="text-xs font-bold text-amber-400 mt-0.5">Reward: +{match.rewardCredits} CR</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setAiDifficulty(match.difficulty);
                      startMatch('tournament', idx);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs transition shadow-md whitespace-nowrap cursor-pointer"
                  >
                    START MATCH
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HOW TO PLAY MODAL */}
        {gameState === 'instructions' && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-2xl font-black text-cyan-400">PILOT BRIEFING & CONTROLS</h2>
              <button
                onClick={() => setGameState('menu')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                CLOSE
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h3 className="text-cyan-400 font-bold text-base flex items-center gap-2">
                  <Gauge className="w-5 h-5" /> Desktop Controls
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-400">
                  <li><strong className="text-white">[W] / [↑]</strong> — Accelerate Forward (Straight Gas)</li>
                  <li><strong className="text-white">[S] / [↓]</strong> — Reverse / Brake</li>
                  <li><strong className="text-white">[A, D] / [←, →]</strong> — Steer Left & Right</li>
                  <li><strong className="text-white">[SPACE]</strong> — Jump & Aerial Double-Jump Flip</li>
                  <li><strong className="text-white">[SHIFT] / [E]</strong> — Supersonic Rocket Boost</li>
                  <li><strong className="text-white">[CTRL] / [Q]</strong> — Power Slide & Drift</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h3 className="text-amber-400 font-bold text-base flex items-center gap-2">
                  <Trophy className="w-5 h-5" /> Striker Pro Tips
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-400">
                  <li>• <strong>Straight Gas Button:</strong> Hold [⬆️ GAS] to blast straight forward into the ball!</li>
                  <li>• <strong>Double Jump Flip:</strong> Double-tap jump while boosting for supersonic power shots!</li>
                  <li>• <strong>Demolition:</strong> Ram the opposing car at Supersonic speed to blow them up!</li>
                  <li>• <strong>Full Boost Orbs:</strong> Hit the yellow corner orbs for instant 100% boost refills.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* GAME OVER SCREEN */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full flex flex-col items-center gap-5 p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/40 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-cyan-600/20 border-2 border-cyan-500 text-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.6)]">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-3xl font-black text-white tracking-wider">
                  {playerScore > aiScore ? 'VICTORY!' : 'MATCH DEFEAT'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {playerScore > aiScore ? 'You dominated the Cyber Soccer Arena!' : 'The AI defense held strong!'}
                </p>
              </div>

              {/* Score Breakdown */}
              <div className="w-full grid grid-cols-2 gap-3 py-3 border-y border-slate-800">
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-xs text-cyan-400 font-bold">YOUR GOALS</div>
                  <div className="text-2xl font-black text-white">{playerScore}</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-xs text-orange-400 font-bold">AI GOALS</div>
                  <div className="text-2xl font-black text-white">{aiScore}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2.5">
                <button
                  onClick={() => startMatch(gameMode, tournamentIndex)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-sm tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> PLAY REMATCH
                </button>

                <button
                  onClick={() => setGameState('menu')}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  RETURN TO MENU
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE ON-SCREEN ACTION CONTROL DECK (FULL DIRECT DRIVING BUTTONS)     */}
      {/* ========================================================================= */}
      {gameState === 'playing' && (
        <div className="w-full p-2.5 sm:p-3.5 bg-slate-900/95 border border-cyan-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-md touch-none">
          {/* Left Cluster: Directional D-Pad (Straight Gas, Left, Right, Reverse) */}
          <div className="flex items-center gap-2">
            {/* Left & Right Turn Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onPointerDown={(e) => { e.preventDefault(); handleButtonPress('left', true); }}
                onPointerUp={(e) => { e.preventDefault(); handleButtonPress('left', false); }}
                onPointerLeave={(e) => { e.preventDefault(); handleButtonPress('left', false); }}
                onPointerCancel={(e) => { e.preventDefault(); handleButtonPress('left', false); }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-950/90 border-2 border-slate-700 active:border-cyan-400 active:bg-cyan-500/20 text-slate-200 active:text-cyan-300 flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all select-none cursor-pointer"
                title="Steer Left"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[9px] font-black text-slate-400">LEFT</span>
              </button>

              <button
                onPointerDown={(e) => { e.preventDefault(); handleButtonPress('right', true); }}
                onPointerUp={(e) => { e.preventDefault(); handleButtonPress('right', false); }}
                onPointerLeave={(e) => { e.preventDefault(); handleButtonPress('right', false); }}
                onPointerCancel={(e) => { e.preventDefault(); handleButtonPress('right', false); }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-950/90 border-2 border-slate-700 active:border-cyan-400 active:bg-cyan-500/20 text-slate-200 active:text-cyan-300 flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all select-none cursor-pointer"
                title="Steer Right"
              >
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[9px] font-black text-slate-400">RIGHT</span>
              </button>
            </div>

            {/* Straight Gas (Forward) & Reverse / Brake Buttons */}
            <div className="flex items-center gap-1.5">
              {/* PRIMARY STRAIGHT GAS BUTTON */}
              <button
                onPointerDown={(e) => { e.preventDefault(); handleButtonPress('gas', true); }}
                onPointerUp={(e) => { e.preventDefault(); handleButtonPress('gas', false); }}
                onPointerLeave={(e) => { e.preventDefault(); handleButtonPress('gas', false); }}
                onPointerCancel={(e) => { e.preventDefault(); handleButtonPress('gas', false); }}
                className="w-14 h-12 sm:w-20 sm:h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 active:from-cyan-400 active:to-blue-500 border-2 border-cyan-300 text-white font-black flex flex-col items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.6)] active:scale-95 transition-all select-none cursor-pointer"
                title="Drive Straight Forward"
              >
                <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                <span className="text-[10px] sm:text-xs font-black tracking-wider leading-none">GAS ⬆</span>
              </button>

              {/* REVERSE / BRAKE BUTTON */}
              <button
                onPointerDown={(e) => { e.preventDefault(); handleButtonPress('brake', true); }}
                onPointerUp={(e) => { e.preventDefault(); handleButtonPress('brake', false); }}
                onPointerLeave={(e) => { e.preventDefault(); handleButtonPress('brake', false); }}
                onPointerCancel={(e) => { e.preventDefault(); handleButtonPress('brake', false); }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-950/90 border-2 border-rose-500/50 active:border-rose-400 active:bg-rose-600 text-rose-300 active:text-white flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all select-none cursor-pointer"
                title="Reverse / Brake"
              >
                <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[9px] font-black">REV ⬇</span>
              </button>
            </div>
          </div>

          {/* Right Cluster: Action Buttons (Boost Turbo, Aerial Jump, Drift) */}
          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
            {/* Drift Power Slide */}
            <button
              onPointerDown={(e) => { e.preventDefault(); handleButtonPress('drift', true); }}
              onPointerUp={(e) => { e.preventDefault(); handleButtonPress('drift', false); }}
              onPointerLeave={(e) => { e.preventDefault(); handleButtonPress('drift', false); }}
              onPointerCancel={(e) => { e.preventDefault(); handleButtonPress('drift', false); }}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-950/90 border-2 border-purple-500/50 active:border-purple-400 active:bg-purple-600 text-purple-300 active:text-white font-black text-xs transition active:scale-95 shadow-md flex flex-col items-center justify-center cursor-pointer select-none"
              title="Power Slide Drift"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span className="text-[9px] font-black">DRIFT</span>
            </button>

            {/* Jump & Aerial Flip */}
            <button
              onClick={performJump}
              className="w-14 h-12 sm:w-16 sm:h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-rose-600 active:from-purple-500 active:to-rose-500 border-2 border-purple-300 text-white font-black text-xs transition active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.6)] flex flex-col items-center justify-center cursor-pointer select-none"
              title="Jump / Aerial Double Flip"
            >
              <Zap className="w-5 h-5 text-white" />
              <span className="text-[10px] font-black">JUMP</span>
            </button>

            {/* Supersonic Turbo Boost Button */}
            <button
              onPointerDown={(e) => { e.preventDefault(); handleButtonPress('boost', true); }}
              onPointerUp={(e) => { e.preventDefault(); handleButtonPress('boost', false); }}
              onPointerLeave={(e) => { e.preventDefault(); handleButtonPress('boost', false); }}
              onPointerCancel={(e) => { e.preventDefault(); handleButtonPress('boost', false); }}
              className="w-16 h-12 sm:w-20 sm:h-14 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 active:from-amber-400 active:to-rose-500 border-2 border-amber-300 text-white font-black transition active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.7)] flex flex-col items-center justify-center cursor-pointer select-none"
              title="Supersonic Rocket Boost"
            >
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-200 animate-pulse" />
                <span className="text-xs font-mono font-black">{playerBoost}%</span>
              </div>
              <span className="text-[10px] font-black tracking-wider leading-none">BOOST 🚀</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

