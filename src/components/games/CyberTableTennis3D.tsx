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
  Shield,
  Zap,
  Award,
  ChevronRight,
  Target,
  Swords,
  Crosshair
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// --- PADDLE SKINS & UPGRADES ---
interface PaddleSkin {
  id: string;
  name: string;
  bladeColor: number;
  rubberColor: number;
  glowColor: string;
  speedBonus: number;
  spinBonus: number;
  description: string;
}

const PADDLE_SKINS: PaddleSkin[] = [
  { id: 'classic-red', name: 'Pro Carbon Neo', bladeColor: 0x1e293b, rubberColor: 0xe11d48, glowColor: '#e11d48', speedBonus: 1.0, spinBonus: 1.0, description: 'Balanced championship rubber with tournament grip' },
  { id: 'cyber-cyan', name: 'Vortex Plasma', bladeColor: 0x0f172a, rubberColor: 0x00f0ff, glowColor: '#00f0ff', speedBonus: 1.15, spinBonus: 1.12, description: 'High-frequency rubber with extra topspin velocity' },
  { id: 'solar-gold', name: 'Solar Dragon', bladeColor: 0x27272a, rubberColor: 0xf59e0b, glowColor: '#f59e0b', speedBonus: 1.25, spinBonus: 1.22, description: 'Explosive power rubber for lethal smash angles' },
  { id: 'void-purple', name: 'Void Phantom', bladeColor: 0x18181b, rubberColor: 0xa855f7, glowColor: '#a855f7', speedBonus: 1.35, spinBonus: 1.35, description: 'Supreme aerodynamic control with maximum spin curvature' },
];

interface Difficulty {
  id: 'rookie' | 'pro' | 'master' | 'legend';
  name: string;
  reactionSpeed: number;
  returnErrorChance: number;
  rallyTarget: number;
  color: string;
  badge: string;
}

const DIFFICULTIES: Difficulty[] = [
  { id: 'rookie', name: 'Rookie Cup', reactionSpeed: 0.10, returnErrorChance: 0.28, rallyTarget: 4, color: 'text-emerald-400', badge: 'BEGINNER' },
  { id: 'pro', name: 'Pro Open', reactionSpeed: 0.18, returnErrorChance: 0.14, rallyTarget: 8, color: 'text-cyan-400', badge: 'PRO' },
  { id: 'master', name: 'Master Tour', reactionSpeed: 0.26, returnErrorChance: 0.06, rallyTarget: 14, color: 'text-amber-400', badge: 'MASTER' },
  { id: 'legend', name: 'World Legend', reactionSpeed: 0.38, returnErrorChance: 0.02, rallyTarget: 20, color: 'text-rose-500', badge: 'LEGEND' },
];

export const CyberTableTennis3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Match State
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'point_won' | 'gameover' | 'paddles'>('menu');
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [server, setServer] = useState<'player' | 'opponent'>('player');
  const [rallyCount, setRallyCount] = useState<number>(0);
  const [servePrompt, setServePrompt] = useState<string | null>(null);
  const [stuntMessage, setStuntMessage] = useState<string | null>(null);
  const [selectedDifficultyIdx, setSelectedDifficultyIdx] = useState<number>(1);
  const [selectedPaddleIdx, setSelectedPaddleIdx] = useState<number>(0);
  const [matchTarget] = useState<number>(7); // First to 7 points with 2-point lead
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [highStreak, setHighStreak] = useState<number>(() => {
    return parseInt(localStorage.getItem('novaplay_tt_streak') || '0', 10);
  });

  // Table Tennis Dimensions (in 3D world units)
  const TABLE_W = 3.2; // Width (X)
  const TABLE_L = 5.6; // Length (Z)
  const TABLE_H = 1.45; // Height (Y)
  const NET_H = 0.32; // Net height

  const keysRef = useRef<{ [key: string]: boolean }>({});

  // 3D & Physics State
  const simState = useRef({
    gameState: 'menu' as 'menu' | 'playing' | 'point_won' | 'gameover' | 'paddles',
    playerScore: 0,
    opponentScore: 0,
    currentServer: 'player' as 'player' | 'opponent',
    rallyCount: 0,
    lastHitBy: 'none' as 'none' | 'player' | 'opponent',
    bouncesOnPlayerSide: 0,
    bouncesOnOpponentSide: 0,
    ballInPlay: false,
    servingPhase: 'waiting_for_serve' as 'waiting_for_serve' | 'in_flight',
    
    // Ball Physics State
    ballPos: new THREE.Vector3(0, TABLE_H + 0.28, TABLE_L * 0.38),
    ballVel: new THREE.Vector3(0, 0, 0),
    ballSpin: new THREE.Vector3(0, 0, 0),

    // Paddle Target / Current Positions
    playerPaddlePos: new THREE.Vector3(0, TABLE_H + 0.3, TABLE_L * 0.46),
    playerPaddleVel: new THREE.Vector3(0, 0, 0),
    opponentPaddlePos: new THREE.Vector3(0, TABLE_H + 0.3, -TABLE_L * 0.46),
    
    // Mouse / Touch Tracking
    targetX: 0,
    targetY: TABLE_H + 0.3,
    lastInputTime: 0,
    isInputDown: false,
    
    // Bot AI timer
    botServeTimer: 0,

    // Settings
    difficulty: DIFFICULTIES[1],
    paddleSkin: PADDLE_SKINS[0],
    pointWinner: 'none' as 'player' | 'opponent' | 'none',
  });

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    ballMesh: THREE.Mesh;
    ballShadow: THREE.Mesh;
    landingTargetRing: THREE.Mesh;
    playerPaddleMesh: THREE.Group;
    opponentPaddleMesh: THREE.Group;
    sparkParticles: THREE.Points;
    sparkPositions: Float32Array;
    sparkVels: Float32Array;
    trailMesh: THREE.Line;
    trailPoints: THREE.Vector3[];
  } | null>(null);

  // Initialize Three.js 3D Arena
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.035);

    // 2. Pro Broadcast Perspective Camera (Elevated for crystal clear depth)
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 100);
    camera.position.set(0, 3.8, 5.0);
    camera.lookAt(0, 1.45, -0.6);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Stadium Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const mainSpot = new THREE.SpotLight(0x00f0ff, 3.0, 30, Math.PI / 3, 0.35);
    mainSpot.position.set(0, 9, 3);
    mainSpot.target.position.set(0, TABLE_H, 0);
    scene.add(mainSpot);
    scene.add(mainSpot.target);

    const backSpot = new THREE.SpotLight(0xf43f5e, 2.5, 30, Math.PI / 3, 0.35);
    backSpot.position.set(0, 8, -4);
    backSpot.target.position.set(0, TABLE_H, -1);
    scene.add(backSpot);
    scene.add(backSpot.target);

    // 5. Arena Floor & Neon Grid
    const floorGeo = new THREE.PlaneGeometry(32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x050b14,
      roughness: 0.6,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    const grid = new THREE.GridHelper(26, 26, 0x00f0ff, 0x1e293b);
    grid.position.y = 0.01;
    scene.add(grid);

    // 6. 3D Ping Pong Table Construction
    const tableGroup = new THREE.Group();

    // Table Top (ITTF Tournament Blue)
    const tableTopGeo = new THREE.BoxGeometry(TABLE_W, 0.1, TABLE_L);
    const tableTopMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Matte Blue
      roughness: 0.35,
      metalness: 0.1,
    });
    const tableTop = new THREE.Mesh(tableTopGeo, tableTopMat);
    tableTop.position.y = TABLE_H;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    // White Boundary Lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // Center Division Line
    const centerLineGeo = new THREE.PlaneGeometry(0.02, TABLE_L - 0.02);
    const centerLine = new THREE.Mesh(centerLineGeo, lineMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.set(0, TABLE_H + 0.052, 0);
    tableGroup.add(centerLine);

    // Outer Side Borders
    const sideBorderGeo = new THREE.PlaneGeometry(0.04, TABLE_L);
    const leftBorder = new THREE.Mesh(sideBorderGeo, lineMat);
    leftBorder.rotation.x = -Math.PI / 2;
    leftBorder.position.set(-TABLE_W / 2 + 0.02, TABLE_H + 0.052, 0);
    tableGroup.add(leftBorder);

    const rightBorder = new THREE.Mesh(sideBorderGeo, lineMat);
    rightBorder.rotation.x = -Math.PI / 2;
    rightBorder.position.set(TABLE_W / 2 - 0.02, TABLE_H + 0.052, 0);
    tableGroup.add(rightBorder);

    // End Borders
    const endBorderGeo = new THREE.PlaneGeometry(TABLE_W, 0.04);
    const nearBorder = new THREE.Mesh(endBorderGeo, lineMat);
    nearBorder.rotation.x = -Math.PI / 2;
    nearBorder.position.set(0, TABLE_H + 0.052, TABLE_L / 2 - 0.02);
    tableGroup.add(nearBorder);

    const farBorder = new THREE.Mesh(endBorderGeo, lineMat);
    farBorder.rotation.x = -Math.PI / 2;
    farBorder.position.set(0, TABLE_H + 0.052, -TABLE_L / 2 + 0.02);
    tableGroup.add(farBorder);

    // 4 Metallic Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const legOffsets = [
      [-TABLE_W * 0.42, TABLE_L * 0.42],
      [TABLE_W * 0.42, TABLE_L * 0.42],
      [-TABLE_W * 0.42, -TABLE_L * 0.42],
      [TABLE_W * 0.42, -TABLE_L * 0.42],
    ];
    legOffsets.forEach(([lx, lz]) => {
      const legGeo = new THREE.CylinderGeometry(0.05, 0.05, TABLE_H, 12);
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, TABLE_H / 2, lz);
      tableGroup.add(leg);
    });

    // 7. Net Assembly
    const netMeshGeo = new THREE.PlaneGeometry(TABLE_W + 0.35, NET_H);
    const netMeshMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const net = new THREE.Mesh(netMeshGeo, netMeshMat);
    net.position.set(0, TABLE_H + 0.05 + NET_H / 2, 0);
    tableGroup.add(net);

    // Net Top White Tape
    const netTapeGeo = new THREE.BoxGeometry(TABLE_W + 0.35, 0.03, 0.02);
    const netTape = new THREE.Mesh(netTapeGeo, lineMat);
    netTape.position.set(0, TABLE_H + 0.05 + NET_H, 0);
    tableGroup.add(netTape);

    // Net Metal Posts
    const postGeo = new THREE.CylinderGeometry(0.03, 0.03, NET_H + 0.06, 8);
    const leftPost = new THREE.Mesh(postGeo, legMat);
    leftPost.position.set(-(TABLE_W + 0.35) / 2, TABLE_H + 0.05 + NET_H / 2, 0);
    const rightPost = new THREE.Mesh(postGeo, legMat);
    rightPost.position.set((TABLE_W + 0.35) / 2, TABLE_H + 0.05 + NET_H / 2, 0);
    tableGroup.add(leftPost);
    tableGroup.add(rightPost);

    scene.add(tableGroup);

    // 8. 3D Ping Pong Ball
    const ballGeo = new THREE.SphereGeometry(0.068, 24, 24);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xfff066, // Fluorescent Tournament Yellow
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0x443300,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    ballMesh.position.set(0, TABLE_H + 0.28, TABLE_L * 0.38);
    scene.add(ballMesh);

    // Ball Ground Shadow
    const shadowGeo = new THREE.CircleGeometry(0.08, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
    const ballShadow = new THREE.Mesh(shadowGeo, shadowMat);
    ballShadow.rotation.x = -Math.PI / 2;
    ballShadow.position.set(0, TABLE_H + 0.052, 0);
    scene.add(ballShadow);

    // 9. Predicted Landing Target Ring on Table
    const ringGeo = new THREE.RingGeometry(0.12, 0.16, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const landingTargetRing = new THREE.Mesh(ringGeo, ringMat);
    landingTargetRing.rotation.x = -Math.PI / 2;
    landingTargetRing.position.set(0, TABLE_H + 0.054, 0);
    scene.add(landingTargetRing);

    // 10. Motion Trail
    const maxTrailPoints = 12;
    const trailPoints = Array.from({ length: maxTrailPoints }, () => new THREE.Vector3(0, TABLE_H + 0.28, 0));
    const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
    const trailMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5, linewidth: 2 });
    const trailMesh = new THREE.Line(trailGeo, trailMat);
    scene.add(trailMesh);

    // 11. Paddle Mesh Generator
    const createPaddle = (rubberColorHex: number, bladeColorHex: number) => {
      const paddle = new THREE.Group();

      // Blade Oval
      const bladeGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.03, 24);
      bladeGeo.scale(1.0, 1.0, 1.15);
      const bladeMat = new THREE.MeshStandardMaterial({ color: bladeColorHex, roughness: 0.5 });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      paddle.add(blade);

      // Front Red/Cyan Rubber
      const rubberGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.015, 24);
      rubberGeo.scale(1.0, 1.0, 1.15);
      const rubberMat = new THREE.MeshStandardMaterial({ color: rubberColorHex, roughness: 0.3 });
      const rubberFront = new THREE.Mesh(rubberGeo, rubberMat);
      rubberFront.position.y = 0.016;
      paddle.add(rubberFront);

      // Back Black Rubber
      const backMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3 });
      const rubberBack = new THREE.Mesh(rubberGeo, backMat);
      rubberBack.position.y = -0.016;
      paddle.add(rubberBack);

      // Wooden Handle
      const handleGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.35, 12);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(0, 0, 0.45);
      handle.rotation.x = Math.PI / 2;
      paddle.add(handle);

      paddle.rotation.x = Math.PI / 2;
      return paddle;
    };

    const playerPaddleMesh = createPaddle(simState.current.paddleSkin.rubberColor, simState.current.paddleSkin.bladeColor);
    playerPaddleMesh.position.set(0, TABLE_H + 0.3, TABLE_L * 0.46);
    scene.add(playerPaddleMesh);

    const opponentPaddleMesh = createPaddle(0x0284c7, 0x0f172a);
    opponentPaddleMesh.position.set(0, TABLE_H + 0.3, -TABLE_L * 0.46);
    opponentPaddleMesh.rotation.y = Math.PI;
    scene.add(opponentPaddleMesh);

    // 12. Sparks Particle System
    const sparkCount = 50;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVels = new Float32Array(sparkCount * 3);
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xfff066,
      size: 0.14,
      transparent: true,
      opacity: 0.9,
    });
    const sparkParticles = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparkParticles);

    sceneRefs.current = {
      scene,
      camera,
      renderer,
      ballMesh,
      ballShadow,
      landingTargetRing,
      playerPaddleMesh,
      opponentPaddleMesh,
      sparkParticles,
      sparkPositions,
      sparkVels,
      trailMesh,
      trailPoints,
    };

    // --- MOUSE & TOUCH EVENT HANDLERS ---
    const updateInputPosition = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((clientY - rect.top) / rect.height) * 2 - 1);

      // Smooth horizontal range across player side
      const mappedX = normX * (TABLE_W * 0.62);
      const mappedY = THREE.MathUtils.clamp(TABLE_H + 0.25 + (normY + 0.2) * 0.8, TABLE_H + 0.12, TABLE_H + 0.85);

      const now = performance.now();
      const dt = Math.max((now - simState.current.lastInputTime) / 1000, 0.016);
      const vx = (mappedX - simState.current.playerPaddlePos.x) / dt;
      const vy = (mappedY - simState.current.playerPaddlePos.y) / dt;

      simState.current.playerPaddleVel.set(vx * 0.25, vy * 0.25, 0);
      simState.current.targetX = mappedX;
      simState.current.targetY = mappedY;
      simState.current.lastInputTime = now;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (simState.current.gameState !== 'playing') return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      updateInputPosition(clientX, clientY);
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      simState.current.isInputDown = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      updateInputPosition(clientX, clientY);

      // If waiting for player serve, launch serve instantly on click/tap
      if (simState.current.servingPhase === 'waiting_for_serve' && simState.current.currentServer === 'player') {
        launchServe('player');
      }
    };

    const handlePointerUp = () => {
      simState.current.isInputDown = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if ((e.key === ' ' || e.key === 'Enter') && simState.current.gameState === 'playing') {
        if (simState.current.servingPhase === 'waiting_for_serve' && simState.current.currentServer === 'player') {
          launchServe('player');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('touchmove', handlePointerMove, { passive: true });
    container.addEventListener('mousedown', handlePointerDown);
    container.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- ANIMATION & 60 FPS ENGINE LOOP ---
    let animId = 0;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 1000, 0.033);
      lastTime = time;

      const sim = simState.current;
      const refs = sceneRefs.current;
      if (!refs) return;

      // Keyboard Controls (Arrow keys & A / D)
      if (keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A']) {
        sim.targetX = Math.max(sim.targetX - 5.5 * dt, -TABLE_W * 0.55);
      }
      if (keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D']) {
        sim.targetX = Math.min(sim.targetX + 5.5 * dt, TABLE_W * 0.55);
      }

      // Smart Assist on Player Paddle Height:
      // When ball is approaching player side, naturally elevate paddle towards ball height
      let desiredY = sim.targetY;
      if (sim.ballInPlay && sim.ballPos.z > 0.3) {
        desiredY = THREE.MathUtils.lerp(desiredY, THREE.MathUtils.clamp(sim.ballPos.y, TABLE_H + 0.15, TABLE_H + 0.8), 0.45);
      }

      sim.playerPaddlePos.x = THREE.MathUtils.lerp(sim.playerPaddlePos.x, sim.targetX, 0.42);
      sim.playerPaddlePos.y = THREE.MathUtils.lerp(sim.playerPaddlePos.y, desiredY, 0.42);
      sim.playerPaddlePos.z = TABLE_L * 0.46;

      refs.playerPaddleMesh.position.copy(sim.playerPaddlePos);
      refs.playerPaddleMesh.rotation.z = -sim.playerPaddleVel.x * 0.05;
      refs.playerPaddleMesh.rotation.x = Math.PI / 2 - (sim.playerPaddlePos.y - TABLE_H) * 0.25;

      // --- GAMEPLAY & RALLY SIMULATION ---
      if (sim.gameState === 'playing') {
        if (sim.servingPhase === 'waiting_for_serve') {
          if (sim.currentServer === 'player') {
            // Ball rests ready next to player's paddle
            sim.ballPos.set(sim.playerPaddlePos.x + 0.18, sim.playerPaddlePos.y + 0.15, sim.playerPaddlePos.z - 0.28);
            sim.ballVel.set(0, 0, 0);
          } else {
            // Bot prepares serve with a smooth 1-second countdown
            sim.botServeTimer += dt;
            sim.opponentPaddlePos.x = THREE.MathUtils.lerp(sim.opponentPaddlePos.x, Math.sin(time * 0.003) * 0.8, 0.08);
            sim.ballPos.set(sim.opponentPaddlePos.x, TABLE_H + 0.32, -TABLE_L * 0.42);
            sim.ballVel.set(0, 0, 0);

            if (sim.botServeTimer > 1.2) {
              launchServe('opponent');
              sim.botServeTimer = 0;
            }
          }
        } else if (sim.servingPhase === 'in_flight') {
          // 1. Aerodynamic Physics: Gravity + Spin + Drag
          sim.ballVel.y -= 9.4 * dt;
          sim.ballVel.x += sim.ballSpin.y * 2.0 * dt; // Sidespin curve
          sim.ballVel.z += sim.ballSpin.x * 1.0 * dt; // Topspin pull down

          sim.ballPos.x += sim.ballVel.x * dt;
          sim.ballPos.y += sim.ballVel.y * dt;
          sim.ballPos.z += sim.ballVel.z * dt;

          // 2. Table Bounce Collision (Elastic Restitution)
          if (
            sim.ballPos.y <= TABLE_H + 0.068 &&
            sim.ballPos.y >= TABLE_H - 0.12 &&
            Math.abs(sim.ballPos.x) <= TABLE_W / 2 &&
            Math.abs(sim.ballPos.z) <= TABLE_L / 2
          ) {
            sim.ballPos.y = TABLE_H + 0.068;
            sim.ballVel.y = Math.abs(sim.ballVel.y) * 0.88; // Crisp table rebound
            sound.playClick();

            if (sim.ballPos.z > 0) {
              sim.bouncesOnPlayerSide++;
              if (sim.bouncesOnPlayerSide >= 2) {
                awardPoint('opponent', 'Double bounce on player side');
              }
            } else {
              sim.bouncesOnOpponentSide++;
              if (sim.bouncesOnOpponentSide >= 2) {
                awardPoint('player', 'Double bounce on bot side');
              }
            }
          }

          // 3. Net Collision
          if (Math.abs(sim.ballPos.z) < 0.14 && sim.ballPos.y < TABLE_H + NET_H) {
            sim.ballVel.z *= -0.35;
            sound.playClick();
          }

          // 4. Player Paddle Hit Detection (ALWAYS returns ball, NEVER awards point on contact)
          const dx = Math.abs(sim.ballPos.x - sim.playerPaddlePos.x);
          const dy = Math.abs(sim.ballPos.y - sim.playerPaddlePos.y);
          const dz = Math.abs(sim.ballPos.z - sim.playerPaddlePos.z);

          if (
            dx < 0.75 &&
            dy < 0.85 &&
            dz < 0.70 &&
            sim.ballVel.z > 0 && // Moving towards player
            sim.ballPos.z > 0.1 // On player side
          ) {
            // Calculate returned shot angle & speed based on paddle impact offset
            const offsetX = (sim.ballPos.x - sim.playerPaddlePos.x) * 2.5;
            const swingSpeed = THREE.MathUtils.clamp(sim.playerPaddleVel.length() * 0.6 + 1.0, 1.0, 2.2);
            const isSmash = sim.ballPos.y > TABLE_H + 0.45 && swingSpeed > 1.4;

            const returnVelZ = - (11.5 + swingSpeed * 3.5) * sim.paddleSkin.speedBonus;
            const returnVelY = (3.2 + (isSmash ? 0.6 : 1.6)) * (isSmash ? 0.65 : 1.0);
            const returnVelX = offsetX * 5.5 + sim.playerPaddleVel.x * 0.4;

            sim.ballVel.set(returnVelX, returnVelY, returnVelZ);
            sim.ballSpin.set(isSmash ? 2.5 : 0.8, -offsetX * 2.2, 0);
            sim.lastHitBy = 'player';
            sim.bouncesOnPlayerSide = 0;
            sim.bouncesOnOpponentSide = 0;
            sim.rallyCount++;
            setRallyCount(sim.rallyCount);

            if (isSmash) {
              sound.playLaser();
              triggerSmashSparks(sim.ballPos);
              triggerStunt('💥 POWER SMASH!');
            } else {
              sound.playJump();
            }
          }

          // 5. Smart Adaptive AI Bot Movement & Return (ALWAYS returns ball when in range)
          const diff = sim.difficulty;
          let aiTargetX = THREE.MathUtils.clamp(sim.ballPos.x, -TABLE_W * 0.42, TABLE_W * 0.42);
          let aiTargetY = THREE.MathUtils.clamp(sim.ballPos.y, TABLE_H + 0.15, TABLE_H + 0.75);

          // Simulated error chance for bot on difficult smashes
          if (Math.random() < diff.returnErrorChance * 0.04) {
            aiTargetX += (Math.random() - 0.5) * 1.2;
          }

          sim.opponentPaddlePos.x = THREE.MathUtils.lerp(sim.opponentPaddlePos.x, aiTargetX, diff.reactionSpeed);
          sim.opponentPaddlePos.y = THREE.MathUtils.lerp(sim.opponentPaddlePos.y, aiTargetY, diff.reactionSpeed);
          refs.opponentPaddleMesh.position.copy(sim.opponentPaddlePos);

          const bdx = Math.abs(sim.ballPos.x - sim.opponentPaddlePos.x);
          const bdy = Math.abs(sim.ballPos.y - sim.opponentPaddlePos.y);
          const bdz = Math.abs(sim.ballPos.z - sim.opponentPaddlePos.z);

          if (
            bdx < 0.75 &&
            bdy < 0.85 &&
            bdz < 0.70 &&
            sim.ballVel.z < 0 && // Moving towards bot
            sim.ballPos.z < -0.1 // On bot side
          ) {
            // Bot returns ball smoothly back to player's half
            const botAimX = (Math.random() - 0.5) * (TABLE_W * 0.65);
            const botReturnZ = 10.5 + Math.random() * 2.0;
            const botReturnY = 3.2 + Math.random() * 0.8;

            sim.ballVel.set((botAimX - sim.opponentPaddlePos.x) * 1.5, botReturnY, botReturnZ);
            sim.ballSpin.set(0.5, (Math.random() - 0.5) * 1.2, 0);
            sim.lastHitBy = 'opponent';
            sim.bouncesOnPlayerSide = 0;
            sim.bouncesOnOpponentSide = 0;
            sim.rallyCount++;
            setRallyCount(sim.rallyCount);
            sound.playClick();
          }

          // 6. Missed Ball & Out of Bounds Point Awarding
          // A) Ball flew past player or fell on player's side
          if (sim.ballPos.z > TABLE_L * 0.52 || (sim.ballPos.z > 0 && sim.ballPos.y < TABLE_H - 0.15)) {
            if (sim.bouncesOnPlayerSide >= 1) {
              // Bot hit a valid ball onto table, player missed it -> Bot scores!
              awardPoint('opponent', 'Player missed the ball');
            } else if (sim.lastHitBy === 'opponent') {
              // Bot hit the ball out of bounds without bouncing on table -> Player scores!
              awardPoint('player', 'Bot hit out of bounds');
            } else {
              awardPoint('opponent', 'Ball out of bounds');
            }
          }
          // B) Ball flew past bot or fell on bot's side
          else if (sim.ballPos.z < -TABLE_L * 0.52 || (sim.ballPos.z < 0 && sim.ballPos.y < TABLE_H - 0.15)) {
            if (sim.bouncesOnOpponentSide >= 1) {
              // Player hit a valid shot onto table, bot missed it -> Player scores!
              awardPoint('player', 'Winner shot! Bot missed');
            } else if (sim.lastHitBy === 'player') {
              // Player hit the ball out of bounds without bouncing on table -> Bot scores!
              awardPoint('opponent', 'Player hit out of bounds');
            } else {
              awardPoint('player', 'Winner return');
            }
          }
        }

        // Update 3D Ball & Projected Shadow
        refs.ballMesh.position.copy(sim.ballPos);
        refs.ballShadow.position.set(sim.ballPos.x, TABLE_H + 0.052, sim.ballPos.z);
        const shadowScale = THREE.MathUtils.clamp(1.0 - (sim.ballPos.y - TABLE_H) * 0.5, 0.2, 1.2);
        refs.ballShadow.scale.set(shadowScale, shadowScale, shadowScale);

        // Update Predicted Landing Ring
        if (sim.servingPhase === 'in_flight') {
          refs.landingTargetRing.visible = true;
          // Approximate next landing X, Z
          const tToLand = Math.max((sim.ballPos.y - (TABLE_H + 0.068)) / 4.5, 0);
          const predX = THREE.MathUtils.clamp(sim.ballPos.x + sim.ballVel.x * tToLand, -TABLE_W / 2, TABLE_W / 2);
          const predZ = THREE.MathUtils.clamp(sim.ballPos.z + sim.ballVel.z * tToLand, -TABLE_L / 2, TABLE_L / 2);
          refs.landingTargetRing.position.set(predX, TABLE_H + 0.054, predZ);
        } else {
          refs.landingTargetRing.visible = false;
        }

        // Update Motion Trail
        refs.trailPoints.pop();
        refs.trailPoints.unshift(sim.ballPos.clone());
        refs.trailMesh.geometry.setFromPoints(refs.trailPoints);
      }

      // Update Sparks
      for (let i = 0; i < sparkCount; i++) {
        refs.sparkPositions[i * 3] += refs.sparkVels[i * 3] * dt;
        refs.sparkPositions[i * 3 + 1] += refs.sparkVels[i * 3 + 1] * dt;
        refs.sparkPositions[i * 3 + 2] += refs.sparkVels[i * 3 + 2] * dt;
      }
      refs.sparkParticles.geometry.attributes.position.needsUpdate = true;

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
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('touchmove', handlePointerMove);
      container.removeEventListener('mousedown', handlePointerDown);
      container.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Launch Table Tennis Serve (Legal high-arc trajectory)
  const launchServe = (who: 'player' | 'opponent') => {
    const sim = simState.current;
    sim.servingPhase = 'in_flight';
    sim.ballInPlay = true;
    sim.lastHitBy = who;
    sim.bouncesOnPlayerSide = 0;
    sim.bouncesOnOpponentSide = 0;
    sim.rallyCount = 0;
    setRallyCount(0);
    setServePrompt(null);
    sound.playJump();

    if (who === 'player') {
      // Clean serve landing on player's half, then arching over net onto opponent's side
      sim.ballVel.set((sim.targetX) * 1.6, -2.4, -9.8 * sim.paddleSkin.speedBonus);
    } else {
      sim.ballVel.set((Math.random() - 0.5) * 1.5, -2.4, 9.8);
    }
  };

  // Trigger Sparks Explosion
  const triggerSmashSparks = (pos: THREE.Vector3) => {
    const refs = sceneRefs.current;
    if (!refs) return;

    for (let i = 0; i < 50; i++) {
      refs.sparkPositions[i * 3] = pos.x;
      refs.sparkPositions[i * 3 + 1] = pos.y;
      refs.sparkPositions[i * 3 + 2] = pos.z;

      refs.sparkVels[i * 3] = (Math.random() - 0.5) * 9;
      refs.sparkVels[i * 3 + 1] = Math.random() * 7;
      refs.sparkVels[i * 3 + 2] = (Math.random() - 0.5) * 9;
    }
    refs.sparkParticles.geometry.attributes.position.needsUpdate = true;
  };

  // Stunt Notification
  const triggerStunt = (msg: string) => {
    setStuntMessage(msg);
    setTimeout(() => setStuntMessage(null), 1400);
  };

  // Award Point
  const awardPoint = (winner: 'player' | 'opponent', reason: string) => {
    const sim = simState.current;
    if (sim.gameState !== 'playing') return;

    sim.gameState = 'point_won';
    sim.ballInPlay = false;
    sim.pointWinner = winner;

    let nextP = sim.playerScore;
    let nextO = sim.opponentScore;

    if (winner === 'player') {
      nextP++;
      sim.playerScore = nextP;
      setPlayerScore(nextP);
      sound.playPowerup();
      triggerStunt(`⭐ POINT WON!`);
    } else {
      nextO++;
      sim.opponentScore = nextO;
      setOpponentScore(nextO);
      sound.playGameOver();
      triggerStunt(`❌ POINT LOST`);
    }

    // Match End Condition
    const hasWon = (nextP >= matchTarget || nextO >= matchTarget) && Math.abs(nextP - nextO) >= 2;

    if (hasWon) {
      setTimeout(() => {
        sim.gameState = 'gameover';
        setGameState('gameover');
        if (nextP > nextO) {
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          const newStreak = highStreak + 1;
          setHighStreak(newStreak);
          localStorage.setItem('novaplay_tt_streak', String(newStreak));
        }
      }, 1200);
    } else {
      // Alternate server every 2 points
      const totalPoints = nextP + nextO;
      const nextServer = Math.floor(totalPoints / 2) % 2 === 0 ? 'player' : 'opponent';
      sim.currentServer = nextServer;
      setServer(nextServer);

      setTimeout(() => {
        sim.gameState = 'playing';
        sim.servingPhase = 'waiting_for_serve';
        sim.botServeTimer = 0;
        setGameState('playing');
        if (nextServer === 'player') {
          setServePrompt('TAP / CLICK TO SERVE');
        } else {
          setServePrompt('BOT SERVING...');
        }
      }, 1400);
    }
  };

  // Start New Match
  const startMatch = () => {
    const sim = simState.current;
    sim.playerScore = 0;
    sim.opponentScore = 0;
    sim.currentServer = 'player';
    sim.rallyCount = 0;
    sim.servingPhase = 'waiting_for_serve';
    sim.gameState = 'playing';
    sim.ballInPlay = false;
    sim.difficulty = DIFFICULTIES[selectedDifficultyIdx];
    sim.paddleSkin = PADDLE_SKINS[selectedPaddleIdx];
    sim.botServeTimer = 0;

    setPlayerScore(0);
    setOpponentScore(0);
    setServer('player');
    setRallyCount(0);
    setServePrompt('TAP / CLICK TO SERVE');
    setGameState('playing');
    sound.playClick();
  };

  const handleToggleSound = () => {
    const nextMuted = sound.toggleMute();
    setMuted(nextMuted);
  };

  // Mobile Manual Serve / Hit Button
  const handleMobileServe = () => {
    if (simState.current.servingPhase === 'waiting_for_serve' && simState.current.currentServer === 'player') {
      launchServe('player');
    }
  };

  return (
    <div className="relative w-full h-[520px] sm:h-[600px] md:h-[700px] lg:h-[750px] max-h-[85vh] bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)] select-none flex flex-col items-center justify-center font-sans touch-none">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* STUNT POPUP */}
      {stuntMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/30 via-pink-500/30 to-amber-500/30 border border-cyan-400 text-white font-black text-xs sm:text-sm tracking-wider uppercase backdrop-blur-md animate-bounce z-20 pointer-events-none shadow-[0_0_20px_rgba(0,240,255,0.5)]">
          {stuntMessage}
        </div>
      )}

      {/* IN-GAME HEADS-UP DISPLAY (HUD) */}
      {(gameState === 'playing' || gameState === 'point_won') && (
        <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex items-center justify-between pointer-events-none z-10 gap-2">
          {/* Match Scoreboard */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center bg-slate-900/90 border border-cyan-500/40 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl backdrop-blur-md shadow-lg gap-2 sm:gap-4">
              {/* Player Score */}
              <div className="flex flex-col items-center">
                <span className="text-[9px] sm:text-[10px] font-black text-cyan-400 uppercase">YOU</span>
                <span className="text-xl sm:text-3xl font-black text-white">{playerScore}</span>
              </div>

              <div className="text-slate-500 font-bold text-xs sm:text-sm">:</div>

              {/* Bot Score */}
              <div className="flex flex-col items-center">
                <span className="text-[9px] sm:text-[10px] font-black text-rose-400 uppercase">BOT</span>
                <span className="text-xl sm:text-3xl font-black text-white">{opponentScore}</span>
              </div>
            </div>

            {/* Server Badge */}
            <div className="hidden sm:flex flex-col bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-2xl backdrop-blur-md text-[10px] font-bold">
              <span className="text-slate-400 uppercase tracking-widest">SERVER</span>
              <span className={server === 'player' ? 'text-cyan-400' : 'text-rose-400'}>
                {server === 'player' ? 'YOUR SERVE' : 'BOT SERVING'}
              </span>
            </div>

            {/* Rally Meter */}
            {rallyCount > 1 && (
              <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-black text-xs animate-pulse">
                ⚡ {rallyCount} RALLY
              </div>
            )}
          </div>

          {/* Sound & Controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={handleToggleSound}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <button
              onClick={() => setGameState('menu')}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer text-xs font-bold"
            >
              MENU
            </button>
          </div>
        </div>
      )}

      {/* SERVE ACTION PROMPT OVERLAY */}
      {gameState === 'playing' && simState.current.servingPhase === 'waiting_for_serve' && (
        <div className="absolute bottom-6 inset-x-0 flex items-center justify-center pointer-events-auto z-10 px-4">
          {server === 'player' ? (
            <button
              onClick={handleMobileServe}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 border-2 border-cyan-300 text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(0,240,255,0.6)] animate-pulse hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <Target className="w-4 h-4" />
              <span>TAP / CLICK TO SERVE BALL</span>
            </button>
          ) : (
            <div className="px-5 py-2 rounded-full bg-slate-950/85 border border-rose-500/40 text-rose-300 text-xs sm:text-sm font-bold backdrop-blur-md shadow-lg flex items-center gap-2 animate-pulse">
              <span>🤖 BOT PREPARING SERVE...</span>
            </div>
          )}
        </div>
      )}

      {/* 1. MAIN MENU OVERLAY */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 z-30 text-center animate-fade-in overflow-y-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xs tracking-widest uppercase mb-2 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>3D Pro Table Tennis & Ping Pong</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-rose-500 to-amber-300 tracking-wider mb-2 drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">
            TABLE TENNIS 3D PRO
          </h1>
          <p className="text-cyan-300/80 max-w-lg text-xs sm:text-sm md:text-base font-medium mb-5">
            Experience authentic paddle physics, topspin curve trajectories, fast rallies, and high-velocity smashes against adaptive AI opponents!
          </p>

          {/* Difficulty Selection */}
          <div className="w-full max-w-md mb-5">
            <div className="text-xs font-bold text-slate-400 text-left mb-2">SELECT TOURNAMENT CUP:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIFFICULTIES.map((d, idx) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedDifficultyIdx(idx);
                    sound.playClick();
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                    selectedDifficultyIdx === idx
                      ? 'bg-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)] text-white scale-105'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className={d.color}>{d.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setGameState('paddles')}
              className="px-5 sm:px-6 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <span>PADDLE ARMORY</span>
            </button>

            <button
              onClick={startMatch}
              className="px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-rose-500 via-purple-600 to-cyan-500 hover:from-rose-400 hover:to-cyan-400 text-white font-black text-base sm:text-lg tracking-wider uppercase shadow-[0_0_30px_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>START MATCH</span>
            </button>
          </div>

          {highStreak > 0 && (
            <div className="flex items-center gap-2 mt-5 text-amber-400 text-xs sm:text-sm font-bold">
              <Trophy className="w-4 h-4" />
              <span>CHAMPIONSHIP WIN STREAK: {highStreak} MATCHES</span>
            </div>
          )}
        </div>
      )}

      {/* 2. PADDLE CUSTOMIZATION OVERLAY */}
      {gameState === 'paddles' && (
        <div className="absolute inset-0 bg-slate-950/94 backdrop-blur-lg flex flex-col items-center justify-center p-4 sm:p-6 z-30 text-center animate-fade-in overflow-y-auto">
          <h2 className="text-xl sm:text-3xl font-black text-cyan-400 tracking-wider mb-2">PRO PADDLE ARMORY</h2>
          <p className="text-slate-400 text-xs sm:text-sm mb-5">Select your custom blade rubbers with velocity and spin modifiers.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full mb-6">
            {PADDLE_SKINS.map((skin, idx) => {
              const isSelected = selectedPaddleIdx === idx;
              return (
                <div
                  key={skin.id}
                  onClick={() => {
                    setSelectedPaddleIdx(idx);
                    sound.playClick();
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-900/95 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.4)] scale-102'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full border-2 border-white/20 shadow-md flex items-center justify-center"
                      style={{ backgroundColor: skin.glowColor }}
                    >
                      <span className="text-slate-950 text-xs font-black">🏓</span>
                    </div>
                    <div>
                      <div className="font-black text-white text-sm">{skin.name}</div>
                      <div className="text-[11px] text-cyan-400 font-bold">
                        SPEED x{skin.speedBonus} • SPIN x{skin.spinBonus}
                      </div>
                    </div>
                  </div>

                  <span className={`text-xs font-bold ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {isSelected ? 'EQUIPPED' : 'EQUIP'}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setGameState('menu')}
            className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm tracking-wider cursor-pointer"
          >
            BACK TO MENU
          </button>
        </div>
      )}

      {/* 3. GAME OVER OVERLAY */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/94 backdrop-blur-lg flex flex-col items-center justify-center p-4 sm:p-6 z-30 text-center animate-fade-in">
          <div
            className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white mb-3 shadow-2xl animate-bounce ${
              playerScore > opponentScore
                ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-yellow-500/40'
                : 'bg-gradient-to-tr from-rose-600 to-pink-600 shadow-rose-500/40'
            }`}
          >
            {playerScore > opponentScore ? <Trophy className="w-8 h-8" /> : <Flame className="w-8 h-8" />}
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-wider mb-1">
            {playerScore > opponentScore ? 'MATCH VICTORY!' : 'MATCH DEFEAT'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-5">
            {playerScore > opponentScore
              ? `You conquered the ${DIFFICULTIES[selectedDifficultyIdx].name} Tournament!`
              : 'Keep practicing your paddle spin and angles!'}
          </p>

          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-4 max-w-xs w-full mb-6 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Final Score:</span>
              <span className="text-lg font-black text-white">
                {playerScore} - {opponentScore}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Tournament Cup:</span>
              <span className={`font-bold ${DIFFICULTIES[selectedDifficultyIdx].color}`}>
                {DIFFICULTIES[selectedDifficultyIdx].name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setGameState('menu')}
              className="px-5 sm:px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-bold text-xs sm:text-sm tracking-wider uppercase cursor-pointer"
            >
              MAIN MENU
            </button>

            <button
              onClick={startMatch}
              className="px-6 sm:px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(0,240,255,0.5)] hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>REMATCH</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CyberTableTennis3D;
