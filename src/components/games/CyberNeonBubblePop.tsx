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

const BUBBLE_RADIUS = 18;
const GRID_ROWS = 14;
const COLS_EVEN = 8;
const COLS_ODD = 7;

export type BubbleColor = 'cyan' | 'pink' | 'amber' | 'emerald' | 'purple';

const BUBBLE_COLORS: Record<BubbleColor, { main: string; dark: string; light: string }> = {
  cyan: { main: '#38bdf8', dark: '#0284c7', light: '#bae6fd' },
  pink: { main: '#f43f5e', dark: '#be123c', light: '#fecdd3' },
  amber: { main: '#facc15', dark: '#d97706', light: '#fef08a' },
  emerald: { main: '#34d399', dark: '#059669', light: '#a7f3d0' },
  purple: { main: '#c084fc', dark: '#9333ea', light: '#f3e8ff' },
};

const COLOR_KEYS: BubbleColor[] = ['cyan', 'pink', 'amber', 'emerald', 'purple'];

interface GridBubble {
  r: number;
  c: number;
  color: BubbleColor;
}

interface FallingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
}

export const CyberNeonBubblePop: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Match State
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_bubble_pop_high') || '0', 10);
  });
  const [currentBubble, setCurrentBubble] = useState<BubbleColor>('cyan');
  const [nextBubble, setNextBubble] = useState<BubbleColor>('pink');
  const [foulsLeft, setFoulsLeft] = useState<number>(5);
  const [isShooting, setIsShooting] = useState<boolean>(false);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // 60 FPS Physics Engine Ref
  const engineRef = useRef<{
    grid: (GridBubble | null)[][];
    aimAngle: number;
    aiming: boolean;

    bulletX: number;
    bulletY: number;
    bulletVx: number;
    bulletVy: number;
    bulletColor: BubbleColor;
    bulletActive: boolean;

    fallingBubbles: FallingBubble[];
    particles: { x: number; y: number; vx: number; vy: number; color: string; alpha: number; size: number }[];
  }>({
    grid: [],
    aimAngle: -Math.PI / 2,
    aiming: false,

    bulletX: 270,
    bulletY: 690,
    bulletVx: 0,
    bulletVy: 0,
    bulletColor: 'cyan',
    bulletActive: false,

    fallingBubbles: [],
    particles: [],
  });

  // Calculate Screen Position of Hexagonal Grid Socket (r, c)
  const getBubblePos = (r: number, c: number) => {
    const isOdd = r % 2 === 1;
    const startX = isOdd ? 48 : 28;
    const spacingX = BUBBLE_RADIUS * 2 + 2;
    const spacingY = BUBBLE_RADIUS * Math.sqrt(3) + 1;

    const x = startX + c * spacingX;
    const y = 80 + r * spacingY;
    return { x, y };
  };

  // Generate Initial Bubbles Grid (First 5 Rows)
  const createInitialGrid = useCallback((): (GridBubble | null)[][] => {
    const grid: (GridBubble | null)[][] = Array(GRID_ROWS)
      .fill(null)
      .map((_, r) => Array(r % 2 === 0 ? COLS_EVEN : COLS_ODD).fill(null));

    for (let r = 0; r < 5; r++) {
      const cols = r % 2 === 0 ? COLS_EVEN : COLS_ODD;
      for (let c = 0; c < cols; c++) {
        grid[r][c] = {
          r,
          c,
          color: COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)],
        };
      }
    }
    return grid;
  }, []);

  // Initialize Grid
  useEffect(() => {
    engineRef.current.grid = createInitialGrid();
  }, [createInitialGrid]);

  // Find Connected Bubbles of Same Color (BFS)
  const getSameColorCluster = (startR: number, startC: number, grid: (GridBubble | null)[][]): { r: number; c: number }[] => {
    const startBubble = grid[startR][startC];
    if (!startBubble) return [];

    const targetColor = startBubble.color;
    const visited = new Set<string>();
    const queue: { r: number; c: number }[] = [{ r: startR, c: startC }];
    const cluster: { r: number; c: number }[] = [];

    visited.add(`${startR},${startC}`);

    while (queue.length > 0) {
      const { r, c } = queue.shift()!;
      cluster.push({ r, c });

      // 6 Hexagonal Neighbors
      const isOdd = r % 2 === 1;
      const neighbors = isOdd
        ? [
            { r: r - 1, c: c },
            { r: r - 1, c: c + 1 },
            { r, c: c - 1 },
            { r, c: c + 1 },
            { r: r + 1, c: c },
            { r: r + 1, c: c + 1 },
          ]
        : [
            { r: r - 1, c: c - 1 },
            { r: r - 1, c: c },
            { r, c: c - 1 },
            { r, c: c + 1 },
            { r: r + 1, c: c - 1 },
            { r: r + 1, c: c },
          ];

      neighbors.forEach((n) => {
        if (
          n.r >= 0 &&
          n.r < GRID_ROWS &&
          n.c >= 0 &&
          n.c < (n.r % 2 === 0 ? COLS_EVEN : COLS_ODD)
        ) {
          const key = `${n.r},${n.c}`;
          if (!visited.has(key) && grid[n.r][n.c]?.color === targetColor) {
            visited.add(key);
            queue.push(n);
          }
        }
      });
    }

    return cluster;
  };

  // Find Floating Disconnected Bubbles (Not attached to ceiling)
  const dropFloatingBubbles = (grid: (GridBubble | null)[][]): FallingBubble[] => {
    const visited = new Set<string>();
    const queue: { r: number; c: number }[] = [];

    // All bubbles on ceiling row 0 are anchored
    for (let c = 0; c < COLS_EVEN; c++) {
      if (grid[0][c]) {
        visited.add(`0,${c}`);
        queue.push({ r: 0, c });
      }
    }

    // Traverse all reachable bubbles from ceiling
    while (queue.length > 0) {
      const { r, c } = queue.shift()!;
      const isOdd = r % 2 === 1;
      const neighbors = isOdd
        ? [
            { r: r - 1, c: c },
            { r: r - 1, c: c + 1 },
            { r, c: c - 1 },
            { r, c: c + 1 },
            { r: r + 1, c: c },
            { r: r + 1, c: c + 1 },
          ]
        : [
            { r: r - 1, c: c - 1 },
            { r: r - 1, c: c },
            { r, c: c - 1 },
            { r, c: c + 1 },
            { r: r + 1, c: c - 1 },
            { r: r + 1, c: c },
          ];

      neighbors.forEach((n) => {
        if (
          n.r >= 0 &&
          n.r < GRID_ROWS &&
          n.c >= 0 &&
          n.c < (n.r % 2 === 0 ? COLS_EVEN : COLS_ODD)
        ) {
          const key = `${n.r},${n.c}`;
          if (!visited.has(key) && grid[n.r][n.c] !== null) {
            visited.add(key);
            queue.push(n);
          }
        }
      });
    }

    // Any bubble not visited is floating -> detach & drop!
    const dropped: FallingBubble[] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      const cols = r % 2 === 0 ? COLS_EVEN : COLS_ODD;
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] && !visited.has(`${r},${c}`)) {
          const pos = getBubblePos(r, c);
          dropped.push({
            x: pos.x,
            y: pos.y,
            vx: (Math.random() - 0.5) * 4,
            vy: 2 + Math.random() * 3,
            color: grid[r][c]!.color,
          });
          grid[r][c] = null;
        }
      }
    }
    return dropped;
  };

  // Launch Bubble
  const shootBubble = () => {
    const eng = engineRef.current;
    if (eng.bulletActive || isShooting || isGameOver || isWon) return;

    sound.playLaser();
    setIsShooting(true);

    const speed = 22;
    eng.bulletX = 270;
    eng.bulletY = 690;
    eng.bulletVx = Math.cos(eng.aimAngle) * speed;
    eng.bulletVy = Math.sin(eng.aimAngle) * speed;
    eng.bulletColor = currentBubble;
    eng.bulletActive = true;
  };

  // Turn End & Next Bubble Rotation
  const rotateNextBubble = useCallback(
    (matched: boolean) => {
      const eng = engineRef.current;
      eng.bulletActive = false;
      setIsShooting(false);

      if (!matched) {
        setFoulsLeft((prev) => {
          const nf = prev - 1;
          if (nf <= 0) {
            // Drop ceiling penalty: shift all rows down!
            const newGrid: (GridBubble | null)[][] = Array(GRID_ROWS)
              .fill(null)
              .map((_, r) => Array(r % 2 === 0 ? COLS_EVEN : COLS_ODD).fill(null));

            for (let r = 0; r < GRID_ROWS - 1; r++) {
              const cols = r % 2 === 0 ? COLS_EVEN : COLS_ODD;
              for (let c = 0; c < cols; c++) {
                if (eng.grid[r][c]) {
                  newGrid[r + 1][c] = { ...eng.grid[r][c]!, r: r + 1 };
                }
              }
            }

            // Fill top row 0 with fresh bubbles
            for (let c = 0; c < COLS_EVEN; c++) {
              newGrid[0][c] = {
                r: 0,
                c,
                color: COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)],
              };
            }

            eng.grid = newGrid;

            // Check if any bubble breached bottom (Row >= 11)
            const breached = newGrid.some((row, r) => r >= 11 && row.some((b) => b !== null));
            if (breached) {
              setIsGameOver(true);
              sound.playGameOver();
            }

            return 5;
          }
          return nf;
        });
      }

      // Check Victory (All bubbles cleared)
      const hasRemaining = eng.grid.some((row) => row.some((b) => b !== null));
      if (!hasRemaining) {
        setIsWon(true);
        sound.playFinishFanfare();
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
      }

      setCurrentBubble(nextBubble);
      setNextBubble(COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)]);
    },
    [nextBubble]
  );

  // Restart Match
  const restartMatch = () => {
    sound.playClick();
    const eng = engineRef.current;
    eng.grid = createInitialGrid();
    eng.bulletActive = false;
    eng.fallingBubbles = [];
    eng.particles = [];

    setScore(0);
    setFoulsLeft(5);
    setCurrentBubble('cyan');
    setNextBubble('pink');
    setIsShooting(false);
    setIsWon(false);
    setIsGameOver(false);
  };

  // Aim Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isShooting || isGameOver || isWon) return;
    engineRef.current.aiming = true;
    updateAimAngle(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!engineRef.current.aiming || isShooting || isGameOver || isWon) return;
    updateAimAngle(e);
  };

  const handlePointerUp = () => {
    if (!engineRef.current.aiming || isShooting || isGameOver || isWon) return;
    engineRef.current.aiming = false;
    shootBubble();
  };

  const updateAimAngle = (e: React.PointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 540 / rect.width;
    const scaleY = 780 / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const dx = px - 270;
    const dy = py - 690;

    if (dy < -20) {
      engineRef.current.aimAngle = Math.atan2(dy, dx);
    }
  };

  // 60 FPS Physics & Render Loop
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
      const dangerLineY = 640;

      // ==========================================
      // 1. BACKGROUND & CHAMBER
      // ==========================================
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);

      // Chamber Container
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.beginPath();
      ctx.roundRect(leftWall, topWall, rightWall - leftWall, dangerLineY - topWall + 60, 18);
      ctx.fill();

      // Glowing Neon Border
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Red Bottom Danger Line
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(leftWall + 10, dangerLineY);
      ctx.lineTo(rightWall - 10, dangerLineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // ==========================================
      // 2. FLYING BULLET BUBBLE PHYSICS
      // ==========================================
      if (eng.bulletActive) {
        eng.bulletX += eng.bulletVx;
        eng.bulletY += eng.bulletVy;

        // Rebound off Left & Right Walls
        if (eng.bulletX - BUBBLE_RADIUS <= leftWall) {
          eng.bulletX = leftWall + BUBBLE_RADIUS;
          eng.bulletVx = -eng.bulletVx;
        }
        if (eng.bulletX + BUBBLE_RADIUS >= rightWall) {
          eng.bulletX = rightWall - BUBBLE_RADIUS;
          eng.bulletVx = -eng.bulletVx;
        }

        // Check Collision with Ceiling or Grid Bubbles
        let hitGrid = false;

        // Ceiling collision
        if (eng.bulletY - BUBBLE_RADIUS <= topWall + 20) {
          hitGrid = true;
        }

        // Bubble-to-Bubble Collision
        if (!hitGrid) {
          for (let r = 0; r < GRID_ROWS; r++) {
            const cols = r % 2 === 0 ? COLS_EVEN : COLS_ODD;
            for (let c = 0; c < cols; c++) {
              if (eng.grid[r][c]) {
                const pos = getBubblePos(r, c);
                if (Math.hypot(eng.bulletX - pos.x, eng.bulletY - pos.y) < BUBBLE_RADIUS * 1.85) {
                  hitGrid = true;
                  break;
                }
              }
            }
            if (hitGrid) break;
          }
        }

        // Snap into closest vacant hexagonal socket
        if (hitGrid) {
          let closestR = 0;
          let closestC = 0;
          let closestDist = 9999;

          for (let r = 0; r < GRID_ROWS; r++) {
            const cols = r % 2 === 0 ? COLS_EVEN : COLS_ODD;
            for (let c = 0; c < cols; c++) {
              if (!eng.grid[r][c]) {
                const pos = getBubblePos(r, c);
                const d = Math.hypot(eng.bulletX - pos.x, eng.bulletY - pos.y);
                if (d < closestDist) {
                  closestDist = d;
                  closestR = r;
                  closestC = c;
                }
              }
            }
          }

          // Place bubble
          eng.grid[closestR][closestC] = {
            r: closestR,
            c: closestC,
            color: eng.bulletColor,
          };

          // Find Match 3+
          const cluster = getSameColorCluster(closestR, closestC, eng.grid);

          if (cluster.length >= 3) {
            sound.playWin();
            sound.playCollect();

            // Clear matched cluster
            cluster.forEach(({ r, c }) => {
              const pos = getBubblePos(r, c);
              // Pop particles
              for (let p = 0; p < 8; p++) {
                eng.particles.push({
                  x: pos.x,
                  y: pos.y,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  color: BUBBLE_COLORS[eng.bulletColor].main,
                  alpha: 1.0,
                  size: 4,
                });
              }
              eng.grid[r][c] = null;
            });

            // Add points
            const pts = cluster.length * 100;
            setScore((prev) => {
              const ns = prev + pts;
              if (ns > highScore) {
                setHighScore(ns);
                localStorage.setItem('cyber_bubble_pop_high', ns.toString());
              }
              return ns;
            });

            // Drop disconnected floating islands
            const dropped = dropFloatingBubbles(eng.grid);
            if (dropped.length > 0) {
              eng.fallingBubbles.push(...dropped);
              setScore((prev) => prev + dropped.length * 200);
            }

            rotateNextBubble(true);
          } else {
            sound.playHit();
            rotateNextBubble(false);
          }
        }
      }

      // ==========================================
      // 3. DRAW GRID BUBBLES
      // ==========================================
      for (let r = 0; r < GRID_ROWS; r++) {
        const cols = r % 2 === 0 ? COLS_EVEN : COLS_ODD;
        for (let c = 0; c < cols; c++) {
          const b = eng.grid[r][c];
          if (!b) continue;

          const pos = getBubblePos(r, c);
          const cfg = BUBBLE_COLORS[b.color];

          ctx.save();
          ctx.translate(pos.x, pos.y);

          // Bubble Radial Gradient
          const bGrad = ctx.createRadialGradient(-6, -6, 2, 0, 0, BUBBLE_RADIUS);
          bGrad.addColorStop(0, '#ffffff');
          bGrad.addColorStop(0.35, cfg.main);
          bGrad.addColorStop(1, cfg.dark);
          ctx.fillStyle = bGrad;
          ctx.shadowColor = cfg.main;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(0, 0, BUBBLE_RADIUS, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.restore();
        }
      }

      // ==========================================
      // 4. DRAW AIM TRAJECTORY LASER RAY
      // ==========================================
      if (eng.aiming && !isShooting && !isGameOver && !isWon) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(270, 690);
        ctx.lineTo(
          270 + Math.cos(eng.aimAngle) * 320,
          690 + Math.sin(eng.aimAngle) * 320
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ==========================================
      // 5. DRAW FLYING & READY BUBBLE LAUNCHER
      // ==========================================
      // Launcher Base
      ctx.save();
      ctx.translate(270, 690);
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ready Bubble
      if (!eng.bulletActive) {
        const curCfg = BUBBLE_COLORS[currentBubble];
        const curGrad = ctx.createRadialGradient(-6, -6, 2, 0, 0, BUBBLE_RADIUS);
        curGrad.addColorStop(0, '#ffffff');
        curGrad.addColorStop(0.35, curCfg.main);
        curGrad.addColorStop(1, curCfg.dark);
        ctx.fillStyle = curGrad;
        ctx.shadowColor = curCfg.main;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, BUBBLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Next Bubble Mini Preview
      const nextCfg = BUBBLE_COLORS[nextBubble];
      ctx.save();
      ctx.translate(38, 12);
      ctx.fillStyle = nextCfg.main;
      ctx.shadowColor = nextCfg.main;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();

      // Flying Bullet
      if (eng.bulletActive) {
        ctx.save();
        ctx.translate(eng.bulletX, eng.bulletY);
        const bCfg = BUBBLE_COLORS[eng.bulletColor];
        const bGrad = ctx.createRadialGradient(-6, -6, 2, 0, 0, BUBBLE_RADIUS);
        bGrad.addColorStop(0, '#ffffff');
        bGrad.addColorStop(0.35, bCfg.main);
        bGrad.addColorStop(1, bCfg.dark);
        ctx.fillStyle = bGrad;
        ctx.shadowColor = bCfg.main;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, BUBBLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Falling Disconnected Bubbles
      eng.fallingBubbles.forEach((fb) => {
        fb.x += fb.vx;
        fb.y += fb.vy;
        fb.vy += 0.45;

        ctx.save();
        ctx.translate(fb.x, fb.y);
        ctx.fillStyle = BUBBLE_COLORS[fb.color].main;
        ctx.shadowColor = BUBBLE_COLORS[fb.color].main;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, BUBBLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      eng.fallingBubbles = eng.fallingBubbles.filter((fb) => fb.y < H + 50);

      // Particles
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
  }, [currentBubble, isGameOver, isShooting, isWon, nextBubble, rotateNextBubble]);

  return (
    <div
      ref={containerRef}
      id="cyber-bubble-pop-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1 sm:px-2 py-1"
    >
      {/* ========================================================================= */}
      {/* 1. TOP SCORE & FOULS HUD */}
      {/* ========================================================================= */}
      <div className="w-full mb-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl flex items-center justify-between">
        {/* Score */}
        <div className="text-left">
          <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">SCORE</div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono leading-none">{score}</div>
        </div>

        {/* Fouls / Ceiling Drops Warning */}
        <div className="text-center font-mono">
          <div className="text-[10px] uppercase font-bold text-slate-400">CEILING SHIFT IN</div>
          <div className="flex gap-1 justify-center mt-0.5">
            {[1, 2, 3, 4, 5].map((f) => (
              <span
                key={f}
                className={`w-2.5 h-2.5 rounded-full ${
                  foulsLeft >= f ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : 'bg-slate-800'
                }`}
              />
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
      {/* 2. BUBBLE SHOOTER CANVAS ARENA */}
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
        {!isShooting && !isGameOver && !isWon && (
          <div className="absolute top-2 right-4 text-[10px] font-bold text-slate-400 pointer-events-none">
            👆 Drag to Aim, Release to Fire
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. VICTORY MODAL */}
      {/* ========================================================================= */}
      {isWon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border-2 border-emerald-400/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
              <Trophy className="w-9 h-9 text-emerald-400 animate-bounce" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-emerald-400 tracking-wider">ALL BUBBLES POPPED!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">VICTORY CLEAR!</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-amber-300 font-mono text-xl font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>All-Time Best:</span>
                <span className="text-cyan-300 font-mono text-xl font-black">{highScore}</span>
              </div>
            </div>

            <button
              onClick={restartMatch}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-600 to-pink-600 hover:from-emerald-400 active:scale-95 text-white font-black text-base shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" /> PLAY AGAIN
            </button>
          </div>
        </div>
      )}

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
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">BUBBLES REACHED FLOOR!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GAME OVER</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-white font-mono text-xl font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Best Record:</span>
                <span className="text-amber-300 font-mono text-base font-black">{highScore}</span>
              </div>
            </div>

            <button
              onClick={restartMatch}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 hover:from-cyan-400 active:scale-95 text-white font-black text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" /> TRY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
