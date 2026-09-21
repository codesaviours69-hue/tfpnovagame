import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Crown,
  Sparkles,
  Flag,
  Target,
  ChevronLeft,
  ChevronRight,
  Zap,
  Navigation,
  Grid,
  Lock,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface HoleConfig {
  id: number;
  name: string;
  par: number;
  startPos: [number, number]; // [x, z]
  cupPos: [number, number];   // [x, z]
  obstacles: { type: 'box' | 'cylinder' | 'bumper'; x: number; z: number; w?: number; l?: number; r?: number; color: number }[];
  walls: { x: number; z: number; w: number; l: number }[];
}

// 9 FUN, AUTHENTIC & HIGHLY PLAYABLE 3D MINI-GOLF HOLES
const HOLES: HoleConfig[] = [
  {
    id: 1,
    name: 'Green Fairway Straight',
    par: 2,
    startPos: [0, 8],
    cupPos: [0, -8],
    obstacles: [
      { type: 'bumper', x: -2.2, z: 0, r: 0.8, color: 0xf43f5e },
      { type: 'bumper', x: 2.2, z: 0, r: 0.8, color: 0xf43f5e },
    ],
    walls: [
      { x: -5, z: 0, w: 0.4, l: 20 },
      { x: 5, z: 0, w: 0.4, l: 20 },
      { x: 0, z: -10, w: 10.4, l: 0.4 },
      { x: 0, z: 10, w: 10.4, l: 0.4 },
    ],
  },
  {
    id: 2,
    name: 'Emerald Dogleg Corner',
    par: 3,
    startPos: [-2.5, 8],
    cupPos: [2.5, -8],
    obstacles: [
      { type: 'bumper', x: -2.0, z: 2.0, r: 0.85, color: 0x0284c7 },
      { type: 'bumper', x: 2.0, z: -2.0, r: 0.85, color: 0xfacc15 },
    ],
    walls: [
      { x: -5.5, z: 0, w: 0.4, l: 20 },
      { x: 5.5, z: 0, w: 0.4, l: 20 },
      { x: 0, z: -10, w: 11.4, l: 0.4 },
      { x: 0, z: 10, w: 11.4, l: 0.4 },
    ],
  },
  {
    id: 3,
    name: 'Pro Slalom Gauntlet',
    par: 3,
    startPos: [0, 8],
    cupPos: [0, -8],
    obstacles: [
      { type: 'bumper', x: -2.2, z: 3.5, r: 0.8, color: 0xf43f5e },
      { type: 'bumper', x: 2.2, z: -1.0, r: 0.8, color: 0x10b981 },
      { type: 'bumper', x: -2.2, z: -4.5, r: 0.8, color: 0xa855f7 },
    ],
    walls: [
      { x: -5.5, z: 0, w: 0.4, l: 20 },
      { x: 5.5, z: 0, w: 0.4, l: 20 },
      { x: 0, z: -10, w: 11.4, l: 0.4 },
      { x: 0, z: 10, w: 11.4, l: 0.4 },
    ],
  },
  {
    id: 4,
    name: 'Championship Split Citadel',
    par: 4,
    startPos: [0, 8.5],
    cupPos: [0, -8.5],
    obstacles: [
      { type: 'box', x: -3.5, z: 0, w: 1.6, l: 6.0, color: 0x0284c7 },
      { type: 'box', x: 3.5, z: 0, w: 1.6, l: 6.0, color: 0x0284c7 },
      { type: 'bumper', x: 0, z: 0, r: 0.75, color: 0xfacc15 },
    ],
    walls: [
      { x: -6, z: 0, w: 0.4, l: 21 },
      { x: 6, z: 0, w: 0.4, l: 21 },
      { x: 0, z: -10.5, w: 12.4, l: 0.4 },
      { x: 0, z: 10.5, w: 12.4, l: 0.4 },
    ],
  },
  {
    id: 5,
    name: 'Volcano Bumper Loop',
    par: 3,
    startPos: [0, 8.5],
    cupPos: [0, -8.5],
    obstacles: [
      { type: 'bumper', x: -2.5, z: 1.5, r: 0.8, color: 0xef4444 },
      { type: 'bumper', x: 2.5, z: 1.5, r: 0.8, color: 0xef4444 },
      { type: 'bumper', x: 0, z: -3.5, r: 0.85, color: 0x3b82f6 },
    ],
    walls: [
      { x: -6, z: 0, w: 0.4, l: 21 },
      { x: 6, z: 0, w: 0.4, l: 21 },
      { x: 0, z: -10.5, w: 12.4, l: 0.4 },
      { x: 0, z: 10.5, w: 12.4, l: 0.4 },
    ],
  },
  {
    id: 6,
    name: 'Twin Pillars Pass',
    par: 3,
    startPos: [0, 8.5],
    cupPos: [0, -8.5],
    obstacles: [
      { type: 'box', x: -3.5, z: 0, w: 2.0, l: 4.0, color: 0x10b981 },
      { type: 'box', x: 3.5, z: 0, w: 2.0, l: 4.0, color: 0x10b981 },
      { type: 'bumper', x: 0, z: -4.5, r: 0.75, color: 0xf43f5e },
    ],
    walls: [
      { x: -6, z: 0, w: 0.4, l: 21 },
      { x: 6, z: 0, w: 0.4, l: 21 },
      { x: 0, z: -10.5, w: 12.4, l: 0.4 },
      { x: 0, z: 10.5, w: 12.4, l: 0.4 },
    ],
  },
  {
    id: 7,
    name: 'Bumper Pinball Alley',
    par: 4,
    startPos: [0, 8.5],
    cupPos: [0, -8.5],
    obstacles: [
      { type: 'bumper', x: -2.2, z: 4.0, r: 0.75, color: 0x8b5cf6 },
      { type: 'bumper', x: 2.2, z: 4.0, r: 0.75, color: 0x8b5cf6 },
      { type: 'bumper', x: 0, z: 0, r: 0.85, color: 0xfacc15 },
      { type: 'bumper', x: -2.2, z: -4.0, r: 0.75, color: 0xec4899 },
      { type: 'bumper', x: 2.2, z: -4.0, r: 0.75, color: 0xec4899 },
    ],
    walls: [
      { x: -5.5, z: 0, w: 0.4, l: 21 },
      { x: 5.5, z: 0, w: 0.4, l: 21 },
      { x: 0, z: -10.5, w: 11.4, l: 0.4 },
      { x: 0, z: 10.5, w: 11.4, l: 0.4 },
    ],
  },
  {
    id: 8,
    name: 'The Fortress Maze',
    par: 4,
    startPos: [-2.5, 8.5],
    cupPos: [2.5, -8.5],
    obstacles: [
      { type: 'bumper', x: 0, z: 3.5, r: 0.85, color: 0x0284c7 },
      { type: 'bumper', x: -2.5, z: 0, r: 0.8, color: 0x10b981 },
      { type: 'bumper', x: 2.5, z: -3.5, r: 0.8, color: 0x0284c7 },
    ],
    walls: [
      { x: -6, z: 0, w: 0.4, l: 21 },
      { x: 6, z: 0, w: 0.4, l: 21 },
      { x: 0, z: -10.5, w: 12.4, l: 0.4 },
      { x: 0, z: 10.5, w: 12.4, l: 0.4 },
    ],
  },
  {
    id: 9,
    name: 'Grand Masters Championship',
    par: 5,
    startPos: [0, 9.0],
    cupPos: [0, -9.0],
    obstacles: [
      { type: 'bumper', x: -2.5, z: 4.5, r: 0.8, color: 0x059669 },
      { type: 'bumper', x: 2.5, z: -4.5, r: 0.8, color: 0x059669 },
      { type: 'bumper', x: 0, z: 0, r: 0.9, color: 0xf59e0b },
    ],
    walls: [
      { x: -6, z: 0, w: 0.4, l: 22 },
      { x: 6, z: 0, w: 0.4, l: 22 },
      { x: 0, z: -11.0, w: 12.4, l: 0.4 },
      { x: 0, z: 11.0, w: 12.4, l: 0.4 },
    ],
  },
];

export const CyberNeonGolf3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Unlocked Level Persistence State (Level 0 is Level 1, unlocked by default)
  const [unlockedLevelIdx, setUnlockedLevelIdx] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('putt_master_unlocked_level');
      return saved ? Math.max(0, parseInt(saved, 10)) : 0;
    } catch {
      return 0;
    }
  });

  // Match State
  const [gameState, setGameState] = useState<'menu' | 'aiming' | 'rolling' | 'holed' | 'gameover'>('menu');
  const [currentHoleIdx, setCurrentHoleIdx] = useState<number>(0);
  const [strokes, setStrokes] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [power, setPower] = useState<number>(85);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aimAngleState, setAimAngleState] = useState<number>(-Math.PI / 2);
  const [showLevelMenu, setShowLevelMenu] = useState<boolean>(false);

  const curHole = HOLES[currentHoleIdx];

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1800);
  }, []);

  // Unlock next level and save to localStorage
  const unlockNextLevel = useCallback((completedIdx: number) => {
    const nextLevel = completedIdx + 1;
    setUnlockedLevelIdx((prev) => {
      const newMax = Math.max(prev, nextLevel);
      try {
        localStorage.setItem('putt_master_unlocked_level', newMax.toString());
      } catch {
        // Fallback
      }
      return newMax;
    });
  }, []);

  // Aiming Drag Ref
  const dragRef = useRef<{
    isDragging: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    aimAngle: number;
    power: number;
  }>({
    isDragging: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    aimAngle: -Math.PI / 2,
    power: 85,
  });

  // Three.js Engine Ref
  const engineRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    gameState: 'menu' | 'aiming' | 'rolling' | 'holed' | 'gameover';

    ball: { x: number; z: number; vx: number; vz: number; radius: number; mesh: THREE.Mesh; light: THREE.PointLight };
    cup: { x: number; z: number; mesh: THREE.Group };
    aimLine: THREE.Line;
    obstacles: { type: 'box' | 'cylinder' | 'bumper'; x: number; z: number; w?: number; l?: number; r?: number; mesh: THREE.Mesh }[];
    walls: { x: number; z: number; w: number; l: number; mesh: THREE.Mesh }[];
    particles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number }[];
  }>({
    scene: null,
    camera: null,
    renderer: null,
    gameState: 'menu',

    ball: { x: 0, z: 8, vx: 0, vz: 0, radius: 0.35, mesh: new THREE.Mesh(), light: new THREE.PointLight() },
    cup: { x: 0, z: -8, mesh: new THREE.Group() },
    aimLine: new THREE.Line(),
    obstacles: [],
    walls: [],
    particles: [],
  });

  // UPDATE AIM GUIDE LINE
  const updateAimGuide = useCallback((angle: number, pwrPercent: number) => {
    const eng = engineRef.current;
    if (!eng.aimLine) return;

    const startX = eng.ball.x;
    const startZ = eng.ball.z;
    const dist = (pwrPercent / 100) * 15 + 5;

    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);

    const endX = startX + dirX * dist;
    const endZ = startZ + dirZ * dist;

    const lineGeo = eng.aimLine.geometry as THREE.BufferGeometry;
    const positions = new Float32Array([
      startX, 0.35, startZ,
      endX, 0.35, endZ,
    ]);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    lineGeo.attributes.position.needsUpdate = true;
    eng.aimLine.visible = true;
  }, []);

  // ACCURATE AUTO-AIM CUP HELPER
  const autoAimCup = useCallback(() => {
    const eng = engineRef.current;
    const dx = eng.cup.x - eng.ball.x;
    const dz = eng.cup.z - eng.ball.z;
    const angle = Math.atan2(dz, dx);

    dragRef.current.aimAngle = angle;
    dragRef.current.power = 85;
    setAimAngleState(angle);
    setPower(85);
    updateAimGuide(angle, 85);
    showToast('🎯 AIM ALIGNED TO CUP!');
  }, [showToast, updateAimGuide]);

  // BUILD HOLE SCENE
  const loadHole = useCallback((hIdx: number) => {
    const eng = engineRef.current;
    if (!eng.scene) return;

    const hole = HOLES[hIdx];

    // Clean old obstacles & walls
    eng.obstacles.forEach((o) => eng.scene?.remove(o.mesh));
    eng.walls.forEach((w) => eng.scene?.remove(w.mesh));
    eng.obstacles = [];
    eng.walls = [];

    // Position Ball
    eng.ball.x = hole.startPos[0];
    eng.ball.z = hole.startPos[1];
    eng.ball.vx = 0;
    eng.ball.vz = 0;
    eng.ball.mesh.position.set(eng.ball.x, 0.35, eng.ball.z);

    // Position Cup & Flag
    eng.cup.x = hole.cupPos[0];
    eng.cup.z = hole.cupPos[1];
    eng.cup.mesh.position.set(eng.cup.x, 0, eng.cup.z);

    // Build Crisp White & Emerald Walls
    hole.walls.forEach((w) => {
      const geo = new THREE.BoxGeometry(w.w, 0.65, w.l);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.15,
        metalness: 0.85,
        emissive: 0x059669,
        emissiveIntensity: 0.35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(w.x, 0.32, w.z);
      eng.scene?.add(mesh);
      eng.walls.push({ ...w, mesh });
    });

    // Build Obstacles
    hole.obstacles.forEach((o) => {
      let geo: THREE.BufferGeometry;
      if (o.type === 'bumper') {
        geo = new THREE.CylinderGeometry(o.r || 0.8, o.r || 0.8, 0.7, 16);
      } else if (o.type === 'box') {
        geo = new THREE.BoxGeometry(o.w || 2, 0.7, o.l || 2);
      } else {
        geo = new THREE.CylinderGeometry(o.r || 0.8, o.r || 0.8, 0.7, 16);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: o.color,
        roughness: 0.15,
        metalness: 0.85,
        emissive: o.color,
        emissiveIntensity: 0.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(o.x, 0.35, o.z);
      eng.scene?.add(mesh);
      eng.obstacles.push({ ...o, mesh });
    });

    // Calculate default aim angle to cup
    const initialDx = hole.cupPos[0] - hole.startPos[0];
    const initialDz = hole.cupPos[1] - hole.startPos[1];
    const initAngle = Math.atan2(initialDz, initialDx);

    dragRef.current.aimAngle = initAngle;
    dragRef.current.power = 85;
    setAimAngleState(initAngle);
    setPower(85);

    setStrokes(0);
    setGameState('aiming');
    eng.gameState = 'aiming';

    setTimeout(() => updateAimGuide(initAngle, 85), 50);
  }, [updateAimGuide]);

  // Select Level / Hole directly
  const selectLevel = (hIdx: number) => {
    if (hIdx > unlockedLevelIdx) {
      sound.playClick();
      showToast(`🔒 LEVEL ${hIdx + 1} IS LOCKED! COMPLETE LEVEL ${hIdx} FIRST.`);
      return;
    }
    sound.playClick();
    setCurrentHoleIdx(hIdx);
    setShowLevelMenu(false);
    loadHole(hIdx);
    showToast(`⛳ LEVEL ${hIdx + 1}: ${HOLES[hIdx].name}`);
  };

  // SPAWN COLLISION VFX PARTICLES
  const spawnHitVFX = useCallback((x: number, y: number, z: number, colorHex: number) => {
    const eng = engineRef.current;
    if (!eng.scene) return;

    const pGeo = new THREE.SphereGeometry(0.09, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: colorHex });

    for (let i = 0; i < 12; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(x, y, z);
      eng.scene.add(p);

      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 4;

      eng.particles.push({
        mesh: p,
        vx: Math.cos(ang) * spd,
        vy: 1 + Math.random() * 3,
        vz: Math.sin(ang) * spd,
        life: 0.35,
        maxLife: 0.35,
      });
    }
  }, []);

  // PUTT STROKE ACTION
  const puttBall = useCallback((aimAngle: number, strokePower: number) => {
    const eng = engineRef.current;
    if (eng.gameState !== 'aiming') return;

    const speed = (strokePower / 100) * 34 + 10;
    eng.ball.vx = Math.cos(aimAngle) * speed;
    eng.ball.vz = Math.sin(aimAngle) * speed;

    sound.playHit();
    eng.aimLine.visible = false;
    eng.gameState = 'rolling';
    setGameState('rolling');
    setStrokes((prev) => prev + 1);
    setTotalScore((prev) => prev + 1);
  }, []);

  // POINTER DRAG AIMING
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'aiming') return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {
      // Fallback
    }
    dragRef.current.isDragging = true;
    dragRef.current.pointerId = e.pointerId;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging || gameState !== 'aiming') return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const dist = Math.hypot(dx, dy);

    const aimAngle = Math.atan2(-dy, -dx);
    const pwr = Math.min(100, Math.max(10, dist * 0.9));

    dragRef.current.aimAngle = aimAngle;
    dragRef.current.power = pwr;
    setAimAngleState(aimAngle);
    setPower(Math.round(pwr));

    updateAimGuide(aimAngle, pwr);
  };

  const handlePointerUp = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging) return;
    if (e && e.currentTarget && dragRef.current.pointerId !== null) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(dragRef.current.pointerId);
      } catch (err) {
        // Fallback
      }
    }

    dragRef.current.isDragging = false;
    dragRef.current.pointerId = null;

    if (dragRef.current.power >= 5) {
      puttBall(dragRef.current.aimAngle, dragRef.current.power);
    }
  };

  const rotateAim = (deltaRad: number) => {
    if (gameState !== 'aiming') return;
    const newAngle = aimAngleState + deltaRad;
    dragRef.current.aimAngle = newAngle;
    setAimAngleState(newAngle);
    updateAimGuide(newAngle, power);
  };

  // INITIALIZE THREE.JS SCENE
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.008);

    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(aspect < 1.0 ? 54 : 44, aspect, 0.1, 1000);
    camera.position.set(0, 24, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current || undefined,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const ambient = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x15803d, 1.0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(15, 35, 20);
    scene.add(dirLight);

    const greenGeo = new THREE.PlaneGeometry(16, 24);
    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.45,
      metalness: 0.05,
    });
    const green = new THREE.Mesh(greenGeo, greenMat);
    green.rotation.x = -Math.PI / 2;
    scene.add(green);

    const outerGeo = new THREE.PlaneGeometry(36, 44);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      roughness: 0.6,
    });
    const outerPlane = new THREE.Mesh(outerGeo, outerMat);
    outerPlane.position.y = -0.01;
    outerPlane.rotation.x = -Math.PI / 2;
    scene.add(outerPlane);

    const grid = new THREE.GridHelper(24, 16, 0x10b981, 0x94a3b8);
    grid.position.y = 0.005;
    scene.add(grid);

    const bGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const bMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x10b981,
      emissiveIntensity: 0.3,
    });
    const bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.position.set(0, 0.35, 8);
    scene.add(bMesh);

    const bLight = new THREE.PointLight(0x10b981, 2.0, 5);
    bMesh.add(bLight);

    const cupGroup = new THREE.Group();
    const cupRim = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.1, 16), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    cupRim.position.y = 0.05;
    cupGroup.add(cupRim);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    pole.position.y = 1.4;
    cupGroup.add(pole);

    const flagGeo = new THREE.PlaneGeometry(0.8, 0.5);
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.4, 2.4, 0);
    cupGroup.add(flag);

    scene.add(cupGroup);

    const lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x0284c7,
      dashSize: 0.4,
      gapSize: 0.2,
      linewidth: 3,
    });
    const aimLine = new THREE.Line(lineGeo, lineMat);
    aimLine.visible = false;
    scene.add(aimLine);

    engineRef.current.scene = scene;
    engineRef.current.camera = camera;
    engineRef.current.renderer = renderer;
    engineRef.current.ball = { x: 0, z: 8, vx: 0, vz: 0, radius: 0.35, mesh: bMesh, light: bLight };
    engineRef.current.cup = { x: 0, z: -8, mesh: cupGroup };
    engineRef.current.aimLine = aimLine;

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

      if (eng.gameState === 'rolling') {
        const b = eng.ball;
        b.x += b.vx * dt;
        b.z += b.vz * dt;

        const friction = Math.pow(0.93, dt * 60);
        b.vx *= friction;
        b.vz *= friction;

        b.mesh.position.set(b.x, 0.35, b.z);

        // Outer Wall Collisions
        eng.walls.forEach((w) => {
          const halfW = w.w / 2 + b.radius;
          const halfL = w.l / 2 + b.radius;

          if (Math.abs(b.x - w.x) < halfW && Math.abs(b.z - w.z) < halfL) {
            if (w.w < w.l) {
              b.vx *= -0.90;
              b.x = w.x + (b.x > w.x ? halfW : -halfW);
            } else {
              b.vz *= -0.90;
              b.z = w.z + (b.z > w.z ? halfL : -halfL);
            }
            sound.playClick();
            spawnHitVFX(b.x, 0.35, b.z, 0x10b981);
          }
        });

        // Obstacle Collisions
        eng.obstacles.forEach((o) => {
          if (o.type === 'bumper') {
            const radSum = (o.r || 0.8) + b.radius;
            const dist = Math.hypot(b.x - o.x, b.z - o.z);

            if (dist < radSum) {
              const nx = (b.x - o.x) / dist;
              const nz = (b.z - o.z) / dist;

              const speed = Math.hypot(b.vx, b.vz) * 1.3 + 3.0;
              b.vx = nx * speed;
              b.vz = nz * speed;
              b.x = o.x + nx * radSum;
              b.z = o.z + nz * radSum;

              sound.playLaser();
              spawnHitVFX(b.x, 0.35, b.z, o.color);
            }
          } else if (o.type === 'box') {
            const halfW = (o.w || 2) / 2 + b.radius;
            const halfL = (o.l || 2) / 2 + b.radius;

            const dx = Math.abs(b.x - o.x);
            const dz = Math.abs(b.z - o.z);

            if (dx < halfW && dz < halfL) {
              const overlapX = halfW - dx;
              const overlapZ = halfL - dz;

              if (overlapX < overlapZ) {
                b.vx *= -0.90;
                b.x = o.x + (b.x > o.x ? halfW : -halfW);
              } else {
                b.vz *= -0.90;
                b.z = o.z + (b.z > o.z ? halfL : -halfL);
              }

              sound.playClick();
              spawnHitVFX(b.x, 0.35, b.z, o.color);
            }
          }
        });

        // UNCONDITIONAL GUARANTEED HOLE SINKING & MAGNETIC PULL
        const distToCup = Math.hypot(b.x - eng.cup.x, b.z - eng.cup.z);

        // Funnel attraction when ball rolls near hole
        if (distToCup < 3.2) {
          const pullFactor = 16.0 * (1.0 - distToCup / 3.2) * dt;
          b.vx += (eng.cup.x - b.x) * pullFactor;
          b.vz += (eng.cup.z - b.z) * pullFactor;
        }

        // Guaranteed hole-in whenever ball reaches within 1.6 units of cup (NO SPEED RESTRICTION!)
        if (distToCup < 1.6) {
          b.vx = 0;
          b.vz = 0;
          b.x = eng.cup.x;
          b.z = eng.cup.z;
          b.mesh.position.set(b.x, 0.1, b.z);

          sound.playWin();
          confetti({ particleCount: 160, spread: 80 });
          showToast('⛳ HOLED! GREAT SHOT!');

          unlockNextLevel(currentHoleIdx);

          eng.gameState = 'holed';
          setGameState('holed');
          return;
        }

        const ballSpeed = Math.hypot(b.vx, b.vz);
        if (ballSpeed < 0.15) {
          b.vx = 0;
          b.vz = 0;
          eng.gameState = 'aiming';
          setGameState('aiming');

          setTimeout(() => {
            const dx = eng.cup.x - b.x;
            const dz = eng.cup.z - b.z;
            const newAngle = Math.atan2(dz, dx);
            dragRef.current.aimAngle = newAngle;
            setAimAngleState(newAngle);
            updateAimGuide(newAngle, dragRef.current.power);
          }, 50);
        }
      }

      eng.renderer.render(eng.scene, eng.camera);
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    const handleResize = () => {
      if (!mountRef.current || !engineRef.current.renderer || !engineRef.current.camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      const asp = w / h;
      engineRef.current.camera.aspect = asp;
      engineRef.current.camera.fov = asp < 1.0 ? 54 : 44;
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
  }, [showToast, spawnHitVFX, updateAimGuide, unlockNextLevel, currentHoleIdx]);

  // Start Match
  const startMatch = () => {
    sound.playClick();
    setCurrentHoleIdx(0);
    setTotalScore(0);
    setStrokes(0);
    loadHole(0);
  };

  // Next Hole
  const nextHole = () => {
    sound.playClick();
    if (currentHoleIdx + 1 < HOLES.length) {
      const nextIdx = currentHoleIdx + 1;
      setCurrentHoleIdx(nextIdx);
      loadHole(nextIdx);
    } else {
      setGameState('gameover');
      engineRef.current.gameState = 'gameover';
    }
  };

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3.5 select-none font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP SCORE & HOLE HUD BAR                                               */}
      {/* ========================================================================= */}
      <div className="w-full flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-900 border border-emerald-500/40 backdrop-blur-md shadow-xl">
        {/* Hole # & Name */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => setShowLevelMenu(!showLevelMenu)}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-slate-950 border border-emerald-400/80 hover:border-emerald-300 text-center shadow-inner cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
            title="Click to select level"
          >
            <div>
              <div className="text-[8px] sm:text-[9px] font-black uppercase text-emerald-400 leading-none">LEVEL</div>
              <div className="text-lg sm:text-2xl font-black text-white font-mono leading-none mt-0.5">
                {currentHoleIdx + 1} / {HOLES.length}
              </div>
            </div>
            <Grid className="w-4 h-4 text-emerald-400 hidden sm:block ml-1" />
          </button>

          <div className="text-left">
            <div className="text-[10px] font-black uppercase text-amber-400">PAR {curHole.par}</div>
            <div className="text-xs font-bold text-slate-200 hidden sm:block">{curHole.name}</div>
          </div>
        </div>

        {/* Level Select & Auto-Aim Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLevelMenu(!showLevelMenu)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-emerald-400 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Grid className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">LEVELS</span>
          </button>

          <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-center">
            <div className="text-[8px] font-bold text-slate-400 uppercase leading-none">STROKES</div>
            <div className="text-xs sm:text-base font-black text-emerald-400 font-mono mt-0.5">{strokes}</div>
          </div>

          <button
            onClick={() => {
              const isMute = sound.toggleMute();
              setMuted(isMute);
            }}
            className="p-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-emerald-400 text-slate-300 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL SELECTOR MODAL WITH LOCK SYSTEM                                     */}
      {/* ========================================================================= */}
      {showLevelMenu && (
        <div className="p-4 rounded-2xl bg-slate-900 border-2 border-emerald-500/60 shadow-2xl space-y-3 z-30 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>SELECT GOLF LEVEL (COMPLETE LEVELS TO UNLOCK)</span>
            </div>
            <button
              onClick={() => setShowLevelMenu(false)}
              className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              ✕ CLOSE
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
            {HOLES.map((h, idx) => {
              const isUnlocked = idx <= unlockedLevelIdx;
              const isCurrent = currentHoleIdx === idx;
              const isPassed = idx < unlockedLevelIdx;

              return (
                <button
                  key={h.id}
                  onClick={() => selectLevel(idx)}
                  disabled={!isUnlocked}
                  className={`p-2.5 rounded-xl border text-center font-black transition-all ${
                    !isUnlocked
                      ? 'bg-slate-950/60 border-slate-800 text-slate-600 opacity-60 cursor-not-allowed'
                      : isCurrent
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/30 scale-105 cursor-pointer'
                      : isPassed
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50 cursor-pointer'
                      : 'bg-slate-950 text-slate-200 border-slate-700 hover:border-emerald-400 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="text-[9px] uppercase opacity-70">L{idx + 1}</span>
                    {!isUnlocked ? (
                      <Lock className="w-3 h-3 text-slate-500 ml-0.5" />
                    ) : isPassed ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-0.5" />
                    ) : null}
                  </div>
                  <div className="text-base font-mono mt-0.5">{idx + 1}</div>
                  <div className="text-[9px] text-amber-400">
                    {!isUnlocked ? 'LOCKED' : `PAR ${h.par}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 3D GOLF ARENA CANVAS                                                   */}
      {/* ========================================================================= */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        id="cyber-golf-arena"
        className="relative w-full h-[440px] sm:h-[520px] md:h-[600px] max-h-[70vh] bg-slate-100 rounded-2xl sm:rounded-3xl overflow-hidden select-none border-2 border-emerald-500 shadow-2xl touch-none outline-none cursor-crosshair"
      >
        {/* 3D WebGL Canvas */}
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Toast Message */}
        {toastMessage && (
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-2xl bg-slate-900/95 border border-emerald-400 text-emerald-300 font-bold text-xs tracking-wide shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-10">
            {toastMessage}
          </div>
        )}

        {/* MAIN MENU OVERLAY */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 z-20 bg-slate-950/92 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8 text-center space-y-4">
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border-2 border-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40 p-4">
              <Flag className="w-10 h-10 text-emerald-400 animate-pulse" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                3D MINI GOLF CHAMPIONSHIP (9 LEVELS)
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-300 mt-2 tracking-tight">
                PUTT MASTER 3D
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-md mx-auto">
                Complete each level to unlock the next! • 100% Guaranteed Hole Sinking • Smooth Mobile Aiming!
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={startMatch}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-500 to-amber-400 hover:scale-105 active:scale-95 text-slate-950 font-black text-base shadow-2xl shadow-emerald-500/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>START CHAMPIONSHIP</span>
              </button>

              <button
                onClick={() => setShowLevelMenu(true)}
                className="px-6 py-3.5 rounded-2xl bg-slate-900 border border-emerald-400/60 hover:border-emerald-300 text-emerald-300 font-black text-base shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Grid className="w-5 h-5" />
                <span>LEVEL SELECT</span>
              </button>
            </div>
          </div>
        )}

        {/* HOLE COMPLETED MODAL */}
        {gameState === 'holed' && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
              <Trophy className="w-9 h-9 text-emerald-400 animate-bounce" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-emerald-400 tracking-wider">
                {strokes === 1 ? '🌟 HOLE IN ONE!' : strokes <= curHole.par ? '🦅 BIRDIE / UNDER PAR!' : '⛳ HOLE COMPLETED'}
              </div>
              <h2 className="text-3xl font-black text-white mt-0.5">{curHole.name} (Level {currentHoleIdx + 1})</h2>
              {currentHoleIdx + 1 < HOLES.length && (
                <div className="text-xs font-bold text-emerald-300 mt-1 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>LEVEL {currentHoleIdx + 2} IS NOW UNLOCKED! 🔓</span>
                </div>
              )}
            </div>

            <div className="w-full max-w-xs p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Strokes Taken:</span>
                <span className="text-white font-mono text-xl font-black">{strokes} (Par {curHole.par})</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Total Championship Score:</span>
                <span className="text-amber-300 font-mono text-xl font-black">{totalScore}</span>
              </div>
            </div>

            <button
              onClick={nextHole}
              className="px-9 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-500 to-amber-400 active:scale-95 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/40 flex items-center justify-center gap-2 transition-all hover:scale-105 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{currentHoleIdx + 1 < HOLES.length ? `PLAY LEVEL ${currentHoleIdx + 2} ➔` : 'VIEW FINAL TROPHY 🏆'}</span>
            </button>
          </div>
        )}

        {/* TOURNAMENT COMPLETED MODAL */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-20 bg-slate-950/92 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30">
              <Crown className="w-9 h-9 text-amber-400 animate-bounce" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-amber-400 tracking-wider">ALL 9 LEVELS COMPLETED!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GRAND MASTERS CHAMPION</h2>
            </div>

            <div className="w-full max-w-xs p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Total Strokes across 9 Levels:</span>
                <span className="text-amber-300 font-mono text-2xl font-black">{totalScore} STROKES</span>
              </div>
            </div>

            <button
              onClick={startMatch}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-500 to-amber-400 active:scale-95 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/40 flex items-center justify-center gap-2 transition-all hover:scale-105 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY NEW CHAMPIONSHIP</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE CONTROLS OVERLAY (AIM LEFT/RIGHT, POWER SLIDER, PUTT SHOT)      */}
      {/* ========================================================================= */}
      {gameState === 'aiming' && (
        <div className="w-full p-3 rounded-2xl bg-slate-900 border border-emerald-500/40 flex flex-col gap-2.5 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            {/* Aim Rotate Left / Right */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => rotateAim(-0.15)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-emerald-500/40 text-emerald-300 hover:border-emerald-400 font-black text-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>AIM LEFT</span>
              </button>

              <button
                onClick={() => rotateAim(0.15)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-emerald-500/40 text-emerald-300 hover:border-emerald-400 font-black text-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
              >
                <span>AIM RIGHT</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Auto-Aim Button */}
            <button
              onClick={autoAimCup}
              className="px-3 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30 text-xs font-black flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
            >
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              <span>AIM TO CUP</span>
            </button>

            {/* PUTT SHOT BUTTON */}
            <button
              onClick={() => puttBall(dragRef.current.aimAngle, power)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>PUTT ({power}%)</span>
            </button>
          </div>

          {/* Power Range Slider */}
          <div className="flex items-center gap-3 px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase w-16">POWER: {power}%</span>
            <input
              type="range"
              min="15"
              max="100"
              value={power}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPower(val);
                dragRef.current.power = val;
                updateAimGuide(dragRef.current.aimAngle, val);
              }}
              className="w-full accent-emerald-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* FOOTER GUIDE */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400 font-bold">
        <div className="inline-flex items-center gap-2">
          <span>🏌️ 100% Guaranteed Hole Sinking • Magnet Funnel Attraction Enabled</span>
        </div>
        <div className="text-[11px] text-emerald-400 font-semibold hidden sm:block">
          ⛳ UNCONDITIONAL CUP HOLE SINKING
        </div>
      </div>
    </div>
  );
};
