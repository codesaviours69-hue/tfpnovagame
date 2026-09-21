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
  Bomb,
  Radio,
  Swords,
  Target,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

// --- GAME CONFIG & CONSTANTS ---
const ARENA_WIDTH = 1600;
const ARENA_HEIGHT = 1000;
const GRID_SPACING = 40;

interface GridPoint {
  x: number;
  y: number;
  origX: number;
  origY: number;
  vx: number;
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
  glow?: boolean;
}

interface Geom {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  color: string;
  life: number;
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
  type?: 'laser' | 'missile' | 'beam' | 'singularity' | 'enemyBullet';
  life: number;
  targetId?: number;
}

interface Enemy {
  id: number;
  type: 'pinwheel' | 'diamond' | 'blackhole' | 'snake' | 'phantom' | 'boss';
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  radius: number;
  color: string;
  scoreValue: number;
  shootTimer?: number;
  stateTimer?: number;
  segments?: { x: number; y: number }[]; // For snake
  shieldAngle?: number; // For boss
  phase?: number;
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

interface PowerUp {
  x: number;
  y: number;
  type: 'shield' | 'bomb' | 'weapon' | 'magnet' | 'slowmo';
  color: string;
  icon: string;
  life: number;
}

export const CyberGeometryWars: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // React UI States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'victory'>('menu');
  const [score, setScore] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [highestMultiplier, setHighestMultiplier] = useState<number>(1);
  const [lives, setLives] = useState<number>(3);
  const [bombs, setBombs] = useState<number>(3);
  const [wave, setWave] = useState<number>(1);
  const [weaponLevel, setWeaponLevel] = useState<number>(1);
  const [shieldActive, setShieldActive] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_geometry_wars_highscore');
    return saved ? parseInt(saved, 10) : 150000;
  });
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [autoFire, setAutoFire] = useState<boolean>(true);

  // Engine Ref for high-performance zero-latency loop
  const engineRef = useRef<{
    player: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      angle: number;
      radius: number;
      speed: number;
      shieldTimer: number;
      dashTimer: number;
      dashCooldown: number;
      isDashing: boolean;
      invulnerableTimer: number;
    };
    grid: GridPoint[][];
    particles: Particle[];
    geoms: Geom[];
    projectiles: Projectile[];
    enemies: Enemy[];
    powerups: PowerUp[];
    floatingTexts: FloatingText[];
    keys: Record<string, boolean>;
    mouse: { x: number; y: number; isDown: boolean };
    leftStick: { active: boolean; startX: number; startY: number; curX: number; curY: number; dirX: number; dirY: number };
    rightStick: { active: boolean; startX: number; startY: number; curX: number; curY: number; dirX: number; dirY: number; isShooting: boolean };
    shake: number;
    shockwaves: { x: number; y: number; radius: number; maxRadius: number; color: string; alpha: number }[];
    fireTimer: number;
    waveTimer: number;
    slowMoTimer: number;
    multiplierTimer: number;
    geomsCollectedInWave: number;
    nextEnemyId: number;
    bossActive: boolean;
  }>({
    player: {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT / 2,
      vx: 0,
      vy: 0,
      angle: 0,
      radius: 18,
      speed: 6.8,
      shieldTimer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      isDashing: false,
      invulnerableTimer: 0
    },
    grid: [],
    particles: [],
    geoms: [],
    projectiles: [],
    enemies: [],
    powerups: [],
    floatingTexts: [],
    keys: {},
    mouse: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2, isDown: false },
    leftStick: { active: false, startX: 0, startY: 0, curX: 0, curY: 0, dirX: 0, dirY: 0 },
    rightStick: { active: false, startX: 0, startY: 0, curX: 0, curY: 0, dirX: 0, dirY: 0, isShooting: false },
    shake: 0,
    shockwaves: [],
    fireTimer: 0,
    waveTimer: 0,
    slowMoTimer: 0,
    multiplierTimer: 0,
    geomsCollectedInWave: 0,
    nextEnemyId: 1,
    bossActive: false
  });

  // Initialize Spring Deformation Grid
  const initGrid = useCallback(() => {
    const cols = Math.ceil(ARENA_WIDTH / GRID_SPACING) + 1;
    const rows = Math.ceil(ARENA_HEIGHT / GRID_SPACING) + 1;
    const grid: GridPoint[][] = [];

    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        const x = c * GRID_SPACING;
        const y = r * GRID_SPACING;
        grid[r][c] = {
          x,
          y,
          origX: x,
          origY: y,
          vx: 0,
          vy: 0
        };
      }
    }
    engineRef.current.grid = grid;
  }, []);

  // Warp Grid Displacement helper
  const applyGridExplosion = (x: number, y: number, force: number, radius: number) => {
    const grid = engineRef.current.grid;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const pt = grid[r][c];
        const dx = pt.x - x;
        const dy = pt.y - y;
        const distSq = dx * dx + dy * dy;
        if (distSq < radius * radius && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const push = ((radius - dist) / radius) * force;
          pt.vx += (dx / dist) * push;
          pt.vy += (dy / dist) * push;
        }
      }
    }
  };

  // Screen shake
  const addShake = (amount: number) => {
    engineRef.current.shake = Math.min(engineRef.current.shake + amount, 28);
  };

  // Spawn Particle Bursts
  const spawnExplosion = (x: number, y: number, color: string, count: number = 24, speedMult: number = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 5 + 2) * speedMult;
      engineRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3.5 + 1.5,
        color,
        alpha: 1,
        decay: Math.random() * 0.025 + 0.015,
        glow: true
      });
    }
  };

  // Spawn Geoms (Multiplier pick-ups)
  const spawnGeoms = (x: number, y: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      engineRef.current.geoms.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        value: 1,
        color: '#39ff14',
        life: 600
      });
    }
  };

  // Add Floating Score / Combo Text
  const addFloatingText = (x: number, y: number, text: string, color: string, size: number = 18) => {
    engineRef.current.floatingTexts.push({
      x,
      y,
      text,
      color,
      alpha: 1,
      size,
      vy: -1.8
    });
  };

  // Trigger Smart Bomb EMP
  const triggerEmpBomb = () => {
    if (bombs <= 0 || gameState !== 'playing') return;
    const engine = engineRef.current;
    setBombs((prev) => prev - 1);
    sound.playExplosion();
    addShake(22);

    // Shockwave
    engine.shockwaves.push({
      x: engine.player.x,
      y: engine.player.y,
      radius: 20,
      maxRadius: 1100,
      color: '#00f0ff',
      alpha: 1
    });

    applyGridExplosion(engine.player.x, engine.player.y, 45, 900);

    // Clear all hostile bullets
    engine.projectiles = engine.projectiles.filter((p) => p.isPlayer);

    // Damage / destroy enemies
    let bombKills = 0;
    engine.enemies.forEach((enemy) => {
      if (enemy.type === 'boss') {
        enemy.hp -= 250;
        spawnExplosion(enemy.x, enemy.y, '#ff0055', 30);
      } else {
        enemy.hp = 0;
        bombKills++;
      }
    });

    if (bombKills > 0) {
      addFloatingText(engine.player.x, engine.player.y - 40, `EMP CLEARED +${bombKills * 500}`, '#00f0ff', 24);
    }
  };

  // Trigger Dash
  const triggerDash = () => {
    const engine = engineRef.current;
    if (engine.player.dashCooldown > 0 || gameState !== 'playing') return;

    sound.playJump();
    engine.player.isDashing = true;
    engine.player.dashTimer = 14;
    engine.player.dashCooldown = 65;
    engine.player.invulnerableTimer = 22;

    // Dash burst particles
    spawnExplosion(engine.player.x, engine.player.y, '#00f0ff', 16, 1.4);
    applyGridExplosion(engine.player.x, engine.player.y, 25, 200);
  };

  // Start / Restart Game
  const startGame = () => {
    initGrid();
    const engine = engineRef.current;
    engine.player.x = ARENA_WIDTH / 2;
    engine.player.y = ARENA_HEIGHT / 2;
    engine.player.vx = 0;
    engine.player.vy = 0;
    engine.player.shieldTimer = 0;
    engine.player.invulnerableTimer = 60;
    engine.particles = [];
    engine.geoms = [];
    engine.projectiles = [];
    engine.enemies = [];
    engine.powerups = [];
    engine.floatingTexts = [];
    engine.shockwaves = [];
    engine.fireTimer = 0;
    engine.waveTimer = 0;
    engine.slowMoTimer = 0;
    engine.multiplierTimer = 0;
    engine.geomsCollectedInWave = 0;
    engine.nextEnemyId = 1;
    engine.bossActive = false;

    setScore(0);
    setMultiplier(1);
    setHighestMultiplier(1);
    setLives(3);
    setBombs(3);
    setWave(1);
    setWeaponLevel(1);
    setShieldActive(false);
    setGameState('playing');
    sound.playWin();
  };

  // Spawn Wave Enemies
  const spawnWaveEnemies = (waveNum: number) => {
    const engine = engineRef.current;
    const isBossWave = waveNum % 5 === 0;

    if (isBossWave) {
      engine.bossActive = true;
      const bossHp = 600 + waveNum * 350;
      engine.enemies.push({
        id: engine.nextEnemyId++,
        type: 'boss',
        x: ARENA_WIDTH / 2,
        y: 160,
        vx: 0,
        vy: 0,
        angle: 0,
        hp: bossHp,
        maxHp: bossHp,
        radius: 48,
        color: '#ff0055',
        scoreValue: 15000 * waveNum,
        shootTimer: 0,
        stateTimer: 0,
        shieldAngle: 0,
        phase: 1
      });
      addFloatingText(ARENA_WIDTH / 2, 280, `⚠️ WARNING: BOSS APPROACHING! ⚠️`, '#ff0055', 28);
      sound.playExplosion();
      return;
    }

    // Standard Wave: spawn varied enemy types around arena borders
    const count = 8 + waveNum * 4;
    for (let i = 0; i < count; i++) {
      // Pick a random edge
      let ex = 0;
      let ey = 0;
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { ex = Math.random() * ARENA_WIDTH; ey = 30; }
      else if (edge === 1) { ex = ARENA_WIDTH - 30; ey = Math.random() * ARENA_HEIGHT; }
      else if (edge === 2) { ex = Math.random() * ARENA_WIDTH; ey = ARENA_HEIGHT - 30; }
      else { ex = 30; ey = Math.random() * ARENA_HEIGHT; }

      // Enemy type based on wave
      const rand = Math.random();
      let type: Enemy['type'] = 'diamond';
      let hp = 10;
      let radius = 16;
      let color = '#ff0055';
      let scoreVal = 100;

      if (rand < 0.35) {
        type = 'pinwheel';
        hp = 8;
        radius = 15;
        color = '#00f0ff';
        scoreVal = 80;
      } else if (rand < 0.65) {
        type = 'diamond';
        hp = 12;
        radius = 16;
        color = '#ff2255';
        scoreVal = 120;
      } else if (rand < 0.82 && waveNum >= 2) {
        type = 'snake';
        hp = 25;
        radius = 18;
        color = '#39ff14';
        scoreVal = 250;
      } else if (rand < 0.92 && waveNum >= 3) {
        type = 'phantom';
        hp = 20;
        radius = 17;
        color = '#a855f7';
        scoreVal = 300;
      } else if (waveNum >= 4) {
        type = 'blackhole';
        hp = 45;
        radius = 26;
        color = '#d946ef';
        scoreVal = 600;
      }

      engine.enemies.push({
        id: engine.nextEnemyId++,
        type,
        x: ex,
        y: ey,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        angle: Math.random() * Math.PI * 2,
        hp,
        maxHp: hp,
        radius,
        color,
        scoreValue: scoreVal,
        shootTimer: 0,
        stateTimer: 0,
        segments: type === 'snake' ? Array(6).fill({ x: ex, y: ey }) : undefined
      });
    }

    addFloatingText(ARENA_WIDTH / 2, ARENA_HEIGHT / 2 - 80, `SURGE WAVE ${waveNum}`, '#00f0ff', 32);
  };

  // Player Fire Logic
  const firePlayerWeapon = () => {
    const engine = engineRef.current;
    const player = engine.player;
    sound.playLaser();

    const forwardX = Math.cos(player.angle);
    const forwardY = Math.sin(player.angle);
    const rightX = -forwardY;
    const rightY = forwardX;

    const baseSpeed = 16;

    if (weaponLevel === 1) {
      // Twin Lasers
      engine.projectiles.push({
        x: player.x + rightX * 8,
        y: player.y + rightY * 8,
        vx: forwardX * baseSpeed,
        vy: forwardY * baseSpeed,
        radius: 4,
        color: '#00f0ff',
        damage: 15,
        isPlayer: true,
        type: 'laser',
        life: 70
      });
      engine.projectiles.push({
        x: player.x - rightX * 8,
        y: player.y - rightY * 8,
        vx: forwardX * baseSpeed,
        vy: forwardY * baseSpeed,
        radius: 4,
        color: '#00f0ff',
        damage: 15,
        isPlayer: true,
        type: 'laser',
        life: 70
      });
    } else if (weaponLevel === 2) {
      // 3-Way Spread Blaster
      const angles = [-0.18, 0, 0.18];
      angles.forEach((offset) => {
        const a = player.angle + offset;
        engine.projectiles.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(a) * baseSpeed,
          vy: Math.sin(a) * baseSpeed,
          radius: 5,
          color: '#ff007f',
          damage: 18,
          isPlayer: true,
          type: 'laser',
          life: 70
        });
      });
    } else if (weaponLevel === 3) {
      // 5-Way Spread + Homing Micro-Missiles
      [-0.25, -0.12, 0, 0.12, 0.25].forEach((offset) => {
        const a = player.angle + offset;
        engine.projectiles.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(a) * baseSpeed,
          vy: Math.sin(a) * baseSpeed,
          radius: 4.5,
          color: '#ffe600',
          damage: 20,
          isPlayer: true,
          type: 'laser',
          life: 70
        });
      });

      // Spawn 2 homing missiles
      [-1, 1].forEach((dir) => {
        engine.projectiles.push({
          x: player.x + rightX * (dir * 14),
          y: player.y + rightY * (dir * 14),
          vx: forwardX * 6 + rightX * (dir * 5),
          vy: forwardY * 6 + rightY * (dir * 5),
          radius: 6,
          color: '#39ff14',
          damage: 40,
          isPlayer: true,
          type: 'missile',
          life: 90
        });
      });
    } else {
      // Weapon Level 4+: Heavy Penetrating Ion Beam + Swarm Missiles
      for (let i = -2; i <= 2; i++) {
        const a = player.angle + i * 0.12;
        engine.projectiles.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(a) * (baseSpeed + 3),
          vy: Math.sin(a) * (baseSpeed + 3),
          radius: 6,
          color: '#00f0ff',
          damage: 32,
          isPlayer: true,
          type: 'laser',
          life: 80
        });
      }
      [-1.5, 1.5].forEach((dir) => {
        engine.projectiles.push({
          x: player.x + rightX * (dir * 16),
          y: player.y + rightY * (dir * 16),
          vx: forwardX * 8 + rightX * (dir * 6),
          vy: forwardY * 8 + rightY * (dir * 6),
          radius: 7,
          color: '#ff00ff',
          damage: 55,
          isPlayer: true,
          type: 'missile',
          life: 100
        });
      });
    }

    // Grid recoil distortion behind ship
    applyGridExplosion(player.x - forwardX * 25, player.y - forwardY * 25, 12, 100);
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      engine.keys[e.key.toLowerCase()] = true;
      engine.keys[e.code] = true;

      if (e.key === ' ' || e.key === 'Shift') {
        triggerDash();
      }
      if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'e') {
        triggerEmpBomb();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      engine.keys[e.key.toLowerCase()] = false;
      engine.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [bombs, gameState]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      const engine = engineRef.current;
      const player = engine.player;

      // Ensure canvas resolution matches internal arena dimensions
      if (canvas.width !== ARENA_WIDTH || canvas.height !== ARENA_HEIGHT) {
        canvas.width = ARENA_WIDTH;
        canvas.height = ARENA_HEIGHT;
        initGrid();
      }

      // --- GAME STATE PLAYING UPDATES ---
      if (gameState === 'playing') {
        const timeScale = engine.slowMoTimer > 0 ? 0.45 : 1;
        if (engine.slowMoTimer > 0) engine.slowMoTimer--;

        // 1. Multiplier Decay Timer
        if (engine.multiplierTimer > 0) {
          engine.multiplierTimer--;
          if (engine.multiplierTimer === 0 && multiplier > 1) {
            setMultiplier((prev) => Math.max(1, Math.floor(prev / 2)));
            engine.multiplierTimer = 240;
          }
        }

        // 2. Dash & Shield Timers
        if (player.dashCooldown > 0) player.dashCooldown--;
        if (player.dashTimer > 0) {
          player.dashTimer--;
          if (player.dashTimer === 0) player.isDashing = false;
        }
        if (player.invulnerableTimer > 0) player.invulnerableTimer--;
        if (player.shieldTimer > 0) {
          player.shieldTimer--;
          if (player.shieldTimer === 0) setShieldActive(false);
        }

        // 3. Movement Input (WASD / Arrows or Left Virtual Stick)
        let moveX = 0;
        let moveY = 0;

        if (engine.keys['w'] || engine.keys['arrowup'] || engine.keys['KeyW']) moveY -= 1;
        if (engine.keys['s'] || engine.keys['arrowdown'] || engine.keys['KeyS']) moveY += 1;
        if (engine.keys['a'] || engine.keys['arrowleft'] || engine.keys['KeyA']) moveX -= 1;
        if (engine.keys['d'] || engine.keys['arrowright'] || engine.keys['KeyD']) moveX += 1;

        if (engine.leftStick.active) {
          moveX = engine.leftStick.dirX;
          moveY = engine.leftStick.dirY;
        }

        const moveLen = Math.hypot(moveX, moveY);
        if (moveLen > 0) {
          const normX = moveX / moveLen;
          const normY = moveY / moveLen;
          const currentSpeed = (player.isDashing ? player.speed * 2.5 : player.speed) * timeScale;
          player.vx += normX * 0.95;
          player.vy += normY * 0.95;

          // Cap max speed
          const curSpeed = Math.hypot(player.vx, player.vy);
          if (curSpeed > currentSpeed) {
            player.vx = (player.vx / curSpeed) * currentSpeed;
            player.vy = (player.vy / curSpeed) * currentSpeed;
          }

          // Engine Thruster Sparks
          if (Math.random() < 0.6) {
            const oppAngle = Math.atan2(player.vy, player.vx) + Math.PI + (Math.random() - 0.5) * 0.5;
            engine.particles.push({
              x: player.x - Math.cos(player.angle) * 16,
              y: player.y - Math.sin(player.angle) * 16,
              vx: Math.cos(oppAngle) * (Math.random() * 4 + 2),
              vy: Math.sin(oppAngle) * (Math.random() * 4 + 2),
              size: Math.random() * 3 + 1.5,
              color: player.isDashing ? '#ffffff' : '#00f0ff',
              alpha: 0.9,
              decay: 0.04
            });
          }
        }

        // Friction / Inertia
        player.vx *= 0.93;
        player.vy *= 0.93;
        player.x += player.vx;
        player.y += player.vy;

        // Arena Clamping
        player.x = Math.max(player.radius + 10, Math.min(ARENA_WIDTH - player.radius - 10, player.x));
        player.y = Math.max(player.radius + 10, Math.min(ARENA_HEIGHT - player.radius - 10, player.y));

        // 4. Aiming & Shooting Direction
        let targetAngle = player.angle;
        let isShooting = false;

        if (engine.rightStick.active && engine.rightStick.isShooting) {
          targetAngle = Math.atan2(engine.rightStick.dirY, engine.rightStick.dirX);
          isShooting = true;
        } else if (engine.mouse.isDown || autoFire) {
          const dx = engine.mouse.x - player.x;
          const dy = engine.mouse.y - player.y;
          targetAngle = Math.atan2(dy, dx);
          isShooting = engine.mouse.isDown || autoFire;
        }

        player.angle = targetAngle;

        // Fire rate cooldown
        engine.fireTimer++;
        const fireInterval = weaponLevel >= 3 ? 6 : 8;
        if (isShooting && engine.fireTimer >= fireInterval) {
          engine.fireTimer = 0;
          firePlayerWeapon();
        }

        // 5. Update Projectiles
        for (let i = engine.projectiles.length - 1; i >= 0; i--) {
          const p = engine.projectiles[i];

          if (p.type === 'missile' && p.isPlayer) {
            // Find closest enemy for homing
            let closestEnemy: Enemy | null = null;
            let minDist = 700;
            engine.enemies.forEach((en) => {
              const d = Math.hypot(en.x - p.x, en.y - p.y);
              if (d < minDist) {
                minDist = d;
                closestEnemy = en;
              }
            });
            if (closestEnemy) {
              const tgtA = Math.atan2((closestEnemy as Enemy).y - p.y, (closestEnemy as Enemy).x - p.x);
              p.vx += Math.cos(tgtA) * 0.9;
              p.vy += Math.sin(tgtA) * 0.9;
              const spd = Math.hypot(p.vx, p.vy);
              if (spd > 14) {
                p.vx = (p.vx / spd) * 14;
                p.vy = (p.vy / spd) * 14;
              }
            }
          }

          p.x += p.vx * timeScale;
          p.y += p.vy * timeScale;
          p.life -= timeScale;

          // Out of bounds or life expired
          if (p.x < 0 || p.x > ARENA_WIDTH || p.y < 0 || p.y > ARENA_HEIGHT || p.life <= 0) {
            engine.projectiles.splice(i, 1);
            continue;
          }

          // Player projectile hitting enemies
          if (p.isPlayer) {
            for (let j = engine.enemies.length - 1; j >= 0; j--) {
              const en = engine.enemies[j];
              const dist = Math.hypot(en.x - p.x, en.y - p.y);
              if (dist < en.radius + p.radius) {
                en.hp -= p.damage;
                spawnExplosion(p.x, p.y, p.color, 6, 0.7);
                applyGridExplosion(p.x, p.y, 8, 80);

                if (p.type !== 'beam') {
                  engine.projectiles.splice(i, 1);
                }

                // Enemy Destroyed
                if (en.hp <= 0) {
                  sound.playExplosion();
                  addShake(en.type === 'boss' ? 24 : 8);
                  spawnExplosion(en.x, en.y, en.color, en.type === 'boss' ? 70 : 28, 1.3);
                  applyGridExplosion(en.x, en.y, en.type === 'boss' ? 50 : 25, 260);

                  // Score with multiplier
                  const pts = en.scoreValue * multiplier;
                  setScore((prev) => {
                    const next = prev + pts;
                    if (next > highScore) {
                      setHighScore(next);
                      localStorage.setItem('novaplay_geometry_wars_highscore', String(next));
                    }
                    return next;
                  });

                  addFloatingText(en.x, en.y, `+${pts}`, en.color, en.type === 'boss' ? 26 : 18);
                  spawnGeoms(en.x, en.y, en.type === 'boss' ? 20 : Math.floor(Math.random() * 3 + 2));

                  // Chance of Powerup Drop
                  if (Math.random() < 0.12 || en.type === 'boss') {
                    const pTypes: PowerUp['type'][] = ['shield', 'bomb', 'weapon', 'magnet', 'slowmo'];
                    const chosen = pTypes[Math.floor(Math.random() * pTypes.length)];
                    let pCol = '#00f0ff';
                    let pIcon = '⚡';
                    if (chosen === 'shield') { pCol = '#38bdf8'; pIcon = '🛡️'; }
                    else if (chosen === 'bomb') { pCol = '#f43f5e'; pIcon = '💣'; }
                    else if (chosen === 'weapon') { pCol = '#facc15'; pIcon = '⚔️'; }
                    else if (chosen === 'magnet') { pCol = '#a855f7'; pIcon = '🧲'; }
                    else if (chosen === 'slowmo') { pCol = '#34d399'; pIcon = '⏱️'; }

                    engine.powerups.push({
                      x: en.x,
                      y: en.y,
                      type: chosen,
                      color: pCol,
                      icon: pIcon,
                      life: 600
                    });
                  }

                  // If pinwheel, split into 2 mini pinwheels
                  if (en.type === 'pinwheel' && en.radius > 12) {
                    for (let s = 0; s < 2; s++) {
                      const splitAngle = Math.random() * Math.PI * 2;
                      engine.enemies.push({
                        id: engine.nextEnemyId++,
                        type: 'pinwheel',
                        x: en.x + Math.cos(splitAngle) * 15,
                        y: en.y + Math.sin(splitAngle) * 15,
                        vx: Math.cos(splitAngle) * 4,
                        vy: Math.sin(splitAngle) * 4,
                        angle: splitAngle,
                        hp: 6,
                        maxHp: 6,
                        radius: 10,
                        color: '#00f0ff',
                        scoreValue: 50
                      });
                    }
                  }

                  if (en.type === 'boss') {
                    engine.bossActive = false;
                    confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
                    addFloatingText(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 'BOSS DEFEATED! +1 BOMB +1 LIFE', '#ffe600', 32);
                    setBombs((b) => Math.min(5, b + 1));
                    setLives((l) => Math.min(5, l + 1));
                  }

                  engine.enemies.splice(j, 1);
                }
                break;
              }
            }
          } else {
            // Enemy Bullet hitting player
            const dist = Math.hypot(player.x - p.x, player.y - p.y);
            if (dist < player.radius + p.radius && player.invulnerableTimer <= 0) {
              engine.projectiles.splice(i, 1);
              if (player.shieldTimer > 0) {
                sound.playHit();
                player.shieldTimer = 0;
                setShieldActive(false);
                addFloatingText(player.x, player.y - 30, 'SHIELD BROKEN!', '#38bdf8', 20);
                spawnExplosion(player.x, player.y, '#38bdf8', 18);
              } else {
                handlePlayerHit();
              }
            }
          }
        }

        // 6. Update Enemies
        for (let i = engine.enemies.length - 1; i >= 0; i--) {
          const en = engine.enemies[i];
          const dx = player.x - en.x;
          const dy = player.y - en.y;
          const distToPlayer = Math.hypot(dx, dy);

          if (en.type === 'diamond') {
            // Aggressive Tracker
            const angle = Math.atan2(dy, dx);
            en.vx = Math.cos(angle) * (3.8 + wave * 0.15);
            en.vy = Math.sin(angle) * (3.8 + wave * 0.15);
            en.angle = angle;
          } else if (en.type === 'pinwheel') {
            // High speed bouncing
            en.angle += 0.12;
            if (en.x <= en.radius || en.x >= ARENA_WIDTH - en.radius) en.vx *= -1;
            if (en.y <= en.radius || en.y >= ARENA_HEIGHT - en.radius) en.vy *= -1;
          } else if (en.type === 'blackhole') {
            // Gravity singularity pulling player & nearby entities
            en.angle += 0.05;
            if (distToPlayer < 450) {
              const pullAngle = Math.atan2(en.y - player.y, en.x - player.x);
              const pullForce = (450 - distToPlayer) / 450 * 0.65;
              player.vx += Math.cos(pullAngle) * pullForce;
              player.vy += Math.sin(pullAngle) * pullForce;
            }
            applyGridExplosion(en.x, en.y, -14, 180);
          } else if (en.type === 'snake') {
            // Segmented snake
            const angle = Math.atan2(dy, dx);
            en.vx = Math.cos(angle) * 3.2;
            en.vy = Math.sin(angle) * 3.2;
            en.angle = angle;

            if (en.segments && en.segments.length > 0) {
              let prevX = en.x;
              let prevY = en.y;
              for (let s = 0; s < en.segments.length; s++) {
                const seg = en.segments[s];
                const segDx = prevX - seg.x;
                const segDy = prevY - seg.y;
                const segDist = Math.hypot(segDx, segDy);
                if (segDist > 16) {
                  seg.x += (segDx / segDist) * (segDist - 16);
                  seg.y += (segDy / segDist) * (segDist - 16);
                }
                prevX = seg.x;
                prevY = seg.y;
              }
            }
          } else if (en.type === 'phantom') {
            // Teleport & shoot
            en.stateTimer = (en.stateTimer || 0) + 1;
            if (en.stateTimer > 160) {
              en.stateTimer = 0;
              // Teleport
              spawnExplosion(en.x, en.y, en.color, 16);
              en.x = Math.random() * (ARENA_WIDTH - 200) + 100;
              en.y = Math.random() * (ARENA_HEIGHT - 200) + 100;
              spawnExplosion(en.x, en.y, en.color, 16);

              // Shoot 3 targeted darts
              for (let d = -0.2; d <= 0.2; d += 0.2) {
                const shotA = Math.atan2(player.y - en.y, player.x - en.x) + d;
                engine.projectiles.push({
                  x: en.x,
                  y: en.y,
                  vx: Math.cos(shotA) * 6,
                  vy: Math.sin(shotA) * 6,
                  radius: 4,
                  color: '#a855f7',
                  damage: 1,
                  isPlayer: false,
                  type: 'enemyBullet',
                  life: 140
                });
              }
            }
          } else if (en.type === 'boss') {
            // Boss AI & Patterns
            en.shootTimer = (en.shootTimer || 0) + 1;
            en.shieldAngle = (en.shieldAngle || 0) + 0.04;

            // Hover movement
            en.x = ARENA_WIDTH / 2 + Math.sin(Date.now() * 0.0015) * 350;
            en.y = 200 + Math.cos(Date.now() * 0.002) * 60;

            // Spiral bullet hell
            if (en.shootTimer % 18 === 0) {
              const numSpokes = 8;
              const rotOffset = (en.shootTimer * 0.1) % (Math.PI * 2);
              for (let s = 0; s < numSpokes; s++) {
                const bAngle = rotOffset + (s * Math.PI * 2) / numSpokes;
                engine.projectiles.push({
                  x: en.x,
                  y: en.y,
                  vx: Math.cos(bAngle) * 4.5,
                  vy: Math.sin(bAngle) * 4.5,
                  radius: 5,
                  color: '#ff0055',
                  damage: 1,
                  isPlayer: false,
                  type: 'enemyBullet',
                  life: 180
                });
              }
            }
          }

          en.x += en.vx * timeScale;
          en.y += en.vy * timeScale;

          // Check collision with player
          if (distToPlayer < en.radius + player.radius && player.invulnerableTimer <= 0) {
            if (player.shieldTimer > 0) {
              sound.playHit();
              player.shieldTimer = 0;
              setShieldActive(false);
              addFloatingText(player.x, player.y - 30, 'SHIELD BROKEN!', '#38bdf8', 20);
              spawnExplosion(player.x, player.y, '#38bdf8', 20);
              en.hp -= 30;
            } else {
              handlePlayerHit();
            }
          }
        }

        // 7. Update Geoms (Multiplier pick-ups)
        for (let i = engine.geoms.length - 1; i >= 0; i--) {
          const g = engine.geoms[i];
          const dx = player.x - g.x;
          const dy = player.y - g.y;
          const dist = Math.hypot(dx, dy);

          // Magnet range (base 180px, larger if powerup or dashing)
          const magnetDist = 200;
          if (dist < magnetDist) {
            const pull = (magnetDist - dist) / magnetDist * 8;
            g.vx += (dx / dist) * pull;
            g.vy += (dy / dist) * pull;
          }

          g.vx *= 0.92;
          g.vy *= 0.92;
          g.x += g.vx;
          g.y += g.vy;
          g.life--;

          if (dist < player.radius + 12) {
            sound.playCollect();
            engine.geoms.splice(i, 1);
            engine.geomsCollectedInWave++;

            // Multiplier level up every 8 geoms
            if (engine.geomsCollectedInWave % 8 === 0 && multiplier < 100) {
              setMultiplier((prev) => {
                const next = Math.min(100, prev * 2);
                setHighestMultiplier((h) => Math.max(h, next));
                addFloatingText(player.x, player.y - 25, `${next}X MULTIPLIER!`, '#39ff14', 22);
                return next;
              });
              engine.multiplierTimer = 450; // reset decay timer
            }
            continue;
          }

          if (g.life <= 0) {
            engine.geoms.splice(i, 1);
          }
        }

        // 8. Update Powerups
        for (let i = engine.powerups.length - 1; i >= 0; i--) {
          const pu = engine.powerups[i];
          const dist = Math.hypot(player.x - pu.x, player.y - pu.y);
          pu.life--;

          if (dist < player.radius + 24) {
            sound.playPowerup();
            engine.powerups.splice(i, 1);

            if (pu.type === 'shield') {
              player.shieldTimer = 600;
              setShieldActive(true);
              addFloatingText(player.x, player.y - 30, 'OVERDRIVE SHIELD!', '#38bdf8', 22);
            } else if (pu.type === 'bomb') {
              setBombs((b) => Math.min(5, b + 1));
              addFloatingText(player.x, player.y - 30, '+1 EMP BOMB!', '#f43f5e', 22);
            } else if (pu.type === 'weapon') {
              setWeaponLevel((wl) => Math.min(4, wl + 1));
              addFloatingText(player.x, player.y - 30, 'WEAPON UPGRADE!', '#facc15', 24);
            } else if (pu.type === 'slowmo') {
              engine.slowMoTimer = 300;
              addFloatingText(player.x, player.y - 30, 'CHRONO SLOW-MO!', '#34d399', 22);
            } else if (pu.type === 'magnet') {
              // Collect all geoms instantly
              engine.geoms.forEach((g) => {
                g.vx += (player.x - g.x) * 0.3;
                g.vy += (player.y - g.y) * 0.3;
              });
              addFloatingText(player.x, player.y - 30, 'GEOM SUPER-MAGNET!', '#a855f7', 22);
            }
            continue;
          }

          if (pu.life <= 0) {
            engine.powerups.splice(i, 1);
          }
        }

        // 9. Wave Progression Check
        if (engine.enemies.length === 0 && !engine.bossActive) {
          engine.waveTimer++;
          if (engine.waveTimer > 70) {
            engine.waveTimer = 0;
            setWave((w) => {
              const nextWave = w + 1;
              spawnWaveEnemies(nextWave);
              return nextWave;
            });
          }
        }

        // Initial wave spawn on first frame
        if (wave === 1 && engine.enemies.length === 0 && engine.waveTimer === 0) {
          spawnWaveEnemies(1);
        }
      }

      // Handle Player Hit helper inside loop context
      function handlePlayerHit() {
        sound.playHit();
        addShake(18);
        setMultiplier(1);
        spawnExplosion(player.x, player.y, '#ff0055', 30, 1.4);

        setLives((l) => {
          const next = l - 1;
          if (next <= 0) {
            setGameState('gameover');
            sound.playGameOver();
          } else {
            player.invulnerableTimer = 120; // 2 seconds invulnerability
            addFloatingText(player.x, player.y - 35, 'HULL CRITICAL!', '#ff0055', 24);
          }
          return next;
        });
      }

      // --- SPRING GRID PHYSICS SIMULATION ---
      const grid = engine.grid;
      const springK = 0.045;
      const damping = 0.88;

      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const pt = grid[r][c];
          // Spring force towards resting point
          const fx = (pt.origX - pt.x) * springK;
          const fy = (pt.origY - pt.y) * springK;

          pt.vx = (pt.vx + fx) * damping;
          pt.vy = (pt.vy + fy) * damping;
          pt.x += pt.vx;
          pt.y += pt.vy;
        }
      }

      // --- UPDATE PARTICLES & FLOATING TEXTS ---
      for (let i = engine.particles.length - 1; i >= 0; i--) {
        const pt = engine.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vx *= 0.96;
        pt.vy *= 0.96;
        pt.alpha -= pt.decay;
        if (pt.alpha <= 0) engine.particles.splice(i, 1);
      }

      for (let i = engine.floatingTexts.length - 1; i >= 0; i--) {
        const ft = engine.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.016;
        if (ft.alpha <= 0) engine.floatingTexts.splice(i, 1);
      }

      // Update Shockwaves
      for (let i = engine.shockwaves.length - 1; i >= 0; i--) {
        const sw = engine.shockwaves[i];
        sw.radius += 24;
        sw.alpha = 1 - sw.radius / sw.maxRadius;
        if (sw.radius >= sw.maxRadius) engine.shockwaves.splice(i, 1);
      }

      // Screen shake decay
      if (engine.shake > 0) engine.shake *= 0.9;

      // --- RENDER PASS ---
      ctx.save();

      // Apply Shake
      if (engine.shake > 0.5) {
        const sx = (Math.random() - 0.5) * engine.shake;
        const sy = (Math.random() - 0.5) * engine.shake;
        ctx.translate(sx, sy);
      }

      // Dark space arena background
      ctx.fillStyle = '#050114';
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // Radial center nebula glow
      const grad = ctx.createRadialGradient(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 80, ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 750);
      grad.addColorStop(0, 'rgba(168, 85, 247, 0.12)');
      grad.addColorStop(0.5, 'rgba(0, 240, 255, 0.06)');
      grad.addColorStop(1, 'rgba(5, 1, 20, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // Draw Warping Deformable Vector Grid
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.28)';

      // Horizontal grid lines
      for (let r = 0; r < grid.length; r++) {
        ctx.beginPath();
        for (let c = 0; c < grid[r].length; c++) {
          const pt = grid[r][c];
          if (c === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      // Vertical grid lines
      if (grid.length > 0) {
        for (let c = 0; c < grid[0].length; c++) {
          ctx.beginPath();
          for (let r = 0; r < grid.length; r++) {
            const pt = grid[r][c];
            if (r === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        }
      }

      // Arena Outer Border Neon Line
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.strokeRect(10, 10, ARENA_WIDTH - 20, ARENA_HEIGHT - 20);
      ctx.shadowBlur = 0;

      // Draw Shockwaves
      engine.shockwaves.forEach((sw) => {
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 4;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Draw Geoms (Multiplier crystals)
      engine.geoms.forEach((g) => {
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.fillStyle = g.color;
        ctx.shadowColor = g.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // Draw Powerups
      engine.powerups.forEach((pu) => {
        ctx.save();
        ctx.translate(pu.x, pu.y);
        ctx.shadowColor = pu.color;
        ctx.shadowBlur = 16;
        ctx.strokeStyle = pu.color;
        ctx.lineWidth = 2.5;

        // Pulsing ring
        const pSize = 18 + Math.sin(Date.now() * 0.008) * 3;
        ctx.strokeRect(-pSize, -pSize, pSize * 2, pSize * 2);

        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pu.icon, 0, 0);
        ctx.restore();
      });

      // Draw Enemies
      engine.enemies.forEach((en) => {
        ctx.save();
        ctx.translate(en.x, en.y);
        ctx.rotate(en.angle);
        ctx.shadowColor = en.color;
        ctx.shadowBlur = 14;

        if (en.type === 'pinwheel') {
          // Spinning Neon Triangles
          ctx.strokeStyle = en.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, -en.radius);
          ctx.lineTo(en.radius, en.radius * 0.7);
          ctx.lineTo(-en.radius, en.radius * 0.7);
          ctx.closePath();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, en.radius);
          ctx.lineTo(-en.radius, -en.radius * 0.7);
          ctx.lineTo(en.radius, -en.radius * 0.7);
          ctx.closePath();
          ctx.stroke();
        } else if (en.type === 'diamond') {
          // Sharp Glowing Diamond Stalker
          ctx.strokeStyle = en.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(en.radius * 1.3, 0);
          ctx.lineTo(0, en.radius * 0.8);
          ctx.lineTo(-en.radius * 1.3, 0);
          ctx.lineTo(0, -en.radius * 0.8);
          ctx.closePath();
          ctx.stroke();

          ctx.fillStyle = en.color;
          ctx.globalAlpha = 0.35;
          ctx.fill();
          ctx.globalAlpha = 1;
        } else if (en.type === 'blackhole') {
          // Gravitational Singularity Core
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = en.color;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Swirling accretion ring
          ctx.beginPath();
          ctx.arc(0, 0, en.radius * 1.4, 0, Math.PI * 1.4);
          ctx.strokeStyle = '#ffe600';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (en.type === 'snake') {
          // Draw Snake Head
          ctx.fillStyle = en.color;
          ctx.beginPath();
          ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (en.type === 'phantom') {
          // Phasing Hexagon
          ctx.strokeStyle = en.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let h = 0; h < 6; h++) {
            const hA = (h * Math.PI) / 3;
            const hx = Math.cos(hA) * en.radius;
            const hy = Math.sin(hA) * en.radius;
            if (h === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.stroke();
        } else if (en.type === 'boss') {
          // CYBER CORE TITAN BOSS
          ctx.fillStyle = '#1e1b4b';
          ctx.strokeStyle = en.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Inner rotating reactor
          ctx.fillStyle = '#ff0055';
          ctx.beginPath();
          ctx.arc(0, 0, en.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();

          // Boss Health Bar above boss
          ctx.restore(); // Exit rotated context
          ctx.save();
          ctx.translate(en.x, en.y - en.radius - 24);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(-60, 0, 120, 8);
          ctx.fillStyle = '#ff0055';
          ctx.fillRect(-60, 0, (en.hp / en.maxHp) * 120, 8);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(-60, 0, 120, 8);
        }

        ctx.restore();

        // Draw snake segments in world space
        if (en.type === 'snake' && en.segments) {
          en.segments.forEach((seg, sIdx) => {
            ctx.save();
            ctx.translate(seg.x, seg.y);
            ctx.fillStyle = sIdx % 2 === 0 ? '#39ff14' : '#ffe600';
            ctx.shadowColor = '#39ff14';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(0, 0, en.radius * 0.75, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
        }
      });

      // Draw Projectiles
      engine.projectiles.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;

        if (p.type === 'missile') {
          const missileAngle = Math.atan2(p.vy, p.vx);
          ctx.rotate(missileAngle);
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(-6, -4);
          ctx.lineTo(-4, 0);
          ctx.lineTo(-6, 4);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();

          // White hot core
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Particles
      engine.particles.forEach((pt) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        if (pt.glow) {
          ctx.shadowColor = pt.color;
          ctx.shadowBlur = 8;
        }
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Player Ship (Vector Arrowhead Geo-Fighter)
      if (gameState === 'playing' || gameState === 'menu') {
        const isFlickering = player.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0;

        if (!isFlickering) {
          ctx.save();
          ctx.translate(player.x, player.y);
          ctx.rotate(player.angle);

          // Ship Neon Glow
          ctx.shadowColor = player.isDashing ? '#ffffff' : '#00f0ff';
          ctx.shadowBlur = player.isDashing ? 28 : 16;

          // Outer Arrowhead Hull
          ctx.strokeStyle = player.isDashing ? '#ffffff' : '#00f0ff';
          ctx.lineWidth = 3;
          ctx.fillStyle = '#041226';

          ctx.beginPath();
          ctx.moveTo(player.radius * 1.4, 0);
          ctx.lineTo(-player.radius, player.radius * 0.85);
          ctx.lineTo(-player.radius * 0.4, 0);
          ctx.lineTo(-player.radius, -player.radius * 0.85);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Cockpit Inner Neon Diamond
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(player.radius * 0.6, 0);
          ctx.lineTo(0, player.radius * 0.35);
          ctx.lineTo(-player.radius * 0.2, 0);
          ctx.lineTo(0, -player.radius * 0.35);
          ctx.closePath();
          ctx.fill();

          // Active Overdrive Shield Aura
          if (player.shieldTimer > 0) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, player.radius * 1.8, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.restore();
        }
      }

      // Draw Floating Texts
      engine.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 10;
        ctx.font = `900 ${ft.size}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore(); // Restore shake

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, wave, multiplier, weaponLevel, highScore, autoFire]);

  // Touch Controller Handlers for Mobile Dual Joysticks
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const halfWidth = rect.width / 2;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const clientX = touch.clientX - rect.left;
      const clientY = touch.clientY - rect.top;

      if (clientX < halfWidth) {
        // Left Joystick (Movement)
        engineRef.current.leftStick = {
          active: true,
          startX: clientX,
          startY: clientY,
          curX: clientX,
          curY: clientY,
          dirX: 0,
          dirY: 0
        };
      } else {
        // Right Joystick (Aim & Fire)
        engineRef.current.rightStick = {
          active: true,
          startX: clientX,
          startY: clientY,
          curX: clientX,
          curY: clientY,
          dirX: 0,
          dirY: 0,
          isShooting: true
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const halfWidth = rect.width / 2;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const clientX = touch.clientX - rect.left;
      const clientY = touch.clientY - rect.top;

      if (clientX < halfWidth && engineRef.current.leftStick.active) {
        const dx = clientX - engineRef.current.leftStick.startX;
        const dy = clientY - engineRef.current.leftStick.startY;
        const dist = Math.hypot(dx, dy);
        const maxRadius = 50;
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);

        engineRef.current.leftStick.curX = engineRef.current.leftStick.startX + Math.cos(angle) * clampedDist;
        engineRef.current.leftStick.curY = engineRef.current.leftStick.startY + Math.sin(angle) * clampedDist;
        engineRef.current.leftStick.dirX = dx / maxRadius;
        engineRef.current.leftStick.dirY = dy / maxRadius;
      } else if (clientX >= halfWidth && engineRef.current.rightStick.active) {
        const dx = clientX - engineRef.current.rightStick.startX;
        const dy = clientY - engineRef.current.rightStick.startY;
        const dist = Math.hypot(dx, dy);
        const maxRadius = 50;
        const angle = Math.atan2(dy, dx);

        engineRef.current.rightStick.dirX = Math.cos(angle);
        engineRef.current.rightStick.dirY = Math.sin(angle);
        engineRef.current.rightStick.isShooting = dist > 8;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const halfWidth = rect.width / 2;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const clientX = touch.clientX - rect.left;
      if (clientX < halfWidth) {
        engineRef.current.leftStick.active = false;
        engineRef.current.leftStick.dirX = 0;
        engineRef.current.leftStick.dirY = 0;
      } else {
        engineRef.current.rightStick.active = false;
        engineRef.current.rightStick.isShooting = false;
      }
    }
  };

  // Mouse Move / Down Handlers for Desktop
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = ARENA_WIDTH / rect.width;
    const scaleY = ARENA_HEIGHT / rect.height;
    engineRef.current.mouse.x = (e.clientX - rect.left) * scaleX;
    engineRef.current.mouse.y = (e.clientY - rect.top) * scaleY;
  };

  const handleMouseDown = () => {
    engineRef.current.mouse.isDown = true;
  };

  const handleMouseUp = () => {
    engineRef.current.mouse.isDown = false;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[650px] md:h-[750px] bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)] select-none flex flex-col items-center justify-center font-sans"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Canvas Viewport */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className="w-full h-full object-contain cursor-crosshair"
      />

      {/* TOP HEADS-UP DISPLAY (HUD) */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
          {/* Score & Multiplier */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold">SCORE</span>
              <span className="text-2xl md:text-3xl font-black text-white tracking-wider drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">
                {score.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-lime-500/20 border border-lime-400 text-lime-400 font-black text-sm md:text-base animate-pulse">
                {multiplier}X MULTIPLIER
              </span>
              <span className="text-xs text-slate-400">SURGE WAVE {wave}</span>
            </div>
          </div>

          {/* Lives & EMP Bombs */}
          <div className="flex items-center gap-4">
            {/* Lives */}
            <div className="flex items-center gap-1 bg-slate-900/80 border border-rose-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md">
              <Flame className="w-5 h-5 text-rose-500 fill-rose-500" />
              <span className="font-black text-lg text-white">x{lives}</span>
            </div>

            {/* Smart Bombs */}
            <div className="flex items-center gap-1 bg-slate-900/80 border border-cyan-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md">
              <Bomb className="w-5 h-5 text-cyan-400 fill-cyan-400" />
              <span className="font-black text-lg text-cyan-400">x{bombs}</span>
            </div>

            {/* Weapon Level */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 border border-amber-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="font-bold text-xs text-amber-400">LVL {weaponLevel}</span>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE ACTION BUTTONS OVERLAY */}
      {gameState === 'playing' && (
        <div className="absolute bottom-6 right-6 flex items-center gap-3 z-20 md:hidden">
          {/* DASH BUTTON */}
          <button
            onClick={triggerDash}
            className="w-14 h-14 rounded-full bg-cyan-600/80 active:bg-cyan-500 border-2 border-cyan-300 text-white font-black text-xs shadow-lg flex flex-col items-center justify-center backdrop-blur-md active:scale-95 transition-transform"
          >
            <Zap className="w-5 h-5" />
            <span>DASH</span>
          </button>

          {/* EMP BOMB BUTTON */}
          <button
            onClick={triggerEmpBomb}
            disabled={bombs <= 0}
            className={`w-14 h-14 rounded-full border-2 text-white font-black text-xs shadow-lg flex flex-col items-center justify-center backdrop-blur-md active:scale-95 transition-transform ${
              bombs > 0
                ? 'bg-rose-600/80 active:bg-rose-500 border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                : 'bg-slate-800/80 border-slate-600 opacity-40'
            }`}
          >
            <Bomb className="w-5 h-5" />
            <span>EMP</span>
          </button>
        </div>
      )}

      {/* MAIN MENU OVERLAY */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xs tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>360° Vector Twin-Stick Space Arena</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 tracking-wider mb-2 drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">
            CYBER GEOMETRY WARS
          </h1>
          <p className="text-cyan-300/80 max-w-lg text-sm md:text-base font-medium mb-6">
            Engage hostile neon swarms, warp real-time grid space, collect multiplier Geoms, and unleash devastating EMP shockwaves!
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl w-full mb-8 text-xs">
            <div className="bg-slate-900/90 border border-cyan-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <Crosshair className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-slate-200">WASD / Stick</span>
              <span className="text-slate-400">360° Movement</span>
            </div>
            <div className="bg-slate-900/90 border border-pink-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <Zap className="w-5 h-5 text-pink-400" />
              <span className="font-bold text-slate-200">Space / Dash</span>
              <span className="text-slate-400">Warp Dodge</span>
            </div>
            <div className="bg-slate-900/90 border border-rose-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <Bomb className="w-5 h-5 text-rose-400" />
              <span className="font-bold text-slate-200">E / EMP Button</span>
              <span className="text-slate-400">Smart Bomb Nuke</span>
            </div>
            <div className="bg-slate-900/90 border border-lime-500/30 p-3 rounded-xl flex flex-col items-center gap-1">
              <Crown className="w-5 h-5 text-lime-400" />
              <span className="font-bold text-slate-200">Geom Crystals</span>
              <span className="text-slate-400">Up to 100X Score</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={startGame}
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-lg tracking-wider uppercase shadow-[0_0_30px_rgba(0,240,255,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>ENGAGE SURGE</span>
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

      {/* GAME OVER OVERLAY */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 z-30 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-500 mb-4 shadow-[0_0_25px_rgba(244,63,94,0.6)]">
            <Flame className="w-8 h-8" />
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-rose-500 tracking-wider mb-2">
            HULL VAPORIZED
          </h2>
          <p className="text-slate-400 text-sm mb-6">Your vector core was overwhelmed by the cyber surge.</p>

          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 max-w-sm w-full mb-6 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Final Score:</span>
              <span className="text-xl font-black text-cyan-400">{score.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Highest Multiplier:</span>
              <span className="font-bold text-lime-400">{highestMultiplier}X</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Surge Wave Reached:</span>
              <span className="font-bold text-amber-400">WAVE {wave}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800">
              <span className="text-slate-400">High Score Record:</span>
              <span className="font-bold text-white">{highScore.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-base tracking-wider uppercase shadow-[0_0_25px_rgba(0,240,255,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>RE-ENGAGE SYSTEM</span>
          </button>
        </div>
      )}
    </div>
  );
};
