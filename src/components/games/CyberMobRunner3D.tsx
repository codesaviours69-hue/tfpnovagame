import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Sparkles, Users, Zap, Shield, Crown, ArrowRight, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

interface RunnerUnit {
  x: number; // relative to crowd center (-40 to 40)
  z: number; // relative to crowd center (-40 to 40)
  vx: number;
  vz: number;
  color: string;
  bounceOffset: number;
  isAlive: boolean;
}

interface MathGate {
  z: number; // track distance
  leftOp: string; // e.g. "+15" or "x2"
  leftVal: number;
  leftType: 'add' | 'mult';
  rightOp: string; // e.g. "+30" or "x3"
  rightVal: number;
  rightType: 'add' | 'mult';
  passed: boolean;
}

interface Obstacle {
  x: number; // -1 to 1
  z: number;
  width: number;
  type: 'sawblade' | 'laser_beam' | 'crusher';
  rot: number;
  passed: boolean;
}

interface EnemyMob {
  x: number;
  z: number;
  count: number;
  maxCount: number;
  passed: boolean;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  alpha: number;
  size: number;
}

export const CyberMobRunner3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem('cyber_mob_coins');
    return saved ? parseInt(saved, 10) : 100;
  });
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('cyber_mob_high');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [level, setLevel] = useState(1);
  const [mobCount, setMobCount] = useState(1);
  const [isMuted, setIsMuted] = useState(sound.isMuted());

  // Upgrade Levels
  const [startMobLevel, setStartMobLevel] = useState(() => {
    const saved = localStorage.getItem('cyber_mob_start_lvl');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [coinBoostLevel, setCoinBoostLevel] = useState(() => {
    const saved = localStorage.getItem('cyber_mob_coin_lvl');
    return saved ? parseInt(saved, 10) : 1;
  });

  // Engine Refs
  const engineRef = useRef({
    playerX: 0, // -0.85 to 0.85 track width
    targetX: 0,
    playerZ: 0, // current distance down track (0 to trackLength)
    trackLength: 1200,
    speed: 3.8,
    mobUnits: [] as RunnerUnit[],
    gates: [] as MathGate[],
    obstacles: [] as Obstacle[],
    enemyMobs: [] as EnemyMob[],
    particles: [] as Particle[],
    bossHp: 100,
    bossMaxHp: 100,
    isDragging: false,
    dragStartX: 0,
    initialPlayerX: 0,
    animationFrameId: 0,
    shake: 0,
    finalStaircaseLevel: 0,
  });

  // Helper to spawn a runner
  const createRunner = (index: number): RunnerUnit => {
    const angle = (index * 2.4);
    const radius = Math.sqrt(index) * 5.5;
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      vx: 0,
      vz: 0,
      color: '#00f0ff',
      bounceOffset: Math.random() * Math.PI * 2,
      isAlive: true,
    };
  };

  // Generate Level Layout
  const generateLevel = useCallback((lvl: number) => {
    const eng = engineRef.current;
    eng.trackLength = 1000 + lvl * 250;
    eng.playerX = 0;
    eng.targetX = 0;
    eng.playerZ = 0;
    eng.shake = 0;
    eng.speed = 3.6 + Math.min(lvl * 0.2, 1.8);
    eng.bossMaxHp = 40 + lvl * 30;
    eng.bossHp = eng.bossMaxHp;
    eng.particles = [];

    // Starting mob units based on upgrade
    const startCount = 1 + (startMobLevel - 1) * 3;
    eng.mobUnits = Array.from({ length: startCount }, (_, idx) => createRunner(idx));
    setMobCount(startCount);

    // Gates setup
    const gates: MathGate[] = [];
    const gateCount = 5 + Math.min(lvl, 6);
    const gateInterval = (eng.trackLength - 200) / gateCount;

    for (let i = 1; i <= gateCount; i++) {
      const zPos = 120 + i * gateInterval;
      // Good gate vs Great gate or Trap gate
      const isMultLeft = Math.random() > 0.45;
      const isMultRight = Math.random() > 0.45;

      const leftOp = isMultLeft ? `x${2 + Math.floor(Math.random() * 2)}` : `+${10 + Math.floor(Math.random() * 25)}`;
      const leftVal = isMultLeft ? parseInt(leftOp.slice(1), 10) : parseInt(leftOp.slice(1), 10);
      const leftType = isMultLeft ? 'mult' : 'add';

      const rightOp = isMultRight ? `x${2 + Math.floor(Math.random() * 3)}` : `+${15 + Math.floor(Math.random() * 30)}`;
      const rightVal = isMultRight ? parseInt(rightOp.slice(1), 10) : parseInt(rightOp.slice(1), 10);
      const rightType = isMultRight ? 'mult' : 'add';

      gates.push({
        z: zPos,
        leftOp,
        leftVal,
        leftType,
        rightOp,
        rightVal,
        rightType,
        passed: false,
      });
    }
    eng.gates = gates;

    // Obstacles (Sawblades, Lasers)
    const obstacles: Obstacle[] = [];
    const obsCount = 4 + lvl * 2;
    for (let i = 0; i < obsCount; i++) {
      const zPos = 180 + Math.random() * (eng.trackLength - 300);
      const xPos = (Math.random() - 0.5) * 1.2;
      const type = Math.random() > 0.5 ? 'sawblade' : 'laser_beam';
      obstacles.push({
        x: xPos,
        z: zPos,
        width: type === 'sawblade' ? 0.35 : 0.65,
        type,
        rot: 0,
        passed: false,
      });
    }
    eng.obstacles = obstacles;

    // Enemy Mobs along the track
    const enemyMobs: EnemyMob[] = [];
    const mobEncounterCount = 2 + Math.min(lvl, 4);
    for (let i = 1; i <= mobEncounterCount; i++) {
      const zPos = 240 + i * (eng.trackLength / (mobEncounterCount + 1));
      const eCount = 15 + lvl * 10 + Math.floor(Math.random() * 20);
      enemyMobs.push({
        x: (Math.random() - 0.5) * 0.6,
        z: zPos,
        count: eCount,
        maxCount: eCount,
        passed: false,
      });
    }
    eng.enemyMobs = enemyMobs;
  }, [startMobLevel]);

  // Start Game
  const handleStartGame = () => {
    sound.playClick();
    sound.playPowerup();
    generateLevel(level);
    setScore(0);
    setGameState('playing');
  };

  // Upgrades
  const handleUpgradeStartMob = () => {
    const cost = startMobLevel * 120;
    if (coins >= cost) {
      sound.playPowerup();
      setCoins((c) => {
        const next = c - cost;
        localStorage.setItem('cyber_mob_coins', next.toString());
        return next;
      });
      setStartMobLevel((l) => {
        const next = l + 1;
        localStorage.setItem('cyber_mob_start_lvl', next.toString());
        return next;
      });
    } else {
      sound.playClick();
    }
  };

  const handleUpgradeCoinBoost = () => {
    const cost = coinBoostLevel * 150;
    if (coins >= cost) {
      sound.playPowerup();
      setCoins((c) => {
        const next = c - cost;
        localStorage.setItem('cyber_mob_coins', next.toString());
        return next;
      });
      setCoinBoostLevel((l) => {
        const next = l + 1;
        localStorage.setItem('cyber_mob_coin_lvl', next.toString());
        return next;
      });
    } else {
      sound.playClick();
    }
  };

  // Multiplier / Gate Calculation
  const applyGate = (op: string, val: number, type: 'add' | 'mult') => {
    const eng = engineRef.current;
    const currentAlive = eng.mobUnits.filter((u) => u.isAlive).length;
    let newTotal = currentAlive;

    if (type === 'mult') {
      newTotal = currentAlive * val;
    } else {
      newTotal = currentAlive + val;
    }

    newTotal = Math.min(newTotal, 300); // Cap at 300 units for smooth 60 FPS
    sound.playScore();

    // Spawn new units
    const diff = newTotal - currentAlive;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        eng.mobUnits.push(createRunner(currentAlive + i));
      }
    } else if (diff < 0) {
      // Remove units
      let removed = 0;
      for (let i = eng.mobUnits.length - 1; i >= 0 && removed < Math.abs(diff); i--) {
        if (eng.mobUnits[i].isAlive) {
          eng.mobUnits[i].isAlive = false;
          removed++;
        }
      }
    }

    const finalAlive = eng.mobUnits.filter((u) => u.isAlive).length;
    setMobCount(finalAlive);

    // Particle Burst
    for (let p = 0; p < 20; p++) {
      eng.particles.push({
        x: (Math.random() - 0.5) * 40,
        y: -30 + (Math.random() - 0.5) * 20,
        z: eng.playerZ,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 6,
        vz: (Math.random() - 0.5) * 4,
        color: '#00f0ff',
        alpha: 1,
        size: 3 + Math.random() * 4,
      });
    }
  };

  // Keyboard / Touch Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const eng = engineRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        eng.targetX = Math.max(-0.85, eng.targetX - 0.25);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        eng.targetX = Math.min(0.85, eng.targetX + 0.25);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Pointer / Touch Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const eng = engineRef.current;
    eng.isDragging = true;
    eng.dragStartX = e.clientX - rect.left;
    eng.initialPlayerX = eng.targetX;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current;
    if (!eng.isDragging || gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const deltaX = (curX - eng.dragStartX) / (rect.width * 0.45);
    eng.targetX = Math.max(-0.85, Math.min(0.85, eng.initialPlayerX + deltaX));
  };

  const handlePointerUp = () => {
    engineRef.current.isDragging = false;
  };

  // Main 60 FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const eng = engineRef.current;

    const tick = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      const horizonY = height * 0.32;
      const cameraZ = eng.playerZ - 140;

      // 1. UPDATE GAMEPLAY PHYSICS
      if (gameState === 'playing') {
        // Forward progression
        eng.playerZ += eng.speed;
        eng.playerX += (eng.targetX - eng.playerX) * 0.22;

        // Boid flocking simulation for mob units
        const aliveUnits = eng.mobUnits.filter((u) => u.isAlive);
        const aliveCount = aliveUnits.length;
        setMobCount(aliveCount);

        if (aliveCount === 0) {
          // Game Over - Mob wiped out
          sound.playGameOver();
          setGameState('gameover');
        }

        // Update obstacles & rotation
        eng.obstacles.forEach((obs) => {
          obs.rot += 0.08;
          // Check collision with crowd
          if (!obs.passed && Math.abs(eng.playerZ - obs.z) < 25) {
            const obsScreenX = obs.x;
            if (Math.abs(eng.playerX - obsScreenX) < obs.width) {
              // Mob casualties
              let killed = 0;
              for (let i = 0; i < aliveUnits.length && killed < 4; i++) {
                aliveUnits[i].isAlive = false;
                killed++;
                eng.shake = 8;
                sound.playLaser();
              }
            }
          }
          if (eng.playerZ > obs.z + 30) obs.passed = true;
        });

        // Update Math Gates
        eng.gates.forEach((gate) => {
          if (!gate.passed && eng.playerZ >= gate.z) {
            gate.passed = true;
            // Left gate (-0.85 to 0) or Right gate (0 to 0.85)
            if (eng.playerX < 0) {
              applyGate(gate.leftOp, gate.leftVal, gate.leftType);
            } else {
              applyGate(gate.rightOp, gate.rightVal, gate.rightType);
            }
          }
        });

        // Update Enemy Mobs Clashes
        eng.enemyMobs.forEach((enemy) => {
          if (!enemy.passed && Math.abs(eng.playerZ - enemy.z) < 30) {
            const dist = Math.abs(eng.playerX - enemy.x);
            if (dist < 0.65) {
              // Battle clash tick
              const playerLoss = Math.min(aliveUnits.length, 3);
              const enemyLoss = Math.min(enemy.count, 4);

              for (let i = 0; i < playerLoss; i++) {
                if (aliveUnits[i]) aliveUnits[i].isAlive = false;
              }
              enemy.count -= enemyLoss;
              eng.shake = 5;
              sound.playExplosion();

              // Clash particles
              for (let p = 0; p < 8; p++) {
                eng.particles.push({
                  x: eng.playerX * 180 + (Math.random() - 0.5) * 30,
                  y: -20 + (Math.random() - 0.5) * 20,
                  z: enemy.z,
                  vx: (Math.random() - 0.5) * 6,
                  vy: -Math.random() * 6,
                  vz: (Math.random() - 0.5) * 6,
                  color: Math.random() > 0.5 ? '#f43f5e' : '#00f0ff',
                  alpha: 1,
                  size: 3 + Math.random() * 4,
                });
              }

              if (enemy.count <= 0) {
                enemy.passed = true;
                sound.playPowerup();
              }
            }
          }
          if (eng.playerZ > enemy.z + 40) enemy.passed = true;
        });

        // Check End of Track -> Boss Titan Siege / Multiplier Staircase
        if (eng.playerZ >= eng.trackLength) {
          // Victory sequence
          const remainingUnits = eng.mobUnits.filter((u) => u.isAlive).length;
          const coinMultiplier = 1 + (coinBoostLevel - 1) * 0.5;
          const earned = Math.round(remainingUnits * 15 * coinMultiplier * level);

          setCoins((c) => {
            const next = c + earned;
            localStorage.setItem('cyber_mob_coins', next.toString());
            return next;
          });

          const finalScore = remainingUnits * 100 * level;
          setScore(finalScore);
          setHighScore((prev) => {
            const next = Math.max(prev, finalScore);
            localStorage.setItem('cyber_mob_high', next.toString());
            return next;
          });

          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#00f0ff', '#f43f5e', '#facc15', '#a855f7'],
          });
          sound.playPowerup();
          setGameState('victory');
        }
      }

      // 2. RENDER 3D PERSPECTIVE CANVAS
      ctx.clearRect(0, 0, width, height);

      // Camera Shake
      ctx.save();
      if (eng.shake > 0) {
        ctx.translate((Math.random() - 0.5) * eng.shake, (Math.random() - 0.5) * eng.shake);
        eng.shake *= 0.88;
        if (eng.shake < 0.2) eng.shake = 0;
      }

      // Cyber Synthwave Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#030712');
      skyGrad.addColorStop(0.6, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, horizonY);

      // Distant Cyber City Skyline & Glowing Neon Sun
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, horizonY, 80, Math.PI, 0);
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 25;
      ctx.fill();
      ctx.restore();

      // Neon Track Surface (Perspective 3D Projection)
      const trackGroundGrad = ctx.createLinearGradient(0, horizonY, 0, height);
      trackGroundGrad.addColorStop(0, '#090d16');
      trackGroundGrad.addColorStop(1, '#020617');
      ctx.fillStyle = trackGroundGrad;
      ctx.fillRect(0, horizonY, width, height - horizonY);

      // 3D Perspective Projection Helper
      const project3D = (xWorld: number, yWorld: number, zWorld: number) => {
        const relZ = zWorld - cameraZ;
        if (relZ <= 10) return null;
        const scale = 260 / relZ;
        const screenX = width / 2 + xWorld * scale;
        const screenY = horizonY + (yWorld + 55) * scale;
        return { x: screenX, y: screenY, scale };
      };

      // 3D Road Runway Grid Lines
      const trackWidthWorld = 220;
      const roadZStart = Math.floor(cameraZ / 60) * 60;
      for (let z = roadZStart; z < roadZStart + 900; z += 45) {
        const pL = project3D(-trackWidthWorld, 60, z);
        const pR = project3D(trackWidthWorld, 60, z);
        if (pL && pR) {
          ctx.strokeStyle = z % 90 === 0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(30, 41, 59, 0.5)';
          ctx.lineWidth = z % 90 === 0 ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(pL.x, pL.y);
          ctx.lineTo(pR.x, pR.y);
          ctx.stroke();
        }
      }

      // Runway Side Neon Rails
      const railSteps = 16;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let i = 0; i <= railSteps; i++) {
        const z = cameraZ + 20 + i * 50;
        const p = project3D(-trackWidthWorld, 60, z);
        if (p) {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i <= railSteps; i++) {
        const z = cameraZ + 20 + i * 50;
        const p = project3D(trackWidthWorld, 60, z);
        if (p) {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 3. DRAW MATH GATES
      eng.gates.forEach((gate) => {
        if (gate.z < cameraZ + 10 || gate.z > cameraZ + 800) return;

        // Left Gate Pillar & Arch
        const pLeftCenter = project3D(-trackWidthWorld * 0.5, 20, gate.z);
        const pRightCenter = project3D(trackWidthWorld * 0.5, 20, gate.z);
        const pTopLeft = project3D(-trackWidthWorld * 0.5, -40, gate.z);
        const pTopRight = project3D(trackWidthWorld * 0.5, -40, gate.z);

        if (pLeftCenter && pTopLeft) {
          const w = 140 * pLeftCenter.scale;
          const h = 70 * pLeftCenter.scale;

          // Left Gate Glass Box
          ctx.fillStyle = gate.leftType === 'mult' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(34, 197, 94, 0.45)';
          ctx.strokeStyle = gate.leftType === 'mult' ? '#38bdf8' : '#22c55e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(pLeftCenter.x - w / 2, pLeftCenter.y - h, w, h, 8);
          ctx.fill();
          ctx.stroke();

          // Left Gate Label Text
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(12, Math.round(26 * pLeftCenter.scale))}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(gate.leftOp, pLeftCenter.x, pLeftCenter.y - h / 2);
        }

        if (pRightCenter && pTopRight) {
          const w = 140 * pRightCenter.scale;
          const h = 70 * pRightCenter.scale;

          // Right Gate Glass Box
          ctx.fillStyle = gate.rightType === 'mult' ? 'rgba(168, 85, 247, 0.45)' : 'rgba(56, 189, 248, 0.45)';
          ctx.strokeStyle = gate.rightType === 'mult' ? '#a855f7' : '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(pRightCenter.x - w / 2, pRightCenter.y - h, w, h, 8);
          ctx.fill();
          ctx.stroke();

          // Right Gate Label Text
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(12, Math.round(26 * pRightCenter.scale))}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(gate.rightOp, pRightCenter.x, pRightCenter.y - h / 2);
        }
      });

      // 4. DRAW OBSTACLES (Rotating Sawblades & Lasers)
      eng.obstacles.forEach((obs) => {
        if (obs.z < cameraZ + 10 || obs.z > cameraZ + 800) return;
        const p = project3D(obs.x * trackWidthWorld, 55, obs.z);
        if (!p) return;

        if (obs.type === 'sawblade') {
          const r = 38 * p.scale;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(obs.rot);
          ctx.fillStyle = '#f43f5e';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();

          // Saw teeth
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          for (let a = 0; a < 8; a++) {
            const toothAngle = (a * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(Math.cos(toothAngle) * r, Math.sin(toothAngle) * r);
            ctx.lineTo(Math.cos(toothAngle + 0.2) * (r + 10 * p.scale), Math.sin(toothAngle + 0.2) * (r + 10 * p.scale));
            ctx.stroke();
          }
          ctx.restore();
        } else {
          // Laser beam
          const pLeft = project3D(obs.x * trackWidthWorld - 60, 45, obs.z);
          const pRight = project3D(obs.x * trackWidthWorld + 60, 45, obs.z);
          if (pLeft && pRight) {
            ctx.strokeStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 12;
            ctx.lineWidth = 6 * p.scale;
            ctx.beginPath();
            ctx.moveTo(pLeft.x, pLeft.y);
            ctx.lineTo(pRight.x, pRight.y);
            ctx.stroke();
          }
        }
      });

      // 5. DRAW ENEMY MOBS (Red Hostile Cyborgs)
      eng.enemyMobs.forEach((enemy) => {
        if (enemy.z < cameraZ + 10 || enemy.z > cameraZ + 800 || enemy.passed) return;
        const p = project3D(enemy.x * trackWidthWorld, 55, enemy.z);
        if (!p) return;

        // Enemy Mob Cluster Group
        const displayCount = Math.min(enemy.count, 20);
        for (let i = 0; i < displayCount; i++) {
          const angle = i * 2.4;
          const radius = Math.sqrt(i) * 6 * p.scale;
          const ex = p.x + Math.cos(angle) * radius;
          const ey = p.y + Math.sin(angle) * radius * 0.6;
          const unitR = 6.5 * p.scale;

          ctx.fillStyle = '#f43f5e';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(ex, ey, Math.max(3, unitR), 0, Math.PI * 2);
          ctx.fill();
        }

        // Enemy Mob Headcount Badge
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        const badgeW = 44 * p.scale;
        const badgeH = 22 * p.scale;
        ctx.beginPath();
        ctx.roundRect(p.x - badgeW / 2, p.y - 45 * p.scale, badgeW, badgeH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, Math.round(14 * p.scale))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${enemy.count}`, p.x, p.y - 34 * p.scale);
      });

      // 6. DRAW PLAYER SWARM UNITS (Cyan Glowing Cyborgs)
      const pPlayer = project3D(eng.playerX * trackWidthWorld, 55, eng.playerZ);
      if (pPlayer) {
        const alive = eng.mobUnits.filter((u) => u.isAlive);
        const timeNow = performance.now() * 0.008;

        alive.forEach((unit, idx) => {
          // Flocking offsets
          const bounce = Math.sin(timeNow + unit.bounceOffset) * 4 * pPlayer.scale;
          const ux = pPlayer.x + unit.x * pPlayer.scale * 1.8;
          const uy = pPlayer.y + unit.z * pPlayer.scale * 1.2 - bounce;
          const r = Math.max(3.5, 7.5 * pPlayer.scale);

          // Glowing Unit Body
          ctx.fillStyle = '#00f0ff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(ux, uy, r, 0, Math.PI * 2);
          ctx.fill();

          // Unit Head Light
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ux, uy - r * 0.3, r * 0.45, 0, Math.PI * 2);
          ctx.fill();
        });

        // Crowd Headcount Badge Floating Above Swarm
        const badgeW = 54;
        const badgeH = 26;
        const badgeY = pPlayer.y - 75;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(pPlayer.x - badgeW / 2, badgeY, badgeW, badgeH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${alive.length}`, pPlayer.x, badgeY + badgeH / 2);
      }

      // 7. PARTICLES RENDERING
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const pt = eng.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.z += pt.vz;
        pt.vy += 0.2; // gravity
        pt.alpha -= 0.025;

        if (pt.alpha <= 0) {
          eng.particles.splice(i, 1);
          continue;
        }

        const proj = project3D(pt.x, pt.y, pt.z);
        if (proj) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, pt.alpha);
          ctx.fillStyle = pt.color;
          ctx.shadowColor = pt.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, Math.max(1.5, pt.size * proj.scale), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.restore(); // Restore camera shake

      eng.animationFrameId = requestAnimationFrame(tick);
    };

    eng.animationFrameId = requestAnimationFrame(tick);
    return () => {
      isRunning = false;
      cancelAnimationFrame(eng.animationFrameId);
    };
  }, [gameState, level, coinBoostLevel]);

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans">
      {/* 1. TOP HUD (Score, Level, Mob Count, Sound, Coins) */}
      <div className="w-full mb-2 flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-white backdrop-blur-sm shadow-xl">
        {/* Mob Count Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 text-xs sm:text-sm font-black shadow-md">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>MOB: {mobCount}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-bold">
            STAGE {level}
          </div>
        </div>

        {/* Coins & Sound */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black">
            <span>🪙</span>
            <span>{coins.toLocaleString()}</span>
          </div>

          <button
            onClick={() => {
              const m = sound.toggleMute();
              setIsMuted(m);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* 2. MAIN 3D MOB RUNNER ARENA */}
      <div className="relative w-full aspect-[540/760] max-h-[74vh] sm:max-h-[82vh] rounded-3xl overflow-hidden border-2 border-slate-800 bg-[#020617] shadow-2xl shadow-cyan-950/40 touch-none">
        <canvas
          ref={canvasRef}
          width={540}
          height={760}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full block cursor-ew-resize touch-none"
        />

        {/* Mobile Swipe / Drag Hint */}
        {gameState === 'playing' && (
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center pointer-events-none z-10 px-2">
            <div className="px-3 py-1 rounded-full bg-slate-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold backdrop-blur-md shadow-lg flex items-center gap-1.5 animate-pulse">
              <span>👈 Drag Finger / Mouse Left & Right to Steer Swarm 👉</span>
            </div>
          </div>
        )}

        {/* 3. IDLE / START SCREEN OVERLAY */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-6 text-center z-30 animate-fade-in">
            {/* Title Header */}
            <div className="space-y-2 mt-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/40 animate-bounce">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                CYBER MOB <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300">RUNNER 3D</span>
              </h2>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                Choose the best multiplier gates (<span className="text-cyan-400 font-bold">x2, x5, +50</span>), dodge laser sawblades, and clash with enemy armies!
              </p>
            </div>

            {/* UPGRADE CARDS */}
            <div className="w-full max-w-xs space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-left">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Start Crowd</div>
                    <div className="text-[10px] text-slate-400">Level {startMobLevel} (+3 units)</div>
                  </div>
                </div>
                <button
                  onClick={handleUpgradeStartMob}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    coins >= startMobLevel * 120
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  🪙 {startMobLevel * 120}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-left">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Coin Multiplier</div>
                    <div className="text-[10px] text-slate-400">Level {coinBoostLevel} (+50% coins)</div>
                  </div>
                </div>
                <button
                  onClick={handleUpgradeCoinBoost}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    coins >= coinBoostLevel * 150
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  🪙 {coinBoostLevel * 150}
                </button>
              </div>
            </div>

            {/* Play Button */}
            <button
              onClick={handleStartGame}
              className="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-base shadow-xl shadow-cyan-500/40 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START MOB RUSH</span>
            </button>
          </div>
        )}

        {/* 4. GAME OVER SCREEN OVERLAY */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Flame className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black text-white">MOB WIPED OUT!</h3>
              <p className="text-xs text-slate-400">All cyborg units were eliminated by traps and enemy mobs</p>
            </div>

            <button
              onClick={handleStartGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-600 hover:from-rose-400 hover:to-orange-500 text-white font-black text-sm shadow-xl shadow-rose-500/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RETRY STAGE</span>
            </button>
          </div>
        )}

        {/* 5. VICTORY SCREEN OVERLAY */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-2xl shadow-yellow-500/40 animate-bounce text-slate-950">
              <Crown className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black text-white">STAGE {level} CLEARED!</h3>
              <p className="text-xs text-emerald-400 font-bold">Your massive mob reached the final destination!</p>
            </div>

            {/* Reward Stats */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 w-full max-w-xs space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Surviving Mob:</span>
                <span className="font-bold text-cyan-400">{mobCount} Units</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Score Earned:</span>
                <span className="font-bold text-white">+{score.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setLevel((l) => l + 1);
                handleStartGame();
              }}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <span>NEXT STAGE {level + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Footer Controls Cheatsheet */}
      <div className="mt-2 w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Controls: <strong>Drag Finger / Mouse or ◀ ▶ / A-D</strong></span>
        <span className="text-cyan-400 font-bold">Hit Blue Multipliers!</span>
      </div>
    </div>
  );
};
