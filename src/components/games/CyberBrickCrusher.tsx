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
  FastForward,
  Plus
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

const COLS = 7;
const ROWS = 9;

export interface Brick {
  id: number;
  r: number;
  c: number;
  hp: number;
  maxHp: number;
  type: 'normal' | 'bomb' | 'laser-h' | 'plus-ball';
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  returned: boolean;
}

export const CyberBrickCrusher: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nextIdRef = useRef<number>(1);

  // Match State
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_brick_crusher_high') || '0', 10);
  });
  const [ballCount, setBallCount] = useState<number>(15);
  const [isShooting, setIsShooting] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // 60 FPS Physics Engine Ref
  const engineRef = useRef<{
    bricks: Brick[];
    balls: Ball[];
    launchX: number;
    launchY: number;
    nextLaunchX: number;
    aimAngle: number; // in radians
    aiming: boolean;
    ballsToSpawn: number;
    spawnTimer: number;
    ballsReturned: number;
    particles: { x: number; y: number; vx: number; vy: number; color: string; alpha: number; size: number }[];
    shockwaves: { x: number; y: number; radius: number; alpha: number; color: string }[];
  }>({
    bricks: [],
    balls: [],
    launchX: 270,
    launchY: 720,
    nextLaunchX: 270,
    aimAngle: -Math.PI / 2,
    aiming: false,
    ballsToSpawn: 0,
    spawnTimer: 0,
    ballsReturned: 0,
    particles: [],
    shockwaves: [],
  });

  // Spawn New Row of Bricks at Top (r = 1)
  const spawnBrickRow = useCallback((lvl: number, currentBricks: Brick[]): Brick[] => {
    const nextBricks = currentBricks.map((b) => ({ ...b, r: b.r + 1 }));
    const countToSpawn = 3 + Math.floor(Math.random() * 3);
    const availableCols = [0, 1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5);

    for (let i = 0; i < countToSpawn; i++) {
      const c = availableCols[i];
      const hp = Math.round(lvl * (1 + Math.random() * 0.8));
      const isSpecial = Math.random();

      let type: 'normal' | 'bomb' | 'laser-h' | 'plus-ball' = 'normal';
      if (isSpecial < 0.18) type = 'plus-ball';
      else if (isSpecial < 0.28) type = 'laser-h';
      else if (isSpecial < 0.38) type = 'bomb';

      nextBricks.push({
        id: nextIdRef.current++,
        r: 1,
        c,
        hp: type === 'plus-ball' ? 1 : hp,
        maxHp: type === 'plus-ball' ? 1 : hp,
        type,
      });
    }
    return nextBricks;
  }, []);

  // Initialize Match
  useEffect(() => {
    const initialBricks = spawnBrickRow(1, []);
    engineRef.current.bricks = spawnBrickRow(2, initialBricks);
  }, [spawnBrickRow]);

  // Launch All Balls in Stream
  const launchBalls = () => {
    const eng = engineRef.current;
    if (eng.ballsToSpawn > 0 || isShooting || isGameOver) return;

    sound.playLaser();
    setIsShooting(true);
    eng.ballsToSpawn = ballCount;
    eng.spawnTimer = 0;
    eng.ballsReturned = 0;
    eng.nextLaunchX = eng.launchX;
    eng.balls = [];
  };

  // Instant Recall Remaining Balls
  const recallBalls = () => {
    const eng = engineRef.current;
    if (!isShooting) return;

    eng.ballsToSpawn = 0;
    eng.balls.forEach((b) => {
      b.active = false;
      b.returned = true;
    });
  };

  // Process Turn End when all balls land
  const finishTurn = useCallback(() => {
    const eng = engineRef.current;
    setIsShooting(false);
    eng.launchX = eng.nextLaunchX;

    // Check Game Over (if any brick touched floor row >= 8)
    const hasBreached = eng.bricks.some((b) => b.r >= 8);
    if (hasBreached) {
      setIsGameOver(true);
      sound.playGameOver();
      return;
    }

    // Step down and spawn new row
    const nextLvl = level + 1;
    setLevel(nextLvl);
    eng.bricks = spawnBrickRow(nextLvl, eng.bricks);
  }, [level, spawnBrickRow]);

  // Restart Match
  const restartMatch = () => {
    sound.playClick();
    const eng = engineRef.current;
    eng.bricks = [];
    eng.balls = [];
    eng.launchX = 270;
    eng.launchY = 720;
    eng.nextLaunchX = 270;
    eng.aiming = false;
    eng.ballsToSpawn = 0;
    eng.ballsReturned = 0;
    eng.particles = [];
    eng.shockwaves = [];

    setLevel(1);
    setScore(0);
    setBallCount(15);
    setIsShooting(false);
    setIsGameOver(false);

    const b1 = spawnBrickRow(1, []);
    eng.bricks = spawnBrickRow(2, b1);
  };

  // Aim Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isShooting || isGameOver) return;
    engineRef.current.aiming = true;
    updateAimAngle(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!engineRef.current.aiming || isShooting || isGameOver) return;
    updateAimAngle(e);
  };

  const handlePointerUp = () => {
    if (!engineRef.current.aiming || isShooting || isGameOver) return;
    engineRef.current.aiming = false;
    launchBalls();
  };

  const updateAimAngle = (e: React.PointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 540 / rect.width;
    const scaleY = 780 / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const eng = engineRef.current;
    const dx = px - eng.launchX;
    const dy = py - eng.launchY;

    // Must aim upwards
    if (dy < -20) {
      eng.aimAngle = Math.atan2(dy, dx);
    }
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
      const speedMult = speedMultiplier;

      const leftWall = 25;
      const rightWall = 515;
      const topWall = 60;
      const floorY = 720;

      const cellW = (rightWall - leftWall) / COLS;
      const cellH = 48;

      // ==========================================
      // 1. BACKGROUND & CHAMBER
      // ==========================================
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);

      // Chamber Container
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.beginPath();
      ctx.roundRect(leftWall, topWall, rightWall - leftWall, floorY - topWall, 16);
      ctx.fill();

      // Glowing Neon Chamber Border
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Red Bottom Danger Line (Row 8)
      const dangerY = topWall + 7 * cellH;
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(leftWall + 10, dangerY);
      ctx.lineTo(rightWall - 10, dangerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // ==========================================
      // 2. BALL SPAWNING & PHYSICS UPDATE
      // ==========================================
      if (eng.ballsToSpawn > 0) {
        eng.spawnTimer += speedMult;
        if (eng.spawnTimer >= 4) {
          eng.spawnTimer = 0;
          eng.ballsToSpawn--;

          const speed = 14;
          eng.balls.push({
            x: eng.launchX,
            y: eng.launchY,
            vx: Math.cos(eng.aimAngle) * speed,
            vy: Math.sin(eng.aimAngle) * speed,
            active: true,
            returned: false,
          });
        }
      }

      // Update Balls
      let activeCount = 0;
      eng.balls.forEach((ball) => {
        if (!ball.active) return;
        activeCount++;

        for (let step = 0; step < speedMult; step++) {
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Wall Collisions
          if (ball.x - 7 < leftWall) {
            ball.x = leftWall + 7;
            ball.vx = -ball.vx;
          }
          if (ball.x + 7 > rightWall) {
            ball.x = rightWall - 7;
            ball.vx = -ball.vx;
          }
          if (ball.y - 7 < topWall) {
            ball.y = topWall + 7;
            ball.vy = -ball.vy;
          }

          // Floor Landing
          if (ball.y + 7 >= floorY) {
            ball.active = false;
            ball.returned = true;
            ball.y = floorY;
            if (eng.ballsReturned === 0) {
              eng.nextLaunchX = Math.max(leftWall + 30, Math.min(rightWall - 30, ball.x));
            }
            eng.ballsReturned++;
            break;
          }

          // Brick Collisions
          eng.bricks.forEach((brick) => {
            if (brick.hp <= 0) return;

            const bx = leftWall + brick.c * cellW + 3;
            const by = topWall + brick.r * cellH + 3;
            const bw = cellW - 6;
            const bh = cellH - 6;

            // Circle to Box AABB Check
            const closestX = Math.max(bx, Math.min(ball.x, bx + bw));
            const closestY = Math.max(by, Math.min(ball.y, by + bh));
            const dx = ball.x - closestX;
            const dy = ball.y - closestY;
            const dist = Math.hypot(dx, dy);

            if (dist < 7) {
              sound.playHit();
              brick.hp--;

              // Spark particles
              for (let p = 0; p < 4; p++) {
                eng.particles.push({
                  x: closestX,
                  y: closestY,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  color: '#00f0ff',
                  alpha: 1.0,
                  size: 3,
                });
              }

              // Normal Reflection
              if (Math.abs(dx) > Math.abs(dy)) {
                ball.vx = -ball.vx;
              } else {
                ball.vy = -ball.vy;
              }

              // Destroyed Brick Handling
              if (brick.hp <= 0) {
                sound.playCollect();
                setScore((prev) => {
                  const ns = prev + brick.maxHp * 10;
                  if (ns > highScore) {
                    setHighScore(ns);
                    localStorage.setItem('cyber_brick_crusher_high', ns.toString());
                  }
                  return ns;
                });

                if (brick.type === 'plus-ball') {
                  setBallCount((prev) => prev + 1);
                  sound.playWin();
                } else if (brick.type === 'bomb') {
                  // Area Bomb explosion
                  sound.playExplosion();
                  eng.bricks.forEach((ob) => {
                    if (Math.abs(ob.r - brick.r) <= 1 && Math.abs(ob.c - brick.c) <= 1) {
                      ob.hp -= Math.round(brick.maxHp * 0.7);
                    }
                  });
                } else if (brick.type === 'laser-h') {
                  // Laser Row Blast
                  sound.playLaser();
                  eng.bricks.forEach((ob) => {
                    if (ob.r === brick.r) ob.hp = 0;
                  });
                }
              }
            }
          });
        }
      });

      // Filter dead bricks
      eng.bricks = eng.bricks.filter((b) => b.hp > 0);

      // Check Turn Completion
      if (isShooting && eng.ballsToSpawn === 0 && activeCount === 0) {
        finishTurn();
      }

      // ==========================================
      // 3. DRAW BRICKS
      // ==========================================
      eng.bricks.forEach((brick) => {
        const bx = leftWall + brick.c * cellW + 3;
        const by = topWall + brick.r * cellH + 3;
        const bw = cellW - 6;
        const bh = cellH - 6;

        ctx.save();
        if (brick.type === 'plus-ball') {
          // Plus Ball Orb
          ctx.fillStyle = '#22c55e';
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(bx + bw / 2, by + bh / 2, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('+', bx + bw / 2, by + bh / 2 + 5);
        } else {
          // Color based on HP
          let color = '#38bdf8';
          if (brick.hp > 40) color = '#f43f5e';
          else if (brick.hp > 20) color = '#facc15';
          else if (brick.hp > 10) color = '#c084fc';

          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, bh, 8);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // HP Number
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(brick.hp.toString(), bx + bw / 2, by + bh / 2 + 5);
        }
        ctx.restore();
      });

      // ==========================================
      // 4. DRAW AIM TRAJECTORY GUIDELINE
      // ==========================================
      if (eng.aiming && !isShooting && !isGameOver) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(eng.launchX, eng.launchY);
        ctx.lineTo(
          eng.launchX + Math.cos(eng.aimAngle) * 260,
          eng.launchY + Math.sin(eng.aimAngle) * 260
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ==========================================
      // 5. DRAW BALLS & LAUNCH CANNON
      // ==========================================
      // Cannon on Floor
      ctx.save();
      ctx.translate(isShooting ? eng.nextLaunchX : eng.launchX, eng.launchY);
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#020617';
      ctx.font = '900 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`x${ballCount}`, 0, 4);
      ctx.restore();

      // Bouncing Laser Balls
      eng.balls.forEach((ball) => {
        if (!ball.active) return;
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ==========================================
      // 6. DRAW PARTICLES
      // ==========================================
      eng.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
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
  }, [finishTurn, isGameOver, isShooting, speedMultiplier]);

  return (
    <div
      ref={containerRef}
      id="cyber-brick-crusher-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1 sm:px-2 py-1"
    >
      {/* ========================================================================= */}
      {/* 1. TOP SCORE & BALLS HUD */}
      {/* ========================================================================= */}
      <div className="w-full mb-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl flex items-center justify-between">
        {/* Score */}
        <div className="text-left">
          <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">SCORE</div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono leading-none">{score}</div>
        </div>

        {/* Level & Balls */}
        <div className="text-center font-mono">
          <div className="text-[10px] uppercase font-bold text-slate-400">STAGE {level}</div>
          <div className="text-sm font-black text-amber-300">⚡ {ballCount} BALLS</div>
        </div>

        {/* High Score, Speed & Mute */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSpeedMultiplier((prev) => (prev === 1 ? 2 : 1))}
            className="px-2 py-1 rounded-xl bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-black"
          >
            {speedMultiplier}x
          </button>

          <div className="text-right ml-1">
            <div className="text-[9px] uppercase font-black text-amber-400 flex items-center justify-end gap-0.5">
              <Crown className="w-3 h-3 text-amber-400" /> BEST
            </div>
            <div className="text-sm font-black text-white font-mono leading-none">{highScore}</div>
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
      {/* 2. BRICK CRUSHER CANVAS ARENA */}
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

        {/* Aim Hint / Recall Button */}
        {!isShooting && !isGameOver && (
          <div className="absolute top-2 right-4 text-[10px] font-bold text-slate-400 pointer-events-none">
            👆 Drag to Aim, Release to Fire
          </div>
        )}

        {isShooting && (
          <button
            onClick={recallBalls}
            className="absolute bottom-4 right-4 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-400 text-cyan-300 text-xs font-black shadow-lg"
          >
            ⚡ RECALL
          </button>
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
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">BRICKS TOUCHED FLOOR!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GAME OVER</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-white font-mono text-xl font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Highest Stage:</span>
                <span className="text-amber-300 font-mono text-base font-black">Stage {level}</span>
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
