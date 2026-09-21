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
  Target
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

export interface PhysicsCube {
  id: number;
  val: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  scale: number;
  mergedThisFrame: boolean;
}

const CUBE_COLORS: Record<number, { bg: string; border: string; glow: string; text: string }> = {
  2: { bg: '#1e293b', border: '#64748b', glow: '#64748b', text: '#ffffff' },
  4: { bg: '#0369a1', border: '#38bdf8', glow: '#38bdf8', text: '#ffffff' },
  8: { bg: '#047857', border: '#34d399', glow: '#34d399', text: '#ffffff' },
  16: { bg: '#b45309', border: '#facc15', glow: '#facc15', text: '#ffffff' },
  32: { bg: '#c2410c', border: '#fb923c', glow: '#fb923c', text: '#ffffff' },
  64: { bg: '#be123c', border: '#f43f5e', glow: '#f43f5e', text: '#ffffff' },
  128: { bg: '#7e22ce', border: '#c084fc', glow: '#c084fc', text: '#ffffff' },
  256: { bg: '#4338ca', border: '#818cf8', glow: '#818cf8', text: '#ffffff' },
  512: { bg: '#854d0e', border: '#fde047', glow: '#fde047', text: '#ffffff' },
  1024: { bg: '#9d174d', border: '#f472b6', glow: '#f472b6', text: '#ffffff' },
  2048: { bg: '#e11d48', border: '#fbbf24', glow: '#fde047', text: '#ffffff' },
  4096: { bg: '#4f46e5', border: '#a855f7', glow: '#c084fc', text: '#ffffff' },
};

const SPAWN_VALUES = [2, 4, 8, 16, 32, 64];

export const Cyber2048CubeMerge: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nextIdRef = useRef<number>(1);

  // Match State
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_2048_cube_high') || '0', 10);
  });
  const [highestCube, setHighestCube] = useState<number>(2);
  const [currentVal, setCurrentVal] = useState<number>(2);
  const [nextVal, setNextVal] = useState<number>(4);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // 60 FPS Physics Engine Ref
  const engineRef = useRef<{
    cubes: PhysicsCube[];
    aimX: number;
    aiming: boolean;
    canShoot: boolean;
    dangerTimer: number;
    particles: { x: number; y: number; vx: number; vy: number; color: string; alpha: number; size: number }[];
    shockwaves: { x: number; y: number; r: number; alpha: number; color: string }[];
  }>({
    cubes: [],
    aimX: 270,
    aiming: false,
    canShoot: true,
    dangerTimer: 0,
    particles: [],
    shockwaves: [],
  });

  const getCubeStyle = (val: number) => {
    return (
      CUBE_COLORS[val] || {
        bg: '#1e1b4b',
        border: '#a855f7',
        glow: '#c084fc',
        text: '#ffffff',
      }
    );
  };

  // Launch Current Cube
  const shootCube = useCallback(() => {
    const eng = engineRef.current;
    if (!eng.canShoot || isGameOver) return;

    sound.playHit();
    eng.canShoot = false;

    const size = 52;
    eng.cubes.push({
      id: nextIdRef.current++,
      val: currentVal,
      x: eng.aimX,
      y: 690,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -19,
      size,
      scale: 1,
      mergedThisFrame: false,
    });

    setCurrentVal(nextVal);
    setNextVal(SPAWN_VALUES[Math.floor(Math.random() * Math.min(SPAWN_VALUES.length, 4))]);

    setTimeout(() => {
      eng.canShoot = true;
    }, 450);
  }, [currentVal, isGameOver, nextVal]);

  // Restart Match
  const restartMatch = () => {
    sound.playClick();
    const eng = engineRef.current;
    eng.cubes = [];
    eng.aimX = 270;
    eng.canShoot = true;
    eng.dangerTimer = 0;
    eng.particles = [];
    eng.shockwaves = [];

    setScore(0);
    setHighestCube(2);
    setCurrentVal(2);
    setNextVal(4);
    setIsGameOver(false);
  };

  // Aim Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isGameOver) return;
    engineRef.current.aiming = true;
    updateAimX(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!engineRef.current.aiming || isGameOver) return;
    updateAimX(e);
  };

  const handlePointerUp = () => {
    if (!engineRef.current.aiming || isGameOver) return;
    engineRef.current.aiming = false;
    shootCube();
  };

  const updateAimX = (e: React.PointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 540 / rect.width;
    const px = (e.clientX - rect.left) * scaleX;
    engineRef.current.aimX = Math.max(50, Math.min(490, px));
  };

  // 60 FPS Physics Simulation Loop
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

      const leftWall = 20;
      const rightWall = 520;
      const topWall = 60;
      const dangerLineY = 620;

      // ==========================================
      // 1. BACKGROUND & ARENA
      // ==========================================
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);

      // Arena Body
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.beginPath();
      ctx.roundRect(leftWall, topWall, rightWall - leftWall, dangerLineY - topWall + 80, 18);
      ctx.fill();

      // Glowing Neon Border
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Red Danger Line
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(leftWall + 10, dangerLineY);
      ctx.lineTo(rightWall - 10, dangerLineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // ==========================================
      // 2. PHYSICS UPDATE & RIGID BODY COLLISIONS
      // ==========================================
      const friction = 0.985;
      const bounce = 0.65;

      eng.cubes.forEach((c) => {
        c.mergedThisFrame = false;

        c.x += c.vx;
        c.y += c.vy;
        c.vx *= friction;
        c.vy *= friction;

        // Wall Collisions
        const half = c.size / 2;
        if (c.x - half < leftWall) {
          c.x = leftWall + half;
          c.vx = -c.vx * bounce;
        }
        if (c.x + half > rightWall) {
          c.x = rightWall - half;
          c.vx = -c.vx * bounce;
        }
        if (c.y - half < topWall) {
          c.y = topWall + half;
          c.vy = -c.vy * bounce;
        }
      });

      // Pairwise Cube Collision & 2048 Merge
      for (let i = 0; i < eng.cubes.length; i++) {
        for (let j = i + 1; j < eng.cubes.length; j++) {
          const c1 = eng.cubes[i];
          const c2 = eng.cubes[j];
          if (!c1 || !c2) continue;

          const dx = c2.x - c1.x;
          const dy = c2.y - c1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = (c1.size + c2.size) / 2;

          if (dist < minDist && dist > 0) {
            // Check Merge
            if (c1.val === c2.val && !c1.mergedThisFrame && !c2.mergedThisFrame) {
              c1.mergedThisFrame = true;
              c2.mergedThisFrame = true;

              sound.playCollect();
              sound.playWin();

              const newVal = c1.val * 2;
              c1.val = newVal;
              c1.scale = 1.35;
              c1.vy = -7; // Upward kick

              // Shockwave
              eng.shockwaves.push({
                x: (c1.x + c2.x) / 2,
                y: (c1.y + c2.y) / 2,
                r: 10,
                alpha: 1.0,
                color: getCubeStyle(newVal).border,
              });

              // Sparks
              for (let p = 0; p < 12; p++) {
                eng.particles.push({
                  x: c1.x,
                  y: c1.y,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  color: getCubeStyle(newVal).border,
                  alpha: 1.0,
                  size: 4,
                });
              }

              // Update Score & Highest Cube
              setScore((prev) => {
                const ns = prev + newVal;
                if (ns > highScore) {
                  setHighScore(ns);
                  localStorage.setItem('cyber_2048_cube_high', ns.toString());
                }
                return ns;
              });

              if (newVal > highestCube) {
                setHighestCube(newVal);
                if (newVal === 2048 || newVal === 4096) {
                  confetti({ particleCount: 180, spread: 90, origin: { y: 0.5 } });
                }
              }

              // Remove c2
              eng.cubes.splice(j, 1);
              j--;
            } else {
              // Elastic Rigid Body Bounce
              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = minDist - dist;

              c1.x -= nx * overlap * 0.5;
              c1.y -= ny * overlap * 0.5;
              c2.x += nx * overlap * 0.5;
              c2.y += ny * overlap * 0.5;

              const kx = c1.vx - c2.vx;
              const ky = c1.vy - c2.vy;
              const p = 2 * (nx * kx + ny * ky) / 2;

              c1.vx -= p * nx * bounce;
              c1.vy -= p * ny * bounce;
              c2.vx += p * nx * bounce;
              c2.vy += p * ny * bounce;
            }
          }
        }
      }

      // Check Danger Line Overflow
      const overflowCount = eng.cubes.filter(
        (c) => c.y + c.size / 2 > dangerLineY && Math.hypot(c.vx, c.vy) < 0.5
      ).length;

      if (overflowCount > 0) {
        eng.dangerTimer++;
        if (eng.dangerTimer > 180) {
          // Breached for >3s
          setIsGameOver(true);
          sound.playGameOver();
        }
      } else {
        eng.dangerTimer = 0;
      }

      // ==========================================
      // 3. DRAW CUBES
      // ==========================================
      eng.cubes.forEach((c) => {
        if (c.scale > 1) c.scale = Math.max(1, c.scale - 0.04);
        const style = getCubeStyle(c.val);
        const half = (c.size / 2) * c.scale;

        ctx.save();
        ctx.translate(c.x, c.y);

        // Cube Body
        ctx.fillStyle = style.bg;
        ctx.strokeStyle = style.border;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = style.glow;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(-half, -half, half * 2, half * 2, 10);
        ctx.fill();
        ctx.stroke();

        // Value Text
        ctx.fillStyle = style.text;
        ctx.font = `900 ${c.val >= 1024 ? 16 : c.val >= 128 ? 18 : 20}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.val.toString(), 0, 0);

        ctx.restore();
      });

      // ==========================================
      // 4. DRAW AIM GUIDE & READY LAUNCHER CUBE
      // ==========================================
      if (!isGameOver) {
        // Aim Ray
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(eng.aimX, 690);
        ctx.lineTo(eng.aimX, 100);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ready Cube
        if (eng.canShoot) {
          const readyStyle = getCubeStyle(currentVal);
          ctx.save();
          ctx.translate(eng.aimX, 690);
          ctx.fillStyle = readyStyle.bg;
          ctx.strokeStyle = readyStyle.border;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = readyStyle.glow;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.roundRect(-26, -26, 52, 52, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = readyStyle.text;
          ctx.font = '900 20px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(currentVal.toString(), 0, 0);
          ctx.restore();
        }
      }

      // Shockwaves
      eng.shockwaves.forEach((sw) => {
        sw.r += 3;
        sw.alpha -= 0.05;
        if (sw.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = sw.alpha;
          ctx.strokeStyle = sw.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });
      eng.shockwaves = eng.shockwaves.filter((sw) => sw.alpha > 0);

      // Particles
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
  }, [currentVal, highestCube, highScore, isGameOver]);

  return (
    <div
      ref={containerRef}
      id="cyber-2048-cube-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1 sm:px-2 py-1"
    >
      {/* ========================================================================= */}
      {/* 1. TOP SCORE & HIGHEST CUBE HUD */}
      {/* ========================================================================= */}
      <div className="w-full mb-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl flex items-center justify-between">
        {/* Score */}
        <div className="text-left">
          <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">SCORE</div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono leading-none">{score}</div>
        </div>

        {/* Highest Cube & Next Queue */}
        <div className="flex items-center gap-3">
          <div className="text-center font-mono">
            <div className="text-[9px] uppercase font-bold text-slate-400">HIGHEST</div>
            <div className="text-xs sm:text-sm font-black text-amber-300 font-mono">{highestCube}</div>
          </div>

          <div className="text-center font-mono">
            <div className="text-[9px] uppercase font-bold text-slate-400">NEXT</div>
            <div className="text-xs sm:text-sm font-black text-cyan-300 font-mono">{nextVal}</div>
          </div>
        </div>

        {/* High Score & Mute */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] uppercase font-black text-amber-400 tracking-wider flex items-center justify-end gap-1">
              <Crown className="w-3 h-3 text-amber-400" /> BEST
            </div>
            <div className="text-base sm:text-lg font-black text-white font-mono leading-none">{highScore}</div>
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

      {/* ========================================================================= */}
      {/* 2. CUBE MERGE CANVAS ARENA */}
      {/* ========================================================================= */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full max-w-[460px] aspect-[540/780] max-h-[74vh] sm:max-h-[82vh] flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl border-2 border-cyan-500/40 bg-black cursor-crosshair touch-none"
      >
        <canvas
          ref={canvasRef}
          width={540}
          height={780}
          className="w-full h-full object-contain block touch-none"
        />

        {/* Aim Hint */}
        {!isGameOver && (
          <div className="absolute top-2 right-4 text-[10px] font-bold text-slate-400 pointer-events-none">
            👆 Drag Lane to Aim, Release to Launch
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. GAME OVER MODAL */}
      {/* ========================================================================= */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border-2 border-rose-500/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto shadow-xl shadow-rose-500/30">
              <Award className="w-9 h-9 text-rose-400" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">CUBES OVERFLOWED!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GAME OVER</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-white font-mono text-xl font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Highest Tier:</span>
                <span className="text-amber-300 font-mono text-base font-black">{highestCube}</span>
              </div>
            </div>

            <button
              onClick={restartMatch}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 hover:from-cyan-400 active:scale-95 text-white font-black text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" /> PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
