import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, RefreshCw } from 'lucide-react';
import { Asset, Tick, CopilotMessage, IndicatorConfig } from '../types';

interface CopilotProps {
  theme?: 'dark' | 'light';
  asset: Asset;
  tickHistory: Tick[];
  indicatorConfig: IndicatorConfig;
  isOpen: boolean;
  onClose: () => void;
}

interface SignalReport {
  signal: 'BUY RISE' | 'BUY FALL' | 'HOLD' | 'ERROR';
  analysis: string;
  support: string;
  resistance: string;
  levelOfConfidence: string;
}

export default function Copilot({
  theme = 'light',
  asset,
  tickHistory,
  indicatorConfig,
  isOpen,
  onClose
}: CopilotProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init-msg',
      sender: 'ai',
      text: `Hello! I am BO Wizard Bot. I have access to ${asset.name}'s real-time tick chart and your currently active Moving Average overlays. How can I assist you with standard binary options strategy or technical evaluations today?`,
      timestamp: Date.now()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSignal, setActiveSignal] = useState<SignalReport | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeSignal]);

  const fetchAIAnalysis = async (userPrompt?: string) => {
    setIsLoading(true);

    try {
      const currentPrice = tickHistory[tickHistory.length - 1]?.price || asset.price;
      const recentHigh = Math.max(...tickHistory.slice(-20).map(t => t.price), currentPrice);
      const recentLow = Math.min(...tickHistory.slice(-20).map(t => t.price), currentPrice);

      const activeIndicatorValues = {
        smaEnabled: indicatorConfig.sma.enabled,
        smaPeriod: indicatorConfig.sma.period,
        emaEnabled: indicatorConfig.ema.enabled,
        emaPeriod: indicatorConfig.ema.period,
        rsiEnabled: indicatorConfig.rsi.enabled,
        rsiPeriod: indicatorConfig.rsi.period,
        currentPrice: currentPrice,
        recentHigh: recentHigh,
        recentLow: recentLow
      };

      const response = await fetch('/api/copilot/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetName: asset.name,
          selectedSymbol: asset.symbol,
          priceHistory: tickHistory.slice(-25),
          activeIndicatorValues: activeIndicatorValues,
          question: userPrompt
        }),
      });

      const data: SignalReport = await response.json();
      setActiveSignal(data);

      if (userPrompt) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: `${data.analysis}\n\n**🎯 Signal Recommendation:** __${data.signal}__\n**📈 Key Resistance:** ${data.resistance}\n**📉 Support Floor:** ${data.support}\n**⚡ Signal Confidence:** ${data.levelOfConfidence}`,
            timestamp: Date.now()
          }
        ]);
      }
    } catch (e) {
      console.error(e);
      setActiveSignal({
        signal: 'ERROR',
        analysis: 'Failed to access full-stack Gemini analysis terminal. Verify standard model configs.',
        support: 'N/A',
        resistance: 'N/A',
        levelOfConfidence: '0%'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage;
    setMessages((prev) => [
      ...prev,
      { id: `usr-${Date.now()}`, sender: 'user', text: userText, timestamp: Date.now() }
    ]);
    setInputMessage('');

    await fetchAIAnalysis(userText);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed right-4 bottom-18 md:top-18 md:bottom-4 z-40 flex w-80 md:w-96 flex-col rounded-xl border p-0 shadow-2xl transition-all duration-300 backdrop-blur-md ${
      isDark ? 'border-zinc-805 bg-zinc-950 text-white shadow-black' : 'border-gray-200 bg-white text-black shadow-lg shadow-gray-200/50'
    }`}>
      {/* Copilot Head banner */}
      <div className={`flex items-center justify-between border-b p-4 rounded-t-xl select-none ${
        isDark ? 'border-zinc-850 bg-zinc-900' : 'border-gray-100 bg-gray-50'
      }`}>
        <div className="flex items-center space-x-2.5">
          <div className="rounded bg-black p-1.5 text-white">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className={`text-xs font-bold font-sans tracking-tight flex items-center space-x-1 ${isDark ? 'text-white' : 'text-black'}`}>
              <span>BO Wizard Bot</span>
              <Sparkles className="h-3 w-3 text-red-500 animate-pulse" />
            </h3>
            <span className="text-[9px] text-gray-400 block font-bold font-mono tracking-wider">GEMINI DECISION TERMINAL</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-black transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Signal overlay widget */}
      <div className={`p-4 border-b ${
        isDark ? 'border-zinc-850 bg-zinc-900/40' : 'border-gray-100 bg-gray-50/20'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-bold text-gray-450 uppercase tracking-widest block flex items-center">
            <Sparkles className="h-3 w-3 mr-1 text-red-500" /> ACTIVE SIGNAL DESK
          </span>
          <button
            onClick={() => fetchAIAnalysis()}
            disabled={isLoading}
            className="flex items-center space-x-1 text-[9px] text-gray-550 hover:text-black font-bold uppercase tracking-wider cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Generate Signal</span>
          </button>
        </div>

        {activeSignal ? (
          <div className={`rounded-md p-3 border text-xs space-y-2 ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-150'
          }`}>
            <div className={`flex justify-between items-center px-2 py-0.5 rounded ${
              isDark ? 'bg-zinc-900' : 'bg-gray-50'
            }`}>
              <span className="text-[9px] text-gray-400 font-sans uppercase font-bold">Recommendation</span>
              <span className={`font-mono text-[10px] font-extrabold ${
                activeSignal.signal.includes('BUY RISE') ? 'text-green-600' : activeSignal.signal.includes('BUY FALL') ? 'text-red-500' : 'text-amber-500'
              }`}>
                {activeSignal.signal}
              </span>
            </div>
            <p className="text-[10px] text-gray-600 font-sans italic leading-relaxed">
              "{activeSignal.analysis}"
            </p>
            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-gray-100 text-center font-mono text-[9px]">
              <div>
                <span className="block text-gray-400 font-sans font-bold">SUPPORT</span>
                <span className="text-black font-extrabold">{activeSignal.support}</span>
              </div>
              <div>
                <span className="block text-gray-400 font-sans font-bold">RESIST</span>
                <span className="text-black font-extrabold">{activeSignal.resistance}</span>
              </div>
              <div>
                <span className="block text-gray-400 font-sans font-bold">CONFID</span>
                <span className="text-black font-extrabold">{activeSignal.levelOfConfidence}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 rounded bg-white border border-gray-150">
            <button
              onClick={() => fetchAIAnalysis()}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 rounded bg-black px-4 py-1.5 text-[10px] text-white font-extrabold hover:bg-gray-950 transition-all cursor-pointer uppercase tracking-wider"
            >
              <span>Scan Market Signals</span>
            </button>
          </div>
        )}
      </div>

      {/* Messaging chat stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2.5 max-h-[300px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] rounded p-3 text-xs leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-black text-white self-end ml-auto'
                : 'bg-gray-50 border border-gray-150 text-gray-800 mr-auto'
            }`}
          >
            <div className="whitespace-pre-line tracking-tight leading-normal">
              {msg.text}
            </div>
            <span className="text-[8px] text-gray-400 font-mono mt-1 text-right block self-end uppercase">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-gray-400 p-2 mr-auto bg-gray-50 rounded-md border border-gray-100">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono text-[9px] font-bold">COGNITIVE COMPILING...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion fast-chips */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 select-none">
        <div className="flex space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[9px] font-bold text-gray-500 uppercase">
          <button
            onClick={() => {
              setInputMessage(`What's the best option strategy for synthetic index ${asset.symbol}?`);
            }}
            className="rounded bg-white border border-gray-200 px-2.5 py-1 hover:border-black whitespace-nowrap cursor-pointer transition-colors"
          >
            Option Strategy
          </button>
          <button
            onClick={() => {
              setInputMessage(`How can I use SMA and RSI on this asset?`);
            }}
            className="rounded bg-white border border-gray-200 px-2.5 py-1 hover:border-black whitespace-nowrap cursor-pointer transition-colors"
          >
            Indicator Settings
          </button>
          <button
            onClick={() => {
              setInputMessage('Summarize binary contract Risk Management rules.');
            }}
            className="rounded bg-white border border-gray-200 px-2.5 py-1 hover:border-black whitespace-nowrap cursor-pointer transition-colors"
          >
            Risk Management
          </button>
        </div>
      </div>

      {/* Message input bar */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white rounded-b-xl flex space-x-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`Ask BO Wizard about ${asset.symbol}...`}
          className="flex-1 rounded border border-gray-200 px-3 py-2 text-xs text-black placeholder-gray-400 focus:outline-none focus:border-black font-sans font-medium"
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-900 transition-all cursor-pointer shadow-sm shadow-gray-200"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
