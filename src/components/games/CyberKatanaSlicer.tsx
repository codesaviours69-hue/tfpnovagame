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
  Swords,
  Heart,
  ShieldAlert,
  Snowflake,
  Timer
} from 'lucide-react';
import { sound } from '../../utils/audio';

// --- TYPES & INTERFACES ---
export type FruitType =
  | 'watermelon'
  | 'orange'
  | 'apple'
  | 'pineapple'
  | 'coconut'
  | 'strawberry'
  | 'dragonfruit'
  | 'freeze_berry'
  | 'frenzy_banana'
  | 'bomb';

interface FruitDef {
  type: FruitType;
  name: string;
  radius: number;
  points: number;
  outerColor: string;
  innerColor: string;
  juiceColor: string;
  glowColor: string;
  icon: string;
}

const FRUIT_SPECS: Record<FruitType, FruitDef> = {
  watermelon: {
    type: 'watermelon',
    name: 'Cyber Watermelon',
    radius: 36,
    points: 2,
    outerColor: '#15803d',
    innerColor: '#f43f5e',
    juiceColor: '#fb7185',
    glowColor: '#f43f5e',
    icon: '🍉',
  },
  orange: {
    type: 'orange',
    name: 'Neon Orange',
    radius: 28,
    points: 1,
    outerColor: '#f97316',
    innerColor: '#fdba74',
    juiceColor: '#fb923c',
    glowColor: '#ea580c',
    icon: '🍊',
  },
  apple: {
    type: 'apple',
    name: 'Plasma Apple',
    radius: 26,
    points: 1,
    outerColor: '#dc2626',
    innerColor: '#fef08a',
    juiceColor: '#ef4444',
    glowColor: '#f87171',
    icon: '🍎',
  },
  pineapple: {
    type: 'pineapple',
    name: 'Quantum Pineapple',
    radius: 34,
    points: 3,
    outerColor: '#ca8a04',
    innerColor: '#fef08a',
    juiceColor: '#facc15',
    glowColor: '#eab308',
    icon: '🍍',
  },
  coconut: {
    type: 'coconut',
    name: 'Plasma Coconut',
    radius: 30,
    points: 2,
    outerColor: '#78350f',
    innerColor: '#38bdf8',
    juiceColor: '#00f0ff',
    glowColor: '#0284c7',
    icon: '🥥',
  },
  strawberry: {
    type: 'strawberry',
    name: 'Hyper Berry',
    radius: 22,
    points: 2,
    outerColor: '#ec4899',
    innerColor: '#fbcfe8',
    juiceColor: '#f472b6',
    glowColor: '#db2777',
    icon: '🍓',
  },
  dragonfruit: {
    type: 'dragonfruit',
    name: 'Golden Dragonfruit',
    radius: 38,
    points: 20,
    outerColor: '#eab308',
    innerColor: '#ffffff',
    juiceColor: '#fde047',
    glowColor: '#ffd700',
    icon: '👑',
  },
  freeze_berry: {
    type: 'freeze_berry',
    name: 'Frost Freeze',
    radius: 28,
    points: 5,
    outerColor: '#06b6d4',
    innerColor: '#cffafe',
    juiceColor: '#38bdf8',
    glowColor: '#00f0ff',
    icon: '❄️',
  },
  frenzy_banana: {
    type: 'frenzy_banana',
    name: 'Frenzy Storm',
    radius: 32,
    points: 5,
    outerColor: '#84cc16',
    innerColor: '#fef08a',
    juiceColor: '#bef264',
    glowColor: '#a3e635',
    icon: '⚡',
  },
  bomb: {
    type: 'bomb',
    name: 'Hazard Bomb',
    radius: 32,
    points: 0,
    outerColor: '#1e293b',
    innerColor: '#ef4444',
    juiceColor: '#ef4444',
    glowColor: '#f43f5e',
    icon: '💣',
  },
};

interface ActiveFruit {
  id: number;
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  radius: number;
  sliced: boolean;
  gravity: number;
}

interface SlicedHalf {
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  sliceAngle: number;
  isLeftHalf: boolean;
  radius: number;
  alpha: number;
}

interface JuiceSplat {
  x: number;
  y: number;
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

interface BladeSkin {
  id: string;
  name: string;
  trailColor: string;
  glowColor: string;
  coreColor: string;
  price: number;
  icon: string;
}

const BLADE_SKINS: BladeSkin[] = [
  {
    id: 'cyber-cyan',
    name: 'Cyber Edge',
    trailColor: '#06b6d4',
    glowColor: '#00f0ff',
    coreColor: '#ffffff',
    price: 0,
    icon: '⚡',
  },
  {
    id: 'solar-katana',
    name: 'Solar Crimson',
    trailColor: '#f97316',
    glowColor: '#ef4444',
    coreColor: '#fffbeb',
    price: 150,
    icon: '🔥',
  },
  {
    id: 'toxic-viper',
    name: 'Venom Blade',
    trailColor: '#10b981',
    glowColor: '#34d399',
    coreColor: '#ecfdf5',
    price: 300,
    icon: '🧪',
  },
  {
    id: 'void-katana',
    name: 'Void Shadow',
    trailColor: '#a855f7',
    glowColor: '#c084fc',
    coreColor: '#faf5ff',
    price: 500,
    icon: '🔮',
  },
  {
    id: 'rainbow-katana',
    name: 'Prism Muramasa',
    trailColor: '#ec4899',
    glowColor: '#00f0ff',
    coreColor: '#ffffff',
    price: 750,
    icon: '🌈',
  },
  {
    id: 'golden-shogun',
    name: 'Golden Shogun',
    trailColor: '#eab308',
    glowColor: '#ffd700',
    coreColor: '#fef08a',
    price: 1000,
    icon: '👑',
  },
];

export const CyberKatanaSlicer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React State
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_katana_highscore') || '0', 10);
  });
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_katana_coins') || '50', 10);
  });
  const [strikes, setStrikes] = useState<number>(0);
  const [activeSkinId, setActiveSkinId] = useState<string>('cyber-cyan');
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('cyber_katana_skins') || '["cyber-cyan"]');
  });
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());
  const [showShop, setShowShop] = useState<boolean>(false);
  const [frenzyActive, setFrenzyActive] = useState<boolean>(false);
  const [freezeActive, setFreezeActive] = useState<boolean>(false);

  // Engine Refs
  const engineRef = useRef({
    fruits: [] as ActiveFruit[],
    slicedHalves: [] as SlicedHalf[],
    juiceSplats: [] as JuiceSplat[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    bladeTrail: [] as { x: number; y: number; time: number }[],
    isSwiping: false,
    currentSwipeFruitIds: new Set<number>(),
    nextFruitId: 1,
    nextTextId: 1,
    spawnTimer: 0,
    spawnInterval: 65,
    difficultyTimer: 0,
    freezeTimer: 0,
    frenzyTimer: 0,
    screenShake: 0,
    bombFlash: 0,
    animationFrameId: 0,
  });

  // Spawn Floating Text Popup
  const addFloatingText = (text: string, color: string, x: number, y: number) => {
    const eng = engineRef.current;
    eng.floatingTexts.push({
      id: eng.nextTextId++,
      x,
      y,
      text,
      color,
      alpha: 1,
      scale: 1.3,
    });
  };

  // Launch Fruit Waves
  const launchFruit = (forceType?: FruitType) => {
    const eng = engineRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    // Pick Fruit Type with probabilities
    let type: FruitType = forceType || 'watermelon';
    if (!forceType) {
      const rand = Math.random();
      if (rand < 0.22) type = 'watermelon';
      else if (rand < 0.40) type = 'orange';
      else if (rand < 0.58) type = 'apple';
      else if (rand < 0.72) type = 'pineapple';
      else if (rand < 0.82) type = 'coconut';
      else if (rand < 0.90) type = 'strawberry';
      else if (rand < 0.94) type = 'freeze_berry';
      else if (rand < 0.97) type = 'frenzy_banana';
      else if (rand < 0.985) type = 'dragonfruit';
      else type = 'bomb';
    }

    const spec = FRUIT_SPECS[type];
    const spawnX = Math.random() * (width - 240) + 120;
    const spawnY = height + 40;

    // Angle trajectory towards center
    const targetCenterX = width / 2 + (Math.random() - 0.5) * 180;
    const vx = (targetCenterX - spawnX) * (0.015 + Math.random() * 0.008);
    const vy = -(Math.random() * 4 + 14.5); // upward launch velocity

    eng.fruits.push({
      id: eng.nextFruitId++,
      type,
      x: spawnX,
      y: spawnY,
      vx,
      vy,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.08,
      radius: spec.radius,
      sliced: false,
      gravity: 0.38,
    });
  };

  // Start Playing
  const handleStartGame = () => {
    const eng = engineRef.current;
    eng.fruits = [];
    eng.slicedHalves = [];
    eng.particles = [];
    eng.juiceSplats = [];
    eng.floatingTexts = [];
    eng.bladeTrail = [];
    eng.spawnTimer = 0;
    eng.difficultyTimer = 0;
    eng.freezeTimer = 0;
    eng.frenzyTimer = 0;
    eng.screenShake = 0;

    setScore(0);
    setStrikes(0);
    setFreezeActive(false);
    setFrenzyActive(false);
    setGameState('playing');
    sound.playPowerup();
  };

  const handleRestart = () => {
    handleStartGame();
  };

  // Buy Skin
  const handleBuySkin = (skin: BladeSkin) => {
    if (unlockedSkins.includes(skin.id)) {
      setActiveSkinId(skin.id);
      sound.playClick();
      return;
    }
    if (coins >= skin.price) {
      const newCoins = coins - skin.price;
      const newUnlocked = [...unlockedSkins, skin.id];
      setCoins(newCoins);
      setUnlockedSkins(newUnlocked);
      setActiveSkinId(skin.id);
      localStorage.setItem('cyber_katana_coins', newCoins.toString());
      localStorage.setItem('cyber_katana_skins', JSON.stringify(newUnlocked));
      sound.playComboFanfare(4);
    } else {
      sound.playLaser();
    }
  };

  // Sound Toggle
  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Slice a fruit
  const sliceFruit = (fruit: ActiveFruit, sliceAngle: number) => {
    const eng = engineRef.current;
    fruit.sliced = true;
    const spec = FRUIT_SPECS[fruit.type];

    if (fruit.type === 'bomb') {
      // Bomb explosion!
      sound.playBombExplode();
      eng.screenShake = 25;
      eng.bombFlash = 1;

      for (let i = 0; i < 35; i++) {
        const pAng = Math.random() * Math.PI * 2;
        const pSpd = Math.random() * 10 + 2;
        eng.particles.push({
          x: fruit.x,
          y: fruit.y,
          vx: Math.cos(pAng) * pSpd,
          vy: Math.sin(pAng) * pSpd,
          color: i % 2 === 0 ? '#ef4444' : '#f59e0b',
          size: Math.random() * 6 + 3,
          alpha: 1,
          decay: 0.03,
        });
      }

      setGameState('gameover');
      return;
    }

    // Normal fruit slice
    sound.playFruitSlice(1 + Math.random() * 0.3);
    eng.screenShake = 4;

    // Special powerups
    if (fruit.type === 'freeze_berry') {
      eng.freezeTimer = 240; // ~4 seconds
      setFreezeActive(true);
      sound.playPowerup();
      addFloatingText('❄️ BLIZZARD SLOW-MO!', '#38bdf8', fruit.x, fruit.y - 30);
    } else if (fruit.type === 'frenzy_banana') {
      eng.frenzyTimer = 220;
      setFrenzyActive(true);
      sound.playFrenzyIntro();
      addFloatingText('⚡ FRENZY STORM!', '#a3e635', fruit.x, fruit.y - 30);
      // Spawn instant frenzy wave
      for (let f = 0; f < 6; f++) {
        setTimeout(() => launchFruit(), f * 80);
      }
    } else if (fruit.type === 'dragonfruit') {
      sound.playComboFanfare(5);
      eng.screenShake = 12;
      addFloatingText('+20 👑 LEGENDARY!', '#fbbf24', fruit.x, fruit.y - 30);
    }

    // Add points & coins
    setScore((prev) => {
      const next = prev + spec.points;
      if (next > highScore) {
        setHighScore(next);
        localStorage.setItem('cyber_katana_highscore', next.toString());
      }
      return next;
    });

    setCoins((prev) => {
      const next = prev + 1;
      localStorage.setItem('cyber_katana_coins', next.toString());
      return next;
    });

    // Spawn 2 Sliced Halves flying apart perpendicular to sliceAngle
    const perpAngle = sliceAngle + Math.PI / 2;
    const splitSpeed = 4.5;

    eng.slicedHalves.push({
      type: fruit.type,
      x: fruit.x - Math.cos(perpAngle) * 6,
      y: fruit.y - Math.sin(perpAngle) * 6,
      vx: fruit.vx - Math.cos(perpAngle) * splitSpeed,
      vy: fruit.vy - Math.sin(perpAngle) * splitSpeed - 1.5,
      rotation: fruit.rotation,
      vRot: -0.15,
      sliceAngle,
      isLeftHalf: true,
      radius: fruit.radius,
      alpha: 1,
    });

    eng.slicedHalves.push({
      type: fruit.type,
      x: fruit.x + Math.cos(perpAngle) * 6,
      y: fruit.y + Math.sin(perpAngle) * 6,
      vx: fruit.vx + Math.cos(perpAngle) * splitSpeed,
      vy: fruit.vy + Math.sin(perpAngle) * splitSpeed - 1.5,
      rotation: fruit.rotation,
      vRot: 0.15,
      sliceAngle,
      isLeftHalf: false,
      radius: fruit.radius,
      alpha: 1,
    });

    // Add Juice Splat onto background
    if (eng.juiceSplats.length < 40) {
      eng.juiceSplats.push({
        x: fruit.x,
        y: fruit.y,
        color: spec.juiceColor,
        size: fruit.radius * (1.2 + Math.random() * 0.4),
        alpha: 0.55,
      });
    }

    // Juice Splash Particles
    for (let p = 0; p < 18; p++) {
      const pAng = sliceAngle + (Math.random() - 0.5) * 1.8;
      const pSpd = Math.random() * 8 + 2;
      eng.particles.push({
        x: fruit.x,
        y: fruit.y,
        vx: Math.cos(pAng) * pSpd,
        vy: Math.sin(pAng) * pSpd,
        color: spec.juiceColor,
        size: Math.random() * 4 + 2,
        alpha: 1,
        decay: 0.04,
      });
    }

    // Track combo in current swipe
    eng.currentSwipeFruitIds.add(fruit.id);
    const countInSwipe = eng.currentSwipeFruitIds.size;

    if (countInSwipe >= 3) {
      const comboBonus = countInSwipe * 2;
      setScore((prev) => prev + comboBonus);
      sound.playComboFanfare(countInSwipe);
      eng.screenShake = 8;
      const comboTitles = ['', '', '', '3x TRIPLE COMBO! 🔥', '4x ULTRA SLICE! ⚡', '5x GODLIKE BLITZ! 👑'];
      const title = comboTitles[Math.min(countInSwipe, 5)] || `${countInSwipe}x MEGA COMBO!`;
      addFloatingText(`${title} (+${comboBonus})`, '#38bdf8', fruit.x, fruit.y - 50);
    }
  };

  // --- DRAWING HELPERS FOR FRUIT HALF RENDERING ---
  const renderFruit = (ctx: CanvasRenderingContext2D, fruit: ActiveFruit) => {
    const spec = FRUIT_SPECS[fruit.type];
    ctx.save();
    ctx.translate(fruit.x, fruit.y);
    ctx.rotate(fruit.rotation);

    // Glow
    ctx.shadowColor = spec.glowColor;
    ctx.shadowBlur = 15;

    if (fruit.type === 'bomb') {
      // Bomb Sphere
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Flashing Skull / Hazard symbol
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', 0, 0);
    } else {
      // Whole Fruit Sphere
      ctx.fillStyle = spec.outerColor;
      ctx.beginPath();
      ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
      ctx.fill();

      // Outer Rim
      ctx.strokeStyle = '#ffffff44';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner icon / detail
      ctx.font = `${Math.floor(fruit.radius * 1.1)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(spec.icon, 0, 2);
    }

    ctx.restore();
  };

  const renderSlicedHalf = (ctx: CanvasRenderingContext2D, half: SlicedHalf) => {
    const spec = FRUIT_SPECS[half.type];
    ctx.save();
    ctx.translate(half.x, half.y);
    ctx.rotate(half.rotation);
    ctx.globalAlpha = Math.max(0, half.alpha);

    ctx.shadowColor = spec.glowColor;
    ctx.shadowBlur = 10;

    // Sliced Half semicircle path
    ctx.beginPath();
    if (half.isLeftHalf) {
      ctx.arc(0, 0, half.radius, -Math.PI / 2, Math.PI / 2, true);
    } else {
      ctx.arc(0, 0, half.radius, -Math.PI / 2, Math.PI / 2, false);
    }
    ctx.closePath();

    // Fill Rind Outer
    ctx.fillStyle = spec.outerColor;
    ctx.fill();

    // Fill Juicy Inner Core
    ctx.fillStyle = spec.innerColor;
    ctx.beginPath();
    if (half.isLeftHalf) {
      ctx.arc(0, 0, half.radius * 0.78, -Math.PI / 2, Math.PI / 2, true);
    } else {
      ctx.arc(0, 0, half.radius * 0.78, -Math.PI / 2, Math.PI / 2, false);
    }
    ctx.closePath();
    ctx.fill();

    // Slice flat edge highlight line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -half.radius);
    ctx.lineTo(0, half.radius);
    ctx.stroke();

    ctx.restore();
  };

  // --- MAIN PHYSICS & RENDER LOOP ---
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

      // 1. UPDATE GAME TIMERS & SPAWN LOGIC
      if (gameState === 'playing') {
        eng.difficultyTimer++;

        // Freeze Timer
        if (eng.freezeTimer > 0) {
          eng.freezeTimer--;
          if (eng.freezeTimer <= 0) setFreezeActive(false);
        }

        // Frenzy Timer
        if (eng.frenzyTimer > 0) {
          eng.frenzyTimer--;
          if (eng.frenzyTimer <= 0) setFrenzyActive(false);
        }

        // Fruit Spawning
        eng.spawnTimer++;
        const currentInterval = eng.frenzyTimer > 0 ? 25 : Math.max(35, eng.spawnInterval - Math.floor(eng.difficultyTimer / 500));

        if (eng.spawnTimer >= currentInterval) {
          eng.spawnTimer = 0;
          // Spawn 1 to 3 fruits per wave
          const waveCount = eng.frenzyTimer > 0 ? Math.floor(Math.random() * 2 + 2) : Math.random() < 0.35 ? 2 : 1;
          for (let w = 0; w < waveCount; w++) {
            launchFruit();
          }
        }

        // Update Fruits Physics
        const timeScale = eng.freezeTimer > 0 ? 0.4 : 1.0;

        for (let i = eng.fruits.length - 1; i >= 0; i--) {
          const f = eng.fruits[i];
          f.x += f.vx * timeScale;
          f.y += f.vy * timeScale;
          f.vy += f.gravity * timeScale;
          f.rotation += f.vRot * timeScale;

          // Check if fruit fell off bottom screen uncut
          if (f.y > height + 60 && f.vy > 0) {
            if (!f.sliced && f.type !== 'bomb') {
              // Missed a fruit! Strike!
              setStrikes((prev) => {
                const next = prev + 1;
                sound.playCrash();
                eng.screenShake = 12;
                if (next >= 3) {
                  setGameState('gameover');
                }
                return next;
              });
            }
            eng.fruits.splice(i, 1);
          }
        }
      }

      // Update Sliced Halves
      for (let i = eng.slicedHalves.length - 1; i >= 0; i--) {
        const sh = eng.slicedHalves[i];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.vy += 0.45;
        sh.rotation += sh.vRot;
        sh.alpha -= 0.015;
        if (sh.y > height + 100 || sh.alpha <= 0) {
          eng.slicedHalves.splice(i, 1);
        }
      }

      // Update Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.alpha -= p.decay;
        if (p.alpha <= 0) eng.particles.splice(i, 1);
      }

      // Update Floating Texts
      for (let i = eng.floatingTexts.length - 1; i >= 0; i--) {
        const ft = eng.floatingTexts[i];
        ft.y -= 1.4;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) eng.floatingTexts.splice(i, 1);
      }

      // Fade Juice Splats slowly
      eng.juiceSplats.forEach((js) => {
        js.alpha -= 0.0005;
      });
      eng.juiceSplats = eng.juiceSplats.filter((js) => js.alpha > 0.05);

      // Clean old blade trail segments
      const now = performance.now();
      eng.bladeTrail = eng.bladeTrail.filter((pt) => now - pt.time < 220);

      // Screen Shake damping
      if (eng.screenShake > 0) {
        eng.screenShake *= 0.86;
        if (eng.screenShake < 0.2) eng.screenShake = 0;
      }

      // Bomb Flash damping
      if (eng.bombFlash > 0) {
        eng.bombFlash -= 0.05;
        if (eng.bombFlash < 0) eng.bombFlash = 0;
      }

      // ==========================================
      // 2. RENDER GRAPHICS
      // ==========================================
      ctx.save();

      // Screen Shake
      if (eng.screenShake > 0) {
        const sx = (Math.random() - 0.5) * eng.screenShake;
        const sy = (Math.random() - 0.5) * eng.screenShake;
        ctx.translate(sx, sy);
      }

      // Dark Dojo Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(1, '#090d1f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Dojo Wall Wood Slats / Cyber Grid Pattern
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.lineWidth = 1.5;
      for (let y = 40; y < height; y += 45) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Render Juice Splats on Dojo Wall
      eng.juiceSplats.forEach((js) => {
        ctx.save();
        ctx.fillStyle = js.color;
        ctx.globalAlpha = Math.max(0, js.alpha);
        ctx.beginPath();
        ctx.arc(js.x, js.y, js.size, 0, Math.PI * 2);
        ctx.fill();

        // Mini satellite drip dots
        ctx.beginPath();
        ctx.arc(js.x + js.size * 0.8, js.y + js.size * 0.7, js.size * 0.25, 0, Math.PI * 2);
        ctx.arc(js.x - js.size * 0.7, js.y + js.size * 0.5, js.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Active Whole Fruits
      eng.fruits.forEach((f) => {
        if (!f.sliced) renderFruit(ctx, f);
      });

      // Render Sliced Flying Halves
      eng.slicedHalves.forEach((sh) => {
        renderSlicedHalf(ctx, sh);
      });

      // Render Splash Particles
      eng.particles.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Blade Swipe Trail (Neon Katana Slash)
      if (eng.bladeTrail.length >= 2) {
        const activeSkin = BLADE_SKINS.find((s) => s.id === activeSkinId) || BLADE_SKINS[0];

        ctx.save();
        ctx.shadowColor = activeSkin.glowColor;
        ctx.shadowBlur = 18;

        for (let i = 1; i < eng.bladeTrail.length; i++) {
          const pt1 = eng.bladeTrail[i - 1];
          const pt2 = eng.bladeTrail[i];
          const age = (now - pt2.time) / 220; // 0 (new) to 1 (old)
          const trailWidth = Math.max(1, (1 - age) * 9);

          ctx.strokeStyle = activeSkin.trailColor;
          ctx.lineWidth = trailWidth;
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();

          // White Hot Core
          ctx.strokeStyle = activeSkin.coreColor;
          ctx.lineWidth = trailWidth * 0.45;
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Render Floating Combo / Score Texts
      eng.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.font = '900 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 14;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // Bomb Explosion Fullscreen Flash
      if (eng.bombFlash > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${eng.bombFlash * 0.45})`;
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
  }, [gameState, activeSkinId, highScore]);

  // Line segment collision helper for swipe slicing
  const checkLineIntersectsCircle = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    circle: { x: number; y: number; radius: number }
  ) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(p1.x - circle.x, p1.y - circle.y) <= circle.radius;

    // Projection scalar t
    const t = Math.max(0, Math.min(1, ((circle.x - p1.x) * dx + (circle.y - p1.y) * dy) / lenSq));
    const nearestX = p1.x + t * dx;
    const nearestY = p1.y + t * dy;
    return Math.hypot(circle.x - nearestX, circle.y - nearestY) <= circle.radius;
  };

  // Pointer Movement (Blade Swiping)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 850;
    const y = ((e.clientY - rect.top) / rect.height) * 540;

    const eng = engineRef.current;
    eng.isSwiping = true;
    eng.currentSwipeFruitIds.clear();
    eng.bladeTrail = [{ x, y, time: performance.now() }];
    sound.playSwish();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 850;
    const y = ((e.clientY - rect.top) / rect.height) * 540;

    const eng = engineRef.current;
    if (!eng.isSwiping) return;

    const now = performance.now();
    const prevPt = eng.bladeTrail[eng.bladeTrail.length - 1] || { x, y, time: now };
    eng.bladeTrail.push({ x, y, time: now });

    // Check collision against all unsliced active fruits
    const swipeAngle = Math.atan2(y - prevPt.y, x - prevPt.x);

    eng.fruits.forEach((f) => {
      if (!f.sliced) {
        const hit = checkLineIntersectsCircle(prevPt, { x, y }, { x: f.x, y: f.y, radius: f.radius + 8 });
        if (hit) {
          sliceFruit(f, swipeAngle);
        }
      }
    });
  };

  const handlePointerUp = useCallback(() => {
    engineRef.current.isSwiping = false;
  }, []);

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerUp]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center select-none touch-none">
      {/* Container */}
      <div className="relative w-full bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Top HUD */}
        <div className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
          {/* Score & Strikes */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/80 border border-cyan-500/30 rounded-xl text-cyan-400 font-black text-sm">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>SCORE: {score}</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300 font-bold text-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>BEST: {highScore}</span>
            </div>

            {/* Lives / Strikes */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/40 border border-rose-500/30 rounded-xl">
              {[0, 1, 2].map((idx) => (
                <span key={idx} className="text-sm">
                  {idx < strikes ? '❌' : '🍉'}
                </span>
              ))}
            </div>
          </div>

          {/* Active Powerup Indicators & Controls */}
          <div className="flex items-center gap-2.5">
            {freezeActive && (
              <div className="flex items-center gap-1 px-2 py-1 bg-sky-950/80 border border-sky-400 text-sky-300 rounded-xl text-xs font-bold animate-pulse">
                <Snowflake className="w-3.5 h-3.5" />
                <span>FREEZE</span>
              </div>
            )}

            {frenzyActive && (
              <div className="flex items-center gap-1 px-2 py-1 bg-lime-950/80 border border-lime-400 text-lime-300 rounded-xl text-xs font-bold animate-bounce">
                <Flame className="w-3.5 h-3.5" />
                <span>FRENZY</span>
              </div>
            )}

            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/60 border border-amber-500/30 rounded-xl text-amber-400 text-sm font-bold">
              <span>🪙</span>
              <span>{coins}</span>
            </div>

            <button
              onClick={() => setShowShop(true)}
              className="p-1.5 bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-500/40 text-indigo-300 rounded-xl transition"
              title="Katana Blades Armory"
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
          className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[560px] flex items-center justify-center cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-xl shadow-rose-500/30 mb-4 animate-bounce">
                <Swords className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wider mb-2">
                CYBER KATANA <span className="text-rose-400">SLICER</span>
              </h2>
              <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
                Swipe your razor-sharp katana to slice flying cyber fruits! Chain multi-slice combos, grab Freeze & Frenzy powerups, and avoid ticking Hazard Bombs!
              </p>

              <button
                onClick={handleStartGame}
                className="px-8 py-3.5 bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-rose-500/40 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>START SLICING</span>
              </button>

              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-6 mt-4 sm:mt-8 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-slate-800 rounded border border-slate-700">SWIPE / DRAG</span>
                  <span>Slice Fruits</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-slate-800 rounded border border-slate-700">3+ IN 1 SWIPE</span>
                  <span>Mega Combos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-rose-950 text-rose-300 rounded border border-rose-800">💣 BOMBS</span>
                  <span>Avoid</span>
                </div>
              </div>
            </div>
          )}

          {/* Game Over Screen */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-3">
                <span className="text-3xl">🍉</span>
              </div>
              <h3 className="text-2xl font-black text-rose-400 tracking-wide mb-1">DOJO SESSION OVER!</h3>
              <p className="text-xs text-slate-400 mb-4">You missed 3 fruits or struck a ticking hazard bomb</p>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-72 mb-6 flex justify-around">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Final Score</div>
                  <div className="text-xl font-black text-white">{score}</div>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Best Record</div>
                  <div className="text-xl font-black text-amber-400">{highScore}</div>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Coins</div>
                  <div className="text-xl font-black text-amber-300">🪙 {coins}</div>
                </div>
              </div>

              <button
                onClick={handleRestart}
                className="px-8 py-3 bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>SLICE AGAIN</span>
              </button>
            </div>
          )}
        </div>

        {/* Katana Armory Shop Modal */}
        {showShop && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-40 p-6 flex flex-col items-center overflow-y-auto">
            <div className="w-full max-w-md flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-white font-black text-xl">
                <Swords className="w-5 h-5 text-rose-400" />
                <span>KATANA BLADES ARMORY</span>
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
                        ? 'bg-rose-950/60 border-rose-400 shadow-md shadow-rose-500/20'
                        : isUnlocked
                        ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-900/40 border-slate-800/60 opacity-80'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner"
                      style={{ backgroundColor: `${skin.trailColor}22`, border: `1.5px solid ${skin.trailColor}` }}
                    >
                      <span>{skin.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{skin.name}</div>
                      <div className="text-xs text-slate-400">
                        {isSelected ? (
                          <span className="text-rose-400 font-semibold">Equipped</span>
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
        )}
      </div>
    </div>
  );
};
