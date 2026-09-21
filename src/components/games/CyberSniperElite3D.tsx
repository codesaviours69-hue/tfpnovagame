import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Sparkles, Flame, Shield, Crosshair, Zap, Eye, Wind, Target, AlertTriangle, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface SniperTarget {
  id: number;
  mesh: THREE.Group;
  type: 'soldier' | 'drone' | 'barrel' | 'hostage' | 'boss';
  health: number;
  maxHealth: number;
  isDead: boolean;
  startX: number;
  targetX: number;
  speed: number;
  dir: number;
}

interface Mission {
  id: number;
  title: string;
  brief: string;
  targetCount: number;
  timeLimitSec: number;
  windSpeed: number; // m/s
  reward: number;
}

const MISSIONS: Mission[] = [
  { id: 1, title: 'Contract Alpha: Rooftop Sentry', brief: 'Neutralize 3 rogue mercenary snipers positioned across the cyber tower.', targetCount: 3, timeLimitSec: 45, windSpeed: 2, reward: 250 },
  { id: 2, title: 'Contract Bravo: Explosive Fuel Sabotage', brief: 'Detonate the 3 high-octane red plasma canisters to disable the depot.', targetCount: 3, timeLimitSec: 40, windSpeed: 4, reward: 350 },
  { id: 3, title: 'Contract Charlie: Drone Fleet Intercept', brief: 'Shoot down 4 agile reconnaissance attack drones patrolling mid-air.', targetCount: 4, timeLimitSec: 50, windSpeed: 6, reward: 500 },
  { id: 4, title: 'Contract Delta: Hostage Precision Save', brief: 'Eliminate 3 terrorist captors. CAUTION: Do NOT hit the hostage in blue!', targetCount: 3, timeLimitSec: 35, windSpeed: 5, reward: 700 },
  { id: 5, title: 'Contract Echo: Thermal Cyber Assassin', brief: 'Eliminate the heavily armored Cyber Warlord Boss in the observation deck.', targetCount: 1, timeLimitSec: 60, windSpeed: 8, reward: 1200 },
];

export const CyberSniperElite3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Game UI State
  const [missionIndex, setMissionIndex] = useState(0);
  const [gameState, setGameState] = useState<'briefing' | 'playing' | 'mission_failed' | 'mission_cleared'>('briefing');
  const [ammo, setAmmo] = useState(5);
  const [isReloading, setIsReloading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<2 | 4 | 8>(4);
  const [isHoldingBreath, setIsHoldingBreath] = useState(false);
  const [breathMeter, setBreathMeter] = useState(100);
  const [targetsLeft, setTargetsLeft] = useState(3);
  const [timeLeft, setTimeLeft] = useState(45);
  const [headshots, setHeadshots] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem('sniper_coins');
    return saved ? parseInt(saved, 10) : 150;
  });
  const [muted, setMuted] = useState(sound.isMuted());
  const [bulletCamActive, setBulletCamActive] = useState(false);

  // 3D Scene Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const targetsRef = useRef<SniperTarget[]>([]);
  const bulletMeshRef = useRef<THREE.Mesh | null>(null);

  // Aim & Reticle Angles
  const aimRef = useRef({
    yaw: 0,
    pitch: 0,
    wobblePhase: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    startYaw: 0,
    startPitch: 0,
  });

  // Start / Setup Mission
  const setupMission = useCallback((mIdx: number) => {
    setMissionIndex(mIdx);
    const mission = MISSIONS[mIdx] || MISSIONS[0];
    setTargetsLeft(mission.targetCount);
    setTimeLeft(mission.timeLimitSec);
    setAmmo(5);
    setIsReloading(false);
    setBreathMeter(100);
    setIsHoldingBreath(false);
    setBulletCamActive(false);

    // Reset Camera Aim
    aimRef.current.yaw = 0;
    aimRef.current.pitch = 0;

    // Clear old targets from 3D scene
    if (sceneRef.current) {
      targetsRef.current.forEach((t) => sceneRef.current?.remove(t.mesh));
      targetsRef.current = [];

      // Spawn Mission Specific Targets
      const newTargets: SniperTarget[] = [];

      if (mission.id === 1) {
        // 3 Soldiers on rooftop
        const positions = [-25, 0, 25];
        positions.forEach((posX, idx) => {
          const group = new THREE.Group();
          // Soldier Body
          const body = new THREE.Mesh(
            new THREE.BoxGeometry(2, 4.5, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 })
          );
          body.position.y = 2.25;
          // Soldier Head (Headshot hitbox)
          const head = new THREE.Mesh(
            new THREE.SphereGeometry(1, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xfecdd3 })
          );
          head.position.y = 5.2;
          group.add(body, head);
          group.position.set(posX, 12, -180 + idx * 10);

          sceneRef.current?.add(group);
          newTargets.push({
            id: idx + 1,
            mesh: group,
            type: 'soldier',
            health: 100,
            maxHealth: 100,
            isDead: false,
            startX: posX,
            targetX: posX + (idx % 2 === 0 ? 12 : -12),
            speed: 4,
            dir: 1,
          });
        });
      } else if (mission.id === 2) {
        // Red Explosive Fuel Barrels
        const barrelX = [-30, 0, 30];
        barrelX.forEach((posX, idx) => {
          const group = new THREE.Group();
          const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 4.5, 16),
            new THREE.MeshBasicMaterial({ color: 0xef4444 })
          );
          barrel.position.y = 2.25;
          // Warning stripes
          const stripe = new THREE.Mesh(
            new THREE.CylinderGeometry(2.1, 2.1, 1, 16),
            new THREE.MeshBasicMaterial({ color: 0xfacc15 })
          );
          stripe.position.y = 2.25;
          group.add(barrel, stripe);
          group.position.set(posX, 6, -170);

          sceneRef.current?.add(group);
          newTargets.push({
            id: idx + 1,
            mesh: group,
            type: 'barrel',
            health: 50,
            maxHealth: 50,
            isDead: false,
            startX: posX,
            targetX: posX,
            speed: 0,
            dir: 0,
          });
        });
      } else if (mission.id === 3) {
        // 4 Flying Attack Drones
        for (let i = 0; i < 4; i++) {
          const group = new THREE.Group();
          const droneCore = new THREE.Mesh(
            new THREE.OctahedronGeometry(2),
            new THREE.MeshBasicMaterial({ color: 0x00f0ff })
          );
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(3.5, 0.3, 8, 24),
            new THREE.MeshBasicMaterial({ color: 0xf43f5e })
          );
          ring.rotation.x = Math.PI / 2;
          group.add(droneCore, ring);
          const posX = -30 + i * 20;
          group.position.set(posX, 20 + (i % 2) * 8, -160 - i * 15);

          sceneRef.current?.add(group);
          newTargets.push({
            id: i + 1,
            mesh: group,
            type: 'drone',
            health: 80,
            maxHealth: 80,
            isDead: false,
            startX: posX - 15,
            targetX: posX + 15,
            speed: 8 + i * 2,
            dir: 1,
          });
        }
      } else if (mission.id === 4) {
        // 3 Terrorists + 1 Hostage (Blue)
        const hostGroup = new THREE.Group();
        const hostBody = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 4.2, 1.2),
          new THREE.MeshBasicMaterial({ color: 0x0284c7 })
        );
        hostBody.position.y = 2.1;
        const hostHead = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
        hostHead.position.y = 4.8;
        hostGroup.add(hostBody, hostHead);
        hostGroup.position.set(0, 10, -170);
        sceneRef.current?.add(hostGroup);

        newTargets.push({
          id: 99,
          mesh: hostGroup,
          type: 'hostage',
          health: 100,
          maxHealth: 100,
          isDead: false,
          startX: 0,
          targetX: 0,
          speed: 0,
          dir: 0,
        });

        // 3 Terrorists around Hostage
        [-18, 18, 35].forEach((posX, idx) => {
          const group = new THREE.Group();
          const body = new THREE.Mesh(
            new THREE.BoxGeometry(2, 4.5, 1.5),
            new THREE.MeshStandardMaterial({ color: 0xb91c1c })
          );
          body.position.y = 2.25;
          const head = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfca5a5 }));
          head.position.y = 5.2;
          group.add(body, head);
          group.position.set(posX, 10, -170 + idx * 8);

          sceneRef.current?.add(group);
          newTargets.push({
            id: idx + 1,
            mesh: group,
            type: 'soldier',
            health: 100,
            maxHealth: 100,
            isDead: false,
            startX: posX - 6,
            targetX: posX + 6,
            speed: 5,
            dir: 1,
          });
        });
      } else {
        // Boss Mission (Giant Cyber Warlord)
        const bossGroup = new THREE.Group();
        const bossBody = new THREE.Mesh(
          new THREE.BoxGeometry(4.5, 8, 3),
          new THREE.MeshStandardMaterial({ color: 0x4c1d95, metalness: 0.9 })
        );
        bossBody.position.y = 4;
        const bossHead = new THREE.Mesh(
          new THREE.SphereGeometry(1.8, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xec4899 })
        );
        bossHead.position.y = 9.2;
        bossGroup.add(bossBody, bossHead);
        bossGroup.position.set(0, 15, -190);

        sceneRef.current?.add(bossGroup);
        newTargets.push({
          id: 1,
          mesh: bossGroup,
          type: 'boss',
          health: 300,
          maxHealth: 300,
          isDead: false,
          startX: -25,
          targetX: 25,
          speed: 6,
          dir: 1,
        });
      }

      targetsRef.current = newTargets;
    }

    setGameState('playing');
  }, []);

  // Reload Sniper Rifle
  const handleReload = useCallback(() => {
    if (isReloading || ammo === 5) return;
    setIsReloading(true);
    sound.playClick();
    setTimeout(() => {
      setAmmo(5);
      setIsReloading(false);
    }, 1200);
  }, [ammo, isReloading]);

  // Pull Trigger / Shoot Sniper Rifle
  const handleShoot = useCallback(() => {
    if (gameState !== 'playing' || isReloading) return;

    if (ammo <= 0) {
      handleReload();
      return;
    }

    setAmmo((prev) => prev - 1);
    sound.playLaser();

    // Calculate Target Raycast / Crosshair Hit
    if (!cameraRef.current || !sceneRef.current) return;

    const raycaster = new THREE.Raycaster();
    // Screen center raycast
    raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);

    const hitTargets: SniperTarget[] = [];
    targetsRef.current.forEach((t) => {
      if (t.isDead) return;
      const intersects = raycaster.intersectObjects(t.mesh.children, true);
      if (intersects.length > 0) {
        hitTargets.push(t);
      }
    });

    if (hitTargets.length > 0) {
      const hit = hitTargets[0];
      if (hit.type === 'hostage') {
        // Failed: Shot civilian hostage!
        hit.isDead = true;
        setGameState('mission_failed');
        sound.playScore();
        return;
      }

      // Successful Hit on Target!
      hit.health -= (hit.type === 'boss' ? 100 : 100);
      sound.playWin();

      if (hit.health <= 0) {
        hit.isDead = true;
        sceneRef.current.remove(hit.mesh);
        setHeadshots((h) => h + 1);
        setTotalScore((s) => s + 500);

        const remaining = targetsRef.current.filter((t) => !t.isDead && t.type !== 'hostage').length;
        setTargetsLeft(remaining);

        if (remaining <= 0) {
          // Mission Victory!
          setGameState('mission_cleared');
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          const reward = MISSIONS[missionIndex]?.reward || 300;
          setCoins((c) => {
            const next = c + reward;
            localStorage.setItem('sniper_coins', next.toString());
            return next;
          });
        }
      }
    }

    // Auto reload if out of ammo
    if (ammo === 1) {
      setTimeout(handleReload, 400);
    }
  }, [ammo, gameState, handleReload, isReloading, missionIndex]);

  // Three.js 3D Initialization
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 560;
    const height = container.clientHeight || 560;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.003);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50 / zoomLevel, width / height, 0.5, 1000);
    camera.position.set(0, 15, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight.position.set(20, 60, 20);
    scene.add(dirLight);

    const searchLight = new THREE.PointLight(0x00f0ff, 2, 300);
    searchLight.position.set(0, 30, -100);
    scene.add(searchLight);

    // 5. Build Futuristic Cityscape & Military Compound
    // Ground Grid
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.MeshStandardMaterial({ color: 0x090e1a, roughness: 0.8 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Rooftops & Cyber Towers
    for (let i = 0; i < 35; i++) {
      const bH = 20 + Math.random() * 50;
      const bW = 18 + Math.random() * 25;
      const bMesh = new THREE.Mesh(
        new THREE.BoxGeometry(bW, bH, bW),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 })
      );
      const angle = (i / 35) * Math.PI * 2;
      const radius = 100 + Math.random() * 80;
      bMesh.position.set(Math.cos(angle) * radius, bH / 2, Math.sin(angle) * radius - 80);
      scene.add(bMesh);
    }

    // Player Sniper Vantage Platform
    const vantageMesh = new THREE.Mesh(
      new THREE.BoxGeometry(20, 14, 20),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    vantageMesh.position.set(0, 7, 0);
    scene.add(vantageMesh);

    // 6. 60 FPS Render Loop
    let isRunning = true;
    let lastT = performance.now();

    const tick = (now: number) => {
      if (!isRunning) return;
      const dt = Math.min((now - lastT) / 1000, 0.06);
      lastT = now;

      // Update Camera Aim & Wobble
      if (cameraRef.current) {
        const aim = aimRef.current;
        aim.wobblePhase += dt * (isHoldingBreath ? 0.4 : 2.2);
        const wobbleAmount = isHoldingBreath ? 0.0008 : 0.004;
        const wobbleX = Math.sin(aim.wobblePhase * 1.5) * wobbleAmount;
        const wobbleY = Math.cos(aim.wobblePhase * 2.1) * wobbleAmount;

        const effectivePitch = aim.pitch + wobbleY;
        const effectiveYaw = aim.yaw + wobbleX;

        cameraRef.current.rotation.set(effectivePitch, effectiveYaw, 0, 'YXZ');
      }

      // Animate Targets (Patrol Back and forth)
      targetsRef.current.forEach((t) => {
        if (t.isDead || t.speed === 0) return;
        t.mesh.position.x += t.speed * t.dir * dt;
        if (t.mesh.position.x > t.targetX) {
          t.dir = -1;
        } else if (t.mesh.position.x < t.startX) {
          t.dir = 1;
        }
      });

      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      requestAnimationFrame(tick);
    };

    const animId = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [isHoldingBreath, zoomLevel]);

  // Timer Tick
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setGameState('mission_failed');
          return 0;
        }
        return t - 1;
      });

      // Breath meter recharge / drain
      if (isHoldingBreath) {
        setBreathMeter((b) => {
          if (b <= 5) {
            setIsHoldingBreath(false);
            return 0;
          }
          return b - 15;
        });
      } else {
        setBreathMeter((b) => Math.min(100, b + 10));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, isHoldingBreath]);

  // Pointer / Mouse Drag to Aim
  const handlePointerDown = (e: React.PointerEvent) => {
    aimRef.current.isDragging = true;
    aimRef.current.dragStartX = e.clientX;
    aimRef.current.dragStartY = e.clientY;
    aimRef.current.startYaw = aimRef.current.yaw;
    aimRef.current.startPitch = aimRef.current.pitch;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!aimRef.current.isDragging) return;
    const sensitivity = 0.0018 / (zoomLevel / 2);
    const dx = e.clientX - aimRef.current.dragStartX;
    const dy = e.clientY - aimRef.current.dragStartY;

    aimRef.current.yaw = aimRef.current.startYaw - dx * sensitivity;
    aimRef.current.pitch = Math.max(-0.4, Math.min(0.4, aimRef.current.startPitch - dy * sensitivity));
  };

  const handlePointerUp = () => {
    aimRef.current.isDragging = false;
  };

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ShiftLeft') {
        setIsHoldingBreath(true);
      }
      if (e.code === 'KeyR') {
        handleReload();
      }
      if (e.code === 'Digit1') setZoomLevel(2);
      if (e.code === 'Digit2') setZoomLevel(4);
      if (e.code === 'Digit3') setZoomLevel(8);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ShiftLeft') {
        setIsHoldingBreath(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleReload]);

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center select-none font-sans">
      {/* 1. TOP TACTICAL HUD OUTSIDE 3D CANVASES */}
      <div className="w-full mb-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-slate-800 text-white backdrop-blur-md shadow-xl flex items-center justify-between gap-2">
        {/* Mission Name & Timer */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">TARGETS REMAINING</div>
            <div className="text-base sm:text-lg font-black text-rose-400 font-mono">
              {targetsLeft} <span className="text-xs text-slate-400 font-sans">LEFT</span>
            </div>
          </div>
        </div>

        {/* Time Limit */}
        <div className="text-center">
          <div className="text-[10px] uppercase font-bold text-slate-400">MISSION TIMER</div>
          <div className={`text-base sm:text-lg font-black font-mono ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`}>
            00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
          </div>
        </div>

        {/* Ammo Magazine */}
        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">AMMO CLIP</div>
            <div className="text-sm sm:text-base font-black text-cyan-300 font-mono">
              {isReloading ? 'RELOADING...' : `${ammo} / 5`}
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black">
            🪙 {coins}
          </div>
        </div>
      </div>

      {/* 2. 3D SNIPER SCOPE VIEWPORT */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/10] rounded-3xl overflow-hidden border-2 border-slate-800 bg-[#020617] shadow-2xl shadow-cyan-950/40 touch-none">
        {/* 3D Canvas */}
        <div
          ref={mountRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full block cursor-crosshair touch-none"
        />

        {/* TACTICAL SNIPER SCOPE OVERLAY (Crosshair & Mil-dots) */}
        {gameState === 'playing' && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            {/* Dark Scope Vignette Circle */}
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border-2 border-cyan-500/60 shadow-[0_0_0_9999px_rgba(2,6,23,0.85)] flex items-center justify-center relative">
              {/* Center Crosshairs */}
              <div className="absolute w-full h-[1px] bg-cyan-400/80" />
              <div className="absolute h-full w-[1px] bg-cyan-400/80" />

              {/* Mil-dot graduation tick marks */}
              <div className="absolute w-2 h-2 rounded-full border border-rose-500/80 bg-rose-500/20" />
              <div className="absolute w-12 h-[1px] bg-cyan-300/80 -translate-y-8" />
              <div className="absolute w-12 h-[1px] bg-cyan-300/80 translate-y-8" />
              <div className="absolute h-12 w-[1px] bg-cyan-300/80 -translate-x-8" />
              <div className="absolute h-12 w-[1px] bg-cyan-300/80 translate-x-8" />

              {/* Rangefinder Laser Stats */}
              <div className="absolute bottom-6 left-6 text-[10px] font-mono text-cyan-400 font-bold bg-slate-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                DIST: 185m • {zoomLevel}X
              </div>

              {/* Wind Gauge Indicator */}
              <div className="absolute bottom-6 right-6 text-[10px] font-mono text-amber-300 font-bold bg-slate-950/80 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                <Wind className="w-3 h-3" /> {MISSIONS[missionIndex]?.windSpeed || 4} m/s ➔
              </div>
            </div>
          </div>
        )}

        {/* Steady Breath Bar */}
        {gameState === 'playing' && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-950/80 border border-slate-700 px-3 py-1 rounded-xl backdrop-blur-md">
            <span className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
              <Eye className="w-3 h-3" /> STEADY BREATH
            </span>
            <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${breathMeter < 30 ? 'bg-rose-500' : 'bg-cyan-400'}`}
                style={{ width: `${breathMeter}%` }}
              />
            </div>
          </div>
        )}

        {/* Mute Button */}
        <button
          onClick={() => {
            const isMute = sound.toggleMute();
            setMuted(isMute);
          }}
          className="absolute top-3 right-3 p-2 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-300 hover:text-white z-20"
        >
          {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>

        {/* 3. MISSION BRIEFING SCREEN OVERLAY */}
        {gameState === 'briefing' && (
          <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md flex flex-col items-center justify-between p-5 sm:p-6 text-center z-30 animate-fade-in">
            <div className="space-y-1.5 mt-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-rose-500 via-red-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/40 animate-bounce">
                <Crosshair className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                SNIPER ELITE 3D: <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300">TACTICAL MARKSMAN</span>
              </h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Take vantage position, calibrate wind drift, hold steady breath, and eliminate high-value hostile targets!
              </p>
            </div>

            {/* Mission Selector */}
            <div className="w-full max-w-sm space-y-1.5">
              <div className="text-xs font-bold text-slate-400 text-left">SELECT CONTRACT:</div>
              <div className="grid grid-cols-5 gap-1.5">
                {MISSIONS.map((m, idx) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      sound.playClick();
                      setupMission(idx);
                    }}
                    className={`py-2 rounded-xl flex flex-col items-center font-bold text-xs border transition-all ${
                      missionIndex === idx
                        ? 'border-rose-400 bg-rose-950/80 text-rose-300 shadow-lg shadow-rose-500/30 scale-105'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>M{m.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Mission Briefing Box */}
            <div className="w-full max-w-sm p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-left space-y-1">
              <div className="text-xs font-black text-cyan-300">{MISSIONS[missionIndex]?.title}</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">{MISSIONS[missionIndex]?.brief}</p>
            </div>

            {/* Accept Contract / Play Button */}
            <button
              onClick={() => {
                sound.playClick();
                setupMission(missionIndex);
              }}
              className="w-full max-w-sm py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-sm sm:text-base shadow-xl shadow-rose-600/40 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>ACCEPT CONTRACT</span>
            </button>
          </div>
        )}

        {/* 4. MISSION FAILED OVERLAY */}
        {gameState === 'mission_failed' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center z-30 space-y-3 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white">MISSION COMPROMISED</h3>
              <p className="text-xs text-slate-400 mt-0.5">Hostile escaped or civilian casualty occurred.</p>
            </div>
            <button
              onClick={() => setupMission(missionIndex)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-black text-xs sm:text-sm shadow-lg flex items-center gap-1.5 hover:scale-105 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> RETRY CONTRACT
            </button>
          </div>
        )}

        {/* 5. MISSION CLEARED OVERLAY */}
        {gameState === 'mission_cleared' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center z-30 space-y-3 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-2xl shadow-emerald-500/40 animate-bounce">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">ALL TARGETS ELIMINATED</div>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">CONTRACT COMPLETED!</h3>
              <p className="text-xs text-cyan-300 font-bold mt-1">
                Reward: 🪙 +{MISSIONS[missionIndex]?.reward} Coins • Accuracy 100%
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setupMission((missionIndex + 1) % MISSIONS.length)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs sm:text-sm shadow-lg flex items-center gap-1.5 hover:scale-105 transition-all"
              >
                NEXT CONTRACT <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGameState('briefing')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-all"
              >
                MENU
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. TACTICAL SNIPER CONTROLS OUTSIDE 3D BOX */}
      <div className="w-full mt-2 grid grid-cols-3 gap-2">
        {/* Scope Zoom Toggles (2x, 4x, 8x) */}
        <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          {([2, 4, 8] as const).map((z) => (
            <button
              key={z}
              onClick={() => {
                sound.playClick();
                setZoomLevel(z);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                zoomLevel === z
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {z}X
            </button>
          ))}
        </div>

        {/* Steady Breath Hold Button */}
        <button
          onPointerDown={() => setIsHoldingBreath(true)}
          onPointerUp={() => setIsHoldingBreath(false)}
          onPointerLeave={() => setIsHoldingBreath(false)}
          className={`py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-all ${
            isHoldingBreath
              ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-400/40 scale-95'
              : 'bg-slate-900 border-slate-800 text-cyan-300 active:bg-cyan-950'
          }`}
        >
          <Eye className="w-4 h-4" /> STEADY BREATH
        </button>

        {/* Big Trigger Fire Button */}
        <button
          onClick={handleShoot}
          disabled={isReloading}
          className="py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 active:scale-95 text-white font-black text-sm sm:text-base flex items-center justify-center gap-1.5 shadow-xl shadow-rose-600/40 disabled:opacity-50"
        >
          <Target className="w-5 h-5" /> FIRE SHOT!
        </button>
      </div>
    </div>
  );
};
