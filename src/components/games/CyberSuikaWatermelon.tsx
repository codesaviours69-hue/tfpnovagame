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
  ChevronRight,
  Info
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

export interface FruitTier {
  level: number;
  name: string;
  emoji: string;
  radius: number;
  color: string;
  secondaryColor: string;
  points: number;
}

export const FRUIT_TIERS: FruitTier[] = [
  { level: 0, name: 'Cherry', emoji: '🍒', radius: 14, color: '#e11d48', secondaryColor: '#be123c', points: 2 },
  { level: 1, name: 'Strawberry', emoji: '🍓', radius: 20, color: '#f43f5e', secondaryColor: '#e11d48', points: 4 },
  { level: 2, name: 'Grape', emoji: '🍇', radius: 28, color: '#a855f7', secondaryColor: '#7e22ce', points: 8 },
  { level: 3, name: 'Tangerine', emoji: '🍊', radius: 36, color: '#f97316', secondaryColor: '#c2410c', points: 16 },
  { level: 4, name: 'Orange', emoji: '🍋', radius: 46, color: '#fbbf24', secondaryColor: '#d97706', points: 32 },
  { level: 5, name: 'Apple', emoji: '🍎', radius: 56, color: '#dc2626', secondaryColor: '#991b1b', points: 64 },
  { level: 6, name: 'Pear', emoji: '🍐', radius: 66, color: '#a3e635', secondaryColor: '#65a30d', points: 128 },
  { level: 7, name: 'Peach', emoji: '🍑', radius: 78, color: '#f472b6', secondaryColor: '#db2777', points: 256 },
  { level: 8, name: 'Pineapple', emoji: '🍍', radius: 92, color: '#eab308', secondaryColor: '#ca8a04', points: 512 },
  { level: 9, name: 'Melon', emoji: '🍈', radius: 106, color: '#84cc16', secondaryColor: '#4d7c0f', points: 1024 },
  { level: 10, name: 'WATERMELON', emoji: '🍉', radius: 124, color: '#10b981', secondaryColor: '#047857', points: 2048 },
];

interface FruitBody {
  id: number;
  level: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotV: number;
  radius: number;
  settledTimer: number;
}

export const CyberSuikaWatermelon: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Match State
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_suika_high') || '0', 10);
  });
  const [currentLevel, setCurrentLevel] = useState<number>(0); // Current dropping fruit level (0 to 3)
  const [nextLevel, setNextLevel] = useState<number>(1);
  const [dropX, setDropX] = useState<number>(270); // Dropper X position
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [watermelonCreated, setWatermelonCreated] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // 60 FPS Physics Engine Ref
  const engineRef = useRef<{
    fruits: FruitBody[];
    nextId: number;
    canDrop: boolean;
    dropCooldown: number;
    dangerLineY: number;
    containerLeft: number;
    containerRight: number;
    containerBottom: number;
    particles: { x: number; y: number; vx: number; vy: number; color: string; alpha: number; size: number }[];
    popSparks: { x: number; y: number; text: string; alpha: number }[];
  }>({
    fruits: [],
    nextId: 1,
    canDrop: true,
    dropCooldown: 0,
    dangerLineY: 140,
    containerLeft: 40,
    containerRight: 500,
    containerBottom: 740,
    particles: [],
    popSparks: [],
  });

  // Get Random starter fruit level (Cherry, Strawberry, Grape, Tangerine)
  const getRandomSpawnLevel = (): number => {
    const r = Math.random();
    if (r < 0.45) return 0; // Cherry
    if (r < 0.75) return 1; // Strawberry
    if (r < 0.92) return 2; // Grape
    return 3; // Tangerine
  };

  // Drop Current Fruit
  const dropFruit = useCallback(() => {
    const eng = engineRef.current;
    if (!eng.canDrop || isGameOver) return;

    sound.playHit();
    eng.canDrop = false;
    eng.dropCooldown = 35; // cooldown frames before next drop

    const tier = FRUIT_TIERS[currentLevel];
    const clampedX = Math.max(
      eng.containerLeft + tier.radius + 5,
      Math.min(eng.containerRight - tier.radius - 5, dropX)
    );

    const newFruit: FruitBody = {
      id: eng.nextId++,
      level: currentLevel,
      x: clampedX,
      y: 90,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 2.0,
      rot: 0,
      rotV: (Math.random() - 0.5) * 0.05,
      radius: tier.radius,
      settledTimer: 0,
    };

    eng.fruits.push(newFruit);

    // Rotate next fruit
    setCurrentLevel(nextLevel);
    setNextLevel(getRandomSpawnLevel());
  }, [currentLevel, dropX, isGameOver, nextLevel]);

  // Restart Match
  const restartMatch = () => {
    sound.playClick();
    engineRef.current.fruits = [];
    engineRef.current.particles = [];
    engineRef.current.popSparks = [];
    engineRef.current.canDrop = true;
    engineRef.current.dropCooldown = 0;
    setScore(0);
    setCurrentLevel(getRandomSpawnLevel());
    setNextLevel(getRandomSpawnLevel());
    setIsGameOver(false);
    setWatermelonCreated(false);
  };

  // Track Mouse / Touch Dropper Movement
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 540 / rect.width;
    const clientX = (e.clientX - rect.left) * scaleX;
    setDropX(clientX);
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

      // ==========================================
      // 1. BACKGROUND & GLASS JAR CONTAINER
      // ==========================================
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);

      // Glass Jar Background Body
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.beginPath();
      ctx.roundRect(eng.containerLeft, 60, eng.containerRight - eng.containerLeft, eng.containerBottom - 60, 24);
      ctx.fill();

      // Glass Jar Glowing Border
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Red Danger Line at Top (Y = 140)
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(eng.containerLeft + 10, eng.dangerLineY);
      ctx.lineTo(eng.containerRight - 10, eng.dangerLineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // ==========================================
      // 2. PHYSICS UPDATE (GRAVITY, COLLISIONS & MERGES)
      // ==========================================
      if (eng.dropCooldown > 0) {
        eng.dropCooldown--;
        if (eng.dropCooldown <= 0) eng.canDrop = true;
      }

      const gravity = 0.38;
      const friction = 0.985;
      const restitution = 0.24;

      // Apply Gravity and Wall Collisions
      eng.fruits.forEach((f) => {
        f.vy += gravity;
        f.vx *= friction;
        f.vy *= friction;
        f.rot += f.rotV;

        f.x += f.vx;
        f.y += f.vy;

        // Left Wall
        if (f.x - f.radius < eng.containerLeft) {
          f.x = eng.containerLeft + f.radius;
          f.vx = -f.vx * restitution;
        }
        // Right Wall
        if (f.x + f.radius > eng.containerRight) {
          f.x = eng.containerRight - f.radius;
          f.vx = -f.vx * restitution;
        }
        // Bottom Floor
        if (f.y + f.radius > eng.containerBottom) {
          f.y = eng.containerBottom - f.radius;
          f.vy = -f.vy * restitution;
          f.vx *= 0.92;
          if (Math.abs(f.vy) < 0.2) f.vy = 0;
        }

        // Track Danger Line Settling (Game Over Check)
        if (f.y - f.radius < eng.dangerLineY && f.vy < 0.2 && Math.abs(f.vx) < 0.2) {
          f.settledTimer++;
          if (f.settledTimer > 110 && !isGameOver) {
            setIsGameOver(true);
            sound.playGameOver();
          }
        } else {
          f.settledTimer = Math.max(0, f.settledTimer - 1);
        }
      });

      // Circle-to-Circle Collision & Merging
      const toRemoveIds = new Set<number>();
      const toAddFruits: FruitBody[] = [];

      for (let i = 0; i < eng.fruits.length; i++) {
        for (let j = i + 1; j < eng.fruits.length; j++) {
          const a = eng.fruits[i];
          const b = eng.fruits[j];

          if (toRemoveIds.has(a.id) || toRemoveIds.has(b.id)) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.radius + b.radius;

          if (dist < minDist && dist > 0) {
            // Check identical level MERGE!
            if (a.level === b.level && a.level < FRUIT_TIERS.length - 1) {
              toRemoveIds.add(a.id);
              toRemoveIds.add(b.id);

              const nextLvl = a.level + 1;
              const nextTier = FRUIT_TIERS[nextLvl];
              const midX = (a.x + b.x) / 2;
              const midY = (a.y + b.y) / 2;

              sound.playCollect();

              // Add points
              setScore((prev) => {
                const ns = prev + nextTier.points;
                if (ns > highScore) {
                  setHighScore(ns);
                  localStorage.setItem('cyber_suika_high', ns.toString());
                }
                return ns;
              });

              // Create Pop Sparks & Particles
              for (let p = 0; p < 14; p++) {
                eng.particles.push({
                  x: midX,
                  y: midY,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  color: nextTier.color,
                  alpha: 1.0,
                  size: 4 + Math.random() * 4,
                });
              }

              eng.popSparks.push({
                x: midX,
                y: midY - 15,
                text: `+${nextTier.points}`,
                alpha: 1.0,
              });

              // Giant Watermelon Milestone!
              if (nextLvl === 10) {
                setWatermelonCreated(true);
                sound.playFinishFanfare();
                confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
              }

              toAddFruits.push({
                id: eng.nextId++,
                level: nextLvl,
                x: midX,
                y: midY,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -1.5, // gentle pop up
                rot: 0,
                rotV: (Math.random() - 0.5) * 0.05,
                radius: nextTier.radius,
                settledTimer: 0,
              });
            } else {
              // Standard Elastic Circle Bounce Resolution
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;

              // Separate overlapping bodies
              const massA = a.radius * a.radius;
              const massB = b.radius * b.radius;
              const totalMass = massA + massB;

              a.x -= nx * overlap * (massB / totalMass);
              a.y -= ny * overlap * (massB / totalMass);
              b.x += nx * overlap * (massA / totalMass);
              b.y += ny * overlap * (massA / totalMass);

              // Relative velocity
              const rvx = b.vx - a.vx;
              const rvy = b.vy - a.vy;
              const velAlongNormal = rvx * nx + rvy * ny;

              if (velAlongNormal < 0) {
                const impulse = (-(1 + restitution) * velAlongNormal) / (1 / massA + 1 / massB);
                a.vx -= (impulse / massA) * nx;
                a.vy -= (impulse / massA) * ny;
                b.vx += (impulse / massB) * nx;
                b.vy += (impulse / massB) * ny;
              }
            }
          }
        }
      }

      // Filter merged fruits
      if (toRemoveIds.size > 0) {
        eng.fruits = eng.fruits.filter((f) => !toRemoveIds.has(f.id)).concat(toAddFruits);
      }

      // ==========================================
      // 3. DRAW ALL NEON FRUITS
      // ==========================================
      eng.fruits.forEach((f) => {
        const tier = FRUIT_TIERS[f.level];
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);

        // Fruit Body Gradient
        const grad = ctx.createRadialGradient(-f.radius * 0.3, -f.radius * 0.3, 2, 0, 0, f.radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, tier.color);
        grad.addColorStop(1, tier.secondaryColor);
        ctx.fillStyle = grad;
        ctx.shadowColor = tier.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
        ctx.fill();

        // Fruit Rim Outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Cute Face (Eyes & Smile)
        const eyeOffset = f.radius * 0.32;
        const eyeSize = Math.max(2.5, f.radius * 0.1);

        // Eyes
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(-eyeOffset, -f.radius * 0.1, eyeSize, 0, Math.PI * 2);
        ctx.arc(eyeOffset, -f.radius * 0.1, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Eye shine
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-eyeOffset - 1, -f.radius * 0.1 - 1, eyeSize * 0.4, 0, Math.PI * 2);
        ctx.arc(eyeOffset - 1, -f.radius * 0.1 - 1, eyeSize * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = Math.max(1.5, f.radius * 0.08);
        ctx.beginPath();
        ctx.arc(0, f.radius * 0.1, f.radius * 0.22, 0.2, Math.PI - 0.2);
        ctx.stroke();

        ctx.restore();
      });

      // ==========================================
      // 4. DRAW DROPPER & GUIDELINE (AT TOP)
      // ==========================================
      if (eng.canDrop && !isGameOver) {
        const curTier = FRUIT_TIERS[currentLevel];
        const clampedDropX = Math.max(
          eng.containerLeft + curTier.radius + 5,
          Math.min(eng.containerRight - curTier.radius - 5, dropX)
        );

        // Dashed Drop Projection Guideline
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(clampedDropX, 90);
        ctx.lineTo(clampedDropX, eng.containerBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ready Fruit at Dropper
        ctx.save();
        ctx.translate(clampedDropX, 90);
        const grad = ctx.createRadialGradient(-curTier.radius * 0.3, -curTier.radius * 0.3, 2, 0, 0, curTier.radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, curTier.color);
        grad.addColorStop(1, curTier.secondaryColor);
        ctx.fillStyle = grad;
        ctx.shadowColor = curTier.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, curTier.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // ==========================================
      // 5. DRAW PARTICLES & POP SPARKS
      // ==========================================
      eng.particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;

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

      // Score Pop Sparks
      eng.popSparks.forEach((sp) => {
        sp.y -= 1.2;
        sp.alpha -= 0.03;

        if (sp.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = sp.alpha;
          ctx.fillStyle = '#ffe600';
          ctx.font = '900 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(sp.text, sp.x, sp.y);
          ctx.restore();
        }
      });
      eng.popSparks = eng.popSparks.filter((sp) => sp.alpha > 0);
    };

    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentLevel, dropX, highScore, isGameOver]);

  return (
    <div
      ref={containerRef}
      id="cyber-suika-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1 sm:px-2 py-1"
    >
      {/* ========================================================================= */}
      {/* 1. TOP SCORE & NEXT FRUIT PREVIEW HUD */}
      {/* ========================================================================= */}
      <div className="w-full mb-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl flex items-center justify-between">
        {/* Score */}
        <div className="text-left">
          <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">SCORE</div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono leading-none tracking-tight">
            {score}
          </div>
        </div>

        {/* Next Fruit Preview */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">NEXT:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xl">{FRUIT_TIERS[nextLevel]?.emoji}</span>
            <span className="text-xs font-bold text-white">{FRUIT_TIERS[nextLevel]?.name}</span>
          </div>
        </div>

        {/* High Score & Mute */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] uppercase font-black text-amber-400 tracking-wider flex items-center justify-end gap-1">
              <Crown className="w-3 h-3 text-amber-400" /> BEST
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono leading-none">
              {highScore}
            </div>
          </div>

          <button
            onClick={() => {
              const isMute = sound.toggleMute();
              setMuted(isMute);
            }}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUIKA DROP GLASS JAR CANVAS */}
      {/* ========================================================================= */}
      <div
        onPointerMove={handlePointerMove}
        onClick={dropFruit}
        className="relative w-full max-w-[460px] aspect-[540/780] max-h-[74vh] sm:max-h-[82vh] flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl border-2 border-cyan-500/40 bg-black cursor-crosshair touch-none"
      >
        <canvas
          ref={canvasRef}
          width={540}
          height={780}
          className="w-full h-full object-contain block touch-none"
        />

        {/* Dropper Tap Hint */}
        <div className="absolute top-2 right-4 text-[10px] font-bold text-slate-400 pointer-events-none">
          👆 Move & Tap to Drop
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FRUIT EVOLUTION TIER CHEAT SHEET */}
      {/* ========================================================================= */}
      <div className="w-full mt-2 p-2 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between overflow-x-auto gap-1 text-[10px]">
        {FRUIT_TIERS.map((tier) => (
          <div key={tier.level} className="flex items-center gap-0.5 shrink-0 px-1 py-0.5 rounded bg-slate-950/60">
            <span>{tier.emoji}</span>
            {tier.level < 10 && <span className="text-slate-500 text-[8px]">→</span>}
          </div>
        ))}
      </div>

      {/* Quick Drop CTA for mobile */}
      <div className="w-full mt-2">
        <button
          onClick={dropFruit}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-600 to-pink-600 active:scale-95 text-white font-black text-sm shadow-xl shadow-emerald-500/30 transition-all"
        >
          🍉 DROP FRUIT!
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. GAME OVER MODAL */}
      {/* ========================================================================= */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border-2 border-rose-500/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto shadow-xl shadow-rose-500/30">
              <Award className="w-9 h-9 text-rose-400" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">JAR OVERFLOWED!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GAME OVER</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-white font-mono text-xl font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Best Record:</span>
                <span className="text-amber-300 font-mono text-xl font-black">{highScore}</span>
              </div>
            </div>

            <button
              onClick={restartMatch}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-600 to-pink-600 hover:from-emerald-400 hover:to-pink-500 active:scale-95 text-white font-black text-base shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" /> PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
