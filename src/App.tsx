import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Overview } from '@/pages/Overview';
import { Financials } from '@/pages/Financials';
import { Payouts } from '@/pages/Payouts'; // Kept for backward compatibility if needed, but AffiliatesPage replaces it mostly
import { ProfitSharing } from '@/pages/ProfitSharing';
import { Metrics } from '@/pages/Metrics';
import { UsersPage } from '@/pages/Users';
import { AffiliatesPage } from '@/pages/Affiliates';
import { Transactions } from '@/pages/Transactions';
import { AppUsage } from '@/pages/AppUsage';
import { Jarvis } from '@/pages/Jarvis';
import { Login } from '@/pages/Login';
import { LeadsPanel } from '@/pages/LeadsPanel';
import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [usersFilter, setUsersFilter] = useState('all');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const adminStatus = await supabaseService.checkIsAdmin(session.user.id);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const adminStatus = await supabaseService.checkIsAdmin(session.user.id);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTabChange = (tab: string, filter: string = 'all') => {
    setActiveTab(tab);
    if (tab === 'users') {
      setUsersFilter(filter);
    }
  };

  useEffect(() => {
    // 1. Handle Supabase Auth redirect (hash with access_token)
    // This prevents the "blank screen" issue when Supabase redirects with a long hash
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      // We let Supabase SDK handle the session, but we clean the URL for the user
      // and to prevent Vite/Router issues
      setTimeout(() => {
        window.history.replaceState(null, '', window.location.pathname);
      }, 500);
    }

    // 2. Capture affiliate ref from URL
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      try {
        localStorage.setItem('affiliate_ref', ref);
        console.log('Affiliate ref captured:', ref);
      } catch (e) {
        console.warn('Could not save affiliate ref:', e);
      }
    }
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <Overview onTabChange={handleTabChange} session={session} />;
      case 'jarvis': return <Jarvis />;
      case 'metrics': return <Metrics />;
      case 'users': return <UsersPage initialStatus={usersFilter} onTabChange={handleTabChange} />;
      case 'app-usage': return <AppUsage />;
      case 'affiliates': return <AffiliatesPage />;
      case 'transactions': return <Transactions />;
      case 'financials': return <Financials />;
      case 'profit-sharing': return <ProfitSharing />;
      case 'leads': return <LeadsPanel session={session} />;
      default: return <Overview />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  const userEmail = session?.user?.email?.toLowerCase() || '';
  
  // Lista de emails que sempre terão acesso (super admins/fundadores)
  const superAdminEmails = [
    'gustavo.500fyz@gmail.com',
    'lucascauan2007@gmail.com',
    'murilobarbosaguimaraes345@gmail.com',
    'nicolasmelo520@gmail.com',
    'lyanlucas770@gmail.com'
  ];

  const isSuperAdmin = superAdminEmails.includes(userEmail);

  if (!isAdmin && !isSuperAdmin && isAdmin !== null) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-500">Acesso Negado</h1>
          <p className="text-zinc-400">Você não tem permissão de administrador no banco de dados para acessar este painel.</p>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} onTabChange={handleTabChange} session={session}>
      {renderContent()}
    </Layout>
  );
}

export default App;
