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
  Music,
  Zap,
  Activity
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

interface Tile {
  id: number;
  x: number; // -180 to +180 relative to lane center
  z: number; // 0 (near/bounce) to 1200 (far)
  width: number;
  height: number;
  color: string;
  isHit: boolean;
  isPerfect: boolean;
  hasGem: boolean;
}

const TRACKS = [
  { id: 'track-1', title: 'Cyber Neon Velocity', bpm: 128, color: '#00f0ff' },
  { id: 'track-2', title: 'Tokyo Midnight Overdrive', bpm: 136, color: '#f43f5e' },
  { id: 'track-3', title: 'Quantum Horizon Rush', bpm: 145, color: '#a855f7' },
];

const TILE_COLORS = ['#f43f5e', '#00f0ff', '#facc15', '#a855f7', '#34d399', '#fb923c'];

export const CyberNeonTileHop: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Match State
  const [stage, setStage] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [selectedTrack, setSelectedTrack] = useState(TRACKS[0]);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_tile_hop_high') || '0', 10);
  });
  const [combo, setCombo] = useState<number>(0);
  const [comboText, setComboText] = useState<string>('');
  const [gemsCollected, setGemsCollected] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // 60 FPS Physics & 3D Rhythm Engine Ref
  const engineRef = useRef<{
    ballX: number; // -200 to +200
    targetBallX: number;
    ballY: number; // bounce height
    ballVy: number;
    isBouncingDown: boolean;
    bounceProgress: number; // 0 to 1 cycle
    bounceDuration: number; // ms per bounce
    lastBounceTime: number;

    tiles: Tile[];
    nextTileId: number;
    scrollSpeed: number; // z units per frame

    ripples: { x: number; y: number; radius: number; alpha: number; color: string }[];
    particles: { x: number; y: number; vx: number; vy: number; color: string; alpha: number; size: number }[];

    audioStep: number;
  }>({
    ballX: 0,
    targetBallX: 0,
    ballY: 0,
    ballVy: 0,
    isBouncingDown: false,
    bounceProgress: 0,
    bounceDuration: 450,
    lastBounceTime: performance.now(),

    tiles: [],
    nextTileId: 1,
    scrollSpeed: 7.5,

    ripples: [],
    particles: [],
    audioStep: 0,
  });

  // Generate continuous procedural floating tiles path
  const generateInitialTiles = () => {
    const tiles: Tile[] = [];
    let currentZ = 120;
    let prevX = 0;

    for (let i = 0; i < 20; i++) {
      const offsetX = i === 0 ? 0 : Math.max(-160, Math.min(160, prevX + (Math.random() - 0.5) * 160));
      prevX = offsetX;

      tiles.push({
        id: i + 1,
        x: offsetX,
        z: currentZ,
        width: 140,
        height: 60,
        color: TILE_COLORS[i % TILE_COLORS.length],
        isHit: false,
        isPerfect: false,
        hasGem: i > 2 && Math.random() < 0.35,
      });

      currentZ += 180;
    }
    return tiles;
  };

  // Start Rhythm Hop Game
  const startGame = () => {
    sound.playClick();
    const eng = engineRef.current;
    eng.ballX = 0;
    eng.targetBallX = 0;
    eng.ballY = 0;
    eng.bounceProgress = 0;
    eng.bounceDuration = (60 / selectedTrack.bpm) * 1000;
    eng.scrollSpeed = (selectedTrack.bpm / 128) * 7.5;
    eng.tiles = generateInitialTiles();
    eng.nextTileId = 21;
    eng.ripples = [];
    eng.particles = [];
    eng.audioStep = 0;
    eng.lastBounceTime = performance.now();

    setScore(0);
    setCombo(0);
    setComboText('');
    setGemsCollected(0);
    setStage('playing');
    sound.playLaser();
  };

  // Pointer Movement (Touch Drag & Mouse Steer)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stage !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const normalized = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to +1
    engineRef.current.targetBallX = normalized * 180;
  };

  // Keyboard Steer Left / Right
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        eng.targetBallX = Math.max(-180, eng.targetBallX - 45);
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        eng.targetBallX = Math.min(180, eng.targetBallX + 45);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 60 FPS 3D Perspective Render & Bounce Loop
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
      const now = performance.now();

      // ==========================================
      // 1. SKY & SYNTH TUNNEL BACKGROUND
      // ==========================================
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);

      // Neon Horizon Glow
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#090518');
      bgGrad.addColorStop(0.5, '#0d0b24');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 3D Perspective Grid Floor Lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 1.5;
      const horizonY = 180;
      for (let i = -6; i <= 6; i++) {
        ctx.beginPath();
        ctx.moveTo(W / 2 + i * 20, horizonY);
        ctx.lineTo(W / 2 + i * 160, H);
        ctx.stroke();
      }

      // ==========================================
      // 2. 3D PERSPECTIVE CALCULATIONS
      // ==========================================
      // Camera perspective projector (maps 3D x, y, z to 2D screen)
      const project = (x: number, y: number, z: number) => {
        const perspective = 400 / (z + 200);
        const screenX = W / 2 + x * perspective * 2.8;
        const screenY = H - 160 - y * perspective * 2.5 - (1 - perspective) * 380;
        const scale = perspective * 2.2;
        return { screenX, screenY, scale };
      };

      // ==========================================
      // 3. UPDATE RHYTHM BOUNCE & TILES SCROLL
      // ==========================================
      if (stage === 'playing') {
        // Smooth ball horizontal interpolation towards target
        eng.ballX += (eng.targetBallX - eng.ballX) * 0.22;

        // Bounce Cycle (Parabolic Arc)
        const elapsed = now - eng.lastBounceTime;
        const progress = (elapsed % eng.bounceDuration) / eng.bounceDuration; // 0 to 1
        eng.bounceProgress = progress;

        // Parabolic bounce height: y = 4 * maxH * t * (1 - t)
        const maxJumpHeight = 160;
        eng.ballY = 4 * maxJumpHeight * progress * (1 - progress);

        // Scroll Tiles towards camera
        eng.tiles.forEach((t) => {
          t.z -= eng.scrollSpeed;
        });

        // Trigger Landing at the bottom of the bounce arc (progress near 0 / 1)
        if (progress > 0.92 || progress < 0.08) {
          // Find the tile closest to bounce point (Z near 120)
          const targetTile = eng.tiles.find((t) => Math.abs(t.z - 120) < 40 && !t.isHit);

          if (targetTile) {
            targetTile.isHit = true;
            eng.lastBounceTime = now; // reset cycle

            // Measure precision distance from tile center
            const distFromCenter = Math.abs(eng.ballX - targetTile.x);
            const isInside = distFromCenter <= targetTile.width / 2 + 15;

            if (isInside) {
              const isPerf = distFromCenter <= 25;
              targetTile.isPerfect = isPerf;

              // Play Procedural Web Audio Synth Melody Note
              sound.playCollect();

              // Add Shockwave Ripple
              const p = project(targetTile.x, 0, targetTile.z);
              eng.ripples.push({
                x: p.screenX,
                y: p.screenY,
                radius: 10,
                alpha: 1.0,
                color: targetTile.color,
              });

              // Add Particles
              for (let i = 0; i < (isPerf ? 16 : 8); i++) {
                eng.particles.push({
                  x: p.screenX,
                  y: p.screenY,
                  vx: (Math.random() - 0.5) * 8,
                  vy: -Math.random() * 8,
                  color: targetTile.color,
                  alpha: 1.0,
                  size: 4 + Math.random() * 4,
                });
              }

              // Update Score & Combos
              setScore((prev) => {
                const add = isPerf ? 150 : 80;
                const ns = prev + add;
                if (ns > highScore) {
                  setHighScore(ns);
                  localStorage.setItem('cyber_tile_hop_high', ns.toString());
                }
                return ns;
              });

              setCombo((prev) => {
                const nc = prev + 1;
                if (isPerf) {
                  setComboText(`⚡ PERFECT! x${nc}`);
                } else {
                  setComboText(`✨ GREAT!`);
                }
                return nc;
              });

              if (targetTile.hasGem) {
                setGemsCollected((prev) => prev + 1);
                sound.playWin();
              }
            } else {
              // Missed Tile -> Fall into the abyss!
              setStage('gameover');
              sound.playGameOver();
            }
          }
        }

        // Recycle passed tiles & spawn new ones
        eng.tiles = eng.tiles.filter((t) => t.z > -100);
        if (eng.tiles.length < 20) {
          const lastTile = eng.tiles[eng.tiles.length - 1];
          const lastZ = lastTile ? lastTile.z : 1200;
          const lastX = lastTile ? lastTile.x : 0;
          const newX = Math.max(-160, Math.min(160, lastX + (Math.random() - 0.5) * 160));

          eng.tiles.push({
            id: eng.nextTileId++,
            x: newX,
            z: lastZ + 180,
            width: 140,
            height: 60,
            color: TILE_COLORS[eng.nextTileId % TILE_COLORS.length],
            isHit: false,
            isPerfect: false,
            hasGem: Math.random() < 0.35,
          });
        }
      }

      // ==========================================
      // 4. DRAW 3D FLOATING NEON TILES (SORTED BY Z)
      // ==========================================
      const sortedTiles = [...eng.tiles].sort((a, b) => b.z - a.z);

      sortedTiles.forEach((tile) => {
        const p = project(tile.x, 0, tile.z);
        if (p.screenY < horizonY || p.scale <= 0) return;

        const rw = (tile.width / 2) * p.scale;
        const rh = (tile.height / 2) * p.scale;

        ctx.save();
        ctx.translate(p.screenX, p.screenY);

        // Tile Bottom 3D Depth Extrusion
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(0, rh * 0.4, rw, rh, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glowing Top Surface
        ctx.fillStyle = tile.color;
        ctx.shadowColor = tile.color;
        ctx.shadowBlur = tile.isHit ? 20 : 10;
        ctx.beginPath();
        ctx.ellipse(0, 0, rw, rh * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner White Target Center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, rw * 0.35, rh * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Floating Diamond Gem
        if (tile.hasGem) {
          ctx.fillStyle = '#fde047';
          ctx.shadowColor = '#fde047';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(0, -rh * 1.4);
          ctx.lineTo(rw * 0.2, -rh * 0.9);
          ctx.lineTo(0, -rh * 0.4);
          ctx.lineTo(-rw * 0.2, -rh * 0.9);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      // ==========================================
      // 5. DRAW SHOCKWAVE RIPPLES & PARTICLES
      // ==========================================
      eng.ripples.forEach((r) => {
        r.radius += 3.5;
        r.alpha -= 0.04;
        if (r.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = r.alpha;
          ctx.strokeStyle = r.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });
      eng.ripples = eng.ripples.filter((r) => r.alpha > 0);

      eng.particles.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.03;
        if (pt.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
      eng.particles = eng.particles.filter((pt) => pt.alpha > 0);

      // ==========================================
      // 6. DRAW BOUNCING GLOWING CYBER BALL
      // ==========================================
      if (stage === 'playing') {
        const bp = project(eng.ballX, eng.ballY, 120);

        // Ball Shadow on Floor
        const shadowP = project(eng.ballX, 0, 120);
        const shadowSize = Math.max(8, 28 * (1 - eng.ballY / 160));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(shadowP.screenX, shadowP.screenY, shadowSize * 1.4, shadowSize * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glowing 3D Neon Ball
        ctx.save();
        ctx.translate(bp.screenX, bp.screenY);
        const bGrad = ctx.createRadialGradient(-7, -7, 2, 0, 0, 22);
        bGrad.addColorStop(0, '#ffffff');
        bGrad.addColorStop(0.4, '#00f0ff');
        bGrad.addColorStop(1, '#0284c7');
        ctx.fillStyle = bGrad;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    };

    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [highScore, selectedTrack, stage]);

  return (
    <div
      ref={containerRef}
      id="cyber-tile-hop-arena"
      className="relative w-full max-w-md mx-auto flex flex-col items-center select-none font-sans px-2 py-1 gap-2.5"
    >
      {/* ========================================================================= */}
      {/* 1. TOP SCORE & BEST HUD (OUTSIDE CANVAS BOX)                              */}
      {/* ========================================================================= */}
      <div className="w-full p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl flex items-center justify-between">
        {/* Current Score */}
        <div className="text-left">
          <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">SCORE</div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono leading-none tracking-tight">
            {score}
          </div>
        </div>

        {/* Combo Banner */}
        <div className="text-center">
          {comboText ? (
            <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black animate-bounce">
              {comboText}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-400 text-xs font-bold font-mono">
              <Flame className="w-3.5 h-3.5 text-pink-400" /> HOP BEAT
            </div>
          )}
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
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-400 text-slate-300 transition-all cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 3D TILE HOP CANVAS                                                     */}
      {/* ========================================================================= */}
      <div
        onPointerMove={handlePointerMove}
        className="relative w-full aspect-[540/780] max-h-[62vh] sm:max-h-[68vh] flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl border-2 border-cyan-500/40 bg-black cursor-ew-resize touch-none"
      >
        <canvas
          ref={canvasRef}
          width={540}
          height={780}
          className="w-full h-full object-contain block touch-none"
        />

        {/* Menu Overlay inside canvas */}
        {stage === 'menu' && (
          <div className="absolute inset-0 z-20 bg-slate-950/92 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/30">
              <Music className="w-9 h-9 text-cyan-400 animate-bounce" />
            </div>

            <div>
              <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">RHYTHM EDM RUSH</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-0.5">CYBER TILE HOP 3D</h2>
              <p className="text-xs text-slate-400 mt-1">Bounce to the synthwave beat on floating neon platforms</p>
            </div>

            {/* Track Selector */}
            <div className="w-full space-y-1.5 text-left">
              <div className="text-[10px] font-black uppercase text-slate-400">Select EDM Track:</div>
              {TRACKS.map((track) => (
                <button
                  key={track.id}
                  onClick={() => setSelectedTrack(track)}
                  className={`w-full p-2.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                    selectedTrack.id === track.id
                      ? 'bg-slate-800 border-cyan-400 shadow-md shadow-cyan-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: track.color }} />
                    <span className="text-xs font-bold text-white">{track.title}</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold">{track.bpm} BPM</span>
                </button>
              ))}
            </div>

            <button
              onClick={startGame}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 active:scale-95 text-white font-black text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" /> START HOPPING
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
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">FELL OFF THE PLATFORM!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GAME OVER</h2>
            </div>

            <div className="w-full p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-white font-mono text-xl font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Max Combo:</span>
                <span className="text-amber-300 font-mono text-xl font-black">{combo}x</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Best Record:</span>
                <span className="text-cyan-300 font-mono text-xl font-black">{highScore}</span>
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 active:scale-95 text-white font-black text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" /> TRY AGAIN
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM CONTROLS HINT (OUTSIDE CANVAS BOX)                              */}
      {/* ========================================================================= */}
      <div className="text-xs font-bold text-slate-400 text-center">
        👈 Drag / Swipe with finger or mouse to steer ball onto neon tiles 👉
      </div>
    </div>
  );
};
