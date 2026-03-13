import * as Popover from '@radix-ui/react-popover';
import { Info } from 'lucide-react';

interface InfoPopoverProps {
  title: string;
  meaning: string;
  importance: string;
  usage: string;
}

export function InfoPopover({ title, meaning, importance, usage }: InfoPopoverProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="text-zinc-400 hover:text-blue-500 transition-colors focus:outline-none p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Informações sobre a métrica"
        >
          <Info className="w-4 h-4" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={5}
        >
          <h4 className="font-semibold text-zinc-900 dark:text-white mb-3 text-sm">{title}</h4>
          
          <div className="space-y-3 text-xs">
            <div>
              <span className="font-semibold text-blue-600 dark:text-white block mb-1">O que significa:</span>
              <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{meaning}</p>
            </div>
            
            <div>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">Por que é importante:</span>
              <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{importance}</p>
            </div>
            
            <div>
              <span className="font-semibold text-purple-600 dark:text-purple-400 block mb-1">Para que usar:</span>
              <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{usage}</p>
            </div>
          </div>
          <Popover.Arrow className="fill-white dark:fill-zinc-800" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
