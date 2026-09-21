import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Play,
  ChevronRight, Swords, Award, Flame, Star, ShoppingBag,
  Crosshair, Radio, AlertTriangle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  HelpCircle, Compass, Lock, CheckCircle2, CircleDot, RefreshCw, Skull, Wrench
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// TYPES & DATA STRUCTURES
// ----------------------------------------------------

export interface BrawlerFighter {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  color: string;
  glowColor: string;
  accentColor: string;
  maxHp: number;
  punchDmg: number;
  kickDmg: number;
  gunDmg: number;
  speed: number;
  specialMove: string;
  description: string;
}

export interface BrawlerStage {
  id: number;
  title: string;
  location: string;
  themeColor: string;
  enemiesCount: number;
  hasBoss: boolean;
  bossName: string;
  rewardCredits: number;
}

interface Bullet {
  id: number;
  isPlayer: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  damage: number;
  color: string;
  glowColor: string;
  rangeRemaining: number;
}

interface CharacterEntity {
  id: number;
  isPlayer: boolean;
  name: string;
  x: number;
  y: number; // Ground depth (220 to 380)
  z: number; // Aerial jump height
  vx: number;
  vy: number;
  vz: number;
  facing: 1 | -1; // 1 = right, -1 = left
  hp: number;
  maxHp: number;
  state: 'idle' | 'walk' | 'punch1' | 'punch2' | 'punch3' | 'kick' | 'shoot' | 'dragon_punch' | 'jump' | 'jump_kick' | 'hit' | 'knockdown';
  stateTimer: number;
  comboStep: number;
  comboResetTimer: number;
  shootCooldown: number;
  ammo: number;
  maxAmmo: number;
  color: string;
  glowColor: string;
  isBoss?: boolean;
  isGunner?: boolean;
  aiTimer?: number;
  aiDecision?: 'chase' | 'attack' | 'shoot' | 'retreat';
  equippedWeapon?: 'none' | 'katana' | 'shotgun';
}

interface BreakableObject {
  id: number;
  type: 'barrel' | 'crate';
  x: number;
  y: number;
  hp: number;
  broken: boolean;
  dropType: 'health' | 'ammo' | 'katana' | 'credit';
}

interface GroundItem {
  id: number;
  type: 'health' | 'ammo' | 'katana' | 'credit';
  x: number;
  y: number;
  pulseTimer: number;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  shape?: 'spark' | 'smoke' | 'shockwave';
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

const BRAWLER_FIGHTERS: BrawlerFighter[] = [
  {
    id: 'alex-cyber',
    name: 'Alex Cyber',
    price: 0,
    unlocked: true,
    color: '#0284c7',
    glowColor: '#38bdf8',
    accentColor: '#f43f5e',
    maxHp: 220,
    punchDmg: 28,
    kickDmg: 45,
    gunDmg: 35,
    speed: 200,
    specialMove: 'Dragon Plasma Wave',
    description: 'Disciplined street operative with fluid martial arts and plasma blaster.',
  },
  {
    id: 'maya-valkyrie',
    name: 'Maya Valkyrie',
    price: 350,
    unlocked: false,
    color: '#a855f7',
    glowColor: '#c084fc',
    accentColor: '#00f0ff',
    maxHp: 200,
    punchDmg: 24,
    kickDmg: 55,
    gunDmg: 32,
    speed: 240,
    specialMove: 'Cyber Hurricane Kick',
    description: 'High-agility kickboxing master with devastating roundhouse strikes.',
  },
  {
    id: 'titan-rex',
    name: 'Titan Rex',
    price: 750,
    unlocked: false,
    color: '#ea580c',
    glowColor: '#f97316',
    accentColor: '#facc15',
    maxHp: 340,
    punchDmg: 44,
    kickDmg: 58,
    gunDmg: 45,
    speed: 165,
    specialMove: 'Seismic Shock Slam',
    description: 'Armored heavy demolisher dealing massive kinetic knockdown damage.',
  },
  {
    id: 'shadow-shinobi',
    name: 'Shadow Shinobi',
    price: 1400,
    unlocked: false,
    color: '#e11d48',
    glowColor: '#fb7185',
    accentColor: '#facc15',
    maxHp: 210,
    punchDmg: 36,
    kickDmg: 50,
    gunDmg: 40,
    speed: 230,
    specialMove: 'Shadow Laser Katana Surge',
    description: 'Cyber ninja assassin equipped with dual-edge high frequency katanas.',
  },
  {
    id: 'cyborg-v9',
    name: 'Cyborg V9',
    price: 2500,
    unlocked: false,
    color: '#facc15',
    glowColor: '#fef08a',
    accentColor: '#00f0ff',
    maxHp: 280,
    punchDmg: 38,
    kickDmg: 52,
    gunDmg: 55,
    speed: 210,
    specialMove: 'Nano Arm-Cannon Beam',
    description: 'Advanced mecha cyborg wielding rapid-fire arm cannons.',
  },
];

const BRAWLER_STAGES: BrawlerStage[] = [
  {
    id: 1,
    title: 'Stage 1: Neon Downtown Alley',
    location: 'District 9 Cyber Slums',
    themeColor: '#00f0ff',
    enemiesCount: 8,
    hasBoss: true,
    bossName: 'Cyborg Bouncer Jax',
    rewardCredits: 250,
  },
  {
    id: 2,
    title: 'Stage 2: Underground Cyber Club',
    location: 'Sub-Level Rave Arena',
    themeColor: '#a855f7',
    enemiesCount: 12,
    hasBoss: true,
    bossName: 'Shadow Ninja Kage',
    rewardCredits: 550,
  },
  {
    id: 3,
    title: 'Stage 3: Skyscraper Penthouse',
    location: 'OmniCorp Rooftop Helipad',
    themeColor: '#f43f5e',
    enemiesCount: 16,
    hasBoss: true,
    bossName: 'Titan Overlord Goliath',
    rewardCredits: 1200,
  },
];

// ----------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------

export const CyberStreetBrawler3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI Screen State
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'victory' | 'dojo' | 'stages' | 'instructions'>('menu');
  const [gameMode, setGameMode] = useState<'campaign' | 'survival'>('campaign');
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);

  // Persistence State
  const [credits, setCredits] = useState<number>(() => {
    const s = localStorage.getItem('cyber_brawler_credits');
    return s ? parseInt(s, 10) : 150;
  });

  const [highScore, setHighScore] = useState<number>(() => {
    const s = localStorage.getItem('cyber_brawler_highscore');
    return s ? parseInt(s, 10) : 0;
  });

  const [unlockedFighterIds, setUnlockedFighterIds] = useState<string[]>(() => {
    const s = localStorage.getItem('cyber_brawler_unlocked_fighters');
    return s ? JSON.parse(s) : ['alex-cyber'];
  });

  const [activeFighterId, setActiveFighterId] = useState<string>(() => {
    return localStorage.getItem('cyber_brawler_active_fighter') || 'alex-cyber';
  });

  // Dynamic In-Game HUD States
  const [hudHp, setHudHp] = useState(220);
  const [hudMaxHp, setHudMaxHp] = useState(220);
  const [hudAmmo, setHudAmmo] = useState(30);
  const [hudSpecialEnergy, setHudSpecialEnergy] = useState(100);
  const [hudCombo, setHudCombo] = useState(0);
  const [hudScore, setHudScore] = useState(0);
  const [hudEnemiesLeft, setHudEnemiesLeft] = useState(8);
  const [hudBossHp, setHudBossHp] = useState<number | null>(null);
  const [hudBossName, setHudBossName] = useState('');
  const [muted, setMuted] = useState(sound.isMuted());

  // Input states
  const keysRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    punch: false,
    kick: false,
    shoot: false,
    jump: false,
    special: false,
  });

  // 60 FPS Physics Simulation Engine Refs
  const engineRef = useRef({
    stageWidth: 2400,
    cameraX: 0,
    screenShake: 0,
    score: 0,
    comboCount: 0,
    comboTimer: 0,
    specialEnergy: 100,
    player: null as CharacterEntity | null,
    enemies: [] as CharacterEntity[],
    bullets: [] as Bullet[],
    breakables: [] as BreakableObject[],
    items: [] as GroundItem[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    totalEnemiesSpawned: 0,
    maxStageEnemies: 8,
    isStageComplete: false,
    lastTime: performance.now(),
    isRunning: false,
    nextEntityId: 1,
  });

  const activeFighter = BRAWLER_FIGHTERS.find((f) => f.id === activeFighterId) || BRAWLER_FIGHTERS[0];
  const activeStage = BRAWLER_STAGES[activeStageIndex] || BRAWLER_STAGES[0];

  // ----------------------------------------------------
  // SOUND HELPERS
  // ----------------------------------------------------
  const toggleMute = () => {
    const m = sound.toggleMute();
    setMuted(m);
  };

  const playHitEffectSound = useCallback((heavy = false) => {
    if (sound.isMuted()) return;
    if (heavy) sound.playExplosion();
    else sound.playHit();
  }, []);

  const playGunShotSound = useCallback(() => {
    if (sound.isMuted()) return;
    sound.playLaser();
  }, []);

  // ----------------------------------------------------
  // START & RESET STAGE MATCH
  // ----------------------------------------------------
  const startStage = useCallback((mode: 'campaign' | 'survival' = 'campaign', stageIdx = 0) => {
    setGameMode(mode);
    setActiveStageIndex(stageIdx);

    const eng = engineRef.current;
    const fighter = BRAWLER_FIGHTERS.find((f) => f.id === activeFighterId) || BRAWLER_FIGHTERS[0];
    const stage = BRAWLER_STAGES[stageIdx] || BRAWLER_STAGES[0];

    eng.score = 0;
    eng.comboCount = 0;
    eng.comboTimer = 0;
    eng.specialEnergy = 100;
    eng.screenShake = 0;
    eng.cameraX = 0;
    eng.particles = [];
    eng.floatingTexts = [];
    eng.bullets = [];
    eng.items = [];
    eng.isStageComplete = false;
    eng.totalEnemiesSpawned = 0;
    eng.maxStageEnemies = mode === 'survival' ? 999 : stage.enemiesCount;

    // Create Player Entity
    const playerEntity: CharacterEntity = {
      id: 0,
      isPlayer: true,
      name: fighter.name,
      x: 120,
      y: 300,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      facing: 1,
      hp: fighter.maxHp,
      maxHp: fighter.maxHp,
      state: 'idle',
      stateTimer: 0,
      comboStep: 0,
      comboResetTimer: 0,
      shootCooldown: 0,
      ammo: 30,
      maxAmmo: 30,
      color: fighter.color,
      glowColor: fighter.glowColor,
      equippedWeapon: 'none',
    };
    eng.player = playerEntity;

    // Spawn Breakable Crates/Barrels along the street
    eng.breakables = [
      { id: 1, type: 'barrel', x: 450, y: 260, hp: 30, broken: false, dropType: 'health' },
      { id: 2, type: 'crate', x: 850, y: 340, hp: 30, broken: false, dropType: 'ammo' },
      { id: 3, type: 'barrel', x: 1300, y: 280, hp: 30, broken: false, dropType: 'katana' },
      { id: 4, type: 'crate', x: 1750, y: 320, hp: 30, broken: false, dropType: 'health' },
    ];

    // Spawn Initial Wave (2 Melee Brawlers + 1 Gunman Thug)
    const initialEnemies: CharacterEntity[] = [];
    for (let i = 0; i < 3; i++) {
      const isGunner = i === 2;
      initialEnemies.push({
        id: eng.nextEntityId++,
        isPlayer: false,
        name: isGunner ? 'Syndicate Gunner' : `Cyber Punk ${i + 1}`,
        x: 420 + i * 160,
        y: 250 + (i % 3) * 45,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        facing: -1,
        hp: isGunner ? 70 : 90 + stageIdx * 20,
        maxHp: isGunner ? 70 : 90 + stageIdx * 20,
        state: 'idle',
        stateTimer: 0,
        comboStep: 0,
        comboResetTimer: 0,
        shootCooldown: 1.5,
        ammo: 10,
        maxAmmo: 10,
        color: isGunner ? '#f97316' : '#ef4444',
        glowColor: isGunner ? '#facc15' : '#f87171',
        isGunner,
        aiTimer: 0.5 + Math.random() * 1.5,
        aiDecision: isGunner ? 'shoot' : 'chase',
      });
      eng.totalEnemiesSpawned++;
    }
    eng.enemies = initialEnemies;

    eng.lastTime = performance.now();
    eng.isRunning = true;

    setHudHp(fighter.maxHp);
    setHudMaxHp(fighter.maxHp);
    setHudAmmo(30);
    setHudSpecialEnergy(100);
    setHudCombo(0);
    setHudScore(0);
    setHudEnemiesLeft(eng.maxStageEnemies);
    setHudBossHp(null);
    setGameState('playing');

    sound.playClick();
  }, [activeFighterId]);

  // ----------------------------------------------------
  // UNLOCK / PURCHASE FIGHTER
  // ----------------------------------------------------
  const buyFighter = (fighter: BrawlerFighter) => {
    if (credits >= fighter.price && !unlockedFighterIds.includes(fighter.id)) {
      const nextCr = credits - fighter.price;
      const nextFighters = [...unlockedFighterIds, fighter.id];
      setCredits(nextCr);
      setUnlockedFighterIds(nextFighters);
      setActiveFighterId(fighter.id);

      localStorage.setItem('cyber_brawler_credits', nextCr.toString());
      localStorage.setItem('cyber_brawler_unlocked_fighters', JSON.stringify(nextFighters));
      localStorage.setItem('cyber_brawler_active_fighter', fighter.id);

      sound.playWin();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    }
  };

  // ----------------------------------------------------
  // SHOOT GUN BULLET ACTION
  // ----------------------------------------------------
  const triggerShootGun = useCallback(() => {
    const eng = engineRef.current;
    const p = eng.player;
    if (!p || p.hp <= 0 || p.ammo <= 0 || p.shootCooldown > 0) return;

    p.ammo -= 1;
    p.shootCooldown = 0.22;
    p.state = 'shoot';
    p.stateTimer = 0.25;

    playGunShotSound();
    eng.screenShake = 6;

    // Bullet Entity
    eng.bullets.push({
      id: eng.nextEntityId++,
      isPlayer: true,
      x: p.x + p.facing * 35,
      y: p.y,
      z: p.z + 28,
      vx: p.facing * 650,
      damage: 40,
      color: '#00f0ff',
      glowColor: '#38bdf8',
      rangeRemaining: 600,
    });

    // Muzzle Flash Spark
    eng.particles.push({
      x: p.x + p.facing * 38,
      y: p.y,
      z: p.z + 28,
      vx: p.facing * 80,
      vy: (Math.random() - 0.5) * 40,
      vz: (Math.random() - 0.5) * 40,
      size: 8,
      color: '#facc15',
      alpha: 1,
      decay: 8.0,
      shape: 'spark',
    });

    setHudAmmo(p.ammo);
  }, [playGunShotSound]);

  // ----------------------------------------------------
  // PERFORM DRAGON PLASMA SPECIAL ATTACK
  // ----------------------------------------------------
  const triggerDragonSpecial = useCallback(() => {
    const eng = engineRef.current;
    const p = eng.player;
    if (!p || p.hp <= 0 || p.state === 'dragon_punch' || eng.specialEnergy < 35) return;

    eng.specialEnergy -= 35;
    p.state = 'dragon_punch';
    p.stateTimer = 0.55;
    p.vz = 260; // Launch upward

    sound.playExplosion();
    eng.screenShake = 16;

    // Fire 3 heavy dragon plasma energy bullets forward
    for (let b = -1; b <= 1; b++) {
      eng.bullets.push({
        id: eng.nextEntityId++,
        isPlayer: true,
        x: p.x + p.facing * 40,
        y: p.y + b * 20,
        z: p.z + 30,
        vx: p.facing * 500,
        damage: 85,
        color: '#f43f5e',
        glowColor: '#facc15',
        rangeRemaining: 700,
      });
    }

    // Dragon Plasma Shockwave FX
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      eng.particles.push({
        x: p.x,
        y: p.y,
        z: p.z + 20,
        vx: Math.cos(ang) * 200,
        vy: Math.sin(ang) * 200,
        vz: Math.random() * 120,
        size: 7,
        color: '#00f0ff',
        alpha: 1,
        decay: 2.5,
        shape: 'shockwave',
      });
    }

    eng.floatingTexts.push({
      id: eng.nextEntityId++,
      text: '⚡ DRAGON PLASMA SURGE!',
      x: p.x,
      y: p.y - 60,
      color: '#00f0ff',
      alpha: 1,
      scale: 1.6,
    });
  }, []);

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
      const fighter = BRAWLER_FIGHTERS.find((f) => f.id === activeFighterId) || BRAWLER_FIGHTERS[0];
      const p = eng.player;

      // Resize
      const container = canvas.parentElement;
      if (container) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
      }

      if (eng.isRunning && gameState === 'playing' && p) {
        const keys = keysRef.current;

        // Combo decay timer
        if (eng.comboCount > 0) {
          eng.comboTimer += dt;
          if (eng.comboTimer > 3.0) {
            eng.comboCount = 0;
            eng.comboTimer = 0;
          }
        }

        // Special energy passive recharge
        eng.specialEnergy = Math.min(100, eng.specialEnergy + dt * 6);
        p.shootCooldown = Math.max(0, p.shootCooldown - dt);

        // 1. PLAYER INPUT & COMBAT ACTIONS
        if (p.stateTimer > 0) {
          p.stateTimer -= dt;
          if (p.stateTimer <= 0) {
            p.state = 'idle';
          }
        }

        if (p.comboResetTimer > 0) {
          p.comboResetTimer -= dt;
          if (p.comboResetTimer <= 0) p.comboStep = 0;
        }

        // Gravity on Z-axis (Jumping)
        if (p.z > 0 || p.vz > 0) {
          p.vz -= 650 * dt;
          p.z += p.vz * dt;
          if (p.z <= 0) {
            p.z = 0;
            p.vz = 0;
            if (['jump', 'jump_kick', 'dragon_punch'].includes(p.state)) {
              p.state = 'idle';
            }
          }
        }

        // Action Triggering when Idle or Walking
        if (p.state === 'idle' || p.state === 'walk') {
          if (keys.punch) {
            keys.punch = false;
            p.comboStep = (p.comboStep % 3) + 1;
            p.comboResetTimer = 0.8;
            p.state = p.comboStep === 3 ? 'punch3' : (p.comboStep === 2 ? 'punch2' : 'punch1');
            p.stateTimer = 0.28;
            sound.playLaser();
          } else if (keys.kick) {
            keys.kick = false;
            p.state = p.z > 0 ? 'jump_kick' : 'kick';
            p.stateTimer = 0.35;
            sound.playLaser();
          } else if (keys.shoot) {
            keys.shoot = false;
            triggerShootGun();
          } else if (keys.jump && p.z <= 0) {
            keys.jump = false;
            p.state = 'jump';
            p.vz = 260;
            sound.playJump();
          } else if (keys.special) {
            keys.special = false;
            triggerDragonSpecial();
          } else {
            // Movement & Depth positioning (WASD)
            let mx = 0;
            let my = 0;
            if (keys.left) mx -= 1;
            if (keys.right) mx += 1;
            if (keys.up) my -= 1;
            if (keys.down) my += 1;

            if (mx !== 0 || my !== 0) {
              p.state = 'walk';
              if (mx !== 0) p.facing = mx > 0 ? 1 : -1;
              p.x += mx * fighter.speed * dt;
              p.y += my * (fighter.speed * 0.7) * dt;

              // Bounds
              p.x = Math.max(40, Math.min(eng.stageWidth - 40, p.x));
              p.y = Math.max(220, Math.min(380, p.y));
            } else {
              p.state = 'idle';
            }
          }
        }

        // 2. MELEE HIT DETECTION (PUNCH & KICK VS ENEMIES & BARRELS)
        const isPlayerMelee = ['punch1', 'punch2', 'punch3', 'kick', 'jump_kick', 'dragon_punch'].includes(p.state);

        if (isPlayerMelee && p.stateTimer > 0.04 && p.stateTimer < 0.28) {
          const hitRange = p.state.startsWith('kick') ? 85 : (p.state === 'dragon_punch' ? 110 : (p.equippedWeapon === 'katana' ? 95 : 65));
          const attackDmg = p.state === 'dragon_punch'
            ? 90
            : (p.state.startsWith('kick') ? fighter.kickDmg : fighter.punchDmg) * (p.equippedWeapon === 'katana' ? 2.2 : 1.0);

          // Check Enemies Hit
          eng.enemies.forEach((en) => {
            if (en.hp <= 0 || en.state === 'knockdown') return;
            const dx = (en.x - p.x) * p.facing;
            const dy = Math.abs(en.y - p.y);

            if (dx > 0 && dx < hitRange && dy < 38) {
              en.hp = Math.max(0, en.hp - attackDmg);
              const isHeavy = p.state === 'punch3' || p.state.startsWith('kick') || p.state === 'dragon_punch';
              en.state = isHeavy ? 'knockdown' : 'hit';
              en.stateTimer = isHeavy ? 0.5 : 0.25;
              en.vx = p.facing * (isHeavy ? 240 : 120);

              playHitEffectSound(isHeavy);
              eng.screenShake = isHeavy ? 10 : 4;

              eng.comboCount += 1;
              eng.comboTimer = 0;
              const earnedScore = 150 * eng.comboCount;
              eng.score += earnedScore;

              // Comic Text Popups
              const comicWords = p.state.startsWith('kick') ? ['KICK!', 'WHAM!', 'CRUSH!'] : ['POW!', 'HIT!', 'SLAM!'];
              const chosenWord = comicWords[Math.floor(Math.random() * comicWords.length)];

              eng.floatingTexts.push({
                id: eng.nextEntityId++,
                text: `${chosenWord} +${earnedScore}`,
                x: en.x,
                y: en.y - 35,
                color: p.state.startsWith('kick') ? '#facc15' : '#00f0ff',
                alpha: 1,
                scale: isHeavy ? 1.4 : 1.1,
              });

              // Sparks FX
              for (let s = 0; s < 6; s++) {
                eng.particles.push({
                  x: en.x,
                  y: en.y,
                  z: en.z + 20,
                  vx: (Math.random() - 0.5) * 180,
                  vy: (Math.random() - 0.5) * 180,
                  vz: Math.random() * 90,
                  size: 4,
                  color: '#facc15',
                  alpha: 1,
                  decay: 3.0,
                  shape: 'spark',
                });
              }

              // Enemy KO
              if (en.hp <= 0) {
                sound.playWin();
                eng.floatingTexts.push({
                  id: eng.nextEntityId++,
                  text: '💥 K.O.!',
                  x: en.x,
                  y: en.y - 50,
                  color: '#f43f5e',
                  alpha: 1,
                  scale: 1.7,
                });
              }
            }
          });

          // Check Breakable Objects Hit
          eng.breakables.forEach((obj) => {
            if (obj.broken) return;
            const dist = Math.hypot(p.x - obj.x, p.y - obj.y);
            if (dist < 65) {
              obj.broken = true;
              sound.playExplosion();
              eng.items.push({
                id: eng.nextEntityId++,
                type: obj.dropType,
                x: obj.x,
                y: obj.y,
                pulseTimer: 0,
                collected: false,
              });
            }
          });
        }

        // 3. BULLETS PHYSICS & COLLISION SIMULATION (GUN SYSTEM)
        eng.bullets.forEach((b) => {
          b.x += b.vx * dt;
          b.rangeRemaining -= Math.abs(b.vx) * dt;

          if (b.isPlayer) {
            // Player Bullet hits Enemies
            eng.enemies.forEach((en) => {
              if (b.rangeRemaining <= 0 || en.hp <= 0) return;
              const dist = Math.hypot(en.x - b.x, en.y - b.y);

              if (dist < 32 && Math.abs(en.z - b.z) < 30) {
                b.rangeRemaining = 0; // Consume bullet
                en.hp = Math.max(0, en.hp - b.damage);
                en.state = 'hit';
                en.stateTimer = 0.3;
                en.vx = Math.sign(b.vx) * 140;

                playHitEffectSound(false);
                eng.screenShake = 6;
                eng.comboCount += 1;
                eng.comboTimer = 0;
                eng.score += 200;

                eng.floatingTexts.push({
                  id: eng.nextEntityId++,
                  text: `🔫 BANG! -${b.damage}`,
                  x: en.x,
                  y: en.y - 30,
                  color: '#00f0ff',
                  alpha: 1,
                  scale: 1.3,
                });

                if (en.hp <= 0) {
                  sound.playWin();
                  eng.floatingTexts.push({ id: eng.nextEntityId++, text: '💥 K.O.!', x: en.x, y: en.y - 50, color: '#f43f5e', alpha: 1, scale: 1.6 });
                }
              }
            });
          } else {
            // Enemy Gunman Bullet hits Player
            const dist = Math.hypot(p.x - b.x, p.y - b.y);
            if (dist < 28 && Math.abs(p.z - b.z) < 30 && b.rangeRemaining > 0) {
              b.rangeRemaining = 0;
              p.hp = Math.max(0, p.hp - b.damage);
              sound.playHit();
              eng.screenShake = 8;

              if (p.hp <= 0) {
                eng.isRunning = false;
                setGameState('gameover');
                sound.playGameOver();
              }
            }
          }
        });
        eng.bullets = eng.bullets.filter((b) => b.rangeRemaining > 0);

        // 4. AI ENEMIES BEHAVIOR (MELEE THUGS & GUNMEN)
        eng.enemies.forEach((en) => {
          if (en.hp <= 0) return;

          if (en.state === 'knockdown') {
            en.stateTimer -= dt;
            en.x += en.vx * dt;
            en.vx *= 0.9;
            if (en.stateTimer <= 0) en.state = 'idle';
            return;
          }

          if (en.stateTimer > 0) {
            en.stateTimer -= dt;
            if (en.stateTimer <= 0) en.state = 'idle';
          }

          // Gunman AI Shooting
          if (en.isGunner) {
            en.shootCooldown = (en.shootCooldown || 1.5) - dt;
            const dx = p.x - en.x;
            en.facing = dx > 0 ? 1 : -1;

            if (en.shootCooldown <= 0 && Math.abs(p.y - en.y) < 40) {
              en.shootCooldown = 2.2;
              en.state = 'shoot';
              en.stateTimer = 0.3;
              playGunShotSound();

              eng.bullets.push({
                id: eng.nextEntityId++,
                isPlayer: false,
                x: en.x + en.facing * 30,
                y: en.y,
                z: en.z + 28,
                vx: en.facing * 450,
                damage: 22,
                color: '#f97316',
                glowColor: '#ef4444',
                rangeRemaining: 550,
              });
            }
          } else {
            // Melee Brawler AI
            en.aiTimer = (en.aiTimer || 1.0) - dt;
            if (en.aiTimer <= 0) {
              en.aiTimer = 1.0 + Math.random() * 1.5;
              const distToPlayer = Math.hypot(p.x - en.x, p.y - en.y);
              en.aiDecision = distToPlayer < 65 ? 'attack' : 'chase';
            }

            if (en.aiDecision === 'chase' && (en.state === 'idle' || en.state === 'walk')) {
              const dx = p.x - en.x;
              const dy = p.y - en.y;
              en.facing = dx > 0 ? 1 : -1;

              if (Math.abs(dx) > 55 || Math.abs(dy) > 20) {
                en.state = 'walk';
                en.x += Math.sign(dx) * 110 * dt;
                en.y += Math.sign(dy) * 80 * dt;
              } else {
                en.state = 'punch1';
                en.stateTimer = 0.35;
              }
            } else if (en.aiDecision === 'attack' && (en.state === 'idle' || en.state === 'walk')) {
              en.state = 'punch1';
              en.stateTimer = 0.35;
            }

            // Enemy melee punch hits player
            if (en.state === 'punch1' && en.stateTimer > 0.1 && en.stateTimer < 0.25) {
              const dx = (p.x - en.x) * en.facing;
              const dy = Math.abs(p.y - en.y);

              if (dx > 0 && dx < 55 && dy < 30) {
                p.hp = Math.max(0, p.hp - (en.isBoss ? 35 : 15));
                sound.playHit();
                eng.screenShake = 7;
                en.state = 'idle';

                if (p.hp <= 0) {
                  eng.isRunning = false;
                  setGameState('gameover');
                  sound.playGameOver();
                }
              }
            }
          }
        });

        // Clean dead enemies
        eng.enemies = eng.enemies.filter((en) => en.hp > 0);

        // Spawn next wave
        if (eng.enemies.length < 2 && eng.totalEnemiesSpawned < eng.maxStageEnemies) {
          const spawnCount = Math.min(3, eng.maxStageEnemies - eng.totalEnemiesSpawned);
          for (let i = 0; i < spawnCount; i++) {
            const isBossSpawn = eng.totalEnemiesSpawned === eng.maxStageEnemies - 1 && activeStage.hasBoss;
            const isGunner = !isBossSpawn && i === 1;

            eng.enemies.push({
              id: eng.nextEntityId++,
              isPlayer: false,
              name: isBossSpawn ? activeStage.bossName : (isGunner ? 'Syndicate Sniper' : `Cyber Thug ${eng.totalEnemiesSpawned + 1}`),
              x: p.x + 400 + i * 120,
              y: 240 + (i % 3) * 45,
              z: 0,
              vx: 0,
              vy: 0,
              vz: 0,
              facing: -1,
              hp: isBossSpawn ? 380 : (isGunner ? 80 : 100 + activeStageIndex * 25),
              maxHp: isBossSpawn ? 380 : (isGunner ? 80 : 100 + activeStageIndex * 25),
              state: 'idle',
              stateTimer: 0,
              comboStep: 0,
              comboResetTimer: 0,
              shootCooldown: 1.5,
              ammo: 10,
              maxAmmo: 10,
              color: isBossSpawn ? '#a855f7' : (isGunner ? '#f97316' : '#ef4444'),
              glowColor: isBossSpawn ? '#c084fc' : (isGunner ? '#facc15' : '#f87171'),
              isBoss: isBossSpawn,
              isGunner,
              aiTimer: 0.5,
              aiDecision: isGunner ? 'shoot' : 'chase',
            });
            eng.totalEnemiesSpawned++;

            if (isBossSpawn) {
              setHudBossHp(380);
              setHudBossName(activeStage.bossName);
            }
          }
        }

        // Check Stage Clear
        if (eng.enemies.length === 0 && eng.totalEnemiesSpawned >= eng.maxStageEnemies && !eng.isStageComplete) {
          eng.isStageComplete = true;
          eng.isRunning = false;
          setGameState('victory');

          const rewardCr = gameMode === 'campaign' ? activeStage.rewardCredits : 500;
          setCredits((c) => {
            const nc = c + rewardCr;
            localStorage.setItem('cyber_brawler_credits', nc.toString());
            return nc;
          });

          sound.playWin();
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        }

        // 5. ITEM PICKUPS
        eng.items.forEach((item) => {
          if (item.collected) return;
          item.pulseTimer += dt * 4;
          const dist = Math.hypot(p.x - item.x, p.y - item.y);

          if (dist < 40) {
            item.collected = true;
            if (item.type === 'health') {
              p.hp = Math.min(p.maxHp, p.hp + 70);
              sound.playPowerup();
              eng.floatingTexts.push({ id: eng.nextEntityId++, text: '🍜 +70 HP RESTORED', x: item.x, y: item.y - 20, color: '#22c55e', alpha: 1, scale: 1.3 });
            } else if (item.type === 'ammo') {
              p.ammo = Math.min(p.maxAmmo, p.ammo + 20);
              sound.playPowerup();
              setHudAmmo(p.ammo);
              eng.floatingTexts.push({ id: eng.nextEntityId++, text: '🔫 +20 AMMO PICKUP', x: item.x, y: item.y - 20, color: '#00f0ff', alpha: 1, scale: 1.3 });
            } else if (item.type === 'katana') {
              p.equippedWeapon = 'katana';
              sound.playPowerup();
              eng.floatingTexts.push({ id: eng.nextEntityId++, text: '⚔️ LASER KATANA EQUIPPED!', x: item.x, y: item.y - 25, color: '#00f0ff', alpha: 1, scale: 1.4 });
            } else if (item.type === 'credit') {
              setCredits((c) => {
                const nc = c + 40;
                localStorage.setItem('cyber_brawler_credits', nc.toString());
                return nc;
              });
              sound.playCollect();
              eng.floatingTexts.push({ id: eng.nextEntityId++, text: '+40 CR', x: item.x, y: item.y - 20, color: '#facc15', alpha: 1, scale: 1.2 });
            }
          }
        });
        eng.items = eng.items.filter((it) => !it.collected);

        // 6. CAMERA SMOOTH SCROLLING
        const targetCamX = p.x - canvas.width * 0.35;
        eng.cameraX += (targetCamX - eng.cameraX) * 5.0 * dt;
        eng.cameraX = Math.max(0, Math.min(eng.stageWidth - canvas.width, eng.cameraX));

        // 7. PARTICLES & TEXTS
        eng.particles.forEach((pt) => {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.z += pt.vz * dt;
          pt.alpha -= pt.decay * dt;
        });
        eng.particles = eng.particles.filter((pt) => pt.alpha > 0);

        eng.floatingTexts.forEach((ft) => {
          ft.y -= 26 * dt;
          ft.alpha -= 0.8 * dt;
        });
        eng.floatingTexts = eng.floatingTexts.filter((ft) => ft.alpha > 0);

        if (eng.screenShake > 0) {
          eng.screenShake = Math.max(0, eng.screenShake - dt * 25);
        }

        // Sync React HUD
        setHudHp(Math.round(p.hp));
        setHudMaxHp(p.maxHp);
        setHudAmmo(p.ammo);
        setHudSpecialEnergy(Math.round(eng.specialEnergy));
        setHudCombo(eng.comboCount);
        setHudScore(eng.score);
        setHudEnemiesLeft(Math.max(0, eng.maxStageEnemies - (eng.totalEnemiesSpawned - eng.enemies.length)));

        const boss = eng.enemies.find((e) => e.isBoss);
        if (boss) setHudBossHp(Math.round(boss.hp));
      }

      // ====================================================
      // 2.5D / 3D CANVAS RENDERING PASS
      // ====================================================
      const width = canvas.width;
      const height = canvas.height;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = '#0a0515';
      ctx.fillRect(0, 0, width, height);

      if (eng.screenShake > 0) {
        const sx = (Math.random() - 0.5) * eng.screenShake;
        const sy = (Math.random() - 0.5) * eng.screenShake;
        ctx.translate(sx, sy);
      }

      // Parallax City Wall
      ctx.save();
      ctx.translate(-eng.cameraX * 0.3, 0);
      ctx.fillStyle = '#120824';
      for (let i = 0; i < 15; i++) {
        ctx.fillRect(i * 220, 40, 180, 240);
        ctx.strokeStyle = activeStage.themeColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(i * 220, 40, 180, 240);
      }
      ctx.restore();

      // Gameplay Layer
      ctx.save();
      ctx.translate(-eng.cameraX, 0);

      // Ground Asphalt
      ctx.fillStyle = '#0d0718';
      ctx.fillRect(0, 220, eng.stageWidth, 220);
      ctx.strokeStyle = activeStage.themeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 220);
      ctx.lineTo(eng.stageWidth, 220);
      ctx.stroke();

      // --- A. Draw Breakables & Items ---
      eng.breakables.forEach((b) => {
        if (b.broken) return;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.fillStyle = b.type === 'barrel' ? '#f97316' : '#78350f';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.fillRect(-18, -28, 36, 28);
        ctx.strokeRect(-18, -28, 36, 28);
        ctx.restore();
      });

      eng.items.forEach((it) => {
        if (it.collected) return;
        ctx.save();
        ctx.translate(it.x, it.y + Math.sin(it.pulseTimer) * 3);
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.fillRect(-12, -12, 24, 24);
        ctx.strokeRect(-12, -12, 24, 24);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        const icon = it.type === 'health' ? '🍜' : (it.type === 'ammo' ? '🔫' : (it.type === 'katana' ? '⚔️' : '💎'));
        ctx.fillText(icon, 0, 4);
        ctx.restore();
      });

      // --- B. Draw Bullets ---
      eng.bullets.forEach((b) => {
        ctx.save();
        ctx.translate(b.x, b.y - b.z);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.glowColor;
        ctx.shadowBlur = 12;
        ctx.fillRect(-8, -2, 16, 4);
        ctx.restore();
      });

      // --- C. Draw Sorted Characters (Y-Depth Sorting) ---
      const allCharacters: CharacterEntity[] = [];
      if (p) allCharacters.push(p);
      eng.enemies.forEach((e) => allCharacters.push(e));
      allCharacters.sort((a, b) => a.y - b.y);

      allCharacters.forEach((char) => {
        ctx.save();
        ctx.translate(char.x, char.y - char.z);
        ctx.scale(char.facing, 1);

        // Ground Shadow
        ctx.save();
        ctx.translate(0, char.z);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 1. LEGS (Standing, Walking, or Kicking!)
        ctx.strokeStyle = char.color;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';

        if (char.state === 'kick' || char.state === 'jump_kick') {
          // EXTENDED HIGH KICK LEG WITH GLOW TRAIL!
          ctx.save();
          ctx.strokeStyle = '#facc15';
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(0, -20);
          ctx.lineTo(34, -22); // Horizontal high kick leg
          ctx.stroke();

          // Kick Blade/Boot Impact Flare
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(36, -22, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Supporting Back Leg
          ctx.beginPath();
          ctx.moveTo(-4, -20);
          ctx.lineTo(-8, 0);
          ctx.stroke();
        } else {
          // Normal Stance Legs
          ctx.beginPath();
          ctx.moveTo(-6, -20);
          ctx.lineTo(-10, 0);
          ctx.moveTo(6, -20);
          ctx.lineTo(10, 0);
          ctx.stroke();
        }

        // 2. TORSO
        ctx.fillStyle = char.color;
        ctx.strokeStyle = char.glowColor;
        ctx.lineWidth = 2;
        ctx.fillRect(-12, -50, 24, 30);
        ctx.strokeRect(-12, -50, 24, 30);

        // 3. HEAD & VISOR
        ctx.fillStyle = '#050b14';
        ctx.beginPath();
        ctx.arc(0, -62, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = char.glowColor;
        ctx.shadowColor = char.glowColor;
        ctx.shadowBlur = 8;
        ctx.fillRect(2, -65, 8, 4);

        // 4. ARMS & WEAPONS (Punching, Shooting, or Slicing)
        if (char.state === 'shoot') {
          // Gun Arm Aimed Forward
          ctx.strokeStyle = char.glowColor;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(8, -40);
          ctx.lineTo(24, -40);
          ctx.stroke();

          // Gun Pistol / Blaster
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(22, -43, 14, 6);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(34, -45, 4, 10);
        } else if (['punch1', 'punch2', 'punch3', 'dragon_punch'].includes(char.state)) {
          // Punching Fist
          ctx.strokeStyle = char.glowColor;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(8, -40);
          ctx.lineTo(28, -40);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(30, -40, char.state === 'dragon_punch' ? 14 : 7, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // HP bar above enemy
        if (!char.isPlayer) {
          ctx.save();
          ctx.translate(char.x, char.y - char.z - 80);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-16, -3, 32, 5);
          ctx.fillStyle = char.isBoss ? '#a855f7' : (char.isGunner ? '#f97316' : '#ef4444');
          ctx.fillRect(-16, -3, 32 * Math.max(0, char.hp / char.maxHp), 5);
          ctx.restore();
        }
      });

      // --- D. Draw Particles ---
      eng.particles.forEach((pt) => {
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - pt.z, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // --- E. Draw Floating Texts ---
      eng.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 14;
        ctx.font = `bold ${Math.round(18 * ft.scale)}px 'Impact', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();
      ctx.restore();

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [activeFighterId, activeStage, activeStageIndex, gameMode, gameState, playGunShotSound, playHitEffectSound, triggerDragonSpecial, triggerShootGun]);

  // ----------------------------------------------------
  // KEYBOARD HANDLERS
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = true;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.down = true;
      if (['KeyJ'].includes(e.code)) keysRef.current.punch = true;
      if (['KeyU'].includes(e.code)) keysRef.current.kick = true;
      if (['KeyH', 'KeyG', 'KeyF'].includes(e.code)) triggerShootGun();
      if (['KeyK', 'Space'].includes(e.code)) keysRef.current.jump = true;
      if (['KeyI', 'KeyL'].includes(e.code)) triggerDragonSpecial();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.down = false;
      if (['KeyJ'].includes(e.code)) keysRef.current.punch = false;
      if (['KeyU'].includes(e.code)) keysRef.current.kick = false;
      if (['KeyH', 'KeyG', 'KeyF'].includes(e.code)) keysRef.current.shoot = false;
      if (['KeyK', 'Space'].includes(e.code)) keysRef.current.jump = false;
      if (['KeyI', 'KeyL'].includes(e.code)) keysRef.current.special = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Direct Canvas Touch Navigation Handlers
  const touchStartRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

  const updateBrawlerTouch = (x: number, y: number, w: number, h: number) => {
    // Horizontal Move
    if (x < w * 0.42) {
      keysRef.current.left = true;
      keysRef.current.right = false;
    } else if (x > w * 0.58) {
      keysRef.current.right = true;
      keysRef.current.left = false;
    } else {
      keysRef.current.left = false;
      keysRef.current.right = false;
    }

    // Depth Move
    if (y < h * 0.45) {
      keysRef.current.up = true;
      keysRef.current.down = false;
    } else if (y > h * 0.65) {
      keysRef.current.down = true;
      keysRef.current.up = false;
    } else {
      keysRef.current.up = false;
      keysRef.current.down = false;
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    touchStartRef.current = { x: relX, y: relY, active: true };
    updateBrawlerTouch(relX, relY, rect.width, rect.height);
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!touchStartRef.current?.active || gameState !== 'playing') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    updateBrawlerTouch(relX, relY, rect.width, rect.height);
  };

  const handleCanvasTouchEnd = () => {
    touchStartRef.current = null;
    keysRef.current.left = false;
    keysRef.current.right = false;
    keysRef.current.up = false;
    keysRef.current.down = false;
  };

  // ----------------------------------------------------
  // RENDER JSX UI
  // ----------------------------------------------------
  return (
    <div className="w-full flex flex-col gap-2.5 select-none">
      {/* 3D Game Viewport Box (ONLY Game Visuals & Clean HUD) */}
      <div className="relative w-full h-[450px] sm:h-[500px] md:h-[540px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-rose-500/30 flex flex-col">
        {/* Background Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Top Header Floating Status Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-slate-950/90 to-transparent">
        {/* Credits Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/50 shadow-lg backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-black text-sm">{credits.toLocaleString()} CR</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-rose-500/40 text-rose-300 text-xs font-bold">
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            <span>ENEMIES: {hudEnemiesLeft}</span>
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
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-rose-400 border border-rose-500/30 transition shadow-md"
            title="Toggle Sound"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* IN-GAME ACTIVE HUD */}
      {gameState === 'playing' && (
        <div className="relative z-10 flex-1 flex flex-col justify-between p-4 pointer-events-none">
          {/* Top HUD Overlay */}
          <div className="flex items-start justify-between">
            {/* Fighter HP, Ammo & Special Meter */}
            <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-xl w-64">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span className="text-cyan-400 font-black">{activeFighter.name}</span>
                <span>{hudHp}/{hudMaxHp}</span>
              </div>
              {/* HP Bar */}
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-100"
                  style={{ width: `${Math.max(0, (hudHp / hudMaxHp) * 100)}%` }}
                />
              </div>
              {/* Ammo & Special Meters */}
              <div className="grid grid-cols-2 gap-2 mt-0.5">
                <div>
                  <div className="flex justify-between text-[10px] text-cyan-400 font-bold">
                    <span>AMMO</span>
                    <span>{hudAmmo}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${(hudAmmo / 30) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-purple-400 font-bold">
                    <span>SPECIAL</span>
                    <span>{hudSpecialEnergy}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${hudSpecialEnergy}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Score & Combo */}
            <div className="flex flex-col items-end gap-1 p-2.5 rounded-xl bg-slate-900/80 border border-amber-500/40 backdrop-blur-md shadow-xl">
              <div className="text-amber-300 font-mono text-xl font-black tracking-wider drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]">
                {hudScore.toLocaleString()}
              </div>
              {hudCombo > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-black border border-rose-500/40 text-xs animate-bounce">
                  {hudCombo}x COMBO!
                </span>
              )}
            </div>
          </div>

          {/* Boss HP Bar (If Boss Active) */}
          {hudBossHp !== null && (
            <div className="max-w-md mx-auto w-full p-2.5 rounded-2xl bg-slate-900/90 border-2 border-purple-500 shadow-2xl animate-pulse">
              <div className="flex justify-between text-xs font-black text-purple-300 mb-1">
                <span>⚠️ BOSS: {hudBossName}</span>
                <span>{hudBossHp} HP</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 to-purple-500 rounded-full"
                  style={{ width: `${Math.max(0, (hudBossHp / 380) * 100)}%` }}
                />
              </div>
            </div>
          )}

        </div>
      )}

      {/* Direct Interactive Touch Steering Layer on Game Canvas */}
      {gameState === 'playing' && (
        <div
          onTouchStart={handleCanvasTouchStart}
          onTouchMove={handleCanvasTouchMove}
          onTouchEnd={handleCanvasTouchEnd}
          onTouchCancel={handleCanvasTouchEnd}
          onMouseDown={handleCanvasTouchStart}
          onMouseMove={handleCanvasTouchMove}
          onMouseUp={handleCanvasTouchEnd}
          className="absolute inset-0 z-10 cursor-pointer touch-none"
          title="Touch & drag anywhere to move in street"
        />
      )}

      {/* MAIN MENU OVERLAY */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full flex flex-col items-center gap-6">
            {/* Glowing Logo */}
            <div className="flex flex-col items-center">
              <div className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-400 font-bold text-xs tracking-widest uppercase mb-2 flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                <Swords className="w-3.5 h-3.5 text-rose-400" />
                <span>MARTIAL ARTS & FIREARMS</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-rose-500 to-amber-400 drop-shadow-[0_0_25px_rgba(244,63,94,0.8)] font-sans">
                CYBER STREET BRAWLER
              </h1>
              <p className="text-slate-400 text-xs md:text-sm font-medium mt-1">
                Punches, high roundhouse kicks, gun blasters & dragon plasma waves!
              </p>
            </div>

            {/* Selected Fighter Display Banner */}
            <div className="w-full p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md border"
                  style={{ backgroundColor: activeFighter.color, borderColor: activeFighter.glowColor }}
                >
                  <Swords className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-white font-black text-sm">{activeFighter.name}</div>
                  <div className="text-cyan-400 text-xs font-bold">Kick: {activeFighter.kickDmg} DMG • Gun: {activeFighter.gunDmg} DMG</div>
                </div>
              </div>
              <button
                onClick={() => setGameState('dojo')}
                className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-cyan-300 font-bold text-xs transition flex items-center gap-1"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> DOJO ROSTER
              </button>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => startStage('campaign', 0)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-rose-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-lg tracking-wider transition shadow-[0_0_25px_rgba(244,63,94,0.7)] flex items-center justify-center gap-2 active:scale-98"
              >
                <Play className="w-6 h-6 fill-current" /> PLAY STORY CAMPAIGN
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setGameState('stages')}
                  className="py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Trophy className="w-4 h-4 text-amber-400" /> SELECT STAGES
                </button>

                <button
                  onClick={() => setGameState('instructions')}
                  className="py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <HelpCircle className="w-4 h-4 text-cyan-400" /> HOW TO PLAY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOJO / FIGHTERS SHOWROOM */}
      {gameState === 'dojo' && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">
                CYBER DOJO ROSTER
              </h2>
              <p className="text-xs text-slate-400">Unlock master martial artists and cybernetic champions</p>
            </div>
            <button
              onClick={() => setGameState('menu')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              BACK TO MENU
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {BRAWLER_FIGHTERS.map((fighter) => {
              const isUnlocked = unlockedFighterIds.includes(fighter.id);
              const isSelected = activeFighterId === fighter.id;
              const canAfford = credits >= fighter.price;

              return (
                <div
                  key={fighter.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                      : isUnlocked
                      ? 'bg-slate-900/80 border-slate-700/80'
                      : 'bg-slate-950/80 border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border-2"
                        style={{ backgroundColor: fighter.color, borderColor: fighter.glowColor }}
                      >
                        <Swords className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-black text-base">{fighter.name}</div>
                        <div className="text-xs text-slate-400">{fighter.description}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400 text-[10px] font-black">
                        SELECTED
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-300">
                    <div>HP: <span className="text-emerald-400">{fighter.maxHp}</span></div>
                    <div>Kick: <span className="text-amber-400">{fighter.kickDmg}</span></div>
                    <div>Gun: <span className="text-cyan-400">{fighter.gunDmg}</span></div>
                  </div>

                  {isUnlocked ? (
                    <button
                      onClick={() => {
                        setActiveFighterId(fighter.id);
                        localStorage.setItem('cyber_brawler_active_fighter', fighter.id);
                        sound.playClick();
                      }}
                      disabled={isSelected}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 cursor-default'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                      }`}
                    >
                      {isSelected ? 'SELECTED' : 'SELECT FIGHTER'}
                    </button>
                  ) : (
                    <button
                      onClick={() => buyFighter(fighter)}
                      disabled={!canAfford}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-lg'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>UNLOCK FOR {fighter.price} CR</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STAGE SELECT MODAL */}
      {gameState === 'stages' && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400">
                CAMPAIGN STAGES
              </h2>
              <p className="text-xs text-slate-400">Purge cyber street gangs and take down syndicate bosses</p>
            </div>
            <button
              onClick={() => setGameState('menu')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              BACK TO MENU
            </button>
          </div>

          <div className="flex flex-col gap-4 mt-6 max-w-lg mx-auto w-full">
            {BRAWLER_STAGES.map((stg, idx) => (
              <div
                key={stg.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-between gap-4 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center font-black text-rose-400">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{stg.title}</div>
                    <div className="text-xs text-slate-400">{stg.location} • Boss: {stg.bossName}</div>
                    <div className="text-xs font-bold text-amber-400 mt-0.5">Bounty: +{stg.rewardCredits} CR</div>
                  </div>
                </div>

                <button
                  onClick={() => startStage('campaign', idx)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black text-xs transition shadow-md whitespace-nowrap"
                >
                  FIGHT
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HOW TO PLAY MODAL */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h2 className="text-2xl font-black text-cyan-400">COMBAT BRIEFING & CONTROLS</h2>
            <button
              onClick={() => setGameState('menu')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              CLOSE
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm text-slate-300">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-cyan-400 font-bold text-base flex items-center gap-2">
                <Swords className="w-5 h-5" /> Desktop Controls
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li><strong className="text-white">[W, A, S, D]</strong> — Move & Shift Depth in Street</li>
                <li><strong className="text-white">[J]</strong> — Boxing Punch Combo (3-hit chain)</li>
                <li><strong className="text-white">[U]</strong> — High Roundhouse Kick (Heavy Knockback)</li>
                <li><strong className="text-white">[H] / [G]</strong> — Shoot Cyber Blaster Gun</li>
                <li><strong className="text-white">[K] / [SPACE]</strong> — Jump & Aerial Flying Kick</li>
                <li><strong className="text-white">[I] / [L]</strong> — Dragon Plasma Special Surge</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-amber-400 font-bold text-base flex items-center gap-2">
                <Trophy className="w-5 h-5" /> Brawler Combos & Tactics
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>• <strong>Kick Attacks:</strong> Roundhouse kicks hit multiple thugs in front and push them back!</li>
                <li>• <strong>Gun Blaster:</strong> Use your gun to pick off Syndicate Snipers from a safe distance.</li>
                <li>• <strong>Breakable Crates:</strong> Smash barrels to collect Ammo refills and Laser Katanas!</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY SCREEN */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full flex flex-col items-center gap-5 p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/40 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-600/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.6)]">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-3xl font-black text-white tracking-wider">STAGE CLEARED!</h2>
              <p className="text-xs text-slate-400 mt-1">You defeated the syndicate thugs and boss!</p>
            </div>

            {/* Reward */}
            <div className="w-full p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">STAGE BOUNTY</div>
              <div className="text-2xl font-black text-amber-400">+{activeStage.rewardCredits} CR</div>
            </div>

            <div className="w-full flex flex-col gap-2.5">
              {activeStageIndex < BRAWLER_STAGES.length - 1 ? (
                <button
                  onClick={() => startStage('campaign', activeStageIndex + 1)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm tracking-wider transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" /> NEXT STAGE
                </button>
              ) : (
                <button
                  onClick={() => startStage('campaign', 0)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm tracking-wider transition shadow-lg flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> REPLAY CAMPAIGN
                </button>
              )}

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

      {/* GAME OVER SCREEN */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full flex flex-col items-center gap-5 p-6 rounded-3xl bg-slate-900/90 border border-rose-500/40 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-600/20 border-2 border-rose-500 text-rose-400 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.6)]">
              <Skull className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-3xl font-black text-white tracking-wider">FIGHTER DOWN</h2>
              <p className="text-xs text-slate-400 mt-1">Overrun by syndicate gang brawlers!</p>
            </div>

            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={() => startStage(gameMode, activeStageIndex)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-slate-950 font-black text-sm tracking-wider transition shadow-lg flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> RETRY STAGE
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

      {/* EXTERNAL MOBILE ACTION CONTROL DECK (OUTSIDE GAME BOX) */}
      {gameState === 'playing' && (
        <div className="w-full p-3.5 bg-slate-900/95 border border-rose-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 shadow-xl backdrop-blur-md">
          {/* Touch Guidance */}
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Touch & drag on alley to move</span>
            <span className="sm:hidden">Touch alley to move</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Dragon Special */}
            <button
              onClick={triggerDragonSpecial}
              className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 active:scale-95 border border-cyan-400 text-white font-black text-xs transition shadow-md flex items-center gap-1"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>DRAGON</span>
            </button>

            {/* Jump */}
            <button
              onMouseDown={() => (keysRef.current.jump = true)}
              onMouseUp={() => (keysRef.current.jump = false)}
              onTouchStart={() => (keysRef.current.jump = true)}
              onTouchEnd={() => (keysRef.current.jump = false)}
              className="px-3.5 py-2.5 rounded-xl bg-purple-600 active:bg-purple-500 active:scale-95 border border-purple-400 text-white font-black text-xs transition shadow-md"
            >
              JUMP
            </button>

            {/* Shoot Gun */}
            <button
              onClick={triggerShootGun}
              className="px-3.5 py-2.5 rounded-xl bg-cyan-600 active:bg-cyan-500 active:scale-95 border border-cyan-400 text-white font-black text-xs transition shadow-md flex items-center gap-1"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>GUN</span>
            </button>

            {/* Kick */}
            <button
              onMouseDown={() => (keysRef.current.kick = true)}
              onMouseUp={() => (keysRef.current.kick = false)}
              onTouchStart={() => (keysRef.current.kick = true)}
              onTouchEnd={() => (keysRef.current.kick = false)}
              className="px-4 py-2.5 rounded-xl bg-amber-600 active:bg-amber-500 active:scale-95 border border-amber-400 text-white font-black text-xs transition shadow-[0_0_12px_rgba(245,158,11,0.5)]"
            >
              KICK
            </button>

            {/* Punch */}
            <button
              onMouseDown={() => (keysRef.current.punch = true)}
              onMouseUp={() => (keysRef.current.punch = false)}
              onTouchStart={() => (keysRef.current.punch = true)}
              onTouchEnd={() => (keysRef.current.punch = false)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 active:scale-95 border border-rose-300 text-white font-black text-xs transition shadow-[0_0_15px_rgba(244,63,94,0.7)]"
            >
              PUNCH
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
