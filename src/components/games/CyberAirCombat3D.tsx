import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Play,
  ChevronRight, Compass, Gauge, Award, Flame, Star, ShoppingBag,
  Crosshair, Radio, AlertTriangle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  HelpCircle, Lock, CheckCircle2, CircleDot, RefreshCw, Skull, Wrench, Plane
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// TYPES & DATA STRUCTURES
// ----------------------------------------------------

export interface JetFighter {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  color: string;
  glowColor: string;
  accentColor: string;
  maxHp: number;
  topSpeed: number;     // Mach speed
  accel: number;
  handling: number;     // Bank & roll agility
  cannonDmg: number;
  missileCapacity: number;
  specialSkill: string;
  description: string;
}

export type MissionEnvironment = 'ocean_warships' | 'tropical_jungle' | 'neon_metropolis' | 'inferno_canyon' | 'orbital_space' | 'armada_boss';

export interface AirMission {
  id: number;
  title: string;
  theater: string;
  environment: MissionEnvironment;
  badge: string;
  objective: string;
  targetCount: number;
  hasBoss: boolean;
  bossName: string;
  rewardCredits: number;
  skyGradient: [string, string, string]; // Top sky, horizon, ground/water
  horizonLine: string;
}

export interface GroundProp {
  id: number;
  type: 'warship' | 'aircraft_carrier' | 'jungle_island' | 'temple_pyramid' | 'skyscraper' | 'volcano_spire' | 'space_satellite';
  x: number;
  y: number; // Ground height
  z: number;
  width: number;
  height: number;
  length: number;
  color: string;
  accentColor: string;
  flakCooldown?: number;
}

interface PlayerJet {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rollAngle: number;
  pitchAngle: number;
  speed: number;
  hp: number;
  maxHp: number;
  missiles: number;
  maxMissiles: number;
  afterburnerFuel: number;
  isAfterburning: boolean;
  isRolling: boolean;
  rollTimer: number;
  cannonCooldown: number;
  missileCooldown: number;
}

interface EnemyJet {
  id: number;
  type: 'drone' | 'ace_fighter' | 'stealth_bomber' | 'sky_fortress_boss';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rollAngle: number;
  pitchAngle: number;
  speed: number;
  hp: number;
  maxHp: number;
  damage: number;
  scoreValue: number;
  aiTimer: number;
  shootCooldown: number;
  isLockedOn: boolean;
}

interface Projectile {
  id: number;
  isPlayer: boolean;
  type: 'laser' | 'missile';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  color: string;
  glowColor: string;
  targetEnemyId?: number;
  rangeRemaining: number;
}

interface CloudLayer {
  x: number;
  y: number;
  z: number;
  radius: number;
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
  shape?: 'spark' | 'smoke' | 'shockwave';
}

export interface SupplyPod {
  id: number;
  type: 'missile' | 'health' | 'score';
  x: number;
  y: number;
  z: number;
  vz: number;
  size: number;
  color: string;
  glowColor: string;
  label: string;
  rotation: number;
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

const JET_FIGHTERS: JetFighter[] = [
  {
    id: 'f22-raptor-cyber',
    name: 'F-22 Cyber Raptor',
    price: 0,
    unlocked: true,
    color: '#0284c7',
    glowColor: '#38bdf8',
    accentColor: '#f43f5e',
    maxHp: 320,
    topSpeed: 2.8,
    accel: 1.0,
    handling: 85,
    cannonDmg: 30,
    missileCapacity: 6,
    specialSkill: 'Salvo Missile Barrage',
    description: 'Premier air-superiority stealth fighter with balanced handling.',
  },
  {
    id: 'su57-phantom',
    name: 'Su-57 Phantom Ghost',
    price: 350,
    unlocked: false,
    color: '#a855f7',
    glowColor: '#c084fc',
    accentColor: '#00f0ff',
    maxHp: 300,
    topSpeed: 3.1,
    accel: 1.2,
    handling: 95,
    cannonDmg: 34,
    missileCapacity: 6,
    specialSkill: 'Super-Maneuver Cobra Turn',
    description: 'Supreme agility dogfighter capable of instant high-G barrel rolls.',
  },
  {
    id: 'a10-thunderbolt-neon',
    name: 'A-10 Neon Thunderbolt',
    price: 750,
    unlocked: false,
    color: '#ea580c',
    glowColor: '#f97316',
    accentColor: '#facc15',
    maxHp: 480,
    topSpeed: 2.2,
    accel: 0.9,
    handling: 70,
    cannonDmg: 55,
    missileCapacity: 8,
    specialSkill: '30mm Heavy Rotary Gatling',
    description: 'Titanium armored tank shredder with extreme rotary cannon firepower.',
  },
  {
    id: 'sr71-valkyrie',
    name: 'SR-71 Hyper Valkyrie',
    price: 1400,
    unlocked: false,
    color: '#e11d48',
    glowColor: '#fb7185',
    accentColor: '#facc15',
    maxHp: 310,
    topSpeed: 4.2,
    accel: 1.45,
    handling: 88,
    cannonDmg: 38,
    missileCapacity: 8,
    specialSkill: 'Mach 4 Supersonic Overdrive',
    description: 'High-altitude interceptor tearing through skies at hypersonic speeds.',
  },
  {
    id: 'f35-lightning-apex',
    name: 'F-35 Apex Lightning',
    price: 2500,
    unlocked: false,
    color: '#10b981',
    glowColor: '#34d399',
    accentColor: '#00f0ff',
    maxHp: 360,
    topSpeed: 3.4,
    accel: 1.3,
    handling: 92,
    cannonDmg: 40,
    missileCapacity: 12,
    specialSkill: 'Multi-Lock Swarm System',
    description: 'Next-gen stealth platform capable of locking 6 targets simultaneously.',
  },
  {
    id: 'quantum-xwing-titan',
    name: 'Quantum X-Wing Titan',
    price: 4200,
    unlocked: false,
    color: '#facc15',
    glowColor: '#fef08a',
    accentColor: '#00f0ff',
    maxHp: 450,
    topSpeed: 3.8,
    accel: 1.4,
    handling: 90,
    cannonDmg: 52,
    missileCapacity: 16,
    specialSkill: 'Orbital Particle Death Beam',
    description: 'Apex experimental starfighter wielding quad plasma beam cannons.',
  },
];

const AIR_MISSIONS: AirMission[] = [
  {
    id: 1,
    title: 'Operation Pacific Dawn',
    theater: 'Pacific Atoll Naval Warzone',
    environment: 'ocean_warships',
    badge: '🌊 NAVAL OCEAN & WARSHIPS',
    objective: 'Protect friendly aircraft carrier & shoot down 10 bandit fighters over open ocean',
    targetCount: 10,
    hasBoss: false,
    bossName: '',
    rewardCredits: 350,
    skyGradient: ['#0f172a', '#0284c7', '#0891b2'],
    horizonLine: 'rgba(6, 182, 212, 0.4)',
  },
  {
    id: 2,
    title: 'Operation Jungle Thunder',
    theater: 'Amazon Rainforest Ravine',
    environment: 'tropical_jungle',
    badge: '🌴 JUNGLE & ANCIENT VALLEY',
    objective: 'Destroy 14 ace fighters & bomb radar temple towers deep within tropical jungle canopy',
    targetCount: 14,
    hasBoss: true,
    bossName: 'Jungle Stealth Gunship',
    rewardCredits: 750,
    skyGradient: ['#022c22', '#065f46', '#10b981'],
    horizonLine: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 3,
    title: 'Operation Cyber Metropolis',
    theater: 'Neo-Tokyo Skyline Sector 7',
    environment: 'neon_metropolis',
    badge: '🏙️ NEON MEGALOPOLIS',
    objective: 'Defend Sky Spire & neutralize 16 syndicate stealth fighters amidst towering skyscrapers',
    targetCount: 16,
    hasBoss: false,
    bossName: '',
    rewardCredits: 1250,
    skyGradient: ['#09090b', '#3b0764', '#06b6d4'],
    horizonLine: 'rgba(217, 70, 239, 0.4)',
  },
  {
    id: 4,
    title: 'Operation Inferno Caldera',
    theater: 'Mojave Magma Ravines',
    environment: 'inferno_canyon',
    badge: '🌋 VOLCANIC MAGMA GORGE',
    objective: 'Eliminate 18 interceptors & magma bomber swarms through glowing volcanic canyons',
    targetCount: 18,
    hasBoss: true,
    bossName: 'Magma Dread Bomber',
    rewardCredits: 1900,
    skyGradient: ['#18181b', '#7f1d1d', '#f97316'],
    horizonLine: 'rgba(249, 115, 22, 0.4)',
  },
  {
    id: 5,
    title: 'Operation Orbital Aegis',
    theater: 'Low Earth Orbit Stratosphere',
    environment: 'orbital_space',
    badge: '🌌 LOW EARTH ORBIT',
    objective: 'Defend orbital defense satellites in low orbit against 20 hypersonic spacefighters',
    targetCount: 20,
    hasBoss: false,
    bossName: '',
    rewardCredits: 2800,
    skyGradient: ['#020617', '#1e1b4b', '#0ea5e9'],
    horizonLine: 'rgba(56, 189, 248, 0.5)',
  },
  {
    id: 6,
    title: 'Operation Leviathan Dreadnought',
    theater: 'Armada Apex Flagship Fleet',
    environment: 'armada_boss',
    badge: '⚡ MOTHERSHIP BOSS BATTLE',
    objective: 'Obliterate the colossal Leviathan Airborne Dreadnought & defeat the syndicate general',
    targetCount: 24,
    hasBoss: true,
    bossName: 'Leviathan Airborne Dreadnought',
    rewardCredits: 4200,
    skyGradient: ['#0f172a', '#4338ca', '#f43f5e'],
    horizonLine: 'rgba(244, 63, 94, 0.5)',
  },
];

// ----------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------

export const CyberAirCombat3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI Screen State
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'victory' | 'hangar' | 'missions' | 'instructions'>('menu');
  const [gameMode, setGameMode] = useState<'campaign' | 'endless'>('campaign');
  const [activeMissionIndex, setActiveMissionIndex] = useState<number>(0);

  // Persistence State
  const [credits, setCredits] = useState<number>(() => {
    const s = localStorage.getItem('cyber_air_credits');
    return s ? parseInt(s, 10) : 150;
  });

  const [highScore, setHighScore] = useState<number>(() => {
    const s = localStorage.getItem('cyber_air_highscore');
    return s ? parseInt(s, 10) : 0;
  });

  const [completedMissionIds, setCompletedMissionIds] = useState<number[]>(() => {
    const s = localStorage.getItem('cyber_air_completed_missions');
    return s ? JSON.parse(s) : [1, 2];
  });

  const [unlockedJetIds, setUnlockedJetIds] = useState<string[]>(() => {
    const s = localStorage.getItem('cyber_air_unlocked_jets');
    return s ? JSON.parse(s) : ['f22-raptor-cyber'];
  });

  const [activeJetId, setActiveJetId] = useState<string>(() => {
    return localStorage.getItem('cyber_air_active_jet') || 'f22-raptor-cyber';
  });

  // Dynamic In-Game HUD States
  const [hudHp, setHudHp] = useState(320);
  const [hudMaxHp, setHudMaxHp] = useState(320);
  const [hudMissiles, setHudMissiles] = useState(6);
  const [hudFuel, setHudFuel] = useState(100);
  const [hudScore, setHudScore] = useState(0);
  const [hudKills, setHudKills] = useState(0);
  const [hudMachSpeed, setHudMachSpeed] = useState(2.8);
  const [hudTargetLock, setHudTargetLock] = useState<string | null>(null);
  const [hudBossHp, setHudBossHp] = useState<number | null>(null);
  const [hudBossName, setHudBossName] = useState('');
  const [muted, setMuted] = useState(sound.isMuted());

  // Input states
  const keysRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    cannon: false,
    missile: false,
    afterburner: false,
    barrelRoll: false,
  });

  // 60 FPS Physics Simulation Engine Refs
  const engineRef = useRef({
    player: null as PlayerJet | null,
    enemies: [] as EnemyJet[],
    projectiles: [] as Projectile[],
    supplyPods: [] as SupplyPod[],
    supplyTimer: 5.0,
    clouds: [] as CloudLayer[],
    groundProps: [] as GroundProp[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    waterWaveOffset: 0,
    screenShake: 0,
    score: 0,
    kills: 0,
    totalEnemiesSpawned: 0,
    maxMissionEnemies: 10,
    isMissionWon: false,
    lastTime: performance.now(),
    isRunning: false,
    nextEntityId: 1,
  });

  const activeJet = JET_FIGHTERS.find((j) => j.id === activeJetId) || JET_FIGHTERS[0];
  const activeMission = AIR_MISSIONS[activeMissionIndex] || AIR_MISSIONS[0];

  // ----------------------------------------------------
  // SOUND HELPERS
  // ----------------------------------------------------
  const toggleMute = () => {
    const m = sound.toggleMute();
    setMuted(m);
  };

  const playCannonSound = useCallback(() => {
    if (sound.isMuted()) return;
    sound.playLaser();
  }, []);

  const playMissileLaunchSound = useCallback(() => {
    if (sound.isMuted()) return;
    sound.playJump();
  }, []);

  const playExplosionSound = useCallback(() => {
    if (sound.isMuted()) return;
    sound.playExplosion();
  }, []);

  // ----------------------------------------------------
  // START & RESET MISSION MATCH
  // ----------------------------------------------------
  const startMission = useCallback((mode: 'campaign' | 'endless' = 'campaign', missionIdx = 0) => {
    setGameMode(mode);
    setActiveMissionIndex(missionIdx);

    const eng = engineRef.current;
    const jet = JET_FIGHTERS.find((j) => j.id === activeJetId) || JET_FIGHTERS[0];
    const mission = AIR_MISSIONS[missionIdx] || AIR_MISSIONS[0];

    eng.score = 0;
    eng.kills = 0;
    eng.screenShake = 0;
    eng.particles = [];
    eng.floatingTexts = [];
    eng.projectiles = [];
    eng.supplyPods = [
      {
        id: eng.nextEntityId++,
        type: 'missile',
        x: 80,
        y: -40,
        z: 700,
        vz: -140,
        size: 28,
        color: '#f43f5e',
        glowColor: '#fb7185',
        label: '🚀 +2 MISSILES',
        rotation: 0,
      },
    ];
    eng.supplyTimer = 6.0;
    eng.isMissionWon = false;
    eng.totalEnemiesSpawned = 0;
    eng.maxMissionEnemies = mode === 'endless' ? 999 : mission.targetCount;

    // Cloud layer removed per user request
    eng.clouds = [];

    // Spawn Environment-Specific 3D Ground Props & Naval Ships
    eng.groundProps = [];
    if (mission.environment === 'ocean_warships') {
      // 3D Naval Battleships & Aircraft Carriers ('water jahaj')
      eng.groundProps.push({
        id: eng.nextEntityId++,
        type: 'aircraft_carrier',
        x: -160,
        y: 280,
        z: 750,
        width: 130,
        height: 40,
        length: 340,
        color: '#334155',
        accentColor: '#38bdf8',
        flakCooldown: 1.5,
      });
      eng.groundProps.push({
        id: eng.nextEntityId++,
        type: 'warship',
        x: 240,
        y: 290,
        z: 1100,
        width: 75,
        height: 32,
        length: 220,
        color: '#1e293b',
        accentColor: '#f59e0b',
        flakCooldown: 2.2,
      });
      eng.groundProps.push({
        id: eng.nextEntityId++,
        type: 'warship',
        x: -340,
        y: 290,
        z: 1450,
        width: 65,
        height: 28,
        length: 180,
        color: '#1e293b',
        accentColor: '#06b6d4',
        flakCooldown: 2.8,
      });
      eng.groundProps.push({
        id: eng.nextEntityId++,
        type: 'jungle_island',
        x: 360,
        y: 300,
        z: 1600,
        width: 240,
        height: 50,
        length: 240,
        color: '#065f46',
        accentColor: '#34d399',
      });
    } else if (mission.environment === 'tropical_jungle') {
      // Dense Tropical Islands, Ancient Temples & Green Canopy
      for (let i = 0; i < 7; i++) {
        eng.groundProps.push({
          id: eng.nextEntityId++,
          type: i % 2 === 0 ? 'temple_pyramid' : 'jungle_island',
          x: ((i % 3) - 1) * 300 + (Math.random() - 0.5) * 80,
          y: 290,
          z: 450 + i * 260,
          width: 150 + Math.random() * 80,
          height: 60 + Math.random() * 40,
          length: 150 + Math.random() * 80,
          color: '#047857',
          accentColor: '#10b981',
        });
      }
    } else if (mission.environment === 'neon_metropolis') {
      // 3D Neon Skyscrapers & Towers
      for (let i = 0; i < 8; i++) {
        eng.groundProps.push({
          id: eng.nextEntityId++,
          type: 'skyscraper',
          x: ((i % 4) - 1.5) * 220 + (Math.random() - 0.5) * 60,
          y: 230,
          z: 350 + i * 220,
          width: 85 + Math.random() * 40,
          height: 140 + Math.random() * 90,
          length: 85 + Math.random() * 40,
          color: '#0f172a',
          accentColor: i % 2 === 0 ? '#00f0ff' : '#d946ef',
        });
      }
    } else if (mission.environment === 'inferno_canyon') {
      // Volcanic Magma Spires & Basalt Rocks
      for (let i = 0; i < 6; i++) {
        eng.groundProps.push({
          id: eng.nextEntityId++,
          type: 'volcano_spire',
          x: ((i % 3) - 1) * 280,
          y: 270,
          z: 400 + i * 250,
          width: 130,
          height: 100,
          length: 130,
          color: '#450a0a',
          accentColor: '#f97316',
        });
      }
    } else if (mission.environment === 'orbital_space') {
      // Satellites & Space Defense Stations
      for (let i = 0; i < 5; i++) {
        eng.groundProps.push({
          id: eng.nextEntityId++,
          type: 'space_satellite',
          x: (i % 2 === 0 ? -1 : 1) * (200 + Math.random() * 120),
          y: 180 + (Math.random() - 0.5) * 100,
          z: 500 + i * 320,
          width: 70,
          height: 35,
          length: 70,
          color: '#1e293b',
          accentColor: '#38bdf8',
        });
      }
    } else if (mission.environment === 'armada_boss') {
      // Floating Dreadnought Battlements
      eng.groundProps.push({
        id: eng.nextEntityId++,
        type: 'aircraft_carrier',
        x: 0,
        y: 280,
        z: 900,
        width: 180,
        height: 50,
        length: 420,
        color: '#1e1b4b',
        accentColor: '#f43f5e',
        flakCooldown: 1.0,
      });
    }

    // Create Player Jet
    eng.player = {
      x: 0,
      y: 100,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rollAngle: 0,
      pitchAngle: 0,
      speed: jet.topSpeed,
      hp: jet.maxHp,
      maxHp: jet.maxHp,
      missiles: jet.missileCapacity,
      maxMissiles: jet.missileCapacity,
      afterburnerFuel: 100,
      isAfterburning: false,
      isRolling: false,
      rollTimer: 0,
      cannonCooldown: 0,
      missileCooldown: 0,
    };

    // Spawn Initial Wave of 3 Enemy Jets
    const initialEnemies: EnemyJet[] = [];
    for (let i = 0; i < 3; i++) {
      initialEnemies.push({
        id: eng.nextEntityId++,
        type: i === 1 ? 'ace_fighter' : 'drone',
        x: (i - 1) * 240,
        y: -120 + (Math.random() - 0.5) * 80,
        z: 600 + i * 180,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 40,
        vz: -180,
        rollAngle: 0,
        pitchAngle: 0,
        speed: 1.8,
        hp: i === 1 ? 80 : 45,
        maxHp: i === 1 ? 80 : 45,
        damage: 8,
        scoreValue: i === 1 ? 250 : 150,
        aiTimer: 1.0,
        shootCooldown: 3.2 + Math.random() * 1.5,
        isLockedOn: false,
      });
      eng.totalEnemiesSpawned++;
    }
    eng.enemies = initialEnemies;

    eng.lastTime = performance.now();
    eng.isRunning = true;

    setHudHp(jet.maxHp);
    setHudMaxHp(jet.maxHp);
    setHudMissiles(jet.missileCapacity);
    setHudFuel(100);
    setHudScore(0);
    setHudKills(0);
    setHudTargetLock(null);
    setHudBossHp(null);
    setGameState('playing');

    sound.playClick();
  }, [activeJetId]);

  // ----------------------------------------------------
  // UNLOCK / PURCHASE JET FIGHTER
  // ----------------------------------------------------
  const buyJet = (jet: JetFighter) => {
    if (credits >= jet.price && !unlockedJetIds.includes(jet.id)) {
      const nextCr = credits - jet.price;
      const nextJets = [...unlockedJetIds, jet.id];
      setCredits(nextCr);
      setUnlockedJetIds(nextJets);
      setActiveJetId(jet.id);

      localStorage.setItem('cyber_air_credits', nextCr.toString());
      localStorage.setItem('cyber_air_unlocked_jets', JSON.stringify(nextJets));
      localStorage.setItem('cyber_air_active_jet', jet.id);

      sound.playWin();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    }
  };

  // ----------------------------------------------------
  // FIRE MISSILES
  // ----------------------------------------------------
  const fireMissile = useCallback(() => {
    const eng = engineRef.current;
    const p = eng.player;
    if (!p || p.hp <= 0 || p.missiles <= 0 || p.missileCooldown > 0) return;

    p.missiles -= 1;
    p.missileCooldown = 0.5;
    playMissileLaunchSound();

    // Find closest enemy in front to lock on
    let targetEnemy: EnemyJet | null = null;
    let minDist = 1200;

    eng.enemies.forEach((e) => {
      if (e.hp <= 0) return;
      const dist = Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z);
      if (dist < minDist && e.z > p.z + 50) {
        minDist = dist;
        targetEnemy = e;
      }
    });

    eng.projectiles.push({
      id: eng.nextEntityId++,
      isPlayer: true,
      type: 'missile',
      x: p.x + (Math.random() - 0.5) * 30,
      y: p.y + 10,
      z: p.z + 40,
      vx: (Math.random() - 0.5) * 20,
      vy: 10,
      vz: 480,
      damage: 120,
      color: '#facc15',
      glowColor: '#ef4444',
      targetEnemyId: targetEnemy ? (targetEnemy as EnemyJet).id : undefined,
      rangeRemaining: 1500,
    });

    setHudMissiles(p.missiles);
  }, [playMissileLaunchSound]);

  // ----------------------------------------------------
  // BARREL ROLL EVASION
  // ----------------------------------------------------
  const performBarrelRoll = useCallback(() => {
    const eng = engineRef.current;
    const p = eng.player;
    if (!p || p.isRolling || p.hp <= 0) return;

    p.isRolling = true;
    p.rollTimer = 0.45;
    sound.playJump();

    eng.floatingTexts.push({
      id: eng.nextEntityId++,
      text: '🌀 BARREL ROLL EVASION!',
      x: p.x,
      y: p.y - 40,
      color: '#00f0ff',
      alpha: 1,
      scale: 1.4,
    });
  }, []);

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
      const jet = JET_FIGHTERS.find((j) => j.id === activeJetId) || JET_FIGHTERS[0];
      const p = eng.player;

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

      if (eng.isRunning && gameState === 'playing' && p) {
        const keys = keysRef.current;

        p.cannonCooldown = Math.max(0, p.cannonCooldown - dt);
        p.missileCooldown = Math.max(0, p.missileCooldown - dt);

        // 1. PLAYER FLIGHT CONTROLS & AFTERBURNER
        if (p.isRolling) {
          p.rollTimer -= dt;
          p.rollAngle += Math.PI * 6 * dt; // Full 360° corkscrew roll
          p.x += (keys.left ? -1 : (keys.right ? 1 : 1)) * 260 * dt;
          p.pitchAngle = 0;

          // Sonic Vapor Spiral Trail
          eng.particles.push({
            x: p.x + (Math.random() - 0.5) * 40,
            y: p.y + (Math.random() - 0.5) * 20,
            z: p.z - 10,
            vx: (Math.random() - 0.5) * 40,
            vy: (Math.random() - 0.5) * 40,
            vz: -150,
            size: 5,
            color: '#00f0ff',
            alpha: 0.9,
            decay: 3.5,
            shape: 'smoke',
          });

          if (p.rollTimer <= 0) {
            p.isRolling = false;
            p.rollAngle = 0;
          }
        }

        // Afterburner
        if (keys.afterburner && p.afterburnerFuel > 0) {
          p.isAfterburning = true;
          p.afterburnerFuel = Math.max(0, p.afterburnerFuel - dt * 30);
          p.speed = jet.topSpeed * 1.5;
          eng.screenShake = Math.max(eng.screenShake, 3);

          // Afterburner fire trail
          for (let f = -1; f <= 1; f += 2) {
            eng.particles.push({
              x: p.x + f * 18,
              y: p.y + 15,
              z: p.z - 20,
              vx: (Math.random() - 0.5) * 30,
              vy: 20,
              vz: -200 - Math.random() * 100,
              size: 6,
              color: '#00f0ff',
              alpha: 0.9,
              decay: 4.0,
              shape: 'smoke',
            });
          }
        } else {
          p.isAfterburning = false;
          p.afterburnerFuel = Math.min(100, p.afterburnerFuel + dt * 10);
          p.speed = jet.topSpeed;
        }

        // Steering (Pitch & Roll Banking)
        let steerX = 0;
        let steerY = 0;
        if (keys.left) steerX -= 1;
        if (keys.right) steerX += 1;
        if (keys.up) steerY -= 1;
        if (keys.down) steerY += 1;

        const agility = (jet.handling / 100) * 360;
        p.x += steerX * agility * dt;
        p.y += steerY * (agility * 0.8) * dt;

        // Banking angles (Only if not in active 360 barrel roll!)
        if (!p.isRolling) {
          p.rollAngle = steerX * 0.45;
          p.pitchAngle = steerY * 0.3;
        }

        // Boundaries
        p.x = Math.max(-320, Math.min(320, p.x));
        p.y = Math.max(-180, Math.min(180, p.y));

        // Rapid Laser Cannon Firing
        if (keys.cannon && p.cannonCooldown <= 0) {
          p.cannonCooldown = 0.12;
          playCannonSound();

          for (let c = -1; c <= 1; c += 2) {
            eng.projectiles.push({
              id: eng.nextEntityId++,
              isPlayer: true,
              type: 'laser',
              x: p.x + c * 24,
              y: p.y - 5,
              z: p.z + 30,
              vx: c * 4,
              vy: 0,
              vz: 750,
              damage: jet.cannonDmg,
              color: '#00f0ff',
              glowColor: '#38bdf8',
              rangeRemaining: 1200,
            });
          }
        }

        // Missile Firing
        if (keys.missile) {
          keys.missile = false;
          fireMissile();
        }

        // 2. SKY & WATER ENVIRONMENT SCROLLING

        // 2.5 GROUND PROPS & NAVAL SHIPS MOVEMENT
        eng.waterWaveOffset += dt * 3.0;

        // 2.8 FLOATING MISSILE & POINT SUPPLY PODS SIMULATION
        eng.supplyTimer -= dt;
        if (eng.supplyTimer <= 0) {
          eng.supplyTimer = 8.0 + Math.random() * 4.0;
          eng.supplyPods.push({
            id: eng.nextEntityId++,
            type: Math.random() < 0.7 ? 'missile' : Math.random() < 0.5 ? 'health' : 'score',
            x: (Math.random() - 0.5) * 440,
            y: -120 + (Math.random() - 0.5) * 120,
            z: 1100,
            vz: -160,
            size: 26,
            color: '#f43f5e',
            glowColor: '#fb7185',
            label: '🚀 +2 MISSILES',
            rotation: 0,
          });
        }

        eng.supplyPods.forEach((pod) => {
          pod.z += (pod.vz - p.speed * 80) * dt;
          pod.rotation += dt * 3.0;

          // Player Jet Collects Supply Pod
          const pDist = Math.hypot(p.x - pod.x, p.y - pod.y, p.z - pod.z);
          if (pDist < 52 && pod.z > -40 && pod.z < 80) {
            pod.z = -999; // Mark collected

            if (pod.type === 'missile') {
              p.missiles = Math.min(p.maxMissiles, p.missiles + 2);
              eng.score += 350;
              sound.playScore();

              eng.floatingTexts.push({
                id: eng.nextEntityId++,
                text: '🚀 +2 MISSILES RELOADED! (+350 PTS)',
                x: p.x,
                y: p.y - 45,
                color: '#38bdf8',
                alpha: 1,
                scale: 1.5,
              });
            } else if (pod.type === 'health') {
              p.hp = Math.min(p.maxHp, p.hp + 70);
              eng.score += 200;
              sound.playScore();

              eng.floatingTexts.push({
                id: eng.nextEntityId++,
                text: '🛡️ +70 HP REPAIRED! (+200 PTS)',
                x: p.x,
                y: p.y - 45,
                color: '#34d399',
                alpha: 1,
                scale: 1.5,
              });
            } else {
              eng.score += 600;
              sound.playScore();

              eng.floatingTexts.push({
                id: eng.nextEntityId++,
                text: '⭐ +600 BONUS POINTS!',
                x: p.x,
                y: p.y - 45,
                color: '#facc15',
                alpha: 1,
                scale: 1.6,
              });
            }

            // Collection Sparkles
            for (let s = 0; s < 14; s++) {
              const ang = Math.random() * Math.PI * 2;
              eng.particles.push({
                x: p.x,
                y: p.y,
                z: p.z,
                vx: Math.cos(ang) * 120,
                vy: Math.sin(ang) * 120,
                vz: (Math.random() - 0.5) * 80,
                size: 5,
                color: '#38bdf8',
                alpha: 1,
                decay: 2.5,
                shape: 'spark',
              });
            }
          }
        });
        eng.supplyPods = eng.supplyPods.filter((pod) => pod.z > -80);
        eng.groundProps.forEach((gp) => {
          gp.z -= p.speed * 130 * dt;
          if (gp.z < -100) {
            gp.z = 1600 + Math.random() * 300;
            gp.x = (Math.random() - 0.5) * 700;
          }

          // Anti-Aircraft Flak Cannons on Naval Ships
          if (gp.flakCooldown !== undefined) {
            gp.flakCooldown -= dt;
            if (gp.flakCooldown <= 0 && gp.z > 200 && gp.z < 1200) {
              gp.flakCooldown = 2.0 + Math.random() * 2.0;
              for (let i = 0; i < 6; i++) {
                const ang = Math.random() * Math.PI * 2;
                eng.particles.push({
                  x: gp.x + (Math.random() - 0.5) * 40,
                  y: gp.y - 30 - Math.random() * 120,
                  z: gp.z,
                  vx: Math.cos(ang) * 50,
                  vy: Math.sin(ang) * 50 - 20,
                  vz: -50,
                  size: 6 + Math.random() * 6,
                  color: '#f97316',
                  alpha: 1,
                  decay: 2.2,
                  shape: 'shockwave',
                });
              }
            }
          }
        });

        // 3. PROJECTILE SIMULATION & HIT COLLISION
        eng.projectiles.forEach((proj) => {
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;
          proj.z += proj.vz * dt;
          proj.rangeRemaining -= Math.abs(proj.vz) * dt;

          if (proj.isPlayer) {
            // Player Projectile vs Enemy Jets
            eng.enemies.forEach((en) => {
              if (proj.rangeRemaining <= 0 || en.hp <= 0) return;
              const dist = Math.hypot(en.x - proj.x, en.y - proj.y, en.z - proj.z);

              if (dist < 48) {
                proj.rangeRemaining = 0;
                en.hp -= proj.damage;
                playExplosionSound();
                eng.screenShake = 6;

                // Hit Sparks
                for (let s = 0; s < 6; s++) {
                  eng.particles.push({
                    x: en.x,
                    y: en.y,
                    z: en.z,
                    vx: (Math.random() - 0.5) * 160,
                    vy: (Math.random() - 0.5) * 160,
                    vz: (Math.random() - 0.5) * 160,
                    size: 4,
                    color: '#facc15',
                    alpha: 1,
                    decay: 3.0,
                    shape: 'spark',
                  });
                }

                // Enemy Destroyed
                if (en.hp <= 0) {
                  eng.kills += 1;
                  eng.score += en.scoreValue;
                  eng.screenShake = 16;
                  playExplosionSound();

                  // Fiery explosion
                  for (let i = 0; i < 20; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    eng.particles.push({
                      x: en.x,
                      y: en.y,
                      z: en.z,
                      vx: Math.cos(ang) * 180,
                      vy: Math.sin(ang) * 180,
                      vz: (Math.random() - 0.5) * 120,
                      size: 8 + Math.random() * 8,
                      color: '#f97316',
                      alpha: 1,
                      decay: 2.0,
                      shape: 'shockwave',
                    });
                  }

                  // Drop Missile Supply Pod on Enemy Defeat!
                  if (Math.random() < 0.75) {
                    eng.supplyPods.push({
                      id: eng.nextEntityId++,
                      type: 'missile',
                      x: en.x,
                      y: en.y,
                      z: en.z,
                      vz: -130,
                      size: 26,
                      color: '#f43f5e',
                      glowColor: '#fb7185',
                      label: '🚀 +2 MISSILES',
                      rotation: 0,
                    });
                  } else {
                    eng.supplyPods.push({
                      id: eng.nextEntityId++,
                      type: Math.random() < 0.5 ? 'health' : 'score',
                      x: en.x,
                      y: en.y,
                      z: en.z,
                      vz: -130,
                      size: 26,
                      color: '#10b981',
                      glowColor: '#34d399',
                      label: '⭐ +500 PTS',
                      rotation: 0,
                    });
                  }

                  eng.floatingTexts.push({
                    id: eng.nextEntityId++,
                    text: `🎯 SPLASH ONE! +${en.scoreValue}`,
                    x: en.x,
                    y: en.y - 30,
                    color: '#facc15',
                    alpha: 1,
                    scale: 1.5,
                  });
                }
              }
            });
          } else {
            // Enemy Projectile vs Player Jet
            const dist = Math.hypot(p.x - proj.x, p.y - proj.y, p.z - proj.z);
            if (dist < 38 && !p.isRolling && proj.rangeRemaining > 0) {
              proj.rangeRemaining = 0;
              p.hp = Math.max(0, p.hp - proj.damage);
              playExplosionSound();
              eng.screenShake = 12;

              if (p.hp <= 0) {
                eng.isRunning = false;
                setGameState('gameover');
                sound.playGameOver();
              }
            }
          }
        });
        eng.projectiles = eng.projectiles.filter((p) => p.rangeRemaining > 0);

        // 4. AI ENEMY JETS SIMULATION
        let lockedTargetName: string | null = null;

        eng.enemies.forEach((en) => {
          if (en.hp <= 0) return;

          // Move enemy closer to player on Z
          en.z += en.vz * dt;
          en.x += en.vx * dt;
          en.y += en.vy * dt;

          // AI Flight Maneuvers
          en.aiTimer -= dt;
          if (en.aiTimer <= 0) {
            en.aiTimer = 1.0 + Math.random() * 1.5;
            en.vx = (p.x - en.x) * 0.4 + (Math.random() - 0.5) * 80;
            en.vy = (p.y - en.y) * 0.3 + (Math.random() - 0.5) * 60;
          }

          // Enemy Shoots Lasers at Player
          en.shootCooldown -= dt;
          if (en.shootCooldown <= 0 && en.z > 200 && en.z < 800) {
            en.shootCooldown = 1.8;
            playCannonSound();

            eng.projectiles.push({
              id: eng.nextEntityId++,
              isPlayer: false,
              type: 'laser',
              x: en.x,
              y: en.y,
              z: en.z - 20,
              vx: (p.x - en.x) * 0.5,
              vy: (p.y - en.y) * 0.5,
              vz: -600,
              damage: en.damage,
              color: '#ef4444',
              glowColor: '#f87171',
              rangeRemaining: 900,
            });
          }

          // Check if locked on by HUD
          if (en.z > 150 && en.z < 900 && Math.abs(en.x - p.x) < 160 && Math.abs(en.y - p.y) < 120) {
            lockedTargetName = en.type === 'sky_fortress_boss' ? 'LEVIATHAN FLAGSHIP' : 'BANDIT FIGHTER';
          }

          // Reset enemy if flew past behind camera
          if (en.z < -100) {
            en.z = 1000 + Math.random() * 400;
            en.x = (Math.random() - 0.5) * 500;
            en.y = (Math.random() - 0.5) * 300;
          }
        });

        // Clean dead enemies
        eng.enemies = eng.enemies.filter((e) => e.hp > 0);

        // Spawn reinforcements
        if (eng.enemies.length < 2 && eng.totalEnemiesSpawned < eng.maxMissionEnemies) {
          const isBossSpawn = eng.totalEnemiesSpawned === eng.maxMissionEnemies - 1 && activeMission.hasBoss;

          eng.enemies.push({
            id: eng.nextEntityId++,
            type: isBossSpawn ? 'sky_fortress_boss' : 'ace_fighter',
            x: (Math.random() - 0.5) * 400,
            y: -100,
            z: 900 + Math.random() * 200,
            vx: (Math.random() - 0.5) * 50,
            vy: 20,
            vz: -160,
            rollAngle: 0,
            pitchAngle: 0,
            speed: 2.2,
            hp: isBossSpawn ? 500 : 120,
            maxHp: isBossSpawn ? 500 : 120,
            damage: isBossSpawn ? 35 : 20,
            scoreValue: isBossSpawn ? 1500 : 350,
            aiTimer: 0.8,
            shootCooldown: 1.5,
            isLockedOn: false,
          });
          eng.totalEnemiesSpawned++;

          if (isBossSpawn) {
            setHudBossHp(500);
            setHudBossName(activeMission.bossName);
          }
        }

        // Check Victory
        if (eng.enemies.length === 0 && eng.totalEnemiesSpawned >= eng.maxMissionEnemies && !eng.isMissionWon) {
          eng.isMissionWon = true;
          eng.isRunning = false;
          setGameState('victory');

          const rewardCr = gameMode === 'campaign' ? activeMission.rewardCredits : 600;
          setCredits((c) => {
            const nc = c + rewardCr;
            localStorage.setItem('cyber_air_credits', nc.toString());
            return nc;
          });

          // Save completed mission progression
          setCompletedMissionIds((prev) => {
            const nextMissionId = activeMission.id + 1;
            const updated = Array.from(new Set([...prev, activeMission.id, nextMissionId]));
            localStorage.setItem('cyber_air_completed_missions', JSON.stringify(updated));
            return updated;
          });

          sound.playWin();
        }

        // 5. PARTICLES & TEXTS
        eng.particles.forEach((pt) => {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.z += pt.vz * dt;
          pt.alpha -= pt.decay * dt;
        });
        eng.particles = eng.particles.filter((pt) => pt.alpha > 0);

        eng.floatingTexts.forEach((ft) => {
          ft.y -= 26 * dt;
          ft.alpha -= 0.8 * dt;
        });
        eng.floatingTexts = eng.floatingTexts.filter((ft) => ft.alpha > 0);

        if (eng.screenShake > 0) {
          eng.screenShake = Math.max(0, eng.screenShake - dt * 25);
        }

        // Sync React HUD
        setHudHp(Math.round(p.hp));
        setHudMaxHp(p.maxHp);
        setHudMissiles(p.missiles);
        setHudFuel(Math.round(p.afterburnerFuel));
        setHudScore(eng.score);
        setHudKills(eng.kills);
        setHudMachSpeed(parseFloat(p.speed.toFixed(1)));
        setHudTargetLock(lockedTargetName);

        const boss = eng.enemies.find((e) => e.type === 'sky_fortress_boss');
        if (boss) setHudBossHp(Math.round(boss.hp));
      }

      // ====================================================
      // 2.5D / 3D CANVAS FLIGHT RENDERING PASS
      // ====================================================
      // ====================================================
      // 2.5D / 3D CANVAS FLIGHT RENDERING PASS
      // ====================================================
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // --- A. Dynamic Atmosphere Sky & Sun Lens Flare ---
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, activeMission.skyGradient[0]);
      skyGrad.addColorStop(0.55, activeMission.skyGradient[1]);
      skyGrad.addColorStop(1, activeMission.skyGradient[2]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      if (eng.screenShake > 0) {
        const sx = (Math.random() - 0.5) * eng.screenShake;
        const sy = (Math.random() - 0.5) * eng.screenShake;
        ctx.translate(sx, sy);
      }

      // Perspective scale function: Z-depth to screen scale
      const project = (x: number, y: number, z: number) => {
        const focal = 460;
        const depth = Math.max(20, z + 200);
        const scale = focal / depth;
        return {
          sx: centerX + x * scale,
          sy: centerY + y * scale,
          scale,
        };
      };

      // --- B. Distant Horizon Mountain Ridges & Sun Glow ---
      if (activeMission.environment !== 'orbital_space') {
        // Glowing Sun Flare on Horizon
        const sunX = centerX + 180;
        const sunY = centerY - 20;
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 180);
        sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.7)');
        sunGlow.addColorStop(0.3, 'rgba(251, 146, 60, 0.3)');
        sunGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 180, 0, Math.PI * 2);
        ctx.fill();

        // Parallax Distant Mountains Silhouette
        ctx.fillStyle = activeMission.environment === 'tropical_jungle' ? '#064e3b' : '#0f172a';
        ctx.beginPath();
        ctx.moveTo(0, centerY + 20);
        for (let mx = 0; mx <= width; mx += 30) {
          const my = centerY + 10 - Math.sin(mx * 0.015) * 25 - Math.cos(mx * 0.035) * 15;
          ctx.lineTo(mx, my);
        }
        ctx.lineTo(width, centerY + 40);
        ctx.lineTo(0, centerY + 40);
        ctx.closePath();
        ctx.fill();
      }

      // --- C. Environment-Specific Ground & Water Plane (Smooth, Clean & Realistic) ---
      if (activeMission.environment === 'ocean_warships') {
        // Deep Sparkling Ocean Waters
        const waterY = centerY + 20;
        const waterGrad = ctx.createLinearGradient(0, waterY, 0, height);
        waterGrad.addColorStop(0, '#0284c7');
        waterGrad.addColorStop(0.3, '#0369a1');
        waterGrad.addColorStop(0.7, '#075985');
        waterGrad.addColorStop(1, '#082f49');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, waterY, width, height - waterY);
      } else if (activeMission.environment === 'tropical_jungle') {
        // Lush Tropical Rainforest Canopy Surface
        const groundY = centerY + 20;
        const jungleGrad = ctx.createLinearGradient(0, groundY, 0, height);
        jungleGrad.addColorStop(0, '#064e3b');
        jungleGrad.addColorStop(0.5, '#047857');
        jungleGrad.addColorStop(1, '#022c22');
        ctx.fillStyle = jungleGrad;
        ctx.fillRect(0, groundY, width, height - groundY);

        // Winding River Canyon
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let gz = 1400; gz >= 200; gz -= 100) {
          const riverX = Math.sin(gz * 0.006) * 140;
          const p = project(riverX, 280, gz);
          if (gz === 1400) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.stroke();
      } else if (activeMission.environment === 'orbital_space') {
        // Space Starfield & Curved Blue Earth Horizon
        ctx.fillStyle = '#ffffff';
        for (let s = 0; s < 40; s++) {
          const sx = (Math.sin(s * 93.1) * 0.5 + 0.5) * width;
          const sy = (Math.cos(s * 47.7) * 0.5 + 0.5) * (centerY + 10);
          ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        // Curved Earth Limb
        ctx.fillStyle = '#0284c7';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.ellipse(centerX, height + 180, width * 0.85, 280, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // --- D. Draw 3D Ground Props & Naval Ships (Warships, Carriers, Islands, Temples, Skyscrapers) ---
      eng.groundProps.forEach((gp) => {
        const pt = project(gp.x, gp.y, gp.z);
        ctx.save();
        ctx.translate(pt.sx, pt.sy);

        if (gp.type === 'aircraft_carrier') {
          // 3D Aircraft Carrier ('water jahaj') with Flight Deck & Tower
          const deckW = gp.width * pt.scale;
          const deckH = gp.length * pt.scale * 0.5;

          // Water Wake Foam
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.beginPath();
          ctx.ellipse(0, deckH * 0.6, deckW * 0.9, deckH * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Dark Naval Steel Hull
          ctx.fillStyle = gp.color;
          ctx.strokeStyle = gp.accentColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -deckH);
          ctx.lineTo(deckW * 0.5, -deckH * 0.6);
          ctx.lineTo(deckW * 0.5, deckH * 0.7);
          ctx.lineTo(-deckW * 0.5, deckH * 0.7);
          ctx.lineTo(-deckW * 0.5, -deckH * 0.6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Flight Deck Yellow Runway Stripes
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, -deckH * 0.8);
          ctx.lineTo(0, deckH * 0.5);
          ctx.stroke();
          ctx.setLineDash([]);

          // Command Island Tower
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(deckW * 0.25, -deckH * 0.3, deckW * 0.2, deckH * 0.35);
          // Radar Dish
          ctx.strokeStyle = '#38bdf8';
          ctx.strokeRect(deckW * 0.28, -deckH * 0.45, deckW * 0.14, deckH * 0.12);
        } else if (gp.type === 'warship') {
          // 3D Naval Destroyer / Cruiser ('water jahaj')
          const shipW = gp.width * pt.scale;
          const shipH = gp.length * pt.scale * 0.45;

          // Water V-Wake Foam
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -shipH);
          ctx.lineTo(shipW * 0.8, shipH * 0.8);
          ctx.moveTo(0, -shipH);
          ctx.lineTo(-shipW * 0.8, shipH * 0.8);
          ctx.stroke();

          // Warship Hull
          ctx.fillStyle = gp.color;
          ctx.strokeStyle = gp.accentColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -shipH);
          ctx.lineTo(shipW * 0.45, shipH * 0.6);
          ctx.lineTo(-shipW * 0.45, shipH * 0.6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Turret & Bridge
          ctx.fillStyle = '#475569';
          ctx.fillRect(-shipW * 0.2, -shipH * 0.2, shipW * 0.4, shipH * 0.4);
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(0, -shipH * 0.4, shipW * 0.15, 0, Math.PI * 2);
          ctx.fill();
        } else if (gp.type === 'temple_pyramid') {
          // Ancient Tropical Step Pyramid Temple
          const w = gp.width * pt.scale;
          const h = gp.height * pt.scale;

          ctx.fillStyle = '#065f46';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -h);
          ctx.lineTo(w * 0.5, 0);
          ctx.lineTo(-w * 0.5, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Glowing Crystal Apex
          ctx.fillStyle = '#00f0ff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 12;
          ctx.fillRect(-4, -h - 8, 8, 8);
          ctx.shadowBlur = 0;
        } else if (gp.type === 'jungle_island') {
          // Tropical Jungle Island & Palm Trees
          const w = gp.width * pt.scale;
          const h = gp.height * pt.scale;

          ctx.fillStyle = '#065f46';
          ctx.beginPath();
          ctx.ellipse(0, 0, w * 0.5, h * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Green Canopy Clusters
          ctx.fillStyle = '#10b981';
          for (let k = -2; k <= 2; k++) {
            ctx.beginPath();
            ctx.arc(k * (w * 0.15), -h * 0.2, w * 0.12, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (gp.type === 'skyscraper') {
          // 3D Neon Megacity Skyscraper
          const w = gp.width * pt.scale;
          const h = gp.height * pt.scale;

          ctx.fillStyle = gp.color;
          ctx.strokeStyle = gp.accentColor;
          ctx.lineWidth = 1.5;
          ctx.fillRect(-w * 0.5, -h, w, h);
          ctx.strokeRect(-w * 0.5, -h, w, h);

          // Illuminated Windows
          ctx.fillStyle = gp.accentColor;
          for (let wy = -h + 10; wy < -10; wy += 14) {
            for (let wx = -w * 0.35; wx < w * 0.35; wx += 10) {
              ctx.fillRect(wx, wy, 4, 6);
            }
          }

          // Rooftop Spire Light
          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(-2, -h - 12, 4, 12);
        } else if (gp.type === 'volcano_spire') {
          // Volcanic Magma Spire
          const w = gp.width * pt.scale;
          const h = gp.height * pt.scale;

          ctx.fillStyle = '#450a0a';
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -h);
          ctx.lineTo(w * 0.5, 0);
          ctx.lineTo(-w * 0.5, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Magma Glow
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-w * 0.1, -h * 0.2, w * 0.2, h * 0.15);
        } else if (gp.type === 'space_satellite') {
          // Orbital Solar Defense Satellite
          const w = gp.width * pt.scale;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-w * 0.2, -w * 0.2, w * 0.4, w * 0.4);

          // Blue Solar Panels
          ctx.fillStyle = '#0284c7';
          ctx.strokeStyle = '#38bdf8';
          ctx.fillRect(-w * 0.8, -w * 0.15, w * 0.5, w * 0.3);
          ctx.strokeRect(-w * 0.8, -w * 0.15, w * 0.5, w * 0.3);
          ctx.fillRect(w * 0.3, -w * 0.15, w * 0.5, w * 0.3);
          ctx.strokeRect(w * 0.3, -w * 0.15, w * 0.5, w * 0.3);
        }

        ctx.restore();
      });

      // --- F. Draw 3D Floating Missile & Point Supply Pods ---
      eng.supplyPods.forEach((pod) => {
        const pt = project(pod.x, pod.y, pod.z);
        if (pod.z < 20 || pod.z > 1400) return;

        ctx.save();
        ctx.translate(pt.sx, pt.sy);
        ctx.scale(pt.scale * 1.5, pt.scale * 1.5);
        ctx.rotate(pod.rotation);

        // Pulsating Outer Halo
        ctx.strokeStyle = pod.glowColor;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = pod.glowColor;
        ctx.shadowBlur = 18;

        // Rotating Diamond Hexagon Pod
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(16, -8);
        ctx.lineTo(16, 8);
        ctx.lineTo(0, 18);
        ctx.lineTo(-16, 8);
        ctx.lineTo(-16, -8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner Core Icon
        ctx.fillStyle = pod.type === 'missile' ? '#f43f5e' : pod.type === 'health' ? '#10b981' : '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Pod Text Label & Aiming Target Line
        if (pod.z > 80 && pod.z < 1000) {
          ctx.save();
          ctx.translate(pt.sx, pt.sy);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = pod.glowColor;
          ctx.shadowBlur = 10;
          ctx.font = `bold ${Math.round(11 * Math.max(0.7, pt.scale))}px 'Outfit', sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(pod.type === 'missile' ? '🚀 +2 MISSILES' : pod.type === 'health' ? '🛡️ +70 HP' : '⭐ +500 PTS', 0, 32 * pt.scale);

          // Green Target Aiming Point Bracket around Pod
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-20 * pt.scale, -20 * pt.scale, 40 * pt.scale, 40 * pt.scale);
          ctx.restore();
        }
      });

      // --- G. Draw Enemy Jets & Bosses ---
      eng.enemies.forEach((en) => {
        const pt = project(en.x, en.y, en.z);
        ctx.save();
        ctx.translate(pt.sx, pt.sy);
        ctx.scale(pt.scale * 1.4, pt.scale * 1.4);

        // Enemy Jet Body
        ctx.fillStyle = en.type === 'sky_fortress_boss' ? '#4c1d95' : '#b91c1c';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;

        if (en.type === 'sky_fortress_boss') {
          // Giant Mothership
          ctx.fillRect(-60, -30, 120, 60);
          ctx.strokeRect(-60, -30, 120, 60);
        } else {
          // Fighter
          ctx.beginPath();
          ctx.moveTo(0, 24);
          ctx.lineTo(-30, -18);
          ctx.lineTo(0, -10);
          ctx.lineTo(30, -18);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();

        // Lock-On Diamond Reticle around Enemy
        if (en.z > 150 && en.z < 900) {
          ctx.save();
          ctx.translate(pt.sx, pt.sy);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 10;
          ctx.strokeRect(-24 * pt.scale, -24 * pt.scale, 48 * pt.scale, 48 * pt.scale);
          ctx.restore();
        }
      });

      // --- G. Draw Projectiles ---
      eng.projectiles.forEach((proj) => {
        const pt = project(proj.x, proj.y, proj.z);
        ctx.save();
        ctx.translate(pt.sx, pt.sy);
        ctx.fillStyle = proj.color;
        ctx.shadowColor = proj.glowColor;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, proj.type === 'missile' ? 5 * pt.scale : 3.5 * pt.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // --- H. Draw Cockpit Tactical HUD Reticle ---
      if (gameState === 'playing') {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
        ctx.lineWidth = 1.5;

        // Crosshair Center
        ctx.beginPath();
        ctx.moveTo(centerX - 16, centerY);
        ctx.lineTo(centerX - 4, centerY);
        ctx.moveTo(centerX + 4, centerY);
        ctx.lineTo(centerX + 16, centerY);
        ctx.moveTo(centerX, centerY - 16);
        ctx.lineTo(centerX, centerY - 4);
        ctx.moveTo(centerX, centerY + 4);
        ctx.lineTo(centerX, centerY + 16);
        ctx.stroke();

        // Outer Reticle Circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 32, 0, Math.PI * 2);
        ctx.stroke();

        // Pitch Angle Ladder Lines
        ctx.beginPath();
        ctx.moveTo(centerX - 50, centerY - 40);
        ctx.lineTo(centerX - 30, centerY - 40);
        ctx.moveTo(centerX + 30, centerY - 40);
        ctx.lineTo(centerX + 50, centerY - 40);
        ctx.moveTo(centerX - 50, centerY + 40);
        ctx.lineTo(centerX - 30, centerY + 40);
        ctx.moveTo(centerX + 30, centerY + 40);
        ctx.lineTo(centerX + 50, centerY + 40);
        ctx.stroke();
        ctx.restore();
      }

      // --- I. Draw Player Jet (Foreground 3D cockpit perspective) ---
      if (p) {
        ctx.save();
        ctx.translate(centerX + p.x * 0.9, centerY + p.y * 0.9 + 130);
        ctx.rotate(p.rollAngle);

        // Twin Afterburner Flames
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = p.isAfterburning ? 24 : 14;
        ctx.fillRect(-18, 30, 8, p.isAfterburning ? 40 : 20);
        ctx.fillRect(10, 30, 8, p.isAfterburning ? 40 : 20);

        // Delta Wings
        ctx.fillStyle = jet.color;
        ctx.strokeStyle = jet.glowColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -60);
        ctx.lineTo(-75, 20);
        ctx.lineTo(-30, 28);
        ctx.lineTo(0, 20);
        ctx.lineTo(30, 28);
        ctx.lineTo(75, 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cockpit
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.ellipse(0, -25, 8, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // --- J. Draw Particles ---
      eng.particles.forEach((pt) => {
        const pScreen = project(pt.x, pt.y, pt.z);
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pScreen.sx, pScreen.sy, pt.size * pScreen.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // --- K. Draw Floating Texts ---
      eng.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 14;
        ctx.font = `bold ${Math.round(18 * ft.scale)}px 'Impact', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, centerX + ft.x, centerY + ft.y);
        ctx.restore();
      });

      ctx.restore();

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [activeJet, activeJetId, activeMission, activeMissionIndex, fireMissile, gameMode, gameState, playCannonSound, playExplosionSound]);

  // ----------------------------------------------------
  // KEYBOARD HANDLERS
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = true;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.down = true;
      if (['Space'].includes(e.code)) keysRef.current.cannon = true;
      if (['ShiftLeft', 'ShiftRight'].includes(e.code)) keysRef.current.afterburner = true;
      if (['KeyE', 'ControlLeft'].includes(e.code)) keysRef.current.missile = true;
      if (['KeyQ'].includes(e.code)) performBarrelRoll();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.down = false;
      if (['Space'].includes(e.code)) keysRef.current.cannon = false;
      if (['ShiftLeft', 'ShiftRight'].includes(e.code)) keysRef.current.afterburner = false;
      if (['KeyE', 'ControlLeft'].includes(e.code)) keysRef.current.missile = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [performBarrelRoll]);

  // Direct Canvas Touch Navigation Handlers
  const touchStartRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

  const updateFlightTouch = (x: number, y: number, w: number, h: number) => {
    // Horizontal Bank Steer
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

    // Vertical Pitch Steer
    if (y < h * 0.45) {
      keysRef.current.up = true;
      keysRef.current.down = false;
    } else if (y > h * 0.65) {
      keysRef.current.down = true;
      keysRef.current.up = false;
    } else {
      keysRef.current.up = false;
      keysRef.current.down = false;
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
    updateFlightTouch(relX, relY, rect.width, rect.height);
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!touchStartRef.current?.active || gameState !== 'playing') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    updateFlightTouch(relX, relY, rect.width, rect.height);
  };

  const handleCanvasTouchEnd = () => {
    touchStartRef.current = null;
    keysRef.current.left = false;
    keysRef.current.right = false;
    keysRef.current.up = false;
    keysRef.current.down = false;
  };

  // ----------------------------------------------------
  // RENDER JSX UI
  // ----------------------------------------------------
  return (
    <div className="w-full flex flex-col gap-2 select-none">
      {/* EXTERNAL TOP STATUS BAR (OUTSIDE GAME BOX) */}
      <div className="w-full px-4 py-2.5 bg-slate-900/95 border border-cyan-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Credits Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-amber-500/50 text-amber-300 font-black text-xs shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{credits.toLocaleString()} CR</span>
          </div>

          {/* Active Theater Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold">
            <span>{activeMission.badge}</span>
          </div>
        </div>

        {/* Center Mission Stats */}
        {gameState === 'playing' && (
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="text-slate-300">
              SCORE: <span className="text-amber-400 font-mono font-black">{hudScore.toLocaleString()}</span>
            </div>
            <div className="text-slate-300">
              KILLS: <span className="text-cyan-400 font-mono font-black">{hudKills}/{activeMission.targetCount}</span>
            </div>
            {hudTargetLock && (
              <div className="px-2.5 py-0.5 rounded-full bg-rose-600/90 text-white text-[10px] font-black animate-pulse border border-rose-400">
                ⚠️ {hudTargetLock}
              </div>
            )}
          </div>
        )}

        {/* Top Actions: Pause & Sound Toggle */}
        <div className="flex items-center gap-2">
          {gameState === 'playing' && (
            <button
              onClick={() => setGameState('menu')}
              className="px-3 py-1 bg-rose-600/80 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow-sm active:scale-95"
            >
              PAUSE
            </button>
          )}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 transition shadow-sm"
            title="Toggle Sound"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D GAME VIEWPORT BOX (100% PURE UNOBSTRUCTED GAME CANVAS & TOUCH SURFACE) */}
      <div className="relative w-full h-[460px] sm:h-[500px] md:h-[540px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/30 flex flex-col">
        {/* Background Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

        {/* Direct Interactive Touch Steering Layer on Game Canvas */}
        {gameState === 'playing' && (
          <div
            onTouchStart={handleCanvasTouchStart}
            onTouchMove={handleCanvasTouchMove}
            onTouchEnd={handleCanvasTouchEnd}
            onTouchCancel={handleCanvasTouchEnd}
            onMouseDown={handleCanvasTouchStart}
            onMouseMove={handleCanvasTouchMove}
            onMouseUp={handleCanvasTouchEnd}
            className="absolute inset-0 z-10 cursor-pointer touch-none"
            title="Touch & drag anywhere to steer"
          />
        )}

      {/* MAIN MENU OVERLAY */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full flex flex-col items-center gap-6">
            {/* Glowing Logo */}
            <div className="flex flex-col items-center">
              <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 font-bold text-xs tracking-widest uppercase mb-2 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <Plane className="w-3.5 h-3.5 text-cyan-400" />
                <span>3D JET DOGFIGHT</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.8)] font-sans">
                CYBER AIR COMBAT 3D
              </h1>
              <p className="text-slate-400 text-xs md:text-sm font-medium mt-1">
                Supersonic Mach 3+ jet dogfights! Heat-seeking missiles & aerial barrel rolls.
              </p>
            </div>

            {/* Selected Jet Display Banner */}
            <div className="w-full p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md border"
                  style={{ backgroundColor: activeJet.color, borderColor: activeJet.glowColor }}
                >
                  <Plane className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-white font-black text-sm">{activeJet.name}</div>
                  <div className="text-cyan-400 text-xs font-bold">Mach {activeJet.topSpeed} • {activeJet.missileCapacity} Missiles</div>
                </div>
              </div>
              <button
                onClick={() => setGameState('hangar')}
                className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-cyan-300 font-bold text-xs transition flex items-center gap-1"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> HANGAR
              </button>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => startMission('campaign', 0)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-lg tracking-wider transition shadow-[0_0_25px_rgba(6,182,212,0.7)] flex items-center justify-center gap-2 active:scale-98"
              >
                <Play className="w-6 h-6 fill-current" /> PLAY CAMPAIGN MISSIONS
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setGameState('missions')}
                  className="py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Trophy className="w-4 h-4 text-amber-400" /> SELECT OPERATIONS
                </button>

                <button
                  onClick={() => setGameState('instructions')}
                  className="py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <HelpCircle className="w-4 h-4 text-cyan-400" /> HOW TO FLY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HANGAR / JET FIGHTERS SHOWROOM */}
      {gameState === 'hangar' && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">
                HANGAR & JET ROSTER
              </h2>
              <p className="text-xs text-slate-400">Unlock supersonic stealth fighters and heavy missile platforms</p>
            </div>
            <button
              onClick={() => setGameState('menu')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              BACK TO MENU
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {JET_FIGHTERS.map((jet) => {
              const isUnlocked = unlockedJetIds.includes(jet.id);
              const isSelected = activeJetId === jet.id;
              const canAfford = credits >= jet.price;

              return (
                <div
                  key={jet.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                      : isUnlocked
                      ? 'bg-slate-900/80 border-slate-700/80'
                      : 'bg-slate-950/80 border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border-2"
                        style={{ backgroundColor: jet.color, borderColor: jet.glowColor }}
                      >
                        <Plane className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-black text-base">{jet.name}</div>
                        <div className="text-xs text-slate-400">{jet.description}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400 text-[10px] font-black">
                        SELECTED
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-300">
                    <div>Speed: <span className="text-cyan-400">Mach {jet.topSpeed}</span></div>
                    <div>Cannon: <span className="text-rose-400">{jet.cannonDmg} DMG</span></div>
                    <div>Missiles: <span className="text-amber-400">{jet.missileCapacity}</span></div>
                  </div>

                  {isUnlocked ? (
                    <button
                      onClick={() => {
                        setActiveJetId(jet.id);
                        localStorage.setItem('cyber_air_active_jet', jet.id);
                        sound.playClick();
                      }}
                      disabled={isSelected}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 cursor-default'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                      }`}
                    >
                      {isSelected ? 'SELECTED' : 'SELECT FIGHTER'}
                    </button>
                  ) : (
                    <button
                      onClick={() => buyJet(jet)}
                      disabled={!canAfford}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-lg'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>UNLOCK FOR {jet.price} CR</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MISSIONS MODAL */}
      {gameState === 'missions' && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400">
                AIR OPERATIONS & THEATER MISSIONS
              </h2>
              <p className="text-xs text-slate-400">Deploy into diverse warzones: Ocean Fleet, Rainforest Gorges & Orbital Space</p>
            </div>
            <button
              onClick={() => setGameState('menu')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              BACK TO MENU
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 max-w-4xl mx-auto w-full">
            {AIR_MISSIONS.map((msn, idx) => {
              const isUnlocked = completedMissionIds.includes(msn.id) || idx === 0;

              return (
                <div
                  key={msn.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-xl ${
                    isUnlocked
                      ? 'bg-slate-900/90 border-slate-700 hover:border-cyan-500/50'
                      : 'bg-slate-950/80 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center font-black text-cyan-400 text-base">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-black text-sm">{msn.title}</span>
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                            {msn.badge}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{msn.theater}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span className="text-xs font-black">+{msn.rewardCredits} CR</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    🎯 <strong>Objective:</strong> {msn.objective}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-bold text-slate-400">
                      Targets: <strong className="text-cyan-400">{msn.targetCount} Hostiles</strong> {msn.hasBoss && '• ⚠️ BOSS FIGHT'}
                    </span>

                    {isUnlocked ? (
                      <button
                        onClick={() => startMission('campaign', idx)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs transition shadow-md flex items-center gap-1.5 active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> SCRAMBLE
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold px-3 py-2 bg-slate-950 rounded-xl border border-slate-800">
                        <Lock className="w-3.5 h-3.5" /> LOCKED
                      </div>
                    )}
                  </div>
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
            <h2 className="text-2xl font-black text-cyan-400">FLIGHT COMBAT BRIEFING & CONTROLS</h2>
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
                <Plane className="w-5 h-5" /> Desktop Flight Controls
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li><strong className="text-white">[W, A, S, D] / [Arrows]</strong> — Pitch & Bank Steer Jet</li>
                <li><strong className="text-white">[SPACE]</strong> — Fire Rapid Plasma Laser Cannons</li>
                <li><strong className="text-white">[E] / [CTRL]</strong> — Fire Heat-Seeking Micro-Missiles</li>
                <li><strong className="text-white">[SHIFT]</strong> — Supersonic Afterburner Overdrive</li>
                <li><strong className="text-white">[Q]</strong> — High-G Barrel Roll Missile Evasion</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-amber-400 font-bold text-base flex items-center gap-2">
                <Trophy className="w-5 h-5" /> Top Gun Tactics
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>• <strong>Lock-On:</strong> Align crosshairs with enemy jets until the red lock bracket beeps!</li>
                <li>• <strong>Barrel Roll:</strong> Spin when you see incoming enemy red laser tracers to dodge!</li>
                <li>• <strong>Afterburners:</strong> Use fuel bursts to close in on fast stealth bombers.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY SCREEN */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full flex flex-col items-center gap-5 p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/40 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-cyan-600/20 border-2 border-cyan-500 text-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.6)]">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-3xl font-black text-white tracking-wider">AIR MISSION ACCOMPLISHED!</h2>
              <p className="text-xs text-slate-400 mt-1">Hostile air fleet completely neutralized!</p>
            </div>

            <div className="w-full p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">MISSION BOUNTY</div>
              <div className="text-2xl font-black text-amber-400">+{activeMission.rewardCredits} CR</div>
            </div>

            <div className="w-full flex flex-col gap-2.5">
              {activeMissionIndex < AIR_MISSIONS.length - 1 ? (
                <button
                  onClick={() => startMission('campaign', activeMissionIndex + 1)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm tracking-wider transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" /> NEXT AIR OPERATION
                </button>
              ) : (
                <button
                  onClick={() => startMission('campaign', 0)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm tracking-wider transition shadow-lg flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> REPLAY OPERATIONS
                </button>
              )}

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

      {/* GAME OVER SCREEN */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full flex flex-col items-center gap-5 p-6 rounded-3xl bg-slate-900/90 border border-rose-500/40 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-600/20 border-2 border-rose-500 text-rose-400 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.6)]">
              <Skull className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-3xl font-black text-white tracking-wider">MAYDAY! SHOT DOWN</h2>
              <p className="text-xs text-slate-400 mt-1">Ejected from combat airspace!</p>
            </div>

            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={() => startMission(gameMode, activeMissionIndex)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm tracking-wider transition shadow-lg flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> RETRY OPERATION
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

      {/* EXTERNAL MOBILE ACTION CONTROL DECK (OUTSIDE GAME BOX) */}
      {gameState === 'playing' && (
        <div className="w-full p-3.5 bg-slate-900/95 border border-cyan-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-md">
          {/* Jet Health & Speed Status Deck */}
          <div className="flex items-center gap-3 text-xs">
            {/* Health Bar */}
            <div className="flex flex-col gap-1 w-32 sm:w-40">
              <div className="flex justify-between text-[11px] font-bold text-slate-300">
                <span className="text-cyan-400 font-mono">MACH {hudMachSpeed}</span>
                <span>{hudHp}/{hudMaxHp} HP</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-100"
                  style={{ width: `${Math.max(0, (hudHp / hudMaxHp) * 100)}%` }}
                />
              </div>
            </div>

            {/* Boost Fuel */}
            <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-400 text-[11px] font-bold">
              BOOST: {hudFuel}%
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Barrel Roll */}
            <button
              onClick={performBarrelRoll}
              className="px-3.5 py-2.5 rounded-xl bg-purple-600 active:bg-purple-500 active:scale-95 border border-purple-400 text-white font-black text-xs transition shadow-md flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ROLL</span>
            </button>

            {/* Afterburner Boost */}
            <button
              onMouseDown={() => (keysRef.current.afterburner = true)}
              onMouseUp={() => (keysRef.current.afterburner = false)}
              onTouchStart={() => (keysRef.current.afterburner = true)}
              onTouchEnd={() => (keysRef.current.afterburner = false)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 active:scale-95 border border-amber-300 text-white font-black text-xs transition shadow-[0_0_12px_rgba(245,158,11,0.5)] flex items-center gap-1"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>BOOST</span>
            </button>

            {/* Lock-On Missile */}
            <button
              onClick={fireMissile}
              disabled={hudMissiles <= 0}
              className={`px-4 py-2.5 rounded-xl border text-white font-black text-xs transition shadow-md flex items-center gap-1 ${
                hudMissiles > 0
                  ? 'bg-rose-600 active:bg-rose-500 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                  : 'bg-slate-800 border-slate-700 text-slate-500 opacity-60'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>MISSILE ({hudMissiles})</span>
            </button>

            {/* Rapid Laser Cannon */}
            <button
              onMouseDown={() => (keysRef.current.cannon = true)}
              onMouseUp={() => (keysRef.current.cannon = false)}
              onTouchStart={() => (keysRef.current.cannon = true)}
              onTouchEnd={() => (keysRef.current.cannon = false)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 active:scale-95 border border-cyan-300 text-white font-black text-xs transition shadow-[0_0_15px_rgba(6,182,212,0.7)] flex items-center gap-1"
            >
              <Crosshair className="w-4 h-4" />
              <span>CANNON</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
