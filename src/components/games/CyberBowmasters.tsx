import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Trophy, RotateCcw, Zap, Sparkles, Volume2, VolumeX, Shield, Play, 
  Crosshair, Award, Flame, Star, CheckCircle, ArrowRight, Eye, Users,
  User, Bot, Wind, Target, Heart, ChevronRight, HelpCircle, Swords
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// TYPES & DATA STRUCTURES
// ----------------------------------------------------

export interface CyberHero {
  id: string;
  name: string;
  nameGuj: string;
  weaponName: string;
  weaponType: 'arrow' | 'rocket' | 'shuriken' | 'cryo_orb' | 'cluster_bomb' | 'solar_javelin';
  price: number;
  unlocked: boolean;
  color: string;
  glowColor: string;
  accentColor: string;
  avatarEmoji: string;
  baseDamage: number;
  headshotMult: number;
  specialAbilityDesc: string;
  description: string;
}

export const HEROES: CyberHero[] = [
  {
    id: 'kaito-archer',
    name: 'Kaito Plasma Archer',
    nameGuj: 'કાઇટો પ્લાઝ્મા આર્ચર',
    weaponName: 'Tri-Beam Plasma Bow',
    weaponType: 'arrow',
    price: 0,
    unlocked: true,
    color: '#00f0ff',
    glowColor: '#38bdf8',
    accentColor: '#0284c7',
    avatarEmoji: '🏹',
    baseDamage: 35,
    headshotMult: 2.2,
    specialAbilityDesc: 'Splits into 3 piercing plasma arrows in mid-air',
    description: 'Elite cyber-sniper wielding a synchronized holographic compound bow.',
  },
  {
    id: 'titan-01',
    name: 'Titan-01 Heavy Mech',
    nameGuj: 'ટાઇટન-01 હેવી મેક',
    weaponName: 'Thermobaric RPG Nuke',
    weaponType: 'rocket',
    price: 400,
    unlocked: false,
    color: '#ef4444',
    glowColor: '#f87171',
    accentColor: '#b91c1c',
    avatarEmoji: '🤖',
    baseDamage: 45,
    headshotMult: 1.8,
    specialAbilityDesc: 'Colossal explosive radius with extreme knockback force',
    description: 'Armored combat titan firing heavy incendiary micro-missiles.',
  },
  {
    id: 'shadow-ninja',
    name: 'Shadow-X Cyber Ninja',
    nameGuj: 'શેડો-X સાયબર નિન્જા',
    weaponName: 'Quantum Sonic Shuriken',
    weaponType: 'shuriken',
    price: 800,
    unlocked: false,
    color: '#a855f7',
    glowColor: '#c084fc',
    accentColor: '#7e22ce',
    avatarEmoji: '🥷',
    baseDamage: 38,
    headshotMult: 2.6,
    specialAbilityDesc: 'Ultra-flat trajectory with lethal headshot critical bonus',
    description: 'Stealth assassin throwing razor-sharp quantum energy blades.',
  },
  {
    id: 'valkyrie-mage',
    name: 'Valkyrie Cryo Mage',
    nameGuj: 'વાલ્કીરી ક્રાયો મેજ',
    weaponName: 'Glacial Ice Nova',
    weaponType: 'cryo_orb',
    price: 1300,
    unlocked: false,
    color: '#38bdf8',
    glowColor: '#7dd3fc',
    accentColor: '#0369a1',
    avatarEmoji: '❄️',
    baseDamage: 40,
    headshotMult: 2.0,
    specialAbilityDesc: 'Freezes target and inflicts frost damage over time',
    description: 'Harnesses sub-zero plasma orbs to encase enemies in crystalline ice.',
  },
  {
    id: 'volt-punk',
    name: 'Volt EMP Grenadier',
    nameGuj: 'વોલ્ટ EMP ગ્રેનેડિયર',
    weaponName: 'Cluster EMP Bomb',
    weaponType: 'cluster_bomb',
    price: 1900,
    unlocked: false,
    color: '#f59e0b',
    glowColor: '#fbbf24',
    accentColor: '#d97706',
    avatarEmoji: '💣',
    baseDamage: 42,
    headshotMult: 1.9,
    specialAbilityDesc: 'Detonates into 4 scattered explosive sub-munitions',
    description: 'Cyberpunk demolitions expert with volatile shockwave clusters.',
  },
  {
    id: 'pharaoh-sun',
    name: 'Pharaoh 24K Emperor',
    nameGuj: 'ફેરો 24K એમ્પરર',
    weaponName: 'Solar Flare Javelin',
    weaponType: 'solar_javelin',
    price: 2600,
    unlocked: false,
    color: '#facc15',
    glowColor: '#fde047',
    accentColor: '#ca8a04',
    avatarEmoji: '👑',
    baseDamage: 55,
    headshotMult: 2.5,
    specialAbilityDesc: 'Piercing golden spear triggering orbital solar laser beams',
    description: 'Ancient cybernetic ruler wielding god-tier golden celestial relics.',
  },
];

export type GameMode = 'campaign' | 'boss_raid' | 'two_player';

interface RagdollLimb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  length: number;
}

interface CharacterEntity {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  hero: CyberHero;
  facing: 1 | -1; // 1 = right, -1 = left
  isAi: boolean;
  isHit: boolean;
  hitTimer: number;
  isDead: boolean;
  ragdoll: {
    head: RagdollLimb;
    torso: RagdollLimb;
    leftArm: RagdollLimb;
    rightArm: RagdollLimb;
    leftLeg: RagdollLimb;
    rightLeg: RagdollLimb;
  };
}

interface ActiveProjectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerIndex: number; // 0 = P1, 1 = P2/AI
  hero: CyberHero;
  angle: number;
  trail: { x: number; y: number; alpha: number }[];
  isSubMunition?: boolean;
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
  vy: number;
  scale: number;
}

export const CyberBowmasters: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High-level States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('campaign');
  const [stageLevel, setStageLevel] = useState<number>(1);
  const [p1HeroId, setP1HeroId] = useState<string>('kaito-archer');
  const [p2HeroId, setP2HeroId] = useState<string>('titan-01');
  const [unlockedHeroes, setUnlockedHeroes] = useState<string[]>(() => {
    const saved = localStorage.getItem('bowmasters_unlocked_heroes');
    return saved ? JSON.parse(saved) : ['kaito-archer'];
  });
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('bowmasters_coins') || '250', 10);
  });
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('bowmasters_highscore') || '0', 10);
  });
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // In-Game Turn Status
  const [activeTurn, setActiveTurn] = useState<0 | 1>(0); // 0 = Player 1, 1 = Player 2 / AI
  const [windSpeed, setWindSpeed] = useState<number>(0);
  const [aimAngle, setAimAngle] = useState<number>(45);
  const [aimPower, setAimPower] = useState<number>(65);
  const [winner, setWinner] = useState<string | null>(null);

  // Modals
  const [showGarage, setShowGarage] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  const toggleMute = () => {
    const isMute = sound.toggleMute();
    setMuted(isMute);
  };

  const getHero = (id: string) => HEROES.find((h) => h.id === id) || HEROES[0];

  // ----------------------------------------------------
  // ENGINE STATE REFS
  // ----------------------------------------------------
  const engineRef = useRef<{
    p1: CharacterEntity;
    p2: CharacterEntity;
    projectiles: ActiveProjectile[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    wind: number;
    turn: 0 | 1;
    turnPhase: 'aiming' | 'projectile_flying' | 'impact_resolution' | 'swapping';
    aimState: {
      isDragging: boolean;
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
      angle: number;
      power: number;
    };
    aiDelayTimer: number;
    headshotZoomTimer: number;
    screenShake: number;
    lastTime: number;
    isRunning: boolean;
  } | null>(null);

  // Initialize Character Ragdoll Joints
  const createCharacter = (x: number, y: number, hero: CyberHero, facing: 1 | -1, isAi: boolean): CharacterEntity => {
    const hp = hero.id === 'pharaoh-sun' ? 140 : 100;
    return {
      x,
      y,
      hp,
      maxHp: hp,
      hero,
      facing,
      isAi,
      isHit: false,
      hitTimer: 0,
      isDead: false,
      ragdoll: {
        head: { x: 0, y: -42, vx: 0, vy: 0, angle: 0, vAngle: 0, length: 14 },
        torso: { x: 0, y: -20, vx: 0, vy: 0, angle: 0, vAngle: 0, length: 26 },
        leftArm: { x: -8 * facing, y: -24, vx: 0, vy: 0, angle: 0, vAngle: 0, length: 18 },
        rightArm: { x: 8 * facing, y: -24, vx: 0, vy: 0, angle: 0, vAngle: 0, length: 18 },
        leftLeg: { x: -6 * facing, y: 0, vx: 0, vy: 0, angle: 0, vAngle: 0, length: 22 },
        rightLeg: { x: 6 * facing, y: 0, vx: 0, vy: 0, angle: 0, vAngle: 0, length: 22 },
      },
    };
  };

  // ----------------------------------------------------
  // SETUP & START GAME
  // ----------------------------------------------------
  const startMatch = (mode: GameMode) => {
    sound.playPowerup();
    setGameMode(mode);

    const canvas = canvasRef.current;
    const width = canvas ? canvas.width : 960;
    const groundY = 420;

    const p1Hero = getHero(p1HeroId);
    let p2Hero = getHero(p2HeroId);

    if (mode === 'campaign') {
      const aiPool = HEROES.filter((h) => h.id !== p1HeroId);
      p2Hero = aiPool[(stageLevel - 1) % aiPool.length];
    } else if (mode === 'boss_raid') {
      p2Hero = HEROES[5]; // Pharaoh 24K Titan Boss
    }

    const p1 = createCharacter(180, groundY, p1Hero, 1, false);
    const p2 = createCharacter(width - 180, groundY, p2Hero, -1, mode !== 'two_player');

    const randomWind = Math.floor((Math.random() - 0.5) * 16);
    setWindSpeed(randomWind);

    engineRef.current = {
      p1,
      p2,
      projectiles: [],
      particles: [],
      floatingTexts: [],
      wind: randomWind,
      turn: 0,
      turnPhase: 'aiming',
      aimState: {
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        angle: 45,
        power: 65,
      },
      aiDelayTimer: 0,
      headshotZoomTimer: 0,
      screenShake: 0,
      lastTime: performance.now(),
      isRunning: true,
    };

    setActiveTurn(0);
    setWinner(null);
    setGameState('playing');
  };

  // ----------------------------------------------------
  // FIRE PROJECTILE
  // ----------------------------------------------------
  const fireProjectile = (ownerIndex: number, angleDeg: number, power: number) => {
    if (!engineRef.current) return;
    const eng = engineRef.current;
    const shooter = ownerIndex === 0 ? eng.p1 : eng.p2;

    const rad = (angleDeg * Math.PI) / 180;
    const speed = power * 0.38;

    const vx = Math.cos(rad) * speed * shooter.facing;
    const vy = -Math.sin(rad) * speed;

    const spawnX = shooter.x + 35 * shooter.facing;
    const spawnY = shooter.y - 30;

    if (shooter.hero.weaponType === 'rocket') {
      sound.playRocketLaunch();
    } else {
      sound.playJump();
    }

    eng.projectiles.push({
      id: Math.random(),
      x: spawnX,
      y: spawnY,
      vx,
      vy,
      ownerIndex,
      hero: shooter.hero,
      angle: rad,
      trail: [],
    });

    eng.turnPhase = 'projectile_flying';
  };

  // ----------------------------------------------------
  // AI AIM CALCULATION
  // ----------------------------------------------------
  const executeAiTurn = () => {
    if (!engineRef.current || !engineRef.current.isRunning) return;
    const { p1, p2, wind } = engineRef.current;

    const dx = Math.abs(p2.x - p1.x);
    const dy = p1.y - p2.y;

    // Ballistic projectile formula with wind compensation
    const gravity = 18;
    const desiredAngle = 40 + Math.random() * 25; // 40° to 65° high arc
    const rad = (desiredAngle * Math.PI) / 180;

    // Estimated power with slight randomized inaccuracy
    const speedEst = Math.sqrt((gravity * dx) / Math.sin(2 * rad)) * 2.6 - wind * 0.8;
    const power = Math.max(30, Math.min(100, speedEst + (Math.random() - 0.5) * 12));

    setAimAngle(Math.round(desiredAngle));
    setAimPower(Math.round(power));

    fireProjectile(1, desiredAngle, power);
  };

  // ----------------------------------------------------
  // MAIN 2D CANVAS GAME LOOP
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const gameLoop = () => {
      animId = requestAnimationFrame(gameLoop);
      if (!engineRef.current) return;

      const now = performance.now();
      const delta = Math.min((now - engineRef.current.lastTime) / 1000, 0.1);
      engineRef.current.lastTime = now;

      const eng = engineRef.current;
      const { p1, p2, projectiles, particles, floatingTexts } = eng;

      // Clear & Background
      ctx.save();
      ctx.fillStyle = '#050716';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Handle Screen Shake
      if (eng.screenShake > 0) {
        eng.screenShake -= delta * 3.5;
        const mag = Math.max(0, eng.screenShake) * 12;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }

      // Background Cyber Grid Lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Render Elevated Neon Platforms
      // P1 Platform
      ctx.fillStyle = '#042f2e';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(80, 420, 200, 140, [12, 12, 0, 0]);
      ctx.fill();
      ctx.stroke();

      // P2 Platform
      ctx.fillStyle = '#3b0718';
      ctx.strokeStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.beginPath();
      ctx.roundRect(canvas.width - 280, 420, 200, 140, [12, 12, 0, 0]);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Handle AI Turn Trigger
      if (eng.turn === 1 && eng.p2.isAi && eng.turnPhase === 'aiming') {
        eng.aiDelayTimer += delta;
        if (eng.aiDelayTimer > 1.2) {
          eng.aiDelayTimer = 0;
          executeAiTurn();
        }
      }

      // ----------------------------------------------------
      // UPDATE & RENDER PROJECTILES
      // ----------------------------------------------------
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];

        // Ballistic physics + Wind resistance
        proj.vy += 18 * delta; // Gravity
        proj.vx += eng.wind * 0.15 * delta; // Wind
        proj.x += proj.vx * 60 * delta;
        proj.y += proj.vy * 60 * delta;
        proj.angle = Math.atan2(proj.vy, proj.vx);

        // Record Trailing Particles
        proj.trail.push({ x: proj.x, y: proj.y, alpha: 1.0 });
        if (proj.trail.length > 14) proj.trail.shift();

        // Render Trail
        ctx.beginPath();
        for (let t = 0; t < proj.trail.length; t++) {
          const pt = proj.trail[t];
          ctx.strokeStyle = proj.hero.color;
          ctx.lineWidth = t * 0.5;
          if (t === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Render Projectile Head
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(proj.angle);
        ctx.fillStyle = proj.hero.color;
        ctx.shadowColor = proj.hero.glowColor;
        ctx.shadowBlur = 12;

        if (proj.hero.weaponType === 'arrow') {
          ctx.fillRect(-18, -2, 36, 4);
          ctx.beginPath();
          ctx.moveTo(18, -6);
          ctx.lineTo(26, 0);
          ctx.lineTo(18, 6);
          ctx.fill();
        } else if (proj.hero.weaponType === 'rocket') {
          ctx.fillRect(-15, -6, 30, 12);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(15, -6);
          ctx.lineTo(24, 0);
          ctx.lineTo(15, 6);
          ctx.fill();
        } else if (proj.hero.weaponType === 'shuriken') {
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Check Target Collision
        const target = proj.ownerIndex === 0 ? p2 : p1;
        const dx = proj.x - target.x;
        const dy = proj.y - (target.y - 30);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Hit Detection Box (Head: y - 50, Body: y - 30)
        const isHeadshot = proj.y < target.y - 40 && Math.abs(proj.x - target.x) < 22;
        const isBodyHit = dist < 32;

        if (isHeadshot || isBodyHit) {
          // HIT!
          const mult = isHeadshot ? proj.hero.headshotMult : 1.0;
          const damage = Math.round(proj.hero.baseDamage * mult);

          target.hp = Math.max(0, target.hp - damage);
          target.isHit = true;
          target.hitTimer = 0.6;
          eng.screenShake = isHeadshot ? 1.4 : 0.8;

          // Sound FX
          if (isHeadshot) {
            sound.playHeadshotZoom();
          } else {
            sound.playHit();
          }

          // Damage Text Floating
          floatingTexts.push({
            id: Math.random(),
            x: target.x,
            y: target.y - 50,
            text: isHeadshot ? `HEADSHOT! -${damage}` : `-${damage}`,
            color: isHeadshot ? '#facc15' : '#ef4444',
            alpha: 1.0,
            vy: -1.8,
            scale: isHeadshot ? 1.4 : 1.0,
          });

          // Neon Spark Splatter Particles
          for (let p = 0; p < 24; p++) {
            particles.push({
              x: proj.x,
              y: proj.y,
              vx: (Math.random() - 0.5) * 8 - proj.vx * 0.2,
              vy: (Math.random() - 0.5) * 8,
              color: isHeadshot ? '#facc15' : proj.hero.color,
              size: 2 + Math.random() * 4,
              alpha: 1.0,
              decay: 0.8 + Math.random() * 0.6,
            });
          }

          // Trigger Death Ragdoll if HP == 0
          if (target.hp <= 0) {
            target.isDead = true;
            sound.playWin();
            setWinner(proj.ownerIndex === 0 ? 'Player 1' : 'Player 2 / AI');
            setGameState('gameover');

            // Add Coins
            setCoins((prev) => {
              const updated = prev + 150;
              localStorage.setItem('bowmasters_coins', String(updated));
              return updated;
            });

            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
            });
          }

          // Remove projectile
          projectiles.splice(i, 1);
          eng.turnPhase = 'impact_resolution';
          continue;
        }

        // Ground / Out-of-bounds Check
        if (proj.y > 440 || proj.x < -100 || proj.x > canvas.width + 100) {
          // Ground explosion
          sound.playExplosion();
          for (let p = 0; p < 16; p++) {
            particles.push({
              x: proj.x,
              y: Math.min(proj.y, 420),
              vx: (Math.random() - 0.5) * 6,
              vy: -Math.random() * 5,
              color: '#f59e0b',
              size: 3 + Math.random() * 3,
              alpha: 1.0,
              decay: 0.9,
            });
          }

          projectiles.splice(i, 1);
          eng.turnPhase = 'impact_resolution';
        }
      }

      // Handle Turn Swap after Impact Resolution
      if (eng.turnPhase === 'impact_resolution' && projectiles.length === 0 && !p1.isDead && !p2.isDead) {
        const nextTurn = eng.turn === 0 ? 1 : 0;
        eng.turn = nextTurn;
        setActiveTurn(nextTurn);

        // Randomize next turn wind
        const newWind = Math.floor((Math.random() - 0.5) * 16);
        eng.wind = newWind;
        setWindSpeed(newWind);

        eng.turnPhase = 'aiming';
      }

      // ----------------------------------------------------
      // RENDER CHARACTERS (RAGDOLL JOINTS & VISUALS)
      // ----------------------------------------------------
      [p1, p2].forEach((char, idx) => {
        ctx.save();
        ctx.translate(char.x, char.y);

        // Stagger / Hit Flash
        if (char.hitTimer > 0) {
          char.hitTimer -= delta;
          ctx.translate((Math.random() - 0.5) * 4, 0);
        }

        const h = char.hero;
        const facing = char.facing;

        // Legs
        ctx.strokeStyle = h.color;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-6 * facing, -10);
        ctx.lineTo(-12 * facing, 0);
        ctx.moveTo(6 * facing, -10);
        ctx.lineTo(12 * facing, 0);
        ctx.stroke();

        // Torso / Body Armor
        ctx.fillStyle = h.accentColor;
        ctx.strokeStyle = h.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = h.glowColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(-12, -38, 24, 30, [6, 6, 4, 4]);
        ctx.fill();
        ctx.stroke();

        // Head & Cyber Visor
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, -52, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing Visor Line
        ctx.fillStyle = h.color;
        ctx.fillRect(facing === 1 ? 0 : -8, -54, 8, 4);

        // Arms & Weapon Aiming Angle
        ctx.strokeStyle = h.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, -30);

        if (eng.turn === idx && eng.turnPhase === 'aiming') {
          // Aiming pose
          const rad = (aimAngle * Math.PI) / 180;
          const armLen = 24;
          const armX = Math.cos(rad) * armLen * facing;
          const armY = -Math.sin(rad) * armLen;
          ctx.lineTo(armX, -30 + armY);
          ctx.stroke();

          // Weapon icon at hand
          ctx.font = '16px sans-serif';
          ctx.fillText(h.avatarEmoji, armX - 8, -30 + armY + 6);
        } else {
          // Idle pose
          ctx.lineTo(15 * facing, -20);
          ctx.stroke();
          ctx.font = '16px sans-serif';
          ctx.fillText(h.avatarEmoji, 15 * facing - 8, -14);
        }

        ctx.restore();

        // Health Bar Above Head
        const barW = 70;
        const barH = 7;
        const barX = char.x - barW / 2;
        const barY = char.y - 78;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeRect(barX, barY, barW, barH);

        const hpPct = Math.max(0, char.hp / char.maxHp);
        ctx.fillStyle = hpPct > 0.5 ? '#10b981' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(barX + 1, barY + 1, (barW - 2) * hpPct, barH - 2);

        // Hero Name Tag
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${char.hero.name} (${char.hp} HP)`, char.x, barY - 4);
      });

      // ----------------------------------------------------
      // RENDER AIMING TRAJECTORY ARC (GUIDELINE)
      // ----------------------------------------------------
      if (eng.turnPhase === 'aiming' && (eng.turn === 0 || !eng.p2.isAi)) {
        const activeChar = eng.turn === 0 ? p1 : p2;
        const rad = (aimAngle * Math.PI) / 180;
        const speed = aimPower * 0.38;

        let simX = activeChar.x + 35 * activeChar.facing;
        let simY = activeChar.y - 30;
        let simVx = Math.cos(rad) * speed * activeChar.facing;
        let simVy = -Math.sin(rad) * speed;

        ctx.strokeStyle = activeChar.hero.color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(simX, simY);

        for (let s = 0; s < 22; s++) {
          simVy += 18 * 0.05;
          simVx += eng.wind * 0.15 * 0.05;
          simX += simVx * 60 * 0.05;
          simY += simVy * 60 * 0.05;
          ctx.lineTo(simX, simY);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ----------------------------------------------------
      // RENDER PARTICLES & FLOATING TEXTS
      // ----------------------------------------------------
      for (let p = particles.length - 1; p >= 0; p--) {
        const pt = particles[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.2; // Gravity
        pt.alpha -= delta * pt.decay;

        if (pt.alpha <= 0) {
          particles.splice(p, 1);
          continue;
        }

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      for (let f = floatingTexts.length - 1; f >= 0; f--) {
        const ft = floatingTexts[f];
        ft.y += ft.vy;
        ft.alpha -= delta * 0.9;

        if (ft.alpha <= 0) {
          floatingTexts.splice(f, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = `black ${Math.round(18 * ft.scale)}px system-ui, sans-serif`;
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 10;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [aimAngle, aimPower]);

  // ----------------------------------------------------
  // TOUCH & MOUSE AIM GESTURES
  // ----------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || engineRef.current.turnPhase !== 'aiming') return;
    if (engineRef.current.turn === 1 && engineRef.current.p2.isAi) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    engineRef.current.aimState.isDragging = true;
    engineRef.current.aimState.startX = x;
    engineRef.current.aimState.startY = y;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !engineRef.current.aimState.isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = engineRef.current.aimState.startX - x;
    const dy = y - engineRef.current.aimState.startY;

    const activeChar = engineRef.current.turn === 0 ? engineRef.current.p1 : engineRef.current.p2;

    // Angle from drag vector
    let angleDeg = Math.round((Math.atan2(dy, dx * activeChar.facing) * 180) / Math.PI);
    angleDeg = Math.max(10, Math.min(85, angleDeg));

    // Power from drag distance
    const dist = Math.sqrt(dx * dx + dy * dy);
    const power = Math.max(20, Math.min(100, Math.round(dist * 0.75)));

    setAimAngle(angleDeg);
    setAimPower(power);
    sound.playTrajectoryPull();
  };

  const handlePointerUp = () => {
    if (!engineRef.current || !engineRef.current.aimState.isDragging) return;
    engineRef.current.aimState.isDragging = false;

    // Fire on release!
    fireProjectile(engineRef.current.turn, aimAngle, aimPower);
  };

  const buyHero = (hero: CyberHero) => {
    if (coins < hero.price) {
      sound.playHit();
      return;
    }
    sound.playWin();
    const newCoins = coins - hero.price;
    setCoins(newCoins);
    localStorage.setItem('bowmasters_coins', String(newCoins));

    const updated = [...unlockedHeroes, hero.id];
    setUnlockedHeroes(updated);
    localStorage.setItem('bowmasters_unlocked_heroes', JSON.stringify(updated));
    setP1HeroId(hero.id);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[420px] sm:h-[580px] md:h-[680px] max-h-[75vh] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden select-none border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 font-sans touch-none"
    >
      {/* 2D Canvas Viewport */}
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full block cursor-crosshair"
      />

      {/* ==================================================== */}
      {/* TOP HUD BAR (PLAYING)                                */}
      {/* ==================================================== */}
      {gameState === 'playing' && (
        <div className="pointer-events-none absolute inset-x-0 top-0 p-2.5 sm:p-6 flex items-center justify-between z-10 gap-2">
          {/* Active Player Turn Banner */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl backdrop-blur-md border text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-xl ${
                activeTurn === 0
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-rose-500/20 border-rose-400 text-rose-300'
              }`}
            >
              <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate max-w-[90px] xs:max-w-none">{activeTurn === 0 ? 'P1 TURN' : gameMode === 'two_player' ? 'P2 TURN' : 'AI TURN'}</span>
            </div>

            {/* Wind Indicator Gauge */}
            <div className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700 text-[10px] sm:text-xs font-bold text-slate-300 flex items-center gap-1 shadow-lg shrink-0">
              <Wind className={`w-3.5 h-3.5 ${windSpeed > 0 ? 'text-cyan-400' : 'text-amber-400'}`} />
              <span>{Math.abs(windSpeed)} MPH {windSpeed > 0 ? '▶' : '◀'}</span>
            </div>
          </div>

          {/* Aim Angle & Power Indicators */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="px-2.5 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700 text-right shadow-lg">
              <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 leading-none">Aim</div>
              <div className="text-xs sm:text-sm font-black text-white">
                <span className="text-cyan-400">{aimAngle}°</span> / <span className="text-fuchsia-400">{aimPower}%</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="pointer-events-auto p-2.5 rounded-2xl bg-slate-900/85 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-all shadow-lg active:scale-95"
            >
              {muted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MAIN MENU MODAL                                      */}
      {/* ==================================================== */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-20">
          <div className="max-w-md w-full bg-slate-900/90 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl shadow-cyan-950/60 animate-in fade-in zoom-in duration-300">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                <Crosshair className="w-3.5 h-3.5" />
                PREMIUM ARTILLERY DUEL
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                CYBER <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300">BOWMASTERS</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Drag and release to aim plasma bows, rockets, and quantum shurikens! Master trajectory ballistic physics and headshot multipliers!
              </p>
            </div>

            {/* Selected Hero Preview */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-cyan-500/30 flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getHero(p1HeroId).avatarEmoji}</span>
                <div>
                  <div className="text-sm font-black text-white">{getHero(p1HeroId).name}</div>
                  <div className="text-xs text-cyan-400">{getHero(p1HeroId).weaponName}</div>
                </div>
              </div>
              <button
                onClick={() => setShowGarage(true)}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold text-xs hover:bg-cyan-500 hover:text-slate-950 transition-all"
              >
                Change
              </button>
            </div>

            {/* Mode Select Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => startMatch('campaign')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <User className="w-5 h-5" />
                SOLO CAMPAIGN VS AI
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => startMatch('two_player')}
                  className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-fuchsia-400"
                >
                  <Users className="w-4 h-4 text-fuchsia-400" />
                  2-Player Pass & Play
                </button>
                <button
                  onClick={() => startMatch('boss_raid')}
                  className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-amber-400"
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  Titan Boss Raid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* GAME OVER MODAL                                      */}
      {/* ==================================================== */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-20 animate-in fade-in zoom-in duration-300">
          <div className="max-w-md w-full bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl shadow-cyan-950/60">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                DUEL RESOLVED
              </div>
              <h2 className="text-3xl font-black text-white">{winner} VICTORY!</h2>
              <p className="text-xs text-slate-300">
                Spectacular ballistic mastery and ragdoll knockouts!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-around">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Reward</div>
                <div className="text-xl font-black text-amber-400">+150 Coins</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Total Coins</div>
                <div className="text-xl font-black text-cyan-300">{coins}</div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => startMatch(gameMode)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                PLAY REMATCH
              </button>

              <button
                onClick={() => setGameState('menu')}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all border border-slate-700"
              >
                Return to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* HEROES GARAGE MODAL                                  */}
      {/* ==================================================== */}
      {showGarage && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-30 animate-in fade-in zoom-in duration-200">
          <div className="max-w-xl w-full bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">HERO ROSTER GARAGE</h2>
                <p className="text-xs text-slate-400">Unlock cyberpunk character classes with specialized weapons.</p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 text-sm font-black flex items-center gap-1.5">
                <Star className="w-4 h-4 text-cyan-400" />
                {coins} Coins
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {HEROES.map((hero) => {
                const isUnlocked = unlockedHeroes.includes(hero.id);
                const isSelected = p1HeroId === hero.id;

                return (
                  <div
                    key={hero.id}
                    onClick={() => {
                      if (isUnlocked) {
                        setP1HeroId(hero.id);
                        sound.playClick();
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20'
                        : isUnlocked
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                        : 'bg-slate-950/40 border-slate-900 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{hero.avatarEmoji}</span>
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black uppercase">
                          EQUIPPED
                        </span>
                      ) : isUnlocked ? (
                        <span className="text-[10px] text-slate-400 font-bold">READY</span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-bold">{hero.price} Coins</span>
                      )}
                    </div>

                    <div>
                      <div className="font-extrabold text-sm text-white">{hero.name}</div>
                      <div className="text-[11px] text-cyan-300 mt-0.5">{hero.weaponName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{hero.specialAbilityDesc}</div>
                    </div>

                    {!isUnlocked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          buyHero(hero);
                        }}
                        disabled={coins < hero.price}
                        className={`mt-1 w-full py-1.5 rounded-xl text-xs font-bold transition-all ${
                          coins >= hero.price
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        Unlock ({hero.price})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowGarage(false)}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all"
            >
              Back to Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
