import React, { useEffect, useState } from 'react';
import { CreditCard, ArrowDownCircle, ArrowUpRight, DollarSign, Wallet2, Check, RefreshCw, X, Shield, History, Clock } from 'lucide-react';
import { Account } from '../types';

interface CashierModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account;
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
  currentUser?: any;
  theme: 'dark' | 'light';
}

type PaymentMethod = 'nowpayments' | 'paybill';

async function readApiResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error('Cashier API route is returning HTML instead of JSON. Check the Cloudflare Worker/API deployment and D1 binding.');
  }

  return response.json();
}

export default function CashierModal({
  isOpen,
  onClose,
  account,
  onDeposit,
  onWithdraw,
  currentUser,
  theme
}: CashierModalProps) {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [amount, setAmount] = useState<number>(100);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('nowpayments');
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [selectedNetwork, setSelectedNetwork] = useState('BTC');
  const [depositAddress, setDepositAddress] = useState<{ address?: string; tag?: string; url?: string; paymentId?: string; amount?: number } | null>(null);
  const [txHash, setTxHash] = useState('');
  const [mpesaMessage, setMpesaMessage] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const [addressTag, setAddressTag] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [apiError, setApiError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [sandboxReason, setSandboxReason] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);
  
  const [depositHistory, setDepositHistory] = useState<any[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
  const [historyTab, setHistoryTab] = useState<'deposits' | 'withdrawals'>('deposits');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const isKenya = currentUser?.country?.toLowerCase() === 'kenya';
  const isCryptoRoute = paymentMethod === 'nowpayments';

  // Automatically lock payment option for non-Kenyan users to NOWPayments (crypto)
  useEffect(() => {
    if (isOpen) {
      if (currentUser?.country?.toLowerCase() === 'kenya') {
        setPaymentMethod('paybill');
      } else {
        setPaymentMethod('nowpayments');
      }
    }
  }, [isOpen, currentUser]);

  // Synchronize limits and clear states when tab changes
  useEffect(() => {
    setApiError('');
    setSuccessMsg('');
    setDepositAddress(null);
    setSandboxReason('');
    
    if (activeTab === 'deposit') {
      if (amount < 1) setAmount(10);
    } else {
      if (amount < 10) setAmount(10);
    }
  }, [activeTab]);

  const handleAmountChange = (val: number) => {
    setAmount(val);
    setDepositAddress(null);
    setSandboxReason('');
    setApiError('');
  };

  const handleCoinChange = (coin: string) => {
    setSelectedCoin(coin);
    setDepositAddress(null);
    setSandboxReason('');
    setApiError('');
    if (coin === 'BTC') setSelectedNetwork('BTC');
    else if (coin === 'ETH') setSelectedNetwork('ETH');
    else if (coin === 'USDTTRC20') setSelectedNetwork('TRX');
    else if (coin === 'USDT') setSelectedNetwork('ETH');
  };

  const handleGenerateDepositAddress = async () => {
    if (amount < 1) {
      setApiError('The minimum deposit is $1 USD.');
      return;
    }

    setIsAddressLoading(true);
    setApiError('');
    setSandboxReason('');
    setDepositAddress(null);

    const userId = currentUser?.id || currentUser?.email || account.id;

    try {
      const response = await fetch(`/api/cashier/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          coin: selectedCoin,
          userId
        })
      });

      const data = await readApiResponse(response);
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to generate deposit address.');
      }

      setDepositAddress({
        address: data.address,
        paymentId: data.payment_id,
        amount: data.amount
      });

      if (data.isSandbox && data.sandboxReason) {
        setSandboxReason(data.sandboxReason);
      } else {
        setSandboxReason('');
      }
    } catch (error: any) {
      setDepositAddress(null);
      setApiError(error.message || 'Failed to locate a secure deposit gateway.');
    } finally {
      setIsAddressLoading(false);
    }
  };

  // Background polling for pending cryptocurrency deposits every 10 seconds
  useEffect(() => {
    if (!isOpen || activeTab !== 'deposit' || paymentMethod !== 'nowpayments' || !depositAddress?.paymentId || successMsg) {
      return;
    }

    let intervalId: NodeJS.Timeout;
    let isChecking = false;

    const checkDepositStatus = async () => {
      if (isChecking) return;
      isChecking = true;
      setIsPolling(true);

      const userId = currentUser?.id || currentUser?.email || account.id;
      try {
        const response = await fetch(`/api/cashier/verify-deposit?paymentId=${depositAddress.paymentId}&userId=${userId}`);
        const data = await readApiResponse(response);
        
        if (response.ok && data.success) {
          const creditedAmount = Number(data.creditedAmount) || amount;
          onDeposit(creditedAmount);
          setSuccessMsg(`Deposit successful! $${creditedAmount.toLocaleString()} has been credited to your wallet.`);
          setDepositAddress(null);
          setSandboxReason('');
        } else {
          if (data.status) {
            setPaymentStatus(data.status);
          }
        }
      } catch (error: any) {
        console.warn('Silent background check warning:', error.message);
      } finally {
        isChecking = false;
        setIsPolling(false);
      }
    };

    // Begin check after 10s and recheck every 10s
    intervalId = setInterval(checkDepositStatus, 10000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, activeTab, paymentMethod, depositAddress?.paymentId, successMsg, currentUser, account.id, amount, onDeposit]);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      const fetchHistory = async () => {
        setIsHistoryLoading(true);
        try {
          const userId = currentUser?.id || currentUser?.email || account.id;
          const res = await fetch(`/api/cashier/history?userId=${userId}`);
          const data = await res.json();
          if (res.ok && data.success) {
            setDepositHistory(data.history || []);
            setWithdrawalHistory(data.withdrawals || []);
          }
        } catch (error) {
          console.error('Failed to fetch deposit history:', error);
        } finally {
          setIsHistoryLoading(false);
        }
      };
      fetchHistory();
    }
  }, [isOpen, activeTab, currentUser, account?.id]);

  if (!isOpen) return null;

  const selectPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setSuccessMsg('');
    setApiError('');

    if (method === 'nowpayments') {
      setSelectedCoin('BTC');
      setSelectedNetwork('BTC');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    if (activeTab === 'deposit' && amount < 1) {
      setApiError('The minimum deposit amount is $1 USD.');
      return;
    }

    if (activeTab === 'withdraw' && amount < 10) {
      setApiError('The minimum withdrawal amount is $10 USD.');
      return;
    }

    if (activeTab === 'withdraw' && amount > account.balance) {
      setApiError('Withdrawal amount cannot exceed your active balance.');
      return;
    }

    setIsProcessing(true);
    setSuccessMsg('');
    setApiError('');

    try {
      const userId = currentUser?.id || currentUser?.email || account.id;

      if (paymentMethod === 'paybill') {
        if (activeTab === 'deposit' && !receiptFile) {
          throw new Error('Please upload your M-Pesa receipt for verification.');
        }

        if (activeTab === 'deposit') {
          const formData = new FormData();
          formData.append('receipt', receiptFile!);
          formData.append('userId', userId);
          formData.append('amount', amount.toString());
          formData.append('paymentMethod', 'paybill');
          if (receiptFile) formData.append('receipt', receiptFile);
          if (mpesaMessage) formData.append('message', mpesaMessage);

          if (!receiptFile && !mpesaMessage) {
            throw new Error('Please provide either an M-Pesa receipt image or the transaction message.');
          }

          const response = await fetch('/api/cashier/upload-receipt', {
            method: 'POST',
            body: formData
          });

          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data.message || 'Receipt upload failed.');
          }

          setReceiptFile(null);
          setMpesaMessage('');
          setSuccessMsg('Deposit details submitted! LWEX admin will verify and credit your account within 30 minutes.');
          return;
        } else {
          throw new Error('M-Pesa withdrawals are currently processed manually. Please contact support with your M-Pesa details.');
        }
      }

      if (!isCryptoRoute) {
        throw new Error('This payment route is not connected to a live processor.');
      }

      if (activeTab === 'deposit') {
        if (!depositAddress?.paymentId) {
          throw new Error('Please request a secure deposit address first.');
        }

        const response = await fetch(`/api/cashier/verify-deposit?paymentId=${depositAddress.paymentId}&userId=${userId}`);
        const data = await readApiResponse(response);
        
        if (!response.ok || !data.success) {
          setPaymentStatus(data.status || 'waiting');
          throw new Error(data.message || 'Deposit not yet confirmed on the blockchain.');
        }

        const creditedAmount = Number(data.creditedAmount) || amount;
        onDeposit(creditedAmount);
        setSuccessMsg(`Deposit successful! $${creditedAmount.toLocaleString()} has been credited to your wallet.`);
      } else {
        if (!targetAddress.trim()) {
          throw new Error('Enter the receiving wallet address.');
        }

        const response = await fetch('/api/cashier/dispatch-withdrawal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetAddress: targetAddress.trim(),
            amount,
            coin: selectedCoin,
            userId
          })
        });
        const data = await readApiResponse(response);
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Withdrawal dispatch failed.');
        }

        onWithdraw(amount);
        setTargetAddress('');
        setAddressTag('');
        setSuccessMsg(data.message || `Withdrawal submitted. $${amount.toLocaleString()} is now being processed to your ${selectedCoin} wallet.`);
      }
    } catch (error: any) {
      setApiError(error.message || 'Cashier request failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-black/45 p-0 transition-all backdrop-blur-sm sm:items-center sm:p-4">
      <div className={`relative w-screen max-w-full sm:w-full sm:max-w-md max-h-[100dvh] sm:max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-lg border shadow-2xl transition-all sm:my-0 sm:rounded-xl box-border px-3 py-3 sm:p-6 ${
        theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
      }`}>
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded p-1 sm:p-1.5 text-gray-400 hover:bg-gray-100 hover:text-black transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>

        <div className="mb-3 sm:mb-5">
          <h2 className={`text-sm sm:text-base font-bold tracking-tight font-sans flex items-center gap-1 sm:gap-1.5 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
            <Wallet2 className={`h-4 w-4 sm:h-4.5 sm:w-4.5 ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
            <span className="truncate">LWEX exchange</span>
          </h2>
          <span className="text-[8px] sm:text-[9px] text-gray-400 font-mono font-bold uppercase tracking-wide truncate block">
            WALLET: MT-{account.id.substring(0, 8).toUpperCase()}
          </span>
          <span className="text-[8px] sm:text-[9px] text-gray-400 font-mono font-bold uppercase tracking-wide">
            MODE: {account.mode.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-md bg-gray-100 p-1 mb-3 sm:mb-5 select-none border border-gray-200/50">
          <button
            onClick={() => {
              setActiveTab('deposit');
              setSuccessMsg('');
              setApiError('');
            }}
            className={`flex items-center justify-center space-x-1 rounded py-2 sm:py-1.5 text-[10px] sm:text-xs font-bold uppercase transition-all cursor-pointer ${
              activeTab === 'deposit' ? (theme === 'dark' ? 'bg-slate-800 text-brand-primary shadow' : 'bg-white text-black shadow') : 'text-slate-400 hover:text-brand-primary'
            }`}
          >
            <ArrowDownCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Deposit</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('withdraw');
              setSuccessMsg('');
              setApiError('');
            }}
            className={`flex items-center justify-center space-x-1 rounded py-2 sm:py-1.5 text-[10px] sm:text-xs font-bold uppercase transition-all cursor-pointer ${
              activeTab === 'withdraw' ? (theme === 'dark' ? 'bg-slate-800 text-brand-accent shadow' : 'bg-white text-black shadow') : 'text-slate-400 hover:text-brand-accent'
            }`}
          >
            <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Withdraw</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              setSuccessMsg('');
              setApiError('');
            }}
            className={`flex items-center justify-center space-x-1 rounded py-2 sm:py-1.5 text-[10px] sm:text-xs font-bold uppercase transition-all cursor-pointer ${
              activeTab === 'history' ? (theme === 'dark' ? 'bg-slate-800 text-brand-primary shadow' : 'bg-white text-black shadow') : 'text-slate-400 hover:text-brand-primary'
            }`}
          >
            <History className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>History</span>
          </button>
        </div>

        {successMsg && activeTab !== 'history' ? (
          <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 sm:p-5 text-center space-y-3 sm:space-y-4">
            <div className="mx-auto flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check className="h-4 w-4 sm:h-5 sm:w-5 font-bold" />
            </div>
            <p className="text-[9px] sm:text-xs text-gray-700 font-bold">{successMsg}</p>
            <button
              onClick={() => setSuccessMsg('')}
              className="rounded bg-black text-white px-4 sm:px-5 py-2.5 sm:py-2 text-[9px] sm:text-xs font-bold uppercase hover:bg-gray-950 transition-all cursor-pointer"
            >
              Continue Banking
            </button>
          </div>
        ) : activeTab === 'history' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div className={`flex rounded p-0.5 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-gray-100 border border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => setHistoryTab('deposits')}
                  className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase rounded transition-colors ${historyTab === 'deposits' ? (theme === 'dark' ? 'bg-slate-800 text-yellow-500 shadow-sm' : 'bg-white text-yellow-600 shadow-sm') : 'text-slate-400 hover:text-slate-300'}`}
                >
                  Deposits
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab('withdrawals')}
                  className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase rounded transition-colors ${historyTab === 'withdrawals' ? (theme === 'dark' ? 'bg-slate-800 text-yellow-500 shadow-sm' : 'bg-white text-yellow-600 shadow-sm') : 'text-slate-400 hover:text-slate-300'}`}
                >
                  Withdrawals
                </button>
              </div>
              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Sort: {sortOrder === 'desc' ? 'Most Recent' : 'Oldest'}
              </button>
            </div>
            {isHistoryLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-yellow-500" />
              </div>
            ) : historyTab === 'deposits' ? (
              depositHistory.length === 0 ? (
                <div className="text-center p-8 border rounded-lg border-dashed border-slate-700 bg-slate-900/50">
                  <p className="text-xs text-slate-400">No verified deposits found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs min-w-[400px]">
                    <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-slate-900 text-slate-400' : 'bg-gray-100 text-gray-600'} text-[9px] uppercase tracking-wider z-10`}>
                      <tr>
                        <th className="px-3 py-2 font-bold rounded-tl-lg">Date</th>
                        <th className="px-3 py-2 font-bold">Amount</th>
                        <th className="px-3 py-2 font-bold">Asset</th>
                        <th className="px-3 py-2 font-bold text-right rounded-tr-lg">Tx Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-mono text-[10px] sm:text-xs">
                      {[...depositHistory].sort((a, b) => {
                        const dA = new Date(a.date).getTime();
                        const dB = new Date(b.date).getTime();
                        return sortOrder === 'desc' ? dB - dA : dA - dB;
                      }).map((d, i) => (
                        <tr key={i} className={`group transition-colors ${theme === 'dark' ? 'hover:bg-slate-900/50' : 'hover:bg-gray-50'}`}>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">
                            {new Date(d.date).toLocaleDateString()} <span className="text-[9px]">{new Date(d.date).toLocaleTimeString()}</span>
                          </td>
                          <td className="px-3 py-2.5 font-bold text-green-500">
                            +${Number(d.amount).toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-yellow-500">
                            {d.coin.toUpperCase()}
                          </td>
                          <td className="px-3 py-2.5 text-right opacity-50 group-hover:opacity-100 transition-opacity">
                            <span className="truncate max-w-[80px] sm:max-w-[120px] inline-block">{d.txHash}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              // Withdrawals View
              withdrawalHistory.length === 0 ? (
                <div className="text-center p-8 border rounded-lg border-dashed border-slate-700 bg-slate-900/50">
                  <p className="text-xs text-slate-400">No withdrawals found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs min-w-[400px]">
                    <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-slate-900 text-slate-400' : 'bg-gray-100 text-gray-600'} text-[9px] uppercase tracking-wider z-10`}>
                      <tr>
                        <th className="px-3 py-2 font-bold rounded-tl-lg">Date</th>
                        <th className="px-3 py-2 font-bold">Amount</th>
                        <th className="px-3 py-2 font-bold">Asset/Method</th>
                        <th className="px-3 py-2 font-bold">Status</th>
                        <th className="px-3 py-2 font-bold text-right rounded-tr-lg">Destination</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-mono text-[10px] sm:text-xs">
                      {[...withdrawalHistory].sort((a, b) => {
                        const dA = new Date(a.date).getTime();
                        const dB = new Date(b.date).getTime();
                        return sortOrder === 'desc' ? dB - dA : dA - dB;
                      }).map((w, i) => (
                        <tr key={i} className={`group transition-colors ${theme === 'dark' ? 'hover:bg-slate-900/50' : 'hover:bg-gray-50'}`}>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">
                            {new Date(w.date).toLocaleDateString()} <span className="text-[9px]">{new Date(w.date).toLocaleTimeString()}</span>
                          </td>
                          <td className="px-3 py-2.5 font-bold text-red-500">
                            -${Number(w.amount).toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-yellow-500 uppercase">
                            {w.paymentMethod === 'paybill' ? 'M-PESA' : w.coin}
                          </td>
                          <td className="px-3 py-2.5 text-[10px]">
                            <div className="flex items-center space-x-1.5 min-w-[120px]">
                              {/* Pending Step */}
                              <div className={`flex items-center justify-center rounded-full p-1 border ${
                                w.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 
                                'bg-green-500/10 border-green-500/30 text-green-500'
                              }`} title="Pending">
                                {w.status === 'pending' ? <Clock className="w-2.5 h-2.5 animate-pulse" /> : <Check className="w-2.5 h-2.5" />}
                              </div>
                              
                              <div className={`h-px w-3 sm:w-4 ${w.status === 'pending' ? 'bg-slate-700' : 'bg-green-500/50'}`} />
                              
                              {/* Processing Step */}
                              <div className={`flex items-center justify-center rounded-full p-1 border ${
                                w.status === 'processing' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 
                                (w.status === 'completed' || w.status === 'paid') ? 'bg-green-500/10 border-green-500/30 text-green-500' : 
                                'bg-slate-800 border-slate-700 text-slate-500'
                              }`} title="Processing">
                                {w.status === 'processing' ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : 
                                 (w.status === 'completed' || w.status === 'paid') ? <Check className="w-2.5 h-2.5" /> : 
                                 <RefreshCw className="w-2.5 h-2.5 opacity-40" />}
                              </div>
                              
                              <div className={`h-px w-3 sm:w-4 ${(w.status === 'completed' || w.status === 'paid') ? 'bg-green-500/50' : 'bg-slate-700'}`} />
                              
                              {/* Completed Step */}
                              <div className={`flex items-center justify-center rounded-full p-1 border ${
                                (w.status === 'completed' || w.status === 'paid') ? 'bg-green-500/10 border-green-500/30 text-green-500' : 
                                'bg-slate-800 border-slate-700 text-slate-500'
                              }`} title="Completed">
                                <Check className={`w-2.5 h-2.5 ${(w.status === 'completed' || w.status === 'paid') ? '' : 'opacity-40'}`} />
                              </div>
                              
                              <span className="ml-2 font-bold capitalize hidden md:inline text-slate-300">
                                {w.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right opacity-50 group-hover:opacity-100 transition-opacity">
                            <span className="truncate max-w-[80px] sm:max-w-[120px] inline-block">{w.address}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        ) : (
          <form id="cashier-action-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Amount input block */}
            <div className="space-y-1.5">
              <label htmlFor="cashier-amount-input" className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase block tracking-wider">
                USD Amount requested
              </label>
              <div className={`flex rounded-md border items-center px-3 focus-within:border-yellow-500 min-h-12 sm:min-h-11 transition-colors ${
                theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <DollarSign className="h-4.5 w-4.5 text-slate-400 flex-shrink-0" />
                <input
                  id="cashier-amount-input"
                  type="number"
                  min={activeTab === 'deposit' ? 1 : 10}
                  max={50000}
                  disabled={activeTab === 'deposit' && depositAddress !== null}
                  value={amount}
                  onChange={(e) => handleAmountChange(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-transparent font-mono text-base sm:text-sm font-bold focus:outline-none text-current"
                />
              </div>
              <div className="flex justify-between items-center text-[9px] sm:text-[10px] text-slate-400 font-bold">
                <span>{activeTab === 'deposit' ? 'Minimum deposit is $1 USD' : 'Minimum withdrawal is $10 USD'}</span>
                {activeTab === 'deposit' && depositAddress !== null && (
                  <span className="text-yellow-500 animate-pulse font-mono">Amount locked for instructions</span>
                )}
              </div>
            </div>

            {/* Quick Presets Grid */}
            {(!depositAddress || activeTab === 'withdraw') && (
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
                {(activeTab === 'deposit' ? [10, 25, 100, 250] : [20, 50, 250, 1000]).map((val) => (
                  <button
                    id={`cashier-preset-${val}`}
                    type="button"
                    key={val}
                    onClick={() => handleAmountChange(val)}
                    className={`rounded border py-2.5 sm:py-2 text-[11px] sm:text-[10px] font-bold transition-all cursor-pointer ${
                      amount === val
                        ? 'bg-yellow-500 text-slate-950 border-yellow-500'
                        : theme === 'dark'
                          ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
            )}

            {/* Kenya Paybill vs NOWPayments select bar */}
            {isKenya && !depositAddress && (
              <div className="space-y-1.5 pt-1.5 border-t border-slate-850 dark:border-slate-800/60">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select payment route
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="cashier-route-mpesa"
                    type="button"
                    onClick={() => selectPaymentMethod('paybill')}
                    className={`rounded-lg border p-3.5 sm:p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      paymentMethod === 'paybill' ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-slate-850 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <DollarSign className="h-5 w-5" />
                    <span className="text-[10px] font-black">{activeTab === 'deposit' ? 'M-Pesa Paybill' : 'M-Pesa'}</span>
                  </button>

                  <button
                    id="cashier-route-crypto"
                    type="button"
                    onClick={() => selectPaymentMethod('nowpayments')}
                    className={`rounded-lg border p-3.5 sm:p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      paymentMethod === 'nowpayments' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 'border-slate-850 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <RefreshCw className="h-5 w-5" />
                    <span className="text-[10px] font-black">NOWPayments</span>
                  </button>
                </div>
              </div>
            )}

            {isCryptoRoute && (
              <div className="space-y-4">
                {/* Cryptocurrency selection dropdown as requested */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="cashier-coin-select" className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Cryptocurrency
                    </label>
                    <select
                      id="cashier-coin-select"
                      disabled={activeTab === 'deposit' && depositAddress !== null}
                      value={selectedCoin}
                      onChange={(e) => handleCoinChange(e.target.value)}
                      className={`w-full rounded-lg border px-3 py-3.5 sm:py-3 text-xs font-bold outline-none cursor-pointer transition-colors ${
                        theme === 'dark' 
                          ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-yellow-500' 
                          : 'bg-white border-slate-250 text-slate-850 focus:border-yellow-500'
                      }`}
                    >
                      <option value="BTC">BTC (Bitcoin)</option>
                      <option value="ETH">ETH (Ethereum ERC20)</option>
                      <option value="USDT">USDT (USDT ERC20)</option>
                      <option value="USDTTRC20">USDT (USDT TRC20)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Required Network
                    </label>
                    <div className={`w-full rounded-lg border px-3 py-3.5 sm:py-3 text-xs font-black font-mono transition-colors ${
                      theme === 'dark' 
                        ? 'bg-slate-900/40 border-slate-800 text-yellow-400' 
                        : 'bg-slate-50 border-slate-200 text-yellow-600'
                    }`}>
                      {selectedNetwork} NETWORK
                    </div>
                  </div>
                </div>

                {/* Main Crypto Panel Display */}
                <div className={`rounded-xl border p-4 sm:p-5 space-y-4 ${
                  theme === 'dark' ? 'bg-slate-905 border-slate-800/80 shadow-md' : 'bg-slate-50/50 border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/10 dark:border-slate-800/50 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        SECURE CRYPTO ENDPOINT
                      </span>
                    </div>
                    <Shield className="h-4 w-4 text-yellow-500" />
                  </div>

                  {sandboxReason && (
                    <div className="p-3 rounded bg-amber-500/10 border border-amber-500/25 text-amber-550 text-[10px] leading-relaxed space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <span className="animate-pulse">●</span> LIVE SANDBOX DEPOSIT LEDGER
                      </p>
                      <p className="text-[9px] text-slate-700 dark:text-slate-300 font-medium">
                        {sandboxReason}
                      </p>
                    </div>
                  )}

                  {activeTab === 'deposit' ? (
                    <>
                      {!depositAddress ? (
                        <div className="py-4 text-center space-y-3">
                          <div className="flex justify-center">
                            <Wallet2 className="h-8 w-8 text-slate-400 animate-bounce" />
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-300 font-medium max-w-xs mx-auto">
                            Generate unique credentials to deposit {amount} USD via {selectedCoin}.
                          </p>
                          <button
                            id="cashier-generate-address-btn"
                            type="button"
                            disabled={isAddressLoading}
                            onClick={handleGenerateDepositAddress}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black text-xs uppercase tracking-widest py-3 px-4 rounded-lg transition-all cursor-pointer shadow-lg shadow-yellow-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isAddressLoading ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                <span>Generating unique address...</span>
                              </>
                            ) : (
                              <span>Generate {selectedCoin} Deposit Instructions</span>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* QR Code Container using safe qrserver API */}
                          <div id="cashier-deposit-qrcode-card" className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-slate-200 max-w-[160px] mx-auto select-none shadow">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(depositAddress.address ?? '')}`}
                              alt="Cryptocurrency Address QR Target"
                              className="h-28 w-28 object-contain"
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-[8px] text-slate-500 font-black uppercase mt-1 tracking-wider font-mono">LWEX SECURE TX</span>
                          </div>

                          {/* Address details */}
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                                SEND {selectedCoin} TO THIS ADDRESS
                              </p>
                              <div className="flex items-center space-x-2 bg-slate-950 p-2.5 rounded border border-slate-800">
                                <code className="text-xs text-brand-primary font-mono truncate flex-1 select-all">
                                  {depositAddress.address}
                                </code>
                                <button
                                  id="cashier-copy-address"
                                  type="button"
                                  onClick={() => {
                                    if (depositAddress?.address) {
                                      navigator.clipboard.writeText(depositAddress.address);
                                      setSuccessMsg('Address copied to clipboard!');
                                      setTimeout(() => setSuccessMsg(''), 2000);
                                    }
                                  }}
                                  className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                                  title="Copy Wallet Address"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {depositAddress.tag && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                                  REQUIRED MEMO / DESTINATION TAG
                                </p>
                                <div className="flex items-center space-x-2 bg-slate-950 p-2.5 rounded border border-slate-800">
                                  <code className="text-xs text-brand-primary font-mono truncate flex-1 select-all font-bold">
                                    {depositAddress.tag}
                                  </code>
                                  <button
                                    id="cashier-copy-tag"
                                    type="button"
                                    onClick={() => {
                                      if (depositAddress?.tag) {
                                        navigator.clipboard.writeText(depositAddress.tag);
                                        setSuccessMsg('Memo copied to clipboard!');
                                        setTimeout(() => setSuccessMsg(''), 2000);
                                      }
                                    }}
                                    className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                                    title="Copy Memo"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Exact crypto amount instructions */}
                            <div className="p-3 bg-yellow-950/20 rounded border border-yellow-500/20 space-y-1 text-center">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">
                                EXACT AMOUNT TO TRANSFER
                              </p>
                              <div className="flex items-center justify-center space-x-2">
                                <span className="text-base sm:text-lg font-black text-yellow-400 font-mono">
                                  {depositAddress.amount} {selectedCoin}
                                </span>
                                <button
                                  id="cashier-copy-amount"
                                  type="button"
                                  onClick={() => {
                                    if (depositAddress?.amount) {
                                      navigator.clipboard.writeText(String(depositAddress.amount));
                                      setSuccessMsg('Amount copied to clipboard!');
                                      setTimeout(() => setSuccessMsg(''), 2000);
                                    }
                                  }}
                                  className="text-slate-400 hover:text-yellow-400 transition-all cursor-pointer p-0.5"
                                  title="Copy Amount"
                                >
                                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                  </svg>
                                </button>
                              </div>
                              <p className="text-[9px] text-slate-400 font-medium">
                                Equals exactly <strong className="text-white">${amount} USD</strong> at current real-time market rate.
                              </p>
                            </div>
                          </div>

                          {/* Background status checker UI indicator */}
                          <div className={`flex items-center justify-between p-3 rounded-xl border select-none transition-all ${
                            theme === 'dark' 
                              ? 'bg-slate-900/40 border-slate-800/80 shadow-inner' 
                              : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center space-x-2.5">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
                              </span>
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                                {isPolling ? 'Checking transfer on blockchain...' : 'Monitoring incoming payment...'}
                              </span>
                            </div>
                            <span className="font-mono text-[9px] text-yellow-500 font-extrabold uppercase tracking-wide animate-pulse">
                              Auto-verifying (10s)
                            </span>
                          </div>

                          {/* Info footer */}
                          <div className="space-y-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                            <p>
                              Send funds using any cryptocurrency exchange or personal wallet. Direct account settings and billing links can be checked on <a href="https://account.nowpayments.io/" target="_blank" rel="noopener noreferrer" className="text-yellow-500 underline hover:text-yellow-400 font-bold">account.nowpayments.io</a>.
                            </p>
                            <p className="font-bold text-slate-600 dark:text-slate-300">
                              Once successfully sent, click the 'Verify Blockchain Deposit' button below to automatically check confirms and credit your exchange balance immediately!
                            </p>
                          </div>

                          {/* Start over button */}
                          <button
                            id="cashier-reset-deposit-btn"
                            type="button"
                            onClick={() => {
                              setDepositAddress(null);
                              setSandboxReason('');
                            }}
                            className="w-full bg-slate-905 hover:bg-slate-800 text-slate-400 dark:text-slate-300 border border-slate-800/60 text-[10px] uppercase font-bold py-2 rounded-md transition-colors cursor-pointer"
                          >
                            Enter Different Amount / Start Over
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Withdrawal form inputs */}
                      <div className="space-y-3.5">
                        <div className="space-y-1.5">
                          <label htmlFor="cashier-dest-address" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Receiving {selectedCoin} Wallet Address
                          </label>
                          <input
                            id="cashier-dest-address"
                            type="text"
                            value={targetAddress}
                            onChange={(e) => setTargetAddress(e.target.value)}
                            placeholder={`Paste your secure ${selectedCoin} (${selectedNetwork}) address`}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3.5 py-3 sm:py-2.5 text-xs text-white font-mono focus:border-yellow-500 outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="cashier-dest-tag" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Memo / Destination Tag <span className="text-slate-500 lowercase">(optional)</span>
                          </label>
                          <input
                            id="cashier-dest-tag"
                            type="text"
                            value={addressTag}
                            onChange={(e) => setAddressTag(e.target.value)}
                            placeholder="Destination tag if sending to exchange"
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3.5 py-3 sm:py-2.5 text-xs text-white font-mono focus:border-yellow-500 outline-none transition-all"
                          />
                        </div>

                        <div className="p-3 bg-yellow-950/20 border border-yellow-500/10 rounded text-[10px] text-slate-400 leading-relaxed space-y-1.5 font-medium">
                          <p>
                            Withdrawals are processed via safe direct API payloads. Always ensure your destination wallet supports the <strong className="text-white font-mono">{selectedNetwork} Network</strong> to prevent loss of digital assets.
                          </p>
                          <p className="font-bold text-yellow-400">
                             Minimum withdrawal: $10.00 USD.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {apiError && (
              <div id="cashier-api-error" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[10px] sm:text-xs font-bold text-red-500 dark:text-red-400 leading-relaxed">
                {apiError}
              </div>
            )}

            {paymentMethod === 'paybill' && activeTab === 'deposit' && (
              <div className="rounded-lg bg-slate-900 border border-slate-800 p-4 space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                  <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">
                    M-Pesa Lipa Na Paybill
                  </span>
                  <DollarSign className="h-3.5 w-3.5 text-green-500" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Business Number</p>
                    <p className="text-sm font-mono font-bold text-white">542542</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Account Number</p>
                    <p className="text-sm font-mono font-bold text-white">00204484326150</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="mpesa-msg-area" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Option A: Paste M-Pesa Confirmation Message
                  </label>
                  <textarea
                    id="mpesa-msg-area"
                    value={mpesaMessage}
                    onChange={(e) => setMpesaMessage(e.target.value)}
                    placeholder="Paste the message here (e.g. QXJ7... Confirmed. Ksh...)"
                    className="w-full h-20 bg-slate-950 border border-slate-800 rounded p-2 text-[10px] text-white font-mono focus:border-green-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="mpesa-screenshot-file" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Option B: Upload Payment Receipt (Screenshot)
                  </label>
                  <input
                    id="mpesa-screenshot-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-green-500 file:text-white hover:file:bg-green-600 cursor-pointer"
                  />
                  {receiptFile && <p className="text-[9px] text-green-500 font-bold">Selected: {receiptFile.name}</p>}
                </div>

                <div className="p-3 bg-green-500/5 rounded border border-green-500/20">
                  <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                    Instructions: Pay <span className="text-green-500 font-bold">${amount}</span> to the Paybill above, take a screenshot of the confirmation message, and upload it here.
                  </p>
                </div>
              </div>
            )}

            {paymentMethod === 'paybill' && activeTab === 'withdraw' && (
              <div className="rounded-lg bg-slate-900 border border-slate-800 p-4 space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                  <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">
                    M-Pesa Withdrawal
                  </span>
                  <DollarSign className="h-3.5 w-3.5 text-green-500" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="mpesa-withdraw-number" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Receiving M-Pesa Phone Number
                  </label>
                  <input
                    id="mpesa-withdraw-number"
                    type="text"
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                    placeholder="e.g. 0712345678"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3.5 py-3 sm:py-2.5 text-xs text-white font-mono focus:border-green-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Dynamic Bottom Submit Button */}
            <button
              id="cashier-submit-trigger"
              type="submit"
              disabled={isProcessing || isAddressLoading}
              onClick={
                activeTab === 'deposit' && paymentMethod === 'nowpayments' && !depositAddress 
                  ? (e) => { e.preventDefault(); handleGenerateDepositAddress(); } 
                  : undefined
              }
              className={`flex w-full items-center justify-center space-x-2 rounded py-4 sm:py-3.5 font-bold transition-all text-xs sm:text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 select-none ${
                paymentMethod === 'paybill' 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-yellow-500 text-slate-950 hover:bg-yellow-600 shadow-lg shadow-yellow-500/10'
              }`}
            >
              {isProcessing || isAddressLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                  <span>
                    {isAddressLoading 
                      ? 'Generating address...' 
                      : activeTab === 'deposit' 
                        ? 'Verifying Payment status...' 
                        : 'Submitting request...'}
                  </span>
                </>
              ) : (
                <span>
                  {activeTab === 'deposit' 
                    ? (paymentMethod === 'paybill' ? 'Upload & Notify Admin' : (!depositAddress ? `Generate ${selectedCoin} Address` : 'Verify Blockchain Deposit')) 
                    : 'Dispatch Withdrawal'}
                </span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
