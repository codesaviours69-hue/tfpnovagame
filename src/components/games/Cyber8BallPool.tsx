import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Sparkles, User, Bot, Users, Palette, Compass, HelpCircle, Shield, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { sound } from '../../utils/audio';

// --- TYPES & INTERFACES ---
type GameMode = 'vs_ai' | 'pass_play' | 'practice';
type AIDifficulty = 'easy' | 'medium' | 'hard';
type BallType = 'cue' | 'solid' | 'stripe' | 'eight';
type FeltTheme = 'emerald' | 'cyber_blue' | 'midnight' | 'ruby';
type Turn = 'player1' | 'player2' | 'ai';

interface Ball {
  id: number;
  number: number; // 0 for cue, 1-7 solids, 8 eight, 9-15 stripes
  type: BallType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isPotted: boolean;
  potProgress: number; // 0 to 1 for drop animation
  color: string;
  stripeColor?: string;
}

interface Pocket {
  x: number;
  y: number;
  radius: number;
}

interface TableBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

// Table Virtual Coordinate System
const V_WIDTH = 960;
const V_HEIGHT = 540;
const TABLE: TableBounds = {
  xMin: 85,
  xMax: 875,
  yMin: 75,
  yMax: 465,
};
const BALL_RADIUS = 11;
const POCKET_RADIUS = 24;

// 6 Pockets
const POCKETS: Pocket[] = [
  { x: TABLE.xMin + 4, y: TABLE.yMin + 4, radius: POCKET_RADIUS }, // Top-Left
  { x: (TABLE.xMin + TABLE.xMax) / 2, y: TABLE.yMin - 2, radius: POCKET_RADIUS - 2 }, // Top-Center
  { x: TABLE.xMax - 4, y: TABLE.yMin + 4, radius: POCKET_RADIUS }, // Top-Right
  { x: TABLE.xMin + 4, y: TABLE.yMax - 4, radius: POCKET_RADIUS }, // Bottom-Left
  { x: (TABLE.xMin + TABLE.xMax) / 2, y: TABLE.yMax + 2, radius: POCKET_RADIUS - 2 }, // Bottom-Center
  { x: TABLE.xMax - 4, y: TABLE.yMax - 4, radius: POCKET_RADIUS }, // Bottom-Right
];

// Color definitions for pool balls
const BALL_COLORS: Record<number, string> = {
  0: '#ffffff', // Cue ball
  1: '#facc15', // 1 Yellow
  2: '#2563eb', // 2 Blue
  3: '#dc2626', // 3 Red
  4: '#9333ea', // 4 Purple
  5: '#ea580c', // 5 Orange
  6: '#16a34a', // 6 Green
  7: '#881337', // 7 Maroon
  8: '#09090b', // 8 Black
  9: '#facc15', // 9 Yellow stripe
  10: '#2563eb', // 10 Blue stripe
  11: '#dc2626', // 11 Red stripe
  12: '#9333ea', // 12 Purple stripe
  13: '#ea580c', // 13 Orange stripe
  14: '#16a34a', // 14 Green stripe
  15: '#881337', // 15 Maroon stripe
};

// Themes
const THEMES: Record<FeltTheme, { name: string; feltColor: string; feltBorder: string; railColor: string; railRim: string; pocketGlow: string }> = {
  emerald: {
    name: 'Tournament Emerald',
    feltColor: '#065f46',
    feltBorder: '#047857',
    railColor: '#3f2e18',
    railRim: '#d97706',
    pocketGlow: 'rgba(52, 211, 153, 0.4)',
  },
  cyber_blue: {
    name: 'Cyber Neon Blue',
    feltColor: '#0f172a',
    feltBorder: '#0284c7',
    railColor: '#020617',
    railRim: '#38bdf8',
    pocketGlow: 'rgba(56, 189, 248, 0.6)',
  },
  midnight: {
    name: 'Midnight Velvet',
    feltColor: '#2e1065',
    feltBorder: '#6b21a8',
    railColor: '#170c2a',
    railRim: '#d946ef',
    pocketGlow: 'rgba(217, 70, 239, 0.5)',
  },
  ruby: {
    name: 'Ruby Masters',
    feltColor: '#7f1d1d',
    feltBorder: '#991b1b',
    railColor: '#2a1111',
    railRim: '#f87171',
    pocketGlow: 'rgba(248, 113, 113, 0.4)',
  },
};

export const Cyber8BallPool: React.FC = () => {
  // Game Setup States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('vs_ai');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [activeTheme, setActiveTheme] = useState<FeltTheme>('emerald');
  const [isMuted, setIsMuted] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Match Play States
  const [currentTurn, setCurrentTurn] = useState<Turn>('player1');
  const [player1Group, setPlayer1Group] = useState<'solids' | 'stripes' | null>(null);
  const [player2Group, setPlayer2Group] = useState<'solids' | 'stripes' | null>(null);
  const [tableOpen, setTableOpen] = useState(true);
  const [isBallInHand, setIsBallInHand] = useState(false);
  const [pottedThisTurn, setPottedThisTurn] = useState<number[]>([]);
  const [firstBallHit, setFirstBallHit] = useState<Ball | null>(null);
  const [cueBallScratched, setCueBallScratched] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  const [aimAngle, setAimAngle] = useState(0); // in radians
  const [power, setPower] = useState(40); // 0 to 100
  const [spinX, setSpinX] = useState(0); // -1 to 1 English
  const [spinY, setSpinY] = useState(0); // -1 to 1 Top/Back spin
  const [winner, setWinner] = useState<string | null>(null);
  const [winReason, setWinReason] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Break Shot! Drag to aim & power up.');

  // Canvas and Engine Refs for 60fps Zero-Lag Aim Tracking
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const aimAngleRef = useRef<number>(0);
  const powerRef = useRef<number>(40);
  const animFrameRef = useRef<number>(0);
  const isDraggingCueRef = useRef<boolean>(false);
  const isDraggingBallInHandRef = useRef<boolean>(false);
  const isBallsMovingRef = useRef<boolean>(false);
  const aiThinkingRef = useRef<boolean>(false);

  // Sound Synth Generator
  const playBallHitSound = useCallback((intensity = 1) => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450 + Math.random() * 200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(Math.min(0.8, 0.3 * intensity), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // fallback
    }
  }, [isMuted]);

  const playPocketSound = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // fallback
    }
  }, [isMuted]);

  const playCueStrikeSound = useCallback((pwr = 50) => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(Math.min(0.7, (pwr / 100) * 0.7), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // fallback
    }
  }, [isMuted]);

  // Setup Standard 15-Ball Triangle Rack
  const initBalls = useCallback(() => {
    const balls: Ball[] = [];

    // 1. Cue Ball
    balls.push({
      id: 0,
      number: 0,
      type: 'cue',
      x: TABLE.xMin + (TABLE.xMax - TABLE.xMin) * 0.25,
      y: (TABLE.yMin + TABLE.yMax) / 2,
      vx: 0,
      vy: 0,
      isPotted: false,
      potProgress: 0,
      color: BALL_COLORS[0],
    });

    // 2. Triangle Rack at Foot Spot
    const apexX = TABLE.xMin + (TABLE.xMax - TABLE.xMin) * 0.72;
    const apexY = (TABLE.yMin + TABLE.yMax) / 2;
    const spacing = BALL_RADIUS * 2 + 0.8;

    // Pattern of 15 balls (Solids: 1-7, Eight: 8, Stripes: 9-15)
    // Structured so 8 is in center (row 2, col 1) and corners are 1 solid & 1 stripe
    const rackLayout = [
      [1],
      [9, 2],
      [3, 8, 10],
      [11, 4, 12, 5],
      [6, 13, 7, 14, 15],
    ];

    let ballId = 1;
    for (let r = 0; r < rackLayout.length; r++) {
      const rowBalls = rackLayout[r];
      const startX = apexX + r * (spacing * Math.cos(Math.PI / 6));
      const startY = apexY - (r * spacing) / 2;

      for (let c = 0; c < rowBalls.length; c++) {
        const num = rowBalls[c];
        const type: BallType = num === 8 ? 'eight' : num <= 7 ? 'solid' : 'stripe';

        balls.push({
          id: ballId++,
          number: num,
          type,
          x: startX + (Math.random() - 0.5) * 0.4,
          y: startY + c * spacing + (Math.random() - 0.5) * 0.4,
          vx: 0,
          vy: 0,
          isPotted: false,
          potProgress: 0,
          color: BALL_COLORS[num],
          stripeColor: type === 'stripe' ? '#ffffff' : undefined,
        });
      }
    }

    ballsRef.current = balls;
  }, []);

  // Start New Match
  const startNewMatch = (mode: GameMode) => {
    sound.playClick();
    setGameMode(mode);
    setGameState('playing');
    setCurrentTurn('player1');
    setPlayer1Group(null);
    setPlayer2Group(null);
    setTableOpen(true);
    setIsBallInHand(false);
    setWinner(null);
    setWinReason('');
    setStatusMessage(mode === 'vs_ai' ? 'Your Break Shot! Aim & Fire.' : 'Player 1 Break Shot!');
    initBalls();
  };

  // Reset Cue Ball on Scratch / Ball-in-hand
  const resetCueBall = () => {
    const cueBall = ballsRef.current.find((b) => b.number === 0);
    if (cueBall) {
      cueBall.isPotted = false;
      cueBall.potProgress = 0;
      cueBall.vx = 0;
      cueBall.vy = 0;
      cueBall.x = TABLE.xMin + (TABLE.xMax - TABLE.xMin) * 0.25;
      cueBall.y = (TABLE.yMin + TABLE.yMax) / 2;
    }
    setIsBallInHand(true);
    setStatusMessage('FOUL! Cue ball in hand. Click or drag to position.');
  };

  // Execute Cue Strike Shot
  const executeShot = useCallback((shotAngle: number, shotPower: number, sX = 0, sY = 0) => {
    const cueBall = ballsRef.current.find((b) => b.number === 0);
    if (!cueBall || cueBall.isPotted || isBallsMovingRef.current) return;

    playCueStrikeSound(shotPower);
    setIsShooting(true);
    setIsBallInHand(false);
    setPottedThisTurn([]);
    setFirstBallHit(null);
    setCueBallScratched(false);

    // Calculate velocity impulse
    const impulse = (shotPower / 100) * 24 + 2;
    cueBall.vx = Math.cos(shotAngle) * impulse;
    cueBall.vy = Math.sin(shotAngle) * impulse;

    // Apply spin english offset
    if (sY !== 0) {
      cueBall.vx += Math.cos(shotAngle) * (sY * 2.5);
      cueBall.vy += Math.sin(shotAngle) * (sY * 2.5);
    }
  }, [playCueStrikeSound]);

  // AI Decision Engine
  const executeAITurn = useCallback(() => {
    if (aiThinkingRef.current || gameState !== 'playing') return;
    aiThinkingRef.current = true;
    setStatusMessage('AI Opponent is calculating the perfect pot angle...');

    setTimeout(() => {
      const cueBall = ballsRef.current.find((b) => b.number === 0);
      if (!cueBall || cueBall.isPotted) {
        aiThinkingRef.current = false;
        return;
      }

      // 1. Determine Target Balls for AI
      const aiGroup = currentTurn === 'ai' ? player2Group : null;
      let targetBalls: Ball[] = [];

      if (!aiGroup || tableOpen) {
        // Table Open: Target any solids or stripes (exclude 8-ball until end)
        targetBalls = ballsRef.current.filter((b) => !b.isPotted && b.number !== 0 && b.number !== 8);
      } else {
        targetBalls = ballsRef.current.filter(
          (b) => !b.isPotted && (aiGroup === 'solids' ? b.type === 'solid' : b.type === 'stripe')
        );
        // If all assigned balls potted, target 8-ball
        if (targetBalls.length === 0) {
          const eightBall = ballsRef.current.find((b) => b.number === 8 && !b.isPotted);
          if (eightBall) targetBalls = [eightBall];
        }
      }

      if (targetBalls.length === 0) {
        targetBalls = ballsRef.current.filter((b) => !b.isPotted && b.number !== 0);
      }

      // 2. Evaluate Best Pot Angle across 6 Pockets
      let bestShot: { angle: number; power: number; score: number } | null = null;

      for (const target of targetBalls) {
        for (const pocket of POCKETS) {
          // Vector: Target Ball -> Pocket
          const tpDx = pocket.x - target.x;
          const tpDy = pocket.y - target.y;
          const tpDist = Math.hypot(tpDx, tpDy);
          const tpAngle = Math.atan2(tpDy, tpDx);

          // Ghost Cue Ball Position (where cue ball must hit the target ball)
          const ghostX = target.x - Math.cos(tpAngle) * (BALL_RADIUS * 2);
          const ghostY = target.y - Math.sin(tpAngle) * (BALL_RADIUS * 2);

          // Vector: Cue Ball -> Ghost Position
          const cgDx = ghostX - cueBall.x;
          const cgDy = ghostY - cueBall.y;
          const cgDist = Math.hypot(cgDx, cgDy);
          const cgAngle = Math.atan2(cgDy, cgDx);

          // Alignment Cut Angle
          const cutAngle = Math.abs(cgAngle - tpAngle);
          if (cutAngle < Math.PI / 2.2) {
            // Check for clear line of sight
            const score = 1000 - (cgDist + tpDist * 1.5) - cutAngle * 400;
            if (!bestShot || score > bestShot.score) {
              const reqPower = Math.min(95, Math.max(30, (cgDist + tpDist) * 0.12));
              bestShot = { angle: cgAngle, power: reqPower, score };
            }
          }
        }
      }

      // Fallback if no clean pot
      if (!bestShot && targetBalls.length > 0) {
        const rndTarget = targetBalls[Math.floor(Math.random() * targetBalls.length)];
        const dx = rndTarget.x - cueBall.x;
        const dy = rndTarget.y - cueBall.y;
        bestShot = { angle: Math.atan2(dy, dx), power: 55, score: 0 };
      }

      if (bestShot) {
        // Add AI Difficulty Variance
        let error = 0;
        if (aiDifficulty === 'easy') error = (Math.random() - 0.5) * 0.14;
        else if (aiDifficulty === 'medium') error = (Math.random() - 0.5) * 0.05;
        else error = (Math.random() - 0.5) * 0.01;

        const finalAngle = bestShot.angle + error;
        setAimAngle(finalAngle);
        setPower(bestShot.power);

        setTimeout(() => {
          executeShot(finalAngle, bestShot?.power || 50, 0, 0);
          aiThinkingRef.current = false;
        }, 600);
      } else {
        aiThinkingRef.current = false;
      }
    }, 1000);
  }, [aiDifficulty, currentTurn, executeShot, gameState, player2Group, tableOpen]);

  // Turn Progression & Rule Verification after all balls stop moving
  const handleTurnResolution = useCallback(() => {
    setIsShooting(false);
    const balls = ballsRef.current;
    const cueBall = balls.find((b) => b.number === 0);

    // 1. Check 8-Ball status
    const eightBall = balls.find((b) => b.number === 8);
    if (eightBall?.isPotted) {
      // Determine if legal 8-ball pot
      const shooter = currentTurn;
      const shooterGroup = shooter === 'player1' ? player1Group : player2Group;

      let remainingAssigned = 0;
      if (shooterGroup) {
        remainingAssigned = balls.filter(
          (b) => !b.isPotted && (shooterGroup === 'solids' ? b.type === 'solid' : b.type === 'stripe')
        ).length;
      }

      if (cueBallScratched || remainingAssigned > 0 || tableOpen) {
        // Premature 8-ball pot or scratch on 8-ball = LOSS!
        const loser = shooter === 'player1' ? 'Player 1' : shooter === 'ai' ? 'AI Bot' : 'Player 2';
        const winName = shooter === 'player1' ? (gameMode === 'vs_ai' ? 'AI Bot' : 'Player 2') : 'Player 1';
        setWinner(winName);
        setWinReason(`${loser} potted the 8-Ball early / with a scratch!`);
        setGameState('gameover');
        return;
      } else {
        // Legitimate 8-Ball Win!
        const winName = shooter === 'player1' ? 'Player 1' : shooter === 'ai' ? 'AI Bot' : 'Player 2';
        setWinner(winName);
        setWinReason(`${winName} successfully cleared all balls and potted the 8-Ball!`);
        setGameState('gameover');
        sound.playPowerup();
        return;
      }
    }

    // 2. Check Cue Ball Scratch
    if (cueBallScratched || !cueBall || cueBall.isPotted) {
      resetCueBall();
      // Switch Turn on foul
      const next = currentTurn === 'player1' ? (gameMode === 'vs_ai' ? 'ai' : 'player2') : 'player1';
      setCurrentTurn(next);
      return;
    }

    // 3. Assign Solids vs Stripes on first legal pot
    if (tableOpen && pottedThisTurn.length > 0) {
      const firstPottedNum = pottedThisTurn.find((num) => num !== 0 && num !== 8);
      if (firstPottedNum !== undefined) {
        const isSolid = firstPottedNum <= 7;
        const p1Grp = currentTurn === 'player1' ? (isSolid ? 'solids' : 'stripes') : (isSolid ? 'stripes' : 'solids');
        const p2Grp = p1Grp === 'solids' ? 'stripes' : 'solids';

        setPlayer1Group(p1Grp);
        setPlayer2Group(p2Grp);
        setTableOpen(false);
        setStatusMessage(`Groups assigned! Player 1 is ${p1Grp.toUpperCase()}, ${gameMode === 'vs_ai' ? 'AI' : 'Player 2'} is ${p2Grp.toUpperCase()}`);
      }
    }

    // 4. Check if shooter potted their own ball to continue turn
    const shooterGrp = currentTurn === 'player1' ? player1Group : player2Group;
    let keepTurn = false;

    if (pottedThisTurn.length > 0) {
      if (!shooterGrp || tableOpen) {
        keepTurn = true;
      } else {
        const pottedOwn = pottedThisTurn.some((num) =>
          shooterGrp === 'solids' ? num >= 1 && num <= 7 : num >= 9 && num <= 15
        );
        if (pottedOwn) keepTurn = true;
      }
    }

    // 5. Turn Switch or Continue
    if (keepTurn) {
      setStatusMessage(`${currentTurn === 'player1' ? 'Player 1' : currentTurn === 'ai' ? 'AI Bot' : 'Player 2'} potted a ball! Continue shooting.`);
      if (currentTurn === 'ai') {
        setTimeout(executeAITurn, 800);
      }
    } else {
      const nextTurn = currentTurn === 'player1' ? (gameMode === 'vs_ai' ? 'ai' : 'player2') : 'player1';
      setCurrentTurn(nextTurn);
      setStatusMessage(`Turn switched to ${nextTurn === 'player1' ? 'Player 1' : nextTurn === 'ai' ? 'AI Bot' : 'Player 2'}.`);
      if (nextTurn === 'ai') {
        setTimeout(executeAITurn, 800);
      }
    }
  }, [cueBallScratched, currentTurn, executeAITurn, gameMode, player1Group, player2Group, pottedThisTurn, tableOpen]);

  // Main Physics Simulation Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let isRunning = true;

    const tick = () => {
      if (!isRunning) return;

      const balls = ballsRef.current;
      let moving = false;
      const subSteps = 6;
      const friction = Math.pow(0.985, 1 / subSteps);

      for (let step = 0; step < subSteps; step++) {
        // 1. Move Balls
        for (const b of balls) {
          if (b.isPotted) continue;

          b.x += b.vx / subSteps;
          b.y += b.vy / subSteps;
          b.vx *= friction;
          b.vy *= friction;

          if (Math.hypot(b.vx, b.vy) > 0.05) {
            moving = true;
          } else {
            b.vx = 0;
            b.vy = 0;
          }

          // 2. Pocket Hole Detection
          for (const p of POCKETS) {
            const dist = Math.hypot(b.x - p.x, b.y - p.y);
            if (dist < p.radius) {
              // Pocket entry gravity pull
              b.vx += (p.x - b.x) * 0.15;
              b.vy += (p.y - b.y) * 0.15;

              if (dist < p.radius * 0.7) {
                b.isPotted = true;
                b.vx = 0;
                b.vy = 0;
                playPocketSound();

                if (b.number === 0) {
                  setCueBallScratched(true);
                } else {
                  setPottedThisTurn((prev) => [...prev, b.number]);
                }
              }
            }
          }

          // 3. Cushion Collision
          const r = BALL_RADIUS;
          const bounce = 0.88;

          // Left rail
          if (b.x - r < TABLE.xMin && b.y > TABLE.yMin + 20 && b.y < TABLE.yMax - 20) {
            b.x = TABLE.xMin + r;
            b.vx = -b.vx * bounce;
            playBallHitSound(0.5);
          }
          // Right rail
          if (b.x + r > TABLE.xMax && b.y > TABLE.yMin + 20 && b.y < TABLE.yMax - 20) {
            b.x = TABLE.xMax - r;
            b.vx = -b.vx * bounce;
            playBallHitSound(0.5);
          }
          // Top rail (avoid middle pocket)
          if (b.y - r < TABLE.yMin && ((b.x > TABLE.xMin + 20 && b.x < V_WIDTH / 2 - 20) || (b.x > V_WIDTH / 2 + 20 && b.x < TABLE.xMax - 20))) {
            b.y = TABLE.yMin + r;
            b.vy = -b.vy * bounce;
            playBallHitSound(0.5);
          }
          // Bottom rail (avoid middle pocket)
          if (b.y + r > TABLE.yMax && ((b.x > TABLE.xMin + 20 && b.x < V_WIDTH / 2 - 20) || (b.x > V_WIDTH / 2 + 20 && b.x < TABLE.xMax - 20))) {
            b.y = TABLE.yMax - r;
            b.vy = -b.vy * bounce;
            playBallHitSound(0.5);
          }
        }

        // 4. Ball-to-Ball Elastic Collisions
        for (let i = 0; i < balls.length; i++) {
          const b1 = balls[i];
          if (b1.isPotted) continue;

          for (let j = i + 1; j < balls.length; j++) {
            const b2 = balls[j];
            if (b2.isPotted) continue;

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = BALL_RADIUS * 2;

            if (dist < minDist && dist > 0) {
              // Positional separation
              const overlap = (minDist - dist) / 2;
              const nx = dx / dist;
              const ny = dy / dist;

              b1.x -= nx * overlap;
              b1.y -= ny * overlap;
              b2.x += nx * overlap;
              b2.y += ny * overlap;

              // Elastic momentum transfer
              const kx = b1.vx - b2.vx;
              const ky = b1.vy - b2.vy;
              const p = 2 * (nx * kx + ny * ky) / 2;

              b1.vx -= p * nx * 0.98;
              b1.vy -= p * ny * 0.98;
              b2.vx += p * nx * 0.98;
              b2.vy += p * ny * 0.98;

              const impactSpeed = Math.hypot(kx, ky);
              if (impactSpeed > 0.4) {
                playBallHitSound(impactSpeed);
              }

              // Register first ball hit by cue ball
              if ((b1.number === 0 || b2.number === 0) && !firstBallHit) {
                setFirstBallHit(b1.number === 0 ? b2 : b1);
              }
            }
          }
        }
      }

      // Check if all balls stopped moving
      if (isBallsMovingRef.current && !moving) {
        isBallsMovingRef.current = false;
        handleTurnResolution();
      } else if (!isBallsMovingRef.current && moving) {
        isBallsMovingRef.current = true;
      }

      // Render Table & Balls
      renderTable();

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [firstBallHit, gameState, handleTurnResolution, playBallHitSound, playPocketSound]);

  // Master Render Function for Pool Canvas
  const renderTable = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = THEMES[activeTheme];

    // Clear Canvas
    ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

    // 1. OUTER WOODEN / CARBON FIBER TABLE FRAME
    ctx.fillStyle = theme.railColor;
    ctx.beginPath();
    ctx.roundRect(15, 15, V_WIDTH - 30, V_HEIGHT - 30, 28);
    ctx.fill();

    // Metallic Outer Rim
    ctx.strokeStyle = theme.railRim;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Sights / Diamonds along rails
    ctx.fillStyle = theme.railRim;
    for (let i = 1; i <= 3; i++) {
      // Top & Bottom Diamonds
      ctx.beginPath();
      ctx.arc(TABLE.xMin + (TABLE.xMax - TABLE.xMin) * (i / 4), 45, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(TABLE.xMin + (TABLE.xMax - TABLE.xMin) * (i / 4), V_HEIGHT - 45, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. INNER FELT PLAYING SURFACE
    ctx.fillStyle = theme.feltColor;
    ctx.fillRect(TABLE.xMin, TABLE.yMin, TABLE.xMax - TABLE.xMin, TABLE.yMax - TABLE.yMin);

    // Cushions with Chamfered Edges
    ctx.fillStyle = theme.feltBorder;
    // Top Cushions
    ctx.fillRect(TABLE.xMin + 15, TABLE.yMin - 10, (TABLE.xMax - TABLE.xMin) / 2 - 25, 10);
    ctx.fillRect(TABLE.xMin + (TABLE.xMax - TABLE.xMin) / 2 + 10, TABLE.yMin - 10, (TABLE.xMax - TABLE.xMin) / 2 - 25, 10);
    // Bottom Cushions
    ctx.fillRect(TABLE.xMin + 15, TABLE.yMax, (TABLE.xMax - TABLE.xMin) / 2 - 25, 10);
    ctx.fillRect(TABLE.xMin + (TABLE.xMax - TABLE.xMin) / 2 + 10, TABLE.yMax, (TABLE.xMax - TABLE.xMin) / 2 - 25, 10);
    // Left & Right Cushions
    ctx.fillRect(TABLE.xMin - 10, TABLE.yMin + 15, 10, TABLE.yMax - TABLE.yMin - 30);
    ctx.fillRect(TABLE.xMax, TABLE.yMin + 15, 10, TABLE.yMax - TABLE.yMin - 30);

    // Headstring / Baulk Line & Foot Spot
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const headX = TABLE.xMin + (TABLE.xMax - TABLE.xMin) * 0.25;
    ctx.moveTo(headX, TABLE.yMin);
    ctx.lineTo(headX, TABLE.yMax);
    ctx.stroke();
    ctx.setLineDash([]);

    // Foot Spot Marker
    const footX = TABLE.xMin + (TABLE.xMax - TABLE.xMin) * 0.72;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(footX, (TABLE.yMin + TABLE.yMax) / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // 3. POCKETS (6 Black holes with metallic drop rings)
    for (const p of POCKETS) {
      // Glow Aura
      const pGlow = ctx.createRadialGradient(p.x, p.y, p.radius * 0.5, p.x, p.y, p.radius * 1.4);
      pGlow.addColorStop(0, '#000000');
      pGlow.addColorStop(0.7, '#09090b');
      pGlow.addColorStop(1, theme.pocketGlow);
      ctx.fillStyle = pGlow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Rim
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 4. RENDER BALLS
    const balls = ballsRef.current;
    for (const b of balls) {
      if (b.isPotted) continue;

      // Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(b.x + 3, b.y + 3, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Main Ball Base
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Stripe Pattern
      if (b.type === 'stripe') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_RADIUS, -Math.PI / 3, Math.PI / 3);
        ctx.arc(b.x, b.y, BALL_RADIUS, (2 * Math.PI) / 3, (4 * Math.PI) / 3);
        ctx.fill();

        // Inner solid stripe band
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_RADIUS * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ball Number Plate (White Circle + Number)
      if (b.number > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_RADIUS * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#09090b';
        ctx.font = 'bold 7px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${b.number}`, b.x, b.y + 0.5);
      }

      // Gloss / 3D Specular Highlight
      const gloss = ctx.createRadialGradient(
        b.x - BALL_RADIUS * 0.35,
        b.y - BALL_RADIUS * 0.35,
        1,
        b.x,
        b.y,
        BALL_RADIUS
      );
      gloss.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
      gloss.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
      gloss.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
      ctx.fillStyle = gloss;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. AIMING RAYCAST GUIDELINES & CUE STICK
    const cueBall = balls.find((b) => b.number === 0);
    if (cueBall && !cueBall.isPotted && !isBallsMovingRef.current && gameState === 'playing' && currentTurn !== 'ai') {
      const currentAim = aimAngleRef.current;
      const currentPwr = powerRef.current;

      // Trace Aim Line to find closest ball collision or cushion
      let closestDist = 1200;
      let targetBallHit: Ball | null = null;

      for (const b of balls) {
        if (b.number === 0 || b.isPotted) continue;

        // Line to circle intersection
        const dx = b.x - cueBall.x;
        const dy = b.y - cueBall.y;
        const dist = Math.hypot(dx, dy);
        const rayAngle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(rayAngle - currentAim);

        if (angleDiff < Math.PI / 2 || angleDiff > (Math.PI * 3) / 2) {
          const cross = Math.abs(dx * Math.sin(currentAim) - dy * Math.cos(currentAim));
          if (cross < BALL_RADIUS * 2) {
            const along = dx * Math.cos(currentAim) + dy * Math.sin(currentAim);
            if (along > 0 && along < closestDist) {
              closestDist = along;
              targetBallHit = b;
            }
          }
        }
      }

      // End point of aim ray
      const aimLength = Math.min(closestDist, 650);
      const ghostX = cueBall.x + Math.cos(currentAim) * aimLength;
      const ghostY = cueBall.y + Math.sin(currentAim) * aimLength;

      // Draw Laser Aim Guide Line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(cueBall.x, cueBall.y);
      ctx.lineTo(ghostX, ghostY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ghost Cue Ball at collision spot
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ghostX, ghostY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      // Target Ball Deflection Path
      if (targetBallHit) {
        const defAngle = Math.atan2(targetBallHit.y - ghostY, targetBallHit.x - ghostX);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(targetBallHit.x, targetBallHit.y);
        ctx.lineTo(targetBallHit.x + Math.cos(defAngle) * 90, targetBallHit.y + Math.sin(defAngle) * 90);
        ctx.stroke();

        // Arrow head on target ball path
        const arrX = targetBallHit.x + Math.cos(defAngle) * 90;
        const arrY = targetBallHit.y + Math.sin(defAngle) * 90;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(arrX, arrY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. RENDER CUE STICK
      ctx.save();
      const pullOffset = (currentPwr / 100) * 35 + 18;
      const cueStartX = cueBall.x - Math.cos(currentAim) * pullOffset;
      const cueStartY = cueBall.y - Math.sin(currentAim) * pullOffset;
      const cueLength = 260;

      ctx.translate(cueStartX, cueStartY);
      ctx.rotate(currentAim);

      // Cue Stick Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(-cueLength, 6, cueLength, 6);

      // Cue Stick Body (Tapered Maple Wood / Carbon)
      const cueGrad = ctx.createLinearGradient(-cueLength, 0, 0, 0);
      cueGrad.addColorStop(0, '#1e293b');
      cueGrad.addColorStop(0.35, '#78350f');
      cueGrad.addColorStop(0.85, '#d97706');
      cueGrad.addColorStop(1, '#fef3c7');

      ctx.fillStyle = cueGrad;
      ctx.beginPath();
      ctx.moveTo(0, -2.5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-cueLength, 5);
      ctx.lineTo(-cueLength, -5);
      ctx.closePath();
      ctx.fill();

      // Cue Tip (Blue Chalk & Ferrule)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -2.8, 5, 5.6);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, -2.5, 3, 5);

      ctx.restore();
    }
  };

  // Micro-adjustment for fine-tuning angle
  const adjustAimAngle = (deltaRadians: number) => {
    sound.playClick();
    const nextAngle = aimAngleRef.current + deltaRadians;
    aimAngleRef.current = nextAngle;
    setAimAngle(nextAngle);
  };

  // Keyboard Shortcuts for Aiming, Power, and Shooting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing' || isBallsMovingRef.current || currentTurn === 'ai') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Rotate angle left / right
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        const nextAngle = aimAngleRef.current - 0.018;
        aimAngleRef.current = nextAngle;
        setAimAngle(nextAngle);
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        const nextAngle = aimAngleRef.current + 0.018;
        aimAngleRef.current = nextAngle;
        setAimAngle(nextAngle);
      }
      // Adjust Shot Power
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setPower((prev) => {
          const next = Math.min(100, prev + 5);
          powerRef.current = next;
          return next;
        });
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setPower((prev) => {
          const next = Math.max(10, prev - 5);
          powerRef.current = next;
          return next;
        });
      }
      // Shoot with Space / Enter
      if (e.key === ' ' || e.key === 'Enter') {
        executeShot(aimAngleRef.current, powerRef.current, spinX, spinY);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTurn, executeShot, gameState, spinX, spinY]);

  // Pointer & Touch Interaction Handlers (Angle is LOCKED and only moves when actively holding down drag!)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || isBallsMovingRef.current || currentTurn === 'ai') return;
    
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Ball-in-hand placement
    if (isBallInHand) {
      const cueBall = ballsRef.current.find((b) => b.number === 0);
      if (cueBall) {
        cueBall.x = Math.max(TABLE.xMin + BALL_RADIUS + 5, Math.min(TABLE.xMax - BALL_RADIUS - 5, clickX));
        cueBall.y = Math.max(TABLE.yMin + BALL_RADIUS + 5, Math.min(TABLE.yMax - BALL_RADIUS - 5, clickY));
        isDraggingBallInHandRef.current = true;
      }
      return;
    }

    const cueBall = ballsRef.current.find((b) => b.number === 0);
    if (!cueBall) return;

    // 1. Direct Ball Tap (Auto-lock onto tapped target ball)
    const tappedBall = ballsRef.current.find(
      (b) => !b.isPotted && b.number !== 0 && Math.hypot(b.x - clickX, b.y - clickY) < BALL_RADIUS * 2.5
    );

    if (tappedBall) {
      const targetAngle = Math.atan2(tappedBall.y - cueBall.y, tappedBall.x - cueBall.x);
      aimAngleRef.current = targetAngle;
      setAimAngle(targetAngle);
      isDraggingCueRef.current = true;
      return;
    }

    // 2. Set aim angle and activate dragging
    isDraggingCueRef.current = true;
    const angle = Math.atan2(clickY - cueBall.y, clickX - cueBall.x);
    aimAngleRef.current = angle;
    setAimAngle(angle);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || isBallsMovingRef.current || currentTurn === 'ai') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;
    const moveX = (e.clientX - rect.left) * scaleX;
    const moveY = (e.clientY - rect.top) * scaleY;

    if (isDraggingBallInHandRef.current) {
      const cueBall = ballsRef.current.find((b) => b.number === 0);
      if (cueBall) {
        cueBall.x = Math.max(TABLE.xMin + BALL_RADIUS + 5, Math.min(TABLE.xMax - BALL_RADIUS - 5, moveX));
        cueBall.y = Math.max(TABLE.yMin + BALL_RADIUS + 5, Math.min(TABLE.yMax - BALL_RADIUS - 5, moveY));
      }
    } else if (isDraggingCueRef.current) {
      // ONLY update angle while actively holding and dragging mouse/touch!
      const cueBall = ballsRef.current.find((b) => b.number === 0);
      if (cueBall) {
        const angle = Math.atan2(moveY - cueBall.y, moveX - cueBall.x);
        aimAngleRef.current = angle;
        setAimAngle(angle);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    // Release drag -> Angle remains 100% LOCKED!
    isDraggingCueRef.current = false;
    isDraggingBallInHandRef.current = false;
  };

  // Dedicated Mobile Touch Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isBallsMovingRef.current || currentTurn === 'ai' || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;
    const touchX = (touch.clientX - rect.left) * scaleX;
    const touchY = (touch.clientY - rect.top) * scaleY;

    if (isBallInHand) {
      const cueBall = ballsRef.current.find((b) => b.number === 0);
      if (cueBall) {
        cueBall.x = Math.max(TABLE.xMin + BALL_RADIUS + 5, Math.min(TABLE.xMax - BALL_RADIUS - 5, touchX));
        cueBall.y = Math.max(TABLE.yMin + BALL_RADIUS + 5, Math.min(TABLE.yMax - BALL_RADIUS - 5, touchY));
        isDraggingBallInHandRef.current = true;
      }
      return;
    }

    const cueBall = ballsRef.current.find((b) => b.number === 0);
    if (!cueBall) return;

    const tappedBall = ballsRef.current.find(
      (b) => !b.isPotted && b.number !== 0 && Math.hypot(b.x - touchX, b.y - touchY) < BALL_RADIUS * 2.5
    );

    if (tappedBall) {
      const angle = Math.atan2(tappedBall.y - cueBall.y, tappedBall.x - cueBall.x);
      aimAngleRef.current = angle;
      setAimAngle(angle);
      isDraggingCueRef.current = true;
      return;
    }

    isDraggingCueRef.current = true;
    const angle = Math.atan2(touchY - cueBall.y, touchX - cueBall.x);
    aimAngleRef.current = angle;
    setAimAngle(angle);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isBallsMovingRef.current || currentTurn === 'ai' || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;
    const touchX = (touch.clientX - rect.left) * scaleX;
    const touchY = (touch.clientY - rect.top) * scaleY;

    if (isDraggingBallInHandRef.current) {
      const cueBall = ballsRef.current.find((b) => b.number === 0);
      if (cueBall) {
        cueBall.x = Math.max(TABLE.xMin + BALL_RADIUS + 5, Math.min(TABLE.xMax - BALL_RADIUS - 5, touchX));
        cueBall.y = Math.max(TABLE.yMin + BALL_RADIUS + 5, Math.min(TABLE.yMax - BALL_RADIUS - 5, touchY));
      }
    } else if (isDraggingCueRef.current) {
      const cueBall = ballsRef.current.find((b) => b.number === 0);
      if (cueBall) {
        const angle = Math.atan2(touchY - cueBall.y, touchX - cueBall.x);
        aimAngleRef.current = angle;
        setAimAngle(angle);
      }
    }
  };

  const handleTouchEnd = () => {
    isDraggingCueRef.current = false;
    isDraggingBallInHandRef.current = false;
  };

  // Convert aim angle in radians to degrees for clear readout
  const angleDegrees = Math.round((((aimAngle * 180) / Math.PI) % 360 + 360) % 360);

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center select-none font-sans">
      {/* 1. TOP SCOREBOARD & TURN BANNER */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-t-3xl px-3 sm:px-6 py-2.5 sm:py-3 shadow-xl">
        {/* Player 1 Profile & Remaining Balls */}
        <div className={`flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-2xl border transition-all ${
          currentTurn === 'player1' ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-500/20' : 'border-transparent opacity-80'
        }`}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] sm:text-xs font-extrabold text-white">P1</span>
              {currentTurn === 'player1' && (
                <span className="px-1.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[8px] sm:text-[9px] animate-pulse">
                  TURN
                </span>
              )}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-cyan-300">
              {player1Group ? player1Group.toUpperCase() : 'OPEN'}
            </div>
          </div>
        </div>

        {/* Center Game State Banner */}
        <div className="flex flex-col items-center max-w-[180px] sm:max-w-xs text-center">
          <div className="text-[10px] sm:text-xs font-black tracking-wider text-slate-300 uppercase">
            8-BALL BILLIARDS PRO
          </div>
          <div className="text-[10px] sm:text-[11px] font-medium text-amber-400 truncate">
            {statusMessage}
          </div>
        </div>

        {/* Player 2 / AI Profile & Remaining Balls */}
        <div className={`flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-2xl border transition-all ${
          currentTurn !== 'player1' ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-500/20' : 'border-transparent opacity-80'
        }`}>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1">
              {currentTurn !== 'player1' && (
                <span className="px-1.5 py-0.5 rounded-full bg-purple-500 text-white font-black text-[8px] sm:text-[9px] animate-pulse">
                  TURN
                </span>
              )}
              <span className="text-[11px] sm:text-xs font-extrabold text-white">
                {gameMode === 'vs_ai' ? 'BOT' : 'P2'}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-purple-300">
              {player2Group ? player2Group.toUpperCase() : 'OPEN'}
            </div>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-md">
            {gameMode === 'vs_ai' ? <Bot className="w-4 h-4 sm:w-5 sm:h-5" /> : <Users className="w-4 h-4 sm:w-5 sm:h-5" />}
          </div>
        </div>
      </div>

      {/* 2. MAIN POOL TABLE ARENA */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-slate-950 border-x border-slate-800 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="w-full h-full object-cover cursor-crosshair touch-none"
        />

        {/* Visual Aim Hint Badge with Angle Readout */}
        {gameState === 'playing' && currentTurn !== 'ai' && (
          <div className="absolute bottom-2 inset-x-0 flex items-center justify-center pointer-events-none z-10 px-2">
            <div className="px-3.5 py-1 rounded-full bg-slate-950/85 border border-cyan-500/50 text-cyan-300 text-[10px] sm:text-xs font-extrabold backdrop-blur-md shadow-lg flex items-center gap-2">
              <span>🎯 Tap / Drag Table to Aim</span>
              <span>•</span>
              <span className="text-amber-300 font-mono">Angle: {angleDegrees}°</span>
              <span>•</span>
              <span className="text-emerald-400">Locked ✓</span>
            </div>
          </div>
        )}

        {/* START MENU OVERLAY */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center z-30 animate-fade-in space-y-4 sm:space-y-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 border border-emerald-300/40 animate-bounce">
              <span className="text-3xl sm:text-4xl font-black text-white">🎱</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-5xl font-black tracking-tight text-white">
                CYBER 8-BALL <span className="text-emerald-400">POOL</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mt-1">
                Authentic tournament billiards physics, locked cue aim, micro-angle tuning & power gauge!
              </p>
            </div>

            {/* Game Mode Select */}
            <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 pt-2">
              <button
                onClick={() => startNewMatch('vs_ai')}
                className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                VS SMART AI BOT
              </button>

              <button
                onClick={() => startNewMatch('pass_play')}
                className="px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs sm:text-sm hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                PASS & PLAY (2P)
              </button>
            </div>

            {/* Difficulty Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">AI Level:</span>
              {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setAiDifficulty(lvl)}
                  className={`px-2.5 sm:px-3 py-1 rounded-xl text-[10px] sm:text-xs font-extrabold uppercase transition ${
                    aiDifficulty === lvl
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GAME OVER MODAL */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center z-40 animate-fade-in space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-2xl shadow-yellow-500/40 animate-bounce">
              <Trophy className="w-8 h-8 text-slate-950" />
            </div>

            <div>
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                {winner?.toUpperCase()} WINS!
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1">
                {winReason}
              </p>
            </div>

            <button
              onClick={() => startNewMatch(gameMode)}
              className="px-6 sm:px-8 py-3 sm:py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>

      {/* 3. BOTTOM PROFESSIONAL SHOT & FINE-AIM TOOLBAR */}
      <div className="w-full bg-slate-900/95 border border-slate-800 rounded-b-3xl p-2.5 sm:p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-4 shadow-xl">
        {/* Left: Micro Fine-Tune Angle Buttons (No angle slipping!) */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => adjustAimAngle(-0.015)}
            disabled={isBallsMovingRef.current || currentTurn === 'ai' || gameState !== 'playing'}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 hover:text-white text-xs font-black transition active:scale-95 disabled:opacity-40"
            title="Fine Tune Left (-0.5°)"
          >
            ◀ -0.5°
          </button>

          <div className="px-2 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none">AIM</span>
            <span className="text-xs font-black text-amber-300 font-mono">{angleDegrees}°</span>
          </div>

          <button
            onClick={() => adjustAimAngle(0.015)}
            disabled={isBallsMovingRef.current || currentTurn === 'ai' || gameState !== 'playing'}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 hover:text-white text-xs font-black transition active:scale-95 disabled:opacity-40"
            title="Fine Tune Right (+0.5°)"
          >
            +0.5° ▶
          </button>
        </div>

        {/* Center: Power Meter Slider & Shoot Button */}
        <div className="flex-1 min-w-[200px] flex items-center gap-2.5 sm:gap-3">
          <div className="flex-1 flex flex-col gap-0.5 sm:gap-1">
            <div className="flex justify-between text-[9px] sm:text-xs font-extrabold text-slate-400 uppercase">
              <span>Shot Power</span>
              <span className="text-cyan-400 font-black">{power}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={power}
              onChange={(e) => {
                const val = Number(e.target.value);
                powerRef.current = val;
                setPower(val);
              }}
              disabled={isBallsMovingRef.current || currentTurn === 'ai'}
              className="w-full accent-emerald-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <button
            onClick={() => executeShot(aimAngleRef.current, powerRef.current, spinX, spinY)}
            disabled={isBallsMovingRef.current || currentTurn === 'ai' || gameState !== 'playing'}
            className={`px-4 sm:px-6 h-10 sm:h-11 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-xl transition-all shrink-0 ${
              isBallsMovingRef.current || currentTurn === 'ai' || gameState !== 'playing'
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-600 text-slate-950 hover:scale-105 active:scale-95 shadow-emerald-500/30 cursor-pointer'
            }`}
          >
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
            SHOOT
          </button>
        </div>

        {/* Right: Customization & Sound Options */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowThemeModal(true)}
            className="p-2 sm:p-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 transition"
            title="Select Felt Theme"
          >
            <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 sm:p-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 transition"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* THEME PICKER MODAL */}
      {showThemeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-400" />
                SELECT TABLE THEME
              </h3>
              <button
                onClick={() => setShowThemeModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(THEMES) as FeltTheme[]).map((thKey) => {
                const th = THEMES[thKey];
                const isSel = activeTheme === thKey;
                return (
                  <button
                    key={thKey}
                    onClick={() => {
                      setActiveTheme(thKey);
                      setShowThemeModal(false);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-2 text-left transition ${
                      isSel ? 'border-emerald-400 bg-slate-800' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-full h-12 rounded-xl border border-white/20 shadow-inner"
                      style={{ backgroundColor: th.feltColor }}
                    />
                    <span className="text-xs font-bold text-white">{th.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
