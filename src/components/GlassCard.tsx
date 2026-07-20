import React, { ReactNode } from 'react';
import { motion } from 'motion/react';
import { useApp } from './ThemeContext.tsx';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  id?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  onClick, 
  hoverEffect = false,
  id
}) => {
  const { themePreset } = useApp();

  let presetClasses = 'bg-white/40 dark:bg-white/5 border-slate-200/40 dark:border-white/10';
  let hoverBorder = 'rgba(37, 99, 235, 0.3)';

  if (themePreset === 'emerald') {
    presetClasses = 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-500/25 dark:border-emerald-400/20';
    hoverBorder = 'rgba(16, 185, 129, 0.4)';
  } else if (themePreset === 'obsidian') {
    presetClasses = 'bg-slate-950/20 dark:bg-[#070a13]/70 border-amber-500/10 dark:border-amber-500/20';
    hoverBorder = 'rgba(245, 158, 11, 0.4)';
  } else if (themePreset === 'cyberpunk') {
    presetClasses = 'bg-fuchsia-950/5 dark:bg-[#04060d]/80 border-pink-500/20 dark:border-fuchsia-500/20';
    hoverBorder = 'rgba(236, 72, 153, 0.4)';
  }

  const baseStyle = `
    relative overflow-hidden rounded-[2rem] p-6
    ${presetClasses}
    backdrop-blur-xl
    border
    shadow-xl shadow-slate-100/10 dark:shadow-black/20
    transition-all duration-300
  `;

  const interactiveProps = onClick ? {
    onClick,
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onClick();
      }
    }
  } : {};

  if (hoverEffect || onClick) {
    return (
      <motion.div
        id={id}
        {...interactiveProps}
        whileHover={{ 
          y: -4, 
          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
          borderColor: hoverBorder
        }}
        whileTap={onClick ? { scale: 0.98 } : undefined}
        className={`${baseStyle} cursor-pointer ${className}`}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div id={id} className={`${baseStyle} ${className}`}>
      {children}
    </div>
  );
};
