import React, { useEffect, useState } from 'react';
import { X, Wallet, Sparkles, Trophy, Gift, ArrowUpRight, RotateCcw, ShieldCheck, Coins, CheckCircle, Clock } from 'lucide-react';
import { sound } from '../../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBalanceChange?: (newBalance: number) => void;
}

export interface WalletTransaction {
  id: string;
  title: string;
  amount: number; // positive for income, negative for expense
  date: string;
  type: 'WIN' | 'REWARD' | 'TOPUP' | 'SHOP';
}

export const WalletModal: React.FC<Props> = ({ isOpen, onClose, onBalanceChange }) => {
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_wallet_balance');
    return saved ? parseInt(saved, 10) : 3500;
  });

  const [lastClaimTime, setLastClaimTime] = useState<number>(() => {
    const saved = localStorage.getItem('novaplay_last_daily_claim');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => {
    const saved = localStorage.getItem('novaplay_wallet_txs');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'tx_1', title: 'Cyber Teen Patti - Pot Victory', amount: 300, date: 'Just now', type: 'WIN' },
      { id: 'tx_2', title: 'Cyber Jet Flight - Boss Clear', amount: 2000, date: '10 mins ago', type: 'WIN' },
      { id: 'tx_3', title: 'Welcome Bonus Reward', amount: 1200, date: 'Today', type: 'REWARD' },
    ];
  });

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DAILY' | 'HISTORY'>('OVERVIEW');
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);

  // Sync state across components & storage
  useEffect(() => {
    localStorage.setItem('novaplay_wallet_balance', String(balance));
    if (onBalanceChange) onBalanceChange(balance);
    window.dispatchEvent(new Event('wallet_balance_updated'));
  }, [balance, onBalanceChange]);

  useEffect(() => {
    localStorage.setItem('novaplay_wallet_txs', JSON.stringify(transactions));
  }, [transactions]);

  if (!isOpen) return null;

  const now = Date.now();
  const canClaimDaily = now - lastClaimTime > 24 * 60 * 60 * 1000;

  const addTransaction = (title: string, amount: number, type: 'WIN' | 'REWARD' | 'TOPUP' | 'SHOP') => {
    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      title,
      amount,
      date: 'Just now',
      type,
    };
    setTransactions((prev) => [newTx, ...prev.slice(0, 19)]);
  };

  const handleClaimDaily = () => {
    if (!canClaimDaily) return;

    sound.playWin();
    const bonusAmount = 500;
    const newBal = balance + bonusAmount;
    setBalance(newBal);
    setLastClaimTime(now);
    localStorage.setItem('novaplay_last_daily_claim', String(now));

    addTransaction('Daily Login Reward', bonusAmount, 'REWARD');
    setClaimSuccessMsg('🎉 SUCCESS! +500 CHIPS CLAIMED!');
    setTimeout(() => setClaimSuccessMsg(null), 3000);
  };

  const handleFreeTopup = () => {
    sound.playCollect();
    const topupAmount = 1000;
    const newBal = balance + topupAmount;
    setBalance(newBal);

    addTransaction('Free Demo Top-Up', topupAmount, 'TOPUP');
    setClaimSuccessMsg('⚡ +1,000 DEMO CHIPS ADDED TO WALLET!');
    setTimeout(() => setClaimSuccessMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl text-slate-950 shadow-lg">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">NOVA CYBER WALLET</h2>
              <p className="text-xs text-cyan-400">Manage winnings, rewards & chip balance</p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Balance Banner Card */}
          <div className="relative p-6 rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-purple-950 border border-cyan-400/40 shadow-[0_0_30px_rgba(0,242,254,0.15)] flex flex-col justify-between overflow-hidden">
            <div className="absolute right-3 top-3 opacity-10">
              <Coins className="w-32 h-32 text-cyan-400" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-cyan-400 tracking-wider uppercase">TOTAL WALLET BALANCE</span>
                <span className="text-[10px] font-extrabold px-3 py-0.5 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-full flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" /> PRO HIGH ROLLER
                </span>
              </div>

              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-cyan-300 my-2">
                {balance.toLocaleString()} <span className="text-xl text-amber-400 font-bold">CHIPS</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800/80 mt-2">
              <button
                onClick={handleFreeTopup}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black rounded-xl text-xs hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 shadow-lg"
              >
                <Sparkles className="w-4 h-4" /> FREE TOP-UP (+1,000)
              </button>
            </div>
          </div>

          {/* Alert Claim Message */}
          {claimSuccessMsg && (
            <div className="bg-emerald-950/90 border border-emerald-400 text-emerald-300 font-extrabold px-4 py-2.5 rounded-2xl text-center text-xs animate-bounce flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> {claimSuccessMsg}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'OVERVIEW'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              OVERVIEW
            </button>
            <button
              onClick={() => setActiveTab('DAILY')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'DAILY'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gift className="w-3.5 h-3.5 text-amber-400" /> DAILY REWARD
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'HISTORY'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              TRANSACTIONS ({transactions.length})
            </button>
          </div>

          {/* Tab Content: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Daily Login Bonus</div>
                    <div className="text-xs text-slate-400">Claim +500 free chips every 24 hours</div>
                  </div>
                </div>

                <button
                  onClick={handleClaimDaily}
                  disabled={!canClaimDaily}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                    canClaimDaily
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {canClaimDaily ? 'CLAIM +500' : 'CLAIMED'}
                </button>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Instant Demo Top-Up</div>
                    <div className="text-xs text-slate-400">Recharge 1,000 chips anytime</div>
                  </div>
                </div>

                <button
                  onClick={handleFreeTopup}
                  className="px-4 py-2 bg-slate-800 border border-cyan-500/30 text-cyan-300 font-bold rounded-xl text-xs hover:bg-cyan-500/20 transition"
                >
                  +1,000 CHIPS
                </button>
              </div>
            </div>
          )}

          {/* Tab Content: DAILY REWARD */}
          {activeTab === 'DAILY' && (
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-500/20 border border-amber-400/40 rounded-full mx-auto flex items-center justify-center text-amber-400">
                <Gift className="w-8 h-8 animate-bounce" />
              </div>

              <h3 className="text-xl font-black text-white">24-HOUR DAILY REWARD</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Log in daily to claim +500 free casino chips and keep your winning streak going!
              </p>

              <button
                onClick={handleClaimDaily}
                disabled={!canClaimDaily}
                className={`w-full py-3.5 rounded-xl font-black text-sm transition shadow-xl ${
                  canClaimDaily
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {canClaimDaily ? 'CLAIM 500 FREE CHIPS NOW' : 'NEXT CLAIM IN 24 HOURS'}
              </button>
            </div>
          )}

          {/* Tab Content: TRANSACTIONS */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex justify-between items-center text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        tx.amount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white">{tx.title}</div>
                      <div className="text-[10px] text-slate-400">{tx.date}</div>
                    </div>
                  </div>

                  <div className={`font-black text-sm ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount} CHIPS
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex justify-between items-center text-xs text-slate-400">
          <span>Synced with Local Storage</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-200 font-bold rounded-xl hover:bg-slate-700 transition"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
