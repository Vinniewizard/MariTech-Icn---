import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Phone, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onSuccess: (user: any) => void;
  initialView?: 'login' | 'register' | 'forgot_password' | 'reset_password';
}

type AuthView = 'login' | 'register' | 'forgot_password' | 'reset_password';

export default function AuthModal({ isOpen, onClose, theme, onSuccess, initialView }: AuthModalProps) {
  const [view, setView] = useState<AuthView>('login');

  useEffect(() => {
    if (isOpen && initialView) {
      setView(initialView);
    }
  }, [isOpen, initialView]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsLoading(true);
    
    if (view === 'register') {
      // Phone number should be exactly 10 starting with either 254 or 07
      if (!/^(07\d{8}|254\d{7})$/.test(phone)) {
        setFormError('Phone number must be exactly 10 digits starting with 254 or 07.');
        setIsLoading(false);
        return;
      }

      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, password, fullName: email.split('@')[0], country })
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Registration failed.');
        }
        return data;
      })
      .then((data) => {
        setSuccessMsg(data.message || 'Account created successfully!');
        setIsLoading(false);
        localStorage.setItem('lwex_current_user', JSON.stringify(data.user));
        localStorage.setItem('lwex_token', data.token);
        setTimeout(() => {
          onSuccess(data.user);
          onClose();
          setSuccessMsg('');
        }, 1500);
      })
      .catch((err) => {
        setFormError(err.message || 'Network error occurred. Please try again.');
        setIsLoading(false);
      });

    } else if (view === 'login') {
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Invalid email or password.');
        }
        return data;
      })
      .then((data) => {
        setIsLoading(false);
        localStorage.setItem('lwex_current_user', JSON.stringify(data.user));
        localStorage.setItem('lwex_token', data.token);
        onSuccess(data.user);
        onClose();
      })
      .catch((err) => {
        setFormError(err.message || 'Network error occurred. Please try again.');
        setIsLoading(false);
      });

    } else if (view === 'forgot_password') {
      fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to send reset link.');
        }
        return data;
      })
      .then((data) => {
        setIsLoading(false);
        setSuccessMsg(data.message);
        setTimeout(() => {
          setView('reset_password'); // Switch to reset password view to enter token
          setSuccessMsg('');
        }, 3000);
      })
      .catch((err) => {
        setFormError(err.message || 'Network error occurred. Please try again.');
        setIsLoading(false);
      });
      
    } else if (view === 'reset_password') {
      if (password !== confirmPassword) {
        setFormError('Passwords do not match.');
        setIsLoading(false);
        return;
      }
      
      fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword: password })
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to reset password.');
        }
        return data;
      })
      .then((data) => {
        setIsLoading(false);
        setSuccessMsg(data.message);
        setTimeout(() => {
          setView('login');
          setSuccessMsg('');
        }, 3000);
      })
      .catch((err) => {
        setFormError(err.message || 'Network error occurred. Please try again.');
        setIsLoading(false);
      });
    }
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setSuccessMsg('');
    setFormError('');
    setEmail('');
    setPhone('');
    setCountry('Kenya');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl transition-all ${
        isDark ? 'bg-zinc-900 border border-zinc-800 text-white' : 'bg-white text-zinc-900'
      }`}>
        
        {/* Header Graphic/Gradient */}
        <div className="relative h-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 via-violet-500 to-fuchsia-500 opacity-90" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay" />
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-2 bg-black/20 text-white hover:bg-black/40 transition-colors backdrop-blur-md"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {view === 'login' && 'Welcome Back'}
              {view === 'register' && 'Create Account'}
              {view === 'forgot_password' && 'Reset Password'}
              {view === 'reset_password' && 'Enter New Password'}
            </h2>
            <p className="text-white/80 text-sm mt-1">
              {view === 'login' && 'Enter your details to access your portfolio.'}
              {view === 'register' && 'Join LWEX and start trading today.'}
              {view === 'forgot_password' && "We'll send you instructions to reset it."}
              {view === 'reset_password' && "Enter the token we sent and your new password."}
            </p>
          </div>
        </div>

        <div className="p-6">
          {successMsg ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4 animate-bounce" />
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Success!</h3>
              <p className={`mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg flex items-center mb-4">
                  <span>{formError}</span>
                </div>
              )}
              
              {/* Token Field - Only for reset_password */}
              {view === 'reset_password' && (
                <div className="space-y-1">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Reset Token
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className={`block w-full px-3 py-2.5 rounded-lg text-sm transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none ${
                        isDark 
                          ? 'bg-zinc-950 border-zinc-800 text-white focus:border-yellow-500' 
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-yellow-500'
                      } border`}
                      placeholder="Paste your reset token here"
                    />
                  </div>
                </div>
              )}

              {/* Email Field - Used in login, register, forgot_password */}
              {view !== 'reset_password' && (
                <div className="space-y-1">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className={`h-4.5 w-4.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-2.5 rounded-lg text-sm transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none ${
                        isDark 
                          ? 'bg-zinc-950 border-zinc-800 text-white focus:border-yellow-500' 
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-yellow-500'
                      } border`}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
              )}

              {/* Phone Field - Only for register */}
              {view === 'register' && (
                <div className="space-y-1">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className={`h-4.5 w-4.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-2.5 rounded-lg text-sm transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none ${
                        isDark 
                          ? 'bg-zinc-950 border-zinc-800 text-white focus:border-yellow-500' 
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-yellow-500'
                      } border`}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              )}

              {/* Country Field - Only for register */}
              {view === 'register' && (
                <div className="space-y-1">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={`block w-full px-3 py-2.5 rounded-lg text-sm transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none ${
                      isDark 
                        ? 'bg-zinc-950 border-zinc-800 text-white focus:border-yellow-500' 
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-yellow-500'
                    } border cursor-pointer`}
                  >
                    <option value="Kenya">Kenya</option>
                    <option value="Uganda">Uganda</option>
                    <option value="Tanzania">Tanzania</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="South Africa">South Africa</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Germany">Germany</option>
                    <option value="Other">Other Country</option>
                  </select>
                </div>
              )}

              {/* Password Field - Used in login, register, and reset_password */}
              {(view === 'login' || view === 'register' || view === 'reset_password') && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {view === 'register' || view === 'reset_password' ? 'New Password' : 'Password'}
                    </label>
                    {view === 'login' && (
                      <button 
                        type="button"
                        onClick={() => switchView('forgot_password')}
                        className="text-xs font-medium text-yellow-500 hover:text-yellow-400 transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className={`h-4.5 w-4.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`block w-full pl-10 pr-10 py-2.5 rounded-lg text-sm transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none ${
                        isDark 
                          ? 'bg-zinc-950 border-zinc-800 text-white focus:border-yellow-500' 
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-yellow-500'
                      } border`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password Field - Only for register and reset_password */}
              {(view === 'register' || view === 'reset_password') && (
                <div className="space-y-1">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className={`h-4.5 w-4.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`block w-full pl-10 pr-10 py-2.5 rounded-lg text-sm transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none ${
                        isDark 
                          ? 'bg-zinc-950 border-zinc-800 text-white focus:border-yellow-500' 
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-yellow-500'
                      } border`}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || ((view === 'register' || view === 'reset_password') && password !== confirmPassword && confirmPassword !== '')}
                className="w-full mt-6 bg-gradient-to-r from-yellow-500 to-purple-600 hover:from-yellow-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/30"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {view === 'login' && 'Sign In'}
                      {view === 'register' && 'Create Account'}
                      {view === 'forgot_password' && 'Send Reset Link'}
                      {view === 'reset_password' && 'Confirm Reset'}
                    </span>
                    <ArrowRight className="h-4.5 w-4.5" />
                  </>
                )}
              </button>

              {/* Footer Links */}
              <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center text-sm">
                {(view === 'login' || view === 'forgot_password' || view === 'reset_password') && (
                  <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                    Don't have an account?{' '}
                    <button 
                      type="button" 
                      onClick={() => switchView('register')}
                      className="font-bold text-yellow-500 hover:text-yellow-400 transition-colors"
                    >
                      Sign up now
                    </button>
                  </p>
                )}
                {view === 'register' && (
                  <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                    Already have an account?{' '}
                    <button 
                      type="button" 
                      onClick={() => switchView('login')}
                      className="font-bold text-yellow-500 hover:text-yellow-400 transition-colors"
                    >
                      Sign in
                    </button>
                  </p>
                )}
                {view === 'forgot_password' && (
                  <button 
                    type="button" 
                    onClick={() => switchView('login')}
                    className="font-bold text-yellow-500 hover:text-yellow-400 transition-colors"
                  >
                    Back to Sign In
                  </button>
                )}
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
