import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  RefreshCw, 
  Send as TelegramIcon, 
  Users, 
  ExternalLink, 
  Bell, 
  Key, 
  UserPlus, 
  CheckCircle2, 
  Smartphone, 
  ChevronRight, 
  Play,
  Check,
  Link,
  Settings,
  Cpu,
  Info,
  Sliders,
  ShieldCheck,
  Zap,
  Activity,
  MessageSquare,
  Pin
} from 'lucide-react';
import { Asset, Tick, CopilotMessage, IndicatorConfig } from '../types';

interface CopilotProps {
  theme?: 'dark' | 'light';
  asset: Asset;
  tickHistory: Tick[];
  indicatorConfig: IndicatorConfig;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onTriggerAuth?: (tab: 'login' | 'register') => void;
  triggerToast?: (text: string, success: boolean) => void;
}

interface SignalReport {
  signal: 'BUY RISE' | 'BUY FALL' | 'HOLD' | 'ERROR';
  analysis: string;
  support: string;
  resistance: string;
  levelOfConfidence: string;
}

interface TelegramServerLog {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

interface TelegramMockUser {
  id: string;
  username: string;
  status: string;
  joinedAt: string;
  origin?: string;
  personality?: string;
}

export default function WizardBot({
  theme = 'light',
  asset,
  tickHistory,
  indicatorConfig,
  isOpen,
  onClose,
  currentUser,
  onTriggerAuth,
  triggerToast
}: CopilotProps) {
  const isAdmin = currentUser?.email?.toLowerCase().includes('admin') || 
                  currentUser?.email?.toLowerCase().includes('peterchristine') || 
                  currentUser?.email?.toLowerCase().includes('lucasantiago');

  // Navigation tabs:
  const [botTab, setBotTab] = useState<'signals' | 'telegram' | 'onboard' | 'qa' | 'ads' | 'notifs' | 'group'>(isAdmin ? 'signals' : 'qa');
  // Telegram Sub tabs:
  const [tgSubTab, setTgSubTab] = useState<'simulator' | 'api_settings' | 'members'>('simulator');


  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init-msg',
      sender: 'ai',
      text: `Greetings, seeker of market wisdom! I am Wizard Bot. I have peered into the mystical charts of ${asset.name} and analyzed the Moving Average incantations. Ask your question, and I shall consult the digital oracle for you.`,
      timestamp: Date.now()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [groupInput, setGroupInput] = useState('');
  const [referralsCount, setReferralsCount] = useState(0);
  const groupBottomRef = useRef<HTMLDivElement>(null);

  // Group polling & referrals
  useEffect(() => {
    if (botTab === 'group') {
      const fetchGroupMessages = async () => {
        try {
          const res = await fetch('/api/chat/messages');
          const data = await res.json();
          if (data.success) {
            setGroupMessages(data.messages);
          }
        } catch(e) {}
      };
      fetchGroupMessages();
      const interval = setInterval(fetchGroupMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [botTab]);

  useEffect(() => {
    if (botTab === 'group') {
      groupBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [groupMessages, botTab]);

  useEffect(() => {
    if (currentUser) {
      fetch('/api/users/referrals', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('lwex_session_token') || ''}` }
      })
      .then(r => r.json())
      .then(d => {
        if (d.success) setReferralsCount(d.count);
      });
    }
  }, [currentUser, isOpen]);

  const generateSimulatedScreenshot = (amount: string, coin: string) => {
    return `https://dummyimage.com/400x600/18181b/22c55e.png&text=SUCCESS!+Payment+of+${amount}+${coin}`;
  };

  const handleSendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupInput.trim() || isLoading) return;
    const userText = groupInput;
    setGroupInput('');

    if (userText.startsWith('/simulate_payment')) {
      const parts = userText.split(' ');
      const amount = parts[1] || '100';
      const coin = parts[2] || 'USDT';
      fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: localStorage.getItem('lwex_session_token'),
          content: `Wizard Bot generated a simulated payment for ${amount} ${coin}.`,
          imageUrl: generateSimulatedScreenshot(amount, coin),
          isBot: true
        })
      });
      if (triggerToast) triggerToast("Simulated payment posted to group!", true);
      return;
    }

    if (!currentUser) {
      if (onTriggerAuth) onTriggerAuth('login');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: localStorage.getItem('lwex_session_token') || '',
          content: userText,
          isBot: false
        })
      });

      const data = await res.json();
      if (!data.success) {
        if (triggerToast) triggerToast(data.message, false);
      } else {
        // optimistically update or just wait for polling
        setGroupMessages(prev => [...prev, { id: Date.now().toString(), user_id: currentUser.id, author_name: currentUser.fullName, content: userText, created_at: new Date().toISOString() }]);
      }
    } catch (err) {
      if (triggerToast) triggerToast("Failed to send message.", false);
    }
    setIsLoading(false);
  };
   
  const [qaMessages, setQaMessages] = useState<CopilotMessage[]>([
    {
      id: 'qa-init',
      sender: 'ai',
      text: `Hello! I'm your LWEX Support AI. How can I help you with the platform today? Ask me any questions about trading, deposits, or how to use our tools.`,
      timestamp: Date.now()
    }
  ]);
  const [qaInput, setQaInput] = useState('');
  const [isQaLoading, setIsQaLoading] = useState(false);
  const qaBottomRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSignal, setActiveSignal] = useState<SignalReport | null>(null);

  // Telegram Integration States
  const [telegramUsername, setTelegramUsername] = useState(() => {
    return localStorage.getItem('lwex_tg_username') || '';
  });
  const [isTelegramLinked, setIsTelegramLinked] = useState(() => {
    return localStorage.getItem('lwex_tg_linked') === 'true';
  });
  
  // Real Setup tokens
  const [botToken, setBotToken] = useState('');
  const [groupChatId, setGroupChatId] = useState('');
  const [webhookActive, setWebhookActive] = useState(false);
  const [autoInviteDMs, setAutoInviteDMs] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Automatic scheduler and message variables
  const [autoSimulateIntervalEnabled, setAutoSimulateIntervalEnabled] = useState(true);
  const [autoSimulateIntervalSeconds, setAutoSimulateIntervalSeconds] = useState(30);
  const [autoSimulateMessageTypes, setAutoSimulateMessageTypes] = useState<string[]>(['signals', 'motivation', 'results', 'screenshots']);
  const [autoSimulateActiveUsersCount, setAutoSimulateActiveUsersCount] = useState(15);

  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [pinnedMessageText, setPinnedMessageText] = useState<string | null>(null);
  const [pinnedMessageSender, setPinnedMessageSender] = useState<string | null>(null);

  // Server state caches
  const [tgLogs, setTgLogs] = useState<TelegramServerLog[]>([]);
  const [tgUsers, setTgUsers] = useState<TelegramMockUser[]>([]);
  
  // Simulation client inputs
  const [simulateSender, setSimulateSender] = useState('@peterchristine820');
  const [simulateText, setSimulateText] = useState('/signals');
  const [isSimulatingMessage, setIsSimulatingMessage] = useState(false);

  // Broadcaster inputs
  const [customBroadcast, setCustomBroadcast] = useState('');
  const [broadcastType, setBroadcastType] = useState<'signal' | 'campaign' | 'alert'>('signal');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const simBottomRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Run on mount or tab change to pull server stats
  const fetchTelegramConfig = async () => {
    try {
      const res = await fetch('/api/telegram/config');
      if (res.ok) {
        const data = await res.json();
        setBotToken(data.config.botToken || '');
        setGroupChatId(data.config.groupChatId || '');
        setWebhookActive(!!data.config.webhookActive);
        if (data.config.autoInviteDMs !== undefined) setAutoInviteDMs(!!data.config.autoInviteDMs);
        if (data.config.autoSimulateIntervalEnabled !== undefined) setAutoSimulateIntervalEnabled(!!data.config.autoSimulateIntervalEnabled);
        if (data.config.autoSimulateIntervalSeconds !== undefined) setAutoSimulateIntervalSeconds(data.config.autoSimulateIntervalSeconds);
        if (data.config.autoSimulateMessageTypes !== undefined) setAutoSimulateMessageTypes(data.config.autoSimulateMessageTypes);
        if (data.config.autoSimulateActiveUsersCount !== undefined) setAutoSimulateActiveUsersCount(data.config.autoSimulateActiveUsersCount);
        setPinnedMessageId(data.config.pinnedMessageId || null);
        setPinnedMessageText(data.config.pinnedMessageText || null);
        setPinnedMessageSender(data.config.pinnedMessageSender || null);
        setTgLogs(data.logs || []);
        setTgUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load telegram config from server:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTelegramConfig();
    }
  }, [isOpen]);

  useEffect(() => {
    if (botTab === 'signals') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeSignal, botTab]);

  useEffect(() => {
    if (botTab === 'qa') {
      qaBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [qaMessages, botTab]);

  useEffect(() => {
    if (botTab === 'telegram' && tgSubTab === 'simulator') {
      simBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tgLogs, botTab, tgSubTab]);

  const askSupportQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaInput.trim() || isQaLoading) return;

    const userText = qaInput;
    setQaMessages((prev) => [
      ...prev,
      { id: `qa-usr-${Date.now()}`, sender: 'user', text: userText, timestamp: Date.now() }
    ]);
    setQaInput('');
    setIsQaLoading(true);

    try {
      const history = qaMessages.slice(-5).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const response = await fetch('/api/copilot/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          question: userText
        }),
      });

      const data = await response.json();
      
      setQaMessages((prev) => [
        ...prev,
        {
          id: `qa-ai-${Date.now()}`,
          sender: 'ai',
          text: data.text || "I was unable to retrieve an answer.",
          timestamp: Date.now()
        }
      ]);
    } catch (err) {
      setQaMessages((prev) => [
        ...prev,
        {
          id: `qa-ai-${Date.now()}`,
          sender: 'ai',
          text: "My connection to the support database is temporarily interrupted.",
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsQaLoading(false);
    }
  };

  const fetchAIAnalysis = async (userPrompt?: string) => {
    setIsLoading(true);

    try {
      const conversationContext = messages.slice(-3).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const currentPrice = tickHistory[tickHistory.length - 1]?.price || asset.price;
      const recentHigh = Math.max(...tickHistory.slice(-20).map(t => t.price), currentPrice);
      const recentLow = Math.min(...tickHistory.slice(-20).map(t => t.price), currentPrice);

      const response = await fetch('/api/copilot/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetName: asset.name,
          selectedSymbol: asset.symbol,
          priceHistory: tickHistory.slice(-25),
          activeIndicatorValues: {
            smaEnabled: indicatorConfig.sma.enabled,
            emaEnabled: indicatorConfig.ema.enabled,
            rsiEnabled: indicatorConfig.rsi.enabled,
            currentPrice,
            recentHigh,
            recentLow
          },
          history: conversationContext,
          question: userPrompt
        }),
      });

      const data: SignalReport = await response.json();
      
      setTimeout(() => {
        setActiveSignal(data);

        if (userPrompt) {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              sender: 'ai',
              text: `${data.analysis}\n\n**🔮 Neural Adaptation:** Sigil recognized. My sight into ${asset.symbol} has deepened.\n\n**🎯 Signal:** ${data.signal}\n**⚡ Confidence:** ${data.levelOfConfidence}`,
              timestamp: Date.now()
            }
          ]);
        }
        setIsLoading(false);
      }, 300);

    } catch (e) {
      console.error(e);
      setActiveSignal({
        signal: 'ERROR',
        analysis: 'A shadow has fallen over the neural link. Re-aligning cosmic parameters...',
        support: 'N/A',
        resistance: 'N/A',
        levelOfConfidence: '0%'
      });
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

  // Telegram Username Link
  const handleLinkTelegram = () => {
    if (!telegramUsername.trim()) {
      if (triggerToast) triggerToast("Please enter a valid Telegram username.", false);
      return;
    }
    const cleanUsername = telegramUsername.startsWith('@') ? telegramUsername : `@${telegramUsername}`;
    setTelegramUsername(cleanUsername);
    setIsTelegramLinked(true);
    localStorage.setItem('lwex_tg_username', cleanUsername);
    localStorage.setItem('lwex_tg_linked', 'true');
    if (triggerToast) {
      triggerToast(`Account linked with Telegram client ${cleanUsername} successfully!`, true);
    }
  };

  // Unlink Telegram
  const handleUnlinkTelegram = () => {
    setIsTelegramLinked(false);
    setTelegramUsername('');
    localStorage.removeItem('lwex_tg_username');
    localStorage.removeItem('lwex_tg_linked');
    if (triggerToast) triggerToast("Telegram sync disconnected successfully.", true);
  };

  // Save Real Telegram Configuration
  const handleSaveTelegramConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken,
          groupChatId,
          webhookActive,
          autoInviteDMs,
          autoSimulateIntervalEnabled,
          autoSimulateIntervalSeconds,
          autoSimulateMessageTypes,
          autoSimulateActiveUsersCount,
          appUrl: window.location.origin
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTgLogs(data.logs);
        if (triggerToast) {
          triggerToast(
            webhookActive 
              ? "Telegram Webhook target registered successfully! Bot is now listening to live updates."
              : "Configuration synced successfully.", 
            true
          );
        }
      } else {
        if (triggerToast) triggerToast("Failed to secure Telegram tokens. Check credentials.", false);
      }
    } catch (err) {
      console.error(err);
      if (triggerToast) triggerToast("Internal connection fault updating config.", false);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Submit Simulated Message command
  const handleSimulateCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!simulateText.trim() || isSimulatingMessage) return;

    setIsSimulatingMessage(true);

    try {
      const res = await fetch('/api/telegram/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: simulateSender,
          text: simulateText
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTgLogs(data.logs);
        setTgUsers(data.users);
        setSimulateText('');
        if (triggerToast) triggerToast(`Simulated command [ ${simulateText} ] dispatched!`, true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulatingMessage(false);
    }
  };

  // Broadcast Instant Notification to Telegram Group members via API
  const handleBroadcastNotification = async (textToBroadcast?: string) => {
    const finalMsg = textToBroadcast || customBroadcast.trim();
    if (!finalMsg) {
      if (triggerToast) triggerToast("Please draft a message to broadcast.", false);
      return;
    }

    setIsBroadcasting(true);

    try {
      const res = await fetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: finalMsg,
          type: broadcastType
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTgLogs(data.logs);
        if (!textToBroadcast) setCustomBroadcast('');
        
        if (data.realSent) {
          if (triggerToast) triggerToast(`[LIVE BROADCAST] Dispatched real message to Telegram client!`, true);
        } else {
          if (triggerToast) triggerToast(`[SIMULATION BROADCAST] Added notice to Group broadcast queue.`, true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Broadcast Active Signal
  const handleBroadcastActiveSignal = () => {
    if (!activeSignal) {
      if (triggerToast) triggerToast("Please generate a signal first to broadcast.", false);
      return;
    }
    const signalMsg = `LWEX Active Signal on ${asset.symbol}: [${activeSignal.signal}] with ${activeSignal.levelOfConfidence} confidence. Target Support: ${activeSignal.support}, Resistance: ${activeSignal.resistance}. Oracle Analysis: "${activeSignal.analysis}"`;
    handleBroadcastNotification(signalMsg);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed right-4 bottom-18 md:top-18 md:bottom-4 z-40 flex w-80 md:w-100 flex-col rounded-xl border p-0 shadow-2xl transition-all duration-300 backdrop-blur-md ${
      isDark ? 'border-zinc-805 bg-zinc-950 text-white shadow-black' : 'border-gray-200 bg-white text-black shadow-lg shadow-gray-200/50'
    }`}>
      {/* HEADER BANNER */}
      <div className={`flex items-center justify-between border-b p-4 rounded-t-xl select-none ${
        isDark ? 'border-zinc-850 bg-zinc-900' : 'border-gray-100 bg-slate-100'
      }`}>
        <div className="flex items-center space-x-2.5">
          <div className="rounded bg-indigo-600 p-1.5 text-white animate-pulse">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-sans tracking-tight flex items-center space-x-1 text-slate-900 dark:text-white">
              <span>Wizard Bot Central</span>
              <Sparkles className="h-3 w-3 text-purple-500" />
            </h3>
            <span className="text-[9px] text-gray-400 block font-bold font-mono tracking-wider text-left">LWEX GROUP SYSTEM</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-red-500 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="flex overflow-x-auto whitespace-nowrap border-b border-gray-150 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-900 text-xs font-bold uppercase tracking-wider select-none scrollbar-hide">
        {isAdmin && (
          <button 
            onClick={() => setBotTab('signals')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-all shrink-0 ${
              botTab === 'signals' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-950' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            🔮 Signals
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setBotTab('telegram')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-all flex items-center justify-center space-x-1 shrink-0 ${
              botTab === 'telegram' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-950' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <TelegramIcon className="w-3 h-3 text-sky-500 fill-sky-500 animate-pulse" />
            <span>Tg Core</span>
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setBotTab('ads')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-all flex items-center justify-center space-x-1 shrink-0 ${
              botTab === 'ads' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-950' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Ads</span>
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setBotTab('notifs')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-all flex items-center justify-center space-x-1 shrink-0 ${
              botTab === 'notifs' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-950' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bell className="w-3 h-3 text-rose-500" />
            <span>Notifications</span>
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setBotTab('onboard')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-all shrink-0 ${
              botTab === 'onboard' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-950' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            ⚙️ Onboard
          </button>
        )}
        <button 
          onClick={() => setBotTab('qa')}
          className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-all flex items-center justify-center space-x-1 shrink-0 ${
            botTab === 'qa' 
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-950' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3 h-3 text-emerald-500" />
          <span>Support</span>
        </button>
        <button 
          onClick={() => setBotTab('group')}
          className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-all flex items-center justify-center space-x-1 shrink-0 ${
            botTab === 'group' 
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-950' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-3 h-3 text-pink-500" />
          <span>Global Chat</span>
        </button>
      </div>

      {/* MAIN TAB PANELS */}
      <div className="flex-1 overflow-y-auto max-h-[460px] scrollbar-thin flex flex-col min-h-[380px]">
        {/* ============ TAB: SIGNALS & CHAT ============ */}
        {botTab === 'signals' && isAdmin && (
          <div className="flex flex-col flex-1 pb-4">
            {/* Signal overlay widget */}
            <div className={`p-4 border-b ${
              isDark ? 'border-zinc-850 bg-zinc-900/40' : 'border-gray-100 bg-gray-50/20'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold text-gray-450 uppercase tracking-widest block flex items-center">
                  <Sparkles className="h-3 w-3 mr-1 text-red-500 animate-bounce" /> ACTIVE SIGNAL DESK
                </span>
                <button
                  onClick={() => fetchAIAnalysis()}
                  disabled={isLoading}
                  className="flex items-center space-x-1 text-[9px] text-indigo-500 hover:text-indigo-600 font-bold uppercase tracking-wider cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Generate Signal</span>
                </button>
              </div>

              {activeSignal ? (
                <div className={`rounded-md p-3 border text-xs space-y-2 ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-150'
                }`}>
                  <div className={`flex justify-between items-center px-1.5 py-1 rounded ${
                    isDark ? 'bg-zinc-900' : 'bg-gray-55'
                  }`}>
                    <span className="text-[9px] text-gray-400 font-sans uppercase font-bold">Recommendation</span>
                    <span className={`font-mono text-[10px] font-extrabold ${
                      activeSignal.signal.includes('BUY RISE') ? 'text-green-600' : activeSignal.signal.includes('BUY FALL') ? 'text-red-500' : 'text-amber-500'
                    }`}>
                      {activeSignal.signal}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-350 font-sans italic leading-relaxed">
                    "{activeSignal.analysis}"
                  </p>
                  <div className="grid grid-cols-3 gap-1 pt-2 border-t border-gray-100 dark:border-zinc-800 text-center font-mono text-[9px]">
                    <div>
                      <span className="block text-gray-400 font-sans font-bold">SUPPORT</span>
                      <span className="text-emerald-500 font-extrabold">{activeSignal.support}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-sans font-bold">RESIST</span>
                      <span className="text-rose-500 font-extrabold">{activeSignal.resistance}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-sans font-bold">CONFID</span>
                      <span className="text-indigo-500 font-extrabold">{activeSignal.levelOfConfidence}</span>
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <button 
                      onClick={handleBroadcastActiveSignal}
                      className="w-full mt-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 rounded py-1.5 text-[9px] font-bold uppercase flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <TelegramIcon className="w-2.5 h-2.5 fill-current" />
                      <span>Broadcast Signal on Telegram</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 rounded bg-slate-50 dark:bg-zinc-900/60 border border-gray-150 dark:border-zinc-800">
                  <button
                    onClick={() => fetchAIAnalysis()}
                    disabled={isLoading}
                    className="inline-flex items-center space-x-1.5 rounded bg-indigo-600 px-4 py-1.5 text-[10px] text-white font-extrabold hover:bg-indigo-700 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <span>Scan Market Signals</span>
                  </button>
                </div>
              )}
            </div>

            {/* Messaging scroll window */}
            <div className="flex-1 p-4 space-y-2.5 overflow-y-auto min-h-[220px]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] rounded p-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white self-end ml-auto'
                      : 'bg-slate-55 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-200 mr-auto'
                  }`}
                >
                  <div className="whitespace-pre-line tracking-tight leading-normal font-sans text-left">
                    {msg.text}
                  </div>
                  <span className="text-[8px] text-slate-400/80 font-mono mt-1 text-right block self-end uppercase">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center space-x-2 text-xs text-gray-400 p-2 mr-auto bg-slate-50 dark:bg-zinc-900 rounded-md border border-gray-100 dark:border-zinc-800">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span className="font-mono text-[9px] font-bold">COMPILING TECHNICAL ORACLE...</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Micro Quick chips suggestion bar */}
            <div className="px-4 py-1.5 border-t border-gray-100 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900 select-none">
              <div className="flex space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[9px] font-bold text-slate-500 uppercase">
                <button
                  type="button"
                  onClick={() => setInputMessage(`How do I register a real account coming from the Telegram Group?`)}
                  className="rounded bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 px-2.5 py-1 hover:border-indigo-500 dark:hover:border-indigo-400 whitespace-nowrap cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
                >
                  Register from TG
                </button>
                <button
                  type="button"
                  onClick={() => setInputMessage(`What are the steps to link my Telegram handle to get instant trade notifications?`)}
                  className="rounded bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 px-2.5 py-1 hover:border-indigo-500 dark:hover:border-indigo-400 whitespace-nowrap cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
                >
                  Notification Setup
                </button>
                <button
                  type="button"
                  onClick={() => setInputMessage(`Tell me about LWEX synthetic indices like MFLOW.`)}
                  className="rounded bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 px-2.5 py-1 hover:border-indigo-500 dark:hover:border-indigo-400 whitespace-nowrap cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
                >
                  MFLOW Info
                </button>
              </div>
            </div>

            {/* Text input form bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 rounded-b-xl flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Ask about signals, Telegram, or Registering...`}
                className="flex-1 rounded border border-gray-200 dark:border-zinc-800 px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-sans font-medium"
              />
              <button
                type="submit"
                className="rounded bg-indigo-600 px-3.5 py-2 text-white hover:bg-indigo-700 transition-all cursor-pointer shadow-sm shadow-indigo-200/25 animate-pulse"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* ============ TAB: TELEGRAM PORTAL CORE ============ */}
        {botTab === 'telegram' && isAdmin && (
          <div className="flex flex-col flex-1 select-none">
            {/* SUB TAB SELECTOR HEADERS */}
            <div className="flex border-b border-gray-150 dark:border-zinc-850 bg-slate-100 dark:bg-zinc-900/60 font-semibold text-[10px] tracking-tight text-slate-500 select-none">
              <button
                onClick={() => setTgSubTab('simulator')}
                className={`flex-1 py-2 text-center transition-all flex items-center justify-center space-x-1 border-r border-gray-150 dark:border-zinc-800 ${
                  tgSubTab === 'simulator' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200 dark:hover:bg-zinc-800'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                <span>Group Simulator</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => setTgSubTab('api_settings')}
                  className={`flex-1 py-2 text-center transition-all flex items-center justify-center space-x-1 border-r border-gray-150 dark:border-zinc-800 ${
                    tgSubTab === 'api_settings' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Settings className="w-3 h-3" />
                  <span>API Settings</span>
                </button>
              )}
              <button
                onClick={() => setTgSubTab('members')}
                className={`flex-1 py-2 text-center transition-all flex items-center justify-center space-x-1 ${
                  tgSubTab === 'members' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200 dark:hover:bg-zinc-800'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>Members ({tgUsers.length})</span>
              </button>
            </div>

            {/* Direct Link Invite CTA always visible at topmost info banner */}
            <div className="bg-sky-50 dark:bg-sky-950/20 px-3 py-1.5 border-b border-sky-100 dark:border-zinc-850 flex items-center justify-between text-[10px] text-sky-800 dark:text-sky-300 font-medium">
              <p className="flex items-center">
                <TelegramIcon className="w-3 h-3 text-sky-400 fill-sky-400 mr-1.5" />
                <span>Official Live Group: <strong>t.me/+V9H-AvU6wl43...</strong></span>
              </p>
              <a 
                href="https://t.me/+V9H-AvU6wl43MTNk" 
                target="_blank" 
                rel="noreferrer"
                className="bg-sky-600 hover:bg-sky-700 text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all flex items-center space-x-0.5"
              >
                <span>OPEN</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {/* SUB TAB VIEWPORT PANEL */}
            <div className="flex-1 p-3.5 space-y-3 flex flex-col justify-between overflow-y-auto">
              
              {/* SUBTAB: SIMULATOR CLIENT (Default View) */}
              {tgSubTab === 'simulator' && (
                <div className="flex flex-col space-y-3 flex-1 justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 leading-normal mb-2 text-left">
                      Test Wizard Bot interactions in the group below! Send simulated commands or messages to inspect how it answers in real-time.
                    </p>
                    
                    {/* Simulated Telegram Group Shell */}
                    <div className="border border-sky-500/20 rounded-lg overflow-hidden flex flex-col bg-slate-900/10 dark:bg-zinc-950 dark:border-zinc-850 min-h-[190px] max-h-[220px]">
                      {/* Sub banner */}
                      <div className="bg-slate-100 dark:bg-zinc-900 px-2.5 py-1 flex justify-between items-center text-[9px] text-gray-500 border-b border-gray-150 dark:border-zinc-800">
                        <span className="font-bold text-slate-800 dark:text-white flex items-center">
                          <Activity className="w-2.5 h-2.5 text-emerald-500 mr-1" />
                          LWEX Official Options Group Mockup
                        </span>
                        <span className="font-mono text-[8px] uppercase font-bold text-gray-400">Status: Listening</span>
                      </div>

                      {/* Pinned Notification Message Inside Group Chat Mockup */}
                      {pinnedMessageId && (
                        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-2.5 py-2 text-left flex items-start gap-2">
                          <Pin className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0 flex-none animate-pulse" />
                          <div className="text-[9px] leading-tight text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-yellow-650 dark:text-yellow-400 uppercase tracking-wide block text-[8px] mb-0.5">Pinned Message from {pinnedMessageSender}:</span>
                            <span dangerouslySetInnerHTML={{ __html: pinnedMessageText || '' }} />
                          </div>
                        </div>
                      )}

                      {/* Log feed */}
                      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 text-[10px] scrollbar-thin flex flex-col">
                        {tgLogs.slice(-25).map((log) => {
                          const isBot = log.sender === 'Wizard Bot' || log.sender === 'System Manager' || log.sender === 'Telegram API';
                          return (
                            <div key={log.id} className={`p-2 rounded-lg text-left max-w-[90%] ${
                              isBot 
                                ? 'bg-indigo-650/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/15 self-start mr-auto'
                                : 'bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-slate-200 self-end ml-auto'
                            }`}>
                              <span className="font-bold font-mono text-[8px] block select-all text-slate-600 dark:text-gray-400">
                                {log.sender}
                              </span>
                              <p className="font-sans whitespace-pre-line tracking-tight leading-normal text-[10px]" dangerouslySetInnerHTML={{ __html: log.text }} />
                              <span className="text-[7px] text-gray-400 block text-right mt-0.5">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                          );
                        })}
                        <div ref={simBottomRef} />
                      </div>
                    </div>
                  </div>

                  {/* Simulator Control form */}
                  <form onSubmit={handleSimulateCommand} className="space-y-2 pt-1 border-t border-gray-100 dark:border-zinc-850">
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-bold">
                      {/* Sender Picker */}
                      <div>
                        <label className="block text-gray-400 mb-0.5 text-left">Persona</label>
                        <select 
                          value={simulateSender}
                          onChange={(e) => setSimulateSender(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded p-1 text-[10px] font-semibold focus:outline-none"
                        >
                          <option value="@peterchristine820">@peterchristine820</option>
                          <option value="@christine_flow">@christine_flow</option>
                          <option value="@alphatrader">@alphatrader</option>
                          <option value="@options_pioneer">@options_pioneer</option>
                        </select>
                      </div>

                      {/* Command suggestions dropdown */}
                      <div>
                        <label className="block text-gray-405 mb-0.5 text-left">Select Quick Command</label>
                        <select 
                          value={simulateText}
                          onChange={(e) => setSimulateText(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded p-1 text-[10px] font-mono focus:outline-none"
                        >
                          <option value="/start">/start (Greetings)</option>
                          <option value="/register">/register (Sign up link)</option>
                          <option value="/signals">/signals (Oracle prediction)</option>
                          <option value="/mflow">/mflow (Index stats)</option>
                          <option value="/addmem">/addmem (Simulate member invite)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <input 
                        type="text" 
                        value={simulateText}
                        onChange={(e) => setSimulateText(e.target.value)}
                        placeholder="Type standard command or general chat..."
                        className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-[11px] font-sans focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isSimulatingMessage || !simulateText.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-3.5 py-1.5 text-[10px] font-extrabold cursor-pointer disabled:opacity-50"
                      >
                        {isSimulatingMessage ? 'Sending...' : 'SEND'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* SUBTAB: REAL API SETTINGS */}
              {tgSubTab === 'api_settings' && isAdmin && (
                <div className="space-y-4 text-left text-xs">
                  <div>
                    <span className="block font-bold text-slate-800 dark:text-white mb-1 flex items-center text-[11px]">
                      <Key className="w-3.5 h-3.5 text-yellow-500 mr-1.5" />
                      Step-by-Step Live Setup Guide
                    </span>
                    <p className="text-[10px] text-gray-400 leading-relaxed mb-3">
                      To receive live Telegram group commands & send signals instantly, obtain a token from <a href="https://t.me/BotFather" target="_blank" className="text-indigo-500 hover:underline">@BotFather</a> and add this bot to your chat group as Admin.
                    </p>

                    <div className="space-y-3">
                      {/* Bot Token Input */}
                      <div>
                        <label className="block text-[9px] font-bold text-gray-450 uppercase mb-1">Telegram Bot Token</label>
                        <input 
                          type="password"
                          value={botToken}
                          onChange={(e) => setBotToken(e.target.value)}
                          placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTuvwxyZ"
                          className="w-full bg-slate-55 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 tracking-wider focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Group Chat ID Input */}
                      <div>
                        <label className="block text-[9px] font-bold text-gray-450 uppercase mb-1">Target Telegram Group Chat ID</label>
                        <input 
                          type="text"
                          value={groupChatId}
                          onChange={(e) => setGroupChatId(e.target.value)}
                          placeholder="e.g. -100123456789 (Must match your group details)"
                          className="w-full bg-slate-55 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Webhook active toggle */}
                      <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-zinc-900/60 border border-gray-150 dark:border-zinc-800 select-none">
                        <div className="space-y-0.5">
                          <span className="block font-bold text-[10px] text-slate-950 dark:text-white">Active Telegram Webhook Listening</span>
                          <span className="block text-[8px] text-gray-400">Directly sync channel actions into options engine logs</span>
                        </div>
                        <input 
                          type="checkbox"
                          checked={webhookActive}
                          onChange={(e) => setWebhookActive(e.target.checked)}
                          className="w-4 h-4 text-indigo-650 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2 rounded bg-pink-100/50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800/30 select-none">
                        <div className="space-y-0.5">
                          <span className="block font-bold text-[10px] text-pink-600 dark:text-pink-400">Auto-Invite Group Members via DM</span>
                          <span className="block text-[8px] text-pink-500/70">Automatically welcome & DM platform link</span>
                        </div>
                        <input 
                          type="checkbox"
                          checked={autoInviteDMs}
                          onChange={(e) => setAutoInviteDMs(e.target.checked)}
                          className="w-4 h-4 text-pink-600 border-pink-300 rounded focus:ring-pink-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ============ PROGRAMMABLE MESSAGE SCHEDULER SECTION ============ */}
                  <div className="p-3 rounded bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/40 space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <span className="block font-bold text-indigo-900 dark:text-indigo-300 flex items-center text-[10px] uppercase tracking-wider">
                        <Zap className="w-3.5 h-3.5 text-indigo-500 mr-2 animate-bounce" />
                        Dynamic Message Broadcast & Scheduler
                      </span>
                      <div className="flex items-center space-x-1.5 select-none">
                        <span className="text-[8px] text-slate-400 font-bold uppercase">Auto-Simulate</span>
                        <input 
                          type="checkbox"
                          checked={autoSimulateIntervalEnabled}
                          onChange={(e) => setAutoSimulateIntervalEnabled(e.target.checked)}
                          className="w-3.5 h-3.5 text-indigo-650 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer animate-pulse"
                        />
                      </div>
                    </div>

                    <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal">
                      Automatically triggers mock messages onto the group channel. If your real Token & Chat ID is active, these are piped directly onto live Telegram!
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Interval Input */}
                      <div>
                        <label className="block text-[8px] font-bold text-slate-450 uppercase mb-1">Set Duration Interval</label>
                        <select
                          value={autoSimulateIntervalSeconds}
                          onChange={(e) => setAutoSimulateIntervalSeconds(parseInt(e.target.value, 10))}
                          className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-[10px] text-slate-900 dark:text-white focus:outline-none"
                        >
                          <option value={10}>Every 10 Seconds (Fast simulation)</option>
                          <option value={30}>Every 30 Seconds</option>
                          <option value={60}>Every 1 Minute</option>
                          <option value={180}>Every 3 Minutes</option>
                          <option value={300}>Every 5 Minutes</option>
                          <option value={900}>Every 15 Minutes</option>
                        </select>
                      </div>

                      {/* Active Users Limit */}
                      <div>
                        <label className="block text-[8px] font-bold text-slate-450 uppercase mb-1">Target Simulated Users Base</label>
                        <select
                          value={autoSimulateActiveUsersCount}
                          onChange={(e) => setAutoSimulateActiveUsersCount(parseInt(e.target.value, 10))}
                          className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-[10px] text-slate-900 dark:text-white focus:outline-none"
                        >
                          <option value={5}>5 Active Cross-Group Members</option>
                          <option value={10}>10 Active Cross-Group Members</option>
                          <option value={15}>15 Active Cross-Group Members</option>
                        </select>
                      </div>
                    </div>

                    {/* Programmable content types */}
                    <div className="space-y-1.5 pt-1.5 border-t border-indigo-100/50 dark:border-indigo-900/30">
                      <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Programmed Message Types Selection</label>
                      
                      <div className="grid grid-cols-2 gap-1.5 text-[9px] text-slate-700 dark:text-slate-300 font-sans">
                        {[
                          { key: 'signals', label: '📈 Trading Signals Crossover' },
                          { key: 'motivation', label: '🧠 Daily Motivation & Tips' },
                          { key: 'results', label: '🔥 Recent Payout Win/Loss' },
                          { key: 'screenshots', label: '🖼️ Success Screenshot Proofs' }
                        ].map((item) => (
                          <label key={item.key} className="flex items-center space-x-1.5 cursor-pointer hover:bg-white/40 dark:hover:bg-zinc-900/40 p-1.5 rounded-sm select-none border border-transparent hover:border-indigo-100 dark:hover:border-zinc-800">
                            <input 
                              type="checkbox"
                              checked={autoSimulateMessageTypes.includes(item.key)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAutoSimulateMessageTypes([...autoSimulateMessageTypes, item.key]);
                                } else {
                                  setAutoSimulateMessageTypes(autoSimulateMessageTypes.filter(t => t !== item.key));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded text-indigo-650"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-150 dark:border-zinc-800">
                    <a 
                      href={`https://t.me/LWEXOptionsBot?startgroup=true`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-[10px] uppercase flex items-center justify-center space-x-1 cursor-pointer select-none transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Bot to Another Group</span>
                    </a>
                  </div>

                  <button
                    onClick={handleSaveTelegramConfig}
                    disabled={isSavingConfig}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 rounded text-[10px] uppercase flex items-center justify-center space-x-1 transition-colors block cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isSavingConfig ? 'Saving settings...' : 'Save Token & Update Programmable Bot'}</span>
                  </button>
                  
                  {/* Broadcaster Section */}
                  <div className="mt-4 pt-3.5 border-t border-gray-155 dark:border-zinc-850">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 dark:text-white text-[11px] block flex items-center">
                        <Bell className="w-3.5 h-3.5 text-orange-500 mr-1.5" />
                        Target Broadcast Console
                      </span>
                      <span className="bg-orange-500/10 text-orange-600 text-[8px] font-mono font-bold uppercase px-1 rounded">BROADCAST PANEL</span>
                    </div>

                    <div className="space-y-2 font-sans text-[10px]">
                      <div className="flex space-x-1">
                        {(['signal', 'campaign', 'alert'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setBroadcastType(t)}
                            className={`flex-1 py-1 rounded border text-center font-bold uppercase text-[8px] transition-all ${
                              broadcastType === t 
                                ? 'bg-orange-500 text-white border-transparent' 
                                : 'bg-white dark:bg-zinc-950 text-slate-500 border-slate-200 dark:border-zinc-800'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={customBroadcast}
                        onChange={(e) => setCustomBroadcast(e.target.value)}
                        placeholder="Draft dynamic prediction alert to push directly to Telegram members..."
                        className="w-full h-14 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded p-2 text-[10px] text-slate-900 dark:text-white focus:outline-none resize-none placeholder-slate-400"
                      />
                      
                      <button
                        onClick={() => handleBroadcastNotification()}
                        disabled={isBroadcasting || !customBroadcast.trim()}
                        className="w-full bg-slate-900 hover:bg-slate-950 text-white font-extrabold py-2 rounded text-[9px] uppercase transition-all disabled:opacity-40"
                      >
                        {isBroadcasting ? 'Broadcasting...' : 'DISPATCH TO TELEGRAM CHAT GROUP'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB: MEMBERS DIRECTORY */}
              {tgSubTab === 'members' && (
                <div className="space-y-3 flex flex-col flex-1 pb-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 border-b border-gray-150 dark:border-zinc-800 pb-1 text-left">
                    <span>Username & Origin Community</span>
                    <div className="flex space-x-3">
                      <span>Behavior & Status</span>
                      <span>Joined At</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 max-h-[220px]">
                    {tgUsers.map((user) => (
                      <div key={user.id} className="flex flex-col space-y-1 p-2 bg-slate-50 dark:bg-zinc-900/60 rounded border border-gray-150 dark:border-zinc-800/80 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-indigo-650 dark:text-indigo-400 font-bold text-[11px]">{user.username}</span>
                          <div className="flex space-x-2.5 items-center font-mono text-[9px] text-gray-400 font-semibold select-none">
                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase self-center truncate">
                              {user.status}
                            </span>
                            <span>{user.joinedAt}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-[9px] text-slate-450 dark:text-slate-500">
                          <span>
                            Group Source: <span className="text-slate-600 dark:text-slate-350 font-medium">{user.origin || 'Direct invite'}</span>
                          </span>
                          <span>
                            Behavior: {user.personality === 'hype' && (
                              <span className="text-orange-600 dark:text-orange-400 font-bold bg-orange-500/10 px-1 rounded">🔥 Hype Leader</span>
                            )}
                            {user.personality === 'inquisitive' && (
                              <span className="text-sky-600 dark:text-sky-400 font-bold bg-sky-500/10 px-1 rounded">❓ Question Seeker</span>
                            )}
                            {user.personality === 'signal_follower' && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded">📈 Signal Follower</span>
                            )}
                            {user.personality === 'quiet' && (
                              <span className="text-slate-500 dark:text-slate-450 font-medium bg-slate-500/10 px-1 rounded">🤫 Quiet Observer</span>
                            )}
                            {!user.personality && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10 px-1 rounded">👥 Active Trader</span>
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 mt-2">
                    {/* Simulated user generation button to show "Adding users" */}
                    <button
                      onClick={() => {
                        setSimulateText('/addmem');
                        handleSimulateCommand();
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold py-2 rounded text-[10px] uppercase flex items-center justify-center space-x-1 cursor-pointer select-none"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Invite Simulated User</span>
                    </button>

                    {/* Simulate DMing users to join platform */}
                    <button
                      onClick={() => {
                        // simulate bot action
                        if (triggerToast) triggerToast("Action Dispatched: Inviting users to platform via DMs", true);
                        setTimeout(() => {
                           if (triggerToast) triggerToast('Successfully dispatched invite and link to ' + tgUsers.length + ' group members via inbox.', true);
                        }, 1200);
                      }}
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 rounded text-[10px] uppercase flex items-center justify-center space-x-1 cursor-pointer select-none"
                    >
                      <TelegramIcon className="w-3 h-3 text-white fill-white" />
                      <span>DM All & Share JOIN Link</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ============ TAB: DIRECT ONBOARDING ============ */}
        {botTab === 'onboard' && isAdmin && (
          <div className="p-4 space-y-4 text-xs select-none">
            {/* Guide for Telegram members coming to register */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-lg p-3 bg-slate-50 dark:bg-zinc-900/60 space-y-3">
              <h4 className="font-extrabold text-slate-950 dark:text-white flex items-center space-x-1.5 border-b border-gray-150 dark:border-zinc-800 pb-1.5 text-left">
                <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                <span>Onboarding Guide: TG to LWEX</span>
              </h4>
              <p className="text-[10px] text-slate-550 dark:text-slate-400 leading-normal text-left">
                Follow these simple steps to claim your virtual assets and synchronize your setup:
              </p>

              <div className="space-y-2.5 pt-1 text-left">
                <div className="flex items-start space-x-2.5">
                  <span className="flex items-center justify-center bg-indigo-500 text-white rounded-full text-[9px] font-bold w-4 h-4 shrink-0 mt-0.5">1</span>
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white text-[11px]">Click Signup / Register</span>
                    <span className="block text-[10px] text-slate-500 leading-relaxed">
                      Initialize account registration on our secure engine. Use your real telephone details.
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="flex items-center justify-center bg-indigo-500 text-white rounded-full text-[9px] font-bold w-4 h-4 shrink-0 mt-0.5">2</span>
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white text-[11px]">Grab the $25,678.91 USDT Demo Balances</span>
                    <span className="block text-[10px] text-slate-500 leading-relaxed">
                      New registrations are preloaded with $25,678.91 USDT virtual funds to test strategies without real losses!
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="flex items-center justify-center bg-indigo-500 text-white rounded-full text-[9px] font-bold w-4 h-4 shrink-0 mt-0.5">3</span>
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white text-[11px]">Link Active Telegram username</span>
                    <span className="block text-[10px] text-slate-500 leading-relaxed font-sans">
                      Enter your Telegram ID in the "Telegram" tab to instantly trigger automatic binary event logging.
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="flex items-center justify-center bg-indigo-500 text-white rounded-full text-[9px] font-bold w-4 h-4 shrink-0 mt-0.5">4</span>
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white text-[11px]">Execute Options Contracts</span>
                    <span className="block text-[10px] text-slate-500 leading-relaxed">
                      Select RISE or FALL options, pick expiration triggers and capitalize on index trajectories like MFLOW!
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* DIRECT AUTH ACTIONS ON THE BOT */}
            <div className="border border-indigo-101 dark:border-zinc-800 rounded-lg p-3.5 bg-gradient-to-br from-indigo-50/50 to-indigo-100/10 dark:from-zinc-910/60 text-xs">
              <span className="text-[8px] font-mono tracking-wider text-indigo-600 dark:text-indigo-400 block uppercase font-bold mb-1 text-left">DIRECT PORTAL CONTROLS</span>
              
              {currentUser ? (
                <div className="space-y-2">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded p-2 text-[10px] flex items-center justify-between">
                    <span>Logged In as: <strong>{currentUser.email}</strong></span>
                    <span className="bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase">Active Session</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full bg-slate-900 text-white font-extrabold py-2 rounded text-[10px] uppercase cursor-pointer"
                  >
                    Start Real Options Trading
                  </button>
                </div>
              ) : (
                <div className="space-y-2 text-left">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 pb-1.5 leading-relaxed">
                    Access high-frequency derivatives trading inside seconds. Register below or login if you already own an active profile.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        if (onTriggerAuth) onTriggerAuth('register');
                        onClose();
                      }}
                      className="bg-indigo-600 hover:bg-slate-950 text-white font-extrabold py-2.5 rounded text-[9px] uppercase tracking-wider flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Register Now</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onTriggerAuth) onTriggerAuth('login');
                        onClose();
                      }}
                      className="bg-slate-900 hover:bg-slate-950 text-white border border-slate-700 font-extrabold py-2.5 rounded text-[9px] uppercase tracking-wider flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Key className="w-3 h-3" />
                      <span>Login Portal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* ============ TAB: ADS ============ */}
        {botTab === 'ads' && isAdmin && (
          <div className="flex flex-col flex-1 p-4 text-center items-center justify-center space-y-4">
            <Zap className="h-12 w-12 text-amber-500 block mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Advertisements Manager</h3>
            <p className="text-[10px] text-slate-500">
              Only authorized admins can configure global banners or promotional popups across the platform.
            </p>
            <button className="px-6 py-2 rounded bg-amber-500 text-slate-900 font-extrabold text-[10px] uppercase">
              Launch Ad Campaign
            </button>
          </div>
        )}

        {/* ============ TAB: NOTIFICATIONS ============ */}
        {botTab === 'notifs' && isAdmin && (
          <div className="flex flex-col flex-1 p-4 text-center items-center justify-center space-y-4">
            <Bell className="h-12 w-12 text-rose-500 block mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Global Notifications</h3>
            <p className="text-[10px] text-slate-500">
              Deploy emergency alerts, maintenance windows, or platform-wide push notifications to all users instantly.
            </p>
            <button className="px-6 py-2 rounded bg-rose-500 text-white font-extrabold text-[10px] uppercase">
              Draft System Alert
            </button>
          </div>
        )}

        {/* ============ TAB: DIRECT PLATFORM Q&A ============ */}
        {botTab === 'qa' && (
          <div className="flex flex-col flex-1 pb-4">
            <div className={`p-4 border-b ${
              isDark ? 'border-zinc-850 bg-zinc-900/40' : 'border-gray-100 bg-gray-50/20'
            }`}>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                LWEX Help Desk
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                Connect directly with our 24/7 AI-powered support. Ask about minimum deposits, withdrawals, platform features, or cross-margin mechanics.
              </p>
            </div>

            <div className="flex-1 p-4 space-y-2.5 overflow-y-auto min-h-[220px]">
              {qaMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] rounded p-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white self-end ml-auto'
                      : 'bg-slate-55 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-200 mr-auto'
                  }`}
                >
                  <div className="whitespace-pre-line tracking-tight leading-normal font-sans text-left">
                    {msg.text}
                  </div>
                  <span className="text-[8px] text-slate-400/80 font-mono mt-1 text-right block self-end uppercase">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {isQaLoading && (
                <div className="flex items-center space-x-2 text-xs text-gray-400 p-2 mr-auto bg-slate-50 dark:bg-zinc-900 rounded-md border border-gray-100 dark:border-zinc-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-mono text-[9px] font-bold">SEARCHING KNOWLEDGE BASE...</span>
                </div>
              )}
              <div ref={qaBottomRef} />
            </div>

            <div className="p-3 border-t border-gray-150 dark:border-zinc-850 bg-white dark:bg-zinc-950 sticky bottom-0">
              <form onSubmit={askSupportQuestion} className="flex space-x-2">
                <input
                  type="text"
                  value={qaInput}
                  onChange={(e) => setQaInput(e.target.value)}
                  placeholder={`Ask a question (e.g. how to deposit?)`}
                  className="flex-1 rounded border border-gray-200 dark:border-zinc-800 px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-sans font-medium"
                />
                <button
                  type="submit"
                  disabled={isQaLoading}
                  className="rounded bg-emerald-600 px-3.5 py-2 text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-sm shadow-emerald-200/25 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
        {/* ============ TAB: GLOBAL GROUP CHAT ============ */}
        {botTab === 'group' && (
          <div className="flex flex-col flex-1 pb-4">
            <div className={`p-4 border-b flex flex-col items-center justify-center ${
              isDark ? 'border-zinc-850 bg-zinc-900/40' : 'border-gray-100 bg-gray-50/20'
            }`}>
              <h3 className="text-xs font-bold text-pink-500 uppercase flex items-center mb-1">
                <Users className="h-3.5 w-3.5 mr-1" />
                Global Member Area
              </h3>
              <p className="text-[10px] text-zinc-500">
                You must refer 10 people to unlock messaging tools.
              </p>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[220px]">
              {groupMessages.map(msg => (
                <div key={msg.id} className="flex flex-col mb-3">
                  <div className="flex items-center space-x-1.5 mb-1">
                    <span className={`text-[10px] font-bold ${msg.is_bot ? 'text-purple-500' : 'text-yellow-500'}`}>{msg.author_name}</span>
                    {msg.is_bot === 1 && <Bot className="h-3 w-3 text-purple-500" />}
                    <span className="text-[8px] text-gray-500 font-mono">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`p-3 text-[11px] tracking-tight leading-normal rounded-lg ${msg.is_bot ? 'bg-purple-900/20 border border-purple-500/20 text-purple-100' : 'bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-300'}`}>
                    {msg.content}
                    {msg.image_url && (
                      <img src={msg.image_url} alt="Screenshot" className="mt-2 rounded-md object-contain border border-zinc-700 w-full" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={groupBottomRef} />
            </div>

            {currentUser && referralsCount < 10 && (
              <div className="bg-red-500/10 border-t border-red-500/20 p-3 flex flex-col items-center flex-shrink-0">
                <p className="text-[10px] text-red-500 font-bold text-center">
                  LOCKED: You need 10 referrals to broadcast. (Current: {referralsCount}/10)
                </p>
                <p className="text-[9px] text-zinc-500 text-center mt-1">
                  Share your link: <span className="text-yellow-500 font-mono select-all">https://{window.location.host}/?ref={currentUser.id}</span>
                </p>
              </div>
            )}

            <div className="p-3 border-t border-gray-150 dark:border-zinc-850 bg-white dark:bg-zinc-950 sticky bottom-0">
              <form onSubmit={handleSendGroupMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={groupInput}
                  onChange={(e) => setGroupInput(e.target.value)}
                  disabled={!currentUser || referralsCount < 10}
                  placeholder={`Broadcast to community...`}
                  className="flex-1 rounded border border-gray-200 dark:border-zinc-800 px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 font-sans font-medium disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!currentUser || referralsCount < 10 || isLoading}
                  className="rounded bg-pink-600 px-3.5 py-2 text-white hover:bg-pink-700 transition-all cursor-pointer shadow-sm shadow-pink-200/25 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER STATUS MARGIN */}
      <div className="p-2 border-t border-gray-100 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950 text-center select-none">
        <span className="text-[8px] tracking-wider text-slate-400 block font-mono">
          SECURED ENVELOPE CLIENT BY TELEGRAM SYNCHRONIZATION
        </span>
      </div>
    </div>
  );
}
