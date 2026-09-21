import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Zap,
  Gauge,
  Flame,
  Award,
  Crown,
  Sparkles,
  ChevronRight,
  Compass,
  Radio,
  Timer,
  Sliders,
  Shield,
  Palette,
  Flag
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// --- VEHICLE GARAGE PRESETS ---
export interface JetSkiPreset {
  id: string;
  name: string;
  subtitle: string;
  colorHex: number;
  secondaryHex: number;
  speedRating: number;
  accelRating: number;
  handlingRating: number;
  stuntRating: number;
  topSpeedMph: number;
  accelRate: number;
  turnSpeed: number;
  stuntBonusMult: number;
  accentColor: string;
}

const PRESET_VEHICLES: JetSkiPreset[] = [
  {
    id: 'vortex-x1',
    name: 'VORTEX X-1',
    subtitle: 'Apex Precision Watercraft',
    colorHex: 0x00f0ff,
    secondaryHex: 0xffffff,
    speedRating: 85,
    accelRating: 88,
    handlingRating: 92,
    stuntRating: 85,
    topSpeedMph: 162,
    accelRate: 0.032,
    turnSpeed: 0.042,
    stuntBonusMult: 1.0,
    accentColor: '#00f0ff'
  },
  {
    id: 'hyper-viper',
    name: 'HYPER-VIPER GT',
    subtitle: 'Supersonic Speed Demon',
    colorHex: 0xff0055,
    secondaryHex: 0xfacc15,
    speedRating: 98,
    accelRating: 95,
    handlingRating: 78,
    stuntRating: 80,
    topSpeedMph: 185,
    accelRate: 0.045,
    turnSpeed: 0.035,
    stuntBonusMult: 1.2,
    accentColor: '#ff0055'
  },
  {
    id: 'phantom-surge',
    name: 'PHANTOM SURGE 3K',
    subtitle: 'Aerial Stunt Overlord',
    colorHex: 0xa855f7,
    secondaryHex: 0x39ff14,
    speedRating: 80,
    accelRating: 85,
    handlingRating: 98,
    stuntRating: 100,
    topSpeedMph: 152,
    accelRate: 0.034,
    turnSpeed: 0.048,
    stuntBonusMult: 2.0,
    accentColor: '#a855f7'
  }
];

// --- ENVIRONMENT THEMES ---
export type TrackTheme = 'tokyo-bay' | 'solar-reef';

// --- RACER INTERFACES ---
interface RacerState {
  id: number;
  name: string;
  isPlayer: boolean;
  colorHex: number;
  secondaryHex: number;
  x: number;
  z: number;
  y: number;
  vy: number;
  speed: number;
  angle: number;
  pitch: number;
  roll: number;
  isAirborne: boolean;
  airTime: number;
  stuntRotation: number;
  stuntsInAir: number;
  lap: number;
  checkpointIndex: number;
  mesh: THREE.Group;
  trailParticles: THREE.Points;
  trailPositions: Float32Array;
  sprayMeshes: THREE.Mesh[];
  engineLight?: THREE.PointLight;
}

interface Checkpoint {
  x: number;
  z: number;
  radius: number;
}

interface TrackObject {
  type: 'ramp' | 'ring' | 'coin' | 'buoy' | 'arch';
  x: number;
  z: number;
  mesh: THREE.Group | THREE.Mesh;
  collected?: boolean;
}

// Track Path Waypoints (Dynamic Lagoon Circuit Loop)
const TRACK_POINTS: [number, number][] = [
  [0, -220],
  [140, -180],
  [260, -60],
  [280, 110],
  [190, 240],
  [50, 290],
  [-130, 250],
  [-250, 130],
  [-260, -30],
  [-150, -170]
];

export const CyberTurboJetSki3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Selected Vehicle & Track Settings
  const [selectedVehicle, setSelectedVehicle] = useState<JetSkiPreset>(PRESET_VEHICLES[0]);
  const [selectedTheme, setSelectedTheme] = useState<TrackTheme>('tokyo-bay');

  // React UI States
  const [gameState, setGameState] = useState<'menu' | 'garage' | 'playing' | 'gameover' | 'victory'>('menu');
  const [currentLap, setCurrentLap] = useState<number>(1);
  const [totalLaps] = useState<number>(3);
  const [playerRank, setPlayerRank] = useState<number>(1);
  const [speedMph, setSpeedMph] = useState<number>(0);
  const [rpmPercent, setRpmPercent] = useState<number>(0);
  const [nitro, setNitro] = useState<number>(100);
  const [isBoosting, setIsBoosting] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [stuntScore, setStuntScore] = useState<number>(0);
  const [raceTime, setRaceTime] = useState<number>(0);
  const [lapTimes, setLapTimes] = useState<number[]>([]);
  const [stuntNotification, setStuntNotification] = useState<{ title: string; pts: number; color: string } | null>(null);
  const [overtakeAlert, setOvertakeAlert] = useState<string | null>(null);
  const [bestLapTime, setBestLapTime] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_jetski_best_lap');
    return saved ? parseFloat(saved) : 24.5;
  });

  // Mobile & Keyboard Input State Ref
  const inputRef = useRef({
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    boost: false,
    stuntRoll: false,
    stuntFlip: false
  });

  // Three.js Engine References
  const engineRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    waterMesh: THREE.Mesh | null;
    waterGeo: THREE.PlaneGeometry | null;
    racers: RacerState[];
    trackObjects: TrackObject[];
    checkpoints: Checkpoint[];
    clock: THREE.Clock;
    lapStartTime: number;
    camShake: number;
    boostTimer: number;
    lastRank: number;
    audioCtx: AudioContext | null;
    engineOsc: OscillatorNode | null;
    engineGain: GainNode | null;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    waterMesh: null,
    waterGeo: null,
    racers: [],
    trackObjects: [],
    checkpoints: [],
    clock: new THREE.Clock(),
    lapStartTime: 0,
    camShake: 0,
    boostTimer: 0,
    lastRank: 1,
    audioCtx: null,
    engineOsc: null,
    engineGain: null
  });

  // Multi-Harmonic Gerstner Ocean Wave Simulation
  const getWaveHeight = (x: number, z: number, time: number): number => {
    const w1 = Math.sin(x * 0.042 + time * 2.5) * Math.cos(z * 0.038 + time * 2.1) * 2.1;
    const w2 = Math.sin((x * 0.7 + z) * 0.028 + time * 1.7) * 1.4;
    const w3 = Math.cos((x - z) * 0.065 - time * 2.8) * 0.7;
    return w1 + w2 + w3;
  };

  // Trigger Stunt Alert Notification
  const triggerStunt = (title: string, pts: number, color: string = '#facc15') => {
    setStuntNotification({ title, pts, color });
    setStuntScore((s) => s + pts);
    setScore((sc) => sc + pts);
    setNitro((n) => Math.min(100, n + 35));
    sound.playPowerup();
    setTimeout(() => setStuntNotification(null), 2000);
  };

  // Trigger Overtake / Event Alert
  const triggerOvertake = (text: string) => {
    setOvertakeAlert(text);
    setTimeout(() => setOvertakeAlert(null), 1800);
  };

  // Construct High-Detail 3D Cyber Jet-Ski Mesh with Rooster Tail Spray
  const createDetailedJetSkiMesh = (colorHex: number, secondaryHex: number): { mesh: THREE.Group; sprayMeshes: THREE.Mesh[]; engineLight: THREE.PointLight } => {
    const group = new THREE.Group();

    // 1. Sleek Stepped Hydro V-Keel
    const keelGeo = new THREE.ConeGeometry(1.7, 6.8, 6);
    keelGeo.rotateX(Math.PI / 2);
    keelGeo.scale(1, 0.42, 1);
    const keelMat = new THREE.MeshStandardMaterial({
      color: 0x050f24,
      roughness: 0.15,
      metalness: 0.95
    });
    const keelMesh = new THREE.Mesh(keelGeo, keelMat);
    keelMesh.position.y = 0.2;
    group.add(keelMesh);

    // 2. Upper Aerodynamic Neon Shell Deck
    const deckGeo = new THREE.ConeGeometry(1.5, 5.4, 6);
    deckGeo.rotateX(Math.PI / 2);
    deckGeo.scale(0.92, 0.38, 0.92);
    const deckMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.1,
      metalness: 0.9,
      emissive: colorHex,
      emissiveIntensity: 0.4
    });
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.set(0, 0.58, -0.2);
    group.add(deckMesh);

    // 3. Side Carbon Aerodynamic Sponsons
    const sponsonGeo = new THREE.BoxGeometry(0.3, 0.25, 3.2);
    const sponsonMat = new THREE.MeshStandardMaterial({ color: secondaryHex, metalness: 0.9, roughness: 0.2 });
    const sponsonL = new THREE.Mesh(sponsonGeo, sponsonMat);
    sponsonL.position.set(-1.1, 0.35, -0.6);
    const sponsonR = new THREE.Mesh(sponsonGeo, sponsonMat);
    sponsonR.position.set(1.1, 0.35, -0.6);
    group.add(sponsonL);
    group.add(sponsonR);

    // 4. Holographic Glass Windshield & Handlebar Cockpit
    const shieldGeo = new THREE.BoxGeometry(0.85, 0.65, 0.7);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.05,
      metalness: 0.9,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.85
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.set(0, 1.05, 0.45);
    group.add(shieldMesh);

    // 5. Pilot Cyber Racer
    const pilotGroup = new THREE.Group();
    // Torso / Lifevest
    const torsoGeo = new THREE.BoxGeometry(0.85, 1.05, 0.65);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.set(0, 1.15, -0.45);
    pilotGroup.add(torsoMesh);

    // Cyber Helmet
    const helmetGeo = new THREE.SphereGeometry(0.44, 16, 16);
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: colorHex,
      emissiveIntensity: 0.3
    });
    const helmetMesh = new THREE.Mesh(helmetGeo, helmetMat);
    helmetMesh.position.set(0, 1.9, -0.35);
    pilotGroup.add(helmetMesh);

    // Visor HUD Bar
    const visorGeo = new THREE.BoxGeometry(0.58, 0.22, 0.3);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 1.9, -0.1);
    pilotGroup.add(visorMesh);

    group.add(pilotGroup);

    // 6. Dual Jet Turbine Afterburners (Glow Nozzles)
    const nozzleGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.7, 12);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzleMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const nozzleL = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzleL.position.set(-0.55, 0.38, -3.2);
    const nozzleR = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzleR.position.set(0.55, 0.38, -3.2);
    group.add(nozzleL);
    group.add(nozzleR);

    // 7. Dynamic Rooster Tail Spray Meshes (Left & Right water carving wake)
    const sprayGeo = new THREE.ConeGeometry(0.6, 3.5, 6);
    sprayGeo.rotateX(Math.PI / 2);
    const sprayMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const sprayL = new THREE.Mesh(sprayGeo, sprayMat);
    sprayL.position.set(-1.2, 0.2, -2.5);
    sprayL.scale.set(0.1, 0.1, 0.1);
    const sprayR = new THREE.Mesh(sprayGeo, sprayMat);
    sprayR.position.set(1.2, 0.2, -2.5);
    sprayR.scale.set(0.1, 0.1, 0.1);
    group.add(sprayL);
    group.add(sprayR);

    // 8. Underglow Point Light
    const engineLight = new THREE.PointLight(colorHex, 3, 14);
    engineLight.position.set(0, 0.2, -1.0);
    group.add(engineLight);

    return { mesh: group, sprayMeshes: [sprayL, sprayR], engineLight };
  };

  // Build Lagoon Circuit Objects: Neon Slalom Buoys, Grandstands, Monster Jump Ramps & Turbo Rings
  const buildTrackWorld = (scene: THREE.Scene, theme: TrackTheme) => {
    const trackObjects: TrackObject[] = [];
    const checkpoints: Checkpoint[] = [];

    // Track Checkpoints & Floating Buoys
    TRACK_POINTS.forEach(([tx, tz], idx) => {
      checkpoints.push({ x: tx, z: tz, radius: 32 });

      const nextPt = TRACK_POINTS[(idx + 1) % TRACK_POINTS.length];
      const dx = nextPt[0] - tx;
      const dz = nextPt[1] - tz;
      const angle = Math.atan2(dz, dx) + Math.PI / 2;

      // Outer & Inner Neon Slalom Buoys
      [-22, 22].forEach((offset) => {
        const bx = tx + Math.cos(angle) * offset;
        const bz = tz + Math.sin(angle) * offset;

        const buoyGroup = new THREE.Group();
        const buoyGeo = new THREE.CylinderGeometry(0.9, 1.4, 4.2, 12);
        const buoyMat = new THREE.MeshStandardMaterial({
          color: idx === 0 ? 0xff0055 : offset < 0 ? 0x00f0ff : 0x39ff14,
          emissive: idx === 0 ? 0xff0055 : offset < 0 ? 0x00f0ff : 0x39ff14,
          emissiveIntensity: 0.75
        });
        const buoyMesh = new THREE.Mesh(buoyGeo, buoyMat);
        buoyGroup.add(buoyMesh);
        buoyGroup.position.set(bx, 0, bz);
        scene.add(buoyGroup);

        trackObjects.push({ type: 'buoy', x: bx, z: bz, mesh: buoyGroup });
      });

      // Monster Wave Jump Ramps with Speed Boost Chevrons
      if (idx === 2 || idx === 5 || idx === 8) {
        const rampGroup = new THREE.Group();
        const rampGeo = new THREE.BoxGeometry(14, 2.2, 18);
        rampGeo.rotateX(-Math.PI / 9);
        const rampMat = new THREE.MeshStandardMaterial({
          color: 0xff007f,
          emissive: 0xff007f,
          emissiveIntensity: 0.6,
          roughness: 0.2
        });
        const rampMesh = new THREE.Mesh(rampGeo, rampMat);
        rampGroup.add(rampMesh);

        // Chevron Graphics
        const chevronGeo = new THREE.PlaneGeometry(8, 4);
        chevronGeo.rotateX(-Math.PI / 2 - Math.PI / 9);
        const chevronMat = new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide });
        const chevronMesh = new THREE.Mesh(chevronGeo, chevronMat);
        chevronMesh.position.set(0, 1.4, 0);
        rampGroup.add(chevronMesh);

        const rampAngle = Math.atan2(dz, dx) - Math.PI / 2;
        rampGroup.rotation.y = rampAngle;
        rampGroup.position.set(tx, 0.8, tz);
        scene.add(rampGroup);

        trackObjects.push({ type: 'ramp', x: tx, z: tz, mesh: rampGroup });
      }

      // Supersonic Turbo Boost Rings
      if (idx === 1 || idx === 4 || idx === 7) {
        const ringGeo = new THREE.TorusGeometry(6, 0.55, 12, 28);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(tx, 5.5, tz);
        ringMesh.rotation.y = Math.atan2(dz, dx);
        scene.add(ringMesh);

        trackObjects.push({ type: 'ring', x: tx, z: tz, mesh: ringMesh });
      }

      // Floating Score Crystals
      for (let c = 1; c <= 2; c++) {
        const frac = c / 3;
        const cx = tx + dx * frac;
        const cz = tz + dz * frac;

        const crystalGeo = new THREE.OctahedronGeometry(1.4, 0);
        const crystalMat = new THREE.MeshStandardMaterial({
          color: 0xfde047,
          emissive: 0xfde047,
          emissiveIntensity: 0.9
        });
        const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
        crystalMesh.position.set(cx, 3.0, cz);
        scene.add(crystalMesh);

        trackObjects.push({ type: 'coin', x: cx, z: cz, mesh: crystalMesh, collected: false });
      }
    });

    // Start / Finish Holographic Laser Arch Gate
    const startPt = TRACK_POINTS[0];
    const archGroup = new THREE.Group();
    const archPillarGeo = new THREE.CylinderGeometry(1.2, 1.6, 22, 12);
    const archMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    const archGlowMat = new THREE.MeshBasicMaterial({ color: 0xff007f });

    const pillarL = new THREE.Mesh(archPillarGeo, archMat);
    pillarL.position.set(-25, 10, 0);
    const pillarR = new THREE.Mesh(archPillarGeo, archMat);
    pillarR.position.set(25, 10, 0);
    archGroup.add(pillarL);
    archGroup.add(pillarR);

    // Cross beam
    const beamGeo = new THREE.BoxGeometry(54, 2.5, 3.5);
    const beamMesh = new THREE.Mesh(beamGeo, archGlowMat);
    beamMesh.position.set(0, 20, 0);
    archGroup.add(beamMesh);

    archGroup.position.set(startPt[0], 0, startPt[1]);
    scene.add(archGroup);

    engineRef.current.trackObjects = trackObjects;
    engineRef.current.checkpoints = checkpoints;
  };

  // Initialize Three.js Scene, Water Grid & Lighting
  const initThreeScene = useCallback(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(selectedTheme === 'tokyo-bay' ? 0x050518 : 0x14061a);
    scene.fog = new THREE.FogExp2(selectedTheme === 'tokyo-bay' ? 0x090928 : 0x240d2e, 0.0026);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.5, 1400);
    camera.position.set(0, 10, -25);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 3. Synthwave Lights
    const ambientLight = new THREE.AmbientLight(0x223366, 2.0);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xff007f, 2.8);
    dirLight.position.set(160, 140, 220);
    scene.add(dirLight);

    const sunLight = new THREE.DirectionalLight(0x00f0ff, 1.8);
    sunLight.position.set(-160, 90, -220);
    scene.add(sunLight);

    // 4. Giant 3D Undulating Water Mesh
    const waterGeo = new THREE.PlaneGeometry(1000, 1000, 90, 90);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: selectedTheme === 'tokyo-bay' ? 0x04112c : 0x1c0b2b,
      roughness: 0.12,
      metalness: 0.88,
      wireframe: false
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    scene.add(waterMesh);

    // Neon Cyber Grid Water Overlay
    const gridMat = new THREE.MeshBasicMaterial({
      color: selectedTheme === 'tokyo-bay' ? 0x00f0ff : 0xf43f5e,
      wireframe: true,
      transparent: true,
      opacity: 0.16
    });
    const gridMesh = new THREE.Mesh(waterGeo, gridMat);
    scene.add(gridMesh);

    // 5. Giant Horizon Synthwave Sun
    const sunGeo = new THREE.CircleGeometry(130, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: selectedTheme === 'tokyo-bay' ? 0xff007f : 0xfb923c,
      side: THREE.DoubleSide
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 50, 480);
    scene.add(sunMesh);

    // 6. Build Racers (1 Player + 3 AI Rivals)
    const racers: RacerState[] = [];
    const rivalConfigs = [
      { name: selectedVehicle.name, isPlayer: true, colorHex: selectedVehicle.colorHex, secondaryHex: selectedVehicle.secondaryHex, startOffset: 0 },
      { name: 'CYBER VIPER GT', isPlayer: false, colorHex: 0xff0055, secondaryHex: 0xfacc15, startOffset: -9 },
      { name: 'NEON SHARK 3D', isPlayer: false, colorHex: 0xfacc15, secondaryHex: 0x00f0ff, startOffset: 9 },
      { name: 'PHANTOM SURGE', isPlayer: false, colorHex: 0xa855f7, secondaryHex: 0x39ff14, startOffset: -18 }
    ];

    rivalConfigs.forEach((cfg, idx) => {
      const { mesh, sprayMeshes, engineLight } = createDetailedJetSkiMesh(cfg.colorHex, cfg.secondaryHex);
      const startPt = TRACK_POINTS[0];
      const nextPt = TRACK_POINTS[1];
      const startAngle = Math.atan2(nextPt[1] - startPt[1], nextPt[0] - startPt[0]);

      mesh.position.set(startPt[0] + cfg.startOffset, 0, startPt[1] - idx * 7);
      mesh.rotation.y = startAngle;
      scene.add(mesh);

      // Water spray wake particles
      const particleCount = 50;
      const trailPositions = new Float32Array(particleCount * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      const trailMat = new THREE.PointsMaterial({
        color: cfg.colorHex,
        size: 1.4,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
      });
      const trailParticles = new THREE.Points(trailGeo, trailMat);
      scene.add(trailParticles);

      racers.push({
        id: idx,
        name: cfg.name,
        isPlayer: cfg.isPlayer,
        colorHex: cfg.colorHex,
        secondaryHex: cfg.secondaryHex,
        x: mesh.position.x,
        z: mesh.position.z,
        y: 0,
        vy: 0,
        speed: 0,
        angle: startAngle,
        pitch: 0,
        roll: 0,
        isAirborne: false,
        airTime: 0,
        stuntRotation: 0,
        stuntsInAir: 0,
        lap: 1,
        checkpointIndex: 0,
        mesh,
        trailParticles,
        trailPositions,
        sprayMeshes,
        engineLight
      });
    });

    engineRef.current = {
      scene,
      camera,
      renderer,
      waterMesh,
      waterGeo,
      racers,
      trackObjects: [],
      checkpoints: [],
      clock: new THREE.Clock(),
      lapStartTime: 0,
      camShake: 0,
      boostTimer: 0,
      lastRank: 1,
      audioCtx: null,
      engineOsc: null,
      engineGain: null
    };

    buildTrackWorld(scene, selectedTheme);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedVehicle, selectedTheme]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const inp = inputRef.current;
      if (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'KeyW') inp.accelerate = true;
      if (e.key === 's' || e.key === 'ArrowDown' || e.key === 'KeyS') inp.brake = true;
      if (e.key === 'a' || e.key === 'ArrowLeft' || e.key === 'KeyA') inp.steerLeft = true;
      if (e.key === 'd' || e.key === 'ArrowRight' || e.key === 'KeyD') inp.steerRight = true;
      if (e.key === 'Shift' || e.key === 'ShiftLeft' || e.key === 'ShiftRight') inp.boost = true;
      if (e.key === ' ' || e.key === 'Space') inp.stuntRoll = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const inp = inputRef.current;
      if (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'KeyW') inp.accelerate = false;
      if (e.key === 's' || e.key === 'ArrowDown' || e.key === 'KeyS') inp.brake = false;
      if (e.key === 'a' || e.key === 'ArrowLeft' || e.key === 'KeyA') inp.steerLeft = false;
      if (e.key === 'd' || e.key === 'ArrowRight' || e.key === 'KeyD') inp.steerRight = false;
      if (e.key === 'Shift' || e.key === 'ShiftLeft' || e.key === 'ShiftRight') inp.boost = false;
      if (e.key === ' ' || e.key === 'Space') inp.stuntRoll = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Start Race
  const startRace = () => {
    initThreeScene();
    setGameState('playing');
    setCurrentLap(1);
    setScore(0);
    setStuntScore(0);
    setNitro(100);
    setRaceTime(0);
    setLapTimes([]);
    engineRef.current.lapStartTime = 0;
    sound.playWin();
  };

  // Draw 2D Minimap Radar
  const drawMinimap = (player: RacerState, rivals: RacerState[]) => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Map Center & Scaling
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 0.22;

    // Draw Track Path Loop
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    TRACK_POINTS.forEach(([tx, tz], i) => {
      const mx = centerX + tx * scale;
      const my = centerY + tz * scale;
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    });
    ctx.closePath();
    ctx.stroke();

    // Draw AI Rivals
    rivals.forEach((r) => {
      ctx.fillStyle = '#' + r.colorHex.toString(16).padStart(6, '0');
      ctx.beginPath();
      ctx.arc(centerX + r.x * scale, centerY + r.z * scale, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Player Jet-Ski Arrow
    ctx.save();
    ctx.translate(centerX + player.x * scale, centerY + player.z * scale);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Main 60 FPS Three.js Game Loop
  useEffect(() => {
    if (gameState === 'menu' || gameState === 'garage') {
      initThreeScene();
    }

    let animationId: number;

    const loop = () => {
      const engine = engineRef.current;
      if (!engine.scene || !engine.camera || !engine.renderer) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      const delta = Math.min(engine.clock.getDelta(), 0.05);
      const time = engine.clock.getElapsedTime();

      // 1. Deform Water Vertices with Gerstner Waves
      if (engine.waterGeo) {
        const posAttr = engine.waterGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          const vx = posAttr.getX(i);
          const vz = posAttr.getZ(i);
          const vy = getWaveHeight(vx, vz, time);
          posAttr.setY(i, vy);
        }
        posAttr.needsUpdate = true;
        engine.waterGeo.computeVertexNormals();
      }

      // Rotate Floating Coins & Rings
      engine.trackObjects.forEach((obj) => {
        if (obj.type === 'coin') {
          obj.mesh.rotation.y += 0.04;
          obj.mesh.rotation.x += 0.02;
        } else if (obj.type === 'ring') {
          obj.mesh.rotation.z += 0.025;
        }
      });

      // 2. Process Racers
      if (gameState === 'playing' || gameState === 'menu') {
        const inp = inputRef.current;
        const player = engine.racers[0];

        if (gameState === 'playing') {
          setRaceTime((t) => t + delta);
        }

        engine.racers.forEach((racer) => {
          const isPlayer = racer.isPlayer && gameState === 'playing';
          const waveY = getWaveHeight(racer.x, racer.z, time);

          if (isPlayer) {
            // Player Vehicle Physics & Garage Preset Attributes
            let maxSpeed = (selectedVehicle.topSpeedMph / 68) * 0.72;
            let accel = selectedVehicle.accelRate;
            const turnSpeed = selectedVehicle.turnSpeed;

            // Supersonic Nitro Boost Handling
            if ((inp.boost || engine.boostTimer > 0) && nitro > 0) {
              maxSpeed *= 1.45;
              accel *= 1.8;
              setIsBoosting(true);
              setNitro((n) => Math.max(0, n - 0.45));
              engine.camShake = Math.max(engine.camShake, 0.4);
              if (Math.random() < 0.18) sound.playJump();
            } else {
              setIsBoosting(false);
            }

            if (inp.accelerate) {
              racer.speed = Math.min(racer.speed + accel, maxSpeed);
            } else if (inp.brake) {
              racer.speed = Math.max(racer.speed - accel * 1.6, -0.45);
            } else {
              racer.speed *= 0.986; // Hydrodynamic friction
            }

            // Steering & Carving Roll
            if (inp.steerLeft) {
              racer.angle += turnSpeed * (racer.speed >= 0 ? 1 : -1);
              racer.roll = Math.max(racer.roll - 0.09, -0.5);
            } else if (inp.steerRight) {
              racer.angle -= turnSpeed * (racer.speed >= 0 ? 1 : -1);
              racer.roll = Math.min(racer.roll + 0.09, 0.5);
            } else {
              racer.roll *= 0.88;
            }

            // Mid-Air Multi-Axis Aerial Stunts!
            if (racer.isAirborne) {
              if (inp.stuntRoll || inp.steerLeft || inp.steerRight) {
                racer.stuntRotation += 0.18;
                racer.roll += 0.25;

                if (racer.stuntRotation >= Math.PI * 2) {
                  racer.stuntRotation = 0;
                  racer.stuntsInAir++;
                  const basePts = 500 * selectedVehicle.stuntBonusMult;
                  const pts = Math.round(basePts * (racer.stuntsInAir > 1 ? 1.5 : 1));
                  triggerStunt(
                    racer.stuntsInAir > 1 ? `🔥 DOUBLE BARREL ROLL! +${pts} PTS` : `⚡ 360° BARREL ROLL! +${pts} PTS`,
                    pts,
                    '#00f0ff'
                  );
                }
              }

              if (inp.accelerate || inp.brake) {
                racer.pitch += inp.accelerate ? 0.22 : -0.22;
                if (Math.abs(racer.pitch) >= Math.PI * 2) {
                  racer.pitch = 0;
                  racer.stuntsInAir++;
                  const pts = Math.round(800 * selectedVehicle.stuntBonusMult);
                  triggerStunt(`🚀 SUPER 360° BACKFLIP! +${pts} PTS`, pts, '#ff0055');
                }
              }
            }

            // Update UI gauges
            const curMph = Math.round(racer.speed * 68);
            setSpeedMph(curMph);
            setRpmPercent(Math.min(100, Math.round((racer.speed / maxSpeed) * 100)));
          } else {
            // AI Rival Navigation
            const targetCheckpoint = engine.checkpoints[racer.checkpointIndex];
            if (targetCheckpoint) {
              const dx = targetCheckpoint.x - racer.x;
              const dz = targetCheckpoint.z - racer.z;
              const targetAngle = Math.atan2(dz, dx);

              let angleDiff = targetAngle - racer.angle;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

              racer.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.034);
              racer.speed = 1.38 + Math.sin(time * 1.5 + racer.id) * 0.18;
              racer.roll = -angleDiff * 0.45;
            }
          }

          // Advance Position
          racer.x += Math.cos(racer.angle) * racer.speed;
          racer.z += Math.sin(racer.angle) * racer.speed;

          // Water Buoyancy & Flight Gravity Physics
          if (racer.y > waveY + 0.5) {
            racer.isAirborne = true;
            racer.airTime += delta;
            racer.vy -= 0.025;
            racer.y += racer.vy;
            if (!racer.stuntRotation) racer.pitch = -racer.vy * 7;
          } else {
            // Clean Water Splashdown
            if (racer.isAirborne && racer.vy < -0.22) {
              sound.playHit();
              if (racer.isPlayer) {
                engine.camShake = 0.55;
                if (racer.stuntsInAir > 0) {
                  sound.playWin();
                }
              }
            }
            racer.isAirborne = false;
            racer.airTime = 0;
            racer.stuntsInAir = 0;
            racer.vy = 0;
            racer.y = waveY + 0.36;
            racer.pitch = Math.sin(time * 3.2 + racer.id) * 0.08;
          }

          // Transform Jet-Ski Mesh
          racer.mesh.position.set(racer.x, racer.y, racer.z);
          racer.mesh.rotation.y = -racer.angle + Math.PI / 2;
          racer.mesh.rotation.z = racer.roll;
          racer.mesh.rotation.x = racer.pitch;

          // Dynamic Rooster Tail Spray scaling
          const sprayScale = Math.min(1.8, Math.max(0.1, (racer.speed / 1.5) * (Math.abs(racer.roll) * 3 + 0.5)));
          if (racer.sprayMeshes[0] && racer.sprayMeshes[1]) {
            racer.sprayMeshes[0].scale.set(sprayScale, sprayScale, sprayScale * 1.5);
            racer.sprayMeshes[1].scale.set(sprayScale, sprayScale, sprayScale * 1.5);
          }

          // Collisions with Track Objects
          engine.trackObjects.forEach((obj) => {
            const dist = Math.hypot(racer.x - obj.x, racer.z - obj.z);

            // 1. Monster Jump Ramps
            if (obj.type === 'ramp' && dist < 9 && !racer.isAirborne) {
              racer.vy = 0.62 + racer.speed * 0.28;
              racer.isAirborne = true;
              sound.playJump();
              if (racer.isPlayer) {
                triggerStunt('🌊 MEGA WAVE LAUNCH!', 250, '#38bdf8');
              }
            }

            // 2. Turbo Boost Rings
            if (obj.type === 'ring' && dist < 6.5) {
              racer.speed = 2.45;
              sound.playPowerup();
              if (racer.isPlayer) {
                setNitro(100);
                engine.boostTimer = 45;
                triggerStunt('⚡ NITRO OVERDRIVE RING!', 300, '#00f0ff');
              }
            }

            // 3. Floating Score Coins
            if (obj.type === 'coin' && !obj.collected && dist < 4.5 && racer.isPlayer) {
              obj.collected = true;
              obj.mesh.position.y = -60;
              sound.playCollect();
              setScore((s) => s + 250);
              setNitro((n) => Math.min(100, n + 15));
            }
          });

          // Checkpoints & Lap System
          const curCp = engine.checkpoints[racer.checkpointIndex];
          if (curCp) {
            const distToCp = Math.hypot(racer.x - curCp.x, racer.z - curCp.z);
            if (distToCp < curCp.radius) {
              racer.checkpointIndex = (racer.checkpointIndex + 1) % engine.checkpoints.length;

              // Completed Full Lap
              if (racer.checkpointIndex === 0) {
                racer.lap++;
                if (racer.isPlayer) {
                  const curLapTime = raceTime - engine.lapStartTime;
                  engine.lapStartTime = raceTime;
                  setLapTimes((prev) => [...prev, curLapTime]);

                  if (curLapTime < bestLapTime) {
                    setBestLapTime(curLapTime);
                    localStorage.setItem('novaplay_jetski_best_lap', curLapTime.toFixed(1));
                    triggerOvertake(`🏆 NEW BEST LAP: ${curLapTime.toFixed(1)}s!`);
                  }

                  sound.playWin();
                  triggerStunt(`🏁 LAP ${racer.lap - 1} COMPLETED!`, 1000, '#39ff14');
                  setCurrentLap(racer.lap);

                  if (racer.lap > totalLaps) {
                    setGameState('victory');
                    confetti({ particleCount: 140, spread: 100, origin: { y: 0.5 } });
                    sound.playWin();
                  }
                }
              }
            }
          }

          // Update Spray Trail Particles
          const trailPos = racer.trailPositions;
          for (let p = trailPos.length - 3; p >= 3; p -= 3) {
            trailPos[p] = trailPos[p - 3];
            trailPos[p + 1] = trailPos[p - 2];
            trailPos[p + 2] = trailPos[p - 1];
          }
          trailPos[0] = racer.x - Math.cos(racer.angle) * 3.2;
          trailPos[1] = waveY + 0.25;
          trailPos[2] = racer.z - Math.sin(racer.angle) * 3.2;
          racer.trailParticles.geometry.attributes.position.needsUpdate = true;
        });

        // 3. Compute Real-Time Race Rank Ranking
        const sorted = [...engine.racers].sort((a, b) => {
          if (b.lap !== a.lap) return b.lap - a.lap;
          return b.checkpointIndex - a.checkpointIndex;
        });
        const pRank = sorted.findIndex((r) => r.isPlayer) + 1;
        setPlayerRank(pRank);

        if (pRank < engine.lastRank && gameState === 'playing') {
          triggerOvertake(pRank === 1 ? '🥇 YOU TOOK 1ST PLACE!' : `⚡ OVERTAKE! ${pRank}ND PLACE`);
        }
        engine.lastRank = pRank;

        // 4. Update Minimap
        drawMinimap(player, engine.racers.slice(1));

        // 5. Cinematic Dynamic Chase Camera
        const camDistance = isBoosting ? 28 : 22;
        const camHeight = isBoosting ? 9.5 : 8.0;
        const camTargetX = player.x - Math.cos(player.angle) * camDistance;
        const camTargetZ = player.z - Math.sin(player.angle) * camDistance;
        const camTargetY = player.y + camHeight;

        engine.camera.position.x += (camTargetX - engine.camera.position.x) * 0.12;
        engine.camera.position.z += (camTargetZ - engine.camera.position.z) * 0.12;
        engine.camera.position.y += (camTargetY - engine.camera.position.y) * 0.12;

        // Camera Shake
        if (engine.camShake > 0.02) {
          engine.camera.position.x += (Math.random() - 0.5) * engine.camShake;
          engine.camera.position.y += (Math.random() - 0.5) * engine.camShake;
          engine.camShake *= 0.92;
        }

        // Dynamic FOV Zoom
        const targetFov = isBoosting ? 76 : 65;
        engine.camera.fov += (targetFov - engine.camera.fov) * 0.1;
        engine.camera.updateProjectionMatrix();

        engine.camera.lookAt(player.x + Math.cos(player.angle) * 14, player.y + 1.5, player.z + Math.sin(player.angle) * 14);
      }

      // Render 3D Scene
      engine.renderer.render(engine.scene, engine.camera);
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, isBoosting, nitro, totalLaps, selectedVehicle, selectedTheme]);

  return (
    <div className="relative w-full h-[650px] md:h-[750px] bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)] select-none flex flex-col items-center justify-center font-sans">
      {/* 3D Three.js Container Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* TOP HEADS-UP DISPLAY (HUD) */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none z-10">
          {/* Rank & Lap & Minimap Radar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {/* Rank Badge */}
              <div
                className={`px-4 py-2 rounded-xl border font-black text-2xl md:text-3xl backdrop-blur-md shadow-lg ${
                  playerRank === 1
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                    : playerRank === 2
                    ? 'bg-slate-400/25 border-slate-300 text-slate-200'
                    : 'bg-rose-500/25 border-rose-400 text-rose-300'
                }`}
              >
                {playerRank === 1 ? '1ST' : playerRank === 2 ? '2ND' : playerRank === 3 ? '3RD' : '4TH'}
              </div>

              {/* Lap Counter */}
              <div className="bg-slate-900/85 border border-cyan-500/40 px-3.5 py-1.5 rounded-xl backdrop-blur-md">
                <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold block">CIRCUIT LAP</span>
                <span className="font-black text-lg md:text-xl text-white">
                  {Math.min(currentLap, totalLaps)} / {totalLaps}
                </span>
              </div>
            </div>

            {/* Minimap Radar */}
            <div className="bg-slate-950/80 border border-cyan-500/40 p-1.5 rounded-2xl backdrop-blur-md shadow-lg w-28 h-28 hidden sm:block">
              <canvas ref={minimapCanvasRef} width={100} height={100} className="w-full h-full" />
            </div>
          </div>

          {/* Stunt & Overtake Central Dynamic Banners */}
          <div className="flex flex-col items-center gap-2">
            {stuntNotification && (
              <div
                className="px-5 py-2 rounded-2xl border-2 text-white font-black text-sm md:text-lg tracking-wider shadow-[0_0_30px_rgba(255,0,127,0.8)] animate-bounce text-center whitespace-nowrap backdrop-blur-md"
                style={{ backgroundColor: `${stuntNotification.color}dd`, borderColor: stuntNotification.color }}
              >
                <span>{stuntNotification.title}</span>
              </div>
            )}
            {overtakeAlert && (
              <div className="px-4 py-1.5 rounded-xl bg-cyan-600/90 border border-cyan-300 text-white font-black text-xs md:text-sm tracking-wider shadow-lg animate-pulse backdrop-blur-md">
                {overtakeAlert}
              </div>
            )}
          </div>

          {/* Speedometer, RPM Shift Lights & Nitro Boost Gauge */}
          <div className="flex flex-col items-end gap-2">
            {/* Speedometer Box */}
            <div className="flex items-center gap-2 bg-slate-900/85 border border-cyan-500/40 px-4 py-1.5 rounded-xl backdrop-blur-md shadow-lg">
              <Gauge className="w-5 h-5 text-cyan-400" />
              <div className="flex items-baseline gap-1">
                <span className="font-black text-2xl md:text-3xl text-cyan-300">{speedMph}</span>
                <span className="text-xs text-slate-400 font-bold">MPH</span>
              </div>
            </div>

            {/* RPM Tachometer Shift Lights */}
            <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-700 px-2 py-1 rounded-lg backdrop-blur-md">
              {[20, 40, 60, 80, 95].map((thresh, idx) => (
                <div
                  key={idx}
                  className={`w-3 h-2 rounded-sm transition-all duration-75 ${
                    rpmPercent >= thresh
                      ? idx >= 3
                        ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                        : idx === 2
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                        : 'bg-lime-400 shadow-[0_0_8px_rgba(57,255,20,0.8)]'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* Nitro Boost Gauge */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-amber-400 font-bold">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                <span>NITRO TURBO</span>
              </div>
              <div className="w-32 md:w-44 bg-slate-900/90 border border-amber-500/40 rounded-full h-4 overflow-hidden p-0.5 backdrop-blur-md shadow-lg">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-pink-500 to-cyan-400 rounded-full transition-all duration-75 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                  style={{ width: `${nitro}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE TOUCH ON-SCREEN CONTROLS */}
      {gameState === 'playing' && (
        <div className="absolute bottom-6 left-4 right-4 flex justify-between items-end z-20 md:hidden pointer-events-auto">
          {/* STEER BUTTONS LEFT */}
          <div className="flex items-center gap-2">
            <button
              onTouchStart={() => (inputRef.current.steerLeft = true)}
              onTouchEnd={() => (inputRef.current.steerLeft = false)}
              className="w-16 h-16 rounded-2xl bg-cyan-600/80 active:bg-cyan-500 border-2 border-cyan-300 text-white font-black text-xl shadow-lg flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform"
            >
              ◀
            </button>
            <button
              onTouchStart={() => (inputRef.current.steerRight = true)}
              onTouchEnd={() => (inputRef.current.steerRight = false)}
              className="w-16 h-16 rounded-2xl bg-cyan-600/80 active:bg-cyan-500 border-2 border-cyan-300 text-white font-black text-xl shadow-lg flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform"
            >
              ▶
            </button>
          </div>

          {/* ACTION BUTTONS RIGHT */}
          <div className="flex items-center gap-2">
            {/* NITRO BOOST */}
            <button
              onTouchStart={() => (inputRef.current.boost = true)}
              onTouchEnd={() => (inputRef.current.boost = false)}
              className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-500 to-pink-600 active:scale-95 border-2 border-amber-300 text-white font-black text-xs shadow-[0_0_20px_rgba(245,158,11,0.6)] flex flex-col items-center justify-center backdrop-blur-md transition-transform"
            >
              <Zap className="w-6 h-6 fill-amber-300" />
              <span>NITRO</span>
            </button>

            {/* ACCELERATE */}
            <button
              onTouchStart={() => (inputRef.current.accelerate = true)}
              onTouchEnd={() => (inputRef.current.accelerate = false)}
              className="w-16 h-16 rounded-2xl bg-lime-600/80 active:bg-lime-500 border-2 border-lime-300 text-white font-black text-xs shadow-lg flex flex-col items-center justify-center backdrop-blur-md active:scale-95 transition-transform"
            >
              <span>GAS</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN MENU OVERLAY */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in overflow-y-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 font-bold text-xs tracking-widest uppercase mb-3 shadow-[0_0_15px_rgba(255,0,127,0.2)]">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>3D Cyber Watercraft Wave Championship</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 tracking-wider mb-2 drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">
            CYBER TURBO JET-SKI 3D
          </h1>
          <p className="text-cyan-300/80 max-w-lg text-sm md:text-base font-medium mb-6">
            Ride high-speed undulating ocean waves, launch off mega ramps for 360° stunt rolls & flips, ignite supersonic nitro, and win the Cyber Grand Prix!
          </p>

          {/* Quick Vehicle Select Preview in Menu */}
          <div className="flex items-center gap-3 mb-6">
            {PRESET_VEHICLES.map((veh) => (
              <button
                key={veh.id}
                onClick={() => setSelectedVehicle(veh)}
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  selectedVehicle.id === veh.id
                    ? 'bg-slate-800/90 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.4)] scale-105'
                    : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: veh.accentColor }} />
                <span>{veh.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setGameState('garage')}
              className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-bold text-sm tracking-wider uppercase flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Palette className="w-4 h-4" />
              <span>CUSTOM GARAGE</span>
            </button>

            <button
              onClick={startRace}
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-black text-lg tracking-wider uppercase shadow-[0_0_30px_rgba(255,0,127,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>START RACE</span>
            </button>
          </div>

          {bestLapTime < 999 && (
            <div className="flex items-center gap-2 mt-6 text-amber-400 text-sm font-bold">
              <Trophy className="w-4 h-4" />
              <span>ALL-TIME RECORD LAP: {bestLapTime.toFixed(1)}s</span>
            </div>
          )}
        </div>
      )}

      {/* CUSTOM VEHICLE GARAGE OVERLAY */}
      {gameState === 'garage' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in overflow-y-auto">
          <h2 className="text-3xl md:text-4xl font-black text-cyan-400 tracking-wider mb-2">
            CYBER WATERCRAFT GARAGE
          </h2>
          <p className="text-slate-400 text-sm mb-6">Choose and tune your specialized racing jet-ski</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full mb-8">
            {PRESET_VEHICLES.map((veh) => (
              <div
                key={veh.id}
                onClick={() => setSelectedVehicle(veh)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedVehicle.id === veh.id
                    ? 'bg-slate-900/90 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.4)] scale-102'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-lg text-white">{veh.name}</span>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: veh.accentColor }} />
                  </div>
                  <p className="text-xs text-slate-400 mb-4">{veh.subtitle}</p>

                  {/* Vehicle Stats Bars */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                        <span>Top Speed</span>
                        <span className="font-bold text-cyan-400">{veh.topSpeedMph} MPH</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${veh.speedRating}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                        <span>Acceleration</span>
                        <span className="font-bold text-amber-400">{veh.accelRating}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: `${veh.accelRating}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                        <span>Handling & Stunts</span>
                        <span className="font-bold text-pink-400">{veh.handlingRating}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-pink-400 h-full rounded-full" style={{ width: `${veh.handlingRating}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400">Stunt Multiplier:</span>
                  <span className="text-lime-400">{veh.stuntBonusMult}X PTS</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setGameState('menu')}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm tracking-wider cursor-pointer"
            >
              BACK TO MENU
            </button>
            <button
              onClick={startRace}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-black text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(0,240,255,0.5)] cursor-pointer"
            >
              CONFIRM & RACE
            </button>
          </div>
        </div>
      )}

      {/* VICTORY OVERLAY */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_30px_rgba(245,158,11,0.6)]">
            <Crown className="w-8 h-8" />
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-cyan-400 tracking-wider mb-2">
            GRAND PRIX VICTORY!
          </h2>
          <p className="text-slate-300 text-sm mb-6">You dominated the cyber wave circuit and took 1st Place!</p>

          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 max-w-sm w-full mb-6 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Total Race Time:</span>
              <span className="text-xl font-black text-cyan-400">{raceTime.toFixed(1)}s</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Stunt Score:</span>
              <span className="font-bold text-lime-400">{stuntScore.toLocaleString()} PTS</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Final Rank:</span>
              <span className="font-black text-amber-400">{playerRank === 1 ? '🥇 1ST PLACE' : `${playerRank}TH`}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setGameState('garage')}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer"
            >
              GARAGE
            </button>
            <button
              onClick={startRace}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-base tracking-wider uppercase shadow-[0_0_25px_rgba(0,240,255,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>RACE AGAIN</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
