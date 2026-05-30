import React, { useState, useEffect } from 'react';
import { X, Users, TrendingUp, DollarSign, ArrowDownCircle } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'deposits' | 'withdrawals' | 'game'>('stats');
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const [completedDeposits, setCompletedDeposits] = useState<CompletedDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [gameSettings, setGameSettings] = useState<GameSettings>({ globalTrendBias: 0, volatilityMultiplier: 1, realWinRate: 30 });
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User & { newPassword?: string } | null>(null);

  // Poll for real-time updates every 10 seconds while authenticated
  useEffect(() => {
    if (!isOpen || !isAuthenticated || activeTab === 'game' || activeTab === 'stats' || activeTab === 'users') return;
    
    const intervalId = setInterval(() => {
      fetch('/api/admin/transactions', { headers: { 'x-admin-key': adminKey } })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setPendingDeposits(data.pendingDeposits || []);
            setCompletedDeposits(data.completedDeposits || []);
            setWithdrawals(data.withdrawals || []);
          }
        });
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
        setGameSettings(gameData.settings ? { ...gameData.settings, realWinRate: gameData.settings.realWinRate ?? 30 } : { globalTrendBias: 0, volatilityMultiplier: 1, realWinRate: 30 });
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
          newPassword: editingUser.newPassword
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
                { id: 'game', label: 'Game Control', icon: DollarSign }
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
                            <td className="border p-3 text-xs">{user.fullName}</td>
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
