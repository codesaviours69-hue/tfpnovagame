import React from 'react';
import { Gamepad2, ShieldCheck, FileText, Info, Mail, Heart, Sparkles } from 'lucide-react';
import { ModalType } from '../types';
import { sound } from '../utils/audio';

interface Props {
  onOpenModal: (m: ModalType) => void;
}

export const Footer: React.FC<Props> = ({ onOpenModal }) => {
  return (
    <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/80 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Bio */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-fuchsia-600 flex items-center justify-center text-white">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <span className="text-base font-extrabold text-white tracking-tight">
                NovaPlay H5 Games Portal
              </span>
            </div>
            <p className="text-slate-400 max-w-md text-xs leading-relaxed">
              NovaPlay is a premier browser games catalog bringing you fast, 60FPS HTML5 instant games. Play directly without downloading or installing any apps. Optimized for desktop, mobile smartphones, and tablets.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Modern Web Standards & Clean Gaming Experience</span>
            </div>
          </div>

          {/* Col 2: Legal & Trust (AdSense requirements) */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              Legal & Policy
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => {
                    sound.playClick();
                    onOpenModal('privacy');
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Privacy Policy & Cookies</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    sound.playClick();
                    onOpenModal('terms');
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-500" />
                  <span>Terms of Service</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    sound.playClick();
                    onOpenModal('about');
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <Info className="w-3.5 h-3.5 text-amber-500" />
                  <span>About NovaPlay</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    sound.playClick();
                    onOpenModal('contact');
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Contact & Game Submissions</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Categories & Fast Links */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              Top Featured Games
            </h4>
            <ul className="space-y-1.5 text-slate-400 text-xs">
              <li>🚀 Cyber Starfighter Ace 3D (Action)</li>
              <li>🏹 Cyber Bowmasters: Neon Duel (Duel)</li>
              <li>⚡ Cyber Slope 3D (Runner)</li>
              <li>🌟 Cyber Smash Hit 3D (Arcade)</li>
              <li>🎱 Cyber 8-Ball Pool (Sports)</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <div>
            © {new Date().getFullYear()} NovaPlay H5 Games. All rights reserved.
          </div>
          <div className="flex items-center gap-1">
            <span>Crafted for high performance & instant play</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
