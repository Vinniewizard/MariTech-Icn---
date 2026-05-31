import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Coins, 
  HelpCircle, 
  History, 
  Moon, 
  Sun, 
  RefreshCw, 
  Laptop, 
  Wallet,
  Settings,
  Lock,
  Box,
  UserCheck
} from 'lucide-react';
import { Account } from '../types';

interface HeaderProps {
  account: Account;
  onSwitchAccount: (mode: 'demo' | 'real') => void;
  onResetDemo: () => void;
  onOpenCashier: () => void;
  onOpenGuide: () => void;
  theme: 'dark' | 'light';
  themeMode?: 'dark' | 'light' | 'auto';
  onToggleTheme: () => void;
  activeView: 'trade' | 'history' | 'stats';
  onSwitchView: (view: 'trade' | 'history' | 'stats') => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenAdmin?: () => void;
  currentUser?: any;
}

export default function Header({
  account,
  onSwitchAccount,
  onResetDemo,
  onOpenCashier,
  onOpenGuide,
  theme,
  themeMode,
  onToggleTheme,
  activeView,
  onSwitchView,
  onOpenSettings,
  onOpenAuth,
  onOpenAdmin,
  currentUser
}: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatBalance = (bal: number) => {
    return bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isDark = theme === 'dark';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 w-full flex flex-col transition-all duration-300 backdrop-blur-md border-b ${
      isDark 
        ? 'border-slate-800 bg-slate-900/90 text-slate-100 shadow-[0_2px_15px_rgba(15,23,42,0.6)]' 
        : 'border-slate-200 bg-white/95 text-slate-800 shadow-[0_2px_15px_rgba(241,245,249,0.8)]'
    }`}>
      
      {/* DECK 1: Brand Logo + Account Switcher + CTA Block (Theme, Cashier, Settings) */}
      <div className="flex h-14 md:h-18 items-center justify-between px-3 sm:px-6 gap-2 w-full max-w-7xl mx-auto">
        
        {/* Logo & Brand Info */}
        <div 
          className="flex items-center space-x-2 cursor-pointer flex-shrink-0 select-none group" 
          onClick={() => onSwitchView('trade')}
        >
          <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            isDark 
              ? 'bg-gradient-to-tr from-yellow-500 to-yellow-400 text-slate-950 shadow-[0_0_12px_rgba(20,184,166,0.3)] group-hover:scale-105' 
              : 'bg-gradient-to-tr from-yellow-500 to-yellow-400 text-white shadow-md'
          }`}>
            <Box className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="flex flex-col">
            <span className={`text-[13px] md:text-base font-black tracking-normal leading-none font-sans ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              LWEX <span className={isDark ? 'text-yellow-400 font-semibold' : 'text-yellow-600 font-semibold'}>exchange</span>
            </span>
          </div>
        </div>

        {/* Dynamic & Smart Account Mode Switcher (Visible & Tactile Toggle) */}
        <div className={`flex items-center p-1 rounded-full transition-all duration-300 shadow-inner ${
          isDark 
            ? 'bg-slate-950 border border-slate-850' 
            : 'bg-slate-100 border border-slate-200'
        } select-none font-sans`}>
          
          {/* Demo account select option */}
          <button
            onClick={() => onSwitchAccount('demo')}
            className={`relative px-2 py-1 md:px-3 md:py-1.5 text-[9px] md:text-xs font-black tracking-wider uppercase transition-all duration-300 rounded-full flex items-center space-x-1 cursor-pointer ${
              account.mode === 'demo'
                ? isDark
                  ? 'bg-yellow-500/15 text-yellow-400 shadow-[0_0_10px_rgba(20,184,166,0.15)] border border-yellow-500/25'
                  : 'bg-white text-emerald-600 shadow-sm border border-emerald-200'
                : 'text-slate-400 hover:text-slate-350 border border-transparent font-medium'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full transition-all flex-shrink-0 ${
              account.mode === 'demo' ? 'bg-yellow-400 animate-pulse shadow-[0_0_6px_#2dd4bf]' : 'bg-slate-500'
            }`} />
            <span>Demo</span>

            {/* Tap to reset Demo balance when active */}
            {account.mode === 'demo' && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onResetDemo();
                }}
                className="ml-1 rounded-full p-0.5 transition-all text-yellow-400 hover:bg-yellow-900/30 hover:text-white"
                title="Replenish Demo Funds to $10,000"
              >
                <RefreshCw className="h-2.5 w-2.5" />
              </span>
            )}
          </button>

          {/* Real account select option */}
          <button
            onClick={() => {
              if (!currentUser && account.mode !== 'real') {
                onOpenAuth();
                return;
              }
              onSwitchAccount('real');
            }}
            className={`relative px-2.5 py-1 md:px-3.5 md:py-1.5 text-[9px] md:text-xs font-black tracking-wider uppercase transition-all duration-300 rounded-full flex items-center space-x-1 cursor-pointer ${
              account.mode === 'real'
                ? isDark
                  ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] border border-amber-500/30'
                  : 'bg-amber-100 text-amber-800 shadow-sm border border-amber-200'
                : 'text-slate-400 hover:text-slate-350 border border-transparent font-medium'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full transition-all flex-shrink-0 ${
              account.mode === 'real' ? 'bg-amber-500 animate-pulse shadow-[0_0_6px_#f59e0b]' : 'bg-slate-500'
            }`} />
            <span>Real</span>
          </button>
        </div>

        {/* Desktop Navigation System (Embedded directly in Top Deck on wider screens) */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-950/20 p-1 rounded-xl border border-slate-700/10">
          {[
            { id: 'trade', label: 'Trader', icon: Coins },
            { id: 'history', label: 'Reports', icon: History }
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSwitchView(tab.id as any)}
                className={`flex items-center space-x-1.5 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                  isActive
                    ? isDark 
                      ? 'bg-slate-800/90 text-yellow-400 border border-yellow-500/20 shadow-[0_0_8px_rgba(20,184,166,0.05)]' 
                      : 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                    : isDark 
                      ? 'text-slate-450 hover:text-white hover:bg-slate-800/30 border border-transparent' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <IconComponent className={`h-3 w-3 ${isActive ? 'text-yellow-400' : 'text-slate-450'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
          
          <button
            onClick={onOpenGuide}
            className={`flex items-center space-x-1.5 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
              isDark 
                ? 'text-slate-450 hover:text-white hover:bg-slate-800/35 border border-transparent' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <HelpCircle className="h-3 w-3 text-yellow-400" />
            <span>Academy</span>
          </button>
        </nav>

        {/* Action Controls & Cashier Trigger */}
        <div className="flex items-center space-x-1 md:space-x-3 flex-shrink-0">
          
          {/* Total Balance block (hidden on mobile top deck, shown alongside subbar or desktop) */}
          <div className="hidden md:flex flex-col justify-center text-right pr-2">
            <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold select-none leading-none mb-0.5">
              {account.mode === 'real' ? 'Real Wallet Balance' : 'Demo Virtual Funds'}
            </span>
            <div className={`text-sm md:text-base font-mono font-black tracking-tight flex items-center justify-end space-x-0.5 ${
              account.mode === 'real' 
                ? isDark ? 'text-amber-400' : 'text-amber-600 font-extrabold'
                : isDark ? 'text-yellow-400' : 'text-emerald-600 font-extrabold'
            }`}>
              {account.mode === 'real' && !currentUser ? (
                <span className="text-[11px] md:text-xs font-sans tracking-tight uppercase" onClick={onOpenAuth} style={{cursor: 'pointer'}}>Login to View</span>
              ) : (
                <>
                  <span className="text-xs font-semibold select-none">$</span>
                  <span>{formatBalance(account.balance)}</span>
                </>
              )}
            </div>
          </div>

          {/* Cashier / Sign In Button */}
          <button
            onClick={() => {
              if (!currentUser) {
                onOpenAuth();
                return;
              }
              onOpenCashier();
            }}
            className={`relative px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[9px] md:text-xs font-extrabold uppercase tracking-widest transition-all duration-250 active:scale-95 shadow-md flex items-center justify-center space-x-1.5 cursor-pointer ${
              currentUser
                ? isDark 
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-slate-950 font-bold hover:opacity-90 shadow-yellow-500/10' 
                  : 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-yellow-600/15'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
            }`}
            title={currentUser ? 'Access deposits & withdrawals' : 'Authentication Required'}
          >
            {currentUser ? (
              <>
                <Wallet className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                <span>Cashier</span>
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                <span>Login</span>
              </>
            )}
          </button>

          {/* Core Controls Group */}
          <div className="flex items-center space-x-0.5 md:space-x-1 border-l pl-1 md:pl-2.5 border-slate-700/10">
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className={`rounded-lg p-1.5 md:p-2 transition-all duration-200 cursor-pointer border flex-shrink-0 ${
                isDark 
                  ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-900' 
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Toggle Layout Colors"
            >
              {themeMode === 'auto' ? (
                <Laptop className="h-3 w-3 md:h-3.5 md:w-3.5 text-yellow-400 animate-pulse" />
              ) : themeMode === 'dark' ? (
                <Moon className="h-3 w-3 md:h-3.5 md:w-3.5 text-yellow-400" />
              ) : (
                <Sun className="h-3 w-3 md:h-3.5 md:w-3.5 text-amber-500" />
              )}
            </button>

            {/* Profile Settings */}
            <button
              onClick={onOpenSettings}
              className={`rounded-lg p-1.5 md:p-2 transition-all duration-200 cursor-pointer border flex-shrink-0 ${
                isDark 
                  ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-900' 
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Personal Preferences"
            >
              <Settings className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </button>

            {/* Admin Guard Console */}
            {currentUser?.email === 'admin@lwex.com' && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="rounded-lg p-1.5 md:p-2 border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/25 animate-pulse cursor-pointer flex-shrink-0"
                title="LWEX Guard Console"
              >
                <ShieldCheck className="h-3 w-3 md:h-3.5 md:w-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* DECK 2: Mobile/Tablet Secondary Action & View Row (Only visible below medium break-width) */}
      <div className={`md:hidden flex h-11 border-t items-center justify-between px-3 w-full max-w-7xl mx-auto backdrop-blur-sm transition-all duration-300 ${
        isDark ? 'border-slate-800 bg-slate-950/45' : 'border-slate-150 bg-slate-50/80'
      }`}>
        <div className="flex items-center space-x-1">
          {/* Quick Active Tabs on Mobile */}
          {[
            { id: 'trade', label: 'Trader', icon: Coins },
            { id: 'history', label: 'Reports', icon: History }
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSwitchView(tab.id as any)}
                className={`flex items-center space-x-1.5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-md transition-all duration-150 cursor-pointer ${
                  isActive
                    ? isDark 
                      ? 'bg-slate-850 text-yellow-400 border border-yellow-500/15' 
                      : 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                    : isDark 
                      ? 'text-slate-400 hover:text-white' 
                      : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <IconComponent className="h-2.5 w-2.5 text-yellow-400" />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <button
            onClick={onOpenGuide}
            className={`flex items-center space-x-1.5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-md transition-all duration-150 cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="h-2.5 w-2.5 text-yellow-400" />
            <span>Academy</span>
          </button>
        </div>

        {/* Highly Visible Mobile Balance Counter */}
        <div className="flex items-center space-x-1 font-mono text-xs font-black">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest hidden min-[360px]:inline">
            {account.mode === 'real' ? 'Real:' : 'Demo:'}
          </span>
          <div className={`px-2 py-0.5 rounded border ${
            account.mode === 'real'
              ? isDark 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                : 'bg-amber-50 border-amber-200 text-amber-700'
              : isDark
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {account.mode === 'real' && !currentUser ? (
              <span className="text-[10px] font-sans tracking-tight uppercase" onClick={onOpenAuth} style={{cursor: 'pointer'}}>Login</span>
            ) : (
              <>
                <span>$</span>
                <span>{formatBalance(account.balance)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
