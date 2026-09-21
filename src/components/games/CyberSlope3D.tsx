import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  Trophy, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Play, 
  Gauge, Magnet, Compass, ArrowLeft, ChevronRight, HelpCircle, Star, Flame, Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// TYPES & CONFIG
// ----------------------------------------------------

export interface SlopeBallSkin {
  id: string;
  name: string;
  nameGuj: string;
  price: number;
  unlocked: boolean;
  color: number;
  emissive: number;
  roughness: number;
  metalness: number;
  previewEmoji: string;
  description: string;
}

const DEFAULT_SLOPE_SKINS: SlopeBallSkin[] = [
  {
    id: 'neon-pulse',
    name: 'Neon Pulse Cyro',
    nameGuj: 'નિયોન પલ્સ સાયરો',
    price: 0,
    unlocked: true,
    color: 0x00f0ff,
    emissive: 0x0284c7,
    roughness: 0.15,
    metalness: 0.4,
    previewEmoji: '⚡',
    description: 'High-voltage superconducting cyber sphere with electric gyros.',
  },
  {
    id: 'solar-meteor',
    name: 'Solar Meteor',
    nameGuj: 'સોલર મેટિઓર',
    price: 350,
    unlocked: false,
    color: 0xf97316,
    emissive: 0xea580c,
    roughness: 0.2,
    metalness: 0.3,
    previewEmoji: '🔥',
    description: 'Molten plasma fireball that leaves fiery burnout trails on ramps.',
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    nameGuj: 'એમરાલ્ડ મેટ્રિક્સ',
    price: 700,
    unlocked: false,
    color: 0x10b981,
    emissive: 0x059669,
    roughness: 0.15,
    metalness: 0.4,
    previewEmoji: '🧪',
    description: 'Quantum jade gyro ball tuned for ultra-responsive high-speed steering.',
  },
  {
    id: 'void-phantom',
    name: 'Void Phantom',
    nameGuj: 'વોઇડ ફેન્ટમ',
    price: 1200,
    unlocked: false,
    color: 0xa855f7,
    emissive: 0x7c3aed,
    roughness: 0.1,
    metalness: 0.5,
    previewEmoji: '🔮',
    description: 'Dark matter singularity with built-in gravitational magnet pull.',
  },
  {
    id: 'golden-pharaoh',
    name: 'Golden Sun 24K',
    nameGuj: 'ગોલ્ડન સન 24K',
    price: 2000,
    unlocked: false,
    color: 0xfacc15,
    emissive: 0xb45309,
    roughness: 0.1,
    metalness: 0.5,
    previewEmoji: '👑',
    description: '24-carat pure gold sphere that doubles all collected gem values!',
  },
];

const BALL_RADIUS = 0.85;
const TILE_LENGTH = 28.0;

// Track Tile Model
interface TrackTile {
  mesh: THREE.Group;
  zStart: number;
  zEnd: number;
  width: number;
  type: 'straight' | 'ramp_jump' | 'narrow' | 'split';
  hasBoostPad: boolean;
  hasRamp: boolean;
  gemMeshes: { mesh: THREE.Mesh; pos: THREE.Vector3; collected: boolean }[];
  obstacleMeshes: { mesh: THREE.Mesh; pos: THREE.Vector3; hit: boolean }[];
}

export const CyberSlope3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High-level Game States
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [speedKmh, setSpeedKmh] = useState<number>(120);
  const [gemsCollected, setGemsCollected] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyberslope3d_highscore') || '0', 10);
  });
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyberslope3d_coins') || '180', 10);
  });
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [activeSkinId, setActiveSkinId] = useState<string>(() => {
    return localStorage.getItem('cyberslope3d_active_skin') || 'neon-pulse';
  });
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(() => {
    const saved = localStorage.getItem('cyberslope3d_unlocked_skins');
    return saved ? JSON.parse(saved) : ['neon-pulse'];
  });

  // Active Buffs
  const [isNitroBoosting, setIsNitroBoosting] = useState<boolean>(false);
  const [showGarage, setShowGarage] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Input states
  const steerInputRef = useRef<number>(0); // -1 (left) to +1 (right)
  const isPointerDownRef = useRef<boolean>(false);
  const pointerStartXRef = useRef<number>(0);

  const toggleMute = () => {
    const isMute = sound.toggleMute();
    setMuted(isMute);
  };

  // ----------------------------------------------------
  // THREE.JS ENGINE REFS
  // ----------------------------------------------------
  const engineRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    ballGroup: THREE.Group;
    ballMesh: THREE.Mesh;
    ballShadow: THREE.Mesh;
    gyroRing: THREE.Mesh;
    ballMaterial: THREE.MeshStandardMaterial;
    tiles: TrackTile[];
    ballPos: THREE.Vector3;
    ballVel: THREE.Vector3;
    isGrounded: boolean;
    isFallingInVoid: boolean;
    forwardSpeed: number;
    baseSpeed: number;
    maxSpeed: number;
    nitroTimer: number;
    distanceTraveled: number;
    gemsCount: number;
    lastFrameTime: number;
    isRunning: boolean;
    activeSkinConfig: SlopeBallSkin;
  } | null>(null);

  const getSkinConfig = useCallback((skinId: string) => {
    return DEFAULT_SLOPE_SKINS.find((s) => s.id === skinId) || DEFAULT_SLOPE_SKINS[0];
  }, []);

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
    scene.background = new THREE.Color(0x050516);
    scene.fog = new THREE.FogExp2(0x050516, 0.007);

    // Chase Camera with proper near plane
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.05, 500);
    camera.position.set(0, 4.8, 8.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    dirLight.position.set(15, 30, 20);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x00f0ff, 3.0, 35);
    pointLight.position.set(0, 4, 0);
    scene.add(pointLight);

    // Initial Ball Material
    const initialSkin = getSkinConfig(activeSkinId);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: initialSkin.color,
      emissive: initialSkin.emissive,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.35,
    });

    // 3D Sphere Group
    const ballGroup = new THREE.Group();
    ballGroup.position.set(0, BALL_RADIUS, 0);
    scene.add(ballGroup);

    // 3D Full Solid Sphere Mesh
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
    const ballMesh = new THREE.Mesh(ballGeo, ballMaterial);
    ballGroup.add(ballMesh);

    // Inner Glowing Gyroscope Ring
    const gyroGeo = new THREE.TorusGeometry(BALL_RADIUS + 0.03, 0.04, 8, 32);
    const gyroMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const gyroRing = new THREE.Mesh(gyroGeo, gyroMat);
    gyroRing.rotation.y = Math.PI / 4;
    ballMesh.add(gyroRing);

    // Ball Ground Shadow (Flat on y=0.01)
    const shadowGeo = new THREE.PlaneGeometry(BALL_RADIUS * 2.2, BALL_RADIUS * 2.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.65,
    });
    const ballShadow = new THREE.Mesh(shadowGeo, shadowMat);
    ballShadow.rotation.x = -Math.PI / 2;
    ballShadow.position.set(0, 0.02, 0);
    scene.add(ballShadow);

    // Distant Neon City Skyline
    const cityGroup = new THREE.Group();
    for (let i = 0; i < 45; i++) {
      const bW = 8 + Math.random() * 18;
      const bH = 35 + Math.random() * 120;
      const bGeo = new THREE.BoxGeometry(bW, bH, bW);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0x090d24,
        roughness: 0.5,
        metalness: 0.7,
      });
      const building = new THREE.Mesh(bGeo, bMat);
      const angle = (i / 45) * Math.PI * 2;
      const dist = 120 + Math.random() * 80;
      building.position.set(Math.cos(angle) * dist, bH / 2 - 40, Math.sin(angle) * dist - 100);
      cityGroup.add(building);
    }
    scene.add(cityGroup);

    engineRef.current = {
      scene,
      camera,
      renderer,
      ballGroup,
      ballMesh,
      ballShadow,
      gyroRing,
      ballMaterial,
      tiles: [],
      ballPos: new THREE.Vector3(0, BALL_RADIUS, 0),
      ballVel: new THREE.Vector3(0, 0, -28),
      isGrounded: true,
      isFallingInVoid: false,
      forwardSpeed: 28,
      baseSpeed: 28,
      maxSpeed: 75,
      nitroTimer: 0,
      distanceTraveled: 0,
      gemsCount: 0,
      lastFrameTime: performance.now(),
      isRunning: false,
      activeSkinConfig: initialSkin,
    };

    // Build Initial Track
    buildInitialTrack(scene);

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

  // Update Active Skin in Engine
  useEffect(() => {
    if (!engineRef.current) return;
    const skin = getSkinConfig(activeSkinId);
    engineRef.current.activeSkinConfig = skin;
    engineRef.current.ballMaterial.color.setHex(skin.color);
    engineRef.current.ballMaterial.emissive.setHex(skin.emissive);
    engineRef.current.ballMaterial.roughness = skin.roughness;
    engineRef.current.ballMaterial.metalness = skin.metalness;
    localStorage.setItem('cyberslope3d_active_skin', activeSkinId);
  }, [activeSkinId, getSkinConfig]);

  // ----------------------------------------------------
  // TRACK TILE BUILDER (PERFECT GROUND LEVEL AT Y = 0)
  // ----------------------------------------------------
  const createTrackTile = (
    zStart: number,
    type: 'straight' | 'ramp_jump' | 'narrow' | 'split'
  ): TrackTile => {
    const group = new THREE.Group();
    const zEnd = zStart - TILE_LENGTH;
    const midZ = (zStart + zEnd) / 2;
    const width = type === 'narrow' ? 6.5 : 12.5;
    const thickness = 1.2;

    group.position.set(0, 0, midZ);

    // Track Surface (Top surface is at exactly y = 0.0!)
    const tileGeo = new THREE.BoxGeometry(width, thickness, TILE_LENGTH);
    const tileMat = new THREE.MeshStandardMaterial({
      color: 0x063127,
      roughness: 0.25,
      metalness: 0.75,
    });
    const tileMesh = new THREE.Mesh(tileGeo, tileMat);
    tileMesh.position.y = -thickness / 2; // Sets top surface exactly at y = 0!
    group.add(tileMesh);

    // Glowing Neon Left & Right Edges
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const edgeL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, TILE_LENGTH), edgeMat);
    edgeL.position.set(-width / 2 + 0.2, 0.05, 0);
    group.add(edgeL);

    const edgeR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, TILE_LENGTH), edgeMat);
    edgeR.position.set(width / 2 - 0.2, 0.05, 0);
    group.add(edgeR);

    // Center Dashed Guideline
    const centerMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const centerLine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, TILE_LENGTH), centerMat);
    centerLine.position.set(0, 0.01, 0);
    group.add(centerLine);

    let hasBoostPad = false;
    let hasRamp = false;
    const gemMeshes: { mesh: THREE.Mesh; pos: THREE.Vector3; collected: boolean }[] = [];
    const obstacleMeshes: { mesh: THREE.Mesh; pos: THREE.Vector3; hit: boolean }[] = [];

    // Jump Launch Ramp
    if (type === 'ramp_jump') {
      hasRamp = true;
      const rampGeo = new THREE.BoxGeometry(width - 2.0, 1.2, 5.0);
      const rampMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.6,
      });
      const rampMesh = new THREE.Mesh(rampGeo, rampMat);
      rampMesh.rotation.x = -0.22;
      rampMesh.position.set(0, 0.4, 0);
      group.add(rampMesh);
    }

    // Nitro Speed Boost Pad
    if (Math.random() < 0.3 && zStart < -30 && !hasRamp) {
      hasBoostPad = true;
      const padGeo = new THREE.PlaneGeometry(3.5, 6.0);
      const padMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.rotation.x = -Math.PI / 2;
      padMesh.position.set(0, 0.03, 0);
      group.add(padMesh);
    }

    // Collectible Cyan Gems
    if (Math.random() < 0.75) {
      const gemGeo = new THREE.OctahedronGeometry(0.6, 0);
      const gemMat = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x0891b2,
        emissiveIntensity: 0.9,
        roughness: 0.1,
      });

      const gemX = (Math.random() - 0.5) * (width - 3.5);
      const gemZLocal = (Math.random() - 0.5) * (TILE_LENGTH - 6.0);
      const gMesh = new THREE.Mesh(gemGeo, gemMat);
      gMesh.position.set(gemX, 1.2, gemZLocal);
      group.add(gMesh);

      const worldPos = new THREE.Vector3(gemX, 1.2, midZ + gemZLocal);
      gemMeshes.push({ mesh: gMesh, pos: worldPos, collected: false });
    }

    // Red Laser Hazard Blocks
    if (zStart < -45 && Math.random() < 0.55 && !hasRamp) {
      const obsGeo = new THREE.BoxGeometry(2.2, 2.2, 1.8);
      const obsMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xb91c1c,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      });

      const obsX = (Math.random() - 0.5) * (width - 4.0);
      const obsZLocal = (Math.random() - 0.5) * (TILE_LENGTH - 8.0);
      const oMesh = new THREE.Mesh(obsGeo, obsMat);
      oMesh.position.set(obsX, 1.1, obsZLocal);
      group.add(oMesh);

      const worldPos = new THREE.Vector3(obsX, 1.1, midZ + obsZLocal);
      obstacleMeshes.push({ mesh: oMesh, pos: worldPos, hit: false });
    }

    return {
      mesh: group,
      zStart,
      zEnd,
      width,
      type,
      hasBoostPad,
      hasRamp,
      gemMeshes,
      obstacleMeshes,
    };
  };

  const buildInitialTrack = (scene: THREE.Scene) => {
    let curZ = 14.0;
    for (let i = 0; i < 10; i++) {
      const type: 'straight' | 'ramp_jump' | 'narrow' =
        i < 2 ? 'straight' : Math.random() < 0.2 ? 'ramp_jump' : Math.random() < 0.4 ? 'narrow' : 'straight';

      const tile = createTrackTile(curZ, type);
      scene.add(tile.mesh);
      engineRef.current?.tiles.push(tile);
      curZ = tile.zEnd;
    }
  };

  // ----------------------------------------------------
  // GAME LOOP (REAL-TIME 60 FPS PHYSICS)
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
        ballGroup,
        ballMesh,
        ballShadow,
        gyroRing,
        tiles,
        isRunning,
      } = engineRef.current;

      if (!isRunning) {
        renderer.render(scene, camera);
        return;
      }

      // Handle Nitro Boost Timer
      if (engineRef.current.nitroTimer > 0) {
        engineRef.current.nitroTimer -= delta;
        engineRef.current.forwardSpeed = 54;
        setIsNitroBoosting(true);
      } else {
        setIsNitroBoosting(false);
        engineRef.current.forwardSpeed = Math.min(
          engineRef.current.maxSpeed,
          engineRef.current.baseSpeed + engineRef.current.distanceTraveled * 0.015
        );
      }

      const forwardSpeed = engineRef.current.forwardSpeed;
      setSpeedKmh(Math.floor(forwardSpeed * 4.2));

      // Steer & Forward Motion
      const steerSpeed = 20.0;
      engineRef.current.ballPos.x += steerInputRef.current * steerSpeed * delta;
      engineRef.current.ballPos.z -= forwardSpeed * delta;

      // Find current tile under sphere
      const currentTile = tiles.find(
        (t) => engineRef.current!.ballPos.z <= t.zStart && engineRef.current!.ballPos.z >= t.zEnd
      );

      // Ground & Physics Evaluation
      if (currentTile) {
        const isOverEdge = Math.abs(engineRef.current.ballPos.x) > currentTile.width / 2 + 0.25;

        if (isOverEdge) {
          // Fallen into abyss!
          engineRef.current.isFallingInVoid = true;
          engineRef.current.ballVel.y -= 45 * delta;
          engineRef.current.ballPos.y += engineRef.current.ballVel.y * delta;
          ballShadow.visible = false;

          if (engineRef.current.ballPos.y < -20) {
            handleGameOver();
            return;
          }
        } else {
          // On runway: Calculate ground height
          let groundY = 0.0;
          if (currentTile.hasRamp) {
            const zRel = engineRef.current.ballPos.z - (currentTile.zStart + currentTile.zEnd) / 2;
            if (Math.abs(zRel) < 2.5) {
              groundY = Math.max(0, 0.4 - zRel * 0.22);
            }
          }

          if (engineRef.current.ballPos.y > groundY + BALL_RADIUS + 0.05) {
            // In the air (Jumping)
            engineRef.current.ballVel.y -= 36 * delta; // Gravity
            engineRef.current.ballPos.y += engineRef.current.ballVel.y * delta;
            engineRef.current.isGrounded = false;
          } else {
            // Grounded: 100% exact mathematical rest position on surface!
            engineRef.current.ballPos.y = groundY + BALL_RADIUS;
            engineRef.current.ballVel.y = 0;
            engineRef.current.isGrounded = true;

            // Trigger ramp jump air launch
            if (currentTile.hasRamp && groundY > 0.3 && engineRef.current.ballVel.y <= 0) {
              engineRef.current.ballVel.y = 16.0;
              sound.playSlopeJump();
            }
          }

          // Position shadow exactly at ground level
          ballShadow.visible = true;
          ballShadow.position.set(
            engineRef.current.ballPos.x,
            groundY + 0.02,
            engineRef.current.ballPos.z
          );
        }

        // Check Nitro Boost Pad
        if (currentTile.hasBoostPad && Math.abs(currentTile.mesh.position.z - engineRef.current.ballPos.z) < 2.5) {
          if (Math.abs(engineRef.current.ballPos.x) < 2.0 && engineRef.current.nitroTimer <= 0) {
            engineRef.current.nitroTimer = 3.5;
            sound.playSpeedBoost();
          }
        }

        // Check Gem Pickups
        currentTile.gemMeshes.forEach((gem) => {
          if (!gem.collected) {
            gem.mesh.rotation.y += delta * 3.0;
            gem.mesh.rotation.x += delta * 1.5;

            if (gem.pos.distanceTo(engineRef.current!.ballPos) < 1.6) {
              gem.collected = true;
              gem.mesh.visible = false;
              sound.playCollect();

              const bonusMult = engineRef.current!.activeSkinConfig.id === 'golden-pharaoh' ? 2 : 1;
              engineRef.current!.gemsCount += 1 * bonusMult;
              setGemsCollected((prev) => prev + 1 * bonusMult);

              setCoins((prev) => {
                const updated = prev + 10 * bonusMult;
                localStorage.setItem('cyberslope3d_coins', String(updated));
                return updated;
              });
            }
          }
        });

        // Check Obstacle Collisions
        currentTile.obstacleMeshes.forEach((obs) => {
          if (!obs.hit && obs.pos.distanceTo(engineRef.current!.ballPos) < 1.7) {
            obs.hit = true;
            sound.playExplosion();
            handleGameOver();
          }
        });
      } else {
        // Fall into abyss if tile ended
        engineRef.current.ballVel.y -= 45 * delta;
        engineRef.current.ballPos.y += engineRef.current.ballVel.y * delta;
        ballShadow.visible = false;

        if (engineRef.current.ballPos.y < -25) {
          handleGameOver();
          return;
        }
      }

      // Update Sphere 3D Position & Continuous Rolling Rotation
      ballGroup.position.copy(engineRef.current.ballPos);
      ballMesh.rotation.x -= (forwardSpeed / BALL_RADIUS) * delta;
      gyroRing.rotation.z += steerInputRef.current * 10 * delta;

      // Distance & Score Tracking
      const dist = Math.floor(Math.abs(engineRef.current.ballPos.z));
      engineRef.current.distanceTraveled = dist;
      setDistance(dist);
      setScore(dist * 2 + engineRef.current.gemsCount * 50);

      // Smooth 3D Chase Camera
      const targetCamX = engineRef.current.ballPos.x * 0.7;
      const targetCamY = Math.max(engineRef.current.ballPos.y + 4.2, 4.5);
      const targetCamZ = engineRef.current.ballPos.z + 8.5;

      camera.position.x += (targetCamX - camera.position.x) * 0.15;
      camera.position.y += (targetCamY - camera.position.y) * 0.18;
      camera.position.z += (targetCamZ - camera.position.z) * 0.25;

      camera.lookAt(
        engineRef.current.ballPos.x * 0.4,
        engineRef.current.ballPos.y + 0.3,
        engineRef.current.ballPos.z - 16
      );

      // Dynamic FOV on Turbo Boost
      const targetFov = engineRef.current.nitroTimer > 0 ? 75 : 60;
      camera.fov += (targetFov - camera.fov) * 0.1;
      camera.updateProjectionMatrix();

      // Continuous Tile Streaming
      const lastTile = tiles[tiles.length - 1];
      if (lastTile && lastTile.zEnd > engineRef.current.ballPos.z - 220) {
        const typeRoll = Math.random();
        let nextType: 'straight' | 'ramp_jump' | 'narrow' = 'straight';
        if (typeRoll < 0.2) nextType = 'ramp_jump';
        else if (typeRoll < 0.4) nextType = 'narrow';

        const newTile = createTrackTile(lastTile.zEnd, nextType);
        scene.add(newTile.mesh);
        tiles.push(newTile);

        // Clean up passed tiles
        while (tiles.length > 0 && tiles[0].zEnd > engineRef.current.ballPos.z + 40) {
          const old = tiles.shift()!;
          scene.remove(old.mesh);
        }
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // ----------------------------------------------------
  // CONTROLS & EVENT LISTENERS
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') steerInputRef.current = -1;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') steerInputRef.current = 1;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        if (steerInputRef.current === -1) steerInputRef.current = 0;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        if (steerInputRef.current === 1) steerInputRef.current = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Touch & Pointer Steering
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDownRef.current = true;
    pointerStartXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || gameState !== 'playing') return;
    const diffX = e.clientX - pointerStartXRef.current;
    const sensitivity = 0.025;
    steerInputRef.current = Math.max(-1, Math.min(1, diffX * sensitivity));
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
    steerInputRef.current = 0;
  };

  // ----------------------------------------------------
  // GAME LIFECYCLE
  // ----------------------------------------------------
  const startGame = () => {
    if (!engineRef.current) return;
    sound.playPowerup();

    // Reset physics
    engineRef.current.ballPos.set(0, BALL_RADIUS, 0);
    engineRef.current.ballVel.set(0, 0, -28);
    engineRef.current.forwardSpeed = 28;
    engineRef.current.distanceTraveled = 0;
    engineRef.current.gemsCount = 0;
    engineRef.current.nitroTimer = 0;
    engineRef.current.isGrounded = true;
    engineRef.current.isFallingInVoid = false;
    engineRef.current.isRunning = true;
    steerInputRef.current = 0;

    // Reset Tiles
    engineRef.current.tiles.forEach((t) => engineRef.current!.scene.remove(t.mesh));
    engineRef.current.tiles = [];
    buildInitialTrack(engineRef.current.scene);

    setDistance(0);
    setScore(0);
    setGemsCollected(0);
    setIsNitroBoosting(false);
    setGameState('playing');
  };

  const handleGameOver = () => {
    if (!engineRef.current) return;
    engineRef.current.isRunning = false;
    sound.playGameOver();

    const dist = engineRef.current.distanceTraveled;
    if (dist > highScore) {
      setHighScore(dist);
      localStorage.setItem('cyberslope3d_highscore', String(dist));
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }

    setGameState('gameover');
  };

  const buySkin = (skin: SlopeBallSkin) => {
    if (coins < skin.price) {
      sound.playHit();
      return;
    }
    sound.playWin();
    const newCoins = coins - skin.price;
    setCoins(newCoins);
    localStorage.setItem('cyberslope3d_coins', String(newCoins));

    const updatedUnlocked = [...unlockedSkins, skin.id];
    setUnlockedSkins(updatedUnlocked);
    localStorage.setItem('cyberslope3d_unlocked_skins', JSON.stringify(updatedUnlocked));
    setActiveSkinId(skin.id);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[420px] sm:h-[580px] md:h-[680px] max-h-[75vh] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden select-none border border-emerald-500/30 shadow-2xl shadow-emerald-950/40 font-sans touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
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
            {/* Speedometer Gauge & Distance */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-900/85 backdrop-blur-md border border-emerald-500/50 text-emerald-300 flex items-center gap-1.5 sm:gap-2.5 shadow-xl">
                <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 leading-none">Velocity</div>
                  <div className="text-sm sm:text-xl font-black text-white">{speedKmh} <span className="text-[10px] sm:text-xs text-emerald-400 font-bold">KM/H</span></div>
                </div>
              </div>

              {isNitroBoosting && (
                <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-amber-500 text-slate-950 text-[10px] sm:text-xs font-black uppercase flex items-center gap-1 animate-pulse shadow-lg shadow-amber-500/40 shrink-0">
                  <Flame className="w-3.5 h-3.5 fill-slate-950" />
                  <span className="hidden xs:inline">TURBO</span> BOOST
                </div>
              )}
            </div>

            {/* Gems & Score */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-slate-900/85 backdrop-blur-md border border-cyan-500/40 text-cyan-300 flex items-center gap-1.5 sm:gap-2 shadow-lg">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 leading-none">Distance</div>
                  <div className="text-sm sm:text-lg font-black text-white">{distance} m</div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="pointer-events-auto p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900/85 border border-slate-700 hover:border-emerald-400 text-slate-300 hover:text-white transition-all shadow-lg active:scale-95"
              >
                {muted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* Bottom On-Screen Mobile Touch Steer Controls */}
          <div className="flex items-center justify-between w-full pt-2 sm:pt-4">
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                steerInputRef.current = -1;
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                steerInputRef.current = 0;
              }}
              className="pointer-events-auto w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-slate-900/80 border-2 border-emerald-500/60 backdrop-blur-md text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-2xl active:scale-95 active:bg-emerald-500 active:text-slate-950 transition-all"
            >
              ◀
            </button>

            <div className="text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-900/60 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-slate-800 backdrop-blur-md">
              A / D or ◀ ▶ to Steer
            </div>

            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                steerInputRef.current = 1;
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                steerInputRef.current = 0;
              }}
              className="pointer-events-auto w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-slate-900/80 border-2 border-emerald-500/60 backdrop-blur-md text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-2xl active:scale-95 active:bg-emerald-500 active:text-slate-950 transition-all"
            >
              ▶
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* START SCREEN MODAL                                   */}
      {/* ==================================================== */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-20">
          <div className="max-w-md w-full bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl shadow-emerald-950/60 animate-in fade-in zoom-in duration-300">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                HIGH VELOCITY 3D RUNNER
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                CYBER <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-300">SLOPE 3D</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Control a supersonic neon sphere rolling down steep downhill polygonal runways! Dodge laser hazards, hit turbo boost pads, and set all-time records!
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3 py-1">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3 text-left">
                <Trophy className="w-6 h-6 text-amber-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Best Record</div>
                  <div className="text-lg font-black text-white">{highScore} m</div>
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
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-extrabold text-base shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                START ROLLING
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowGarage(true)}
                  className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-emerald-400"
                >
                  <Eye className="w-4 h-4 text-emerald-400" />
                  Ball Garage
                </button>
                <button
                  onClick={() => setShowTutorial(true)}
                  className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-cyan-400"
                >
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  How to Play
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
                RUN TERMINATED
              </div>
              <h2 className="text-3xl font-black text-white">SPHERE CRASHED</h2>
              <p className="text-xs text-slate-300">
                You blazed down the cyber runway and covered {distance} meters!
              </p>
            </div>

            {/* Run Stats */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Distance</div>
                <div className="text-xl font-black text-white">{distance} m</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Score</div>
                <div className="text-xl font-black text-emerald-400">{score} PTS</div>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={startGame}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-extrabold text-base shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
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
      {/* GARAGE SKINS MODAL                                   */}
      {/* ==================================================== */}
      {showGarage && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-30 animate-in fade-in zoom-in duration-200">
          <div className="max-w-xl w-full bg-slate-900/95 border border-emerald-500/40 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">SPHERE GARAGE</h2>
                <p className="text-xs text-slate-400">Unlock custom high-speed glowing cyber balls.</p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 text-sm font-black flex items-center gap-1.5">
                <Star className="w-4 h-4 text-emerald-400" />
                {coins} Coins
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {DEFAULT_SLOPE_SKINS.map((skin) => {
                const isUnlocked = unlockedSkins.includes(skin.id);
                const isSelected = activeSkinId === skin.id;

                return (
                  <div
                    key={skin.id}
                    onClick={() => {
                      if (isUnlocked) {
                        setActiveSkinId(skin.id);
                        sound.playClick();
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 shadow-lg shadow-emerald-500/20'
                        : isUnlocked
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                        : 'bg-slate-950/40 border-slate-900 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{skin.previewEmoji}</span>
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                          EQUIPPED
                        </span>
                      ) : isUnlocked ? (
                        <span className="text-[10px] text-slate-400 font-bold">READY</span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-bold">{skin.price} Coins</span>
                      )}
                    </div>

                    <div>
                      <div className="font-extrabold text-sm text-white">{skin.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{skin.description}</div>
                    </div>

                    {!isUnlocked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          buySkin(skin);
                        }}
                        disabled={coins < skin.price}
                        className={`mt-1 w-full py-1.5 rounded-xl text-xs font-bold transition-all ${
                          coins >= skin.price
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        Unlock ({skin.price})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowGarage(false)}
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
          <div className="max-w-md w-full bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-white">HOW TO PLAY CYBER SLOPE</h2>
              <p className="text-xs text-slate-400">Master the high-speed downhill 3D slopes!</p>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-black">1</div>
                <div>
                  <div className="font-bold text-white mb-0.5">Steer Left & Right</div>
                  Use A / D or Left / Right Arrow Keys (or tap on-screen ◀ ▶ buttons) to steer across lanes.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 font-black">2</div>
                <div>
                  <div className="font-bold text-white mb-0.5">Hit Nitro Turbo Pads</div>
                  Drive over yellow/orange boost pads for supersonic acceleration and air-time!
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 font-black">3</div>
                <div>
                  <div className="font-bold text-white mb-0.5">Avoid Red Hazard Blocks & Chasms</div>
                  Crashing into red blocks or falling off the slope edges terminates your run!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowTutorial(false)}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all"
            >
              Ready to Roll!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
