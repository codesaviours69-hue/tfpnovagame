import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Shield,
  Zap,
  Sparkles,
  Pause,
  Award,
  Flame,
  Gift
} from 'lucide-react';
import { sound } from '../../utils/audio';
import { RewardAdModal, InterstitialAdModal } from '../ads';
import confetti from 'canvas-confetti';

// --- GAME CONSTANTS ---
const V_WIDTH = 480;
const V_HEIGHT = 800;
const LEFT_WALL_X = 36;
const RIGHT_WALL_X = 444;
const LEFT_RUN_X = 54;
const RIGHT_RUN_X = 426;
const NINJA_RADIUS = 16;
const BASE_SPEED = 240; // pixels per second upward climb

type WallSide = 'left' | 'right';
type ComboType = 'bird' | 'squirrel' | 'shuriken';
type BoostType = 'bird_wings' | 'squirrel_tail' | 'shuriken_tornado' | 'rocket' | null;

interface Obstacle {
  id: number;
  type: 'balcony' | 'bird' | 'squirrel' | 'enemy_ninja' | 'shuriken' | 'rocket' | 'shield';
  side: WallSide; // for balconies & perched ninjas
  x: number;
  y: number; // screen y coordinate (moves down as ninja climbs)
  vx?: number; // horizontal movement (e.g. bird flying, squirrel running, shuriken flying)
  vy?: number;
  width: number;
  height: number;
  isHit?: boolean;
  hasThrown?: boolean;
  animTimer?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

export const NinJumpTowerClimb: React.FC = () => {
  // Game States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'paused'>('menu');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('ninjump_highscore') || '0', 10);
  });
  const [hasShield, setHasShield] = useState<boolean>(false);
  const [comboType, setComboType] = useState<ComboType | null>(null);
  const [comboCount, setComboCount] = useState<number>(0);
  const [activeBoost, setActiveBoost] = useState<BoostType>(null);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());
  const [showHighScoreBanner, setShowHighScoreBanner] = useState<boolean>(false);

  // GAM Ads Modals
  const [showRewardedModal, setShowRewardedModal] = useState<boolean>(false);
  const [showInterstitialModal, setShowInterstitialModal] = useState<boolean>(false);
  const [rewardClaimDescription, setRewardClaimDescription] = useState<string>('Watch short sponsor video for a Free Magical Shield & +500m Boost!');

  // Refs for 60fps physics simulation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Ninja simulation state (Vertical Wall-Running Climber)
  const ninjaRef = useRef({
    side: 'left' as WallSide,
    x: LEFT_RUN_X,
    y: 580,
    isJumping: false,
    jumpProgress: 0, // 0 to 1
    jumpStartX: LEFT_RUN_X,
    jumpTargetX: RIGHT_RUN_X,
    somersaultAngle: 0,
    runFrame: 0,
    slashTimer: 0, // 0 to 1 for katana slash arc
    shieldActive: false,
    boost: null as BoostType,
    boostTimer: 0,
    altitude: 0, // meters climbed
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextSpawnAltRef = useRef<number>(300);
  const obstacleIdGen = useRef<number>(1);
  const newHighScoreReachedRef = useRef<boolean>(false);

  // Audio Synthesizer
  const playWallFootstep = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 + Math.random() * 40, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // ignore
    }
  }, [isMuted]);

  const playKatanaSlashSound = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(680, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // ignore
    }
  }, [isMuted]);

  const playSliceHitSound = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // ignore
    }
  }, [isMuted]);

  const playBoostTriggerSound = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // ignore
    }
  }, [isMuted]);

  // Spawn Blood/Feather/Spark Particles
  const spawnParticles = useCallback((x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 240 + 80;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color,
        alpha: 1,
        decay: Math.random() * 1.5 + 1.2,
      });
    }
  }, []);

  // Jump Action (Screen Tap / Spacebar)
  const triggerJump = useCallback(() => {
    const ninja = ninjaRef.current;
    if (gameState !== 'playing' || ninja.boost) return;

    playKatanaSlashSound();
    ninja.isJumping = true;
    ninja.jumpProgress = 0;
    ninja.slashTimer = 1;
    ninja.jumpStartX = ninja.x;
    ninja.jumpTargetX = ninja.side === 'left' ? RIGHT_RUN_X : LEFT_RUN_X;
    ninja.side = ninja.side === 'left' ? 'right' : 'left';
  }, [gameState, playKatanaSlashSound]);

  // Start / Reset Game
  const startClimbGame = useCallback((headstartAlt = 0, withShield = false) => {
    sound.playClick();
    const ninja = ninjaRef.current;
    ninja.side = 'left';
    ninja.x = LEFT_RUN_X;
    ninja.y = 580;
    ninja.isJumping = false;
    ninja.jumpProgress = 0;
    ninja.somersaultAngle = 0;
    ninja.runFrame = 0;
    ninja.slashTimer = 0;
    ninja.shieldActive = withShield;
    ninja.boost = null;
    ninja.boostTimer = 0;
    ninja.altitude = headstartAlt;

    obstaclesRef.current = [];
    particlesRef.current = [];
    nextSpawnAltRef.current = headstartAlt + 250;
    newHighScoreReachedRef.current = false;

    setScore(headstartAlt);
    setHasShield(withShield);
    setComboType(null);
    setComboCount(0);
    setActiveBoost(null);
    setShowHighScoreBanner(false);
    setGameState('playing');
  }, []);

  // Register Combo Slices & Check 3-in-a-row Transformation
  const registerComboSlice = useCallback((type: ComboType, x: number, y: number) => {
    playSliceHitSound();
    spawnParticles(x, y, type === 'bird' ? '#38bdf8' : type === 'squirrel' ? '#f97316' : '#94a3b8', 16);

    let nextCount = 1;
    if (comboType === type) {
      nextCount = comboCount + 1;
    } else {
      setComboType(type);
    }

    if (nextCount >= 3) {
      // Trigger Epic 3-in-a-row Transformation Boost!
      playBoostTriggerSound();
      const boost: BoostType = type === 'bird' ? 'bird_wings' : type === 'squirrel' ? 'squirrel_tail' : 'shuriken_tornado';
      ninjaRef.current.boost = boost;
      ninjaRef.current.boostTimer = 5.0; // 5 seconds of supersonic flight!
      setActiveBoost(boost);
      setComboCount(0);
      setComboType(null);

      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 },
        });
      } catch {
        // ignore
      }
    } else {
      setComboCount(nextCount);
    }
  }, [comboCount, comboType, playBoostTriggerSound, playSliceHitSound, spawnParticles]);

  // Main 60 FPS Game Engine Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let isRunning = true;
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      if (!isRunning) return;

      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      const ninja = ninjaRef.current;
      const curHigh = highScore;

      // 1. Altitude & Climbing Speed Calculation
      let climbSpeed = BASE_SPEED + Math.min(ninja.altitude * 0.08, 160);
      if (ninja.boost) {
        climbSpeed *= 4.5; // 4.5x supersonic boost speed
        ninja.boostTimer -= dt;
        if (ninja.boostTimer <= 0) {
          ninja.boost = null;
          setActiveBoost(null);
        }
      }

      // Altitude progression
      ninja.altitude += Math.round(climbSpeed * dt * 0.25);
      const currentScore = Math.floor(ninja.altitude);
      setScore(currentScore);

      // High Score Ribbon Trigger
      if (currentScore > curHigh && curHigh > 0 && !newHighScoreReachedRef.current) {
        newHighScoreReachedRef.current = true;
        setShowHighScoreBanner(true);
        sound.playPowerup();
        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.2 },
          });
        } catch {
          // ignore
        }
        setTimeout(() => setShowHighScoreBanner(false), 3500);
      }

      // 2. Ninja Jump Physics & Horizontal Translation
      if (ninja.isJumping) {
        const jumpDuration = 0.28; // seconds per wall jump
        ninja.jumpProgress += dt / jumpDuration;

        if (ninja.jumpProgress >= 1) {
          ninja.jumpProgress = 1;
          ninja.isJumping = false;
          ninja.x = ninja.jumpTargetX;
          ninja.somersaultAngle = 0;
          playWallFootstep();
        } else {
          // Smooth jump parabolic arc across screen
          ninja.x = ninja.jumpStartX + (ninja.jumpTargetX - ninja.jumpStartX) * ninja.jumpProgress;
          const somersaultDir = ninja.jumpTargetX > ninja.jumpStartX ? 1 : -1;
          ninja.somersaultAngle = ninja.jumpProgress * Math.PI * 2 * somersaultDir;
        }
      } else {
        ninja.x = ninja.side === 'left' ? LEFT_RUN_X : RIGHT_RUN_X;
        ninja.runFrame += dt * 14;
        if (Math.floor(ninja.runFrame) % 3 === 0) {
          playWallFootstep();
        }
      }

      if (ninja.slashTimer > 0) {
        ninja.slashTimer -= dt * 4;
      }

      // 3. Obstacle Spawning
      if (ninja.altitude >= nextSpawnAltRef.current) {
        const spawnTypeRand = Math.random();
        const alt = ninja.altitude;
        const sideRand: WallSide = Math.random() < 0.5 ? 'left' : 'right';

        if (spawnTypeRand < 0.30) {
          // Balcony Roof Obstacle
          obstaclesRef.current.push({
            id: obstacleIdGen.current++,
            type: 'balcony',
            side: sideRand,
            x: sideRand === 'left' ? 0 : V_WIDTH - 85,
            y: -50,
            width: 85,
            height: 38,
          });
        } else if (spawnTypeRand < 0.52) {
          // Flying Blue Bird
          obstaclesRef.current.push({
            id: obstacleIdGen.current++,
            type: 'bird',
            side: sideRand,
            x: Math.random() * (V_WIDTH - 200) + 100,
            y: -40,
            vx: (Math.random() - 0.5) * 80,
            width: 34,
            height: 26,
            animTimer: 0,
          });
        } else if (spawnTypeRand < 0.70) {
          // Killer Squirrel
          obstaclesRef.current.push({
            id: obstacleIdGen.current++,
            type: 'squirrel',
            side: sideRand,
            x: sideRand === 'left' ? LEFT_WALL_X + 10 : RIGHT_WALL_X - 44,
            y: -40,
            vx: sideRand === 'left' ? 70 : -70,
            width: 36,
            height: 22,
            animTimer: 0,
          });
        } else if (spawnTypeRand < 0.84) {
          // Enemy Ninja Perched on Wall
          obstaclesRef.current.push({
            id: obstacleIdGen.current++,
            type: 'enemy_ninja',
            side: sideRand,
            x: sideRand === 'left' ? LEFT_WALL_X : RIGHT_WALL_X,
            y: -40,
            width: 28,
            height: 36,
            hasThrown: false,
          });
        } else if (spawnTypeRand < 0.93) {
          // Firecracker Rocket
          obstaclesRef.current.push({
            id: obstacleIdGen.current++,
            type: 'rocket',
            side: 'left',
            x: V_WIDTH / 2 + (Math.random() - 0.5) * 160,
            y: -50,
            width: 32,
            height: 60,
          });
        } else {
          // Magical Shield Orb
          obstaclesRef.current.push({
            id: obstacleIdGen.current++,
            type: 'shield',
            side: 'left',
            x: V_WIDTH / 2 + (Math.random() - 0.5) * 180,
            y: -40,
            width: 30,
            height: 30,
          });
        }

        // Distance to next spawn (gets slightly tighter at higher altitudes)
        nextSpawnAltRef.current = alt + Math.max(120, 220 - Math.min(alt * 0.02, 90));
      }

      // 4. Update Obstacles, Enemy Attacks & Collisions
      const obstacles = obstaclesRef.current;
      const ninjaX = ninja.x;
      const ninjaY = ninja.y;
      const isBoosted = !!ninja.boost;

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.y += climbSpeed * dt;

        // Enemy Ninja throws shuriken
        if (obs.type === 'enemy_ninja' && !obs.hasThrown && obs.y > 150) {
          obs.hasThrown = true;
          const throwDir = obs.side === 'left' ? 1 : -1;
          obstacles.push({
            id: obstacleIdGen.current++,
            type: 'shuriken',
            side: obs.side,
            x: obs.side === 'left' ? obs.x + 20 : obs.x - 20,
            y: obs.y + 10,
            vx: throwDir * 180,
            vy: 80,
            width: 22,
            height: 22,
            animTimer: 0,
          });
        }

        // Move dynamic flying entities
        if (obs.vx) {
          obs.x += obs.vx * dt;
          if (obs.type === 'bird' && (obs.x < 70 || obs.x > V_WIDTH - 70)) {
            obs.vx = -obs.vx;
          }
        }
        if (obs.vy) {
          obs.y += obs.vy * dt;
        }

        // Check Collision with Ninja
        const distToNinja = Math.hypot(obs.x - ninjaX, obs.y - ninjaY);

        if (!obs.isHit) {
          // A. Balcony Collision
          if (obs.type === 'balcony') {
            const onSameSide = (obs.side === 'left' && ninjaX <= LEFT_WALL_X + 35) || (obs.side === 'right' && ninjaX >= RIGHT_WALL_X - 35);
            const verticalHit = Math.abs(obs.y - ninjaY) < 26;

            if (onSameSide && verticalHit) {
              if (isBoosted) {
                // Destroy balcony during boost!
                obs.isHit = true;
                spawnParticles(obs.x + 40, obs.y + 15, '#ef4444', 16);
              } else if (ninja.shieldActive) {
                // Shield saves ninja!
                ninja.shieldActive = false;
                setHasShield(false);
                obs.isHit = true;
                spawnParticles(ninjaX, ninjaY, '#38bdf8', 20);
                sound.playShield();
              } else {
                // Lethal Crash into balcony
                handleGameOver('Crashed into pagoda balcony!');
                return;
              }
            }
          }

          // B. Slicing Bird / Squirrel / Shuriken / Enemy Ninja in Mid-Air or Touching
          else if (['bird', 'squirrel', 'shuriken', 'enemy_ninja'].includes(obs.type)) {
            const hitThreshold = ninja.isJumping || isBoosted ? 44 : 28;

            if (distToNinja < hitThreshold) {
              if (ninja.isJumping || isBoosted) {
                // Slice & Destroy with Katana!
                obs.isHit = true;
                if (obs.type === 'bird') registerComboSlice('bird', obs.x, obs.y);
                else if (obs.type === 'squirrel') registerComboSlice('squirrel', obs.x, obs.y);
                else if (obs.type === 'shuriken') registerComboSlice('shuriken', obs.x, obs.y);
                else if (obs.type === 'enemy_ninja') {
                  playSliceHitSound();
                  spawnParticles(obs.x, obs.y, '#0284c7', 16);
                }
              } else {
                // Ninja hit by obstacle while running on wall without jumping
                if (ninja.shieldActive) {
                  ninja.shieldActive = false;
                  setHasShield(false);
                  obs.isHit = true;
                  spawnParticles(ninjaX, ninjaY, '#38bdf8', 20);
                  sound.playShield();
                } else {
                  handleGameOver(obs.type === 'shuriken' ? 'Hit by enemy shuriken!' : 'Struck by enemy in mid-climb!');
                  return;
                }
              }
            }
          }

          // C. Rocket Power-Up
          else if (obs.type === 'rocket' && distToNinja < 42) {
            obs.isHit = true;
            playBoostTriggerSound();
            ninja.boost = 'rocket';
            ninja.boostTimer = 5.0;
            setActiveBoost('rocket');
            spawnParticles(obs.x, obs.y, '#f59e0b', 24);
          }

          // D. Shield Power-Up
          else if (obs.type === 'shield' && distToNinja < 38) {
            obs.isHit = true;
            ninja.shieldActive = true;
            setHasShield(true);
            sound.playShield();
            spawnParticles(obs.x, obs.y, '#38bdf8', 16);
          }
        }

        // Remove offscreen obstacles
        if (obs.y > V_HEIGHT + 100) {
          obstacles.splice(i, 1);
        }
      }

      // 5. Update Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += (p.vy + climbSpeed * 0.6) * dt;
        p.alpha -= p.decay * dt;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
        }
      }

      // 6. Master Canvas Render Frame
      renderCanvas();

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, highScore, isMuted, playBoostTriggerSound, playKatanaSlashSound, playSliceHitSound, playWallFootstep, registerComboSlice, spawnParticles]);

  // Handle Game Over
  const handleGameOver = useCallback((reason: string) => {
    sound.playCrash();
    const finalScore = Math.floor(ninjaRef.current.altitude);
    setScore(finalScore);

    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('ninjump_highscore', finalScore.toString());
    }

    setGameState('gameover');
  }, [highScore]);

  // Master Canvas Render
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ninja = ninjaRef.current;
    const alt = ninja.altitude;

    // 1. ALTITUDE COLOR THEMES (Golden Sunset -> Twilight Violet -> Emerald Forest -> Celestial Night)
    let skyTop = '#fed7aa';
    let skyBottom = '#b45309';
    let pagodaColor = '#78350f';

    if (alt < 1000) {
      skyTop = '#fed7aa';
      skyBottom = '#b45309';
      pagodaColor = '#78350f';
    } else if (alt < 2500) {
      skyTop = '#fbcfe8';
      skyBottom = '#581c87';
      pagodaColor = '#3b0764';
    } else if (alt < 4000) {
      skyTop = '#a7f3d0';
      skyBottom = '#064e3b';
      pagodaColor = '#022c22';
    } else {
      skyTop = '#082f49';
      skyBottom = '#020617';
      pagodaColor = '#0f172a';
    }

    // Background Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
    skyGrad.addColorStop(0, skyTop);
    skyGrad.addColorStop(1, skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Parallax Distant Mountain / Pagoda Silhouettes
    const parallaxOffset = (alt * 0.15) % V_HEIGHT;
    ctx.fillStyle = pagodaColor;
    ctx.globalAlpha = 0.35;

    // Distant Pagoda 1
    const py1 = (200 + parallaxOffset) % V_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(V_WIDTH / 2 - 80, py1 + 100);
    ctx.lineTo(V_WIDTH / 2, py1);
    ctx.lineTo(V_WIDTH / 2 + 80, py1 + 100);
    ctx.fill();

    // Distant Pagoda 2
    const py2 = (600 + parallaxOffset) % V_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(V_WIDTH / 2 - 110, py2 + 120);
    ctx.lineTo(V_WIDTH / 2, py2);
    ctx.lineTo(V_WIDTH / 2 + 110, py2 + 120);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 2. LEFT & RIGHT WOODEN SCAFFOLD WALLS
    const wallScroll = (alt * 1.5) % 60;

    // Left Wall Post
    const woodGradL = ctx.createLinearGradient(0, 0, LEFT_WALL_X, 0);
    woodGradL.addColorStop(0, '#451a03');
    woodGradL.addColorStop(1, '#78350f');
    ctx.fillStyle = woodGradL;
    ctx.fillRect(0, 0, LEFT_WALL_X, V_HEIGHT);

    // Right Wall Post
    const woodGradR = ctx.createLinearGradient(RIGHT_WALL_X, 0, V_WIDTH, 0);
    woodGradR.addColorStop(0, '#78350f');
    woodGradR.addColorStop(1, '#451a03');
    ctx.fillStyle = woodGradR;
    ctx.fillRect(RIGHT_WALL_X, 0, V_WIDTH - RIGHT_WALL_X, V_HEIGHT);

    // Wooden Ladder Rungs
    ctx.fillStyle = '#291203';
    for (let y = -60 + wallScroll; y < V_HEIGHT + 60; y += 50) {
      ctx.fillRect(0, y, LEFT_WALL_X, 8);
      ctx.fillRect(RIGHT_WALL_X, y, V_WIDTH - RIGHT_WALL_X, 8);
    }

    // 3. RENDER OBSTACLES & ENTITIES
    for (const obs of obstaclesRef.current) {
      if (obs.isHit) continue;

      // A. Balcony Roof with Red Curved Tiles
      if (obs.type === 'balcony') {
        ctx.save();
        if (obs.side === 'left') {
          // Left Balcony
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.moveTo(0, obs.y + 12);
          ctx.lineTo(obs.width, obs.y + 12);
          ctx.lineTo(0, obs.y + 36);
          ctx.fill();

          // Red Tiles
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.roundRect(0, obs.y, obs.width, 14, [0, 8, 4, 0]);
          ctx.fill();
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Right Balcony
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.moveTo(V_WIDTH, obs.y + 12);
          ctx.lineTo(V_WIDTH - obs.width, obs.y + 12);
          ctx.lineTo(V_WIDTH, obs.y + 36);
          ctx.fill();

          // Red Tiles
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.roundRect(V_WIDTH - obs.width, obs.y, obs.width, 14, [8, 0, 0, 4]);
          ctx.fill();
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      }

      // B. Flying Blue Bird
      else if (obs.type === 'bird') {
        ctx.save();
        ctx.translate(obs.x, obs.y);
        // Bird body
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        // Flapping Wing
        const flap = Math.sin(performance.now() * 0.015) * 8;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(-6, -2);
        ctx.lineTo(10, -16 + flap);
        ctx.lineTo(12, 0);
        ctx.closePath();
        ctx.fill();
        // Yellow Beak & Eye
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(-16, -2);
        ctx.lineTo(-24, 2);
        ctx.lineTo(-16, 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-8, -3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-9, -3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // C. Killer Squirrel / Fox
      else if (obs.type === 'squirrel') {
        ctx.save();
        ctx.translate(obs.x, obs.y);
        ctx.fillStyle = '#ea580c';
        // Squirrel Body
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Bushy Fluffy Tail
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(14, -8, 12, 0, Math.PI * 2);
        ctx.fill();
        // Ears & Snout
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-14, -6);
        ctx.lineTo(-22, 2);
        ctx.lineTo(-14, 6);
        ctx.fill();
        ctx.restore();
      }

      // D. Enemy Ninja Perched
      else if (obs.type === 'enemy_ninja') {
        ctx.save();
        ctx.translate(obs.x, obs.y);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();
        // Blue Headband
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-13, -4, 26, 6);
        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, -2, 4, 3);
        ctx.fillRect(2, -2, 4, 3);
        ctx.restore();
      }

      // E. Spinning Shuriken (Authentic 4-Point Star with Center Hole & Speed Trail)
      else if (obs.type === 'shuriken') {
        ctx.save();
        ctx.translate(obs.x, obs.y);

        // Translucent White Motion Speed Trail behind shuriken (As in reference image)
        const trailAngle = obs.vx ? Math.atan2(obs.vy || 80, obs.vx) + Math.PI : -Math.PI / 2;
        ctx.save();
        ctx.rotate(trailAngle);
        const trailGrad = ctx.createLinearGradient(0, 0, 48, 0);
        trailGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        trailGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
        trailGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = trailGrad;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(52, -18);
        ctx.lineTo(52, 18);
        ctx.lineTo(0, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 4-Point Curved Black Shuriken
        ctx.rotate(performance.now() * 0.025);
        ctx.fillStyle = '#18181b';
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // 4-pointed curved ninja star
        ctx.moveTo(0, -14);
        ctx.bezierCurveTo(2, -5, 5, -2, 14, 0);
        ctx.bezierCurveTo(5, 2, 2, 5, 0, 14);
        ctx.bezierCurveTo(-2, 5, -5, 2, -14, 0);
        ctx.bezierCurveTo(-5, -2, -2, -5, 0, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Distinct Circular Cutout Hole in Center (Matches reference image)
        ctx.fillStyle = '#fed7aa'; // matches sky color behind it
        ctx.beginPath();
        ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      }

      // F. Firecracker Rocket
      else if (obs.type === 'rocket') {
        ctx.save();
        ctx.translate(obs.x, obs.y);
        // Red Rocket Cylinder
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-10, -15, 20, 36);
        // Yellow Nose Cone
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(-12, -15);
        ctx.lineTo(0, -32);
        ctx.lineTo(12, -15);
        ctx.fill();
        // Rocket Flame
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(-8, 21);
        ctx.lineTo(0, 36 + Math.random() * 8);
        ctx.lineTo(8, 21);
        ctx.fill();
        ctx.restore();
      }

      // G. Magical Shield Orb
      else if (obs.type === 'shield') {
        ctx.save();
        ctx.translate(obs.x, obs.y);
        const pulse = Math.sin(performance.now() * 0.008) * 3;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, 16 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 4. RENDER AUTHENTIC HERO NINJA CHARACTER (Canonical vertical wall-running climber)
    ctx.save();
    ctx.translate(ninja.x, ninja.y);

    // Left wall: facingDir = 1 (feet on left wall, katana & visor point up into corridor)
    // Right wall: facingDir = -1 (mirrored: feet on right wall, katana & visor point up into corridor)
    const facingDir = ninja.isJumping 
      ? (ninja.jumpTargetX > ninja.jumpStartX ? 1 : -1)
      : (ninja.side === 'left' ? 1 : -1);

    ctx.scale(facingDir, 1);

    if (ninja.somersaultAngle !== 0) {
      ctx.rotate(ninja.somersaultAngle * facingDir);
    }

    const timeMs = performance.now();
    const runCycle = ninja.isJumping ? 0.5 : ((ninja.runFrame * 0.45) % 1);
    const legPhase1 = runCycle * Math.PI * 2;
    const legPhase2 = (runCycle + 0.5) * Math.PI * 2;
    const armSwing = Math.sin(legPhase1) * 0.5;

    // A. Long Flowing Red Ribbon Bandana Tail (Streams DOWNWARDS behind head in slipstream)
    const ribbonPhase = timeMs * 0.015;
    const rWiggle1 = Math.sin(ribbonPhase) * 5;
    const rWiggle2 = Math.cos(ribbonPhase * 0.9) * 9;
    const rWiggle3 = Math.sin(ribbonPhase * 1.3) * 14;

    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-6, -20); // back of headband
    ctx.bezierCurveTo(
      -10 + rWiggle1 * 0.4, -4,
      -12 + rWiggle2 * 0.6, 18,
      -15 + rWiggle3, 44
    );
    ctx.bezierCurveTo(
      -9 + rWiggle3, 46,
      -6 + rWiggle2 * 0.6, 20,
      -2, -16
    );
    ctx.closePath();
    ctx.fill();

    // Red Ribbon Highlight
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, -20);
    ctx.bezierCurveTo(
      -10 + rWiggle1 * 0.4, -4,
      -12 + rWiggle2 * 0.6, 18,
      -15 + rWiggle3, 44
    );
    ctx.stroke();
    ctx.restore();

    // B. Transformation Boost Graphics
    if (ninja.boost === 'bird_wings') {
      // Massive Blue Phoenix Wings
      ctx.save();
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;

      // Left Wing
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.bezierCurveTo(-55, -40, -90, -10, -115, 20);
      ctx.bezierCurveTo(-85, 45, -45, 30, -10, 15);
      ctx.fill();
      ctx.stroke();

      // Right Wing
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.bezierCurveTo(55, -40, 90, -10, 115, 20);
      ctx.bezierCurveTo(85, 45, 45, 30, 10, 15);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (ninja.boost === 'squirrel_tail') {
      // Fluffy Fiery Squirrel Tail
      ctx.save();
      ctx.fillStyle = '#ea580c';
      ctx.strokeStyle = '#fdba74';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, 12);
      ctx.bezierCurveTo(-40, 24, -65, -15, -44, -38);
      ctx.bezierCurveTo(-22, -52, -14, -28, -4, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (ninja.boost === 'shuriken_tornado') {
      // Spinning Shuriken Cyclone
      ctx.save();
      ctx.rotate(timeMs * 0.035);
      for (let i = 0; i < 6; i++) {
        ctx.rotate((Math.PI * 2) / 6);
        ctx.fillStyle = '#09090b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(24, -4);
        ctx.lineTo(44, 0);
        ctx.lineTo(24, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    if (ninja.boost === 'rocket') {
      // Firecracker Rocket Boost
      ctx.save();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-14, -26, 28, 52);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(-16, -26);
      ctx.lineTo(0, -48);
      ctx.lineTo(16, -26);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-10, 26);
      ctx.lineTo(0, 52 + Math.random() * 12);
      ctx.lineTo(10, 26);
      ctx.fill();
      ctx.restore();
    }

    // C. Back Leg (Running against vertical wall ladder at x = -16)
    ctx.save();
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 10);
    const backKneeX = -10 + Math.sin(legPhase2) * 5;
    const backKneeY = 18 + Math.cos(legPhase2) * 7;
    const backFootX = -16; // touches vertical wall surface exactly at ladder
    const backFootY = 26 + Math.cos(legPhase2) * 8;
    ctx.lineTo(backKneeX, backKneeY);
    ctx.lineTo(backFootX, backFootY);
    ctx.stroke();
    // Back shoe planted on wall
    ctx.fillStyle = '#27272a';
    ctx.beginPath();
    ctx.ellipse(backFootX, backFootY, 4.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // D. Ninja Torso & Red Scarf Collar Wrap (Leaning upward & into corridor +X)
    ctx.save();
    const torsoGrad = ctx.createLinearGradient(-4, -6, 8, 16);
    torsoGrad.addColorStop(0, '#3f3f46');
    torsoGrad.addColorStop(1, '#18181b');
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.ellipse(0, 4, 8, 12, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Red Scarf Collar Wrap at neck
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(2, -6, 6.5, 4, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // E. Front Leg (High knee wall-climbing stride along wall)
    ctx.save();
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(2, 8);
    const frontKneeX = -6 + Math.sin(legPhase1) * 5;
    const frontKneeY = -4 - Math.cos(legPhase1) * 7;
    const frontFootX = -14; // wall stride
    const frontFootY = 8 - Math.cos(legPhase1) * 6;
    ctx.lineTo(frontKneeX, frontKneeY);
    ctx.lineTo(frontFootX, frontFootY);
    ctx.stroke();
    // Front shoe
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.ellipse(frontFootX, frontFootY, 4.5, 3.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // F. Front Arm with Clenched Fist (Raised UP & into corridor +X)
    ctx.save();
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(3, -2);
    const handX = 14 + armSwing * 3;
    const handY = -8 - armSwing * 4;
    ctx.lineTo(10, 4 - armSwing * 3);
    ctx.lineTo(handX, handY);
    ctx.stroke();
    // Clenched fist
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(handX, handY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // G. Ninja Head (Round charcoal sphere facing UP & into corridor +X)
    ctx.save();
    const headGrad = ctx.createRadialGradient(2, -22, 2, 2, -18, 15);
    headGrad.addColorStop(0, '#52525b');
    headGrad.addColorStop(0.6, '#27272a');
    headGrad.addColorStop(1, '#18181b');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(2, -18, 13.5, 0, Math.PI * 2);
    ctx.fill();

    // Large Curved White Eye Visor (Facing UP & into corridor +X)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(7, -19, 7.5, 4.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Red Headband Bandana (Over forehead)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(-7, -24, 23, 7, 3.5);
    ctx.fill();
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, -23);
    ctx.lineTo(14, -23);
    ctx.stroke();

    // Headband Knot at back (-X)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(-6, -20, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // H. Back Arm & Katana Sword Pointed UPWARD into Corridor (+X, -Y)
    ctx.save();
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1, 0);
    const swordHandX = 4 - armSwing * 3;
    const swordHandY = 8 + armSwing * 4;
    ctx.lineTo(swordHandX, swordHandY);
    ctx.stroke();
    // Hand grip
    ctx.fillStyle = '#27272a';
    ctx.beginPath();
    ctx.arc(swordHandX, swordHandY, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Katana Sword in Hand (Angled UP & into corridor: -50 deg)
    ctx.save();
    ctx.translate(swordHandX, swordHandY);
    ctx.rotate(-0.87 - armSwing * 0.15); // Pointing UP-RIGHT into the central corridor!

    // Translucent White Speed Slash Cone Trail behind sword
    const swordTrailGrad = ctx.createLinearGradient(0, 0, 55, 0);
    swordTrailGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    swordTrailGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    swordTrailGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = swordTrailGrad;
    ctx.beginPath();
    ctx.moveTo(3, -3);
    ctx.lineTo(55, -16);
    ctx.lineTo(55, 12);
    ctx.lineTo(3, 3);
    ctx.closePath();
    ctx.fill();

    // Golden Tsuba Guard
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-2, -3, 4, 6);

    // Red & Black Hilt Handle
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-11, -2, 9, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-13, -2.5, 2, 5);

    // Razor-Sharp Gleaming White / Silver Steel Katana Blade
    const bladeGrad = ctx.createLinearGradient(3, 0, 44, 0);
    bladeGrad.addColorStop(0, '#ffffff');
    bladeGrad.addColorStop(0.7, '#f8fafc');
    bladeGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(3, -2);
    ctx.lineTo(38, -1.2);
    ctx.lineTo(45, 0);
    ctx.lineTo(36, 2);
    ctx.lineTo(3, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
    ctx.restore();

    // I. Katana Blade Jump Slash Arc Effect
    if (ninja.slashTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 50, -Math.PI * 0.55, Math.PI * 0.55);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 16;
      ctx.stroke();
      ctx.restore();
    }

    // J. Magical Shield Bubble Aura
    if (ninja.shieldActive) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.fill();
    }

    ctx.restore();

    // 5. RENDER PARTICLES
    for (const p of particlesRef.current) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  return (
    <div className="relative w-full max-w-[500px] mx-auto flex flex-col items-center justify-center select-none font-sans">
      {/* ===================================================================== */}
      {/* 1. TOP AUTHENTIC SCOREBOARD BANNER (Like Screenshot) */}
      {/* ===================================================================== */}
      <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/90 border-t border-x border-slate-800 rounded-t-2xl shadow-xl z-20">
        {/* Left: Shield Status */}
        <div className="flex items-center gap-1.5">
          <div className={`p-1.5 rounded-xl border flex items-center gap-1 ${
            hasShield ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20' : 'bg-slate-950 border-slate-800 text-slate-600'
          }`}>
            <Shield className={`w-4 h-4 ${hasShield ? 'fill-current animate-pulse' : ''}`} />
            <span className="text-[10px] font-black">{hasShield ? 'ACTIVE' : 'OFF'}</span>
          </div>
        </div>

        {/* Center: Tablet Score Capsule */}
        <div className="flex flex-col items-center">
          <div className="px-6 py-1 rounded-2xl bg-gradient-to-b from-slate-200 to-slate-400 border border-slate-500 shadow-md flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-wider">
              {score}
            </span>
          </div>

          {/* 3-in-a-Row Combo Indicators */}
          {comboType && comboCount > 0 && (
            <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-slate-950/80 border border-amber-400/40 text-[9px] font-extrabold text-amber-300 animate-pulse">
              <span>{comboType === 'bird' ? '🐦' : comboType === 'squirrel' ? '🐿️' : '🥷'}</span>
              <span>COMBO: {comboCount}/3</span>
            </div>
          )}
        </div>

        {/* Right: Sound & Pause */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMuted(sound.toggleMute())}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {gameState === 'playing' && (
            <button
              onClick={() => {
                sound.playClick();
                setGameState('paused');
              }}
              className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. MAIN NINJUMP TOWER CANVAS */}
      {/* ===================================================================== */}
      <div
        onClick={triggerJump}
        className="relative w-full aspect-[480/740] bg-slate-950 border-x border-slate-800 flex items-center justify-center overflow-hidden cursor-pointer touch-none"
      >
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          className="w-full h-full object-cover block select-none"
        />

        {/* High Score Celebration Ribbon Banner */}
        {showHighScoreBanner && (
          <div className="absolute top-24 inset-x-0 flex items-center justify-center animate-bounce z-30 pointer-events-none px-4">
            <div className="px-6 py-2 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 border-2 border-slate-950 text-slate-950 font-black text-base sm:text-lg shadow-2xl flex items-center gap-2">
              <Trophy className="w-5 h-5 fill-slate-950" />
              <span>NEW HIGH SCORE!</span>
            </div>
          </div>
        )}

        {/* Active Super Boost Flight Indicator */}
        {activeBoost && (
          <div className="absolute top-4 inset-x-0 flex items-center justify-center pointer-events-none z-20">
            <div className="px-4 py-1 rounded-full bg-cyan-950/90 border border-cyan-400 text-cyan-300 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 animate-pulse">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{activeBoost.replace('_', ' ')} ACTIVE!</span>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* START / MAIN MENU MODAL (Featuring Authentic Ninja Hero Artwork) */}
        {/* =================================================================== */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center z-30 animate-fade-in space-y-3.5">
            {/* Authentic Hero Ninja Artwork Card matching reference image */}
            <div className="relative w-44 h-44 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/30 border-2 border-amber-400/40 bg-gradient-to-b from-[#fed7aa] via-[#f59e0b] to-[#b45309] p-2 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
                {/* Pagoda Silhouette */}
                <path d="M 40 160 Q 80 130 120 160 L 120 200 L 40 200 Z" fill="#78350f" opacity="0.4" />
                <path d="M 55 130 Q 80 110 105 130 L 105 160 L 55 160 Z" fill="#78350f" opacity="0.4" />
                {/* Right Wooden Ladder Wall */}
                <rect x="175" y="0" width="25" height="200" fill="#78350f" />
                <rect x="175" y="20" width="25" height="6" fill="#451a03" />
                <rect x="175" y="60" width="25" height="6" fill="#451a03" />
                <rect x="175" y="100" width="25" height="6" fill="#451a03" />
                <rect x="175" y="140" width="25" height="6" fill="#451a03" />
                <rect x="175" y="180" width="25" height="6" fill="#451a03" />

                {/* Flying Shuriken with Translucent Motion Beam (Matches reference image) */}
                <g transform="translate(150, 45)">
                  <polygon points="0,0 20,-35 45,-25 0,0" fill="rgba(255,255,255,0.45)" />
                  {/* Shuriken 4-point star */}
                  <path d="M 0 -14 Q 2 -4 14 0 Q 4 2 0 14 Q -2 4 -14 0 Q -4 -2 0 -14 Z" fill="#18181b" />
                  <circle cx="0" cy="0" r="3.5" fill="#fde68a" stroke="#18181b" strokeWidth="1" />
                </g>

                {/* Ninja Character in Authentic Running / Slicing Pose */}
                <g transform="translate(90, 110)">
                  {/* Waving Red Ribbon */}
                  <path d="M -12 -22 Q -35 -34 -60 -10 Q -38 -15 -10 -15 Z" fill="#ef4444" />
                  <path d="M -12 -20 Q -35 -22 -58 10 Q -34 -2 -10 -14 Z" fill="#dc2626" />

                  {/* Back Leg */}
                  <path d="M -4 12 L -20 28 L -24 42" stroke="#27272a" strokeWidth="6" strokeLinecap="round" />
                  <ellipse cx="-24" cy="42" rx="6" ry="3.5" fill="#27272a" />

                  {/* Body Torso & Red Scarf Collar */}
                  <ellipse cx="0" cy="8" rx="9" ry="14" fill="#18181b" />
                  <ellipse cx="2" cy="-4" rx="8" ry="5" fill="#ef4444" />

                  {/* Front Leg */}
                  <path d="M 4 12 L 18 24 L 16 38" stroke="#18181b" strokeWidth="6.5" strokeLinecap="round" />
                  <ellipse cx="18" cy="39" rx="7" ry="4" fill="#18181b" />

                  {/* Left Arm with Clenched Fist */}
                  <path d="M 4 2 L 14 10 L 18 2" stroke="#18181b" strokeWidth="5" strokeLinecap="round" />
                  <circle cx="18" cy="2" r="4.5" fill="#18181b" />

                  {/* Head */}
                  <circle cx="0" cy="-16" r="16" fill="#27272a" />
                  {/* Eye Visor (Single Curved White Mask) */}
                  <ellipse cx="5" cy="-15" rx="9.5" ry="5.5" transform="rotate(-15 5 -15)" fill="#ffffff" stroke="#18181b" strokeWidth="1.2" />
                  {/* Red Headband */}
                  <rect x="-14" y="-23" width="28" height="8" rx="4" fill="#ef4444" />

                  {/* Katana Sword with Glowing Speed Cone Trail */}
                  <g transform="translate(-10, 14)">
                    <polygon points="0,0 -40,30 -10,40 0,0" fill="rgba(255,255,255,0.4)" />
                    {/* Katana Blade */}
                    <path d="M 0 0 L -38 28" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                    <rect x="-3" y="-3" width="6" height="6" fill="#f59e0b" />
                    <path d="M 0 0 L 8 -6" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                  </g>
                </g>
              </svg>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                NIN<span className="text-cyan-400">JUMP</span>
              </h1>
              <p className="text-xs text-slate-300 max-w-xs mt-0.5 font-medium">
                Leap between walls, slice birds & shurikens with your katana, trigger 3-in-a-row boosts and climb to the heavens!
              </p>
            </div>

            {/* High Score Pill */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 font-black text-xs">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>BEST RECORD: {highScore}m</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
              <button
                onClick={() => startClimbGame(0, false)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                START CLIMB
              </button>

              {/* Rewarded Ad Headstart Boost */}
              <button
                onClick={() => {
                  sound.playClick();
                  setRewardClaimDescription('Watch short video to start climb with Free Magical Shield + 500m Headstart!');
                  setShowRewardedModal(true);
                }}
                className="w-full py-2.5 rounded-2xl bg-slate-900 border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                <span>FREE SHIELD & HEADSTART (WATCH AD)</span>
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* GAME OVER MODAL */}
        {/* =================================================================== */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center z-40 animate-fade-in space-y-3.5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center shadow-xl shadow-rose-500/30 text-white">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                TOWER RUN FINISHED
              </h2>
              <div className="text-3xl sm:text-4xl font-black text-cyan-400 font-mono mt-1">
                {score}m
              </div>
              <p className="text-xs text-slate-400 mt-1">
                High Score: <strong className="text-amber-300">{highScore}m</strong>
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
              <button
                onClick={() => startClimbGame(0, false)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                PLAY AGAIN
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setRewardClaimDescription('Watch short video to revive and continue your tower climb with a shield!');
                  setShowRewardedModal(true);
                }}
                className="w-full py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/50 hover:border-amber-400 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                <span>REVIVE & SHIELD (WATCH AD)</span>
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* PAUSE MODAL */}
        {/* =================================================================== */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40 animate-fade-in space-y-4">
            <h2 className="text-2xl font-black text-white">CLIMB PAUSED</h2>
            <div className="flex flex-col gap-2 w-48">
              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('playing');
                }}
                className="py-3 rounded-2xl bg-cyan-500 text-slate-950 font-black text-sm cursor-pointer"
              >
                RESUME
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('menu');
                }}
                className="py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 3. BOTTOM TOUCH / JUMP CONTROLS BAR */}
      {/* ===================================================================== */}
      <div className="w-full bg-slate-900/95 border-b border-x border-slate-800 rounded-b-2xl p-3 flex items-center justify-between gap-3 shadow-xl">
        <button
          onClick={triggerJump}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 active:scale-95 transition cursor-pointer"
        >
          <span>⚔️ TAP / SPACEBAR TO JUMP & SLASH</span>
        </button>
      </div>

      {/* Rewarded Video Ad Modal */}
      <RewardAdModal
        isOpen={showRewardedModal}
        onClose={() => setShowRewardedModal(false)}
        rewardDescription={rewardClaimDescription}
        customRewardAmount={500}
        onRewardGranted={() => {
          startClimbGame(score > 0 ? score : 500, true);
        }}
      />

      {/* Interstitial Ad Modal */}
      <InterstitialAdModal
        isOpen={showInterstitialModal}
        onClose={() => setShowInterstitialModal(false)}
        title="NINJUMP INTERMISSION"
      />
    </div>
  );
};
