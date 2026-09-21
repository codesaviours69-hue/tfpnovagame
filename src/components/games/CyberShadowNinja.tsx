import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Zap,
  Shield,
  Flame,
  Award,
  Crown,
  Sparkles,
  Swords,
  Target,
  ChevronRight,
  Heart,
  Radio,
  ShoppingBag,
  Coins,
  Pause,
  ArrowRight,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// --- GAME CONSTANTS ---
const V_WIDTH = 1200;
const V_HEIGHT = 700;
const GRAVITY = 0.62;

interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type?: 'normal' | 'wall' | 'scaffold' | 'hazard';
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
}

interface SlashEffect {
  x: number;
  y: number;
  facing: 1 | -1;
  step: number;
  color: string;
  alpha: number;
  radius: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  damage: number;
  isPlayer: boolean;
  isDeflected?: boolean;
  life: number;
  type?: 'shuriken' | 'laser' | 'shockwave' | 'boss_orb';
}

interface Enemy {
  id: number;
  type: 'drone' | 'samurai' | 'gunner' | 'boss';
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  color: string;
  attackTimer: number;
  stateTimer: number;
  isShielded?: boolean;
  isAttacking?: boolean;
  isGrounded?: boolean;
  telegraphTimer?: number;
  bossPhase?: number;
}

interface CyberCrate {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  type: 'health' | 'shuriken' | 'coins' | 'overdrive';
  isDestroyed?: boolean;
}

interface Pickup {
  id: number;
  x: number;
  y: number;
  vy: number;
  type: 'health' | 'shuriken' | 'coins' | 'overdrive';
  amount: number;
  life: number;
  collected?: boolean;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  size: number;
  vy: number;
}

interface GhostAfterimage {
  x: number;
  y: number;
  w: number;
  h: number;
  facing: 1 | -1;
  alpha: number;
  color: string;
  pose: number;
}

export const CyberShadowNinja: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // React UI States
  const [gameState, setGameState] = useState<'menu' | 'dojo' | 'playing' | 'paused' | 'gameover' | 'victory'>('menu');
  const [stage, setStage] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);
  const [hp, setHp] = useState<number>(100);
  const [maxHp, setMaxHp] = useState<number>(100);
  const [shurikens, setShurikens] = useState<number>(10);
  const [maxShurikens, setMaxShurikens] = useState<number>(10);
  const [comboCount, setComboCount] = useState<number>(0);
  const [comboRank, setComboRank] = useState<string>('D');
  const [overdriveTimer, setOverdriveTimer] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_ninja_highscore');
    return saved ? parseInt(saved, 10) : 15000;
  });
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Dojo Upgrades (Purchased with Cyber Coins)
  const [bladeLevel, setBladeLevel] = useState<number>(1);
  const [armorLevel, setArmorLevel] = useState<number>(1);
  const [dashLevel, setDashLevel] = useState<number>(1);
  const [shurikenLevel, setShurikenLevel] = useState<number>(1);
  const [parryLevel, setParryLevel] = useState<number>(1);

  // Reference to always have up-to-date state in game loop
  const stateRef = useRef({
    gameState: 'menu',
    bladeLevel: 1,
    armorLevel: 1,
    dashLevel: 1,
    shurikenLevel: 1,
    parryLevel: 1,
    stage: 1,
    score: 0,
    coins: 0,
    hp: 100,
    maxHp: 100,
    shurikens: 10,
    maxShurikens: 10,
    comboCount: 0,
    overdriveTimer: 0
  });

  useEffect(() => {
    stateRef.current = {
      gameState,
      bladeLevel,
      armorLevel,
      dashLevel,
      shurikenLevel,
      parryLevel,
      stage,
      score,
      coins,
      hp,
      maxHp,
      shurikens,
      maxShurikens,
      comboCount,
      overdriveTimer
    };
  }, [gameState, bladeLevel, armorLevel, dashLevel, shurikenLevel, parryLevel, stage, score, coins, hp, maxHp, shurikens, maxShurikens, comboCount, overdriveTimer]);

  // Engine Physics & Input Ref
  const engineRef = useRef<{
    player: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      w: number;
      h: number;
      facing: 1 | -1;
      isGrounded: boolean;
      isWallSliding: boolean;
      wallDir: 1 | -1;
      jumpCount: number;
      isDashing: boolean;
      dashTimer: number;
      dashCooldown: number;
      attackStep: number;
      attackTimer: number;
      invulnTimer: number;
      runAnimFrame: number;
      safeRespawnX: number;
      safeRespawnY: number;
      scarfPoints: { x: number; y: number }[];
    };
    platforms: Platform[];
    enemies: Enemy[];
    crates: CyberCrate[];
    pickups: Pickup[];
    projectiles: Projectile[];
    particles: Particle[];
    slashEffects: SlashEffect[];
    floatingTexts: FloatingText[];
    ghosts: GhostAfterimage[];
    keys: Record<string, boolean>;
    camX: number;
    camShake: number;
    hitStop: number;
    nextEnemyId: number;
    nextCrateId: number;
    nextPickupId: number;
    stageGoalX: number;
    bossActive: boolean;
    comboDecayTimer: number;
    bgCars: { x: number; y: number; speed: number; color: string; size: number }[];
    rainDrops: { x: number; y: number; vy: number; len: number }[];
  }>({
    player: {
      x: 100,
      y: 450,
      vx: 0,
      vy: 0,
      w: 32,
      h: 52,
      facing: 1,
      isGrounded: false,
      isWallSliding: false,
      wallDir: 1,
      jumpCount: 0,
      isDashing: false,
      dashTimer: 0,
      dashCooldown: 0,
      attackStep: 0,
      attackTimer: 0,
      invulnTimer: 0,
      runAnimFrame: 0,
      safeRespawnX: 100,
      safeRespawnY: 450,
      scarfPoints: []
    },
    platforms: [],
    enemies: [],
    crates: [],
    pickups: [],
    projectiles: [],
    particles: [],
    slashEffects: [],
    floatingTexts: [],
    ghosts: [],
    keys: {},
    camX: 0,
    camShake: 0,
    hitStop: 0,
    nextEnemyId: 1,
    nextCrateId: 1,
    nextPickupId: 1,
    stageGoalX: 3500,
    bossActive: false,
    comboDecayTimer: 0,
    bgCars: Array.from({ length: 12 }, () => ({
      x: Math.random() * 2400,
      y: Math.random() * 320 + 150,
      speed: (Math.random() * 3 + 2) * (Math.random() < 0.5 ? 1 : -1),
      color: ['#00f0ff', '#ff007f', '#ffe600', '#a855f7'][Math.floor(Math.random() * 4)],
      size: Math.random() * 25 + 20
    })),
    rainDrops: Array.from({ length: 60 }, () => ({
      x: Math.random() * V_WIDTH,
      y: Math.random() * V_HEIGHT,
      vy: Math.random() * 12 + 16,
      len: Math.random() * 18 + 12
    }))
  });

  // Toggle Sound
  const handleToggleSound = () => {
    const isNowMuted = sound.toggleMute();
    setMuted(isNowMuted);
  };

  // Spawn Particle Bursts
  const spawnSparks = (x: number, y: number, color: string, count: number = 18, speedMult: number = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 6 + 2) * speedMult;
      engineRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3.5 + 1.5,
        color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  };

  // Add Floating Text
  const addFloatingText = (x: number, y: number, text: string, color: string, size: number = 20) => {
    engineRef.current.floatingTexts.push({
      x,
      y,
      text,
      color,
      alpha: 1,
      size,
      vy: -2.2
    });
  };

  // Update Combo and calculate Rank
  const registerHit = (pts: number) => {
    setComboCount((prev) => {
      const nextCombo = prev + 1;
      engineRef.current.comboDecayTimer = 180; // 3 seconds to chain

      let rank = 'D';
      let multiplier = 1.0;
      if (nextCombo >= 25) {
        rank = 'SSS';
        multiplier = 3.0;
      } else if (nextCombo >= 18) {
        rank = 'S';
        multiplier = 2.5;
      } else if (nextCombo >= 12) {
        rank = 'A';
        multiplier = 2.0;
      } else if (nextCombo >= 6) {
        rank = 'B';
        multiplier = 1.5;
      } else if (nextCombo >= 3) {
        rank = 'C';
        multiplier = 1.2;
      }
      setComboRank(rank);

      const finalPts = Math.round(pts * multiplier);
      setScore((s) => {
        const nextScore = s + finalPts;
        if (nextScore > highScore) {
          setHighScore(nextScore);
          localStorage.setItem('novaplay_ninja_highscore', String(nextScore));
        }
        return nextScore;
      });

      return nextCombo;
    });
  };

  // Build Level Platforms, Rooftops, Crates & Enemies for a given Stage
  const buildStageLevel = (stageNum: number) => {
    const engine = engineRef.current;
    engine.platforms = [];
    engine.enemies = [];
    engine.crates = [];
    engine.pickups = [];
    engine.projectiles = [];
    engine.particles = [];
    engine.slashEffects = [];
    engine.floatingTexts = [];
    engine.ghosts = [];
    engine.nextEnemyId = 1;
    engine.nextCrateId = 1;
    engine.nextPickupId = 1;
    engine.bossActive = false;
    engine.comboDecayTimer = 0;

    // Reset Player position & safe coords
    engine.player.x = 100;
    engine.player.y = 440;
    engine.player.vx = 0;
    engine.player.vy = 0;
    engine.player.invulnTimer = 50;
    engine.player.safeRespawnX = 100;
    engine.player.safeRespawnY = 440;
    engine.player.scarfPoints = [];
    engine.camX = 0;

    const isBossStage = stageNum % 3 === 0;
    const stageLength = isBossStage ? 2000 : 3400 + stageNum * 450;
    engine.stageGoalX = stageLength;

    if (isBossStage) {
      // Boss Arena: Continuous huge rooftop platform with upper side scaffolds
      engine.platforms.push({
        x: 0,
        y: 540,
        w: 2400,
        h: 200,
        type: 'normal'
      });

      // Left & Right Wall Pillars for Wall Jumps
      engine.platforms.push({
        x: 50,
        y: 220,
        w: 40,
        h: 320,
        type: 'wall'
      });
      engine.platforms.push({
        x: 2150,
        y: 220,
        w: 40,
        h: 320,
        type: 'wall'
      });

      // Upper Scaffolds
      engine.platforms.push({
        x: 250,
        y: 390,
        w: 320,
        h: 18,
        type: 'scaffold'
      });
      engine.platforms.push({
        x: 1600,
        y: 390,
        w: 320,
        h: 18,
        type: 'scaffold'
      });
      engine.platforms.push({
        x: 900,
        y: 320,
        w: 400,
        h: 18,
        type: 'scaffold'
      });

      // Setup Boss
      engine.bossActive = true;
      const bossHp = 500 + stageNum * 200;
      engine.enemies.push({
        id: engine.nextEnemyId++,
        type: 'boss',
        x: 1400,
        y: 440,
        vx: 0,
        vy: 0,
        w: 76,
        h: 100,
        hp: bossHp,
        maxHp: bossHp,
        facing: -1,
        color: '#ff0055',
        attackTimer: 0,
        stateTimer: 0,
        bossPhase: 1
      });

      // Supply Crates in Boss Arena
      engine.crates.push({
        id: engine.nextCrateId++,
        x: 320,
        y: 350,
        w: 36,
        h: 36,
        hp: 20,
        type: 'health'
      });
      engine.crates.push({
        id: engine.nextCrateId++,
        x: 1750,
        y: 350,
        w: 36,
        h: 36,
        hp: 20,
        type: 'shuriken'
      });

      addFloatingText(700, 220, '⚠️ WARNING: CYBER RONIN PRIME TITAN ⚠️', '#ff0055', 32);
    } else {
      // Regular Stage Platform Generation
      let curX = 0;
      let prevPlatY = 500;

      while (curX < stageLength + 500) {
        const platWidth = curX === 0 ? 550 : Math.random() * 320 + 260;
        // Keep height variance manageable so jumps are always makeable
        const heightDelta = (Math.random() - 0.5) * 120;
        const platY = curX === 0 ? 500 : Math.max(380, Math.min(580, prevPlatY + heightDelta));
        prevPlatY = platY;
        const platH = 240;

        // Ground Platform
        engine.platforms.push({
          x: curX,
          y: platY,
          w: platWidth,
          h: platH,
          type: 'normal'
        });

        // Vertical Wall / Pillar for Wall Kicking
        if (Math.random() < 0.4 && curX > 400 && curX < stageLength - 300) {
          const wallX = curX + platWidth - 35;
          engine.platforms.push({
            x: wallX,
            y: platY - 170,
            w: 35,
            h: 170,
            type: 'wall'
          });
        }

        // Upper Floating Scaffold Platform (One-way jump through)
        if (Math.random() < 0.6 && curX > 200) {
          engine.platforms.push({
            x: curX + 50,
            y: platY - 130,
            w: platWidth - 100,
            h: 18,
            type: 'scaffold'
          });

          // Breakable Crates on scaffold or roof
          if (Math.random() < 0.7) {
            const lootTypes: ('health' | 'shuriken' | 'coins' | 'overdrive')[] = ['health', 'shuriken', 'coins', 'coins', 'overdrive'];
            const chosenLoot = lootTypes[Math.floor(Math.random() * lootTypes.length)];
            engine.crates.push({
              id: engine.nextCrateId++,
              x: curX + platWidth * 0.4,
              y: platY - 170,
              w: 36,
              h: 36,
              hp: 15,
              type: chosenLoot
            });
          }
        }

        // Spawn Enemies
        if (curX > 450 && curX < stageLength - 200) {
          // 1. Recon Flying Drone
          if (Math.random() < 0.6) {
            engine.enemies.push({
              id: engine.nextEnemyId++,
              type: 'drone',
              x: curX + platWidth * 0.5,
              y: platY - 140,
              vx: 0,
              vy: 0,
              w: 36,
              h: 36,
              hp: 30 + stageNum * 10,
              maxHp: 30 + stageNum * 10,
              facing: -1,
              color: '#00f0ff',
              attackTimer: Math.floor(Math.random() * 40),
              stateTimer: 0
            });
          }

          // 2. Cyber Ronin Samurai (Ground Patrol)
          if (Math.random() < 0.75) {
            engine.enemies.push({
              id: engine.nextEnemyId++,
              type: 'samurai',
              x: curX + platWidth * 0.65,
              y: platY - 54,
              vx: Math.random() < 0.5 ? 1.8 : -1.8,
              vy: 0,
              w: 38,
              h: 54,
              hp: 55 + stageNum * 15,
              maxHp: 55 + stageNum * 15,
              facing: -1,
              color: '#ff0055',
              attackTimer: 0,
              stateTimer: 0,
              isShielded: Math.random() < 0.4
            });
          }

          // 3. Cyber Gunner / Heavy Mech
          if (Math.random() < 0.4 && stageNum >= 2) {
            engine.enemies.push({
              id: engine.nextEnemyId++,
              type: 'gunner',
              x: curX + platWidth * 0.3,
              y: platY - 58,
              vx: 0,
              vy: 0,
              w: 44,
              h: 58,
              hp: 80 + stageNum * 20,
              maxHp: 80 + stageNum * 20,
              facing: -1,
              color: '#a855f7',
              attackTimer: 0,
              stateTimer: 0
            });
          }
        }

        // Gap spacing between platforms (Fair, jumpable gaps)
        const gapSize = Math.random() * 110 + 90;
        curX += platWidth + gapSize;
      }
    }
  };

  // Perform Katana Slash Attack Combo (1, 2, 3 Finisher)
  const triggerAttack = useCallback(() => {
    if (stateRef.current.gameState !== 'playing') return;
    const engine = engineRef.current;
    const player = engine.player;
    if (player.attackTimer > 0) return;

    sound.playLaser();
    player.attackStep = (player.attackStep % 3) + 1;
    player.attackTimer = player.attackStep === 3 ? 16 : 11;

    const bLvl = stateRef.current.bladeLevel;
    const isOverdrive = stateRef.current.overdriveTimer > 0;
    const slashReach = 85 + bLvl * 15 + (isOverdrive ? 25 : 0);
    const slashX = player.x + (player.facing === 1 ? player.w + 10 : -slashReach + 10);
    const slashY = player.y + player.h / 2;

    const slashColors = ['#00f0ff', '#a855f7', '#ff007f'];
    const chosenColor = isOverdrive ? '#ffe600' : slashColors[player.attackStep - 1];

    engine.slashEffects.push({
      x: slashX,
      y: slashY,
      facing: player.facing,
      step: player.attackStep,
      color: chosenColor,
      alpha: 1,
      radius: slashReach
    });

    // If 3rd Combo Finisher: Unleash Travelling Plasma Shockwave Projectile!
    if (player.attackStep === 3) {
      sound.playPowerup();
      engine.projectiles.push({
        x: player.x + (player.facing === 1 ? player.w + 15 : -15),
        y: player.y + player.h * 0.4,
        vx: player.facing * 16,
        vy: 0,
        radius: 18,
        color: '#ff007f',
        damage: (45 + bLvl * 18) * (isOverdrive ? 2 : 1),
        isPlayer: true,
        type: 'shockwave',
        life: 55
      });
      spawnSparks(player.x + (player.facing === 1 ? player.w : 0), player.y + player.h / 2, '#ff007f', 16);
    }

    // 1. Parry & Deflect Hostile Enemy Bullets
    const pLvl = stateRef.current.parryLevel;
    for (let i = engine.projectiles.length - 1; i >= 0; i--) {
      const proj = engine.projectiles[i];
      if (!proj.isPlayer) {
        const pDist = Math.hypot(proj.x - (player.x + player.w / 2), proj.y - (player.y + player.h / 2));
        if (pDist < slashReach + 35) {
          // Bullet Deflected directly towards nearest enemy or forward!
          proj.isPlayer = true;
          proj.isDeflected = true;
          proj.vx = player.facing * (16 + pLvl * 2);
          proj.vy = (Math.random() - 0.5) * 3;
          proj.color = '#00f0ff';
          proj.damage = (60 + pLvl * 25) * (isOverdrive ? 2 : 1);
          proj.life = 100;

          sound.playBullseyeThud();
          engine.hitStop = 6;
          engine.camShake = 16;
          spawnSparks(proj.x, proj.y, '#00f0ff', 24, 1.5);
          addFloatingText(proj.x, proj.y - 25, '⚡ PERFECT PARRY DEFLECT! ⚡', '#00f0ff', 26);
          registerHit(150);
        }
      }
    }

    // 2. Smash Breakable Crates
    engine.crates.forEach((crate) => {
      if (!crate.isDestroyed) {
        const cDist = Math.hypot(crate.x + crate.w / 2 - (player.x + player.w / 2), crate.y + crate.h / 2 - (player.y + player.h / 2));
        if (cDist < slashReach + crate.w / 2) {
          crate.hp -= 20;
          sound.playBottleShatter();
          spawnSparks(crate.x + crate.w / 2, crate.y + crate.h / 2, '#00f0ff', 14);

          if (crate.hp <= 0) {
            crate.isDestroyed = true;
            sound.playExplosion();
            spawnSparks(crate.x + crate.w / 2, crate.y + crate.h / 2, '#ffe600', 25);

            // Drop Pickup Item
            engine.pickups.push({
              id: engine.nextPickupId++,
              x: crate.x + crate.w / 2,
              y: crate.y + crate.h / 2,
              vy: -6,
              type: crate.type,
              amount: crate.type === 'coins' ? 20 : crate.type === 'shuriken' ? 6 : 35,
              life: 400
            });
          }
        }
      }
    });

    // 3. Slash & Damage Enemies in Arc
    const baseDmg = (35 + bLvl * 16) * (player.attackStep === 3 ? 2.0 : player.attackStep === 2 ? 1.3 : 1.0) * (isOverdrive ? 2.0 : 1.0);
    let hitAny = false;

    engine.enemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      const eCenterX = enemy.x + enemy.w / 2;
      const eCenterY = enemy.y + enemy.h / 2;
      const pCenterX = player.x + player.w / 2;
      const inFront = player.facing === 1 ? eCenterX > pCenterX - 25 : eCenterX < pCenterX + 25;
      const dist = Math.hypot(eCenterX - pCenterX, eCenterY - (player.y + player.h / 2));

      if (inFront && dist < slashReach + enemy.w / 2) {
        hitAny = true;
        let appliedDmg = baseDmg;

        // Break Shields with heavy attack or deal reduced damage
        if (enemy.isShielded) {
          if (player.attackStep === 3) {
            enemy.isShielded = false;
            appliedDmg *= 1.5;
            sound.playCrossbar();
            addFloatingText(eCenterX, enemy.y - 30, 'SHIELD BROKEN!', '#ffe600', 22);
            spawnSparks(eCenterX, eCenterY, '#ffe600', 20);
          } else {
            appliedDmg *= 0.35;
            sound.playHit();
          }
        }

        enemy.hp -= appliedDmg;
        enemy.vx = player.facing * (player.attackStep === 3 ? 9 : 5);
        enemy.vy = -3.5;
        spawnSparks(eCenterX, eCenterY, chosenColor, 22);

        engine.hitStop = player.attackStep === 3 ? 7 : 3;
        engine.camShake = player.attackStep === 3 ? 15 : 7;

        sound.playHit();
        registerHit(Math.round(appliedDmg * 8));
        addFloatingText(eCenterX, enemy.y - 15, `${Math.round(appliedDmg)}`, chosenColor, player.attackStep === 3 ? 26 : 20);

        // Enemy Destroyed
        if (enemy.hp <= 0) {
          sound.playExplosion();
          spawnSparks(eCenterX, eCenterY, '#ff0055', 35, 1.5);
          const earnedCoins = enemy.type === 'boss' ? 75 : enemy.type === 'gunner' ? 12 : 6;
          setCoins((c) => c + earnedCoins);

          // Small chance to drop health or ammo on enemy kill
          if (Math.random() < 0.35 && enemy.type !== 'boss') {
            engine.pickups.push({
              id: engine.nextPickupId++,
              x: eCenterX,
              y: eCenterY,
              vy: -5,
              type: Math.random() < 0.5 ? 'health' : 'shuriken',
              amount: 25,
              life: 350
            });
          }

          if (enemy.type === 'boss') {
            engine.bossActive = false;
            confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 } });
            sound.playWin();
            addFloatingText(eCenterX, enemy.y - 50, '⚡ BOSS DESTROYED! MISSION CLEAR ⚡', '#ffe600', 34);

            setTimeout(() => {
              setStage((st) => {
                const nextSt = st + 1;
                buildStageLevel(nextSt);
                return nextSt;
              });
            }, 2500);
          }
        }
      }
    });

    if (hitAny) {
      player.vx = player.facing * 4; // Step forward kinetic slice
    }
  }, [highScore]);

  // Perform Shadow Dash / Blink
  const triggerDash = useCallback(() => {
    if (stateRef.current.gameState !== 'playing') return;
    const engine = engineRef.current;
    const player = engine.player;
    if (player.dashCooldown > 0) return;

    sound.playJump();
    const dLvl = stateRef.current.dashLevel;
    player.isDashing = true;
    player.dashTimer = 18;
    player.dashCooldown = Math.max(22, 52 - dLvl * 8);
    player.invulnTimer = 22;
    player.vx = player.facing * (19 + dLvl * 2.5);
    player.vy = 0;

    spawnSparks(player.x + player.w / 2, player.y + player.h / 2, '#00f0ff', 20);

    // Create Afterimage Ghost
    engine.ghosts.push({
      x: player.x,
      y: player.y,
      w: player.w,
      h: player.h,
      facing: player.facing,
      alpha: 0.8,
      color: '#00f0ff',
      pose: player.runAnimFrame
    });
  }, []);

  // Throw Shuriken (With Piercing and Ammo Mastery)
  const triggerShuriken = useCallback(() => {
    if (stateRef.current.gameState !== 'playing') return;
    const engine = engineRef.current;
    const player = engine.player;
    const sLvl = stateRef.current.shurikenLevel;
    const isOverdrive = stateRef.current.overdriveTimer > 0;

    if (!isOverdrive && stateRef.current.shurikens <= 0) return;

    if (!isOverdrive) {
      setShurikens((s) => Math.max(0, s - 1));
    }
    sound.playLaser();

    const spreads = sLvl >= 3 ? [-0.15, -0.05, 0.05, 0.15] : [-0.1, 0, 0.1];
    spreads.forEach((offset) => {
      engine.projectiles.push({
        x: player.x + (player.facing === 1 ? player.w + 12 : -12),
        y: player.y + player.h * 0.4,
        vx: player.facing * (20 + sLvl * 2),
        vy: offset * 18,
        radius: 6,
        color: isOverdrive ? '#ffe600' : '#00f0ff',
        damage: (30 + sLvl * 10) * (isOverdrive ? 2 : 1),
        isPlayer: true,
        type: 'shuriken',
        life: 80
      });
    });
  }, []);

  // Player Jump / Double Jump / Wall Kick
  const triggerJump = useCallback(() => {
    if (stateRef.current.gameState !== 'playing') return;
    const engine = engineRef.current;
    const player = engine.player;

    if (player.isGrounded || player.jumpCount < 2) {
      sound.playJump();
      player.vy = -14.8;
      player.jumpCount++;
      player.isGrounded = false;
      player.isWallSliding = false;
      spawnSparks(player.x + player.w / 2, player.y + player.h, player.jumpCount === 2 ? '#a855f7' : '#00f0ff', 12);
    } else if (player.isWallSliding) {
      // Wall Kick Leap
      sound.playJump();
      player.vy = -14.5;
      player.vx = -player.wallDir * 12;
      player.facing = -player.wallDir as 1 | -1;
      player.isWallSliding = false;
      player.jumpCount = 1;
      spawnSparks(player.x + (player.wallDir === 1 ? player.w : 0), player.y + player.h / 2, '#ff007f', 16);
    }
  }, []);

  // Start / Restart Game
  const startGame = () => {
    buildStageLevel(1);
    setGameState('playing');
    setStage(1);
    setScore(0);
    const initialMaxHp = 100 + armorLevel * 25;
    const initialMaxStars = 10 + shurikenLevel * 3;
    setHp(initialMaxHp);
    setMaxHp(initialMaxHp);
    setShurikens(initialMaxStars);
    setMaxShurikens(initialMaxStars);
    setComboCount(0);
    setComboRank('D');
    setOverdriveTimer(0);
    sound.playWin();
  };

  // Keyboard Event Listeners with preventDefault for smooth platformer play
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code;

      // Prevent window scrolling on game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS'].includes(code)) {
        if (stateRef.current.gameState === 'playing') {
          e.preventDefault();
        }
      }

      const engine = engineRef.current;
      engine.keys[k] = true;
      engine.keys[code] = true;

      // Pause toggle (ESC or P)
      if (e.key === 'Escape' || k === 'p') {
        if (stateRef.current.gameState === 'playing') {
          setGameState('paused');
          sound.playClick();
        } else if (stateRef.current.gameState === 'paused') {
          setGameState('playing');
          sound.playClick();
        }
      }

      if (k === ' ' || code === 'KeyK' || k === 'arrowup' || k === 'w' || code === 'KeyW') {
        triggerJump();
      }
      if (k === 'j' || code === 'KeyJ' || k === 'z' || code === 'KeyZ') {
        triggerAttack();
      }
      if (k === 'l' || code === 'KeyL' || k === 'shift' || code === 'ShiftLeft' || code === 'ShiftRight' || k === 'c' || code === 'KeyC') {
        triggerDash();
      }
      if (k === 'u' || code === 'KeyU' || k === 'x' || code === 'KeyX' || k === 'e' || code === 'KeyE') {
        triggerShuriken();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code;
      const engine = engineRef.current;
      engine.keys[k] = false;
      engine.keys[code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerJump, triggerAttack, triggerDash, triggerShuriken]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animationId: number;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationId = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      if (canvas.width !== V_WIDTH || canvas.height !== V_HEIGHT) {
        canvas.width = V_WIDTH;
        canvas.height = V_HEIGHT;
      }

      const engine = engineRef.current;
      const player = engine.player;
      const currentGameState = stateRef.current.gameState;

      // HitStop freeze frames for combat impact
      if (engine.hitStop > 0) {
        engine.hitStop--;
        animationId = requestAnimationFrame(loop);
        return;
      }

      // --- GAME STATE PLAYING UPDATES ---
      if (currentGameState === 'playing') {
        // Timers
        if (player.dashCooldown > 0) player.dashCooldown--;
        if (player.dashTimer > 0) {
          player.dashTimer--;
          if (player.dashTimer === 0) player.isDashing = false;
        }
        if (player.attackTimer > 0) player.attackTimer--;
        if (player.invulnTimer > 0) player.invulnTimer--;

        // Overdrive Powerup Timer
        if (stateRef.current.overdriveTimer > 0) {
          setOverdriveTimer((t) => t - 1);
        }

        // Combo Decay Timer
        if (engine.comboDecayTimer > 0) {
          engine.comboDecayTimer--;
          if (engine.comboDecayTimer === 0) {
            setComboCount(0);
            setComboRank('D');
          }
        }

        // Horizontal Movement Input (WASD / Arrows)
        if (!player.isDashing) {
          let moveDir = 0;
          if (engine.keys['a'] || engine.keys['arrowleft'] || engine.keys['KeyA']) moveDir -= 1;
          if (engine.keys['d'] || engine.keys['arrowright'] || engine.keys['KeyD']) moveDir += 1;

          if (moveDir !== 0) {
            player.vx += moveDir * 1.35;
            player.facing = moveDir as 1 | -1;
            player.runAnimFrame = (player.runAnimFrame + 0.25) % Math.PI;
          } else {
            player.vx *= 0.82;
            player.runAnimFrame = 0;
          }
          player.vx = Math.max(-8.5, Math.min(8.5, player.vx));
        }

        // Apply Gravity
        if (!player.isDashing) {
          player.vy += GRAVITY;
          if (player.isWallSliding) {
            player.vy = Math.min(player.vy, 2.8); // Smooth wall sliding friction
          }
        }

        // 1. Move Player X and check Horizontal Collisions
        player.x += player.vx;
        player.isWallSliding = false;

        engine.platforms.forEach((plat) => {
          if (plat.type === 'scaffold') return; // One-way scaffolds ignore horizontal collision

          const isOverlapping =
            player.x < plat.x + plat.w &&
            player.x + player.w > plat.x &&
            player.y + 8 < plat.y + plat.h &&
            player.y + player.h - 8 > plat.y;

          if (isOverlapping) {
            if (player.vx > 0) {
              player.x = plat.x - player.w;
              if (!player.isGrounded && plat.type === 'wall') {
                player.isWallSliding = true;
                player.wallDir = 1;
              }
            } else if (player.vx < 0) {
              player.x = plat.x + plat.w;
              if (!player.isGrounded && plat.type === 'wall') {
                player.isWallSliding = true;
                player.wallDir = -1;
              }
            }
            player.vx = 0;
          }
        });

        // 2. Move Player Y and check Vertical Collisions
        const prevY = player.y;
        player.y += player.vy;
        player.isGrounded = false;

        engine.platforms.forEach((plat) => {
          if (plat.type === 'scaffold') {
            // One-way jump-through: only land when falling down from above top edge
            if (
              player.vy >= 0 &&
              prevY + player.h <= plat.y + 6 &&
              player.y + player.h >= plat.y &&
              player.x + player.w > plat.x + 4 &&
              player.x < plat.x + plat.w - 4
            ) {
              player.y = plat.y - player.h;
              player.vy = 0;
              player.isGrounded = true;
              player.jumpCount = 0;
            }
            return;
          }

          const isOverlapping =
            player.x < plat.x + plat.w &&
            player.x + player.w > plat.x &&
            player.y < plat.y + plat.h &&
            player.y + player.h > plat.y;

          if (isOverlapping) {
            if (player.vy > 0) {
              player.y = plat.y - player.h;
              player.vy = 0;
              player.isGrounded = true;
              player.jumpCount = 0;

              // Save safe platform coordinate for safe respawn
              if (plat.w >= 100) {
                player.safeRespawnX = Math.max(plat.x + 30, Math.min(plat.x + plat.w - 50, player.x));
                player.safeRespawnY = plat.y - player.h - 5;
              }
            } else if (player.vy < 0) {
              player.y = plat.y + plat.h;
              player.vy = 0;
            }
          }
        });

        // Fall into Pit / Safe Ground Respawn
        if (player.y > V_HEIGHT + 120) {
          sound.playHit();
          spawnSparks(player.x, V_HEIGHT - 20, '#ff0055', 25);

          setHp((h) => {
            const next = h - 35;
            if (next <= 0) {
              setGameState('gameover');
              sound.playGameOver();
            } else {
              // Safely respawn player on last grounded solid platform
              player.x = player.safeRespawnX;
              player.y = player.safeRespawnY;
              player.vx = 0;
              player.vy = 0;
              player.invulnTimer = 60;
              addFloatingText(player.x, player.y - 30, '⚠️ RESPAWNED ON ROOFTOP', '#ff0055', 22);
            }
            return Math.max(0, next);
          });
        }

        // Update Scarf Trail
        player.scarfPoints.unshift({
          x: player.x + (player.facing === 1 ? 4 : player.w - 4),
          y: player.y + 14
        });
        if (player.scarfPoints.length > 12) player.scarfPoints.pop();

        // 3. Update Pickups & Magnetize towards player
        for (let i = engine.pickups.length - 1; i >= 0; i--) {
          const item = engine.pickups[i];
          item.life--;
          item.vy += 0.3;
          item.y += item.vy;

          // Simple bounce on ground
          engine.platforms.forEach((plat) => {
            if (item.x > plat.x && item.x < plat.x + plat.w && item.y >= plat.y - 12 && item.y <= plat.y + 15) {
              item.y = plat.y - 12;
              item.vy = 0;
            }
          });

          // Magnetize to player
          const distToPlayer = Math.hypot(player.x + player.w / 2 - item.x, player.y + player.h / 2 - item.y);
          if (distToPlayer < 120) {
            item.x += (player.x + player.w / 2 - item.x) * 0.15;
            item.y += (player.y + player.h / 2 - item.y) * 0.15;
          }

          // Collection Collision
          if (distToPlayer < 35) {
            sound.playCollect();
            spawnSparks(item.x, item.y, '#00f0ff', 14);

            if (item.type === 'health') {
              setHp((h) => Math.min(stateRef.current.maxHp, h + item.amount));
              addFloatingText(item.x, item.y - 20, `+${item.amount} HP`, '#10b981', 22);
            } else if (item.type === 'shuriken') {
              setShurikens((s) => Math.min(stateRef.current.maxShurikens, s + item.amount));
              addFloatingText(item.x, item.y - 20, `+${item.amount} SHURIKENS`, '#00f0ff', 22);
            } else if (item.type === 'coins') {
              setCoins((c) => c + item.amount);
              addFloatingText(item.x, item.y - 20, `+${item.amount} COINS`, '#ffe600', 22);
            } else if (item.type === 'overdrive') {
              setOverdriveTimer(360); // 6 seconds overdrive
              sound.playPowerup();
              addFloatingText(item.x, item.y - 30, '⚡ OVERDRIVE ACTIVATED! ⚡', '#ffe600', 28);
            }

            engine.pickups.splice(i, 1);
            continue;
          }

          if (item.life <= 0) {
            engine.pickups.splice(i, 1);
          }
        }

        // 4. Update Projectiles
        for (let i = engine.projectiles.length - 1; i >= 0; i--) {
          const proj = engine.projectiles[i];
          proj.x += proj.vx;
          proj.y += proj.vy;
          proj.life--;

          if (proj.life <= 0) {
            engine.projectiles.splice(i, 1);
            continue;
          }

          if (proj.isPlayer) {
            // Player projectiles hitting enemies
            for (let j = engine.enemies.length - 1; j >= 0; j--) {
              const en = engine.enemies[j];
              if (en.hp <= 0) continue;

              if (
                proj.x > en.x &&
                proj.x < en.x + en.w &&
                proj.y > en.y &&
                proj.y < en.y + en.h
              ) {
                en.hp -= proj.damage;
                spawnSparks(proj.x, proj.y, proj.color, 14);
                sound.playHit();
                registerHit(Math.round(proj.damage * 6));
                addFloatingText(en.x + en.w / 2, en.y - 15, `${Math.round(proj.damage)}`, proj.color, 20);

                if (proj.type !== 'shockwave') {
                  engine.projectiles.splice(i, 1);
                }

                if (en.hp <= 0) {
                  sound.playExplosion();
                  spawnSparks(en.x + en.w / 2, en.y + en.h / 2, '#ff0055', 28);
                  setCoins((c) => c + (en.type === 'boss' ? 75 : en.type === 'gunner' ? 12 : 6));

                  if (en.type === 'boss') {
                    engine.bossActive = false;
                    confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 } });
                    sound.playWin();
                    addFloatingText(en.x, en.y - 50, '⚡ BOSS DESTROYED! MISSION CLEAR ⚡', '#ffe600', 34);
                    setTimeout(() => {
                      setStage((st) => {
                        const nextSt = st + 1;
                        buildStageLevel(nextSt);
                        return nextSt;
                      });
                    }, 2500);
                  }
                }
                break;
              }
            }
          } else {
            // Hostile enemy projectile hitting player
            if (
              proj.x > player.x &&
              proj.x < player.x + player.w &&
              proj.y > player.y &&
              proj.y < player.y + player.h &&
              player.invulnTimer <= 0 &&
              !player.isDashing
            ) {
              engine.projectiles.splice(i, 1);
              sound.playHit();
              player.invulnTimer = 45;
              engine.camShake = 16;
              spawnSparks(player.x + player.w / 2, player.y + player.h / 2, '#ff0055', 20);

              setHp((h) => {
                const next = h - proj.damage;
                if (next <= 0) {
                  setGameState('gameover');
                  sound.playGameOver();
                }
                return Math.max(0, next);
              });
            }
          }
        }

        // 5. Update Enemies & Active AI
        for (let i = engine.enemies.length - 1; i >= 0; i--) {
          const en = engine.enemies[i];
          if (en.hp <= 0 && en.type !== 'boss') {
            engine.enemies.splice(i, 1);
            continue;
          }

          const distToPlayer = Math.hypot(player.x - en.x, player.y - en.y);
          en.facing = player.x > en.x ? 1 : -1;

          if (en.type === 'drone') {
            // Hovering Sinusoidal Motion
            en.stateTimer++;
            en.y += Math.sin(en.stateTimer * 0.06) * 1.1;
            en.attackTimer++;

            // Telegraph charging laser line before firing
            if (en.attackTimer > 95 && distToPlayer < 700) {
              en.telegraphTimer = 20;
            }

            if (en.attackTimer > 120 && distToPlayer < 700) {
              en.attackTimer = 0;
              en.telegraphTimer = 0;
              const angle = Math.atan2(
                player.y + player.h / 2 - (en.y + en.h / 2),
                player.x + player.w / 2 - (en.x + en.w / 2)
              );
              engine.projectiles.push({
                x: en.x + en.w / 2,
                y: en.y + en.h / 2,
                vx: Math.cos(angle) * 7.5,
                vy: Math.sin(angle) * 7.5,
                radius: 6,
                color: '#ff0055',
                damage: 18,
                isPlayer: false,
                life: 95
              });
              sound.playLaser();
            }
          } else if (en.type === 'samurai') {
            // Ground Patrol & Leap Strike
            en.stateTimer++;
            en.vy += GRAVITY;
            en.y += en.vy;

            // Patrol on Platform
            let grounded = false;
            engine.platforms.forEach((plat) => {
              if (
                en.x + en.w > plat.x &&
                en.x < plat.x + plat.w &&
                en.y + en.h >= plat.y &&
                en.y + en.h <= plat.y + 20
              ) {
                en.y = plat.y - en.h;
                en.vy = 0;
                grounded = true;
              }
            });
            en.isGrounded = grounded;

            if (distToPlayer < 400) {
              // Chase player
              en.vx = en.facing * 2.6;
              en.attackTimer++;

              // Leap Slash Attack
              if (distToPlayer < 100 && en.attackTimer > 70 && en.isGrounded) {
                en.attackTimer = 0;
                en.vy = -7.5;
                en.vx = en.facing * 6;
                sound.playLaser();
              }

              // Contact damage
              if (distToPlayer < 48 && player.invulnTimer <= 0 && !player.isDashing) {
                sound.playHit();
                player.invulnTimer = 45;
                engine.camShake = 12;
                spawnSparks(player.x + player.w / 2, player.y + player.h / 2, '#ff0055', 16);
                setHp((h) => {
                  const next = h - 22;
                  if (next <= 0) {
                    setGameState('gameover');
                    sound.playGameOver();
                  }
                  return Math.max(0, next);
                });
              }
            } else {
              // Gentle back and forth patrol
              if (en.stateTimer % 120 === 0) en.vx = -en.vx;
            }
            en.x += en.vx;
          } else if (en.type === 'gunner') {
            // Heavy Mech: Fires rapid 2-round bursts
            en.attackTimer++;
            if (en.attackTimer > 100 && distToPlayer < 750) {
              en.attackTimer = 0;
              [0, 150].forEach((delay) => {
                setTimeout(() => {
                  if (en.hp > 0 && currentGameState === 'playing') {
                    const angle = Math.atan2(player.y - en.y, player.x - en.x);
                    engine.projectiles.push({
                      x: en.x + (en.facing === 1 ? en.w : 0),
                      y: en.y + en.h * 0.35,
                      vx: Math.cos(angle) * 9.5,
                      vy: Math.sin(angle) * 9.5,
                      radius: 7,
                      color: '#a855f7',
                      damage: 22,
                      isPlayer: false,
                      life: 90
                    });
                    sound.playLaser();
                  }
                }, delay);
              });
            }
          } else if (en.type === 'boss') {
            // Boss Multi-Phase Attacks
            if (en.hp <= 0) continue;
            en.stateTimer++;
            en.attackTimer++;

            // Phase transition based on HP
            const hpRatio = en.hp / en.maxHp;
            en.bossPhase = hpRatio < 0.35 ? 3 : hpRatio < 0.7 ? 2 : 1;

            // Phase 1: 3-Way Laser Barrage & Hover Leap
            if (en.bossPhase === 1 && en.attackTimer > 85) {
              en.attackTimer = 0;
              [-0.25, 0, 0.25].forEach((offset) => {
                const angle = Math.atan2(player.y - en.y, player.x - en.x) + offset;
                engine.projectiles.push({
                  x: en.x + en.w / 2,
                  y: en.y + en.h / 2,
                  vx: Math.cos(angle) * 8.5,
                  vy: Math.sin(angle) * 8.5,
                  radius: 8,
                  color: '#ff0055',
                  damage: 24,
                  isPlayer: false,
                  life: 120
                });
              });
              sound.playLaser();
            }

            // Phase 2: Rotating Blade Storm & Rapid Fire
            if (en.bossPhase === 2 && en.attackTimer > 65) {
              en.attackTimer = 0;
              [-0.35, -0.15, 0.15, 0.35].forEach((offset) => {
                const angle = Math.atan2(player.y - en.y, player.x - en.x) + offset;
                engine.projectiles.push({
                  x: en.x + en.w / 2,
                  y: en.y + en.h / 2,
                  vx: Math.cos(angle) * 9.5,
                  vy: Math.sin(angle) * 9.5,
                  radius: 9,
                  color: '#a855f7',
                  damage: 26,
                  isPlayer: false,
                  life: 130
                });
              });
              sound.playLaser();
            }

            // Phase 3: Overdrive Rage 6-Way Bullet Hell & Ground Slam
            if (en.bossPhase === 3 && en.attackTimer > 50) {
              en.attackTimer = 0;
              [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].forEach((offset) => {
                const angle = Math.atan2(player.y - en.y, player.x - en.x) + offset;
                engine.projectiles.push({
                  x: en.x + en.w / 2,
                  y: en.y + en.h / 2,
                  vx: Math.cos(angle) * 10,
                  vy: Math.sin(angle) * 10,
                  radius: 10,
                  color: '#ffe600',
                  damage: 28,
                  isPlayer: false,
                  life: 140
                });
              });
              sound.playLaser();
            }
          }
        }

        // 6. Stage Goal Check (Reach Neon Warp Gate)
        if (player.x >= engine.stageGoalX && !engine.bossActive) {
          confetti({ particleCount: 90, spread: 85, origin: { y: 0.55 } });
          sound.playWin();
          addFloatingText(player.x, player.y - 45, `STAGE ${stateRef.current.stage} COMPLETED!`, '#00f0ff', 30);
          setStage((s) => {
            const next = s + 1;
            buildStageLevel(next);
            return next;
          });
        }

        // Camera Follows Player with look-ahead
        const targetCamX = player.x - V_WIDTH * 0.35 + player.facing * 40;
        engine.camX += (targetCamX - engine.camX) * 0.12;
      }

      // Particles, Ghosts & Slashes Decay
      for (let i = engine.particles.length - 1; i >= 0; i--) {
        const pt = engine.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= pt.decay;
        if (pt.alpha <= 0) engine.particles.splice(i, 1);
      }

      for (let i = engine.slashEffects.length - 1; i >= 0; i--) {
        const sl = engine.slashEffects[i];
        sl.alpha -= 0.09;
        if (sl.alpha <= 0) engine.slashEffects.splice(i, 1);
      }

      for (let i = engine.ghosts.length - 1; i >= 0; i--) {
        const gh = engine.ghosts[i];
        gh.alpha -= 0.05;
        if (gh.alpha <= 0) engine.ghosts.splice(i, 1);
      }

      for (let i = engine.floatingTexts.length - 1; i >= 0; i--) {
        const ft = engine.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) engine.floatingTexts.splice(i, 1);
      }

      // Camera Shake decay
      if (engine.camShake > 0) engine.camShake *= 0.88;

      // Update background hovercars & rain
      engine.bgCars.forEach((car) => {
        car.x += car.speed;
        if (car.speed > 0 && car.x > 3600) car.x = -400;
        if (car.speed < 0 && car.x < -400) car.x = 3600;
      });

      engine.rainDrops.forEach((drop) => {
        drop.y += drop.vy;
        if (drop.y > V_HEIGHT) {
          drop.y = -20;
          drop.x = Math.random() * V_WIDTH;
        }
      });

      // ==========================================
      // --- RENDER PASS (Cyberpunk 2D Canvas) ---
      // ==========================================
      ctx.save();

      // Screen Shake
      if (engine.camShake > 0.4) {
        ctx.translate((Math.random() - 0.5) * engine.camShake, (Math.random() - 0.5) * engine.camShake);
      }

      // Background Sky & Deep Cyber Night
      const bgGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
      bgGrad.addColorStop(0, '#030014');
      bgGrad.addColorStop(0.5, '#0b0422');
      bgGrad.addColorStop(1, '#160838');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      // Parallax Skyscraper Silhouettes (Layer 1: Far)
      ctx.fillStyle = '#0a031f';
      for (let b = 0; b < 18; b++) {
        const bx = b * 140 - (engine.camX * 0.12) % 140;
        const bh = 240 + (b % 5) * 50;
        ctx.fillRect(bx, V_HEIGHT - bh, 100, bh);
      }

      // Parallax Skyscraper Silhouettes with Neon Grids (Layer 2: Mid)
      for (let b = 0; b < 16; b++) {
        const bx = b * 180 - (engine.camX * 0.25) % 180;
        const bh = 320 + (b % 4) * 60;
        ctx.fillStyle = '#0f062e';
        ctx.fillRect(bx, V_HEIGHT - bh, 130, bh);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, V_HEIGHT - bh, 130, bh);

        // Window lights
        ctx.fillStyle = (b % 2 === 0 ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 0, 127, 0.15)');
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 3; col++) {
            ctx.fillRect(bx + 16 + col * 36, V_HEIGHT - bh + 30 + row * 45, 20, 25);
          }
        }
      }

      // Flying Background Traffic Hovercars
      engine.bgCars.forEach((car) => {
        const relX = car.x - engine.camX * 0.25;
        ctx.save();
        ctx.fillStyle = car.color;
        ctx.shadowColor = car.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(relX, car.y, car.size, 6);
        ctx.restore();
      });

      // Neon Rain streaks
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      engine.rainDrops.forEach((drop) => {
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 3, drop.y + drop.len);
      });
      ctx.stroke();

      // ==========================================
      // --- WORLD SPACE (Camera Translated) ---
      // ==========================================
      ctx.save();
      ctx.translate(-engine.camX, 0);

      // Draw Platforms & Rooftops
      engine.platforms.forEach((plat) => {
        if (plat.type === 'scaffold') {
          // Floating High-tech Scaffold
          ctx.fillStyle = '#1e1045';
          ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

          // Glowing Top Rail
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(plat.x, plat.y);
          ctx.lineTo(plat.x + plat.w, plat.y);
          ctx.stroke();
        } else if (plat.type === 'wall') {
          // Vertical Wall / Pillar
          ctx.fillStyle = '#0d0526';
          ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

          ctx.strokeStyle = '#ff007f';
          ctx.lineWidth = 3;
          ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

          // Wall Grip Warning Stripes
          ctx.fillStyle = 'rgba(255, 0, 127, 0.25)';
          for (let sy = 0; sy < plat.h; sy += 30) {
            ctx.fillRect(plat.x, plat.y + sy, plat.w, 14);
          }
        } else {
          // Solid Rooftop Platform
          ctx.fillStyle = '#0d0628';
          ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

          ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

          // Neon Edge Top Light
          ctx.strokeStyle = '#ff007f';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#ff007f';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(plat.x, plat.y);
          ctx.lineTo(plat.x + plat.w, plat.y);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Stage Goal Neon Gate
      if (!engine.bossActive) {
        const goalX = engine.stageGoalX;
        ctx.save();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 25;
        ctx.strokeRect(goalX - 20, 260, 40, 240);

        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.fillRect(goalX - 20, 260, 40, 240);

        ctx.fillStyle = '#00f0ff';
        ctx.font = '900 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('STAGE GATE', goalX, 240);
        ctx.restore();
      }

      // Draw Breakable Cyber Crates
      engine.crates.forEach((crate) => {
        if (!crate.isDestroyed) {
          ctx.save();
          ctx.translate(crate.x, crate.y);
          ctx.fillStyle = '#1e1442';
          ctx.fillRect(0, 0, crate.w, crate.h);

          ctx.strokeStyle = crate.type === 'health' ? '#10b981' : crate.type === 'shuriken' ? '#00f0ff' : crate.type === 'overdrive' ? '#ff0055' : '#ffe600';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 10;
          ctx.strokeRect(0, 0, crate.w, crate.h);

          // Icon inside crate
          ctx.fillStyle = ctx.strokeStyle;
          ctx.font = '900 14px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(crate.type === 'health' ? '✚' : crate.type === 'shuriken' ? '★' : crate.type === 'overdrive' ? '⚡' : '◆', crate.w / 2, crate.h / 2 + 5);
          ctx.restore();
        }
      });

      // Draw Pickups
      engine.pickups.forEach((item) => {
        ctx.save();
        ctx.translate(item.x, item.y);
        const itemColor = item.type === 'health' ? '#10b981' : item.type === 'shuriken' ? '#00f0ff' : item.type === 'overdrive' ? '#ff007f' : '#ffe600';

        ctx.fillStyle = itemColor;
        ctx.shadowColor = itemColor;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.type === 'health' ? 'HP' : item.type === 'shuriken' ? '★' : item.type === 'overdrive' ? '⚡' : '$', 0, 4);
        ctx.restore();
      });

      // Draw Dash Afterimage Ghosts
      engine.ghosts.forEach((gh) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, gh.alpha);
        ctx.fillStyle = gh.color;
        ctx.shadowColor = gh.color;
        ctx.shadowBlur = 14;
        ctx.fillRect(gh.x, gh.y, gh.w, gh.h);
        ctx.restore();
      });

      // Draw Enemies
      engine.enemies.forEach((en) => {
        if (en.hp <= 0) return;
        ctx.save();
        ctx.translate(en.x, en.y);
        ctx.shadowColor = en.color;
        ctx.shadowBlur = 14;

        if (en.type === 'drone') {
          // Drone Body
          ctx.fillStyle = '#1e1b4b';
          ctx.strokeStyle = en.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(en.w / 2, en.h / 2, en.w / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Glowing Drone Eye
          ctx.fillStyle = en.telegraphTimer && en.telegraphTimer > 0 ? '#ffe600' : '#ff0055';
          ctx.beginPath();
          ctx.arc(en.w / 2 + en.facing * 6, en.h / 2, 5, 0, Math.PI * 2);
          ctx.fill();

          // Laser Sight Telegraph Line
          if (en.telegraphTimer && en.telegraphTimer > 0) {
            ctx.restore();
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(en.x + en.w / 2, en.y + en.h / 2);
            ctx.lineTo(player.x + player.w / 2, player.y + player.h / 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
            ctx.save();
            ctx.translate(en.x, en.y);
          }
        } else if (en.type === 'samurai' || en.type === 'gunner' || en.type === 'boss') {
          // Cyber Ronin / Boss Armor
          ctx.fillStyle = '#140c2e';
          ctx.strokeStyle = en.color;
          ctx.lineWidth = 2.5;
          ctx.fillRect(0, 0, en.w, en.h);
          ctx.strokeRect(0, 0, en.w, en.h);

          // Glowing Visor
          ctx.fillStyle = en.type === 'boss' ? '#ffe600' : '#facc15';
          ctx.fillRect(en.facing === 1 ? en.w - 14 : 2, 10, 12, 6);

          // Energy Shield
          if (en.isShielded) {
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 12;
            ctx.strokeRect(en.facing === 1 ? en.w + 2 : -10, 4, 8, en.h - 8);
          }

          // Enemy Katana / Gun
          ctx.strokeStyle = '#ff0055';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(en.facing === 1 ? en.w : 0, en.h * 0.5);
          ctx.lineTo(en.facing === 1 ? en.w + 24 : -24, en.h * 0.4);
          ctx.stroke();
        }

        // Enemy Health Bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, -12, en.w, 6);
        ctx.fillStyle = en.color;
        ctx.fillRect(0, -12, Math.max(0, (en.hp / en.maxHp) * en.w), 6);

        ctx.restore();
      });

      // Draw Projectiles
      engine.projectiles.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;

        if (p.type === 'shockwave') {
          // Crescent Shockwave Wave
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, -Math.PI * 0.35, Math.PI * 0.35);
          ctx.stroke();
        } else if (p.type === 'shuriken') {
          // 4-Point Ninja Star
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((Date.now() / 40) % (Math.PI * 2));
          ctx.fillRect(-p.radius, -2, p.radius * 2, 4);
          ctx.fillRect(-2, -p.radius, 4, p.radius * 2);
          ctx.restore();
        } else {
          // Laser Plasma Pellet
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Katana Slash Arc Effects
      engine.slashEffects.forEach((sl) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sl.alpha);
        ctx.strokeStyle = sl.color;
        ctx.lineWidth = 5;
        ctx.shadowColor = sl.color;
        ctx.shadowBlur = 20;

        ctx.beginPath();
        if (sl.facing === 1) {
          ctx.arc(sl.x - 20, sl.y, sl.radius, -Math.PI * 0.45, Math.PI * 0.45);
        } else {
          ctx.arc(sl.x + 20, sl.y, sl.radius, Math.PI * 0.55, Math.PI * 1.45);
        }
        ctx.stroke();
        ctx.restore();
      });

      // Draw Particles
      engine.particles.forEach((pt) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Player Cyborg Ninja
      if (currentGameState === 'playing' || currentGameState === 'menu' || currentGameState === 'paused') {
        const isFlicker = player.invulnTimer > 0 && Math.floor(Date.now() / 70) % 2 === 0;

        if (!isFlicker) {
          ctx.save();
          ctx.translate(player.x, player.y);

          // Flowing Neon Scarf Trail
          if (player.scarfPoints.length > 1) {
            ctx.strokeStyle = stateRef.current.overdriveTimer > 0 ? '#ffe600' : '#ff007f';
            ctx.lineWidth = 5;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            player.scarfPoints.forEach((pt, idx) => {
              const relX = pt.x - player.x;
              const relY = pt.y - player.y;
              if (idx === 0) ctx.moveTo(relX, relY);
              else ctx.lineTo(relX, relY);
            });
            ctx.stroke();
          }

          // Animated Legs Running / Jumping
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (player.isGrounded && Math.abs(player.vx) > 0.5) {
            const legSwing = Math.sin(player.runAnimFrame * 2) * 8;
            ctx.moveTo(player.w * 0.3, player.h - 12);
            ctx.lineTo(player.w * 0.3 + legSwing, player.h);
            ctx.moveTo(player.w * 0.7, player.h - 12);
            ctx.lineTo(player.w * 0.7 - legSwing, player.h);
          } else if (!player.isGrounded) {
            // Jumping pose
            ctx.moveTo(player.w * 0.3, player.h - 12);
            ctx.lineTo(player.w * 0.2, player.h - 4);
            ctx.moveTo(player.w * 0.7, player.h - 12);
            ctx.lineTo(player.w * 0.8, player.h - 4);
          } else {
            // Standing pose
            ctx.moveTo(player.w * 0.3, player.h - 12);
            ctx.lineTo(player.w * 0.3, player.h);
            ctx.moveTo(player.w * 0.7, player.h - 12);
            ctx.lineTo(player.w * 0.7, player.h);
          }
          ctx.stroke();

          // Ninja Body Torso
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = player.isDashing ? '#ffffff' : stateRef.current.overdriveTimer > 0 ? '#ffe600' : '#00f0ff';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = player.isDashing ? 25 : 12;
          ctx.fillRect(0, 0, player.w, player.h - 10);
          ctx.strokeRect(0, 0, player.w, player.h - 10);

          // Glowing Visor
          ctx.fillStyle = stateRef.current.overdriveTimer > 0 ? '#ffe600' : '#00f0ff';
          ctx.fillRect(player.facing === 1 ? player.w - 12 : 2, 8, 10, 5);

          // Katana Sword in Hand / Slashing
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.8;
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          if (player.attackTimer > 0) {
            ctx.moveTo(player.facing === 1 ? player.w : 0, player.h * 0.4);
            ctx.lineTo(player.facing === 1 ? player.w + 36 : -36, player.h * 0.2);
          } else {
            ctx.moveTo(player.w * 0.2, 0);
            ctx.lineTo(player.w * 0.8, -26);
          }
          ctx.stroke();

          ctx.restore();
        }
      }

      // Draw Floating Combat Texts
      engine.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 12;
        ctx.font = `900 ${ft.size}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore(); // Restore world translation
      ctx.restore(); // Restore camera shake

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Purchase Dojo Upgrades using Cyber Coins
  const buyBladeUpgrade = () => {
    const cost = bladeLevel * 25;
    if (coins >= cost && bladeLevel < 5) {
      setCoins((c) => c - cost);
      setBladeLevel((l) => l + 1);
      sound.playPowerup();
    }
  };

  const buyArmorUpgrade = () => {
    const cost = armorLevel * 25;
    if (coins >= cost && armorLevel < 5) {
      setCoins((c) => c - cost);
      const nextLvl = armorLevel + 1;
      setArmorLevel(nextLvl);
      const newMaxHp = 100 + nextLvl * 25;
      setMaxHp(newMaxHp);
      setHp((h) => Math.min(newMaxHp, h + 25));
      sound.playPowerup();
    }
  };

  const buyDashUpgrade = () => {
    const cost = dashLevel * 25;
    if (coins >= cost && dashLevel < 5) {
      setCoins((c) => c - cost);
      setDashLevel((l) => l + 1);
      sound.playPowerup();
    }
  };

  const buyShurikenUpgrade = () => {
    const cost = shurikenLevel * 25;
    if (coins >= cost && shurikenLevel < 5) {
      setCoins((c) => c - cost);
      const nextLvl = shurikenLevel + 1;
      setShurikenLevel(nextLvl);
      const newMaxStars = 10 + nextLvl * 3;
      setMaxShurikens(newMaxStars);
      setShurikens(newMaxStars);
      sound.playPowerup();
    }
  };

  const buyParryUpgrade = () => {
    const cost = parryLevel * 25;
    if (coins >= cost && parryLevel < 5) {
      setCoins((c) => c - cost);
      setParryLevel((l) => l + 1);
      sound.playPowerup();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[650px] md:h-[750px] bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)] select-none flex flex-col items-center justify-center font-sans"
    >
      {/* 2D Canvas Viewport (Mouse Clickable for Katana Combo Slashing) */}
      <canvas
        ref={canvasRef}
        onMouseDown={triggerAttack}
        className="w-full h-full object-contain cursor-crosshair"
      />

      {/* TOP HEADS-UP DISPLAY (HUD) */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
          {/* Health Bar & Stage */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-cyan-400 font-black">CYBER HP</span>
              <span className="text-sm font-bold text-slate-200">
                {hp} / {maxHp}
              </span>
            </div>
            <div className="w-40 md:w-56 bg-slate-900/90 border border-rose-500/40 rounded-full h-4 overflow-hidden p-0.5 backdrop-blur-md shadow-lg">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full transition-all duration-100"
                style={{ width: `${(hp / maxHp) * 100}%` }}
              />
            </div>

            {/* Combo Meter & Rank */}
            {comboCount > 1 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  COMBO x{comboCount}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-pink-600 text-white font-black text-xs shadow-[0_0_10px_rgba(255,0,127,0.6)]">
                  RANK {comboRank}
                </span>
              </div>
            )}
          </div>

          {/* Shurikens, Coins, Score & Controls */}
          <div className="flex items-center gap-3">
            {/* Shurikens */}
            <div className="flex items-center gap-1.5 bg-slate-900/85 border border-cyan-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-md">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-xs md:text-sm text-cyan-300">x{shurikens}</span>
            </div>

            {/* Cyber Coins */}
            <div className="flex items-center gap-1.5 bg-slate-900/85 border border-amber-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-md">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-xs md:text-sm text-amber-300">{coins}</span>
            </div>

            {/* Score */}
            <div className="flex items-center gap-2 bg-slate-900/85 border border-purple-500/40 px-3.5 py-1.5 rounded-xl backdrop-blur-md shadow-md">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="font-black text-sm md:text-base text-amber-300">{score.toLocaleString()} PTS</span>
            </div>

            {/* Stage */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/85 border border-pink-500/40 text-pink-300 font-black text-xs">
              STAGE {stage}
            </div>

            {/* Audio Toggle & Pause Buttons */}
            <button
              onClick={handleToggleSound}
              className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 pointer-events-auto cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <button
              onClick={() => setGameState('paused')}
              className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 pointer-events-auto cursor-pointer"
            >
              <Pause className="w-4 h-4 text-pink-400" />
            </button>
          </div>
        </div>
      )}

      {/* MOBILE TOUCH CONTROLS */}
      {gameState === 'playing' && (
        <div className="absolute bottom-6 left-4 right-4 flex justify-between items-end z-20 md:hidden pointer-events-auto">
          {/* D-Pad Movement */}
          <div className="flex items-center gap-2">
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                engineRef.current.keys['a'] = true;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                engineRef.current.keys['a'] = false;
              }}
              onTouchCancel={() => (engineRef.current.keys['a'] = false)}
              className="w-14 h-14 rounded-2xl bg-cyan-600/80 active:bg-cyan-500 border-2 border-cyan-300 text-white font-black text-lg flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform"
            >
              ◀
            </button>
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                engineRef.current.keys['d'] = true;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                engineRef.current.keys['d'] = false;
              }}
              onTouchCancel={() => (engineRef.current.keys['d'] = false)}
              className="w-14 h-14 rounded-2xl bg-cyan-600/80 active:bg-cyan-500 border-2 border-cyan-300 text-white font-black text-lg flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform"
            >
              ▶
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* SHURIKEN */}
            <button
              onClick={triggerShuriken}
              className="w-12 h-12 rounded-full bg-slate-800 border-2 border-cyan-400 text-cyan-300 font-black text-xs flex flex-col items-center justify-center active:scale-95 transition-transform"
            >
              <span>STAR</span>
            </button>

            {/* DASH */}
            <button
              onClick={triggerDash}
              className="w-12 h-12 rounded-full bg-pink-600/80 border-2 border-pink-300 text-white font-black text-xs flex flex-col items-center justify-center active:scale-95 transition-transform shadow-[0_0_15px_rgba(255,0,127,0.5)]"
            >
              <span>DASH</span>
            </button>

            {/* JUMP */}
            <button
              onClick={triggerJump}
              className="w-14 h-14 rounded-2xl bg-blue-600/80 border-2 border-blue-300 text-white font-black text-xs flex flex-col items-center justify-center active:scale-95 transition-transform"
            >
              <span>JUMP</span>
            </button>

            {/* SLASH */}
            <button
              onClick={triggerAttack}
              className="w-16 h-16 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 border-2 border-rose-300 text-white font-black text-sm flex flex-col items-center justify-center active:scale-95 transition-transform shadow-[0_0_20px_rgba(244,63,94,0.6)]"
            >
              <Swords className="w-5 h-5" />
              <span>SLASH</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN MENU OVERLAY */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in overflow-y-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xs tracking-widest uppercase mb-3 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Cyberpunk Katana Dash & Parry Action</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 tracking-wider mb-2 drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">
            CYBER SHADOW NINJA
          </h1>
          <p className="text-cyan-300/80 max-w-lg text-sm md:text-base font-medium mb-6">
            Execute 3-hit katana combos, deflect enemy laser bullets with timed parries, wall jump across cyber skyscrapers, smash loot crates, and slice through robotic ronin bosses!
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl w-full mb-8 text-xs">
            <div className="bg-slate-900/90 border border-cyan-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <Swords className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-slate-200">J / Click</span>
              <span className="text-slate-400">Katana Slash</span>
            </div>
            <div className="bg-slate-900/90 border border-pink-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <Zap className="w-5 h-5 text-pink-400" />
              <span className="font-bold text-slate-200">L / Shift</span>
              <span className="text-slate-400">Shadow Dash</span>
            </div>
            <div className="bg-slate-900/90 border border-amber-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <Shield className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-slate-200">Timed Slash</span>
              <span className="text-slate-400">Parry Deflect</span>
            </div>
            <div className="bg-slate-900/90 border border-lime-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <Award className="w-5 h-5 text-lime-400" />
              <span className="font-bold text-slate-200">Space / W / K</span>
              <span className="text-slate-400">Wall Jump</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setGameState('dojo')}
              className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-bold text-sm tracking-wider uppercase flex items-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-105"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>NINJA DOJO</span>
            </button>

            <button
              onClick={startGame}
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-rose-500 via-pink-600 to-cyan-500 hover:from-rose-400 hover:to-cyan-400 text-white font-black text-lg tracking-wider uppercase shadow-[0_0_30px_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>START MISSION</span>
            </button>
          </div>

          {highScore > 0 && (
            <div className="flex items-center gap-2 mt-6 text-amber-400 text-sm font-bold">
              <Trophy className="w-4 h-4" />
              <span>ALL-TIME RECORD: {highScore.toLocaleString()} PTS</span>
            </div>
          )}
        </div>
      )}

      {/* PAUSE OVERLAY */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-black text-cyan-400 tracking-wider mb-2">MISSION PAUSED</h2>
          <p className="text-slate-400 text-sm mb-6">Take a breath, Cyborg Ninja.</p>

          <div className="flex flex-col gap-3 w-64 mb-6">
            <button
              onClick={() => setGameState('playing')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-black text-sm tracking-wider uppercase shadow-lg cursor-pointer"
            >
              RESUME MISSION
            </button>
            <button
              onClick={() => setGameState('dojo')}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-bold text-sm tracking-wider uppercase cursor-pointer"
            >
              NINJA DOJO SHOP
            </button>
            <button
              onClick={startGame}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/40 text-rose-400 font-bold text-sm tracking-wider uppercase cursor-pointer"
            >
              RESTART STAGE
            </button>
          </div>
        </div>
      )}

      {/* DOJO UPGRADE SHOP OVERLAY */}
      {gameState === 'dojo' && (
        <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-lg flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in overflow-y-auto">
          <div className="flex items-center justify-between w-full max-w-2xl mb-4">
            <h2 className="text-2xl md:text-3xl font-black text-cyan-400 tracking-wider">CYBER NINJA DOJO</h2>
            <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 px-3.5 py-1.5 rounded-xl">
              <Coins className="w-5 h-5 text-amber-400" />
              <span className="font-black text-base text-amber-300">{coins} COINS</span>
            </div>
          </div>
          <p className="text-slate-400 text-xs md:text-sm mb-6 max-w-lg">
            Spend earned Cyber Coins to enhance your cybernetics, katana blade, armor, and parry abilities.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl w-full mb-6">
            {/* Blade Upgrade */}
            <div className="bg-slate-900/90 border border-cyan-500/30 p-3.5 rounded-2xl flex flex-col items-center gap-1.5">
              <Swords className="w-6 h-6 text-cyan-400" />
              <span className="font-bold text-white text-sm">KATANA BLADE</span>
              <span className="text-xs text-slate-400">LVL {bladeLevel} / 5 (+Damage & Arc)</span>
              <button
                onClick={buyBladeUpgrade}
                disabled={bladeLevel >= 5 || coins < bladeLevel * 25}
                className={`w-full mt-2 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  bladeLevel >= 5
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : coins >= bladeLevel * 25
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {bladeLevel >= 5 ? 'MAX LEVEL' : `UPGRADE (${bladeLevel * 25} Coins)`}
              </button>
            </div>

            {/* Armor Upgrade */}
            <div className="bg-slate-900/90 border border-pink-500/30 p-3.5 rounded-2xl flex flex-col items-center gap-1.5">
              <Shield className="w-6 h-6 text-pink-400" />
              <span className="font-bold text-white text-sm">NANO ARMOR</span>
              <span className="text-xs text-slate-400">LVL {armorLevel} / 5 (+25 Max HP)</span>
              <button
                onClick={buyArmorUpgrade}
                disabled={armorLevel >= 5 || coins < armorLevel * 25}
                className={`w-full mt-2 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  armorLevel >= 5
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : coins >= armorLevel * 25
                    ? 'bg-pink-600 hover:bg-pink-500 text-white'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {armorLevel >= 5 ? 'MAX LEVEL' : `UPGRADE (${armorLevel * 25} Coins)`}
              </button>
            </div>

            {/* Dash Upgrade */}
            <div className="bg-slate-900/90 border border-amber-500/30 p-3.5 rounded-2xl flex flex-col items-center gap-1.5">
              <Zap className="w-6 h-6 text-amber-400" />
              <span className="font-bold text-white text-sm">SHADOW BLINK</span>
              <span className="text-xs text-slate-400">LVL {dashLevel} / 5 (-Dash Cooldown)</span>
              <button
                onClick={buyDashUpgrade}
                disabled={dashLevel >= 5 || coins < dashLevel * 25}
                className={`w-full mt-2 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  dashLevel >= 5
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : coins >= dashLevel * 25
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {dashLevel >= 5 ? 'MAX LEVEL' : `UPGRADE (${dashLevel * 25} Coins)`}
              </button>
            </div>

            {/* Shurikens Upgrade */}
            <div className="bg-slate-900/90 border border-lime-500/30 p-3.5 rounded-2xl flex flex-col items-center gap-1.5">
              <Sparkles className="w-6 h-6 text-lime-400" />
              <span className="font-bold text-white text-sm">SHURIKEN MASTERY</span>
              <span className="text-xs text-slate-400">LVL {shurikenLevel} / 5 (+Ammo & Spread)</span>
              <button
                onClick={buyShurikenUpgrade}
                disabled={shurikenLevel >= 5 || coins < shurikenLevel * 25}
                className={`w-full mt-2 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  shurikenLevel >= 5
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : coins >= shurikenLevel * 25
                    ? 'bg-lime-600 hover:bg-lime-500 text-white'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {shurikenLevel >= 5 ? 'MAX LEVEL' : `UPGRADE (${shurikenLevel * 25} Coins)`}
              </button>
            </div>

            {/* Parry Mastery */}
            <div className="bg-slate-900/90 border border-purple-500/30 p-3.5 rounded-2xl flex flex-col items-center gap-1.5">
              <Award className="w-6 h-6 text-purple-400" />
              <span className="font-bold text-white text-sm">PARRY MASTERY</span>
              <span className="text-xs text-slate-400">LVL {parryLevel} / 5 (+Reflect Damage)</span>
              <button
                onClick={buyParryUpgrade}
                disabled={parryLevel >= 5 || coins < parryLevel * 25}
                className={`w-full mt-2 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  parryLevel >= 5
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : coins >= parryLevel * 25
                    ? 'bg-purple-600 hover:bg-purple-500 text-white'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {parryLevel >= 5 ? 'MAX LEVEL' : `UPGRADE (${parryLevel * 25} Coins)`}
              </button>
            </div>
          </div>

          <button
            onClick={() => setGameState('menu')}
            className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm tracking-wider cursor-pointer"
          >
            BACK TO MISSION MENU
          </button>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-500 mb-4 shadow-[0_0_25px_rgba(244,63,94,0.6)]">
            <Flame className="w-8 h-8" />
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-rose-500 tracking-wider mb-2">SHADOW DEFEATED</h2>
          <p className="text-slate-400 text-sm mb-6">Your cybernetic core ceased functioning.</p>

          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 max-w-sm w-full mb-6 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Final Score:</span>
              <span className="text-xl font-black text-cyan-400">{score.toLocaleString()} PTS</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Stage Reached:</span>
              <span className="font-bold text-pink-400">STAGE {stage}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Coins Collected:</span>
              <span className="font-bold text-amber-400">{coins} COINS</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800">
              <span className="text-slate-400">High Score Record:</span>
              <span className="font-bold text-white">{highScore.toLocaleString()} PTS</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setGameState('dojo')}
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-bold text-sm tracking-wider uppercase flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>NINJA DOJO</span>
            </button>

            <button
              onClick={startGame}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-black text-base tracking-wider uppercase shadow-[0_0_25px_rgba(0,240,255,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>RESTART MISSION</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default CyberShadowNinja;
