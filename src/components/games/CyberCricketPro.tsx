import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Award,
  Shield,
  ChevronRight,
  CircleDot
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

// --- TEAMS DATA ---
export interface Team {
  id: string;
  name: string;
  code: string;
  flagEmoji: string;
  jerseyColor: string;
  trimColor: string;
  padColor: string;
  rating: number;
}

const TEAMS: Team[] = [
  { id: 'ind', name: 'INDIA', code: 'IND', flagEmoji: '🇮🇳', jerseyColor: '#0ea5e9', trimColor: '#f97316', padColor: '#38bdf8', rating: 96 },
  { id: 'aus', name: 'AUSTRALIA', code: 'AUS', flagEmoji: '🇦🇺', jerseyColor: '#eab308', trimColor: '#15803d', padColor: '#facc15', rating: 95 },
  { id: 'eng', name: 'ENGLAND', code: 'ENG', flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', jerseyColor: '#ef4444', trimColor: '#1e3a8a', padColor: '#f87171', rating: 93 },
  { id: 'pak', name: 'PAKISTAN', code: 'PAK', flagEmoji: '🇵🇰', jerseyColor: '#16a34a', trimColor: '#eab308', padColor: '#4ade80', rating: 91 },
  { id: 'sa', name: 'SOUTH AFRICA', code: 'SA', flagEmoji: '🇿🇦', jerseyColor: '#059669', trimColor: '#facc15', padColor: '#34d399', rating: 92 },
  { id: 'nz', name: 'NEW ZEALAND', code: 'NZ', flagEmoji: '🇳🇿', jerseyColor: '#334155', trimColor: '#0284c7', padColor: '#64748b', rating: 92 },
  { id: 'wi', name: 'WEST INDIES', code: 'WI', flagEmoji: '🌴', jerseyColor: '#881337', trimColor: '#fbbf24', padColor: '#be123c', rating: 89 },
  { id: 'sl', name: 'SRI LANKA', code: 'SL', flagEmoji: '🇱🇰', jerseyColor: '#1d4ed8', trimColor: '#f59e0b', padColor: '#60a5fa', rating: 88 },
];

type GameStage = 'team-select' | 'playing' | 'target-won' | 'gameover';

export const CyberCricketPro: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Match State
  const [stage, setStage] = useState<GameStage>('team-select');
  const [userTeam, setUserTeam] = useState<Team>(TEAMS[0]);
  const [opponentTeam, setOpponentTeam] = useState<Team>(TEAMS[1]);
  const [overs, setOvers] = useState<number>(2); // 2 overs = 12 balls
  const [ballsLeft, setBallsLeft] = useState<number>(12);
  const [wicketsLeft, setWicketsLeft] = useState<number>(2);
  const [target, setTarget] = useState<number>(20);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [lastOutcomeText, setLastOutcomeText] = useState<string>('');
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // 60 FPS Physics & Canvas State Ref
  const engineRef = useRef<{
    // Ball State
    ballX: number;
    ballY: number;
    ballVx: number;
    ballVy: number;
    ballActive: boolean;
    ballSpeed: number;
    ballBounced: boolean;
    pitchBounceX: number;
    pitchBounceY: number;

    // Batting State
    batsmanSwingProgress: number; // 0 = ready, >0 = swinging
    batHitBall: boolean;
    hitBall: { x: number; y: number; vx: number; vy: number; isSix: boolean } | null;

    // Right Radial Arc Gauge (1, 2, 3, 4, 6)
    gaugeAngle: number; // normalized 0 to 1
    gaugeDir: number; // +1 or -1
    needleSector: number; // 1, 2, 3, 4, 6

    // Stumps & Bails
    stumpsHit: boolean;
    bails: { x1: number; y1: number; vx1: number; vy1: number; x2: number; y2: number; vx2: number; vy2: number };

    // Delivery Cooldown
    isDelivering: boolean;
    outcomeDisplayTimer: number;
  }>({
    ballX: 1100,
    ballY: 480,
    ballVx: -14,
    ballVy: 1.5,
    ballActive: false,
    ballSpeed: 14,
    ballBounced: false,
    pitchBounceX: 520,
    pitchBounceY: 575,

    batsmanSwingProgress: 0,
    batHitBall: false,
    hitBall: null,

    gaugeAngle: 0.2,
    gaugeDir: 1,
    needleSector: 1,

    stumpsHit: false,
    bails: { x1: 130, y1: 520, vx1: 0, vy1: 0, x2: 142, y2: 520, vx2: 0, vy2: 0 },

    isDelivering: false,
    outcomeDisplayTimer: 0,
  });

  // Start Tournament Match
  const startMatch = () => {
    sound.playClick();
    const count = overs * 6;
    const genTarget = overs === 1 ? 14 + Math.floor(Math.random() * 8) : overs * 12 + Math.floor(Math.random() * 10);
    setBallsLeft(count);
    setWicketsLeft(2);
    setTarget(genTarget);
    setCurrentScore(0);
    setLastOutcomeText('');
    setStage('playing');

    setTimeout(() => {
      bowlDelivery();
    }, 700);
  };

  // Bowl Next Ball from Right to Left
  const bowlDelivery = useCallback(() => {
    const eng = engineRef.current;
    eng.ballActive = true;
    eng.batHitBall = false;
    eng.hitBall = null;
    eng.stumpsHit = false;
    eng.ballBounced = false;

    eng.ballX = 1120;
    eng.ballY = 490;
    eng.ballSpeed = 13.5 + Math.random() * 3.5;
    eng.ballVx = -eng.ballSpeed;
    eng.ballVy = 1.6;
    eng.pitchBounceX = 480 + Math.random() * 90;
    eng.pitchBounceY = 575;
    eng.isDelivering = true;

    setLastOutcomeText('');
    sound.playLaser();
  }, []);

  // One-Tap Bat Swing Handler (Poki Style)
  const handleSwing = useCallback(() => {
    const eng = engineRef.current;
    if (!eng.ballActive || eng.batHitBall || stage !== 'playing') return;

    eng.batsmanSwingProgress = 1.0; // Trigger swing animation
    const ballDist = Math.abs(eng.ballX - 265); // Batsman is at X=240

    let scoredRuns = 0;
    let isWicket = false;
    let resultText = '';

    // If ball is within the hitting zone
    if (ballDist <= 110) {
      eng.batHitBall = true;
      sound.playHit();

      // Read value from the Right Radial Arc Needle (1, 2, 3, 4, 6)
      const sector = eng.needleSector;
      if (sector === 6) {
        scoredRuns = 6;
        resultText = '6';
        sound.playWin();
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
        eng.hitBall = { x: 250, y: 550, vx: 20 + Math.random() * 6, vy: -26, isSix: true };
      } else if (sector === 4) {
        scoredRuns = 4;
        resultText = '4';
        sound.playCollect();
        eng.hitBall = { x: 250, y: 550, vx: 24 + Math.random() * 6, vy: -14, isSix: false };
      } else if (sector === 3) {
        scoredRuns = 3;
        resultText = '3';
        eng.hitBall = { x: 250, y: 550, vx: 18, vy: -11, isSix: false };
      } else if (sector === 2) {
        scoredRuns = 2;
        resultText = '2';
        eng.hitBall = { x: 250, y: 550, vx: 15, vy: -9, isSix: false };
      } else {
        scoredRuns = 1;
        resultText = '1';
        eng.hitBall = { x: 250, y: 550, vx: 12, vy: -7, isSix: false };
      }
    } else if (eng.ballX < 190) {
      // Missed completely - hits the red LED stumps
      isWicket = true;
      resultText = 'OUT';
      eng.stumpsHit = true;
      eng.bails = { x1: 130, y1: 520, vx1: -9, vy1: -14, x2: 145, y2: 520, vx2: -5, vy2: -16 };
      sound.playExplosion();
    } else {
      // Swung too early
      resultText = '0';
    }

    setLastOutcomeText(resultText);

    // Update Match Score
    const newBallsLeft = ballsLeft - 1;
    setBallsLeft(newBallsLeft);

    if (isWicket) {
      const newW = wicketsLeft - 1;
      setWicketsLeft(newW);
      if (newW <= 0 || newBallsLeft <= 0) {
        setTimeout(() => {
          setStage('gameover');
          sound.playGameOver();
        }, 1200);
        return;
      }
    } else {
      const newScore = currentScore + scoredRuns;
      setCurrentScore(newScore);

      if (newScore >= target) {
        setTimeout(() => {
          setStage('target-won');
          sound.playWin();
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
        }, 1000);
        return;
      }

      if (newBallsLeft <= 0) {
        setTimeout(() => {
          setStage('gameover');
          sound.playGameOver();
        }, 1200);
        return;
      }
    }

    // Next delivery
    setTimeout(() => {
      bowlDelivery();
    }, 1500);
  }, [ballsLeft, currentScore, stage, target, wicketsLeft, bowlDelivery]);

  // Space / Enter listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleSwing();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwing]);

  // 60 FPS Canvas Renderer matching Poki Reference Screenshot Exactly
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const eng = engineRef.current;
      const W = 1200;
      const H = 675;

      // =========================================================================
      // 1. SKY & STADIUM GRANDSTAND BACKGROUND (MATCHING SCREENSHOT)
      // =========================================================================
      // Dark Night Sky
      ctx.fillStyle = '#030206';
      ctx.fillRect(0, 0, W, H);

      // Night Sky Deep Reddish-Brown Horizon Glow
      const skyGrad = ctx.createLinearGradient(0, 120, 0, 380);
      skyGrad.addColorStop(0, '#0a0410');
      skyGrad.addColorStop(0.65, '#280c16');
      skyGrad.addColorStop(1, '#421320');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 120, W, 260);

      // Stadium Floodlights (Left & Right Glowing Towers)
      // Left Floodlight Tower & Beam
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.ellipse(140, 260, 42, 28, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Left Radiant Cone Beam
      const leftBeam = ctx.createRadialGradient(140, 260, 15, 300, 520, 480);
      leftBeam.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      leftBeam.addColorStop(0.55, 'rgba(255, 255, 255, 0.12)');
      leftBeam.addColorStop(1, 'transparent');
      ctx.fillStyle = leftBeam;
      ctx.beginPath();
      ctx.moveTo(140, 260);
      ctx.lineTo(0, 675);
      ctx.lineTo(650, 675);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Right Floodlight Tower & Beam
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.ellipse(1060, 260, 42, 28, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Right Radiant Cone Beam
      const rightBeam = ctx.createRadialGradient(1060, 260, 15, 900, 520, 480);
      rightBeam.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      rightBeam.addColorStop(0.55, 'rgba(255, 255, 255, 0.12)');
      rightBeam.addColorStop(1, 'transparent');
      ctx.fillStyle = rightBeam;
      ctx.beginPath();
      ctx.moveTo(1060, 260);
      ctx.lineTo(550, 675);
      ctx.lineTo(1200, 675);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Grandstand Upper Tier Roof Structure
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.moveTo(0, 340);
      ctx.bezierCurveTo(400, 315, 800, 315, W, 340);
      ctx.lineTo(W, 460);
      ctx.lineTo(0, 460);
      ctx.closePath();
      ctx.fill();

      // Cheering Multi-Colored Crowd
      for (let i = 0; i < 360; i++) {
        const cx = (i * 19) % W;
        const cy = 345 + (i % 7) * 14;
        ctx.fillStyle = i % 5 === 0 ? '#ef4444' : i % 4 === 0 ? '#0284c7' : i % 3 === 0 ? '#facc15' : '#ffffff';
        ctx.fillRect(cx, cy, 6, 7);
      }

      // Stadium Center Green Electronic Scoreboard Box (Matching Screenshot)
      ctx.fillStyle = '#15803d';
      ctx.fillRect(525, 410, 120, 60);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(525, 410, 120, 60);
      // Yellow Digital Score Dots Matrix
      ctx.fillStyle = '#fde047';
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 9; c++) {
          ctx.fillRect(537 + c * 11, 420 + r * 12, 5, 5);
        }
      }

      // Stadium Perimeter LED Ad Boards
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 470, W, 26);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('PEPSI • EMIRATES • SONY • NISSAN • MRF TYRES • BOOKING.COM • PEPSI • EMIRATES • SONY', 30, 488);

      // =========================================================================
      // 2. GREEN OUTFIELD & 22-YARD TURF PITCH (MATCHING SCREENSHOT)
      // =========================================================================
      // Deep Green Outfield
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(0, 496, W, 179);

      // Light Green Lawn Stripes
      ctx.fillStyle = '#84cc16';
      ctx.fillRect(0, 540, W, 65);

      // 22-Yard Sandy-Tan Dirt Pitch (Horizontal Strip)
      ctx.fillStyle = '#d4c275';
      ctx.fillRect(0, 510, W, 105);

      // Light Tan Pitch Infield
      ctx.fillStyle = '#e5d796';
      ctx.fillRect(0, 522, W, 82);

      // White Batting Popping Crease on Left (X=250)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(250, 510);
      ctx.lineTo(250, 615);
      ctx.stroke();

      // =========================================================================
      // 3. RED LED STUMPS & FLASHING BAILS (AT X=135)
      // =========================================================================
      ctx.save();
      const stumpColor = eng.stumpsHit ? '#ef4444' : '#b91c1c';
      ctx.strokeStyle = stumpColor;
      ctx.lineWidth = 5;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      if (eng.stumpsHit) {
        ctx.moveTo(125, 595);
        ctx.lineTo(105, 515);
        ctx.moveTo(135, 595);
        ctx.lineTo(150, 500);
        ctx.moveTo(145, 595);
        ctx.lineTo(170, 530);
      } else {
        ctx.moveTo(130, 595);
        ctx.lineTo(130, 530);
        ctx.moveTo(136, 595);
        ctx.lineTo(136, 530);
        ctx.moveTo(142, 595);
        ctx.lineTo(142, 530);
      }
      ctx.stroke();

      // Flying Bails
      if (eng.stumpsHit) {
        eng.bails.x1 += eng.bails.vx1;
        eng.bails.y1 += eng.bails.vy1;
        eng.bails.vy1 += 0.48;
        eng.bails.x2 += eng.bails.vx2;
        eng.bails.y2 += eng.bails.vy2;
        eng.bails.vy2 += 0.48;

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(eng.bails.x1 - 8, eng.bails.y1);
        ctx.lineTo(eng.bails.x1 + 8, eng.bails.y1);
        ctx.moveTo(eng.bails.x2 - 8, eng.bails.y2);
        ctx.lineTo(eng.bails.x2 + 8, eng.bails.y2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(127, 530);
        ctx.lineTo(145, 530);
        ctx.stroke();
      }
      ctx.restore();

      // =========================================================================
      // 4. BATSMAN CHARACTER MODEL (EXACTLY MATCHING SCREENSHOT)
      // =========================================================================
      ctx.save();
      ctx.translate(275, 515);

      // Padded Leg Guards (Batting Pads)
      ctx.fillStyle = userTeam.padColor;
      ctx.fillRect(-16, 22, 14, 52);
      ctx.fillRect(4, 22, 14, 52);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-16, 22, 14, 52);
      ctx.strokeRect(4, 22, 14, 52);

      // White Cricket Shoes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-18, 72, 18, 8);
      ctx.fillRect(3, 72, 18, 8);

      // National Team Jersey (Torso)
      ctx.fillStyle = userTeam.jerseyColor;
      ctx.fillRect(-22, -30, 44, 52);
      ctx.strokeStyle = userTeam.trimColor;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-22, -30, 44, 52);

      // Team Name on Chest (e.g. "INDIA")
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(userTeam.name, 0, -5);

      // Cricket Helmet with Visor & Steel Grille
      ctx.fillStyle = userTeam.jerseyColor;
      ctx.beginPath();
      ctx.arc(0, -50, 20, 0, Math.PI * 2);
      ctx.fill();

      // Steel Grille Visor
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(5, -48, 17, -0.3, 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-5, -45);
      ctx.lineTo(17, -45);
      ctx.moveTo(-2, -40);
      ctx.lineTo(15, -40);
      ctx.stroke();

      // Padded Batting Gloves
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-12, 6, 7, 0, Math.PI * 2);
      ctx.arc(12, 6, 7, 0, Math.PI * 2);
      ctx.fill();

      // Wooden Cricket Bat with Full Swing Animation
      ctx.save();
      if (eng.batsmanSwingProgress > 0) {
        // High-Speed Forward Power Smash Follow-Through Arc
        ctx.rotate(1.15);
        ctx.translate(18, -35);
      } else {
        // Ready Stance (Bat tapping down onto pitch)
        ctx.rotate(-0.35);
        ctx.translate(-14, 15);
      }

      // Wooden Blade
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-5, -55, 14, 75);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-5, -55, 14, 75);

      // White Rubber Handle Grip
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2.5, 20, 9, 26);
      ctx.restore();

      ctx.restore(); // end batsman

      // =========================================================================
      // 5. BALL FLIGHT & HIT TRAJECTORY (RIGHT TO LEFT)
      // =========================================================================
      if (eng.ballActive && !eng.batHitBall) {
        eng.ballX += eng.ballVx;
        eng.ballY += eng.ballVy;

        // Bounce on pitch
        if (eng.ballX <= eng.pitchBounceX && !eng.ballBounced) {
          eng.ballBounced = true;
          eng.ballVy = -2.6; // upward bounce off turf
        }

        // Draw Leather Cricket Ball
        ctx.save();
        ctx.fillStyle = '#dc2626';
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(eng.ballX, eng.ballY, 9, 0, Math.PI * 2);
        ctx.fill();

        // White Seam
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(eng.ballX, eng.ballY, 7, 0.2, Math.PI * 0.8);
        ctx.stroke();
        ctx.restore();

        // Auto swing if ball passes batsman
        if (eng.ballX <= 170) {
          handleSwing();
        }
      }

      // Smashed Ball Flight Trajectory
      if (eng.hitBall) {
        const hb = eng.hitBall;
        hb.x += hb.vx;
        hb.y += hb.vy;
        hb.vy += hb.isSix ? 0.45 : 0.32; // Gravity

        ctx.save();
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(hb.x, hb.y, hb.isSix ? 12 : 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (eng.batsmanSwingProgress > 0) eng.batsmanSwingProgress -= 0.04;

      // =========================================================================
      // 6. RIGHT RADIAL ARC GAUGE (1, 2, 3, 4, 6) (EXACTLY MATCHING SCREENSHOT)
      // =========================================================================
      ctx.save();
      const gaugeCenterX = 1200;
      const gaugeCenterY = 675;
      const gaugeRadius = 570;

      // Outer Thick White Radial Arc
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, Math.PI * 1.0, Math.PI * 1.5);
      ctx.stroke();

      // Sector Markings Along the Arc: 1, 2, 3, 4, 6
      const sectors = [
        { label: '1', angle: Math.PI * 1.05, sec: 1 },
        { label: '2', angle: Math.PI * 1.15, sec: 2 },
        { label: '3', angle: Math.PI * 1.25, sec: 3 },
        { label: '4', angle: Math.PI * 1.36, sec: 4 },
        { label: '6', angle: Math.PI * 1.46, sec: 6 },
      ];

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      sectors.forEach((sec) => {
        const tx = gaugeCenterX + Math.cos(sec.angle) * (gaugeRadius - 40);
        const ty = gaugeCenterY + Math.sin(sec.angle) * (gaugeRadius - 40);
        ctx.fillText(sec.label, tx, ty);

        // Tick marks on arc
        const x1 = gaugeCenterX + Math.cos(sec.angle) * (gaugeRadius - 14);
        const y1 = gaugeCenterY + Math.sin(sec.angle) * (gaugeRadius - 14);
        const x2 = gaugeCenterX + Math.cos(sec.angle) * (gaugeRadius + 14);
        const y2 = gaugeCenterY + Math.sin(sec.angle) * (gaugeRadius + 14);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Animated Sweeping Indicator Needle Along the Arc
      eng.gaugeAngle += 0.024 * eng.gaugeDir;
      if (eng.gaugeAngle >= 0.48) eng.gaugeDir = -1;
      if (eng.gaugeAngle <= 0.04) eng.gaugeDir = 1;

      // Determine Needle Sector (1, 2, 3, 4, 6)
      const currentNeedleAngle = Math.PI * (1.02 + eng.gaugeAngle);
      if (eng.gaugeAngle >= 0.40) {
        eng.needleSector = 6;
      } else if (eng.gaugeAngle >= 0.30) {
        eng.needleSector = 4;
      } else if (eng.gaugeAngle >= 0.20) {
        eng.needleSector = 3;
      } else if (eng.gaugeAngle >= 0.10) {
        eng.needleSector = 2;
      } else {
        eng.needleSector = 1;
      }

      // Draw Glowing Needle Indicator
      const nx = gaugeCenterX + Math.cos(currentNeedleAngle) * gaugeRadius;
      const ny = gaugeCenterY + Math.sin(currentNeedleAngle) * gaugeRadius;
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(nx, ny, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    };

    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div
      ref={containerRef}
      id="cyber-cricket-arena"
      className="relative w-full max-w-5xl mx-auto flex flex-col items-center select-none font-sans px-1"
    >
      {/* ========================================================================= */}
      {/* 1. NATION SELECTION STAGE */}
      {/* ========================================================================= */}
      {stage === 'team-select' && (
        <div className="w-full max-w-lg p-5 rounded-3xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-2xl space-y-4 animate-fade-in my-auto">
          <div className="text-center">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> POKI CRICKET WORLD CUP
            </div>
            <h2 className="text-2xl font-black text-white">CHOOSE YOUR TEAMS</h2>
            <p className="text-xs text-slate-400">Select your country and match overs</p>
          </div>

          {/* User Team */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-cyan-300 uppercase flex items-center justify-between">
              <span>Your Country:</span>
              <span className="text-slate-400">{userTeam.name}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TEAMS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    sound.playClick();
                    setUserTeam(t);
                    if (opponentTeam.id === t.id) {
                      const other = TEAMS.find((x) => x.id !== t.id) || TEAMS[1];
                      setOpponentTeam(other);
                    }
                  }}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    userTeam.id === t.id
                      ? 'bg-slate-800 border-cyan-400 shadow-lg shadow-cyan-500/30 scale-105'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-3xl">{t.flagEmoji}</span>
                  <div className="text-xs font-bold text-white leading-tight">{t.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Opponent Team */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="text-xs font-bold text-pink-300 uppercase flex items-center justify-between">
              <span>Opponent Challenger:</span>
              <span className="text-slate-400">{opponentTeam.name}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TEAMS.filter((t) => t.id !== userTeam.id).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    sound.playClick();
                    setOpponentTeam(t);
                  }}
                  className={`p-2 rounded-2xl border flex items-center justify-center gap-1.5 transition-all ${
                    opponentTeam.id === t.id
                      ? 'bg-slate-800 border-pink-400 shadow-lg shadow-pink-500/30 scale-105'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-xl">{t.flagEmoji}</span>
                  <span className="text-xs font-bold text-white">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Overs Selector */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="text-xs font-bold text-slate-300 uppercase">Match Overs:</div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 5].map((ov) => (
                <button
                  key={ov}
                  onClick={() => {
                    sound.playClick();
                    setOvers(ov);
                  }}
                  className={`py-2 rounded-xl text-xs font-black border transition-all ${
                    overs === ov
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {ov === 1 ? '⚡ Super Over (1)' : `${ov} Overs Thriller`}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startMatch}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 text-white font-black text-sm sm:text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <Play className="w-5 h-5 fill-white" /> START WORLD CUP MATCH
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. AUTHENTIC POKI MATCH STAGE */}
      {/* ========================================================================= */}
      {stage === 'playing' && (
        <div className="w-full flex flex-col items-center">
          {/* 16:9 Broadcast Stage matching Reference Screenshot Exactly */}
          <div
            onClick={handleSwing}
            className="relative w-full aspect-[16/9] max-h-[74vh] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-800 bg-black cursor-pointer touch-none"
          >
            <canvas
              ref={canvasRef}
              width={1200}
              height={675}
              className="w-full h-full object-contain block touch-none"
            />

            {/* ========================================== */}
            {/* TOP-LEFT AUTHENTIC POKI HUD CONTAINER */}
            {/* ========================================== */}
            <div className="absolute top-4 left-4 p-2.5 sm:p-3.5 rounded-2xl bg-slate-950/90 border-2 border-slate-700 shadow-2xl backdrop-blur-md min-w-[150px] sm:min-w-[200px] pointer-events-none">
              {/* Target Header Box */}
              <div className="flex items-center justify-between border-2 border-rose-500/80 rounded-xl px-3 py-1 bg-slate-900/90 mb-2">
                <span className="text-amber-400 font-black text-xs sm:text-sm tracking-wider font-mono">TARGET</span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono">{target}</span>
              </div>

              {/* Balls Left */}
              <div className="flex items-center justify-between bg-slate-900/70 border border-slate-800 rounded-lg px-2.5 py-1 mb-1.5 text-[11px] sm:text-xs font-bold text-white font-mono">
                <span>BALLS LEFT : {ballsLeft}</span>
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-white inline-block"></span>
              </div>

              {/* Wickets Left */}
              <div className="flex items-center justify-between bg-slate-900/70 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-bold text-white font-mono">
                <span>WICKETS LEFT : {wicketsLeft}</span>
                <span className="text-amber-400 font-black">🏏</span>
              </div>
            </div>

            {/* ========================================== */}
            {/* CENTER BIG SHOT RESULT TEXT (e.g. 1, 4, 6) */}
            {/* ========================================== */}
            {lastOutcomeText && (
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl sm:text-8xl font-black text-white font-mono drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] animate-bounce pointer-events-none">
                {lastOutcomeText}
              </div>
            )}

            {/* ========================================== */}
            {/* BOTTOM CENTER AUTHENTIC "TEAM VS TEAM" PILL */}
            {/* ========================================== */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-slate-950/85 border border-slate-700 backdrop-blur-md flex items-center gap-3 shadow-xl pointer-events-none">
              <span className="text-xs sm:text-sm font-black text-white tracking-wider font-mono">
                {userTeam.name}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black tracking-widest shadow-md">
                VS
              </span>
              <span className="text-xs sm:text-sm font-black text-white tracking-wider font-mono">
                {opponentTeam.name}
              </span>
            </div>

            {/* Mute Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const isMute = sound.toggleMute();
                setMuted(isMute);
              }}
              className="absolute top-4 right-4 p-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-300 hover:text-white"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>

          {/* Quick Tap CTA for mobile */}
          <div className="w-full max-w-md mt-2">
            <button
              onClick={handleSwing}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 active:scale-95 text-white font-black text-sm sm:text-base shadow-xl shadow-cyan-500/30 transition-all"
            >
              🏏 TAP / PRESS ANYWHERE TO SMASH!
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TARGET WON MODAL */}
      {/* ========================================================================= */}
      {stage === 'target-won' && (
        <div className="w-full max-w-md p-5 rounded-3xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-2xl text-center space-y-4 animate-fade-in my-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/40">
            <Trophy className="w-9 h-9 text-amber-400 animate-bounce" />
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">TARGET CHASED!</div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
              {userTeam.name} WON THE MATCH!
            </h2>
            <div className="text-xs sm:text-sm text-cyan-300 font-bold mt-1">
              Scored {currentScore} / {target} runs!
            </div>
          </div>

          <div className="flex gap-2 max-w-xs mx-auto">
            <button
              onClick={startMatch}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-1.5 hover:scale-105 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> PLAY AGAIN
            </button>
            <button
              onClick={() => setStage('team-select')}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs sm:text-sm transition-all"
            >
              NEW MATCH
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. GAME OVER MODAL */}
      {/* ========================================================================= */}
      {stage === 'gameover' && (
        <div className="w-full max-w-md p-5 rounded-3xl bg-slate-900/95 border border-slate-800 backdrop-blur-md shadow-2xl text-center space-y-4 animate-fade-in my-auto">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-rose-400" />
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Match Concluded</div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-0.5">TARGET MISSED</h2>
            <div className="text-xs text-rose-300 font-bold mt-1">
              Scored {currentScore} runs • Needed {target} to win
            </div>
          </div>

          <div className="flex gap-2 max-w-xs mx-auto">
            <button
              onClick={startMatch}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-1.5 hover:scale-105 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> RETRY CHASE
            </button>
            <button
              onClick={() => setStage('team-select')}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs sm:text-sm transition-all"
            >
              CHANGE TEAM
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
