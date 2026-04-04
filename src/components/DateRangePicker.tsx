import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { format, subDays, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type DateRangeType = 'today' | '7d' | '14d' | '30d' | '90d' | '1y' | 'all' | 'month' | 'custom';

export interface DateFilter {
  type: DateRangeType;
  startDate?: string;
  endDate?: string;
}

interface DateRangePickerProps {
  value: DateFilter;
  onChange: (filter: DateFilter) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [customStart, setCustomStart] = useState(
    value.startDate ? format(new Date(value.startDate), 'yyyy-MM-dd') : format(subDays(new Date(), 7), 'yyyy-MM-dd')
  );
  const [customEnd, setCustomEnd] = useState(
    value.endDate ? format(new Date(value.endDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickSelect = (type: DateRangeType) => {
    let start, end = new Date();
    if (type === 'today') start = end;
    else if (type === '7d') start = subDays(end, 7);
    else if (type === '14d') start = subDays(end, 14);
    else if (type === '30d') start = subDays(end, 30);
    else if (type === '90d') start = subDays(end, 90);
    else if (type === '1y') start = subYears(end, 1);
    else if (type === 'all') start = new Date(2020, 0, 1); // Arbitrary start date for "All time"
    else if (type === 'month') {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    }
    
    onChange({
      type,
      startDate: start?.toISOString(),
      endDate: end.toISOString()
    });
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        type: 'custom',
        startDate: new Date(customStart).toISOString(),
        endDate: new Date(customEnd).toISOString()
      });
      setIsOpen(false);
    }
  };

  const getActiveLabel = () => {
    if (value.type === 'today') return 'Hoje';
    if (value.type === '7d') return '7 dias';
    if (value.type === '14d') return '14 dias';
    if (value.type === '30d') return '30 dias';
    if (value.type === '90d') return '90 dias';
    if (value.type === '1y') return '1 ano';
    if (value.type === 'all') return 'Todo período';
    if (value.type === 'month') {
      return format(new Date(), 'MMMM', { locale: ptBR });
    }
    if (value.type === 'custom' && value.startDate && value.endDate) {
      return `${format(new Date(value.startDate), 'dd/MM')} - ${format(new Date(value.endDate), 'dd/MM')}`;
    }
    return 'Personalizado';
  };

  return (
    <div className="flex items-center bg-white dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm max-w-full overflow-hidden">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-1">
        {(['today', '7d', '30d', 'month'] as const).map((type) => (
          <button
            key={type}
            onClick={() => handleQuickSelect(type)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              value.type === type 
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-inner' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            {type === 'today' ? 'Hoje' : type === 'month' ? 'Mês' : `${type.replace('d', '')} dias`}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-2" />

      <div className="relative" ref={popoverRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 text-xs font-medium ${
            value.type === 'custom' || value.type === '1y' || value.type === 'all'
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-inner' 
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{getActiveLabel()}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Atalhos Rápidos</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleQuickSelect('month')}
                      className="flex items-center justify-center px-3 py-2 text-xs font-medium rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                    >
                      Mês atual
                    </button>
                    <button
                      onClick={() => handleQuickSelect('1y')}
                      className="flex items-center justify-center px-3 py-2 text-xs font-medium rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                    >
                      Último ano
                    </button>
                    <button
                      onClick={() => handleQuickSelect('all')}
                      className="col-span-2 flex items-center justify-center px-3 py-2 text-xs font-medium rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                    >
                      Todo período
                    </button>
                  </div>
                </div>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                <div className="flex flex-col gap-3">
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Personalizado</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 ml-1">Início</label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 ml-1">Fim</label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCustomApply}
                    className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity mt-1 shadow-lg shadow-zinc-900/10 dark:shadow-none"
                  >
                    Aplicar Filtro
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
