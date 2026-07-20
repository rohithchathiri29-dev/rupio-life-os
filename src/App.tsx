import React, { useState } from 'react';
import { ThemeProvider, useApp } from './components/ThemeContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { AuthScreen } from './screens/AuthScreen.tsx';
import { DashboardScreen } from './screens/DashboardScreen.tsx';
import { TransactionsScreen } from './screens/TransactionsScreen.tsx';
import { BudgetsScreen } from './screens/BudgetsScreen.tsx';
import { SavingsGoalsScreen } from './screens/SavingsGoalsScreen.tsx';
import { HealthScreen } from './screens/HealthScreen.tsx';
import { HabitsScreen } from './screens/HabitsScreen.tsx';
import { RecoveryScreen } from './screens/RecoveryScreen.tsx';
import { ProductivityScreen } from './screens/ProductivityScreen.tsx';
import { JournalScreen } from './screens/JournalScreen.tsx';
import { GrowthScreen } from './screens/GrowthScreen.tsx';
import { SearchScreen } from './screens/SearchScreen.tsx';
import { AIScreen } from './screens/AIScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';

const RootLayout: React.FC = () => {
  const { user, loading, themePreset } = useApp();
  const [activeScreen, setActiveScreen] = useState<string>('dashboard');

  // Handle application loading state gracefully
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex flex-col justify-center items-center text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm font-semibold tracking-wide">Syncing secure connection...</p>
      </div>
    );
  }

  // Handle authorization wall
  if (!user) {
    return <AuthScreen />;
  }

  // Render the selected modular screen view
  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <DashboardScreen setActiveScreen={setActiveScreen} />;
      case 'transactions':
        return <TransactionsScreen />;
      case 'budgets':
        return <BudgetsScreen />;
      case 'goals':
        return <SavingsGoalsScreen />;
      case 'health':
        return <HealthScreen />;
      case 'habits':
        return <HabitsScreen />;
      case 'recovery':
        return <RecoveryScreen />;
      case 'productivity':
        return <ProductivityScreen />;
      case 'journal':
        return <JournalScreen />;
      case 'growth':
        return <GrowthScreen />;
      case 'search':
        return <SearchScreen />;
      case 'ai':
        return <AIScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  let bgClass = "bg-[#F8FAFC] dark:bg-[#0F172A]";
  let circles = (
    <>
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 dark:bg-blue-600/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/5 dark:bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
    </>
  );

  if (themePreset === 'emerald') {
    bgClass = "bg-[#F4FBF7] dark:bg-[#06140e]";
    circles = (
      <>
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/10 dark:bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-600/5 dark:bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-lime-500/5 dark:bg-lime-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      </>
    );
  } else if (themePreset === 'obsidian') {
    bgClass = "bg-[#FAF7F2] dark:bg-[#07080a]";
    circles = (
      <>
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/5 dark:bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-yellow-600/5 dark:bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-amber-500/3 dark:bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      </>
    );
  } else if (themePreset === 'cyberpunk') {
    bgClass = "bg-[#FCF5FA] dark:bg-[#050308]";
    circles = (
      <>
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-600/10 dark:bg-pink-600/15 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/5 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      </>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-300 relative overflow-hidden`}>
      
      {/* Background Decorative Gradients for Immersive Frosted Feel */}
      {circles}

      {/* Sidebar Rail */}
      <Sidebar activeScreen={activeScreen} setActiveScreen={setActiveScreen} />

      {/* Main Responsive Canvas content container */}
      <main className="flex-1 p-4 md:p-8 lg:p-10 max-h-screen overflow-y-auto pb-24 lg:pb-10 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <RootLayout />
    </ThemeProvider>
  );
}
