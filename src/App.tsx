import React, { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { GameCard } from './components/GameCard';
import { GameDetailView } from './components/GameDetailView';
import { CookieBanner } from './components/CookieBanner';
import { LegalModals } from './components/modals/LegalModals';
import { WalletModal } from './components/modals/WalletModal';
import { GAMES_DATA } from './data/games';
import { Game, CategoryFilter, ModalType } from './types';
import { sound } from './utils/audio';
import { AdBanner, StickyAnchorAd, AdManagerBanner, AD_MANAGER_SLOTS } from './components/ads';
import { ADS_CONFIG } from './config/adsConfig';
import { Flame, Sparkles, Trophy, Zap, HelpCircle, Gamepad2, Compass, Award, Puzzle, Swords, ChevronRight } from 'lucide-react';

export default function App() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [muted, setMuted] = useState(sound.isMuted());

  React.useEffect(() => {
    const handleOpenWallet = () => setActiveModal('wallet');
    window.addEventListener('open_wallet_modal', handleOpenWallet);
    return () => window.removeEventListener('open_wallet_modal', handleOpenWallet);
  }, []);

  // Trigger Google Ad Manager Rewarded Ad & Refresh Sticky Anchor on navigation
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if ((window as any).triggerNovaRewardAd) {
        (window as any).triggerNovaRewardAd();
      }
      if ((window as any).refreshNovaStickyAd) {
        (window as any).refreshNovaStickyAd();
      }
    }
  }, [selectedGame?.id, selectedCategory]);

  const handleToggleMute = () => {
    const isMute = sound.toggleMute();
    setMuted(isMute);
  };

  const handleSelectGame = (game: Game) => {
    sound.playClick();
    setSelectedGame(game);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleSelectCategory = (cat: CategoryFilter) => {
    setSelectedCategory(cat);
    setSelectedGame(null);
    setSearchQuery('');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // Filter games based on search query and category
  const filteredGames = GAMES_DATA.filter((game) => {
    const matchesCategory = selectedCategory === 'all' || game.category === selectedCategory;
    const matchesSearch =
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Curated lists for categorized home sections
  const topFeaturedGames = GAMES_DATA.slice(0, 6);
  const trendingGames = GAMES_DATA.slice(6, 12);
  const discoveryGames = GAMES_DATA.slice(12, 18);
  const actionGames = GAMES_DATA.filter((g) => g.category === 'action').slice(0, 6);
  const sportsGames = GAMES_DATA.filter((g) => g.category === 'sports').slice(0, 6);
  const puzzleGames = GAMES_DATA.filter((g) => g.category === 'puzzle').slice(0, 6);

  return (
    <div className="w-full min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 font-sans pb-16 sm:pb-24">
      {/* Navigation Header */}
      <Header
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenModal={setActiveModal}
        onLogoClick={() => {
          setSelectedGame(null);
          setSelectedCategory('all');
          setSearchQuery('');
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }}
        muted={muted}
        onToggleMute={handleToggleMute}
        isGameActive={!!selectedGame}
      />

      {/* Main Content Area */}
      <main className={`flex-1 max-w-[1560px] w-full mx-auto ${
        selectedGame
          ? 'px-2 sm:px-6 lg:px-8 py-2 sm:py-6 space-y-4 sm:space-y-8'
          : 'px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8'
      }`}>
        {/* If a game is active -> render GameDetailView theater */}
        {selectedGame ? (
          <GameDetailView
            game={selectedGame}
            onBack={() => setSelectedGame(null)}
            onSelectRelated={handleSelectGame}
            allGames={GAMES_DATA}
          />
        ) : (
          /* Catalog View */
          <>
            {/* Top Leaderboard Google Ad Manager Banner (Display-1) */}
            <div className="w-full">
              <AdManagerBanner slot={AD_MANAGER_SLOTS.DISPLAY_1} label="FEATURED ADVERTISEMENT" />
            </div>

            {/* Show Categorized Rows when on Home (all categories and no search query) */}
            {selectedCategory === 'all' && !searchQuery ? (
              <div className="space-y-7 sm:space-y-8">
                {/* 1. Top Featured Row (No Header, Edge-to-Edge Cards like Reference Image) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
                  {topFeaturedGames.map((game, idx) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onSelect={handleSelectGame}
                      isHighlighted={idx === 1} // Second card highlighted like "Dominations Idle" in user's screenshot
                    />
                  ))}
                </div>

                {/* In-Feed Banner Ad 1 (Display-2) */}
                <div className="w-full my-2">
                  <AdManagerBanner slot={AD_MANAGER_SLOTS.DISPLAY_2} label="SPONSORED ADVERTISEMENT" />
                </div>

                {/* 2. 🔥 Trending Games Section */}
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-rose-500 fill-rose-500" />
                      <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                        Trending Games
                      </h2>
                    </div>
                    <button
                      onClick={() => handleSelectCategory('action')}
                      className="text-xs sm:text-sm font-bold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-0.5 hover:underline"
                    >
                      View more
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
                    {trendingGames.map((game) => (
                      <GameCard key={game.id} game={game} onSelect={handleSelectGame} />
                    ))}
                  </div>
                </div>

                {/* In-Feed Banner Ad 2 (Display-3) */}
                <div className="w-full my-3">
                  <AdManagerBanner slot={AD_MANAGER_SLOTS.DISPLAY_3} label="SPONSORED ADVERTISEMENT" />
                </div>

                {/* 3. 💡 Discovery Section */}
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass className="w-5 h-5 text-amber-400" />
                      <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                        Discovery
                      </h2>
                    </div>
                    <button
                      onClick={() => handleSelectCategory('puzzle')}
                      className="text-xs sm:text-sm font-bold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-0.5 hover:underline"
                    >
                      View more
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
                    {discoveryGames.map((game) => (
                      <GameCard key={game.id} game={game} onSelect={handleSelectGame} />
                    ))}
                  </div>
                </div>

                {/* 4. 🏎️ Action & Combat Section */}
                {actionGames.length > 0 && (
                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Swords className="w-5 h-5 text-cyan-400" />
                        <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                          Action & Combat
                        </h2>
                      </div>
                      <button
                        onClick={() => handleSelectCategory('action')}
                        className="text-xs sm:text-sm font-bold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-0.5 hover:underline"
                      >
                        View more
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
                      {actionGames.map((game) => (
                        <GameCard key={game.id} game={game} onSelect={handleSelectGame} />
                      ))}
                    </div>
                  </div>
                )}

                {/* In-Feed Banner Ad 3 (Display-4) */}
                <div className="w-full my-3">
                  <AdManagerBanner slot={AD_MANAGER_SLOTS.DISPLAY_4} label="FEATURED ADVERTISEMENT" />
                </div>

                {/* 5. 🏆 Sports & Arcade Arena Section */}
                {sportsGames.length > 0 && (
                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                          Sports & Arcade Arena
                        </h2>
                      </div>
                      <button
                        onClick={() => handleSelectCategory('sports')}
                        className="text-xs sm:text-sm font-bold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-0.5 hover:underline"
                      >
                        View more
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
                      {sportsGames.map((game) => (
                        <GameCard key={game.id} game={game} onSelect={handleSelectGame} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. 🧩 Puzzle & Strategy Section */}
                {puzzleGames.length > 0 && (
                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Puzzle className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                          Puzzle & Strategy
                        </h2>
                      </div>
                      <button
                        onClick={() => handleSelectCategory('puzzle')}
                        className="text-xs sm:text-sm font-bold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-0.5 hover:underline"
                      >
                        View more
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
                      {puzzleGames.map((game) => (
                        <GameCard key={game.id} game={game} onSelect={handleSelectGame} />
                      ))}
                    </div>
                  </div>
                )}

                {/* In-Feed Banner Ad 4 (Display-5) */}
                <div className="w-full my-3">
                  <AdManagerBanner slot={AD_MANAGER_SLOTS.DISPLAY_5} label="SPONSORED ADVERTISEMENT" />
                </div>
              </div>
            ) : (
              /* Filtered / Search Category View */
              <div className="space-y-5">
                {/* Section Header */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                      {searchQuery
                        ? `Search Results for "${searchQuery}"`
                        : `${selectedCategory.toUpperCase()} GAMES`}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800/90 text-xs font-bold text-cyan-400 border border-cyan-500/20">
                      {filteredGames.length}
                    </span>
                  </div>

                  {(selectedCategory !== 'all' || searchQuery) && (
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setSearchQuery('');
                      }}
                      className="text-xs sm:text-sm font-bold text-slate-400 hover:text-white transition-colors"
                    >
                      ← Back to All Games
                    </button>
                  )}
                </div>

                {/* Grid */}
                {filteredGames.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
                    {filteredGames.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        onSelect={handleSelectGame}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                    <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto" />
                    <h3 className="text-lg font-bold text-slate-300">No games found</h3>
                    <p className="text-xs text-slate-500">
                      Try searching for another keyword or switch category filters.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setSearchQuery('');
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors"
                    >
                      Browse All Games
                    </button>
                  </div>
                )}

                {/* Category View Google Ad Manager Banner (Display-1) */}
                <div className="w-full my-4">
                  <AdManagerBanner slot={AD_MANAGER_SLOTS.DISPLAY_1} label="SPONSORED ADVERTISEMENT" />
                </div>
              </div>
            )}

            {/* SEO Compliance & Platform Highlights */}
            <div className="p-5 sm:p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4 sm:space-y-6 mt-6">
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  Instant HTML5 Web Gaming on NovaPlay
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-4xl">
                  NovaPlay offers instant, zero-download HTML5 web games engineered for 60 FPS smooth performance across desktop, mobile browsers, and tablets. Jump right into action, puzzle, arcade, and sports games with zero wait time.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="font-bold text-cyan-300 text-xs sm:text-sm flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Instant 60 FPS Performance
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    WebGL and Canvas acceleration with instant web audio synthesized sound.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="font-bold text-purple-300 text-xs sm:text-sm flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> 100% Cross-Platform
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Optimized for mobile touchscreens, tablets, keyboard, and mouse controls.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="font-bold text-emerald-300 text-xs sm:text-sm flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Safe & Privacy First
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Zero installations, no compulsory accounts, and fully GDPR compliant.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer with AdSense compliant links */}
      <Footer onOpenModal={setActiveModal} />

      {/* GDPR / Cookie Consent Banner */}
      <CookieBanner onOpenPrivacy={() => setActiveModal('privacy')} />

      {/* Legal & Compliance Modals */}
      <LegalModals activeModal={activeModal} onClose={() => setActiveModal(null)} />

      {/* Global Cyber Wallet Modal */}
      <WalletModal isOpen={activeModal === 'wallet'} onClose={() => setActiveModal(null)} />
    </div>
  );
}
