import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  description?: string;
  className?: string;
}

export function MetricCard({ title, value, trend, trendUp, icon: Icon, description, className }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors", className)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors">
          <Icon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        </div>
        {trend && (
          <span className={cn(
            "text-sm font-medium px-2 py-1 rounded-full",
            trendUp ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
          )}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        {description && <p className="text-slate-400 dark:text-slate-500 text-xs mt-2">{description}</p>}
      </div>
    </motion.div>
  );
}
