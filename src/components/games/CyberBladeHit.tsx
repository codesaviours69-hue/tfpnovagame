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
  Target,
  Gem,
  Swords,
  ShieldAlert
} from 'lucide-react';
import { sound } from '../../utils/audio';

// --- INTERFACES ---
interface EmbeddedBlade {
  angle: number; // Angle on the core in radians
  skinId: string;
}

interface TargetCrystal {
  angle: number;
  sliced: boolean;
  color: string;
}

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  color: string;
  size: number;
  alpha: number;
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
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
}

export interface BladeSkin {
  id: string;
  name: string;
  bladeColor: string;
  edgeGlow: string;
  handleColor: string;
  guardColor: string;
  icon: string;
  price: number;
  shape: 'dagger' | 'kunai' | 'shuriken' | 'katana' | 'plasma' | 'excalibur';
}

const BLADE_SKINS: BladeSkin[] = [
  {
    id: 'cyber-dagger',
    name: 'Cyber Dagger',
    bladeColor: '#38bdf8',
    edgeGlow: '#00f0ff',
    handleColor: '#1e293b',
    guardColor: '#0284c7',
    icon: '🗡️',
    price: 0,
    shape: 'dagger',
  },
  {
    id: 'thunder-kunai',
    name: 'Thunder Kunai',
    bladeColor: '#fbbf24',
    edgeGlow: '#f59e0b',
    handleColor: '#334155',
    guardColor: '#d97706',
    icon: '⚡',
    price: 150,
    shape: 'kunai',
  },
  {
    id: 'toxic-shuriken',
    name: 'Neon Shuriken',
    bladeColor: '#10b981',
    edgeGlow: '#34d399',
    handleColor: '#064e3b',
    guardColor: '#059669',
    icon: '🌀',
    price: 300,
    shape: 'shuriken',
  },
  {
    id: 'inferno-saber',
    name: 'Solar Blade',
    bladeColor: '#f97316',
    edgeGlow: '#ef4444',
    handleColor: '#451a03',
    guardColor: '#ea580c',
    icon: '🔥',
    price: 500,
    shape: 'katana',
  },
  {
    id: 'void-plasma',
    name: 'Void Plasma',
    bladeColor: '#c084fc',
    edgeGlow: '#a855f7',
    handleColor: '#3b0764',
    guardColor: '#9333ea',
    icon: '🔮',
    price: 750,
    shape: 'plasma',
  },
  {
    id: 'excalibur-2077',
    name: 'Excalibur 2077',
    bladeColor: '#fde047',
    edgeGlow: '#facc15',
    handleColor: '#78350f',
    guardColor: '#eab308',
    icon: '👑',
    price: 1000,
    shape: 'excalibur',
  },
];

const BOSS_NAMES = [
  'SHIELD OVERLORD',
  'PLASMA REACTOR CORE',
  'VORTEX PRIME',
  'VOID DESTROYER',
  'CHRONOS MATRIX',
];

export const CyberBladeHit: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'boss_intro'>('start');
  const [stage, setStage] = useState<number>(1);
  const [highStage, setHighStage] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_blade_highstage') || '1', 10);
  });
  const [crystals, setCrystals] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_blade_crystals') || '50', 10);
  });
  const [activeSkinId, setActiveSkinId] = useState<string>('cyber-dagger');
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('cyber_blade_skins') || '["cyber-dagger"]');
  });
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());
  const [showShop, setShowShop] = useState<boolean>(false);
  const [bladesRemaining, setBladesRemaining] = useState<number>(7);
  const [totalBladesRequired, setTotalBladesRequired] = useState<number>(7);
  const [isBossStage, setIsBossStage] = useState<boolean>(false);
  const [bossName, setBossName] = useState<string>('');

  // Engine Refs
  const engineRef = useRef({
    targetAngle: 0,
    targetSpeed: 0.03,
    targetBaseSpeed: 0.03,
    speedTimer: 0,
    directionChangeTimer: 0,
    coreRadius: 65,
    coreType: 'standard' as 'standard' | 'boss' | 'neon_reactor' | 'cyber_wood',
    coreColor: '#1e293b',
    coreGlow: '#00f0ff',
    embeddedBlades: [] as EmbeddedBlade[],
    crystals: [] as TargetCrystal[],
    flyingBlade: null as {
      y: number;
      speed: number;
      skinId: string;
    } | null,
    deflectedBlade: null as {
      x: number;
      y: number;
      vx: number;
      vy: number;
      rot: number;
      vRot: number;
      skinId: string;
    } | null,
    shards: [] as Shard[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    screenShake: 0,
    targetShattering: false,
    shatterTimer: 0,
    animationFrameId: 0,
    nextTextId: 1,
    stageClearTimer: 0,
  });

  // Spawn Floating Text Popup
  const addFloatingText = (text: string, color: string, x?: number, y?: number) => {
    const eng = engineRef.current;
    eng.floatingTexts.push({
      id: eng.nextTextId++,
      x: x !== undefined ? x : 400,
      y: y !== undefined ? y : 220,
      text,
      color,
      alpha: 1,
      scale: 1.4,
    });
  };

  // Setup Stage parameters
  const setupStage = useCallback(
    (lvl: number) => {
      const eng = engineRef.current;
      eng.flyingBlade = null;
      eng.deflectedBlade = null;
      eng.shards = [];
      eng.targetShattering = false;
      eng.shatterTimer = 0;
      eng.stageClearTimer = 0;

      const isBoss = lvl % 5 === 0;
      setIsBossStage(isBoss);

      let bCount = Math.min(6 + Math.floor(lvl * 0.8), 12);
      if (isBoss) {
        bCount = Math.min(10 + Math.floor(lvl / 5) * 2, 14);
        const bIdx = (Math.floor(lvl / 5) - 1) % BOSS_NAMES.length;
        setBossName(BOSS_NAMES[bIdx]);
        eng.coreRadius = 78;
        eng.coreColor = '#450a0a';
        eng.coreGlow = '#f43f5e';
      } else {
        eng.coreRadius = 65;
        const colorPalette = ['#0f172a', '#082f49', '#1e1b4b', '#14532d'];
        const glowPalette = ['#00f0ff', '#38bdf8', '#c084fc', '#10b981'];
        const pIdx = (lvl - 1) % colorPalette.length;
        eng.coreColor = colorPalette[pIdx];
        eng.coreGlow = glowPalette[pIdx];
      }

      setBladesRemaining(bCount);
      setTotalBladesRequired(bCount);

      // Core rotation base speed
      const baseSpd = (0.025 + Math.min(lvl * 0.003, 0.04)) * (Math.random() > 0.5 ? 1 : -1);
      eng.targetSpeed = baseSpd;
      eng.targetBaseSpeed = Math.abs(baseSpd);
      eng.speedTimer = 0;
      eng.directionChangeTimer = 0;

      // Pre-embedded blades
      eng.embeddedBlades = [];
      const preCount = isBoss ? Math.min(2 + Math.floor(lvl / 10), 4) : Math.floor(Math.random() * 3);
      for (let i = 0; i < preCount; i++) {
        const ang = (Math.PI * 2 / (preCount + 2)) * i + Math.random() * 0.4;
        eng.embeddedBlades.push({
          angle: ang,
          skinId: 'cyber-dagger',
        });
      }

      // Target Crystals (1 to 2 crystals per stage)
      eng.crystals = [];
      const numCrystals = Math.random() < 0.75 ? 1 : 2;
      const crystalColors = ['#f59e0b', '#ec4899', '#06b6d4', '#10b981'];
      for (let i = 0; i < numCrystals; i++) {
        const cAng = Math.random() * Math.PI * 2;
        eng.crystals.push({
          angle: cAng,
          sliced: false,
          color: crystalColors[Math.floor(Math.random() * crystalColors.length)],
        });
      }
    },
    []
  );

  // Start Playing
  const handleStartGame = () => {
    setStage(1);
    setupStage(1);
    setGameState('playing');
    sound.playPowerup();
  };

  const handleRestart = () => {
    setStage(1);
    setupStage(1);
    setGameState('playing');
    sound.playPowerup();
  };

  // Throw Blade
  const throwBlade = useCallback(() => {
    if (gameState !== 'playing') return;
    const eng = engineRef.current;
    if (eng.flyingBlade || eng.targetShattering || bladesRemaining <= 0) return;

    sound.playBladeThrow();
    eng.flyingBlade = {
      y: 430, // bottom launch Y
      speed: 28,
      skinId: activeSkinId,
    };
  }, [gameState, bladesRemaining, activeSkinId]);

  // Skin Purchase
  const handleBuySkin = (skin: BladeSkin) => {
    if (unlockedSkins.includes(skin.id)) {
      setActiveSkinId(skin.id);
      sound.playClick();
      return;
    }
    if (crystals >= skin.price) {
      const newCrystals = crystals - skin.price;
      const newUnlocked = [...unlockedSkins, skin.id];
      setCrystals(newCrystals);
      setUnlockedSkins(newUnlocked);
      setActiveSkinId(skin.id);
      localStorage.setItem('cyber_blade_crystals', newCrystals.toString());
      localStorage.setItem('cyber_blade_skins', JSON.stringify(newUnlocked));
      sound.playCrystalSlice();
    } else {
      sound.playLaser();
    }
  };

  // Sound Toggle
  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Shatter Core into shards
  const triggerCoreShatter = () => {
    const eng = engineRef.current;
    eng.targetShattering = true;
    eng.screenShake = 16;
    sound.playTargetShatter();

    const shardCount = 28;
    for (let i = 0; i < shardCount; i++) {
      const ang = (Math.PI * 2 / shardCount) * i + (Math.random() - 0.5) * 0.3;
      const spd = Math.random() * 8 + 3;
      eng.shards.push({
        x: 400 + Math.cos(ang) * (eng.coreRadius * 0.6),
        y: 170 + Math.sin(ang) * (eng.coreRadius * 0.6),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        color: i % 2 === 0 ? eng.coreGlow : '#ffffff',
        size: Math.random() * 12 + 6,
        alpha: 1,
      });
    }

    // Victory bonus crystals for completing stage
    const earnedBonus = isBossStage ? 10 : 3;
    setCrystals((prev) => {
      const next = prev + earnedBonus;
      localStorage.setItem('cyber_blade_crystals', next.toString());
      return next;
    });

    addFloatingText(isBossStage ? '🔥 BOSS DESTROYED! +10 💎' : 'STAGE CLEARED! +3 💎', '#fbbf24', 400, 170);
  };

  // Render blade helper for Canvas
  const drawBlade = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    skin: BladeSkin,
    scale: number = 1
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    // Glow effect
    ctx.shadowColor = skin.edgeGlow;
    ctx.shadowBlur = 12;

    if (skin.shape === 'shuriken') {
      // Spinning Star Shuriken
      ctx.fillStyle = skin.bladeColor;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.lineTo(0, -22);
        ctx.lineTo(5, -6);
        ctx.lineTo(22, 0);
      }
      ctx.closePath();
      ctx.fill();

      // Center ring
      ctx.fillStyle = skin.guardColor;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Blade Point / Body
      ctx.fillStyle = skin.bladeColor;
      ctx.beginPath();
      ctx.moveTo(0, -32); // Tip
      ctx.lineTo(6, -6);
      ctx.lineTo(4, 8); // Handle top
      ctx.lineTo(-4, 8);
      ctx.lineTo(-6, -6);
      ctx.closePath();
      ctx.fill();

      // Center laser highlight line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(0, 6);
      ctx.stroke();

      // Guard
      ctx.fillStyle = skin.guardColor;
      ctx.fillRect(-9, 8, 18, 4);

      // Handle
      ctx.fillStyle = skin.handleColor;
      ctx.fillRect(-3.5, 12, 7, 16);

      // Pommel
      ctx.fillStyle = skin.guardColor;
      ctx.beginPath();
      ctx.arc(0, 30, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // --- MAIN ENGINE TICK & PHYSICS LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const eng = engineRef.current;

    const tick = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      const coreCenterX = width / 2;
      const coreCenterY = 170;

      // 1. UPDATE ROTATION DYNAMICS
      if (!eng.targetShattering) {
        eng.speedTimer++;
        eng.directionChangeTimer++;

        // Smooth speed variations (accelerations, slowdowns, direction reversals)
        if (stage > 2) {
          if (eng.directionChangeTimer % 180 === 0 && Math.random() < 0.65) {
            // Reverse direction
            eng.targetSpeed = -eng.targetSpeed;
          }
          if (eng.speedTimer % 90 === 0 && Math.random() < 0.5) {
            // Speed pulse
            const spdFactor = Math.random() * 1.5 + 0.5;
            eng.targetSpeed = Math.sign(eng.targetSpeed) * (eng.targetBaseSpeed * spdFactor);
          }
        }

        eng.targetAngle += eng.targetSpeed;
      }

      // 2. FLYING BLADE PHYSICS
      if (eng.flyingBlade) {
        eng.flyingBlade.y -= eng.flyingBlade.speed;

        // Spawn trail sparks
        const activeSkin = BLADE_SKINS.find((s) => s.id === eng.flyingBlade?.skinId) || BLADE_SKINS[0];
        eng.particles.push({
          x: coreCenterX + (Math.random() - 0.5) * 6,
          y: eng.flyingBlade.y + 20,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 3 + 1,
          color: activeSkin.edgeGlow,
          size: Math.random() * 3 + 2,
          alpha: 0.9,
          decay: 0.05,
        });

        // Hit Detection against core radius
        const bladeTipY = eng.flyingBlade.y - 25;
        if (bladeTipY <= coreCenterY + eng.coreRadius) {
          // Blade has reached the core!
          // Calculate angle relative to core center (pointing straight down into core top -> angle = PI/2)
          // In core coordinate space:
          let hitAngle = Math.PI / 2 - eng.targetAngle;
          while (hitAngle < 0) hitAngle += Math.PI * 2;
          while (hitAngle >= Math.PI * 2) hitAngle -= Math.PI * 2;

          // Check if colliding with any previously embedded blade
          let collided = false;
          const minAngleDistance = 0.28; // approx 16 degrees clearance

          for (let eb of eng.embeddedBlades) {
            let diff = Math.abs(hitAngle - eb.angle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff < minAngleDistance) {
              collided = true;
              break;
            }
          }

          if (collided) {
            // DEFEAT / CLASH!
            sound.playBladeClash();
            eng.screenShake = 22;

            // Deflect blade flying downwards spinning
            eng.deflectedBlade = {
              x: coreCenterX,
              y: bladeTipY,
              vx: (Math.random() - 0.5) * 10 + 4,
              vy: Math.random() * -6 - 2,
              rot: 0,
              vRot: 0.35,
              skinId: eng.flyingBlade.skinId,
            };

            // Clash spark shower
            for (let sp = 0; sp < 25; sp++) {
              const spAng = Math.random() * Math.PI * 2;
              const spSpd = Math.random() * 7 + 2;
              eng.particles.push({
                x: coreCenterX,
                y: bladeTipY,
                vx: Math.cos(spAng) * spSpd,
                vy: Math.sin(spAng) * spSpd,
                color: '#facc15',
                size: Math.random() * 4 + 2,
                alpha: 1,
                decay: 0.04,
              });
            }

            eng.flyingBlade = null;
            setGameState('gameover');
          } else {
            // SUCCESSFUL STICK!
            sound.playBladeHit();
            eng.screenShake = 6;

            // Embed blade
            eng.embeddedBlades.push({
              angle: hitAngle,
              skinId: eng.flyingBlade.skinId,
            });

            // Check if sliced any crystal
            eng.crystals.forEach((c) => {
              if (!c.sliced) {
                let cDiff = Math.abs(hitAngle - c.angle);
                if (cDiff > Math.PI) cDiff = Math.PI * 2 - cDiff;
                if (cDiff < 0.35) {
                  c.sliced = true;
                  sound.playCrystalSlice();
                  setCrystals((prev) => {
                    const next = prev + 2;
                    localStorage.setItem('cyber_blade_crystals', next.toString());
                    return next;
                  });
                  addFloatingText('+2 💎', c.color, coreCenterX, coreCenterY + eng.coreRadius);
                  // Slice crystal sparkles
                  for (let cp = 0; cp < 18; cp++) {
                    const cpAng = Math.random() * Math.PI * 2;
                    const cpSpd = Math.random() * 6 + 1;
                    eng.particles.push({
                      x: coreCenterX,
                      y: coreCenterY + eng.coreRadius,
                      vx: Math.cos(cpAng) * cpSpd,
                      vy: Math.sin(cpAng) * cpSpd,
                      color: c.color,
                      size: Math.random() * 4 + 2,
                      alpha: 1,
                      decay: 0.04,
                    });
                  }
                }
              }
            });

            // Impact particles
            for (let p = 0; p < 12; p++) {
              const pAng = Math.PI / 2 + (Math.random() - 0.5) * 1.5;
              const pSpd = Math.random() * 5 + 2;
              eng.particles.push({
                x: coreCenterX,
                y: bladeTipY,
                vx: Math.cos(pAng) * pSpd,
                vy: Math.sin(pAng) * pSpd,
                color: activeSkin.edgeGlow,
                size: Math.random() * 3 + 2,
                alpha: 1,
                decay: 0.05,
              });
            }

            eng.flyingBlade = null;
            const remaining = bladesRemaining - 1;
            setBladesRemaining(remaining);

            if (remaining <= 0) {
              // STAGE COMPLETE! SHATTER TARGET
              triggerCoreShatter();
            }
          }
        }
      }

      // Deflected blade falling down
      if (eng.deflectedBlade) {
        eng.deflectedBlade.x += eng.deflectedBlade.vx;
        eng.deflectedBlade.y += eng.deflectedBlade.vy;
        eng.deflectedBlade.vy += 0.8; // gravity
        eng.deflectedBlade.rot += eng.deflectedBlade.vRot;
      }

      // 3. SHATTER PHYSICS & STAGE PROGRESSION
      if (eng.targetShattering) {
        eng.shatterTimer++;
        eng.shards.forEach((s) => {
          s.x += s.vx;
          s.y += s.vy;
          s.vy += 0.4;
          s.rotation += s.vRot;
          s.alpha -= 0.02;
        });
        eng.shards = eng.shards.filter((s) => s.alpha > 0);

        if (eng.shatterTimer > 45) {
          // Advance to next stage!
          const nextLvl = stage + 1;
          setStage(nextLvl);
          if (nextLvl > highStage) {
            setHighStage(nextLvl);
            localStorage.setItem('cyber_blade_highstage', nextLvl.toString());
          }
          setupStage(nextLvl);
        }
      }

      // Update Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) eng.particles.splice(i, 1);
      }

      // Update Floating Texts
      for (let i = eng.floatingTexts.length - 1; i >= 0; i--) {
        const ft = eng.floatingTexts[i];
        ft.y -= 1.2;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) eng.floatingTexts.splice(i, 1);
      }

      // Screen Shake damping
      if (eng.screenShake > 0) {
        eng.screenShake *= 0.86;
        if (eng.screenShake < 0.2) eng.screenShake = 0;
      }

      // ====================================================
      // 4. RENDER GRAPHICS
      // ====================================================
      ctx.save();

      // Screen Shake
      if (eng.screenShake > 0) {
        const sx = (Math.random() - 0.5) * eng.screenShake;
        const sy = (Math.random() - 0.5) * eng.screenShake;
        ctx.translate(sx, sy);
      }

      // Dark background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, isBossStage ? '#1a0505' : '#030712');
      bgGrad.addColorStop(1, isBossStage ? '#0f0202' : '#0a0f1d');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Background Ambient Grid
      ctx.strokeStyle = isBossStage ? 'rgba(239, 68, 68, 0.08)' : 'rgba(6, 182, 212, 0.06)';
      ctx.lineWidth = 1;
      const gSize = 40;
      for (let gx = 0; gx <= width; gx += gSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy <= height; gy += gSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // Render Rotating Target Core & Embedded Items
      if (!eng.targetShattering) {
        ctx.save();
        ctx.translate(coreCenterX, coreCenterY);
        ctx.rotate(eng.targetAngle);

        // Core Body
        ctx.fillStyle = eng.coreColor;
        ctx.shadowColor = eng.coreGlow;
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(0, 0, eng.coreRadius, 0, Math.PI * 2);
        ctx.fill();

        // Core Outer Ring
        ctx.strokeStyle = eng.coreGlow;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Core Inner Tech Circuits
        ctx.strokeStyle = `${eng.coreGlow}66`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, eng.coreRadius * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, eng.coreRadius * 0.35, 0, Math.PI * 2);
        ctx.stroke();

        // Circuit Spoke ticks
        for (let t = 0; t < 8; t++) {
          const tAng = (Math.PI * 2 / 8) * t;
          ctx.beginPath();
          ctx.moveTo(Math.cos(tAng) * (eng.coreRadius * 0.35), Math.sin(tAng) * (eng.coreRadius * 0.35));
          ctx.lineTo(Math.cos(tAng) * (eng.coreRadius * 0.65), Math.sin(tAng) * (eng.coreRadius * 0.65));
          ctx.stroke();
        }

        // Draw Embedded Crystals
        eng.crystals.forEach((c) => {
          if (c.sliced) return;
          ctx.save();
          ctx.rotate(c.angle);
          ctx.translate(0, eng.coreRadius + 12);

          // Diamond Crystal
          ctx.fillStyle = c.color;
          ctx.shadowColor = c.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.lineTo(8, 0);
          ctx.lineTo(0, 10);
          ctx.lineTo(-8, 0);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-2, -2, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        });

        // Draw Embedded Blades (sticking radially outward)
        eng.embeddedBlades.forEach((eb) => {
          const ebSkin = BLADE_SKINS.find((s) => s.id === eb.skinId) || BLADE_SKINS[0];
          ctx.save();
          ctx.rotate(eb.angle);
          // Embedded: tip is at eng.coreRadius, handle sticks outside
          drawBlade(ctx, 0, eng.coreRadius + 16, Math.PI, ebSkin, 0.95);
          ctx.restore();
        });

        ctx.restore();
      }

      // Draw Shattered Core Shards
      if (eng.targetShattering) {
        eng.shards.forEach((s) => {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rotation);
          ctx.fillStyle = s.color;
          ctx.globalAlpha = Math.max(0, s.alpha);
          ctx.shadowColor = s.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(-s.size / 2, -s.size / 2);
          ctx.lineTo(s.size / 2, -s.size / 3);
          ctx.lineTo(s.size / 3, s.size / 2);
          ctx.lineTo(-s.size / 3, s.size / 3);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });
      }

      // Draw Flying Blade
      if (eng.flyingBlade) {
        const fSkin = BLADE_SKINS.find((s) => s.id === eng.flyingBlade?.skinId) || BLADE_SKINS[0];
        drawBlade(ctx, coreCenterX, eng.flyingBlade.y, 0, fSkin, 1);
      }

      // Draw Deflected Clashing Blade
      if (eng.deflectedBlade) {
        const dSkin = BLADE_SKINS.find((s) => s.id === eng.deflectedBlade?.skinId) || BLADE_SKINS[0];
        drawBlade(ctx, eng.deflectedBlade.x, eng.deflectedBlade.y, eng.deflectedBlade.rot, dSkin, 1);
      }

      // Draw Idle Ready Blade (at bottom)
      if (gameState === 'playing' && !eng.flyingBlade && bladesRemaining > 0) {
        const curSkin = BLADE_SKINS.find((s) => s.id === activeSkinId) || BLADE_SKINS[0];
        drawBlade(ctx, coreCenterX, 430, 0, curSkin, 1.05);
      }

      // Draw Particles
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

      // Draw Floating Texts
      eng.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.font = '900 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 10;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // Draw Ammo Indicators on the bottom left
      if (gameState === 'playing') {
        const ammoStartX = 36;
        const ammoStartY = height - 40;
        for (let a = 0; a < totalBladesRequired; a++) {
          const isRemaining = a < bladesRemaining;
          ctx.save();
          ctx.fillStyle = isRemaining ? '#00f0ff' : '#334155';
          if (isRemaining) {
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 8;
          }
          ctx.beginPath();
          // Miniature blade icon
          ctx.roundRect(ammoStartX + a * 18, ammoStartY, 8, 22, 3);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.restore();

      eng.animationFrameId = requestAnimationFrame(tick);
    };

    eng.animationFrameId = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      cancelAnimationFrame(eng.animationFrameId);
    };
  }, [gameState, stage, bladesRemaining, isBossStage, activeSkinId, totalBladesRequired]);

  // Click / Tap Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState === 'playing') {
      throwBlade();
    }
  };

  // Keyboard Spacebar / Up Arrow throw support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        throwBlade();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [throwBlade]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center select-none">
      {/* Container */}
      <div className="relative w-full bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Top HUD */}
        <div className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
          {/* Stage Counter */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-black text-sm border ${
                isBossStage
                  ? 'bg-rose-950/80 border-rose-500 text-rose-400 animate-pulse'
                  : 'bg-cyan-950/80 border-cyan-500/30 text-cyan-400'
              }`}
            >
              {isBossStage ? <ShieldAlert className="w-4 h-4 text-rose-400" /> : <Target className="w-4 h-4" />}
              <span>{isBossStage ? `BOSS: ${bossName}` : `STAGE ${stage}`}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300 font-bold text-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>RECORD: STAGE {highStage}</span>
            </div>
          </div>

          {/* Crystals & Arsenal Button */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-950/70 border border-indigo-500/30 rounded-xl text-indigo-300 font-black text-sm">
              <Gem className="w-4 h-4 text-indigo-400" />
              <span>{crystals}</span>
            </div>

            <button
              onClick={() => setShowShop(true)}
              className="p-1.5 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 rounded-xl transition"
              title="Blades Arsenal & Customization"
            >
              <Swords className="w-4 h-4" />
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
          className="relative w-full aspect-[4/3] max-h-[520px] flex items-center justify-center cursor-pointer touch-none"
          onPointerDown={handlePointerDown}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="w-full h-full object-cover"
          />

          {/* Start Screen Overlay */}
          {gameState === 'start' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/30 mb-4 animate-bounce">
                <Swords className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
                CYBER BLADE <span className="text-cyan-400">HIT</span>
              </h2>
              <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
                Throw razor-sharp cyber blades into rotating plasma reactors! Slice floating gems, avoid hitting existing blades, and defeat colossal Bosses!
              </p>

              <button
                onClick={handleStartGame}
                className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>START THROWING</span>
              </button>

              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-6 mt-4 sm:mt-8 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-slate-800 rounded border border-slate-700">TAP / CLICK</span>
                  <span>Throw Blade</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-slate-800 rounded border border-slate-700">SPACEBAR</span>
                  <span>Quick Throw</span>
                </div>
              </div>
            </div>
          )}

          {/* Game Over Screen */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-3">
                <span className="text-3xl">⚔️</span>
              </div>
              <h3 className="text-2xl font-black text-rose-400 tracking-wide mb-1">BLADE DEFLECTED!</h3>
              <p className="text-xs text-slate-400 mb-4">You struck an existing blade on the core</p>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-72 mb-6 flex justify-around">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Stage Reached</div>
                  <div className="text-xl font-black text-white">{stage}</div>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Best Stage</div>
                  <div className="text-xl font-black text-amber-400">{highStage}</div>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Gems</div>
                  <div className="text-xl font-black text-indigo-400">{crystals}</div>
                </div>
              </div>

              <button
                onClick={handleRestart}
                className="px-8 py-3 bg-gradient-to-r from-rose-500 to-orange-600 hover:from-rose-400 hover:to-orange-500 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RETRY STAGE</span>
              </button>
            </div>
          )}
        </div>

        {/* Blade Arsenal Shop Modal */}
        {showShop && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-40 p-6 flex flex-col items-center overflow-y-auto">
            <div className="w-full max-w-md flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-white font-black text-xl">
                <Swords className="w-5 h-5 text-cyan-400" />
                <span>BLADE ARSENAL</span>
              </div>
              <button
                onClick={() => setShowShop(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Close
              </button>
            </div>

            <div className="w-full max-w-md grid grid-cols-2 gap-3 mb-4">
              {BLADE_SKINS.map((skin) => {
                const isUnlocked = unlockedSkins.includes(skin.id);
                const isSelected = activeSkinId === skin.id;

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
                      style={{ backgroundColor: `${skin.bladeColor}22`, border: `1.5px solid ${skin.bladeColor}` }}
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
                          <span className="text-indigo-400 font-semibold">💎 {skin.price}</span>
                        )}
                      </div>
                    </div>
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
