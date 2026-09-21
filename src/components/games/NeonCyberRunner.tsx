import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Award, Zap, Shield, Sparkles, Trophy } from 'lucide-react';
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

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'drone' | 'laser_bar' | 'floating_block';
  passed: boolean;
  pulse?: number;
}

interface Item {
  x: number;
  y: number;
  size: number;
  type: 'orb' | 'shield' | 'magnet' | 'star';
  collected: boolean;
  floatOffset: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export const NeonCyberRunner: React.FC<Props> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [hasShield, setHasShield] = useState(false);
  const [magnetTimer, setMagnetTimer] = useState(0);
  const [muted, setMuted] = useState(sound.isMuted());
  const [isNewHigh, setIsNewHigh] = useState(false);

  // References for game loop state
  const stateRef = useRef({
    gameState: 'idle' as 'idle' | 'playing' | 'paused' | 'gameover',
    score: 0,
    highScore: 0,
    combo: 1,
    comboTimer: 0,
    distance: 0,
    speed: 6.5,
    hasShield: false,
    magnetTimer: 0,
    
    // Player
    player: {
      x: 90,
      y: 0,
      width: 38,
      height: 48,
      vy: 0,
      gravity: 0.72,
      jumpForce: -13.5,
      isGrounded: false,
      isSliding: false,
      slideTimer: 0,
      jumpCount: 0,
      maxJumps: 2,
      glowColor: '#00f0ff',
      trail: [] as { x: number; y: number; alpha: number; h: number }[],
    },
    
    // Arrays
    obstacles: [] as Obstacle[],
    items: [] as Item[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    
    // Timers
    obstacleSpawnTimer: 0,
    itemSpawnTimer: 0,
    gridOffset: 0,
    cityOffset: 0,
  });

  // Load High Score
  useEffect(() => {
    const saved = localStorage.getItem('novaplay_hs_neon_runner');
    if (saved) {
      const val = parseInt(saved, 10);
      setHighScore(val);
      stateRef.current.highScore = val;
    }
  }, []);

  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#ff007f', '#ffe600', '#7b2cbf'],
      });
    } catch {
      // ignore
    }
  }, []);

  const addParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3.5 + 1.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 20 + 15,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color = '#ffe600') => {
    stateRef.current.floatingTexts.push({
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.5,
    });
  };

  // Jump action
  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState !== 'playing') return;

    if (s.player.jumpCount < s.player.maxJumps) {
      s.player.vy = s.player.jumpForce;
      s.player.jumpCount++;
      s.player.isGrounded = false;
      s.player.isSliding = false;
      sound.playJump();

      addParticles(s.player.x + 10, s.player.y + s.player.height, '#00f0ff', 8);
    }
  }, []);

  // Slide action
  const slide = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState !== 'playing') return;

    s.player.isSliding = true;
    s.player.slideTimer = 35; // frames of slide
    sound.playJump();
    addParticles(s.player.x, s.player.y + s.player.height - 5, '#ff007f', 6);
  }, []);

  // Start / Restart game
  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const groundY = canvas.height - 70;
    const s = stateRef.current;

    s.gameState = 'playing';
    s.score = 0;
    s.combo = 1;
    s.comboTimer = 0;
    s.distance = 0;
    s.speed = 6.5;
    s.hasShield = false;
    s.magnetTimer = 0;
    s.obstacles = [];
    s.items = [];
    s.particles = [];
    s.floatingTexts = [];
    s.obstacleSpawnTimer = 30;
    s.itemSpawnTimer = 60;

    s.player.y = groundY - 48;
    s.player.vy = 0;
    s.player.isGrounded = true;
    s.player.jumpCount = 0;
    s.player.isSliding = false;
    s.player.trail = [];

    setGameState('playing');
    setScore(0);
    setCombo(1);
    setHasShield(false);
    setMagnetTimer(0);
    setIsNewHigh(false);
    sound.playClick();
  }, []);

  const handleGameOver = useCallback(() => {
    const s = stateRef.current;
    s.gameState = 'gameover';
    setGameState('gameover');
    sound.playGameOver();

    if (s.score > s.highScore) {
      s.highScore = s.score;
      setHighScore(s.score);
      setIsNewHigh(true);
      localStorage.setItem('novaplay_hs_neon_runner', String(s.score));
      triggerConfetti();
    }

    if (onGameOver) {
      onGameOver(s.score);
    }
  }, [onGameOver, triggerConfetti]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (stateRef.current.gameState === 'idle' || stateRef.current.gameState === 'gameover') {
          startGame();
        } else {
          jump();
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        slide();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (stateRef.current.gameState === 'playing') {
          stateRef.current.gameState = 'paused';
          setGameState('paused');
        } else if (stateRef.current.gameState === 'paused') {
          stateRef.current.gameState = 'playing';
          setGameState('playing');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump, slide, startGame]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const s = stateRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const groundY = height - 70;

      // Update if playing
      if (s.gameState === 'playing') {
        s.distance += s.speed;
        s.score += Math.floor(s.combo);
        s.speed = 6.5 + Math.min(6, s.distance / 2500); // Gradual speed ramp up

        // Combo timer countdown
        if (s.comboTimer > 0) {
          s.comboTimer--;
          if (s.comboTimer <= 0) {
            s.combo = 1;
            setCombo(1);
          }
        }

        // Magnet timer
        if (s.magnetTimer > 0) {
          s.magnetTimer--;
          if (s.magnetTimer % 60 === 0) {
            setMagnetTimer(Math.ceil(s.magnetTimer / 60));
          }
        }

        // Player physics
        const p = s.player;
        const currentH = p.isSliding ? 24 : 48;
        p.height = currentH;

        if (p.isSliding) {
          p.slideTimer--;
          if (p.slideTimer <= 0) {
            p.isSliding = false;
          }
        }

        p.vy += p.gravity;
        p.y += p.vy;

        if (p.y >= groundY - currentH) {
          p.y = groundY - currentH;
          p.vy = 0;
          p.isGrounded = true;
          p.jumpCount = 0;
        }

        // Player Trail
        p.trail.push({ x: p.x, y: p.y, alpha: 0.6, h: currentH });
        if (p.trail.length > 8) p.trail.shift();

        // Spawn obstacles
        s.obstacleSpawnTimer--;
        if (s.obstacleSpawnTimer <= 0) {
          const rand = Math.random();
          let obsType: Obstacle['type'] = 'spike';
          let obsW = 32;
          let obsH = 40;
          let obsY = groundY - 40;

          if (rand < 0.35) {
            obsType = 'spike';
            obsW = 30;
            obsH = 36;
            obsY = groundY - 36;
          } else if (rand < 0.65) {
            // Laser Arch overhead (requires slide)
            obsType = 'laser_bar';
            obsW = 55;
            obsH = 34;
            obsY = groundY - 72; // leaves space at ground for sliding!
          } else if (rand < 0.85) {
            // Drone hazard
            obsType = 'drone';
            obsW = 36;
            obsH = 32;
            obsY = groundY - 50 - Math.random() * 40;
          } else {
            // Floating Neon Block
            obsType = 'floating_block';
            obsW = 44;
            obsH = 40;
            obsY = groundY - 40;
          }

          s.obstacles.push({
            x: width + 20,
            y: obsY,
            width: obsW,
            height: obsH,
            type: obsType,
            passed: false,
            pulse: 0,
          });

          // Next spawn delay depending on speed
          s.obstacleSpawnTimer = Math.floor(Math.random() * 50 + 65 - Math.min(30, s.speed * 2));
        }

        // Spawn Items (Orbs, Powerups)
        s.itemSpawnTimer--;
        if (s.itemSpawnTimer <= 0) {
          const itemRand = Math.random();
          let itemType: Item['type'] = 'orb';
          if (itemRand < 0.08 && !s.hasShield) {
            itemType = 'shield';
          } else if (itemRand < 0.16 && s.magnetTimer <= 0) {
            itemType = 'magnet';
          } else if (itemRand < 0.28) {
            itemType = 'star';
          }

          const itemY = groundY - 40 - Math.random() * 60;
          s.items.push({
            x: width + 30,
            y: itemY,
            size: itemType === 'orb' ? 12 : 16,
            type: itemType,
            collected: false,
            floatOffset: Math.random() * Math.PI * 2,
          });

          s.itemSpawnTimer = Math.floor(Math.random() * 40 + 40);
        }

        // Move and process obstacles
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          const obs = s.obstacles[i];
          obs.x -= s.speed;

          // Check collision with player
          const pBox = {
            x: p.x + 4,
            y: p.y + 4,
            w: p.width - 8,
            h: p.height - 6,
          };

          const oBox = {
            x: obs.x + 4,
            y: obs.y + 4,
            w: obs.width - 8,
            h: obs.height - 6,
          };

          const isColliding =
            pBox.x < oBox.x + oBox.w &&
            pBox.x + pBox.w > oBox.x &&
            pBox.y < oBox.y + oBox.h &&
            pBox.y + pBox.h > oBox.y;

          if (isColliding) {
            if (s.hasShield) {
              // Shield absorbs hit
              s.hasShield = false;
              setHasShield(false);
              sound.playHit();
              addParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, '#00f0ff', 20);
              addFloatingText(p.x, p.y - 20, 'SHIELD BROKEN!', '#00f0ff');
              s.obstacles.splice(i, 1);
              continue;
            } else {
              // Player crashes
              sound.playExplosion();
              addParticles(p.x + p.width / 2, p.y + p.height / 2, '#ff0055', 35);
              handleGameOver();
              break;
            }
          }

          // Passed obstacle bonus
          if (!obs.passed && obs.x + obs.width < p.x) {
            obs.passed = true;
            s.score += 50;
          }

          // Remove offscreen
          if (obs.x < -100) {
            s.obstacles.splice(i, 1);
          }
        }

        // Move and process items
        for (let i = s.items.length - 1; i >= 0; i--) {
          const it = s.items[i];
          it.x -= s.speed;

          // Magnet suction effect
          if (s.magnetTimer > 0) {
            const dx = p.x - it.x;
            const dy = p.y - it.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 220) {
              it.x += (dx / dist) * 9;
              it.y += (dy / dist) * 9;
            }
          }

          // Check pickup collision
          const dx = p.x + p.width / 2 - it.x;
          const dy = p.y + p.height / 2 - it.y;
          const dist = Math.hypot(dx, dy);

          if (dist < p.width / 2 + it.size + 10) {
            if (it.type === 'orb') {
              sound.playCollect();
              s.score += 100 * s.combo;
              s.combo = Math.min(5, s.combo + 0.2);
              s.comboTimer = 180;
              setCombo(Number(s.combo.toFixed(1)));
              addFloatingText(it.x, it.y, `+${100 * Math.floor(s.combo)}`, '#ffe600');
              addParticles(it.x, it.y, '#ffe600', 8);
            } else if (it.type === 'shield') {
              sound.playPowerup();
              s.hasShield = true;
              setHasShield(true);
              addFloatingText(it.x, it.y, 'SHIELD ON!', '#00f0ff');
              addParticles(it.x, it.y, '#00f0ff', 15);
            } else if (it.type === 'magnet') {
              sound.playPowerup();
              s.magnetTimer = 600; // 10 seconds
              setMagnetTimer(10);
              addFloatingText(it.x, it.y, 'MAGNET 10s!', '#ff00ff');
              addParticles(it.x, it.y, '#ff00ff', 15);
            } else if (it.type === 'star') {
              sound.playCollect();
              s.score += 500 * s.combo;
              addFloatingText(it.x, it.y, `+${500 * Math.floor(s.combo)} ⭐`, '#ff9900');
              addParticles(it.x, it.y, '#ff9900', 14);
            }

            s.items.splice(i, 1);
            continue;
          }

          if (it.x < -50) {
            s.items.splice(i, 1);
          }
        }

        // Sync score state periodically
        setScore(s.score);
      }

      // Background Rendering (Cyber Synthwave)
      ctx.fillStyle = '#0a0a16';
      ctx.fillRect(0, 0, width, height);

      // Distant Synth Sun / Horizon Glow
      const sunGradient = ctx.createRadialGradient(
        width / 2,
        groundY - 60,
        10,
        width / 2,
        groundY - 60,
        width * 0.7
      );
      sunGradient.addColorStop(0, 'rgba(255, 0, 128, 0.25)');
      sunGradient.addColorStop(0.5, 'rgba(123, 44, 191, 0.12)');
      sunGradient.addColorStop(1, 'rgba(10, 10, 22, 0)');
      ctx.fillStyle = sunGradient;
      ctx.fillRect(0, 0, width, height);

      // Cyber City Silhouettes
      s.cityOffset = (s.cityOffset + (s.gameState === 'playing' ? s.speed * 0.15 : 0.5)) % width;
      ctx.fillStyle = '#14112e';
      for (let bx = -50; bx < width + 100; bx += 70) {
        const bH = 60 + Math.sin(bx * 0.05) * 35;
        const drawX = bx - (s.cityOffset % 70);
        ctx.fillRect(drawX, groundY - bH, 50, bH);
        // Window dots
        ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.fillRect(drawX + 8, groundY - bH + 10, 6, 8);
        ctx.fillRect(drawX + 22, groundY - bH + 25, 6, 8);
        ctx.fillRect(drawX + 36, groundY - bH + 12, 6, 8);
        ctx.fillStyle = '#14112e';
      }

      // 3D Perspective Ground Grid
      s.gridOffset = (s.gridOffset + (s.gameState === 'playing' ? s.speed : 1.5)) % 40;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 1;

      // Horizon line
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Vertical perspective lines
      ctx.strokeStyle = 'rgba(255, 0, 128, 0.3)';
      for (let x = -200; x < width + 200; x += 50) {
        ctx.beginPath();
        ctx.moveTo(width / 2 + (x - width / 2) * 0.2, groundY);
        ctx.lineTo(x * 1.5 - s.gridOffset * 1.2, height);
        ctx.stroke();
      }

      // Horizontal speed lines under ground
      for (let y = groundY + 8; y < height; y += 14) {
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 + (y - groundY) / 150})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Items
      const now = performance.now();
      for (const it of s.items) {
        const floatY = it.y + Math.sin(now * 0.005 + it.floatOffset) * 6;
        ctx.save();
        ctx.translate(it.x, floatY);

        if (it.type === 'orb') {
          ctx.fillStyle = '#ffe600';
          ctx.shadowColor = '#ffe600';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(0, 0, it.size, 0, Math.PI * 2);
          ctx.fill();
          // Inner core
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, it.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (it.type === 'shield') {
          ctx.strokeStyle = '#00f0ff';
          ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 16;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, it.size, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fill();
          // Shield emblem
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-3, -6, 6, 12);
          ctx.fillRect(-6, -3, 12, 6);
        } else if (it.type === 'magnet') {
          ctx.strokeStyle = '#ff00ff';
          ctx.fillStyle = 'rgba(255, 0, 255, 0.4)';
          ctx.shadowColor = '#ff00ff';
          ctx.shadowBlur = 16;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, it.size, Math.PI * 0.8, Math.PI * 2.2);
          ctx.stroke();
        } else if (it.type === 'star') {
          ctx.fillStyle = '#ff9900';
          ctx.shadowColor = '#ff9900';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.cos(((18 + i * 72) * Math.PI) / 180) * it.size, -Math.sin(((18 + i * 72) * Math.PI) / 180) * it.size);
            ctx.lineTo(Math.cos(((54 + i * 72) * Math.PI) / 180) * (it.size / 2), -Math.sin(((54 + i * 72) * Math.PI) / 180) * (it.size / 2));
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw Obstacles
      for (const obs of s.obstacles) {
        ctx.save();
        if (obs.type === 'spike') {
          ctx.fillStyle = '#ff0055';
          ctx.shadowColor = '#ff0055';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();

          // Internal hazard stripes
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (obs.type === 'laser_bar') {
          // Overhead laser arch
          ctx.fillStyle = 'rgba(255, 0, 128, 0.3)';
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

          ctx.strokeStyle = '#ff007f';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#ff007f';
          ctx.shadowBlur = 15;
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

          // Glowing laser beam inside
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(obs.x + 4, obs.y + obs.height / 2 - 2, obs.width - 8, 4);

          // Slide icon indicator
          ctx.fillStyle = '#00f0ff';
          ctx.font = '10px monospace';
          ctx.fillText('SLIDE ↓', obs.x + 4, obs.y + obs.height + 15);
        } else if (obs.type === 'drone') {
          ctx.fillStyle = '#7928ca';
          ctx.strokeStyle = '#00dfd8';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#00dfd8';
          ctx.shadowBlur = 14;

          // Drone diamond body
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height / 2);
          ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height);
          ctx.lineTo(obs.x, obs.y + obs.height / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Eye red sensor
          ctx.fillStyle = '#ff0055';
          ctx.beginPath();
          ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Floating block
          ctx.fillStyle = '#220066';
          ctx.strokeStyle = '#ff00aa';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ff00aa';
          ctx.shadowBlur = 10;
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        }
        ctx.restore();
      }

      // Draw Player
      const p = s.player;

      // Draw Trail
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        ctx.save();
        ctx.fillStyle = `rgba(0, 240, 255, ${0.08 * (i + 1)})`;
        ctx.fillRect(t.x - (p.trail.length - i) * 3, t.y, p.width, t.h);
        ctx.restore();
      }

      // Player Body
      ctx.save();
      ctx.shadowColor = s.hasShield ? '#00f0ff' : '#00f0ff';
      ctx.shadowBlur = s.hasShield ? 22 : 14;

      if (p.isSliding) {
        // Sliding posture (flat capsule)
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width + 12, p.height, 10);
        ctx.fill();

        // Visor glow
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(p.x + p.width - 2, p.y + 4, 8, 6);
      } else {
        // Standing / Jumping Runner Frame
        const legOffset = p.isGrounded ? Math.sin(now * 0.02) * 6 : 0;

        // Torso & Legs
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.roundRect(p.x, p.y + 12, p.width - 4, p.height - 18, 6);
        ctx.fill();

        // Cyber Visor / Helmet
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(p.x + 8, p.y, p.width - 12, 14, 4);
        ctx.fill();

        // Neon Eye Visor
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(p.x + p.width - 10, p.y + 3, 6, 4);

        // Animated Running Legs
        ctx.fillStyle = '#00dfd8';
        ctx.fillRect(p.x + 4, p.y + p.height - 10 + legOffset, 8, 10);
        ctx.fillRect(p.x + 20, p.y + p.height - 10 - legOffset, 8, 10);
      }

      // Shield Aura
      if (s.hasShield) {
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.6 + Math.sin(now * 0.01) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.height * 0.75, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Draw Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
        pt.alpha = 1 - pt.life / pt.maxLife;

        if (pt.life >= pt.maxLife) {
          s.particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Floating Texts
      for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
        const ft = s.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.02;

        if (ft.alpha <= 0) {
          s.floatingTexts.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [handleGameOver]);

  const toggleSound = () => {
    const isMute = sound.toggleMute();
    setMuted(isMute);
  };

  return (
    <div id="neon-runner-wrapper" className="relative w-full max-w-4xl mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/30 shadow-2xl shadow-cyan-950/50">
      {/* Top Game HUD Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-cyan-500/20 backdrop-blur-md z-10 text-white select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Score</span>
            <span className="font-mono text-xl font-bold text-cyan-400">{score.toLocaleString()}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-700">
            <Award className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400">High:</span>
            <span className="font-mono text-sm font-bold text-purple-300">{highScore.toLocaleString()}</span>
          </div>
        </div>

        {/* Combo & Active Powerup Indicators */}
        <div className="flex items-center gap-3">
          {combo > 1 && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs animate-pulse">
              <Zap className="w-3.5 h-3.5" />
              <span>{combo}x COMBO</span>
            </div>
          )}

          {hasShield && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-semibold">
              <Shield className="w-3 h-3" />
              <span>SHIELD</span>
            </div>
          )}

          {magnetTimer > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-400 text-fuchsia-300 text-xs font-semibold">
              <Sparkles className="w-3 h-3" />
              <span>MAGNET {magnetTimer}s</span>
            </div>
          )}

          <button
            id="runner-mute-btn"
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Interactive HTML5 Canvas */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] max-h-[520px] bg-black">
        <canvas
          id="neon-runner-canvas"
          ref={canvasRef}
          width={800}
          height={450}
          className="w-full h-full block cursor-pointer"
          onClick={() => {
            if (gameState === 'playing') jump();
            else if (gameState === 'idle' || gameState === 'gameover') startGame();
          }}
        />

        {/* Start Screen Overlay */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-tr from-cyan-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-cyan-500/40 animate-bounce">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 mb-2">
              NEON CYBER DASH
            </h2>
            <p className="text-slate-300 max-w-md text-sm mb-6">
              Dodge laser grids, slide under high barriers, leap across cyber drones, and grab multiplier energy cores!
            </p>
            <button
              id="start-runner-btn"
              onClick={startGame}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base shadow-lg shadow-cyan-500/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              PLAY NOW (SPACEBAR)
            </button>
          </div>
        )}

        {/* Game Over Screen Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in">
            {isNewHigh && (
              <div className="mb-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-sm font-bold animate-bounce flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                NEW HIGH SCORE!
              </div>
            )}
            <h3 className="text-3xl font-black text-rose-500 mb-1">RUN TERMINATED</h3>
            <div className="my-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 w-64">
              <div className="text-xs text-slate-400 uppercase font-semibold">Final Score</div>
              <div className="text-3xl font-mono font-bold text-cyan-400 my-1">{score.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Best: {highScore.toLocaleString()}</div>
            </div>

            <button
              id="retry-runner-btn"
              onClick={startGame}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-bold text-base shadow-lg shadow-cyan-500/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              PLAY AGAIN (SPACE)
            </button>
          </div>
        )}

        {/* Pause Screen Overlay */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <h3 className="text-2xl font-bold text-white mb-4">GAME PAUSED</h3>
            <button
              id="resume-runner-btn"
              onClick={() => {
                stateRef.current.gameState = 'playing';
                setGameState('playing');
              }}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm"
            >
              Resume Game (P)
            </button>
          </div>
        )}
      </div>

      {/* Mobile Touch On-Screen Controls */}
      <div className="w-full grid grid-cols-2 gap-2.5 mt-3 select-none touch-none">
        <button
          id="mobile-runner-jump-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            if (gameState === 'idle' || gameState === 'gameover') startGame();
            else jump();
          }}
          className="py-3.5 px-3 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-black text-xs active:bg-cyan-500 active:text-slate-950 flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-transform"
        >
          <Zap className="w-4 h-4" />
          <span>JUMP / FLY</span>
        </button>

        <button
          id="mobile-runner-slide-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            if (gameState === 'idle' || gameState === 'gameover') startGame();
            else slide();
          }}
          className="py-3.5 px-3 rounded-2xl bg-fuchsia-950/80 border border-fuchsia-500/50 text-fuchsia-300 font-black text-xs active:bg-fuchsia-500 active:text-slate-950 flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-transform"
        >
          <span className="text-base font-black">↓</span>
          <span>SLIDE DASH</span>
        </button>
      </div>
    </div>
  );
};
