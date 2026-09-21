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
  Apple
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

interface EmbeddedKnife {
  angle: number; // in radians relative to target
  color: string;
}

interface CyberApple {
  angle: number;
  hit: boolean;
}

interface FlyingKnife {
  y: number;
  speed: number;
  active: boolean;
}

export const CyberKnifeMaster3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Match State
  const [stage, setStage] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [apples, setApples] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_knife_high') || '0', 10);
  });
  const [knivesLeft, setKnivesLeft] = useState<number>(7);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isBossStage, setIsBossStage] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // 60 FPS Physics Engine Ref
  const engineRef = useRef<{
    targetAngle: number;
    targetSpeed: number;
    speedTimer: number;
    targetRadius: number;

    embeddedKnives: EmbeddedKnife[];
    apples: CyberApple[];
    flyingKnives: FlyingKnife[];

    isShattering: boolean;
    shatterProgress: number;
    shards: { x: number; y: number; vx: number; vy: number; rot: number; rotV: number; color: string; size: number }[];
    particles: { x: number; y: number; vx: number; vy: number; color: string; alpha: number; size: number }[];
    screenShake: number;
  }>({
    targetAngle: 0,
    targetSpeed: 0.035,
    speedTimer: 0,
    targetRadius: 90,

    embeddedKnives: [],
    apples: [],
    flyingKnives: [],

    isShattering: false,
    shatterProgress: 0,
    shards: [],
    particles: [],
    screenShake: 0,
  });

  // Setup Stage Target & Embedded Obstacles
  const setupStage = useCallback((stageNum: number) => {
    const eng = engineRef.current;
    const isBoss = stageNum % 5 === 0;
    setIsBossStage(isBoss);

    const totalKnives = isBoss ? 10 : 6 + Math.min(4, Math.floor(stageNum / 2));
    setKnivesLeft(totalKnives);

    eng.targetAngle = 0;
    eng.targetSpeed = 0.03 + Math.min(0.04, stageNum * 0.004);
    eng.speedTimer = 0;
    eng.isShattering = false;
    eng.shatterProgress = 0;
    eng.shards = [];
    eng.particles = [];
    eng.flyingKnives = [];

    // Spawn existing obstacle knives
    const embedded: EmbeddedKnife[] = [];
    const obstacleCount = isBoss ? 3 : Math.min(4, Math.floor(stageNum / 3));

    for (let i = 0; i < obstacleCount; i++) {
      embedded.push({
        angle: (Math.PI * 2 * i) / obstacleCount + (Math.random() - 0.5) * 0.4,
        color: '#f43f5e',
      });
    }
    eng.embeddedKnives = embedded;

    // Spawn bonus apples
    const appleList: CyberApple[] = [];
    if (Math.random() < 0.6) {
      appleList.push({
        angle: Math.random() * Math.PI * 2,
        hit: false,
      });
    }
    eng.apples = appleList;
  }, []);

  // Initialize First Stage
  useEffect(() => {
    setupStage(1);
  }, [setupStage]);

  // Throw Knife
  const throwKnife = () => {
    const eng = engineRef.current;
    if (knivesLeft <= 0 || eng.isShattering || isGameOver) return;
    if (eng.flyingKnives.some((k) => k.active)) return; // Wait for active throw

    sound.playLaser();
    setKnivesLeft((prev) => prev - 1);

    eng.flyingKnives.push({
      y: 640,
      speed: 34,
      active: true,
    });
  };

  // Complete Stage & Shatter Target
  const completeStage = useCallback(() => {
    const eng = engineRef.current;
    eng.isShattering = true;
    sound.playWin();

    if (isBossStage) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.4 } });
    }

    // Generate Target Shards Explosion
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18;
      eng.shards.push({
        x: 270 + Math.cos(angle) * 40,
        y: 260 + Math.sin(angle) * 40,
        vx: Math.cos(angle) * (6 + Math.random() * 8),
        vy: Math.sin(angle) * (6 + Math.random() * 8),
        rot: 0,
        rotV: (Math.random() - 0.5) * 0.3,
        color: isBossStage ? '#f43f5e' : '#00f0ff',
        size: 16 + Math.random() * 12,
      });
    }

    setTimeout(() => {
      const nextStage = stage + 1;
      setStage(nextStage);
      setupStage(nextStage);
    }, 1100);
  }, [isBossStage, setupStage, stage]);

  // Restart Match
  const restartMatch = () => {
    sound.playClick();
    setStage(1);
    setScore(0);
    setIsGameOver(false);
    setupStage(1);
  };

  // 60 FPS Physics & Knife Hit Simulation Loop
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
      const targetCenterX = 270;
      const targetCenterY = 260;

      // ==========================================
      // 1. BACKGROUND & SCREEN SHAKE
      // ==========================================
      ctx.save();
      if (eng.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * eng.screenShake, (Math.random() - 0.5) * eng.screenShake);
        eng.screenShake *= 0.85;
        if (eng.screenShake < 0.5) eng.screenShake = 0;
      }

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);

      // Dark Neon Gradient Horizon
      const bgGrad = ctx.createRadialGradient(targetCenterX, targetCenterY, 20, targetCenterX, targetCenterY, 320);
      bgGrad.addColorStop(0, '#100b2e');
      bgGrad.addColorStop(0.6, '#060417');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // ==========================================
      // 2. ROTATION PHYSICS (DYNAMIC SPEED & REVERSALS)
      // ==========================================
      if (!eng.isShattering && !isGameOver) {
        eng.speedTimer++;
        // Periodic speed spikes & direction flips
        if (eng.speedTimer % 180 === 0) {
          eng.targetSpeed = (Math.random() < 0.4 ? -1 : 1) * (0.03 + Math.random() * 0.04);
        }
        eng.targetAngle += eng.targetSpeed;
      }

      // ==========================================
      // 3. FLYING KNIVES PHYSICS & COLLISION
      // ==========================================
      eng.flyingKnives.forEach((fk) => {
        if (!fk.active) return;
        fk.y -= fk.speed;

        // Check Target Collision Rim
        if (fk.y <= targetCenterY + eng.targetRadius) {
          fk.active = false;

          // Calculate Hit Angle on the Target (relative to target's current rotation)
          // Since knife hits directly at the bottom (angle = +Math.PI / 2)
          let hitAngle = Math.PI / 2 - eng.targetAngle;
          while (hitAngle < 0) hitAngle += Math.PI * 2;
          while (hitAngle >= Math.PI * 2) hitAngle -= Math.PI * 2;

          // Check Clashing with Existing Embedded Knives
          const minAngleDistance = 0.22; // approx 12 degrees
          let hasClashed = false;

          for (const ek of eng.embeddedKnives) {
            let diff = Math.abs(ek.angle - hitAngle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff < minAngleDistance) {
              hasClashed = true;
              break;
            }
          }

          if (hasClashed) {
            // CLASH KNIFE -> GAME OVER!
            sound.playExplosion();
            eng.screenShake = 14;
            setIsGameOver(true);

            // Rebound Spark Particles
            for (let i = 0; i < 16; i++) {
              eng.particles.push({
                x: targetCenterX,
                y: targetCenterY + eng.targetRadius,
                vx: (Math.random() - 0.5) * 10,
                vy: 4 + Math.random() * 8,
                color: '#f43f5e',
                alpha: 1.0,
                size: 4 + Math.random() * 4,
              });
            }
          } else {
            // SUCCESSFUL EMBED!
            sound.playHit();
            eng.screenShake = 6;

            // Wood / Metal Impact Sparks
            for (let i = 0; i < 10; i++) {
              eng.particles.push({
                x: targetCenterX,
                y: targetCenterY + eng.targetRadius,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: '#00f0ff',
                alpha: 1.0,
                size: 3.5,
              });
            }

            eng.embeddedKnives.push({
              angle: hitAngle,
              color: '#00f0ff',
            });

            // Check Apple Slices
            eng.apples.forEach((apple) => {
              if (!apple.hit) {
                let diff = Math.abs(apple.angle - hitAngle);
                if (diff > Math.PI) diff = Math.PI * 2 - diff;
                if (diff < 0.28) {
                  apple.hit = true;
                  sound.playCollect();
                  setApples((prev) => prev + 1);
                }
              }
            });

            // Score Increment
            setScore((prev) => {
              const ns = prev + 1;
              if (ns > highScore) {
                setHighScore(ns);
                localStorage.setItem('cyber_knife_high', ns.toString());
              }
              return ns;
            });

            // Check Stage Clear (When all knives thrown successfully)
            if (knivesLeft <= 1) {
              completeStage();
            }
          }
        }
      });

      // Filter dead flying knives
      eng.flyingKnives = eng.flyingKnives.filter((k) => k.active || k.y > 0);

      // ==========================================
      // 4. DRAW ROTATING TARGET DISC & EMBEDDED KNIVES
      // ==========================================
      if (!eng.isShattering) {
        ctx.save();
        ctx.translate(targetCenterX, targetCenterY);
        ctx.rotate(eng.targetAngle);

        // Disc Body
        const discColor = isBossStage ? '#991b1b' : '#0f172a';
        const rimColor = isBossStage ? '#f43f5e' : '#00f0ff';

        ctx.fillStyle = discColor;
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = rimColor;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(0, 0, eng.targetRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner Dashed Rings
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, eng.targetRadius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Center Core
        ctx.fillStyle = rimColor;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();

        // Draw Embedded Apples
        eng.apples.forEach((ap) => {
          if (ap.hit) return;
          ctx.save();
          ctx.rotate(ap.angle);
          ctx.translate(0, eng.targetRadius);
          ctx.fillStyle = '#f43f5e';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-3, -3, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // Draw Embedded Knives
        eng.embeddedKnives.forEach((ek) => {
          ctx.save();
          ctx.rotate(ek.angle);
          ctx.translate(0, eng.targetRadius);

          // Blade Handle
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-4, 0, 8, 26);

          // Glowing Blade Body
          ctx.fillStyle = ek.color;
          ctx.shadowColor = ek.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(0, 48);
          ctx.lineTo(7, 0);
          ctx.lineTo(-7, 0);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        });

        ctx.restore();
      }

      // ==========================================
      // 5. DRAW SHATTERING SHARDS (STAGE WIN)
      // ==========================================
      if (eng.isShattering) {
        eng.shards.forEach((s) => {
          s.x += s.vx;
          s.y += s.vy;
          s.vy += 0.4; // gravity
          s.rot += s.rotV;

          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rot);
          ctx.fillStyle = s.color;
          ctx.shadowColor = s.color;
          ctx.shadowBlur = 12;
          ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
          ctx.restore();
        });
      }

      // ==========================================
      // 6. DRAW FLYING & READY KNIFE
      // ==========================================
      // Flying Knives
      eng.flyingKnives.forEach((fk) => {
        if (!fk.active) return;
        ctx.save();
        ctx.translate(targetCenterX, fk.y);

        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.lineTo(8, 0);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-4, 0, 8, 22);

        ctx.restore();
      });

      // Ready Knife at Bottom (when not throwing)
      if (knivesLeft > 0 && !eng.flyingKnives.some((k) => k.active) && !isGameOver && !eng.isShattering) {
        ctx.save();
        ctx.translate(targetCenterX, 640);

        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.lineTo(8, 0);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-4, 0, 8, 22);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

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

      ctx.restore(); // end screen shake
    };

    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [completeStage, isBossStage, isGameOver, knivesLeft]);

  return (
    <div
      ref={containerRef}
      id="cyber-knife-master-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1 sm:px-2 py-1"
    >
      {/* ========================================================================= */}
      {/* 1. TOP SCORE & STAGE HUD */}
      {/* ========================================================================= */}
      <div className="w-full mb-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl flex items-center justify-between">
        {/* Score */}
        <div className="text-left">
          <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">SCORE</div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono leading-none">{score}</div>
        </div>

        {/* Stage & Boss Indicator */}
        <div className="text-center font-mono">
          <div
            className={`text-xs sm:text-sm font-black uppercase ${
              isBossStage ? 'text-rose-400 animate-pulse' : 'text-white'
            }`}
          >
            {isBossStage ? '🔥 BOSS BATTLE' : `STAGE ${stage}`}
          </div>
          <div className="text-[10px] text-slate-400">🎯 {knivesLeft} KNIVES LEFT</div>
        </div>

        {/* Apples, High Score & Mute */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-rose-400 font-mono font-black text-xs sm:text-sm">
            <span>🍎</span>
            <span>{apples}</span>
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
      {/* 2. KNIFE HIT CANVAS ARENA */}
      {/* ========================================================================= */}
      <div
        onClick={throwKnife}
        className="relative w-full max-w-[460px] aspect-[540/780] max-h-[74vh] sm:max-h-[82vh] flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl border-2 border-cyan-500/40 bg-black cursor-pointer touch-none"
      >
        <canvas
          ref={canvasRef}
          width={540}
          height={780}
          className="w-full h-full object-contain block touch-none"
        />

        {/* Throw CTA Hint */}
        {!isGameOver && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-950/80 border border-slate-700 text-xs font-bold text-cyan-300 pointer-events-none">
            👆 Tap Anywhere to Throw Blade!
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
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">KNIFE CLASHED!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GAME OVER</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-white font-mono text-xl font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Stage Reached:</span>
                <span className="text-amber-300 font-mono text-base font-black">Stage {stage}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>All-Time Best:</span>
                <span className="text-cyan-300 font-mono text-base font-black">{highScore}</span>
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
