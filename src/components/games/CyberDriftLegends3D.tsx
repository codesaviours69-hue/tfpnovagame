import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Play, 
  Car, Gauge, Award, Flame, Compass, RefreshCw, Star, CheckCircle, ArrowRight,
  Flag, Palette, Sliders, ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// TYPES & DATA STRUCTURES
// ----------------------------------------------------

export interface DriftCar {
  id: string;
  name: string;
  nameGuj: string;
  price: number;
  unlocked: boolean;
  bodyColor: string;
  glowColor: string;
  smokeColor: string;
  power: number;         // Acceleration & Top Speed
  handling: number;      // Steering response & angle snap
  driftFactor: number;   // Slide slip friction & drift ease
  nitroCapacity: number; // Max nitro fuel
  previewEmoji: string;
  description: string;
}

export interface DriftTrack {
  id: number;
  name: string;
  nameGuj: string;
  theme: 'shibuya-neon' | 'harbor-docks' | 'mountain-pass' | 'quantum-oval' | 'magma-core';
  targetScore: number;   // Drift score for 3 stars
  timeLimit: number;     // In seconds
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme' | 'Insane';
  color: string;
  accentColor: string;
}

interface Point2D {
  x: number;
  y: number;
}

interface ClippingZone {
  id: number;
  x: number;
  y: number;
  radius: number;
  hit: boolean;
}

interface CoinPickup {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
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
  shape?: 'smoke' | 'spark';
}

const DEFAULT_CARS: DriftCar[] = [
  {
    id: 'spectre-r34',
    name: 'Spectre GT-R R34',
    nameGuj: 'સ્પેક્ટર GT-R R34',
    price: 0,
    unlocked: true,
    bodyColor: '#06b6d4',
    glowColor: '#22d3ee',
    smokeColor: '#a5f3fc',
    power: 78,
    handling: 82,
    driftFactor: 80,
    nitroCapacity: 100,
    previewEmoji: '🏎️',
    description: 'Iconic all-wheel-drive cyber drift legend with perfectly balanced counter-steering.',
  },
  {
    id: 'apex-rx7',
    name: 'Apex RX-7 Phoenix',
    nameGuj: 'એપેક્સ RX-7 રોટરી',
    price: 500,
    unlocked: false,
    bodyColor: '#f97316',
    glowColor: '#fb923c',
    smokeColor: '#fed7aa',
    power: 85,
    handling: 90,
    driftFactor: 92,
    nitroCapacity: 120,
    previewEmoji: '🟠',
    description: 'Lightweight rotary drift king engineered for ultra-deep angle transitions and fast recoveries.',
  },
  {
    id: 'valkyrie-supra',
    name: 'Valkyrie Supra 2JZ',
    nameGuj: 'વાલ્કીરી સુપ્રા 2JZ',
    price: 1200,
    unlocked: false,
    bodyColor: '#ec4899',
    glowColor: '#f472b6',
    smokeColor: '#fbcfe8',
    power: 94,
    handling: 84,
    driftFactor: 88,
    nitroCapacity: 140,
    previewEmoji: '🌸',
    description: '1000 HP twin-turbo brute with explosive power oversteer and blazing straightaway acceleration.',
  },
  {
    id: 'venom-countach',
    name: 'Venom Countach V12',
    nameGuj: 'વેનમ કાઉન્ટાચ V12',
    price: 2200,
    unlocked: false,
    bodyColor: '#a855f7',
    glowColor: '#c084fc',
    smokeColor: '#e9d5ff',
    power: 96,
    handling: 88,
    driftFactor: 94,
    nitroCapacity: 160,
    previewEmoji: '🟣',
    description: 'Aggressive wide-body hypercar with colossal rear downforce and massive drift point multiplier.',
  },
  {
    id: 'phantom-plaid',
    name: 'Phantom Cyber-Plaid',
    nameGuj: 'ફેન્ટમ સાયબર-પ્લેડ',
    price: 3600,
    unlocked: false,
    bodyColor: '#10b981',
    glowColor: '#34d399',
    smokeColor: '#a7f3d0',
    power: 99,
    handling: 95,
    driftFactor: 90,
    nitroCapacity: 180,
    previewEmoji: '⚡',
    description: 'Instant quad-motor electric torque with instant power delivery and high-speed drift control.',
  },
  {
    id: 'solaris-24k',
    name: 'Solaris Sovereign 24K',
    nameGuj: 'સોલારિસ સુપ્રીમ 24K ગોલ્ડ',
    price: 5000,
    unlocked: false,
    bodyColor: '#d97706',
    glowColor: '#fbbf24',
    smokeColor: '#fef08a',
    power: 100,
    handling: 100,
    driftFactor: 100,
    nitroCapacity: 220,
    previewEmoji: '👑',
    description: 'Pure 24K gold mirror chassis with supersonic plasma thrusters and 5x drift point multiplier!',
  },
];

const DRIFT_TRACKS: DriftTrack[] = [
  {
    id: 1,
    name: 'Shibuya Neon Circuit',
    nameGuj: 'શિબુયા નિયોન સર્કિટ',
    theme: 'shibuya-neon',
    targetScore: 2500,
    timeLimit: 55,
    difficulty: 'Easy',
    color: '#06b6d4',
    accentColor: '#3b82f6',
  },
  {
    id: 2,
    name: 'Cyber Harbor Docks',
    nameGuj: 'સાયબર હાર્બર ડોક્સ',
    theme: 'harbor-docks',
    targetScore: 4200,
    timeLimit: 65,
    difficulty: 'Medium',
    color: '#f97316',
    accentColor: '#ea580c',
  },
  {
    id: 3,
    name: 'Neo Akina Mountain Pass',
    nameGuj: 'નિયો અકિના માઉન્ટેન પાસ',
    theme: 'mountain-pass',
    targetScore: 6500,
    timeLimit: 75,
    difficulty: 'Hard',
    color: '#a855f7',
    accentColor: '#ec4899',
  },
  {
    id: 4,
    name: 'Quantum Hyperloop Oval',
    nameGuj: 'ક્વોન્ટમ હાયપરલૂપ સ્પીડવે',
    theme: 'quantum-oval',
    targetScore: 9000,
    timeLimit: 80,
    difficulty: 'Extreme',
    color: '#10b981',
    accentColor: '#06b6d4',
  },
  {
    id: 5,
    name: 'Magma Core Foundry',
    nameGuj: 'લાવા વોલ્કેનો રશ',
    theme: 'magma-core',
    targetScore: 12500,
    timeLimit: 90,
    difficulty: 'Insane',
    color: '#ef4444',
    accentColor: '#f59e0b',
  },
];

export const CyberDriftLegends3D: React.FC = () => {
  // ----------------------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------------------
  const [gameState, setGameState] = useState<'menu' | 'garage' | 'playing' | 'completed' | 'failed'>('menu');
  const [activeTrackId, setActiveTrackId] = useState<number>(1);

  // Persistence State
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_drift_coins') || '600', 10);
  });
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_drift_highscore') || '0', 10);
  });
  const [unlockedTracks, setUnlockedTracks] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('cyber_drift_tracks');
      return saved ? JSON.parse(saved) : [1];
    } catch {
      return [1];
    }
  });
  const [cars, setCars] = useState<DriftCar[]>(() => {
    const saved = localStorage.getItem('cyber_drift_cars');
    if (saved) {
      try {
        const parsed: DriftCar[] = JSON.parse(saved);
        return DEFAULT_CARS.map((def) => {
          const found = parsed.find((p) => p.id === def.id);
          return found ? { ...def, unlocked: found.unlocked } : def;
        });
      } catch {
        return DEFAULT_CARS;
      }
    }
    return DEFAULT_CARS;
  });
  const [selectedCarId, setSelectedCarId] = useState<string>(() => {
    return localStorage.getItem('cyber_drift_active_car') || 'spectre-r34';
  });

  // Sound State
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // HUD & Run Metrics
  const [score, setScore] = useState<number>(0);
  const [driftScore, setDriftScore] = useState<number>(0);
  const [driftCombo, setDriftCombo] = useState<number>(1);
  const [isDrifting, setIsDrifting] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [nitroFuel, setNitroFuel] = useState<number>(100);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [clippingHits, setClippingHits] = useState<number>(0);
  const [stuntToast, setStuntToast] = useState<{ text: string; bonus: number; key: number } | null>(null);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  const keysRef = useRef<{
    gas: boolean;
    brake: boolean;
    steerLeft: boolean;
    steerRight: boolean;
    handbrake: boolean;
    nitro: boolean;
  }>({
    gas: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    handbrake: false,
    nitro: false,
  });

  // ----------------------------------------------------
  // CAR DRIFT VEHICLE KINEMATICS
  // ----------------------------------------------------
  const carRef = useRef({
    // World coordinates
    x: 400,
    y: 600,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // Facing North
    angularVelocity: 0,
    speed: 0,
    
    // Drift state
    slipAngle: 0,
    isDrifting: false,
    currentDriftPoints: 0,
    driftMultiplier: 1.0,
    driftDuration: 0,
    
    nitro: 100,
    isNitroActive: false,

    // Smooth Camera Follow
    camX: 400,
    camY: 600,
  });

  // Track Layout & World Geometry
  const trackPathRef = useRef<Point2D[]>([]);
  const trackInnerBoundsRef = useRef<Point2D[]>([]);
  const trackOuterBoundsRef = useRef<Point2D[]>([]);
  const clippingZonesRef = useRef<ClippingZone[]>([]);
  const coinsRef = useRef<CoinPickup[]>([]);
  const skidMarksRef = useRef<SkidMark[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  const activeCar = cars.find((c) => c.id === selectedCarId) || cars[0];
  const activeTrack = DRIFT_TRACKS.find((t) => t.id === activeTrackId) || DRIFT_TRACKS[0];

  // ----------------------------------------------------
  // PERSISTENCE EFFECTS
  // ----------------------------------------------------
  useEffect(() => {
    localStorage.setItem('cyber_drift_coins', coins.toString());
  }, [coins]);

  useEffect(() => {
    localStorage.setItem('cyber_drift_highscore', highScore.toString());
  }, [highScore]);

  useEffect(() => {
    localStorage.setItem('cyber_drift_tracks', JSON.stringify(unlockedTracks));
  }, [unlockedTracks]);

  useEffect(() => {
    localStorage.setItem('cyber_drift_cars', JSON.stringify(cars));
  }, [cars]);

  useEffect(() => {
    localStorage.setItem('cyber_drift_active_car', selectedCarId);
  }, [selectedCarId]);

  // ----------------------------------------------------
  // KEYBOARD LISTENERS
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const k = e.key.toLowerCase();
      if (e.key === 'ArrowUp' || k === 'w') keysRef.current.gas = true;
      if (e.key === 'ArrowDown' || k === 's') keysRef.current.brake = true;
      if (e.key === 'ArrowLeft' || k === 'a') keysRef.current.steerLeft = true;
      if (e.key === 'ArrowRight' || k === 'd') keysRef.current.steerRight = true;
      if (e.key === ' ' || k === 'e') keysRef.current.handbrake = true;
      if (e.key === 'Shift' || k === 'f') keysRef.current.nitro = true;
      if (k === 'r') {
        initRace(activeTrackId);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === 'ArrowUp' || k === 'w') keysRef.current.gas = false;
      if (e.key === 'ArrowDown' || k === 's') keysRef.current.brake = false;
      if (e.key === 'ArrowLeft' || k === 'a') keysRef.current.steerLeft = false;
      if (e.key === 'ArrowRight' || k === 'd') keysRef.current.steerRight = false;
      if (e.key === ' ' || k === 'e') keysRef.current.handbrake = false;
      if (e.key === 'Shift' || k === 'f') keysRef.current.nitro = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTrackId]);

  // ----------------------------------------------------
  // PROCEDURAL SMOOTH DRIFT TRACK GENERATION
  // ----------------------------------------------------
  const generateTrack = (trackId: number) => {
    const waypoints: Point2D[] = [];
    const clips: ClippingZone[] = [];
    const coinList: CoinPickup[] = [];
    const trackWidth = 140; // Wide comfortable road for epic drifts

    if (trackId === 1) {
      // Shibuya Neon Circuit: Classic Figure-8 with smooth wide corners
      waypoints.push(
        { x: 400, y: 650 },
        { x: 750, y: 650 },
        { x: 1050, y: 550 },
        { x: 1150, y: 300 },
        { x: 950, y: 150 },
        { x: 600, y: 250 },
        { x: 300, y: 150 },
        { x: 100, y: 300 },
        { x: 150, y: 550 }
      );
    } else if (trackId === 2) {
      // Harbor Docks: Hairpins & dockyard chicane
      waypoints.push(
        { x: 350, y: 700 },
        { x: 900, y: 700 },
        { x: 1150, y: 500 },
        { x: 1000, y: 300 },
        { x: 1200, y: 150 },
        { x: 800, y: 120 },
        { x: 600, y: 350 },
        { x: 350, y: 180 },
        { x: 120, y: 350 },
        { x: 150, y: 600 }
      );
    } else if (trackId === 3) {
      // Neo Akina Mountain Pass: Switchback Touge Curves
      waypoints.push(
        { x: 300, y: 750 },
        { x: 850, y: 720 },
        { x: 1180, y: 600 },
        { x: 950, y: 450 },
        { x: 1250, y: 300 },
        { x: 900, y: 150 },
        { x: 500, y: 180 },
        { x: 200, y: 350 },
        { x: 450, y: 500 },
        { x: 150, y: 650 }
      );
    } else if (trackId === 4) {
      // Quantum Hyperloop Oval: High-Speed sweeping arcs
      waypoints.push(
        { x: 400, y: 700 },
        { x: 1000, y: 700 },
        { x: 1300, y: 500 },
        { x: 1300, y: 250 },
        { x: 1000, y: 100 },
        { x: 400, y: 100 },
        { x: 100, y: 250 },
        { x: 100, y: 500 }
      );
    } else {
      // Magma Core Speedway: Extreme Complex Gauntlet
      waypoints.push(
        { x: 350, y: 750 },
        { x: 850, y: 750 },
        { x: 1200, y: 600 },
        { x: 1050, y: 400 },
        { x: 1300, y: 250 },
        { x: 950, y: 100 },
        { x: 650, y: 250 },
        { x: 400, y: 120 },
        { x: 150, y: 250 },
        { x: 350, y: 450 },
        { x: 120, y: 650 }
      );
    }

    // Subdivide spline into high-density smooth polygon
    const smoothPoints: Point2D[] = [];
    const numPts = waypoints.length;
    for (let i = 0; i < numPts; i++) {
      const p0 = waypoints[(i - 1 + numPts) % numPts];
      const p1 = waypoints[i];
      const p2 = waypoints[(i + 1) % numPts];
      const p3 = waypoints[(i + 2) % numPts];

      // Catmull-Rom interpolation
      for (let t = 0; t < 1; t += 0.05) {
        const t2 = t * t;
        const t3 = t2 * t;

        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );
        const y = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );
        smoothPoints.push({ x, y });
      }

      // Add Apex Clipping Zone at sharp curves
      clips.push({
        id: i,
        x: p1.x,
        y: p1.y,
        radius: 45,
        hit: false,
      });

      // Add Golden Drift Coins
      coinList.push({
        id: i * 2,
        x: (p1.x + p2.x) * 0.5,
        y: (p1.y + p2.y) * 0.5,
        collected: false,
      });
    }

    trackPathRef.current = smoothPoints;
    clippingZonesRef.current = clips;
    coinsRef.current = coinList;
  };

  // ----------------------------------------------------
  // INIT RACE
  // ----------------------------------------------------
  const initRace = (trackId: number) => {
    generateTrack(trackId);

    const startP = trackPathRef.current[0] || { x: 400, y: 650 };
    const nextP = trackPathRef.current[5] || { x: 450, y: 650 };
    const initAngle = Math.atan2(nextP.y - startP.y, nextP.x - startP.x);

    carRef.current = {
      x: startP.x,
      y: startP.y,
      vx: 0,
      vy: 0,
      angle: initAngle,
      angularVelocity: 0,
      speed: 0,
      slipAngle: 0,
      isDrifting: false,
      currentDriftPoints: 0,
      driftMultiplier: 1.0,
      driftDuration: 0,
      nitro: activeCar.nitroCapacity,
      isNitroActive: false,
      camX: startP.x,
      camY: startP.y,
    };

    skidMarksRef.current = [];
    particlesRef.current = [];
    setScore(0);
    setDriftScore(0);
    setDriftCombo(1);
    setIsDrifting(false);
    setTimeRemaining(activeTrack.timeLimit);
    setNitroFuel(activeCar.nitroCapacity);
    setCurrentSpeed(0);
    setClippingHits(0);
    setStuntToast(null);

    sound.playPowerup();
    setGameState('playing');
  };

  // ----------------------------------------------------
  // GAME PHYSICS LOOP (2.5D DRIFT MECHANICS)
  // ----------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing') return;

    let animId: number;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      const dt = Math.min(rawDt, 0.033);

      const c = carRef.current;
      const keys = keysRef.current;
      const carStats = activeCar;

      // 1. COUNTDOWN TIMER
      setTimeRemaining((prev) => {
        const next = prev - dt;
        if (next <= 0) {
          handleTimeUp();
          return 0;
        }
        return next;
      });

      // 2. NITRO BOOST
      if (keys.nitro && c.nitro > 3) {
        c.isNitroActive = true;
        c.nitro = Math.max(0, c.nitro - dt * 28);
        sound.playNitroWhoosh();

        // Nitro flame particles from twin exhausts
        const rearDist = 24;
        const cosA = Math.cos(c.angle);
        const sinA = Math.sin(c.angle);
        const rx = c.x - cosA * rearDist;
        const ry = c.y - sinA * rearDist;

        particlesRef.current.push({
          x: rx + (Math.random() - 0.5) * 8,
          y: ry + (Math.random() - 0.5) * 8,
          vx: -cosA * (240 + Math.random() * 100) + (Math.random() - 0.5) * 30,
          vy: -sinA * (240 + Math.random() * 100) + (Math.random() - 0.5) * 30,
          size: Math.random() * 5 + 3,
          color: Math.random() < 0.6 ? '#00f0ff' : '#ec4899',
          alpha: 1,
          decay: 0.08,
          shape: 'spark',
        });
      } else {
        c.isNitroActive = false;
        c.nitro = Math.min(carStats.nitroCapacity, c.nitro + dt * 5); // Slow recharge
      }

      // 3. STEERING & YAW DYNAMICS
      const currentSpeedMag = Math.hypot(c.vx, c.vy);
      c.speed = currentSpeedMag;

      const steerSpeed = (carStats.handling / 80) * 3.4;
      let steerInput = 0;
      if (keys.steerLeft) steerInput -= 1;
      if (keys.steerRight) steerInput += 1;

      // Steering becomes responsive as speed builds
      const steerFactor = Math.min(1, currentSpeedMag / 80);
      c.angle += steerInput * steerSpeed * steerFactor * dt;

      // 4. ACCELERATION / BRAKE ENGINE FORCES
      const forwardX = Math.cos(c.angle);
      const forwardY = Math.sin(c.angle);

      const maxSpeed = (carStats.power / 75) * (c.isNitroActive ? 520 : 380);
      const accelForce = (carStats.power / 75) * (c.isNitroActive ? 850 : 520);

      if (keys.gas) {
        if (currentSpeedMag < maxSpeed) {
          c.vx += forwardX * accelForce * dt;
          c.vy += forwardY * accelForce * dt;
        }
      }

      if (keys.brake) {
        // Active braking
        c.vx *= 0.94;
        c.vy *= 0.94;
      }

      // 5. SLIP ANGLE & DRIFT PHYSICS RESOLUTION
      const velAngle = Math.atan2(c.vy, c.vx);
      let angleDiff = c.angle - velAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      c.slipAngle = angleDiff;

      // Handbrake or sharp steering initiates drift
      const isHandbrake = keys.handbrake;
      const isOversteering = Math.abs(c.slipAngle) > 0.35 && currentSpeedMag > 90;
      const driftingNow = (isHandbrake || isOversteering) && currentSpeedMag > 70;

      c.isDrifting = driftingNow;
      setIsDrifting(driftingNow);

      // Drift Lateral Grip vs Slide Friction
      const gripTraction = (carStats.driftFactor / 80) * (isHandbrake ? 0.88 : (driftingNow ? 0.94 : 0.982));

      // Separate velocity into Forward and Lateral components
      const forwardVel = c.vx * forwardX + c.vy * forwardY;
      const rightX = -forwardY;
      const rightY = forwardX;
      let lateralVel = c.vx * rightX + c.vy * rightY;

      // Lateral friction dampens sideways velocity based on grip
      lateralVel *= gripTraction;

      // Recompose velocity
      c.vx = forwardX * forwardVel + rightX * lateralVel;
      c.vy = forwardY * forwardVel + rightY * lateralVel;

      // Natural Rolling Resistance
      c.vx *= 0.992;
      c.vy *= 0.992;

      // Update Position
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // 6. DRIFT SCORING & COMBO CHAIN
      if (driftingNow) {
        c.driftDuration += dt;
        const driftIntensity = Math.min(2.5, Math.abs(c.slipAngle) * (currentSpeedMag / 150));
        const ptsThisFrame = Math.round(driftIntensity * 60 * dt * 10);
        c.currentDriftPoints += ptsThisFrame;

        // Combo multiplier climbs with sustained smooth drift
        if (c.driftDuration > 1.2) {
          c.driftMultiplier = Math.min(5.0, 1.0 + Math.floor(c.driftDuration / 1.0) * 0.5);
        }

        setDriftScore(c.currentDriftPoints);
        setDriftCombo(c.driftMultiplier);

        // Spawn dense tire smoke & skid marks from rear tires
        const rearOffset = 18;
        const sideOffset = 11;
        const cosA = Math.cos(c.angle);
        const sinA = Math.sin(c.angle);
        const cosPerp = -sinA;
        const sinPerp = cosA;

        const tire1X = c.x - forwardX * rearOffset + cosPerp * sideOffset;
        const tire1Y = c.y - forwardY * rearOffset + sinPerp * sideOffset;
        const tire2X = c.x - forwardX * rearOffset - cosPerp * sideOffset;
        const tire2Y = c.y - forwardY * rearOffset - sinPerp * sideOffset;

        // Skid marks
        if (Math.random() < 0.6) {
          skidMarksRef.current.push({
            x1: tire1X,
            y1: tire1Y,
            x2: tire1X + c.vx * dt,
            y2: tire1Y + c.vy * dt,
            alpha: 0.7,
          });
          skidMarksRef.current.push({
            x1: tire2X,
            y1: tire2Y,
            x2: tire2X + c.vx * dt,
            y2: tire2Y + c.vy * dt,
            alpha: 0.7,
          });
        }

        // Tire Smoke Particles
        if (Math.random() < 0.75) {
          particlesRef.current.push({
            x: Math.random() < 0.5 ? tire1X : tire2X,
            y: Math.random() < 0.5 ? tire1Y : tire2Y,
            vx: (Math.random() - 0.5) * 40 - c.vx * 0.15,
            vy: (Math.random() - 0.5) * 40 - c.vy * 0.15,
            size: Math.random() * 8 + 4,
            color: carStats.smokeColor,
            alpha: 0.8,
            decay: 0.04,
            shape: 'smoke',
          });
        }
      } else {
        // Drift ended - Bank the banked drift points into total score!
        if (c.currentDriftPoints > 0) {
          const finalEarned = Math.round(c.currentDriftPoints * c.driftMultiplier);
          setScore((prev) => {
            const nextScore = prev + finalEarned;
            if (nextScore >= activeTrack.targetScore) {
              handleTrackVictory(nextScore);
            }
            return nextScore;
          });

          if (finalEarned > 250) {
            sound.playFlipBonus();
            setStuntToast({
              text: `SICK DRIFT COMBO! +${finalEarned} PTS`,
              bonus: finalEarned,
              key: Date.now(),
            });
          }

          c.currentDriftPoints = 0;
          c.driftMultiplier = 1.0;
          c.driftDuration = 0;
          setDriftScore(0);
          setDriftCombo(1);
        }
      }

      // 7. APEX CLIPPING ZONES & COIN PICKUPS
      clippingZonesRef.current.forEach((clip) => {
        const dist = Math.hypot(c.x - clip.x, c.y - clip.y);
        if (dist < clip.radius + 30 && !clip.hit && driftingNow) {
          clip.hit = true;
          setClippingHits((prev) => prev + 1);
          setScore((prev) => prev + 400);
          setCoins((co) => co + 20);
          sound.playPowerup();
          setStuntToast({ text: 'APEX CLIPPING HIT! +400 🎯', bonus: 400, key: Date.now() });

          // Reset clip zone after 4 seconds
          setTimeout(() => {
            clip.hit = false;
          }, 4000);
        }
      });

      coinsRef.current.forEach((coin) => {
        if (coin.collected) return;
        const dist = Math.hypot(c.x - coin.x, c.y - coin.y);
        if (dist < 32) {
          coin.collected = true;
          setCoins((co) => co + 30);
          setScore((s) => s + 100);
          sound.playCollect();

          // Respawn coin after 6s
          setTimeout(() => {
            coin.collected = false;
          }, 6000);
        }
      });

      // 8. FADE SKID MARKS & PARTICLES
      skidMarksRef.current = skidMarksRef.current.filter((sm) => {
        sm.alpha -= 0.003;
        return sm.alpha > 0;
      });
      // Cap skid marks array size for performance
      if (skidMarksRef.current.length > 250) {
        skidMarksRef.current.splice(0, skidMarksRef.current.length - 250);
      }

      particlesRef.current = particlesRef.current.filter((pt) => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.alpha -= pt.decay;
        return pt.alpha > 0;
      });

      // 9. SMOOTH CAMERA LERP
      const targetCamX = c.x + c.vx * 0.25;
      const targetCamY = c.y + c.vy * 0.25;
      c.camX += (targetCamX - c.camX) * 0.1;
      c.camY += (targetCamY - c.camY) * 0.1;

      // 10. SYNC HUD METRICS
      setCurrentSpeed(Math.round(currentSpeedMag * 0.36));
      setNitroFuel(Math.round(c.nitro));

      // Render Stage Canvas
      renderDriftStage();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, activeCar, activeTrackId]);

  // ----------------------------------------------------
  // TRACK VICTORY & TIME UP
  // ----------------------------------------------------
  const handleTrackVictory = (finalTotal: number) => {
    sound.playFinishFanfare();
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
    });

    const cashPrize = 250 + activeTrackId * 150;
    setCoins((prev) => prev + cashPrize);

    if (activeTrackId < DRIFT_TRACKS.length) {
      setUnlockedTracks((prev) => {
        if (!prev.includes(activeTrackId + 1)) {
          return [...prev, activeTrackId + 1];
        }
        return prev;
      });
    }

    if (finalTotal > highScore) {
      setHighScore(finalTotal);
    }

    setGameState('completed');
  };

  const handleTimeUp = () => {
    if (score >= activeTrack.targetScore) {
      handleTrackVictory(score);
    } else {
      sound.playGameOver();
      setGameState('failed');
    }
  };

  // ----------------------------------------------------
  // 2.5D ISOMETRIC / TOP-DOWN CANVAS RENDERER
  // ----------------------------------------------------
  const renderDriftStage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const c = carRef.current;
    const carStats = activeCar;
    const track = activeTrack;

    // CAMERA TRANSLATION
    const camX = c.camX - width * 0.5;
    const camY = c.camY - height * 0.5;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // 1. CYBERPUNK AMBIENT BACKGROUND
    let bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (track.theme === 'shibuya-neon') {
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#0b1329');
      bgGrad.addColorStop(1, '#1e1b4b');
    } else if (track.theme === 'harbor-docks') {
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e293b');
      bgGrad.addColorStop(1, '#090d16');
    } else if (track.theme === 'mountain-pass') {
      bgGrad.addColorStop(0, '#1c1917');
      bgGrad.addColorStop(0.5, '#292524');
      bgGrad.addColorStop(1, '#0c0a09');
    } else if (track.theme === 'quantum-oval') {
      bgGrad.addColorStop(0, '#022c22');
      bgGrad.addColorStop(0.5, '#064e3b');
      bgGrad.addColorStop(1, '#020617');
    } else {
      // Magma Core
      bgGrad.addColorStop(0, '#380707');
      bgGrad.addColorStop(0.5, '#5c1212');
      bgGrad.addColorStop(1, '#7f1d1d');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Grid Floor
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    const startGX = -((camX) % gridSize);
    const startGY = -((camY) % gridSize);
    for (let x = startGX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = startGY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // 2. WORLD SPACE CAMERA
    ctx.save();
    ctx.translate(-camX, -camY);

    // 3. DRAW RACETRACK ASPHALT & NEON KERBS
    const pts = trackPathRef.current;
    if (pts.length > 2) {
      // Outer Glowing Asphalt Road
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 140;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Road Surface Center Line
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 130;
      ctx.stroke();

      // Left & Right Neon Road Barriers
      ctx.strokeStyle = track.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = track.color;
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Center Dashed Track Line
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 20]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // 4. DRAW SKID MARKS
    skidMarksRef.current.forEach((sm) => {
      ctx.strokeStyle = `rgba(15, 23, 42, ${sm.alpha})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(sm.x1, sm.y1);
      ctx.lineTo(sm.x2, sm.y2);
      ctx.stroke();
    });

    // 5. APEX CLIPPING ZONES
    clippingZonesRef.current.forEach((clip) => {
      ctx.save();
      ctx.translate(clip.x, clip.y);
      ctx.strokeStyle = clip.hit ? '#fbbf24' : track.accentColor;
      ctx.lineWidth = clip.hit ? 6 : 3.5;
      ctx.shadowColor = clip.hit ? '#fbbf24' : track.accentColor;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, clip.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = clip.hit ? 'rgba(251, 191, 36, 0.2)' : 'rgba(6, 182, 212, 0.1)';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'black 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('APEX CLIP', 0, 0);
      ctx.restore();
    });

    // 6. GOLDEN DRIFT COINS
    coinsRef.current.forEach((coin) => {
      if (coin.collected) return;
      ctx.save();
      ctx.translate(coin.x, coin.y);
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#78350f';
      ctx.font = 'black 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 1);
      ctx.restore();
    });

    // 7. PARTICLES (Tire Smoke, Nitro Sparks)
    particlesRef.current.forEach((pt) => {
      ctx.save();
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 8. DRAW 3D DRIFT CAR
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);

    const CAR_W = 46;
    const CAR_H = 24;

    // Headlight Beams illuminating forward asphalt
    ctx.save();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.16)';
    ctx.beginPath();
    ctx.moveTo(CAR_W * 0.5, -CAR_H * 0.35);
    ctx.lineTo(CAR_W * 0.5 + 240, -CAR_H * 1.6);
    ctx.lineTo(CAR_W * 0.5 + 240, CAR_H * 1.6);
    ctx.lineTo(CAR_W * 0.5, CAR_H * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Car Neon Underglow
    ctx.save();
    ctx.fillStyle = carStats.glowColor;
    ctx.shadowColor = carStats.glowColor;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.roundRect(-CAR_W * 0.5 - 4, -CAR_H * 0.5 - 4, CAR_W + 8, CAR_H + 8, 8);
    ctx.fill();
    ctx.restore();

    // Wheels (4 Tires)
    const renderTire = (wx: number, wy: number, steer: number) => {
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(steer);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-6, -3, 12, 6);
      ctx.restore();
    };

    const steerVisual = (keysRef.current.steerLeft ? -0.35 : keysRef.current.steerRight ? 0.35 : 0);
    renderTire(CAR_W * 0.35, -CAR_H * 0.5, steerVisual);
    renderTire(CAR_W * 0.35, CAR_H * 0.5, steerVisual);
    renderTire(-CAR_W * 0.35, -CAR_H * 0.5, 0);
    renderTire(-CAR_W * 0.35, CAR_H * 0.5, 0);

    // Car Main Body Chassis
    ctx.fillStyle = carStats.bodyColor;
    ctx.shadowColor = carStats.glowColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(-CAR_W * 0.5, -CAR_H * 0.5, CAR_W, CAR_H, 6);
    ctx.fill();

    // Windshield & Cockpit Roof
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-CAR_W * 0.2, -CAR_H * 0.36, CAR_W * 0.45, CAR_H * 0.72, 4);
    ctx.fill();

    // Tinted Glass Tint
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.fillRect(-CAR_W * 0.05, -CAR_H * 0.3, CAR_W * 0.2, CAR_H * 0.6);

    // Rear Spoiler / Wing
    ctx.fillStyle = '#020617';
    ctx.fillRect(-CAR_W * 0.55, -CAR_H * 0.45, 4, CAR_H * 0.9);

    // LED Taillights
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.fillRect(-CAR_W * 0.5 - 1, -CAR_H * 0.4, 2, 4);
    ctx.fillRect(-CAR_W * 0.5 - 1, CAR_H * 0.4 - 4, 2, 4);

    ctx.restore(); // Restore Car

    ctx.restore(); // Restore World Camera
    ctx.restore(); // Restore Canvas
  };

  // ----------------------------------------------------
  // BUY / SELECT CAR
  // ----------------------------------------------------
  const handleBuyCar = (carItem: DriftCar) => {
    if (coins >= carItem.price) {
      setCoins((prev) => prev - carItem.price);
      setCars((prev) =>
        prev.map((c) => (c.id === carItem.id ? { ...c, unlocked: true } : c))
      );
      setSelectedCarId(carItem.id);
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
            <Car className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-wide flex items-center gap-2">
              CYBER DRIFT LEGENDS 3D
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                PRO EDITION
              </span>
            </h2>
            <p className="text-xs text-slate-400">ટોક્યો નાઈટ ડ્રિફ્ટિંગ • Precision Drift Physics</p>
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
          width={880}
          height={500}
          className="w-full h-full object-contain"
        />

        {/* ------------------------------------------------ */}
        {/* PLAYING HUD OVERLAY */}
        {/* ------------------------------------------------ */}
        {gameState === 'playing' && (
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
            {/* TOP BAR STATS */}
            <div className="flex items-start justify-between">
              {/* SPEED & TRACK */}
              <div className="flex items-center gap-3 bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/80 shadow-lg pointer-events-auto">
                <Gauge className="w-6 h-6 text-cyan-400" />
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white tracking-tighter">
                      {currentSpeed}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">KM/H</span>
                  </div>
                  <div className="text-[10px] font-bold text-cyan-400">
                    STAGE {activeTrack.id}: {activeTrack.name.split(' ')[0]}
                  </div>
                </div>
              </div>

              {/* CURRENT ACTIVE DRIFT SCORE COMBO BADGE */}
              {isDrifting && (
                <div className="animate-pulse flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-600 to-fuchsia-600 text-white font-black text-base shadow-2xl border border-amber-300">
                  <Flame className="w-5 h-5 fill-white animate-bounce" />
                  <span>DRIFT: {driftScore} x{driftCombo.toFixed(1)}</span>
                </div>
              )}

              {/* STUNT TOAST NOTIFICATION */}
              {stuntToast && !isDrifting && (
                <div
                  key={stuntToast.key}
                  className="animate-bounce flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 text-white font-black text-xs sm:text-sm shadow-xl border border-cyan-300"
                >
                  <Award className="w-4 h-4 fill-white" />
                  <span>{stuntToast.text}</span>
                </div>
              )}

              {/* TOTAL SCORE & TIME LEFT */}
              <div className="flex flex-col items-end gap-1.5">
                <div className="bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700 text-right">
                  <div className="text-[10px] font-bold text-slate-400">TOTAL SCORE</div>
                  <div className="text-xl font-black text-white">
                    {score.toLocaleString()} / <span className="text-cyan-400">{activeTrack.targetScore}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-lg border text-xs font-black ${
                    timeRemaining < 15
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                      : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  }`}>
                    ⏱️ {Math.ceil(timeRemaining)}s
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                    🎯 {clippingHits} Clips
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM HUD: NITRO GAUGE & TOUCH CONTROLS */}
            <div className="space-y-3">
              {/* NITRO GAUGE */}
              <div className="flex items-center gap-3 bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/80 max-w-xs shadow-lg">
                <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-1">
                    <span>NITRO BOOST (SHIFT)</span>
                    <span>{nitroFuel}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all"
                      style={{ width: `${nitroFuel}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* MOBILE TOUCH CONTROLS */}
              <div className="flex items-end justify-between pointer-events-auto sm:hidden pt-2 gap-2 select-none touch-none">
                {/* Steer Left / Right */}
                <div className="flex gap-1.5">
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      keysRef.current.steerLeft = true;
                    }}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      keysRef.current.steerLeft = false;
                    }}
                    onPointerLeave={() => {
                      keysRef.current.steerLeft = false;
                    }}
                    className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-400 font-black text-lg flex items-center justify-center shadow-lg active:bg-cyan-500 active:text-slate-950 active:scale-95 transition-transform"
                  >
                    ◀
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      keysRef.current.steerRight = true;
                    }}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      keysRef.current.steerRight = false;
                    }}
                    onPointerLeave={() => {
                      keysRef.current.steerRight = false;
                    }}
                    className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-400 font-black text-lg flex items-center justify-center shadow-lg active:bg-cyan-500 active:text-slate-950 active:scale-95 transition-transform"
                  >
                    ▶
                  </button>
                </div>

                {/* Handbrake, Nitro, Brake, Gas */}
                <div className="flex items-center gap-1.5">
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      keysRef.current.handbrake = true;
                    }}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      keysRef.current.handbrake = false;
                    }}
                    onPointerLeave={() => {
                      keysRef.current.handbrake = false;
                    }}
                    className="px-2.5 h-12 rounded-xl bg-amber-500/30 border border-amber-400 text-amber-300 text-[10px] font-black flex items-center justify-center shadow-lg active:bg-amber-500 active:text-slate-950 active:scale-95 transition-transform"
                  >
                    DRIFT
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      keysRef.current.nitro = true;
                    }}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      keysRef.current.nitro = false;
                    }}
                    onPointerLeave={() => {
                      keysRef.current.nitro = false;
                    }}
                    className="w-11 h-12 rounded-xl bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-sm font-black flex items-center justify-center shadow-lg active:bg-cyan-500 active:text-slate-950 active:scale-95 transition-transform"
                  >
                    🚀
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      keysRef.current.brake = true;
                      sound.playTireScreech();
                    }}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      keysRef.current.brake = false;
                    }}
                    onPointerLeave={() => {
                      keysRef.current.brake = false;
                    }}
                    className="w-11 h-12 rounded-xl bg-rose-900/80 border border-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                  >
                    BRK
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      keysRef.current.gas = true;
                    }}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      keysRef.current.gas = false;
                    }}
                    onPointerLeave={() => {
                      keysRef.current.gas = false;
                    }}
                    className="w-13 h-12 rounded-xl bg-emerald-600 border border-emerald-400 text-white text-xs font-black flex items-center justify-center shadow-lg active:bg-emerald-500 active:scale-95 transition-transform"
                  >
                    GAS
                  </button>
                </div>
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
              <Car className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                CYBER DRIFT LEGENDS 3D
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md">
                Master precision powerslides, hit apex clipping zones, trigger continuous combo chains, and rule the Tokyo midnight streets!
              </p>
            </div>

            {/* TRACK SELECT PREVIEWS */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full max-w-2xl">
              {DRIFT_TRACKS.map((tr) => {
                const isUnlocked = unlockedTracks.includes(tr.id);
                const isCurrent = activeTrackId === tr.id;
                return (
                  <button
                    key={tr.id}
                    disabled={!isUnlocked}
                    onClick={() => setActiveTrackId(tr.id)}
                    className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      isCurrent
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/20 text-white'
                        : isUnlocked
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-950/80 border-slate-900 text-slate-600 opacity-60'
                    }`}
                  >
                    <div className="text-xs font-black mb-0.5">TRACK {tr.id}</div>
                    <div className="text-[11px] font-bold text-slate-200 truncate">{tr.name}</div>
                    <div className="text-[9px] text-slate-400">{tr.targetScore} PTS</div>
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
                <Car className="w-4 h-4 text-cyan-400" />
                <span>GARAGE ({activeCar.name.split(' ')[0]})</span>
              </button>

              <button
                onClick={() => initRace(activeTrackId)}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-black text-sm flex items-center gap-2 shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>START DRIFT EVENT</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* GARAGE SCREEN */}
        {/* ------------------------------------------------ */}
        {gameState === 'garage' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 z-20 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-black text-white">DRIFT CAR GARAGE (ગેરેજ)</h2>
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

            {/* CAR ROSTER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {cars.map((car) => {
                const isSelected = selectedCarId === car.id;
                return (
                  <div
                    key={car.id}
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
                          style={{ backgroundColor: car.bodyColor }}
                        >
                          {car.previewEmoji}
                        </div>
                        <div>
                          <div className="text-sm font-black text-white">{car.name}</div>
                          <div className="text-[11px] text-cyan-400 font-bold">{car.nameGuj}</div>
                        </div>
                      </div>

                      {car.unlocked ? (
                        isSelected ? (
                          <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                            EQUIPPED
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedCarId(car.id)}
                            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700"
                          >
                            SELECT
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleBuyCar(car)}
                          disabled={coins < car.price}
                          className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 ${
                            coins >= car.price
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>${car.price}</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mb-3">{car.description}</p>

                    {/* STATS */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>POWER (એક્સિલરેશન & સ્પીડ)</span>
                        <span>{car.power}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full"
                          style={{ width: `${car.power}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>HANDLING (સ્ટીયરીંગ કંટ્રોલ)</span>
                        <span>{car.handling}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-fuchsia-400 rounded-full"
                          style={{ width: `${car.handling}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>DRIFT EASE (સ્લિપ એંગલ)</span>
                        <span>{car.driftFactor}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${car.driftFactor}%` }}
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
        {/* TIME UP / FAILED SCREEN */}
        {/* ------------------------------------------------ */}
        {gameState === 'failed' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-3xl shadow-xl shadow-rose-500/20">
              ⏱️
            </div>
            <div>
              <h2 className="text-2xl font-black text-rose-500">TIME EXPIRED!</h2>
              <p className="text-xs text-slate-400 mt-1">
                સમય પૂરો થઈ ગયો! ટાર્ગેટ સ્કોર મેળવવા માટે ડ્રિફ્ટ કોમ્બો જાળવી રાખો.
              </p>
            </div>

            <div className="bg-slate-900 px-6 py-3 rounded-2xl border border-slate-800 flex items-center gap-6 text-center">
              <div>
                <div className="text-[10px] font-bold text-slate-400">SCORE</div>
                <div className="text-lg font-black text-white">{score.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400">TARGET</div>
                <div className="text-lg font-black text-cyan-400">{activeTrack.targetScore.toLocaleString()}</div>
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
                onClick={() => initRace(activeTrackId)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white text-xs font-black flex items-center gap-1.5 shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>TRY AGAIN (R)</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* VICTORY COMPLETED SCREEN */}
        {/* ------------------------------------------------ */}
        {gameState === 'completed' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20 animate-bounce">
              🏆
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">DRIFT MASTER VICTORY!</h2>
              <p className="text-xs text-slate-400 mt-1">
                અભિનંદન! તમે ટાર્ગેટ ડ્રિફ્ટ સ્કોર સફળતાપૂર્વક પૂર્ણ કર્યો છે!
              </p>
            </div>

            <div className="bg-slate-900 px-6 py-3.5 rounded-2xl border border-slate-800 grid grid-cols-2 gap-4 text-center max-w-sm w-full">
              <div>
                <div className="text-[10px] font-bold text-slate-400">APEX CLIPS</div>
                <div className="text-base font-black text-amber-400">{clippingHits}</div>
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
              {activeTrackId < DRIFT_TRACKS.length ? (
                <button
                  onClick={() => {
                    setActiveTrackId(activeTrackId + 1);
                    initRace(activeTrackId + 1);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg"
                >
                  <span>NEXT CIRCUIT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => initRace(activeTrackId)}
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
          <span>🎮 <b>W / ↑</b> : Gas (એક્સિલરેટર)</span>
          <span><b>S / ↓</b> : Brake (બ્રેક)</span>
          <span><b>A / D or ← / →</b> : Steer (સ્ટીયરીંગ)</span>
          <span><b>Space / E</b> : Handbrake Drift (હેન્ડબ્રેક ડ્રિફ્ટ)</span>
          <span><b>Shift / F</b> : Nitro Boost (નાઈટ્રો)</span>
          <span><b>R</b> : Instant Restart (રીસ્ટાર્ટ)</span>
        </div>
        <div className="flex items-center gap-1 text-cyan-400 font-bold">
          <span>Sustained Drifts = x5 Multiplier Combo!</span>
        </div>
      </div>
    </div>
  );
};
