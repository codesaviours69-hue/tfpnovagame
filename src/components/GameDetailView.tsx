import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Heart,
  Share2,
  Star,
  Gamepad2,
  Info,
  Check,
  Trophy,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  Sliders,
  Flame,
  Zap,
  ScreenShare
} from 'lucide-react';
import { Game } from '../types';
import { AdBanner, StickyAnchorAd, AdSenseBanner, ADSENSE_SLOTS } from './ads';
import { ADS_CONFIG } from '../config/adsConfig';
import { ArrowsPuzzleEscape } from './games/ArrowsPuzzleEscape';
import { NinJumpTowerClimb } from './games/NinJumpTowerClimb';
import { CyberNeonBreakout3D } from './games/CyberNeonBreakout3D';
import { CyberSnake3D } from './games/CyberSnake3D';
import { CyberNeonHillClimb2D } from './games/CyberNeonHillClimb2D';
import { CyberFruitKatana3D } from './games/CyberFruitKatana3D';
import { CyberParkourRunner3D } from './games/CyberParkourRunner3D';
import { CyberShadowNinja } from './games/CyberShadowNinja';
import { CyberTurboJetSki3D } from './games/CyberTurboJetSki3D';
import { CyberGeometryWars } from './games/CyberGeometryWars';
import { NeonCyberRunner } from './games/NeonCyberRunner';
import { GalaxyDefender } from './games/GalaxyDefender';
import { BrickBreakerNeon } from './games/BrickBreakerNeon';
import { HexaBlastPuzzle } from './games/HexaBlastPuzzle';
import { AstroVanguard } from './games/AstroVanguard';
import { CyberHoops } from './games/CyberHoops';
import { NeonPenaltyStriker } from './games/NeonPenaltyStriker';
import { CyberArcheryMaster } from './games/CyberArcheryMaster';
import { ConeSortDeluxe } from './games/ConeSortDeluxe';
import { KnifeHitNeon } from './games/KnifeHitNeon';
import { ColorHole3D } from './games/ColorHole3D';
import { NeonTowerStacker3D } from './games/NeonTowerStacker3D';
import { CyberMerge2048 } from './games/CyberMerge2048';
import { CyberHopper3D } from './games/CyberHopper3D';
import { HelixJump3D } from './games/HelixJump3D';
import { CyberSlitherArena } from './games/CyberSlitherArena';
import { CyberBladeHit } from './games/CyberBladeHit';
import { CyberKatanaSlicer } from './games/CyberKatanaSlicer';
import { CyberStack3D } from './games/CyberStack3D';
import { CyberBubbleShooter } from './games/CyberBubbleShooter';
import { CyberDoodleJump } from './games/CyberDoodleJump';
import { CyberJetpackDash } from './games/CyberJetpackDash';
import { CyberRailSurfers } from './games/CyberRailSurfers';
import { CyberHighwayRacer3D } from './games/CyberHighwayRacer3D';
import { CyberDriftLegends3D } from './games/CyberDriftLegends3D';
import { CyberTankArena3D } from './games/CyberTankArena3D';
import { Cyber8BallPool } from './games/Cyber8BallPool';
import { CyberAirHockeyPro } from './games/CyberAirHockeyPro';
import { CyberNeonPinball } from './games/CyberNeonPinball';
import { CyberNeonRhythm } from './games/CyberNeonRhythm';
import { CyberNeonSurvivor } from './games/CyberNeonSurvivor';
import { CyberBlockBlast } from './games/CyberBlockBlast';
import { CyberSuikaWatermelon } from './games/CyberSuikaWatermelon';
import { CyberCrystalCrush } from './games/CyberCrystalCrush';
import { CyberNeonDashPro } from './games/CyberNeonDashPro';
import { CyberNeonTowerDefense } from './games/CyberNeonTowerDefense';
import { CyberBrickCrusher } from './games/CyberBrickCrusher';
import { CyberKnifeMaster3D } from './games/CyberKnifeMaster3D';
import { CyberNeonBubblePop } from './games/CyberNeonBubblePop';
import { CyberBladeSlicer } from './games/CyberBladeSlicer';
import { Cyber2048CubeMerge } from './games/Cyber2048CubeMerge';
import { CyberMobRunner3D } from './games/CyberMobRunner3D';
import { CyberNeonHunter } from './games/CyberNeonHunter';
import { CyberSmashHit3D } from './games/CyberSmashHit3D';
import { CyberSlope3D } from './games/CyberSlope3D';
import { CyberBowmasters } from './games/CyberBowmasters';
import { CyberMotoTrials } from './games/CyberMotoTrials';
import { CyberNeonPacMaze3D } from './games/CyberNeonPacMaze3D';
import { CyberStarfighter3D } from './games/CyberStarfighter3D';
import { CyberSmashKart3D } from './games/CyberSmashKart3D';
import { CyberNeonTileHop } from './games/CyberNeonTileHop';
import { CyberFlappyNeon } from './games/CyberFlappyNeon';
import { CyberNeonPong3D } from './games/CyberNeonPong3D';
import { CyberSniperElite3D } from './games/CyberSniperElite3D';
import { CyberJetFlight3D } from './games/CyberJetFlight3D';
import { CyberNeonBowling3D } from './games/CyberNeonBowling3D';
import { CyberCricketPro } from './games/CyberCricketPro';
import { CyberTableTennis3D } from './games/CyberTableTennis3D';
import { NeonDriftBoss3D } from './games/NeonDriftBoss3D';
import { CyberMechBrawler3D } from './games/CyberMechBrawler3D';
import { CyberPolicePursuit3D } from './games/CyberPolicePursuit3D';
import { CyberRocketLeague3D } from './games/CyberRocketLeague3D';
import { CyberZombieOutbreak3D } from './games/CyberZombieOutbreak3D';
import { CyberStreetBrawler3D } from './games/CyberStreetBrawler3D';
import { CyberAirCombat3D } from './games/CyberAirCombat3D';
import { CyberTeenPatti3D } from './games/CyberTeenPatti3D';
import { sound } from '../utils/audio';

interface Props {
  game: Game;
  onBack: () => void;
  onSelectRelated: (game: Game) => void;
  allGames: Game[];
}

export const GameDetailView: React.FC<Props> = ({ game, onBack, onSelectRelated, allGames }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(game.plays * 0.12));
  const [copied, setCopied] = useState(false);
  const [isFullView, setIsFullView] = useState(false);
  const [muted, setMuted] = useState(sound.isMuted());

  // Auto-scroll to top when a game is loaded or switched
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [game.id]);

  // Lock body scroll when in Full View Mode (Especially for mobile)
  useEffect(() => {
    if (isFullView) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isFullView]);

  // Escape key & F key listener for Full View toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullView) {
        setIsFullView(false);
      }
      if ((e.key === 'f' || e.key === 'F') && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        setIsFullView((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullView]);

  const handleLike = () => {
    sound.playClick();
    if (!isLiked) {
      setLikeCount((prev) => prev + 1);
      setIsLiked(true);
    } else {
      setLikeCount((prev) => prev - 1);
      setIsLiked(false);
    }
  };

  const handleShare = () => {
    sound.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleFullView = () => {
    sound.playClick();
    const nextState = !isFullView;
    setIsFullView(nextState);

    // Also trigger native browser fullscreen if supported
    if (nextState) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen && !document.fullscreenElement) {
        docEl.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const toggleMute = () => {
    const isMute = sound.toggleMute();
    setMuted(isMute);
  };

  // Render the specific active game component
  const renderGameComponent = () => {
    switch (game.id) {
      case 'arrows-puzzle-escape':
        return <ArrowsPuzzleEscape />;
      case 'ninjump-tower-climb':
        return <NinJumpTowerClimb />;
      case 'cyber-neon-breakout-3d':
        return <CyberNeonBreakout3D />;
      case 'cyber-snake-3d':
        return <CyberSnake3D />;
      case 'cyber-neon-hill-climb-2d':
        return <CyberNeonHillClimb2D />;
      case 'cyber-fruit-katana-3d':
        return <CyberFruitKatana3D />;
      case 'cyber-parkour-runner-3d':
        return <CyberParkourRunner3D />;
      case 'cyber-shadow-ninja':
        return <CyberShadowNinja />;
      case 'cyber-turbo-jetski-3d':
        return <CyberTurboJetSki3D />;
      case 'cyber-geometry-wars':
        return <CyberGeometryWars />;
      case 'cyber-sniper-elite-3d':
        return <CyberSniperElite3D />;
      case 'cyber-jet-flight-3d':
        return <CyberJetFlight3D />;
      case 'cyber-teen-patti-3d':
        return <CyberTeenPatti3D />;
      case 'cyber-neon-pong-3d':
        return <CyberNeonPong3D />;
      case 'cyber-flappy-neon':
        return <CyberFlappyNeon />;
      case 'cyber-neon-tile-hop':
        return <CyberNeonTileHop />;
      case 'cyber-smash-kart-3d':
        return <CyberSmashKart3D />;
      case 'cyber-neon-pacmaze-3d':
        return <CyberNeonPacMaze3D />;
      case 'cyber-moto-trials':
        return <CyberMotoTrials />;
      case 'cyber-starfighter-3d':
        return <CyberStarfighter3D />;
      case 'cyber-bowmasters':
        return <CyberBowmasters />;
      case 'cyber-slope-3d':
        return <CyberSlope3D />;
      case 'cyber-smash-hit-3d':
        return <CyberSmashHit3D />;
      case 'cyber-neon-hunter':
        return <CyberNeonHunter />;
      case 'cyber-mob-runner-3d':
        return <CyberMobRunner3D />;
      case 'cyber-2048-cube-merge':
        return <Cyber2048CubeMerge />;
      case 'cyber-blade-slicer':
        return <CyberBladeSlicer />;
      case 'cyber-neon-bubble-pop':
        return <CyberNeonBubblePop />;
      case 'cyber-knife-master-3d':
        return <CyberKnifeMaster3D />;
      case 'cyber-brick-crusher':
        return <CyberBrickCrusher />;
      case 'cyber-neon-tower-defense':
        return <CyberNeonTowerDefense />;
      case 'cyber-neon-dash-pro':
        return <CyberNeonDashPro />;
      case 'cyber-crystal-crush':
        return <CyberCrystalCrush />;
      case 'cyber-suika-watermelon':
        return <CyberSuikaWatermelon />;
      case 'cyber-block-blast':
        return <CyberBlockBlast />;
      case 'cyber-neon-survivor':
        return <CyberNeonSurvivor />;
      case 'cyber-neon-rhythm':
        return <CyberNeonRhythm />;
      case 'cyber-neon-pinball':
        return <CyberNeonPinball />;
      case 'cyber-air-hockey-pro':
        return <CyberAirHockeyPro />;
      case 'cyber-8ball-pool':
        return <Cyber8BallPool />;
      case 'neon-runner':
        return <NeonCyberRunner />;
      case 'galaxy-strike':
        return <GalaxyDefender />;
      case 'brick-breaker-neon':
        return <BrickBreakerNeon />;
      case 'hexa-blast-puzzle':
        return <HexaBlastPuzzle />;
      case 'astro-vanguard':
        return <AstroVanguard />;
      case 'cyber-hoops':
        return <CyberHoops />;
      case 'neon-penalty':
        return <NeonPenaltyStriker />;
      case 'cyber-archery':
        return <CyberArcheryMaster />;
      case 'cone-sort-deluxe':
        return <ConeSortDeluxe />;
      case 'knife-hit-neon':
        return <KnifeHitNeon />;
      case 'color-hole-3d':
        return <ColorHole3D />;
      case 'neon-tower-stacker-3d':
        return <NeonTowerStacker3D />;
      case 'cyber-merge-2048':
        return <CyberMerge2048 />;
      case 'cyber-hopper-3d':
        return <CyberHopper3D />;
      case 'helix-jump-neon':
        return <HelixJump3D />;
      case 'cyber-slither-arena':
        return <CyberSlitherArena />;
      case 'cyber-blade-hit':
        return <CyberBladeHit />;
      case 'cyber-katana-slicer':
        return <CyberKatanaSlicer />;
      case 'cyber-stack-3d':
        return <CyberStack3D />;
      case 'cyber-bubble-shooter':
        return <CyberBubbleShooter />;
      case 'cyber-jump-doodler':
        return <CyberDoodleJump />;
      case 'cyber-jetpack-dash':
        return <CyberJetpackDash />;
      case 'cyber-rail-surfers':
        return <CyberRailSurfers />;
      case 'cyber-highway-racer-3d':
        return <CyberHighwayRacer3D />;
      case 'cyber-drift-legends-3d':
        return <CyberDriftLegends3D />;
      case 'cyber-tank-arena-3d':
        return <CyberTankArena3D />;
      case 'cyber-bowling-3d':
        return <CyberNeonBowling3D />;
      case 'cyber-cricket-pro':
        return <CyberCricketPro />;
      case 'cyber-table-tennis-3d':
        return <CyberTableTennis3D />;
      case 'neon-drift-boss-3d':
        return <NeonDriftBoss3D />;
      case 'cyber-mech-brawler-3d':
        return <CyberMechBrawler3D />;
      case 'cyber-police-pursuit-3d':
        return <CyberPolicePursuit3D />;
      case 'cyber-rocket-league-3d':
        return <CyberRocketLeague3D />;
      case 'cyber-zombie-outbreak-3d':
        return <CyberZombieOutbreak3D />;
      case 'cyber-street-brawler-3d':
        return <CyberStreetBrawler3D />;
      case 'cyber-air-combat-3d':
        return <CyberAirCombat3D />;
      default:
        return <NeonCyberRunner />;
    }
  };

  const relatedGames = allGames.filter((g) => g.id !== game.id);

  return (
    <>
      {/* ========================================================================= */}
      {/* 🌟 IMMERSIVE FULL-VIEW THEATER OVERLAY (Mobile & Desktop Responsive) */}
      {/* ========================================================================= */}
      {isFullView && (
        <div
          id="fullview-theater-modal"
          className="fullview-overlay animate-fade-in"
        >
          {/* Top Full View Floating Header Bar */}
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-3 px-3 py-2 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md shadow-2xl z-50">
            {/* Left Exit Full View Button */}
            <button
              onClick={toggleFullView}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Exit Full View</span>
              <span className="sm:hidden">Exit</span>
            </button>

            {/* Center Game Title Badge */}
            <div className="flex items-center gap-2 truncate">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider hidden sm:inline">
                {game.category}
              </span>
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate drop-shadow">
                {game.title}
              </h2>
            </div>

            {/* Right Action Tools */}
            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                onClick={toggleMute}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>

              {/* Close Button */}
              <button
                onClick={toggleFullView}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-colors"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Center Main Game Stage in Full View */}
          <div className="fullview-arena my-auto w-full flex items-center justify-center">
            {renderGameComponent()}
          </div>

          {/* Dedicated Full View Mode Google AdSense Banner */}
          <div className="w-full max-w-4xl mx-auto py-1 px-2 z-40 shrink-0">
            <AdSenseBanner adSlot={ADSENSE_SLOTS.GAME_ADS_2} label="FULL VIEW SPONSORED AD" />
          </div>

          {/* Bottom Full View Status Hint */}
          <div className="w-full max-w-md mx-auto text-center text-[10px] text-slate-500 flex items-center justify-center gap-2 py-0.5 pb-1 shrink-0">
            <span>⚡ 60 FPS Accelerated Engine</span>
            <span>•</span>
            <span>Press <b>[ESC]</b> or tap <b>Exit</b> to return</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🎮 STANDARD CATALOG DETAIL VIEW */}
      {/* ========================================================================= */}
      <div id="game-detail-view" className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Top Breadcrumb & Action Bar */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
          <button
            id="back-to-home-btn"
            onClick={() => {
              sound.playClick();
              onBack();
            }}
            className="px-2.5 sm:px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Back to All Games</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Full View / Fullscreen Primary Button */}
            <button
              id="fullscreen-toggle-btn"
              onClick={toggleFullView}
              className="px-2.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-500/50 text-cyan-300 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-2 shadow-lg shadow-cyan-950/40 transition-all hover:scale-105 active:scale-95"
            >
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-pulse shrink-0" />
              <span>Full View</span>
            </button>

            {/* Like Button */}
            <button
              id="like-game-btn"
              onClick={handleLike}
              className={`px-2 sm:px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
                isLiked
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-rose-400'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{likeCount.toLocaleString()}</span>
            </button>

            {/* Share Button */}
            <button
              id="share-game-btn"
              onClick={handleShare}
              className="px-2 sm:px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              <span className="hidden sm:inline">{copied ? 'Link Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Top Game View AdSense Banner (game_ads-1) */}
        <div className="w-full">
          <AdSenseBanner adSlot={ADSENSE_SLOTS.GAME_ADS_1} label="FEATURED SPONSORED AD" />
        </div>

        {/* 2-COLUMN GRID: Game Arena & In-Game Banner on Left + Sidebar Banner & Games on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
          {/* LEFT 2 COLUMNS: Game Canvas Stage + In-Game Banner + Controls */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Main Game Stage Frame */}
            <div className="relative w-full flex flex-col items-center justify-center">
              <div id="game-canvas-arena" className="w-full flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-950 shadow-2xl overflow-hidden p-1 sm:p-2.5">
                {renderGameComponent()}
              </div>

              {/* In-Content Google AdSense Banner (game_ads-2) */}
              <div className="w-full mt-3">
                <AdSenseBanner adSlot={ADSENSE_SLOTS.GAME_ADS_2} label="IN-GAME SPONSORED AD" />
              </div>
            </div>

            {/* Game Description & Controls */}
            <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4 gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] sm:text-xs uppercase font-bold text-cyan-400 tracking-wider">
                    {game.category} • HTML5 GAME
                  </span>
                  <h1 className="text-xl sm:text-3xl font-extrabold text-white mt-0.5 break-words">
                    {game.title}
                  </h1>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs sm:text-sm flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                    <span>{game.rating}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed break-words">
                {game.description}
              </p>

              {/* Controls Guide Table */}
              <div className="pt-2">
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-cyan-400" />
                  Game Controls & Hotkeys
                </h3>

                <div className="grid sm:grid-cols-2 gap-2 sm:gap-2.5">
                  {game.controls.map((ctrl, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs gap-2"
                    >
                      <span className="text-slate-400 font-medium break-words">{ctrl.action}</span>
                      <kbd className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-slate-800 border border-slate-700 font-mono text-cyan-300 font-bold text-[11px] shrink-0">
                        {ctrl.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to Play Bullet Points */}
              <div className="pt-2">
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-400" />
                  How to Play
                </h3>

                <ul className="space-y-1.5 sm:space-y-2 text-xs text-slate-300">
                  {game.instructions.desktop.map((inst, idx) => (
                    <li key={idx} className="flex items-start gap-2 break-words">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <span>{inst}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tags */}
              <div className="pt-3 sm:pt-4 border-t border-slate-800 flex flex-wrap gap-1.5 sm:gap-2">
                {game.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] sm:text-xs text-slate-300 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT 1 COLUMN: Sidebar Ad Banner (game_ads-3) FIRST + Popular Games */}
          <div className="space-y-6">
            {/* Sidebar AdSense Banner (game_ads-3) Placed right next to game! */}
            <AdSenseBanner adSlot={ADSENSE_SLOTS.GAME_ADS_3} label="SPONSORED AD" className="w-full" />

            {/* More Popular Games */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                More Popular Games
              </h3>

              <div className="space-y-3">
                {relatedGames.map((relGame) => (
                  <div
                    key={relGame.id}
                    onClick={() => {
                      if (relGame.isReady) {
                        sound.playClick();
                        onSelectRelated(relGame);
                        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                      }
                    }}
                    className={`p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 transition-all ${
                      relGame.isReady
                        ? 'cursor-pointer hover:border-cyan-500/50 hover:bg-slate-800/60'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-tr ${relGame.thumbnailGradient} flex items-center justify-center shrink-0 overflow-hidden relative border border-slate-700/60 shadow-md`}>
                      {relGame.posterUrl ? (
                        <img
                          src={relGame.posterUrl}
                          alt={relGame.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      <Gamepad2 className="w-5 h-5 text-white/90 absolute z-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{relGame.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{relGame.category}</span>
                        <span>•</span>
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {relGame.rating}
                        </span>
                      </div>
                    </div>
                    {relGame.isReady ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-cyan-500/20 text-cyan-400">
                        PLAY
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        SOON
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Bottom AdSense Banner (game_ads-1) */}
            <AdSenseBanner adSlot={ADSENSE_SLOTS.GAME_ADS_1} label="FEATURED SPONSORED AD" className="w-full" />
          </div>
        </div>
      </div>
    </>
  );
};
