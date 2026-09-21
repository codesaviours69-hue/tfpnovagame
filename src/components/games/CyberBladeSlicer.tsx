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
  Shield,
  Heart,
  XCircle
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

export type FruitType = 'watermelon' | 'orange' | 'apple' | 'strawberry' | 'banana' | 'bomb';

export interface Fruit {
  id: number;
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vRot: number;
  sliced: boolean;
  color: string;
  innerColor: string;
  name: string;
}

export interface SlicedHalf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vRot: number;
  color: string;
  innerColor: string;
  isLeft: boolean;
}

export interface JuiceParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

export interface BladePoint {
  x: number;
  y: number;
  time: number;
}

const FRUIT_CONFIGS: Record<
  FruitType,
  { radius: number; color: string; innerColor: string; name: string }
> = {
  watermelon: { radius: 36, color: '#10b981', innerColor: '#f43f5e', name: 'Watermelon' },
  orange: { radius: 28, color: '#f97316', innerColor: '#fde047', name: 'Plasma Orange' },
  apple: { radius: 26, color: '#84cc16', innerColor: '#ffffff', name: 'Neon Apple' },
  strawberry: { radius: 22, color: '#f43f5e', innerColor: '#fecdd3', name: 'Laser Berry' },
  banana: { radius: 24, color: '#facc15', innerColor: '#ffffff', name: 'Quantum Banana' },
  bomb: { radius: 30, color: '#475569', innerColor: '#ef4444', name: 'Cyber Bomb' },
};

export const CyberBladeSlicer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nextIdRef = useRef<number>(1);

  // Match State
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_blade_high') || '0', 10);
  });
  const [strikes, setStrikes] = useState<number>(0);
  const [comboBanner, setComboBanner] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // 60 FPS Physics Engine Ref
  const engineRef = useRef<{
    fruits: Fruit[];
    halves: SlicedHalf[];
    particles: JuiceParticle[];
    bladePoints: BladePoint[];
    isSwiping: boolean;
    spawnTimer: number;
    currentStrokeSlicedCount: number;
  }>({
    fruits: [],
    halves: [],
    particles: [],
    bladePoints: [],
    isSwiping: false,
    spawnTimer: 0,
    currentStrokeSlicedCount: 0,
  });

  // Spawn Fresh Wave of Fruits from Bottom
  const spawnFruitWave = useCallback(() => {
    const eng = engineRef.current;
    const count = 1 + Math.floor(Math.random() * 3);
    const types: FruitType[] = ['watermelon', 'orange', 'apple', 'strawberry', 'banana'];

    for (let i = 0; i < count; i++) {
      const isBomb = Math.random() < 0.22;
      const type = isBomb ? 'bomb' : types[Math.floor(Math.random() * types.length)];
      const cfg = FRUIT_CONFIGS[type];

      const startX = 80 + Math.random() * 380;
      const vx = (270 - startX) * 0.012 + (Math.random() - 0.5) * 3;
      const vy = -(13.5 + Math.random() * 4);

      eng.fruits.push({
        id: nextIdRef.current++,
        type,
        x: startX,
        y: 790,
        vx,
        vy,
        radius: cfg.radius,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.1,
        sliced: false,
        color: cfg.color,
        innerColor: cfg.innerColor,
        name: cfg.name,
      });
    }
  }, []);

  // Check Line Segment to Circle Intersection
  const checkIntersection = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    circle: { x: number; y: number; radius: number }
  ) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return false;

    const u = Math.max(0, Math.min(1, ((circle.x - p1.x) * dx + (circle.y - p1.y) * dy) / (len * len)));
    const projX = p1.x + u * dx;
    const projY = p1.y + u * dy;
    return Math.hypot(circle.x - projX, circle.y - projY) <= circle.radius;
  };

  // Slice Fruit Trigger
  const sliceFruit = (fruit: Fruit) => {
    fruit.sliced = true;
    const eng = engineRef.current;
    eng.currentStrokeSlicedCount++;

    if (fruit.type === 'bomb') {
      sound.playExplosion();
      setStrikes(3);
      setIsGameOver(true);
      return;
    }

    sound.playLaser();

    // Create 2 Sliced Halves
    eng.halves.push({
      x: fruit.x - 12,
      y: fruit.y,
      vx: fruit.vx - 3.5,
      vy: fruit.vy - 2,
      radius: fruit.radius,
      rotation: fruit.rotation,
      vRot: -0.15,
      color: fruit.color,
      innerColor: fruit.innerColor,
      isLeft: true,
    });

    eng.halves.push({
      x: fruit.x + 12,
      y: fruit.y,
      vx: fruit.vx + 3.5,
      vy: fruit.vy - 2,
      radius: fruit.radius,
      rotation: fruit.rotation,
      vRot: 0.15,
      color: fruit.color,
      innerColor: fruit.innerColor,
      isLeft: false,
    });

    // Splatter Juice Particles
    for (let p = 0; p < 14; p++) {
      eng.particles.push({
        x: fruit.x,
        y: fruit.y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color: fruit.innerColor,
        alpha: 1.0,
        size: 3 + Math.random() * 4,
      });
    }

    // Points
    setScore((prev) => {
      const ns = prev + 10;
      if (ns > highScore) {
        setHighScore(ns);
        localStorage.setItem('cyber_blade_high', ns.toString());
      }
      return ns;
    });
  };

  // Touch / Pointer Swipe Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isGameOver) return;
    engineRef.current.isSwiping = true;
    engineRef.current.currentStrokeSlicedCount = 0;
    addBladePoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!engineRef.current.isSwiping || isGameOver) return;
    addBladePoint(e);
  };

  const handlePointerUp = () => {
    const eng = engineRef.current;
    eng.isSwiping = false;

    // Trigger Combo Popups
    if (eng.currentStrokeSlicedCount >= 3) {
      sound.playWin();
      const bonus = eng.currentStrokeSlicedCount * 20;
      setScore((prev) => prev + bonus);
      setComboBanner(`🔥 COMBO x${eng.currentStrokeSlicedCount} (+${bonus})!`);
      setTimeout(() => setComboBanner(null), 1400);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
    }
  };

  const addBladePoint = (e: React.PointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 540 / rect.width;
    const scaleY = 780 / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const eng = engineRef.current;
    const now = performance.now();

    eng.bladePoints.push({ x: px, y: py, time: now });

    // Check Slice Collisions with Recent Segment
    if (eng.bladePoints.length >= 2) {
      const p1 = eng.bladePoints[eng.bladePoints.length - 2];
      const p2 = eng.bladePoints[eng.bladePoints.length - 1];

      eng.fruits.forEach((fruit) => {
        if (!fruit.sliced) {
          if (checkIntersection(p1, p2, fruit)) {
            sliceFruit(fruit);
          }
        }
      });
    }
  };

  // Restart Match
  const restartMatch = () => {
    sound.playClick();
    const eng = engineRef.current;
    eng.fruits = [];
    eng.halves = [];
    eng.particles = [];
    eng.bladePoints = [];
    eng.isSwiping = false;
    eng.spawnTimer = 0;

    setScore(0);
    setStrikes(0);
    setComboBanner(null);
    setIsGameOver(false);
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
      const gravity = 0.38;
      const now = performance.now();

      // ==========================================
      // 1. BACKGROUND
      // ==========================================
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#110726');
      bgGrad.addColorStop(0.5, '#0a0518');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // ==========================================
      // 2. SPAWN TIMER
      // ==========================================
      if (!isGameOver) {
        eng.spawnTimer++;
        if (eng.spawnTimer >= 90) {
          eng.spawnTimer = 0;
          spawnFruitWave();
        }
      }

      // ==========================================
      // 3. FRUITS PHYSICS UPDATE
      // ==========================================
      eng.fruits.forEach((fruit) => {
        fruit.x += fruit.vx;
        fruit.y += fruit.vy;
        fruit.vy += gravity;
        fruit.rotation += fruit.vRot;

        // Check if fruit fell off bottom unsliced (Strike!)
        if (fruit.y > H + 60 && !fruit.sliced) {
          fruit.sliced = true;
          if (fruit.type !== 'bomb') {
            sound.playHit();
            setStrikes((prev) => {
              const ns = prev + 1;
              if (ns >= 3) {
                setIsGameOver(true);
                sound.playGameOver();
              }
              return ns;
            });
          }
        }
      });
      eng.fruits = eng.fruits.filter((f) => f.y < H + 80 && !f.sliced);

      // Halves Physics Update
      eng.halves.forEach((h) => {
        h.x += h.vx;
        h.y += h.vy;
        h.vy += gravity * 1.2;
        h.rotation += h.vRot;
      });
      eng.halves = eng.halves.filter((h) => h.y < H + 80);

      // ==========================================
      // 4. DRAW FRUITS & HALVES
      // ==========================================
      // Whole Fruits
      eng.fruits.forEach((f) => {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);

        if (f.type === 'bomb') {
          // Cyber Bomb
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Pulsing Fuse Sparks
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(0, -f.radius - 6, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Outer Rind / Shell
          ctx.fillStyle = f.color;
          ctx.shadowColor = f.color;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Inner Pulp Center
          ctx.fillStyle = f.innerColor;
          ctx.beginPath();
          ctx.arc(0, 0, f.radius * 0.75, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // Sliced Halves
      eng.halves.forEach((h) => {
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rotation);

        ctx.fillStyle = h.color;
        ctx.shadowColor = h.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        if (h.isLeft) {
          ctx.arc(0, 0, h.radius, Math.PI / 2, (Math.PI * 3) / 2);
        } else {
          ctx.arc(0, 0, h.radius, (Math.PI * 3) / 2, Math.PI / 2);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = h.innerColor;
        ctx.beginPath();
        if (h.isLeft) {
          ctx.arc(0, 0, h.radius * 0.75, Math.PI / 2, (Math.PI * 3) / 2);
        } else {
          ctx.arc(0, 0, h.radius * 0.75, (Math.PI * 3) / 2, Math.PI / 2);
        }
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      });

      // ==========================================
      // 5. DRAW NEON BLADE SWIPE TRAIL
      // ==========================================
      // Filter blade points older than 180ms
      eng.bladePoints = eng.bladePoints.filter((pt) => now - pt.time < 180);

      if (eng.bladePoints.length >= 2) {
        ctx.save();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 16;

        ctx.beginPath();
        eng.bladePoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();

        // Core White Hot Blade Line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // ==========================================
      // 6. DRAW PARTICLES
      // ==========================================
      eng.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.alpha -= 0.035;

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
  }, [isGameOver, spawnFruitWave]);

  return (
    <div
      ref={containerRef}
      id="cyber-blade-slicer-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1 sm:px-2 py-1"
    >
      {/* ========================================================================= */}
      {/* 1. TOP SCORE & LIVES HUD */}
      {/* ========================================================================= */}
      <div className="w-full mb-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl flex items-center justify-between">
        {/* Score */}
        <div className="text-left">
          <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">SCORE</div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono leading-none">{score}</div>
        </div>

        {/* 3 Strikes / Lives Indicator */}
        <div className="text-center font-mono">
          <div className="text-[10px] uppercase font-bold text-slate-400">STRIKES</div>
          <div className="flex gap-1.5 justify-center mt-1">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`text-base font-black ${
                  strikes >= s ? 'text-rose-500 animate-bounce' : 'text-slate-800'
                }`}
              >
                ✕
              </span>
            ))}
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
      {/* 2. FRUIT SLICER CANVAS ARENA */}
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

        {/* Combo Popup Banner */}
        {comboBanner && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 px-6 py-2 rounded-2xl bg-gradient-to-r from-pink-600 to-amber-500 text-white font-black text-base shadow-2xl animate-bounce pointer-events-none z-20">
            {comboBanner}
          </div>
        )}

        {/* Slice Hint */}
        {!isGameOver && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-950/80 border border-slate-700 text-xs font-bold text-cyan-300 pointer-events-none">
            👆 Swipe Fast to Slice Fruits & Avoid Bombs!
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
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">MATCH ENDED!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GAME OVER</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-white font-mono text-xl font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>All-Time Best:</span>
                <span className="text-amber-300 font-mono text-base font-black">{highScore}</span>
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
