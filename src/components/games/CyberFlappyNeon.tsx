import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Award,
  Crown,
  Sparkles,
  Zap,
  Shield,
  Flame,
  Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface LaserGate {
  x: number;
  gapY: number;
  gapSize: number;
  passed: boolean;
  color: string;
  movingSpeed: number;
  moveRange: number;
  baseGapY: number;
  movePhase: number;
}

interface Orb {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  pulse: number;
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

const GATE_COLORS = ['#00f0ff', '#f43f5e', '#a855f7', '#facc15', '#10b981'];

export const CyberFlappyNeon: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Match State
  const [stage, setStage] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_flappy_high') || '0', 10);
  });
  const [shieldActive, setShieldActive] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // 60 FPS Physics Engine Ref
  const engineRef = useRef<{
    droneX: number;
    droneY: number;
    droneVy: number;
    droneAngle: number;
    gravity: number;
    jumpForce: number;
    rotorAngle: number;

    gates: LaserGate[];
    orbs: Orb[];
    particles: Particle[];

    hasShield: boolean;
    nextGateDist: number;
    gameSpeed: number;
    cityOffset: number;
    gridOffset: number;
    lastFrameTime: number;
  }>({
    droneX: 120,
    droneY: 300,
    droneVy: 0,
    droneAngle: 0,
    gravity: 0.48,
    jumpForce: -7.8,
    rotorAngle: 0,

    gates: [],
    orbs: [],
    particles: [],

    hasShield: false,
    nextGateDist: 0,
    gameSpeed: 3.2,
    cityOffset: 0,
    gridOffset: 0,
    lastFrameTime: performance.now(),
  });

  // Spawn Laser Gate
  const spawnGate = (xPos: number) => {
    const eng = engineRef.current;
    const minGapY = 140;
    const maxGapY = 460;
    const baseGapY = minGapY + Math.random() * (maxGapY - minGapY);
    const gapSize = Math.max(140, 185 - Math.min(score * 1.5, 45));
    const isMoving = score > 6 && Math.random() < 0.5;

    eng.gates.push({
      x: xPos,
      gapY: baseGapY,
      baseGapY,
      gapSize,
      passed: false,
      color: GATE_COLORS[Math.floor(Math.random() * GATE_COLORS.length)],
      movingSpeed: isMoving ? 0.03 + Math.random() * 0.02 : 0,
      moveRange: isMoving ? 40 + Math.random() * 40 : 0,
      movePhase: Math.random() * Math.PI * 2,
    });

    // Chance to spawn Cyber Energy Orb inside gap
    if (Math.random() < 0.4) {
      eng.orbs.push({
        x: xPos + 18,
        y: baseGapY,
        radius: 12,
        collected: false,
        pulse: 0,
      });
    }
  };

  // Trigger Drone Jet Thrust
  const handleFlap = useCallback(() => {
    if (stage === 'menu') {
      startGame();
      return;
    }
    if (stage === 'gameover') {
      return;
    }

    const eng = engineRef.current;
    eng.droneVy = eng.jumpForce;
    sound.playJump();

    // Spawn Jet Exhaust Particles
    for (let i = 0; i < 6; i++) {
      eng.particles.push({
        x: eng.droneX - 16,
        y: eng.droneY + 4,
        vx: -3 - Math.random() * 4,
        vy: (Math.random() - 0.5) * 3,
        size: 3 + Math.random() * 3,
        color: '#00f0ff',
        alpha: 1.0,
        life: 0.35,
        maxLife: 0.35,
      });
    }
  }, [stage]);

  // Start Game Action
  const startGame = () => {
    sound.playClick();
    const eng = engineRef.current;
    eng.droneX = 120;
    eng.droneY = 280;
    eng.droneVy = -4;
    eng.droneAngle = 0;
    eng.hasShield = false;
    eng.gameSpeed = 3.2;
    eng.gates = [];
    eng.orbs = [];
    eng.particles = [];
    eng.lastFrameTime = performance.now();

    // Initial gates
    spawnGate(540);
    spawnGate(820);
    spawnGate(1100);

    setScore(0);
    setShieldActive(false);
    setStage('playing');
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'KeyW', 'Enter'].includes(e.code)) {
        e.preventDefault();
        handleFlap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlap]);

  // 60 FPS Render & Physics Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const eng = engineRef.current;
      const now = performance.now();
      const dt = Math.min((now - eng.lastFrameTime) / 1000, 0.08);
      eng.lastFrameTime = now;

      const W = 540;
      const H = 720;

      // 1. UPDATE PHYSICS
      if (stage === 'playing') {
        eng.droneVy += eng.gravity;
        eng.droneY += eng.droneVy;
        eng.rotorAngle += dt * 35;
        eng.droneAngle = Math.max(-0.45, Math.min(0.65, eng.droneVy * 0.07));

        eng.cityOffset = (eng.cityOffset + eng.gameSpeed * 0.3) % W;
        eng.gridOffset = (eng.gridOffset + eng.gameSpeed * 1.5) % 40;

        // Ground / Ceiling Collision
        if (eng.droneY < 18) {
          eng.droneY = 18;
          eng.droneVy = 0;
        }
        if (eng.droneY > H - 45) {
          eng.droneY = H - 45;
          handleCrash();
        }

        // Update Laser Gates
        eng.gates.forEach((gate) => {
          gate.x -= eng.gameSpeed;
          if (gate.movingSpeed > 0) {
            gate.movePhase += gate.movingSpeed;
            gate.gapY = gate.baseGapY + Math.sin(gate.movePhase) * gate.moveRange;
          }

          // Check Score Pass
          if (!gate.passed && gate.x + 40 < eng.droneX) {
            gate.passed = true;
            sound.playScore();
            setScore((prev) => {
              const newScore = prev + 1;
              if (newScore > highScore) {
                setHighScore(newScore);
                localStorage.setItem('cyber_flappy_high', String(newScore));
              }
              return newScore;
            });

            // Increase speed slightly
            eng.gameSpeed = Math.min(5.5, 3.2 + score * 0.05);
          }

          // Collision Check with Laser Pylons
          const droneRadius = 14;
          const inGateX = eng.droneX + droneRadius > gate.x && eng.droneX - droneRadius < gate.x + 36;
          if (inGateX) {
            const topPylonBottom = gate.gapY - gate.gapSize / 2;
            const bottomPylonTop = gate.gapY + gate.gapSize / 2;

            if (eng.droneY - droneRadius < topPylonBottom || eng.droneY + droneRadius > bottomPylonTop) {
              if (eng.hasShield) {
                eng.hasShield = false;
                setShieldActive(false);
                sound.playLaser();
                gate.passed = true; // Protect from multiple hits on same gate
              } else {
                handleCrash();
              }
            }
          }
        });

        // Remove off-screen gates & spawn new ones
        eng.gates = eng.gates.filter((g) => g.x > -60);
        if (eng.gates.length < 3) {
          const lastGate = eng.gates[eng.gates.length - 1];
          const newX = lastGate ? lastGate.x + 280 : W + 200;
          spawnGate(newX);
        }

        // Update Orbs
        eng.orbs.forEach((orb) => {
          orb.x -= eng.gameSpeed;
          orb.pulse += dt * 4;

          if (!orb.collected && Math.hypot(eng.droneX - orb.x, eng.droneY - orb.y) < 24) {
            orb.collected = true;
            sound.playCollect();
            eng.hasShield = true;
            setShieldActive(true);
            setScore((prev) => prev + 2);
          }
        });
        eng.orbs = eng.orbs.filter((o) => o.x > -40 && !o.collected);

        // Update Particles
        for (let i = eng.particles.length - 1; i >= 0; i--) {
          const p = eng.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= dt;
          p.alpha = Math.max(0, p.life / p.maxLife);
          if (p.life <= 0) eng.particles.splice(i, 1);
        }
      }

      function handleCrash() {
        sound.playGameOver();
        setStage('gameover');
      }

      // =========================================================================
      // 2. DRAW 60 FPS GRAPHICS
      // =========================================================================
      ctx.clearRect(0, 0, W, H);

      // Deep Cyber Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, '#030712');
      skyGrad.addColorStop(0.5, '#090d1e');
      skyGrad.addColorStop(1, '#020617');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Distant Cyber Skyline (Parallax)
      ctx.fillStyle = '#0f172a';
      const buildingWidth = 60;
      for (let i = 0; i < 12; i++) {
        const bx = i * buildingWidth - (eng.cityOffset % buildingWidth);
        const bHeight = 160 + ((i * 47) % 180);
        ctx.fillRect(bx, H - 40 - bHeight, buildingWidth - 6, bHeight);

        // Neon windows
        ctx.fillStyle = '#00f0ff22';
        for (let wy = H - 30 - bHeight; wy < H - 50; wy += 22) {
          ctx.fillRect(bx + 8, wy, 8, 10);
          ctx.fillRect(bx + 26, wy, 8, 10);
        }
        ctx.fillStyle = '#0f172a';
      }

      // Floor Grid
      ctx.strokeStyle = '#00f0ff44';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, H - 40);
      ctx.lineTo(W, H - 40);
      ctx.stroke();

      for (let gx = -eng.gridOffset; gx < W; gx += 30) {
        ctx.beginPath();
        ctx.moveTo(gx, H - 40);
        ctx.lineTo(gx - 20, H);
        ctx.stroke();
      }

      // Draw Laser Gates
      eng.gates.forEach((gate) => {
        const topH = gate.gapY - gate.gapSize / 2;
        const botY = gate.gapY + gate.gapSize / 2;
        const botH = H - 40 - botY;

        // Top Pylon
        ctx.fillStyle = '#090d16';
        ctx.fillRect(gate.x, 0, 36, topH);
        ctx.strokeStyle = gate.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(gate.x, 0, 36, topH);

        // Top Emitter Tip
        ctx.fillStyle = gate.color;
        ctx.fillRect(gate.x + 4, topH - 12, 28, 12);

        // Bottom Pylon
        ctx.fillStyle = '#090d16';
        ctx.fillRect(gate.x, botY, 36, botH);
        ctx.strokeStyle = gate.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(gate.x, botY, 36, botH);

        // Bottom Emitter Tip
        ctx.fillStyle = gate.color;
        ctx.fillRect(gate.x + 4, botY, 28, 12);

        // Laser Beam Glow Inside Gap
        ctx.save();
        ctx.strokeStyle = `${gate.color}55`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(gate.x + 18, topH);
        ctx.lineTo(gate.x + 18, botY);
        ctx.stroke();
        ctx.restore();
      });

      // Draw Orbs
      eng.orbs.forEach((orb) => {
        const scale = 1 + Math.sin(orb.pulse) * 0.15;
        ctx.save();
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });

      // Draw Exhaust Particles
      eng.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Player Cyber Drone
      ctx.save();
      ctx.translate(eng.droneX, eng.droneY);
      ctx.rotate(eng.droneAngle);

      // Shield Aura
      if (eng.hasShield) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Drone Body
      ctx.fillStyle = '#0284c7';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cyber Visor Eye
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(4, -4, 10, 8);

      // Rotating Quad-Rotor Blades
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      const rL = Math.sin(eng.rotorAngle) * 14;
      ctx.beginPath();
      ctx.moveTo(-16 - rL, -14);
      ctx.lineTo(-16 + rL, -14);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(16 - rL, -14);
      ctx.lineTo(16 + rL, -14);
      ctx.stroke();

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [highScore, score, stage]);

  return (
    <div
      ref={containerRef}
      id="cyber-flappy-arena"
      className="relative w-full max-w-md mx-auto flex flex-col items-center select-none font-sans px-2 py-1 gap-2.5"
    >
      {/* ========================================================================= */}
      {/* 1. TOP SCORE & BEST HUD BAR (OUTSIDE CANVAS BOX)                          */}
      {/* ========================================================================= */}
      <div className="w-full p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl flex items-center justify-between">
        {/* Current Score */}
        <div className="text-left">
          <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">SCORE</div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono leading-none tracking-tight">
            {score}
          </div>
        </div>

        {/* Shield Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-700">
          <Shield className={`w-4 h-4 ${shieldActive ? 'text-cyan-400 animate-spin' : 'text-slate-600'}`} />
          <span className={`text-xs font-black uppercase font-mono ${shieldActive ? 'text-cyan-300' : 'text-slate-500'}`}>
            {shieldActive ? 'SHIELD ON' : 'NO SHIELD'}
          </span>
        </div>

        {/* Best Score & Mute */}
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
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-400 text-slate-300 transition-all cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 2D CANVAS ARENA                                                        */}
      {/* ========================================================================= */}
      <div
        onClick={handleFlap}
        className="relative w-full aspect-[540/720] max-h-[62vh] sm:max-h-[68vh] flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl border-2 border-cyan-500/40 bg-black cursor-pointer touch-none"
      >
        <canvas
          ref={canvasRef}
          width={540}
          height={720}
          className="w-full h-full object-contain block touch-none"
        />

        {/* Menu Overlay */}
        {stage === 'menu' && (
          <div className="absolute inset-0 z-20 bg-slate-950/92 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/30">
              <Zap className="w-9 h-9 text-cyan-400 animate-bounce" />
            </div>

            <div>
              <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">RETRO CYBER CITY</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-0.5">CYBER FLAPPY NEON</h2>
              <p className="text-xs text-slate-400 mt-1">Tap or press Space to pilot the cyber drone through laser pylons</p>
            </div>

            <button
              onClick={startGame}
              className="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 active:scale-95 text-white font-black text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" /> START FLIGHT
            </button>
          </div>
        )}

        {/* Game Over Modal */}
        {stage === 'gameover' && (
          <div className="absolute inset-0 z-20 bg-slate-950/92 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto shadow-xl shadow-rose-500/30">
              <Award className="w-9 h-9 text-rose-400 animate-bounce" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">DRONE DESTROYED!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GAME OVER</h2>
            </div>

            <div className="w-full max-w-xs p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-white font-mono text-xl font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Best Flight:</span>
                <span className="text-cyan-300 font-mono text-xl font-black">{highScore}</span>
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 active:scale-95 text-white font-black text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" /> RE-LAUNCH DRONE
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM CONTROLS HINT (OUTSIDE CANVAS BOX)                              */}
      {/* ========================================================================= */}
      <div className="text-xs font-bold text-slate-400 text-center">
        🎮 Tap screen or press [SPACEBAR / UP ARROW] to thrust cyber drone
      </div>
    </div>
  );
};
