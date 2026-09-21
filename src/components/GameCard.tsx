import React, { useState } from 'react';
import { Play, Star, Flame, Sparkles, Zap, Rocket, Grid, Clock, Trophy, Shield, Crosshair, Wrench, Car, Bike, Swords, Music, Flag, Layers, CircleDot, Bot, Award, Gamepad2, Target, Gauge } from 'lucide-react';
import { Game } from '../types';

interface Props {
  game: Game;
  onSelect: (game: Game) => void;
  isHighlighted?: boolean;
}

export const GameCard: React.FC<Props> = ({ game, onSelect, isHighlighted = false }) => {
  const [imgError, setImgError] = useState(false);

  const getIcon = (name: string) => {
    switch (name) {
      case 'Gauge':
        return <Gauge className="w-5 h-5 text-cyan-300" />;
      case 'Award':
        return <Award className="w-5 h-5 text-amber-300" />;
      case 'Gamepad2':
        return <Gamepad2 className="w-5 h-5 text-emerald-300" />;
      case 'Target':
        return <Target className="w-5 h-5 text-rose-300" />;
      case 'Bike':
        return <Bike className="w-5 h-5 text-cyan-300" />;
      case 'Car':
        return <Car className="w-5 h-5 text-sky-300" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-cyan-300" />;
      case 'Rocket':
        return <Rocket className="w-5 h-5 text-sky-300" />;
      case 'Grid':
        return <Grid className="w-5 h-5 text-emerald-300" />;
      case 'Trophy':
        return <Trophy className="w-5 h-5 text-amber-300" />;
      case 'Shield':
        return <Shield className="w-5 h-5 text-teal-300" />;
      case 'Crosshair':
        return <Crosshair className="w-5 h-5 text-indigo-300" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-amber-300" />;
      case 'Wrench':
        return <Wrench className="w-5 h-5 text-amber-300" />;
      case 'Swords':
        return <Swords className="w-5 h-5 text-rose-300" />;
      case 'Music':
        return <Music className="w-5 h-5 text-pink-300" />;
      case 'Flag':
        return <Flag className="w-5 h-5 text-emerald-300" />;
      case 'Layers':
        return <Layers className="w-5 h-5 text-purple-300" />;
      case 'CircleDot':
        return <CircleDot className="w-5 h-5 text-cyan-300" />;
      case 'Bot':
        return <Bot className="w-5 h-5 text-emerald-300" />;
      case 'Flame':
      default:
        return <Flame className="w-5 h-5 text-orange-300" />;
    }
  };

  return (
    <div
      id={`game-card-${game.id}`}
      onClick={() => game.isReady && onSelect(game)}
      className={`group relative rounded-2xl overflow-hidden cursor-pointer aspect-[16/10] bg-slate-900 border transition-all duration-300 select-none shadow-md ${
        isHighlighted
          ? 'border-emerald-400 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/50'
          : 'border-slate-800/80 hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/25 hover:ring-2 hover:ring-cyan-400/40'
      } ${
        game.isReady
          ? 'hover:scale-[1.04] hover:z-20 active:scale-[0.98]'
          : 'opacity-70 cursor-not-allowed'
      }`}
    >
      {/* Background Poster / Thumbnail Art */}
      {game.posterUrl && !imgError ? (
        <img
          src={game.posterUrl}
          alt={game.title}
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      ) : (
        <div className={`absolute inset-0 w-full h-full bg-gradient-to-tr ${game.thumbnailGradient} flex flex-col items-center justify-center p-3 text-center`}>
          <div className="w-10 h-10 rounded-xl bg-slate-950/80 border border-white/20 flex items-center justify-center shadow-lg mb-1.5 group-hover:scale-110 transition-transform">
            {getIcon(game.iconName)}
          </div>
          <span className="text-xs font-black text-white drop-shadow-md line-clamp-1">{game.title}</span>
        </div>
      )}

      {/* Edge-to-Edge Subtle Bottom Gradient for Title Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity" />

      {/* Top Floating Badges */}
      <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
        {game.isHot && (
          <span className="px-2 py-0.5 rounded-md bg-rose-500/90 backdrop-blur-sm text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-0.5 shadow-md">
            <Flame className="w-2.5 h-2.5 fill-current" />
            HOT
          </span>
        )}
        {game.isNew && !game.isHot && (
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/90 backdrop-blur-sm text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-md">
            NEW
          </span>
        )}
        {!game.isReady && (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            SOON
          </span>
        )}
      </div>

      {/* Top Right Rating Badge */}
      <div className="absolute top-2 right-2 z-10">
        <div className="px-1.5 py-0.5 rounded-md bg-slate-950/80 border border-white/10 backdrop-blur-sm text-[10px] font-bold text-amber-300 flex items-center gap-0.5 shadow-md">
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          {game.rating.toFixed(1)}
        </div>
      </div>

      {/* Bottom Game Title & Category Info Bar */}
      <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-3 z-10 flex flex-col justify-end">
        <div className="flex items-center justify-between gap-1">
          <h3 className="text-xs sm:text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors drop-shadow-md line-clamp-1 leading-snug">
            {game.title}
          </h3>
        </div>

        {/* Hover Subtitle: Category & Play Prompt */}
        <div className="flex items-center justify-between text-[10px] text-slate-300 font-semibold opacity-80 group-hover:opacity-100 transition-opacity mt-0.5">
          <span className="uppercase tracking-wider text-cyan-400 text-[9px] font-bold">{game.category}</span>
          <span className="hidden group-hover:inline-flex items-center gap-1 text-emerald-400 font-bold">
            <Play className="w-2.5 h-2.5 fill-current" />
            Play
          </span>
        </div>
      </div>

      {/* Center Play Button Overlay on Hover */}
      {game.isReady && (
        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none z-10">
          <div className="w-10 h-10 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-xl shadow-cyan-500/50 transform scale-75 group-hover:scale-100 transition-transform duration-200">
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          </div>
        </div>
      )}
    </div>
  );
};
