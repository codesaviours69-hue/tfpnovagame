import React, { useEffect, useState } from 'react';
import { 
  Gamepad2, Search, Volume2, VolumeX, Sparkles, ShieldCheck, Mail, Info, 
  Menu, X, Compass, HelpCircle, FileText, Lock, Wallet
} from 'lucide-react';
import { CategoryFilter, ModalType } from '../types';
import { sound } from '../utils/audio';

interface Props {
  selectedCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenModal: (m: ModalType) => void;
  onLogoClick: () => void;
  muted: boolean;
  onToggleMute: () => void;
  isGameActive?: boolean;
}

export const Header: React.FC<Props> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onOpenModal,
  onLogoClick,
  muted,
  onToggleMute,
  isGameActive = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_wallet_balance');
    return saved ? parseInt(saved, 10) : 3500;
  });

  useEffect(() => {
    const updateBalance = () => {
      const saved = localStorage.getItem('novaplay_wallet_balance');
      if (saved) setWalletBalance(parseInt(saved, 10));
    };

    window.addEventListener('wallet_balance_updated', updateBalance);
    window.addEventListener('storage', updateBalance);
    return () => {
      window.removeEventListener('wallet_balance_updated', updateBalance);
      window.removeEventListener('storage', updateBalance);
    };
  }, []);

  const categories: { id: CategoryFilter; label: string }[] = [
    { id: 'all', label: 'All Games' },
    { id: 'action', label: '🚀 Action' },
    { id: 'arcade', label: '⚡ Arcade' },
    { id: 'sports', label: '🏀 Sports' },
    { id: 'puzzle', label: '🧩 Puzzle' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Logo */}
          <div
            id="brand-logo"
            onClick={() => {
              sound.playClick();
              setMobileMenuOpen(false);
              onLogoClick();
            }}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-500 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                  NOVAPLAY
                </span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-extrabold text-[10px] border border-cyan-400/30">
                  H5
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Premium Instant Web Games
              </span>
            </div>
          </div>

          {/* Desktop Search Bar */}
          <div className="flex-1 max-w-md mx-2 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="search-games-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search premium H5 games..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all"
              />
            </div>
          </div>

          {/* Right Action Icons & Legal Nav */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Global Wallet Button */}
            <button
              id="header-wallet-btn"
              onClick={() => {
                sound.playClick();
                onOpenModal('wallet');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-cyan-500/20 border border-amber-400/40 text-amber-300 hover:border-amber-300 hover:shadow-[0_0_15px_rgba(255,234,0,0.25)] transition-all font-black text-xs"
              title="Open Nova Cyber Wallet"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span>{walletBalance.toLocaleString()} CHIPS</span>
            </button>

            <button
              id="header-mute-toggle"
              onClick={onToggleMute}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
              title={muted ? 'Enable Sound FX' : 'Mute Sound FX'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              id="header-about-btn"
              onClick={() => onOpenModal('about')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>About</span>
            </button>

            <button
              id="header-contact-btn"
              onClick={() => onOpenModal('contact')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold text-cyan-300 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact</span>
            </button>

            {/* Mobile Hamburger Menu Button */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => {
                sound.playClick();
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 sm:hidden text-slate-300 hover:text-white"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search input */}
        {!isGameActive && (
          <div className="pb-2.5 md:hidden">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search games..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>
        )}

        {/* Mobile Navigation Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-800 py-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                onClick={() => {
                  sound.playClick();
                  onOpenModal('about');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-cyan-500/50"
              >
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>About Us</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  onOpenModal('contact');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-cyan-500/50"
              >
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Contact</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  onOpenModal('privacy');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-cyan-500/50"
              >
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Privacy Policy</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  onOpenModal('terms');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-cyan-500/50"
              >
                <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Terms of Service</span>
              </button>
            </div>
          </div>
        )}

        {/* Categories Bar (Mobile & Desktop Responsive Scroll with smooth fade) */}
        {!isGameActive && (
          <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none category-scroll border-t border-slate-800/60 -mx-3 px-3 sm:mx-0 sm:px-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`cat-filter-${cat.id}`}
                onClick={() => {
                  sound.playClick();
                  onSelectCategory(cat.id);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};
