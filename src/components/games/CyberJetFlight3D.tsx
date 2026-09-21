import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Shield,
  Zap,
  Crosshair,
  ArrowLeft,
  Trophy,
  Star,
  ChevronRight,
  Navigation,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft as ArrowIconLeft,
  ArrowRight as ArrowIconRight,
  Flame,
  ShoppingBag,
  Lock,
  Check,
  Activity,
  Gauge,
  Award,
  Radio,
} from 'lucide-react';
import { sound } from '../../utils/audio';

// --- Types & Data Definitions ---

export interface JetConfig {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  baseSpeed: number;
  maxShield: number;
  laserType: 'single' | 'twin' | 'triple';
  color: number;
  emissive: number;
  accent: number;
  description: string;
}

export const JET_GARAGE: JetConfig[] = [
  {
    id: 'falcon',
    name: 'CYBER FALCON',
    subtitle: 'Standard Tactical Interceptor',
    price: 0,
    baseSpeed: 75,
    maxShield: 100,
    laserType: 'single',
    color: 0x00f2fe,
    emissive: 0x00f2fe,
    accent: 0xff007f,
    description: 'Agile & reliable starter jet fitted with precision single plasma cannons.',
  },
  {
    id: 'viper',
    name: 'VIPER CYBER',
    subtitle: 'High Velocity Pursuit Fighter',
    price: 1500,
    baseSpeed: 95,
    maxShield: 85,
    laserType: 'twin',
    color: 0xffea00,
    emissive: 0xffaa00,
    accent: 0x00f2fe,
    description: 'Blazing speed fighter equipped with twin burst plasma emitters.',
  },
  {
    id: 'phantom',
    name: 'PHANTOM STEALTH',
    subtitle: 'Heavy Shielded Assault Craft',
    price: 3500,
    baseSpeed: 70,
    maxShield: 160,
    laserType: 'twin',
    color: 0xa855f7,
    emissive: 0x9333ea,
    accent: 0xec4899,
    description: 'Reinforced stealth composite hull designed to absorb heavy fire.',
  },
  {
    id: 'apex',
    name: 'APEX DOMINATOR',
    subtitle: 'Ultimate Quantum Dreadnought',
    price: 7500,
    baseSpeed: 110,
    maxShield: 140,
    laserType: 'triple',
    color: 0x00ffcc,
    emissive: 0x00ffaa,
    accent: 0xff0055,
    description: 'The pinnacle of aerospace tech. Fires 3-way spread plasma salvos.',
  },
];

interface EnvironmentTheme {
  skyColor: number;
  fogColor: number;
  sunColor: number;
  gridColor: number;
  gridCenter: number;
  accentColor: number;
  hasAsteroids?: boolean;
}

const ENV_THEMES: Record<number, EnvironmentTheme> = {
  1: { skyColor: 0x06030e, fogColor: 0x120625, sunColor: 0xff007f, gridColor: 0x00f2fe, gridCenter: 0xff007f, accentColor: 0x00f2fe },
  2: { skyColor: 0x1a0a00, fogColor: 0x2e1202, sunColor: 0xff6600, gridColor: 0xffaa00, gridCenter: 0xff4400, accentColor: 0xffaa00 },
  3: { skyColor: 0x08021a, fogColor: 0x1a0836, sunColor: 0xaa00ff, gridColor: 0x00e1ff, gridCenter: 0xd400ff, accentColor: 0x00e1ff },
  4: { skyColor: 0x02170d, fogColor: 0x052e1b, sunColor: 0x00ff66, gridColor: 0x00ffaa, gridCenter: 0x00cc44, accentColor: 0x00ffaa },
  5: { skyColor: 0x030a1c, fogColor: 0x08183d, sunColor: 0x0088ff, gridColor: 0x00f2fe, gridCenter: 0x00e1ff, accentColor: 0x00f2fe },
  6: { skyColor: 0x081b2e, fogColor: 0x0f3659, sunColor: 0x00d9ff, gridColor: 0x70e6ff, gridCenter: 0xffea00, accentColor: 0x70e6ff },
  7: { skyColor: 0x1a0303, fogColor: 0x380505, sunColor: 0xff0033, gridColor: 0xff3300, gridCenter: 0xff6600, accentColor: 0xff3300 },
  8: { skyColor: 0x020208, fogColor: 0x08081a, sunColor: 0x6600ff, gridColor: 0x9933ff, gridCenter: 0x00ffff, accentColor: 0x9933ff, hasAsteroids: true },
  9: { skyColor: 0x140d02, fogColor: 0x301f05, sunColor: 0xffcc00, gridColor: 0xff9900, gridCenter: 0xffee00, accentColor: 0xff9900 },
  10: { skyColor: 0x140214, fogColor: 0x300530, sunColor: 0xff00cc, gridColor: 0x00ffff, gridCenter: 0xffea00, accentColor: 0x00ffff },
};

export type PowerupType = 'SHIELD' | 'BOOST' | 'TRIPLE' | 'MAGNET' | 'TIME';

interface PowerupData {
  id: number;
  type: PowerupType;
  x: number;
  y: number;
  z: number;
}

interface RingData {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  isGold?: boolean;
}

interface DroneData {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  hp: number;
  isBoss?: boolean;
}

interface LaserBarrierData {
  id: number;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  moveAxis: 'X' | 'Y';
  speed: number;
}

interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  targetRings: number;
  timeLimit: number;
  rings: RingData[];
  drones: DroneData[];
  powerups: PowerupData[];
  barriers: LaserBarrierData[];
  description: string;
  hasBoss?: boolean;
  bossHp?: number;
}

const GENERATE_LEVELS = (): LevelConfig[] => {
  const levels: LevelConfig[] = [];

  const titles = [
    { name: 'Neon Horizon', subtitle: 'Synthwave City Skyline', desc: 'Fly through 10 neon ring gates over the glowing metropolis.' },
    { name: 'Cyber Sunrise', subtitle: 'Golden Solar Slalom', desc: 'Navigate golden skyscrapers and collect powerup energy orbs.' },
    { name: 'Neon Storm', subtitle: 'Electric Thunder Pass', desc: 'Dodge hostile plasma drones amidst electric storm cloud fog.' },
    { name: 'Acid Spire Canyon', subtitle: 'Toxic Matrix Grid', desc: 'Thread tight gaps between giant green obsidian spire towers.' },
    { name: 'Quantum Warp Tunnel', subtitle: 'Core Defense Boss', desc: 'Break through laser barriers and defeat the Quantum Sentinel Boss!' },
    { name: 'Cloud Stratosphere', subtitle: 'High-Altitude Run', desc: 'Speeds run through cloud islands with hyper turbo boost rings.' },
    { name: 'Volcanic Obsidian', subtitle: 'Magma Canyon Run', desc: 'Dodge fiery mines and laser barricades across molten canyons.' },
    { name: 'Deep Space Sector', subtitle: 'Asteroid Belt Guardian', desc: 'Fight through floating asteroids and destroy the Sector Dreadnought!' },
    { name: 'Solar Eclipse', subtitle: 'Golden Gate Trial', desc: 'Precision flying through rotating solar shield gates.' },
    { name: 'Apex Titan Core', subtitle: 'The Ultimate Showdown', desc: 'Defeat the Mega Titan Dreadnought in the hyper-chroma matrix core!' },
  ];

  for (let i = 0; i < 10; i++) {
    const ringCount = 10 + i * 2;
    const rings: RingData[] = [];
    const drones: DroneData[] = [];
    const powerups: PowerupData[] = [];
    const barriers: LaserBarrierData[] = [];

    let currentZ = -220;
    let currentX = 0;
    let currentY = 30;

    const powerTypes: PowerupType[] = ['SHIELD', 'BOOST', 'TRIPLE', 'MAGNET', 'TIME'];

    for (let r = 0; r < ringCount; r++) {
      currentZ -= 250;
      const angle = (r / ringCount) * Math.PI * (1.6 + i * 0.2);
      const sweepX = Math.sin(angle) * (45 + i * 7);
      const sweepY = Math.cos(angle * 0.7) * (26 + i * 4);

      currentX = sweepX;
      currentY = 35 + sweepY;

      const isGold = r % 4 === 3 || r === ringCount - 1;
      rings.push({
        id: r,
        x: currentX,
        y: currentY,
        z: currentZ,
        radius: isGold ? 17 : 15,
        isGold,
      });

      // Spawn Powerups on track
      if (r > 0 && r % 3 === 0) {
        const pType = powerTypes[r % powerTypes.length];
        powerups.push({
          id: r,
          type: pType,
          x: currentX + (Math.random() - 0.5) * 20,
          y: currentY + (Math.random() - 0.5) * 15,
          z: currentZ - 80,
        });
      }

      // Spawn Drones
      if (r > 0 && r % 2 === 0) {
        drones.push({
          id: r,
          x: currentX + (Math.random() - 0.5) * 50,
          y: currentY + (Math.random() - 0.5) * 30,
          z: currentZ - 120,
          radius: 8,
          hp: 2 + Math.floor(i / 3),
        });
      }

      // Spawn Moving Laser Barriers
      if (i >= 3 && r % 4 === 2) {
        barriers.push({
          id: r,
          x: currentX,
          y: currentY,
          z: currentZ - 160,
          width: 35,
          height: 25,
          moveAxis: r % 2 === 0 ? 'X' : 'Y',
          speed: 15 + i * 3,
        });
      }
    }

    const hasBoss = i === 4 || i === 7 || i === 9;
    const bossHp = i === 4 ? 40 : i === 7 ? 75 : 120;

    if (hasBoss) {
      drones.push({
        id: 9999,
        x: currentX,
        y: currentY + 10,
        z: currentZ - 350,
        radius: 22,
        hp: bossHp,
        isBoss: true,
      });
    }

    levels.push({
      id: i + 1,
      name: titles[i].name,
      subtitle: titles[i].subtitle,
      targetRings: ringCount,
      timeLimit: 90 + i * 25,
      rings,
      drones,
      powerups,
      barriers,
      description: titles[i].desc,
      hasBoss,
      bossHp,
    });
  }

  return levels;
};

const GAME_LEVELS = GENERATE_LEVELS();

export const CyberJetFlight3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Game Core Navigation & Storage
  const [gameState, setGameState] = useState<'SELECT' | 'GARAGE' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('SELECT');
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [unlockedLevels, setUnlockedLevels] = useState<number>(() => {
    const saved = localStorage.getItem('cyber_jet_unlocked_lvl');
    return saved ? parseInt(saved, 10) : 10;
  });

  const [credits, setCredits] = useState<number>(() => {
    const saved = localStorage.getItem('cyber_jet_credits');
    return saved ? parseInt(saved, 10) : 500;
  });

  const [selectedJetId, setSelectedJetId] = useState<string>(() => {
    const saved = localStorage.getItem('cyber_jet_selected');
    return saved || 'falcon';
  });

  const [ownedJetIds, setOwnedJetIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('cyber_jet_owned');
    return saved ? JSON.parse(saved) : ['falcon'];
  });

  const [levelStars, setLevelStars] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem('cyber_jet_stars');
    return saved ? JSON.parse(saved) : {};
  });

  // Active Gameplay Metrics & HUD State
  const [score, setScore] = useState<number>(0);
  const [sessionCredits, setSessionCredits] = useState<number>(0);
  const [ringsPassed, setRingsPassed] = useState<number>(0);
  const [dronesDestroyed, setDronesDestroyed] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [speed, setSpeed] = useState<number>(100);
  const [boostEnergy, setBoostEnergy] = useState<number>(100);
  const [jetShield, setJetShield] = useState<number>(100);
  const [maxShield, setMaxShield] = useState<number>(100);
  const [isHit, setIsHit] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());
  const [nextRingDist, setNextRingDist] = useState<number>(0);
  const [comboCount, setComboCount] = useState<number>(0);
  const [activeTripleTimer, setActiveTripleTimer] = useState<number>(0);
  const [activeMagnetTimer, setActiveMagnetTimer] = useState<number>(0);
  const [bossHp, setBossHp] = useState<number | null>(null);
  const [maxBossHp, setMaxBossHp] = useState<number | null>(null);
  const [pickupBanner, setPickupBanner] = useState<string | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const jetRef = useRef<THREE.Group | null>(null);
  const arrowRef = useRef<THREE.Mesh | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Particles & VFX Array References
  const exhaustParticlesRef = useRef<{ mesh: THREE.Mesh; life: number; vy: number; vz: number }[]>([]);
  const explosionParticlesRef = useRef<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; color: number }[]>([]);

  // Mouse & Touch Control Position Tracker
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchState = useRef({ up: false, down: false, left: false, right: false, boost: false });

  // Jet Flight Physics State
  const flightState = useRef({
    x: 0,
    y: 30,
    z: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    targetX: 0,
    targetY: 30,
    speed: 70,
    isBoosting: false,
    ringsCleared: 0,
    scoreCount: 0,
    dronesCount: 0,
    laserCooldown: 0,
    comboStreak: 0,
    tripleTimer: 0,
    magnetTimer: 0,
    creditsEarned: 0,
  });

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const activeRingsRef = useRef<{ mesh: THREE.Group; ringData: RingData; cleared: boolean }[]>([]);
  const activeDronesRef = useRef<{ mesh: THREE.Group; droneData: DroneData; destroyed: boolean; currentHp: number }[]>([]);
  const activePowerupsRef = useRef<{ mesh: THREE.Group; powerupData: PowerupData; collected: boolean }[]>([]);
  const activeBarriersRef = useRef<{ mesh: THREE.Group; barrierData: LaserBarrierData; initialX: number; initialY: number }[]>([]);
  const lasersRef = useRef<{ mesh: THREE.Group; vz: number; life: number }[]>([]);
  const enemyLasersRef = useRef<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }[]>([]);
  const droneShootTimers = useRef<{ [droneId: number]: number }>({});

  const activeJetConfig = JET_GARAGE.find((j) => j.id === selectedJetId) || JET_GARAGE[0];

  // Save Progress Helpers
  const saveProgress = (levelId: number, stars: number, earnedCreds: number) => {
    const updatedStars = { ...levelStars, [levelId]: Math.max(levelStars[levelId] || 0, stars) };
    setLevelStars(updatedStars);
    localStorage.setItem('cyber_jet_stars', JSON.stringify(updatedStars));

    const nextUnlocked = Math.max(unlockedLevels, Math.min(10, levelId + 1));
    setUnlockedLevels(nextUnlocked);
    localStorage.setItem('cyber_jet_unlocked_lvl', String(nextUnlocked));

    const updatedCreds = credits + earnedCreds;
    setCredits(updatedCreds);
    localStorage.setItem('cyber_jet_credits', String(updatedCreds));
  };

  const buyJet = (jet: JetConfig) => {
    if (credits >= jet.price && !ownedJetIds.includes(jet.id)) {
      const newCreds = credits - jet.price;
      const newOwned = [...ownedJetIds, jet.id];
      setCredits(newCreds);
      setOwnedJetIds(newOwned);
      setSelectedJetId(jet.id);

      localStorage.setItem('cyber_jet_credits', String(newCreds));
      localStorage.setItem('cyber_jet_owned', JSON.stringify(newOwned));
      localStorage.setItem('cyber_jet_selected', jet.id);
      sound.playWin();
    } else {
      sound.playHit();
    }
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        if (gameState === 'PLAYING') {
          e.preventDefault();
        }
      }
      keysPressed.current[e.code] = true;
      if (e.code === 'Space' && gameState === 'PLAYING') {
        fireLaser();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, selectedJetId]);

  // Touch Handlers for Screen Steering
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (gameState !== 'PLAYING' || !mountRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = mountRef.current.getBoundingClientRect();
    const nx = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((touch.clientY - rect.top) / rect.height) * 2 - 1);

    mousePos.current = { x: nx, y: ny };
    fireLaser();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (gameState !== 'PLAYING' || !mountRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = mountRef.current.getBoundingClientRect();
    const nx = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((touch.clientY - rect.top) / rect.height) * 2 - 1);

    mousePos.current = { x: nx, y: ny };
  };

  const handleTouchEnd = () => {
    mousePos.current = { x: 0, y: 0 };
  };

  // Launch Game Level
  const startLevel = (levelIndex: number) => {
    setCurrentLevelIdx(levelIndex);
    const levelConfig = GAME_LEVELS[levelIndex];

    const jet = JET_GARAGE.find((j) => j.id === selectedJetId) || JET_GARAGE[0];

    flightState.current = {
      x: 0,
      y: 30,
      z: 0,
      pitch: 0,
      roll: 0,
      yaw: 0,
      targetX: 0,
      targetY: 30,
      speed: jet.baseSpeed,
      isBoosting: false,
      ringsCleared: 0,
      scoreCount: 0,
      dronesCount: 0,
      laserCooldown: 0,
      comboStreak: 0,
      tripleTimer: 0,
      magnetTimer: 0,
      creditsEarned: 0,
    };

    setRingsPassed(0);
    setDronesDestroyed(0);
    setScore(0);
    setSessionCredits(0);
    setComboCount(0);
    setTimeLeft(levelConfig.timeLimit);
    setBoostEnergy(100);
    setJetShield(jet.maxShield);
    setMaxShield(jet.maxShield);
    setIsHit(false);
    setActiveTripleTimer(0);
    setActiveMagnetTimer(0);
    droneShootTimers.current = {};

    if (levelConfig.hasBoss && levelConfig.bossHp) {
      setBossHp(levelConfig.bossHp);
      setMaxBossHp(levelConfig.bossHp);
    } else {
      setBossHp(null);
      setMaxBossHp(null);
    }

    setGameState('PLAYING');
    sound.playClick();
  };

  // Mouse Aim Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'PLAYING' || !mountRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    mousePos.current = { x: nx, y: ny };
  };

  const handleMouseDown = () => {
    if (gameState === 'PLAYING') {
      fireLaser();
    }
  };

  // Initialize Three.js Scene
  useEffect(() => {
    if (!mountRef.current || gameState !== 'PLAYING') return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const currentTheme = ENV_THEMES[currentLevelIdx + 1] || ENV_THEMES[1];

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(currentTheme.skyColor);
    scene.fog = new THREE.FogExp2(currentTheme.fogColor, 0.0011);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 2200);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(currentTheme.sunColor, 2.0);
    dirLight.position.set(100, 300, 100);
    scene.add(dirLight);

    const themeLight = new THREE.PointLight(currentTheme.accentColor, 3.5, 600);
    themeLight.position.set(0, 90, -200);
    scene.add(themeLight);

    // Build Environment & Celestial Objects
    createEnvironment(scene, currentTheme);

    // Build Player Cyber Jet
    const jetGroup = createCyberJetMesh(activeJetConfig);
    scene.add(jetGroup);
    jetRef.current = jetGroup;

    // Guidance Waypoint Arrow
    const arrowMesh = createGuidanceArrow();
    jetGroup.add(arrowMesh);
    arrowRef.current = arrowMesh;

    const levelConfig = GAME_LEVELS[currentLevelIdx];
    activeRingsRef.current = [];
    activeDronesRef.current = [];
    activePowerupsRef.current = [];
    activeBarriersRef.current = [];
    lasersRef.current = [];
    enemyLasersRef.current = [];
    exhaustParticlesRef.current = [];
    explosionParticlesRef.current = [];

    // Spawn Ring Gates
    levelConfig.rings.forEach((ringData) => {
      const ringGroup = createRingGateMesh(ringData, currentTheme);
      ringGroup.position.set(ringData.x, ringData.y, ringData.z);
      scene.add(ringGroup);
      activeRingsRef.current.push({ mesh: ringGroup, ringData, cleared: false });
    });

    // Spawn Powerups
    levelConfig.powerups.forEach((pData) => {
      const pMesh = createPowerupMesh(pData.type);
      pMesh.position.set(pData.x, pData.y, pData.z);
      scene.add(pMesh);
      activePowerupsRef.current.push({ mesh: pMesh, powerupData: pData, collected: false });
    });

    // Spawn Drones & Boss
    levelConfig.drones.forEach((droneData) => {
      const droneGroup = droneData.isBoss ? createBossMesh() : createDroneMesh();
      droneGroup.position.set(droneData.x, droneData.y, droneData.z);
      scene.add(droneGroup);
      activeDronesRef.current.push({
        mesh: droneGroup,
        droneData,
        destroyed: false,
        currentHp: droneData.hp,
      });
      droneShootTimers.current[droneData.id] = 1.0 + Math.random() * 2.0;
    });

    // Spawn Laser Barriers
    levelConfig.barriers.forEach((bData) => {
      const barrierMesh = createLaserBarrierMesh(bData);
      barrierMesh.position.set(bData.x, bData.y, bData.z);
      scene.add(barrierMesh);
      activeBarriersRef.current.push({
        mesh: barrierMesh,
        barrierData: bData,
        initialX: bData.x,
        initialY: bData.y,
      });
    });

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();
    const animate = (time: number) => {
      animFrameId.current = requestAnimationFrame(animate);
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      updatePhysics(delta, levelConfig, currentTheme);
      renderer.render(scene, camera);
    };

    animFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }
    };
  }, [gameState, currentLevelIdx, selectedJetId]);

  // Environment Construction (Sky, Sun, Stars, City Towers, Asteroids)
  const createEnvironment = (scene: THREE.Scene, theme: EnvironmentTheme) => {
    // Celestial Sun
    const sunGeo = new THREE.CircleGeometry(190, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: theme.sunColor, side: THREE.DoubleSide });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 120, -1700);
    scene.add(sun);

    // Starfield Particle Field
    const starsGeo = new THREE.BufferGeometry();
    const coords = [];
    for (let i = 0; i < 1800; i++) {
      coords.push(
        (Math.random() - 0.5) * 1800,
        Math.random() * 600 + 10,
        (Math.random() - 0.5) * 3200
      );
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
    const starsMat = new THREE.PointsMaterial({ color: theme.gridColor, size: 2.5 });
    const starfield = new THREE.Points(starsGeo, starsMat);
    scene.add(starfield);

    // Synthwave Ground Grid
    const grid = new THREE.GridHelper(4400, 110, theme.gridCenter, theme.gridColor);
    grid.position.y = 0;
    scene.add(grid);

    // Floating Asteroid Belt or City Buildings
    if (theme.hasAsteroids) {
      const rockGeo = new THREE.DodecahedronGeometry(12, 1);
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x332244, roughness: 0.9 });
      for (let i = 0; i < 90; i++) {
        const rock = new THREE.Mesh(rockGeo, rockMat);
        const scale = Math.random() * 2.5 + 0.8;
        rock.scale.set(scale, scale, scale);
        rock.position.set(
          (Math.random() - 0.5) * 500,
          Math.random() * 120 + 10,
          -Math.random() * 2800
        );
        scene.add(rock);
      }
    } else {
      const boxGeo = new THREE.BoxGeometry(1, 1, 1);
      for (let i = 0; i < 130; i++) {
        const h = Math.random() * 150 + 40;
        const w = Math.random() * 32 + 20;
        const d = Math.random() * 32 + 20;

        const mat = new THREE.MeshStandardMaterial({
          color: 0x070410,
          emissive: Math.random() > 0.4 ? theme.gridColor : theme.sunColor,
          emissiveIntensity: 0.3,
          roughness: 0.2,
        });

        const building = new THREE.Mesh(boxGeo, mat);
        building.scale.set(w, h, d);

        const side = i % 2 === 0 ? 1 : -1;
        const x = side * (Math.random() * 260 + 110);
        const z = -Math.random() * 3000;
        building.position.set(x, h / 2, z);

        scene.add(building);
      }
    }
  };

  // Player Cyber Jet Mesh Generator
  const createCyberJetMesh = (jetConfig: JetConfig): THREE.Group => {
    const jet = new THREE.Group();

    // Fuselage
    const noseGeo = new THREE.ConeGeometry(1.5, 6.5, 8);
    noseGeo.rotateX(Math.PI / 2);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.z = -2.6;
    jet.add(nose);

    // Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(6.2, -2.2);
    wingShape.lineTo(6.2, -5.0);
    wingShape.lineTo(0, -3.2);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.1 });
    const wingMat = new THREE.MeshStandardMaterial({
      color: jetConfig.color,
      emissive: jetConfig.emissive,
      emissiveIntensity: 0.85,
      metalness: 0.8,
    });

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.rotateX(Math.PI / 2);
    rightWing.position.set(0.5, 0, 0);
    jet.add(rightWing);

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.rotateX(Math.PI / 2);
    leftWing.scale.set(-1, 1, 1);
    leftWing.position.set(-0.5, 0, 0);
    jet.add(leftWing);

    // Glowing Cockpit Canopy
    const canopyGeo = new THREE.SphereGeometry(1.0, 16, 16);
    canopyGeo.scale(0.85, 0.75, 2.3);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: jetConfig.accent,
      emissive: jetConfig.accent,
      emissiveIntensity: 0.95,
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.95, -0.5);
    jet.add(canopy);

    // Dual Plasma Engines
    const thrusterGeo = new THREE.CylinderGeometry(0.7, 0.4, 2.2, 12);
    thrusterGeo.rotateX(Math.PI / 2);
    const thrusterMat = new THREE.MeshBasicMaterial({ color: jetConfig.emissive });

    const leftThruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    leftThruster.position.set(-1.2, 0, 3.5);
    jet.add(leftThruster);

    const rightThruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    rightThruster.position.set(1.2, 0, 3.5);
    jet.add(rightThruster);

    return jet;
  };

  // 3D Guidance Arrow
  const createGuidanceArrow = (): THREE.Mesh => {
    const arrowGeo = new THREE.ConeGeometry(0.85, 2.6, 6);
    arrowGeo.rotateX(Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.set(0, 4.2, -4.2);
    return arrow;
  };

  // Ring Gate Mesh
  const createRingGateMesh = (ringData: RingData, theme: EnvironmentTheme): THREE.Group => {
    const group = new THREE.Group();

    const torusGeo = new THREE.TorusGeometry(ringData.radius, 1.3, 16, 32);
    const ringColor = ringData.isGold ? 0xffea00 : theme.gridColor;
    const ringMat = new THREE.MeshStandardMaterial({
      color: ringColor,
      emissive: ringColor,
      emissiveIntensity: 1.0,
      metalness: 0.9,
    });
    const ringMesh = new THREE.Mesh(torusGeo, ringMat);
    group.add(ringMesh);

    const portalGeo = new THREE.CircleGeometry(ringData.radius - 1, 32);
    const portalMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    group.add(portal);

    return group;
  };

  // Collectible 3D Powerup Orb Mesh Generator
  const createPowerupMesh = (type: PowerupType): THREE.Group => {
    const group = new THREE.Group();

    const colors: Record<PowerupType, number> = {
      SHIELD: 0x00f2fe,
      BOOST: 0xffea00,
      TRIPLE: 0xff00ff,
      MAGNET: 0xffff00,
      TIME: 0x00ff66,
    };

    const orbGeo = new THREE.SphereGeometry(3.0, 16, 16);
    const orbMat = new THREE.MeshStandardMaterial({
      color: colors[type],
      emissive: colors[type],
      emissiveIntensity: 1.2,
      wireframe: true,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    group.add(orb);

    const ringGeo = new THREE.TorusGeometry(5.0, 0.4, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: colors[type] });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    return group;
  };

  // Drone Enemy Mesh
  const createDroneMesh = (): THREE.Group => {
    const group = new THREE.Group();

    const coreGeo = new THREE.IcosahedronGeometry(3.6, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      emissive: 0xff0055,
      emissiveIntensity: 0.95,
      wireframe: true,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const ringGeo = new THREE.TorusGeometry(6.2, 0.5, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    return group;
  };

  // Boss Dreadnought Mesh
  const createBossMesh = (): THREE.Group => {
    const group = new THREE.Group();

    const coreGeo = new THREE.OctahedronGeometry(12, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0033,
      emissiveIntensity: 1.2,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const ringGeo = new THREE.TorusGeometry(20, 1.8, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    return group;
  };

  // Moving Laser Barrier Mesh
  const createLaserBarrierMesh = (bData: LaserBarrierData): THREE.Group => {
    const group = new THREE.Group();

    const frameGeo = new THREE.BoxGeometry(bData.width, bData.height, 1);
    const frameMat = new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    group.add(frame);

    const beamGeo = new THREE.PlaneGeometry(bData.width - 2, bData.height - 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff0033,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    group.add(beam);

    return group;
  };

  // Trigger Particle Explosion Effect
  const spawnExplosion = (pos: THREE.Vector3, colorHex: number) => {
    if (!sceneRef.current) return;
    const pGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const pMat = new THREE.MeshBasicMaterial({ color: colorHex });

    for (let i = 0; i < 18; i++) {
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.position.copy(pos);

      const vx = (Math.random() - 0.5) * 35;
      const vy = (Math.random() - 0.5) * 35;
      const vz = (Math.random() - 0.5) * 35;

      sceneRef.current.add(mesh);
      explosionParticlesRef.current.push({ mesh, vx, vy, vz, life: 0.6, color: colorHex });
    }
  };

  // Fire Player Plasma Lasers
  const fireLaser = () => {
    if (!sceneRef.current || !jetRef.current || flightState.current.laserCooldown > 0) return;

    flightState.current.laserCooldown = 0.14;
    sound.playLaser();

    const hasTriple = flightState.current.tripleTimer > 0 || activeJetConfig.laserType === 'triple';
    const isTwin = activeJetConfig.laserType === 'twin';

    const spawnLaserBolt = (offsetX: number, angleY: number = 0) => {
      const group = new THREE.Group();
      const laserGeo = new THREE.CylinderGeometry(0.45, 0.45, 12, 8);
      laserGeo.rotateX(Math.PI / 2);
      const laserMat = new THREE.MeshBasicMaterial({ color: activeJetConfig.emissive });
      const mesh = new THREE.Mesh(laserGeo, laserMat);
      group.add(mesh);

      group.position.copy(jetRef.current!.position);
      group.position.x += offsetX;
      group.position.z -= 5;
      group.rotation.y = angleY;

      sceneRef.current?.add(group);
      lasersRef.current.push({ mesh: group, vz: -18, life: 1.4 });
    };

    if (hasTriple) {
      spawnLaserBolt(0, 0);
      spawnLaserBolt(-4, 0.15);
      spawnLaserBolt(4, -0.15);
    } else if (isTwin) {
      spawnLaserBolt(-2.5, 0);
      spawnLaserBolt(2.5, 0);
    } else {
      spawnLaserBolt(0, 0);
    }
  };

  // Fire Hostile Drone Laser Bolt
  const spawnEnemyLaser = (dronePos: THREE.Vector3, jetPos: THREE.Vector3) => {
    if (!sceneRef.current) return;

    const laserGeo = new THREE.SphereGeometry(1.3, 8, 8);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const mesh = new THREE.Mesh(laserGeo, laserMat);
    mesh.position.copy(dronePos);

    const dir = new THREE.Vector3().subVectors(jetPos, dronePos).normalize();
    const speed = 75;

    sceneRef.current.add(mesh);
    enemyLasersRef.current.push({
      mesh,
      vx: dir.x * speed,
      vy: dir.y * speed,
      vz: dir.z * speed,
      life: 2.6,
    });
  };

  // Main Frame Physics & Gameplay Loop
  const updatePhysics = (delta: number, levelConfig: LevelConfig, theme: EnvironmentTheme) => {
    if (!jetRef.current || !cameraRef.current) return;

    const fs = flightState.current;

    // Update Timers
    if (fs.laserCooldown > 0) fs.laserCooldown -= delta;
    if (fs.tripleTimer > 0) {
      fs.tripleTimer -= delta;
      setActiveTripleTimer(Math.ceil(fs.tripleTimer));
    } else {
      setActiveTripleTimer(0);
    }

    if (fs.magnetTimer > 0) {
      fs.magnetTimer -= delta;
      setActiveMagnetTimer(Math.ceil(fs.magnetTimer));
    } else {
      setActiveMagnetTimer(0);
    }

    let inputX = 0;
    let inputY = 0;
    let boosting = false;

    // 1. Keyboard Input
    if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) inputX -= 1;
    if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) inputX += 1;
    if (keysPressed.current['KeyW'] || keysPressed.current['ArrowUp']) inputY += 1;
    if (keysPressed.current['KeyS'] || keysPressed.current['ArrowDown']) inputY -= 1;
    if (keysPressed.current['ShiftLeft'] || keysPressed.current['ShiftRight']) boosting = true;

    // 2. Mobile On-Screen Controls Input
    if (touchState.current.left) inputX -= 1;
    if (touchState.current.right) inputX += 1;
    if (touchState.current.up) inputY += 1;
    if (touchState.current.down) inputY -= 1;
    if (touchState.current.boost) boosting = true;

    // 3. Mouse Aim Input
    if (mousePos.current.x !== 0 || mousePos.current.y !== 0) {
      inputX += mousePos.current.x * 1.25;
      inputY += mousePos.current.y * 1.25;
    }

    // Boost & Speed Physics
    if (boosting && boostEnergy > 0) {
      fs.speed = activeJetConfig.baseSpeed * 1.6;
      setBoostEnergy((prev) => Math.max(0, prev - delta * 38));
    } else {
      fs.speed = activeJetConfig.baseSpeed;
      setBoostEnergy((prev) => Math.min(100, prev + delta * 22));
    }
    setSpeed(Math.round(fs.speed));

    // Move Jet Position
    fs.targetX += inputX * 68 * delta;
    fs.targetY += inputY * 52 * delta;

    fs.targetX = THREE.MathUtils.clamp(fs.targetX, -105, 105);
    fs.targetY = THREE.MathUtils.clamp(fs.targetY, 10, 90);

    fs.x = THREE.MathUtils.lerp(fs.x, fs.targetX, delta * 6.5);
    fs.y = THREE.MathUtils.lerp(fs.y, fs.targetY, delta * 6.5);
    fs.z -= fs.speed * delta;

    fs.roll = THREE.MathUtils.lerp(fs.roll, -inputX * 0.85, delta * 8.5);
    fs.pitch = THREE.MathUtils.lerp(fs.pitch, inputY * 0.55, delta * 8.5);

    jetRef.current.position.set(fs.x, fs.y, fs.z);
    jetRef.current.rotation.set(fs.pitch, 0, fs.roll);

    cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, fs.x * 0.72, delta * 6.5);
    cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, fs.y + 7.5, delta * 6.5);
    cameraRef.current.position.z = fs.z + 21;
    cameraRef.current.lookAt(fs.x * 0.45, fs.y, fs.z - 50);

    // Update 3D Guidance Arrow
    const nextRingObj = activeRingsRef.current.find((r) => !r.cleared);
    if (nextRingObj) {
      const ringPos = nextRingObj.mesh.position;
      if (arrowRef.current) {
        arrowRef.current.lookAt(ringPos.x, ringPos.y, ringPos.z);
      }
      const distToRing = Math.round(jetRef.current.position.distanceTo(ringPos));
      setNextRingDist(distToRing);
    }

    // Moving Laser Barriers Physics
    activeBarriersRef.current.forEach((bItem) => {
      const bData = bItem.barrierData;
      const t = performance.now() / 1000;
      if (bData.moveAxis === 'X') {
        bItem.mesh.position.x = bItem.initialX + Math.sin(t * (bData.speed / 10)) * 25;
      } else {
        bItem.mesh.position.y = bItem.initialY + Math.cos(t * (bData.speed / 10)) * 15;
      }

      // Barrier Collision
      const distZ = Math.abs(jetRef.current!.position.z - bItem.mesh.position.z);
      if (distZ < 5) {
        const dx = Math.abs(jetRef.current!.position.x - bItem.mesh.position.x);
        const dy = Math.abs(jetRef.current!.position.y - bItem.mesh.position.y);
        if (dx < bData.width / 2 && dy < bData.height / 2) {
          sound.playHit();
          setIsHit(true);
          setTimeout(() => setIsHit(false), 200);

          setJetShield((prev) => {
            const nextShield = prev - 20;
            if (nextShield <= 0) setGameState('GAMEOVER');
            return Math.max(0, nextShield);
          });
        }
      }
    });

    // Ring Magnet Logic & Collection
    const currentZ = jetRef.current.position.z;
    activeRingsRef.current.forEach((item) => {
      if (item.cleared) return;

      item.mesh.rotation.z += delta * 1.5;

      if (fs.magnetTimer > 0) {
        const rPos = item.mesh.position;
        if (Math.abs(rPos.z - fs.z) < 200) {
          rPos.x = THREE.MathUtils.lerp(rPos.x, fs.x, delta * 3);
          rPos.y = THREE.MathUtils.lerp(rPos.y, fs.y, delta * 3);
        }
      }

      const ringZ = item.mesh.position.z;
      if (currentZ <= ringZ + 25 && currentZ >= ringZ - 30) {
        const dx = jetRef.current!.position.x - item.mesh.position.x;
        const dy = jetRef.current!.position.y - item.mesh.position.y;
        const dist2D = Math.sqrt(dx * dx + dy * dy);

        if (dist2D <= item.ringData.radius + 8) {
          item.cleared = true;
          item.mesh.scale.set(1.6, 1.6, 1.6);
          sound.playCoin();

          fs.ringsCleared += 1;
          fs.comboStreak += 1;
          setComboCount(fs.comboStreak);

          const multiplier = Math.min(5, 1 + Math.floor(fs.comboStreak / 3));
          const basePoints = item.ringData.isGold ? 800 : 400;
          const totalPoints = basePoints * multiplier;

          fs.scoreCount += totalPoints;
          fs.creditsEarned += item.ringData.isGold ? 50 : 20;

          if (item.ringData.isGold) {
            setTimeLeft((prev) => Math.min(levelConfig.timeLimit + 20, prev + 5));
            setJetShield((prev) => Math.min(activeJetConfig.maxShield, prev + 20));
          }

          setRingsPassed(fs.ringsCleared);
          setScore(fs.scoreCount);
          setSessionCredits(fs.creditsEarned);

          spawnExplosion(item.mesh.position, item.ringData.isGold ? 0xffea00 : theme.gridColor);

          if (fs.ringsCleared >= levelConfig.targetRings) {
            handleVictory(levelConfig);
          }
        }
      }
    });

    // Collectible Powerup Orbs Logic
    activePowerupsRef.current.forEach((pItem) => {
      if (pItem.collected) return;

      pItem.mesh.rotation.y += delta * 3;
      const dist = pItem.mesh.position.distanceTo(jetRef.current!.position);

      if (dist < 12) {
        pItem.collected = true;
        sceneRef.current?.remove(pItem.mesh);
        sound.playPowerup();

        const pType = pItem.powerupData.type;
        if (pType === 'SHIELD') {
          setJetShield((prev) => Math.min(activeJetConfig.maxShield, prev + 30));
          showBanner('🛡️ SHIELD REPAIRED (+30 HP)');
        } else if (pType === 'BOOST') {
          setBoostEnergy(100);
          showBanner('⚡ HYPER BOOST CHARGED');
        } else if (pType === 'TRIPLE') {
          fs.tripleTimer = 10;
          showBanner('💥 TRIPLE LASER ACTIVATED');
        } else if (pType === 'MAGNET') {
          fs.magnetTimer = 12;
          showBanner('🧲 RING MAGNET FIELD');
        } else if (pType === 'TIME') {
          setTimeLeft((prev) => prev + 10);
          showBanner('⏱️ +10 SECONDS BONUS TIME');
        }
      }
    });

    // Enemy Drone AI & Boss Combat
    activeDronesRef.current.forEach((droneItem) => {
      if (droneItem.destroyed) return;

      droneItem.mesh.rotation.y += delta * 2;

      const droneId = droneItem.droneData.id;
      droneShootTimers.current[droneId] = (droneShootTimers.current[droneId] || 2) - delta;

      const distToJet = droneItem.mesh.position.distanceTo(jetRef.current!.position);
      if (droneShootTimers.current[droneId] <= 0 && distToJet < 600 && droneItem.mesh.position.z < jetRef.current!.position.z) {
        droneShootTimers.current[droneId] = droneItem.droneData.isBoss ? 1.0 : 2.2 + Math.random() * 1.5;
        spawnEnemyLaser(droneItem.mesh.position, jetRef.current!.position);
      }

      // Check Player Lasers hitting Drones
      lasersRef.current.forEach((laser) => {
        const d = laser.mesh.position.distanceTo(droneItem.mesh.position);
        if (d < droneItem.droneData.radius + 6) {
          droneItem.currentHp -= 1;
          spawnExplosion(laser.mesh.position, 0x00f2fe);

          if (droneItem.droneData.isBoss) {
            setBossHp(Math.max(0, droneItem.currentHp));
          }

          if (droneItem.currentHp <= 0) {
            droneItem.destroyed = true;
            sceneRef.current?.remove(droneItem.mesh);
            sound.playExplosion();
            spawnExplosion(droneItem.mesh.position, droneItem.droneData.isBoss ? 0xff0000 : 0xff00aa);

            if (droneItem.droneData.isBoss) {
              fs.scoreCount += 5000;
              fs.creditsEarned += 2000;
              showBanner('🏆 BOSS DESTROYED! BONUS +2000 CREDITS');
              setBossHp(0);
            } else {
              fs.dronesCount += 1;
              fs.scoreCount += 700;
              fs.creditsEarned += 50;
              setDronesDestroyed(fs.dronesCount);
            }

            setScore(fs.scoreCount);
            setSessionCredits(fs.creditsEarned);
          }
        }
      });
    });

    // Hostile Lasers Hit Player Detection
    for (let i = enemyLasersRef.current.length - 1; i >= 0; i--) {
      const laser = enemyLasersRef.current[i];
      laser.mesh.position.x += laser.vx * delta;
      laser.mesh.position.y += laser.vy * delta;
      laser.mesh.position.z += laser.vz * delta;
      laser.life -= delta;

      const distToPlayer = laser.mesh.position.distanceTo(jetRef.current.position);
      if (distToPlayer < 7.5) {
        sound.playHit();
        setIsHit(true);
        setTimeout(() => setIsHit(false), 200);

        setJetShield((prev) => {
          const nextShield = prev - 15;
          if (nextShield <= 0) setGameState('GAMEOVER');
          return Math.max(0, nextShield);
        });

        sceneRef.current?.remove(laser.mesh);
        enemyLasersRef.current.splice(i, 1);
        continue;
      }

      if (laser.life <= 0) {
        sceneRef.current?.remove(laser.mesh);
        enemyLasersRef.current.splice(i, 1);
      }
    }

    // Player Lasers Movement
    for (let i = lasersRef.current.length - 1; i >= 0; i--) {
      const laser = lasersRef.current[i];
      laser.mesh.position.z += laser.vz;
      laser.life -= delta;

      if (laser.life <= 0) {
        sceneRef.current?.remove(laser.mesh);
        lasersRef.current.splice(i, 1);
      }
    }

    // Update Particle Explosions
    for (let i = explosionParticlesRef.current.length - 1; i >= 0; i--) {
      const p = explosionParticlesRef.current[i];
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.position.z += p.vz * delta;
      p.life -= delta;

      if (p.life <= 0) {
        sceneRef.current?.remove(p.mesh);
        explosionParticlesRef.current.splice(i, 1);
      }
    }

    // Time Limit Countdown
    setTimeLeft((prev) => {
      const nextTime = prev - delta;
      if (nextTime <= 0) {
        setGameState('GAMEOVER');
        sound.playHit();
      }
      return Math.max(0, nextTime);
    });
  };

  const showBanner = (text: string) => {
    setPickupBanner(text);
    setTimeout(() => setPickupBanner(null), 2500);
  };

  const handleVictory = (levelConfig: LevelConfig) => {
    sound.playWin();
    const calculatedStars = timeLeft > levelConfig.timeLimit * 0.4 ? 3 : timeLeft > levelConfig.timeLimit * 0.2 ? 2 : 1;
    saveProgress(levelConfig.id, calculatedStars, flightState.current.creditsEarned);
    setGameState('VICTORY');
  };

  const activeLevel = GAME_LEVELS[currentLevelIdx];

  return (
    <div className="flex flex-col w-full font-sans select-none touch-none" style={{ touchAction: 'none' }}>
      {/* --- 3D GAME SCREEN VIEWPORT CONTAINER --- */}
      <div
        className={`relative w-full h-[520px] md:h-[720px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/20 transition-colors duration-100 ${
          isHit ? 'ring-4 ring-red-500 bg-red-950/30' : ''
        }`}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Red Damage Hit Flash */}
        {isHit && <div className="absolute inset-0 z-50 bg-red-500/20 pointer-events-none animate-pulse" />}

        {/* --- LEVEL SELECTION SCREEN --- */}
        {gameState === 'SELECT' && (
          <div className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-slate-950 via-purple-950/40 to-slate-950 p-6 md:p-8 overflow-y-auto">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-300 tracking-wider">
                  CYBER JET FLIGHT 3D
                </h1>
                <p className="text-cyan-400/80 text-sm mt-0.5">Select mission level or upgrade your fighter jet</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-slate-900/90 border border-amber-500/40 px-4 py-2 rounded-xl flex items-center gap-2 text-amber-300 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>{credits} CREDITS</span>
                </div>

                <button
                  onClick={() => setGameState('GARAGE')}
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white rounded-xl shadow-lg hover:brightness-110 transition flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" /> HANGAR GARAGE
                </button>

                <button
                  onClick={() => setIsMuted(sound.toggleMute())}
                  className="p-2.5 bg-slate-900 border border-cyan-500/30 rounded-xl text-cyan-400 hover:bg-cyan-500/20 transition"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Level Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-auto">
              {GAME_LEVELS.map((lvl, idx) => {
                const isUnlocked = lvl.id <= unlockedLevels;
                const stars = levelStars[lvl.id] || 0;

                return (
                  <button
                    key={lvl.id}
                    disabled={!isUnlocked}
                    onClick={() => startLevel(idx)}
                    className={`relative p-5 rounded-2xl border text-left transition-all group overflow-hidden ${
                      isUnlocked
                        ? 'bg-slate-900/80 border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(0,242,254,0.3)] hover:-translate-y-1'
                        : 'bg-slate-950/60 border-slate-800 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 rounded-full flex items-center gap-1">
                        {lvl.hasBoss && <Radio className="w-3 h-3 text-red-400 animate-pulse" />} LEVEL {lvl.id}
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3].map((starNum) => (
                          <Star
                            key={starNum}
                            className={`w-4 h-4 ${
                              starNum <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <h3 className="text-lg font-extrabold text-white group-hover:text-cyan-300 transition flex items-center gap-2">
                      {lvl.name}
                      {!isUnlocked && <Lock className="w-4 h-4 text-slate-500" />}
                    </h3>
                    <p className="text-xs text-pink-400 font-semibold mb-2">{lvl.subtitle}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{lvl.description}</p>

                    <div className="mt-4 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                      <span>Target: {lvl.targetRings} Rings</span>
                      <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* --- JET HANGAR GARAGE --- */}
        {gameState === 'GARAGE' && (
          <div className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setGameState('SELECT')}
                className="px-4 py-2 bg-slate-900 border border-cyan-500/30 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition flex items-center gap-2 font-bold"
              >
                <ArrowLeft className="w-5 h-5" /> LEVEL SELECT
              </button>

              <div className="text-center">
                <h2 className="text-2xl font-black text-white">JET HANGAR & GARAGE</h2>
                <p className="text-xs text-cyan-400">Unlock & select your tactical fighter jet</p>
              </div>

              <div className="bg-slate-900 border border-amber-500/40 px-4 py-2 rounded-xl text-amber-300 font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{credits} CREDITS</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-auto">
              {JET_GARAGE.map((jet) => {
                const isOwned = ownedJetIds.includes(jet.id);
                const isSelected = selectedJetId === jet.id;

                return (
                  <div
                    key={jet.id}
                    className={`relative p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'bg-gradient-to-b from-cyan-950/60 to-slate-900 border-cyan-400 shadow-[0_0_30px_rgba(0,242,254,0.3)] scale-[1.02]'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-bold px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 rounded-full">
                          {jet.laserType.toUpperCase()} PLASMA
                        </span>
                        {isSelected && (
                          <span className="text-xs font-bold px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-full flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> ACTIVE
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-extrabold text-white mb-1">{jet.name}</h3>
                      <p className="text-xs text-pink-400 font-semibold mb-3">{jet.subtitle}</p>
                      <p className="text-xs text-slate-400 mb-4">{jet.description}</p>

                      {/* Jet Specs Bars */}
                      <div className="space-y-2 text-xs text-slate-300 mb-6 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>SPEED: {jet.baseSpeed} KM/H</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400" style={{ width: `${(jet.baseSpeed / 120) * 100}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span>SHIELD: {jet.maxShield} HP</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${(jet.maxShield / 160) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {isOwned ? (
                      <button
                        onClick={() => setSelectedJetId(jet.id)}
                        disabled={isSelected}
                        className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 cursor-default'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                        }`}
                      >
                        {isSelected ? 'EQUIPPED' : 'SELECT JET'}
                      </button>
                    ) : (
                      <button
                        onClick={() => buyJet(jet)}
                        className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                          credits >= jet.price
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4" /> UNLOCK ({jet.price} CREDITS)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- THREE.JS CANVAS MOUNT --- */}
        {gameState === 'PLAYING' && <div ref={mountRef} className="absolute inset-0 z-0 cursor-crosshair" />}

        {/* --- COCKPIT HUD OVERLAY --- */}
        {gameState === 'PLAYING' && (
          <div className="absolute inset-0 z-10 pointer-events-none p-4 md:p-6 flex flex-col justify-between">
            {/* Top Info Bar */}
            <div className="flex justify-between items-start gap-4">
              <div className="bg-slate-950/85 border border-cyan-500/30 backdrop-blur-md px-4 py-2.5 rounded-xl text-white">
                <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider">
                  {activeLevel.name} (LVL {activeLevel.id})
                </div>
                <div className="text-xl font-black text-amber-400">
                  RINGS: {ringsPassed} / {activeLevel.targetRings}
                </div>
              </div>

              {/* Waypoint Distance */}
              <div className="bg-slate-950/85 border border-amber-500/40 backdrop-blur-md px-4 py-2.5 rounded-xl text-center flex items-center gap-2 text-amber-300">
                <Navigation className="w-5 h-5 animate-pulse text-amber-400" />
                <div>
                  <div className="text-[10px] text-amber-400/80 font-bold uppercase">NEXT RING</div>
                  <div className="text-base font-black">{nextRingDist} M</div>
                </div>
              </div>

              {/* Score & Time */}
              <div className="flex gap-3">
                <div className="bg-slate-950/85 border border-cyan-500/30 backdrop-blur-md px-4 py-2.5 rounded-xl text-right">
                  <div className="text-xs text-slate-400 font-semibold">TIME</div>
                  <div className={`text-xl font-black ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-cyan-300'}`}>
                    {Math.ceil(timeLeft)}s
                  </div>
                </div>
                <div className="bg-slate-950/85 border border-pink-500/30 backdrop-blur-md px-4 py-2.5 rounded-xl text-right">
                  <div className="text-xs text-pink-400 font-semibold">SCORE</div>
                  <div className="text-xl font-black text-pink-300">{score}</div>
                </div>
              </div>
            </div>

            {/* Boss Health Bar Banner (If Boss Level) */}
            {bossHp !== null && maxBossHp !== null && (
              <div className="self-center bg-slate-950/90 border border-red-500/50 backdrop-blur-md px-6 py-2 rounded-2xl w-80 md:w-96 text-center space-y-1">
                <div className="text-xs font-black text-red-500 tracking-widest uppercase flex items-center justify-center gap-2">
                  <Radio className="w-4 h-4 animate-pulse" /> BOSS DREADNOUGHT ({bossHp} / {maxBossHp} HP)
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-red-500/30">
                  <div className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-150" style={{ width: `${(bossHp / maxBossHp) * 100}%` }} />
                </div>
              </div>
            )}

            {/* Powerup Event Banner Overlay */}
            {pickupBanner && (
              <div className="self-center bg-cyan-950/90 border border-cyan-400 text-cyan-300 font-extrabold px-6 py-2 rounded-full shadow-2xl animate-bounce text-sm">
                {pickupBanner}
              </div>
            )}

            {/* Center Cockpit Reticle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60 pointer-events-none">
              <Crosshair className="w-16 h-16 text-cyan-400 animate-pulse" />
            </div>

            {/* Bottom Bar Gauges */}
            <div className="flex justify-between items-end gap-2 md:gap-4 pointer-events-auto">
              {/* Jet Shield & Speed Gauges */}
              <div className="bg-slate-950/85 border border-cyan-500/30 backdrop-blur-md p-3 rounded-xl w-48 md:w-56 space-y-2">
                <div>
                  <div className="flex justify-between text-xs font-bold text-cyan-400 mb-1">
                    <span>SHIELD</span>
                    <span>{jetShield} HP</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        jetShield > 50 ? 'bg-emerald-400' : jetShield > 25 ? 'bg-amber-400' : 'bg-red-500 animate-pulse'
                      }`}
                      style={{ width: `${(jetShield / maxShield) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-cyan-400 mb-1">
                    <span>SPEED: {speed} KM/H</span>
                    <span>BOOST</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 transition-all duration-100"
                      style={{ width: `${boostEnergy}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Combo & Active Powerup Status Badges */}
              <div className="flex gap-2 items-center">
                {comboCount > 1 && (
                  <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black px-4 py-2 rounded-xl text-sm shadow-lg animate-pulse">
                    {comboCount}x STREAK!
                  </div>
                )}
                {activeTripleTimer > 0 && (
                  <div className="bg-pink-900/80 border border-pink-400 text-pink-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1">
                    <Zap className="w-4 h-4 text-pink-400" /> TRIPLE ({activeTripleTimer}s)
                  </div>
                )}
                {activeMagnetTimer > 0 && (
                  <div className="bg-amber-900/80 border border-amber-400 text-amber-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-amber-400" /> MAGNET ({activeMagnetTimer}s)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- GAMEOVER OVERLAY --- */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-4xl font-black text-red-500 mb-2">MISSION FAILED</h2>
            <p className="text-slate-300 mb-6">
              {jetShield <= 0 ? 'Jet Shield was destroyed by enemy plasma lasers!' : 'Time ran out before reaching all ring targets.'}
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => startLevel(currentLevelIdx)}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 font-bold text-white rounded-xl shadow-lg hover:brightness-110 transition flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> RETRY
              </button>
              <button
                onClick={() => setGameState('SELECT')}
                className="px-6 py-3 bg-slate-800 border border-slate-700 font-bold text-slate-200 rounded-xl hover:bg-slate-700 transition"
              >
                LEVEL SELECT
              </button>
            </div>
          </div>
        )}

        {/* --- VICTORY OVERLAY --- */}
        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="p-4 bg-amber-500/20 border border-amber-400/40 rounded-full mb-3 text-amber-400 animate-bounce">
              <Trophy className="w-12 h-12" />
            </div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 mb-2">
              MISSION ACCOMPLISHED!
            </h2>
            <p className="text-cyan-300 font-semibold mb-4">{activeLevel.name} Cleared</p>

            <div className="bg-slate-900/80 border border-cyan-500/30 p-4 rounded-2xl mb-6 w-72 text-slate-200 space-y-2">
              <div className="flex justify-between">
                <span>FINAL SCORE:</span>
                <span className="font-bold text-amber-400">{score}</span>
              </div>
              <div className="flex justify-between">
                <span>RINGS CLEARED:</span>
                <span className="font-bold text-cyan-400">{ringsPassed}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800 text-amber-300 font-bold">
                <span>CREDITS EARNED:</span>
                <span>+{sessionCredits}</span>
              </div>
            </div>

            <div className="flex gap-4">
              {currentLevelIdx < GAME_LEVELS.length - 1 && (
                <button
                  onClick={() => startLevel(currentLevelIdx + 1)}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-pink-500 font-bold text-white rounded-xl shadow-lg hover:brightness-110 transition flex items-center gap-2"
                >
                  NEXT LEVEL <ChevronRight className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setGameState('SELECT')}
                className="px-6 py-3 bg-slate-800 border border-slate-700 font-bold text-slate-200 rounded-xl hover:bg-slate-700 transition"
              >
                LEVEL SELECT
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- DEDICATED MOBILE TOUCH CONTROLS BOX UNDERNEATH GAME SCREEN --- */}
      {gameState === 'PLAYING' && (
        <div className="md:hidden flex justify-between items-center gap-3 p-3.5 mt-3 bg-slate-900/90 border border-cyan-500/30 rounded-2xl backdrop-blur-md shadow-xl">
          {/* Touch D-Pad Steering Box (Left Side) */}
          <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-950/90 border border-cyan-500/30 rounded-2xl shadow-inner">
            <div />
            <button
              onTouchStart={() => (touchState.current.up = true)}
              onTouchEnd={() => (touchState.current.up = false)}
              className="w-12 h-12 bg-slate-800 border border-cyan-400/50 rounded-xl flex items-center justify-center text-cyan-300 active:bg-cyan-500 active:text-white shadow-md"
            >
              <ArrowUp className="w-6 h-6" />
            </button>
            <div />
            <button
              onTouchStart={() => (touchState.current.left = true)}
              onTouchEnd={() => (touchState.current.left = false)}
              className="w-12 h-12 bg-slate-800 border border-cyan-400/50 rounded-xl flex items-center justify-center text-cyan-300 active:bg-cyan-500 active:text-white shadow-md"
            >
              <ArrowIconLeft className="w-6 h-6" />
            </button>
            <button
              onTouchStart={() => (touchState.current.down = true)}
              onTouchEnd={() => (touchState.current.down = false)}
              className="w-12 h-12 bg-slate-800 border border-cyan-400/50 rounded-xl flex items-center justify-center text-cyan-300 active:bg-cyan-500 active:text-white shadow-md"
            >
              <ArrowDown className="w-6 h-6" />
            </button>
            <button
              onTouchStart={() => (touchState.current.right = true)}
              onTouchEnd={() => (touchState.current.right = false)}
              className="w-12 h-12 bg-slate-800 border border-cyan-400/50 rounded-xl flex items-center justify-center text-cyan-300 active:bg-cyan-500 active:text-white shadow-md"
            >
              <ArrowIconRight className="w-6 h-6" />
            </button>
          </div>

          {/* Action Buttons Box (Right Side) */}
          <div className="flex gap-2">
            <button
              onTouchStart={() => (touchState.current.boost = true)}
              onTouchEnd={() => (touchState.current.boost = false)}
              className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 border border-amber-300/40 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg active:scale-95 transition"
            >
              <Flame className="w-6 h-6 mb-0.5" />
              <span className="text-[10px] font-black tracking-wider">BOOST</span>
            </button>
            <button
              onClick={fireLaser}
              className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 border border-pink-300/40 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg active:scale-95 transition"
            >
              <Zap className="w-6 h-6 mb-0.5" />
              <span className="text-[10px] font-black tracking-wider">FIRE</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
