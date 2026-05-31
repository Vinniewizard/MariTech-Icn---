import React from 'react';
import { X, User, Settings as SettingsIcon, Shield, CreditCard, LogOut, Clock, Globe, Phone as PhoneIcon, Edit2, Check, Mail } from 'lucide-react';
import { Account } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account;
  theme: 'dark' | 'light';
  currentUser?: any;
  onUpdateUser?: (user: any) => void;
  onLogout?: () => void;
}

export default function SettingsModal({ isOpen, onClose, account, theme, currentUser, onUpdateUser, onLogout }: SettingsModalProps) {
  const [isEditingPhone, setIsEditingPhone] = React.useState(false);
  const [phoneInput, setPhoneInput] = React.useState('');
  const [phoneError, setPhoneError] = React.useState('');
  const [isEditingEmail, setIsEditingEmail] = React.useState(false);
  const [emailInput, setEmailInput] = React.useState('');
  const [emailError, setEmailError] = React.useState('');

  React.useEffect(() => {
    if (currentUser) {
      setPhoneInput(currentUser.phone || '');
      setEmailInput(currentUser.email || '');
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleSavePhone = () => {
    if (!/^(07\d{8}|254\d{7})$/.test(phoneInput)) {
      setPhoneError('Phone exactly 10 digits starting with 254/07');
      return;
    }
    setPhoneError('');
    setIsEditingPhone(false);
    
    if (currentUser && onUpdateUser) {
      const users = JSON.parse(localStorage.getItem('lwex_users') || '[]');
      const updatedUsers = users.map((u: any) => {
          if (u.email === currentUser.email) {
              return { ...u, phone: phoneInput };
          }
          return u;
      });
      localStorage.setItem('lwex_users', JSON.stringify(updatedUsers));
      onUpdateUser({ ...currentUser, phone: phoneInput });
    }
  };

  const handleSaveEmail = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    setIsEditingEmail(false);
    
    if (currentUser && onUpdateUser) {
      const users = JSON.parse(localStorage.getItem('lwex_users') || '[]');
      const updatedUsers = users.map((u: any) => {
          if (u.email === currentUser.email) {
              return { ...u, email: emailInput };
          }
          return u;
      });
      localStorage.setItem('lwex_users', JSON.stringify(updatedUsers));
      onUpdateUser({ ...currentUser, email: emailInput });
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 transition-all backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-2xl border p-0 shadow-2xl relative overflow-hidden flex flex-col ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-gray-150 text-black'
      }`}>
        
        {/* Header */}
        <div className={`p-6 flex items-center justify-between border-b ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex items-center space-x-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-zinc-800 shadow-inner' : 'bg-white shadow-sm border border-gray-100'}`}>
              <SettingsIcon className={`h-5 w-5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Personal Settings</h2>
              <p className="text-[10px] text-gray-500 font-mono uppercase font-bold tracking-widest">User Profile & Node Security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-full h-8 w-8 flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white' : 'bg-white text-gray-400 hover:bg-gray-100 hover:text-black border border-gray-100'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* User Identity Card */}
          <div className={`rounded-xl p-5 border ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-gray-50/50 border-gray-100'}`}>
            <div className="flex items-center space-x-4">
              <div className="h-14 w-14 rounded-full bg-black flex items-center justify-center text-white text-xl font-black">
                {account.mode === 'demo' ? 'D' : 'R'}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">{currentUser?.email || 'LWEX Client'}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                    account.mode === 'real' 
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                      : 'bg-green-500/10 text-green-500 border-green-500/20'
                  }`}>
                    {account.mode === 'real' ? 'Verified Live' : 'Demo Node'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{currentUser ? 'Logged In' : 'CR198273645'}</p>
              </div>
            </div>
          </div>

          {/* User Details Settings */}
          {currentUser && (
            <div className="space-y-3">
              {/* Email Section */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900/20 border-zinc-800' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-sm">
                    <Mail className={`h-4 w-4 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
                    {isEditingEmail ? (
                      <div className="flex flex-col space-y-2">
                         <input
                           type="email"
                           value={emailInput}
                           onChange={(e) => setEmailInput(e.target.value)}
                           className={`rounded px-2 py-1 text-xs border focus:outline-none focus:ring-1 focus:ring-yellow-500 ${
                             isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-gray-50 border-gray-200 text-black'
                           }`}
                         />
                         {emailError && <span className="text-[10px] text-red-500">{emailError}</span>}
                      </div>
                    ) : (
                      <span className="font-bold tracking-tight">{currentUser.email}</span>
                    )}
                  </div>
                  <div>
                    {isEditingEmail ? (
                      <button 
                        onClick={handleSaveEmail}
                        className="p-1.5 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setEmailInput(currentUser.email);
                          setIsEditingEmail(true);
                        }}
                        className={`p-1.5 rounded-md transition-colors ${
                          isDark ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-black'
                        }`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900/20 border-zinc-800' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-sm">
                    <PhoneIcon className={`h-4 w-4 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
                    {isEditingPhone ? (
                      <div className="flex flex-col space-y-2">
                         <input
                           type="text"
                           value={phoneInput}
                           onChange={(e) => setPhoneInput(e.target.value)}
                           className={`rounded px-2 py-1 text-xs border focus:outline-none focus:ring-1 focus:ring-yellow-500 ${
                             isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-gray-50 border-gray-200 text-black'
                           }`}
                         />
                         {phoneError && <span className="text-[10px] text-red-500">{phoneError}</span>}
                      </div>
                    ) : (
                      <span className="font-bold font-mono tracking-wide">{currentUser.phone}</span>
                    )}
                  </div>
                  <div>
                    {isEditingPhone ? (
                      <button 
                        onClick={handleSavePhone}
                        className="p-1.5 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setPhoneInput(currentUser.phone);
                          setIsEditingPhone(true);
                        }}
                        className={`p-1.5 rounded-md transition-colors ${
                          isDark ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-black'
                        }`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>


            </div>
          )}

          {/* Account Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900/20 border-zinc-800' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center space-x-2 text-gray-400 mb-2">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Currency</span>
              </div>
              <p className="text-sm font-bold">USD - US Dollar</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900/20 border-zinc-800' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center space-x-2 text-gray-400 mb-2">
                <Globe className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Region</span>
              </div>
              <p className="text-sm font-bold">International (Global)</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900/20 border-zinc-800' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center space-x-2 text-gray-400 mb-2">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Last Sync</span>
              </div>
              <p className="text-sm font-bold">Just Now</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900/20 border-zinc-800' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center space-x-2 text-gray-400 mb-2">
                <Shield className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Security</span>
              </div>
              <p className="text-sm font-bold">2FA Enabled</p>
            </div>
          </div>

          {/* Action List */}
          <div className="space-y-2">
            <button className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-sm font-bold ${
              isDark ? 'border-zinc-800 hover:bg-zinc-900' : 'border-gray-100 hover:bg-gray-50'
            }`}>
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-gray-400" />
                <span>Personal Information</span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </button>
            
            {currentUser && (
              <button 
                onClick={() => {
                  if (onLogout) onLogout();
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 group ${
                  isDark ? 'border-zinc-800 text-zinc-400' : 'border-gray-100 text-gray-500'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <LogOut className="h-4 w-4 text-gray-400 group-hover:text-red-500" />
                  <span>Logout Session</span>
                </div>
                <X className="h-4 w-4 text-gray-300 group-hover:text-red-400" />
              </button>
            )}
          </div>
        </div>

        <div className={`p-6 border-t ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
          <p className="text-[10px] text-center text-gray-450 font-mono font-bold tracking-widest uppercase">
            LWEX Secure Node v2.0.4.stable
          </p>
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
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
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
