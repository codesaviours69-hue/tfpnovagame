import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Zap,
  Shield,
  Flame,
  Gauge,
  Compass,
  BatteryCharging,
  Coins,
  Wrench,
  Pause,
  AlertTriangle,
  Layers,
  ChevronLeft,
  Sparkles,
  Award
} from 'lucide-react';
import { sound } from '../../utils/audio';
import { RewardAdModal, InterstitialAdModal } from '../ads';
import { Gift } from 'lucide-react';

// --- GAME CONSTANTS ---
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 640;

export interface VehicleConfig {
  id: string;
  name: string;
  type: 'buggy' | 'monster' | 'bike' | 'truck';
  price: number;
  description: string;
  wheelRadius: number;
  wheelBase: number;
  bodyWidth: number;
  bodyHeight: number;
  basePower: number;
  baseSuspension: number;
  baseGrip: number;
  baseFuel: number;
  primaryColor: string;
  accentColor: string;
}

export interface StageConfig {
  id: string;
  name: string;
  theme: 'megacity' | 'moon' | 'lava' | 'ice' | 'alien';
  price: number;
  description: string;
  gravity: number;
  friction: number;
  hillScale: number;
  roughness: number;
  bgColorTop: string;
  bgColorBottom: string;
  hillColor: string;
  neonEdgeColor: string;
  ambientLight: string;
}

const VEHICLES: VehicleConfig[] = [
  {
    id: 'cyber-buggy',
    name: 'Cyber Neon Buggy',
    type: 'buggy',
    price: 0,
    description: 'Agile & balanced dune buggy with neon rollcage. Great starter for all tracks.',
    wheelRadius: 20,
    wheelBase: 90,
    bodyWidth: 110,
    bodyHeight: 45,
    basePower: 1.0,
    baseSuspension: 1.0,
    baseGrip: 1.0,
    baseFuel: 100,
    primaryColor: '#00f0ff',
    accentColor: '#ff007f',
  },
  {
    id: 'quantum-monster',
    name: 'Quantum Monster 4x4',
    type: 'monster',
    price: 600,
    description: 'Giant monster tires with heavy torque. Easily conquers the steepest mountain peaks.',
    wheelRadius: 28,
    wheelBase: 105,
    bodyWidth: 125,
    bodyHeight: 55,
    basePower: 1.35,
    baseSuspension: 1.4,
    baseGrip: 1.3,
    baseFuel: 115,
    primaryColor: '#00ff66',
    accentColor: '#ffe600',
  },
  {
    id: 'plasma-bike',
    name: 'Plasma Light Cycle',
    type: 'bike',
    price: 1400,
    description: 'Ultra-lightweight twin-wheel stunt bike. Extreme top speed and insane flip agility.',
    wheelRadius: 18,
    wheelBase: 70,
    bodyWidth: 85,
    bodyHeight: 38,
    basePower: 1.5,
    baseSuspension: 0.9,
    baseGrip: 1.15,
    baseFuel: 95,
    primaryColor: '#ff007f',
    accentColor: '#00f0ff',
  },
  {
    id: 'supernova-truck',
    name: 'Supernova Hyper Truck',
    type: 'truck',
    price: 2800,
    description: 'Armored futuristic juggernaut with dual afterburners, colossal fuel cell and unstoppable power.',
    wheelRadius: 25,
    wheelBase: 120,
    bodyWidth: 140,
    bodyHeight: 60,
    basePower: 1.65,
    baseSuspension: 1.5,
    baseGrip: 1.45,
    baseFuel: 140,
    primaryColor: '#ff7700',
    accentColor: '#9d00ff',
  },
];

const STAGES: StageConfig[] = [
  {
    id: 'megacity',
    name: '🌆 Neon Megacity',
    theme: 'megacity',
    price: 0,
    description: 'Synthwave skyline with smooth flyovers and neon skyscrapers.',
    gravity: 0.38,
    friction: 0.98,
    hillScale: 1.0,
    roughness: 1.0,
    bgColorTop: '#060417',
    bgColorBottom: '#280838',
    hillColor: '#120526',
    neonEdgeColor: '#00f0ff',
    ambientLight: '#ff007f',
  },
  {
    id: 'moon',
    name: '🌌 Cyber Moon Crater',
    theme: 'moon',
    price: 500,
    description: 'Low-gravity lunar ridges! Experience floaty airtime jumps.',
    gravity: 0.20,
    friction: 0.97,
    hillScale: 1.3,
    roughness: 1.2,
    bgColorTop: '#020208',
    bgColorBottom: '#0e1738',
    hillColor: '#0b1126',
    neonEdgeColor: '#00e5ff',
    ambientLight: '#8000ff',
  },
  {
    id: 'lava',
    name: '🌋 Plasma Volcano Dunes',
    theme: 'lava',
    price: 1200,
    description: 'Steep fiery dunes and glowing lava streams. Extreme climbs require upgraded torque!',
    gravity: 0.42,
    friction: 0.98,
    hillScale: 1.45,
    roughness: 1.35,
    bgColorTop: '#180308',
    bgColorBottom: '#420a0a',
    hillColor: '#24070a',
    neonEdgeColor: '#ff3300',
    ambientLight: '#ffaa00',
  },
  {
    id: 'ice',
    name: '❄️ Cryo Ice Glaciers',
    theme: 'ice',
    price: 2000,
    description: 'Slick low-friction icy peaks. Precision throttle is needed to maintain traction.',
    gravity: 0.36,
    friction: 0.88,
    hillScale: 1.15,
    roughness: 0.9,
    bgColorTop: '#030d1a',
    bgColorBottom: '#07243a',
    hillColor: '#071826',
    neonEdgeColor: '#38bdf8',
    ambientLight: '#a7f3d0',
  },
  {
    id: 'alien',
    name: '🛸 Alien Exoplanet',
    theme: 'alien',
    price: 3500,
    description: 'Quantum gravity anomalies and cosmic loops in a deep space atmosphere.',
    gravity: 0.30,
    friction: 0.99,
    hillScale: 1.5,
    roughness: 1.4,
    bgColorTop: '#120224',
    bgColorBottom: '#2d0442',
    hillColor: '#1a052a',
    neonEdgeColor: '#a855f7',
    ambientLight: '#06b6d4',
  },
];

interface Collectible {
  x: number;
  y: number;
  type: 'coin' | 'gem' | 'fuel' | 'nitro';
  value: number;
  collected: boolean;
  pulsePhase: number;
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

export const CyberNeonHillClimb2D: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<'menu' | 'garage' | 'stageSelect' | 'playing' | 'gameover' | 'paused'>('menu');
  const [showRewardedModal, setShowRewardedModal] = useState<boolean>(false);
  const [showInterstitialModal, setShowInterstitialModal] = useState<boolean>(false);
  const [rewardClaimDescription, setRewardClaimDescription] = useState<string>('Watch a short sponsor video to claim +2,500 Cyber Energy Coins!');
  const [coins, setCoins] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_hillclimb_coins');
    return saved ? parseInt(saved, 10) : 150;
  });
  const [highScores, setHighScores] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('novaplay_hillclimb_highscores');
    return saved ? JSON.parse(saved) : {};
  });

  // Unlocks & Upgrades
  const [unlockedVehicles, setUnlockedVehicles] = useState<string[]>(() => {
    const saved = localStorage.getItem('novaplay_hillclimb_unlocked_vehicles');
    return saved ? JSON.parse(saved) : ['cyber-buggy'];
  });
  const [unlockedStages, setUnlockedStages] = useState<string[]>(() => {
    const saved = localStorage.getItem('novaplay_hillclimb_unlocked_stages');
    return saved ? JSON.parse(saved) : ['megacity'];
  });

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('cyber-buggy');
  const [selectedStageId, setSelectedStageId] = useState<string>('megacity');

  // Vehicle Upgrades: Level 1 to 10
  const [upgrades, setUpgrades] = useState<Record<string, { engine: number; suspension: number; tires: number; fuel: number }>>(() => {
    const saved = localStorage.getItem('novaplay_hillclimb_upgrades');
    if (saved) return JSON.parse(saved);
    const initial: Record<string, { engine: number; suspension: number; tires: number; fuel: number }> = {};
    VEHICLES.forEach(v => {
      initial[v.id] = { engine: 1, suspension: 1, tires: 1, fuel: 1 };
    });
    return initial;
  });

  // Current match telemetry
  const [currentDistance, setCurrentDistance] = useState(0);
  const [currentCoinsEarned, setCurrentCoinsEarned] = useState(0);
  const [currentFuel, setCurrentFuel] = useState(100);
  const [currentNitro, setCurrentNitro] = useState(100);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [activeStuntText, setActiveStuntText] = useState<{ text: string; color: string } | null>(null);
  const [deathReason, setDeathReason] = useState<'fuel' | 'crash'>('crash');
  const [isMuted, setIsMuted] = useState(sound.isMuted());

  // Input states (Gas / Brake / Nitro)
  const isGasPressed = useRef(false);
  const isBrakePressed = useRef(false);
  const isNitroPressed = useRef(false);

  // Canvas & Audio refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stuntTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Procedural Sound Synthesizer context for dynamic Engine audio
  const engineAudioCtxRef = useRef<AudioContext | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);
  const lowFuelAlarmTimerRef = useRef<number>(0);

  // Physics Simulation Object Ref
  const simRef = useRef({
    x: 100,
    y: 300,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    rearWheelY: 300,
    frontWheelY: 300,
    rearWheelContact: false,
    frontWheelContact: false,
    rearWheelSpin: 0,
    frontWheelSpin: 0,
    fuel: 100,
    maxFuel: 100,
    nitro: 100,
    isNitroActive: false,
    distance: 0,
    maxDistanceReached: 0,
    coinsEarned: 0,
    airTime: 0,
    totalRotationInAir: 0,
    isAirborne: false,
    wheelieTime: 0,
    crashed: false,
    lastMilestoneReached: 0,
    cameraX: 100,
    cameraY: 300,
    cameraZoom: 1,
    collectibles: [] as Collectible[],
    particles: [] as Particle[],
    driverNeckX: 100,
    driverNeckY: 300,
  });

  // Current active vehicle & stage objects
  const activeVehicle = VEHICLES.find(v => v.id === selectedVehicleId) || VEHICLES[0];
  const activeStage = STAGES.find(s => s.id === selectedStageId) || STAGES[0];
  const activeUpgrades = upgrades[selectedVehicleId] || { engine: 1, suspension: 1, tires: 1, fuel: 1 };

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('novaplay_hillclimb_coins', coins.toString());
  }, [coins]);

  useEffect(() => {
    localStorage.setItem('novaplay_hillclimb_highscores', JSON.stringify(highScores));
  }, [highScores]);

  useEffect(() => {
    localStorage.setItem('novaplay_hillclimb_unlocked_vehicles', JSON.stringify(unlockedVehicles));
  }, [unlockedVehicles]);

  useEffect(() => {
    localStorage.setItem('novaplay_hillclimb_unlocked_stages', JSON.stringify(unlockedStages));
  }, [unlockedStages]);

  useEffect(() => {
    localStorage.setItem('novaplay_hillclimb_upgrades', JSON.stringify(upgrades));
  }, [upgrades]);

  // Procedural Terrain Height Calculation
  const getGroundHeight = useCallback((x: number, stage: StageConfig): number => {
    const s = stage.hillScale;
    const r = stage.roughness;

    if (x < 200) {
      return 420;
    }

    const t = x - 200;
    const h1 = Math.sin(t * 0.0028) * 95 * s;
    const h2 = Math.cos(t * 0.0065) * 45 * s * r;
    const h3 = Math.sin(t * 0.015) * 20 * s;
    const h4 = Math.sin(t * 0.0008) * 70 * s;

    const rampCycle = (t % 1000);
    let rampOffset = 0;
    if (rampCycle > 780 && rampCycle < 920) {
      const rampProgress = (rampCycle - 780) / 140;
      rampOffset = -Math.sin(rampProgress * Math.PI * 0.7) * 65 * s;
    }

    return 430 + h1 + h2 + h3 + h4 + rampOffset;
  }, []);

  // Normal angle calculation for terrain at x
  const getGroundSlopeAngle = useCallback((x: number, stage: StageConfig): number => {
    const delta = 4;
    const y1 = getGroundHeight(x - delta, stage);
    const y2 = getGroundHeight(x + delta, stage);
    return Math.atan2(y2 - y1, delta * 2);
  }, [getGroundHeight]);

  // Generate initial collectibles up to distance X
  const generateCollectibles = useCallback((fromX: number, toX: number, stage: StageConfig): Collectible[] => {
    const items: Collectible[] = [];
    const step = 50;
    for (let x = fromX; x < toX; x += step) {
      const groundY = getGroundHeight(x, stage);
      const groupType = Math.floor((x / 300) % 5);

      if (groupType === 0 && x % 100 === 0) {
        items.push({
          x,
          y: groundY - 45 - Math.sin((x % 300) / 300 * Math.PI) * 35,
          type: 'coin',
          value: 10,
          collected: false,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      } else if (groupType === 1 && x % 450 === 0) {
        items.push({
          x,
          y: groundY - 50,
          type: 'gem',
          value: 50,
          collected: false,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      } else if (x % 600 === 0 && x > 250) {
        items.push({
          x,
          y: groundY - 38,
          type: 'fuel',
          value: 45,
          collected: false,
          pulsePhase: 0,
        });
      } else if (x % 850 === 0 && x > 400) {
        items.push({
          x,
          y: groundY - 42,
          type: 'nitro',
          value: 60,
          collected: false,
          pulsePhase: 0,
        });
      }
    }
    return items;
  }, [getGroundHeight]);

  // Audio Engine: Procedural Engine Pitch Synthesis
  const initEngineAudio = () => {
    if (isMuted || engineAudioCtxRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(45, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      engineAudioCtxRef.current = ctx;
      engineOscRef.current = osc;
      engineGainRef.current = gain;
    } catch {
      // ignore
    }
  };

  const updateEngineAudio = (rpm: number, isThrottle: boolean, isNitro: boolean) => {
    if (isMuted || !engineAudioCtxRef.current || !engineOscRef.current || !engineGainRef.current) return;
    try {
      const targetFreq = 40 + rpm * 105 + (isNitro ? 65 : 0);
      const targetGain = isThrottle ? 0.07 : 0.025;
      const now = engineAudioCtxRef.current.currentTime;
      engineOscRef.current.frequency.setTargetAtTime(targetFreq, now, 0.05);
      engineGainRef.current.gain.setTargetAtTime(targetGain, now, 0.08);
    } catch {
      // ignore
    }
  };

  const stopEngineAudio = () => {
    if (engineOscRef.current) {
      try {
        engineOscRef.current.stop();
        engineOscRef.current.disconnect();
      } catch {}
      engineOscRef.current = null;
    }
    if (engineAudioCtxRef.current) {
      try {
        engineAudioCtxRef.current.close();
      } catch {}
      engineAudioCtxRef.current = null;
    }
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        isGasPressed.current = true;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        isBrakePressed.current = true;
      }
      if (e.key === ' ' || e.key === 'Shift') {
        isNitroPressed.current = true;
      }
      if (e.key === 'r' || e.key === 'R') {
        if (gameState === 'playing' || gameState === 'gameover') {
          startGame();
        }
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        isGasPressed.current = false;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        isBrakePressed.current = false;
      }
      if (e.key === ' ' || e.key === 'Shift') {
        isNitroPressed.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Start new run
  const startGame = () => {
    sound.playClick();
    const maxFuelCapacity = activeVehicle.baseFuel * (1 + (activeUpgrades.fuel - 1) * 0.12);
    const groundY = getGroundHeight(100, activeStage);

    simRef.current = {
      x: 100,
      y: groundY - activeVehicle.wheelRadius - 35,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
      rearWheelY: groundY - activeVehicle.wheelRadius,
      frontWheelY: groundY - activeVehicle.wheelRadius,
      rearWheelContact: true,
      frontWheelContact: true,
      rearWheelSpin: 0,
      frontWheelSpin: 0,
      fuel: maxFuelCapacity,
      maxFuel: maxFuelCapacity,
      nitro: 100,
      isNitroActive: false,
      distance: 0,
      maxDistanceReached: 0,
      coinsEarned: 0,
      airTime: 0,
      totalRotationInAir: 0,
      isAirborne: false,
      wheelieTime: 0,
      crashed: false,
      lastMilestoneReached: 0,
      cameraX: 100,
      cameraY: groundY - 40,
      cameraZoom: 1,
      collectibles: generateCollectibles(0, 1800, activeStage),
      particles: [],
      driverNeckX: 100,
      driverNeckY: groundY - 70,
    };

    setCurrentDistance(0);
    setCurrentCoinsEarned(0);
    setCurrentFuel(maxFuelCapacity);
    setCurrentNitro(100);
    setSpeedKmh(0);
    setActiveStuntText(null);

    initEngineAudio();
    setGameState('playing');
  };

  // Trigger stunt notification banner cleanly
  const triggerStunt = (text: string, extraCoins: number, color: string) => {
    sound.playPowerup();
    setActiveStuntText({ text: `${text} (+${extraCoins}🪙)`, color });

    if (stuntTimeoutRef.current) clearTimeout(stuntTimeoutRef.current);
    stuntTimeoutRef.current = setTimeout(() => {
      setActiveStuntText(null);
    }, 1800);

    simRef.current.coinsEarned += extraCoins;
    setCoins(prev => prev + extraCoins);
  };

  // Handle Game Over
  const triggerGameOver = (reason: 'fuel' | 'crash') => {
    if (simRef.current.crashed) return;
    simRef.current.crashed = true;
    setDeathReason(reason);
    stopEngineAudio();

    if (reason === 'crash') {
      sound.playExplosion();
      for (let i = 0; i < 30; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 10 + 2;
        simRef.current.particles.push({
          x: simRef.current.x,
          y: simRef.current.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 3,
          size: Math.random() * 5 + 2,
          color: i % 2 === 0 ? '#ff0055' : '#ffaa00',
          alpha: 1,
          decay: 0.02,
        });
      }
    } else {
      sound.playGameOver();
    }

    const dist = Math.floor(simRef.current.maxDistanceReached);
    setHighScores(prev => {
      const old = prev[selectedStageId] || 0;
      return {
        ...prev,
        [selectedStageId]: Math.max(old, dist)
      };
    });

    setTimeout(() => {
      setGameState('gameover');
    }, 800);
  };

  // Upgrades purchase handler
  const handleBuyUpgrade = (type: 'engine' | 'suspension' | 'tires' | 'fuel') => {
    const currentLvl = activeUpgrades[type];
    if (currentLvl >= 10) return;
    const cost = Math.floor(60 * Math.pow(1.5, currentLvl));

    if (coins >= cost) {
      sound.playWin();
      setCoins(prev => prev - cost);
      setUpgrades(prev => ({
        ...prev,
        [selectedVehicleId]: {
          ...prev[selectedVehicleId],
          [type]: currentLvl + 1
        }
      }));
    } else {
      sound.playHit();
    }
  };

  // Unlock Vehicle handler
  const handleUnlockVehicle = (vehicle: VehicleConfig) => {
    if (coins >= vehicle.price && !unlockedVehicles.includes(vehicle.id)) {
      sound.playWin();
      setCoins(prev => prev - vehicle.price);
      setUnlockedVehicles(prev => [...prev, vehicle.id]);
      setSelectedVehicleId(vehicle.id);
    } else {
      sound.playHit();
    }
  };

  // Unlock Stage handler
  const handleUnlockStage = (stage: StageConfig) => {
    if (coins >= stage.price && !unlockedStages.includes(stage.id)) {
      sound.playWin();
      setCoins(prev => prev - stage.price);
      setUnlockedStages(prev => [...prev, stage.id]);
      setSelectedStageId(stage.id);
    } else {
      sound.playHit();
    }
  };

  // =========================================================================
  // MAIN PHYSICS & RENDER LOOP (60 FPS)
  // =========================================================================
  useEffect(() => {
    if (gameState !== 'playing') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      stopEngineAudio();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const renderLoop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.033);
      lastTime = time;

      const sim = simRef.current;
      const vehicle = activeVehicle;
      const stage = activeStage;
      const up = activeUpgrades;

      // -----------------------------------------------------------------------
      // 1. PHYSICS UPDATE (Multi-Wheel + Suspension Spring Raycast Physics)
      // -----------------------------------------------------------------------
      if (!sim.crashed) {
        const engineMultiplier = vehicle.basePower * (1 + (up.engine - 1) * 0.18);
        const suspensionMultiplier = vehicle.baseSuspension * (1 + (up.suspension - 1) * 0.15);
        const tireGripMultiplier = vehicle.baseGrip * (1 + (up.tires - 1) * 0.14) * stage.friction;

        // Gravity
        sim.vy += stage.gravity;

        // Nitro Boost handling
        const isNitro = isNitroPressed.current && sim.nitro > 0;
        sim.isNitroActive = isNitro;
        let nitroThrust = 1.0;
        if (isNitro) {
          nitroThrust = 2.0;
          sim.nitro = Math.max(0, sim.nitro - 28 * dt);
          if (Math.random() < 0.7) {
            const exhaustAngle = sim.angle + Math.PI;
            sim.particles.push({
              x: sim.x - Math.cos(sim.angle) * (vehicle.bodyWidth * 0.5),
              y: sim.y - Math.sin(sim.angle) * (vehicle.bodyWidth * 0.5),
              vx: Math.cos(exhaustAngle + (Math.random() - 0.5) * 0.3) * 10 + sim.vx * 0.3,
              vy: Math.sin(exhaustAngle + (Math.random() - 0.5) * 0.3) * 10 + sim.vy * 0.3,
              size: Math.random() * 6 + 3,
              color: Math.random() > 0.4 ? '#00f0ff' : '#ff00ff',
              alpha: 0.9,
              decay: 0.05,
            });
          }
        }

        // Throttle & Fuel consumption
        const isGas = isGasPressed.current && sim.fuel > 0;
        const isBrake = isBrakePressed.current && sim.fuel > 0;

        if (isGas || isBrake) {
          const fuelBurnRate = (isGas ? 4.2 : 2.5) * (isNitro ? 2.0 : 1.0);
          sim.fuel = Math.max(0, sim.fuel - fuelBurnRate * dt);
          if (sim.fuel <= 0) {
            triggerGameOver('fuel');
          }
        }

        // Low fuel alarm alert sound & flash
        if (sim.fuel > 0 && sim.fuel < sim.maxFuel * 0.2) {
          lowFuelAlarmTimerRef.current += dt;
          if (lowFuelAlarmTimerRef.current > 1.0) {
            lowFuelAlarmTimerRef.current = 0;
            sound.playHit();
          }
        }

        // Calculate positions of rear and front wheels in world space
        const halfBase = vehicle.wheelBase * 0.5;
        const cosA = Math.cos(sim.angle);
        const sinA = Math.sin(sim.angle);

        const rearWheelX = sim.x - cosA * halfBase;
        const rearWheelTargetY = sim.y - sinA * halfBase + 12;
        const frontWheelX = sim.x + cosA * halfBase;
        const frontWheelTargetY = sim.y + sinA * halfBase + 12;

        const rearGroundY = getGroundHeight(rearWheelX, stage);
        const frontGroundY = getGroundHeight(frontWheelX, stage);

        const rWheelRadius = vehicle.wheelRadius;
        const fWheelRadius = vehicle.wheelRadius;

        // Suspension Spring Raycasts
        const rearOverlap = (rearWheelTargetY + rWheelRadius) - rearGroundY;
        const frontOverlap = (frontWheelTargetY + fWheelRadius) - frontGroundY;

        sim.rearWheelContact = rearOverlap > -2;
        sim.frontWheelContact = frontOverlap > -2;

        const onGround = sim.rearWheelContact || sim.frontWheelContact;

        if (onGround) {
          const springK = 0.42 * suspensionMultiplier;

          if (rearOverlap > 0) {
            const springForce = rearOverlap * springK;
            sim.vy -= springForce;
            sim.angularVelocity += springForce * 0.012;
            sim.y -= rearOverlap * 0.35;
          }
          if (frontOverlap > 0) {
            const springForce = frontOverlap * springK;
            sim.vy -= springForce;
            sim.angularVelocity -= springForce * 0.012;
            sim.y -= frontOverlap * 0.35;
          }

          // Drive Motor Torque & Friction
          const groundSlope = getGroundSlopeAngle(sim.x, stage);
          const slopeForceX = Math.sin(groundSlope) * stage.gravity * 0.7;
          sim.vx -= slopeForceX;

          if (isGas) {
            const accelForce = 0.55 * engineMultiplier * nitroThrust * tireGripMultiplier;
            sim.vx += Math.cos(groundSlope) * accelForce;
            sim.vy += Math.sin(groundSlope) * accelForce;

            sim.angularVelocity += 0.003;
            sim.rearWheelSpin += 0.35;
            sim.frontWheelSpin += 0.35;

            if (Math.random() < 0.3) {
              sim.particles.push({
                x: rearWheelX,
                y: rearGroundY,
                vx: -Math.cos(groundSlope) * (Math.random() * 4 + 2),
                vy: -Math.random() * 2 - 1,
                size: Math.random() * 4 + 2,
                color: '#ffffff',
                alpha: 0.5,
                decay: 0.04,
              });
            }
          }

          if (isBrake) {
            if (sim.vx > 0.5) {
              sim.vx *= 0.92;
            } else {
              sim.vx -= 0.28 * engineMultiplier * tireGripMultiplier;
            }
            sim.angularVelocity -= 0.004;
          }

          sim.vx *= 0.992;
          sim.angularVelocity *= 0.88;

          if (sim.isAirborne) {
            if (sim.airTime > 1.4) {
              const airBonus = Math.floor(sim.airTime * 10);
              triggerStunt(`AIR TIME ${sim.airTime.toFixed(1)}s!`, airBonus, '#00f0ff');
            }
            sim.isAirborne = false;
            sim.airTime = 0;
            sim.totalRotationInAir = 0;
          }

          if (sim.rearWheelContact && !sim.frontWheelContact && sim.vx > 3) {
            sim.wheelieTime += dt;
            if (sim.wheelieTime > 1.8) {
              triggerStunt('WHEELIE MASTER! ⚡', 20, '#ffe600');
              sim.wheelieTime = 0;
            }
          } else {
            sim.wheelieTime = 0;
          }
        } else {
          // Mid-Air Stunts & In-Air Angular Control
          sim.isAirborne = true;
          sim.airTime += dt;
          sim.vx *= 0.998;

          if (isGas) {
            sim.angularVelocity += 0.055;
          }
          if (isBrake) {
            sim.angularVelocity -= 0.055;
          }

          sim.angularVelocity *= 0.96;

          // Flip detection
          sim.totalRotationInAir += sim.angularVelocity;
          if (sim.totalRotationInAir >= Math.PI * 2) {
            triggerStunt('BACKFLIP! 🌀', 50, '#ff007f');
            sim.totalRotationInAir -= Math.PI * 2;
          } else if (sim.totalRotationInAir <= -Math.PI * 2) {
            triggerStunt('FRONTFLIP! 🔄', 60, '#00ff66');
            sim.totalRotationInAir += Math.PI * 2;
          }
        }

        // Apply velocities
        sim.x += sim.vx;
        sim.y += sim.vy;
        sim.angle += sim.angularVelocity;

        // Driver Head Crash Collision Detection
        const driverOffsetX = -5;
        const driverOffsetY = -vehicle.bodyHeight * 0.85;
        sim.driverNeckX = sim.x + cosA * driverOffsetX - sinA * driverOffsetY;
        sim.driverNeckY = sim.y + sinA * driverOffsetX + cosA * driverOffsetY;

        const driverGroundY = getGroundHeight(sim.driverNeckX, stage);
        if (sim.driverNeckY > driverGroundY - 4) {
          triggerGameOver('crash');
        }

        // Under-ground failsafe
        const chassisGroundY = getGroundHeight(sim.x, stage);
        if (sim.y > chassisGroundY + 15) {
          sim.y = chassisGroundY + 15;
          sim.vy = 0;
        }

        // Distance & Milestones (Fires strictly ONCE per milestone!)
        const rawDist = Math.max(0, (sim.x - 100) / 10);
        if (rawDist > sim.maxDistanceReached) {
          sim.maxDistanceReached = rawDist;
          sim.distance = rawDist;

          const milestoneStep = 250;
          const currentMilestoneIdx = Math.floor(rawDist / milestoneStep);
          if (currentMilestoneIdx > sim.lastMilestoneReached) {
            sim.lastMilestoneReached = currentMilestoneIdx;
            const mDist = currentMilestoneIdx * milestoneStep;
            triggerStunt(`MILESTONE ${mDist}m REACHED! 🏆`, Math.floor(mDist * 0.1), '#00f0ff');
          }
        }

        // Collectibles Collision
        sim.collectibles.forEach(item => {
          if (item.collected) return;
          const dx = item.x - sim.x;
          const dy = item.y - sim.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < 45 * 45) {
            item.collected = true;
            if (item.type === 'coin') {
              sound.playCollect();
              sim.coinsEarned += item.value;
              setCoins(prev => prev + item.value);
            } else if (item.type === 'gem') {
              sound.playGemCollect();
              sim.coinsEarned += item.value;
              setCoins(prev => prev + item.value);
            } else if (item.type === 'fuel') {
              sound.playPowerup();
              sim.fuel = Math.min(sim.maxFuel, sim.fuel + item.value);
              triggerStunt('QUANTUM REFUEL! 🔋', 10, '#00ff88');
            } else if (item.type === 'nitro') {
              sound.playBoost();
              sim.nitro = 100;
              triggerStunt('NITRO RECHARGED! ⚡', 10, '#00f0ff');
            }
          }
        });

        // Generate more collectibles ahead
        if (sim.x > sim.collectibles[sim.collectibles.length - 1]?.x - 1200) {
          const lastX = sim.collectibles[sim.collectibles.length - 1]?.x || sim.x;
          const newItems = generateCollectibles(lastX + 60, lastX + 1800, stage);
          sim.collectibles.push(...newItems);
        }

        // Update audio RPM
        const speed = Math.abs(sim.vx) * 3.6;
        const rpm = Math.min(1, Math.max(0, (isGas ? 0.6 : 0.1) + (speed / 160) * 0.4));
        updateEngineAudio(rpm, isGas, isNitro);

        // State telemetry
        setCurrentDistance(Math.floor(sim.distance));
        setCurrentCoinsEarned(sim.coinsEarned);
        setCurrentFuel(sim.fuel);
        setCurrentNitro(sim.nitro);
        setSpeedKmh(Math.floor(speed));
      }

      // Smooth Camera Follow
      const targetCamX = sim.x + sim.vx * 12 + 180;
      const targetCamY = sim.y - 30;
      sim.cameraX += (targetCamX - sim.cameraX) * 0.08;
      sim.cameraY += (targetCamY - sim.cameraY) * 0.08;

      // -----------------------------------------------------------------------
      // 2. RENDERING CANVAS SCENE
      // -----------------------------------------------------------------------
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Sky Background Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGrad.addColorStop(0, stage.bgColorTop);
      skyGrad.addColorStop(1, stage.bgColorBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Parallax Distant Neon Sun / Cyber Horizon
      const sunX = CANVAS_WIDTH * 0.65 - (sim.cameraX * 0.03);
      const sunY = 160 - (sim.cameraY * 0.02);

      const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 90);
      sunGrad.addColorStop(0, '#ff007f');
      sunGrad.addColorStop(0.6, '#ff7700');
      sunGrad.addColorStop(1, 'rgba(255, 230, 0, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
      ctx.fill();

      // Parallax Cyber Mountains / Skyline
      ctx.save();
      const mountainOffset = -(sim.cameraX * 0.12) % 600;
      ctx.fillStyle = 'rgba(18, 5, 38, 0.6)';
      ctx.strokeStyle = stage.ambientLight;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-200, CANVAS_HEIGHT);
      for (let mx = -200; mx <= CANVAS_WIDTH + 400; mx += 150) {
        const my = 280 + Math.sin((mx - mountainOffset) * 0.01) * 60;
        ctx.lineTo(mx + mountainOffset, my);
      }
      ctx.lineTo(CANVAS_WIDTH + 400, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Apply World Camera Matrix
      ctx.save();
      ctx.translate(CANVAS_WIDTH * 0.35, CANVAS_HEIGHT * 0.55);
      ctx.scale(sim.cameraZoom, sim.cameraZoom);
      ctx.translate(-sim.cameraX, -sim.cameraY);

      // Render Rolling Foreground Terrain Polygon
      const startX = sim.cameraX - CANVAS_WIDTH * 0.6;
      const endX = sim.cameraX + CANVAS_WIDTH * 0.8;
      const step = 16;

      ctx.beginPath();
      ctx.moveTo(startX, CANVAS_HEIGHT + 1200);
      for (let tx = startX; tx <= endX; tx += step) {
        const ty = getGroundHeight(tx, stage);
        ctx.lineTo(tx, ty);
      }
      ctx.lineTo(endX, CANVAS_HEIGHT + 1200);
      ctx.closePath();

      const groundGrad = ctx.createLinearGradient(0, sim.cameraY - 200, 0, sim.cameraY + 600);
      groundGrad.addColorStop(0, stage.hillColor);
      groundGrad.addColorStop(0.4, '#080112');
      groundGrad.addColorStop(1, '#020005');
      ctx.fillStyle = groundGrad;
      ctx.fill();

      // Glowing Neon Surface Edge Line
      ctx.beginPath();
      for (let tx = startX; tx <= endX; tx += step) {
        const ty = getGroundHeight(tx, stage);
        if (tx === startX) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.strokeStyle = stage.neonEdgeColor;
      ctx.lineWidth = 4.5;
      ctx.shadowColor = stage.neonEdgeColor;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Milestone Neon Arches along the terrain (Every 250m = 2500px)
      for (let m = 2500; m <= endX + 1000; m += 2500) {
        if (m >= startX - 200) {
          const archY = getGroundHeight(m, stage);
          ctx.save();
          ctx.translate(m, archY);

          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 5;
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(-35, 0);
          ctx.lineTo(-35, -150);
          ctx.lineTo(35, -150);
          ctx.lineTo(35, 0);
          ctx.stroke();

          ctx.fillStyle = 'rgba(7, 11, 25, 0.9)';
          ctx.fillRect(-60, -175, 120, 30);
          ctx.strokeStyle = '#ff007f';
          ctx.lineWidth = 2;
          ctx.strokeRect(-60, -175, 120, 30);

          ctx.fillStyle = '#00f0ff';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${m / 10}m GATE`, 0, -155);

          ctx.restore();
        }
      }

      // Render Collectibles (Coins, Gems, Fuel, Nitro)
      sim.collectibles.forEach(item => {
        if (item.collected || item.x < startX - 50 || item.x > endX + 50) return;
        ctx.save();
        ctx.translate(item.x, item.y);
        item.pulsePhase += dt * 4;
        const bob = Math.sin(item.pulsePhase) * 4;

        if (item.type === 'coin') {
          ctx.shadowColor = '#ffe600';
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#ffe600';
          ctx.beginPath();
          ctx.arc(0, bob, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡', 0, bob + 4);
        } else if (item.type === 'gem') {
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#00f0ff';
          ctx.beginPath();
          ctx.moveTo(0, bob - 12);
          ctx.lineTo(10, bob);
          ctx.lineTo(0, bob + 12);
          ctx.lineTo(-10, bob);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💎', 0, bob + 3);
        } else if (item.type === 'fuel') {
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#052e16';
          ctx.strokeStyle = '#00ff88';
          ctx.lineWidth = 2;
          ctx.fillRect(-11, bob - 15, 22, 30);
          ctx.strokeRect(-11, bob - 15, 22, 30);
          ctx.fillStyle = '#00ff88';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🔋', 0, bob + 4);
        } else if (item.type === 'nitro') {
          ctx.shadowColor = '#ff007f';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#260416';
          ctx.strokeStyle = '#ff007f';
          ctx.lineWidth = 2;
          ctx.fillRect(-11, bob - 15, 22, 30);
          ctx.strokeRect(-11, bob - 15, 22, 30);
          ctx.fillStyle = '#ff007f';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🚀', 0, bob + 4);
        }
        ctx.restore();
      });

      // Render Particles
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          sim.particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Vehicle Chassis & Wheels
      ctx.save();
      ctx.translate(sim.x, sim.y);
      ctx.rotate(sim.angle);

      const bw = vehicle.bodyWidth;
      const bh = vehicle.bodyHeight;
      const rRad = vehicle.wheelRadius;
      const fRad = vehicle.wheelRadius;
      const halfB = vehicle.wheelBase * 0.5;

      // Suspension Struts
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-halfB + 8, -5);
      ctx.lineTo(-halfB, 18);
      ctx.moveTo(halfB - 8, -5);
      ctx.lineTo(halfB, 18);
      ctx.stroke();

      // Main Vehicle Body polygon
      ctx.fillStyle = vehicle.primaryColor;
      ctx.strokeStyle = vehicle.accentColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = vehicle.primaryColor;
      ctx.shadowBlur = 10;

      if (vehicle.type === 'bike') {
        ctx.beginPath();
        ctx.moveTo(-halfB, 12);
        ctx.lineTo(-10, -bh * 0.6);
        ctx.lineTo(20, -bh * 0.8);
        ctx.lineTo(halfB, 12);
        ctx.lineTo(10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-bw * 0.5, 12);
        ctx.lineTo(-bw * 0.55, -bh * 0.2);
        ctx.lineTo(-bw * 0.25, -bh * 0.35);
        ctx.lineTo(10, -bh * 0.85);
        ctx.lineTo(bw * 0.4, -bh * 0.8);
        ctx.lineTo(bw * 0.55, 6);
        ctx.lineTo(bw * 0.4, 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(7, 15, 35, 0.85)';
        ctx.beginPath();
        ctx.moveTo(-bw * 0.2, -bh * 0.3);
        ctx.lineTo(5, -bh * 0.75);
        ctx.lineTo(bw * 0.35, -bh * 0.7);
        ctx.lineTo(15, -bh * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Driver Helmet
      ctx.fillStyle = vehicle.accentColor;
      ctx.shadowColor = vehicle.accentColor;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, -bh * 0.65, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(2, -bh * 0.65 - 3, 6, 4);

      // Rear Wheel
      ctx.save();
      ctx.translate(-halfB, 18);
      ctx.rotate(sim.rearWheelSpin);
      ctx.fillStyle = '#090a14';
      ctx.strokeStyle = vehicle.primaryColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, rRad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = vehicle.accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-rRad + 2, 0);
      ctx.lineTo(rRad - 2, 0);
      ctx.moveTo(0, -rRad + 2);
      ctx.lineTo(0, rRad - 2);
      ctx.stroke();
      ctx.restore();

      // Front Wheel
      ctx.save();
      ctx.translate(halfB, 18);
      ctx.rotate(sim.frontWheelSpin);
      ctx.fillStyle = '#090a14';
      ctx.strokeStyle = vehicle.primaryColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, fRad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = vehicle.accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-fRad + 2, 0);
      ctx.lineTo(fRad - 2, 0);
      ctx.moveTo(0, -fRad + 2);
      ctx.lineTo(0, fRad - 2);
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // restore vehicle matrix
      ctx.restore(); // restore camera matrix

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, activeVehicle, activeStage, activeUpgrades, getGroundHeight, getGroundSlopeAngle, generateCollectibles]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopEngineAudio();
      if (stuntTimeoutRef.current) clearTimeout(stuntTimeoutRef.current);
    };
  }, []);

  return (
    <div className="w-full max-w-[1200px] mx-auto flex flex-col items-center select-none font-sans text-white">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & HUD BAR */}
      {/* ===================================================================== */}
      <div className="w-full flex items-center justify-between gap-1.5 px-2.5 sm:px-4 py-2 bg-slate-900/95 border border-slate-800 rounded-t-2xl">
        {/* Left: Distance & Best */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1 bg-slate-950 rounded-xl border border-cyan-500/40">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] text-slate-400 font-bold uppercase">Dist:</span>
            <span className="text-xs sm:text-base font-black text-white">{currentDistance}m</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-slate-950 rounded-xl border border-amber-500/30">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-slate-400 font-bold uppercase">Best:</span>
            <span className="text-xs sm:text-sm font-black text-amber-300">{highScores[selectedStageId] || 0}m</span>
          </div>
        </div>

        {/* Center: Stunt Banner */}
        {activeStuntText && (
          <div
            className="px-2.5 sm:px-4 py-0.5 sm:py-1 rounded-full bg-slate-950 border border-cyan-400/80 font-black text-[10px] sm:text-xs tracking-wide shadow animate-pulse truncate max-w-[150px] sm:max-w-none"
            style={{ color: activeStuntText.color }}
          >
            {activeStuntText.text}
          </div>
        )}

        {/* Right: Coins & Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-950 rounded-xl border border-amber-500/40 text-amber-300 font-black text-xs sm:text-sm">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            {coins}
          </div>

          <button
            onClick={() => {
              const nextMuted = sound.toggleMute();
              setIsMuted(nextMuted);
              if (nextMuted) stopEngineAudio();
              else initEngineAudio();
            }}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-400 text-slate-400 hover:text-white"
            title="Mute Sound"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />}
          </button>

          {gameState === 'playing' && (
            <button
              onClick={() => {
                sound.playClick();
                setGameState('paused');
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-400 text-slate-300 hover:text-white"
              title="Pause Race"
            >
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. MAIN GAME CANVAS & MODALS AREA */}
      {/* ===================================================================== */}
      <div className={`relative w-full h-[360px] sm:h-[440px] md:h-[500px] lg:h-[560px] bg-[#05030f] border-x border-slate-800 overflow-hidden ${
        gameState !== 'playing' ? 'rounded-b-2xl border-b' : ''
      }`}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-cover block"
        />

        {/* Minimal Speedometer (Top Left of Canvas during Play) */}
        {gameState === 'playing' && (
          <div className="absolute top-2.5 left-2.5 bg-slate-950/75 backdrop-blur-sm border border-cyan-500/30 rounded-xl px-2.5 py-1 flex items-center gap-1.5 pointer-events-none">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs sm:text-sm font-black text-cyan-300">{speedKmh}</span>
            <span className="text-[9px] text-slate-400 uppercase font-bold">km/h</span>
          </div>
        )}

        {/* Minimal Battery & Nitro (Top Right of Canvas during Play) */}
        {gameState === 'playing' && (
          <div className="absolute top-2.5 right-2.5 bg-slate-950/75 backdrop-blur-sm border border-slate-800 rounded-xl p-1.5 sm:p-2 w-36 sm:w-44 space-y-1 pointer-events-none">
            {/* Battery */}
            <div>
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-slate-300">
                <span className="flex items-center gap-0.5">
                  <BatteryCharging className={`w-3 h-3 ${currentFuel < 25 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`} />
                  BATTERY
                </span>
                <span className={currentFuel < 25 ? 'text-rose-400 font-black' : 'text-emerald-300'}>
                  {Math.max(0, Math.floor(currentFuel))}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    currentFuel < 25 ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, currentFuel))}%` }}
                />
              </div>
            </div>

            {/* Nitro */}
            <div>
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-slate-300">
                <span className="flex items-center gap-0.5">
                  <Flame className="w-3 h-3 text-cyan-400" />
                  NITRO
                </span>
                <span className="text-cyan-300">{Math.floor(currentNitro)}%</span>
              </div>
              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-pink-500"
                  style={{ width: `${Math.min(100, Math.max(0, currentNitro))}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* MAIN MENU MODAL (Perfect Mobile + Desktop Centered) */}
        {/* =================================================================== */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 text-center animate-fade-in z-20 overflow-y-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              2D Physics Cyber Offroad
            </div>

            <h1 className="text-xl sm:text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-500 tracking-tight uppercase mb-1.5">
              Cyber Neon Hill Climb
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-300 max-w-sm mb-3 sm:mb-4 leading-relaxed">
              Climb neon peaks, execute flips in air, grab batteries and tune your cyber buggy to conquer alien worlds!
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-4 text-[10px] sm:text-xs">
              <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 font-bold">
                <span className="text-slate-400">Car:</span> <span className="text-cyan-300">{activeVehicle.name}</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-purple-500/30 font-bold">
                <span className="text-slate-400">Stage:</span> <span className="text-purple-300">{activeStage.name}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full max-w-xs sm:max-w-md">
              <button
                onClick={startGame}
                className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 hover:opacity-95 active:scale-95 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                PLAY GAME
              </button>

              <div className="flex w-full sm:w-auto gap-2">
                <button
                  onClick={() => {
                    sound.playClick();
                    setGameState('garage');
                  }}
                  className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                  GARAGE
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setGameState('stageSelect');
                  }}
                  className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-purple-400 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  STAGES
                </button>
              </div>

              {/* Rewarded Video Ad Free Coins Trigger */}
              <button
                onClick={() => {
                  sound.playClick();
                  setRewardClaimDescription('Watch short video to earn +2,500 Cyber Energy Coins for garage upgrades!');
                  setShowRewardedModal(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/40 transition hover:scale-105 active:scale-95"
              >
                <Gift className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span>FREE COINS: +2,500 (WATCH AD)</span>
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* GARAGE MODAL */}
        {/* =================================================================== */}
        {gameState === 'garage' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col p-3 sm:p-5 z-30 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sound.playClick();
                    setGameState('menu');
                  }}
                  className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-sm sm:text-base font-black text-white">GARAGE & UPGRADES</h2>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300 font-bold text-xs">
                <Coins className="w-3 h-3 text-amber-400" />
                {coins}
              </div>
            </div>

            {/* Vehicles Carousel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {VEHICLES.map(v => {
                const isUnlocked = unlockedVehicles.includes(v.id);
                const isSelected = selectedVehicleId === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      if (isUnlocked) {
                        sound.playClick();
                        setSelectedVehicleId(v.id);
                      }
                    }}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-sm'
                        : isUnlocked
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-slate-950 border-slate-900 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] sm:text-xs font-black text-white mb-0.5 truncate">{v.name}</div>
                      <p className="text-[9px] text-slate-400 leading-tight mb-2 line-clamp-2">{v.description}</p>
                    </div>

                    {!isUnlocked ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlockVehicle(v);
                        }}
                        className="w-full py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center gap-0.5"
                      >
                        <Coins className="w-2.5 h-2.5" />
                        UNLOCK {v.price}
                      </button>
                    ) : (
                      <div className="text-[9px] text-cyan-400 font-bold">
                        {isSelected ? '✓ SELECTED' : 'SELECT'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Upgrade Tracks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {(['engine', 'suspension', 'tires', 'fuel'] as const).map((track) => {
                const lvl = activeUpgrades[track];
                const cost = Math.floor(60 * Math.pow(1.5, lvl));
                const names = {
                  engine: 'Engine Power',
                  suspension: 'Shock Absorber',
                  tires: 'Tire Grip',
                  fuel: 'Battery Capacity',
                };

                return (
                  <div key={track} className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-white uppercase">{names[track]}</div>
                      <div className="text-[9px] text-slate-400">Level {lvl} / 10</div>
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} className={`w-2 h-1.5 rounded-sm ${i < lvl ? 'bg-cyan-400' : 'bg-slate-800'}`} />
                        ))}
                      </div>
                    </div>

                    {lvl < 10 ? (
                      <button
                        onClick={() => handleBuyUpgrade(track)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 ${
                          coins >= cost ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        <Coins className="w-2.5 h-2.5" />
                        {cost}
                      </button>
                    ) : (
                      <span className="text-[10px] text-cyan-400 font-bold">MAX</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-auto flex justify-end">
              <button
                onClick={startGame}
                className="py-2 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 font-black text-xs flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                RACE NOW
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STAGES MODAL */}
        {/* =================================================================== */}
        {gameState === 'stageSelect' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col p-3 sm:p-5 z-30 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sound.playClick();
                    setGameState('menu');
                  }}
                  className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-sm sm:text-base font-black text-white">SELECT STAGE</h2>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300 font-bold text-xs">
                <Coins className="w-3 h-3 text-amber-400" />
                {coins}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              {STAGES.map(s => {
                const isUnlocked = unlockedStages.includes(s.id);
                const isSelected = selectedStageId === s.id;
                const record = highScores[s.id] || 0;

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      if (isUnlocked) {
                        sound.playClick();
                        setSelectedStageId(s.id);
                      }
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-400 shadow'
                        : isUnlocked
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-slate-950 border-slate-900 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black text-white mb-0.5">{s.name}</div>
                      <p className="text-[10px] text-slate-300 leading-tight mb-2">{s.description}</p>
                      <div className="text-[9px] text-slate-400">Record: <strong className="text-amber-400">{record}m</strong></div>
                    </div>

                    <div className="mt-2">
                      {!isUnlocked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlockStage(s);
                          }}
                          className="w-full py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center gap-1"
                        >
                          <Coins className="w-2.5 h-2.5" />
                          UNLOCK ({s.price})
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedStageId(s.id);
                            startGame();
                          }}
                          className="w-full py-1.5 rounded-lg bg-purple-500 text-white font-bold text-[10px]"
                        >
                          RACE THIS
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* GAME OVER MODAL */}
        {/* =================================================================== */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-fade-in z-30">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center mb-1.5">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>

            <h2 className="text-lg sm:text-2xl font-black text-white uppercase mb-1">
              {deathReason === 'fuel' ? 'BATTERY DEPLETED!' : 'VEHICLE CRASHED!'}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 mb-3">
              {deathReason === 'fuel' ? 'Energy depleted before reaching refuel station.' : 'Driver helmet impacted with ground.'}
            </p>

            <div className="grid grid-cols-3 gap-2 w-full max-w-xs bg-slate-900 border border-slate-800 rounded-xl p-2.5 mb-3.5">
              <div>
                <div className="text-[9px] text-slate-400 uppercase font-bold">Distance</div>
                <div className="text-base font-black text-cyan-300">{currentDistance}m</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase font-bold">Coins</div>
                <div className="text-base font-black text-amber-300">+{currentCoinsEarned}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase font-bold">Best</div>
                <div className="text-base font-black text-purple-300">{highScores[selectedStageId] || currentDistance}m</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs">
              {/* Watch Rewarded Ad for Bonus Coins Button */}
              <button
                onClick={() => {
                  sound.playClick();
                  setRewardClaimDescription('Watch short ad to double your race earnings and get +2,500 Cyber Coins!');
                  setShowRewardedModal(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/40 transition hover:scale-105 active:scale-95"
              >
                <Gift className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>WATCH AD: +2,500 BONUS COINS</span>
              </button>

              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={startGame}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 font-black text-xs shadow flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  RETRY
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setGameState('garage');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs"
                >
                  UPGRADE
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setGameState('menu');
                  }}
                  className="py-2.5 px-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs"
                >
                  MENU
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* PAUSE MODAL */}
        {/* =================================================================== */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fade-in z-30">
            <h2 className="text-xl font-black text-white mb-2">RACE PAUSED</h2>
            <div className="flex flex-col gap-2 w-40">
              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('playing');
                }}
                className="py-2 px-4 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs"
              >
                RESUME
              </button>
              <button
                onClick={startGame}
                className="py-2 px-4 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs"
              >
                RESTART
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('menu');
                }}
                className="py-2 px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 3. DEDICATED MOBILE-FRIENDLY CONTROLS (Rendered ONLY when Playing) */}
      {/* ===================================================================== */}
      {gameState === 'playing' && (
        <div className="w-full bg-slate-900/95 border-x border-b border-slate-800 rounded-b-2xl p-2 sm:p-3 flex flex-row items-center justify-between gap-2">
          {/* Left: Brake Button */}
          <button
            onMouseDown={() => (isBrakePressed.current = true)}
            onMouseUp={() => (isBrakePressed.current = false)}
            onTouchStart={(e) => {
              e.preventDefault();
              isBrakePressed.current = true;
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              isBrakePressed.current = false;
            }}
            className="flex-1 select-none active:scale-95 py-3 sm:py-3.5 px-3 sm:px-6 rounded-xl bg-gradient-to-b from-rose-600 to-rose-900 border border-rose-400/50 shadow text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:opacity-95"
          >
            <span>🛑 BRAKE</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-rose-950 text-rose-200 text-[10px] font-mono border border-rose-800">A / ⬅</kbd>
          </button>

          {/* Center: Nitro Button */}
          <button
            onMouseDown={() => (isNitroPressed.current = true)}
            onMouseUp={() => (isNitroPressed.current = false)}
            onTouchStart={(e) => {
              e.preventDefault();
              isNitroPressed.current = true;
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              isNitroPressed.current = false;
            }}
            className="select-none active:scale-95 py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl bg-gradient-to-b from-purple-600 to-indigo-950 border border-purple-400/50 shadow text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:opacity-95"
          >
            <Flame className="w-3.5 h-3.5 text-cyan-300" />
            <span>NITRO</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-purple-950 text-purple-200 text-[10px] font-mono border border-purple-800">SPACE</kbd>
          </button>

          {/* Right: Gas Button */}
          <button
            onMouseDown={() => (isGasPressed.current = true)}
            onMouseUp={() => (isGasPressed.current = false)}
            onTouchStart={(e) => {
              e.preventDefault();
              isGasPressed.current = true;
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              isGasPressed.current = false;
            }}
            className="flex-1 select-none active:scale-95 py-3 sm:py-3.5 px-3 sm:px-6 rounded-xl bg-gradient-to-b from-cyan-500 to-blue-900 border border-cyan-400/50 shadow text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:opacity-95"
          >
            <span>⚡ GAS</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-200 text-[10px] font-mono border border-cyan-800">D / ➔</kbd>
          </button>
        </div>
      )}
      {/* Rewarded Video Ad Modal */}
      <RewardAdModal
        isOpen={showRewardedModal}
        onClose={() => setShowRewardedModal(false)}
        rewardDescription={rewardClaimDescription}
        customRewardAmount={2500}
        onRewardGranted={(amount) => {
          setCoins((prev) => {
            const nextCoins = prev + amount;
            localStorage.setItem('cyber_hill_coins', nextCoins.toString());
            return nextCoins;
          });
        }}
      />

      {/* Interstitial Ad Modal */}
      <InterstitialAdModal
        isOpen={showInterstitialModal}
        onClose={() => setShowInterstitialModal(false)}
        title="POST-RACE INTERMISSION"
      />
    </div>
  );
};
