import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Award, Flame, Sparkles, Trophy, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface Props {
  onGameOver?: (score: number) => void;
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

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  glow: string;
  hits: number;
  maxHits: number;
  points: number;
  powerup?: 'multiball' | 'laser' | 'expand' | 'fireball' | 'life';
  alive: boolean;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isFireball: boolean;
  trail: { x: number; y: number; alpha: number }[];
}

interface PowerupDrop {
  x: number;
  y: number;
  vy: number;
  type: 'multiball' | 'laser' | 'expand' | 'fireball' | 'life';
  color: string;
  letter: string;
  collected: boolean;
}

interface LaserBullet {
  x: number;
  y: number;
  vy: number;
  alive: boolean;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export const BrickBreakerNeon: React.FC<Props> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover' | 'levelclear'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(1);
  const [activePowerup, setActivePowerup] = useState<string | null>(null);
  const [powerupTimer, setPowerupTimer] = useState(0);
  const [muted, setMuted] = useState(sound.isMuted());
  const [isNewHigh, setIsNewHigh] = useState(false);

  const engineRef = useRef({
    paddle: { x: 350, y: 550, w: 110, h: 14, targetW: 110, speed: 10, isLaser: false, laserCooldown: 0 },
    balls: [] as Ball[],
    bricks: [] as Brick[],
    powerups: [] as PowerupDrop[],
    lasers: [] as LaserBullet[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    keys: { left: false, right: false, space: false },
    animationFrameId: 0,
    lastTime: performance.now(),
    score: 0,
    highScore: 0,
    lives: 3,
    level: 1,
    combo: 1,
    comboTimer: 0,
    powerupTime: 0,
    activePowerupType: null as string | null,
    mouseX: 400,
    touchActive: false,
    screenShake: 0,
  });

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('novaplay_brick_breaker_highscore');
    if (saved) {
      const val = parseInt(saved, 10);
      setHighScore(val);
      engineRef.current.highScore = val;
    }
  }, []);

  const createBricks = useCallback((lvl: number): Brick[] => {
    const bricks: Brick[] = [];
    const rows = Math.min(4 + lvl, 7);
    const cols = 9;
    const padX = 10;
    const padY = 10;
    const brickW = 74;
    const brickH = 22;
    const startX = (800 - (cols * brickW + (cols - 1) * padX)) / 2;
    const startY = 80;

    const colors = [
      { color: '#ef4444', glow: '#f87171', points: 50 }, // Red
      { color: '#f97316', glow: '#fb923c', points: 40 }, // Orange
      { color: '#eab308', glow: '#fde047', points: 30 }, // Yellow
      { color: '#22c55e', glow: '#4ade80', points: 25 }, // Green
      { color: '#06b6d4', glow: '#67e8f9', points: 20 }, // Cyan
      { color: '#a855f7', glow: '#c084fc', points: 35 }, // Purple
      { color: '#ec4899', glow: '#f472b6', points: 45 }, // Pink
    ];

    const powerTypes: ('multiball' | 'laser' | 'expand' | 'fireball' | 'life')[] = [
      'multiball',
      'laser',
      'expand',
      'fireball',
      'life',
    ];

    for (let r = 0; r < rows; r++) {
      const rowInfo = colors[r % colors.length];
      const hits = (lvl >= 2 && r < 2) ? 2 : 1;
      for (let c = 0; c < cols; c++) {
        // Pattern variations per level
        if (lvl === 2 && (r + c) % 2 === 0 && r > 3) continue;
        if (lvl >= 3 && (c === 0 || c === cols - 1) && r > 4) continue;

        let powerup: 'multiball' | 'laser' | 'expand' | 'fireball' | 'life' | undefined = undefined;
        if (Math.random() < 0.22) {
          powerup = powerTypes[Math.floor(Math.random() * powerTypes.length)];
        }

        bricks.push({
          x: startX + c * (brickW + padX),
          y: startY + r * (brickH + padY),
          w: brickW,
          h: brickH,
          color: rowInfo.color,
          glow: rowInfo.glow,
          hits: hits,
          maxHits: hits,
          points: rowInfo.points * lvl,
          powerup,
          alive: true,
        });
      }
    }
    return bricks;
  }, []);

  const addParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      engineRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 25 + 15,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color = '#fde047') => {
    engineRef.current.floatingTexts.push({
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.5,
    });
  };

  const launchBall = useCallback(() => {
    const p = engineRef.current.paddle;
    const speed = 6.5 + engineRef.current.level * 0.3;
    const angle = -Math.PI / 3 - Math.random() * (Math.PI / 3);
    engineRef.current.balls = [
      {
        x: p.x + p.w / 2,
        y: p.y - 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 7,
        isFireball: false,
        trail: [],
      },
    ];
  }, []);

  const resetGame = useCallback((nextLvl = false) => {
    const newLvl = nextLvl ? engineRef.current.level + 1 : 1;
    const initialLives = nextLvl ? engineRef.current.lives : 3;

    engineRef.current.level = newLvl;
    engineRef.current.lives = initialLives;
    if (!nextLvl) {
      engineRef.current.score = 0;
      setScore(0);
      setIsNewHigh(false);
    }
    setLevel(newLvl);
    setLives(initialLives);
    setCombo(1);
    setActivePowerup(null);

    engineRef.current.paddle = {
      x: 345,
      y: 550,
      w: 110,
      h: 14,
      targetW: 110,
      speed: 10,
      isLaser: false,
      laserCooldown: 0,
    };
    engineRef.current.bricks = createBricks(newLvl);
    engineRef.current.powerups = [];
    engineRef.current.lasers = [];
    engineRef.current.particles = [];
    engineRef.current.floatingTexts = [];
    engineRef.current.activePowerupType = null;
    engineRef.current.powerupTime = 0;

    launchBall();
    setGameState('playing');
  }, [createBricks, launchBall]);

  const handleGameOver = useCallback(() => {
    setGameState('gameover');
    sound.playExplosion();
    const finalScore = engineRef.current.score;
    if (finalScore > engineRef.current.highScore) {
      engineRef.current.highScore = finalScore;
      setHighScore(finalScore);
      localStorage.setItem('novaplay_brick_breaker_highscore', String(finalScore));
      setIsNewHigh(true);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [onGameOver]);

  const triggerPowerup = (type: 'multiball' | 'laser' | 'expand' | 'fireball' | 'life') => {
    sound.playPowerup();
    addFloatingText(engineRef.current.paddle.x + engineRef.current.paddle.w / 2, 530, `+ ${type.toUpperCase()}!`, '#38bdf8');

    if (type === 'life') {
      engineRef.current.lives = Math.min(engineRef.current.lives + 1, 5);
      setLives(engineRef.current.lives);
      return;
    }

    if (type === 'multiball') {
      const currentBalls = [...engineRef.current.balls];
      currentBalls.forEach((b) => {
        engineRef.current.balls.push({
          x: b.x,
          y: b.y,
          vx: -b.vx + (Math.random() - 0.5) * 2,
          vy: b.vy,
          radius: 7,
          isFireball: b.isFireball,
          trail: [],
        });
        engineRef.current.balls.push({
          x: b.x,
          y: b.y,
          vx: b.vx * 0.8 + (Math.random() - 0.5) * 2,
          vy: -Math.abs(b.vy) * 0.9,
          radius: 7,
          isFireball: b.isFireball,
          trail: [],
        });
      });
      return;
    }

    engineRef.current.activePowerupType = type;
    engineRef.current.powerupTime = 400; // ~7 seconds
    setActivePowerup(type);

    if (type === 'expand') {
      engineRef.current.paddle.targetW = 160;
    } else if (type === 'fireball') {
      engineRef.current.balls.forEach((b) => (b.isFireball = true));
    } else if (type === 'laser') {
      engineRef.current.paddle.isLaser = true;
    }
  };

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const eng = engineRef.current;

      // Update Screen Shake
      if (eng.screenShake > 0) {
        eng.screenShake -= 0.5;
      }

      ctx.save();
      if (eng.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * eng.screenShake, (Math.random() - 0.5) * eng.screenShake);
      }

      // Background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 800, 600);

      // Cyber Grid Background
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 800; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 600);
        ctx.stroke();
      }
      for (let y = 0; y <= 600; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(800, y);
        ctx.stroke();
      }

      if (gameState === 'playing') {
        // Handle Paddle Movement
        const p = eng.paddle;
        if (eng.touchActive || eng.mouseX !== undefined) {
          const targetX = eng.mouseX - p.w / 2;
          p.x += (targetX - p.x) * 0.25;
        } else {
          if (eng.keys.left) p.x -= p.speed;
          if (eng.keys.right) p.x += p.speed;
        }

        // Clamp paddle
        if (p.x < 10) p.x = 10;
        if (p.x + p.w > 790) p.x = 790 - p.w;

        // Smooth width expand
        p.w += (p.targetW - p.w) * 0.1;

        // Laser Powerup cooldown & shooting
        if (p.isLaser) {
          p.laserCooldown--;
          if (p.laserCooldown <= 0) {
            eng.lasers.push({ x: p.x + 12, y: p.y - 4, vy: -12, alive: true });
            eng.lasers.push({ x: p.x + p.w - 12, y: p.y - 4, vy: -12, alive: true });
            p.laserCooldown = 18;
            sound.playLaser();
          }
        }

        // Handle Active Powerup Timer
        if (eng.activePowerupType) {
          eng.powerupTime--;
          setPowerupTimer(Math.ceil(eng.powerupTime / 60));
          if (eng.powerupTime <= 0) {
            // Revert powerup
            p.targetW = 110;
            p.isLaser = false;
            eng.balls.forEach((b) => (b.isFireball = false));
            eng.activePowerupType = null;
            setActivePowerup(null);
          }
        }

        // Combo decay
        if (eng.comboTimer > 0) {
          eng.comboTimer--;
          if (eng.comboTimer <= 0) {
            eng.combo = 1;
            setCombo(1);
          }
        }

        // Move Lasers
        for (let i = eng.lasers.length - 1; i >= 0; i--) {
          const l = eng.lasers[i];
          l.y += l.vy;
          if (l.y < 0) {
            eng.lasers.splice(i, 1);
            continue;
          }

          // Check brick hits with lasers
          for (let b = 0; b < eng.bricks.length; b++) {
            const brick = eng.bricks[b];
            if (!brick.alive) continue;
            if (l.x >= brick.x && l.x <= brick.x + brick.w && l.y >= brick.y && l.y <= brick.y + brick.h) {
              l.alive = false;
              brick.hits--;
              addParticles(l.x, l.y, '#38bdf8', 6);
              sound.playHit();
              if (brick.hits <= 0) {
                brick.alive = false;
                eng.score += brick.points * eng.combo;
                setScore(eng.score);
                addParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 16);
                if (brick.powerup) {
                  eng.powerups.push({
                    x: brick.x + brick.w / 2,
                    y: brick.y + brick.h / 2,
                    vy: 2.5,
                    type: brick.powerup,
                    color: brick.glow,
                    letter: brick.powerup[0].toUpperCase(),
                    collected: false,
                  });
                }
              }
              break;
            }
          }
          if (!l.alive) {
            eng.lasers.splice(i, 1);
          }
        }

        // Move Powerup Drops
        for (let i = eng.powerups.length - 1; i >= 0; i--) {
          const drop = eng.powerups[i];
          drop.y += drop.vy;

          // Catch powerup with paddle
          if (
            drop.y >= p.y &&
            drop.y <= p.y + p.h + 10 &&
            drop.x >= p.x &&
            drop.x <= p.x + p.w
          ) {
            triggerPowerup(drop.type);
            eng.powerups.splice(i, 1);
            continue;
          }

          if (drop.y > 620) {
            eng.powerups.splice(i, 1);
          }
        }

        // Update Balls
        for (let i = eng.balls.length - 1; i >= 0; i--) {
          const b = eng.balls[i];

          // Trail
          b.trail.push({ x: b.x, y: b.y, alpha: 0.8 });
          if (b.trail.length > 8) b.trail.shift();

          b.x += b.vx;
          b.y += b.vy;

          // Wall bounces
          if (b.x - b.radius < 10) {
            b.x = 10 + b.radius;
            b.vx = Math.abs(b.vx);
            sound.playHit();
          } else if (b.x + b.radius > 790) {
            b.x = 790 - b.radius;
            b.vx = -Math.abs(b.vx);
            sound.playHit();
          }
          if (b.y - b.radius < 10) {
            b.y = 10 + b.radius;
            b.vy = Math.abs(b.vy);
            sound.playHit();
          }

          // Paddle bounce
          if (
            b.y + b.radius >= p.y &&
            b.y - b.radius <= p.y + p.h &&
            b.x >= p.x - 5 &&
            b.x <= p.x + p.w + 5 &&
            b.vy > 0
          ) {
            b.y = p.y - b.radius;
            // Angle based on hit point on paddle
            const hitOffset = (b.x - (p.x + p.w / 2)) / (p.w / 2);
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            const maxAngle = Math.PI * 0.42; // 75 deg max
            const targetAngle = hitOffset * maxAngle - Math.PI / 2;

            b.vx = Math.cos(targetAngle) * speed;
            b.vy = Math.sin(targetAngle) * speed;

            sound.playJump();
            addParticles(b.x, b.y, '#38bdf8', 8);
          }

          // Brick Collisions
          for (let k = 0; k < eng.bricks.length; k++) {
            const brick = eng.bricks[k];
            if (!brick.alive) continue;

            if (
              b.x + b.radius >= brick.x &&
              b.x - b.radius <= brick.x + brick.w &&
              b.y + b.radius >= brick.y &&
              b.y - b.radius <= brick.y + brick.h
            ) {
              if (!b.isFireball) {
                // Determine collision side
                const prevX = b.x - b.vx;
                const prevY = b.y - b.vy;

                if (prevX < brick.x || prevX > brick.x + brick.w) {
                  b.vx = -b.vx;
                } else {
                  b.vy = -b.vy;
                }
              }

              brick.hits--;
              sound.playHit();
              eng.screenShake = 3;

              if (brick.hits <= 0 || b.isFireball) {
                brick.alive = false;
                eng.combo++;
                eng.comboTimer = 140;
                setCombo(eng.combo);

                const pts = brick.points * eng.combo;
                eng.score += pts;
                setScore(eng.score);
                addFloatingText(brick.x + brick.w / 2, brick.y, `+${pts}`, brick.glow);
                addParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 18);

                // Drop powerup?
                if (brick.powerup) {
                  eng.powerups.push({
                    x: brick.x + brick.w / 2,
                    y: brick.y + brick.h / 2,
                    vy: 2.5,
                    type: brick.powerup,
                    color: brick.glow,
                    letter: brick.powerup[0].toUpperCase(),
                    collected: false,
                  });
                }
              }
              break;
            }
          }

          // Ball fallen down
          if (b.y > 610) {
            eng.balls.splice(i, 1);
          }
        }

        // Check if all balls lost
        if (eng.balls.length === 0) {
          eng.lives--;
          setLives(eng.lives);
          sound.playExplosion();
          eng.screenShake = 8;
          if (eng.lives <= 0) {
            handleGameOver();
          } else {
            launchBall();
          }
        }

        // Check Level Clear (All bricks shattered)
        const remainingBricks = eng.bricks.filter((b) => b.alive).length;
        if (remainingBricks === 0 && eng.bricks.length > 0) {
          setGameState('levelclear');
          sound.playPowerup();
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
        }
      }

      // DRAW BRICKS
      eng.bricks.forEach((b) => {
        if (!b.alive) return;
        ctx.shadowColor = b.glow;
        ctx.shadowBlur = b.hits > 1 ? 14 : 8;

        // Brick body
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 4);
        ctx.fill();

        // Inner highlight border
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Powerup marker
        if (b.powerup) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.shadowBlur = 0;

      // DRAW LASERS
      eng.lasers.forEach((l) => {
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(l.x - 2, l.y - 8, 4, 14);
      });
      ctx.shadowBlur = 0;

      // DRAW POWERUP DROPS
      eng.powerups.forEach((d) => {
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.letter, d.x, d.y + 1);
      });
      ctx.shadowBlur = 0;

      // DRAW BALL TRAILS & BALLS
      eng.balls.forEach((b) => {
        // Trail
        b.trail.forEach((t, idx) => {
          ctx.fillStyle = b.isFireball
            ? `rgba(249, 115, 22, ${t.alpha * (idx / b.trail.length)})`
            : `rgba(6, 182, 212, ${t.alpha * (idx / b.trail.length)})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, b.radius * (idx / b.trail.length), 0, Math.PI * 2);
          ctx.fill();
        });

        // Main Ball
        ctx.shadowColor = b.isFireball ? '#f97316' : '#22d3ee';
        ctx.shadowBlur = b.isFireball ? 20 : 12;
        ctx.fillStyle = b.isFireball ? '#fdba74' : '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // DRAW PADDLE
      const p = eng.paddle;
      ctx.shadowColor = p.isLaser ? '#ef4444' : '#06b6d4';
      ctx.shadowBlur = 16;
      ctx.fillStyle = p.isLaser ? '#ef4444' : '#0ea5e9';
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 6);
      ctx.fill();

      // Top paddle glow strip
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.x + 6, p.y + 2, p.w - 12, 3);

      if (p.isLaser) {
        // Laser cannons on sides
        ctx.fillStyle = '#f87171';
        ctx.fillRect(p.x + 4, p.y - 6, 6, 8);
        ctx.fillRect(p.x + p.w - 10, p.y - 6, 6, 8);
      }
      ctx.shadowBlur = 0;

      // PARTICLES
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

        if (pt.life >= pt.maxLife) {
          eng.particles.splice(i, 1);
        }
      }

      // FLOATING TEXTS
      for (let i = eng.floatingTexts.length - 1; i >= 0; i--) {
        const ft = eng.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.02;

        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;

        if (ft.alpha <= 0) {
          eng.floatingTexts.splice(i, 1);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver, launchBall]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        engineRef.current.keys.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        engineRef.current.keys.right = true;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if (gameState === 'idle') {
          resetGame();
        } else if (gameState === 'levelclear') {
          resetGame(true);
        } else if (gameState === 'gameover') {
          resetGame(false);
        }
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        engineRef.current.keys.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        engineRef.current.keys.right = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, resetGame]);

  // Pointer controls (Mouse & Touch)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    engineRef.current.mouseX = (e.clientX - rect.left) * scaleX;
    engineRef.current.touchActive = true;
  };

  const handlePointerDown = () => {
    if (gameState === 'idle') resetGame();
    else if (gameState === 'levelclear') resetGame(true);
    else if (gameState === 'gameover') resetGame(false);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center select-none">
      {/* Top Game Stats HUD */}
      <div className="w-full mb-3 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-white backdrop-blur-sm">
        {/* Lives & Level */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-semibold uppercase">Lives:</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-4 h-4 transition-colors ${
                    i < lives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>STAGE {level}</span>
          </div>
        </div>

        {/* Multiplier / Active Powerup */}
        <div className="flex items-center gap-3">
          {activePowerup && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs font-bold animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{activePowerup.toUpperCase()} ({powerupTimer}s)</span>
            </div>
          )}
          {combo > 1 && (
            <div className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black">
              {combo}x COMBO
            </div>
          )}
        </div>

        {/* Score & Audio */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Score</div>
            <div className="text-lg font-black text-cyan-400 tracking-wider tabular-nums">{score}</div>
          </div>
          <button
            onClick={() => {
              const m = sound.toggleMute();
              setMuted(m);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative w-full aspect-[4/5] sm:aspect-[4/3] max-h-[74vh] sm:max-h-[82vh] rounded-2xl overflow-hidden border-2 border-slate-800 bg-[#090d16] shadow-2xl shadow-cyan-950/30">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          className="w-full h-full cursor-none touch-none block"
        />

        {/* Start / Idle Screen */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4 animate-bounce">
              <Flame className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wide mb-2">
              BRICK BREAKER <span className="text-orange-400">NEON INFERNO</span>
            </h2>
            <p className="text-slate-300 text-sm max-w-md mb-6 leading-relaxed">
              Shatter neon blocks, trigger multi-ball frenzy, laser cannons, and explosive fireballs with silky physics.
            </p>
            <button
              onClick={() => resetGame()}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-bold text-base flex items-center gap-2 shadow-xl shadow-orange-500/25 transition-all transform hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START PLAYING</span>
            </button>
          </div>
        )}

        {/* Level Clear Screen */}
        {gameState === 'levelclear' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mb-4">
              <Trophy className="w-9 h-9 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-1">STAGE {level} CLEARED!</h2>
            <p className="text-slate-300 text-sm mb-6">Excellent aim! Prepare for faster speeds and tougher layouts.</p>
            <button
              onClick={() => resetGame(true)}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-base flex items-center gap-2 shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>NEXT STAGE {level + 1}</span>
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center mb-3">
              <Flame className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">GAME OVER</h2>
            <div className="grid grid-cols-2 gap-4 my-4 w-full max-w-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Final Score</div>
                <div className="text-2xl font-black text-cyan-400 tabular-nums">{score}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold flex items-center justify-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" /> High Score
                </div>
                <div className="text-2xl font-black text-amber-400 tabular-nums">{highScore}</div>
              </div>
            </div>
            {isNewHigh && (
              <div className="mb-4 text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-400/50 px-3 py-1 rounded-full animate-bounce">
                🎉 NEW ALL-TIME RECORD!
              </div>
            )}
            <button
              onClick={() => resetGame(false)}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-bold text-base flex items-center gap-2 shadow-xl shadow-orange-500/25 transition-all transform hover:scale-105"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}

        {/* Paused Screen */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <h2 className="text-3xl font-black text-white mb-4">GAME PAUSED</h2>
            <button
              onClick={() => setGameState('playing')}
              className="px-8 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-base flex items-center gap-2 shadow-xl shadow-cyan-500/25"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>RESUME GAME</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Paddle Controls */}
      <div className="w-full flex items-center justify-between mt-3 px-2 gap-2 select-none touch-none">
        <div className="text-slate-400 text-xs font-bold hidden sm:block">
          Drag finger on canvas or tap buttons to slide paddle & deflect balls!
        </div>

        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              engineRef.current.keys.left = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              engineRef.current.keys.left = false;
            }}
            onPointerLeave={() => {
              engineRef.current.keys.left = false;
            }}
            className="w-13 h-13 rounded-2xl bg-slate-900 border border-slate-800 text-cyan-400 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center shadow-lg active:scale-90 font-black text-xl transition-transform"
            title="Move Paddle Left"
          >
            ◀
          </button>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              if (gameState === 'idle') resetGame();
              else if (gameState === 'levelclear') resetGame(true);
              else if (gameState === 'gameover') resetGame(false);
            }}
            className="px-4 h-13 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 text-white font-black text-xs shadow-lg shadow-orange-500/30 active:scale-90 flex items-center gap-1.5 transition-transform"
            title="Launch Ball"
          >
            <span>⚡</span>
            <span>LAUNCH</span>
          </button>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              engineRef.current.keys.right = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              engineRef.current.keys.right = false;
            }}
            onPointerLeave={() => {
              engineRef.current.keys.right = false;
            }}
            className="w-13 h-13 rounded-2xl bg-slate-900 border border-slate-800 text-cyan-400 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center shadow-lg active:scale-90 font-black text-xl transition-transform"
            title="Move Paddle Right"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
};
