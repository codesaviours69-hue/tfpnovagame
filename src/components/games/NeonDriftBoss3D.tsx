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
  ShoppingBag,
  Coins,
  Car,
  Award,
  Crown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// --- VEHICLE GARAGE DEFINITIONS ---
interface DriftCar {
  id: string;
  name: string;
  bodyColor: number;
  glowColor: string;
  speed: number;
  driftTurnSpeed: number;
  coinMultiplier: number;
  price: number;
  description: string;
}

const CARS_LIST: DriftCar[] = [
  { id: 'roadster', name: 'Neon Roadster FX', bodyColor: 0xf43f5e, glowColor: '#f43f5e', speed: 1.0, driftTurnSpeed: 1.0, coinMultiplier: 1.0, price: 0, description: 'Nimble twin-turbo street roadster with responsive cornering.' },
  { id: 'muscle_gt', name: 'Cyber Muscle GT', bodyColor: 0xf59e0b, glowColor: '#f59e0b', speed: 1.15, driftTurnSpeed: 1.1, coinMultiplier: 1.25, price: 250, description: 'Heavy horsepower drift beast with explosive corner acceleration.' },
  { id: 'formula_apex', name: 'Formula Apex 1', bodyColor: 0x00f0ff, glowColor: '#00f0ff', speed: 1.3, driftTurnSpeed: 1.25, coinMultiplier: 1.5, price: 600, description: 'Aerodynamic ground-effect open wheeler with maximum apex precision.' },
  { id: 'cyber_ev', name: 'Hyperion Cyber EV', bodyColor: 0xa855f7, glowColor: '#a855f7', speed: 1.45, driftTurnSpeed: 1.35, coinMultiplier: 2.0, price: 1200, description: 'Dual quantum electric motors with instant torque and glowing trails.' },
  { id: 'titan_drifter', name: 'Titan 6x6 Overdrive', bodyColor: 0x10b981, glowColor: '#10b981', speed: 1.6, driftTurnSpeed: 1.5, coinMultiplier: 2.5, price: 2500, description: 'Armored hyper-truck engineered for invincible drift master streaks.' },
];

interface RoadTile {
  x: number;
  z: number;
  mesh: THREE.Mesh;
  hasCoin?: boolean;
  coinMesh?: THREE.Mesh;
}

export const NeonDriftBoss3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Game UI State
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'crashed' | 'garage'>('menu');
  const [score, setScore] = useState<number>(0);
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('novaplay_drift_coins') || '50', 10);
  });
  const [selectedCarIdx, setSelectedCarIdx] = useState<number>(() => {
    return parseInt(localStorage.getItem('novaplay_drift_car') || '0', 10);
  });
  const [unlockedCars, setUnlockedCars] = useState<string[]>(() => {
    const saved = localStorage.getItem('novaplay_drift_unlocked');
    return saved ? JSON.parse(saved) : ['roadster'];
  });
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('novaplay_drift_high') || '0', 10);
  });
  const [comboMultiplier, setComboMultiplier] = useState<number>(1);
  const [stuntPopup, setStuntPopup] = useState<{ text: string; id: number } | null>(null);
  const [isDriftingRight, setIsDriftingRight] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Road constants
  const TILE_SIZE = 3.6;
  const ROAD_HEIGHT = 0.6;

  // 3D Engine & Physics Ref
  const simState = useRef({
    gameState: 'menu' as 'menu' | 'playing' | 'crashed' | 'garage',
    carPos: new THREE.Vector3(0, ROAD_HEIGHT / 2 + 0.35, 0),
    carRotY: 0, // 0 deg (Straight Forward along +Z)
    carVelY: 0,
    isFalling: false,
    fallRotX: 0,
    fallRotZ: 0,

    isDrifting: false, // false = straight forward (+Z), true = turn right (+X)
    currentSpeed: 9.5,
    baseSpeed: 9.5,
    distanceCovered: 0,
    coinsCollectedInRun: 0,
    combo: 1,
    perfectApexTimer: 0,

    carChassis: CARS_LIST[0],
    roadTiles: [] as RoadTile[],
    lastTileX: 0,
    lastTileZ: 0,
    currentDir: 'z' as 'x' | 'z', // Initial straight runway (+Z)
    stepCountInDir: 0,
    maxStepsInDir: 8,
  });

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    carGroup: THREE.Group;
    carBodyMesh: THREE.Mesh;
    trailLines: THREE.Line[];
    trailPositions: THREE.Vector3[][];
    skidParticles: THREE.Points;
    skidGeo: THREE.BufferGeometry;
    skidPosArray: Float32Array;
    skidVelArray: Float32Array;
  } | null>(null);

  // Initialize Three.js 3D Isometric Drift Arena
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.025);

    // 2. Camera: Isometric floating overhead angle
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(16, 22, -16);
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 2.5);
    dirLight.position.set(20, 40, -10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const pinkBacklight = new THREE.DirectionalLight(0xf43f5e, 1.8);
    pinkBacklight.position.set(-20, 20, 20);
    scene.add(pinkBacklight);

    // 5. Build 3D Car Model
    const carGroup = new THREE.Group();

    // Car Body Chassis
    const bodyGeo = new THREE.BoxGeometry(1.3, 0.5, 2.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: simState.current.carChassis.bodyColor,
      roughness: 0.2,
      metalness: 0.8,
    });
    const carBodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    carBodyMesh.castShadow = true;
    carBodyMesh.position.y = 0.35;
    carGroup.add(carBodyMesh);

    // Cabin Glass
    const cabinGeo = new THREE.BoxGeometry(1.0, 0.4, 1.1);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.65, -0.15);
    carGroup.add(cabin);

    // Neon Underglow Ring
    const underglowGeo = new THREE.RingGeometry(0.8, 1.3, 16);
    const underglowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const underglow = new THREE.Mesh(underglowGeo, underglowMat);
    underglow.rotation.x = -Math.PI / 2;
    underglow.position.y = 0.05;
    carGroup.add(underglow);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.22, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const wheelPositions = [
      [-0.68, 0.24, 0.7],
      [0.68, 0.24, 0.7],
      [-0.68, 0.24, -0.7],
      [0.68, 0.24, -0.7],
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      carGroup.add(wheel);
    });

    scene.add(carGroup);

    // 6. Skid Smoke Particles
    const maxParticles = 60;
    const skidGeo = new THREE.BufferGeometry();
    const skidPosArray = new Float32Array(maxParticles * 3);
    const skidVelArray = new Float32Array(maxParticles * 3);
    skidGeo.setAttribute('position', new THREE.BufferAttribute(skidPosArray, 3));
    const skidMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.25,
      transparent: true,
      opacity: 0.6,
    });
    const skidParticles = new THREE.Points(skidGeo, skidMat);
    scene.add(skidParticles);

    // 7. Initial Road Grid Generation (First 35 tiles)
    const initialTiles: RoadTile[] = [];
    let curX = 0;
    let curZ = 0;
    let curDir: 'x' | 'z' = 'z';
    let stepsInDir = 0;

    const tileGeo = new THREE.BoxGeometry(TILE_SIZE, ROAD_HEIGHT, TILE_SIZE);
    const tileMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.3,
    });
    const coinGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2, emissive: 0x78350f });

    // Initial 40 road tiles (First 10 tiles guaranteed straight runway)
    for (let i = 0; i < 40; i++) {
      const tileMesh = new THREE.Mesh(tileGeo, tileMat);
      tileMesh.position.set(curX, 0, curZ);
      tileMesh.receiveShadow = true;
      scene.add(tileMesh);

      let coinMesh: THREE.Mesh | undefined;
      let hasCoin = false;

      // Add collectible coin randomly
      if (i > 3 && Math.random() < 0.35) {
        hasCoin = true;
        coinMesh = new THREE.Mesh(coinGeo, coinMat);
        coinMesh.rotation.x = Math.PI / 2;
        coinMesh.position.set(curX, ROAD_HEIGHT / 2 + 0.5, curZ);
        scene.add(coinMesh);
      }

      initialTiles.push({ x: curX, z: curZ, mesh: tileMesh, hasCoin, coinMesh });

      if (i < 10) {
        // Guaranteed straight runway
        curZ += TILE_SIZE;
      } else {
        stepsInDir++;
        const maxSteps = 4 + Math.floor(Math.random() * 5);
        if (stepsInDir >= maxSteps) {
          curDir = curDir === 'x' ? 'z' : 'x';
          stepsInDir = 0;
        }

        if (curDir === 'x') {
          curX += TILE_SIZE;
        } else {
          curZ += TILE_SIZE;
        }
      }
    }

    simState.current.roadTiles = initialTiles;
    simState.current.lastTileX = curX;
    simState.current.lastTileZ = curZ;
    simState.current.currentDir = curDir;
    simState.current.stepCountInDir = stepsInDir;

    sceneRefs.current = {
      scene,
      camera,
      renderer,
      carGroup,
      carBodyMesh,
      trailLines: [],
      trailPositions: [],
      skidParticles,
      skidGeo,
      skidPosArray,
      skidVelArray,
    };

    // --- CONTROLS: HOLD TO DRIFT RIGHT, RELEASE FOR LEFT ---
    const startDriftRight = () => {
      if (simState.current.gameState === 'playing') {
        simState.current.isDrifting = true;
        setIsDriftingRight(true);
      }
    };

    const stopDriftRight = () => {
      if (simState.current.gameState === 'playing') {
        simState.current.isDrifting = false;
        setIsDriftingRight(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        startDriftRight();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        stopDriftRight();
      }
    };

    container.addEventListener('mousedown', startDriftRight);
    window.addEventListener('mouseup', stopDriftRight);
    container.addEventListener('touchstart', startDriftRight, { passive: true });
    window.addEventListener('touchend', stopDriftRight);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- 60 FPS GAME ENGINE LOOP ---
    let animId = 0;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 1000, 0.033);
      lastTime = time;

      const sim = simState.current;
      const refs = sceneRefs.current;
      if (!refs) return;

      if (sim.gameState === 'playing') {
        if (!sim.isFalling) {
          // Increase speed gradually over distance
          sim.currentSpeed = sim.baseSpeed + sim.distanceCovered * 0.006;

          // Target rotation: 0 (Forward along +Z) when not holding, Math.PI/2 (Right along +X) when holding
          const targetRot = sim.isDrifting ? Math.PI / 2 : 0;
          sim.carRotY = THREE.MathUtils.lerp(sim.carRotY, targetRot, 0.28 * sim.carChassis.driftTurnSpeed);

          // Find current closest tile
          let closestDist = Infinity;
          let closestTile: RoadTile | null = null;
          for (const tile of sim.roadTiles) {
            const d = Math.hypot(sim.carPos.x - tile.x, sim.carPos.z - tile.z);
            if (d < closestDist) {
              closestDist = d;
              closestTile = tile;
            }
          }

          // Advance car position along current direction while gently snapping opposite axis to lane center
          if (sim.isDrifting) {
            // Heading Right along +X
            sim.carPos.x += sim.currentSpeed * dt;
            if (closestTile) {
              sim.carPos.z = THREE.MathUtils.lerp(sim.carPos.z, closestTile.z, 0.16);
            }
          } else {
            // Heading Forward along +Z
            sim.carPos.z += sim.currentSpeed * dt;
            if (closestTile) {
              sim.carPos.x = THREE.MathUtils.lerp(sim.carPos.x, closestTile.x, 0.16);
            }
          }

          sim.distanceCovered += sim.currentSpeed * dt;
          const curScore = Math.floor(sim.distanceCovered * sim.combo);
          setScore(curScore);

          refs.carGroup.position.copy(sim.carPos);
          refs.carGroup.rotation.y = sim.carRotY;

          // Check if car is supported by road (Safe within TILE_SIZE * 0.75 of closest tile)
          let isOnRoad = false;
          if (sim.distanceCovered < 18.0) {
            isOnRoad = true;
          } else if (closestTile && closestDist <= TILE_SIZE * 0.75) {
            isOnRoad = true;

            // Coin collection
            if (closestTile.hasCoin && closestTile.coinMesh && closestDist < 1.8) {
              closestTile.hasCoin = false;
              refs.scene.remove(closestTile.coinMesh);
              sound.playPowerup();
              const earned = Math.round(1 * sim.carChassis.coinMultiplier);
              sim.coinsCollectedInRun += earned;
              setCoins((c) => {
                const next = c + earned;
                localStorage.setItem('novaplay_drift_coins', String(next));
                return next;
              });
              triggerStunt(`+${earned} COINS!`);
            }
          }

          // If driven off the edge of road -> Trigger 3D Falling Crash!
          if (!isOnRoad) {
            sim.isFalling = true;
            sim.carVelY = 0;
            sound.playGameOver();

            setTimeout(() => {
              sim.gameState = 'crashed';
              setGameState('crashed');
              if (curScore > highScore) {
                setHighScore(curScore);
                localStorage.setItem('novaplay_drift_high', String(curScore));
                confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
              }
            }, 1000);
          }

          // Procedural Road Generation Ahead
          if (sim.roadTiles.length > 0) {
            const lastTile = sim.roadTiles[sim.roadTiles.length - 1];
            const distToLast = Math.hypot(lastTile.x - sim.carPos.x, lastTile.z - sim.carPos.z);

            if (distToLast < 65) {
              // Add 10 new tiles
              for (let t = 0; t < 10; t++) {
                sim.stepCountInDir++;
                const maxSteps = 4 + Math.floor(Math.random() * 5);
                if (sim.stepCountInDir >= maxSteps) {
                  sim.currentDir = sim.currentDir === 'x' ? 'z' : 'x';
                  sim.stepCountInDir = 0;
                }

                if (sim.currentDir === 'x') {
                  sim.lastTileX += TILE_SIZE;
                } else {
                  sim.lastTileZ += TILE_SIZE;
                }

                const newMesh = new THREE.Mesh(tileGeo, tileMat);
                newMesh.position.set(sim.lastTileX, 0, sim.lastTileZ);
                newMesh.receiveShadow = true;
                refs.scene.add(newMesh);

                let coinMesh: THREE.Mesh | undefined;
                let hasCoin = false;
                if (Math.random() < 0.35) {
                  hasCoin = true;
                  coinMesh = new THREE.Mesh(coinGeo, coinMat);
                  coinMesh.rotation.x = Math.PI / 2;
                  coinMesh.position.set(sim.lastTileX, ROAD_HEIGHT / 2 + 0.5, sim.lastTileZ);
                  refs.scene.add(coinMesh);
                }

                sim.roadTiles.push({
                  x: sim.lastTileX,
                  z: sim.lastTileZ,
                  mesh: newMesh,
                  hasCoin,
                  coinMesh,
                });
              }
            }

            // Remove old tiles far behind car
            if (sim.roadTiles.length > 60) {
              const oldTile = sim.roadTiles.shift();
              if (oldTile) {
                refs.scene.remove(oldTile.mesh);
                if (oldTile.coinMesh) refs.scene.remove(oldTile.coinMesh);
              }
            }
          }
        } else {
          // 3D Gravity Tumble Down Void
          sim.carVelY -= 35 * dt;
          sim.carPos.y += sim.carVelY * dt;
          sim.fallRotX += 6.0 * dt;
          sim.fallRotZ += 4.0 * dt;

          refs.carGroup.position.copy(sim.carPos);
          refs.carGroup.rotation.x = sim.fallRotX;
          refs.carGroup.rotation.z = sim.fallRotZ;
        }

        // Camera Follows Car Smoothly in Isometric Angle
        const targetCamX = sim.carPos.x - 14;
        const targetCamY = sim.carPos.y + 18;
        const targetCamZ = sim.carPos.z - 14;

        refs.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.12);
        refs.camera.lookAt(sim.carPos.x + 3, sim.carPos.y, sim.carPos.z + 3);
      }

      refs.renderer.render(refs.scene, refs.camera);
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
      container.removeEventListener('mousedown', startDriftRight);
      window.removeEventListener('mouseup', stopDriftRight);
      container.removeEventListener('touchstart', startDriftRight);
      window.removeEventListener('touchend', stopDriftRight);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Trigger Stunt Notifications
  const triggerStunt = (msg: string) => {
    const id = Date.now();
    setStuntPopup({ text: msg, id });
    setTimeout(() => setStuntPopup(null), 1200);
  };

  // Start / Restart Drift Run
  const startRun = () => {
    const sim = simState.current;
    const refs = sceneRefs.current;

    sim.carPos.set(0, ROAD_HEIGHT / 2 + 0.35, 0);
    sim.carRotY = 0;
    sim.carVelY = 0;
    sim.isFalling = false;
    sim.fallRotX = 0;
    sim.fallRotZ = 0;
    sim.isDrifting = false;
    sim.currentSpeed = sim.baseSpeed;
    sim.distanceCovered = 0;
    sim.coinsCollectedInRun = 0;
    sim.combo = 1;
    sim.gameState = 'playing';
    sim.carChassis = CARS_LIST[selectedCarIdx];

    if (refs) {
      // Clear old road tiles
      for (const t of sim.roadTiles) {
        refs.scene.remove(t.mesh);
        if (t.coinMesh) refs.scene.remove(t.coinMesh);
      }

      // Generate 40 fresh tiles from origin
      const initialTiles: RoadTile[] = [];
      let curX = 0;
      let curZ = 0;
      let curDir: 'x' | 'z' = 'z';
      let stepsInDir = 0;

      const tileGeo = new THREE.BoxGeometry(TILE_SIZE, ROAD_HEIGHT, TILE_SIZE);
      const tileMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.4,
        metalness: 0.3,
      });
      const coinGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16);
      const coinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2, emissive: 0x78350f });

      for (let i = 0; i < 40; i++) {
        const tileMesh = new THREE.Mesh(tileGeo, tileMat);
        tileMesh.position.set(curX, 0, curZ);
        tileMesh.receiveShadow = true;
        refs.scene.add(tileMesh);

        let coinMesh: THREE.Mesh | undefined;
        let hasCoin = false;
        if (i > 3 && Math.random() < 0.35) {
          hasCoin = true;
          coinMesh = new THREE.Mesh(coinGeo, coinMat);
          coinMesh.rotation.x = Math.PI / 2;
          coinMesh.position.set(curX, ROAD_HEIGHT / 2 + 0.5, curZ);
          refs.scene.add(coinMesh);
        }

        initialTiles.push({ x: curX, z: curZ, mesh: tileMesh, hasCoin, coinMesh });

        if (i < 10) {
          // Guaranteed straight runway
          curZ += TILE_SIZE;
        } else {
          stepsInDir++;
          const maxSteps = 4 + Math.floor(Math.random() * 5);
          if (stepsInDir >= maxSteps) {
            curDir = curDir === 'x' ? 'z' : 'x';
            stepsInDir = 0;
          }

          if (curDir === 'x') {
            curX += TILE_SIZE;
          } else {
            curZ += TILE_SIZE;
          }
        }
      }

      sim.roadTiles = initialTiles;
      sim.lastTileX = curX;
      sim.lastTileZ = curZ;
      sim.currentDir = curDir;
      sim.stepCountInDir = stepsInDir;

      // Update 3D car body color
      if (refs.carBodyMesh) {
        (refs.carBodyMesh.material as THREE.MeshStandardMaterial).color.setHex(sim.carChassis.bodyColor);
      }
    }

    setScore(0);
    setComboMultiplier(1);
    setIsDriftingRight(false);
    setGameState('playing');
    sound.playClick();
  };

  // Purchase / Select Car in Garage
  const selectOrBuyCar = (idx: number) => {
    const car = CARS_LIST[idx];
    const isUnlocked = unlockedCars.includes(car.id);

    if (isUnlocked) {
      setSelectedCarIdx(idx);
      localStorage.setItem('novaplay_drift_car', String(idx));
      sound.playClick();
    } else if (coins >= car.price) {
      const nextCoins = coins - car.price;
      const nextUnlocked = [...unlockedCars, car.id];
      setCoins(nextCoins);
      setUnlockedCars(nextUnlocked);
      setSelectedCarIdx(idx);
      localStorage.setItem('novaplay_drift_coins', String(nextCoins));
      localStorage.setItem('novaplay_drift_unlocked', JSON.stringify(nextUnlocked));
      localStorage.setItem('novaplay_drift_car', String(idx));
      sound.playPowerup();
    }
  };

  const handleToggleSound = () => {
    const nextMuted = sound.toggleMute();
    setMuted(nextMuted);
  };

  return (
    <div className="relative w-full h-[520px] sm:h-[600px] md:h-[700px] lg:h-[750px] max-h-[85vh] bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)] select-none flex flex-col items-center justify-center font-sans touch-none">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-pointer" />

      {/* STUNT NOTIFICATION POPUP */}
      {stuntPopup && (
        <div
          key={stuntPopup.id}
          className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/30 via-pink-500/30 to-cyan-500/30 border border-amber-400 text-amber-300 font-black text-xs sm:text-sm tracking-wider uppercase backdrop-blur-md animate-bounce z-20 pointer-events-none shadow-[0_0_20px_rgba(245,158,11,0.5)]"
        >
          ⚡ {stuntPopup.text}
        </div>
      )}

      {/* IN-GAME HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex items-center justify-between pointer-events-none z-10 gap-2">
          {/* Distance & Multiplier */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-baseline gap-1 bg-slate-900/90 border border-cyan-500/40 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl backdrop-blur-md shadow-lg">
              <span className="text-xl sm:text-3xl font-black text-cyan-400">{score}</span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400">M</span>
            </div>

            {/* Coins */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-amber-500/40 px-3 py-1.5 sm:py-2 rounded-2xl backdrop-blur-md shadow-lg">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span className="font-black text-xs sm:text-sm text-amber-300">{coins}</span>
            </div>
          </div>

          {/* Controls Hint / Audio */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={handleToggleSound}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>
      )}

      {/* HOLD SCREEN DRIFT HINT OVERLAY */}
      {gameState === 'playing' && (
        <div className="absolute bottom-6 inset-x-0 flex items-center justify-center pointer-events-none z-10 px-4">
          <div className="px-5 py-2 rounded-full bg-slate-950/85 border border-pink-500/40 text-pink-300 text-xs sm:text-sm font-bold backdrop-blur-md shadow-lg flex items-center gap-2 animate-pulse">
            <span>🏎️ <strong>HOLD</strong> screen / Spacebar to Turn RIGHT • <strong>RELEASE</strong> to Turn LEFT!</span>
          </div>
        </div>
      )}

      {/* 1. MAIN MENU OVERLAY */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 z-30 text-center animate-fade-in overflow-y-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 font-bold text-xs tracking-widest uppercase mb-2 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>One-Tap 3D Sling Drifter</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-amber-400 to-cyan-400 tracking-wider mb-2 drop-shadow-[0_0_30px_rgba(244,63,94,0.4)]">
            NEON DRIFT BOSS 3D
          </h1>
          <p className="text-pink-300/80 max-w-lg text-xs sm:text-sm md:text-base font-medium mb-5">
            Sling-drift across floating zigzag sky tracks! Hold to drift right, release to drift left, collect golden coins, and become the supreme Drift King!
          </p>

          {/* Current Equipped Car Preview */}
          <div className="flex items-center gap-3 bg-slate-900/80 border border-pink-500/30 px-4 py-2.5 rounded-2xl mb-6">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: CARS_LIST[selectedCarIdx].glowColor }}>
              <Car className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-xs font-black text-white">{CARS_LIST[selectedCarIdx].name}</div>
              <div className="text-[10px] text-pink-400 font-bold">SPEED x{CARS_LIST[selectedCarIdx].speed} • COINS x{CARS_LIST[selectedCarIdx].coinMultiplier}</div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setGameState('garage')}
              className="px-5 sm:px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-pink-500/40 text-pink-400 font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>GARAGE</span>
            </button>

            <button
              onClick={startRun}
              className="px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-pink-500 via-rose-600 to-cyan-500 hover:from-pink-400 hover:to-cyan-400 text-white font-black text-base sm:text-lg tracking-wider uppercase shadow-[0_0_30px_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>START DRIFT</span>
            </button>
          </div>

          {highScore > 0 && (
            <div className="flex items-center gap-2 mt-5 text-amber-400 text-xs sm:text-sm font-bold">
              <Trophy className="w-4 h-4" />
              <span>BEST DISTANCE: {highScore} METERS</span>
            </div>
          )}
        </div>
      )}

      {/* 2. GARAGE OVERLAY */}
      {gameState === 'garage' && (
        <div className="absolute inset-0 bg-slate-950/94 backdrop-blur-lg flex flex-col items-center justify-center p-4 sm:p-6 z-30 text-center animate-fade-in overflow-y-auto">
          <div className="flex items-center justify-between w-full max-w-2xl mb-4">
            <h2 className="text-xl sm:text-3xl font-black text-pink-400 tracking-wider">DRIFT CAR GARAGE</h2>
            <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 rounded-xl">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-black text-xs sm:text-base text-amber-300">{coins} COINS</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full mb-6">
            {CARS_LIST.map((car, idx) => {
              const isUnlocked = unlockedCars.includes(car.id);
              const isSelected = selectedCarIdx === idx;

              return (
                <div
                  key={car.id}
                  onClick={() => selectOrBuyCar(idx)}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900/95 border-pink-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: car.glowColor }}>
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-black text-white text-sm">{car.name}</div>
                        <div className="text-[10px] text-pink-400 font-bold">SPEED x{car.speed} • REWARD x{car.coinMultiplier}</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">{car.description}</p>

                  {!isUnlocked ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectOrBuyCar(idx);
                      }}
                      disabled={coins < car.price}
                      className={`w-full py-1.5 rounded-xl font-bold text-xs ${
                        coins >= car.price ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      UNLOCK ({car.price} Coins)
                    </button>
                  ) : (
                    <button className="w-full py-1.5 rounded-xl bg-slate-800 text-pink-400 font-bold text-xs pointer-events-none">
                      {isSelected ? 'EQUIPPED' : 'SELECT'}
                    </button>
                  )}
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

      {/* 3. CRASHED / GAME OVER OVERLAY */}
      {gameState === 'crashed' && (
        <div className="absolute inset-0 bg-slate-950/94 backdrop-blur-lg flex flex-col items-center justify-center p-4 sm:p-6 z-30 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center text-white mb-3 shadow-2xl shadow-rose-500/40 animate-bounce">
            <Flame className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-rose-500 tracking-wider mb-1">DRIFT TERMINATED!</h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-5">Fell off the floating sky track into the void.</p>

          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-4 max-w-xs w-full mb-6 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Distance Cleared:</span>
              <span className="text-lg font-black text-cyan-400">{score} METERS</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Coins:</span>
              <span className="font-bold text-amber-400">{coins} COINS</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setGameState('garage')}
              className="px-5 sm:px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-pink-500/40 text-pink-400 font-bold text-xs sm:text-sm tracking-wider uppercase cursor-pointer"
            >
              GARAGE
            </button>

            <button
              onClick={startRun}
              className="px-6 sm:px-8 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(244,63,94,0.5)] hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>DRIFT AGAIN</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NeonDriftBoss3D;
