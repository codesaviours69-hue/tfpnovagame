import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Award, Shield, Zap, Crosshair, Sparkles, Trophy } from 'lucide-react';
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

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isPlayer: boolean;
  damage: number;
}

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  points: number;
  color: string;
  vertices: { x: number; y: number }[];
  hits: number;
}

interface EnemyShip {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  hp: number;
  maxHp: number;
  shootCooldown: number;
}

export const AstroVanguard: React.FC<Props> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [shield, setShield] = useState(100);
  const [level, setLevel] = useState(1);
  const [muted, setMuted] = useState(sound.isMuted());
  const [isNewHigh, setIsNewHigh] = useState(false);

  const engineRef = useRef({
    player: {
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: 16,
      thrust: false,
      rotatingLeft: false,
      rotatingRight: false,
      shootCooldown: 0,
      invulnerableTimer: 0,
    },
    asteroids: [] as Asteroid[],
    bullets: [] as Bullet[],
    enemies: [] as EnemyShip[],
    particles: [] as Particle[],
    score: 0,
    highScore: 0,
    lives: 3,
    shield: 100,
    level: 1,
    screenShake: 0,
    keys: { up: false, left: false, right: false, space: false },
    mouseAngle: null as number | null,
    pointerThrust: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('novaplay_astrovanguard_highscore');
    if (saved) {
      const val = parseInt(saved, 10);
      setHighScore(val);
      engineRef.current.highScore = val;
    }
  }, []);

  const createAsteroid = (x: number, y: number, radius: number): Asteroid => {
    const numVerts = 8 + Math.floor(Math.random() * 4);
    const vertices: { x: number; y: number }[] = [];
    for (let i = 0; i < numVerts; i++) {
      const angle = (i / numVerts) * Math.PI * 2;
      const dist = radius * (0.75 + Math.random() * 0.5);
      vertices.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
      });
    }

    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 1.5 + 0.5) * (30 / radius);

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      points: Math.round(50 - radius / 2),
      color: radius > 25 ? '#94a3b8' : radius > 15 ? '#cbd5e1' : '#f1f5f9',
      vertices,
      hits: radius > 25 ? 3 : radius > 15 ? 2 : 1,
    };
  };

  const spawnWave = useCallback((lvl: number) => {
    const count = 3 + lvl;
    const newAsteroids: Asteroid[] = [];
    for (let i = 0; i < count; i++) {
      // Spawn along boundaries away from center
      let x = Math.random() < 0.5 ? Math.random() * 200 : 600 + Math.random() * 200;
      let y = Math.random() < 0.5 ? Math.random() * 150 : 450 + Math.random() * 150;
      newAsteroids.push(createAsteroid(x, y, 32 + Math.random() * 8));
    }
    engineRef.current.asteroids = newAsteroids;

    // Spawn enemy raider if level >= 2
    if (lvl >= 2) {
      engineRef.current.enemies = [
        {
          x: Math.random() < 0.5 ? 40 : 760,
          y: Math.random() * 400 + 100,
          vx: Math.random() * 2 - 1,
          vy: Math.random() * 2 - 1,
          angle: 0,
          radius: 18,
          hp: 4,
          maxHp: 4,
          shootCooldown: 120,
        },
      ];
    } else {
      engineRef.current.enemies = [];
    }
  }, []);

  const addParticles = (x: number, y: number, color: string, count = 10, speedMul = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4 + 1) * speedMul;
      engineRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3.5 + 1.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 20 + 15,
      });
    }
  };

  const startNewGame = useCallback(() => {
    engineRef.current.score = 0;
    engineRef.current.lives = 3;
    engineRef.current.shield = 100;
    engineRef.current.level = 1;
    engineRef.current.player = {
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: 16,
      thrust: false,
      rotatingLeft: false,
      rotatingRight: false,
      shootCooldown: 0,
      invulnerableTimer: 60,
    };
    engineRef.current.bullets = [];
    engineRef.current.particles = [];
    setScore(0);
    setLives(3);
    setShield(100);
    setLevel(1);
    setIsNewHigh(false);
    spawnWave(1);
    setGameState('playing');
    sound.playPowerup();
  }, [spawnWave]);

  const handleGameOver = useCallback(() => {
    setGameState('gameover');
    sound.playExplosion();
    const finalScore = engineRef.current.score;
    if (finalScore > engineRef.current.highScore) {
      engineRef.current.highScore = finalScore;
      setHighScore(finalScore);
      localStorage.setItem('novaplay_astrovanguard_highscore', String(finalScore));
      setIsNewHigh(true);
      confetti({ particleCount: 90, spread: 80 });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [onGameOver]);

  const fireBullet = () => {
    const p = engineRef.current.player;
    if (p.shootCooldown > 0) return;
    p.shootCooldown = 12;

    const speed = 11;
    const noseX = p.x + Math.cos(p.angle) * p.radius;
    const noseY = p.y + Math.sin(p.angle) * p.radius;

    engineRef.current.bullets.push({
      x: noseX,
      y: noseY,
      vx: Math.cos(p.angle) * speed + p.vx * 0.4,
      vy: Math.sin(p.angle) * speed + p.vy * 0.4,
      color: '#38bdf8',
      isPlayer: true,
      damage: 1,
    });
    sound.playLaser();
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

      if (eng.screenShake > 0) eng.screenShake -= 0.5;

      ctx.save();
      if (eng.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * eng.screenShake, (Math.random() - 0.5) * eng.screenShake);
      }

      // Space Background
      ctx.fillStyle = '#05070e';
      ctx.fillRect(0, 0, 800, 600);

      // Starfield background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let s = 0; s < 50; s++) {
        const sx = ((s * 137.5) % 800);
        const sy = ((s * 293.7) % 600);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      if (gameState === 'playing') {
        const p = eng.player;

        // Rotation
        if (eng.keys.left) p.angle -= 0.07;
        if (eng.keys.right) p.angle += 0.07;
        if (eng.mouseAngle !== null) {
          p.angle = eng.mouseAngle;
        }

        // Thrust
        const isThrusting = eng.keys.up || eng.pointerThrust;
        if (isThrusting) {
          p.vx += Math.cos(p.angle) * 0.22;
          p.vy += Math.sin(p.angle) * 0.22;

          // Exhaust thruster particle
          const rearX = p.x - Math.cos(p.angle) * p.radius;
          const rearY = p.y - Math.sin(p.angle) * p.radius;
          addParticles(rearX, rearY, '#06b6d4', 2, 0.5);
        }

        // Inertia friction & speed limit
        p.vx *= 0.985;
        p.vy *= 0.985;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 8) {
          p.vx = (p.vx / speed) * 8;
          p.vy = (p.vy / speed) * 8;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Screen wrap for player
        if (p.x < 0) p.x = 800;
        if (p.x > 800) p.x = 0;
        if (p.y < 0) p.y = 600;
        if (p.y > 600) p.y = 0;

        if (p.shootCooldown > 0) p.shootCooldown--;
        if (p.invulnerableTimer > 0) p.invulnerableTimer--;

        if (eng.keys.space) fireBullet();

        // Update Bullets
        for (let i = eng.bullets.length - 1; i >= 0; i--) {
          const b = eng.bullets[i];
          b.x += b.vx;
          b.y += b.vy;

          if (b.x < 0 || b.x > 800 || b.y < 0 || b.y > 600) {
            eng.bullets.splice(i, 1);
            continue;
          }

          // Player bullets hitting Asteroids
          if (b.isPlayer) {
            for (let a = eng.asteroids.length - 1; a >= 0; a--) {
              const ast = eng.asteroids[a];
              const dist = Math.hypot(b.x - ast.x, b.y - ast.y);
              if (dist < ast.radius) {
                eng.bullets.splice(i, 1);
                ast.hits--;
                sound.playHit();
                addParticles(b.x, b.y, '#38bdf8', 6);

                if (ast.hits <= 0) {
                  eng.score += ast.points;
                  setScore(eng.score);
                  addParticles(ast.x, ast.y, ast.color, 16);
                  sound.playExplosion();

                  // Split asteroid if big enough
                  if (ast.radius > 20) {
                    eng.asteroids.push(createAsteroid(ast.x + 5, ast.y, ast.radius * 0.6));
                    eng.asteroids.push(createAsteroid(ast.x - 5, ast.y, ast.radius * 0.6));
                  }
                  eng.asteroids.splice(a, 1);
                }
                break;
              }
            }

            // Player bullet hitting Enemy Ships
            for (let e = eng.enemies.length - 1; e >= 0; e--) {
              const en = eng.enemies[e];
              const dist = Math.hypot(b.x - en.x, b.y - en.y);
              if (dist < en.radius) {
                eng.bullets.splice(i, 1);
                en.hp -= b.damage;
                sound.playHit();
                addParticles(b.x, b.y, '#f43f5e', 8);

                if (en.hp <= 0) {
                  eng.score += 250;
                  setScore(eng.score);
                  addParticles(en.x, en.y, '#f43f5e', 24, 2);
                  sound.playExplosion();
                  eng.enemies.splice(e, 1);
                }
                break;
              }
            }
          } else {
            // Enemy bullet hitting Player
            const dist = Math.hypot(b.x - p.x, b.y - p.y);
            if (dist < p.radius && p.invulnerableTimer <= 0) {
              eng.bullets.splice(i, 1);
              eng.shield -= 25;
              eng.screenShake = 6;
              sound.playHit();
              addParticles(p.x, p.y, '#f43f5e', 12);
              if (eng.shield <= 0) {
                eng.lives--;
                setLives(eng.lives);
                eng.shield = 100;
                p.invulnerableTimer = 90;
                if (eng.lives <= 0) handleGameOver();
              }
              setShield(eng.shield);
            }
          }
        }

        // Update Asteroids
        for (let i = 0; i < eng.asteroids.length; i++) {
          const ast = eng.asteroids[i];
          ast.x += ast.vx;
          ast.y += ast.vy;

          if (ast.x < -ast.radius) ast.x = 800 + ast.radius;
          if (ast.x > 800 + ast.radius) ast.x = -ast.radius;
          if (ast.y < -ast.radius) ast.y = 600 + ast.radius;
          if (ast.y > 600 + ast.radius) ast.y = -ast.radius;

          // Collision with player
          const dist = Math.hypot(ast.x - p.x, ast.y - p.y);
          if (dist < ast.radius + p.radius && p.invulnerableTimer <= 0) {
            eng.shield -= 35;
            p.invulnerableTimer = 60;
            eng.screenShake = 8;
            sound.playExplosion();
            addParticles(p.x, p.y, '#f97316', 15);

            if (eng.shield <= 0) {
              eng.lives--;
              setLives(eng.lives);
              eng.shield = 100;
              p.invulnerableTimer = 90;
              if (eng.lives <= 0) handleGameOver();
            }
            setShield(eng.shield);
          }
        }

        // Update Enemies
        for (let i = 0; i < eng.enemies.length; i++) {
          const en = eng.enemies[i];
          en.x += en.vx;
          en.y += en.vy;

          if (en.x < 50 || en.x > 750) en.vx *= -1;
          if (en.y < 50 || en.y > 550) en.vy *= -1;

          en.shootCooldown--;
          if (en.shootCooldown <= 0) {
            en.shootCooldown = 90;
            const angleToPlayer = Math.atan2(p.y - en.y, p.x - en.x);
            eng.bullets.push({
              x: en.x,
              y: en.y,
              vx: Math.cos(angleToPlayer) * 5,
              vy: Math.sin(angleToPlayer) * 5,
              color: '#f43f5e',
              isPlayer: false,
              damage: 1,
            });
            sound.playLaser();
          }
        }

        // Next Wave Check
        if (eng.asteroids.length === 0 && eng.enemies.length === 0) {
          eng.level++;
          setLevel(eng.level);
          eng.shield = Math.min(eng.shield + 30, 100);
          setShield(eng.shield);
          spawnWave(eng.level);
          sound.playPowerup();
          confetti({ particleCount: 70, spread: 60 });
        }
      }

      // DRAW ASTEROIDS
      eng.asteroids.forEach((ast) => {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.strokeStyle = ast.color;
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.beginPath();
        ast.vertices.forEach((v, idx) => {
          if (idx === 0) ctx.moveTo(v.x, v.y);
          else ctx.lineTo(v.x, v.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // DRAW ENEMY SHIPS
      eng.enemies.forEach((en) => {
        ctx.save();
        ctx.translate(en.x, en.y);
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.moveTo(en.radius, 0);
        ctx.lineTo(-en.radius, -en.radius * 0.7);
        ctx.lineTo(-en.radius * 0.4, 0);
        ctx.lineTo(-en.radius, en.radius * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // DRAW BULLETS
      eng.bullets.forEach((b) => {
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.isPlayer ? 3 : 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // DRAW PLAYER SHIP
      const p = eng.player;
      if (p.invulnerableTimer % 6 < 3) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Shield aura
        if (eng.shield > 20) {
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Ship hull
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(p.radius + 4, 0); // Nose
        ctx.lineTo(-p.radius, -p.radius * 0.75); // Left wing
        ctx.lineTo(-p.radius * 0.4, 0); // Engine indent
        ctx.lineTo(-p.radius, p.radius * 0.75); // Right wing
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cockpit
        ctx.fillStyle = '#67e8f9';
        ctx.beginPath();
        ctx.arc(p.radius * 0.2, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.shadowBlur = 0;
      }

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

        if (pt.life >= pt.maxLife) eng.particles.splice(i, 1);
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver, spawnWave]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') engineRef.current.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') engineRef.current.keys.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') engineRef.current.keys.up = true;
      if (e.key === ' ') {
        if (gameState === 'playing') fireBullet();
        else if (gameState === 'idle' || gameState === 'gameover') startNewGame();
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') engineRef.current.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') engineRef.current.keys.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') engineRef.current.keys.up = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, startNewGame]);

  // Pointer controls (Mouse / Touch)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const p = engineRef.current.player;
    engineRef.current.mouseAngle = Math.atan2(my - p.y, mx - p.x);
  };

  const handlePointerDown = () => {
    if (gameState === 'playing') {
      engineRef.current.pointerThrust = true;
      fireBullet();
    } else if (gameState === 'idle' || gameState === 'gameover') {
      startNewGame();
    }
  };

  const handlePointerUp = () => {
    engineRef.current.pointerThrust = false;
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center select-none">
      {/* Top HUD */}
      <div className="w-full mb-3 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-white backdrop-blur-sm">
        {/* Shield & Lives */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <div className="w-20 sm:w-28 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-200"
                style={{ width: `${shield}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-slate-400 font-bold uppercase">
            SECTOR <span className="text-white font-black">{level}</span>
          </div>
        </div>

        {/* Score & Best */}
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
      <div className="relative w-full aspect-[4/5] sm:aspect-[4/3] max-h-[74vh] sm:max-h-[82vh] rounded-2xl overflow-hidden border-2 border-slate-800 bg-[#05070e] shadow-2xl shadow-cyan-950/30">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          className="w-full h-full touch-none block cursor-crosshair"
        />

        {/* Start / Idle Screen */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-4 animate-pulse">
              <Crosshair className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wide mb-2">
              ASTRO <span className="text-cyan-400">VANGUARD</span>
            </h2>
            <p className="text-slate-300 text-sm max-w-md mb-6 leading-relaxed">
              Pilot an agile starfighter in deep void space. Blast asteroids, dodge alien raiders, and maintain deflector shields.
            </p>
            <button
              onClick={startNewGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base flex items-center gap-2 shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-105"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>LAUNCH MISSION</span>
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <h2 className="text-3xl font-black text-white mb-2">VESSEL DESTROYED</h2>
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
              onClick={startNewGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base flex items-center gap-2 shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-105"
            >
              <RotateCcw className="w-5 h-5" />
              <span>RETRY MISSION</span>
            </button>
          </div>
        )}

        {/* Paused Screen */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <h2 className="text-3xl font-black text-white mb-4">MISSION PAUSED</h2>
            <button
              onClick={() => setGameState('playing')}
              className="px-8 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-base flex items-center gap-2 shadow-xl shadow-cyan-500/25"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>RESUME FLIGHT</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile On-Screen Controls */}
      <div className="w-full flex items-center justify-between mt-3 px-2 gap-2 select-none touch-none">
        {/* Steering D-Pad */}
        <div className="flex items-center gap-2">
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
            className="w-13 h-13 rounded-2xl bg-slate-900 border border-slate-800 text-cyan-400 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            title="Rotate Left"
          >
            <span className="text-xl font-black">◀</span>
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
            className="w-13 h-13 rounded-2xl bg-slate-900 border border-slate-800 text-cyan-400 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            title="Rotate Right"
          >
            <span className="text-xl font-black">▶</span>
          </button>
        </div>

        {/* Thrust & Fire Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              engineRef.current.keys.up = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              engineRef.current.keys.up = false;
            }}
            onPointerLeave={() => {
              engineRef.current.keys.up = false;
            }}
            className="px-4 h-13 rounded-2xl bg-blue-950/80 border border-blue-500/50 text-sky-300 active:bg-blue-600 active:text-white flex items-center gap-1.5 shadow-lg active:scale-95 font-black text-xs transition-transform"
            title="Thrust"
          >
            <span className="text-base">🚀</span>
            <span>THRUST</span>
          </button>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              if (gameState === 'playing') fireBullet();
              else if (gameState === 'idle' || gameState === 'gameover') startNewGame();
            }}
            className="px-5 h-13 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xl shadow-cyan-500/30 active:scale-95 transition-transform"
            title="Fire Laser"
          >
            <span className="text-base">💥</span>
            <span>FIRE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
