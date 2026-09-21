import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Shield, Trophy, Heart, Crosshair, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface Props {
  onGameOver?: (score: number) => void;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isEnemy: boolean;
  damage: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'scout' | 'cruiser' | 'meteor' | 'boss';
  hp: number;
  maxHp: number;
  vx: number;
  vy: number;
  shootTimer: number;
  color: string;
  angle: number;
}

interface DropItem {
  x: number;
  y: number;
  type: 'upgrade' | 'heal' | 'shield' | 'nuke';
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
  life: number;
  maxLife: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

export const GalaxyDefender: React.FC<Props> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [weaponLevel, setWeaponLevel] = useState(1);
  const [wave, setWave] = useState(1);
  const [bossHp, setBossHp] = useState<number | null>(null);
  const [bossMaxHp, setBossMaxHp] = useState<number | null>(null);
  const [muted, setMuted] = useState(sound.isMuted());
  const [isNewHigh, setIsNewHigh] = useState(false);

  const stateRef = useRef({
    gameState: 'idle' as 'idle' | 'playing' | 'paused' | 'gameover',
    score: 0,
    highScore: 0,
    lives: 3,
    weaponLevel: 1,
    wave: 1,
    waveTimer: 0,
    hasShield: false,
    shake: 0,

    player: {
      x: 400,
      y: 380,
      width: 44,
      height: 48,
      speed: 7,
      shootCooldown: 0,
      invulnerableTimer: 0,
    },

    keys: {
      left: false,
      right: false,
      up: false,
      down: false,
      shoot: false,
    },

    mousePos: { x: 400, y: 380, isDown: false, active: false },

    stars: [] as Star[],
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    items: [] as DropItem[],
    particles: [] as Particle[],
    enemyIdCounter: 1,
  });

  // Load Highscore
  useEffect(() => {
    const saved = localStorage.getItem('novaplay_hs_galaxy_defender');
    if (saved) {
      const val = parseInt(saved, 10);
      setHighScore(val);
      stateRef.current.highScore = val;
    }
  }, []);

  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#818cf8', '#fbbf24', '#f43f5e'],
      });
    } catch {
      // ignore
    }
  }, []);

  const addExplosion = (x: number, y: number, color = '#f97316', count = 18) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 1.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 25 + 15,
      });
    }
  };

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const s = stateRef.current;
    s.gameState = 'playing';
    s.score = 0;
    s.lives = 3;
    s.weaponLevel = 1;
    s.wave = 1;
    s.waveTimer = 0;
    s.hasShield = false;
    s.bullets = [];
    s.enemies = [];
    s.items = [];
    s.particles = [];
    s.player.x = canvas.width / 2 - 22;
    s.player.y = canvas.height - 70;
    s.player.invulnerableTimer = 60;

    setGameState('playing');
    setScore(0);
    setLives(3);
    setWeaponLevel(1);
    setWave(1);
    setBossHp(null);
    setBossMaxHp(null);
    setIsNewHigh(false);
    sound.playClick();
  }, []);

  const handleGameOver = useCallback(() => {
    const s = stateRef.current;
    s.gameState = 'gameover';
    setGameState('gameover');
    sound.playGameOver();

    if (s.score > s.highScore) {
      s.highScore = s.score;
      setHighScore(s.score);
      setIsNewHigh(true);
      localStorage.setItem('novaplay_hs_galaxy_defender', String(s.score));
      triggerConfetti();
    }

    if (onGameOver) {
      onGameOver(s.score);
    }
  }, [onGameOver, triggerConfetti]);

  // Init Stars
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * 800,
        y: Math.random() * 450,
        size: Math.random() * 2 + 0.8,
        speed: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
      });
    }
    stateRef.current.stars = stars;
  }, []);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') k.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') k.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') k.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') k.down = true;
      if (e.code === 'Space') {
        k.shoot = true;
        if (stateRef.current.gameState === 'idle' || stateRef.current.gameState === 'gameover') {
          startGame();
        }
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (stateRef.current.gameState === 'playing') {
          stateRef.current.gameState = 'paused';
          setGameState('paused');
        } else if (stateRef.current.gameState === 'paused') {
          stateRef.current.gameState = 'playing';
          setGameState('playing');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') k.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') k.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') k.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') k.down = false;
      if (e.code === 'Space') k.shoot = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startGame]);

  // Main Canvas Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const s = stateRef.current;
      const width = canvas.width;
      const height = canvas.height;

      // Screen Shake
      if (s.shake > 0) {
        s.shake--;
      }

      ctx.save();
      if (s.shake > 0) {
        ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      }

      // Background Nebula
      ctx.fillStyle = '#050713';
      ctx.fillRect(0, 0, width, height);

      // Starfield
      for (const st of s.stars) {
        st.y += st.speed;
        if (st.y > height) {
          st.y = 0;
          st.x = Math.random() * width;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${st.alpha})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Game Logic if playing
      if (s.gameState === 'playing') {
        const p = s.player;
        const k = s.keys;
        const m = s.mousePos;

        // Player Movement (Mouse/Touch Priority or Keyboard)
        if (m.active) {
          p.x += (m.x - 22 - p.x) * 0.25;
          p.y += (m.y - 24 - p.y) * 0.25;
        } else {
          if (k.left) p.x -= p.speed;
          if (k.right) p.x += p.speed;
          if (k.up) p.y -= p.speed;
          if (k.down) p.y += p.speed;
        }

        // Clamp inside canvas
        p.x = Math.max(8, Math.min(width - p.width - 8, p.x));
        p.y = Math.max(20, Math.min(height - p.height - 10, p.y));

        if (p.invulnerableTimer > 0) {
          p.invulnerableTimer--;
        }

        // Auto or manual Shooting
        p.shootCooldown--;
        if (p.shootCooldown <= 0) {
          p.shootCooldown = 11; // fire rate
          sound.playLaser();

          const cx = p.x + p.width / 2;
          const cy = p.y;

          if (s.weaponLevel === 1) {
            // Single beam
            s.bullets.push({ x: cx, y: cy, vx: 0, vy: -12, radius: 3.5, color: '#38bdf8', isEnemy: false, damage: 1 });
          } else if (s.weaponLevel === 2) {
            // Dual laser
            s.bullets.push({ x: cx - 12, y: cy + 4, vx: 0, vy: -12, radius: 3.5, color: '#38bdf8', isEnemy: false, damage: 1 });
            s.bullets.push({ x: cx + 12, y: cy + 4, vx: 0, vy: -12, radius: 3.5, color: '#38bdf8', isEnemy: false, damage: 1 });
          } else if (s.weaponLevel === 3) {
            // Triple laser
            s.bullets.push({ x: cx, y: cy, vx: 0, vy: -13, radius: 4, color: '#fbbf24', isEnemy: false, damage: 1.2 });
            s.bullets.push({ x: cx - 14, y: cy + 6, vx: -2, vy: -12, radius: 3.5, color: '#38bdf8', isEnemy: false, damage: 1 });
            s.bullets.push({ x: cx + 14, y: cy + 6, vx: 2, vy: -12, radius: 3.5, color: '#38bdf8', isEnemy: false, damage: 1 });
          } else {
            // Nova Quad + Spread Cannon
            s.bullets.push({ x: cx - 6, y: cy, vx: 0, vy: -14, radius: 4, color: '#f43f5e', isEnemy: false, damage: 1.8 });
            s.bullets.push({ x: cx + 6, y: cy, vx: 0, vy: -14, radius: 4, color: '#f43f5e', isEnemy: false, damage: 1.8 });
            s.bullets.push({ x: cx - 18, y: cy + 8, vx: -3.5, vy: -12, radius: 3.5, color: '#38bdf8', isEnemy: false, damage: 1.2 });
            s.bullets.push({ x: cx + 18, y: cy + 8, vx: 3.5, vy: -12, radius: 3.5, color: '#38bdf8', isEnemy: false, damage: 1.2 });
          }
        }

        // Wave Progression & Enemy Spawning
        s.waveTimer++;
        const bossPresent = s.enemies.some((e) => e.type === 'boss');

        // Spawn standard enemies
        if (!bossPresent && s.waveTimer % 45 === 0) {
          const rand = Math.random();
          let eType: Enemy['type'] = 'scout';
          let eHp = 1;
          let eW = 34;
          let eH = 34;
          let color = '#a855f7';
          let vx = (Math.random() - 0.5) * 2;
          let vy = Math.random() * 1.5 + 2;

          if (rand < 0.35) {
            eType = 'meteor';
            eHp = 2 + Math.floor(s.wave * 0.5);
            eW = 40;
            eH = 40;
            color = '#f97316';
            vy = Math.random() * 2 + 1.5;
          } else if (rand < 0.7) {
            eType = 'cruiser';
            eHp = 3 + s.wave;
            eW = 46;
            eH = 44;
            color = '#ef4444';
            vy = 1.6;
          }

          s.enemies.push({
            id: s.enemyIdCounter++,
            x: Math.random() * (width - 60) + 30,
            y: -50,
            width: eW,
            height: eH,
            type: eType,
            hp: eHp,
            maxHp: eHp,
            vx,
            vy,
            shootTimer: Math.floor(Math.random() * 40 + 30),
            color,
            angle: 0,
          });
        }

        // Spawn Boss at wave interval
        if (!bossPresent && s.waveTimer > 900) {
          const bMax = 40 + s.wave * 25;
          s.enemies.push({
            id: s.enemyIdCounter++,
            x: width / 2 - 60,
            y: -100,
            width: 120,
            height: 80,
            type: 'boss',
            hp: bMax,
            maxHp: bMax,
            vx: 2.2,
            vy: 0.8,
            shootTimer: 25,
            color: '#dc2626',
            angle: 0,
          });
          setBossHp(bMax);
          setBossMaxHp(bMax);
        }

        // Update Boss HP State in React
        const activeBoss = s.enemies.find((e) => e.type === 'boss');
        if (activeBoss) {
          setBossHp(activeBoss.hp);
        } else if (bossHp !== null) {
          setBossHp(null);
          setBossMaxHp(null);
        }

        // Update Bullets
        for (let i = s.bullets.length - 1; i >= 0; i--) {
          const b = s.bullets[i];
          b.x += b.vx;
          b.y += b.vy;

          if (b.y < -20 || b.y > height + 20 || b.x < -20 || b.x > width + 20) {
            s.bullets.splice(i, 1);
            continue;
          }

          // If enemy bullet -> check player collision
          if (b.isEnemy) {
            const pDist = Math.hypot(b.x - (p.x + p.width / 2), b.y - (p.y + p.height / 2));
            if (pDist < b.radius + 18) {
              s.bullets.splice(i, 1);
              if (p.invulnerableTimer <= 0) {
                if (s.hasShield) {
                  s.hasShield = false;
                  sound.playHit();
                  addExplosion(p.x + 22, p.y + 24, '#38bdf8', 15);
                  p.invulnerableTimer = 40;
                } else {
                  s.lives--;
                  setLives(s.lives);
                  s.shake = 8;
                  sound.playHit();
                  addExplosion(p.x + 22, p.y + 24, '#ef4444', 25);
                  p.invulnerableTimer = 60;
                  if (s.lives <= 0) {
                    handleGameOver();
                    break;
                  }
                }
              }
            }
          }
        }

        // Update Enemies
        for (let i = s.enemies.length - 1; i >= 0; i--) {
          const e = s.enemies[i];
          e.x += e.vx;
          e.y += e.vy;

          // Bounce off walls
          if (e.x < 10 || e.x > width - e.width - 10) {
            e.vx *= -1;
          }

          // Boss horizontal sweep
          if (e.type === 'boss') {
            if (e.y > 60) e.vy = 0; // stop moving down, hover at top
          }

          // Enemy shooting
          e.shootTimer--;
          if (e.shootTimer <= 0) {
            if (e.type === 'cruiser') {
              e.shootTimer = 65;
              s.bullets.push({
                x: e.x + e.width / 2,
                y: e.y + e.height,
                vx: 0,
                vy: 4.5,
                radius: 4,
                color: '#ef4444',
                isEnemy: true,
                damage: 1,
              });
            } else if (e.type === 'boss') {
              e.shootTimer = 22;
              // 3-way boss spread
              s.bullets.push({
                x: e.x + 25,
                y: e.y + e.height,
                vx: -2,
                vy: 5,
                radius: 5,
                color: '#f43f5e',
                isEnemy: true,
                damage: 1,
              });
              s.bullets.push({
                x: e.x + e.width / 2,
                y: e.y + e.height,
                vx: 0,
                vy: 5.5,
                radius: 6,
                color: '#fbbf24',
                isEnemy: true,
                damage: 1,
              });
              s.bullets.push({
                x: e.x + e.width - 25,
                y: e.y + e.height,
                vx: 2,
                vy: 5,
                radius: 5,
                color: '#f43f5e',
                isEnemy: true,
                damage: 1,
              });
            }
          }

          // Check bullet hit on enemy
          for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
            const b = s.bullets[bi];
            if (b.isEnemy) continue;

            if (b.x > e.x && b.x < e.x + e.width && b.y > e.y && b.y < e.y + e.height) {
              e.hp -= b.damage;
              s.bullets.splice(bi, 1);
              addExplosion(b.x, b.y, '#38bdf8', 4);

              // Enemy Destroyed
              if (e.hp <= 0) {
                sound.playExplosion();
                s.shake = e.type === 'boss' ? 16 : 4;
                addExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color, e.type === 'boss' ? 45 : 18);

                const pointGain = e.type === 'boss' ? 5000 : e.type === 'cruiser' ? 300 : e.type === 'meteor' ? 200 : 150;
                s.score += pointGain;

                // Item Drop Chance
                const dropRand = Math.random();
                if (dropRand < 0.22 || e.type === 'boss') {
                  const dropType = dropRand < 0.1 ? 'upgrade' : dropRand < 0.16 ? 'heal' : 'shield';
                  s.items.push({
                    x: e.x + e.width / 2,
                    y: e.y + e.height / 2,
                    type: dropType,
                    vy: 2.2,
                  });
                }

                // If boss killed -> advance wave
                if (e.type === 'boss') {
                  s.wave++;
                  s.waveTimer = 0;
                  setWave(s.wave);
                  sound.playPowerup();
                  triggerConfetti();
                }

                s.enemies.splice(i, 1);
                break;
              }
            }
          }

          // Remove offscreen
          if (e.y > height + 50) {
            s.enemies.splice(i, 1);
          }
        }

        // Update Items
        for (let i = s.items.length - 1; i >= 0; i--) {
          const it = s.items[i];
          it.y += it.vy;

          const dist = Math.hypot(it.x - (p.x + p.width / 2), it.y - (p.y + p.height / 2));
          if (dist < 32) {
            if (it.type === 'upgrade') {
              sound.playPowerup();
              s.weaponLevel = Math.min(4, s.weaponLevel + 1);
              setWeaponLevel(s.weaponLevel);
            } else if (it.type === 'heal') {
              sound.playCollect();
              s.lives = Math.min(5, s.lives + 1);
              setLives(s.lives);
            } else if (it.type === 'shield') {
              sound.playPowerup();
              s.hasShield = true;
            }
            s.score += 250;
            s.items.splice(i, 1);
            continue;
          }

          if (it.y > height + 20) {
            s.items.splice(i, 1);
          }
        }

        setScore(s.score);
      }

      // Draw Bullets
      for (const b of s.bullets) {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Items
      for (const it of s.items) {
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.shadowBlur = 12;

        if (it.type === 'upgrade') {
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#fbbf24';
          ctx.fillRect(-10, -10, 20, 20);
          ctx.fillStyle = '#000';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText('UP', -7, 4);
        } else if (it.type === 'heal') {
          ctx.fillStyle = '#10b981';
          ctx.shadowColor = '#10b981';
          ctx.fillRect(-4, -10, 8, 20);
          ctx.fillRect(-10, -4, 20, 8);
        } else {
          ctx.strokeStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Enemies
      for (const e of s.enemies) {
        ctx.save();
        ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 10;

        if (e.type === 'meteor') {
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.arc(0, 0, e.width / 2, 0, Math.PI * 2);
          ctx.fill();
          // Craters
          ctx.fillStyle = '#9a3412';
          ctx.beginPath();
          ctx.arc(-6, -6, 5, 0, Math.PI * 2);
          ctx.arc(8, 4, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (e.type === 'scout') {
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.moveTo(0, e.height / 2);
          ctx.lineTo(-e.width / 2, -e.height / 2);
          ctx.lineTo(0, -e.height / 4);
          ctx.lineTo(e.width / 2, -e.height / 2);
          ctx.closePath();
          ctx.fill();
        } else if (e.type === 'cruiser') {
          ctx.fillStyle = e.color;
          ctx.fillRect(-e.width / 2, -e.height / 2, e.width, e.height * 0.7);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-6, 0, 12, 10);
        } else if (e.type === 'boss') {
          ctx.fillStyle = '#991b1b';
          ctx.beginPath();
          ctx.roundRect(-e.width / 2, -e.height / 2, e.width, e.height, 12);
          ctx.fill();

          // Boss Cannons & Core
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-45, 10, 12, 25);
          ctx.fillRect(33, 10, 12, 25);
        }

        ctx.restore();
      }

      // Draw Player Starship
      const p = s.player;
      if (s.gameState === 'playing' || s.gameState === 'idle') {
        ctx.save();
        ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

        // Invulnerability flicker
        if (p.invulnerableTimer % 4 < 2) {
          // Thruster flame
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(-8, p.height / 2 - 2);
          ctx.lineTo(0, p.height / 2 + 16 + Math.random() * 8);
          ctx.lineTo(8, p.height / 2 - 2);
          ctx.closePath();
          ctx.fill();

          // Ship Hull
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.moveTo(0, -p.height / 2);
          ctx.lineTo(p.width / 2, p.height / 2 - 4);
          ctx.lineTo(p.width / 4, p.height / 2 - 12);
          ctx.lineTo(-p.width / 4, p.height / 2 - 12);
          ctx.lineTo(-p.width / 2, p.height / 2 - 4);
          ctx.closePath();
          ctx.fill();

          // Cockpit Visor
          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.arc(0, -4, 6, 0, Math.PI * 2);
          ctx.fill();

          // Wing Lasers
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-p.width / 2, 0, 4, 14);
          ctx.fillRect(p.width / 2 - 4, 0, 4, 14);
        }

        // Shield Dome
        if (s.hasShield) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(0, 0, p.width * 0.75, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Draw Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
        pt.alpha = 1 - pt.life / pt.maxLife;

        if (pt.life >= pt.maxLife) {
          s.particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [handleGameOver, bossHp]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 450 / rect.height;

    stateRef.current.mousePos.x = (e.clientX - rect.left) * scaleX;
    stateRef.current.mousePos.y = (e.clientY - rect.top) * scaleY;
    stateRef.current.mousePos.active = true;
  };

  const toggleSound = () => {
    const isMute = sound.toggleMute();
    setMuted(isMute);
  };

  return (
    <div id="galaxy-defender-wrapper" className="relative w-full max-w-4xl mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-blue-500/30 shadow-2xl shadow-blue-950/50">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-blue-500/20 backdrop-blur-md z-10 text-white select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-xs uppercase text-slate-400 font-semibold">Score</span>
            <span className="font-mono text-xl font-bold text-sky-400">{score.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1 pl-3 border-l border-slate-700">
            {Array.from({ length: 5 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${i < lives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-sky-300 font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SECTOR {wave}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold">
            <Crosshair className="w-3.5 h-3.5" />
            <span>LASER LVL {weaponLevel}</span>
          </div>

          <button
            id="galaxy-mute-btn"
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Boss Health Bar Overlay */}
      {bossHp !== null && bossMaxHp !== null && (
        <div className="px-6 py-2 bg-red-950/80 border-b border-red-500/30 flex flex-col gap-1 z-10 select-none">
          <div className="flex justify-between text-xs text-red-300 font-bold tracking-wider">
            <span>⚠️ WARNING: MOTHERSHIP DREADNOUGHT</span>
            <span>{Math.max(0, bossHp)} / {bossMaxHp} HP</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-400 transition-all duration-100"
              style={{ width: `${Math.max(0, (bossHp / bossMaxHp) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] max-h-[520px] bg-black">
        <canvas
          id="galaxy-defender-canvas"
          ref={canvasRef}
          width={800}
          height={450}
          onPointerMove={handlePointerMove}
          onPointerDown={(e) => {
            handlePointerMove(e);
            if (gameState === 'idle' || gameState === 'gameover') startGame();
          }}
          className="w-full h-full block cursor-crosshair touch-none"
        />

        {/* Start Overlay */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/40 animate-bounce">
              <Crosshair className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-amber-300 mb-2">
              GALAXY STRIKE
            </h2>
            <p className="text-slate-300 max-w-md text-sm mb-6">
              Defend Sector Alpha from alien cruisers, asteroids, and Dreadnought bosses! Drag mouse/finger to pilot your starship.
            </p>
            <button
              id="start-galaxy-btn"
              onClick={startGame}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-base shadow-lg shadow-sky-500/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              LAUNCH MISSION
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            {isNewHigh && (
              <div className="mb-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-sm font-bold animate-bounce flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                NEW HIGH SCORE!
              </div>
            )}
            <h3 className="text-3xl font-black text-rose-500 mb-1">STARSHIP DESTROYED</h3>
            <div className="my-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 w-64">
              <div className="text-xs text-slate-400 uppercase font-semibold">Final Sector Score</div>
              <div className="text-3xl font-mono font-bold text-sky-400 my-1">{score.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Sector Reached: {wave}</div>
            </div>

            <button
              id="retry-galaxy-btn"
              onClick={startGame}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-base shadow-lg shadow-sky-500/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              REDEPLOY FLEET
            </button>
          </div>
        )}

        {/* Paused */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <h3 className="text-2xl font-bold text-white mb-4">MISSION PAUSED</h3>
            <button
              id="resume-galaxy-btn"
              onClick={() => {
                stateRef.current.gameState = 'playing';
                setGameState('playing');
              }}
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm"
            >
              Resume (P)
            </button>
          </div>
        )}
      </div>

      {/* Control Tips & Mobile Buttons */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3 select-none touch-none">
        <div className="text-center sm:text-left">🚀 Drag on canvas or use buttons to navigate and blast invaders!</div>

        {/* Mobile Tactile D-Pad Controls */}
        <div className="flex items-center gap-2">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              stateRef.current.keys.left = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              stateRef.current.keys.left = false;
            }}
            onPointerLeave={() => {
              stateRef.current.keys.left = false;
            }}
            className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 text-sky-400 active:bg-sky-500 active:text-slate-950 flex items-center justify-center font-black text-lg shadow-md active:scale-90 transition-transform"
            title="Steer Left"
          >
            ◀
          </button>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              stateRef.current.keys.right = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              stateRef.current.keys.right = false;
            }}
            onPointerLeave={() => {
              stateRef.current.keys.right = false;
            }}
            className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 text-sky-400 active:bg-sky-500 active:text-slate-950 flex items-center justify-center font-black text-lg shadow-md active:scale-90 transition-transform"
            title="Steer Right"
          >
            ▶
          </button>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              if (gameState === 'idle' || gameState === 'gameover') startGame();
              stateRef.current.keys.shoot = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              stateRef.current.keys.shoot = false;
            }}
            onPointerLeave={() => {
              stateRef.current.keys.shoot = false;
            }}
            className="px-4 h-11 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-black text-xs flex items-center gap-1 shadow-lg shadow-sky-500/30 active:scale-90 transition-transform"
            title="Fire Plasma"
          >
            <span>⚡</span>
            <span>BLAST</span>
          </button>
        </div>
      </div>
    </div>
  );
};
