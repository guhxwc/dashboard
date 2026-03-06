import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Overview } from '@/pages/Overview';
import { Financials } from '@/pages/Financials';
import { Payouts } from '@/pages/Payouts'; // Kept for backward compatibility if needed, but AffiliatesPage replaces it mostly
import { ProfitSharing } from '@/pages/ProfitSharing';
import { Metrics } from '@/pages/Metrics';
import { UsersPage } from '@/pages/Users';
import { AffiliatesPage } from '@/pages/Affiliates';

function App() {
  const [activeTab, setActiveTab] = useState('overview');

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
      case 'overview': return <Overview />;
      case 'metrics': return <Metrics />;
      case 'users': return <UsersPage />;
      case 'affiliates': return <AffiliatesPage />;
      case 'financials': return <Financials />;
      case 'profit-sharing': return <ProfitSharing />;
      default: return <Overview />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;
