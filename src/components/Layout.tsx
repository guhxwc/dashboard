import { useState, ReactNode } from 'react';
import { LayoutDashboard, Wallet, Users, PieChart, Menu, ChevronRight, BarChart3, LogOut, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { isDemoMode, setDemoMode } from '@/services/supabaseService';
import { useTheme } from '@/hooks/useTheme';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [demoActive, setDemoActive] = useState(isDemoMode());
  const { theme, toggleTheme } = useTheme();

  const handleDemoToggle = () => {
    const newValue = !demoActive;
    setDemoActive(newValue);
    setDemoMode(newValue);
  };

  const menuItems = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'metrics', label: 'Métricas', icon: BarChart3 },
    { id: 'users', label: 'Base de Usuários', icon: Users },
    { id: 'affiliates', label: 'Área de Afiliados', icon: Users },
    { id: 'financials', label: 'Financeiro', icon: Wallet },
    { id: 'profit-sharing', label: 'Divisão de Sócios', icon: PieChart },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 transition-colors">
      <div className="h-20 flex items-center px-8 border-b border-slate-100/50 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">SaaS Master</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dashboard Pro</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 px-2">Menu Principal</div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className="flex items-center gap-3 relative z-10">
                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors")} />
                <span>{item.label}</span>
              </div>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-indigo-600 rounded-xl -z-0"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {!isActive && <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-slate-100/50 dark:border-slate-800">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
        
        <div className="mt-6 flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 border-2 border-white dark:border-slate-600 shadow-sm flex items-center justify-center overflow-hidden">
             <img src="https://picsum.photos/seed/gustavo/200" alt="User" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Gustavo</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Sócio Admin</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 shadow-2xl lg:hidden",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        initial={false}
        animate={isSidebarOpen ? { x: 0 } : { x: "-100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <SidebarContent />
      </motion.aside>

      {/* Desktop Sidebar (Static) */}
      <aside className="hidden lg:block w-72 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800 h-screen sticky top-0 overflow-hidden shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-20 transition-colors">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors">
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 transition-all">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white hidden md:block">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          
          <div className="flex-1 flex justify-end items-center gap-4">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Modo Demo</span>
              <button
                onClick={handleDemoToggle}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
                  demoActive ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                )}
              >
                <div className={cn(
                  "w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform duration-200",
                  demoActive ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-full text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Online</span>
            </div>
            
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Gustavo</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 p-0.5 border-2 border-indigo-50 dark:border-indigo-900 shadow-sm cursor-pointer hover:scale-105 transition-transform">
                <img src="https://picsum.photos/seed/gustavo/200" alt="User" className="w-full h-full rounded-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-20">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
