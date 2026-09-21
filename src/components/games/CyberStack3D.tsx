import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Trophy,
  Sparkles,
  Zap,
  Flame,
  Crown,
  Play,
  RotateCcw,
  Palette,
  Layers,
  TrendingUp,
  Maximize2
} from 'lucide-react';
import { sound } from '../../utils/audio';

// --- CONSTANTS & CONFIG ---
const BLOCK_HEIGHT = 16;
const INITIAL_SIZE = 135;
const PERFECT_TOLERANCE = 4.0; // Margin in px for snapping to a perfect match

interface Block {
  x: number;
  z: number;
  width: number;
  depth: number;
  y: number; // Height layer
  hue: number;
}

interface FallingDebris {
  x: number;
  z: number;
  width: number;
  depth: number;
  y: number;
  vy: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  hue: number;
  alpha: number;
}

interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
}

interface ThemeConfig {
  id: string;
  name: string;
  startHue: number;
  hueStep: number;
  saturation: number;
  bgGradStart: string;
  bgGradEnd: string;
  accent: string;
}

const THEMES: ThemeConfig[] = [
  {
    id: 'cyber-sunset',
    name: 'Cyber Sunset',
    startHue: 320,
    hueStep: 4.2,
    saturation: 85,
    bgGradStart: '#0f051d',
    bgGradEnd: '#030712',
    accent: '#f43f5e',
  },
  {
    id: 'synthwave-cyan',
    name: 'Synthwave Neon',
    startHue: 190,
    hueStep: 5.0,
    saturation: 90,
    bgGradStart: '#031926',
    bgGradEnd: '#020617',
    accent: '#06b6d4',
  },
  {
    id: 'matrix-lime',
    name: 'Matrix Emerald',
    startHue: 140,
    hueStep: 4.0,
    saturation: 80,
    bgGradStart: '#051b11',
    bgGradEnd: '#020b06',
    accent: '#10b981',
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    startHue: 30,
    hueStep: 4.8,
    saturation: 95,
    bgGradStart: '#1c0a00',
    bgGradEnd: '#090302',
    accent: '#f59e0b',
  },
  {
    id: 'void-amethyst',
    name: 'Void Amethyst',
    startHue: 270,
    hueStep: 4.5,
    saturation: 85,
    bgGradStart: '#130424',
    bgGradEnd: '#04010a',
    accent: '#a855f7',
  },
];

export const CyberStack3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game UI State
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_stack_highscore') || '0', 10);
  });
  const [combos, setCombos] = useState<number>(0);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('cyber-sunset');
  const [showThemes, setShowThemes] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());

  // Game Engine Ref
  const engineRef = useRef({
    blocks: [] as Block[],
    activeBlock: {
      x: 0,
      z: 0,
      width: INITIAL_SIZE,
      depth: INITIAL_SIZE,
      y: 0,
      hue: 0,
      direction: 'x' as 'x' | 'z',
      speed: 3.2,
      moveDir: 1,
      range: 220,
    },
    fallingDebris: [] as FallingDebris[],
    particles: [] as SparkleParticle[],
    floatingTexts: [] as FloatingText[],
    cameraY: 0,
    targetCameraY: 0,
    screenShake: 0,
    perfectFlash: 0,
    animationFrameId: 0,
    nextTextId: 1,
  });

  // Sound Toggle
  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Isometric 3D to 2D projection function
  const isoProject = (x: number, y: number, z: number, canvasWidth: number, canvasHeight: number, camY: number) => {
    const originX = canvasWidth / 2;
    const originY = canvasHeight * 0.72 + camY;
    // Standard 30 degree isometric axes
    const cos30 = 0.866025;
    const sin30 = 0.5;
    const screenX = originX + (x - z) * cos30;
    const screenY = originY + (x + z) * sin30 - y;
    return { screenX, screenY };
  };

  // Helper to trigger floating text
  const addFloatingText = (text: string, color: string, x: number, y: number) => {
    const eng = engineRef.current;
    eng.floatingTexts.push({
      id: eng.nextTextId++,
      x,
      y,
      text,
      color,
      alpha: 1,
    });
  };

  // Initialize Game Session
  const initGame = useCallback(() => {
    const theme = THEMES.find((t) => t.id === selectedThemeId) || THEMES[0];
    const eng = engineRef.current;

    const baseBlock: Block = {
      x: 0,
      z: 0,
      width: INITIAL_SIZE,
      depth: INITIAL_SIZE,
      y: 0,
      hue: theme.startHue,
    };

    eng.blocks = [baseBlock];
    eng.fallingDebris = [];
    eng.particles = [];
    eng.floatingTexts = [];
    eng.cameraY = 0;
    eng.targetCameraY = 0;
    eng.screenShake = 0;
    eng.perfectFlash = 0;

    // Setup first active moving block
    eng.activeBlock = {
      x: -eng.activeBlock.range,
      z: 0,
      width: INITIAL_SIZE,
      depth: INITIAL_SIZE,
      y: BLOCK_HEIGHT,
      hue: (theme.startHue + theme.hueStep) % 360,
      direction: 'x',
      speed: 3.2,
      moveDir: 1,
      range: 220,
    };

    setScore(0);
    setCombos(0);
  }, [selectedThemeId]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleStart = () => {
    initGame();
    setGameState('playing');
    sound.playPowerup();
  };

  const handleRestart = () => {
    initGame();
    setGameState('playing');
    sound.playPowerup();
  };

  // Main Placement / Stacking Action
  const handlePlaceBlock = useCallback(() => {
    if (gameState !== 'playing') return;

    const eng = engineRef.current;
    const theme = THEMES.find((t) => t.id === selectedThemeId) || THEMES[0];
    const topBlock = eng.blocks[eng.blocks.length - 1];
    const active = eng.activeBlock;

    let isPerfect = false;
    let newWidth = active.width;
    let newDepth = active.depth;
    let newX = active.x;
    let newZ = active.z;

    if (active.direction === 'x') {
      const deltaX = active.x - topBlock.x;
      const absDeltaX = Math.abs(deltaX);

      if (absDeltaX <= PERFECT_TOLERANCE) {
        // PERFECT SNAP!
        isPerfect = true;
        newX = topBlock.x;
      } else if (absDeltaX >= active.width) {
        // Complete Miss -> Game Over!
        sound.playBombExplode();
        eng.screenShake = 22;

        // Active block falls entirely
        eng.fallingDebris.push({
          x: active.x,
          z: active.z,
          width: active.width,
          depth: active.depth,
          y: active.y,
          vy: 0,
          rotX: 0,
          rotY: 0,
          rotZ: 0,
          vRotX: (Math.random() - 0.5) * 0.1,
          vRotY: (Math.random() - 0.5) * 0.1,
          hue: active.hue,
          alpha: 1,
        });

        setGameState('gameover');
        return;
      } else {
        // Partial Overlap - Slice off overhang!
        newWidth = active.width - absDeltaX;
        const sliceWidth = absDeltaX;
        let sliceX = 0;

        if (deltaX > 0) {
          // Overhanging on positive X
          newX = active.x - absDeltaX / 2;
          sliceX = active.x + newWidth / 2;
        } else {
          // Overhanging on negative X
          newX = active.x + absDeltaX / 2;
          sliceX = active.x - newWidth / 2;
        }

        // Spawn falling sliced overhang
        eng.fallingDebris.push({
          x: sliceX,
          z: active.z,
          width: sliceWidth,
          depth: active.depth,
          y: active.y,
          vy: -0.5,
          rotX: 0,
          rotY: 0,
          rotZ: 0,
          vRotX: (Math.random() - 0.5) * 0.12,
          vRotY: (Math.random() - 0.5) * 0.12,
          hue: active.hue,
          alpha: 1,
        });

        sound.playStackSlice();
      }
    } else {
      // Z direction
      const deltaZ = active.z - topBlock.z;
      const absDeltaZ = Math.abs(deltaZ);

      if (absDeltaZ <= PERFECT_TOLERANCE) {
        // PERFECT SNAP!
        isPerfect = true;
        newZ = topBlock.z;
      } else if (absDeltaZ >= active.depth) {
        // Complete Miss -> Game Over!
        sound.playBombExplode();
        eng.screenShake = 22;

        eng.fallingDebris.push({
          x: active.x,
          z: active.z,
          width: active.width,
          depth: active.depth,
          y: active.y,
          vy: 0,
          rotX: 0,
          rotY: 0,
          rotZ: 0,
          vRotX: (Math.random() - 0.5) * 0.1,
          vRotY: (Math.random() - 0.5) * 0.1,
          hue: active.hue,
          alpha: 1,
        });

        setGameState('gameover');
        return;
      } else {
        // Partial Overlap - Slice off overhang!
        newDepth = active.depth - absDeltaZ;
        const sliceDepth = absDeltaZ;
        let sliceZ = 0;

        if (deltaZ > 0) {
          newZ = active.z - absDeltaZ / 2;
          sliceZ = active.z + newDepth / 2;
        } else {
          newZ = active.z + absDeltaZ / 2;
          sliceZ = active.z - newDepth / 2;
        }

        eng.fallingDebris.push({
          x: active.x,
          z: sliceZ,
          width: active.width,
          depth: sliceDepth,
          y: active.y,
          vy: -0.5,
          rotX: 0,
          rotY: 0,
          rotZ: 0,
          vRotX: (Math.random() - 0.5) * 0.12,
          vRotY: (Math.random() - 0.5) * 0.12,
          hue: active.hue,
          alpha: 1,
        });

        sound.playStackSlice();
      }
    }

    // Handle Combo Streak & Expansion
    let currentCombo = isPerfect ? combos + 1 : 0;
    setCombos(currentCombo);

    if (isPerfect) {
      eng.perfectFlash = 1;
      sound.playStackPlace(true, currentCombo);

      // Particle explosion around block rim
      for (let p = 0; p < 22; p++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 6 + 2;
        eng.particles.push({
          x: 425 + Math.cos(ang) * (newWidth * 0.6),
          y: 270 - eng.blocks.length * BLOCK_HEIGHT * 0.5 + Math.sin(ang) * 10,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 2,
          color: `hsl(${active.hue}, 100%, 75%)`,
          size: Math.random() * 4 + 2,
          alpha: 1,
          decay: 0.04,
        });
      }

      // If 7 combos in a row -> Stack Expansion Bonus!
      if (currentCombo > 0 && currentCombo % 7 === 0) {
        newWidth = Math.min(INITIAL_SIZE, newWidth + 14);
        newDepth = Math.min(INITIAL_SIZE, newDepth + 14);
        sound.playComboFanfare(5);
        addFloatingText('✨ SIZE EXPANDED! ✨', '#fde047', 425, 200);
      } else {
        const comboLabels = ['', 'PERFECT!', '2x COMBO!', '3x HARMONY!', '4x SYMPHONY!', '5x TRANSCENDENCE! 🔥'];
        const label = comboLabels[Math.min(currentCombo, 5)] || `${currentCombo}x GODLIKE! 👑`;
        addFloatingText(label, '#38bdf8', 425, 220);
      }
    } else {
      sound.playStackPlace(false, 0);
    }

    // Add new solid block to tower
    const newPlacedBlock: Block = {
      x: newX,
      z: newZ,
      width: newWidth,
      depth: newDepth,
      y: active.y,
      hue: active.hue,
    };
    eng.blocks.push(newPlacedBlock);

    // Update Score & Records
    const newFloor = eng.blocks.length - 1;
    setScore(newFloor);
    if (newFloor > highScore) {
      setHighScore(newFloor);
      localStorage.setItem('cyber_stack_highscore', newFloor.toString());
    }

    // Camera Target smoothly rises with tower height
    eng.targetCameraY = newFloor * BLOCK_HEIGHT * 0.82;

    // Spawn Next Active Moving Block
    const nextDir = active.direction === 'x' ? 'z' : 'x';
    const nextHue = (theme.startHue + (newFloor + 1) * theme.hueStep) % 360;
    const speedCurve = Math.min(7.5, 3.4 + newFloor * 0.07);

    eng.activeBlock = {
      x: nextDir === 'x' ? (Math.random() < 0.5 ? -220 : 220) : newX,
      z: nextDir === 'z' ? (Math.random() < 0.5 ? -220 : 220) : newZ,
      width: newWidth,
      depth: newDepth,
      y: (newFloor + 1) * BLOCK_HEIGHT,
      hue: nextHue,
      direction: nextDir,
      speed: speedCurve,
      moveDir: 1,
      range: 220,
    };
  }, [gameState, combos, highScore, selectedThemeId]);

  // Keyboard handler (Spacebar / Up Arrow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'playing') {
          handlePlaceBlock();
        } else if (gameState === 'start' || gameState === 'gameover') {
          handleStart();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handlePlaceBlock]);

  // --- RENDER 3D ISOMETRIC CUBOID HELPER ---
  const renderIsoBlock = (
    ctx: CanvasRenderingContext2D,
    block: { x: number; z: number; width: number; depth: number; y: number; hue: number },
    canvasWidth: number,
    canvasHeight: number,
    camY: number,
    isTopHighlighted: boolean = false
  ) => {
    const halfW = block.width / 2;
    const halfD = block.depth / 2;
    const yBot = block.y - BLOCK_HEIGHT;
    const yTop = block.y;

    // 8 3D Vertices
    const p1 = isoProject(block.x - halfW, yTop, block.z - halfD, canvasWidth, canvasHeight, camY); // Top Back
    const p2 = isoProject(block.x + halfW, yTop, block.z - halfD, canvasWidth, canvasHeight, camY); // Top Right
    const p3 = isoProject(block.x + halfW, yTop, block.z + halfD, canvasWidth, canvasHeight, camY); // Top Front
    const p4 = isoProject(block.x - halfW, yTop, block.z + halfD, canvasWidth, canvasHeight, camY); // Top Left

    const b2 = isoProject(block.x + halfW, yBot, block.z - halfD, canvasWidth, canvasHeight, camY); // Bot Right
    const b3 = isoProject(block.x + halfW, yBot, block.z + halfD, canvasWidth, canvasHeight, camY); // Bot Front
    const b4 = isoProject(block.x - halfW, yBot, block.z + halfD, canvasWidth, canvasHeight, camY); // Bot Left

    // 1. LEFT / FRONT-LEFT FACE (Darker Shadow)
    ctx.beginPath();
    ctx.moveTo(p4.screenX, p4.screenY);
    ctx.lineTo(p3.screenX, p3.screenY);
    ctx.lineTo(b3.screenX, b3.screenY);
    ctx.lineTo(b4.screenX, b4.screenY);
    ctx.closePath();
    ctx.fillStyle = `hsl(${block.hue}, 75%, 35%)`;
    ctx.fill();
    ctx.strokeStyle = `hsl(${block.hue}, 90%, 45%)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. RIGHT / FRONT-RIGHT FACE (Medium Shaded)
    ctx.beginPath();
    ctx.moveTo(p3.screenX, p3.screenY);
    ctx.lineTo(p2.screenX, p2.screenY);
    ctx.lineTo(b2.screenX, b2.screenY);
    ctx.lineTo(b3.screenX, b3.screenY);
    ctx.closePath();
    ctx.fillStyle = `hsl(${block.hue}, 80%, 45%)`;
    ctx.fill();
    ctx.strokeStyle = `hsl(${block.hue}, 90%, 55%)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. TOP FACE (Brightest Highlight)
    ctx.beginPath();
    ctx.moveTo(p1.screenX, p1.screenY);
    ctx.lineTo(p2.screenX, p2.screenY);
    ctx.lineTo(p3.screenX, p3.screenY);
    ctx.lineTo(p4.screenX, p4.screenY);
    ctx.closePath();

    // Top Face Gradient
    const topGrad = ctx.createLinearGradient(p1.screenX, p1.screenY, p3.screenX, p3.screenY);
    topGrad.addColorStop(0, `hsl(${block.hue}, 95%, 68%)`);
    topGrad.addColorStop(1, `hsl(${block.hue}, 90%, 58%)`);
    ctx.fillStyle = topGrad;
    ctx.fill();

    // Top Face Neon Edge Rim
    ctx.strokeStyle = isTopHighlighted ? '#ffffff' : `hsl(${block.hue}, 100%, 82%)`;
    ctx.lineWidth = isTopHighlighted ? 3 : 1.5;
    ctx.stroke();

    // Inner Grid / Holo Highlight line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo((p1.screenX + p2.screenX) / 2, (p1.screenY + p2.screenY) / 2);
    ctx.lineTo((p4.screenX + p3.screenX) / 2, (p4.screenY + p3.screenY) / 2);
    ctx.moveTo((p1.screenX + p4.screenX) / 2, (p1.screenY + p4.screenY) / 2);
    ctx.lineTo((p2.screenX + p3.screenX) / 2, (p2.screenY + p3.screenY) / 2);
    ctx.stroke();
  };

  // --- MAIN RENDER & ANIMATION LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const eng = engineRef.current;
    const theme = THEMES.find((t) => t.id === selectedThemeId) || THEMES[0];

    const tick = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Smooth Camera Tracking
      eng.cameraY += (eng.targetCameraY - eng.cameraY) * 0.08;

      // 2. Active Moving Block Oscillating
      if (gameState === 'playing') {
        const active = eng.activeBlock;
        if (active.direction === 'x') {
          active.x += active.speed * active.moveDir;
          if (active.x > active.range) {
            active.x = active.range;
            active.moveDir = -1;
          } else if (active.x < -active.range) {
            active.x = -active.range;
            active.moveDir = 1;
          }
        } else {
          active.z += active.speed * active.moveDir;
          if (active.z > active.range) {
            active.z = active.range;
            active.moveDir = -1;
          } else if (active.z < -active.range) {
            active.z = -active.range;
            active.moveDir = 1;
          }
        }
      }

      // 3. Falling Debris Physics
      for (let i = eng.fallingDebris.length - 1; i >= 0; i--) {
        const deb = eng.fallingDebris[i];
        deb.y += deb.vy;
        deb.vy -= 0.6; // gravity
        deb.rotX += deb.vRotX;
        deb.rotY += deb.vRotY;
        deb.alpha -= 0.018;

        if (deb.alpha <= 0 || deb.y < -300) {
          eng.fallingDebris.splice(i, 1);
        }
      }

      // 4. Sparkle Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.alpha -= p.decay;
        if (p.alpha <= 0) eng.particles.splice(i, 1);
      }

      // 5. Floating Texts
      for (let i = eng.floatingTexts.length - 1; i >= 0; i--) {
        const ft = eng.floatingTexts[i];
        ft.y -= 1.2;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) eng.floatingTexts.splice(i, 1);
      }

      // Screen Shake damping
      if (eng.screenShake > 0) {
        eng.screenShake *= 0.88;
        if (eng.screenShake < 0.2) eng.screenShake = 0;
      }

      // Perfect Flash damping
      if (eng.perfectFlash > 0) {
        eng.perfectFlash -= 0.06;
        if (eng.perfectFlash < 0) eng.perfectFlash = 0;
      }

      // ==========================================
      // 6. RENDER GRAPHICS
      // ==========================================
      ctx.save();

      // Screen Shake translation
      if (eng.screenShake > 0) {
        const sx = (Math.random() - 0.5) * eng.screenShake;
        const sy = (Math.random() - 0.5) * eng.screenShake;
        ctx.translate(sx, sy);
      }

      // Dynamic Sky Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, theme.bgGradStart);
      bgGrad.addColorStop(1, theme.bgGradEnd);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Cyber Grid / Distant Horizon Wireframe
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let gy = 0; gy < height; gy += 35) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // Render Stacked Tower Blocks (from bottom to top)
      const renderStartIndex = Math.max(0, eng.blocks.length - 24);
      for (let b = renderStartIndex; b < eng.blocks.length; b++) {
        const isLatest = b === eng.blocks.length - 1;
        renderIsoBlock(ctx, eng.blocks[b], width, height, eng.cameraY, isLatest && eng.perfectFlash > 0);
      }

      // Render Active Moving Block
      if (gameState === 'playing') {
        renderIsoBlock(ctx, eng.activeBlock, width, height, eng.cameraY, false);
      }

      // Render Falling Debris Slices
      eng.fallingDebris.forEach((deb) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, deb.alpha);
        renderIsoBlock(ctx, deb, width, height, eng.cameraY, false);
        ctx.restore();
      });

      // Render Sparkle Burst Particles
      eng.particles.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Floating Combo / Score Texts
      eng.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.font = '900 22px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 16;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // Perfect Stack Glow Flash Overlay
      if (eng.perfectFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${eng.perfectFlash * 0.18})`;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.restore();

      eng.animationFrameId = requestAnimationFrame(tick);
    };

    eng.animationFrameId = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      cancelAnimationFrame(eng.animationFrameId);
    };
  }, [gameState, selectedThemeId]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center select-none">
      {/* Container */}
      <div className="relative w-full bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Top HUD */}
        <div className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
          {/* Height Score & Combos */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/80 border border-cyan-500/30 rounded-xl text-cyan-400 font-black text-sm">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>FLOOR: {score}</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300 font-bold text-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>RECORD: {highScore}</span>
            </div>

            {combos >= 2 && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/80 border border-rose-500/40 text-rose-300 font-extrabold text-xs rounded-xl animate-bounce">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>{combos}x COMBO</span>
              </div>
            )}
          </div>

          {/* Controls & Theme Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowThemes(true)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold px-2.5"
              title="Color Theme"
            >
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Theme</span>
            </button>

            <button
              onClick={toggleSound}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div
          className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[560px] flex items-center justify-center cursor-pointer touch-none"
          onPointerDown={(e) => {
            e.preventDefault();
            if (gameState === 'playing') {
              handlePlaceBlock();
            } else if (gameState === 'start' || gameState === 'gameover') {
              handleStart();
            }
          }}
        >
          <canvas
            ref={canvasRef}
            width={850}
            height={540}
            className="w-full h-full object-cover"
          />

          {/* Start Screen Overlay */}
          {gameState === 'start' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/30 mb-4 animate-bounce">
                <Layers className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
                CYBER STACK <span className="text-cyan-400">3D</span>
              </h2>
              <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
                Stack moving isometric blocks to build an infinite neon megacity tower! Align perfectly to play harmonic synth chords, trigger mega combo streaks, and expand your tower base!
              </p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStart();
                }}
                className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>TAP TO BUILD</span>
              </button>

              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-6 mt-4 sm:mt-8 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-slate-800 rounded border border-slate-700">TAP / SPACEBAR</span>
                  <span>Place Slab</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-slate-800 rounded border border-slate-700">PERFECT STACK</span>
                  <span>Harmonic Chords</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-cyan-950 text-cyan-300 rounded border border-cyan-800">7x COMBO</span>
                  <span>Expand Base</span>
                </div>
              </div>
            </div>
          )}

          {/* Game Over Screen */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-3">
                <span className="text-3xl">🏙️</span>
              </div>
              <h3 className="text-2xl font-black text-rose-400 tracking-wide mb-1">TOWER COLLAPSED!</h3>
              <p className="text-xs text-slate-400 mb-4">The moving block completely missed the base</p>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-72 mb-6 flex justify-around">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Tower Height</div>
                  <div className="text-xl font-black text-white">{score} FLOORS</div>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Best Record</div>
                  <div className="text-xl font-black text-amber-400">{highScore}</div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestart();
                }}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>BUILD AGAIN</span>
              </button>
            </div>
          )}
        </div>

        {/* Theme Chooser Modal */}
        {showThemes && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-40 p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-md flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-white font-black text-xl">
                <Palette className="w-5 h-5 text-indigo-400" />
                <span>SELECT CYBER THEME</span>
              </div>
              <button
                onClick={() => setShowThemes(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Done
              </button>
            </div>

            <div className="w-full max-w-md grid grid-cols-1 gap-3">
              {THEMES.map((theme) => {
                const isSelected = selectedThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setSelectedThemeId(theme.id);
                      sound.playClick();
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-400 shadow-md shadow-indigo-500/20'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shadow-inner"
                        style={{ background: `linear-gradient(135deg, hsl(${theme.startHue}, 90%, 60%), hsl(${(theme.startHue + 60) % 360}, 90%, 50%))` }}
                      />
                      <div className="text-sm font-bold text-white">{theme.name}</div>
                    </div>
                    {isSelected && <span className="text-xs text-indigo-400 font-bold">Active</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
