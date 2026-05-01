"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { 
  Layers, ChevronDown, ChevronUp, Circle, Clock, 
  CalendarDays, Zap, Activity, CreditCard, BarChart3, 
  BookOpen, FolderKanban, Hammer, Gamepad2, Brain,
  Sun, Moon, Monitor, Snowflake, LayoutDashboard, Menu
} from 'lucide-react';
import TheForgePage from '@/app/projects/forge/page';

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // STATE BURGER MENU

  useEffect(() => setMounted(true), []);
  
  const [openSections, setOpenSections] = useState({
    finance: false, schedule: false, projects: false
  });

  const toggleSection = (section: 'finance' | 'schedule' | 'projects') => {
    if (isCollapsed) setIsCollapsed(false); // Buka sidebar jika sedang tertutup
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const financeMenu = [
    { name: 'Ledger Harian', href: '/finance/ledger'},
    { name: 'Monthly Analytics', href: '/finance/analytics'},
    { name: 'Aset & Dompet', href: '/finance/assets'},
    { name: 'Biaya Langganan', href: '/finance/recurring'},
  ];

  const projectMenu = [
    { name: 'Dream Sandbox', href: '/projects/wish'},
    { name: 'Anti-Impulse', href: '/projects/impulse'},
    { name: 'Oracle Scenarios', href: '/projects/scenarios'},
    { name: 'The Forge', href: '/projects/forge'},
  ];

  const scheduleMenu = [
    { name: 'Daily Hub', href: '/schedule/daily'},
    { name: 'Habit Tracker', href: '/schedule/habits'},
    { name: 'Calendar', href: '/schedule/calendar'},
  ];

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-gray-50 dark:bg-[#121212] text-gray-600 dark:text-gray-400 flex flex-col border-r border-gray-200 dark:border-gray-800 sticky top-0 transition-all duration-300 z-50 shrink-0`}>
      
      {/* HEADER & BURGER */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800/50">
        {!isCollapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="text-gray-900 dark:text-white font-bold text-xl tracking-tighter italic">
              CULTURE<span className="text-blue-600 dark:text-blue-500 underline decoration-2 underline-offset-4 not-italic">OS</span>
            </h1>
          </div>
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className={`p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}>
          <Menu size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-4 pb-6 mt-4">
        
        {/* DASHBOARD LINK */}
        <Link href="/" title="Command Center" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${pathname === '/' ? 'text-blue-600 dark:text-white bg-blue-50 dark:bg-gray-800/60 font-bold shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-800'} ${isCollapsed ? 'justify-center' : ''}`}>
          <LayoutDashboard size={20} className={pathname === '/' ? 'text-blue-600 dark:text-blue-500' : ''}/>
          {!isCollapsed && <span className="text-[13px] uppercase tracking-wide">Command Center</span>}
        </Link>

        {/* MODUL: FINANCE */}
        <div className="space-y-1">
          <button title="Finance" onClick={() => toggleSection('finance')} className={`w-full flex items-center p-3 rounded-xl transition-all hover:bg-gray-200 dark:hover:bg-gray-800 ${openSections.finance && !isCollapsed ? 'text-gray-900 dark:text-white font-bold' : ''} ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-3">
              <Layers size={20} className={openSections.finance && !isCollapsed ? 'text-blue-600' : ''} />
              {!isCollapsed && <span className="text-[13px] uppercase tracking-wide">Finance</span>}
            </div>
            {!isCollapsed && (openSections.finance ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
          </button>
          {openSections.finance && !isCollapsed && (
            <div className="mt-1 ml-4 space-y-1 border-l border-gray-200 dark:border-gray-800/60">
              {financeMenu.map((item) => (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 py-2.5 px-4 text-sm transition-all ${pathname === item.href ? 'text-blue-600 dark:text-white font-bold' : 'hover:text-gray-900 dark:hover:text-gray-200'}`}>
                  <Circle size={4} className={pathname === item.href ? 'fill-blue-600' : 'fill-gray-400'} />
                  {item.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* MODUL: PROJECTS */}
        <div className="space-y-1">
          <button title="Projects" onClick={() => toggleSection('projects')} className={`w-full flex items-center p-3 rounded-xl transition-all hover:bg-gray-200 dark:hover:bg-gray-800 ${openSections.projects && !isCollapsed ? 'text-gray-900 dark:text-white font-bold' : ''} ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-3">
              <FolderKanban size={20} className={openSections.projects && !isCollapsed ? 'text-purple-600' : ''} />
              {!isCollapsed && <span className="text-[13px] uppercase tracking-wide">Projects</span>}
            </div>
            {!isCollapsed && (openSections.projects ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
          </button>
          {openSections.projects && !isCollapsed && (
            <div className="mt-1 ml-4 space-y-1 border-l border-gray-200 dark:border-gray-800/60">
              {projectMenu.map((item) => (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 py-2.5 px-4 text-sm transition-all ${pathname === item.href ? 'text-purple-600 dark:text-white font-bold' : 'hover:text-gray-900 dark:hover:text-gray-200'}`}>
                  <Circle size={4} className={pathname === item.href ? 'fill-purple-600' : 'fill-gray-400'} />
                  {item.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* MODUL: SCHEDULE */}
        <div className="space-y-1">
          <button title="Schedule" onClick={() => toggleSection('schedule')} className={`w-full flex items-center p-3 rounded-xl transition-all hover:bg-gray-200 dark:hover:bg-gray-800 ${openSections.schedule && !isCollapsed ? 'text-gray-900 dark:text-white font-bold' : ''} ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-3">
              <Clock size={20} className={openSections.schedule && !isCollapsed ? 'text-orange-600' : ''} />
              {!isCollapsed && <span className="text-[13px] uppercase tracking-wide">Schedule</span>}
            </div>
            {!isCollapsed && (openSections.schedule ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
          </button>
          {openSections.schedule && !isCollapsed && (
            <div className="mt-1 ml-4 space-y-1 border-l border-gray-200 dark:border-gray-800/60">
              {scheduleMenu.map((item) => (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 py-2.5 px-4 text-sm transition-all ${pathname === item.href ? 'text-orange-600 dark:text-white font-bold' : 'hover:text-gray-900 dark:hover:text-gray-200'}`}>
                  <Circle size={4} className={pathname === item.href ? 'fill-orange-600' : 'fill-gray-400'} />
                  {item.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* THEME TOGGLE */}
      <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-800/50">
        {mounted && (
          <div className={`bg-gray-200/50 dark:bg-[#1A1A1A] p-1 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center ${isCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
            <button onClick={() => setTheme('light')} className={`p-2 rounded-lg flex justify-center transition-all ${theme === 'light' ? 'bg-white shadow-sm text-yellow-500' : 'text-gray-500'} ${!isCollapsed && 'flex-1'}`}><Sun size={16} /></button>
            <button onClick={() => setTheme('system')} className={`p-2 rounded-lg flex justify-center transition-all ${theme === 'system' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'} ${!isCollapsed && 'flex-1'}`}><Monitor size={16} /></button>
            <button onClick={() => setTheme('dark')} className={`p-2 rounded-lg flex justify-center transition-all ${theme === 'dark' ? 'bg-[#2A2A2A] shadow-sm text-blue-500' : 'text-gray-500'} ${!isCollapsed && 'flex-1'}`}><Moon size={16} /></button>
          </div>
        )}
      </div>
    </aside>
  );
}