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
  Swords
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

type Difficulty = 'easy' | 'medium' | 'hard';

interface Ball {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  speed: number;
  isSmash: boolean;
  mesh: THREE.Mesh;
  light: THREE.PointLight;
}

const TABLE_WIDTH = 18; // -9 to +9
const TABLE_LENGTH = 30; // -15 to +15

export const CyberNeonPong3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Match States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'victory'>('menu');
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [aiScore, setAiScore] = useState<number>(0);
  const [targetScore] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [smashReady, setSmashReady] = useState<boolean>(false);
  const [smashCharge, setSmashCharge] = useState<number>(0); // 0 to 100
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Input Ref
  const inputRef = useRef({
    targetX: 0,
    isSmashed: false,
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1600);
  }, []);

  // Three.js Engine Ref
  const engineRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    gameState: 'menu' | 'playing' | 'gameover' | 'victory';

    playerPaddle: { x: number; z: number; width: number; mesh: THREE.Group; light: THREE.PointLight };
    aiPaddle: { x: number; z: number; width: number; mesh: THREE.Group; light: THREE.PointLight; speed: number };
    balls: Ball[];
    particles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number }[];

    scoreCooldown: number;
    rallyCount: number;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    gameState: 'menu',

    playerPaddle: { x: 0, z: 12.5, width: 4.2, mesh: new THREE.Group(), light: new THREE.PointLight() },
    aiPaddle: { x: 0, z: -12.5, width: 4.2, mesh: new THREE.Group(), light: new THREE.PointLight(), speed: 17 },
    balls: [],
    particles: [],

    scoreCooldown: 0,
    rallyCount: 0,
  });

  // ---------------------------------------------------------------------------
  // BUILD PROCEDURAL GLOWING NEON PADDLE (CLEAN MESH, NO UGLY WIREFRAME)
  // ---------------------------------------------------------------------------
  const createPaddleMesh = (colorHex: number): { group: THREE.Group; light: THREE.PointLight } => {
    const group = new THREE.Group();

    // Main Paddle Bar
    const padGeo = new THREE.BoxGeometry(4.2, 0.5, 1.0);
    const padMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.15,
      metalness: 0.85,
      emissive: colorHex,
      emissiveIntensity: 0.7,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.25;
    group.add(pad);

    // Glowing Neon Top Accent Strip
    const topStripGeo = new THREE.BoxGeometry(3.8, 0.1, 0.3);
    const topStripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const topStrip = new THREE.Mesh(topStripGeo, topStripMat);
    topStrip.position.set(0, 0.52, 0);
    group.add(topStrip);

    // Dynamic Point Light Glow
    const light = new THREE.PointLight(colorHex, 3.2, 7.5);
    light.position.set(0, 0.6, 0);
    group.add(light);

    return { group, light };
  };

  // ---------------------------------------------------------------------------
  // CREATE 3D PLASMA BALL
  // ---------------------------------------------------------------------------
  const createBallMesh = (): { mesh: THREE.Mesh; light: THREE.PointLight } => {
    const geo = new THREE.SphereGeometry(0.55, 18, 18);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.55;

    const light = new THREE.PointLight(0x00f0ff, 3.8, 9);
    mesh.add(light);

    return { mesh, light };
  };

  // ---------------------------------------------------------------------------
  // SPAWN COLLISION VFX PARTICLES
  // ---------------------------------------------------------------------------
  const spawnHitVFX = useCallback((x: number, y: number, z: number, colorHex: number) => {
    const eng = engineRef.current;
    if (!eng.scene) return;

    const pGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: colorHex });

    for (let i = 0; i < 14; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(x, y, z);
      eng.scene.add(p);

      const ang = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;

      eng.particles.push({
        mesh: p,
        vx: Math.cos(ang) * speed,
        vy: 1 + Math.random() * 4,
        vz: Math.sin(ang) * speed,
        life: 0.45,
        maxLife: 0.45,
      });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // SERVE BALL
  // ---------------------------------------------------------------------------
  const serveBall = useCallback((towardPlayer: boolean) => {
    const eng = engineRef.current;
    if (!eng.scene) return;

    // Clean old balls
    eng.balls.forEach((b) => eng.scene?.remove(b.mesh));
    eng.balls = [];

    const { mesh, light } = createBallMesh();
    mesh.position.set(0, 0.55, 0);
    eng.scene.add(mesh);

    const baseSpeed = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 24 : 28;
    const launchAngle = (Math.random() - 0.5) * 0.7;
    const vz = towardPlayer ? baseSpeed : -baseSpeed;
    const vx = Math.sin(launchAngle) * baseSpeed;

    eng.balls.push({
      x: 0,
      z: 0,
      vx,
      vz,
      radius: 0.55,
      speed: baseSpeed,
      isSmash: false,
      mesh,
      light,
    });

    eng.rallyCount = 0;
  }, [difficulty]);

  // ---------------------------------------------------------------------------
  // START NEW MATCH
  // ---------------------------------------------------------------------------
  const startMatch = useCallback(() => {
    sound.playClick();
    sound.playScore();
    const eng = engineRef.current;

    eng.gameState = 'playing';
    setPlayerScore(0);
    setAiScore(0);
    setSmashCharge(0);
    setSmashReady(false);
    setGameState('playing');

    serveBall(Math.random() < 0.5);
  }, [serveBall]);

  // ---------------------------------------------------------------------------
  // SMASH ATTACK ACTION
  // ---------------------------------------------------------------------------
  const triggerSmash = useCallback(() => {
    if (!smashReady) return;
    inputRef.current.isSmashed = true;
    sound.playLaser();
    showToast('⚡ HYPERSONIC SMASH READY!');
  }, [showToast, smashReady]);

  // ---------------------------------------------------------------------------
  // INPUT POINTER EVENT (MOUSE & TOUCH DRAG)
  // ---------------------------------------------------------------------------
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const normalized = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to +1
    inputRef.current.targetX = Math.max(-TABLE_WIDTH / 2 + 2.2, Math.min(TABLE_WIDTH / 2 - 2.2, normalized * (TABLE_WIDTH / 2)));
  };

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'KeyF', 'Enter'].includes(e.code)) {
        e.preventDefault();
        triggerSmash();
      }
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        inputRef.current.targetX = Math.max(-TABLE_WIDTH / 2 + 2.2, inputRef.current.targetX - 2.2);
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        inputRef.current.targetX = Math.min(TABLE_WIDTH / 2 - 2.2, inputRef.current.targetX + 2.2);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSmash]);

  // ---------------------------------------------------------------------------
  // INITIALIZE THREE.JS SCENE & 60 FPS SIMULATION
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.01);

    // 2. Camera Setup (Aspect-Aware Framing)
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(aspect < 1.0 ? 56 : 46, aspect, 0.1, 1000);
    camera.position.set(0, 26, 26);
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

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 2.4);
    dirLight.position.set(15, 35, 20);
    scene.add(dirLight);

    // 5. Glowing Cyber Glass Table Floor
    const tableGeo = new THREE.PlaneGeometry(TABLE_WIDTH, TABLE_LENGTH);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x050b16,
      roughness: 0.2,
      metalness: 0.8,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.rotation.x = -Math.PI / 2;
    scene.add(table);

    // Table Boundary Outer Border Neon Lines
    const borderMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const borderMatPink = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    // Side Rails (Glowing Glass Rails)
    [-TABLE_WIDTH / 2, TABLE_WIDTH / 2].forEach((x) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, TABLE_LENGTH), borderMatCyan);
      rail.position.set(x, 0.25, 0);
      scene.add(rail);
    });

    // Center Net (Solid Translucent Neon Glass Pane - NO UGLY WIREFRAME)
    const netGeo = new THREE.BoxGeometry(TABLE_WIDTH, 1.1, 0.08);
    const netMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.45,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.3,
    });
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(0, 0.55, 0);
    scene.add(net);

    // Net Top Neon Bar
    const netTopBar = new THREE.Mesh(new THREE.BoxGeometry(TABLE_WIDTH, 0.1, 0.15), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    netTopBar.position.set(0, 1.15, 0);
    scene.add(netTopBar);

    // Net Posts
    [-TABLE_WIDTH / 2, TABLE_WIDTH / 2].forEach((x) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
      post.position.set(x, 0.7, 0);
      scene.add(post);
    });

    // Center Service Line on Table
    const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(0.12, TABLE_LENGTH), new THREE.MeshBasicMaterial({ color: 0x00f0ff, opacity: 0.4, transparent: true }));
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.set(0, 0.01, 0);
    scene.add(centerLine);

    // Grid Floor
    const grid = new THREE.GridHelper(TABLE_LENGTH, 16, 0x00f0ff, 0x0f172a);
    grid.position.y = 0.005;
    scene.add(grid);

    // 6. Spawn Player and AI Paddles
    const { group: pMesh, light: pLight } = createPaddleMesh(0x00f0ff);
    pMesh.position.set(0, 0, 12.5);
    scene.add(pMesh);

    const { group: aiMesh, light: aiLight } = createPaddleMesh(0xf43f5e);
    aiMesh.position.set(0, 0, -12.5);
    scene.add(aiMesh);

    engineRef.current.scene = scene;
    engineRef.current.camera = camera;
    engineRef.current.renderer = renderer;
    engineRef.current.playerPaddle = { x: 0, z: 12.5, width: 4.2, mesh: pMesh, light: pLight };
    engineRef.current.aiPaddle = {
      x: 0,
      z: -12.5,
      width: 4.2,
      mesh: aiMesh,
      light: aiLight,
      speed: difficulty === 'easy' ? 14 : difficulty === 'medium' ? 18 : 24,
    };

    // -------------------------------------------------------------------------
    // 60 FPS PONG SIMULATION LOOP
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
        // 1. UPDATE PLAYER PADDLE
        eng.playerPaddle.x += (inputRef.current.targetX - eng.playerPaddle.x) * 0.25;
        eng.playerPaddle.mesh.position.x = eng.playerPaddle.x;

        // 2. UPDATE AI PADDLE
        const primaryBall = eng.balls[0];
        if (primaryBall) {
          const aiSpeed = eng.aiPaddle.speed * dt;
          const targetAiX = Math.max(
            -TABLE_WIDTH / 2 + 2.2,
            Math.min(TABLE_WIDTH / 2 - 2.2, primaryBall.x + (difficulty === 'hard' ? primaryBall.vx * 0.15 : 0))
          );
          if (targetAiX > eng.aiPaddle.x + 0.25) {
            eng.aiPaddle.x = Math.min(eng.aiPaddle.x + aiSpeed, targetAiX);
          } else if (targetAiX < eng.aiPaddle.x - 0.25) {
            eng.aiPaddle.x = Math.max(eng.aiPaddle.x - aiSpeed, targetAiX);
          }
        }
        eng.aiPaddle.mesh.position.x = eng.aiPaddle.x;

        // 3. UPDATE BALLS
        for (let i = eng.balls.length - 1; i >= 0; i--) {
          const b = eng.balls[i];
          b.x += b.vx * dt;
          b.z += b.vz * dt;
          b.mesh.position.set(b.x, 0.55, b.z);

          // Side Rails Bounce
          if (b.x < -TABLE_WIDTH / 2 + b.radius || b.x > TABLE_WIDTH / 2 - b.radius) {
            b.vx *= -1;
            b.x = Math.max(-TABLE_WIDTH / 2 + b.radius, Math.min(TABLE_WIDTH / 2 - b.radius, b.x));
            sound.playClick();
            spawnHitVFX(b.x, 0.55, b.z, 0x00f0ff);
          }

          // Player Paddle Collision Check
          const pPad = eng.playerPaddle;
          if (
            b.z + b.radius >= pPad.z - 0.5 &&
            b.z - b.radius <= pPad.z + 0.5 &&
            b.x >= pPad.x - pPad.width / 2 &&
            b.x <= pPad.x + pPad.width / 2 &&
            b.vz > 0
          ) {
            // Deflect Angle based on hit offset from paddle center
            const hitOffset = (b.x - pPad.x) / (pPad.width / 2); // -1 to +1
            const smashMultiplier = inputRef.current.isSmashed ? 1.55 : 1.05;
            b.speed = Math.min(46, b.speed * smashMultiplier);
            b.isSmash = inputRef.current.isSmashed;

            if (b.isSmash) {
              b.light.color.setHex(0xfacc15);
              (b.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xfacc15);
              showToast('🔥 SMASH BLAST!');
            }

            b.vz = -Math.cos(hitOffset * 0.85) * b.speed;
            b.vx = Math.sin(hitOffset * 0.85) * b.speed;
            b.z = pPad.z - 0.6;

            inputRef.current.isSmashed = false;
            eng.rallyCount++;
            sound.playJump();
            spawnHitVFX(b.x, 0.55, b.z, b.isSmash ? 0xfacc15 : 0x00f0ff);

            // Charge Smash Meter
            setSmashCharge((prev) => {
              const next = Math.min(100, prev + 25);
              if (next >= 100) setSmashReady(true);
              return next;
            });
          }

          // AI Paddle Collision Check
          const aiPad = eng.aiPaddle;
          if (
            b.z - b.radius <= aiPad.z + 0.5 &&
            b.z + b.radius >= aiPad.z - 0.5 &&
            b.x >= aiPad.x - aiPad.width / 2 &&
            b.x <= aiPad.x + aiPad.width / 2 &&
            b.vz < 0
          ) {
            const hitOffset = (b.x - aiPad.x) / (aiPad.width / 2);
            b.speed = Math.min(46, b.speed * 1.04);
            b.isSmash = false;
            b.light.color.setHex(0xf43f5e);
            (b.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xf43f5e);

            b.vz = Math.cos(hitOffset * 0.85) * b.speed;
            b.vx = Math.sin(hitOffset * 0.85) * b.speed;
            b.z = aiPad.z + 0.6;

            eng.rallyCount++;
            sound.playHit();
            spawnHitVFX(b.x, 0.55, b.z, 0xf43f5e);
          }

          // GOAL DETECTION (POINT SCORED)
          if (b.z > TABLE_LENGTH / 2 + 1.5) {
            // AI Scored
            sound.playExplosion();
            spawnHitVFX(b.x, 0.55, b.z, 0xf43f5e);
            setAiScore((prev) => {
              const newScore = prev + 1;
              if (newScore >= targetScore) {
                eng.gameState = 'gameover';
                setGameState('gameover');
                sound.playGameOver();
              } else {
                serveBall(true);
              }
              return newScore;
            });
            break;
          } else if (b.z < -TABLE_LENGTH / 2 - 1.5) {
            // Player Scored!
            sound.playScore();
            spawnHitVFX(b.x, 0.55, b.z, 0x00f0ff);
            setPlayerScore((prev) => {
              const newScore = prev + 1;
              if (newScore >= targetScore) {
                eng.gameState = 'victory';
                setGameState('victory');
                sound.playWin();
                confetti({ particleCount: 180, spread: 90 });
              } else {
                serveBall(false);
              }
              return newScore;
            });
            break;
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
  }, [difficulty, serveBall, showToast, spawnHitVFX, targetScore]);

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3.5 select-none font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP SCORE & SMASH HUD BAR (OUTSIDE CANVAS BOX)                         */}
      {/* ========================================================================= */}
      <div className="w-full flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md shadow-xl">
        {/* Match Score */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-500/40">
            <span className="text-xs font-black text-cyan-400">YOU</span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono">{playerScore}</span>
            <span className="text-slate-600 font-black">-</span>
            <span className="text-xl sm:text-2xl font-black text-rose-500 font-mono">{aiScore}</span>
            <span className="text-xs font-black text-rose-400">AI</span>
          </div>

          <div className="text-[11px] font-bold text-slate-400 hidden sm:block">
            FIRST TO <span className="text-cyan-300 font-mono font-black">{targetScore}</span> WINS
          </div>
        </div>

        {/* Smash Meter & Audio */}
        <div className="flex items-center gap-2">
          {/* Smash Meter */}
          <button
            onClick={triggerSmash}
            disabled={!smashReady}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 border transition-all cursor-pointer ${
              smashReady
                ? 'bg-gradient-to-r from-amber-400 to-rose-500 border-amber-300 text-slate-950 font-black shadow-lg shadow-amber-500/40 animate-pulse active:scale-95'
                : 'bg-slate-950 border-slate-700 text-slate-500'
            }`}
          >
            <Zap className={`w-4 h-4 ${smashReady ? 'fill-slate-950' : 'text-slate-600'}`} />
            <span className="text-xs font-black uppercase font-mono">
              {smashReady ? 'SMASH READY!' : `CHARGE ${smashCharge}%`}
            </span>
          </button>

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
      {/* 2. 3D PONG ARENA CANVAS (CLEAN UNOBSTRUCTED VIEW)                         */}
      {/* ========================================================================= */}
      <div
        ref={mountRef}
        onPointerMove={handlePointerMove}
        id="cyber-neon-pong-arena"
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
          <div className="absolute inset-0 z-20 bg-slate-950/92 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8 text-center space-y-4">
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-cyan-500/30 to-rose-500/30 border-2 border-cyan-400 flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/40 p-4">
              <Swords className="w-10 h-10 text-cyan-400 animate-pulse" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                3D CYBERPUNK TABLE TENNIS
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-rose-400 to-amber-300 mt-2 tracking-tight">
                HYPER PONG 3D
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-md mx-auto">
                Control the quantum paddle • Curve plasma balls with spin • Smash hypersonic shots past adaptive AI!
              </p>
            </div>

            {/* Difficulty Selector */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    difficulty === d
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={startMatch}
              className="px-9 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-rose-500 to-amber-400 hover:scale-105 active:scale-95 text-slate-950 font-black text-base sm:text-lg shadow-2xl shadow-cyan-500/40 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Play className="w-6 h-6 fill-slate-950" />
              <span>START PONG DUEL</span>
            </button>
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
                <Award className="w-9 h-9 text-rose-500 animate-bounce" />
              )}
            </div>

            <div>
              <div className="text-xs uppercase font-black text-cyan-400 tracking-widest">
                {gameState === 'victory' ? 'CHAMPIONSHIP VICTORY' : 'MATCH DEFEAT'}
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
                {gameState === 'victory' ? 'YOU WON THE CUP! 👑' : 'AI CLAIMED VICTORY'}
              </h2>
            </div>

            <div className="w-full max-w-xs p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex justify-between items-center text-sm font-mono font-black">
              <span className="text-cyan-400 text-xl">YOU: {playerScore}</span>
              <span className="text-slate-500">:</span>
              <span className="text-rose-400 text-xl">AI: {aiScore}</span>
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
          <span>🎮 Move mouse or drag touch left/right to position paddle • [SPACEBAR / TAP SMASH] Fire Power Smash</span>
        </div>
        <div className="text-[11px] text-slate-500 hidden sm:block">
          ⚡ HIT BALL WITH PADDLE EDGES TO IMPART CURVE SPIN
        </div>
      </div>
    </div>
  );
};
