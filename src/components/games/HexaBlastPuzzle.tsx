import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Award, Grid, Sparkles, Trophy, Shuffle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface Props {
  onGameOver?: (score: number) => void;
}

interface Tile {
  id: number;
  row: number;
  col: number;
  value: number; // 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048
  isNew?: boolean;
  isMerged?: boolean;
}

const TILE_COLORS: Record<number, { bg: string; text: string; glow: string }> = {
  2: { bg: 'bg-slate-800 border-cyan-500/30', text: 'text-cyan-300', glow: '#06b6d4' },
  4: { bg: 'bg-cyan-950/60 border-cyan-500/50', text: 'text-cyan-200', glow: '#22d3ee' },
  8: { bg: 'bg-teal-950/70 border-teal-500/60', text: 'text-teal-200', glow: '#2dd4bf' },
  16: { bg: 'bg-emerald-950/70 border-emerald-500/60', text: 'text-emerald-300', glow: '#34d399' },
  32: { bg: 'bg-green-950/70 border-green-500/60', text: 'text-green-300', glow: '#4ade80' },
  64: { bg: 'bg-amber-950/80 border-amber-500/70', text: 'text-amber-300', glow: '#fde047' },
  128: { bg: 'bg-orange-950/80 border-orange-500/80', text: 'text-orange-300', glow: '#fb923c' },
  256: { bg: 'bg-rose-950/80 border-rose-500/80', text: 'text-rose-300', glow: '#f43f5e' },
  512: { bg: 'bg-purple-950/80 border-purple-500/80', text: 'text-purple-300', glow: '#c084fc' },
  1024: { bg: 'bg-fuchsia-950/90 border-fuchsia-500', text: 'text-fuchsia-200', glow: '#e879f9' },
  2048: { bg: 'bg-yellow-500 border-yellow-300 shadow-xl shadow-yellow-500/50', text: 'text-slate-950 font-black', glow: '#eab308' },
  4096: { bg: 'bg-gradient-to-tr from-cyan-400 to-fuchsia-500 border-white', text: 'text-slate-950 font-black', glow: '#38bdf8' },
};

export const HexaBlastPuzzle: React.FC<Props> = ({ onGameOver }) => {
  const [board, setBoard] = useState<(Tile | null)[][]>(Array(4).fill(null).map(() => Array(4).fill(null)));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'won'>('idle');
  const [muted, setMuted] = useState(sound.isMuted());
  const [maxTile, setMaxTile] = useState(2);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const nextTileId = useRef(1);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('novaplay_hexa_2048_highscore');
    if (saved) {
      const val = parseInt(saved, 10);
      setHighScore(val);
    }
  }, []);

  const spawnTile = useCallback((currentBoard: (Tile | null)[][]): { board: (Tile | null)[][]; spawned: boolean } => {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!currentBoard[r][c]) {
          emptyCells.push({ r, c });
        }
      }
    }
    if (emptyCells.length === 0) return { board: currentBoard, spawned: false };

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const val = Math.random() < 0.85 ? 2 : 4;

    const newBoard = currentBoard.map((row) => [...row]);
    newBoard[randomCell.r][randomCell.c] = {
      id: nextTileId.current++,
      row: randomCell.r,
      col: randomCell.c,
      value: val,
      isNew: true,
    };
    return { board: newBoard, spawned: true };
  }, []);

  const startNewGame = useCallback(() => {
    let newBoard: (Tile | null)[][] = Array(4).fill(null).map(() => Array(4).fill(null));
    const first = spawnTile(newBoard);
    const second = spawnTile(first.board);
    setBoard(second.board);
    setScore(0);
    setMaxTile(4);
    setIsNewHigh(false);
    setGameState('playing');
    sound.playPowerup();
  }, [spawnTile]);

  const checkGameOver = (currentBoard: (Tile | null)[][]): boolean => {
    // Check if any empty cell
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!currentBoard[r][c]) return false;
      }
    }
    // Check possible merges horizontal or vertical
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = currentBoard[r][c]?.value;
        if (r < 3 && currentBoard[r + 1][c]?.value === val) return false;
        if (c < 3 && currentBoard[r][c + 1]?.value === val) return false;
      }
    }
    return true;
  };

  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameState !== 'playing') return;

    let moved = false;
    let gainedScore = 0;
    let highestTile = maxTile;

    const newBoard: (Tile | null)[][] = board.map((row) =>
      row.map((cell) => (cell ? { ...cell, isNew: false, isMerged: false } : null))
    );

    const slideAndMergeRow = (row: (Tile | null)[]): (Tile | null)[] => {
      // Filter out nulls
      const tiles = row.filter((t): t is Tile => t !== null);
      const result: (Tile | null)[] = [];

      for (let i = 0; i < tiles.length; i++) {
        if (i < tiles.length - 1 && tiles[i].value === tiles[i + 1].value) {
          const mergedVal = tiles[i].value * 2;
          gainedScore += mergedVal;
          if (mergedVal > highestTile) highestTile = mergedVal;
          result.push({
            id: nextTileId.current++,
            row: 0,
            col: 0,
            value: mergedVal,
            isMerged: true,
          });
          i++; // Skip merged partner
          moved = true;
        } else {
          result.push({ ...tiles[i] });
        }
      }

      while (result.length < 4) {
        result.push(null);
      }
      return result;
    };

    if (direction === 'left') {
      for (let r = 0; r < 4; r++) {
        const oldRow = newBoard[r];
        const newRow = slideAndMergeRow(oldRow);
        for (let c = 0; c < 4; c++) {
          if (oldRow[c]?.value !== newRow[c]?.value) moved = true;
          newBoard[r][c] = newRow[c];
        }
      }
    } else if (direction === 'right') {
      for (let r = 0; r < 4; r++) {
        const oldRow = [...newBoard[r]].reverse();
        const newRow = slideAndMergeRow(oldRow).reverse();
        for (let c = 0; c < 4; c++) {
          if (newBoard[r][c]?.value !== newRow[c]?.value) moved = true;
          newBoard[r][c] = newRow[c];
        }
      }
    } else if (direction === 'up') {
      for (let c = 0; c < 4; c++) {
        const oldCol = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]];
        const newCol = slideAndMergeRow(oldCol);
        for (let r = 0; r < 4; r++) {
          if (newBoard[r][c]?.value !== newCol[r]?.value) moved = true;
          newBoard[r][c] = newCol[r];
        }
      }
    } else if (direction === 'down') {
      for (let c = 0; c < 4; c++) {
        const oldCol = [newBoard[3][c], newBoard[2][c], newBoard[1][c], newBoard[0][c]];
        const newCol = slideAndMergeRow(oldCol).reverse();
        for (let r = 0; r < 4; r++) {
          if (newBoard[r][c]?.value !== newCol[r]?.value) moved = true;
          newBoard[r][c] = newCol[r];
        }
      }
    }

    if (moved) {
      sound.playJump();
      if (gainedScore > 0) {
        sound.playCollect();
      }

      const { board: spawnedBoard } = spawnTile(newBoard);
      setBoard(spawnedBoard);
      const newTotalScore = score + gainedScore;
      setScore(newTotalScore);
      setMaxTile(highestTile);

      if (newTotalScore > highScore) {
        setHighScore(newTotalScore);
        localStorage.setItem('novaplay_hexa_2048_highscore', String(newTotalScore));
        setIsNewHigh(true);
      }

      if (highestTile >= 2048 && gameState !== 'won') {
        setGameState('won');
        confetti({ particleCount: 120, spread: 80 });
      } else if (checkGameOver(spawnedBoard)) {
        setGameState('gameover');
        sound.playExplosion();
        if (onGameOver) onGameOver(newTotalScore);
      }
    }
  }, [board, gameState, highScore, maxTile, onGameOver, score, spawnTile]);

  // Touch Swipe Gesture handler
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 30) {
      if (absDx > absDy) {
        if (dx > 0) move('right');
        else move('left');
      } else {
        if (dy > 0) move('down');
        else move('up');
      }
    }
    touchStartRef.current = null;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move('left');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move('right');
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') move('up');
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') move('down');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center select-none">
      <div className="relative w-full max-w-[540px] flex flex-col items-center select-none">
        {/* Top HUD */}
      <div className="w-full mb-3 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-white backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-slate-950 text-xs">
            2048
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">MAX TILE</div>
            <div className="text-sm font-black text-emerald-400 tabular-nums">{maxTile}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
            <div className="text-[9px] text-slate-400 font-bold uppercase">SCORE</div>
            <div className="text-base font-black text-cyan-400 tabular-nums">{score}</div>
          </div>
          <div className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
            <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1 justify-center">
              <Award className="w-3 h-3 text-amber-400" /> BEST
            </div>
            <div className="text-base font-black text-amber-400 tabular-nums">{highScore}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const m = sound.toggleMute();
              setMuted(m);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
          <button
            onClick={startNewGame}
            title="Restart Game"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Board Stage */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full aspect-square p-3 sm:p-4 rounded-3xl bg-slate-900 border-2 border-slate-800 shadow-2xl shadow-emerald-950/20 flex flex-col justify-between"
      >
        <div className="grid grid-cols-4 grid-rows-4 gap-2.5 sm:gap-3 w-full h-full">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const tileColor = cell ? TILE_COLORS[cell.value] || TILE_COLORS[4096] : null;
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className="relative rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-center overflow-hidden"
                >
                  {cell && tileColor && (
                    <div
                      className={`w-full h-full rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg transition-transform duration-100 ${
                        tileColor.bg
                      } ${tileColor.text} ${cell.isNew ? 'scale-90 animate-in fade-in zoom-in-75' : ''} ${
                        cell.isMerged ? 'scale-105 animate-pulse' : ''
                      }`}
                    >
                      <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
                        {cell.value}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Start / Idle Screen */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/25">
              <Grid className="w-9 h-9 text-slate-950" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">HEXA BLAST 2048</h2>
            <p className="text-slate-300 text-sm max-w-xs mb-6">
              Slide matching neon tiles to merge numbers and reach the mythical 2048 diamond block!
            </p>
            <button
              onClick={startNewGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base flex items-center gap-2 shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>PLAY 2048 NOW</span>
            </button>
          </div>
        )}

        {/* Victory Screen */}
        {gameState === 'won' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 border border-yellow-500/60 flex items-center justify-center mb-3">
              <Trophy className="w-9 h-9 text-yellow-400" />
            </div>
            <h2 className="text-3xl font-black text-yellow-400 mb-1">YOU REACHED 2048!</h2>
            <p className="text-slate-300 text-sm mb-6">You are a grandmaster of puzzle calculations!</p>
            <div className="flex gap-3">
              <button
                onClick={() => setGameState('playing')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
              >
                Keep Playing
              </button>
              <button
                onClick={startNewGame}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
              >
                New Game
              </button>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center z-20">
            <h2 className="text-3xl font-black text-white mb-2">NO MORE MOVES</h2>
            <p className="text-slate-400 text-sm mb-4">Board is completely filled!</p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">SCORE</div>
                <div className="text-xl font-black text-cyan-400">{score}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">BEST</div>
                <div className="text-xl font-black text-amber-400">{highScore}</div>
              </div>
            </div>
            {isNewHigh && (
              <div className="mb-4 text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-400/50 px-3 py-1 rounded-full animate-bounce">
                🎉 NEW HIGH SCORE RECORD!
              </div>
            )}
            <button
              onClick={startNewGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base flex items-center gap-2 shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
            >
              <RotateCcw className="w-5 h-5" />
              <span>TRY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* On-screen Directional Touch Controls for Mobile */}
      <div className="w-full mt-4 grid grid-cols-3 gap-2 max-w-[280px] select-none touch-none">
        <div />
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            move('up');
          }}
          className="p-3.5 rounded-xl bg-slate-800/90 active:bg-cyan-500 active:text-slate-950 text-white flex items-center justify-center font-bold text-lg shadow-md active:scale-90 transition-transform"
        >
          ▲
        </button>
        <div />
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            move('left');
          }}
          className="p-3.5 rounded-xl bg-slate-800/90 active:bg-cyan-500 active:text-slate-950 text-white flex items-center justify-center font-bold text-lg shadow-md active:scale-90 transition-transform"
        >
          ◀
        </button>
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            move('down');
          }}
          className="p-3.5 rounded-xl bg-slate-800/90 active:bg-cyan-500 active:text-slate-950 text-white flex items-center justify-center font-bold text-lg shadow-md active:scale-90 transition-transform"
        >
          ▼
        </button>
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            move('right');
          }}
          className="p-3.5 rounded-xl bg-slate-800/90 active:bg-cyan-500 active:text-slate-950 text-white flex items-center justify-center font-bold text-lg shadow-md active:scale-90 transition-transform"
        >
          ▶
        </button>
      </div>
    </div>
  </div>
  );
};
