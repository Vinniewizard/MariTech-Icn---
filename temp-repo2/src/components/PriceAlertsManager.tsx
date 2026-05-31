import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Trash2, ArrowUpCircle, ArrowDownCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Asset, PriceAlert } from '../types';

interface PriceAlertsManagerProps {
  theme: 'dark' | 'light';
  activeAsset: Asset;
  priceAlerts: PriceAlert[];
  onAddAlert: (targetPrice: number, condition: 'above' | 'below') => void;
  onDeleteAlert: (id: string) => void;
}

export default function PriceAlertsManager({
  theme,
  activeAsset,
  priceAlerts,
  onAddAlert,
  onDeleteAlert
}: PriceAlertsManagerProps) {
  const isDark = theme === 'dark';
  const [alertPrice, setAlertPrice] = useState<string>('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');

  // Sync input value with current active price whenever asset changes
  useEffect(() => {
    if (activeAsset) {
      setAlertPrice(activeAsset.price.toFixed(activeAsset.decimals));
    }
  }, [activeAsset]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(alertPrice);
    if (!isNaN(parsed) && parsed > 0) {
      onAddAlert(parsed, condition);
    }
  };

  // Quick percent pricing helpers
  const applyPercentOffset = (percent: number) => {
    const base = activeAsset.price;
    const offsetPrice = base * (1 + percent / 100);
    setAlertPrice(offsetPrice.toFixed(activeAsset.decimals));
  };

  // Filter alerts specifically for the active asset vs others
  const activeAssetAlerts = priceAlerts.filter(a => a.assetId === activeAsset.id);
  const otherAssetsAlerts = priceAlerts.filter(a => a.assetId !== activeAsset.id);

  return (
    <div
      className={`rounded-xl border p-5 shadow-sm space-y-4 transition-colors ${
        isDark ? 'border-slate-800 bg-slate-900/50 backdrop-blur-md text-white' : 'border-gray-200 bg-white text-black'
      }`}
    >
      {/* HEADER WITH BELL ICON */}
      <div className="flex items-center justify-between border-b pb-2.5 border-dashed border-slate-700/30">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-550">
            {activeAssetAlerts.some(a => !a.isTriggered) ? (
              <BellRing className="h-4 w-4 animate-ring text-purple-400" />
            ) : (
              <Bell className="h-4 w-4 text-purple-400" />
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider">Price Alerts</h3>
            <p className="text-[9px] text-gray-400">Notify when target price triggers</p>
          </div>
        </div>
        <span className="font-mono text-[10px] bg-slate-500/10 px-1.5 py-0.5 rounded text-gray-400 font-bold">
          {priceAlerts.filter(a => !a.isTriggered).length} Active
        </span>
      </div>

      {/* CREATE ALERT FORM */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-md p-0.5 border border-slate-800/20 bg-slate-950/20">
          <button
            type="button"
            onClick={() => setCondition('above')}
            className={`flex items-center justify-center space-x-1.5 py-1.5 text-[9px] font-bold uppercase rounded cursor-pointer transition-all ${
              condition === 'above'
                ? 'bg-green-500 text-white shadow-sm font-black'
                : 'text-gray-400 hover:text-white hover:bg-slate-900/30'
            }`}
          >
            <ArrowUpCircle className="h-3 w-3" />
            <span>Goes Above</span>
          </button>
          <button
            type="button"
            onClick={() => setCondition('below')}
            className={`flex items-center justify-center space-x-1.5 py-1.5 text-[9px] font-bold uppercase rounded cursor-pointer transition-all ${
              condition === 'below'
                ? 'bg-red-500 text-white shadow-sm font-black'
                : 'text-gray-400 hover:text-white hover:bg-slate-900/30'
            }`}
          >
            <ArrowDownCircle className="h-3 w-3" />
            <span>Goes Below</span>
          </button>
        </div>

        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Target Price ({activeAsset.symbol})
          </label>
          <div
            className={`flex rounded-md border items-center overflow-hidden h-9 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <input
              type="number"
              step="any"
              value={alertPrice}
              onChange={(e) => setAlertPrice(e.target.value)}
              className="w-full bg-transparent px-3 text-left font-mono text-xs font-semibold focus:outline-none"
              placeholder="0.00"
            />
            <button
              type="button"
              onClick={() => setAlertPrice(activeAsset.price.toFixed(activeAsset.decimals))}
              className={`px-2.5 h-full text-[9px] font-bold border-l transition-colors hover:bg-purple-550/10 ${
                isDark ? 'border-slate-800 text-purple-400' : 'border-gray-200 text-purple-600'
              }`}
              title="Reset to current market price"
            >
              Market
            </button>
          </div>
        </div>

        {/* QUICK PERCENT CLICKS */}
        <div className="grid grid-cols-4 gap-1">
          {[-1, -0.1, 0.1, 1].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => applyPercentOffset(p)}
              className={`rounded py-1 text-[9px] font-mono hover:bg-purple-600 hover:text-white transition-all cursor-pointer border ${
                isDark
                  ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-purple-650'
                  : 'border-gray-200 bg-gray-50/50 text-gray-550 hover:border-purple-600'
              }`}
            >
              {p > 0 ? `+${p}%` : `${p}%`}
            </button>
          ))}
        </div>

        <button
          type="submit"
          className="w-full py-2 rounded-md bg-purple-605 bg-purple-600 hover:bg-purple-655 text-white text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm shadow-purple-900/10"
        >
          <Bell className="h-3.5 w-3.5" />
          <span>Set Alert</span>
        </button>
      </form>

      {/* PRICE ALERTS DIRECTORY LIST */}
      <div className="space-y-2 pt-2 border-t border-slate-800/10">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
          Alert Panel List
        </h4>

        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
          <AnimatePresence initial={false}>
            {priceAlerts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`flex flex-col items-center justify-center py-5 border rounded-lg text-center ${
                  isDark ? 'bg-slate-950/20 border-slate-800' : 'bg-gray-50/30 border-gray-100'
                }`}
              >
                <AlertCircle className="h-5 w-5 text-gray-400 opacity-60 mb-1" />
                <span className="text-[9px] text-gray-400 font-medium">No active price alerts set.</span>
              </motion.div>
            ) : (
              [...activeAssetAlerts, ...otherAssetsAlerts].map((alert) => {
                const isCurrent = alert.assetId === activeAsset.id;
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                      alert.isTriggered
                        ? isDark
                          ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-300 opacity-80'
                          : 'bg-emerald-50 border-emerald-100 text-emerald-850 opacity-80'
                        : !isCurrent
                        ? isDark
                          ? 'bg-slate-950/30 border-slate-900 text-gray-400'
                          : 'bg-gray-50/50 border-gray-100 text-gray-400'
                        : isDark
                        ? 'bg-slate-950/80 border-slate-850 text-white shadow-xs'
                        : 'bg-white border-gray-150 text-black shadow-xs'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold uppercase text-[9px] truncate">
                          {alert.assetSymbol}
                        </span>
                        {!isCurrent && (
                          <span className="text-[7.5px] font-mono px-1 py-[0.5px] rounded border border-gray-800/30 bg-slate-500/5 text-gray-400 text-[8px]">
                            Other
                          </span>
                        )}
                        {alert.isTriggered && (
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-bold px-1 py-[0.5px] rounded animate-pulse uppercase">
                            Triggered
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] font-mono mt-0.5">
                        <span className={alert.condition === 'above' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                          {alert.condition === 'above' ? '≥' : '≤'}
                        </span>
                        <span className="font-bold text-[11px]">
                          {alert.targetPrice}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteAlert(alert.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete price alert"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
