import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Play,
  Pause,
  AlertTriangle,
  Flame,
  ChevronRight,
  Shield,
  Star,
  Grid,
} from 'lucide-react';
import { sound } from '../../utils/audio';

export interface HoleSkin {
  id: string;
  name: string;
  rimColor: string;
  glowColor: string;
  vortexColor: string;
  unlockedAtLevel: number;
}

const HOLE_SKINS: HoleSkin[] = [
  { id: 'cyber-cyan', name: 'Cyber Singularity', rimColor: '#00f0ff', glowColor: 'rgba(0, 240, 255, 0.7)', vortexColor: '#051329', unlockedAtLevel: 1 },
  { id: 'neon-purple', name: 'Void Nebula', rimColor: '#c084fc', glowColor: 'rgba(192, 132, 252, 0.7)', vortexColor: '#1e0b36', unlockedAtLevel: 3 },
  { id: 'solar-amber', name: 'Solar Flare', rimColor: '#fbbf24', glowColor: 'rgba(251, 191, 36, 0.8)', vortexColor: '#301804', unlockedAtLevel: 7 },
  { id: 'matrix-emerald', name: 'Quantum Core', rimColor: '#34d399', glowColor: 'rgba(52, 211, 153, 0.8)', vortexColor: '#042216', unlockedAtLevel: 12 },
  { id: 'crimson-abyss', name: 'Crimson Eclipse', rimColor: '#f43f5e', glowColor: 'rgba(244, 63, 94, 0.85)', vortexColor: '#2b0710', unlockedAtLevel: 20 },
];

export interface BlockItem {
  id: string;
  x: number;
  y: number;
  z: number; // height for 3D depth
  vx: number;
  vy: number;
  width: number;
  height: number;
  isHazard: boolean; // Red hazard block (swallowing this loses the game)
  color: string;
  swallowed: boolean;
  swallowProgress: number; // 0 to 1 as it spirals into the black hole
}

interface SuctionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export const ColorHole3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game Progress State
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'levelclear'>('start');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [currentSkin, setCurrentSkin] = useState<HoleSkin>(HOLE_SKINS[0]);
  const [showSkins, setShowSkins] = useState<boolean>(false);

  // Progress Bar
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const totalTargetBlocksRef = useRef<number>(0);
  const swallowedTargetCountRef = useRef<number>(0);

  // Black Hole Physics State
  const holePosRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 270,
    y: 360,
    targetX: 270,
    targetY: 360,
  });
  const holeRadiusRef = useRef<number>(36);
  const holeBaseRadiusRef = useRef<number>(36);

  // Physics Blocks & Particles
  const blocksRef = useRef<BlockItem[]>([]);
  const particlesRef = useRef<SuctionParticle[]>([]);
  const isPointerDownRef = useRef<boolean>(false);
  const animFrameRef = useRef<number | null>(null);

  // Load Saved Stats
  useEffect(() => {
    try {
      const savedLvl = localStorage.getItem('color_hole_level');
      if (savedLvl) setLevel(Math.max(1, parseInt(savedLvl, 10)));
      const savedHigh = localStorage.getItem('color_hole_high');
      if (savedHigh) setHighScore(parseInt(savedHigh, 10));
    } catch {
      // ignore
    }
  }, []);

  const saveStats = (newLevel: number, newScore: number) => {
    try {
      localStorage.setItem('color_hole_level', String(newLevel));
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('color_hole_high', String(newScore));
      }
    } catch {
      // ignore
    }
  };

  // Generate Distinct Structured Levels
  const initLevel = useCallback((lvl: number) => {
    const blocks: BlockItem[] = [];
    const arenaW = 540;
    const centerX = arenaW / 2;

    // Reset hole position & size
    holePosRef.current = { x: centerX, y: 400, targetX: centerX, targetY: 400 };
    holeBaseRadiusRef.current = 35 + Math.min(lvl * 0.4, 10);
    holeRadiusRef.current = holeBaseRadiusRef.current;

    let targetCount = 0;

    // Level Layouts
    const layoutType = lvl % 5;

    if (layoutType === 1) {
      // 1. PYRAMID STACK
      const rows = Math.min(5 + Math.floor(lvl / 2), 8);
      const bSize = 22;
      for (let r = 0; r < rows; r++) {
        const countInRow = r + 1;
        const startX = centerX - (countInRow * (bSize + 4)) / 2;
        const y = 140 + r * (bSize + 6);

        for (let c = 0; c < countInRow; c++) {
          const isHazard = lvl >= 2 && (r === 2 && (c === 0 || c === countInRow - 1));
          blocks.push({
            id: `blk_${r}_${c}`,
            x: startX + c * (bSize + 4) + bSize / 2,
            y,
            z: 0,
            vx: 0,
            vy: 0,
            width: bSize,
            height: bSize,
            isHazard,
            color: isHazard ? '#ef4444' : '#38bdf8',
            swallowed: false,
            swallowProgress: 0,
          });
          if (!isHazard) targetCount++;
        }
      }
    } else if (layoutType === 2) {
      // 2. TWIN HIGH-RISE TOWERS & HAZARD GUARDS
      const bSize = 20;
      const towerHeight = 7;
      const leftTowerX = centerX - 80;
      const rightTowerX = centerX + 80;

      for (let yIdx = 0; yIdx < towerHeight; yIdx++) {
        const y = 120 + yIdx * (bSize + 5);
        for (let xIdx = 0; xIdx < 3; xIdx++) {
          // Left Tower
          blocks.push({
            id: `tower_l_${yIdx}_${xIdx}`,
            x: leftTowerX + (xIdx - 1) * (bSize + 4),
            y,
            z: 0,
            vx: 0,
            vy: 0,
            width: bSize,
            height: bSize,
            isHazard: false,
            color: '#a855f7',
            swallowed: false,
            swallowProgress: 0,
          });
          targetCount++;

          // Right Tower
          blocks.push({
            id: `tower_r_${yIdx}_${xIdx}`,
            x: rightTowerX + (xIdx - 1) * (bSize + 4),
            y,
            z: 0,
            vx: 0,
            vy: 0,
            width: bSize,
            height: bSize,
            isHazard: false,
            color: '#34d399',
            swallowed: false,
            swallowProgress: 0,
          });
          targetCount++;
        }

        // Center Hazard Column
        if (lvl >= 2 && yIdx % 2 === 1) {
          blocks.push({
            id: `hazard_col_${yIdx}`,
            x: centerX,
            y,
            z: 0,
            vx: 0,
            vy: 0,
            width: bSize + 2,
            height: bSize + 2,
            isHazard: true,
            color: '#ef4444',
            swallowed: false,
            swallowProgress: 0,
          });
        }
      }
    } else if (layoutType === 3) {
      // 3. CONCENTRIC ORBIT RINGS
      const bSize = 18;
      // Inner ring
      const innerCount = 8;
      for (let i = 0; i < innerCount; i++) {
        const ang = (i * Math.PI * 2) / innerCount;
        blocks.push({
          id: `ring_in_${i}`,
          x: centerX + Math.cos(ang) * 45,
          y: 200 + Math.sin(ang) * 45,
          z: 0,
          vx: 0,
          vy: 0,
          width: bSize,
          height: bSize,
          isHazard: false,
          color: '#fbbf24',
          swallowed: false,
          swallowProgress: 0,
        });
        targetCount++;
      }

      // Outer ring with hazards
      const outerCount = 14;
      for (let i = 0; i < outerCount; i++) {
        const ang = (i * Math.PI * 2) / outerCount;
        const isHazard = lvl >= 3 && i % 4 === 0;
        blocks.push({
          id: `ring_out_${i}`,
          x: centerX + Math.cos(ang) * 90,
          y: 200 + Math.sin(ang) * 90,
          z: 0,
          vx: 0,
          vy: 0,
          width: bSize,
          height: bSize,
          isHazard,
          color: isHazard ? '#ef4444' : '#06b6d4',
          swallowed: false,
          swallowProgress: 0,
        });
        if (!isHazard) targetCount++;
      }
    } else if (layoutType === 4) {
      // 4. MATRIX GRID BOMB MAZE
      const cols = 7;
      const rows = 6;
      const bSize = 21;
      const startX = centerX - (cols * (bSize + 10)) / 2 + bSize / 2;
      const startY = 120;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const isHazard = lvl >= 2 && (r + c) % 4 === 0;
          blocks.push({
            id: `grid_${r}_${c}`,
            x: startX + c * (bSize + 10),
            y: startY + r * (bSize + 12),
            z: 0,
            vx: 0,
            vy: 0,
            width: bSize,
            height: bSize,
            isHazard,
            color: isHazard ? '#ef4444' : (r % 2 === 0 ? '#38bdf8' : '#f43f5e'),
            swallowed: false,
            swallowProgress: 0,
          });
          if (!isHazard) targetCount++;
        }
      }
    } else {
      // 5. BIG DOMINO WAVE
      const dominoCount = Math.min(18 + lvl * 2, 32);
      for (let i = 0; i < dominoCount; i++) {
        const t = i / dominoCount;
        const x = centerX + Math.sin(t * Math.PI * 4) * 110;
        const y = 110 + t * 200;
        const isHazard = lvl >= 3 && i % 6 === 3;

        blocks.push({
          id: `domino_${i}`,
          x,
          y,
          z: 0,
          vx: 0,
          vy: 0,
          width: 18,
          height: 18,
          isHazard,
          color: isHazard ? '#ef4444' : '#e879f9',
          swallowed: false,
          swallowProgress: 0,
        });
        if (!isHazard) targetCount++;
      }
    }

    blocksRef.current = blocks;
    totalTargetBlocksRef.current = targetCount;
    swallowedTargetCountRef.current = 0;
    setProgressPercent(0);
  }, []);

  // Start Playing
  const startGame = () => {
    sound.playClick();
    setScore(0);
    setGameState('playing');
    initLevel(level);
  };

  // Pointer Movement Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing' || isPaused) return;
    isPointerDownRef.current = true;
    updateHoleTargetPosition(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current || gameState !== 'playing' || isPaused) return;
    updateHoleTargetPosition(e);
  };

  const handlePointerUp = useCallback(() => {
    isPointerDownRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerUp]);

  const updateHoleTargetPosition = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;

    // Constrain hole inside board bounds
    const radius = holeRadiusRef.current;
    const margin = radius + 15;
    holePosRef.current.targetX = Math.max(margin, Math.min(canvas.width - margin, rawX));
    holePosRef.current.targetY = Math.max(margin + 40, Math.min(canvas.height - margin - 20, rawY));
  };

  // Main Physics Engine & Rendering Loop
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

      // 1. UPDATE HOLE MOVEMENT (Smooth Lerp)
      const hole = holePosRef.current;
      hole.x += (hole.targetX - hole.x) * 0.22;
      hole.y += (hole.targetY - hole.y) * 0.22;

      // Dynamic hole scale expansion
      const expansion = Math.min((swallowedTargetCountRef.current / (totalTargetBlocksRef.current || 1)) * 14, 14);
      holeRadiusRef.current = holeBaseRadiusRef.current + expansion;
      const radius = holeRadiusRef.current;

      // 2. UPDATE PARTICLES VORTEX IN THE HOLE
      if (gameState === 'playing') {
        if (Math.random() > 0.4) {
          const ang = Math.random() * Math.PI * 2;
          const dist = radius * (0.8 + Math.random() * 0.5);
          particlesRef.current.push({
            x: hole.x + Math.cos(ang) * dist,
            y: hole.y + Math.sin(ang) * dist,
            vx: -Math.cos(ang) * 60 + Math.sin(ang) * 40,
            vy: -Math.sin(ang) * 60 - Math.cos(ang) * 40,
            alpha: 0.8,
            color: currentSkin.rimColor,
            size: Math.random() * 3 + 1,
            life: 0,
            maxLife: 0.35,
          });
        }
      }

      // 3. UPDATE PHYSICS BLOCKS & GRAVITATIONAL SUCTION
      const blocks = blocksRef.current;
      const suctionRadius = radius * 2.3;

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.swallowed && b.swallowProgress >= 1) continue;

        if (gameState === 'playing') {
          const dx = hole.x - b.x;
          const dy = hole.y - b.y;
          const dist = Math.hypot(dx, dy);

          // Inside Suction Radius
          if (dist < suctionRadius) {
            const pullFactor = (1 - dist / suctionRadius) * 420;
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            // Spiral tangential force
            const tx = -ny * 80 * (1 - dist / suctionRadius);
            const ty = nx * 80 * (1 - dist / suctionRadius);

            b.vx += (nx * pullFactor + tx) * dt;
            b.vy += (ny * pullFactor + ty) * dt;
          }

          // Friction damping
          b.vx *= 0.91;
          b.vy *= 0.91;

          b.x += b.vx * dt;
          b.y += b.vy * dt;

          // Check if Block falls inside the Black Hole Horizon
          if (dist < radius * 0.75) {
            if (!b.swallowed) {
              b.swallowed = true;

              if (b.isHazard) {
                // RED HAZARD SWALLOWED -> GAME OVER!
                sound.playDangerWarning();
                setGameState('gameover');

                // Violent red explosion
                for (let p = 0; p < 35; p++) {
                  const pAng = Math.random() * Math.PI * 2;
                  const pSpd = Math.random() * 260 + 80;
                  particlesRef.current.push({
                    x: b.x,
                    y: b.y,
                    vx: Math.cos(pAng) * pSpd,
                    vy: Math.sin(pAng) * pSpd,
                    alpha: 1,
                    color: '#ef4444',
                    size: Math.random() * 5 + 2,
                    life: 0,
                    maxLife: 0.6,
                  });
                }
              } else {
                // TARGET BLOCK SWALLOWED -> SUCCESS SOUND & SCORE
                swallowedTargetCountRef.current++;
                const pitch = 0.8 + (swallowedTargetCountRef.current / (totalTargetBlocksRef.current || 1)) * 0.8;
                sound.playSwallowObject(pitch);

                setScore((s) => {
                  const nextS = s + 10;
                  saveStats(level, nextS);
                  return nextS;
                });

                const pct = Math.round((swallowedTargetCountRef.current / (totalTargetBlocksRef.current || 1)) * 100);
                setProgressPercent(pct);

                // Small suction sparks
                for (let p = 0; p < 8; p++) {
                  particlesRef.current.push({
                    x: b.x,
                    y: b.y,
                    vx: (Math.random() - 0.5) * 100,
                    vy: (Math.random() - 0.5) * 100,
                    alpha: 1,
                    color: b.color,
                    size: Math.random() * 3 + 1,
                    life: 0,
                    maxLife: 0.3,
                  });
                }

                // Check Level Clear
                if (swallowedTargetCountRef.current >= totalTargetBlocksRef.current) {
                  sound.playGoalCheer();
                  setGameState('levelclear');
                  confetti({
                    particleCount: 70,
                    spread: 70,
                    origin: { y: 0.5 },
                  });

                  setTimeout(() => {
                    setLevel((lvl) => {
                      const nextLvl = lvl + 1;
                      initLevel(nextLvl);
                      setGameState('playing');
                      saveStats(nextLvl, score);
                      return nextLvl;
                    });
                  }, 900);
                }
              }
            }

            // Animate down into void (shrinking scale & rotating)
            b.swallowProgress = Math.min(1, b.swallowProgress + dt * 4.5);
            b.z -= dt * 60;
          }
        }
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
      ctx.clearRect(0, 0, width, height);

      // A. Premium Floor Grid with Isometric Lighting
      const floorGrad = ctx.createLinearGradient(0, 0, 0, height);
      floorGrad.addColorStop(0, '#0c1427');
      floorGrad.addColorStop(1, '#070b16');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle Grid Tiles
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // B. DRAW BLACK HOLE / VORTEX
      ctx.save();
      // Outer Event Horizon Halo Glow
      const glowGrad = ctx.createRadialGradient(hole.x, hole.y, radius * 0.7, hole.x, hole.y, radius * 1.55);
      glowGrad.addColorStop(0, currentSkin.glowColor);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, radius * 1.55, 0, Math.PI * 2);
      ctx.fill();

      // Black Hole Bottomless Cavity
      const holeGrad = ctx.createRadialGradient(hole.x, hole.y, 0, hole.x, hole.y, radius);
      holeGrad.addColorStop(0, '#000000');
      holeGrad.addColorStop(0.75, currentSkin.vortexColor);
      holeGrad.addColorStop(1, '#000000');
      ctx.fillStyle = holeGrad;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Dynamic Event Horizon Rim Stroke
      ctx.strokeStyle = currentSkin.rimColor;
      ctx.shadowColor = currentSkin.rimColor;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // C. DRAW BLOCKS (3D Isometric Bevel Stacking)
      for (const b of blocks) {
        if (b.swallowed && b.swallowProgress >= 1) continue;

        ctx.save();
        const scale = 1 - b.swallowProgress * 0.85;
        const alpha = 1 - b.swallowProgress * 0.7;

        ctx.globalAlpha = alpha;
        ctx.translate(b.x, b.y);
        ctx.scale(scale, scale);

        const w = b.width;
        const h = b.height;
        const depth = 8;

        // Shadow under block
        if (!b.swallowed) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(-w / 2 + 3, -h / 2 + depth + 3, w, h);
        }

        // Block 3D Side extrusion (Darker)
        ctx.fillStyle = b.isHazard ? '#991b1b' : '#0369a1';
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2 + depth, w, h, 4);
        ctx.fill();

        // Block Top Face (Bright & Glossy)
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = b.isHazard ? 10 : 6;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Hazard Symbol or Gloss Highlight
        if (b.isHazard) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✕', 0, 0);
        } else {
          // Subtle diagonal gloss
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.moveTo(-w / 2 + 2, -h / 2 + 2);
          ctx.lineTo(-w / 2 + w * 0.6, -h / 2 + 2);
          ctx.lineTo(-w / 2 + 2, -h / 2 + h * 0.6);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      // D. DRAW PARTICLES
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
  }, [gameState, level, currentSkin, isPaused]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center select-none">
      <div
        id="color-hole-3d-arena-container"
        className="relative w-full max-w-[560px] aspect-[540/740] sm:aspect-[16/11] max-h-[74vh] sm:max-h-[82vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between items-center select-none font-sans mx-auto border-4 border-slate-900/90 touch-none"
        style={{
          backgroundColor: '#070b16',
        }}
      >
      {/* 1. TOP STATS & LEVEL PROGRESS BAR */}
      <div className="relative w-full px-3 sm:px-6 pt-3 sm:pt-4 pb-2 flex flex-col gap-2 z-30 pointer-events-auto">
        <div className="flex items-center justify-between">
          {/* Level Badge */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-slate-900/85 border border-cyan-500/40 text-cyan-300 text-xs font-black flex items-center gap-1.5 shadow-md">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>LEVEL {level}</span>
            </div>

            <div className="px-3 py-1 rounded-xl bg-slate-900/85 border border-purple-500/40 text-purple-300 text-xs font-black flex items-center gap-1.5 shadow-md">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span>{score}</span>
            </div>
          </div>

          {/* Skins & Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setShowSkins(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-400/50 text-white text-xs font-black flex items-center gap-1 active:scale-95 transition-all shadow-md cursor-pointer"
              title="Black Hole Skins"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>HOLES</span>
            </button>

            <button
              onClick={() => {
                const isM = sound.toggleMute();
                setMuted(isM);
              }}
              className="p-1.5 rounded-xl bg-slate-900/85 border border-slate-700 text-slate-300 hover:text-white active:scale-95 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Progress Bar (Devour target blocks percentage) */}
        <div className="w-full bg-slate-950/80 rounded-full h-3.5 p-0.5 border border-slate-800 shadow-inner flex items-center">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-150 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. MAIN INTERACTIVE CANVAS (DRAG OR MOVE HOLE) */}
      <canvas
        ref={canvasRef}
        width={560}
        height={500}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full cursor-grab active:cursor-grabbing z-10 touch-none"
      />

      {/* 3. SWIPE INSTRUCTION (When playing) */}
      {gameState === 'playing' && (
        <div className="absolute bottom-3 text-slate-400 text-[11px] font-bold tracking-widest uppercase pointer-events-none flex items-center gap-1.5 animate-pulse">
          <span>DRAG HOLE TO DEVOUR BLOCKS</span>
          <span className="text-rose-400 font-black">• AVOID RED HAZARDS ✕</span>
        </div>
      )}

      {/* 4. START OVERLAY */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-40 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/40 border border-cyan-300 mb-3">
            <Zap className="w-9 h-9 text-slate-950" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wider drop-shadow-md">
            COLOR HOLE 3D
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xs mt-1">
            Drag the singularity hole to swallow all colored blocks into the abyss. Do NOT swallow red hazard bombs!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-cyan-500/30 active:scale-95 transition-all cursor-pointer"
          >
            START DEVOURING
          </button>
        </div>
      )}

      {/* 5. GAME OVER (RED HAZARD SWALLOWED) */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-700 flex items-center justify-center shadow-2xl shadow-rose-500/40 border border-rose-400 mb-2">
            <AlertTriangle className="w-9 h-9 text-white" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white">HAZARD DEVOUR!</h2>
          <p className="text-xs text-rose-300 font-bold uppercase tracking-widest mt-0.5">RED BOMB DESTROYED THE CORE</p>

          <div className="flex gap-6 my-4">
            <div className="bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-bold">LEVEL</span>
              <span className="text-2xl font-black text-amber-400">{level}</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-bold">SCORE</span>
              <span className="text-2xl font-black text-cyan-400">{score}</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-bold">BEST</span>
              <span className="text-2xl font-black text-emerald-400">{highScore}</span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              setGameState('playing');
              initLevel(level);
            }}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/30 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>TRY AGAIN</span>
          </button>
        </div>
      )}

      {/* 6. HOLE SKINS MODAL */}
      {showSkins && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-black text-white">VORTEX HOLE SKINS</h3>
              </div>
              <button
                onClick={() => setShowSkins(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Skins Grid */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {HOLE_SKINS.map((skin) => {
                const isUnlocked = level >= skin.unlockedAtLevel;
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
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/20'
                        : isUnlocked
                        ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 cursor-pointer'
                        : 'bg-slate-950/50 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Hole Preview */}
                      <div
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                        style={{
                          backgroundColor: skin.vortexColor,
                          borderColor: skin.rimColor,
                          boxShadow: `0 0 10px ${skin.glowColor}`,
                        }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-black" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">{skin.name}</h4>
                        <span className="text-[10px] text-slate-400">
                          {skin.unlockedAtLevel === 1 ? 'Default Vortex' : `Unlocks at Level ${skin.unlockedAtLevel}`}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isSelected ? (
                        <span className="px-2.5 py-1 rounded-xl bg-cyan-400 text-slate-950 text-[10px] font-black">
                          EQUIPPED
                        </span>
                      ) : isUnlocked ? (
                        <button className="px-2.5 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black">
                          EQUIP
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-bold">🔒 Level {skin.unlockedAtLevel}</span>
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
