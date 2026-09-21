import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Award,
  Zap,
  Crown,
  Flame,
  Sparkles,
  Shield,
  Crosshair,
  Swords,
  Timer,
  ChevronRight,
  Heart,
  Radio,
  Target
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

// --- GAME CONSTANTS ---
const ARENA_W = 1800;
const ARENA_H = 1800;
const V_WIDTH = 580;
const V_HEIGHT = 780;

interface UpgradeCard {
  id: string;
  title: string;
  description: string;
  iconName: 'blaster' | 'katana' | 'tesla' | 'cryo' | 'missile' | 'speed' | 'health' | 'magnet';
  color: string;
  level: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  type: 'drone' | 'spider' | 'walker' | 'juggernaut' | 'boss';
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  color: string;
  points: number;
  xpValue: number;
  isFrozen: number; // timer
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  damage: number;
  life: number;
  isHoming?: boolean;
  targetId?: number;
}

interface XpGem {
  id: number;
  x: number;
  y: number;
  value: number;
  color: string;
}

interface DamageNumber {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
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

export const CyberNeonSurvivor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Game UI States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'levelup' | 'gameover' | 'victory'>('menu');
  const [survivedSeconds, setSurvivedSeconds] = useState<number>(0);
  const [kills, setKills] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(0);
  const [xpNeeded, setXpNeeded] = useState<number>(20);
  const [hp, setHp] = useState<number>(100);
  const [maxHp, setMaxHp] = useState<number>(100);
  const [highKills, setHighKills] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_survivor_kills');
    return saved ? parseInt(saved, 10) : 340;
  });
  const [upgradeChoices, setUpgradeChoices] = useState<UpgradeCard[]>([]);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Engine State Ref
  const engineRef = useRef<{
    player: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      speed: number;
      radius: number;
      dashTimer: number;
      dashCooldown: number;
      magnetRange: number;
    };
    weapons: {
      blasterLevel: number;
      blasterTimer: number;
      blasterCooldown: number;
      katanaLevel: number;
      katanaAngle: number;
      katanaCount: number;
      teslaLevel: number;
      teslaTimer: number;
      cryoLevel: number;
      cryoTimer: number;
      missileLevel: number;
      missileTimer: number;
    };
    enemies: Enemy[];
    projectiles: Projectile[];
    xpGems: XpGem[];
    damageNumbers: DamageNumber[];
    particles: Particle[];
    keys: Record<string, boolean>;
    joystick: { active: boolean; startX: number; startY: number; curX: number; curY: number };
    shake: number;
    gameStartTime: number;
    lastSpawnTime: number;
    bossSpawned: boolean;
  }>({
    player: {
      x: ARENA_W / 2,
      y: ARENA_H / 2,
      vx: 0,
      vy: 0,
      speed: 4.2,
      radius: 16,
      dashTimer: 0,
      dashCooldown: 0,
      magnetRange: 140,
    },
    weapons: {
      blasterLevel: 1,
      blasterTimer: 0,
      blasterCooldown: 0.35,
      katanaLevel: 1,
      katanaAngle: 0,
      katanaCount: 2,
      teslaLevel: 0,
      teslaTimer: 0,
      cryoLevel: 0,
      cryoTimer: 0,
      missileLevel: 0,
      missileTimer: 0,
    },
    enemies: [],
    projectiles: [],
    xpGems: [],
    damageNumbers: [],
    particles: [],
    keys: {},
    joystick: { active: false, startX: 0, startY: 0, curX: 0, curY: 0 },
    shake: 0,
    gameStartTime: 0,
    lastSpawnTime: 0,
    bossSpawned: false,
  });

  // Level Up Choices Generator
  const generateLevelUpCards = (): UpgradeCard[] => {
    const w = engineRef.current.weapons;
    const pool: UpgradeCard[] = [
      {
        id: 'blaster',
        title: 'Plasma Blaster +1',
        description: 'Increases rapid-fire plasma bolt fire rate and damage by 30%.',
        iconName: 'blaster',
        color: '#00f0ff',
        level: w.blasterLevel + 1,
      },
      {
        id: 'katana',
        title: 'Katana Orbit +1',
        description: 'Adds an extra rotating neon energy blade to shred swarming enemies.',
        iconName: 'katana',
        color: '#ff007f',
        level: w.katanaLevel + 1,
      },
      {
        id: 'tesla',
        title: 'Tesla Lightning Arc',
        description: 'Emits chain-lightning that zaps up to 5 nearby robotic enemies.',
        iconName: 'tesla',
        color: '#ffe600',
        level: w.teslaLevel + 1,
      },
      {
        id: 'cryo',
        title: 'Cryo Freeze Wave',
        description: 'Emits a 360° freezing pulse every 4 seconds, immobilizing enemies.',
        iconName: 'cryo',
        color: '#38bdf8',
        level: w.cryoLevel + 1,
      },
      {
        id: 'missile',
        title: 'Homing Micro-Missiles',
        description: 'Launches swarms of seeking explosive neon rockets.',
        iconName: 'missile',
        color: '#f97316',
        level: w.missileLevel + 1,
      },
      {
        id: 'speed',
        title: 'Cyber Thrusters +20%',
        description: 'Boosts hero movement speed and dash recovery.',
        iconName: 'speed',
        color: '#a855f7',
        level: 2,
      },
      {
        id: 'health',
        title: 'Nano Repair Core',
        description: 'Increases Max HP by +35 and instantly heals 50 HP.',
        iconName: 'health',
        color: '#22c55e',
        level: 2,
      },
      {
        id: 'magnet',
        title: 'Gravity Magnet Field',
        description: 'Greatly increases the collection range for XP matter gems.',
        iconName: 'magnet',
        color: '#ec4899',
        level: 2,
      },
    ];

    // Shuffle and pick 3
    const shuffled = pool.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  // Select Upgrade Card
  const applyUpgrade = (card: UpgradeCard) => {
    sound.playPowerup();
    const eng = engineRef.current;
    const w = eng.weapons;

    if (card.id === 'blaster') {
      w.blasterLevel++;
      w.blasterCooldown = Math.max(0.12, w.blasterCooldown * 0.82);
    } else if (card.id === 'katana') {
      w.katanaLevel++;
      w.katanaCount = Math.min(6, w.katanaCount + 1);
    } else if (card.id === 'tesla') {
      w.teslaLevel++;
    } else if (card.id === 'cryo') {
      w.cryoLevel++;
    } else if (card.id === 'missile') {
      w.missileLevel++;
    } else if (card.id === 'speed') {
      eng.player.speed += 0.8;
    } else if (card.id === 'health') {
      setMaxHp((prev) => prev + 35);
      setHp((prev) => Math.min(maxHp + 35, prev + 50));
    } else if (card.id === 'magnet') {
      eng.player.magnetRange += 100;
    }

    setGameState('playing');
  };

  // Start New Game
  const startNewGame = () => {
    sound.playClick();
    const eng = engineRef.current;
    eng.player.x = ARENA_W / 2;
    eng.player.y = ARENA_H / 2;
    eng.player.vx = 0;
    eng.player.vy = 0;
    eng.player.speed = 4.2;
    eng.player.magnetRange = 140;

    eng.weapons = {
      blasterLevel: 1,
      blasterTimer: 0,
      blasterCooldown: 0.35,
      katanaLevel: 1,
      katanaAngle: 0,
      katanaCount: 2,
      teslaLevel: 0,
      teslaTimer: 0,
      cryoLevel: 0,
      cryoTimer: 0,
      missileLevel: 0,
      missileTimer: 0,
    };

    eng.enemies = [];
    eng.projectiles = [];
    eng.xpGems = [];
    eng.damageNumbers = [];
    eng.particles = [];
    eng.bossSpawned = false;
    eng.gameStartTime = performance.now();

    setHp(100);
    setMaxHp(100);
    setLevel(1);
    setXp(0);
    setXpNeeded(20);
    setKills(0);
    setSurvivedSeconds(0);
    setGameState('playing');
  };

  // Dash Action
  const triggerDash = useCallback(() => {
    const eng = engineRef.current;
    if (eng.player.dashCooldown <= 0) {
      sound.playPlungerLaunch();
      eng.player.dashTimer = 0.22;
      eng.player.dashCooldown = 2.0;

      for (let k = 0; k < 12; k++) {
        eng.particles.push({
          x: eng.player.x,
          y: eng.player.y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          size: 3,
          color: '#00f0ff',
          alpha: 1,
          decay: 0.05,
        });
      }
    }
  }, []);

  // Touch Virtual Joystick Controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (gameState !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = V_WIDTH / rect.width;
      const scaleY = V_HEIGHT / rect.height;
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;

      engineRef.current.joystick = {
        active: true,
        startX: x,
        startY: y,
        curX: x,
        curY: y,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (gameState !== 'playing' || !engineRef.current.joystick.active) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = V_WIDTH / rect.width;
      const scaleY = V_HEIGHT / rect.height;
      const touch = e.touches[0];
      engineRef.current.joystick.curX = (touch.clientX - rect.left) * scaleX;
      engineRef.current.joystick.curY = (touch.clientY - rect.top) * scaleY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      engineRef.current.joystick.active = false;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [gameState]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      engineRef.current.keys[e.code] = true;
      if (e.code === 'Space') {
        triggerDash();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      engineRef.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerDash]);

  // Main Simulation & Spawning Loop
  useEffect(() => {
    let animationFrameId: number;

    const spawnEnemyWave = (elapsedSec: number) => {
      const eng = engineRef.current;
      const spawnCount = 2 + Math.floor(elapsedSec / 20);

      // Spawn Around Player Perimeter (distance ~ 500px)
      for (let i = 0; i < spawnCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 450 + Math.random() * 80;
        const ex = eng.player.x + Math.cos(ang) * dist;
        const ey = eng.player.y + Math.sin(ang) * dist;

        // Choose enemy type based on survival time
        let type: Enemy['type'] = 'drone';
        let hpVal = 18 + elapsedSec * 0.8;
        let spd = 2.2;
        let col = '#00f0ff';
        let rad = 14;

        if (elapsedSec > 90 && Math.random() < 0.25) {
          type = 'juggernaut';
          hpVal = 140 + elapsedSec * 1.5;
          spd = 1.4;
          col = '#f43f5e';
          rad = 22;
        } else if (elapsedSec > 40 && Math.random() < 0.35) {
          type = 'spider';
          hpVal = 25 + elapsedSec * 0.9;
          spd = 3.6;
          col = '#ff007f';
          rad = 12;
        }

        eng.enemies.push({
          id: Date.now() + Math.random(),
          x: ex,
          y: ey,
          type,
          hp: hpVal,
          maxHp: hpVal,
          speed: spd,
          radius: rad,
          color: col,
          points: type === 'juggernaut' ? 250 : 50,
          xpValue: type === 'juggernaut' ? 15 : 4,
          isFrozen: 0,
        });
      }

      // Spawn Titan Boss at 120s
      if (elapsedSec >= 120 && !eng.bossSpawned) {
        eng.bossSpawned = true;
        sound.playJackpotAlarm();
        eng.enemies.push({
          id: 999999,
          x: eng.player.x + 350,
          y: eng.player.y,
          type: 'boss',
          hp: 2500,
          maxHp: 2500,
          speed: 1.6,
          radius: 38,
          color: '#e11d48',
          points: 5000,
          xpValue: 100,
          isFrozen: 0,
        });
      }
    };

    const updatePhysics = (dt: number) => {
      const eng = engineRef.current;
      if (gameState !== 'playing') return;

      const elapsedSec = Math.floor((performance.now() - eng.gameStartTime) / 1000);
      setSurvivedSeconds(elapsedSec);

      // Spawn Clock
      if (performance.now() - eng.lastSpawnTime > Math.max(700, 1800 - elapsedSec * 10)) {
        spawnEnemyWave(elapsedSec);
        eng.lastSpawnTime = performance.now();
      }

      // 1. Move Player (Keyboard or Touch Joystick)
      let moveX = 0;
      let moveY = 0;
      if (eng.keys['KeyW'] || eng.keys['ArrowUp']) moveY -= 1;
      if (eng.keys['KeyS'] || eng.keys['ArrowDown']) moveY += 1;
      if (eng.keys['KeyA'] || eng.keys['ArrowLeft']) moveX -= 1;
      if (eng.keys['KeyD'] || eng.keys['ArrowRight']) moveX += 1;

      if (eng.joystick.active) {
        const jdx = eng.joystick.curX - eng.joystick.startX;
        const jdy = eng.joystick.curY - eng.joystick.startY;
        const jdist = Math.hypot(jdx, jdy);
        if (jdist > 8) {
          moveX = jdx / jdist;
          moveY = jdy / jdist;
        }
      }

      const moveLen = Math.hypot(moveX, moveY);
      if (moveLen > 0) {
        const curSpd = eng.player.dashTimer > 0 ? eng.player.speed * 2.4 : eng.player.speed;
        eng.player.x += (moveX / moveLen) * curSpd;
        eng.player.y += (moveY / moveLen) * curSpd;
      }

      // Clamp Player to Arena
      eng.player.x = Math.max(40, Math.min(ARENA_W - 40, eng.player.x));
      eng.player.y = Math.max(40, Math.min(ARENA_H - 40, eng.player.y));

      if (eng.player.dashTimer > 0) eng.player.dashTimer -= dt;
      if (eng.player.dashCooldown > 0) eng.player.dashCooldown -= dt;

      // 2. Weapons Automation
      const w = eng.weapons;

      // Plasma Blaster Auto-Fire
      w.blasterTimer += dt;
      if (w.blasterTimer >= w.blasterCooldown && eng.enemies.length > 0) {
        w.blasterTimer = 0;
        // Find nearest enemy
        let nearest: Enemy | null = null;
        let minDist = 450;
        eng.enemies.forEach((e) => {
          const d = Math.hypot(e.x - eng.player.x, e.y - eng.player.y);
          if (d < minDist) {
            minDist = d;
            nearest = e;
          }
        });

        if (nearest) {
          const target = nearest as Enemy;
          const ang = Math.atan2(target.y - eng.player.y, target.x - eng.player.x);
          const spd = 14;
          sound.playLaser();

          eng.projectiles.push({
            x: eng.player.x,
            y: eng.player.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            radius: 5,
            color: '#00f0ff',
            damage: 22 + w.blasterLevel * 8,
            life: 1.2,
          });
        }
      }

      // Rotating Katana Blades
      w.katanaAngle += dt * 3.5;
      const katanaOrbitRadius = 75;
      for (let k = 0; k < w.katanaCount; k++) {
        const kAngle = w.katanaAngle + (k * Math.PI * 2) / w.katanaCount;
        const kx = eng.player.x + Math.cos(kAngle) * katanaOrbitRadius;
        const ky = eng.player.y + Math.sin(kAngle) * katanaOrbitRadius;

        // Check collision with enemies
        eng.enemies.forEach((e) => {
          if (Math.hypot(e.x - kx, e.y - ky) < e.radius + 18) {
            e.hp -= (18 + w.katanaLevel * 6) * dt * 8;
            sound.playBladeSwipe();
            for (let p = 0; p < 2; p++) {
              eng.particles.push({
                x: kx,
                y: ky,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                size: 2.5,
                color: '#ff007f',
                alpha: 1,
                decay: 0.08,
              });
            }
          }
        });
      }

      // Tesla Chain Lightning
      if (w.teslaLevel > 0) {
        w.teslaTimer += dt;
        if (w.teslaTimer >= 2.0) {
          w.teslaTimer = 0;
          const targets = eng.enemies.slice(0, 3 + w.teslaLevel);
          sound.playRhythmSynthNote(750, 0.2);
          targets.forEach((t) => {
            t.hp -= 40 + w.teslaLevel * 18;
            eng.damageNumbers.push({
              x: t.x,
              y: t.y - 15,
              text: `⚡${Math.round(40 + w.teslaLevel * 18)}`,
              color: '#ffe600',
              alpha: 1,
              vy: -1.8,
            });
          });
        }
      }

      // 3. Move Projectiles
      for (let i = eng.projectiles.length - 1; i >= 0; i--) {
        const p = eng.projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;

        // Check enemy hit
        let hit = false;
        for (let j = 0; j < eng.enemies.length; j++) {
          const e = eng.enemies[j];
          if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
            e.hp -= p.damage;
            hit = true;

            eng.damageNumbers.push({
              x: e.x,
              y: e.y - 12,
              text: String(Math.round(p.damage)),
              color: p.color,
              alpha: 1,
              vy: -1.6,
            });

            for (let k = 0; k < 6; k++) {
              eng.particles.push({
                x: p.x,
                y: p.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                size: 2.5,
                color: p.color,
                alpha: 1,
                decay: 0.06,
              });
            }
            break;
          }
        }

        if (hit || p.life <= 0) {
          eng.projectiles.splice(i, 1);
        }
      }

      // 4. Move & Update Enemies
      for (let i = eng.enemies.length - 1; i >= 0; i--) {
        const e = eng.enemies[i];

        // Enemy Defeated
        if (e.hp <= 0) {
          setKills((prev) => {
            const next = prev + 1;
            if (next > highKills) {
              setHighKills(next);
              localStorage.setItem('novaplay_survivor_kills', String(next));
            }
            return next;
          });

          // Drop XP Matter Gem
          eng.xpGems.push({
            id: Date.now() + Math.random(),
            x: e.x,
            y: e.y,
            value: e.xpValue,
            color: e.type === 'boss' ? '#e11d48' : e.type === 'juggernaut' ? '#f59e0b' : '#00f0ff',
          });

          sound.playExplosion();
          eng.enemies.splice(i, 1);
          continue;
        }

        // Move towards hero
        const dx = eng.player.x - e.x;
        const dy = eng.player.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          const spd = e.isFrozen > 0 ? e.speed * 0.3 : e.speed;
          e.x += (dx / dist) * spd;
          e.y += (dy / dist) * spd;
        }

        // Hit Player Collision
        if (dist < e.radius + eng.player.radius) {
          setHp((prev) => {
            const next = Math.max(0, prev - dt * 28);
            if (next <= 0) {
              setGameState('gameover');
              sound.playGameOver();
            }
            return next;
          });
          eng.shake = 4;
        }
      }

      // 5. XP Gems Magnet Collection
      for (let i = eng.xpGems.length - 1; i >= 0; i--) {
        const gem = eng.xpGems[i];
        const gdx = eng.player.x - gem.x;
        const gdy = eng.player.y - gem.y;
        const gdist = Math.hypot(gdx, gdy);

        if (gdist < eng.player.magnetRange) {
          const pullSpd = 9;
          gem.x += (gdx / gdist) * pullSpd;
          gem.y += (gdy / gdist) * pullSpd;
        }

        // Collect
        if (gdist < eng.player.radius + 12) {
          sound.playCollect();
          setXp((prev) => {
            const next = prev + gem.value;
            if (next >= xpNeeded) {
              // Trigger Level Up!
              sound.playWin();
              setLevel((lvl) => lvl + 1);
              setXpNeeded((curr) => Math.round(curr * 1.35));
              setUpgradeChoices(generateLevelUpCards());
              setGameState('levelup');
              return 0;
            }
            return next;
          });
          eng.xpGems.splice(i, 1);
        }
      }

      // 6. Particles & Damage Numbers
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) eng.particles.splice(i, 1);
      }

      for (let i = eng.damageNumbers.length - 1; i >= 0; i--) {
        const dn = eng.damageNumbers[i];
        dn.y += dn.vy;
        dn.alpha -= 0.035;
        if (dn.alpha <= 0) eng.damageNumbers.splice(i, 1);
      }

      if (eng.shake > 0) eng.shake *= 0.88;
    };

    // --- RENDER PASS (Camera follows player in infinite arena) ---
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const eng = engineRef.current;
      const camX = eng.player.x - V_WIDTH / 2;
      const camY = eng.player.y - V_HEIGHT / 2;

      ctx.save();
      if (eng.shake > 0.5) {
        ctx.translate((Math.random() - 0.5) * eng.shake, (Math.random() - 0.5) * eng.shake);
      }

      // 1. Dark Cyber Arena Floor
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      ctx.save();
      ctx.translate(-camX, -camY);

      // Arena Outer Boundary
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.strokeRect(0, 0, ARENA_W, ARENA_H);
      ctx.shadowBlur = 0;

      // Neon Arena Grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= ARENA_W; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ARENA_H);
        ctx.stroke();
      }
      for (let y = 0; y <= ARENA_H; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ARENA_W, y);
        ctx.stroke();
      }

      // 2. Draw XP Matter Gems
      eng.xpGems.forEach((gem) => {
        ctx.save();
        ctx.fillStyle = gem.color;
        ctx.shadowColor = gem.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(gem.x, gem.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 3. Draw Enemies
      eng.enemies.forEach((e) => {
        ctx.save();
        ctx.translate(e.x, e.y);

        // Body
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = e.color;
        ctx.lineWidth = e.type === 'boss' ? 5 : 2.5;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Inner Core Eye
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Health Bar for Juggernauts & Boss
        if (e.type === 'juggernaut' || e.type === 'boss') {
          const bw = e.radius * 2.2;
          const bh = 5;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(-bw / 2, -e.radius - 12, bw, bh);
          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(-bw / 2, -e.radius - 12, (e.hp / e.maxHp) * bw, bh);
        }

        ctx.restore();
      });

      // 4. Draw Projectiles
      eng.projectiles.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 5. Draw Orbiting Katana Blades
      const w = eng.weapons;
      const kDist = 75;
      for (let k = 0; k < w.katanaCount; k++) {
        const kAngle = w.katanaAngle + (k * Math.PI * 2) / w.katanaCount;
        const kx = eng.player.x + Math.cos(kAngle) * kDist;
        const ky = eng.player.y + Math.sin(kAngle) * kDist;

        ctx.save();
        ctx.translate(kx, ky);
        ctx.rotate(kAngle + Math.PI / 2);
        ctx.fillStyle = '#ff007f';
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 14;
        ctx.fillRect(-4, -18, 8, 36);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1.5, -16, 3, 32);
        ctx.restore();
      }

      // 6. Draw Hero Mech Exo-Suit
      ctx.save();
      ctx.translate(eng.player.x, eng.player.y);

      // Dash trail / Shield aura
      ctx.beginPath();
      ctx.arc(0, 0, eng.player.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, eng.player.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.stroke();

      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 7. Particles
      eng.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 8. Damage Floating Numbers
      eng.damageNumbers.forEach((dn) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, dn.alpha);
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = dn.color;
        ctx.shadowColor = dn.color;
        ctx.shadowBlur = 6;
        ctx.fillText(dn.text, dn.x, dn.y);
        ctx.restore();
      });

      ctx.restore(); // end camera translate

      // 9. Virtual Joystick On-Screen Render (Mobile)
      if (eng.joystick.active) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(eng.joystick.startX, eng.joystick.startY, 45, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(eng.joystick.curX, eng.joystick.curY, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    };

    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      updatePhysics(dt);
      render();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, highKills, xpNeeded]);

  return (
    <div
      ref={containerRef}
      id="cyber-survivor-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1"
    >
      {/* Top Survivor Stats HUD */}
      <div className="w-full mb-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl shadow-cyan-950/40">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
          {/* Survival Time */}
          <div className="flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Survival Time</div>
              <div className="text-lg sm:text-xl font-black text-white font-mono leading-none">
                {Math.floor(survivedSeconds / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(survivedSeconds % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Level & Kills */}
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black">
              LVL {level}
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black">
              💀 {kills}
            </div>
          </div>

          {/* High Record */}
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center justify-end gap-1">
              <Trophy className="w-3 h-3" /> Best Kills
            </div>
            <div className="text-sm font-black text-slate-200 leading-none">{highKills}</div>
          </div>
        </div>

        {/* Hero HP & XP Matter Bar */}
        <div className="space-y-1">
          {/* HP Bar */}
          <div className="flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 flex-shrink-0" />
            <div className="flex-1 h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-emerald-400 transition-all duration-150"
                style={{ width: `${(hp / maxHp) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-300">
              {Math.round(hp)}/{maxHp}
            </span>
          </div>

          {/* XP Progress Bar */}
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <div className="flex-1 h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-cyan-400 transition-all duration-150 shadow-md shadow-cyan-400"
                style={{ width: `${(xp / xpNeeded) * 100}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-cyan-300">{xp}/{xpNeeded}</span>
          </div>
        </div>
      </div>

      {/* Main 2D Infinite Arena Canvas */}
      <div className="relative w-full max-w-[460px] aspect-[580/780] max-h-[74vh] sm:max-h-[82vh] flex items-center justify-center rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-black touch-none">
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          className="w-full h-full object-contain block touch-none cursor-crosshair"
        />

        {/* Start / Menu Modal */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center z-20 space-y-3.5 animate-fade-in overflow-y-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-rose-500 to-amber-500 p-0.5 shadow-xl shadow-cyan-500/30 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                <Swords className="w-7 h-7 text-cyan-400 animate-bounce" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
                <Crown className="w-3 h-3 text-amber-400" /> PREMIUM ROGUE-LITE
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                VAMPIRE <span className="text-cyan-400">SURVIVOR</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Battle endless robot swarms, collect XP matter, and build insane rogue-lite auto-weapon combos!
              </p>
            </div>

            <button
              onClick={startNewGame}
              className="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-rose-600 to-amber-500 hover:from-cyan-400 hover:to-amber-400 text-white font-black text-sm sm:text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              START SURVIVAL RUN
            </button>
          </div>
        )}

        {/* Level Up Upgrade Card Selection Modal */}
        {gameState === 'levelup' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-5 text-center z-30 space-y-3 animate-fade-in overflow-y-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black uppercase tracking-wider animate-pulse">
              <Sparkles className="w-4 h-4 text-amber-400" /> LEVEL UP! SELECT UPGRADE
            </div>

            <div className="w-full max-w-xs space-y-2 text-left">
              {upgradeChoices.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => applyUpgrade(card)}
                  className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800/90 transition-all flex items-start gap-3 shadow-lg group active:scale-95"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md flex-shrink-0"
                    style={{ backgroundColor: card.color }}
                  >
                    <Zap className="w-5 h-5 fill-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {card.title}
                    </div>
                    <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      {card.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center space-y-3 animate-fade-in z-20">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center">
              <Shield className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Run Terminated</div>
              <h2 className="text-2xl font-black text-white">DEFEATED</h2>
              <div className="text-xs text-cyan-400 font-bold mt-1">
                Kills: {kills} • Time: {Math.floor(survivedSeconds / 60)}m {survivedSeconds % 60}s
              </div>
            </div>
            <button
              onClick={startNewGame}
              className="w-full max-w-xs py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-rose-600 text-white font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-1.5 hover:scale-105 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> RETRY MISSION
            </button>
          </div>
        )}
      </div>

      {/* Mobile Touch Dash Button & Controls */}
      <div className="w-full max-w-[380px] sm:max-w-[440px] mt-2 flex items-center justify-between gap-2">
        <button
          onPointerDown={triggerDash}
          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/50 text-cyan-300 text-xs sm:text-sm font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
        >
          ⚡ TURBO DASH [SPACE]
        </button>

        <button
          onClick={() => {
            const isMute = sound.toggleMute();
            setMuted(isMute);
          }}
          className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
        >
          {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>
      </div>
    </div>
  );
};
