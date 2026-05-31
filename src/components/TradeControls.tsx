import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, HelpCircle, ChevronDown, DollarSign } from 'lucide-react';
import { Asset, ContractType } from '../types';

interface TradeControlsProps {
  theme?: 'dark' | 'light';
  assets: Asset[];
  selectedAsset: Asset;
  onSelectAsset: (asset: Asset) => void;
  triggerToast: (text: string, success: boolean) => void;
  onPurchase: (config: {
    type: ContractType;
    direction: 'rise' | 'fall' | 'higher' | 'lower' | 'touch' | 'no-touch' | 'over' | 'under';
    stake: number;
    duration: number;
    durationUnit: 'ticks' | 'seconds' | 'minutes';
    barrierOffset?: number;
    targetDigit?: number;
  }) => void;
  balance: number;
}

export default function TradeControls({
  theme = 'light',
  assets,
  selectedAsset,
  onSelectAsset,
  triggerToast,
  onPurchase,
  balance
}: TradeControlsProps) {
  const [showAssetList, setShowAssetList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contractType, setContractType] = useState<ContractType>('rise-fall');
  const [durationUnit, setDurationUnit] = useState<'ticks' | 'seconds' | 'minutes'>('ticks');
  const [durationValue, setDurationValue] = useState<number>(5);
  const [stake, setStake] = useState<number>(10);
  const [barrierOffset, setBarrierOffset] = useState<number>(0.5);
  const [targetDigit, setTargetDigit] = useState<number>(5);

  const handleSelectTargetDigit = (d: number) => {
    if (d >= 0 && d <= 9) {
      setTargetDigit(d);
    }
  };

  const isDark = theme === 'dark';

  // Auto adjusting durations when changing units
  useEffect(() => {
    if (durationUnit === 'ticks') {
      setDurationValue(5);
    } else if (durationUnit === 'seconds') {
      setDurationValue(30);
    } else {
      setDurationValue(2);
    }
  }, [durationUnit]);

  // Adjust default offsets on asset exchange
  useEffect(() => {
    if (selectedAsset.id.includes('EURUSD') || selectedAsset.id.includes('GBPUSD')) {
      setBarrierOffset(0.00025);
    } else if (selectedAsset.id.includes('BTCUSD')) {
      setBarrierOffset(15.0);
    } else if (selectedAsset.id.includes('R_75')) {
      setBarrierOffset(5.5);
    } else {
      setBarrierOffset(0.5);
    }
  }, [selectedAsset]);

  const handleAssetSelect = (asset: Asset) => {
    onSelectAsset(asset);
    setShowAssetList(false);
  };

  const handlePresetStake = (val: number) => {
    setStake(val);
  };

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Yield multiplier: 95.5% payout return of stake
  const payoutRate = 0.955;
  const payoutPotential = stake * (1 + payoutRate);
  const netProfit = stake * payoutRate;

  const initiatePurchase = (dir: 'rise' | 'fall' | 'higher' | 'lower' | 'touch' | 'no-touch' | 'over' | 'under') => {
    if (stake <= 0 || stake > balance) {
      triggerToast("Insufficient account funds or invalid stake size.", false);
      return;
    }
    
    // Validate target digit if contract type is digit-over-under
    if (contractType === 'digit-over-under') {
      if (typeof targetDigit !== 'number' || targetDigit < 0 || targetDigit > 9 || isNaN(targetDigit)) {
        triggerToast("Invalid target digit size. Correct range is 0 to 9.", false);
        return;
      }
    }

    onPurchase({
      type: contractType,
      direction: dir,
      stake,
      duration: durationValue,
      durationUnit,
      barrierOffset: (contractType !== 'rise-fall' && contractType !== 'digit-over-under') ? barrierOffset : undefined,
      targetDigit: contractType === 'digit-over-under' ? targetDigit : undefined
    });
  };

  return (
    <div className={`flex flex-col rounded-xl border p-5 shadow-sm max-w-full md:w-80 space-y-4 shrink-0 transition-colors ${
      isDark ? 'border-slate-800 bg-slate-900/50 backdrop-blur-md text-white' : 'border-gray-200 bg-white text-black'
    }`}>
      {/* 1. ASSET SELECTOR DROPDOWN */}
      <div className="relative">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
          Trading Market
        </label>
        <button
          onClick={() => setShowAssetList(!showAssetList)}
          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-bold cursor-pointer transition-all border ${
            isDark ? 'bg-slate-950/80 border-slate-800 text-slate-100 hover:bg-slate-900' : 'bg-gray-50 border-gray-150 text-black hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className={`h-2 w-2 rounded-full ${
              selectedAsset.type === 'syndicate' ? 'bg-red-500' : selectedAsset.type === 'forex' ? 'bg-yellow-500' : 'bg-yellow-500'
            }`} />
            <span className="truncate">{selectedAsset.name}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>

        {showAssetList && (
          <div className={`absolute left-0 mt-1.5 w-full rounded-lg border p-2 shadow-2xl z-40 max-h-72 overflow-y-auto ${
            isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-250 bg-white'
          }`}>
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500 mb-2 border ${
                isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-black placeholder-gray-400'
              }`}
            />
            <div className="space-y-1">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => handleAssetSelect(asset)}
                  className={`flex items-center justify-between rounded p-2 text-xs cursor-pointer transition-all ${
                    selectedAsset.id === asset.id
                      ? isDark ? 'bg-yellow-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(20,184,166,0.3)]' : 'bg-black text-white font-bold'
                      : isDark ? 'hover:bg-slate-900 text-slate-300' : 'hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <div>
                    <span className="font-bold block">{asset.name}</span>
                    <span className="text-[9px] text-gray-400 font-mono uppercase">{asset.symbol}</span>
                  </div>
                  <div className="text-right font-mono text-[10px]">
                    <div className="font-bold">{asset.price.toFixed(asset.decimals)}</div>
                    <div className={asset.change >= 0 ? "text-green-600" : "text-red-500"}>
                      {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. CONTRACT TYPE NAVIGATION */}
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
          Contract Instrument
        </label>
        <div className={`grid grid-cols-3 gap-1 rounded-md p-1 border ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-100/50 border-gray-150'
        }`}>
          {(['rise-fall', 'higher-lower', 'touch-no-touch', 'digit-over-under'] as ContractType[]).map((type) => (
            <button
              key={type}
              onClick={() => setContractType(type)}
              className={`rounded py-1.5 text-[9px] font-bold uppercase transition-all tracking-tight cursor-pointer ${
                contractType === type
                  ? isDark ? 'bg-yellow-500 text-slate-950 shadow-[0_0_10px_rgba(20,184,166,0.3)] font-black' : 'bg-white text-black shadow'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900/30' : 'text-gray-450 hover:text-black hover:bg-white/20'
              }`}
            >
              {type === 'rise-fall' ? 'Rise/Fall' : type === 'higher-lower' ? 'High/Low' : type === 'touch-no-touch' ? 'Touch' : 'Digits'}
            </button>
          ))}
        </div>
      </div>

      {/* 3. TARGET DIGIT (For Over/Under) */}
      {contractType === 'digit-over-under' && (
        <div className="space-y-1.5 transition-all">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Target Digit (0-9)
          </label>
          <div className="grid grid-cols-5 gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <button
                key={d}
                onClick={() => handleSelectTargetDigit(d)}
                className={`rounded py-1.5 text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                  targetDigit === d
                    ? isDark ? 'bg-yellow-500 border-yellow-500 text-slate-950 shadow-[0_0_10px_rgba(20,184,166,0.4)]' : 'bg-black border-black text-white'
                    : isDark ? 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-850' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. DURATION OPTIONS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Duration
          </label>
          <span className="text-[10px] text-gray-400 font-mono font-bold">
            {durationValue} {durationUnit.toUpperCase()}
          </span>
        </div>

        {/* Duration Unit Switches */}
        <div className={`grid grid-cols-3 gap-0.5 rounded-md p-0.5 border ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-100/50 border-gray-150'
        }`}>
          {(['ticks', 'seconds', 'minutes'] as const).map((unit) => (
            <button
              key={unit}
              onClick={() => setDurationUnit(unit)}
              className={`rounded py-1 text-[9px] font-bold uppercase tracking-tight cursor-pointer ${
                durationUnit === unit
                  ? isDark ? 'bg-yellow-500 text-slate-950 font-black shadow-sm' : 'bg-black text-white font-extrabold shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900/40' : 'text-gray-410 hover:text-black hover:bg-white/10'
              }`}
            >
              {unit}
            </button>
          ))}
        </div>

        {/* Amount Input */}
        <div className={`flex rounded-md border items-center overflow-hidden h-10 ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-gray-50 border-gray-200'
        }`}>
          <input
            type="number"
            min={durationUnit === 'ticks' ? 1 : durationUnit === 'seconds' ? 15 : 1}
            max={durationUnit === 'ticks' ? 10 : durationUnit === 'seconds' ? 60 : 15}
            value={durationValue}
            onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-transparent px-3 text-left font-mono text-xs font-bold focus:outline-none"
          />
          <div className="flex items-center h-full border-l border-gray-200">
            <button
              onClick={() => setDurationValue((prev) => Math.min(prev + 1, durationUnit === 'ticks' ? 10 : durationUnit === 'seconds' ? 60 : 15))}
              className="px-3 h-full font-bold hover:bg-gray-100 text-gray-550 border-r border-gray-200"
            >
              +
            </button>
            <button
              onClick={() => setDurationValue((prev) => Math.max(durationUnit === 'ticks' ? 1 : durationUnit === 'seconds' ? 15 : 1, prev - 1))}
              className="px-3 h-full font-bold hover:bg-gray-100 text-gray-550"
            >
              -
            </button>
          </div>
        </div>
      </div>

      {/* 4. BARRIER LEVEL CONFIG (conditional) */}
      {contractType !== 'rise-fall' && (
        <div className="space-y-1.5 transition-all">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Barrier Offset (±)
          </label>
          <div className={`flex rounded-md border items-center ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-gray-50 border-gray-200'
          }`}>
            <span className="px-3 text-xs font-mono text-gray-450 pointer-events-none select-none">
              OFFSET
            </span>
            <input
              type="number"
              step={selectedAsset.decimals > 2 ? 0.0001 : 0.1}
              value={barrierOffset}
              onChange={(e) => setBarrierOffset(Math.max(0, parseFloat(e.target.value) || 0))}
              className={`w-full bg-transparent py-2.5 px-3 font-mono text-xs font-bold focus:outline-none text-right ${isDark ? 'text-yellow-400 font-bold' : 'text-purple-650'}`}
            />
          </div>
        </div>
      )}

      {/* 5. STAKE SELECTOR */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
          Contract Stake (USD)
        </label>
        <div className={`flex rounded-md border items-center px-2.5 h-10 ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-gray-50 border-gray-200 focus-within:border-black'
        }`}>
          <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
          <input
            type="number"
            min={1}
            max={5000}
            value={stake}
            onChange={(e) => setStake(Math.max(1, parseFloat(e.target.value) || 0))}
            className="w-full bg-transparent font-mono text-xs font-extrabold focus:outline-none"
          />
        </div>

        {/* Stake Preset Chips */}
        <div className="grid grid-cols-4 gap-1">
          {[10, 50, 100, 500].map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetStake(preset)}
              className={`rounded py-1 text-[9px] font-bold hover:bg-black hover:text-white transition-all cursor-pointer border ${
                stake === preset
                  ? isDark ? 'bg-yellow-500 border-yellow-500 text-slate-950 font-extrabold shadow-[0_0_8px_rgba(20,184,166,0.25)]' : 'bg-black border-black text-white font-extrabold'
                  : isDark ? 'border-slate-800 bg-slate-950/80 text-slate-400 hover:bg-slate-900 hover:text-white' : 'border-gray-200 bg-gray-50/50 text-gray-450 hover:bg-gray-100'
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>
      </div>

      {/* 6. INSTANT PAYOUT EVALUATION DISPLAY */}
      <div className={`rounded-lg p-3.5 border space-y-2 text-xs transition-colors ${
        isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50/50 border-gray-100'
      }`}>
        <div className="flex justify-between items-center text-gray-450">
          <span className="flex items-center text-[10px] font-bold uppercase">
            Net return rate
            <HelpCircle className="h-3 w-3 text-gray-400 ml-1 cursor-help" title="Standard flat payout multipliers for successful correct index trades." />
          </span>
          <span className="font-mono text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded tracking-wide text-[10px]">
            +{payoutRate * 100}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2.5">
          <div>
            <span className="block text-[9px] text-gray-400 font-bold uppercase">Clear Profit</span>
            <span className="font-mono text-sm font-extrabold text-green-600">+${netProfit.toFixed(2)}</span>
          </div>
          <div className="text-right">
            <span className="block text-[9px] text-gray-400 font-bold uppercase">Total Return</span>
            <span className="font-mono text-sm font-extrabold text-black">${payoutPotential.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 7. TRADE BUTTONS ACTION (RISE / FALL) */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        {contractType === 'rise-fall' && (
          <>
            {/* BUY RISE BUTTON */}
            <button
              onClick={() => initiatePurchase('rise')}
              className="group flex w-full items-center justify-between rounded-md bg-green-605 bg-green-500 hover:bg-green-605 text-white py-3 px-4 shadow-sm transition-all cursor-pointer font-sans"
            >
              <div className="flex flex-col text-left">
                <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1">
                  Rise ▲
                </span>
                <span className="text-[9px] text-green-50 opacity-90">Spot ends higher than entry</span>
              </div>
              <div className="text-right font-mono font-bold text-xs">
                ${payoutPotential.toFixed(2)}
              </div>
            </button>

            {/* BUY FALL BUTTON */}
            <button
              onClick={() => initiatePurchase('fall')}
              className="group flex w-full items-center justify-between rounded-md bg-red-500 hover:bg-red-650 text-white py-3 px-4 shadow-sm transition-all cursor-pointer font-sans"
            >
              <div className="flex flex-col text-left">
                <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1">
                  Fall ▼
                </span>
                <span className="text-[9px] text-red-50 opacity-90">Spot ends lower than entry</span>
              </div>
              <div className="text-right font-mono font-bold text-xs">
                ${payoutPotential.toFixed(2)}
              </div>
            </button>
          </>
        )}

        {contractType === 'higher-lower' && (
          <>
            {/* BUY HIGHER BUTTON */}
            <button
              onClick={() => initiatePurchase('higher')}
              className={`group flex w-full items-center justify-between rounded-md py-3 px-4 shadow-sm transition-all cursor-pointer font-sans ${isDark ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black shadow-[0_0_12px_rgba(20,184,166,0.35)]' : 'bg-slate-900 hover:bg-black text-white'}`}
            >
              <div className="flex flex-col text-left">
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  HIGHER ▲
                </span>
                <span className={`text-[9px] ${isDark ? 'text-slate-950' : 'text-gray-200'}`}>Spot ends above barrier offset</span>
              </div>
              <div className="text-right font-mono font-bold text-xs">
                ${payoutPotential.toFixed(2)}
              </div>
            </button>

            {/* BUY LOWER BUTTON */}
            <button
              onClick={() => initiatePurchase('lower')}
              className={`group flex w-full items-center justify-between rounded-md py-3 px-4 shadow-sm transition-all cursor-pointer font-sans border ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-white shadow-sm' : 'bg-slate-800 hover:bg-slate-900 text-white border-transparent'}`}
            >
              <div className="flex flex-col text-left">
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  LOWER ▼
                </span>
                <span className={`text-[9px] ${isDark ? 'text-slate-300' : 'text-gray-200'}`}>Spot ends below barrier offset</span>
              </div>
              <div className="text-right font-mono font-bold text-xs">
                ${payoutPotential.toFixed(2)}
              </div>
            </button>
          </>
        )}

        {contractType === 'touch-no-touch' && (
          <>
            {/* BUY TOUCH BUTTON */}
            <button
              onClick={() => initiatePurchase('touch')}
              className={`group flex w-full items-center justify-between rounded-md py-3 px-4 shadow-sm transition-all cursor-pointer font-sans ${isDark ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black shadow-[0_0_12px_rgba(20,184,166,0.35)]' : 'bg-slate-900 hover:bg-black text-white'}`}
            >
              <div className="flex flex-col text-left">
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  TOUCH ★
                </span>
                <span className={`text-[9px] ${isDark ? 'text-slate-950' : 'text-gray-200'}`}>Touches barrier spot during term</span>
              </div>
              <div className="text-right font-mono font-bold text-xs">
                ${payoutPotential.toFixed(2)}
              </div>
            </button>

            {/* BUY NO TOUCH BUTTON */}
            <button
              onClick={() => initiatePurchase('no-touch')}
              className={`group flex w-full items-center justify-between rounded-md py-3 px-4 border shadow-sm transition-all cursor-pointer font-sans ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-black border-gray-200'}`}
            >
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold uppercase tracking-wider">
                  NO TOUCH ✖
                </span>
                <span className={`text-[9px] ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>Never touches barrier offset</span>
              </div>
              <div className="text-right font-mono font-bold text-xs animate-none">
                ${payoutPotential.toFixed(2)}
              </div>
            </button>
          </>
        )}
        {contractType === 'digit-over-under' && (
          <>
            {/* BUY OVER BUTTON */}
            <button
              onClick={() => initiatePurchase('over')}
              className={`group flex w-full items-center justify-between rounded-md py-3 px-4 shadow-sm transition-all cursor-pointer font-sans ${isDark ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black shadow-[0_0_12px_rgba(20,184,166,0.35)]' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
            >
              <div className="flex flex-col text-left">
                <span className="text-xs font-extrabold uppercase tracking-wider">
                   DIGIT OVER ▲
                </span>
                <span className={`text-[9px] ${isDark ? 'text-slate-950 font-bold' : 'text-purple-100'}`}>
                  Last digit {'>'} {targetDigit}
                </span>
              </div>
              <div className="text-right font-mono font-bold text-xs">
                ${payoutPotential.toFixed(2)}
              </div>
            </button>

            {/* BUY UNDER BUTTON */}
            <button
              onClick={() => initiatePurchase('under')}
              className={`group flex w-full items-center justify-between rounded-md py-3 px-4 border shadow-sm transition-all cursor-pointer font-sans ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-white' : 'bg-purple-800 hover:bg-purple-900 text-white'}`}
            >
              <div className="flex flex-col text-left">
                <span className="text-xs font-extrabold uppercase tracking-wider">
                   DIGIT UNDER ▼
                </span>
                <span className={`text-[9px] ${isDark ? 'text-slate-300' : 'text-purple-100'}`}>
                  Last digit {'<'} {targetDigit}
                </span>
              </div>
              <div className="text-right font-mono font-bold text-xs">
                ${payoutPotential.toFixed(2)}
              </div>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
