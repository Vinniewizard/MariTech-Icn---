import React, { useState, useEffect, useRef } from 'react';
import Chart from './components/Chart';
import TradeControls from './components/TradeControls';
import PositionsList from './components/PositionsList';
import WizardBot from './components/WizardBot';
import CashierModal from './components/CashierModal';
import GuideModal from './components/GuideModal';
import SettingsModal from './components/SettingsModal';
import InviteModal from './components/InviteModal';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import PriceAlertsManager from './components/PriceAlertsManager';
import { ASSETSList } from './data';
import { Asset, Tick, Contract, TradeHistoryItem, Account, IndicatorConfig, ContractType, PriceAlert } from './types';
import { 
  Bot, 
  HelpCircle, 
  RefreshCw, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Volume2, 
  VolumeX,
  LayoutDashboard,
  Globe,
  Wallet,
  Briefcase,
  FileText,
  BadgeAlert,
  Star,
  Users,
  PieChart,
  Shield,
  Settings,
  Menu,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  CheckCircle,
  Info,
  DollarSign,
  Activity,
  Sun,
  Moon
} from 'lucide-react';

// Initialize asset history with realistic price walk
function initializeAssetHistory(assets: Asset[]): Record<string, Tick[]> {
  const initialHistory: Record<string, Tick[]> = {};
  const baseTime = Date.now();

  assets.forEach((asset) => {
    let currentPrice = asset.price;
    const tickHistory: Tick[] = [];

    // Prepopulate 120 historic ticks per index asset
    for (let i = 120; i >= 0; i--) {
      const walkFactor = (Math.random() - 0.5 + asset.trendBias) * 1.5;
      currentPrice = currentPrice * (1 + walkFactor * (asset.volatility / 100));
      tickHistory.push({
        time: baseTime - i * 1200,
        price: currentPrice
      });
    }
    initialHistory[asset.id] = tickHistory;
  });

  return initialHistory;
}

export default function App() {
  // Theme state: support dark, light, auto modes (Default dark to match the screenshot!)
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'auto'>('dark');

  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // safe default
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const theme = themeMode === 'auto' ? systemTheme : themeMode;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    }
  }, [theme]);

  // Account states: Pre-loaded with lucasantiago818 on first visit
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const isLoggedOut = localStorage.getItem('lwex_logged_out') === 'true';
    if (isLoggedOut) return null;
    const saved = localStorage.getItem('lwex_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse current user from storage', e);
      }
    }
    // Default user on first load
    return {
      id: "lucasantiago_default",
      email: "lucasantiago818@gmail.com",
      fullName: "lucasantiago818",
      phone: "+254712345678",
      country: "Kenya",
      balance: 25678.91,
      accountType: "demo",
      forceOutcome: "",
      profitTarget: 0.00,
      maxWinLimit: 0.00,
      maxLossLimit: 0.00
    };
  });

  const [account, setAccount] = useState<Account>(() => {
    const saved = localStorage.getItem('lwex_account');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse account from storage', e);
      }
    }
    // Match the pre-loaded lucasantiago818 default balance if there was no saved session
    return {
      mode: 'demo',
      balance: 25678.91,
      currency: 'USD',
      id: 'm-ac-lucasantiago_default'
    };
  });

  const [realAccountBalance, setRealAccountBalance] = useState<number>(() => {
    const saved = localStorage.getItem('lwex_real_balance');
    return saved !== null ? Number(saved) : 0.00;
  });

  // Keep track of asset selector state
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);

  // Sync account and balance when currentUser changes (Login/Logout event)
  useEffect(() => {
    if (currentUser) {
      const userBalance = Number(currentUser.balance) ?? 0.00;
      const isDemo = currentUser.accountType === 'demo';
      setAccount(prev => ({
        ...prev,
        mode: isDemo ? 'demo' : 'real',
        balance: userBalance,
        id: `m-ac-${currentUser.id}`
      }));
      if (!isDemo) {
        setRealAccountBalance(userBalance);
      }
    } else {
      // Logged out: fallback to demo mode with demo wallet balance
      setAccount(prev => ({
        ...prev,
        mode: 'demo',
        balance: 10000.00,
        id: 'demo-temp-acc'
      }));
      setRealAccountBalance(0.00);
    }
  }, [currentUser]);

  // Layout states
  const [activeTabView, setActiveTabView] = useState<'trade' | 'history' | 'stats'>('trade');
  const [positionsTab, setPositionsTab] = useState<'positions' | 'statements' | 'stats'>('positions');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [starredMarkets, setStarredMarkets] = useState<string[]>(['R_100', 'R_75', 'R_10', 'EURUSD']);
  const [marketSearchText, setMarketSearchText] = useState('');
  const [selectedMarketTab, setSelectedMarketTab] = useState<'usdt' | 'btc' | 'indices' | 'favorites'>('indices');
  const [newsDetail, setNewsDetail] = useState<any>(null);

  // Asset configurations
  const [activeAsset, setActiveAsset] = useState<Asset>(() => {
    // Try to start on a major crypto asset or falls back
    const btc = ASSETSList.find(a => a.symbol.includes('BTC') || a.id.includes('BTC'));
    return btc || ASSETSList[0];
  });
  const [assetsRegistry, setAssetsRegistry] = useState<Asset[]>(ASSETSList);
  const [assetsTicksMap, setAssetsTicksMap] = useState<Record<string, Tick[]>>(() =>
    initializeAssetHistory(ASSETSList)
  );

  // Indicator Settings
  const [indicatorConfig, setIndicatorConfig] = useState<IndicatorConfig>({
    sma: { enabled: true, period: 10 },
    ema: { enabled: false, period: 20 },
    rsi: { enabled: true, period: 10 }
  });

  const [chartType, setChartType] = useState<'line' | 'candles'>('candles');

  // Contracts & History Log portfolios
  const [activeContracts, setActiveContracts] = useState<Contract[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>(() => {
    const saved = localStorage.getItem('lwex_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse history from localStorage', e);
      }
    }
    return [];
  });

  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem('lwex_price_alerts');
    return saved ? JSON.parse(saved) : [];
  });

  // Limit/Market Trade inputs
  const [spotPriceLimit, setSpotPriceLimit] = useState<number>(activeAsset.price);
  const [spotType, setSpotType] = useState<'limit' | 'market'>('limit');
  const [spotAmount, setSpotAmount] = useState<string>('0.05');
  const [spotDuration, setSpotDuration] = useState<number>(5);
  const [spotDurationUnit, setSpotDurationUnit] = useState<'ticks' | 'seconds' | 'minutes'>('seconds');

  // Sync limit input on active asset swaps
  useEffect(() => {
    setSpotPriceLimit(activeAsset.price);
  }, [activeAsset]);

  const [gameSettings, setGameSettings] = useState<{
    globalTrendBias: number;
    volatilityMultiplier: number;
    forceOutcome?: 'win' | 'loss';
    realWinRate?: number;
    paybillEnabled?: boolean;
    btcEnabled?: boolean;
    minDeposit?: number;
    minWithdrawal?: number;
    cashoutMode?: 'enabled' | 'disabled' | 'smart';
  }>({
    globalTrendBias: 0,
    volatilityMultiplier: 1,
    realWinRate: 30,
    paybillEnabled: true,
    btcEnabled: true,
    minDeposit: 1,
    minWithdrawal: 10,
    cashoutMode: 'enabled'
  });

  const gameSettingsRef = useRef(gameSettings);

  useEffect(() => {
    gameSettingsRef.current = gameSettings;
  }, [gameSettings]);

  const activeContractsRef = useRef(activeContracts);
  useEffect(() => {
    activeContractsRef.current = activeContracts;
  }, [activeContracts]);

  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('lwex_account', JSON.stringify(account));
    localStorage.setItem('lwex_history', JSON.stringify(tradeHistory));
    localStorage.setItem('lwex_real_balance', String(realAccountBalance));
    localStorage.setItem('lwex_price_alerts', JSON.stringify(priceAlerts));
    if (currentUser) {
      localStorage.setItem('lwex_current_user', JSON.stringify(currentUser));
      localStorage.removeItem('lwex_logged_out');
    } else {
      localStorage.removeItem('lwex_current_user');
      localStorage.setItem('lwex_logged_out', 'true');
    }
  }, [account, tradeHistory, realAccountBalance, currentUser, priceAlerts]);

  // Modals & Panels Switches
  const [isCashierOpen, setIsCashierOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [authModalInitialView, setAuthModalInitialView] = useState<'login' | 'register'>('login');
  
  const handleTriggerAuth = (view: 'login' | 'register') => {
    setAuthModalInitialView(view);
    setIsAuthOpen(true);
  };

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [cashierDefaultTab, setCashierDefaultTab] = useState<'deposit' | 'withdraw'>('deposit');

  // Notifications states
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; time: string; type: string; read: boolean }>>([
    { id: 'n-1', text: '🎁 Double Bonus deposit campaign is now active for VIP members.', time: '10m ago', type: 'system', read: false },
    { id: 'n-2', text: '🔔 Price Alert: BTC/USDT crossed above $95,000.', time: '1h ago', type: 'alert', read: false },
    { id: 'n-3', text: '📈 ETH/USDT daily change exceeded breakout threshold of 8.5%.', time: '4h ago', type: 'market', read: false },
    { id: 'n-4', text: '🔒 Security Note: Login detected from device Chrome/OSX.', time: '1d ago', type: 'security', read: true },
    { id: 'n-5', text: '💰 Rebate Disbursed: Affiliate referral balance updated (+32.50 USDT).', time: '1d ago', type: 'financial', read: true },
  ]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Synchronise route path to open Secure Admin login page instantly
  useEffect(() => {
    const handlePathCheck = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/secure-admin' || path === '/secure-admin/' || path.endsWith('/secure-admin') || path.endsWith('/secure-admin/')) {
        setIsAdminOpen(true);
      }
    };
    handlePathCheck();
    window.addEventListener('popstate', handlePathCheck);
    return () => window.removeEventListener('popstate', handlePathCheck);
  }, []);

  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Fetch Game Settings periodically
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const userIdParam = currentUser ? `?userId=${currentUser.id}` : '';
        const res = await fetch(`/api/settings/game${userIdParam}`);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        const data = await res.json();
        if (data && data.success) {
          setGameSettings(data.settings);
          if (data.userOverride) {
            setCurrentUser(prevUser => {
              if (!prevUser) return null;
              const updated = {
                ...prevUser,
                forceOutcome: data.userOverride.forceOutcome,
                profitTarget: data.userOverride.profitTarget,
                maxWinLimit: data.userOverride.maxWinLimit,
                maxLossLimit: data.userOverride.maxLossLimit
              };
              localStorage.setItem('lwex_current_user', JSON.stringify(updated));
              return updated;
            });
            
            setAccount(prevAcc => {
              const freshBalance = prevAcc.mode === 'real' ? data.userOverride.realBalance : data.userOverride.demoBalance;
              if (prevAcc.balance !== freshBalance) {
                return { ...prevAcc, balance: freshBalance };
              }
              return prevAcc;
            });
          }
        }
      } catch (err) {
        // console.error('Failed to fetch game settings:', err);
      }
    };

    fetchSettings();
    const interval = setInterval(fetchSettings, 5000); // sync every 5s

    // Secret keyboard listener for Admin Dashboard (Alt + A)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'a') {
        setIsAdminOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Floating notifications / toaster logs
  const [visualNotice, setVisualNotice] = useState<{ id: string; text: string; success: boolean } | null>(null);

  const triggerToast = (text: string, success: boolean) => {
    const id = Math.random().toString();
    setVisualNotice({ id, text, success });
    setTimeout(() => {
      setVisualNotice((prev) => (prev?.id === id ? null : prev));
    }, 4500);

    // Dynamic notification feed push
    setNotifications((prev) => [
      {
        id: `n-${Math.random().toString(36).substring(2, 9)}`,
        text,
        time: 'Just now',
        type: success ? 'success' : 'notice',
        read: false
      },
      ...prev
    ]);

    // Audio indicators if toggled
    if (soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (success) {
          // Harmonious Win code
          osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
          osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
          osc.type = 'triangle';
          gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        } else {
          // Melancholy Loss code
          osc.frequency.setValueAtTime(311.13, audioCtx.currentTime); // E-flat4
          osc.frequency.setValueAtTime(220.00, audioCtx.currentTime + 0.15); // A3
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        }
      } catch (e) {
        console.warn('Simulated audio synthesize failed.', e);
      }
    }
  };

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain1.gain.setValueAtTime(0, audioCtx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.4);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.12); // E6
      gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.12);
      gain2.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.17);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.12);
      osc2.stop(audioCtx.currentTime + 0.55);
    } catch (e) {
      console.warn('Web Audio API chime failed.', e);
    }
  };

  // Monitor price alerts in real time whenever asset prices walk
  useEffect(() => {
    priceAlerts.forEach((alert) => {
      if (alert.isTriggered) return;

      const ticks = assetsTicksMap[alert.assetId] || [];
      if (ticks.length === 0) return;

      const latestPrice = ticks[ticks.length - 1].price;
      const hitAbove = alert.condition === 'above' && latestPrice >= alert.targetPrice;
      const hitBelow = alert.condition === 'below' && latestPrice <= alert.targetPrice;

      if (hitAbove || hitBelow) {
        setPriceAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? { ...a, isTriggered: true } : a))
        );

        const assetItem = assetsRegistry.find((a) => a.id === alert.assetId) || activeAsset;
        const decimals = assetItem.decimals ?? 2;

        triggerToast(
          `🔔 ALERT: ${alert.assetSymbol} reached target of ${alert.targetPrice.toFixed(decimals)}! Current Spot: ${latestPrice.toFixed(decimals)}.`,
          true
        );

        playAlertSound();
      }
    });
  }, [assetsTicksMap, priceAlerts, assetsRegistry, activeAsset]);

  const handleAddPriceAlert = (targetPrice: number, condition: 'above' | 'below') => {
    const newAlert: PriceAlert = {
      id: `pa-${Math.random().toString(36).substring(2, 10)}`,
      assetId: activeAsset.id,
      assetSymbol: activeAsset.symbol,
      targetPrice,
      condition,
      isTriggered: false,
      createdAt: Date.now()
    };
    setPriceAlerts((prev) => [newAlert, ...prev]);
    triggerToast(`Custom price alert registered for ${activeAsset.symbol} at ${targetPrice.toFixed(activeAsset.decimals)}.`, true);
  };

  const handleDeletePriceAlert = (id: string) => {
    setPriceAlerts((prev) => prev.filter((a) => a.id !== id));
    triggerToast("Price alert cancelled.", true);
  };

  // Switch Theme selector
  const handleToggleTheme = () => {
    let nextMode: 'dark' | 'light' | 'auto';
    if (themeMode === 'dark') {
      nextMode = 'light';
    } else {
      nextMode = 'dark';
    }
    setThemeMode(nextMode);
    triggerToast(`Theme preference updated to ${nextMode.toUpperCase()}.`, true);
  };

  // Switchees Demowrithe wallets
  const handleSwitchAccount = (mode: 'demo' | 'real') => {
    if (mode === account.mode) return;
    setAccount((prev) => {
      const oldBalance = prev.balance;
      const targetBal = prev.mode === 'demo' ? oldBalance : account.balance;

      if (prev.mode === 'demo') {
        // Save demo balance, load real
        return { ...prev, mode: 'real', balance: realAccountBalance };
      } else {
        // Save real balance, load saved state or preset
        setRealAccountBalance(oldBalance);
        return { ...prev, mode: 'demo', balance: prev.balance === 0 ? 10000.00 : prev.balance };
      }
    });
    triggerToast(`Switched workspace to ${mode.toUpperCase()} wallet mode.`, true);
  };

  // Reset demo tokens
  const handleResetDemoBalance = () => {
    if (account.mode !== 'demo') return;
    setAccount((prev) => ({ ...prev, balance: 10000.00 }));
    triggerToast("Your demo trade bag has been replenished with virtual $10,000.00!", true);
  };

  // Credit balance after server-side cashier verification
  const handleDepositCashier = (amount: number) => {
    setAccount((prev) => {
      const nextBal = prev.balance + amount;
      if (prev.mode === 'real') {
        setRealAccountBalance(nextBal);
      }
      return { ...prev, balance: nextBal };
    });
    triggerToast(`Deposited $${amount.toLocaleString()} into portfolio index.`, true);
  };

  // Debit balance after server-side cashier dispatch
  const handleWithdrawCashier = (amount: number) => {
    setAccount((prev) => {
      const nextBal = Math.max(0, prev.balance - amount);
      if (prev.mode === 'real') {
        setRealAccountBalance(nextBal);
      }
      return { ...prev, balance: nextBal };
    });
    triggerToast(`Withdrew $${amount.toLocaleString()} from portfolio cash.`, true);
  };

  // Indicator Switch Toggles
  const handleToggleIndicator = (type: 'sma' | 'ema' | 'rsi') => {
    setIndicatorConfig((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled }
    }));
  };

  // Core background ticker generator loop
  useEffect(() => {
    const loopInterval = setInterval(() => {
      const now = Date.now();
      const nextPricesMap: Record<string, number> = {};

      setAssetsTicksMap((prevTicksMap) => {
        const nextTicksMap = { ...prevTicksMap };

        ASSETSList.forEach((asset) => {
          const currentHistory = prevTicksMap[asset.id] || [];
          if (currentHistory.length === 0) return;

          const lastTick = currentHistory[currentHistory.length - 1];

          // Brownian walk step with asset drift bias + Global admin bias
          let dynamicBias = 0;

          // Process active contracts for user win-rate control
          const activeForAsset = activeContractsRef.current.filter(c => c.assetSymbol === asset.symbol && c.status === 'active');
          if (activeForAsset.length > 0) {
            const contract = activeForAsset[0];
            const isWinnerSelected = Math.random();
            let winRate = 0;
            if (accountRef.current.mode === 'demo') {
              winRate = 0.90; // 90%
            } else {
              // Real probability controlled by admin. Let's say we get it from gameSettingsRef or default 0.30
              winRate = (gameSettingsRef.current as any).realWinRate !== undefined ? (gameSettingsRef.current as any).realWinRate / 100 : 0.30;
            }

            if (isWinnerSelected <= winRate) {
              // We want a win! Bias heavily in direction of contract
              dynamicBias = (contract.direction === 'rise' || contract.direction === 'higher') ? 0.3 : -0.3;
            } else {
              // We want a loss! Bias heavily in opposite direction
              dynamicBias = (contract.direction === 'rise' || contract.direction === 'higher') ? -0.3 : 0.3;
            }
          }

          const totalBias = asset.trendBias + (gameSettingsRef.current.globalTrendBias || 0) + dynamicBias;
          const walkFactor = (Math.random() - 0.5 + totalBias) * 1.5;
          const nextPrice = lastTick.price * (1 + walkFactor * (asset.volatility * (gameSettingsRef.current.volatilityMultiplier || 1) / 100));

          nextPricesMap[asset.id] = nextPrice;

          const newTick: Tick = { time: now, price: nextPrice };
          nextTicksMap[asset.id] = [...currentHistory.slice(-300), newTick];
        });

        return nextTicksMap;
      });

      // Sync floating base price on the registry
      setAssetsRegistry((prevReg) =>
        prevReg.map((item) => {
          const nextPrice = nextPricesMap[item.id];
          if (nextPrice === undefined) return item;
          const lastPrice = item.price;
          return {
            ...item,
            price: nextPrice,
            change: lastPrice ? ((nextPrice - lastPrice) / lastPrice) * 100 : item.change
          };
        })
      );

      // Update active contract metrics on the ticking target safely in ONE sweep
      setActiveContracts((prevContracts) => {
        if (prevContracts.length === 0) return prevContracts;

        let balanceDelta = 0;
        const newHistoryItems: TradeHistoryItem[] = [];

        const updated = prevContracts.map((contract) => {
          const nextPrice = nextPricesMap[contract.assetId];
          if (nextPrice === undefined || contract.status !== 'active') return contract;

          const ticksPassed = contract.ticksPassed + 1;
          
          let totalDurationInSeconds = contract.duration;
          if (contract.durationUnit === 'minutes') {
            totalDurationInSeconds = contract.duration * 60;
          } else if (contract.durationUnit === 'ticks') {
            totalDurationInSeconds = contract.duration; // 1 tick = 1 second
          }
          
          const isExpired = ticksPassed >= totalDurationInSeconds;

          // Proximity checks for profit
          let currentProfit = 0;
          let status: 'active' | 'won' | 'lost' = 'active';

          // Determine Barrier levels
          const actualBarrier = contract.barrier || contract.entryPrice;

          if (contract.type === 'rise-fall') {
            const goingUp = contract.direction === 'rise';
            if (goingUp) {
              currentProfit = nextPrice > contract.entryPrice ? contract.stake * 0.955 : -contract.stake;
            } else {
              currentProfit = nextPrice < contract.entryPrice ? contract.stake * 0.955 : -contract.stake;
            }
          } else if (contract.type === 'higher-lower') {
            const isHigher = contract.direction === 'higher';
            if (isHigher) {
              currentProfit = nextPrice > actualBarrier ? contract.stake * 0.955 : -contract.stake;
            } else {
              currentProfit = nextPrice < actualBarrier ? contract.stake * 0.955 : -contract.stake;
            }
          } else if (contract.type === 'touch-no-touch') {
            const isTouch = contract.direction === 'touch';
            const hasTouched = isTouch
              ? nextPrice >= actualBarrier
              : nextPrice < actualBarrier;

            if (isTouch) {
              if (hasTouched) {
                currentProfit = contract.stake * 0.955;
                status = 'won';
              } else {
                currentProfit = -contract.stake;
              }
            } else {
              if (!hasTouched) {
                currentProfit = -contract.stake;
                status = 'lost';
              } else {
                currentProfit = contract.stake * 0.955;
              }
            }
          } else if (contract.type === 'digit-over-under') {
            const decimals = contract.assetSymbol.includes('MFLOW') ? 4 : 2;
            const lastDigit = parseInt(nextPrice.toFixed(decimals).split('').pop() || '0');
            const isOver = contract.direction === 'over';
            const success = isOver 
              ? lastDigit > (contract.targetDigit || 0)
              : lastDigit < (contract.targetDigit || 0);
            
            currentProfit = success ? contract.stake * 0.90 : -contract.stake;
          }

          if (isExpired || status !== 'active') {
            let finalStatus = status !== 'active' ? status : (currentProfit >= 0 ? 'won' : 'lost');
            
            // Admin Override
            let force = currentUser?.forceOutcome || gameSettingsRef.current.forceOutcome;
            
            // Profit Target override: if user's real balance exceeds target, force loss
            if (accountRef.current.mode === 'real' && currentUser?.profitTarget > 0 && realAccountBalance >= currentUser?.profitTarget) {
               force = 'loss';
            }

            if (force === 'win') finalStatus = 'won';
            if (force === 'loss') finalStatus = 'lost';

            // Settlement math after trade closes/finishes (User feedback)
            const isWon = finalStatus === 'won';
            let netProfit = isWon ? (contract.payout - contract.stake) : -contract.stake;

            // Apply Admin win limits
            if (isWon && currentUser?.maxWinLimit && currentUser.maxWinLimit > 0 && netProfit > currentUser.maxWinLimit) {
              netProfit = currentUser.maxWinLimit;
              setTimeout(() => {
                triggerToast(`Win capped at maximum allowed Single Trade Limit of $${currentUser.maxWinLimit?.toFixed(2)}`, false);
              }, 400);
            }

            // Apply Admin loss limits
            if (!isWon && currentUser?.maxLossLimit && currentUser.maxLossLimit > 0 && Math.abs(netProfit) > currentUser.maxLossLimit) {
              netProfit = -currentUser.maxLossLimit;
              setTimeout(() => {
                triggerToast(`Loss subsidized: Capped at maximum allowed Single Trade Limit of $${currentUser.maxLossLimit?.toFixed(2)}`, true);
              }, 400);
            }

            const finalPayout = contract.stake + netProfit;
            balanceDelta += netProfit;

            newHistoryItems.push({
              id: contract.id,
              assetName: contract.assetName,
              assetSymbol: contract.assetSymbol,
              type: contract.type,
              direction: contract.direction,
              stake: contract.stake,
              payout: finalPayout,
              profit: netProfit,
              status: finalStatus,
              entryPrice: contract.entryPrice,
              exitPrice: nextPrice,
              purchaseTime: contract.entryTime
            });

            const hasWon = finalStatus === 'won';
            triggerToast(
              hasWon
                ? `Contract Succeeded! Cleared profit +$${netProfit.toFixed(2)} on ${contract.assetSymbol}.`
                : `Contract Expired. Loss -$${Math.abs(netProfit).toFixed(2)} on ${contract.assetSymbol}.`,
              hasWon
            );

            return null as any;
          }

          const ratioRemaining = (totalDurationInSeconds - ticksPassed) / totalDurationInSeconds;
          const baseSell = contract.stake * 0.90;
          const sellPrice = currentProfit >= 0
            ? baseSell + currentProfit * (1 - ratioRemaining * 0.4)
            : Math.max(contract.stake * 0.15, baseSell * ratioRemaining);

          return {
            ...contract,
            currentPrice: nextPrice,
            currentProfit,
            ticksPassed,
            sellPrice,
            ticksHistory: [...contract.ticksHistory, { time: now, price: nextPrice }]
          };
        }).filter(Boolean);

        if (balanceDelta !== 0) {
          setAccount((prevAcc) => ({ ...prevAcc, balance: prevAcc.balance + balanceDelta }));
        }

        if (newHistoryItems.length > 0) {
          setTradeHistory((prevHistory) => {
            const filteredNew = newHistoryItems.filter(item => !prevHistory.some(h => h.id === item.id));
            if (filteredNew.length === 0) return prevHistory;
            return [...prevHistory, ...filteredNew];
          });
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(loopInterval);
  }, []);

  const handlePurchaseContract = (config: {
    type: ContractType;
    direction: any;
    stake: number;
    duration: number;
    durationUnit: 'ticks' | 'seconds' | 'minutes';
    barrierOffset?: number;
    targetDigit?: number;
  }) => {
    // Standard balances verification using Free Margin (User feedback)
    const activeStakes = activeContracts.reduce((sum, c) => sum + c.stake, 0);
    const freeBal = account.balance - activeStakes;
    if (freeBal < config.stake) {
      triggerToast("Transaction Rejected: Insufficient available funds after open positions.", false);
      return;
    }

    const currentTickHistory = assetsTicksMap[activeAsset.id] || [];
    const latestPrice = currentTickHistory[currentTickHistory.length - 1]?.price || activeAsset.price;

    const payoutRate = 0.955;
    const targetPayout = config.stake * (1 + payoutRate);

    // Compute Barrier level if offset is provided
    let barrier: number | undefined;
    if (config.barrierOffset) {
      const isUpDir = config.direction === 'rise' || config.direction === 'higher' || config.direction === 'touch';
      barrier = isUpDir ? latestPrice + config.barrierOffset : latestPrice - config.barrierOffset;
    }

    const newContract: Contract = {
      id: `mt-${Math.random().toString(36).substring(2, 12)}`,
      assetId: activeAsset.id,
      assetName: activeAsset.name,
      assetSymbol: activeAsset.symbol,
      type: config.type,
      direction: config.direction,
      stake: config.stake,
      payout: targetPayout,
      basis: 'stake',
      barrier,
      barrierOffset: config.barrierOffset,
      entryPrice: latestPrice,
      entryTime: Date.now(),
      duration: config.duration,
      durationUnit: config.durationUnit,
      expiryTime: Date.now() + config.duration * 1000,
      status: 'active',
      currentPrice: latestPrice,
      currentProfit: 0,
      sellPrice: config.stake * 0.85,
      targetDigit: config.targetDigit,
      ticksPassed: 0,
      ticksHistory: [{ time: Date.now(), price: latestPrice }]
    };

    setActiveContracts((prev) => [...prev, newContract]);

    triggerToast(`Options Contract secured: Purchased ${config.direction.toUpperCase()} on ${activeAsset.symbol}.`, true);
  };

  const handleSellContractEarly = (contractId: string) => {
    const contract = activeContracts.find((c) => c.id === contractId);
    if (!contract || contract.status !== 'active') return;

    const refund = contract.sellPrice || contract.stake * 0.5;
    const netProfit = refund - contract.stake;

    setAccount((prevAcc) => ({ ...prevAcc, balance: prevAcc.balance + netProfit }));

    setTradeHistory((prevHistory) => {
      if (prevHistory.some((h) => h.id === contract.id)) return prevHistory;
      return [
        ...prevHistory,
        {
          id: contract.id,
          assetName: contract.assetName,
          assetSymbol: contract.assetSymbol,
          type: contract.type,
          direction: contract.direction,
          stake: contract.stake,
          payout: refund,
          profit: refund - contract.stake,
          status: 'sold',
          entryPrice: contract.entryPrice,
          exitPrice: contract.currentPrice,
          purchaseTime: contract.entryTime
        }
      ];
    });

    setActiveContracts((prev) => prev.filter((c) => c.id !== contractId));
    triggerToast(`Contract liquidated early for $${refund.toFixed(2)} refund.`, true);
  };

  const handleSwitchView = (view: 'trade' | 'history' | 'stats') => {
    setActiveTabView(view);
    if (view === 'history') setPositionsTab('statements');
    else if (view === 'stats') setPositionsTab('stats');
    else setPositionsTab('positions');
  };

  const handlePositionsTabChange = (tab: 'positions' | 'statements' | 'stats') => {
    setPositionsTab(tab);
    if (tab === 'positions') setActiveTabView('trade');
    else if (tab === 'statements') setActiveTabView('history');
    else setActiveTabView('stats');
  };

  const handleOpenCashierWithTab = (tab: 'deposit' | 'withdraw') => {
    if (!currentUser) {
      triggerToast("Authentication required. Please login or register to access the cashier.", false);
      setIsAuthOpen(true);
      return;
    }
    setCashierDefaultTab(tab);
    setIsCashierOpen(true);
  };

  const toggleStarMarket = (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (starredMarkets.includes(assetId)) {
      setStarredMarkets(prev => prev.filter(id => id !== assetId));
    } else {
      setStarredMarkets(prev => [...prev, assetId]);
    }
  };

  const executeSpotTrade = (direction: 'buy' | 'sell') => {
    const amountNum = parseFloat(spotAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      triggerToast("Please input a valid trade amount.", false);
      return;
    }

    const calculatedStake = activeAsset.price * amountNum;
    
    // Check against available/free balance since stake is settled on completion
    const activeStakesValue = activeContracts.reduce((sum, c) => sum + c.stake, 0);
    const freeBalVal = account.balance - activeStakesValue;
    
    if (freeBalVal < calculatedStake) {
      triggerToast("Transaction Rejected: Insufficient USD funds available.", false);
      return;
    }

    handleAddPriceAlert(activeAsset.price, 'above');

    // Simulate buying options using the Spot Panel inputs seamlessly with custom duration settings
    handlePurchaseContract({
      type: 'rise-fall',
      direction: direction === 'buy' ? 'rise' : 'fall',
      stake: Math.max(10, calculatedStake),
      duration: spotDuration,
      durationUnit: spotDurationUnit
    });
  };

  const handlePresetPercentage = (percentage: number) => {
    // Allocation based on Available balance instead of raw balance
    const activeStakesValue = activeContracts.reduce((sum, c) => sum + c.stake, 0);
    const freeBalVal = account.balance - activeStakesValue;
    const alloc = (freeBalVal * (percentage / 100)) / activeAsset.price;
    setSpotAmount(alloc.toFixed(activeAsset.decimals > 2 ? 4 : 2));
  };

  const handleUsdChange = (usdVal: string) => {
    const usdNum = parseFloat(usdVal) || 0;
    if (usdNum > 0 && activeAsset.price > 0) {
      const cryptoQty = usdNum / activeAsset.price;
      setSpotAmount(cryptoQty.toFixed(activeAsset.decimals > 2 ? 4 : 2));
    } else {
      setSpotAmount('');
    }
  };

  const amountNum = parseFloat(spotAmount);
  const estimatedCostUsd = !isNaN(amountNum) && amountNum > 0 ? amountNum * activeAsset.price : 0;

  const activeTicks = assetsTicksMap[activeAsset.id] || [];

  // Logic to calculate simulated order books
  const currentPrice = activeAsset.price;
  const dec = activeAsset.decimals;
  const step = currentPrice * 0.00015;

  const askRows = Array.from({ length: 7 }, (_, index) => {
    const i = 7 - index;
    const price = currentPrice + step * i;
    const quantity = (Math.sin((Date.now() / 15000) + i) * 0.45 + 0.6) * (dec > 2 ? 100 : 1.45);
    return { price, quantity, total: price * quantity };
  });

  const bidRows = Array.from({ length: 7 }, (_, index) => {
    const i = index + 1;
    const price = currentPrice - step * i;
    const quantity = (Math.cos((Date.now() / 16000) + i) * 0.45 + 0.6) * (dec > 2 ? 100 : 1.45);
    return { price, quantity, total: price * quantity };
  });

  // Filter registry based on category and search
  const filteredRegistry = assetsRegistry.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(marketSearchText.toLowerCase()) || 
                          asset.symbol.toLowerCase().includes(marketSearchText.toLowerCase());
    
    if (!matchesSearch) return false;

    if (selectedMarketTab === 'favorites') {
      return starredMarkets.includes(asset.id);
    } else if (selectedMarketTab === 'usdt') {
      return asset.id.includes('EURUSD') || asset.id.includes('GBPUSD');
    } else if (selectedMarketTab === 'btc') {
      return asset.id.includes('BTC') || asset.id.includes('ETH');
    } else if (selectedMarketTab === 'indices') {
      return asset.id.includes('R_') || asset.id.includes('WIZ');
    }
    return true;
  });

  const formatBalance = (bal: number) => {
    return bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isDark = theme === 'dark';
  const activeStakes = activeContracts.reduce((sum, c) => sum + c.stake, 0);
  const freeBalance = account.balance - activeStakes;

  return (
    <div className={`w-screen h-screen font-sans ${isDark ? 'elegant-radial-bg bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-row transition-colors duration-200 overflow-hidden relative`}>
      {isDark && <div className="absolute inset-0 radial-dots-grid pointer-events-none opacity-20" />}

      {/* FLOAT NOTISTACK TOASTER */}
      {visualNotice && (
        <div className={`fixed bottom-6 left-6 z-50 flex items-center space-x-2.5 rounded-xl border px-4 py-3.5 shadow-2xl transition-all duration-300 transform translate-y-0 scale-100 bg-slate-900 text-white ${
          visualNotice.success ? 'border-emerald-500' : 'border-rose-500'
        }`}>
          <div className={`h-2.5 w-2.5 rounded-full ${visualNotice.success ? 'bg-emerald-400 animate-ping' : 'bg-rose-400 animate-ping'}`} />
          <span className="font-mono text-xs font-semibold leading-tight">{visualNotice.text}</span>
        </div>
      )}
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-35 transition-all duration-300" 
        />
      )}

      {/* ========================================================= */}
      {/* 1. LEFT NAVIGATION SIDEBAR (Matches Screenshot) */}
      {/* ========================================================= */}
      <aside className={`fixed lg:relative inset-y-0 left-0 ${desktopSidebarCollapsed ? 'lg:w-20 w-64' : 'w-64'} ${isDark ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'} border-r z-40 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} transition-all duration-300 flex flex-col shrink-0 overflow-y-auto`}>
        {/* Brand Container */}
        <div className={`p-5 flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-4' : 'justify-between'} border-b border-slate-900/60 shrink-0`}>
          <div className="flex items-center space-x-2.5 select-none cursor-pointer" onClick={() => handleSwitchView('trade')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-center font-black animate-pulse shrink-0">
              <Sparkles className="w-4 h-4 text-slate-950" />
            </div>
            {!desktopSidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-wider text-white">LWEX</span>
                <span className="text-[10px] font-bold text-amber-500 tracking-widest -mt-1 uppercase">EXCHANGE</span>
              </div>
            )}
          </div>
          <button className="lg:hidden p-1 text-slate-400 hover:text-white cursor-pointer" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Account Quick Peek */}
        {currentUser ? (
          <div 
            onClick={() => setIsSettingsOpen(true)}
            className={`p-4 mx-3 my-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 border border-slate-900/80 flex items-center transition-colors cursor-pointer ${desktopSidebarCollapsed ? 'lg:justify-center p-2' : 'space-x-3'}`} 
            title={desktopSidebarCollapsed ? `${currentUser?.fullName} (VIP-2) - Settings` : "Click to view settings"}
          >
            <div className="relative shrink-0">
              <img src={currentUser?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80"} className="w-9 h-9 rounded-full border border-amber-500/20" alt="Avatar"/>
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-slate-950" />
            </div>
            {!desktopSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1 justify-between">
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">{currentUser?.fullName}</span>
                  <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded font-black shrink-0 uppercase">VIP-2</span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold font-mono tracking-tighter truncate max-w-[140px] block">
                  {currentUser?.email}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div 
            onClick={() => setIsAuthOpen(true)}
            className={`p-4 mx-3 my-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center transition-colors cursor-pointer justify-center ${desktopSidebarCollapsed ? 'p-2' : 'space-x-2'}`}
            title="Click to sign in"
          >
            <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
              ?
            </div>
            {!desktopSidebarCollapsed && (
              <div className="text-left flex-1 min-w-0">
                <span className="text-xs font-black text-amber-500 block uppercase tracking-wider">Access Account</span>
                <span className="text-[9px] text-slate-400 block font-semibold truncate">Sign in or register now</span>
              </div>
            )}
          </div>
        )}

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-3 py-3 space-y-1">
          <button 
            onClick={() => { handleSwitchView('trade'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeTabView === 'trade' && positionsTab === 'positions' && !isCashierOpen
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/10' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Interactive Trade" : undefined}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Interactive Trade</span>}
          </button>

          <button 
            onClick={() => { handlePositionsTabChange('stats'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeTabView === 'stats' && positionsTab === 'stats'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/10' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Overview Dashboard" : undefined}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Overview Dashboard</span>}
          </button>

          <button 
            onClick={() => { setSelectedMarketTab('indices'); handleSwitchView('trade'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedMarketTab === 'indices' && activeTabView === 'trade' && positionsTab === 'positions'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Indices Markets" : undefined}
          >
            <Globe className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Indices Markets</span>}
          </button>

          <button 
            onClick={() => { handlePositionsTabChange('stats'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              positionsTab === 'stats' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Asset Allocations" : undefined}
          >
            <PieChart className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Asset Allocations</span>}
          </button>

          <button 
            onClick={() => { handleOpenCashierWithTab('deposit'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isCashierOpen && cashierDefaultTab === 'deposit'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Deposit Cashier" : undefined}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
            {!desktopSidebarCollapsed && <span>Deposit Cashier</span>}
          </button>

          <button 
            onClick={() => { handleOpenCashierWithTab('withdraw'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isCashierOpen && cashierDefaultTab === 'withdraw'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Withdraw Portfolio" : undefined}
          >
            <ArrowDownRight className="w-4 h-4 text-rose-500 shrink-0" />
            {!desktopSidebarCollapsed && <span>Withdraw Portfolio</span>}
          </button>

          <button 
            onClick={() => { handlePositionsTabChange('statements'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              positionsTab === 'statements' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Transaction Statements" : undefined}
          >
            <FileText className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Transaction Statements</span>}
          </button>

          {/* Programs Section */}
          {!desktopSidebarCollapsed ? (
            <div className="pt-4 pb-2 px-3.5 text-[9px] uppercase font-black tracking-widest text-slate-500 select-none">
              Programs & Bots
            </div>
          ) : (
            <div className="h-[1px] bg-slate-900/40 my-3" />
          )}

          <button 
            onClick={() => { 
              setIsInviteOpen(true);
              setSidebarOpen(false); 
            }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isInviteOpen
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Invite Friends" : undefined}
          >
            <div className={`flex items-center ${desktopSidebarCollapsed ? '' : 'space-x-3'}`}>
              <Users className="w-4 h-4 text-amber-500 shrink-0" />
              {!desktopSidebarCollapsed && <span>Invite Friends</span>}
            </div>
            {!desktopSidebarCollapsed && (
              <span className="text-[8px] bg-rose-500 text-white font-black px-1.5 py-0.5 rounded-full animate-bounce shrink-0">HOT</span>
            )}
          </button>

          <button 
            onClick={() => { setIsCopilotOpen(true); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isCopilotOpen 
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/10' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "AI Grid Bot" : undefined}
          >
            <div className={`flex items-center ${desktopSidebarCollapsed ? '' : 'space-x-3'}`}>
              <Bot className="w-4 h-4 text-purple-400 shrink-0 animate-pulse" />
              {!desktopSidebarCollapsed && <span>AI Grid Bot</span>}
            </div>
            {!desktopSidebarCollapsed && (
              <span className="text-[8px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
            )}
          </button>

          {/* Adjust Settings Section */}
          {!desktopSidebarCollapsed ? (
            <div className="pt-4 pb-2 px-3.5 text-[9px] uppercase font-black tracking-widest text-slate-500 select-none">
              Adjust Settings
            </div>
          ) : (
            <div className="h-[1px] bg-slate-900/40 my-3" />
          )}

          <button 
            onClick={() => { setIsSettingsOpen(true); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isSettingsOpen 
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Profile settings" : undefined}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Profile settings</span>}
          </button>

          <button 
            onClick={() => { setIsGuideOpen(true); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isGuideOpen 
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Interactive Guide" : undefined}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Interactive Guide</span>}
          </button>
        </nav>

        {/* Sidebar Invitation Banner */}
        {!desktopSidebarCollapsed && (
          <div className="p-4 mx-3 my-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-900 shadow-xl space-y-3 shrink-0 select-none relative group overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-colors" />
            <div className="flex items-center space-x-2">
              <CoinsIcon className="w-7 h-7 text-amber-400 animate-spin" />
              <span className="text-xs font-extrabold text-slate-100">Invite & Earn 50%</span>
            </div>
            <p className="text-[10px] text-slate-400">Share your custom affiliate link and pocket maximum commission rebates instantly.</p>
            <button 
              onClick={() => triggerToast("Copilot Affiliate link copied to clipboard!", true)}
              className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-white font-bold py-1.5 rounded text-[10px] uppercase tracking-wider transition-colors"
            >
              Get Referral link
            </button>
          </div>
        )}

        {/* Latency Indicator bottom bar */}
        <div className={`p-4 border-t border-slate-900/60 flex items-center ${desktopSidebarCollapsed ? 'justify-center p-3' : 'justify-between'} text-[10px] font-mono text-slate-500 shrink-0 select-none`}>
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            {!desktopSidebarCollapsed && <span className="font-semibold text-emerald-500 uppercase tracking-tighter text-[9px]">Stable Connection</span>}
          </div>
          {!desktopSidebarCollapsed && <span>28 ms</span>}
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN APPLICATION CONTENT PORT (Header + Right & Center columns) */}
      {/* ========================================================= */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto animate-fade-in relative scrollbar-thin">
        
        {/* ============================================== */}
        {/* 2.1 TOP HEADER & CONTROLS (Unified) */}
        {/* ============================================== */}
        <header className={`min-h-[4rem] h-auto ${isDark ? 'bg-slate-950/80 border-slate-900/60' : 'bg-white border-slate-200'} border-b flex flex-col md:flex-row md:items-center justify-between px-3 sm:px-6 py-2.5 md:py-0 shrink-0 z-30 sticky top-0 backdrop-blur-md w-full gap-2 md:gap-0`}>
          {/* 1. Brand Logo + Menu Toggles + Asset Swapper (Responsive flow) */}
          <div className="flex items-center justify-between md:justify-start w-full md:w-auto gap-3">
            <div className="flex items-center space-x-2">
              {/* Sidebar trigger */}
              <button className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 cursor-pointer" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>

              {/* Desktop Collapse Toggle Button */}
              <button 
                onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)} 
                className="hidden lg:flex p-1.5 text-slate-450 hover:text-white rounded-lg hover:bg-slate-900/60 border border-slate-800 transition-all cursor-pointer"
                title={desktopSidebarCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar Menu"}
              >
                {desktopSidebarCollapsed ? <ChevronRight className="w-4 h-4 text-amber-500 animate-pulse" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              
              {/* Brand label only visible on mobile info header to maintain orientation */}
              <div className="md:hidden flex items-center space-x-1.5 select-none" onClick={() => handleSwitchView('trade')}>
                <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                </div>
                <span className="text-xs font-black tracking-wider text-slate-200">LWEX</span>
              </div>
            </div>

            {/* Interactive Quick asset swapper dropdown selection */}
            <div className="relative">
              <button 
                id="header-asset-select-button"
                onClick={() => setAssetDropdownOpen(!assetDropdownOpen)}
                className="flex items-center space-x-1.5 sm:space-x-2 border border-slate-800 bg-slate-900/40 hover:bg-slate-900/100 transition-all px-2 md:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-mono shrink-0 cursor-pointer text-slate-200 focus:outline-none"
              >
                <div className="flex flex-col text-left">
                  <span className="font-bold text-slate-200 text-[10px] md:text-xs truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[120px]">{activeAsset.name}</span>
                  <span className="text-[8px] md:text-[9.5px] text-slate-500 uppercase font-black tracking-tight">({activeAsset.symbol}/USD)</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-all duration-200 shrink-0 ${assetDropdownOpen ? 'rotate-180 text-amber-400' : ''}`} />
              </button>

              {/* Asset Dropdown Overlay */}
              {assetDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAssetDropdownOpen(false)} />
                  <div className="absolute left-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-950/95 shadow-2xl z-50 p-2 max-h-96 overflow-y-auto animate-fade-in divide-y divide-slate-900 scrollbar-thin">
                    <div className="text-[8px] font-black tracking-widest text-slate-500 uppercase pb-1.5 pt-0.5 px-2">CHOOSE TRADING INSTRUMENT</div>
                    <div className="py-1 space-y-0.5">
                      {assetsRegistry.map((asset) => {
                        const selected = asset.id === activeAsset.id;
                        return (
                          <button
                            key={asset.id}
                            onClick={() => {
                              setActiveAsset(asset);
                              setAssetDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between text-left p-2 rounded-lg transition-colors cursor-pointer ${
                              selected 
                                ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30' 
                                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white border border-transparent'
                            }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-black truncate">{asset.name}</span>
                              <span className="text-[9px] text-slate-500 font-bold uppercase">{asset.symbol}/USDT</span>
                            </div>
                            <div className="text-right font-mono text-[10px] shrink-0">
                              <div className="font-extrabold text-slate-200">${asset.price.toFixed(asset.decimals)}</div>
                              <div className={`text-[9px] font-black ${asset.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 2. Controls & Actions Row */}
          <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-1.5 sm:gap-3 lg:gap-4 md:border-none border-t pt-2 md:pt-0 border-slate-800/10">
            {/* Real vs Demo selector */}
            <div className={`flex items-center p-0.5 rounded-lg ${isDark ? 'bg-slate-950 border border-slate-900' : 'bg-slate-100 border border-slate-200'} shrink-0`}>
              <button 
                onClick={() => handleSwitchAccount('demo')}
                className={`px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-black uppercase rounded-md tracking-wider transition-all cursor-pointer ${
                  account.mode === 'demo'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-350 font-semibold'
                }`}
              >
                <span className="xs:hidden">Demo</span>
                <span className="hidden xs:inline">Demo Wallet</span>
              </button>
              <button 
                onClick={() => handleSwitchAccount('real')}
                className={`px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-black uppercase rounded-md tracking-wider transition-all cursor-pointer ${
                  account.mode === 'real'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-350 font-semibold'
                }`}
              >
                <span className="xs:hidden">Real</span>
                <span className="hidden xs:inline">Real Wallet</span>
              </button>
            </div>

            {/* Quick Balance Readout Panel inside Header */}
            <div className="flex flex-col text-right min-w-[55px] sm:min-w-0">
              <span className="text-[7px] sm:text-[8px] text-slate-400 font-extrabold uppercase font-mono tracking-tight sm:tracking-wider leading-none">
                {account.mode.toUpperCase()} WALLET
              </span>
              <span className="font-mono text-[10px] sm:text-xs md:text-sm font-extrabold text-[#f59e0b] leading-tight block mt-0.5">
                ${formatBalance(account.balance)} <span className="text-[8px] text-slate-450 font-normal">USDT</span>
              </span>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-3.5 shrink-0">
              {/* Sound Synthesizer toggle */}
              <button 
                onClick={() => { setSoundEnabled(!soundEnabled); triggerToast(soundEnabled ? 'Chime synth muted.' : 'Harmonic chime synth active.', true); }}
                className={`p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer ${soundEnabled ? 'text-amber-500 bg-amber-500/5' : ''}`}
                title="Toggle Web Audio indicators"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 animate-bounce" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />}
              </button>

              {/* Deposit Cashier Button */}
              <button 
                onClick={() => handleOpenCashierWithTab('deposit')}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wider transition-all flex items-center space-x-1 shadow-md shadow-emerald-500/10 cursor-pointer shrink-0"
                title="Quick Deposit Cashier"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Dep<span className="hidden min-[375px]:inline">osit</span> <span className="hidden sm:inline">CASHIER</span></span>
              </button>

              {/* Language global placeholder */}
              <button className="hidden xs:flex p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-bold tracking-tight uppercase items-center space-x-1 hover:bg-slate-900 cursor-pointer">
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden leading-none md:inline text-[10px]">EN</span>
              </button>

              {/* Notifications feed dropdown */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setIsNotificationsOpen(!isNotificationsOpen);
                    setIsUserMenuOpen(false);
                  }}
                  className={`relative p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer ${isNotificationsOpen ? 'text-amber-500 bg-amber-500/5' : ''}`}
                  title="View notification feed"
                >
                  <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-2.5 min-w-[10px] px-0.5 rounded-full bg-rose-600 text-[7px] font-sans font-black flex items-center justify-center text-white scale-95 leading-none">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>

                {/* Dynamic notifications overlay */}
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                    <div className={`absolute right-0 mt-2.5 w-72 sm:w-80 md:w-96 rounded-xl shadow-2xl border ${
                      isDark ? 'bg-slate-950 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-900'
                    } z-50 overflow-hidden divide-y ${isDark ? 'divide-slate-900' : 'divide-gray-100'} animate-fade-in`}>
                      <div className="p-3 flex items-center justify-between bg-slate-900/10">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-[10px] sm:text-xs uppercase tracking-wide">Live Feed</span>
                          <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                            isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {notifications.filter(n => !n.read).length} Unread
                          </span>
                        </div>
                        <div className="flex items-center space-x-2.5">
                          {notifications.length > 0 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                                triggerToast("All notifications marked as read.", true);
                              }}
                              className="text-[9px] sm:text-[10px] text-amber-500 hover:text-amber-400 font-bold hover:underline cursor-pointer"
                            >
                              Read All
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotifications([]);
                                triggerToast("Notification feed cleared.", true);
                              }}
                              className="text-[9px] sm:text-[10px] text-rose-500 hover:text-rose-455 font-bold hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-[250px] sm:max-h-[350px] overflow-y-auto divide-y divide-slate-900/40 scrollbar-thin">
                        {notifications.length === 0 ? (
                          <div className="p-6 sm:p-8 text-center text-slate-450 flex flex-col items-center justify-center space-y-2">
                            <Bell className="w-5 h-5 sm:w-7 sm:h-7 text-slate-600 animate-bounce" />
                            <p className="text-[11px] sm:text-xs font-semibold">Your notification tray is silent.</p>
                            <p className="text-[9px] sm:text-[10px] text-slate-500">Live trading history updates appear here.</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => {
                                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                              }}
                              className={`p-2.5 sm:p-3.5 transition-all text-left flex items-start gap-2.5 cursor-pointer ${
                                notif.read 
                                  ? 'opacity-65 hover:opacity-100 bg-slate-900/5' 
                                  : isDark ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06]' : 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]'
                              }`}
                            >
                              <span className={`h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full mt-1.5 shrink-0 ${
                                notif.read ? 'bg-slate-500' : 'bg-amber-500 ring-2 ring-amber-500/20'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-[11px] sm:text-xs ${notif.read ? 'text-slate-450 font-semibold' : 'text-slate-200 font-black'}`}>
                                  {notif.text}
                                </p>
                                <span className="text-[7px] sm:text-[8px] font-mono text-slate-500 block mt-1">{notif.time}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Separator */}
              <div className={`hidden sm:block h-6 w-[1px] ${isDark ? 'bg-slate-900' : 'bg-slate-200'}`} />

              {/* Complete User Module */}
              <div className="relative">
                {currentUser ? (
                  <>
                    <button 
                      onClick={() => {
                        setIsUserMenuOpen(!isUserMenuOpen);
                        setIsNotificationsOpen(false);
                      }}
                      className={`flex items-center space-x-1 p-1 rounded-lg hover:bg-slate-900 transition-all cursor-pointer ${
                        isUserMenuOpen ? 'bg-slate-900' : ''
                      }`}
                    >
                      <img 
                        src={currentUser?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80"} 
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-amber-500/30 shadow-md"
                        alt="Avatar"
                      />
                      <ChevronDown className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isUserMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                        <div className={`absolute right-0 mt-2.5 w-48 sm:w-56 rounded-xl shadow-2xl border ${
                          isDark ? 'bg-slate-950 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-900'
                        } z-50 overflow-hidden divide-y ${isDark ? 'divide-slate-900' : 'divide-gray-100'} animate-fade-in`}>
                          <div className="p-3 text-left">
                            <p className="text-[11px] sm:text-xs font-black text-slate-200 truncate">{currentUser?.fullName}</p>
                            <p className="text-[9px] sm:text-[10px] font-mono text-slate-450 truncate mt-0.5">{currentUser?.email}</p>
                            <div className="flex items-center space-x-1 mt-2">
                              <span className="text-[7px] sm:text-[8px] bg-amber-500/20 text-amber-455 px-1.5 py-0.5 rounded font-black uppercase">
                                VIP 2 Account
                              </span>
                              <span className="text-[7px] sm:text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">
                                Real Mode
                              </span>
                            </div>
                          </div>

                          <div className="p-1.5 space-y-0.5 text-left">
                            <button 
                              onClick={() => {
                                setIsSettingsOpen(true);
                                setIsUserMenuOpen(false);
                              }}
                              className={`flex items-center space-x-2.5 w-full p-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                                isDark ? 'text-slate-300 hover:bg-slate-900 hover:text-white' : 'text-slate-700 hover:bg-gray-100'
                              }`}
                            >
                              <Settings className="w-3 w-3 sm:w-3.5 sm:h-3.5" />
                              <span>Profile settings</span>
                            </button>
                            
                            <button 
                              onClick={() => {
                                setIsGuideOpen(true);
                                setIsUserMenuOpen(false);
                              }}
                              className={`flex items-center space-x-2.5 w-full p-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                                isDark ? 'text-slate-300 hover:bg-slate-900 hover:text-white' : 'text-slate-700 hover:bg-gray-100'
                              }`}
                            >
                              <HelpCircle className="w-3 w-3 sm:w-3.5 sm:h-3.5" />
                              <span>Interactive Guide</span>
                            </button>
                          </div>

                          <div className="p-1.5 text-left">
                            <button 
                              onClick={() => {
                                setCurrentUser(null);
                                setIsUserMenuOpen(false);
                                triggerToast("Successfully logged out from storage session.", true);
                              }}
                              className="flex items-center space-x-2.5 w-full p-2 rounded-lg text-[11px] sm:text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                            >
                              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500" />
                              <span>Log out of Session</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <button 
                    onClick={() => setIsAuthOpen(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-lg text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/15 cursor-pointer shrink-0"
                  >
                    Sign In
                  </button>
                )}
              </div>

              {/* Theme toggle */}
              <button 
                onClick={handleToggleTheme}
                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer"
                title="Toggle Palette Color"
              >
                {isDark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* ======================================================== */}
        {/* 2.2 TOP HORIZONTAL CRYPTO TICKER SLIDER STRIP (Screenshot highlight) */}
        {/* ======================================================== */}
        <div className={`h-11 ${isDark ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-150'} border-b overflow-x-auto overflow-y-hidden select-none whitespace-nowrap scrollbar-none flex items-center px-4 gap-6 shrink-0`}>
          {assetsRegistry.slice(0, 9).map((coin) => {
            const selected = coin.id === activeAsset.id;
            const plus = coin.change >= 0;
            return (
              <div 
                key={coin.id} 
                onClick={() => setActiveAsset(coin)}
                className={`inline-flex items-center space-x-2.5 text-xs font-mono py-1 px-2.5 rounded-lg cursor-pointer transition-colors ${
                  selected 
                    ? isDark ? 'bg-slate-900 text-slate-200 border border-slate-800' : 'bg-slate-200 text-blue-900'
                    : isDark ? 'text-slate-400 hover:bg-slate-900/35 hover:text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${starredMarkets.includes(coin.id) ? 'bg-amber-400' : 'bg-slate-600'}`} />
                <span className="font-extrabold">{coin.symbol}/USDT</span>
                <span className="font-bold text-slate-300">{coin.price.toFixed(coin.decimals)}</span>
                <span className={`font-black tracking-tight text-[10px] ${plus ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {plus ? '+' : ''}{coin.change.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* 2.3 MAIN WORKSPACE PANEL (Split center & right columns) */}
        {/* ========================================================= */}
        <div className="flex-1 p-3 md:p-5 flex flex-col gap-5 overflow-y-auto w-full">
          
          {/* Main workspace layout grid: Left column (chart/swap) and Right column (book/indicators) */}
          <div className="flex flex-col xl:flex-row gap-5 w-full">
          
          {/* ===================================================== */}
          {/* CENTER-LEFT COLUMN (Chart, Draw toolbar, Spot panel, Positions) */}
          {/* ===================================================== */}
          <div className="flex-1 flex flex-col space-y-5 min-w-0">
            
            {/* Bitcoin Asset Large Info Block */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-200'} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0`}>
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-500 shadow-inner text-lg shrink-0">
                  {activeAsset.symbol.includes('BTC') || activeAsset.id.includes('BTC') || activeAsset.symbol === 'C-NEPT' ? '₿' : 
                   activeAsset.symbol === 'TFLUX' ? '🌊' :
                   activeAsset.symbol === 'TITAN' ? '🛡️' :
                   activeAsset.symbol === 'MFLOW' ? '⚡' :
                   activeAsset.symbol === 'WIZARD' ? '👁️' :
                   activeAsset.symbol === 'S-ANCHOR' ? '⚓' :
                   activeAsset.symbol === 'M-LINK' ? '🇪🇺' : '📊'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm md:text-base font-extrabold text-slate-100 uppercase">{activeAsset.name}</h2>
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider">/ PORTFOLIO INDEX</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block">DERIVATIVES BINARY OPTIONS TRADING ACTIVE</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-xs font-mono w-full md:w-auto">
                <div>
                  <span className="block text-[9px] text-slate-450 uppercase font-black tracking-wider">Index spot</span>
                  <span className={`text-sm font-black ${activeAsset.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ${activeAsset.price.toFixed(activeAsset.decimals)}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-450 uppercase font-black tracking-wider">24h delta</span>
                  <span className={`text-xs font-bold leading-none ${activeAsset.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {activeAsset.change >= 0 ? '+' : ''}{activeAsset.change.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-450 uppercase font-black tracking-wider">Volatility</span>
                  <span className="text-xs font-bold text-slate-300">{activeAsset.volatility.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-450 uppercase font-black tracking-wider">Drift bias</span>
                  <span className="text-xs font-bold text-amber-400 font-mono">{(activeAsset.trendBias >= 0 ? '+' : '') + activeAsset.trendBias.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Quick Trading Asset Selector Toggles Bar (TIDAL FLUX, TITAN, and others) */}
            <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-900/60' : 'bg-slate-50 border-slate-200'} flex items-center justify-between overflow-x-auto whitespace-nowrap gap-2 shrink-0 scrollbar-none`}>
              <div className="flex items-center space-x-2 w-full">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider mr-2 hidden md:inline-block">Popular Trade Parts:</span>
                <div className="flex items-center space-x-1.5 overflow-x-auto w-full scrollbar-none py-0.5">
                  {[
                    { id: 'R_25', label: '🌊 Tidal Flux', symbol: 'TFLUX' },
                    { id: 'R_50', label: '🛡️ Titan Swell', symbol: 'TITAN' },
                    { id: 'R_10', label: '⚡ LWEX Flow', symbol: 'MFLOW' },
                    { id: 'R_100', label: '👁️ Wizard Eye', symbol: 'WIZARD' },
                    { id: 'CRY_BTCUSD', label: '₿ Crypto Neptune', symbol: 'C-NEPT' },
                    { id: 'FRX_EURUSD', label: '🇪🇺 Meridian Link', symbol: 'M-LINK' }
                  ].map((preset) => {
                    const realAsset = assetsRegistry.find(a => a.id === preset.id || a.symbol === preset.symbol);
                    if (!realAsset) return null;
                    const isSelected = activeAsset.id === realAsset.id;
                    return (
                      <button
                        key={realAsset.id}
                        onClick={() => setActiveAsset(realAsset)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 border cursor-pointer inline-flex items-center space-x-2 shrink-0 ${
                          isSelected 
                            ? 'bg-amber-500 text-slate-950 font-black border-amber-600 shadow-md shadow-amber-500/10 scale-102' 
                            : isDark 
                              ? 'bg-slate-900/40 text-slate-350 border-slate-900/70 hover:bg-slate-900 hover:text-white'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-extrabold">{preset.label}</span>
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-slate-900/80' : 'text-slate-500'}`}>
                          ({realAsset.symbol})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>


            {/* Unified Trading Terminal Workspace Grid (User Requested layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              
              {/* LEFT SIDE: Interactive Trading Grid (Chart) */}
              <div className={`lg:col-span-8 rounded-xl border ${isDark ? 'bg-slate-950/20 border-slate-900' : 'bg-white border-slate-200'} p-3 flex flex-col gap-2 min-h-[460px] relative overflow-hidden h-full`}>
                
                {/* Horizontal drawing toolbar on Top of chart */}
                <div className="w-full flex items-center justify-start px-2 py-1 space-x-2 border-b border-slate-900 shrink-0 select-none">
                  <button 
                    onClick={() => triggerToast("TV crosshair cursor highlighted.", true)}
                    className="p-1 rounded-md hover:bg-slate-900 hover:text-white text-slate-500 hover:scale-105 active:scale-95 transition-transform" 
                    title="Crosshair pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => triggerToast("Trendline drawing anchor mode ready. Drag click anchors on chart canvas.", true)}
                    className="p-1 rounded-md hover:bg-slate-900 text-slate-400 hover:text-amber-400 hover:scale-105 transition-all" 
                    title="Draw Trendline"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => triggerToast("Brushes and pencil drawing tools active.", true)}
                    className="p-1 rounded-md hover:bg-slate-900 text-slate-400 hover:text-purple-400 transition-all" 
                    title="Brush drawing board"
                  >
                    <Bot className="w-3.5 h-3.5" />
                  </button>
                  <div className="h-4 w-[1px] bg-slate-800 mx-1" />
                  <button 
                    onClick={() => triggerToast("Fibers Fibonacci Retracement bands overlay activated.", true)}
                    className="p-1 rounded-md hover:bg-slate-900 text-slate-400 hover:text-amber-400 transition-all" 
                    title="Fibonacci Retracements"
                  >
                    <Award className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => triggerToast("Measuring grid tools highlighted. Click chart coordinates.", true)}
                    className="p-1 rounded-md hover:bg-slate-900 text-slate-400 hover:text-blue-400 transition-all" 
                    title="Distance Measure Scale"
                  >
                    <Activity className="w-3.5 h-3.5 font-bold" />
                  </button>
                  <div className="flex-1"></div>
                  <button 
                    onClick={() => triggerToast("Reset drawings and clear canvas annotations.", true)}
                    className="p-1 rounded-md hover:bg-slate-900 text-slate-400 hover:text-rose-500 transition-colors" 
                    title="Garbage Reset All Drawings"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Central Chart Rendering Area */}
                <div className="flex-1 flex flex-col min-w-0">
                  <Chart 
                    theme={theme}
                    asset={activeAsset}
                    ticks={activeTicks}
                    activeContracts={activeContracts}
                    indicatorConfig={indicatorConfig}
                    chartType={chartType}
                    onToggleChartType={(newType) => setChartType(newType)}
                    onToggleIndicator={handleToggleIndicator}
                  />
                </div>
              </div>

              {/* RIGHT SIDE: Compact Multi-column Order Execution controls */}
              <div className={`lg:col-span-4 p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-200'} flex flex-col justify-between space-y-4`}>
                
                {/* Panel Title & Type Selector */}
                <div className="space-y-3 shrink-0">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-905">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Terminal Trade Box</span>
                    <span className="text-[10px] text-emerald-500 font-mono font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded animate-pulse">
                      Live Markets
                    </span>
                  </div>

                  {/* Order Execution modes toggles */}
                  <div className="flex p-0.5 rounded-lg bg-slate-950 border border-slate-900 text-[10px] font-mono leading-none items-center justify-between">
                    <button 
                      onClick={() => setSpotType('limit')}
                      className={`flex-1 text-center py-2 rounded uppercase font-bold transition-all ${spotType === 'limit' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                    >
                      Limit Price
                    </button>
                    <button 
                      onClick={() => setSpotType('market')}
                      className={`flex-1 text-center py-2 rounded uppercase font-bold transition-all ${spotType === 'market' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                    >
                      Market Price
                    </button>
                  </div>
                </div>

                {/* DURATION INPUT UNIT (ticks, seconds, minutes) - CUSTOM REQUEST */}
                <div className="space-y-1.5 p-3 rounded-lg border border-slate-900 bg-slate-950/50">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Settle Duration</label>
                    <span className="text-[9px] font-mono text-amber-500">Auto close timer</span>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    {/* Number input */}
                    <input 
                      type="number" 
                      min="1" 
                      max="300"
                      value={spotDuration}
                      onChange={(e) => setSpotDuration(Math.max(1, parseInt(e.target.value) || 1))}
                      className="col-span-5 bg-slate-950 border border-slate-900 rounded-lg text-center font-mono text-xs font-extrabold focus:outline-none focus:border-amber-500 text-white p-2"
                    />
                    {/* Unit Toggle Buttons */}
                    <div className="col-span-7 flex rounded-lg bg-slate-950 border border-slate-900 p-0.5 text-[9px] font-mono">
                      {(['ticks', 'seconds', 'minutes'] as const).map((unit) => (
                        <button
                          key={unit}
                          onClick={() => setSpotDurationUnit(unit)}
                          className={`flex-1 text-center py-1.5 rounded uppercase font-bold transition-all ${spotDurationUnit === unit ? 'bg-amber-500/25 text-amber-400 font-extrabold' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          {unit === 'ticks' ? 'Ticks' : unit === 'seconds' ? 'Sec' : 'Min'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-500 italic mt-1 text-center select-none font-mono">
                    Trade closes and settles automatically in {spotDuration} {spotDurationUnit}
                  </div>
                </div>

                {/* BUY LONG AND SELL SHORT COLUMN SECTIONS Side-by-Side (2 Columns requested!) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 sm:xl:grid-cols-2 gap-3 flex-1 overflow-y-auto min-h-0">
                  
                  {/* BUY LONG COLUMN */}
                  <div className="space-y-3 p-3 rounded-lg bg-slate-950/25 border border-slate-900 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-900/45 pb-1.5">
                      <span className="text-emerald-500 font-extrabold flex items-center gap-1 uppercase">
                        <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
                        Buy LONG ({activeAsset.symbol})
                      </span>
                    </div>

                    {spotType === 'limit' && (
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Limit (USDT)</label>
                        <input 
                          type="number" 
                          step={activeAsset.decimals > 2 ? 0.0001 : 1}
                          value={spotPriceLimit} 
                          onChange={(e) => setSpotPriceLimit(parseFloat(e.target.value) || activeAsset.price)}
                          className="w-full bg-slate-950 border border-slate-900 rounded text-center font-mono text-xs font-bold py-1 text-white focus:outline-none focus:border-emerald-500" 
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Qty ({activeAsset.symbol})</label>
                          <input 
                            type="number" 
                            step="any"
                            placeholder="0.00"
                            value={spotAmount} 
                            onChange={(e) => setSpotAmount(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded text-center font-mono text-[11px] font-bold py-1 text-white" 
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Stake (USD)</label>
                          <input 
                            type="number" 
                            step="any"
                            placeholder="0.00"
                            value={estimatedCostUsd > 0 ? estimatedCostUsd.toFixed(2) : ''} 
                            onChange={(e) => handleUsdChange(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded text-center font-mono text-[11px] font-bold py-1 text-white" 
                          />
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="grid grid-cols-5 gap-1">
                        {[10, 25, 50, 75, 100].map((perc) => (
                          <button 
                            key={perc} 
                            onClick={() => handlePresetPercentage(perc)}
                            className="rounded py-0.5 text-[8px] font-mono font-bold border border-slate-900 bg-slate-950 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {perc}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => executeSpotTrade('buy')}
                      className="w-full rounded bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black py-2 text-xs uppercase transition-all text-center select-none cursor-pointer shadow hover:shadow-emerald-500/10 mt-2"
                    >
                      Buy LONG
                    </button>
                  </div>

                  {/* SELL SHORT COLUMN */}
                  <div className="space-y-3 p-3 rounded-lg bg-slate-950/25 border border-slate-900 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-900/45 pb-1.5">
                      <span className="text-rose-500 font-extrabold flex items-center gap-1 uppercase">
                        <span className="h-1 w-1 rounded-full bg-rose-500 animate-pulse"></span>
                        Sell SHORT ({activeAsset.symbol})
                      </span>
                    </div>

                    {spotType === 'limit' && (
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Limit (USDT)</label>
                        <input 
                          type="number" 
                          step={activeAsset.decimals > 2 ? 0.0001 : 1}
                          value={spotPriceLimit} 
                          onChange={(e) => setSpotPriceLimit(parseFloat(e.target.value) || activeAsset.price)}
                          className="w-full bg-slate-950 border border-slate-900 rounded text-center font-mono text-xs font-bold py-1 text-white focus:outline-none focus:border-rose-500" 
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Qty ({activeAsset.symbol})</label>
                          <input 
                            type="number" 
                            step="any"
                            placeholder="0.00"
                            value={spotAmount} 
                            onChange={(e) => setSpotAmount(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded text-center font-mono text-[11px] font-bold py-1 text-white" 
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Stake (USD)</label>
                          <input 
                            type="number" 
                            step="any"
                            placeholder="0.00"
                            value={estimatedCostUsd > 0 ? estimatedCostUsd.toFixed(2) : ''} 
                            onChange={(e) => handleUsdChange(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded text-center font-mono text-[11px] font-bold py-1 text-white" 
                          />
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="grid grid-cols-5 gap-1">
                        {[10, 25, 50, 75, 100].map((perc) => (
                          <button 
                            key={perc} 
                            onClick={() => handlePresetPercentage(perc)}
                            className="rounded py-0.5 text-[8px] font-mono font-bold border border-slate-900 bg-slate-950 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {perc}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => executeSpotTrade('sell')}
                      className="w-full rounded bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-black py-2 text-xs uppercase transition-all text-center select-none cursor-pointer shadow hover:shadow-rose-500/10 mt-2"
                    >
                      Sell SHORT
                    </button>
                  </div>

                </div>

                {/* Account info section inside box bottom */}
                <div className="pt-2 border-t border-slate-900 flex justify-between text-[10px] text-slate-400 font-mono items-center shrink-0">
                  <div className="flex flex-col">
                    <span>Balance: ${formatBalance(account.balance)}</span>
                    <span className="text-emerald-450">Available: ${formatBalance(freeBalance)}</span>
                  </div>
                  {activeContracts.length > 0 && (
                    <div className="text-right">
                      <span className="text-amber-500 font-semibold">{activeContracts.length} Active Deals</span>
                      <span className="block text-[8px] text-slate-500">Locked: ${formatBalance(activeStakes)}</span>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Quick Balance Header & Open Positions, Statements, Metrics & Stats terminal spreading to both ends */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-200'} space-y-4 mt-5`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3.5 rounded-lg bg-slate-900/15 dark:bg-slate-950/45 border border-slate-150 dark:border-slate-850 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block font-mono">Live Account Wallet Balance</span>
                    <span className="text-lg md:text-xl font-mono font-black text-amber-500 leading-none">${formatBalance(account.balance)} <span className="text-[10px] text-slate-400 font-normal">USDT</span></span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-10 text-left font-mono w-full md:w-auto">
                  <div className="border-l border-slate-250 dark:border-slate-800/85 pl-2 sm:pl-3.5">
                    <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold block leading-none mb-1">Available</span>
                    <span className="text-xs sm:text-sm font-extrabold text-emerald-500 dark:text-emerald-400 leading-none">${formatBalance(freeBalance)}</span>
                  </div>
                  <div className="border-l border-slate-250 dark:border-slate-800/85 pl-2 sm:pl-3.5">
                    <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold block leading-none mb-1">Active Deals</span>
                    <span className="text-xs sm:text-sm font-extrabold text-amber-550 leading-none">{activeContracts.length} Open</span>
                  </div>
                  <div className="border-l border-slate-250 dark:border-slate-800/85 pl-2 sm:pl-3.5">
                    <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold block leading-none mb-1">Locked</span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-450 leading-none">${formatBalance(activeStakes)}</span>
                  </div>
                </div>
              </div>

              <PositionsList 
                theme={theme}
                activeContracts={activeContracts}
                closedContracts={tradeHistory}
                onSellContract={handleSellContractEarly}
                activeTab={positionsTab}
                onChangeTab={handlePositionsTabChange}
                cashoutMode={(gameSettings as any)?.cashoutMode || 'enabled'}
              />
            </div>
          </div>
          
          {/* RIGHT COLUMN (Order Book, Markets search list, Wallet Pie, Bot config, News) */}
          {/* ===================================================== */}
          <div className="w-full xl:w-96 shrink-0 flex flex-col space-y-5">
            
            {/* Split Panel: Order Book (Left) Markets Search Table (Right) */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-200'} flex flex-col space-y-4`}>
              
              <div className="flex border-b border-slate-900 pb-2.5 justify-between items-center text-xs font-bold uppercase tracking-wider select-none">
                <span className="text-white">Live Operations Desk</span>
                <span className="text-slate-500 text-[10px] font-mono lowercase">0.01 accuracy</span>
              </div>

              {/* Split layout inside desk container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Visual Order Book Pane */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-black block uppercase tracking-wider">Dynamic Order Book</span>
                  
                  {/* Asks (Sell, Red) */}
                  <div className="space-y-0.5 font-mono text-[10px]">
                    {askRows.map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center hover:bg-slate-900/30 px-1 py-0.5 rounded">
                        <span className="text-rose-500 font-bold">{row.price.toFixed(activeAsset.decimals > 2 ? 4 : 2)}</span>
                        <span className="text-slate-400 text-right">{row.quantity.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Spread indicator central display */}
                  <div className="border-t border-b border-slate-900 py-1 flex flex-col items-center select-none bg-slate-900/10">
                    <span className="text-xs font-black text-emerald-500 font-mono tracking-tighter">
                      ${activeAsset.price.toFixed(activeAsset.decimals)}
                    </span>
                    <span className="text-[8px] text-slate-500 tracking-wider">Spread 0.05 (USD Conversion)</span>
                  </div>

                  {/* Bids (Buy, Green) */}
                  <div className="space-y-0.5 font-mono text-[10px]">
                    {bidRows.map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center hover:bg-slate-900/30 px-1 py-0.5 rounded">
                        <span className="text-emerald-500 font-bold">{row.price.toFixed(activeAsset.decimals > 2 ? 4 : 2)}</span>
                        <span className="text-slate-400 text-right">{row.quantity.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Dual ratio gauge bar */}
                  <div className="pt-2 font-mono text-[8px] text-slate-500 flex flex-col space-y-1">
                    <div className="flex justify-between">
                      <span>Bids 51.4%</span>
                      <span>Asks 48.6%</span>
                    </div>
                    <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-slate-900">
                      <div className="bg-emerald-500 h-full" style={{ width: '51.4%' }} />
                      <div className="bg-rose-500 h-full" style={{ width: '48.6%' }} />
                    </div>
                  </div>
                </div>

                {/* Markets Selection List Table */}
                <div className="space-y-2 flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-black block uppercase tracking-wider">Market Search</span>
                  </div>
                  
                  {/* Category selectors */}
                  <div className="grid grid-cols-4 gap-0.5 p-0.5 rounded bg-slate-900 text-[8px] font-black uppercase tracking-tighter leading-none select-none">
                    <button 
                      onClick={() => setSelectedMarketTab('indices')}
                      className={`py-1 rounded text-center ${selectedMarketTab === 'indices' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'}`}
                    >
                      Idx
                    </button>
                    <button 
                      onClick={() => setSelectedMarketTab('usdt')}
                      className={`py-1 rounded text-center ${selectedMarketTab === 'usdt' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'}`}
                    >
                      U-S
                    </button>
                    <button 
                      onClick={() => setSelectedMarketTab('btc')}
                      className={`py-1 rounded text-center ${selectedMarketTab === 'btc' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'}`}
                    >
                      Crp
                    </button>
                    <button 
                      onClick={() => setSelectedMarketTab('favorites')}
                      className={`py-1 rounded text-center ${selectedMarketTab === 'favorites' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'}`}
                    >
                      Fav
                    </button>
                  </div>

                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search coins..." 
                      value={marketSearchText}
                      onChange={(e) => setMarketSearchText(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-900 focus:outline-none rounded text-[10px] px-2 py-1 font-mono text-white placeholder-slate-500 focus:border-slate-800"
                    />
                    <Search className="w-3 h-3 text-slate-500 absolute right-2 top-1.5 pointer-events-none" />
                  </div>

                  {/* Coins list scrollport */}
                  <div className="flex-1 overflow-y-auto max-h-52 space-y-1 pr-1 scrollbar-thin">
                    {filteredRegistry.map((item) => {
                      const selected = item.id === activeAsset.id;
                      const star = starredMarkets.includes(item.id);
                      return (
                        <div 
                          key={item.id}
                          onClick={() => setActiveAsset(item)}
                          className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                            selected ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-900/30 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <button onClick={(e) => toggleStarMarket(item.id, e)} className="text-slate-600 hover:text-amber-400 focus:outline-none">
                              <Star className={`w-3.5 h-3.5 ${star ? 'text-amber-400 fill-amber-400' : ''}`} />
                            </button>
                            <span className="font-mono text-[10px] text-slate-200">{item.symbol}</span>
                          </div>
                          <div className="text-right font-mono text-[9px] -space-y-0.5">
                            <div className="text-slate-300 font-extrabold leading-none">{item.price.toFixed(item.decimals > 2 ? 4 : 2)}</div>
                            <div className={item.change >= 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                              {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* Assets list holdings & Donut Allocations panel */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-905' : 'bg-white border-slate-200'} space-y-4 flex flex-col`}>
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider border-b border-slate-900 pb-2">
                <span className="text-white">Assets Breakdown</span>
              </div>

              {/* Elegant SVG donut visual with legends side-by-side */}
              <div className="flex items-center justify-between gap-4 py-1">
                <div className="relative flex items-center justify-center">
                  {/* SVG circular overlay representing allocation bands */}
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    {/* Ring 1 base */}
                    <circle cx="50" cy="50" r="38" stroke="#1e293b" strokeWidth="10" fill="transparent" />
                    {/* Segment 1: USDT (45%) */}
                    <circle cx="50" cy="50" r="38" stroke="#10b981" strokeWidth="10" 
                      strokeDasharray="238.7" strokeDashoffset="131.285" fill="transparent" />
                    {/* Segment 2: BTC (28%) */}
                    <circle cx="50" cy="50" r="38" stroke="#f59e0b" strokeWidth="10" 
                      strokeDasharray="238.7" strokeDashoffset="198.12" fill="transparent" />
                    {/* Segment 3: ETH (15%) */}
                    <circle cx="50" cy="50" r="38" stroke="#3b82f6" strokeWidth="10" 
                      strokeDasharray="238.7" strokeDashoffset="212" fill="transparent" />
                    {/* Segment 4: Others (12%) */}
                    <circle cx="50" cy="50" r="38" stroke="#8b5cf6" strokeWidth="10" 
                      strokeDasharray="238.7" strokeDashoffset="228.8" fill="transparent" />
                  </svg>
                  <div className="absolute text-center select-none font-mono -space-y-0.5">
                    <div className="text-slate-400 text-[8px] font-black uppercase">PORTFOLIO</div>
                    <div className="text-[10px] font-black text-white leading-none">REAL</div>
                  </div>
                </div>

                {/* Legends */}
                <div className="flex-1 space-y-1.5 font-mono text-[9px] text-slate-450 uppercase select-none">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 block" /> USDT (45.3%)</span>
                    <span className="font-bold text-slate-300">$11,637</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500 block" /> BTC (28.1%)</span>
                    <span className="font-bold text-slate-300">$7,215</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500 block" /> ETH (15.2%)</span>
                    <span className="font-bold text-slate-300">$3,903</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500 block" /> OTHERS (11.3%)</span>
                    <span className="font-bold text-slate-300">$2,923</span>
                  </div>
                </div>
              </div>

               <div className="grid grid-cols-3 gap-2">
                 <button 
                   onClick={() => handleOpenCashierWithTab('deposit')}
                   className="border border-slate-905 hover:bg-slate-900 border-dashed rounded text-[9px] font-bold text-slate-350 py-1.5 text-center uppercase cursor-pointer"
                 >
                   Deposit
                 </button>
                 <button 
                   onClick={() => handleOpenCashierWithTab('withdraw')}
                   className="border border-slate-905 hover:bg-slate-900 border-dashed rounded text-[9px] font-bold text-slate-350 py-1.5 text-center uppercase cursor-pointer"
                 >
                   Withdraw
                 </button>
                 <button 
                   onClick={() => triggerToast("Transfer sandbox loading...", true)}
                   className="border border-slate-905 hover:bg-slate-900 border-dashed rounded text-[9px] font-bold text-slate-350 py-1.5 text-center uppercase cursor-pointer"
                 >
                   Transfer
                 </button>
               </div>
            </div>

            {/* AI Grid Trading Bot Promo Card Banner */}
            <div className="p-5 rounded-xl bg-gradient-to-tr from-indigo-950/40 via-purple-950/20 to-slate-950 border border-purple-500/10 shadow-xl space-y-4 flex flex-col relative overflow-hidden group select-none">
              <div className="absolute right-2 -bottom-2 w-24 h-24 opacity-10 pointer-events-none group-hover:scale-105 transition-transform">
                {/* Visual SVG robot outline coordinates */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2V6M12 18V22M4 12H1M23 12H20M5.6 5.6L3.5 3.5M20.5 20.5L18.4 18.4M5.6 18.4L3.5 20.5M20.5 3.5L18.4 5.6" />
                  <circle cx="12" cy="12" r="6" />
                </svg>
              </div>

              <div>
                <span className="inline-flex items-center space-x-1.5 bg-purple-500/25 border border-purple-500/30 text-purple-300 rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider block w-max">
                  <Bot className="w-3 h-3 animate-spin text-purple-400" />
                  <span>AI Arbitrage Bot Active</span>
                </span>
                <h3 className="text-xs font-black text-white uppercase tracking-wide mt-2">DEPLOY AI STRATEGIES</h3>
                <p className="text-[10px] text-slate-400 mt-1">Configure grid arbitrage parameters, multi-barrier indices strategies, and cash out targets mechanically.</p>
              </div>

              <button 
                onClick={() => setIsCopilotOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 hover:border-indigo-400 font-extrabold text-white text-[10px] uppercase py-2 tracking-wider rounded transition-all text-center select-none shadow-[0_4px_12px_rgba(79,70,229,0.3)] animate-pulse"
              >
                Launch AI Grid Board
              </button>
            </div>

            {/* Live Market News Streams */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-205'} space-y-4 flex flex-col`}>
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider border-b border-slate-900 pb-2">
                <span className="text-white">Live Cryptosphere News</span>
              </div>

              <div className="space-y-3.5 select-none font-sans text-xs">
                {[
                  {
                    id: 1,
                    title: "Bitcoin Options Spot Volatility Peeks High at $68,000 Expiring Contracts",
                    time: "2 min ago",
                    opinion: "Bitcoin's spot price hover is ideal for Digit Over/Under execution. Arbitrage indices recommend options with 15 Ticks targets."
                  },
                  {
                    id: 2,
                    title: "MFLOW Index Breakout Coordinates Signal Consolidation Mode",
                    time: "15 min ago",
                    opinion: "The moving average shows MFLOW is approaching immediate support levels. Try purchasing Rise options at touch bounds."
                  },
                  {
                    id: 3,
                    title: "LWEX Certified as Secure Institutional High-Frequency Derivatives Outlet",
                    time: "1 hour ago",
                    opinion: "Corporate licensing has authorized secure fast-walk smart indexes on the main catalog. Stable connections and real-time ledger verify real security."
                  }
                ].map((news) => (
                  <div 
                    key={news.id}
                    onClick={() => setNewsDetail(news)}
                    className="hover:bg-slate-900/30 p-2.5 rounded-lg border border-transparent hover:border-slate-900 transition-all cursor-pointer space-y-1 block -mx-2.5"
                  >
                    <div className="flex justify-between items-center text-[9px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono uppercase font-black"><BadgeAlert className="w-3 h-3 text-amber-500" /> NEWS ALERTER</span>
                      <span className="font-mono">{news.time}</span>
                    </div>
                    <p className="text-[11px] font-bold leading-snug text-slate-200 hover:text-white line-clamp-2">{news.title}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1 block leading-normal">{news.opinion}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Interactive Alerts component */}
            <PriceAlertsManager 
              theme={theme}
              activeAsset={activeAsset}
              priceAlerts={priceAlerts}
              onAddAlert={handleAddPriceAlert}
              onDeleteAlert={handleDeletePriceAlert}
            />

          </div>

        </div>

      </div>

        {/* ========================================================= */}
        {/* 2.4 SECURE DISH NEWS POPUP OVERLAYS */}
        {/* ========================================================= */}
        {newsDetail && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative transform scale-100 transition-all">
              <button 
                onClick={() => setNewsDetail(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-2 text-[10px] text-amber-500 font-mono tracking-wider font-extrabold uppercase">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Wizard Market Commentary</span>
              </div>

              <h4 className="text-sm font-extrabold text-white leading-snug">{newsDetail.title}</h4>

              <div className="p-4 rounded-xl bg-slate-950 text-xs text-slate-300 leading-relaxed font-mono border border-slate-850 space-y-2">
                <span className="font-black text-emerald-500 block uppercase text-[10px]">Wizard AI Analysis:</span>
                <p>{newsDetail.opinion}</p>
                <p className="text-[9px] text-slate-400">Disclaimer: Esoteric mathematical models exhibit drift variance. Ensure proper stake bounds on binary option contracts.</p>
              </div>

              <button 
                onClick={() => { setNewsDetail(null); setIsCopilotOpen(true); }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase py-2 rounded transition-colors text-center block"
              >
                Ask Wizard Bot
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2.5 CLIENT-SIDE FOOTER SECTION (Matches Platform Constraints) */}
        {/* ======================================================== */}
        <footer className={`h-11 border-t text-[10px] font-mono flex items-center justify-between px-6 select-none shrink-0 transition-colors ${
          theme === 'dark' ? 'border-slate-900 bg-slate-950 text-slate-500' : 'border-gray-200 bg-white text-gray-450'
        }`}>
          <div className="flex items-center space-x-4">
            <span>© 2026 LWEX INC.</span>
            <span className="hidden md:inline text-slate-650">•</span>
            <span className="hidden md:inline">Terms of Services</span>
            <span className="hidden md:inline">Privacy Protocol</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[9px] font-bold text-amber-500/80">
            <Shield className="w-3.5 h-3.5" />
            <span>INSTITUTIONALLY LICENSED BY DERIV INDEX GATEWAY</span>
          </div>
        </footer>

      </div>

      {/* FLOAT COPILOT AI OVERLAY TRIGGER BTN */}
      {!isCopilotOpen && (
        <button 
          onClick={() => setIsCopilotOpen(true)}
          className={`fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer ${
            isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
          title="Ask Wizard Bot for market reports"
        >
          <Bot className="h-6 h-6 animate-pulse" />
        </button>
      )}

      {/* ============================================== */}
      {/* 4. MODALS & CO-PILOT SLIDERS */}
      {/* ============================================== */}
      <WizardBot 
        theme={theme}
        asset={activeAsset}
        tickHistory={activeTicks}
        indicatorConfig={indicatorConfig}
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        currentUser={currentUser}
        onTriggerAuth={handleTriggerAuth}
        triggerToast={triggerToast}
      />

      <CashierModal 
        isOpen={isCashierOpen}
        onClose={() => setIsCashierOpen(false)}
        account={account}
        onDeposit={handleDepositCashier}
        onWithdraw={handleWithdrawCashier}
        currentUser={currentUser}
        theme={theme}
        gameSettings={gameSettings}
      />

      <GuideModal 
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        account={account}
        theme={theme}
        currentUser={currentUser}
        onUpdateUser={setCurrentUser}
        onLogout={() => setCurrentUser(null)}
      />

      <InviteModal 
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        currentUser={currentUser}
        theme={theme}
        triggerToast={triggerToast}
      />

      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        theme={theme}
        onSuccess={setCurrentUser}
        initialView={authModalInitialView}
      />

      <AdminDashboard 
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        theme={theme}
      />

    </div>
  );
}

// Inline fallback icons for safety to avoid build crashes
function CoinsIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="8" cy="8" r="6" />
      <circle cx="18" cy="18" r="4" />
      <path d="M12 18a6 6 0 0 0-6-6" />
    </svg>
  );
}
