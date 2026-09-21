import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Award,
  Crown,
  Sparkles,
  Zap,
  Shield,
  Flame,
  Magnet,
  Gamepad2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface SnakeSegment {
  x: number;
  z: number;
  mesh: THREE.Mesh;
}

interface FoodItem {
  x: number;
  z: number;
  type: 'core' | 'turbo' | 'magnet' | 'shield';
  mesh: THREE.Group;
  light: THREE.PointLight;
}

const GRID_SIZE = 22; // -11 to +11
const STEP_TIME = 110; // ms per step

export const CyberSnake3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React UI States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_snake_high') || '0', 10);
  });
  const [snakeLength, setSnakeLength] = useState<number>(4);
  const [activePower, setActivePower] = useState<string | null>(null);
  const [powerTimer, setPowerTimer] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Direction State
  const dirRef = useRef<{ dx: number; dz: number }>({ dx: 0, dz: -1 });
  const nextDirRef = useRef<{ dx: number; dz: number }>({ dx: 0, dz: -1 });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1600);
  }, []);

  // Three.js Engine Ref
  const engineRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    gameState: 'menu' | 'playing' | 'gameover';

    snake: SnakeSegment[];
    headMesh: THREE.Group;
    food: FoodItem[];
    particles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number }[];

    lastStepTime: number;
    stepInterval: number;
    hasShield: boolean;
    hasMagnet: boolean;
    turboActive: boolean;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    gameState: 'menu',

    snake: [],
    headMesh: new THREE.Group(),
    food: [],
    particles: [],

    lastStepTime: performance.now(),
    stepInterval: STEP_TIME,
    hasShield: false,
    hasMagnet: false,
    turboActive: false,
  });

  // ---------------------------------------------------------------------------
  // BUILD 3D SNAKE HEAD MESH
  // ---------------------------------------------------------------------------
  const createHeadMesh = (): THREE.Group => {
    const group = new THREE.Group();

    // Head Base
    const headGeo = new THREE.BoxGeometry(0.9, 0.6, 1.1);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.15,
      metalness: 0.85,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.35;
    group.add(head);

    // Visor Eyes
    const eyeGeo = new THREE.BoxGeometry(0.7, 0.16, 0.2);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyes = new THREE.Mesh(eyeGeo, eyeMat);
    eyes.position.set(0, 0.42, 0.5);
    group.add(eyes);

    // Head Light
    const light = new THREE.PointLight(0x00f0ff, 2.8, 6);
    light.position.set(0, 0.5, 0.3);
    group.add(light);

    return group;
  };

  // ---------------------------------------------------------------------------
  // BUILD 3D BODY SEGMENT MESH
  // ---------------------------------------------------------------------------
  const createSegmentMesh = (index: number): THREE.Mesh => {
    const geo = new THREE.SphereGeometry(0.42, 12, 12);
    const colorHex = index % 2 === 0 ? 0x0284c7 : 0x00f0ff;
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.2,
      metalness: 0.8,
      emissive: colorHex,
      emissiveIntensity: 0.5,
    });
    const seg = new THREE.Mesh(geo, mat);
    seg.position.y = 0.35;
    return seg;
  };

  // ---------------------------------------------------------------------------
  // BUILD 3D FOOD / POWERUP MESH
  // ---------------------------------------------------------------------------
  const createFoodMesh = (type: 'core' | 'turbo' | 'magnet' | 'shield'): { group: THREE.Group; light: THREE.PointLight } => {
    const group = new THREE.Group();

    let colorHex = 0xfacc15;
    if (type === 'turbo') colorHex = 0xf43f5e;
    if (type === 'magnet') colorHex = 0xa855f7;
    if (type === 'shield') colorHex = 0x10b981;

    const geo = new THREE.OctahedronGeometry(0.42, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.1,
      metalness: 0.9,
      emissive: colorHex,
      emissiveIntensity: 1.0,
    });
    const core = new THREE.Mesh(geo, mat);
    core.position.y = 0.45;
    group.add(core);

    const ringGeo = new THREE.TorusGeometry(0.65, 0.04, 6, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    ring.position.y = 0.45;
    group.add(ring);

    const light = new THREE.PointLight(colorHex, 2.5, 5.5);
    light.position.y = 0.5;
    group.add(light);

    return { group, light };
  };

  // ---------------------------------------------------------------------------
  // SPAWN FOOD ON GRID
  // ---------------------------------------------------------------------------
  const spawnFood = useCallback(() => {
    const eng = engineRef.current;
    if (!eng.scene) return;

    // Clean old food
    eng.food.forEach((f) => eng.scene?.remove(f.mesh));
    eng.food = [];

    // Find unoccupied grid coordinate
    let fx = 0;
    let fz = 0;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 50) {
      attempts++;
      fx = Math.floor(Math.random() * (GRID_SIZE - 2)) - Math.floor((GRID_SIZE - 2) / 2);
      fz = Math.floor(Math.random() * (GRID_SIZE - 2)) - Math.floor((GRID_SIZE - 2) / 2);

      const inSnake = eng.snake.some((s) => s.x === fx && s.z === fz);
      if (!inSnake) valid = true;
    }

    // Powerup chances
    let type: 'core' | 'turbo' | 'magnet' | 'shield' = 'core';
    const rand = Math.random();
    if (rand < 0.15) type = 'turbo';
    else if (rand < 0.28) type = 'magnet';
    else if (rand < 0.40) type = 'shield';

    const { group, light } = createFoodMesh(type);
    group.position.set(fx, 0, fz);
    eng.scene.add(group);

    eng.food.push({
      x: fx,
      z: fz,
      type,
      mesh: group,
      light,
    });
  }, []);

  // ---------------------------------------------------------------------------
  // SPAWN VFX PARTICLES
  // ---------------------------------------------------------------------------
  const spawnCollectVFX = useCallback((x: number, y: number, z: number, colorHex: number) => {
    const eng = engineRef.current;
    if (!eng.scene) return;

    const pGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: colorHex });

    for (let i = 0; i < 14; i++) {
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
  }, []);

  // ---------------------------------------------------------------------------
  // START NEW MATCH
  // ---------------------------------------------------------------------------
  const startMatch = useCallback(() => {
    sound.playClick();
    sound.playScore();
    const eng = engineRef.current;

    // Reset snake
    eng.snake.forEach((s) => eng.scene?.remove(s.mesh));
    eng.snake = [];

    // Initialize 4 segments
    for (let i = 0; i < 4; i++) {
      const segMesh = createSegmentMesh(i);
      segMesh.position.set(0, 0.35, i);
      eng.scene?.add(segMesh);
      eng.snake.push({ x: 0, z: i, mesh: segMesh });
    }

    dirRef.current = { dx: 0, dz: -1 };
    nextDirRef.current = { dx: 0, dz: -1 };
    eng.gameState = 'playing';
    eng.hasShield = false;
    eng.hasMagnet = false;
    eng.turboActive = false;
    eng.stepInterval = STEP_TIME;
    eng.lastStepTime = performance.now();

    setScore(0);
    setSnakeLength(4);
    setActivePower(null);
    setGameState('playing');

    spawnFood();
  }, [spawnFood]);

  // ---------------------------------------------------------------------------
  // CHANGE DIRECTION
  // ---------------------------------------------------------------------------
  const changeDirection = useCallback((dx: number, dz: number) => {
    const cur = dirRef.current;
    // Disallow 180-degree turn into self
    if (dx !== 0 && cur.dx !== 0) return;
    if (dz !== 0 && cur.dz !== 0) return;
    nextDirRef.current = { dx, dz };
  }, []);

  // ---------------------------------------------------------------------------
  // KEYBOARD CONTROLS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        changeDirection(0, -1);
      }
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        changeDirection(0, 1);
      }
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        changeDirection(-1, 0);
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        changeDirection(1, 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection]);

  // ---------------------------------------------------------------------------
  // INITIALIZE THREE.JS SCENE & 60 FPS GAME LOOP
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

    // 2. Camera Setup (Aspect-Aware Perspective)
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(aspect < 1.0 ? 56 : 46, aspect, 0.1, 1000);
    camera.position.set(0, 24, 20);
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

    // 5. Glowing Cyber Grid Table
    const arenaGeo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const arenaMat = new THREE.MeshStandardMaterial({
      color: 0x050b16,
      roughness: 0.2,
      metalness: 0.8,
    });
    const arena = new THREE.Mesh(arenaGeo, arenaMat);
    arena.rotation.x = -Math.PI / 2;
    scene.add(arena);

    // Grid Lines
    const grid = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, 0x00f0ff, 0x0f172a);
    grid.position.y = 0.005;
    scene.add(grid);

    // Outer Neon Wall Ring
    const wallGeo = new THREE.BoxGeometry(GRID_SIZE + 0.4, 0.6, GRID_SIZE + 0.4);
    const wallMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: false });

    [-GRID_SIZE / 2, GRID_SIZE / 2].forEach((x) => {
      const wSide = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, GRID_SIZE), wallMat);
      wSide.position.set(x, 0.3, 0);
      scene.add(wSide);
    });

    [-GRID_SIZE / 2, GRID_SIZE / 2].forEach((z) => {
      const wSide = new THREE.Mesh(new THREE.BoxGeometry(GRID_SIZE, 0.6, 0.3), wallMat);
      wSide.position.set(0, 0.3, z);
      scene.add(wSide);
    });

    // 6. Spawn Head Mesh
    const headMesh = createHeadMesh();
    scene.add(headMesh);

    engineRef.current.scene = scene;
    engineRef.current.camera = camera;
    engineRef.current.renderer = renderer;
    engineRef.current.headMesh = headMesh;

    // -------------------------------------------------------------------------
    // 60 FPS SIMULATION & GRID STEP LOOP
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

      // Rotate Food Items
      eng.food.forEach((f) => {
        f.mesh.rotation.y += dt * 2.5;
        f.mesh.position.y = Math.sin(now * 0.006) * 0.15;
      });

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

      // -----------------------------------------------------------------------
      // SNAKE DISCRETE GRID STEP UPDATE
      // -----------------------------------------------------------------------
      if (eng.gameState === 'playing') {
        const timeSinceStep = now - eng.lastStepTime;
        if (timeSinceStep >= eng.stepInterval) {
          eng.lastStepTime = now;
          dirRef.current = nextDirRef.current;

          const head = eng.snake[0];
          if (head) {
            const nextX = head.x + dirRef.current.dx;
            const nextZ = head.z + dirRef.current.dz;

            // Wall Collision Check (Wrap Around or Crash)
            const halfGrid = Math.floor(GRID_SIZE / 2) - 1;
            let finalX = nextX;
            let finalZ = nextZ;

            if (Math.abs(nextX) > halfGrid || Math.abs(nextZ) > halfGrid) {
              if (eng.hasShield) {
                // Shield saves from wall crash! Wrap around!
                finalX = nextX > halfGrid ? -halfGrid : nextX < -halfGrid ? halfGrid : nextX;
                finalZ = nextZ > halfGrid ? -halfGrid : nextZ < -halfGrid ? halfGrid : nextZ;
                eng.hasShield = false;
                setActivePower(null);
                sound.playLaser();
                showToast('🛡️ SHIELD SAVED CRASH!');
              } else {
                handleCrash();
                return;
              }
            }

            // Self Tail Collision Check
            const tailCollision = eng.snake.slice(1).some((seg) => seg.x === finalX && seg.z === finalZ);
            if (tailCollision) {
              if (eng.hasShield) {
                eng.hasShield = false;
                setActivePower(null);
                sound.playLaser();
                showToast('🛡️ SHIELD BLOCKED SELF-BITE!');
              } else {
                handleCrash();
                return;
              }
            }

            // Check Food Eaten
            const foodIndex = eng.food.findIndex((f) => f.x === finalX && f.z === finalZ);
            let grew = false;

            if (foodIndex !== -1) {
              const eaten = eng.food[foodIndex];
              eng.scene?.remove(eaten.mesh);
              eng.food.splice(foodIndex, 1);

              grew = true;
              sound.playCollect();
              spawnCollectVFX(finalX, 0.45, finalZ, 0x00f0ff);

              if (eaten.type === 'core') {
                setScore((prev) => {
                  const ns = prev + 100;
                  if (ns > highScore) {
                    setHighScore(ns);
                    localStorage.setItem('cyber_snake_high', String(ns));
                  }
                  return ns;
                });
              } else if (eaten.type === 'turbo') {
                sound.playPowerup();
                eng.turboActive = true;
                eng.stepInterval = STEP_TIME * 0.6;
                setActivePower('⚡ 2X TURBO SPEED');
                showToast('⚡ TURBO OVERDRIVE!');
                setScore((prev) => prev + 250);
                setTimeout(() => {
                  eng.turboActive = false;
                  eng.stepInterval = STEP_TIME;
                  setActivePower(null);
                }, 6000);
              } else if (eaten.type === 'shield') {
                sound.playPowerup();
                eng.hasShield = true;
                setActivePower('🛡️ PHASE SHIELD');
                showToast('🛡️ PHASE SHIELD ENGAGED');
                setScore((prev) => prev + 200);
              } else if (eaten.type === 'magnet') {
                sound.playPowerup();
                eng.hasMagnet = true;
                setActivePower('🧲 CORE MAGNET');
                showToast('🧲 CORE MAGNET ACTIVE');
                setScore((prev) => prev + 200);
              }

              spawnFood();
            }

            // Move Snake Segments
            const newSegments: SnakeSegment[] = [];

            // Add new head position
            const newHeadMesh = createSegmentMesh(0);
            newHeadMesh.position.set(finalX, 0.35, finalZ);
            eng.scene?.add(newHeadMesh);
            newSegments.push({ x: finalX, z: finalZ, mesh: newHeadMesh });

            // Update existing body segments
            for (let i = 0; i < eng.snake.length - (grew ? 0 : 1); i++) {
              newSegments.push(eng.snake[i]);
            }

            // Remove tail if didn't grow
            if (!grew && eng.snake.length > 0) {
              const oldTail = eng.snake[eng.snake.length - 1];
              eng.scene?.remove(oldTail.mesh);
            }

            eng.snake = newSegments;
            setSnakeLength(eng.snake.length);

            // Update Head Mesh position & look direction
            eng.headMesh.position.set(finalX, 0, finalZ);
            eng.headMesh.rotation.y = Math.atan2(dirRef.current.dx, dirRef.current.dz);
          }
        }
      }

      function handleCrash() {
        sound.playGameOver();
        eng.gameState = 'gameover';
        setGameState('gameover');
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
  }, [highScore, showToast, spawnCollectVFX, spawnFood]);

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3.5 select-none font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP SCORE & VIPER HUD BAR (OUTSIDE CANVAS BOX)                         */}
      {/* ========================================================================= */}
      <div className="w-full flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md shadow-xl">
        {/* Left: Score & Length */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="px-3 sm:px-4 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-400/60 text-center shadow-inner">
            <div className="text-[8px] sm:text-[9px] font-black uppercase text-cyan-400 leading-none">SCORE</div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono leading-none mt-0.5">{score}</div>
          </div>

          <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700 text-center">
            <div className="text-[8px] font-bold text-slate-400 uppercase leading-none">LENGTH</div>
            <div className="text-xs sm:text-sm font-black text-cyan-300 font-mono mt-0.5">{snakeLength}</div>
          </div>
        </div>

        {/* Active Powerup Badge */}
        {activePower && (
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-400 text-amber-300 font-black text-xs animate-pulse">
            {activePower}
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
      {/* 2. 3D SNAKE ARENA CANVAS (CLEAN UNOBSTRUCTED VIEW)                        */}
      {/* ========================================================================= */}
      <div
        ref={mountRef}
        id="cyber-snake-arena"
        className="relative w-full h-[460px] sm:h-[560px] md:h-[660px] max-h-[74vh] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden select-none border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 touch-none outline-none"
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
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-cyan-500/30 to-emerald-500/30 border-2 border-cyan-400 flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/40 p-4">
              <Gamepad2 className="w-10 h-10 text-cyan-400 animate-pulse" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                3D CYBERNETIC VIPER ARENA
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 mt-2 tracking-tight">
                CYBER SNAKE 3D
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-md mx-auto">
                Slither through the glowing cyber grid • Devour quantum energy cores • Unlock Turbo & Shields at 60 FPS!
              </p>
            </div>

            <button
              onClick={startMatch}
              className="px-9 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-500 to-amber-400 hover:scale-105 active:scale-95 text-slate-950 font-black text-base sm:text-lg shadow-2xl shadow-cyan-500/40 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Play className="w-6 h-6 fill-slate-950" />
              <span>START SLITHERING</span>
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
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">CRASH DETECTED!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GAME OVER</h2>
            </div>

            <div className="w-full max-w-xs p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-white font-mono text-xl font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Viper Length:</span>
                <span className="text-cyan-300 font-mono text-xl font-black">{snakeLength}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Best Record:</span>
                <span className="text-amber-300 font-mono text-xl font-black">{highScore}</span>
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
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-500 to-amber-400 active:scale-95 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-cyan-500/40 flex items-center justify-center gap-2 transition-all hover:scale-105 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>PLAY AGAIN</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE D-PAD CONTROLLER BAR (OUTSIDE CANVAS BOX)                       */}
      {/* ========================================================================= */}
      {gameState === 'playing' && (
        <div className="w-full sm:hidden flex items-center justify-center py-2">
          <div className="grid grid-cols-3 gap-2 w-44">
            <div />
            <button
              onClick={() => changeDirection(0, -1)}
              className="w-13 h-13 rounded-2xl bg-slate-900 border-2 border-cyan-500/60 active:bg-cyan-500 active:text-slate-950 text-cyan-300 font-black text-xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              ▲
            </button>
            <div />

            <button
              onClick={() => changeDirection(-1, 0)}
              className="w-13 h-13 rounded-2xl bg-slate-900 border-2 border-cyan-500/60 active:bg-cyan-500 active:text-slate-950 text-cyan-300 font-black text-xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              ◀
            </button>
            <button
              onClick={() => changeDirection(0, 1)}
              className="w-13 h-13 rounded-2xl bg-slate-900 border-2 border-cyan-500/60 active:bg-cyan-500 active:text-slate-950 text-cyan-300 font-black text-xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              ▼
            </button>
            <button
              onClick={() => changeDirection(1, 0)}
              className="w-13 h-13 rounded-2xl bg-slate-900 border-2 border-cyan-500/60 active:bg-cyan-500 active:text-slate-950 text-cyan-300 font-black text-xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              ▶
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BOTTOM CONTROLS GUIDE (OUTSIDE ARENA BOX)                              */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400 font-bold">
        <div className="inline-flex items-center gap-2">
          <span className="hidden sm:inline">⌨️ Use [W,A,S,D] or [ARROW KEYS] to turn Cyber Snake</span>
          <span className="sm:hidden text-cyan-300 font-semibold">🎮 TOUCH D-PAD READY BELOW</span>
        </div>
        <div className="text-[11px] text-slate-500 hidden sm:block">
          ⚡ DEVOUR POWERUPS FOR 2X TURBO & PHASE SHIELD
        </div>
      </div>
    </div>
  );
};
