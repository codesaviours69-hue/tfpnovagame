import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Play,
  ChevronRight, Crosshair, Award, Flame, Star, ShoppingBag,
  Radio, AlertTriangle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  HelpCircle, Compass, Lock, CheckCircle2, Skull, Target, Wrench, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// TYPES & DATA STRUCTURES
// ----------------------------------------------------

export interface HeroClass {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  color: string;
  glowColor: string;
  maxHp: number;
  speed: number;
  damageMod: number;
  critRate: number;
  starterWeapon: string;
  specialSkill: string;
  description: string;
}

export interface Weapon {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  damage: number;
  fireRate: number; // Shots per second
  bulletSpeed: number;
  spread: number;
  pellets: number;
  color: string;
  glowColor: string;
  type: 'pistol' | 'shotgun' | 'rifle' | 'tesla' | 'rocket' | 'minigun' | 'cryo' | 'laser';
  description: string;
}

export interface ZombieMission {
  id: number;
  title: string;
  desc: string;
  targetType: 'survive_waves' | 'kill_count' | 'kill_bosses' | 'collect_biocores' | 'score';
  targetValue: number;
  rewardCredits: number;
  completed: boolean;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: string;
  glowColor: string;
  isRocket?: boolean;
  isTesla?: boolean;
  isCryo?: boolean;
  rangeRemaining: number;
}

interface Zombie {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  hp: number;
  maxHp: number;
  type: 'crawler' | 'runner' | 'spitter' | 'armored' | 'goliath_boss';
  color: string;
  glowColor: string;
  radius: number;
  damage: number;
  scoreValue: number;
  attackCooldown: number;
  isFrozen: boolean;
  freezeTimer: number;
}

interface SentryTurret {
  id: number;
  x: number;
  y: number;
  angle: number;
  hp: number;
  fireTimer: number;
  durationTimer: number;
}

interface Barricade {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
}

interface LootDrop {
  id: number;
  x: number;
  y: number;
  type: 'credit' | 'medkit' | 'ammo' | 'turret' | 'nuke' | 'quad_damage' | 'shield';
  value: number;
  pulseTimer: number;
  collected: boolean;
}

interface BloodSplat {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  shape?: 'circle' | 'spark' | 'smoke' | 'shockwave';
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
}

// ----------------------------------------------------
// DEFAULT CATALOG DATA
// ----------------------------------------------------

const HERO_CLASSES: HeroClass[] = [
  {
    id: 'cyber-commando',
    name: 'Cyber Commando',
    price: 0,
    unlocked: true,
    color: '#0284c7',
    glowColor: '#38bdf8',
    maxHp: 120,
    speed: 180,
    damageMod: 1.0,
    critRate: 0.1,
    starterWeapon: 'dual-pistols',
    specialSkill: 'Combat Tactical Roll',
    description: 'Balanced frontline operative with enhanced armor plating.',
  },
  {
    id: 'neon-gunslinger',
    name: 'Neon Gunslinger',
    price: 350,
    unlocked: false,
    color: '#a855f7',
    glowColor: '#ec4899',
    maxHp: 100,
    speed: 210,
    damageMod: 1.25,
    critRate: 0.25,
    starterWeapon: 'dual-pistols',
    specialSkill: 'High-Crit Fan Fire',
    description: 'Fast-draw bounty hunter with deadly critical hit precision.',
  },
  {
    id: 'heavy-juggernaut',
    name: 'Heavy Juggernaut',
    price: 750,
    unlocked: false,
    color: '#f97316',
    glowColor: '#facc15',
    maxHp: 220,
    speed: 150,
    damageMod: 1.2,
    critRate: 0.08,
    starterWeapon: 'cyber-shotgun',
    specialSkill: 'Titan Kinetic Shield',
    description: 'Armored heavy demolisher wielding devastating close-range shotguns.',
  },
  {
    id: 'tesla-engineer',
    name: 'Tesla Engineer',
    price: 1400,
    unlocked: false,
    color: '#06b6d4',
    glowColor: '#67e8f9',
    maxHp: 130,
    speed: 175,
    damageMod: 1.1,
    critRate: 0.15,
    starterWeapon: 'tesla-gun',
    specialSkill: 'Twin Sentry Turrets',
    description: 'Tech specialist capable of constructing automated defense turrets.',
  },
  {
    id: 'shadow-assassin',
    name: 'Shadow Assassin',
    price: 2400,
    unlocked: false,
    color: '#e11d48',
    glowColor: '#fb7185',
    maxHp: 110,
    speed: 230,
    damageMod: 1.4,
    critRate: 0.35,
    starterWeapon: 'neon-rifle',
    specialSkill: 'Supersonic Phase Dash',
    description: 'High-agility operative moving at blur speeds through zombie swarms.',
  },
  {
    id: 'quantum-cyborg',
    name: 'Quantum Cyborg',
    price: 4000,
    unlocked: false,
    color: '#facc15',
    glowColor: '#fef08a',
    maxHp: 180,
    speed: 200,
    damageMod: 1.5,
    critRate: 0.2,
    starterWeapon: 'plasma-rocket',
    specialSkill: 'Orbital EMP Nuke',
    description: 'Apex nanotech war machine equipped with heavy ordinance.',
  },
];

const WEAPONS_CATALOG: Weapon[] = [
  {
    id: 'dual-pistols',
    name: 'Dual Plasma Pistols',
    price: 0,
    unlocked: true,
    damage: 28,
    fireRate: 5.0,
    bulletSpeed: 520,
    spread: 0.06,
    pellets: 1,
    color: '#00f0ff',
    glowColor: '#38bdf8',
    type: 'pistol',
    description: 'Reliable rapid-fire sidearms with zero recoil.',
  },
  {
    id: 'cyber-shotgun',
    name: 'Cyber Shotgun 12G',
    price: 300,
    unlocked: false,
    damage: 22,
    fireRate: 1.8,
    bulletSpeed: 480,
    spread: 0.28,
    pellets: 7,
    color: '#f97316',
    glowColor: '#ef4444',
    type: 'shotgun',
    description: 'Fires 7 high-impact pellets to obliterate clustered hordes.',
  },
  {
    id: 'neon-rifle',
    name: 'Neon Assault Rifle',
    price: 600,
    unlocked: false,
    damage: 34,
    fireRate: 8.5,
    bulletSpeed: 600,
    spread: 0.08,
    pellets: 1,
    color: '#a855f7',
    glowColor: '#c084fc',
    type: 'rifle',
    description: 'High-velocity full-auto rifle designed for medium range crowd control.',
  },
  {
    id: 'tesla-gun',
    name: 'Tesla Lightning Arc',
    price: 1100,
    unlocked: false,
    damage: 48,
    fireRate: 3.5,
    bulletSpeed: 450,
    spread: 0.12,
    pellets: 1,
    color: '#06b6d4',
    glowColor: '#67e8f9',
    type: 'tesla',
    description: 'Discharges electric lightning arcs that chain between multiple mutants.',
  },
  {
    id: 'cryo-blaster',
    name: 'Cryo Freeze Blaster',
    price: 1800,
    unlocked: false,
    damage: 32,
    fireRate: 6.0,
    bulletSpeed: 460,
    spread: 0.18,
    pellets: 3,
    color: '#38bdf8',
    glowColor: '#bae6fd',
    type: 'cryo',
    description: 'Freezes incoming zombies solid, halting their movement.',
  },
  {
    id: 'rotary-minigun',
    name: 'Rotary Vulcan Minigun',
    price: 2800,
    unlocked: false,
    damage: 26,
    fireRate: 16.0,
    bulletSpeed: 650,
    spread: 0.14,
    pellets: 1,
    color: '#facc15',
    glowColor: '#fef08a',
    type: 'minigun',
    description: 'Extreme 1000 RPM fire rate bullet storm shredder.',
  },
  {
    id: 'plasma-rocket',
    name: 'Plasma Rocket Launcher',
    price: 4200,
    unlocked: false,
    damage: 160,
    fireRate: 1.2,
    bulletSpeed: 380,
    spread: 0.02,
    pellets: 1,
    color: '#ef4444',
    glowColor: '#f87171',
    type: 'rocket',
    description: 'Fires heavy explosive warheads with massive area-of-effect blast.',
  },
];

const ZOMBIE_MISSIONS: ZombieMission[] = [
  { id: 1, title: 'Containment Breach', desc: 'Survive the initial biohazard wave for 45 seconds', targetType: 'survive_waves', targetValue: 45, rewardCredits: 150, completed: false },
  { id: 2, title: 'Purge Order', desc: 'Eliminate 50 cyber mutants in the infected sector', targetType: 'kill_count', targetValue: 50, rewardCredits: 250, completed: false },
  { id: 3, title: 'Bio-Sample Recovery', desc: 'Collect 80 glowing Cyber Cores from fallen enemies', targetType: 'collect_biocores', targetValue: 80, rewardCredits: 350, completed: false },
  { id: 4, title: 'Goliath Slayer', desc: 'Defeat 2 Giant Goliath Boss Mutants', targetType: 'kill_bosses', targetValue: 2, rewardCredits: 500, completed: false },
  { id: 5, title: 'Score Rampage', desc: 'Achieve 20,000 survivor score in a single run', targetType: 'score', targetValue: 20000, rewardCredits: 650, completed: false },
  { id: 6, title: 'Omega Quarantine', desc: 'Survive for 3 minutes and wipe out 150 mutants', targetType: 'survive_waves', targetValue: 180, rewardCredits: 1000, completed: false },
];

// ----------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------

export const CyberZombieOutbreak3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI Screen State
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'armory' | 'heroes' | 'missions' | 'instructions'>('menu');
  const [gameMode, setGameMode] = useState<'endless' | 'mission'>('endless');
  const [selectedMissionId, setSelectedMissionId] = useState<number>(1);

  // Persistence State
  const [credits, setCredits] = useState<number>(() => {
    const s = localStorage.getItem('cyber_zombie_credits');
    return s ? parseInt(s, 10) : 120;
  });

  const [highScore, setHighScore] = useState<number>(() => {
    const s = localStorage.getItem('cyber_zombie_highscore');
    return s ? parseInt(s, 10) : 0;
  });

  const [unlockedHeroIds, setUnlockedHeroIds] = useState<string[]>(() => {
    const s = localStorage.getItem('cyber_zombie_unlocked_heroes');
    return s ? JSON.parse(s) : ['cyber-commando'];
  });

  const [activeHeroId, setActiveHeroId] = useState<string>(() => {
    return localStorage.getItem('cyber_zombie_active_hero') || 'cyber-commando';
  });

  const [unlockedWeaponIds, setUnlockedWeaponIds] = useState<string[]>(() => {
    const s = localStorage.getItem('cyber_zombie_unlocked_weapons');
    return s ? JSON.parse(s) : ['dual-pistols'];
  });

  const [activeWeaponId, setActiveWeaponId] = useState<string>(() => {
    return localStorage.getItem('cyber_zombie_active_weapon') || 'dual-pistols';
  });

  const [completedMissionIds, setCompletedMissionIds] = useState<number[]>(() => {
    const s = localStorage.getItem('cyber_zombie_completed_missions');
    return s ? JSON.parse(s) : [];
  });

  // Dynamic In-Game HUD States
  const [hudHp, setHudHp] = useState(120);
  const [hudMaxHp, setHudMaxHp] = useState(120);
  const [hudScore, setHudScore] = useState(0);
  const [hudWave, setHudWave] = useState(1);
  const [hudKills, setHudKills] = useState(0);
  const [hudMultiplier, setHudMultiplier] = useState(1);
  const [hudTurretsCount, setHudTurretsCount] = useState(1);
  const [hudQuadActive, setHudQuadActive] = useState(false);
  const [hudShieldActive, setHudShieldActive] = useState(false);
  const [muted, setMuted] = useState(sound.isMuted());

  // Input states
  const keysRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    shoot: false,
    roll: false,
    deployTurret: false,
    mouseX: 0,
    mouseY: 0,
    isMouseDown: false,
  });

  // 60 FPS Physics Simulation Engine Refs
  const engineRef = useRef({
    // Player
    player: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      hp: 120,
      maxHp: 120,
      speed: 180,
      isRolling: false,
      rollTimer: 0,
      rollVx: 0,
      rollVy: 0,
      isShieldActive: false,
      shieldTimer: 0,
      isQuadActive: false,
      quadTimer: 0,
      turretStock: 1,
      fireCooldown: 0,
    },
    // Entities
    bullets: [] as Bullet[],
    zombies: [] as Zombie[],
    turrets: [] as SentryTurret[],
    barricades: [] as Barricade[],
    loot: [] as LootDrop[],
    splats: [] as BloodSplat[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    // Wave & Progression State
    waveNumber: 1,
    waveTimer: 25.0,
    spawnZombieTimer: 1.0,
    score: 0,
    multiplier: 1,
    multiplierTimer: 0,
    totalKills: 0,
    bossesKilled: 0,
    bioCoresCollected: 0,
    survivalTimer: 0,
    screenShake: 0,
    cameraX: 0,
    cameraY: 0,
    nextEntityId: 1,
    lastTime: performance.now(),
    isRunning: false,
  });

  const activeHero = HERO_CLASSES.find((h) => h.id === activeHeroId) || HERO_CLASSES[0];
  const activeWeapon = WEAPONS_CATALOG.find((w) => w.id === activeWeaponId) || WEAPONS_CATALOG[0];

  // ----------------------------------------------------
  // SOUND HELPERS
  // ----------------------------------------------------
  const toggleMute = () => {
    const m = sound.toggleMute();
    setMuted(m);
  };

  const playShootSound = useCallback((wType: string) => {
    if (sound.isMuted()) return;
    if (wType === 'laser' || wType === 'tesla') sound.playLaser();
    else if (wType === 'rocket') sound.playJump();
    else sound.playLaser();
  }, []);

  // ----------------------------------------------------
  // START & RESET GAME SESSION
  // ----------------------------------------------------
  const startGame = useCallback((mode: 'endless' | 'mission' = 'endless', missionId = 1) => {
    setGameMode(mode);
    setSelectedMissionId(missionId);

    const eng = engineRef.current;
    const hero = HERO_CLASSES.find((h) => h.id === activeHeroId) || HERO_CLASSES[0];

    // Reset Player
    eng.player.x = 0;
    eng.player.y = 0;
    eng.player.vx = 0;
    eng.player.vy = 0;
    eng.player.angle = 0;
    eng.player.hp = hero.maxHp;
    eng.player.maxHp = hero.maxHp;
    eng.player.speed = hero.speed;
    eng.player.isRolling = false;
    eng.player.rollTimer = 0;
    eng.player.isShieldActive = false;
    eng.player.shieldTimer = 0;
    eng.player.isQuadActive = false;
    eng.player.quadTimer = 0;
    eng.player.turretStock = hero.id === 'tesla-engineer' ? 2 : 1;
    eng.player.fireCooldown = 0;

    // Reset World State
    eng.bullets = [];
    eng.zombies = [];
    eng.turrets = [];
    eng.barricades = [];
    eng.loot = [];
    eng.splats = [];
    eng.particles = [];
    eng.floatingTexts = [];
    eng.waveNumber = 1;
    eng.waveTimer = 25.0;
    eng.spawnZombieTimer = 0.5;
    eng.score = 0;
    eng.multiplier = 1;
    eng.multiplierTimer = 0;
    eng.totalKills = 0;
    eng.bossesKilled = 0;
    eng.bioCoresCollected = 0;
    eng.survivalTimer = 0;
    eng.screenShake = 0;

    // Spawn 4 Defense Barricades
    eng.barricades.push({ id: eng.nextEntityId++, x: -140, y: -90, width: 70, height: 24, hp: 120, maxHp: 120 });
    eng.barricades.push({ id: eng.nextEntityId++, x: 140, y: -90, width: 70, height: 24, hp: 120, maxHp: 120 });
    eng.barricades.push({ id: eng.nextEntityId++, x: -140, y: 90, width: 70, height: 24, hp: 120, maxHp: 120 });
    eng.barricades.push({ id: eng.nextEntityId++, x: 140, y: 90, width: 70, height: 24, hp: 120, maxHp: 120 });

    eng.lastTime = performance.now();
    eng.isRunning = true;

    setGameState('playing');
    sound.playClick();
  }, [activeHeroId]);

  // ----------------------------------------------------
  // DEPLOY SENTRY TURRET
  // ----------------------------------------------------
  const deployTurret = useCallback(() => {
    const eng = engineRef.current;
    if (eng.player.turretStock <= 0 || eng.player.hp <= 0) return;

    eng.player.turretStock -= 1;
    eng.turrets.push({
      id: eng.nextEntityId++,
      x: eng.player.x,
      y: eng.player.y,
      angle: eng.player.angle,
      hp: 150,
      fireTimer: 0,
      durationTimer: 20.0,
    });

    eng.floatingTexts.push({
      id: eng.nextEntityId++,
      text: '🤖 SENTRY TURRET ONLINE!',
      x: eng.player.x,
      y: eng.player.y - 30,
      color: '#00f0ff',
      alpha: 1,
      scale: 1.3,
    });

    sound.playPowerup();
  }, []);

  // ----------------------------------------------------
  // COMBAT TACTICAL ROLL
  // ----------------------------------------------------
  const triggerRoll = useCallback(() => {
    const eng = engineRef.current;
    const p = eng.player;
    if (p.isRolling || p.hp <= 0) return;

    p.isRolling = true;
    p.rollTimer = 0.35;
    const moveAng = Math.hypot(p.vx, p.vy) > 10 ? Math.atan2(p.vy, p.vx) : p.angle;
    p.rollVx = Math.cos(moveAng) * (p.speed * 2.4);
    p.rollVy = Math.sin(moveAng) * (p.speed * 2.4);
    sound.playJump();
  }, []);

  // ----------------------------------------------------
  // UNLOCK / PURCHASE ITEMS
  // ----------------------------------------------------
  const buyHero = (hero: HeroClass) => {
    if (credits >= hero.price && !unlockedHeroIds.includes(hero.id)) {
      const nextCr = credits - hero.price;
      const nextHeroes = [...unlockedHeroIds, hero.id];
      setCredits(nextCr);
      setUnlockedHeroIds(nextHeroes);
      setActiveHeroId(hero.id);

      localStorage.setItem('cyber_zombie_credits', nextCr.toString());
      localStorage.setItem('cyber_zombie_unlocked_heroes', JSON.stringify(nextHeroes));
      localStorage.setItem('cyber_zombie_active_hero', hero.id);

      sound.playWin();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    }
  };

  const buyWeapon = (w: Weapon) => {
    if (credits >= w.price && !unlockedWeaponIds.includes(w.id)) {
      const nextCr = credits - w.price;
      const nextWeapons = [...unlockedWeaponIds, w.id];
      setCredits(nextCr);
      setUnlockedWeaponIds(nextWeapons);
      setActiveWeaponId(w.id);

      localStorage.setItem('cyber_zombie_credits', nextCr.toString());
      localStorage.setItem('cyber_zombie_unlocked_weapons', JSON.stringify(nextWeapons));
      localStorage.setItem('cyber_zombie_active_weapon', w.id);

      sound.playWin();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }
  };

  // ----------------------------------------------------
  // 60 FPS CANVAS SIMULATION & RENDERING LOOP
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    const tick = (now: number) => {
      const eng = engineRef.current;
      const dt = Math.min((now - eng.lastTime) / 1000, 0.06);
      eng.lastTime = now;

      // Handle Resize
      const container = canvas.parentElement;
      if (container) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
      }

      if (eng.isRunning && gameState === 'playing') {
        const keys = keysRef.current;
        const hero = HERO_CLASSES.find((h) => h.id === activeHeroId) || HERO_CLASSES[0];
        const weapon = WEAPONS_CATALOG.find((w) => w.id === activeWeaponId) || WEAPONS_CATALOG[0];
        const p = eng.player;

        // 1. TIMERS & SCORE UPDATES
        eng.survivalTimer += dt;
        eng.waveTimer -= dt;
        if (eng.waveTimer <= 0) {
          eng.waveNumber += 1;
          eng.waveTimer = 30.0;
          eng.floatingTexts.push({
            id: eng.nextEntityId++,
            text: `⚠️ BIOHAZARD WAVE ${eng.waveNumber}!`,
            x: p.x,
            y: p.y - 60,
            color: '#22c55e',
            alpha: 1,
            scale: 1.6,
          });
          sound.playPowerup();
        }

        // Multiplier Decay
        if (eng.multiplier > 1) {
          eng.multiplierTimer += dt;
          if (eng.multiplierTimer > 4.0) {
            eng.multiplier = Math.max(1, eng.multiplier - 1);
            eng.multiplierTimer = 0;
          }
        }

        // Powerup Timers
        if (p.isShieldActive) {
          p.shieldTimer -= dt;
          if (p.shieldTimer <= 0) p.isShieldActive = false;
        }
        if (p.isQuadActive) {
          p.quadTimer -= dt;
          if (p.quadTimer <= 0) p.isQuadActive = false;
        }

        // 2. PLAYER MOVEMENT & COMBAT ROLL
        if (p.isRolling) {
          p.rollTimer -= dt;
          p.x += p.rollVx * dt;
          p.y += p.rollVy * dt;
          if (p.rollTimer <= 0) p.isRolling = false;
        } else {
          // Normal WASD movement
          let moveX = 0;
          let moveY = 0;
          if (keys.up) moveY -= 1;
          if (keys.down) moveY += 1;
          if (keys.left) moveX -= 1;
          if (keys.right) moveX += 1;

          const moveMag = Math.hypot(moveX, moveY);
          if (moveMag > 0) {
            p.vx = (moveX / moveMag) * p.speed;
            p.vy = (moveY / moveMag) * p.speed;
          } else {
            p.vx *= 0.8;
            p.vy *= 0.8;
          }

          p.x += p.vx * dt;
          p.y += p.vy * dt;

          // Aim toward Mouse / Crosshair
          const screenCenterX = canvas.width / 2;
          const screenCenterY = canvas.height / 2;
          p.angle = Math.atan2(keys.mouseY - screenCenterY, keys.mouseX - screenCenterX);
        }

        // Camera follow player
        eng.cameraX = p.x;
        eng.cameraY = p.y;

        // 3. WEAPON FIRING & BULLET GENERATION
        p.fireCooldown -= dt;
        const isShooting = (keys.shoot || keys.isMouseDown) && !p.isRolling;

        if (isShooting && p.fireCooldown <= 0) {
          p.fireCooldown = 1.0 / weapon.fireRate;
          playShootSound(weapon.type);
          eng.screenShake = weapon.type === 'rocket' ? 10 : (weapon.type === 'shotgun' ? 6 : 2);

          const dmgMultiplier = (p.isQuadActive ? 4.0 : 1.0) * hero.damageMod;
          const isCrit = Math.random() < hero.critRate;
          const finalDamage = Math.round(weapon.damage * dmgMultiplier * (isCrit ? 2.2 : 1.0));

          for (let i = 0; i < weapon.pellets; i++) {
            const spreadAng = (Math.random() - 0.5) * weapon.spread;
            const bAng = p.angle + spreadAng;
            eng.bullets.push({
              id: eng.nextEntityId++,
              x: p.x + Math.cos(p.angle) * 22,
              y: p.y + Math.sin(p.angle) * 22,
              vx: Math.cos(bAng) * weapon.bulletSpeed,
              vy: Math.sin(bAng) * weapon.bulletSpeed,
              damage: finalDamage,
              color: weapon.color,
              glowColor: weapon.glowColor,
              isRocket: weapon.type === 'rocket',
              isTesla: weapon.type === 'tesla',
              isCryo: weapon.type === 'cryo',
              rangeRemaining: 650,
            });
          }

          // Muzzle flash particle
          eng.particles.push({
            x: p.x + Math.cos(p.angle) * 26,
            y: p.y + Math.sin(p.angle) * 26,
            vx: Math.cos(p.angle) * 40,
            vy: Math.sin(p.angle) * 40,
            size: 6,
            color: '#facc15',
            alpha: 1,
            decay: 6.0,
            shape: 'spark',
          });
        }

        // 4. SENTRY TURRETS AUTOMATED AI FIRING
        eng.turrets.forEach((turret) => {
          turret.durationTimer -= dt;
          turret.fireTimer -= dt;

          // Find closest zombie
          let closestZ: Zombie | null = null;
          let minDist = 400;
          eng.zombies.forEach((z) => {
            const dist = Math.hypot(z.x - turret.x, z.y - turret.y);
            if (dist < minDist) {
              minDist = dist;
              closestZ = z;
            }
          });

          if (closestZ) {
            turret.angle = Math.atan2(closestZ.y - turret.y, closestZ.x - turret.x);
            if (turret.fireTimer <= 0) {
              turret.fireTimer = 0.12; // High rate of fire
              eng.bullets.push({
                id: eng.nextEntityId++,
                x: turret.x + Math.cos(turret.angle) * 16,
                y: turret.y + Math.sin(turret.angle) * 16,
                vx: Math.cos(turret.angle) * 550,
                vy: Math.sin(turret.angle) * 550,
                damage: 22,
                color: '#00f0ff',
                glowColor: '#38bdf8',
                rangeRemaining: 450,
              });
            }
          }
        });
        eng.turrets = eng.turrets.filter((t) => t.durationTimer > 0);

        // 5. BULLETS MOVEMENT & COLLISION RESOLUTION
        eng.bullets.forEach((b) => {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.rangeRemaining -= Math.hypot(b.vx, b.vy) * dt;

          // Bullet vs Zombie Collision
          eng.zombies.forEach((z) => {
            if (b.rangeRemaining <= 0 || z.hp <= 0) return;
            const dist = Math.hypot(z.x - b.x, z.y - b.y);

            if (dist < z.radius + 6) {
              b.rangeRemaining = 0; // Consume bullet
              z.hp -= b.damage;

              // Cryo freeze effect
              if (b.isCryo) {
                z.isFrozen = true;
                z.freezeTimer = 3.5;
              }

              // Spark / Blood particles
              for (let s = 0; s < 4; s++) {
                eng.particles.push({
                  x: z.x,
                  y: z.y,
                  vx: (Math.random() - 0.5) * 140,
                  vy: (Math.random() - 0.5) * 140,
                  size: 3,
                  color: z.glowColor,
                  alpha: 1,
                  decay: 3.0,
                  shape: 'spark',
                });
              }

              // Rocket AOE blast
              if (b.isRocket) {
                sound.playExplosion();
                eng.screenShake = 14;
                eng.zombies.forEach((nearZ) => {
                  const nearDist = Math.hypot(nearZ.x - b.x, nearZ.y - b.y);
                  if (nearDist < 120) nearZ.hp -= 100;
                });
              }

              // Zombie Death
              if (z.hp <= 0) {
                eng.totalKills += 1;
                if (z.type === 'goliath_boss') eng.bossesKilled += 1;
                eng.multiplier = Math.min(5, eng.multiplier + 1);
                eng.multiplierTimer = 0;
                const earnedScore = z.scoreValue * eng.multiplier;
                eng.score += earnedScore;

                // Blood Splat on floor
                eng.splats.push({
                  x: z.x,
                  y: z.y,
                  size: z.radius * 1.5,
                  color: z.color === '#ef4444' ? '#991b1b' : '#15803d',
                  alpha: 0.6,
                });
                if (eng.splats.length > 80) eng.splats.shift();

                // Drop Loot (Bio-Cores, Medkits, Nuke, etc.)
                if (Math.random() > 0.45) {
                  const lootTypes: ('credit' | 'medkit' | 'ammo' | 'turret' | 'nuke' | 'quad_damage' | 'shield')[] = [
                    'credit', 'credit', 'medkit', 'turret', 'nuke', 'quad_damage', 'shield'
                  ];
                  const chosenType = lootTypes[Math.floor(Math.random() * lootTypes.length)];
                  eng.loot.push({
                    id: eng.nextEntityId++,
                    x: z.x,
                    y: z.y,
                    type: chosenType,
                    value: chosenType === 'credit' ? 15 : 1,
                    pulseTimer: 0,
                    collected: false,
                  });
                }

                eng.floatingTexts.push({
                  id: eng.nextEntityId++,
                  text: `+${earnedScore}`,
                  x: z.x,
                  y: z.y - 20,
                  color: '#22c55e',
                  alpha: 1,
                  scale: z.type === 'goliath_boss' ? 1.6 : 1.2,
                });
              }
            }
          });
        });
        eng.bullets = eng.bullets.filter((b) => b.rangeRemaining > 0);
        eng.zombies = eng.zombies.filter((z) => z.hp > 0);

        // 6. SPAWN ZOMBIE HORDES
        eng.spawnZombieTimer -= dt;
        const maxHorde = 12 + eng.waveNumber * 4;

        if (eng.spawnZombieTimer <= 0 && eng.zombies.length < maxHorde) {
          eng.spawnZombieTimer = Math.max(0.6, 2.5 - eng.waveNumber * 0.2);

          const spawnAng = Math.random() * Math.PI * 2;
          const spawnDist = 450 + Math.random() * 200;
          const zx = p.x + Math.cos(spawnAng) * spawnDist;
          const zy = p.y + Math.sin(spawnAng) * spawnDist;

          // Determine mutant type
          let zType: 'crawler' | 'runner' | 'spitter' | 'armored' | 'goliath_boss' = 'crawler';
          let zHp = 50 + eng.waveNumber * 10;
          let zSpeed = 90;
          let zRadius = 14;
          let zColor = '#166534';
          let zGlow = '#22c55e';
          let zDmg = 15;
          let zScore = 100;

          const rand = Math.random();
          if (eng.waveNumber % 5 === 0 && rand > 0.8 && eng.bossesKilled < 5) {
            zType = 'goliath_boss';
            zHp = 600 + eng.waveNumber * 120;
            zSpeed = 65;
            zRadius = 32;
            zColor = '#052e16';
            zGlow = '#ef4444';
            zDmg = 45;
            zScore = 1200;
          } else if (eng.waveNumber >= 3 && rand > 0.6) {
            zType = 'armored';
            zHp = 140 + eng.waveNumber * 15;
            zSpeed = 80;
            zRadius = 18;
            zColor = '#14532d';
            zGlow = '#facc15';
            zDmg = 25;
            zScore = 250;
          } else if (eng.waveNumber >= 2 && rand > 0.3) {
            zType = 'runner';
            zHp = 40 + eng.waveNumber * 8;
            zSpeed = 160;
            zRadius = 12;
            zColor = '#15803d';
            zGlow = '#4ade80';
            zDmg = 12;
            zScore = 150;
          }

          eng.zombies.push({
            id: eng.nextEntityId++,
            x: zx,
            y: zy,
            vx: 0,
            vy: 0,
            angle: 0,
            speed: zSpeed,
            hp: zHp,
            maxHp: zHp,
            type: zType,
            color: zColor,
            glowColor: zGlow,
            radius: zRadius,
            damage: zDmg,
            scoreValue: zScore,
            attackCooldown: 0,
            isFrozen: false,
            freezeTimer: 0,
          });
        }

        // 7. ZOMBIE FLOCKING & PLAYER PURSUIT
        eng.zombies.forEach((z) => {
          if (z.isFrozen) {
            z.freezeTimer -= dt;
            if (z.freezeTimer <= 0) z.isFrozen = false;
            return;
          }

          // Move toward player
          const dx = p.x - z.x;
          const dy = p.y - z.y;
          const distToPlayer = Math.hypot(dx, dy);
          z.angle = Math.atan2(dy, dx);

          z.vx = Math.cos(z.angle) * z.speed;
          z.vy = Math.sin(z.angle) * z.speed;
          z.x += z.vx * dt;
          z.y += z.vy * dt;

          // Attack player on contact
          z.attackCooldown -= dt;
          if (distToPlayer < z.radius + 16 && z.attackCooldown <= 0 && !p.isRolling) {
            z.attackCooldown = 0.8;
            if (!p.isShieldActive) {
              p.hp = Math.max(0, p.hp - z.damage);
              sound.playHit();
              eng.screenShake = 8;
            }
          }
        });

        // 8. LOOT PICKUP LOGIC
        eng.loot.forEach((item) => {
          if (item.collected) return;
          item.pulseTimer += dt * 4;
          const dist = Math.hypot(p.x - item.x, p.y - item.y);

          if (dist < 36) {
            item.collected = true;

            if (item.type === 'credit') {
              eng.bioCoresCollected += item.value;
              setCredits((c) => {
                const nc = c + item.value;
                localStorage.setItem('cyber_zombie_credits', nc.toString());
                return nc;
              });
              sound.playCollect();
              eng.floatingTexts.push({ id: eng.nextEntityId++, text: `+${item.value} CR`, x: item.x, y: item.y - 20, color: '#facc15', alpha: 1, scale: 1.2 });
            } else if (item.type === 'medkit') {
              p.hp = Math.min(p.maxHp, p.hp + 40);
              sound.playPowerup();
              eng.floatingTexts.push({ id: eng.nextEntityId++, text: '💊 +40 HP', x: item.x, y: item.y - 20, color: '#22c55e', alpha: 1, scale: 1.3 });
            } else if (item.type === 'turret') {
              p.turretStock += 1;
              sound.playPowerup();
              eng.floatingTexts.push({ id: eng.nextEntityId++, text: '🤖 SENTRY +1', x: item.x, y: item.y - 20, color: '#00f0ff', alpha: 1, scale: 1.3 });
            } else if (item.type === 'nuke') {
              sound.playExplosion();
              eng.screenShake = 22;
              eng.zombies.forEach((z) => (z.hp = 0));
              eng.floatingTexts.push({ id: eng.nextEntityId++, text: '☢️ BIO-NUKE PURGE!', x: p.x, y: p.y - 40, color: '#ef4444', alpha: 1, scale: 1.6 });
            } else if (item.type === 'quad_damage') {
              p.isQuadActive = true;
              p.quadTimer = 10.0;
              sound.playPowerup();
              eng.floatingTexts.push({ id: eng.nextEntityId++, text: '⚡ QUAD DAMAGE (10s)', x: item.x, y: item.y - 20, color: '#a855f7', alpha: 1, scale: 1.4 });
            } else if (item.type === 'shield') {
              p.isShieldActive = true;
              p.shieldTimer = 8.0;
              sound.playPowerup();
              eng.floatingTexts.push({ id: eng.nextEntityId++, text: '🛡️ PLASMA SHIELD (8s)', x: item.x, y: item.y - 20, color: '#38bdf8', alpha: 1, scale: 1.4 });
            }
          }
        });
        eng.loot = eng.loot.filter((l) => !l.collected);

        // 9. PARTICLES & FLOATING TEXTS
        eng.particles.forEach((pt) => {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.alpha -= pt.decay * dt;
        });
        eng.particles = eng.particles.filter((pt) => pt.alpha > 0);

        eng.floatingTexts.forEach((ft) => {
          ft.y -= 28 * dt;
          ft.alpha -= 0.9 * dt;
        });
        eng.floatingTexts = eng.floatingTexts.filter((ft) => ft.alpha > 0);

        // Screen Shake decay
        if (eng.screenShake > 0) {
          eng.screenShake = Math.max(0, eng.screenShake - dt * 25);
        }

        // 10. CHECK GAME OVER (PLAYER ELIMINATED)
        if (p.hp <= 0) {
          eng.isRunning = false;
          setGameState('gameover');
          sound.playGameOver();

          if (eng.score > highScore) {
            setHighScore(eng.score);
            localStorage.setItem('cyber_zombie_highscore', eng.score.toString());
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          }
        }

        // Sync React HUD
        setHudHp(Math.round(p.hp));
        setHudMaxHp(p.maxHp);
        setHudScore(eng.score);
        setHudWave(eng.waveNumber);
        setHudKills(eng.totalKills);
        setHudMultiplier(eng.multiplier);
        setHudTurretsCount(p.turretStock);
        setHudQuadActive(p.isQuadActive);
        setHudShieldActive(p.isShieldActive);
      }

      // ====================================================
      // 2.5D / 3D CANVAS RENDERING PASS
      // ====================================================
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Dark Cyberpunk Alley Background
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, 0, width, height);

      // Screen Shake
      if (eng.screenShake > 0) {
        const sx = (Math.random() - 0.5) * eng.screenShake;
        const sy = (Math.random() - 0.5) * eng.screenShake;
        ctx.translate(sx, sy);
      }

      // Camera centering on player
      ctx.translate(centerX - eng.cameraX, centerY - eng.cameraY);

      // --- A. Draw Cyber Grid Floor ---
      const gridSize = 120;
      const startX = Math.floor((eng.cameraX - centerX) / gridSize) * gridSize;
      const endX = startX + width + gridSize * 2;
      const startY = Math.floor((eng.cameraY - centerY) / gridSize) * gridSize;
      const endY = startY + height + gridSize * 2;

      ctx.strokeStyle = 'rgba(22, 101, 52, 0.2)';
      ctx.lineWidth = 1.5;
      for (let gx = startX; gx <= endX; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, startY);
        ctx.lineTo(gx, endY);
        ctx.stroke();
      }
      for (let gy = startY; gy <= endY; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, gy);
        ctx.lineTo(endX, gy);
        ctx.stroke();
      }

      // --- B. Draw Blood & Slime Splats ---
      eng.splats.forEach((sp) => {
        ctx.save();
        ctx.globalAlpha = sp.alpha;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // --- C. Draw Barricades ---
      eng.barricades.forEach((bar) => {
        ctx.save();
        ctx.translate(bar.x, bar.y);
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.fillRect(-bar.width / 2, -bar.height / 2, bar.width, bar.height);
        ctx.strokeRect(-bar.width / 2, -bar.height / 2, bar.width, bar.height);
        ctx.restore();
      });

      // --- D. Draw Sentry Turrets ---
      eng.turrets.forEach((turret) => {
        ctx.save();
        ctx.translate(turret.x, turret.y);
        ctx.rotate(turret.angle);

        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Barrel
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(0, -3, 18, 6);

        ctx.restore();
      });

      // --- E. Draw Loot Drops ---
      eng.loot.forEach((item) => {
        ctx.save();
        ctx.translate(item.x, item.y);
        const floatY = Math.sin(item.pulseTimer) * 3;
        ctx.translate(0, floatY);

        if (item.type === 'credit') {
          ctx.fillStyle = '#facc15';
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 12;
          ctx.fillRect(-10, -10, 20, 20);
          ctx.strokeRect(-10, -10, 20, 20);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          const icon = item.type === 'medkit' ? '💊' : item.type === 'turret' ? '🤖' : item.type === 'nuke' ? '☢️' : item.type === 'quad_damage' ? '⚡' : '🛡️';
          ctx.fillText(icon, -6, 4);
        }
        ctx.restore();
      });

      // --- F. Draw Zombies ---
      eng.zombies.forEach((z) => {
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.rotate(z.angle);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = z.isFrozen ? '#38bdf8' : z.color;
        ctx.strokeStyle = z.glowColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = z.glowColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing Eyes
        ctx.fillStyle = z.type === 'goliath_boss' ? '#ef4444' : '#4ade80';
        ctx.beginPath();
        ctx.arc(z.radius * 0.5, -z.radius * 0.3, 2.5, 0, Math.PI * 2);
        ctx.arc(z.radius * 0.5, z.radius * 0.3, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // --- G. Draw Bullets ---
      eng.bullets.forEach((b) => {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.glowColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, b.isRocket ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // --- H. Draw Player Hero ---
      const p = eng.player;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      // Hero Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // Plasma Shield
      if (p.isShieldActive) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Hero Body
      ctx.fillStyle = activeHero.color;
      ctx.strokeStyle = activeHero.glowColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Visor
      ctx.fillStyle = '#050b14';
      ctx.fillRect(2, -5, 8, 10);
      ctx.fillStyle = activeHero.glowColor;
      ctx.fillRect(5, -3, 4, 6);

      // Gun Barrel
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, 2, 14, 4);

      ctx.restore();

      // --- I. Draw Particles ---
      eng.particles.forEach((pt) => {
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // --- J. Draw Floating Texts ---
      eng.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 12;
        ctx.font = `bold ${Math.round(16 * ft.scale)}px 'Impact', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [activeHero, activeHeroId, activeWeapon, activeWeaponId, gameState, playShootSound]);

  // ----------------------------------------------------
  // KEYBOARD & MOUSE HANDLERS
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.down = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = true;
      if (['Space'].includes(e.code)) triggerRoll();
      if (['KeyE', 'KeyQ'].includes(e.code)) deployTurret();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.down = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      keysRef.current.mouseX = e.clientX - rect.left;
      keysRef.current.mouseY = e.clientY - rect.top;
    };

    const handleMouseDown = () => {
      keysRef.current.isMouseDown = true;
    };

    const handleMouseUp = () => {
      keysRef.current.isMouseDown = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [deployTurret, triggerRoll]);

  // ----------------------------------------------------
  // RENDER JSX UI
  // ----------------------------------------------------
  return (
    <div className="relative w-full h-[640px] md:h-[720px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-emerald-500/30 select-none flex flex-col">
      {/* Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block cursor-crosshair" />

      {/* Top Header Floating Status Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-slate-950/90 to-transparent">
        {/* Credits Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/50 shadow-lg backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-black text-sm">{credits.toLocaleString()} CR</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            <Skull className="w-3.5 h-3.5 text-emerald-400" />
            <span>KILLS: {hudKills}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {gameState === 'playing' && (
            <button
              onClick={() => setGameState('menu')}
              className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
            >
              PAUSE
            </button>
          )}
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 transition shadow-md"
            title="Toggle Sound"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* IN-GAME ACTIVE HUD */}
      {gameState === 'playing' && (
        <div className="relative z-10 flex-1 flex flex-col justify-between p-4 pointer-events-none">
          {/* Top HUD Stats Overlay */}
          <div className="flex items-start justify-between">
            {/* Wave Indicator */}
            <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/50 backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>WAVE {hudWave}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-bold">Horde Purge</div>
            </div>

            {/* Score & Multipliers */}
            <div className="flex flex-col items-end gap-1 p-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/40 backdrop-blur-md shadow-xl">
              <div className="text-cyan-300 font-mono text-xl font-black tracking-wider drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                {hudScore.toLocaleString()}
              </div>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-xs">
                {hudMultiplier}x MULTIPLIER
              </span>
            </div>
          </div>

          {/* Buffs Display */}
          <div className="flex items-center gap-2">
            {hudShieldActive && (
              <div className="px-2.5 py-1 rounded-full bg-blue-600/80 border border-blue-400 text-white text-xs font-bold animate-pulse shadow-lg">
                🛡️ PLASMA SHIELD
              </div>
            )}
            {hudQuadActive && (
              <div className="px-2.5 py-1 rounded-full bg-purple-600/80 border border-purple-400 text-white text-xs font-bold animate-pulse shadow-lg">
                ⚡ QUAD DAMAGE (4X)
              </div>
            )}
          </div>

          {/* Bottom Controls & Health */}
          <div className="flex flex-col gap-3">
            {/* Health Bar */}
            <div className="max-w-xs mx-auto w-full p-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-xl">
              <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                <span className="flex items-center gap-1 text-emerald-400"><Wrench className="w-3 h-3" /> SUIT INTEGRITY</span>
                <span>{hudHp}/{hudMaxHp}</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    hudHp / hudMaxHp > 0.4 ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-gradient-to-r from-rose-600 to-amber-500 animate-pulse'
                  }`}
                  style={{ width: `${Math.max(0, (hudHp / hudMaxHp) * 100)}%` }}
                />
              </div>
            </div>

            {/* Mobile Touch Control Buttons */}
            <div className="flex items-end justify-between pointer-events-auto w-full pt-2">
              {/* D-Pad Left / Right */}
              <div className="flex gap-2">
                <button
                  onMouseDown={() => (keysRef.current.left = true)}
                  onMouseUp={() => (keysRef.current.left = false)}
                  onTouchStart={() => (keysRef.current.left = true)}
                  onTouchEnd={() => (keysRef.current.left = false)}
                  className="w-14 h-14 rounded-2xl bg-slate-900/90 active:bg-emerald-600 border-2 border-emerald-500/50 text-emerald-300 flex items-center justify-center shadow-lg active:scale-95 transition"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <button
                  onMouseDown={() => (keysRef.current.right = true)}
                  onMouseUp={() => (keysRef.current.right = false)}
                  onTouchStart={() => (keysRef.current.right = true)}
                  onTouchEnd={() => (keysRef.current.right = false)}
                  className="w-14 h-14 rounded-2xl bg-slate-900/90 active:bg-emerald-600 border-2 border-emerald-500/50 text-emerald-300 flex items-center justify-center shadow-lg active:scale-95 transition"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>

              {/* Action Buttons: Roll, Turret, Shoot */}
              <div className="flex items-center gap-2">
                {/* Turret Button */}
                <button
                  onClick={deployTurret}
                  disabled={hudTurretsCount <= 0}
                  className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg active:scale-95 transition font-black text-xs ${
                    hudTurretsCount > 0
                      ? 'bg-cyan-600/90 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.7)]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-600 opacity-60'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>TURRET ({hudTurretsCount})</span>
                </button>

                {/* Roll Button */}
                <button
                  onClick={triggerRoll}
                  className="w-14 h-14 rounded-2xl bg-purple-600 active:bg-purple-500 active:scale-95 border-2 border-purple-400 text-white flex flex-col items-center justify-center shadow-lg transition font-black text-xs shadow-[0_0_15px_rgba(168,85,247,0.6)]"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>DASH</span>
                </button>

                {/* Fire Button */}
                <button
                  onMouseDown={() => (keysRef.current.shoot = true)}
                  onMouseUp={() => (keysRef.current.shoot = false)}
                  onTouchStart={() => (keysRef.current.shoot = true)}
                  onTouchEnd={() => (keysRef.current.shoot = false)}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 active:scale-95 border-2 border-rose-300 text-white flex flex-col items-center justify-center shadow-lg transition font-black text-xs shadow-[0_0_20px_rgba(244,63,94,0.8)]"
                >
                  <Crosshair className="w-6 h-6" />
                  <span>FIRE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN MENU OVERLAY */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full flex flex-col items-center gap-6">
            {/* Glowing Logo */}
            <div className="flex flex-col items-center">
              <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-bold text-xs tracking-widest uppercase mb-2 flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                <Skull className="w-3.5 h-3.5 text-emerald-400" />
                <span>BIOHAZARD SURVIVOR</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-rose-500 drop-shadow-[0_0_25px_rgba(34,197,94,0.8)] font-sans">
                CYBER ZOMBIE OUTBREAK
              </h1>
              <p className="text-slate-400 text-xs md:text-sm font-medium mt-1">
                Twin-stick cyberpunk shooter! Purge relentless mutant swarms & Goliath bosses.
              </p>
            </div>

            {/* Selected Hero Banner */}
            <div className="w-full p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md border"
                  style={{ backgroundColor: activeHero.color, borderColor: activeHero.glowColor }}
                >
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-white font-black text-sm">{activeHero.name}</div>
                  <div className="text-emerald-400 text-xs font-bold">{activeWeapon.name}</div>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setGameState('armory')}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-cyan-300 font-bold text-xs transition"
                >
                  ARMORY
                </button>
                <button
                  onClick={() => setGameState('heroes')}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/50 text-emerald-300 font-bold text-xs transition"
                >
                  HEROES
                </button>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => startGame('endless')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-600 hover:from-emerald-400 hover:to-purple-500 text-white font-black text-lg tracking-wider transition shadow-[0_0_25px_rgba(34,197,94,0.7)] flex items-center justify-center gap-2 active:scale-98"
              >
                <Play className="w-6 h-6 fill-current" /> PLAY ENDLESS SURVIVAL
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setGameState('missions')}
                  className="py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Crosshair className="w-4 h-4 text-amber-400" /> MISSIONS ({completedMissionIds.length}/6)
                </button>

                <button
                  onClick={() => setGameState('instructions')}
                  className="py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <HelpCircle className="w-4 h-4 text-emerald-400" /> HOW TO PLAY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARMORY / WEAPONS MODAL */}
      {gameState === 'armory' && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">
                CYBER ARMORY
              </h2>
              <p className="text-xs text-slate-400">Unlock high-tech sci-fi firearms and heavy ordinance</p>
            </div>
            <button
              onClick={() => setGameState('menu')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              BACK TO MENU
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {WEAPONS_CATALOG.map((w) => {
              const isUnlocked = unlockedWeaponIds.includes(w.id);
              const isSelected = activeWeaponId === w.id;
              const canAfford = credits >= w.price;

              return (
                <div
                  key={w.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                      : isUnlocked
                      ? 'bg-slate-900/80 border-slate-700/80'
                      : 'bg-slate-950/80 border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white font-black text-base">{w.name}</div>
                      <div className="text-xs text-slate-400">{w.description}</div>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400 text-[10px] font-black">
                        EQUIPPED
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-300">
                    <div>Damage: <span className="text-rose-400">{w.damage}</span></div>
                    <div>Fire Rate: <span className="text-cyan-400">{w.fireRate}/s</span></div>
                  </div>

                  {isUnlocked ? (
                    <button
                      onClick={() => {
                        setActiveWeaponId(w.id);
                        localStorage.setItem('cyber_zombie_active_weapon', w.id);
                        sound.playClick();
                      }}
                      disabled={isSelected}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 cursor-default'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                      }`}
                    >
                      {isSelected ? 'SELECTED' : 'EQUIP WEAPON'}
                    </button>
                  ) : (
                    <button
                      onClick={() => buyWeapon(w)}
                      disabled={!canAfford}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-md'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>UNLOCK FOR {w.price} CR</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HEROES SHOWROOM MODAL */}
      {gameState === 'heroes' && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-400">
                HERO OPERATIVES
              </h2>
              <p className="text-xs text-slate-400">Unlock specialized cyber operatives with custom abilities</p>
            </div>
            <button
              onClick={() => setGameState('menu')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              BACK TO MENU
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {HERO_CLASSES.map((h) => {
              const isUnlocked = unlockedHeroIds.includes(h.id);
              const isSelected = activeHeroId === h.id;
              const canAfford = credits >= h.price;

              return (
                <div
                  key={h.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                      : isUnlocked
                      ? 'bg-slate-900/80 border-slate-700/80'
                      : 'bg-slate-950/80 border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white font-black text-base">{h.name}</div>
                      <div className="text-xs text-slate-400">{h.description}</div>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400 text-[10px] font-black">
                        EQUIPPED
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-300">
                    <div>HP: <span className="text-emerald-400">{h.maxHp}</span></div>
                    <div>Speed: <span className="text-cyan-400">{h.speed}</span></div>
                    <div>Crit: <span className="text-amber-400">{Math.round(h.critRate * 100)}%</span></div>
                  </div>

                  {isUnlocked ? (
                    <button
                      onClick={() => {
                        setActiveHeroId(h.id);
                        localStorage.setItem('cyber_zombie_active_hero', h.id);
                        sound.playClick();
                      }}
                      disabled={isSelected}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      }`}
                    >
                      {isSelected ? 'SELECTED' : 'SELECT HERO'}
                    </button>
                  ) : (
                    <button
                      onClick={() => buyHero(h)}
                      disabled={!canAfford}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-md'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>UNLOCK FOR {h.price} CR</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MISSIONS MODAL */}
      {gameState === 'missions' && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400">
                QUARANTINE ZONE MISSIONS
              </h2>
              <p className="text-xs text-slate-400">Complete objectives to earn massive Cyber Credit bounties</p>
            </div>
            <button
              onClick={() => setGameState('menu')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              BACK TO MENU
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
            {ZOMBIE_MISSIONS.map((m) => {
              const isCleared = completedMissionIds.includes(m.id);

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    isCleared
                      ? 'bg-emerald-950/30 border-emerald-500/50'
                      : 'bg-slate-900/80 border-slate-700/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                        isCleared ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-amber-400'
                      }`}
                    >
                      {isCleared ? <CheckCircle2 className="w-5 h-5" /> : m.id}
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{m.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{m.desc}</div>
                      <div className="text-xs font-bold text-amber-400 mt-1">Reward: +{m.rewardCredits} CR</div>
                    </div>
                  </div>

                  <button
                    onClick={() => startGame('mission', m.id)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md whitespace-nowrap"
                  >
                    DEPLOY
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HOW TO PLAY MODAL */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h2 className="text-2xl font-black text-emerald-400">COMBAT BRIEFING & CONTROLS</h2>
            <button
              onClick={() => setGameState('menu')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              CLOSE
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm text-slate-300">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-emerald-400 font-bold text-base flex items-center gap-2">
                <Crosshair className="w-5 h-5" /> Desktop Controls
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li><strong className="text-white">[W, A, S, D]</strong> — Move Operative</li>
                <li><strong className="text-white">[Mouse Cursor + Click]</strong> — Aim & Fire Weapon</li>
                <li><strong className="text-white">[SPACE]</strong> — Tactical Combat Roll / Dash</li>
                <li><strong className="text-white">[E] / [Q]</strong> — Deploy Auto-Targeting Sentry Turret</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-amber-400 font-bold text-base flex items-center gap-2">
                <Shield className="w-5 h-5" /> Survival Field Tips
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>• <strong>Barricades:</strong> Lure zombies around obstacles to avoid being surrounded.</li>
                <li>• <strong>Sentry Turrets:</strong> Place turrets in choke points for automated crossfire.</li>
                <li>• <strong>Power-Up Drops:</strong> Grab Bio-Nukes to wipe entire screens instantly!</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full flex flex-col items-center gap-5 p-6 rounded-3xl bg-slate-900/90 border border-rose-500/40 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-600/20 border-2 border-rose-500 text-rose-400 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.6)]">
              <Skull className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-3xl font-black text-white tracking-wider">OPERATIVE DOWN</h2>
              <p className="text-xs text-slate-400 mt-1">Overrun by biohazard mutant horde!</p>
            </div>

            {/* Score Breakdown */}
            <div className="w-full grid grid-cols-2 gap-3 py-3 border-y border-slate-800">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Final Score</div>
                <div className="text-xl font-black text-cyan-300">{hudScore.toLocaleString()}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Mutants Purged</div>
                <div className="text-xl font-black text-emerald-400">{hudKills}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={() => startGame(gameMode, selectedMissionId)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm tracking-wider transition shadow-lg flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> RETRY MISSION
              </button>

              <button
                onClick={() => setGameState('menu')}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                RETURN TO MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
