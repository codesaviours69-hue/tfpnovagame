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
  Play,
  Zap,
  Shield,
  Rocket,
  Snowflake,
  Crosshair,
  FastForward,
  Plus,
  ArrowUpCircle,
  Coins,
  Heart
} from 'lucide-react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

export type TowerType = 'plasma' | 'tesla' | 'missile' | 'cryo';

export interface Tower {
  id: number;
  type: TowerType;
  x: number;
  y: number;
  level: number;
  range: number;
  damage: number;
  fireRate: number; // ms cooldown
  lastFireTime: number;
  targetId: number | null;
}

export interface Enemy {
  id: number;
  name: string;
  maxHp: number;
  hp: number;
  speed: number;
  bounty: number;
  x: number;
  y: number;
  pathIndex: number;
  progress: number;
  isBoss: boolean;
  slowTimer: number;
  color: string;
  size: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  damage: number;
  type: TowerType;
  targetEnemyId: number;
}

const TOWER_SPECS: Record<
  TowerType,
  { name: string; cost: number; range: number; damage: number; fireRate: number; color: string; icon: string }
> = {
  plasma: { name: 'Plasma Laser', cost: 100, range: 140, damage: 22, fireRate: 350, color: '#00f0ff', icon: 'zap' },
  tesla: { name: 'Tesla Coil', cost: 120, range: 110, damage: 35, fireRate: 600, color: '#facc15', icon: 'spark' },
  missile: { name: 'Missile Silo', cost: 150, range: 180, damage: 75, fireRate: 1100, color: '#f43f5e', icon: 'rocket' },
  cryo: { name: 'Cryo Freeze', cost: 80, range: 120, damage: 8, fireRate: 500, color: '#38bdf8', icon: 'freeze' },
};

export const CyberNeonTowerDefense: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Match State
  const [gold, setGold] = useState<number>(300);
  const [health, setHealth] = useState<number>(20);
  const [wave, setWave] = useState<number>(1);
  const [totalWaves] = useState<number>(10);
  const [waveActive, setWaveActive] = useState<boolean>(false);
  const [gameSpeed, setGameSpeed] = useState<1 | 2>(1);
  const [selectedBuildType, setSelectedBuildType] = useState<TowerType>('plasma');
  const [selectedTower, setSelectedTower] = useState<Tower | null>(null);
  const [orbitalCooldown, setOrbitalCooldown] = useState<number>(0);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Fixed S-Curved Circuit Defense Path
  const waypoints = useRef([
    { x: 30, y: 160 },
    { x: 420, y: 160 },
    { x: 420, y: 340 },
    { x: 120, y: 340 },
    { x: 120, y: 520 },
    { x: 420, y: 520 },
    { x: 420, y: 680 },
    { x: 520, y: 680 },
  ]).current;

  // 60 FPS Engine State Ref
  const engineRef = useRef<{
    towers: Tower[];
    enemies: Enemy[];
    projectiles: Projectile[];
    particles: { x: number; y: number; vx: number; vy: number; color: string; alpha: number; size: number }[];
    lasers: { x1: number; y1: number; x2: number; y2: number; color: string; alpha: number }[];
    spawnQueue: { type: string; hp: number; speed: number; bounty: number; isBoss: boolean; color: string; size: number }[];
    spawnTimer: number;
    nextEnemyId: number;
    nextTowerId: number;
  }>({
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    lasers: [],
    spawnQueue: [],
    spawnTimer: 0,
    nextEnemyId: 1,
    nextTowerId: 1,
  });

  // Start Next Wave
  const startWave = useCallback(() => {
    if (waveActive || isGameOver || isWon) return;

    sound.playLaser();
    setWaveActive(true);

    const eng = engineRef.current;
    const enemyCount = 8 + wave * 3;
    const isBossWave = wave === totalWaves;

    const queue = [];
    for (let i = 0; i < enemyCount; i++) {
      const isBoss = isBossWave && i === enemyCount - 1;
      queue.push({
        type: isBoss ? 'Goliath Titan Boss' : wave > 6 ? 'Heavy Mech' : wave > 3 ? 'Armored Drone' : 'Scout Bot',
        hp: isBoss ? 2800 : 80 + wave * 45,
        speed: isBoss ? 0.7 : 1.4 + Math.random() * 0.4,
        bounty: isBoss ? 250 : 15 + wave * 2,
        isBoss,
        color: isBoss ? '#9333ea' : wave > 6 ? '#f43f5e' : wave > 3 ? '#facc15' : '#38bdf8',
        size: isBoss ? 24 : 12,
      });
    }

    eng.spawnQueue = queue;
    eng.spawnTimer = 0;
  }, [isGameOver, isWon, totalWaves, wave, waveActive]);

  // Build Tower at Click Position (if valid and enough gold)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isGameOver || isWon) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = 540 / rect.width;
    const scaleY = 780 / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const eng = engineRef.current;

    // Check if clicked existing tower
    const clickedTower = eng.towers.find(
      (t) => Math.hypot(t.x - clickX, t.y - clickY) < 28
    );

    if (clickedTower) {
      sound.playClick();
      setSelectedTower(clickedTower);
      return;
    }

    // Check distance to path (cannot build directly on road)
    let tooCloseToPath = false;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (l2 === 0) continue;
      const t = Math.max(0, Math.min(1, ((clickX - p1.x) * (p2.x - p1.x) + (clickY - p1.y) * (p2.y - p1.y)) / (l2 * l2)));
      const projX = p1.x + t * (p2.x - p1.x);
      const projY = p1.y + t * (p2.y - p1.y);
      if (Math.hypot(clickX - projX, clickY - projY) < 36) {
        tooCloseToPath = true;
        break;
      }
    }

    if (tooCloseToPath) {
      sound.playHit();
      return;
    }

    // Check cost and place tower
    const spec = TOWER_SPECS[selectedBuildType];
    if (gold >= spec.cost) {
      setGold((prev) => prev - spec.cost);
      sound.playWin();

      const newTower: Tower = {
        id: eng.nextTowerId++,
        type: selectedBuildType,
        x: clickX,
        y: clickY,
        level: 1,
        range: spec.range,
        damage: spec.damage,
        fireRate: spec.fireRate,
        lastFireTime: 0,
        targetId: null,
      };

      eng.towers.push(newTower);
      setSelectedTower(newTower);
    } else {
      sound.playHit();
    }
  };

  // Upgrade Selected Tower
  const upgradeSelectedTower = () => {
    if (!selectedTower) return;
    const upgradeCost = Math.round(TOWER_SPECS[selectedTower.type].cost * 1.2 * selectedTower.level);
    if (gold >= upgradeCost && selectedTower.level < 3) {
      setGold((prev) => prev - upgradeCost);
      sound.playWin();
      selectedTower.level++;
      selectedTower.damage = Math.round(selectedTower.damage * 1.6);
      selectedTower.range += 20;
      setSelectedTower({ ...selectedTower });
    } else {
      sound.playHit();
    }
  };

  // Trigger Orbital Ion Cannon Super Strike
  const triggerOrbitalStrike = () => {
    if (orbitalCooldown > 0 || isGameOver || isWon) return;

    sound.playExplosion();
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    setOrbitalCooldown(25); // 25s cooldown

    const eng = engineRef.current;
    eng.enemies.forEach((enemy) => {
      enemy.hp -= 450;
      for (let i = 0; i < 8; i++) {
        eng.particles.push({
          x: enemy.x,
          y: enemy.y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          color: '#00f0ff',
          alpha: 1.0,
          size: 6,
        });
      }
    });
  };

  // Cooldown timer
  useEffect(() => {
    if (orbitalCooldown <= 0) return;
    const interval = setInterval(() => {
      setOrbitalCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [orbitalCooldown]);

  // Restart Match
  const restartMatch = () => {
    sound.playClick();
    const eng = engineRef.current;
    eng.towers = [];
    eng.enemies = [];
    eng.projectiles = [];
    eng.particles = [];
    eng.lasers = [];
    eng.spawnQueue = [];
    eng.spawnTimer = 0;

    setGold(300);
    setHealth(20);
    setWave(1);
    setWaveActive(false);
    setSelectedTower(null);
    setIsWon(false);
    setIsGameOver(false);
  };

  // 60 FPS Physics & Tactical Simulation Loop
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
      const now = performance.now();
      const speedMult = gameSpeed;

      // ==========================================
      // 1. BACKGROUND & GRID
      // ==========================================
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);

      // Grid Pattern
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // ==========================================
      // 2. CIRCUIT DEFENSE PATH
      // ==========================================
      // Outer Glow Road
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.lineWidth = 44;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      waypoints.forEach((wp, idx) => {
        if (idx === 0) ctx.moveTo(wp.x, wp.y);
        else ctx.lineTo(wp.x, wp.y);
      });
      ctx.stroke();

      // Road Surface
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 36;
      ctx.stroke();

      // Road Neon Centerline
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Base Core Shield Terminal (End of Path)
      const endWP = waypoints[waypoints.length - 1];
      ctx.save();
      ctx.translate(endWP.x, endWP.y);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // ==========================================
      // 3. SPAWN QUEUE PROCESSING
      // ==========================================
      if (waveActive && eng.spawnQueue.length > 0) {
        eng.spawnTimer += speedMult;
        if (eng.spawnTimer >= 35) {
          eng.spawnTimer = 0;
          const nextData = eng.spawnQueue.shift();
          if (nextData) {
            eng.enemies.push({
              id: eng.nextEnemyId++,
              name: nextData.type,
              maxHp: nextData.hp,
              hp: nextData.hp,
              speed: nextData.speed,
              bounty: nextData.bounty,
              x: waypoints[0].x,
              y: waypoints[0].y,
              pathIndex: 0,
              progress: 0,
              isBoss: nextData.isBoss,
              slowTimer: 0,
              color: nextData.color,
              size: nextData.size,
            });
          }
        }
      }

      // ==========================================
      // 4. UPDATE ENEMIES
      // ==========================================
      eng.enemies.forEach((enemy) => {
        if (enemy.slowTimer > 0) enemy.slowTimer -= speedMult;

        const effectiveSpeed = (enemy.slowTimer > 0 ? enemy.speed * 0.5 : enemy.speed) * speedMult;
        const targetWP = waypoints[enemy.pathIndex + 1];

        if (targetWP) {
          const dx = targetWP.x - enemy.x;
          const dy = targetWP.y - enemy.y;
          const dist = Math.hypot(dx, dy);

          if (dist <= effectiveSpeed) {
            enemy.x = targetWP.x;
            enemy.y = targetWP.y;
            enemy.pathIndex++;
          } else {
            enemy.x += (dx / dist) * effectiveSpeed;
            enemy.y += (dy / dist) * effectiveSpeed;
          }
        } else {
          // Reached Base!
          enemy.hp = 0;
          sound.playHit();
          setHealth((prev) => {
            const nh = prev - (enemy.isBoss ? 5 : 1);
            if (nh <= 0) {
              setIsGameOver(true);
              sound.playGameOver();
            }
            return Math.max(0, nh);
          });
        }
      });

      // Filter dead / escaped enemies and grant bounty
      eng.enemies = eng.enemies.filter((e) => {
        if (e.hp <= 0 && e.pathIndex < waypoints.length - 1) {
          sound.playCollect();
          setGold((prev) => prev + e.bounty);
          // Spark explosion
          for (let p = 0; p < 8; p++) {
            eng.particles.push({
              x: e.x,
              y: e.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              color: e.color,
              alpha: 1.0,
              size: 4,
            });
          }
          return false;
        }
        return e.hp > 0;
      });

      // Check wave completion
      if (waveActive && eng.spawnQueue.length === 0 && eng.enemies.length === 0) {
        setWaveActive(false);
        sound.playWin();
        if (wave >= totalWaves) {
          setIsWon(true);
          confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } });
        } else {
          setWave((prev) => prev + 1);
          setGold((prev) => prev + 100); // Wave bonus gold!
        }
      }

      // ==========================================
      // 5. UPDATE TOWERS (TARGETING & FIRING)
      // ==========================================
      eng.towers.forEach((tower) => {
        // Find nearest enemy in range
        const inRangeEnemies = eng.enemies.filter(
          (e) => Math.hypot(e.x - tower.x, e.y - tower.y) <= tower.range
        );

        if (inRangeEnemies.length > 0) {
          const target = inRangeEnemies[0];
          tower.targetId = target.id;

          if (now - tower.lastFireTime >= tower.fireRate / speedMult) {
            tower.lastFireTime = now;

            if (tower.type === 'plasma') {
              // Instant laser beam
              target.hp -= tower.damage;
              eng.lasers.push({
                x1: tower.x,
                y1: tower.y,
                x2: target.x,
                y2: target.y,
                color: '#00f0ff',
                alpha: 1.0,
              });
            } else if (tower.type === 'tesla') {
              // Chain arc lightning
              inRangeEnemies.slice(0, 3).forEach((e) => {
                e.hp -= tower.damage;
                eng.lasers.push({
                  x1: tower.x,
                  y1: tower.y,
                  x2: e.x,
                  y2: e.y,
                  color: '#facc15',
                  alpha: 1.0,
                });
              });
            } else if (tower.type === 'cryo') {
              // Freeze cone
              inRangeEnemies.forEach((e) => {
                e.hp -= tower.damage;
                e.slowTimer = 120;
              });
            } else if (tower.type === 'missile') {
              // Homing rocket projectile
              const dx = target.x - tower.x;
              const dy = target.y - tower.y;
              const dist = Math.hypot(dx, dy);
              eng.projectiles.push({
                id: Math.random(),
                x: tower.x,
                y: tower.y,
                targetX: target.x,
                targetY: target.y,
                vx: (dx / dist) * 10,
                vy: (dy / dist) * 10,
                damage: tower.damage,
                type: 'missile',
                targetEnemyId: target.id,
              });
            }
          }
        } else {
          tower.targetId = null;
        }
      });

      // ==========================================
      // 6. UPDATE PROJECTILES
      // ==========================================
      eng.projectiles.forEach((proj) => {
        proj.x += proj.vx * speedMult;
        proj.y += proj.vy * speedMult;

        const target = eng.enemies.find((e) => e.id === proj.targetEnemyId) || { x: proj.targetX, y: proj.targetY };
        if (Math.hypot(proj.x - target.x, proj.y - target.y) < 18) {
          proj.damage = 0; // mark dead
          sound.playExplosion();

          // Area splash damage to nearby enemies
          eng.enemies.forEach((e) => {
            if (Math.hypot(e.x - proj.x, e.y - proj.y) < 60) {
              e.hp -= 75;
            }
          });
        }
      });
      eng.projectiles = eng.projectiles.filter((p) => p.damage > 0);

      // ==========================================
      // 7. DRAW LASERS, PARTICLES & PROJECTILES
      // ==========================================
      eng.lasers.forEach((l) => {
        ctx.save();
        ctx.globalAlpha = l.alpha;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = l.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
        ctx.restore();
        l.alpha -= 0.12 * speedMult;
      });
      eng.lasers = eng.lasers.filter((l) => l.alpha > 0);

      eng.projectiles.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ==========================================
      // 8. DRAW ENEMIES WITH HP BARS
      // ==========================================
      eng.enemies.forEach((e) => {
        ctx.save();
        ctx.translate(e.x, e.y);

        // Slow effect aura
        if (e.slowTimer > 0) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, e.size + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Body
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, e.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Mini HP Bar
        const barW = Math.max(28, e.size * 2);
        const hpPct = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-barW / 2, -e.size - 10, barW, 4);
        ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : '#ef4444';
        ctx.fillRect(-barW / 2, -e.size - 10, barW * hpPct, 4);

        ctx.restore();
      });

      // ==========================================
      // 9. DRAW TOWERS & SELECTION CIRCLES
      // ==========================================
      eng.towers.forEach((t) => {
        const spec = TOWER_SPECS[t.type];
        const isSel = selectedTower?.id === t.id;

        // Selection Range Circle
        if (isSel) {
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.save();
        ctx.translate(t.x, t.y);

        // Tower Base
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = spec.color;
        ctx.lineWidth = isSel ? 3 : 2;
        ctx.shadowColor = spec.color;
        ctx.shadowBlur = isSel ? 16 : 8;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner Core
        ctx.fillStyle = spec.color;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Level Stars
        for (let l = 0; l < t.level; l++) {
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(-8 + l * 8, 12, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // Particles
      eng.particles.forEach((p) => {
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;
        p.alpha -= 0.03 * speedMult;
        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
      eng.particles = eng.particles.filter((p) => p.alpha > 0);
    };

    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameSpeed, selectedTower, startWave, totalWaves, wave, waveActive, waypoints]);

  return (
    <div
      ref={containerRef}
      id="cyber-tower-defense-arena"
      className="relative w-full max-w-lg mx-auto flex flex-col items-center select-none font-sans px-1 sm:px-2 py-1"
    >
      {/* ========================================================================= */}
      {/* 1. TOP STATS HUD (GOLD, HEALTH, WAVE) */}
      {/* ========================================================================= */}
      <div className="w-full mb-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-xl flex items-center justify-between">
        {/* Health */}
        <div className="flex items-center gap-1.5 text-rose-400 font-mono font-black text-sm sm:text-base">
          <Heart className="w-5 h-5 fill-rose-500 text-rose-500 animate-pulse" />
          <span>{health}</span>
        </div>

        {/* Gold */}
        <div className="flex items-center gap-1.5 text-amber-300 font-mono font-black text-sm sm:text-base">
          <Coins className="w-5 h-5 text-amber-400" />
          <span>{gold}g</span>
        </div>

        {/* Wave Counter */}
        <div className="text-center font-mono">
          <span className="text-[10px] uppercase font-bold text-slate-400">WAVE:</span>{' '}
          <span className="text-sm font-black text-white">{wave} / {totalWaves}</span>
        </div>

        {/* Game Speed & Mute */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setGameSpeed((prev) => (prev === 1 ? 2 : 1))}
            className="px-2 py-1 rounded-xl bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-black"
          >
            {gameSpeed}x
          </button>

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

      {/* ========================================================================= */}
      {/* 2. TOWER DEFENSE CANVAS ARENA */}
      {/* ========================================================================= */}
      <div className="relative w-full max-w-[460px] aspect-[540/780] max-h-[74vh] sm:max-h-[82vh] flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl border-2 border-cyan-500/40 bg-black cursor-crosshair touch-none">
        <canvas
          ref={canvasRef}
          width={540}
          height={780}
          onClick={handleCanvasClick}
          className="w-full h-full object-contain block touch-none"
        />

        {/* Start Wave Floating CTA Button */}
        {!waveActive && !isGameOver && !isWon && (
          <button
            onClick={startWave}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/40 flex items-center gap-2 animate-bounce z-10"
          >
            <Play className="w-4 h-4 fill-white" /> START WAVE {wave}
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. TOWER BUILD TRAY & ORBITAL STRIKE CONTROLS */}
      {/* ========================================================================= */}
      <div className="w-full mt-2 p-2 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-1.5">
        {/* 4 Build Types */}
        {(['plasma', 'tesla', 'missile', 'cryo'] as TowerType[]).map((type) => {
          const spec = TOWER_SPECS[type];
          const isSelected = selectedBuildType === type;

          return (
            <button
              key={type}
              onClick={() => {
                sound.playClick();
                setSelectedBuildType(type);
                setSelectedTower(null);
              }}
              className={`flex-1 p-1.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                isSelected
                  ? 'bg-slate-800 border-cyan-400 shadow-md shadow-cyan-500/30 scale-105'
                  : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800/60'
              }`}
            >
              <div className="text-[10px] font-bold text-white truncate">{spec.name}</div>
              <div className="text-[9px] font-black text-amber-400 font-mono">{spec.cost}g</div>
            </button>
          );
        })}

        {/* Orbital Strike Super Ability */}
        <button
          disabled={orbitalCooldown > 0}
          onClick={triggerOrbitalStrike}
          className={`px-3 py-2 rounded-xl font-black text-[10px] flex flex-col items-center justify-center transition-all ${
            orbitalCooldown > 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>{orbitalCooldown > 0 ? `${orbitalCooldown}s` : 'ION CANNON'}</span>
        </button>
      </div>

      {/* Selected Tower Upgrade Bar */}
      {selectedTower && (
        <div className="w-full mt-1.5 p-2 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-between text-xs animate-fade-in">
          <div>
            <span className="font-bold text-white uppercase">{selectedTower.type} Tower</span>{' '}
            <span className="text-amber-400 font-mono font-bold">Lvl {selectedTower.level}</span>
          </div>

          <button
            onClick={upgradeSelectedTower}
            disabled={selectedTower.level >= 3}
            className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[11px] flex items-center gap-1"
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            {selectedTower.level < 3 ? `Upgrade (${Math.round(TOWER_SPECS[selectedTower.type].cost * 1.2 * selectedTower.level)}g)` : 'MAX'}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VICTORY MODAL */}
      {/* ========================================================================= */}
      {isWon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border-2 border-emerald-400/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
              <Trophy className="w-9 h-9 text-emerald-400 animate-bounce" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-emerald-400 tracking-wider">ALL 10 WAVES CLEARED!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">VICTORY DEFENSE</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Core Health Left:</span>
                <span className="text-emerald-300 font-mono text-xl font-black">{health} / 20</span>
              </div>
            </div>

            <button
              onClick={restartMatch}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-600 to-pink-600 hover:from-emerald-400 active:scale-95 text-white font-black text-base shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" /> PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. GAME OVER MODAL */}
      {/* ========================================================================= */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border-2 border-rose-500/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto shadow-xl shadow-rose-500/30">
              <Award className="w-9 h-9 text-rose-400" />
            </div>

            <div>
              <div className="text-xs uppercase font-black text-slate-400 tracking-wider">BASE CORE BREACHED!</div>
              <h2 className="text-3xl font-black text-white mt-0.5">GAME OVER</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Wave Reached:</span>
                <span className="text-white font-mono text-xl font-black">{wave} / 10</span>
              </div>
            </div>

            <button
              onClick={restartMatch}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 active:scale-95 text-white font-black text-base shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-5 h-5" /> TRY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
