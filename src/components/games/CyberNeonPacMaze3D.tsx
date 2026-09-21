import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Play,
  Sparkles,
  Flame,
  Shield,
  Zap,
  Award,
  ChevronRight,
  Heart,
  Camera,
  Grid,
  Gamepad2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// ---------------------------------------------------------------------------
// MAZE GRID SPECIFICATION: 21 ROWS x 19 COLUMNS
// 0: Dot / Pellet (+10)
// 1: Wall
// 2: Quantum Power Core (+50)
// 3: Empty / House Corridor (No pellets)
// 4: Ghost Door (Ghosts can pass, Pac-Man blocked)
// ---------------------------------------------------------------------------
const ROWS = 21;
const COLS = 19;
const TILE_SIZE = 1.2;

const MAZE_MAP: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 0
  [1, 2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 2, 1], // 1
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1], // 2
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1], // 3
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 4
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1], // 5
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1], // 6
  [1, 1, 1, 1, 0, 1, 1, 1, 3, 1, 3, 1, 1, 1, 0, 1, 1, 1, 1], // 7
  [3, 3, 3, 1, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0, 1, 3, 3, 3], // 8
  [1, 1, 1, 1, 0, 1, 3, 1, 1, 4, 1, 1, 3, 1, 0, 1, 1, 1, 1], // 9
  [3, 3, 3, 3, 0, 3, 3, 1, 3, 3, 3, 1, 3, 3, 0, 3, 3, 3, 3], // 10 (Side Tunnel)
  [1, 1, 1, 1, 0, 1, 3, 1, 1, 1, 1, 1, 3, 1, 0, 1, 1, 1, 1], // 11
  [3, 3, 3, 1, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0, 1, 3, 3, 3], // 12
  [1, 1, 1, 1, 0, 1, 3, 1, 1, 1, 1, 1, 3, 1, 0, 1, 1, 1, 1], // 13
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 14
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1], // 15
  [1, 2, 0, 1, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 1, 0, 2, 1], // 16 (Pac start at r=16, c=9)
  [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1], // 17
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1], // 18
  [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1], // 19
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 20
];

export interface GhostData {
  id: number;
  name: string;
  baseColor: number;
  gridR: number;
  gridC: number;
  targetR: number;
  targetC: number;
  visualX: number;
  visualZ: number;
  dirR: number;
  dirC: number;
  mesh: THREE.Group;
  bodyMesh: THREE.Mesh;
  skirtMeshes: THREE.Mesh[];
  eyeMesh: THREE.Group;
  frightened: boolean;
  eaten: boolean;
  releaseTimer: number;
  state: 'house' | 'leaving' | 'chase' | 'frightened' | 'eaten';
}

export const CyberNeonPacMaze3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React UI States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'victory'>('menu');
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('novaplay_pacmaze_best') || '0', 10);
  });
  const [level, setLevel] = useState<number>(1);
  const [lives, setLives] = useState<number>(3);
  const [frightenedTime, setFrightenedTime] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [cameraMode, setCameraMode] = useState<'3d' | 'top'>('3d');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Touch Swipe Gesture Tracking
  const touchRef = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 });

  // Floating score toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1800);
  }, []);

  // Three.js and Game State Refs (Accessible directly inside 60 FPS animation loop)
  const engineRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    cameraMode: '3d' | 'top';
    gameState: 'menu' | 'playing' | 'gameover' | 'victory';
    level: number;
    score: number;
    bestScore: number;
    lives: number;
    frightenedTime: number;
    ghostCombo: number;
    lastChompSound: number;
    pelletsRemaining: number;
    pelletGrid: number[][];
    pelletMeshes: Map<string, THREE.Mesh>;
    powerCoreMeshes: THREE.Mesh[];
    pac: {
      gridR: number;
      gridC: number;
      targetR: number;
      targetC: number;
      visualX: number;
      visualZ: number;
      dirR: number;
      dirC: number;
      nextDirR: number;
      nextDirC: number;
      mouthAngle: number;
      mouthDir: number;
      moving: boolean;
      mesh: THREE.Group | null;
      topJaw: THREE.Mesh | null;
      botJaw: THREE.Mesh | null;
      light: THREE.PointLight | null;
    };
    ghosts: GhostData[];
  }>({
    scene: null,
    camera: null,
    renderer: null,
    cameraMode: '3d',
    gameState: 'menu',
    level: 1,
    score: 0,
    bestScore: parseInt(localStorage.getItem('novaplay_pacmaze_best') || '0', 10),
    lives: 3,
    frightenedTime: 0,
    ghostCombo: 1,
    lastChompSound: 0,
    pelletsRemaining: 0,
    pelletGrid: [],
    pelletMeshes: new Map(),
    powerCoreMeshes: [],
    pac: {
      gridR: 16,
      gridC: 9,
      targetR: 16,
      targetC: 8,
      visualX: 0,
      visualZ: 0,
      dirR: 0,
      dirC: -1,
      nextDirR: 0,
      nextDirC: -1,
      mouthAngle: 0.25,
      mouthDir: 1,
      moving: false,
      mesh: null,
      topJaw: null,
      botJaw: null,
      light: null,
    },
    ghosts: [],
  });

  // Convert Grid (Row, Col) to 3D World (X, Z) Coordinates
  const gridToWorld = (r: number, c: number): { x: number; z: number } => {
    const x = (c - (COLS - 1) / 2) * TILE_SIZE;
    const z = (r - (ROWS - 1) / 2) * TILE_SIZE;
    return { x, z };
  };

  // Check if Pac-Man can enter cell
  const canPacMove = (r: number, c: number): boolean => {
    if (r === 10 && (c < 0 || c >= COLS)) return true; // Wrap tunnel
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    const tile = MAZE_MAP[r][c];
    return tile !== 1 && tile !== 4; // Walls and Ghost House Door are blocked
  };

  // Check if Ghost can enter cell
  const canGhostMove = (ghost: GhostData, r: number, c: number): boolean => {
    if (r === 10 && (c < 0 || c >= COLS)) return true; // Wrap tunnel
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    const tile = MAZE_MAP[r][c];
    if (tile === 1) return false; // Wall blocked
    if (tile === 4) {
      // Door is only accessible when leaving or returning eaten
      return ghost.state === 'leaving' || ghost.eaten;
    }
    return true;
  };

  // ---------------------------------------------------------------------------
  // PROCEDURAL 3D MESH BUILDERS
  // ---------------------------------------------------------------------------
  const createPacMesh = () => {
    const group = new THREE.Group();

    const pacMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.15,
      metalness: 0.7,
      emissive: 0xd97706,
      emissiveIntensity: 0.25,
    });

    // Top Jaw Half-Sphere
    const topGeo = new THREE.SphereGeometry(0.55, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    const topJaw = new THREE.Mesh(topGeo, pacMat);
    group.add(topJaw);

    // Bottom Jaw Half-Sphere
    const botGeo = new THREE.SphereGeometry(0.55, 20, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const botJaw = new THREE.Mesh(botGeo, pacMat);
    group.add(botJaw);

    // Glowing Neon Cyber Visor Eyes
    const eyeGeo = new THREE.SphereGeometry(0.09, 10, 10);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(0.32, 0.35, 0.28);
    topJaw.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.32, 0.35, -0.28);
    topJaw.add(eyeR);

    // Front Light Headlamp
    const light = new THREE.PointLight(0xfde047, 2.2, 8);
    light.position.set(0.3, 0.2, 0);
    group.add(light);

    return { group, topJaw, botJaw, light };
  };

  const createGhostMesh = (baseColor: number) => {
    const group = new THREE.Group();

    // 1. Ghost Dome Head & Body
    const ghostMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.2,
      metalness: 0.6,
      transparent: true,
      opacity: 0.92,
      emissive: baseColor,
      emissiveIntensity: 0.3,
    });

    const domeGeo = new THREE.SphereGeometry(0.5, 18, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, ghostMat);
    dome.position.y = 0.35;
    group.add(dome);

    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.45, 18);
    const body = new THREE.Mesh(bodyGeo, ghostMat);
    body.position.y = 0.12;
    group.add(body);

    // 2. Skirt Tentacles (3 Cones at base)
    const skirtMeshes: THREE.Mesh[] = [];
    const skirtGeo = new THREE.ConeGeometry(0.16, 0.25, 10);
    const skirtMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: baseColor,
      emissiveIntensity: 0.3,
    });

    [-0.26, 0, 0.26].forEach((xOffset) => {
      const skirt = new THREE.Mesh(skirtGeo, skirtMat);
      skirt.rotation.x = Math.PI;
      skirt.position.set(xOffset, -0.15, 0);
      group.add(skirt);
      skirtMeshes.push(skirt);
    });

    // 3. Cyber Glowing Big Eyes
    const eyeGroup = new THREE.Group();
    const eyeWhiteGeo = new THREE.SphereGeometry(0.14, 10, 10);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const pupilGeo = new THREE.SphereGeometry(0.07, 10, 10);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

    [-0.18, 0.18].forEach((zOff) => {
      const white = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      white.position.set(0.35, 0.35, zOff);
      eyeGroup.add(white);

      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(0.44, 0.35, zOff);
      eyeGroup.add(pupil);
    });

    group.add(eyeGroup);
    return { group, bodyMesh: body, skirtMeshes, eyeGroup };
  };

  // ---------------------------------------------------------------------------
  // SPAWN PELLETS & POWER ORBS
  // ---------------------------------------------------------------------------
  const spawnPellets = useCallback(() => {
    const eng = engineRef.current;
    if (!eng.scene) return;

    // Remove old pellet meshes
    eng.pelletMeshes.forEach((mesh) => eng.scene?.remove(mesh));
    eng.pelletMeshes.clear();
    eng.powerCoreMeshes.forEach((mesh) => eng.scene?.remove(mesh));
    eng.powerCoreMeshes = [];

    const newGrid: number[][] = JSON.parse(JSON.stringify(MAZE_MAP));
    let count = 0;

    const dotGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const dotMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xfacc15,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });

    const powerGeo = new THREE.OctahedronGeometry(0.32, 0);
    const powerMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.8,
    });

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = newGrid[r][c];
        if (val === 0 || val === 2) {
          count++;
          const { x, z } = gridToWorld(r, c);
          const pMesh = new THREE.Mesh(val === 2 ? powerGeo : dotGeo, val === 2 ? powerMat : dotMat);
          pMesh.position.set(x, val === 2 ? 0.45 : 0.25, z);
          eng.scene.add(pMesh);
          eng.pelletMeshes.set(`${r},${c}`, pMesh);

          if (val === 2) {
            eng.powerCoreMeshes.push(pMesh);
          }
        }
      }
    }

    eng.pelletGrid = newGrid;
    eng.pelletsRemaining = count;
  }, []);

  // ---------------------------------------------------------------------------
  // RESET CHARACTERS TO SPAWN POSITIONS
  // ---------------------------------------------------------------------------
  const resetEntitiesToSpawns = useCallback(() => {
    const eng = engineRef.current;
    const pacStart = gridToWorld(16, 9);
    eng.pac.gridR = 16;
    eng.pac.gridC = 9;
    eng.pac.targetR = 16;
    eng.pac.targetC = 8;
    eng.pac.visualX = pacStart.x;
    eng.pac.visualZ = pacStart.z;
    eng.pac.dirR = 0;
    eng.pac.dirC = -1;
    eng.pac.nextDirR = 0;
    eng.pac.nextDirC = -1;
    eng.pac.moving = true;

    if (eng.pac.mesh) {
      eng.pac.mesh.position.set(pacStart.x, 0.55, pacStart.z);
      eng.pac.mesh.rotation.y = Math.PI;
    }

    // Ghost spawn configurations:
    // Blinky: outside ghost house at (8, 9)
    // Pinky: inside ghost house at (10, 9)
    // Inky: inside ghost house at (10, 8)
    // Clyde: inside ghost house at (10, 10)
    const ghostSpawns = [
      { r: 8, c: 9, release: 0, state: 'chase' as const },
      { r: 10, c: 9, release: 1.5, state: 'house' as const },
      { r: 10, c: 8, release: 3.5, state: 'house' as const },
      { r: 10, c: 10, release: 5.5, state: 'house' as const },
    ];

    eng.ghosts.forEach((ghost, idx) => {
      const sp = ghostSpawns[idx];
      ghost.gridR = sp.r;
      ghost.gridC = sp.c;
      ghost.targetR = sp.r;
      ghost.targetC = sp.c;
      ghost.dirR = -1;
      ghost.dirC = 0;
      ghost.frightened = false;
      ghost.eaten = false;
      ghost.releaseTimer = sp.release;
      ghost.state = sp.state;

      const gPos = gridToWorld(ghost.gridR, ghost.gridC);
      ghost.visualX = gPos.x;
      ghost.visualZ = gPos.z;
      ghost.mesh.position.set(gPos.x, 0.55, gPos.z);
      ghost.mesh.visible = true;

      // Restore base material
      (ghost.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(ghost.baseColor);
      (ghost.bodyMesh.material as THREE.MeshStandardMaterial).emissive.setHex(ghost.baseColor);
      ghost.skirtMeshes.forEach((s) => {
        (s.material as THREE.MeshStandardMaterial).color.setHex(ghost.baseColor);
      });
    });

    eng.frightenedTime = 0;
    setFrightenedTime(0);
  }, []);

  // ---------------------------------------------------------------------------
  // DIRECTION INPUT HANDLER (Buffered Turning & 180 Instant Reversals)
  // ---------------------------------------------------------------------------
  const handleInputDirection = useCallback((dr: number, dc: number) => {
    const eng = engineRef.current;
    if (eng.gameState !== 'playing') return;

    eng.pac.nextDirR = dr;
    eng.pac.nextDirC = dc;
    eng.pac.moving = true;

    // Instant 180-degree turn support
    if (dr === -eng.pac.dirR && dc === -eng.pac.dirC && eng.pac.dirR !== 0 || (dr === -eng.pac.dirR && dc === -eng.pac.dirC && eng.pac.dirC !== 0)) {
      eng.pac.dirR = dr;
      eng.pac.dirC = dc;
      const prevTargetR = eng.pac.targetR;
      const prevTargetC = eng.pac.targetC;
      eng.pac.targetR = eng.pac.gridR;
      eng.pac.targetC = eng.pac.gridC;
      eng.pac.gridR = prevTargetR;
      eng.pac.gridC = prevTargetC;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // START GAME / REPLAY
  // ---------------------------------------------------------------------------
  const startGame = useCallback(() => {
    sound.playClick();
    const eng = engineRef.current;

    eng.score = 0;
    eng.level = 1;
    eng.lives = 3;
    eng.frightenedTime = 0;
    eng.ghostCombo = 1;
    eng.gameState = 'playing';

    setScore(0);
    setLevel(1);
    setLives(3);
    setFrightenedTime(0);
    setGameState('playing');

    spawnPellets();
    resetEntitiesToSpawns();
    sound.playScore();
  }, [resetEntitiesToSpawns, spawnPellets]);

  // ---------------------------------------------------------------------------
  // KEYBOARD & TOUCH EVENT LISTENERS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        handleInputDirection(-1, 0);
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        handleInputDirection(1, 0);
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        handleInputDirection(0, -1);
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        handleInputDirection(0, 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInputDirection]);

  // Touch & Swipe Gesture Tracking
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    hasSwiped: boolean;
  }>({ startX: 0, startY: 0, hasSwiped: false });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    touchStateRef.current.startX = t.clientX;
    touchStateRef.current.startY = t.clientY;
    touchStateRef.current.hasSwiped = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStateRef.current.startX;
    const dy = t.clientY - touchStateRef.current.startY;
    const dist = Math.hypot(dx, dy);

    // Instant response when finger slides >= 12px
    if (dist > 12) {
      touchStateRef.current.hasSwiped = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) handleInputDirection(0, 1);   // Right
        else handleInputDirection(0, -1);          // Left
      } else {
        if (dy > 0) handleInputDirection(1, 0);   // Down
        else handleInputDirection(-1, 0);          // Up
      }
      // Re-anchor start coordinate for continuous seamless multi-turn gestures
      touchStateRef.current.startX = t.clientX;
      touchStateRef.current.startY = t.clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // If it was a tap without dragging, steer based on quadrant relative to screen center
    if (!touchStateRef.current.hasSwiped && mountRef.current && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const rect = mountRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const relX = t.clientX - centerX;
      const relY = t.clientY - centerY;

      if (Math.abs(relX) > Math.abs(relY)) {
        if (relX > 0) handleInputDirection(0, 1);   // Right
        else handleInputDirection(0, -1);          // Left
      } else {
        if (relY > 0) handleInputDirection(1, 0);   // Down
        else handleInputDirection(-1, 0);          // Up
      }
    }
  };

  // ---------------------------------------------------------------------------
  // THREE.JS SCENE INITIALIZATION & 60 FPS SIMULATION ENGINE
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
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 24, 18);
    camera.lookAt(0, 0, 2);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current || undefined,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x334155, 1.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
    dirLight.position.set(10, 30, 20);
    scene.add(dirLight);

    // 5. Floor Grid
    const floorGeo = new THREE.PlaneGeometry(COLS * TILE_SIZE + 4, ROWS * TILE_SIZE + 4);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x030712,
      roughness: 0.85,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    scene.add(floor);

    // Subtle floor border glow
    const floorBorderGeo = new THREE.BoxGeometry(COLS * TILE_SIZE + 0.4, 0.1, ROWS * TILE_SIZE + 0.4);
    const floorBorderMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, wireframe: true });
    const floorBorder = new THREE.Mesh(floorBorderGeo, floorBorderMat);
    floorBorder.position.y = 0;
    scene.add(floorBorder);

    // 6. Build 3D Extruded Cyber Maze Walls & Door
    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, 0.9, TILE_SIZE);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      metalness: 0.8,
      roughness: 0.25,
    });
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const doorMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.7 });

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = MAZE_MAP[r][c];
        const { x, z } = gridToWorld(r, c);

        if (val === 1) {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          wall.position.set(x, 0.45, z);
          scene.add(wall);

          // Glowing neon edge top
          const rim = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE * 1.02, 0.14, TILE_SIZE * 1.02), rimMat);
          rim.position.set(x, 0.95, z);
          scene.add(rim);
        } else if (val === 4) {
          // Ghost House Door
          const door = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE, 0.3, 0.2), doorMat);
          door.position.set(x, 0.3, z);
          scene.add(door);
        }
      }
    }

    // 7. Instantiate 3D Cyber Pac Hero
    const { group: pacGroup, topJaw, botJaw, light: pacLight } = createPacMesh();
    const pacStart = gridToWorld(16, 9);
    pacGroup.position.set(pacStart.x, 0.55, pacStart.z);
    scene.add(pacGroup);

    // 8. Create 4 Unique 3D Ghosts
    const ghostConfigs = [
      { id: 1, name: 'Blinky', color: 0xf43f5e, r: 8, c: 9 },
      { id: 2, name: 'Pinky', color: 0xec4899, r: 10, c: 9 },
      { id: 3, name: 'Inky', color: 0x00f0ff, r: 10, c: 8 },
      { id: 4, name: 'Clyde', color: 0xfbbf24, r: 10, c: 10 },
    ];

    const ghosts: GhostData[] = [];
    ghostConfigs.forEach((gc) => {
      const { group: gGroup, bodyMesh, skirtMeshes, eyeGroup } = createGhostMesh(gc.color);
      const gPos = gridToWorld(gc.r, gc.c);
      gGroup.position.set(gPos.x, 0.55, gPos.z);
      scene.add(gGroup);

      ghosts.push({
        id: gc.id,
        name: gc.name,
        baseColor: gc.color,
        gridR: gc.r,
        gridC: gc.c,
        targetR: gc.r,
        targetC: gc.c,
        visualX: gPos.x,
        visualZ: gPos.z,
        dirR: -1,
        dirC: 0,
        mesh: gGroup,
        bodyMesh,
        skirtMeshes,
        eyeMesh: eyeGroup,
        frightened: false,
        eaten: false,
        releaseTimer: gc.id === 1 ? 0 : gc.id * 1.5,
        state: gc.id === 1 ? 'chase' : 'house',
      });
    });

    // Store in Engine Ref
    engineRef.current.scene = scene;
    engineRef.current.camera = camera;
    engineRef.current.renderer = renderer;
    engineRef.current.ghosts = ghosts;
    engineRef.current.pac.mesh = pacGroup;
    engineRef.current.pac.topJaw = topJaw;
    engineRef.current.pac.botJaw = botJaw;
    engineRef.current.pac.light = pacLight;

    // Spawn pellets initially
    spawnPellets();

    // -------------------------------------------------------------------------
    // 60 FPS ANIMATION AND SIMULATION LOOP
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

      // Rotate Power Cores & Pellets
      eng.powerCoreMeshes.forEach((mesh) => {
        mesh.rotation.x += dt * 2.5;
        mesh.rotation.y += dt * 3.5;
      });

      if (eng.gameState === 'playing') {
        const pac = eng.pac;
        const pacSpeed = (6.0 + (eng.level - 1) * 0.4) * TILE_SIZE;

        // 1. Pac-Man Continuous Grid Movement
        if (pac.moving) {
          const targetWorld = gridToWorld(pac.targetR, pac.targetC);
          const dx = targetWorld.x - pac.visualX;
          const dz = targetWorld.z - pac.visualZ;
          const dist = Math.hypot(dx, dz);
          const step = pacSpeed * dt;

          if (dist <= step || dist < 0.05) {
            // Reached target tile center
            pac.visualX = targetWorld.x;
            pac.visualZ = targetWorld.z;
            pac.gridR = pac.targetR;
            pac.gridC = pac.targetC;

            // Tunnel wrap-around check
            if (pac.gridR === 10 && pac.gridC <= 0 && pac.dirC === -1) {
              pac.gridC = COLS - 1;
              pac.targetC = COLS - 2;
              const wrapPos = gridToWorld(pac.gridR, pac.gridC);
              pac.visualX = wrapPos.x;
              pac.visualZ = wrapPos.z;
            } else if (pac.gridR === 10 && pac.gridC >= COLS - 1 && pac.dirC === 1) {
              pac.gridC = 0;
              pac.targetC = 1;
              const wrapPos = gridToWorld(pac.gridR, pac.gridC);
              pac.visualX = wrapPos.x;
              pac.visualZ = wrapPos.z;
            } else {
              // Try to turn into buffered direction
              if ((pac.nextDirR !== 0 || pac.nextDirC !== 0) && canPacMove(pac.gridR + pac.nextDirR, pac.gridC + pac.nextDirC)) {
                pac.dirR = pac.nextDirR;
                pac.dirC = pac.nextDirC;
              }

              // Continue moving in current direction if path is open
              if (canPacMove(pac.gridR + pac.dirR, pac.gridC + pac.dirC)) {
                pac.targetR = pac.gridR + pac.dirR;
                pac.targetC = pac.gridC + pac.dirC;
              } else {
                // Stopped at wall
                pac.targetR = pac.gridR;
                pac.targetC = pac.gridC;
              }
            }
          } else {
            // Interpolate towards target
            pac.visualX += (dx / dist) * step;
            pac.visualZ += (dz / dist) * step;
          }

          if (pac.mesh) {
            pac.mesh.position.set(pac.visualX, 0.55, pac.visualZ);

            // Heading Rotation
            if (pac.dirC === 1) pac.mesh.rotation.y = 0;
            else if (pac.dirC === -1) pac.mesh.rotation.y = Math.PI;
            else if (pac.dirR === -1) pac.mesh.rotation.y = Math.PI / 2;
            else if (pac.dirR === 1) pac.mesh.rotation.y = -Math.PI / 2;
          }

          // Animated Mouth Chomp
          pac.mouthAngle += pac.mouthDir * dt * 14;
          if (pac.mouthAngle > 0.55) {
            pac.mouthAngle = 0.55;
            pac.mouthDir = -1;
          } else if (pac.mouthAngle < 0.05) {
            pac.mouthAngle = 0.05;
            pac.mouthDir = 1;
          }

          if (pac.topJaw && pac.botJaw) {
            pac.topJaw.rotation.z = pac.mouthAngle;
            pac.botJaw.rotation.z = -pac.mouthAngle;
          }
        }

        // 2. Pellet Consumption Check
        const cellKey = `${pac.gridR},${pac.gridC}`;
        if (eng.pelletGrid[pac.gridR] && (eng.pelletGrid[pac.gridR][pac.gridC] === 0 || eng.pelletGrid[pac.gridR][pac.gridC] === 2)) {
          const isPower = eng.pelletGrid[pac.gridR][pac.gridC] === 2;
          eng.pelletGrid[pac.gridR][pac.gridC] = 3; // Mark cleared

          const mesh = eng.pelletMeshes.get(cellKey);
          if (mesh) {
            eng.scene.remove(mesh);
            eng.pelletMeshes.delete(cellKey);
          }

          eng.pelletsRemaining--;

          if (isPower) {
            sound.playScore();
            eng.score += 50;
            eng.frightenedTime = 8.5;
            eng.ghostCombo = 1;
            setScore(eng.score);
            setFrightenedTime(8.5);
            showToast('⚡ QUANTUM POWER CORE ACTIVATED! HUNT GHOSTS!');
            confetti({ particleCount: 40, spread: 60 });

            // Turn ghosts frightened
            eng.ghosts.forEach((g) => {
              if (!g.eaten && g.state !== 'house') {
                g.frightened = true;
                g.state = 'frightened';
                (g.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(0x1d4ed8);
                (g.bodyMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x3b82f6);
                g.skirtMeshes.forEach((s) => {
                  (s.material as THREE.MeshStandardMaterial).color.setHex(0x1d4ed8);
                });
              }
            });
          } else {
            // Regular Dot
            if (now - eng.lastChompSound > 160) {
              sound.playLaser();
              eng.lastChompSound = now;
            }
            eng.score += 10;
            if (eng.score > eng.bestScore) {
              eng.bestScore = eng.score;
              setBestScore(eng.score);
              localStorage.setItem('novaplay_pacmaze_best', String(eng.score));
            }
            setScore(eng.score);
          }

          // Check Level Victory Condition
          if (eng.pelletsRemaining <= 0) {
            sound.playWin();
            confetti({ particleCount: 150, spread: 90 });
            eng.level += 1;
            setLevel(eng.level);
            showToast(`👑 STAGE ${eng.level - 1} CLEARED! SUPERCHARGING...`);
            setTimeout(() => {
              spawnPellets();
              resetEntitiesToSpawns();
            }, 1800);
          }
        }

        // 3. Frightened Timer Update
        if (eng.frightenedTime > 0) {
          eng.frightenedTime = Math.max(0, eng.frightenedTime - dt);
          setFrightenedTime(eng.frightenedTime);

          // Flashing warning in the last 2 seconds
          const isFlashing = eng.frightenedTime < 2.5 && Math.floor(eng.frightenedTime * 6) % 2 === 0;

          eng.ghosts.forEach((g) => {
            if (g.frightened && !g.eaten) {
              const flashColor = isFlashing ? 0xffffff : 0x1d4ed8;
              (g.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(flashColor);
              (g.bodyMesh.material as THREE.MeshStandardMaterial).emissive.setHex(flashColor);
              g.skirtMeshes.forEach((s) => {
                (s.material as THREE.MeshStandardMaterial).color.setHex(flashColor);
              });
            }
          });

          if (eng.frightenedTime === 0) {
            // Restore normal colors
            eng.ghosts.forEach((g) => {
              g.frightened = false;
              if (g.state === 'frightened') g.state = 'chase';
              if (!g.eaten) {
                (g.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(g.baseColor);
                (g.bodyMesh.material as THREE.MeshStandardMaterial).emissive.setHex(g.baseColor);
                g.skirtMeshes.forEach((s) => {
                  (s.material as THREE.MeshStandardMaterial).color.setHex(g.baseColor);
                });
              }
            });
          }
        }

        // 4. Update Autonomous Ghosts AI & Movement
        eng.ghosts.forEach((ghost) => {
          // Release Timer inside Ghost House
          if (ghost.releaseTimer > 0) {
            ghost.releaseTimer -= dt;
            // Bob up and down inside house
            ghost.mesh.position.y = 0.55 + Math.sin(now * 0.008 + ghost.id) * 0.12;
            return;
          }

          // Transition from house to maze
          if (ghost.state === 'house') {
            ghost.state = 'leaving';
            ghost.targetR = 9; // Move to door
            ghost.targetC = 9;
          }

          // Ghost speed based on state
          let ghostSpeed = (ghost.eaten ? 8.5 : ghost.frightened ? 3.0 : 4.4 + (eng.level - 1) * 0.3) * TILE_SIZE;

          const gTargetWorld = gridToWorld(ghost.targetR, ghost.targetC);
          const gdx = gTargetWorld.x - ghost.visualX;
          const gdz = gTargetWorld.z - ghost.visualZ;
          const gdist = Math.hypot(gdx, gdz);
          const gstep = ghostSpeed * dt;

          if (gdist <= gstep || gdist < 0.05) {
            ghost.visualX = gTargetWorld.x;
            ghost.visualZ = gTargetWorld.z;
            ghost.gridR = ghost.targetR;
            ghost.gridC = ghost.targetC;

            // When leaving house, once at row 8 outside door, start chase
            if (ghost.state === 'leaving' && ghost.gridR <= 8) {
              ghost.state = 'chase';
            }

            // Eaten ghost reached center of house to respawn
            if (ghost.eaten && ghost.gridR === 10 && ghost.gridC === 9) {
              ghost.eaten = false;
              ghost.frightened = false;
              ghost.state = 'leaving';
              ghost.mesh.visible = true;
              (ghost.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(ghost.baseColor);
              (ghost.bodyMesh.material as THREE.MeshStandardMaterial).emissive.setHex(ghost.baseColor);
              ghost.skirtMeshes.forEach((s) => {
                (s.material as THREE.MeshStandardMaterial).color.setHex(ghost.baseColor);
              });
            }

            // Tunnel wrap check
            if (ghost.gridR === 10 && ghost.gridC <= 0 && ghost.dirC === -1) {
              ghost.gridC = COLS - 1;
              ghost.targetC = COLS - 2;
              const gWrap = gridToWorld(ghost.gridR, ghost.gridC);
              ghost.visualX = gWrap.x;
              ghost.visualZ = gWrap.z;
            } else if (ghost.gridR === 10 && ghost.gridC >= COLS - 1 && ghost.dirC === 1) {
              ghost.gridC = 0;
              ghost.targetC = 1;
              const gWrap = gridToWorld(ghost.gridR, ghost.gridC);
              ghost.visualX = gWrap.x;
              ghost.visualZ = gWrap.z;
            } else {
              // Intersection Decision Logic
              const allDirs = [
                { dr: -1, dc: 0 },
                { dr: 1, dc: 0 },
                { dr: 0, dc: -1 },
                { dr: 0, dc: 1 },
              ];

              // Filter open directions (disallow 180 reverse unless blocked)
              const openDirs = allDirs.filter((d) => {
                if (d.dr === -ghost.dirR && d.dc === -ghost.dirC) return false;
                return canGhostMove(ghost, ghost.gridR + d.dr, ghost.gridC + d.dc);
              });

              const validDirs =
                openDirs.length > 0
                  ? openDirs
                  : allDirs.filter((d) => canGhostMove(ghost, ghost.gridR + d.dr, ghost.gridC + d.dc));

              if (validDirs.length > 0) {
                // Determine target tile
                let targetTile = { r: pac.gridR, c: pac.gridC };

                if (ghost.eaten) {
                  targetTile = { r: 10, c: 9 }; // Return to house center
                } else if (ghost.state === 'leaving') {
                  targetTile = { r: 8, c: 9 }; // Exit to maze top
                } else if (ghost.frightened) {
                  // Random flee choice
                  const chosen = validDirs[Math.floor(Math.random() * validDirs.length)];
                  ghost.dirR = chosen.dr;
                  ghost.dirC = chosen.dc;
                  ghost.targetR = ghost.gridR + ghost.dirR;
                  ghost.targetC = ghost.gridC + ghost.dirC;
                } else {
                  // AI Personalities:
                  if (ghost.id === 1) {
                    // Blinky: Direct chase
                    targetTile = { r: pac.gridR, c: pac.gridC };
                  } else if (ghost.id === 2) {
                    // Pinky: Ambush 3 tiles ahead
                    targetTile = { r: pac.gridR + pac.dirR * 3, c: pac.gridC + pac.dirC * 3 };
                  } else if (ghost.id === 3) {
                    // Inky: Flank 2 tiles ahead
                    targetTile = { r: pac.gridR + pac.dirR * 2, c: pac.gridC + pac.dirC * 2 };
                  } else {
                    // Clyde: Chase if far, scatter to corner (19, 1) if within 5 tiles
                    const dPac = Math.hypot(ghost.gridR - pac.gridR, ghost.gridC - pac.gridC);
                    targetTile = dPac > 5 ? { r: pac.gridR, c: pac.gridC } : { r: 19, c: 1 };
                  }
                }

                if (!ghost.frightened || ghost.eaten || ghost.state === 'leaving') {
                  // Pick direction with shortest Euclidean distance to target
                  let bestDir = validDirs[0];
                  let minDistance = Infinity;

                  validDirs.forEach((d) => {
                    const distToTarget = Math.hypot(
                      ghost.gridR + d.dr - targetTile.r,
                      ghost.gridC + d.dc - targetTile.c
                    );
                    if (distToTarget < minDistance) {
                      minDistance = distToTarget;
                      bestDir = d;
                    }
                  });

                  ghost.dirR = bestDir.dr;
                  ghost.dirC = bestDir.dc;
                  ghost.targetR = ghost.gridR + ghost.dirR;
                  ghost.targetC = ghost.gridC + ghost.dirC;
                }
              }
            }
          } else {
            ghost.visualX += (gdx / gdist) * gstep;
            ghost.visualZ += (gdz / gdist) * gstep;
          }

          ghost.mesh.position.set(ghost.visualX, 0.55 + Math.sin(now * 0.008 + ghost.id) * 0.08, ghost.visualZ);

          // 5. Collision Check (Pac-Man vs Ghost)
          const collisionDist = Math.hypot(ghost.visualX - pac.visualX, ghost.visualZ - pac.visualZ);
          if (collisionDist < 0.75) {
            if (ghost.frightened && !ghost.eaten) {
              // Devour Ghost!
              ghost.eaten = true;
              ghost.frightened = false;
              sound.playExplosion();
              const comboPoints = 200 * eng.ghostCombo;
              eng.score += comboPoints;
              eng.ghostCombo = Math.min(eng.ghostCombo * 2, 16);
              setScore(eng.score);
              showToast(`💥 DEVOUR COMBO! +${comboPoints} PTS`);
              confetti({ particleCount: 35, spread: 50 });

              // Hide ghost body (only eyes remain returning)
              (ghost.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(0x000000);
              (ghost.bodyMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
              ghost.skirtMeshes.forEach((s) => {
                (s.material as THREE.MeshStandardMaterial).color.setHex(0x000000);
              });
            } else if (!ghost.frightened && !ghost.eaten && ghost.state !== 'house') {
              // Pac-Man Captured!
              sound.playHit();
              eng.lives -= 1;
              setLives(eng.lives);

              if (eng.lives <= 0) {
                eng.gameState = 'gameover';
                setGameState('gameover');
                sound.playExplosion();
              } else {
                showToast(`⚠️ CAPTURED! ${eng.lives} LIVES REMAINING`);
                resetEntitiesToSpawns();
              }
            }
          }
        });
      }

      // Smooth Dynamic Camera Positioning with Aspect-Aware Framing
      if (eng.camera && mountRef.current) {
        const w = mountRef.current.clientWidth || 960;
        const h = mountRef.current.clientHeight || 540;
        const aspect = w / h;

        if (eng.cameraMode === '3d') {
          const dist = aspect < 1 ? 26 / Math.max(aspect, 0.65) : 26;
          eng.camera.position.set(0, dist * 0.88, dist * 0.68);
          eng.camera.lookAt(0, 0, 1.2);
        } else {
          // Classic Top-Down: Ensure 100% of the 21x19 maze is fully visible with clean margins
          const fitH = Math.max(35, 30 / Math.min(aspect, 1.2));
          eng.camera.position.set(0, fitH, 0);
          eng.camera.lookAt(0, 0, 0);
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
      engineRef.current.camera.aspect = w / h;
      engineRef.current.camera.updateProjectionMatrix();
      engineRef.current.renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Clean up Three.js scene & renderer on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, [resetEntitiesToSpawns, showToast, spawnPellets]);

  // Sync Camera Mode to engine ref
  const toggleCamera = () => {
    sound.playClick();
    setCameraMode((prev) => {
      const next = prev === '3d' ? 'top' : '3d';
      engineRef.current.cameraMode = next;
      return next;
    });
  };

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3.5 select-none font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP CYBER DASHBOARD BAR (OUTSIDE THE ARENA BOX - ZERO OVERLAP)         */}
      {/* ========================================================================= */}
      <div className="w-full flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md shadow-xl">
        {/* Left: Score, Stage, Lives */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="px-3 sm:px-4 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-400/60 text-center shadow-inner">
            <div className="text-[8px] sm:text-[9px] font-black uppercase text-cyan-400 leading-none">SCORE</div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono leading-none mt-0.5">{score}</div>
          </div>

          <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700 text-center">
            <div className="text-[8px] font-bold text-slate-400 uppercase leading-none">STAGE</div>
            <div className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5">LVL {level}</div>
          </div>

          {/* Lives Hearts */}
          <div className="px-2.5 sm:px-3 py-2 rounded-xl bg-slate-950/90 border border-rose-500/40 flex items-center gap-1">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${i < lives ? 'fill-rose-500 text-rose-500 animate-pulse' : 'text-slate-700'}`}
              />
            ))}
          </div>
        </div>

        {/* Right: Hunt Timer, Camera Toggle, Sound Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {frightenedTime > 0 && (
            <div className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 font-mono font-black text-xs animate-pulse shadow-lg shadow-cyan-500/30 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>HUNT: {Math.ceil(frightenedTime)}s</span>
            </div>
          )}

          <button
            onClick={toggleCamera}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-slate-300 shadow-md active:scale-95 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            title="Toggle Camera View (3D / Top-Down)"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">{cameraMode.toUpperCase()}</span>
          </button>

          <button
            onClick={() => {
              const isMute = sound.toggleMute();
              setMuted(isMute);
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-slate-300 shadow-md active:scale-95 transition-all cursor-pointer"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 3D GAME ARENA (100% UNRESTRICTED MAZE VIEW)                             */}
      {/* ========================================================================= */}
      <div
        ref={mountRef}
        id="cyber-pacmaze-arena"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-[460px] sm:h-[580px] md:h-[680px] max-h-[76vh] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden select-none border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 touch-none outline-none"
      >
        {/* 3D WebGL Canvas */}
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Floating Combat Toast */}
        {toastMessage && (
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-slate-900/95 border-2 border-amber-400 text-amber-300 font-black text-xs sm:text-sm tracking-wide shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-10">
            {toastMessage}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN MENU OVERLAY                                                         */}
        {/* ========================================================================= */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8 text-center space-y-4">
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-amber-500/30 via-rose-500/30 to-cyan-500/30 border-2 border-amber-400 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/40 p-4">
              <Gamepad2 className="w-10 h-10 text-amber-400 animate-pulse" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                LEGENDARY 3D NEON RETRO ARCADE
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-400 to-cyan-400 mt-2 tracking-tight">
                CYBER PAC-MAZE 3D
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-md mx-auto">
                Devour glowing cyber pellets • Activate quantum power cores • Hunt down 4 AI rogue cyber ghosts!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={startGame}
                className="px-9 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-500 hover:scale-105 active:scale-95 text-slate-950 font-black text-base sm:text-lg shadow-2xl shadow-amber-500/40 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <Play className="w-6 h-6 fill-slate-950" />
                <span>START PAC-RUN</span>
              </button>
            </div>

            {/* Best Score Trophy Tag */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>
                ALL-TIME HIGH SCORE: <span className="text-white font-mono">{bestScore} PTS</span>
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* GAME OVER OVERLAY                                                         */}
        {/* ========================================================================= */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-20 bg-slate-950/92 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/40 p-3">
              <Flame className="w-9 h-9 text-rose-500 animate-bounce" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-rose-400 tracking-widest">SYSTEM OVERLOAD</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">PAC-DRONE OFFLINE</h2>
            </div>

            {/* Score Summary Box */}
            <div className="w-full max-w-xs p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-bold">FINAL SCORE:</span>
                <span className="text-2xl font-black text-white font-mono">{score}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800">
                <span className="text-slate-400 font-bold">ALL-TIME BEST:</span>
                <span className="text-xl font-black text-cyan-400 font-mono">{bestScore}</span>
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
                onClick={startGame}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-500 active:scale-95 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/40 flex items-center justify-center gap-2 transition-all hover:scale-105 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>REPLAY PAC-MAZE</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM CONTROLS HINT (OUTSIDE THE ARENA BOX)                           */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400 font-bold">
        <div className="inline-flex items-center gap-2">
          <span className="hidden sm:inline">⌨️ USE ARROW KEYS / WASD</span>
          <span className="sm:hidden text-cyan-300 font-semibold">👆 SWIPE OR TAP ANYWHERE TO TURN</span>
        </div>
        <div className="text-[11px] text-slate-500 hidden sm:block">
          ⚡ QUANTUM POWER CORES ENABLE GHOST HUNTING
        </div>
      </div>
    </div>
  );
};
