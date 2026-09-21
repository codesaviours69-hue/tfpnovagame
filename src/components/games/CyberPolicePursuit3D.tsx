import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Play,
  ChevronRight, Car, Gauge, Award, Flame, Star, ShoppingBag,
  Crosshair, Radio, AlertTriangle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  HelpCircle, Compass, Lock, CheckCircle2, Wrench, Magnet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// TYPES & DATA STRUCTURES
// ----------------------------------------------------

export interface Vehicle {
  id: string;
  name: string;
  nameGuj: string;
  price: number;
  unlocked: boolean;
  color: string;
  glowColor: string;
  accentColor: string;
  topSpeed: number;     // Max forward speed
  acceleration: number; // Gas acceleration rate
  handling: number;     // Turn responsiveness
  armor: number;        // Max hit points
  ramPower: number;     // Damage dealt to police when ramming
  nitroCap: number;     // Max nitro capacity
  description: string;
}

export interface Mission {
  id: number;
  title: string;
  titleGuj: string;
  desc: string;
  targetType: 'survive_time' | 'smash_cops' | 'collect_coins' | 'reach_stars' | 'use_emp' | 'score';
  targetValue: number;
  rewardCoins: number;
  completed: boolean;
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
  shape?: 'circle' | 'spark' | 'smoke' | 'shockwave';
}

interface SkidMark {
  x: number;
  y: number;
  angle: number;
  alpha: number;
}

interface PowerUpItem {
  id: number;
  x: number;
  y: number;
  type: 'nitro' | 'emp' | 'shield' | 'repair' | 'magnet' | 'coin';
  value: number;
  collected: boolean;
  pulseTimer: number;
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'barricade' | 'spikes' | 'ramp' | 'building' | 'oil';
  health: number;
  active: boolean;
}

interface PoliceCar {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  type: 'cruiser' | 'interceptor' | 'swat' | 'tank';
  health: number;
  maxHealth: number;
  width: number;
  length: number;
  color: string;
  glowColor: string;
  sirenPhase: number;
  isDestroyed: boolean;
  stunTimer: number;
}

interface AttackChopper {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  rotorAngle: number;
  spotlightAngle: number;
  missileCooldown: number;
  laserTargeting: boolean;
  laserTimer: number;
  active: boolean;
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

const VEHICLE_ROSTER: Vehicle[] = [
  {
    id: 'neon-runner',
    name: 'Neon Runner',
    nameGuj: 'નિયોન રનર',
    price: 0,
    unlocked: true,
    color: '#00f0ff',
    glowColor: '#38bdf8',
    accentColor: '#f43f5e',
    topSpeed: 210,
    acceleration: 70,
    handling: 85,
    armor: 100,
    ramPower: 35,
    nitroCap: 100,
    description: 'Agile cyber getaway coupe with balanced drift steering.',
  },
  {
    id: 'shadow-v8',
    name: 'Shadow V8 Drift',
    nameGuj: 'શેડો V8 ડ્રિફ્ટ',
    price: 350,
    unlocked: false,
    color: '#a855f7',
    glowColor: '#ec4899',
    accentColor: '#facc15',
    topSpeed: 240,
    acceleration: 82,
    handling: 90,
    armor: 120,
    ramPower: 45,
    nitroCap: 120,
    description: 'Twin-turbo rear-wheel drive drift machine with nitro boost.',
  },
  {
    id: 'cyber-enforcer',
    name: 'Cyber Enforcer Truck',
    nameGuj: 'સાયબર ઇન્ફોર્સર ટ્રક',
    price: 750,
    unlocked: false,
    color: '#f97316',
    glowColor: '#facc15',
    accentColor: '#ef4444',
    topSpeed: 220,
    acceleration: 75,
    handling: 65,
    armor: 220,
    ramPower: 95,
    nitroCap: 110,
    description: 'Heavy armored battering ram built to crush police roadblocks.',
  },
  {
    id: 'phantom-gtr',
    name: 'Phantom GT-R',
    nameGuj: 'ફેન્ટમ GT-R',
    price: 1350,
    unlocked: false,
    color: '#f43f5e',
    glowColor: '#fb7185',
    accentColor: '#00f0ff',
    topSpeed: 275,
    acceleration: 92,
    handling: 92,
    armor: 140,
    ramPower: 55,
    nitroCap: 150,
    description: 'Track-tuned hyper-coupe with rapid EMP recharge capacitors.',
  },
  {
    id: 'quantum-valkyrie',
    name: 'Quantum Valkyrie',
    nameGuj: 'ક્વોન્ટમ વાલ્કીરી',
    price: 2400,
    unlocked: false,
    color: '#10b981',
    glowColor: '#34d399',
    accentColor: '#a855f7',
    topSpeed: 310,
    acceleration: 98,
    handling: 96,
    armor: 160,
    ramPower: 65,
    nitroCap: 180,
    description: 'Supersonic experimental prototype with plasma hover-assist.',
  },
  {
    id: 'titan-juggernaut',
    name: 'Titan Juggernaut',
    nameGuj: 'ટાઇટન જુગરનોટ',
    price: 4000,
    unlocked: false,
    color: '#eab308',
    glowColor: '#fef08a',
    accentColor: '#f97316',
    topSpeed: 250,
    acceleration: 85,
    handling: 75,
    armor: 300,
    ramPower: 140,
    nitroCap: 200,
    description: 'Unstoppable military war vehicle equipped with reinforced hull.',
  },
];

const DEFAULT_MISSIONS: Mission[] = [
  {
    id: 1,
    title: 'First Escape',
    titleGuj: 'પ્રથમ એસ્કેપ',
    desc: 'Survive the police pursuit for at least 30 seconds',
    targetType: 'survive_time',
    targetValue: 30,
    rewardCoins: 150,
    completed: false,
  },
  {
    id: 2,
    title: 'Cop Buster',
    titleGuj: 'કોપ બસ્ટર',
    desc: 'Smash and destroy 5 pursuit police cruisers',
    targetType: 'smash_cops',
    targetValue: 5,
    rewardCoins: 250,
    completed: false,
  },
  {
    id: 3,
    title: 'Neon Vault',
    titleGuj: 'નિયોન વોલ્ટ',
    desc: 'Collect 100 Cyber Credits across the metropolis',
    targetType: 'collect_coins',
    targetValue: 100,
    rewardCoins: 300,
    completed: false,
  },
  {
    id: 4,
    title: 'High Heat',
    titleGuj: 'હાઇ હીટ',
    desc: 'Survive long enough to reach Wanted Level 3 (⭐⭐⭐)',
    targetType: 'reach_stars',
    targetValue: 3,
    rewardCoins: 400,
    completed: false,
  },
  {
    id: 5,
    title: 'EMP Overload',
    titleGuj: 'EMP ઓવરલોડ',
    desc: 'Deploy EMP Shockwaves 3 times during the chase',
    targetType: 'use_emp',
    targetValue: 3,
    rewardCoins: 450,
    completed: false,
  },
  {
    id: 6,
    title: 'Road Rampage',
    titleGuj: 'રોડ રેમ્પેજ',
    desc: 'Smash and wreck 12 police vehicles in a single run',
    targetType: 'smash_cops',
    targetValue: 12,
    rewardCoins: 600,
    completed: false,
  },
  {
    id: 7,
    title: 'Score Legend',
    titleGuj: 'સ્કોર લિજેન્ડ',
    desc: 'Reach 15,000 getaway score in one session',
    targetType: 'score',
    targetValue: 15000,
    rewardCoins: 800,
    completed: false,
  },
  {
    id: 8,
    title: 'Master Outlaw',
    titleGuj: 'માસ્ટર આઉટલો',
    desc: 'Survive for 2 minutes and escape 5-Star Heat (⭐⭐⭐⭐⭐)',
    targetType: 'survive_time',
    targetValue: 120,
    rewardCoins: 1200,
    completed: false,
  },
];

// ----------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------

export const CyberPolicePursuit3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Screen State
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'garage' | 'missions' | 'instructions'>('menu');
  const [gameMode, setGameMode] = useState<'endless' | 'mission'>('endless');
  const [selectedMissionId, setSelectedMissionId] = useState<number>(1);

  // Persistence State
  const [credits, setCredits] = useState<number>(() => {
    const s = localStorage.getItem('cyber_pursuit_credits');
    return s ? parseInt(s, 10) : 100;
  });

  const [highScore, setHighScore] = useState<number>(() => {
    const s = localStorage.getItem('cyber_pursuit_highscore');
    return s ? parseInt(s, 10) : 0;
  });

  const [unlockedCarIds, setUnlockedCarIds] = useState<string[]>(() => {
    const s = localStorage.getItem('cyber_pursuit_unlocked_cars');
    return s ? JSON.parse(s) : ['neon-runner'];
  });

  const [activeCarId, setActiveCarId] = useState<string>(() => {
    return localStorage.getItem('cyber_pursuit_active_car') || 'neon-runner';
  });

  const [completedMissionIds, setCompletedMissionIds] = useState<number[]>(() => {
    const s = localStorage.getItem('cyber_pursuit_completed_missions');
    return s ? JSON.parse(s) : [];
  });

  // Dynamic In-Game HUD States
  const [hudHp, setHudHp] = useState(100);
  const [hudMaxHp, setHudMaxHp] = useState(100);
  const [hudNitro, setHudNitro] = useState(100);
  const [hudEmp, setHudEmp] = useState(100);
  const [hudSpeed, setHudSpeed] = useState(0);
  const [hudScore, setHudScore] = useState(0);
  const [hudMultiplier, setHudMultiplier] = useState(1);
  const [hudStars, setHudStars] = useState(1);
  const [hudCopsSmashed, setHudCopsSmashed] = useState(0);
  const [hudTime, setHudTime] = useState(0);
  const [hudShieldActive, setHudShieldActive] = useState(false);
  const [hudMagnetActive, setHudMagnetActive] = useState(false);

  // Audio mute
  const [muted, setMuted] = useState(sound.isMuted());

  // Input states
  const keysRef = useRef({
    gas: false,
    brake: false,
    left: false,
    right: false,
    nitro: false,
    emp: false,
    drift: false,
  });

  // Game Engine Simulation Refs (Zero React Re-render Lag!)
  const engineRef = useRef({
    // Player
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // Facing UP
    speed: 0,
    angularVelocity: 0,
    hp: 100,
    maxHp: 100,
    nitro: 100,
    maxNitro: 100,
    empCharge: 100,
    isNitroActive: false,
    isShieldActive: false,
    shieldTimer: 0,
    isMagnetActive: false,
    magnetTimer: 0,
    isAirborne: false,
    airborneTimer: 0,
    score: 0,
    multiplier: 1,
    multiplierTimer: 0,
    copsDestroyed: 0,
    coinsGathered: 0,
    empUsedCount: 0,
    survivalTimer: 0,
    wantedLevel: 1,
    heatExp: 0,
    heatExpMax: 100,
    screenShake: 0,
    // World Entities
    police: [] as PoliceCar[],
    obstacles: [] as Obstacle[],
    powerups: [] as PowerUpItem[],
    particles: [] as Particle[],
    skidmarks: [] as SkidMark[],
    floatingTexts: [] as FloatingText[],
    chopper: {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      rotorAngle: 0,
      spotlightAngle: 0,
      missileCooldown: 4,
      laserTargeting: false,
      laserTimer: 0,
      active: false,
    } as AttackChopper,
    nextEntityId: 1,
    cameraX: 0,
    cameraY: 0,
    worldSize: 4000,
    spawnPoliceTimer: 1.5,
    spawnPowerupTimer: 2.0,
    spawnObstacleTimer: 3.0,
    lastTime: performance.now(),
    isRunning: false,
  });

  // Active Vehicle Data
  const activeCar = VEHICLE_ROSTER.find((c) => c.id === activeCarId) || VEHICLE_ROSTER[0];

  // ----------------------------------------------------
  // SOUND HELPERS
  // ----------------------------------------------------
  const toggleMute = () => {
    const m = sound.toggleMute();
    setMuted(m);
  };

  const playSirenChirp = useCallback(() => {
    if (sound.isMuted()) return;
    sound.playLaser();
  }, []);

  const playEmpSound = useCallback(() => {
    if (sound.isMuted()) return;
    sound.playPowerup();
  }, []);

  // ----------------------------------------------------
  // START & RESET GAME SESSION
  // ----------------------------------------------------
  const startGame = useCallback((mode: 'endless' | 'mission' = 'endless', missionId = 1) => {
    setGameMode(mode);
    setSelectedMissionId(missionId);
    setGameState('playing');

    const eng = engineRef.current;
    const car = VEHICLE_ROSTER.find((c) => c.id === activeCarId) || VEHICLE_ROSTER[0];

    // Reset Player
    eng.x = 0;
    eng.y = 0;
    eng.vx = 0;
    eng.vy = 0;
    eng.angle = -Math.PI / 2;
    eng.speed = 0;
    eng.angularVelocity = 0;
    eng.hp = car.armor;
    eng.maxHp = car.armor;
    eng.nitro = car.nitroCap;
    eng.maxNitro = car.nitroCap;
    eng.empCharge = 100;
    eng.isNitroActive = false;
    eng.isShieldActive = false;
    eng.shieldTimer = 0;
    eng.isMagnetActive = false;
    eng.magnetTimer = 0;
    eng.isAirborne = false;
    eng.airborneTimer = 0;
    eng.score = 0;
    eng.multiplier = 1;
    eng.multiplierTimer = 0;
    eng.copsDestroyed = 0;
    eng.coinsGathered = 0;
    eng.empUsedCount = 0;
    eng.survivalTimer = 0;
    eng.wantedLevel = 1;
    eng.heatExp = 0;
    eng.heatExpMax = 120;
    eng.screenShake = 0;

    // Reset Entities
    eng.police = [];
    eng.obstacles = [];
    eng.powerups = [];
    eng.particles = [];
    eng.skidmarks = [];
    eng.floatingTexts = [];
    eng.chopper.active = false;
    eng.spawnPoliceTimer = 0.5;
    eng.spawnPowerupTimer = 1.0;
    eng.spawnObstacleTimer = 2.0;
    eng.lastTime = performance.now();
    eng.isRunning = true;

    // Populate initial city surrounding obstacles & credits
    for (let i = 0; i < 20; i++) {
      const dist = 300 + Math.random() * 1200;
      const ang = Math.random() * Math.PI * 2;
      const ox = Math.cos(ang) * dist;
      const oy = Math.sin(ang) * dist;
      const types: ('barricade' | 'spikes' | 'ramp' | 'building' | 'oil')[] = ['barricade', 'spikes', 'ramp', 'building', 'oil'];
      const chosenType = types[Math.floor(Math.random() * types.length)];

      eng.obstacles.push({
        id: eng.nextEntityId++,
        x: ox,
        y: oy,
        width: chosenType === 'building' ? 80 : 36,
        height: chosenType === 'building' ? 80 : 20,
        type: chosenType,
        health: chosenType === 'building' ? 9999 : 60,
        active: true,
      });

      // Spawn some coins
      eng.powerups.push({
        id: eng.nextEntityId++,
        x: ox + (Math.random() - 0.5) * 80,
        y: oy + (Math.random() - 0.5) * 80,
        type: 'coin',
        value: 15,
        collected: false,
        pulseTimer: Math.random() * Math.PI * 2,
      });
    }

    // Spawn 2 initial patrol cruisers
    for (let p = 0; p < 2; p++) {
      const pAng = (Math.PI / 2) + (p === 0 ? 0.6 : -0.6);
      const pDist = 380;
      eng.police.push({
        id: eng.nextEntityId++,
        x: Math.cos(pAng) * pDist,
        y: Math.sin(pAng) * pDist,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        speed: 120,
        type: 'cruiser',
        health: 70,
        maxHealth: 70,
        width: 26,
        length: 50,
        color: '#0284c7',
        glowColor: '#38bdf8',
        sirenPhase: p * Math.PI,
        isDestroyed: false,
        stunTimer: 0,
      });
    }

    sound.playClick();
  }, [activeCarId]);

  // ----------------------------------------------------
  // TRIGGER EMP SHOCKWAVE
  // ----------------------------------------------------
  const triggerEmp = useCallback(() => {
    const eng = engineRef.current;
    if (eng.empCharge < 100 || eng.hp <= 0) return;

    eng.empCharge = 0;
    eng.empUsedCount += 1;
    eng.screenShake = 18;
    playEmpSound();

    // EMP Shockwave particles
    for (let i = 0; i < 48; i++) {
      const ang = (i / 48) * Math.PI * 2;
      const spd = 280 + Math.random() * 220;
      eng.particles.push({
        x: eng.x,
        y: eng.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 5 + Math.random() * 4,
        color: '#00f0ff',
        alpha: 1,
        decay: 1.8,
        shape: 'shockwave',
      });
    }

    // Disable and damage all police in 450 radius
    const empRadius = 450;
    let hitCount = 0;
    eng.police.forEach((cop) => {
      if (cop.isDestroyed) return;
      const dx = cop.x - eng.x;
      const dy = cop.y - eng.y;
      const d = Math.hypot(dx, dy);
      if (d <= empRadius) {
        cop.health -= 85;
        cop.stunTimer = 4.5;
        cop.vx += (dx / d) * 220;
        cop.vy += (dy / d) * 220;
        hitCount++;

        // EMP Sparks
        for (let s = 0; s < 12; s++) {
          eng.particles.push({
            x: cop.x + (Math.random() - 0.5) * 25,
            y: cop.y + (Math.random() - 0.5) * 45,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            size: 3,
            color: '#a855f7',
            alpha: 1,
            decay: 2.5,
            shape: 'spark',
          });
        }
      }
    });

    if (hitCount > 0) {
      eng.floatingTexts.push({
        id: eng.nextEntityId++,
        text: `⚡ EMP BLAST: ${hitCount} DISABLED!`,
        x: eng.x,
        y: eng.y - 40,
        color: '#00f0ff',
        alpha: 1,
        scale: 1.4,
      });
      eng.score += hitCount * 300 * eng.multiplier;
    }
  }, [playEmpSound]);

  // ----------------------------------------------------
  // UNLOCK / PURCHASE CAR
  // ----------------------------------------------------
  const buyCar = (car: Vehicle) => {
    if (credits >= car.price && !unlockedCarIds.includes(car.id)) {
      const nextCredits = credits - car.price;
      const nextUnlocked = [...unlockedCarIds, car.id];
      setCredits(nextCredits);
      setUnlockedCarIds(nextUnlocked);
      setActiveCarId(car.id);

      localStorage.setItem('cyber_pursuit_credits', nextCredits.toString());
      localStorage.setItem('cyber_pursuit_unlocked_cars', JSON.stringify(nextUnlocked));
      localStorage.setItem('cyber_pursuit_active_car', car.id);

      sound.playWin();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  };

  const selectCar = (carId: string) => {
    if (unlockedCarIds.includes(carId)) {
      setActiveCarId(carId);
      localStorage.setItem('cyber_pursuit_active_car', carId);
      sound.playClick();
    }
  };

  // ----------------------------------------------------
  // CHECK MISSION PROGRESS
  // ----------------------------------------------------
  const checkMissionStatus = useCallback((mission: Mission, eng: typeof engineRef.current) => {
    if (mission.completed || completedMissionIds.includes(mission.id)) return true;

    let success = false;
    switch (mission.targetType) {
      case 'survive_time':
        success = eng.survivalTimer >= mission.targetValue;
        break;
      case 'smash_cops':
        success = eng.copsDestroyed >= mission.targetValue;
        break;
      case 'collect_coins':
        success = eng.coinsGathered >= mission.targetValue;
        break;
      case 'reach_stars':
        success = eng.wantedLevel >= mission.targetValue;
        break;
      case 'use_emp':
        success = eng.empUsedCount >= mission.targetValue;
        break;
      case 'score':
        success = eng.score >= mission.targetValue;
        break;
    }

    if (success) {
      const nextCompleted = [...completedMissionIds, mission.id];
      setCompletedMissionIds(nextCompleted);
      localStorage.setItem('cyber_pursuit_completed_missions', JSON.stringify(nextCompleted));

      setCredits((prev) => {
        const nc = prev + mission.rewardCoins;
        localStorage.setItem('cyber_pursuit_credits', nc.toString());
        return nc;
      });

      eng.floatingTexts.push({
        id: eng.nextEntityId++,
        text: `🏆 MISSION CLEAR: +${mission.rewardCoins} CR!`,
        x: eng.x,
        y: eng.y - 70,
        color: '#facc15',
        alpha: 1,
        scale: 1.6,
      });

      sound.playWin();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      return true;
    }
    return false;
  }, [completedMissionIds]);

  // ----------------------------------------------------
  // 60 FPS CANVAS GAME LOOP & PHYSICS SIMULATION
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

      if (eng.isRunning && gameState === 'playing') {
        const keys = keysRef.current;
        const car = VEHICLE_ROSTER.find((c) => c.id === activeCarId) || VEHICLE_ROSTER[0];

        // 1. SURVIVAL & SCORE TIMERS
        eng.survivalTimer += dt;
        eng.score += Math.round(dt * (car.topSpeed * 0.4) * eng.multiplier);

        // Multiplier Decay
        if (eng.multiplier > 1) {
          eng.multiplierTimer += dt;
          if (eng.multiplierTimer > 4.5) {
            eng.multiplier = Math.max(1, eng.multiplier - 1);
            eng.multiplierTimer = 0;
          }
        }

        // Wanted Heat Level Progression
        eng.heatExp += dt * 4;
        if (eng.heatExp >= eng.heatExpMax && eng.wantedLevel < 5) {
          eng.wantedLevel += 1;
          eng.heatExp = 0;
          eng.heatExpMax += 90;
          eng.screenShake = 12;
          playSirenChirp();

          eng.floatingTexts.push({
            id: eng.nextEntityId++,
            text: `⚠️ HEAT LEVEL ${eng.wantedLevel} ESCALATION!`,
            x: eng.x,
            y: eng.y - 50,
            color: '#ef4444',
            alpha: 1,
            scale: 1.5,
          });
        }

        // 2. POWER-UP TIMERS & CHARGING
        if (eng.isShieldActive) {
          eng.shieldTimer -= dt;
          if (eng.shieldTimer <= 0) eng.isShieldActive = false;
        }
        if (eng.isMagnetActive) {
          eng.magnetTimer -= dt;
          if (eng.magnetTimer <= 0) eng.isMagnetActive = false;
        }
        if (eng.isAirborne) {
          eng.airborneTimer -= dt;
          if (eng.airborneTimer <= 0) eng.isAirborne = false;
        }

        // Recharge EMP passive
        if (eng.empCharge < 100) {
          eng.empCharge = Math.min(100, eng.empCharge + dt * 14);
        }

        // 3. VEHICLE ACCELERATION & NITRO BOOST
        const maxForwardSpeed = car.topSpeed * (eng.isNitroActive ? 1.45 : 1.0);
        const accelRate = car.acceleration * 6.5;

        // Nitro management
        if ((keys.nitro || keysRef.current.nitro) && eng.nitro > 0) {
          eng.isNitroActive = true;
          eng.nitro = Math.max(0, eng.nitro - dt * 32);
          eng.screenShake = Math.max(eng.screenShake, 3);

          // Exhaust flame particles
          const flameAng = eng.angle + Math.PI;
          for (let f = 0; f < 2; f++) {
            eng.particles.push({
              x: eng.x - Math.cos(eng.angle) * 25 + (Math.random() - 0.5) * 12,
              y: eng.y - Math.sin(eng.angle) * 25 + (Math.random() - 0.5) * 12,
              vx: Math.cos(flameAng) * (180 + Math.random() * 100),
              vy: Math.sin(flameAng) * (180 + Math.random() * 100),
              size: 4 + Math.random() * 4,
              color: f === 0 ? '#00f0ff' : '#ec4899',
              alpha: 0.9,
              decay: 3.5,
              shape: 'smoke',
            });
          }
        } else {
          eng.isNitroActive = false;
          // Passive nitro refill
          if (eng.nitro < car.nitroCap) {
            eng.nitro = Math.min(car.nitroCap, eng.nitro + dt * 6);
          }
        }

        // Throttle / Brake
        if (keys.gas) {
          eng.speed = Math.min(maxForwardSpeed, eng.speed + accelRate * dt);
        } else if (keys.brake) {
          eng.speed = Math.max(-80, eng.speed - accelRate * 1.5 * dt);
        } else {
          // Coasting drag
          eng.speed *= Math.pow(0.97, dt * 60);
        }

        // 4. STEERING & DRIFT DYNAMICS
        const steerSpeed = (car.handling / 100) * 2.8;
        if (Math.abs(eng.speed) > 10) {
          const dirSign = eng.speed >= 0 ? 1 : -1;
          if (keys.left) {
            eng.angle -= steerSpeed * dirSign * dt;
          }
          if (keys.right) {
            eng.angle += steerSpeed * dirSign * dt;
          }
        }

        // Drift Skid marks & smoke
        const isDrifting = keys.drift || (Math.abs(eng.speed) > 160 && (keys.left || keys.right));
        if (isDrifting && Math.abs(eng.speed) > 40) {
          eng.score += Math.round(dt * 150 * eng.multiplier);
          eng.skidmarks.push({
            x: eng.x,
            y: eng.y,
            angle: eng.angle,
            alpha: 0.7,
          });

          // Tire smoke
          for (let s = 0; s < 2; s++) {
            eng.particles.push({
              x: eng.x - Math.cos(eng.angle) * 20,
              y: eng.y - Math.sin(eng.angle) * 20,
              vx: (Math.random() - 0.5) * 50,
              vy: (Math.random() - 0.5) * 50,
              size: 5 + Math.random() * 6,
              color: '#64748b',
              alpha: 0.6,
              decay: 1.8,
              shape: 'smoke',
            });
          }
        }

        // Keep skidmarks capped
        if (eng.skidmarks.length > 200) {
          eng.skidmarks.splice(0, 30);
        }

        // Velocity vector
        eng.vx = Math.cos(eng.angle) * eng.speed;
        eng.vy = Math.sin(eng.angle) * eng.speed;
        eng.x += eng.vx * dt;
        eng.y += eng.vy * dt;

        // 5. CAMERA CENTERING
        eng.cameraX = eng.x;
        eng.cameraY = eng.y;

        // Screen Shake decay
        if (eng.screenShake > 0) {
          eng.screenShake = Math.max(0, eng.screenShake - dt * 25);
        }

        // 6. SPAWN POLICE ENEMIES BASED ON HEAT LEVEL
        eng.spawnPoliceTimer -= dt;
        const maxPoliceCount = 2 + eng.wantedLevel * 2;
        const activeCops = eng.police.filter((p) => !p.isDestroyed).length;

        if (eng.spawnPoliceTimer <= 0 && activeCops < maxPoliceCount) {
          eng.spawnPoliceTimer = Math.max(1.2, 4.0 - eng.wantedLevel * 0.5);

          // Choose spawn location outside camera viewport
          const spawnAng = Math.random() * Math.PI * 2;
          const spawnDist = 650 + Math.random() * 200;
          const px = eng.x + Math.cos(spawnAng) * spawnDist;
          const py = eng.y + Math.sin(spawnAng) * spawnDist;

          // Determine cop type based on heat
          let copType: 'cruiser' | 'interceptor' | 'swat' | 'tank' = 'cruiser';
          let cHealth = 60;
          let cSpeed = 160;
          let cColor = '#0284c7';
          let cGlow = '#38bdf8';
          let cRam = 30;

          if (eng.wantedLevel >= 4 && Math.random() > 0.6) {
            copType = 'tank';
            cHealth = 220;
            cSpeed = 140;
            cColor = '#15803d';
            cGlow = '#4ade80';
            cRam = 80;
          } else if (eng.wantedLevel >= 3 && Math.random() > 0.4) {
            copType = 'swat';
            cHealth = 140;
            cSpeed = 180;
            cColor = '#dc2626';
            cGlow = '#f87171';
            cRam = 60;
          } else if (eng.wantedLevel >= 2 && Math.random() > 0.3) {
            copType = 'interceptor';
            cHealth = 90;
            cSpeed = 240;
            cColor = '#7c3aed';
            cGlow = '#c084fc';
            cRam = 45;
          }

          eng.police.push({
            id: eng.nextEntityId++,
            x: px,
            y: py,
            vx: 0,
            vy: 0,
            angle: Math.atan2(eng.y - py, eng.x - px),
            speed: cSpeed,
            type: copType,
            health: cHealth,
            maxHealth: cHealth,
            width: copType === 'swat' ? 32 : 26,
            length: copType === 'swat' ? 62 : 52,
            color: cColor,
            glowColor: cGlow,
            sirenPhase: Math.random() * Math.PI * 2,
            isDestroyed: false,
            stunTimer: 0,
          });
        }

        // 7. POLICE AI PURSUIT & COLLISION LOGIC
        eng.police.forEach((cop) => {
          if (cop.isDestroyed) return;

          // Siren animation phase
          cop.sirenPhase += dt * 10;

          // If stunned by EMP, slide to a halt
          if (cop.stunTimer > 0) {
            cop.stunTimer -= dt;
            cop.x += cop.vx * dt;
            cop.y += cop.vy * dt;
            cop.vx *= 0.94;
            cop.vy *= 0.94;
            return;
          }

          // Flanking AI Navigation
          const dx = eng.x - cop.x;
          const dy = eng.y - cop.y;
          const distToPlayer = Math.hypot(dx, dy);
          const targetAngle = Math.atan2(dy, dx);

          // Angle interpolation
          let angleDiff = targetAngle - cop.angle;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

          const turnRate = cop.type === 'interceptor' ? 2.6 : 1.9;
          cop.angle += Math.max(-turnRate * dt, Math.min(turnRate * dt, angleDiff));

          cop.vx = Math.cos(cop.angle) * cop.speed;
          cop.vy = Math.sin(cop.angle) * cop.speed;
          cop.x += cop.vx * dt;
          cop.y += cop.vy * dt;

          // Cop vs Player Ramming Collision
          if (distToPlayer < 45 && !eng.isAirborne) {
            const relSpeed = Math.hypot(eng.vx - cop.vx, eng.vy - cop.vy);
            const playerRamDmg = (car.ramPower + (eng.isNitroActive ? 120 : 0)) * (relSpeed / 120);
            const copRamDmg = (cop.type === 'swat' ? 35 : 18) * (relSpeed / 140);

            // Damage Cop
            cop.health -= playerRamDmg;
            cop.vx += Math.cos(eng.angle) * 160;
            cop.vy += Math.sin(eng.angle) * 160;

            // Damage Player (unless Shield or Super Nitro active)
            if (!eng.isShieldActive && !eng.isNitroActive) {
              eng.hp = Math.max(0, eng.hp - copRamDmg);
              sound.playHit();
            }

            eng.screenShake = 10;

            // Sparks & debris
            for (let p = 0; p < 10; p++) {
              eng.particles.push({
                x: (eng.x + cop.x) / 2,
                y: (eng.y + cop.y) / 2,
                vx: (Math.random() - 0.5) * 220,
                vy: (Math.random() - 0.5) * 220,
                size: 3 + Math.random() * 3,
                color: '#facc15',
                alpha: 1,
                decay: 2.8,
                shape: 'spark',
              });
            }

            // Check if Cop Destroyed
            if (cop.health <= 0) {
              cop.isDestroyed = true;
              eng.copsDestroyed += 1;
              eng.multiplier = Math.min(5, eng.multiplier + 1);
              eng.multiplierTimer = 0;
              const bonusScore = (cop.type === 'swat' ? 800 : 400) * eng.multiplier;
              eng.score += bonusScore;
              eng.screenShake = 16;
              sound.playExplosion();

              // Big Explosion particles
              for (let e = 0; e < 30; e++) {
                const eAng = Math.random() * Math.PI * 2;
                const eSpd = 50 + Math.random() * 200;
                eng.particles.push({
                  x: cop.x,
                  y: cop.y,
                  vx: Math.cos(eAng) * eSpd,
                  vy: Math.sin(eAng) * eSpd,
                  size: 6 + Math.random() * 8,
                  color: e % 2 === 0 ? '#ef4444' : '#f97316',
                  alpha: 1,
                  decay: 1.6,
                  shape: 'smoke',
                });
              }

              // Drop Loot (Coins / Powerups)
              eng.powerups.push({
                id: eng.nextEntityId++,
                x: cop.x,
                y: cop.y,
                type: Math.random() > 0.5 ? 'coin' : (Math.random() > 0.5 ? 'nitro' : 'repair'),
                value: 25,
                collected: false,
                pulseTimer: 0,
              });

              eng.floatingTexts.push({
                id: eng.nextEntityId++,
                text: `💥 WRECKED! +${bonusScore}`,
                x: cop.x,
                y: cop.y - 30,
                color: '#f43f5e',
                alpha: 1,
                scale: 1.4,
              });
            }
          }

          // Cops ramming into each other
          eng.police.forEach((otherCop) => {
            if (otherCop.id === cop.id || otherCop.isDestroyed) return;
            const cdx = otherCop.x - cop.x;
            const cdy = otherCop.y - cop.y;
            const cdist = Math.hypot(cdx, cdy);
            if (cdist < 38) {
              cop.x -= (cdx / cdist) * 8;
              cop.y -= (cdy / cdist) * 8;
              otherCop.x += (cdx / cdist) * 8;
              otherCop.y += (cdy / cdist) * 8;
            }
          });
        });

        // 8. SPAWN POWER-UPS & CREDITS
        eng.spawnPowerupTimer -= dt;
        if (eng.spawnPowerupTimer <= 0) {
          eng.spawnPowerupTimer = 2.5;
          const pAng = Math.random() * Math.PI * 2;
          const pDist = 350 + Math.random() * 350;
          const pTypes: ('nitro' | 'emp' | 'shield' | 'repair' | 'magnet' | 'coin')[] = ['nitro', 'emp', 'shield', 'repair', 'magnet', 'coin', 'coin'];
          const chosen = pTypes[Math.floor(Math.random() * pTypes.length)];

          eng.powerups.push({
            id: eng.nextEntityId++,
            x: eng.x + Math.cos(pAng) * pDist,
            y: eng.y + Math.sin(pAng) * pDist,
            type: chosen,
            value: chosen === 'coin' ? 10 : 1,
            collected: false,
            pulseTimer: 0,
          });
        }

        // Power-Up Magnet Attraction & Pickup Check
        eng.powerups.forEach((pu) => {
          if (pu.collected) return;
          pu.pulseTimer += dt * 4;

          const dx = eng.x - pu.x;
          const dy = eng.y - pu.y;
          const dist = Math.hypot(dx, dy);

          // Quantum Magnet Pull
          if (eng.isMagnetActive && dist < 320) {
            pu.x += (dx / dist) * 280 * dt;
            pu.y += (dy / dist) * 280 * dt;
          }

          if (dist < 42) {
            pu.collected = true;

            if (pu.type === 'coin') {
              eng.coinsGathered += pu.value;
              setCredits((c) => {
                const next = c + pu.value;
                localStorage.setItem('cyber_pursuit_credits', next.toString());
                return next;
              });
              sound.playCollect();
              eng.floatingTexts.push({
                id: eng.nextEntityId++,
                text: `+${pu.value} CR`,
                x: pu.x,
                y: pu.y - 20,
                color: '#facc15',
                alpha: 1,
                scale: 1.2,
              });
            } else if (pu.type === 'nitro') {
              eng.nitro = car.nitroCap;
              sound.playPowerup();
              eng.floatingTexts.push({
                id: eng.nextEntityId++,
                text: '⚡ NITRO FULL!',
                x: pu.x,
                y: pu.y - 20,
                color: '#00f0ff',
                alpha: 1,
                scale: 1.3,
              });
            } else if (pu.type === 'emp') {
              eng.empCharge = 100;
              sound.playPowerup();
              eng.floatingTexts.push({
                id: eng.nextEntityId++,
                text: '🔋 EMP CHARGED!',
                x: pu.x,
                y: pu.y - 20,
                color: '#a855f7',
                alpha: 1,
                scale: 1.3,
              });
            } else if (pu.type === 'shield') {
              eng.isShieldActive = true;
              eng.shieldTimer = 8.0;
              sound.playPowerup();
              eng.floatingTexts.push({
                id: eng.nextEntityId++,
                text: '🛡️ PLASMA SHIELD (8s)',
                x: pu.x,
                y: pu.y - 20,
                color: '#3b82f6',
                alpha: 1,
                scale: 1.3,
              });
            } else if (pu.type === 'repair') {
              eng.hp = Math.min(eng.maxHp, eng.hp + 45);
              sound.playPowerup();
              eng.floatingTexts.push({
                id: eng.nextEntityId++,
                text: '🔧 REPAIR +45 HP',
                x: pu.x,
                y: pu.y - 20,
                color: '#10b981',
                alpha: 1,
                scale: 1.3,
              });
            } else if (pu.type === 'magnet') {
              eng.isMagnetActive = true;
              eng.magnetTimer = 10.0;
              sound.playPowerup();
              eng.floatingTexts.push({
                id: eng.nextEntityId++,
                text: '🧲 CREDIT MAGNET (10s)',
                x: pu.x,
                y: pu.y - 20,
                color: '#ec4899',
                alpha: 1,
                scale: 1.3,
              });
            }
          }
        });

        // 9. OBSTACLES & MEGA STUNT RAMPS
        eng.obstacles.forEach((obs) => {
          if (!obs.active) return;
          const dx = eng.x - obs.x;
          const dy = eng.y - obs.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 40 && !eng.isAirborne) {
            if (obs.type === 'ramp') {
              // Mega Jump Launch!
              eng.isAirborne = true;
              eng.airborneTimer = 1.4;
              eng.speed = Math.max(eng.speed, 220);
              eng.score += 500 * eng.multiplier;
              eng.screenShake = 8;
              sound.playJump();

              eng.floatingTexts.push({
                id: eng.nextEntityId++,
                text: '🚀 MEGA RAMP AIRTIME! +500',
                x: eng.x,
                y: eng.y - 40,
                color: '#facc15',
                alpha: 1,
                scale: 1.5,
              });
            } else if (obs.type === 'spikes') {
              if (!eng.isShieldActive) {
                eng.hp = Math.max(0, eng.hp - 30);
                eng.speed *= 0.4;
                sound.playHit();
                eng.screenShake = 12;
              }
              obs.active = false;
            } else if (obs.type === 'barricade') {
              if (eng.isNitroActive || car.ramPower > 80) {
                obs.active = false;
                eng.score += 200;
                sound.playExplosion();
                eng.screenShake = 8;
                // Debris
                for (let d = 0; d < 8; d++) {
                  eng.particles.push({
                    x: obs.x,
                    y: obs.y,
                    vx: (Math.random() - 0.5) * 180,
                    vy: (Math.random() - 0.5) * 180,
                    size: 4,
                    color: '#f97316',
                    alpha: 1,
                    decay: 2.0,
                  });
                }
              } else {
                eng.speed *= 0.3;
                eng.hp = Math.max(0, eng.hp - 15);
                sound.playHit();
                obs.active = false;
              }
            } else if (obs.type === 'building') {
              // Push player back from building
              eng.x = obs.x + (dx / dist) * 55;
              eng.y = obs.y + (dy / dist) * 55;
              eng.speed *= -0.4;
              if (!eng.isShieldActive) eng.hp = Math.max(0, eng.hp - 10);
              sound.playHit();
              eng.screenShake = 6;
            }
          }
        });

        // 10. ATTACK HELICOPTER (Wanted Level 4 & 5)
        if (eng.wantedLevel >= 4) {
          eng.chopper.active = true;
          eng.chopper.rotorAngle += dt * 25;

          // Follow player smoothly
          eng.chopper.x += (eng.x - eng.chopper.x) * 1.5 * dt;
          eng.chopper.y += (eng.y - eng.chopper.y) * 1.5 * dt;

          eng.chopper.missileCooldown -= dt;
          if (eng.chopper.missileCooldown <= 0) {
            eng.chopper.missileCooldown = 6.0;
            // Chopper EMP rocket strike at player location
            const targetX = eng.x;
            const targetY = eng.y;
            setTimeout(() => {
              const strikeDist = Math.hypot(eng.x - targetX, eng.y - targetY);
              if (strikeDist < 100 && !eng.isAirborne && !eng.isShieldActive) {
                eng.hp = Math.max(0, eng.hp - 40);
                eng.speed *= 0.2;
                sound.playExplosion();
                eng.screenShake = 18;
              }
            }, 1200);
          }
        }

        // 11. PARTICLES & FLOATING TEXT UPDATES
        eng.particles.forEach((p) => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.alpha -= p.decay * dt;
        });
        eng.particles = eng.particles.filter((p) => p.alpha > 0);

        eng.floatingTexts.forEach((ft) => {
          ft.y -= 35 * dt;
          ft.alpha -= 0.9 * dt;
        });
        eng.floatingTexts = eng.floatingTexts.filter((ft) => ft.alpha > 0);

        // 12. CHECK MISSION OBJECTIVE
        if (gameMode === 'mission') {
          const currentMission = DEFAULT_MISSIONS.find((m) => m.id === selectedMissionId);
          if (currentMission) {
            checkMissionStatus(currentMission, eng);
          }
        }

        // 13. CHECK GAME OVER (VEHICLE WRECKED)
        if (eng.hp <= 0) {
          eng.isRunning = false;
          setGameState('gameover');
          sound.playGameOver();

          if (eng.score > highScore) {
            setHighScore(eng.score);
            localStorage.setItem('cyber_pursuit_highscore', eng.score.toString());
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          }
        }

        // Sync React HUD States (Throttled update for smooth UI)
        setHudHp(Math.round(eng.hp));
        setHudMaxHp(eng.maxHp);
        setHudNitro(Math.round(eng.nitro));
        setHudEmp(Math.round(eng.empCharge));
        setHudSpeed(Math.round(Math.abs(eng.speed)));
        setHudScore(eng.score);
        setHudMultiplier(eng.multiplier);
        setHudStars(eng.wantedLevel);
        setHudCopsSmashed(eng.copsDestroyed);
        setHudTime(Math.round(eng.survivalTimer));
        setHudShieldActive(eng.isShieldActive);
        setHudMagnetActive(eng.isMagnetActive);
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

      // Dark Cyber Metropolis Background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // Apply Screen Shake
      if (eng.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * eng.screenShake;
        const shakeY = (Math.random() - 0.5) * eng.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      // Transform world relative to Camera
      ctx.translate(centerX - eng.cameraX, centerY - eng.cameraY);

      // --- A. Draw Cyber Grid & Road Network ---
      const gridSize = 160;
      const startGridX = Math.floor((eng.cameraX - centerX) / gridSize) * gridSize;
      const endGridX = startGridX + width + gridSize * 2;
      const startGridY = Math.floor((eng.cameraY - centerY) / gridSize) * gridSize;
      const endGridY = startGridY + height + gridSize * 2;

      ctx.strokeStyle = 'rgba(30, 58, 138, 0.25)';
      ctx.lineWidth = 1.5;
      for (let gx = startGridX; gx <= endGridX; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, startGridY);
        ctx.lineTo(gx, endGridY);
        ctx.stroke();
      }
      for (let gy = startGridY; gy <= endGridY; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startGridX, gy);
        ctx.lineTo(endGridX, gy);
        ctx.stroke();
      }

      // Highway Neon Lanes
      const roadTileSize = 800;
      const roadStartX = Math.floor((eng.cameraX - centerX) / roadTileSize) * roadTileSize;
      const roadStartY = Math.floor((eng.cameraY - centerY) / roadTileSize) * roadTileSize;

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 4;
      for (let rx = roadStartX - roadTileSize; rx <= roadStartX + width + roadTileSize; rx += roadTileSize) {
        ctx.strokeRect(rx, roadStartY - roadTileSize, roadTileSize, roadTileSize * 3);
      }

      // --- B. Draw Tire Skid Marks ---
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.lineWidth = 8;
      eng.skidmarks.forEach((sm) => {
        ctx.save();
        ctx.translate(sm.x, sm.y);
        ctx.rotate(sm.angle);
        ctx.globalAlpha = sm.alpha;
        ctx.strokeRect(-12, -4, 24, 8);
        ctx.restore();
      });

      // --- C. Draw Obstacles & Stunt Ramps ---
      eng.obstacles.forEach((obs) => {
        if (!obs.active) return;
        ctx.save();
        ctx.translate(obs.x, obs.y);

        if (obs.type === 'building') {
          // Skyscraper Roof & Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(-obs.width / 2 + 10, -obs.height / 2 + 10, obs.width, obs.height);
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
          ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);

          // Roof Helipad / Antennas
          ctx.strokeStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.stroke();
        } else if (obs.type === 'ramp') {
          // Stunt Mega Ramp
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-20, -15);
          ctx.lineTo(20, 0);
          ctx.lineTo(-20, 15);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Arrow chevron
          ctx.fillStyle = '#000000';
          ctx.fillText('▲ JUMP', -16, 4);
        } else if (obs.type === 'barricade') {
          ctx.fillStyle = '#f97316';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.fillRect(-18, -8, 36, 16);
          ctx.strokeRect(-18, -8, 36, 16);
        } else if (obs.type === 'spikes') {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-16, -6, 32, 12);
          ctx.strokeStyle = '#fca5a5';
          for (let sp = -12; sp <= 12; sp += 6) {
            ctx.beginPath();
            ctx.moveTo(sp, 6);
            ctx.lineTo(sp + 3, -8);
            ctx.stroke();
          }
        }
        ctx.restore();
      });

      // --- D. Draw Power-Ups & Credits ---
      eng.powerups.forEach((pu) => {
        if (pu.collected) return;
        ctx.save();
        ctx.translate(pu.x, pu.y);
        const floatY = Math.sin(pu.pulseTimer) * 4;
        ctx.translate(0, floatY);

        if (pu.type === 'coin') {
          // Glowing Neon Credit Crystal
          ctx.fillStyle = '#facc15';
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText('CR', -7, 4);
        } else {
          // Mystery Powerup Box
          const colorMap = {
            nitro: '#00f0ff',
            emp: '#a855f7',
            shield: '#3b82f6',
            repair: '#10b981',
            magnet: '#ec4899',
          };
          const pColor = colorMap[pu.type as keyof typeof colorMap] || '#ffffff';

          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = pColor;
          ctx.lineWidth = 3;
          ctx.shadowColor = pColor;
          ctx.shadowBlur = 15;
          ctx.fillRect(-14, -14, 28, 28);
          ctx.strokeRect(-14, -14, 28, 28);

          ctx.fillStyle = pColor;
          ctx.font = 'bold 12px sans-serif';
          const iconStr = pu.type === 'nitro' ? '⚡' : pu.type === 'emp' ? '🔋' : pu.type === 'shield' ? '🛡️' : pu.type === 'repair' ? '🔧' : '🧲';
          ctx.fillText(iconStr, -8, 5);
        }
        ctx.restore();
      });

      // --- E. Draw Chasing Police Cruisers ---
      eng.police.forEach((cop) => {
        if (cop.isDestroyed) return;
        ctx.save();
        ctx.translate(cop.x, cop.y);
        ctx.rotate(cop.angle);

        // Cop Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-cop.length / 2 + 5, -cop.width / 2 + 5, cop.length, cop.width);

        // Stunned EMP overlay
        if (cop.stunTimer > 0) {
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 12;
        }

        // Vehicle Chassis
        ctx.fillStyle = cop.color;
        ctx.fillRect(-cop.length / 2, -cop.width / 2, cop.length, cop.width);
        ctx.strokeStyle = cop.glowColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(-cop.length / 2, -cop.width / 2, cop.length, cop.width);

        // Windshield
        ctx.fillStyle = '#050b14';
        ctx.fillRect(-8, -cop.width / 2 + 3, 16, cop.width - 6);

        // Police Siren Lightbar (Alternating Red/Blue Flash)
        const sirenLeftRed = Math.sin(cop.sirenPhase) > 0;
        ctx.fillStyle = sirenLeftRed ? '#ef4444' : '#00f0ff';
        ctx.shadowColor = sirenLeftRed ? '#ef4444' : '#00f0ff';
        ctx.shadowBlur = 16;
        ctx.fillRect(-4, -cop.width / 2 + 2, 8, (cop.width - 4) / 2);

        ctx.fillStyle = !sirenLeftRed ? '#ef4444' : '#00f0ff';
        ctx.shadowColor = !sirenLeftRed ? '#ef4444' : '#00f0ff';
        ctx.shadowBlur = 16;
        ctx.fillRect(-4, 0, 8, (cop.width - 4) / 2);

        // Headlights
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.fillRect(cop.length / 2 - 2, -cop.width / 2 + 2, 4, 6);
        ctx.fillRect(cop.length / 2 - 2, cop.width / 2 - 8, 4, 6);

        // Health Bar above cop
        ctx.rotate(-cop.angle);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-20, -cop.width - 8, 40, 5);
        ctx.fillStyle = cop.health / cop.maxHealth > 0.4 ? '#10b981' : '#ef4444';
        ctx.fillRect(-20, -cop.width - 8, 40 * Math.max(0, cop.health / cop.maxHealth), 5);

        ctx.restore();
      });

      // --- F. Draw Player Getaway Vehicle ---
      ctx.save();
      ctx.translate(eng.x, eng.y);
      ctx.rotate(eng.angle);

      // Stunt Airtime scale
      if (eng.isAirborne) {
        ctx.scale(1.3, 1.3);
      }

      // Car Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(-26, -15, 52, 30);

      // Neon Underglow
      ctx.fillStyle = activeCar.glowColor;
      ctx.shadowColor = activeCar.glowColor;
      ctx.shadowBlur = eng.isNitroActive ? 28 : 16;
      ctx.fillRect(-24, -13, 48, 26);

      // Car Body
      ctx.fillStyle = activeCar.color;
      ctx.fillRect(-25, -14, 50, 28);
      ctx.strokeStyle = activeCar.accentColor;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-25, -14, 50, 28);

      // Cockpit / Tinted Glass
      ctx.fillStyle = '#050b14';
      ctx.fillRect(-6, -10, 16, 20);

      // Cyber Core Glow Strip
      ctx.fillStyle = activeCar.glowColor;
      ctx.fillRect(4, -4, 12, 8);

      // Rear Spoiler
      ctx.fillStyle = activeCar.accentColor;
      ctx.fillRect(-27, -15, 6, 30);

      // Plasma Shield Bubble
      if (eng.isShieldActive) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // --- G. Draw Attack Chopper Spotlight & Airframe ---
      if (eng.chopper.active) {
        const ch = eng.chopper;
        // Spotlight cone pointing at player
        ctx.save();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.beginPath();
        ctx.moveTo(ch.x, ch.y);
        ctx.arc(eng.x, eng.y, 80, 0, Math.PI * 2);
        ctx.fill();

        // Laser Reticle on Player
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(eng.x, eng.y, 24, 0, Math.PI * 2);
        ctx.moveTo(eng.x - 30, eng.y);
        ctx.lineTo(eng.x + 30, eng.y);
        ctx.moveTo(eng.x, eng.y - 30);
        ctx.lineTo(eng.x, eng.y + 30);
        ctx.stroke();

        // Chopper Airframe
        ctx.translate(ch.x, ch.y);
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.fillRect(-30, -14, 60, 28);
        ctx.strokeRect(-30, -14, 60, 28);

        // Spinning Rotor Blades
        ctx.rotate(ch.rotorAngle);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-55, 0);
        ctx.lineTo(55, 0);
        ctx.moveTo(0, -55);
        ctx.lineTo(0, 55);
        ctx.stroke();

        ctx.restore();
      }

      // --- H. Draw Particles & Explosions ---
      eng.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // --- I. Draw Floating World Floating Text ---
      eng.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 12;
        ctx.font = `bold ${Math.round(16 * ft.scale)}px 'Impact', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [activeCar, activeCarId, checkMissionStatus, gameState, gameMode, highScore, playSirenChirp, selectedMissionId]);

  // ----------------------------------------------------
  // KEYBOARD HANDLERS
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.gas = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.brake = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = true;
      if (['ShiftLeft', 'ShiftRight', 'KeyE'].includes(e.code)) keysRef.current.nitro = true;
      if (['Space'].includes(e.code)) keysRef.current.drift = true;
      if (['KeyQ', 'KeyF'].includes(e.code)) triggerEmp();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.gas = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.brake = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = false;
      if (['ShiftLeft', 'ShiftRight', 'KeyE'].includes(e.code)) keysRef.current.nitro = false;
      if (['Space'].includes(e.code)) keysRef.current.drift = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerEmp]);

  // ----------------------------------------------------
  // RENDER JSX UI
  // ----------------------------------------------------
  return (
    <div className="relative w-full h-[640px] md:h-[720px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/30 select-none flex flex-col">
      {/* Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Top Header Floating Status Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-slate-950/90 to-transparent">
        {/* Credits Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/50 shadow-lg backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-black text-sm">{credits.toLocaleString()} CR</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
            <Trophy className="w-3.5 h-3.5 text-cyan-400" />
            <span>BEST: {highScore.toLocaleString()}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {gameState === 'playing' && (
            <button
              onClick={() => setGameState('menu')}
              className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
            >
              PAUSE
            </button>
          )}
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 transition shadow-md"
            title="Toggle Sound"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* IN-GAME ACTIVE HUD */}
      {gameState === 'playing' && (
        <div className="relative z-10 flex-1 flex flex-col justify-between p-4 pointer-events-none">
          {/* Top In-Game Stats Overlay */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* Wanted Stars Panel */}
            <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-900/80 border border-rose-500/50 backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-1 text-rose-400 text-xs font-black tracking-wider">
                <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
                <span>WANTED LEVEL</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 transition-all duration-300 ${
                      star <= hudStars
                        ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] scale-110'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Score & Multiplier */}
            <div className="flex flex-col items-end gap-1 p-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/40 backdrop-blur-md shadow-xl">
              <div className="text-cyan-300 font-mono text-xl font-black tracking-wider drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                {hudScore.toLocaleString()}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {hudMultiplier}x COMBO
                </span>
                <span className="text-slate-400 font-medium">⏱️ {hudTime}s</span>
              </div>
            </div>
          </div>

          {/* Active Buffs (Shield / Magnet) */}
          <div className="flex items-center gap-2">
            {hudShieldActive && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600/80 border border-blue-400 text-white text-xs font-bold animate-pulse shadow-lg">
                <Shield className="w-3.5 h-3.5" /> PLASMA SHIELD
              </div>
            )}
            {hudMagnetActive && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-600/80 border border-pink-400 text-white text-xs font-bold animate-pulse shadow-lg">
                <Magnet className="w-3.5 h-3.5" /> MAGNET ACTIVE
              </div>
            )}
          </div>

          {/* Bottom Vehicle Status & Mobile Touch Controls */}
          <div className="flex flex-col gap-3">
            {/* Health & Nitro Bars */}
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto w-full">
              {/* Armor / HP */}
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md">
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span className="flex items-center gap-1 text-emerald-400"><Wrench className="w-3 h-3" /> ARMOR</span>
                  <span>{hudHp}/{hudMaxHp}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${
                      hudHp / hudMaxHp > 0.4 ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-gradient-to-r from-rose-600 to-amber-500 animate-pulse'
                    }`}
                    style={{ width: `${Math.max(0, (hudHp / hudMaxHp) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Nitro Boost */}
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md">
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span className="flex items-center gap-1 text-cyan-400"><Flame className="w-3 h-3 text-cyan-400" /> NITRO</span>
                  <span>{hudNitro}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-150"
                    style={{ width: `${hudNitro}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Touch Control Buttons (Pointer Enabled) */}
            <div className="flex items-end justify-between pointer-events-auto w-full pt-2">
              {/* Steer D-Pad Left / Right */}
              <div className="flex gap-2">
                <button
                  onMouseDown={() => (keysRef.current.left = true)}
                  onMouseUp={() => (keysRef.current.left = false)}
                  onTouchStart={() => (keysRef.current.left = true)}
                  onTouchEnd={() => (keysRef.current.left = false)}
                  className="w-14 h-14 rounded-2xl bg-slate-900/90 active:bg-cyan-600 border-2 border-cyan-500/50 text-cyan-300 flex items-center justify-center shadow-lg active:scale-95 transition"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <button
                  onMouseDown={() => (keysRef.current.right = true)}
                  onMouseUp={() => (keysRef.current.right = false)}
                  onTouchStart={() => (keysRef.current.right = true)}
                  onTouchEnd={() => (keysRef.current.right = false)}
                  className="w-14 h-14 rounded-2xl bg-slate-900/90 active:bg-cyan-600 border-2 border-cyan-500/50 text-cyan-300 flex items-center justify-center shadow-lg active:scale-95 transition"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>

              {/* Action Buttons: EMP, Drift, Nitro, Gas/Brake */}
              <div className="flex items-center gap-2">
                {/* EMP Trigger */}
                <button
                  onClick={triggerEmp}
                  disabled={hudEmp < 100}
                  className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg active:scale-95 transition font-black text-xs ${
                    hudEmp >= 100
                      ? 'bg-purple-600/90 hover:bg-purple-500 border-purple-400 text-white animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.8)]'
                      : 'bg-slate-900/70 border-slate-700 text-slate-500 opacity-60'
                  }`}
                >
                  <Zap className="w-5 h-5" />
                  <span>EMP</span>
                </button>

                {/* Nitro Button */}
                <button
                  onMouseDown={() => (keysRef.current.nitro = true)}
                  onMouseUp={() => (keysRef.current.nitro = false)}
                  onTouchStart={() => (keysRef.current.nitro = true)}
                  onTouchEnd={() => (keysRef.current.nitro = false)}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 active:scale-95 border-2 border-cyan-300 text-white flex flex-col items-center justify-center shadow-lg transition font-black text-xs shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                >
                  <Flame className="w-5 h-5" />
                  <span>NITRO</span>
                </button>

                {/* Gas Pedal */}
                <button
                  onMouseDown={() => (keysRef.current.gas = true)}
                  onMouseUp={() => (keysRef.current.gas = false)}
                  onTouchStart={() => (keysRef.current.gas = true)}
                  onTouchEnd={() => (keysRef.current.gas = false)}
                  className="w-14 h-14 rounded-2xl bg-emerald-600 active:bg-emerald-500 active:scale-95 border-2 border-emerald-400 text-white flex items-center justify-center shadow-lg transition"
                >
                  <ArrowUp className="w-7 h-7" />
                </button>

                {/* Brake Pedal */}
                <button
                  onMouseDown={() => (keysRef.current.brake = true)}
                  onMouseUp={() => (keysRef.current.brake = false)}
                  onTouchStart={() => (keysRef.current.brake = true)}
                  onTouchEnd={() => (keysRef.current.brake = false)}
                  className="w-12 h-14 rounded-2xl bg-rose-700 active:bg-rose-600 active:scale-95 border-2 border-rose-400 text-white flex items-center justify-center shadow-lg transition"
                >
                  <ArrowDown className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN MENU OVERLAY */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full flex flex-col items-center gap-6">
            {/* Glowing Logo */}
            <div className="flex flex-col items-center">
              <div className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-400 font-bold text-xs tracking-widest uppercase mb-2 flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                <Radio className="w-3.5 h-3.5 animate-ping text-rose-400" />
                <span>POLICE PURSUIT ESCAPE</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-rose-500 to-amber-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.8)] font-sans">
                CYBER PURSUIT 3D
              </h1>
              <p className="text-slate-400 text-xs md:text-sm font-medium mt-1">
                Outrun elite AI police armada, smash roadblocks & escape 5-Star heat!
              </p>
            </div>

            {/* Selected Car Display Banner */}
            <div className="w-full p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md border"
                  style={{ backgroundColor: activeCar.color, borderColor: activeCar.glowColor }}
                >
                  <Car className="w-6 h-6 text-slate-950" />
                </div>
                <div className="text-left">
                  <div className="text-white font-black text-sm">{activeCar.name}</div>
                  <div className="text-cyan-400 text-xs font-bold">Top Speed: {activeCar.topSpeed} km/h</div>
                </div>
              </div>
              <button
                onClick={() => setGameState('garage')}
                className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-cyan-300 font-bold text-xs transition flex items-center gap-1"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> GARAGE
              </button>
            </div>

            {/* Main Action Buttons */}
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => startGame('endless')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-lg tracking-wider transition shadow-[0_0_25px_rgba(6,182,212,0.7)] flex items-center justify-center gap-2 active:scale-98"
              >
                <Play className="w-6 h-6 fill-current" /> PLAY ENDLESS GETAWAY
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setGameState('missions')}
                  className="py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Crosshair className="w-4 h-4 text-amber-400" /> MISSIONS ({completedMissionIds.length}/8)
                </button>

                <button
                  onClick={() => setGameState('instructions')}
                  className="py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <HelpCircle className="w-4 h-4 text-cyan-400" /> HOW TO PLAY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GARAGE / VEHICLE SHOWROOM */}
      {gameState === 'garage' && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">
                CYBER GETAWAY GARAGE
              </h2>
              <p className="text-xs text-slate-400">Unlock and customize high-speed pursuit breakers</p>
            </div>
            <button
              onClick={() => setGameState('menu')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              BACK TO MENU
            </button>
          </div>

          {/* Vehicle Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {VEHICLE_ROSTER.map((car) => {
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
                        <Car className="w-7 h-7 text-slate-950" />
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
                        <div className="h-full bg-cyan-400" style={{ width: `${(car.topSpeed / 320) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-400 mb-0.5">
                        <span>Armor</span>
                        <span>{car.armor}</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400" style={{ width: `${(car.armor / 300) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-400 mb-0.5">
                        <span>Handling</span>
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
                      onClick={() => selectCar(car.id)}
                      disabled={isSelected}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 cursor-default'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                      }`}
                    >
                      {isSelected ? 'SELECTED' : 'EQUIP VEHICLE'}
                    </button>
                  ) : (
                    <button
                      onClick={() => buyCar(car)}
                      disabled={!canAfford}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]'
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
        </div>
      )}

      {/* MISSIONS SELECT MODAL */}
      {gameState === 'missions' && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400">
                TACTICAL MISSIONS
              </h2>
              <p className="text-xs text-slate-400">Complete challenges to earn huge Cyber Credit rewards</p>
            </div>
            <button
              onClick={() => setGameState('menu')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              BACK TO MENU
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
            {DEFAULT_MISSIONS.map((m) => {
              const isCleared = completedMissionIds.includes(m.id);

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    isCleared
                      ? 'bg-emerald-950/30 border-emerald-500/50'
                      : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                        isCleared ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-amber-400'
                      }`}
                    >
                      {isCleared ? <CheckCircle2 className="w-5 h-5" /> : m.id}
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm flex items-center gap-2">
                        <span>{m.title}</span>
                        {isCleared && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            CLEARED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{m.desc}</div>
                      <div className="text-xs font-bold text-amber-400 mt-1">Reward: +{m.rewardCoins} CR</div>
                    </div>
                  </div>

                  <button
                    onClick={() => startGame('mission', m.id)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md whitespace-nowrap"
                  >
                    LAUNCH
                  </button>
                </div>
              );
            })}
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
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
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
                <li><strong className="text-white">[W] / [↑]</strong> — Accelerate Forward</li>
                <li><strong className="text-white">[S] / [↓]</strong> — Reverse / Brake</li>
                <li><strong className="text-white">[A, D] / [←, →]</strong> — Steer Left & Right</li>
                <li><strong className="text-white">[SPACE]</strong> — Handbrake & Power Drift</li>
                <li><strong className="text-white">[SHIFT] / [E]</strong> — Supersonic Nitro Turbo</li>
                <li><strong className="text-white">[Q] / [F]</strong> — EMP Shockwave Blast</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-amber-400 font-bold text-base flex items-center gap-2">
                <Shield className="w-5 h-5" /> Combat & Survival Tips
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>• <strong>Ram Police:</strong> Hit cops at high speed to wreck them and earn multipliers.</li>
                <li>• <strong>EMP Blast:</strong> Fires a 360° electromagnetic pulse disabling all nearby cruisers.</li>
                <li>• <strong>Stunt Ramps:</strong> Launch off golden ramps for slow-motion airborne leaps.</li>
                <li>• <strong>Wanted Level:</strong> Higher heat levels spawn heavy SWAT trucks & attack choppers!</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full flex flex-col items-center gap-5 p-6 rounded-3xl bg-slate-900/90 border border-rose-500/40 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-600/20 border-2 border-rose-500 text-rose-400 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.6)]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-3xl font-black text-white tracking-wider">VEHICLE WRECKED</h2>
              <p className="text-xs text-slate-400 mt-1">Pursuit unit neutralized your getaway machine!</p>
            </div>

            {/* Score Breakdown */}
            <div className="w-full grid grid-cols-2 gap-3 py-3 border-y border-slate-800">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Final Score</div>
                <div className="text-xl font-black text-cyan-300">{hudScore.toLocaleString()}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Cops Wrecked</div>
                <div className="text-xl font-black text-rose-400">{hudCopsSmashed}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={() => startGame(gameMode, selectedMissionId)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-sm tracking-wider transition shadow-lg flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> RETRY GETAWAY
              </button>

              <button
                onClick={() => setGameState('menu')}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                RETURN TO MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
