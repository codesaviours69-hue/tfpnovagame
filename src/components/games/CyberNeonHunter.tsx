import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Sparkles, Flame, Shield, ArrowRight, Zap, Target, Heart, Crosshair, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  color: string;
  speed: number;
  shootCooldown: number;
  isBoss: boolean;
  type: 'drone' | 'crawler' | 'charger' | 'boss';
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isPlayer: boolean;
  damage: number;
  bounces: number;
  isFreeze?: boolean;
  isExplosive?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

interface SkillOption {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
}

const AVAILABLE_SKILLS: SkillOption[] = [
  { id: 'multishot', name: 'Multi-Shot', desc: 'Fires +1 simultaneous arrow at enemies', icon: '🏹', color: '#00f0ff' },
  { id: 'ricochet', name: 'Ricochet', desc: 'Arrows bounce to nearby secondary enemies', icon: '⚡', color: '#facc15' },
  { id: 'freeze', name: 'Cryo Freeze', desc: 'Slows down and chills enemy movement', icon: '❄️', color: '#38bdf8' },
  { id: 'explosive', name: 'Plasma Burst', desc: 'Arrows cause explosive AoE blast upon impact', icon: '💥', color: '#f43f5e' },
  { id: 'shield', name: 'Orbital Shield', desc: 'Shield drone orbits you and blocks enemy bullets', icon: '🛡️', color: '#a855f7' },
  { id: 'atk_speed', name: 'Laser Rapid Fire', desc: 'Increases arrow firing speed by +40%', icon: '🔥', color: '#fb923c' },
  { id: 'max_hp', name: 'Nano Vitality', desc: 'Instantly restores +40 HP and increases Max HP', icon: '❤️', color: '#22c55e' },
];

export const CyberNeonHunter: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game UI State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'skill_select' | 'gameover' | 'victory'>('idle');
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [currentWave, setCurrentWave] = useState(1);
  const [exp, setExp] = useState(0);
  const [expToNext, setExpToNext] = useState(100);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem('cyber_hunter_coins');
    return saved ? parseInt(saved, 10) : 100;
  });
  const [skillChoices, setSkillChoices] = useState<SkillOption[]>([]);
  const [activePerks, setActivePerks] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(sound.isMuted());

  // Engine Refs
  const engineRef = useRef({
    player: {
      x: 270,
      y: 480,
      vx: 0,
      vy: 0,
      speed: 3.8,
      radius: 16,
      hp: 100,
      maxHp: 100,
      attackCooldown: 0,
      attackInterval: 22, // frames between shots when stopped
      level: 1,
      isMoving: false,
      angle: -Math.PI / 2,
    },
    joystick: {
      active: false,
      startX: 0,
      startY: 0,
      currX: 0,
      currY: 0,
      moveX: 0,
      moveY: 0,
    },
    keys: {
      w: false,
      a: false,
      s: false,
      d: false,
      up: false,
      left: false,
      down: false,
      right: false,
    },
    perks: {
      multishot: 0,
      ricochet: false,
      freeze: false,
      explosive: false,
      shield: false,
      shieldAngle: 0,
      attackSpeedBonus: 1,
    },
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    waveTimer: 0,
    isWaveSpawning: false,
    bossSpawned: false,
    shake: 0,
    animationFrameId: 0,
  });

  // Spawn Enemies for Current Wave
  const spawnWave = useCallback((waveNum: number) => {
    const eng = engineRef.current;
    const isBossWave = waveNum % 5 === 0;
    eng.enemies = [];
    eng.projectiles = [];
    eng.bossSpawned = isBossWave;

    if (isBossWave) {
      // Spawn Mega Cyber Titan Boss
      eng.enemies.push({
        id: 999,
        x: 270,
        y: 120,
        vx: 1.5,
        vy: 0,
        hp: 350 + waveNum * 150,
        maxHp: 350 + waveNum * 150,
        radius: 36,
        color: '#f43f5e',
        speed: 1.2,
        shootCooldown: 40,
        isBoss: true,
        type: 'boss',
      });
    } else {
      // Spawn Regular Enemy Swarm
      const count = 5 + waveNum * 2;
      for (let i = 0; i < count; i++) {
        const types: ('drone' | 'crawler' | 'charger')[] = ['drone', 'crawler', 'charger'];
        const type = types[Math.floor(Math.random() * types.length)];
        const side = Math.random() > 0.5;
        const x = side ? 40 + Math.random() * 460 : (Math.random() > 0.5 ? 40 : 500);
        const y = 80 + Math.random() * 220;

        eng.enemies.push({
          id: i + 1,
          x,
          y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          hp: 20 + waveNum * 8,
          maxHp: 20 + waveNum * 8,
          radius: type === 'charger' ? 15 : 12,
          color: type === 'drone' ? '#a855f7' : type === 'charger' ? '#f59e0b' : '#38bdf8',
          speed: type === 'charger' ? 2.6 : type === 'drone' ? 1.5 : 1.8,
          shootCooldown: 60 + Math.floor(Math.random() * 60),
          isBoss: false,
          type,
        });
      }
    }
  }, []);

  // Start New Game
  const handleStartGame = () => {
    sound.playClick();
    sound.playPowerup();
    const eng = engineRef.current;
    eng.player.x = 270;
    eng.player.y = 520;
    eng.player.hp = 100;
    eng.player.maxHp = 100;
    eng.player.level = 1;
    eng.perks = {
      multishot: 0,
      ricochet: false,
      freeze: false,
      explosive: false,
      shield: false,
      shieldAngle: 0,
      attackSpeedBonus: 1,
    };
    eng.particles = [];
    eng.projectiles = [];

    setPlayerHp(100);
    setPlayerMaxHp(100);
    setPlayerLevel(1);
    setCurrentWave(1);
    setExp(0);
    setExpToNext(100);
    setScore(0);
    setActivePerks([]);

    spawnWave(1);
    setGameState('playing');
  };

  // Level Up -> Choose 3 Random Skills
  const triggerLevelUp = () => {
    sound.playPowerup();
    // Pick 3 random unique skills
    const shuffled = [...AVAILABLE_SKILLS].sort(() => 0.5 - Math.random());
    setSkillChoices(shuffled.slice(0, 3));
    setGameState('skill_select');
  };

  // Select Skill
  const handleSelectSkill = (skillId: string) => {
    sound.playClick();
    sound.playPowerup();
    const eng = engineRef.current;

    switch (skillId) {
      case 'multishot':
        eng.perks.multishot += 1;
        break;
      case 'ricochet':
        eng.perks.ricochet = true;
        break;
      case 'freeze':
        eng.perks.freeze = true;
        break;
      case 'explosive':
        eng.perks.explosive = true;
        break;
      case 'shield':
        eng.perks.shield = true;
        break;
      case 'atk_speed':
        eng.perks.attackSpeedBonus += 0.4;
        break;
      case 'max_hp':
        eng.player.maxHp += 40;
        eng.player.hp = Math.min(eng.player.maxHp, eng.player.hp + 40);
        setPlayerMaxHp(eng.player.maxHp);
        setPlayerHp(eng.player.hp);
        break;
    }

    setActivePerks((prev) => [...prev, skillId]);
    setGameState('playing');
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = engineRef.current.keys;
      if (e.key === 'w' || e.key === 'W') k.w = true;
      if (e.key === 'a' || e.key === 'A') k.a = true;
      if (e.key === 's' || e.key === 'S') k.s = true;
      if (e.key === 'd' || e.key === 'D') k.d = true;
      if (e.key === 'ArrowUp') k.up = true;
      if (e.key === 'ArrowLeft') k.left = true;
      if (e.key === 'ArrowDown') k.down = true;
      if (e.key === 'ArrowRight') k.right = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = engineRef.current.keys;
      if (e.key === 'w' || e.key === 'W') k.w = false;
      if (e.key === 'a' || e.key === 'A') k.a = false;
      if (e.key === 's' || e.key === 'S') k.s = false;
      if (e.key === 'd' || e.key === 'D') k.d = false;
      if (e.key === 'ArrowUp') k.up = false;
      if (e.key === 'ArrowLeft') k.left = false;
      if (e.key === 'ArrowDown') k.down = false;
      if (e.key === 'ArrowRight') k.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Pointer / Touch Joystick Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const joy = engineRef.current.joystick;
    joy.active = true;
    joy.startX = x;
    joy.startY = y;
    joy.currX = x;
    joy.currY = y;
    joy.moveX = 0;
    joy.moveY = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const joy = engineRef.current.joystick;
    if (!joy.active || gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    joy.currX = x;
    joy.currY = y;
    const dx = x - joy.startX;
    const dy = y - joy.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 45;

    if (dist > 5) {
      const angle = Math.atan2(dy, dx);
      const intensity = Math.min(1, dist / maxRadius);
      joy.moveX = Math.cos(angle) * intensity;
      joy.moveY = Math.sin(angle) * intensity;
    } else {
      joy.moveX = 0;
      joy.moveY = 0;
    }
  };

  const handlePointerUp = () => {
    const joy = engineRef.current.joystick;
    joy.active = false;
    joy.moveX = 0;
    joy.moveY = 0;
  };

  // Main 60 FPS Engine Loop
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

      // 1. UPDATE GAMEPLAY (Player Movement & Auto-Aim Shoot)
      if (gameState === 'playing') {
        const p = eng.player;
        const keys = eng.keys;
        const joy = eng.joystick;

        // Compute input movement vector
        let moveX = joy.moveX;
        let moveY = joy.moveY;

        if (keys.a || keys.left) moveX -= 1;
        if (keys.d || keys.right) moveX += 1;
        if (keys.w || keys.up) moveY -= 1;
        if (keys.s || keys.down) moveY += 1;

        const moveMag = Math.sqrt(moveX * moveX + moveY * moveY);
        if (moveMag > 0.05) {
          p.isMoving = true;
          const normX = moveX / Math.max(1, moveMag);
          const normY = moveY / Math.max(1, moveMag);
          p.x = Math.max(25, Math.min(width - 25, p.x + normX * p.speed));
          p.y = Math.max(80, Math.min(height - 40, p.y + normY * p.speed));
          p.angle = Math.atan2(normY, normX);
        } else {
          p.isMoving = false;
        }

        // Orbital Shield rotation
        if (eng.perks.shield) {
          eng.perks.shieldAngle += 0.06;
        }

        // Stutter-Step Auto Attack: When standing still, lock onto nearest enemy and rapid-fire!
        if (!p.isMoving && eng.enemies.length > 0) {
          p.attackCooldown--;

          // Find nearest target enemy
          let nearestEnemy: Enemy | null = null;
          let minDist = 99999;
          eng.enemies.forEach((enemy) => {
            const dx = enemy.x - p.x;
            const dy = enemy.y - p.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < minDist) {
              minDist = d;
              nearestEnemy = enemy;
            }
          });

          if (nearestEnemy) {
            const dx = (nearestEnemy as Enemy).x - p.x;
            const dy = (nearestEnemy as Enemy).y - p.y;
            p.angle = Math.atan2(dy, dx);

            // Ready to shoot arrow
            const interval = Math.max(8, Math.round(p.attackInterval / eng.perks.attackSpeedBonus));
            if (p.attackCooldown <= 0) {
              p.attackCooldown = interval;
              sound.playLaser();

              const speed = 9;
              const angle = p.angle;
              const multishotCount = eng.perks.multishot;

              // Fire main arrow + multishot spread arrows
              for (let m = -multishotCount; m <= multishotCount; m++) {
                const spreadAngle = angle + m * 0.16;
                eng.projectiles.push({
                  x: p.x + Math.cos(spreadAngle) * p.radius,
                  y: p.y + Math.sin(spreadAngle) * p.radius,
                  vx: Math.cos(spreadAngle) * speed,
                  vy: Math.sin(spreadAngle) * speed,
                  radius: 5,
                  color: eng.perks.freeze ? '#38bdf8' : eng.perks.explosive ? '#f43f5e' : '#00f0ff',
                  isPlayer: true,
                  damage: 18 + eng.player.level * 4,
                  bounces: eng.perks.ricochet ? 2 : 0,
                  isFreeze: eng.perks.freeze,
                  isExplosive: eng.perks.explosive,
                });
              }
            }
          }
        }

        // Update Projectiles
        for (let i = eng.projectiles.length - 1; i >= 0; i--) {
          const proj = eng.projectiles[i];
          proj.x += proj.vx;
          proj.y += proj.vy;

          // Out of bounds check
          if (proj.x < 10 || proj.x > width - 10 || proj.y < 40 || proj.y > height - 10) {
            eng.projectiles.splice(i, 1);
            continue;
          }

          // Player projectile hit enemies
          if (proj.isPlayer) {
            let hit = false;
            for (let e = eng.enemies.length - 1; e >= 0; e--) {
              const enemy = eng.enemies[e];
              const dx = proj.x - enemy.x;
              const dy = proj.y - enemy.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < proj.radius + enemy.radius) {
                hit = true;
                enemy.hp -= proj.damage;
                sound.playHit();

                // Freeze effect
                if (proj.isFreeze) {
                  enemy.speed = Math.max(0.6, enemy.speed * 0.7);
                }

                // Explosive AoE Blast
                if (proj.isExplosive) {
                  sound.playExplosion();
                  eng.enemies.forEach((other) => {
                    const dEx = other.x - enemy.x;
                    const dEy = other.y - enemy.y;
                    if (Math.sqrt(dEx * dEx + dEy * dEy) < 65) {
                      other.hp -= proj.damage * 0.6;
                    }
                  });
                }

                // Particle sparks
                for (let pt = 0; pt < 6; pt++) {
                  eng.particles.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    color: proj.color,
                    alpha: 1,
                    size: 3 + Math.random() * 3,
                  });
                }

                // Enemy Defeated Check
                if (enemy.hp <= 0) {
                  eng.enemies.splice(e, 1);
                  setScore((s) => s + (enemy.isBoss ? 500 : 80));

                  // Gain EXP
                  const gainedExp = enemy.isBoss ? 120 : 35;
                  setExp((prevExp) => {
                    const nextExp = prevExp + gainedExp;
                    if (nextExp >= expToNext) {
                      setPlayerLevel((lvl) => {
                        const nextLvl = lvl + 1;
                        eng.player.level = nextLvl;
                        return nextLvl;
                      });
                      setExpToNext((en) => en + 70);
                      triggerLevelUp();
                      return nextExp - expToNext;
                    }
                    return nextExp;
                  });
                }
                break;
              }
            }

            if (hit) {
              if (proj.bounces > 0 && eng.enemies.length > 0) {
                proj.bounces--;
                // Ricochet to next nearest enemy
                const target = eng.enemies[Math.floor(Math.random() * eng.enemies.length)];
                const angle = Math.atan2(target.y - proj.y, target.x - proj.x);
                proj.vx = Math.cos(angle) * 8;
                proj.vy = Math.sin(angle) * 8;
              } else {
                eng.projectiles.splice(i, 1);
              }
            }
          } else {
            // Enemy projectile hit player
            const dx = proj.x - p.x;
            const dy = proj.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Shield block check
            if (eng.perks.shield) {
              const shieldX = p.x + Math.cos(eng.perks.shieldAngle) * 35;
              const shieldY = p.y + Math.sin(eng.perks.shieldAngle) * 35;
              const dShield = Math.sqrt((proj.x - shieldX) ** 2 + (proj.y - shieldY) ** 2);
              if (dShield < 16) {
                eng.projectiles.splice(i, 1);
                sound.playHit();
                continue;
              }
            }

            if (dist < proj.radius + p.radius) {
              eng.projectiles.splice(i, 1);
              p.hp -= proj.damage;
              setPlayerHp(Math.max(0, p.hp));
              eng.shake = 8;
              sound.playExplosion();

              if (p.hp <= 0) {
                sound.playGameOver();
                setGameState('gameover');
              }
            }
          }
        }

        // Update Enemies AI & Shooting
        eng.enemies.forEach((enemy) => {
          // Move towards player
          const dx = p.x - enemy.x;
          const dy = p.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (enemy.type === 'charger') {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
          } else {
            // Keep moderate distance and strafe
            if (dist > 180) {
              enemy.x += (dx / dist) * enemy.speed;
              enemy.y += (dy / dist) * enemy.speed;
            } else if (dist < 100) {
              enemy.x -= (dx / dist) * enemy.speed * 0.8;
              enemy.y -= (dy / dist) * enemy.speed * 0.8;
            }
            enemy.x += (Math.random() - 0.5) * 1.2;
          }

          // Enemy Shooting
          enemy.shootCooldown--;
          if (enemy.shootCooldown <= 0) {
            enemy.shootCooldown = enemy.isBoss ? 35 : 90 + Math.floor(Math.random() * 40);

            if (enemy.isBoss) {
              // Boss 8-way bullet spray
              sound.playLaser();
              for (let b = 0; b < 6; b++) {
                const bAngle = (b * Math.PI) / 3 + performance.now() * 0.002;
                eng.projectiles.push({
                  x: enemy.x,
                  y: enemy.y,
                  vx: Math.cos(bAngle) * 4.2,
                  vy: Math.sin(bAngle) * 4.2,
                  radius: 6,
                  color: '#f43f5e',
                  isPlayer: false,
                  damage: 15,
                  bounces: 0,
                });
              }
            } else if (enemy.type === 'drone') {
              const bAngle = Math.atan2(dy, dx);
              eng.projectiles.push({
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(bAngle) * 4.5,
                vy: Math.sin(bAngle) * 4.5,
                radius: 4.5,
                color: '#a855f7',
                isPlayer: false,
                damage: 10,
                bounces: 0,
              });
            }
          }
        });

        // Wave Completion Check
        if (eng.enemies.length === 0) {
          const nextWave = currentWave + 1;
          setCurrentWave(nextWave);
          sound.playPowerup();
          confetti({ particleCount: 60, spread: 50, origin: { y: 0.5 } });
          setCoins((c) => {
            const nextCoins = c + 40 * currentWave;
            localStorage.setItem('cyber_hunter_coins', nextCoins.toString());
            return nextCoins;
          });
          spawnWave(nextWave);
        }
      }

      // 2. RENDER ARENA CANVAS
      ctx.clearRect(0, 0, width, height);

      // Camera Shake
      ctx.save();
      if (eng.shake > 0) {
        ctx.translate((Math.random() - 0.5) * eng.shake, (Math.random() - 0.5) * eng.shake);
        eng.shake *= 0.88;
        if (eng.shake < 0.2) eng.shake = 0;
      }

      // Futuristic Cyber Dungeon Arena Floor Grid
      ctx.fillStyle = '#060b17';
      ctx.fillRect(0, 0, width, height);

      // Grid Tiles
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Arena Outer Neon Border
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3;
      ctx.strokeRect(15, 60, width - 30, height - 75);
      ctx.shadowBlur = 0;

      // Draw Enemies
      eng.enemies.forEach((enemy) => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        // Enemy Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, enemy.radius * 0.8, enemy.radius, enemy.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Enemy Body
        ctx.fillStyle = enemy.color;
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();

        // Enemy Core Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Health Bar above Enemy
        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        const barW = enemy.radius * 2.2;
        const barH = 4;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-barW / 2, -enemy.radius - 10, barW, barH);
        ctx.fillStyle = enemy.isBoss ? '#f43f5e' : '#22c55e';
        ctx.fillRect(-barW / 2, -enemy.radius - 10, barW * hpPct, barH);

        ctx.restore();
      });

      // Draw Projectiles
      eng.projectiles.forEach((proj) => {
        ctx.save();
        ctx.fillStyle = proj.color;
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Player Hero (Cyber Mech Archer)
      const p = eng.player;
      ctx.save();
      ctx.translate(p.x, p.y);

      // Hero Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(0, p.radius * 0.7, p.radius * 1.1, p.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hero Mech Body
      ctx.rotate(p.angle);
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Cyber Bow / Weapon Barrel
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.radius * 0.4, -4, 14, 8);

      ctx.restore();

      // Draw Orbital Shield Drone
      if (eng.perks.shield) {
        const sx = p.x + Math.cos(eng.perks.shieldAngle) * 35;
        const sy = p.y + Math.sin(eng.perks.shieldAngle) * 35;
        ctx.save();
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const pt = eng.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.03;

        if (pt.alpha <= 0) {
          eng.particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Touch Joystick UI
      const joy = eng.joystick;
      if (joy.active) {
        ctx.save();
        // Joystick Base Ring
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(joy.startX, joy.startY, 45, 0, Math.PI * 2);
        ctx.stroke();

        // Joystick Thumb Knob
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(joy.currX, joy.currY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore(); // Restore camera shake

      eng.animationFrameId = requestAnimationFrame(tick);
    };

    eng.animationFrameId = requestAnimationFrame(tick);
    return () => {
      isRunning = false;
      cancelAnimationFrame(eng.animationFrameId);
    };
  }, [gameState, currentWave, expToNext]);

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans">
      {/* 1. TOP HUD (HP, Level, Wave, Exp Bar, Coins) */}
      <div className="w-full mb-2 p-2.5 rounded-2xl bg-slate-900/95 border border-slate-800 text-white backdrop-blur-md shadow-xl space-y-2">
        <div className="flex items-center justify-between">
          {/* Health Bar */}
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <div className="w-24 sm:w-32 h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${Math.max(0, (playerHp / playerMaxHp) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-300">{playerHp}/{playerMaxHp}</span>
          </div>

          {/* Level & Wave */}
          <div className="flex items-center gap-1.5">
            <div className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-black">
              LV {playerLevel}
            </div>
            <div className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
              WAVE {currentWave}
            </div>
          </div>

          {/* Coins & Sound */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black">
              <span>🪙</span>
              <span>{coins}</span>
            </div>
            <button
              onClick={() => {
                const m = sound.toggleMute();
                setIsMuted(m);
              }}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* EXP Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-200"
            style={{ width: `${Math.min(100, (exp / expToNext) * 100)}%` }}
          />
        </div>
      </div>

      {/* 2. MAIN CYBER DUNGEON ARENA */}
      <div className="relative w-full aspect-[540/760] max-h-[74vh] sm:max-h-[82vh] rounded-3xl overflow-hidden border-2 border-slate-800 bg-[#060b17] shadow-2xl shadow-cyan-950/40 touch-none">
        <canvas
          ref={canvasRef}
          width={540}
          height={760}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full block cursor-crosshair touch-none"
        />

        {/* STUTTER-STEP AUTO SHOOT HINT */}
        {gameState === 'playing' && (
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center pointer-events-none z-10 px-2">
            <div className="px-3.5 py-1 rounded-full bg-slate-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold backdrop-blur-md shadow-lg flex items-center gap-1.5 animate-pulse">
              <span>🏃‍♂️ Move to Dodge • 🛑 STOP to Rapid-Fire Plasma Arrows!</span>
            </div>
          </div>
        )}

        {/* 3. SKILL LEVEL UP MODAL */}
        {gameState === 'skill_select' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40 space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/40 animate-bounce">
              <Award className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">LEVEL UP!</h3>
              <p className="text-xs text-cyan-400 font-bold">Choose 1 Cyber Roguelite Perk:</p>
            </div>

            <div className="w-full max-w-xs space-y-2.5">
              {skillChoices.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => handleSelectSkill(skill.id)}
                  className="w-full p-3 rounded-2xl bg-slate-900/90 border border-slate-700 hover:border-cyan-400 hover:bg-slate-850 flex items-center gap-3 text-left transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                >
                  <div className="text-2xl p-2 rounded-xl bg-slate-800 shrink-0">{skill.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-white" style={{ color: skill.color }}>{skill.name}</div>
                    <div className="text-[11px] text-slate-400 leading-tight">{skill.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. IDLE / START SCREEN OVERLAY */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-6 text-center z-30 animate-fade-in">
            <div className="space-y-2 mt-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/40 animate-bounce text-white">
                <Crosshair className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                STEALTH <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300">ASSASSIN</span>
              </h2>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                The Archero roguelite shooter in neon cyberpunk style! Move to dodge, stop to shoot, and select powerful perks on level up!
              </p>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-base shadow-xl shadow-cyan-500/40 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>ENTER CYBER DUNGEON</span>
            </button>
          </div>
        )}

        {/* 5. GAME OVER SCREEN OVERLAY */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Flame className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">MISSION FAILED!</h3>
              <p className="text-xs text-slate-400">You reached Wave {currentWave} with {score} points</p>
            </div>

            <button
              onClick={handleStartGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-600 hover:from-rose-400 hover:to-orange-500 text-white font-black text-sm shadow-xl shadow-rose-500/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>TRY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Controls Cheatsheet */}
      <div className="mt-2 w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Controls: <strong>Drag Joystick or WASD / ◀ ▲ ▼ ▶</strong></span>
        <span className="text-cyan-400 font-bold">Stutter-Step Shoot</span>
      </div>
    </div>
  );
};
