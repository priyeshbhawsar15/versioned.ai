'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRun } from '@/context/RunContext';

const navLinks = [
  { href: '/', label: 'Playground' },
  { href: '/history', label: 'Regression' },
];

export default function TopNavBar() {
  const pathname = usePathname();
  const { runState, triggerRun } = useRun();

  return (
    <header className="bg-[#0b1326] border-b border-[#424754] flex justify-between items-center w-full px-4 h-14 shrink-0 z-20 relative">
      <div className="flex items-center gap-2">
        <div className="text-[20px] font-semibold tracking-tight text-[#adc6ff] leading-7">
          Versioned.AI
        </div>
        <nav className="hidden md:flex items-center gap-6 ml-6 h-full">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[14px] leading-5 h-full flex items-center transition-colors duration-150 ${
                  isActive
                    ? 'text-[#adc6ff] border-b-2 border-[#adc6ff] font-semibold pb-[15px] pt-4'
                    : 'text-[#c2c6d6] hover:text-[#dae2fd] py-4'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {runState.error && (
          <span className="text-[11px] text-[#ffb4ab] font-mono mr-2 max-w-[200px] truncate" title={runState.error}>
            {runState.error}
          </span>
        )}
        <button
          onClick={triggerRun}
          disabled={runState.isRunning}
          className={`transition-colors rounded px-2 py-1 text-[11px] font-medium tracking-[0.05em] leading-4 flex items-center gap-1 ${
            runState.isRunning
              ? 'bg-[#2d3449] text-[#8c909f] cursor-wait'
              : 'bg-[#4d8eff] text-[#00285d] hover:bg-[#adc6ff]'
          }`}
        >
          <span className={`material-symbols-outlined text-[16px] ${runState.isRunning ? 'animate-spin' : ''}`}>
            {runState.isRunning ? 'progress_activity' : 'play_arrow'}
          </span>
          {runState.isRunning ? 'Running...' : 'Run All Tests'}
        </button>
        <div className="flex items-center gap-2 border-l border-[#424754] pl-2 ml-1">
          <button
            aria-label="Theme Toggle"
            className="text-[#c2c6d6] hover:text-[#adc6ff] transition-colors flex items-center justify-center w-8 h-8 rounded hover:bg-[#2d3449]"
          >
            <span className="material-symbols-outlined text-[20px]">dark_mode</span>
          </button>
          <button
            aria-label="Settings"
            className="text-[#c2c6d6] hover:text-[#adc6ff] transition-colors flex items-center justify-center w-8 h-8 rounded hover:bg-[#2d3449]"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
          <button
            aria-label="Notifications"
            className="text-[#c2c6d6] hover:text-[#adc6ff] transition-colors flex items-center justify-center w-8 h-8 rounded hover:bg-[#2d3449]"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-[#2d3449] border border-[#8c909f] overflow-hidden ml-1 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#c2c6d6]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
