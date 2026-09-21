import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Award, Flame, Sparkles, Trophy, Timer, Zap } from 'lucide-react';
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

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotSpeed: number;
  inAir: boolean;
  scored: boolean;
  touchedRim: boolean;
  trail: { x: number; y: number; alpha: number }[];
}

export const CyberHoops: React.FC<Props> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [streak, setStreak] = useState(0);
  const [onFire, setOnFire] = useState(false);
  const [shotsTaken, setShotsTaken] = useState(0);
  const [shotsMade, setShotsMade] = useState(0);
  const [muted, setMuted] = useState(sound.isMuted());
  const [isNewHigh, setIsNewHigh] = useState(false);

  const engineRef = useRef({
    ball: {
      x: 180,
      y: 460,
      vx: 0,
      vy: 0,
      radius: 17,
      rotation: 0,
      rotSpeed: 0,
      inAir: false,
      scored: false,
      touchedRim: false,
      trail: [] as { x: number; y: number; alpha: number }[],
    } as Ball,
    // Hoop components
    hoop: {
      x: 640,
      y: 220,
      w: 64,
      rimH: 8,
      backboardX: 704,
      backboardY: 140,
      backboardW: 10,
      backboardH: 130,
      vx: 0,
      vy: 1.2,
      minY: 150,
      maxY: 320,
      netWave: 0,
    },
    drag: {
      isDragging: false,
      startX: 180,
      startY: 460,
      currX: 180,
      currY: 460,
    },
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    score: 0,
    highScore: 0,
    timeLeft: 60,
    streak: 0,
    shotsTaken: 0,
    shotsMade: 0,
    screenShake: 0,
  });

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('novaplay_cyberhoops_highscore');
    if (saved) {
      const val = parseInt(saved, 10);
      setHighScore(val);
      engineRef.current.highScore = val;
    }
  }, []);

  const addParticles = (x: number, y: number, color: string, count = 16, speedMul = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 5 + 1.5) * speedMul;
      engineRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: Math.random() * 4 + 2,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 25 + 15,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color = '#38bdf8') => {
    engineRef.current.floatingTexts.push({
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.6,
    });
  };

  const resetBall = useCallback(() => {
    // Randomize shooting spawn slightly for dynamic variety
    const spawnX = 140 + Math.random() * 90;
    const spawnY = 440 + Math.random() * 40;
    engineRef.current.ball = {
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      radius: 17,
      rotation: 0,
      rotSpeed: 0,
      inAir: false,
      scored: false,
      touchedRim: false,
      trail: [],
    };
    engineRef.current.drag.isDragging = false;
  }, []);

  const startNewGame = useCallback(() => {
    engineRef.current.score = 0;
    engineRef.current.timeLeft = 60;
    engineRef.current.streak = 0;
    engineRef.current.shotsTaken = 0;
    engineRef.current.shotsMade = 0;
    engineRef.current.particles = [];
    engineRef.current.floatingTexts = [];
    setScore(0);
    setTimeLeft(60);
    setStreak(0);
    setOnFire(false);
    setShotsTaken(0);
    setShotsMade(0);
    setIsNewHigh(false);

    resetBall();
    setGameState('playing');
    sound.playWhistle();
  }, [resetBall]);

  const handleGameOver = useCallback(() => {
    setGameState('gameover');
    sound.playGameOver();
    const finalScore = engineRef.current.score;
    if (finalScore > engineRef.current.highScore) {
      engineRef.current.highScore = finalScore;
      setHighScore(finalScore);
      localStorage.setItem('novaplay_cyberhoops_highscore', String(finalScore));
      setIsNewHigh(true);
      confetti({ particleCount: 90, spread: 80 });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [onGameOver]);

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      engineRef.current.timeLeft--;
      setTimeLeft(engineRef.current.timeLeft);
      if (engineRef.current.timeLeft <= 0) {
        clearInterval(interval);
        handleGameOver();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, handleGameOver]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const eng = engineRef.current;
      const b = eng.ball;
      const h = eng.hoop;

      // Screen Shake
      if (eng.screenShake > 0) eng.screenShake -= 0.5;

      ctx.save();
      if (eng.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * eng.screenShake, (Math.random() - 0.5) * eng.screenShake);
      }

      // Arena Background
      ctx.fillStyle = '#060a13';
      ctx.fillRect(0, 0, 800, 600);

      // Cyber Court Floor & Grid
      const courtGradient = ctx.createLinearGradient(0, 480, 0, 600);
      courtGradient.addColorStop(0, '#0f172a');
      courtGradient.addColorStop(1, '#020617');
      ctx.fillStyle = courtGradient;
      ctx.fillRect(0, 480, 800, 120);

      // Neon Court markings
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 480);
      ctx.lineTo(800, 480);
      ctx.stroke();

      // Free throw arc & 3-point neon line
      ctx.beginPath();
      ctx.ellipse(650, 480, 240, 70, 0, 0, Math.PI);
      ctx.stroke();

      // Moving Hoop on Streaks
      if (gameState === 'playing' && eng.streak >= 2) {
        h.y += h.vy;
        if (h.y < h.minY || h.y > h.maxY) h.vy *= -1;
      }

      // Physics Calculation
      if (gameState === 'playing' && b.inAir) {
        // Gravity & Air Drag
        b.vy += 0.38;
        b.vx *= 0.996;
        b.x += b.vx;
        b.y += b.vy;
        b.rotation += b.rotSpeed;

        // Trail recording
        b.trail.push({ x: b.x, y: b.y, alpha: 0.8 });
        if (b.trail.length > 10) b.trail.shift();

        // On-Fire flame particles
        if (eng.streak >= 3) {
          addParticles(b.x, b.y, '#f97316', 1, 0.4);
        }

        // Left Rim collision
        const leftRimX = h.x;
        const leftRimY = h.y;
        const distLeft = Math.hypot(b.x - leftRimX, b.y - leftRimY);
        if (distLeft < b.radius + 4) {
          b.touchedRim = true;
          sound.playHit();
          const angle = Math.atan2(b.y - leftRimY, b.x - leftRimX);
          b.vx = Math.cos(angle) * 6;
          b.vy = Math.sin(angle) * 6;
          addParticles(leftRimX, leftRimY, '#f59e0b', 4);
        }

        // Right Rim collision
        const rightRimX = h.x + h.w;
        const rightRimY = h.y;
        const distRight = Math.hypot(b.x - rightRimX, b.y - rightRimY);
        if (distRight < b.radius + 4) {
          b.touchedRim = true;
          sound.playHit();
          const angle = Math.atan2(b.y - rightRimY, b.x - rightRimX);
          b.vx = Math.cos(angle) * 6;
          b.vy = Math.sin(angle) * 6;
          addParticles(rightRimX, rightRimY, '#f59e0b', 4);
        }

        // Backboard collision
        if (
          b.x + b.radius >= h.backboardX &&
          b.x - b.radius <= h.backboardX + h.backboardW &&
          b.y >= h.backboardY &&
          b.y <= h.backboardY + h.backboardH
        ) {
          b.touchedRim = true;
          sound.playHit();
          b.vx = -Math.abs(b.vx) * 0.75;
          b.x = h.backboardX - b.radius;
          addParticles(b.x, b.y, '#38bdf8', 6);
        }

        // Net Scoring Detection (passing through hoop downwards)
        if (
          !b.scored &&
          b.vy > 0 &&
          b.y >= h.y &&
          b.y <= h.y + 24 &&
          b.x > h.x + 8 &&
          b.x < h.x + h.w - 8
        ) {
          b.scored = true;
          eng.shotsMade++;
          setShotsMade(eng.shotsMade);
          eng.streak++;
          setStreak(eng.streak);
          h.netWave = 14;

          const isSwish = !b.touchedRim;
          const streakMultiplier = eng.streak >= 3 ? 3 : eng.streak >= 2 ? 2 : 1;
          const basePoints = isSwish ? 300 : 200;
          const pointsEarned = basePoints * streakMultiplier;

          eng.score += pointsEarned;
          setScore(eng.score);

          // Extra time reward for swish & high streak
          if (isSwish) {
            eng.timeLeft = Math.min(eng.timeLeft + 3, 99);
            setTimeLeft(eng.timeLeft);
            addFloatingText(h.x + h.w / 2, h.y - 20, `🔥 SWISH! +${pointsEarned}`, '#f59e0b');
            sound.playSwish();
          } else {
            addFloatingText(h.x + h.w / 2, h.y - 20, `+${pointsEarned}`, '#38bdf8');
            sound.playSwish();
          }

          if (eng.streak >= 3) {
            setOnFire(true);
            addFloatingText(h.x + h.w / 2, h.y - 45, '🔥 ON FIRE! 3X', '#ef4444');
          }

          sound.playCollect();
          addParticles(h.x + h.w / 2, h.y + 10, isSwish ? '#f59e0b' : '#38bdf8', 24, 1.8);
          eng.screenShake = 5;
        }

        // Ball out of bounds or floor bounce
        if (b.y > 540) {
          b.vy = -b.vy * 0.45;
          b.y = 540;
          if (Math.abs(b.vy) < 1.5) {
            // Reset shot
            if (!b.scored) {
              eng.streak = 0;
              setStreak(0);
              setOnFire(false);
            }
            setTimeout(resetBall, 200);
          }
        }
        if (b.x > 820 || b.x < -20) {
          if (!b.scored) {
            eng.streak = 0;
            setStreak(0);
            setOnFire(false);
          }
          resetBall();
        }
      }

      // Net wave relaxation
      if (h.netWave > 0) h.netWave -= 0.6;

      // DRAW BACKBOARD & HOOP
      // Backboard structure
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(h.backboardX, h.backboardY, h.backboardW, h.backboardH, 4);
      ctx.fill();
      ctx.stroke();

      // Backboard target inner square
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.strokeRect(h.backboardX - 1, h.y - 35, h.backboardW + 2, 40);

      // Support pole
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(h.backboardX + h.backboardW, h.backboardY + 30, 40, 8);
      ctx.fillRect(h.backboardX + h.backboardW + 35, h.backboardY + 30, 10, 400);

      // Rim (Orange glowing cylinder)
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(h.x + h.w / 2, h.y, h.w / 2, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Mesh Net with dynamic wave
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.5;
      const netSegments = 6;
      for (let i = 0; i <= netSegments; i++) {
        const topX = h.x + (i / netSegments) * h.w;
        const botX = h.x + 12 + (i / netSegments) * (h.w - 24) + Math.sin(h.netWave) * 3;
        ctx.beginPath();
        ctx.moveTo(topX, h.y);
        ctx.lineTo(botX, h.y + 45);
        ctx.stroke();
      }
      // Horizontal net rings
      for (let r = 1; r <= 3; r++) {
        const ringY = h.y + r * 12;
        const inset = r * 3;
        ctx.beginPath();
        ctx.ellipse(h.x + h.w / 2, ringY, h.w / 2 - inset, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // DRAW TRAJECTORY PREDICTION DOTTED LINE WHEN DRAGGING
      if (eng.drag.isDragging && !b.inAir) {
        const dx = eng.drag.startX - eng.drag.currX;
        const dy = eng.drag.startY - eng.drag.currY;
        const power = Math.min(Math.hypot(dx, dy) * 0.18, 22);
        const angle = Math.atan2(dy, dx);

        const simVx = Math.cos(angle) * power;
        const simVy = Math.sin(angle) * power;

        ctx.fillStyle = eng.streak >= 3 ? '#f97316' : '#22d3ee';
        let simX = b.x;
        let simY = b.y;
        let currentVy = simVy;

        for (let step = 0; step < 26; step++) {
          simX += simVx;
          currentVy += 0.38;
          simY += currentVy;

          if (step % 2 === 0) {
            ctx.beginPath();
            ctx.arc(simX, simY, Math.max(1.5, 4.5 - step * 0.12), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Drag sling arrow / power indicator
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(eng.drag.currX, eng.drag.currY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // DRAW BALL TRAILS
      b.trail.forEach((t, idx) => {
        ctx.fillStyle = eng.streak >= 3
          ? `rgba(249, 115, 22, ${t.alpha * (idx / b.trail.length)})`
          : `rgba(6, 182, 212, ${t.alpha * (idx / b.trail.length)})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, b.radius * (idx / b.trail.length), 0, Math.PI * 2);
        ctx.fill();
      });

      // DRAW BASKETBALL
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation);

      ctx.shadowColor = eng.streak >= 3 ? '#f97316' : '#06b6d4';
      ctx.shadowBlur = eng.streak >= 3 ? 20 : 12;

      // Ball sphere gradient
      const ballGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, b.radius);
      if (eng.streak >= 3) {
        ballGrad.addColorStop(0, '#fef08a');
        ballGrad.addColorStop(0.5, '#f97316');
        ballGrad.addColorStop(1, '#c2410c');
      } else {
        ballGrad.addColorStop(0, '#ffedd5');
        ballGrad.addColorStop(0.4, '#ea580c');
        ballGrad.addColorStop(1, '#9a3412');
      }

      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Basketball Rib Seams
      ctx.strokeStyle = '#431407';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-b.radius, 0);
      ctx.lineTo(b.radius, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, b.radius * 0.6, b.radius, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
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

        if (pt.life >= pt.maxLife) eng.particles.splice(i, 1);
      }

      // FLOATING TEXTS
      for (let i = eng.floatingTexts.length - 1; i >= 0; i--) {
        const ft = eng.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.018;

        ctx.font = 'black 16px sans-serif';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;

        if (ft.alpha <= 0) eng.floatingTexts.splice(i, 1);
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, resetBall]);

  // Pointer drag & shoot controls
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const b = engineRef.current.ball;
    if (!b.inAir) {
      engineRef.current.drag = {
        isDragging: true,
        startX: px,
        startY: py,
        currX: px,
        currY: py,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current.drag.isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;
    engineRef.current.drag.currX = (e.clientX - rect.left) * scaleX;
    engineRef.current.drag.currY = (e.clientY - rect.top) * scaleY;
  };

  const handlePointerUp = useCallback(() => {
    const d = engineRef.current.drag;
    const b = engineRef.current.ball;
    if (d.isDragging && !b.inAir) {
      d.isDragging = false;
      const dx = d.startX - d.currX;
      const dy = d.startY - d.currY;
      const dist = Math.hypot(dx, dy);

      if (dist > 15) {
        const power = Math.min(dist * 0.17, 22);
        const angle = Math.atan2(dy, dx);

        b.vx = Math.cos(angle) * power;
        b.vy = Math.sin(angle) * power;
        b.rotSpeed = (Math.random() - 0.5) * 0.2 + (b.vx > 0 ? 0.08 : -0.08);
        b.inAir = true;

        engineRef.current.shotsTaken++;
        setShotsTaken(engineRef.current.shotsTaken);
        sound.playJump();
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerUp]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center select-none">
      {/* Top HUD */}
      <div className="w-full mb-3 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-white backdrop-blur-sm">
        {/* Timer & Accuracy */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700">
            <Timer className="w-4 h-4 text-cyan-400" />
            <span className={`text-base font-black tabular-nums ${timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </div>

          {shotsTaken > 0 && (
            <div className="hidden sm:block text-xs font-semibold text-slate-400">
              ACC: <span className="text-emerald-400 font-bold">{Math.round((shotsMade / shotsTaken) * 100)}%</span>
            </div>
          )}
        </div>

        {/* Streak & Fire status */}
        <div className="flex items-center gap-2">
          {onFire ? (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/50 text-orange-400 text-xs font-black animate-pulse">
              <Flame className="w-4 h-4 fill-orange-400" /> ON FIRE 3X
            </div>
          ) : streak > 1 ? (
            <div className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold">
              {streak} STREAK
            </div>
          ) : null}
        </div>

        {/* Score & Sound */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Points</div>
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
      <div className="relative w-full aspect-[4/5] sm:aspect-[4/3] max-h-[74vh] sm:max-h-[82vh] rounded-2xl overflow-hidden border-2 border-slate-800 bg-[#060a13] shadow-2xl shadow-orange-950/20">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full touch-none block cursor-crosshair"
        />

        {/* Start / Idle Screen */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4 animate-bounce">
              <Flame className="w-9 h-9 text-slate-950" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wide mb-2">
              CYBER HOOPS <span className="text-orange-400">STREET DUNK</span>
            </h2>
            <p className="text-slate-300 text-sm max-w-md mb-6 leading-relaxed">
              Drag and release to arc high-precision swish shots! Chain consecutive baskets to trigger ON FIRE score multipliers.
            </p>
            <button
              onClick={startNewGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-base flex items-center gap-2 shadow-xl shadow-orange-500/25 transition-all transform hover:scale-105"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START SHOOTOUT</span>
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center mb-3">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-1">BUZZER BEATER!</h2>
            <p className="text-slate-400 text-xs mb-4">Time expired for this round.</p>

            <div className="grid grid-cols-2 gap-3 my-2 w-full max-w-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Points</div>
                <div className="text-2xl font-black text-cyan-400 tabular-nums">{score}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold flex items-center justify-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" /> Best Score
                </div>
                <div className="text-2xl font-black text-amber-400 tabular-nums">{highScore}</div>
              </div>
            </div>

            <div className="text-xs text-slate-400 mb-4">
              Baskets Made: <span className="text-white font-bold">{shotsMade} / {shotsTaken}</span>
            </div>

            {isNewHigh && (
              <div className="mb-4 text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-400/50 px-3 py-1 rounded-full animate-bounce">
                🎉 NEW COURT HIGH SCORE!
              </div>
            )}

            <button
              onClick={startNewGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-base flex items-center gap-2 shadow-xl shadow-orange-500/25 transition-all transform hover:scale-105"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
