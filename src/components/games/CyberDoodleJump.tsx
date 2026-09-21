import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Trophy, 
  Zap, 
  Shield, 
  Rocket, 
  Sparkles, 
  Crosshair, 
  ArrowLeft, 
  ArrowRight,
  ShoppingBag,
  X,
  Target
} from 'lucide-react';
import { sound } from '../../utils/audio';

// Internal Virtual Resolution
const V_WIDTH = 500;
const V_HEIGHT = 760;

// Physics Constants
const GRAVITY = 0.42;
const JUMP_FORCE = -12.5;
const SPRING_FORCE = -20.5;
const TRAMPOLINE_FORCE = -25.0;
const JETPACK_FORCE = -14.0;
const JETPACK_DURATION = 210; // frames (~3.5 seconds)

// Types
type PlatformType = 'normal' | 'moving' | 'broken' | 'disappearing' | 'bouncy';
type ItemType = 'spring' | 'trampoline' | 'jetpack' | 'shield' | 'coin' | null;

interface Platform {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: PlatformType;
  vx: number;
  hasItem: ItemType;
  itemOffset: number;
  brokenState?: boolean;
  brokenAlpha?: number;
  disappearTimer?: number;
  opacity?: number;
}

interface Monster {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: 'drone' | 'alien' | 'blackhole';
  hp: number;
  maxHp: number;
  animFrame: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
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

interface CharacterSkin {
  id: string;
  name: string;
  price: number;
  color: string;
  eyeColor: string;
  glowColor: string;
  unlocked: boolean;
  perk: string;
}

const SKINS: CharacterSkin[] = [
  { id: 'hopper-neon', name: 'Cyber Hopper', price: 0, color: '#06b6d4', eyeColor: '#ffffff', glowColor: '#22d3ee', unlocked: true, perk: 'Standard Quantum Agility' },
  { id: 'mecha-doodler', name: 'Mecha Doodler', price: 150, color: '#10b981', eyeColor: '#34d399', glowColor: '#059669', unlocked: false, perk: '+10% Higher Spring Jump' },
  { id: 'void-phantom', name: 'Void Phantom', price: 350, color: '#a855f7', eyeColor: '#f43f5e', glowColor: '#c084fc', unlocked: false, perk: '+25% Longer Jetpack Fuel' },
  { id: 'solar-phoenix', name: 'Solar Phoenix', price: 600, color: '#f59e0b', eyeColor: '#ffffff', glowColor: '#fbbf24', unlocked: false, perk: 'Starts with 1 Energy Shield' },
  { id: 'hyper-matrix', name: 'Hyper Matrix 9000', price: 1000, color: '#ec4899', eyeColor: '#38bdf8', glowColor: '#f472b6', unlocked: false, perk: '2x Gold Coin Multiplier' },
];

export const CyberDoodleJump: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React state
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_jump_highscore') || '0', 10);
  });
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_jump_coins') || '50', 10);
  });
  const [selectedSkinId, setSelectedSkinId] = useState<string>('hopper-neon');
  const [skins, setSkins] = useState<CharacterSkin[]>(() => {
    const saved = localStorage.getItem('cyber_jump_skins');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return SKINS;
      }
    }
    return SKINS;
  });
  const [showWardrobe, setShowWardrobe] = useState<boolean>(false);
  const [activeJetpack, setActiveJetpack] = useState<boolean>(false);
  const [hasShield, setHasShield] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());

  // Input states
  const keysRef = useRef<{ left: boolean; right: boolean; shoot: boolean }>({
    left: false,
    right: false,
    shoot: false,
  });
  const touchAimRef = useRef<{ active: boolean; dir: number }>({ active: false, dir: 0 });

  // Game Engine Ref
  const engineRef = useRef({
    player: {
      x: V_WIDTH / 2 - 20,
      y: V_HEIGHT - 180,
      width: 44,
      height: 48,
      vx: 0,
      vy: 0,
      facing: 'right' as 'left' | 'right',
      isSquished: 0, // animation squish factor
      jetpackTimer: 0,
      shieldActive: false,
      invulnerableTimer: 0,
    },
    cameraY: 0,
    maxAltitude: 0,
    platforms: [] as Platform[],
    monsters: [] as Monster[],
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    nextPlatformY: V_HEIGHT - 100,
    nextMonsterY: -300,
    nextPlatformId: 1,
    nextMonsterId: 1,
    nextTextId: 1,
    stars: Array.from({ length: 60 }, () => ({
      x: Math.random() * V_WIDTH,
      y: Math.random() * V_HEIGHT,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.5 + 0.2,
      brightness: Math.random() * 0.8 + 0.2,
    })),
    lastShootTime: 0,
    sessionCoins: 0,
  });

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Helper for floating text
  const addFloatingText = (x: number, y: number, text: string, color: string = '#22d3ee') => {
    const eng = engineRef.current;
    eng.floatingTexts.push({
      id: eng.nextTextId++,
      x,
      y,
      text,
      color,
      alpha: 1,
      scale: 1.2,
    });
  };

  // Helper for spark particles
  const createSparks = (x: number, y: number, count: number, color: string) => {
    const eng = engineRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      eng.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 2.5 + 1.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 15,
      });
    }
  };

  // Generate a platform
  const generatePlatformAt = (y: number) => {
    const eng = engineRef.current;
    const width = 68;
    const height = 14;
    const x = Math.random() * (V_WIDTH - width - 40) + 20;

    // Determine platform type based on altitude
    const alt = -y;
    let type: PlatformType = 'normal';
    const rand = Math.random();

    if (alt > 3000) {
      if (rand < 0.28) type = 'moving';
      else if (rand < 0.48) type = 'broken';
      else if (rand < 0.62) type = 'disappearing';
    } else if (alt > 1200) {
      if (rand < 0.3) type = 'moving';
      else if (rand < 0.45) type = 'broken';
    } else if (alt > 400) {
      if (rand < 0.22) type = 'moving';
    }

    // Determine powerups / items on platform
    let hasItem: ItemType = null;
    if (type === 'normal' || type === 'moving') {
      const itemRand = Math.random();
      if (itemRand < 0.04) hasItem = 'jetpack';
      else if (itemRand < 0.12) hasItem = 'spring';
      else if (itemRand < 0.15) hasItem = 'trampoline';
      else if (itemRand < 0.20) hasItem = 'shield';
      else if (itemRand < 0.38) hasItem = 'coin';
    }

    eng.platforms.push({
      id: eng.nextPlatformId++,
      x,
      y,
      width,
      height,
      type,
      vx: type === 'moving' ? (Math.random() > 0.5 ? 2 : -2) : 0,
      hasItem,
      itemOffset: Math.random() * (width - 24) + 12,
      brokenState: false,
      brokenAlpha: 1,
      disappearTimer: 0,
      opacity: 1,
    });
  };

  // Generate monster
  const generateMonsterAt = (y: number) => {
    const eng = engineRef.current;
    const types: ('drone' | 'alien' | 'blackhole')[] = ['drone', 'alien', 'blackhole'];
    const type = types[Math.floor(Math.random() * types.length)];
    const width = type === 'blackhole' ? 52 : 44;
    const height = type === 'blackhole' ? 52 : 40;
    const x = Math.random() * (V_WIDTH - width - 60) + 30;

    eng.monsters.push({
      id: eng.nextMonsterId++,
      x,
      y,
      width,
      height,
      vx: type === 'drone' ? (Math.random() > 0.5 ? 1.5 : -1.5) : 0,
      type,
      hp: type === 'blackhole' ? 999 : 1,
      maxHp: 1,
      animFrame: 0,
    });
  };

  // Initialize or Reset Game
  const initGame = useCallback(() => {
    const eng = engineRef.current;
    const activeSkin = skins.find((s) => s.id === selectedSkinId);

    eng.player = {
      x: V_WIDTH / 2 - 22,
      y: V_HEIGHT - 160,
      width: 44,
      height: 48,
      vx: 0,
      vy: JUMP_FORCE,
      facing: 'right',
      isSquished: 0,
      jetpackTimer: 0,
      shieldActive: activeSkin?.id === 'solar-phoenix',
      invulnerableTimer: 0,
    };
    eng.cameraY = 0;
    eng.maxAltitude = 0;
    eng.platforms = [];
    eng.monsters = [];
    eng.bullets = [];
    eng.particles = [];
    eng.floatingTexts = [];
    eng.nextPlatformId = 1;
    eng.nextMonsterId = 1;
    eng.nextTextId = 1;
    eng.sessionCoins = 0;

    // Initial base platform directly under player
    eng.platforms.push({
      id: eng.nextPlatformId++,
      x: V_WIDTH / 2 - 40,
      y: V_HEIGHT - 80,
      width: 80,
      height: 14,
      type: 'normal',
      vx: 0,
      hasItem: null,
      itemOffset: 40,
      opacity: 1,
    });

    // Generate initial set of platforms upward
    let currentY = V_HEIGHT - 140;
    while (currentY > -V_HEIGHT) {
      generatePlatformAt(currentY);
      const gap = Math.random() * 45 + 55;
      currentY -= gap;
    }
    eng.nextPlatformY = currentY;
    eng.nextMonsterY = -400;

    setScore(0);
    setActiveJetpack(false);
    setHasShield(eng.player.shieldActive);
  }, [selectedSkinId, skins]);

  // Start Playing
  const handleStart = () => {
    initGame();
    setGameState('playing');
    sound.playPowerup();
  };

  // Restart
  const handleRestart = () => {
    initGame();
    setGameState('playing');
    sound.playPowerup();
  };

  // Shoot Bullet Upward
  const shootBullet = () => {
    const eng = engineRef.current;
    if (Date.now() - eng.lastShootTime < 220) return;
    eng.lastShootTime = Date.now();

    const p = eng.player;
    sound.playCyberShoot();
    createSparks(p.x + p.width / 2, p.y - 4, 6, '#38bdf8');

    eng.bullets.push({
      x: p.x + p.width / 2,
      y: p.y - 6,
      vx: 0,
      vy: -15,
      radius: 5,
      alpha: 1,
    });
  };

  // Buy Skin in Wardrobe
  const buySkin = (skin: CharacterSkin) => {
    if (coins >= skin.price && !skin.unlocked) {
      const newCoins = coins - skin.price;
      const updatedSkins = skins.map((s) => (s.id === skin.id ? { ...s, unlocked: true } : s));
      setCoins(newCoins);
      setSkins(updatedSkins);
      setSelectedSkinId(skin.id);
      localStorage.setItem('cyber_jump_coins', newCoins.toString());
      localStorage.setItem('cyber_jump_skins', JSON.stringify(updatedSkins));
      sound.playPowerup();
    }
  };

  // Select Skin
  const selectSkin = (skin: CharacterSkin) => {
    if (skin.unlocked) {
      setSelectedSkinId(skin.id);
      sound.playClick();
    }
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        keysRef.current.left = true;
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        keysRef.current.right = true;
      }
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        if (gameState === 'playing') {
          shootBullet();
        } else if (gameState === 'start' || gameState === 'gameover') {
          handleStart();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        keysRef.current.left = false;
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        keysRef.current.right = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Initial Game Setup on mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Main Loop & Canvas Rendering
  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const eng = engineRef.current;
      const p = eng.player;
      const activeSkin = skins.find((s) => s.id === selectedSkinId) || SKINS[0];

      // ==========================================
      // 1. UPDATE PHYSICS & ENTITIES (IF PLAYING)
      // ==========================================
      if (gameState === 'playing') {
        // Horizontal Movement Controls
        const accel = 0.95;
        const maxVx = 7.5;
        if (keysRef.current.left || (touchAimRef.current.active && touchAimRef.current.dir < -0.2)) {
          p.vx = Math.max(p.vx - accel, -maxVx);
          p.facing = 'left';
        } else if (keysRef.current.right || (touchAimRef.current.active && touchAimRef.current.dir > 0.2)) {
          p.vx = Math.min(p.vx + accel, maxVx);
          p.facing = 'right';
        } else {
          p.vx *= 0.84;
        }

        // Apply Jetpack or Gravity
        if (p.jetpackTimer > 0) {
          p.jetpackTimer--;
          p.vy = JETPACK_FORCE;
          setActiveJetpack(true);

          // Jetpack thruster sparks
          if (Math.random() < 0.85) {
            eng.particles.push({
              x: p.x + (p.facing === 'right' ? 8 : p.width - 8),
              y: p.y + p.height - 4,
              vx: (Math.random() - 0.5) * 3,
              vy: Math.random() * 5 + 3,
              radius: Math.random() * 3 + 2,
              color: Math.random() > 0.5 ? '#f59e0b' : '#ef4444',
              alpha: 1,
              life: 0,
              maxLife: 20,
            });
          }
        } else {
          if (activeJetpack) setActiveJetpack(false);
          p.vy += GRAVITY;
        }

        // Apply Position
        p.x += p.vx;
        p.y += p.vy;

        // Screen Wrap-Around Horizontal Edges
        if (p.x + p.width < 0) {
          p.x = V_WIDTH;
        } else if (p.x > V_WIDTH) {
          p.x = -p.width;
        }

        // Squish animation recovery
        if (p.isSquished > 0) {
          p.isSquished = Math.max(0, p.isSquished - 0.08);
        }

        // Invulnerability countdown
        if (p.invulnerableTimer > 0) {
          p.invulnerableTimer--;
        }

        // Update Camera & Altitude Tracker
        const targetScreenY = V_HEIGHT * 0.45;
        if (p.y < targetScreenY) {
          const diff = targetScreenY - p.y;
          p.y = targetScreenY;
          eng.cameraY += diff;

          const currentAltitude = Math.floor(eng.cameraY);
          if (currentAltitude > eng.maxAltitude) {
            eng.maxAltitude = currentAltitude;
            setScore(currentAltitude);
            if (currentAltitude > highScore) {
              setHighScore(currentAltitude);
              localStorage.setItem('cyber_jump_highscore', currentAltitude.toString());
            }
          }
        }

        // Generate more platforms as camera ascends
        while (eng.nextPlatformY > -eng.cameraY - V_HEIGHT) {
          generatePlatformAt(eng.nextPlatformY);
          const gap = Math.random() * 48 + 58;
          eng.nextPlatformY -= gap;
        }

        // Generate monsters periodically at higher altitudes
        if (eng.maxAltitude > 500 && eng.nextMonsterY > -eng.cameraY - V_HEIGHT) {
          if (Math.random() < 0.65) {
            generateMonsterAt(eng.nextMonsterY);
          }
          eng.nextMonsterY -= Math.random() * 400 + 450;
        }

        // Platform Collisions (Only when falling downward, vy > 0)
        if (p.vy > 0 && p.jetpackTimer <= 0) {
          for (let i = 0; i < eng.platforms.length; i++) {
            const plat = eng.platforms[i];
            if (plat.brokenState) continue;

            const platTop = plat.y + eng.cameraY;
            const playerBottom = p.y + p.height;
            const playerFeetX = p.x + p.width / 2;

            // Check bounding collision on top of platform
            if (
              playerBottom >= platTop &&
              playerBottom <= platTop + 16 &&
              playerFeetX >= plat.x - 12 &&
              playerFeetX <= plat.x + plat.width + 12
            ) {
              // Check what type of platform was hit
              if (plat.type === 'broken') {
                plat.brokenState = true;
                sound.playPlatformBreak();
                createSparks(plat.x + plat.width / 2, platTop, 12, '#f97316');
                addFloatingText(plat.x + plat.width / 2, platTop - 10, 'CRACK!', '#f97316');
                continue; // Do not bounce on broken platforms!
              }

              // Check Item pickup on platform
              if (plat.hasItem === 'spring') {
                const springMult = activeSkin.id === 'mecha-doodler' ? 1.15 : 1.0;
                p.vy = SPRING_FORCE * springMult;
                plat.hasItem = null;
                sound.playSpringBounce();
                createSparks(plat.x + plat.itemOffset, platTop, 16, '#38bdf8');
                addFloatingText(plat.x + plat.itemOffset, platTop - 15, '⚡ MEGA BOUNCE!', '#38bdf8');
              } else if (plat.hasItem === 'trampoline') {
                p.vy = TRAMPOLINE_FORCE;
                plat.hasItem = null;
                sound.playSpringBounce();
                createSparks(plat.x + plat.itemOffset, platTop, 20, '#a855f7');
                addFloatingText(plat.x + plat.itemOffset, platTop - 15, '🚀 HYPER TRAMPOLINE!', '#c084fc');
              } else if (plat.hasItem === 'jetpack') {
                const fuelMult = activeSkin.id === 'void-phantom' ? 1.35 : 1.0;
                p.jetpackTimer = Math.floor(JETPACK_DURATION * fuelMult);
                plat.hasItem = null;
                sound.playJetpackLaunch();
                createSparks(plat.x + plat.itemOffset, platTop, 24, '#f59e0b');
                addFloatingText(plat.x + plat.itemOffset, platTop - 20, '🔥 JETPACK OVERDRIVE!', '#fbbf24');
              } else if (plat.hasItem === 'shield') {
                p.shieldActive = true;
                setHasShield(true);
                plat.hasItem = null;
                sound.playPowerup();
                createSparks(plat.x + plat.itemOffset, platTop, 16, '#10b981');
                addFloatingText(plat.x + plat.itemOffset, platTop - 15, '🛡️ SHIELD ACTIVE!', '#34d399');
              } else if (plat.hasItem === 'coin') {
                const multiplier = activeSkin.id === 'hyper-matrix' ? 2 : 1;
                const earned = 5 * multiplier;
                setCoins((prev) => {
                  const updated = prev + earned;
                  localStorage.setItem('cyber_jump_coins', updated.toString());
                  return updated;
                });
                eng.sessionCoins += earned;
                plat.hasItem = null;
                sound.playCollect();
                createSparks(plat.x + plat.itemOffset, platTop, 12, '#eab308');
                addFloatingText(plat.x + plat.itemOffset, platTop - 15, `+${earned} COINS`, '#fbbf24');
                p.vy = JUMP_FORCE;
              } else {
                // Regular Platform Bounce
                p.vy = JUMP_FORCE;
                sound.playJumpBounce();
                createSparks(playerFeetX, platTop, 8, '#22d3ee');
              }

              p.isSquished = 0.35;
              break;
            }
          }
        }

        // Update Moving Platforms
        eng.platforms.forEach((plat) => {
          if (plat.type === 'moving') {
            plat.x += plat.vx;
            if (plat.x <= 15) {
              plat.x = 15;
              plat.vx = Math.abs(plat.vx);
            } else if (plat.x + plat.width >= V_WIDTH - 15) {
              plat.x = V_WIDTH - 15 - plat.width;
              plat.vx = -Math.abs(plat.vx);
            }
          } else if (plat.type === 'disappearing') {
            plat.disappearTimer = ((plat.disappearTimer || 0) + 0.04) % (Math.PI * 2);
            plat.opacity = 0.5 + 0.5 * Math.sin(plat.disappearTimer);
          }

          // Broken platform drop
          if (plat.brokenState && plat.brokenAlpha) {
            plat.y += 6;
            plat.brokenAlpha = Math.max(0, plat.brokenAlpha - 0.05);
          }
        });

        // Update Bullets
        for (let i = eng.bullets.length - 1; i >= 0; i--) {
          const b = eng.bullets[i];
          b.y += b.vy;

          // Check collision with monsters
          for (let m = eng.monsters.length - 1; m >= 0; m--) {
            const mon = eng.monsters[m];
            const monScreenY = mon.y + eng.cameraY;
            if (
              b.x >= mon.x &&
              b.x <= mon.x + mon.width &&
              b.y >= monScreenY &&
              b.y <= monScreenY + mon.height
            ) {
              // Destroy monster
              sound.playMonsterZap();
              createSparks(mon.x + mon.width / 2, monScreenY + mon.height / 2, 20, '#ef4444');
              addFloatingText(mon.x + mon.width / 2, monScreenY - 10, '+200 ZAPPED!', '#ef4444');
              setScore((prev) => prev + 200);
              eng.monsters.splice(m, 1);
              eng.bullets.splice(i, 1);
              break;
            }
          }

          if (b.y < -50) {
            eng.bullets.splice(i, 1);
          }
        }

        // Update Monsters & Monster Collisions
        for (let i = eng.monsters.length - 1; i >= 0; i--) {
          const mon = eng.monsters[i];
          mon.animFrame = (mon.animFrame + 0.08) % (Math.PI * 2);

          if (mon.type === 'drone') {
            mon.x += mon.vx;
            if (mon.x <= 20 || mon.x + mon.width >= V_WIDTH - 20) {
              mon.vx *= -1;
            }
          }

          const monScreenY = mon.y + eng.cameraY;

          // Collision with Player
          if (p.invulnerableTimer <= 0) {
            const pBox = { left: p.x + 6, right: p.x + p.width - 6, top: p.y + 6, bottom: p.y + p.height - 6 };
            const mBox = { left: mon.x + 4, right: mon.x + mon.width - 4, top: monScreenY + 4, bottom: monScreenY + mon.height - 4 };

            if (
              pBox.right >= mBox.left &&
              pBox.left <= mBox.right &&
              pBox.bottom >= mBox.top &&
              pBox.top <= mBox.bottom
            ) {
              // If player is flying with Jetpack -> Vaporize monster!
              if (p.jetpackTimer > 0) {
                sound.playMonsterZap();
                createSparks(mon.x + mon.width / 2, monScreenY + mon.height / 2, 25, '#fbbf24');
                addFloatingText(mon.x + mon.width / 2, monScreenY - 15, 'DESTROYED!', '#fbbf24');
                eng.monsters.splice(i, 1);
                continue;
              }

              // If player is stomping down on top of enemy head -> bounce kill!
              if (p.vy > 0 && p.y + p.height - 12 <= monScreenY + 16 && mon.type !== 'blackhole') {
                p.vy = JUMP_FORCE;
                sound.playMonsterZap();
                createSparks(mon.x + mon.width / 2, monScreenY + mon.height / 2, 20, '#38bdf8');
                addFloatingText(mon.x + mon.width / 2, monScreenY - 10, 'STOMPED +150!', '#38bdf8');
                eng.monsters.splice(i, 1);
                continue;
              }

              // If player has shield -> Absorb hit!
              if (p.shieldActive) {
                p.shieldActive = false;
                setHasShield(false);
                p.invulnerableTimer = 60; // 1 sec invulnerable
                p.vy = JUMP_FORCE * 0.8;
                sound.playHit();
                createSparks(p.x + p.width / 2, p.y + p.height / 2, 24, '#10b981');
                addFloatingText(p.x + p.width / 2, p.y - 15, 'SHIELD BROKEN!', '#34d399');
                continue;
              }

              // Game Over on Monster Collision!
              sound.playGameOver();
              setGameState('gameover');
              createSparks(p.x + p.width / 2, p.y + p.height / 2, 35, '#ef4444');
              break;
            }
          }
        }

        // Cleanup off-screen platforms and monsters below bottom edge
        eng.platforms = eng.platforms.filter((plat) => plat.y + eng.cameraY < V_HEIGHT + 100);
        eng.monsters = eng.monsters.filter((mon) => mon.y + eng.cameraY < V_HEIGHT + 100);

        // Check Fall Game Over Condition
        if (p.y > V_HEIGHT + 40) {
          if (p.shieldActive) {
            // Shield saves once from falling!
            p.shieldActive = false;
            setHasShield(false);
            p.y = V_HEIGHT - 100;
            p.vy = SPRING_FORCE;
            sound.playSpringBounce();
            createSparks(p.x + p.width / 2, p.y + p.height, 20, '#10b981');
            addFloatingText(p.x + p.width / 2, p.y - 15, 'SHIELD RESCUE!', '#10b981');
          } else {
            sound.playGameOver();
            setGameState('gameover');
          }
        }
      }

      // ==========================================
      // 2. RENDER GRAPHICS & BACKGROUND
      // ==========================================
      ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

      // Deep Cyber Sky Gradient with Dynamic Altitude Shift
      const altFactor = Math.min(eng.maxAltitude / 8000, 1);
      const bgGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
      if (altFactor < 0.3) {
        bgGrad.addColorStop(0, '#0a0d1a');
        bgGrad.addColorStop(1, '#05070e');
      } else if (altFactor < 0.7) {
        bgGrad.addColorStop(0, '#180a2b');
        bgGrad.addColorStop(1, '#090514');
      } else {
        bgGrad.addColorStop(0, '#040b1e');
        bgGrad.addColorStop(1, '#02030a');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      // Parallax Starfield & Quantum Dust
      ctx.fillStyle = '#ffffff';
      eng.stars.forEach((star) => {
        const starY = (star.y + eng.cameraY * star.speed) % V_HEIGHT;
        ctx.globalAlpha = star.brightness;
        ctx.beginPath();
        ctx.arc(star.x, starY, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Draw Atmospheric Grid Lines in Background
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.04)';
      ctx.lineWidth = 1;
      const gridOffset = eng.cameraY % 60;
      for (let y = gridOffset; y < V_HEIGHT; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(V_WIDTH, y);
        ctx.stroke();
      }

      // Draw Platforms
      eng.platforms.forEach((plat) => {
        const platY = plat.y + eng.cameraY;
        if (platY < -40 || platY > V_HEIGHT + 40) return;

        ctx.save();
        ctx.globalAlpha = (plat.brokenState ? plat.brokenAlpha || 0 : plat.opacity || 1);

        // Platform Body & Glowing Border
        let color = '#22d3ee';
        let glow = '#06b6d4';
        if (plat.type === 'moving') {
          color = '#38bdf8';
          glow = '#0284c7';
        } else if (plat.type === 'broken') {
          color = '#f97316';
          glow = '#ea580c';
        } else if (plat.type === 'disappearing') {
          color = '#c084fc';
          glow = '#9333ea';
        }

        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;

        // Platform base pill
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(plat.x, platY, plat.width, plat.height, 6);
        ctx.fill();

        // Inner neon highlight bar
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(plat.x + 8, platY + 2, plat.width - 16, 2);

        ctx.restore();

        // Draw Power-ups / Items on top of platform
        if (plat.hasItem && !plat.brokenState) {
          const itemX = plat.x + plat.itemOffset;
          const itemY = platY - 14;

          if (plat.hasItem === 'spring') {
            // High-bounce spring
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(itemX - 7, itemY + 4, 14, 10);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(itemX - 9, itemY + 2, 18, 3);
          } else if (plat.hasItem === 'trampoline') {
            // Trampoline
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(itemX - 12, itemY + 8, 24, 6);
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(itemX - 10, itemY + 5, 20, 3);
          } else if (plat.hasItem === 'jetpack') {
            // Jetpack
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.roundRect(itemX - 8, itemY - 6, 16, 20, 4);
            ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(itemX - 5, itemY + 12, 10, 4);
          } else if (plat.hasItem === 'shield') {
            // Shield Orb
            ctx.fillStyle = '#10b981';
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(itemX, itemY + 2, 9, 0, Math.PI * 2);
            ctx.fill();
          } else if (plat.hasItem === 'coin') {
            // Gold Cyber Coin
            ctx.fillStyle = '#eab308';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(itemX, itemY + 4, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(itemX, itemY + 4, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // Draw Monsters
      eng.monsters.forEach((mon) => {
        const monY = mon.y + eng.cameraY;
        if (monY < -60 || monY > V_HEIGHT + 60) return;

        ctx.save();
        if (mon.type === 'blackhole') {
          // Swirling black hole singularity
          ctx.translate(mon.x + mon.width / 2, monY + mon.height / 2);
          ctx.rotate(mon.animFrame * 2);
          const radGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, mon.width / 2);
          radGrad.addColorStop(0, '#000000');
          radGrad.addColorStop(0.6, '#4c1d95');
          radGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(0, 0, mon.width / 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, mon.width / 2 - 4, 0, Math.PI * 1.5);
          ctx.stroke();
        } else {
          // Cyber Alien / Drone
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.fillStyle = mon.type === 'drone' ? '#ef4444' : '#ec4899';
          ctx.beginPath();
          ctx.roundRect(mon.x, monY + Math.sin(mon.animFrame) * 4, mon.width, mon.height, 12);
          ctx.fill();

          // Monster Glowing Eye
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(mon.x + mon.width / 2, monY + mon.height / 2 + Math.sin(mon.animFrame) * 4, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(mon.x + mon.width / 2, monY + mon.height / 2 + Math.sin(mon.animFrame) * 4, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Bullets
      eng.bullets.forEach((b) => {
        ctx.save();
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Player
      ctx.save();
      const pScaleY = 1 - p.isSquished * 0.4;
      const pScaleX = 1 + p.isSquished * 0.3;
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
      ctx.scale(pScaleX, pScaleY);

      // Invulnerability flicker
      if (p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer / 4) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }

      // Draw Shield Aura if active
      if (p.shieldActive) {
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, p.width * 0.75, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Jetpack Flame
      if (p.jetpackTimer > 0) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        const flameOffset = p.facing === 'right' ? -12 : 12;
        ctx.beginPath();
        ctx.moveTo(flameOffset - 6, p.height / 2 - 4);
        ctx.lineTo(flameOffset + 6, p.height / 2 - 4);
        ctx.lineTo(flameOffset, p.height / 2 + 18 + Math.random() * 8);
        ctx.closePath();
        ctx.fill();
      }

      // Player Body
      ctx.fillStyle = activeSkin.color;
      ctx.shadowColor = activeSkin.glowColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(-p.width / 2, -p.height / 2, p.width, p.height, 16);
      ctx.fill();

      // Nose / Blaster Cannon (Facing Direction)
      ctx.fillStyle = activeSkin.glowColor;
      const noseX = p.facing === 'right' ? p.width / 2 : -p.width / 2 - 8;
      ctx.beginPath();
      ctx.roundRect(noseX, -4, 8, 8, 3);
      ctx.fill();

      // Eyes
      ctx.fillStyle = activeSkin.eyeColor;
      const eyeOffset = p.facing === 'right' ? 4 : -12;
      ctx.beginPath();
      ctx.arc(eyeOffset, -8, 5, 0, Math.PI * 2);
      ctx.arc(eyeOffset + 10, -8, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      const pupilOffset = p.facing === 'right' ? 2 : -2;
      ctx.beginPath();
      ctx.arc(eyeOffset + pupilOffset, -8, 2.5, 0, Math.PI * 2);
      ctx.arc(eyeOffset + 10 + pupilOffset, -8, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Draw Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const pt = eng.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
        pt.alpha = 1 - pt.life / pt.maxLife;

        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (pt.life >= pt.maxLife) {
          eng.particles.splice(i, 1);
        }
      }

      // Draw Floating Notification Texts
      for (let i = eng.floatingTexts.length - 1; i >= 0; i--) {
        const ft = eng.floatingTexts[i];
        ft.y -= 1.2;
        ft.alpha -= 0.025;

        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();

        if (ft.alpha <= 0) {
          eng.floatingTexts.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, selectedSkinId, skins, highScore, activeJetpack]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center select-none">
      {/* Top Header Controls & Live HUD */}
      <div className="w-full max-w-[500px] flex items-center justify-between bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-t-2xl px-4 py-2.5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-cyan-500/20">
            <Trophy className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400">BEST:</span>
            <span className="text-sm font-bold text-white tracking-wider">{highScore}m</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-amber-500/20">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-400">{coins}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasShield && (
            <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold px-2 py-1 rounded-md animate-pulse">
              <Shield className="w-3.5 h-3.5" />
              <span>SHIELD</span>
            </div>
          )}

          {activeJetpack && (
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold px-2 py-1 rounded-md animate-bounce">
              <Rocket className="w-3.5 h-3.5" />
              <span>BOOST</span>
            </div>
          )}

          <button
            onClick={() => setShowWardrobe(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 border border-purple-500/30 transition-all hover:scale-105"
            title="Character Skins Wardrobe"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>

          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 transition-all hover:scale-105"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Game Stage Container */}
      <div className="relative w-full max-w-[500px] aspect-[500/760] bg-slate-950 border-x border-b border-cyan-500/30 rounded-b-2xl overflow-hidden shadow-2xl shadow-cyan-950/40">
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          className="w-full h-full block cursor-crosshair touch-none"
          onClick={() => {
            if (gameState === 'playing') {
              shootBullet();
            }
          }}
          onTouchStart={(e) => {
            if (gameState === 'playing') {
              const rect = e.currentTarget.getBoundingClientRect();
              const touchX = e.touches[0].clientX - rect.left;
              const mid = rect.width / 2;
              touchAimRef.current = {
                active: true,
                dir: (touchX - mid) / mid,
              };
            }
          }}
          onTouchMove={(e) => {
            if (gameState === 'playing') {
              const rect = e.currentTarget.getBoundingClientRect();
              const touchX = e.touches[0].clientX - rect.left;
              const mid = rect.width / 2;
              touchAimRef.current = {
                active: true,
                dir: (touchX - mid) / mid,
              };
            }
          }}
          onTouchEnd={() => {
            touchAimRef.current = { active: false, dir: 0 };
          }}
        />

        {/* Live Altitude Overlay */}
        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 pointer-events-none">
            <div className="text-3xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(34,211,238,0.5)]">
              {score}<span className="text-sm font-semibold text-cyan-400 ml-1">M</span>
            </div>
          </div>
        )}

        {/* Start Game Modal Screen */}
        {gameState === 'start' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="inline-flex p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/20 animate-bounce">
              <Zap className="w-10 h-10" />
            </div>

            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 tracking-wider mb-2">
              CYBER JUMP: QUANTUM
            </h1>
            <p className="text-sm text-slate-300 max-w-xs mb-6 leading-relaxed">
              Ascend through infinite neon platforms! Dodge black holes, jump on springs, shoot hovering drones, and blast sky-high with jetpacks.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={handleStart}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>LAUNCH ASCENT</span>
              </button>

              <button
                onClick={() => setShowWardrobe(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-purple-500/40 text-purple-300 font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>CYBER SKINS & UPGRADES</span>
              </button>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in">
            <div className="inline-flex p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-3 shadow-lg shadow-rose-500/20">
              <Zap className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-white tracking-wide mb-1">
              ALTITUDE LOST
            </h2>
            <p className="text-xs text-slate-400 mb-4">You fell into the quantum abyss</p>

            <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6">
              <div className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block font-medium">ALTITUDE</span>
                <span className="text-xl font-bold text-cyan-400">{score}m</span>
              </div>
              <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block font-medium">BEST ALTITUDE</span>
                <span className="text-xl font-bold text-amber-400">{highScore}m</span>
              </div>
            </div>

            <button
              onClick={handleRestart}
              className="w-full max-w-xs py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>JUMP AGAIN</span>
            </button>
          </div>
        )}

        {/* Character Wardrobe Modal */}
        {showWardrobe && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col p-5 z-30 animate-fade-in overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">Character Wardrobe</h3>
              </div>
              <button
                onClick={() => setShowWardrobe(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-900/80 border border-amber-500/30 rounded-xl p-3 mb-4">
              <span className="text-xs text-slate-300 font-medium">CYBER COIN BALANCE</span>
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-base">
                <Sparkles className="w-4 h-4" />
                <span>{coins} COINS</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              {skins.map((s) => {
                const isSelected = s.id === selectedSkinId;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-purple-950/30 border-purple-500 shadow-md shadow-purple-500/20'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md border"
                        style={{ backgroundColor: s.color, borderColor: s.glowColor }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-white shadow" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{s.name}</div>
                        <div className="text-xs text-cyan-400">{s.perk}</div>
                      </div>
                    </div>

                    <div>
                      {s.unlocked ? (
                        <button
                          onClick={() => selectSkin(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-purple-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isSelected ? 'EQUIPPED' : 'EQUIP'}
                        </button>
                      ) : (
                        <button
                          onClick={() => buySkin(s)}
                          disabled={coins < s.price}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            coins >= s.price
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{s.price}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Touch D-Pad for Mobile and Quick Controls */}
      {/* Mobile Touch Navigation Controls */}
      <div className="w-full max-w-[500px] grid grid-cols-3 gap-2 mt-3 select-none touch-none">
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            keysRef.current.left = true;
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            keysRef.current.left = false;
          }}
          onPointerLeave={() => {
            keysRef.current.left = false;
          }}
          className="py-3.5 bg-slate-900/90 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400 active:bg-cyan-500 active:text-slate-950 active:scale-95 transition-transform cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <button
          onPointerDown={(e) => {
            e.preventDefault();
            if (gameState === 'playing') shootBullet();
            else if (gameState === 'start') handleStart();
            else if (gameState === 'gameover') handleRestart();
          }}
          className="py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md active:scale-95 transition-transform cursor-pointer"
        >
          <Target className="w-5 h-5 mr-1" />
          <span>FIRE</span>
        </button>

        <button
          onPointerDown={(e) => {
            e.preventDefault();
            keysRef.current.right = true;
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            keysRef.current.right = false;
          }}
          onPointerLeave={() => {
            keysRef.current.right = false;
          }}
          className="py-3.5 bg-slate-900/90 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400 active:bg-cyan-500 active:text-slate-950 active:scale-95 transition-transform cursor-pointer"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {/* Quick Desktop Keyboard Hints */}
      <div className="hidden sm:flex items-center gap-6 mt-3 text-xs text-slate-400 bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-mono text-[11px]">A / D</kbd>
          <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-mono text-[11px]">← / →</kbd>
          <span>Steer Left & Right</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-mono text-[11px]">SPACE</kbd>
          <span>/ Click to Shoot Blaster</span>
        </div>
      </div>
    </div>
  );
};
