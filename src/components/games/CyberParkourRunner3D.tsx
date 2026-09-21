import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Sparkles,
  Flame,
  Zap,
  Shield,
  Crown,
  ShoppingBag,
  Coins,
  Pause,
  Gauge,
  Flag,
  ArrowRight,
  Crosshair,
  Footprints,
  Wind
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// --- RUNNER SUIT DEFINITIONS ---
interface RunnerSuit {
  id: string;
  name: string;
  glowColor: number;
  secondaryColor: number;
  speedMult: number;
  wallRunTime: number;
  grappleRange: number;
  price: number;
  description: string;
}

const SUITS_LIST: RunnerSuit[] = [
  {
    id: 'mirage_runner',
    name: 'Mirage Velocity',
    glowColor: 0x00f0ff,
    secondaryColor: 0x0088ff,
    speedMult: 1.0,
    wallRunTime: 140,
    grappleRange: 55,
    price: 0,
    description: 'Precision aerodynamic freerunning suit with kinetic dampers and magnetic wallrun latches.'
  },
  {
    id: 'ghost_shinobi',
    name: 'Ghost Shinobi FX',
    glowColor: 0xff007f,
    secondaryColor: 0xaa00ff,
    speedMult: 1.15,
    wallRunTime: 200,
    grappleRange: 60,
    price: 350,
    description: 'Lightweight stealth carbon-fiber suit tuned for extended vertical wall-runs and double jumps.'
  },
  {
    id: 'vortex_speedster',
    name: 'Vortex Overdrive',
    glowColor: 0xfacc15,
    secondaryColor: 0xff5500,
    speedMult: 1.3,
    wallRunTime: 160,
    grappleRange: 65,
    price: 750,
    description: 'Supersonic momentum suit equipped with micro-thrusters for blazing rooftop velocity.'
  },
  {
    id: 'apex_titan',
    name: 'Apex Cyber Vanguard',
    glowColor: 0x10b981,
    secondaryColor: 0x00f0ff,
    speedMult: 1.25,
    wallRunTime: 240,
    grappleRange: 80,
    price: 1200,
    description: 'Championship freerunning rig with military-grade grapple winches and infinite flow momentum.'
  }
];

interface RooftopSegment {
  mesh: THREE.Group;
  zStart: number;
  zEnd: number;
  width: number;
  hasLeftWall: boolean;
  hasRightWall: boolean;
  hasLaser: boolean;
  laserY: number;
  laserZ: number;
  hasVent: boolean;
  ventPos?: THREE.Vector3;
  hasGrapple: boolean;
  grapplePos?: THREE.Vector3;
  grappleMesh?: THREE.Mesh;
  coins: { mesh: THREE.Mesh; pos: THREE.Vector3; collected: boolean }[];
}

export const CyberParkourRunner3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // UI State
  const [gameState, setGameState] = useState<'menu' | 'dojo' | 'running' | 'paused' | 'gameover'>('menu');
  const [dataOrbs, setDataOrbs] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_parkour_orbs');
    return saved !== null ? parseInt(saved, 10) : 150;
  });
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_parkour_high');
    return saved !== null ? parseInt(saved, 10) : 18500;
  });
  const [selectedSuitIdx, setSelectedSuitIdx] = useState<number>(0);
  const [unlockedSuits, setUnlockedSuits] = useState<string[]>(() => {
    const saved = localStorage.getItem('novaplay_parkour_unlocked');
    return saved ? JSON.parse(saved) : ['mirage_runner'];
  });

  // Upgrades
  const [speedLvl, setSpeedLvl] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_parkour_spd');
    return saved !== null ? parseInt(saved, 10) : 1;
  });
  const [wallLvl, setWallLvl] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_parkour_wall');
    return saved !== null ? parseInt(saved, 10) : 1;
  });
  const [grappleLvl, setGrappleLvl] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_parkour_grap');
    return saved !== null ? parseInt(saved, 10) : 1;
  });

  // Live HUD
  const [score, setScore] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [speedMps, setSpeedMps] = useState<number>(0);
  const [comboMultiplier, setComboMultiplier] = useState<number>(1);
  const [adrenaline, setAdrenaline] = useState<number>(100);
  const [isSlowMo, setIsSlowMo] = useState<boolean>(false);
  const [grappleReady, setGrappleReady] = useState<boolean>(false);
  const [actionStateText, setActionStateText] = useState<string>('RUNNING');
  const [stuntPopup, setStuntPopup] = useState<{ text: string; id: number } | null>(null);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Input & Simulation State
  const simState = useRef({
    gameState: 'menu',
    playerX: 0,
    playerY: 1.8,
    playerZ: 0,
    vy: 0,
    speed: 24,
    baseSpeed: 24,
    maxSpeed: 42,
    isGrounded: true,
    coyoteTimer: 0,
    jumpCount: 0,
    maxJumps: 2,
    isSliding: false,
    slideTimer: 0,
    isWallRunning: false,
    wallSide: 'none' as 'left' | 'right' | 'none',
    wallRunTimer: 0,
    isGrappling: false,
    grappleTarget: null as THREE.Vector3 | null,
    grappleTimer: 0,
    slowMoActive: false,
    adrenaline: 100,
    score: 0,
    distance: 0,
    combo: 1,
    comboTimer: 0,
    suit: SUITS_LIST[0],
    speedLvl: 1,
    wallLvl: 1,
    grappleLvl: 1
  });

  const keysRef = useRef<Record<string, boolean>>({});

  // 3D Model Parts & Scarf Nodes Ref
  const characterRef = useRef<{
    root: THREE.Group | null;
    torso: THREE.Mesh | null;
    head: THREE.Mesh | null;
    visor: THREE.Mesh | null;
    leftLeg: THREE.Group | null;
    rightLeg: THREE.Group | null;
    leftArm: THREE.Group | null;
    rightArm: THREE.Group | null;
    scarfNodes: THREE.Mesh[];
  }>({
    root: null,
    torso: null,
    head: null,
    visor: null,
    leftLeg: null,
    rightLeg: null,
    leftArm: null,
    rightArm: null,
    scarfNodes: []
  });

  const sceneRefs = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    grappleLine: THREE.Line | null;
    segments: RooftopSegment[];
    nextSegmentZ: number;
    camShake: number;
    speedParticles: THREE.Points | null;
    speedParticlesGeo: THREE.BufferGeometry | null;
    targetReticle: THREE.Mesh | null;
    drones: THREE.Mesh[];
  }>({
    scene: null,
    camera: null,
    renderer: null,
    grappleLine: null,
    segments: [],
    nextSegmentZ: 0,
    camShake: 0,
    speedParticles: null,
    speedParticlesGeo: null,
    targetReticle: null,
    drones: []
  });

  // Stunt Notification Helper
  const triggerStunt = useCallback((text: string, bonusScore: number) => {
    const sim = simState.current;
    sim.score += bonusScore * sim.combo;
    sim.combo = Math.min(5, sim.combo + 1);
    sim.comboTimer = 180;
    setScore(sim.score);
    setComboMultiplier(sim.combo);
    setStuntPopup({ text, id: Date.now() });
  }, []);

  // Sync upgrades & suits
  useEffect(() => {
    simState.current.speedLvl = speedLvl;
    simState.current.wallLvl = wallLvl;
    simState.current.grappleLvl = grappleLvl;
    simState.current.suit = SUITS_LIST[selectedSuitIdx];
  }, [speedLvl, wallLvl, grappleLvl, selectedSuitIdx]);

  const handleToggleSound = () => {
    const isMute = sound.toggleMute();
    setMuted(isMute);
  };

  // Procedural Rooftop City Segment Creation
  const createRooftopSegment = (zStart: number, scene: THREE.Scene): RooftopSegment => {
    const segmentGroup = new THREE.Group();
    const length = 75 + Math.random() * 25;
    const width = 16;
    const zEnd = zStart - length;
    const suit = SUITS_LIST[selectedSuitIdx];

    // Main Rooftop Concrete Building Platform
    const roofGeo = new THREE.BoxGeometry(width, 14, length);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x080c18,
      metalness: 0.85,
      roughness: 0.25
    });
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(0, -7, zStart - length / 2);
    segmentGroup.add(roofMesh);

    // Glowing Neon Edge Borders
    const edgeGeo = new THREE.BoxGeometry(0.35, 0.4, length);
    const edgeMat = new THREE.MeshBasicMaterial({ color: suit.glowColor });
    const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
    leftEdge.position.set(-width / 2, 0.2, zStart - length / 2);
    segmentGroup.add(leftEdge);

    const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
    rightEdge.position.set(width / 2, 0.2, zStart - length / 2);
    segmentGroup.add(rightEdge);

    // Helipad / Solar Panels Pattern on Roof
    if (Math.random() < 0.5) {
      const padGeo = new THREE.CylinderGeometry(3.5, 3.5, 0.05, 16);
      const padMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.8 });
      const helipad = new THREE.Mesh(padGeo, padMat);
      helipad.position.set(0, 0.03, zStart - length / 2);
      segmentGroup.add(helipad);

      const ringGeo = new THREE.RingGeometry(3.2, 3.4, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: suit.glowColor, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.05, zStart - length / 2);
      segmentGroup.add(ring);
    }

    // Optional Wall-Running Holographic Billboard on Left or Right
    const rand = Math.random();
    const hasLeftWall = rand < 0.45;
    const hasRightWall = !hasLeftWall && rand < 0.85;

    if (hasLeftWall) {
      const wallGeo = new THREE.BoxGeometry(0.6, 9, length * 0.75);
      const wallMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.55
      });
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.position.set(-width / 2 - 0.3, 4.5, zStart - length / 2);
      segmentGroup.add(wallMesh);

      // Top railing border
      const railGeo = new THREE.BoxGeometry(0.8, 0.3, length * 0.75);
      const railMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(-width / 2 - 0.3, 9, zStart - length / 2);
      segmentGroup.add(rail);
    } else if (hasRightWall) {
      const wallGeo = new THREE.BoxGeometry(0.6, 9, length * 0.75);
      const wallMat = new THREE.MeshBasicMaterial({
        color: 0xff007f,
        transparent: true,
        opacity: 0.55
      });
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.position.set(width / 2 + 0.3, 4.5, zStart - length / 2);
      segmentGroup.add(wallMesh);

      const railGeo = new THREE.BoxGeometry(0.8, 0.3, length * 0.75);
      const railMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(width / 2 + 0.3, 9, zStart - length / 2);
      segmentGroup.add(rail);
    }

    // High-Voltage Laser Tripwire (Slide Under)
    const hasLaser = Math.random() < 0.35 && !hasLeftWall && !hasRightWall;
    const laserY = 1.7;
    const laserZ = zStart - length / 2;
    if (hasLaser) {
      const laserGeo = new THREE.CylinderGeometry(0.1, 0.1, width - 0.5, 8);
      const laserMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
      const laserMesh = new THREE.Mesh(laserGeo, laserMat);
      laserMesh.rotation.z = Math.PI / 2;
      laserMesh.position.set(0, laserY, laserZ);
      segmentGroup.add(laserMesh);

      // Warning Emitter Posts on edges
      const postGeo = new THREE.BoxGeometry(0.6, 3, 0.6);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(-width / 2 + 0.3, 1.5, laserZ);
      segmentGroup.add(leftPost);

      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(width / 2 - 0.3, 1.5, laserZ);
      segmentGroup.add(rightPost);
    }

    // AC Vent Jump Booster
    const hasVent = Math.random() < 0.25 && !hasLaser;
    let ventPos: THREE.Vector3 | undefined;
    if (hasVent) {
      const ventGeo = new THREE.BoxGeometry(3.5, 1.2, 3.5);
      const ventMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
      const ventMesh = new THREE.Mesh(ventGeo, ventMat);
      ventPos = new THREE.Vector3((Math.random() - 0.5) * 6, 0.6, zStart - length * 0.6);
      ventMesh.position.copy(ventPos);
      segmentGroup.add(ventMesh);

      const fanGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.2, 8);
      const fanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const fanMesh = new THREE.Mesh(fanGeo, fanMat);
      fanMesh.position.set(ventPos.x, 1.25, ventPos.z);
      segmentGroup.add(fanMesh);
    }

    // Floating Grapple Hook Ring Node
    const hasGrapple = Math.random() < 0.45;
    let grapplePos: THREE.Vector3 | undefined;
    let grappleMesh: THREE.Mesh | undefined;
    if (hasGrapple) {
      const ringGeo = new THREE.TorusGeometry(1.4, 0.25, 8, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      grappleMesh = new THREE.Mesh(ringGeo, ringMat);
      grapplePos = new THREE.Vector3((Math.random() - 0.5) * 4, 10.5, zStart - length / 2);
      grappleMesh.position.copy(grapplePos);
      segmentGroup.add(grappleMesh);
    }

    // Collectible Quantum Energy Orbs
    const coins: { mesh: THREE.Mesh; pos: THREE.Vector3; collected: boolean }[] = [];
    const orbCount = 3 + Math.floor(Math.random() * 4);
    for (let c = 0; c < orbCount; c++) {
      const orbGeo = new THREE.OctahedronGeometry(0.5);
      const orbMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      const orbZ = zStart - (c + 1) * (length / (orbCount + 1));
      const orbPos = new THREE.Vector3((Math.random() - 0.5) * 8, 1.2, orbZ);
      orbMesh.position.copy(orbPos);
      segmentGroup.add(orbMesh);
      coins.push({ mesh: orbMesh, pos: orbPos, collected: false });
    }

    scene.add(segmentGroup);

    return {
      mesh: segmentGroup,
      zStart,
      zEnd,
      width,
      hasLeftWall,
      hasRightWall,
      hasLaser,
      laserY,
      laserZ,
      hasVent,
      ventPos,
      hasGrapple,
      grapplePos,
      grappleMesh,
      coins
    };
  };

  // Start / Restart Freerunning Session
  const startRun = () => {
    const sc = sceneRefs.current;
    if (!sc.scene) return;

    // Clear old segments
    sc.segments.forEach((seg) => sc.scene?.remove(seg.mesh));
    sc.segments = [];

    const suit = SUITS_LIST[selectedSuitIdx];
    const initialSpeed = 24 * suit.speedMult * (1 + speedLvl * 0.08);

    simState.current.playerX = 0;
    simState.current.playerY = 1.8;
    simState.current.playerZ = 0;
    simState.current.vy = 0;
    simState.current.speed = initialSpeed;
    simState.current.baseSpeed = initialSpeed;
    simState.current.maxSpeed = 44 + speedLvl * 4;
    simState.current.isGrounded = true;
    simState.current.coyoteTimer = 10;
    simState.current.jumpCount = 0;
    simState.current.isSliding = false;
    simState.current.slideTimer = 0;
    simState.current.isWallRunning = false;
    simState.current.wallSide = 'none';
    simState.current.wallRunTimer = 0;
    simState.current.isGrappling = false;
    simState.current.grappleTarget = null;
    simState.current.grappleTimer = 0;
    simState.current.slowMoActive = false;
    simState.current.adrenaline = 100;
    simState.current.score = 0;
    simState.current.distance = 0;
    simState.current.combo = 1;
    simState.current.comboTimer = 0;
    simState.current.gameState = 'running';

    setScore(0);
    setDistance(0);
    setSpeedMps(Math.floor(initialSpeed));
    setComboMultiplier(1);
    setAdrenaline(100);
    setIsSlowMo(false);
    setGrappleReady(false);
    setActionStateText('SPRINTING');
    setIsNewRecord(false);
    setGameState('running');

    // Generate initial track segments ahead
    let currentZ = 20;
    for (let i = 0; i < 7; i++) {
      const seg = createRooftopSegment(currentZ, sc.scene);
      sc.segments.push(seg);
      // Rooftop chasm gap between skyscrapers
      const gap = i === 0 ? 0 : 10 + Math.random() * 8;
      currentZ = seg.zEnd - gap;
    }
    sc.nextSegmentZ = currentZ;

    sound.playJump();
  };

  // Parkour Actions: Jump with Coyote Time & Double Jump
  const triggerJump = useCallback(() => {
    const sim = simState.current;
    if (sim.gameState !== 'running') return;

    if (sim.isGrounded || sim.coyoteTimer > 0) {
      sim.vy = 18.5;
      sim.isGrounded = false;
      sim.coyoteTimer = 0;
      sim.jumpCount = 1;
      sound.playJump();
      triggerStunt('CHASM JUMP!', 50);
    } else if (sim.isWallRunning) {
      // Wall Kick thrust away from wall
      sim.vy = 19;
      sim.playerX += sim.wallSide === 'left' ? 5.0 : -5.0;
      sim.isWallRunning = false;
      sim.wallSide = 'none';
      sim.jumpCount = 1;
      sound.playJump();
      triggerStunt('WALL KICK!', 150);
    } else if (sim.jumpCount < sim.maxJumps) {
      // Double Jump Mid-Air Vault
      sim.vy = 17;
      sim.jumpCount++;
      sound.playPowerup();
      triggerStunt('AIR VAULT!', 100);
    }
  }, [triggerStunt]);

  // Parkour Actions: Slide
  const triggerSlide = useCallback(() => {
    const sim = simState.current;
    if (sim.gameState !== 'running' || sim.isSliding) return;

    sim.isSliding = true;
    sim.slideTimer = 40;
    sound.playPowerup();
  }, []);

  // Parkour Actions: Grappling Hook Slingshot
  const triggerGrapple = useCallback(() => {
    const sc = sceneRefs.current;
    const sim = simState.current;
    if (sim.gameState !== 'running' || sim.isGrappling) return;

    const maxRange = sim.suit.grappleRange + sim.grappleLvl * 8;
    for (const seg of sc.segments) {
      if (seg.hasGrapple && seg.grapplePos) {
        const distZ = seg.grapplePos.z - sim.playerZ;
        if (distZ < 0 && Math.abs(distZ) < maxRange) {
          sim.isGrappling = true;
          sim.grappleTarget = seg.grapplePos.clone();
          sim.grappleTimer = 35;
          sim.vy = 14;
          sim.speed += 8;
          sound.playLaser();
          sc.camShake = 12;
          triggerStunt('GRAPPLE SLINGSHOT!', 250);
          break;
        }
      }
    }
  }, [triggerStunt]);

  // Parkour Actions: Slow-Mo Matrix Time
  const triggerSlowMo = useCallback(() => {
    const sim = simState.current;
    if (sim.gameState !== 'running') return;

    if (sim.adrenaline >= 15) {
      sim.slowMoActive = !sim.slowMoActive;
      setIsSlowMo(sim.slowMoActive);
      sound.playPowerup();
    }
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code;

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(code)) {
        if (simState.current.gameState === 'running') {
          e.preventDefault();
        }
      }

      keysRef.current[k] = true;
      keysRef.current[code] = true;

      if (k === 'escape' || k === 'p') {
        if (simState.current.gameState === 'running') {
          simState.current.gameState = 'paused';
          setGameState('paused');
        } else if (simState.current.gameState === 'paused') {
          simState.current.gameState = 'running';
          setGameState('running');
        }
        sound.playClick();
      }

      if (k === ' ' || code === 'Space' || k === 'w' || code === 'KeyW' || code === 'ArrowUp') triggerJump();
      if (k === 's' || code === 'KeyS' || code === 'ArrowDown' || k === 'c') triggerSlide();
      if (k === 'e' || code === 'KeyE') triggerGrapple();
      if (k === 'q' || code === 'KeyQ' || k === 'shift' || code === 'ShiftLeft') triggerSlowMo();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code;
      keysRef.current[k] = false;
      keysRef.current[code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerJump, triggerSlide, triggerGrapple, triggerSlowMo]);

  // Main Three.js Scene Setup & 60 FPS Engine Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02010c);
    scene.fog = new THREE.FogExp2(0x02010c, 0.007);

    const camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 4.5, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    sceneRefs.current.scene = scene;
    sceneRefs.current.camera = camera;
    sceneRefs.current.renderer = renderer;

    const ambLight = new THREE.AmbientLight(0x220a44, 2.5);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 2.8);
    dirLight.position.set(40, 90, 40);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xff007f, 1.8);
    backLight.position.set(-40, 50, -60);
    scene.add(backLight);

    // City Skyway Background Skyscrapers
    for (let b = 0; b < 70; b++) {
      const bGeo = new THREE.BoxGeometry(25 + Math.random() * 45, 160 + Math.random() * 320, 25 + Math.random() * 45);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0x050218,
        metalness: 0.9,
        roughness: 0.2
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);

      const x = (Math.random() - 0.5) * 500;
      const z = -Math.random() * 900;
      bMesh.position.set(x, -60, z);
      scene.add(bMesh);

      // Skyscraper neon antenna beacon
      if (Math.random() < 0.4) {
        const beaconGeo = new THREE.SphereGeometry(0.8, 6, 6);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(x, 100 + Math.random() * 100, z);
        scene.add(beacon);
      }
    }

    // Build Articulated 3D Freerunner Character
    const playerGroup = new THREE.Group();

    // Torso Armor
    const torsoGeo = new THREE.BoxGeometry(0.9, 1.4, 0.55);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.y = 1.1;
    playerGroup.add(torsoMesh);

    // Chest Glowing Reactor Core
    const coreGeo = new THREE.BoxGeometry(0.4, 0.4, 0.1);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 1.2, 0.3);
    playerGroup.add(coreMesh);

    // Helmet Head
    const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.set(0, 2.0, 0);
    playerGroup.add(headMesh);

    // Glowing Visor
    const visorGeo = new THREE.BoxGeometry(0.45, 0.18, 0.2);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 2.0, -0.22);
    playerGroup.add(visorMesh);

    // Articulated Left & Right Legs
    const legGeo = new THREE.BoxGeometry(0.3, 0.85, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });

    const leftLeg = new THREE.Group();
    const lLegMesh = new THREE.Mesh(legGeo, legMat);
    lLegMesh.position.y = -0.42;
    leftLeg.add(lLegMesh);
    leftLeg.position.set(-0.25, 0.7, 0);
    playerGroup.add(leftLeg);

    const rightLeg = new THREE.Group();
    const rLegMesh = new THREE.Mesh(legGeo, legMat);
    rLegMesh.position.y = -0.42;
    rightLeg.add(rLegMesh);
    rightLeg.position.set(0.25, 0.7, 0);
    playerGroup.add(rightLeg);

    // Articulated Left & Right Arms
    const armGeo = new THREE.BoxGeometry(0.25, 0.75, 0.25);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });

    const leftArm = new THREE.Group();
    const lArmMesh = new THREE.Mesh(armGeo, armMat);
    lArmMesh.position.y = -0.35;
    leftArm.add(lArmMesh);
    leftArm.position.set(-0.6, 1.5, 0);
    playerGroup.add(leftArm);

    const rightArm = new THREE.Group();
    const rArmMesh = new THREE.Mesh(armGeo, armMat);
    rArmMesh.position.y = -0.35;
    rightArm.add(rArmMesh);
    rightArm.position.set(0.6, 1.5, 0);
    playerGroup.add(rightArm);

    // Physics Fluttering Scarf Ribbon
    const scarfNodes: THREE.Mesh[] = [];
    for (let s = 0; s < 5; s++) {
      const sGeo = new THREE.BoxGeometry(0.28 - s * 0.04, 0.08, 0.45);
      const sMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 - s * 0.12 });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.position.set(0, 1.6, 0.3 + s * 0.4);
      playerGroup.add(sMesh);
      scarfNodes.push(sMesh);
    }

    scene.add(playerGroup);

    characterRef.current = {
      root: playerGroup,
      torso: torsoMesh,
      head: headMesh,
      visor: visorMesh,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      scarfNodes
    };

    // Grappling Hook Cable Line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 3 });
    const grappleLine = new THREE.Line(lineGeo, lineMat);
    grappleLine.visible = false;
    scene.add(grappleLine);
    sceneRefs.current.grappleLine = grappleLine;

    // Grapple Target Reticle in 3D Space
    const reticleGeo = new THREE.RingGeometry(1.6, 1.8, 16);
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.visible = false;
    scene.add(reticle);
    sceneRefs.current.targetReticle = reticle;

    // Speed Particles Stream
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 20;
      particlePositions[i + 1] = Math.random() * 12;
      particlePositions[i + 2] = -Math.random() * 60;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.18,
      transparent: true,
      opacity: 0.6
    });
    const speedParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(speedParticles);
    sceneRefs.current.speedParticles = speedParticles;
    sceneRefs.current.speedParticlesGeo = particleGeo;

    // 60 FPS Parkour Game Loop
    let animId: number;
    let runCycle = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const sc = sceneRefs.current;
      const sim = simState.current;
      const char = characterRef.current;

      if (sim.gameState === 'running' && char.root) {
        const timeScale = sim.slowMoActive ? 0.45 : 1.0;

        // Dynamic Speed Scaling based on distance
        sim.speed = Math.min(sim.maxSpeed, sim.baseSpeed + sim.distance * 0.008);
        setSpeedMps(Math.floor(sim.speed));

        // Combo Multiplier Decay Timer
        if (sim.comboTimer > 0) {
          sim.comboTimer--;
          if (sim.comboTimer === 0 && sim.combo > 1) {
            sim.combo = 1;
            setComboMultiplier(1);
          }
        }

        // Adrenaline Drain & Regen
        if (sim.slowMoActive) {
          sim.adrenaline = Math.max(0, sim.adrenaline - 0.45);
          if (sim.adrenaline === 0) {
            sim.slowMoActive = false;
            setIsSlowMo(false);
          }
        } else if (sim.adrenaline < 100) {
          sim.adrenaline = Math.min(100, sim.adrenaline + 0.18);
        }
        setAdrenaline(Math.floor(sim.adrenaline));

        // Lateral Left/Right Movement
        let moveX = 0;
        if (keysRef.current['a'] || keysRef.current['arrowleft'] || keysRef.current['KeyA']) moveX -= 1;
        if (keysRef.current['d'] || keysRef.current['arrowright'] || keysRef.current['KeyD']) moveX += 1;

        sim.playerX += moveX * 0.48 * timeScale;
        sim.playerX = Math.max(-7.2, Math.min(7.2, sim.playerX));

        // Forward Velocity Progression
        sim.playerZ -= (sim.speed / 60) * timeScale;
        sim.distance = Math.floor(Math.abs(sim.playerZ));
        sim.score += Math.floor(1.5 * sim.combo * timeScale);
        setScore(sim.score);
        setDistance(sim.distance);

        // Slide Timer
        if (sim.isSliding) {
          sim.slideTimer--;
          if (sim.slideTimer <= 0) sim.isSliding = false;
        }

        // Find Current Rooftop Segment
        let currentSeg: RooftopSegment | null = null;
        for (const seg of sc.segments) {
          if (sim.playerZ <= seg.zStart && sim.playerZ >= seg.zEnd) {
            currentSeg = seg;
            break;
          }
        }

        // Check nearest Grapple Hook Node ahead
        let foundGrappleAhead = false;
        for (const seg of sc.segments) {
          if (seg.hasGrapple && seg.grapplePos) {
            const distZ = seg.grapplePos.z - sim.playerZ;
            if (distZ < 0 && Math.abs(distZ) < sim.suit.grappleRange + sim.grappleLvl * 8) {
              foundGrappleAhead = true;
              if (sc.targetReticle) {
                sc.targetReticle.visible = true;
                sc.targetReticle.position.copy(seg.grapplePos);
                sc.targetReticle.rotation.z += 0.05;
              }
              break;
            }
          }
        }
        if (!foundGrappleAhead && sc.targetReticle) {
          sc.targetReticle.visible = false;
        }
        setGrappleReady(foundGrappleAhead);

        // Grappling Hook Physics
        if (sim.isGrappling && sim.grappleTarget) {
          sim.grappleTimer--;
          const dir = new THREE.Vector3().subVectors(sim.grappleTarget, new THREE.Vector3(sim.playerX, sim.playerY, sim.playerZ));
          sim.playerX += dir.x * 0.12 * timeScale;
          sim.playerY += dir.y * 0.12 * timeScale;

          if (sc.grappleLine) {
            sc.grappleLine.visible = true;
            const pts = [new THREE.Vector3(sim.playerX, sim.playerY + 1.2, sim.playerZ), sim.grappleTarget];
            sc.grappleLine.geometry.setFromPoints(pts);
          }

          setActionStateText('GRAPPLING');

          if (sim.grappleTimer <= 0 || dir.length() < 3.2) {
            sim.isGrappling = false;
            sim.grappleTarget = null;
            if (sc.grappleLine) sc.grappleLine.visible = false;
            sim.vy = 8;
          }
        } else {
          if (sc.grappleLine) sc.grappleLine.visible = false;

          // Wall-Running Magnetic Lock Check
          let onWall = false;
          if (currentSeg && !sim.isGrounded) {
            if (currentSeg.hasLeftWall && sim.playerX <= -5.5) {
              onWall = true;
              sim.isWallRunning = true;
              sim.wallSide = 'left';
            } else if (currentSeg.hasRightWall && sim.playerX >= 5.5) {
              onWall = true;
              sim.isWallRunning = true;
              sim.wallSide = 'right';
            }
          }

          if (onWall) {
            sim.vy = 0;
            sim.playerY = 2.4;
            setActionStateText('WALL RUNNING');
            sim.score += 2;
          } else {
            sim.isWallRunning = false;
            sim.wallSide = 'none';

            // Gravity & Vertical Physics
            sim.vy -= 0.82 * timeScale;
            sim.playerY += sim.vy * 0.08 * timeScale;

            if (currentSeg && sim.playerY <= 1.8) {
              sim.playerY = 1.8;
              sim.vy = 0;
              sim.isGrounded = true;
              sim.coyoteTimer = 10;
              sim.jumpCount = 0;
              setActionStateText(sim.isSliding ? 'SLIDING' : 'SPRINTING');
            } else {
              sim.isGrounded = false;
              if (sim.coyoteTimer > 0) sim.coyoteTimer--;

              // Check AC Vent Launch Boost
              if (currentSeg && currentSeg.hasVent && currentSeg.ventPos) {
                const dX = Math.abs(sim.playerX - currentSeg.ventPos.x);
                const dZ = Math.abs(sim.playerZ - currentSeg.ventPos.z);
                if (dX < 2.0 && dZ < 2.0 && sim.playerY < 3.0) {
                  sim.vy = 26;
                  sound.playPowerup();
                  triggerStunt('SUPER VENT LAUNCH!', 150);
                }
              }

              if (!currentSeg && sim.playerY < -22) {
                // Fell into chasm gap between skyscrapers
                sim.gameState = 'gameover';
                setGameState('gameover');
                sound.playGameOver();

                // Save High Score
                if (sim.score > highScore) {
                  setHighScore(sim.score);
                  setIsNewRecord(true);
                  localStorage.setItem('novaplay_parkour_high', String(sim.score));
                  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                }
              }
            }
          }
        }

        // Laser Barrier Collision (Avoid if sliding!)
        if (currentSeg && currentSeg.hasLaser && !sim.isSliding && sim.playerY > 1.0) {
          const laserDistZ = Math.abs(sim.playerZ - currentSeg.laserZ);
          if (laserDistZ < 1.4) {
            sim.gameState = 'gameover';
            setGameState('gameover');
            sound.playGameOver();
          }
        }

        // Collectible Quantum Energy Orbs Collision
        if (currentSeg) {
          currentSeg.coins.forEach((orb) => {
            if (!orb.collected) {
              const dX = Math.abs(orb.pos.x - sim.playerX);
              const dZ = Math.abs(orb.pos.z - sim.playerZ);
              if (dX < 2.0 && dZ < 2.0) {
                orb.collected = true;
                orb.mesh.visible = false;
                sound.playPowerup();
                setDataOrbs((o) => {
                  const nextO = o + 1;
                  localStorage.setItem('novaplay_parkour_orbs', String(nextO));
                  return nextO;
                });
                sim.score += 60 * sim.combo;
              }
            }
          });
        }

        // Update 3D Character Articulated Run Cycle
        runCycle += 0.25 * timeScale;
        char.root.position.set(sim.playerX, sim.playerY, sim.playerZ);

        if (sim.isSliding) {
          char.root.scale.set(1.0, 0.4, 1.4);
          char.root.rotation.x = 0.3;
          if (char.leftLeg && char.rightLeg) {
            char.leftLeg.rotation.x = -1.2;
            char.rightLeg.rotation.x = -1.2;
          }
        } else if (sim.isWallRunning) {
          char.root.scale.set(1.0, 1.0, 1.0);
          char.root.rotation.z = sim.wallSide === 'left' ? -0.45 : 0.45;
          char.root.rotation.x = 0;
          if (char.leftLeg && char.rightLeg) {
            char.leftLeg.rotation.x = Math.sin(runCycle) * 0.8;
            char.rightLeg.rotation.x = -Math.sin(runCycle) * 0.8;
          }
        } else if (!sim.isGrounded) {
          // Mid-Air Jump Pose
          char.root.scale.set(1.0, 1.0, 1.0);
          char.root.rotation.set(0, 0, 0);
          if (char.leftLeg && char.rightLeg) {
            char.leftLeg.rotation.x = 0.6;
            char.rightLeg.rotation.x = -0.4;
          }
          if (char.leftArm && char.rightArm) {
            char.leftArm.rotation.x = -0.8;
            char.rightArm.rotation.x = 0.8;
          }
        } else {
          // Ground Sprinting Animation
          char.root.scale.set(1.0, 1.0, 1.0);
          char.root.rotation.set(0, 0, 0);
          if (char.leftLeg && char.rightLeg) {
            char.leftLeg.rotation.x = Math.sin(runCycle) * 0.75;
            char.rightLeg.rotation.x = -Math.sin(runCycle) * 0.75;
          }
          if (char.leftArm && char.rightArm) {
            char.leftArm.rotation.x = -Math.sin(runCycle) * 0.65;
            char.rightArm.rotation.x = Math.sin(runCycle) * 0.65;
          }
        }

        // Scarf Fluttering Wave Simulation
        char.scarfNodes.forEach((node, idx) => {
          node.position.x = Math.sin(runCycle * 1.5 + idx * 0.8) * 0.15;
          node.position.y = 1.6 + Math.cos(runCycle * 1.5 + idx * 0.8) * 0.1;
        });

        // Dynamic Camera Follow & Wallrun Tilt Angle
        const targetCamX = sim.playerX * 0.65;
        const targetCamY = sim.playerY + 3.2;
        const targetCamZ = sim.playerZ + 8.2;

        camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.15);
        camera.lookAt(sim.playerX, sim.playerY + 1.2, sim.playerZ - 18);

        const targetRoll = sim.wallSide === 'left' ? -0.22 : sim.wallSide === 'right' ? 0.22 : 0;
        camera.rotation.z += (targetRoll - camera.rotation.z) * 0.12;

        // Speed Particle Stream Positioning
        if (sc.speedParticles && sc.speedParticlesGeo) {
          sc.speedParticles.position.set(sim.playerX, sim.playerY + 2, sim.playerZ - 15);
        }

        // Procedural Infinite Course Generation
        if (sim.playerZ < sc.nextSegmentZ + 280) {
          const newSeg = createRooftopSegment(sc.nextSegmentZ, sc.scene);
          sc.segments.push(newSeg);
          sc.nextSegmentZ = newSeg.zEnd - (10 + Math.random() * 9);
        }

        // Clean up old segments behind runner
        if (sc.segments.length > 8 && sc.segments[0].zEnd > sim.playerZ + 60) {
          const oldSeg = sc.segments.shift();
          if (oldSeg) sc.scene.remove(oldSeg.mesh);
        }
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Purchase Suits & Upgrades in Dojo
  const buySuit = (idx: number) => {
    const suit = SUITS_LIST[idx];
    if (dataOrbs >= suit.price && !unlockedSuits.includes(suit.id)) {
      const nextOrbs = dataOrbs - suit.price;
      const nextUnlocked = [...unlockedSuits, suit.id];
      setDataOrbs(nextOrbs);
      setUnlockedSuits(nextUnlocked);
      setSelectedSuitIdx(idx);
      localStorage.setItem('novaplay_parkour_orbs', String(nextOrbs));
      localStorage.setItem('novaplay_parkour_unlocked', JSON.stringify(nextUnlocked));
      sound.playPowerup();
    }
  };

  const buySpeedUpgrade = () => {
    const cost = speedLvl * 60;
    if (dataOrbs >= cost && speedLvl < 5) {
      const nextO = dataOrbs - cost;
      const nextLvl = speedLvl + 1;
      setDataOrbs(nextO);
      setSpeedLvl(nextLvl);
      localStorage.setItem('novaplay_parkour_orbs', String(nextO));
      localStorage.setItem('novaplay_parkour_spd', String(nextLvl));
      sound.playPowerup();
    }
  };

  const buyWallUpgrade = () => {
    const cost = wallLvl * 60;
    if (dataOrbs >= cost && wallLvl < 5) {
      const nextO = dataOrbs - cost;
      const nextLvl = wallLvl + 1;
      setDataOrbs(nextO);
      setWallLvl(nextLvl);
      localStorage.setItem('novaplay_parkour_orbs', String(nextO));
      localStorage.setItem('novaplay_parkour_wall', String(nextLvl));
      sound.playPowerup();
    }
  };

  const buyGrappleUpgrade = () => {
    const cost = grappleLvl * 60;
    if (dataOrbs >= cost && grappleLvl < 5) {
      const nextO = dataOrbs - cost;
      const nextLvl = grappleLvl + 1;
      setDataOrbs(nextO);
      setGrappleLvl(nextLvl);
      localStorage.setItem('novaplay_parkour_orbs', String(nextO));
      localStorage.setItem('novaplay_parkour_grap', String(nextLvl));
      sound.playPowerup();
    }
  };

  return (
    <div className="relative w-full h-[520px] sm:h-[600px] md:h-[700px] lg:h-[750px] max-h-[85vh] bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)] select-none flex flex-col items-center justify-center font-sans touch-none">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-pointer" />

      {/* STUNT NOTIFICATION POPUP */}
      {stuntPopup && (
        <div
          key={stuntPopup.id}
          className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/30 to-pink-500/30 border border-amber-400 text-amber-300 font-black text-xs md:text-sm tracking-wider uppercase backdrop-blur-md animate-bounce z-20 pointer-events-none shadow-[0_0_20px_rgba(245,158,11,0.5)]"
        >
          ⚡ {stuntPopup.text}
        </div>
      )}

      {/* TOP HEADS-UP DISPLAY (HUD) */}
      {gameState === 'running' && (
        <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex items-center justify-between pointer-events-none z-10 gap-2">
          {/* Distance, Score & Combo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-baseline gap-1 bg-slate-900/90 border border-cyan-500/40 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl backdrop-blur-md shadow-lg">
              <span className="text-xl sm:text-3xl font-black text-cyan-400">{distance}</span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400">M</span>
            </div>

            <div className="flex flex-col bg-slate-900/90 border border-purple-500/40 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-2xl backdrop-blur-md shadow-lg">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-purple-400 font-black">SCORE</span>
              <span className="text-sm sm:text-lg font-black text-white">{score.toLocaleString()}</span>
            </div>

            {comboMultiplier > 1 && (
              <div className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-black text-xs animate-pulse">
                {comboMultiplier}X COMBO
              </div>
            )}
          </div>

          {/* Adrenaline & Orbs & Audio */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Adrenaline Slow-Mo Bar */}
            <div className="hidden sm:flex flex-col gap-1 bg-slate-900/90 border border-amber-500/40 px-3 py-1.5 rounded-2xl backdrop-blur-md shadow-lg">
              <div className="flex items-center justify-between text-[10px] font-black text-amber-400">
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>SLOW-MO</span>
                </div>
                <span>{adrenaline}%</span>
              </div>
              <div className="w-24 md:w-28 bg-slate-950 rounded-full h-2 overflow-hidden p-0.5 border border-amber-500/30">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-75"
                  style={{ width: `${adrenaline}%` }}
                />
              </div>
            </div>

            {/* Quantum Data Orbs */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-cyan-500/40 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl backdrop-blur-md shadow-lg">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
              <span className="font-bold text-xs sm:text-sm text-cyan-300">{dataOrbs}</span>
            </div>

            <button
              onClick={handleToggleSound}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 pointer-events-auto cursor-pointer"
            >
              {muted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />}
            </button>
            <button
              onClick={() => {
                simState.current.gameState = 'paused';
                setGameState('paused');
              }}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 pointer-events-auto cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400" />
            </button>
          </div>
        </div>
      )}

      {/* MOBILE TOUCH FREERUNNING BUTTONS */}
      {gameState === 'running' && (
        <div className="absolute bottom-4 left-3 right-3 sm:bottom-6 sm:left-4 sm:right-4 flex justify-between items-end z-20 md:hidden pointer-events-auto select-none">
          {/* Left / Right Steering */}
          <div className="flex gap-2">
            <button
              onTouchStart={() => (keysRef.current['a'] = true)}
              onTouchEnd={() => (keysRef.current['a'] = false)}
              onMouseDown={() => (keysRef.current['a'] = true)}
              onMouseUp={() => (keysRef.current['a'] = false)}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-cyan-700/80 active:bg-cyan-500 text-white font-black text-lg flex items-center justify-center border-2 border-cyan-400 shadow-lg active:scale-95"
            >
              ◀
            </button>
            <button
              onTouchStart={() => (keysRef.current['d'] = true)}
              onTouchEnd={() => (keysRef.current['d'] = false)}
              onMouseDown={() => (keysRef.current['d'] = true)}
              onMouseUp={() => (keysRef.current['d'] = false)}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-cyan-700/80 active:bg-cyan-500 text-white font-black text-lg flex items-center justify-center border-2 border-cyan-400 shadow-lg active:scale-95"
            >
              ▶
            </button>
          </div>

          {/* Action Buttons: SLIDE, GRAPPLE, JUMP */}
          <div className="flex items-center gap-2">
            <button
              onClick={triggerSlide}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-pink-700/80 active:bg-pink-500 border-2 border-pink-400 text-white font-black text-[11px] sm:text-xs flex flex-col items-center justify-center shadow-md active:scale-95"
            >
              <span>SLIDE</span>
            </button>

            <button
              onClick={triggerGrapple}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 text-white font-black text-[11px] sm:text-xs flex flex-col items-center justify-center shadow-md active:scale-95 transition-all ${
                grappleReady
                  ? 'bg-amber-500 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.8)] scale-105 animate-pulse'
                  : 'bg-amber-700/80 border-amber-400'
              }`}
            >
              <span>HOOK</span>
            </button>

            <button
              onClick={triggerJump}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 border-2 border-cyan-300 text-white font-black text-sm sm:text-base flex flex-col items-center justify-center active:scale-95 shadow-[0_0_25px_rgba(0,240,255,0.6)]"
            >
              <span>JUMP</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN MENU OVERLAY */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 z-30 text-center animate-fade-in overflow-y-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xs tracking-widest uppercase mb-2 sm:mb-3 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>3D Rooftop Freerunning & Parkour</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-500 tracking-wider mb-2 drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">
            ROOFTOP PARKOUR: VELOCITY 3D
          </h1>
          <p className="text-cyan-300/80 max-w-lg text-xs sm:text-sm md:text-base font-medium mb-5 sm:mb-6">
            Sprint across neon glass skyscrapers, wall-run on illuminated billboards, power-slide under high-voltage lasers, and slingshot across skyscraper gaps with energy grappling hooks!
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 max-w-xl w-full mb-6 sm:mb-8 text-xs">
            <div className="bg-slate-900/90 border border-cyan-500/30 p-2.5 sm:p-3 rounded-xl flex flex-col items-center gap-1">
              <Footprints className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              <span className="font-bold text-slate-200">A / D + SPACE</span>
              <span className="text-[11px] text-slate-400">Run, Jump & Double Jump</span>
            </div>
            <div className="bg-slate-900/90 border border-pink-500/30 p-2.5 sm:p-3 rounded-xl flex flex-col items-center gap-1">
              <Wind className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />
              <span className="font-bold text-slate-200">S / Down / C</span>
              <span className="text-[11px] text-slate-400">Slide Under Lasers</span>
            </div>
            <div className="bg-slate-900/90 border border-amber-500/30 p-2.5 sm:p-3 rounded-xl flex flex-col items-center gap-1">
              <Crosshair className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span className="font-bold text-slate-200">E / Hook</span>
              <span className="text-[11px] text-slate-400">Grapple Slingshot</span>
            </div>
            <div className="bg-slate-900/90 border border-emerald-500/30 p-2.5 sm:p-3 rounded-xl flex flex-col items-center gap-1">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              <span className="font-bold text-slate-200">Q / Shift</span>
              <span className="text-[11px] text-slate-400">Slow-Mo Matrix Time</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setGameState('dojo')}
              className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-105"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>RUNNER ARMORY</span>
            </button>

            <button
              onClick={startRun}
              className="px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-rose-500 via-purple-600 to-cyan-500 hover:from-rose-400 hover:to-cyan-400 text-white font-black text-base sm:text-lg tracking-wider uppercase shadow-[0_0_30px_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 sm:gap-3 cursor-pointer"
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
              <span>START FREERUN</span>
            </button>
          </div>

          {highScore > 0 && (
            <div className="flex items-center gap-2 mt-5 text-amber-400 text-xs sm:text-sm font-bold">
              <Trophy className="w-4 h-4" />
              <span>RECORD DISTANCE SCORE: {highScore.toLocaleString()} PTS</span>
            </div>
          )}
        </div>
      )}

      {/* DOJO ARMORY SUITS & UPGRADES OVERLAY */}
      {gameState === 'dojo' && (
        <div className="absolute inset-0 bg-slate-950/94 backdrop-blur-lg flex flex-col items-center justify-center p-4 sm:p-6 z-30 text-center animate-fade-in overflow-y-auto">
          <div className="flex items-center justify-between w-full max-w-3xl mb-3">
            <h2 className="text-xl sm:text-3xl font-black text-cyan-400 tracking-wider">RUNNER ARMORY & UPGRADES</h2>
            <div className="flex items-center gap-1.5 bg-cyan-500/20 border border-cyan-500/40 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              <span className="font-black text-xs sm:text-base text-cyan-300">{dataOrbs} DATA ORBS</span>
            </div>
          </div>

          {/* Suits Catalog */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 max-w-3xl w-full mb-4">
            {SUITS_LIST.map((s, idx) => {
              const isUnlocked = unlockedSuits.includes(s.id);
              const isSelected = selectedSuitIdx === idx;

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (isUnlocked) setSelectedSuitIdx(idx);
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900/95 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-black text-white text-sm sm:text-base">{s.name}</span>
                      <span className="text-[11px] sm:text-xs font-bold text-cyan-400 uppercase">SPEED x{s.speedMult}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2.5">{s.description}</p>
                  </div>

                  {!isUnlocked ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        buySuit(idx);
                      }}
                      disabled={dataOrbs < s.price}
                      className={`w-full py-1.5 sm:py-2 rounded-xl font-bold text-xs cursor-pointer ${
                        dataOrbs >= s.price ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      UNLOCK ({s.price} Orbs)
                    </button>
                  ) : (
                    <button className="w-full py-1.5 sm:py-2 rounded-xl bg-slate-800 text-cyan-400 font-bold text-xs pointer-events-none">
                      {isSelected ? 'EQUIPPED' : 'SELECT'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* 3 Skill Upgrades: Speed, Wallrun, Grapple */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-3xl w-full mb-5">
            <div className="bg-slate-900/90 border border-cyan-500/30 p-2.5 sm:p-3 rounded-xl flex flex-col items-center gap-1">
              <span className="font-bold text-[11px] sm:text-xs text-white">MOMENTUM</span>
              <span className="text-[10px] sm:text-xs text-slate-400">LVL {speedLvl} / 5</span>
              <button
                onClick={buySpeedUpgrade}
                disabled={speedLvl >= 5 || dataOrbs < speedLvl * 60}
                className={`w-full mt-1 py-1 rounded-lg font-bold text-[10px] sm:text-xs cursor-pointer ${
                  speedLvl >= 5 ? 'bg-slate-800 text-slate-500' : dataOrbs >= speedLvl * 60 ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {speedLvl >= 5 ? 'MAX' : `UPGRADE (${speedLvl * 60})`}
              </button>
            </div>

            <div className="bg-slate-900/90 border border-pink-500/30 p-2.5 sm:p-3 rounded-xl flex flex-col items-center gap-1">
              <span className="font-bold text-[11px] sm:text-xs text-white">WALL LATCH</span>
              <span className="text-[10px] sm:text-xs text-slate-400">LVL {wallLvl} / 5</span>
              <button
                onClick={buyWallUpgrade}
                disabled={wallLvl >= 5 || dataOrbs < wallLvl * 60}
                className={`w-full mt-1 py-1 rounded-lg font-bold text-[10px] sm:text-xs cursor-pointer ${
                  wallLvl >= 5 ? 'bg-slate-800 text-slate-500' : dataOrbs >= wallLvl * 60 ? 'bg-pink-600 hover:bg-pink-500 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {wallLvl >= 5 ? 'MAX' : `UPGRADE (${wallLvl * 60})`}
              </button>
            </div>

            <div className="bg-slate-900/90 border border-amber-500/30 p-2.5 sm:p-3 rounded-xl flex flex-col items-center gap-1">
              <span className="font-bold text-[11px] sm:text-xs text-white">GRAPPLE RANGE</span>
              <span className="text-[10px] sm:text-xs text-slate-400">LVL {grappleLvl} / 5</span>
              <button
                onClick={buyGrappleUpgrade}
                disabled={grappleLvl >= 5 || dataOrbs < grappleLvl * 60}
                className={`w-full mt-1 py-1 rounded-lg font-bold text-[10px] sm:text-xs cursor-pointer ${
                  grappleLvl >= 5 ? 'bg-slate-800 text-slate-500' : dataOrbs >= grappleLvl * 60 ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {grappleLvl >= 5 ? 'MAX' : `UPGRADE (${grappleLvl * 60})`}
              </button>
            </div>
          </div>

          <button
            onClick={() => setGameState('menu')}
            className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm tracking-wider cursor-pointer"
          >
            BACK TO FREERUN MENU
          </button>
        </div>
      )}

      {/* PAUSED OVERLAY */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-black text-cyan-400 tracking-wider mb-2">RUN PAUSED</h2>
          <p className="text-slate-400 text-xs sm:text-sm mb-6">Runner holding position on skyscraper rooftop.</p>

          <div className="flex flex-col gap-3 w-64 mb-6">
            <button
              onClick={() => {
                simState.current.gameState = 'running';
                setGameState('running');
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-sm tracking-wider uppercase shadow-lg cursor-pointer"
            >
              RESUME FREERUN
            </button>
            <button
              onClick={startRun}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/40 text-rose-400 font-bold text-sm tracking-wider uppercase cursor-pointer"
            >
              RESTART RUN
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-lg flex flex-col items-center justify-center p-4 sm:p-6 z-30 text-center animate-fade-in">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-500 mb-3 sm:mb-4 shadow-[0_0_25px_rgba(244,63,94,0.6)]">
            <Flame className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-rose-500 tracking-wider mb-1.5">RUN TERMINATED</h2>
          <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6">Fell into the skyscraper chasm or triggered laser grid.</p>

          {isNewRecord && (
            <div className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-bold text-xs mb-3 animate-bounce">
              🏆 NEW PERSONAL RECORD!
            </div>
          )}

          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-6 max-w-sm w-full mb-5 space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Distance Cleared:</span>
              <span className="text-lg sm:text-xl font-black text-cyan-400">{distance} METERS</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Score Earned:</span>
              <span className="font-bold text-pink-400">{score.toLocaleString()} PTS</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Data Orbs Collected:</span>
              <span className="font-bold text-amber-400">{dataOrbs} ORBS</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setGameState('dojo')}
              className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-bold text-xs sm:text-sm tracking-wider uppercase cursor-pointer"
            >
              <span>RUNNER ARMORY</span>
            </button>

            <button
              onClick={startRun}
              className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-black text-sm sm:text-base tracking-wider uppercase shadow-[0_0_25px_rgba(0,240,255,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>FREERUN AGAIN</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CyberParkourRunner3D;

