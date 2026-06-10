'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const mainNavItems = [
  { href: '/providers', label: 'Providers', icon: 'memory' },
  { href: '/datasets', label: 'Datasets', icon: 'database' },
  { href: '/caching', label: 'Caching', icon: 'bolt' },
  { href: '/history', label: 'History', icon: 'history' },
];

const footerNavItems = [
  { href: '#', label: 'Documentation', icon: 'help' },
  { href: '#', label: 'Support', icon: 'chat_bubble' },
];

export default function SideNavBar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Persist collapse state
  useEffect(() => {
    const stored = localStorage.getItem('sidebar_collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar_collapsed', String(!prev));
      return !prev;
    });
  };

  return (
    <nav className={`bg-[#131b2e] border-r border-[#424754] flex flex-col h-full shrink-0 z-10 transition-all duration-200 ease-in-out ${
      collapsed ? 'w-[52px]' : 'w-[260px]'
    }`}>
      {/* Project Header */}
      <div className={`border-b border-[#424754] flex items-center gap-2 ${collapsed ? 'p-2 justify-center' : 'p-4'}`}>
        <div className="w-8 h-8 rounded bg-[#4d8eff] flex items-center justify-center text-[#00285d] font-bold text-[11px] shrink-0">
          VA
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-medium tracking-[0.05em] leading-4 text-[#dae2fd] font-mono truncate">
              Project Alpha
            </span>
            <span className="text-[11px] font-medium tracking-[0.05em] leading-4 text-[#c2c6d6] opacity-70 font-mono truncate">
              Production Env
            </span>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <div className={`${collapsed ? 'px-1 py-2' : 'px-2 py-2'}`}>
        <button
          onClick={toggle}
          className={`bg-[#2d3449] border border-[#424754] hover:border-[#adc6ff] text-[#c2c6d6] hover:text-[#adc6ff] rounded py-1.5 flex items-center justify-center transition-colors ${
            collapsed ? 'w-full' : 'w-full gap-1 px-2'
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="material-symbols-outlined text-[16px]">
            {collapsed ? 'chevron_right' : 'chevron_left'}
          </span>
          {!collapsed && (
            <span className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono">Collapse</span>
          )}
        </button>
      </div>

      {/* Main Nav */}
      <div className={`flex flex-col gap-1 flex-1 overflow-y-auto py-2 ${collapsed ? 'px-1' : 'px-2'}`}>
        {mainNavItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2 py-2 rounded-sm text-[11px] font-medium tracking-[0.05em] leading-4 transition-colors font-mono ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-[#4d8eff] text-[#00285d] font-bold'
                  : 'text-[#c2c6d6] hover:bg-[#222a3d]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              {!collapsed && item.label}
            </Link>
          );
        })}
      </div>

      {/* Footer Nav */}
      <div className={`border-t border-[#424754] p-2 flex flex-col gap-1 mt-auto ${collapsed ? 'px-1' : ''}`}>
        {footerNavItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-2 px-2 py-2 rounded-sm text-[#c2c6d6] hover:bg-[#222a3d] transition-colors text-[11px] font-medium tracking-[0.05em] leading-4 font-mono ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? item.label : undefined}
          >
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            {!collapsed && item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
