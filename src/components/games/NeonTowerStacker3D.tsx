import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  Palette,
  Play,
  Flame,
} from 'lucide-react';
import { sound } from '../../utils/audio';

export interface TowerTheme {
  id: string;
  name: string;
  baseHue: number;
  bgGradStart: string;
  bgGradEnd: string;
  crystalCost: number;
}

const TOWER_THEMES: TowerTheme[] = [
  { id: 'synthwave', name: 'Neon Synthwave', baseHue: 320, bgGradStart: '#0f0a1c', bgGradEnd: '#05030a', crystalCost: 0 },
  { id: 'cyber-cyan', name: 'Cyber Matrix', baseHue: 185, bgGradStart: '#04131a', bgGradEnd: '#02070a', crystalCost: 100 },
  { id: 'solar-gold', name: 'Solar Sunset', baseHue: 35, bgGradStart: '#1a1005', bgGradEnd: '#0a0502', crystalCost: 250 },
  { id: 'emerald-aurora', name: 'Emerald Aurora', baseHue: 150, bgGradStart: '#04170e', bgGradEnd: '#020a06', crystalCost: 400 },
  { id: 'amethyst-void', name: 'Amethyst Void', baseHue: 270, bgGradStart: '#14061f', bgGradEnd: '#06020a', crystalCost: 650 },
];

interface StackBlock {
  x: number; // Center X
  z: number; // Center Z
  width: number; // X dimension
  depth: number; // Z dimension
  y: number; // Floor index
  hue: number; // Color hue 0-360
  isPerfect?: boolean;
}

interface FallingPiece {
  x: number;
  z: number;
  width: number;
  depth: number;
  y: number;
  vy: number;
  rotX: number;
  rotZ: number;
  vRotX: number;
  vRotZ: number;
  hue: number;
  alpha: number;
}

interface PerfectParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

const BASE_WIDTH = 130;
const BASE_DEPTH = 130;
const BLOCK_HEIGHT = 16;
const PERFECT_TOLERANCE = 4.5; // Max offset considered "Perfect"

export const NeonTowerStacker3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game Meta State
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [crystals, setCrystals] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [currentTheme, setCurrentTheme] = useState<TowerTheme>(TOWER_THEMES[0]);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);

  // Tower Simulation Refs
  const blocksRef = useRef<StackBlock[]>([]);
  const fallingPiecesRef = useRef<FallingPiece[]>([]);
  const particlesRef = useRef<PerfectParticle[]>([]);

  // Current Moving Block State
  const movingAxisRef = useRef<'x' | 'z'>('x'); // Alternates each floor
  const movingPosRef = useRef<number>(0); // Current position on moving axis
  const movingDirectionRef = useRef<number>(1); // 1 or -1
  const movingSpeedRef = useRef<number>(140); // Pixels per second

  // Camera & Visual Animation Refs
  const cameraYRef = useRef<number>(0);
  const targetCameraYRef = useRef<number>(0);
  const perfectComboRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Load Saved Stats
  useEffect(() => {
    try {
      const savedHigh = localStorage.getItem('neon_stack_high');
      if (savedHigh) setHighScore(parseInt(savedHigh, 10));
      const savedCrystals = localStorage.getItem('neon_stack_crystals');
      if (savedCrystals) setCrystals(parseInt(savedCrystals, 10));
    } catch {
      // ignore
    }
  }, []);

  const saveStats = (newScore: number, newCrystals: number) => {
    try {
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('neon_stack_high', String(newScore));
      }
      localStorage.setItem('neon_stack_crystals', String(newCrystals));
    } catch {
      // ignore
    }
  };

  // Initialize Game & Base Block
  const initGame = useCallback(() => {
    sound.playClick();
    const baseHue = currentTheme.baseHue;

    const baseBlock: StackBlock = {
      x: 0,
      z: 0,
      width: BASE_WIDTH,
      depth: BASE_DEPTH,
      y: 0,
      hue: baseHue,
    };

    blocksRef.current = [baseBlock];
    fallingPiecesRef.current = [];
    particlesRef.current = [];

    movingAxisRef.current = 'x';
    movingPosRef.current = -180;
    movingDirectionRef.current = 1;
    movingSpeedRef.current = 150;

    cameraYRef.current = 0;
    targetCameraYRef.current = 0;
    perfectComboRef.current = 0;

    setScore(0);
    setCombo(0);
    setGameState('playing');
  }, [currentTheme]);

  // Handle Player Tap / Slice Action
  const handleStackAction = useCallback(() => {
    if (gameState === 'start' || gameState === 'gameover') {
      initGame();
      return;
    }
    if (gameState !== 'playing') return;

    const blocks = blocksRef.current;
    const topBlock = blocks[blocks.length - 1];
    const prevBlock = blocks[blocks.length - 1]; // Current top to stack upon

    const currentAxis = movingAxisRef.current;
    const currentPos = movingPosRef.current;
    const currentHue = (currentTheme.baseHue + blocks.length * 4) % 360;

    let newWidth = prevBlock.width;
    let newDepth = prevBlock.depth;
    let newX = prevBlock.x;
    let newZ = prevBlock.z;

    let isGameOver = false;
    let isPerfect = false;

    if (currentAxis === 'x') {
      const deltaX = currentPos - prevBlock.x;
      const absDelta = Math.abs(deltaX);

      if (absDelta <= PERFECT_TOLERANCE) {
        // 🌟 PERFECT FIT!
        isPerfect = true;
        newX = prevBlock.x; // Snap exactly to center
        newWidth = prevBlock.width;
      } else if (absDelta >= prevBlock.width) {
        // 💥 COMPLETELY MISSED!
        isGameOver = true;
        // The whole block falls
        fallingPiecesRef.current.push({
          x: currentPos,
          z: prevBlock.z,
          width: prevBlock.width,
          depth: prevBlock.depth,
          y: blocks.length * BLOCK_HEIGHT,
          vy: 0,
          rotX: 0,
          rotZ: deltaX > 0 ? 0.05 : -0.05,
          vRotX: 0,
          vRotZ: deltaX > 0 ? 2.5 : -2.5,
          hue: currentHue,
          alpha: 1,
        });
      } else {
        // ✂️ PARTIAL OVERLAP SLICE
        newWidth = prevBlock.width - absDelta;
        newX = prevBlock.x + deltaX / 2;

        const sliceWidth = absDelta;
        const sliceX = deltaX > 0 ? newX + newWidth / 2 + sliceWidth / 2 : newX - newWidth / 2 - sliceWidth / 2;

        // Spawn falling slice
        fallingPiecesRef.current.push({
          x: sliceX,
          z: prevBlock.z,
          width: sliceWidth,
          depth: prevBlock.depth,
          y: blocks.length * BLOCK_HEIGHT,
          vy: 0,
          rotX: 0,
          rotZ: deltaX > 0 ? 0.08 : -0.08,
          vRotX: (Math.random() - 0.5) * 1.5,
          vRotZ: deltaX > 0 ? 3.5 : -3.5,
          hue: currentHue,
          alpha: 1,
        });
      }
    } else {
      // Z-Axis Slicing
      const deltaZ = currentPos - prevBlock.z;
      const absDelta = Math.abs(deltaZ);

      if (absDelta <= PERFECT_TOLERANCE) {
        // 🌟 PERFECT FIT!
        isPerfect = true;
        newZ = prevBlock.z; // Snap exactly to center
        newDepth = prevBlock.depth;
      } else if (absDelta >= prevBlock.depth) {
        // 💥 COMPLETELY MISSED!
        isGameOver = true;
        fallingPiecesRef.current.push({
          x: prevBlock.x,
          z: currentPos,
          width: prevBlock.width,
          depth: prevBlock.depth,
          y: blocks.length * BLOCK_HEIGHT,
          vy: 0,
          rotX: deltaZ > 0 ? 0.05 : -0.05,
          rotZ: 0,
          vRotX: deltaZ > 0 ? 2.5 : -2.5,
          vRotZ: 0,
          hue: currentHue,
          alpha: 1,
        });
      } else {
        // ✂️ PARTIAL OVERLAP SLICE
        newDepth = prevBlock.depth - absDelta;
        newZ = prevBlock.z + deltaZ / 2;

        const sliceDepth = absDelta;
        const sliceZ = deltaZ > 0 ? newZ + newDepth / 2 + sliceDepth / 2 : newZ - newDepth / 2 - sliceDepth / 2;

        fallingPiecesRef.current.push({
          x: prevBlock.x,
          z: sliceZ,
          width: prevBlock.width,
          depth: sliceDepth,
          y: blocks.length * BLOCK_HEIGHT,
          vy: 0,
          rotX: deltaZ > 0 ? 0.08 : -0.08,
          rotZ: 0,
          vRotX: deltaZ > 0 ? 3.5 : -3.5,
          vRotZ: (Math.random() - 0.5) * 1.5,
          hue: currentHue,
          alpha: 1,
        });
      }
    }

    if (isGameOver) {
      sound.playGameOver();
      setGameState('gameover');
      saveStats(blocks.length - 1, crystals);
      return;
    }

    // Process Perfect Placement or Standard Slice
    if (isPerfect) {
      perfectComboRef.current += 1;
      setCombo(perfectComboRef.current);
      sound.playStackNote(perfectComboRef.current);

      // Reward Crystals for Perfect Combo
      const bonusCrystals = Math.floor(perfectComboRef.current / 2) + 1;
      setCrystals((c) => {
        const nextC = c + bonusCrystals;
        saveStats(blocks.length, nextC);
        return nextC;
      });

      // Expand Block Bonus on 7 consecutive combos!
      if (perfectComboRef.current >= 7) {
        newWidth = Math.min(BASE_WIDTH, newWidth + 14);
        newDepth = Math.min(BASE_DEPTH, newDepth + 14);
      }
    } else {
      perfectComboRef.current = 0;
      setCombo(0);
      sound.playStackSlice();
    }

    // Add New Stack Block
    const nextBlock: StackBlock = {
      x: newX,
      z: newZ,
      width: newWidth,
      depth: newDepth,
      y: blocks.length,
      hue: currentHue,
      isPerfect,
    };

    blocks.push(nextBlock);
    const newScore = blocks.length - 1;
    setScore(newScore);
    targetCameraYRef.current = (blocks.length - 1) * BLOCK_HEIGHT;

    // Check Confetti for new high record
    if (newScore > highScore && highScore > 5) {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
    }

    // Alternate Axis for Next Moving Block
    const nextAxis = currentAxis === 'x' ? 'z' : 'x';
    movingAxisRef.current = nextAxis;
    movingPosRef.current = -190;
    movingDirectionRef.current = 1;
    // Gradually increase speed
    movingSpeedRef.current = Math.min(270, 150 + blocks.length * 2.2);
  }, [gameState, currentTheme, crystals, highScore, initGame]);

  // Keyboard Controller
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        handleStackAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStackAction]);

  // ----------------------------------------------------
  // ISOMETRIC 3D RENDERING & SIMULATION LOOP (60 FPS)
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const width = canvas.width;
      const height = canvas.height;
      const originX = width / 2;
      const originY = height * 0.72; // Isometric base anchor

      // 1. UPDATE CAMERA LERP
      cameraYRef.current += (targetCameraYRef.current - cameraYRef.current) * 6 * dt;
      const camY = cameraYRef.current;

      // 2. UPDATE MOVING SLAB
      if (gameState === 'playing') {
        const speed = movingSpeedRef.current;
        movingPosRef.current += movingDirectionRef.current * speed * dt;

        const maxRange = 190;
        if (movingPosRef.current > maxRange) {
          movingPosRef.current = maxRange;
          movingDirectionRef.current = -1;
        } else if (movingPosRef.current < -maxRange) {
          movingPosRef.current = -maxRange;
          movingDirectionRef.current = 1;
        }
      }

      // 3. UPDATE FALLING SLICE PIECES
      for (let i = fallingPiecesRef.current.length - 1; i >= 0; i--) {
        const p = fallingPiecesRef.current[i];
        p.vy += 850 * dt; // Gravity
        p.y -= p.vy * dt;
        p.rotX += p.vRotX * dt;
        p.rotZ += p.vRotZ * dt;
        p.alpha = Math.max(0, p.alpha - 0.8 * dt);

        if (p.alpha <= 0 || p.y < -300) {
          fallingPiecesRef.current.splice(i, 1);
        }
      }

      // ----------------------------------------------------
      // 3D ISOMETRIC PROJECTION HELPERS
      // Isometric Angles: 30 degrees (cos 30 = 0.866, sin 30 = 0.5)
      // ----------------------------------------------------
      const toIso = (x: number, z: number, yWorld: number) => {
        const isoX = originX + (x - z) * 0.866;
        const isoY = originY + (x + z) * 0.5 - (yWorld - camY);
        return { x: isoX, y: isoY };
      };

      // Draw 3D Isometric Extruded Block
      const drawIsoBox = (
        bx: number,
        bz: number,
        bw: number,
        bd: number,
        by: number,
        hue: number,
        alpha: number = 1,
        isGlow: boolean = false
      ) => {
        ctx.save();
        ctx.globalAlpha = alpha;

        const hw = bw / 2;
        const hd = bd / 2;
        const yTop = by + BLOCK_HEIGHT;
        const yBot = by;

        // 8 Corners in 3D Space
        // Top 4 corners
        const pTopFront = toIso(bx + hw, bz + hd, yTop);
        const pTopRight = toIso(bx + hw, bz - hd, yTop);
        const pTopBack = toIso(bx - hw, bz - hd, yTop);
        const pTopLeft = toIso(bx - hw, bz + hd, yTop);

        // Bottom 4 corners
        const pBotFront = toIso(bx + hw, bz + hd, yBot);
        const pBotRight = toIso(bx + hw, bz - hd, yBot);
        const pBotLeft = toIso(bx - hw, bz + hd, yBot);

        // A. RIGHT FACE (Shaded Medium)
        ctx.fillStyle = `hsl(${hue}, 85%, 42%)`;
        ctx.beginPath();
        ctx.moveTo(pTopRight.x, pTopRight.y);
        ctx.lineTo(pTopFront.x, pTopFront.y);
        ctx.lineTo(pBotFront.x, pBotFront.y);
        ctx.lineTo(pBotRight.x, pBotRight.y);
        ctx.closePath();
        ctx.fill();

        // B. LEFT FACE (Shaded Darker)
        ctx.fillStyle = `hsl(${hue}, 85%, 32%)`;
        ctx.beginPath();
        ctx.moveTo(pTopFront.x, pTopFront.y);
        ctx.lineTo(pTopLeft.x, pTopLeft.y);
        ctx.lineTo(pBotLeft.x, pBotLeft.y);
        ctx.lineTo(pBotFront.x, pBotFront.y);
        ctx.closePath();
        ctx.fill();

        // C. TOP FACE (Bright Highlights & Glow)
        ctx.fillStyle = `hsl(${hue}, 90%, 62%)`;
        if (isGlow) {
          ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
          ctx.shadowBlur = 18;
        }
        ctx.beginPath();
        ctx.moveTo(pTopFront.x, pTopFront.y);
        ctx.lineTo(pTopRight.x, pTopRight.y);
        ctx.lineTo(pTopBack.x, pTopBack.y);
        ctx.lineTo(pTopLeft.x, pTopLeft.y);
        ctx.closePath();
        ctx.fill();

        // Top Subtle Bevel Border
        ctx.strokeStyle = `hsl(${hue}, 100%, 80%)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      };

      // ----------------------------------------------------
      // DRAW CANVAS LAYERS
      // ----------------------------------------------------
      ctx.clearRect(0, 0, width, height);

      // 1. Deep Cyber Synthwave Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, currentTheme.bgGradStart);
      bgGrad.addColorStop(1, currentTheme.bgGradEnd);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle Background Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let gy = 0; gy < height; gy += 32) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // 2. DRAW STACKED BLOCKS (Bottom to Top)
      const blocks = blocksRef.current;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const isCurrentTop = i === blocks.length - 1;
        drawIsoBox(b.x, b.z, b.width, b.depth, i * BLOCK_HEIGHT, b.hue, 1, isCurrentTop && b.isPerfect);
      }

      // 3. DRAW CURRENT MOVING SLAB
      if (gameState === 'playing' && blocks.length > 0) {
        const topBlock = blocks[blocks.length - 1];
        const nextFloor = blocks.length;
        const curHue = (currentTheme.baseHue + nextFloor * 4) % 360;

        let moveX = topBlock.x;
        let moveZ = topBlock.z;

        if (movingAxisRef.current === 'x') {
          moveX = movingPosRef.current;
        } else {
          moveZ = movingPosRef.current;
        }

        drawIsoBox(moveX, moveZ, topBlock.width, topBlock.depth, nextFloor * BLOCK_HEIGHT, curHue, 0.95, true);
      }

      // 4. DRAW FALLING SLICED PIECES
      for (const piece of fallingPiecesRef.current) {
        drawIsoBox(piece.x, piece.z, piece.width, piece.depth, piece.y, piece.hue, piece.alpha, false);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, currentTheme]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center select-none">
      <div
        id="neon-tower-stacker-container"
        onPointerDown={(e) => {
          e.preventDefault();
          handleStackAction();
        }}
        className="relative w-full max-w-[560px] aspect-[540/740] sm:aspect-[16/11] max-h-[74vh] sm:max-h-[82vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between items-center select-none font-sans mx-auto border-4 border-slate-900/90 cursor-pointer touch-none"
        style={{ backgroundColor: currentTheme.bgGradStart }}
      >
      {/* 1. TOP HUD (Score, Best, Crystals, Themes) */}
      <div className="relative w-full px-3 sm:px-6 pt-3 sm:pt-4 flex items-center justify-between z-30 pointer-events-auto">
        {/* Score & Combo */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-cyan-300 text-sm font-black flex items-center gap-1.5 shadow-md">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>FLOOR {score}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center gap-1.5 shadow-md">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{highScore}</span>
          </div>

          {/* Perfect Combo Indicator */}
          {combo > 1 && (
            <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white text-xs font-black flex items-center gap-1 animate-bounce shadow-lg">
              <Flame className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
              <span>PERFECT x{combo}</span>
            </div>
          )}
        </div>

        {/* Crystals & Themes */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-purple-500/40 text-purple-300 text-xs font-black flex items-center gap-1.5 shadow-md">
            <span>💎</span>
            <span>{crystals}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              sound.playClick();
              setShowThemeModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-400/50 text-white text-xs font-black flex items-center gap-1 active:scale-95 transition-all shadow-md cursor-pointer"
            title="Themes"
          >
            <Palette className="w-3.5 h-3.5 text-pink-300" />
            <span>THEMES</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              const isM = sound.toggleMute();
              setMuted(isM);
            }}
            className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white active:scale-95 cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. MAIN 3D ISOMETRIC CANVAS */}
      <canvas
        ref={canvasRef}
        width={560}
        height={500}
        className="w-full h-full z-10 touch-none"
      />

      {/* 3. TAP HINT */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 text-slate-400 text-xs font-bold tracking-widest uppercase pointer-events-none flex items-center gap-2 animate-pulse">
          <span className="text-cyan-400 font-black">TAP ANYWHERE / SPACEBAR</span>
          <span>TO SLICE & STACK TOWER</span>
        </div>
      )}

      {/* 4. START SCREEN */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-40 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-cyan-500/40 border border-cyan-300 mb-3">
            <Layers className="w-9 h-9 text-slate-950" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wider drop-shadow-md">
            NEON TOWER STACKER 3D
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xs mt-1">
            Tap with perfect timing to build an infinite neon sky skyscraper! Stack precisely for harmonic chords and combo bonuses.
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              initGame();
            }}
            className="mt-6 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-500 hover:opacity-90 text-white font-black text-sm tracking-wide shadow-xl shadow-cyan-500/30 active:scale-95 transition-all cursor-pointer"
          >
            START STACKING
          </button>
        </div>
      )}

      {/* 5. GAME OVER SCREEN */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-700 flex items-center justify-center shadow-2xl shadow-rose-500/40 border border-rose-400 mb-2">
            <Flame className="w-9 h-9 text-white" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white">TOWER COLLAPSED!</h2>
          <p className="text-xs text-rose-300 font-bold uppercase tracking-widest mt-0.5">SLAB COMPLETELY MISSED OVERHANG</p>

          <div className="flex gap-6 my-4">
            <div className="bg-slate-900/90 border border-slate-700 px-5 py-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-bold">FLOORS</span>
              <span className="text-2xl font-black text-cyan-400">{score}</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-700 px-5 py-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-bold">BEST</span>
              <span className="text-2xl font-black text-amber-400">{highScore}</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-700 px-5 py-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-bold">GEMS</span>
              <span className="text-2xl font-black text-purple-400">+{Math.max(1, Math.floor(score / 3))}</span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              initGame();
            }}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-pink-500 hover:opacity-90 text-white font-black text-sm tracking-wide shadow-xl shadow-cyan-500/30 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>
        </div>
      )}

      {/* 6. THEMES MODAL */}
      {showThemeModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-black text-white">SKY THEMES</h3>
              </div>
              <button
                onClick={() => setShowThemeModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-bold">Your Crystals:</span>
              <span className="text-purple-400 font-black flex items-center gap-1 text-sm">
                <span>💎</span> {crystals}
              </span>
            </div>

            {/* Theme List */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {TOWER_THEMES.map((theme) => {
                const isUnlocked = crystals >= theme.crystalCost;
                const isSelected = currentTheme.id === theme.id;

                return (
                  <div
                    key={theme.id}
                    onClick={() => {
                      if (isUnlocked) {
                        setCurrentTheme(theme);
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
                      {/* Theme Color Indicator */}
                      <div
                        className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-md"
                        style={{
                          backgroundColor: `hsl(${theme.baseHue}, 85%, 55%)`,
                          borderColor: `hsl(${theme.baseHue}, 100%, 75%)`,
                        }}
                      />
                      <div>
                        <h4 className="text-sm font-black text-white">{theme.name}</h4>
                        <span className="text-[10px] text-slate-400">
                          {theme.crystalCost === 0 ? 'Starter Sky' : `Cost: ${theme.crystalCost} Crystals`}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isSelected ? (
                        <span className="px-2.5 py-1 rounded-xl bg-pink-500 text-white text-[10px] font-black">
                          ACTIVE
                        </span>
                      ) : isUnlocked ? (
                        <button className="px-2.5 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black">
                          SELECT
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-bold">🔒 {theme.crystalCost} 💎</span>
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
