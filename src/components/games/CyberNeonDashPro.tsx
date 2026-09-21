import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Award,
  Sparkles,
  Flame,
  Crown,
  Play,
  Zap,
  Activity,
  ChevronRight
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

interface Obstacle {
  x: number;
  y: number;
  type: 'spike' | 'block' | 'pad' | 'orb' | 'portal';
  w: number;
  h: number;
}

const LEVELS = [
  { id: 'lvl-1', title: 'Stereo Pulse', difficulty: 'Normal', bpm: 130, color: '#00f0ff', totalDist: 6500 },
  { id: 'lvl-2', title: 'Back On Cyber Track', difficulty: 'Hard', bpm: 142, color: '#f43f5e', totalDist: 8000 },
  { id: 'lvl-3', title: 'Quantum Polargeist', difficulty: 'Insane', bpm: 155, color: '#a855f7', totalDist: 9500 },
];

export const CyberNeonDashPro: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Match State
  const [stage, setStage] = useState<'menu' | 'playing' | 'won'>('menu');
  const [selectedLevel, setSelectedLevel] = useState(LEVELS[0]);
  const [attempts, setAttempts] = useState<number>(1);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [bestPercent, setBestPercent] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_dash_best') || '0', 10);
  });
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // 60 FPS Physics Engine Ref
  const engineRef = useRef<{
    playerX: number; // constant screen X (120)
    playerY: number; // 0 (floor) to 480 (ceiling)
    playerVy: number;
    playerRot: number;
    isGrounded: boolean;
    gravityDir: 1 | -1; // 1 = down, -1 = ceiling

    worldX: number; // distance traveled
    speed: number;
    isHoldingJump: boolean;

    obstacles: Obstacle[];
    particles: { x: number; y: number; vx: number; vy: number; color: string; alpha: number; size: number }[];
  }>({
    playerX: 120,
    playerY: 480, // floor Y in canvas
    playerVy: 0,
    playerRot: 0,
    isGrounded: true,
    gravityDir: 1,

    worldX: 0,
    speed: 8.5,
    isHoldingJump: false,

    obstacles: [],
    particles: [],
  });

  // Generate Obstacle Course for selected level
  const generateLevelObstacles = (totalDist: number): Obstacle[] => {
    const obs: Obstacle[] = [];
    const floorY = 480;

    let curX = 600;
    while (curX < totalDist - 400) {
      const pattern = Math.random();

      if (pattern < 0.28) {
        // Single Spike
        obs.push({ x: curX, y: floorY, type: 'spike', w: 32, h: 36 });
        curX += 340;
      } else if (pattern < 0.52) {
        // Double Spike
        obs.push({ x: curX, y: floorY, type: 'spike', w: 32, h: 36 });
        obs.push({ x: curX + 34, y: floorY, type: 'spike', w: 32, h: 36 });
        curX += 420;
      } else if (pattern < 0.74) {
        // Step Block with Spikes on top
        obs.push({ x: curX, y: floorY - 36, type: 'block', w: 120, h: 36 });
        obs.push({ x: curX + 160, y: floorY, type: 'spike', w: 32, h: 36 });
        curX += 480;
      } else if (pattern < 0.88) {
        // Jump Orb in Air + Pit of 3 Spikes below
        obs.push({ x: curX, y: floorY, type: 'spike', w: 32, h: 36 });
        obs.push({ x: curX + 34, y: floorY, type: 'spike', w: 32, h: 36 });
        obs.push({ x: curX + 68, y: floorY, type: 'spike', w: 32, h: 36 });
        obs.push({ x: curX + 34, y: floorY - 130, type: 'orb', w: 36, h: 36 });
        curX += 440;
      } else {
        // Jump Pad on Floor
        obs.push({ x: curX, y: floorY, type: 'pad', w: 40, h: 14 });
        obs.push({ x: curX + 140, y: floorY, type: 'spike', w: 32, h: 36 });
        obs.push({ x: curX + 174, y: floorY, type: 'spike', w: 32, h: 36 });
        curX += 500;
      }
    }
    return obs;
  };

  // Jump Action
  const triggerJump = useCallback(() => {
    const eng = engineRef.current;
    if (stage !== 'playing') return;

    if (eng.isGrounded) {
      eng.playerVy = -13.5 * eng.gravityDir;
      eng.isGrounded = false;
      sound.playHit();
    } else {
      // Check Mid-Air Jump Orb collision
      const screenX = eng.playerX;
      const screenY = eng.playerY;

      const hitOrb = eng.obstacles.find((o) => {
        if (o.type !== 'orb') return false;
        const obsScreenX = o.x - eng.worldX + eng.playerX;
        return (
          Math.abs(obsScreenX - screenX) < 40 &&
          Math.abs(o.y - screenY) < 40
        );
      });

      if (hitOrb) {
        eng.playerVy = -14.5 * eng.gravityDir;
        sound.playCollect();
        // Orb Shockwave Sparks
        for (let i = 0; i < 12; i++) {
          eng.particles.push({
            x: screenX,
            y: screenY,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            color: '#fde047',
            alpha: 1.0,
            size: 4 + Math.random() * 4,
          });
        }
      }
    }
  }, [stage]);

  // Restart / Reset on Crash (Instant 0.15s Geometry Dash Style)
  const crashAndReset = useCallback(() => {
    const eng = engineRef.current;
    sound.playExplosion();

    // Death Explosion Particles
    for (let i = 0; i < 24; i++) {
      eng.particles.push({
        x: eng.playerX,
        y: eng.playerY,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        color: selectedLevel.color,
        alpha: 1.0,
        size: 5 + Math.random() * 5,
      });
    }

    setAttempts((prev) => prev + 1);

    // Instant Reset
    setTimeout(() => {
      eng.playerY = 480;
      eng.playerVy = 0;
      eng.playerRot = 0;
      eng.isGrounded = true;
      eng.gravityDir = 1;
      eng.worldX = 0;
      eng.speed = (selectedLevel.bpm / 130) * 8.5;
    }, 180);
  }, [selectedLevel]);

  // Start Level
  const startLevel = (lvl = selectedLevel) => {
    sound.playClick();
    setSelectedLevel(lvl);
    const eng = engineRef.current;
    eng.playerY = 480;
    eng.playerVy = 0;
    eng.playerRot = 0;
    eng.isGrounded = true;
    eng.gravityDir = 1;
    eng.worldX = 0;
    eng.speed = (lvl.bpm / 130) * 8.5;
    eng.obstacles = generateLevelObstacles(lvl.totalDist);
    eng.particles = [];

    setAttempts(1);
    setProgressPercent(0);
    setStage('playing');
    sound.playLaser();
  };

  // Keyboard Jump Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        engineRef.current.isHoldingJump = true;
        triggerJump();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        engineRef.current.isHoldingJump = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerJump]);

  // 60 FPS Physics & Geometry Dash Renderer
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const eng = engineRef.current;
      const W = 540;
      const H = 780;
      const floorY = 480;
      const cubeSize = 36;

      // ==========================================
      // 1. BACKGROUND & NEON HORIZON
      // ==========================================
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#090518');
      bgGrad.addColorStop(0.5, '#0e0926');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Distant Grid Lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.lineWidth = 1.5;
      const gridShift = -(eng.worldX * 0.3) % 40;
      for (let x = gridShift; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, floorY);
        ctx.stroke();
      }

      // ==========================================
      // 2. PHYSICS UPDATE
      // ==========================================
      if (stage === 'playing') {
        eng.worldX += eng.speed;

        // Gravity Physics
        const gravity = 0.85 * eng.gravityDir;
        eng.playerVy += gravity;
        eng.playerY += eng.playerVy;

        // Auto-Jump when holding space/touch on ground
        if (eng.isGrounded && eng.isHoldingJump) {
          eng.playerVy = -13.5 * eng.gravityDir;
          eng.isGrounded = false;
          sound.playHit();
        }

        // Floor Collision
        if (eng.playerY >= floorY) {
          eng.playerY = floorY;
          eng.playerVy = 0;
          eng.isGrounded = true;
          // Snap rotation to nearest 90 deg when on floor
          eng.playerRot = Math.round(eng.playerRot / (Math.PI / 2)) * (Math.PI / 2);
        } else {
          eng.isGrounded = false;
          eng.playerRot += 0.12 * eng.gravityDir;
        }

        // Progress Calculation
        const pct = Math.min(100, Math.round((eng.worldX / selectedLevel.totalDist) * 100));
        setProgressPercent(pct);
        if (pct > bestPercent) {
          setBestPercent(pct);
          localStorage.setItem('cyber_dash_best', pct.toString());
        }

        // Level Complete 100%!
        if (pct >= 100) {
          setStage('won');
          sound.playFinishFanfare();
          confetti({ particleCount: 220, spread: 100, origin: { y: 0.5 } });
        }

        // ==========================================
        // 3. OBSTACLE COLLISION DETECTION
        // ==========================================
        const pLeft = eng.playerX - cubeSize / 2 + 5;
        const pRight = eng.playerX + cubeSize / 2 - 5;
        const pTop = eng.playerY - cubeSize + 5;
        const pBottom = eng.playerY - 2;

        eng.obstacles.forEach((obs) => {
          const obsScreenX = obs.x - eng.worldX + eng.playerX;
          if (obsScreenX < -100 || obsScreenX > W + 100) return;

          if (obs.type === 'spike') {
            // Triangle spike collision
            const sLeft = obsScreenX - obs.w / 2 + 6;
            const sRight = obsScreenX + obs.w / 2 - 6;
            const sTop = obs.y - obs.h + 8;
            const sBottom = obs.y;

            if (pRight > sLeft && pLeft < sRight && pBottom > sTop && pTop < sBottom) {
              crashAndReset();
            }
          } else if (obs.type === 'block') {
            const bLeft = obsScreenX;
            const bRight = obsScreenX + obs.w;
            const bTop = obs.y;
            const bBottom = obs.y + obs.h;

            if (pRight > bLeft && pLeft < bRight) {
              // Landing on top of block
              if (pBottom >= bTop && pBottom <= bTop + 14 && eng.playerVy >= 0) {
                eng.playerY = bTop;
                eng.playerVy = 0;
                eng.isGrounded = true;
                eng.playerRot = Math.round(eng.playerRot / (Math.PI / 2)) * (Math.PI / 2);
              } else if (pBottom > bTop + 14 && pTop < bBottom) {
                // Crash into block wall
                crashAndReset();
              }
            }
          } else if (obs.type === 'pad') {
            // Jump pad launch
            const padLeft = obsScreenX - obs.w / 2;
            const padRight = obsScreenX + obs.w / 2;
            if (pRight > padLeft && pLeft < padRight && Math.abs(pBottom - obs.y) < 12) {
              eng.playerVy = -16.5 * eng.gravityDir;
              sound.playCollect();
            }
          }
        });
      }

      // ==========================================
      // 4. DRAW FLOOR & OBSTACLES
      // ==========================================
      // Glowing Neon Floor
      ctx.strokeStyle = selectedLevel.color;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = selectedLevel.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(W, floorY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Solid Floor Base
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, floorY, W, H - floorY);

      // Draw Obstacles
      eng.obstacles.forEach((obs) => {
        const obsScreenX = obs.x - eng.worldX + eng.playerX;
        if (obsScreenX < -60 || obsScreenX > W + 60) return;

        if (obs.type === 'spike') {
          ctx.save();
          ctx.translate(obsScreenX, obs.y);
          ctx.fillStyle = '#f43f5e';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(-obs.w / 2, 0);
          ctx.lineTo(0, -obs.h);
          ctx.lineTo(obs.w / 2, 0);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        } else if (obs.type === 'block') {
          ctx.save();
          ctx.translate(obsScreenX, obs.y);
          ctx.fillStyle = '#1e293b';
          ctx.shadowColor = selectedLevel.color;
          ctx.shadowBlur = 8;
          ctx.fillRect(0, 0, obs.w, obs.h);

          ctx.strokeStyle = selectedLevel.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, obs.w, obs.h);
          ctx.restore();
        } else if (obs.type === 'orb') {
          ctx.save();
          ctx.translate(obsScreenX, obs.y);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (obs.type === 'pad') {
          ctx.save();
          ctx.translate(obsScreenX, obs.y);
          ctx.fillStyle = '#facc15';
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.roundRect(-obs.w / 2, -obs.h, obs.w, obs.h, [8, 8, 0, 0]);
          ctx.fill();
          ctx.restore();
        }
      });

      // ==========================================
      // 5. DRAW CYBER CUBE HERO
      // ==========================================
      if (stage === 'playing') {
        ctx.save();
        ctx.translate(eng.playerX, eng.playerY - cubeSize / 2);
        ctx.rotate(eng.playerRot);

        // Cube Body
        ctx.fillStyle = selectedLevel.color;
        ctx.shadowColor = selectedLevel.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.roundRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize, 6);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cyber Face Eyes & Mouth
        ctx.fillStyle = '#020617';
        ctx.fillRect(-10, -8, 6, 6);
        ctx.fillRect(4, -8, 6, 6);
        ctx.fillRect(-7, 4, 14, 4);

        ctx.restore();
      }

      // ==========================================
      // 6. DRAW PARTICLES
      // ==========================================
      eng.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
      eng.particles = eng.particles.filter((p) => p.alpha > 0);
    };

    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [bestPercent, crashAndReset, selectedLevel, stage]);

  return (
    <div
      ref={containerRef}
      id="cyber-neon-dash-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1 sm:px-2 py-1"
    >
      {/* ========================================================================= */}
      {/* 1. TOP PROGRESS BAR & ATTEMPTS HUD */}
      {/* ========================================================================= */}
      {stage === 'playing' && (
        <div className="w-full mb-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl flex items-center justify-between">
          {/* Attempts Count */}
          <div className="text-left">
            <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">ATTEMPT</div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono leading-none">#{attempts}</div>
          </div>

          {/* Level Progress Bar */}
          <div className="text-center flex flex-col items-center">
            <div className="text-sm font-black text-white font-mono mb-1">{progressPercent}%</div>
            <div className="w-32 h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-pink-500 to-amber-400 transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Best Record & Mute */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] uppercase font-black text-amber-400 tracking-wider flex items-center justify-end gap-1">
                <Crown className="w-3 h-3 text-amber-400" /> BEST
              </div>
              <div className="text-base sm:text-lg font-black text-white font-mono leading-none">{bestPercent}%</div>
            </div>

            <button
              onClick={() => {
                const isMute = sound.toggleMute();
                setMuted(isMute);
              }}
              className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GEOMETRY DASH CANVAS ARENA */}
      {/* ========================================================================= */}
      <div
        onPointerDown={() => {
          engineRef.current.isHoldingJump = true;
          triggerJump();
        }}
        onPointerUp={() => {
          engineRef.current.isHoldingJump = false;
        }}
        className="relative w-full max-w-[460px] aspect-[540/780] max-h-[74vh] sm:max-h-[82vh] flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl border-2 border-cyan-500/40 bg-black cursor-pointer touch-none"
      >
        <canvas
          ref={canvasRef}
          width={540}
          height={780}
          className="w-full h-full object-contain block touch-none"
        />

        {/* Tap anywhere to Jump hint */}
        {stage === 'playing' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-950/80 border border-slate-700 text-xs font-bold text-cyan-300 pointer-events-none">
            👆 Tap Anywhere / Space to Jump!
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MENU STAGE */}
      {/* ========================================================================= */}
      {stage === 'menu' && (
        <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900/95 border-2 border-cyan-500/40 shadow-2xl text-center space-y-4 my-auto animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/30">
            <Zap className="w-9 h-9 text-cyan-400 animate-bounce" />
          </div>

          <div>
            <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">GEOMETRY RHYTHM RUNNER</div>
            <h2 className="text-3xl font-black text-white mt-0.5">GEOMETRY DASH PRO</h2>
            <p className="text-xs text-slate-400 mt-1">Jump over spikes, hit jump orbs & reach 100% completion!</p>
          </div>

          {/* Level Selector */}
          <div className="space-y-1.5 text-left">
            <div className="text-[10px] font-black uppercase text-slate-400">Select Difficulty:</div>
            {LEVELS.map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl)}
                className={`w-full p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                  selectedLevel.id === lvl.id
                    ? 'bg-slate-800 border-cyan-400 shadow-md shadow-cyan-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lvl.color }} />
                  <span className="text-xs font-bold text-white">{lvl.title}</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase">{lvl.difficulty}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => startLevel(selectedLevel)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 active:scale-95 text-white font-black text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all"
          >
            <Play className="w-5 h-5 fill-white" /> START RUNNING
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. LEVEL COMPLETE 100% MODAL */}
      {/* ========================================================================= */}
      {stage === 'won' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border-2 border-emerald-400/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
              <Trophy className="w-9 h-9 text-emerald-400 animate-bounce" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-emerald-400 tracking-wider">100% COMPLETED!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">LEVEL COMPLETE!</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Total Attempts:</span>
                <span className="text-emerald-300 font-mono text-xl font-black">#{attempts}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Difficulty Cleared:</span>
                <span className="text-amber-300 font-mono text-base font-black uppercase">{selectedLevel.difficulty}</span>
              </div>
            </div>

            <button
              onClick={() => startLevel(selectedLevel)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-600 to-pink-600 hover:from-emerald-400 active:scale-95 text-white font-black text-base shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" /> PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
