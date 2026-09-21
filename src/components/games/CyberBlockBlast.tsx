import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  Award,
  Crown,
  Flame,
  Grid
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

const GRID_SIZE = 8;

export interface BlockShape {
  id: string;
  matrix: number[][]; // 1 = filled, 0 = empty
  color: string;
  shadowColor: string;
}

const SHAPE_DEFINITIONS: { matrix: number[][]; color: string; shadowColor: string }[] = [
  // 1x1 Dot
  { matrix: [[1]], color: '#38bdf8', shadowColor: '#0284c7' },
  // 2x1 & 1x2 Bars
  { matrix: [[1, 1]], color: '#34d399', shadowColor: '#059669' },
  { matrix: [[1], [1]], color: '#34d399', shadowColor: '#059669' },
  // 3x1 & 1x3 Bars
  { matrix: [[1, 1, 1]], color: '#facc15', shadowColor: '#d97706' },
  { matrix: [[1], [1], [1]], color: '#facc15', shadowColor: '#d97706' },
  // 4x1 & 1x4 Bars
  { matrix: [[1, 1, 1, 1]], color: '#f472b6', shadowColor: '#db2777' },
  { matrix: [[1], [1], [1], [1]], color: '#f472b6', shadowColor: '#db2777' },
  // 5x1 & 1x5 Bars
  { matrix: [[1, 1, 1, 1, 1]], color: '#c084fc', shadowColor: '#9333ea' },
  { matrix: [[1], [1], [1], [1], [1]], color: '#c084fc', shadowColor: '#9333ea' },
  // 2x2 Square
  { matrix: [[1, 1], [1, 1]], color: '#fb923c', shadowColor: '#ea580c' },
  // 3x3 Square
  { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: '#ec4899', shadowColor: '#be185d' },
  // L-Shapes (2x2 corner)
  { matrix: [[1, 0], [1, 1]], color: '#22d3ee', shadowColor: '#0891b2' },
  { matrix: [[0, 1], [1, 1]], color: '#22d3ee', shadowColor: '#0891b2' },
  { matrix: [[1, 1], [1, 0]], color: '#22d3ee', shadowColor: '#0891b2' },
  { matrix: [[1, 1], [0, 1]], color: '#22d3ee', shadowColor: '#0891b2' },
  // 3x3 L-Shapes
  { matrix: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], color: '#a78bfa', shadowColor: '#7c3aed' },
  { matrix: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], color: '#a78bfa', shadowColor: '#7c3aed' },
  { matrix: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], color: '#a78bfa', shadowColor: '#7c3aed' },
  { matrix: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], color: '#a78bfa', shadowColor: '#7c3aed' },
  // T-Shapes
  { matrix: [[1, 1, 1], [0, 1, 0]], color: '#f87171', shadowColor: '#dc2626' },
  { matrix: [[0, 1, 0], [1, 1, 1]], color: '#f87171', shadowColor: '#dc2626' },
  // Plus Shape
  { matrix: [[0, 1, 0], [1, 1, 1], [0, 1, 0]], color: '#4ade80', shadowColor: '#16a34a' },
];

const getRandomShape = (idPrefix: string): BlockShape => {
  const def = SHAPE_DEFINITIONS[Math.floor(Math.random() * SHAPE_DEFINITIONS.length)];
  return {
    id: `${idPrefix}-${Math.random().toString(36).substring(2, 9)}`,
    matrix: def.matrix,
    color: def.color,
    shadowColor: def.shadowColor,
  };
};

export const CyberBlockBlast: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Board Grid (8x8): null = empty, string = block color
  const [grid, setGrid] = useState<(string | null)[][]>(() =>
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))
  );

  // 3 Available Hand Shapes
  const [hand, setHand] = useState<(BlockShape | null)[]>([
    getRandomShape('init-1'),
    getRandomShape('init-2'),
    getRandomShape('init-3'),
  ]);

  // Interaction State
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  // Scores
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cyber_block_blast_high') || '0', 10);
  });
  const [comboStreak, setComboStreak] = useState<number>(0);
  const [comboBanner, setComboBanner] = useState<string>('');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Check if a shape can be placed at a specific board position
  const canPlaceShape = useCallback(
    (shape: BlockShape, startRow: number, startCol: number, currentGrid: (string | null)[][]): boolean => {
      const rows = shape.matrix.length;
      const cols = shape.matrix[0].length;

      if (startRow + rows > GRID_SIZE || startCol + cols > GRID_SIZE) return false;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (shape.matrix[r][c] === 1) {
            if (currentGrid[startRow + r][startCol + c] !== null) {
              return false;
            }
          }
        }
      }
      return true;
    },
    []
  );

  // Check if any shape in hand can be placed on the current board
  const checkGameOver = useCallback(
    (currentHand: (BlockShape | null)[], currentGrid: (string | null)[][]): boolean => {
      const availableShapes = currentHand.filter((s): s is BlockShape => s !== null);
      if (availableShapes.length === 0) return false;

      for (const shape of availableShapes) {
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (canPlaceShape(shape, r, c, currentGrid)) {
              return false; // Still can place!
            }
          }
        }
      }
      return true; // No moves left!
    },
    [canPlaceShape]
  );

  // Place Selected Shape onto Grid
  const placeShape = (shapeIndex: number, targetRow: number, targetCol: number) => {
    const shape = hand[shapeIndex];
    if (!shape) return;

    if (!canPlaceShape(shape, targetRow, targetCol, grid)) {
      sound.playClick();
      return;
    }

    sound.playHit();

    // 1. Copy and place tiles
    const nextGrid = grid.map((r) => [...r]);
    let placedBlockCount = 0;

    for (let r = 0; r < shape.matrix.length; r++) {
      for (let c = 0; c < shape.matrix[0].length; c++) {
        if (shape.matrix[r][c] === 1) {
          nextGrid[targetRow + r][targetCol + c] = shape.color;
          placedBlockCount++;
        }
      }
    }

    // 2. Check full rows and columns
    const fullRows: number[] = [];
    const fullCols: number[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      if (nextGrid[r].every((cell) => cell !== null)) {
        fullRows.push(r);
      }
    }

    for (let c = 0; c < GRID_SIZE; c++) {
      let isFull = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (nextGrid[r][c] === null) {
          isFull = false;
          break;
        }
      }
      if (isFull) fullCols.push(c);
    }

    const totalLinesCleared = fullRows.length + fullCols.length;

    // 3. Clear the full rows and columns
    if (totalLinesCleared > 0) {
      fullRows.forEach((r) => {
        for (let c = 0; c < GRID_SIZE; c++) {
          nextGrid[r][c] = null;
        }
      });
      fullCols.forEach((c) => {
        for (let r = 0; r < GRID_SIZE; r++) {
          nextGrid[r][c] = null;
        }
      });

      // Score Calculation with Combos
      const newStreak = comboStreak + 1;
      setComboStreak(newStreak);

      const baseScore = totalLinesCleared * 100 * (totalLinesCleared >= 2 ? totalLinesCleared : 1);
      const comboBonus = newStreak > 1 ? newStreak * 150 : 0;
      const roundScore = placedBlockCount * 10 + baseScore + comboBonus;

      const newTotalScore = score + roundScore;
      setScore(newTotalScore);
      if (newTotalScore > highScore) {
        setHighScore(newTotalScore);
        localStorage.setItem('cyber_block_blast_high', newTotalScore.toString());
      }

      // Combo Text & Sound Feedback
      if (totalLinesCleared >= 3 || newStreak >= 3) {
        sound.playWin();
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        setComboBanner(totalLinesCleared >= 3 ? `💥 TRIPLE BLAST! +${roundScore}` : `🔥 COMBO x${newStreak}! +${roundScore}`);
      } else if (totalLinesCleared === 2) {
        sound.playCollect();
        setComboBanner(`⚡ DOUBLE BLAST! +${roundScore}`);
      } else {
        sound.playCollect();
        setComboBanner(`✨ LINE CLEAR! +${roundScore}`);
      }
    } else {
      setComboStreak(0);
      setComboBanner('');
      const roundScore = placedBlockCount * 10;
      const newTotalScore = score + roundScore;
      setScore(newTotalScore);
      if (newTotalScore > highScore) {
        setHighScore(newTotalScore);
        localStorage.setItem('cyber_block_blast_high', newTotalScore.toString());
      }
    }

    // 4. Remove used shape from hand
    const nextHand = [...hand];
    nextHand[shapeIndex] = null;

    // If all 3 shapes used, deal 3 fresh shapes!
    if (nextHand.every((s) => s === null)) {
      nextHand[0] = getRandomShape('deal-1');
      nextHand[1] = getRandomShape('deal-2');
      nextHand[2] = getRandomShape('deal-3');
    }

    setGrid(nextGrid);
    setHand(nextHand);
    setSelectedShapeIndex(null);
    setHoverRow(null);
    setHoverCol(null);

    // 5. Check Game Over
    if (checkGameOver(nextHand, nextGrid)) {
      setIsGameOver(true);
      sound.playGameOver();
    }
  };

  // Restart Game
  const restartGame = () => {
    sound.playClick();
    setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
    setHand([getRandomShape('r-1'), getRandomShape('r-2'), getRandomShape('r-3')]);
    setScore(0);
    setComboStreak(0);
    setComboBanner('');
    setSelectedShapeIndex(null);
    setHoverRow(null);
    setHoverCol(null);
    setIsGameOver(false);
  };

  // Preview Grid Calculation
  const selectedShape = selectedShapeIndex !== null ? hand[selectedShapeIndex] : null;
  const isPreviewValid =
    selectedShape && hoverRow !== null && hoverCol !== null
      ? canPlaceShape(selectedShape, hoverRow, hoverCol, grid)
      : false;

  return (
    <div
      ref={containerRef}
      id="cyber-block-blast-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1 sm:px-2 py-1"
    >
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & SCORE BAR */}
      {/* ========================================================================= */}
      <div className="w-full mb-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl flex items-center justify-between">
        {/* Current Score */}
        <div className="text-left">
          <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">SCORE</div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono leading-none tracking-tight">
            {score}
          </div>
        </div>

        {/* Combo Banner or Logo */}
        <div className="text-center">
          {comboBanner ? (
            <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black animate-bounce">
              {comboBanner}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-400 text-xs font-bold font-mono">
              <Grid className="w-4 h-4 text-cyan-400" /> 8x8 GRID BLAST
            </div>
          )}
        </div>

        {/* High Score & Mute */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] uppercase font-black text-amber-400 tracking-wider flex items-center justify-end gap-1">
              <Crown className="w-3 h-3 text-amber-400" /> BEST
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono leading-none">
              {highScore}
            </div>
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

      {/* ========================================================================= */}
      {/* 2. 8X8 HOLOGRAPHIC GRID BOARD */}
      {/* ========================================================================= */}
      <div className="relative w-full max-w-[440px] p-2 sm:p-3 rounded-3xl bg-slate-950/90 border-2 border-cyan-500/40 shadow-2xl shadow-cyan-950/50 backdrop-blur-xl">
        <div className="grid grid-cols-8 gap-1 sm:gap-1.5 w-full">
          {grid.map((row, r) =>
            row.map((cellColor, c) => {
              // Check if part of the preview placement
              let isPreviewCell = false;
              let previewColor = '#38bdf8';

              if (selectedShape && hoverRow !== null && hoverCol !== null) {
                const shapeR = r - hoverRow;
                const shapeC = c - hoverCol;
                if (
                  shapeR >= 0 &&
                  shapeR < selectedShape.matrix.length &&
                  shapeC >= 0 &&
                  shapeC < selectedShape.matrix[0].length
                ) {
                  if (selectedShape.matrix[shapeR][shapeC] === 1) {
                    isPreviewCell = true;
                    previewColor = selectedShape.color;
                  }
                }
              }

              return (
                <button
                  key={`${r}-${c}`}
                  onPointerEnter={() => {
                    if (selectedShapeIndex !== null) {
                      setHoverRow(r);
                      setHoverCol(c);
                    }
                  }}
                  onClick={() => {
                    if (selectedShapeIndex !== null) {
                      placeShape(selectedShapeIndex, r, c);
                    }
                  }}
                  className={`w-full aspect-square rounded-lg sm:rounded-xl transition-all duration-150 relative overflow-hidden flex items-center justify-center ${
                    cellColor
                      ? 'shadow-md shadow-cyan-500/20 scale-100 border border-white/40'
                      : isPreviewCell
                      ? isPreviewValid
                        ? 'opacity-80 scale-95 border-2 border-white animate-pulse'
                        : 'bg-rose-500/30 border-2 border-rose-500'
                      : 'bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/60'
                  }`}
                  style={{
                    backgroundColor: cellColor || (isPreviewCell && isPreviewValid ? previewColor : undefined),
                  }}
                >
                  {cellColor && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/30 pointer-events-none rounded-lg sm:rounded-xl" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 3 HAND PIECES TRAY */}
      {/* ========================================================================= */}
      <div className="w-full mt-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-xl flex items-center justify-around gap-2">
        {hand.map((shape, idx) => {
          if (!shape) {
            return (
              <div
                key={idx}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center opacity-40"
              />
            );
          }

          const isSelected = selectedShapeIndex === idx;

          return (
            <button
              key={shape.id}
              onClick={() => {
                sound.playClick();
                setSelectedShapeIndex(isSelected ? null : idx);
                setHoverRow(null);
                setHoverCol(null);
              }}
              className={`w-24 h-24 sm:w-28 sm:h-28 p-2 rounded-2xl border flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-slate-800 border-cyan-400 shadow-lg shadow-cyan-500/40 scale-105'
                  : 'bg-slate-950/70 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
              }`}
            >
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${shape.matrix[0].length}, minmax(0, 1fr))`,
                }}
              >
                {shape.matrix.map((row, r) =>
                  row.map((val, c) => (
                    <div
                      key={`${r}-${c}`}
                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md ${
                        val === 1 ? 'shadow-sm border border-white/40' : 'opacity-0'
                      }`}
                      style={{
                        backgroundColor: val === 1 ? shape.color : 'transparent',
                      }}
                    />
                  ))
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Piece Instructions Tip */}
      <div className="mt-2 text-center text-xs font-bold text-slate-400">
        {selectedShapeIndex !== null ? (
          <span className="text-cyan-300 animate-pulse">👆 Tap any grid cell to drop the selected shape!</span>
        ) : (
          <span>Select any of the 3 shapes below, then tap the grid to place!</span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. GAME OVER MODAL */}
      {/* ========================================================================= */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border-2 border-cyan-500/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/30">
              <Award className="w-9 h-9 text-cyan-400" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">NO MORE MOVES!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GAME OVER</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-white font-mono text-base font-black">{score}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-800 pt-2">
                <span>All-Time High Score:</span>
                <span className="text-amber-300 font-mono text-base font-black">{highScore}</span>
              </div>
            </div>

            <button
              onClick={restartGame}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 active:scale-95 text-white font-black text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" /> PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
