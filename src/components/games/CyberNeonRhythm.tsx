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
  Music,
  Disc,
  FastForward,
  ChevronRight,
  Shield
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

// --- GAME CONFIG & TUNNEL PERSPECTIVE ---
const V_WIDTH = 540;
const V_HEIGHT = 780;
const FOV = 320;
const TUNNEL_DEPTH = 8.5;

interface TrackInfo {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  difficulty: 'NORMAL' | 'HARD' | 'EXPERT';
  color: string;
  patternSpeed: number;
}

const TRACKS: TrackInfo[] = [
  {
    id: 'cyber-overdrive',
    name: 'CYBER OVERDRIVE',
    artist: 'Neon Synthesizer',
    bpm: 128,
    difficulty: 'NORMAL',
    color: '#00f0ff',
    patternSpeed: 4.8,
  },
  {
    id: 'neon-velocity',
    name: 'NEON VELOCITY',
    artist: 'Electro Pulse 84',
    bpm: 140,
    difficulty: 'HARD',
    color: '#ff007f',
    patternSpeed: 5.6,
  },
  {
    id: 'quantum-horizon',
    name: 'QUANTUM HORIZON',
    artist: 'Vapor Waveform',
    bpm: 118,
    difficulty: 'NORMAL',
    color: '#ffe600',
    patternSpeed: 4.2,
  },
  {
    id: 'hyper-overclock',
    name: 'HYPER OVERCLOCK',
    artist: 'Cyber God X',
    bpm: 155,
    difficulty: 'EXPERT',
    color: '#a855f7',
    patternSpeed: 6.8,
  },
];

interface BeatNote {
  id: number;
  lane: number; // 0, 1, 2, 3 (-1.5, -0.5, 0.5, 1.5)
  worldY: number; // -0.4 to 0.4
  z: number; // 8.5 down to 0
  color: 'cyan' | 'magenta' | 'gold';
  dir: 'up' | 'down' | 'left' | 'right' | 'any';
  sliced: boolean;
  missed: boolean;
}

interface SlicedHalf {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  color: string;
  alpha: number;
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

interface RatingPopup {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
}

export const CyberNeonRhythm: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // UI States
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'victory'>('menu');
  const [selectedTrack, setSelectedTrack] = useState<TrackInfo>(TRACKS[0]);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [health, setHealth] = useState<number>(100);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem(`novaplay_rhythm_${TRACKS[0].id}`);
    return saved ? parseInt(saved, 10) : 480000;
  });
  const [accuracy, setAccuracy] = useState<{ hits: number; total: number }>({ hits: 0, total: 0 });
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Engine Physics & Audio Clock Ref
  const engineRef = useRef<{
    notes: BeatNote[];
    slicedHalves: SlicedHalf[];
    particles: Particle[];
    ratings: RatingPopup[];
    leftSaber: { x: number; y: number; trail: { x: number; y: number }[]; isSwinging: boolean };
    rightSaber: { x: number; y: number; trail: { x: number; y: number }[]; isSwinging: boolean };
    audioTime: number;
    nextBeatTime: number;
    beatIndex: number;
    tunnelOffset: number;
    bassPulse: number;
    vizHeights: number[];
    lastFrameTime: number;
    songDuration: number;
    elapsedSongTime: number;
    isPlayingMusic: boolean;
  }>({
    notes: [],
    slicedHalves: [],
    particles: [],
    ratings: [],
    leftSaber: { x: 180, y: 580, trail: [], isSwinging: false },
    rightSaber: { x: 360, y: 580, trail: [], isSwinging: false },
    audioTime: 0,
    nextBeatTime: 0,
    beatIndex: 0,
    tunnelOffset: 0,
    bassPulse: 0,
    vizHeights: new Array(18).fill(20),
    lastFrameTime: performance.now(),
    songDuration: 75, // 75 seconds per song
    elapsedSongTime: 0,
    isPlayingMusic: false,
  });

  // Track select helper
  const handleSelectTrack = (track: TrackInfo) => {
    sound.playClick();
    setSelectedTrack(track);
    const saved = localStorage.getItem(`novaplay_rhythm_${track.id}`);
    setHighScore(saved ? parseInt(saved, 10) : 480000);
  };

  // Start Playing
  const startTrack = () => {
    sound.playClick();
    const eng = engineRef.current;
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setMultiplier(1);
    setHealth(100);
    setAccuracy({ hits: 0, total: 0 });
    eng.notes = [];
    eng.slicedHalves = [];
    eng.particles = [];
    eng.ratings = [];
    eng.audioTime = 0;
    eng.nextBeatTime = 0;
    eng.beatIndex = 0;
    eng.tunnelOffset = 0;
    eng.bassPulse = 0;
    eng.elapsedSongTime = 0;
    eng.isPlayingMusic = true;
    setGameState('playing');
  };

  // Trigger Slicing a Note
  const sliceNote = useCallback((note: BeatNote, sliceDirection?: string) => {
    if (note.sliced || note.missed) return;
    note.sliced = true;

    const eng = engineRef.current;
    const isPerfect = note.z < 0.8;
    const pts = isPerfect ? 1000 : 600;

    sound.playRhythmSlice(isPerfect);
    eng.bassPulse = 1.0;

    // Score & Multiplier Calculation
    setScore((prev) => {
      const next = prev + pts * multiplier;
      const key = `novaplay_rhythm_${selectedTrack.id}`;
      if (next > highScore) {
        setHighScore(next);
        localStorage.setItem(key, String(next));
      }
      return next;
    });

    setCombo((prev) => {
      const next = prev + 1;
      setMaxCombo((currMax) => Math.max(currMax, next));
      if (next >= 30) setMultiplier(16);
      else if (next >= 20) setMultiplier(8);
      else if (next >= 10) setMultiplier(4);
      else if (next >= 5) setMultiplier(2);
      return next;
    });

    setHealth((prev) => Math.min(100, prev + 4));
    setAccuracy((prev) => ({ hits: prev.hits + 1, total: prev.total + 1 }));

    // Screen coordinates of slice
    const cx = V_WIDTH / 2;
    const cy = V_HEIGHT / 2;
    const laneOffsets = [-1.3, -0.45, 0.45, 1.3];
    const worldX = laneOffsets[note.lane];
    const scale = FOV / (note.z + 0.1);
    const screenX = cx + worldX * scale * 0.45;
    const screenY = cy + (note.worldY + 0.45) * scale * 0.45;

    // Rating Popup
    eng.ratings.push({
      x: screenX,
      y: screenY - 25,
      text: isPerfect ? 'PERFECT!' : 'GREAT!',
      color: isPerfect ? '#ffe600' : '#00f0ff',
      alpha: 1,
      scale: isPerfect ? 1.4 : 1.1,
    });

    // 3D Sliced Cube Halves
    const colorHex = note.color === 'cyan' ? '#00f0ff' : note.color === 'magenta' ? '#ff007f' : '#ffe600';
    eng.slicedHalves.push(
      {
        x: screenX - 12,
        y: screenY,
        size: 26,
        vx: -3.5 - Math.random() * 2,
        vy: -2 - Math.random() * 3,
        rot: 0,
        vRot: -0.15,
        color: colorHex,
        alpha: 1,
      },
      {
        x: screenX + 12,
        y: screenY,
        size: 26,
        vx: 3.5 + Math.random() * 2,
        vy: -2 - Math.random() * 3,
        rot: 0,
        vRot: 0.15,
        color: colorHex,
        alpha: 1,
      }
    );

    // Particle Burst Sparks
    for (let k = 0; k < 18; k++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 6;
      eng.particles.push({
        x: screenX,
        y: screenY,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        size: 2.5 + Math.random() * 2.5,
        color: colorHex,
        alpha: 1,
        decay: 0.04,
      });
    }
  }, [multiplier, highScore, selectedTrack.id]);

  // Note Missed
  const missNote = useCallback((note: BeatNote) => {
    if (note.sliced || note.missed) return;
    note.missed = true;

    setCombo(0);
    setMultiplier(1);
    setHealth((prev) => {
      const next = Math.max(0, prev - 14);
      if (next <= 0) {
        setGameState('gameover');
        sound.playGameOver();
      }
      return next;
    });
    setAccuracy((prev) => ({ hits: prev.hits, total: prev.total + 1 }));

    // Miss Rating
    const cx = V_WIDTH / 2;
    const cy = V_HEIGHT / 2;
    const laneOffsets = [-1.3, -0.45, 0.45, 1.3];
    const worldX = laneOffsets[note.lane];
    const scale = FOV / 0.8;
    const screenX = cx + worldX * scale * 0.45;
    const screenY = cy + (note.worldY + 0.45) * scale * 0.45;

    engineRef.current.ratings.push({
      x: screenX,
      y: screenY - 20,
      text: 'MISS',
      color: '#f43f5e',
      alpha: 1,
      scale: 1.0,
    });
  }, []);

  // Strike Lane Directly (Touch Buttons or Keyboard)
  const triggerLaneStrike = useCallback((laneIndex: number) => {
    if (gameState !== 'playing') return;
    const eng = engineRef.current;

    // Swing Saber in Lane
    if (laneIndex < 2) {
      eng.leftSaber.isSwinging = true;
      setTimeout(() => (eng.leftSaber.isSwinging = false), 120);
    } else {
      eng.rightSaber.isSwinging = true;
      setTimeout(() => (eng.rightSaber.isSwinging = false), 120);
    }

    // Find nearest note in this lane in strike zone (z between 0 and 1.8)
    const targetNote = eng.notes.find(
      (n) => !n.sliced && !n.missed && n.lane === laneIndex && n.z >= 0 && n.z <= 2.2
    );

    if (targetNote) {
      sliceNote(targetNote);
    }
  }, [gameState, sliceNote]);

  // Touch Swipe on Screen (Saber Slash Detection)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastTouchX = 0;
    let lastTouchY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (gameState !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = V_WIDTH / rect.width;
      const scaleY = V_HEIGHT / rect.height;
      const touch = e.touches[0];
      lastTouchX = (touch.clientX - rect.left) * scaleX;
      lastTouchY = (touch.clientY - rect.top) * scaleY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (gameState !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = V_WIDTH / rect.width;
      const scaleY = V_HEIGHT / rect.height;
      const touch = e.touches[0];
      const curX = (touch.clientX - rect.left) * scaleX;
      const curY = (touch.clientY - rect.top) * scaleY;

      const eng = engineRef.current;
      if (curX < V_WIDTH / 2) {
        eng.leftSaber.x = curX;
        eng.leftSaber.y = curY;
        eng.leftSaber.isSwinging = true;
      } else {
        eng.rightSaber.x = curX;
        eng.rightSaber.y = curY;
        eng.rightSaber.isSwinging = true;
      }

      // Check collision with incoming notes in strike zone
      const laneFromX = curX < V_WIDTH * 0.25 ? 0 : curX < V_WIDTH * 0.5 ? 1 : curX < V_WIDTH * 0.75 ? 2 : 3;
      const hitNote = eng.notes.find(
        (n) => !n.sliced && !n.missed && n.lane === laneFromX && n.z <= 2.2
      );
      if (hitNote) {
        sliceNote(hitNote);
      }

      lastTouchX = curX;
      lastTouchY = curY;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [gameState, sliceNote]);

  // Keyboard Controls: D, F, J, K or Left, Down, Up, Right
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyD' || e.code === 'ArrowLeft') triggerLaneStrike(0);
      if (e.code === 'KeyF' || e.code === 'ArrowDown') triggerLaneStrike(1);
      if (e.code === 'KeyJ' || e.code === 'ArrowUp') triggerLaneStrike(2);
      if (e.code === 'KeyK' || e.code === 'ArrowRight') triggerLaneStrike(3);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerLaneStrike]);

  // Main Loop & Procedural Music Synthesizer
  useEffect(() => {
    let animationFrameId: number;

    const synthTrackPattern = (bpm: number, beatIndex: number) => {
      const beatInBar = beatIndex % 16;
      // Kick on 0, 4, 8, 12 (Four-on-the-floor)
      if (beatInBar % 4 === 0) {
        sound.playRhythmKick();
      }
      // Snare on 4, 12
      if (beatInBar === 4 || beatInBar === 12) {
        sound.playRhythmSnare();
      }
      // Hi-hat on every 2 beats
      if (beatInBar % 2 === 0) {
        sound.playRhythmHiHat();
      }
      // Lead Synths on melodic steps
      const pentatonic = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
      if (beatInBar % 2 === 1) {
        const noteFreq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
        sound.playRhythmSynthNote(noteFreq, 0.15);
      }
    };

    const updateGame = (dt: number) => {
      const eng = engineRef.current;
      if (gameState !== 'playing') return;

      eng.elapsedSongTime += dt;
      if (eng.elapsedSongTime >= eng.songDuration) {
        setGameState('victory');
        sound.playFinishFanfare();
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
        return;
      }

      // Procedural Beat Synthesis Clock
      const beatInterval = 60 / (selectedTrack.bpm * 4); // 16th notes
      eng.audioTime += dt;

      if (eng.audioTime >= eng.nextBeatTime) {
        synthTrackPattern(selectedTrack.bpm, eng.beatIndex);
        eng.nextBeatTime = eng.audioTime + beatInterval;
        eng.beatIndex++;

        // Spawn Beat Cubes according to rhythm pattern
        if (eng.beatIndex % 2 === 0 && Math.random() < 0.75) {
          const lane = Math.floor(Math.random() * 4);
          const color = lane < 2 ? 'cyan' : 'magenta';
          const dirs: ('up' | 'down' | 'left' | 'right' | 'any')[] = ['up', 'down', 'left', 'right', 'any'];
          const dir = dirs[Math.floor(Math.random() * dirs.length)];

          eng.notes.push({
            id: Date.now() + Math.random(),
            lane,
            worldY: (Math.random() - 0.5) * 0.4,
            z: TUNNEL_DEPTH,
            color,
            dir,
            sliced: false,
            missed: false,
          });
        }
      }

      // Move Tunnel Grid & Visualizer
      eng.tunnelOffset = (eng.tunnelOffset + dt * selectedTrack.patternSpeed * 0.8) % 1;
      if (eng.bassPulse > 0) eng.bassPulse = Math.max(0, eng.bassPulse - dt * 4);

      // Dynamic Equalizer heights
      for (let i = 0; i < eng.vizHeights.length; i++) {
        eng.vizHeights[i] = Math.max(
          12,
          eng.vizHeights[i] * 0.9 + Math.random() * (eng.bassPulse * 45 + 15)
        );
      }

      // Move Notes Forward in 3D Space
      for (let i = eng.notes.length - 1; i >= 0; i--) {
        const note = eng.notes[i];
        note.z -= dt * selectedTrack.patternSpeed;

        // Check if passed player without slice
        if (note.z < -0.4 && !note.sliced && !note.missed) {
          missNote(note);
        }

        // Clean up old notes
        if (note.z < -1.5) {
          eng.notes.splice(i, 1);
        }
      }

      // Move Sliced Halves
      for (let i = eng.slicedHalves.length - 1; i >= 0; i--) {
        const sh = eng.slicedHalves[i];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.vy += 0.25; // gravity
        sh.rot += sh.vRot;
        sh.alpha -= 0.035;
        if (sh.alpha <= 0) eng.slicedHalves.splice(i, 1);
      }

      // Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) eng.particles.splice(i, 1);
      }

      // Ratings
      for (let i = eng.ratings.length - 1; i >= 0; i--) {
        const r = eng.ratings[i];
        r.y -= 0.8;
        r.alpha -= 0.035;
        if (r.alpha <= 0) eng.ratings.splice(i, 1);
      }
    };

    // --- 3D FIRST-PERSON RENDER PASS ---
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const eng = engineRef.current;
      const cx = V_WIDTH / 2;
      const cy = V_HEIGHT / 2;

      // 1. Deep Space Cyber Background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      // 2. Audio Visualizer Spectrum Bars on Walls
      const barCount = eng.vizHeights.length;
      for (let i = 0; i < barCount; i++) {
        const h = eng.vizHeights[i];
        const y = 140 + i * 28;
        // Left Side Bars
        ctx.fillStyle = `rgba(0, 240, 255, ${0.15 + (h / 60) * 0.4})`;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.fillRect(10, y, h, 14);

        // Right Side Bars
        ctx.fillStyle = `rgba(255, 0, 127, ${0.15 + (h / 60) * 0.4})`;
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 6;
        ctx.fillRect(V_WIDTH - 10 - h, y, h, 14);
      }
      ctx.shadowBlur = 0;

      // 3. 3D Octagonal Tunnel Rings
      const ringSteps = 12;
      for (let step = ringSteps; step >= 1; step--) {
        const z = step * 0.7 - eng.tunnelOffset * 0.7;
        if (z <= 0.2) continue;

        const scale = FOV / z;
        const rw = scale * 0.9 + eng.bassPulse * 15;
        const rh = scale * 0.75 + eng.bassPulse * 12;

        const alpha = Math.max(0.08, Math.min(0.85, (1 - z / TUNNEL_DEPTH)));
        ctx.strokeStyle =
          step % 2 === 0
            ? `rgba(0, 240, 255, ${alpha})`
            : `rgba(255, 0, 127, ${alpha})`;
        ctx.lineWidth = Math.max(1, 4 - z * 0.4);
        ctx.shadowColor = step % 2 === 0 ? '#00f0ff' : '#ff007f';
        ctx.shadowBlur = eng.bassPulse > 0.4 ? 12 : 4;

        ctx.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh);
      }
      ctx.shadowBlur = 0;

      // 4. Center Horizon Laser Guide Lanes
      const laneOffsets = [-1.3, -0.45, 0.45, 1.3];
      laneOffsets.forEach((lx, idx) => {
        const nearScale = FOV / 0.8;
        const farScale = FOV / TUNNEL_DEPTH;
        const xNear = cx + lx * nearScale * 0.45;
        const xFar = cx + lx * farScale * 0.45;

        ctx.strokeStyle = idx < 2 ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 0, 127, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xFar, cy);
        ctx.lineTo(xNear, cy + 0.45 * nearScale * 0.45);
        ctx.stroke();
      });

      // Strike Line Barrier at Bottom
      const strikeScale = FOV / 1.0;
      const strikeY = cy + 0.45 * strikeScale * 0.45;
      ctx.strokeStyle = 'rgba(255, 230, 0, 0.7)';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(cx - 210, strikeY);
      ctx.lineTo(cx + 210, strikeY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 5. Draw Beat Cubes (Sorted by Z depth from back to front)
      const sortedNotes = [...eng.notes].sort((a, b) => b.z - a.z);
      sortedNotes.forEach((note) => {
        if (note.sliced || note.missed) return;

        const scale = FOV / (note.z + 0.1);
        const worldX = laneOffsets[note.lane];
        const screenX = cx + worldX * scale * 0.45;
        const screenY = cy + (note.worldY + 0.45) * scale * 0.45;
        const cubeSize = Math.max(8, Math.min(65, scale * 0.16));

        ctx.save();
        ctx.translate(screenX, screenY);

        const colorHex = note.color === 'cyan' ? '#00f0ff' : note.color === 'magenta' ? '#ff007f' : '#ffe600';

        // 3D Cube Body
        ctx.fillStyle = '#090d16';
        ctx.fillRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize);

        ctx.strokeStyle = colorHex;
        ctx.lineWidth = Math.max(1.5, cubeSize * 0.08);
        ctx.shadowColor = colorHex;
        ctx.shadowBlur = 14;
        ctx.strokeRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize);

        // Direction Arrow in Center
        if (cubeSize > 16) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.round(cubeSize * 0.48)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const arrowSymbol =
            note.dir === 'up'
              ? '▲'
              : note.dir === 'down'
              ? '▼'
              : note.dir === 'left'
              ? '◀'
              : note.dir === 'right'
              ? '▶'
              : '●';
          ctx.fillText(arrowSymbol, 0, 0);
        }

        ctx.restore();
      });

      // 6. Draw Sliced Halves
      eng.slicedHalves.forEach((sh) => {
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.rot);
        ctx.globalAlpha = Math.max(0, sh.alpha);
        ctx.fillStyle = sh.color;
        ctx.shadowColor = sh.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(-sh.size / 2, -sh.size / 4, sh.size, sh.size / 2);
        ctx.restore();
      });

      // 7. Slicing Particles Sparks
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

      // 8. Dual Neon Energy Sabers
      const renderSaber = (
        saber: { x: number; y: number; isSwinging: boolean },
        color: string,
        glow: string,
        isLeft: boolean
      ) => {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;
        ctx.lineWidth = saber.isSwinging ? 14 : 9;
        ctx.shadowColor = glow;
        ctx.shadowBlur = saber.isSwinging ? 25 : 12;

        const tiltX = isLeft ? -28 : 28;
        ctx.beginPath();
        ctx.moveTo(saber.x + tiltX * 0.5, saber.y + 40);
        ctx.lineTo(saber.x - tiltX, saber.y - 70);
        ctx.stroke();

        // White Blade Core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(saber.x + tiltX * 0.5, saber.y + 40);
        ctx.lineTo(saber.x - tiltX, saber.y - 70);
        ctx.stroke();

        ctx.restore();
      };
      renderSaber(eng.leftSaber, '#00f0ff', '#00f0ff', true);
      renderSaber(eng.rightSaber, '#ff007f', '#ff007f', false);

      // 9. Floating Ratings ("PERFECT!", "GREAT!", "MISS")
      eng.ratings.forEach((r) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, r.alpha);
        ctx.font = `bold ${Math.round(18 * r.scale)}px sans-serif`;
        ctx.fillStyle = r.color;
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 12;
        ctx.textAlign = 'center';
        ctx.fillText(r.text, r.x, r.y);
        ctx.restore();
      });
    };

    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      updateGame(dt);
      render();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, selectedTrack, sliceNote, missNote]);

  return (
    <div
      ref={containerRef}
      id="cyber-neon-rhythm-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1"
    >
      {/* Top Rhythm HUD Matrix */}
      <div className="w-full mb-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl shadow-cyan-950/40">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
          {/* Score */}
          <div>
            <div className="text-[10px] uppercase font-bold text-cyan-400">Score</div>
            <div className="text-xl sm:text-2xl font-black text-white leading-none tracking-tight">
              {score.toLocaleString()}
            </div>
          </div>

          {/* Multiplier & Combo */}
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-0.5 rounded-lg bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-black">
              {combo} COMBO
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
              {multiplier}X BOOST
            </div>
          </div>

          {/* Best Record */}
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center justify-end gap-1">
              <Trophy className="w-3 h-3" /> Record
            </div>
            <div className="text-sm sm:text-base font-black text-slate-200 leading-none">
              {highScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Shield / Health Bar */}
        <div className="w-full flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <div className="flex-1 h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-150 ${
                health > 50 ? 'bg-gradient-to-r from-cyan-400 to-emerald-400' : 'bg-gradient-to-r from-rose-500 to-amber-400 animate-pulse'
              }`}
              style={{ width: `${health}%` }}
            />
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-300">{health}%</span>
        </div>
      </div>

      {/* Main 3D Canvas Stage */}
      <div className="relative w-full max-w-[460px] aspect-[540/780] max-h-[74vh] sm:max-h-[82vh] flex items-center justify-center rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-black touch-none">
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          className="w-full h-full object-contain block touch-none cursor-crosshair"
        />

        {/* Menu / Song Select Modal */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-5 text-center z-20 space-y-3 animate-fade-in overflow-y-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-pink-500 to-purple-600 p-0.5 shadow-xl shadow-cyan-500/30 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                <Music className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
                <Crown className="w-3 h-3 text-amber-400" /> UNIQUE 3D RHYTHM SLASHER
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                BEAT SABER <span className="text-pink-400">3D</span>
              </h2>
            </div>

            {/* Track Selector List */}
            <div className="w-full max-w-xs space-y-1.5 text-left">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Track:</div>
              {TRACKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTrack(t)}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    selectedTrack.id === t.id
                      ? 'bg-slate-800 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Disc className={`w-4 h-4 ${selectedTrack.id === t.id ? 'text-cyan-400 animate-spin' : 'text-slate-500'}`} />
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate">{t.name}</div>
                      <div className="text-[10px] text-slate-400">{t.bpm} BPM</div>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      t.difficulty === 'EXPERT'
                        ? 'bg-rose-500/20 text-rose-300'
                        : t.difficulty === 'HARD'
                        ? 'bg-pink-500/20 text-pink-300'
                        : 'bg-cyan-500/20 text-cyan-300'
                    }`}
                  >
                    {t.difficulty}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={startTrack}
              className="w-full max-w-xs py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-sm sm:text-base shadow-xl shadow-pink-500/30 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              SLASH TO THE BEAT
            </button>
          </div>
        )}

        {/* Game Over Modal */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center space-y-3 animate-fade-in z-20">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center">
              <Zap className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Shield Depleted</div>
              <h2 className="text-2xl font-black text-white">TRACK FAILED</h2>
              <div className="text-xs text-pink-400 font-bold mt-1">Score: {score.toLocaleString()} PTS</div>
            </div>
            <button
              onClick={startTrack}
              className="w-full max-w-xs py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-1.5 hover:scale-105 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> RETRY TRACK
            </button>
          </div>
        )}

        {/* Victory Modal */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center space-y-3 animate-fade-in z-20">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-400 font-black">Track Completed!</div>
              <h2 className="text-2xl font-black text-white">ALL CLEARED!</h2>
              <div className="text-xs text-cyan-400 font-black mt-1">
                Final Score: {score.toLocaleString()} PTS • Max Combo: {maxCombo}
              </div>
            </div>
            <button
              onClick={() => setGameState('menu')}
              className="w-full max-w-xs py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-white font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-1.5 hover:scale-105 transition-all"
            >
              CHOOSE NEXT SONG
            </button>
          </div>
        )}
      </div>

      {/* 4 Tactile Glowing Rhythm Strike Zone Buttons (Responsive for Mobile & Precision Play) */}
      <div className="w-full max-w-[380px] sm:max-w-[440px] mt-2 grid grid-cols-4 gap-1.5">
        <button
          onPointerDown={() => triggerLaneStrike(0)}
          className="py-3 rounded-xl bg-slate-900 border border-cyan-500/50 hover:bg-cyan-500/20 active:bg-cyan-400 active:text-slate-950 text-cyan-300 text-xs font-black transition-all shadow-md active:scale-95"
        >
          [D] ◀
        </button>
        <button
          onPointerDown={() => triggerLaneStrike(1)}
          className="py-3 rounded-xl bg-slate-900 border border-cyan-500/50 hover:bg-cyan-500/20 active:bg-cyan-400 active:text-slate-950 text-cyan-300 text-xs font-black transition-all shadow-md active:scale-95"
        >
          [F] ▼
        </button>
        <button
          onPointerDown={() => triggerLaneStrike(2)}
          className="py-3 rounded-xl bg-slate-900 border border-pink-500/50 hover:bg-pink-500/20 active:bg-pink-500 active:text-slate-950 text-pink-300 text-xs font-black transition-all shadow-md active:scale-95"
        >
          ▲ [J]
        </button>
        <button
          onPointerDown={() => triggerLaneStrike(3)}
          className="py-3 rounded-xl bg-slate-900 border border-pink-500/50 hover:bg-pink-500/20 active:bg-pink-500 active:text-slate-950 text-pink-300 text-xs font-black transition-all shadow-md active:scale-95"
        >
          ▶ [K]
        </button>
      </div>

      {/* Bottom Audio Settings */}
      <div className="w-full max-w-[380px] sm:max-w-[440px] mt-1.5 flex items-center justify-between text-xs text-slate-400">
        <div className="text-[11px] text-slate-400">
          🎮 Controls: <span className="text-cyan-300 font-bold">Swipe / D, F, J, K</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const isMute = sound.toggleMute();
              setMuted(isMute);
            }}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
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
