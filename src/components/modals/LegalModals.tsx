import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Info, Mail, Send, CheckCircle2 } from 'lucide-react';
import { ModalType } from '../../types';

interface Props {
  activeModal: ModalType;
  onClose: () => void;
}

export const LegalModals: React.FC<Props> = ({ activeModal, onClose }) => {
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });

  if (!activeModal) return null;

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactForm.name && contactForm.email && contactForm.message) {
      setContactSubmitted(true);
      setTimeout(() => {
        setContactSubmitted(false);
        setContactForm({ name: '', email: '', message: '' });
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        id="legal-modal-content"
        className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-900/90 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {activeModal === 'privacy' && <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />}
            {activeModal === 'terms' && <FileText className="w-5 h-5 text-purple-400 shrink-0" />}
            {activeModal === 'about' && <Info className="w-5 h-5 text-amber-400 shrink-0" />}
            {activeModal === 'contact' && <Mail className="w-5 h-5 text-emerald-400 shrink-0" />}

            <h3 className="text-base sm:text-lg font-bold text-white capitalize truncate">
              {activeModal === 'privacy' && 'Privacy Policy & Cookies'}
              {activeModal === 'terms' && 'Terms of Service'}
              {activeModal === 'about' && 'About NovaPlay H5 Games'}
              {activeModal === 'contact' && 'Contact Support & Inquiries'}
            </h3>
          </div>

          <button
            id="close-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300">
          {activeModal === 'privacy' && (
            <>
              <p className="text-xs text-slate-400">Last updated: September 2026</p>
              <h4 className="font-bold text-white text-base">1. Information We Collect</h4>
              <p>
                NovaPlay H5 Games values user privacy. We do not require account registration or collection of sensitive personal data. Game high scores and sound preferences are stored locally on your device via standard browser LocalStorage.
              </p>

              <h4 className="font-bold text-white text-base">2. Third-Party Advertising & Google Ad Manager Policy</h4>
              <p>
                We use third-party advertising companies, including Google Ad Manager and Google Publisher Tag (GPT), to serve ads when you visit our website. These companies may use information (not including your name, address, email address, or telephone number) about your visits to this and other websites in order to provide advertisements about goods and services of interest to you.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Google, as a third-party vendor, uses cookies to serve ads on NovaPlay H5 Games.</li>
                <li>Google's use of advertising cookies enables it and its partners to serve ads based on your visit to our site and/or other sites on the Internet.</li>
                <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">Google Ad Settings</a> or <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">aboutads.info</a>.</li>
              </ul>

              <h4 className="font-bold text-white text-base">3. Cookie Policy & GDPR Compliance</h4>
              <p>
                Cookies are small text files stored on your browser to improve site loading speeds, save high scores, and deliver relevant advertisements. You can configure your browser to reject cookies or notify you when cookies are sent.
              </p>

              <h4 className="font-bold text-white text-base">4. Contacting Us</h4>
              <p>
                For questions regarding this privacy policy or data compliance, please reach out via our Contact form.
              </p>
            </>
          )}

          {activeModal === 'terms' && (
            <>
              <p className="text-xs text-slate-400">Last updated: September 2026</p>
              <h4 className="font-bold text-white text-base">1. Acceptance of Terms</h4>
              <p>
                By accessing NovaPlay H5 Games, you agree to comply with these terms. All games are provided free of charge for personal entertainment on desktop and mobile web browsers without required software downloads.
              </p>

              <h4 className="font-bold text-white text-base">2. Intellectual Property & DMCA Policy</h4>
              <p>
                All original game assets, mechanics, audio engines, and user interfaces are the intellectual property of NovaPlay Games. If you believe any content on NovaPlay infringes your copyright, please notify us immediately via our Contact form with specific details for prompt DMCA review and resolution.
              </p>

              <h4 className="font-bold text-white text-base">3. Disclaimer of Warranty</h4>
              <p>
                The games and website are provided on an "AS IS" and "AS AVAILABLE" basis. While we optimize for 60FPS fluid browser performance across devices, we do not guarantee uninterrupted service.
              </p>
            </>
          )}

          {activeModal === 'about' && (
            <>
              <h4 className="font-bold text-white text-base">Welcome to NovaPlay H5 Games</h4>
              <p>
                NovaPlay is a next-generation web gaming portal dedicated to delivering lightning-fast, zero-download, 60FPS HTML5 games right in your browser. Whether on mobile, tablet, or desktop, our games are built with high-performance Web Audio and HTML5 Canvas technology.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 my-4">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="font-bold text-cyan-400 mb-1">⚡ Zero Downloads</div>
                  <div className="text-xs text-slate-400">Click and play instantly without waiting for gigabyte app store downloads.</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="font-bold text-purple-400 mb-1">🎮 Premium Quality</div>
                  <div className="text-xs text-slate-400">Built-in audio synthesizer, 60FPS physics, and global high score challenges.</div>
                </div>
              </div>
              <p>
                We are actively curating and publishing new original titles. Have feedback or want to request a game genre? Let us know through our contact form!
              </p>
            </>
          )}

          {activeModal === 'contact' && (
            <>
              {contactSubmitted ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                  <h4 className="text-lg font-bold text-white">Message Sent Successfully!</h4>
                  <p className="text-xs text-slate-400">Thank you for contacting NovaPlay support. We will get back to you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="e.g. Alex Smith"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="alex@example.com"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Message / Game Feedback</label>
                    <textarea
                      required
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Tell us what game you'd like to see next or report any bugs..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    id="submit-contact-btn"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    SEND MESSAGE
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
