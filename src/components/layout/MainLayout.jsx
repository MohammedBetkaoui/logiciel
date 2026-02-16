import React from 'react';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';

export default function MainLayout({ activePage, onNavigate, children }) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-100 dark:bg-neutral-900 select-none">
      {/* ─── Custom Title Bar ─────────────────────────────────── */}
      <TitleBar />

      {/* ─── Body: Sidebar + Content ─────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar activePage={activePage} onNavigate={onNavigate} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-neutral-50/80 dark:bg-neutral-900 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
