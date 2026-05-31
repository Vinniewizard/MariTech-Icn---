import React, { useState } from 'react';
import { HelpCircle, ChevronRight, CheckCircle2, BookOpen, Clock, Activity, Target, X, Sparkles, GraduationCap, Video, FileText, Mail, Info, TrendingUp, TrendingDown, Phone, UserCheck } from 'lucide-react';
import { CONTRACT_TUTORIALS } from '../data';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerToast: (text: string, success: boolean) => void;
}

export default function GuideModal({ isOpen, onClose, triggerToast }: GuideModalProps) {
  const [activeTab, setActiveTab] = useState<string>('trading-essentials');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ email: '', phone: '' });

  if (!isOpen) return null;

  const isProAcademy = activeTab === 'pro-academy';
  const isEssentials = activeTab === 'trading-essentials';
  const activeTutorial = (!isProAcademy && !isEssentials) ? (CONTRACT_TUTORIALS.find((t) => t.id === activeTab) || CONTRACT_TUTORIALS[0]) : null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.phone) return;
    setFormSubmitted(true);
    // Simulate API call
    setTimeout(() => {
      setFormSubmitted(false);
      setFormData({ email: '', phone: '' });
      triggerToast("Application Received! The LWEX Education team will contact you shortly.", true);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 transition-all backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-gray-150 bg-white p-0 text-black shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Top Header Banner */}
        <div className="bg-zinc-950 p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
              <BookOpen className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight font-sans">LWEX Academy</h2>
              <p className="text-[10px] text-gray-400 font-mono uppercase font-bold tracking-widest">Institutional Knowledge Base</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full h-8 w-8 flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer border border-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Sidebar Menu */}
          <div className="w-full md:w-64 border-r border-gray-100 bg-gray-50/50 p-4 overflow-y-auto space-y-6 shrink-0">
            
            <div className="space-y-1.5">
              <span className="block font-bold text-gray-400 uppercase text-[9px] mb-2 tracking-widest pl-1">The Basics</span>
              <button
                onClick={() => setActiveTab('trading-essentials')}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-bold transition-all cursor-pointer border ${
                  isEssentials
                    ? 'bg-black border-black text-white shadow-md'
                    : 'text-gray-500 border-transparent hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <Info className="h-3.5 w-3.5 mr-2" />
                  Guide to Trading
                </div>
                <ChevronRight className={`h-3 w-3 ${isEssentials ? 'text-white' : 'text-gray-300'}`} />
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="block font-bold text-gray-400 uppercase text-[9px] mb-2 tracking-widest pl-1">Contract Mechanics</span>
              {CONTRACT_TUTORIALS.map((tutorial) => (
                <button
                  key={tutorial.id}
                  onClick={() => setActiveTab(tutorial.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-bold transition-all cursor-pointer border ${
                    activeTab === tutorial.id
                      ? 'bg-black border-black text-white shadow-md'
                      : 'text-gray-500 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <span className="truncate">{tutorial.id === 'rise-fall' ? 'Rise / Fall' : tutorial.id === 'higher-lower' ? 'High / Low' : tutorial.id === 'touch-no-touch' ? 'Touch / No' : 'Digits'}</span>
                  <ChevronRight className={`h-3 w-3 ${activeTab === tutorial.id ? 'text-white' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>

            <div className="pt-2 space-y-1.5">
              <span className="block font-bold text-gray-400 uppercase text-[9px] mb-2 tracking-widest pl-1">LWEX Premium</span>
              <button
                onClick={() => setActiveTab('pro-academy')}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-bold transition-all cursor-pointer border ${
                  isProAcademy
                    ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-100'
                    : 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100'
                }`}
              >
                <span className="flex items-center">
                  <Sparkles className="h-3.5 w-3.5 mr-2" />
                  Pro Live Classes
                </span>
                <ChevronRight className={`h-3 w-3 ${isProAcademy ? 'text-white' : 'text-purple-300'}`} />
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-8 overflow-y-auto bg-white">
            
            {isEssentials ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-400">
                <section className="space-y-4">
                  <h3 className="text-xl font-extrabold text-black tracking-tight border-b pb-2">Mastering the Platform</h3>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-purple-600">
                        <TrendingUp className="h-5 w-5" />
                        <h4 className="font-bold text-sm uppercase">1. How to Trade</h4>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-3">
                        <p className="text-xs text-gray-600 leading-relaxed">To initiate a trade, select an asset from the <strong className="text-black text-[11px]">Trading Market</strong> dropdown. Adjust your <strong className="text-black text-[11px]">Stake</strong> (the amount you wish to risk) and your <strong className="text-black text-[11px]">Duration</strong> (how long the contract lasts). Finally, predict the price movement by selecting a direction like Rise, Fall, or Higher/Lower.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <h4 className="font-bold text-sm uppercase text-green-705">Earning Profit</h4>
                        </div>
                        <div className="bg-green-50/50 rounded-xl p-5 border border-green-100 h-full">
                          <p className="text-[11px] text-green-800 leading-relaxed font-medium">
                            You earn a profit when the market price meets your contract's criteria at the moment of expiration. For example, in a "Rise" contract, if the exit price is even 0.0001 higher than your entry price, you win the full payout.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-red-500">
                          <Info className="h-5 w-5" />
                          <h4 className="font-bold text-sm uppercase">Incurring Loss</h4>
                        </div>
                        <div className="bg-red-50/50 rounded-xl p-5 border border-red-100 h-full">
                          <p className="text-[11px] text-red-800 leading-relaxed font-medium">
                            If the market price moves against your prediction, the contract expires worthless and your stake is lost. In "No Touch" contracts, you lose if the price hits the barrier level even a single time.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="rounded-xl bg-zinc-900 p-6 text-white text-center space-y-3">
                  <h4 className="font-bold text-sm">PRO TIP: Start with Demo</h4>
                  <p className="text-[10px] text-gray-400">Use your $10,000 virtual balance to test these mechanics risk-free before switching to Real Mode.</p>
                </div>
              </div>
            ) : isProAcademy ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-yellow-700 p-8 text-white shadow-xl space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight leading-tight">Apply for Institutional<br/>Live Masterclasses</h3>
                    <p className="text-purple-100 text-xs">Join our elite mentors for real-time market analysis and advanced strategy implementation.</p>
                    </div>
                    <GraduationCap className="h-12 w-12 text-white/30" />
                  </div>

                  {!formSubmitted ? (
                    <form onSubmit={handleFormSubmit} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-purple-200">Email Address</label>
                          <input 
                            required
                            type="email" 
                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:bg-white/20"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-purple-200">Phone Number (WhatsApp)</label>
                          <input 
                            required
                            type="tel" 
                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:bg-white/20"
                            placeholder="+234..."
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                          />
                        </div>
                      </div>
                      <button 
                        type="submit"
                        className="w-full bg-white text-purple-700 font-extrabold py-3 rounded-lg hover:bg-purple-50 transition-all flex items-center justify-center space-x-2"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>SUBMIT APPLICATION</span>
                      </button>
                      <p className="text-[9px] text-center text-purple-200/60 uppercase font-bold tracking-widest">Secure Enrollment Desk: lucasantiago818</p>
                    </form>
                  ) : (
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 border border-white/20 text-center space-y-4 animate-in zoom-in-95 duration-300">
                      <div className="h-12 w-12 bg-green-500 rounded-full mx-auto flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="text-lg font-bold">Registration Transmitted!</h4>
                      <p className="text-xs text-purple-100">Our senior mentors will analyze your profile and contact you within 24 hours.</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="border border-gray-150 p-4 rounded-xl space-y-2">
                      <Video className="h-5 w-5 text-purple-600" />
                      <span className="block text-[10px] font-bold uppercase text-gray-500">Live Tutorials</span>
                      <p className="text-[11px] text-gray-600">Exclusive video archive of historical winning trades and strategy backtests.</p>
                   </div>
                   <div className="border border-gray-150 p-4 rounded-xl space-y-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <span className="block text-[10px] font-bold uppercase text-gray-500">Premium Notes</span>
                      <p className="text-[11px] text-gray-600">The "Wizard's Ledger" - weekly institutional market reports and forecast notes.</p>
                   </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="rounded-xl bg-gray-50/50 p-6 border border-gray-150 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-extrabold text-black tracking-tight leading-none">
                      {activeTutorial?.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 font-sans leading-relaxed">
                    {activeTutorial?.description}
                  </p>

                  <div className="space-y-3 pt-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 font-sans block">Execution Protocols</span>
                    <div className="grid grid-cols-1 gap-2.5">
                      {activeTutorial?.rules.map((rule, idx) => (
                        <div key={idx} className="flex items-start space-x-2.5 text-xs">
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <span className="text-gray-750 font-medium leading-relaxed">{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-150 pt-4 grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <span className="block text-[9px] text-gray-400 font-sans uppercase font-bold">Net Yield</span>
                      <span className="text-black font-extrabold">95.5% Return</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-400 font-sans uppercase font-bold">Settlement</span>
                      <span className="text-black font-extrabold">{activeTutorial?.payoutDesc}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
