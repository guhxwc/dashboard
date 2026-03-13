import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { InfoPopover } from './InfoPopover';

interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  description?: React.ReactNode;
  className?: string;
  info?: {
    meaning: string;
    importance: string;
    usage: string;
  };
}

export function MetricCard({ title, value, trend, trendUp, icon: Icon, description, className, info }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors", className)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg transition-colors">
          <Icon className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={cn(
              "text-sm font-medium px-2 py-1 rounded-full",
              trendUp ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
            )}>
              {trend}
            </span>
          )}
          {info && (
            <InfoPopover
              title={title}
              meaning={info.meaning}
              importance={info.importance}
              usage={info.usage}
            />
          )}
        </div>
      </div>
      <div>
        <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">{title}</h3>
        <div className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</div>
        {description && <div className="text-zinc-400 dark:text-zinc-500 text-xs mt-2">{description}</div>}
      </div>
    </motion.div>
  );
}
