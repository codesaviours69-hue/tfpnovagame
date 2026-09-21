import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  ShieldAlert,
  Flame,
  Award,
  Crown,
} from 'lucide-react';
import { sound } from '../../utils/audio';

// Blade Models & Skins
export interface BladeSkin {
  id: string;
  name: string;
  color: string;
  bladeGlow: string;
  handleColor: string;
  unlockedAtApples: number;
}

const BLADE_SKINS: BladeSkin[] = [
  { id: 'cyber-dagger', name: 'Cyber Dagger', color: '#00f0ff', bladeGlow: 'rgba(0, 240, 255, 0.8)', handleColor: '#0f172a', unlockedAtApples: 0 },
  { id: 'crimson-edge', name: 'Crimson Katana', color: '#ff0055', bladeGlow: 'rgba(255, 0, 85, 0.8)', handleColor: '#2b0512', unlockedAtApples: 15 },
  { id: 'emerald-fang', name: 'Emerald Fang', color: '#10b981', bladeGlow: 'rgba(16, 185, 129, 0.8)', handleColor: '#022c22', unlockedAtApples: 35 },
  { id: 'plasma-golden', name: 'Solaris Blade', color: '#fbbf24', bladeGlow: 'rgba(251, 191, 36, 0.8)', handleColor: '#451a03', unlockedAtApples: 60 },
  { id: 'void-scythe', name: 'Void Ripper', color: '#a855f7', bladeGlow: 'rgba(168, 85, 247, 0.8)', handleColor: '#3b0764', unlockedAtApples: 100 },
];

interface EmbeddedKnife {
  angle: number; // Angle relative to target rotation in radians
  skinId: string;
}

interface TargetApple {
  angle: number; // Angle in radians
  sliced: boolean;
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

export const KnifeHitNeon: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game Progress State
  const [stage, setStage] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [apples, setApples] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [knivesLeft, setKnivesLeft] = useState<number>(7);
  const [currentSkin, setCurrentSkin] = useState<BladeSkin>(BLADE_SKINS[0]);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'stageclear'>('start');
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [showShop, setShowShop] = useState<boolean>(false);

  // Core Physics & Target Engine State
  const targetRotationRef = useRef<number>(0);
  const targetSpeedRef = useRef<number>(0.035);
  const targetSpeedPatternRef = useRef<{ type: 'constant' | 'oscillate' | 'stutter'; timer: number }>({ type: 'constant', timer: 0 });
  const embeddedKnivesRef = useRef<EmbeddedKnife[]>([]);
  const targetApplesRef = useRef<TargetApple[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // Flying Knife State
  const flyingKnifeRef = useRef<{
    active: boolean;
    y: number;
    speed: number;
    skin: BladeSkin;
  }>({
    active: false,
    y: 0,
    speed: 38,
    skin: BLADE_SKINS[0],
  });

  // Target Wobble on Hit
  const targetHitScaleRef = useRef<number>(1);
  const targetFlashRef = useRef<number>(0);

  // Deflected Falling Knife on Defeat
  const deflectedKnifeRef = useRef<{
    active: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rot: number;
    vrot: number;
  }>({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    vrot: 0,
  });

  const animFrameRef = useRef<number | null>(null);

  // Load Saved Stats
  useEffect(() => {
    try {
      const savedHigh = localStorage.getItem('knife_hit_high');
      if (savedHigh) setHighScore(parseInt(savedHigh, 10));
      const savedApples = localStorage.getItem('knife_hit_apples');
      if (savedApples) setApples(parseInt(savedApples, 10));
    } catch {
      // ignore
    }
  }, []);

  const saveStats = (newScore: number, newApples: number) => {
    try {
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('knife_hit_high', String(newScore));
      }
      localStorage.setItem('knife_hit_apples', String(newApples));
    } catch {
      // ignore
    }
  };

  // Setup Stage (Regular or Boss Stage every 5th level)
  const initStage = useCallback((stgNum: number) => {
    const isBoss = stgNum % 5 === 0;
    const requiredKnives = isBoss ? 9 : Math.min(6 + Math.floor(stgNum / 2), 11);
    setKnivesLeft(requiredKnives);

    // Initial pre-embedded obstacles
    const initialKnives: EmbeddedKnife[] = [];
    const preObstacleCount = isBoss ? 3 : Math.min(Math.floor(stgNum / 2), 4);
    for (let i = 0; i < preObstacleCount; i++) {
      const angle = (i * (Math.PI * 2)) / preObstacleCount + (Math.random() * 0.4 - 0.2);
      initialKnives.push({
        angle,
        skinId: 'cyber-dagger',
      });
    }
    embeddedKnivesRef.current = initialKnives;

    // Apples on target
    const newApples: TargetApple[] = [];
    const appleChance = isBoss ? 2 : Math.random() > 0.35 ? 1 : 0;
    for (let a = 0; a < appleChance; a++) {
      const appleAngle = Math.random() * Math.PI * 2;
      newApples.push({ angle: appleAngle, sliced: false });
    }
    targetApplesRef.current = newApples;

    // Movement speed & behaviors
    targetRotationRef.current = 0;
    const baseSpeed = 0.03 + Math.min(stgNum * 0.003, 0.035);
    targetSpeedRef.current = (Math.random() > 0.5 ? 1 : -1) * baseSpeed;

    if (stgNum >= 3) {
      const patterns: ('constant' | 'oscillate' | 'stutter')[] = ['constant', 'oscillate', 'stutter'];
      const chosen = patterns[Math.floor(Math.random() * patterns.length)];
      targetSpeedPatternRef.current = { type: chosen, timer: 0 };
    } else {
      targetSpeedPatternRef.current = { type: 'constant', timer: 0 };
    }

    flyingKnifeRef.current.active = false;
    deflectedKnifeRef.current.active = false;
  }, []);

  // Start New Game
  const startNewGame = () => {
    sound.playClick();
    setStage(1);
    setScore(0);
    setGameState('playing');
    initStage(1);
  };

  // Throw Knife Action
  const throwKnife = useCallback(() => {
    if (gameState !== 'playing' || flyingKnifeRef.current.active || deflectedKnifeRef.current.active) return;
    if (knivesLeft <= 0) return;

    sound.playKnifeThrow();
    flyingKnifeRef.current = {
      active: true,
      y: 440, // Base starting Y
      speed: 36,
      skin: currentSkin,
    };
    setKnivesLeft((k) => k - 1);
  }, [gameState, knivesLeft, currentSkin]);

  // Main Canvas & Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Dimensions
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const targetCenterY = 175;
      const targetRadius = 78;

      ctx.clearRect(0, 0, width, height);

      // 1. UPDATE TARGET ROTATION PATTERNS
      if (gameState === 'playing' || gameState === 'start') {
        const pattern = targetSpeedPatternRef.current;
        pattern.timer += dt;

        if (pattern.type === 'oscillate') {
          targetRotationRef.current += Math.sin(pattern.timer * 2.5) * 0.055;
        } else if (pattern.type === 'stutter') {
          if (Math.floor(pattern.timer * 3) % 2 === 0) {
            targetRotationRef.current += targetSpeedRef.current * 1.6;
          }
        } else {
          targetRotationRef.current += targetSpeedRef.current;
        }
      }

      // Smooth hit elasticity scale
      if (targetHitScaleRef.current > 1) {
        targetHitScaleRef.current = Math.max(1, targetHitScaleRef.current - dt * 2.5);
      }
      if (targetFlashRef.current > 0) {
        targetFlashRef.current = Math.max(0, targetFlashRef.current - dt * 4);
      }

      // 2. UPDATE FLYING KNIFE
      const flying = flyingKnifeRef.current;
      if (flying.active) {
        flying.y -= flying.speed;

        // Particle trail
        if (Math.random() > 0.2) {
          particlesRef.current.push({
            x: centerX + (Math.random() * 8 - 4),
            y: flying.y + 40,
            vx: (Math.random() - 0.5) * 20,
            vy: Math.random() * 30 + 10,
            size: Math.random() * 3.5 + 1.5,
            color: flying.skin.color,
            alpha: 0.8,
            life: 0,
            maxLife: 0.25,
          });
        }

        // Check Target Collision
        const tipY = flying.y;
        const targetBottomY = targetCenterY + targetRadius;

        if (tipY <= targetBottomY) {
          // Knife enters target at bottom: angle in target local space
          // Bottom of target in world space is angle = Math.PI / 2 (90 deg)
          const hitAngleWorld = Math.PI / 2;
          let hitAngleLocal = hitAngleWorld - targetRotationRef.current;
          // Normalize to [0, 2PI)
          hitAngleLocal = ((hitAngleLocal % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

          // CHECK COLLISION WITH EXISTING EMBEDDED KNIVES
          const minSafeAngle = 0.24; // approx ~14 degrees collision radius
          let isClash = false;

          for (const embedded of embeddedKnivesRef.current) {
            let diff = Math.abs(embedded.angle - hitAngleLocal);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;

            if (diff < minSafeAngle) {
              isClash = true;
              break;
            }
          }

          if (isClash) {
            // CLASH & DEFLECT GAME OVER
            flying.active = false;
            sound.playKnifeClash();
            setGameState('gameover');

            // Deflected knife physics
            deflectedKnifeRef.current = {
              active: true,
              x: centerX,
              y: targetBottomY + 10,
              vx: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 100),
              vy: 80 + Math.random() * 80,
              rot: 0,
              vrot: (Math.random() - 0.5) * 24,
            };

            // Clash spark explosion
            for (let i = 0; i < 28; i++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = Math.random() * 220 + 80;
              particlesRef.current.push({
                x: centerX,
                y: targetBottomY,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                size: Math.random() * 4 + 2,
                color: '#ff0055',
                alpha: 1,
                life: 0,
                maxLife: 0.5,
              });
            }
          } else {
            // SUCCESSFUL HIT
            flying.active = false;
            embeddedKnivesRef.current.push({
              angle: hitAngleLocal,
              skinId: flying.skin.id,
            });

            sound.playWoodThud();
            targetHitScaleRef.current = 1.07;
            targetFlashRef.current = 0.5;

            // Score increment
            setScore((s) => {
              const next = s + 1;
              saveStats(next, apples);
              return next;
            });

            // Wood / Cyber Splinters
            for (let i = 0; i < 14; i++) {
              const ang = (Math.random() - 0.5) * Math.PI;
              const spd = Math.random() * 150 + 50;
              particlesRef.current.push({
                x: centerX + (Math.random() * 10 - 5),
                y: targetBottomY,
                vx: Math.sin(ang) * spd,
                vy: Math.abs(Math.cos(ang)) * spd,
                size: Math.random() * 3 + 1.5,
                color: flying.skin.color,
                alpha: 1,
                life: 0,
                maxLife: 0.4,
              });
            }

            // CHECK APPLE SLICE
            for (const app of targetApplesRef.current) {
              if (!app.sliced) {
                let diff = Math.abs(app.angle - hitAngleLocal);
                if (diff > Math.PI) diff = Math.PI * 2 - diff;

                if (diff < 0.32) {
                  app.sliced = true;
                  sound.playAppleSlice();
                  setApples((a) => {
                    const nextA = a + 2;
                    saveStats(score + 1, nextA);
                    return nextA;
                  });

                  // Apple juice splash
                  for (let p = 0; p < 20; p++) {
                    const spd = Math.random() * 180 + 40;
                    const aAng = Math.random() * Math.PI * 2;
                    particlesRef.current.push({
                      x: centerX,
                      y: targetBottomY,
                      vx: Math.cos(aAng) * spd,
                      vy: Math.sin(aAng) * spd,
                      size: Math.random() * 4 + 2,
                      color: '#ef4444',
                      alpha: 1,
                      life: 0,
                      maxLife: 0.55,
                    });
                  }
                }
              }
            }

            // STAGE CLEAR CHECK
            if (knivesLeft <= 1) {
              // Level Solved!
              sound.playGoalCheer();
              setGameState('stageclear');
              confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.4 },
              });

              setTimeout(() => {
                setStage((st) => {
                  const nextSt = st + 1;
                  initStage(nextSt);
                  setGameState('playing');
                  return nextSt;
                });
              }, 700);
            }
          }
        }
      }

      // 3. UPDATE DEFLECTED KNIFE
      const defl = deflectedKnifeRef.current;
      if (defl.active) {
        defl.x += defl.vx * dt;
        defl.y += defl.vy * dt;
        defl.vy += 850 * dt; // Gravity
        defl.rot += defl.vrot * dt;
        if (defl.y > height + 100) defl.active = false;
      }

      // 4. UPDATE PARTICLES
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      // ----------------------------------------------------
      // DRAWING PASS
      // ----------------------------------------------------

      // A. Draw Cyber Grid Backdrop
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // B. Draw Spinning 3D Neon Target Core
      ctx.save();
      ctx.translate(centerX, targetCenterY);
      ctx.scale(targetHitScaleRef.current, targetHitScaleRef.current);
      ctx.rotate(targetRotationRef.current);

      const isBoss = stage % 5 === 0;

      // Outer Target Halo Glow
      const glowGrad = ctx.createRadialGradient(0, 0, targetRadius * 0.7, 0, 0, targetRadius * 1.35);
      glowGrad.addColorStop(0, isBoss ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 240, 255, 0.25)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, targetRadius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Main Outer Ring
      ctx.fillStyle = isBoss ? '#20050e' : '#0b1329';
      ctx.strokeStyle = isBoss ? '#ff0055' : '#00f0ff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, targetRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner Rotating Cyber Cog Lines
      ctx.strokeStyle = isBoss ? 'rgba(255, 0, 85, 0.35)' : 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const ang = (i * Math.PI * 2) / 12;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * (targetRadius - 16), Math.sin(ang) * (targetRadius - 16));
        ctx.lineTo(Math.cos(ang) * (targetRadius - 4), Math.sin(ang) * (targetRadius - 4));
        ctx.stroke();
      }

      // Center Core
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, targetRadius * 0.6);
      coreGrad.addColorStop(0, isBoss ? '#ff0055' : '#00f0ff');
      coreGrad.addColorStop(0.7, isBoss ? '#7f002b' : '#0369a1');
      coreGrad.addColorStop(1, '#020617');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, targetRadius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Boss / Core Emblem
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isBoss ? 'BOSS' : `LVL ${stage}`, 0, 0);

      // Hit Flash Overlay
      if (targetFlashRef.current > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${targetFlashRef.current})`;
        ctx.beginPath();
        ctx.arc(0, 0, targetRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // C. Draw Embedded Knives Sticking OUT of Target
      for (const k of embeddedKnivesRef.current) {
        ctx.save();
        ctx.rotate(k.angle);
        const skin = BLADE_SKINS.find((s) => s.id === k.skinId) || BLADE_SKINS[0];

        // Draw knife handle extending outwards
        ctx.translate(0, targetRadius);

        // Blade Tip embedded inside
        ctx.fillStyle = skin.color;
        ctx.shadowColor = skin.bladeGlow;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(0, 36);
        ctx.lineTo(5, 0);
        ctx.closePath();
        ctx.fill();

        // Handle
        ctx.shadowBlur = 0;
        ctx.fillStyle = skin.handleColor;
        ctx.fillRect(-4, 34, 8, 22);

        // Pommel Guard
        ctx.fillStyle = skin.color;
        ctx.fillRect(-7, 32, 14, 4);

        ctx.restore();
      }

      // D. Draw Apples on Target Perimeter
      for (const app of targetApplesRef.current) {
        if (!app.sliced) {
          ctx.save();
          ctx.rotate(app.angle);
          ctx.translate(0, targetRadius + 14);

          // Red glowing Apple
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();

          // Leaf
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.ellipse(3, -9, 4, 2.5, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }

      ctx.restore(); // Restore Target Matrix

      // E. Draw Flying Knife
      if (flying.active) {
        ctx.save();
        ctx.translate(centerX, flying.y);

        // Blade Glow
        ctx.fillStyle = flying.skin.color;
        ctx.shadowColor = flying.skin.bladeGlow;
        ctx.shadowBlur = 16;

        // Double-edged neon blade pointing UP
        ctx.beginPath();
        ctx.moveTo(0, 0); // Tip
        ctx.lineTo(7, 46);
        ctx.lineTo(0, 42);
        ctx.lineTo(-7, 46);
        ctx.closePath();
        ctx.fill();

        // Guard
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-10, 45, 20, 4);

        // Handle
        ctx.shadowBlur = 0;
        ctx.fillStyle = flying.skin.handleColor;
        ctx.fillRect(-5, 49, 10, 26);

        ctx.restore();
      }

      // F. Draw Deflected Knife (Spinning and falling)
      if (defl.active) {
        ctx.save();
        ctx.translate(defl.x, defl.y);
        ctx.rotate(defl.rot);

        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = 'rgba(255, 0, 85, 0.9)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(7, 46);
        ctx.lineTo(-7, 46);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(-5, 46, 10, 24);

        ctx.restore();
      }

      // G. Draw Ready Knife at Bottom (When not flying)
      if (gameState === 'playing' && !flying.active && knivesLeft > 0) {
        ctx.save();
        ctx.translate(centerX, 440);

        ctx.fillStyle = currentSkin.color;
        ctx.shadowColor = currentSkin.bladeGlow;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(7, 46);
        ctx.lineTo(0, 42);
        ctx.lineTo(-7, 46);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-10, 45, 20, 4);

        ctx.shadowBlur = 0;
        ctx.fillStyle = currentSkin.handleColor;
        ctx.fillRect(-5, 49, 10, 26);

        ctx.restore();
      }

      // H. Draw Particles
      for (const p of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, stage, currentSkin, knivesLeft, apples, score]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center select-none">
      <div
        id="knife-hit-neon-container"
        className="relative w-full max-w-[560px] aspect-[4/3] sm:aspect-[16/11] max-h-[640px] min-h-[360px] sm:min-h-[480px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between items-center select-none font-sans mx-auto border-4 border-slate-900/90 touch-none"
        style={{
          backgroundColor: '#070b19',
          backgroundImage: 'radial-gradient(circle at 50% 30%, #111e3b 0%, #050813 100%)',
        }}
      >
      {/* 1. TOP STATS BAR */}
      <div className="relative w-full px-6 pt-4 flex items-center justify-between z-30 pointer-events-auto">
        {/* Stage Indicator */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-slate-900/80 border border-cyan-500/40 text-cyan-300 text-xs font-black flex items-center gap-1.5 shadow-md">
            {stage % 5 === 0 ? <Crown className="w-3.5 h-3.5 text-red-400" /> : <Flame className="w-3.5 h-3.5 text-amber-400" />}
            <span>STAGE {stage}</span>
          </div>

          {/* Sliced Apples Counter */}
          <div className="px-3 py-1 rounded-xl bg-slate-900/80 border border-red-500/40 text-red-300 text-xs font-black flex items-center gap-1.5 shadow-md">
            <span className="text-sm">🍎</span>
            <span>{apples}</span>
          </div>
        </div>

        {/* Current Score */}
        <div className="text-center">
          <span className="text-3xl sm:text-4xl font-black text-white tracking-wider drop-shadow-[0_0_12px_rgba(0,240,255,0.7)]">
            {score}
          </span>
        </div>

        {/* Skin Arsenal & Sound Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playClick();
              setShowShop(true);
            }}
            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-400/50 text-white text-xs font-black flex items-center gap-1 active:scale-95 transition-all shadow-md cursor-pointer"
            title="Blade Arsenal"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>BLADES</span>
          </button>

          <button
            onClick={() => {
              const isM = sound.toggleMute();
              setMuted(isM);
            }}
            className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white active:scale-95 cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. KNIVES REMAINING HUD ON LEFT */}
      <div className="absolute left-6 bottom-16 flex flex-col gap-1.5 z-30 pointer-events-none">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-6 rounded-sm transition-all duration-200 ${
              i < knivesLeft
                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)] scale-100'
                : 'bg-slate-800/60 scale-75 opacity-30'
            }`}
          />
        ))}
      </div>

      {/* 3. MAIN INTERACTIVE CANVAS (TAP ANYWHERE TO THROW) */}
      <canvas
        ref={canvasRef}
        width={560}
        height={540}
        onPointerDown={(e) => {
          e.preventDefault();
          throwKnife();
        }}
        className="w-full h-full cursor-pointer z-10 touch-none"
      />

      {/* 4. TAP TO THROW HINT (When Playing) */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 text-slate-400 text-xs font-bold tracking-widest uppercase pointer-events-none animate-pulse">
          TAP ANYWHERE TO THROW
        </div>
      )}

      {/* 5. START OVERLAY */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-40 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/40 border border-cyan-300 mb-3">
            <Zap className="w-9 h-9 text-slate-950" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wider drop-shadow-md">
            KNIFE HIT: NEON
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xs mt-1">
            Throw blades into the spinning core without hitting existing knives. Slice apples for unlocks!
          </p>

          <button
            onClick={startNewGame}
            className="mt-6 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-cyan-500/30 active:scale-95 transition-all cursor-pointer"
          >
            START GAME
          </button>
        </div>
      )}

      {/* 6. GAME OVER OVERLAY */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-700 flex items-center justify-center shadow-2xl shadow-rose-500/40 border border-rose-400 mb-2">
            <ShieldAlert className="w-9 h-9 text-white" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white">KNIFE CLASH!</h2>
          <p className="text-xs text-rose-300 font-bold uppercase tracking-widest mt-0.5">GAME OVER</p>

          <div className="flex gap-6 my-4">
            <div className="bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-bold">SCORE</span>
              <span className="text-2xl font-black text-cyan-400">{score}</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-bold">STAGE</span>
              <span className="text-2xl font-black text-amber-400">{stage}</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-bold">BEST</span>
              <span className="text-2xl font-black text-emerald-400">{highScore}</span>
            </div>
          </div>

          <button
            onClick={startNewGame}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/30 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>
        </div>
      )}

      {/* 7. BLADE ARSENAL SHOP MODAL */}
      {showShop && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-black text-white">BLADE ARSENAL</h3>
              </div>
              <button
                onClick={() => setShowShop(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-bold">Total Apples Sliced:</span>
              <span className="text-red-400 font-black flex items-center gap-1 text-sm">
                <span>🍎</span> {apples}
              </span>
            </div>

            {/* Skins Grid */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {BLADE_SKINS.map((skin) => {
                const isUnlocked = apples >= skin.unlockedAtApples;
                const isSelected = currentSkin.id === skin.id;

                return (
                  <div
                    key={skin.id}
                    onClick={() => {
                      if (isUnlocked) {
                        setCurrentSkin(skin);
                        sound.playClick();
                      }
                    }}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/20'
                        : isUnlocked
                        ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 cursor-pointer'
                        : 'bg-slate-950/50 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Color Preview */}
                      <div
                        className="w-7 h-7 rounded-xl border flex items-center justify-center"
                        style={{
                          backgroundColor: skin.handleColor,
                          borderColor: skin.color,
                          boxShadow: `0 0 10px ${skin.bladeGlow}`,
                        }}
                      >
                        <div className="w-1.5 h-3 rounded-sm" style={{ backgroundColor: skin.color }} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">{skin.name}</h4>
                        <span className="text-[10px] text-slate-400">
                          {skin.unlockedAtApples === 0 ? 'Default Blade' : `Requires ${skin.unlockedAtApples} Apples`}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isSelected ? (
                        <span className="px-2.5 py-1 rounded-xl bg-purple-500 text-slate-950 text-[10px] font-black">
                          EQUIPPED
                        </span>
                      ) : isUnlocked ? (
                        <button className="px-2.5 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black">
                          EQUIP
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-bold">🔒 Locked</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};
