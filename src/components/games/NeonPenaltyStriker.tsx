import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Award, Shield, Trophy, Zap, Flame, Wind, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface Props {
  onGameOver?: (score: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

interface GoalTarget {
  x: number;
  y: number;
  radius: number;
  points: number;
  label: string;
  active: boolean;
  pulse: number;
}

type TournamentStage = 'Round of 16' | 'Quarter-Final' | 'Semi-Final' | 'Cup Final';

// Realistic 3D Authentic Match Football Renderer
function drawAuthenticFootball(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  isFireball: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // 1. Sphere Outer Glow / Fireball Aura
  if (isFireball) {
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 22;
  } else {
    ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
    ctx.shadowBlur = 8;
  }

  // 2. Base Sphere Clip (Restricts all stitched panels cleanly inside the ball sphere)
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.save();
  ctx.clip();

  // 3. Leather Base Gradient (Rich white leather or fiery magma if on-fire)
  const baseGrad = ctx.createRadialGradient(-radius * 0.35, -radius * 0.35, radius * 0.08, 0, 0, radius);
  if (isFireball) {
    baseGrad.addColorStop(0, '#fef08a');
    baseGrad.addColorStop(0.35, '#fb923c');
    baseGrad.addColorStop(0.75, '#ea580c');
    baseGrad.addColorStop(1, '#7c2d12');
  } else {
    baseGrad.addColorStop(0, '#ffffff');
    baseGrad.addColorStop(0.4, '#f8fafc');
    baseGrad.addColorStop(0.7, '#e2e8f0');
    baseGrad.addColorStop(0.9, '#cbd5e1');
    baseGrad.addColorStop(1, '#94a3b8');
  }
  ctx.fillStyle = baseGrad;
  ctx.fill();

  // 4. Central Black Pentagon (Classic Soccer Ball Core)
  const pentRadius = radius * 0.42;
  const centerVerts: { x: number; y: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
    centerVerts.push({
      x: Math.cos(angle) * pentRadius,
      y: Math.sin(angle) * pentRadius,
    });
  }

  ctx.fillStyle = isFireball ? '#451a03' : '#0f172a';
  ctx.beginPath();
  ctx.moveTo(centerVerts[0].x, centerVerts[0].y);
  for (let i = 1; i < 5; i++) {
    ctx.lineTo(centerVerts[i].x, centerVerts[i].y);
  }
  ctx.closePath();
  ctx.fill();

  // Center Pentagon glossy leather sheen
  const pentSheen = ctx.createLinearGradient(-pentRadius, -pentRadius, pentRadius, pentRadius);
  pentSheen.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  pentSheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
  pentSheen.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  ctx.fillStyle = pentSheen;
  ctx.fill();

  // 5. 5 Outer Black Perimeter Pentagons (Curving along sphere horizon)
  for (let i = 0; i < 5; i++) {
    const angle1 = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const angle2 = ((i + 1) * Math.PI * 2) / 5 - Math.PI / 2;
    const midAngle = (angle1 + angle2) / 2;

    const patchX = Math.cos(midAngle) * radius * 0.95;
    const patchY = Math.sin(midAngle) * radius * 0.95;
    const patchR = radius * 0.36;

    ctx.fillStyle = isFireball ? '#451a03' : '#0f172a';
    ctx.beginPath();
    ctx.arc(patchX, patchY, patchR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. Realistic Stitched Seams (Double-groove depth for authentic leather look)
  // Deep seam shadow
  ctx.strokeStyle = isFireball ? 'rgba(254, 215, 170, 0.7)' : 'rgba(30, 41, 59, 0.85)';
  ctx.lineWidth = Math.max(1.2, radius * 0.055);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw Center Pentagon Seams
  ctx.beginPath();
  ctx.moveTo(centerVerts[0].x, centerVerts[0].y);
  for (let i = 1; i < 5; i++) {
    ctx.lineTo(centerVerts[i].x, centerVerts[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  // Draw Radial Seams creating the surrounding White Hexagons
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const v = centerVerts[i];
    const outerX = Math.cos(angle) * radius * 1.1;
    const outerY = Math.sin(angle) * radius * 1.1;

    ctx.beginPath();
    ctx.moveTo(v.x, v.y);
    ctx.lineTo(outerX, outerY);
    ctx.stroke();

    // Connecting Hexagon cross-seam between adjacent rays
    const nextAngle = ((i + 1) * Math.PI * 2) / 5 - Math.PI / 2;
    const nextV = centerVerts[(i + 1) % 5];
    const nextOuterX = Math.cos(nextAngle) * radius * 1.1;
    const nextOuterY = Math.sin(nextAngle) * radius * 1.1;

    const mid1X = v.x + (outerX - v.x) * 0.52;
    const mid1Y = v.y + (outerY - v.y) * 0.52;
    const mid2X = nextV.x + (nextOuterX - nextV.x) * 0.52;
    const mid2Y = nextV.y + (nextOuterY - nextV.y) * 0.52;

    ctx.beginPath();
    ctx.moveTo(mid1X, mid1Y);
    ctx.lineTo(mid2X, mid2Y);
    ctx.stroke();
  }

  // 7. Official FIFA Match Ball Gold Badge Stamp
  if (!isFireball && radius >= 12) {
    ctx.save();
    ctx.translate(0, -radius * 0.62);
    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${Math.max(5, Math.floor(radius * 0.2))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ MATCH ★', 0, 0);
    ctx.restore();
  }

  // 8. 3D Spherical Ambient Shadow (Bottom-Right volume darkening)
  const sphereShadow = ctx.createRadialGradient(radius * 0.28, radius * 0.28, radius * 0.35, 0, 0, radius);
  sphereShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
  sphereShadow.addColorStop(0.65, 'rgba(15, 23, 42, 0.22)');
  sphereShadow.addColorStop(1, 'rgba(15, 23, 42, 0.72)');
  ctx.fillStyle = sphereShadow;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // 9. Top-Left 3D Specular Highlight (Curved glossy light bounce)
  const specular = ctx.createRadialGradient(
    -radius * 0.42,
    -radius * 0.42,
    1,
    -radius * 0.38,
    -radius * 0.38,
    radius * 0.55
  );
  specular.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  specular.addColorStop(0.35, 'rgba(255, 255, 255, 0.28)');
  specular.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = specular;
  ctx.beginPath();
  ctx.arc(-radius * 0.38, -radius * 0.38, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Pinpoint bright glint
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-radius * 0.42, -radius * 0.42, Math.max(1.4, radius * 0.09), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // Restore sphere clip

  // 10. Spherical Edge Contour
  ctx.strokeStyle = isFireball ? 'rgba(249, 115, 22, 0.9)' : 'rgba(30, 41, 59, 0.6)';
  ctx.lineWidth = Math.max(1, radius * 0.04);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

export const NeonPenaltyStriker: React.FC<Props> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [round, setRound] = useState(1);
  const [stage, setStage] = useState<TournamentStage>('Round of 16');
  const [maxRounds] = useState(5);
  const [goals, setGoals] = useState<('goal' | 'miss' | 'saved')[]>([]);
  const [muted, setMuted] = useState(sound.isMuted());
  const [shotSpeed, setShotSpeed] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const [wind, setWind] = useState(0); // -3 to +3 wind pushing ball
  const [streak, setStreak] = useState(0);

  const engineRef = useRef({
    // Ball State (3D coordinate: x, y in screen space, z depth from 1.0 down to 0.44 at goal)
    ball: {
      x: 400,
      y: 505,
      z: 1.0,
      vx: 0,
      vy: 0,
      vz: 0,
      curve: 0,
      radius: 20,
      inAir: false,
      rotation: 0,
      rotX: 0,
      rotY: 0,
      trail: [] as { x: number; y: number; z: number; alpha: number }[],
      resolved: false,
      isFireball: false,
    },
    // Player (Striker)
    striker: {
      x: 330,
      y: 520,
      targetX: 388,
      targetY: 512,
      runProgress: 0, // 0 to 1
      isKicking: false,
      kickPhase: 'idle' as 'idle' | 'runup' | 'kick' | 'celebrate' | 'frustrated',
      animTimer: 0,
      legAngle: 0,
      armAngle: 0,
    },
    // Goalkeeper
    goalie: {
      x: 400,
      y: 245,
      targetX: 400,
      targetY: 245,
      vx: 0,
      vy: 0,
      width: 44,
      height: 74,
      state: 'idle' as 'idle' | 'diving' | 'saved' | 'conceded',
      diveProgress: 0,
      diveAngle: 0,
      armReach: 32,
      idleBounce: 0,
      gloveX1: 375,
      gloveY1: 240,
      gloveX2: 425,
      gloveY2: 240,
    },
    // Goal Net 3D Physics Mesh
    net: {
      left: 155,
      right: 645,
      top: 125,
      bottom: 310,
      bulgeX: 400,
      bulgeY: 200,
      bulgeForce: 0,
      vibration: 0,
    },
    // Targets
    targets: [
      { x: 195, y: 155, radius: 24, points: 500, label: 'TOP BINS', active: true, pulse: 0 },
      { x: 605, y: 155, radius: 24, points: 500, label: 'TOP BINS', active: true, pulse: 0 },
      { x: 195, y: 275, radius: 22, points: 350, label: 'LOW CORNER', active: true, pulse: 0 },
      { x: 605, y: 275, radius: 22, points: 350, label: 'LOW CORNER', active: true, pulse: 0 },
      { x: 400, y: 140, radius: 20, points: 600, label: 'CROSSBAR', active: true, pulse: 0 },
    ] as GoalTarget[],
    drag: {
      isDragging: false,
      startX: 400,
      startY: 505,
      currX: 400,
      currY: 505,
      points: [] as { x: number; y: number }[],
      startTime: 0,
    },
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    wind: 0,
    score: 0,
    highScore: 0,
    round: 1,
    streak: 0,
    stageIndex: 0,
    screenShake: 0,
    ledOffset: 0,
  });

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('novaplay_neonpenalty_highscore');
    if (saved) {
      const val = parseInt(saved, 10);
      setHighScore(val);
      engineRef.current.highScore = val;
    }
  }, []);

  const addParticles = (x: number, y: number, color: string, count = 20, speed = 5) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed + 1.5;
      engineRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: Math.random() * 4.5 + 2,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 25 + 15,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color = '#10b981') => {
    engineRef.current.floatingTexts.push({
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.6,
    });
  };

  const generateWind = useCallback((currentRound: number) => {
    if (currentRound <= 1) return 0;
    const w = (Math.random() * 4 - 2) * (currentRound * 0.35);
    return Math.round(w * 10) / 10;
  }, []);

  const resetRound = useCallback(() => {
    const eng = engineRef.current;
    const newWind = generateWind(eng.round);
    eng.wind = newWind;
    setWind(newWind);

    eng.ball = {
      x: 400,
      y: 505,
      z: 1.0,
      vx: 0,
      vy: 0,
      vz: 0,
      curve: 0,
      radius: 20,
      inAir: false,
      rotation: 0,
      rotX: 0,
      rotY: 0,
      trail: [],
      resolved: false,
      isFireball: eng.streak >= 2,
    };

    eng.striker = {
      x: 330,
      y: 520,
      targetX: 388,
      targetY: 512,
      runProgress: 0,
      isKicking: false,
      kickPhase: 'idle',
      animTimer: 0,
      legAngle: 0,
      armAngle: 0,
    };

    eng.goalie = {
      x: 400,
      y: 245,
      targetX: 400,
      targetY: 245,
      vx: 0,
      vy: 0,
      width: 44,
      height: 74,
      state: 'idle',
      diveProgress: 0,
      diveAngle: 0,
      armReach: 32,
      idleBounce: 0,
      gloveX1: 375,
      gloveY1: 240,
      gloveX2: 425,
      gloveY2: 240,
    };

    eng.drag.isDragging = false;
    eng.drag.points = [];
    eng.net.bulgeForce = 0;
    setFeedback(null);
  }, [generateWind]);

  const startNewGame = useCallback(() => {
    const eng = engineRef.current;
    eng.score = 0;
    eng.round = 1;
    eng.streak = 0;
    eng.stageIndex = 0;
    eng.particles = [];
    eng.floatingTexts = [];
    setScore(0);
    setRound(1);
    setStreak(0);
    setStage('Round of 16');
    setGoals([]);
    setIsNewHigh(false);
    resetRound();
    setGameState('playing');
    sound.playWhistle();
  }, [resetRound]);

  const completeTournament = useCallback(() => {
    setGameState('gameover');
    sound.playGameOver();
    const finalScore = engineRef.current.score;
    if (finalScore > engineRef.current.highScore) {
      engineRef.current.highScore = finalScore;
      setHighScore(finalScore);
      localStorage.setItem('novaplay_neonpenalty_highscore', String(finalScore));
      setIsNewHigh(true);
      confetti({ particleCount: 120, spread: 100 });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [onGameOver]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const eng = engineRef.current;
      const b = eng.ball;
      const s = eng.striker;
      const g = eng.goalie;
      const net = eng.net;

      // Screen Shake update
      if (eng.screenShake > 0) eng.screenShake -= 0.5;

      ctx.save();
      if (eng.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * eng.screenShake, (Math.random() - 0.5) * eng.screenShake);
      }

      // ==========================================
      // 1. STADIUM BACKGROUND & FLOODLIGHTS
      // ==========================================
      // Night Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 300);
      skyGrad.addColorStop(0, '#030712');
      skyGrad.addColorStop(0.5, '#06162d');
      skyGrad.addColorStop(1, '#092540');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 800, 600);

      // Stadium Grandstands with packed crowd
      for (let row = 0; row < 6; row++) {
        const rowY = 35 + row * 14;
        ctx.fillStyle = row % 2 === 0 ? 'rgba(15, 23, 42, 0.95)' : 'rgba(30, 41, 59, 0.95)';
        ctx.fillRect(0, rowY, 800, 14);

        // Cheering fan heads & flashing camera lights
        for (let fan = 0; fan < 55; fan++) {
          const fanX = fan * 14.5 + (row % 2) * 7;
          const bounce = Math.sin(Date.now() * 0.005 + fan + row) * 2;
          ctx.fillStyle = (fan + row) % 3 === 0 ? '#38bdf8' : (fan + row) % 3 === 1 ? '#f43f5e' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(fanX, rowY + 7 + bounce, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Camera flashes
          if (Math.random() < 0.003) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(fanX, rowY + 5, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Stadium Roof Truss Structure
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 30);
      ctx.lineTo(800, 30);
      ctx.stroke();

      // Floodlight Cones shining onto the pitch
      ctx.save();
      const floodLeft = ctx.createRadialGradient(80, 20, 10, 250, 250, 350);
      floodLeft.addColorStop(0, 'rgba(224, 242, 254, 0.45)');
      floodLeft.addColorStop(0.5, 'rgba(56, 189, 248, 0.1)');
      floodLeft.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = floodLeft;
      ctx.beginPath();
      ctx.moveTo(40, 10);
      ctx.lineTo(0, 450);
      ctx.lineTo(450, 450);
      ctx.closePath();
      ctx.fill();

      const floodRight = ctx.createRadialGradient(720, 20, 10, 550, 250, 350);
      floodRight.addColorStop(0, 'rgba(224, 242, 254, 0.45)');
      floodRight.addColorStop(0.5, 'rgba(56, 189, 248, 0.1)');
      floodRight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = floodRight;
      ctx.beginPath();
      ctx.moveTo(760, 10);
      ctx.lineTo(800, 450);
      ctx.lineTo(350, 450);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // ==========================================
      // 2. LED ADVERTISING BOARDS
      // ==========================================
      eng.ledOffset = (eng.ledOffset + 1.2) % 400;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 105, 800, 25);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 105, 800, 25);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 105, 800, 25);
      ctx.clip();
      ctx.font = 'black 12px sans-serif';
      ctx.fillStyle = '#38bdf8';
      for (let i = -1; i < 4; i++) {
        const textX = i * 280 - eng.ledOffset;
        ctx.fillText('⚽ NEON STRIKER CHAMPIONSHIP 2026 ★ TOP BINS +500 ★ VAMOS', textX, 122);
      }
      ctx.restore();

      // ==========================================
      // 3. 3D REALISTIC FOOTBALL PITCH (TURF)
      // ==========================================
      // Alternating perspective lawn stripes
      const numStripes = 14;
      const pitchTopY = 125;
      const pitchBottomY = 600;

      for (let i = 0; i < numStripes; i++) {
        const y1 = pitchTopY + Math.pow(i / numStripes, 1.8) * (pitchBottomY - pitchTopY);
        const y2 = pitchTopY + Math.pow((i + 1) / numStripes, 1.8) * (pitchBottomY - pitchTopY);

        ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#166534';
        ctx.fillRect(0, y1, 800, y2 - y1 + 1);
      }

      // Penalty Box Perspective Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 3;

      // Goal Line
      ctx.beginPath();
      ctx.moveTo(90, 310);
      ctx.lineTo(710, 310);
      ctx.stroke();

      // 18-yard box trapezoid
      ctx.beginPath();
      ctx.moveTo(90, 310);
      ctx.lineTo(710, 310);
      ctx.lineTo(840, 590);
      ctx.lineTo(-40, 590);
      ctx.closePath();
      ctx.stroke();

      // 6-yard box inner trapezoid
      ctx.beginPath();
      ctx.moveTo(220, 310);
      ctx.lineTo(580, 310);
      ctx.lineTo(640, 400);
      ctx.lineTo(160, 400);
      ctx.closePath();
      ctx.stroke();

      // Penalty Arc D-shape
      ctx.beginPath();
      ctx.ellipse(400, 505, 120, 45, 0, Math.PI * 0.95, Math.PI * 2.05);
      ctx.stroke();

      // Penalty Spot (White spot with 3D shadow)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(400, 507, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(400, 505, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // ==========================================
      // 4. 3D DYNAMIC GOAL NET & POSTS
      // ==========================================
      // Dynamic Net Vibration & Bulge decay
      if (net.bulgeForce > 0) {
        net.bulgeForce *= 0.92;
        net.vibration = Math.sin(Date.now() * 0.04) * net.bulgeForce * 8;
      }

      // Net Back Depth (sloping rear stanchions)
      const rearLeft = net.left + 25;
      const rearRight = net.right - 25;
      const rearTop = net.top - 20;
      const rearBottom = net.bottom - 10;

      // Draw Net Mesh with 3D Depth
      ctx.strokeStyle = 'rgba(241, 245, 249, 0.4)';
      ctx.lineWidth = 1.2;

      // Vertical net lines (perspective angled)
      for (let nx = net.left; nx <= net.right; nx += 18) {
        const ratio = (nx - net.left) / (net.right - net.left);
        const topX = net.left + ratio * (net.right - net.left);
        const rearX = rearLeft + ratio * (rearRight - rearLeft) + (ratio - 0.5) * net.bulgeForce * 20;
        const botX = net.left - 10 + ratio * (net.right - net.left + 20);

        ctx.beginPath();
        ctx.moveTo(topX, net.top);
        ctx.lineTo(rearX, rearTop + net.vibration);
        ctx.lineTo(botX, net.bottom);
        ctx.stroke();
      }

      // Horizontal net rows
      for (let ny = net.top; ny <= net.bottom; ny += 14) {
        const yProg = (ny - net.top) / (net.bottom - net.top);
        const bulge = Math.sin(yProg * Math.PI) * net.bulgeForce * 15;
        ctx.beginPath();
        ctx.moveTo(net.left, ny);
        ctx.quadraticCurveTo(400, ny - bulge + net.vibration, net.right, ny);
        ctx.stroke();
      }

      // Goal Post Shadow on pitch
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(net.left - 6, net.bottom - 4, 12, 8);
      ctx.fillRect(net.right - 6, net.bottom - 4, 12, 8);

      // Glowing White Goalposts & Shiny Crossbar
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(net.left, net.bottom);
      ctx.lineTo(net.left, net.top);
      ctx.lineTo(net.right, net.top);
      ctx.lineTo(net.right, net.bottom);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Goalpost metallic highlights
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(net.left - 1, net.bottom);
      ctx.lineTo(net.left - 1, net.top + 1);
      ctx.lineTo(net.right + 1, net.top + 1);
      ctx.lineTo(net.right + 1, net.bottom);
      ctx.stroke();

      // ==========================================
      // 5. BONUS TARGET RINGS (TOP BINS & CORNERS)
      // ==========================================
      eng.targets.forEach((tgt) => {
        if (!tgt.active) return;
        tgt.pulse = (tgt.pulse + 0.05) % (Math.PI * 2);
        const pulseScale = 1 + Math.sin(tgt.pulse) * 0.08;

        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, tgt.radius * pulseScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
        ctx.fill();

        // Target Center Bullseye
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'black 10px sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText(`+${tgt.points}`, tgt.x, tgt.y + 3);
        ctx.restore();
      });

      // ==========================================
      // 6. PRO ANIMATED GOALKEEPER
      // ==========================================
      g.idleBounce = Math.sin(Date.now() * 0.008) * 4;

      // Goalkeeper AI reactions when ball is struck
      if (gameState === 'playing' && b.inAir && g.state === 'idle') {
        g.state = 'diving';

        // GK intelligence scales with rounds
        const agility = 0.65 + eng.round * 0.08;
        const willGuessCorrect = Math.random() < agility;

        if (willGuessCorrect) {
          // Goalkeeper dives precisely towards ball trajectory
          g.targetX = Math.max(net.left + 35, Math.min(net.right - 35, b.targetX + (Math.random() - 0.5) * 35));
          g.targetY = Math.max(net.top + 20, Math.min(net.bottom - 25, b.targetY));
        } else {
          // Goalkeeper gets sent the wrong way
          g.targetX = b.targetX < 400 ? 560 : 240;
          g.targetY = 250;
        }
      }

      if (g.state === 'diving') {
        const diveSpeed = 0.13 + eng.round * 0.02;
        g.x += (g.targetX - g.x) * diveSpeed;
        g.y += (g.targetY - g.y) * diveSpeed;

        const diveDist = g.targetX - 400;
        g.diveAngle = (diveDist / 200) * 0.75;
      } else if (g.state === 'idle') {
        g.x = 400 + Math.sin(Date.now() * 0.003) * 15;
        g.y = 245 + g.idleBounce;
        g.diveAngle = 0;
      }

      // RENDER GOALKEEPER MODEL
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.diveAngle);

      // Goalkeeper Dynamic Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 42 - g.idleBounce * 0.5, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Goalkeeper Legs & Socks
      ctx.fillStyle = '#0284c7'; // Blue goalie socks
      ctx.fillRect(-14, 18, 9, 22);
      ctx.fillRect(5, 18, 9, 22);

      // Football Boots
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-16, 38, 12, 6);
      ctx.fillRect(5, 38, 12, 6);

      // Goalie Shorts
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-16, 5, 32, 16);

      // Goalkeeper Neon Jersey (Torso)
      const gkJerseyGrad = ctx.createLinearGradient(-18, -25, 18, 10);
      gkJerseyGrad.addColorStop(0, '#facc15'); // Bright Yellow/Neon Green
      gkJerseyGrad.addColorStop(1, '#84cc16');
      ctx.fillStyle = gkJerseyGrad;
      ctx.strokeStyle = '#4d7c0f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-18, -25, 36, 32, 6);
      ctx.fill();
      ctx.stroke();

      // Goalkeeper Number #1
      ctx.font = 'black 14px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText('1', 0, -4);

      // Goalkeeper Head & Hair
      ctx.fillStyle = '#fde047'; // Headband
      ctx.fillRect(-9, -40, 18, 4);

      ctx.fillStyle = '#fed7aa'; // Skin
      ctx.beginPath();
      ctx.arc(0, -32, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#451a03'; // Brown hair
      ctx.beginPath();
      ctx.arc(0, -36, 10, Math.PI, Math.PI * 2);
      ctx.fill();

      // Outstretched Goalkeeper Arms & Padded Gloves
      const armSpread = g.state === 'diving' ? 36 : 26;
      const armHeight = g.state === 'diving' ? -18 : -10 + g.idleBounce * 0.8;

      // Arms (Sleeves)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-16, -20);
      ctx.lineTo(-armSpread, armHeight);
      ctx.moveTo(16, -20);
      ctx.lineTo(armSpread, armHeight);
      ctx.stroke();

      // Goalkeeper Gloves (Large neon padded mittens with fingers)
      ctx.fillStyle = '#ea580c'; // Orange pro gloves
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.arc(-armSpread, armHeight, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(armSpread, armHeight, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Save glove coordinates for collision detection
      g.gloveX1 = g.x - armSpread * Math.cos(g.diveAngle) - armHeight * Math.sin(g.diveAngle);
      g.gloveY1 = g.y - armSpread * Math.sin(g.diveAngle) + armHeight * Math.cos(g.diveAngle);
      g.gloveX2 = g.x + armSpread * Math.cos(g.diveAngle) - armHeight * Math.sin(g.diveAngle);
      g.gloveY2 = g.y + armSpread * Math.sin(g.diveAngle) + armHeight * Math.cos(g.diveAngle);

      ctx.restore();

      // ==========================================
      // 7. PRO ANIMATED STRIKER (PLAYER)
      // ==========================================
      // Handle Striker Run-up and Kicking Animations
      if (s.kickPhase === 'runup') {
        s.runProgress += 0.08;
        s.x = 330 + (s.targetX - 330) * s.runProgress;
        s.y = 520 + (s.targetY - 520) * s.runProgress;
        s.legAngle = Math.sin(s.runProgress * Math.PI * 4) * 0.6;
        s.armAngle = -Math.sin(s.runProgress * Math.PI * 4) * 0.5;

        if (s.runProgress >= 1.0) {
          // Launch the ball at the exact instant the boot strikes!
          s.kickPhase = 'kick';
          s.legAngle = 1.2; // Full forward follow-through swing
          sound.playKick();
          addParticles(b.x, b.y, '#38bdf8', 15, 6);
        }
      } else if (s.kickPhase === 'kick') {
        s.animTimer += 0.06;
        s.legAngle *= 0.88;
        if (s.animTimer > 0.6) {
          s.kickPhase = 'idle';
        }
      } else if (s.kickPhase === 'celebrate') {
        s.animTimer += 0.05;
        s.x = 388 + Math.sin(s.animTimer * 2) * 15;
        s.armAngle = -1.4; // Arms raised high in celebration!
      } else if (s.kickPhase === 'frustrated') {
        s.armAngle = 0.8; // Hands on head
      } else {
        // Idle ready stance
        s.legAngle = 0.1;
        s.armAngle = 0.1 + Math.sin(Date.now() * 0.005) * 0.08;
      }

      // RENDER STRIKER MODEL
      ctx.save();
      ctx.translate(s.x, s.y);

      // Player Grass Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 36, 26, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden champion aura if ON FIRE
      if (eng.streak >= 2) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 48, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Left Leg (Plant Foot)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-14, 14, 10, 20);
      ctx.fillStyle = '#f43f5e'; // Pink Nike cleats
      ctx.fillRect(-16, 32, 14, 6);

      // Right Leg (Kicking Foot with dynamic swing angle)
      ctx.save();
      ctx.translate(8, 14);
      ctx.rotate(s.legAngle);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-4, 0, 10, 20);
      ctx.fillStyle = '#f43f5e'; // Pink cleat
      ctx.fillRect(-2, 18, 14, 6);
      ctx.restore();

      // Striker Shorts
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-18, 0, 36, 18);

      // Striker Pro Jersey (Cyan/Teal Gradient with Number 10)
      const strikerJerseyGrad = ctx.createLinearGradient(-18, -32, 18, 0);
      strikerJerseyGrad.addColorStop(0, '#06b6d4');
      strikerJerseyGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = strikerJerseyGrad;
      ctx.strokeStyle = '#0891b2';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-18, -32, 36, 34, 6);
      ctx.fill();
      ctx.stroke();

      // Number 10 on back of jersey
      ctx.font = 'black 14px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('10', 0, -10);

      // Striker Arms
      ctx.save();
      ctx.translate(-16, -26);
      ctx.rotate(s.armAngle);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-8, 18);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(16, -26);
      ctx.rotate(-s.armAngle);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(8, 18);
      ctx.stroke();
      ctx.restore();

      // Striker Head & Modern Hair
      ctx.fillStyle = '#fed7aa'; // Skin
      ctx.beginPath();
      ctx.arc(0, -42, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e1b4b'; // Dark styled hair
      ctx.beginPath();
      ctx.arc(0, -46, 11, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();

      ctx.restore();

      // ==========================================
      // 8. BALL TRAJECTORY & 3D PHYSICS FLIGHT
      // ==========================================
      if (gameState === 'playing' && b.inAir && !b.resolved) {
        // Apply velocity, wind, and Magnus curve effect
        b.x += b.vx + b.curve + eng.wind * 0.12;
        b.y += b.vy;
        b.z -= b.vz;
        b.rotation += 0.25;

        // Record ball flight trail
        b.trail.push({ x: b.x, y: b.y, z: b.z, alpha: 0.8 });
        if (b.trail.length > 14) b.trail.shift();

        // Fireball particles if ON FIRE
        if (b.isFireball) {
          addParticles(b.x, b.y, '#f97316', 1, 0.4);
        }

        // Check Crossbar / Post Metallic Clang Collision
        const postLeft = net.left;
        const postRight = net.right;
        const crossbarY = net.top;

        if (b.z <= 0.48 && b.z >= 0.42) {
          const hitCrossbar = Math.abs(b.y - crossbarY) < 14 && b.x >= postLeft - 10 && b.x <= postRight + 10;
          const hitLeftPost = Math.abs(b.x - postLeft) < 14 && b.y >= crossbarY && b.y <= net.bottom;
          const hitRightPost = Math.abs(b.x - postRight) < 14 && b.y >= crossbarY && b.y <= net.bottom;

          if (hitCrossbar || hitLeftPost || hitRightPost) {
            b.resolved = true;
            b.inAir = false;
            sound.playCrossbar();
            sound.playCrowdGasp();
            eng.screenShake = 8;
            addParticles(b.x, b.y, '#f59e0b', 30, 7);
            setFeedback('💥 OFF THE WOODWORK! POST / CROSSBAR');
            s.kickPhase = 'frustrated';
            setGoals((prev) => [...prev, 'miss']);
            eng.streak = 0;
            setStreak(0);

            setTimeout(() => {
              if (eng.round >= maxRounds) completeTournament();
              else {
                eng.round++;
                setRound(eng.round);
                resetRound();
              }
            }, 1500);
          }
        }

        // When ball reaches the goal line depth (z <= 0.44)
        if (b.z <= 0.44 && !b.resolved) {
          b.resolved = true;
          b.inAir = false;

          // Check if Goalkeeper saved the shot
          const distToGoalie = Math.hypot(b.x - g.x, b.y - g.y);
          const distToGlove1 = Math.hypot(b.x - g.gloveX1, b.y - g.gloveY1);
          const distToGlove2 = Math.hypot(b.x - g.gloveX2, b.y - g.gloveY2);

          if (distToGoalie < 48 || distToGlove1 < 24 || distToGlove2 < 24) {
            // GOALKEEPER SAVE!
            sound.playGloveSave();
            sound.playCrowdGasp();
            setFeedback('🧤 WHAT A SAVE BY THE KEEPER!');
            eng.screenShake = 7;
            addParticles(b.x, b.y, '#ef4444', 30, 6);
            g.state = 'saved';
            s.kickPhase = 'frustrated';
            eng.streak = 0;
            setStreak(0);
            setGoals((prev) => [...prev, 'saved']);

            setTimeout(() => {
              if (eng.round >= maxRounds) completeTournament();
              else {
                eng.round++;
                setRound(eng.round);
                resetRound();
              }
            }, 1400);
          } else if (
            b.x >= net.left + 8 &&
            b.x <= net.right - 8 &&
            b.y >= net.top + 6 &&
            b.y <= net.bottom - 4
          ) {
            // GOOOOOAL!
            sound.playGoalCheer();
            sound.playCollect();
            eng.screenShake = 12;
            net.bulgeX = b.x;
            net.bulgeY = b.y;
            net.bulgeForce = 1.0;
            g.state = 'conceded';
            s.kickPhase = 'celebrate';

            addParticles(b.x, b.y, '#10b981', 40, 8);

            // Check if bonus target ring was struck
            let pointsEarned = 300;
            let targetHit = false;

            eng.targets.forEach((tgt) => {
              if (tgt.active && Math.hypot(b.x - tgt.x, b.y - tgt.y) <= tgt.radius + 8) {
                pointsEarned += tgt.points;
                targetHit = true;
                setFeedback(`⚽ ${tgt.label}! +${pointsEarned} PTS!`);
                addFloatingText(tgt.x, tgt.y - 20, `🎯 ${tgt.label}! +${pointsEarned}`, '#f59e0b');
              }
            });

            if (!targetHit) {
              setFeedback(`⚽ GOOOOOAL! +${pointsEarned} PTS!`);
              addFloatingText(b.x, b.y - 20, `⚽ GOAL! +${pointsEarned}`, '#10b981');
            }

            eng.streak++;
            setStreak(eng.streak);
            if (eng.streak >= 2) {
              pointsEarned *= 2;
              addFloatingText(400, 200, '🔥 2X STREAK MULTIPLIER!', '#f97316');
            }

            eng.score += pointsEarned;
            setScore(eng.score);
            setGoals((prev) => [...prev, 'goal']);

            setTimeout(() => {
              if (eng.round >= maxRounds) completeTournament();
              else {
                eng.round++;
                setRound(eng.round);
                resetRound();
              }
            }, 1600);
          } else {
            // WIDE / OFF TARGET MISS
            sound.playGameOver();
            sound.playCrowdGasp();
            setFeedback('❌ WIDE! OFF TARGET');
            s.kickPhase = 'frustrated';
            eng.streak = 0;
            setStreak(0);
            setGoals((prev) => [...prev, 'miss']);

            setTimeout(() => {
              if (eng.round >= maxRounds) completeTournament();
              else {
                eng.round++;
                setRound(eng.round);
                resetRound();
              }
            }, 1400);
          }
        }
      }

      // ==========================================
      // 9. SWIPE TRAJECTORY PREDICTION CURVE
      // ==========================================
      if (eng.drag.isDragging && !b.inAir) {
        const dx = eng.drag.currX - eng.drag.startX;
        const dy = eng.drag.currY - eng.drag.startY;

        ctx.strokeStyle = eng.streak >= 2 ? 'rgba(249, 115, 22, 0.85)' : 'rgba(6, 182, 212, 0.85)';
        ctx.lineWidth = 4;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);

        // Draw curved trajectory points
        const targetX = b.x + dx * 2.5 + eng.wind * 15;
        const targetY = Math.max(120, b.y + dy * 2.5);
        ctx.quadraticCurveTo(b.x + dx * 1.2, b.y + dy * 1.2, targetX, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target Aim Reticle
        ctx.strokeStyle = eng.streak >= 2 ? '#f97316' : '#22d3ee';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = eng.streak >= 2 ? '#f97316' : '#22d3ee';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // ==========================================
      // 10. DRAW BALL FLIGHT TRAILS & 3D FOOTBALL
      // ==========================================
      b.trail.forEach((t, idx) => {
        const trScale = Math.max(0.42, t.z);
        ctx.fillStyle = b.isFireball
          ? `rgba(249, 115, 22, ${t.alpha * (idx / b.trail.length)})`
          : `rgba(6, 182, 212, ${t.alpha * (idx / b.trail.length)})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, b.radius * trScale * (idx / b.trail.length), 0, Math.PI * 2);
        ctx.fill();
      });

      // Ball Perspective Scale & Radius
      const curRadius = b.radius * Math.max(0.42, b.z);

      // Realistic Ball Shadow on grass pitch (expands, softens, and shifts with flight height)
      const shadowY = 505 - (505 - b.y) * 0.18;
      const heightOffset = Math.max(0, (505 - b.y) * 0.08);
      const shadowAlpha = Math.max(0.18, 0.45 - heightOffset * 0.005);
      ctx.fillStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(b.x + heightOffset * 0.4, shadowY, curRadius * 1.15 + heightOffset * 0.2, curRadius * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Render 3D Authentic Match Football
      drawAuthenticFootball(ctx, b.x, b.y, curRadius, b.rotation, b.isFireball);

      // ==========================================
      // 11. PARTICLES & FLOATING TEXTS
      // ==========================================
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const pt = eng.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
        pt.alpha = 1 - pt.life / pt.maxLife;

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (pt.life >= pt.maxLife) eng.particles.splice(i, 1);
      }

      for (let i = eng.floatingTexts.length - 1; i >= 0; i--) {
        const ft = eng.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.016;

        ctx.font = 'black 16px sans-serif';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;

        if (ft.alpha <= 0) eng.floatingTexts.splice(i, 1);
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, resetRound, completeTournament, maxRounds]);

  // Pointer drag swipe to kick
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const b = engineRef.current.ball;
    if (!b.inAir && engineRef.current.striker.kickPhase === 'idle') {
      engineRef.current.drag = {
        isDragging: true,
        startX: px,
        startY: py,
        currX: px,
        currY: py,
        points: [{ x: px, y: py }],
        startTime: Date.now(),
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current.drag.isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    engineRef.current.drag.currX = px;
    engineRef.current.drag.currY = py;
    engineRef.current.drag.points.push({ x: px, y: py });
  };

  const handlePointerUp = useCallback(() => {
    const d = engineRef.current.drag;
    const b = engineRef.current.ball;
    const s = engineRef.current.striker;

    if (d.isDragging && !b.inAir && s.kickPhase === 'idle') {
      d.isDragging = false;
      const dx = d.currX - d.startX;
      const dy = d.currY - d.startY;
      const dist = Math.hypot(dx, dy);

      // Must swipe upwards toward goal
      if (dy < -15 && dist > 20) {
        const duration = Math.max(60, Date.now() - d.startTime);
        const speed = Math.min(dist / (duration * 0.075), 38);
        const calculatedKmH = Math.round(75 + speed * 2.2);
        setShotSpeed(calculatedKmH);

        // Calculate curl / Magnus curve from swipe arch
        let curveVal = 0;
        if (d.points.length > 4) {
          const midPoint = d.points[Math.floor(d.points.length / 2)];
          const chordX = (d.points[0].x + d.points[d.points.length - 1].x) / 2;
          curveVal = (midPoint.x - chordX) * 0.08;
        }

        b.targetX = b.x + dx * 2.5;
        b.targetY = Math.max(115, b.y + dy * 2.5);
        b.vx = (b.targetX - b.x) / 22;
        b.vy = (b.targetY - b.y) / 22;
        b.vz = 0.56 / 22;
        b.curve = curveVal;
        b.inAir = true;

        // Trigger Striker Run-up!
        s.kickPhase = 'runup';
        s.runProgress = 0;
        sound.playJump();
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerUp]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center select-none">
      {/* Top Stadium Match HUD */}
      <div className="w-full mb-3 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-white backdrop-blur-sm shadow-xl">
        {/* Tournament Stage & Kick Round */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-black text-amber-300">{stage}</span>
            <span className="text-xs text-slate-400 font-semibold">({round}/{maxRounds})</span>
          </div>

          {/* Goal Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: maxRounds }).map((_, i) => {
              const res = goals[i];
              return (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-black ${
                    res === 'goal'
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/40'
                      : res === 'saved'
                      ? 'bg-rose-500 border-rose-400 text-white shadow-md shadow-rose-500/40'
                      : res === 'miss'
                      ? 'bg-slate-700 border-slate-600 text-slate-400'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  {res === 'goal' ? '✓' : res === 'saved' ? 'S' : res === 'miss' ? '✕' : ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Wind & Speedometer */}
        <div className="hidden sm:flex items-center gap-3">
          {wind !== 0 && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-bold">
              <Wind className="w-3.5 h-3.5" />
              <span>{wind > 0 ? `WIND +${wind}` : `WIND ${wind}`}</span>
            </div>
          )}

          {streak >= 2 && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-400/50 text-orange-400 text-xs font-black animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-current" /> 2X ON FIRE
            </div>
          )}

          {shotSpeed > 0 && (
            <div className="text-xs text-emerald-400 font-bold tracking-wide">
              ⚡ {shotSpeed} KM/H
            </div>
          )}
        </div>

        {/* Score & Audio Controls */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Championship PTS</div>
            <div className="text-lg font-black text-emerald-400 tracking-wider tabular-nums">{score}</div>
          </div>
          <button
            onClick={() => {
              const m = sound.toggleMute();
              setMuted(m);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Pitch Arena */}
      <div className="relative w-full aspect-[4/5] sm:aspect-[4/3] max-h-[74vh] sm:max-h-[82vh] rounded-2xl overflow-hidden border-2 border-slate-800 bg-[#030712] shadow-2xl shadow-emerald-950/30">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full touch-none block cursor-crosshair"
        />

        {/* Active Feedback Banner */}
        {feedback && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-950/85 border border-emerald-500/50 text-emerald-300 text-xs sm:text-sm font-black shadow-lg animate-bounce z-10">
            {feedback}
          </div>
        )}

        {/* Idle / Start Championship Screen */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4 animate-bounce">
              <Trophy className="w-9 h-9 text-slate-950" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wide mb-1">
              NEON STRIKER <span className="text-emerald-400">PENALTY HERO</span>
            </h2>
            <p className="text-xs text-amber-300 font-bold uppercase tracking-widest mb-3">
              ★ PRO PLAYER & GOALKEEPER 3D EDITION ★
            </p>
            <p className="text-slate-300 text-sm max-w-md mb-6 leading-relaxed">
              Watch your player make a dynamic run-up strike! Swipe & curve past reactive diving goalkeepers and hit corner Top Bins for 500+ PTS bonuses.
            </p>
            <button
              onClick={startNewGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base flex items-center gap-2 shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START CHAMPIONSHIP SHOOTOUT</span>
            </button>
          </div>
        )}

        {/* Game Over / Trophy Ceremony */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mb-3">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-1">CHAMPIONSHIP FINAL!</h2>
            <p className="text-slate-400 text-xs mb-4">5-Round Penalty Shootout Completed</p>

            <div className="grid grid-cols-2 gap-3 my-2 w-full max-w-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Match PTS</div>
                <div className="text-2xl font-black text-emerald-400 tabular-nums">{score}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold flex items-center justify-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" /> Best Score
                </div>
                <div className="text-2xl font-black text-amber-400 tabular-nums">{highScore}</div>
              </div>
            </div>

            <div className="text-xs text-slate-400 mb-4">
              Goals Converted: <span className="text-white font-bold">{goals.filter((g) => g === 'goal').length} / {maxRounds}</span>
            </div>

            {isNewHigh && (
              <div className="mb-4 text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/50 px-3 py-1 rounded-full animate-bounce">
                🎉 NEW CHAMPIONSHIP RECORD!
              </div>
            )}

            <button
              onClick={startNewGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base flex items-center gap-2 shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY NEXT TOURNAMENT</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
