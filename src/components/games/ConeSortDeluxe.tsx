import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Pause,
  Play,
  RotateCcw,
  Undo2,
  Lightbulb,
  PlusCircle,
  Trophy,
  Volume2,
  VolumeX,
  Sparkles,
  Grid,
  Check,
  ChevronRight,
  HelpCircle,
  Star,
  Flame,
  Zap
} from 'lucide-react';
import { sound } from '../../utils/audio';

// ----------------------------------------------------
// VIBRANT GLOSSY COLOR DEFINITIONS
// ----------------------------------------------------
export interface BallColorDef {
  id: string;
  name: string;
  primary: string;
  glow: string;
  gradient: string;
  shadow: string;
  pitch: number;
}

export const BALL_COLORS: BallColorDef[] = [
  {
    id: 'lime',
    name: 'Neon Lime',
    primary: '#4ade80',
    glow: '#86efac',
    gradient: 'radial-gradient(circle at 35% 35%, #bbf7d0 0%, #4ade80 40%, #16a34a 80%, #14532d 100%)',
    shadow: 'rgba(74, 222, 128, 0.6)',
    pitch: 1.0,
  },
  {
    id: 'purple',
    name: 'Vibrant Purple',
    primary: '#c084fc',
    glow: '#e9d5ff',
    gradient: 'radial-gradient(circle at 35% 35%, #f3e8ff 0%, #c084fc 40%, #9333ea 80%, #581c87 100%)',
    shadow: 'rgba(192, 132, 252, 0.6)',
    pitch: 1.15,
  },
  {
    id: 'cyan',
    name: 'Aqua Cyan',
    primary: '#22d3ee',
    glow: '#a5f3fc',
    gradient: 'radial-gradient(circle at 35% 35%, #cffafe 0%, #22d3ee 40%, #0891b2 80%, #164e63 100%)',
    shadow: 'rgba(34, 211, 238, 0.6)',
    pitch: 1.25,
  },
  {
    id: 'amber',
    name: 'Golden Amber',
    primary: '#fbbf24',
    glow: '#fef08a',
    gradient: 'radial-gradient(circle at 35% 35%, #fef9c3 0%, #fbbf24 40%, #d97706 80%, #78350f 100%)',
    shadow: 'rgba(251, 191, 36, 0.6)',
    pitch: 1.35,
  },
  {
    id: 'ruby',
    name: 'Ruby Crimson',
    primary: '#f43f5e',
    glow: '#fecdd3',
    gradient: 'radial-gradient(circle at 35% 35%, #ffe4e6 0%, #f43f5e 40%, #e11d48 80%, #881337 100%)',
    shadow: 'rgba(244, 63, 94, 0.6)',
    pitch: 1.5,
  },
  {
    id: 'sapphire',
    name: 'Royal Blue',
    primary: '#38bdf8',
    glow: '#bae6fd',
    gradient: 'radial-gradient(circle at 35% 35%, #e0f2fe 0%, #38bdf8 40%, #2563eb 80%, #1e3a8a 100%)',
    shadow: 'rgba(56, 189, 248, 0.6)',
    pitch: 1.65,
  },
  {
    id: 'orange',
    name: 'Tangerine Orange',
    primary: '#fb923c',
    glow: '#ffedd5',
    gradient: 'radial-gradient(circle at 35% 35%, #ffedd5 0%, #fb923c 40%, #ea580c 80%, #7c2d12 100%)',
    shadow: 'rgba(251, 146, 60, 0.6)',
    pitch: 1.8,
  },
  {
    id: 'pink',
    name: 'Hot Pink',
    primary: '#f472b6',
    glow: '#fbcfe8',
    gradient: 'radial-gradient(circle at 35% 35%, #fdf2f8 0%, #f472b6 40%, #db2777 80%, #831843 100%)',
    shadow: 'rgba(244, 114, 182, 0.6)',
    pitch: 2.0,
  },
];

export interface BallItem {
  id: string;
  colorId: string;
}

export interface TubeState {
  id: number;
  balls: BallItem[];
  capacity: number;
  isCompleted?: boolean;
}

interface MoveStep {
  fromIndex: number;
  toIndex: number;
  ball: BallItem;
}

export const ConeSortDeluxe: React.FC = () => {
  // Game Configuration & Active State
  const [level, setLevel] = useState<number>(2);
  const [tubes, setTubes] = useState<TubeState[]>([]);
  const [selectedTubeIndex, setSelectedTubeIndex] = useState<number | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveStep[]>([]);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [extraTubesUsed, setExtraTubesUsed] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showLevelSelect, setShowLevelSelect] = useState<boolean>(false);
  const [hintMove, setHintMove] = useState<{ from: number; to: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Stars and records
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Load saved progress
  useEffect(() => {
    try {
      const savedLvl = localStorage.getItem('ballsort_current_level');
      if (savedLvl) setLevel(Math.max(1, parseInt(savedLvl, 10)));

      const savedStars = localStorage.getItem('ballsort_level_stars');
      if (savedStars) setLevelStars(JSON.parse(savedStars));
    } catch {
      // ignore
    }
  }, []);

  const saveProgress = (lvl: number, stars: number) => {
    try {
      localStorage.setItem('ballsort_current_level', String(lvl));
      const updatedStars = { ...levelStars, [lvl]: Math.max(levelStars[lvl] || 0, stars) };
      setLevelStars(updatedStars);
      localStorage.setItem('ballsort_level_stars', JSON.stringify(updatedStars));
    } catch {
      // ignore
    }
  };

  // Generate Stage configuration matching the level
  const generateLevel = useCallback((lvl: number) => {
    // Determine capacity and tubes based on level
    let colorCount = 2;
    let emptyTubes = 1;
    let tubeCapacity = 3;

    if (lvl === 1) {
      colorCount = 2;
      emptyTubes = 1;
      tubeCapacity = 3;
    } else if (lvl === 2) {
      // Level 2 EXACT layout as seen in screenshot:
      // 3 tubes (capacity 3 balls each, 2 filled with mix of lime and purple, 1 with 2 balls or 3)
      colorCount = 2;
      emptyTubes = 1;
      tubeCapacity = 3;
    } else if (lvl <= 5) {
      colorCount = 3;
      emptyTubes = 2;
      tubeCapacity = 4;
    } else if (lvl <= 12) {
      colorCount = 4;
      emptyTubes = 2;
      tubeCapacity = 4;
    } else if (lvl <= 20) {
      colorCount = 5;
      emptyTubes = 2;
      tubeCapacity = 4;
    } else if (lvl <= 35) {
      colorCount = 6;
      emptyTubes = 2;
      tubeCapacity = 4;
    } else {
      colorCount = 7;
      emptyTubes = 2;
      tubeCapacity = 4;
    }

    if (lvl === 2) {
      // Setup the exact Level 2 puzzle from the user screenshot!
      // Tube 1: [Purple (bottom), Purple (middle), Lime (top)]
      // Tube 2: [Lime (bottom), Lime (middle), Purple (top)]
      // Tube 3: [Lime (bottom), Purple (middle)] - or empty/partially filled
      const newTubes: TubeState[] = [
        {
          id: 0,
          balls: [
            { id: 'b_2_0_0', colorId: 'purple' },
            { id: 'b_2_0_1', colorId: 'purple' },
            { id: 'b_2_0_2', colorId: 'lime' },
          ],
          capacity: 3,
          isCompleted: false,
        },
        {
          id: 1,
          balls: [
            { id: 'b_2_1_0', colorId: 'lime' },
            { id: 'b_2_1_1', colorId: 'lime' },
            { id: 'b_2_1_2', colorId: 'purple' },
          ],
          capacity: 3,
          isCompleted: false,
        },
        {
          id: 2,
          balls: [
            { id: 'b_2_2_0', colorId: 'lime' },
            { id: 'b_2_2_1', colorId: 'purple' },
          ],
          capacity: 3,
          isCompleted: false,
        },
      ];

      setTubes(newTubes);
      setSelectedTubeIndex(null);
      setMoveHistory([]);
      setMoveCount(0);
      setIsWon(false);
      setHintMove(null);
      setExtraTubesUsed(0);
      return;
    }

    // Procedurally generate standard levels
    const activeColors = BALL_COLORS.slice(0, colorCount);
    let ballPool: string[] = [];
    activeColors.forEach((col) => {
      for (let i = 0; i < tubeCapacity; i++) {
        ballPool.push(col.id);
      }
    });

    // Fisher-Yates Shuffle
    for (let i = ballPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ballPool[i], ballPool[j]] = [ballPool[j], ballPool[i]];
    }

    // Ensure it's not already solved
    let isAlreadySolved = true;
    for (let c = 0; c < colorCount; c++) {
      const slice = ballPool.slice(c * tubeCapacity, (c + 1) * tubeCapacity);
      if (!slice.every((val) => val === slice[0])) {
        isAlreadySolved = false;
        break;
      }
    }

    if (isAlreadySolved) {
      [ballPool[0], ballPool[tubeCapacity]] = [ballPool[tubeCapacity], ballPool[0]];
    }

    const newTubes: TubeState[] = [];
    for (let i = 0; i < colorCount; i++) {
      const tubeBalls: BallItem[] = [];
      for (let b = 0; b < tubeCapacity; b++) {
        tubeBalls.push({
          id: `ball_${lvl}_${i}_${b}_${Math.random().toString(36).substring(2, 6)}`,
          colorId: ballPool[i * tubeCapacity + b],
        });
      }
      newTubes.push({
        id: i,
        balls: tubeBalls,
        capacity: tubeCapacity,
        isCompleted: false,
      });
    }

    // Empty Tubes
    for (let e = 0; e < emptyTubes; e++) {
      newTubes.push({
        id: colorCount + e,
        balls: [],
        capacity: tubeCapacity,
        isCompleted: false,
      });
    }

    setTubes(newTubes);
    setSelectedTubeIndex(null);
    setMoveHistory([]);
    setMoveCount(0);
    setIsWon(false);
    setHintMove(null);
    setExtraTubesUsed(0);
  }, []);

  // Initialize level
  useEffect(() => {
    generateLevel(level);
  }, [level, generateLevel]);

  // Check victory condition
  const checkVictory = useCallback((currentTubes: TubeState[]) => {
    for (const tube of currentTubes) {
      if (tube.balls.length === 0) continue; // Empty tube is valid
      if (tube.balls.length !== tube.capacity) return false;
      const firstCol = tube.balls[0].colorId;
      if (!tube.balls.every((b) => b.colorId === firstCol)) return false;
    }
    return true;
  }, []);

  // Smart Hint Finder
  const findHint = useCallback(() => {
    if (isWon || isAnimating) return;

    for (let fromIdx = 0; fromIdx < tubes.length; fromIdx++) {
      const fromTube = tubes[fromIdx];
      if (fromTube.balls.length === 0) continue;

      // Skip already finished tubes
      if (
        fromTube.balls.length === fromTube.capacity &&
        fromTube.balls.every((b) => b.colorId === fromTube.balls[0].colorId)
      ) {
        continue;
      }

      const topBall = fromTube.balls[fromTube.balls.length - 1];

      for (let toIdx = 0; toIdx < tubes.length; toIdx++) {
        if (fromIdx === toIdx) continue;
        const toTube = tubes[toIdx];

        if (toTube.balls.length >= toTube.capacity) continue;

        if (toTube.balls.length === 0) {
          const allSame = fromTube.balls.every((b) => b.colorId === topBall.colorId);
          if (!allSame) {
            setHintMove({ from: fromIdx, to: toIdx });
            sound.playPowerup();
            return;
          }
        } else {
          const destTop = toTube.balls[toTube.balls.length - 1];
          if (destTop.colorId === topBall.colorId) {
            setHintMove({ from: fromIdx, to: toIdx });
            sound.playPowerup();
            return;
          }
        }
      }
    }

    sound.playInvalidAction();
  }, [tubes, isAnimating, isWon]);

  // Handle Tube Selection & Ball Pouring
  const handleTubeClick = (tubeIndex: number) => {
    if (isWon || isAnimating || isPaused) return;

    if (hintMove) setHintMove(null);

    const targetTube = tubes[tubeIndex];

    // Case 1: No tube currently selected
    if (selectedTubeIndex === null) {
      if (targetTube.balls.length === 0) {
        sound.playInvalidAction();
        return;
      }

      // Check if tube is already full of one color
      if (
        targetTube.balls.length === targetTube.capacity &&
        targetTube.balls.every((b) => b.colorId === targetTube.balls[0].colorId)
      ) {
        sound.playConeComplete();
        return;
      }

      setSelectedTubeIndex(tubeIndex);
      const topBall = targetTube.balls[targetTube.balls.length - 1];
      const colDef = BALL_COLORS.find((c) => c.id === topBall.colorId);
      sound.playBallLift(colDef ? colDef.pitch : 1.0);
      return;
    }

    // Case 2: Clicked on same tube -> Put ball back down
    if (selectedTubeIndex === tubeIndex) {
      setSelectedTubeIndex(null);
      sound.playBallDrop(0.9);
      return;
    }

    // Case 3: Transfer ball from selectedTubeIndex -> targetTube
    const sourceTube = tubes[selectedTubeIndex];
    if (sourceTube.balls.length === 0) {
      setSelectedTubeIndex(null);
      return;
    }

    const ballToMove = sourceTube.balls[sourceTube.balls.length - 1];

    // Validate capacity
    if (targetTube.balls.length >= targetTube.capacity) {
      if (targetTube.balls.length > 0) {
        // Switch selection to new tube
        setSelectedTubeIndex(tubeIndex);
        const topB = targetTube.balls[targetTube.balls.length - 1];
        const colDef = BALL_COLORS.find((c) => c.id === topB.colorId);
        sound.playBallLift(colDef ? colDef.pitch : 1.0);
      } else {
        sound.playInvalidAction();
        setSelectedTubeIndex(null);
      }
      return;
    }

    // Validate color match
    const isDestEmpty = targetTube.balls.length === 0;
    const destTopBall = !isDestEmpty ? targetTube.balls[targetTube.balls.length - 1] : null;

    if (!isDestEmpty && destTopBall && destTopBall.colorId !== ballToMove.colorId) {
      // Switch selection if non-empty
      setSelectedTubeIndex(tubeIndex);
      const colDef = BALL_COLORS.find((c) => c.id === destTopBall.colorId);
      sound.playBallLift(colDef ? colDef.pitch : 1.0);
      return;
    }

    // Valid move! Animate & update state
    setIsAnimating(true);
    const colDef = BALL_COLORS.find((c) => c.id === ballToMove.colorId);
    sound.playBallDrop(colDef ? colDef.pitch : 1.0);

    setTimeout(() => {
      const updatedTubes = tubes.map((t) => ({
        ...t,
        balls: [...t.balls],
      }));

      const popped = updatedTubes[selectedTubeIndex].balls.pop();
      if (popped) {
        updatedTubes[tubeIndex].balls.push(popped);
      }

      // Check if target tube is completed
      const targetNow = updatedTubes[tubeIndex];
      if (
        targetNow.balls.length === targetNow.capacity &&
        targetNow.balls.every((b) => b.colorId === targetNow.balls[0].colorId)
      ) {
        targetNow.isCompleted = true;
        sound.playConeComplete();
      }

      // Record move history
      if (popped) {
        setMoveHistory((prev) => [
          ...prev,
          {
            fromIndex: selectedTubeIndex,
            toIndex: tubeIndex,
            ball: popped,
          },
        ]);
      }

      setTubes(updatedTubes);
      setSelectedTubeIndex(null);
      setMoveCount((prev) => prev + 1);
      setIsAnimating(false);

      // Check level win
      if (checkVictory(updatedTubes)) {
        setIsWon(true);
        sound.playGoalCheer();

        const minMoves = tubes.filter((t) => t.balls.length > 0).length * 3;
        const stars = moveCount <= minMoves + 2 ? 3 : moveCount <= minMoves + 6 ? 2 : 1;
        saveProgress(level, stars);
      }
    }, 160);
  };

  // Undo Last Move
  const handleUndo = () => {
    if (isWon || isAnimating || moveHistory.length === 0 || isPaused) return;

    const lastStep = moveHistory[moveHistory.length - 1];
    const updatedTubes = tubes.map((t) => ({
      ...t,
      balls: [...t.balls],
    }));

    const movedBall = updatedTubes[lastStep.toIndex].balls.pop();
    if (!movedBall) return;

    updatedTubes[lastStep.fromIndex].balls.push(movedBall);

    setTubes(updatedTubes);
    setMoveHistory((prev) => prev.slice(0, -1));
    setSelectedTubeIndex(null);
    setHintMove(null);
    sound.playUndoMove();
  };

  // Add Extra Tube Booster
  const handleAddExtraTube = () => {
    if (isWon || isAnimating || extraTubesUsed >= 2 || isPaused) return;

    const newTubeId = tubes.length;
    setTubes((prev) => [
      ...prev,
      {
        id: newTubeId,
        balls: [],
        capacity: tubes[0]?.capacity || 4,
        isCompleted: false,
      },
    ]);

    setExtraTubesUsed((prev) => prev + 1);
    sound.playAddConeBooster();
  };

  // Restart Level
  const handleRestart = () => {
    sound.playClick();
    setIsPaused(false);
    generateLevel(level);
  };

  // Next Level
  const handleNextLevel = () => {
    sound.playGoalCheer();
    const nextLvl = level + 1;
    setLevel(nextLvl);
    generateLevel(nextLvl);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center select-none">
      <div
        id="ball-sort-arcade-container"
        className="relative w-full max-w-[480px] aspect-[9/16] max-h-[820px] min-h-[440px] sm:min-h-[580px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between items-center select-none font-sans mx-auto border-4 border-slate-900/60 touch-none"
        style={{
          background: 'linear-gradient(180deg, #02091c 0%, #05132d 45%, #081d42 80%, #0a2454 100%)',
        }}
      >
      {/* 1. BACKGROUND GEOMETRIC MOUNTAINS & AMBIENT DEPTH */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Radial Ambient Glow in Upper Center */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Low-Poly Geometric Mountains at Bottom (matching reference screenshot) */}
        <svg
          viewBox="0 0 400 200"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 right-0 w-full h-[160px] opacity-70 pointer-events-none"
        >
          {/* Back mountain */}
          <polygon points="0,200 200,60 400,200" fill="#04122b" />
          {/* Middle mountain layers */}
          <polygon points="0,200 130,95 280,200" fill="#081e42" />
          <polygon points="120,200 270,80 400,200" fill="#0b295c" opacity="0.8" />
          {/* Front dark triangular hill */}
          <polygon points="50,200 200,120 350,200" fill="#061836" />
        </svg>
      </div>

      {/* 2. TOP HEADER HUD (Pause Button, Level 2 Title, Restart Button) */}
      <div className="relative w-full px-6 pt-7 pb-3 flex items-center justify-between z-30">
        {/* Left: Circular Pause Button */}
        <button
          id="ball-sort-pause-btn"
          onClick={() => {
            sound.playClick();
            setIsPaused(true);
          }}
          className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center bg-black/20 hover:bg-white/10 active:scale-95 transition-all shadow-lg backdrop-blur-sm"
          title="Pause Game"
        >
          <Pause className="w-5 h-5 text-white fill-white" />
        </button>

        {/* Center: "Level X" Display Text */}
        <div className="flex flex-col items-center">
          <h1
            className="text-3xl sm:text-4xl font-extrabold text-white tracking-wide"
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textShadow: '0 3px 8px rgba(0, 0, 0, 0.9), 0 0 12px rgba(255, 255, 255, 0.2)',
            }}
          >
            Level {level}
          </h1>
        </div>

        {/* Right: Circular Restart Button */}
        <button
          id="ball-sort-restart-btn"
          onClick={handleRestart}
          className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center bg-black/20 hover:bg-white/10 active:scale-95 transition-all shadow-lg backdrop-blur-sm"
          title="Restart Level"
        >
          <RotateCcw className="w-5 h-5 text-white stroke-[2.5]" />
        </button>
      </div>

      {/* 3. ACTIVE HINT NOTICE (If triggered) */}
      {hintMove && (
        <div className="absolute top-20 px-4 py-1 rounded-full bg-emerald-500/25 border border-emerald-400 text-emerald-300 text-xs font-black tracking-wider flex items-center gap-1.5 animate-bounce z-30 backdrop-blur-md">
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Move from Tube #{hintMove.from + 1} ➔ #{hintMove.to + 1}</span>
        </div>
      )}

      {/* 4. MAIN TEST TUBES & GLOSSY BALLS STAGE */}
      <div className="relative w-full flex-1 flex items-center justify-center px-4 py-6 z-20">
        <div className="flex items-end justify-center gap-4 sm:gap-6 flex-wrap max-w-full">
          {tubes.map((tube, tubeIdx) => {
            const isSelected = selectedTubeIndex === tubeIdx;
            const isHintSrc = hintMove?.from === tubeIdx;
            const isHintDst = hintMove?.to === tubeIdx;
            const isFullSameColor =
              tube.balls.length === tube.capacity &&
              tube.balls.every((b) => b.colorId === tube.balls[0].colorId);

            // Responsive tube dimensions
            const tubeWidth = tubes.length > 5 ? 58 : tubes.length > 3 ? 66 : 74;
            const tubeHeight = tube.capacity === 3 ? 200 : 230;

            return (
              <div
                key={tube.id}
                id={`test-tube-${tubeIdx}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleTubeClick(tubeIdx);
                }}
                className={`relative flex flex-col items-center justify-end cursor-pointer group transition-transform duration-200 touch-none select-none ${
                  isSelected ? 'scale-105' : 'hover:scale-[1.03]'
                }`}
                style={{
                  width: `${tubeWidth}px`,
                  height: `${tubeHeight + 60}px`,
                }}
              >
                {/* Visual indicator when tube is selected or hinted */}
                {isSelected && (
                  <div className="absolute top-2 w-10 h-1 bg-cyan-300 rounded-full blur-sm animate-pulse" />
                )}
                {isHintSrc && (
                  <div className="absolute -top-4 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black animate-bounce shadow">
                    FROM ⬆
                  </div>
                )}
                {isHintDst && (
                  <div className="absolute -top-4 px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 text-[9px] font-black animate-bounce shadow">
                    TO ⬇
                  </div>
                )}

                {/* THE CRYSTAL GLASS TEST TUBE (Exact Style from Screenshot) */}
                <div
                  className="relative w-full flex flex-col justify-end items-center"
                  style={{ height: `${tubeHeight}px` }}
                >
                  {/* Test Tube Glass Container */}
                  <div
                    className={`absolute inset-0 rounded-b-full border-2 transition-all duration-200 pointer-events-none overflow-hidden ${
                      isSelected
                        ? 'border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                        : isHintDst
                        ? 'border-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                        : 'border-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
                    }`}
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 40%, rgba(255,255,255,0.08) 100%)',
                      backdropFilter: 'blur(2px)',
                    }}
                  >
                    {/* Left Specular Glass Reflection Streak (Vertical highlight matching screenshot) */}
                    <div className="absolute top-3 left-1.5 w-[3px] h-[75%] bg-white/75 rounded-full pointer-events-none" />
                    <div className="absolute top-3 left-3 w-[1.5px] h-[35%] bg-white/35 rounded-full pointer-events-none" />

                    {/* Right Soft Rim Edge Reflection */}
                    <div className="absolute top-4 right-1.5 w-[1.5px] h-[60%] bg-white/25 rounded-full pointer-events-none" />

                    {/* Glass Bottom U-Curve Highlight */}
                    <div className="absolute bottom-1 left-3 right-3 h-[8px] border-b border-white/40 rounded-b-full pointer-events-none" />
                  </div>

                  {/* Top White Rim / Lip (Solid clean white top band matching screenshot) */}
                  <div
                    className="absolute -top-[2px] left-[-3px] right-[-3px] h-[7px] bg-white rounded-full shadow-sm z-20 pointer-events-none"
                    style={{
                      boxShadow: '0 2px 5px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.9)',
                    }}
                  />

                  {/* STACKED 3D GLOSSY BALLS */}
                  <div
                    className="relative w-full flex flex-col-reverse items-center justify-start pb-2 z-10"
                    style={{ height: `${tubeHeight - 10}px` }}
                  >
                    {tube.balls.map((ball, bIdx) => {
                      const isTopBall = bIdx === tube.balls.length - 1;
                      const isLifted = isSelected && isTopBall;
                      const colDef = BALL_COLORS.find((c) => c.id === ball.colorId);

                      // Ball diameter sized to fit inside tube
                      const ballSize = tubeWidth - 14;

                      return (
                        <div
                          key={ball.id}
                          className={`relative rounded-full transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer ${
                            isLifted
                              ? '-translate-y-16 scale-110'
                              : 'translate-y-0'
                          }`}
                          style={{
                            width: `${ballSize}px`,
                            height: `${ballSize}px`,
                            marginBottom: '2px',
                            background: colDef?.gradient || '#4ade80',
                            boxShadow: isLifted
                              ? `0 12px 24px ${colDef?.shadow || 'rgba(0,0,0,0.5)'}, 0 0 15px rgba(255,255,255,0.6)`
                              : `0 4px 10px rgba(0,0,0,0.4), inset 0 -3px 6px rgba(0,0,0,0.35), inset 0 3px 6px rgba(255,255,255,0.6)`,
                          }}
                        >
                          {/* 3D Gloss Specular Curved Highlight (Top-left shine dot like screenshot) */}
                          <div className="absolute top-[14%] left-[18%] w-[32%] h-[24%] bg-white/90 rounded-full blur-[0.3px] rotate-[-25deg]" />

                          {/* Secondary Soft Inner Reflection */}
                          <div className="absolute bottom-[15%] right-[20%] w-[22%] h-[15%] bg-white/30 rounded-full blur-[0.5px]" />
                        </div>
                      );
                    })}
                  </div>

                  {/* Completed Tube Badge */}
                  {isFullSameColor && (
                    <div className="absolute -bottom-3 z-30 px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-lg shadow-emerald-500/50 animate-bounce">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>DONE</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. BOTTOM UTILITY TOOLBAR (Undo, +1 Extra Tube Booster, Smart Hint, Level Select) */}
      <div className="relative w-full px-6 pb-6 pt-2 flex items-center justify-between gap-2 z-30">
        {/* Undo Move */}
        <button
          id="ball-sort-undo-btn"
          onClick={handleUndo}
          disabled={moveHistory.length === 0 || isWon || isAnimating}
          className="flex-1 py-2.5 px-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none border border-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg backdrop-blur-md transition-all active:scale-95"
          title="Undo Move"
        >
          <Undo2 className="w-4 h-4 text-cyan-300" />
          <span>Undo ({moveHistory.length})</span>
        </button>

        {/* +1 Extra Tube Booster */}
        <button
          id="ball-sort-add-tube-btn"
          onClick={handleAddExtraTube}
          disabled={extraTubesUsed >= 2 || isWon || isAnimating}
          className="flex-1 py-2.5 px-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none border border-white/20 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg backdrop-blur-md transition-all active:scale-95"
          title="Add Extra Test Tube"
        >
          <PlusCircle className="w-4 h-4 text-amber-400" />
          <span>+1 Tube ({2 - extraTubesUsed})</span>
        </button>

        {/* Smart Hint */}
        <button
          id="ball-sort-hint-btn"
          onClick={findHint}
          disabled={isWon || isAnimating}
          className="flex-1 py-2.5 px-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 disabled:opacity-40 border border-white/20 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg backdrop-blur-md transition-all active:scale-95"
          title="Get a Hint"
        >
          <Lightbulb className="w-4 h-4 text-emerald-400" />
          <span>Hint</span>
        </button>

        {/* Level Select Grid */}
        <button
          id="ball-sort-levels-btn"
          onClick={() => {
            sound.playClick();
            setShowLevelSelect(true);
          }}
          className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-white/20 text-white text-xs font-bold flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95"
          title="Levels Menu"
        >
          <Grid className="w-4 h-4 text-purple-300" />
        </button>
      </div>

      {/* 6. PAUSE MODAL OVERLAY */}
      {isPaused && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="w-full max-w-xs bg-slate-900/90 border border-white/20 rounded-3xl p-6 flex flex-col items-center text-center space-y-4 shadow-2xl">
            <h2 className="text-2xl font-black text-white">GAME PAUSED</h2>

            <div className="w-full space-y-2.5 pt-2">
              <button
                onClick={() => {
                  sound.playClick();
                  setIsPaused(false);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-sm tracking-wide shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>RESUME</span>
              </button>

              <button
                onClick={handleRestart}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RESTART</span>
              </button>

              <button
                onClick={() => {
                  const isM = sound.toggleMute();
                  setMuted(isM);
                }}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span>SOUND: {muted ? 'OFF' : 'ON'}</span>
              </button>

              <button
                onClick={() => {
                  setIsPaused(false);
                  setShowLevelSelect(true);
                }}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-sm border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Grid className="w-4 h-4" />
                <span>SELECT LEVEL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. LEVEL WIN VICTORY OVERLAY */}
      {isWon && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50 space-y-4 animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center shadow-2xl shadow-amber-500/40 border-2 border-white">
            <Trophy className="w-10 h-10 text-slate-950" />
          </div>

          <div>
            <div className="text-xs font-black uppercase text-amber-400 tracking-widest">EXCELLENT!</div>
            <h2 className="text-3xl font-black text-white mt-0.5">LEVEL {level} SOLVED</h2>
            <p className="text-sm text-slate-300 mt-1">
              Solved in <span className="text-cyan-400 font-bold">{moveCount} moves</span>!
            </p>
          </div>

          {/* 3-Star Rating */}
          <div className="flex items-center gap-2 py-1">
            {[1, 2, 3].map((starIdx) => (
              <Star
                key={starIdx}
                className={`w-9 h-9 ${
                  (levelStars[level] || 3) >= starIdx
                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] scale-110'
                    : 'text-slate-700'
                } transition-all duration-300`}
              />
            ))}
          </div>

          <div className="flex flex-col w-full max-w-xs gap-2.5 pt-2">
            <button
              id="ball-sort-next-level-btn"
              onClick={handleNextLevel}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span>NEXT LEVEL</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>

            <button
              id="ball-sort-replay-btn"
              onClick={handleRestart}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>REPLAY</span>
            </button>
          </div>
        </div>
      )}

      {/* 8. LEVEL SELECTOR MODAL */}
      {showLevelSelect && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Grid className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-black text-white">SELECT LEVEL (1 - 40)</h3>
              </div>
              <button
                onClick={() => setShowLevelSelect(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-5 gap-2.5 max-h-[340px] overflow-y-auto p-1">
              {Array.from({ length: 40 }, (_, i) => i + 1).map((lvlNum) => {
                const stars = levelStars[lvlNum] || 0;
                const isCurrent = level === lvlNum;

                return (
                  <button
                    key={lvlNum}
                    onClick={() => {
                      setLevel(lvlNum);
                      setShowLevelSelect(false);
                      generateLevel(lvlNum);
                      sound.playClick();
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black scale-105 shadow-md shadow-cyan-500/40'
                        : stars > 0
                        ? 'bg-slate-800/90 text-white border-amber-500/40 hover:bg-slate-700'
                        : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-sm font-black">{lvlNum}</span>
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3].map((s) => (
                        <div
                          key={s}
                          className={`w-1.5 h-1.5 rounded-full ${
                            stars >= s ? 'bg-amber-400' : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};
