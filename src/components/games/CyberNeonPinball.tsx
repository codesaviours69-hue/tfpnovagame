import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Award,
  Zap,
  Crown,
  Flame,
  Sparkles,
  ChevronRight,
  Shield,
  HelpCircle
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

// --- TABLE & PHYSICS RESOLUTION ---
const V_WIDTH = 460;
const V_HEIGHT = 740;
const GRAVITY = 0.32;
const BALL_RADIUS = 9.5;
const MAX_BALL_SPEED = 24;

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface Flipper {
  pivotX: number;
  pivotY: number;
  length: number;
  angle: number;
  restAngle: number;
  maxAngle: number;
  angularVelocity: number;
  isPressed: boolean;
  color: string;
  glowColor: string;
}

interface Bumper {
  id: number;
  x: number;
  y: number;
  radius: number;
  points: number;
  color: string;
  glowColor: string;
  hitTimer: number;
  name: string;
}

interface Slingshot {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  hitTimer: number;
  color: string;
}

interface DropTarget {
  id: number;
  letter: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDown: boolean;
  color: string;
}

interface Rollover {
  id: number;
  x: number;
  y: number;
  radius: number;
  lit: boolean;
  label: string;
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

interface FloatingScore {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export const CyberNeonPinball: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Game UI States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_pinball_highscore');
    return saved ? parseInt(saved, 10) : 250000;
  });
  const [ballsRemaining, setBallsRemaining] = useState<number>(3);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [ballSaveTimer, setBallSaveTimer] = useState<number>(0);
  const [isMultiball, setIsMultiball] = useState<boolean>(false);
  const [dmdMessage, setDmdMessage] = useState<string>('CYBER PINBALL DX');
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [plungerCharge, setPlungerCharge] = useState<number>(0);
  const [isChargingPlunger, setIsChargingPlunger] = useState<boolean>(false);
  const [leftFlipperPressed, setLeftFlipperPressed] = useState<boolean>(false);
  const [rightFlipperPressed, setRightFlipperPressed] = useState<boolean>(false);

  // Engine Physics & Object Graph Ref
  const engineRef = useRef<{
    balls: Ball[];
    leftFlipper: Flipper;
    rightFlipper: Flipper;
    bumpers: Bumper[];
    slingshots: Slingshot[];
    dropTargets: DropTarget[];
    rollovers: Rollover[];
    particles: Particle[];
    floatingScores: FloatingScore[];
    keys: Record<string, boolean>;
    shake: number;
    lastTime: number;
    ballSaveActive: boolean;
    ballSaveEndTime: number;
    jackpotEndTime: number;
    dmdTimer: number;
    oneWayGatePassed: boolean;
  }>({
    balls: [],
    leftFlipper: {
      pivotX: 145,
      pivotY: 605,
      length: 72,
      angle: 0.48,
      restAngle: 0.48,
      maxAngle: -0.46,
      angularVelocity: 0,
      isPressed: false,
      color: '#00f0ff',
      glowColor: 'rgba(0, 240, 255, 0.9)',
    },
    rightFlipper: {
      pivotX: 275,
      pivotY: 605,
      length: 72,
      angle: Math.PI - 0.48,
      restAngle: Math.PI - 0.48,
      maxAngle: Math.PI + 0.46,
      angularVelocity: 0,
      isPressed: false,
      color: '#ff007f',
      glowColor: 'rgba(255, 0, 127, 0.9)',
    },
    bumpers: [
      { id: 1, x: 210, y: 190, radius: 26, points: 1000, color: '#ffe600', glowColor: '#ffe600', hitTimer: 0, name: 'SOLAR' },
      { id: 2, x: 135, y: 265, radius: 24, points: 750, color: '#00f0ff', glowColor: '#00f0ff', hitTimer: 0, name: 'CYBER' },
      { id: 3, x: 285, y: 265, radius: 24, points: 750, color: '#ff007f', glowColor: '#ff007f', hitTimer: 0, name: 'VORTEX' },
    ],
    slingshots: [
      // Left Slingshot: Kicks right-upwards
      { x1: 85, y1: 490, x2: 85, y2: 565, x3: 130, y3: 550, hitTimer: 0, color: '#00f0ff' },
      // Right Slingshot: Kicks left-upwards
      { x1: 335, y1: 490, x2: 335, y2: 565, x3: 290, y3: 550, hitTimer: 0, color: '#ff007f' },
    ],
    dropTargets: [
      { id: 1, letter: 'N', x: 60, y: 340, width: 14, height: 24, isDown: false, color: '#00f0ff' },
      { id: 2, letter: 'O', x: 60, y: 370, width: 14, height: 24, isDown: false, color: '#00f0ff' },
      { id: 3, letter: 'V', x: 60, y: 400, width: 14, height: 24, isDown: false, color: '#00f0ff' },
      { id: 4, letter: 'A', x: 60, y: 430, width: 14, height: 24, isDown: false, color: '#00f0ff' },
    ],
    rollovers: [
      { id: 1, x: 150, y: 95, radius: 7, lit: false, label: '1X' },
      { id: 2, x: 210, y: 80, radius: 7, lit: false, label: '2X' },
      { id: 3, x: 270, y: 95, radius: 7, lit: false, label: '3X' },
    ],
    particles: [],
    floatingScores: [],
    keys: {},
    shake: 0,
    lastTime: performance.now(),
    ballSaveActive: true,
    ballSaveEndTime: 0,
    jackpotEndTime: 0,
    dmdTimer: 0,
    oneWayGatePassed: false,
  });

  // Display message on arcade DMD
  const showDMD = useCallback((msg: string, durationMs: number = 2400) => {
    setDmdMessage(msg);
    engineRef.current.dmdTimer = performance.now() + durationMs;
  }, []);

  // Add Score helper
  const addScore = useCallback(
    (pts: number, x?: number, y?: number) => {
      const finalPts = pts * multiplier;
      setScore((prev) => {
        const next = prev + finalPts;
        if (next > highScore) {
          setHighScore(next);
          localStorage.setItem('novaplay_pinball_highscore', String(next));
        }
        return next;
      });

      if (x !== undefined && y !== undefined) {
        engineRef.current.floatingScores.push({
          x,
          y,
          text: `+${finalPts.toLocaleString()}`,
          color: '#ffe600',
          alpha: 1,
          vy: -1.5,
        });
      }
    },
    [multiplier, highScore]
  );

  // Spawn New Ball in Plunger Lane
  const launchNewBall = useCallback(() => {
    const eng = engineRef.current;
    eng.balls = [
      {
        id: Date.now(),
        x: 405,
        y: 630,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        trail: [],
      },
    ];
    eng.ballSaveActive = true;
    eng.ballSaveEndTime = performance.now() + 14000;
    eng.oneWayGatePassed = false;
    setBallSaveTimer(14);
    setIsMultiball(false);
    showDMD('PULL PLUNGER TO LAUNCH', 2500);
  }, [showDMD]);

  // Start New Game
  const startNewGame = () => {
    sound.playClick();
    const eng = engineRef.current;
    setScore(0);
    setBallsRemaining(3);
    setMultiplier(1);
    setIsMultiball(false);
    eng.dropTargets.forEach((t) => (t.isDown = false));
    eng.rollovers.forEach((r) => (r.lit = false));
    eng.particles = [];
    eng.floatingScores = [];
    launchNewBall();
    setGameState('playing');
  };

  // Launch Ball with Plunger Force
  const firePlunger = (powerRatio: number) => {
    const eng = engineRef.current;
    const plungerBall = eng.balls.find((b) => b.x > 380 && b.y > 500);
    if (plungerBall) {
      const speed = 19 + powerRatio * 16;
      plungerBall.vy = -speed;
      plungerBall.vx = (Math.random() - 0.5) * 1.0;
      sound.playPlungerLaunch();
      showDMD('BALL IN PLAY!', 2000);

      for (let i = 0; i < 16; i++) {
        eng.particles.push({
          x: plungerBall.x,
          y: plungerBall.y + 8,
          vx: (Math.random() - 0.5) * 3.5,
          vy: 2 + Math.random() * 4,
          size: 3 + Math.random() * 2,
          color: '#ffe600',
          alpha: 1,
          decay: 0.045,
        });
      }
    }
  };

  // Flipper Actions
  const setLeftFlipper = useCallback((pressed: boolean) => {
    const eng = engineRef.current;
    if (pressed && !eng.leftFlipper.isPressed) {
      sound.playFlipperSnap();
    }
    eng.leftFlipper.isPressed = pressed;
    setLeftFlipperPressed(pressed);
  }, []);

  const setRightFlipper = useCallback((pressed: boolean) => {
    const eng = engineRef.current;
    if (pressed && !eng.rightFlipper.isPressed) {
      sound.playFlipperSnap();
    }
    eng.rightFlipper.isPressed = pressed;
    setRightFlipperPressed(pressed);
  }, []);

  // NATIVE MOBILE TOUCH SCREEN TRACKING (Left Screen Half = Left, Right Screen Half = Right)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      if (gameState !== 'playing') return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = V_WIDTH / rect.width;

      let left = false;
      let right = false;

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const x = (touch.clientX - rect.left) * scaleX;

        // Far right lane = plunger
        if (x > V_WIDTH * 0.84) {
          setIsChargingPlunger(true);
        } else if (x < V_WIDTH * 0.5) {
          left = true;
        } else {
          right = true;
        }
      }

      setLeftFlipper(left);
      setRightFlipper(right);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = V_WIDTH / rect.width;

      let left = false;
      let right = false;

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const x = (touch.clientX - rect.left) * scaleX;
        if (x < V_WIDTH * 0.5) left = true;
        else if (x <= V_WIDTH * 0.84) right = true;
      }

      setLeftFlipper(left);
      setRightFlipper(right);

      if (isChargingPlunger && e.touches.length === 0) {
        firePlunger(Math.max(0.5, plungerCharge));
        setIsChargingPlunger(false);
        setPlungerCharge(0);
      }
    };

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('touchmove', handleTouch);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [gameState, isChargingPlunger, plungerCharge, setLeftFlipper, setRightFlipper]);

  // Plunger Charge Loop
  useEffect(() => {
    let timer: number;
    if (isChargingPlunger) {
      timer = window.setInterval(() => {
        setPlungerCharge((prev) => Math.min(1.0, prev + 0.07));
      }, 30);
    }
    return () => clearInterval(timer);
  }, [isChargingPlunger]);

  // Main Pinball Physics Engine with 6 Sub-steps per frame (No tunnelling!)
  useEffect(() => {
    let animationFrameId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      engineRef.current.keys[e.code] = true;

      // Left: A, Z, ArrowLeft, ShiftLeft
      if (e.code === 'KeyA' || e.code === 'KeyZ' || e.code === 'ArrowLeft' || e.code === 'ShiftLeft') {
        setLeftFlipper(true);
      }

      // Right: D, Slash, ArrowRight, ShiftRight
      if (e.code === 'KeyD' || e.code === 'Slash' || e.code === 'ArrowRight' || e.code === 'ShiftRight') {
        setRightFlipper(true);
      }

      // Launch: Space, ArrowDown, Enter
      if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'Enter') {
        setIsChargingPlunger(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      engineRef.current.keys[e.code] = false;

      if (e.code === 'KeyA' || e.code === 'KeyZ' || e.code === 'ArrowLeft' || e.code === 'ShiftLeft') {
        setLeftFlipper(false);
      }

      if (e.code === 'KeyD' || e.code === 'Slash' || e.code === 'ArrowRight' || e.code === 'ShiftRight') {
        setRightFlipper(false);
      }

      if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'Enter') {
        firePlunger(Math.max(0.5, plungerCharge));
        setIsChargingPlunger(false);
        setPlungerCharge(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Sub-stepping Physics Step
    const updatePhysics = (totalDt: number) => {
      const eng = engineRef.current;
      if (gameState !== 'playing') return;

      // Ball Save Timer
      if (eng.ballSaveActive) {
        const remaining = Math.max(0, Math.ceil((eng.ballSaveEndTime - performance.now()) / 1000));
        setBallSaveTimer(remaining);
        if (remaining <= 0) eng.ballSaveActive = false;
      }

      // Sub-step physics (6 steps per frame)
      const SUBSTEPS = 6;
      const dt = totalDt / SUBSTEPS;

      for (let step = 0; step < SUBSTEPS; step++) {
        // 1. Update Flipper Angle with High-Speed Snappy Return
        const updateFlipper = (f: Flipper, isLeft: boolean) => {
          const target = f.isPressed ? f.maxAngle : f.restAngle;
          const diff = target - f.angle;
          const speed = f.isPressed ? 65 : 45;
          f.angularVelocity = diff * speed;
          f.angle += f.angularVelocity * dt;

          if (isLeft) {
            if (f.angle < f.maxAngle) f.angle = f.maxAngle;
            if (f.angle > f.restAngle) f.angle = f.restAngle;
          } else {
            if (f.angle > f.maxAngle) f.angle = f.maxAngle;
            if (f.angle < f.restAngle) f.angle = f.restAngle;
          }
        };
        updateFlipper(eng.leftFlipper, true);
        updateFlipper(eng.rightFlipper, false);

        // 2. Simulate Each Ball
        for (let i = eng.balls.length - 1; i >= 0; i--) {
          const ball = eng.balls[i];

          // Gravity
          ball.vy += GRAVITY / SUBSTEPS;

          // Drag / Friction
          ball.vx *= Math.pow(0.998, 1 / SUBSTEPS);
          ball.vy *= Math.pow(0.998, 1 / SUBSTEPS);

          // Max speed clamp
          const spd = Math.hypot(ball.vx, ball.vy);
          if (spd > MAX_BALL_SPEED) {
            ball.vx = (ball.vx / spd) * MAX_BALL_SPEED;
            ball.vy = (ball.vy / spd) * MAX_BALL_SPEED;
          }

          ball.x += ball.vx * (1 / SUBSTEPS);
          ball.y += ball.vy * (1 / SUBSTEPS);

          // Check if ball exited plunger lane into main table
          if (ball.x < 375 && ball.y < 160) {
            eng.oneWayGatePassed = true;
          }

          // Top Arch Curve (R = 190, center at 210, 150)
          if (ball.y < 150 && ball.x > 30 && ball.x < 390) {
            const archCX = 210;
            const archCY = 150;
            const archR = 185;
            const dx = ball.x - archCX;
            const dy = ball.y - archCY;
            const dist = Math.hypot(dx, dy);
            if (dist > archR - ball.radius) {
              const nx = dx / dist;
              const ny = dy / dist;
              ball.x = archCX + nx * (archR - ball.radius);
              const dot = ball.vx * nx + ball.vy * ny;
              ball.vx = (ball.vx - 2 * dot * nx) * 0.88;
              ball.vy = (ball.vy - 2 * dot * ny) * 0.88;
              sound.playPuckWallBounce();
            }
          }

          // Left Outer Wall (x = 30)
          if (ball.x < 30 + ball.radius) {
            ball.x = 30 + ball.radius;
            ball.vx = Math.abs(ball.vx) * 0.85;
            sound.playPuckWallBounce();
          }

          // Plunger Divider Wall (x = 380)
          if (ball.y > 150) {
            if (ball.x < 380 && ball.x > 380 - ball.radius) {
              ball.x = 380 - ball.radius;
              ball.vx = -Math.abs(ball.vx) * 0.85;
              sound.playPuckWallBounce();
            } else if (ball.x >= 380 && ball.x < 380 + ball.radius) {
              ball.x = 380 + ball.radius;
              ball.vx = Math.abs(ball.vx) * 0.85;
              sound.playPuckWallBounce();
            }
          }

          // Right Outer Wall (x = 430)
          if (ball.x > 430 - ball.radius) {
            ball.x = 430 - ball.radius;
            ball.vx = -Math.abs(ball.vx) * 0.85;
            sound.playPuckWallBounce();
          }

          // Upper Left Orbit Deflector: (30, 220) to (95, 140)
          checkLineCollision(ball, 30, 220, 95, 140, 0.82);

          // Inlane Funnel Rails (Lead smoothly to flipper pivots!)
          // Left inlane: (30, 480) -> (85, 550) -> (145, 605)
          checkLineCollision(ball, 30, 480, 85, 550, 0.78);
          checkLineCollision(ball, 85, 550, 145, 605, 0.78);

          // Right inlane: (380, 480) -> (335, 550) -> (275, 605)
          checkLineCollision(ball, 380, 480, 335, 550, 0.78);
          checkLineCollision(ball, 335, 550, 275, 605, 0.78);

          // Rollover Wire Triggers
          eng.rollovers.forEach((ro) => {
            if (!ro.lit && Math.hypot(ball.x - ro.x, ball.y - ro.y) < ball.radius + ro.radius) {
              ro.lit = true;
              sound.playCollect();
              addScore(2500, ro.x, ro.y - 12);
              showDMD(`LANE ${ro.label} LIT!`, 1500);

              if (eng.rollovers.every((r) => r.lit)) {
                setMultiplier((prev) => Math.min(10, prev + 1));
                showDMD('🔥 MULTIPLIER BOOST! 🔥', 2500);
                sound.playWin();
                setTimeout(() => {
                  eng.rollovers.forEach((r) => (r.lit = false));
                }, 3000);
              }
            }
          });

          // 3 Pop Bumpers Collision
          eng.bumpers.forEach((b) => {
            const dx = ball.x - b.x;
            const dy = ball.y - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist < b.radius + ball.radius) {
              const nx = dx / dist;
              const ny = dy / dist;
              ball.x = b.x + nx * (b.radius + ball.radius);

              const impulse = 16.5;
              ball.vx = nx * impulse;
              ball.vy = ny * impulse;

              b.hitTimer = 0.25;
              eng.shake = 5;
              sound.playPinballBumper(multiplier);
              addScore(b.points, b.x, b.y - 18);

              for (let k = 0; k < 12; k++) {
                const ang = Math.random() * Math.PI * 2;
                const sp = 3 + Math.random() * 4;
                eng.particles.push({
                  x: b.x,
                  y: b.y,
                  vx: Math.cos(ang) * sp,
                  vy: Math.sin(ang) * sp,
                  size: 3,
                  color: b.color,
                  alpha: 1,
                  decay: 0.04,
                });
              }
            }
          });

          // Slingshots (High Energy Diagonal Kick)
          eng.slingshots.forEach((s) => {
            if (checkLineCollision(ball, s.x1, s.y1, s.x3, s.y3, 1.5)) {
              s.hitTimer = 0.22;
              sound.playSlingshotHit();
              addScore(350, s.x3, s.y3);
            }
          });

          // Drop Targets (NOVA)
          eng.dropTargets.forEach((t) => {
            if (!t.isDown) {
              if (
                ball.x + ball.radius > t.x &&
                ball.x - ball.radius < t.x + t.width &&
                ball.y + ball.radius > t.y &&
                ball.y - ball.radius < t.y + t.height
              ) {
                t.isDown = true;
                ball.vx = Math.abs(ball.vx) * 0.9 + 2;
                sound.playDropTarget();
                addScore(1500, t.x + 25, t.y);

                if (eng.dropTargets.every((target) => target.isDown)) {
                  triggerJackpotMultiball();
                }
              }
            }
          });

          // Flipper Collisions (Angular Kinetic Impulse)
          checkFlipperCollision(ball, eng.leftFlipper, true);
          checkFlipperCollision(ball, eng.rightFlipper, false);

          // Drain Check
          if (ball.y > V_HEIGHT + 20) {
            eng.balls.splice(i, 1);

            if (eng.balls.length > 0) continue;

            if (eng.ballSaveActive) {
              launchNewBall();
              showDMD('🛡️ BALL SAVED! RESPAWNING...', 2000);
              sound.playPowerup();
              continue;
            }

            setBallsRemaining((prev) => {
              const next = prev - 1;
              if (next > 0) {
                showDMD(`BALL ${4 - next} READY`, 2000);
                setTimeout(() => launchNewBall(), 1000);
              } else {
                setGameState('gameover');
                showDMD('GAME OVER', 4000);
                sound.playGameOver();
              }
              return next;
            });
          }
        }
      }

      // Trail Logging (once per render frame)
      eng.balls.forEach((ball) => {
        if (ball.trail.length > 10) ball.trail.shift();
        ball.trail.push({ x: ball.x, y: ball.y, alpha: 1 });
      });

      // Decay Timers
      eng.bumpers.forEach((b) => {
        if (b.hitTimer > 0) b.hitTimer -= totalDt;
      });
      eng.slingshots.forEach((s) => {
        if (s.hitTimer > 0) s.hitTimer -= totalDt;
      });

      // Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) eng.particles.splice(i, 1);
      }

      // Floating Scores
      for (let i = eng.floatingScores.length - 1; i >= 0; i--) {
        const fs = eng.floatingScores[i];
        fs.y += fs.vy;
        fs.alpha -= 0.03;
        if (fs.alpha <= 0) eng.floatingScores.splice(i, 1);
      }

      if (eng.shake > 0) eng.shake *= 0.88;
    };

    // Continuous Line Segment Collision
    const checkLineCollision = (
      ball: Ball,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      restitution: number = 0.8
    ) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return false;

      const t = Math.max(0, Math.min(1, ((ball.x - x1) * dx + (ball.y - y1) * dy) / lenSq));
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;

      const distSq = (ball.x - projX) * (ball.x - projX) + (ball.y - projY) * (ball.y - projY);
      if (distSq < ball.radius * ball.radius) {
        const dist = Math.sqrt(distSq) || 1;
        const nx = (ball.x - projX) / dist;
        const ny = (ball.y - projY) / dist;

        ball.x = projX + nx * ball.radius;
        ball.y = projY + ny * ball.radius;

        const dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) {
          ball.vx = (ball.vx - (1 + restitution) * dot * nx);
          ball.vy = (ball.vy - (1 + restitution) * dot * ny);
          return true;
        }
      }
      return false;
    };

    // Authentic Kinetic Flipper Collision (Capsule geometry)
    const checkFlipperCollision = (ball: Ball, f: Flipper, isLeft: boolean) => {
      const endX = f.pivotX + Math.cos(f.angle) * f.length;
      const endY = f.pivotY + Math.sin(f.angle) * f.length;

      const dx = endX - f.pivotX;
      const dy = endY - f.pivotY;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return;

      const t = Math.max(0, Math.min(1, ((ball.x - f.pivotX) * dx + (ball.y - f.pivotY) * dy) / lenSq));
      const projX = f.pivotX + t * dx;
      const projY = f.pivotY + t * dy;

      const distSq = (ball.x - projX) * (ball.x - projX) + (ball.y - projY) * (ball.y - projY);
      const flipperThickness = 8;
      const minDist = ball.radius + flipperThickness;

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 1;
        const nx = (ball.x - projX) / dist;
        const ny = (ball.y - projY) / dist;

        ball.x = projX + nx * minDist;
        ball.y = projY + ny * minDist;

        // Linear velocity at point on flipper: v = omega * r
        const r = t * f.length;
        const vFlipperX = -Math.sin(f.angle) * f.angularVelocity * r;
        const vFlipperY = Math.cos(f.angle) * f.angularVelocity * r;

        const relVx = ball.vx - vFlipperX;
        const relVy = ball.vy - vFlipperY;
        const dot = relVx * nx + relVy * ny;

        if (dot < 0) {
          const restitution = 1.3;
          ball.vx = (ball.vx - (1 + restitution) * dot * nx) + (isLeft ? 1.2 : -1.2);
          ball.vy = (ball.vy - (1 + restitution) * dot * ny);

          // Power strike when flipper is swinging UP
          if (f.isPressed) {
            const powerBonus = 8 + t * 14;
            ball.vy = -Math.abs(ball.vy) - powerBonus;
            ball.vx += (isLeft ? 3.5 : -3.5) * t;
            sound.playFlipperSnap();

            for (let k = 0; k < 10; k++) {
              engineRef.current.particles.push({
                x: ball.x,
                y: ball.y,
                vx: (Math.random() - 0.5) * 5,
                vy: -Math.random() * 7,
                size: 3,
                color: f.color,
                alpha: 1,
                decay: 0.05,
              });
            }
          }
        }
      }
    };

    // Trigger Jackpot Multiball
    const triggerJackpotMultiball = () => {
      setIsMultiball(true);
      setMultiplier((prev) => Math.min(10, prev + 2));
      showDMD('💥 JACKPOT MULTIBALL! 💥', 4000);
      sound.playJackpotAlarm();
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.5 } });

      const eng = engineRef.current;
      eng.jackpotEndTime = performance.now() + 14000;

      // Spawn 2 extra active balls
      eng.balls.push(
        {
          id: Date.now() + 1,
          x: 160,
          y: 220,
          vx: -4,
          vy: -5,
          radius: BALL_RADIUS,
          trail: [],
        },
        {
          id: Date.now() + 2,
          x: 260,
          y: 220,
          vx: 5,
          vy: -5,
          radius: BALL_RADIUS,
          trail: [],
        }
      );

      setTimeout(() => {
        eng.dropTargets.forEach((t) => (t.isDown = false));
      }, 4000);
    };

    // --- RENDER PASS (Clean AAA Arcade Cabinet) ---
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const eng = engineRef.current;

      ctx.save();
      if (eng.shake > 0.5) {
        ctx.translate((Math.random() - 0.5) * eng.shake, (Math.random() - 0.5) * eng.shake);
      }

      // 1. Table Felt Dark Blue Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      const tableGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
      tableGrad.addColorStop(0, '#0c0a28');
      tableGrad.addColorStop(0.5, '#030712');
      tableGrad.addColorStop(1, '#02040a');
      ctx.fillStyle = tableGrad;
      ctx.fillRect(20, 15, V_WIDTH - 40, V_HEIGHT - 25);

      // 2. Cyberpunk Neon Background Grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let y = 140; y <= 620; y += 35) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(380, y);
        ctx.stroke();
      }

      // Top Arch Outline
      ctx.beginPath();
      ctx.arc(210, 150, 185, Math.PI, 0);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Table Main Outer Rails
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(30, 150, 350, 480);

      // Plunger Lane (Right Side)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(380, 150, 50, 480);
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 3;
      ctx.strokeRect(380, 150, 50, 480);

      // Plunger Spring Indicator
      const springY = 630 + plungerCharge * 28;
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(405, 680);
      ctx.lineTo(405, springY);
      ctx.stroke();

      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.arc(405, springY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Inlane Funnels to Flippers
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(30, 480);
      ctx.lineTo(85, 550);
      ctx.lineTo(145, 605);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 0, 127, 0.5)';
      ctx.beginPath();
      ctx.moveTo(380, 480);
      ctx.lineTo(335, 550);
      ctx.lineTo(275, 605);
      ctx.stroke();

      // Rollover Lanes
      eng.rollovers.forEach((ro) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ro.x, ro.y, ro.radius, 0, Math.PI * 2);
        ctx.fillStyle = ro.lit ? '#ffe600' : 'rgba(255, 230, 0, 0.15)';
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = ro.lit ? 14 : 0;
        ctx.fill();
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(ro.label, ro.x, ro.y - 10);
        ctx.restore();
      });

      // 3. Drop Targets (NOVA)
      eng.dropTargets.forEach((t) => {
        if (!t.isDown) {
          ctx.fillStyle = '#00f0ff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 10;
          ctx.fillRect(t.x, t.y, t.width, t.height);
          ctx.shadowBlur = 0;

          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(t.letter, t.x + t.width / 2, t.y + t.height / 2);
        } else {
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
          ctx.strokeRect(t.x, t.y, t.width, t.height);
        }
      });

      // 4. Pop Bumpers
      eng.bumpers.forEach((b) => {
        const scale = b.hitTimer > 0 ? 1.25 : 1.0;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.scale(scale, scale);

        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#090d16';
        ctx.fill();
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = b.glowColor;
        ctx.shadowBlur = b.hitTimer > 0 ? 25 : 10;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
        ctx.restore();
      });

      // 5. Slingshots
      eng.slingshots.forEach((s) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.lineTo(s.x3, s.y3);
        ctx.closePath();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fill();
        ctx.strokeStyle = s.hitTimer > 0 ? '#ffffff' : s.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = s.hitTimer > 0 ? 20 : 8;
        ctx.stroke();
        ctx.restore();
      });

      // 6. Flippers
      const renderFlipper = (f: Flipper) => {
        const endX = f.pivotX + Math.cos(f.angle) * f.length;
        const endY = f.pivotY + Math.sin(f.angle) * f.length;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 15;
        ctx.shadowColor = f.glowColor;
        ctx.shadowBlur = f.isPressed ? 20 : 10;
        ctx.beginPath();
        ctx.moveTo(f.pivotX, f.pivotY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(f.pivotX, f.pivotY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      renderFlipper(eng.leftFlipper);
      renderFlipper(eng.rightFlipper);

      // 7. Particles
      eng.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 8. Chrome Steel Balls
      eng.balls.forEach((ball) => {
        ball.trail.forEach((t, idx) => {
          const ratio = (idx + 1) / ball.trail.length;
          ctx.save();
          ctx.globalAlpha = ratio * 0.35;
          ctx.fillStyle = '#00f0ff';
          ctx.beginPath();
          ctx.arc(t.x, t.y, ball.radius * ratio * 0.75, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        ctx.save();
        const ballGrad = ctx.createRadialGradient(
          ball.x - 3,
          ball.y - 3,
          1,
          ball.x,
          ball.y,
          ball.radius
        );
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.3, '#f1f5f9');
        ballGrad.addColorStop(0.7, '#94a3b8');
        ballGrad.addColorStop(1, '#1e293b');

        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      });

      // 9. Floating Points
      eng.floatingScores.forEach((fs) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, fs.alpha);
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = fs.color;
        ctx.shadowColor = fs.color;
        ctx.shadowBlur = 8;
        ctx.fillText(fs.text, fs.x, fs.y);
        ctx.restore();
      });

      ctx.restore();
    };

    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      updatePhysics(dt);
      render();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, multiplier, addScore, launchNewBall, plungerCharge, setLeftFlipper, setRightFlipper, showDMD]);

  return (
    <div
      ref={containerRef}
      id="cyber-pinball-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1"
    >
      {/* Top Arcade DMD Scoreboard */}
      <div className="w-full mb-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl shadow-cyan-950/40">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
          {/* Score */}
          <div>
            <div className="text-[10px] uppercase font-bold text-cyan-400">Score</div>
            <div className="text-xl sm:text-2xl font-black text-white leading-none tracking-tight">
              {score.toLocaleString()}
            </div>
          </div>

          {/* Multiplier & Balls */}
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
              {multiplier}X
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-black">
              BALL {ballsRemaining}/3
            </div>
          </div>

          {/* Best Score */}
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center justify-end gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Best
            </div>
            <div className="text-sm sm:text-base font-black text-slate-200 leading-none">
              {highScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Animated Cyber DMD Matrix Banner */}
        <div className="w-full py-1 px-2.5 rounded-lg bg-slate-950 border border-cyan-500/20 flex items-center justify-between text-[11px] font-mono font-black text-cyan-300">
          <div className="flex items-center gap-1.5 animate-pulse truncate">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="truncate">{dmdMessage}</span>
          </div>

          {ballSaveTimer > 0 && (
            <span className="text-pink-400 font-bold text-[10px] flex-shrink-0 ml-1">
              SAVE: {ballSaveTimer}s
            </span>
          )}
        </div>
      </div>

      {/* Main Responsive Canvas Table Stage */}
      <div className="relative w-full max-w-[460px] aspect-[460/740] max-h-[74vh] sm:max-h-[82vh] flex items-center justify-center rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-black touch-none">
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          className="w-full h-full object-contain block touch-none cursor-pointer"
        />

        {/* Start / Menu Modal Overlay */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center z-20 space-y-3.5 animate-fade-in overflow-y-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-pink-500 to-amber-500 p-0.5 shadow-xl shadow-cyan-500/30 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400 animate-bounce" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
                <Crown className="w-3 h-3 text-amber-400" /> PREMIUM ARCADE
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                PINBALL ARCADE <span className="text-cyan-400">FRENZY</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mx-auto">
                60 FPS neon arcade physics, responsive flippers, pop bumpers, and Jackpot Multiball!
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left text-xs space-y-1 w-full max-w-xs text-slate-300">
              <div className="font-bold text-white flex items-center gap-1 text-[11px]">
                <Zap className="w-3 h-3 text-cyan-400" /> Controls:
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 leading-relaxed">
                • <b>Mobile:</b> Tap Left/Right screen halves or bottom flipper buttons.
                <br />• <b>Desktop:</b> [A] / [D] or Left / Right Arrows + [Spacebar] Plunger.
              </div>
            </div>

            <button
              onClick={startNewGame}
              className="w-full max-w-xs py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 text-white font-black text-sm sm:text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              START MATCH
            </button>
          </div>
        )}

        {/* Game Over Modal */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-3 animate-fade-in z-20">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-7 h-7 text-amber-400 animate-bounce" />
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Game Concluded</div>
              <h2 className="text-2xl font-black text-white">GAME OVER</h2>
              <div className="text-xs sm:text-sm text-cyan-400 font-black mt-1">
                Final Score: {score.toLocaleString()} PTS
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button
                onClick={startNewGame}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-1.5 hover:scale-105 transition-all"
              >
                <RotateCcw className="w-4 h-4" /> PLAY AGAIN
              </button>

              <button
                onClick={() => setGameState('menu')}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs transition-colors"
              >
                Return to Menu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Large Tactile Glowing Flipper Buttons (Ultra-responsive on Mobile & Touch) */}
      <div className="w-full max-w-[360px] sm:max-w-[420px] mt-2 flex items-center justify-between gap-2">
        {/* Left Flipper Button */}
        <button
          onPointerDown={() => setLeftFlipper(true)}
          onPointerUp={() => setLeftFlipper(false)}
          onPointerLeave={() => setLeftFlipper(false)}
          className={`flex-1 py-3 rounded-2xl border text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1 shadow-lg ${
            leftFlipperPressed
              ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-cyan-400/50 scale-95'
              : 'bg-slate-900 text-cyan-400 border-cyan-500/40 hover:bg-slate-800 active:scale-95'
          }`}
        >
          ◀ LEFT
        </button>

        {/* Center Plunger Launch Button */}
        <button
          onPointerDown={() => setIsChargingPlunger(true)}
          onPointerUp={() => {
            firePlunger(Math.max(0.5, plungerCharge));
            setIsChargingPlunger(false);
            setPlungerCharge(0);
          }}
          onPointerLeave={() => {
            if (isChargingPlunger) {
              firePlunger(Math.max(0.5, plungerCharge));
              setIsChargingPlunger(false);
              setPlungerCharge(0);
            }
          }}
          className={`px-3.5 py-3 rounded-2xl border text-xs sm:text-sm font-black transition-all shadow-lg ${
            isChargingPlunger
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/50 scale-95 animate-pulse'
              : 'bg-slate-900 text-amber-400 border-amber-500/40 hover:bg-slate-800'
          }`}
        >
          🚀 LAUNCH
        </button>

        {/* Right Flipper Button */}
        <button
          onPointerDown={() => setRightFlipper(true)}
          onPointerUp={() => setRightFlipper(false)}
          onPointerLeave={() => setRightFlipper(false)}
          className={`flex-1 py-3 rounded-2xl border text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1 shadow-lg ${
            rightFlipperPressed
              ? 'bg-pink-500 text-slate-950 border-pink-300 shadow-pink-500/50 scale-95'
              : 'bg-slate-900 text-pink-400 border-pink-500/40 hover:bg-slate-800 active:scale-95'
          }`}
        >
          RIGHT ▶
        </button>
      </div>

      {/* Bottom Audio and Menu Settings */}
      <div className="w-full max-w-[360px] sm:max-w-[420px] mt-1.5 flex items-center justify-between text-xs text-slate-400">
        <div className="text-[11px] text-slate-400">
          🎮 Keys: <span className="text-cyan-300 font-bold">A</span> / <span className="text-pink-300 font-bold">D</span> or <span className="text-amber-300 font-bold">Space</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const isMute = sound.toggleMute();
              setMuted(isMute);
            }}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={() => setGameState('menu')}
            className="px-2 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold flex items-center gap-1 text-[11px] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Menu
          </button>
        </div>
      </div>
    </div>
  );
};
