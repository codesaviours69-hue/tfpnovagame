import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Zap,
  Shield,
  Flame,
  Bomb,
  Rocket,
  Award,
  Crown,
  Sparkles,
  Gamepad2,
  Radio,
  Gauge,
  Crosshair,
  Compass
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// ---------------------------------------------------------------------------
// WEAPON TYPES & POWERUPS
// ---------------------------------------------------------------------------
export type WeaponType = 'none' | 'rocket' | 'mine' | 'nitro' | 'shield';

interface KartState {
  id: number;
  name: string;
  isPlayer: boolean;
  colorHex: number;
  x: number;
  z: number;
  y: number;
  vy: number;
  vx: number;
  vz: number;
  angle: number;
  speed: number;
  steer: number;
  isDrifting: boolean;
  driftTime: number;
  health: number;
  maxHealth: number;
  kills: number;
  respawnTimer: number;
  weapon: WeaponType;
  nitroTimer: number;
  shieldActive: boolean;
  mesh: THREE.Group;
  shieldMesh: THREE.Mesh;
  wheelMeshes: THREE.Mesh[];
  exhaustLights: THREE.PointLight[];
  underglowLight: THREE.PointLight;
  aiTargetX: number;
  aiTargetZ: number;
  aiFireTimer: number;
}

interface Projectile {
  id: number;
  ownerId: number;
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  mesh: THREE.Group;
  lifetime: number;
}

interface Mine {
  id: number;
  ownerId: number;
  x: number;
  z: number;
  mesh: THREE.Group;
  armed: boolean;
  armTimer: number;
}

interface ItemBox {
  id: number;
  x: number;
  z: number;
  mesh: THREE.Group;
  active: boolean;
  respawnTimer: number;
}

interface BoostPad {
  x: number;
  z: number;
  angle: number;
  mesh: THREE.Mesh;
}

const ARENA_SIZE = 52; // -26 to +26

export const CyberSmashKart3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React UI States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'victory'>('menu');
  const [playerKills, setPlayerKills] = useState(0);
  const [playerRank, setPlayerRank] = useState(1);
  const [matchTime, setMatchTime] = useState(90);
  const [playerWeapon, setPlayerWeapon] = useState<WeaponType>('none');
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerSpeedKmh, setPlayerSpeedKmh] = useState(0);
  const [muted, setMuted] = useState(sound.isMuted());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [driftBoostActive, setDriftBoostActive] = useState(false);

  // Mobile Touch Controls Ref
  const inputRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    fire: false,
    drift: false,
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1800);
  }, []);

  // Three.js Engine & Physics State
  const engineRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    gameState: 'menu' | 'playing' | 'gameover' | 'victory';
    matchTimer: number;
    karts: KartState[];
    projectiles: Projectile[];
    mines: Mine[];
    itemBoxes: ItemBox[];
    boostPads: BoostPad[];
    particles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number }[];
    nextId: number;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    gameState: 'menu',
    matchTimer: 90,
    karts: [],
    projectiles: [],
    mines: [],
    itemBoxes: [],
    boostPads: [],
    particles: [],
    nextId: 1,
  });

  // ---------------------------------------------------------------------------
  // BUILD PROCEDURAL 3D CYBER KART
  // ---------------------------------------------------------------------------
  const createKartMesh = (colorHex: number): {
    group: THREE.Group;
    shieldMesh: THREE.Mesh;
    wheels: THREE.Mesh[];
    exhaustLights: THREE.PointLight[];
    underglowLight: THREE.PointLight;
  } => {
    const group = new THREE.Group();

    // 1. Sleek Aerodynamic Body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.15,
      metalness: 0.85,
      emissive: colorHex,
      emissiveIntensity: 0.3,
    });
    const darkCarbonMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.3,
      metalness: 0.9,
    });
    const neonGlowMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const whiteNeonMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Main Chassis
    const mainGeo = new THREE.BoxGeometry(1.4, 0.42, 2.2);
    const mainBody = new THREE.Mesh(mainGeo, bodyMat);
    mainBody.position.y = 0.4;
    group.add(mainBody);

    // Front Sloped Nose Air Splitter
    const noseGeo = new THREE.BoxGeometry(1.2, 0.16, 0.9);
    const nose = new THREE.Mesh(noseGeo, darkCarbonMat);
    nose.position.set(0, 0.24, 1.25);
    group.add(nose);

    // Neon Racing Hood Decal
    const hoodStripeGeo = new THREE.PlaneGeometry(0.35, 1.4);
    const hoodStripe = new THREE.Mesh(hoodStripeGeo, whiteNeonMat);
    hoodStripe.rotation.x = -Math.PI / 2;
    hoodStripe.position.set(0, 0.62, 0.4);
    group.add(hoodStripe);

    // Dual High-Beam LED Headlights
    [-0.45, 0.45].forEach((xOff) => {
      const hlGeo = new THREE.BoxGeometry(0.22, 0.12, 0.1);
      const hl = new THREE.Mesh(hlGeo, whiteNeonMat);
      hl.position.set(xOff, 0.42, 1.12);
      group.add(hl);

      const spot = new THREE.SpotLight(0x00f0ff, 2.5, 18, Math.PI / 6, 0.5);
      spot.position.set(xOff, 0.42, 1.2);
      spot.target.position.set(xOff, 0, 10);
      group.add(spot);
      group.add(spot.target);
    });

    // Rear Dual-Deck Spoiler Wing
    const wingGeo = new THREE.BoxGeometry(1.65, 0.08, 0.45);
    const wing = new THREE.Mesh(wingGeo, neonGlowMat);
    wing.position.set(0, 0.98, -1.05);
    group.add(wing);

    const wingPostL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45), darkCarbonMat);
    wingPostL.position.set(-0.55, 0.75, -1.05);
    group.add(wingPostL);

    const wingPostR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45), darkCarbonMat);
    wingPostR.position.set(0.55, 0.75, -1.05);
    group.add(wingPostR);

    // Cyber Pilot Helmet
    const pilotHead = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 14), darkCarbonMat);
    pilotHead.position.set(0, 0.85, -0.05);
    group.add(pilotHead);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.25), neonGlowMat);
    visor.position.set(0, 0.88, 0.14);
    group.add(visor);

    // Twin Exhaust Thruster Pipes & Dynamic Lights
    const exhaustLights: THREE.PointLight[] = [];
    [-0.35, 0.35].forEach((xOff) => {
      const exMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.38), darkCarbonMat);
      exMesh.rotation.x = Math.PI / 2;
      exMesh.position.set(xOff, 0.42, -1.2);
      group.add(exMesh);

      const exLight = new THREE.PointLight(0x00f0ff, 1.5, 4);
      exLight.position.set(xOff, 0.42, -1.38);
      group.add(exLight);
      exhaustLights.push(exLight);
    });

    // Underglow Floor Neon Light
    const underglowLight = new THREE.PointLight(colorHex, 2.8, 5.5);
    underglowLight.position.set(0, 0.12, 0);
    group.add(underglowLight);

    // 4 Wide Cyber Tires with Neon Rims
    const wheels: THREE.Mesh[] = [];
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.3, 16);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.7 });
    const rimMat = new THREE.MeshBasicMaterial({ color: colorHex });

    const wheelCoords = [
      { x: -0.88, z: 0.8 },
      { x: 0.88, z: 0.8 },
      { x: -0.88, z: -0.8 },
      { x: 0.88, z: -0.8 },
    ];

    wheelCoords.forEach((pos) => {
      const wheelGroup = new THREE.Mesh(wheelGeo, tireMat);
      wheelGroup.rotation.z = Math.PI / 2;
      wheelGroup.position.set(pos.x, 0.34, pos.z);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 16), rimMat);
      rim.rotation.y = Math.PI / 2;
      wheelGroup.add(rim);

      group.add(wheelGroup);
      wheels.push(wheelGroup);
    });

    // Shimmering Energy Shield Sphere
    const shieldGeo = new THREE.SphereGeometry(1.7, 18, 18);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.y = 0.6;
    shieldMesh.visible = false;
    group.add(shieldMesh);

    return { group, shieldMesh, wheels, exhaustLights, underglowLight };
  };

  // ---------------------------------------------------------------------------
  // BUILD MYSTERY ITEM CAPSULE
  // ---------------------------------------------------------------------------
  const createItemBoxMesh = (): THREE.Group => {
    const group = new THREE.Group();

    // Floating Rotating Crystal Box
    const boxGeo = new THREE.OctahedronGeometry(0.8, 0);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.85,
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    group.add(box);

    // Glowing Neon Ring Orbit
    const ringGeo = new THREE.TorusGeometry(1.2, 0.06, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    group.add(ring);

    const light = new THREE.PointLight(0xfacc15, 2.5, 6.5);
    group.add(light);

    return group;
  };

  // ---------------------------------------------------------------------------
  // BUILD SPEED BOOST PADS
  // ---------------------------------------------------------------------------
  const createBoostPadMesh = (x: number, z: number, angle: number): THREE.Mesh => {
    const padGeo = new THREE.PlaneGeometry(3.5, 5.0);
    const padMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.rotation.z = -angle;
    pad.position.set(x, 0.04, z);
    return pad;
  };

  // ---------------------------------------------------------------------------
  // SPAWN EXPLOSION PARTICLES
  // ---------------------------------------------------------------------------
  const spawnExplosionVFX = useCallback((x: number, y: number, z: number, colorHex: number) => {
    const eng = engineRef.current;
    if (!eng.scene) return;

    const pGeo = new THREE.SphereGeometry(0.2, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: colorHex });

    for (let i = 0; i < 18; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(x, y, z);
      eng.scene.add(p);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const pSpeed = 6 + Math.random() * 12;

      eng.particles.push({
        mesh: p,
        vx: Math.sin(phi) * Math.cos(theta) * pSpeed,
        vy: Math.cos(phi) * pSpeed + 2,
        vz: Math.sin(phi) * Math.sin(theta) * pSpeed,
        life: 0.7,
        maxLife: 0.7,
      });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // FIRE WEAPON ACTION
  // ---------------------------------------------------------------------------
  const fireWeapon = useCallback((kart: KartState) => {
    const eng = engineRef.current;
    if (!eng.scene || kart.weapon === 'none' || kart.health <= 0) return;

    const wType = kart.weapon;
    kart.weapon = 'none';

    if (kart.isPlayer) {
      setPlayerWeapon('none');
    }

    if (wType === 'rocket') {
      sound.playLaser();
      const rGroup = new THREE.Group();

      const rGeo = new THREE.CylinderGeometry(0.14, 0.16, 1.1, 8);
      const rMat = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xf43f5e,
        emissiveIntensity: 1.2,
      });
      const rocket = new THREE.Mesh(rGeo, rMat);
      rocket.rotation.x = Math.PI / 2;
      rGroup.add(rocket);

      const trailLight = new THREE.PointLight(0xf43f5e, 2, 5);
      rGroup.add(trailLight);

      const spawnDist = 2.2;
      const rx = kart.x + Math.sin(kart.angle) * spawnDist;
      const rz = kart.z + Math.cos(kart.angle) * spawnDist;
      rGroup.position.set(rx, 0.55, rz);
      rGroup.rotation.y = kart.angle;
      eng.scene.add(rGroup);

      const rSpeed = 38;
      eng.projectiles.push({
        id: eng.nextId++,
        ownerId: kart.id,
        x: rx,
        z: rz,
        y: 0.55,
        vx: Math.sin(kart.angle) * rSpeed,
        vz: Math.cos(kart.angle) * rSpeed,
        mesh: rGroup,
        lifetime: 3.5,
      });
    } else if (wType === 'mine') {
      sound.playClick();
      const mGroup = new THREE.Group();
      const mGeo = new THREE.CylinderGeometry(0.45, 0.5, 0.22, 12);
      const mMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 1.0,
      });
      const mMesh = new THREE.Mesh(mGeo, mMat);
      mGroup.add(mMesh);

      const mLight = new THREE.PointLight(0xef4444, 2, 4);
      mLight.position.y = 0.3;
      mGroup.add(mLight);

      const dropX = kart.x - Math.sin(kart.angle) * 2.0;
      const dropZ = kart.z - Math.cos(kart.angle) * 2.0;
      mGroup.position.set(dropX, 0.15, dropZ);
      eng.scene.add(mGroup);

      eng.mines.push({
        id: eng.nextId++,
        ownerId: kart.id,
        x: dropX,
        z: dropZ,
        mesh: mGroup,
        armed: false,
        armTimer: 0.6,
      });
    } else if (wType === 'nitro') {
      sound.playPowerup();
      kart.nitroTimer = 4.0;
      kart.speed = 32;
      if (kart.isPlayer) {
        showToast('⚡ NITRO OVERDRIVE ACTIVATED!');
      }
    } else if (wType === 'shield') {
      sound.playCollect();
      kart.shieldActive = true;
      kart.shieldMesh.visible = true;
      if (kart.isPlayer) {
        showToast('🛡️ ENERGY SHIELD ENGAGED');
      }
    }
  }, [showToast]);

  // ---------------------------------------------------------------------------
  // START MATCH / RESET ARENA
  // ---------------------------------------------------------------------------
  const startMatch = useCallback(() => {
    sound.playClick();
    sound.playScore();
    const eng = engineRef.current;

    eng.matchTimer = 90;
    eng.gameState = 'playing';
    setMatchTime(90);
    setPlayerKills(0);
    setPlayerRank(1);
    setPlayerWeapon('none');
    setPlayerHealth(100);
    setGameState('playing');

    // Clean up projectiles and mines
    eng.projectiles.forEach((p) => eng.scene?.remove(p.mesh));
    eng.projectiles = [];
    eng.mines.forEach((m) => eng.scene?.remove(m.mesh));
    eng.mines = [];

    // Circular Spawn Formation
    const spawnRadius = 16;
    eng.karts.forEach((k, idx) => {
      const ang = (idx / eng.karts.length) * Math.PI * 2;
      k.x = Math.sin(ang) * spawnRadius;
      k.z = Math.cos(ang) * spawnRadius;
      k.y = 0;
      k.vy = 0;
      k.vx = 0;
      k.vz = 0;
      k.angle = ang + Math.PI;
      k.speed = 0;
      k.health = 100;
      k.kills = 0;
      k.weapon = 'none';
      k.nitroTimer = 0;
      k.shieldActive = false;
      k.shieldMesh.visible = false;
      k.mesh.position.set(k.x, 0, k.z);
      k.mesh.rotation.y = k.angle;
      k.mesh.visible = true;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // KEYBOARD CONTROLS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) inputRef.current.forward = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) inputRef.current.backward = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) inputRef.current.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) inputRef.current.right = true;
      if (['Space', 'KeyF', 'KeyE'].includes(e.code)) {
        e.preventDefault();
        const player = engineRef.current.karts.find((k) => k.isPlayer);
        if (player) fireWeapon(player);
      }
      if (['ShiftLeft', 'ShiftRight'].includes(e.code)) inputRef.current.drift = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) inputRef.current.forward = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) inputRef.current.backward = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) inputRef.current.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) inputRef.current.right = false;
      if (['ShiftLeft', 'ShiftRight'].includes(e.code)) inputRef.current.drift = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [fireWeapon]);

  // ---------------------------------------------------------------------------
  // INITIALIZE THREE.JS SCENE & 60 FPS SIMULATION ENGINE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.012);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 18, -26);
    camera.lookAt(0, 0, 0);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current || undefined,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0x1e293b, 2.0);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.8);
    dirLight.position.set(25, 45, 25);
    scene.add(dirLight);

    // 5. Arena Floor & Visuals
    const floorGeo = new THREE.PlaneGeometry(ARENA_SIZE * 2, ARENA_SIZE * 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x050814,
      roughness: 0.6,
      metalness: 0.4,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Glowing Concentric Circuit Rings
    const gridHelper = new THREE.GridHelper(ARENA_SIZE * 2, 26, 0x00f0ff, 0x0f172a);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    // Outer Neon Forcefield Wall
    const wallGeo = new THREE.CylinderGeometry(ARENA_SIZE, ARENA_SIZE, 3.8, 36, 1, true);
    const wallMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const arenaWall = new THREE.Mesh(wallGeo, wallMat);
    arenaWall.position.y = 1.9;
    scene.add(arenaWall);

    // 6. Spawn Speed Boost Pads
    const boostPads: BoostPad[] = [];
    const boostConfigs = [
      { x: 0, z: 12, angle: 0 },
      { x: 0, z: -12, angle: Math.PI },
      { x: 12, z: 0, angle: Math.PI / 2 },
      { x: -12, z: 0, angle: -Math.PI / 2 },
    ];

    boostConfigs.forEach((bc) => {
      const padMesh = createBoostPadMesh(bc.x, bc.z, bc.angle);
      scene.add(padMesh);
      boostPads.push({
        x: bc.x,
        z: bc.z,
        angle: bc.angle,
        mesh: padMesh,
      });
    });

    // 7. Spawn 5 Karts (Player + 4 AI Rivals)
    const kartConfigs = [
      { id: 1, name: 'CYBER ACE', isPlayer: true, color: 0x00f0ff },
      { id: 2, name: 'RED PHANTOM', isPlayer: false, color: 0xf43f5e },
      { id: 3, name: 'EMERALD VIPER', isPlayer: false, color: 0x10b981 },
      { id: 4, name: 'SOLAR FLARE', isPlayer: false, color: 0xf59e0b },
      { id: 5, name: 'SHADOW CYBER', isPlayer: false, color: 0xa855f7 },
    ];

    const karts: KartState[] = [];
    kartConfigs.forEach((kc, idx) => {
      const { group: kGroup, shieldMesh, wheels, exhaustLights, underglowLight } = createKartMesh(kc.color);
      scene.add(kGroup);

      const ang = (idx / kartConfigs.length) * Math.PI * 2;
      const kx = Math.sin(ang) * 16;
      const kz = Math.cos(ang) * 16;
      kGroup.position.set(kx, 0, kz);
      kGroup.rotation.y = ang + Math.PI;

      karts.push({
        id: kc.id,
        name: kc.name,
        isPlayer: kc.isPlayer,
        colorHex: kc.color,
        x: kx,
        z: kz,
        y: 0,
        vy: 0,
        vx: 0,
        vz: 0,
        angle: ang + Math.PI,
        speed: 0,
        steer: 0,
        isDrifting: false,
        driftTime: 0,
        health: 100,
        maxHealth: 100,
        kills: 0,
        respawnTimer: 0,
        weapon: 'none',
        nitroTimer: 0,
        shieldActive: false,
        mesh: kGroup,
        shieldMesh,
        wheelMeshes: wheels,
        exhaustLights,
        underglowLight,
        aiTargetX: 0,
        aiTargetZ: 0,
        aiFireTimer: 1.5 + Math.random() * 2,
      });
    });

    // 8. Spawn Mystery Weapon Item Capsules
    const itemBoxes: ItemBox[] = [];
    const itemBoxPositions = [
      { x: 0, z: 0 },
      { x: 14, z: 14 },
      { x: -14, z: 14 },
      { x: 14, z: -14 },
      { x: -14, z: -14 },
      { x: 0, z: 20 },
      { x: 0, z: -20 },
      { x: 20, z: 0 },
      { x: -20, z: 0 },
    ];

    itemBoxPositions.forEach((pos, idx) => {
      const bGroup = createItemBoxMesh();
      bGroup.position.set(pos.x, 1.1, pos.z);
      scene.add(bGroup);

      itemBoxes.push({
        id: idx + 1,
        x: pos.x,
        z: pos.z,
        mesh: bGroup,
        active: true,
        respawnTimer: 0,
      });
    });

    engineRef.current.scene = scene;
    engineRef.current.camera = camera;
    engineRef.current.renderer = renderer;
    engineRef.current.karts = karts;
    engineRef.current.itemBoxes = itemBoxes;
    engineRef.current.boostPads = boostPads;

    // -------------------------------------------------------------------------
    // 60 FPS BATTLE ROYALE SIMULATION LOOP
    // -------------------------------------------------------------------------
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;

      const eng = engineRef.current;
      if (!eng.renderer || !eng.scene || !eng.camera) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      // Rotate Item Boxes
      eng.itemBoxes.forEach((box) => {
        if (box.active) {
          box.mesh.rotation.y += dt * 2.5;
          box.mesh.position.y = 1.1 + Math.sin(now * 0.005 + box.id) * 0.18;
        } else {
          box.respawnTimer -= dt;
          if (box.respawnTimer <= 0) {
            box.active = true;
            box.mesh.visible = true;
          }
        }
      });

      // Update VFX Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.life -= dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 9.8 * dt; // Gravity

        const scale = Math.max(0, p.life / p.maxLife);
        p.mesh.scale.set(scale, scale, scale);

        if (p.life <= 0) {
          eng.scene.remove(p.mesh);
          eng.particles.splice(i, 1);
        }
      }

      if (eng.gameState === 'playing') {
        // Match Timer Countdown
        eng.matchTimer -= dt;
        setMatchTime(Math.ceil(eng.matchTimer));

        if (eng.matchTimer <= 0) {
          const sorted = [...eng.karts].sort((a, b) => b.kills - a.kills);
          const isPlayerWinner = sorted[0].isPlayer;
          eng.gameState = isPlayerWinner ? 'victory' : 'gameover';
          setGameState(eng.gameState);
          if (isPlayerWinner) {
            sound.playWin();
            confetti({ particleCount: 180, spread: 90 });
          } else {
            sound.playGameOver();
          }
        }

        // 1. UPDATE KARTS (PLAYER & AI)
        eng.karts.forEach((kart) => {
          // Dead / Respawn Handling
          if (kart.health <= 0) {
            kart.respawnTimer -= dt;
            if (kart.respawnTimer <= 0) {
              kart.health = 100;
              kart.weapon = 'none';
              kart.shieldActive = true;
              kart.shieldMesh.visible = true;
              const randAng = Math.random() * Math.PI * 2;
              kart.x = Math.sin(randAng) * 18;
              kart.z = Math.cos(randAng) * 18;
              kart.y = 0;
              kart.speed = 0;
              kart.mesh.visible = true;
            }
            return;
          }

          // Nitro Timer
          if (kart.nitroTimer > 0) {
            kart.nitroTimer -= dt;
            kart.exhaustLights.forEach((l) => (l.color.setHex(0xfde047)));
          } else {
            kart.exhaustLights.forEach((l) => (l.color.setHex(0x00f0ff)));
          }

          const topSpeed = kart.nitroTimer > 0 ? 32 : 18;
          const accel = kart.nitroTimer > 0 ? 36 : 20;
          const turnSpeed = kart.isDrifting ? 3.6 : 2.6;

          if (kart.isPlayer) {
            const inp = inputRef.current;
            if (inp.forward) {
              kart.speed = Math.min(kart.speed + accel * dt, topSpeed);
            } else if (inp.backward) {
              kart.speed = Math.max(kart.speed - accel * 1.5 * dt, -9);
            } else {
              kart.speed *= Math.pow(0.96, dt * 60);
            }

            // Power Drift Mechanics
            if (inp.drift && Math.abs(kart.speed) > 7) {
              kart.isDrifting = true;
              kart.driftTime += dt;
              if (kart.driftTime > 1.2) {
                setDriftBoostActive(true);
              }
            } else {
              if (kart.isDrifting && kart.driftTime > 1.2) {
                // Mini-Turbo Release Boost!
                kart.speed = Math.min(kart.speed + 8, topSpeed);
                sound.playPowerup();
                showToast('⚡ MINI-TURBO DRIFT BOOST!');
              }
              kart.isDrifting = false;
              kart.driftTime = 0;
              setDriftBoostActive(false);
            }

            if (inp.left) kart.angle += turnSpeed * dt * (kart.speed >= 0 ? 1 : -1);
            if (inp.right) kart.angle -= turnSpeed * dt * (kart.speed >= 0 ? 1 : -1);

            setPlayerHealth(kart.health);
            setPlayerKills(kart.kills);
            setPlayerWeapon(kart.weapon);
            setPlayerSpeedKmh(Math.round(Math.abs(kart.speed) * 4.2));
          } else {
            // Autonomous Combat AI Bots
            kart.aiFireTimer -= dt;
            const targetOpponent = eng.karts.find((k) => k.id !== kart.id && k.health > 0);

            if (kart.weapon === 'none') {
              let nearestBox = eng.itemBoxes.find((b) => b.active);
              if (nearestBox) {
                kart.aiTargetX = nearestBox.x;
                kart.aiTargetZ = nearestBox.z;
              }
            } else if (targetOpponent) {
              kart.aiTargetX = targetOpponent.x;
              kart.aiTargetZ = targetOpponent.z;

              if (kart.aiFireTimer <= 0) {
                fireWeapon(kart);
                kart.aiFireTimer = 2.0 + Math.random() * 2;
              }
            }

            // Steer towards target
            const tdx = kart.aiTargetX - kart.x;
            const tdz = kart.aiTargetZ - kart.z;
            const targetAngle = Math.atan2(tdx, tdz);
            let angleDiff = targetAngle - kart.angle;

            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            if (angleDiff > 0.1) kart.angle += turnSpeed * 0.85 * dt;
            else if (angleDiff < -0.1) kart.angle -= turnSpeed * 0.85 * dt;

            kart.speed = Math.min(kart.speed + accel * 0.85 * dt, topSpeed * 0.9);
          }

          // Apply velocity
          kart.vx = Math.sin(kart.angle) * kart.speed;
          kart.vz = Math.cos(kart.angle) * kart.speed;
          kart.x += kart.vx * dt;
          kart.z += kart.vz * dt;

          // Check Speed Booster Pad Stepping
          eng.boostPads.forEach((pad) => {
            if (Math.hypot(kart.x - pad.x, kart.z - pad.z) < 2.5) {
              kart.speed = 34;
              kart.nitroTimer = 2.0;
              sound.playLaser();
            }
          });

          // Arena Circular Forcefield Boundary Collision
          const distCenter = Math.hypot(kart.x, kart.z);
          if (distCenter > ARENA_SIZE - 1.8) {
            const pushBackAng = Math.atan2(kart.x, kart.z);
            kart.x = Math.sin(pushBackAng) * (ARENA_SIZE - 1.8);
            kart.z = Math.cos(pushBackAng) * (ARENA_SIZE - 1.8);
            kart.speed *= -0.45;
            spawnExplosionVFX(kart.x, 0.4, kart.z, 0x00f0ff);
          }

          // Spin Wheels
          kart.wheelMeshes.forEach((w) => {
            w.rotation.x += (kart.speed * dt) / 0.34;
          });

          // Tilt chassis slightly into turns for realistic kinetic weight
          const steerTilt = (kart.isDrifting ? -0.18 : -0.08) * (inputRef.current.left ? 1 : inputRef.current.right ? -1 : 0);
          kart.mesh.rotation.z = steerTilt;
          kart.mesh.position.set(kart.x, kart.y, kart.z);
          kart.mesh.rotation.y = kart.angle;

          // Item Box Pickups
          eng.itemBoxes.forEach((box) => {
            if (box.active && Math.hypot(kart.x - box.x, kart.z - box.z) < 1.8) {
              box.active = false;
              box.mesh.visible = false;
              box.respawnTimer = 6.0;

              if (kart.weapon === 'none') {
                const weaponsList: WeaponType[] = ['rocket', 'mine', 'nitro', 'shield'];
                kart.weapon = weaponsList[Math.floor(Math.random() * weaponsList.length)];
                sound.playCollect();

                if (kart.isPlayer) {
                  showToast(`⚡ ARMED: ${kart.weapon.toUpperCase()}!`);
                }
              }
            }
          });

          // Kart-on-Kart Ramming Collisions
          eng.karts.forEach((other) => {
            if (other.id !== kart.id && other.health > 0) {
              const ramDist = Math.hypot(kart.x - other.x, kart.z - other.z);
              if (ramDist < 2.0) {
                if (kart.nitroTimer > 0) {
                  other.health -= 40;
                  sound.playExplosion();
                  spawnExplosionVFX(other.x, 0.5, other.z, 0xf43f5e);
                  if (other.health <= 0) {
                    kart.kills += 1;
                    other.mesh.visible = false;
                    other.respawnTimer = 4.0;
                  }
                }
                kart.speed *= -0.5;
              }
            }
          });
        });

        // 2. UPDATE PROJECTILE ROCKETS
        for (let i = eng.projectiles.length - 1; i >= 0; i--) {
          const p = eng.projectiles[i];
          p.x += p.vx * dt;
          p.z += p.vz * dt;
          p.mesh.position.set(p.x, 0.55, p.z);
          p.lifetime -= dt;

          let destroyed = p.lifetime <= 0 || Math.hypot(p.x, p.z) > ARENA_SIZE;

          eng.karts.forEach((kart) => {
            if (kart.id !== p.ownerId && kart.health > 0) {
              if (Math.hypot(p.x - kart.x, p.z - kart.z) < 1.9) {
                destroyed = true;
                sound.playExplosion();
                spawnExplosionVFX(p.x, 0.55, p.z, 0xf43f5e);

                if (kart.shieldActive) {
                  kart.shieldActive = false;
                  kart.shieldMesh.visible = false;
                  if (kart.isPlayer) showToast('🛡️ SHIELD DEFLECTED ROCKET!');
                } else {
                  kart.health -= 50;
                  if (kart.health <= 0) {
                    const shooter = eng.karts.find((k) => k.id === p.ownerId);
                    if (shooter) shooter.kills += 1;
                    kart.mesh.visible = false;
                    kart.respawnTimer = 4.0;
                  }
                }
              }
            }
          });

          if (destroyed) {
            eng.scene.remove(p.mesh);
            eng.projectiles.splice(i, 1);
          }
        }

        // 3. UPDATE PROXIMITY MINES
        for (let i = eng.mines.length - 1; i >= 0; i--) {
          const m = eng.mines[i];
          if (!m.armed) {
            m.armTimer -= dt;
            if (m.armTimer <= 0) m.armed = true;
          }

          let detonated = false;
          if (m.armed) {
            eng.karts.forEach((kart) => {
              if (kart.health > 0 && Math.hypot(m.x - kart.x, m.z - kart.z) < 2.2) {
                detonated = true;
                sound.playExplosion();
                spawnExplosionVFX(m.x, 0.5, m.z, 0xf59e0b);

                if (kart.shieldActive) {
                  kart.shieldActive = false;
                  kart.shieldMesh.visible = false;
                } else {
                  kart.health -= 55;
                  if (kart.health <= 0) {
                    const placer = eng.karts.find((k) => k.id === m.ownerId);
                    if (placer) placer.kills += 1;
                    kart.mesh.visible = false;
                    kart.respawnTimer = 4.0;
                  }
                }
              }
            });
          }

          if (detonated) {
            eng.scene.remove(m.mesh);
            eng.mines.splice(i, 1);
          }
        }

        // Live Player Rank
        const sortedKarts = [...eng.karts].sort((a, b) => b.kills - a.kills);
        const pRank = sortedKarts.findIndex((k) => k.isPlayer) + 1;
        setPlayerRank(pRank);
      }

      // Smooth Kinetic 3D Chase Camera
      const player = eng.karts.find((k) => k.isPlayer);
      if (player && eng.camera) {
        const camDist = 11.5 + (player.nitroTimer > 0 ? 2.5 : 0);
        const camHeight = 6.8;
        const targetCamX = player.x - Math.sin(player.angle) * camDist;
        const targetCamZ = player.z - Math.cos(player.angle) * camDist;

        eng.camera.position.x += (targetCamX - eng.camera.position.x) * 0.12;
        eng.camera.position.y += (camHeight - eng.camera.position.y) * 0.12;
        eng.camera.position.z += (targetCamZ - eng.camera.position.z) * 0.12;

        eng.camera.lookAt(player.x, 1.2, player.z);
      }

      eng.renderer.render(eng.scene, eng.camera);
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !engineRef.current.renderer || !engineRef.current.camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      engineRef.current.camera.aspect = w / h;
      engineRef.current.camera.updateProjectionMatrix();
      engineRef.current.renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, [fireWeapon, showToast, spawnExplosionVFX]);

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3.5 select-none font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP COMBAT DASHBOARD BAR (OUTSIDE THE ARENA BOX)                       */}
      {/* ========================================================================= */}
      <div className="w-full flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md shadow-xl">
        {/* Left: Eliminations, Rank, Match Timer, Speedometer */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="px-3 sm:px-4 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-400/60 text-center shadow-inner">
            <div className="text-[8px] sm:text-[9px] font-black uppercase text-cyan-400 leading-none">KILLS</div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono leading-none mt-0.5">{playerKills}</div>
          </div>

          <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700 text-center">
            <div className="text-[8px] font-bold text-slate-400 uppercase leading-none">RANK</div>
            <div className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5">#{playerRank} / 5</div>
          </div>

          <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700 text-center">
            <div className="text-[8px] font-bold text-slate-400 uppercase leading-none">TIME</div>
            <div className="text-xs sm:text-sm font-black text-white font-mono mt-0.5">{matchTime}s</div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span>{playerSpeedKmh} KM/H</span>
          </div>
        </div>

        {/* Right: Weapon Indicator, Health Bar & Sound */}
        <div className="flex items-center gap-2">
          {/* Health Bar */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <div className="text-[9px] font-bold text-slate-400 uppercase">HULL INTEGRITY</div>
            <div className="w-24 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all ${
                  playerHealth > 50 ? 'bg-cyan-400' : playerHealth > 25 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(0, playerHealth)}%` }}
              />
            </div>
          </div>

          {/* Active Weapon Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/50 flex items-center gap-1.5 shadow-lg shadow-cyan-950/40">
            {playerWeapon === 'rocket' && <Rocket className="w-4 h-4 text-rose-500 animate-bounce" />}
            {playerWeapon === 'mine' && <Bomb className="w-4 h-4 text-amber-400 animate-pulse" />}
            {playerWeapon === 'nitro' && <Flame className="w-4 h-4 text-cyan-400 animate-pulse" />}
            {playerWeapon === 'shield' && <Shield className="w-4 h-4 text-indigo-400 animate-spin" />}
            {playerWeapon === 'none' && <Radio className="w-4 h-4 text-slate-600" />}
            <span className="text-xs font-black uppercase text-white font-mono">
              {playerWeapon === 'none' ? 'EMPTY' : playerWeapon}
            </span>
          </div>

          <button
            onClick={() => {
              const isMute = sound.toggleMute();
              setMuted(isMute);
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-slate-300 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 3D BATTLE ROYALE ARENA CANVAS (CLEAN UNOBSTRUCTED VIEW)                */}
      {/* ========================================================================= */}
      <div
        ref={mountRef}
        id="cyber-smash-kart-arena"
        className="relative w-full h-[460px] sm:h-[580px] md:h-[680px] max-h-[76vh] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden select-none border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 touch-none outline-none"
      >
        {/* 3D WebGL Canvas */}
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Combat Toast Message */}
        {toastMessage && (
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-2xl bg-slate-900/95 border border-cyan-400 text-cyan-300 font-bold text-xs tracking-wide shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-10">
            {toastMessage}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN MENU OVERLAY                                                         */}
        {/* ========================================================================= */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 z-20 bg-slate-950/92 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8 text-center space-y-4">
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-cyan-500/30 via-rose-500/30 to-amber-500/30 border-2 border-cyan-400 flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/40 p-4">
              <Gamepad2 className="w-10 h-10 text-cyan-400 animate-pulse" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                3D HIGH-OCTANE KART BATTLE ROYALE
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-rose-400 to-amber-300 mt-2 tracking-tight">
                CYBER SMASH KART 3D
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-md mx-auto">
                Drive cyber go-karts • Grab mystery weapon powerups • Blast 4 rival AI combatants in a neon arena!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={startMatch}
                className="px-9 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-rose-500 to-amber-400 hover:scale-105 active:scale-95 text-slate-950 font-black text-base sm:text-lg shadow-2xl shadow-cyan-500/40 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <Play className="w-6 h-6 fill-slate-950" />
                <span>START BATTLE ROYALE</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* GAME OVER / VICTORY OVERLAY                                               */}
        {/* ========================================================================= */}
        {(gameState === 'gameover' || gameState === 'victory') && (
          <div className="absolute inset-0 z-20 bg-slate-950/92 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-amber-500/20 border-2 border-cyan-400 flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/40 p-3">
              {gameState === 'victory' ? (
                <Crown className="w-9 h-9 text-amber-400 animate-bounce" />
              ) : (
                <Flame className="w-9 h-9 text-rose-500 animate-bounce" />
              )}
            </div>

            <div>
              <div className="text-xs uppercase font-black text-cyan-400 tracking-widest">
                {gameState === 'victory' ? 'CHAMPIONSHIP VICTORY' : 'MATCH TIME EXPIRED'}
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
                {gameState === 'victory' ? 'ARENA CHAMPION 👑' : `FINISHED #${playerRank} PLACE`}
              </h2>
            </div>

            <div className="w-full max-w-xs p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-bold">TOTAL KILLS:</span>
                <span className="text-2xl font-black text-white font-mono">{playerKills}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800">
                <span className="text-slate-400 font-bold">FINAL RANK:</span>
                <span className="text-xl font-black text-cyan-400 font-mono">#{playerRank} / 5</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setGameState('menu')}
                className="px-6 py-3.5 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 font-black text-xs sm:text-sm cursor-pointer hover:border-slate-500 transition-all"
              >
                MAIN MENU
              </button>
              <button
                onClick={startMatch}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-rose-500 to-amber-400 active:scale-95 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-cyan-500/40 flex items-center justify-center gap-2 transition-all hover:scale-105 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>PLAY AGAIN</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE CONTROLLER BAR (OUTSIDE THE ARENA BOX)                          */}
      {/* ========================================================================= */}
      {gameState === 'playing' && (
        <div className="w-full sm:hidden flex items-center justify-between px-3 py-2.5 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl">
          {/* Steering Left / Right */}
          <div className="flex items-center gap-2.5">
            <button
              onTouchStart={() => (inputRef.current.left = true)}
              onTouchEnd={() => (inputRef.current.left = false)}
              onMouseDown={() => (inputRef.current.left = true)}
              onMouseUp={() => (inputRef.current.left = false)}
              className="w-13 h-13 rounded-2xl bg-slate-950 border-2 border-cyan-500/60 active:bg-cyan-500 active:text-slate-950 text-cyan-300 font-black text-xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              ◀
            </button>
            <button
              onTouchStart={() => (inputRef.current.right = true)}
              onTouchEnd={() => (inputRef.current.right = false)}
              onMouseDown={() => (inputRef.current.right = true)}
              onMouseUp={() => (inputRef.current.right = false)}
              className="w-13 h-13 rounded-2xl bg-slate-950 border-2 border-cyan-500/60 active:bg-cyan-500 active:text-slate-950 text-cyan-300 font-black text-xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              ▶
            </button>
          </div>

          {/* Drift / Brake / Fire / Gas */}
          <div className="flex items-center gap-1.5">
            <button
              onTouchStart={() => (inputRef.current.drift = true)}
              onTouchEnd={() => (inputRef.current.drift = false)}
              onMouseDown={() => (inputRef.current.drift = true)}
              onMouseUp={() => (inputRef.current.drift = false)}
              className="px-2.5 h-13 rounded-2xl bg-slate-950 border border-purple-500/60 active:bg-purple-600 text-purple-300 font-black text-[11px] flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              DRIFT
            </button>

            <button
              onTouchStart={() => (inputRef.current.backward = true)}
              onTouchEnd={() => (inputRef.current.backward = false)}
              onMouseDown={() => (inputRef.current.backward = true)}
              onMouseUp={() => (inputRef.current.backward = false)}
              className="px-2.5 h-13 rounded-2xl bg-slate-950 border border-rose-500/60 active:bg-rose-600 text-rose-300 font-black text-[11px] flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              BRAKE
            </button>

            <button
              onClick={() => {
                const player = engineRef.current.karts.find((k) => k.isPlayer);
                if (player) fireWeapon(player);
              }}
              className="w-13 h-13 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 border border-amber-400 active:scale-90 text-slate-950 font-black text-[11px] flex flex-col items-center justify-center shadow-xl cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>FIRE</span>
            </button>

            <button
              onTouchStart={() => (inputRef.current.forward = true)}
              onTouchEnd={() => (inputRef.current.forward = false)}
              onMouseDown={() => (inputRef.current.forward = true)}
              onMouseUp={() => (inputRef.current.forward = false)}
              className="w-13 h-13 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 border border-cyan-300 active:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xl active:scale-95 transition-all cursor-pointer"
            >
              GAS
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BOTTOM CONTROLS GUIDE (OUTSIDE ARENA BOX)                              */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400 font-bold">
        <div className="inline-flex items-center gap-2">
          <span className="hidden sm:inline">⌨️ [W,A,S,D / ARROWS] Drive • [SPACEBAR / F] Fire • [SHIFT] Drift</span>
          <span className="sm:hidden text-cyan-300 font-semibold">🎮 TOUCH CONTROLS READY BELOW</span>
        </div>
        <div className="text-[11px] text-slate-500 hidden sm:block">
          ⚡ DRIVE OVER BLUE BOOSTER PADS FOR INSTANT 2X SPEED
        </div>
      </div>
    </div>
  );
};
