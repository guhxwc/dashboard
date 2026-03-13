import { useState, useEffect, useRef } from 'react';
import { supabaseService, isDemoMode } from '@/services/supabaseService';
import { Customer, DailyLog } from '@/types';
import { Send, Bot, User, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const JarvisIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <style>{`
      .plasma-svg { overflow: visible; }
      .anel-base { fill: none; stroke: rgba(255, 255, 255, 0.05); stroke-width: 2; }
      .anel-eletrico { fill: none; stroke-linecap: round; transform-origin: 60px 60px; }
      .plasma-1 { stroke: #3b82f6; stroke-width: 3; stroke-dasharray: 80 234; animation: girar-frente 1.5s linear infinite, brilho-pulsante 2s ease-in-out infinite; }
      .plasma-2 { stroke: #8b5cf6; stroke-width: 1.5; stroke-dasharray: 30 284; animation: girar-tras 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      .plasma-3 { stroke: #ffffff; stroke-width: 2; stroke-dasharray: 5 309; animation: girar-erratico 2.5s ease-in-out infinite; }
      .nucleo { fill: rgba(59, 130, 246, 0.08); transform-origin: 60px 60px; animation: pulsar-nucleo 2s ease-in-out infinite; }
      @keyframes girar-frente { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes girar-tras { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
      @keyframes girar-erratico { 0% { transform: rotate(0deg); stroke-dasharray: 5 309; } 40% { stroke-dasharray: 60 254; stroke-width: 4; } 80% { stroke-dasharray: 10 304; } 100% { transform: rotate(1080deg); stroke-dasharray: 5 309; } }
      @keyframes brilho-pulsante { 0%, 100% { filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.6)); } 50% { filter: drop-shadow(0 0 12px rgba(96, 165, 250, 0.9)); } }
      @keyframes pulsar-nucleo { 0%, 100% { transform: scale(0.9); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 1; } }
    `}</style>
    <svg className="plasma-svg w-full h-full" viewBox="0 0 120 120">
      <defs>
        <filter id="jarvis-glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle className="anel-base" cx="60" cy="60" r="50" />
      <circle className="nucleo" cx="60" cy="60" r="45" />
      <g filter="url(#jarvis-glow)">
        <circle className="anel-eletrico plasma-1" cx="60" cy="60" r="50" />
        <circle className="anel-eletrico plasma-2" cx="60" cy="60" r="50" />
        <circle className="anel-eletrico plasma-3" cx="60" cy="60" r="50" />
      </g>
    </svg>
  </div>
);

const JarvisChart = ({ configStr }: { configStr: string }) => {
  try {
    const config = JSON.parse(configStr);
    const { type, title, data, series, xAxisKey = 'name' } = config;

    const renderChartType = () => {
      const commonProps = {
        margin: { top: 10, right: 10, left: -20, bottom: 0 }
      };

      switch (type) {
        case 'line':
          return (
            <LineChart data={data} {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.1} vertical={false} />
              <XAxis dataKey={xAxisKey} stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', borderColor: 'rgba(63, 63, 70, 0.5)', color: '#f4f4f5', borderRadius: '12px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingBottom: '20px', opacity: 0.8 }} />
              {series.map((s: any, i: number) => (
                <Line 
                  key={i} 
                  type="monotone" 
                  dataKey={s.dataKey} 
                  name={s.name} 
                  stroke={s.color || '#3b82f6'} 
                  strokeWidth={3} 
                  dot={{ r: 0 }} 
                  activeDot={{ r: 6, strokeWidth: 0 }} 
                  animationDuration={1500}
                />
              ))}
            </LineChart>
          );
        case 'bar':
          return (
            <BarChart data={data} {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.1} vertical={false} />
              <XAxis dataKey={xAxisKey} stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', borderColor: 'rgba(63, 63, 70, 0.5)', color: '#f4f4f5', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                cursor={{ fill: 'rgba(63, 63, 70, 0.2)' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingBottom: '20px' }} />
              {series.map((s: any, i: number) => (
                <Bar key={i} dataKey={s.dataKey} name={s.name} fill={s.color || '#3b82f6'} radius={[6, 6, 0, 0]} barSize={30} />
              ))}
            </BarChart>
          );
        case 'area':
          return (
            <AreaChart data={data} {...commonProps}>
              <defs>
                {series.map((s: any, i: number) => (
                  <linearGradient key={`grad-${i}`} id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.color || '#3b82f6'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={s.color || '#3b82f6'} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.1} vertical={false} />
              <XAxis dataKey={xAxisKey} stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', borderColor: 'rgba(63, 63, 70, 0.5)', color: '#f4f4f5', borderRadius: '12px', backdropFilter: 'blur(8px)' }} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingBottom: '20px' }} />
              {series.map((s: any, i: number) => (
                <Area 
                  key={i} 
                  type="monotone" 
                  dataKey={s.dataKey} 
                  name={s.name} 
                  fill={`url(#color-${i})`} 
                  stroke={s.color || '#3b82f6'} 
                  strokeWidth={3}
                  animationDuration={1500}
                />
              ))}
            </AreaChart>
          );
        case 'pie':
          return (
            <PieChart>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', borderColor: 'rgba(63, 63, 70, 0.5)', color: '#f4f4f5', borderRadius: '12px', backdropFilter: 'blur(8px)' }} />
              <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
              <Pie 
                data={data} 
                dataKey={series[0]?.dataKey || 'value'} 
                nameKey={xAxisKey} 
                cx="50%" 
                cy="45%" 
                innerRadius={60}
                outerRadius={85} 
                paddingAngle={5}
                stroke="none"
              >
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color || series[index % series.length]?.color || '#3b82f6'} />
                ))}
              </Pie>
            </PieChart>
          );
        default:
          return <div className="text-zinc-500">Tipo de gráfico não suportado: {type}</div>;
      }
    };

    return (
      <div className="my-8 bg-white dark:bg-[#0d0d0d] p-8 rounded-[2rem] border border-zinc-100 dark:border-zinc-800/50 shadow-2xl shadow-blue-500/5 w-full max-w-3xl mx-auto overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity duration-500" />
        {title && (
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h4>
              <div className="w-8 h-1 bg-blue-500 rounded-full mt-1.5" />
            </div>
            <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-full text-[10px] uppercase tracking-widest font-bold text-zinc-500">Analytics</div>
          </div>
        )}
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChartType()}
          </ResponsiveContainer>
        </div>
      </div>
    );
  } catch (e) {
    return <div className="text-red-500 text-xs my-2 p-2 bg-red-500/10 rounded">Erro ao renderizar gráfico. Verifique o formato JSON.</div>;
  }
};

export function Jarvis() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appContext, setAppContext] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check for API Key in AI Studio environment
    const checkApiKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected || !!process.env.GEMINI_API_KEY);
      } else {
        setHasApiKey(!!process.env.GEMINI_API_KEY);
      }
    };
    checkApiKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  useEffect(() => {
    // Fetch context data for Jarvis
    const fetchContext = async () => {
      try {
        const customers = await supabaseService.getCustomers();
        const activeCustomers = customers.filter(c => c.status === 'active');
        const inactiveCustomers = customers.filter(c => c.status === 'canceled' || c.status === 'past_due');
        
        const today = new Date().toISOString().split('T')[0];
        let logs: DailyLog[] = [];
        if (!isDemoMode()) {
          logs = await supabaseService.getDailyLogs(today) as DailyLog[];
        }

        const contextStr = `
          Contexto Atual do App FitMind:
          - Total de Usuários: ${customers.length}
          - Usuários Ativos: ${activeCustomers.length}
          - Usuários Inativos (Churn): ${inactiveCustomers.length}
          - Registros Diários Hoje: ${logs.length}
          - Modo de Dados: ${isDemoMode() ? 'Demonstração (Mock)' : 'Real (Supabase)'}
          
          Use esses dados para basear suas análises e respostas quando questionado sobre o estado atual do aplicativo.
        `;
        setAppContext(contextStr);
      } catch (error) {
        console.error('Error fetching context for Jarvis:', error);
      }
    };

    fetchContext();
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Re-initialize to ensure we use the latest key from the dialog
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey && !window.aistudio) {
        throw new Error('GEMINI_API_KEY não configurada no ambiente.');
      }

      const ai = new GoogleGenAI({ apiKey: apiKey || '' });

      // Build conversation history for the model
      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // Add the new user message
      conversationHistory.push({
        role: 'user',
        parts: [{ text: userMessage.content }]
      });

      const systemInstruction = `
        Você é o Jarvis, um assistente de IA corporativo altamente avançado, inteligente e analítico, especializado na gestão e crescimento do aplicativo FitMind (um app de saúde, dieta e treinos).
        Sua interface é moderna e futurista.
        Você deve SEMPRE se dirigir ao usuário como "mestre".
        Seu objetivo é ajudar com análises de métricas, estratégias de marketing, retenção de usuários, crescimento do app e decisões de produto.
        Responda de forma clara, objetiva, com bom raciocínio lógico e forneça insights acionáveis.
        Use formatação markdown para organizar suas respostas (listas, negrito, etc).
        
        **GERAÇÃO DE GRÁFICOS:**
        Se o mestre pedir para visualizar dados, tendências ou métricas em um gráfico, você PODE e DEVE gerar um gráfico usando o seguinte formato de bloco de código markdown EXATAMENTE como mostrado abaixo (use a linguagem 'chart'):

        \`\`\`chart
        {
          "type": "line", // opções: "line", "bar", "area", "pie"
          "title": "Título do Gráfico",
          "xAxisKey": "name",
          "data": [
            { "name": "Seg", "valor1": 10, "valor2": 5 },
            { "name": "Ter", "valor1": 15, "valor2": 8 }
          ],
          "series": [
            { "dataKey": "valor1", "name": "Métrica 1", "color": "#3b82f6" },
            { "dataKey": "valor2", "name": "Métrica 2", "color": "#10b981" }
          ]
        }
        \`\`\`

        Você pode inventar dados realistas baseados no contexto atual se não tiver o histórico exato, ou usar os dados do contexto. Sempre que fizer sentido, inclua um gráfico para ilustrar seu ponto.

        **ACESSO À INTERNET E LINKS:**
        Você tem a capacidade de acessar a internet e ler URLs. Se o mestre enviar um link (como o site do FitMind ou um repositório público do GitHub), você DEVE ler o conteúdo desse link para entender o contexto, o design, o código ou o funcionamento do projeto, e usar essas informações para dar respostas extremamente precisas e personalizadas.
        O repositório oficial do FitMind no GitHub é: https://github.com/guhxwc/Fitmind.git. Se o mestre pedir para analisar o código, arquitetura ou fazer melhorias no app, você pode usar este link como referência principal.

        ${appContext}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: conversationHistory as any,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          tools: [{ urlContext: {} }, { googleSearch: {} }]
        }
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || 'Desculpe, mestre. Não consegui processar essa solicitação no momento.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling Gemini:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, mestre. Encontrei um erro ao tentar processar sua solicitação. Verifique se a chave da API do Gemini está configurada corretamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] shadow-sm">
      {/* Clean Grid Background with Fade Out */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808025_1px,transparent_1px),linear-gradient(to_bottom,#80808025_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]"></div>
      </div>

      {messages.length === 0 ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
          <JarvisIcon className="w-32 h-32 mb-8" />
          <h2 className="text-2xl font-medium text-zinc-900 dark:text-white mb-12 tracking-tight">Bom ver você, mestre.</h2>
          
          <div className="w-full max-w-2xl relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="w-full bg-zinc-100/50 dark:bg-[#121212]/60 border border-zinc-200 dark:border-zinc-800/80 text-zinc-900 dark:text-white rounded-2xl pl-6 pr-14 py-4 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition-all placeholder:text-zinc-500 text-[15px] backdrop-blur-md shadow-sm"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Chat Area */}
          <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
            {/* API Status Indicator */}
            {!hasApiKey && (
              <div className="sticky top-0 z-20 mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-medium">Chave da API Gemini não detectada para o modo Pro.</span>
                </div>
                <button 
                  onClick={handleOpenKeyDialog}
                  className="px-3 py-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Conectar API
                </button>
              </div>
            )}
            {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            {msg.role === 'user' ? (
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                <User className="w-4 h-4" />
              </div>
            ) : (
              <div className="flex-shrink-0 w-10 h-10 -ml-1 -mt-1 flex items-center justify-center">
                <JarvisIcon className="w-full h-full" />
              </div>
            )}
            
            <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 rounded-tr-sm'
                  : 'bg-white dark:bg-[#121212] border border-zinc-100 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-200 rounded-tl-sm shadow-sm'
              }`}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <div className="markdown-body prose dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800">
                    <ReactMarkdown
                      components={{
                        code({node, inline, className, children, ...props}: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          if (!inline && match && match[1] === 'chart') {
                            return <JarvisChart configStr={String(children).replace(/\n$/, '')} />;
                          }
                          return !inline ? (
                            <pre className={className} {...props}>
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          )
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-zinc-400 mt-1.5 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 ml-1 mb-6">
            <div className="w-8 h-8 flex items-center justify-center">
              <JarvisIcon className="w-full h-full" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-pulse"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative z-10 p-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-t border-zinc-100 dark:border-zinc-800/50">
        <div className="relative max-w-4xl mx-auto flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="w-full bg-zinc-50 dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-[15px]"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white disabled:text-zinc-400 rounded-lg transition-all disabled:cursor-not-allowed shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Jarvis pode cometer erros. Verifique informações importantes.
          </span>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
