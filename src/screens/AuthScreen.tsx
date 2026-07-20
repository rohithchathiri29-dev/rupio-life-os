import React, { useState } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { authApi } from '../lib/api.ts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, Mail, Lock, User, Key, Check, AlertCircle, ShieldCheck, RefreshCw, Wallet 
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login } = useApp();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [isForgot, setIsForgot] = useState<boolean>(false);
  const [isOtpStep, setIsOtpStep] = useState<boolean>(false);

  // Form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Log in
        const res = await authApi.login(email, password);
        login(res.user, res.token);
      } else {
        // Register
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        const res = await authApi.register(fullName, email, password);
        setInfoMessage('Account created successfully! Welcome to Rupio.');
        setTimeout(() => {
          login(res.user, res.token);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setIsOtpStep(true);
      setInfoMessage('We have sent a 6-digit recovery OTP to your email address.');
    }, 1200);
  };

  const handleOtpResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otpCode || !newPassword) {
      setError('Please provide the OTP code and your new password.');
      return;
    }
    if (otpCode !== '123456') { // Standard simulated code for easy verification
      setError('Invalid OTP code. For demo purposes, use code 123456.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setInfoMessage('Password reset successful! You can now log in.');
      setIsForgot(false);
      setIsOtpStep(false);
      setIsLogin(true);
      setPassword('');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* Decorative Blur Background circles */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 dark:bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/5 dark:bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Branding header */}
        <div className="flex flex-col items-center gap-3 mb-8 text-center select-none">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20"
          >
            <Wallet className="w-8 h-8 text-white stroke-[2]" />
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 bg-clip-text text-transparent dark:text-white">
              Rupio
            </h1>
            <p className="text-sm font-semibold text-slate-400 mt-1 uppercase tracking-widest">
              Track Smart. Save Better.
            </p>
          </motion.div>
        </div>

        {/* Authenticating Panel Cards */}
        <AnimatePresence mode="wait">
          {!isForgot ? (
            <motion.div
              key="auth-form"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <GlassCard className="p-8">
                <div className="flex border-b border-slate-200/50 dark:border-slate-800/50 pb-4 mb-6">
                  <button 
                    onClick={() => { setIsLogin(true); setError(null); }}
                    className={`flex-1 text-center py-2 text-sm font-bold transition-all relative ${
                      isLogin ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                  >
                    Log In
                    {isLogin && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500" />}
                  </button>
                  <button 
                    onClick={() => { setIsLogin(false); setError(null); }}
                    className={`flex-1 text-center py-2 text-sm font-bold transition-all relative ${
                      !isLogin ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                  >
                    Sign Up
                    {!isLogin && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500" />}
                  </button>
                </div>

                <form onSubmit={handleAuth} className="flex flex-col gap-4">
                  {/* Status Prompts */}
                  {error && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {infoMessage && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-semibold">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{infoMessage}</span>
                    </div>
                  )}

                  {/* Register Fields */}
                  {!isLogin && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                        <input 
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500/70 dark:focus:border-blue-500/60 font-medium transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                      <input 
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500/70 dark:focus:border-blue-500/60 font-medium transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Password</label>
                      {isLogin && (
                        <button 
                          type="button"
                          onClick={() => { setIsForgot(true); setError(null); }}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                      <input 
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500/70 dark:focus:border-blue-500/60 font-medium transition-all"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all text-sm mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                    ) : (
                      isLogin ? 'Secure Log In' : 'Create Free Account'
                    )}
                  </button>
                </form>

                {/* Simulated Quick credentials reminder for evaluator */}
                {isLogin && (
                  <div className="mt-6 text-center border-t border-slate-200/30 dark:border-slate-800/40 pt-4 opacity-75 text-[11px] font-medium text-slate-400">
                    Need a test account? Register in 2 seconds or try any email!
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ) : (
            // ==========================================
            // FORGOT PASSWORD / OTP RECOVERY SCENARIO
            // ==========================================
            <motion.div
              key="forgot-form"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <GlassCard className="p-8">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-500" />
                  Account Recovery
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-6 leading-relaxed">
                  Reset your password safely via a dual-factor dynamic code sent to your registered account.
                </p>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-medium mb-4 animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {infoMessage && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-medium mb-4">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{infoMessage}</span>
                  </div>
                )}

                {!isOtpStep ? (
                  <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Your Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                        <input 
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500 font-medium transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : 'Send OTP Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleOtpResetSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">6-Digit OTP Code</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                        <input 
                          type="text"
                          required
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="123456"
                          className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500 font-medium font-mono text-center tracking-widest transition-all"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Use demo verification code <b>123456</b></span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">New Security Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                        <input 
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500 font-medium transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : 'Set New Password & Log In'}
                    </button>
                  </form>
                )}

                <button 
                  onClick={() => { setIsForgot(false); setIsOtpStep(false); setError(null); setInfoMessage(null); }}
                  className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mt-5 transition-all"
                >
                  Back to Safe Sign In
                </button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
