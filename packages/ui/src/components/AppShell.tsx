'use client';

import TopNavBar from './TopNavBar';
import SideNavBar from './SideNavBar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNavBar />
      <div className="flex flex-1 overflow-hidden relative">
        <SideNavBar />
        <main className="flex-1 flex flex-col min-w-0 bg-[#0b1326] overflow-hidden relative">
          {children}
        </main>
      </div>
    </>
  );
}
