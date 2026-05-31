import React, { useState } from 'react';
import { Settings, Shield, Bell, User, Key, Globe, X, Crown, Users, Award, Percent, Link } from 'lucide-react';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  triggerToast: (text: string, success: boolean) => void;
}

export default function UserSettingsModal({ isOpen, onClose, theme, triggerToast }: UserSettingsModalProps) {
  const [activeMenu, setActiveMenu] = useState<'profile' | 'security' | 'notifications' | 'vip' | 'affiliate'>('profile');

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast('Copied to clipboard!', true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-[800px] rounded-xl border flex overflow-hidden shadow-2xl relative min-h-[500px] ${
        theme === 'dark' ? 'border-zinc-800 bg-zinc-950 text-white' : 'border-gray-200 bg-white text-black'
      }`}>
        {/* Sidebar */}
        <div className={`w-52 border-r p-4 hidden sm:flex flex-col select-none ${
          theme === 'dark' ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-100 bg-gray-50'
        }`}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-4 px-2 text-gray-500">Settings & Hub</h3>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveMenu('profile')}
              className={`w-full flex items-center space-x-2 px-2 py-2 rounded-md transition-colors ${
                activeMenu === 'profile'
                  ? theme === 'dark' ? 'bg-zinc-800 text-white font-bold' : 'bg-gray-200 text-black font-bold'
                  : theme === 'dark' ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50' : 'text-gray-500 hover:text-black hover:bg-gray-100'
              }`}
            >
              <User className="h-4 w-4" />
              <span className="text-xs">Profile Info</span>
            </button>
            <button
              onClick={() => setActiveMenu('security')}
              className={`w-full flex items-center space-x-2 px-2 py-2 rounded-md transition-colors ${
                activeMenu === 'security'
                  ? theme === 'dark' ? 'bg-zinc-800 text-white font-bold' : 'bg-gray-200 text-black font-bold'
                  : theme === 'dark' ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50' : 'text-gray-500 hover:text-black hover:bg-gray-100'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span className="text-xs">Security & Auth</span>
            </button>
            <button
              onClick={() => setActiveMenu('vip')}
              className={`w-full flex items-center space-x-2 px-2 py-2 rounded-md transition-colors ${
                activeMenu === 'vip'
                  ? theme === 'dark' ? 'bg-amber-500/20 text-amber-500 font-bold' : 'bg-amber-100 text-amber-600 font-bold'
                  : theme === 'dark' ? 'text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10' : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
              }`}
            >
              <Crown className="h-4 w-4" />
              <span className="text-xs">VIP Privileges</span>
            </button>
            <button
              onClick={() => setActiveMenu('affiliate')}
              className={`w-full flex items-center space-x-2 px-2 py-2 rounded-md transition-colors ${
                activeMenu === 'affiliate'
                  ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-500 font-bold' : 'bg-emerald-100 text-emerald-600 font-bold'
                  : theme === 'dark' ? 'text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10' : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <Users className="h-4 w-4" />
              <span className="text-xs">Invite & Earn</span>
            </button>
            <button
              onClick={() => setActiveMenu('notifications')}
              className={`w-full flex items-center space-x-2 px-2 py-2 rounded-md transition-colors ${
                activeMenu === 'notifications'
                  ? theme === 'dark' ? 'bg-zinc-800 text-white font-bold' : 'bg-gray-200 text-black font-bold'
                  : theme === 'dark' ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50' : 'text-gray-500 hover:text-black hover:bg-gray-100'
              }`}
            >
              <Bell className="h-4 w-4" />
              <span className="text-xs">Notifications</span>
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 relative">
          <button
            onClick={onClose}
            className={`absolute right-4 top-4 rounded p-1.5 transition-colors cursor-pointer ${
              theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-black'
            }`}
          >
            <X className="h-4 w-4" />
          </button>

          {activeMenu === 'profile' && (
            <div className="space-y-6 max-w-sm">
               <div>
                 <h2 className="text-lg font-bold tracking-tight">Personal Details</h2>
                 <p className="text-xs text-gray-500">Update your identity and country of residence.</p>
               </div>
               
               <div className="space-y-4">
                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Full Name</label>
                   <input
                     type="text"
                     defaultValue="Guest Investigator"
                     className={`w-full rounded border px-3 py-2 text-sm focus:outline-none ${
                       theme === 'dark' ? 'bg-zinc-900 border-zinc-700 focus:border-white' : 'bg-white border-gray-200 focus:border-black'
                     }`}
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email Address</label>
                   <input
                     type="email"
                     defaultValue="guest@maritech.io"
                     readOnly
                     className={`w-full rounded border px-3 py-2 text-sm opacity-50 cursor-not-allowed ${
                       theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-gray-50 border-gray-200'
                     }`}
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Language & Region</label>
                   <div className="flex space-x-2">
                     <span className={`flex items-center space-x-2 px-3 py-2 border rounded-md text-sm cursor-default ${
                       theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'
                     }`}>
                       <Globe className="h-4 w-4 text-gray-400" />
                       <span>English (UTC)</span>
                     </span>
                   </div>
                 </div>
               </div>
               <button className="rounded bg-black text-white px-4 py-2 text-xs font-bold uppercase hover:bg-gray-900 transition-colors">
                 Save Changes
               </button>
            </div>
          )}

          {activeMenu === 'security' && (
            <div className="space-y-6 max-w-sm">
               <div>
                 <h2 className="text-lg font-bold tracking-tight">Account Security</h2>
                 <p className="text-xs text-gray-500">Manage 2FA, passwords, and active devices.</p>
               </div>

               <div className={`p-4 rounded-lg border ${
                 theme === 'dark' ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50/50'
               }`}>
                 <div className="flex items-start space-x-3">
                   <div className={`p-2 rounded-full ${
                     theme === 'dark' ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-100 text-amber-600'
                   }`}>
                     <Key className="h-5 w-5" />
                   </div>
                   <div>
                     <h4 className="text-sm font-bold">Two-Factor Authentication</h4>
                     <p className={`text-xs mt-1 leading-relaxed ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
                       Not configured. We highly recommend activating Google Authenticator for withdrawal approvals.
                     </p>
                     <button className="mt-3 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-black shadow-sm transition hover:bg-gray-50">
                       Setup 2FA Now
                     </button>
                   </div>
                 </div>
               </div>

               <div>
                 <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Change Password</label>
                 <button className={`w-full text-left rounded border px-3 py-2 text-sm focus:outline-none flex justify-between items-center ${
                   theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-white border-gray-200 text-gray-700'
                 }`}>
                   <span>•••••••••••••</span>
                   <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Update</span>
                 </button>
               </div>
            </div>
          )}

          {activeMenu === 'notifications' && (
             <div className="space-y-6 max-w-sm">
               <div>
                 <h2 className="text-lg font-bold tracking-tight">Alert Preferences</h2>
                 <p className="text-xs text-gray-500">Configure email and platform alerts.</p>
               </div>

               <div className="space-y-4">
                 {[
                   { id: 1, title: 'Trade Executions', desc: 'Alerts when orders are successfully filled.' },
                   { id: 2, title: 'Margin & Liquidation risk', desc: 'Critical alerts relative to boundary conditions.' },
                   { id: 3, title: 'System Maintainance', desc: 'Updates regarding scheduled downtime.' }
                 ].map(ns => (
                   <div key={ns.id} className="flex items-center justify-between">
                     <div>
                       <div className="text-sm font-bold">{ns.title}</div>
                       <div className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>{ns.desc}</div>
                     </div>
                     <div className="w-10 h-5 bg-green-500 rounded-full relative cursor-pointer shadow-inner">
                       <div className="absolute right-1 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}

          {activeMenu === 'vip' && (
             <div className="space-y-6 max-w-sm">
               <div>
                 <h2 className="text-lg font-bold tracking-tight text-amber-500 flex items-center gap-1.5"><Crown className="h-5 w-5" /> VIP Status</h2>
                 <p className="text-xs text-gray-500">Your trading volume unlocks exclusive benefits.</p>
               </div>

               <div className={`p-4 rounded-xl border relative overflow-hidden ${
                 theme === 'dark' ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-zinc-900' : 'border-amber-200 bg-gradient-to-br from-amber-50 to-white'
               }`}>
                 <div className="flex justify-between items-end relative z-10">
                   <div>
                     <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Current Tier</div>
                     <div className="text-2xl font-black text-amber-500 font-sans tracking-tighter">BRONZE_</div>
                   </div>
                   <div className="text-right">
                     <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Next Tier Volume</div>
                     <div className="text-xs font-mono font-bold">$10,000 req.</div>
                   </div>
                 </div>
                 
                 <div className="w-full bg-gray-200/50 rounded-full h-1.5 mt-4 overflow-hidden">
                   <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '15%' }}></div>
                 </div>
                 
                 <div className="mt-4 pt-4 border-t border-amber-500/10 space-y-2">
                   <div className="flex justify-between text-xs font-bold">
                     <span className="flex items-center gap-1"><Award className="h-3 w-3 text-amber-500"/> Trade Rebate</span>
                     <span>0.02%</span>
                   </div>
                   <div className="flex justify-between text-xs font-bold">
                     <span className="flex items-center gap-1"><Percent className="h-3 w-3 text-amber-500"/> Withdrawal Fee</span>
                     <span>Standard</span>
                   </div>
                 </div>
               </div>
             </div>
          )}

          {activeMenu === 'affiliate' && (
             <div className="space-y-6 w-full max-w-md">
               <div>
                 <h2 className="text-lg font-bold tracking-tight text-emerald-500 flex items-center gap-1.5"><Users className="h-5 w-5" /> Affiliate Hub</h2>
                 <p className="text-xs text-gray-500">Invite traders and earn up to 40% commission on fees.</p>
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-gray-50'}`}>
                   <div className="text-[9px] uppercase font-bold text-gray-500 mb-1">Active Referrals</div>
                   <div className="text-xl font-black font-mono">0</div>
                 </div>
                 <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'}`}>
                   <div className="text-[9px] uppercase font-bold text-emerald-600 mb-1">Earned Commission</div>
                   <div className="text-xl font-black font-mono text-emerald-500">$0.00</div>
                 </div>
               </div>

               <div>
                 <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Your Referral Link</label>
                 <div className="flex items-center space-x-2">
                   <input
                     type="text"
                     readOnly
                     value="https://trade.maritech.io/ref=USER_19xA2"
                     className={`w-full rounded border px-3 py-2 text-xs font-mono font-bold focus:outline-none ${
                       theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-white border-gray-200 text-gray-700'
                     }`}
                   />
                   <button
                     onClick={() => copyToClipboard('https://trade.maritech.io/ref=USER_19xA2')}
                     className="p-2 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer"
                   >
                     <Link className="h-4 w-4" />
                   </button>
                 </div>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
