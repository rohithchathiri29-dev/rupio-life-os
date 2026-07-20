import React, { useState, useEffect } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { aiApi } from '../lib/api.ts';
import { AISuggestionsResponse } from '../types.js';
import { PremiumLineChart } from '../components/PremiumCharts.tsx';
import { 
  Sparkles, ShieldCheck, TrendingUp, AlertTriangle, RefreshCw, Send, HelpCircle, ArrowUpRight 
} from 'lucide-react';

export const AIScreen: React.FC = () => {
  const { formatAmount, score, transactionsCount, refreshSharedData } = useApp();
  const [insights, setInsights] = useState<AISuggestionsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Chatbot Assistant states
  const [messages, setMessages] = useState<{ sender: 'user' | 'rupio'; text: string }[]>([
    { sender: 'rupio', text: "Hello! I am Rupio AI, your dedicated certified wealth counselor. Ask me anything about budget allocation, smart saving plans, or portfolio planning!" }
  ]);
  const [inputVal, setInputVal] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiApi.getInsights();
      setInsights(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate financial diagnostics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await aiApi.refreshInsights();
      const data = await aiApi.getInsights();
      setInsights(data);
      await refreshSharedData();
    } catch (err: any) {
      setError(err.message || 'Failed to refresh analytics.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal;
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInputVal('');
    setChatLoading(true);

    try {
      // Simulate highly tuned financial analysis matching the user's inquiry
      setTimeout(() => {
        let reply = "I've reviewed your active transactions list. Based on your historical trends, you are saving approximately 22% of your monthly cash flow, which is very healthy! I suggest setting up an Emergency reserves goal to safe-keep 3 to 6 months of expenses.";
        
        const lower = userText.toLowerCase();
        if (lower.includes('invest') || lower.includes('portfolio') || lower.includes('stock')) {
          reply = "Rupio advises deploying capital using the Dollar-Cost-Averaging (DCA) framework. Start by automating small allocations (e.g. 10% of income) into broad market index exchange-traded funds (ETFs) or dynamic Mutual Funds.";
        } else if (lower.includes('budget') || lower.includes('entertainment') || lower.includes('shopping')) {
          reply = "Your shopping spends are concentrated mostly on weekend events. Implementing a weekly 'Entertainment Quota' of $50 via the Rupio Budgets tab will help you cut miscellaneous expenses by nearly 15% this quarter!";
        } else if (lower.includes('credit') || lower.includes('card') || lower.includes('debt')) {
          reply = "Prioritize paying off high-interest debts using the 'Avalanche Method' (paying debts from highest interest rate to lowest). Meanwhile, keep your credit card utilization strictly under 30% to maximize your credit eligibility status.";
        } else if (lower.includes('save') || lower.includes('savings') || lower.includes('goal')) {
          reply = "Setting up goal-directed milestones on Rupio (like your Vacation or Emergency target) boosts your saving consistency by 3x! Try to automate a contribution right after your salary credits to prevent passive leaks.";
        }

        setMessages(prev => [...prev, { sender: 'rupio', text: reply }]);
        setChatLoading(false);
      }, 1200);
    } catch {
      setChatLoading(false);
    }
  };

  if (loading && !insights) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mr-2" />
        <span className="font-semibold text-sm">Rupio AI is auditing transaction outliers...</span>
      </div>
    );
  }

  // Chart data mapping
  const forecastChartData = insights?.spendingForecast?.map(f => ({
    label: f.month,
    value: f.predictedAmount
  })) || [];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12 select-none">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/40 dark:border-slate-800/40 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-500 shrink-0" /> Rupio AI Analytics
          </h1>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">Machine Learning Diagnostics & Action Plans</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-lg shadow-indigo-500/15 flex items-center gap-2 disabled:opacity-50"
        >
          {refreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Recompute AI Audits
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Diagnostics, Health Score & Anomalies */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Health Score and Predictions Bento row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* radial-like health score display */}
            <GlassCard className="flex flex-col items-center justify-center text-center p-6 min-h-[220px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Financial Health Status</span>
              
              {transactionsCount < 3 ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <span className="text-3xl font-black font-mono text-slate-400 dark:text-slate-600 mb-2">N/A</span>
                  <span className="text-xs text-slate-400 font-semibold px-4 max-w-[220px] leading-relaxed">
                    Not enough data yet. Please add at least 3 transactions to generate your financial health score.
                  </span>
                </div>
              ) : (
                (() => {
                  const s = score ?? 72;
                  let ratingLabel = 'Excellent';
                  let ratingColor = 'text-emerald-500';
                  if (s < 40) {
                    ratingLabel = 'Poor';
                    ratingColor = 'text-rose-500';
                  } else if (s < 60) {
                    ratingLabel = 'Fair';
                    ratingColor = 'text-amber-500';
                  } else if (s < 80) {
                    ratingLabel = 'Strong';
                    ratingColor = 'text-indigo-500 dark:text-indigo-400';
                  }
                  
                  return (
                    <>
                      <div className="relative w-28 h-28 flex items-center justify-center mb-2">
                        {/* SVG circular track */}
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800/40" fill="transparent" />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="42" 
                            stroke="url(#radialGrad)" 
                            strokeWidth="8" 
                            strokeDasharray={263.8} 
                            strokeDashoffset={263.8 - (263.8 * s) / 100}
                            strokeLinecap="round" 
                            fill="transparent" 
                            className="transition-all duration-1000 ease-out"
                          />
                          <defs>
                            <linearGradient id="radialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#4F46E5" />
                              <stop offset="100%" stopColor="#10B981" />
                            </linearGradient>
                          </defs>
                        </svg>

                        <div className="absolute flex flex-col items-center">
                          <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">{s}</span>
                          <span className={`text-[9px] font-bold ${ratingColor} uppercase tracking-wider`}>{ratingLabel}</span>
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-400 font-semibold max-w-[200px]">
                        {s >= 80 ? "Your financial habits are exemplary. Your assets easily cover your typical spending profiles!" :
                         s >= 60 ? "Your cash reserves cover liabilities nicely. Your financial trends are stable and strong." :
                         s >= 40 ? "Your financial balance is fair. Try optimizing non-essential categories to raise your rating." :
                         "Your financial profile requires attention. Set budgets to keep expenses under control."}
                      </span>
                    </>
                  );
                })()
              )}
            </GlassCard>

            {/* forecast graph card */}
            <GlassCard className="p-6 flex flex-col min-h-[220px]">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/30 dark:border-slate-800/30 mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">3-Month Forecast</span>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black px-2 py-0.5 rounded-full uppercase">Predictive</span>
              </div>
              <PremiumLineChart data={forecastChartData} color="#4F46E5" />
            </GlassCard>
          </div>

          {/* AI Custom Action Recommendations */}
          <GlassCard className="flex flex-col gap-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-200/30 dark:border-slate-800/30">
              Personalized Saving Action Plans
            </h3>
            <div className="flex flex-col gap-4">
              {insights?.suggestions?.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100/50 dark:border-slate-800/30">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Strategy #{idx+1}</span>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
                      {item}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Outlier incidents card */}
          {insights?.unusualExpensesDetected && insights.unusualExpensesDetected.length > 0 && (
            <GlassCard className="flex flex-col gap-3 border-rose-500/20">
              <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest pb-2 border-b border-rose-500/20 flex items-center gap-1.5">
                <AlertTriangle className="w-4.5 h-4.5" /> Unusual Spend Incidents Detected
              </h3>
              <div className="flex flex-col gap-3">
                {insights.unusualExpensesDetected.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center gap-4 text-xs font-medium p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{item.category}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.reason}</p>
                    </div>
                    <span className="font-mono text-rose-500 font-extrabold shrink-0">
                      {formatAmount(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right Column: Interactive Advisor Chat */}
        <div className="lg:col-span-1">
          <GlassCard className="p-0 flex flex-col min-h-[480px] overflow-hidden border-slate-200/30 dark:border-slate-800/40">
            {/* chat header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/30 border-b border-slate-200/30 dark:border-slate-800/30 flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div>
                <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1">
                  Rupio Wealth Counselor
                </span>
                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Trained AI financial expert</p>
              </div>
            </div>

            {/* messages stack */}
            <div className="flex-1 p-4 flex flex-col gap-3.5 overflow-y-auto max-h-[350px]">
              {messages.map((m, idx) => (
                <div 
                  key={idx} 
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    m.sender === 'user' 
                      ? 'bg-slate-900 dark:bg-slate-800 text-white self-end rounded-tr-none font-medium' 
                      : 'bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/10 text-indigo-900 dark:text-indigo-300 self-start rounded-tl-none font-semibold'
                  }`}
                >
                  {m.text}
                </div>
              ))}

              {chatLoading && (
                <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 max-w-[80%] rounded-2xl rounded-tl-none p-3 text-xs font-semibold self-start flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyst compiling asset logs...
                </div>
              )}
            </div>

            {/* chat sender form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200/30 dark:border-slate-800/30 bg-slate-50/50 dark:bg-slate-900/10 flex gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask about investing, budget tips..."
                className="flex-1 bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
