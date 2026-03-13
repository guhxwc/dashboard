import { useState, ReactNode } from 'react';
import { LayoutDashboard, Wallet, Users, PieChart, Menu, ChevronRight, BarChart3, LogOut, Sun, Moon, CreditCard, Activity, Sparkles } from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [demoActive, setDemoActive] = useState(isDemoMode());
  const { theme, toggleTheme } = useTheme();

  const handleDemoToggle = () => {
    const newValue = !demoActive;
    setDemoActive(newValue);
    setDemoMode(newValue);
  };

  const menuItems = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'jarvis', label: 'J.A.R.V.I.S.', icon: Sparkles },
    { id: 'metrics', label: 'Métricas', icon: BarChart3 },
    { id: 'users', label: 'Base de Usuários', icon: Users },
    { id: 'app-usage', label: 'Uso do App', icon: Activity },
    { id: 'affiliates', label: 'Área de Afiliados', icon: Users },
    { id: 'transactions', label: 'Transações', icon: CreditCard },
    { id: 'financials', label: 'Financeiro', icon: Wallet },
    { id: 'profit-sharing', label: 'Divisão de Sócios', icon: PieChart },
  ];

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex flex-col h-full bg-white dark:bg-[#121212] transition-colors overflow-hidden">
      <div className={cn("h-16 flex items-center border-b border-zinc-100/50 dark:border-zinc-800/50 transition-all duration-300", collapsed ? "justify-center px-0" : "px-6")}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
            <span className="text-white dark:text-zinc-900 font-bold text-lg">F</span>
          </div>
          {!collapsed && (
            <motion.div 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="font-bold text-zinc-900 dark:text-white text-base tracking-tight">Fitmind Master</h1>
            </motion.div>
          )}
        </div>
      </div>

      <nav className={cn("flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden", collapsed ? "px-3" : "px-4")}>
        {!collapsed && <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4 px-3 whitespace-nowrap">Menu Principal</div>}
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
              title={collapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center rounded-lg text-sm font-medium transition-all duration-200 group relative",
                collapsed ? "justify-center p-3" : "justify-between px-3 py-2.5",
                isActive
                  ? "text-zinc-900 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <div className={cn("flex items-center relative z-10", collapsed ? "justify-center" : "gap-3")}>
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors")} />
                {!collapsed && <span className="whitespace-nowrap text-[13px]">{item.label}</span>}
              </div>
              {isActive && (
                <motion.div
                  layoutId={collapsed ? undefined : "activeTab"}
                  className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg -z-0"
                  transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className={cn("p-4 border-t border-zinc-100/50 dark:border-zinc-800/50", collapsed ? "flex flex-col items-center" : "p-4")}>
        <button 
          title={collapsed ? "Sair" : undefined}
          className={cn(
            "flex items-center rounded-lg text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white transition-colors",
            collapsed ? "justify-center p-3 w-auto" : "justify-start gap-3 px-3 py-2.5 w-full"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-[13px]">Sair</span>}
        </button>
        
        <div className={cn(
          "mt-2 flex items-center rounded-xl overflow-hidden",
          collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
        )}>
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
             <img src="https://picsum.photos/seed/gustavo/200" alt="User" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">Gustavo</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">Admin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0a0a0a] font-sans text-zinc-900 dark:text-zinc-100 flex transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#121212] shadow-2xl lg:hidden",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        initial={false}
        animate={isSidebarOpen ? { x: 0 } : { x: "-100%" }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
      >
        <SidebarContent collapsed={false} />
      </motion.aside>

      {/* Desktop Sidebar (Static) */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
        className="hidden lg:block bg-white dark:bg-[#121212] border-r border-zinc-200/60 dark:border-zinc-800/50 h-screen sticky top-0 overflow-hidden z-20 transition-colors shrink-0"
      >
        <SidebarContent collapsed={isCollapsed} />
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto h-screen bg-[#F8FAFC] dark:bg-[#0a0a0a] transition-colors">
        <header className="h-16 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/50 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 transition-all">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-2 -ml-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 hidden md:block">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          
          <div className="flex-1 flex justify-end items-center gap-4">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              
              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-2"></div>

              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Demo</span>
              <button
                onClick={handleDemoToggle}
                className={cn(
                  "w-9 h-5 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:focus:ring-offset-[#121212]",
                  demoActive ? "bg-zinc-800 dark:bg-zinc-600" : "bg-zinc-200 dark:bg-zinc-800"
                )}
              >
                <div className={cn(
                  "w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  demoActive ? "translate-x-4" : "translate-x-1"
                )} />
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-md text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Online</span>
            </div>
            
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-2 hidden md:block"></div>

            <div className="flex items-center gap-3 pl-2">
              <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                <img src="https://picsum.photos/seed/gustavo/200" alt="User" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-20">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
