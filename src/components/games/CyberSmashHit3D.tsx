import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  Trophy, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Play, 
  Crosshair, Award, Flame, Star, CheckCircle, ArrowRight, Eye,
  Hourglass, Bomb, Radio, Gauge, Maximize2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// TYPES & CONFIG
// ----------------------------------------------------

export interface BallSkin {
  id: string;
  name: string;
  nameGuj: string;
  price: number;
  unlocked: boolean;
  color: number;
  emissive: number;
  roughness: number;
  metalness: number;
  previewEmoji: string;
  description: string;
}

export interface SectorTheme {
  id: number;
  name: string;
  nameGuj: string;
  fogColor: number;
  wallColor: number;
  crystalColor: number;
  glassColor: number;
  accentColor: string;
  targetDist: number; // distance in meters to complete sector
  speed: number;
}

const SECTOR_THEMES: SectorTheme[] = [
  {
    id: 1,
    name: 'Sector 1: Cyber Azure',
    nameGuj: 'સેક્ટર 1: સાયબર એઝ્યુર',
    fogColor: 0x030d1e,
    wallColor: 0x0284c7,
    crystalColor: 0x00f0ff,
    glassColor: 0x38bdf8,
    accentColor: '#00f0ff',
    targetDist: 600,
    speed: 18,
  },
  {
    id: 2,
    name: 'Sector 2: Neon Lotus',
    nameGuj: 'સેક્ટર 2: નિયોન લોટસ',
    fogColor: 0x160524,
    wallColor: 0x7c3aed,
    crystalColor: 0xd946ef,
    glassColor: 0xc084fc,
    accentColor: '#d946ef',
    targetDist: 1400,
    speed: 21,
  },
  {
    id: 3,
    name: 'Sector 3: Emerald Grid',
    nameGuj: 'સેક્ટર 3: એમરાલ્ડ ગ્રીડ',
    fogColor: 0x041a12,
    wallColor: 0x059669,
    crystalColor: 0x10b981,
    glassColor: 0x34d399,
    accentColor: '#10b981',
    targetDist: 2300,
    speed: 24,
  },
  {
    id: 4,
    name: 'Sector 4: Solar Amber',
    nameGuj: 'સેક્ટર 4: સોલર એમ્બર',
    fogColor: 0x1f0e02,
    wallColor: 0xd97706,
    crystalColor: 0xf59e0b,
    glassColor: 0xfbbf24,
    accentColor: '#f59e0b',
    targetDist: 3300,
    speed: 27,
  },
  {
    id: 5,
    name: 'Sector 5: Crimson Vortex',
    nameGuj: 'સેક્ટર 5: ક્રિમસન વોર્ટેક્સ',
    fogColor: 0x1e030a,
    wallColor: 0xbe123c,
    crystalColor: 0xf43f5e,
    glassColor: 0xfb7185,
    accentColor: '#f43f5e',
    targetDist: 4400,
    speed: 30,
  },
  {
    id: 6,
    name: 'Sector 6: Golden Core',
    nameGuj: 'સેક્ટર 6: ગોલ્ડન કોર',
    fogColor: 0x1c1503,
    wallColor: 0xb45309,
    crystalColor: 0xfacc15,
    glassColor: 0xfde047,
    accentColor: '#facc15',
    targetDist: 5600,
    speed: 33,
  },
  {
    id: 7,
    name: 'Sector 7: Hyper Matrix',
    nameGuj: 'સેક્ટર 7: હાયપર મેટ્રિક્સ',
    fogColor: 0x06031f,
    wallColor: 0x4338ca,
    crystalColor: 0x818cf8,
    glassColor: 0xa5b4fc,
    accentColor: '#818cf8',
    targetDist: 7000,
    speed: 36,
  },
  {
    id: 8,
    name: 'Sector 8: Infinite Void',
    nameGuj: 'સેક્ટર 8: ઇન્ફિનિટ વોઇડ',
    fogColor: 0x050508,
    wallColor: 0x64748b,
    crystalColor: 0xe2e8f0,
    glassColor: 0xf8fafc,
    accentColor: '#38bdf8',
    targetDist: 99999,
    speed: 40,
  },
];

const DEFAULT_BALL_SKINS: BallSkin[] = [
  {
    id: 'chrome-alloy',
    name: 'Chrome Alloy',
    nameGuj: 'ક્રોમ એલોય',
    price: 0,
    unlocked: true,
    color: 0xffffff,
    emissive: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.35,
    previewEmoji: '⚪',
    description: 'Precision forged reflective metallic alloy with aerodynamic ballistics.',
  },
  {
    id: 'neon-plasma',
    name: 'Neon Plasma',
    nameGuj: 'નિયોન પ્લાઝ્મા',
    price: 300,
    unlocked: false,
    color: 0x67e8f9,
    emissive: 0x06b6d4,
    roughness: 0.1,
    metalness: 0.3,
    previewEmoji: '⚡',
    description: 'Supercharged ionized cyan core that illuminates dark corridors.',
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    nameGuj: 'સોલર ફ્લેર',
    price: 650,
    unlocked: false,
    color: 0xfde047,
    emissive: 0xf97316,
    roughness: 0.15,
    metalness: 0.3,
    previewEmoji: '🔥',
    description: 'Molten plasma sphere that radiates fiery heat waves on glass impact.',
  },
  {
    id: 'emerald-pulse',
    name: 'Emerald Matrix',
    nameGuj: 'એમરાલ્ડ મેટ્રિક્સ',
    price: 1100,
    unlocked: false,
    color: 0x6ee7b7,
    emissive: 0x10b981,
    roughness: 0.1,
    metalness: 0.3,
    previewEmoji: '🧪',
    description: 'Quantum crystal orb with zero air resistance and emerald light trails.',
  },
  {
    id: 'void-singularity',
    name: 'Void Singularity',
    nameGuj: 'વોઇડ સિંગ્યુલેરિટી',
    price: 1800,
    unlocked: false,
    color: 0xd8b4fe,
    emissive: 0xa855f7,
    roughness: 0.05,
    metalness: 0.35,
    previewEmoji: '🔮',
    description: 'Dark matter gravitational core with intense kinetic shockwave power.',
  },
  {
    id: 'golden-pharaoh',
    name: 'Golden Sun 24K',
    nameGuj: 'ગોલ્ડન સન 24K',
    price: 2500,
    unlocked: false,
    color: 0xfef08a,
    emissive: 0xfacc15,
    roughness: 0.05,
    metalness: 0.4,
    previewEmoji: '👑',
    description: 'Pure 24-carat royal gold sphere granting double crystal bonus orbs!',
  },
];

// Active Projectile Orb in Flight
interface ActiveOrb {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  alive: boolean;
  spawnTime: number;
  lifeTime: number;
}

// 3D Glass Shard Fragment
interface ShardPiece {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

// Target Crystal Node in 3D Space
interface CrystalEntity {
  id: number;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  type: 'pyramid' | 'octahedron' | 'cluster';
  points: number;
  orbsReward: number;
  shattered: boolean;
  bbox: THREE.Box3;
}

// Target Glass Obstacle
interface ObstacleEntity {
  id: number;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  type: 'pane' | 'pyramid_block' | 'pendulum' | 'sliding_gate' | 'pillar' | 'spinning_cross';
  size: THREE.Vector3;
  shattered: boolean;
  bbox: THREE.Box3;
  rotSpeed?: number;
  pendulumAngle?: number;
  pendulumSpeed?: number;
  slideOffset?: number;
  slideSpeed?: number;
  buttonMesh?: THREE.Mesh;
  buttonHit?: boolean;
}

export const CyberSmashHit3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game UI State
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'victory'>('start');
  const [balls, setBalls] = useState<number>(30);
  const [streak, setStreak] = useState<number>(0);
  const [multiShot, setMultiShot] = useState<number>(1);
  const [distance, setDistance] = useState<number>(0);
  const [crystalsShattered, setCrystalsShattered] = useState<number>(0);
  const [obstaclesCleared, setObstaclesCleared] = useState<number>(0);
  const [currentSectorIndex, setCurrentSectorIndex] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('smashhit3d_highscore') || '0', 10);
  });
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('smashhit3d_coins') || '250', 10);
  });
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [activeSkinId, setActiveSkinId] = useState<string>(() => {
    return localStorage.getItem('smashhit3d_active_skin') || 'chrome-alloy';
  });
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(() => {
    const saved = localStorage.getItem('smashhit3d_unlocked_skins');
    return saved ? JSON.parse(saved) : ['chrome-alloy'];
  });

  // Powerups Inventory
  const [slowMoCharges, setSlowMoCharges] = useState<number>(2);
  const [blitzCharges, setBlitzCharges] = useState<number>(1);
  const [empCharges, setEmpCharges] = useState<number>(1);

  // Active Powerup Buffs
  const [isSlowMoActive, setIsSlowMoActive] = useState<boolean>(false);
  const [isBlitzActive, setIsBlitzActive] = useState<boolean>(false);

  // Crosshair Coordinates
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [isAiming, setIsAiming] = useState<boolean>(false);

  // Game Stats Summary
  const [statsSummary, setStatsSummary] = useState({
    shotsFired: 0,
    crystalsHit: 0,
    maxStreak: 0,
    accuracy: 100,
    distanceReached: 0,
  });

  // Garage Modal View
  const [showGarage, setShowGarage] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Audio mute toggle
  const toggleMute = () => {
    const isMute = sound.toggleMute();
    setMuted(isMute);
  };

  // ----------------------------------------------------
  // THREE.JS ENGINE REFS
  // ----------------------------------------------------
  const engineRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    ambientLight: THREE.AmbientLight;
    dirLight: THREE.DirectionalLight;
    camPointLight: THREE.PointLight;
    activeOrbs: ActiveOrb[];
    shards: ShardPiece[];
    crystals: CrystalEntity[];
    obstacles: ObstacleEntity[];
    corridorSegments: THREE.Group[];
    cameraZ: number;
    camShake: number;
    camShakeOffset: THREE.Vector3;
    nextSpawnZ: number;
    entityIdCounter: number;
    lastFrameTime: number;
    ballMaterial: THREE.MeshStandardMaterial;
    raycaster: THREE.Raycaster;
    mouseNDC: THREE.Vector2;
    activeSkinConfig: BallSkin;
    ballsCount: number;
    streakCount: number;
    maxStreakRecorded: number;
    shotsFiredCount: number;
    crystalsHitCount: number;
    obstaclesClearedCount: number;
    slowMoTimer: number;
    blitzTimer: number;
    rapidFireCooldown: number;
    screenFlashAlpha: number;
    isRunning: boolean;
  } | null>(null);

  // Update Active Skin Material
  const getSkinConfig = useCallback((skinId: string) => {
    return DEFAULT_BALL_SKINS.find((s) => s.id === skinId) || DEFAULT_BALL_SKINS[0];
  }, []);

  // Calculate Multi-Shot Tier based on streak
  const getMultiShotTier = (streakVal: number): number => {
    if (streakVal >= 30) return 5;
    if (streakVal >= 20) return 3;
    if (streakVal >= 10) return 2;
    return 1;
  };

  // ----------------------------------------------------
  // INITIALIZE THREE.JS SCENE
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SECTOR_THEMES[0].fogColor);
    scene.fog = new THREE.FogExp2(SECTOR_THEMES[0].fogColor, 0.015);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.02, 350);
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(5, 12, 10);
    scene.add(dirLight);

    const camPointLight = new THREE.PointLight(0x00f0ff, 2.5, 35);
    camPointLight.position.set(0, 0, 0);
    scene.add(camPointLight);

    // Initial Ball Material
    const initialSkin = getSkinConfig(activeSkinId);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: initialSkin.color,
      emissive: initialSkin.emissive,
      emissiveIntensity: 0.6,
      roughness: initialSkin.roughness,
      metalness: initialSkin.metalness,
    });

    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();

    engineRef.current = {
      scene,
      camera,
      renderer,
      ambientLight,
      dirLight,
      camPointLight,
      activeOrbs: [],
      shards: [],
      crystals: [],
      obstacles: [],
      corridorSegments: [],
      cameraZ: 0,
      camShake: 0,
      camShakeOffset: new THREE.Vector3(),
      nextSpawnZ: -20,
      entityIdCounter: 1,
      lastFrameTime: performance.now(),
      ballMaterial,
      raycaster,
      mouseNDC,
      activeSkinConfig: initialSkin,
      ballsCount: 30,
      streakCount: 0,
      maxStreakRecorded: 0,
      shotsFiredCount: 0,
      crystalsHitCount: 0,
      obstaclesClearedCount: 0,
      slowMoTimer: 0,
      blitzTimer: 0,
      rapidFireCooldown: 0,
      screenFlashAlpha: 0,
      isRunning: false,
    };

    // Pre-populate initial corridor segments & entities
    generateInitialCorridor(scene);

    // Handle Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update Active Skin in Engine
  useEffect(() => {
    if (!engineRef.current) return;
    const skin = getSkinConfig(activeSkinId);
    engineRef.current.activeSkinConfig = skin;
    engineRef.current.ballMaterial.color.setHex(skin.color);
    engineRef.current.ballMaterial.emissive.setHex(skin.emissive);
    engineRef.current.ballMaterial.roughness = skin.roughness;
    engineRef.current.ballMaterial.metalness = skin.metalness;
    localStorage.setItem('smashhit3d_active_skin', activeSkinId);
  }, [activeSkinId, getSkinConfig]);

  // ----------------------------------------------------
  // PROCEDURAL CORRIDOR & OBSTACLE GENERATOR
  // ----------------------------------------------------
  const createCorridorSegment = (zPos: number, sector: SectorTheme): THREE.Group => {
    const group = new THREE.Group();
    group.position.z = zPos;

    const CORRIDOR_WIDTH = 14;
    const CORRIDOR_HEIGHT = 8;
    const CORRIDOR_LENGTH = 30;

    // Floor Runway
    const floorGeo = new THREE.PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_LENGTH, 4, 8);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x050a15,
      roughness: 0.2,
      metalness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -CORRIDOR_HEIGHT / 2;
    group.add(floor);

    // Glowing Neon Floor Strip Lines (Runway Guides)
    const lineMat = new THREE.MeshBasicMaterial({ color: sector.wallColor });
    const lineLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.25, CORRIDOR_LENGTH), lineMat);
    lineLeft.rotation.x = -Math.PI / 2;
    lineLeft.position.set(-CORRIDOR_WIDTH / 2 + 0.5, -CORRIDOR_HEIGHT / 2 + 0.02, 0);
    group.add(lineLeft);

    const lineRight = new THREE.Mesh(new THREE.PlaneGeometry(0.25, CORRIDOR_LENGTH), lineMat);
    lineRight.rotation.x = -Math.PI / 2;
    lineRight.position.set(CORRIDOR_WIDTH / 2 - 0.5, -CORRIDOR_HEIGHT / 2 + 0.02, 0);
    group.add(lineRight);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_LENGTH);
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x030712, roughness: 0.8 });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = CORRIDOR_HEIGHT / 2;
    group.add(ceil);

    // Left & Right Grid Walls
    const wallGeo = new THREE.PlaneGeometry(CORRIDOR_LENGTH, CORRIDOR_HEIGHT);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x080e1c,
      roughness: 0.4,
      metalness: 0.6,
    });

    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -CORRIDOR_WIDTH / 2;
    group.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = CORRIDOR_WIDTH / 2;
    group.add(rightWall);

    // Neon Architectural Rib Arches
    const ribGeo = new THREE.BoxGeometry(0.3, CORRIDOR_HEIGHT, 0.3);
    const ribMat = new THREE.MeshBasicMaterial({ color: sector.wallColor });

    const ribLeft = new THREE.Mesh(ribGeo, ribMat);
    ribLeft.position.set(-CORRIDOR_WIDTH / 2 + 0.15, 0, 0);
    group.add(ribLeft);

    const ribRight = new THREE.Mesh(ribGeo, ribMat);
    ribRight.position.set(CORRIDOR_WIDTH / 2 - 0.15, 0, 0);
    group.add(ribRight);

    const ribTop = new THREE.Mesh(new THREE.BoxGeometry(CORRIDOR_WIDTH, 0.3, 0.3), ribMat);
    ribTop.position.set(0, CORRIDOR_HEIGHT / 2 - 0.15, 0);
    group.add(ribTop);

    return group;
  };

  // Generate 3D Crystal Entities
  const spawnCrystal = (zPos: number, sector: SectorTheme): CrystalEntity => {
    const group = new THREE.Group();
    const typeRoll = Math.random();
    let type: 'pyramid' | 'octahedron' | 'cluster' = 'octahedron';
    let orbsReward = 3;
    let points = 50;

    const crystalMat = new THREE.MeshStandardMaterial({
      color: sector.crystalColor,
      emissive: sector.crystalColor,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });

    // Randomize X & Y position in corridor
    const xPos = (Math.random() - 0.5) * 8.5;
    const yPos = (Math.random() - 0.5) * 4.5;
    group.position.set(xPos, yPos, zPos);

    if (typeRoll < 0.45) {
      // Octahedron Diamond Crystal (+3 orbs)
      type = 'octahedron';
      const geo = new THREE.OctahedronGeometry(0.9, 0);
      const mesh = new THREE.Mesh(geo, crystalMat);
      group.add(mesh);
      orbsReward = 3;
      points = 50;
    } else if (typeRoll < 0.8) {
      // Dual Pyramid Crystal (+5 orbs)
      type = 'pyramid';
      const geo1 = new THREE.ConeGeometry(0.8, 1.4, 4);
      const m1 = new THREE.Mesh(geo1, crystalMat);
      m1.position.y = 0.4;
      group.add(m1);

      const geo2 = new THREE.ConeGeometry(0.8, 1.4, 4);
      const m2 = new THREE.Mesh(geo2, crystalMat);
      m2.rotation.z = Math.PI;
      m2.position.y = -0.4;
      group.add(m2);
      orbsReward = 5;
      points = 100;
    } else {
      // Crystal Cluster (+10 orbs)
      type = 'cluster';
      const center = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), crystalMat);
      group.add(center);

      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const sub = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 4), crystalMat);
        sub.position.set(Math.cos(angle) * 0.9, Math.sin(angle) * 0.9, 0);
        sub.rotation.z = angle - Math.PI / 2;
        group.add(sub);
      }
      orbsReward = 10;
      points = 250;
    }

    // Inner Glowing Core Sparkle
    const innerLight = new THREE.PointLight(sector.crystalColor, 2, 8);
    group.add(innerLight);

    const bbox = new THREE.Box3().setFromObject(group);

    return {
      id: engineRef.current ? ++engineRef.current.entityIdCounter : Math.random(),
      mesh: group,
      pos: group.position,
      type,
      points,
      orbsReward,
      shattered: false,
      bbox,
    };
  };

  // Generate 3D Glass Obstacle Entities
  const spawnObstacle = (zPos: number, sector: SectorTheme): ObstacleEntity => {
    const group = new THREE.Group();
    const typeRoll = Math.random();
    let type: 'pane' | 'pyramid_block' | 'pendulum' | 'sliding_gate' | 'pillar' | 'spinning_cross' = 'pane';
    const size = new THREE.Vector3(3, 3, 0.4);

    const glassMat = new THREE.MeshStandardMaterial({
      color: sector.glassColor,
      emissive: sector.glassColor,
      emissiveIntensity: 0.25,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.65,
    });

    let rotSpeed = 0;
    let pendulumAngle = 0;
    let pendulumSpeed = 0;
    let slideOffset = 0;
    let slideSpeed = 0;
    let buttonMesh: THREE.Mesh | undefined;

    if (typeRoll < 0.25) {
      // 1. Rectangular Glass Pane (Spans half or full lane)
      type = 'pane';
      const isLeft = Math.random() < 0.5;
      const paneWidth = 5.5;
      const paneHeight = 6.0;
      size.set(paneWidth, paneHeight, 0.4);

      const paneGeo = new THREE.BoxGeometry(paneWidth, paneHeight, 0.3);
      const mesh = new THREE.Mesh(paneGeo, glassMat);
      group.add(mesh);

      // Glass Edge Glow Frame
      const frameGeo = new THREE.BoxGeometry(paneWidth + 0.1, paneHeight + 0.1, 0.35);
      const frameMat = new THREE.MeshBasicMaterial({ color: sector.wallColor, wireframe: true });
      group.add(new THREE.Mesh(frameGeo, frameMat));

      const xPos = isLeft ? -3.0 : 3.0;
      group.position.set(xPos, 0, zPos);
    } else if (typeRoll < 0.45) {
      // 2. Sharp Glass Pyramids from Floor / Ceiling
      type = 'pyramid_block';
      const isFloor = Math.random() < 0.5;
      size.set(3.5, 4.0, 3.5);

      const pyrGeo = new THREE.ConeGeometry(2.0, 4.0, 4);
      const mesh = new THREE.Mesh(pyrGeo, glassMat);
      if (!isFloor) {
        mesh.rotation.z = Math.PI;
        group.position.set((Math.random() - 0.5) * 6, 2.0, zPos);
      } else {
        group.position.set((Math.random() - 0.5) * 6, -2.0, zPos);
      }
      group.add(mesh);
    } else if (typeRoll < 0.65) {
      // 3. Swinging Crystal Pendulum (Swings horizontally across path)
      type = 'pendulum';
      size.set(2.5, 5.0, 2.5);
      pendulumSpeed = 2.5 + Math.random() * 1.5;

      // Pendulum Shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6), new THREE.MeshBasicMaterial({ color: 0x64748b }));
      shaft.position.y = 1.5;
      group.add(shaft);

      // Heavy Glass Blade / Bob
      const bob = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 0.5), glassMat);
      bob.position.y = -1.5;
      group.add(bob);

      group.position.set(0, 3.0, zPos);
    } else if (typeRoll < 0.85) {
      // 4. Sliding Glass Blast Door with Blue Shatter Target Button
      type = 'sliding_gate';
      size.set(12, 7, 0.5);
      slideSpeed = 3.0;

      // Left & Right Door Panels
      const doorLeft = new THREE.Mesh(new THREE.BoxGeometry(6, 6.5, 0.4), glassMat);
      doorLeft.position.x = -3;
      group.add(doorLeft);

      const doorRight = new THREE.Mesh(new THREE.BoxGeometry(6, 6.5, 0.4), glassMat);
      doorRight.position.x = 3;
      group.add(doorRight);

      // Shatter Target Button (Hologram Target in upper center)
      const btnGeo = new THREE.OctahedronGeometry(0.8, 0);
      const btnMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      buttonMesh = new THREE.Mesh(btnGeo, btnMat);
      buttonMesh.position.set(0, 2.5, 0.5);
      group.add(buttonMesh);

      group.position.set(0, 0, zPos);
    } else {
      // 5. Spinning Glass Propeller Cross
      type = 'spinning_cross';
      size.set(6.0, 6.0, 0.5);
      rotSpeed = (Math.random() < 0.5 ? 1 : -1) * (1.8 + Math.random() * 1.2);

      const bar1 = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.2, 0.3), glassMat);
      group.add(bar1);
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6.5, 0.3), glassMat);
      group.add(bar2);

      group.position.set((Math.random() - 0.5) * 3.0, 0, zPos);
    }

    const bbox = new THREE.Box3().setFromObject(group);

    return {
      id: engineRef.current ? ++engineRef.current.entityIdCounter : Math.random(),
      mesh: group,
      pos: group.position,
      type,
      size,
      shattered: false,
      bbox,
      rotSpeed,
      pendulumAngle,
      pendulumSpeed,
      slideOffset,
      slideSpeed,
      buttonMesh,
      buttonHit: false,
    };
  };

  // Populate Initial Chunk
  const generateInitialCorridor = (scene: THREE.Scene) => {
    const sector = SECTOR_THEMES[0];
    for (let i = 0; i < 6; i++) {
      const zPos = -i * 30;
      const segment = createCorridorSegment(zPos, sector);
      scene.add(segment);
      if (engineRef.current) {
        engineRef.current.corridorSegments.push(segment);
      }
    }

    // Spawn initial crystals & obstacles
    for (let z = -25; z >= -180; z -= 14) {
      if (Math.random() < 0.65) {
        const crystal = spawnCrystal(z, sector);
        scene.add(crystal.mesh);
        engineRef.current?.crystals.push(crystal);
      }
      if (z <= -45 && Math.random() < 0.5) {
        const obstacle = spawnObstacle(z - 5, sector);
        scene.add(obstacle.mesh);
        engineRef.current?.obstacles.push(obstacle);
      }
    }
  };

  // ----------------------------------------------------
  // GLASS SHATTER FRAGMENTATION ENGINE
  // ----------------------------------------------------
  const createGlassShatterExplosion = (
    pos: THREE.Vector3,
    colorHex: number,
    count: number = 18,
    impulseVec?: THREE.Vector3
  ) => {
    if (!engineRef.current) return;
    const { scene, shards } = engineRef.current;

    sound.playGlassShatter();

    const shardMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
    });

    for (let i = 0; i < count; i++) {
      const shardSize = 0.2 + Math.random() * 0.45;
      const geo = new THREE.TetrahedronGeometry(shardSize, 0);
      const mesh = new THREE.Mesh(geo, shardMat);
      mesh.position.copy(pos);
      mesh.position.x += (Math.random() - 0.5) * 1.2;
      mesh.position.y += (Math.random() - 0.5) * 1.2;
      mesh.position.z += (Math.random() - 0.5) * 0.8;

      const baseVel = impulseVec ? impulseVec.clone().multiplyScalar(0.4) : new THREE.Vector3(0, 0, -4);
      const spreadX = (Math.random() - 0.5) * 8.0;
      const spreadY = (Math.random() - 0.5) * 8.0 + 1.5;
      const spreadZ = baseVel.z + (Math.random() - 0.5) * 6.0;

      const velocity = new THREE.Vector3(spreadX, spreadY, spreadZ);
      const rotVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );

      scene.add(mesh);
      shards.push({
        mesh,
        velocity,
        rotVelocity,
        life: 0,
        maxLife: 0.75 + Math.random() * 0.45,
      });
    }
  };

  // ----------------------------------------------------
  // BALL SHOOTING & RAYCASTING MECHANICS
  // ----------------------------------------------------
  const shootBall = (screenX: number, screenY: number) => {
    if (!engineRef.current || !engineRef.current.isRunning) return;
    const {
      scene,
      camera,
      activeOrbs,
      ballMaterial,
      raycaster,
      mouseNDC,
      ballsCount,
      streakCount,
      blitzTimer,
    } = engineRef.current;

    // Check Ammo
    const isFreeShot = blitzTimer > 0;
    if (ballsCount <= 0 && !isFreeShot) {
      sound.playHit();
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    mouseNDC.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((screenY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouseNDC, camera);

    // Target point in 3D world (50m forward along ray)
    const targetPoint = new THREE.Vector3();
    raycaster.ray.at(45, targetPoint);

    // Multi-shot count
    const tier = getMultiShotTier(streakCount);
    const orbsToSpawn = isFreeShot ? Math.max(tier, 3) : tier;

    // Consume ammo (1 ball per multi-shot volley!)
    if (!isFreeShot) {
      const nextBalls = ballsCount - 1;
      engineRef.current.ballsCount = nextBalls;
      setBalls(nextBalls);
    }

    engineRef.current.shotsFiredCount += orbsToSpawn;
    sound.playBallLaunch();

    const currentSkin = engineRef.current.activeSkinConfig;

    for (let i = 0; i < orbsToSpawn; i++) {
      let spawnOffset = new THREE.Vector3(0, -0.22, -1.0);
      if (orbsToSpawn === 2) {
        spawnOffset.x = (i === 0 ? -0.38 : 0.38);
      } else if (orbsToSpawn === 3) {
        spawnOffset.x = (i - 1) * 0.42;
      } else if (orbsToSpawn === 5) {
        spawnOffset.x = (i - 2) * 0.38;
        spawnOffset.y += (i % 2 === 0 ? 0.2 : -0.2);
      }

      const spawnPos = camera.position.clone().add(spawnOffset);
      const throwDir = targetPoint.clone().sub(spawnPos).normalize();

      // Launch velocity (High speed 75 m/s)
      const speed = 72;
      const velocity = throwDir.multiplyScalar(speed);

      // 3D Sphere Mesh (Full solid gleaming sphere)
      const ballGeo = new THREE.SphereGeometry(0.38, 32, 32);
      const orbMat = new THREE.MeshStandardMaterial({
        color: currentSkin.color,
        emissive: currentSkin.emissive,
        emissiveIntensity: 0.95,
        roughness: 0.1,
        metalness: 0.3,
      });
      const ballMesh = new THREE.Mesh(ballGeo, orbMat);
      ballMesh.position.copy(spawnPos);

      // Glowing outer halo ring for high visibility
      const ringGeo = new THREE.TorusGeometry(0.4, 0.035, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ballMesh.add(ringMesh);

      scene.add(ballMesh);

      activeOrbs.push({
        mesh: ballMesh,
        velocity,
        alive: true,
        spawnTime: performance.now(),
        lifeTime: 1.4, // Max seconds in flight
      });
    }
  };

  // ----------------------------------------------------
  // POWERUPS ACTIVATIONS
  // ----------------------------------------------------
  const activateSlowMo = () => {
    if (slowMoCharges <= 0 || isSlowMoActive || !engineRef.current?.isRunning) return;
    setSlowMoCharges((prev) => prev - 1);
    setIsSlowMoActive(true);
    if (engineRef.current) {
      engineRef.current.slowMoTimer = 6.0;
    }
    sound.playSlowMo();
  };

  const activateBlitz = () => {
    if (blitzCharges <= 0 || isBlitzActive || !engineRef.current?.isRunning) return;
    setBlitzCharges((prev) => prev - 1);
    setIsBlitzActive(true);
    if (engineRef.current) {
      engineRef.current.blitzTimer = 5.0;
    }
    sound.playPowerup();
  };

  const activateEmpShockwave = () => {
    if (empCharges <= 0 || !engineRef.current?.isRunning) return;
    setEmpCharges((prev) => prev - 1);
    sound.playEmpNuke();

    if (!engineRef.current) return;
    const { camera, obstacles, crystals, scene } = engineRef.current;

    // Screen Shake & White Flash
    engineRef.current.camShake = 1.2;
    engineRef.current.screenFlashAlpha = 0.8;

    // Destroy all on-screen obstacles within 80m
    obstacles.forEach((obs) => {
      if (!obs.shattered && obs.pos.z < camera.position.z && obs.pos.z > camera.position.z - 70) {
        obs.shattered = true;
        scene.remove(obs.mesh);
        createGlassShatterExplosion(obs.pos, 0x38bdf8, 20);
        engineRef.current!.obstaclesClearedCount++;
      }
    });

    // Collect all on-screen crystals
    crystals.forEach((c) => {
      if (!c.shattered && c.pos.z < camera.position.z && c.pos.z > camera.position.z - 70) {
        c.shattered = true;
        scene.remove(c.mesh);
        createGlassShatterExplosion(c.pos, 0x00f0ff, 15);
        engineRef.current!.ballsCount += c.orbsReward;
        engineRef.current!.crystalsHitCount++;
        setBalls(engineRef.current!.ballsCount);
      }
    });
  };

  // ----------------------------------------------------
  // GAME LOOP TICK (60 FPS)
  // ----------------------------------------------------
  useEffect(() => {
    let animationFrameId: number;

    const gameTick = () => {
      animationFrameId = requestAnimationFrame(gameTick);
      if (!engineRef.current) return;

      const now = performance.now();
      const rawDelta = Math.min((now - engineRef.current.lastFrameTime) / 1000, 0.1);
      engineRef.current.lastFrameTime = now;

      const {
        scene,
        camera,
        renderer,
        ambientLight,
        dirLight,
        camPointLight,
        activeOrbs,
        shards,
        crystals,
        obstacles,
        corridorSegments,
        isRunning,
      } = engineRef.current;

      if (!isRunning) {
        renderer.render(scene, camera);
        return;
      }

      // Handle Slow-Mo time dilation
      let timeScale = 1.0;
      if (engineRef.current.slowMoTimer > 0) {
        engineRef.current.slowMoTimer -= rawDelta;
        timeScale = 0.28;
        if (engineRef.current.slowMoTimer <= 0) {
          setIsSlowMoActive(false);
        }
      }

      // Handle Blitz Timer
      if (engineRef.current.blitzTimer > 0) {
        engineRef.current.blitzTimer -= rawDelta;
        if (engineRef.current.blitzTimer <= 0) {
          setIsBlitzActive(false);
        }
      }

      const delta = rawDelta * timeScale;

      // Determine Current Sector by Distance
      const currentDist = Math.abs(engineRef.current.cameraZ);
      setDistance(Math.floor(currentDist));

      let sectorIndex = 0;
      for (let s = 0; s < SECTOR_THEMES.length; s++) {
        if (currentDist >= SECTOR_THEMES[s].targetDist) {
          sectorIndex = Math.min(s + 1, SECTOR_THEMES.length - 1);
        }
      }
      if (sectorIndex !== currentSectorIndex) {
        setCurrentSectorIndex(sectorIndex);
        const sector = SECTOR_THEMES[sectorIndex];
        scene.fog = new THREE.FogExp2(sector.fogColor, 0.015);
        scene.background = new THREE.Color(sector.fogColor);
        camPointLight.color.setHex(sector.crystalColor);
      }

      const currentSector = SECTOR_THEMES[sectorIndex];

      // Move Camera Forward along -Z
      const forwardSpeed = currentSector.speed * delta;
      engineRef.current.cameraZ -= forwardSpeed;
      camera.position.z = engineRef.current.cameraZ;

      // Handle Camera Shake
      if (engineRef.current.camShake > 0) {
        engineRef.current.camShake -= rawDelta * 2.5;
        const shakeMag = Math.max(0, engineRef.current.camShake) * 0.45;
        engineRef.current.camShakeOffset.set(
          (Math.random() - 0.5) * shakeMag,
          (Math.random() - 0.5) * shakeMag,
          0
        );
      } else {
        engineRef.current.camShakeOffset.set(0, 0, 0);
      }
      camera.position.x = engineRef.current.camShakeOffset.x;
      camera.position.y = engineRef.current.camShakeOffset.y;

      // Continuous Corridor Chunks Streaming
      const furthestSegmentZ = corridorSegments[corridorSegments.length - 1]?.position.z || 0;
      if (furthestSegmentZ > camera.position.z - 180) {
        const nextZ = furthestSegmentZ - 30;
        const newSeg = createCorridorSegment(nextZ, currentSector);
        scene.add(newSeg);
        corridorSegments.push(newSeg);

        // Spawn new obstacles & crystals
        if (Math.random() < 0.7) {
          const crystal = spawnCrystal(nextZ + (Math.random() - 0.5) * 10, currentSector);
          scene.add(crystal.mesh);
          crystals.push(crystal);
        }
        if (Math.random() < 0.6) {
          const obstacle = spawnObstacle(nextZ - 4, currentSector);
          scene.add(obstacle.mesh);
          obstacles.push(obstacle);
        }

        // Clean up old corridor chunks far behind player
        while (corridorSegments.length > 0 && corridorSegments[0].position.z > camera.position.z + 50) {
          const oldSeg = corridorSegments.shift()!;
          scene.remove(oldSeg);
        }
      }

      // Animate Obstacles (Pendulums, Rotators, Sliding Doors)
      obstacles.forEach((obs) => {
        if (obs.shattered) return;

        if (obs.type === 'pendulum' && obs.pendulumSpeed) {
          obs.pendulumAngle = (obs.pendulumAngle || 0) + delta * obs.pendulumSpeed;
          obs.mesh.rotation.z = Math.sin(obs.pendulumAngle) * 0.9;
        } else if (obs.type === 'spinning_cross' && obs.rotSpeed) {
          obs.mesh.rotation.z += delta * obs.rotSpeed;
        } else if (obs.type === 'sliding_gate' && obs.buttonHit && obs.slideSpeed) {
          // Slide open if button was hit
          obs.mesh.children.forEach((child) => {
            if (child.position.x < 0) child.position.x -= delta * obs.slideSpeed!;
            if (child.position.x > 0 && child !== obs.buttonMesh) child.position.x += delta * obs.slideSpeed!;
          });
        }

        // Rotate buttons
        if (obs.buttonMesh) {
          obs.buttonMesh.rotation.y += delta * 3.0;
        }

        // Update Bounding Box
        obs.bbox.setFromObject(obs.mesh);
      });

      // Animate Crystals (Gentle float & spin)
      crystals.forEach((c) => {
        if (c.shattered) return;
        c.mesh.rotation.y += delta * 1.8;
        c.mesh.rotation.x += delta * 0.6;
        c.bbox.setFromObject(c.mesh);
      });

      // Update Active Orbs (Flight & Collisions)
      for (let i = activeOrbs.length - 1; i >= 0; i--) {
        const orb = activeOrbs[i];
        if (!orb.alive) {
          scene.remove(orb.mesh);
          activeOrbs.splice(i, 1);
          continue;
        }

        // Apply Flight Velocity & Slight Gravity
        orb.velocity.y -= delta * 3.8;
        orb.mesh.position.addScaledVector(orb.velocity, delta);

        const orbSphere = new THREE.Sphere(orb.mesh.position, 0.32);

        // Check Collision with Crystals
        for (let j = 0; j < crystals.length; j++) {
          const crystal = crystals[j];
          if (!crystal.shattered && crystal.bbox.intersectsSphere(orbSphere)) {
            crystal.shattered = true;
            orb.alive = false;
            scene.remove(crystal.mesh);

            // Audio & Streak Mechanics
            const nextStreak = engineRef.current.streakCount + 1;
            engineRef.current.streakCount = nextStreak;
            setStreak(nextStreak);
            setMultiShot(getMultiShotTier(nextStreak));

            if (nextStreak > engineRef.current.maxStreakRecorded) {
              engineRef.current.maxStreakRecorded = nextStreak;
            }

            // Award extra orbs (Golden Sun skin grants double bonus!)
            const bonusMult = engineRef.current.activeSkinConfig.id === 'golden-pharaoh' ? 2 : 1;
            const awarded = crystal.orbsReward * bonusMult;
            engineRef.current.ballsCount += awarded;
            engineRef.current.crystalsHitCount++;
            setBalls(engineRef.current.ballsCount);
            setCrystalsShattered((prev) => prev + 1);

            // Add coins
            setCoins((prev) => {
              const nextCoins = prev + crystal.points;
              localStorage.setItem('smashhit3d_coins', String(nextCoins));
              return nextCoins;
            });

            sound.playCrystalChime(nextStreak);
            createGlassShatterExplosion(crystal.pos, currentSector.crystalColor, 16, orb.velocity);
            break;
          }
        }

        if (!orb.alive) continue;

        // Check Collision with Obstacles
        for (let k = 0; k < obstacles.length; k++) {
          const obs = obstacles[k];
          if (obs.shattered) continue;

          // Check if hitting blast door target button
          if (obs.type === 'sliding_gate' && obs.buttonMesh && !obs.buttonHit) {
            const btnBbox = new THREE.Box3().setFromObject(obs.buttonMesh);
            if (btnBbox.intersectsSphere(orbSphere)) {
              obs.buttonHit = true;
              orb.alive = false;
              sound.playWin();
              scene.remove(obs.buttonMesh);
              createGlassShatterExplosion(obs.buttonMesh.position.clone().add(obs.pos), 0x00f0ff, 12);
              break;
            }
          }

          if (obs.bbox.intersectsSphere(orbSphere)) {
            obs.shattered = true;
            orb.alive = false;
            scene.remove(obs.mesh);
            engineRef.current.obstaclesClearedCount++;
            setObstaclesCleared((prev) => prev + 1);

            createGlassShatterExplosion(obs.pos, currentSector.glassColor, 24, orb.velocity);
            break;
          }
        }

        // Check Lifetime / Despawn
        if ((now - orb.spawnTime) / 1000 > orb.lifeTime) {
          orb.alive = false;
        }
      }

      // Check Camera Collision with Obstacles (Player Crash)
      const camBbox = new THREE.Box3(
        new THREE.Vector3(camera.position.x - 1.2, camera.position.y - 1.2, camera.position.z - 0.5),
        new THREE.Vector3(camera.position.x + 1.2, camera.position.y + 1.2, camera.position.z + 0.5)
      );

      for (let k = 0; k < obstacles.length; k++) {
        const obs = obstacles[k];
        if (!obs.shattered && obs.bbox.intersectsBox(camBbox)) {
          obs.shattered = true;
          scene.remove(obs.mesh);

          // Impact Penalty: Lose 10 balls, reset streak to 0, heavy camera shake
          sound.playHit();
          engineRef.current.camShake = 1.0;
          engineRef.current.streakCount = 0;
          setStreak(0);
          setMultiShot(1);

          const nextBalls = Math.max(0, engineRef.current.ballsCount - 10);
          engineRef.current.ballsCount = nextBalls;
          setBalls(nextBalls);

          createGlassShatterExplosion(camera.position.clone().add(new THREE.Vector3(0, 0, -2)), 0xef4444, 30);
          break;
        }
      }

      // Update Shard Particles (Physics & Decay)
      for (let i = shards.length - 1; i >= 0; i--) {
        const shard = shards[i];
        shard.life += rawDelta;
        if (shard.life >= shard.maxLife) {
          scene.remove(shard.mesh);
          shards.splice(i, 1);
          continue;
        }

        shard.velocity.y -= rawDelta * 9.8; // Gravity
        shard.mesh.position.addScaledVector(shard.velocity, rawDelta);
        shard.mesh.rotation.x += shard.rotVelocity.x * rawDelta;
        shard.mesh.rotation.y += shard.rotVelocity.y * rawDelta;
        shard.mesh.rotation.z += shard.rotVelocity.z * rawDelta;

        const progress = shard.life / shard.maxLife;
        shard.mesh.scale.setScalar(Math.max(0.01, 1 - progress));
        (shard.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - progress;
      }

      // Check Game Over Condition
      if (engineRef.current.ballsCount <= 0 && activeOrbs.length === 0 && engineRef.current.blitzTimer <= 0) {
        handleGameOver();
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(gameTick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentSectorIndex]);

  // ----------------------------------------------------
  // GAME LIFECYCLE HANDLERS
  // ----------------------------------------------------
  const startGame = () => {
    if (!engineRef.current) return;
    sound.playPowerup();

    // Reset Engine State
    engineRef.current.ballsCount = 30;
    engineRef.current.streakCount = 0;
    engineRef.current.cameraZ = 0;
    engineRef.current.shotsFiredCount = 0;
    engineRef.current.crystalsHitCount = 0;
    engineRef.current.obstaclesClearedCount = 0;
    engineRef.current.maxStreakRecorded = 0;
    engineRef.current.slowMoTimer = 0;
    engineRef.current.blitzTimer = 0;
    engineRef.current.isRunning = true;

    // Reset Scene Objects
    engineRef.current.activeOrbs.forEach((o) => engineRef.current!.scene.remove(o.mesh));
    engineRef.current.activeOrbs = [];
    engineRef.current.shards.forEach((s) => engineRef.current!.scene.remove(s.mesh));
    engineRef.current.shards = [];
    engineRef.current.crystals.forEach((c) => engineRef.current!.scene.remove(c.mesh));
    engineRef.current.crystals = [];
    engineRef.current.obstacles.forEach((o) => engineRef.current!.scene.remove(o.mesh));
    engineRef.current.obstacles = [];
    engineRef.current.corridorSegments.forEach((seg) => engineRef.current!.scene.remove(seg));
    engineRef.current.corridorSegments = [];

    generateInitialCorridor(engineRef.current.scene);

    setBalls(30);
    setStreak(0);
    setMultiShot(1);
    setDistance(0);
    setCrystalsShattered(0);
    setObstaclesCleared(0);
    setCurrentSectorIndex(0);
    setIsSlowMoActive(false);
    setIsBlitzActive(false);
    setGameState('playing');
  };

  const handleGameOver = () => {
    if (!engineRef.current) return;
    engineRef.current.isRunning = false;
    sound.playGameOver();

    const dist = Math.floor(Math.abs(engineRef.current.cameraZ));
    const accuracy =
      engineRef.current.shotsFiredCount > 0
        ? Math.round((engineRef.current.crystalsHitCount / engineRef.current.shotsFiredCount) * 100)
        : 100;

    setStatsSummary({
      shotsFired: engineRef.current.shotsFiredCount,
      crystalsHit: engineRef.current.crystalsHitCount,
      maxStreak: engineRef.current.maxStreakRecorded,
      accuracy,
      distanceReached: dist,
    });

    if (dist > highScore) {
      setHighScore(dist);
      localStorage.setItem('smashhit3d_highscore', String(dist));
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }

    setGameState('gameover');
  };

  // Skin Purchase in Garage
  const buySkin = (skin: BallSkin) => {
    if (coins < skin.price) {
      sound.playHit();
      return;
    }
    sound.playWin();
    const newCoins = coins - skin.price;
    setCoins(newCoins);
    localStorage.setItem('smashhit3d_coins', String(newCoins));

    const updatedUnlocked = [...unlockedSkins, skin.id];
    setUnlockedSkins(updatedUnlocked);
    localStorage.setItem('smashhit3d_unlocked_skins', JSON.stringify(updatedUnlocked));
    setActiveSkinId(skin.id);
  };

  // Keyboard Shortcuts (Space for Blitz, Q for Slow-Mo, E for EMP)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.code === 'KeyQ') activateSlowMo();
      if (e.code === 'KeyE') activateEmpShockwave();
      if (e.code === 'Space') activateBlitz();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, slowMoCharges, blitzCharges, empCharges, isSlowMoActive, isBlitzActive]);

  // Touch & Mouse Aim Tracking
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCrosshairPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsAiming(true);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    handlePointerMove(e);
    shootBall(e.clientX, e.clientY);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[420px] sm:h-[580px] md:h-[680px] max-h-[75vh] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden select-none border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 font-sans"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerLeave={() => setIsAiming(false)}
    >
      {/* 3D WebGL Canvas Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block cursor-crosshair" />

      {/* Cyber Aim Reticle Follower */}
      {isAiming && gameState === 'playing' && (
        <div
          className="pointer-events-none absolute w-8 h-8 -ml-4 -mt-4 border-2 border-cyan-400/80 rounded-full flex items-center justify-center transition-transform duration-75 ease-out shadow-lg shadow-cyan-500/50"
          style={{ left: crosshairPos.x, top: crosshairPos.y }}
        >
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          <div className="absolute top-0 w-0.5 h-1.5 bg-cyan-300" />
          <div className="absolute bottom-0 w-0.5 h-1.5 bg-cyan-300" />
          <div className="absolute left-0 w-1.5 h-0.5 bg-cyan-300" />
          <div className="absolute right-0 w-1.5 h-0.5 bg-cyan-300" />
        </div>
      )}

      {/* ==================================================== */}
      {/* HUD OVERLAY (TOP & BOTTOM BARS)                     */}
      {/* ==================================================== */}
      {gameState === 'playing' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-6 z-10">
          {/* TOP HUD BAR */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Balls Ammo Gauge (Center-Left) */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className={`px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl backdrop-blur-md border flex items-center gap-1.5 sm:gap-2.5 shadow-xl transition-colors ${
                  balls <= 5
                    ? 'bg-rose-950/80 border-rose-500/80 text-rose-300 animate-pulse shadow-rose-900/50'
                    : balls <= 12
                    ? 'bg-amber-950/80 border-amber-500/70 text-amber-300'
                    : 'bg-slate-900/85 border-cyan-500/50 text-cyan-300 shadow-cyan-950/40'
                }`}
              >
                <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Balls</span>
                <span className="text-lg sm:text-2xl font-black tracking-tight text-white">{balls}</span>
              </div>

              {/* Multi-Ball Multiplier Streak Pill */}
              <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-slate-900/85 backdrop-blur-md border border-fuchsia-500/40 text-fuchsia-300 flex items-center gap-1.5 sm:gap-2 shadow-lg">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-fuchsia-400 fill-fuchsia-400 shrink-0" />
                <div className="text-[10px] sm:text-xs">
                  <span className="font-extrabold text-xs sm:text-sm text-white">{multiShot}x</span> <span className="hidden xs:inline">Multi-Shot</span>
                  <div className="w-12 sm:w-16 h-1 sm:h-1.5 bg-slate-800 rounded-full mt-0.5 sm:mt-1 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all duration-300"
                      style={{ width: `${((streak % 10) / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Distance & Sector Pill (Center-Right) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700 text-right shadow-xl">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate max-w-[80px] sm:max-w-none">
                  {SECTOR_THEMES[currentSectorIndex].name}
                </div>
                <div className="text-sm sm:text-lg font-black text-white">{distance} m</div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="pointer-events-auto p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900/85 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-all shadow-lg active:scale-95"
              >
                {muted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />}
              </button>
            </div>
          </div>

          {/* BOTTOM POWERUPS BAR */}
          <div className="flex items-end justify-between">
            {/* Tactical Powerups Buttons */}
            <div className="pointer-events-auto flex items-center gap-3">
              {/* Slow-Mo */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  activateSlowMo();
                }}
                disabled={slowMoCharges <= 0 || isSlowMoActive}
                className={`relative px-4 py-3 rounded-2xl border backdrop-blur-md font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl transition-all active:scale-95 ${
                  isSlowMoActive
                    ? 'bg-cyan-500 border-white text-slate-950 animate-pulse'
                    : slowMoCharges > 0
                    ? 'bg-slate-900/90 border-cyan-500/40 text-cyan-300 hover:border-cyan-400 hover:scale-105'
                    : 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Hourglass className="w-4 h-4" />
                <span>Slow-Mo [Q]</span>
                <span className="px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-[10px] font-black">
                  {slowMoCharges}
                </span>
              </button>

              {/* Blitz Machine Gun */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  activateBlitz();
                }}
                disabled={blitzCharges <= 0 || isBlitzActive}
                className={`relative px-4 py-3 rounded-2xl border backdrop-blur-md font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl transition-all active:scale-95 ${
                  isBlitzActive
                    ? 'bg-amber-400 border-white text-slate-950 animate-pulse'
                    : blitzCharges > 0
                    ? 'bg-slate-900/90 border-amber-500/40 text-amber-300 hover:border-amber-400 hover:scale-105'
                    : 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>Infinity [Space]</span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-950 text-amber-300 text-[10px] font-black">
                  {blitzCharges}
                </span>
              </button>

              {/* EMP Nuke */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  activateEmpShockwave();
                }}
                disabled={empCharges <= 0}
                className={`relative px-4 py-3 rounded-2xl border backdrop-blur-md font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl transition-all active:scale-95 ${
                  empCharges > 0
                    ? 'bg-slate-900/90 border-rose-500/40 text-rose-300 hover:border-rose-400 hover:scale-105'
                    : 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Bomb className="w-4 h-4" />
                <span>EMP Shockwave [E]</span>
                <span className="px-1.5 py-0.5 rounded-full bg-rose-950 text-rose-300 text-[10px] font-black">
                  {empCharges}
                </span>
              </button>
            </div>

            {/* Streak Multiplier Visual Counter */}
            <div className="text-right">
              <div className="text-xs uppercase font-bold text-slate-400">Consecutive Hits</div>
              <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                {streak} STREAK
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* START SCREEN MODAL                                   */}
      {/* ==================================================== */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-20">
          <div className="max-w-md w-full bg-slate-900/90 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl shadow-cyan-950/60 animate-in fade-in zoom-in duration-300">
            {/* Title & Badge */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                PREMIUM 3D DIMENSION BREAKER
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                CYBER <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300">SMASH HIT 3D</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Journey through ethereal neon glass corridors. Throw metallic orbs to shatter crystal pyramids and avoid devastating crashes!
              </p>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 gap-3 py-1">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3 text-left">
                <Trophy className="w-6 h-6 text-amber-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Best Record</div>
                  <div className="text-lg font-black text-white">{highScore} m</div>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3 text-left">
                <Star className="w-6 h-6 text-cyan-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Cyber Coins</div>
                  <div className="text-lg font-black text-cyan-300">{coins}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={startGame}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                LAUNCH RUN
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowGarage(true)}
                  className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-cyan-400"
                >
                  <Eye className="w-4 h-4 text-cyan-400" />
                  Ball Garage
                </button>
                <button
                  onClick={() => setShowTutorial(true)}
                  className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-fuchsia-400"
                >
                  <Gauge className="w-4 h-4 text-fuchsia-400" />
                  How to Play
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* GAME OVER SCREEN                                     */}
      {/* ==================================================== */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-20 animate-in fade-in zoom-in duration-300">
          <div className="max-w-md w-full bg-slate-900/95 border border-rose-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl shadow-rose-950/60">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-400/30 text-rose-400 text-xs font-bold uppercase tracking-wider">
                DIMENSION RUN TERMINATED
              </div>
              <h2 className="text-3xl font-black text-white">OUT OF ORBS</h2>
              <p className="text-xs text-slate-300">
                You shattered countless glass monoliths and reached {statsSummary.distanceReached} meters!
              </p>
            </div>

            {/* Run Stats Grid */}
            <div className="grid grid-cols-3 gap-2.5 py-1 text-left">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Distance</div>
                <div className="text-lg font-black text-white">{statsSummary.distanceReached}m</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Crystals</div>
                <div className="text-lg font-black text-cyan-400">{crystalsShattered}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Max Streak</div>
                <div className="text-lg font-black text-fuchsia-400">{statsSummary.maxStreak}x</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={startGame}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                PLAY AGAIN
              </button>

              <button
                onClick={() => setGameState('start')}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all border border-slate-700"
              >
                Return to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* BALL SKINS GARAGE MODAL                              */}
      {/* ==================================================== */}
      {showGarage && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-30 animate-in fade-in zoom-in duration-200">
          <div className="max-w-xl w-full bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">BALL CUSTOMIZATION GARAGE</h2>
                <p className="text-xs text-slate-400">Unlock special metallic orbs with unique light shaders & perks.</p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 text-sm font-black flex items-center gap-1.5">
                <Star className="w-4 h-4 text-cyan-400" />
                {coins} Coins
              </div>
            </div>

            {/* Skins Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {DEFAULT_BALL_SKINS.map((skin) => {
                const isUnlocked = unlockedSkins.includes(skin.id);
                const isSelected = activeSkinId === skin.id;

                return (
                  <div
                    key={skin.id}
                    onClick={() => {
                      if (isUnlocked) {
                        setActiveSkinId(skin.id);
                        sound.playClick();
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20'
                        : isUnlocked
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                        : 'bg-slate-950/40 border-slate-900 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{skin.previewEmoji}</span>
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black uppercase">
                          EQUIPPED
                        </span>
                      ) : isUnlocked ? (
                        <span className="text-[10px] text-slate-400 font-bold">READY</span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-bold">{skin.price} Coins</span>
                      )}
                    </div>

                    <div>
                      <div className="font-extrabold text-sm text-white">{skin.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{skin.description}</div>
                    </div>

                    {!isUnlocked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          buySkin(skin);
                        }}
                        disabled={coins < skin.price}
                        className={`mt-1 w-full py-1.5 rounded-xl text-xs font-bold transition-all ${
                          coins >= skin.price
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        Unlock ({skin.price})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowGarage(false)}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all"
            >
              Back to Game
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* HOW TO PLAY TUTORIAL MODAL                           */}
      {/* ==================================================== */}
      {showTutorial && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-30 animate-in fade-in zoom-in duration-200">
          <div className="max-w-md w-full bg-slate-900/95 border border-fuchsia-500/40 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-white">HOW TO PLAY</h2>
              <p className="text-xs text-slate-400">Master the glass dimension breaking physics!</p>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 font-black">1</div>
                <div>
                  <div className="font-bold text-white mb-0.5">Aim & Tap to Shoot</div>
                  Click or tap anywhere in the corridor to throw metallic orbs. Each throw costs 1 ball.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 font-black">2</div>
                <div>
                  <div className="font-bold text-white mb-0.5">Shatter Crystals for Ammo</div>
                  Destroy glowing crystal pyramids to replenish +3, +5, or +10 orbs!
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-black">3</div>
                <div>
                  <div className="font-bold text-white mb-0.5">Build Multi-Shot Streaks</div>
                  Hitting crystals consecutively unlocks 2x, 3x, and 5x multi-shot volleys for maximum destruction!
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 font-black">4</div>
                <div>
                  <div className="font-bold text-white mb-0.5">Avoid Glass Obstacle Crashes</div>
                  Crashing into un-shattered glass doors or pendulums deducts 10 balls and resets your streak!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowTutorial(false)}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all"
            >
              Got it, Let's Play!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
