import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Sparkles,
  Zap,
  Flame,
  Layers,
  ChevronRight,
  Palette,
  Play,
  Share2
} from 'lucide-react';
import { sound } from '../../utils/audio';

// --- TYPES ---
interface Sector {
  type: 'safe' | 'danger' | 'empty';
  shattered?: boolean;
}

interface Splatter {
  angle: number;
  radiusOffset: number;
  size: number;
  color: string;
}

interface DiscTier {
  id: number;
  y: number; // vertical height in world units
  sectors: Sector[]; // array of sectors around 360 deg
  splatters: Splatter[];
  shattered: boolean;
  shatterProgress?: number;
  shatterPieces?: { x: number; y: number; vx: number; vy: number; rot: number; vRot: number; color: string }[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity?: number;
}

interface BallSkin {
  id: string;
  name: string;
  color: string;
  trailColor: string;
  glowColor: string;
  price: number;
  icon: string;
}

const BALL_SKINS: BallSkin[] = [
  { id: 'neon-pulse', name: 'Neon Cyan', color: '#06b6d4', trailColor: '#22d3ee', glowColor: '#0891b2', price: 0, icon: '⚡' },
  { id: 'solar-flare', name: 'Solar Flame', color: '#f97316', trailColor: '#fb923c', glowColor: '#ea580c', price: 150, icon: '🔥' },
  { id: 'toxic-matrix', name: 'Toxic Matrix', color: '#10b981', trailColor: '#34d399', glowColor: '#059669', price: 300, icon: '🧪' },
  { id: 'void-crystal', name: 'Void Crystal', color: '#a855f7', trailColor: '#c084fc', glowColor: '#9333ea', price: 500, icon: '🔮' },
  { id: 'golden-glory', name: 'Golden Sun', color: '#eab308', trailColor: '#facc15', glowColor: '#ca8a04', price: 800, icon: '👑' },
];

const THEMES = [
  { id: 'cyber', name: 'Cyberpunk', bgTop: '#090d16', bgBottom: '#1e1035', pole: '#1e293b', safe: '#06b6d4', danger: '#ef4444' },
  { id: 'sunset', name: 'Solar Sunset', bgTop: '#1a0b18', bgBottom: '#2d132c', pole: '#331832', safe: '#f59e0b', danger: '#ec4899' },
  { id: 'emerald', name: 'Neon Jungle', bgTop: '#061a14', bgBottom: '#0d2d22', pole: '#133e30', safe: '#10b981', danger: '#f43f5e' },
  { id: 'amethyst', name: 'Deep Amethyst', bgTop: '#140c24', bgBottom: '#241242', pole: '#2e1b54', safe: '#8b5cf6', danger: '#f97316' },
];

const SECTORS_PER_DISC = 12;
const DISC_SPACING = 85;
const BOUNCE_VELOCITY = -9.5;
const GRAVITY = 0.42;

export const HelixJump3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High-level Game States
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('helix_jump_highscore') || '0', 10);
  });
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('helix_jump_coins') || '120', 10);
  });
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'levelcomplete'>('start');
  const [activeSkin, setActiveSkin] = useState<string>('neon-pulse');
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('helix_jump_skins') || '["neon-pulse"]');
  });
  const [activeThemeIndex, setActiveThemeIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());
  const [showShop, setShowShop] = useState<boolean>(false);
  const [supernovaActive, setSupernovaActive] = useState<boolean>(false);
  const [comboCount, setComboCount] = useState<number>(0);

  // Game Engine Refs
  const engineRef = useRef({
    towerRotation: 0, // radians
    towerVelocity: 0,
    ballY: 0, // world Y
    ballVy: 0,
    ballSquashX: 1,
    ballSquashY: 1,
    cameraY: 0,
    currentTierIndex: 0,
    totalTiers: 15,
    streak: 0,
    discs: [] as DiscTier[],
    particles: [] as Particle[],
    trail: [] as { y: number; alpha: number; size: number }[],
    isDragging: false,
    lastMouseX: 0,
    screenShake: 0,
    animationFrameId: 0,
  });

  // Generate Levels
  const generateLevel = useCallback((lvl: number) => {
    const totalTiers = Math.min(12 + lvl * 3, 35);
    const discs: DiscTier[] = [];

    for (let i = 0; i < totalTiers; i++) {
      const sectors: Sector[] = [];
      const isFirst = i === 0;
      const isLast = i === totalTiers - 1;

      if (isFirst) {
        // First disc has 2 open gaps and no danger
        for (let s = 0; s < SECTORS_PER_DISC; s++) {
          if (s === 2 || s === 3) {
            sectors.push({ type: 'empty' });
          } else {
            sectors.push({ type: 'safe' });
          }
        }
      } else if (isLast) {
        // Finish platform: complete safe disc
        for (let s = 0; s < SECTORS_PER_DISC; s++) {
          sectors.push({ type: 'safe' });
        }
      } else {
        // Standard disc
        const emptyCount = Math.max(1, 4 - Math.floor(lvl / 5)); // 1 to 3 gaps
        const dangerCount = Math.min(Math.floor(lvl * 0.8) + 1, 4);

        const emptyStart = Math.floor(Math.random() * SECTORS_PER_DISC);
        const dangerStart = (emptyStart + emptyCount + 1 + Math.floor(Math.random() * 3)) % SECTORS_PER_DISC;

        for (let s = 0; s < SECTORS_PER_DISC; s++) {
          const isEmpty = (s >= emptyStart && s < emptyStart + emptyCount) || (s + SECTORS_PER_DISC >= emptyStart && s + SECTORS_PER_DISC < emptyStart + emptyCount);
          const isDanger = (s >= dangerStart && s < dangerStart + dangerCount) || (s + SECTORS_PER_DISC >= dangerStart && s + SECTORS_PER_DISC < dangerStart + dangerCount);

          if (isEmpty) {
            sectors.push({ type: 'empty' });
          } else if (isDanger && !isEmpty) {
            sectors.push({ type: 'danger' });
          } else {
            sectors.push({ type: 'safe' });
          }
        }
      }

      discs.push({
        id: i,
        y: i * DISC_SPACING,
        sectors,
        splatters: [],
        shattered: false,
      });
    }

    const eng = engineRef.current;
    eng.discs = discs;
    eng.totalTiers = totalTiers;
    eng.currentTierIndex = 0;
    eng.ballY = -25;
    eng.ballVy = 0;
    eng.cameraY = -25;
    eng.towerRotation = 0;
    eng.towerVelocity = 0;
    eng.streak = 0;
    eng.particles = [];
    eng.trail = [];
    eng.screenShake = 0;
    setComboCount(0);
    setSupernovaActive(false);
  }, []);

  // Initialize on mount or level change
  useEffect(() => {
    generateLevel(level);
  }, [level, generateLevel]);

  // Handle Highscore & Coins Save
  const addCoins = (amount: number) => {
    setCoins((prev) => {
      const next = prev + amount;
      localStorage.setItem('helix_jump_coins', next.toString());
      return next;
    });
  };

  const updateScore = (pts: number) => {
    setScore((prev) => {
      const next = prev + pts;
      if (next > highScore) {
        setHighScore(next);
        localStorage.setItem('helix_jump_highscore', next.toString());
      }
      return next;
    });
  };

  // Start / Restart Game
  const handleStartGame = () => {
    generateLevel(level);
    setGameState('playing');
    sound.playPowerup();
  };

  const handleRestartLevel = () => {
    generateLevel(level);
    setGameState('playing');
    sound.playPowerup();
  };

  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    generateLevel(nextLvl);
    setGameState('playing');
    sound.playLevelComplete?.();
  };

  // Sound toggle
  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Buy Skin
  const handleBuySkin = (skin: BallSkin) => {
    if (unlockedSkins.includes(skin.id)) {
      setActiveSkin(skin.id);
      sound.playClick();
      return;
    }
    if (coins >= skin.price) {
      const newCoins = coins - skin.price;
      const newUnlocked = [...unlockedSkins, skin.id];
      setCoins(newCoins);
      setUnlockedSkins(newUnlocked);
      setActiveSkin(skin.id);
      localStorage.setItem('helix_jump_coins', newCoins.toString());
      localStorage.setItem('helix_jump_skins', JSON.stringify(newUnlocked));
      sound.playScore();
    } else {
      sound.playLaser();
    }
  };

  // --- CANVAS RENDER & PHYSICS LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const eng = engineRef.current;

    const currentSkin = BALL_SKINS.find((s) => s.id === activeSkin) || BALL_SKINS[0];
    const currentTheme = THEMES[activeThemeIndex];

    const loop = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;

      // 1. UPDATE PHYSICS (if playing)
      if (gameState === 'playing') {
        // Tower inertia dampening
        eng.towerRotation += eng.towerVelocity;
        eng.towerVelocity *= 0.88;

        // Ball gravity
        eng.ballVy += GRAVITY;
        eng.ballY += eng.ballVy;

        // Ball squash restoration
        eng.ballSquashX += (1 - eng.ballSquashX) * 0.2;
        eng.ballSquashY += (1 - eng.ballSquashY) * 0.2;

        // Add trail
        eng.trail.push({ y: eng.ballY, alpha: 1, size: 14 });
        if (eng.trail.length > 12) eng.trail.shift();
        eng.trail.forEach((t) => (t.alpha *= 0.82));

        // Smooth camera follow
        const targetCameraY = eng.ballY - 140;
        eng.cameraY += (targetCameraY - eng.cameraY) * 0.12;

        // Check Disc Collisions
        const ballWorldY = eng.ballY;
        const currentTier = eng.discs[eng.currentTierIndex];

        if (currentTier && !currentTier.shattered) {
          const discY = currentTier.y;

          // Ball is near the plane of the current disc
          if (ballWorldY >= discY - 10 && ballWorldY <= discY + 18 && eng.ballVy > 0) {
            // Determine which sector ball is over
            // Ball is fixed at front (angle 0 in world space)
            // Tower rotation offsets the sector angle
            const twoPi = Math.PI * 2;
            let normRot = (-eng.towerRotation) % twoPi;
            if (normRot < 0) normRot += twoPi;

            const sectorAngle = twoPi / SECTORS_PER_DISC;
            // The ball is positioned at angle PI/2 (front-facing bottom)
            const relativeAngle = (Math.PI / 2 + normRot) % twoPi;
            const sectorIndex = Math.floor(relativeAngle / sectorAngle) % SECTORS_PER_DISC;
            const sector = currentTier.sectors[sectorIndex];

            if (sector.type === 'empty') {
              // Ball passes through gap!
              eng.streak += 1;
              setComboCount(eng.streak);

              const pts = 10 * eng.streak;
              updateScore(pts);
              sound.playHelixPass(eng.streak);

              if (eng.streak >= 3) {
                setSupernovaActive(true);
              }

              // Advance to next tier index
              eng.currentTierIndex += 1;

              // Check if reached finish platform
              if (eng.currentTierIndex >= eng.totalTiers - 1) {
                // Completed Level!
                setGameState('levelcomplete');
                sound.playLevelComplete?.();
                addCoins(50 + level * 10);
                updateScore(500);

                // Spawn victory confetti
                for (let p = 0; p < 80; p++) {
                  eng.particles.push({
                    x: width / 2 + (Math.random() * 200 - 100),
                    y: height / 2 + (Math.random() * 200 - 100),
                    vx: (Math.random() - 0.5) * 12,
                    vy: (Math.random() - 0.7) * 14,
                    color: ['#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#fbbf24'][Math.floor(Math.random() * 5)],
                    size: Math.random() * 8 + 4,
                    alpha: 1,
                    decay: 0.015,
                    gravity: 0.3,
                  });
                }
              }
            } else if (eng.streak >= 3) {
              // SUPERNOVA IMPACT: Shatter the plate!
              currentTier.shattered = true;
              currentTier.shatterProgress = 0;
              currentTier.shatterPieces = [];

              // Create shattering explosion fragments
              const pieceColors = [currentTheme.safe, '#ffffff', currentSkin.color];
              for (let p = 0; p < 18; p++) {
                const pAngle = (p / 18) * Math.PI * 2;
                const spd = Math.random() * 8 + 4;
                currentTier.shatterPieces.push({
                  x: Math.cos(pAngle) * 60,
                  y: Math.sin(pAngle) * 30,
                  vx: Math.cos(pAngle) * spd,
                  vy: Math.sin(pAngle) * spd * 0.5 + Math.random() * 3,
                  rot: Math.random() * Math.PI,
                  vRot: (Math.random() - 0.5) * 0.3,
                  color: pieceColors[p % pieceColors.length],
                });
              }

              sound.playHelixShatter();
              eng.screenShake = 12;
              updateScore(100);
              addCoins(3);

              // Don't bounce fully, smash down into next tier
              eng.ballVy = 4;
              eng.currentTierIndex += 1;

              if (eng.currentTierIndex >= eng.totalTiers - 1) {
                setGameState('levelcomplete');
                sound.playLevelComplete?.();
                addCoins(50 + level * 10);
              }
            } else if (sector.type === 'danger') {
              // Game Over! Hit Hazard
              sound.playCrash();
              eng.screenShake = 18;
              setGameState('gameover');

              // Death particles
              for (let p = 0; p < 35; p++) {
                eng.particles.push({
                  x: width / 2,
                  y: height / 2 + 50,
                  vx: (Math.random() - 0.5) * 14,
                  vy: (Math.random() - 0.5) * 14,
                  color: '#ef4444',
                  size: Math.random() * 7 + 3,
                  alpha: 1,
                  decay: 0.02,
                  gravity: 0.25,
                });
              }
            } else {
              // Normal Bounce on Safe Plate
              eng.ballY = discY - 12;
              eng.ballVy = BOUNCE_VELOCITY;
              eng.ballSquashX = 1.45;
              eng.ballSquashY = 0.65;
              eng.streak = 0;
              setComboCount(0);
              setSupernovaActive(false);

              sound.playHelixBounce();

              // Add paint splatter to disc
              currentTier.splatters.push({
                angle: relativeAngle,
                radiusOffset: (Math.random() - 0.5) * 20,
                size: Math.random() * 10 + 12,
                color: currentSkin.color,
              });

              // Add bounce spark particles
              for (let p = 0; p < 6; p++) {
                eng.particles.push({
                  x: width / 2 + (Math.random() * 20 - 10),
                  y: height / 2 + 65,
                  vx: (Math.random() - 0.5) * 6,
                  vy: -Math.random() * 4 - 2,
                  color: currentSkin.color,
                  size: Math.random() * 4 + 2,
                  alpha: 1,
                  decay: 0.04,
                });
              }
            }
          }
        }
      }

      // Update screen shake
      if (eng.screenShake > 0) {
        eng.screenShake *= 0.85;
        if (eng.screenShake < 0.2) eng.screenShake = 0;
      }

      // Update particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.gravity) p.vy += p.gravity;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          eng.particles.splice(i, 1);
        }
      }

      // 2. RENDER STAGE
      ctx.save();

      // Screen Shake offset
      if (eng.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * eng.screenShake;
        const shakeY = (Math.random() - 0.5) * eng.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      // Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, currentTheme.bgTop);
      bgGrad.addColorStop(1, currentTheme.bgBottom);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Central Column & Tower Geometry Constants
      const centerX = width / 2;
      const poleRadius = 38;
      const discRadiusX = 145;
      const discRadiusY = 52; // 2.5D Isometric Tilt ratio

      // Draw Center Pole Cylinder
      const poleGrad = ctx.createLinearGradient(centerX - poleRadius, 0, centerX + poleRadius, 0);
      poleGrad.addColorStop(0, '#0f172a');
      poleGrad.addColorStop(0.35, '#334155');
      poleGrad.addColorStop(0.7, '#1e293b');
      poleGrad.addColorStop(1, '#020617');

      ctx.fillStyle = poleGrad;
      ctx.fillRect(centerX - poleRadius, 0, poleRadius * 2, height);

      // Neon Pole Edge Glow
      ctx.strokeStyle = `${currentSkin.color}44`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - poleRadius, 0);
      ctx.lineTo(centerX - poleRadius, height);
      ctx.moveTo(centerX + poleRadius, 0);
      ctx.lineTo(centerX + poleRadius, height);
      ctx.stroke();

      // RENDER HELIX DISCS (Sorted by depth/camera relative Y)
      const visibleDiscs = eng.discs.filter((d) => {
        const screenY = d.y - eng.cameraY + height / 2;
        return screenY >= -100 && screenY <= height + 150;
      });

      // Draw each visible disc
      visibleDiscs.forEach((disc) => {
        const screenY = disc.y - eng.cameraY + height / 2;

        if (disc.shattered && disc.shatterPieces) {
          // Render shattering exploding shards
          disc.shatterProgress = (disc.shatterProgress || 0) + 0.05;
          ctx.save();
          ctx.translate(centerX, screenY);
          disc.shatterPieces.forEach((piece) => {
            piece.x += piece.vx;
            piece.y += piece.vy;
            piece.rot += piece.vRot;
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate(piece.rot);
            ctx.fillStyle = piece.color;
            ctx.globalAlpha = Math.max(0, 1 - (disc.shatterProgress || 0));
            ctx.fillRect(-12, -8, 24, 16);
            ctx.restore();
          });
          ctx.restore();
          return;
        }

        // Draw sectors for this disc
        const twoPi = Math.PI * 2;
        const sectorAngle = twoPi / SECTORS_PER_DISC;

        // Render back sectors first, then front sectors (depth sorting)
        // Sector angles relative to tower rotation
        for (let s = 0; s < SECTORS_PER_DISC; s++) {
          const sector = disc.sectors[s];
          if (sector.type === 'empty') continue;

          const startAngle = s * sectorAngle + eng.towerRotation;
          const endAngle = (s + 1) * sectorAngle + eng.towerRotation;

          // Determine sector color
          let baseColor = currentTheme.safe;
          let rimColor = '#ffffff';

          if (sector.type === 'danger') {
            baseColor = currentTheme.danger;
            rimColor = '#fca5a5';
          } else if (disc.id === eng.totalTiers - 1) {
            // Victory finish disc
            baseColor = '#facc15';
            rimColor = '#fef08a';
          }

          // Draw 3D Sector Wedge
          ctx.save();
          ctx.translate(centerX, screenY);

          // Sector top surface
          ctx.beginPath();
          ctx.moveTo(Math.cos(startAngle) * poleRadius, Math.sin(startAngle) * (poleRadius * (discRadiusY / discRadiusX)));
          ctx.lineTo(Math.cos(startAngle) * discRadiusX, Math.sin(startAngle) * discRadiusY);
          // Arc along ellipse
          for (let a = startAngle; a <= endAngle + 0.02; a += 0.08) {
            ctx.lineTo(Math.cos(a) * discRadiusX, Math.sin(a) * discRadiusY);
          }
          ctx.lineTo(Math.cos(endAngle) * poleRadius, Math.sin(endAngle) * (poleRadius * (discRadiusY / discRadiusX)));
          ctx.closePath();

          // Lighting gradient
          const midAngle = (startAngle + endAngle) / 2;
          const lightFactor = Math.sin(midAngle) * 0.35 + 0.65; // Front is brighter
          ctx.fillStyle = baseColor;
          ctx.globalAlpha = Math.max(0.4, lightFactor);
          ctx.fill();

          // Outer glowing rim border
          ctx.strokeStyle = rimColor;
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = Math.max(0.5, lightFactor * 0.9);
          ctx.stroke();

          // Disc thickness side 3D extrusion
          const thickness = 14;
          if (Math.sin(startAngle) > 0 || Math.sin(endAngle) > 0 || Math.sin(midAngle) > 0) {
            ctx.beginPath();
            ctx.moveTo(Math.cos(startAngle) * discRadiusX, Math.sin(startAngle) * discRadiusY);
            ctx.lineTo(Math.cos(startAngle) * discRadiusX, Math.sin(startAngle) * discRadiusY + thickness);
            for (let a = startAngle; a <= endAngle + 0.02; a += 0.08) {
              ctx.lineTo(Math.cos(a) * discRadiusX, Math.sin(a) * discRadiusY + thickness);
            }
            ctx.lineTo(Math.cos(endAngle) * discRadiusX, Math.sin(endAngle) * discRadiusY);
            ctx.closePath();
            ctx.fillStyle = '#0f172a';
            ctx.globalAlpha = 0.75;
            ctx.fill();
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          ctx.restore();
        }

        // Draw paint splatters on this disc
        disc.splatters.forEach((splat) => {
          const splatAngle = splat.angle - eng.towerRotation;
          const sx = centerX + Math.cos(splatAngle) * (discRadiusX * 0.6 + splat.radiusOffset);
          const sy = screenY + Math.sin(splatAngle) * (discRadiusY * 0.6 + splat.radiusOffset * (discRadiusY / discRadiusX));

          ctx.save();
          ctx.fillStyle = splat.color;
          ctx.shadowColor = splat.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.ellipse(sx, sy, splat.size, splat.size * (discRadiusY / discRadiusX), splatAngle, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      });

      // 3. RENDER BOUNCING BALL & TRAIL
      const ballScreenX = centerX;
      const ballScreenY = eng.ballY - eng.cameraY + height / 2;

      // Ball Motion Trail
      eng.trail.forEach((t) => {
        const ty = t.y - eng.cameraY + height / 2;
        ctx.save();
        ctx.fillStyle = eng.streak >= 3 ? '#f97316' : currentSkin.trailColor;
        ctx.globalAlpha = t.alpha * 0.45;
        ctx.beginPath();
        ctx.arc(ballScreenX, ty, t.size * (eng.streak >= 3 ? 1.4 : 1), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Ball Shadow on upcoming disc
      const activeDisc = eng.discs[eng.currentTierIndex];
      if (activeDisc && !activeDisc.shattered) {
        const discScreenY = activeDisc.y - eng.cameraY + height / 2;
        const distToDisc = discScreenY - ballScreenY;
        if (distToDisc > 0 && distToDisc < 180) {
          const shadowScale = Math.max(0.3, 1 - distToDisc / 180);
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.beginPath();
          ctx.ellipse(ballScreenX, discScreenY, 18 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Ball Glow
      ctx.save();
      const isSupernova = eng.streak >= 3;
      ctx.shadowColor = isSupernova ? '#ff4400' : currentSkin.glowColor;
      ctx.shadowBlur = isSupernova ? 25 : 15;

      // Supernova Fire particles aura
      if (isSupernova) {
        for (let f = 0; f < 3; f++) {
          ctx.fillStyle = ['#f97316', '#ef4444', '#fbbf24'][Math.floor(Math.random() * 3)];
          ctx.beginPath();
          ctx.arc(
            ballScreenX + (Math.random() * 20 - 10),
            ballScreenY + (Math.random() * 20 - 10),
            Math.random() * 8 + 3,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      // Ball Sphere Gradient with Squash/Stretch
      ctx.translate(ballScreenX, ballScreenY);
      ctx.scale(eng.ballSquashX, eng.ballSquashY);

      const ballRadius = 15;
      const ballGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, ballRadius);
      if (isSupernova) {
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.4, '#fbbf24');
        ballGrad.addColorStop(0.8, '#f97316');
        ballGrad.addColorStop(1, '#dc2626');
      } else {
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.4, currentSkin.trailColor);
        ballGrad.addColorStop(0.9, currentSkin.color);
        ballGrad.addColorStop(1, currentSkin.glowColor);
      }

      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // Ball highlight shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(-4, -5, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 4. RENDER PARTICLES
      eng.particles.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore();

      eng.animationFrameId = requestAnimationFrame(loop);
    };

    eng.animationFrameId = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      cancelAnimationFrame(eng.animationFrameId);
    };
  }, [gameState, activeSkin, activeThemeIndex, level]);

  // --- CONTROLS / INPUT LISTENERS ---
  const handlePointerDown = (clientX: number) => {
    if (gameState !== 'playing') return;
    const eng = engineRef.current;
    eng.isDragging = true;
    eng.lastMouseX = clientX;
  };

  const handlePointerMove = (clientX: number) => {
    const eng = engineRef.current;
    if (!eng.isDragging || gameState !== 'playing') return;
    const deltaX = clientX - eng.lastMouseX;
    eng.lastMouseX = clientX;

    // Apply rotation based on mouse/touch swipe
    const sensitivity = 0.0095;
    eng.towerRotation += deltaX * sensitivity;
    eng.towerVelocity = deltaX * sensitivity * 0.45;
  };

  const handlePointerUp = () => {
    engineRef.current.isDragging = false;
  };

  // Keyboard Arrow / WASD Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const eng = engineRef.current;
      const step = 0.28;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        eng.towerRotation -= step;
        eng.towerVelocity = -step * 0.3;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        eng.towerRotation += step;
        eng.towerVelocity = step * 0.3;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Calculate Level Completion Percentage
  const progressPercent = Math.min(
    100,
    Math.round((engineRef.current.currentTierIndex / (engineRef.current.totalTiers - 1)) * 100) || 0
  );

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center select-none">
      {/* Game Card Container */}
      <div className="relative w-full bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Top HUD Bar */}
        <div className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
          {/* Level & Progress */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/80 border border-cyan-500/30 rounded-xl text-cyan-400 font-bold text-sm shadow-inner">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>LVL {level}</span>
            </div>

            {/* Level Progress Bar */}
            <div className="hidden sm:flex items-center gap-2 w-36">
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 rounded-full transition-all duration-200 shadow-lg shadow-cyan-500/50"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-400">{progressPercent}%</span>
            </div>
          </div>

          {/* Supernova / Combo Indicator */}
          {supernovaActive && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-600 to-rose-600 rounded-full text-white text-xs font-extrabold uppercase tracking-wider animate-pulse shadow-lg shadow-orange-500/50">
              <Flame className="w-4 h-4 text-yellow-300 animate-bounce" />
              <span>SUPERNOVA SMASH!</span>
            </div>
          )}

          {/* Score & Coins & Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/60 border border-amber-500/30 rounded-xl text-amber-400 text-sm font-bold">
              <span>🪙</span>
              <span>{coins}</span>
            </div>

            <div className="flex items-center gap-1 px-3 py-1 bg-slate-800/80 rounded-xl text-white text-sm font-black border border-slate-700">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span>{score}</span>
            </div>

            <button
              onClick={() => setShowShop(true)}
              className="p-1.5 bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-500/40 text-indigo-300 rounded-xl transition"
              title="Ball Skins & Themes"
            >
              <Palette className="w-4 h-4" />
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

        {/* Interactive Canvas Viewport */}
        <div
          className="relative w-full aspect-[9/13] max-h-[640px] flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
          onMouseDown={(e) => handlePointerDown(e.clientX)}
          onMouseMove={(e) => handlePointerMove(e.clientX)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={(e) => {
            if (e.touches[0]) handlePointerDown(e.touches[0].clientX);
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
          }}
          onTouchEnd={handlePointerUp}
        >
          <canvas
            ref={canvasRef}
            width={450}
            height={650}
            className="w-full h-full object-contain"
          />

          {/* Overlays / Modals */}
          {/* Start Game Modal */}
          {gameState === 'start' && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/30 mb-4 animate-bounce">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-wider mb-2">
                HELIX <span className="text-cyan-400">JUMP 3D</span>
              </h2>
              <p className="text-sm text-slate-400 max-w-xs mb-6 leading-relaxed">
                Rotate the spiral tower to drop through empty gaps. Chain consecutive falls to unlock{' '}
                <span className="text-orange-400 font-bold">SUPERNOVA SMASH</span>!
              </p>

              <button
                onClick={handleStartGame}
                className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>TAP TO PLAY</span>
              </button>

              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-6 mt-4 sm:mt-8 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-slate-800 rounded border border-slate-700">Mouse Drag / Touch</span>
                  <span>Rotate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-slate-800 rounded border border-slate-700">A / D or ← →</span>
                  <span>Turn</span>
                </div>
              </div>
            </div>
          )}

          {/* Game Over Modal */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-3">
                <span className="text-3xl">💥</span>
              </div>
              <h3 className="text-2xl font-black text-rose-400 tracking-wide mb-1">HAZARD HIT!</h3>
              <p className="text-xs text-slate-400 mb-4">You landed on a dangerous red sector</p>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-64 mb-6 flex justify-around">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Score</div>
                  <div className="text-xl font-black text-white">{score}</div>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Best</div>
                  <div className="text-xl font-black text-amber-400">{highScore}</div>
                </div>
              </div>

              <button
                onClick={handleRestartLevel}
                className="px-8 py-3 bg-gradient-to-r from-rose-500 to-orange-600 hover:from-rose-400 hover:to-orange-500 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>TRY AGAIN</span>
              </button>
            </div>
          )}

          {/* Level Complete Modal */}
          {gameState === 'levelcomplete' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-3 animate-bounce">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-2xl font-black text-amber-400 tracking-wide mb-1">LEVEL {level} COMPLETE!</h3>
              <p className="text-xs text-slate-400 mb-4">+50 Bonus Coins Earned</p>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-64 mb-6 flex justify-around">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Level</div>
                  <div className="text-xl font-black text-cyan-400">{level}</div>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Total Score</div>
                  <div className="text-xl font-black text-white">{score}</div>
                </div>
              </div>

              <button
                onClick={handleNextLevel}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <span>NEXT LEVEL</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Mobile Bottom Turn Controls (for easy single-handed play) */}
          {gameState === 'playing' && (
            <div className="absolute bottom-4 inset-x-6 flex justify-between pointer-events-auto opacity-80 hover:opacity-100 transition sm:hidden select-none touch-none">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  const eng = engineRef.current;
                  eng.towerRotation -= 0.35;
                  eng.towerVelocity = -0.15;
                }}
                className="w-13 h-13 rounded-2xl bg-slate-900/90 border border-slate-700 text-cyan-400 flex items-center justify-center active:bg-cyan-500 active:text-slate-950 active:scale-90 text-xl font-bold shadow-lg transition-transform"
              >
                ◀
              </button>
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  const eng = engineRef.current;
                  eng.towerRotation += 0.35;
                  eng.towerVelocity = 0.15;
                }}
                className="w-13 h-13 rounded-2xl bg-slate-900/90 border border-slate-700 text-cyan-400 flex items-center justify-center active:bg-cyan-500 active:text-slate-950 active:scale-90 text-xl font-bold shadow-lg transition-transform"
              >
                ▶
              </button>
            </div>
          )}
        </div>

        {/* Skin & Theme Customization Modal */}
        {showShop && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-40 p-6 flex flex-col items-center overflow-y-auto">
            <div className="w-full max-w-md flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-white font-black text-xl">
                <Palette className="w-5 h-5 text-indigo-400" />
                <span>BALL ARSENAL & THEMES</span>
              </div>
              <button
                onClick={() => setShowShop(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Close
              </button>
            </div>

            {/* Ball Skins Grid */}
            <div className="w-full max-w-md mb-6">
              <h4 className="text-xs font-extrabold uppercase text-slate-400 mb-3 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>ENERGY BALL SKINS</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {BALL_SKINS.map((skin) => {
                  const isUnlocked = unlockedSkins.includes(skin.id);
                  const isSelected = activeSkin === skin.id;

                  return (
                    <button
                      key={skin.id}
                      onClick={() => handleBuySkin(skin)}
                      className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 relative ${
                        isSelected
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-md shadow-cyan-500/20'
                          : isUnlocked
                          ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-900/40 border-slate-800/60 opacity-80'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner"
                        style={{ backgroundColor: `${skin.color}22`, border: `1.5px solid ${skin.color}` }}
                      >
                        <span>{skin.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{skin.name}</div>
                        <div className="text-xs text-slate-400">
                          {isSelected ? (
                            <span className="text-cyan-400 font-semibold">Equipped</span>
                          ) : isUnlocked ? (
                            <span className="text-emerald-400">Unlocked</span>
                          ) : (
                            <span className="text-amber-400 font-semibold">🪙 {skin.price}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Atmosphere Themes */}
            <div className="w-full max-w-md">
              <h4 className="text-xs font-extrabold uppercase text-slate-400 mb-3 tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>SKY ATMOSPHERE THEMES</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map((thm, idx) => (
                  <button
                    key={thm.id}
                    onClick={() => {
                      setActiveThemeIndex(idx);
                      sound.playClick();
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                      activeThemeIndex === idx
                        ? 'bg-indigo-950/60 border-indigo-400 shadow-md shadow-indigo-500/20'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg"
                      style={{
                        background: `linear-gradient(135deg, ${thm.bgTop}, ${thm.safe})`,
                        border: `1px solid ${thm.safe}`,
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white">{thm.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {activeThemeIndex === idx ? <span className="text-indigo-400">Active</span> : 'Select'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
