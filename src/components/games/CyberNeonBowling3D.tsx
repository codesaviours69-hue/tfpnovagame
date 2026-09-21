import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Sparkles, Flame, Shield, ArrowRight, Zap, Target } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface Pin {
  id: number;
  x: number; // Lane X (-0.8 to 0.8)
  z: number; // Lane Z (deck distance around 600)
  vx: number;
  vz: number;
  rot: number;
  rotV: number;
  isFallen: boolean;
  knocked: boolean;
}

interface BowlingBall {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  radius: number;
  color: string;
  glow: string;
  isRolling: boolean;
  isGutter: boolean;
}

interface FrameScore {
  rolls: (number | 'X' | '/' | '-')[];
  score: number | null;
}

const BALL_SKINS = [
  { id: 'cyan', name: 'Cyber Plasma', color: '#00f0ff', glow: '#00f0ff', price: 0 },
  { id: 'fire', name: 'Solar Flare', color: '#f97316', glow: '#ef4444', price: 200 },
  { id: 'purple', name: 'Void Orbit', color: '#a855f7', glow: '#d946ef', price: 500 },
  { id: 'gold', name: 'Golden Champion', color: '#facc15', glow: '#eab308', price: 1000 },
];

export const CyberNeonBowling3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game UI State
  const [gameState, setGameState] = useState<'idle' | 'aiming' | 'rolling' | 'frame_over' | 'game_over'>('idle');
  const [currentFrame, setCurrentFrame] = useState(1);
  const [currentRoll, setCurrentRoll] = useState(1);
  const [frames, setFrames] = useState<FrameScore[]>(() =>
    Array.from({ length: 10 }, () => ({ rolls: [], score: null }))
  );
  const [totalScore, setTotalScore] = useState(0);
  const [strikeBanner, setStrikeBanner] = useState<string | null>(null);
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem('cyber_bowling_coins');
    return saved ? parseInt(saved, 10) : 150;
  });
  const [selectedBallIndex, setSelectedBallIndex] = useState(() => {
    const saved = localStorage.getItem('cyber_bowling_ball');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isMuted, setIsMuted] = useState(sound.isMuted());

  // Ball & Aiming Engine Ref
  const engineRef = useRef({
    ballStartX: 0, // -0.7 to 0.7
    aimAngle: 0, // -0.25 to 0.25 rad
    ball: {
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: 0,
      radius: 14,
      color: '#00f0ff',
      glow: '#00f0ff',
      isRolling: false,
      isGutter: false,
    } as BowlingBall,
    pins: [] as Pin[],
    particles: [] as { x: number; y: number; z: number; vx: number; vy: number; vz: number; color: string; alpha: number }[],
    swipeStartY: 0,
    swipeStartX: 0,
    swipeStartTime: 0,
    isSwiping: false,
    cameraZ: -50,
    cameraY: 60,
    laneLength: 640,
    laneWidth: 160,
    gutterL: -80,
    gutterR: 80,
    frameCooldown: 0,
    animationFrameId: 0,
  });

  // Setup Standard 10 Pins Layout
  const resetPins = useCallback(() => {
    const deckZ = 580;
    const pinSpacingX = 22;
    const pinSpacingZ = 20;

    const initialPins: Pin[] = [
      // Row 1 (Pin 1 Headpin)
      { id: 1, x: 0, z: deckZ, vx: 0, vz: 0, rot: 0, rotV: 0, isFallen: false, knocked: false },
      // Row 2 (Pins 2, 3)
      { id: 2, x: -pinSpacingX * 0.5, z: deckZ + pinSpacingZ, vx: 0, vz: 0, rot: 0, rotV: 0, isFallen: false, knocked: false },
      { id: 3, x: pinSpacingX * 0.5, z: deckZ + pinSpacingZ, vx: 0, vz: 0, rot: 0, rotV: 0, isFallen: false, knocked: false },
      // Row 3 (Pins 4, 5, 6)
      { id: 4, x: -pinSpacingX, z: deckZ + pinSpacingZ * 2, vx: 0, vz: 0, rot: 0, rotV: 0, isFallen: false, knocked: false },
      { id: 5, x: 0, z: deckZ + pinSpacingZ * 2, vx: 0, vz: 0, rot: 0, rotV: 0, isFallen: false, knocked: false },
      { id: 6, x: pinSpacingX, z: deckZ + pinSpacingZ * 2, vx: 0, vz: 0, rot: 0, rotV: 0, isFallen: false, knocked: false },
      // Row 4 (Pins 7, 8, 9, 10)
      { id: 7, x: -pinSpacingX * 1.5, z: deckZ + pinSpacingZ * 3, vx: 0, vz: 0, rot: 0, rotV: 0, isFallen: false, knocked: false },
      { id: 8, x: -pinSpacingX * 0.5, z: deckZ + pinSpacingZ * 3, vx: 0, vz: 0, rot: 0, rotV: 0, isFallen: false, knocked: false },
      { id: 9, x: pinSpacingX * 0.5, z: deckZ + pinSpacingZ * 3, vx: 0, vz: 0, rot: 0, rotV: 0, isFallen: false, knocked: false },
      { id: 10, x: pinSpacingX * 1.5, z: deckZ + pinSpacingZ * 3, vx: 0, vz: 0, rot: 0, rotV: 0, isFallen: false, knocked: false },
    ];

    engineRef.current.pins = initialPins;
  }, []);

  // Calculate Cumulative Bowling Score
  const computeTotalScore = (newFrames: FrameScore[]) => {
    let total = 0;
    const rollsList: number[] = [];

    // Flatten all rolls into numerical values
    newFrames.forEach((f) => {
      f.rolls.forEach((r, idx) => {
        if (r === 'X') rollsList.push(10);
        else if (r === '/') {
          const prev = typeof f.rolls[idx - 1] === 'number' ? (f.rolls[idx - 1] as number) : 0;
          rollsList.push(10 - prev);
        } else if (r === '-') rollsList.push(0);
        else if (typeof r === 'number') rollsList.push(r);
      });
    });

    let rollIdx = 0;
    for (let frameIdx = 0; frameIdx < 10; frameIdx++) {
      if (rollIdx >= rollsList.length) break;

      if (rollsList[rollIdx] === 10) {
        // Strike: 10 + next two rolls
        if (rollIdx + 2 < rollsList.length) {
          total += 10 + rollsList[rollIdx + 1] + rollsList[rollIdx + 2];
          newFrames[frameIdx].score = total;
        }
        rollIdx += 1;
      } else if (rollsList[rollIdx] + (rollsList[rollIdx + 1] || 0) === 10) {
        // Spare: 10 + next one roll
        if (rollIdx + 2 < rollsList.length) {
          total += 10 + rollsList[rollIdx + 2];
          newFrames[frameIdx].score = total;
        }
        rollIdx += 2;
      } else {
        // Open frame
        if (rollIdx + 1 < rollsList.length) {
          total += rollsList[rollIdx] + rollsList[rollIdx + 1];
          newFrames[frameIdx].score = total;
        }
        rollIdx += 2;
      }
    }

    setTotalScore(total);
  };

  // Start New Game
  const handleStartGame = () => {
    sound.playClick();
    sound.playPowerup();
    resetPins();
    setCurrentFrame(1);
    setCurrentRoll(1);
    setFrames(Array.from({ length: 10 }, () => ({ rolls: [], score: null })));
    setTotalScore(0);
    setStrikeBanner(null);

    const eng = engineRef.current;
    const skin = BALL_SKINS[selectedBallIndex] || BALL_SKINS[0];
    eng.ball = {
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: 0,
      radius: 14,
      color: skin.color,
      glow: skin.glow,
      isRolling: false,
      isGutter: false,
    };
    eng.ballStartX = 0;
    eng.aimAngle = 0;
    eng.cameraZ = -50;
    setGameState('aiming');
  };

  // Prepare Next Roll in Frame
  const prepareNextRoll = useCallback((nextFrame: number, nextRoll: number) => {
    const eng = engineRef.current;
    const skin = BALL_SKINS[selectedBallIndex] || BALL_SKINS[0];
    eng.ball = {
      x: eng.ballStartX,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: 0,
      radius: 14,
      color: skin.color,
      glow: skin.glow,
      isRolling: false,
      isGutter: false,
    };
    eng.cameraZ = -50;
    setCurrentFrame(nextFrame);
    setCurrentRoll(nextRoll);
    setGameState('aiming');
  }, [selectedBallIndex]);

  // Handle Swipe Launch Control
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'aiming') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const eng = engineRef.current;

    eng.isSwiping = true;
    eng.swipeStartX = e.clientX - rect.left;
    eng.swipeStartY = e.clientY - rect.top;
    eng.swipeStartTime = performance.now();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current;
    if (gameState !== 'aiming') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const curX = e.clientX - rect.left;

    if (!eng.isSwiping) {
      // Reposition ball along foul line before launch
      const normalizedX = (curX / rect.width - 0.5) * 1.3;
      eng.ballStartX = Math.max(-0.65, Math.min(0.65, normalizedX));
      eng.ball.x = eng.ballStartX * (eng.laneWidth * 0.45);
    } else {
      // Adjust Aim Angle dynamically while dragging
      const deltaX = (curX - eng.swipeStartX) / rect.width;
      eng.aimAngle = Math.max(-0.25, Math.min(0.25, deltaX * 1.2));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current;
    if (!eng.isSwiping || gameState !== 'aiming') return;
    eng.isSwiping = false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const curY = e.clientY - rect.top;
    const curX = e.clientX - rect.left;
    const elapsed = Math.max(80, performance.now() - eng.swipeStartTime);

    const deltaY = eng.swipeStartY - curY; // Upward swipe distance
    const deltaX = curX - eng.swipeStartX;

    // Minimum forward flick threshold
    if (deltaY < 30) {
      return; // Ignore tap or slight touch
    }

    const speedRatio = Math.min(1.8, Math.max(0.7, (deltaY / elapsed) * 2.8));
    const forwardSpeed = 7.5 * speedRatio;
    const lateralSpeed = (deltaX / elapsed) * 2.2;
    const hookSpin = (deltaX / elapsed) * 0.04;

    eng.ball.isRolling = true;
    eng.ball.vz = forwardSpeed;
    eng.ball.vx = lateralSpeed;
    eng.ball.spin = hookSpin;

    sound.playJump();
    setGameState('rolling');
  };

  // Main 60 FPS 3D Perspective Loop
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
      const horizonY = height * 0.28;

      // 1. UPDATE GAMEPLAY & BALL PHYSICS
      if (gameState === 'rolling') {
        const ball = eng.ball;
        // Forward motion
        ball.z += ball.vz;
        // Spin curvature hook physics
        ball.vx += ball.spin * (ball.z / 600);
        ball.x += ball.vx;

        // Camera follow
        eng.cameraZ = Math.min(420, ball.z - 65);

        // Gutter Ball Detection
        if (Math.abs(ball.x) > eng.laneWidth * 0.48) {
          if (!ball.isGutter) {
            ball.isGutter = true;
            ball.vx = 0;
            ball.spin = 0;
            sound.playGameOver();
          }
          ball.x = ball.x > 0 ? eng.laneWidth * 0.52 : -eng.laneWidth * 0.52;
        }

        // Collision detection between ball and pins
        if (!ball.isGutter && ball.z >= 540) {
          eng.pins.forEach((pin) => {
            if (pin.isFallen) return;
            const dx = ball.x - pin.x;
            const dz = ball.z - pin.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < ball.radius + 12) {
              pin.isFallen = true;
              pin.knocked = true;
              pin.vx = (pin.x - ball.x) * 0.4 + ball.vx * 0.5 + (Math.random() - 0.5) * 3;
              pin.vz = ball.vz * 0.7 + (Math.random() - 0.5) * 2;
              pin.rotV = (Math.random() - 0.5) * 0.3;

              sound.playHit();

              // Pin spark particles
              for (let p = 0; p < 8; p++) {
                eng.particles.push({
                  x: pin.x,
                  y: -15,
                  z: pin.z,
                  vx: (Math.random() - 0.5) * 5,
                  vy: -Math.random() * 5,
                  vz: (Math.random() - 0.5) * 5,
                  color: '#00f0ff',
                  alpha: 1,
                });
              }
            }
          });
        }

        // Chain Reaction Physics (Knocked pins hitting other pins)
        eng.pins.forEach((pinA) => {
          if (!pinA.knocked) return;
          pinA.x += pinA.vx;
          pinA.z += pinA.vz;
          pinA.rot += pinA.rotV;
          pinA.vx *= 0.94;
          pinA.vz *= 0.94;

          eng.pins.forEach((pinB) => {
            if (pinA.id === pinB.id || pinB.isFallen) return;
            const dx = pinA.x - pinB.x;
            const dz = pinA.z - pinB.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 26) {
              pinB.isFallen = true;
              pinB.knocked = true;
              pinB.vx = pinA.vx * 0.6 + (pinB.x - pinA.x) * 0.3;
              pinB.vz = pinA.vz * 0.6 + 2;
              pinB.rotV = (Math.random() - 0.5) * 0.3;
              sound.playHit();
            }
          });
        });

        // Ball Reached Pit End (Z > 660)
        if (ball.z > 660) {
          ball.isRolling = false;
          eng.frameCooldown = 40; // brief pause to finish pin falls
          setGameState('frame_over');

          // Tally fallen pins
          const fallenCount = eng.pins.filter((p) => p.isFallen).length;

          // Process Frame Score
          setTimeout(() => {
            setFrames((prevFrames) => {
              const next = [...prevFrames];
              const curF = { ...next[currentFrame - 1] };
              const prevRollFallen = curF.rolls.length > 0 && typeof curF.rolls[0] === 'number' ? (curF.rolls[0] as number) : 0;
              const pinsThisRoll = currentRoll === 1 ? fallenCount : fallenCount - prevRollFallen;

              if (currentRoll === 1) {
                if (pinsThisRoll === 10) {
                  curF.rolls.push('X');
                  setStrikeBanner('STRIKE! 💥');
                  sound.playPowerup();
                  confetti({ particleCount: 70, spread: 60, origin: { y: 0.5 } });
                  // Advance to next frame unless 10th frame
                  if (currentFrame < 10) {
                    resetPins();
                    prepareNextRoll(currentFrame + 1, 1);
                  } else {
                    // Frame 10 strike gets bonus roll
                    resetPins();
                    prepareNextRoll(10, 2);
                  }
                } else {
                  curF.rolls.push(pinsThisRoll === 0 ? '-' : pinsThisRoll);
                  // Remove knocked pins for roll 2
                  eng.pins = eng.pins.filter((p) => !p.isFallen);
                  prepareNextRoll(currentFrame, 2);
                }
              } else if (currentRoll === 2) {
                if (fallenCount === 10) {
                  curF.rolls.push('/');
                  setStrikeBanner('SPARE! ✨');
                  sound.playPowerup();
                } else {
                  curF.rolls.push(pinsThisRoll === 0 ? '-' : pinsThisRoll);
                }

                if (currentFrame < 10) {
                  resetPins();
                  prepareNextRoll(currentFrame + 1, 1);
                } else {
                  // Game Completed
                  setGameState('game_over');
                  sound.playPowerup();
                  confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
                }
              }

              next[currentFrame - 1] = curF;
              computeTotalScore(next);
              return next;
            });
          }, 800);
        }
      }

      // 2. 3D PERSPECTIVE RENDERING
      ctx.clearRect(0, 0, width, height);

      // 3D Perspective Projection Helper
      const project3D = (xWorld: number, yWorld: number, zWorld: number) => {
        const relZ = zWorld - eng.cameraZ;
        if (relZ <= 10) return null;
        const scale = 320 / relZ;
        const screenX = width / 2 + xWorld * scale;
        const screenY = horizonY + (yWorld + eng.cameraY) * scale;
        return { x: screenX, y: screenY, scale };
      };

      // Cyber Bowling Alley Wall & Atmosphere
      const bgGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.7, '#0f172a');
      bgGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, horizonY);

      // Distant Neon Pin Deck Screen
      const pDeckL = project3D(-eng.laneWidth * 0.6, -60, 620);
      const pDeckR = project3D(eng.laneWidth * 0.6, -60, 620);
      if (pDeckL && pDeckR) {
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.rect(pDeckL.x, pDeckL.y, pDeckR.x - pDeckL.x, 70 * pDeckL.scale);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00f0ff';
        ctx.font = `bold ${Math.round(20 * pDeckL.scale)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('CYBER STRIKE PRO', width / 2, pDeckL.y + 40 * pDeckL.scale);
      }

      // 3D Bowling Lane Floor (Reflective Polished Synthetic Wood)
      const pLaneTL = project3D(-eng.laneWidth * 0.5, 30, 620);
      const pLaneTR = project3D(eng.laneWidth * 0.5, 30, 620);
      const pLaneBL = project3D(-eng.laneWidth * 0.5, 30, -20);
      const pLaneBR = project3D(eng.laneWidth * 0.5, 30, -20);

      if (pLaneTL && pLaneTR && pLaneBL && pLaneBR) {
        // Floor Lane Polygon
        const laneGrad = ctx.createLinearGradient(0, pLaneTL.y, 0, pLaneBL.y);
        laneGrad.addColorStop(0, '#082f49');
        laneGrad.addColorStop(0.4, '#0c4a6e');
        laneGrad.addColorStop(1, '#0369a1');

        ctx.fillStyle = laneGrad;
        ctx.beginPath();
        ctx.moveTo(pLaneTL.x, pLaneTL.y);
        ctx.lineTo(pLaneTR.x, pLaneTR.y);
        ctx.lineTo(pLaneBR.x, pLaneBR.y);
        ctx.lineTo(pLaneBL.x, pLaneBL.y);
        ctx.closePath();
        ctx.fill();

        // Neon Gutters (Left & Right)
        const pGutterLL = project3D(-eng.laneWidth * 0.62, 36, -20);
        const pGutterRR = project3D(eng.laneWidth * 0.62, 36, -20);
        const pGutterTL = project3D(-eng.laneWidth * 0.62, 36, 620);
        const pGutterTR = project3D(eng.laneWidth * 0.62, 36, 620);

        if (pGutterLL && pGutterTL) {
          ctx.fillStyle = '#020617';
          ctx.beginPath();
          ctx.moveTo(pGutterTL.x, pGutterTL.y);
          ctx.lineTo(pLaneTL.x, pLaneTL.y);
          ctx.lineTo(pLaneBL.x, pLaneBL.y);
          ctx.lineTo(pGutterLL.x, pGutterLL.y);
          ctx.closePath();
          ctx.fill();
        }

        if (pGutterRR && pGutterTR) {
          ctx.fillStyle = '#020617';
          ctx.beginPath();
          ctx.moveTo(pLaneTR.x, pLaneTR.y);
          ctx.lineTo(pGutterTR.x, pGutterTR.y);
          ctx.lineTo(pGutterRR.x, pGutterRR.y);
          ctx.lineTo(pLaneBR.x, pLaneBR.y);
          ctx.closePath();
          ctx.fill();
        }

        // Glowing Neon Boundary Rails
        ctx.strokeStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(pLaneTL.x, pLaneTL.y);
        ctx.lineTo(pLaneBL.x, pLaneBL.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pLaneTR.x, pLaneTR.y);
        ctx.lineTo(pLaneBR.x, pLaneBR.y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Lane Guide Arrows (Aiming Markers)
        for (let z = 120; z <= 360; z += 80) {
          for (let ax = -40; ax <= 40; ax += 20) {
            const pArr = project3D(ax, 29, z);
            if (pArr) {
              ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
              ctx.beginPath();
              ctx.moveTo(pArr.x, pArr.y - 4 * pArr.scale);
              ctx.lineTo(pArr.x - 3 * pArr.scale, pArr.y + 4 * pArr.scale);
              ctx.lineTo(pArr.x + 3 * pArr.scale, pArr.y + 4 * pArr.scale);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }

      // 3. DRAW 10 NEON PINS
      // Sort pins by distance for correct 3D depth layering
      const sortedPins = [...eng.pins].sort((a, b) => b.z - a.z);
      sortedPins.forEach((pin) => {
        const p = project3D(pin.x, 26, pin.z);
        if (!p) return;

        const pinW = 12 * p.scale;
        const pinH = 34 * p.scale;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(pin.rot);

        // Pin Body Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 0, pinW * 0.8, pinW * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pin Silhouette
        ctx.fillStyle = pin.isFallen ? '#94a3b8' : '#ffffff';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-pinW / 2, -pinH, pinW, pinH, 5);
        ctx.fill();
        ctx.stroke();

        // Red Neck Stripes
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(-pinW / 2, -pinH * 0.7, pinW, pinH * 0.12);

        ctx.restore();
      });

      // 4. DRAW BOWLING BALL
      const ball = eng.ball;
      const pBall = project3D(ball.x, 20 + ball.y, ball.z);
      if (pBall) {
        const r = ball.radius * pBall.scale;

        // Ball Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(pBall.x, pBall.y + r * 0.6, r * 1.1, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glowing Ball Core
        ctx.save();
        ctx.fillStyle = ball.color;
        ctx.shadowColor = ball.glow;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(pBall.x, pBall.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Finger Holes
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(pBall.x - r * 0.25, pBall.y - r * 0.2, r * 0.2, 0, Math.PI * 2);
        ctx.arc(pBall.x + r * 0.25, pBall.y - r * 0.2, r * 0.2, 0, Math.PI * 2);
        ctx.arc(pBall.x, pBall.y + r * 0.2, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. DRAW AIMING TRAJECTORY LINE (When Aiming)
      if (gameState === 'aiming') {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        const pStart = project3D(eng.ballStartX * (eng.laneWidth * 0.45), 20, 0);
        const pEnd = project3D(
          eng.ballStartX * (eng.laneWidth * 0.45) + Math.sin(eng.aimAngle) * 350,
          20,
          350
        );
        if (pStart && pEnd) {
          ctx.moveTo(pStart.x, pStart.y);
          ctx.lineTo(pEnd.x, pEnd.y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // 6. PARTICLES RENDERING
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const pt = eng.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.z += pt.vz;
        pt.vy += 0.2;
        pt.alpha -= 0.03;

        if (pt.alpha <= 0) {
          eng.particles.splice(i, 1);
          continue;
        }

        const proj = project3D(pt.x, pt.y, pt.z);
        if (proj) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, pt.alpha);
          ctx.fillStyle = pt.color;
          ctx.shadowColor = pt.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, 3 * proj.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      eng.animationFrameId = requestAnimationFrame(tick);
    };

    eng.animationFrameId = requestAnimationFrame(tick);
    return () => {
      isRunning = false;
      cancelAnimationFrame(eng.animationFrameId);
    };
  }, [gameState, currentFrame, currentRoll, prepareNextRoll, resetPins]);

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans">
      {/* 1. TOP BOWLING SCORECARD BANNER */}
      <div className="w-full mb-2 p-2 rounded-2xl bg-slate-900/95 border border-slate-800 text-white backdrop-blur-md shadow-xl overflow-x-auto scrollbar-none">
        <div className="flex items-center justify-between gap-1 min-w-[280px]">
          {frames.map((f, idx) => (
            <div
              key={idx}
              className={`flex-1 flex flex-col items-center p-1 rounded-lg border text-center ${
                currentFrame === idx + 1
                  ? 'border-cyan-500/80 bg-cyan-950/40 shadow-sm'
                  : 'border-slate-800 bg-slate-950/60'
              }`}
            >
              <span className="text-[9px] font-bold text-slate-400">F{idx + 1}</span>
              <div className="flex gap-1 text-[11px] font-black h-4">
                <span>{f.rolls[0] !== undefined ? f.rolls[0] : ''}</span>
                <span>{f.rolls[1] !== undefined ? f.rolls[1] : ''}</span>
                {idx === 9 && <span>{f.rolls[2] !== undefined ? f.rolls[2] : ''}</span>}
              </div>
              <span className="text-[10px] font-black text-cyan-400">
                {f.score !== null ? f.score : '-'}
              </span>
            </div>
          ))}
          <div className="px-3 py-1 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-black text-xs shrink-0 shadow-md">
            TOTAL: {totalScore}
          </div>
        </div>
      </div>

      {/* 2. MAIN 3D BOWLING ARENA */}
      <div className="relative w-full aspect-[540/760] max-h-[74vh] sm:max-h-[82vh] rounded-3xl overflow-hidden border-2 border-slate-800 bg-[#020617] shadow-2xl shadow-cyan-950/40 touch-none">
        <canvas
          ref={canvasRef}
          width={540}
          height={760}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full block cursor-crosshair touch-none"
        />

        {/* STRIKE / SPARE BANNER OVERLAY */}
        {strikeBanner && (
          <div className="absolute top-1/4 inset-x-0 flex items-center justify-center pointer-events-none z-20 animate-bounce">
            <div className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 text-white font-black text-2xl tracking-wider shadow-2xl shadow-rose-500/50 border-2 border-white">
              {strikeBanner}
            </div>
          </div>
        )}

        {/* SWIPE HINT OVERLAY */}
        {gameState === 'aiming' && (
          <div className="absolute bottom-4 inset-x-0 flex items-center justify-center pointer-events-none z-10 px-2">
            <div className="px-4 py-1.5 rounded-full bg-slate-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold backdrop-blur-md shadow-lg flex items-center gap-1.5 animate-pulse">
              <span>⚡ Drag to position • Flick UP to roll ball!</span>
            </div>
          </div>
        )}

        {/* 3. IDLE / START SCREEN OVERLAY */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-6 text-center z-30 animate-fade-in">
            {/* Title Header */}
            <div className="space-y-2 mt-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/40 animate-bounce text-white">
                <Target className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                BOWLING 3D: <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300">STRIKE CHAMPION</span>
              </h2>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                Aim, flick forward with spin, and shatter all 10 pins for glorious Strikes & Spares in 3D perspective!
              </p>
            </div>

            {/* BALL SELECTOR */}
            <div className="w-full max-w-xs space-y-2">
              <div className="text-xs font-bold text-slate-400 text-left">CHOOSE YOUR BALL:</div>
              <div className="grid grid-cols-4 gap-2">
                {BALL_SKINS.map((skin, idx) => (
                  <button
                    key={skin.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedBallIndex(idx);
                      localStorage.setItem('cyber_bowling_ball', idx.toString());
                    }}
                    className={`p-2 rounded-2xl flex flex-col items-center gap-1 border transition-all ${
                      selectedBallIndex === idx
                        ? 'border-cyan-400 bg-cyan-950/60 shadow-lg shadow-cyan-500/30 scale-105'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full shadow-md"
                      style={{ backgroundColor: skin.color, boxShadow: `0 0 10px ${skin.glow}` }}
                    />
                    <span className="text-[9px] font-bold text-white truncate max-w-full">{skin.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Play Button */}
            <button
              onClick={handleStartGame}
              className="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-base shadow-xl shadow-cyan-500/40 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START 10-FRAME MATCH</span>
            </button>
          </div>
        )}

        {/* 4. GAME OVER SCREEN OVERLAY */}
        {gameState === 'game_over' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-2xl shadow-yellow-500/40 animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black text-white">MATCH COMPLETED!</h3>
              <p className="text-xs text-cyan-400 font-bold">Awesome Bowling Performance!</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 w-full max-w-xs space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Final Score:</span>
                <span className="font-black text-xl text-white">{totalScore} PTS</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Reward:</span>
                <span className="font-bold text-amber-400">🪙 +{Math.round(totalScore * 1.5)} Coins</span>
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm shadow-xl shadow-cyan-500/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Controls Cheatsheet */}
      <div className="mt-2 w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Controls: <strong>Drag to position • Flick UP to bowl</strong></span>
        <span className="text-cyan-400 font-bold">10 Frames Pro</span>
      </div>
    </div>
  );
};
