import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Play, 
  ChevronRight, Car, Gauge, Fuel, Award, Flame, Eye, Compass, CloudRain, Sun, Moon
} from 'lucide-react';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// TYPES & CONFIG
// ----------------------------------------------------

export type GameMode = 'one-way' | 'two-way' | 'time-attack' | 'speed-bomb';
export type EnvironmentType = 'neon-city' | 'sunset' | 'cyber-rain';
export type CameraView = 'chase' | 'low' | 'hood';

interface CarModel {
  id: string;
  name: string;
  nameGuj: string;
  price: number;
  unlocked: boolean;
  color: string;
  glowColor: string;
  accentColor: string;
  topSpeed: number; // Base max speed in km/h
  acceleration: number; // Accel rate
  handling: number; // Steer speed
  braking: number;
  nitroCap: number; // Max nitro boost
  previewEmoji: string;
  description: string;
}

interface TrafficCar {
  id: number;
  x: number; // -1.5 (far left lane) to 1.5 (far right lane)
  z: number; // Distance in meters ahead (0 to 1200)
  speed: number; // Speed in km/h
  lane: number; // 0, 1, 2, 3
  type: 'sedan' | 'truck' | 'suv' | 'sports' | 'taxi';
  color: string;
  glowColor: string;
  width: number;
  length: number;
  isOncoming: boolean;
  targetLane: number;
  laneChangeTimer: number;
  isBraking: boolean;
  passedPlayer: boolean;
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

interface SpeedStreak {
  x: number;
  y: number;
  len: number;
  speed: number;
  color: string;
}

const DEFAULT_CARS: CarModel[] = [
  {
    id: 'apex-gt',
    name: 'Apex Cyber GT',
    nameGuj: 'એપેક્સ સાયબર GT',
    price: 0,
    unlocked: true,
    color: '#0284c7',
    glowColor: '#38bdf8',
    accentColor: '#ef4444',
    topSpeed: 210,
    acceleration: 65,
    handling: 70,
    braking: 60,
    nitroCap: 100,
    previewEmoji: '🏎️',
    description: 'Balanced cyber street racer with responsive rack-and-pinion steering.',
  },
  {
    id: 'phantom-v12',
    name: 'Phantom V12 Neon',
    nameGuj: 'ફેન્ટમ V12 નિયોન',
    price: 600,
    unlocked: false,
    color: '#701a75',
    glowColor: '#ec4899',
    accentColor: '#a855f7',
    topSpeed: 245,
    acceleration: 78,
    handling: 80,
    braking: 75,
    nitroCap: 120,
    previewEmoji: '🟣',
    description: 'Twin-turbo V12 engine tuned for razor-sharp overtakes and high-speed drift.',
  },
  {
    id: 'viper-gtr',
    name: 'Viper GT-R Cyber',
    nameGuj: 'વાઇપર GT-R સાયબર',
    price: 1400,
    unlocked: false,
    color: '#059669',
    glowColor: '#10b981',
    accentColor: '#fbbf24',
    topSpeed: 280,
    acceleration: 88,
    handling: 88,
    braking: 85,
    nitroCap: 140,
    previewEmoji: '🟢',
    description: 'Aerodynamic downforce carbon chassis built for near-miss highway weaving.',
  },
  {
    id: 'thunder-hyperx',
    name: 'Thunder Hyper-X',
    nameGuj: 'થંડર હાઇપર-X',
    price: 2600,
    unlocked: false,
    color: '#ea580c',
    glowColor: '#f97316',
    accentColor: '#00f0ff',
    topSpeed: 320,
    acceleration: 95,
    handling: 92,
    braking: 90,
    nitroCap: 160,
    previewEmoji: '⚡',
    description: 'Quad-motor electric hypercar delivering explosive 0-200 km/h acceleration.',
  },
  {
    id: 'solaris-chiron',
    name: 'Solaris 24K Chiron',
    nameGuj: 'સોલારિસ ગોલ્ડન ચિરોન',
    price: 4500,
    unlocked: false,
    color: '#d97706',
    glowColor: '#fbbf24',
    accentColor: '#ffffff',
    topSpeed: 360,
    acceleration: 100,
    handling: 98,
    braking: 95,
    nitroCap: 200,
    previewEmoji: '👑',
    description: 'Gilded 24K sovereign hypercar with supersonic nitro thrust and instant braking.',
  },
];

export const CyberHighwayRacer3D: React.FC = () => {
  // ----------------------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------------------
  const [gameState, setGameState] = useState<'menu' | 'garage' | 'playing' | 'gameover'>('menu');
  const [mode, setMode] = useState<GameMode>('one-way');
  const [env, setEnv] = useState<EnvironmentType>('neon-city');
  const [camera, setCamera] = useState<CameraView>('chase');

  // Garage & Storage State
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_racer_coins') || '500', 10);
  });
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_racer_highscore') || '0', 10);
  });
  const [cars, setCars] = useState<CarModel[]>(() => {
    const saved = localStorage.getItem('cyber_racer_cars');
    if (saved) {
      try {
        const parsed: CarModel[] = JSON.parse(saved);
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
    return localStorage.getItem('cyber_racer_active_car') || 'apex-gt';
  });

  // Sound State
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // HUD & Run metrics
  const [score, setScore] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [nitroFuel, setNitroFuel] = useState<number>(100);
  const [nearMissCount, setNearMissCount] = useState<number>(0);
  const [earnedCoins, setEarnedCoins] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [bombHealth, setBombHealth] = useState<number>(100);
  const [nearMissToast, setNearMissToast] = useState<{ text: string; bonus: number; key: number } | null>(null);

  // Canvas & Game Loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Input states
  const keysRef = useRef<{
    left: boolean;
    right: boolean;
    gas: boolean;
    brake: boolean;
    nitro: boolean;
    horn: boolean;
  }>({
    left: false,
    right: false,
    gas: false,
    brake: false,
    nitro: false,
    horn: false,
  });

  // Player Vehicle Physics Ref
  const playerRef = useRef({
    x: 0, // -1.6 (left curb) to 1.6 (right curb)
    targetX: 0,
    speed: 0, // in km/h
    targetSpeed: 0,
    distance: 0, // meters traveled
    nitro: 100,
    isNitroActive: false,
    steerAngle: 0,
    crashed: false,
    headlightsOn: true,
    score: 0,
    nearMisses: 0,
    coinsCollected: 0,
    timeAttackTimer: 60,
    bombHealth: 100,
  });

  // Highway & Traffic Simulation Refs
  const trafficRef = useRef<TrafficCar[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const speedStreaksRef = useRef<SpeedStreak[]>([]);
  const roadOffsetRef = useRef<number>(0);
  const nextCarSpawnDistRef = useRef<number>(0);

  const activeCar = cars.find((c) => c.id === selectedCarId) || cars[0];

  // ----------------------------------------------------
  // PERSISTENCE
  // ----------------------------------------------------
  useEffect(() => {
    localStorage.setItem('cyber_racer_coins', coins.toString());
  }, [coins]);

  useEffect(() => {
    localStorage.setItem('cyber_racer_highscore', highScore.toString());
  }, [highScore]);

  useEffect(() => {
    localStorage.setItem('cyber_racer_cars', JSON.stringify(cars));
  }, [cars]);

  useEffect(() => {
    localStorage.setItem('cyber_racer_active_car', selectedCarId);
  }, [selectedCarId]);

  // ----------------------------------------------------
  // INPUT LISTENERS
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keysRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') keysRef.current.gas = true;
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        keysRef.current.brake = true;
        sound.playTireScreech();
      }
      if (e.key === ' ' || e.key === 'Shift') {
        keysRef.current.nitro = true;
      }
      if (e.key.toLowerCase() === 'h') {
        keysRef.current.horn = true;
        sound.playCarHonk();
      }
      if (e.key.toLowerCase() === 'c') {
        // Switch Camera
        setCamera((prev) => (prev === 'chase' ? 'low' : prev === 'low' ? 'hood' : 'chase'));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keysRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') keysRef.current.gas = false;
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') keysRef.current.brake = false;
      if (e.key === ' ' || e.key === 'Shift') keysRef.current.nitro = false;
      if (e.key.toLowerCase() === 'h') keysRef.current.horn = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ----------------------------------------------------
  // TRAFFIC SPAWNER & 3D PERSPECTIVE HELPERS
  // ----------------------------------------------------
  const LANE_POSITIONS = [-1.15, -0.38, 0.38, 1.15]; // 4 Highway lanes

  const spawnTrafficCar = (minZ = 500, maxZ = 900) => {
    const laneIndex = Math.floor(Math.random() * 4);
    const isOncoming = mode === 'two-way' && laneIndex < 2; // Left 2 lanes are oncoming in two-way mode

    const types: ('sedan' | 'truck' | 'suv' | 'sports' | 'taxi')[] = [
      'sedan', 'truck', 'suv', 'sports', 'taxi'
    ];
    const type = types[Math.floor(Math.random() * types.length)];

    const colors = [
      '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f8fafc'
    ];
    const color = type === 'taxi' ? '#eab308' : colors[Math.floor(Math.random() * colors.length)];

    let baseSpeed = 80 + Math.random() * 40;
    if (type === 'truck') baseSpeed = 65 + Math.random() * 20;
    if (type === 'sports') baseSpeed = 120 + Math.random() * 50;

    trafficRef.current.push({
      id: Math.random(),
      x: LANE_POSITIONS[laneIndex],
      z: minZ + Math.random() * (maxZ - minZ),
      speed: baseSpeed,
      lane: laneIndex,
      type,
      color,
      glowColor: color,
      width: type === 'truck' ? 1.05 : 0.85,
      length: type === 'truck' ? 3.2 : 1.8,
      isOncoming,
      targetLane: laneIndex,
      laneChangeTimer: 5 + Math.random() * 10,
      isBraking: false,
      passedPlayer: false,
    });
  };

  const initGame = () => {
    playerRef.current = {
      x: 0,
      targetX: 0,
      speed: 0,
      targetSpeed: 0,
      distance: 0,
      nitro: activeCar.nitroCap,
      isNitroActive: false,
      steerAngle: 0,
      crashed: false,
      headlightsOn: true,
      score: 0,
      nearMisses: 0,
      coinsCollected: 0,
      timeAttackTimer: mode === 'time-attack' ? 45 : 60,
      bombHealth: 100,
    };

    trafficRef.current = [];
    particlesRef.current = [];
    speedStreaksRef.current = [];
    roadOffsetRef.current = 0;
    nextCarSpawnDistRef.current = 0;

    // Pre-populate highway with 6-8 cars ahead
    for (let i = 0; i < 8; i++) {
      spawnTrafficCar(100 + i * 90, 160 + i * 90);
    }

    setScore(0);
    setDistance(0);
    setCurrentSpeed(0);
    setNitroFuel(activeCar.nitroCap);
    setNearMissCount(0);
    setEarnedCoins(0);
    setTimeRemaining(mode === 'time-attack' ? 45 : 60);
    setBombHealth(100);
    setNearMissToast(null);

    sound.playPowerup();
    setGameState('playing');
  };

  // ----------------------------------------------------
  // MAIN GAME LOOP (PHYSICS & RENDERING)
  // ----------------------------------------------------
  useEffect(() => {
    if (gameState !== 'playing') return;

    let animFrameId: number;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      const p = playerRef.current;
      const keys = keysRef.current;
      const car = activeCar;

      if (!p.crashed) {
        // 1. NITRO LOGIC
        if (keys.nitro && p.nitro > 5 && p.speed > 40) {
          p.isNitroActive = true;
          p.nitro = Math.max(0, p.nitro - dt * 25);
        } else {
          p.isNitroActive = false;
          // Slowly recharge nitro
          p.nitro = Math.min(car.nitroCap, p.nitro + dt * 6);
        }

        // 2. ACCELERATION & BRAKING PHYSICS
        const maxTopSpeed = p.isNitroActive ? car.topSpeed * 1.25 : car.topSpeed;
        const accelRate = (car.acceleration * (p.isNitroActive ? 2.2 : 1.0)) * 1.5;
        const brakeRate = car.braking * 3.5;

        if (keys.gas) {
          p.speed = Math.min(maxTopSpeed, p.speed + accelRate * dt);
        } else if (keys.brake) {
          p.speed = Math.max(0, p.speed - brakeRate * dt);
        } else {
          // Coasting drag
          p.speed = Math.max(0, p.speed - 25 * dt);
        }

        // Auto-idle low creep if game starts
        if (p.speed < 15 && !keys.brake) {
          p.speed += 12 * dt;
        }

        // 3. STEERING & LATERAL PHYSICS
        const steerSpeed = (car.handling / 100) * 2.8 * (p.speed > 20 ? 1 : p.speed / 20);
        let targetSteer = 0;

        if (keys.left) {
          p.x = Math.max(-1.55, p.x - steerSpeed * dt);
          targetSteer = -0.15;
        } else if (keys.right) {
          p.x = Math.min(1.55, p.x + steerSpeed * dt);
          targetSteer = 0.15;
        }

        // Smooth steer banking
        p.steerAngle += (targetSteer - p.steerAngle) * 0.15;

        // 4. DISTANCE & SCORING
        const metersPerSec = (p.speed * 1000) / 3600;
        p.distance += metersPerSec * dt;
        roadOffsetRef.current = (roadOffsetRef.current + metersPerSec * dt * 0.08) % 1;

        // Base score increases with distance & speed
        const speedMultiplier = p.speed > 100 ? (p.speed / 100) : 1;
        const oncomingMultiplier = (mode === 'two-way' && p.x < 0) ? 2.2 : 1;
        p.score += Math.round(metersPerSec * dt * 1.5 * speedMultiplier * oncomingMultiplier);

        // 5. GAME MODE TIMERS
        if (mode === 'time-attack') {
          p.timeAttackTimer -= dt;
          if (p.timeAttackTimer <= 0) {
            handleGameOver('Time Expired! (સમય પૂરો)');
          }
        } else if (mode === 'speed-bomb') {
          if (p.speed < 85) {
            p.bombHealth -= dt * 35;
            if (p.bombHealth <= 0) {
              handleGameOver('Speed Dropped Below 85 km/h! Bomb Detonated! (બોમ્બ વિસ્ફોટ)');
            }
          } else {
            p.bombHealth = Math.min(100, p.bombHealth + dt * 15);
          }
        }

        // 6. TRAFFIC SIMULATION & COLLISION
        const activeTraffic: TrafficCar[] = [];

        trafficRef.current.forEach((t) => {
          // Calculate relative speed
          const relativeSpeedKmh = t.isOncoming ? (p.speed + t.speed) : (p.speed - t.speed);
          const relativeMps = (relativeSpeedKmh * 1000) / 3600;
          t.z -= relativeMps * dt;

          // AI Lane Changing
          t.laneChangeTimer -= dt;
          if (t.laneChangeTimer <= 0 && !t.isOncoming) {
            t.laneChangeTimer = 6 + Math.random() * 8;
            const shift = Math.random() < 0.5 ? -1 : 1;
            const newLane = Math.max(mode === 'two-way' ? 2 : 0, Math.min(3, t.lane + shift));
            t.targetLane = newLane;
          }

          // Smooth lane shifting
          const targetX = LANE_POSITIONS[t.targetLane];
          t.x += (targetX - t.x) * 0.05;

          // Check Near-Miss
          if (!t.passedPlayer && t.z < 8 && t.z > -8) {
            const latDist = Math.abs(p.x - t.x);
            if (latDist > 0.45 && latDist < 0.95 && p.speed > 90) {
              // Valid Near-Miss Overtake!
              t.passedPlayer = true;
              p.nearMisses += 1;
              const bonusCash = (mode === 'two-way' && t.isOncoming) ? 100 : 50;
              p.coinsCollected += bonusCash;
              p.score += bonusCash * 15;

              sound.playNearMiss();
              setNearMissToast({
                text: t.isOncoming ? 'DANGEROUS ONCOMING MISS!' : 'CLOSE OVERTAKE!',
                bonus: bonusCash,
                key: Date.now(),
              });
            }
          }

          // Collision Detection Box
          const collisionZ = t.z < 5 && t.z > -5;
          const collisionX = Math.abs(p.x - t.x) < 0.42;

          if (collisionZ && collisionX && !p.crashed) {
            // CRASH!
            p.crashed = true;
            sound.playExplosion();

            // Spawn explosive sparks & smoke
            for (let i = 0; i < 40; i++) {
              particlesRef.current.push({
                x: 0,
                y: 0,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                size: Math.random() * 8 + 4,
                color: i % 2 === 0 ? '#ef4444' : '#fbbf24',
                alpha: 1,
                decay: 0.02 + Math.random() * 0.03,
              });
            }

            setTimeout(() => {
              handleGameOver('Fatal Crash! (અકસ્માત)');
            }, 900);
          }

          // Keep car if within visible horizon range (-30 to 1000 meters)
          if (t.z > -40 && t.z < 1100) {
            activeTraffic.push(t);
          }
        });

        trafficRef.current = activeTraffic;

        // Auto-spawn cars ahead to maintain highway density
        if (trafficRef.current.length < 8) {
          spawnTrafficCar(600, 1000);
        }

        // Nitro exhaust speed particles
        if (p.isNitroActive && Math.random() < 0.7) {
          speedStreaksRef.current.push({
            x: (Math.random() - 0.5) * 600,
            y: (Math.random() - 0.5) * 400,
            len: Math.random() * 80 + 40,
            speed: p.speed * 0.08,
            color: '#00f0ff',
          });
        }
      }

      // Update particle effects
      particlesRef.current = particlesRef.current.filter((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= pt.decay;
        return pt.alpha > 0;
      });

      // Update speed streaks
      speedStreaksRef.current = speedStreaksRef.current.filter((st) => {
        st.y += st.speed;
        return st.y < 500;
      });

      // Sync React HUD state
      setCurrentSpeed(Math.round(p.speed));
      setDistance(Math.round(p.distance));
      setScore(p.score);
      setNitroFuel(Math.round(p.nitro));
      setNearMissCount(p.nearMisses);
      setEarnedCoins(p.coinsCollected + Math.floor(p.distance / 100));
      setTimeRemaining(Math.max(0, Math.ceil(p.timeAttackTimer)));
      setBombHealth(Math.max(0, Math.round(p.bombHealth)));

      // Render 3D Canvas
      render3DHighway();

      animFrameId = requestAnimationFrame(gameLoop);
    };

    animFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animFrameId);
  }, [gameState, mode, env, camera]);

  const handleGameOver = (reason: string) => {
    const p = playerRef.current;
    sound.playGameOver();

    const totalCashEarned = p.coinsCollected + Math.floor(p.distance / 100);
    setCoins((prev) => prev + totalCashEarned);

    if (p.score > highScore) {
      setHighScore(p.score);
    }

    setGameState('gameover');
  };

  // ----------------------------------------------------
  // 3D PERSPECTIVE RENDERING ENGINE
  // ----------------------------------------------------
  const render3DHighway = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const horizonY = height * 0.42;
    const p = playerRef.current;
    const car = activeCar;

    // 1. SKY & HORIZON GRADIENT
    let skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    if (env === 'neon-city') {
      skyGrad.addColorStop(0, '#030712');
      skyGrad.addColorStop(0.7, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b');
    } else if (env === 'sunset') {
      skyGrad.addColorStop(0, '#431407');
      skyGrad.addColorStop(0.5, '#9a3412');
      skyGrad.addColorStop(1, '#ea580c');
    } else {
      // Rain Storm
      skyGrad.addColorStop(0, '#020617');
      skyGrad.addColorStop(0.8, '#0f172a');
      skyGrad.addColorStop(1, '#1e293b');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizonY);

    // 2. CYBER CITY SKYLINE & MOUNTAINS
    ctx.save();
    if (env === 'neon-city' || env === 'cyber-rain') {
      // Distant glowing skyscrapers
      const buildingCount = 18;
      const bWidth = width / buildingCount;
      for (let i = 0; i < buildingCount; i++) {
        const bHeight = 40 + Math.sin(i * 1.7) * 35 + (i % 3) * 20;
        const bx = i * bWidth - (p.x * 20) % bWidth;
        const by = horizonY - bHeight;

        ctx.fillStyle = '#090d16';
        ctx.fillRect(bx, by, bWidth - 4, bHeight);

        // Windows
        ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.3)' : 'rgba(236, 72, 153, 0.3)';
        for (let wy = by + 6; wy < horizonY - 6; wy += 8) {
          ctx.fillRect(bx + 4, wy, bWidth - 12, 3);
        }
      }
    } else if (env === 'sunset') {
      // Golden Sun
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#ea580c';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(width * 0.5 - p.x * 30, horizonY - 20, 42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. GROUND / HIGHWAY SURFACE
    let groundGrad = ctx.createLinearGradient(0, horizonY, 0, height);
    groundGrad.addColorStop(0, '#090d16');
    groundGrad.addColorStop(1, '#020408');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // 4. PERSPECTIVE ROAD PROJECTOR
    // Projects 3D Highway coordinates (x: -2 to 2, z: 0 to 800) to 2D Canvas pixels
    const project = (x3d: number, z3d: number) => {
      const cameraZ = 20;
      const fov = 320;
      const scale = fov / (z3d + cameraZ);
      const camY = camera === 'low' ? 35 : camera === 'hood' ? 20 : 50;

      const screenX = width * 0.5 + (x3d - p.x) * width * 0.48 * scale;
      const screenY = horizonY + camY * scale * 4.5;
      return { x: screenX, y: screenY, scale };
    };

    // Draw Highway Road Segments from Horizon to Foreground
    const SEGMENTS = 30;
    const roadWidth = 2.4;

    for (let i = SEGMENTS - 1; i >= 0; i--) {
      const z1 = i * 22;
      const z2 = (i + 1) * 22;

      const p1Left = project(-roadWidth, z1);
      const p1Right = project(roadWidth, z1);
      const p2Left = project(-roadWidth, z2);
      const p2Right = project(roadWidth, z2);

      // Asphalt base
      const segmentColor = (i + Math.floor(roadOffsetRef.current * 10)) % 2 === 0 ? '#111827' : '#0f172a';
      ctx.fillStyle = segmentColor;
      ctx.beginPath();
      ctx.moveTo(p1Left.x, p1Left.y);
      ctx.lineTo(p1Right.x, p1Right.y);
      ctx.lineTo(p2Right.x, p2Right.y);
      ctx.lineTo(p2Left.x, p2Left.y);
      ctx.closePath();
      ctx.fill();

      // Guardrails / Glowing Road Borders
      const railGlow = env === 'sunset' ? '#f97316' : '#00f0ff';
      ctx.strokeStyle = railGlow;
      ctx.lineWidth = Math.max(1, 4 * p1Left.scale);
      ctx.beginPath();
      ctx.moveTo(p1Left.x, p1Left.y);
      ctx.lineTo(p2Left.x, p2Left.y);
      ctx.moveTo(p1Right.x, p1Right.y);
      ctx.lineTo(p2Right.x, p2Right.y);
      ctx.stroke();

      // 4 Lane Dividers
      [-0.75, 0, 0.75].forEach((laneX, idx) => {
        const lp1 = project(laneX, z1);
        const lp2 = project(laneX, z2);

        const isDashed = (i + Math.floor(roadOffsetRef.current * 10)) % 2 === 0;
        if (isDashed) {
          // Yellow double line for middle in two-way mode
          if (idx === 1 && mode === 'two-way') {
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = Math.max(1.5, 3.5 * lp1.scale);
          } else {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, 2.5 * lp1.scale);
          }
          ctx.beginPath();
          ctx.moveTo(lp1.x, lp1.y);
          ctx.lineTo(lp2.x, lp2.y);
          ctx.stroke();
        }
      });
    }

    // 5. RENDER TRAFFIC CARS IN 3D DEPTH ORDER
    const sortedTraffic = [...trafficRef.current].sort((a, b) => b.z - a.z);

    sortedTraffic.forEach((t) => {
      if (t.z < 2 || t.z > 800) return;

      const p3 = project(t.x, t.z);
      const carW = 65 * p3.scale;
      const carH = 34 * p3.scale;

      ctx.save();
      ctx.translate(p3.x, p3.y);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 0, carW * 0.6, carH * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Vehicle Chassis
      ctx.shadowColor = t.glowColor;
      ctx.shadowBlur = 8 * p3.scale;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.roundRect(-carW * 0.5, -carH, carW, carH, 4 * p3.scale);
      ctx.fill();

      // Roof / Cabin
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-carW * 0.38, -carH * 1.55, carW * 0.76, carH * 0.65, 3 * p3.scale);
      ctx.fill();

      // Windshield & Rear Window
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.fillRect(-carW * 0.32, -carH * 1.45, carW * 0.64, carH * 0.45);

      // Tail lights or Headlights based on Oncoming
      if (t.isOncoming) {
        // Glowing White/Yellow Headlights
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12 * p3.scale;
        ctx.fillRect(-carW * 0.42, -carH * 0.6, carW * 0.22, carH * 0.25);
        ctx.fillRect(carW * 0.2, -carH * 0.6, carW * 0.22, carH * 0.25);
      } else {
        // Red Tail lights
        ctx.fillStyle = t.isBraking ? '#ef4444' : '#dc2626';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = (t.isBraking ? 16 : 8) * p3.scale;
        ctx.fillRect(-carW * 0.44, -carH * 0.6, carW * 0.22, carH * 0.22);
        ctx.fillRect(carW * 0.22, -carH * 0.6, carW * 0.22, carH * 0.22);
      }

      ctx.restore();
    });

    // 6. RENDER PLAYER SUPERCAR (FOREGROUND)
    if (!p.crashed && camera !== 'hood') {
      const player3D = project(p.x, 0);
      const pScale = 1.0;
      const pWidth = 110 * pScale;
      const pHeight = 54 * pScale;

      ctx.save();
      ctx.translate(player3D.x, height * 0.86);
      ctx.rotate(p.steerAngle);

      // A. Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.ellipse(0, 10, pWidth * 0.65, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // B. Underglow Neon
      ctx.shadowColor = car.glowColor;
      ctx.shadowBlur = p.isNitroActive ? 30 : 16;
      ctx.fillStyle = car.glowColor;
      ctx.fillRect(-pWidth * 0.4, 2, pWidth * 0.8, 4);

      // C. Rear Diffuser & Exhaust Thrusters
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-pWidth * 0.46, -10, pWidth * 0.92, 18);

      // Dual Exhaust Flames (Nitro)
      if (p.isNitroActive || p.speed > 160) {
        const flamePulse = (Math.sin(Date.now() * 0.05) + 1) * 8;
        const nitroGrad = ctx.createLinearGradient(0, 0, 0, 30);
        nitroGrad.addColorStop(0, '#ffffff');
        nitroGrad.addColorStop(0.3, '#00f0ff');
        nitroGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = nitroGrad;

        [-pWidth * 0.28, pWidth * 0.28].forEach((exX) => {
          ctx.beginPath();
          ctx.moveTo(exX - 6, 4);
          ctx.lineTo(exX + 6, 4);
          ctx.lineTo(exX, 24 + flamePulse);
          ctx.closePath();
          ctx.fill();
        });
      }

      // D. Main Supercar Body Chassis
      ctx.shadowColor = car.glowColor;
      ctx.shadowBlur = 14;
      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.roundRect(-pWidth * 0.5, -pHeight, pWidth, pHeight, 10);
      ctx.fill();

      // E. Carbon Fiber Aerodynamic Spoiler Wing
      ctx.fillStyle = '#020617';
      ctx.fillRect(-pWidth * 0.48, -pHeight - 8, pWidth * 0.96, 6);
      // Spoiler Struts
      ctx.fillRect(-pWidth * 0.32, -pHeight - 2, 4, 8);
      ctx.fillRect(pWidth * 0.32 - 4, -pHeight - 2, 4, 8);

      // F. Sleek Cabin & Rear Tinted Glass
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.roundRect(-pWidth * 0.38, -pHeight * 1.55, pWidth * 0.76, pHeight * 0.65, 6);
      ctx.fill();

      // Rear Glass Reflection
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.fillRect(-pWidth * 0.32, -pHeight * 1.45, pWidth * 0.64, pHeight * 0.4);

      // G. Racing Center Stripe
      ctx.fillStyle = car.accentColor;
      ctx.fillRect(-4, -pHeight * 1.55, 8, pHeight * 1.5);

      // H. Neon LED Rear Tail Light Bar
      const isBraking = keysRef.current.brake;
      ctx.fillStyle = isBraking ? '#ef4444' : '#dc2626';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = isBraking ? 25 : 12;
      ctx.fillRect(-pWidth * 0.44, -pHeight * 0.45, pWidth * 0.88, 6);

      // Wide Cyber Racing Wheels
      ctx.fillStyle = '#020617';
      ctx.fillRect(-pWidth * 0.54, -14, 12, 22);
      ctx.fillRect(pWidth * 0.54 - 12, -14, 12, 22);

      ctx.restore();
    }

    // 7. PARTICLES & SPEED WARP LINES
    speedStreaksRef.current.forEach((st) => {
      ctx.strokeStyle = st.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width * 0.5 + st.x, height * 0.5 + st.y);
      ctx.lineTo(width * 0.5 + st.x, height * 0.5 + st.y + st.len);
      ctx.stroke();
    });

    particlesRef.current.forEach((pt) => {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      ctx.beginPath();
      ctx.arc(width * 0.5 + pt.x, height * 0.6 + pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // 8. RAIN EFFECT (IF CYBER RAIN ENV)
    if (env === 'cyber-rain') {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      for (let r = 0; r < 25; r++) {
        const rx = Math.random() * width;
        const ry = Math.random() * height;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 4, ry + 16);
        ctx.stroke();
      }
    }
  };

  // ----------------------------------------------------
  // CAR PURCHASE / UNLOCK
  // ----------------------------------------------------
  const handleBuyCar = (carItem: CarModel) => {
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
  // RENDER COMPONENT JSX
  // ----------------------------------------------------
  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl font-sans select-none">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Car className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-wide flex items-center gap-2">
              CYBER HIGHWAY RACER 3D
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                PRO 3D
              </span>
            </h2>
            <p className="text-xs text-slate-400">હાઇવે ટ્રાફિક રેસિંગ સિમ્યુલેટર • Near-Miss Rush</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* COINS PILL */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black shadow-inner">
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
          width={800}
          height={480}
          className="w-full h-full object-contain"
        />

        {/* ------------------------------------------------ */}
        {/* HUD OVERLAYS WHEN PLAYING */}
        {/* ------------------------------------------------ */}
        {gameState === 'playing' && (
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
            {/* TOP HUD STATS */}
            <div className="flex items-start justify-between">
              {/* SPEEDOMETER & GEAR */}
              <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/80 shadow-lg pointer-events-auto">
                <Gauge className="w-6 h-6 text-sky-400" />
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white tracking-tighter">
                      {currentSpeed}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">KM/H</span>
                  </div>
                  <div className="text-[10px] font-bold text-sky-400">
                    GEAR {currentSpeed > 260 ? '6' : currentSpeed > 200 ? '5' : currentSpeed > 140 ? '4' : currentSpeed > 80 ? '3' : currentSpeed > 30 ? '2' : '1'}
                  </div>
                </div>
              </div>

              {/* NEAR-MISS COMBO TOAST NOTIFICATION */}
              {nearMissToast && (
                <div
                  key={nearMissToast.key}
                  className="animate-bounce flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-sm shadow-xl border border-amber-300"
                >
                  <Flame className="w-4 h-4 fill-white" />
                  <span>{nearMissToast.text} +${nearMissToast.bonus}</span>
                </div>
              )}

              {/* DISTANCE & SCORE */}
              <div className="flex flex-col items-end gap-1.5">
                <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700 text-right">
                  <div className="text-[10px] font-bold text-slate-400">SCORE</div>
                  <div className="text-lg font-black text-white">{score.toLocaleString()}</div>
                </div>

                <div className="flex items-center gap-2">
                  {mode === 'time-attack' && (
                    <div className="px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black">
                      ⏱️ {timeRemaining}s
                    </div>
                  )}
                  {mode === 'speed-bomb' && (
                    <div className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-black">
                      💣 BOMB: {bombHealth}%
                    </div>
                  )}
                  <div className="px-3 py-1 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-bold">
                    📍 {distance}m
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM HUD: NITRO BAR & MOBILE CONTROLS */}
            <div className="space-y-3">
              {/* NITRO GAUGE */}
              <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/80 max-w-xs shadow-lg">
                <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-1">
                    <span>NITRO BOOST</span>
                    <span>{nitroFuel}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-400 shadow-sm transition-all"
                      style={{ width: `${nitroFuel}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* TACTILE ON-SCREEN TOUCH CONTROLS FOR MOBILE */}
              {/* Mobile Touch Navigation Controls */}
              <div className="flex items-end justify-between pointer-events-auto sm:hidden pt-2 gap-2 select-none touch-none">
                {/* Left / Right Steering */}
                <div className="flex gap-1.5">
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      keysRef.current.left = true;
                    }}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      keysRef.current.left = false;
                    }}
                    onPointerLeave={() => {
                      keysRef.current.left = false;
                    }}
                    className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700 text-sky-400 font-black text-xl active:bg-sky-500 active:text-slate-950 active:scale-95 shadow-lg flex items-center justify-center transition-transform"
                  >
                    ◀
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      keysRef.current.right = true;
                    }}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      keysRef.current.right = false;
                    }}
                    onPointerLeave={() => {
                      keysRef.current.right = false;
                    }}
                    className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700 text-sky-400 font-black text-xl active:bg-sky-500 active:text-slate-950 active:scale-95 shadow-lg flex items-center justify-center transition-transform"
                  >
                    ▶
                  </button>
                </div>

                {/* Horn, Nitro, Brake, Gas */}
                <div className="flex items-center gap-1.5">
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      keysRef.current.horn = true;
                      sound.playCarHonk();
                    }}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      keysRef.current.horn = false;
                    }}
                    onPointerLeave={() => {
                      keysRef.current.horn = false;
                    }}
                    className="w-11 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-bold flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                  >
                    📢
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
                    className="w-11 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-sm font-black flex items-center justify-center shadow-lg active:bg-cyan-500 active:text-slate-950 active:scale-95 transition-transform"
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
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-2xl shadow-sky-500/30 border border-white/20">
              <Car className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                CYBER HIGHWAY RACER 3D
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md">
                Weave through dense highway traffic at 300+ km/h. Overtake close for Near-Miss bonuses!
              </p>
            </div>

            {/* GAME MODE SELECTION */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-lg">
              {[
                { id: 'one-way', title: 'One-Way', sub: 'એક-તરફી', icon: '🛣️' },
                { id: 'two-way', title: 'Two-Way 2x', sub: 'સામસામે ટ્રાફિક', icon: '⚡' },
                { id: 'time-attack', title: 'Time Attack', sub: 'સમય પડકાર', icon: '⏱️' },
                { id: 'speed-bomb', title: 'Speed Bomb', sub: 'બોમ્બ ચેલેન્જ', icon: '💣' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as GameMode)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    mode === m.id
                      ? 'bg-sky-500/20 border-sky-400 shadow-md shadow-sky-500/20 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-base mb-1">{m.icon}</div>
                  <div className="text-xs font-bold">{m.title}</div>
                  <div className="text-[10px] text-slate-500">{m.sub}</div>
                </button>
              ))}
            </div>

            {/* ENVIRONMENT SELECTION */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Environment:</span>
              {[
                { id: 'neon-city', label: 'Neon City 🌃' },
                { id: 'sunset', label: 'Sunset 🌅' },
                { id: 'cyber-rain', label: 'Rain Storm 🌧️' },
              ].map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => setEnv(ev.id as EnvironmentType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    env === ev.id
                      ? 'bg-sky-600 border-sky-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {ev.label}
                </button>
              ))}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setGameState('garage')}
                className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-sm font-bold flex items-center gap-2 transition-all"
              >
                <Car className="w-4 h-4 text-sky-400" />
                <span>GARAGE ({activeCar.name.split(' ')[0]})</span>
              </button>

              <button
                onClick={initGame}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-sm flex items-center gap-2 shadow-xl shadow-sky-500/25 transition-all transform hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>START RACE</span>
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
                <Car className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-black text-white">SUPERCAR GARAGE (ગેરેજ)</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 fill-amber-400" />
                  <span>${coins.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => setGameState('menu')}
                  className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                >
                  DONE
                </button>
              </div>
            </div>

            {/* CAR ROSTER LIST */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {cars.map((c) => {
                const isSelected = selectedCarId === c.id;
                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-400 shadow-md shadow-sky-500/20'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md border border-white/20"
                          style={{ backgroundColor: c.color }}
                        >
                          {c.previewEmoji}
                        </div>
                        <div>
                          <div className="text-sm font-black text-white">{c.name}</div>
                          <div className="text-[11px] text-sky-400 font-bold">{c.nameGuj}</div>
                        </div>
                      </div>

                      {c.unlocked ? (
                        isSelected ? (
                          <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-black">
                            SELECTED
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedCarId(c.id)}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700"
                          >
                            SELECT
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleBuyCar(c)}
                          className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 shadow-md ${
                            coins >= c.price
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 fill-current" />
                          <span>${c.price}</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 mb-3">{c.description}</p>

                    {/* SPECS BARS */}
                    <div className="space-y-1.5 text-[10px] font-bold text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>TOP SPEED: {c.topSpeed} KM/H</span>
                        <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-sky-400"
                            style={{ width: `${(c.topSpeed / 360) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>ACCELERATION: {c.acceleration}%</span>
                        <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-emerald-400" style={{ width: `${c.acceleration}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>HANDLING: {c.handling}%</span>
                        <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-indigo-400" style={{ width: `${c.handling}%` }} />
                        </div>
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
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-2xl">
              💥
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tight">RACE FINISHED!</h2>
              <p className="text-xs text-rose-400 font-bold">અકસ્માત / રન પૂર્ણ</p>
            </div>

            {/* RESULTS METRICS CARD */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-md bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
              <div className="text-center p-2 rounded-xl bg-slate-800/50">
                <div className="text-[10px] font-bold text-slate-400">TOTAL SCORE</div>
                <div className="text-base font-black text-white">{score.toLocaleString()}</div>
              </div>
              <div className="text-center p-2 rounded-xl bg-slate-800/50">
                <div className="text-[10px] font-bold text-slate-400">DISTANCE</div>
                <div className="text-base font-black text-sky-400">{distance}m</div>
              </div>
              <div className="text-center p-2 rounded-xl bg-slate-800/50">
                <div className="text-[10px] font-bold text-slate-400">NEAR MISSES</div>
                <div className="text-base font-black text-amber-400">{nearMissCount}</div>
              </div>
              <div className="text-center p-2 rounded-xl bg-slate-800/50">
                <div className="text-[10px] font-bold text-slate-400">CASH EARNED</div>
                <div className="text-base font-black text-emerald-400">+${earnedCoins}</div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setGameState('menu')}
                className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold transition-all"
              >
                MAIN MENU
              </button>
              <button
                onClick={initGame}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-2 shadow-xl shadow-sky-500/25 transition-all transform hover:scale-105 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RACE AGAIN</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER DESKTOP CONTROLS CHEATSHEET */}
      <div className="px-5 py-3 bg-slate-900/60 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span><strong className="text-slate-200">A / D or ◀ ▶:</strong> Steer</span>
          <span><strong className="text-slate-200">W or ▲:</strong> Gas (Accelerate)</span>
          <span><strong className="text-slate-200">S or ▼:</strong> Brake</span>
          <span><strong className="text-slate-200">SPACE / SHIFT:</strong> Nitro Boost</span>
          <span><strong className="text-slate-200">H:</strong> Horn</span>
          <span><strong className="text-slate-200">C:</strong> Change Camera View</span>
        </div>
        <div className="text-sky-400 font-bold">
          Tip: Pass within inches for +$50 Near-Miss bonuses!
        </div>
      </div>
    </div>
  );
};
