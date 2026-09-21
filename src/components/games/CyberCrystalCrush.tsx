import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Award,
  Sparkles,
  Flame,
  Crown,
  Zap,
  Star
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

const GRID_SIZE = 8;

export type GemType = 'cyan' | 'ruby' | 'emerald' | 'amber' | 'amethyst' | 'sapphire';
export type SpecialType = 'none' | 'laser-h' | 'laser-v' | 'bomb' | 'rainbow';

export interface Gem {
  id: number;
  type: GemType;
  special: SpecialType;
  isMatched?: boolean;
}

const GEM_CONFIG: Record<
  GemType,
  { name: string; color: string; secondaryColor: string }
> = {
  cyan: { name: 'Diamond', color: '#38bdf8', secondaryColor: '#0284c7' },
  ruby: { name: 'Star', color: '#f43f5e', secondaryColor: '#be123c' },
  emerald: { name: 'Hexagon', color: '#34d399', secondaryColor: '#059669' },
  amber: { name: 'Sun', color: '#facc15', secondaryColor: '#d97706' },
  amethyst: { name: 'Prism', color: '#c084fc', secondaryColor: '#9333ea' },
  sapphire: { name: 'Cube', color: '#818cf8', secondaryColor: '#4f46e5' },
};

const GEM_KEYS: GemType[] = ['cyan', 'ruby', 'emerald', 'amber', 'amethyst', 'sapphire'];

export const CyberCrystalCrush: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nextIdRef = useRef<number>(1);

  // Swipe & Pointer Gesture Tracking Ref
  const pointerRef = useRef<{
    startX: number;
    startY: number;
    startR: number;
    startC: number;
    active: boolean;
    swiped: boolean;
  }>({
    startX: 0,
    startY: 0,
    startR: -1,
    startC: -1,
    active: false,
    swiped: false,
  });

  // Match State
  const [board, setBoard] = useState<(Gem | null)[][]>([]);
  const [selectedPos, setSelectedPos] = useState<{ r: number; c: number } | null>(null);
  const [movesLeft, setMovesLeft] = useState<number>(25);
  const [score, setScore] = useState<number>(0);
  const [targetScore] = useState<number>(5000);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_crystal_crush_high') || '0', 10);
  });
  const [comboBanner, setComboBanner] = useState<string>('');
  const [isWon, setIsWon] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Generate random non-matching starting board
  const createInitialBoard = useCallback((): (Gem | null)[][] => {
    const grid: (Gem | null)[][] = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null));

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        let validTypes = [...GEM_KEYS];

        // Avoid horizontal match-3
        if (c >= 2 && grid[r][c - 1]?.type === grid[r][c - 2]?.type) {
          validTypes = validTypes.filter((t) => t !== grid[r][c - 1]?.type);
        }
        // Avoid vertical match-3
        if (r >= 2 && grid[r - 1][c]?.type === grid[r - 2][c]?.type) {
          validTypes = validTypes.filter((t) => t !== grid[r - 1][c]?.type);
        }

        const chosen = validTypes[Math.floor(Math.random() * validTypes.length)];
        grid[r][c] = {
          id: nextIdRef.current++,
          type: chosen,
          special: 'none',
        };
      }
    }
    return grid;
  }, []);

  // Initialize Match
  useEffect(() => {
    setBoard(createInitialBoard());
  }, [createInitialBoard]);

  // Find all horizontal and vertical matches on the board
  const findMatches = (currentBoard: (Gem | null)[][]): { r: number; c: number }[] => {
    const matchedCoords = new Set<string>();

    // Check Horizontal
    for (let r = 0; r < GRID_SIZE; r++) {
      let matchCount = 1;
      for (let c = 1; c < GRID_SIZE; c++) {
        if (
          currentBoard[r][c] &&
          currentBoard[r][c - 1] &&
          currentBoard[r][c]!.type === currentBoard[r][c - 1]!.type
        ) {
          matchCount++;
        } else {
          if (matchCount >= 3) {
            for (let k = c - matchCount; k < c; k++) {
              matchedCoords.add(`${r},${k}`);
            }
          }
          matchCount = 1;
        }
      }
      if (matchCount >= 3) {
        for (let k = GRID_SIZE - matchCount; k < GRID_SIZE; k++) {
          matchedCoords.add(`${r},${k}`);
        }
      }
    }

    // Check Vertical
    for (let c = 0; c < GRID_SIZE; c++) {
      let matchCount = 1;
      for (let r = 1; r < GRID_SIZE; r++) {
        if (
          currentBoard[r][c] &&
          currentBoard[r - 1][c] &&
          currentBoard[r][c]!.type === currentBoard[r - 1][c]!.type
        ) {
          matchCount++;
        } else {
          if (matchCount >= 3) {
            for (let k = r - matchCount; k < r; k++) {
              matchedCoords.add(`${k},${c}`);
            }
          }
          matchCount = 1;
        }
      }
      if (matchCount >= 3) {
        for (let k = GRID_SIZE - matchCount; k < GRID_SIZE; k++) {
          matchedCoords.add(`${k},${c}`);
        }
      }
    }

    return Array.from(matchedCoords).map((coord) => {
      const [r, c] = coord.split(',').map(Number);
      return { r, c };
    });
  };

  // Process Match Clearing, Cascading Gravity Falls & Combo Chain Reactions
  const processMatches = useCallback(
    async (initialGrid: (Gem | null)[][], comboStep = 1) => {
      let currentGrid = initialGrid.map((row) => [...row]);
      const matches = findMatches(currentGrid);

      if (matches.length === 0) {
        setIsProcessing(false);
        setComboBanner('');
        return;
      }

      sound.playCollect();

      // Score calculation
      const gainedScore = matches.length * 60 * comboStep;
      setScore((prev) => {
        const ns = prev + gainedScore;
        if (ns > highScore) {
          setHighScore(ns);
          localStorage.setItem('cyber_crystal_crush_high', ns.toString());
        }
        if (ns >= targetScore && !isWon) {
          setIsWon(true);
          sound.playWin();
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
        }
        return ns;
      });

      if (comboStep > 1) {
        setComboBanner(`🔥 COMBO x${comboStep}! +${gainedScore}`);
      }

      // Check special power creation (4 match = Laser, 5 match = Rainbow)
      let specialToCreate: { r: number; c: number; special: SpecialType; type: GemType } | null = null;
      if (matches.length === 4) {
        const mid = matches[1];
        specialToCreate = { r: mid.r, c: mid.c, special: 'laser-h', type: currentGrid[mid.r][mid.c]!.type };
      } else if (matches.length >= 5) {
        const mid = matches[2];
        specialToCreate = { r: mid.r, c: mid.c, special: 'rainbow', type: 'cyan' };
      }

      // Remove matched gems
      matches.forEach(({ r, c }) => {
        currentGrid[r][c] = null;
      });

      if (specialToCreate) {
        currentGrid[specialToCreate.r][specialToCreate.c] = {
          id: nextIdRef.current++,
          type: specialToCreate.type,
          special: specialToCreate.special,
        };
      }

      setBoard(currentGrid.map((row) => [...row]));

      // Wait brief moment for visual pop
      await new Promise((res) => setTimeout(res, 220));

      // Apply Gravity Fall down columns
      for (let c = 0; c < GRID_SIZE; c++) {
        let emptySpot = GRID_SIZE - 1;
        for (let r = GRID_SIZE - 1; r >= 0; r--) {
          if (currentGrid[r][c] !== null) {
            if (emptySpot !== r) {
              currentGrid[emptySpot][c] = currentGrid[r][c];
              currentGrid[r][c] = null;
            }
            emptySpot--;
          }
        }

        // Refill from top with fresh gems
        for (let r = emptySpot; r >= 0; r--) {
          const randomType = GEM_KEYS[Math.floor(Math.random() * GEM_KEYS.length)];
          currentGrid[r][c] = {
            id: nextIdRef.current++,
            type: randomType,
            special: 'none',
          };
        }
      }

      setBoard(currentGrid.map((row) => [...row]));
      await new Promise((res) => setTimeout(res, 240));

      // Recursive Cascade Check
      processMatches(currentGrid, comboStep + 1);
    },
    [highScore, isWon, targetScore]
  );

  // Execute Swap between any two grid coordinates (r1, c1) and (r2, c2)
  const executeSwap = useCallback(
    async (r1: number, c1: number, r2: number, c2: number) => {
      if (isProcessing || isGameOver || isWon) return;

      // Validate bounds
      if (r1 < 0 || r1 >= GRID_SIZE || c1 < 0 || c1 >= GRID_SIZE) return;
      if (r2 < 0 || r2 >= GRID_SIZE || c2 < 0 || c2 >= GRID_SIZE) return;

      setIsProcessing(true);
      setSelectedPos(null);

      const nextGrid = board.map((row) => [...row]);
      const gemA = nextGrid[r1][c1];
      const gemB = nextGrid[r2][c2];

      if (!gemA || !gemB) {
        setIsProcessing(false);
        return;
      }

      // Swap
      nextGrid[r1][c1] = gemB;
      nextGrid[r2][c2] = gemA;
      setBoard(nextGrid);

      // Check Rainbow Supernova Swap
      if (gemA.special === 'rainbow' || gemB.special === 'rainbow') {
        sound.playWin();
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        const targetType = gemA.special === 'rainbow' ? gemB.type : gemA.type;

        for (let ro = 0; ro < GRID_SIZE; ro++) {
          for (let co = 0; co < GRID_SIZE; co++) {
            if (nextGrid[ro][co]?.type === targetType || nextGrid[ro][co]?.special === 'rainbow') {
              nextGrid[ro][co] = null;
            }
          }
        }

        setMovesLeft((prev) => {
          const nm = prev - 1;
          if (nm <= 0 && score < targetScore) setIsGameOver(true);
          return nm;
        });

        setBoard(nextGrid);
        await new Promise((res) => setTimeout(res, 250));
        processMatches(nextGrid, 2);
        return;
      }

      const matches = findMatches(nextGrid);

      if (matches.length > 0) {
        setMovesLeft((prev) => {
          const nm = prev - 1;
          if (nm <= 0 && score < targetScore) setIsGameOver(true);
          return nm;
        });
        processMatches(nextGrid, 1);
      } else {
        // Invalid Move -> Swap Back smoothly!
        sound.playHit();
        await new Promise((res) => setTimeout(res, 220));
        const reverted = board.map((row) => [...row]);
        setBoard(reverted);
        setIsProcessing(false);
      }
    },
    [board, isGameOver, isProcessing, isWon, processMatches, score, targetScore]
  );

  // =========================================================================
  // TOUCH & POINTER SWIPE GESTURE HANDLERS (MOBILE & DESKTOP)
  // =========================================================================
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, r: number, c: number) => {
    if (isProcessing || isGameOver || isWon) return;

    pointerRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startR: r,
      startC: c,
      active: true,
      swiped: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ptr = pointerRef.current;
    if (!ptr.active || ptr.swiped || isProcessing || isGameOver || isWon) return;

    const dx = e.clientX - ptr.startX;
    const dy = e.clientY - ptr.startY;
    const dist = Math.hypot(dx, dy);

    // Swipe Threshold: 18px
    if (dist >= 18) {
      ptr.swiped = true;
      ptr.active = false;

      let targetR = ptr.startR;
      let targetC = ptr.startC;

      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal Swipe (Left / Right)
        targetC += dx > 0 ? 1 : -1;
      } else {
        // Vertical Swipe (Up / Down)
        targetR += dy > 0 ? 1 : -1;
      }

      executeSwap(ptr.startR, ptr.startC, targetR, targetC);
    }
  };

  const handlePointerUp = (r: number, c: number) => {
    const ptr = pointerRef.current;
    if (!ptr.swiped && ptr.active) {
      // Tap / Click fallback selection
      ptr.active = false;
      if (!selectedPos) {
        sound.playClick();
        setSelectedPos({ r, c });
      } else {
        const isAdjacent =
          (Math.abs(selectedPos.r - r) === 1 && selectedPos.c === c) ||
          (Math.abs(selectedPos.c - c) === 1 && selectedPos.r === r);

        if (isAdjacent) {
          executeSwap(selectedPos.r, selectedPos.c, r, c);
        } else {
          sound.playClick();
          setSelectedPos({ r, c });
        }
      }
    }
    ptr.active = false;
  };

  // Restart Match
  const restartMatch = () => {
    sound.playClick();
    setBoard(createInitialBoard());
    setSelectedPos(null);
    setMovesLeft(25);
    setScore(0);
    setComboBanner('');
    setIsWon(false);
    setIsGameOver(false);
    setIsProcessing(false);
  };

  const starsEarned = score >= targetScore * 1.5 ? 3 : score >= targetScore ? 2 : score >= targetScore * 0.5 ? 1 : 0;

  return (
    <div
      ref={containerRef}
      id="cyber-crystal-crush-arena"
      className="relative w-full max-w-md mx-auto flex flex-col items-center select-none font-sans px-2 py-2"
    >
      {/* ========================================================================= */}
      {/* 1. TOP SCORE & MOVES HUD */}
      {/* ========================================================================= */}
      <div className="w-full mb-3 p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl flex items-center justify-between">
        {/* Moves Left */}
        <div className="text-left">
          <div className="text-[10px] uppercase font-black text-rose-400 tracking-wider">MOVES</div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono leading-none">{movesLeft}</div>
        </div>

        {/* Target Progress Bar & Stars */}
        <div className="text-center flex flex-col items-center">
          <div className="flex gap-1 mb-1">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${
                  starsEarned >= s ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-slate-700'
                }`}
              />
            ))}
          </div>
          <div className="w-28 h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-pink-500 transition-all duration-300"
              style={{ width: `${Math.min(100, (score / targetScore) * 100)}%` }}
            />
          </div>
          <div className="text-[9px] font-bold text-slate-400 mt-0.5">
            {score} / {targetScore}
          </div>
        </div>

        {/* High Score & Mute */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] uppercase font-black text-amber-400 tracking-wider flex items-center justify-end gap-1">
              <Crown className="w-3 h-3 text-amber-400" /> BEST
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono leading-none">{highScore}</div>
          </div>

          <button
            onClick={() => {
              const isMute = sound.toggleMute();
              setMuted(isMute);
            }}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Combo Banner Alert */}
      {comboBanner && (
        <div className="mb-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black animate-bounce shadow-lg">
          {comboBanner}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 8X8 GLOWING GEM GRID (WITH TOUCH SWIPE SUPPORT) */}
      {/* ========================================================================= */}
      <div
        onPointerMove={handlePointerMove}
        className="relative w-full max-w-[440px] p-2 sm:p-3 rounded-3xl bg-slate-950/90 border-2 border-cyan-500/40 shadow-2xl shadow-cyan-950/50 backdrop-blur-xl touch-none select-none"
      >
        <div className="grid grid-cols-8 gap-1 sm:gap-1.5 w-full touch-none select-none">
          {board.map((row, r) =>
            row.map((gem, c) => {
              const isSelected = selectedPos?.r === r && selectedPos?.c === c;
              if (!gem) {
                return (
                  <div
                    key={`${r}-${c}`}
                    className="w-full aspect-square rounded-lg sm:rounded-xl bg-slate-900/40 border border-slate-800/40 opacity-30 touch-none"
                  />
                );
              }

              const cfg = GEM_CONFIG[gem.type];

              return (
                <button
                  key={gem.id}
                  onPointerDown={(e) => handlePointerDown(e, r, c)}
                  onPointerUp={() => handlePointerUp(r, c)}
                  className={`w-full aspect-square rounded-lg sm:rounded-xl relative flex items-center justify-center transition-all touch-none select-none ${
                    isSelected
                      ? 'scale-110 border-2 border-white shadow-xl shadow-cyan-400/80 z-10 bg-slate-800'
                      : 'hover:scale-105 active:scale-95 bg-slate-900/80 border border-slate-800/80 shadow-md'
                  }`}
                >
                  {/* Gem Graphic Shape */}
                  {gem.special === 'rainbow' ? (
                    <div className="w-[78%] h-[78%] rounded-full bg-gradient-to-tr from-cyan-400 via-pink-500 to-amber-400 animate-spin border border-white shadow-lg shadow-pink-500/50 flex items-center justify-center pointer-events-none">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div
                      className="w-[78%] h-[78%] rounded-md sm:rounded-lg relative flex items-center justify-center border border-white/60 shadow-lg pointer-events-none"
                      style={{
                        backgroundColor: cfg.color,
                        boxShadow: `0 0 12px ${cfg.color}80`,
                      }}
                    >
                      {/* Inner Facet Reflection */}
                      <div className="w-2.5 h-2.5 rounded bg-white/40 rotate-45" />

                      {/* Special Laser Icon Indicator */}
                      {gem.special === 'laser-h' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Swipe & Tap Instructions */}
      <div className="mt-3 text-center text-xs font-bold text-cyan-300 animate-pulse">
        👆 Swipe in any direction or tap adjacent gems to swap!
      </div>

      {/* ========================================================================= */}
      {/* 3. VICTORY MODAL */}
      {/* ========================================================================= */}
      {isWon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border-2 border-amber-400/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30">
              <Trophy className="w-9 h-9 text-amber-400 animate-bounce" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-amber-400 tracking-wider">TARGET REACHED!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">LEVEL COMPLETE!</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-amber-300 font-mono text-xl font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Best Record:</span>
                <span className="text-cyan-300 font-mono text-xl font-black">{highScore}</span>
              </div>
            </div>

            <button
              onClick={restartMatch}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-pink-600 to-cyan-500 hover:from-amber-400 active:scale-95 text-white font-black text-base shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" /> PLAY NEXT LEVEL
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. GAME OVER MODAL */}
      {/* ========================================================================= */}
      {isGameOver && !isWon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border-2 border-rose-500/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto shadow-xl shadow-rose-500/30">
              <Award className="w-9 h-9 text-rose-400" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">OUT OF MOVES!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GAME OVER</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Score:</span>
                <span className="text-white font-mono text-xl font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>Target:</span>
                <span className="text-amber-300 font-mono text-xl font-black">{targetScore}</span>
              </div>
            </div>

            <button
              onClick={restartMatch}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 active:scale-95 text-white font-black text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" /> RETRY
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
