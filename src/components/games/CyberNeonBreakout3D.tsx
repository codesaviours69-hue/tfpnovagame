import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Crown,
  Sparkles,
  Zap,
  Shield,
  Heart,
  Crosshair,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface Brick {
  id: number;
  x: number;
  z: number;
  width: number;
  length: number;
  hp: number;
  maxHp: number;
  colorHex: number;
  type: 'normal' | 'silver' | 'tnt' | 'laser' | 'multiball' | 'fire' | 'shield';
  mesh: THREE.Mesh;
}

interface Ball {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  speed: number;
  isFire: boolean;
  mesh: THREE.Mesh;
  light: THREE.PointLight;
}

interface LaserBolt {
  x: number;
  z: number;
  vz: number;
  mesh: THREE.Mesh;
}

interface PowerDrop {
  x: number;
  z: number;
  vz: number;
  type: 'multiball' | 'laser' | 'shield' | 'fire' | 'wide';
  mesh: THREE.Group;
}

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

const ARENA_WIDTH = 18; // -9 to +9
const ARENA_LENGTH = 28; // -14 to +14

export const CyberNeonBreakout3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React UI State
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'victory'>('menu');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_breakout_high') || '0', 10);
  });
  const [lives, setLives] = useState<number>(3);
  const [level, setLevel] = useState<number>(1);
  const [activePower, setActivePower] = useState<string | null>(null);
  const [powerTimeLeft, setPowerTimeLeft] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Input & Simulation Refs
  const inputRef = useRef({
    targetX: 0,
    hasLaser: false,
    laserTimer: 0,
    hasShield: false,
    hasFire: false,
    fireTimer: 0,
    paddleWidth: 4.2,
    wideTimer: 0,
  });

  const callbacksRef = useRef({
    setScore,
    setHighScore,
    setLives,
    setLevel,
    setGameState,
    setActivePower,
    setPowerTimeLeft,
    showToast: (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 1600);
    },
  });

  useEffect(() => {
    callbacksRef.current = {
      setScore,
      setHighScore,
      setLives,
      setLevel,
      setGameState,
      setActivePower,
      setPowerTimeLeft,
      showToast: (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 1600);
      },
    };
  });

  // Three.js Engine Ref
  const engineRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    gameState: 'menu' | 'playing' | 'gameover' | 'victory';

    paddle: {
      x: number;
      z: number;
      width: number;
      mesh: THREE.Group;
      bodyMesh: THREE.Mesh;
      light: THREE.PointLight;
      leftCannon: THREE.Mesh;
      rightCannon: THREE.Mesh;
    };
    shieldMesh: THREE.Mesh | null;
    balls: Ball[];
    bricks: Brick[];
    powerDrops: PowerDrop[];
    lasers: LaserBolt[];
    particles: Particle[];

    laserCooldown: number;
    ballIdCounter: number;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    gameState: 'menu',

    paddle: {
      x: 0,
      z: 12,
      width: 4.2,
      mesh: new THREE.Group(),
      bodyMesh: new THREE.Mesh(),
      light: new THREE.PointLight(),
      leftCannon: new THREE.Mesh(),
      rightCannon: new THREE.Mesh(),
    },
    shieldMesh: null,
    balls: [],
    bricks: [],
    powerDrops: [],
    lasers: [],
    particles: [],

    laserCooldown: 0,
    ballIdCounter: 1,
  });

  // ---------------------------------------------------------------------------
  // BUILD PADDLE MESH
  // ---------------------------------------------------------------------------
  const createPaddleMesh = (): {
    group: THREE.Group;
    bodyMesh: THREE.Mesh;
    light: THREE.PointLight;
    leftCannon: THREE.Mesh;
    rightCannon: THREE.Mesh;
  } => {
    const group = new THREE.Group();

    const padGeo = new THREE.BoxGeometry(4.2, 0.5, 0.9);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.15,
      metalness: 0.85,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8,
    });
    const bodyMesh = new THREE.Mesh(padGeo, padMat);
    bodyMesh.position.y = 0.25;
    group.add(bodyMesh);

    const topStripGeo = new THREE.BoxGeometry(3.8, 0.1, 0.2);
    const topStripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const topStrip = new THREE.Mesh(topStripGeo, topStripMat);
    topStrip.position.set(0, 0.52, 0);
    group.add(topStrip);

    // Laser Cannons (Hidden by default, shown when laser is active)
    const cannonGeo = new THREE.BoxGeometry(0.25, 0.35, 0.9);
    const cannonMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.9,
    });
    const leftCannon = new THREE.Mesh(cannonGeo, cannonMat);
    leftCannon.position.set(-1.8, 0.3, -0.2);
    leftCannon.visible = false;
    group.add(leftCannon);

    const rightCannon = new THREE.Mesh(cannonGeo, cannonMat);
    rightCannon.position.set(1.8, 0.3, -0.2);
    rightCannon.visible = false;
    group.add(rightCannon);

    const light = new THREE.PointLight(0x00f0ff, 3.2, 7);
    light.position.set(0, 0.6, 0);
    group.add(light);

    return { group, bodyMesh, light, leftCannon, rightCannon };
  };

  // ---------------------------------------------------------------------------
  // BUILD BALL MESH
  // ---------------------------------------------------------------------------
  const createBallMesh = (isFire: boolean = false): { mesh: THREE.Mesh; light: THREE.PointLight } => {
    const geo = new THREE.SphereGeometry(0.45, 16, 16);
    const colorHex = isFire ? 0xf43f5e : 0x00f0ff;
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.1,
      metalness: 0.9,
      emissive: colorHex,
      emissiveIntensity: 1.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.45;

    const light = new THREE.PointLight(colorHex, 3.5, 7.5);
    mesh.add(light);

    return { mesh, light };
  };

  // ---------------------------------------------------------------------------
  // SPAWN HIT PARTICLES
  // ---------------------------------------------------------------------------
  const spawnHitVFX = (x: number, y: number, z: number, colorHex: number) => {
    const eng = engineRef.current;
    if (!eng.scene) return;

    const pGeo = new THREE.SphereGeometry(0.1, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: colorHex });

    for (let i = 0; i < 10; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(x, y, z);
      eng.scene.add(p);

      const ang = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 6;

      eng.particles.push({
        mesh: p,
        vx: Math.cos(ang) * spd,
        vy: 1 + Math.random() * 4,
        vz: Math.sin(ang) * spd,
        life: 0.4,
        maxLife: 0.4,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // SPAWN POWER DROP
  // ---------------------------------------------------------------------------
  const spawnPowerDrop = (x: number, z: number, type: 'multiball' | 'laser' | 'shield' | 'fire' | 'wide') => {
    const eng = engineRef.current;
    if (!eng.scene) return;

    const group = new THREE.Group();
    const geo = new THREE.OctahedronGeometry(0.38, 0);
    const colorHex =
      type === 'laser'
        ? 0xf43f5e
        : type === 'multiball'
        ? 0x00f0ff
        : type === 'shield'
        ? 0x10b981
        : type === 'fire'
        ? 0xf97316
        : 0xfacc15;
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    const pill = new THREE.Mesh(geo, mat);
    pill.position.y = 0.4;
    group.add(pill);
    group.position.set(x, 0, z);

    eng.scene.add(group);
    eng.powerDrops.push({ x, z, vz: 7, type, mesh: group });
  };

  // ---------------------------------------------------------------------------
  // BUILD BRICK FORMATION
  // ---------------------------------------------------------------------------
  const spawnBricks = (lvl: number) => {
    const eng = engineRef.current;
    if (!eng.scene) return;

    // Clean existing bricks
    eng.bricks.forEach((b) => eng.scene?.remove(b.mesh));
    eng.bricks = [];

    const rows = 4 + Math.min(lvl, 4);
    const cols = 8;
    const bW = 1.9;
    const bL = 0.9;
    const gapX = 0.25;
    const gapZ = 0.35;
    const startZ = -11.5;
    const startX = -((cols * (bW + gapX) - gapX) / 2) + bW / 2;

    const colors = [0xf43f5e, 0xf97316, 0xfacc15, 0x10b981, 0x00f0ff, 0xa855f7];

    for (let r = 0; r < rows; r++) {
      const rowZ = startZ + r * (bL + gapZ);
      const color = colors[r % colors.length];

      for (let c = 0; c < cols; c++) {
        const colX = startX + c * (bW + gapX);

        let type: 'normal' | 'silver' | 'tnt' | 'laser' | 'multiball' | 'fire' | 'shield' = 'normal';
        let hp = 1;

        const rand = Math.random();
        if (r === 0 && rand < 0.35) {
          type = 'silver';
          hp = 2;
        } else if (rand < 0.07) {
          type = 'tnt';
        } else if (rand < 0.14) {
          type = 'laser';
        } else if (rand < 0.21) {
          type = 'multiball';
        } else if (rand < 0.27) {
          type = 'fire';
        } else if (rand < 0.33) {
          type = 'shield';
        }

        const geo = new THREE.BoxGeometry(bW, 0.45, bL);
        const brickColor =
          type === 'silver'
            ? 0xe2e8f0
            : type === 'tnt'
            ? 0xef4444
            : type === 'laser'
            ? 0xf43f5e
            : type === 'fire'
            ? 0xf97316
            : color;

        const mat = new THREE.MeshStandardMaterial({
          color: brickColor,
          roughness: 0.15,
          metalness: 0.85,
          emissive: brickColor,
          emissiveIntensity: 0.65,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(colX, 0.25, rowZ);
        eng.scene.add(mesh);

        eng.bricks.push({
          id: r * cols + c,
          x: colX,
          z: rowZ,
          width: bW,
          length: bL,
          hp,
          maxHp: hp,
          colorHex: brickColor,
          type,
          mesh,
        });
      }
    }
  };

  // ---------------------------------------------------------------------------
  // SERVE BALL
  // ---------------------------------------------------------------------------
  const serveBall = (isFire: boolean = false) => {
    const eng = engineRef.current;
    if (!eng.scene) return;

    eng.balls.forEach((b) => eng.scene?.remove(b.mesh));
    eng.balls = [];

    const { mesh, light } = createBallMesh(isFire);
    mesh.position.set(eng.paddle.x, 0.45, eng.paddle.z - 1.0);
    eng.scene.add(mesh);

    const speed = 22;
    const launchAngle = (Math.random() - 0.5) * 0.5;
    eng.balls.push({
      id: eng.ballIdCounter++,
      x: eng.paddle.x,
      z: eng.paddle.z - 1.0,
      vx: Math.sin(launchAngle) * speed,
      vz: -Math.cos(launchAngle) * speed,
      speed,
      isFire,
      mesh,
      light,
    });
  };

  // ---------------------------------------------------------------------------
  // START MATCH
  // ---------------------------------------------------------------------------
  const startMatch = () => {
    sound.playClick();
    sound.playScore();
    const eng = engineRef.current;

    eng.gameState = 'playing';
    setScore(0);
    setLives(3);
    setLevel(1);
    setActivePower(null);
    setPowerTimeLeft(0);

    inputRef.current.hasLaser = false;
    inputRef.current.laserTimer = 0;
    inputRef.current.hasShield = false;
    inputRef.current.hasFire = false;
    inputRef.current.fireTimer = 0;
    inputRef.current.paddleWidth = 4.2;
    inputRef.current.wideTimer = 0;

    if (eng.paddle.leftCannon) eng.paddle.leftCannon.visible = false;
    if (eng.paddle.rightCannon) eng.paddle.rightCannon.visible = false;
    if (eng.shieldMesh) eng.shieldMesh.visible = false;

    setGameState('playing');
    spawnBricks(1);
    serveBall(false);
  };

  // ---------------------------------------------------------------------------
  // FIRE PADDLE LASER
  // ---------------------------------------------------------------------------
  const fireLaser = useCallback(() => {
    const eng = engineRef.current;
    if (!inputRef.current.hasLaser || !eng.scene || eng.laserCooldown > 0) return;

    eng.laserCooldown = 0.2;
    sound.playLaser();

    [-1.8, 1.8].forEach((offset) => {
      const geo = new THREE.BoxGeometry(0.18, 0.25, 1.4);
      const mat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(eng.paddle.x + offset, 0.35, eng.paddle.z - 0.8);
      eng.scene?.add(mesh);
      eng.lasers.push({ x: eng.paddle.x + offset, z: eng.paddle.z - 0.8, vz: -40, mesh });
    });
  }, []);

  // ---------------------------------------------------------------------------
  // INPUT HANDLERS
  // ---------------------------------------------------------------------------
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normalized = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to +1
    const padHalf = inputRef.current.paddleWidth / 2;
    inputRef.current.targetX = Math.max(
      -ARENA_WIDTH / 2 + padHalf + 0.3,
      Math.min(ARENA_WIDTH / 2 - padHalf - 0.3, normalized * (ARENA_WIDTH / 2))
    );
  };

  const handlePointerDown = () => {
    if (gameState === 'playing' && inputRef.current.hasLaser) {
      fireLaser();
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'KeyF'].includes(e.code)) {
        e.preventDefault();
        fireLaser();
      }
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        const padHalf = inputRef.current.paddleWidth / 2;
        inputRef.current.targetX = Math.max(
          -ARENA_WIDTH / 2 + padHalf + 0.3,
          inputRef.current.targetX - 2.5
        );
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        const padHalf = inputRef.current.paddleWidth / 2;
        inputRef.current.targetX = Math.min(
          ARENA_WIDTH / 2 - padHalf - 0.3,
          inputRef.current.targetX + 2.5
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fireLaser]);

  // ---------------------------------------------------------------------------
  // INITIALIZE THREE.JS SCENE ONCE ON MOUNT
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
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(aspect < 1.0 ? 56 : 46, aspect, 0.1, 1000);
    camera.position.set(0, 26, 24);
    camera.lookAt(0, 0, 0);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current || undefined,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Lighting
    const ambient = new THREE.AmbientLight(0x1e293b, 2.2);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 2.2);
    dirLight.position.set(15, 35, 20);
    scene.add(dirLight);

    // 5. Arena Floor & Walls
    const floorGeo = new THREE.PlaneGeometry(ARENA_WIDTH, ARENA_LENGTH);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x050b16,
      roughness: 0.2,
      metalness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Grid Lines
    const grid = new THREE.GridHelper(ARENA_LENGTH, 16, 0x00f0ff, 0x0f172a);
    grid.position.y = 0.005;
    scene.add(grid);

    // Side Rails
    const wallMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    [-ARENA_WIDTH / 2, ARENA_WIDTH / 2].forEach((x) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, ARENA_LENGTH), wallMat);
      rail.position.set(x, 0.3, 0);
      scene.add(rail);
    });

    // Top Wall
    const topWall = new THREE.Mesh(new THREE.BoxGeometry(ARENA_WIDTH, 0.6, 0.3), wallMat);
    topWall.position.set(0, 0.3, -ARENA_LENGTH / 2);
    scene.add(topWall);

    // Bottom Safety Shield Barrier
    const shieldGeo = new THREE.BoxGeometry(ARENA_WIDTH, 0.5, 0.3);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.set(0, 0.25, ARENA_LENGTH / 2 - 0.5);
    shieldMesh.visible = false;
    scene.add(shieldMesh);

    // 6. Spawn Paddle
    const { group: pMesh, bodyMesh, light: pLight, leftCannon, rightCannon } = createPaddleMesh();
    pMesh.position.set(0, 0, 12);
    scene.add(pMesh);

    engineRef.current.scene = scene;
    engineRef.current.camera = camera;
    engineRef.current.renderer = renderer;
    engineRef.current.paddle = {
      x: 0,
      z: 12,
      width: 4.2,
      mesh: pMesh,
      bodyMesh,
      light: pLight,
      leftCannon,
      rightCannon,
    };
    engineRef.current.shieldMesh = shieldMesh;

    // Spawn initial demo formation for background
    spawnBricks(1);

    // -------------------------------------------------------------------------
    // 60 FPS SIMULATION LOOP
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

      if (eng.laserCooldown > 0) eng.laserCooldown -= dt;

      // Update Power Timers
      if (inputRef.current.hasLaser) {
        inputRef.current.laserTimer -= dt;
        callbacksRef.current.setPowerTimeLeft(Math.ceil(inputRef.current.laserTimer));
        if (inputRef.current.laserTimer <= 0) {
          inputRef.current.hasLaser = false;
          eng.paddle.leftCannon.visible = false;
          eng.paddle.rightCannon.visible = false;
          callbacksRef.current.setActivePower(null);
        }
      }

      if (inputRef.current.hasFire) {
        inputRef.current.fireTimer -= dt;
        callbacksRef.current.setPowerTimeLeft(Math.ceil(inputRef.current.fireTimer));
        if (inputRef.current.fireTimer <= 0) {
          inputRef.current.hasFire = false;
          callbacksRef.current.setActivePower(null);
          eng.balls.forEach((b) => {
            b.isFire = false;
            (b.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x00f0ff);
            (b.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x00f0ff);
            b.light.color.setHex(0x00f0ff);
          });
        }
      }

      // Update Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.life -= dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 9.8 * dt;

        const scale = Math.max(0, p.life / p.maxLife);
        p.mesh.scale.set(scale, scale, scale);

        if (p.life <= 0) {
          eng.scene.remove(p.mesh);
          eng.particles.splice(i, 1);
        }
      }

      if (eng.gameState === 'playing') {
        // 1. UPDATE PADDLE
        eng.paddle.x += (inputRef.current.targetX - eng.paddle.x) * 0.3;
        eng.paddle.mesh.position.x = eng.paddle.x;

        // 2. UPDATE LASER BOLTS
        for (let i = eng.lasers.length - 1; i >= 0; i--) {
          const l = eng.lasers[i];
          l.z += l.vz * dt;
          l.mesh.position.z = l.z;

          // Check Brick Hit
          let hit = false;
          for (let bIdx = eng.bricks.length - 1; bIdx >= 0; bIdx--) {
            const b = eng.bricks[bIdx];
            if (Math.abs(l.x - b.x) < b.width / 2 && Math.abs(l.z - b.z) < b.length / 2) {
              hit = true;
              b.hp -= 1;
              sound.playHit();
              spawnHitVFX(b.x, 0.35, b.z, b.colorHex);

              if (b.hp <= 0) {
                eng.scene.remove(b.mesh);
                eng.bricks.splice(bIdx, 1);
                callbacksRef.current.setScore((prev) => {
                  const ns = prev + 150;
                  const curHigh = parseInt(localStorage.getItem('cyber_breakout_high') || '0', 10);
                  if (ns > curHigh) {
                    callbacksRef.current.setHighScore(ns);
                    localStorage.setItem('cyber_breakout_high', String(ns));
                  }
                  return ns;
                });
              }
              break;
            }
          }

          if (hit || l.z < -ARENA_LENGTH / 2) {
            eng.scene.remove(l.mesh);
            eng.lasers.splice(i, 1);
          }
        }

        // 3. UPDATE POWER DROPS
        for (let i = eng.powerDrops.length - 1; i >= 0; i--) {
          const p = eng.powerDrops[i];
          p.z += p.vz * dt;
          p.mesh.position.z = p.z;
          p.mesh.rotation.y += dt * 3;

          // Collect by Paddle
          const inPaddle =
            Math.abs(p.x - eng.paddle.x) < eng.paddle.width / 2 + 0.6 &&
            Math.abs(p.z - eng.paddle.z) < 1.0;

          if (inPaddle) {
            sound.playPowerup();
            spawnHitVFX(p.x, 0.35, p.z, 0xfacc15);

            if (p.type === 'laser') {
              inputRef.current.hasLaser = true;
              inputRef.current.laserTimer = 15;
              eng.paddle.leftCannon.visible = true;
              eng.paddle.rightCannon.visible = true;
              callbacksRef.current.setActivePower('🔫 TWIN LASERS');
              callbacksRef.current.showToast('🔫 TWIN LASERS ACTIVATED (15s)!');
            } else if (p.type === 'multiball') {
              callbacksRef.current.showToast('⚡ MULTIBALL FRENZY!');
              const base = eng.balls[0];
              if (base) {
                for (let k = 0; k < 2; k++) {
                  const { mesh, light } = createBallMesh(base.isFire);
                  mesh.position.set(base.x, 0.45, base.z);
                  eng.scene.add(mesh);
                  const angle = k === 0 ? 0.6 : -0.6;
                  eng.balls.push({
                    id: eng.ballIdCounter++,
                    x: base.x,
                    z: base.z,
                    vx: Math.sin(angle) * base.speed,
                    vz: Math.cos(angle) * base.speed,
                    speed: base.speed,
                    isFire: base.isFire,
                    mesh,
                    light,
                  });
                }
              }
            } else if (p.type === 'shield') {
              inputRef.current.hasShield = true;
              if (eng.shieldMesh) eng.shieldMesh.visible = true;
              callbacksRef.current.setActivePower('🛡️ SAFETY SHIELD');
              callbacksRef.current.showToast('🛡️ SAFETY SHIELD DEPLOYED!');
            } else if (p.type === 'fire') {
              inputRef.current.hasFire = true;
              inputRef.current.fireTimer = 12;
              callbacksRef.current.setActivePower('🔥 PLASMA FIREBALL');
              callbacksRef.current.showToast('🔥 PLASMA FIREBALL (12s)!');
              eng.balls.forEach((b) => {
                b.isFire = true;
                (b.mesh.material as THREE.MeshStandardMaterial).color.setHex(0xf43f5e);
                (b.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xf43f5e);
                b.light.color.setHex(0xf43f5e);
              });
            }

            eng.scene.remove(p.mesh);
            eng.powerDrops.splice(i, 1);
          } else if (p.z > ARENA_LENGTH / 2 + 2) {
            eng.scene.remove(p.mesh);
            eng.powerDrops.splice(i, 1);
          }
        }

        // 4. UPDATE BALLS
        for (let i = eng.balls.length - 1; i >= 0; i--) {
          const b = eng.balls[i];
          b.x += b.vx * dt;
          b.z += b.vz * dt;
          b.mesh.position.set(b.x, 0.45, b.z);

          // Side Walls Bounce
          if (b.x < -ARENA_WIDTH / 2 + 0.6 || b.x > ARENA_WIDTH / 2 - 0.6) {
            b.vx *= -1;
            b.x = Math.max(-ARENA_WIDTH / 2 + 0.6, Math.min(ARENA_WIDTH / 2 - 0.6, b.x));
            sound.playClick();
            spawnHitVFX(b.x, 0.45, b.z, 0x00f0ff);
          }

          // Top Wall Bounce
          if (b.z < -ARENA_LENGTH / 2 + 0.6) {
            b.vz *= -1;
            b.z = -ARENA_LENGTH / 2 + 0.6;
            sound.playClick();
            spawnHitVFX(b.x, 0.45, b.z, 0x00f0ff);
          }

          // Bottom Shield Bounce
          if (inputRef.current.hasShield && b.z >= ARENA_LENGTH / 2 - 0.8 && b.vz > 0) {
            b.vz *= -1;
            b.z = ARENA_LENGTH / 2 - 0.8;
            inputRef.current.hasShield = false;
            if (eng.shieldMesh) eng.shieldMesh.visible = false;
            callbacksRef.current.setActivePower(null);
            sound.playLaser();
            callbacksRef.current.showToast('🛡️ SHIELD DEFLECTED BALL!');
            spawnHitVFX(b.x, 0.45, b.z, 0x10b981);
          }

          // Paddle Collision
          const pPad = eng.paddle;
          if (
            b.z + 0.45 >= pPad.z - 0.45 &&
            b.z - 0.45 <= pPad.z + 0.45 &&
            b.x >= pPad.x - pPad.width / 2 - 0.2 &&
            b.x <= pPad.x + pPad.width / 2 + 0.2 &&
            b.vz > 0
          ) {
            const hitOffset = (b.x - pPad.x) / (pPad.width / 2); // -1 to +1
            b.speed = Math.min(34, b.speed * 1.02);
            b.vz = -Math.cos(hitOffset * 0.9) * b.speed;
            b.vx = Math.sin(hitOffset * 0.9) * b.speed;
            b.z = pPad.z - 0.55;

            // Ensure minimum vertical velocity so ball doesn't get stuck horizontally
            if (Math.abs(b.vz) < 8) b.vz = -8;

            sound.playJump();
            spawnHitVFX(b.x, 0.45, b.z, 0x00f0ff);
          }

          // Brick Collision Check
          for (let bIdx = eng.bricks.length - 1; bIdx >= 0; bIdx--) {
            const brk = eng.bricks[bIdx];
            const overlapX = Math.abs(b.x - brk.x) < brk.width / 2 + 0.4;
            const overlapZ = Math.abs(b.z - brk.z) < brk.length / 2 + 0.4;

            if (overlapX && overlapZ) {
              if (!b.isFire) {
                b.vz *= -1;
              }
              brk.hp -= 1;
              sound.playHit();
              spawnHitVFX(brk.x, 0.35, brk.z, brk.colorHex);

              if (brk.hp <= 0) {
                // Drop Powerups Chance
                if (brk.type === 'laser') spawnPowerDrop(brk.x, brk.z, 'laser');
                else if (brk.type === 'multiball') spawnPowerDrop(brk.x, brk.z, 'multiball');
                else if (brk.type === 'fire') spawnPowerDrop(brk.x, brk.z, 'fire');
                else if (brk.type === 'shield') spawnPowerDrop(brk.x, brk.z, 'shield');
                else if (Math.random() < 0.1) spawnPowerDrop(brk.x, brk.z, 'laser');

                eng.scene.remove(brk.mesh);
                eng.bricks.splice(bIdx, 1);
                callbacksRef.current.setScore((prev) => {
                  const ns = prev + 100;
                  const curHigh = parseInt(localStorage.getItem('cyber_breakout_high') || '0', 10);
                  if (ns > curHigh) {
                    callbacksRef.current.setHighScore(ns);
                    localStorage.setItem('cyber_breakout_high', String(ns));
                  }
                  return ns;
                });

                // Check Level Clear
                if (eng.bricks.length === 0) {
                  sound.playWin();
                  confetti({ particleCount: 150, spread: 80 });
                  callbacksRef.current.setLevel((lvl) => {
                    const nextLvl = lvl + 1;
                    callbacksRef.current.showToast(`🔥 LEVEL ${nextLvl} CLEARED!`);
                    spawnBricks(nextLvl);
                    serveBall(inputRef.current.hasFire);
                    return nextLvl;
                  });
                }
              }
              break;
            }
          }

          // Bottom Drop (Ball Lost)
          if (b.z > ARENA_LENGTH / 2 + 1.5) {
            eng.scene.remove(b.mesh);
            eng.balls.splice(i, 1);

            if (eng.balls.length === 0) {
              sound.playExplosion();
              callbacksRef.current.setLives((prev) => {
                const nLives = prev - 1;
                if (nLives <= 0) {
                  eng.gameState = 'gameover';
                  callbacksRef.current.setGameState('gameover');
                  sound.playGameOver();
                } else {
                  serveBall(inputRef.current.hasFire);
                }
                return nLives;
              });
            }
          }
        }
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
      const asp = w / h;
      engineRef.current.camera.aspect = asp;
      engineRef.current.camera.fov = asp < 1.0 ? 56 : 46;
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
  }, []);

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3.5 select-none font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP SCORE & HUD BAR (OUTSIDE CANVAS BOX)                               */}
      {/* ========================================================================= */}
      <div className="w-full flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md shadow-xl">
        {/* Score & Level */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="px-3 sm:px-4 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-400/60 text-center shadow-inner">
            <div className="text-[8px] sm:text-[9px] font-black uppercase text-cyan-400 leading-none">SCORE</div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono leading-none mt-0.5">{score}</div>
          </div>

          <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700 text-center">
            <div className="text-[8px] font-bold text-slate-400 uppercase leading-none">LEVEL</div>
            <div className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5">{level}</div>
          </div>

          {/* Lives */}
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${i < lives ? 'text-rose-500 fill-rose-500 animate-pulse' : 'text-slate-700'}`}
              />
            ))}
          </div>
        </div>

        {/* Active Powerup Badge */}
        {activePower && (
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-400 text-amber-300 font-black text-xs animate-pulse flex items-center gap-1.5 shadow-lg">
            <span>{activePower}</span>
            {powerTimeLeft > 0 && <span className="text-white font-mono text-[11px]">({powerTimeLeft}s)</span>}
          </div>
        )}

        {/* Right: Best Record & Mute */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] uppercase font-black text-amber-400 tracking-wider flex items-center justify-end gap-1">
              <Crown className="w-3 h-3 text-amber-400" /> BEST
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono leading-none">
              {highScore}
            </div>
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
      {/* 2. 3D BREAKOUT ARENA CANVAS (CLEAN UNOBSTRUCTED VIEW)                     */}
      {/* ========================================================================= */}
      <div
        ref={mountRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        id="cyber-breakout-arena"
        className="relative w-full h-[460px] sm:h-[560px] md:h-[660px] max-h-[74vh] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden select-none border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 touch-none outline-none cursor-ew-resize"
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
          <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-cyan-500/30 to-amber-500/30 border-2 border-cyan-400 flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/40 p-3">
              <Zap className="w-9 h-9 text-cyan-400 animate-pulse" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                3D CYBERNETIC BRICK BREAKER
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-rose-400 to-amber-300 mt-2 tracking-tight">
                BREAKOUT 3D
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-md mx-auto">
                Control the plasma paddle • Smash holographic bricks • Fire Twin Lasers & unleash Multiball!
              </p>
            </div>

            <button
              onClick={startMatch}
              className="px-9 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-rose-500 to-amber-400 hover:scale-105 active:scale-95 text-slate-950 font-black text-base sm:text-lg shadow-2xl shadow-cyan-500/40 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Play className="w-6 h-6 fill-slate-950" />
              <span>START SMASHING BRICKS</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* GAME OVER MODAL                                                           */}
        {/* ========================================================================= */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-20 bg-slate-950/92 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto shadow-xl shadow-rose-500/30">
              <Award className="w-9 h-9 text-rose-400 animate-bounce" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">OUT OF LIVES!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GAME OVER</h2>
            </div>

            <div className="w-full max-w-xs p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-white font-mono text-xl font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Level Reached:</span>
                <span className="text-amber-300 font-mono text-xl font-black">{level}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Best Record:</span>
                <span className="text-cyan-300 font-mono text-xl font-black">{highScore}</span>
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
      {/* 3. BOTTOM CONTROLS GUIDE (OUTSIDE ARENA BOX)                              */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400 font-bold">
        <div className="inline-flex items-center gap-2">
          <span>🎮 Slide mouse / touch left-right to move paddle • [SPACE / CLICK] Fire Twin Lasers</span>
        </div>
        <div className="text-[11px] text-slate-500 hidden sm:block">
          ⚡ CATCH FALLING CAPSULES FOR LASERS & MULTIBALL
        </div>
      </div>
    </div>
  );
};
