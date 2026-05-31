import React from 'react';
import { TrendingUp, TrendingDown, Clock, Activity, Award } from 'lucide-react';
import { Contract, TradeHistoryItem } from '../types';

interface PositionsListProps {
  theme?: 'dark' | 'light';
  activeContracts: Contract[];
  closedContracts: TradeHistoryItem[];
  onSellContract: (contractId: string) => void;
  activeTab: 'positions' | 'statements' | 'stats';
  onChangeTab: (tab: 'positions' | 'statements' | 'stats') => void;
  cashoutMode?: 'enabled' | 'disabled' | 'smart';
}

export default function PositionsList({
  theme = 'light',
  activeContracts,
  closedContracts,
  onSellContract,
  activeTab,
  onChangeTab,
  cashoutMode = 'enabled'
}: PositionsListProps) {
  const isDark = theme === 'dark';

  const formatValue = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Compute overall statistics
  const totalTrades = closedContracts.length;
  const winningTrades = closedContracts.filter(c => c.status === 'won').length;
  const losingTrades = closedContracts.filter(c => c.status === 'lost').length;
  const soldTrades = closedContracts.filter(c => c.status === 'sold').length;
  const winRate = totalTrades > 0 ? (winningTrades / (totalTrades - soldTrades || totalTrades)) * 100 : 0;
  const netEarnings = closedContracts.reduce((sum, item) => sum + item.profit, 0);

  return (
    <div className={`flex flex-col rounded-xl border overflow-hidden shadow-sm flex-1 transition-colors ${
      isDark ? 'border-slate-800 bg-slate-900/50 backdrop-blur-md text-white' : 'border-gray-200/60 bg-white text-black'
    }`}>
      {/* Tab navigators */}
      <div className={`flex h-12 items-center justify-between border-b px-4 ${
        isDark ? 'border-slate-800 bg-slate-950/60' : 'border-gray-100 bg-white'
      }`}>
        <div className="flex space-x-1">
          <button
            onClick={() => onChangeTab('positions')}
            className={`relative flex h-12 items-center px-4 text-xs font-bold uppercase transition-all tracking-wide border-b-2 cursor-pointer ${
              activeTab === 'positions'
                ? isDark ? 'border-yellow-400 text-yellow-400 font-extrabold shadow-[0_4px_12px_-4px_rgba(20,184,166,0.5)]' : 'border-black text-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>Open Positions</span>
            {activeContracts.length > 0 && (
              <span className={`ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[9px] font-extrabold ${
                isDark ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-black text-white'
              }`}>
                {activeContracts.length}
              </span>
            )}
          </button>
 
          <button
            onClick={() => onChangeTab('statements')}
            className={`relative flex h-12 items-center px-4 text-xs font-bold uppercase transition-all tracking-wide border-b-2 cursor-pointer ${
              activeTab === 'statements'
                ? isDark ? 'border-yellow-400 text-yellow-400 font-extrabold shadow-[0_4px_12px_-4px_rgba(20,184,166,0.5)]' : 'border-black text-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Statements
          </button>
 
          <button
            onClick={() => onChangeTab('stats')}
            className={`relative flex h-12 items-center px-4 text-xs font-bold uppercase transition-all tracking-wide border-b-2 cursor-pointer ${
              activeTab === 'stats'
                ? isDark ? 'border-yellow-400 text-yellow-400 font-extrabold shadow-[0_4px_12px_-4px_rgba(20,184,166,0.5)]' : 'border-black text-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Metrics & Stats
          </button>
        </div>

        <div className="flex items-center space-x-1.5 text-[10px] text-gray-405 font-mono">
          <Activity className="h-3.5 w-3.5 text-red-500 animate-pulse" />
          <span>Real-time Ticker Feed</span>
        </div>
      </div>

      {/* Content screen */}
      <div className="flex-1 p-4 overflow-y-auto max-h-[300px] min-h-[180px]">
        {/* TAB 1: ACTIVE CONTRACTS */}
        {activeTab === 'positions' && (
          <div className="space-y-3">
            {activeContracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2 text-gray-400">
                <Clock className="h-8 w-8 text-gray-255" />
                <span className="font-mono text-xs">No active running contracts. Select rise/fall trade options.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeContracts.map((contract) => {
                  const isProfit = contract.currentProfit >= 0;
                  const isTickUnit = contract.durationUnit === 'ticks';

                  return (
                    <div
                      key={contract.id}
                      className={`rounded-lg border p-3.5 space-y-3.5 shadow-sm transition-all ${
                        isDark ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 shadow-[inset_0_1px_rgba(255,255,255,0.02)]' : 'border-gray-100 bg-gray-50/20 hover:border-gray-100'
                      }`}
                    >
                      {/* Top status */}
                      <div className={`flex items-center justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-tight block">
                            {contract.assetName}
                          </span>
                          <span className="text-[9px] font-mono font-semibold text-gray-400 block -mt-0.5">
                            #{contract.id.substring(0, 8)} | {contract.type.replace('-', ' ').toUpperCase()}
                          </span>
                        </div>
                        <span className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          contract.direction === 'rise' || contract.direction === 'higher' || contract.direction === 'touch'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-red-500/10 text-red-600'
                        }`}>
                          {contract.direction === 'rise' && <span>BUY LONG ▲</span>}
                          {contract.direction === 'fall' && <span>SELL SHORT ▼</span>}
                          {contract.direction === 'higher' && <span>HIGHER ▲</span>}
                          {contract.direction === 'lower' && <span>LOWER ▼</span>}
                          {contract.direction === 'touch' && <span>TOUCH ★</span>}
                          {contract.direction === 'no-touch' && <span>NO TOUCH ✖</span>}
                        </span>
                      </div>

                      {/* Tick details indicators */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="block text-[9px] text-gray-400 font-bold uppercase">Barrier Level</span>
                          <span className="font-mono font-bold">{contract.entryPrice.toFixed(4)}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] text-gray-400 font-bold uppercase">Active Price</span>
                          <span className={`font-mono font-bold ${
                            isProfit ? "text-green-600" : "text-red-500"
                          }`}>{contract.currentPrice.toFixed(4)}</span>
                        </div>
                      </div>

                      {/* Duration Progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-gray-400 font-bold uppercase">
                          <span>Ticks Completed</span>
                          <span className="font-mono">
                            {contract.ticksPassed} / {contract.duration} {contract.durationUnit}
                          </span>
                        </div>
                        {isTickUnit ? (
                          <div className="flex space-x-1 justify-center py-1">
                            {Array.from({ length: contract.duration }).map((_, i) => (
                              <span
                                key={i}
                                className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                                  i < contract.ticksPassed ? 'bg-black' : isDark ? 'bg-zinc-800' : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className={`w-full rounded-full h-1 ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                            <div
                              className="bg-black h-1 rounded-full transition-all duration-300"
                              style={{ width: `${(contract.ticksPassed / contract.duration) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Live Profit */}
                      <div className={`flex items-center justify-between border-t pt-2 ${isDark ? 'border-zinc-850' : 'border-gray-100'}`}>
                        <div>
                          <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                            Real Profit
                          </span>
                          <span className={`font-mono text-xs font-extrabold tracking-tight ${
                            isProfit ? 'text-green-600' : 'text-red-500'
                          }`}>
                            {isProfit ? '+' : ''}${contract.currentProfit.toFixed(2)}
                          </span>
                        </div>

                        {/* Early buyout */}
                        {cashoutMode === 'disabled' ? (
                          <span className={`text-[9px] font-mono font-bold tracking-tight px-3 py-1.5 border rounded opacity-60 select-none ${
                            isDark ? 'bg-zinc-900 border-zinc-850 text-slate-500' : 'bg-gray-50 border-gray-150 text-gray-400'
                          }`}>
                            CASHOUT LOCKED
                          </span>
                        ) : cashoutMode === 'smart' && contract.currentProfit >= 0 ? (
                          <span className={`text-[9px] font-mono font-bold tracking-tight px-3 py-1.5 border rounded select-none ${
                            isDark ? 'bg-amber-950/20 border-amber-900/40 text-amber-500' : 'bg-amber-50 border-amber-100 text-amber-600'
                          }`} title="Smart Mode prevents early liquidations of winning positions. Let option run to expiration.">
                            PROFIT LOCKED
                          </span>
                        ) : (
                          <button
                            onClick={() => onSellContract(contract.id)}
                            className={`rounded font-mono text-[9px] font-bold tracking-tight px-3 py-1.5 border transition-colors ${
                              isDark
                                ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
                                : 'bg-white border-gray-200 text-black hover:bg-gray-50'
                            }`}
                          >
                            CASH OUT: ${formatValue(contract.sellPrice || 0)}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CLOSED STATEMENTS */}
        {activeTab === 'statements' && (
          <div className="space-y-1.5">
            {closedContracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2 text-gray-400">
                <Clock className="h-8 w-8 text-gray-255" />
                <span className="font-mono text-xs">No entries in the statements log yet. Let's make some trades!</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className={`text-gray-400 uppercase font-sans text-[9px] tracking-wider border-b select-none ${
                    isDark ? 'border-zinc-800' : 'border-gray-100'
                  }`}>
                    <tr>
                      <th className="p-2.5 font-bold">Contract ID</th>
                      <th className="p-2.5 font-bold">Asset Type</th>
                      <th className="p-2.5 font-bold">Contract Type</th>
                      <th className="p-2.5 font-bold text-right">Entry</th>
                      <th className="p-2.5 font-bold text-right">Exit</th>
                      <th className="p-2.5 font-bold text-right">Stake</th>
                      <th className="p-2.5 font-bold text-right">Payout</th>
                      <th className="p-2.5 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-zinc-900/60' : 'divide-gray-100'}`}>
                    {closedContracts.slice().reverse().map((item) => {
                      const isProfit = item.profit >= 0;
                      return (
                        <tr key={item.id} className={`transition-colors ${isDark ? 'hover:bg-zinc-900/30' : 'hover:bg-gray-50/50'}`}>
                          <td className="p-2.5 text-gray-400 font-mono">#{item.id.substring(0, 8)}</td>
                          <td className="p-2.5 font-sans font-bold">{item.assetName}</td>
                          <td className="p-2.5">
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-bold tracking-tighter ${
                              item.direction === 'rise' || item.direction === 'higher' || item.direction === 'touch'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-red-500/10 text-red-500'
                            }`}>
                              {item.direction === 'rise' ? 'BUY LONG' : item.direction === 'fall' ? 'SELL SHORT' : item.direction.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono text-gray-400">{item.entryPrice.toFixed(4)}</td>
                          <td className="p-2.5 text-right font-mono text-gray-400">{item.exitPrice.toFixed(4)}</td>
                          <td className="p-2.5 text-right text-gray-400">${item.stake.toFixed(2)}</td>
                          <td className={`p-2.5 text-right font-semibold ${
                            isProfit ? "text-green-600" : "text-gray-400"
                          }`}>
                            {isProfit ? '+' : ''}${item.profit.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-center">
                            {item.status === 'won' && (
                              <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-[8px] font-bold text-green-600">
                                WINNER
                              </span>
                            )}
                            {item.status === 'lost' && (
                              <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[8px] font-bold text-red-500">
                                LOSS
                              </span>
                            )}
                            {item.status === 'sold' && (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[8px] font-bold text-gray-500">
                                SOLD
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TRADING METRICS */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Box 1 */}
              <div className={`rounded-xl border p-4 flex items-center justify-between ${
                isDark ? 'border-zinc-800 bg-zinc-900' : 'border-gray-150 bg-gray-50/40'
              }`}>
                <div>
                  <span className="block text-[9px] text-gray-400 uppercase tracking-wider font-bold">
                    Net Return Balance
                  </span>
                  <span className={`font-mono text-base font-extrabold ${
                    netEarnings >= 0 ? 'text-green-600' : 'text-red-505'
                  }`}>
                    {netEarnings >= 0 ? '+' : ''}${netEarnings.toFixed(2)}
                  </span>
                </div>
                <div className={`p-2 rounded ${netEarnings >= 0 ? 'bg-green-105 text-green-600' : 'bg-red-55/10 text-red-550'}`}>
                  {netEarnings >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
              </div>

              {/* Box 2 */}
              <div className={`rounded-xl border p-4 flex items-center justify-between ${
                isDark ? 'border-zinc-800 bg-zinc-900' : 'border-gray-150 bg-gray-50/40'
              }`}>
                <div>
                  <span className="block text-[9px] text-gray-400 uppercase tracking-wider font-bold">
                    Historical Win Rate
                  </span>
                  <span className="font-mono text-base font-extrabold text-[#111827]">
                    {winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="p-2 rounded bg-black/5 text-black">
                  <Award className="h-4 w-4" />
                </div>
              </div>

              {/* Box 3 */}
              <div className={`rounded-xl border p-4 flex items-center justify-between ${
                isDark ? 'border-zinc-800 bg-zinc-900' : 'border-gray-150 bg-gray-50/40'
              }`}>
                <div>
                  <span className="block text-[9px] text-gray-400 uppercase tracking-wider font-bold">
                    Contracts Closed
                  </span>
                  <span className="font-mono text-base font-extrabold text-yellow-600">
                    {totalTrades}
                  </span>
                </div>
                <div className="p-2 rounded bg-blue-50/10 text-yellow-600">
                  <Activity className="h-4 w-4" />
                </div>
              </div>

              {/* Box 4 */}
              <div className={`rounded-xl border p-4 flex items-center justify-between ${
                isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-gray-150 bg-gray-55/10'
              }`}>
                <div className="w-full space-y-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-[9px] font-bold">PROFITABLE</span>
                    <span className="text-green-600 font-extrabold">{winningTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-[9px] font-bold">UNSUCCESSFUL</span>
                    <span className="text-red-500 font-extrabold">{losingTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-[9px] font-bold">EARLY EXITS</span>
                    <span className="text-gray-500 font-extrabold">{soldTrades}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance yield ratio */}
            {totalTrades > 0 && (
              <div className={`p-4 rounded-xl border space-y-2.5 ${
                isDark ? 'border-zinc-800 bg-zinc-900' : 'border-gray-100 bg-gray-50/30'
              }`}>
                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                  <span>Trading efficiency status</span>
                  <span className={`font-extrabold ${isDark ? 'text-amber-400' : 'text-black'}`}>{winRate > 60 ? 'Master' : winRate > 40 ? 'Professional' : 'Beginner'}</span>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded bg-slate-950/25">
                  <div
                    className="bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(winningTrades / totalTrades) * 100}%` }}
                    title="Wins"
                  />
                  <div
                    className="bg-gray-400 transition-all duration-500"
                    style={{ width: `${(soldTrades / totalTrades) * 100}%` }}
                    title="Early Buyouts"
                  />
                  <div
                    className="bg-red-500 transition-all duration-500"
                    style={{ width: `${(losingTrades / totalTrades) * 100}%` }}
                    title="Losses"
                  />
                </div>
                <div className="flex justify-between text-[9px] text-gray-450 font-extrabold font-mono pt-1">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-500 block" /> PROFITABLE ({winningTrades})</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-gray-400 block" /> EARLY EXITS ({soldTrades})</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-red-500 block" /> UNSUCCESSFUL ({losingTrades})</span>
                </div>
              </div>
            )}

            {/* Asset Allocations & Portfolio Distribution Box */}
            <div className={`p-4 rounded-xl border space-y-4 ${
              isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-gray-150 bg-white'
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Asset Allocations</h4>
                  <p className="text-[10px] text-gray-500">Live diversification of margin positions</p>
                </div>
                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-black font-mono">
                  ACTIVE RATIO
                </span>
              </div>

              <div className="space-y-3">
                {/* Visual bar graph */}
                <div className="flex h-3 w-full overflow-hidden rounded bg-slate-950/20">
                  <div className="bg-amber-500" style={{ width: '55%' }} title="Synthetic Syndicate options: 55%" />
                  <div className="bg-purple-500" style={{ width: '25%' }} title="Crypto Neptune options: 25%" />
                  <div className="bg-teal-500" style={{ width: '20%' }} title="Forex Anchor pairs: 20%" />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className={`p-2.5 rounded-lg border text-center ${isDark ? 'bg-zinc-900/20 border-zinc-805/30' : 'bg-gray-50 border-gray-100'}`}>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">Syndicates</span>
                    <span className="block text-xs font-black font-mono text-amber-500 mt-0.5">55.0%</span>
                  </div>
                  <div className={`p-2.5 rounded-lg border text-center ${isDark ? 'bg-zinc-900/20 border-zinc-805/30' : 'bg-gray-50 border-gray-100'}`}>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">Cryptos</span>
                    <span className="block text-xs font-black font-mono text-purple-400 mt-0.5">25.0%</span>
                  </div>
                  <div className={`p-2.5 rounded-lg border text-center ${isDark ? 'bg-zinc-900/20 border-zinc-805/30' : 'bg-gray-50 border-gray-100'}`}>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">Forex</span>
                    <span className="block text-xs font-black font-mono text-teal-400 mt-0.5">20.0%</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-700/30 pt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Balanced Distribution Scale:</span>
                  <span className="text-emerald-500 font-extrabold uppercase font-mono">🟢 OPTIMIZED</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
