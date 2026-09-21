import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  Sparkles,
  Undo2,
  Bomb,
  Shuffle,
  Grid3X3,
  Flame,
  Zap,
} from 'lucide-react';
import { sound } from '../../utils/audio';

type BoardSize = 4 | 5;

interface Tile {
  id: string;
  value: number;
  row: number;
  col: number;
  mergedInto?: boolean;
  isNew?: boolean;
}

const TILE_STYLES: Record<
  number,
  { bg: string; text: string; glow: string; border: string; label?: string }
> = {
  2: {
    bg: 'from-slate-800 to-slate-900',
    text: 'text-cyan-300',
    glow: 'shadow-cyan-500/20',
    border: 'border-cyan-500/30',
  },
  4: {
    bg: 'from-cyan-950 to-blue-900',
    text: 'text-cyan-200',
    glow: 'shadow-cyan-400/30',
    border: 'border-cyan-400/40',
  },
  8: {
    bg: 'from-blue-900 to-indigo-900',
    text: 'text-sky-100',
    glow: 'shadow-blue-500/40',
    border: 'border-blue-400/50',
  },
  16: {
    bg: 'from-indigo-900 to-purple-900',
    text: 'text-indigo-100',
    glow: 'shadow-indigo-500/40',
    border: 'border-indigo-400/50',
  },
  32: {
    bg: 'from-purple-900 to-fuchsia-900',
    text: 'text-pink-100',
    glow: 'shadow-purple-500/50',
    border: 'border-purple-400/60',
  },
  64: {
    bg: 'from-fuchsia-900 to-pink-800',
    text: 'text-pink-50',
    glow: 'shadow-pink-500/60',
    border: 'border-pink-400/70',
  },
  128: {
    bg: 'from-pink-700 via-rose-700 to-amber-700',
    text: 'text-amber-100',
    glow: 'shadow-rose-500/60',
    border: 'border-rose-400/80',
    label: 'NOVA',
  },
  256: {
    bg: 'from-amber-600 via-yellow-600 to-orange-600',
    text: 'text-yellow-50',
    glow: 'shadow-amber-500/70',
    border: 'border-amber-300',
    label: 'SOLAR',
  },
  512: {
    bg: 'from-emerald-700 via-teal-700 to-cyan-600',
    text: 'text-emerald-50',
    glow: 'shadow-emerald-400/80',
    border: 'border-emerald-300',
    label: 'AURORA',
  },
  1024: {
    bg: 'from-teal-500 via-cyan-500 to-blue-600',
    text: 'text-white',
    glow: 'shadow-cyan-400/90',
    border: 'border-white',
    label: 'QUANTUM',
  },
  2048: {
    bg: 'from-yellow-400 via-rose-500 to-purple-600',
    text: 'text-white font-black',
    glow: 'shadow-yellow-400/90 shadow-2xl',
    border: 'border-yellow-200 ring-2 ring-yellow-400',
    label: 'CYBER 2048',
  },
  4096: {
    bg: 'from-violet-600 via-fuchsia-600 to-pink-500',
    text: 'text-white font-black',
    glow: 'shadow-fuchsia-400/90 shadow-2xl',
    border: 'border-fuchsia-200 ring-2 ring-fuchsia-400',
    label: 'SINGULARITY',
  },
  8192: {
    bg: 'from-amber-300 via-rose-500 to-cyan-400',
    text: 'text-slate-950 font-black',
    glow: 'shadow-cyan-400/90 shadow-2xl',
    border: 'border-white ring-4 ring-cyan-300',
    label: 'INFINITY',
  },
};

export const CyberMerge2048: React.FC = () => {
  const [boardSize, setBoardSize] = useState<BoardSize>(4);
  const [grid, setGrid] = useState<(number | null)[][]>([]);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [prevStates, setPrevStates] = useState<
    { grid: (number | null)[][]; score: number }[]
  >([]);
  const [undoCount, setUndoCount] = useState<number>(3);
  const [bombCount, setBombCount] = useState<number>(2);
  const [bombMode, setBombMode] = useState<boolean>(false);
  const [hasWon, setHasWon] = useState<boolean>(false);
  const [continuedAfterWin, setContinuedAfterWin] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [combo, setCombo] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Touch Swipe coordinates
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize saved high scores
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`cyber_2048_high_${boardSize}`);
      if (saved) setHighScore(parseInt(saved, 10));
      else setHighScore(0);
    } catch {
      // ignore
    }
  }, [boardSize]);

  // Create Empty Grid
  const createEmptyGrid = (size: BoardSize): (number | null)[][] => {
    return Array.from({ length: size }, () => Array(size).fill(null));
  };

  // Add Random Tile (2 or 4) to empty spot
  const addRandomTile = (currentGrid: (number | null)[][]): (number | null)[][] => {
    const emptyCells: { r: number; c: number }[] = [];
    currentGrid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell === null) emptyCells.push({ r, c });
      });
    });

    if (emptyCells.length === 0) return currentGrid;

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.88 ? 2 : 4;

    const newGrid = currentGrid.map((row) => [...row]);
    newGrid[randomCell.r][randomCell.c] = value;
    return newGrid;
  };

  // Check Game Over Condition
  const checkGameOver = (currentGrid: (number | null)[][]): boolean => {
    const size = currentGrid.length;
    // Check if any empty cell exists
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (currentGrid[r][c] === null) return false;
      }
    }
    // Check if adjacent matching cells exist (horizontally or vertically)
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = currentGrid[r][c];
        if (c + 1 < size && currentGrid[r][c + 1] === val) return false;
        if (r + 1 < size && currentGrid[r + 1][c] === val) return false;
      }
    }
    return true;
  };

  // Start / Reset Game
  const resetGame = useCallback(
    (size: BoardSize = boardSize) => {
      sound.playClick();
      let newGrid = createEmptyGrid(size);
      newGrid = addRandomTile(newGrid);
      newGrid = addRandomTile(newGrid);

      setGrid(newGrid);
      setScore(0);
      setPrevStates([]);
      setUndoCount(3);
      setBombCount(2);
      setBombMode(false);
      setHasWon(false);
      setContinuedAfterWin(false);
      setIsGameOver(false);
      setCombo(0);
    },
    [boardSize]
  );

  // Initialize Game on Mount
  useEffect(() => {
    resetGame(boardSize);
  }, [boardSize, resetGame]);

  // Execute Board Move in Direction
  const move = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (isGameOver || (hasWon && !continuedAfterWin) || bombMode) return;

      const size = boardSize;
      let moved = false;
      let scoreGain = 0;
      let mergeCount = 0;
      let highestMerged = 0;

      // Deep copy grid
      const newGrid = grid.map((row) => [...row]);

      // Helper function to slide & merge an array
      const processLine = (line: (number | null)[]): (number | null)[] => {
        // 1. Filter out nulls
        const filtered = line.filter((x): x is number => x !== null);
        const result: (number | null)[] = [];

        // 2. Merge identical adjacent tiles
        let i = 0;
        while (i < filtered.length) {
          if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
            const mergedVal = filtered[i] * 2;
            result.push(mergedVal);
            scoreGain += mergedVal;
            mergeCount++;
            if (mergedVal > highestMerged) highestMerged = mergedVal;
            i += 2;
          } else {
            result.push(filtered[i]);
            i++;
          }
        }

        // 3. Pad back with nulls to original size
        while (result.length < size) {
          result.push(null);
        }
        return result;
      };

      if (direction === 'left') {
        for (let r = 0; r < size; r++) {
          const originalRow = newGrid[r];
          const newRow = processLine(originalRow);
          if (originalRow.some((val, idx) => val !== newRow[idx])) moved = true;
          newGrid[r] = newRow;
        }
      } else if (direction === 'right') {
        for (let r = 0; r < size; r++) {
          const originalRow = [...newGrid[r]].reverse();
          const newRow = processLine(originalRow).reverse();
          if (newGrid[r].some((val, idx) => val !== newRow[idx])) moved = true;
          newGrid[r] = newRow;
        }
      } else if (direction === 'up') {
        for (let c = 0; c < size; c++) {
          const originalCol = newGrid.map((row) => row[c]);
          const newCol = processLine(originalCol);
          if (originalCol.some((val, idx) => val !== newCol[idx])) moved = true;
          for (let r = 0; r < size; r++) {
            newGrid[r][c] = newCol[r];
          }
        }
      } else if (direction === 'down') {
        for (let c = 0; c < size; c++) {
          const originalCol = newGrid.map((row) => row[c]).reverse();
          const newCol = processLine(originalCol).reverse();
          if (newGrid.map((row) => row[c]).some((val, idx) => val !== newCol[idx])) {
            moved = true;
          }
          for (let r = 0; r < size; r++) {
            newGrid[r][c] = newCol[r];
          }
        }
      }

      if (moved) {
        // Save previous state for Undo
        setPrevStates((prev) => [...prev.slice(-5), { grid: grid.map((r) => [...r]), score }]);

        // Spawn new tile
        const gridWithNewTile = addRandomTile(newGrid);
        setGrid(gridWithNewTile);

        // Sound & Combos
        if (mergeCount > 0) {
          sound.playTileMerge(highestMerged);
          setCombo((c) => c + mergeCount);
        } else {
          sound.playTileSlide();
          setCombo(0);
        }

        // Update Score
        const nextScore = score + scoreGain;
        setScore(nextScore);

        if (nextScore > highScore) {
          setHighScore(nextScore);
          try {
            localStorage.setItem(`cyber_2048_high_${boardSize}`, String(nextScore));
          } catch {
            // ignore
          }
        }

        // Check 2048 milestone win
        if (!hasWon && !continuedAfterWin) {
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              if (gridWithNewTile[r][c] === 2048) {
                setHasWon(true);
                sound.playWin();
                confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
              }
            }
          }
        }

        // Check Game Over
        if (checkGameOver(gridWithNewTile)) {
          setIsGameOver(true);
          sound.playGameOver();
        }
      }
    },
    [grid, score, highScore, isGameOver, hasWon, continuedAfterWin, boardSize, bombMode]
  );

  // Keyboard Controller
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key)) {
        e.preventDefault();
        move('up');
      } else if (['ArrowDown', 's', 'S'].includes(e.key)) {
        e.preventDefault();
        move('down');
      } else if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
        e.preventDefault();
        move('left');
      } else if (['ArrowRight', 'd', 'D'].includes(e.key)) {
        e.preventDefault();
        move('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const minSwipeDistance = 25;

    if (Math.max(absX, absY) > minSwipeDistance) {
      if (absX > absY) {
        if (dx > 0) move('right');
        else move('left');
      } else {
        if (dy > 0) move('down');
        else move('up');
      }
    }
    touchStartRef.current = null;
  };

  // Undo Power-up
  const handleUndo = () => {
    if (undoCount <= 0 || prevStates.length === 0) return;
    sound.playClick();
    const last = prevStates[prevStates.length - 1];
    setGrid(last.grid);
    setScore(last.score);
    setPrevStates((prev) => prev.slice(0, -1));
    setUndoCount((u) => u - 1);
    setIsGameOver(false);
  };

  // Quantum Bomb Power-up (Click cell to detonate)
  const handleCellClick = (r: number, c: number) => {
    if (!bombMode) return;
    if (grid[r][c] === null) return;

    sound.playTileBomb();
    const newGrid = grid.map((row) => [...row]);
    newGrid[r][c] = null;
    setGrid(newGrid);
    setBombCount((b) => b - 1);
    setBombMode(false);
  };

  // Matrix Shuffle Power-up
  const handleShuffle = () => {
    sound.playPowerup();
    const nonNullValues: number[] = [];
    grid.forEach((row) =>
      row.forEach((cell) => {
        if (cell !== null) nonNullValues.push(cell);
      })
    );

    // Fisher-Yates Shuffle
    for (let i = nonNullValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonNullValues[i], nonNullValues[j]] = [nonNullValues[j], nonNullValues[i]];
    }

    let valIdx = 0;
    const newGrid = grid.map((row) =>
      row.map((cell) => (cell !== null ? nonNullValues[valIdx++] : null))
    );
    setGrid(newGrid);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center select-none">
      <div
        id="cyber-2048-container"
        className="relative w-full max-w-[560px] min-h-[420px] sm:min-h-[560px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between items-center select-none font-sans mx-auto border-4 border-slate-900/90 bg-slate-950 p-2.5 sm:p-6 touch-none"
      >
      {/* 1. TOP HEADER (Score, High Score, Grid Toggle, Sound) */}
      <div className="w-full flex items-center justify-between gap-1 sm:gap-2 z-20">
        {/* Left: Score & High Score */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 text-cyan-300 flex flex-col items-center shadow-md">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              SCORE
            </span>
            <span className="text-base sm:text-lg font-black">{score}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-amber-300 flex flex-col items-center shadow-md">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> BEST
            </span>
            <span className="text-base sm:text-lg font-black">{highScore}</span>
          </div>
        </div>

        {/* Right: Board Size Toggle & Reset & Sound */}
        <div className="flex items-center gap-2">
          {/* 4x4 vs 5x5 Toggle */}
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => {
                setBoardSize(4);
                resetGame(4);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                boardSize === 4
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              4x4
            </button>
            <button
              onClick={() => {
                setBoardSize(5);
                resetGame(5);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                boardSize === 5
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              5x5
            </button>
          </div>

          <button
            onClick={() => resetGame()}
            className="p-2 rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer"
            title="Restart Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const isM = sound.toggleMute();
              setMuted(isM);
            }}
            className="p-2 rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {/* 2. POWER-UP TOOLBAR */}
      <div className="w-full flex items-center justify-between px-2 py-2 my-1 z-20">
        <div className="flex items-center gap-2">
          {/* Undo Power-up */}
          <button
            onClick={handleUndo}
            disabled={undoCount <= 0 || prevStates.length === 0}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-black transition-all shadow-md ${
              undoCount > 0 && prevStates.length > 0
                ? 'bg-slate-900 border-cyan-500/50 text-cyan-300 hover:bg-slate-800 active:scale-95 cursor-pointer'
                : 'bg-slate-950/60 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>UNDO ({undoCount})</span>
          </button>

          {/* Bomb Power-up */}
          <button
            onClick={() => {
              if (bombCount > 0) {
                setBombMode(!bombMode);
                sound.playClick();
              }
            }}
            disabled={bombCount <= 0}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-black transition-all shadow-md ${
              bombMode
                ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                : bombCount > 0
                ? 'bg-slate-900 border-rose-500/50 text-rose-300 hover:bg-slate-800 active:scale-95 cursor-pointer'
                : 'bg-slate-950/60 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Bomb className="w-3.5 h-3.5" />
            <span>{bombMode ? 'TAP TILE' : `BOMB (${bombCount})`}</span>
          </button>
        </div>

        {/* Matrix Shuffle */}
        <button
          onClick={handleShuffle}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-purple-500/50 text-purple-300 hover:bg-slate-800 active:scale-95 transition-all text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <Shuffle className="w-3.5 h-3.5 text-purple-400" />
          <span>SHUFFLE</span>
        </button>
      </div>

      {/* 3. 2048 MATRIX PLAYING BOARD */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full aspect-square max-w-[440px] bg-slate-900/80 border-2 border-slate-800 rounded-3xl p-3 grid gap-2.5 sm:gap-3 touch-none shadow-inner z-10 ${
          boardSize === 4 ? 'grid-cols-4 grid-rows-4' : 'grid-cols-5 grid-rows-5'
        }`}
      >
        {grid.map((row, r) =>
          row.map((cellValue, c) => {
            const tileStyle = cellValue ? TILE_STYLES[cellValue] || TILE_STYLES[8192] : null;

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className={`relative rounded-2xl flex flex-col items-center justify-center transition-all duration-150 select-none ${
                  cellValue === null
                    ? 'bg-slate-950/60 border border-slate-800/60'
                    : `bg-gradient-to-tr ${tileStyle?.bg} border ${tileStyle?.border} ${
                        tileStyle?.glow
                      } shadow-lg ${bombMode ? 'cursor-pointer hover:scale-105 ring-2 ring-rose-500' : ''}`
                }`}
              >
                {cellValue !== null && (
                  <>
                    <span
                      className={`font-black tracking-tight ${
                        boardSize === 4
                          ? cellValue >= 1024
                            ? 'text-xl sm:text-2xl'
                            : 'text-2xl sm:text-3xl'
                          : cellValue >= 1024
                          ? 'text-base sm:text-lg'
                          : 'text-lg sm:text-xl'
                      } ${tileStyle?.text}`}
                    >
                      {cellValue}
                    </span>

                    {/* Quantum Tier Micro Label */}
                    {tileStyle?.label && boardSize === 4 && (
                      <span className="absolute bottom-1 text-[8px] font-black tracking-widest text-white/70 uppercase">
                        {tileStyle.label}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}

        {/* 4. VICTORY 2048 OVERLAY */}
        {hasWon && !continuedAfterWin && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-yellow-400 to-rose-500 flex items-center justify-center shadow-2xl shadow-yellow-500/40 border border-yellow-300 mb-3 animate-bounce">
              <Flame className="w-9 h-9 text-slate-950" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wider drop-shadow-md">
              QUANTUM 2048 REACHED!
            </h2>
            <p className="text-xs sm:text-sm text-yellow-300 font-bold max-w-xs mt-1">
              You synthesized the legendary 2048 fusion core!
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setContinuedAfterWin(true)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black text-xs tracking-wider shadow-lg active:scale-95 cursor-pointer"
              >
                KEEP PLAYING (4096)
              </button>
              <button
                onClick={() => resetGame()}
                className="px-5 py-3 rounded-2xl bg-slate-800 text-white font-black text-xs tracking-wider hover:bg-slate-700 active:scale-95 cursor-pointer"
              >
                NEW GAME
              </button>
            </div>
          </div>
        )}

        {/* 5. GAME OVER OVERLAY */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-700 flex items-center justify-center shadow-2xl shadow-rose-500/40 border border-rose-400 mb-2">
              <Bomb className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white">NO MORE MERGES!</h2>
            <p className="text-xs text-rose-300 font-bold uppercase tracking-widest mt-0.5">
              THE MATRIX HAS LOCKED
            </p>

            <div className="flex gap-4 my-4">
              <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block font-bold">FINAL SCORE</span>
                <span className="text-xl font-black text-cyan-400">{score}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block font-bold">BEST</span>
                <span className="text-xl font-black text-amber-400">{highScore}</span>
              </div>
            </div>

            <div className="flex gap-2">
              {undoCount > 0 && prevStates.length > 0 && (
                <button
                  onClick={handleUndo}
                  className="px-5 py-3 rounded-2xl bg-cyan-600 text-white font-black text-xs tracking-wide shadow-lg active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Undo2 className="w-4 h-4" />
                  <span>UNDO MOVE</span>
                </button>
              )}
              <button
                onClick={() => resetGame()}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-xs tracking-wide shadow-lg active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>TRY AGAIN</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. BOTTOM CONTROLS & MOBILE D-PAD */}
      <div className="w-full flex flex-col items-center gap-2 mt-3 select-none touch-none">
        {/* Mobile Directional Buttons */}
        <div className="flex items-center gap-2">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              move('left');
            }}
            className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center font-black text-lg shadow-md active:scale-90 transition-transform"
            title="Move Left"
          >
            ◀
          </button>

          <div className="flex flex-col gap-2">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                move('up');
              }}
              className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center font-black text-lg shadow-md active:scale-90 transition-transform"
              title="Move Up"
            >
              ▲
            </button>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                move('down');
              }}
              className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center font-black text-lg shadow-md active:scale-90 transition-transform"
              title="Move Down"
            >
              ▼
            </button>
          </div>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              move('right');
            }}
            className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center font-black text-lg shadow-md active:scale-90 transition-transform"
            title="Move Right"
          >
            ▶
          </button>
        </div>

        <div className="text-center text-slate-400 text-xs font-bold">
          <span className="text-cyan-400">SWIPE</span> or use buttons to merge tiles
        </div>
      </div>
    </div>
  </div>
  );
};
