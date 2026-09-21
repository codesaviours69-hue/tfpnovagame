import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Zap,
  Flame,
  Shield,
  Target,
  Sparkles,
  Wind,
  Crosshair,
  Award,
  Layers,
  Heart,
  Skull,
  ChevronRight,
  User,
  Swords,
  Crown,
  Activity,
  ArrowRight,
  TrendingUp,
  Sliders,
  Move,
  Gamepad2,
  ZapOff
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface Props {
  onGameOver?: (score: number) => void;
}

type GameMode = 'archero' | 'arrow_fest';

interface Perk {
  id: string;
  name: string;
  desc: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const PERKS_POOL: Perk[] = [
  { id: 'multishot', name: 'Front Arrow +1', desc: 'Fires an extra forward piercing arrow', icon: '🏹', rarity: 'rare' },
  { id: 'diagonal', name: 'Diagonal Arrows', desc: 'Fires 2 additional angled side arrows', icon: '🎯', rarity: 'common' },
  { id: 'ricochet', name: 'Wall Ricochet', desc: 'Arrows bounce off arena walls 2 times', icon: '⚡', rarity: 'rare' },
  { id: 'fire_arrow', name: 'Blazing Fire Storm', desc: 'Arrows explode on hit with flame area damage', icon: '🔥', rarity: 'epic' },
  { id: 'lightning_chain', name: 'Tesla Lightning Arc', desc: 'Hits chain lightning to 3 nearby enemies', icon: '⚡', rarity: 'epic' },
  { id: 'piercing', name: 'Laser Piercing', desc: 'Arrows punch straight through all enemies', icon: '✨', rarity: 'rare' },
  { id: 'orbit_shields', name: 'Orbiting Energy Orbs', desc: 'Spins 2 shield orbs that damage approaching foes', icon: '🛡️', rarity: 'legendary' },
  { id: 'attack_speed', name: 'Rapid Quiver (+40% Spd)', desc: 'Massively increases arrow firing rate', icon: '⏩', rarity: 'common' },
  { id: 'giant_arrows', name: 'Mega Giant Arrows', desc: 'Arrows grow +100% larger with +60% damage', icon: '💥', rarity: 'epic' },
  { id: 'bloodthirst', name: 'Vampiric Arrow Heal', desc: 'Restores +15 HP upon defeating enemies', icon: '🩸', rarity: 'rare' },
];

export const CyberArcheryMaster: React.FC<Props> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game Mode & UI States
  const [gameMode, setGameMode] = useState<GameMode>('archero');
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'level_up' | 'gameover' | 'victory'>('menu');

  // Archero Roguelike Stats
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playerHp, setPlayerHp] = useState(120);
  const [maxHp, setMaxHp] = useState(120);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpToNext, setXpToNext] = useState(100);
  const [dungeonWave, setDungeonWave] = useState(1);
  const [activePerks, setActivePerks] = useState<string[]>([]);
  const [offeredPerks, setOfferedPerks] = useState<Perk[]>([]);

  // Arrow Fest Swarm Stats
  const [arrowCount, setArrowCount] = useState(1);
  const [festDistance, setFestDistance] = useState(0);

  // Controls & Audio
  const [muted, setMuted] = useState(sound.isMuted());
  const joystickRef = useRef<{ active: boolean; startX: number; startY: number; moveX: number; moveY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    moveX: 0,
    moveY: 0,
  });

  // Real-Time 60FPS Physics Engine State
  const engineRef = useRef({
    keys: {} as Record<string, boolean>,
    // Player Character (Archero Hero)
    hero: {
      x: 400,
      y: 450,
      radius: 16,
      speed: 4.8,
      shootCooldown: 0,
      shootInterval: 22, // Frames between shots
      facingAngle: -Math.PI / 2,
      hitFlash: 0,
      orbitAngle: 0,
    },
    // Arrows in Play
    arrows: [] as {
      id: string;
      x: number;
      y: number;
      vx: number;
      vy: number;
      damage: number;
      radius: number;
      bounces: number;
      pierce: number;
      isFire?: boolean;
      isLightning?: boolean;
      color: string;
      trail: { x: number; y: number; alpha: number }[];
    }[],
    // Enemies / Monsters
    monsters: [] as {
      id: string;
      type: 'crawler' | 'ranged_wizard' | 'golem_boss' | 'laser_drone';
      x: number;
      y: number;
      vx: number;
      vy: number;
      hp: number;
      maxHp: number;
      radius: number;
      color: string;
      speed: number;
      shootTimer: number;
      hitFlash: number;
    }[],
    // Enemy Projectiles
    enemyBullets: [] as {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
    }[],
    // XP Gems Dropped
    gems: [] as { x: number; y: number; value: number; color: string }[],

    // ===================================
    // ARROW FEST RUNNER SWARM ENGINE
    // ===================================
    fest: {
      playerX: 400, // Left / Right steering
      speed: 5.5,
      distanceTravelled: 0,
      maxDistance: 3200,
      swarmCount: 10,
      gates: [] as {
        z: number;
        leftText: string;
        leftType: 'add' | 'multiply' | 'sub';
        leftVal: number;
        rightText: string;
        rightType: 'add' | 'multiply' | 'sub';
        rightVal: number;
        passed: boolean;
      }[],
      enemies: [] as { z: number; x: number; hp: number; maxHp: number; width: number }[],
      bossHp: 800,
      bossMaxHp: 800,
    },

    // Visual FX
    particles: [] as { x: number; y: number; vx: number; vy: number; size: number; color: string; alpha: number; life: number; maxLife: number }[],
    floatingTexts: [] as { x: number; y: number; text: string; color: string; alpha: number; vy: number; scale: number }[],
    screenShake: 0,
  });

  // Load High Score
  useEffect(() => {
    const saved = localStorage.getItem('cyber_archero_high');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const addParticles = (x: number, y: number, color: string, count = 18, speed = 4) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed + 0.5;
      engineRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: Math.random() * 3.5 + 1.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 20 + 12,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color = '#38bdf8', scale = 1.2) => {
    engineRef.current.floatingTexts.push({ x, y, text, color, alpha: 1, vy: -1.6, scale });
  };

  // Keyboard & Touch Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      engineRef.current.keys[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      engineRef.current.keys[e.key.toLowerCase()] = false;
    };
    const handleGlobalPointerUp = () => {
      joystickRef.current.active = false;
      joystickRef.current.moveX = 0;
      joystickRef.current.moveY = 0;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  // Spawn Archero Dungeon Wave
  const spawnDungeonWave = useCallback((waveNum: number) => {
    const eng = engineRef.current;
    eng.monsters = [];
    eng.enemyBullets = [];

    const isBossWave = waveNum % 5 === 0;

    if (isBossWave) {
      // MEGA CYBER GOLEM BOSS
      eng.monsters.push({
        id: `boss_${waveNum}`,
        type: 'golem_boss',
        x: 400,
        y: 130,
        vx: 1.6,
        vy: 0.8,
        hp: 350 + waveNum * 120,
        maxHp: 350 + waveNum * 120,
        radius: 38,
        color: '#f43f5e',
        speed: 1.4,
        shootTimer: 45,
        hitFlash: 0,
      });
      sound.playExplosion();
      addFloatingText(400, 200, '⚠️ WARNING: CYBER TITAN BOSS SPAWNED!', '#f43f5e', 1.6);
    } else {
      // Standard Mob Wave
      const mobCount = Math.min(16, 5 + waveNum * 2);
      for (let i = 0; i < mobCount; i++) {
        const type = i % 3 === 0 ? 'ranged_wizard' : i % 4 === 0 ? 'laser_drone' : 'crawler';
        const side = Math.floor(Math.random() * 3); // top, left, right
        let spawnX = Math.random() * 700 + 50;
        let spawnY = 80;
        if (side === 1) {
          spawnX = 60;
          spawnY = Math.random() * 300 + 80;
        } else if (side === 2) {
          spawnX = 740;
          spawnY = Math.random() * 300 + 80;
        }

        eng.monsters.push({
          id: `mob_${waveNum}_${i}`,
          type,
          x: spawnX,
          y: spawnY,
          vx: 0,
          vy: 0,
          hp: 25 + waveNum * 8,
          maxHp: 25 + waveNum * 8,
          radius: type === 'ranged_wizard' ? 17 : type === 'laser_drone' ? 14 : 15,
          color: type === 'ranged_wizard' ? '#c084fc' : type === 'laser_drone' ? '#38bdf8' : '#fb923c',
          speed: type === 'crawler' ? 2.4 : 1.6,
          shootTimer: Math.floor(Math.random() * 60) + 40,
          hitFlash: 0,
        });
      }
    }
  }, []);

  // Setup Arrow Fest Runner Mode
  const setupArrowFest = useCallback(() => {
    const eng = engineRef.current;
    eng.fest.playerX = 400;
    eng.fest.distanceTravelled = 0;
    eng.fest.swarmCount = 10;
    eng.fest.gates = [];
    eng.fest.enemies = [];
    eng.fest.bossHp = 800;
    eng.fest.bossMaxHp = 800;
    setArrowCount(10);
    setFestDistance(0);

    // Generate Math Gates along the run
    for (let i = 1; i <= 8; i++) {
      const zPos = i * 360;
      const isMultiply = Math.random() > 0.4;
      eng.fest.gates.push({
        z: zPos,
        leftText: isMultiply ? 'x2' : '+15',
        leftType: isMultiply ? 'multiply' : 'add',
        leftVal: isMultiply ? 2 : 15,
        rightText: isMultiply ? '+25' : 'x3',
        rightType: isMultiply ? 'add' : 'multiply',
        rightVal: isMultiply ? 25 : 3,
        passed: false,
      });

      // Enemy Barricades between gates
      if (i % 2 === 0) {
        eng.fest.enemies.push({
          z: zPos + 180,
          x: 400 + (Math.random() - 0.5) * 200,
          hp: 40 + i * 15,
          maxHp: 40 + i * 15,
          width: 90,
        });
      }
    }
  }, []);

  // Trigger Roguelike Level Up Perk Selection
  const triggerLevelUp = useCallback(() => {
    sound.playPowerup();
    // Pick 3 random perks from pool
    const shuffled = [...PERKS_POOL].sort(() => 0.5 - Math.random());
    setOfferedPerks(shuffled.slice(0, 3));
    setGameState('level_up');
  }, []);

  // Apply Chosen Perk
  const selectPerk = (perk: Perk) => {
    setActivePerks((prev) => [...prev, perk.id]);
    if (perk.id === 'attack_speed') {
      engineRef.current.hero.shootInterval = Math.max(10, engineRef.current.hero.shootInterval - 6);
    }
    setGameState('playing');
    sound.playGoalCheer();
    confetti({ particleCount: 70, spread: 60 });
  };

  // Start / Restart Game
  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    setScore(0);
    setPlayerHp(120);
    setMaxHp(120);
    setLevel(1);
    setXp(0);
    setXpToNext(100);
    setDungeonWave(1);
    setActivePerks([]);

    const eng = engineRef.current;
    eng.hero.x = 400;
    eng.hero.y = 450;
    eng.hero.shootInterval = 22;
    eng.hero.hitFlash = 0;
    eng.arrows = [];
    eng.particles = [];
    eng.floatingTexts = [];
    eng.gems = [];

    if (mode === 'archero') {
      spawnDungeonWave(1);
    } else {
      setupArrowFest();
    }

    setGameState('playing');
    sound.playWhistle();
  };

  // Main 60FPS Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const eng = engineRef.current;

      if (eng.screenShake > 0) eng.screenShake -= 0.5;

      ctx.save();
      if (eng.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * eng.screenShake, (Math.random() - 0.5) * eng.screenShake);
      }

      // =========================================================================
      // MODE 1: CYBER ARCHERO (ROGUE-LIKE DUNGEON SHOOTER)
      // =========================================================================
      if (gameMode === 'archero') {
        // 1. Dark Cyber Arena Floor
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, 800, 600);

        // Cyber Grid Tiles
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 800; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 600);
          ctx.stroke();
        }
        for (let y = 0; y < 600; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(800, y);
          ctx.stroke();
        }

        // Arena Border Walls (Electric Forcefield)
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, 760, 560);

        if (gameState === 'playing') {
          // -------------------------------------------------------------
          // 2. HERO MOVEMENT (Keyboard WASD + Virtual Joystick)
          // -------------------------------------------------------------
          let moveX = 0;
          let moveY = 0;
          if (eng.keys['w'] || eng.keys['arrowup']) moveY -= 1;
          if (eng.keys['s'] || eng.keys['arrowdown']) moveY += 1;
          if (eng.keys['a'] || eng.keys['arrowleft']) moveX -= 1;
          if (eng.keys['d'] || eng.keys['arrowright']) moveX += 1;

          if (joystickRef.current.active) {
            moveX = joystickRef.current.moveX;
            moveY = joystickRef.current.moveY;
          }

          if (moveX !== 0 || moveY !== 0) {
            const len = Math.hypot(moveX, moveY);
            eng.hero.x += (moveX / len) * eng.hero.speed;
            eng.hero.y += (moveY / len) * eng.hero.speed;
            eng.hero.facingAngle = Math.atan2(moveY, moveX);
          }

          // Boundary Constrain
          eng.hero.x = Math.max(45, Math.min(755, eng.hero.x));
          eng.hero.y = Math.max(45, Math.min(555, eng.hero.y));

          // -------------------------------------------------------------
          // 3. AUTO-TARGETING & SMART ARROW FIRING (Archero Core Mechanic)
          // -------------------------------------------------------------
          // Find Nearest Monster
          let nearestMob: (typeof eng.monsters)[0] | null = null;
          let nearestDist = Infinity;
          eng.monsters.forEach((m) => {
            const d = Math.hypot(m.x - eng.hero.x, m.y - eng.hero.y);
            if (d < nearestDist) {
              nearestDist = d;
              nearestMob = m;
            }
          });

          // Aim at nearest monster if in range
          if (nearestMob) {
            eng.hero.facingAngle = Math.atan2((nearestMob as any).y - eng.hero.y, (nearestMob as any).x - eng.hero.x);
          }

          // Fire Arrow timer
          eng.hero.shootCooldown--;
          if (eng.hero.shootCooldown <= 0 && nearestMob) {
            eng.hero.shootCooldown = eng.hero.shootInterval;
            sound.playBowRelease();

            const baseAngle = eng.hero.facingAngle;
            const arrowSpeed = 11.5;
            const arrowDmg = activePerks.includes('giant_arrows') ? 48 : 30;
            const arrowRad = activePerks.includes('giant_arrows') ? 8 : 4.5;
            const hasFire = activePerks.includes('fire_arrow');
            const hasLightning = activePerks.includes('lightning_chain');
            const maxBounces = activePerks.includes('ricochet') ? 2 : 0;
            const pierceCount = activePerks.includes('piercing') ? 3 : 1;

            // Front Arrow + Multishot
            const shootAngles = [baseAngle];
            if (activePerks.includes('multishot')) {
              shootAngles.push(baseAngle); // Double front
            }
            if (activePerks.includes('diagonal')) {
              shootAngles.push(baseAngle - 0.35, baseAngle + 0.35);
            }

            shootAngles.forEach((ang, idx) => {
              eng.arrows.push({
                id: `arrow_${Date.now()}_${idx}`,
                x: eng.hero.x + Math.cos(ang) * 15,
                y: eng.hero.y + Math.sin(ang) * 15,
                vx: Math.cos(ang) * arrowSpeed,
                vy: Math.sin(ang) * arrowSpeed,
                damage: arrowDmg,
                radius: arrowRad,
                bounces: maxBounces,
                pierce: pierceCount,
                isFire: hasFire,
                isLightning: hasLightning,
                color: hasFire ? '#f97316' : hasLightning ? '#38bdf8' : '#4ade80',
                trail: [],
              });
            });
          }

          // -------------------------------------------------------------
          // 4. ORBITING SHIELD ORBS (Perk)
          // -------------------------------------------------------------
          if (activePerks.includes('orbit_shields')) {
            eng.hero.orbitAngle += 0.06;
            for (let i = 0; i < 2; i++) {
              const orbAng = eng.hero.orbitAngle + (i * Math.PI);
              const orbX = eng.hero.x + Math.cos(orbAng) * 45;
              const orbY = eng.hero.y + Math.sin(orbAng) * 45;

              // Collision with mobs
              eng.monsters.forEach((m) => {
                if (Math.hypot(orbX - m.x, orbY - m.y) < m.radius + 12) {
                  m.hp -= 2;
                  m.hitFlash = 3;
                  addParticles(orbX, orbY, '#38bdf8', 3, 2);
                }
              });

              // Draw Orb
              ctx.fillStyle = '#38bdf8';
              ctx.beginPath();
              ctx.arc(orbX, orbY, 6, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // -------------------------------------------------------------
          // 5. ARROWS MOVEMENT & COLLISION
          // -------------------------------------------------------------
          for (let i = eng.arrows.length - 1; i >= 0; i--) {
            const arr = eng.arrows[i];
            arr.x += arr.vx;
            arr.y += arr.vy;

            arr.trail.push({ x: arr.x, y: arr.y, alpha: 0.9 });
            if (arr.trail.length > 8) arr.trail.shift();

            // Wall Ricochet Perk
            if (arr.bounces > 0) {
              if (arr.x <= 25 || arr.x >= 775) {
                arr.vx *= -1;
                arr.bounces--;
                sound.playTargetHit();
                addParticles(arr.x, arr.y, arr.color, 8, 3);
              }
              if (arr.y <= 25 || arr.y >= 575) {
                arr.vy *= -1;
                arr.bounces--;
                sound.playTargetHit();
                addParticles(arr.x, arr.y, arr.color, 8, 3);
              }
            } else {
              // Out of bounds
              if (arr.x < 15 || arr.x > 785 || arr.y < 15 || arr.y > 585) {
                eng.arrows.splice(i, 1);
                continue;
              }
            }

            // Arrow vs Monster Hitbox
            for (let mIdx = eng.monsters.length - 1; mIdx >= 0; mIdx--) {
              const mob = eng.monsters[mIdx];
              const dist = Math.hypot(arr.x - mob.x, arr.y - mob.y);

              if (dist < mob.radius + arr.radius) {
                mob.hp -= arr.damage;
                mob.hitFlash = 6;
                sound.playTargetHit();
                addFloatingText(mob.x, mob.y - 12, `-${arr.damage}`, '#4ade80', 1.2);
                addParticles(mob.x, mob.y, arr.color, 12, 4);

                // Fire AOE explosion
                if (arr.isFire) {
                  sound.playExplosion();
                  addParticles(mob.x, mob.y, '#f97316', 25, 6);
                  eng.monsters.forEach((nearby) => {
                    if (Math.hypot(nearby.x - mob.x, nearby.y - mob.y) < 70) {
                      nearby.hp -= 20;
                      nearby.hitFlash = 5;
                    }
                  });
                }

                // Lightning Arc
                if (arr.isLightning) {
                  sound.playPowerup();
                  eng.monsters.slice(0, 3).forEach((nearby) => {
                    if (nearby !== mob) {
                      nearby.hp -= 15;
                      nearby.hitFlash = 5;
                      ctx.strokeStyle = '#38bdf8';
                      ctx.lineWidth = 2;
                      ctx.beginPath();
                      ctx.moveTo(mob.x, mob.y);
                      ctx.lineTo(nearby.x, nearby.y);
                      ctx.stroke();
                    }
                  });
                }

                arr.pierce--;
                if (arr.pierce <= 0) {
                  eng.arrows.splice(i, 1);
                  break;
                }
              }
            }
          }

          // -------------------------------------------------------------
          // 6. MONSTERS AI, MOVEMENT & ATTACKS
          // -------------------------------------------------------------
          for (let mIdx = eng.monsters.length - 1; mIdx >= 0; mIdx--) {
            const mob = eng.monsters[mIdx];

            // Death Check
            if (mob.hp <= 0) {
              sound.playGoalCheer();
              addParticles(mob.x, mob.y, mob.color, 25, 6);
              setScore((s) => s + (mob.type === 'golem_boss' ? 250 : 25));

              // Spawn XP Gem
              eng.gems.push({
                x: mob.x,
                y: mob.y,
                value: mob.type === 'golem_boss' ? 80 : 20,
                color: mob.type === 'golem_boss' ? '#fbbf24' : '#38bdf8',
              });

              // Bloodthirst Heal
              if (activePerks.includes('bloodthirst')) {
                setPlayerHp((hp) => Math.min(maxHp, hp + 15));
                addFloatingText(eng.hero.x, eng.hero.y - 25, '+15 HP HEAL', '#ef4444', 1.2);
              }

              eng.monsters.splice(mIdx, 1);
              continue;
            }

            // Movement towards Hero
            const angleToHero = Math.atan2(eng.hero.y - mob.y, eng.hero.x - mob.x);
            if (mob.type === 'crawler') {
              mob.x += Math.cos(angleToHero) * mob.speed;
              mob.y += Math.sin(angleToHero) * mob.speed;
            } else if (mob.type === 'ranged_wizard') {
              // Maintain medium distance and shoot fireballs
              const dist = Math.hypot(eng.hero.x - mob.x, eng.hero.y - mob.y);
              if (dist < 180) {
                mob.x -= Math.cos(angleToHero) * mob.speed;
                mob.y -= Math.sin(angleToHero) * mob.speed;
              } else {
                mob.x += Math.cos(angleToHero) * (mob.speed * 0.5);
                mob.y += Math.sin(angleToHero) * (mob.speed * 0.5);
              }

              mob.shootTimer--;
              if (mob.shootTimer <= 0) {
                mob.shootTimer = 65;
                eng.enemyBullets.push({
                  x: mob.x,
                  y: mob.y,
                  vx: Math.cos(angleToHero) * 5.0,
                  vy: Math.sin(angleToHero) * 5.0,
                  radius: 5,
                  color: '#c084fc',
                });
              }
            } else if (mob.type === 'golem_boss') {
              mob.x += Math.cos(angleToHero) * mob.speed;
              mob.y += Math.sin(angleToHero) * mob.speed;

              mob.shootTimer--;
              if (mob.shootTimer <= 0) {
                mob.shootTimer = 45;
                sound.playExplosion();
                // 8-Way Laser Burst
                for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                  eng.enemyBullets.push({
                    x: mob.x,
                    y: mob.y,
                    vx: Math.cos(a) * 4.5,
                    vy: Math.sin(a) * 4.5,
                    radius: 7,
                    color: '#f43f5e',
                  });
                }
              }
            }

            // Contact damage to Hero
            if (Math.hypot(eng.hero.x - mob.x, eng.hero.y - mob.y) < eng.hero.radius + mob.radius) {
              setPlayerHp((hp) => {
                const updated = hp - 1;
                if (updated <= 0) {
                  setGameState('gameover');
                  sound.playGameOver();
                  if (onGameOver) onGameOver(score);
                }
                return Math.max(0, updated);
              });
              eng.hero.hitFlash = 3;
            }
          }

          // -------------------------------------------------------------
          // 7. ENEMY BULLETS
          // -------------------------------------------------------------
          for (let bIdx = eng.enemyBullets.length - 1; bIdx >= 0; bIdx--) {
            const b = eng.enemyBullets[bIdx];
            b.x += b.vx;
            b.y += b.vy;

            // Collision with Hero
            if (Math.hypot(b.x - eng.hero.x, b.y - eng.hero.y) < eng.hero.radius + b.radius) {
              sound.playHit();
              setPlayerHp((hp) => {
                const updated = hp - 18;
                if (updated <= 0) {
                  setGameState('gameover');
                  sound.playGameOver();
                  if (onGameOver) onGameOver(score);
                }
                return Math.max(0, updated);
              });
              eng.hero.hitFlash = 8;
              eng.screenShake = 6;
              addParticles(eng.hero.x, eng.hero.y, '#f43f5e', 12, 3);
              addFloatingText(eng.hero.x, eng.hero.y - 20, '-18 HP', '#f43f5e', 1.3);
              eng.enemyBullets.splice(bIdx, 1);
              continue;
            }

            if (b.x < 10 || b.x > 790 || b.y < 10 || b.y > 590) {
              eng.enemyBullets.splice(bIdx, 1);
            }
          }

          // -------------------------------------------------------------
          // 8. XP GEMS PICKUP & LEVEL UP
          // -------------------------------------------------------------
          for (let gIdx = eng.gems.length - 1; gIdx >= 0; gIdx--) {
            const gem = eng.gems[gIdx];
            const dist = Math.hypot(eng.hero.x - gem.x, eng.hero.y - gem.y);

            // Magnet pull
            if (dist < 120) {
              gem.x += (eng.hero.x - gem.x) * 0.15;
              gem.y += (eng.hero.y - gem.y) * 0.15;
            }

            if (dist < eng.hero.radius + 8) {
              sound.playPowerup();
              setXp((prev) => {
                const updated = prev + gem.value;
                if (updated >= xpToNext) {
                  setLevel((lvl) => lvl + 1);
                  setXpToNext((xtn) => Math.round(xtn * 1.5));
                  triggerLevelUp();
                  return updated - xpToNext;
                }
                return updated;
              });
              eng.gems.splice(gIdx, 1);
            }
          }

          // Check Wave Cleared -> Advance Next Dungeon Wave
          if (eng.monsters.length === 0) {
            const nextWave = dungeonWave + 1;
            setDungeonWave(nextWave);
            spawnDungeonWave(nextWave);
            sound.playGoalCheer();
            addFloatingText(400, 300, `DUNGEON WAVE ${nextWave} CLEARED!`, '#38bdf8', 1.6);
            confetti({ particleCount: 60, spread: 70 });
          }
        }

        // ==========================================
        // 9. DRAWING GAME OBJECTS (ARCHERO)
        // ==========================================
        // Draw XP Gems
        eng.gems.forEach((gem) => {
          ctx.fillStyle = gem.color;
          ctx.beginPath();
          ctx.moveTo(gem.x, gem.y - 6);
          ctx.lineTo(gem.x + 5, gem.y);
          ctx.lineTo(gem.x, gem.y + 6);
          ctx.lineTo(gem.x - 5, gem.y);
          ctx.closePath();
          ctx.fill();
        });

        // Draw Enemy Bullets
        eng.enemyBullets.forEach((b) => {
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw Monsters
        eng.monsters.forEach((mob) => {
          ctx.save();
          ctx.translate(mob.x, mob.y);

          // Health bar above mob
          ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
          ctx.fillRect(-18, -mob.radius - 10, 36, 4);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-18, -mob.radius - 10, (mob.hp / mob.maxHp) * 36, 4);

          ctx.fillStyle = mob.hitFlash > 0 ? '#ffffff' : mob.color;
          if (mob.hitFlash > 0) mob.hitFlash--;

          ctx.beginPath();
          ctx.arc(0, 0, mob.radius, 0, Math.PI * 2);
          ctx.fill();

          // Monster glowing eye
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(0, 0, mob.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        });

        // Draw Flying Arrows
        eng.arrows.forEach((arr) => {
          arr.trail.forEach((t, idx) => {
            ctx.fillStyle = arr.color;
            ctx.globalAlpha = (idx / arr.trail.length) * 0.6;
            ctx.beginPath();
            ctx.arc(t.x, t.y, arr.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          });

          ctx.save();
          ctx.translate(arr.x, arr.y);
          ctx.rotate(Math.atan2(arr.vy, arr.vx));
          ctx.fillStyle = arr.color;
          ctx.beginPath();
          ctx.moveTo(arr.radius * 2, 0);
          ctx.lineTo(-arr.radius * 2, -arr.radius);
          ctx.lineTo(-arr.radius * 2, arr.radius);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });

        // Draw Hero Archer
        ctx.save();
        ctx.translate(eng.hero.x, eng.hero.y);

        if (eng.hero.hitFlash > 0) {
          eng.hero.hitFlash--;
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = '#22c55e';
        }

        ctx.beginPath();
        ctx.arc(0, 0, eng.hero.radius, 0, Math.PI * 2);
        ctx.fill();

        // Hero Crown / Headband
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-10, -18, 20, 4);

        // Hero Bow Pointer
        ctx.rotate(eng.hero.facingAngle);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(14, 0, 12, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();

        ctx.restore();
      }

      // =========================================================================
      // MODE 2: ARROW FEST (SWARM MULTIPLIER RUNNER)
      // =========================================================================
      else if (gameMode === 'arrow_fest') {
        const fest = eng.fest;

        // 1. 3D Neon Horizon Highway
        const skyGrad = ctx.createLinearGradient(0, 0, 0, 300);
        skyGrad.addColorStop(0, '#090d16');
        skyGrad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, 800, 600);

        // Perspective Runway Track
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(340, 180);
        ctx.lineTo(460, 180);
        ctx.lineTo(760, 600);
        ctx.lineTo(40, 600);
        ctx.closePath();
        ctx.fill();

        // Glowing Track Borders
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(340, 180);
        ctx.lineTo(40, 600);
        ctx.moveTo(460, 180);
        ctx.lineTo(760, 600);
        ctx.stroke();

        if (gameState === 'playing') {
          fest.distanceTravelled += fest.speed;
          setFestDistance(Math.round(fest.distanceTravelled));

          // Steering Left / Right (A / D / Arrow Keys / Touch)
          if (eng.keys['a'] || eng.keys['arrowleft']) fest.playerX -= 6;
          if (eng.keys['d'] || eng.keys['arrowright']) fest.playerX += 6;
          if (joystickRef.current.active) {
            fest.playerX += joystickRef.current.moveX * 6;
          }
          fest.playerX = Math.max(120, Math.min(680, fest.playerX));

          // Draw Math Gates
          fest.gates.forEach((g) => {
            const relZ = g.z - fest.distanceTravelled;
            if (relZ > 0 && relZ < 1200) {
              const depth = 1 - relZ / 1200; // 0 to 1
              const y = 180 + depth * 340;
              const trackW = 120 + depth * 600;
              const leftX = 400 - trackW * 0.45;
              const rightX = 400 + trackW * 0.05;
              const gateW = trackW * 0.4;
              const gateH = 50 * depth + 20;

              // Left Gate
              ctx.fillStyle = g.leftType === 'sub' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(56, 189, 248, 0.6)';
              ctx.fillRect(leftX, y - gateH, gateW, gateH);
              ctx.fillStyle = '#ffffff';
              ctx.font = `bold ${Math.round(18 * depth + 8)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.fillText(g.leftText, leftX + gateW / 2, y - gateH / 2 + 5);

              // Right Gate
              ctx.fillStyle = g.rightType === 'sub' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(34, 197, 94, 0.6)';
              ctx.fillRect(rightX, y - gateH, gateW, gateH);
              ctx.fillStyle = '#ffffff';
              ctx.fillText(g.rightText, rightX + gateW / 2, y - gateH / 2 + 5);

              // Check Gate Crossing Trigger
              if (relZ < 30 && !g.passed) {
                g.passed = true;
                sound.playGoalCheer();

                // Player is on Left or Right?
                const chosen = fest.playerX < 400 ? g.leftVal : g.rightVal;
                const type = fest.playerX < 400 ? g.leftType : g.rightType;

                let newCount = fest.swarmCount;
                if (type === 'add') newCount += chosen;
                else if (type === 'multiply') newCount *= chosen;
                else if (type === 'sub') newCount = Math.max(1, newCount - chosen);

                fest.swarmCount = newCount;
                setArrowCount(newCount);
                addFloatingText(fest.playerX, 450, `SWARM: ${newCount} ARROWS!`, '#38bdf8', 1.5);
                addParticles(fest.playerX, 500, '#38bdf8', 30, 6);
                confetti({ particleCount: 50, spread: 60 });
              }
            }
          });

          // Check Run Victory (Reached Boss Castle)
          if (fest.distanceTravelled >= fest.maxDistance) {
            setGameState('victory');
            sound.playGoalCheer();
            confetti({ particleCount: 150, spread: 90 });
          }
        }

        // Draw Swarm of 100s of Flying Glowing Arrows
        const count = Math.min(120, fest.swarmCount);
        ctx.fillStyle = '#38bdf8';
        for (let i = 0; i < count; i++) {
          const row = Math.floor(i / 10);
          const col = (i % 10) - 5;
          const ax = fest.playerX + col * 12 + (Math.sin(Date.now() * 0.01 + i) * 3);
          const ay = 520 - row * 10;

          ctx.beginPath();
          ctx.moveTo(ax, ay - 10);
          ctx.lineTo(ax + 4, ay + 6);
          ctx.lineTo(ax - 4, ay + 6);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Draw Particles & Floating Texts
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const pt = eng.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
        pt.alpha = 1 - pt.life / pt.maxLife;

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (pt.life >= pt.maxLife) eng.particles.splice(i, 1);
      }

      for (let i = eng.floatingTexts.length - 1; i >= 0; i--) {
        const ft = eng.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.02;

        ctx.font = `bold ${Math.round(18 * ft.scale)}px sans-serif`;
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;

        if (ft.alpha <= 0) eng.floatingTexts.splice(i, 1);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activePerks, dungeonWave, festDistance, gameMode, gameState, maxHp, onGameOver, score, spawnDungeonWave, triggerLevelUp, xpToNext]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center select-none font-sans text-white">
      {/* 1. TOP BROADCAST DASHBOARD */}
      <div className="w-full mb-3 p-3 rounded-2xl bg-slate-900/95 border border-slate-800 backdrop-blur-md shadow-2xl space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => startGame('archero')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border ${
                gameMode === 'archero'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>ARCHERO ROGUE HERO</span>
            </button>

            <button
              onClick={() => startGame('arrow_fest')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border ${
                gameMode === 'arrow_fest'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>ARROW FEST (1000X SWARM)</span>
            </button>
          </div>

          {/* Sound Mute */}
          <button
            onClick={() => {
              const m = sound.toggleMute();
              setMuted(m);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>

        {/* Live HUD Score & Health */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-xl bg-slate-950/85 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Score</div>
            <div className="text-xl font-black text-cyan-400 tracking-tight">{score}</div>
          </div>

          {gameMode === 'archero' ? (
            <>
              <div className="p-2 rounded-xl bg-slate-950/85 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Hero Health</div>
                <div className="text-xl font-black text-emerald-400">
                  {playerHp} <span className="text-xs text-slate-500 font-normal">/ {maxHp}</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/85 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Dungeon Wave</div>
                <div className="text-xl font-black text-amber-400">WAVE {dungeonWave}</div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/85 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Level & XP</div>
                <div className="text-xl font-black text-purple-400">LVL {level}</div>
              </div>
            </>
          ) : (
            <>
              <div className="p-2 rounded-xl bg-slate-950/85 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Arrow Swarm Count</div>
                <div className="text-xl font-black text-emerald-400">{arrowCount} ARROWS</div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/85 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Distance</div>
                <div className="text-xl font-black text-amber-400">{festDistance} M</div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/85 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">High Score</div>
                <div className="text-xl font-black text-purple-400">{highScore}</div>
              </div>
            </>
          )}
        </div>

        {/* Archero XP Bar */}
        {gameMode === 'archero' && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span>XP PROGRESS TO LEVEL {level + 1}</span>
              <span className="text-purple-400">{xp} / {xpToNext} XP</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (xp / xpToNext) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. MAIN 60FPS INTERACTIVE CANVAS */}
      <div className="relative w-full aspect-[4/5] sm:aspect-[4/3] max-h-[74vh] sm:max-h-[82vh] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full cursor-crosshair touch-none"
        />

        {/* Movement On-Screen Touch / Drag Joystick for Mobile */}
        <div
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            joystickRef.current.active = true;
            joystickRef.current.startX = e.clientX - rect.left;
            joystickRef.current.startY = e.clientY - rect.top;
          }}
          onPointerMove={(e) => {
            if (!joystickRef.current.active) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const currX = e.clientX - rect.left;
            const currY = e.clientY - rect.top;
            const dx = currX - joystickRef.current.startX;
            const dy = currY - joystickRef.current.startY;
            const dist = Math.hypot(dx, dy);
            if (dist > 5) {
              joystickRef.current.moveX = dx / Math.max(1, dist);
              joystickRef.current.moveY = dy / Math.max(1, dist);
            }
          }}
          onPointerUp={() => {
            joystickRef.current.active = false;
            joystickRef.current.moveX = 0;
            joystickRef.current.moveY = 0;
          }}
          className="absolute inset-0 z-10"
        />

        {/* 3. MENU OVERLAY */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30 border border-cyan-300">
              <Crosshair className="w-10 h-10 text-white" />
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                CYBER ARCHERO <span className="text-cyan-400">& ARROW FEST</span>
              </h1>
              <p className="text-sm text-slate-400 max-w-md mt-1">
                The most unique action arrow experience! Choose between <b>Archero Rogue Dungeon Hero</b> (perks, ricochet, lightning storm) or <b>Arrow Fest Swarm Multiplier</b>!
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => startGame('archero')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-cyan-500/40 flex items-center gap-2 transform active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current" /> PLAY ARCHERO ROGUE HERO
              </button>

              <button
                onClick={() => startGame('arrow_fest')}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-sm border border-slate-700 flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" /> PLAY ARROW FEST (SWARM)
              </button>
            </div>
          </div>
        )}

        {/* 4. LEVEL UP PERK DRAFT DIALOG (ARCHERO ROGUE-LIKE) */}
        {gameState === 'level_up' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col items-center justify-center z-40 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xl tracking-wider">
              <Sparkles className="w-6 h-6 animate-spin" />
              <span>LEVEL UP! CHOOSE A PERK</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-2xl">
              {offeredPerks.map((perk) => (
                <button
                  key={perk.id}
                  onClick={() => selectPerk(perk)}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-700 hover:border-cyan-400 hover:scale-105 transition-all text-left flex flex-col justify-between space-y-3 shadow-xl group"
                >
                  <div>
                    <div className="text-3xl mb-2">{perk.icon}</div>
                    <div className="text-sm font-black text-white group-hover:text-cyan-400">{perk.name}</div>
                    <div className="text-xs text-slate-400 mt-1">{perk.desc}</div>
                  </div>
                  <div className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-black uppercase text-cyan-400 w-fit">
                    {perk.rarity}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. GAME OVER OVERLAY */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 space-y-3">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-400 flex items-center justify-center shadow-xl shadow-rose-500/30">
              <Skull className="w-8 h-8 text-rose-400" />
            </div>

            <h2 className="text-2xl font-black text-white">DEFEATED IN THE DUNGEON!</h2>
            <p className="text-sm text-slate-300">
              Final Score: <span className="text-rose-400 font-extrabold">{score}</span> • Reached Wave {dungeonWave}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => startGame(gameMode)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-sm"
              >
                PLAY AGAIN
              </button>
              <button
                onClick={() => setGameState('menu')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm"
              >
                Menu
              </button>
            </div>
          </div>
        )}

        {/* 6. VICTORY OVERLAY */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-emerald-400" />
            </div>

            <h2 className="text-2xl font-black text-white">RUN COMPLETED! SWARM VICTORY!</h2>
            <p className="text-sm text-slate-300">
              Final Swarm Size: <span className="text-emerald-400 font-extrabold">{arrowCount} Arrows</span>
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => startGame('arrow_fest')}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-sm"
              >
                PLAY AGAIN
              </button>
              <button
                onClick={() => setGameState('menu')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm"
              >
                Menu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. CONTROLS GUIDE FOOTER */}
      <div className="w-full mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-cyan-400">Controls:</span>
          <span><b>WASD / Arrow Keys</b> or <b>Touch & Drag</b> to move hero • Auto-aim fires arrows at nearest foe!</span>
        </div>
        <div className="text-slate-500">Collect blue XP gems to trigger 3-Card Rogue Perk selection!</div>
      </div>
    </div>
  );
};
