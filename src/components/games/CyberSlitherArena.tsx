import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Trophy,
  Sparkles,
  Zap,
  Flame,
  Crown,
  Play,
  RotateCcw,
  Palette,
  Compass,
  Crosshair,
  ShieldAlert,
  Radar,
  Swords
} from 'lucide-react';
import { sound } from '../../utils/audio';

// --- TYPES & INTERFACES ---
interface Point {
  x: number;
  y: number;
}

interface SnakeSegment {
  x: number;
  y: number;
}

interface SnakeSkin {
  id: string;
  name: string;
  headColor: string;
  bodyColors: string[];
  eyeColor: string;
  glowColor: string;
  price: number;
  icon: string;
}

interface Snake {
  id: string;
  name: string;
  isPlayer: boolean;
  x: number;
  y: number;
  angle: number;
  targetAngle: number;
  speed: number;
  baseSpeed: number;
  boostSpeed: number;
  isBoosting: boolean;
  length: number;
  thickness: number;
  body: SnakeSegment[];
  skin: SnakeSkin;
  score: number;
  kills: number;
  dead: boolean;
  aiTimer?: number;
  aiState?: 'wander' | 'hunt' | 'flee' | 'boost';
}

interface FoodOrb {
  id: number;
  x: number;
  y: number;
  radius: number;
  value: number;
  color: string;
  pulsePhase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

const SKINS: SnakeSkin[] = [
  {
    id: 'cyber-cobra',
    name: 'Cyber Cobra',
    headColor: '#06b6d4',
    bodyColors: ['#06b6d4', '#0891b2', '#0284c7', '#38bdf8'],
    eyeColor: '#ffffff',
    glowColor: '#00f0ff',
    price: 0,
    icon: '⚡',
  },
  {
    id: 'solar-inferno',
    name: 'Solar Inferno',
    headColor: '#f97316',
    bodyColors: ['#f97316', '#ea580c', '#ef4444', '#facc15'],
    eyeColor: '#fffbeb',
    glowColor: '#ff6600',
    price: 150,
    icon: '🔥',
  },
  {
    id: 'toxic-matrix',
    name: 'Toxic Viper',
    headColor: '#10b981',
    bodyColors: ['#10b981', '#059669', '#84cc16', '#a3e635'],
    eyeColor: '#ecfdf5',
    glowColor: '#10b981',
    price: 300,
    icon: '🧪',
  },
  {
    id: 'void-phantom',
    name: 'Void Galaxy',
    headColor: '#a855f7',
    bodyColors: ['#a855f7', '#9333ea', '#c084fc', '#e879f9'],
    eyeColor: '#faf5ff',
    glowColor: '#c084fc',
    price: 500,
    icon: '🔮',
  },
  {
    id: 'rainbow-dragon',
    name: 'Rainbow Prism',
    headColor: '#ec4899',
    bodyColors: ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#8b5cf6'],
    eyeColor: '#ffffff',
    glowColor: '#f43f5e',
    price: 750,
    icon: '🌈',
  },
  {
    id: 'golden-emperor',
    name: 'Golden Sovereign',
    headColor: '#eab308',
    bodyColors: ['#eab308', '#ca8a04', '#fef08a', '#fbbf24', '#d97706'],
    eyeColor: '#ffffff',
    glowColor: '#ffd700',
    price: 1000,
    icon: '👑',
  },
];

const BOT_NAMES = [
  'Viper Prime', 'Shadow Fang', 'Neon Hunter', 'Apex Drake', 'Plasma Beast',
  'Quantum Rex', 'Laser Hydra', 'Omega Worm', 'Void Stalker', 'Cyber Ghost',
  'Solar Python', 'Toxic Fang', 'Blaze Mamba', 'Hyper Wyrm'
];

const ARENA_RADIUS = 1800;
const INITIAL_SNAKE_LENGTH = 20;
const SEGMENT_DISTANCE = 8;
const BASE_SPEED = 3.6;
const BOOST_SPEED = 6.4;
const TOTAL_BOTS = 9;
const FOOD_TARGET_COUNT = 320;

export const CyberSlitherArena: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [playerName, setPlayerName] = useState<string>('CyberSnake');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_slither_highscore') || '0', 10);
  });
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_slither_coins') || '100', 10);
  });
  const [activeSkinId, setActiveSkinId] = useState<string>('cyber-cobra');
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('cyber_slither_skins') || '["cyber-cobra"]');
  });
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());
  const [showSkins, setShowSkins] = useState<boolean>(false);
  const [playerRank, setPlayerRank] = useState<number>(1);
  const [playerKills, setPlayerKills] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number; isPlayer: boolean }[]>([]);

  // Engine Refs
  const engineRef = useRef({
    playerSnake: null as Snake | null,
    bots: [] as Snake[],
    foods: [] as FoodOrb[],
    particles: [] as Particle[],
    nextFoodId: 1,
    cameraX: 0,
    cameraY: 0,
    mouseX: 0, // relative to canvas center
    mouseY: 0,
    isBoosting: false,
    screenShake: 0,
    animationFrameId: 0,
    viewportWidth: 800,
    viewportHeight: 600,
  });

  // Spawn Food
  const spawnFoodOrb = (x?: number, y?: number, value: number = 1, color?: string): FoodOrb => {
    const eng = engineRef.current;
    let fx = x;
    let fy = y;

    if (fx === undefined || fy === undefined) {
      // Random position inside circle arena
      const r = Math.sqrt(Math.random()) * (ARENA_RADIUS - 60);
      const theta = Math.random() * Math.PI * 2;
      fx = Math.cos(theta) * r;
      fy = Math.sin(theta) * r;
    }

    const foodColors = ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#f43f5e'];
    const orbColor = color || foodColors[Math.floor(Math.random() * foodColors.length)];

    return {
      id: eng.nextFoodId++,
      x: fx,
      y: fy,
      radius: Math.min(3.5 + Math.sqrt(value) * 1.8, 12),
      value,
      color: orbColor,
      pulsePhase: Math.random() * Math.PI * 2,
    };
  };

  // Create Snake
  const createSnake = (id: string, name: string, isPlayer: boolean, skin: SnakeSkin, spawnX?: number, spawnY?: number): Snake => {
    let sx = spawnX;
    let sy = spawnY;

    if (sx === undefined || sy === undefined) {
      const r = Math.sqrt(Math.random()) * (ARENA_RADIUS - 300);
      const theta = Math.random() * Math.PI * 2;
      sx = Math.cos(theta) * r;
      sy = Math.sin(theta) * r;
    }

    const angle = Math.random() * Math.PI * 2;
    const body: SnakeSegment[] = [];

    // Initialize segments trailing behind head
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
      body.push({
        x: sx - Math.cos(angle) * i * SEGMENT_DISTANCE,
        y: sy - Math.sin(angle) * i * SEGMENT_DISTANCE,
      });
    }

    return {
      id,
      name,
      isPlayer,
      x: sx,
      y: sy,
      angle,
      targetAngle: angle,
      speed: BASE_SPEED,
      baseSpeed: BASE_SPEED,
      boostSpeed: BOOST_SPEED,
      isBoosting: false,
      length: INITIAL_SNAKE_LENGTH,
      thickness: 12,
      body,
      skin,
      score: 10,
      kills: 0,
      dead: false,
      aiTimer: 0,
      aiState: 'wander',
    };
  };

  // Initialize Game World
  const initGameWorld = useCallback(() => {
    const eng = engineRef.current;
    const playerSkin = SKINS.find((s) => s.id === activeSkinId) || SKINS[0];

    // Create player at center
    const player = createSnake('player', playerName || 'CyberSnake', true, playerSkin, 0, 0);
    eng.playerSnake = player;
    eng.cameraX = 0;
    eng.cameraY = 0;
    eng.screenShake = 0;
    eng.particles = [];

    // Create AI bots
    eng.bots = [];
    for (let i = 0; i < TOTAL_BOTS; i++) {
      const botSkin = SKINS[Math.floor(Math.random() * SKINS.length)];
      const botName = BOT_NAMES[i % BOT_NAMES.length];
      eng.bots.push(createSnake(`bot-${i}`, botName, false, botSkin));
    }

    // Populate food
    eng.foods = [];
    for (let i = 0; i < FOOD_TARGET_COUNT; i++) {
      eng.foods.push(spawnFoodOrb());
    }

    setScore(10);
    setPlayerKills(0);
    setPlayerRank(1);
  }, [activeSkinId, playerName]);

  // Turn dead snake into food orbs
  const explodeSnakeIntoFood = (snake: Snake) => {
    const eng = engineRef.current;
    const count = Math.min(Math.floor(snake.length * 1.4), 80);

    for (let i = 0; i < count; i++) {
      const segIndex = Math.floor((i / count) * snake.body.length);
      const seg = snake.body[segIndex] || { x: snake.x, y: snake.y };
      const spreadX = seg.x + (Math.random() - 0.5) * 30;
      const spreadY = seg.y + (Math.random() - 0.5) * 30;
      const val = Math.max(2, Math.floor(snake.score / (count * 1.2)));

      eng.foods.push(spawnFoodOrb(spreadX, spreadY, val, snake.skin.headColor));
    }

    // Explosion blast particles
    for (let p = 0; p < 25; p++) {
      const pAngle = Math.random() * Math.PI * 2;
      const pSpeed = Math.random() * 6 + 2;
      eng.particles.push({
        x: snake.x,
        y: snake.y,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed,
        color: snake.skin.glowColor,
        size: Math.random() * 5 + 3,
        alpha: 1,
        decay: 0.03,
      });
    }
  };

  // Start Playing
  const handleStartGame = () => {
    initGameWorld();
    setGameState('playing');
    sound.playPowerup();
  };

  const handleRestart = () => {
    initGameWorld();
    setGameState('playing');
    sound.playPowerup();
  };

  // Skins Purchase
  const handleBuySkin = (skin: SnakeSkin) => {
    if (unlockedSkins.includes(skin.id)) {
      setActiveSkinId(skin.id);
      sound.playClick();
      return;
    }
    if (coins >= skin.price) {
      const newCoins = coins - skin.price;
      const newUnlocked = [...unlockedSkins, skin.id];
      setCoins(newCoins);
      setUnlockedSkins(newUnlocked);
      setActiveSkinId(skin.id);
      localStorage.setItem('cyber_slither_coins', newCoins.toString());
      localStorage.setItem('cyber_slither_skins', JSON.stringify(newUnlocked));
      sound.playSlitherKill();
    } else {
      sound.playLaser();
    }
  };

  // Sound Toggle
  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // --- MAIN RENDER & PHYSICS TICK LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const eng = engineRef.current;

    const tick = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      eng.viewportWidth = width;
      eng.viewportHeight = height;

      // 1. UPDATE GAME PHYSICS
      if (gameState === 'playing' && eng.playerSnake && !eng.playerSnake.dead) {
        const player = eng.playerSnake;

        // Player Steering: Aim towards mouse/touch relative to center
        if (eng.mouseX !== 0 || eng.mouseY !== 0) {
          player.targetAngle = Math.atan2(eng.mouseY, eng.mouseX);
        }

        // Smooth angle interpolation
        let angleDiff = player.targetAngle - player.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        player.angle += angleDiff * 0.14;

        // Boosting logic
        player.isBoosting = eng.isBoosting && player.score > 20;
        if (player.isBoosting) {
          player.speed = player.boostSpeed;
          // Burn mass over time
          if (Math.random() < 0.25) {
            player.score = Math.max(10, player.score - 1);
            player.length = Math.max(INITIAL_SNAKE_LENGTH, Math.floor(INITIAL_SNAKE_LENGTH + player.score * 0.2));
            // Drop glowing tail orbs
            const tail = player.body[player.body.length - 1];
            if (tail) {
              eng.foods.push(spawnFoodOrb(tail.x, tail.y, 1, player.skin.glowColor));
            }
          }
        } else {
          player.speed = player.baseSpeed;
        }

        // Move Player Head
        player.x += Math.cos(player.angle) * player.speed;
        player.y += Math.sin(player.angle) * player.speed;
        player.thickness = Math.min(12 + Math.sqrt(player.score) * 0.45, 28);

        // Update body segment kinematics
        player.body.unshift({ x: player.x, y: player.y });
        while (player.body.length > player.length) {
          player.body.pop();
        }

        // Check Arena Boundary Collision
        const distFromCenter = Math.hypot(player.x, player.y);
        if (distFromCenter >= ARENA_RADIUS) {
          // Crash into electric barrier
          player.dead = true;
          sound.playCrash();
          eng.screenShake = 18;
          explodeSnakeIntoFood(player);
          setGameState('gameover');
        }

        // Camera follow smoothly
        eng.cameraX += (player.x - eng.cameraX) * 0.1;
        eng.cameraY += (player.y - eng.cameraY) * 0.1;

        // 2. UPDATE AI BOTS
        eng.bots.forEach((bot) => {
          if (bot.dead) return;

          bot.aiTimer = (bot.aiTimer || 0) + 1;

          // AI decision logic every 20 ticks
          if (bot.aiTimer % 20 === 0) {
            // Find closest food
            let closestFood: FoodOrb | null = null;
            let minFoodDist = 300;
            for (let f of eng.foods) {
              const d = Math.hypot(f.x - bot.x, f.y - bot.y);
              if (d < minFoodDist) {
                minFoodDist = d;
                closestFood = f;
              }
            }

            // Check if player or other bot is nearby
            const distToPlayer = Math.hypot(player.x - bot.x, player.y - bot.y);
            const arenaEdgeDist = ARENA_RADIUS - Math.hypot(bot.x, bot.y);

            if (arenaEdgeDist < 250) {
              // Steer away from boundary towards center (0,0)
              bot.targetAngle = Math.atan2(-bot.y, -bot.x);
              bot.isBoosting = false;
            } else if (distToPlayer < 220 && player.length > bot.length) {
              // Flee from bigger player
              bot.targetAngle = Math.atan2(bot.y - player.y, bot.x - player.x);
              bot.isBoosting = bot.score > 30;
            } else if (distToPlayer < 200 && bot.length > player.length + 15) {
              // Hunt smaller player! Cut them off!
              const leadX = player.x + Math.cos(player.angle) * 80;
              const leadY = player.y + Math.sin(player.angle) * 80;
              bot.targetAngle = Math.atan2(leadY - bot.y, leadX - bot.x);
              bot.isBoosting = true;
            } else if (closestFood) {
              // Head towards food
              bot.targetAngle = Math.atan2(closestFood.y - bot.y, closestFood.x - bot.x);
              bot.isBoosting = false;
            } else {
              // Wander
              bot.targetAngle += (Math.random() - 0.5) * 0.6;
              bot.isBoosting = false;
            }
          }

          // Smooth angle interpolation
          let bDiff = bot.targetAngle - bot.angle;
          while (bDiff > Math.PI) bDiff -= Math.PI * 2;
          while (bDiff < -Math.PI) bDiff += Math.PI * 2;
          bot.angle += bDiff * 0.12;

          bot.speed = bot.isBoosting && bot.score > 25 ? bot.boostSpeed : bot.baseSpeed;

          // Move bot head
          bot.x += Math.cos(bot.angle) * bot.speed;
          bot.y += Math.sin(bot.angle) * bot.speed;
          bot.thickness = Math.min(12 + Math.sqrt(bot.score) * 0.45, 26);

          bot.body.unshift({ x: bot.x, y: bot.y });
          while (bot.body.length > bot.length) {
            bot.body.pop();
          }

          // Boundary check
          if (Math.hypot(bot.x, bot.y) >= ARENA_RADIUS) {
            bot.dead = true;
            explodeSnakeIntoFood(bot);
          }
        });

        // Respawn dead bots
        eng.bots = eng.bots.filter((b) => !b.dead);
        while (eng.bots.length < TOTAL_BOTS) {
          const botSkin = SKINS[Math.floor(Math.random() * SKINS.length)];
          const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
          eng.bots.push(createSnake(`bot-${Date.now()}-${Math.random()}`, botName, false, botSkin));
        }

        // 3. COLLISION CHECKS (HEAD TO BODY)
        const allSnakes = [player, ...eng.bots];

        allSnakes.forEach((attacker) => {
          if (attacker.dead) return;

          allSnakes.forEach((victim) => {
            if (victim.dead) return;
            // Check attacker head hitting victim body segments
            const startIndex = attacker.id === victim.id ? 8 : 2; // don't collide with own neck

            for (let s = startIndex; s < victim.body.length; s += 2) {
              const seg = victim.body[s];
              const hitDist = Math.hypot(attacker.x - seg.x, attacker.y - seg.y);
              const minColDist = (attacker.thickness + victim.thickness) * 0.46;

              if (hitDist < minColDist) {
                // Attacker dies!
                attacker.dead = true;
                explodeSnakeIntoFood(attacker);

                if (attacker.isPlayer) {
                  sound.playCrash();
                  eng.screenShake = 20;
                  setGameState('gameover');
                } else if (victim.isPlayer) {
                  // Player killed an AI rival!
                  sound.playSlitherKill();
                  eng.screenShake = 10;
                  victim.kills += 1;
                  setPlayerKills(victim.kills);
                  setCoins((prev) => {
                    const next = prev + 15;
                    localStorage.setItem('cyber_slither_coins', next.toString());
                    return next;
                  });
                }
                break;
              }
            }
          });
        });

        // 4. FOOD EATING
        for (let i = eng.foods.length - 1; i >= 0; i--) {
          const f = eng.foods[i];
          let eaten = false;

          // Check player eat
          const pDist = Math.hypot(player.x - f.x, player.y - f.y);
          if (pDist < player.thickness + f.radius + 6) {
            player.score += f.value;
            player.length = Math.floor(INITIAL_SNAKE_LENGTH + player.score * 0.25);
            eaten = true;
            sound.playSlitherEat(1 + (player.score % 20) * 0.05);

            setScore(player.score);
            if (player.score > highScore) {
              setHighScore(player.score);
              localStorage.setItem('cyber_slither_highscore', player.score.toString());
            }
          } else {
            // Check bots eat
            for (let bot of eng.bots) {
              if (bot.dead) continue;
              const bDist = Math.hypot(bot.x - f.x, bot.y - f.y);
              if (bDist < bot.thickness + f.radius + 6) {
                bot.score += f.value;
                bot.length = Math.floor(INITIAL_SNAKE_LENGTH + bot.score * 0.25);
                eaten = true;
                break;
              }
            }
          }

          if (eaten) {
            eng.foods.splice(i, 1);
          }
        }

        // Replenish natural food in arena
        while (eng.foods.length < FOOD_TARGET_COUNT) {
          eng.foods.push(spawnFoodOrb());
        }

        // 5. UPDATE LEADERBOARD
        const sortedSnakes = [player, ...eng.bots].sort((a, b) => b.score - a.score);
        const pRank = sortedSnakes.findIndex((s) => s.isPlayer) + 1;
        setPlayerRank(pRank);
        setLeaderboard(
          sortedSnakes.slice(0, 7).map((s) => ({
            name: s.name,
            score: s.score,
            isPlayer: s.isPlayer,
          }))
        );
      }

      // Update Screen Shake
      if (eng.screenShake > 0) {
        eng.screenShake *= 0.88;
        if (eng.screenShake < 0.2) eng.screenShake = 0;
      }

      // Update Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) eng.particles.splice(i, 1);
      }

      // ==========================================
      // 2. RENDER GRAPHICS & ARENA
      // ==========================================
      ctx.save();

      // Screen Shake
      if (eng.screenShake > 0) {
        const sx = (Math.random() - 0.5) * eng.screenShake;
        const sy = (Math.random() - 0.5) * eng.screenShake;
        ctx.translate(sx, sy);
      }

      // Clear dark background
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, width, height);

      // Center viewport on camera
      ctx.save();
      ctx.translate(width / 2 - eng.cameraX, height / 2 - eng.cameraY);

      // Arena Grid Pattern
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      const startGridX = Math.floor((eng.cameraX - width / 2) / gridSize) * gridSize;
      const endGridX = startGridX + width + gridSize * 2;
      const startGridY = Math.floor((eng.cameraY - height / 2) / gridSize) * gridSize;
      const endGridY = startGridY + height + gridSize * 2;

      ctx.beginPath();
      for (let gx = startGridX; gx <= endGridX; gx += gridSize) {
        ctx.moveTo(gx, startGridY);
        ctx.lineTo(gx, endGridY);
      }
      for (let gy = startGridY; gy <= endGridY; gy += gridSize) {
        ctx.moveTo(startGridX, gy);
        ctx.lineTo(endGridX, gy);
      }
      ctx.stroke();

      // Draw Arena Outer Boundary Electric Fence
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 8;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 25;
      ctx.stroke();

      // Boundary Glow Ring
      ctx.strokeStyle = '#f43f5e33';
      ctx.lineWidth = 28;
      ctx.stroke();
      ctx.restore();

      // Draw Food Orbs (Glowing Orbs)
      const camLeft = eng.cameraX - width / 2 - 40;
      const camRight = eng.cameraX + width / 2 + 40;
      const camTop = eng.cameraY - height / 2 - 40;
      const camBottom = eng.cameraY + height / 2 + 40;

      eng.foods.forEach((f) => {
        if (f.x < camLeft || f.x > camRight || f.y < camTop || f.y > camBottom) return;

        f.pulsePhase += 0.05;
        const pulseR = f.radius + Math.sin(f.pulsePhase) * 0.8;

        ctx.save();
        ctx.fillStyle = f.color;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = f.value > 2 ? 14 : 6;

        ctx.beginPath();
        ctx.arc(f.x, f.y, pulseR, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(f.x - pulseR * 0.25, f.y - pulseR * 0.25, pulseR * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Helper to render a Snake
      const renderSnake = (snake: Snake) => {
        if (snake.dead || snake.body.length === 0) return;

        const bodyLen = snake.body.length;
        const isSuper = snake.score >= 500;

        // Render Turbo Boost Trail
        if (snake.isBoosting) {
          const tail = snake.body[bodyLen - 1];
          if (tail) {
            ctx.save();
            ctx.fillStyle = snake.skin.glowColor;
            ctx.shadowColor = snake.skin.glowColor;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(
              tail.x + (Math.random() - 0.5) * 8,
              tail.y + (Math.random() - 0.5) * 8,
              snake.thickness * 0.8,
              0,
              Math.PI * 2
            );
            ctx.fill();
            ctx.restore();
          }
        }

        // Render Body Segments (from tail to neck)
        for (let i = bodyLen - 1; i >= 0; i--) {
          const seg = snake.body[i];
          if (seg.x < camLeft - 50 || seg.x > camRight + 50 || seg.y < camTop - 50 || seg.y > camBottom + 50) {
            continue;
          }

          const progress = i / bodyLen;
          const segRadius = snake.thickness * (1 - progress * 0.35);
          const colorIndex = i % snake.skin.bodyColors.length;
          const color = snake.skin.bodyColors[colorIndex];

          ctx.save();
          ctx.fillStyle = color;
          if (isSuper || snake.isPlayer) {
            ctx.shadowColor = snake.skin.glowColor;
            ctx.shadowBlur = 10;
          }

          ctx.beginPath();
          ctx.arc(seg.x, seg.y, Math.max(4, segRadius), 0, Math.PI * 2);
          ctx.fill();

          // Segment highlight pattern
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.beginPath();
          ctx.arc(seg.x, seg.y, Math.max(2, segRadius * 0.45), 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        // Render Snake Head
        ctx.save();
        ctx.translate(snake.x, snake.y);
        ctx.rotate(snake.angle);

        // Head shape
        ctx.fillStyle = snake.skin.headColor;
        ctx.shadowColor = snake.skin.glowColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.ellipse(0, 0, snake.thickness * 1.25, snake.thickness * 1.05, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cute Eyes with directional pupils
        const eyeOffset = snake.thickness * 0.6;
        const eyeRadius = snake.thickness * 0.35;
        const pupilRadius = eyeRadius * 0.55;

        // Left & Right Eye Whites
        ctx.fillStyle = snake.skin.eyeColor;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(snake.thickness * 0.4, -eyeOffset, eyeRadius, 0, Math.PI * 2);
        ctx.arc(snake.thickness * 0.4, eyeOffset, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Eye Pupils (Looking Forward)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(snake.thickness * 0.55, -eyeOffset, pupilRadius, 0, Math.PI * 2);
        ctx.arc(snake.thickness * 0.55, eyeOffset, pupilRadius, 0, Math.PI * 2);
        ctx.fill();

        // Crown on #1 Rank Leader
        if (leaderboard[0] && leaderboard[0].name === snake.name) {
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(-10, -snake.thickness - 12);
          ctx.lineTo(-4, -snake.thickness - 4);
          ctx.lineTo(0, -snake.thickness - 14);
          ctx.lineTo(4, -snake.thickness - 4);
          ctx.lineTo(10, -snake.thickness - 12);
          ctx.lineTo(8, -snake.thickness - 2);
          ctx.lineTo(-8, -snake.thickness - 2);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();

        // Name Tag above head
        ctx.save();
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = snake.isPlayer ? '#22d3ee' : '#94a3b8';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(snake.name, snake.x, snake.y - snake.thickness - 8);
        ctx.restore();
      };

      // Draw all bot snakes, then player on top
      eng.bots.forEach(renderSnake);
      if (eng.playerSnake) renderSnake(eng.playerSnake);

      // Draw Explosion Particles
      eng.particles.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore(); // Restore camera translation

      // ==========================================
      // 3. HUD: MINIMAP RADAR (Bottom Right)
      // ==========================================
      const mapSize = 90;
      const mapMargin = 16;
      const mapX = width - mapSize - mapMargin;
      const mapY = height - mapSize - mapMargin;
      const mapScale = (mapSize / 2 - 4) / ARENA_RADIUS;

      // Minimap Background
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mapX + mapSize / 2, mapY + mapSize / 2, mapSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Minimap Arena Edge
      ctx.strokeStyle = '#ef444466';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Minimap Bot dots
      eng.bots.forEach((b) => {
        if (b.dead) return;
        const bx = mapX + mapSize / 2 + b.x * mapScale;
        const by = mapY + mapSize / 2 + b.y * mapScale;
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // Minimap Player dot & view cone
      if (eng.playerSnake && !eng.playerSnake.dead) {
        const px = mapX + mapSize / 2 + eng.playerSnake.x * mapScale;
        const py = mapY + mapSize / 2 + eng.playerSnake.y * mapScale;
        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      eng.animationFrameId = requestAnimationFrame(tick);
    };

    eng.animationFrameId = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      cancelAnimationFrame(eng.animationFrameId);
    };
  }, [gameState, highScore]);

  // Mouse & Touch Input Handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const eng = engineRef.current;
    eng.mouseX = e.clientX - rect.left - centerX;
    eng.mouseY = e.clientY - rect.top - centerY;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    engineRef.current.isBoosting = true;
    handlePointerMove(e);
  };

  const handlePointerUp = useCallback(() => {
    engineRef.current.isBoosting = false;
  }, []);

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerUp]);

  // Spacebar Turbo Boost key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        engineRef.current.isBoosting = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        engineRef.current.isBoosting = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center select-none">
      {/* Container */}
      <div className="relative w-full bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Top HUD */}
        <div className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
          {/* Score & Rank */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/80 border border-cyan-500/30 rounded-xl text-cyan-400 font-black text-sm">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>LENGTH: {score}</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300 font-bold text-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>RANK: #{playerRank}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 font-bold text-xs">
              <Swords className="w-3.5 h-3.5 text-rose-400" />
              <span>KILLS: {playerKills}</span>
            </div>
          </div>

          {/* Skins & Audio Controls */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/40 border border-amber-500/30 text-amber-300 font-bold text-xs rounded-xl">
              <span>🪙</span>
              <span>{coins}</span>
            </div>

            <button
              onClick={() => setShowSkins(true)}
              className="p-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-xl transition"
              title="Snake Skins Garage"
            >
              <Palette className="w-4 h-4" />
            </button>

            <button
              onClick={toggleSound}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div
          className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[640px] flex items-center justify-center cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <canvas
            ref={canvasRef}
            width={850}
            height={530}
            className="w-full h-full object-cover"
          />

          {/* Mobile Turbo Boost Button */}
          {gameState === 'playing' && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                engineRef.current.isBoosting = true;
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                engineRef.current.isBoosting = false;
              }}
              onPointerLeave={() => {
                engineRef.current.isBoosting = false;
              }}
              className="absolute bottom-4 right-4 w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 border border-amber-300 text-white font-black text-xs flex flex-col items-center justify-center shadow-2xl shadow-orange-500/50 active:scale-90 transition-transform select-none z-20"
            >
              <span className="text-lg">⚡</span>
              <span className="text-[10px]">BOOST</span>
            </button>
          )}

          {/* Live Leaderboard Overlay (Top Right) */}
          {gameState === 'playing' && leaderboard.length > 0 && (
            <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 w-44 pointer-events-none z-10 shadow-lg">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 mb-1.5 border-b border-slate-800 pb-1">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>ARENA LEADERS</span>
              </div>
              <div className="space-y-1">
                {leaderboard.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between text-xs font-semibold ${
                      item.isPlayer ? 'text-cyan-300 font-bold bg-cyan-950/60 px-1 rounded' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate max-w-[95px]">
                      {idx + 1}. {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Start Screen Overlay */}
          {gameState === 'start' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/30 mb-4 animate-bounce">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
                CYBER SLITHER <span className="text-cyan-400">ARENA</span>
              </h2>
              <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
                Slither, feast on glowing cyber orbs, cut off rival AI snakes, and rule the neon battle arena!
              </p>

              {/* Name Input */}
              <div className="flex items-center gap-2 mb-6 w-64">
                <input
                  type="text"
                  maxLength={14}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter Nickname"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-center text-sm focus:outline-none focus:border-cyan-400 transition shadow-inner"
                />
              </div>

              <button
                onClick={handleStartGame}
                className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>ENTER ARENA</span>
              </button>

              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-6 mt-4 sm:mt-8 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-slate-800 rounded border border-slate-700">Mouse Move</span>
                  <span>Steer</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-slate-800 rounded border border-slate-700">Click / Space</span>
                  <span>Turbo Boost</span>
                </div>
              </div>
            </div>
          )}

          {/* Game Over Screen */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-3">
                <span className="text-3xl">💥</span>
              </div>
              <h3 className="text-2xl font-black text-rose-400 tracking-wide mb-1">ELIMINATED!</h3>
              <p className="text-xs text-slate-400 mb-4">You crashed into an opponent's body or electric boundary</p>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-72 mb-6 flex justify-around">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Final Mass</div>
                  <div className="text-xl font-black text-white">{score}</div>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Kills</div>
                  <div className="text-xl font-black text-cyan-400">{playerKills}</div>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Best</div>
                  <div className="text-xl font-black text-amber-400">{highScore}</div>
                </div>
              </div>

              <button
                onClick={handleRestart}
                className="px-8 py-3 bg-gradient-to-r from-rose-500 to-orange-600 hover:from-rose-400 hover:to-orange-500 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>PLAY AGAIN</span>
              </button>
            </div>
          )}

          {/* Mobile Turbo Boost Button (Bottom Left) */}
          {gameState === 'playing' && (
            <div className="absolute bottom-4 left-4 sm:hidden z-20 pointer-events-auto">
              <button
                onPointerDown={() => {
                  engineRef.current.isBoosting = true;
                }}
                onPointerUp={() => {
                  engineRef.current.isBoosting = false;
                }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-rose-600 text-white font-black text-xs flex flex-col items-center justify-center shadow-xl shadow-orange-500/40 active:scale-90 border border-orange-400/50"
              >
                <Zap className="w-5 h-5 fill-current" />
                <span>BOOST</span>
              </button>
            </div>
          )}
        </div>

        {/* Skins Arsenal Modal */}
        {showSkins && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-40 p-6 flex flex-col items-center overflow-y-auto">
            <div className="w-full max-w-md flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-white font-black text-xl">
                <Palette className="w-5 h-5 text-cyan-400" />
                <span>SNAKE SKINS ARSENAL</span>
              </div>
              <button
                onClick={() => setShowSkins(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Close
              </button>
            </div>

            <div className="w-full max-w-md grid grid-cols-2 gap-3 mb-4">
              {SKINS.map((skin) => {
                const isUnlocked = unlockedSkins.includes(skin.id);
                const isSelected = activeSkinId === skin.id;

                return (
                  <button
                    key={skin.id}
                    onClick={() => handleBuySkin(skin)}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 relative ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-md shadow-cyan-500/20'
                        : isUnlocked
                        ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-900/40 border-slate-800/60 opacity-80'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner"
                      style={{ backgroundColor: `${skin.headColor}22`, border: `1.5px solid ${skin.headColor}` }}
                    >
                      <span>{skin.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{skin.name}</div>
                      <div className="text-xs text-slate-400">
                        {isSelected ? (
                          <span className="text-cyan-400 font-semibold">Equipped</span>
                        ) : isUnlocked ? (
                          <span className="text-emerald-400">Unlocked</span>
                        ) : (
                          <span className="text-amber-400 font-semibold">🪙 {skin.price}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
