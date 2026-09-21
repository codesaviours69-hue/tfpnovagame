import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  Trophy, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Play, 
  Crosshair, Award, Flame, Star, CheckCircle, ArrowRight, Eye, Gauge,
  Radio, Compass, ShieldAlert, Rocket, HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// TYPES & DATA CONFIG
// ----------------------------------------------------

export interface StarshipSkin {
  id: string;
  name: string;
  nameGuj: string;
  price: number;
  unlocked: boolean;
  hullColor: number;
  glowColor: number;
  engineColor: number;
  previewEmoji: string;
  maxShield: number;
  fireRate: number; // Shots per sec
  handling: number; // Agility mult
  description: string;
}

export const STARSHIPS: StarshipSkin[] = [
  {
    id: 'viper-x1',
    name: 'Viper X-1 Cyber Interceptor',
    nameGuj: 'વાઇપર X-1 સાયબર ઇન્ટરસેપ્ટર',
    price: 0,
    unlocked: true,
    hullColor: 0x00f0ff,
    glowColor: 0x38bdf8,
    engineColor: 0x00f0ff,
    previewEmoji: '🚀',
    maxShield: 100,
    fireRate: 8,
    handling: 1.0,
    description: 'High-agility tactical interceptor with twin synchronized plasma cannons.',
  },
  {
    id: 'shadow-phantom',
    name: 'Shadow-X Stealth Phantom',
    nameGuj: 'શેડો-X સ્ટીલ્થ ફેન્ટમ',
    price: 450,
    unlocked: false,
    hullColor: 0xa855f7,
    glowColor: 0xc084fc,
    engineColor: 0x9333ea,
    previewEmoji: '🛸',
    maxShield: 120,
    fireRate: 10,
    handling: 1.25,
    description: 'Quantum phase stealth fighter equipped with rapid laser optics.',
  },
  {
    id: 'titan-gunship',
    name: 'Titan Dread-Wing Gunship',
    nameGuj: 'ટાઇટન ડ્રેડ-વિંગ ગનશીપ',
    price: 900,
    unlocked: false,
    hullColor: 0xef4444,
    glowColor: 0xf87171,
    engineColor: 0xf97316,
    previewEmoji: '🛰️',
    maxShield: 180,
    fireRate: 7,
    handling: 0.85,
    description: 'Heavily armored assault destroyer with reinforced kinetic barrier shields.',
  },
  {
    id: 'solar-phoenix',
    name: 'Solar Phoenix 24K',
    nameGuj: 'સોલર ફોનિક્સ 24K',
    price: 1800,
    unlocked: false,
    hullColor: 0xfacc15,
    glowColor: 0xfde047,
    engineColor: 0xf59e0b,
    previewEmoji: '👑',
    maxShield: 150,
    fireRate: 12,
    handling: 1.35,
    description: 'Pure 24K gold celestial flagship with supercharged solar flare torpedoes.',
  },
  {
    id: 'void-reaver',
    name: 'Void Reaver Singularity',
    nameGuj: 'વોઇડ રિવર સિંગ્યુલેરિટી',
    price: 2800,
    unlocked: false,
    hullColor: 0x10b981,
    glowColor: 0x34d399,
    engineColor: 0x059669,
    previewEmoji: '🔮',
    maxShield: 200,
    fireRate: 14,
    handling: 1.4,
    description: 'Dark matter alien prototype firing disintegrating quantum singularity blasts.',
  },
];

// Projectile & Combat Entity Models
interface LaserBolt {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  isPlayer: boolean;
  damage: number;
  life: number;
}

interface HomingMissile {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  target?: EnemyShip;
  life: number;
}

interface EnemyShip {
  mesh: THREE.Group;
  type: 'drone' | 'interceptor' | 'bomber' | 'boss';
  hp: number;
  maxHp: number;
  velocity: THREE.Vector3;
  fireCooldown: number;
  scoreValue: number;
}

interface Asteroid {
  mesh: THREE.Mesh;
  hp: number;
  rotSpeed: THREE.Vector3;
}

export const CyberStarfighter3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game UI State
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'victory'>('start');
  const [score, setScore] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [shield, setShield] = useState<number>(100);
  const [missiles, setMissiles] = useState<number>(6);
  const [empCharges, setEmpCharges] = useState<number>(2);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('starfighter3d_highscore') || '0', 10);
  });
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('starfighter3d_coins') || '220', 10);
  });
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [activeShipId, setActiveShipId] = useState<string>(() => {
    return localStorage.getItem('starfighter3d_active_ship') || 'viper-x1';
  });
  const [unlockedShips, setUnlockedShips] = useState<string[]>(() => {
    const saved = localStorage.getItem('starfighter3d_unlocked_ships');
    return saved ? JSON.parse(saved) : ['viper-x1'];
  });

  // Modals
  const [showHangar, setShowHangar] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [lockOnActive, setLockOnActive] = useState<boolean>(false);

  const toggleMute = () => {
    const isMute = sound.toggleMute();
    setMuted(isMute);
  };

  const getShipConfig = useCallback((id: string) => {
    return STARSHIPS.find((s) => s.id === id) || STARSHIPS[0];
  }, []);

  // ----------------------------------------------------
  // THREE.JS ENGINE REFS
  // ----------------------------------------------------
  const engineRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    playerShip: THREE.Group;
    shipMaterial: THREE.MeshStandardMaterial;
    engineFlames: THREE.Mesh[];
    shieldSphere: THREE.Mesh;
    lasers: LaserBolt[];
    missiles: HomingMissile[];
    enemies: EnemyShip[];
    asteroids: Asteroid[];
    starfield: THREE.Points;
    bossShip?: EnemyShip;
    playerPos: THREE.Vector3;
    playerTargetPos: THREE.Vector3;
    barrelRollAngle: number;
    isRolling: boolean;
    rollCooldown: number;
    fireTimer: number;
    lockOnTarget?: EnemyShip;
    lockOnProgress: number;
    shieldVal: number;
    maxShieldVal: number;
    scoreVal: number;
    waveVal: number;
    lastFrameTime: number;
    isRunning: boolean;
    activeShipConfig: StarshipSkin;
  } | null>(null);

  // ----------------------------------------------------
  // BUILD 3D PLAYER STARSHIP GEOMETRY
  // ----------------------------------------------------
  const buildPlayerShipMesh = (skin: StarshipSkin): { shipGroup: THREE.Group; shipMat: THREE.MeshStandardMaterial; flames: THREE.Mesh[]; shieldMesh: THREE.Mesh } => {
    const group = new THREE.Group();

    const shipMat = new THREE.MeshStandardMaterial({
      color: skin.hullColor,
      emissive: skin.glowColor,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x090d24,
      roughness: 0.4,
      metalness: 0.9,
    });

    // Fuselage Core
    const fuselageGeo = new THREE.ConeGeometry(0.8, 4.5, 4);
    const fuselage = new THREE.Mesh(fuselageGeo, shipMat);
    fuselage.rotation.x = -Math.PI / 2;
    group.add(fuselage);

    // Glass Canopy
    const canopyGeo = new THREE.BoxGeometry(0.5, 0.4, 1.4);
    const canopyMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.35, -0.4);
    group.add(canopy);

    // Main Wings
    const wingGeo = new THREE.BoxGeometry(4.2, 0.08, 1.8);
    const wings = new THREE.Mesh(wingGeo, darkMat);
    wings.position.set(0, 0, 0.4);
    group.add(wings);

    // Wingtip Plasma Laser Blasters
    const gunMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const gunL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8), gunMat);
    gunL.rotation.x = Math.PI / 2;
    gunL.position.set(-2.0, 0, 0.2);
    group.add(gunL);

    const gunR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8), gunMat);
    gunR.rotation.x = Math.PI / 2;
    gunR.position.set(2.0, 0, 0.2);
    group.add(gunR);

    // Twin Ion Thruster Flame Jets
    const flames: THREE.Mesh[] = [];
    const flameMat = new THREE.MeshBasicMaterial({ color: skin.engineColor });
    const flameGeo = new THREE.ConeGeometry(0.25, 1.2, 8);

    const flameL = new THREE.Mesh(flameGeo, flameMat);
    flameL.rotation.x = Math.PI / 2;
    flameL.position.set(-0.45, 0, 2.3);
    group.add(flameL);
    flames.push(flameL);

    const flameR = new THREE.Mesh(flameGeo, flameMat);
    flameR.rotation.x = Math.PI / 2;
    flameR.position.set(0.45, 0, 2.3);
    group.add(flameR);
    flames.push(flameR);

    // Energy Shield Bubble (Invisible until hit)
    const shieldGeo = new THREE.SphereGeometry(2.6, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.0,
      wireframe: true,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    group.add(shieldMesh);

    return { shipGroup: group, shipMat, flames, shieldMesh };
  };

  // ----------------------------------------------------
  // INITIALIZE THREE.JS SCENE
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 580;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02020a);
    scene.fog = new THREE.FogExp2(0x050414, 0.003);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 2.5, 7.0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
    sunLight.position.set(20, 40, 30);
    scene.add(sunLight);

    // Starfield Particle Dust (5000 warp stars)
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(5000 * 3);
    for (let i = 0; i < 5000 * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 800;
      starPos[i + 1] = (Math.random() - 0.5) * 800;
      starPos[i + 2] = -Math.random() * 900;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0.85,
    });
    const starfield = new THREE.Points(starGeo, starMat);
    scene.add(starfield);

    // Build Player Ship
    const initialSkin = getShipConfig(activeShipId);
    const { shipGroup, shipMat, flames, shieldMesh } = buildPlayerShipMesh(initialSkin);
    scene.add(shipGroup);

    engineRef.current = {
      scene,
      camera,
      renderer,
      playerShip: shipGroup,
      shipMaterial: shipMat,
      engineFlames: flames,
      shieldSphere: shieldMesh,
      lasers: [],
      missiles: [],
      enemies: [],
      asteroids: [],
      starfield,
      playerPos: new THREE.Vector3(0, 0, 0),
      playerTargetPos: new THREE.Vector3(0, 0, 0),
      barrelRollAngle: 0,
      isRolling: false,
      rollCooldown: 0,
      fireTimer: 0,
      lockOnProgress: 0,
      shieldVal: initialSkin.maxShield,
      maxShieldVal: initialSkin.maxShield,
      scoreVal: 0,
      waveVal: 1,
      lastFrameTime: performance.now(),
      isRunning: false,
      activeShipConfig: initialSkin,
    };

    // Spawn Initial Asteroid Cluster
    spawnAsteroidField(scene);

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

  // Update Skin Materials on change
  useEffect(() => {
    if (!engineRef.current) return;
    const skin = getShipConfig(activeShipId);
    engineRef.current.activeShipConfig = skin;
    engineRef.current.shipMaterial.color.setHex(skin.hullColor);
    engineRef.current.shipMaterial.emissive.setHex(skin.glowColor);
    engineRef.current.engineFlames.forEach((f) => {
      (f.material as THREE.MeshBasicMaterial).color.setHex(skin.engineColor);
    });
    localStorage.setItem('starfighter3d_active_ship', activeShipId);
  }, [activeShipId, getShipConfig]);

  // ----------------------------------------------------
  // SPAWN ASTEROID FIELD
  // ----------------------------------------------------
  const spawnAsteroidField = (scene: THREE.Scene) => {
    for (let i = 0; i < 28; i++) {
      const size = 1.8 + Math.random() * 3.5;
      const astGeo = new THREE.DodecahedronGeometry(size, 1);
      const astMat = new THREE.MeshStandardMaterial({
        color: 0x223048,
        roughness: 0.8,
        metalness: 0.3,
      });
      const mesh = new THREE.Mesh(astGeo, astMat);
      mesh.position.set(
        (Math.random() - 0.5) * 140,
        (Math.random() - 0.5) * 80,
        -50 - Math.random() * 300
      );
      scene.add(mesh);
      engineRef.current?.asteroids.push({
        mesh,
        hp: Math.round(size * 15),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5
        ),
      });
    }
  };

  // ----------------------------------------------------
  // SPAWN ENEMY SQUADRON WAVES
  // ----------------------------------------------------
  const spawnEnemyWave = (waveNum: number) => {
    if (!engineRef.current) return;
    const { scene } = engineRef.current;

    // Boss Wave at Wave 5
    if (waveNum % 5 === 0) {
      spawnBossDreadnought(scene);
      return;
    }

    const enemyCount = 3 + waveNum * 2;
    for (let i = 0; i < enemyCount; i++) {
      const type: 'drone' | 'interceptor' | 'bomber' =
        i % 3 === 0 ? 'interceptor' : i % 3 === 1 ? 'drone' : 'bomber';

      const group = new THREE.Group();
      const color = type === 'drone' ? 0xef4444 : type === 'interceptor' ? 0xf97316 : 0xa855f7;

      const bodyGeo = new THREE.ConeGeometry(0.8, 3.2, 4);
      const bodyMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = Math.PI / 2;
      group.add(body);

      // Enemy Wings
      const wingGeo = new THREE.BoxGeometry(3.0, 0.06, 1.2);
      const wingMat = new THREE.MeshBasicMaterial({ color: 0x090d24 });
      const wings = new THREE.Mesh(wingGeo, wingMat);
      group.add(wings);

      const spawnX = (Math.random() - 0.5) * 60;
      const spawnY = (Math.random() - 0.5) * 35;
      const spawnZ = -140 - Math.random() * 80;
      group.position.set(spawnX, spawnY, spawnZ);

      scene.add(group);

      engineRef.current.enemies.push({
        mesh: group,
        type,
        hp: type === 'bomber' ? 60 : type === 'interceptor' ? 40 : 25,
        maxHp: type === 'bomber' ? 60 : type === 'interceptor' ? 40 : 25,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          16 + Math.random() * 8
        ),
        fireCooldown: 1.5 + Math.random() * 2.0,
        scoreValue: type === 'bomber' ? 150 : type === 'interceptor' ? 100 : 50,
      });
    }
  };

  // Spawn Omega Capital Dreadnought Flagship
  const spawnBossDreadnought = (scene: THREE.Scene) => {
    const bossGroup = new THREE.Group();

    // Colossal Hull
    const hullGeo = new THREE.BoxGeometry(22, 6, 45);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x450a0a,
      emissive: 0xef4444,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.8,
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    bossGroup.add(hull);

    // Command Tower
    const bridgeGeo = new THREE.BoxGeometry(10, 4, 12);
    const bridgeMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(0, 4.5, -8);
    bossGroup.add(bridge);

    bossGroup.position.set(0, 0, -220);
    scene.add(bossGroup);

    const bossEntity: EnemyShip = {
      mesh: bossGroup,
      type: 'boss',
      hp: 500,
      maxHp: 500,
      velocity: new THREE.Vector3(0, 0, 4),
      fireCooldown: 1.0,
      scoreValue: 1500,
    };

    engineRef.current?.enemies.push(bossEntity);
    if (engineRef.current) engineRef.current.bossShip = bossEntity;
  };

  // ----------------------------------------------------
  // COMBAT ACTIONS: FIRE LASERS, MISSILES, BARREL ROLL
  // ----------------------------------------------------
  const firePlayerLaser = () => {
    if (!engineRef.current || !engineRef.current.isRunning) return;
    const { scene, playerShip, lasers, activeShipConfig } = engineRef.current;

    sound.playSpaceLaser();

    // Spawn Dual Twin Laser Bolts
    [-1.8, 1.8].forEach((offsetX) => {
      const laserGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8);
      const laserMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const laserMesh = new THREE.Mesh(laserGeo, laserMat);

      laserMesh.rotation.x = Math.PI / 2;
      laserMesh.position.set(
        playerShip.position.x + offsetX,
        playerShip.position.y,
        playerShip.position.z - 2.0
      );

      scene.add(laserMesh);

      lasers.push({
        mesh: laserMesh,
        velocity: new THREE.Vector3(0, 0, -180),
        isPlayer: true,
        damage: 20 * activeShipConfig.handling,
        life: 0,
      });
    });
  };

  const launchPhotonMissile = () => {
    if (!engineRef.current || missiles <= 0 || !engineRef.current.isRunning) return;
    const { scene, playerShip, missiles: activeMissiles, enemies } = engineRef.current;

    setMissiles((prev) => prev - 1);
    sound.playPhotonMissile();

    // Find closest enemy target
    let target = enemies[0];

    const missileGroup = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.4, 8);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    missileGroup.add(body);

    missileGroup.position.set(
      playerShip.position.x,
      playerShip.position.y - 0.4,
      playerShip.position.z - 1.5
    );

    scene.add(missileGroup);

    activeMissiles.push({
      mesh: missileGroup,
      velocity: new THREE.Vector3(0, 0, -65),
      target,
      life: 0,
    });
  };

  const triggerBarrelRoll = () => {
    if (!engineRef.current || engineRef.current.isRolling || engineRef.current.rollCooldown > 0) return;
    engineRef.current.isRolling = true;
    engineRef.current.rollCooldown = 2.0;
    sound.playBarrelRoll();
  };

  const triggerEmpShockwave = () => {
    if (!engineRef.current || empCharges <= 0 || !engineRef.current.isRunning) return;
    setEmpCharges((prev) => prev - 1);
    sound.playExplosion();

    // Wipe all active enemy lasers and stun/damage enemies
    engineRef.current.lasers.forEach((l) => {
      if (!l.isPlayer) {
        engineRef.current?.scene.remove(l.mesh);
      }
    });
    engineRef.current.lasers = engineRef.current.lasers.filter((l) => l.isPlayer);

    engineRef.current.enemies.forEach((e) => {
      e.hp -= 40;
    });
  };

  // ----------------------------------------------------
  // MAIN THREE.JS 60 FPS GAME LOOP
  // ----------------------------------------------------
  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);
      if (!engineRef.current) return;

      const now = performance.now();
      const delta = Math.min((now - engineRef.current.lastFrameTime) / 1000, 0.1);
      engineRef.current.lastFrameTime = now;

      const {
        scene,
        camera,
        renderer,
        playerShip,
        engineFlames,
        shieldSphere,
        lasers,
        missiles: activeMissiles,
        enemies,
        asteroids,
        starfield,
        isRunning,
        activeShipConfig,
      } = engineRef.current;

      if (!isRunning) {
        renderer.render(scene, camera);
        return;
      }

      // ----------------------------------------------------
      // STARFIELD WARP SPEED ANIMATION
      // ----------------------------------------------------
      const positions = starfield.geometry.attributes.position.array as Float32Array;
      for (let i = 2; i < positions.length; i += 3) {
        positions[i] += 240 * delta;
        if (positions[i] > 20) {
          positions[i] = -750;
        }
      }
      starfield.geometry.attributes.position.needsUpdate = true;

      // ----------------------------------------------------
      // PLAYER SHIP SMOOTH FLIGHT & BARREL ROLL
      // ----------------------------------------------------
      playerShip.position.x += (engineRef.current.playerTargetPos.x - playerShip.position.x) * 0.18;
      playerShip.position.y += (engineRef.current.playerTargetPos.y - playerShip.position.y) * 0.18;

      // Banking Roll & Pitch
      const targetRoll = -(playerShip.position.x - engineRef.current.playerTargetPos.x) * 0.25;
      const targetPitch = (playerShip.position.y - engineRef.current.playerTargetPos.y) * 0.2;

      if (engineRef.current.isRolling) {
        engineRef.current.barrelRollAngle += delta * 18;
        playerShip.rotation.z = engineRef.current.barrelRollAngle;
        if (engineRef.current.barrelRollAngle >= Math.PI * 2) {
          engineRef.current.isRolling = false;
          engineRef.current.barrelRollAngle = 0;
        }
      } else {
        playerShip.rotation.z += (targetRoll - playerShip.rotation.z) * 0.15;
      }
      playerShip.rotation.x += (targetPitch - playerShip.rotation.x) * 0.15;

      if (engineRef.current.rollCooldown > 0) {
        engineRef.current.rollCooldown -= delta;
      }

      // Engine Flame Pulse
      engineFlames.forEach((f) => {
        f.scale.set(1.0, 1.0 + Math.random() * 0.4, 1.0);
      });

      // Shield Bubble Fade
      const shieldMat = shieldSphere.material as THREE.MeshBasicMaterial;
      if (shieldMat.opacity > 0) {
        shieldMat.opacity = Math.max(0, shieldMat.opacity - delta * 2.0);
      }

      // ----------------------------------------------------
      // LASER BOLTS UPDATE & COLLISION
      // ----------------------------------------------------
      for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        laser.mesh.position.addScaledVector(laser.velocity, delta);
        laser.life += delta;

        if (laser.life > 2.5 || laser.mesh.position.z < -400 || laser.mesh.position.z > 20) {
          scene.remove(laser.mesh);
          lasers.splice(i, 1);
          continue;
        }

        // Player Laser hitting Enemies
        if (laser.isPlayer) {
          for (let e = enemies.length - 1; e >= 0; e--) {
            const enemy = enemies[e];
            if (laser.mesh.position.distanceTo(enemy.mesh.position) < (enemy.type === 'boss' ? 8.0 : 2.5)) {
              enemy.hp -= laser.damage;
              scene.remove(laser.mesh);
              lasers.splice(i, 1);

              if (enemy.hp <= 0) {
                sound.playExplosion();
                scene.remove(enemy.mesh);
                enemies.splice(e, 1);

                engineRef.current.scoreVal += enemy.scoreValue;
                setScore(engineRef.current.scoreVal);

                setCoins((prev) => {
                  const updated = prev + 15;
                  localStorage.setItem('starfighter3d_coins', String(updated));
                  return updated;
                });
              }
              break;
            }
          }
        } else {
          // Enemy Laser hitting Player
          if (laser.mesh.position.distanceTo(playerShip.position) < 2.0 && !engineRef.current.isRolling) {
            scene.remove(laser.mesh);
            lasers.splice(i, 1);

            sound.playHit();
            shieldMat.opacity = 0.8; // Flash shield

            engineRef.current.shieldVal -= laser.damage;
            setShield(Math.max(0, Math.round(engineRef.current.shieldVal)));

            if (engineRef.current.shieldVal <= 0) {
              handleGameOver();
              return;
            }
          }
        }
      }

      // ----------------------------------------------------
      // HOMING MISSILES UPDATE
      // ----------------------------------------------------
      for (let m = activeMissiles.length - 1; m >= 0; m--) {
        const mis = activeMissiles[m];
        mis.life += delta;

        if (mis.target && mis.target.hp > 0) {
          const dir = mis.target.mesh.position.clone().sub(mis.mesh.position).normalize();
          mis.velocity.lerp(dir.multiplyScalar(85), 0.08);
          mis.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), mis.velocity.clone().normalize());
        }

        mis.mesh.position.addScaledVector(mis.velocity, delta);

        if (mis.target && mis.mesh.position.distanceTo(mis.target.mesh.position) < 3.5) {
          mis.target.hp -= 120;
          sound.playHullExplosion();
          scene.remove(mis.mesh);
          activeMissiles.splice(m, 1);

          if (mis.target.hp <= 0) {
            scene.remove(mis.target.mesh);
            const idx = enemies.indexOf(mis.target);
            if (idx !== -1) enemies.splice(idx, 1);
            engineRef.current.scoreVal += mis.target.scoreValue;
            setScore(engineRef.current.scoreVal);
          }
          continue;
        }

        if (mis.life > 3.5) {
          scene.remove(mis.mesh);
          activeMissiles.splice(m, 1);
        }
      }

      // ----------------------------------------------------
      // ENEMY SQUADRONS UPDATE & ENEMY WEAPONS
      // ----------------------------------------------------
      for (let e = enemies.length - 1; e >= 0; e--) {
        const enemy = enemies[e];
        enemy.mesh.position.addScaledVector(enemy.velocity, delta);

        // Enemy firing lasers
        enemy.fireCooldown -= delta;
        if (enemy.fireCooldown <= 0 && enemy.mesh.position.z < -10) {
          enemy.fireCooldown = enemy.type === 'boss' ? 0.6 : 2.0;

          const eLaserGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.4, 8);
          const eLaserMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
          const eLaser = new THREE.Mesh(eLaserGeo, eLaserMat);
          eLaser.rotation.x = Math.PI / 2;
          eLaser.position.copy(enemy.mesh.position);

          const aimDir = playerShip.position.clone().sub(enemy.mesh.position).normalize();
          scene.add(eLaser);

          lasers.push({
            mesh: eLaser,
            velocity: aimDir.multiplyScalar(95),
            isPlayer: false,
            damage: enemy.type === 'boss' ? 30 : 15,
            life: 0,
          });
        }

        // Loop past player
        if (enemy.mesh.position.z > 25) {
          enemy.mesh.position.z = -180;
          enemy.mesh.position.x = (Math.random() - 0.5) * 50;
        }
      }

      // ----------------------------------------------------
      // ASTEROIDS DRIFT & COLLISION
      // ----------------------------------------------------
      asteroids.forEach((ast) => {
        ast.mesh.rotation.x += ast.rotSpeed.x * delta;
        ast.mesh.rotation.y += ast.rotSpeed.y * delta;
        ast.mesh.position.z += 25 * delta;

        if (ast.mesh.position.z > 20) {
          ast.mesh.position.z = -350;
          ast.mesh.position.x = (Math.random() - 0.5) * 120;
        }

        // Collision with player
        if (ast.mesh.position.distanceTo(playerShip.position) < 3.2 && !engineRef.current?.isRolling) {
          sound.playHit();
          engineRef.current!.shieldVal -= 25;
          setShield(Math.max(0, Math.round(engineRef.current!.shieldVal)));
          ast.mesh.position.z = -350;

          if (engineRef.current!.shieldVal <= 0) {
            handleGameOver();
          }
        }
      });

      // ----------------------------------------------------
      // WAVE PROGRESSION
      // ----------------------------------------------------
      if (enemies.length === 0) {
        const nextWave = engineRef.current.waveVal + 1;
        engineRef.current.waveVal = nextWave;
        setWave(nextWave);
        sound.playWin();

        // Bonus Shield Recharge
        engineRef.current.shieldVal = Math.min(
          activeShipConfig.maxShield,
          engineRef.current.shieldVal + 30
        );
        setShield(Math.round(engineRef.current.shieldVal));
        setMissiles((prev) => Math.min(8, prev + 2));

        spawnEnemyWave(nextWave);
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // ----------------------------------------------------
  // CONTROLS & POINTER FLIGHT INPUT
  // ----------------------------------------------------
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!engineRef.current || !engineRef.current.isRunning) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    const rangeX = 14.0;
    const rangeY = 8.0;

    engineRef.current.playerTargetPos.x = ndcX * rangeX;
    engineRef.current.playerTargetPos.y = ndcY * rangeY;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.code === 'Space') {
        firePlayerLaser();
      }
      if (e.code === 'KeyE') {
        launchPhotonMissile();
      }
      if (e.code === 'KeyQ') {
        triggerBarrelRoll();
      }
      if (e.code === 'KeyR') {
        triggerEmpShockwave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, missiles, empCharges]);

  // ----------------------------------------------------
  // GAME LIFECYCLE
  // ----------------------------------------------------
  const startGame = () => {
    if (!engineRef.current) return;
    sound.playPowerup();

    const skin = getShipConfig(activeShipId);

    // Reset Engine State
    engineRef.current.playerPos.set(0, 0, 0);
    engineRef.current.playerTargetPos.set(0, 0, 0);
    engineRef.current.shieldVal = skin.maxShield;
    engineRef.current.maxShieldVal = skin.maxShield;
    engineRef.current.scoreVal = 0;
    engineRef.current.waveVal = 1;
    engineRef.current.isRunning = true;

    // Clear old enemies & lasers
    engineRef.current.enemies.forEach((e) => engineRef.current!.scene.remove(e.mesh));
    engineRef.current.enemies = [];
    engineRef.current.lasers.forEach((l) => engineRef.current!.scene.remove(l.mesh));
    engineRef.current.lasers = [];

    setShield(skin.maxShield);
    setScore(0);
    setWave(1);
    setMissiles(6);
    setEmpCharges(2);
    setGameState('playing');

    spawnEnemyWave(1);
  };

  const handleGameOver = () => {
    if (!engineRef.current) return;
    engineRef.current.isRunning = false;
    sound.playGameOver();

    const finalScore = engineRef.current.scoreVal;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('starfighter3d_highscore', String(finalScore));
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
      });
    }

    setGameState('gameover');
  };

  const buyShip = (ship: StarshipSkin) => {
    if (coins < ship.price) {
      sound.playHit();
      return;
    }
    sound.playWin();
    const newCoins = coins - ship.price;
    setCoins(newCoins);
    localStorage.setItem('starfighter3d_coins', String(newCoins));

    const updated = [...unlockedShips, ship.id];
    setUnlockedShips(updated);
    localStorage.setItem('starfighter3d_unlocked_ships', JSON.stringify(updated));
    setActiveShipId(ship.id);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onClick={() => {
        if (gameState === 'playing') firePlayerLaser();
      }}
      className="relative w-full h-[420px] sm:h-[580px] md:h-[680px] max-h-[75vh] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden select-none border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 font-sans touch-none cursor-crosshair"
    >
      {/* 3D WebGL Canvas Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* ==================================================== */}
      {/* HUD OVERLAY (PLAYING)                                */}
      {/* ==================================================== */}
      {gameState === 'playing' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-6 z-10">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Shield Gauge & Wave */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-900/85 backdrop-blur-md border border-cyan-500/50 text-cyan-300 flex items-center gap-1.5 sm:gap-3 shadow-xl">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 leading-none">Hull Shield</div>
                  <div className="text-sm sm:text-lg font-black text-white">{shield} <span className="text-[10px] sm:text-xs text-cyan-400 font-bold">HP</span></div>
                </div>
              </div>

              <div className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-slate-900/85 backdrop-blur-md border border-amber-500/50 text-amber-300 font-black text-xs sm:text-sm flex items-center gap-1 shadow-lg shrink-0">
                <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                WAVE {wave}
              </div>
            </div>

            {/* Score & Audio */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-slate-900/85 backdrop-blur-md border border-cyan-500/40 text-cyan-300 flex items-center gap-1.5 sm:gap-2 shadow-lg">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 leading-none">Score</div>
                  <div className="text-sm sm:text-lg font-black text-white">{score}</div>
                </div>
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

          {/* Bottom Weapons & Special Ability Buttons */}
          <div className="flex items-center justify-between w-full pt-2 sm:pt-4 gap-1.5 sm:gap-3">
            {/* Evasive Barrel Roll */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerBarrelRoll();
              }}
              className="pointer-events-auto px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-900/85 border border-cyan-500/60 backdrop-blur-md text-white font-extrabold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-xl hover:bg-cyan-500 hover:text-slate-950 active:scale-95 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>ROLL</span>
            </button>

            {/* On-Screen Touch Fire & Missiles */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerEmpShockwave();
                }}
                disabled={empCharges <= 0}
                className={`pointer-events-auto px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border backdrop-blur-md text-[10px] sm:text-xs font-black flex items-center gap-1.5 shadow-xl transition-all ${
                  empCharges > 0
                    ? 'bg-purple-900/80 border-purple-400 text-purple-200 hover:bg-purple-500 hover:text-white'
                    : 'bg-slate-900/50 border-slate-800 text-slate-600'
                }`}
              >
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>EMP ({empCharges})</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  launchPhotonMissile();
                }}
                disabled={missiles <= 0}
                className={`pointer-events-auto px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border backdrop-blur-md text-[10px] sm:text-xs font-black flex items-center gap-1.5 shadow-xl transition-all ${
                  missiles > 0
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-amber-500/30'
                    : 'bg-slate-900/50 border-slate-800 text-slate-600'
                }`}
              >
                <Rocket className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>MISSILE ({missiles})</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  firePlayerLaser();
                }}
                className="pointer-events-auto px-3.5 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-cyan-500/30 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Crosshair className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>FIRE</span>
              </button>
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
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                <Rocket className="w-3.5 h-3.5" />
                AAA 3D SPACE FLIGHT COMBAT
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                CYBER <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-amber-300">STARFIGHTER 3D</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Pilot an agile cyber starfighter through deep space nebulae! Engage enemy drone swarms, perform evasive barrel rolls, launch photon missiles, and destroy capital dreadnoughts!
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3 py-1">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3 text-left">
                <Trophy className="w-6 h-6 text-amber-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">High Score</div>
                  <div className="text-lg font-black text-white">{highScore}</div>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3 text-left">
                <Star className="w-6 h-6 text-cyan-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Coins</div>
                  <div className="text-lg font-black text-cyan-300">{coins}</div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={startGame}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                LAUNCH DOGFIGHT
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowHangar(true)}
                  className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-cyan-400"
                >
                  <Eye className="w-4 h-4 text-cyan-400" />
                  Ship Hangar
                </button>
                <button
                  onClick={() => setShowTutorial(true)}
                  className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-sky-400"
                >
                  <HelpCircle className="w-4 h-4 text-sky-400" />
                  Flight Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* GAME OVER MODAL                                      */}
      {/* ==================================================== */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-20 animate-in fade-in zoom-in duration-300">
          <div className="max-w-md w-full bg-slate-900/95 border border-rose-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl shadow-rose-950/60">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-400/30 text-rose-400 text-xs font-bold uppercase tracking-wider">
                STARFIGHTER DESTROYED
              </div>
              <h2 className="text-3xl font-black text-white">MISSION TERMINATED</h2>
              <p className="text-xs text-slate-300">
                You defended deep space through Wave {wave} with {score} points!
              </p>
            </div>

            {/* Run Stats */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Wave Reached</div>
                <div className="text-xl font-black text-white">Wave {wave}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Score</div>
                <div className="text-xl font-black text-cyan-400">{score} PTS</div>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={startGame}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
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
      {/* SHIP HANGAR GARAGE MODAL                             */}
      {/* ==================================================== */}
      {showHangar && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-30 animate-in fade-in zoom-in duration-200">
          <div className="max-w-xl w-full bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">STARSHIP HANGAR</h2>
                <p className="text-xs text-slate-400">Unlock custom cyber starfighters with unique weapons and shield stats.</p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 text-sm font-black flex items-center gap-1.5">
                <Star className="w-4 h-4 text-cyan-400" />
                {coins} Coins
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {STARSHIPS.map((ship) => {
                const isUnlocked = unlockedShips.includes(ship.id);
                const isSelected = activeShipId === ship.id;

                return (
                  <div
                    key={ship.id}
                    onClick={() => {
                      if (isUnlocked) {
                        setActiveShipId(ship.id);
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
                      <span className="text-2xl">{ship.previewEmoji}</span>
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black uppercase">
                          EQUIPPED
                        </span>
                      ) : isUnlocked ? (
                        <span className="text-[10px] text-slate-400 font-bold">READY</span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-bold">{ship.price} Coins</span>
                      )}
                    </div>

                    <div>
                      <div className="font-extrabold text-sm text-white">{ship.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{ship.description}</div>
                    </div>

                    {!isUnlocked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          buyShip(ship);
                        }}
                        disabled={coins < ship.price}
                        className={`mt-1 w-full py-1.5 rounded-xl text-xs font-bold transition-all ${
                          coins >= ship.price
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        Unlock ({ship.price})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowHangar(false)}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all"
            >
              Back to Game
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* HOW TO PLAY MODAL                                    */}
      {/* ==================================================== */}
      {showTutorial && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-30 animate-in fade-in zoom-in duration-200">
          <div className="max-w-md w-full bg-slate-900/95 border border-sky-500/40 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-white">FLIGHT COMBAT MANUAL</h2>
              <p className="text-xs text-slate-400">Master starfighter flight controls & weapons!</p>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 font-black">1</div>
                <div>
                  <div className="font-bold text-white mb-0.5">Move Mouse / Touch to Steer</div>
                  Your ship follows your cursor/touch position with realistic 3D banking and pitch dynamics.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-black">2</div>
                <div>
                  <div className="font-bold text-white mb-0.5">Photon Missiles & EMP</div>
                  Press [E] for homing missiles or [R] for EMP shockwaves that vaporize enemy laser fire!
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 font-black">3</div>
                <div>
                  <div className="font-bold text-white mb-0.5">Press [Q] for Evasive Barrel Roll</div>
                  Spin 360° to evade incoming enemy laser salvos and asteroid collisions!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowTutorial(false)}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all"
            >
              Ready for Combat!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
