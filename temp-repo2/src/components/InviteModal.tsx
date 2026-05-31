import React, { useState } from 'react';
import { X, Gift, Users, Award, Landmark, Copy, Check, Share2, Sparkles, TrendingUp } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  theme: 'dark' | 'light';
  triggerToast: (msg: string, isWin?: boolean) => void;
}

export default function InviteModal({ isOpen, onClose, currentUser, theme, triggerToast }: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const refCode = currentUser?.fullName || currentUser?.id || 'lucasantiago818';
  const referralLink = `${window.location.origin}/register?ref=${refCode}`;

  const handleCopy = () => {
    try {
      // Standard clipboard copy
      navigator.clipboard.writeText(referralLink);
    } catch (e) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopied(true);
    triggerToast("Referral Link copied to clipboard!", true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulatedInvites = [
    { name: 'Peter Christine', joinDate: 'May 28, 2026', deposit: '$5,000.00', commission: '$2,500.00 (50%)', status: 'Active' },
    { name: 'Sofia Rodriguez', joinDate: 'May 29, 2026', deposit: '$1,200.00', commission: '$600.00 (50%)', status: 'Active' },
    { name: 'Carlos Vance', joinDate: 'May 30, 2026', deposit: '$300.00', commission: '$150.00 (50%)', status: 'Active' },
    { name: 'Miriam Kemunto', joinDate: 'May 31, 2026', deposit: '$0.00', commission: '$0.00', status: 'Pending Verification' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 transition-all backdrop-blur-sm">
      <div className={`w-full max-w-xl rounded-2xl border p-0 shadow-2xl relative overflow-hidden flex flex-col ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-gray-150 text-black'
      }`}>
        
        {/* Banner with design */}
        <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/20 to-amber-500/10 p-6 border-b border-yellow-500/10 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Gift className="w-32 h-32 text-amber-500 animate-pulse" />
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Gift className="h-5 w-5 text-slate-950 font-black animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black tracking-tight text-white">Affiliate Scheme</h2>
                <span className="text-[8px] bg-rose-500 text-white font-black px-1.5 py-0.5 rounded-full uppercase animate-pulse">HOT</span>
              </div>
              <p className="text-[10px] text-amber-500 font-mono uppercase font-bold tracking-widest leading-none mt-1">
                Share & Earn 50% Flat Referral Commissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 rounded-full h-8 w-8 flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'bg-zinc-900/60 text-zinc-400 hover:text-white' : 'bg-white text-gray-400 hover:text-black border border-gray-100'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Main Copy Link Container */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isDark ? 'bg-zinc-900/40 border-zinc-805/40' : 'bg-gray-50/50 border-gray-100'
          }`}>
            <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Your Referral Link</span>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white overflow-x-auto whitespace-nowrap scrollbar-none select-all font-mono">
                {referralLink}
              </div>
              <button 
                onClick={handleCopy}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black px-4 py-2.5 rounded-lg text-xs transition-all flex items-center space-x-1.5 shrink-0"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[9px] text-slate-400 italic">
              *Instant attribution: Any user registering using this link is forever tethered to your commission node.
            </p>
          </div>

          {/* Quick Metrics Bento */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-3.5 rounded-xl border text-center relative overflow-hidden ${
              isDark ? 'bg-zinc-900/25 border-zinc-850' : 'bg-white border-gray-100 shadow-xs'
            }`}>
              <Users className="h-4 w-4 text-amber-500 mx-auto opacity-70 mb-1" />
              <span className="block text-[8px] text-gray-500 font-bold uppercase tracking-wider">Referrals</span>
              <span className="block text-base font-black font-mono mt-0.5 text-white">4</span>
            </div>
            <div className={`p-3.5 rounded-xl border text-center relative overflow-hidden ${
              isDark ? 'bg-zinc-900/25 border-zinc-850' : 'bg-white border-gray-100 shadow-xs'
            }`}>
              <TrendingUp className="h-4 w-4 text-purple-400 mx-auto opacity-70 mb-1" />
              <span className="block text-[8px] text-gray-500 font-bold uppercase tracking-wider">Share Rate</span>
              <span className="block text-base font-black font-mono mt-0.5 text-amber-500">50%</span>
            </div>
            <div className={`p-3.5 rounded-xl border text-center relative overflow-hidden ${
              isDark ? 'bg-zinc-900/25 border-zinc-850' : 'bg-white border-gray-100 shadow-xs'
            }`}>
              <Landmark className="h-4 w-4 text-emerald-500 mx-auto opacity-70 mb-1" />
              <span className="block text-[8px] text-gray-500 font-bold uppercase tracking-wider">Total Earned</span>
              <span className="block text-base font-black font-mono mt-0.5 text-emerald-400">$3,250.00</span>
            </div>
          </div>

          {/* Live Referrals Logs */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-500" />
              <span>Attributed Accounts & Logs</span>
            </h3>

            <div className="border border-slate-900 rounded-lg overflow-hidden bg-slate-950/20">
              <div className="max-h-[160px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-900 text-[9px] uppercase font-bold text-slate-400">
                      <th className="p-2.5">User</th>
                      <th className="p-2.5">Date Joined</th>
                      <th className="p-2.5 text-right">Deposited</th>
                      <th className="p-2.5 text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-[10px] font-mono">
                    {simulatedInvites.map((u, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/20 text-slate-300">
                        <td className="p-2.5 font-sans font-bold text-white flex flex-col">
                          <span>{u.name}</span>
                          <span className={`text-[8px] max-w-max px-1 rounded-sm ${u.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{u.status}</span>
                        </td>
                        <td className="p-2.5 text-slate-400">{u.joinDate}</td>
                        <td className="p-2.5 text-right text-slate-300">{u.deposit}</td>
                        <td className="p-2.5 text-right text-emerald-400 font-extrabold">{u.commission}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Promotion Banner */}
          <div className="rounded-xl border border-dashed border-yellow-500/20 bg-yellow-500/5 p-4 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                <Sparkles className="h-3 h-3 text-amber-400 shrink-0" />
                <span>Double Commissions Booster</span>
              </span>
              <p className="text-[11px] text-slate-300">
                Unlock 60% flat payouts by referring exactly 5 active depositors who trade over 10 options.
              </p>
            </div>
            <button className="bg-amber-500/20 text-amber-400 hover:bg-amber-500 text-[9px] font-black px-3 py-1.5 rounded-md uppercase tracking-wide transition-all select-none shrink-0 border border-amber-500/30">
              Active Tier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
