import React, { useState, useEffect } from 'react';
import { Cookie, Check, Shield } from 'lucide-react';

interface Props {
  onOpenPrivacy: () => void;
}

export const CookieBanner: React.FC<Props> = ({ onOpenPrivacy }) => {
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem('novaplay_cookie_consent');
    if (!consent) {
      setAccepted(false);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('novaplay_cookie_consent', 'accepted');
    setAccepted(true);
  };

  if (accepted) return null;

  return (
    <div
      id="cookie-consent-banner"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 p-4 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-lg shadow-2xl shadow-cyan-950/40 text-slate-200 animate-slide-up"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
          <Cookie className="w-5 h-5" />
        </div>
        <div className="space-y-1.5">
          <div className="font-bold text-white text-sm flex items-center gap-1.5">
            <span>Cookie & Privacy Consent</span>
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            We use cookies and local storage to save your game progress, audio preferences, and high scores for an optimal gameplay experience.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              id="cookie-accept-btn"
              onClick={handleAccept}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Accept All
            </button>
            <button
              id="cookie-privacy-link"
              onClick={onOpenPrivacy}
              className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white text-xs underline transition-colors"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
