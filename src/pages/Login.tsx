import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, Globe, Sun, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Falha ao entrar');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || `Falha ao entrar com ${provider}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans relative overflow-hidden flex flex-col">
      {/* Subtle Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #ffffff 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Header */}
      <header className="flex justify-between items-center p-6 relative z-10">
        <div className="flex items-center gap-2">
          {/* Logo placeholder */}
          <div className="text-white font-bold text-xl tracking-tight flex items-center">
            <span className="italic">Fit</span>Mind
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/50">
            <Globe className="w-4 h-4" />
            <span>PT</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
          <button className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900/50 rounded-full border border-zinc-800/50">
            <Sun className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-[400px] bg-[#111111] border border-zinc-800/60 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          
          {/* Subtle top highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-600/30 to-transparent" />

          {/* Icon */}
          <div className="w-10 h-10 bg-zinc-800/40 rounded-lg border border-zinc-700/40 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <LogIn className="w-5 h-5 text-zinc-300" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white mb-2 tracking-tight">Bem-vindo de volta</h1>
            <p className="text-sm text-zinc-500">Por favor, faça login para continuar</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Endereço de E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-zinc-800/80 rounded-lg bg-[#050505] text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-colors text-sm"
                  placeholder="admin+25tz87fr@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-zinc-800/80 rounded-lg bg-[#050505] text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-colors text-sm"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-white focus:ring-zinc-600 focus:ring-offset-zinc-900"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-zinc-400">
                  Lembrar de mim
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-zinc-400 hover:text-white transition-colors">
                  Esqueceu sua senha?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-white hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 focus:ring-offset-[#121212] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#111111] text-zinc-500">
                  Ou continue com
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 border border-zinc-800/80 rounded-lg shadow-sm bg-[#050505] text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin('apple')}
                className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 border border-zinc-800/80 rounded-lg shadow-sm bg-[#050505] text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                </svg>
                Apple
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-zinc-600 relative z-10">
        © 2025 FitMind. Todos os direitos reservados.
      </footer>
    </div>
  );
}
