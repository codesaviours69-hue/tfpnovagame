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
  Crown,
  Swords,
  Crosshair,
  ShoppingBag,
  Coins,
  Pause,
  Target
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// --- MECH CHASSIS DEFINITIONS ---
interface MechChassis {
  id: string;
  name: string;
  role: string;
  primaryColor: number;
  glowColor: number;
  maxHp: number;
  speed: number;
  gatlingDmg: number;
  missilesPerVolley: number;
  price: number;
  description: string;
}

const CHASSIS_LIST: MechChassis[] = [
  {
    id: 'aegis',
    name: 'Aegis Prime',
    role: 'Assault Brawler',
    primaryColor: 0x00f0ff,
    glowColor: 0x00f0ff,
    maxHp: 200,
    speed: 1.0,
    gatlingDmg: 15,
    missilesPerVolley: 4,
    price: 0,
    description: 'Balanced cybernetic vanguard with twin plasma gatlings and kinetic barrier shields.'
  },
  {
    id: 'phantom',
    name: 'Phantom Striker',
    role: 'High-Speed Blade',
    primaryColor: 0xff0055,
    glowColor: 0xff0055,
    maxHp: 160,
    speed: 1.35,
    gatlingDmg: 12,
    missilesPerVolley: 4,
    price: 350,
    description: 'Ultra-fast hover chassis optimized for rapid plasma blade cleaves and evasive dashes.'
  },
  {
    id: 'vortex',
    name: 'Vortex Dreadnought',
    role: 'Heavy Artillery',
    primaryColor: 0xfacc15,
    glowColor: 0xf59e0b,
    maxHp: 280,
    speed: 0.85,
    gatlingDmg: 20,
    missilesPerVolley: 6,
    price: 800,
    description: 'Colossal battle tank mech armed with devastating heavy cannons and 6-pod missile salvos.'
  }
];

interface Pillar {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  destroyed: boolean;
}

interface EnemyMech {
  id: number;
  type: 'drone' | 'stalker' | 'boss';
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  speed: number;
  attackTimer: number;
  stateTimer: number;
  facingAngle: number;
  phase?: number;
}

interface Projectile {
  mesh: THREE.Mesh | THREE.Group;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  isPlayer: boolean;
  type: 'gatling' | 'missile' | 'boss_laser' | 'enemy_bullet';
  life: number;
  targetEnemy?: EnemyMech;
}

interface Particle3D {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export const CyberMechBrawler3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // UI State
  const [gameState, setGameState] = useState<'menu' | 'hangar' | 'playing' | 'paused' | 'gameover' | 'victory'>('menu');
  const [wave, setWave] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [scrap, setScrap] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_mech_scrap');
    return saved !== null ? parseInt(saved, 10) : 100;
  });
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_mech_high');
    return saved !== null ? parseInt(saved, 10) : 12000;
  });
  const [selectedChassisIdx, setSelectedChassisIdx] = useState<number>(0);
  const [unlockedChassis, setUnlockedChassis] = useState<string[]>(() => {
    const saved = localStorage.getItem('novaplay_mech_unlocked');
    return saved ? JSON.parse(saved) : ['aegis'];
  });

  // Upgrades with LocalStorage Persistence
  const [weaponLvl, setWeaponLvl] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_mech_weap_lvl');
    return saved !== null ? parseInt(saved, 10) : 1;
  });
  const [armorLvl, setArmorLvl] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_mech_armor_lvl');
    return saved !== null ? parseInt(saved, 10) : 1;
  });
  const [missileLvl, setMissileLvl] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_mech_missile_lvl');
    return saved !== null ? parseInt(saved, 10) : 1;
  });

  // In-Game Live Stats
  const [hp, setHp] = useState<number>(200);
  const [maxHp, setMaxHp] = useState<number>(200);
  const [missiles, setMissiles] = useState<number>(12);
  const [bossHp, setBossHp] = useState<number | null>(null);
  const [bossMaxHp, setBossMaxHp] = useState<number | null>(null);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Mutable Game Loop State
  const simState = useRef({
    gameState: 'menu',
    hp: 200,
    maxHp: 200,
    score: 0,
    wave: 1,
    missiles: 12,
    isShieldActive: false,
    shieldTimer: 0,
    dashTimer: 0,
    fireCooldown: 0,
    bladeCooldown: 0,
    spawnGracePeriod: 0,
    isWaveClearing: false,
    weaponLvl: 1,
    armorLvl: 1,
    missileLvl: 1,
    chassis: CHASSIS_LIST[0]
  });

  const keysRef = useRef<Record<string, boolean>>({});
  const mousePosRef = useRef<{ worldX: number; worldZ: number; isDown: boolean }>({
    worldX: 0,
    worldZ: 0,
    isDown: false
  });

  const sceneRefs = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    playerMech: THREE.Group | null;
    playerTorso: THREE.Group | null;
    bladeMesh: THREE.Mesh | null;
    shieldMesh: THREE.Mesh | null;
    pillars: Pillar[];
    enemies: EnemyMech[];
    projectiles: Projectile[];
    particles: Particle3D[];
    nextEnemyId: number;
    camShake: number;
    walkCycle: number;
    bossMech: EnemyMech | null;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    playerMech: null,
    playerTorso: null,
    bladeMesh: null,
    shieldMesh: null,
    pillars: [],
    enemies: [],
    projectiles: [],
    particles: [],
    nextEnemyId: 1,
    camShake: 0,
    walkCycle: 0,
    bossMech: null
  });

  // Keep simState synced with UI props
  useEffect(() => {
    simState.current.weaponLvl = weaponLvl;
    simState.current.armorLvl = armorLvl;
    simState.current.missileLvl = missileLvl;
    simState.current.chassis = CHASSIS_LIST[selectedChassisIdx];
  }, [weaponLvl, armorLvl, missileLvl, selectedChassisIdx]);

  // Sound Toggle
  const handleToggleSound = () => {
    const isMute = sound.toggleMute();
    setMuted(isMute);
  };

  // Spawn 3D Particles Burst
  const spawnParticles3D = (x: number, y: number, z: number, colorHex: number, count: number = 20, speedMult: number = 1) => {
    const sc = sceneRefs.current;
    if (!sc.scene) return;

    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.18 + Math.random() * 0.15, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, wireframe: false });
      const pMesh = new THREE.Mesh(geo, mat);
      pMesh.position.set(x, y, z);
      sc.scene.add(pMesh);

      const angle = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.3) * Math.PI;
      const speed = (Math.random() * 8 + 3) * speedMult;

      sc.particles.push({
        mesh: pMesh,
        vx: Math.cos(angle) * Math.cos(elev) * speed,
        vy: Math.sin(elev) * speed + 2,
        vz: Math.sin(angle) * Math.cos(elev) * speed,
        life: 25 + Math.random() * 20,
        maxLife: 45,
        color: new THREE.Color(colorHex)
      });
    }
  };

  // Start / Spawn Wave
  const startWave = (waveNum: number) => {
    const sc = sceneRefs.current;
    if (!sc.scene) return;

    // Reset wave clearing state
    simState.current.isWaveClearing = false;
    simState.current.wave = waveNum;
    setWave(waveNum);

    // Clear old active entities
    sc.enemies.forEach((e) => sc.scene?.remove(e.mesh));
    sc.projectiles.forEach((p) => sc.scene?.remove(p.mesh));
    sc.enemies = [];
    sc.projectiles = [];
    sc.bossMech = null;
    setBossHp(null);
    setBossMaxHp(null);

    // Reset Player position to center
    if (sc.playerMech) {
      sc.playerMech.position.set(0, 0, 0);
    }

    const isBossWave = waveNum % 3 === 0;

    if (isBossWave) {
      // Spawn Titan Goliath Boss Mech
      const bossGroup = new THREE.Group();

      const torsoGeo = new THREE.BoxGeometry(4.5, 4.0, 3.5);
      const torsoMat = new THREE.MeshStandardMaterial({ color: 0x3b0764, metalness: 0.8, roughness: 0.3, emissive: 0x9333ea, emissiveIntensity: 0.3 });
      const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
      torsoMesh.position.y = 3.5;
      bossGroup.add(torsoMesh);

      const coreGeo = new THREE.OctahedronGeometry(1.2);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.set(0, 3.5, 1.8);
      bossGroup.add(coreMesh);

      const armGeo = new THREE.CylinderGeometry(0.8, 0.8, 4.5, 8);
      const armMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.9, roughness: 0.2 });
      const leftArm = new THREE.Mesh(armGeo, armMat);
      leftArm.rotation.x = Math.PI / 2;
      leftArm.position.set(-3.2, 3.5, 1.2);
      bossGroup.add(leftArm);

      const rightArm = leftArm.clone();
      rightArm.position.set(3.2, 3.5, 1.2);
      bossGroup.add(rightArm);

      bossGroup.position.set(0, 0, -32);
      sc.scene.add(bossGroup);

      const bHp = 700 + waveNum * 350;
      const bossEnemy: EnemyMech = {
        id: sc.nextEnemyId++,
        type: 'boss',
        mesh: bossGroup,
        hp: bHp,
        maxHp: bHp,
        speed: 3.5,
        attackTimer: 0,
        stateTimer: 0,
        facingAngle: 0,
        phase: 1
      };
      sc.enemies.push(bossEnemy);
      sc.bossMech = bossEnemy;
      setBossHp(bHp);
      setBossMaxHp(bHp);
      sound.playExplosion();
    } else {
      // Regular Wave Spawns
      const droneCount = 3 + waveNum * 2;
      const stalkerCount = 2 + Math.floor(waveNum * 1.2);

      for (let i = 0; i < droneCount; i++) {
        const droneGroup = new THREE.Group();
        const bodyGeo = new THREE.SphereGeometry(1.1, 12, 12);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.8, roughness: 0.3, emissive: 0x00f0ff, emissiveIntensity: 0.4 });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        droneGroup.add(bodyMesh);

        const eyeGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
        eyeMesh.position.set(0, 0, 1.0);
        droneGroup.add(eyeMesh);

        const angle = (i / droneCount) * Math.PI * 2;
        const radius = 26 + Math.random() * 8;
        droneGroup.position.set(Math.cos(angle) * radius, 2.5 + Math.random() * 1.5, Math.sin(angle) * radius);
        sc.scene.add(droneGroup);

        sc.enemies.push({
          id: sc.nextEnemyId++,
          type: 'drone',
          mesh: droneGroup,
          hp: 45 + waveNum * 12,
          maxHp: 45 + waveNum * 12,
          speed: 7.0 + Math.random() * 2,
          attackTimer: 30 + Math.floor(Math.random() * 60),
          stateTimer: 0,
          facingAngle: 0
        });
      }

      for (let i = 0; i < stalkerCount; i++) {
        const stalkerGroup = new THREE.Group();
        const sBodyGeo = new THREE.BoxGeometry(1.8, 1.2, 2.4);
        const sBodyMat = new THREE.MeshStandardMaterial({ color: 0xbe123c, metalness: 0.8, roughness: 0.3, emissive: 0xf43f5e, emissiveIntensity: 0.3 });
        const sBodyMesh = new THREE.Mesh(sBodyGeo, sBodyMat);
        sBodyMesh.position.y = 1.0;
        stalkerGroup.add(sBodyMesh);

        const angle = (i / stalkerCount) * Math.PI * 2 + 0.5;
        const radius = 28 + Math.random() * 8;
        stalkerGroup.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        sc.scene.add(stalkerGroup);

        sc.enemies.push({
          id: sc.nextEnemyId++,
          type: 'stalker',
          mesh: stalkerGroup,
          hp: 80 + waveNum * 20,
          maxHp: 80 + waveNum * 20,
          speed: 8.5 + Math.random() * 2,
          attackTimer: 20 + Math.floor(Math.random() * 50),
          stateTimer: 0,
          facingAngle: 0
        });
      }
    }
  };

  // Start / Restart Game Deployment
  const startMission = () => {
    const ch = CHASSIS_LIST[selectedChassisIdx];
    const initialMaxHp = ch.maxHp + armorLvl * 35;
    const initialMissiles = ch.missilesPerVolley * 3 + missileLvl * 4;

    simState.current.hp = initialMaxHp;
    simState.current.maxHp = initialMaxHp;
    simState.current.score = 0;
    simState.current.wave = 1;
    simState.current.missiles = initialMissiles;
    simState.current.shieldTimer = 0;
    simState.current.dashTimer = 0;
    simState.current.fireCooldown = 0;
    simState.current.bladeCooldown = 0;
    simState.current.spawnGracePeriod = 90; // 1.5 seconds invulnerability
    simState.current.gameState = 'playing';

    setHp(initialMaxHp);
    setMaxHp(initialMaxHp);
    setMissiles(initialMissiles);
    setScore(0);
    setWave(1);
    setGameState('playing');

    startWave(1);
    sound.playWin();
  };

  // Primary Gatling Gun Firing Action
  const triggerFireGatling = useCallback(() => {
    const sc = sceneRefs.current;
    if (!sc.scene || !sc.playerMech || !sc.playerTorso || simState.current.fireCooldown > 0 || simState.current.gameState !== 'playing') return;

    const ch = simState.current.chassis;
    const wLvl = simState.current.weaponLvl;

    simState.current.fireCooldown = 7;
    sound.playLaser();

    const pPos = sc.playerMech.position;
    const targetX = mousePosRef.current.worldX;
    const targetZ = mousePosRef.current.worldZ;
    const angle = Math.atan2(targetX - pPos.x, targetZ - pPos.z);

    [-0.8, 0.8].forEach((offsetSide) => {
      const geo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6);
      const mat = new THREE.MeshBasicMaterial({ color: ch.glowColor });
      const boltMesh = new THREE.Mesh(geo, mat);

      boltMesh.rotation.x = Math.PI / 2;
      boltMesh.rotation.z = angle;

      const spawnX = pPos.x + Math.sin(angle) * 2.2 + Math.cos(angle) * offsetSide;
      const spawnZ = pPos.z + Math.cos(angle) * 2.2 - Math.sin(angle) * offsetSide;
      boltMesh.position.set(spawnX, 1.6, spawnZ);
      sc.scene?.add(boltMesh);

      const speed = 45;
      sc.projectiles.push({
        mesh: boltMesh,
        x: spawnX,
        y: 1.6,
        z: spawnZ,
        vx: Math.sin(angle) * speed,
        vy: 0,
        vz: Math.cos(angle) * speed,
        damage: ch.gatlingDmg + wLvl * 5,
        isPlayer: true,
        type: 'gatling',
        life: 45
      });
    });

    spawnParticles3D(pPos.x + Math.sin(angle) * 2.5, 1.6, pPos.z + Math.cos(angle) * 2.5, ch.glowColor, 6, 0.8);
  }, []);

  // Energy Blade Cleave Melee Action
  const triggerBladeCleave = useCallback(() => {
    const sc = sceneRefs.current;
    if (!sc.scene || !sc.playerMech || simState.current.bladeCooldown > 0 || simState.current.gameState !== 'playing') return;

    simState.current.bladeCooldown = 28;
    sound.playPowerup();
    sc.camShake = 12;

    const pPos = sc.playerMech.position;
    const ch = simState.current.chassis;
    const wLvl = simState.current.weaponLvl;
    const bladeReach = 9.5 + wLvl * 1.5;
    const bladeDmg = 75 + wLvl * 25;

    for (let a = 0; a < 24; a++) {
      const sweepAngle = (a / 24) * Math.PI * 2;
      spawnParticles3D(pPos.x + Math.cos(sweepAngle) * (bladeReach * 0.7), 1.5, pPos.z + Math.sin(sweepAngle) * (bladeReach * 0.7), ch.glowColor, 3, 1.2);
    }

    sc.enemies.forEach((enemy) => {
      const dist = pPos.distanceTo(enemy.mesh.position);
      if (dist < bladeReach + 2.0) {
        enemy.hp -= bladeDmg;
        sound.playHit();
        spawnParticles3D(enemy.mesh.position.x, 2, enemy.mesh.position.z, 0xff0055, 25, 1.5);
      }
    });

    for (let i = sc.projectiles.length - 1; i >= 0; i--) {
      const proj = sc.projectiles[i];
      if (!proj.isPlayer) {
        const pDist = Math.hypot(proj.x - pPos.x, proj.z - pPos.z);
        if (pDist < bladeReach) {
          sc.scene?.remove(proj.mesh);
          sc.projectiles.splice(i, 1);
          spawnParticles3D(proj.x, proj.y, proj.z, 0x00f0ff, 12);
        }
      }
    }
  }, []);

  // Missile Salvo Launch Action
  const triggerMissiles = useCallback(() => {
    const sc = sceneRefs.current;
    if (!sc.scene || !sc.playerMech || simState.current.missiles <= 0 || simState.current.gameState !== 'playing') return;

    const ch = simState.current.chassis;
    const mLvl = simState.current.missileLvl;
    const count = ch.missilesPerVolley;

    simState.current.missiles = Math.max(0, simState.current.missiles - count);
    setMissiles(simState.current.missiles);
    sound.playLaser();
    sc.camShake = 15;

    const pPos = sc.playerMech.position;
    for (let i = 0; i < count; i++) {
      const missileGeo = new THREE.ConeGeometry(0.25, 1.0, 6);
      const missileMat = new THREE.MeshBasicMaterial({ color: 0xff9900 });
      const mMesh = new THREE.Mesh(missileGeo, missileMat);

      const spawnX = pPos.x + (i % 2 === 0 ? -1.5 : 1.5);
      const spawnZ = pPos.z;
      mMesh.position.set(spawnX, 3.2, spawnZ);
      sc.scene.add(mMesh);

      let nearestEn: EnemyMech | undefined = sc.enemies.length > 0 ? sc.enemies[i % sc.enemies.length] : undefined;

      const spreadAngle = (i - count / 2) * 0.3;
      sc.projectiles.push({
        mesh: mMesh,
        x: spawnX,
        y: 3.2,
        z: spawnZ,
        vx: Math.sin(spreadAngle) * 12,
        vy: 18 + Math.random() * 6,
        vz: Math.cos(spreadAngle) * 12,
        damage: 85 + mLvl * 30,
        isPlayer: true,
        type: 'missile',
        life: 90,
        targetEnemy: nearestEn
      });
    }
  }, []);

  // Deploy Plasma Shield Dome
  const triggerShield = useCallback(() => {
    const sc = sceneRefs.current;
    if (simState.current.shieldTimer > 0 || simState.current.gameState !== 'playing') return;

    sound.playPowerup();
    simState.current.shieldTimer = 300; // 5 seconds
  }, []);

  // Key Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code;

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(code)) {
        if (simState.current.gameState === 'playing') {
          e.preventDefault();
        }
      }

      keysRef.current[k] = true;
      keysRef.current[code] = true;

      if (k === 'escape' || k === 'p') {
        if (simState.current.gameState === 'playing') {
          simState.current.gameState = 'paused';
          setGameState('paused');
        } else if (simState.current.gameState === 'paused') {
          simState.current.gameState = 'playing';
          setGameState('playing');
        }
        sound.playClick();
      }

      if (k === 'e' || code === 'KeyE') triggerMissiles();
      if (k === 'q' || code === 'KeyQ') triggerShield();
      if (k === 'f' || code === 'KeyF') triggerBladeCleave();
      if (k === ' ' || code === 'Space') triggerFireGatling();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code;
      keysRef.current[k] = false;
      keysRef.current[code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerMissiles, triggerShield, triggerBladeCleave, triggerFireGatling]);

  // Main Three.js Scene Setup & Animation Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050114);
    scene.fog = new THREE.FogExp2(0x050114, 0.015);

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(0, 32, 28);
    camera.lookAt(0, 0, -4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    sceneRefs.current.scene = scene;
    sceneRefs.current.camera = camera;
    sceneRefs.current.renderer = renderer;

    const ambientLight = new THREE.AmbientLight(0x2e1065, 1.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 2.2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pinkRimLight = new THREE.PointLight(0xff0055, 3.5, 80);
    pinkRimLight.position.set(-25, 15, -25);
    scene.add(pinkRimLight);

    const arenaSize = 75;
    const gridHelper = new THREE.GridHelper(arenaSize, 30, 0x00f0ff, 0x1e1b4b);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    const floorGeo = new THREE.PlaneGeometry(arenaSize, arenaSize);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x07021c, metalness: 0.8, roughness: 0.4 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const ringGeo = new THREE.RingGeometry(arenaSize / 2 - 1, arenaSize / 2 + 1, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.1;
    scene.add(ringMesh);

    // Destructible Neon Cover Pillars
    const pillars: Pillar[] = [];
    const pillarCoords = [
      { x: -16, z: -16 },
      { x: 16, z: -16 },
      { x: -16, z: 16 },
      { x: 16, z: 16 },
      { x: 0, z: -20 },
      { x: 0, z: 20 }
    ];

    pillarCoords.forEach((coord) => {
      const pGeo = new THREE.CylinderGeometry(1.6, 1.8, 6.5, 8);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.9, roughness: 0.2 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(coord.x, 3.25, coord.z);
      pMesh.castShadow = true;
      pMesh.receiveShadow = true;
      scene.add(pMesh);

      const pLight = new THREE.PointLight(0x00f0ff, 2.0, 12);
      pLight.position.set(coord.x, 6.5, coord.z);
      scene.add(pLight);

      pillars.push({
        mesh: pMesh,
        light: pLight,
        x: coord.x,
        z: coord.z,
        hp: 150,
        maxHp: 150,
        destroyed: false
      });
    });
    sceneRefs.current.pillars = pillars;

    // Player Mech Model Hierarchy
    const playerGroup = new THREE.Group();
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.6;

    const chestGeo = new THREE.BoxGeometry(2.2, 1.8, 1.6);
    const chestMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
    const chestMesh = new THREE.Mesh(chestGeo, chestMat);
    torsoGroup.add(chestMesh);

    const coreGeo = new THREE.SphereGeometry(0.45, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 0, 0.85);
    torsoGroup.add(coreMesh);

    const coreLight = new THREE.PointLight(0x00f0ff, 3.0, 15);
    coreLight.position.set(0, 0, 1.2);
    torsoGroup.add(coreLight);

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-1.6, 0.2, 0.4);
    const bladeGeo = new THREE.BoxGeometry(0.15, 3.8, 0.6);
    const bladeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
    const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
    bladeMesh.position.set(0, 0, 1.8);
    bladeMesh.rotation.x = Math.PI / 2;
    leftArmGroup.add(bladeMesh);
    torsoGroup.add(leftArmGroup);

    const rightGatlingGroup = new THREE.Group();
    rightGatlingGroup.position.set(1.6, 0.2, 0.4);
    const barrelGeo = new THREE.CylinderGeometry(0.3, 0.3, 2.2, 8);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.9, roughness: 0.2 });
    const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
    barrelMesh.rotation.x = Math.PI / 2;
    barrelMesh.position.set(0, 0, 1.2);
    rightGatlingGroup.add(barrelMesh);
    torsoGroup.add(rightGatlingGroup);

    const shieldGeo = new THREE.SphereGeometry(3.2, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0 });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    torsoGroup.add(shieldMesh);

    playerGroup.add(torsoGroup);
    scene.add(playerGroup);

    sceneRefs.current.playerMech = playerGroup;
    sceneRefs.current.playerTorso = torsoGroup;
    sceneRefs.current.bladeMesh = bladeMesh;
    sceneRefs.current.shieldMesh = shieldMesh;

    // Mouse Aim Plane
    const planeRay = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseVec, camera);
      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(planeRay, intersect);

      if (intersect) {
        mousePosRef.current.worldX = intersect.x;
        mousePosRef.current.worldZ = intersect.z;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        mousePosRef.current.isDown = true;
        triggerFireGatling();
      } else if (e.button === 2) {
        e.preventDefault();
        triggerBladeCleave();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mousePosRef.current.isDown = false;
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('contextmenu', handleContextMenu);

    // Main 60 FPS Render & Simulation Loop
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const sc = sceneRefs.current;
      const sim = simState.current;

      if (sim.gameState === 'playing' && sc.playerMech && sc.playerTorso) {
        if (sim.fireCooldown > 0) sim.fireCooldown--;
        if (sim.bladeCooldown > 0) sim.bladeCooldown--;
        if (sim.dashTimer > 0) sim.dashTimer--;
        if (sim.shieldTimer > 0) sim.shieldTimer--;
        if (sim.spawnGracePeriod > 0) sim.spawnGracePeriod--;

        if (mousePosRef.current.isDown && sim.fireCooldown === 0) {
          triggerFireGatling();
        }

        if (sc.shieldMesh) {
          (sc.shieldMesh.material as THREE.MeshBasicMaterial).opacity = sim.shieldTimer > 0 ? 0.65 : 0;
          if (sim.shieldTimer > 0) sc.shieldMesh.rotation.y += 0.05;
        }

        const speed = sim.chassis.speed * 0.42;
        let moveX = 0;
        let moveZ = 0;
        if (keysRef.current['a'] || keysRef.current['arrowleft'] || keysRef.current['KeyA']) moveX -= 1;
        if (keysRef.current['d'] || keysRef.current['arrowright'] || keysRef.current['KeyD']) moveX += 1;
        if (keysRef.current['w'] || keysRef.current['arrowup'] || keysRef.current['KeyW']) moveZ -= 1;
        if (keysRef.current['s'] || keysRef.current['arrowdown'] || keysRef.current['KeyS']) moveZ += 1;

        if (moveX !== 0 || moveZ !== 0) {
          const len = Math.hypot(moveX, moveZ);
          sc.playerMech.position.x += (moveX / len) * speed;
          sc.playerMech.position.z += (moveZ / len) * speed;

          sc.walkCycle += 0.18;
          sc.playerMech.position.y = Math.abs(Math.sin(sc.walkCycle)) * 0.25;
        }

        const maxR = arenaSize / 2 - 2.5;
        const distFromCenter = Math.hypot(sc.playerMech.position.x, sc.playerMech.position.z);
        if (distFromCenter > maxR) {
          sc.playerMech.position.x = (sc.playerMech.position.x / distFromCenter) * maxR;
          sc.playerMech.position.z = (sc.playerMech.position.z / distFromCenter) * maxR;
        }

        const pPos = sc.playerMech.position;
        const aimAngle = Math.atan2(mousePosRef.current.worldX - pPos.x, mousePosRef.current.worldZ - pPos.z);
        sc.playerTorso.rotation.y = aimAngle;

        camera.position.x += (pPos.x - camera.position.x) * 0.08;
        camera.position.z += (pPos.z + 28 - camera.position.z) * 0.08;
        camera.lookAt(pPos.x, 0, pPos.z - 4);

        // Projectiles Physics & Collisions
        for (let i = sc.projectiles.length - 1; i >= 0; i--) {
          const p = sc.projectiles[i];
          p.x += p.vx * 0.035;
          p.y += p.vy * 0.035;
          p.z += p.vz * 0.035;
          p.mesh.position.set(p.x, p.y, p.z);
          p.life--;

          if (p.type === 'missile' && p.targetEnemy && p.targetEnemy.hp > 0) {
            const enPos = p.targetEnemy.mesh.position;
            const dirX = enPos.x - p.x;
            const dirZ = enPos.z - p.z;
            const dirY = enPos.y - p.y;
            p.vx += dirX * 0.12;
            p.vz += dirZ * 0.12;
            p.vy += dirY * 0.12;
            p.mesh.lookAt(enPos.x, enPos.y, enPos.z);
          }

          if (p.isPlayer) {
            for (let j = sc.enemies.length - 1; j >= 0; j--) {
              const en = sc.enemies[j];
              if (en.hp <= 0) continue;

              const eDist = Math.hypot(p.x - en.mesh.position.x, p.z - en.mesh.position.z);
              if (eDist < (en.type === 'boss' ? 3.8 : 1.8)) {
                en.hp -= p.damage;
                sound.playHit();
                spawnParticles3D(p.x, p.y, p.z, 0xff0055, 14);

                if (en.type === 'boss') {
                  setBossHp(Math.max(0, en.hp));
                }

                if (en.hp <= 0) {
                  sound.playExplosion();
                  spawnParticles3D(en.mesh.position.x, 2, en.mesh.position.z, 0xff0055, 35, 1.6);
                  sc.scene.remove(en.mesh);

                  const earnedScrap = en.type === 'boss' ? 120 : 15;
                  setScrap((s) => {
                    const nextS = s + earnedScrap;
                    localStorage.setItem('novaplay_mech_scrap', String(nextS));
                    return nextS;
                  });

                  sim.score += en.type === 'boss' ? 5000 : 350;
                  setScore(sim.score);
                  if (sim.score > highScore) {
                    setHighScore(sim.score);
                    localStorage.setItem('novaplay_mech_high', String(sim.score));
                  }

                  if (en.type === 'boss') {
                    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
                    sound.playWin();
                    sim.isWaveClearing = true;
                    setTimeout(() => {
                      startWave(sim.wave + 1);
                    }, 2500);
                  }
                }

                scene.remove(p.mesh);
                sc.projectiles.splice(i, 1);
                break;
              }
            }
          } else {
            // Hostile projectile hitting player
            const pDist = Math.hypot(p.x - pPos.x, p.z - pPos.z);
            if (pDist < 2.0 && sim.shieldTimer <= 0 && sim.spawnGracePeriod <= 0) {
              sound.playHit();
              sc.camShake = 16;
              spawnParticles3D(p.x, p.y, p.z, 0xff0055, 18);
              scene.remove(p.mesh);
              sc.projectiles.splice(i, 1);

              sim.hp = Math.max(0, sim.hp - p.damage);
              setHp(sim.hp);
              if (sim.hp <= 0) {
                sim.gameState = 'gameover';
                setGameState('gameover');
                sound.playGameOver();
              }
            }
          }

          if (p.life <= 0) {
            scene.remove(p.mesh);
            sc.projectiles.splice(i, 1);
          }
        }

        // Enemies AI & Combat Logic
        let activeEnemies = 0;
        sc.enemies.forEach((en) => {
          if (en.hp <= 0) return;
          activeEnemies++;

          const enPos = en.mesh.position;
          en.stateTimer++;

          if (en.type === 'drone') {
            const orbitAngle = en.stateTimer * 0.03;
            enPos.x += (Math.cos(orbitAngle) * 16 - enPos.x) * 0.04;
            enPos.z += (Math.sin(orbitAngle) * 16 - enPos.z) * 0.04;
            en.mesh.lookAt(pPos.x, pPos.y + 1.5, pPos.z);

            en.attackTimer++;
            if (en.attackTimer > 90) {
              en.attackTimer = 0;
              const geo = new THREE.SphereGeometry(0.3, 6, 6);
              const mat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
              const bulletMesh = new THREE.Mesh(geo, mat);
              bulletMesh.position.set(enPos.x, enPos.y, enPos.z);
              scene.add(bulletMesh);

              const dirX = pPos.x - enPos.x;
              const dirZ = pPos.z - enPos.z;
              const len = Math.hypot(dirX, dirZ);

              sc.projectiles.push({
                mesh: bulletMesh,
                x: enPos.x,
                y: enPos.y,
                z: enPos.z,
                vx: (dirX / len) * 22,
                vy: 0,
                vz: (dirZ / len) * 22,
                damage: 16,
                isPlayer: false,
                type: 'enemy_bullet',
                life: 60
              });
              sound.playLaser();
            }
          } else if (en.type === 'stalker') {
            const dirX = pPos.x - enPos.x;
            const dirZ = pPos.z - enPos.z;
            const len = Math.hypot(dirX, dirZ);

            if (len > 3.0) {
              enPos.x += (dirX / len) * en.speed * 0.035;
              enPos.z += (dirZ / len) * en.speed * 0.035;
              en.mesh.lookAt(pPos.x, 0, pPos.z);
            } else if (sim.shieldTimer <= 0 && sim.spawnGracePeriod <= 0) {
              sound.playHit();
              sc.camShake = 14;
              spawnParticles3D(pPos.x, 1.5, pPos.z, 0xff0055, 12);
              sim.hp = Math.max(0, sim.hp - 20);
              setHp(sim.hp);
              if (sim.hp <= 0) {
                sim.gameState = 'gameover';
                setGameState('gameover');
                sound.playGameOver();
              }
              enPos.x -= (dirX / len) * 8;
              enPos.z -= (dirZ / len) * 8;
            }
          } else if (en.type === 'boss') {
            en.attackTimer++;
            en.mesh.lookAt(pPos.x, 0, pPos.z);

            if (en.attackTimer > 75) {
              en.attackTimer = 0;
              [-0.3, 0, 0.3].forEach((offset) => {
                const angle = Math.atan2(pPos.x - enPos.x, pPos.z - enPos.z) + offset;
                const geo = new THREE.SphereGeometry(0.6, 8, 8);
                const mat = new THREE.MeshBasicMaterial({ color: 0x9333ea });
                const bossBullet = new THREE.Mesh(geo, mat);
                bossBullet.position.set(enPos.x, 3.5, enPos.z);
                scene.add(bossBullet);

                sc.projectiles.push({
                  mesh: bossBullet,
                  x: enPos.x,
                  y: 3.5,
                  z: enPos.z,
                  vx: Math.sin(angle) * 26,
                  vy: 0,
                  vz: Math.cos(angle) * 26,
                  damage: 28,
                  isPlayer: false,
                  type: 'boss_laser',
                  life: 70
                });
              });
              sound.playLaser();
            }
          }
        });

        // Wave Cleared Check (Only trigger when enemies existed and are now 0)
        if (sc.enemies.length > 0 && activeEnemies === 0 && !sc.bossMech && !sim.isWaveClearing) {
          sim.isWaveClearing = true;
          confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
          sound.playWin();
          setTimeout(() => {
            startWave(sim.wave + 1);
          }, 1500);
        }
      }

      // Particles Physics Update
      for (let i = sc.particles.length - 1; i >= 0; i--) {
        const pt = sc.particles[i];
        pt.mesh.position.x += pt.vx * 0.035;
        pt.mesh.position.y += pt.vy * 0.035;
        pt.mesh.position.z += pt.vz * 0.035;
        pt.vy -= 0.25;
        pt.life--;

        if (pt.life <= 0) {
          scene.remove(pt.mesh);
          sc.particles.splice(i, 1);
        }
      }

      if (sc.camShake > 0) sc.camShake *= 0.88;

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
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('contextmenu', handleContextMenu);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Purchase Hangar Mech or Weapon Upgrades
  const buyChassis = (idx: number) => {
    const ch = CHASSIS_LIST[idx];
    if (scrap >= ch.price && !unlockedChassis.includes(ch.id)) {
      const nextScrap = scrap - ch.price;
      const nextUnlocked = [...unlockedChassis, ch.id];
      setScrap(nextScrap);
      setUnlockedChassis(nextUnlocked);
      setSelectedChassisIdx(idx);
      localStorage.setItem('novaplay_mech_scrap', String(nextScrap));
      localStorage.setItem('novaplay_mech_unlocked', JSON.stringify(nextUnlocked));
      sound.playPowerup();
    }
  };

  const buyWeaponUpgrade = () => {
    const cost = weaponLvl * 60;
    if (scrap >= cost && weaponLvl < 5) {
      const nextScrap = scrap - cost;
      const nextLvl = weaponLvl + 1;
      setScrap(nextScrap);
      setWeaponLvl(nextLvl);
      localStorage.setItem('novaplay_mech_scrap', String(nextScrap));
      localStorage.setItem('novaplay_mech_weap_lvl', String(nextLvl));
      sound.playPowerup();
    }
  };

  const buyArmorUpgrade = () => {
    const cost = armorLvl * 60;
    if (scrap >= cost && armorLvl < 5) {
      const nextScrap = scrap - cost;
      const nextLvl = armorLvl + 1;
      setScrap(nextScrap);
      setArmorLvl(nextLvl);
      localStorage.setItem('novaplay_mech_scrap', String(nextScrap));
      localStorage.setItem('novaplay_mech_armor_lvl', String(nextLvl));
      sound.playPowerup();
    }
  };

  const buyMissileUpgrade = () => {
    const cost = missileLvl * 60;
    if (scrap >= cost && missileLvl < 5) {
      const nextScrap = scrap - cost;
      const nextLvl = missileLvl + 1;
      setScrap(nextScrap);
      setMissileLvl(nextLvl);
      localStorage.setItem('novaplay_mech_scrap', String(nextScrap));
      localStorage.setItem('novaplay_mech_missile_lvl', String(nextLvl));
      sound.playPowerup();
    }
  };

  return (
    <div className="relative w-full h-[650px] md:h-[750px] bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)] select-none flex flex-col items-center justify-center font-sans">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* TOP HEADS-UP DISPLAY (HUD) */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-cyan-400 font-black">HULL INTEGRITY</span>
              <span className="text-sm font-bold text-slate-200">
                {hp} / {maxHp}
              </span>
            </div>
            <div className="w-40 md:w-56 bg-slate-900/90 border border-cyan-500/40 rounded-full h-4 overflow-hidden p-0.5 backdrop-blur-md shadow-lg">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-100"
                style={{ width: `${(hp / maxHp) * 100}%` }}
              />
            </div>

            {bossHp !== null && bossMaxHp !== null && (
              <div className="mt-2 flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest text-purple-400 font-black">
                  ⚠️ GOLIATH TITAN BOSS: {bossHp} / {bossMaxHp}
                </span>
                <div className="w-48 md:w-72 bg-slate-900/90 border border-purple-500/50 rounded-full h-3 overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-rose-500 rounded-full transition-all duration-75"
                    style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-900/85 border border-amber-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-md">
              <Flame className="w-4 h-4 text-amber-400 fill-current" />
              <span className="font-bold text-xs md:text-sm text-amber-300">x{missiles}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900/85 border border-cyan-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-md">
              <Coins className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-xs md:text-sm text-cyan-300">{scrap}</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/85 border border-purple-500/40 px-3.5 py-1.5 rounded-xl backdrop-blur-md shadow-md">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="font-black text-sm md:text-base text-amber-300">{score.toLocaleString()} PTS</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-900/85 border border-pink-500/40 text-pink-300 font-black text-xs">
              WAVE {wave}
            </div>

            <button
              onClick={handleToggleSound}
              className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 pointer-events-auto cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <button
              onClick={() => {
                simState.current.gameState = 'paused';
                setGameState('paused');
              }}
              className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 pointer-events-auto cursor-pointer"
            >
              <Pause className="w-4 h-4 text-pink-400" />
            </button>
          </div>
        </div>
      )}

      {/* MOBILE TOUCH ACTION BUTTONS */}
      {gameState === 'playing' && (
        <div className="absolute bottom-6 left-4 right-4 flex justify-between items-end z-20 md:hidden pointer-events-auto">
          <div className="grid grid-cols-3 gap-1.5 w-36">
            <div />
            <button
              onTouchStart={() => (keysRef.current['w'] = true)}
              onTouchEnd={() => (keysRef.current['w'] = false)}
              className="w-11 h-11 rounded-xl bg-cyan-700/80 active:bg-cyan-500 text-white font-black text-xs flex items-center justify-center border border-cyan-400"
            >
              ▲
            </button>
            <div />
            <button
              onTouchStart={() => (keysRef.current['a'] = true)}
              onTouchEnd={() => (keysRef.current['a'] = false)}
              className="w-11 h-11 rounded-xl bg-cyan-700/80 active:bg-cyan-500 text-white font-black text-xs flex items-center justify-center border border-cyan-400"
            >
              ◀
            </button>
            <button
              onTouchStart={() => (keysRef.current['s'] = true)}
              onTouchEnd={() => (keysRef.current['s'] = false)}
              className="w-11 h-11 rounded-xl bg-cyan-700/80 active:bg-cyan-500 text-white font-black text-xs flex items-center justify-center border border-cyan-400"
            >
              ▼
            </button>
            <button
              onTouchStart={() => (keysRef.current['d'] = true)}
              onTouchEnd={() => (keysRef.current['d'] = false)}
              className="w-11 h-11 rounded-xl bg-cyan-700/80 active:bg-cyan-500 text-white font-black text-xs flex items-center justify-center border border-cyan-400"
            >
              ▶
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerShield}
              className="w-12 h-12 rounded-full bg-cyan-600 border-2 border-cyan-300 text-white font-black text-xs flex flex-col items-center justify-center active:scale-95 shadow-md"
            >
              <Shield className="w-4 h-4" />
            </button>
            <button
              onClick={triggerMissiles}
              className="w-12 h-12 rounded-full bg-amber-600 border-2 border-amber-300 text-white font-black text-xs flex flex-col items-center justify-center active:scale-95 shadow-md"
            >
              <Flame className="w-4 h-4 fill-current" />
            </button>
            <button
              onClick={triggerBladeCleave}
              className="w-12 h-12 rounded-full bg-pink-600 border-2 border-pink-300 text-white font-black text-xs flex flex-col items-center justify-center active:scale-95 shadow-md"
            >
              <Swords className="w-4 h-4" />
            </button>
            <button
              onClick={triggerFireGatling}
              className="w-15 h-15 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 border-2 border-rose-300 text-white font-black text-sm flex flex-col items-center justify-center active:scale-95 shadow-[0_0_20px_rgba(244,63,94,0.6)]"
            >
              <Target className="w-6 h-6" />
              <span>FIRE</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN MENU OVERLAY */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-slate-950/88 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in overflow-y-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xs tracking-widest uppercase mb-3 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>3D Real-Time Cyberpunk Mech Brawler</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 tracking-wider mb-2 drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">
            CYBER MECH BRAWLER 3D
          </h1>
          <p className="text-cyan-300/80 max-w-lg text-sm md:text-base font-medium mb-6">
            Command customizable heavy battle mechs, unleash twin plasma gatling guns, cleave enemy swarms with energy blades, launch homing missile salvos, and demolish titan boss mechs!
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl w-full mb-8 text-xs">
            <div className="bg-slate-900/90 border border-cyan-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <Crosshair className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-slate-200">WASD + Mouse</span>
              <span className="text-slate-400">Move & 360° Aim</span>
            </div>
            <div className="bg-slate-900/90 border border-pink-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <Swords className="w-5 h-5 text-pink-400" />
              <span className="font-bold text-slate-200">Right Click / F</span>
              <span className="text-slate-400">Energy Blade Cleave</span>
            </div>
            <div className="bg-slate-900/90 border border-amber-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <Flame className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-slate-200">E / Missiles</span>
              <span className="text-slate-400">Cluster Homing Volley</span>
            </div>
            <div className="bg-slate-900/90 border border-emerald-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-slate-200">Q / Shield</span>
              <span className="text-slate-400">Invulnerable Barrier</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setGameState('hangar')}
              className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-bold text-sm tracking-wider uppercase flex items-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-105"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>MECH HANGAR</span>
            </button>

            <button
              onClick={startMission}
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-rose-500 via-purple-600 to-cyan-500 hover:from-rose-400 hover:to-cyan-400 text-white font-black text-lg tracking-wider uppercase shadow-[0_0_30px_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>DEPLOY MECH</span>
            </button>
          </div>

          {highScore > 0 && (
            <div className="flex items-center gap-2 mt-6 text-amber-400 text-sm font-bold">
              <Trophy className="w-4 h-4" />
              <span>ARENA HIGH SCORE: {highScore.toLocaleString()} PTS</span>
            </div>
          )}
        </div>
      )}

      {/* HANGAR GARAGE & UPGRADES OVERLAY */}
      {gameState === 'hangar' && (
        <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-lg flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in overflow-y-auto">
          <div className="flex items-center justify-between w-full max-w-3xl mb-3">
            <h2 className="text-2xl md:text-3xl font-black text-cyan-400 tracking-wider">MECH ARSENAL HANGAR</h2>
            <div className="flex items-center gap-1.5 bg-cyan-500/20 border border-cyan-500/40 px-3.5 py-1.5 rounded-xl">
              <Coins className="w-5 h-5 text-cyan-400" />
              <span className="font-black text-base text-cyan-300">{scrap} SCRAP</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl w-full mb-5">
            {CHASSIS_LIST.map((ch, idx) => {
              const isUnlocked = unlockedChassis.includes(ch.id);
              const isSelected = selectedChassisIdx === idx;

              return (
                <div
                  key={ch.id}
                  onClick={() => {
                    if (isUnlocked) setSelectedChassisIdx(idx);
                  }}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900/95 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-black text-white text-base">{ch.name}</span>
                      <span className="text-xs font-bold text-cyan-400 uppercase">{ch.role}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{ch.description}</p>
                    <div className="space-y-1 text-xs text-slate-300 font-semibold mb-3">
                      <div>Armor: {ch.maxHp} HP</div>
                      <div>Speed: {(ch.speed * 100).toFixed(0)}%</div>
                      <div>Missiles: {ch.missilesPerVolley} / Salvo</div>
                    </div>
                  </div>

                  {!isUnlocked ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        buyChassis(idx);
                      }}
                      disabled={scrap < ch.price}
                      className={`w-full py-2 rounded-xl font-bold text-xs cursor-pointer ${
                        scrap >= ch.price ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      UNLOCK ({ch.price} Scrap)
                    </button>
                  ) : (
                    <button className="w-full py-2 rounded-xl bg-slate-800 text-cyan-400 font-bold text-xs pointer-events-none">
                      {isSelected ? 'EQUIPPED' : 'SELECT'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-3xl w-full mb-6">
            <div className="bg-slate-900/90 border border-pink-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <span className="font-bold text-xs text-white">GATLING OVERCLOCK</span>
              <span className="text-xs text-slate-400">LVL {weaponLvl} / 5</span>
              <button
                onClick={buyWeaponUpgrade}
                disabled={weaponLvl >= 5 || scrap < weaponLvl * 60}
                className={`w-full mt-1 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                  weaponLvl >= 5 ? 'bg-slate-800 text-slate-500' : scrap >= weaponLvl * 60 ? 'bg-pink-600 hover:bg-pink-500 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {weaponLvl >= 5 ? 'MAX' : `UPGRADE (${weaponLvl * 60})`}
              </button>
            </div>

            <div className="bg-slate-900/90 border border-cyan-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <span className="font-bold text-xs text-white">NANO PLATING</span>
              <span className="text-xs text-slate-400">LVL {armorLvl} / 5</span>
              <button
                onClick={buyArmorUpgrade}
                disabled={armorLvl >= 5 || scrap < armorLvl * 60}
                className={`w-full mt-1 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                  armorLvl >= 5 ? 'bg-slate-800 text-slate-500' : scrap >= armorLvl * 60 ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {armorLvl >= 5 ? 'MAX' : `UPGRADE (${armorLvl * 60})`}
              </button>
            </div>

            <div className="bg-slate-900/90 border border-amber-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <span className="font-bold text-xs text-white">MISSILE PODS</span>
              <span className="text-xs text-slate-400">LVL {missileLvl} / 5</span>
              <button
                onClick={buyMissileUpgrade}
                disabled={missileLvl >= 5 || scrap < missileLvl * 60}
                className={`w-full mt-1 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                  missileLvl >= 5 ? 'bg-slate-800 text-slate-500' : scrap >= missileLvl * 60 ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {missileLvl >= 5 ? 'MAX' : `UPGRADE (${missileLvl * 60})`}
              </button>
            </div>
          </div>

          <button
            onClick={() => setGameState('menu')}
            className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm tracking-wider cursor-pointer"
          >
            BACK TO DEPLOYMENT MENU
          </button>
        </div>
      )}

      {/* PAUSED OVERLAY */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-black text-cyan-400 tracking-wider mb-2">MISSION PAUSED</h2>
          <p className="text-slate-400 text-sm mb-6">Combat systems idling.</p>

          <div className="flex flex-col gap-3 w-64 mb-6">
            <button
              onClick={() => {
                simState.current.gameState = 'playing';
                setGameState('playing');
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-sm tracking-wider uppercase shadow-lg cursor-pointer"
            >
              RESUME COMBAT
            </button>
            <button
              onClick={() => setGameState('hangar')}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-bold text-sm tracking-wider uppercase cursor-pointer"
            >
              HANGAR ARSENAL
            </button>
            <button
              onClick={startMission}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/40 text-rose-400 font-bold text-sm tracking-wider uppercase cursor-pointer"
            >
              RESTART DEPLOYMENT
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-500 mb-4 shadow-[0_0_25px_rgba(244,63,94,0.6)]">
            <Flame className="w-8 h-8" />
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-rose-500 tracking-wider mb-2">MECH DESTROYED</h2>
          <p className="text-slate-400 text-sm mb-6">Hull integrity failed in the Colosseum.</p>

          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 max-w-sm w-full mb-6 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Final Score:</span>
              <span className="text-xl font-black text-cyan-400">{score.toLocaleString()} PTS</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Wave Reached:</span>
              <span className="font-bold text-pink-400">WAVE {wave}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Scrap Salvaged:</span>
              <span className="font-bold text-cyan-400">{scrap} SCRAP</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setGameState('hangar')}
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-bold text-sm tracking-wider uppercase cursor-pointer"
            >
              <span>MECH HANGAR</span>
            </button>

            <button
              onClick={startMission}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-black text-base tracking-wider uppercase shadow-[0_0_25px_rgba(0,240,255,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>REDEPLOY MECH</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CyberMechBrawler3D;
