import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Award,
  Zap,
  Flame,
  Sparkles,
  Play,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

interface Pin {
  id: number;
  x: number; // -1 to 1 (normalized across lane width)
  z: number; // 0.85 to 1.0 (depth on pin deck)
  vx: number;
  vz: number;
  rot: number;
  rotV: number;
  isDown: boolean;
}

interface FrameScore {
  roll1: number | null;
  roll2: number | null;
  roll3?: number | null; // For 10th frame
  score: number | null;
  isStrike: boolean;
  isSpare: boolean;
}

export const CyberNeonBowling: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Match State
  const [currentFrame, setCurrentFrame] = useState<number>(1);
  const [currentRoll, setCurrentRoll] = useState<1 | 2 | 3>(1);
  const [frames, setFrames] = useState<FrameScore[]>(() =>
    Array(10)
      .fill(null)
      .map(() => ({ roll1: null, roll2: null, score: null, isStrike: false, isSpare: false }))
  );
  const [totalScore, setTotalScore] = useState<number>(0);
  const [ballPosX, setBallPosX] = useState<number>(0); // -0.8 to 0.8 on lane
  const [ballSpin, setBallSpin] = useState<number>(0); // -1 (hook left) to +1 (hook right)
  const [isThrowing, setIsThrowing] = useState<boolean>(false);
  const [bannerText, setBannerText] = useState<string>('');
  const [isMatchOver, setIsMatchOver] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // 10 Standard Bowling Pins Layout
  const initPins = (): Pin[] => [
    // Row 1 (Headpin 1)
    { id: 1, x: 0, z: 0.86, vx: 0, vz: 0, rot: 0, rotV: 0, isDown: false },
    // Row 2 (Pins 2, 3)
    { id: 2, x: -0.14, z: 0.90, vx: 0, vz: 0, rot: 0, rotV: 0, isDown: false },
    { id: 3, x: 0.14, z: 0.90, vx: 0, vz: 0, rot: 0, rotV: 0, isDown: false },
    // Row 3 (Pins 4, 5, 6)
    { id: 4, x: -0.28, z: 0.94, vx: 0, vz: 0, rot: 0, rotV: 0, isDown: false },
    { id: 5, x: 0, z: 0.94, vx: 0, vz: 0, rot: 0, rotV: 0, isDown: false },
    { id: 6, x: 0.28, z: 0.94, vx: 0, vz: 0, rot: 0, rotV: 0, isDown: false },
    // Row 4 (Pins 7, 8, 9, 10)
    { id: 7, x: -0.42, z: 0.98, vx: 0, vz: 0, rot: 0, rotV: 0, isDown: false },
    { id: 8, x: -0.14, z: 0.98, vx: 0, vz: 0, rot: 0, rotV: 0, isDown: false },
    { id: 9, x: 0.14, z: 0.98, vx: 0, vz: 0, rot: 0, rotV: 0, isDown: false },
    { id: 10, x: 0.42, z: 0.98, vx: 0, vz: 0, rot: 0, rotV: 0, isDown: false },
  ];

  // 60 FPS Physics State Ref
  const engineRef = useRef<{
    ballX: number;
    ballZ: number; // 0 = at foul line, 1 = at pit
    ballVx: number;
    ballVz: number;
    ballSpin: number;
    inGutter: boolean;
    ballActive: boolean;
    pins: Pin[];
    particles: { x: number; y: number; vx: number; vy: number; color: string; alpha: number }[];
  }>({
    ballX: 0,
    ballZ: 0,
    ballVx: 0,
    ballVz: 0,
    ballSpin: 0,
    inGutter: false,
    ballActive: false,
    pins: initPins(),
    particles: [],
  });

  // Calculate Cumulative Bowling Score (Standard USBC Rules)
  const calculateScores = (fList: FrameScore[]): number => {
    let running = 0;
    const rolls: number[] = [];

    fList.forEach((f) => {
      if (f.roll1 !== null) rolls.push(f.roll1);
      if (f.roll2 !== null) rolls.push(f.roll2);
      if (f.roll3 !== null && f.roll3 !== undefined) rolls.push(f.roll3);
    });

    let rollIdx = 0;
    for (let i = 0; i < 10; i++) {
      if (rollIdx >= rolls.length) break;

      if (rolls[rollIdx] === 10) {
        // Strike: 10 + next 2 rolls
        if (rollIdx + 2 < rolls.length) {
          running += 10 + rolls[rollIdx + 1] + rolls[rollIdx + 2];
        }
        rollIdx += 1;
      } else if (rollIdx + 1 < rolls.length && rolls[rollIdx] + rolls[rollIdx + 1] === 10) {
        // Spare: 10 + next 1 roll
        if (rollIdx + 2 < rolls.length) {
          running += 10 + rolls[rollIdx + 2];
        }
        rollIdx += 2;
      } else if (rollIdx + 1 < rolls.length) {
        // Open frame
        running += rolls[rollIdx] + rolls[rollIdx + 1];
        rollIdx += 2;
      }
    }
    return running;
  };

  // Launch Bowling Ball
  const launchBall = (powerMultiplier = 1.0) => {
    if (isThrowing || isMatchOver) return;

    sound.playHit();
    setIsThrowing(true);
    setBannerText('');

    const eng = engineRef.current;
    eng.ballX = ballPosX;
    eng.ballZ = 0.05;
    eng.ballSpin = ballSpin * 0.0035;
    eng.ballVx = eng.ballSpin * 0.5;
    eng.ballVz = 0.022 * powerMultiplier;
    eng.inGutter = false;
    eng.ballActive = true;
  };

  // Process Roll Results after ball finishes
  const processRollResult = useCallback(() => {
    const eng = engineRef.current;
    eng.ballActive = false;

    const standingPins = eng.pins.filter((p) => !p.isDown);
    const pinsDownTotal = 10 - standingPins.length;

    const frameIdx = currentFrame - 1;
    const currentFrameData = frames[frameIdx];
    const prevDown = currentRoll === 2 && currentFrameData.roll1 !== null ? currentFrameData.roll1 : 0;
    const pinsKnockedThisRoll = Math.max(0, pinsDownTotal - prevDown);

    const isStrike = currentRoll === 1 && pinsKnockedThisRoll === 10;
    const isSpare = currentRoll === 2 && prevDown + pinsKnockedThisRoll === 10;

    // Sound & Banners
    if (isStrike) {
      sound.playWin();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      setBannerText('⚡ STRIKE! ⚡');
    } else if (isSpare) {
      sound.playCollect();
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      setBannerText('✨ SPARE! ✨');
    } else if (pinsKnockedThisRoll === 0) {
      setBannerText('GUTTER BALL');
    } else {
      sound.playHit();
      setBannerText(`${pinsKnockedThisRoll} PINS`);
    }

    // Update Frames Array
    const nextFrames = frames.map((f, i) => {
      if (i !== frameIdx) return f;
      if (currentRoll === 1) {
        return {
          ...f,
          roll1: pinsKnockedThisRoll,
          isStrike,
        };
      } else {
        return {
          ...f,
          roll2: pinsKnockedThisRoll,
          isSpare,
        };
      }
    });

    const newTotal = calculateScores(nextFrames);
    setTotalScore(newTotal);
    setFrames(nextFrames);

    // Determine Next Frame / Match End
    setTimeout(() => {
      if (currentFrame >= 10) {
        // End of Match
        setIsMatchOver(true);
        sound.playFinishFanfare();
        confetti({ particleCount: 180, spread: 90, origin: { y: 0.5 } });
      } else if (isStrike || currentRoll === 2) {
        // Next Frame
        setCurrentFrame((prev) => prev + 1);
        setCurrentRoll(1);
        eng.pins = initPins();
      } else {
        // Second Roll in current frame
        setCurrentRoll(2);
        // Retain only standing pins
        eng.pins.forEach((p) => {
          if (p.isDown) {
            p.x = 999; // remove knocked pins off deck
          }
        });
      }
      setIsThrowing(false);
    }, 1800);
  }, [currentFrame, currentRoll, frames]);

  // Restart Bowling Match
  const restartMatch = () => {
    sound.playClick();
    setCurrentFrame(1);
    setCurrentRoll(1);
    setFrames(
      Array(10)
        .fill(null)
        .map(() => ({ roll1: null, roll2: null, score: null, isStrike: false, isSpare: false }))
    );
    setTotalScore(0);
    setBallPosX(0);
    setBallSpin(0);
    setIsThrowing(false);
    setBannerText('');
    setIsMatchOver(false);
    engineRef.current.pins = initPins();
  };

  // 60 FPS 3D Bowling Lane Physics & Renderer
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const eng = engineRef.current;
      const W = 540;
      const H = 780;

      // 1. Ambient Dark Neon Alley Background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, W, H);

      // Neon Top Lighting
      const alleyGrad = ctx.createLinearGradient(0, 0, 0, H);
      alleyGrad.addColorStop(0, '#090d1f');
      alleyGrad.addColorStop(0.3, '#0b1120');
      alleyGrad.addColorStop(1, '#020617');
      ctx.fillStyle = alleyGrad;
      ctx.fillRect(0, 0, W, H);

      // 2. 3D Perspective Bowling Lane (Glossy Wood Parquet)
      // Top at Z=1.0 (Y=160, Width=160), Bottom at Z=0.0 (Y=720, Width=400)
      const topW = 160;
      const topY = 160;
      const botW = 400;
      const botY = 720;
      const centerX = W / 2;

      // Outer Gutters
      ctx.fillStyle = '#0f172a';
      // Left Gutter
      ctx.beginPath();
      ctx.moveTo(centerX - topW / 2 - 35, topY);
      ctx.lineTo(centerX - topW / 2, topY);
      ctx.lineTo(centerX - botW / 2, botY);
      ctx.lineTo(centerX - botW / 2 - 55, botY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Right Gutter
      ctx.beginPath();
      ctx.moveTo(centerX + topW / 2, topY);
      ctx.lineTo(centerX + topW / 2 + 35, topY);
      ctx.lineTo(centerX + botW / 2 + 55, botY);
      ctx.lineTo(centerX + botW / 2, botY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Wooden Lane Deck
      const woodGrad = ctx.createLinearGradient(0, topY, 0, botY);
      woodGrad.addColorStop(0, '#78350f');
      woodGrad.addColorStop(0.5, '#92400e');
      woodGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = woodGrad;

      ctx.beginPath();
      ctx.moveTo(centerX - topW / 2, topY);
      ctx.lineTo(centerX + topW / 2, topY);
      ctx.lineTo(centerX + botW / 2, botY);
      ctx.lineTo(centerX - botW / 2, botY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Lane Guide Arrows (Chevrons)
      ctx.fillStyle = '#f59e0b';
      const arrowY = 480;
      for (let i = -3; i <= 3; i++) {
        const ax = centerX + i * 40;
        ctx.beginPath();
        ctx.moveTo(ax, arrowY);
        ctx.lineTo(ax - 6, arrowY + 14);
        ctx.lineTo(ax + 6, arrowY + 14);
        ctx.closePath();
        ctx.fill();
      }

      // Foul Line (Bottom)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX - botW / 2, botY - 30);
      ctx.lineTo(centerX + botW / 2, botY - 30);
      ctx.stroke();

      // 3. 3D Pin Deck & Pins
      eng.pins.forEach((pin) => {
        if (pin.x > 50) return; // knocked off screen

        // Map 3D Pin coords to 2D screen
        const pinZ = pin.z;
        const currentLaneW = topW + (botW - topW) * (1 - pinZ);
        const currentY = topY + (botY - topY) * (1 - pinZ) - (1 - pinZ) * 40;
        const currentX = centerX + pin.x * (currentLaneW / 2);

        // Pin Dimensions
        const pRadius = 7 + (1 - pinZ) * 6;
        const pHeight = 22 + (1 - pinZ) * 16;

        ctx.save();
        ctx.translate(currentX, currentY);
        if (pin.rot !== 0) ctx.rotate(pin.rot);

        // Pin Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 8, pRadius * 1.2, pRadius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pin Body
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, pRadius, pHeight / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Red Neck Stripes
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-pRadius * 0.7, -pHeight * 0.25, pRadius * 1.4, 3);
        ctx.fillRect(-pRadius * 0.7, -pHeight * 0.15, pRadius * 1.4, 3);

        ctx.restore();

        // Pin Physics Update
        if (pin.isDown) {
          pin.x += pin.vx;
          pin.z += pin.vz;
          pin.rot += pin.rotV;
          pin.vx *= 0.94;
          pin.vz *= 0.94;
        }
      });

      // 4. Ball Physics & Rendering
      if (eng.ballActive) {
        // Curve spin effect
        eng.ballVx += eng.ballSpin;
        eng.ballX += eng.ballVx;
        eng.ballZ += eng.ballVz;

        // Gutter Collision Check
        if (Math.abs(eng.ballX) > 0.92) {
          eng.inGutter = true;
          eng.ballSpin = 0;
          eng.ballVx = 0;
        }

        // Map Ball (X, Z) to 2D Canvas Screen
        const z = eng.ballZ; // 0.05 to 1.05
        const curLaneW = topW + (botW - topW) * (1 - z);
        const curY = botY - (botY - topY) * z;
        const curX = centerX + eng.ballX * (curLaneW / 2);
        const ballSize = Math.max(12, 32 * (1 - z * 0.6));

        // Ball Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(curX, curY + ballSize * 0.7, ballSize * 0.8, ballSize * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glowing 3D Neon Bowling Ball
        ctx.save();
        const bGrad = ctx.createRadialGradient(curX - ballSize * 0.3, curY - ballSize * 0.3, 2, curX, curY, ballSize);
        bGrad.addColorStop(0, '#00f0ff');
        bGrad.addColorStop(0.5, '#0284c7');
        bGrad.addColorStop(1, '#082f49');
        ctx.fillStyle = bGrad;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(curX, curY, ballSize, 0, Math.PI * 2);
        ctx.fill();

        // Finger Holes
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(curX - ballSize * 0.25, curY - ballSize * 0.2, ballSize * 0.15, 0, Math.PI * 2);
        ctx.arc(curX + ballSize * 0.25, curY - ballSize * 0.2, ballSize * 0.15, 0, Math.PI * 2);
        ctx.arc(curX, curY + ballSize * 0.3, ballSize * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Pin Collisions when ball reaches pin deck (Z >= 0.85)
        if (z >= 0.85 && !eng.inGutter) {
          eng.pins.forEach((pin) => {
            if (!pin.isDown) {
              const dx = pin.x - eng.ballX;
              const dz = pin.z - z;
              const dist = Math.sqrt(dx * dx + dz * dz);

              if (dist < 0.16) {
                pin.isDown = true;
                pin.vx = (dx + (Math.random() - 0.5) * 0.1) * 0.15;
                pin.vz = 0.04 + Math.random() * 0.04;
                pin.rotV = (Math.random() - 0.5) * 0.4;

                // Chain reaction: check other pins nearby
                eng.pins.forEach((otherPin) => {
                  if (!otherPin.isDown && otherPin.id !== pin.id) {
                    const odx = otherPin.x - pin.x;
                    const odz = otherPin.z - pin.z;
                    if (Math.sqrt(odx * odx + odz * odz) < 0.22) {
                      otherPin.isDown = true;
                      otherPin.vx = (odx + (Math.random() - 0.5) * 0.08) * 0.12;
                      otherPin.vz = 0.03 + Math.random() * 0.03;
                      otherPin.rotV = (Math.random() - 0.5) * 0.3;
                    }
                  }
                });
              }
            }
          });
        }

        // Finish Roll when ball reaches back pit (Z >= 1.06)
        if (z >= 1.06) {
          processRollResult();
        }
      } else if (!isThrowing && !isMatchOver) {
        // Draw Pre-Throw Ball at Approach Position
        const curY = botY - 10;
        const curX = centerX + ballPosX * (botW / 2);
        const ballSize = 30;

        ctx.save();
        const bGrad = ctx.createRadialGradient(curX - 8, curY - 8, 2, curX, curY, ballSize);
        bGrad.addColorStop(0, '#00f0ff');
        bGrad.addColorStop(0.5, '#0284c7');
        bGrad.addColorStop(1, '#082f49');
        ctx.fillStyle = bGrad;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(curX, curY, ballSize, 0, Math.PI * 2);
        ctx.fill();

        // Finger holes
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(curX - 7, curY - 6, 4, 0, Math.PI * 2);
        ctx.arc(curX + 7, curY - 6, 4, 0, Math.PI * 2);
        ctx.arc(curX, curY + 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [ballPosX, ballSpin, isMatchOver, isThrowing, processRollResult]);

  return (
    <div
      ref={containerRef}
      id="cyber-bowling-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1"
    >
      {/* ========================================================================= */}
      {/* 1. TOP 10-FRAME BOWLING SCORECARD HUD */}
      {/* ========================================================================= */}
      <div className="w-full mb-2 p-2.5 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-white font-mono uppercase">
              FRAME {currentFrame} / 10 (ROLL {currentRoll})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-cyan-400 mr-1">SCORE:</span>
              <span className="text-xl font-black text-white font-mono">{totalScore}</span>
            </div>

            <button
              onClick={() => {
                const isMute = sound.toggleMute();
                setMuted(isMute);
              }}
              className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* 10-Frames Mini Score Grid */}
        <div className="grid grid-cols-10 gap-1 text-center">
          {frames.map((f, idx) => (
            <div
              key={idx}
              className={`p-1 rounded-lg border flex flex-col items-center justify-between ${
                currentFrame === idx + 1
                  ? 'bg-slate-800 border-cyan-400 shadow-md shadow-cyan-500/30'
                  : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <div className="text-[9px] font-bold text-slate-400">{idx + 1}</div>
              <div className="flex gap-0.5 text-[10px] font-black font-mono">
                <span className={f.isStrike ? 'text-amber-400 font-black' : 'text-white'}>
                  {f.isStrike ? 'X' : f.roll1 !== null ? f.roll1 : '-'}
                </span>
                {!f.isStrike && (
                  <span className={f.isSpare ? 'text-cyan-300 font-black' : 'text-slate-300'}>
                    {f.isSpare ? '/' : f.roll2 !== null ? f.roll2 : '-'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 3D BOWLING ARENA CANVAS */}
      {/* ========================================================================= */}
      <div className="relative w-full max-w-[380px] sm:max-w-[440px] aspect-[540/780] max-h-[54vh] sm:max-h-[60vh] flex items-center justify-center rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 border-cyan-500/40 bg-black touch-none">
        <canvas
          ref={canvasRef}
          width={540}
          height={780}
          className="w-full h-full object-contain block touch-none"
        />

        {/* Outcome Banner Popup */}
        {bannerText && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-pink-500 to-amber-500 p-0.5 shadow-2xl animate-bounce z-10">
            <div className="px-5 py-1 bg-slate-950 rounded-2xl text-lg sm:text-2xl font-black text-white text-center">
              {bannerText}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. TACTILE BOWLING CONTROLS (POSITION, HOOK SPIN & THROW) */}
      {/* ========================================================================= */}
      <div className="w-full max-w-[380px] sm:max-w-[440px] mt-2 space-y-2">
        {/* Sliders for Position and Spin */}
        <div className="grid grid-cols-2 gap-2 p-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs">
          {/* Position Slider */}
          <div>
            <div className="flex justify-between font-bold text-slate-300 mb-1">
              <span>Lane Position:</span>
              <span className="text-cyan-400 font-mono">
                {ballPosX === 0 ? 'Center' : ballPosX < 0 ? `Left ${Math.abs(Math.round(ballPosX * 10))}` : `Right ${Math.round(ballPosX * 10)}`}
              </span>
            </div>
            <input
              type="range"
              min="-0.7"
              max="0.7"
              step="0.05"
              disabled={isThrowing || isMatchOver}
              value={ballPosX}
              onChange={(e) => setBallPosX(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Hook Spin Slider */}
          <div>
            <div className="flex justify-between font-bold text-slate-300 mb-1">
              <span>Curve Hook Spin:</span>
              <span className="text-pink-400 font-mono">
                {ballSpin === 0 ? 'Straight' : ballSpin < 0 ? 'Hook Left' : 'Hook Right'}
              </span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              disabled={isThrowing || isMatchOver}
              value={ballSpin}
              onChange={(e) => setBallSpin(parseFloat(e.target.value))}
              className="w-full accent-pink-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Big Launch Throw Button */}
        <button
          disabled={isThrowing || isMatchOver}
          onClick={() => launchBall(1.0)}
          className={`w-full py-3.5 rounded-2xl font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 transition-all ${
            isThrowing || isMatchOver
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 active:scale-95 text-white shadow-cyan-500/30'
          }`}
        >
          <Flame className="w-5 h-5" /> THROW BOWLING BALL!
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. MATCH COMPLETED TOURNAMENT SUMMARY MODAL */}
      {/* ========================================================================= */}
      {isMatchOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border-2 border-cyan-500/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30">
              <Trophy className="w-9 h-9 text-amber-400 animate-bounce" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">10 FRAMES COMPLETED!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">BOWLING CHAMPION</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Final Score:</span>
                <span className="text-amber-300 font-mono text-2xl font-black">{totalScore} PTS</span>
              </div>
            </div>

            <button
              onClick={restartMatch}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 active:scale-95 text-white font-black text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" /> PLAY NEW TOURNAMENT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
